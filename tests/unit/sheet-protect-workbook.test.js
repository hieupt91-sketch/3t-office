/** Behavioral tests — Protect Workbook (structure lock) for VN Sheet. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
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

export async function runSheetProtectWorkbookTests() {
  const originalDocument = globalThis.document;
  globalThis.document = undefined;
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Ribbon Review có nhóm Bảo vệ với Protect Sheet + Protect Workbook", () => {
    const review = SHEET_RIBBON_TABS.find(tab => tab.id === "review");
    assert(review, "Thiếu tab Xem xét");
    const group = review.groups.find(item => item.id === "protection");
    assert(group, "Thiếu nhóm Bảo vệ trên tab Xem xét");
    assert(group.label === "Bảo vệ" && group.labelKey === "sheetRibbon.group.protection", "Nhãn nhóm Bảo vệ");
    const ids = flatten(group.items).map(item => item.commandId);
    assert(ids.includes("sheet.sheet.protect"), "Nhóm Bảo vệ phải có Bảo vệ trang tính");
    assert(ids.includes("sheet.workbook.protect"), "Nhóm Bảo vệ phải có Bảo vệ workbook");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.workbook.protect"), "Thiếu SHEET_COMMANDS sheet.workbook.protect");
    assert(viStrings.commands["sheet.workbook.protect"]?.label, "Thiếu i18n VI");
    assert(enStrings.commands["sheet.workbook.protect"]?.label, "Thiếu i18n EN");
    assert(viStrings.sheetRibbon.group.protection === "Bảo vệ", "Thiếu sheetRibbon.group.protection VI");
    assert(enStrings.sheetRibbon.group.protection === "Protect", "Thiếu sheetRibbon.group.protection EN");
    assert(ICONS.protectWorkbook.includes("<svg"), "Thiếu icon protectWorkbook");
    assert(VN_TO_UNO_MAP["sheet.workbook.protect"] === ".uno:ToolProtectionDocument", "UNO map ToolProtectionDocument");
  });

  await test("Help có bài riêng Protect Workbook, khác Protect Sheet", () => {
    const entry = SHEET_HELP_ENTRIES.find(item => item.id === "sheet.workbook.protect");
    assert(entry, "Thiếu bài Help sheet.workbook.protect");
    assert(entry.ribbon?.tab === "Xem xét" && entry.ribbon?.group === "Bảo vệ", "Help phải chỉ đúng tab Xem xét / nhóm Bảo vệ");
    assert(entry.steps.length >= 3, "Phải có bước dùng thật");
    assert(/cấu trúc/i.test(entry.summary) && /ô vẫn sửa/i.test(entry.summary + entry.steps.join(" ")), "Phải nói rõ khóa cấu trúc, ô vẫn sửa được");
    const sheetProtect = SHEET_HELP_ENTRIES.find(item => item.id === "sheet.sheet.protect");
    assert(sheetProtect, "Không được làm mất bài Protect Sheet");
  });

  await test("Protect Workbook chặn rename / add / delete; nội dung ô vẫn sửa được", () => {
    const grid = new SheetGridController(container());
    const first = grid.activeSheet;
    const beforeCount = grid.sheets.length;
    grid.setCellValue("A", 1, "ok", false);
    assert(grid.protectWorkbook({ password: "secret" }) === true, "protectWorkbook");
    assert(grid.isWorkbookProtected() === true, "isWorkbookProtected");
    assert(grid.renameSheet(first, "BiKhoa") === false, "renameSheet phải bị từ chối");
    assert(grid.sheets.includes(first) && !grid.sheets.includes("BiKhoa"), "Tên sheet không đổi");
    assert(grid.addSheet() === false, "addSheet phải bị từ chối");
    assert(grid.sheets.length === beforeCount, "Số trang không tăng");
    assert(grid.deleteSheet(grid.sheets[1]) === false, "deleteSheet phải bị từ chối");
    assert(grid.sheets.length === beforeCount, "Số trang không giảm");
    assert(grid.moveSheet(first, null) === false, "moveSheet phải bị từ chối");
    assert(grid.copySheet(first, null) === false, "copySheet phải bị từ chối");
    assert(grid.setCellValue("A", 1, "van-sua") !== false, "Nội dung ô vẫn sửa được khi chỉ khóa workbook");
    assert(grid.cellsData.get("A1").val === "van-sua", "A1 phải thành van-sua");
    assert(!grid.isSheetProtected(), "Protect Workbook không bật Protect Sheet");
  });

  await test("Sai mật khẩu không mở workbook; đúng mật khẩu mở lại cấu trúc", () => {
    const grid = new SheetGridController(container());
    const first = grid.activeSheet;
    grid.protectWorkbook({ password: "secret" });
    assert(grid.unprotectWorkbook({ password: "wrong" }) === false, "Sai mật khẩu không được mở");
    assert(grid.isWorkbookProtected() === true, "Vẫn khóa sau mật khẩu sai");
    assert(grid.renameSheet(first, "VanKhoa") === false, "Vẫn chặn rename khi sai mật khẩu");
    assert(grid.unprotectWorkbook({ password: "secret" }) === true, "Đúng mật khẩu phải mở");
    assert(grid.isWorkbookProtected() === false, "Đã bỏ bảo vệ");
    assert(grid.renameSheet(first, "DaMo") === "DaMo", "Sau bỏ bảo vệ được đổi tên");
    assert(typeof grid.addSheet() === "string", "Sau bỏ bảo vệ được thêm trang");
  });

  await test("Protect Sheet và Protect Workbook độc lập: khóa workbook không chặn sửa ô; khóa sheet thì chặn", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("B", 1, "goc", false);
    grid.protectWorkbook({ password: "wb" });
    assert(grid.setCellValue("B", 1, "sau-wb") !== false, "Workbook lock không chặn ô");
    grid.protectSheet({ password: "sh" });
    assert(grid.setCellValue("B", 1, "hack") === false, "Sheet lock vẫn chặn ô");
    assert(grid.cellsData.get("B1").val === "sau-wb", "Giá trị không đổi khi sheet khóa");
    assert(grid.unprotectSheet({ password: "sh" }) === true, "Bỏ bảo vệ sheet");
    assert(grid.isWorkbookProtected() === true, "Workbook vẫn khóa");
    assert(grid.addSheet() === false, "Cấu trúc vẫn bị chặn");
    assert(grid.setCellValue("B", 1, "free") !== false, "Ô sửa lại được sau khi bỏ sheet lock");
  });

  await test("Adapter handleDispatch ProtectDocument bật/tắt workbook", async () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    const first = grid.activeSheet;
    assert(await adapter.handleDispatch(".uno:ToolProtectionDocument", { protect: true, password: "pw" }, "sheet.workbook.protect"), "dispatch protect workbook");
    assert(grid.isWorkbookProtected(), "handleDispatch bật protect workbook");
    assert(grid.renameSheet(first, "X") === false, "Sau dispatch vẫn chặn rename");
    assert(await adapter.handleDispatch(".uno:ToolProtectionDocument", { unprotect: true, password: "pw" }, "sheet.workbook.protect"), "dispatch unprotect workbook");
    assert(!grid.isWorkbookProtected(), "handleDispatch tắt protect workbook");
    assert(grid.renameSheet(first, "DispatchWb") === "DispatchWb", "Sau unprotect được đổi tên");
  });

  globalThis.document = originalDocument;
  return results;
}
