const toggle = document.getElementById('enableToggle');
const pageCount = document.getElementById('pageCount');
const totalCount = document.getElementById('totalCount');
const statusText = document.getElementById('statusText');

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function updateUI(stats) {
  toggle.checked = stats.enabled;
  totalCount.textContent = formatNumber(stats.totalBlocked || 0);

  if (stats.enabled) {
    statusText.textContent = 'Protection active';
    statusText.className = 'status active';
  } else {
    statusText.textContent = 'Protection disabled';
    statusText.className = 'status disabled';
  }
}

// Get current tab's blocked count
async function loadStats() {
  const stats = await chrome.runtime.sendMessage({ type: 'getStats' });
  if (!stats) return;

  updateUI(stats);

  // Get current tab count
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && stats.tabCounts?.[tab.id]) {
    pageCount.textContent = formatNumber(stats.tabCounts[tab.id]);
  }
}

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  await chrome.runtime.sendMessage({ type: 'toggle', enabled });
  const stats = await chrome.runtime.sendMessage({ type: 'getStats' });
  if (stats) updateUI(stats);
});

loadStats();
