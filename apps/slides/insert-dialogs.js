/**
 * 3T Slide — Insert dialogs (Table size, Header & Footer)
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

/**
 * @param {Object} [options]
 * @param {number} [options.rows]
 * @param {number} [options.cols]
 * @returns {Promise<{rows:number, cols:number}|null>}
 */
export function showSlideTableDialog(options = {}) {
  const defaultRows = Math.max(1, Math.min(12, Number(options.rows) || 3));
  const defaultCols = Math.max(1, Math.min(12, Number(options.cols) || 3));
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve({ rows: defaultRows, cols: defaultCols });
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "slide-table";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 400px;" role="dialog" aria-modal="true" aria-labelledby="vno-slide-table-title">
        <div class="vno-dialog-header">
          <span id="vno-slide-table-title">${isEn ? "Insert Table" : "Chèn bảng"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <label for="vno-slide-table-rows" style="font-size:13px;font-weight:500;">${isEn ? "Number of rows" : "Số hàng"}</label>
          <input id="vno-slide-table-rows" type="number" min="1" max="12" value="${defaultRows}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;" />
          <label for="vno-slide-table-cols" style="font-size:13px;font-weight:500;">${isEn ? "Number of columns" : "Số cột"}</label>
          <input id="vno-slide-table-cols" type="number" min="1" max="12" value="${defaultCols}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;" />
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert" : "Chèn"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const rowsInput = overlay.querySelector("#vno-slide-table-rows");
    const colsInput = overlay.querySelector("#vno-slide-table-cols");
    rowsInput.focus();

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    const commit = () => {
      const rows = Math.max(1, Math.min(12, parseInt(rowsInput.value, 10) || defaultRows));
      const cols = Math.max(1, Math.min(12, parseInt(colsInput.value, 10) || defaultCols));
      cleanup({ rows, cols });
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", commit);
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
        commit();
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

/**
 * @param {Object} [current]
 * @returns {Promise<{showDate:boolean,showSlideNumber:boolean,showFooter:boolean,footerText:string,applyToAll:boolean}|null>}
 */
export function showHeaderFooterDialog(current = {}) {
  const defaults = {
    showDate: Boolean(current.showDate),
    showSlideNumber: current.showSlideNumber !== false,
    showFooter: current.showFooter !== false,
    footerText: current.footerText || "",
    applyToAll: current.applyToAll !== false
  };
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve(defaults);
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "header-footer";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 460px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-hf-title">
        <div class="vno-dialog-header">
          <span id="vno-hf-title">${isEn ? "Header and Footer" : "Đầu trang & Chân trang"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
            <input type="checkbox" id="vno-hf-date" ${defaults.showDate ? "checked" : ""} />
            ${isEn ? "Date and time" : "Ngày tháng"}
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
            <input type="checkbox" id="vno-hf-number" ${defaults.showSlideNumber ? "checked" : ""} />
            ${isEn ? "Slide number" : "Số trang chiếu"}
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
            <input type="checkbox" id="vno-hf-footer" ${defaults.showFooter ? "checked" : ""} />
            ${isEn ? "Footer" : "Chân trang"}
          </label>
          <input id="vno-hf-text" type="text" value="${String(defaults.footerText).replace(/"/g, "&quot;")}"
            placeholder="${isEn ? "Footer text" : "Nội dung chân trang"}"
            aria-label="${isEn ? "Footer text" : "Nội dung chân trang"}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;background:var(--vno-bg-surface);color:var(--vno-text-primary);" />
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
            <input type="checkbox" id="vno-hf-all" ${defaults.applyToAll ? "checked" : ""} />
            ${isEn ? "Apply to all slides" : "Áp dụng cho mọi trang chiếu"}
          </label>
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Apply" : "Áp dụng"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    const commit = () => {
      cleanup({
        showDate: overlay.querySelector("#vno-hf-date").checked,
        showSlideNumber: overlay.querySelector("#vno-hf-number").checked,
        showFooter: overlay.querySelector("#vno-hf-footer").checked,
        footerText: overlay.querySelector("#vno-hf-text").value || "",
        applyToAll: overlay.querySelector("#vno-hf-all").checked
      });
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", commit);
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
        commit();
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    overlay.querySelector(".vno-dialog-ok-btn")?.focus();
  });
}

import { WORDART_PRESETS, resolveWordArtPreset, resolveWordArtStyle, buildWordArtCss, applyWordArtCss } from "./slides-wordart.js";
export { WORDART_PRESETS, resolveWordArtPreset, resolveWordArtStyle, buildWordArtCss, applyWordArtCss } from "./slides-wordart.js";

export function showWordArtDialog(options = {}) {
  const defaultText = String(options.text || "3T Office");
  const defaultPreset = resolveWordArtPreset(options.presetId || options.styleId).id;
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve({ text: defaultText, presetId: defaultPreset });
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "wordart";
    const cards = WORDART_PRESETS.map((preset, index) => {
      const selected = preset.id === defaultPreset || (!options.presetId && index === 0);
      const label = isEn ? preset.nameEn : preset.nameVi;
      return `<button type="button" role="radio" class="vno-wordart-preset ${selected ? "is-selected" : ""}" data-wordart-preset="${preset.id}" aria-checked="${selected}" tabindex="${selected ? "0" : "-1"}" aria-label="${label}" style="background:${preset.previewBg}">
        <span class="vno-wordart-preview" aria-hidden="true" style="${buildWordArtCss(preset, { fontScale: 0.55 })}">Aa</span>
        <strong class="vno-wordart-preset-name">${label}</strong>
      </button>`;
    }).join("");
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 640px;" role="dialog" aria-modal="true" aria-labelledby="vno-wordart-title">
        <div class="vno-dialog-header">
          <span id="vno-wordart-title">${isEn ? "Insert WordArt" : "Chèn chữ nghệ thuật"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <label for="vno-wordart-text" style="font-size:13px;font-weight:500;">${isEn ? "Text" : "Nội dung chữ"}</label>
          <input id="vno-wordart-text" type="text" value="${String(defaultText).replace(/"/g, "&quot;")}" maxlength="80"
            placeholder="${isEn ? "Enter title text" : "Nhập chữ tiêu đề"}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;" />
          <div id="vno-wordart-gallery" class="vno-wordart-gallery" role="radiogroup" aria-labelledby="vno-wordart-title">
            ${cards}
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
    const textInput = overlay.querySelector("#vno-wordart-text");
    let selectedPreset = defaultPreset;
    const presetButtons = overlay.querySelectorAll(".vno-wordart-preset");
    presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        presetButtons.forEach((item) => {
          item.classList.remove("is-selected");
          item.setAttribute("aria-checked", "false");
          item.setAttribute("tabindex", "-1");
        });
        button.classList.add("is-selected");
        button.setAttribute("aria-checked", "true");
        button.setAttribute("tabindex", "0");
        selectedPreset = button.dataset.wordartPreset;
      });
    });
    const gallery = overlay.querySelector("#vno-wordart-gallery");
    gallery?.addEventListener("keydown", (event) => {
      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const buttons = Array.from(presetButtons);
        const curIdx = buttons.indexOf(document.activeElement);
        let nextIdx;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % buttons.length;
        } else {
          nextIdx = curIdx === -1 ? buttons.length - 1 : (curIdx - 1 + buttons.length) % buttons.length;
        }
        buttons.forEach((b, i) => {
          b.classList.remove("is-selected");
          b.setAttribute("aria-checked", i === nextIdx ? "true" : "false");
          b.setAttribute("tabindex", i === nextIdx ? "0" : "-1");
        });
        buttons[nextIdx]?.click();
        buttons[nextIdx]?.focus();
      }
    });
    textInput.focus();
    textInput.select?.();

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    const commit = () => {
      const text = String(textInput.value || "").trim() || defaultText;
      cleanup({ text, presetId: selectedPreset });
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", commit);
    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cleanup(null);
      } else if (event.key === "Enter" && event.target === textInput) {
        event.preventDefault();
        event.stopPropagation();
        commit();
      } else if (event.key === "Tab") {
        event.stopPropagation();
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
