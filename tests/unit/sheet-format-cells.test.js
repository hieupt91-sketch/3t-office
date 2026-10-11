/**
 * Test Suite: VN Sheet Format Cells Dialog & Number Formats
 * Kiểm thử toàn diện hộp thoại Định dạng ô (Ctrl+1) và hệ thống định dạng số kế toán
 */

import { NumberFormatter } from "../../apps/sheet/number-formatter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function mockContainer() {
  const classes = new Set();
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, force) { force ? classes.add(name) : classes.delete(name); },
      contains(name) { return classes.has(name); }
    }
  };
}

export async function runSheetFormatCellsTests() {
  const results = [];

  // Helper push test
  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  // 1. Kiểm tra Khai báo Command, Shortcut Ctrl+1, Dispatch Mapping & Ribbon
  test("Sheet Format Cells: Khai báo lệnh sheet.format.cellsDialog với shortcut Ctrl+1 chuẩn Excel", () => {
    const cmd = SHEET_COMMANDS.find(c => c.id === "sheet.format.cellsDialog");
    assert(cmd, "Lệnh sheet.format.cellsDialog phải được khai báo trong SHEET_COMMANDS");
    assert(cmd.shortcut === "Ctrl+1", "Phím tắt phải là Ctrl+1 chuẩn Excel");
    assert(cmd.category === "number", "Category của lệnh phải là number");
    assert(cmd.icon === "formatCells", "Icon phải là formatCells");
  });

  test("Sheet Format Cells: Ánh xạ UNO hai chiều .uno:FormatCellDialog tương thích LibreOffice", () => {
    assert(VN_TO_UNO_MAP["sheet.format.cellsDialog"] === ".uno:FormatCellDialog", 
      "Lệnh sheet.format.cellsDialog phải ánh xạ sang .uno:FormatCellDialog");
  });

  test("Sheet Format Cells: ShortcutManager gán Ctrl+1 cho sheet.format.cellsDialog trong scope sheet", () => {
    globalShortcutManager.setActiveScope("sheet");
    const normalizedCombo = globalShortcutManager._normalizeCombo("Ctrl+1");
    const mappedCmd = globalShortcutManager._shortcuts.get(normalizedCombo);
    assert(mappedCmd === "sheet.format.cellsDialog", `Ctrl+1 trong scope sheet phải trỏ tới sheet.format.cellsDialog (nhận được: ${mappedCmd})`);
  });

  test("Sheet Format Cells: Ribbon nhóm Định dạng số chứa launcherCommandId và nút mở dialog", () => {
    const homeTab = SHEET_RIBBON_TABS.find(t => t.id === "home");
    assert(homeTab, "Phải có tab Trang đầu (home)");
    const numberGroup = homeTab.groups.find(g => g.labelKey === "sheetRibbon.group.number");
    assert(numberGroup, "Phải có nhóm Định dạng số (number)");
    assert(numberGroup.launcherCommandId === "sheet.format.cellsDialog", "Nhóm number phải có launcherCommandId = sheet.format.cellsDialog");
    
    // Kiểm tra có nút trong column items
    const colItem = numberGroup.items.find(it => it.type === "column");
    assert(colItem, "Nhóm number phải có cột nút");
    const dialogBtn = colItem.items.find(it => it.commandId === "sheet.format.cellsDialog");
    assert(dialogBtn, "Cột nút phải chứa nút sheet.format.cellsDialog");
  });

  test("Sheet Format Cells: Hỗ trợ đầy đủ bản dịch i18n song ngữ VI và EN cho command và dialog", () => {
    assert(viStrings.commands["sheet.format.cellsDialog"], "Bản dịch VI cho command phải tồn tại");
    assert(enStrings.commands["sheet.format.cellsDialog"], "Bản dịch EN cho command phải tồn tại");
    assert(viStrings.sheetFormatCells?.dialogTitle, "Bản dịch VI cho dialog title phải tồn tại");
    assert(enStrings.sheetFormatCells?.dialogTitle, "Bản dịch EN cho dialog title phải tồn tại");
  });

  // 2. Unit Test Category Number
  test("Category Number: Định dạng số thập phân và dấu phân cách hàng nghìn", () => {
    const res1 = NumberFormatter.formatNumber(1234567.891, { decimals: 2, useThousands: true });
    assert(res1.text === "1,234,567.89", `Kết quả phải là 1,234,567.89, nhận được: ${res1.text}`);

    const res2 = NumberFormatter.formatNumber(1234567.891, { decimals: 0, useThousands: true });
    assert(res2.text === "1,234,568", `Làm tròn 0 số thập phân phải là 1,234,568, nhận được: ${res2.text}`);

    const res3 = NumberFormatter.formatNumber(1234.5, { decimals: 2, useThousands: false });
    assert(res3.text === "1234.50", `Không dấu phân cách phải là 1234.50, nhận được: ${res3.text}`);
  });

  test("Category Number: 4 kiểu hiển thị số âm chuẩn Excel (đen -, đỏ không -, đen ngoặc, đỏ ngoặc)", () => {
    const val = -1234.1;
    const s0 = NumberFormatter.formatNumber(val, { decimals: 2, useThousands: true, negativeStyle: 0 });
    assert(s0.text === "-1,234.10" && !s0.isRed, "Kiểu 0: -1,234.10 đen");

    const s1 = NumberFormatter.formatNumber(val, { decimals: 2, useThousands: true, negativeStyle: 1 });
    assert(s1.text === "1,234.10" && s1.isRed, "Kiểu 1: 1,234.10 đỏ");

    const s2 = NumberFormatter.formatNumber(val, { decimals: 2, useThousands: true, negativeStyle: 2 });
    assert(s2.text === "(1,234.10)" && !s2.isRed, "Kiểu 2: (1,234.10) đen");

    const s3 = NumberFormatter.formatNumber(val, { decimals: 2, useThousands: true, negativeStyle: 3 });
    assert(s3.text === "(1,234.10)" && s3.isRed, "Kiểu 3: (1,234.10) đỏ");
  });

  test("Decimal buttons: General uses currently displayed decimal places as its starting point", () => {
    const grid = new SheetGridController(mockContainer());
    const cases = [
      ["A", 1, 1234.5, 1, 2],
      ["A", 2, 0.075, 1, 4],
      ["A", 3, -56.789, 1, 4],
      ["A", 4, 42, 1, 1]
    ];
    for (const [col, row, value, direction, expectedDecimals] of cases) {
      grid.setCellValue(col, row, value);
      grid.selectedCoord = { c: col, r: row };
      grid.selectionRange = { start: { c: col, r: row }, end: { c: col, r: row } };
      assert(grid.adjustDecimalPlaces(direction), `Increase Decimal should apply to ${value}`);
      const config = grid.cellsData.get(`${col}${row}`).style.numberFormat;
      assert(config.category === "number" && config.decimals === expectedDecimals && !config.useThousands,
        `General ${value} should become Number with ${expectedDecimals} displayed decimals`);
    }

    grid.setCellValue("B", 1, 1234.5);
    grid.selectedCoord = { c: "B", r: 1 };
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } };
    assert(grid.adjustDecimalPlaces(-1), "Decrease Decimal should apply to General 1234.5");
    assert(grid.cellsData.get("B1").style.numberFormat.decimals === 0,
      "General 1234.5 has one displayed decimal, so Decrease Decimal should round to zero decimals");

    grid.setCellValue("C", 1, 0.075);
    grid.selectedCoord = { c: "C", r: 1 };
    grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 1 } };
    grid.applyNumberFormat({ category: "percentage", decimals: 2 });
    assert(grid.adjustDecimalPlaces(1), "Increase Decimal should also work for Percentage");
    assert(grid.cellsData.get("C1").style.numberFormat.decimals === 3,
      "Existing Percentage format should increase its decimal count by one");
  });

  // 3. Unit Test Category Currency
  test("Category Currency: Định dạng tiền tệ VNĐ và USD với vị trí ký hiệu chuẩn", () => {
    const vnd = NumberFormatter.formatCurrency(5000000, { currencySymbol: "₫", decimals: 0, useThousands: true });
    assert(vnd.text === "5,000,000 ₫", `VNĐ phải có ký hiệu ₫ ở sau: ${vnd.text}`);

    const usd = NumberFormatter.formatCurrency(1250.75, { currencySymbol: "$", decimals: 2, useThousands: true });
    assert(usd.text === "$1,250.75", `USD phải có ký hiệu $ ở trước: ${usd.text}`);
  });

  // 4. Unit Test Category Accounting vs Currency (Điểm cốt lõi cho kế toán)
  test("Category Accounting: Khác biệt rõ rệt với Currency (ký hiệu canh trái, số 0 là '-', số âm ngoặc đơn)", () => {
    // 1. Số 0 trong Accounting -> dấu gạch ngang "-"
    const accZero = NumberFormatter.formatAccounting(0, { currencySymbol: "₫", decimals: 2 });
    assert(accZero.isAccounting === true, "Phải đánh dấu isAccounting");
    assert(accZero.numberText === "-", `Số 0 trong kế toán phải là '-', nhận được: ${accZero.numberText}`);
    assert(accZero.symbol === "₫", "Ký hiệu tiền tệ phải là ₫");

    // Khác với Currency: Currency hiển thị số 0 bình thường
    const currZero = NumberFormatter.formatCurrency(0, { currencySymbol: "₫", decimals: 2 });
    assert(currZero.text === "0.00 ₫", `Currency hiển thị 0.00 ₫: ${currZero.text}`);

    // 2. Số âm trong Accounting -> nằm trong ngoặc đơn, KHÔNG có dấu trừ
    const accNeg = NumberFormatter.formatAccounting(-500000, { currencySymbol: "₫", decimals: 0 });
    assert(accNeg.numberText === "(500,000)", `Số âm accounting phải trong ngoặc đơn không dấu trừ: ${accNeg.numberText}`);

    // 3. Số dương trong Accounting
    const accPos = NumberFormatter.formatAccounting(1500000, { currencySymbol: "₫", decimals: 0 });
    assert(accPos.numberText.trim() === "1,500,000", `Số dương accounting: ${accPos.numberText}`);
  });

  // 5. Unit Test Category Percentage (Hành vi 2 chiều)
  test("Category Percentage: Hiển thị đúng (val * 100 + %) và lưu giá trị gốc không đổi", () => {
    const p1 = NumberFormatter.formatPercentage(0.5, { decimals: 0 });
    assert(p1.text === "50%", `0.5 hiển thị là 50%: ${p1.text}`);

    const p2 = NumberFormatter.formatPercentage(0.125, { decimals: 2 });
    assert(p2.text === "12.50%", `0.125 hiển thị là 12.50%: ${p2.text}`);
  });

  test("Category Percentage: Hành vi 2 chiều khi nhập liệu (gõ 50 vào ô % tự chia 100 thành 0.5)", () => {
    const config = { category: "percentage", decimals: 2 };
    
    // Gõ số thuần "50" -> tự chia 100
    const normalized1 = NumberFormatter.normalizeInputForFormat("50", config);
    assert(normalized1 === 0.5, `Gõ "50" vào ô % phải lưu 0.5 (nhận được: ${normalized1})`);

    // Gõ số thuần 25.5 -> tự chia 100
    const normalized2 = NumberFormatter.normalizeInputForFormat(25.5, config);
    assert(normalized2 === 0.255, `Gõ 25.5 vào ô % phải lưu 0.255 (nhận được: ${normalized2})`);

    // Gõ đã có % "75%" -> parse thành 0.75
    const normalized3 = NumberFormatter.normalizeInputForFormat("75%", config);
    assert(normalized3 === 0.75, `Gõ "75%" vào ô % phải lưu 0.75 (nhận được: ${normalized3})`);
  });

  test("S26a: nhập ngày Việt Nam và giờ tạo serial Excel, không lệch múi giờ", () => {
    assert(NumberFormatter.normalizeInputForFormat("15/03/2026", { category: "date", dateFormat: "dd/mm/yyyy" }) === 46096);
    assert(NumberFormatter.normalizeInputForFormat("08:30", { category: "time", timeFormat: "hh:mm" }) === 8.5 / 24);
  });

  test("C1b: gõ tiền tệ (₫250000, 250.000 ₫) vào ô lưu số thật kèm định dạng currency", () => {
    const grid = Object.create(SheetGridController.prototype);
    for (const [text, expected] of [["₫250000", 250000], ["250.000 ₫", 250000], ["250000 VND", 250000], ["25.000.000 ₫", 25000000], ["VNĐ 1.500.000", 1500000]]) {
      const out = grid._normalizeCellInput(text, {}, false);
      assert(out.value === expected, `"${text}" phải thành số ${expected}, nhận ${JSON.stringify(out.value)}`);
      assert(out.style.numberFormat?.category === "currency", `"${text}" phải có định dạng currency`);
      const committed = grid._normalizeCellInput(text, out.style, false);
      assert(committed.value === expected, `"${text}" phải giữ số ${expected} ở pha commit sau preview, nhận ${JSON.stringify(committed.value)}`);
    }
    assert(grid._normalizeCellInput("abc", {}, false).value === "abc", "Chữ thường giữ nguyên");
    assert(grid._normalizeCellInput("₫250000", {}, true).value === "₫250000", "Có dấu ' đầu thì giữ văn bản");
  });

  test("C1: tự nhận dạng kiểu nhập theo vùng Windows và giữ văn bản có chủ ý", () => {
    const us = { decimalSeparator: ".", thousandsSeparator: "," };
    const vi = { decimalSeparator: ",", thousandsSeparator: "." };
    const number = NumberFormatter.inferUserInput("1234.56", null, us);
    const usThousands = NumberFormatter.inferUserInput("1,234.56", null, us);
    assert(usThousands.value === 1234.56, "US grouping phải theo dấu phẩy nghìn và chấm thập phân");
    assert(usThousands.numberFormat?.category === "number" && usThousands.numberFormat?.useThousands && usThousands.numberFormat?.decimals === 2, "Gõ 1,234.56 phải tự động áp dụng định dạng #,##0.00 như Excel");
    assert(NumberFormatter.formatValue(usThousands.value, usThousands.numberFormat).text === "1,234.56", "Hiển thị phải là 1,234.56");
    assert(NumberFormatter.inferUserInput("1.234,56", null, vi).value === 1234.56, "VN grouping phải theo dấu chấm nghìn và phẩy thập phân");
    assert(NumberFormatter.inferUserInput("31/12/2026", null, vi).value === 46387, "Ngày phải thành serial Excel 46387");
    const time = NumberFormatter.inferUserInput("13:45", null, vi);
    assert(Math.abs(time.value - 0.5729166667) < 1e-10, `Giờ phải thành phần ngày Excel: ${time.value}`);
    assert(time.numberFormat.category === "time" && NumberFormatter.formatValue(time.value, time.numberFormat).text === "13:45", "Giờ phải có định dạng hh:mm");
    const percent = NumberFormatter.inferUserInput("25%", null, vi);
    assert(percent.value === 0.25 && percent.numberFormat.category === "percentage" && percent.numberFormat.decimals === 0, "25% phải lưu 0.25 và định dạng 0%");
    for (const currencyText of ["₫250000", "250000 ₫", "250.000 đ", "250.000 ₫", "250000 đ", "đ250000"]) {
      for (const loc of [vi, us, {}]) {
        const currency = NumberFormatter.inferUserInput(currencyText, null, loc);
        assert(currency.value === 250000, `${currencyText} (${JSON.stringify(loc)}) phải thành 250000`);
        assert(currency.numberFormat.category === "currency" && currency.numberFormat.currencySymbol === "₫", `${currencyText} phải có định dạng tiền VND`);
      }
    }
    assert(NumberFormatter.inferUserInput("-1234.56", null, us).value === -1234.56, "Số âm phải là number: -1234.56");
    assert(NumberFormatter.inferUserInput("1234", null, us).value === 1234, "Số nguyên phải là number: 1234");
    assert(NumberFormatter.inferUserInput("0.5", null, us).value === 0.5, "Số thập phân 0.5 phải là number: 0.5");
    assert(NumberFormatter.formatValue(1234.56).align === "right", "formatValue General cho số phải trả align right");
    assert(NumberFormatter.inferUserInput("0123", null, us).value === 123, "Số 0 đầu vào General phải thành số 123");
    assert(NumberFormatter.inferUserInput("0123", { category: "text" }, us).value === "0123", "Định dạng Text phải giữ số 0 đầu");
    const forcedText = NumberFormatter.inferUserInput("'1234.56", null, us);
    assert(forcedText.value === "1234.56" && forcedText.forceText, "Dấu nháy đơn phải ép kiểu văn bản");
    assert(typeof NumberFormatter.inferUserInput("Tên mặt hàng", null, us).value === "string", "Chữ thường phải giữ kiểu văn bản");
  });

  // 6. Unit Test Category Date
  test("Category Date: Định dạng chuẩn Việt Nam dd/mm/yyyy và mẫu văn bản hành chính", () => {
    const testDate = new Date(2024, 2, 14, 13, 30); // 14/03/2024 13:30

    const d1 = NumberFormatter.formatDate(testDate, { dateFormat: "dd/mm/yyyy" });
    assert(d1.text === "14/03/2024", `Mẫu dd/mm/yyyy: ${d1.text}`);

    const d2 = NumberFormatter.formatDate(testDate, { dateFormat: "dd-mm-yyyy" });
    assert(d2.text === "14-03-2024", `Mẫu dd-mm-yyyy: ${d2.text}`);

    const d3 = NumberFormatter.formatDate(testDate, { dateFormat: 'ngày dd tháng mm năm yyyy' });
    assert(d3.text === "ngày 14 tháng 03 năm 2024", `Mẫu hành chính: ${d3.text}`);

    const d4 = NumberFormatter.formatDate(testDate, { dateFormat: "yyyy-mm-dd" });
    assert(d4.text === "2024-03-14", `Mẫu ISO: ${d4.text}`);
  });

  // 7. Unit Test Category Text
  test("Category Text: Ép hiển thị dạng văn bản và FormulaEngine SUM bỏ qua ô Text", () => {
    const tFmt = NumberFormatter.formatValue(12345, { category: "text" });
    assert(tFmt.text === "12345", "Text hiển thị nguyên chuỗi");
    assert(tFmt.align === "left", "Text phải căn lề trái");

    // Test trong FormulaEngine:
    const mockCells = new Map([
      ["A1", { val: 10, formula: "", style: {} }],
      ["A2", { val: 20, formula: "", style: {} }],
      ["A3", { val: "100", formula: "", style: { numberFormat: { category: "text" } } }] // Ô dạng Text
    ]);

    const engine = new FormulaEngine(mockCells);
    const sumResult = engine.evaluate("=SUM(A1:A3)");
    assert(sumResult === 30, `SUM phải bỏ qua ô Text A3 (kết quả phải là 30, nhận được: ${sumResult})`);
  });

  // 8. Unit Test Category Custom Pattern
  test("Category Custom: Hỗ trợ mã định dạng cơ bản #,##0.00 'đ' và phân tách dương;âm;không", () => {
    const c1 = NumberFormatter.formatCustom(1250000, { customPattern: '#,##0.00 "đ"' });
    assert(c1.text === "1,250,000.00 đ", `Custom pattern #,##0.00 "đ": ${c1.text}`);

    const c2 = NumberFormatter.formatCustom(0, { customPattern: '#,##0;(#,##0);"-"' });
    assert(c2.text === "-", `Custom pattern cho số 0: ${c2.text}`);

    const c3 = NumberFormatter.formatCustom(-5000, { customPattern: '#,##0;(#,##0);"-"' });
    assert(c3.text === "(5,000)", `Custom pattern cho số âm: ${c3.text}`);
  });

  // 9. Integration Test: SheetGridController applyNumberFormat trên vùng chọn nhiều ô & Undo/Redo
  test("SheetGridController: Áp dụng định dạng cho vùng chọn nhiều ô (A1:B3) đồng loạt", () => {
    const container = mockContainer();
    const grid = new SheetGridController(container);
    
    // Gán dữ liệu cho vùng A1:B3
    grid.setCellValue("A", 1, 1000);
    grid.setCellValue("A", 2, 2000);
    grid.setCellValue("A", 3, 3000);
    grid.setCellValue("B", 1, 4000);
    grid.setCellValue("B", 2, 5000);
    grid.setCellValue("B", 3, 6000);

    // Bôi đen vùng chọn A1:B3
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } };

    // Áp dụng định dạng tiền tệ VNĐ cho cả vùng
    grid.applyNumberFormat({
      category: "currency",
      currencySymbol: "₫",
      decimals: 0,
      useThousands: true
    });

    // Kiểm tra tất cả 6 ô đều có style.numberFormat
    const coords = ["A1", "A2", "A3", "B1", "B2", "B3"];
    coords.forEach(coord => {
      const item = grid.cellsData.get(coord);
      assert(item?.style?.numberFormat?.category === "currency", `Ô ${coord} phải có numberFormat currency`);
      assert(item?.style?.numberFormat?.currencySymbol === "₫", `Ô ${coord} phải có symbol ₫`);
    });
  });

  test("SheetGridController: Undo/Redo khôi phục toàn bộ vùng định dạng chỉ bằng 1 bước", () => {
    const container = mockContainer();
    const grid = new SheetGridController(container);

    grid.setCellValue("A", 1, 100);
    grid.setCellValue("A", 2, 200);
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } };

    // Áp dụng Percentage
    grid.applyNumberFormat({ category: "percentage", decimals: 1 });
    assert(grid.cellsData.get("A1")?.style?.numberFormat?.category === "percentage", "A1 phải là percentage");
    assert(grid.cellsData.get("A2")?.style?.numberFormat?.category === "percentage", "A2 phải là percentage");

    // 1 Bước Undo
    grid.undo();
    assert(!grid.cellsData.get("A1")?.style?.numberFormat, "Sau undo A1 không còn numberFormat");
    assert(!grid.cellsData.get("A2")?.style?.numberFormat, "Sau undo A2 không còn numberFormat");

    // 1 Bước Redo
    grid.redo();
    assert(grid.cellsData.get("A1")?.style?.numberFormat?.category === "percentage", "Sau redo A1 khôi phục percentage");
    assert(grid.cellsData.get("A2")?.style?.numberFormat?.category === "percentage", "Sau redo A2 khôi phục percentage");
  });

  // 10. FODS standard number styles. The custom vno attribute remains only as a
  // same-session fallback; persistence uses ODF data styles and table-cell styles.
  test("SheetAdapter: round-trip định dạng số qua style số ODF chuẩn", () => {
    const container = mockContainer();
    const grid = new SheetGridController(container);
    const adapter = new SheetAdapter(grid);

    // Gán ô A1 có định dạng Kế toán
    grid.setCellValue("A", 1, 500000);
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    grid.applyNumberFormat({
      category: "accounting",
      currencySymbol: "₫",
      decimals: 2
    });

    // Serialize ra FODS XML
    const fodsXml = adapter.serializeToFods();
    assert(fodsXml.includes("<number:currency-style"), "FODS phải có number:currency-style chuẩn");
    assert(fodsXml.includes('style:data-style-name="n1"'), "Cell style phải trỏ tới data style");
    assert(fodsXml.includes('table:style-name="ce1"'), "Ô phải trỏ tới cell style hai lớp");
    assert(fodsXml.includes("vno:number-format"), "FODS XML phải chứa thuộc tính vno:number-format");
    assert(fodsXml.includes("accounting"), "FODS XML phải lưu category accounting");

    // Parse FODS trở lại
    const parsedWorkbook = adapter.parseFods(fodsXml);
    const sheetData = parsedWorkbook.sheetsData[parsedWorkbook.activeSheet];
    const restoredA1 = sheetData?.get("A1");
    assert(restoredA1, "Phải khôi phục được ô A1 từ FODS");
    assert(restoredA1.style?.numberFormat?.category === "accounting", "Khôi phục đúng category accounting");
    assert(restoredA1.style?.numberFormat?.currencySymbol === "₫", "Khôi phục đúng ký hiệu tiền tệ ₫");
  });

  // 11. Unit Test: Format Cells Dialog Alignment Parity & Launcher Command
  test("Sheet Alignment Dialog: Khai báo lệnh sheet.format.alignmentDialog và ánh xạ UNO", () => {
    const cmd = SHEET_COMMANDS.find(c => c.id === "sheet.format.alignmentDialog");
    assert(cmd, "Lệnh sheet.format.alignmentDialog phải được khai báo trong SHEET_COMMANDS");
    assert(cmd.category === "format", "Category của lệnh phải là format");
    assert(!cmd.shortcut, "Không gán shortcut xung đột với Ctrl+1");
    assert(VN_TO_UNO_MAP["sheet.format.alignmentDialog"] === ".uno:FormatCellDialog",
      "Lệnh sheet.format.alignmentDialog phải ánh xạ sang .uno:FormatCellDialog");
  });

  test("Sheet Alignment Dialog: Ribbon nhóm Căn chỉnh có launcherCommandId trỏ tới sheet.format.alignmentDialog", () => {
    const homeTab = SHEET_RIBBON_TABS.find(t => t.id === "home");
    const alignGroup = homeTab.groups.find(g => g.labelKey === "sheetRibbon.group.alignment");
    assert(alignGroup, "Phải có nhóm Căn chỉnh (alignment)");
    assert(alignGroup.launcherCommandId === "sheet.format.alignmentDialog",
      "Nhóm alignment phải có launcherCommandId = sheet.format.alignmentDialog");
    assert(alignGroup.launcherTooltip, "Nhóm alignment phải có launcherTooltip");
  });

  test("Sheet Alignment Dialog: i18n VI và EN đầy đủ cho các trường Căn chỉnh ô", () => {
    assert(viStrings.commands["sheet.format.alignmentDialog"], "Bản dịch VI cho sheet.format.alignmentDialog phải tồn tại");
    assert(enStrings.commands["sheet.format.alignmentDialog"], "Bản dịch EN cho sheet.format.alignmentDialog phải tồn tại");
    assert(viStrings.sheetFormatCells?.tabAlignment, "Bản dịch VI tab alignment phải tồn tại");
    assert(viStrings.sheetFormatCells?.textAlignment, "Bản dịch VI textAlignment phải tồn tại");
    assert(viStrings.sheetFormatCells?.horizontal, "Bản dịch VI horizontal phải tồn tại");
    assert(viStrings.sheetFormatCells?.vertical, "Bản dịch VI vertical phải tồn tại");
    assert(viStrings.sheetFormatCells?.indent, "Bản dịch VI indent phải tồn tại");
    assert(viStrings.sheetFormatCells?.textControl, "Bản dịch VI textControl phải tồn tại");
    assert(viStrings.sheetFormatCells?.orientation, "Bản dịch VI orientation phải tồn tại");
  });

  // 12. Giờ gõ tay: nhận diện, lưu serial và hiển thị lại (time input detection)
  test("Sheet Time Input: isTimeInput nhận diện H:MM, HH:MM, HH:MM:SS hợp lệ", () => {
    const valid = ["13:45", "9:05", "0:00", "23:59", "13:45:30", "00:00:00", "8:00", " 13:45 "];
    valid.forEach(v => {
      assert(NumberFormatter.isTimeInput(v) === true, `${JSON.stringify(v)} phải là giờ hợp lệ`);
    });
  });

  test("Sheet Time Input: isTimeInput từ chối giờ sai và chuỗi không phải giờ", () => {
    const invalid = ["25:00", "13:60", "13:45:60", "24:00", "1:2", "13:45:5", "1234", "13.45", "abc", "", "13:45:30:00"];
    invalid.forEach(v => {
      assert(NumberFormatter.isTimeInput(v) === false, `${JSON.stringify(v)} không phải giờ hợp lệ`);
    });
    assert(NumberFormatter.isTimeInput(5) === false, "Số thuần không phải chuỗi giờ");
    assert(NumberFormatter.isTimeInput(null) === false, "null không phải giờ");
    assert(NumberFormatter.isTimeInput(undefined) === false, "undefined không phải giờ");
  });

  test("Sheet Time Input: setCellValue lưu serial ngày + numberFormat time và hiển thị lại đúng", () => {
    const grid = new SheetGridController(mockContainer());

    grid.setCellValue("A", 1, "13:45");
    const cell = grid.cellsData.get("A1");
    assert(typeof cell.val === "number", `13:45 phải lưu thành số, nhận ${typeof cell.val}`);
    assert(Math.abs(cell.val - 49500 / 86400) < 1e-12, `13:45 phải là 49500/86400, nhận ${cell.val}`);
    assert(cell.style.numberFormat?.category === "time", `category phải là time, nhận ${cell.style.numberFormat?.category}`);
    assert(cell.style.numberFormat?.timeFormat === "HH:mm", `timeFormat phải là HH:mm, nhận ${cell.style.numberFormat?.timeFormat}`);
    const shown = NumberFormatter.formatValue(cell.val, cell.style.numberFormat);
    assert(shown.text === "13:45", `Hiển thị lại phải là 13:45, nhận ${shown.text}`);
    assert(shown.align === "right", "Giờ phải căn phải");

    grid.setCellValue("A", 2, "13:45:30");
    const cell2 = grid.cellsData.get("A2");
    assert(Math.abs(cell2.val - 49530 / 86400) < 1e-12, `13:45:30 phải là 49530/86400, nhận ${cell2.val}`);
    assert(cell2.style.numberFormat?.timeFormat === "HH:mm:ss", `Có giây thì timeFormat là HH:mm:ss, nhận ${cell2.style.numberFormat?.timeFormat}`);
    assert(NumberFormatter.formatValue(cell2.val, cell2.style.numberFormat).text === "13:45:30", "Hiển thị lại phải là 13:45:30");

    grid.setCellValue("A", 3, "9:05");
    const cell3 = grid.cellsData.get("A3");
    assert(cell3.style.numberFormat?.timeFormat === "HH:mm", "9:05 cũng nhận định dạng HH:mm");
    assert(NumberFormatter.formatValue(cell3.val, cell3.style.numberFormat).text === "09:05", "9:05 hiển thị lại 09:05");

    // Giờ vẫn là số: SUM tính được và ô tham chiếu trả về số.
    const engine = new FormulaEngine(new Map([["A1", cell]]));
    assert(engine.evaluate("=SUM(A1)") === cell.val, "SUM của ô giờ phải là chính số ngày đó");
  });

  test("Sheet Time Input: giờ sai, số, ngày, phần trăm và văn bản không bị đổi hành vi", () => {
    const grid = new SheetGridController(mockContainer());

    grid.setCellValue("A", 1, "25:00");
    const bad1 = grid.cellsData.get("A1");
    assert(bad1.val === "25:00", `25:00 phải giữ nguyên dạng văn bản, nhận ${JSON.stringify(bad1.val)}`);
    assert(!bad1.style.numberFormat, "25:00 không được gắn numberFormat");

    grid.setCellValue("A", 2, "13:60");
    const bad2 = grid.cellsData.get("A2");
    assert(bad2.val === "13:60" && !bad2.style.numberFormat, "13:60 phải giữ nguyên dạng văn bản");

    grid.setCellValue("A", 3, "1:2");
    const bad3 = grid.cellsData.get("A3");
    assert(bad3.val === "1:2" && !bad3.style.numberFormat, "1:2 (sai định dạng) phải giữ nguyên dạng văn bản");

    grid.setCellValue("A", 4, "'13:45");
    const forced = grid.cellsData.get("A4");
    assert(forced.val === "13:45", `Dấu nháy đơn phải giữ nguyên chuỗi, nhận ${JSON.stringify(forced.val)}`);
    assert(typeof forced.val === "string", "Dấu nháy đơn phải giữ kiểu chuỗi");
    assert(!forced.style.numberFormat, "Dấu nháy đơn không được gắn định dạng giờ");

    grid.setCellValue("A", 5, 1234.5);
    const num = grid.cellsData.get("A5");
    assert(num.val === 1234.5 && !num.style.numberFormat, "Số thường giữ nguyên, không gắn định dạng giờ");

    grid.setCellValue("A", 6, "31/10/2026");
    const date = grid.cellsData.get("A6");
    assert(date.style.numberFormat?.category === "date", "Ngày vẫn nhận định dạng ngày như trước");
    assert(typeof date.val === "number", "Ngày vẫn lưu thành serial số");

    grid.setCellValue("A", 7, "25%");
    const pct = grid.cellsData.get("A7");
    assert(pct.style.numberFormat?.category === "percentage" && pct.val === 0.25, "Phần trăm vẫn nhận định dạng phần trăm");

    grid.setCellValue("A", 8, "abc");
    assert(grid.cellsData.get("A8").val === "abc", "Văn bản thường giữ nguyên");
  });

  test("Sheet Time Input: tăng/giảm số thập phân không phá định dạng giờ", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "13:45");
    grid.selectedCoord = { c: "A", r: 1 };
    assert(grid.adjustDecimalPlaces(1) === false, "adjustDecimalPlaces phải bỏ qua ô định dạng giờ");
    assert(grid.adjustDecimalPlaces(-1) === false, "adjustDecimalPlaces phải bỏ qua ô định dạng giờ");
    const nf = grid.cellsData.get("A1").style.numberFormat;
    assert(nf.category === "time" && nf.timeFormat === "HH:mm", "Định dạng giờ phải giữ nguyên sau khi bấm tăng/giảm số thập phân");
    assert(NumberFormatter.formatValue(grid.cellsData.get("A1").val, nf).text === "13:45", "Ô vẫn hiển thị 13:45");
  });

  test("Sheet Time Input: Ctrl+Shift+; vẫn chèn chuỗi HH:mm:ss, Undo/Redo giữ nguyên", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectedCoord = { c: "B", r: 3 };
    const inserted = grid.insertCurrentTime();
    const data = grid.cellsData.get("B3");
    assert(/^\d{2}:\d{2}:\d{2}$/.test(data.val), `Ô phải nhận chuỗi HH:mm:ss, nhận ${JSON.stringify(data.val)}`);
    assert(data.val === inserted, "Giá trị trong ô phải khớp giá trị trả về của lệnh");
    assert(!data.style.numberFormat, "Lệnh chèn giờ hiện tại không tự gắn định dạng giờ");

    grid.undo();
    const afterUndo = grid.cellsData.get("B3");
    assert(!afterUndo || afterUndo.val === "", "Undo phải xóa giá trị vừa chèn");

    grid.redo();
    const afterRedo = grid.cellsData.get("B3");
    assert(afterRedo && afterRedo.val === inserted, `Redo phải khôi phục đúng chuỗi ${inserted}, nhận ${JSON.stringify(afterRedo?.val)}`);
  });

  test("Sheet Time Input: lưu FODS giữ định dạng giờ và mở lại đúng serial", () => {
    const grid = new SheetGridController(mockContainer());
    const adapter = new SheetAdapter(grid);
    grid.setCellValue("A", 1, "13:45");

    const fodsXml = adapter.serializeToFods();
    assert(fodsXml.includes("<number:time-style"), "FODS phải có number:time-style cho ô giờ");
    assert(fodsXml.includes('office:value-type="time"'), "Ô giờ phải lưu office:value-type=\"time\"");
    assert(fodsXml.includes('office:time-value="PT13H45M00S"'), "Ô giờ 13:45 phải lưu office:time-value PT13H45M00S");
    assert(fodsXml.includes("timeFormat"), "FODS phải lưu numberFormat category/timeFormat qua vno:number-format");

    const parsedWorkbook = adapter.parseFods(fodsXml);
    const sheetData = parsedWorkbook.sheetsData[parsedWorkbook.activeSheet];
    const restoredA1 = sheetData?.get("A1");
    assert(restoredA1, "Phải khôi phục được ô A1 từ FODS");
    assert(Math.abs(restoredA1.val - 49500 / 86400) < 1e-12, `Giá trị giờ phải giữ nguyên sau khi mở lại, nhận ${restoredA1.val}`);
    assert(restoredA1.style?.numberFormat?.category === "time", "Mở lại phải có category time");
    assert(restoredA1.style?.numberFormat?.timeFormat === "HH:mm", "Mở lại phải có timeFormat HH:mm");
    assert(NumberFormatter.formatValue(restoredA1.val, restoredA1.style.numberFormat).text === "13:45", "Ô đã mở lại vẫn hiển thị 13:45");
  });

  return results;
}
