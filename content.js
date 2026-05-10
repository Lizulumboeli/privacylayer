// PrivacyLayer — Content Script
// Intercepts textarea input on supported LLM sites and scans for PII before sending

(function () {
  "use strict";

  // ─── PII Detection Patterns ───────────────────────────────────────────────
  const PII_PATTERNS = [
    {
      type: "EMAIL",
      label: "Email Address",
      icon: "✉️",
      regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
      severity: "high",
    },
    {
      type: "PHONE",
      label: "Phone Number",
      icon: "📞",
      regex: /(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g,
      severity: "high",
    },
    {
      type: "IBAN",
      label: "IBAN / Bank Account",
      icon: "🏦",
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
      severity: "critical",
    },
    {
      type: "CREDIT_CARD",
      label: "Credit Card Number",
      icon: "💳",
      regex: /\b(?:\d[ \-]?){13,16}\b/g,
      severity: "critical",
    },
    {
      type: "SSN",
      label: "Social Security Number",
      icon: "🪪",
      regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      severity: "critical",
    },
    {
      type: "API_KEY",
      label: "API Key / Secret",
      icon: "🔑",
      regex: /\b(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z\-_]{35}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9\-]+|Bearer\s+[a-zA-Z0-9\-._~+/]+=*)/g,
      severity: "critical",
    },
    {
      type: "PASSWORD",
      label: "Password",
      icon: "🔒",
      regex: /\b(password|passwd|pwd|pass)\s*[:=]\s*\S+/gi,
      severity: "critical",
    },
    {
      type: "IP_ADDRESS",
      label: "IP Address",
      icon: "🌐",
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      severity: "medium",
    },
  ];

  // Token vault — stores original values mapped to tokens (session only)
  const tokenVault = new Map();
  let tokenCounters = {};

  // ─── Scan text for PII ────────────────────────────────────────────────────
  function scanForPII(text) {
    const findings = [];
    for (const pattern of PII_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        // Avoid duplicate matches
        const isDuplicate = findings.some(
          (f) => f.value === match[0] && f.type === pattern.type
        );
        if (!isDuplicate) {
          findings.push({
            type: pattern.type,
            label: pattern.label,
            icon: pattern.icon,
            value: match[0],
            index: match.index,
            severity: pattern.severity,
          });
        }
      }
    }
    return findings;
  }

  // ─── Tokenize detected PII ────────────────────────────────────────────────
  function tokenize(text, findings) {
    let masked = text;
    // Process in reverse order to preserve indices
    const sorted = [...findings].sort((a, b) => b.index - a.index);

    for (const finding of sorted) {
      if (!tokenCounters[finding.type]) tokenCounters[finding.type] = 0;
      tokenCounters[finding.type]++;
      const token = `[${finding.type}_${tokenCounters[finding.type]}]`;
      tokenVault.set(token, finding.value);
      masked =
        masked.slice(0, finding.index) +
        token +
        masked.slice(finding.index + finding.value.length);
    }
    return masked;
  }

  // ─── Site-specific textarea selectors ────────────────────────────────────
  function getTextarea() {
    const selectors = [
      // ChatGPT
      "#prompt-textarea",
      'div[contenteditable="true"][data-id]',
      // Claude
      'div[contenteditable="true"].ProseMirror',
      '[data-testid="composer-input"]',
      // Gemini
      'div[contenteditable="true"].ql-editor',
      "rich-textarea div[contenteditable]",
      // Generic fallback
      'textarea[placeholder*="message" i]',
      'div[contenteditable="true"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ─── Find the submit button ───────────────────────────────────────────────
  function getSubmitButton() {
    const selectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="send" i]',
      'button[aria-label*="Send" i]',
      'button[type="submit"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ─── Modal UI ─────────────────────────────────────────────────────────────
  function showModal(findings, maskedText, originalText, onConfirm, onCancel) {
    // Remove existing modal
    const existing = document.getElementById("pl-modal-overlay");
    if (existing) existing.remove();

    const severityColors = {
      critical: "#ef4444",
      high: "#f59e0b",
      medium: "#3b82f6",
    };

    const overlay = document.createElement("div");
    overlay.id = "pl-modal-overlay";

    overlay.innerHTML = `
      <div id="pl-modal">
        <div id="pl-modal-header">
          <div id="pl-modal-title">
            <span id="pl-shield">🛡️</span>
            <div>
              <div id="pl-title-text">PII Detected</div>
              <div id="pl-subtitle-text">PrivacyLayer found sensitive data in your prompt</div>
            </div>
          </div>
          <button id="pl-close-btn" aria-label="Close">✕</button>
        </div>

        <div id="pl-findings-list">
          ${findings
            .map(
              (f) => `
            <div class="pl-finding-item" data-severity="${f.severity}">
              <span class="pl-finding-icon">${f.icon}</span>
              <div class="pl-finding-info">
                <span class="pl-finding-type">${f.label}</span>
                <code class="pl-finding-value">${escapeHTML(f.value)}</code>
              </div>
              <span class="pl-severity-badge" style="background:${severityColors[f.severity]}22;color:${severityColors[f.severity]};border-color:${severityColors[f.severity]}44">
                ${f.severity}
              </span>
            </div>
          `
            )
            .join("")}
        </div>

        <div id="pl-preview-section">
          <div class="pl-preview-label">MASKED PROMPT PREVIEW</div>
          <div id="pl-preview-text">${escapeHTML(maskedText)}</div>
        </div>

        <div id="pl-actions">
          <button id="pl-cancel-btn">
            <span>✕</span> Send original anyway
          </button>
          <button id="pl-confirm-btn">
            <span>🛡️</span> Send masked version
          </button>
        </div>

        <div id="pl-footer">
          All data processed locally · Nothing sent to PrivacyLayer servers
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      document.getElementById("pl-modal").style.transform = "translateY(0) scale(1)";
      document.getElementById("pl-modal").style.opacity = "1";
    });

    function closeModal() {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 200);
    }

    document.getElementById("pl-confirm-btn").addEventListener("click", () => {
      closeModal();
      onConfirm(maskedText);
    });

    document.getElementById("pl-cancel-btn").addEventListener("click", () => {
      closeModal();
      onCancel();
    });

    document.getElementById("pl-close-btn").addEventListener("click", () => {
      closeModal();
      onCancel();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal();
        onCancel();
      }
    });
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─── Set textarea text (handles both textarea and contenteditable) ─────────
  function setTextareaValue(el, text) {
    if (el.tagName === "TEXTAREA") {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      ).set;
      nativeInputValueSetter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el.isContentEditable) {
      el.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    }
  }

  // ─── Intercept submit ─────────────────────────────────────────────────────
  let isIntercepting = false;
  let lastCheckedText = "";

  function interceptSubmit(e) {
    if (isIntercepting) return;

    const textarea = getTextarea();
    if (!textarea) return;

    const text =
      textarea.tagName === "TEXTAREA"
        ? textarea.value
        : textarea.innerText || textarea.textContent;

    if (!text || text.trim().length < 3) return;

    const findings = scanForPII(text);
    if (findings.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Reset token counters for fresh session
    tokenCounters = {};
    const maskedText = tokenize(text, findings);

    showModal(
      findings,
      maskedText,
      text,
      // On confirm — replace text and submit
      (masked) => {
        isIntercepting = true;
        setTextareaValue(textarea, masked);

        setTimeout(() => {
          const btn = getSubmitButton();
          if (btn) {
            btn.click();
          } else {
            // Try Enter key fallback
            textarea.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                bubbles: true,
              })
            );
          }
          setTimeout(() => {
            isIntercepting = false;
          }, 500);
        }, 100);
      },
      // On cancel — do nothing, user keeps original
      () => {}
    );
  }

  // ─── Attach listeners ─────────────────────────────────────────────────────
  function attachListeners() {
    // Listen for keyboard Enter on textarea
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const textarea = getTextarea();
        if (textarea && (textarea === document.activeElement || textarea.contains(document.activeElement))) {
          interceptSubmit(e);
        }
      }
    }, true);

    // Listen for submit button clicks
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(
        'button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="send"]'
      );
      if (btn) {
        interceptSubmit(e);
      }
    }, true);

    // Badge on textarea focus to show extension is active
    document.addEventListener("focusin", (e) => {
      const textarea = getTextarea();
      if (textarea && (e.target === textarea || textarea.contains(e.target))) {
        showActiveBadge();
      }
    });
  }

  // ─── Active badge indicator ───────────────────────────────────────────────
  let badgeEl = null;
  function showActiveBadge() {
    if (document.getElementById("pl-active-badge")) return;
    badgeEl = document.createElement("div");
    badgeEl.id = "pl-active-badge";
    badgeEl.innerHTML = `🛡️ PrivacyLayer active`;
    document.body.appendChild(badgeEl);
    setTimeout(() => {
      if (badgeEl) {
        badgeEl.style.opacity = "0";
        setTimeout(() => badgeEl?.remove(), 400);
      }
    }, 2500);
  }

  // ─── Init with retry (wait for SPA to load) ───────────────────────────────
  function init() {
    attachListeners();
    console.log("[PrivacyLayer] Content script loaded on", window.location.hostname);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
