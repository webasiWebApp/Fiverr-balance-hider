const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status-text");

function updateUI(enabled) {
  toggle.checked = enabled;
  statusText.textContent = enabled ? "Active — prices are hidden" : "Inactive — prices visible";
  statusText.style.color = enabled ? "#1dbf73" : "#555";
}

// Load current state
chrome.storage.sync.get({ enabled: false }, ({ enabled }) => {
  updateUI(enabled);
});

// Handle toggle
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled }, () => {
    updateUI(enabled);
  });
});
