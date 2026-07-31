// Background service worker for Capsule Hub
// 🔒 PRIVACY: This extension does not collect, transmit, or store any user data externally.
// All context transfer happens locally within your browser.
console.log("[Capsule Hub] Background service worker initialized.");

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openTabAndInject") {
    const { url, targetAI } = message;

    // Create new tab with the target AI tool
    chrome.tabs.create({ url: url, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("[Capsule Hub] Failed to create tab:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      console.log(`[Capsule Hub] Created new tab for ${targetAI} (Tab ID: ${tab.id})`);
      sendResponse({ success: true, tabId: tab.id });
    });
    return true; // Keeps the message channel open for async response
  }

  if (message.action === "updateBadge") {
    const { text, color } = message;
    chrome.action.setBadgeText({ text: text || "" }).catch(err => {
      console.warn("[Capsule Hub] Badge text update failed:", err);
    });
    if (color) {
      chrome.action.setBadgeBackgroundColor({ color: color }).catch(err => {
        console.warn("[Capsule Hub] Badge color update failed:", err);
      });
    }
    sendResponse({ success: true });
  }

  // Handle tab query from popup to check if content script is loaded
  if (message.action === "checkTabReady") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ ready: false });
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          sendResponse({ ready: false });
        } else {
          sendResponse({ ready: true, provider: response.provider });
        }
      });
    });
    return true;
  }
});

// Auto-clear expired pending contexts periodically (every 5 minutes)
setInterval(() => {
  chrome.storage.local.get('pendingContext', (data) => {
    if (data && data.pendingContext) {
      const timeDiff = Date.now() - data.pendingContext.timestamp;
      if (timeDiff > 120000) {
        chrome.storage.local.remove('pendingContext');
        console.log("[Capsule Hub] Auto-cleaned expired pending context");
      }
    }
  });
}, 300000);
