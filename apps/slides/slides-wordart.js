/** Synchronous WordArt helpers used by 3T Slide rendering and serialization. */

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
