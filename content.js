// Capsule Hub - Intelligent Context Extraction
// Uses the AI itself to create intelligent context capsules

console.log("[Capsule Hub] Content script loaded on", window.location.hostname);

// Provider configurations
const PROVIDERS = {
  chatgpt: {
    name: "ChatGPT",
    domains: ["chatgpt.com", "chat.openai.com"],
    selectors: {
      userMessage: '[data-message-author-role="user"], .user-message',
      assistantMessage: '[data-message-author-role="assistant"], .assistant-message',
      input: '#prompt-textarea, div[contenteditable="true"][data-id], textarea[rows]',
      sendButton: 'button[data-testid="send-button"], button[aria-label="Send"]'
    }
  },
  claude: {
    name: "Claude",
    domains: ["claude.ai"],
    selectors: {
      userMessage: '[data-testid="user-message"], div.font-user-message',
      assistantMessage: '.font-claude-message, [class*="assistant-message"]',
      input: 'div[contenteditable="true"][role="textbox"], div.ProseMirror[contenteditable="true"]',
      sendButton: 'button[aria-label="Send Message"]'
    }
  },
  gemini: {
    name: "Gemini",
    domains: ["gemini.google.com"],
    selectors: {
      userMessage: 'user-query, .query-text',
      assistantMessage: 'model-turn, .model-response',
      input: 'div[contenteditable="true"], rich-textarea div[contenteditable="true"]',
      sendButton: 'button[aria-label="Send message"]'
    }
  },
  deepseek: {
    name: "DeepSeek",
    domains: ["deepseek.com", "chat.deepseek.com"],
    selectors: {
      userMessage: '[class*="user-message"], .ds-chat-turn--user',
      assistantMessage: '.ds-markdown, [class*="assistant-message"]',
      input: '#chat-input, textarea[placeholder*="message"], div[contenteditable="true"]',
      sendButton: 'button[class*="send"]'
    }
  }
};

// Detect provider
function detectProvider() {
  const host = window.location.hostname;
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    if (provider.domains.some(domain => host.includes(domain))) {
      return key;
    }
  }
  return null;
}

// Extract conversation messages
function extractMessages() {
  const providerKey = detectProvider();
  if (!providerKey) return [];

  const provider = PROVIDERS[providerKey];
  const userSelector = provider.selectors.userMessage;
  const assistantSelector = provider.selectors.assistantMessage;

  const elements = Array.from(document.querySelectorAll(`${userSelector}, ${assistantSelector}`));
  const messages = [];

  elements.forEach(element => {
    let role = 'unknown';
    if (element.matches(userSelector)) {
      role = 'user';
    } else if (element.matches(assistantSelector)) {
      role = 'assistant';
    }

    // Clean the text
    const clone = element.cloneNode(true);
    const toRemove = clone.querySelectorAll('button, svg, [aria-hidden="true"], [role="button"]');
    toRemove.forEach(el => el.remove());

    let text = (clone.innerText || clone.textContent || "").trim();
    text = text.replace(/^(Copy|Copy code|Regenerate)\s*/gim, '');

    if (text && role !== 'unknown') {
      messages.push({ role, text });
    }
  });

  return messages;
}

// The intelligent prompt that asks the AI to create a capsule
const CAPSULE_CREATION_PROMPT = `You are helping create a "Context Capsule" - a compact, intelligent summary of our conversation that can be transferred to another AI assistant.

Please analyze our entire conversation above and create a context capsule with the following structure:

[CONTEXT CAPSULE]

## OBJECTIVE
(What was the main goal/task I was trying to accomplish? Be specific and concise - 1-2 sentences)

## KEY DECISIONS
(List the important decisions we made during this conversation - bullet points)

## PROGRESS
✅ (What has been completed/accomplished - bullet points)
⏳ (What is still pending/needs to be done - bullet points)

## TECHNICAL DETAILS
(Important technical details, constraints, requirements, or specifications discussed)

## CODE
(If any code was written, include the MOST IMPORTANT code blocks here - keep only essential code, not every snippet)

## CURRENT STATE
(Where exactly are we right now? What was the last thing discussed? What should the next AI know to continue seamlessly?)

[END CAPSULE]

IMPORTANT GUIDELINES:
- Be INTELLIGENT and CONCISE - this should be 400-800 tokens max
- Capture the ESSENCE, not every detail
- Focus on what's needed to CONTINUE the conversation in a new AI
- Include all important code, but only the essential parts
- Write this as if you're briefing another AI assistant who will take over
- Do NOT include this prompt in your response, only the capsule itself
- Do NOT add any commentary before or after the capsule

Please create the context capsule now:`;

// Inject text into input field
function injectText(element, text) {
  element.focus();

  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    const setter = Object.getOwnPropertyDescriptor(
      element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;

    if (setter) {
      setter.call(element, text);
    } else {
      element.value = text;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.isContentEditable) {
    element.innerText = text;
    element.dispatchEvent(new InputEvent('input', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: false,
      composed: true
    }));
  }
}

// Wait for AI response and capture it
async function waitForCapsuleResponse(timeout = 60000) {
  const providerKey = detectProvider();
  if (!providerKey) throw new Error("Provider not detected");

  const provider = PROVIDERS[providerKey];
  const startTime = Date.now();
  let lastMessageCount = document.querySelectorAll(provider.selectors.assistantMessage).length;

  // Wait for new message to appear
  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const currentMessages = document.querySelectorAll(provider.selectors.assistantMessage);
    
    if (currentMessages.length > lastMessageCount) {
      // New message appeared, wait for it to finish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the last message
      const lastMessage = currentMessages[currentMessages.length - 1];
      const clone = lastMessage.cloneNode(true);
      const toRemove = clone.querySelectorAll('button, svg, [aria-hidden="true"]');
      toRemove.forEach(el => el.remove());
      
      const text = (clone.innerText || clone.textContent || "").trim();
      
      // Check if it contains the capsule marker
      if (text.includes('[CONTEXT CAPSULE]') || text.includes('[END CAPSULE]')) {
        // Extract just the capsule part
        const capsuleMatch = text.match(/\[CONTEXT CAPSULE\][\s\S]*?\[END CAPSULE\]/);
        if (capsuleMatch) {
          return capsuleMatch[0];
        }
      }
      
      // If no markers, return the whole response (AI might have formatted differently)
      if (text.length > 200) {
        return text;
      }
    }
  }
  
  throw new Error("Timeout waiting for capsule response");
}

// Create capsule using AI intelligence
async function createIntelligentCapsule() {
  const providerKey = detectProvider();
  if (!providerKey) {
    throw new Error("Not on a supported AI platform");
  }

  const provider = PROVIDERS[providerKey];
  
  // Extract current messages
  const messages = extractMessages();
  if (messages.length === 0) {
    throw new Error("No conversation found. Start chatting first!");
  }

  // Find input field
  const inputElement = document.querySelector(provider.selectors.input);
  if (!inputElement) {
    throw new Error("Input field not found");
  }

  // Inject the capsule creation prompt
  injectText(inputElement, CAPSULE_CREATION_PROMPT);

  // Wait a bit for the text to be registered
  await new Promise(resolve => setTimeout(resolve, 500));

  // Click send button or press Enter
  const sendButton = document.querySelector(provider.selectors.sendButton);
  if (sendButton) {
    sendButton.click();
  } else {
    // Fallback: simulate Enter key
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    inputElement.dispatchEvent(enterEvent);
  }

  // Show indicator
  showIndicator("🧠 AI is creating your capsule...");

  // Wait for response
  try {
    const capsule = await waitForCapsuleResponse(60000);
    showIndicator(null);
    return {
      text: capsule,
      messageCount: messages.length,
      provider: provider.name,
      timestamp: Date.now()
    };
  } catch (error) {
    showIndicator(null);
    throw error;
  }
}

// Show/hide indicator
function showIndicator(message) {
  let indicator = document.getElementById('capsule-hub-indicator');

  if (!message) {
    if (indicator) {
      indicator.classList.remove('visible');
      setTimeout(() => indicator?.remove(), 300);
    }
    return;
  }

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'capsule-hub-indicator';
    indicator.innerHTML = '<div class="spinner"></div><span></span>';
    document.body.appendChild(indicator);
  }

  indicator.querySelector('span').textContent = message;
  requestAnimationFrame(() => indicator.classList.add('visible'));
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractMessages") {
    const messages = extractMessages();
    sendResponse({ success: true, messages, provider: detectProvider() });
    return false;
  }

  if (request.action === "createCapsule") {
    createIntelligentCapsule()
      .then(capsule => {
        sendResponse({ success: true, capsule });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === "ping") {
    sendResponse({ alive: true, provider: detectProvider() });
    return false;
  }

  return false;
});

// Check for pending injection
chrome.storage.local.get('pendingContext', (data) => {
  if (data?.pendingContext) {
    const context = data.pendingContext;
    const currentProvider = detectProvider();
    const timeDiff = Date.now() - context.timestamp;

    if (context.targetAI === currentProvider && timeDiff < 120000) {
      const init = async () => {
        const provider = PROVIDERS[currentProvider];
        let attempts = 0;
        const maxAttempts = 40;

        showIndicator("Injecting context...");

        const pollInterval = setInterval(() => {
          attempts++;
          const inputElement = document.querySelector(provider.selectors.input);

          if (inputElement) {
            clearInterval(pollInterval);
            setTimeout(() => {
              injectText(inputElement, context.text);
              showIndicator(null);
              chrome.storage.local.remove('pendingContext');
              
              // Show success toast
              showToast("✅ Context injected! Press Enter to continue.", "success");
            }, 800);
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            showIndicator(null);
            navigator.clipboard.writeText(context.text);
            showToast("⚠️ Auto-inject failed. Context copied to clipboard.", "warning");
          }
        }, 500);
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 500);
      } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
      }
    } else if (timeDiff >= 120000) {
      chrome.storage.local.remove('pendingContext');
    }
  }
});

// Toast notification
function showToast(message, type = "success") {
  const existing = document.getElementById('capsule-hub-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'capsule-hub-toast';
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    background: type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    zIndex: '999999',
    opacity: '0',
    transform: 'translateY(-20px)',
    transition: 'all 0.4s ease'
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}
