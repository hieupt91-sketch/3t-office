import {
  ThemeManager,
  PERSONAL_THEME_STORAGE_KEY,
  PERSONAL_THEME_PRESETS
} from "../../platform/theme/theme-manager.js";

export async function runPersonalThemeTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  await test("Bộ chủ đề có preset và màu tùy chọn hợp lệ", () => {
    assert(PERSONAL_THEME_PRESETS.length >= 15 && PERSONAL_THEME_PRESETS.length <= 20, "cần 15-20 preset");
    assert(new Set(PERSONAL_THEME_PRESETS.map((item) => item.id)).size === PERSONAL_THEME_PRESETS.length, "preset không được trùng id");
    assert(PERSONAL_THEME_PRESETS.every((item) => /^#[0-9a-f]{6}$/i.test(item.accent)), "preset phải có màu hex");
  });
  await test("ThemeManager lưu, preview và khôi phục chủ đề cá tính cục bộ", () => {
    const store = new Map(); const oldStorage = globalThis.localStorage; const oldDocument = globalThis.document;
    const attributes = {}; const styles = {};
    globalThis.localStorage = { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) };
    globalThis.document = { documentElement: { setAttribute: (key, value) => { attributes[key] = value; }, removeAttribute: (key) => { delete attributes[key]; }, style: { setProperty: (key, value) => { styles[key] = value; }, removeProperty: (key) => { delete styles[key]; } } } };
    try {
      const manager = new ThemeManager();
      manager.setPersonalTheme({ preset: "ocean", accent: "#2563eb", base: "light" });
      assert(attributes["data-theme-profile"] === "personal" && styles["--vno-app-current"] === "#2563eb", "áp dụng màu cá tính");
      assert(JSON.parse(store.get(PERSONAL_THEME_STORAGE_KEY)).preset === "ocean", "đã lưu localStorage");
      manager.previewPersonalTheme({ preset: "custom", accent: "#be123c", base: "dark" });
      assert(styles["--vno-app-current"] === "#be123c" && styles["--vno-bg-window"] === "#202331", "preview đổi ngay");
      manager.restorePersonalTheme();
      assert(styles["--vno-app-current"] === "#2563eb", "restore về chủ đề hiện tại");
      manager.resetPersonalTheme();
      assert(!attributes["data-theme-profile"] && !store.has(PERSONAL_THEME_STORAGE_KEY), "đặt lại xóa chủ đề");
    } finally { globalThis.localStorage = oldStorage; globalThis.document = oldDocument; }
  });
  return results;
}
