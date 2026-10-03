import { SheetGridController, DEFAULT_COL_WIDTH_PX } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

export async function runSheetOverlapAutofitStatusTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const assert = (condition, message) => {
    if (!condition) throw new Error(message || "Assertion failed");
  };

  const eq = (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error((message ? message + ": " : "") + `Mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    }
  };

  const createMockContainer = () => ({
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  });

  // =========================================================================
  // TEST (a): Tự vừa khít cột mặc định khi nhập ngày/giờ (giống Excel)
  // =========================================================================
  test("(a) Nhập ngày dd/mm/yyyy vào cột độ rộng mặc định: cột tự động mở rộng vừa khít", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    eq(grid.getColumnWidth("A"), DEFAULT_COL_WIDTH_PX, "Cột A ban đầu phải ở độ rộng mặc định 64px");

    grid.setCellValue("A", 1, "31/12/2026");
    const width = grid.getColumnWidth("A");
    assert(width > DEFAULT_COL_WIDTH_PX, `Độ rộng cột A sau khi nhập ngày phải > ${DEFAULT_COL_WIDTH_PX}px, nhận ${width}px`);
    assert(width >= 100, `Độ rộng cột A phải >= 100px để không bị cắt chữ "31/12/2026", nhận ${width}px`);
  });

  test("(a) Nhập giờ HH:mm:ss vào cột độ rộng mặc định: cột tự động mở rộng vừa khít", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    eq(grid.getColumnWidth("B"), DEFAULT_COL_WIDTH_PX, "Cột B ban đầu phải ở độ rộng mặc định 64px");

    grid.setCellValue("B", 1, "13:45:30");
    const width = grid.getColumnWidth("B");
    assert(width > DEFAULT_COL_WIDTH_PX, `Độ rộng cột B sau khi nhập giờ phải > ${DEFAULT_COL_WIDTH_PX}px, nhận ${width}px`);
    assert(width >= 90, `Độ rộng cột B phải >= 90px để hiển thị trọn vẹn "13:45:30", nhận ${width}px`);
  });

  test("(a) Cột đã chỉnh độ rộng thủ công trước đó: không bị ghi đè khi nhập ngày", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.setColumnWidths(180, ["C"]);
    eq(grid.getColumnWidth("C"), 180, "Cột C đã được chỉnh thủ công 180px");

    grid.setCellValue("C", 1, "01/01/2026");
    eq(grid.getColumnWidth("C"), 180, "Cột C phải giữ nguyên độ rộng 180px do người dùng đã chỉnh");
  });

  test("(a) computeAutoFitColumnWidth tính trên chuỗi ngày tháng đã định dạng (10 ký tự) thay vì số serial thô", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    // Serial 46387 = 31/12/2026
    grid.cellsData.set("D1", {
      val: 46387,
      formula: "",
      style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" } }
    });

    const fitted = grid.computeAutoFitColumnWidth("D");
    assert(fitted >= 100, `computeAutoFitColumnWidth phải >= 100px cho ngày dd/mm/yyyy, nhận ${fitted}px`);
  });

  // =========================================================================
  // TEST (b): Thanh trạng thái chỉ hiện ký hiệu tiền tệ khi ô có định dạng tiền tệ
  // =========================================================================
  test("(b) Số thường: thanh trạng thái KHÔNG hiện ký hiệu tiền tệ đ/₫", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.setCellValue("A", 1, 4000000);
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };

    const stats = grid._calculateStats();
    eq(stats.count, 1);
    assert(!stats.sum.includes("đ") && !stats.sum.includes("₫"), `Tổng cộng số thường không được có ký hiệu tiền tệ, nhận: ${stats.sum}`);
    assert(!stats.avg.includes("đ") && !stats.avg.includes("₫"), `Trung bình số thường không được có ký hiệu tiền tệ, nhận: ${stats.avg}`);
    assert(stats.sum.includes("4.000.000") || stats.sum.includes("4,000,000"), `Tổng cộng phải chứa giá trị 4000000, nhận: ${stats.sum}`);
  });

  test("(b) Vùng chọn nhiều ô số thường: Sum/Avg không có ký hiệu tiền tệ", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.setCellValue("A", 1, 1000);
    grid.setCellValue("A", 2, 2000);
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } };

    const stats = grid._calculateStats();
    eq(stats.count, 2);
    assert(!stats.sum.includes("đ") && !stats.sum.includes("₫"), `Không được có ký hiệu tiền tệ, nhận: ${stats.sum}`);
    assert(!stats.avg.includes("đ") && !stats.avg.includes("₫"), `Không được có ký hiệu tiền tệ, nhận: ${stats.avg}`);
  });

  test("(b) Ô có định dạng tiền tệ (currency): thanh trạng thái CÓ hiện ký hiệu tiền tệ", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.cellsData.set("A1", { val: 5000000, formula: "", style: { numberFormat: { category: "currency", currencySymbol: "₫" } } });
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };

    const stats = grid._calculateStats();
    eq(stats.count, 1);
    assert(stats.sum.includes("₫") || stats.sum.includes("đ"), `Ô tiền tệ phải có ký hiệu tiền tệ trên thanh trạng thái, nhận: ${stats.sum}`);
  });

  test("(b) Vùng chọn rỗng / ô chữ: không hiện ký hiệu tiền tệ 0 đ", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.setCellValue("A", 1, "Văn bản mẫu");
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };

    const stats = grid._calculateStats();
    eq(stats.count, 0);
    assert(!stats.sum.includes("đ") && !stats.sum.includes("₫"), `Ô chữ không được hiện 0 đ trên thanh trạng thái, nhận: ${stats.sum}`);
    assert(!stats.avg.includes("đ") && !stats.avg.includes("₫"), `Ô chữ không được hiện 0 đ trên thanh trạng thái, nhận: ${stats.avg}`);
  });

  return results;
}
