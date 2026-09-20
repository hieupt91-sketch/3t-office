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

  return results;
}
