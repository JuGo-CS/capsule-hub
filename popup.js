// Popup logic for Capsule Hub
// 🔒 PRIVACY: All data is stored locally in your browser. Nothing is sent to external servers.
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const statusPill = document.getElementById("connection-status");
  const statusText = document.getElementById("status-text");

  const unsupportedView = document.getElementById("unsupported-view");
  const capturedView = document.getElementById("captured-view");
  const libraryView = document.getElementById("library-view");

  const sourceBadge = document.getElementById("source-badge");
  const messageCountBadge = document.getElementById("message-count-badge");
  const messagesList = document.getElementById("messages-list");

  const selectAllBtn = document.getElementById("select-all-btn");
  const selectLastBtn = document.getElementById("select-last-btn");
  const addSummaryPromptCheckbox = document.getElementById("add-summary-prompt");
  const copyClipboardBtn = document.getElementById("copy-clipboard-btn");
  const clearSessionBtn = document.getElementById("clear-session-btn");
  const saveCapsuleBtn = document.getElementById("save-capsule-btn");
  const exportCapsuleBtn = document.getElementById("export-capsule-btn");
  const footerMessage = document.getElementById("footer-message");

  const manualText = document.getElementById("manual-text");
  const manualBridgeBtn = document.getElementById("manual-bridge-btn");

  // Tab navigation
  const tabCapture = document.getElementById("tab-capture");
  const tabLibrary = document.getElementById("tab-library");
  const libraryList = document.getElementById("library-list");
  const libraryCount = document.getElementById("library-count");

  // Context mode controls
  const modeFull = document.getElementById("mode-full");
  const modeSelective = document.getElementById("mode-selective");
  const modeSummary = document.getElementById("mode-summary");
  const tokenCountEl = document.getElementById("token-count");
  const tokenWarning = document.getElementById("token-warning");

  let extractedSession = null;
  let selectedMode = "full";

  // Initial setup
  checkActiveTab();
  loadCapsuleLibrary();

  // Tab navigation
  tabCapture.addEventListener("click", () => switchTab("capture"));
  tabLibrary.addEventListener("click", () => switchTab("library"));

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
  if (saveCapsuleBtn) saveCapsuleBtn.addEventListener("click", saveCapsule);
  if (exportCapsuleBtn) exportCapsuleBtn.addEventListener("click", exportCapsule);

  // Checkbox change listeners for token counter
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
      bridgeToTarget(targetBtn.dataset.target, targetBtn.dataset.url);
    });
  });

  // ─── Tab Navigation ───────────────────────────────────────────────
  function switchTab(tab) {
    if (tab === "capture") {
      tabCapture.classList.add("active");
      tabLibrary.classList.remove("active");
      libraryView.classList.add("hidden");
      if (extractedSession) {
        capturedView.classList.remove("hidden");
        unsupportedView.classList.add("hidden");
      } else {
        unsupportedView.classList.remove("hidden");
        capturedView.classList.add("hidden");
      }
    } else {
      tabLibrary.classList.add("active");
      tabCapture.classList.remove("active");
      unsupportedView.classList.add("hidden");
      capturedView.classList.add("hidden");
      libraryView.classList.remove("hidden");
      loadCapsuleLibrary();
    }
  }

  // ─── Active Tab Check ─────────────────────────────────────────────
  function checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        showStatus("No active tab", "idle");
        showUnsupportedView();
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || "";
      if (!isSupportedUrl(url)) {
        loadSavedSessionOrShowWelcome();
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: "extractContext" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting?.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          }).catch(() => {});
          loadSavedSessionOrShowWelcome();
          return;
        }

        if (response.success) {
          extractedSession = response;
          chrome.storage.local.set({ savedSession: response });
          displaySession(response);
          showStatus("Context captured!", "active");
        } else {
          loadSavedSessionOrShowWelcome();
        }
      });
    });
  }

  function isSupportedUrl(url) {
    const supported = [
      "chatgpt.com", "chat.openai.com", "claude.ai",
      "gemini.google.com", "chat.deepseek.com", "deepseek.com"
    ];
    return supported.some(domain => url.includes(domain));
  }

  function loadSavedSessionOrShowWelcome() {
    chrome.storage.local.get("savedSession", (data) => {
      if (data && data.savedSession) {
        extractedSession = data.savedSession;
        displaySession(extractedSession);
        showStatus("Saved context", "active");
      } else {
        showUnsupportedView();
        showStatus("Ready", "idle");
      }
    });
  }

  // ─── Display Helpers ──────────────────────────────────────────────
  function showStatus(text, type) {
    statusText.innerText = text;
    statusPill.className = `status-pill status-${type}`;
  }

  function showUnsupportedView() {
    unsupportedView.classList.remove("hidden");
    capturedView.classList.add("hidden");
    libraryView.classList.add("hidden");
  }

  function displaySession(session) {
    unsupportedView.classList.add("hidden");
    capturedView.classList.remove("hidden");
    libraryView.classList.add("hidden");

    sourceBadge.innerText = session.providerName || "Unknown";
    sourceBadge.className = `source-badge source-${session.provider || 'manual'}`;

    const turnCount = session.messages.length;
    messageCountBadge.innerText = `${turnCount} message${turnCount === 1 ? '' : 's'}`;

    messagesList.innerHTML = "";
    session.messages.forEach((msg, idx) => {
      const item = document.createElement("div");
      item.className = "message-item";

      const roleText = msg.role === "user" ? "You" : "AI";
      // Show code block indicator if message contains code
      const hasCode = /```/.test(msg.text);
      const snippet = msg.text.substring(0, 160) + (msg.text.length > 160 ? "..." : "");

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

      if (hasCode) {
        const codeBadge = document.createElement("span");
        codeBadge.className = "code-badge";
        codeBadge.textContent = "</>";
        codeBadge.title = "Contains code";
        meta.appendChild(codeBadge);
      }

      const snippetEl = document.createElement("p");
      snippetEl.className = "message-snippet";
      snippetEl.textContent = snippet;

      body.appendChild(meta);
      body.appendChild(snippetEl);

      body.addEventListener("click", (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        updateTokenCounter();
      });

      item.appendChild(checkboxWrapper);
      item.appendChild(body);
      messagesList.appendChild(item);
    });

    selectedMode = "full";
    modeFull.checked = true;
    updateTokenCounter();
  }

  // ─── Selection Helpers ────────────────────────────────────────────
  function toggleAllCheckboxes(checked) {
    document.querySelectorAll(".message-checkbox").forEach(box => {
      box.checked = checked;
    });
  }

  function selectOnlyLastTurn() {
    toggleAllCheckboxes(false);
    const checkboxes = Array.from(document.querySelectorAll(".message-checkbox"));
    if (checkboxes.length > 0) {
      let lastUserIdx = checkboxes.length - 1;
      for (let i = checkboxes.length - 1; i >= 0; i--) {
        const idx = parseInt(checkboxes[i].dataset.idx);
        if (extractedSession.messages[idx]?.role === "user") {
          lastUserIdx = i;
          break;
        }
      }
      for (let i = lastUserIdx; i < checkboxes.length; i++) {
        checkboxes[i].checked = true;
      }
    }
  }

  // ─── Token Estimation ─────────────────────────────────────────────
  function estimateTokenCount() {
    if (!extractedSession?.messages) return 0;
    let totalChars = 0;

    if (selectedMode === "summary") {
      totalChars = generateSmartSummary().length;
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

  function updateTokenCounter() {
    const count = estimateTokenCount();
    tokenCountEl.innerText = `~${count.toLocaleString()} tokens`;
    tokenWarning.classList.toggle("show", count > 3000);
  }

  // ─── Context Generation (The Core Wrapping Logic) ─────────────────
  function generateFormattedContext() {
    if (!extractedSession?.messages) return "";

    let contextBody = "";

    if (selectedMode === "summary") {
      contextBody = generateSmartSummary();
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

    if (addSummaryPromptCheckbox.checked) {
      const source = extractedSession.providerName || "an AI assistant";
      return (
        `[CONTEXT TRANSFER FROM ${source.toUpperCase()}]\n\n` +
        `The following is a conversation captured from ${source}. ` +
        `Please read the entire context carefully and continue the conversation seamlessly. ` +
        `If the last message is from the user, respond to it. Otherwise, ask how you can help next.\n\n` +
        `${'─'.repeat(50)}\n` +
        `${contextBody}\n` +
        `${'─'.repeat(50)}\n\n` +
        `[END OF CONTEXT — Please confirm understanding and respond to the last user message or ask how you can help.]`
      );
    }

    return contextBody.trim();
  }

  // ─── Smart Summary Generator (No external AI needed) ──────────────
  // This analyzes the conversation structure locally to extract:
  // - Goal (first user message)
  // - Key decisions and exchanges
  // - Code blocks preserved
  // - Current state (last messages)
  function generateSmartSummary() {
    if (!extractedSession?.messages) return "";
    const messages = extractedSession.messages;
    const parts = [];

    parts.push(`📋 CAPSULE SUMMARY — from ${extractedSession.providerName || "AI"}\n${'═'.repeat(50)}`);

    // 1. Extract Goal (first user message)
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) {
      parts.push(`\n🎯 GOAL:\n${firstUserMsg.text.substring(0, 300)}${firstUserMsg.text.length > 300 ? "..." : ""}`);
    }

    // 2. Extract Code Blocks (critical for coding sessions)
    const allCodeBlocks = [];
    messages.forEach((msg, i) => {
      const codeMatches = msg.text.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        codeMatches.forEach(block => {
          allCodeBlocks.push({ index: i, role: msg.role, code: block });
        });
      }
    });

    if (allCodeBlocks.length > 0) {
      parts.push(`\n💻 CODE BLOCKS (${allCodeBlocks.length} found):`);
      // Show up to 3 most recent code blocks
      const recentBlocks = allCodeBlocks.slice(-3);
      recentBlocks.forEach((block, i) => {
        const trimmed = block.code.length > 200 ? block.code.substring(0, 200) + "\n... (truncated)" : block.code;
        parts.push(`\n[Code Block ${i + 1} — from ${block.role}]:\n${trimmed}`);
      });
      if (allCodeBlocks.length > 3) {
        parts.push(`\n... and ${allCodeBlocks.length - 3} more code blocks (use Full Context to see all)`);
      }
    }

    // 3. Key Exchanges (first 2 + last 2 user→assistant pairs)
    const exchanges = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user" && i + 1 < messages.length && messages[i + 1].role === "assistant") {
        exchanges.push({ user: messages[i], assistant: messages[i + 1], idx: i });
      }
    }

    if (exchanges.length > 0) {
      parts.push(`\n💬 KEY EXCHANGES (${exchanges.length} total):`);

      const toShow = [];
      // Always show first 2
      toShow.push(...exchanges.slice(0, 2));
      // Show last 2 if not already included
      if (exchanges.length > 4) {
        toShow.push(...exchanges.slice(-2));
      } else if (exchanges.length > 2) {
        toShow.push(exchanges[exchanges.length - 1]);
      }

      // Deduplicate
      const shown = new Set();
      toShow.forEach(ex => {
        if (shown.has(ex.idx)) return;
        shown.add(ex.idx);
        const userSnippet = ex.user.text.substring(0, 120);
        const aiSnippet = ex.assistant.text.substring(0, 180);
        parts.push(`\n• User: ${userSnippet}${ex.user.text.length > 120 ? "..." : ""}\n  AI: ${aiSnippet}${ex.assistant.text.length > 180 ? "..." : ""}`);
      });

      if (exchanges.length > 4) {
        parts.push(`\n  ... ${exchanges.length - 4} exchanges omitted (use Full Context for complete history)`);
      }
    }

    // 4. Current State (last message)
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const role = lastMsg.role === "user" ? "Pending user request" : "Last AI response";
      parts.push(`\n🏁 CURRENT STATE:\n[${role}]: ${lastMsg.text.substring(0, 300)}${lastMsg.text.length > 300 ? "..." : ""}`);
    }

    // 5. Progress indicator
    const userCount = messages.filter(m => m.role === "user").length;
    const aiCount = messages.filter(m => m.role === "assistant").length;
    parts.push(`\n📊 STATS: ${userCount} user messages, ${aiCount} AI responses, ${allCodeBlocks.length} code blocks`);

    parts.push(`\n${'═'.repeat(50)}`);
    return parts.join("\n");
  }

  // ─── Capsule Library (Save/Load/Export) ───────────────────────────
  function saveCapsule() {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("No messages selected!", "error");
      return;
    }

    const capsule = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title: generateCapsuleTitle(),
      provider: extractedSession.providerName || "Manual",
      mode: selectedMode,
      text: text,
      messageCount: extractedSession.messages.length,
      timestamp: Date.now(),
      tokenEstimate: estimateTokenCount()
    };

    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      library.unshift(capsule); // Add to front (newest first)

      // Keep max 50 capsules to stay within storage limits
      if (library.length > 50) library.length = 50;

      chrome.storage.local.set({ capsuleLibrary: library }, () => {
        showFooterMessage(`💊 Capsule saved! (${library.length} in library)`, "success");
        loadCapsuleLibrary();
      });
    });
  }

  function generateCapsuleTitle() {
    if (!extractedSession?.messages?.length) return "Untitled Capsule";
    const firstUser = extractedSession.messages.find(m => m.role === "user");
    if (firstUser) {
      // Take first 50 chars of the user's first message as title
      const title = firstUser.text.substring(0, 50).replace(/\n/g, ' ').trim();
      return title + (firstUser.text.length > 50 ? "..." : "");
    }
    return `Capsule from ${extractedSession.providerName}`;
  }

  function loadCapsuleLibrary() {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      libraryCount.innerText = `${library.length} saved`;

      libraryList.innerHTML = "";
      if (library.length === 0) {
        libraryList.innerHTML = `
          <div class="library-empty">
            <div class="empty-icon">💊</div>
            <p>No saved capsules yet.</p>
            <p class="empty-hint">Capture context from an AI chat and click "Save Capsule" to start building your library.</p>
          </div>`;
        return;
      }

      library.forEach((capsule, idx) => {
        const item = document.createElement("div");
        item.className = "library-item";

        const date = new Date(capsule.timestamp);
        const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        item.innerHTML = `
          <div class="library-item-header">
            <span class="library-item-title">${escapeHTML(capsule.title)}</span>
            <span class="library-item-provider source-${capsule.provider?.toLowerCase() || 'manual'}">${escapeHTML(capsule.provider || "Manual")}</span>
          </div>
          <div class="library-item-meta">
            <span>${capsule.messageCount} msgs</span>
            <span>~${capsule.tokenEstimate?.toLocaleString() || '?'} tokens</span>
            <span>${dateStr}</span>
          </div>
          <div class="library-item-actions">
            <button class="lib-btn lib-use-btn" data-idx="${idx}">Use</button>
            <button class="lib-btn lib-copy-btn" data-idx="${idx}">Copy</button>
            <button class="lib-btn lib-delete-btn" data-idx="${idx}">Delete</button>
          </div>
        `;

        libraryList.appendChild(item);
      });

      // Attach event listeners
      libraryList.querySelectorAll(".lib-use-btn").forEach(btn => {
        btn.addEventListener("click", () => useCapsule(parseInt(btn.dataset.idx)));
      });
      libraryList.querySelectorAll(".lib-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => copyCapsule(parseInt(btn.dataset.idx)));
      });
      libraryList.querySelectorAll(".lib-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteCapsule(parseInt(btn.dataset.idx)));
      });
    });
  }

  function useCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const capsule = data?.capsuleLibrary?.[idx];
      if (!capsule) return;

      // Show a provider picker by switching to capture view with the capsule loaded
      extractedSession = {
        provider: capsule.provider?.toLowerCase() || "manual",
        providerName: capsule.provider || "Saved Capsule",
        messages: [{ role: "user", text: capsule.text }],
        timestamp: capsule.timestamp
      };
      chrome.storage.local.set({ savedSession: extractedSession });
      displaySession(extractedSession);
      showStatus("Capsule loaded", "active");
      switchTab("capture");
      showFooterMessage("💊 Capsule loaded! Choose a destination to bridge.", "success");
    });
  }

  function copyCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const capsule = data?.capsuleLibrary?.[idx];
      if (!capsule) return;
      navigator.clipboard.writeText(capsule.text).then(() => {
        showFooterMessage("📋 Capsule copied to clipboard!", "success");
      });
    });
  }

  function deleteCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      library.splice(idx, 1);
      chrome.storage.local.set({ capsuleLibrary: library }, () => {
        showFooterMessage("🗑️ Capsule deleted", "success");
        loadCapsuleLibrary();
      });
    });
  }

  function exportCapsule() {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("No messages selected!", "error");
      return;
    }

    const title = generateCapsuleTitle().replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 40) || "capsule";
    const filename = `capsule-hub-${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`;

    const header = `---\ntitle: "${title}"\nsource: ${extractedSession.providerName || "Unknown"}\nmode: ${selectedMode}\ndate: ${new Date().toISOString()}\ntokens: ~${estimateTokenCount()}\ngenerated_by: Capsule Hub (100% local, privacy-first)\n---\n\n`;

    const blob = new Blob([header + text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showFooterMessage(`📥 Exported as ${filename}`, "success");
  }

  // ─── Clipboard ────────────────────────────────────────────────────
  function copyContextToClipboard() {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("No messages selected!", "error");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showFooterMessage("✅ Context copied to clipboard!", "success");
      chrome.runtime.sendMessage({ action: "updateBadge", text: "✓", color: "#06b6d4" });
      setTimeout(() => chrome.runtime.sendMessage({ action: "updateBadge", text: "" }), 2000);
    }).catch(err => {
      showFooterMessage("❌ Failed to copy.", "error");
    });
  }

  // ─── Session Management ───────────────────────────────────────────
  function clearCurrentSession() {
    extractedSession = null;
    chrome.storage.local.remove(["savedSession", "pendingContext"], () => {
      showUnsupportedView();
      showStatus("Cleared", "idle");
      showFooterMessage("🗑️ Session cleared", "success");
      chrome.runtime.sendMessage({ action: "updateBadge", text: "" });
    });
  }

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

  function bridgeToTarget(targetAI, url) {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("Please select at least one message!", "error");
      return;
    }

    showFooterMessage(`🚀 Bridging to ${targetAI}...`);

    const pendingContext = { targetAI, text, timestamp: Date.now() };

    chrome.storage.local.set({ pendingContext }, () => {
      chrome.runtime.sendMessage({
        action: "openTabAndInject",
        url,
        targetAI
      }, (response) => {
        if (response?.success) {
          showFooterMessage(`✅ Injecting in ${targetAI}...`, "success");
          chrome.runtime.sendMessage({ action: "updateBadge", text: "→", color: "#8b5cf6" });
          setTimeout(() => window.close(), 1200);
        } else {
          showFooterMessage("❌ Failed. Copying to clipboard...", "error");
          copyContextToClipboard();
        }
      });
    });
  }

  // ─── Footer Messages ──────────────────────────────────────────────
  function showFooterMessage(text, type = "info") {
    footerMessage.innerText = text;
    if (type === "error") footerMessage.style.color = "#f87171";
    else if (type === "success") footerMessage.style.color = "#34d399";
    else footerMessage.style.color = "var(--text-secondary)";

    setTimeout(() => {
      footerMessage.innerText = "🔒 100% local • No data leaves your browser";
      footerMessage.style.color = "var(--text-muted)";
    }, 4000);
  }

  // ─── Utility ──────────────────────────────────────────────────────
  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Set initial footer message
  footerMessage.innerText = "🔒 100% local • No data leaves your browser";
});
