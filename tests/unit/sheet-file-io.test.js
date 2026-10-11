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
      this.sheets = ["Trang tính 1"];
      this.activeSheet = "Trang tính 1";
      this.sheetsData = { "Trang tính 1": new Map() };
      this.selectedCell = null;
      this.statusUpdated = false;
    }

    get cellsData() {
      return this.sheetsData[this.activeSheet];
    }

    resetToBlank(name = "Trang tính 1") {
      this.sheets = [name];
      this.activeSheet = name;
      this.sheetsData = { [name]: new Map() };
    }

    addSheet(name) {
      if (!this.sheets.includes(name)) this.sheets.push(name);
      this.sheetsData[name] ||= new Map();
      this.activeSheet = name;
      return name;
    }

    switchSheet(name) {
      if (!this.sheets.includes(name)) this.sheets.push(name);
      this.sheetsData[name] ||= new Map();
      this.activeSheet = name;
      return true;
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

  test("SheetAdapter: parseCsv tự nhận dấu chấm phẩy/tab và bỏ UTF-8 BOM", () => {
    const adapter = new SheetAdapter(null);
    const semicolon = adapter.parseCsv("\uFEFFMã;Tên hàng;Thành tiền\r\nSP01;Cà phê;1.234,56");
    const tab = adapter.parseCsv("Mã\tTên hàng\tSố lượng\nSP02\tBánh mì\t12");
    if (semicolon[0].join("|") !== "Mã|Tên hàng|Thành tiền") {
      throw new Error(`CSV dấu chấm phẩy/BOM parse sai: ${JSON.stringify(semicolon)}`);
    }
    if (semicolon[1][2] !== "1.234,56") {
      throw new Error(`Số vi-VN bị tách sai: ${JSON.stringify(semicolon[1])}`);
    }
    if (tab[1].join("|") !== "SP02|Bánh mì|12") {
      throw new Error(`TSV parse sai: ${JSON.stringify(tab)}`);
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

  test("SheetAdapter: loadFromCsv chuyển số vi-VN thành number", () => {
    const grid = new MockGridController();
    const adapter = new SheetAdapter(grid);
    adapter.loadFromCsv("Mã;Thành tiền\nSP01;1.234,56");
    if (grid.cellsData.get("B2")?.val !== 1234.56) {
      throw new Error(`Số vi-VN chưa thành number: ${grid.cellsData.get("B2")?.val}`);
    }
  });

  test("SheetAdapter: FODS round-trip giữ nguyên dữ liệu, tên và active sheet của 3 sheet", () => {
    const source = new MockGridController();
    source.sheets = ["Doanh thu", "Kế hoạch quý", "Nhân sự Việt Nam"];
    source.sheetsData = {
      "Doanh thu": new Map([
        ["A1", { val: "Sản phẩm", formula: "", style: {} }],
        ["B2", { val: 1250.5, formula: "", style: {} }],
        ["C3", { val: 1260.5, formula: "=SUM(B2,10)", style: {} }]
      ]),
      "Kế hoạch quý": new Map([
        ["A1", { val: "Quý III & IV <2027>", formula: "", style: {} }],
        ["F10", { val: -42.75, formula: "", style: {} }]
      ]),
      "Nhân sự Việt Nam": new Map([
        ["A1", { val: "Nguyễn Văn An", formula: "", style: {} }],
        ["B1", { val: 37, formula: "", style: {} }]
      ])
    };
    source.activeSheet = "Kế hoạch quý";

    const xml = new SheetAdapter(source).serializeToFods();
    if ((xml.match(/<table:table table:name=/g) || []).length !== 3) throw new Error("FODS không chứa đúng 3 sheet");
    if (!xml.includes("Kế hoạch quý") || !xml.includes("&amp;") || !xml.includes("&lt;2027&gt;")) {
      throw new Error("Tên sheet hoặc chuỗi XML chưa được bảo toàn/escape đúng");
    }

    const target = new MockGridController();
    const adapter = new SheetAdapter(target);
    if (!adapter.loadFromFods(xml)) throw new Error("Không nạp được FODS vừa serialize");
    if (target.sheets.join("|") !== source.sheets.join("|")) throw new Error(`Sai danh sách sheet: ${target.sheets.join("|")}`);
    if (target.activeSheet !== "Kế hoạch quý") throw new Error(`Sai active sheet: ${target.activeSheet}`);
    if (target.sheetsData["Doanh thu"].get("B2")?.val !== 1250.5) throw new Error("Mất/sai số ở sheet Doanh thu");
    if (target.sheetsData["Doanh thu"].get("C3")?.formula !== "=SUM(B2,10)") throw new Error("Mất công thức gốc ở sheet Doanh thu");
    if (target.sheetsData["Kế hoạch quý"].get("A1")?.val !== "Quý III & IV <2027>") throw new Error("Sai chuỗi escape ở sheet Kế hoạch quý");
    if (target.sheetsData["Kế hoạch quý"].get("F10")?.val !== -42.75) throw new Error("Mất số ở sheet Kế hoạch quý");
    if (target.sheetsData["Nhân sự Việt Nam"].get("A1")?.val !== "Nguyễn Văn An") throw new Error("Mất Unicode ở sheet Nhân sự Việt Nam");
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
      return { status: "ok", content: adapter.serializeToFods(), fileName: "BaoCao.xlsx" };
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
      if (!saveCalledWith.content.includes("<office:spreadsheet>") || !saveCalledWith.content.includes("<table:table")) {
        throw new Error("Bridge chưa nhận nội dung FODS");
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
