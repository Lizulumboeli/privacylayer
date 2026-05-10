// PrivacyLayer — Background Service Worker

// Initialize default state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    stats: { scanned: 0, blocked: 0, masked: 0 },
  });
  console.log("[PrivacyLayer] Installed and ready.");
});

// Listen for stats updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_STATS") {
    chrome.storage.local.get("stats", (data) => {
      const stats = data.stats || { scanned: 0, blocked: 0, masked: 0 };
      if (message.scanned) stats.scanned++;
      if (message.blocked) stats.blocked += message.blocked;
      if (message.masked) stats.masked++;
      chrome.storage.local.set({ stats });
    });
  }
});
