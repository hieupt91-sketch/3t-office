/**
 * Hộp thoại Phông chữ kiểu Word 2016 (Ctrl+D): thẻ "Phông chữ" (phông, kiểu, cỡ, màu, kiểu + màu gạch chân,
 * hiệu ứng) và thẻ "Nâng cao" (khoảng cách ký tự, vị trí). Hoạt động với chuột và bàn phím.
 *
 * Giống Word: giá trị trộn lẫn trong vùng chọn hiển thị ở trạng thái "không xác định" (ô chọn trống / ô tick lưng
 * chừng) và chỉ các mục người dùng THỰC SỰ đổi mới được trả về trong onApply(changes).
 */

export const FONT_DIALOG_FAMILIES = ["Times New Roman", "Arial", "Calibri", "Be Vietnam Pro", "Roboto", "Georgia"];

export const FONT_DIALOG_STYLES = [
  { value: "regular", label: "Thường", bold: false, italic: false },
  { value: "italic", label: "Nghiêng", bold: false, italic: true },
  { value: "bold", label: "Đậm", bold: true, italic: false },
  { value: "boldItalic", label: "Đậm nghiêng", bold: true, italic: true }
];

/** value = giá trị OOXML w:u; css = kiểu CSS tương ứng khi hiển thị trong trình soạn thảo. */
export const FONT_DIALOG_UNDERLINE_STYLES = [
  { value: "none", label: "(không)" },
  { value: "single", label: "Một nét" },
  { value: "double", label: "Hai nét" },
  { value: "thick", label: "Nét đậm" },
  { value: "dotted", label: "Chấm" },
  { value: "dash", label: "Gạch ngang" },
  { value: "wave", label: "Lượn sóng" }
];

export const FONT_DIALOG_EFFECTS = [
  { key: "strike", label: "Gạch ngang", pair: "dstrike" },
  { key: "dstrike", label: "Gạch ngang đôi", pair: "strike" },
  { key: "sup", label: "Chỉ số trên", pair: "sub" },
  { key: "sub", label: "Chỉ số dưới", pair: "sup" },
  { key: "smallCaps", label: "Chữ hoa nhỏ" },
  { key: "allCaps", label: "Tất cả chữ hoa" },
  { key: "hidden", label: "Ẩn" }
];

function styleValueOf(state) {
  if (state.bold === null || state.bold === undefined || state.italic === null || state.italic === undefined) return "";
  return FONT_DIALOG_STYLES.find(item => item.bold === !!state.bold && item.italic === !!state.italic)?.value || "regular";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function normalizeState(options) {
  // Tương thích tham số cũ (initialSize/initialFamily/...) của lần gọi trước khi có trạng thái trộn.
  const legacy = {
    family: options.initialFamily,
    size: options.initialSize,
    color: options.initialColor,
    bold: options.initialBold,
    italic: options.initialItalic,
    underlineStyle: options.initialUnderline === undefined ? undefined : (options.initialUnderline ? "single" : "none")
  };
  const base = { family: "Times New Roman", size: 14, color: "#000000", bold: false, italic: false, underlineStyle: "none",
    underlineColor: "auto", strike: false, dstrike: false, sup: false, sub: false, smallCaps: false, allCaps: false,
    hidden: false, spacing: 0, position: 0 };
  const merged = { ...base };
  for (const [key, value] of Object.entries(legacy)) if (value !== undefined) merged[key] = value;
  for (const [key, value] of Object.entries(options.state || {})) merged[key] = value;
  return merged;
}

export function showFontDialog(options = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  const { onApply = () => {} } = options;
  const state = normalizeState(options);
  document.getElementById("vno-font-dialog-overlay")?.remove();

  const families = [...FONT_DIALOG_FAMILIES];
  if (state.family && !families.includes(state.family)) families.unshift(state.family);
  const mixedOption = `<option value="" data-mixed hidden></option>`;
  const familyOptions = (state.family ? "" : mixedOption) + families.map(font => `<option value="${escapeHtml(font)}"${font === state.family ? " selected" : ""}>${escapeHtml(font)}</option>`).join("");
  const styleValue = styleValueOf(state);
  const styleOptions = (styleValue ? "" : mixedOption) + FONT_DIALOG_STYLES.map(item => `<option value="${item.value}"${item.value === styleValue ? " selected" : ""}>${item.label}</option>`).join("");
  const underlineOptions = (state.underlineStyle === null ? mixedOption : "") + FONT_DIALOG_UNDERLINE_STYLES.map(item => `<option value="${item.value}"${item.value === state.underlineStyle ? " selected" : ""}>${item.label}</option>`).join("");
  const effectChecks = FONT_DIALOG_EFFECTS.map(item => `<label class="vno-fontdlg-check"><input type="checkbox" data-effect="${item.key}"> ${item.label}</label>`).join("");
  const spacingMode = state.spacing === null ? "" : (state.spacing > 0 ? "expanded" : state.spacing < 0 ? "condensed" : "normal");
  const positionMode = state.position === null ? "" : (state.position > 0 ? "raised" : state.position < 0 ? "lowered" : "normal");

  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  overlay.id = "vno-font-dialog-overlay";
  overlay.innerHTML = `
    <section class="vno-dialog-box vno-font-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-font-dialog-title" style="width:min(520px, calc(100vw - 32px))">
      <header class="vno-dialog-header"><strong id="vno-font-dialog-title">Phông chữ</strong><button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="Đóng">×</button></header>
      <div class="vno-fontdlg-tabs" role="tablist">
        <button type="button" role="tab" class="vno-fontdlg-tab is-active" data-tab="font" aria-selected="true">Phông chữ</button>
        <button type="button" role="tab" class="vno-fontdlg-tab" data-tab="advanced" aria-selected="false">Nâng cao</button>
      </div>
      <div class="vno-dialog-body">
        <div data-panel="font" class="vno-fontdlg-grid">
          <label>Phông chữ<select data-family class="vno-dialog-input">${familyOptions}</select></label>
          <label>Kiểu chữ<select data-style class="vno-dialog-input">${styleOptions}</select></label>
          <label>Cỡ chữ (pt)<input data-size class="vno-dialog-input" type="number" min="1" max="400" step="0.5" value="${state.size === null ? "" : Number(state.size) || 14}"></label>
          <label>Màu chữ<input data-color type="color" value="${escapeHtml(state.color || "#000000")}"></label>
          <label>Kiểu gạch chân<select data-underline-style class="vno-dialog-input">${underlineOptions}</select></label>
          <label>Màu gạch chân
            <span class="vno-fontdlg-row"><input data-underline-color type="color" value="${state.underlineColor && state.underlineColor !== "auto" ? escapeHtml(state.underlineColor) : "#ff0000"}">
            <label class="vno-fontdlg-check"><input type="checkbox" data-underline-auto${state.underlineColor === "auto" || !state.underlineColor ? " checked" : ""}> Tự động</label></span></label>
          <fieldset class="vno-fontdlg-effects"><legend>Hiệu ứng</legend>${effectChecks}</fieldset>
          <div class="vno-fontdlg-preview" data-preview aria-label="Xem trước"><span data-preview-text>AaBbCc Mẫu chữ</span></div>
        </div>
        <div data-panel="advanced" class="vno-fontdlg-grid" hidden>
          <label>Khoảng cách ký tự
            <select data-spacing-mode class="vno-dialog-input">${spacingMode ? "" : mixedOption}<option value="normal"${spacingMode === "normal" ? " selected" : ""}>Bình thường</option><option value="expanded"${spacingMode === "expanded" ? " selected" : ""}>Giãn ra</option><option value="condensed"${spacingMode === "condensed" ? " selected" : ""}>Nén lại</option></select></label>
          <label>Bằng (pt)<input data-spacing-by class="vno-dialog-input" type="number" min="0" max="100" step="0.1" value="${state.spacing ? Math.abs(Number(state.spacing)) : 1}"></label>
          <label>Vị trí
            <select data-position-mode class="vno-dialog-input">${positionMode ? "" : mixedOption}<option value="normal"${positionMode === "normal" ? " selected" : ""}>Bình thường</option><option value="raised"${positionMode === "raised" ? " selected" : ""}>Nâng lên</option><option value="lowered"${positionMode === "lowered" ? " selected" : ""}>Hạ xuống</option></select></label>
          <label>Bằng (pt)<input data-position-by class="vno-dialog-input" type="number" min="0" max="1584" step="0.5" value="${state.position ? Math.abs(Number(state.position)) : 3}"></label>
        </div>
      </div>
      <footer class="vno-dialog-footer"><button type="button" class="vno-btn" data-close>Hủy</button><button type="button" class="vno-btn vno-btn-primary" data-apply>Áp dụng</button></footer>
    </section>`;
  document.body.appendChild(overlay);

  const $ = selector => overlay.querySelector(selector);
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", close));
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "Enter" && event.target?.tagName !== "BUTTON" && event.target?.tagName !== "SELECT") { event.preventDefault(); $("[data-apply]").click(); }
  });

  // Thẻ
  overlay.querySelectorAll("[data-tab]").forEach(tab => tab.addEventListener("click", () => {
    overlay.querySelectorAll("[data-tab]").forEach(other => {
      const active = other === tab;
      other.classList.toggle("is-active", active);
      other.setAttribute("aria-selected", active ? "true" : "false");
    });
    overlay.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.getAttribute("data-panel") !== tab.getAttribute("data-tab"); });
  }));

  // Hiệu ứng: ba trạng thái, loại trừ lẫn nhau như Word (gạch ngang/đôi, trên/dưới)
  const effectBoxes = Object.fromEntries(FONT_DIALOG_EFFECTS.map(item => [item.key, $(`[data-effect="${item.key}"]`)]));
  const initialEffects = {};
  for (const item of FONT_DIALOG_EFFECTS) {
    const value = state[item.key];
    initialEffects[item.key] = value;
    effectBoxes[item.key].checked = value === true;
    effectBoxes[item.key].indeterminate = value === null || value === undefined;
    effectBoxes[item.key].addEventListener("change", () => {
      effectBoxes[item.key].indeterminate = false;
      if (item.pair && effectBoxes[item.key].checked) {
        effectBoxes[item.pair].checked = false;
        effectBoxes[item.pair].indeterminate = false;
      }
      updatePreview();
    });
  }
  const underlineAuto = $("[data-underline-auto]");
  const underlineColor = $("[data-underline-color]");
  underlineColor.addEventListener("input", () => { underlineAuto.checked = false; updatePreview(); });
  underlineAuto.addEventListener("change", updatePreview);
  overlay.querySelectorAll("select, input[type=number], input[type=color]").forEach(input => input.addEventListener("change", updatePreview));

  const preview = $("[data-preview-text]");
  function updatePreview() {
    const style = FONT_DIALOG_STYLES.find(item => item.value === $("[data-style]").value);
    const decorations = [];
    const underlineStyle = $("[data-underline-style]").value;
    if (underlineStyle && underlineStyle !== "none") decorations.push("underline");
    if (effectBoxes.strike.checked || effectBoxes.dstrike.checked) decorations.push("line-through");
    const cssUnderline = { double: "double", dotted: "dotted", dash: "dashed", wave: "wavy" }[underlineStyle] || "solid";
    const size = Number($("[data-size]").value);
    Object.assign(preview.style, {
      fontFamily: $("[data-family]").value || "inherit",
      fontSize: `${Math.min(Math.max(size || 14, 8), 28)}px`,
      fontWeight: style?.bold ? "bold" : "normal",
      fontStyle: style?.italic ? "italic" : "normal",
      color: $("[data-color]").value,
      textDecorationLine: decorations.join(" ") || "none",
      textDecorationStyle: effectBoxes.dstrike.checked && !decorations.includes("underline") ? "double" : cssUnderline,
      textDecorationColor: underlineAuto.checked ? "currentcolor" : underlineColor.value,
      fontVariant: effectBoxes.smallCaps.checked ? "small-caps" : "normal",
      textTransform: effectBoxes.allCaps.checked ? "uppercase" : "none",
      verticalAlign: effectBoxes.sup.checked ? "super" : effectBoxes.sub.checked ? "sub" : "baseline",
      opacity: effectBoxes.hidden.checked ? "0.4" : "1"
    });
  }
  updatePreview();

  $("[data-apply]").addEventListener("click", () => {
    const sizeInput = $("[data-size]");
    const sizeText = sizeInput.value.trim();
    const size = Number(sizeText);
    if (sizeText !== "" && (!Number.isFinite(size) || size < 1 || size > 400)) {
      overlay.querySelector('[data-tab="font"]').click();
      sizeInput.focus();
      return;
    }
    const changes = {};
    const family = $("[data-family]").value;
    if (family && family !== state.family) changes.family = family;
    if (sizeText !== "" && size !== Number(state.size)) changes.size = size;
    const color = $("[data-color]").value;
    if (color && color.toLowerCase() !== String(state.color || "").toLowerCase()) changes.color = color;
    const styleChoice = FONT_DIALOG_STYLES.find(item => item.value === $("[data-style]").value);
    if (styleChoice) {
      if (styleChoice.bold !== state.bold) changes.bold = styleChoice.bold;
      if (styleChoice.italic !== state.italic) changes.italic = styleChoice.italic;
    }
    const underlineValue = $("[data-underline-style]").value;
    const colorValue = underlineAuto.checked ? "auto" : underlineColor.value;
    const underlineColorChanged = colorValue !== (state.underlineColor || "auto");
    if (underlineValue && (underlineValue !== state.underlineStyle || (underlineValue !== "none" && underlineColorChanged))) {
      changes.underlineStyle = underlineValue;
      if (underlineValue !== "none") changes.underlineColor = colorValue;
    } else if (!underlineValue && underlineColorChanged && state.underlineStyle !== "none") {
      changes.underlineColor = colorValue;
    }
    for (const item of FONT_DIALOG_EFFECTS) {
      const box = effectBoxes[item.key];
      if (box.indeterminate) continue;
      if (box.checked !== (initialEffects[item.key] === true)) changes[item.key] = box.checked;
    }
    const spacingModeValue = $("[data-spacing-mode]").value;
    if (spacingModeValue) {
      const by = Math.abs(Number($("[data-spacing-by]").value) || 0);
      const spacing = spacingModeValue === "normal" ? 0 : (spacingModeValue === "expanded" ? by : -by);
      if (spacing !== state.spacing) changes.spacing = spacing;
    }
    const positionModeValue = $("[data-position-mode]").value;
    if (positionModeValue) {
      const by = Math.abs(Number($("[data-position-by]").value) || 0);
      const position = positionModeValue === "normal" ? 0 : (positionModeValue === "raised" ? by : -by);
      if (position !== state.position) changes.position = position;
    }
    // Giữ tương thích: hộp cũ trả về cả bộ cài đặt; hộp mới chỉ trả phần thay đổi.
    onApply(changes);
    close();
  });
  $("[data-family]").focus();
  return true;
}
