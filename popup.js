// Popup logic for Capsule Hub
// 🔒 PRIVACY: All data is stored locally in your browser. Nothing is sent to external servers.
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const statusPill = document.getElementById("connection-status");
  const statusText = document.getElementById("status-text");

  const unsupportedView = document.getElementById("unsupported-view");
  const capturedView = document.getElementById("captured-view");

  const sourceBadge = document.getElementById("source-badge");
  const messageCountBadge = document.getElementById("message-count-badge");
  const messagesList = document.getElementById("messages-list");

  const selectAllBtn = document.getElementById("select-all-btn");
  const selectLastBtn = document.getElementById("select-last-btn");
  const addSummaryPromptCheckbox = document.getElementById("add-summary-prompt");
  const copyClipboardBtn = document.getElementById("copy-clipboard-btn");
  const clearSessionBtn = document.getElementById("clear-session-btn");
  const footerMessage = document.getElementById("footer-message");

  const manualText = document.getElementById("manual-text");
  const manualBridgeBtn = document.getElementById("manual-bridge-btn");

  // Context mode controls
  const modeFull = document.getElementById("mode-full");
  const modeSelective = document.getElementById("mode-selective");
  const modeSummary = document.getElementById("mode-summary");
  const tokenCountEl = document.getElementById("token-count");
  const tokenWarning = document.getElementById("token-warning");

  let extractedSession = null;
  let selectedMode = "full";

  // Initial connection check
  checkActiveTab();

  // Button Event Listeners
  selectAllBtn.addEventListener("click", () => {
    toggleAllCheckboxes(true);
    updateTokenCounter();
  });
  selectLastBtn.addEventListener("click", () => {
    selectOnlyLastTurn();
    updateTokenCounter();
  });
  copyClipboardBtn.addEventListener("click", copyContextToClipboard);
  clearSessionBtn.addEventListener("click", clearCurrentSession);
  manualBridgeBtn.addEventListener("click", handleManualBridge);

  // Add checkbox change listeners for token counter updates
  messagesList.addEventListener("change", (e) => {
    if (e.target.classList.contains("message-checkbox")) {
      updateTokenCounter();
    }
  });

  // Mode selection listeners
  modeFull.addEventListener("change", () => {
    selectedMode = "full";
    toggleAllCheckboxes(true);
    updateTokenCounter();
  });
  modeSelective.addEventListener("change", () => {
    selectedMode = "selective";
    updateTokenCounter();
  });
  modeSummary.addEventListener("change", () => {
    selectedMode = "summary";
    toggleAllCheckboxes(true);
    updateTokenCounter();
  });

  // Target Destination click handlers
  document.querySelectorAll(".target-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetBtn = e.currentTarget;
      const targetAI = targetBtn.dataset.target;
      const targetUrl = targetBtn.dataset.url;
      bridgeToTarget(targetAI, targetUrl);
    });
  });

  // Query the current active tab to detect context
  function checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        showStatus("No active tab", "idle");
        showUnsupportedView();
        return;
      }

      const activeTab = tabs[0];

      // Check if URL is supported
      const url = activeTab.url || "";
      if (!isSupportedUrl(url)) {
        loadSavedSessionOrShowWelcome();
        return;
      }

      // Try to communicate with content script on active tab
      chrome.tabs.sendMessage(activeTab.id, { action: "extractContext" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          console.log("[Capsule Hub] Content script not ready. Checking storage...");
          // Try injecting content script if not loaded
          chrome.scripting?.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          }).catch(() => {});
          loadSavedSessionOrShowWelcome();
          return;
        }

        if (response.success) {
          console.log("[Capsule Hub] Context extracted successfully");
          extractedSession = response;
          chrome.storage.local.set({ savedSession: response });
          displaySession(response);
          showStatus("Context captured!", "active");
        } else {
          console.log("[Capsule Hub] Extraction failed:", response.error);
          loadSavedSessionOrShowWelcome();
        }
      });
    });
  }

  // Check if URL matches any supported provider
  function isSupportedUrl(url) {
    const supported = [
      "chatgpt.com", "chat.openai.com", "claude.ai",
      "gemini.google.com", "chat.deepseek.com", "deepseek.com"
    ];
    return supported.some(domain => url.includes(domain));
  }

  // Load a previously saved session or show unsupported launchpad
  function loadSavedSessionOrShowWelcome() {
    chrome.storage.local.get("savedSession", (data) => {
      if (data && data.savedSession) {
        console.log("[Capsule Hub] Loaded saved session from storage");
        extractedSession = data.savedSession;
        displaySession(extractedSession);
        showStatus("Saved context", "active");
      } else {
        showUnsupportedView();
        showStatus("Ready", "idle");
      }
    });
  }

  // Show status inside header pill
  function showStatus(text, type) {
    statusText.innerText = text;
    statusPill.className = `status-pill status-${type}`;
  }

  // Render unsupported view
  function showUnsupportedView() {
    unsupportedView.classList.remove("hidden");
    capturedView.classList.add("hidden");
  }

  // Render captured session view
  function displaySession(session) {
    unsupportedView.classList.add("hidden");
    capturedView.classList.remove("hidden");

    // Configure source badge
    sourceBadge.innerText = session.providerName || "Unknown";
    sourceBadge.className = `source-badge source-${session.provider || 'manual'}`;

    // Configure counts
    const turnCount = session.messages.length;
    messageCountBadge.innerText = `${turnCount} message${turnCount === 1 ? '' : 's'}`;

    // Populate message list
    messagesList.innerHTML = "";
    session.messages.forEach((msg, idx) => {
      const item = document.createElement("div");
      item.className = "message-item";

      const roleText = msg.role === "user" ? "You" : "AI";
      const snippet = msg.text.substring(0, 180) + (msg.text.length > 180 ? "..." : "");

      const checkboxWrapper = document.createElement("div");
      checkboxWrapper.className = "message-checkbox-wrapper";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "message-checkbox";
      checkbox.dataset.idx = idx;
      checkbox.checked = true;
      checkboxWrapper.appendChild(checkbox);

      const body = document.createElement("div");
      body.className = "message-body";
      body.dataset.idx = idx;

      const meta = document.createElement("div");
      meta.className = "message-meta";
      const roleBadge = document.createElement("span");
      roleBadge.className = `role-badge role-${msg.role}`;
      roleBadge.textContent = roleText;
      meta.appendChild(roleBadge);

      const snippetEl = document.createElement("p");
      snippetEl.className = "message-snippet";
      snippetEl.textContent = snippet;

      body.appendChild(meta);
      body.appendChild(snippetEl);

      // Click body to toggle checkbox
      body.addEventListener("click", (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        updateTokenCounter();
      });

      item.appendChild(checkboxWrapper);
      item.appendChild(body);
      messagesList.appendChild(item);
    });

    // Reset mode to full
    selectedMode = "full";
    modeFull.checked = true;
    updateTokenCounter();
  }

  // Select/deselect all checkboxes
  function toggleAllCheckboxes(checked) {
    document.querySelectorAll(".message-checkbox").forEach(box => {
      box.checked = checked;
    });
  }

  // Select only the last conversation turn
  function selectOnlyLastTurn() {
    toggleAllCheckboxes(false);
    const checkboxes = Array.from(document.querySelectorAll(".message-checkbox"));
    if (checkboxes.length > 0) {
      let lastUserIdx = checkboxes.length - 1;
      for (let i = checkboxes.length - 1; i >= 0; i--) {
        const idx = parseInt(checkboxes[i].dataset.idx);
        const msg = extractedSession.messages[idx];
        if (msg.role === "user") {
          lastUserIdx = i;
          break;
        }
      }

      for (let i = lastUserIdx; i < checkboxes.length; i++) {
        checkboxes[i].checked = true;
      }
    }
  }

  // Estimate token count (roughly 4 characters per token)
  function estimateTokenCount() {
    if (!extractedSession || !extractedSession.messages) return 0;

    let totalChars = 0;

    if (selectedMode === "summary") {
      // Summary mode uses condensed text
      const summary = generateSummary();
      totalChars = summary.length;
    } else {
      const checkboxes = Array.from(document.querySelectorAll(".message-checkbox:checked"));
      checkboxes.forEach(box => {
        const idx = parseInt(box.dataset.idx);
        if (extractedSession.messages[idx]) {
          totalChars += extractedSession.messages[idx].text.length;
        }
      });
    }

    return Math.ceil(totalChars / 4);
  }

  // Update token counter and warning
  function updateTokenCounter() {
    const tokenCountEstimate = estimateTokenCount();
    tokenCountEl.innerText = `~${tokenCountEstimate.toLocaleString()} tokens`;

    if (tokenCountEstimate > 3000) {
      tokenWarning.classList.add("show");
    } else {
      tokenWarning.classList.remove("show");
    }
  }

  // Generate formatted context string
  function generateFormattedContext() {
    if (!extractedSession || !extractedSession.messages) return "";

    let contextBody = "";

    if (selectedMode === "summary") {
      contextBody = generateSummary();
    } else {
      const checkboxes = Array.from(document.querySelectorAll(".message-checkbox:checked"));
      if (checkboxes.length === 0) return "";

      checkboxes.sort((a, b) => parseInt(a.dataset.idx) - parseInt(b.dataset.idx));

      checkboxes.forEach(box => {
        const idx = parseInt(box.dataset.idx);
        const msg = extractedSession.messages[idx];
        if (!msg) return;
        const sender = msg.role === "user" ? "User" : "AI Assistant";
        contextBody += `\n[${sender}]:\n${msg.text}\n`;
      });
    }

    const includeHeader = addSummaryPromptCheckbox.checked;
    if (includeHeader) {
      const source = extractedSession.providerName || "an AI assistant";
      return `[CONTEXT TRANSFER FROM ${source.toUpperCase()}]\n` +
        `The following is a conversation captured from ${source} via Capsule Hub. ` +
        `Please read the entire context carefully and continue the conversation seamlessly. ` +
        `If the last message is from the user, respond to it. Otherwise, ask how you can help.\n` +
        `${'─'.repeat(50)}\n` +
        `${contextBody}` +
        `${'─'.repeat(50)}\n` +
        `[END OF CONTEXT - Please confirm understanding and respond appropriately]`;
    }

    return contextBody.trim();
  }

  // Generate a summary of the conversation
  function generateSummary() {
    if (!extractedSession || !extractedSession.messages) return "";

    const messages = extractedSession.messages;
    const summaryParts = [];

    // Extract the initial goal/query
    if (messages.length > 0) {
      const firstMsg = messages[0];
      const text = firstMsg.text.substring(0, 200);
      summaryParts.push(`📌 Initial Request: ${text}${firstMsg.text.length > 200 ? "..." : ""}`);
    }

    // Extract key user-assistant exchanges (condensed)
    let exchangeCount = 0;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user" && i + 1 < messages.length && messages[i + 1].role === "assistant") {
        exchangeCount++;
        if (exchangeCount <= 3 || i > messages.length - 4) {
          // Include first 3 and last 2 exchanges
          const userText = messages[i].text.substring(0, 100);
          const aiText = messages[i + 1].text.substring(0, 150);
          summaryParts.push(`\n💬 Exchange ${exchangeCount}:\nUser: ${userText}${messages[i].text.length > 100 ? "..." : ""}\nAI: ${aiText}${messages[i + 1].text.length > 150 ? "..." : ""}`);
        } else if (exchangeCount === 4) {
          summaryParts.push(`\n... (${messages.filter(m => m.role === "user").length - 5} more exchanges) ...`);
        }
      }
    }

    // Include the final state
    if (messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      const role = lastMsg.role === "user" ? "User" : "AI";
      const text = lastMsg.text.substring(0, 200);
      summaryParts.push(`\n🏁 Final Message (${role}): ${text}${lastMsg.text.length > 200 ? "..." : ""}`);
    }

    return `📋 CONVERSATION SUMMARY\n${'═'.repeat(40)}\n${summaryParts.join("\n")}\n${'═'.repeat(40)}`;
  }

  // Copy selected context to clipboard
  function copyContextToClipboard() {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("No messages selected to copy!", "error");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showFooterMessage("✅ Context copied to clipboard!", "success");
      chrome.runtime.sendMessage({ action: "updateBadge", text: "✓", color: "#06b6d4" });
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "updateBadge", text: "" });
      }, 2000);
    }).catch(err => {
      console.error("[Capsule Hub] Clipboard copy failed:", err);
      showFooterMessage("❌ Failed to copy. Try again.", "error");
    });
  }

  // Clear current active/saved session
  function clearCurrentSession() {
    extractedSession = null;
    chrome.storage.local.remove(["savedSession", "pendingContext"], () => {
      showUnsupportedView();
      showStatus("Cleared", "idle");
      showFooterMessage("🗑️ Session cleared successfully", "success");
      chrome.runtime.sendMessage({ action: "updateBadge", text: "" });
    });
  }

  // Handle manual context bridging
  function handleManualBridge() {
    const text = manualText.value.trim();
    if (!text) {
      showFooterMessage("Please enter some text first!", "error");
      return;
    }

    const manualResponse = {
      success: true,
      provider: "manual",
      providerName: "Manual Input",
      messages: [{ role: "user", text: text }],
      timestamp: Date.now()
    };

    extractedSession = manualResponse;
    chrome.storage.local.set({ savedSession: manualResponse });
    displaySession(manualResponse);
    showStatus("Manual context", "active");
    showFooterMessage("✅ Manual context loaded!", "success");
    manualText.value = "";
  }

  // Bridge the context into the target AI tool
  function bridgeToTarget(targetAI, url) {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("Please select at least one message!", "error");
      return;
    }

    showFooterMessage(`🚀 Bridging to ${targetAI}...`);

    // Save pending context with timestamp
    const pendingContext = {
      targetAI: targetAI,
      text: text,
      timestamp: Date.now()
    };

    chrome.storage.local.set({ pendingContext: pendingContext }, () => {
      // Request background to open a new tab
      chrome.runtime.sendMessage({
        action: "openTabAndInject",
        url: url,
        targetAI: targetAI
      }, (response) => {
        if (response && response.success) {
          showFooterMessage(`✅ Bridged! Injecting in ${targetAI}...`, "success");
          chrome.runtime.sendMessage({ action: "updateBadge", text: "→", color: "#8b5cf6" });

          setTimeout(() => {
            window.close();
          }, 1200);
        } else {
          showFooterMessage(`❌ Failed to launch. Copying to clipboard instead...`, "error");
          copyContextToClipboard();
        }
      });
    });
  }

  // Helper to show temporary messages in the footer
  function showFooterMessage(text, type = "info") {
    footerMessage.innerText = text;

    if (type === "error") {
      footerMessage.style.color = "#f87171";
    } else if (type === "success") {
      footerMessage.style.color = "#34d399";
    } else {
      footerMessage.style.color = "var(--text-secondary)";
    }

    setTimeout(() => {
      footerMessage.innerText = "🔒 100% local • No data leaves your browser";
      footerMessage.style.color = "var(--text-muted)";
    }, 4000);
  }

  // Set initial footer message
  footerMessage.innerText = "🔒 100% local • No data leaves your browser";
});
