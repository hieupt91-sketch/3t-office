/**
 * Behavioral tests — Tùy biến khu vực tiêu đề (màu/hình ảnh): chuẩn hóa, tương phản chữ, lưu cục bộ.
 */
import {
  normalizeHeaderTheme, relativeLuminance, readableForeground, contrastRatio, computeHeaderStyle,
  HeaderThemeManager, HEADER_PRESET_COLORS, HEADER_THEME_STORAGE_KEY, MAX_IMAGE_CHARS
} from "../../platform/theme/header-theme.js";
import { ThemeManager } from "../../platform/theme/theme-manager.js";

export async function runHeaderThemeTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const PNG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  await test("Chuẩn hóa: giá trị lạ về mặc định, màu sai hex bị bỏ, chế độ ảnh không có ảnh = mặc định", () => {
    assert(normalizeHeaderTheme(null).mode === "default", "null -> mặc định");
    assert(normalizeHeaderTheme({ mode: "color", color: "đỏ" }).color === "#0f4c81", "màu sai -> màu mặc định");
    assert(normalizeHeaderTheme({ mode: "image" }).mode === "default", "chế độ ảnh thiếu ảnh -> mặc định");
    assert(normalizeHeaderTheme({ mode: "image", image: "javascript:alert(1)" }).image === "", "chỉ nhận data:image base64");
    assert(normalizeHeaderTheme({ mode: "image", image: PNG }).mode === "image", "ảnh hợp lệ được giữ");
    assert(normalizeHeaderTheme({ mode: "image", image: PNG + "x".repeat(MAX_IMAGE_CHARS) }).image === "", "ảnh vượt giới hạn lưu không được chấp nhận");
    assert(normalizeHeaderTheme({ dim: 5 }).dim === 0.7, "độ phủ giới hạn 0,7");
    assert(normalizeHeaderTheme({ position: -3 }).position === 0, "vị trí giới hạn 0..100");
  });

  await test("Mọi màu gợi ý cho chữ tương phản >= 4,5:1", () => {
    assert(HEADER_PRESET_COLORS.length === 12, "cần 12 màu gợi ý");
    for (const preset of HEADER_PRESET_COLORS) {
      const luminance = relativeLuminance(preset.value);
      const foreground = readableForeground(luminance);
      const ratio = contrastRatio(foreground === "#ffffff" ? 1 : 0, luminance);
      assert(ratio >= 4.5, `${preset.label} (${preset.value}) tương phản ${ratio.toFixed(2)}`);
    }
  });

  await test("ThemeManager: chế độ theo hệ thống theo dõi thay đổi và lưu lựa chọn", () => {
    const store = new Map();
    const oldStorage = globalThis.localStorage;
    const oldDocument = globalThis.document;
    const oldWindow = globalThis.window;
    const attrs = {}; const styles = {}; const listeners = [];
    let matches = false;
    globalThis.localStorage = { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)) };
    globalThis.document = { documentElement: { setAttribute: (key, value) => { attrs[key] = value; }, removeAttribute: (key) => { delete attrs[key]; }, style: { setProperty: (key, value) => { styles[key] = value; }, removeProperty: (key) => { delete styles[key]; } } } };
    globalThis.window = { matchMedia: () => ({ get matches() { return matches; }, addEventListener: (_type, listener) => listeners.push(listener) }) };
    try {
      const manager = new ThemeManager();
      manager.init();
      manager.setTheme("system");
      assert(manager.getThemePreference() === "system" && store.get("vno-theme") === "system", "lưu lựa chọn theo hệ thống");
      assert(attrs["data-theme"] === "light", "theo sáng khi hệ thống sáng");
      matches = true;
      listeners[0]({ matches });
      assert(attrs["data-theme"] === "dark" && manager.getTheme() === "dark", "theo tối khi hệ thống đổi");
      assert(store.get("vno-theme") === "system", "không ghi đè lựa chọn theo hệ thống");
      const result = manager.setAccentColor("#ffffff");
      assert(result.foreground === "#000000" && contrastRatio(0, relativeLuminance(result.color)) >= 4.5, "màu nhấn tự chọn chữ đạt AA");
      assert(styles["--vno-accent"] === "#ffffff" && styles["--vno-accent-fg"] === "#000000", "đặt design tokens màu nhấn");
    } finally {
      globalThis.localStorage = oldStorage; globalThis.document = oldDocument; globalThis.window = oldWindow;
    }
  });

  await test("Màu bất kỳ: chữ tự đổi đen/trắng; 1000 màu ngẫu nhiên đều đạt >= 4,5:1", () => {
    for (let i = 0; i < 1000; i += 1) {
      const hex = "#" + [0, 0, 0].map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
      const luminance = relativeLuminance(hex);
      const foreground = readableForeground(luminance);
      const ratio = contrastRatio(foreground === "#ffffff" ? 1 : 0, luminance);
      assert(ratio >= 4.5, `${hex} tương phản ${ratio.toFixed(2)}`);
    }
  });

  await test("computeHeaderStyle: mặc định không đổi gì; màu và hình ảnh trả về biến CSS", () => {
    assert(computeHeaderStyle({ mode: "default" }) === null, "mặc định = null");
    const color = computeHeaderStyle({ mode: "color", color: "#111827" });
    assert(color["--vno-header-bg-color"] === "#111827" && color["--vno-header-fg"] === "#ffffff", "nền đen -> chữ trắng");
    const light = computeHeaderStyle({ mode: "color", color: "#fef3c7" });
    assert(light["--vno-header-fg"] === "#000000", "nền vàng kem -> chữ đen");
    const image = computeHeaderStyle({ mode: "image", image: PNG, dim: 0.5, imageColor: "#ffffff" }, 0.9);
    assert(/url\("data:image\/jpeg/.test(image["--vno-header-bg-image"]) && /rgba\(0,0,0,0\.50\)/.test(image["--vno-header-bg-image"]), "ảnh có lớp phủ tối");
    assert(image["--vno-header-bg-color"] === "#808080", "màu dự phòng = trung bình đã trộn đen");
  });

  await test("HeaderThemeManager: lưu, đọc lại, đặt lại và xóa khóa lưu trữ", () => {
    const store = new Map();
    const oldStorage = globalThis.localStorage;
    const oldDocument = globalThis.document;
    const attributes = {}; const styles = {};
    globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    globalThis.document = { documentElement: { setAttribute: (k, v) => { attributes[k] = v; }, removeAttribute: (k) => { delete attributes[k]; }, style: { setProperty: (k, v) => { styles[k] = v; }, removeProperty: (k) => { delete styles[k]; } } } };
    try {
      const manager = new HeaderThemeManager();
      manager.save({ mode: "color", color: "#6d28d9" });
      assert(attributes["data-vno-header"] === "color" && styles["--vno-header-bg-color"] === "#6d28d9", "áp dụng màu");
      assert(JSON.parse(store.get(HEADER_THEME_STORAGE_KEY)).color === "#6d28d9", "đã lưu cục bộ");
      const other = new HeaderThemeManager();
      other.init();
      assert(other.get().mode === "color", "khởi động lại đọc đúng");
      other.preview({ mode: "color", color: "#111827" });
      assert(styles["--vno-header-bg-color"] === "#111827", "xem trước đổi ngay");
      other.restore();
      assert(styles["--vno-header-bg-color"] === "#6d28d9", "Hủy khôi phục bản đã lưu");
      other.reset();
      assert(!attributes["data-vno-header"] && !store.has(HEADER_THEME_STORAGE_KEY) && !styles["--vno-header-bg-color"], "đặt lại xóa sạch");
    } finally {
      globalThis.localStorage = oldStorage; globalThis.document = oldDocument;
    }
  });

  return results;
}
