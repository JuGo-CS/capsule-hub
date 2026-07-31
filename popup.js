// Capsule Hub - Popup Controller
// Clean, minimal interface for context compression

document.addEventListener("DOMContentLoaded", () => {
  // State
  let currentSession = null;
  let allCapsules = [];

  // DOM Elements
  const $ = (id) => document.getElementById(id);
  
  const statusSection = $("status-section");
  const statusText = $("status-text");
  const btnSaveCapsule = $("btn-save-capsule");
  const btnCopyContext = $("btn-copy-context");
  const capsuleList = $("capsule-list");
  const emptyState = $("empty-state");
  const libraryCount = $("library-count");
  const searchInput = $("search-input");
  const btnManual = $("btn-manual");
  const manualText = $("manual-text");
  const toast = $("toast");

  // Initialize
  init();

  function init() {
    detectConversation();
    loadCapsuleLibrary();
    bindEvents();
  }

  function bindEvents() {
    btnSaveCapsule.addEventListener("click", saveCapsule);
    btnCopyContext.addEventListener("click", copyContext);
    btnManual.addEventListener("click", handleManualEntry);
    searchInput.addEventListener("input", (e) => filterCapsules(e.target.value));
  }

  // Detect conversation from active tab
  function detectConversation() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) {
        setStatus("No active tab", "error");
        disableActions();
        return;
      }

      const tab = tabs[0];
      
      if (!isSupportedUrl(tab.url)) {
        setStatus("Open ChatGPT, Claude, Gemini, or DeepSeek", "error");
        disableActions();
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "extractContext" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Try injecting content script
          chrome.scripting?.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).then(() => {
            // Retry after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "extractContext" }, (response) => {
                handleExtractionResponse(response);
              });
            }, 500);
          }).catch(() => {
            setStatus("Failed to detect conversation", "error");
            disableActions();
          });
          return;
        }

        handleExtractionResponse(response);
      });
    });
  }

  function handleExtractionResponse(response) {
    if (response?.success && response.messages?.length > 0) {
      currentSession = response;
      const msgCount = response.messages.length;
      setStatus(`Detected ${msgCount} messages from ${response.providerName}`, "active");
      enableActions();
    } else {
      setStatus("No conversation found. Start chatting first!", "error");
      disableActions();
    }
  }

  function isSupportedUrl(url) {
    if (!url) return false;
    const supported = [
      "chatgpt.com", "chat.openai.com",
      "claude.ai",
      "gemini.google.com",
      "chat.deepseek.com", "deepseek.com"
    ];
    return supported.some(domain => url.includes(domain));
  }

  function setStatus(text, state = "") {
    statusText.textContent = text;
    statusSection.className = `status-section ${state}`;
  }

  function enableActions() {
    btnSaveCapsule.disabled = false;
    btnCopyContext.disabled = false;
  }

  function disableActions() {
    btnSaveCapsule.disabled = true;
    btnCopyContext.disabled = true;
  }

  // Save Capsule
  function saveCapsule() {
    if (!currentSession?.messages) {
      showToast("No conversation to save", "error");
      return;
    }

    try {
      // Create intelligent capsule
      const capsule = createCapsule(currentSession.messages, currentSession.providerName);
      
      if (!capsule) {
        showToast("Failed to create capsule", "error");
        return;
      }

      // Save to storage
      chrome.storage.local.get("capsuleLibrary", (data) => {
        const library = data?.capsuleLibrary || [];
        
        const capsuleData = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: capsule.name,
          text: capsule.text,
          metadata: capsule.metadata,
          timestamp: Date.now()
        };

        library.unshift(capsuleData);
        
        // Keep max 50 capsules
        if (library.length > 50) library.length = 50;

        chrome.storage.local.set({ capsuleLibrary: library }, () => {
          showToast(`💊 Capsule saved: ${capsule.name}`, "success");
          loadCapsuleLibrary();
        });
      });
    } catch (error) {
      console.error("[Capsule Hub] Save error:", error);
      showToast("Failed to save capsule", "error");
    }
  }

  // Copy Context
  function copyContext() {
    if (!currentSession?.messages) {
      showToast("No conversation to copy", "error");
      return;
    }

    try {
      const capsule = createCapsule(currentSession.messages, currentSession.providerName);
      
      if (!capsule) {
        showToast("Failed to create context", "error");
        return;
      }

      navigator.clipboard.writeText(capsule.text).then(() => {
        showToast("✅ Context copied to clipboard", "success");
      }).catch(() => {
        showToast("Failed to copy", "error");
      });
    } catch (error) {
      console.error("[Capsule Hub] Copy error:", error);
      showToast("Failed to copy context", "error");
    }
  }

  // Manual Entry
  function handleManualEntry() {
    const text = manualText.value.trim();
    if (!text) {
      showToast("Enter some text first", "error");
      return;
    }

    currentSession = {
      providerName: "Manual Input",
      messages: [{ role: "user", text: text }]
    };

    setStatus("Manual context loaded", "active");
    enableActions();
    showToast("✅ Manual context loaded", "success");
    manualText.value = "";
  }

  // Load Capsule Library
  function loadCapsuleLibrary() {
    chrome.storage.local.get("capsuleLibrary", (data) => {
      allCapsules = data?.capsuleLibrary || [];
      renderCapsules(allCapsules);
    });
  }

  // Render Capsules
  function renderCapsules(capsules) {
    libraryCount.textContent = `${capsules.length} capsule${capsules.length !== 1 ? 's' : ''}`;

    if (capsules.length === 0) {
      capsuleList.innerHTML = '';
      capsuleList.appendChild(emptyState);
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    capsuleList.innerHTML = '';

    capsules.forEach((capsule, idx) => {
      const item = createCapsuleElement(capsule, idx);
      capsuleList.appendChild(item);
    });
  }

  // Create Capsule Element
  function createCapsuleElement(capsule, idx) {
    const item = document.createElement("div");
    item.className = "capsule-item";
    item.draggable = true;

    const date = new Date(capsule.timestamp);
    const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    item.innerHTML = `
      <div class="capsule-name">${escapeHTML(capsule.name)}</div>
      <div class="capsule-meta">
        <span>${capsule.metadata?.provider || 'Unknown'}</span>
        <span>${capsule.metadata?.messageCount || '?'} msgs</span>
        <span>${dateStr}</span>
      </div>
      <div class="capsule-actions">
        <button class="capsule-btn use" data-idx="${idx}">Use</button>
        <button class="capsule-btn copy" data-idx="${idx}">Copy</button>
        <button class="capsule-btn delete" data-idx="${idx}">Delete</button>
      </div>
    `;

    // Drag and drop
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", capsule.text);
      e.dataTransfer.effectAllowed = "copy";
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    // Button actions
    item.querySelectorAll(".capsule-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.classList.contains("use") ? "use" : 
                      btn.classList.contains("copy") ? "copy" : "delete";
        const idx = parseInt(btn.dataset.idx);
        handleCapsuleAction(action, idx);
      });
    });

    return item;
  }

  // Handle Capsule Actions
  function handleCapsuleAction(action, idx) {
    const capsule = allCapsules[idx];
    if (!capsule) return;

    if (action === "use") {
      navigator.clipboard.writeText(capsule.text).then(() => {
        showToast(`✅ ${capsule.name} copied! Paste it anywhere.`, "success");
      });
    } else if (action === "copy") {
      navigator.clipboard.writeText(capsule.text).then(() => {
        showToast("📋 Copied to clipboard", "success");
      });
    } else if (action === "delete") {
      if (confirm(`Delete "${capsule.name}"?`)) {
        chrome.storage.local.get("capsuleLibrary", (data) => {
          const library = data?.capsuleLibrary || [];
          library.splice(idx, 1);
          chrome.storage.local.set({ capsuleLibrary: library }, () => {
            showToast("🗑️ Capsule deleted", "success");
            loadCapsuleLibrary();
          });
        });
      }
    }
  }

  // Filter Capsules
  function filterCapsules(query) {
    const filtered = searchCapsules(allCapsules, query);
    renderCapsules(filtered);
  }

  // Show Toast
  function showToast(message, type = "info") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // Escape HTML
  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
