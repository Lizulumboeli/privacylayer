// PrivacyLayer — Popup Script

const toggle = document.getElementById("enabledToggle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const statScanned = document.getElementById("statScanned");
const statBlocked = document.getElementById("statBlocked");
const statMasked = document.getElementById("statMasked");

// Load saved state
chrome.storage.local.get(["enabled", "stats"], (data) => {
  const enabled = data.enabled !== false; // default true
  toggle.checked = enabled;
  updateStatus(enabled);

  const stats = data.stats || { scanned: 0, blocked: 0, masked: 0 };
  statScanned.textContent = stats.scanned;
  statBlocked.textContent = stats.blocked;
  statMasked.textContent = stats.masked;
});

// Toggle handler
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled });
  updateStatus(enabled);

  // Notify content scripts
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE", enabled }).catch(() => {});
    }
  });
});

function updateStatus(enabled) {
  if (enabled) {
    statusDot.classList.remove("off");
    statusText.classList.remove("off");
    statusText.textContent = "ACTIVE — Scanning prompts";
  } else {
    statusDot.classList.add("off");
    statusText.classList.add("off");
    statusText.textContent = "PAUSED — Protection off";
  }
}
