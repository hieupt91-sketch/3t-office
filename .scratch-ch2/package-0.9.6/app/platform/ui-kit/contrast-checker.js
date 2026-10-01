/**
 * 3T Office — WCAG 2.1 Color Contrast Checker
 * Tuân thủ tiêu chuẩn W3C Web Content Accessibility Guidelines (WCAG) 2.1
 * 
 * Cung cấp công thức tính độ chói tương đối (relative luminance),
 * tỷ lệ tương phản (contrast ratio), kiểm tra đạt chuẩn AA/AAA (chữ thường >= 4.5:1, chữ lớn/icon >= 3:1),
 * và quét kiểm tra tương phản tự động cho CSS / DOM.
 */

/**
 * Phân tích mã màu hex, rgb, rgba hoặc tên màu cơ bản thành { r, g, b, a }
 * @param {string} colorStr
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 */
export function parseColor(colorStr) {
  if (!colorStr || typeof colorStr !== "string") return null;
  const str = colorStr.trim().toLowerCase();

  const NAMED_COLORS = {
    white: { r: 255, g: 255, b: 255, a: 1 },
    black: { r: 0, g: 0, b: 0, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
    red: { r: 255, g: 0, b: 0, a: 1 },
    green: { r: 0, g: 128, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 255, a: 1 },
    gray: { r: 128, g: 128, b: 128, a: 1 },
    grey: { r: 128, g: 128, b: 128, a: 1 }
  };

  if (NAMED_COLORS[str]) {
    return { ...NAMED_COLORS[str] };
  }

  // Hex: #fff, #ffff, #ffffff, #ffffffff
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = parseInt(hex[3] + hex[3], 16) / 255;
      return { r, g, b, a };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }
    return null;
  }

  // rgb(r, g, b) hoặc rgba(r, g, b, a)
  const rgbMatch = str.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseFloat(rgbMatch[1])));
    const g = Math.min(255, Math.max(0, parseFloat(rgbMatch[2])));
    const b = Math.min(255, Math.max(0, parseFloat(rgbMatch[3])));
    const a = rgbMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbMatch[4]))) : 1;
    return { r, g, b, a };
  }

  return null;
}

/**
 * Hòa trộn màu kênh alpha với nền (mặc định nền trắng #ffffff)
 * @param {{ r: number, g: number, b: number, a: number }} fg
 * @param {{ r: number, g: number, b: number, a: number }} bg
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
export function blendAlpha(fg, bg = { r: 255, g: 255, b: 255, a: 1 }) {
  if (fg.a >= 1) return { ...fg, a: 1 };
  const a = fg.a;
  const invA = 1 - a;
  return {
    r: Math.round(fg.r * a + bg.r * invA),
    g: Math.round(fg.g * a + bg.g * invA),
    b: Math.round(fg.b * a + bg.b * invA),
    a: 1
  };
}

/**
 * Tính độ chói tương đối theo chuẩn W3C WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {number} 0.0 - 1.0
 */
export function getRelativeLuminance(r, g, b) {
  const transform = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const rLinear = transform(r);
  const gLinear = transform(g);
  const bLinear = transform(b);
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Tính tỷ lệ tương phản giữa màu chữ (foreground) và màu nền (background)
 * Công thức WCAG 2.1: (L1 + 0.05) / (L2 + 0.05) với L1 >= L2
 * @param {string | { r: number, g: number, b: number, a?: number }} foreground
 * @param {string | { r: number, g: number, b: number, a?: number }} background
 * @returns {number} Tỷ lệ từ 1 đến 21, làm tròn 2 chữ số thập phân
 */
export function getContrastRatio(foreground, background) {
  let fg = typeof foreground === "string" ? parseColor(foreground) : foreground;
  let bg = typeof background === "string" ? parseColor(background) : background;

  if (!fg || !bg) {
    throw new Error(`Không thể phân tích màu: foreground="${foreground}", background="${background}"`);
  }

  // Nếu bg có alpha < 1, hòa trộn bg lên nền trắng
  if (bg.a !== undefined && bg.a < 1) {
    bg = blendAlpha(bg, { r: 255, g: 255, b: 255, a: 1 });
  }

  // Nếu fg có alpha < 1, hòa trộn fg lên nền bg
  if (fg.a !== undefined && fg.a < 1) {
    fg = blendAlpha(fg, bg);
  }

  const lumFg = getRelativeLuminance(fg.r, fg.g, fg.b);
  const lumBg = getRelativeLuminance(bg.r, bg.g, bg.b);

  const l1 = Math.max(lumFg, lumBg);
  const l2 = Math.min(lumFg, lumBg);

  const ratio = (l1 + 0.05) / (l2 + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Kiểm tra xem cặp màu có đạt chuẩn WCAG AA hay không:
 * - Chữ thường (< 18pt hoặc < 14pt bold): >= 4.5:1
 * - Chữ lớn (>= 18pt hoặc >= 14pt bold) hoặc thành phần đồ họa / biểu tượng / viền: >= 3.0:1
 * @param {string | object} foreground
 * @param {string | object} background
 * @param {boolean} isLargeTextOrIcon
 * @returns {boolean}
 */
export function meetsWcagAA(foreground, background, isLargeTextOrIcon = false) {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeTextOrIcon ? 3.0 : 4.5;
  return ratio >= threshold;
}

/**
 * Kiểm tra xem cặp màu có đạt chuẩn WCAG AAA hay không:
 * - Chữ thường: >= 7.0:1
 * - Chữ lớn / đồ họa: >= 4.5:1
 * @param {string | object} foreground
 * @param {string | object} background
 * @param {boolean} isLargeTextOrIcon
 * @returns {boolean}
 */
export function meetsWcagAAA(foreground, background, isLargeTextOrIcon = false) {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeTextOrIcon ? 4.5 : 7.0;
  return ratio >= threshold;
}

/**
 * Kiểm tra một danh sách các cặp màu [tên, foreground, background, isLargeText]
 * @param {Array<{ label: string, fg: string, bg: string, isLarge?: boolean }>} pairs
 * @returns {{ allPassed: boolean, violations: Array<{ label: string, fg: string, bg: string, ratio: number, required: number }> }}
 */
export function auditColorPairs(pairs) {
  const violations = [];
  for (const item of pairs) {
    const ratio = getContrastRatio(item.fg, item.bg);
    const required = item.isLarge ? 3.0 : 4.5;
    if (ratio < required) {
      violations.push({
        label: item.label,
        fg: item.fg,
        bg: item.bg,
        ratio,
        required
      });
    }
  }
  return {
    allPassed: violations.length === 0,
    violations
  };
}
