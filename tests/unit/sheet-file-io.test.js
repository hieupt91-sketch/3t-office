/**
 * Unit Tests — VN Sheet Real File I/O & CSV Serialization
 */

import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

export async function runSheetFileIoTests() {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  // Mock Grid Controller for testing
  class MockGridController {
    constructor() {
      this.cols = ["A", "B", "C", "D", "E", "F"];
      this.rowCount = 10;
      this.cellsData = new Map();
      this.selectedCell = null;
      this.statusUpdated = false;
    }

    setCellValue(col, row, val) {
      const key = `${col}${row}`;
      const item = { val, formula: "", style: {} };
      if (typeof val === "string" && val.startsWith("=")) {
        item.formula = val;
        item.val = 100;
      }
      this.cellsData.set(key, item);
    }

    selectCell(col, row) {
      this.selectedCell = `${col}${row}`;
    }

    updateStatus() {
      this.statusUpdated = true;
    }
  }

  test("SheetAdapter: serializeToCsv tạo chuỗi CSV chuẩn xác từ dữ liệu lưới", () => {
    const grid = new MockGridController();
    grid.setCellValue("A", 1, "Mã hàng");
    grid.setCellValue("B", 1, "Tên sản phẩm");
    grid.setCellValue("C", 1, "Thành tiền");
    grid.setCellValue("A", 2, "SP01");
    grid.setCellValue("B", 2, 'Bút bi, mực xanh "Thiên Long"');
    grid.setCellValue("C", 2, "=SUM(D2:E2)");

    const adapter = new SheetAdapter(grid);
    const csv = adapter.serializeToCsv();

    if (!csv.includes("Mã hàng,Tên sản phẩm,Thành tiền")) {
      throw new Error(`Dòng tiêu đề không đúng: ${csv}`);
    }
    if (!csv.includes('"Bút bi, mực xanh ""Thiên Long"""')) {
      throw new Error(`Dấu phẩy và ngoặc kép chưa được escape RFC 4180 đúng: ${csv}`);
    }
    if (!csv.includes("=SUM(D2:E2)")) {
      throw new Error(`Công thức không được bảo toàn: ${csv}`);
    }
  });

  test("SheetAdapter: parseCsv phân tích chính xác chuỗi CSV có dấu phẩy và ngoặc kép", () => {
    const adapter = new SheetAdapter(null);
    const raw = 'A,B,C\r\n1,"Chuỗi có, dấu phẩy","Chuỗi có ""ngoặc kép"""\r\n2,100,=A2+B2';
    const parsed = adapter.parseCsv(raw);

    if (parsed.length !== 3) {
      throw new Error(`Số dòng không đúng: ${parsed.length}, kỳ vọng 3`);
    }
    if (parsed[1][1] !== "Chuỗi có, dấu phẩy") {
      throw new Error(`Giá trị có dấu phẩy parse sai: ${parsed[1][1]}`);
    }
    if (parsed[1][2] !== 'Chuỗi có "ngoặc kép"') {
      throw new Error(`Giá trị có ngoặc kép parse sai: ${parsed[1][2]}`);
    }
    if (parsed[2][2] !== "=A2+B2") {
      throw new Error(`Công thức parse sai: ${parsed[2][2]}`);
    }
  });

  test("SheetAdapter: loadFromCsv nạp chính xác các ô vào gridController", () => {
    const grid = new MockGridController();
    const adapter = new SheetAdapter(grid);
    const rawCsv = "STT,Mô tả,Số lượng\n1,Giấy A4,50\n2,Kẹp ghim,100";

    adapter.loadFromCsv(rawCsv);

    if (grid.cellsData.get("A1")?.val !== "STT") {
      throw new Error(`A1 không đúng: ${grid.cellsData.get("A1")?.val}`);
    }
    if (grid.cellsData.get("B2")?.val !== "Giấy A4") {
      throw new Error(`B2 không đúng: ${grid.cellsData.get("B2")?.val}`);
    }
    if (grid.cellsData.get("C3")?.val !== "100") {
      throw new Error(`C3 không đúng: ${grid.cellsData.get("C3")?.val}`);
    }
    if (grid.selectedCell !== "A1") {
      throw new Error(`Chưa select lại A1 sau khi nạp: ${grid.selectedCell}`);
    }
  });

  await asyncTest("SheetAdapter: handleDispatch điều phối save, open, exportPdf chuẩn xác", async () => {
    const grid = new MockGridController();
    grid.setCellValue("A", 1, "Dữ liệu");
    const adapter = new SheetAdapter(grid);

    let saveCalledWith = null;
    let openCalled = false;
    let exportPdfCalled = false;

    const origSave = globalUnoBridge.saveRealFile;
    const origOpen = globalUnoBridge.openRealFile;
    const origPdf = globalUnoBridge.exportRealPdf;

    globalUnoBridge.saveRealFile = async (kind, content, format, name) => {
      saveCalledWith = { kind, content, format, name };
      return { status: "ok", message: "Đã lưu", path: "test.xlsx" };
    };
    globalUnoBridge.openRealFile = async (kind) => {
      openCalled = true;
      return { status: "ok", content: "A,B\n1,2", fileName: "BaoCao.xlsx" };
    };
    globalUnoBridge.exportRealPdf = async (kind, content, name) => {
      exportPdfCalled = true;
      return { status: "ok", message: "Đã xuất PDF", path: "test.pdf" };
    };

    try {
      await adapter.handleDispatch(".uno:Save", null, "common.file.save");
      if (!saveCalledWith || saveCalledWith.kind !== "sheet" || saveCalledWith.format !== "xlsx") {
        throw new Error(`Lưu file không gọi đúng Bridge: ${JSON.stringify(saveCalledWith)}`);
      }

      await adapter.handleDispatch(".uno:Open", null, "common.file.open");
      if (!openCalled || adapter.sourceFileName !== "BaoCao") {
        throw new Error(`Mở file không gọi Bridge hoặc không cập nhật sourceFileName`);
      }

      await adapter.handleDispatch(".uno:ExportDirectToPDF", null, "common.file.exportPdf");
      if (!exportPdfCalled) {
        throw new Error(`Xuất PDF không gọi Bridge`);
      }
    } finally {
      globalUnoBridge.saveRealFile = origSave;
      globalUnoBridge.openRealFile = origOpen;
      globalUnoBridge.exportRealPdf = origPdf;
    }
  });

  return results;
}
