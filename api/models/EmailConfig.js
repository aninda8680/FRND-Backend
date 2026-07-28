const mongoose = require('mongoose');

const EmailAccountSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  label: { type: String, default: '' },
  apiKey: { type: String, required: true },
  fromEmail: { type: String, required: true },
  status: { type: String, enum: ['active', 'quota_exceeded', 'error', 'disabled'], default: 'active' },
  dailySentCount: { type: Number, default: 0 },
  lastResetDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  lastUsedAt: { type: Date },
  lastError: { type: String, default: '' }
}, { _id: false });

const EmailConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'default_email_config', unique: true },
  activeKeyIndex: { type: Number, default: 0 },
  accounts: [EmailAccountSchema],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.EmailConfig || mongoose.model('EmailConfig', EmailConfigSchema);
