import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { NumberFormatter } from "../../apps/sheet/number-formatter.js";

function container() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetBasicOpsParityTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Excel locale entry: separators, percent values, currency symbols and date parsing", () => {
    const viNumber = { category: "number", decimals: 2, useThousands: true };
    const viPercent = { category: "percentage", decimals: 2 };
    const viCurrency = { category: "currency", currencySymbol: "₫", decimals: 2 };
    assert(NumberFormatter.normalizeInputForFormat("1.234,56", viNumber, "vi-VN") === 1234.56, "Số Việt Nam phải lưu 1234.56");
    assert(NumberFormatter.normalizeInputForFormat("1,234.56", viNumber, "vi-VN") === 1234.56, "Dấu US phải được nhận diện khi nhập lẫn kiểu dấu");
    assert(NumberFormatter.normalizeInputForFormat("1,234,567.89", viNumber, "vi-VN") === 1234567.89, "Dấu US hàng nghìn và thập phân phải được nhận diện cùng lúc");
    assert(NumberFormatter.normalizeInputForFormat("12,5%", viPercent, "vi-VN") === 0.125, "Phần trăm có dấu % phải chia 100");
    assert(NumberFormatter.normalizeInputForFormat("0,125", viPercent, "vi-VN") === 0.125, "Số nhập vào ô % phải giữ nguyên giá trị gốc");
    assert(NumberFormatter.normalizeInputForFormat("12/31/2026", { category: "date" }, "vi-VN") === "12/31/2026", "Ngày MM/DD không hợp lệ với thiết lập ngày Việt Nam phải giữ dạng văn bản");
    assert(NumberFormatter.normalizeInputForFormat("$1,234.50", { category: "currency", currencySymbol: "$" }, "vi-VN") === "$1,234.50", "Ký hiệu tiền ngoại tệ không thuộc thiết lập vùng phải giữ dạng văn bản");
    assert(NumberFormatter.normalizeInputForFormat("1.234,50 ₫", viCurrency, "vi-VN") === 1234.5, "Tiền VND phải nhận dấu và ký hiệu Việt Nam");
    assert(NumberFormatter.normalizeInputForFormat("1,234.56", viNumber, "en-US") === 1234.56, "Nhập liệu Hoa Kỳ phải theo dấu phẩy hàng nghìn và chấm thập phân");
    assert(NumberFormatter.normalizeInputForFormat("12/31/2026", { category: "date" }, "en-US") === 46387, "Ngày Hoa Kỳ phải được nhận theo tháng/ngày/năm");
    assert(NumberFormatter.normalizeInputForFormat("$1,234.50", { category: "currency", currencySymbol: "$" }, "en-US") === 1234.5, "Tiền USD phải nhận ký hiệu và dấu Hoa Kỳ");
    assert(NumberFormatter.formatValue(1234.56, { ...viNumber, locale: "en-US" }).text === "1,234.56", "Hiển thị số phải theo dấu Hoa Kỳ");
    assert(NumberFormatter.formatValue(1234.56, { ...viNumber, locale: "vi-VN" }).text === "1.234,56", "Hiển thị số phải theo dấu Việt Nam");
    assert(NumberFormatter.formatValue(0.125, { ...viPercent, locale: "vi-VN" }).text === "12,50%", "Hiển thị phần trăm phải theo dấu Việt Nam");
    assert(NumberFormatter.normalizeInputForFormat(0.125, viPercent, "vi-VN") === 0.125, "Giá trị số 0.125 đã được phân tích không được đọc lại thành 125 theo locale Việt Nam");
    assert(NumberFormatter.formatValue(123.46, { locale: "vi-VN" }).text === "123,46", "General phải hiển thị dấu thập phân của locale Việt Nam");
    assert(NumberFormatter.formatValue(123.46, { locale: "en-US" }).text === "123.46", "General phải hiển thị dấu thập phân của locale Hoa Kỳ");
    assert(NumberFormatter.formatGeneralNumber(100 / 3) === "33.33333333", "General phải khớp số chữ số Excel hiển thị cho 100/3");
    assert(NumberFormatter.formatGeneralNumber(100 / 3, "vi-VN") === "33,33333333", "General của VN phải dùng dấu phẩy thập phân");
  });

  await test("Excel formulas: absolute references resolve and DATE returns an Excel serial", () => {
    const cells = new Map([
      ["A1", { val: 10, formula: "", style: {} }],
      ["B1", { val: 2, formula: "", style: {} }]
    ]);
    const engine = new FormulaEngine(cells, null, null, null, null, () => "vi-VN");
    assert(engine.evaluate("=A1*$B$1") === 20, "Tham chiếu tuyệt đối phải được tính như Excel");
    const serial = engine.evaluate("=DATE(2026,9,30)");
    assert(serial === 46295, `DATE phải trả serial Excel 46295, nhận được ${serial}`);
    assert(engine.evaluate('=TEXT(DATE(2026,9,30),"dd/mm/yyyy")') === "30/09/2026", "TEXT phải định dạng serial DATE thành ngày Việt Nam");
    assert(engine.evaluate('=TEXT(123.456,"0.00")') === "123,46", "TEXT phải dùng dấu thập phân của locale Sheet");
  });

  await test("Copy điều chỉnh tham chiếu; Cut giữ nguyên tham chiếu và hoàn tác như một thao tác", async () => {
    const grid = new SheetGridController(container(), { locale: "vi-VN" });
    grid.setCellValue("A", 1, 10, false);
    grid.setCellValue("B", 1, 2, false);
    grid.setCellValue("B", 2, "=A1*$B$1", false);
    const adapter = new SheetAdapter(grid);

    grid.selectCell("B", 2);
    await adapter._copySelectedCell(false);
    grid.selectCell("C", 2);
    await adapter._pasteIntoSelectedCell();
    assert(grid.cellsData.get("C2")?.formula === "=B1*$B$1", "Copy phải dịch tham chiếu tương đối và giữ tham chiếu tuyệt đối");
    assert(grid.cellsData.get("C2")?.val === 4, "Công thức copy phải tính ra 4");

    grid.undoStack = [];
    grid.selectCell("B", 2);
    await adapter._copySelectedCell(true);
    assert(grid.cellsData.get("B2")?.formula === "=A1*$B$1", "Cut chỉ xóa nguồn sau khi dán");
    grid.selectCell("D", 2);
    await adapter._pasteIntoSelectedCell();
    assert(grid.cellsData.get("D2")?.formula === "=A1*$B$1", "Cut phải giữ nguyên tham chiếu như Excel Move");
    assert(grid.cellsData.get("D2")?.val === 20 && !grid.cellsData.has("B2"), "Cut phải chuyển công thức và xóa nguồn");
    assert(grid.undoStack.length === 1, "Cut/Paste phải là một bước Undo");
    grid.undo();
    assert(grid.cellsData.get("B2")?.formula === "=A1*$B$1" && !grid.cellsData.get("D2")?.formula && grid.cellsData.get("D2")?.val === "", "Undo phải khôi phục nguồn và làm trống đích");
    grid.redo();
    assert(grid.cellsData.get("D2")?.formula === "=A1*$B$1" && !grid.cellsData.has("B2"), "Redo phải áp lại thao tác Cut/Paste");
  });

  await test("AutoFill lấp tên thứ tiếng Anh kế tiếp", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "Monday", false);
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startRow: 2, endRow: 4 }
    );
    assert([2, 3, 4].map(row => grid.cellsData.get(`A${row}`)?.val).join(",") === "Tuesday,Wednesday,Thursday", "Fill handle phải tạo chuỗi weekday tiếng Anh");
  });

  await test("AutoFill dịch tham chiếu tương đối và giữ tham chiếu tuyệt đối", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("C", 1, 10, false);
    grid.setCellValue("C", 2, 20, false);
    grid.setCellValue("H", 1, 10, false);
    grid.setCellValue("I", 1, "=C1*$H$1", false);
    grid._executeAutofill(
      { start: { c: "I", r: 1 }, end: { c: "I", r: 1 } },
      { direction: "down", startRow: 2, endRow: 2 }
    );
    assert(grid.cellsData.get("I2")?.formula === "=C2*$H$1", "Fill handle phải dịch C1 thành C2 và giữ $H$1");
    assert(grid.cellsData.get("I2")?.val === 200, "Công thức đã điền phải tính bằng 200");
  });

  await test("Insert Column kế thừa độ rộng cột bên trái và Undo/Redo kích thước", () => {
    const grid = new SheetGridController(container());
    grid.setColumnWidths(140, ["A"], false);
    grid.undoStack = [];
    grid.insertColumn("B");
    assert(grid.getColumnWidth("B") === 140, "Cột B mới phải kế thừa độ rộng cột A như Excel");
    grid.undo();
    assert(grid.getColumnWidth("A") === 140 && grid.getColumnWidth("B") === 64, "Undo phải khôi phục độ rộng trước khi chèn");
    grid.redo();
    assert(grid.getColumnWidth("B") === 140, "Redo phải khôi phục độ rộng vừa kế thừa");
  });

  await test("Filter áp dụng từ hàng sau tiêu đề đến hết filter range", () => {
    const grid = new SheetGridController(container());
    [["Mã", "Tên"], [3, "C"], [1, "A"], [2, "B"]].forEach((row, index) => {
      grid.setCellValue("A", index + 1, row[0], false);
      grid.setCellValue("B", index + 1, row[1], false);
    });
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 4 } };
    grid.applyFilter("B", new Set(["A"]), true, { activate: true, range: "A1:B4" });
    assert([...grid.hiddenRows].sort((a, b) => a - b).join(",") === "2,4", "Filter phải xét các hàng 2–4 trong vùng, không bỏ qua hàng 2");
    assert(grid.isFilterActive, "Bật AutoFilter và áp dụng tiêu chí phải là một thao tác");
    grid.undo();
    assert(!grid.isFilterActive && grid.hiddenRows.size === 0, "Undo phải tắt AutoFilter và hiện lại các hàng");
    grid.redo();
    assert(grid.isFilterActive && [...grid.hiddenRows].sort((a, b) => a - b).join(",") === "2,4", "Redo phải khôi phục tiêu chí và các hàng ẩn");
  });

  await test("AutoFit đo theo nội dung và Wrap Text lưu chiều cao hàng với Undo/Redo", () => {
    const grid = new SheetGridController(container());
    grid.setColumnWidths(200, ["A", "B"], false);
    grid.setCellValue("A", 1, "Mã đơn hàng dài 2026", false);
    assert(grid.autoFitColumn("A", false) === 142, "AutoFit cột A phải khớp 142 px Excel đo được");
    grid.setCellValue("B", 1, "Nội dung dài cần ngắt dòng trong ô", false);
    grid.selectCell("B", 1);
    grid.undoStack = [];
    grid.toggleWrapText();
    assert(grid.getRowHeight(1) === 40, "Wrap Text hai dòng phải tăng chiều cao hàng lên 40 px");
    assert(grid.undoStack.length === 1, "Wrap Text và chiều cao hàng phải là một thao tác Undo");
    grid.undo();
    assert(grid.getRowHeight(1) === 20 && grid.cellsData.get("B1")?.style?.whiteSpace !== "normal", "Undo phải khôi phục chiều cao và kiểu ngắt dòng");
    grid.redo();
    assert(grid.getRowHeight(1) === 40 && grid.cellsData.get("B1")?.style?.whiteSpace === "normal", "Redo phải áp lại chiều cao và kiểu ngắt dòng");
  });

  return results;
}
