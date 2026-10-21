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
 * 6. Sau khi chuyển sang cửa sổ khác rồi quay lại (Window focus / activateTarget / bringToFront).
 * 
 * Tiêu chí: Gõ ngay được vào vùng soạn thảo, Enter KHÔNG kích hoạt nút nào.
 * Tuân thủ AGENTS.md §2 (REUSE BEFORE REWRITE, Monorepo, Shared Platform, Không copy-paste giữa 3 app).
 */

let _capturedFocusTarget = null;
let _capturedRange = null;
let _globalFocusGuardInstalled = false;
let _pendingKeyboardRibbonInvoker = null;
let _dialogKeyboardRibbonInvoker = null;

export function setKeyboardRibbonInvoker(element) {
  _pendingKeyboardRibbonInvoker = element?.isConnected ? element : null;
  _dialogKeyboardRibbonInvoker = null;
}

export function getDialogKeyboardRibbonInvoker() {
  if (_dialogKeyboardRibbonInvoker?.isConnected) return _dialogKeyboardRibbonInvoker;
  _dialogKeyboardRibbonInvoker = null;
  return null;
}

export function clearKeyboardRibbonInvoker() {
  _pendingKeyboardRibbonInvoker = null;
  _dialogKeyboardRibbonInvoker = null;
}

/**
 * Danh sách selector nhận diện tất cả hộp thoại, modal, backstage và overlays trong 3T Office
 */
const DIALOG_SELECTORS = [
  ".vno-dialog-overlay",
  ".vno-backstage-overlay",
  ".vno-print-overlay",
  ".vno-print-dialog-overlay",
  ".vno-about-backdrop",
  ".vno-about-dialog",
  ".vno-fr-dialog-overlay",
  ".vno-error-reporting-overlay",
  ".vno-cell-styles-dialog",
  ".vno-format-table-dialog",
  ".vno-format-cells-overlay",
  ".vno-citation-dialog-overlay",
  ".vno-caption-dialog-overlay",
  ".vno-options-overlay",
  ".vno-recovery-dialog",
  "[role='dialog']",
  "[role='alertdialog']"
].join(", ");

/**
 * Xác định loại ứng dụng hiện tại: "writer" | "sheet" | "slides" | null
 * @returns {"writer"|"sheet"|"slides"|null}
 */
export function getCurrentAppKind() {
  if (typeof document === "undefined" || typeof document.querySelector !== "function") return null;
  const shell = document.querySelector(".vno-shell");
  if (shell?.getAttribute("data-app")) return shell.getAttribute("data-app");
  if (typeof window !== "undefined") {
    if (window.__vnoAppInstance?.shell?.appName) {
      return window.__vnoAppInstance.shell.appName;
    }
    if (window.location && window.location.search) {
      const q = new URLSearchParams(window.location.search).get("app");
      if (q === "writer" || q === "sheet" || q === "slides") return q;
    }
  }
  if (document.querySelector(".vno-writer-body")) return "writer";
  if (document.querySelector(".vno-sheet-container, #vno-sheet-grid, .vno-grid-table")) return "sheet";
  if (document.querySelector(".vno-slide-canvas, .vno-slides-workspace")) return "slides";
  return null;
}

/**
 * Kiểm tra xem hiện tại có bất kỳ hộp thoại / modal / backstage / overlay nào đang hiển thị không.
 * @param {Document|HTMLElement} [root=document]
 * @returns {boolean}
 */
export function hasOpenDialog(root = (typeof document !== "undefined" ? document : null)) {
  if (!root || typeof root.querySelectorAll !== "function") return false;
  const overlays = root.querySelectorAll(DIALOG_SELECTORS);
  for (const el of overlays) {
    if (el.closest?.(".vno-ribbon, .vno-topbar, .vno-statusbar")) continue;
    // Bỏ qua nếu bị ẩn trong DOM
    if (el.style?.display === "none" || el.hidden) continue;
    if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects?.().length === 0) continue;
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
  // Loại trừ các thành phần giao diện khung ngoài, ribbon, dialog, backstage
  if (el.closest?.(".vno-ribbon, .vno-topbar, .vno-statusbar, .vno-dialog-overlay, .vno-dialog-box, .vno-backstage-overlay, .vno-notification-host, .vno-about-dialog")) {
    return false;
  }

  // 1. Doc (Writer)
  if (el.matches?.(".vno-writer-body, .vno-writer-header, .vno-writer-footer") ||
      el.closest?.(".vno-writer-body, .vno-writer-header, .vno-writer-footer")) {
    return true;
  }

  // 2. Sheet
  if (el.matches?.(".vno-sheet-container, .vno-grid-table, .vno-grid-viewport, .vno-formula-input, .vno-cell-editor, [data-coord]") ||
      el.closest?.(".vno-sheet-container, .vno-grid-container")) {
    return true;
  }

  // 3. Slide
  if (el.matches?.(".vno-slide-canvas, .vno-slide-title, .vno-slide-body, .vno-shape-text, .vno-shape-item") ||
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
  if (typeof document === "undefined" || !document.body || typeof document.querySelector !== "function") return false;
  if (!options.force && hasOpenDialog()) return false;

  const currentActive = document.activeElement;
  const keyboardInvoker = getDialogKeyboardRibbonInvoker();
  if (keyboardInvoker && currentActive === keyboardInvoker) return true;
  const isOutsideControl = currentActive && (
    currentActive.tagName === "BUTTON" ||
    currentActive.matches?.(".vno-ribbon-tab, .vno-btn, select, [role='tab'], [role='menuitem'], [data-command-id]")
  );

  // 1. Nếu tiêu điểm hiện tại ĐÃ LÀ một phần tử soạn thảo hợp lệ và không kẹt trên control ngoài
  if (!isOutsideControl && currentActive && isEditorElement(currentActive)) {
    // Tiêu điểm đã ở đúng phần tử đang soạn thảo (hộp chữ, ô tính, canvas, doc body)
    // Không làm gì cả để tránh tạo bước lịch sử thừa hoặc làm hỏng undo
    _capturedFocusTarget = null;
    _capturedRange = null;
    return true;
  }

  // Làm mờ bất kỳ nút bấm hoặc control nào ngoài editor đang giữ focus
  if (isOutsideControl) {
    try { currentActive.blur(); } catch (_) {}
  }

  const app = getCurrentAppKind();

  // --- 1. DOC (WRITER) ---
  if (app === "writer") {
    const body = document.querySelector(".vno-writer-body[contenteditable='true']")
      || document.querySelector(".vno-writer-body");
    if (!body) return false;

    let target = body;
    if (_capturedFocusTarget && document.body.contains(_capturedFocusTarget) && isEditorElement(_capturedFocusTarget)) {
      target = _capturedFocusTarget;
    }
    const capturedRange = _capturedRange;
    _capturedFocusTarget = null;
    _capturedRange = null;

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
        if (capturedRange && target.contains(capturedRange.startContainer)) {
          try {
            sel.removeAllRanges();
            sel.addRange(capturedRange);
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

  // --- 2. SHEET ---
  if (app === "sheet") {
    _capturedFocusTarget = null;
    _capturedRange = null;

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
      if (!container.hasAttribute("tabindex") || container.tabIndex < 0) {
        container.setAttribute("tabindex", "0");
      }
      try {
        container.focus({ preventScroll: true });
      } catch (_) {
        try { container.focus(); } catch (__) {}
      }
      return true;
    }
    return false;
  }

  // --- 3. SLIDE ---
  if (app === "slides") {
    const canvasController = typeof window !== "undefined" ? window.__vnoAppInstance?.canvasController : null;

    // A. Nếu có text box đã được capture trước đó khi bấm nút ngoài (Ribbon/Dialog)
    if (_capturedFocusTarget && document.body.contains(_capturedFocusTarget) && isEditorElement(_capturedFocusTarget) && _capturedFocusTarget.isContentEditable) {
      const target = _capturedFocusTarget;
      _capturedFocusTarget = null;
      _capturedRange = null;
      try {
        target.focus({ preventScroll: true });
        return true;
      } catch (_) {}
    }
    _capturedFocusTarget = null;
    _capturedRange = null;

    // B. Nếu có phần tử đang sửa dở (is-editing hoặc is-selected)
    const editingEl = document.querySelector(".vno-slide-title.is-editing, .vno-slide-body.is-selected, [contenteditable='true'].is-selected");
    if (editingEl) {
      try {
        editingEl.focus({ preventScroll: true });
        return true;
      } catch (_) {}
    }

    // C. Nếu selectedTarget chỉ rõ hộp chữ đang được chọn
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

    // D. Mặc định: focus vào slide canvas để không mất phím và Enter an toàn
    const canvas = canvasController?.canvasEl
      || document.querySelector(".vno-slide-canvas")
      || document.querySelector(".vno-slides-workspace");
    if (canvas) {
      if (!canvas.hasAttribute("tabindex") || canvas.tabIndex < 0) {
        canvas.setAttribute("tabindex", "0");
      }
      try {
        canvas.focus({ preventScroll: true });
      } catch (_) {
        try { canvas.focus(); } catch (__) {}
      }
      return true;
    }
    return false;
  }

  _capturedFocusTarget = null;
  _capturedRange = null;
  return false;
}

/**
 * Cài đặt cơ chế bảo vệ tiêu điểm toàn cục (Global Focus Guard).
 * Giám sát tự động:
 * 1. Lưu tiêu điểm trước khi người dùng click vào Ribbon/Toolbar.
 * 2. Trả tiêu điểm về editor sau khi lệnh Ribbon hoặc tab click kết thúc.
 * 3. Tự động trả tiêu điểm khi bất kỳ Dialog Overlay nào bị gỡ bỏ khỏi DOM hoặc bị ẩn.
 * 4. Tự động trả tiêu điểm khi cửa sổ ứng dụng nhận lại tiêu điểm (Window Focus / visibilitychange).
 * 5. Bảo vệ phím Enter: ngăn Enter kích hoạt nhầm các nút ngoài editor khi không có dialog nào mở.
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
      ".vno-ribbon-group-row button, .vno-ribbon-group-column button, [data-command-id], " +
      ".vno-ribbon button, .vno-topbar button, .vno-statusbar button"
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
    const isDialogNode = (n) => n && n.nodeType === 1 && (
      n.matches?.(DIALOG_SELECTORS) || n.querySelector?.(DIALOG_SELECTORS)
    );

    const observer = new MutationObserver((mutations) => {
      let dialogChanged = false;
      for (const m of mutations) {
        if (m.type === "childList") {
          for (const node of m.addedNodes) {
            if (isDialogNode(node)) {
              if (_pendingKeyboardRibbonInvoker?.isConnected) {
                _dialogKeyboardRibbonInvoker = _pendingKeyboardRibbonInvoker;
                _pendingKeyboardRibbonInvoker = null;
              }
              dialogChanged = true;
              break;
            }
          }
          if (dialogChanged) break;
          for (const node of m.removedNodes) {
            if (isDialogNode(node)) {
              dialogChanged = true;
              break;
            }
          }
        } else if (m.type === "attributes") {
          if (isDialogNode(m.target)) {
            dialogChanged = true;
            break;
          }
        }
        if (dialogChanged) break;
      }
      if (dialogChanged) {
        setTimeout(() => {
          if (!hasOpenDialog()) {
            const invoker = getDialogKeyboardRibbonInvoker();
            if (invoker) {
              invoker.focus();
              setTimeout(() => {
                if (_dialogKeyboardRibbonInvoker === invoker) clearKeyboardRibbonInvoker();
              }, 750);
            } else {
              _pendingKeyboardRibbonInvoker = null;
              restoreEditorFocus();
            }
          }
        }, 0);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "hidden", "class"]
    });
  }

  // 4. Lắng nghe khi cửa sổ nhận lại tiêu điểm (Alt+Tab hoặc activateTarget / bringToFront)
  window.addEventListener("focus", () => {
    setTimeout(() => {
      if (!hasOpenDialog()) {
        restoreEditorFocus();
      }
    }, 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      setTimeout(() => {
        if (!hasOpenDialog()) {
          restoreEditorFocus();
        }
      }, 0);
    }
  });

  // 5. Bảo vệ phím Enter: Ngăn Enter kích hoạt nhầm nút ngoài editor khi không có dialog
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const active = document.activeElement;
      const isRibbonControl = active?.closest?.(".vno-ribbon");
      if (!isRibbonControl && active && (active.tagName === "BUTTON" || active.matches?.(".vno-ribbon-tab, [role='tab'], [role='menuitem']"))) {
        if (!hasOpenDialog()) {
          event.preventDefault();
          event.stopPropagation();
          restoreEditorFocus();
          const app = getCurrentAppKind();
          if (app === "sheet") {
            const grid = window.__vnoAppInstance?.grid;
            if (grid && typeof grid.moveSelection === "function") {
              grid.moveSelection(0, 1);
            }
          }
        }
      }
    }
  }, true);
}
