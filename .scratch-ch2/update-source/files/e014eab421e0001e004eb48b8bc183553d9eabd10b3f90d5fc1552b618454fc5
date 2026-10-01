/**
 * 3T Doc — Insert dialogs (Equation, Bookmark, Cross-reference, WordArt)
 * Rút gọn so với Word: phương trình là hộp text/MathML cơ bản, không có trình soạn đồ họa.
 * WordArt: copy logic CSS/preset từ 3T Slide (không import chéo apps/slides — AGENTS.md §4).
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

/**
 * Original VN WordArt presets (fill / outline / shadow / gradient).
 * Copied from Slides insert-dialogs.js — Writer cannot import apps/slides (AGENTS.md §4).
 * Inspired by common title styles, not Microsoft Office assets.
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
    "text-align:center",
    "display:inline-block"
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
  el.style.display = "inline-block";
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

function escapeWordArtText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseWordArtStyleAttr(raw) {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(String(raw));
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Inline WordArt markup for a Writer flow document (span at the caret).
 * @param {string} text
 * @param {Object} [options]
 */
export function buildWriterWordArtHtml(text, options = {}) {
  const style = resolveWordArtStyle(options);
  const css = buildWordArtCss(style, options);
  const visible = String(text || "3T Office").trim() || "3T Office";
  const safeText = escapeWordArtText(visible);
  const encoded = encodeURIComponent(JSON.stringify({
    presetId: style.id,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fillColor: style.fillColor,
    gradient: style.gradient,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    shadow: style.shadow
  }));
  return `<span class="vno-writer-wordart" data-vno-wordart="true" data-vno-wordart-preset="${escapeWordArtText(style.id)}" data-vno-wordart-text="${safeText}" data-vno-wordart-style="${encoded}" contenteditable="false" role="img" aria-label="Chữ nghệ thuật: ${safeText}" tabindex="0"><span class="vno-wordart-text" style="${css}">${safeText}</span></span>`;
}

/**
 * @param {Object} [options]
 * @param {string} [options.text]
 * @param {string} [options.presetId]
 * @returns {Promise<{text:string, presetId:string}|null>}
 */
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
      return `<button type="button" role="radio" class="vno-writer-wordart-preset ${selected ? "is-selected" : ""}" data-wordart-preset="${preset.id}" aria-checked="${selected}" tabindex="${selected ? "0" : "-1"}" aria-label="${label}" style="background:${preset.previewBg}">
        <span class="vno-writer-wordart-preview" aria-hidden="true" style="${buildWordArtCss(preset, { fontScale: 0.55 })}">Aa</span>
        <strong class="vno-writer-wordart-preset-name">${label}</strong>
      </button>`;
    }).join("");
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 640px;" role="dialog" aria-modal="true" aria-labelledby="vno-writer-wordart-title">
        <div class="vno-dialog-header">
          <span id="vno-writer-wordart-title">${isEn ? "Insert WordArt" : "Chèn chữ nghệ thuật"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <label for="vno-wordart-text" style="font-size:13px;font-weight:500;">${isEn ? "Text" : "Nội dung chữ"}</label>
          <input id="vno-wordart-text" type="text" value="${String(defaultText).replace(/"/g, "&quot;")}" maxlength="80"
            placeholder="${isEn ? "Enter decorative text" : "Nhập chữ nghệ thuật"}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:6px;" />
          <div id="vno-writer-wordart-gallery" class="vno-writer-wordart-gallery" role="radiogroup" aria-labelledby="vno-writer-wordart-title">
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
    const presetButtons = overlay.querySelectorAll(".vno-writer-wordart-preset");
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
    const gallery = overlay.querySelector("#vno-writer-wordart-gallery");
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
