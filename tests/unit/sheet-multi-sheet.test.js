/**
 * Unit Tests — VN Sheet Multi-Sheet Data Isolation & Tab Switching
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

function createMockContainer() {
  const listeners = {};
  return {
    innerHTML: "",
    className: "",
    style: {},
    appendChild() {},
    removeChild() {},
    insertBefore() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(evt, cb) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    classList: {
      add() {},
      remove() {},
      contains() { return false; }
    }
  };
}

export async function runMultiSheetTests() {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  // 1. Kiểm tra kiến trúc sheetsData riêng biệt cho từng sheet
  test("Multi-Sheet Architecture: Mỗi sheet sở hữu Map cellsData riêng biệt", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    if (!grid.sheetsData || typeof grid.sheetsData !== "object") {
      throw new Error("grid.sheetsData chưa được khai báo hoặc không phải object/Map");
    }

    const sheet1Data = grid.sheetsData["Dự toán chi phí"];
    const sheet2Data = grid.sheetsData["Kế hoạch Q3"];
    const sheet3Data = grid.sheetsData["Nhân sự"];

    if (!(sheet1Data instanceof Map) || !(sheet2Data instanceof Map) || !(sheet3Data instanceof Map)) {
      throw new Error("Mỗi sheet trong sheetsData phải là một thực thể Map riêng");
    }

    if (sheet1Data === sheet2Data || sheet2Data === sheet3Data) {
      throw new Error("Các sheet đang dùng chung cùng một tham chiếu Map!");
    }
  });

  // 2. Kiểm tra cô lập dữ liệu khi đổi sheet: A1 sheet 1 không rò rỉ sang sheet 2
  test("Multi-Sheet Isolation: Gõ ô A1 sheet 1, đổi sang sheet 2 ô A1 rỗng, đổi về sheet 1 dữ liệu còn nguyên", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);

    if (typeof grid.switchSheet !== "function") {
      throw new Error("grid.switchSheet(sheetName) chưa được hiện thực");
    }

    // Gõ dữ liệu vào ô A1 ở Sheet 1
    grid.setCellValue("A", 1, "Dữ liệu riêng của Sheet 1");
    const valSheet1Initial = grid.cellsData.get("A1")?.val;
    if (valSheet1Initial !== "Dữ liệu riêng của Sheet 1") {
      throw new Error(`Gán dữ liệu Sheet 1 thất bại: ${valSheet1Initial}`);
    }

    // Chuyển sang Sheet 2 ("Kế hoạch Q3")
    grid.switchSheet("Kế hoạch Q3");
    if (grid.activeSheet !== "Kế hoạch Q3") {
      throw new Error(`Không đổi activeSheet sang 'Kế hoạch Q3': hiện tại là ${grid.activeSheet}`);
    }

    // Xác nhận ô A1 ở Sheet 2 phải rỗng hoặc khác Sheet 1, KHÔNG được mang dữ liệu của Sheet 1
    const valSheet2Initial = grid.cellsData.get("A1")?.val;
    if (valSheet2Initial === "Dữ liệu riêng của Sheet 1") {
      throw new Error("LỖI DỮ LIỆU BỊ DÙNG CHUNG: Ô A1 của Sheet 2 mang nguyên dữ liệu của Sheet 1!");
    }
    if (valSheet2Initial !== undefined && valSheet2Initial !== "") {
      throw new Error(`Ô A1 ở Sheet 2 mới khởi tạo phải rỗng, thực tế nhận: ${valSheet2Initial}`);
    }

    // Gõ dữ liệu mới vào ô A1 ở Sheet 2
    grid.setCellValue("A", 1, "Dữ liệu riêng của Sheet 2");
    const valSheet2Updated = grid.cellsData.get("A1")?.val;
    if (valSheet2Updated !== "Dữ liệu riêng của Sheet 2") {
      throw new Error(`Gán dữ liệu Sheet 2 thất bại: ${valSheet2Updated}`);
    }

    // Chuyển lại về Sheet 1 ("Dự toán chi phí")
    grid.switchSheet("Dự toán chi phí");
    if (grid.activeSheet !== "Dự toán chi phí") {
      throw new Error(`Không đổi activeSheet về 'Dự toán chi phí': hiện tại là ${grid.activeSheet}`);
    }

    // Xác nhận ô A1 ở Sheet 1 vẫn còn nguyên giá trị cũ, không bị Sheet 2 ghi đè
    const valSheet1Final = grid.cellsData.get("A1")?.val;
    if (valSheet1Final !== "Dữ liệu riêng của Sheet 1") {
      throw new Error(`Dữ liệu Sheet 1 bị thay đổi hoặc ghi đè sau khi chuyển tab: nhận ${valSheet1Final}`);
    }
  });

  // 3. Kiểm tra FormulaEngine tính toán chính xác theo ngữ cảnh sheet đang active
  test("Multi-Sheet Formula: FormulaEngine tính toán độc lập theo từng sheet", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    if (typeof grid.switchSheet !== "function") {
      throw new Error("grid.switchSheet(sheetName) chưa được hiện thực");
    }

    // Sheet 1: A1=10, A2=20, tổng = 30
    grid.setCellValue("A", 1, 10);
    grid.setCellValue("A", 2, 20);
    const sumSheet1 = grid.formulaEngine.evaluate("=SUM(A1:A2)");
    if (sumSheet1 !== 30) {
      throw new Error(`SUM Sheet 1 sai: kỳ vọng 30, nhận ${sumSheet1}`);
    }

    // Chuyển sang Sheet 2: A1=100, A2=200, tổng = 300
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("A", 1, 100);
    grid.setCellValue("A", 2, 200);
    const sumSheet2 = grid.formulaEngine.evaluate("=SUM(A1:A2)");
    if (sumSheet2 !== 300) {
      throw new Error(`SUM Sheet 2 sai: kỳ vọng 300, nhận ${sumSheet2}`);
    }

    // Đổi lại Sheet 1: tổng vẫn phải là 30
    grid.switchSheet("Dự toán chi phí");
    const sumSheet1Again = grid.formulaEngine.evaluate("=SUM(A1:A2)");
    if (sumSheet1Again !== 30) {
      throw new Error(`SUM Sheet 1 sau khi đổi về sai: kỳ vọng 30, nhận ${sumSheet1Again}`);
    }
  });

  // 4. Thêm trang tính mới bằng addSheet
  test("Multi-Sheet Add: addSheet tạo sheet mới với data Map riêng và chuyển active", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    if (typeof grid.addSheet !== "function") {
      throw new Error("grid.addSheet chưa được hiện thực");
    }

    const newName = grid.addSheet("Kế hoạch 2027");
    if (!grid.sheets.includes("Kế hoạch 2027")) {
      throw new Error("Tên sheet mới chưa được thêm vào grid.sheets");
    }
    if (grid.activeSheet !== "Kế hoạch 2027") {
      throw new Error("addSheet chưa tự động chuyển sang sheet mới");
    }
    if (!(grid.sheetsData["Kế hoạch 2027"] instanceof Map)) {
      throw new Error("Sheet mới không có Map riêng");
    }

    grid.setCellValue("B", 5, "Doanh thu 2027");
    if (grid.cellsData.get("B5")?.val !== "Doanh thu 2027") {
      throw new Error("Không ghi được dữ liệu vào sheet mới");
    }
  });

  // 5. Kiểm tra Undo/Redo ghi nhận đúng sheet
  test("Multi-Sheet Undo/Redo: Hoàn tác tự động quay về sheet đã thực hiện thao tác", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.setCellValue("C", 1, "Ban đầu Sheet 1");
    grid.setCellValue("C", 1, "Đã sửa Sheet 1");

    // Đang ở Sheet 2
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("C", 1, "Dữ liệu Sheet 2");

    // Undo 1: Hoàn tác dữ liệu Sheet 2
    grid.undo();
    if (grid.cellsData.get("C1")?.val !== "") {
      throw new Error("Undo Sheet 2 không xóa được giá trị mới");
    }

    // Undo 2: Hoàn tác 'Đã sửa Sheet 1' -> phải tự nhảy về 'Dự toán chi phí'
    grid.undo();
    if (grid.activeSheet !== "Dự toán chi phí") {
      throw new Error(`Undo không tự chuyển về Sheet 1: hiện tại là ${grid.activeSheet}`);
    }
    if (grid.cellsData.get("C1")?.val !== "Ban đầu Sheet 1") {
      throw new Error(`Giá trị sau undo ở Sheet 1 sai: ${grid.cellsData.get("C1")?.val}`);
    }

    // Redo 1: Phục hồi 'Đã sửa Sheet 1'
    grid.redo();
    if (grid.cellsData.get("C1")?.val !== "Đã sửa Sheet 1") {
      throw new Error(`Redo ở Sheet 1 sai: ${grid.cellsData.get("C1")?.val}`);
    }
  });

  // 6. Kiểm tra cách ly trạng thái bộ lọc (Filter) giữa các sheet
  test("Multi-Sheet Filter Isolation: Trạng thái lọc không bị ảnh hưởng chéo giữa các sheet", () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.activeFilters.set("A", new Set(["SP01"]));
    grid.hiddenRows.add(5);
    grid.hiddenRows.add(6);
    grid.isFilterActive = true;

    // Chuyển sang Sheet 2
    grid.switchSheet("Nhân sự");
    if (grid.hiddenRows.size !== 0) {
      throw new Error("Sheet 2 bị dính hiddenRows của Sheet 1");
    }
    if (grid.isFilterActive !== false) {
      throw new Error("Sheet 2 bị dính isFilterActive của Sheet 1");
    }

    // Chuyển lại Sheet 1: trạng thái lọc phải được phục hồi
    grid.switchSheet("Dự toán chi phí");
    if (grid.hiddenRows.size !== 2 || !grid.hiddenRows.has(5) || !grid.hiddenRows.has(6)) {
      throw new Error("Sheet 1 không phục hồi đúng hiddenRows sau khi chuyển tab");
    }
    if (grid.isFilterActive !== true) {
      throw new Error("Sheet 1 không phục hồi đúng isFilterActive sau khi chuyển tab");
    }
  });

  return results;
}
