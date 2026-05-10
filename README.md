# 🛡️ PrivacyLayer — AI Privacy Firewall

A Chrome extension that intercepts your prompts before they reach ChatGPT, Claude, or Gemini — and alerts you if sensitive PII is detected.

---

## ✅ How to Install (No coding required)

### Step 1 — Get the files
Make sure you have this folder with all these files:
```
privacy-layer-extension/
├── manifest.json
├── content.js
├── content.css
├── popup.html
├── popup.js
└── background.js
```

### Step 2 — Open Chrome Extensions
1. Open Google Chrome
2. In the address bar, type: `chrome://extensions`
3. Press Enter

### Step 3 — Enable Developer Mode
- Look for the **"Developer mode"** toggle in the top-right corner
- Turn it **ON**

### Step 4 — Load the Extension
1. Click **"Load unpacked"** button (top left)
2. Navigate to and select the `privacy-layer-extension` folder
3. Click **"Select Folder"**

### Step 5 — Done! 🎉
- You'll see **PrivacyLayer** appear in your extensions list
- The 🛡️ shield icon will appear in your Chrome toolbar
- Visit ChatGPT, Claude.ai, or Gemini and start typing

---

## 🔍 What It Detects

| Type | Example |
|------|---------|
| ✉️ Email | user@company.com |
| 📞 Phone | +1-555-867-5309 |
| 🏦 IBAN | GB82WEST12345698765432 |
| 💳 Credit Card | 4111 1111 1111 1111 |
| 🔑 API Key | sk-proj-abc123... |
| 🔒 Password | password: mySecret! |
| 🪪 SSN | 123-45-6789 |
| 🌐 IP Address | 192.168.1.1 |

---

## 🔄 How It Works

1. You type a prompt on ChatGPT / Claude / Gemini
2. When you press **Enter** or click **Send**, PrivacyLayer intercepts it
3. If PII is found, a **popup appears** showing what was detected
4. You choose:
   - **"Send masked version"** → PII replaced with tokens like `[EMAIL_1]`
   - **"Send original anyway"** → your prompt goes through unchanged
5. Everything is processed **locally in your browser** — nothing is sent to any PrivacyLayer server

---

## ⚙️ Toggle On/Off
Click the 🛡️ icon in your toolbar to open the popup and toggle protection on/off.

---

## 🔒 Privacy Promise
- Zero data leaves your device
- No account required
- No analytics or tracking
- Token mapping is stored in memory only (cleared when you close the tab)

---

## 🐛 Troubleshooting

**The popup doesn't appear when I send a message?**
- Make sure you're on chatgpt.com, claude.ai, or gemini.google.com
- Try refreshing the page after installing
- Check that the extension is enabled in chrome://extensions

**It's showing too many false positives?**
- The regex patterns are intentionally broad for the MVP
- You can always choose "Send original anyway"

---

## 🗺️ What's Next (Roadmap)
- [ ] Name / Person detection (requires NLP backend)
- [ ] Persistent encrypted vault across sessions
- [ ] Slack AI + Gmail support
- [ ] Response scanning (check if LLM leaks your tokens back)
- [ ] Desktop app (no sidecar install needed)
