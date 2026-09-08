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
    <div class="vno-dialog-box" style="width: 500px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <div class="vno-dialog-header">
        <div style="display:flex;gap:12px;align-items:center;">
          <span id="${titleId}" style="font-weight:700;">Tìm kiếm và Thay thế</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-fr-close vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label for="vno-fr-find-input" style="font-size:12px;font-weight:600;color:var(--vno-text-secondary);">Tìm kiếm:</label>
          <input type="text" id="vno-fr-find-input" class="vno-dialog-input" placeholder="Nhập từ hoặc cụm từ cần tìm..."
                 style="padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;width:100%;box-sizing:border-box;background:var(--vno-bg-surface);color:var(--vno-text-primary);" />
        </div>

        <div id="vno-fr-replace-group" style="display:${isReplace ? "flex" : "none"};flex-direction:column;gap:4px;">
          <label for="vno-fr-replace-input" style="font-size:12px;font-weight:600;color:var(--vno-text-secondary);">Thay thế bằng:</label>
          <input type="text" id="vno-fr-replace-input" class="vno-dialog-input" placeholder="Nhập nội dung thay thế..."
                 style="padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;width:100%;box-sizing:border-box;background:var(--vno-bg-surface);color:var(--vno-text-primary);" />
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="vno-fr-toggle-replace" ${isReplace ? "checked" : ""} />
          <label for="vno-fr-toggle-replace" style="font-size:12px;color:var(--vno-text-secondary);cursor:pointer;user-select:none;">Hiển thị tùy chọn thay thế</label>
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
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
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
