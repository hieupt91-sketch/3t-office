/** Behavioral tests — Home > Cells Format dropdown for VN Sheet. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function flatten(items) {
  return (items || []).flatMap(item => item.items ? flatten(item.items) : [item]);
}

export async function runSheetFormatDropdownTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Ribbon: nhóm Ô có dropdown Định dạng với lệnh hàng/cột và quản lý trang tính", () => {
    const home = SHEET_RIBBON_TABS.find(tab => tab.id === "home");
    const cells = home.groups.find(group => group.id === "cells");
    const dropdown = flatten(cells.items).find(item => item.id === "sheet.cells.format")
      || cells.items.find(item => item.id === "sheet.cells.format");
    assert(dropdown && dropdown.type === "dropdown", "Thiếu dropdown Định dạng trong nhóm Ô");
    const ids = dropdown.items.map(item => item.commandId);
    const expected = [
      "sheet.row.height", "sheet.row.autoFit", "sheet.col.width", "sheet.col.autoFit",
      "sheet.row.hide", "sheet.row.unhide", "sheet.col.hide", "sheet.col.unhide",
      "sheet.sheet.rename", "sheet.sheet.moveOrCopy", "sheet.sheet.protect"
    ];
    assert(JSON.stringify(ids) === JSON.stringify(expected), `Mục dropdown sai: ${ids.join(", ")}`);
    expected.forEach(id => {
      assert(SHEET_COMMANDS.some(command => command.id === id), `Thiếu command ${id}`);
    });
    assert(ICONS.sheetFormat.includes("<svg"), "Thiếu icon vector sheetFormat");
    assert(ICONS.rowHeight.includes("<svg") && ICONS.hideRow.includes("<svg"), "Thiếu icon hàng/cột");
  });

  await test("Đặt chiều cao 1 hàng và độ rộng 1 cột, giá trị áp dụng đúng", () => {
    const grid = new SheetGridController(container());
    grid.selectCell("B", 3);
    assert(grid.setRowHeights(48, [3]) === 48, "setRowHeights phải trả chiều cao đã kẹp");
    assert(grid.getRowHeight(3) === 48, `Hàng 3 phải cao 48px, thực tế ${grid.getRowHeight(3)}`);
    assert(grid.getRowHeight(1) === 26, "Hàng khác phải giữ mặc định 26px");
    assert(grid.setColumnWidths(160, ["B"]) === 160, "setColumnWidths phải trả độ rộng đã kẹp");
    assert(grid.getColumnWidth("B") === 160, `Cột B phải rộng 160px, thực tế ${grid.getColumnWidth("B")}`);
    assert(grid.getColumnWidth("A") === 100, "Cột A phải giữ mặc định 100px");
  });

  await test("Ẩn 1 hàng và 1 cột, rồi hiện lại đúng", () => {
    const grid = new SheetGridController(container());
    grid.selectCell("C", 5);
    assert(grid.hideRows([5]) === true, "hideRows phải thành công");
    assert(grid.isRowUserHidden(5), "Hàng 5 phải bị ẩn");
    assert(!grid.isRowUserHidden(4), "Hàng 4 không bị ẩn");
    assert(grid.hideColumns(["C"]) === true, "hideColumns phải thành công");
    assert(grid.isColUserHidden("C"), "Cột C phải bị ẩn");
    assert(grid.unhideRows([5]) === true, "unhideRows phải hiện hàng 5");
    assert(!grid.isRowUserHidden(5), "Hàng 5 phải hiện lại");
    assert(grid.unhideColumns(["C"]) === true, "unhideColumns phải hiện cột C");
    assert(!grid.isColUserHidden("C"), "Cột C phải hiện lại");
  });

  await test("AutoFit hàng/cột tính toán hợp lý theo nội dung", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "Chuỗi ký tự rất rất dài để test auto fit độ rộng cột", false);
    grid.setCellValue("B", 2, "Dòng 1\nDòng 2\nDòng 3", false);
    const width = grid.autoFitColumn("A");
    assert(width > 120, `AutoFit cột A phải > 120px, thực tế ${width}`);
    assert(grid.getColumnWidth("A") === width, "Độ rộng AutoFit phải được lưu trong model");
    const height = grid.autoFitRow(2);
    assert(height >= 70, `AutoFit hàng 2 (3 dòng) phải >= 70px, thực tế ${height}`);
    assert(grid.getRowHeight(2) === height, "Chiều cao AutoFit phải được lưu trong model");
  });

  await test("Undo/Redo dùng stack hiện có cho chiều cao, độ rộng và ẩn/hiện", () => {
    const grid = new SheetGridController(container());
    grid.selectCell("A", 2);
    grid.setRowHeights(40, [2]);
    grid.setColumnWidths(180, ["A"]);
    grid.hideRows([4]);
    grid.hideColumns(["B"]);
    assert(grid.getRowHeight(2) === 40 && grid.getColumnWidth("A") === 180, "Trước undo phải giữ giá trị mới");
    assert(grid.isRowUserHidden(4) && grid.isColUserHidden("B"), "Trước undo phải ẩn hàng 4 và cột B");

    grid.undo();
    assert(!grid.isColUserHidden("B"), "Undo 1: hiện lại cột B");
    grid.undo();
    assert(!grid.isRowUserHidden(4), "Undo 2: hiện lại hàng 4");
    grid.undo();
    assert(grid.getColumnWidth("A") === 100, "Undo 3: cột A về mặc định");
    grid.undo();
    assert(grid.getRowHeight(2) === 26, "Undo 4: hàng 2 về mặc định");

    grid.redo();
    assert(grid.getRowHeight(2) === 40, "Redo chiều cao hàng 2");
    grid.redo();
    assert(grid.getColumnWidth("A") === 180, "Redo độ rộng cột A");
    grid.redo();
    assert(grid.isRowUserHidden(4), "Redo ẩn hàng 4");
    grid.redo();
    assert(grid.isColUserHidden("B"), "Redo ẩn cột B");
  });

  await test("Ẩn hàng người dùng không đụng hiddenRows của bộ lọc", () => {
    const grid = new SheetGridController(container());
    grid.hiddenRows.add(8);
    grid.hideRows([2]);
    assert(grid.isRowUserHidden(2) && grid.hiddenRows.has(8), "Filter và ẩn tay phải độc lập");
    grid.unhideRows([2]);
    assert(!grid.isRowUserHidden(2) && grid.hiddenRows.has(8), "Hiện hàng tay không xóa hàng bị filter ẩn");
  });

  await test("Insert/Delete hàng-cột dịch chiều cao, độ rộng và trạng thái ẩn", () => {
    const grid = new SheetGridController(container());
    grid.setRowHeights(50, [3]);
    grid.hideRows([4]);
    grid.setColumnWidths(140, ["B"]);
    grid.hideColumns(["C"]);
    grid.insertRow(3);
    assert(grid.getRowHeight(4) === 50, "Chèn hàng phải dời chiều cao 3 → 4");
    assert(grid.isRowUserHidden(5) && !grid.isRowUserHidden(4), "Chèn hàng phải dời hàng ẩn 4 → 5");
    grid.insertColumn("B");
    assert(grid.getColumnWidth("C") === 140, "Chèn cột phải dời độ rộng B → C");
    assert(grid.isColUserHidden("D") && !grid.isColUserHidden("C"), "Chèn cột phải dời cột ẩn C → D");
  });

  await test("FODS nội bộ: serialize/parse giữ row-height, column-width và visibility=collapse", () => {
    const grid = new SheetGridController(container());
    grid.resetToBlank("Kích thước");
    grid.setCellValue("A", 1, "Tiêu đề", false);
    grid.setRowHeights(48, [2]);
    grid.setColumnWidths(160, ["B"]);
    grid.hideRows([3]);
    grid.hideColumns(["C"]);
    const xml = new SheetAdapter(grid).serializeToFods();
    assert(xml.includes('style:family="table-row"'), "Phải ghi style:family=table-row");
    assert(xml.includes("style:row-height="), "Phải ghi style:row-height");
    assert(xml.includes('style:family="table-column"'), "Phải ghi style:family=table-column");
    assert(xml.includes("style:column-width="), "Phải ghi style:column-width");
    assert(/table:visibility="collapse"/.test(xml), "Phải ghi table:visibility=collapse");
    const parsed = new SheetAdapter(null).parseFods(xml);
    const heights = parsed.rowHeightsBySheet["Kích thước"];
    const widths = parsed.colWidthsBySheet["Kích thước"];
    const hiddenRows = parsed.userHiddenRowsBySheet["Kích thước"];
    const hiddenCols = parsed.userHiddenColsBySheet["Kích thước"];
    const height = heights instanceof Map ? heights.get(2) : heights[2];
    const width = widths instanceof Map ? widths.get("B") : widths.B;
    const rowHidden = hiddenRows instanceof Set ? hiddenRows.has(3) : hiddenRows.includes(3);
    const colHidden = hiddenCols instanceof Set ? hiddenCols.has("C") : hiddenCols.includes("C");
    assert(Math.abs(height - 48) <= 1, `Parse chiều cao hàng 2 sai: ${height}`);
    assert(Math.abs(width - 160) <= 1, `Parse độ rộng cột B sai: ${width}`);
    assert(rowHidden, "Parse phải nhận hàng 3 ẩn");
    assert(colHidden, "Parse phải nhận cột C ẩn");
  });

  await test("FODS: loadFromFods khôi phục layout vào grid", () => {
    const source = new SheetGridController(container());
    source.resetToBlank("Nạp lại");
    source.setRowHeights(36, [1]);
    source.setColumnWidths(132, ["A"]);
    source.hideRows([2]);
    source.hideColumns(["B"]);
    const xml = new SheetAdapter(source).serializeToFods();
    const target = new SheetGridController(container());
    const adapter = new SheetAdapter(target);
    assert(adapter.loadFromFods(xml), "loadFromFods phải thành công");
    assert(Math.abs(target.getRowHeight(1) - 36) <= 1, `load chiều cao hàng 1 sai: ${target.getRowHeight(1)}`);
    assert(Math.abs(target.getColumnWidth("A") - 132) <= 1, `load độ rộng cột A sai: ${target.getColumnWidth("A")}`);
    assert(target.isRowUserHidden(2), "load phải ẩn hàng 2");
    assert(target.isColUserHidden("B"), "load phải ẩn cột B");
  });

  await test("FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility", () => {
    assert(findSoffice(), "Không tìm thấy LibreOffice soffice.exe");
    const grid = new SheetGridController(container());
    grid.resetToBlank("SofficeLayout");
    grid.setCellValue("A", 1, "Báo cáo", false);
    grid.setCellValue("B", 1, 100, false);
    grid.setRowHeights(52, [2]);
    grid.setColumnWidths(170, ["B"]);
    grid.hideRows([4]);
    grid.hideColumns(["C"]);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-format-dropdown-"));
    try {
      const source = path.join(root, "layout.fods");
      fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
      const xlsx = convertWithSoffice(source, "xlsx", path.join(root, "xlsx"), { profileDir: path.join(root, "profile"), timeoutMs: 20000 });
      const roundTrip = convertWithSoffice(xlsx, "fods", path.join(root, "fods"), { profileDir: path.join(root, "profile"), timeoutMs: 20000 });
      const xml = fs.readFileSync(roundTrip, "utf8");
      const parsed = new SheetAdapter(null).parseFods(xml);
      const sheetName = parsed.sheets[0];
      const heights = parsed.rowHeightsBySheet[sheetName];
      const widths = parsed.colWidthsBySheet[sheetName];
      const hiddenRows = parsed.userHiddenRowsBySheet[sheetName];
      const hiddenCols = parsed.userHiddenColsBySheet[sheetName];
      const height = heights instanceof Map ? heights.get(2) : heights?.[2];
      const width = widths instanceof Map ? widths.get("B") : widths?.B;
      const rowHidden = hiddenRows instanceof Set ? hiddenRows.has(4) : !!(hiddenRows && hiddenRows.includes?.(4));
      const colHidden = hiddenCols instanceof Set ? hiddenCols.has("C") : !!(hiddenCols && hiddenCols.includes?.("C"));
      assert(Math.abs((height || 0) - 52) <= 3, `soffice chiều cao hàng 2 lệch: ${height}`);
      assert(Math.abs((width || 0) - 170) <= 4, `soffice độ rộng cột B lệch: ${width}`);
      assert(rowHidden, "soffice phải giữ hàng 4 ẩn (table:visibility=collapse)");
      assert(colHidden, "soffice phải giữ cột C ẩn (table:visibility=collapse)");
    } finally {
      if (!process.env.VNO_KEEP_FODS_TEST_OUTPUT) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test("Adapter handleDispatch: height/width/hide/unhide/autoFit", async () => {
    const grid = new SheetGridController(container());
    grid.selectCell("A", 2);
    const adapter = new SheetAdapter(grid);
    assert(await adapter.handleDispatch(".uno:RowHeight", { height: 44 }, "sheet.row.height"), "dispatch row height");
    assert(grid.getRowHeight(2) === 44, "handleDispatch chiều cao hàng");
    assert(await adapter.handleDispatch(".uno:ColumnWidth", { width: 155 }, "sheet.col.width"), "dispatch col width");
    assert(grid.getColumnWidth("A") === 155, "handleDispatch độ rộng cột");
    assert(await adapter.handleDispatch(".uno:HideRow", { rows: [2] }, "sheet.row.hide"), "dispatch hide row");
    assert(grid.isRowUserHidden(2), "handleDispatch ẩn hàng");
    assert(await adapter.handleDispatch(".uno:ShowRow", { rows: [2] }, "sheet.row.unhide"), "dispatch unhide row");
    assert(!grid.isRowUserHidden(2), "handleDispatch hiện hàng");
    grid.setCellValue("A", 1, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", false);
    assert(await adapter.handleDispatch(".uno:SetOptimalColumnWidth", null, "sheet.col.autoFit"), "dispatch autofit col");
    assert(grid.getColumnWidth("A") > 120, "AutoFit qua dispatch phải giãn cột");
  });

  return results;
}
