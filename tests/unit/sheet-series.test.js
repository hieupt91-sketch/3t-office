/**
 * Test Suite: Điền > Chuỗi (Series) - EXCEL-G4
 */
import { addDateUnit, buildSeries, formatDateLike, parseDateText } from "../../apps/sheet/sheet-series.js";

export async function runSheetSeriesTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };

  test("Series: tuyến tính bước 2", () => eq(buildSeries({ start: 1, type: "linear", step: 2, count: 5 }).values, [1, 3, 5, 7, 9]));
  test("Series: tuyến tính bước âm", () => eq(buildSeries({ start: 10, type: "linear", step: -3, count: 4 }).values, [10, 7, 4, 1]));
  test("Series: tuyến tính dừng ở giá trị dừng (gồm giá trị bằng stop)", () => eq(buildSeries({ start: 1, type: "linear", step: 1, stop: 5 }).values, [1, 2, 3, 4, 5]));
  test("Series: tuyến tính bước thập phân không sai số nổi", () => eq(buildSeries({ start: 0, type: "linear", step: 0.1, count: 4 }).values, [0, 0.1, 0.2, 0.3]));
  test("Series: tăng trưởng nhân 2", () => eq(buildSeries({ start: 1, type: "growth", step: 2, count: 5 }).values, [1, 2, 4, 8, 16]));
  test("Series: tăng trưởng dừng ở stop", () => eq(buildSeries({ start: 1, type: "growth", step: 3, stop: 30 }).values, [1, 3, 9, 27]));
  test("Series: bước 0 tuyến tính chỉ trả một giá trị", () => eq(buildSeries({ start: 5, type: "linear", step: 0, count: 4 }).values, [5]));
  test("Series: giá trị bắt đầu không phải số -> lỗi start", () => eq(buildSeries({ start: "abc", type: "linear", count: 3 }).error, "start"));
  test("Series: ngày theo ngày, giữ định dạng dd/mm/yyyy", () => eq(buildSeries({ start: "28/02/2024", type: "date", dateUnit: "day", step: 1, count: 3 }).values, ["28/02/2024", "29/02/2024", "01/03/2024"]));
  test("Series: ngày theo tháng kẹp cuối tháng", () => eq(buildSeries({ start: "31/01/2024", type: "date", dateUnit: "month", step: 1, count: 3 }).values, ["31/01/2024", "29/02/2024", "31/03/2024"]));
  test("Series: ngày theo năm", () => eq(buildSeries({ start: "2024-02-29", type: "date", dateUnit: "year", step: 1, count: 3 }).values, ["2024-02-29", "2025-02-28", "2026-02-28"]));
  test("Series: ngày làm việc bỏ thứ bảy và chủ nhật", () => eq(buildSeries({ start: "05/01/2024", type: "date", dateUnit: "weekday", step: 1, count: 3 }).values, ["05/01/2024", "08/01/2024", "09/01/2024"]));
  test("Series: ngày không hợp lệ -> lỗi start", () => eq(buildSeries({ start: "31/02/2024", type: "date", count: 2 }).error, "start"));
  test("Series: ngày dừng ở ngày stop", () => eq(buildSeries({ start: "01/03/2024", type: "date", dateUnit: "day", step: 1, stop: 1, stopText: "03/03/2024" }).values, ["01/03/2024", "02/03/2024", "03/03/2024"]));
  test("Series: parse và format ngày giữ độ rộng", () => {
    const t = parseDateText("5/3/2024");
    eq(formatDateLike(addDateUnit(t.utc, "day", 1), t), "6/3/2024");
  });

  test("Series: ô ngày dạng số serial theo tháng", () => eq(buildSeries({ start: 45322, type: "date", dateUnit: "month", step: 1, count: 3 }).values, [45322, 45351, 45382]));
  test("Series: ô ngày dạng số serial theo ngày làm việc", () => eq(buildSeries({ start: 45296, type: "date", dateUnit: "weekday", step: 1, count: 3 }).values, [45296, 45299, 45300]));

  return results;
}
