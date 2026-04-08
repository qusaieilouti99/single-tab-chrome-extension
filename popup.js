// ── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  enabled: true,
  mode: 'all',           // 'all' | 'whitelist'
  matchMode: 'hostname', // 'hostname' | 'fullurl'
  whitelist: [],
  blacklist: []
};

// ── Contextual copy ──────────────────────────────────────────────────────────
const HINTS = {
  mode: {
    all:       'Blocks all domains\nexcept Blacklisted ones.',
    whitelist: 'Only blocks domains\nyou add to Whitelist.'
  },
  match: {
    hostname: 'Matches any path\non the same host.',
    fullurl:  'Only if the exact URL\nis already open.'
  },
  tab: {
    whitelist: 'Single-tab rule is enforced for these domains.',
    blacklist: 'These domains are always allowed multiple tabs.'
  }
};

// ── State ────────────────────────────────────────────────────────────────────
let settings   = { ...DEFAULTS };
let activeTab  = 'whitelist';
let errorTimer = null;

// ── Storage helpers ──────────────────────────────────────────────────────────
function loadSettings() {
  return new Promise(resolve =>
    chrome.storage.sync.get(DEFAULTS, data => { settings = data; resolve(); })
  );
}

function saveSettings() {
  chrome.storage.sync.set(settings);
}

// ── Validation helpers ───────────────────────────────────────────────────────
const DOMAIN_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function isValidDomain(s) {
  return DOMAIN_RE.test(s);
}

// Strip protocol / path if the user pastes a full URL
function normalizeDomain(raw) {
  raw = raw.trim().toLowerCase();
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return new URL(raw).hostname;
    }
  } catch { /* fall through */ }
  // Strip any trailing slashes or paths typed manually
  return raw.split('/')[0];
}

// ── Error display ────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => { el.textContent = ''; }, 3000);
}

function clearError() {
  document.getElementById('errorMsg').textContent = '';
}

// ── Render domain list ───────────────────────────────────────────────────────
function renderList() {
  const list  = document.getElementById('domainList');
  const items = settings[activeTab];

  syncBadges();
  syncHints();
  syncFooter();

  if (items.length === 0) {
    list.innerHTML = `
      <li class="empty-state">
        <span class="empty-icon">${activeTab === 'whitelist' ? '✅' : '🚫'}</span>
        <span class="empty-text">
          No domains yet.<br>Add one above to get started.
        </span>
      </li>`;
    return;
  }

  list.innerHTML = items.map((domain, i) => `
    <li class="domain-item" data-index="${i}">
      <span class="item-dot ${activeTab === 'whitelist' ? 'dot-whitelist' : 'dot-blacklist'}"></span>
      <span class="domain-name" title="${domain}">${domain}</span>
      <button class="remove-btn" data-index="${i}" aria-label="Remove ${domain}">×</button>
    </li>
  `).join('');

  // Wire up remove buttons
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      settings[activeTab].splice(idx, 1);
      saveSettings();
      renderList();
    });
  });
}

// ── Sync badges, hints, footer ───────────────────────────────────────────────
function syncBadges() {
  document.getElementById('whitelistBadge').textContent = settings.whitelist.length;
  document.getElementById('blacklistBadge').textContent = settings.blacklist.length;
}

function syncHints() {
  document.getElementById('modeHint').textContent  = HINTS.mode[settings.mode];
  document.getElementById('matchHint').textContent = HINTS.match[settings.matchMode];
  document.getElementById('listHint').textContent  = HINTS.tab[activeTab];
}

function syncFooter() {
  const total   = settings.whitelist.length + settings.blacklist.length;
  const dot     = settings.enabled ? '🟢' : '🔴';
  const status  = settings.enabled ? 'Active' : 'Disabled';
  const domains = `${total} domain${total !== 1 ? 's' : ''} configured`;
  document.getElementById('footerText').textContent = `${dot} ${status} · ${domains}`;

  // Header sub-label
  document.getElementById('statusLabel').textContent = status;
}

function syncDisabledState() {
  const off = !settings.enabled;
  document.getElementById('settingsPanel').classList.toggle('dimmed', off);
  document.getElementById('listPanel').classList.toggle('dimmed', off);
  document.getElementById('tabBar').classList.toggle('dimmed', off);
}

// ── Chip group helper ─────────────────────────────────────────────────────────
function setupChipGroup(groupId, settingKey, onUpdate) {
  const group = document.getElementById(groupId);
  // Reflect saved value
  group.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.value === settings[settingKey]);
  });
  // Wire clicks
  group.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.dataset.value === settings[settingKey]) return; // no-op
      settings[settingKey] = chip.dataset.value;
      saveSettings();
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (onUpdate) onUpdate(chip.dataset.value);
    });
  });
}

// ── Add domain ────────────────────────────────────────────────────────────────
function addDomain() {
  const input = document.getElementById('domainInput');
  const raw   = input.value.trim();
  if (!raw) return;

  const domain = normalizeDomain(raw);

  // Validate
  if (!isValidDomain(domain)) {
    showError(`"${domain}" is not a valid domain name.`);
    return;
  }

  // Conflict check
  const other = activeTab === 'whitelist' ? 'blacklist' : 'whitelist';
  if (settings[other].includes(domain)) {
    showError(`Already in ${other}. Remove it there first.`);
    return;
  }

  // Duplicate check
  if (settings[activeTab].includes(domain)) {
    showError('Domain is already in this list.');
    return;
  }

  clearError();
  settings[activeTab].push(domain);
  saveSettings();
  input.value = '';
  renderList();

  // Tiny visual feedback — briefly highlight the new entry
  requestAnimationFrame(() => {
    const items = document.querySelectorAll('.domain-item');
    const last  = items[items.length - 1];
    if (last) {
      last.style.background = 'var(--purple-light)';
      setTimeout(() => { last.style.background = ''; }, 600);
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadSettings();

  // ── Master toggle ──
  const masterToggle = document.getElementById('masterToggle');
  masterToggle.checked = settings.enabled;
  syncDisabledState();
  syncFooter();

  masterToggle.addEventListener('change', () => {
    settings.enabled = masterToggle.checked;
    saveSettings();
    syncDisabledState();
    syncFooter();
  });

  // ── Mode chips ──
  setupChipGroup('modeGroup', 'mode', () => syncHints());

  // ── Match chips ──
  setupChipGroup('matchGroup', 'matchMode', () => syncHints());

  // ── Tab buttons ──
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      clearError();
      document.getElementById('domainInput').placeholder =
        activeTab === 'whitelist' ? 'web.whatsapp.com' : 'ads.example.com';
      renderList();
    });
  });

  // ── Add button + Enter key ──
  document.getElementById('addBtn').addEventListener('click', addDomain);
  document.getElementById('domainInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addDomain();
    if (e.key === 'Escape') {
      document.getElementById('domainInput').value = '';
      clearError();
    }
  });

  renderList();
}

init();
