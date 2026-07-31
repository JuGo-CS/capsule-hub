# Capsule Hub - AI Context Bridge 🔄🚀

> **A privacy-first, open-source Chrome extension** that captures context from one AI chat and bridges it to another — instantly.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 What is Capsule Hub?

Capsule Hub solves a very real daily pain point: **switching between AI models mid-conversation without losing context.**

Imagine you're deep in a coding session with Claude, and you run out of free-tier messages. You need to switch to ChatGPT — but you don't want to re-explain your entire project, goals, and progress. Capsule Hub captures the **full context** — what you asked, what the AI planned, where you are now — and seamlessly injects it into your next AI tool.

### What Gets Captured:
- 📝 **Progress** — What the AI has accomplished so far
- 🎯 **Goals** — Your original objectives and requirements
- 📊 **Plan** — The AI's proposed approach and next steps
- 💻 **Code blocks** — All code snippets preserved with formatting
- 💬 **Full conversation** — Every user prompt and AI response

---

## 🔒 Privacy First — Why This Exists

Many existing "context bridge" extensions on the Chrome Web Store **send your entire AI conversations to their own servers**, including extensions that request access to your Gmail, Outlook, downloads, and identity. Your AI conversations often contain proprietary code, business ideas, and personal data.

**Capsule Hub was built as a privacy-first alternative:**

| Privacy Feature | Capsule Hub (Ours) | Typical Alternatives |
|----------------|-------------------|---------------------|
| **Data stays in browser** | ✅ Yes, 100% local | ❌ Sends data to external servers |
| **Open source** | ✅ Fully auditable code | ❌ Closed source |
| **Email access** | ❌ None | ⚠️ Requests Gmail & Outlook access |
| **Download tracking** | ❌ None | ⚠️ Has `downloads` permission |
| **Identity/OAuth access** | ❌ None | ⚠️ Has `identity` permission |
| **External servers** | ❌ Zero network calls | ❌ Communicates with external backend |
| **WebAssembly execution** | ❌ Not allowed | ⚠️ Allows `wasm-unsafe-eval` |
| **Free to use** | ✅ Always free | ❌ Paid tiers |

**Your AI conversations contain sensitive work data. Our extension processes everything locally in your browser. No data is ever sent to any server. Verify it yourself — the code is open source.**

---

## 🧠 How the "Capsule" Wrapping Works

Capsule Hub uses **three context extraction modes** to wrap your AI conversation:

### 1. Full Context Mode
Captures the **entire conversation verbatim** — every user prompt and AI response, cleaned of UI elements (buttons, icons, feedback widgets). The text is wrapped with a structured header that tells the target AI:
- Where this conversation came from
- That it should continue seamlessly
- To respond to the last user prompt

### 2. Selective Mode
Lets you **hand-pick which messages** to include. Perfect for removing irrelevant tangents or failed approaches while keeping the important context.

### 3. Smart Summary Mode
An intelligent extraction that identifies and structures:
- 📌 **Initial Goal** — What you originally asked the AI to do
- 🎯 **Key Decisions** — Important choices made during the conversation
- 💬 **Critical Exchanges** — The most important user↔AI interactions (first 3 + last 2)
- 🏁 **Current State** — Where things stand right now
- 💻 **Code Blocks** — Any code snippets preserved exactly as written

This is processed **entirely in your browser** using pattern recognition on the conversation structure — no AI summarizer API is called. The algorithm looks for:
- First message = your initial goal/request
- User→Assistant pairs = key exchanges
- Code fence patterns (```) = important code blocks
- Last messages = current state and pending tasks

---

## 🌟 Key Features

1. **Auto-Context Extraction** — Automatically detects and extracts the full conversation from supported AI providers
2. **Smart Scrolling** — Scrolls to the top of the chat to capture ALL messages, even in long conversations
3. **Intelligent Wrapping** — Structured context with goal/progress/plan extraction
4. **Code Block Preservation** — Code snippets are kept intact with language identifiers
5. **Turn-Based Selection** — Interactively select which parts of the conversation to transfer
6. **Three Context Modes** — Full Context, Selective, or Smart Summary
7. **Capsule History** — Save capsules locally and reuse them later
8. **Seamless Injection** — Opens the destination AI, waits for the input to load, and injects context automatically
9. **React/Vue Compatible** — Uses modern InputEvent API for framework-compatible text injection
10. **Export as Markdown** — Download capsules as .md files for external use
11. **Manual Entry** — Paste custom context from any source
12. **Clipboard Fallback** — Copy formatted context to clipboard if auto-injection fails
13. **Token Estimation** — See approximate token count before transferring
14. **Privacy Badge** — Always-visible indicator that your data stays local

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
├── popup.css          # Dark theme styling (no external fonts)
├── icon.svg           # Source vector icon
├── icon16.png         # 16x16 toolbar icon
├── icon48.png         # 48x48 extension management icon
├── icon128.png        # 128x128 Chrome Web Store icon
├── LICENSE            # MIT License
└── README.md          # This file
```

---

## 🔧 Installation

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
   - **Full Context** — Transfer the entire conversation with structured header
   - **Selective** — Pick specific messages to include
   - **Smart Summary** — Auto-extracted goals, progress, and key decisions
5. **Click a destination** (e.g., ChatGPT) — a new tab opens with your context injected
6. **Review and hit Enter** — the new AI now has your full context!

### Saving Capsules
- Click **"Save Capsule"** to store the current context locally
- Access saved capsules from the **Capsule Library** tab
- Reuse, export, or bridge saved capsules to any AI tool

---

## 🛡️ Privacy Policy

**Capsule Hub collects ZERO data.**

- ✅ All context extraction happens locally in your browser
- ✅ Conversation data is stored only in `chrome.storage.local` (your browser profile)
- ✅ No analytics, no telemetry, no external API calls
- ✅ No external font loading, no CDN requests
- ✅ No user accounts, no login required
- ✅ Source code is fully auditable — verify it yourself
- ✅ Pending context auto-clears after 2 minutes
- ✅ No data persists after you click "Clear Context"

**Technical verification:** The extension makes zero `fetch()`, `XMLHttpRequest`, or `WebSocket` calls. You can verify this by opening DevTools Network tab while using the extension — you'll see no outgoing requests.

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
