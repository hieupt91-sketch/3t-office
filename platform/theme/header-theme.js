/**
 * 3T Office Platform — Tùy biến khu vực tiêu đề (thanh tiêu đề + thẻ ribbon)
 * Người dùng chọn: mặc định theo giao diện Sáng/Tối, MỘT MÀU tự chọn, hoặc HÌNH ẢNH (cắt thành dải, có độ phủ tối để chữ dễ đọc).
 * Lưu cục bộ (localStorage) — không gửi ra mạng. Chữ tự đổi đen/trắng theo độ sáng nền để luôn đủ tương phản.
 */

export const HEADER_THEME_STORAGE_KEY = "vno-header-theme";
export const HEADER_PRESET_COLORS = [
  { value: "#0f4c81", label: "Xanh Doc" },
  { value: "#15803d", label: "Xanh lá Sheet" },
  { value: "#c2410c", label: "Cam Slide" },
  { value: "#6d28d9", label: "Tím" },
  { value: "#be123c", label: "Đỏ mận" },
  { value: "#0f766e", label: "Xanh ngọc" },
  { value: "#334155", label: "Xám đá" },
  { value: "#111827", label: "Đen" },
  { value: "#fef3c7", label: "Vàng kem" },
  { value: "#e0f2fe", label: "Xanh nhạt" }
];

const DEFAULTS = Object.freeze({ mode: "default", color: "#0f4c81", image: "", imageColor: "#1f2937", dim: 0.25, position: 50 });
const HEX = /^#([0-9a-f]{6})$/i;
// Dải ảnh lưu tối đa ~600 KB để không làm đầy bộ nhớ cục bộ.
const MAX_IMAGE_CHARS = 800000;

export function normalizeHeaderTheme(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const mode = source.mode === "color" || source.mode === "image" ? source.mode : "default";
  const color = typeof source.color === "string" && HEX.test(source.color) ? source.color.toLowerCase() : DEFAULTS.color;
  const image = typeof source.image === "string" && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(source.image) && source.image.length <= MAX_IMAGE_CHARS
    ? source.image : "";
  const imageColor = typeof source.imageColor === "string" && HEX.test(source.imageColor) ? source.imageColor.toLowerCase() : DEFAULTS.imageColor;
  const dimNumber = Number(source.dim);
  const dim = Number.isFinite(dimNumber) ? Math.min(0.7, Math.max(0, dimNumber)) : DEFAULTS.dim;
  const positionNumber = Number(source.position);
  const position = Number.isFinite(positionNumber) ? Math.min(100, Math.max(0, Math.round(positionNumber))) : DEFAULTS.position;
  // Chế độ hình ảnh mà chưa có ảnh thì coi như mặc định
  return { mode: mode === "image" && !image ? "default" : mode, color, image, imageColor, dim, position };
}

/** Độ sáng tương đối WCAG của màu #rrggbb (0 = đen, 1 = trắng). */
export function relativeLuminance(hex) {
  const match = HEX.exec(String(hex || ""));
  if (!match) return 0;
  const channels = [0, 2, 4].map((index) => parseInt(match[1].slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(luminanceA, luminanceB) {
  const high = Math.max(luminanceA, luminanceB);
  const low = Math.min(luminanceA, luminanceB);
  return (high + 0.05) / (low + 0.05);
}

/** Màu chữ (trắng/đen) có tương phản cao hơn trên nền có độ sáng cho trước. */
export function readableForeground(backgroundLuminance) {
  return contrastRatio(1, backgroundLuminance) >= contrastRatio(0, backgroundLuminance) ? "#ffffff" : "#000000";
}

/** Độ sáng hiệu dụng của ảnh sau khi phủ lớp tối `dim` (trộn với đen). */
export function dimmedLuminance(imageLuminance, dim) {
  return Math.max(0, imageLuminance) * (1 - Math.min(0.9, Math.max(0, dim)));
}

/** Màu nền dự phòng của chế độ hình ảnh: màu trung bình của dải, đã trộn với lớp phủ tối. */
function mixWithBlack(hex, amount) {
  const match = HEX.exec(String(hex || ""));
  if (!match) return "#1f2937";
  const factor = 1 - Math.min(0.9, Math.max(0, amount));
  return "#" + [0, 2, 4].map((index) => Math.round(parseInt(match[1].slice(index, index + 2), 16) * factor).toString(16).padStart(2, "0")).join("");
}

export function computeHeaderStyle(settings, imageLuminance = 0.35) {
  const theme = normalizeHeaderTheme(settings);
  if (theme.mode === "default") return null;
  let backgroundLuminance;
  let backgroundImage = "none";
  if (theme.mode === "color") {
    backgroundLuminance = relativeLuminance(theme.color);
  } else {
    backgroundLuminance = dimmedLuminance(imageLuminance, theme.dim);
    const scrim = `rgba(0,0,0,${theme.dim.toFixed(2)})`;
    backgroundImage = `linear-gradient(${scrim},${scrim}), url("${theme.image}")`;
  }
  const foreground = readableForeground(backgroundLuminance);
  const light = foreground === "#ffffff";
  return {
    "--vno-header-bg-color": theme.mode === "color" ? theme.color : mixWithBlack(theme.imageColor, theme.dim),
    "--vno-header-bg-image": backgroundImage,
    "--vno-header-fg": foreground,
    "--vno-header-hover": light ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.10)",
    "--vno-header-border": light ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.20)"
  };
}

const STYLE_KEYS = ["--vno-header-bg-color", "--vno-header-bg-image", "--vno-header-fg", "--vno-header-hover", "--vno-header-border"];

export class HeaderThemeManager {
  constructor() {
    this._settings = { ...DEFAULTS };
    this._imageLuminance = 0.35;
  }

  init() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(HEADER_THEME_STORAGE_KEY) || "null"); } catch (error) { stored = null; }
    this._settings = normalizeHeaderTheme(stored);
    if (stored && Number.isFinite(Number(stored.luminance))) this._imageLuminance = Math.min(1, Math.max(0, Number(stored.luminance)));
    this._apply(this._settings);
    return this.get();
  }

  get() { return { ...this._settings }; }

  /** Xem trước (chưa lưu). */
  preview(settings, imageLuminance) {
    if (Number.isFinite(imageLuminance)) this._imageLuminance = imageLuminance;
    this._apply(normalizeHeaderTheme(settings));
  }

  /** Lưu và áp dụng. */
  save(settings, imageLuminance) {
    if (Number.isFinite(imageLuminance)) this._imageLuminance = imageLuminance;
    this._settings = normalizeHeaderTheme(settings);
    this._apply(this._settings);
    try {
      if (this._settings.mode === "default") localStorage.removeItem(HEADER_THEME_STORAGE_KEY);
      else localStorage.setItem(HEADER_THEME_STORAGE_KEY, JSON.stringify({ ...this._settings, luminance: this._imageLuminance }));
    } catch (error) { /* bộ nhớ đầy hoặc bị chặn: vẫn áp dụng cho phiên này */ }
    return this.get();
  }

  reset() { return this.save({ ...DEFAULTS }); }

  /** Khôi phục trạng thái đã lưu (khi Hủy hộp thoại). */
  restore() { this._apply(this._settings); }

  _apply(settings) {
    if (typeof document === "undefined" || !document.documentElement) return;
    const root = document.documentElement;
    const style = computeHeaderStyle(settings, this._imageLuminance);
    for (const key of STYLE_KEYS) root.style.removeProperty(key);
    if (!style) { root.removeAttribute("data-vno-header"); return; }
    for (const [key, value] of Object.entries(style)) root.style.setProperty(key, value);
    root.setAttribute("data-vno-header", settings.mode);
  }
}

export const headerTheme = new HeaderThemeManager();

/**
 * Đọc ảnh người dùng chọn, thu nhỏ và cắt thành dải đúng tỉ lệ khu vực tiêu đề.
 * Trả về { source, strip(position) } — `source` là ảnh đã thu nhỏ (chỉ giữ trong bộ nhớ khi hộp thoại mở), `strip` cắt dải theo vị trí dọc 0–100.
 */
export async function loadHeaderImage(file, { headerHeightPx = 78, viewportWidthPx = 1366 } = {}) {
  if (!file || !/^image\/(?:png|jpe?g|webp|gif|bmp)$/i.test(file.type || "")) throw new Error("Tệp không phải hình ảnh (PNG, JPG, WEBP, GIF, BMP).");
  if (file.size > 25 * 1024 * 1024) throw new Error("Hình ảnh quá lớn (tối đa 25 MB).");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Không đọc được hình ảnh này."));
      element.src = url;
    });
    const maxWidth = 1920;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const source = document.createElement("canvas");
    source.width = width; source.height = height;
    source.getContext("2d").drawImage(image, 0, 0, width, height);
    const stripHeight = Math.max(8, Math.round(width * headerHeightPx / viewportWidthPx));
    const strip = (position = 50) => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = stripHeight;
      const context = canvas.getContext("2d");
      const slack = Math.max(0, height - stripHeight);
      const top = Math.round(slack * Math.min(100, Math.max(0, position)) / 100);
      if (height >= stripHeight) context.drawImage(source, 0, top, width, stripHeight, 0, 0, width, stripHeight);
      else context.drawImage(source, 0, 0, width, height, 0, 0, width, stripHeight); // ảnh dẹt hơn dải: kéo giãn
      let dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      if (dataUrl.length > MAX_IMAGE_CHARS) dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      // Độ sáng trung bình của dải để chọn màu chữ
      const probe = document.createElement("canvas");
      probe.width = 24; probe.height = 4;
      const probeContext = probe.getContext("2d");
      probeContext.drawImage(canvas, 0, 0, 24, 4);
      const pixels = probeContext.getImageData(0, 0, 24, 4).data;
      let total = 0;
      const sums = [0, 0, 0];
      const count = pixels.length / 4;
      for (let index = 0; index < pixels.length; index += 4) {
        const hex = "#" + [pixels[index], pixels[index + 1], pixels[index + 2]].map((value) => value.toString(16).padStart(2, "0")).join("");
        total += relativeLuminance(hex);
        sums[0] += pixels[index]; sums[1] += pixels[index + 1]; sums[2] += pixels[index + 2];
      }
      const color = "#" + sums.map((value) => Math.round(value / count).toString(16).padStart(2, "0")).join("");
      return { dataUrl, luminance: total / count, color };
    };
    return { strip, hasSlack: height > stripHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
