/**
 * 3T Office UI Kit — Enterprise Dialog Framework
 * Thay thế hoàn toàn alert() và prompt() của trình duyệt bằng hộp thoại đồ họa chuẩn 3T Office.
 * Tuân thủ 03-ui-ux/UI-KIT-RULES.md & 01-architecture/SHARED-PLATFORM.md
 */

import { ICONS } from "./icons.js";
import { t } from "../i18n/i18n.js";
import { bindNumericDialogValidation } from "./numeric-dialog-validation.js";
import { captureEditorFocus, restoreEditorFocus, isEditorElement, getDialogKeyboardRibbonInvoker } from "../shell/focus-manager.js";

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
    captureEditorFocus();
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
      if (previousFocused && isEditorElement(previousFocused)) {
        try { previousFocused.focus(); } catch (_) {}
      } else {
        restoreEditorFocus();
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
 * Hiển thị thông báo chuẩn khi người dùng bấm vào một tính năng chưa hoàn thiện
 * Tuân thủ quy định người phụ trách 30/09:
 * "Tính năng này đang được hoàn thiện và sẽ có trong bản cập nhật tới."
 * @param {string} [featureName]
 * @returns {Promise<void>}
 */
export function showPendingFeatureNotice(featureName = "") {
  const title = featureName ? `Tính năng: ${featureName}` : t("common.notice", "Thông báo");
  const message = t(
    "common.featurePendingNotice",
    "Tính năng này đang được hoàn thiện và sẽ có trong bản cập nhật tới."
  );
  return showAlertDialog({
    title,
    message,
    confirmText: t("common.confirm", "Đồng ý"),
    type: "info"
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
    captureEditorFocus();
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
      if (previousFocused && isEditorElement(previousFocused)) {
        try { previousFocused.focus(); } catch (_) {}
      } else {
        restoreEditorFocus();
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
 * Hỏi cách xử lý thay đổi chưa lưu trước khi thay tài liệu hoặc đóng cửa sổ.
 * @returns {Promise<"save"|"discard"|"cancel">}
 */
export function showUnsavedChangesDialog({
  title = "Lưu thay đổi?",
  message = "Bạn có muốn lưu các thay đổi của tài liệu này không?",
  saveText = "Lưu",
  discardText = "Không lưu",
  cancelText = "Hủy"
} = {}) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
      resolve("cancel");
      return;
    }
    captureEditorFocus();
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const titleId = `vno-dialog-title-${++dialogIdCounter}`;
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width:460px;" role="alertdialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="vno-dialog-header">
          <span id="${titleId}">${title}</span>
          <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${cancelText}" aria-label="${cancelText}">&times;</button>
        </div>
        <div class="vno-dialog-body">
          <p style="margin:0;font-size:13px;line-height:1.6;color:var(--vno-text-primary);">${message}</p>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn vno-dialog-cancel-btn" data-unsaved-choice="cancel">${cancelText}</button>
          <button class="vno-btn vno-dialog-discard-btn" data-unsaved-choice="discard">${discardText}</button>
          <button class="vno-btn vno-btn-primary vno-dialog-save-btn" data-unsaved-choice="save">${saveText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const saveBtn = overlay.querySelector(".vno-dialog-save-btn");
    const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

    const finish = (choice) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && isEditorElement(previousFocused)) {
        try { previousFocused.focus(); } catch (_) {}
      } else {
        restoreEditorFocus();
      }
      resolve(choice);
    };
    overlay.querySelectorAll("[data-unsaved-choice]").forEach(button => {
      button.addEventListener("click", () => finish(button.getAttribute("data-unsaved-choice")));
    });
    closeBtn.addEventListener("click", () => finish("cancel"));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) finish("cancel");
    });
    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish("cancel");
      } else if (event.key === "Enter") {
        event.preventDefault();
        const activeChoice = document.activeElement?.getAttribute?.("data-unsaved-choice");
        if (activeChoice) {
          finish(activeChoice);
        } else if (document.activeElement === closeBtn) {
          finish("cancel");
        } else {
          finish("save");
        }
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    saveBtn.focus();
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
  cancelText = "Hủy bỏ",
  numericValidation = null
}) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
      resolve(defaultValue);
      return;
    }
    captureEditorFocus();
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
          <div class="vno-dialog-error" role="alert" aria-live="assertive" style="min-height:16px;color:#b91c1c;font-size:12px;font-weight:600;"></div>
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
      const dialogInvoker = getDialogKeyboardRibbonInvoker();
      const focusTarget = dialogInvoker || (previousFocused && !isEditorElement(previousFocused) ? previousFocused : null);
      if (focusTarget && typeof focusTarget.focus === "function") {
        setTimeout(() => {
          if (focusTarget.isConnected) {
            try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
          }
        }, 50);
      } else if (previousFocused && isEditorElement(previousFocused)) {
        try { previousFocused.focus(); } catch (_) {}
      } else {
        restoreEditorFocus();
      }
      resolve(val);
    };

    const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
    const okBtn = overlay.querySelector(".vno-dialog-ok-btn");
    const errorBox = overlay.querySelector(".vno-dialog-error");
    const validateNumeric = numericValidation ? bindNumericDialogValidation({
      inputs: input,
      button: okBtn,
      error: errorBox,
      min: numericValidation.min,
      max: numericValidation.max,
      integer: numericValidation.integer,
      message: numericValidation.message
    }) : null;

    const commit = () => {
      if (validateNumeric && !validateNumeric()) {
        input.focus();
        return;
      }
      if (!String(input.value || "").trim()) {
        errorBox.textContent = t("common.promptRequired", "Vui lòng nhập nội dung trước khi tiếp tục.");
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      finish(input.value);
    };

    okBtn.addEventListener("click", commit);
    cancelBtn.addEventListener("click", () => finish(null));
    closeBtn.addEventListener("click", () => finish(null));
    if (!validateNumeric) input.addEventListener("input", () => {
      errorBox.textContent = "";
      input.removeAttribute("aria-invalid");
    });

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
          commit();
        }
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

export { showFindReplaceDialog } from "../find/find-dialog.js";

/**
 * Hộp thoại Quản lý Macro — liệt kê macro đã ghi, chạy/đổi tên/xóa.
 * @param {Object} options
 * @param {Array<{id:string, name:string, steps:Array, createdAt:number}>} options.macros
 * @param {(id:string)=>Promise<void>} options.onRun
 * @param {(id:string, newName:string)=>void} options.onRename
 * @param {(id:string)=>void} options.onDelete
 * @returns {Promise<void>} resolve khi đóng hộp thoại
 */
export function showMacroManagerDialog({ macros, onRun, onRename, onDelete }) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
      resolve();
      return;
    }
    let currentMacros = macros || [];
    captureEditorFocus();
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const titleId = `vno-dialog-title-${++dialogIdCounter}`;

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 520px; max-height: 70vh; display:flex; flex-direction:column;" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="vno-dialog-header">
          <span id="${titleId}">Quản lý Macro</span>
          <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body vno-macro-list" style="overflow-y:auto; flex:1 1 auto; min-height:80px;"></div>
        <div class="vno-dialog-footer">
          <button class="vno-btn vno-macro-close-btn">Đóng</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const listEl = overlay.querySelector(".vno-macro-list");

    const renderList = () => {
      if (!currentMacros.length) {
        listEl.innerHTML = `<p style="margin:0;padding:20px 4px;text-align:center;font-size:13px;color:var(--vno-text-muted);">Chưa có Macro nào được ghi. Bấm «Ghi Macro» trên Ribbon để bắt đầu.</p>`;
        return;
      }
      listEl.innerHTML = currentMacros.map(m => `
        <div class="vno-macro-row" data-macro-id="${m.id}" style="display:flex; align-items:center; gap:8px; padding:8px 4px; border-bottom:1px solid var(--vno-border-subtle,#e2e8f0);">
          <div style="flex:1 1 auto; min-width:0;">
            <div class="vno-macro-name" style="font-size:13px; font-weight:500; color:var(--vno-text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.name}</div>
            <div style="font-size:11px; color:var(--vno-text-muted);">${m.steps.length} thao tác</div>
          </div>
          <button class="vno-btn vno-btn-sm vno-macro-run-btn" title="Chạy Macro" aria-label="Chạy Macro ${m.name}">▶ Chạy</button>
          <button class="vno-btn vno-btn-sm vno-macro-rename-btn" title="Đổi tên" aria-label="Đổi tên Macro ${m.name}">Đổi tên</button>
          <button class="vno-btn vno-btn-sm vno-macro-delete-btn" title="Xóa" aria-label="Xóa Macro ${m.name}">Xóa</button>
        </div>
      `).join("");
    };
    renderList();

    listEl.addEventListener("click", async (e) => {
      const row = e.target.closest(".vno-macro-row");
      if (!row) return;
      const id = row.getAttribute("data-macro-id");
      if (e.target.classList.contains("vno-macro-run-btn")) {
        if (onRun) await onRun(id);
      } else if (e.target.classList.contains("vno-macro-rename-btn")) {
        const macro = currentMacros.find(m => m.id === id);
        const newName = await showPromptDialog({ title: "Đổi tên Macro", message: "Tên Macro:", defaultValue: macro?.name || "" });
        if (newName && onRename) {
          onRename(id, newName);
          const target = currentMacros.find(m => m.id === id);
          if (target) target.name = newName;
          renderList();
        }
      } else if (e.target.classList.contains("vno-macro-delete-btn")) {
        const macro = currentMacros.find(m => m.id === id);
        const ok = await showConfirmDialog({ title: "Xóa Macro", message: `Xóa Macro "${macro?.name || ""}"? Không thể hoàn tác.` });
        if (ok && onDelete) {
          onDelete(id);
          currentMacros = currentMacros.filter(m => m.id !== id);
          renderList();
        }
      }
    });

    const finish = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && isEditorElement(previousFocused)) {
        try { previousFocused.focus(); } catch (_) {}
      } else {
        restoreEditorFocus();
      }
      resolve();
    };

    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
    const closeBtn2 = overlay.querySelector(".vno-macro-close-btn");
    closeBtn.addEventListener("click", finish);
    closeBtn2.addEventListener("click", finish);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish();
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeBtn2.focus();
  });
}

export { showHyperlinkDialog, normalizeHyperlinkUrl } from "./hyperlink-dialog.js";
export { showSymbolPicker, listAllSymbols, SYMBOL_CATEGORIES } from "./symbol-picker.js";
