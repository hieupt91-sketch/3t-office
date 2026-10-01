/**
 * 3T Office — Shared Find/Replace Dialog
 * Hộp thoại Tìm kiếm và Thay thế dùng chung chuẩn Microsoft Office cho 3T Doc, 3T Sheet, 3T Slide.
 * Hai tab: Tìm (Ctrl+F), Thay thế (Ctrl+H).
 * Phím tắt: Enter (Tìm tiếp), Shift+Enter (Tìm trước), Esc (Đóng), F3 / Shift+F3 (Tìm tiếp / Tìm trước sau khi đóng).
 */

import { t } from "../i18n/i18n.js";

let dialogCounter = 0;

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

export let lastFindSession = {
  findText: "",
  replaceText: "",
  options: {
    matchCase: false,
    wholeWord: false,
    ignoreDiacritics: false,
    scope: "sheet",
    searchBy: "rows",
    lookIn: "values",
    direction: "forward"
  },
  app: "writer",
  onFind: null,
  onFindPrev: null,
  onReplace: null,
  onReplaceAll: null
};

export function getLastFindSession() {
  return { ...lastFindSession, options: { ...lastFindSession.options } };
}

export function setLastFindSession(session) {
  lastFindSession = {
    ...lastFindSession,
    ...session,
    options: { ...lastFindSession.options, ...(session?.options || {}) }
  };
}

export function findNextFromSession() {
  if (!lastFindSession.findText) return false;
  const opts = { ...lastFindSession.options, direction: "forward" };
  if (typeof lastFindSession.onFind === "function") {
    return lastFindSession.onFind(lastFindSession.findText, opts);
  }
  return false;
}

export function findPrevFromSession() {
  if (!lastFindSession.findText) return false;
  const opts = { ...lastFindSession.options, direction: "backward" };
  if (typeof lastFindSession.onFindPrev === "function") {
    return lastFindSession.onFindPrev(lastFindSession.findText, opts);
  }
  if (typeof lastFindSession.onFind === "function") {
    return lastFindSession.onFind(lastFindSession.findText, opts);
  }
  return false;
}

// Global F3 / Shift+F3 listener for find next/previous after dialog is closed
let f3ListenerAttached = false;
export function attachF3GlobalListener(win = (typeof window !== "undefined" ? window : null)) {
  if (!win || f3ListenerAttached) return;
  f3ListenerAttached = true;
  win.addEventListener("keydown", (e) => {
    if (e.key === "F3" && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Don't intercept if dialog is currently open
      if (typeof document !== "undefined" && document.querySelector(".vno-fr-dialog-overlay")) {
        return;
      }
      if (lastFindSession.findText) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          findPrevFromSession();
        } else {
          findNextFromSession();
        }
      }
    }
  }, true);
}

// Auto attach if window exists
if (typeof window !== "undefined") {
  attachF3GlobalListener(window);
}

/**
 * Hiển thị Hộp thoại Tìm kiếm và Thay thế dùng chung cho cả 3 ứng dụng
 * @param {Object} options
 * @param {boolean} [options.isReplace=false]
 * @param {string} [options.app="writer"] - "writer" | "sheet" | "slides"
 * @param {Function} [options.onFind] - (text, options) => boolean|any
 * @param {Function} [options.onFindPrev] - (text, options) => boolean|any
 * @param {Function} [options.onReplace] - (findText, replaceText, options) => boolean|any
 * @param {Function} [options.onReplaceAll] - (findText, replaceText, options) => number
 * @param {Function} [options.onClose] - () => void
 * @returns {HTMLElement|null}
 */
export function showFindReplaceDialog({
  isReplace = false,
  app = "writer",
  onFind,
  onFindPrev,
  onReplace,
  onReplaceAll,
  onClose
} = {}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return null;
  }

  // Close any existing find/replace dialog first
  const existing = document.querySelector(".vno-fr-dialog-overlay");
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  // Detect app if not explicitly given
  if (!app || app === "writer") {
    if (document.querySelector(".vno-grid-container") || document.querySelector("#vno-sheet-grid")) {
      app = "sheet";
    } else if (document.querySelector(".vno-slides-workspace") || document.querySelector("#vno-slides-canvas")) {
      app = "slides";
    }
  }

  const isSheet = app === "sheet";
  const previousFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-fr-dialog-overlay";
  const titleId = `vno-fr-dialog-title-${++dialogCounter}`;

  let currentTab = isReplace ? "replace" : "find";

  // Pre-fill from last session if available
  const initialFindText = lastFindSession.findText || "";
  const initialReplaceText = lastFindSession.replaceText || "";
  const initialOptions = { ...lastFindSession.options };

  overlay.innerHTML = `
    <div class="vno-dialog-box vno-fr-dialog-box" style="width: 520px; max-width: calc(100vw - 32px); box-shadow: 0 8px 32px rgba(0,0,0,0.18);" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <!-- Header -->
      <div class="vno-dialog-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--vno-border-default, #e5e7eb); padding: 10px 16px;">
        <span id="${titleId}" style="font-weight:700; font-size:14px; color:var(--vno-text-primary, #111827);">${t("findReplace.dialogTitle", t("dialog.findReplace", "Tìm kiếm và Thay thế"))}</span>
        <button class="vno-btn vno-btn-icon-only vno-fr-close vno-dialog-close-btn" title="Đóng (Esc)" aria-label="Đóng" style="font-size:18px; line-height:1; padding:2px 6px;">&times;</button>
      </div>

      <!-- Tab header (Tìm | Thay thế) -->
      <div class="vno-fr-tabs" role="tablist" style="display:flex; border-bottom:1px solid var(--vno-border-default, #e5e7eb); background:var(--vno-bg-panel, #f9fafb); padding: 0 12px;">
        <button id="vno-fr-tab-find" class="vno-fr-tab ${currentTab === "find" ? "active" : ""}" role="tab" aria-selected="${currentTab === "find"}" style="padding:8px 16px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:600; color:${currentTab === "find" ? "var(--vno-primary, #0284c7)" : "var(--vno-text-secondary, #6b7280)"}; border-bottom:${currentTab === "find" ? "2px solid var(--vno-primary, #0284c7)" : "2px solid transparent"}; outline:none;">${t("findReplace.tabFind", "Tìm")}</button>
        <button id="vno-fr-tab-replace" class="vno-fr-tab ${currentTab === "replace" ? "active" : ""}" role="tab" aria-selected="${currentTab === "replace"}" style="padding:8px 16px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:600; color:${currentTab === "replace" ? "var(--vno-primary, #0284c7)" : "var(--vno-text-secondary, #6b7280)"}; border-bottom:${currentTab === "replace" ? "2px solid var(--vno-primary, #0284c7)" : "2px solid transparent"}; outline:none;">${t("findReplace.tabReplace", "Thay thế")}</button>
      </div>

      <!-- Dialog Body -->
      <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:12px; padding:16px;">
        <!-- Field Tìm gì -->
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label for="vno-fr-find-input" style="font-size:12px; font-weight:600; color:var(--vno-text-secondary, #4b5563);">${t("findReplace.findWhat", "Tìm gì:")}</label>
          <input type="text" id="vno-fr-find-input" class="vno-dialog-input" value="${initialFindText}" placeholder="${t("findReplace.findPlaceholder", "Nhập từ hoặc cụm từ cần tìm...")}"
                 style="padding:7px 10px; border:1px solid var(--vno-border-default, #d1d5db); border-radius:var(--vno-radius-md, 4px); font-size:13px; width:100%; box-sizing:border-box; background:var(--vno-bg-surface, #ffffff); color:var(--vno-text-primary, #111827);" />
        </div>

        <!-- Field Thay bằng (chỉ hiện khi ở tab Thay thế) -->
        <div id="vno-fr-replace-row" style="display:${currentTab === "replace" ? "flex" : "none"}; flex-direction:column; gap:4px;">
          <label for="vno-fr-replace-input" style="font-size:12px; font-weight:600; color:var(--vno-text-secondary, #4b5563);">${t("findReplace.replaceWith", "Thay bằng:")}</label>
          <input type="text" id="vno-fr-replace-input" class="vno-dialog-input" value="${initialReplaceText}" placeholder="${t("findReplace.replacePlaceholder", "Nhập nội dung thay thế...")}"
                 style="padding:7px 10px; border:1px solid var(--vno-border-default, #d1d5db); border-radius:var(--vno-radius-md, 4px); font-size:13px; width:100%; box-sizing:border-box; background:var(--vno-bg-surface, #ffffff); color:var(--vno-text-primary, #111827);" />
        </div>

        <!-- Common Options -->
        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; padding-top:4px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--vno-text-primary, #374151); cursor:pointer; user-select:none;">
            <input type="checkbox" id="vno-fr-opt-case" ${initialOptions.matchCase ? "checked" : ""} />
            <span>${t("findReplace.matchCase", "Khớp chữ hoa/thường")}</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--vno-text-primary, #374151); cursor:pointer; user-select:none;">
            <input type="checkbox" id="vno-fr-opt-word" ${initialOptions.wholeWord ? "checked" : ""} />
            <span>${t("findReplace.wholeWord", "Chỉ toàn bộ từ")}</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--vno-text-primary, #374151); cursor:pointer; user-select:none;">
            <input type="checkbox" id="vno-fr-opt-diacritics" ${initialOptions.ignoreDiacritics ? "checked" : ""} />
            <span>${t("findReplace.ignoreDiacritics", "Bỏ qua dấu")}</span>
          </label>
        </div>

        <!-- Sheet-specific options -->
        <div id="vno-fr-sheet-options" style="display:${isSheet ? "grid" : "none"}; grid-template-columns: repeat(3, 1fr); gap:12px; padding:10px; background:var(--vno-bg-panel, #f3f4f6); border-radius:var(--vno-radius-md, 4px); border:1px solid var(--vno-border-default, #e5e7eb);">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="vno-fr-opt-scope" style="font-size:11px; font-weight:600; color:var(--vno-text-secondary, #4b5563);">${t("findReplace.within", "Tìm trong:")}</label>
            <select id="vno-fr-opt-scope" style="padding:4px 6px; font-size:12px; border:1px solid var(--vno-border-default, #d1d5db); border-radius:var(--vno-radius-sm, 3px); background:var(--vno-bg-surface, #fff); color:var(--vno-text-primary, #111827);">
              <option value="sheet" ${initialOptions.scope !== "workbook" ? "selected" : ""}>${t("findReplace.scopeSheet", "Trang tính")}</option>
              <option value="workbook" ${initialOptions.scope === "workbook" ? "selected" : ""}>${t("findReplace.scopeWorkbook", "Sổ làm việc")}</option>
            </select>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="vno-fr-opt-direction" style="font-size:11px; font-weight:600; color:var(--vno-text-secondary, #4b5563);">${t("findReplace.searchBy", "Tìm theo:")}</label>
            <select id="vno-fr-opt-direction" style="padding:4px 6px; font-size:12px; border:1px solid var(--vno-border-default, #d1d5db); border-radius:var(--vno-radius-sm, 3px); background:var(--vno-bg-surface, #fff); color:var(--vno-text-primary, #111827);">
              <option value="rows" ${initialOptions.searchBy !== "columns" ? "selected" : ""}>${t("findReplace.byRows", "Hàng")}</option>
              <option value="columns" ${initialOptions.searchBy === "columns" ? "selected" : ""}>${t("findReplace.byColumns", "Cột")}</option>
            </select>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="vno-fr-opt-lookin" style="font-size:11px; font-weight:600; color:var(--vno-text-secondary, #4b5563);">${t("findReplace.lookIn", "Tìm trong:")}</label>
            <select id="vno-fr-opt-lookin" style="padding:4px 6px; font-size:12px; border:1px solid var(--vno-border-default, #d1d5db); border-radius:var(--vno-radius-sm, 3px); background:var(--vno-bg-surface, #fff); color:var(--vno-text-primary, #111827);">
              <option value="values" ${initialOptions.lookIn !== "formulas" ? "selected" : ""}>${t("findReplace.lookInValues", "Giá trị")}</option>
              <option value="formulas" ${initialOptions.lookIn === "formulas" ? "selected" : ""}>${t("findReplace.lookInFormulas", "Công thức")}</option>
            </select>
          </div>
        </div>

        <!-- Status message -->
        <div id="vno-fr-status" role="status" aria-live="polite" style="font-size:12px; color:var(--vno-text-secondary, #6b7280); min-height:18px;"></div>
      </div>

      <!-- Footer Buttons -->
      <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px; padding:12px 16px; border-top:1px solid var(--vno-border-default, #e5e7eb); background:var(--vno-bg-panel, #f9fafb); flex-wrap:wrap;">
        <button class="vno-btn vno-fr-btn-secondary" id="vno-fr-find-prev-btn" title="Tìm trước (Shift+Enter)">${t("findReplace.btnFindPrev", "Tìm trước")}</button>
        <button class="vno-btn vno-btn-primary" id="vno-fr-find-next-btn" title="Tìm tiếp (Enter)">${t("findReplace.btnFindNext", "Tìm tiếp")}</button>
        <button class="vno-btn" id="vno-fr-replace-btn" style="display:${currentTab === "replace" ? "inline-flex" : "none"};">${t("findReplace.btnReplace", "Thay thế")}</button>
        <button class="vno-btn" id="vno-fr-replace-all-btn" style="display:${currentTab === "replace" ? "inline-flex" : "none"};">${t("findReplace.btnReplaceAll", "Thay thế tất cả")}</button>
        <button class="vno-btn vno-fr-close-btn" id="vno-fr-close-btn" title="Đóng (Esc)">${t("findReplace.btnClose", "Đóng")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const dialogBox = overlay.querySelector(".vno-dialog-box");

  const tabFind = overlay.querySelector("#vno-fr-tab-find");
  const tabReplace = overlay.querySelector("#vno-fr-tab-replace");
  const findInput = overlay.querySelector("#vno-fr-find-input");
  const replaceInput = overlay.querySelector("#vno-fr-replace-input");
  const replaceRow = overlay.querySelector("#vno-fr-replace-row");
  const optCase = overlay.querySelector("#vno-fr-opt-case");
  const optWord = overlay.querySelector("#vno-fr-opt-word");
  const optDiacritics = overlay.querySelector("#vno-fr-opt-diacritics");
  const optScope = overlay.querySelector("#vno-fr-opt-scope");
  const optDirection = overlay.querySelector("#vno-fr-opt-direction");
  const optLookin = overlay.querySelector("#vno-fr-opt-lookin");
  const statusEl = overlay.querySelector("#vno-fr-status");

  const findNextBtn = overlay.querySelector("#vno-fr-find-next-btn");
  const findPrevBtn = overlay.querySelector("#vno-fr-find-prev-btn");
  const replaceBtn = overlay.querySelector("#vno-fr-replace-btn");
  const replaceAllBtn = overlay.querySelector("#vno-fr-replace-all-btn");

  const getOptions = (extra = {}) => ({
    matchCase: !!optCase?.checked,
    wholeWord: !!optWord?.checked,
    ignoreDiacritics: !!optDiacritics?.checked,
    scope: optScope ? optScope.value : "sheet",
    searchBy: optDirection ? optDirection.value : "rows",
    lookIn: optLookin ? optLookin.value : "values",
    ...extra
  });

  const syncSession = () => {
    lastFindSession = {
      findText: findInput.value,
      replaceText: replaceInput.value,
      options: getOptions(),
      app,
      onFind,
      onFindPrev,
      onReplace,
      onReplaceAll
    };
  };

  const switchTab = (tabName) => {
    currentTab = tabName;
    const isRep = tabName === "replace";

    tabFind.classList.toggle("active", !isRep);
    tabFind.setAttribute("aria-selected", String(!isRep));
    tabFind.style.color = !isRep ? "var(--vno-primary, #0284c7)" : "var(--vno-text-secondary, #6b7280)";
    tabFind.style.borderBottom = !isRep ? "2px solid var(--vno-primary, #0284c7)" : "2px solid transparent";

    tabReplace.classList.toggle("active", isRep);
    tabReplace.setAttribute("aria-selected", String(isRep));
    tabReplace.style.color = isRep ? "var(--vno-primary, #0284c7)" : "var(--vno-text-secondary, #6b7280)";
    tabReplace.style.borderBottom = isRep ? "2px solid var(--vno-primary, #0284c7)" : "2px solid transparent";

    replaceRow.style.display = isRep ? "flex" : "none";
    replaceBtn.style.display = isRep ? "inline-flex" : "none";
    replaceAllBtn.style.display = isRep ? "inline-flex" : "none";

    if (isRep && findInput.value && !replaceInput.value) {
      replaceInput.focus();
    } else {
      findInput.focus();
    }
    syncSession();
  };

  tabFind.addEventListener("click", () => switchTab("find"));
  tabReplace.addEventListener("click", () => switchTab("replace"));

  const close = () => {
    syncSession();
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (previousFocused && typeof previousFocused.focus === "function") {
      previousFocused.focus();
    }
    if (typeof onClose === "function") {
      onClose();
    }
  };

  overlay.querySelectorAll(".vno-fr-close, .vno-fr-close-btn").forEach((btn) => {
    btn.addEventListener("click", close);
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const doFindNext = () => {
    const text = findInput.value;
    syncSession();
    if (!text) {
      if (statusEl) statusEl.textContent = t("findReplace.emptyInput", "Vui lòng nhập từ hoặc cụm từ cần tìm.");
      return false;
    }
    const opts = getOptions({ direction: "forward" });
    let res = false;
    if (typeof onFind === "function") {
      res = onFind(text, opts);
    }
    if (!res && statusEl) {
      statusEl.textContent = t("findReplace.notFound", "Không tìm thấy nội dung cần tìm.");
    } else if (statusEl) {
      statusEl.textContent = "";
    }
    return res;
  };

  const doFindPrev = () => {
    const text = findInput.value;
    syncSession();
    if (!text) {
      if (statusEl) statusEl.textContent = t("findReplace.emptyInput", "Vui lòng nhập từ hoặc cụm từ cần tìm.");
      return false;
    }
    const opts = getOptions({ direction: "backward" });
    let res = false;
    if (typeof onFindPrev === "function") {
      res = onFindPrev(text, opts);
    } else if (typeof onFind === "function") {
      res = onFind(text, opts);
    }
    if (!res && statusEl) {
      statusEl.textContent = t("findReplace.notFound", "Không tìm thấy nội dung cần tìm.");
    } else if (statusEl) {
      statusEl.textContent = "";
    }
    return res;
  };

  const doReplace = () => {
    const fText = findInput.value;
    const rText = replaceInput.value;
    syncSession();
    if (!fText) {
      if (statusEl) statusEl.textContent = t("findReplace.emptyInput", "Vui lòng nhập từ hoặc cụm từ cần tìm.");
      return false;
    }
    const opts = getOptions();
    let res = false;
    if (typeof onReplace === "function") {
      res = onReplace(fText, rText, opts);
    }
    if (!res && statusEl) {
      statusEl.textContent = t("findReplace.notFoundReplace", "Không tìm thấy nội dung để thay thế.");
    } else if (statusEl) {
      statusEl.textContent = "";
    }
    return res;
  };

  const doReplaceAll = () => {
    const fText = findInput.value;
    const rText = replaceInput.value;
    syncSession();
    if (!fText) {
      if (statusEl) statusEl.textContent = t("findReplace.emptyInput", "Vui lòng nhập từ hoặc cụm từ cần tìm.");
      return 0;
    }
    const opts = getOptions();
    let count = 0;
    if (typeof onReplaceAll === "function") {
      count = onReplaceAll(fText, rText, opts) || 0;
    }
    if (statusEl) {
      if (count > 0) {
        statusEl.textContent = t("findReplace.replacedCount", "Đã hoàn tất tìm kiếm và thực hiện {count} thay thế.").replace("{count}", String(count));
      } else {
        statusEl.textContent = t("findReplace.notFoundReplace", "Không tìm thấy nội dung cần thay thế.");
      }
    }
    return count;
  };

  findNextBtn.addEventListener("click", doFindNext);
  findPrevBtn.addEventListener("click", doFindPrev);
  replaceBtn.addEventListener("click", doReplace);
  replaceAllBtn.addEventListener("click", doReplaceAll);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.ctrlKey && !e.altKey && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      e.stopPropagation();
      switchTab("replace");
    } else if (e.ctrlKey && !e.altKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      e.stopPropagation();
      switchTab("find");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        doFindPrev();
      } else if (document.activeElement === replaceBtn) {
        doReplace();
      } else if (document.activeElement === replaceAllBtn) {
        doReplaceAll();
      } else {
        doFindNext();
      }
    } else if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) {
        doFindPrev();
      } else {
        doFindNext();
      }
    } else if (e.key === "Tab") {
      trapFocus(dialogBox, e);
    }
  };
  document.addEventListener("keydown", onKeyDown);

  // Focus input
  findInput.focus();
  findInput.select();

  syncSession();
  return overlay;
}
