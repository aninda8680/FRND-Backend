// Admin Panel Application logic
const API_BASE = 'https://frnd-api-n3hv.onrender.com/api/admin';

// DOM elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminEmailDisplay = document.getElementById('admin-email-display');
const logoutBtn = document.getElementById('logout-btn');

// Signin / Signup Switch UI elements
const signinSection = document.getElementById('signin-section');
const signupSection = document.getElementById('signup-section');
const toSignupLink = document.getElementById('to-signup-link');
const toSigninLink = document.getElementById('to-signin-link');
const signupForm = document.getElementById('signup-form');
const signupError = document.getElementById('signup-error');
const signupSuccess = document.getElementById('signup-success');

// ------------------------------------------------------------------
// UI NAVIGATION (SIGNIN / SIGNUP TOGGLES)
// ------------------------------------------------------------------
toSignupLink.addEventListener('click', (e) => {
  e.preventDefault();
  signinSection.classList.add('hidden');
  signupSection.classList.remove('hidden');
  loginError.classList.add('hidden');
  signupError.classList.add('hidden');
  signupSuccess.classList.add('hidden');
});

toSigninLink.addEventListener('click', (e) => {
  e.preventDefault();
  signupSection.classList.add('hidden');
  signinSection.classList.remove('hidden');
  loginError.classList.add('hidden');
  signupError.classList.add('hidden');
  signupSuccess.classList.add('hidden');
});

// Modal Elements
const rejectModal = document.getElementById('reject-modal');
const rejectForm = document.getElementById('reject-form');
const rejectRequestId = document.getElementById('reject-request-id');
const rejectReasonInput = document.getElementById('reject-reason');
const rejectModalCancel = document.getElementById('reject-modal-cancel');

const userModal = document.getElementById('user-modal');
const userModalForm = document.getElementById('user-modal-form');
const userModalUserId = document.getElementById('user-modal-userid');
const userModalBadges = document.getElementById('user-modal-badges');
const userModalCancel = document.getElementById('user-modal-cancel');

// Tab tracking
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane, .tab-content');
const tabTitle = document.getElementById('tab-title');

// Mobile Sidebar Controls & Backdrop
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sectionRefreshBtn = document.getElementById('section-refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');

function openMobileSidebar() {
  if (sidebar) sidebar.classList.add('mobile-open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('hidden');
}

function closeMobileSidebar() {
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (sidebarBackdrop) sidebarBackdrop.classList.add('hidden');
}

// Initialize state
let token = localStorage.getItem('adminToken');
let email = localStorage.getItem('adminEmail');

// ------------------------------------------------------------------
// AUTHENTICATION FLOWS
// ------------------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  
  const emailVal = document.getElementById('login-email').value;
  const passwordVal = document.getElementById('login-password').value;
  const commonVal = document.getElementById('login-common').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: passwordVal, commonPass: commonVal })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    token = data.token;
    email = data.email;
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminEmail', email);
    
    showDashboard();
  } catch (err) {
    loginError.innerText = err.message;
    loginError.classList.remove('hidden');
  }
});

// Admin Registration handler
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupError.classList.add('hidden');
  signupSuccess.classList.add('hidden');

  const emailVal = document.getElementById('signup-email').value;
  const passwordVal = document.getElementById('signup-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: passwordVal })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    signupSuccess.innerText = 'Admin account registered successfully! You can now sign in.';
    signupSuccess.classList.remove('hidden');
    
    // Clear inputs
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';

    // Switch back to signin after 2.5 seconds
    setTimeout(() => {
      toSigninLink.click();
    }, 2500);
  } catch (err) {
    signupError.innerText = err.message;
    signupError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  // Non-blocking server-side logout notify
  fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch(() => {});

  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminEmail');
  token = null;
  email = null;
  showLogin();
});

function showLogin() {
  loginContainer.classList.remove('hidden');
  dashboardContainer.classList.add('hidden');
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

// Section Refresh Button Handler
if (sectionRefreshBtn) {
  sectionRefreshBtn.addEventListener('click', async () => {
    const activeTabId = localStorage.getItem('adminActiveTab') || 'stats-tab';
    if (refreshIcon) refreshIcon.classList.add('spinning');
    try {
      await loadTabContent(activeTabId);
    } finally {
      setTimeout(() => {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
      }, 500);
    }
  });
}

// Tab Switching & Persistence
function switchTab(targetTabId) {
  const activeTabId = targetTabId || localStorage.getItem('adminActiveTab') || 'stats-tab';
  let targetNavItem = null;

  navItems.forEach(item => {
    if (item.getAttribute('data-tab') === activeTabId) {
      item.classList.add('active');
      targetNavItem = item;
    } else {
      item.classList.remove('active');
    }
  });

  if (!targetNavItem && navItems.length > 0) {
    targetNavItem = navItems[0];
    targetNavItem.classList.add('active');
  }

  const effectiveTabId = targetNavItem ? targetNavItem.getAttribute('data-tab') : 'stats-tab';

  tabPanes.forEach(pane => {
    if (pane.id === effectiveTabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (targetNavItem) {
    tabTitle.innerText = targetNavItem.innerText.replace(/[^\w\s]/g, '').trim();
  }

  localStorage.setItem('adminActiveTab', effectiveTabId);
  closeMobileSidebar();
  loadTabContent(effectiveTabId);
}

function showDashboard() {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');
  adminEmailDisplay.innerText = email;
  switchTab(); // Restores last active tab on refresh!
}

// Tab navigation click event
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabId = item.getAttribute('data-tab');
    switchTab(tabId);
  });
});

// Initial dashboard load state trigger
if (token) {
  showDashboard();
} else {
  showLogin();
}

// User tier filter event listener
const userTierFilter = document.getElementById('user-tier-filter');
if (userTierFilter) {
  userTierFilter.addEventListener('change', () => {
    fetchUsers();
  });
}

// Safe API Fetch wrapper
async function apiFetch(path, options = {}) {
  if (!options.headers) options.headers = {};
  options.headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (res.status === 401 || res.status === 403) {
      // Force logout on token expiration
      logoutBtn.click();
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  } catch (err) {
    alert(err.message);
    return null;
  }
}

// ------------------------------------------------------------------
// TAB ROUTERS
// ------------------------------------------------------------------
function loadTabContent(tabId) {
  switch (tabId) {
    case 'stats-tab':
      fetchStats();
      break;
    case 'flags-tab':
      fetchFlags();
      break;
    case 'verifications-tab':
      fetchVerificationRequests();
      break;
    case 'users-tab':
      fetchUsers();
      break;
    case 'reports-tab':
      fetchReports();
      break;
    case 'feedback-tab':
      fetchFeedback();
      break;
    case 'waitlist-tab':
      fetchWaitlist();
      break;
    case 'onboarding-tab':
      fetchOnboardingConfig();
      break;
    case 'email-tab':
      fetchEmailPoolStatus();
      break;
    case 'careers-tab':
      fetchCareerApplications();
      break;
  }
}

// ------------------------------------------------------------------
// 0. REVENUE & STATS ANALYTICS TAB
// ------------------------------------------------------------------
// Chart instances registry to support redraws
let chartInstances = {};

function renderChart(canvasId, type, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#706a60', font: { family: 'Inter', size: 12 } }
        }
      },
      scales: type !== 'doughnut' && type !== 'pie' ? {
        x: { ticks: { color: '#706a60' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { ticks: { color: '#706a60' }, grid: { color: 'rgba(0,0,0,0.05)' } }
      } : {},
      ...options
    }
  });
}

async function fetchStats() {
  const data = await apiFetch('/stats');
  if (data) {
    document.getElementById('stat-total-revenue').innerText = `₹${data.financials?.totalRevenueINR || 0}`;
    document.getElementById('stat-active-subs').innerText = `${data.financials?.activeSubscriptionsCount || 0}`;
    document.getElementById('stat-total-users').innerText = `${data.overview?.totalUsers || 0}`;
    document.getElementById('stat-total-matches').innerText = `${data.social?.totalMatches || 0}`;
    document.getElementById('stat-total-likes').innerText = `${data.social?.totalLikes || 0}`;
    document.getElementById('stat-open-flags').innerText = `${data.moderation?.openFlags || 0}`;

    // 1. Chart Collections (Document counts across all database collections)
    if (data.collections) {
      const colLabels = Object.keys(data.collections);
      const colValues = Object.values(data.collections);
      renderChart('chart-collections', 'bar', {
        labels: colLabels,
        datasets: [{
          label: 'Document Count',
          data: colValues,
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6
        }]
      }, {
        plugins: { legend: { display: false } }
      });
    }

    // 2. Chart Subscriptions (Free vs Silver vs Gold)
    if (data.overview) {
      renderChart('chart-subscriptions', 'doughnut', {
        labels: ['Free Tier Users', 'Silver Passes (₹39/mo)', 'Gold Passes (₹49/mo)'],
        datasets: [{
          data: [data.overview.freeUsers || 0, data.overview.silverUsers || 0, data.overview.goldUsers || 0],
          backgroundColor: ['#64748b', '#475569', '#d97706'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      });
    }

    // 3. Chart Demographics & Verification (Male vs Female vs Other | Verified vs Pending vs Unverified)
    if (data.overview) {
      renderChart('chart-demographics', 'bar', {
        labels: ['Male Users', 'Female Users', 'Other Users', 'Verified IDs', 'Pending Verification', 'Unverified IDs'],
        datasets: [{
          label: 'Users Count',
          data: [
            data.overview.maleUsers || 0,
            data.overview.femaleUsers || 0,
            data.overview.otherUsers || 0,
            data.overview.verifiedUsers || 0,
            data.overview.pendingVerifications || 0,
            data.overview.unverifiedUsers || 0
          ],
          backgroundColor: ['#3b82f6', '#ec4899', '#a855f7', '#16a34a', '#eab308', '#dc2626'],
          borderWidth: 1,
          borderRadius: 6
        }]
      }, {
        plugins: { legend: { display: false } }
      });
    }

    // 4. Chart Engagement (Likes, Superlikes, Dislikes, Matches, Messages, Posts, Waitlist, Careers)
    if (data.social) {
      renderChart('chart-engagement', 'bar', {
        labels: ['Standard Likes', 'Superlikes', 'Dislikes / Passes', 'Mutual Matches', 'Messages', 'Waitlist Leads', 'Career Applications'],
        datasets: [{
          label: 'Engagement Activity',
          data: [
            data.social.standardLikes || 0,
            data.social.superlikes || 0,
            data.social.totalDislikes || 0,
            data.social.totalMatches || 0,
            data.social.totalMessages || 0,
            data.social.totalWaitlist || 0,
            data.social.totalCareers || 0
          ],
          backgroundColor: 'rgba(217, 119, 6, 0.75)',
          borderColor: '#d97706',
          borderWidth: 1,
          borderRadius: 6
        }]
      }, {
        plugins: { legend: { display: false } }
      });
    }

    // 5. Chart Moderation (High, Medium, Low open flags, Total Reports, Banned users)
    if (data.moderation) {
      renderChart('chart-moderation', 'pie', {
        labels: ['High Severity Flags', 'Medium Severity Flags', 'Low Severity Flags', 'Total Reports Received', 'Banned Accounts'],
        datasets: [{
          data: [
            data.moderation.highFlags || 0,
            data.moderation.mediumFlags || 0,
            data.moderation.lowFlags || 0,
            data.moderation.totalReports || 0,
            data.moderation.bannedUsers || 0
          ],
          backgroundColor: ['#dc2626', '#f97316', '#eab308', '#ec4899', '#94a3b8'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      });
    }
  }
  fetchPayments();
}

async function fetchPayments() {
  const data = await apiFetch('/payments');
  const tbody = document.getElementById('payments-table-body');
  const emptyState = document.getElementById('payments-empty-state');
  
  tbody.innerHTML = '';
  if (!data || !data.payments || data.payments.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  data.payments.forEach(p => {
    const tr = document.createElement('tr');
    const userDisplay = p.userId ? `<strong>${p.userId.name || 'User'}</strong><br><span class="text-secondary">${p.userId.email}</span>` : 'Unknown User';
    const tierBadge = p.tier === 'gold' ? '<span class="tier-badge gold">Gold (₹49)</span>' : '<span class="tier-badge silver">Silver (₹39)</span>';
    const razorpayId = p.razorpaySubscriptionId || p.razorpayPaymentId || p.razorpayOrderId || 'N/A';
    
    tr.innerHTML = `
      <td>${userDisplay}</td>
      <td>${tierBadge}</td>
      <td><strong>₹${p.amount}</strong></td>
      <td><code>${razorpayId}</code></td>
      <td><span class="badge-status ${p.status === 'active' || p.status === 'paid' ? 'success' : 'medium'}">${p.status}</span></td>
      <td>${new Date(p.createdAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------------
// 1. FLAGS QUEUE TAB
// ------------------------------------------------------------------
async function fetchFlags() {
  const data = await apiFetch('/flags?status=open');
  const tbody = document.getElementById('flags-table-body');
  const emptyState = document.getElementById('flags-empty-state');
  
  tbody.innerHTML = '';
  
  if (!data || !data.flags || data.flags.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  data.flags.forEach(flag => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${flag.userId?.name || 'N/A'}</strong><br>
        <span class="text-secondary">@${flag.userId?.username || 'N/A'}</span>
      </td>
      <td><code>${flag.flagType}</code></td>
      <td><span class="badge-status ${flag.severity}">${flag.severity}</span></td>
      <td><pre class="json-details">${JSON.stringify(flag.details)}</pre></td>
      <td>
        <div class="table-actions">
          <button class="btn sm secondary" onclick="resolveFlag('${flag._id}', 'dismiss')">Dismiss</button>
          <button class="btn sm secondary" onclick="resolveFlag('${flag._id}', 'review')">Review</button>
          <button class="btn sm primary danger" onclick="resolveFlag('${flag._id}', 'action')">Ban / Action</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.resolveFlag = async (flagId, outcome) => {
  const data = await apiFetch(`/flags/${flagId}/${outcome}`, { method: 'POST' });
  if (data) fetchFlags();
};

// ------------------------------------------------------------------
// 2. VERIFICATIONS QUEUE TAB
// ------------------------------------------------------------------
async function fetchVerificationRequests() {
  const data = await apiFetch('/verification-requests');
  const grid = document.getElementById('verifications-grid');
  const emptyState = document.getElementById('verifications-empty-state');
  
  grid.innerHTML = '';
  
  if (!data || !data.requests || data.requests.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  data.requests.forEach(req => {
    const card = document.createElement('div');
    card.className = 'verify-card';
    card.innerHTML = `
      <div class="verify-user-header">
        <div>
          <h3>${req.userId?.name || 'N/A'}</h3>
          <p class="text-secondary">@${req.userId?.username || 'N/A'} (${req.userId?.email || ''})</p>
        </div>
        ${req.isDuplicate ? '<span class="badge-status high">Warning: Duplicate Document Hash</span>' : ''}
      </div>
      <div class="verify-images-container">
        <div class="image-box">
          <span>Camera ID Card Image</span>
          <img src="${req.idCardUrl}" alt="ID Card preview">
        </div>
        <div class="image-box">
          <span>Camera Face Capture</span>
          <img src="${req.faceUrl}" alt="Face preview">
        </div>
      </div>
      <div class="verify-card-actions">
        <button class="btn primary" onclick="approveVerification('${req._id}')">Approve</button>
        <button class="btn secondary" onclick="openRejectModal('${req._id}')">Reject</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.approveVerification = async (requestId) => {
  const data = await apiFetch(`/verification-requests/${requestId}/approve`, { method: 'POST' });
  if (data) fetchVerificationRequests();
};

window.openRejectModal = (requestId) => {
  rejectRequestId.value = requestId;
  rejectReasonInput.value = '';
  rejectModal.classList.remove('hidden');
};

rejectModalCancel.addEventListener('click', () => {
  rejectModal.classList.add('hidden');
});

rejectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const requestId = rejectRequestId.value;
  const reason = rejectReasonInput.value;

  const data = await apiFetch(`/verification-requests/${requestId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });

  if (data) {
    rejectModal.classList.add('hidden');
    fetchVerificationRequests();
  }
});

// ------------------------------------------------------------------
// 3. USER DIRECTORY TAB
// ------------------------------------------------------------------
async function fetchUsers() {
  const filterSelect = document.getElementById('user-tier-filter');
  const selectedTier = filterSelect ? filterSelect.value : 'all';
  
  let path = '/users';
  if (selectedTier && selectedTier !== 'all') {
    path += `?tier=${selectedTier}`;
  }

  const data = await apiFetch(path);
  const tbody = document.getElementById('users-table-body');
  
  tbody.innerHTML = '';
  if (!data || !data.users) return;

  data.users.forEach(user => {
    const tr = document.createElement('tr');
    
    // Tier badge mapping
    let tierBadgeHtml = '<span class="tier-badge free">Free</span>';
    if (user.tier === 'gold') {
      tierBadgeHtml = '<span class="tier-badge gold">Gold (₹49)</span>';
    } else if (user.tier === 'silver') {
      tierBadgeHtml = '<span class="tier-badge silver">Silver (₹39)</span>';
    }

    // Autopay status mapping
    const autopayStatus = user.autopayStatus || (user.tier && user.tier !== 'free' ? 'active' : 'none');

    tr.innerHTML = `
      <td>
        <strong>${user.name || 'Not Set'}</strong><br>
        <span class="text-secondary">@${user.username} (Age ${user.age !== undefined && user.age !== null ? user.age : 'Not Set'})</span>
      </td>
      <td>${user.email}</td>
      <td>${tierBadgeHtml}</td>
      <td><span class="badge-status ${autopayStatus === 'active' ? 'success' : 'secondary'}">${autopayStatus}</span></td>
      <td><span class="badge-status ${user.identityStatus === 'verified' ? 'success' : 'secondary'}">${user.identityStatus}</span></td>
      <td><span class="badge-status ${user.openFlagCount > 0 ? 'high' : 'low'}">${user.openFlagCount} open</span></td>
      <td><span class="badge-status ${user.banned ? 'high' : 'success'}">${user.banned ? 'Banned' : 'Active'}</span></td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.togglePremium = async (userId, currentVal) => {
  const data = await apiFetch(`/users/${userId}/premium`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPremium: !currentVal })
  });
  if (data) fetchUsers();
};

window.banUserPrompt = async (userId) => {
  const reason = prompt('Please enter a reason for banning this user:');
  if (!reason) return;

  const data = await apiFetch(`/users/${userId}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (data) fetchUsers();
};

window.unbanUser = async (userId) => {
  const data = await apiFetch(`/users/${userId}/unban`, { method: 'POST' });
  if (data) fetchUsers();
};

window.openUserModal = (userId, name, badges) => {
  userModalUserId.value = userId;
  userModalBadges.value = badges;
  document.getElementById('user-modal-title').innerText = `Moderation: ${name}`;
  userModal.classList.remove('hidden');
};

userModalCancel.addEventListener('click', () => {
  userModal.classList.add('hidden');
});

userModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = userModalUserId.value;
  const badgesStr = userModalBadges.value;
  const badgesArray = badgesStr.split(',').map(b => b.trim()).filter(b => b !== '');

  const data = await apiFetch(`/users/${userId}/badge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badges: badgesArray })
  });

  if (data) {
    userModal.classList.add('hidden');
    fetchUsers();
  }
});

// ------------------------------------------------------------------
// 4. REPORTS LOGS TAB
// ------------------------------------------------------------------
async function fetchReports() {
  const data = await apiFetch('/reports');
  const tbody = document.getElementById('reports-table-body');
  
  tbody.innerHTML = '';
  if (!data || !data.reports) return;

  data.reports.forEach(report => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>@${report.reporterId?.username || 'N/A'}</td>
      <td>
        ${report.targetUserId 
          ? `User: <strong>@${report.targetUserId.username || 'N/A'}</strong>`
          : `Post ID: <code>${report.targetPostId || 'N/A'}</code>`
        }
      </td>
      <td>${report.reason}</td>
      <td>${new Date(report.createdAt).toLocaleString()}</td>
      <td><span class="badge-status ${report.status === 'open' ? 'high' : 'secondary'}">${report.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------------
// 5. FEEDBACK LOGS TAB
// ------------------------------------------------------------------
async function fetchFeedback() {
  const data = await apiFetch('/feedback');
  const tbody = document.getElementById('feedback-table-body');
  
  tbody.innerHTML = '';
  if (!data || !data.feedback) return;

    data.feedback.forEach(fb => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>@${fb.userId?.username || 'N/A'}</td>
        <td>${fb.content}</td>
        <td>${new Date(fb.createdAt).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
}

// ------------------------------------------------------------------
// 5b. WAITLIST LOGS TAB
// ------------------------------------------------------------------
async function fetchWaitlist() {
  const data = await apiFetch('/waitlist');
  const tbody = document.getElementById('waitlist-table-body');

  if (tbody) tbody.innerHTML = '';
  if (!data) return;

  // 1. Populate Stats Summary Cards
  const viz = data.visualizer || {};
  const totalCount = viz.totalEntries || data.total || 0;
  const collegeCount = viz.collegeVsGeneral?.collegeCount || 0;
  const generalCount = viz.collegeVsGeneral?.generalCount || 0;
  const topCity = viz.topCities?.[0]?.city || 'N/A';

  const statTotalEl = document.getElementById('waitlist-stat-total');
  const statCollegeEl = document.getElementById('waitlist-stat-college');
  const statGeneralEl = document.getElementById('waitlist-stat-general');
  const statCityEl = document.getElementById('waitlist-stat-top-city');

  if (statTotalEl) statTotalEl.textContent = totalCount.toLocaleString();
  if (statCollegeEl) statCollegeEl.textContent = collegeCount.toLocaleString();
  if (statGeneralEl) statGeneralEl.textContent = generalCount.toLocaleString();
  if (statCityEl) statCityEl.textContent = topCity;

  // 2. Render Data Visualizer Charts
  if (viz.dailyTimeline && Array.isArray(viz.dailyTimeline)) {
    renderChart('chart-waitlist-timeline', 'line', {
      labels: viz.dailyTimeline.map(t => t.date),
      datasets: [{
        label: 'Daily Signups',
        data: viz.dailyTimeline.map(t => t.count),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.15)',
        fill: true,
        tension: 0.3
      }]
    });
  }

  renderChart('chart-waitlist-type', 'doughnut', {
    labels: ['Campus / College Email', 'General Email'],
    datasets: [{
      data: [collegeCount, generalCount],
      backgroundColor: ['#10b981', '#64748b']
    }]
  });

  if (viz.topDomains && Array.isArray(viz.topDomains)) {
    renderChart('chart-waitlist-domains', 'bar', {
      labels: viz.topDomains.map(d => d.domain),
      datasets: [{
        label: 'Signups',
        data: viz.topDomains.map(d => d.count),
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }]
    }, {
      indexAxis: 'y'
    });
  }

  if (viz.platforms && Array.isArray(viz.platforms)) {
    renderChart('chart-waitlist-platforms', 'bar', {
      labels: viz.platforms.map(p => p.name || 'Unknown'),
      datasets: [{
        label: 'Users',
        data: viz.platforms.map(p => p.count),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    });
  }

  if (viz.topCities && Array.isArray(viz.topCities)) {
    renderChart('chart-waitlist-cities', 'bar', {
      labels: viz.topCities.map(c => c.city),
      datasets: [{
        label: 'Signups',
        data: viz.topCities.map(c => c.count),
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      }]
    });
  }

  // 3. Populate Data Table Rows
  if (!tbody || !data.entries) return;

  data.entries.forEach(entry => {
    const tr = document.createElement('tr');

    // Format location nicely
    const locationParts = [];
    if (entry.city) locationParts.push(entry.city.trim());
    if (entry.region) locationParts.push(entry.region.trim());
    if (entry.country) locationParts.push(entry.country.trim());
    const locationStr = locationParts.join(', ') || '<span class="text-secondary">Unknown</span>';

    tr.innerHTML = `
      <td><strong>${entry.ip}</strong></td>
      <td>${entry.email || '<span class="text-secondary">None</span>'}</td>
      <td>
        <span style="font-size: 0.85rem;">
          <strong>Platform:</strong> ${entry.platform || 'Unknown'}<br>
          <span class="text-secondary" style="font-size: 0.75rem; display: block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${entry.userAgent || ''}">
            ${entry.userAgent || 'N/A'}
          </span>
        </span>
      </td>
      <td>
        <span style="font-size: 0.85rem;">
          <strong>Lang:</strong> ${entry.language || 'N/A'}<br>
          <strong>Res:</strong> ${entry.screenResolution || 'N/A'}
        </span>
      </td>
      <td>
        <span class="text-secondary" style="font-size: 0.85rem; max-width: 150px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${entry.referrer || ''}">
          ${entry.referrer || 'Direct'}
        </span>
      </td>
      <td>
        <span style="font-size: 0.85rem; font-weight: 500; color: #a5b4fc;">
          ${locationStr}
        </span>
      </td>
      <td>${new Date(entry.createdAt || entry.joinedAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------------
// 6. ANNOUNCEMENT FORM SUBMIT
// ------------------------------------------------------------------
const announcementForm = document.getElementById('announcement-form');
const announceAlert = document.getElementById('announce-alert');

announcementForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  announceAlert.classList.add('hidden');
  
  const title = document.getElementById('announce-title').value;
  const content = document.getElementById('announce-content').value;

  const data = await apiFetch('/announce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });

  if (data) {
    announceAlert.innerText = 'Announcement published successfully!';
    announceAlert.className = 'alert success';
    announceAlert.classList.remove('hidden');
    
    // Clear form inputs
    document.getElementById('announce-title').value = '';
    document.getElementById('announce-content').value = '';
  }
});

// ------------------------------------------------------------------
// 7. USER PROFILE DETAIL MODAL
// ------------------------------------------------------------------
const profileViewModal = document.getElementById('profile-view-modal');
const profileViewClose = document.getElementById('profile-view-close');

profileViewClose.addEventListener('click', () => {
  profileViewModal.classList.add('hidden');
});

async function viewUserProfile(userId) {
  const data = await apiFetch(`/users/${userId}`);
  if (!data || !data.user) {
    alert('Failed to retrieve user details.');
    return;
  }

  const user = data.user;
  const detailsDiv = document.getElementById('profile-view-details');

  // Render pictures
  let picturesHTML = '';
  if (user.pictures && user.pictures.length > 0) {
    picturesHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        ${user.pictures.map(pic => `
          <img src="${pic.url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);" alt="User Photo">
        `).join('')}
      </div>
    `;
  } else {
    picturesHTML = '<p class="text-secondary" style="margin-bottom: 16px;">No profile pictures uploaded.</p>';
  }

  // Render tags/skills/hobbies
  const hobbiesHTML = user.hobbies && user.hobbies.length > 0
    ? user.hobbies.map(h => `<span class="badge-status secondary" style="margin-right: 4px; margin-bottom: 4px; display: inline-block;">${h}</span>`).join('')
    : 'None';
  const skillsHTML = user.skills && user.skills.length > 0
    ? user.skills.map(s => `<span class="badge-status secondary" style="margin-right: 4px; margin-bottom: 4px; display: inline-block;">${s}</span>`).join('')
    : 'None';

  detailsDiv.innerHTML = `
    ${picturesHTML}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 12px;">
      <div><strong>Full Name:</strong> ${user.name || 'Not set'}</div>
      <div><strong>Username:</strong> @${user.username || 'Not set'}</div>
      <div><strong>Email:</strong> ${user.email}</div>
      <div><strong>Age:</strong> ${user.age !== undefined && user.age !== null ? user.age : 'Not set'}</div>
      <div><strong>Gender:</strong> ${user.gender || 'Not set'}</div>
      <div><strong>Looking For:</strong> ${user.lookingFor || 'Not set'}</div>
      <div><strong>Sexual Orientation:</strong> ${user.sexualOrientation || 'Not set'}</div>
      <div><strong>Height:</strong> ${user.height ? user.height + ' cm' : 'Not set'}</div>
      <div><strong>School:</strong> ${user.school || 'Not set'}</div>
      <div><strong>Course:</strong> ${user.course || 'Not set'}</div>
      <div><strong>Identity Status:</strong> <span class="badge-status ${user.identityStatus === 'verified' ? 'success' : 'secondary'}">${user.identityStatus}</span></div>
      <div><strong>Open Flags:</strong> <span class="badge-status ${user.openFlagCount > 0 ? 'high' : 'low'}">${user.openFlagCount} open</span></div>
      <div><strong>Premium Account:</strong> ${user.isPremium ? 'Yes ✓' : 'No'}</div>
      <div><strong>Banned Status:</strong> <span class="badge-status ${user.banned ? 'high' : 'success'}">${user.banned ? 'Banned' : 'Active'}</span></div>
    </div>

    <div style="margin-top: 16px;">
      <strong>Bio:</strong>
      <p style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; margin: 4px 0 0 0; min-height: 40px; font-style: italic;">
        ${user.bio || 'No bio provided.'}
      </p>
    </div>

    <div style="margin-top: 16px;">
      <strong>Hobbies:</strong><br>
      <div style="margin-top: 4px;">${hobbiesHTML}</div>
    </div>

    <div style="margin-top: 12px;">
      <strong>Skills:</strong><br>
      <div style="margin-top: 4px;">${skillsHTML}</div>
    </div>

    <div style="margin-top: 12px;">
      <strong>Selected Interests:</strong><br>
      <div style="margin-top: 4px;">
        ${user.interests && user.interests.length > 0 ? user.interests.map(i => `<span class="badge" style="margin-right: 4px; margin-bottom: 4px; display: inline-block; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">${i.emoji || ''} ${i.label}</span>`).join('') : 'None'}
      </div>
    </div>

    <div style="margin-top: 12px;">
      <strong>Prompts & Answers:</strong><br>
      <div style="margin-top: 4px;">
        ${user.prompts && user.prompts.length > 0 ? user.prompts.map(p => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;">
            <div style="font-size: 0.85rem; color: #a0aec0;">${p.question}</div>
            <div style="font-weight: 500; color: #ffffff; margin-top: 2px;">${p.answer}</div>
          </div>
        `).join('') : 'None'}
      </div>
    </div>

    <div style="margin-top: 12px;">
      <strong>Badges:</strong> ${user.badges && user.badges.length > 0 ? user.badges.join(', ') : 'None'}
    </div>

    ${user.banned && user.banReason ? `
      <div style="margin-top: 12px; border: 1px solid var(--accent-color); padding: 8px; border-radius: 6px; background: rgba(255, 75, 75, 0.1);">
        <strong>Ban Reason:</strong> ${user.banReason}
      </div>
    ` : ''}
  `;

  profileViewModal.classList.remove('hidden');
}

// ------------------------------------------------------------------
// ONBOARDING OPTIONS CONFIGURATION
// ------------------------------------------------------------------
async function fetchOnboardingConfig() {
  const data = await apiFetch('/config/onboarding');
  const alertEl = document.getElementById('onboarding-config-alert');
  const editor = document.getElementById('onboarding-json-editor');
  if (alertEl) alertEl.classList.add('hidden');
  if (data && editor) {
    editor.value = JSON.stringify({ segments: data.segments, sections: data.sections }, null, 2);
  }
}

const btnLoadConfig = document.getElementById('btn-load-onboarding-config');
if (btnLoadConfig) {
  btnLoadConfig.addEventListener('click', fetchOnboardingConfig);
}

const btnSaveConfig = document.getElementById('btn-save-onboarding-config');
if (btnSaveConfig) {
  btnSaveConfig.addEventListener('click', async () => {
    const alertEl = document.getElementById('onboarding-config-alert');
    const editor = document.getElementById('onboarding-json-editor');
    if (!alertEl || !editor) return;

    alertEl.classList.add('hidden');
    let parsed;
    try {
      parsed = JSON.parse(editor.value);
    } catch (err) {
      alertEl.innerText = `Invalid JSON format: ${err.message}`;
      alertEl.className = 'alert error';
      alertEl.classList.remove('hidden');
      return;
    }

    if (!parsed.segments || !parsed.sections || !Array.isArray(parsed.segments) || !Array.isArray(parsed.sections)) {
      alertEl.innerText = 'JSON payload must contain "segments" (array) and "sections" (array) top-level keys.';
      alertEl.className = 'alert error';
      alertEl.classList.remove('hidden');
      return;
    }

    const res = await apiFetch('/config/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: parsed.segments, sections: parsed.sections })
    });

    if (res) {
      alertEl.innerText = res.message || 'Onboarding options saved successfully!';
      alertEl.className = 'alert success';
      alertEl.classList.remove('hidden');
    }
  });
}

// ------------------------------------------------------------------
// RESEND EMAIL POOL & FAILOVER MANAGEMENT
// ------------------------------------------------------------------
async function fetchEmailPoolStatus() {
  const alertEl = document.getElementById('email-alert');
  const activeDisplay = document.getElementById('active-email-account-display');
  const tableBody = document.getElementById('email-accounts-table-body');

  if (alertEl) alertEl.classList.add('hidden');

  const data = await apiFetch('/config/email');
  if (!data) return;

  if (activeDisplay) {
    if (data.activeAccount) {
      activeDisplay.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <strong style="color: #6366f1; font-size: 1.1rem;">Account #${data.activeAccount.index + 1}</strong> (${data.activeAccount.label || 'Default'})<br>
            <span style="font-size: 0.9rem; color: #a0aec0;">Sender Email: <strong style="color: #ffffff;">${data.activeAccount.fromEmail}</strong> | Key: <code style="color: #00ffcc;">${data.activeAccount.maskedKey}</code></span>
          </div>
          <div>
            <span class="badge-status success">Active Sending</span>
            <span style="margin-left: 12px; font-size: 0.9rem; color: #a0aec0;"><strong>${data.activeAccount.dailySentCount || 0}</strong> / 100 sent today</span>
          </div>
        </div>
      `;
    } else {
      activeDisplay.innerHTML = `<span style="color: var(--accent-color);">No active sending account selected.</span>`;
    }
  }

  if (tableBody) {
    if (!data.accounts || data.accounts.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No email accounts found in environment or database. Set EMAIL_API_KEY in .env.</td></tr>`;
      return;
    }

    tableBody.innerHTML = data.accounts.map(acc => {
      let statusBadge = '';
      if (acc.status === 'active') {
        statusBadge = `<span class="badge-status success">Active</span>`;
      } else if (acc.status === 'quota_exceeded') {
        statusBadge = `<span class="badge-status high">Quota Exceeded (100/day)</span>`;
      } else if (acc.status === 'error') {
        statusBadge = `<span class="badge-status high">Error</span>`;
      } else {
        statusBadge = `<span class="badge-status secondary">Disabled</span>`;
      }

      const isCurrentActive = acc.isActive;

      return `
        <tr style="${isCurrentActive ? 'background: rgba(99, 102, 241, 0.12); font-weight: 500;' : ''}">
          <td>
            <strong>Account #${acc.index + 1}</strong>
            ${isCurrentActive ? `<br><span style="font-size: 0.75rem; color: #6366f1; font-weight: 700;">[CURRENT ACTIVE]</span>` : ''}
          </td>
          <td><code style="color: #00ffcc;">${acc.maskedKey}</code></td>
          <td>${acc.fromEmail}</td>
          <td>${statusBadge}</td>
          <td>
            <strong>${acc.dailySentCount || 0}</strong> / 100
            <button class="btn secondary btn-sm" style="margin-left: 6px; padding: 2px 8px; font-size: 0.75rem;" onclick="promptAlterSentCount(${acc.index}, ${acc.dailySentCount || 0})">✏️ Edit Count</button>
          </td>
          <td>${acc.lastUsedAt ? new Date(acc.lastUsedAt).toLocaleTimeString() : 'Never'}</td>
          <td style="max-width: 200px; font-size: 0.8rem; color: var(--accent-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${acc.lastError || 'None'}">
            ${acc.lastError || 'None'}
          </td>
          <td>
            ${isCurrentActive
              ? `<span style="color: #48bb78; font-weight: 700; font-size: 0.85rem;">✓ Active Sending</span>`
              : `<button class="btn secondary btn-sm" onclick="switchActiveEmailAccount(${acc.index})">Set Active Sending</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function switchActiveEmailAccount(accountIndex) {
  const alertEl = document.getElementById('email-alert');
  if (alertEl) alertEl.classList.add('hidden');

  const res = await apiFetch('/config/email/switch', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeKeyIndex: accountIndex })
  });

  if (res) {
    if (alertEl) {
      alertEl.innerText = res.message || `Switched active sending account to Account #${accountIndex + 1}`;
      alertEl.className = 'alert success';
      alertEl.classList.remove('hidden');
    }
    fetchEmailPoolStatus();
  }
}

async function promptAlterSentCount(accountIndex, currentCount) {
  const newCountStr = prompt(`Enter new daily sent count for Account #${accountIndex + 1} (0 - 100 quota):`, currentCount);
  if (newCountStr === null) return;
  const newCount = parseInt(newCountStr, 10);
  if (isNaN(newCount) || newCount < 0) {
    alert('Please enter a valid non-negative integer.');
    return;
  }

  const alertEl = document.getElementById('email-alert');
  if (alertEl) alertEl.classList.add('hidden');

  const res = await apiFetch('/config/email/count', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountIndex, dailySentCount: newCount })
  });

  if (res) {
    if (alertEl) {
      alertEl.innerText = res.message || `Updated sent count to ${newCount}`;
      alertEl.className = 'alert success';
      alertEl.classList.remove('hidden');
    }
    fetchEmailPoolStatus();
  }
}

// Make functions globally available for inline onclick
window.switchActiveEmailAccount = switchActiveEmailAccount;
window.promptAlterSentCount = promptAlterSentCount;

const btnRefreshEmailStatus = document.getElementById('btn-refresh-email-status');
if (btnRefreshEmailStatus) {
  btnRefreshEmailStatus.addEventListener('click', fetchEmailPoolStatus);
}

// ------------------------------------------------------------------
// CAREER APPLICATIONS MANAGEMENT
// ------------------------------------------------------------------
async function fetchCareerApplications() {
  const tableBody = document.getElementById('careers-table-body');
  if (!tableBody) return;

  const data = await apiFetch('/careers');
  if (!data) return;

  if (!data.applications || data.applications.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No career applications submitted yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.applications.map(app => {
    let badgeClass = 'secondary';
    if (app.status === 'reviewed') badgeClass = 'low';
    if (app.status === 'contacted') badgeClass = 'success';
    if (app.status === 'rejected') badgeClass = 'high';

    return `
      <tr>
        <td><strong>${app.name}</strong></td>
        <td><a href="mailto:${app.email}" style="color: #6366f1; text-decoration: none; font-weight: 500;">${app.email}</a></td>
        <td><strong>${app.subject}</strong></td>
        <td style="max-width: 320px; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.4; max-height: 90px; overflow-y: auto; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 6px;">${app.body}</td>
        <td><span class="badge-status ${badgeClass}">${app.status.toUpperCase()}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${new Date(app.createdAt).toLocaleString()}</td>
        <td>
          <select class="btn secondary btn-sm" onchange="updateCareerStatus('${app._id}', this.value)" style="font-size: 0.8rem; padding: 4px 8px;">
            <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="reviewed" ${app.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="contacted" ${app.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateCareerStatus(applicationId, newStatus) {
  const alertEl = document.getElementById('careers-alert');
  if (alertEl) alertEl.classList.add('hidden');

  const res = await apiFetch(`/careers/${applicationId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });

  if (res) {
    if (alertEl) {
      alertEl.innerText = res.message || 'Application status updated';
      alertEl.className = 'alert success';
      alertEl.classList.remove('hidden');
    }
    fetchCareerApplications();
  }
}

window.updateCareerStatus = updateCareerStatus;



