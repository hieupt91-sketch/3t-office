import fs from "node:fs";

export async function runThemeCustomizeButtonTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const shell = fs.readFileSync(new URL("../../platform/shell/app-shell.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../../platform/shell/shell.css", import.meta.url), "utf8");
  const icons = fs.readFileSync(new URL("../../platform/ui-kit/icons.js", import.meta.url), "utf8");
  test("Thanh tiêu đề có nút biểu tượng mở nhanh chủ đề cá tính", () => {
    assert(shell.includes("id=\"vno-customize-theme-btn\""), "thiếu nút Chủ đề");
    assert(shell.includes("showOptionsDialog()"), "nút chưa mở Tùy chọn");
    assert(icons.includes("themePalette"), "thiếu biểu tượng bảng màu");
  });
  test("Nút Chủ đề còn khả dụng ở màn hình hẹp", () => {
    assert(css.includes(".vno-theme-customize-btn"), "thiếu CSS nút Chủ đề");
    assert(css.includes(".vno-theme-customize-label"), "thiếu thu gọn nhãn responsive");
  });
  return results;
}
