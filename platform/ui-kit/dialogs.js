/**
 * VN Office UI Kit — Enterprise Dialog Framework
 * Thay thế hoàn toàn alert() và prompt() của trình duyệt bằng hộp thoại đồ họa chuẩn VN Office.
 * Tuân thủ 03-ui-ux/UI-KIT-RULES.md & 01-architecture/SHARED-PLATFORM.md
 */

import { ICONS } from "./icons.js";

let dialogIdCounter = 0;

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
 * Hiển thị Hộp thoại Thông báo (thay thế alert)
 * @param {Object} options
 * @param {string} [options.title="Thông báo"]
 * @param {string} options.message
 * @param {string} [options.confirmText="Đồng ý"]
 * @param {"info"|"success"|"warning"|"error"} [options.type="info"]
 * @returns {Promise<void>}
 */
export function showAlertDialog({
  title = "Thông báo",
  message,
  confirmText = "Đồng ý",
  type = "info"
}) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
      resolve();
      return;
    }
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    let iconColor = "var(--vno-primary)";
    if (type === "warning") iconColor = "#d97706";
    if (type === "error") iconColor = "#dc2626";
    if (type === "success") iconColor = "#16a34a";

    const titleId = `vno-dialog-title-${++dialogIdCounter}`;

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 420px;" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="vno-dialog-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:flex;color:${iconColor};" aria-hidden="true">${ICONS.brandLogo || ""}</span>
            <span id="${titleId}">${title}</span>
          </div>
          <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body">
          <p style="margin:0;font-size:13px;line-height:1.6;color:var(--vno-text-primary);">${message}</p>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn vno-btn-primary vno-dialog-ok-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve();
    };

    const okBtn = overlay.querySelector(".vno-dialog-ok-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

    okBtn.addEventListener("click", cleanup);
    closeBtn.addEventListener("click", cleanup);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        cleanup();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    okBtn.focus();
  });
}

/**
 * Hiển thị Hộp thoại Xác nhận (thay thế confirm)
 * @param {Object} options
 * @param {string} [options.title="Xác nhận"]
 * @param {string} options.message
 * @param {string} [options.confirmText="Đồng ý"]
 * @param {string} [options.cancelText="Hủy bỏ"]
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title = "Xác nhận",
  message,
  confirmText = "Đồng ý",
  cancelText = "Hủy bỏ"
}) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
      resolve(true);
      return;
    }
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const titleId = `vno-dialog-title-${++dialogIdCounter}`;

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 440px;" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="vno-dialog-header">
          <span id="${titleId}">${title}</span>
          <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body">
          <p style="margin:0;font-size:13px;line-height:1.6;color:var(--vno-text-primary);">${message}</p>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn vno-dialog-cancel-btn">${cancelText}</button>
          <button class="vno-btn vno-btn-primary vno-dialog-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const finish = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
    const confirmBtn = overlay.querySelector(".vno-dialog-confirm-btn");

    confirmBtn.addEventListener("click", () => finish(true));
    cancelBtn.addEventListener("click", () => finish(false));
    closeBtn.addEventListener("click", () => finish(false));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish(false);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (document.activeElement === cancelBtn || document.activeElement === closeBtn) {
          finish(false);
        } else {
          finish(true);
        }
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    confirmBtn.focus();
  });
}

/**
 * Hiển thị Hộp thoại Nhập liệu (thay thế prompt)
 * @param {Object} options
 * @param {string} [options.title="Nhập dữ liệu"]
 * @param {string} options.message
 * @param {string} [options.defaultValue=""]
 * @param {string} [options.placeholder=""]
 * @param {string} [options.confirmText="Đồng ý"]
 * @param {string} [options.cancelText="Hủy bỏ"]
 * @returns {Promise<string|null>}
 */
export function showPromptDialog({
  title = "Nhập dữ liệu",
  message,
  defaultValue = "",
  placeholder = "",
  confirmText = "Đồng ý",
  cancelText = "Hủy bỏ"
}) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
      resolve(defaultValue);
      return;
    }
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const titleId = `vno-dialog-title-${++dialogIdCounter}`;
    const inputId = `vno-prompt-input-${dialogIdCounter}`;

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 460px;" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="vno-dialog-header">
          <span id="${titleId}">${title}</span>
          <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px;">
          <label for="${inputId}" style="font-size:13px;font-weight:500;color:var(--vno-text-primary);">${message}</label>
          <input type="text" id="${inputId}" class="vno-dialog-input" value="${defaultValue}" placeholder="${placeholder}" 
                 style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;outline:none;" />
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn vno-dialog-cancel-btn">${cancelText}</button>
          <button class="vno-btn vno-btn-primary vno-dialog-ok-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const input = overlay.querySelector(".vno-dialog-input");
    input.focus();
    input.select();

    const finish = (val) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(val);
    };

    const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
    const okBtn = overlay.querySelector(".vno-dialog-ok-btn");

    okBtn.addEventListener("click", () => finish(input.value));
    cancelBtn.addEventListener("click", () => finish(null));
    closeBtn.addEventListener("click", () => finish(null));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish(null);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (document.activeElement === cancelBtn || document.activeElement === closeBtn) {
          finish(null);
        } else {
          finish(input.value);
        }
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

/**
 * Hộp thoại Tìm kiếm và Thay thế chuẩn phong cách Microsoft Office
 * @param {Object} options
 * @param {boolean} [options.isReplace=false]
 * @param {Function} options.onFind (findText) => boolean
 * @param {Function} options.onReplace (findText, replaceText) => void
 * @param {Function} options.onReplaceAll (findText, replaceText) => void
 */
export function showFindReplaceDialog({
  isReplace = false,
  onFind,
  onReplace,
  onReplaceAll
}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return;
  }
  const previousFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  const titleId = `vno-dialog-title-${++dialogIdCounter}`;

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 500px;" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <div class="vno-dialog-header">
        <div style="display:flex;gap:12px;align-items:center;">
          <span id="${titleId}" style="font-weight:700;">Tìm kiếm và Thay thế</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-fr-close" title="Đóng" aria-label="Đóng">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label for="vno-fr-find-input" style="font-size:12px;font-weight:600;color:var(--vno-text-secondary);">Tìm kiếm:</label>
          <input type="text" id="vno-fr-find-input" placeholder="Nhập từ hoặc cụm từ cần tìm..."
                 style="padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;width:100%;box-sizing:border-box;" />
        </div>

        <div id="vno-fr-replace-group" style="display:${isReplace ? "flex" : "none"};flex-direction:column;gap:4px;">
          <label for="vno-fr-replace-input" style="font-size:12px;font-weight:600;color:var(--vno-text-secondary);">Thay thế bằng:</label>
          <input type="text" id="vno-fr-replace-input" placeholder="Nhập nội dung thay thế..."
                 style="padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;width:100%;box-sizing:border-box;" />
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="vno-fr-toggle-replace" ${isReplace ? "checked" : ""} />
          <label for="vno-fr-toggle-replace" style="font-size:12px;color:var(--vno-text-secondary);cursor:pointer;">Hiển thị tùy chọn thay thế</label>
        </div>
      </div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-fr-close-btn">Đóng</button>
        <button class="vno-btn" id="vno-fr-replace-btn" style="display:${isReplace ? "inline-flex" : "none"};">Thay thế</button>
        <button class="vno-btn" id="vno-fr-replace-all-btn" style="display:${isReplace ? "inline-flex" : "none"};">Thay thế tất cả</button>
        <button class="vno-btn vno-btn-primary" id="vno-fr-find-next-btn">Tìm tiếp</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const dialogBox = overlay.querySelector(".vno-dialog-box");

  const findInput = overlay.querySelector("#vno-fr-find-input");
  const replaceInput = overlay.querySelector("#vno-fr-replace-input");
  const replaceGroup = overlay.querySelector("#vno-fr-replace-group");
  const toggleCheckbox = overlay.querySelector("#vno-fr-toggle-replace");
  const replaceBtn = overlay.querySelector("#vno-fr-replace-btn");
  const replaceAllBtn = overlay.querySelector("#vno-fr-replace-all-btn");
  const findNextBtn = overlay.querySelector("#vno-fr-find-next-btn");

  findInput.focus();

  toggleCheckbox.addEventListener("change", (e) => {
    const show = e.target.checked;
    replaceGroup.style.display = show ? "flex" : "none";
    replaceBtn.style.display = show ? "inline-flex" : "none";
    replaceAllBtn.style.display = show ? "inline-flex" : "none";
  });

  const close = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (previousFocused && typeof previousFocused.focus === "function") {
      previousFocused.focus();
    }
  };

  overlay.querySelectorAll(".vno-fr-close, .vno-fr-close-btn").forEach(btn => {
    btn.addEventListener("click", close);
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const doFind = () => {
    const text = findInput.value;
    if (text && onFind) onFind(text);
  };

  findNextBtn.addEventListener("click", doFind);

  replaceBtn.addEventListener("click", () => {
    const fText = findInput.value;
    const rText = replaceInput.value;
    if (fText && onReplace) onReplace(fText, rText);
  });

  replaceAllBtn.addEventListener("click", () => {
    const fText = findInput.value;
    const rText = replaceInput.value;
    if (fText && onReplaceAll) onReplaceAll(fText, rText);
  });

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Enter") {
      e.preventDefault();
      doFind();
    } else if (e.key === "Tab") {
      trapFocus(dialogBox, e);
    }
  };
  document.addEventListener("keydown", onKeyDown);
}
