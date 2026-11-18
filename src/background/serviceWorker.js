// Background service worker (Manifest V3).
// Phase 1: first-run setup only. Auto-backup scheduling arrives in Phase 5.

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    console.info('[CPB] Claude Project Bridge installed. All data stays on this device.');
  }
});
