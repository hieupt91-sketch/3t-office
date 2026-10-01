/** Behavioral tests — Rename / Move-Copy / Protect Sheet for VN Sheet. */
import { SheetGridController, MAX_SHEET_NAME_LENGTH, INVALID_SHEET_NAME_CHARS } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function flatten(items) {
  return (items || []).flatMap(item => item.items ? flatten(item.items) : [item]);
}

export async function runSheetRenameMoveProtectTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Ribbon + command + icon + i18n + mapper cho 3 lệnh quản lý trang tính", () => {
    const home = SHEET_RIBBON_TABS.find(tab => tab.id === "home");
    const cells = home.groups.find(group => group.id === "cells");
    const dropdown = flatten(cells.items).find(item => item.id === "sheet.cells.format")
      || cells.items.find(item => item.id === "sheet.cells.format");
    assert(dropdown && dropdown.type === "dropdown", "Thiếu dropdown Định dạng trong nhóm Ô");
    const ids = dropdown.items.map(item => item.commandId);
    ["sheet.sheet.rename", "sheet.sheet.moveOrCopy", "sheet.sheet.protect"].forEach(id => {
      assert(ids.includes(id), `Dropdown Định dạng thiếu ${id}`);
      assert(SHEET_COMMANDS.some(command => command.id === id), `Thiếu command ${id}`);
      assert(viStrings.commands[id]?.label && enStrings.commands[id]?.label, `Thiếu i18n cho ${id}`);
      assert(VN_TO_UNO_MAP[id], `Thiếu UNO map cho ${id}`);
    });
    assert(ICONS.renameSheet.includes("<svg") && ICONS.moveCopySheet.includes("<svg") && ICONS.protectSheet.includes("<svg"), "Thiếu icon vector");
    assert(VN_TO_UNO_MAP["sheet.sheet.rename"] === ".uno:RenameTable", "Rename map .uno:RenameTable");
    assert(VN_TO_UNO_MAP["sheet.sheet.moveOrCopy"] === ".uno:Move", "Move map .uno:Move");
    assert(VN_TO_UNO_MAP["sheet.sheet.protect"] === ".uno:Protect", "Protect map .uno:Protect");
  });

  await test("Help có bài riêng cho Đổi tên, Di chuyển/Sao chép và Bảo vệ trang tính", () => {
    ["sheet.sheet.rename", "sheet.sheet.moveOrCopy", "sheet.sheet.protect"].forEach(id => {
      const entry = SHEET_HELP_ENTRIES.find(item => item.id === id);
      assert(entry, `Thiếu bài Help ${id}`);
      assert(entry.steps.length >= 3 && entry.ribbon?.group === "Ô", `${id} phải chỉ đúng nhóm Ô và có bước dùng`);
    });
  });

  await test("validateSheetName từ chối trống, trùng, quá dài và ký tự Excel cấm", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    assert(!grid.validateSheetName("").ok, "Tên trống phải lỗi");
    assert(!grid.validateSheetName("   ").ok, "Tên khoảng trắng phải lỗi");
    assert(!grid.validateSheetName("Dự toán chi phí").ok, "Trùng tên mặc định phải lỗi");
    assert(!grid.validateSheetName("a/b").ok && INVALID_SHEET_NAME_CHARS.test("a/b"), "Dấu / phải cấm");
    assert(!grid.validateSheetName("a\\b").ok, "Dấu \\\\ phải cấm");
    assert(!grid.validateSheetName("a?b").ok, "Dấu ? phải cấm");
    assert(!grid.validateSheetName("a*b").ok, "Dấu * phải cấm");
    assert(!grid.validateSheetName("a[b]").ok, "Dấu [ ] phải cấm");
    assert(!grid.validateSheetName("a:b").ok, "Dấu : phải cấm");
    assert(!grid.validateSheetName("O'Brien").ok, "Dấu nháy đơn phải cấm");
    assert(!grid.validateSheetName("x".repeat(MAX_SHEET_NAME_LENGTH + 1)).ok, "Quá 31 ký tự phải lỗi");
    assert(grid.validateSheetName("NganSach2026").ok, "Tên hợp lệ phải được chấp nhận");
    assert(grid.validateSheetName("Dự toán chi phí", { excludeName: "Dự toán chi phí" }).ok, "Giữ nguyên tên hiện tại phải hợp lệ");
  });

  await test("Đổi tên sheet cập nhật công thức tham chiếu trên sheet khác", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.setCellValue("A", 1, 25, false);
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("B", 2, "='Dự toán chi phí'!A1", false);
    assert(grid.cellsData.get("B2").val === 25, `Trước đổi tên B2 phải = 25, thực tế ${grid.cellsData.get("B2").val}`);
    const renamed = grid.renameSheet("Dự toán chi phí", "NganSach");
    assert(renamed === "NganSach", "renameSheet phải trả tên mới");
    assert(grid.sheets.includes("NganSach") && !grid.sheets.includes("Dự toán chi phí"), "Mảng sheets phải đổi khóa");
    assert(grid.sheetsData.NganSach.get("A1").val === 25, "Dữ liệu phải đi theo khóa mới");
    const formula = grid.cellsData.get("B2").formula;
    assert(formula === "='NganSach'!A1", `Công thức phải thành ='NganSach'!A1, thực tế ${formula}`);
    assert(grid.cellsData.get("B2").val === 25, "Giá trị sau đổi tên vẫn 25");
  });

  await test("Đổi tên cập nhật named range và nguồn Pivot; chuỗi trong dấu nháy kép không đổi", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.saveNamedRange({ name: "DonGia", ref: "A1", scope: "workbook", sheet: "Dự toán chi phí" });
    grid.pivotTablesBySheet["Kế hoạch Q3"] = [{ id: "p1", sourceSheet: "Dự toán chi phí", targetSheet: "Kế hoạch Q3" }];
    grid.switchSheet("Nhân sự");
    grid.setCellValue("C", 1, '="Dự toán chi phí"', false);
    grid.renameSheet("Dự toán chi phí", "ChiPhi");
    assert(grid.namedRangesWorkbook[0].sheet === "ChiPhi", "Named range workbook phải đổi sheet");
    assert(grid.pivotTablesBySheet["Kế hoạch Q3"][0].sourceSheet === "ChiPhi", "Pivot sourceSheet phải đổi");
    assert(grid.cellsData.get("C1").formula === '="Dự toán chi phí"', "Chuỗi trong dấu nháy kép không được sửa");
  });

  await test("Undo/Redo đổi tên dùng stack hiện có và khôi phục công thức", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("A", 1, "='Dự toán chi phí'!A1", false);
    grid.renameSheet("Dự toán chi phí", "BaoCao");
    assert(grid.cellsData.get("A1").formula === "='BaoCao'!A1", "Sau rename");
    assert(grid.undo() === true, "Undo rename");
    assert(grid.sheets.includes("Dự toán chi phí") && !grid.sheets.includes("BaoCao"), "Undo phải trả tên cũ");
    assert(grid.cellsData.get("A1").formula === "='Dự toán chi phí'!A1", "Undo phải trả công thức cũ");
    assert(grid.redo() === true, "Redo rename");
    assert(grid.sheets.includes("BaoCao"), "Redo phải đặt lại tên mới");
    assert(grid.cellsData.get("A1").formula === "='BaoCao'!A1", "Redo phải sửa lại công thức");
  });

  await test("Di chuyển tab: chèn trước một sheet hoặc chuyển đến cuối", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const first = grid.sheets[0];
    const last = grid.sheets[2];
    assert(grid.moveSheet(first, last) === true, "moveSheet trước sheet cuối");
    assert(grid.sheets[1] === first, `Sheet đầu phải đứng trước sheet cuối, thực tế ${grid.sheets.join(" | ")}`);
    assert(grid.moveSheet(first, null) === true, "moveSheet đến cuối");
    assert(grid.sheets[grid.sheets.length - 1] === first, "Phải ở cuối mảng");
    grid.undo();
    grid.undo();
    assert(grid.sheets[0] === first, "Undo hai lần phải trả thứ tự ban đầu");
  });

  await test("Sao chép trang tính nhân bản dữ liệu, định dạng, Page Setup và đặt tên (2)", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const source = grid.activeSheet;
    grid.setCellValue("A", 1, 42, false);
    grid.setCellValue("B", 1, "hello", false);
    grid.cellsData.get("B1").style = { fontWeight: "bold", backgroundColor: "#fff2cc" };
    grid.pageSetupBySheet[source].orientation = "landscape";
    grid.pageSetupBySheet[source].scale = { mode: "percent", percent: 80, pagesWide: 1, pagesTall: 0 };
    grid.conditionalFormattingBySheet[source] = [{ id: "cf1", type: "greaterThan", value: 10, color: "#fde68a", range: { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } } }];
    const copied = grid.copySheet(source, null);
    assert(copied === `${source} (2)`, `Tên bản sao phải là «${source} (2)», thực tế ${copied}`);
    assert(grid.activeSheet === copied, "Phải chuyển sang bản sao");
    assert(grid.sheetsData[copied].get("A1").val === 42, "Bản sao phải giữ giá trị A1");
    assert(grid.sheetsData[copied].get("B1").style.fontWeight === "bold", "Bản sao phải giữ định dạng");
    assert(grid.pageSetupBySheet[copied].orientation === "landscape", "Bản sao phải giữ Page Setup");
    assert(grid.pageSetupBySheet[copied].scale.percent === 80, "Bản sao phải giữ tỷ lệ in");
    assert(grid.conditionalFormattingBySheet[copied][0].type === "greaterThan", "Bản sao phải giữ Conditional Formatting");
    grid.sheetsData[copied].get("A1").val = 99;
    assert(grid.sheetsData[source].get("A1").val === 42, "Sửa bản sao không được đụng trang gốc");
    assert(grid.undo() === true, "Undo copy phải xóa bản sao");
    assert(!grid.sheets.includes(copied), "Sau undo không còn trang (2)");
  });

  await test("Bảo vệ trang tính chặn sửa ô và xóa hàng; bỏ bảo vệ mở lại", () => {
    const originalDocument = globalThis.document;
    globalThis.document = undefined;
    try {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.setCellValue("A", 1, "ok", false);
    assert(grid.protectSheet({ password: "secret" }) === true, "protectSheet");
    assert(grid.isSheetProtected() === true, "isSheetProtected");
    assert(grid.setCellValue("A", 1, "hack") === false, "Sửa ô khi khóa phải bị từ chối");
    assert(grid.cellsData.get("A1").val === "ok", "Giá trị A1 không đổi khi bị khóa");
    assert(grid.deleteRow(2) === false, "Xóa hàng khi khóa phải bị từ chối");
    assert(grid.unprotectSheet({ password: "wrong" }) === false, "Sai mật khẩu không được mở");
    assert(grid.isSheetProtected() === true, "Vẫn khóa sau mật khẩu sai");
    assert(grid.unprotectSheet({ password: "secret" }) === true, "Đúng mật khẩu phải mở");
    assert(grid.setCellValue("A", 1, "free") !== false, "Sau bỏ bảo vệ được sửa ô");
    assert(grid.cellsData.get("A1").val === "free", "A1 phải thành free");
    } finally {
      globalThis.document = originalDocument;
    }
  });

  await test("Adapter handleDispatch rename / move / protect", async () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const adapter = new SheetAdapter(grid);
    const old = grid.activeSheet;
    assert(await adapter.handleDispatch(".uno:RenameTable", { newName: "DispatchTen" }, "sheet.sheet.rename"), "dispatch rename");
    assert(grid.sheets.includes("DispatchTen") && !grid.sheets.includes(old), "handleDispatch đổi tên");
    const first = grid.sheets[0];
    assert(await adapter.handleDispatch(".uno:Move", { sheetName: first, beforeName: null, move: true }, "sheet.sheet.moveOrCopy"), "dispatch move");
    assert(grid.sheets[grid.sheets.length - 1] === first, "handleDispatch chuyển đến cuối");
    assert(await adapter.handleDispatch(".uno:Protect", { protect: true }, "sheet.sheet.protect"), "dispatch protect");
    assert(grid.isSheetProtected(), "handleDispatch bật protect");
    assert(await adapter.handleDispatch(".uno:Protect", { unprotect: true }, "sheet.sheet.protect"), "dispatch unprotect");
    assert(!grid.isSheetProtected(), "handleDispatch tắt protect");
  });

  return results;
}
