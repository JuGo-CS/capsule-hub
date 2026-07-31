// Content script for Capsule Hub - running on AI chat sites
// 🔒 PRIVACY: All processing happens locally. No data is sent to any external server.
console.log("[Capsule Hub] Content script loaded on", window.location.hostname);

// Provider configuration mapping
const PROVIDERS = {
  chatgpt: {
    name: "ChatGPT",
    domains: ["chatgpt.com", "chat.openai.com"],
    selectors: {
      userMessage: '[data-message-author-role="user"], .user-message, [class*="user-message"]',
      assistantMessage: '[data-message-author-role="assistant"], .assistant-message, [class*="assistant-message"]',
      input: '#prompt-textarea, div[contenteditable="true"][data-id], textarea[rows]'
    }
  },
  claude: {
    name: "Claude",
    domains: ["claude.ai"],
    selectors: {
      userMessage: '[data-testid="user-message"], div.font-user-message, [class*="user-message"]',
      assistantMessage: '.font-claude-message, [class*="claude-message"], [class*="assistant-message"]',
      input: 'div[contenteditable="true"][role="textbox"], div.ProseMirror[contenteditable="true"]'
    }
  },
  gemini: {
    name: "Gemini",
    domains: ["gemini.google.com"],
    selectors: {
      userMessage: 'user-query, .query-text, [class*="user-query"]',
      assistantMessage: 'model-turn, .model-response, [class*="model-turn"]',
      input: 'div[contenteditable="true"], rich-textarea div[contenteditable="true"]'
    }
  },
  deepseek: {
    name: "DeepSeek",
    domains: ["deepseek.com", "chat.deepseek.com"],
    selectors: {
      userMessage: '[class*="user-message"], .ds-chat-turn--user',
      assistantMessage: '.ds-markdown, [class*="assistant-message"]',
      input: '#chat-input, textarea[placeholder*="message"], div[contenteditable="true"]'
    }
  }
};

// Detect current provider based on hostname
function detectCurrentProvider() {
  const host = window.location.hostname;
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    if (provider.domains.some(domain => host.includes(domain))) {
      return key;
    }
  }
  return null;
}

// Scroll to the top of the chat container and wait for all messages to load
async function scrollToTopAndLoadAll() {
  const scrollContainers = [
    document.querySelector('[class*="overflow-auto"][class*="scroll"]'),
    document.querySelector('main'),
    document.querySelector('[role="main"]'),
    document.scrollingElement || document.documentElement
  ].filter(Boolean);

  for (const container of scrollContainers) {
    if (container.scrollHeight > container.clientHeight) {
      let previousHeight = 0;
      let stableCount = 0;
      const maxAttempts = 30;

      for (let i = 0; i < maxAttempts; i++) {
        container.scrollTop = 0;
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const currentHeight = container.scrollHeight;
        if (currentHeight === previousHeight) {
          stableCount++;
          if (stableCount >= 3) break;
        } else {
          stableCount = 0;
        }
        previousHeight = currentHeight;
      }
      break;
    }
  }

  // Small delay for DOM to settle
  await new Promise(resolve => setTimeout(resolve, 300));
}

// Extract conversation from page DOM
async function extractConversation() {
  const providerKey = detectCurrentProvider();
  if (!providerKey) {
    return { success: false, error: "Unsupported AI website. Navigate to ChatGPT, Claude, Gemini, or DeepSeek to extract context." };
  }

  try {
    await scrollToTopAndLoadAll();
  } catch (error) {
    console.warn("[Capsule Hub] Scroll to top encountered an issue:", error);
  }

  const provider = PROVIDERS[providerKey];
  const userSelector = provider.selectors.userMessage;
  const assistantSelector = provider.selectors.assistantMessage;

  const querySelectorAllString = `${userSelector}, ${assistantSelector}`;
  const elements = Array.from(document.querySelectorAll(querySelectorAllString));

  if (elements.length === 0) {
    return {
      success: false,
      error: "No messages found. Try sending a message first or scroll up to load the full conversation."
    };
  }

  const messages = [];

  elements.forEach((element) => {
    let role = 'unknown';
    if (element.matches(userSelector)) {
      role = 'user';
    } else if (element.matches(assistantSelector)) {
      role = 'assistant';
    } else {
      const className = element.className.toLowerCase();
      if (className.includes('user')) role = 'user';
      else if (className.includes('assistant') || className.includes('claude') || className.includes('model')) {
        role = 'assistant';
      }
    }

    // Clone and clean element to extract pure text
    const clone = element.cloneNode(true);
    const elementsToRemove = clone.querySelectorAll(
      'button, svg, [aria-hidden="true"], [role="button"], ' +
      'img[class*="avatar"], img[class*="icon"], ' +
      'div[class*="action"], div[class*="Action"], ' +
      'div[class*="toolbar"], div[class*="feedback"], ' +
      'span[class*="copy"], span[class*="Copy"]'
    );
    elementsToRemove.forEach(el => el.remove());

    let text = (clone.innerText || clone.textContent || "").trim();

    // Remove common boilerplate text patterns
    text = text.replace(/^(Copy|Copy code|Regenerate|Good response|Bad response)\s*/gim, '');

    if (text && role !== 'unknown') {
      messages.push({ role, text });
    }
  });

  // Filter consecutive duplicates (DOM structures can sometimes cause double matches)
  const filteredMessages = [];
  for (let i = 0; i < messages.length; i++) {
    if (i === 0 || messages[i].text !== messages[i - 1].text || messages[i].role !== messages[i - 1].role) {
      filteredMessages.push(messages[i]);
    }
  }

  if (filteredMessages.length === 0) {
    return {
      success: false,
      error: "Could not extract meaningful content from this page."
    };
  }

  return {
    success: true,
    provider: providerKey,
    providerName: provider.name,
    messages: filteredMessages,
    timestamp: Date.now(),
    url: window.location.href
  };
}

// Inject text into the target input element with React/Vue compatibility
function injectText(element, text) {
  element.focus();

  // Method 1: Modern Input Events API (preferred for React/Vue frameworks)
  try {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      // Use native setter to bypass framework overrides
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, text);
      } else {
        element.value = text;
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      console.log("[Capsule Hub] Injected via native value setter");
      return true;
    } else if (element.isContentEditable) {
      // For contenteditable divs (used by ChatGPT, Claude, etc.)
      // Use InputEvent for better framework compatibility
      element.innerText = '';
      
      const inputEvent = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: true,
        composed: true
      });
      element.dispatchEvent(inputEvent);

      element.innerText = text;

      const afterInputEvent = new InputEvent('input', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: false,
        composed: true
      });
      element.dispatchEvent(afterInputEvent);

      console.log("[Capsule Hub] Injected via InputEvent API");
      return true;
    }
  } catch (e) {
    console.warn("[Capsule Hub] Modern injection failed, trying fallback:", e);
  }

  // Method 2: Fallback using execCommand (deprecated but still works)
  try {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    console.log("[Capsule Hub] Injected via execCommand fallback");
    return true;
  } catch (e) {
    console.error("[Capsule Hub] All injection methods failed:", e);
    return false;
  }
}

// Periodically look for input box and inject context
function startInjectionPolling(text) {
  const providerKey = detectCurrentProvider();
  if (!providerKey) return;

  const provider = PROVIDERS[providerKey];
  let attempts = 0;
  const maxAttempts = 40; // 20 seconds max

  console.log(`[Capsule Hub] Starting injection polling for ${provider.name}...`);

  // Show injection progress indicator
  showInjectIndicator("Preparing to inject context...");

  const pollInterval = setInterval(() => {
    attempts++;

    const inputElement = document.querySelector(provider.selectors.input);

    if (inputElement) {
      clearInterval(pollInterval);
      console.log("[Capsule Hub] Found input element. Injecting context...");

      showInjectIndicator("Injecting context...");

      setTimeout(() => {
        const success = injectText(inputElement, text);
        if (success) {
          showToast(`✅ Context injected! Review and press Enter to continue.`, "success");
          showInjectIndicator(null); // Hide indicator
          // Clear context from storage so it doesn't inject again on refresh
          chrome.storage.local.remove('pendingContext');
        } else {
          showToast(`⚠️ Auto-inject failed. Context copied to clipboard — please paste manually.`, "warning");
          showInjectIndicator(null);
          navigator.clipboard.writeText(text).catch(err => console.error("[Capsule Hub] Clipboard copy failed:", err));
        }
      }, 800); // Buffer to ensure editor listeners are registered
    }

    if (attempts >= maxAttempts) {
      clearInterval(pollInterval);
      console.warn("[Capsule Hub] Input element not found after 20 seconds.");
      showToast("⚠️ Input area not found. Context copied to clipboard!", "warning");
      showInjectIndicator(null);
      navigator.clipboard.writeText(text).catch(err => console.error("[Capsule Hub] Clipboard copy failed:", err));
    }
  }, 500);
}

// Show/hide injection progress indicator
function showInjectIndicator(message) {
  let indicator = document.getElementById('capsule-hub-inject-indicator');

  if (!message) {
    if (indicator) {
      indicator.classList.remove('visible');
      setTimeout(() => indicator?.remove(), 300);
    }
    return;
  }

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'capsule-hub-inject-indicator';
    indicator.innerHTML = '<div class="spinner"></div><span></span>';
    document.body.appendChild(indicator);
  }

  indicator.querySelector('span').textContent = message;
  requestAnimationFrame(() => indicator.classList.add('visible'));
}

// Display toast message in the UI
function showToast(message, type = "success") {
  const existing = document.getElementById('capsule-hub-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'capsule-hub-toast';

  const themeColors = {
    success: {
      bg: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
      border: "#22d3ee",
      shadow: "rgba(6, 182, 212, 0.4)"
    },
    warning: {
      bg: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      border: "#fbbf24",
      shadow: "rgba(245, 158, 11, 0.4)"
    }
  };

  const currentTheme = themeColors[type] || themeColors.success;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    background: currentTheme.bg,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '12px',
    border: `1px solid ${currentTheme.border}`,
    boxShadow: `0 10px 25px -5px ${currentTheme.shadow}, 0 8px 10px -6px ${currentTheme.shadow}`,
    zIndex: '999999',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    opacity: '0',
    transform: 'translateY(-20px) scale(0.95)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'none',
    maxWidth: '360px'
  });

  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px) scale(0.95)';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// Simple HTML escaper for safe text injection
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContext") {
    extractConversation().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === "ping") {
    sendResponse({ alive: true, provider: detectCurrentProvider() });
    return false;
  }

  return false;
});

// Check if we have pending context injection at load time
chrome.storage.local.get('pendingContext', (data) => {
  if (data && data.pendingContext) {
    const context = data.pendingContext;
    const currentProvider = detectCurrentProvider();

    // Check if the domain matches the target and has not expired (within last 2 minutes)
    const timeDiff = Date.now() - context.timestamp;
    if (context.targetAI === currentProvider && timeDiff < 120000) {
      // Wait for DOM to be ready
      const init = () => startInjectionPolling(context.text);
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 500); // Small delay to ensure page scripts are loaded
      } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
      }
    } else if (timeDiff >= 120000) {
      // Clean up expired pending context
      chrome.storage.local.remove('pendingContext');
    }
  }
});
