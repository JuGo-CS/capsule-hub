// Capsule Hub - Popup Logic
// 🔒 All data stays local. Zero network calls.

document.addEventListener("DOMContentLoaded", () => {
  // ═══ State ═══════════════════════════════════════════════════════
  let session = null;
  let mode = "full";

  // ═══ DOM Elements ════════════════════════════════════════════════
  const $ = (id) => document.getElementById(id);

  const status = $("status");
  const statusText = $("status-text");
  const tabCapture = $("tab-capture");
  const tabLibrary = $("tab-library");
  const libraryCount = $("library-count");
  const captureView = $("capture-view");
  const libraryView = $("library-view");
  const emptyState = $("empty-state");
  const capturedState = $("captured-state");
  const sourceName = $("source-name");
  const messageCount = $("message-count");
  const messagesList = $("messages-list");
  const selectAllBtn = $("select-all");
  const selectLastBtn = $("select-last");
  const tokenCount = $("token-count");
  const tokenWarn = $("token-warn");
  const btnCopy = $("btn-copy");
  const btnSave = $("btn-save");
  const btnClear = $("btn-clear");
  const btnManual = $("btn-manual");
  const manualText = $("manual-text");
  const libraryList = $("library-list");
  const libraryEmpty = $("library-empty");

  // ═══ Initialization ══════════════════════════════════════════════
  init();

  function init() {
    bindEvents();
    checkActiveTab();
    loadLibrary();
  }

  // ═══ Event Binding ═══════════════════════════════════════════════
  function bindEvents() {
    // Tabs
    tabCapture.addEventListener("click", () => switchTab("capture"));
    tabLibrary.addEventListener("click", () => switchTab("library"));

    // Selection
    selectAllBtn.addEventListener("click", selectAll);
    selectLastBtn.addEventListener("click", selectLast);

    // Mode
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener("change", (e) => {
        mode = e.target.value;
        updateTokenCount();
      });
    });

    // Actions
    btnCopy.addEventListener("click", copyToClipboard);
    btnSave.addEventListener("click", saveCapsule);
    btnClear.addEventListener("click", clearSession);
    btnManual.addEventListener("click", loadManual);

    // Bridge buttons
    document.querySelectorAll(".bridge-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        bridgeTo(btn.dataset.target, btn.dataset.url);
      });
    });

    // Message selection
    messagesList.addEventListener("change", (e) => {
      if (e.target.classList.contains("message-checkbox")) {
        updateTokenCount();
      }
    });
  }

  // ═══ Tab Switching ═══════════════════════════════════════════════
  function switchTab(tab) {
    if (tab === "capture") {
      tabCapture.classList.add("active");
      tabLibrary.classList.remove("active");
      captureView.classList.remove("hidden");
      libraryView.classList.add("hidden");
    } else {
      tabLibrary.classList.add("active");
      tabCapture.classList.remove("active");
      captureView.classList.add("hidden");
      libraryView.classList.remove("hidden");
      loadLibrary();
    }
  }

  // ═══ Active Tab Check ════════════════════════════════════════════
  function checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) {
        showEmpty();
        return;
      }

      const tab = tabs[0];
      if (!isSupportedUrl(tab.url)) {
        loadSavedSession();
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "extractContext" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting?.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).catch(() => {});
          loadSavedSession();
          return;
        }

        if (response.success) {
          session = response;
          chrome.storage.local.set({ savedSession: response });
          renderSession();
          setStatus("Captured", true);
        } else {
          loadSavedSession();
        }
      });
    });
  }

  function isSupportedUrl(url) {
    return /chatgpt\.com|chat\.openai\.com|claude\.ai|gemini\.google\.com|deepseek\.com/.test(url);
  }

  function loadSavedSession() {
    chrome.storage.local.get("savedSession", (data) => {
      if (data?.savedSession) {
        session = data.savedSession;
        renderSession();
        setStatus("Loaded", true);
      } else {
        showEmpty();
      }
    });
  }

  // ═══ UI State ════════════════════════════════════════════════════
  function showEmpty() {
    emptyState.classList.remove("hidden");
    capturedState.classList.add("hidden");
    setStatus("Ready", false);
  }

  function setStatus(text, active) {
    statusText.textContent = text;
    status.classList.toggle("active", active);
  }

  // ═══ Render Session ══════════════════════════════════════════════
  function renderSession() {
    if (!session?.messages?.length) {
      showEmpty();
      return;
    }

    emptyState.classList.add("hidden");
    capturedState.classList.remove("hidden");

    sourceName.textContent = session.providerName || "AI";
    messageCount.textContent = `${session.messages.length} msgs`;

    renderMessages();
    updateTokenCount();
  }

  function renderMessages() {
    messagesList.innerHTML = "";

    session.messages.forEach((msg, idx) => {
      const item = document.createElement("div");
      item.className = "message-item";

      const hasCode = /```/.test(msg.text);
      const snippet = msg.text.substring(0, 80) + (msg.text.length > 80 ? "..." : "");

      item.innerHTML = `
        <input type="checkbox" class="message-checkbox" data-idx="${idx}" checked>
        <div class="message-body">
          <div class="message-meta">
            <span class="role-badge role-${msg.role}">${msg.role === "user" ? "You" : "AI"}</span>
            ${hasCode ? '<span class="code-badge">&lt;/&gt;</span>' : ''}
          </div>
          <div class="message-snippet">${escapeHtml(snippet)}</div>
        </div>
      `;

      messagesList.appendChild(item);
    });
  }

  // ═══ Selection ═══════════════════════════════════════════════════
  function selectAll() {
    document.querySelectorAll(".message-checkbox").forEach(cb => cb.checked = true);
    updateTokenCount();
  }

  function selectLast() {
    const checkboxes = Array.from(document.querySelectorAll(".message-checkbox"));
    checkboxes.forEach(cb => cb.checked = false);

    for (let i = checkboxes.length - 1; i >= 0; i--) {
      const idx = parseInt(checkboxes[i].dataset.idx);
      if (session.messages[idx]?.role === "user") {
        checkboxes[i].checked = true;
        break;
      }
    }
    updateTokenCount();
  }

  // ═══ Token Count ═════════════════════════════════════════════════
  function updateTokenCount() {
    const text = generateContext();
    const tokens = Math.ceil(text.length / 4);
    tokenCount.textContent = `~${tokens.toLocaleString()} tokens`;
    tokenWarn.classList.toggle("hidden", tokens <= 3000);
  }

  // ═══ Context Generation ══════════════════════════════════════════
  function generateContext() {
    if (!session?.messages) return "";

    let body = "";

    if (mode === "summary") {
      body = generateSummary();
    } else {
      const checked = Array.from(document.querySelectorAll(".message-checkbox:checked"))
        .sort((a, b) => parseInt(a.dataset.idx) - parseInt(b.dataset.idx));

      if (!checked.length) return "";

      checked.forEach(cb => {
        const msg = session.messages[parseInt(cb.dataset.idx)];
        if (msg) {
          const sender = msg.role === "user" ? "User" : "AI";
          body += `\n[${sender}]:\n${msg.text}\n`;
        }
      });
    }

    const header = `[CONTEXT FROM ${session.providerName?.toUpperCase() || "AI"}]\n\n` +
      `Continue this conversation seamlessly. Respond to the last user message.\n\n` +
      `${'─'.repeat(50)}\n`;

    const footer = `\n${'─'.repeat(50)}\n\n[END - Confirm understanding and respond]`;

    return header + body + footer;
  }

  function generateSummary() {
    if (!session?.messages) return "";

    const msgs = session.messages;
    const parts = [];

    // Goal
    const firstUser = msgs.find(m => m.role === "user");
    if (firstUser) {
      parts.push(`🎯 GOAL:\n${firstUser.text.substring(0, 200)}`);
    }

    // Code blocks
    const codeBlocks = [];
    msgs.forEach(msg => {
      const matches = msg.text.match(/```[\s\S]*?```/g);
      if (matches) codeBlocks.push(...matches);
    });

    if (codeBlocks.length) {
      parts.push(`\n💻 CODE (${codeBlocks.length} blocks):\n${codeBlocks.slice(0, 2).join("\n")}`);
    }

    // Key exchanges
    const exchanges = [];
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role === "user" && msgs[i + 1]?.role === "assistant") {
        exchanges.push({ user: msgs[i], ai: msgs[i + 1] });
      }
    }

    if (exchanges.length) {
      const shown = exchanges.slice(0, 2).concat(exchanges.slice(-1));
      parts.push(`\n💬 KEY EXCHANGES:\n` + shown.map(ex =>
        `• User: ${ex.user.text.substring(0, 80)}...\n  AI: ${ex.ai.text.substring(0, 100)}...`
      ).join("\n"));
    }

    // Current state
    const last = msgs[msgs.length - 1];
    if (last) {
      parts.push(`\n🏁 CURRENT:\n${last.text.substring(0, 200)}`);
    }

    return parts.join("\n");
  }

  // ═══ Actions ═════════════════════════════════════════════════════
  function copyToClipboard() {
    const text = generateContext();
    if (!text) {
      showToast("No messages selected", "error");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied to clipboard!", "success");
    });
  }

  function saveCapsule() {
    const text = generateContext();
    if (!text) {
      showToast("No messages selected", "error");
      return;
    }

    const firstUser = session.messages.find(m => m.role === "user");
    const title = firstUser?.text.substring(0, 40) || "Untitled";

    const capsule = {
      id: Date.now().toString(36),
      title,
      provider: session.providerName,
      text,
      messageCount: session.messages.length,
      tokens: Math.ceil(text.length / 4),
      timestamp: Date.now()
    };

    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      library.unshift(capsule);
      if (library.length > 50) library.length = 50;

      chrome.storage.local.set({ capsuleLibrary: library }, () => {
        showToast("Capsule saved!", "success");
        loadLibrary();
      });
    });
  }

  function clearSession() {
    session = null;
    chrome.storage.local.remove(["savedSession", "pendingContext"], () => {
      showEmpty();
      showToast("Cleared", "success");
    });
  }

  function loadManual() {
    const text = manualText.value.trim();
    if (!text) {
      showToast("Enter text first", "error");
      return;
    }

    session = {
      provider: "manual",
      providerName: "Manual",
      messages: [{ role: "user", text }],
      timestamp: Date.now()
    };

    chrome.storage.local.set({ savedSession: session });
    renderSession();
    setStatus("Loaded", true);
    showToast("Manual context loaded", "success");
    manualText.value = "";
  }

  // ═══ Bridge ══════════════════════════════════════════════════════
  function bridgeTo(target, url) {
    const text = generateContext();
    if (!text) {
      showToast("No messages selected", "error");
      return;
    }

    const pending = { targetAI: target, text, timestamp: Date.now() };

    chrome.storage.local.set({ pendingContext: pending }, () => {
      chrome.runtime.sendMessage({
        action: "openTabAndInject",
        url,
        targetAI: target
      }, (response) => {
        if (response?.success) {
          showToast(`Bridging to ${target}...`, "success");
          setTimeout(() => window.close(), 1000);
        } else {
          copyToClipboard();
        }
      });
    });
  }

  // ═══ Library ═════════════════════════════════════════════════════
  function loadLibrary() {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      libraryCount.textContent = library.length;

      if (!library.length) {
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
        item.dataset.idx = idx;

        const date = new Date(capsule.timestamp);
        const dateStr = date.toLocaleDateString();

        item.innerHTML = `
          <div class="library-item-header">
            <div class="library-item-title">${escapeHtml(capsule.title)}</div>
            <div class="library-item-provider">${escapeHtml(capsule.provider || "Manual")}</div>
          </div>
          <div class="library-item-meta">
            <span>${capsule.messageCount} msgs</span>
            <span>~${capsule.tokens?.toLocaleString() || "?"} tokens</span>
            <span>${dateStr}</span>
          </div>
          <div class="library-item-actions">
            <button class="lib-btn lib-btn-primary" data-action="use">Use</button>
            <button class="lib-btn" data-action="copy">Copy</button>
            <button class="lib-btn" data-action="delete">Delete</button>
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

            if (action === "use") {
              useCapsule(idx);
            } else if (action === "copy") {
              copyCapsule(idx);
            } else if (action === "delete") {
              deleteCapsule(idx);
            }
          });
        });

        libraryList.appendChild(item);
      });
    });
  }

  function useCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const capsule = data?.capsuleLibrary?.[idx];
      if (!capsule) return;

      session = {
        provider: capsule.provider?.toLowerCase(),
        providerName: capsule.provider,
        messages: [{ role: "user", text: capsule.text }],
        timestamp: capsule.timestamp
      };

      chrome.storage.local.set({ savedSession: session });
      renderSession();
      setStatus("Loaded", true);
      switchTab("capture");
      showToast("Capsule loaded", "success");
    });
  }

  function copyCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const capsule = data?.capsuleLibrary?.[idx];
      if (!capsule) return;

      navigator.clipboard.writeText(capsule.text).then(() => {
        showToast("Copied!", "success");
      });
    });
  }

  function deleteCapsule(idx) {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      const library = data?.capsuleLibrary || [];
      library.splice(idx, 1);

      chrome.storage.local.set({ capsuleLibrary: library }, () => {
        showToast("Deleted", "success");
        loadLibrary();
      });
    });
  }

  // ═══ Toast ═══════════════════════════════════════════════════════
  function showToast(message, type = "info") {
    // Simple toast using footer for now
    const footer = document.querySelector(".footer-text");
    const original = footer.textContent;
    footer.textContent = message;
    footer.style.color = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#94a3b8";

    setTimeout(() => {
      footer.textContent = original;
      footer.style.color = "";
    }, 3000);
  }

  // ═══ Utilities ═══════════════════════════════════════════════════
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
