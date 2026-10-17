/**
 * Test Suite: Kích thước trang chiếu tùy chỉnh (apps/slides/slide-size.js) + setSlideSize/ghi tệp.
 */
import { cmToPx, pxToCm, parseCm, customSlideSize, SLIDE_SIZE_MIN_CM, SLIDE_SIZE_MAX_CM } from "../../apps/slides/slide-size.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlideSizeTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };

  test("Đổi cm ↔ px: khổ chuẩn 33,867 × 19,05 cm = 960 × 540 px; 25,4 × 19,05 cm = 720 × 540 px", () => {
    eq([cmToPx(33.867), cmToPx(19.05)], [960, 540]);
    eq([cmToPx(25.4), cmToPx(19.05)], [720, 540]);
    eq([pxToCm(960), pxToCm(540)], [33.87, 19.05]);
  });

  test("Tệp mở từ ngoài (0,75 pt/px): px nhiều hơn cho cùng số cm", () => {
    eq(cmToPx(25.4, 0.75), 960);
    eq(pxToCm(960, 0.75), 25.4);
  });

  test("Chấp nhận dấu phẩy thập phân và khoảng trắng; từ chối chữ", () => {
    eq(parseCm("19,05"), 19.05); eq(parseCm(" 25.4 "), 25.4);
    eq(Number.isNaN(parseCm("abc")), true); eq(Number.isNaN(parseCm("")), true); eq(Number.isNaN(parseCm("1e3")), true);
  });

  test("Giới hạn 2,54 – 142,24 cm mỗi cạnh; sai định dạng và ngoài khoảng báo đúng loại lỗi", () => {
    eq(customSlideSize("29,7", "21").ok, true);
    eq(customSlideSize(SLIDE_SIZE_MIN_CM, SLIDE_SIZE_MIN_CM).ok, true);
    eq(customSlideSize(SLIDE_SIZE_MAX_CM, SLIDE_SIZE_MAX_CM).ok, true);
    eq(customSlideSize(2.5, 10), { ok: false, error: "range" });
    eq(customSlideSize(10, 143), { ok: false, error: "range" });
    eq(customSlideSize("x", 10), { ok: false, error: "format" });
    eq(customSlideSize(0, 0), { ok: false, error: "range" });
  });

  test("Kích thước tùy chỉnh được ghi vào FODP đúng (fo:page-width/height) và đọc lại", () => {
    const widthPx = cmToPx(29.7), heightPx = cmToPx(21);
    const adapter = new SlidesAdapter({ slides: [{ id: 1, title: "A4", body: "", layoutType: "blank", shapes: [] }] });
    adapter.canvas = adapter.canvas || {};
    adapter.canvas.slideSize = { preset: "custom", width: widthPx, height: heightPx };
    adapter.canvas.ptPerPx = 1;
    const fodp = adapter.serializeToFodp();
    const w = /fo:page-width="([\d.]+)pt"/.exec(fodp), h = /fo:page-height="([\d.]+)pt"/.exec(fodp);
    if (!w || !h) throw new Error("không thấy fo:page-width/height");
    eq([Math.round(Number(w[1]) / 72 * 2.54 * 10) / 10, Math.round(Number(h[1]) / 72 * 2.54 * 10) / 10], [29.7, 21]);
  });

  return results;
}