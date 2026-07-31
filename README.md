# Capsule Hub - AI Context Bridge 🔄🚀

> **A privacy-first, open-source Chrome extension** that captures context from one AI chat and bridges it to another — instantly.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chromewebstore.google.com/detail/ngeoeefidomejcdhiecidpaalfoekjbh)

---

## 🎯 What is Capsule Hub?

Capsule Hub solves a very real daily pain point: **switching between AI models mid-conversation without losing context.**

Imagine you're deep in a coding session with Claude, and you run out of tokens. You need to switch to ChatGPT — but you don't want to re-explain your entire project, goals, and progress. Capsule Hub captures the **full context** — what you asked, what the AI planned, where you are now — and seamlessly injects it into your next AI tool.

### What Gets Captured:
- 📝 **Progress** — What the AI has accomplished so far
- 🎯 **Goals** — Your original objectives and requirements
- 📊 **Plan** — The AI's proposed approach and next steps
- 💬 **Full conversation** — Every user prompt and AI response

---

## 🔒 Privacy First — How We Compare

| Feature | Capsule Hub (Ours) | Capsule Hub by Tilantra |
|---------|-------------------|------------------------|
| **Data stays in browser** | ✅ Yes, 100% local | ❌ Sends data to `backend.tilantra.com` |
| **Open source** | ✅ Fully open source | ❌ Closed source |
| **Email access** | ❌ None | ⚠️ Requests Gmail & Outlook access |
| **Download tracking** | ❌ None | ⚠️ Has `downloads` permission |
| **Identity/OAuth access** | ❌ None | ⚠️ Has `identity` permission |
| **External servers** | ❌ Zero network calls | ❌ Communicates with external backend |
| **WebAssembly execution** | ❌ Not allowed | ⚠️ Allows `wasm-unsafe-eval` |
| **Free to use** | ✅ Always free | ❌ Paid tiers |

**Your AI conversations contain sensitive work data. Our extension processes everything locally in your browser. No data is ever sent to any server.**

---

## 🌟 Key Features

1. **Auto-Context Extraction** — Automatically detects and extracts the full conversation from supported AI providers
2. **Smart Scrolling** — Scrolls to the top of the chat to capture ALL messages, even in long conversations
3. **Turn-Based Selection** — Interactively select which parts of the conversation to transfer
4. **Three Context Modes** — Full Context, Selective, or Summary mode to fit different needs
5. **Seamless Injection** — Opens the destination AI, waits for the input to load, and injects context automatically
6. **React/Vue Compatible** — Uses modern InputEvent API for framework-compatible text injection
7. **Manual Entry** — Paste custom context from any source
8. **Clipboard Fallback** — Copy formatted context to clipboard if auto-injection fails
9. **Token Estimation** — See approximate token count before transferring
10. **Privacy Badge** — Always-visible indicator that your data stays local

---

## 📂 Project Structure

```
capsule-hub-extension/
├── manifest.json      # Extension configuration (Manifest V3)
├── background.js      # Service worker for tab management and badges
├── content.js         # DOM extraction and text injection logic
├── content.css        # Toast notification and injection indicator styles
├── popup.html         # Extension popup UI structure
├── popup.js           # Popup controller and state management
├── popup.css          # Glassmorphic dark theme styling
├── icon.svg           # Source vector icon
├── icon16.png         # 16x16 toolbar icon
├── icon48.png         # 48x48 extension management icon
├── icon128.png        # 128x128 Chrome Web Store icon
├── LICENSE            # MIT License
└── README.md          # This file
```

---

## 🔧 Installation

### From Chrome Web Store
[Install Capsule Hub](https://chromewebstore.google.com/detail/ngeoeefidomejcdhiecidpaalfoekjbh)

### From Source (Developer Mode)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pruthvikrishnang/capsule-hub-extension.git
   cd capsule-hub-extension
   ```

2. **Load in Chrome/Brave:**
   - Navigate to `chrome://extensions` (or `brave://extensions`)
   - Enable **Developer Mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the cloned `capsule-hub-extension` folder

3. **Pin for easy access:**
   - Click the puzzle piece icon in your toolbar
   - Pin **Capsule Hub - AI Context Bridge**

---

## 🖥️ Supported AI Providers

| Provider | URL | Status |
|----------|-----|--------|
| 🤖 ChatGPT | `chatgpt.com` | ✅ Supported |
| 🎨 Claude | `claude.ai` | ✅ Supported |
| ✨ Gemini | `gemini.google.com` | ✅ Supported |
| 🐳 DeepSeek | `chat.deepseek.com` | ✅ Supported |

---

## 🎯 How to Use

1. **Start a conversation** in any supported AI tool (e.g., Claude)
2. **Click the Capsule Hub icon** in your browser toolbar
3. **Review the captured messages** — all your turns are automatically detected
4. **Choose your mode:**
   - **Full Context** — Transfer the entire conversation
   - **Selective** — Pick specific messages to include
   - **Summary** — Get a condensed version with key exchanges
5. **Click a destination** (e.g., ChatGPT) — a new tab opens with your context injected
6. **Review and hit Enter** — the new AI now has your full context!

---

## 🛡️ Privacy Policy

**Capsule Hub collects ZERO data.**

- ✅ All context extraction happens locally in your browser
- ✅ Conversation data is stored only in `chrome.storage.local` (your browser profile)
- ✅ No analytics, no telemetry, no external API calls
- ✅ No user accounts, no login required
- ✅ Source code is fully auditable — verify it yourself
- ✅ Pending context auto-clears after 2 minutes
- ✅ No data persists after you click "Clear Context"

We believe your AI conversations are private. Period.

---

## 🤝 Contributing

Contributions are welcome! This is an open-source project and we'd love your help making it better.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

Built with ❤️ by [Pruthvikrishnan G](https://github.com/pruthvikrishnang)

*If this extension helps your workflow, please ⭐ star the repo and share it!*
