/**
 * Unit Tests: VN Sheet Print Titles — nhập tham chiếu kiểu Excel ($1:$2, $A:$B),
 * chọn trực tiếp hàng/cột trên lưới bằng chuột (nút thu gọn), và serialisation
 * vào workbook (vno:print-title-rows/cols → _xlnm.Print_Titles khi xuất XLSX).
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const container = () => ({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });

function fakeHeaderClick({ dataset = {}, shiftKey = false } = {}) {
  return {
    target: { closest: () => ({ dataset }) },
    shiftKey,
    preventDefault() {},
    stopPropagation() {}
  };
}

export async function runSheetPrintTitlesGridSelectionTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ className: "", textContent: "", setAttribute() {} }) };
  try {
    const grid = new SheetGridController(container());
    // G7 starts a new workbook with one Sheet1; this feature needs two sheets to
    // verify that print-title settings stay attached to their own sheet.
    grid.addSheet("Sheet2", false);

    await test("Print Titles: nhập tham chiếu Excel $1:$2 và $A:$B được chuẩn hoá khi lưu", () => {
      const result = grid.setPageSetup({ printTitles: { rows: "$1:$2", cols: "$A:$B" } });
      assert(result !== false, "setPageSetup phải chấp nhận $1:$2 / $A:$B");
      const setup = grid.getPageSetup();
      assert(setup.printTitles.rows === "1:2", `rows phải được chuẩn hoá thành "1:2", nhận "${setup.printTitles.rows}"`);
      assert(setup.printTitles.cols === "A:B", `cols phải được chuẩn hoá thành "A:B", nhận "${setup.printTitles.cols}"`);
    });

    await test("Print Titles: nhập $2 (đơn) và $b (chữ thường) được chuẩn hoá đúng", () => {
      const single = grid.setPageSetup({ printTitles: { rows: "$2" } });
      assert(single !== false, "setPageSetup phải chấp nhận $2");
      assert(grid.getPageSetup().printTitles.rows === "2", `rows phải là "2", nhận "${grid.getPageSetup().printTitles.rows}"`);
      const lower = grid.setPageSetup({ printTitles: { cols: "$b" } });
      assert(lower !== false, "setPageSetup phải chấp nhận $b");
      assert(grid.getPageSetup().printTitles.cols === "B", `cols phải được viết hoa thành "B", nhận "${grid.getPageSetup().printTitles.cols}"`);
    });

    await test("Print Titles: giá trị không hợp lệ vẫn bị từ chối", () => {
      assert(grid.setPageSetup({ printTitles: { rows: "1:A" } }) === false, "rows '1:A' phải bị từ chối");
      assert(grid.setPageSetup({ printTitles: { cols: "1" } }) === false, "cols '1' phải bị từ chối");
      assert(grid.setPageSetup({ printTitles: { rows: "abc" } }) === false, "rows 'abc' phải bị từ chối");
    });

    await test("Print Titles: _parsePrintTitleRows/Cols đọc đúng tham chiếu $", () => {
      const rowRange = grid._parsePrintTitleRows({ printTitles: { rows: "$1:$2" } });
      assert(rowRange && rowRange.start === 1 && rowRange.end === 2, `rows "$1:$2" phải parse thành {start:1,end:2}, nhận ${JSON.stringify(rowRange)}`);
      const colRange = grid._parsePrintTitleCols({ printTitles: { cols: "$A:$C" } });
      assert(colRange && colRange.start === 1 && colRange.end === 3, `cols "$A:$C" phải parse thành {start:1,end:3}, nhận ${JSON.stringify(colRange)}`);
      const singleRow = grid._parsePrintTitleRows({ printTitles: { rows: "$3" } });
      assert(singleRow && singleRow.start === 3 && singleRow.end === 3, `rows "$3" phải parse thành {start:3,end:3}, nhận ${JSON.stringify(singleRow)}`);
    });

    await test("Print Titles: chọn hàng trên lưới — nhấp đơn và Shift+nhấn mở rộng", () => {
      grid._printTitleSelect = { field: "rows", anchor: null, current: null, pendingValue: null, hint: { querySelector: () => null } };
      grid._onPrintTitleGridClick(fakeHeaderClick({ dataset: { row: "2" } }));
      assert(grid._printTitleSelect.pendingValue === "2", `Nhấp hàng 2 phải cho "2", nhận "${grid._printTitleSelect.pendingValue}"`);
      grid._onPrintTitleGridClick(fakeHeaderClick({ dataset: { row: "5" }, shiftKey: true }));
      assert(grid._printTitleSelect.pendingValue === "2:5", `Shift+nhấn hàng 5 phải mở rộng thành "2:5", nhận "${grid._printTitleSelect.pendingValue}"`);
      grid._onPrintTitleGridClick(fakeHeaderClick({ dataset: { row: "1" }, shiftKey: true }));
      assert(grid._printTitleSelect.pendingValue === "1:2", `Shift+nhấn hàng 1 từ neo hàng 2 phải cho "1:2", nhận "${grid._printTitleSelect.pendingValue}"`);
      grid._printTitleSelect = null;
    });

    await test("Print Titles: chọn cột trên lưới — nhấp đơn và Shift+nhấn mở rộng", () => {
      grid._printTitleSelect = { field: "cols", anchor: null, current: null, pendingValue: null, hint: { querySelector: () => null } };
      grid._onPrintTitleGridClick(fakeHeaderClick({ dataset: { col: "B" } }));
      assert(grid._printTitleSelect.pendingValue === "B", `Nhấp cột B phải cho "B", nhận "${grid._printTitleSelect.pendingValue}"`);
      grid._onPrintTitleGridClick(fakeHeaderClick({ dataset: { col: "D" }, shiftKey: true }));
      assert(grid._printTitleSelect.pendingValue === "B:D", `Shift+nhấn cột D phải mở rộng thành "B:D", nhận "${grid._printTitleSelect.pendingValue}"`);
      grid._printTitleSelect = null;
    });

    await test("Print Titles: formatPrintTitleSelection chuẩn hoá thứ tự và giá trị đơn", () => {
      assert(grid.formatPrintTitleSelection("rows", 1, 2) === "1:2", "rows (1,2) phải là '1:2'");
      assert(grid.formatPrintTitleSelection("rows", 3, 3) === "3", "rows (3,3) phải là '3'");
      assert(grid.formatPrintTitleSelection("rows", 4, 2) === "2:4", "rows (4,2) phải được hoán đổi thành '2:4'");
      assert(grid.formatPrintTitleSelection("cols", 1, 2) === "A:B", "cols (1,2) phải là 'A:B'");
      assert(grid.formatPrintTitleSelection("cols", 2, 2) === "B", "cols (2,2) phải là 'B'");
      assert(grid.formatPrintTitleSelection("cols", 3, 1) === "A:C", "cols (3,1) phải được hoán đổi thành 'A:C'");
    });

    await test("Print Titles: serialisation — FODS ghi vno:print-title-rows/cols theo đúng sheet", () => {
      const first = grid.activeSheet;
      grid.setPageSetup({ printTitles: { rows: "$1:$2", cols: "$A:$B" } });
      const fods = new SheetAdapter(grid).serializeToFods();
      const tableMatch = fods.match(new RegExp(`<table:table table:name="${first}"[^>]*>`));
      assert(tableMatch, "Phải tìm thấy thẻ table của sheet đầu tiên");
      assert(/vno:print-title-rows="1:2"/.test(tableMatch[0]), `FODS phải ghi vno:print-title-rows="1:2", nhận: ${tableMatch[0]}`);
      assert(/vno:print-title-cols="A:B"/.test(tableMatch[0]), `FODS phải ghi vno:print-title-cols="A:B", nhận: ${tableMatch[0]}`);
      const second = grid.sheets.find(name => name !== first);
      const secondMatch = fods.match(new RegExp(`<table:table table:name="${second}"[^>]*>`));
      assert(secondMatch, "Phải tìm thấy thẻ table của sheet thứ hai");
      assert(!/vno:print-title-rows="1:2"/.test(secondMatch[0]), "Sheet thứ hai phải không bị lẫn giá trị của sheet đầu");
    });

    await test("Print Titles: round-trip serialize → parse giữ nguyên giá trị đã chuẩn hoá", () => {
      const first = grid.activeSheet;
      grid.setPageSetup({ printTitles: { rows: "$1:$2", cols: "$A:$B" } });
      const fods = new SheetAdapter(grid).serializeToFods();
      const parsed = new SheetAdapter(null).parseFods(fods);
      const titles = parsed.pageSetupBySheet[first].printTitles;
      assert(titles.rows === "1:2", `Round-trip rows phải là "1:2", nhận "${titles.rows}"`);
      assert(titles.cols === "A:B", `Round-trip cols phải là "A:B", nhận "${titles.cols}"`);
    });

    await test("Print Titles: giá trị lưu riêng theo từng sheet, không rò khi chuyển tab", () => {
      const first = grid.activeSheet;
      grid.setPageSetup({ printTitles: { rows: "$1:$3", cols: "$A" } });
      const second = grid.sheets.find(name => name !== first);
      grid.switchSheet(second);
      const secondSetup = grid.getPageSetup();
      assert(secondSetup.printTitles.rows === "" && secondSetup.printTitles.cols === "", `Sheet thứ hai phải có printTitles rỗng, nhận ${JSON.stringify(secondSetup.printTitles)}`);
      grid.switchSheet(first);
      const firstSetup = grid.getPageSetup();
      assert(firstSetup.printTitles.rows === "1:3" && firstSetup.printTitles.cols === "A", `Sheet đầu phải giữ nguyên "1:3"/"A", nhận ${JSON.stringify(firstSetup.printTitles)}`);
    });
  } finally {
    globalThis.document = originalDocument;
  }
  return results;
}
