// PileBlock - Background Service Worker

const STORAGE_KEY = 'pileblock';
const DEFAULT_STATE = {
  enabled: true,
  totalBlocked: 0,
  sessionBlocked: 0,
  tabCounts: {}
};

// Initialize state
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (!existing[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_STATE });
  }
  await updateBadge();
});

// Track blocked requests via declarativeNetRequest
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(async (info) => {
  const data = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || DEFAULT_STATE;
  data.totalBlocked++;
  data.sessionBlocked++;

  const tabId = info.request.tabId;
  if (tabId > 0) {
    data.tabCounts[tabId] = (data.tabCounts[tabId] || 0) + 1;
    updateBadgeForTab(tabId, data.tabCounts[tabId]);
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: data });
});

// Also count via the non-debug API for production
if (!chrome.declarativeNetRequest.onRuleMatchedDebug) {
  // Fallback: use webRequest to approximate counts
  // declarativeNetRequestFeedback permission gives us the matched rules info
}

// Use the matched rules info to count blocks
chrome.webNavigation?.onCompleted?.addListener(async (details) => {
  if (details.frameId !== 0) return;
  try {
    const rules = await chrome.declarativeNetRequest.getMatchedRules({ tabId: details.tabId });
    if (rules?.rulesMatchedInfo?.length) {
      const data = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || DEFAULT_STATE;
      const count = rules.rulesMatchedInfo.length;
      data.tabCounts[details.tabId] = count;
      data.totalBlocked += count;
      data.sessionBlocked += count;
      await chrome.storage.local.set({ [STORAGE_KEY]: data });
      updateBadgeForTab(details.tabId, count);
    }
  } catch (e) {
    // getMatchedRules may not be available without declarativeNetRequestFeedback
  }
});

// Update badge text for a specific tab
function updateBadgeForTab(tabId, count) {
  const text = count > 999 ? `${Math.floor(count / 1000)}k` : String(count);
  chrome.action.setBadgeText({ text, tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: '#e63946', tabId }).catch(() => {});
}

// Update badge globally
async function updateBadge() {
  chrome.action.setBadgeBackgroundColor({ color: '#e63946' }).catch(() => {});
}

// Clean up tab counts when tabs close
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if (data?.tabCounts?.[tabId]) {
    delete data.tabCounts[tabId];
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  }
});

// Handle enable/disable toggle from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'toggle') {
    handleToggle(msg.enabled).then(sendResponse);
    return true;
  }
  if (msg.type === 'getStats') {
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      sendResponse(result[STORAGE_KEY] || DEFAULT_STATE);
    });
    return true;
  }
  if (msg.type === 'resetStats') {
    handleResetStats().then(sendResponse);
    return true;
  }
});

async function handleToggle(enabled) {
  const data = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || DEFAULT_STATE;
  data.enabled = enabled;
  await chrome.storage.local.set({ [STORAGE_KEY]: data });

  // Enable/disable all static rulesets
  const rulesetIds = ['easylist', 'easyprivacy'];
  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: rulesetIds
    });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: rulesetIds
    });
  }

  // Update badge
  if (!enabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    await updateBadge();
  }

  return { success: true };
}

async function handleResetStats() {
  const data = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || DEFAULT_STATE;
  data.totalBlocked = 0;
  data.sessionBlocked = 0;
  data.tabCounts = {};
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
  return { success: true };
}
