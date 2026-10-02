/**
 * 3T Office Shared Platform — Editor Focus Keeper & Restoration Manager
 * Spec CH-4.6: Giữ bàn phím trong vùng soạn thảo cho Doc, Sheet, Slide.
 * 
 * Đảm bảo:
 * 1. Sau khi đóng MỌI hộp thoại (Esc, nút Đóng x, nút Hủy, nút OK/Đồng ý, click overlay).
 * 2. Sau khi chạy lệnh Ribbon (click nút lệnh, checkbox, select, dialog launcher).
 * 3. Sau khi đổi tab Ribbon.
 * 4. Sau khi đóng menu Tệp (Backstage).
 * 5. Sau khi thu phóng (Zoom).
 * 6. Sau khi chuyển sang cửa sổ khác rồi quay lại (Window focus / activateTarget).
 * 
 * Tiêu chí: Gõ ngay được vào vùng soạn thảo, Enter KHÔNG kích hoạt nút nào.
 * Tuân thủ AGENTS.md §2 (REUSE BEFORE REWRITE, Monorepo, Shared Platform, Không copy-paste giữa 3 app).
 */

let _capturedFocusTarget = null;
let _capturedRange = null;
let _globalFocusGuardInstalled = false;

/**
 * Xác định loại ứng dụng hiện tại: "writer" | "sheet" | "slides" | null
 * @returns {"writer"|"sheet"|"slides"|null}
 */
export function getCurrentAppKind() {
  if (typeof document === "undefined") return null;
  const shell = document.querySelector(".vno-shell");
  if (shell?.getAttribute("data-app")) return shell.getAttribute("data-app");
  if (typeof window !== "undefined" && window.__vnoAppInstance?.shell?.appName) {
    return window.__vnoAppInstance.shell.appName;
  }
  if (document.querySelector(".vno-writer-body")) return "writer";
  if (document.querySelector(".vno-sheet-container")) return "sheet";
  if (document.querySelector(".vno-slide-canvas, .vno-slides-workspace")) return "slides";
  return null;
}

/**
 * Kiểm tra xem hiện tại có bất kỳ hộp thoại / modal / backstage / overlay nào đang hiển thị không.
 * @param {Document|HTMLElement} [root=document]
 * @returns {boolean}
 */
export function hasOpenDialog(root = (typeof document !== "undefined" ? document : null)) {
  if (!root || typeof root.querySelector !== "function") return false;
  const overlays = root.querySelectorAll(
    '.vno-dialog-overlay, .vno-backstage-overlay, .vno-print-overlay, .vno-error-reporting-overlay, ' +
    '.vno-cell-styles-dialog, .vno-format-table-dialog, .vno-format-cells-overlay, ' +
    '[role="dialog"], [role="alertdialog"]'
  );
  for (const el of overlays) {
    if (el.closest?.(".vno-ribbon, .vno-topbar, .vno-statusbar")) continue;
    // Bỏ qua nếu bị ẩn
    if (el.style?.display === "none" || el.hidden) continue;
    return true;
  }
  return false;
}

/**
 * Kiểm tra một phần tử DOM có thuộc vùng soạn thảo của Doc, Sheet hoặc Slide hay không.
 * @param {Element|null} el
 * @returns {boolean}
 */
export function isEditorElement(el) {
  if (!el || typeof el.closest !== "function") return false;
  // Loại trừ các thành phần giao diện khung ngoài
  if (el.closest?.(".vno-ribbon, .vno-topbar, .vno-dialog-overlay, .vno-backstage-overlay, .vno-notification-host, .vno-statusbar, .vno-dialog-box")) {
    return false;
  }

  // 1. Doc (Writer)
  if (el.matches?.(".vno-writer-body, .vno-writer-header, .vno-writer-footer") ||
      el.closest?.(".vno-writer-body, .vno-writer-header, .vno-writer-footer")) {
    return true;
  }

  // 2. Sheet
  if (el.matches?.(".vno-sheet-container, .vno-grid-table, .vno-formula-input, .vno-cell-editor, [data-coord]") ||
      el.closest?.(".vno-sheet-container")) {
    return true;
  }

  // 3. Slide
  if (el.matches?.(".vno-slide-canvas, .vno-slide-title, .vno-slide-body, .vno-shape-text") ||
      el.closest?.(".vno-slide-canvas, .vno-slides-workspace")) {
    return true;
  }

  return false;
}

/**
 * Ghi nhớ phần tử soạn thảo và selection range hiện tại trước khi tiêu điểm bị chiếm bởi nút bấm hoặc hộp thoại.
 */
export function captureEditorFocus() {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active && isEditorElement(active)) {
    _capturedFocusTarget = active;
    const sel = typeof window !== "undefined" && window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0) {
      try {
        _capturedRange = sel.getRangeAt(0).cloneRange();
      } catch (_) {
        _capturedRange = null;
      }
    }
  }
}

/**
 * Lấy mục tiêu tiêu điểm soạn thảo đã ghi nhớ (hoặc null)
 */
export function getCapturedEditorFocus() {
  return _capturedFocusTarget;
}

/**
 * Xóa bộ nhớ tạm tiêu điểm
 */
export function clearCapturedEditorFocus() {
  _capturedFocusTarget = null;
  _capturedRange = null;
}

/**
 * Khôi phục tiêu điểm vào vùng soạn thảo cho ứng dụng đang hoạt động (Doc, Sheet, Slide).
 * Đảm bảo:
 * - Nút ribbon hoặc nút hộp thoại không còn activeElement (blur).
 * - Tiêu điểm quay về phần tử soạn thảo chuẩn.
 * - Selection/caret được định vị sẵn sàng để nhận ký tự gõ.
 * - Enter không kích hoạt lại bất kỳ nút nào.
 * 
 * @param {Object} [options={}]
 * @param {boolean} [options.force=false]
 * @returns {boolean} true nếu đã khôi phục tiêu điểm thành công
 */
export function restoreEditorFocus(options = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  if (!options.force && hasOpenDialog()) return false;

  // Làm mờ bất kỳ nút bấm hoặc control nào ngoài editor đang giữ focus
  const currentActive = document.activeElement;
  if (currentActive && (currentActive.tagName === "BUTTON" || currentActive.matches?.(".vno-ribbon-tab, .vno-btn, select, [role='tab'], [role='menuitem']"))) {
    try { currentActive.blur(); } catch (_) {}
  }

  const app = getCurrentAppKind();

  // --- DOC (WRITER) ---
  if (app === "writer") {
    const body = document.querySelector(".vno-writer-body[contenteditable='true']")
      || document.querySelector(".vno-writer-body");
    if (!body) return false;

    let target = body;
    if (_capturedFocusTarget && document.body.contains(_capturedFocusTarget) && isEditorElement(_capturedFocusTarget)) {
      target = _capturedFocusTarget;
    }

    try {
      target.focus({ preventScroll: true });
    } catch (_) {
      try { target.focus(); } catch (__) {}
    }

    // Đảm bảo caret/selection ở đúng vị trí để gõ chữ
    const sel = typeof window !== "undefined" && window.getSelection ? window.getSelection() : null;
    if (sel && typeof document.createRange === "function") {
      let rangeValid = false;
      if (sel.rangeCount > 0) {
        const anchor = sel.anchorNode;
        if (anchor && (target === anchor || target.contains(anchor))) {
          rangeValid = true;
        }
      }
      if (!rangeValid) {
        if (_capturedRange && target.contains(_capturedRange.startContainer)) {
          try {
            sel.removeAllRanges();
            sel.addRange(_capturedRange);
            rangeValid = true;
          } catch (_) {}
        }
        if (!rangeValid) {
          try {
            const range = document.createRange();
            const p = target.querySelector("p") || target;
            range.selectNodeContents(p);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (_) {}
        }
      }
    }
    return true;
  }

  // --- SHEET ---
  if (app === "sheet") {
    const active = document.activeElement;
    if (active && (active.classList.contains("vno-formula-input") || active.classList.contains("vno-cell-editor"))) {
      return true;
    }

    const grid = typeof window !== "undefined" ? window.__vnoAppInstance?.grid : null;
    if (grid && typeof grid.focusGrid === "function") {
      return grid.focusGrid();
    }

    const container = document.querySelector(".vno-sheet-container");
    if (container) {
      if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "0");
      try {
        container.focus({ preventScroll: true });
      } catch (_) {
        try { container.focus(); } catch (__) {}
      }
      return true;
    }
    return false;
  }

  // --- SLIDE ---
  if (app === "slides") {
    const canvasController = typeof window !== "undefined" ? window.__vnoAppInstance?.canvasController : null;

    // 1. Nếu có text box đã được capture trước đó hoặc đang được sửa
    if (_capturedFocusTarget && document.body.contains(_capturedFocusTarget) && isEditorElement(_capturedFocusTarget) && _capturedFocusTarget.isContentEditable) {
      try {
        _capturedFocusTarget.focus({ preventScroll: true });
        return true;
      } catch (_) {}
    }

    const selectedTarget = canvasController?.selectedTarget;
    if (selectedTarget === "title" && canvasController.titleEl?.isContentEditable) {
      try { canvasController.titleEl.focus({ preventScroll: true }); return true; } catch (_) {}
    }
    if (selectedTarget === "body" && canvasController.bodyEl?.isContentEditable) {
      try { canvasController.bodyEl.focus({ preventScroll: true }); return true; } catch (_) {}
    }
    if (selectedTarget === "body2" && canvasController.body2El?.isContentEditable) {
      try { canvasController.body2El.focus({ preventScroll: true }); return true; } catch (_) {}
    }

    const editingEl = document.querySelector(".vno-slide-title.is-editing, .vno-slide-body.is-selected, [contenteditable='true'].is-selected");
    if (editingEl) {
      try {
        editingEl.focus({ preventScroll: true });
        return true;
      } catch (_) {}
    }

    // 2. Nếu không sửa hộp chữ: focus vào slide canvas để không mất phím và Enter an toàn
    const canvas = canvasController?.canvasEl
      || document.querySelector(".vno-slide-canvas")
      || document.querySelector(".vno-slides-workspace");
    if (canvas) {
      if (!canvas.hasAttribute("tabindex")) canvas.setAttribute("tabindex", "0");
      try {
        canvas.focus({ preventScroll: true });
      } catch (_) {
        try { canvas.focus(); } catch (__) {}
      }
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Cài đặt cơ chế bảo vệ tiêu điểm toàn cục (Global Focus Guard).
 * Giám sát tự động:
 * 1. Lưu tiêu điểm trước khi người dùng click vào Ribbon/Toolbar.
 * 2. Trả tiêu điểm về editor sau khi lệnh Ribbon hoặc tab click kết thúc.
 * 3. Tự động trả tiêu điểm khi bất kỳ Dialog Overlay nào bị gỡ bỏ khỏi DOM.
 * 4. Tự động trả tiêu điểm khi cửa sổ ứng dụng nhận lại tiêu điểm (Window Focus).
 */
export function installGlobalFocusGuard() {
  if (typeof window === "undefined" || typeof document === "undefined" || _globalFocusGuardInstalled) return;
  _globalFocusGuardInstalled = true;

  // 1. Ghi nhớ tiêu điểm trước khi người dùng tương tác với Ribbon, Menu hoặc Dialog Trigger
  document.addEventListener("pointerdown", (event) => {
    const isControlClick = event.target?.closest?.(
      ".vno-ribbon, .vno-topbar, .vno-statusbar, .vno-dialog-launcher, [data-command-id]"
    );
    if (isControlClick) {
      captureEditorFocus();
    }
  }, true);

  // 2. Sau khi click vào nút Ribbon, tab Ribbon hoặc toolbar, lập tức trả tiêu điểm về editor
  document.addEventListener("click", (event) => {
    const ribbonAction = event.target?.closest?.(
      ".vno-ribbon-tab, .vno-ribbon-group-items button, .vno-quick-btn, " +
      ".vno-ribbon-group-row button, .vno-ribbon-group-column button, [data-command-id]"
    );
    if (ribbonAction) {
      setTimeout(() => {
        if (!hasOpenDialog()) {
          restoreEditorFocus();
        }
      }, 0);
    }
  }, true);

  // 3. Giám sát sự kiện đóng hộp thoại qua MutationObserver trên body
  if (typeof MutationObserver !== "undefined" && document.body) {
    const observer = new MutationObserver((mutations) => {
      let dialogRemoved = false;
      for (const m of mutations) {
        for (const node of m.removedNodes) {
          if (node.nodeType === 1 && (
            node.matches?.(".vno-dialog-overlay, .vno-backstage-overlay, .vno-print-overlay, .vno-cell-styles-dialog, .vno-format-table-dialog, .vno-format-cells-overlay") ||
            node.querySelector?.(".vno-dialog-overlay, .vno-backstage-overlay, .vno-print-overlay, .vno-cell-styles-dialog, .vno-format-table-dialog, .vno-format-cells-overlay")
          )) {
            dialogRemoved = true;
            break;
          }
        }
        if (dialogRemoved) break;
      }
      if (dialogRemoved) {
        setTimeout(() => {
          if (!hasOpenDialog()) {
            restoreEditorFocus();
          }
        }, 0);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 4. Lắng nghe khi cửa sổ nhận lại tiêu điểm (Alt+Tab hoặc activateTarget / bringToFront)
  window.addEventListener("focus", () => {
    setTimeout(() => {
      if (!hasOpenDialog()) {
        restoreEditorFocus();
      }
    }, 0);
  });
}
