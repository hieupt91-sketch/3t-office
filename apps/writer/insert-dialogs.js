/**
 * VN Writer — Insert dialogs (Equation, Bookmark, Cross-reference)
 * Rút gọn so với Word: phương trình là hộp text/MathML cơ bản, không có trình soạn đồ họa.
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

export function slugBookmarkName(name) {
  const slug = String(name || "bookmark")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "bookmark";
}

const EQUATION_PRESETS = [
  "E = mc²",
  "a² + b² = c²",
  "x = (−b ± √(b² − 4ac)) / 2a",
  "∑ᵢ xᵢ / n"
];

/**
 * @param {Object} [options]
 * @param {string} [options.expression]
 * @returns {Promise<string|null>}
 */
export function showEquationDialog(options = {}) {
  const defaultExpr = options.expression || "E = mc²";
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve(defaultExpr);
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "equation";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 460px;" role="dialog" aria-modal="true" aria-labelledby="vno-equation-title">
        <div class="vno-dialog-header">
          <span id="vno-equation-title">${isEn ? "Equation" : "Công thức"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px;">
          <p style="margin:0;font-size:12px;color:#64748b;">
            ${isEn
              ? "Reduced editor: insert a styled math text box. No graphical equation designer."
              : "Bản rút gọn: chèn hộp công thức dạng chữ. Không có trình soạn đồ họa như Word."}
          </p>
          <label for="vno-equation-input" style="font-size:13px;font-weight:500;">${isEn ? "Expression" : "Biểu thức"}</label>
          <input id="vno-equation-input" class="vno-dialog-input" type="text" value="${defaultExpr.replace(/"/g, "&quot;")}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;font-family:Cambria,'Times New Roman',serif;font-style:italic;font-size:16px;" />
          <div class="vno-equation-presets" style="display:flex;flex-wrap:wrap;gap:6px;">
            ${EQUATION_PRESETS.map(preset => `<button type="button" class="vno-btn vno-equation-preset" data-equation="${preset.replace(/"/g, "&quot;")}">${preset}</button>`).join("")}
          </div>
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert" : "Chèn"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const input = overlay.querySelector("#vno-equation-input");
    input.focus();
    input.select();

    overlay.querySelectorAll(".vno-equation-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        input.value = btn.getAttribute("data-equation") || "";
        input.focus();
      });
    });

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => cleanup((input.value || "").trim() || null));
    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      } else if (event.key === "Enter") {
        event.preventDefault();
        cleanup((input.value || "").trim() || null);
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

/**
 * @param {Object} [options]
 * @param {string} [options.name]
 * @returns {Promise<string|null>}
 */
export function showBookmarkDialog(options = {}) {
  const defaultName = options.name || "bookmark1";
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve(defaultName);
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "bookmark";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 420px;" role="dialog" aria-modal="true" aria-labelledby="vno-bookmark-title">
        <div class="vno-dialog-header">
          <span id="vno-bookmark-title">${isEn ? "Bookmark" : "Đánh dấu"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px;">
          <label for="vno-bookmark-input" style="font-size:13px;font-weight:500;">${isEn ? "Bookmark name" : "Tên đánh dấu"}</label>
          <input id="vno-bookmark-input" class="vno-dialog-input" type="text" value="${String(defaultName).replace(/"/g, "&quot;")}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;font-size:13px;" />
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert" : "Chèn"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const input = overlay.querySelector("#vno-bookmark-input");
    input.focus();
    input.select();

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => cleanup((input.value || "").trim() || null));
    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      } else if (event.key === "Enter") {
        event.preventDefault();
        cleanup((input.value || "").trim() || null);
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

/**
 * @param {Array<{id:string,type:string,label:string}>} targets
 * @returns {Promise<{targetId:string,display:string,type:string}|null>}
 */
export function showCrossReferenceDialog(targets = []) {
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve(targets[0] ? { targetId: targets[0].id, display: targets[0].label, type: targets[0].type } : null);
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "cross-reference";
    const empty = !targets.length;
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 460px;" role="dialog" aria-modal="true" aria-labelledby="vno-xref-title">
        <div class="vno-dialog-header">
          <span id="vno-xref-title">${isEn ? "Cross-reference" : "Tham chiếu chéo"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px;">
          <p style="margin:0;font-size:12px;color:#64748b;">
            ${isEn
              ? "Insert an internal link to a heading or bookmark. Reduced: heading text / bookmark name only."
              : "Chèn liên kết nội bộ tới tiêu đề hoặc đánh dấu. Bản rút gọn: chỉ hiện tên tiêu đề / bookmark."}
          </p>
          ${empty
            ? `<p class="vno-xref-empty" style="margin:0;font-size:13px;color:#b45309;">${isEn ? "No headings or bookmarks yet." : "Chưa có tiêu đề hoặc đánh dấu nào."}</p>`
            : `<label for="vno-xref-select" style="font-size:13px;font-weight:500;">${isEn ? "Reference to" : "Tham chiếu tới"}</label>
               <select id="vno-xref-select" class="vno-dialog-input" style="width:100%;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;">
                 ${targets.map(item => `<option value="${item.id}" data-xref-type="${item.type}">${item.type === "bookmark" ? "⚑ " : "H "}${item.label}</option>`).join("")}
               </select>`}
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn" ${empty ? "disabled" : ""}>${isEn ? "Insert" : "Chèn"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const select = overlay.querySelector("#vno-xref-select");
    select?.focus();

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      if (!select || empty) return cleanup(null);
      const option = select.selectedOptions[0];
      const target = targets.find(item => item.id === select.value) || targets[0];
      cleanup({
        targetId: select.value,
        display: target?.label || option?.textContent || select.value,
        type: option?.getAttribute("data-xref-type") || target?.type || "bookmark"
      });
    });
    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      } else if (event.key === "Enter" && !empty) {
        event.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
