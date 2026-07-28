const crypto = require('crypto');
const EmailConfig = require('../models/EmailConfig');

// Utility to mask API keys safely for Admin view
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return 'N/A';
  if (key.length <= 10) return `${key.substring(0, 3)}***`;
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

// Format from address cleanly (prevents malformed double angle brackets like FRND <FRND <email>>)
function formatFromAddress(email) {
  if (!email) return 'FRND <onboarding@resend.dev>';
  const cleaned = email.trim();
  if (cleaned.includes('<') && cleaned.includes('>')) {
    return cleaned;
  }
  return `FRND <${cleaned}>`;
}

// Get or initialize EmailConfig from ENV variables or DB
async function getOrInitEmailConfig() {
  let config = await EmailConfig.findOne({ key: 'default_email_config' });

  // Parse environment variables if not initialized or empty
  const rawApiKeys = (process.env.EMAIL_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(k => k && !k.startsWith('re_your_'));

  const rawFromEmails = (process.env.EMAIL_FROM || 'onboarding@resend.dev')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  if (!config) {
    const accounts = [];
    if (rawApiKeys.length > 0) {
      rawApiKeys.forEach((key, i) => {
        accounts.push({
          index: i,
          label: `Resend Account #${i + 1}`,
          apiKey: key,
          fromEmail: rawFromEmails[i % rawFromEmails.length] || 'onboarding@resend.dev',
          status: 'active',
          dailySentCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          lastError: ''
        });
      });
    }

    config = new EmailConfig({
      key: 'default_email_config',
      activeKeyIndex: 0,
      accounts
    });
    await config.save();
  } else {
    let modified = false;

    // Synchronize keys & emails from .env to existing accounts
    rawApiKeys.forEach((key, i) => {
      let acc = config.accounts.find(a => a.index === i);
      if (acc) {
        if (acc.apiKey !== key) {
          acc.apiKey = key;
          modified = true;
        }
        const targetEmail = rawFromEmails[i % rawFromEmails.length] || acc.fromEmail;
        if (acc.fromEmail !== targetEmail) {
          acc.fromEmail = targetEmail;
          modified = true;
        }
      } else {
        config.accounts.push({
          index: config.accounts.length,
          label: `Resend Account #${config.accounts.length + 1}`,
          apiKey: key,
          fromEmail: rawFromEmails[i % rawFromEmails.length] || 'onboarding@resend.dev',
          status: 'active',
          dailySentCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          lastError: ''
        });
        modified = true;
      }
    });

    // Daily reset check
    const today = new Date().toISOString().split('T')[0];
    config.accounts.forEach(acc => {
      if (acc.lastResetDate !== today) {
        acc.dailySentCount = 0;
        acc.lastResetDate = today;
        if (acc.status === 'quota_exceeded') {
          acc.status = 'active'; // Auto re-enable quota exceeded accounts on new day
        }
        modified = true;
      }
    });

    if (modified) {
      await config.save();
    }
  }

  return config;
}

/**
 * Send an email with automatic failover and instant retries across configured Resend accounts
 */
async function sendEmail({ to, subject, html, headers = {} }) {
  const config = await getOrInitEmailConfig();

  if (!config.accounts || config.accounts.length === 0) {
    console.warn('[EMAIL SERVICE WARN] No Resend API keys configured.');
    return { success: false, reason: 'No email accounts configured' };
  }

  const { Resend } = require('resend');
  const today = new Date().toISOString().split('T')[0];
  let attemptCount = 0;
  const maxAttempts = config.accounts.length;

  let currentIndex = config.activeKeyIndex;
  if (currentIndex >= config.accounts.length) {
    currentIndex = 0;
  }

  // Find candidate accounts starting from currentIndex
  let lastErrMessage = '';

  while (attemptCount < maxAttempts) {
    const account = config.accounts[currentIndex];

    // Skip disabled accounts or accounts marked as quota exceeded today
    if (account.status === 'disabled' || (account.status === 'quota_exceeded' && account.lastResetDate === today)) {
      currentIndex = (currentIndex + 1) % config.accounts.length;
      attemptCount++;
      continue;
    }

    try {
      const resend = new Resend(account.apiKey);
      const recipientList = Array.isArray(to) ? to : [to];
      const fromFormatted = formatFromAddress(account.fromEmail);

      const emailHeaders = {
        'List-Unsubscribe': '<mailto:unsubscribe@frnd.buzz>',
        'X-Entity-Ref-ID': crypto.randomUUID(),
        ...headers
      };

      const sendPayload = {
        from: fromFormatted,
        to: recipientList,
        replyTo: 'contact@frnd.buzz',
        reply_to: 'contact@frnd.buzz',
        subject,
        headers: emailHeaders,
        html
      };

      const { data, error } = await resend.emails.send(sendPayload);

      if (error) {
        const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
        console.error(`[EMAIL FAILOVER] Account #${account.index + 1} failed: ${errStr}`);
        lastErrMessage = errStr;

        // Check if error is quota / rate-limit related (429, 422, limit reached)
        const isQuotaError = errStr.includes('429') || errStr.includes('quota') || errStr.includes('limit') || errStr.includes('exceeded') || errStr.includes('resend.com/docs');
        account.status = isQuotaError ? 'quota_exceeded' : 'error';
        account.lastError = errStr;
        account.lastUsedAt = new Date();

        // Advance active key index to next available key
        config.activeKeyIndex = (currentIndex + 1) % config.accounts.length;
        await config.save();

        // Instant retry with next available key in loop
        currentIndex = config.activeKeyIndex;
        attemptCount++;
        continue;
      }

      // Success! Update metrics
      account.status = 'active';
      account.dailySentCount = (account.dailySentCount || 0) + 1;
      account.lastUsedAt = new Date();
      account.lastError = '';
      config.activeKeyIndex = currentIndex; // Keep this working account active
      config.updatedAt = new Date();
      await config.save();

      const resendId = data && data.id ? data.id : 'N/A';
      console.log(`[EMAIL SUCCESS] Sent email to ${recipientList.join(', ')} via Account #${account.index + 1} (${account.fromEmail}) | Resend ID: ${resendId}`);
      return { success: true, accountIndex: account.index, fromEmail: account.fromEmail, data, resendId };
    } catch (err) {
      console.error(`[EMAIL EXCEPTION] Account #${account.index + 1} exception:`, err.message);
      lastErrMessage = err.message;

      account.status = 'error';
      account.lastError = err.message;
      account.lastUsedAt = new Date();

      config.activeKeyIndex = (currentIndex + 1) % config.accounts.length;
      await config.save();

      currentIndex = config.activeKeyIndex;
      attemptCount++;
    }
  }

  console.error('[EMAIL SERVICE ERROR] All Resend email accounts in pool failed or exhausted.');
  return { success: false, reason: lastErrMessage || 'All Resend accounts exhausted or failed' };
}

/**
 * Get sanitized status for Admin Panel
 */
async function getEmailServiceStatus() {
  const config = await getOrInitEmailConfig();

  const accounts = config.accounts.map(acc => ({
    index: acc.index,
    label: acc.label,
    maskedKey: maskApiKey(acc.apiKey),
    fromEmail: acc.fromEmail,
    status: acc.status,
    dailySentCount: acc.dailySentCount || 0,
    lastUsedAt: acc.lastUsedAt,
    lastError: acc.lastError,
    isActive: acc.index === config.activeKeyIndex
  }));

  return {
    activeKeyIndex: config.activeKeyIndex,
    totalAccounts: accounts.length,
    activeAccount: accounts.find(a => a.isActive) || null,
    accounts,
    updatedAt: config.updatedAt
  };
}

/**
 * Manually switch the active email key from Admin Panel
 */
async function setActiveEmailAccount(targetIndex) {
  const config = await getOrInitEmailConfig();
  const idx = Number(targetIndex);

  if (isNaN(idx) || idx < 0 || idx >= config.accounts.length) {
    throw new Error(`Invalid account index: ${targetIndex}. Must be between 0 and ${config.accounts.length - 1}`);
  }

  config.activeKeyIndex = idx;
  // If target account was quota_exceeded or error, set status back to active upon manual switch
  if (config.accounts[idx]) {
    config.accounts[idx].status = 'active';
  }
  config.updatedAt = new Date();
  await config.save();

  return getEmailServiceStatus();
}

/**
 * Add or update Resend API accounts pool dynamically from Admin Panel
 */
async function updateEmailAccountsPool(accountsList, activeKeyIndex = 0) {
  let config = await EmailConfig.findOne({ key: 'default_email_config' });
  if (!config) {
    config = new EmailConfig({ key: 'default_email_config' });
  }

  const sanitizedAccounts = accountsList.map((item, idx) => ({
    index: idx,
    label: item.label || `Resend Account #${idx + 1}`,
    apiKey: item.apiKey.trim(),
    fromEmail: (item.fromEmail || 'onboarding@resend.dev').trim(),
    status: item.status || 'active',
    dailySentCount: item.dailySentCount || 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    lastError: ''
  }));

  config.accounts = sanitizedAccounts;
  config.activeKeyIndex = Math.min(activeKeyIndex, Math.max(0, sanitizedAccounts.length - 1));
  config.updatedAt = new Date();
  await config.save();

  return getEmailServiceStatus();
}

/**
 * Manually update the daily sent count of a specific Resend account
 */
async function updateAccountDailySentCount(targetIndex, newCount) {
  const config = await getOrInitEmailConfig();
  const idx = Number(targetIndex);
  const count = Number(newCount);

  if (isNaN(idx) || idx < 0 || idx >= config.accounts.length) {
    throw new Error(`Invalid account index: ${targetIndex}`);
  }

  if (isNaN(count) || count < 0) {
    throw new Error(`Invalid count: ${newCount}. Must be a non-negative number.`);
  }

  const account = config.accounts[idx];
  account.dailySentCount = count;
  account.lastResetDate = new Date().toISOString().split('T')[0];

  if (count < 100 && account.status === 'quota_exceeded') {
    account.status = 'active'; // Auto re-enable account if count is altered under 100
  }

  config.updatedAt = new Date();
  await config.save();

  return getEmailServiceStatus();
}

module.exports = {
  getOrInitEmailConfig,
  sendEmail,
  getEmailServiceStatus,
  setActiveEmailAccount,
  updateEmailAccountsPool,
  updateAccountDailySentCount,
  maskApiKey
};
