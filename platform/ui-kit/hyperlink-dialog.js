/**
 * 3T Office UI Kit — Shared Hyperlink Dialog (CH-7.3)
 * Hộp thoại Chèn liên kết (Ctrl+K) dùng chung cho 3T Doc, 3T Sheet và 3T Slide.
 * Tuân thủ UI-KIT-RULES.md và AGENTS.md §2 (Shared Platform).
 */

import { t, getLocale } from "../i18n/i18n.js";

let hyperlinkDialogIdCounter = 0;

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Chuẩn hóa URL, tự động thêm tiền tố https:// nếu người dùng chưa nhập protocol
 * @param {string} url
 * @returns {string}
 */
export function normalizeHyperlinkUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|ftp:|file:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Hiển thị Hộp thoại Chèn liên kết dùng chung (Ctrl+K)
 * @param {Object} [options]
 * @param {string} [options.url="https://"] - URL ban đầu
 * @param {string} [options.text=""] - Văn bản hiển thị ban đầu
 * @param {string} [options.title] - Tiêu đề hộp thoại
 * @returns {Promise<{url: string, text: string}|null>} Trả về object {url, text} hoặc null nếu hủy
 */
export function showHyperlinkDialog(options = {}) {
  const defaultUrl = options.url || options.defaultValue || "https://";
  const defaultText = options.text || options.displayText || "";

  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve({
      url: defaultUrl || "https://example.com",
      text: defaultText || "Liên kết"
    });
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";

    const titleText = options.title || (isEn ? "Insert Link" : "Chèn liên kết");
    const textLabel = isEn ? "Text to display:" : "Văn bản hiển thị:";
    const urlLabel = isEn ? "Address (URL):" : "Địa chỉ liên kết (URL):";
    const textPlaceholder = isEn ? "Text to display" : "Văn bản hiển thị trong tài liệu";
    const urlPlaceholder = "https://example.com";
    const cancelLabel = isEn ? "Cancel" : "Hủy bỏ";
    const insertLabel = isEn ? "Insert" : "Chèn";

    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "hyperlink";

    const dialogId = ++hyperlinkDialogIdCounter;
    const titleId = `vno-hyperlink-title-${dialogId}`;
    const textInputId = `vno-hyperlink-text-${dialogId}`;
    const urlInputId = `vno-hyperlink-url-${dialogId}`;

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-hyperlink-dialog" style="width: 480px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="vno-dialog-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span id="${titleId}" style="font-weight:600;font-size:14px;color:var(--vno-text-primary,#0f172a);">${titleText}</span>
          </div>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close", "Đóng")}" aria-label="${t("common.close", "Đóng")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;padding:16px 20px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label for="${textInputId}" style="font-size:12px;font-weight:600;color:var(--vno-text-secondary,#475569);">${textLabel}</label>
            <input type="text" id="${textInputId}" class="vno-dialog-input vno-hyperlink-text-input"
                   value="${String(defaultText).replace(/"/g, "&quot;")}"
                   placeholder="${textPlaceholder}"
                   style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default,#cbd5e1);border-radius:6px;font-size:13px;outline:none;" />
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label for="${urlInputId}" style="font-size:12px;font-weight:600;color:var(--vno-text-secondary,#475569);">${urlLabel}</label>
            <input type="text" id="${urlInputId}" class="vno-dialog-input vno-hyperlink-url-input"
                   value="${String(defaultUrl).replace(/"/g, "&quot;")}"
                   placeholder="${urlPlaceholder}"
                   style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default,#cbd5e1);border-radius:6px;font-size:13px;outline:none;" />
          </div>
          <div class="vno-dialog-error" role="alert" aria-live="assertive" style="min-height:16px;color:#b91c1c;font-size:12px;font-weight:600;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--vno-border-default,#e2e8f0);">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${cancelLabel}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${insertLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const textInput = overlay.querySelector(`#${textInputId}`);
    const urlInput = overlay.querySelector(`#${urlInputId}`);
    const okBtn = overlay.querySelector(".vno-dialog-ok-btn");
    const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
    const errorBox = overlay.querySelector(".vno-dialog-error");

    // Nếu đã có text nhưng chưa có url hoặc url mặc định -> focus vào urlInput
    if (defaultText && defaultText.trim()) {
      urlInput.focus();
      urlInput.select?.();
    } else {
      textInput.focus();
      textInput.select?.();
    }

    const finish = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    const commit = () => {
      const rawUrl = (urlInput?.value || defaultUrl || "").trim();
      const rawText = (textInput?.value || defaultText || "").trim();
      if (!rawUrl || rawUrl === "https://" || rawUrl === "http://") {
        errorBox.textContent = "Vui lòng nhập địa chỉ liên kết hợp lệ.";
        urlInput?.setAttribute?.("aria-invalid", "true");
        urlInput?.focus?.();
        return;
      }
      const finalUrl = normalizeHyperlinkUrl(rawUrl);
      const finalText = rawText || finalUrl;
      finish({ url: finalUrl, text: finalText });
    };

    okBtn?.addEventListener?.("click", commit);
    cancelBtn?.addEventListener?.("click", () => finish(null));
    closeBtn?.addEventListener?.("click", () => finish(null));
    urlInput?.addEventListener?.("input", () => {
      errorBox.textContent = "";
      urlInput.removeAttribute?.("aria-invalid");
    });

    overlay.addEventListener?.("click", (e) => {
      if (e.target === overlay) finish(null);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (document.activeElement === cancelBtn || document.activeElement === closeBtn) {
          finish(null);
        } else {
          commit();
        }
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };

    document.addEventListener("keydown", onKeyDown);
  });
}
