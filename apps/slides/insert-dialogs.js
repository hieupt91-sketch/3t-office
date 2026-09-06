/**
 * VN Slides — Insert dialogs (Table size, Header & Footer)
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

/**
 * Original VN WordArt presets (fill / outline / shadow / gradient).
 * Inspired by common presentation title styles, not Microsoft Office assets.
 */
export const WORDART_PRESETS = [
  {
    id: "navy-outline",
    nameVi: "Xanh đậm viền trắng",
    nameEn: "Navy outline",
    previewBg: "#e2e8f0",
    fontFamily: "Impact, 'Arial Black', Arial, sans-serif",
    fontSize: 48,
    fillColor: "#1e3a8a",
    gradient: null,
    strokeColor: "#ffffff",
    strokeWidth: 2,
    shadow: { offsetX: 3, offsetY: 3, blur: 6, color: "rgba(15, 23, 42, 0.45)" }
  },
  {
    id: "gold-outline",
    nameVi: "Vàng kim viền nâu",
    nameEn: "Gold outline",
    previewBg: "#fff7ed",
    fontFamily: "Impact, 'Arial Black', Arial, sans-serif",
    fontSize: 48,
    fillColor: "#d97706",
    gradient: null,
    strokeColor: "#78350f",
    strokeWidth: 2,
    shadow: { offsetX: 2, offsetY: 3, blur: 4, color: "rgba(120, 53, 15, 0.4)" }
  },
  {
    id: "ocean-gradient",
    nameVi: "Gradient đại dương",
    nameEn: "Ocean gradient",
    previewBg: "#0f172a",
    fontFamily: "Impact, 'Arial Black', Arial, sans-serif",
    fontSize: 48,
    fillColor: "#1d4ed8",
    gradient: { from: "#38bdf8", to: "#1d4ed8", angle: 90 },
    strokeColor: "#0c4a6e",
    strokeWidth: 1.5,
    shadow: { offsetX: 2, offsetY: 4, blur: 8, color: "rgba(12, 74, 110, 0.55)" }
  },
  {
    id: "sunset-gradient",
    nameVi: "Gradient hoàng hôn",
    nameEn: "Sunset gradient",
    previewBg: "#1c1917",
    fontFamily: "Impact, 'Arial Black', Arial, sans-serif",
    fontSize: 48,
    fillColor: "#dc2626",
    gradient: { from: "#fb923c", to: "#dc2626", angle: 90 },
    strokeColor: "#7f1d1d",
    strokeWidth: 1.5,
    shadow: { offsetX: 2, offsetY: 4, blur: 8, color: "rgba(127, 29, 29, 0.5)" }
  },
  {
    id: "heavy-outline",
    nameVi: "Viền đậm trắng",
    nameEn: "Heavy outline",
    previewBg: "#334155",
    fontFamily: "Impact, 'Arial Black', Arial, sans-serif",
    fontSize: 48,
    fillColor: "#ffffff",
    gradient: null,
    strokeColor: "#0f172a",
    strokeWidth: 3,
    shadow: { offsetX: 3, offsetY: 3, blur: 0, color: "rgba(15, 23, 42, 0.35)" }
  },
  {
    id: "emerald-glow",
    nameVi: "Lục bảo phát sáng",
    nameEn: "Emerald glow",
    previewBg: "#ecfdf5",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 48,
    fillColor: "#059669",
    gradient: null,
    strokeColor: "#064e3b",
    strokeWidth: 1.5,
    shadow: { offsetX: 0, offsetY: 0, blur: 12, color: "rgba(5, 150, 105, 0.75)" }
  },
  {
    id: "violet-gradient",
    nameVi: "Gradient tím hồng",
    nameEn: "Violet gradient",
    previewBg: "#1e1b4b",
    fontFamily: "Impact, 'Arial Black', Arial, sans-serif",
    fontSize: 48,
    fillColor: "#7c3aed",
    gradient: { from: "#8b5cf6", to: "#db2777", angle: 90 },
    strokeColor: "#4c1d95",
    strokeWidth: 1.5,
    shadow: { offsetX: 2, offsetY: 4, blur: 10, color: "rgba(76, 29, 149, 0.5)" }
  },
  {
    id: "frost-shadow",
    nameVi: "Trắng đổ bóng",
    nameEn: "Frost shadow",
    previewBg: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 48,
    fillColor: "#f8fafc",
    gradient: null,
    strokeColor: "#334155",
    strokeWidth: 1,
    shadow: { offsetX: 4, offsetY: 6, blur: 0, color: "rgba(15, 23, 42, 0.85)" }
  }
];

export function resolveWordArtPreset(presetId) {
  return WORDART_PRESETS.find((item) => item.id === presetId) || WORDART_PRESETS[0];
}

export function resolveWordArtStyle(shapeOrOptions = {}) {
  const preset = resolveWordArtPreset(shapeOrOptions.presetId || shapeOrOptions.styleId);
  const gradient = shapeOrOptions.gradient === undefined ? preset.gradient : shapeOrOptions.gradient;
  const shadow = shapeOrOptions.shadow === undefined ? preset.shadow : shapeOrOptions.shadow;
  return {
    id: shapeOrOptions.presetId || shapeOrOptions.styleId || preset.id,
    fontFamily: shapeOrOptions.fontFamily || preset.fontFamily,
    fontSize: Number(shapeOrOptions.fontSize) > 0 ? Number(shapeOrOptions.fontSize) : preset.fontSize,
    fillColor: shapeOrOptions.fillColor || preset.fillColor,
    gradient: gradient ? { ...gradient } : null,
    strokeColor: shapeOrOptions.strokeColor != null ? shapeOrOptions.strokeColor : preset.strokeColor,
    strokeWidth: shapeOrOptions.strokeWidth != null ? Number(shapeOrOptions.strokeWidth) : preset.strokeWidth,
    shadow: shadow ? { ...shadow } : null
  };
}

export function buildWordArtCss(shapeOrOptions = {}, options = {}) {
  const style = resolveWordArtStyle(shapeOrOptions);
  const scale = Number(options.fontScale) > 0 ? Number(options.fontScale) : 1;
  const fontSize = Math.max(8, Math.round(style.fontSize * scale));
  const strokeWidth = Math.max(0, style.strokeWidth * scale);
  const parts = [
    `font-family:${style.fontFamily}`,
    `font-size:${fontSize}px`,
    "font-weight:800",
    "letter-spacing:0.02em",
    "line-height:1.1",
    "text-align:center"
  ];
  if (style.gradient?.from && style.gradient?.to) {
    const angle = Number.isFinite(Number(style.gradient.angle)) ? Number(style.gradient.angle) : 90;
    parts.push(`background-image:linear-gradient(${angle}deg, ${style.gradient.from}, ${style.gradient.to})`);
    parts.push("-webkit-background-clip:text");
    parts.push("background-clip:text");
    parts.push("-webkit-text-fill-color:transparent");
    parts.push("color:transparent");
  } else {
    parts.push(`color:${style.fillColor}`);
    parts.push(`-webkit-text-fill-color:${style.fillColor}`);
  }
  if (strokeWidth > 0 && style.strokeColor) {
    parts.push(`-webkit-text-stroke:${strokeWidth}px ${style.strokeColor}`);
  }
  if (style.shadow) {
    const ox = Number(style.shadow.offsetX) || 0;
    const oy = Number(style.shadow.offsetY) || 0;
    const blur = Number(style.shadow.blur) || 0;
    parts.push(`text-shadow:${ox * scale}px ${oy * scale}px ${blur * scale}px ${style.shadow.color || "rgba(0,0,0,0.4)"}`);
  }
  return parts.join(";");
}

export function applyWordArtCss(el, shapeOrOptions = {}, options = {}) {
  if (!el?.style) return "";
  const style = resolveWordArtStyle(shapeOrOptions);
  const css = buildWordArtCss(style, options);
  const scale = Number(options.fontScale) > 0 ? Number(options.fontScale) : 1;
  el.style.fontFamily = style.fontFamily;
  el.style.fontSize = `${Math.max(8, Math.round(style.fontSize * scale))}px`;
  el.style.fontWeight = "800";
  el.style.letterSpacing = "0.02em";
  el.style.lineHeight = "1.1";
  el.style.textAlign = "center";
  if (style.gradient?.from && style.gradient?.to) {
    const angle = Number.isFinite(Number(style.gradient.angle)) ? Number(style.gradient.angle) : 90;
    el.style.backgroundImage = `linear-gradient(${angle}deg, ${style.gradient.from}, ${style.gradient.to})`;
    el.style.webkitBackgroundClip = "text";
    el.style.backgroundClip = "text";
    el.style.setProperty("-webkit-background-clip", "text");
    el.style.setProperty("background-clip", "text");
    el.style.webkitTextFillColor = "transparent";
    el.style.color = "transparent";
  } else {
    el.style.backgroundImage = "none";
    el.style.webkitTextFillColor = style.fillColor;
    el.style.color = style.fillColor;
  }
  if (style.strokeWidth > 0 && style.strokeColor) {
    const stroke = `${style.strokeWidth * scale}px ${style.strokeColor}`;
    el.style.webkitTextStroke = stroke;
    el.style.setProperty("-webkit-text-stroke", stroke);
  } else {
    el.style.webkitTextStroke = "";
  }
  if (style.shadow) {
    const ox = (Number(style.shadow.offsetX) || 0) * scale;
    const oy = (Number(style.shadow.offsetY) || 0) * scale;
    const blur = (Number(style.shadow.blur) || 0) * scale;
    el.style.textShadow = `${ox}px ${oy}px ${blur}px ${style.shadow.color || "rgba(0,0,0,0.4)"}`;
  } else {
    el.style.textShadow = "none";
  }
  return css;
}

/**
 * @param {Object} [options]
 * @param {string} [options.text]
 * @param {string} [options.presetId]
 * @returns {Promise<{text:string, presetId:string}|null>}
 */
export function showWordArtDialog(options = {}) {
  const defaultText = String(options.text || "VN Office");
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
