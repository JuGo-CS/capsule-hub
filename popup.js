// Capsule Hub - Popup Controller (Privacy-First)

document.addEventListener("DOMContentLoaded", () => {
  // ═══════════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════════
  
  let extractedSession = null;
  let selectedMode = "full";

  // ═══════════════════════════════════════════════════════════════════
  // DOM Elements
  // ═══════════════════════════════════════════════════════════════════
  
  const $ = (id) => document.getElementById(id);
  
  const statusBadge = $("status-badge");
  const statusText = $("status-text");
  
  const captureView = $("capture-view");
  const libraryView = $("library-view");
  
  const emptyState = $("empty-state");
  const capturedState = $("captured-state");
  
  const sourceBadge = $("source-badge");
  const sourceCount = $("source-count");
  const messagesList = $("messages-list");
  
  const btnSelectAll = $("btn-select-all");
  const btnSelectLast = $("btn-select-last");
  const btnCopy = $("btn-copy");
  const btnSave = $("btn-save");
  const btnClear = $("btn-clear");
  const btnManual = $("btn-manual");
  const manualText = $("manual-text");
  
  const tokenCount = $("token-count");
  const tokenWarn = $("token-warn");
  
  const libraryList = $("library-list");
  const libraryEmpty = $("library-empty");
  const searchInput = $("search-input");

  // ═══════════════════════════════════════════════════════════════════
  // Event Listeners
  // ═══════════════════════════════════════════════════════════════════

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      captureView.classList.toggle('hidden', view !== 'capture');
      libraryView.classList.toggle('hidden', view !== 'library');
      
      if (view === 'library') loadCapsuleLibrary();
    });
  });

  // Mode selector
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', () => {
      const mode = option.dataset.mode;
      selectedMode = mode;
      option.querySelector('input').checked = true;
      
      document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      
      updateTokenCount();
    });
  });

  // Selection buttons
  btnSelectAll.addEventListener("click", selectAll);
  btnSelectLast.addEventListener("click", selectLastTurn);
  
  // Action buttons
  btnCopy.addEventListener("click", copyToClipboard);
  btnSave.addEventListener("click", saveCapsule);
  btnClear.addEventListener("click", clearSession);
  btnManual.addEventListener("click", handleManualBridge);
  
  // Bridge buttons
  document.querySelectorAll(".bridge-card").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const target = btn.dataset.target;
      const url = btn.dataset.url;
      bridgeToTarget(target, url);
    });
  });
  
  // Message checkbox changes
  messagesList.addEventListener("change", (e) => {
    if (e.target.classList.contains("message-checkbox")) {
      updateTokenCount();
    }
  });
  
  // Search
  searchInput.addEventListener("input", (e) => {
    filterLibrary(e.target.value);
  });

  // ═══════════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════════

  checkActiveTab();

  // ═══════════════════════════════════════════════════════════════════
  // Functions
  // ═══════════════════════════════════════════════════════════════════

  function checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) {
        showStatus("No active tab", false);
        showEmptyState();
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || "";
      
      if (!isSupportedUrl(url)) {
        loadSavedSession();
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: "extractContext" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting?.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          }).catch(() => {});
          loadSavedSession();
          return;
        }

        if (response.success) {
          extractedSession = response;
          chrome.storage.local.set({ savedSession: response });
          displaySession(response);
          showStatus("Captured", true);
        } else {
          loadSavedSession();
        }
      });
    });
  }

  function isSupportedUrl(url) {
    const supported = ["chatgpt.com", "claude.ai", "gemini.google.com", "chat.deepseek.com", "chat.openai.com"];
    return supported.some(domain => url.includes(domain));
  }

  function loadSavedSession() {
    chrome.storage.local.get("savedSession", (data) => {
      if (data?.savedSession) {
        extractedSession = data.savedSession;
        displaySession(extractedSession);
        showStatus("Loaded", true);
      } else {
        showEmptyState();
      }
    });
  }

  function showEmptyState() {
    emptyState.classList.remove("hidden");
    capturedState.classList.add("hidden");
    showStatus("Ready", false);
  }

  function showStatus(text, active) {
    statusText.textContent = text;
    statusBadge.classList.toggle("active", active);
  }

  function displaySession(session) {
    emptyState.classList.add("hidden");
    capturedState.classList.remove("hidden");

    sourceBadge.textContent = session.providerName || "AI";
    sourceCount.textContent = `${session.messages.length} messages`;

    renderMessages(session.messages);
    updateTokenCount();
  }

  function renderMessages(messages) {
    messagesList.innerHTML = "";
    
    messages.forEach((msg, idx) => {
      const item = document.createElement("div");
      item.className = "message-item";
      
      const roleText = msg.role === "user" ? "You" : "AI";
      const hasCode = /```/.test(msg.text);
      const snippet = msg.text.substring(0, 80) + (msg.text.length > 80 ? "..." : "");

      item.innerHTML = `
        <input type="checkbox" class="message-checkbox" data-idx="${idx}" checked>
        <div class="message-body">
          <div class="message-meta">
            <span class="role-badge role-${msg.role}">${roleText}</span>
            ${hasCode ? '<span class="code-badge">&lt;/&gt; code</span>' : ''}
          </div>
          <div class="message-snippet">${escapeHtml(snippet)}</div>
        </div>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("message-checkbox")) return;
        const checkbox = item.querySelector(".message-checkbox");
        checkbox.checked = !checkbox.checked;
        updateTokenCount();
      });

      messagesList.appendChild(item);
    });
  }

  function selectAll() {
    document.querySelectorAll(".message-checkbox").forEach(cb => {
      cb.checked = true;
    });
    updateTokenCount();
  }

  function selectLastTurn() {
    const checkboxes = Array.from(document.querySelectorAll(".message-checkbox"));
    checkboxes.forEach(cb => cb.checked = false);
    
    if (!checkboxes.length) return;
    
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
    
    updateTokenCount();
  }

  function updateTokenCount() {
    const text = generateFormattedContext();
    const count = Math.ceil(text.length / 4);
    tokenCount.textContent = `~${count.toLocaleString()} tokens`;
    tokenWarn.classList.toggle("hidden", count <= 3000);
  }

  function generateFormattedContext() {
    if (!extractedSession?.messages) return "";

    let contextBody = "";

    if (selectedMode === "summary") {
      contextBody = generateSummary();
    } else {
      const checkboxes = Array.from(document.querySelectorAll(".message-checkbox:checked"));
      if (!checkboxes.length) return "";

      checkboxes.sort((a, b) => parseInt(a.dataset.idx) - parseInt(b.dataset.idx));

      checkboxes.forEach(box => {
        const idx = parseInt(box.dataset.idx);
        const msg = extractedSession.messages[idx];
        if (!msg) return;
        const sender = msg.role === "user" ? "User" : "AI Assistant";
        contextBody += `\n[${sender}]:\n${msg.text}\n`;
      });
    }

    const source = extractedSession.providerName || "an AI assistant";
    return (
      `[CONTEXT TRANSFER FROM ${source.toUpperCase()}]\n\n` +
      `Continue this conversation seamlessly. The following is captured context:\n\n` +
      `${'─'.repeat(50)}\n` +
      `${contextBody}\n` +
      `${'─'.repeat(50)}\n\n` +
      `[END OF CONTEXT - Please confirm understanding and respond to the last user message.]`
    );
  }

  function generateSummary() {
    if (!extractedSession?.messages) return "";
    const messages = extractedSession.messages;
    const parts = [];

    parts.push(`📋 CAPSULE SUMMARY — from ${extractedSession.providerName || "AI"}\n${'═'.repeat(50)}`);

    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) {
      parts.push(`\n🎯 GOAL:\n${firstUserMsg.text.substring(0, 300)}${firstUserMsg.text.length > 300 ? "..." : ""}`);
    }

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
      const recentBlocks = allCodeBlocks.slice(-3);
      recentBlocks.forEach((block, i) => {
        const trimmed = block.code.length > 200 ? block.code.substring(0, 200) + "\n... (truncated)" : block.code;
        parts.push(`\n[Code Block ${i + 1} — from ${block.role}]:\n${trimmed}`);
      });
      if (allCodeBlocks.length > 3) {
        parts.push(`\n... and ${allCodeBlocks.length - 3} more code blocks`);
      }
    }

    const exchanges = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user" && i + 1 < messages.length && messages[i + 1].role === "assistant") {
        exchanges.push({ user: messages[i], assistant: messages[i + 1], idx: i });
      }
    }

    if (exchanges.length > 0) {
      parts.push(`\n💬 KEY EXCHANGES (${exchanges.length} total):`);
      const toShow = exchanges.slice(0, 2).concat(exchanges.slice(-2));
      const shown = new Set();
      toShow.forEach(ex => {
        if (shown.has(ex.idx)) return;
        shown.add(ex.idx);
        const userSnippet = ex.user.text.substring(0, 120);
        const aiSnippet = ex.assistant.text.substring(0, 180);
        parts.push(`\n• User: ${userSnippet}${ex.user.text.length > 120 ? "..." : ""}\n  AI: ${aiSnippet}${ex.assistant.text.length > 180 ? "..." : ""}`);
      });
    }

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const role = lastMsg.role === "user" ? "Pending user request" : "Last AI response";
      parts.push(`\n🏁 CURRENT STATE:\n[${role}]: ${lastMsg.text.substring(0, 300)}${lastMsg.text.length > 300 ? "..." : ""}`);
    }

    parts.push(`\n${'═'.repeat(50)}`);
    return parts.join("\n");
  }

  function copyToClipboard() {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("No messages selected!", "error");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showFooterMessage("✅ Copied to clipboard!", "success");
    }).catch(() => {
      showFooterMessage("❌ Failed to copy", "error");
    });
  }

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
      tokenEstimate: Math.ceil(text.length / 4)
    };

    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      library.unshift(capsule);
      if (library.length > 50) library.length = 50;

      chrome.storage.local.set({ capsuleLibrary: library }, () => {
        showFooterMessage(`💊 Capsule saved! (${library.length} in library)`, "success");
      });
    });
  }

  function generateCapsuleTitle() {
    if (!extractedSession?.messages?.length) return "Untitled Capsule";
    const firstUser = extractedSession.messages.find(m => m.role === "user");
    if (firstUser) {
      const title = firstUser.text.substring(0, 50).replace(/\n/g, ' ').trim();
      return title + (firstUser.text.length > 50 ? "..." : "");
    }
    return `Capsule from ${extractedSession.providerName}`;
  }

  function loadCapsuleLibrary() {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      
      if (library.length === 0) {
        libraryList.innerHTML = "";
        libraryEmpty.classList.remove("hidden");
        return;
      }

      libraryEmpty.classList.add("hidden");
      libraryList.innerHTML = "";

      library.forEach((capsule, idx) => {
        const item = document.createElement("div");
        item.className = "library-item";
        item.draggable = true;

        const date = new Date(capsule.timestamp);
        const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        item.innerHTML = `
          <div class="library-item-header">
            <span class="library-item-title">${escapeHtml(capsule.title)}</span>
            <span class="library-item-provider">${escapeHtml(capsule.provider || "Manual")}</span>
          </div>
          <div class="library-item-meta">
            <span>${capsule.messageCount} msgs</span>
            <span>~${capsule.tokenEstimate?.toLocaleString() || '?'} tokens</span>
            <span>${dateStr}</span>
          </div>
          <div class="library-item-actions">
            <button class="lib-btn lib-btn-primary" data-idx="${idx}" data-action="use">Use</button>
            <button class="lib-btn" data-idx="${idx}" data-action="copy">Copy</button>
            <button class="lib-btn" data-idx="${idx}" data-action="delete">Delete</button>
          </div>
        `;

        // Drag and drop
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", capsule.text);
          e.dataTransfer.effectAllowed = "copy";
          item.style.opacity = "0.5";
        });

        item.addEventListener("dragend", () => {
          item.style.opacity = "1";
        });

        // Button actions
        item.querySelectorAll(".lib-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const idx = parseInt(btn.dataset.idx);

            if (action === "use") useCapsule(idx);
            else if (action === "copy") copyCapsule(idx);
            else if (action === "delete") deleteCapsule(idx);
          });
        });

        libraryList.appendChild(item);
      });
    });
  }

  function filterLibrary(query) {
    const items = libraryList.querySelectorAll(".library-item");
    query = query.toLowerCase();
    
    items.forEach(item => {
      const title = item.querySelector(".library-item-title").textContent.toLowerCase();
      const provider = item.querySelector(".library-item-provider").textContent.toLowerCase();
      const match = title.includes(query) || provider.includes(query);
      item.style.display = match ? "" : "none";
    });
  }

  function useCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const capsule = data?.capsuleLibrary?.[idx];
      if (!capsule) return;

      extractedSession = {
        provider: capsule.provider?.toLowerCase() || "manual",
        providerName: capsule.provider || "Saved Capsule",
        messages: [{ role: "user", text: capsule.text }],
        timestamp: capsule.timestamp
      };
      
      chrome.storage.local.set({ savedSession: extractedSession });
      displaySession(extractedSession);
      showStatus("Loaded", true);
      
      document.querySelector('.tab[data-tab="capture"]').click();
      showFooterMessage("💊 Capsule loaded!", "success");
    });
  }

  function copyCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const capsule = data?.capsuleLibrary?.[idx];
      if (!capsule) return;
      
      navigator.clipboard.writeText(capsule.text).then(() => {
        showFooterMessage("📋 Copied to clipboard!", "success");
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

  function clearSession() {
    extractedSession = null;
    chrome.storage.local.remove(["savedSession", "pendingContext"], () => {
      showEmptyState();
      showFooterMessage("🗑️ Session cleared", "success");
    });
  }

  function handleManualBridge() {
    const text = manualText.value.trim();
    if (!text) {
      showToast("Enter text first", "error");
      return;
    }

    session = {
      provider: "manual",
      providerName: "Manual Input",
      messages: [{ role: "user", text: text }],
      timestamp: Date.now()
    };

    extractedSession = manualResponse;
    chrome.storage.local.set({ savedSession: manualResponse });
    displaySession(manualResponse);
    showStatus("Loaded", true);
    showFooterMessage("✅ Manual context loaded!", "success");
    manualText.value = "";
  }

  function bridgeToTarget(targetAI, url) {
    const text = generateFormattedContext();
    if (!text) {
      showFooterMessage("Please select at least one message!", "error");
      return;
    }

    showFooterMessage(`🚀 Bridging to ${targetAI}...`, "info");

    const pendingContext = { targetAI, text, timestamp: Date.now() };

    chrome.storage.local.set({ pendingContext }, () => {
      chrome.runtime.sendMessage({
        action: "openTabAndInject",
        url,
        targetAI
      }, (response) => {
        if (response?.success) {
          showFooterMessage(`✅ Injecting in ${targetAI}...`, "success");
          setTimeout(() => window.close(), 1200);
        } else {
          showFooterMessage("❌ Failed. Copying to clipboard...", "error");
          copyToClipboard();
        }
      });
    });
  }

  function showFooterMessage(text, type = "info") {
    const footer = document.querySelector(".footer-text");
    const original = footer.textContent;
    footer.textContent = text;
    
    if (type === "error") footer.style.color = "#f87171";
    else if (type === "success") footer.style.color = "#34d399";
    else footer.style.color = "";

    setTimeout(() => {
      footer.textContent = original;
      footer.style.color = "";
    }, 3000);
  }

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
