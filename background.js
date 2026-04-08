// ── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  enabled: true,
  mode: 'all',          // 'all' | 'whitelist'
  matchMode: 'hostname', // 'hostname' | 'fullurl'
  whitelist: [],
  blacklist: []
};

// ── Icon Generator (canvas-based, no image files needed) ────────────────────
function createIconImageData(size, enabled) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size / 2;

  // Circle background
  ctx.fillStyle = enabled ? '#667eea' : '#9ca3af';
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // White "1" label
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.round(size * 0.52)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', r, r + size * 0.03);

  return ctx.getImageData(0, 0, size, size);
}

function updateIcon(enabled) {
  chrome.action.setIcon({
    imageData: {
      16:  createIconImageData(16,  enabled),
      32:  createIconImageData(32,  enabled),
      48:  createIconImageData(48,  enabled),
      128: createIconImageData(128, enabled)
    }
  });
}

// ── Settings ────────────────────────────────────────────────────────────────
function getSettings() {
  return new Promise(resolve => chrome.storage.sync.get(DEFAULTS, resolve));
}

// ── Domain Matching ─────────────────────────────────────────────────────────
// Supports exact match AND parent-domain match:
//   pattern "whatsapp.com" will match "web.whatsapp.com"
function domainMatches(hostname, pattern) {
  return hostname === pattern || hostname.endsWith('.' + pattern);
}

// ── Core Logic ───────────────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  // Only fire when the tab navigates to a new URL
  if (!changeInfo.url) return;

  const s = await getSettings();
  if (!s.enabled) return;

  let url;
  try { url = new URL(changeInfo.url); } catch { return; }

  const hostname = url.hostname;
  if (!hostname) return; // Ignore chrome://, about:blank, etc.

  // ① Blacklist — always allow multiple tabs for these
  if (s.blacklist.some(d => domainMatches(hostname, d))) return;

  // ② Mode — in 'whitelist' mode, skip unless domain is in the whitelist
  if (s.mode === 'whitelist' && !s.whitelist.some(d => domainMatches(hostname, d))) return;

  // ③ Find a tab already open on the same domain / URL
  chrome.tabs.query({}, allTabs => {
    const existing = allTabs.find(t => {
      if (t.id === tabId || !t.url) return false;
      try {
        if (s.matchMode === 'hostname') {
          return new URL(t.url).hostname === hostname;
        } else {
          return t.url === changeInfo.url;
        }
      } catch { return false; }
    });

    if (existing) {
      // Switch focus to the existing tab and close the duplicate
      chrome.tabs.update(existing.id, { active: true });
      chrome.windows.update(existing.windowId, { focused: true });
      chrome.tabs.remove(tabId);
    }
  });
});

// ── React to settings changes (update icon colour) ───────────────────────────
chrome.storage.onChanged.addListener(changes => {
  if ('enabled' in changes) {
    updateIcon(changes.enabled.newValue);
  }
});

// ── Init icon on startup / install ───────────────────────────────────────────
async function initIcon() {
  const s = await getSettings();
  updateIcon(s.enabled);
}

chrome.runtime.onStartup.addListener(initIcon);
chrome.runtime.onInstalled.addListener(initIcon);
