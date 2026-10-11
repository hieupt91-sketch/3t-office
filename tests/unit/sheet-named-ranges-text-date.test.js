import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

export async function runSheetNamedRangesTextDateTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name: `${name}: ${error.message}`, pass: false }); } };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const engine = new FormulaEngine(new Map());

  test("TEXT/DATE catalog có đủ 7 hàm mới và CONCATENATE", () => {
    for (const name of ["TEXT", "DATE", "DATEDIF", "EDATE", "SUBSTITUTE", "FIND", "CONCATENATE"]) assert(FUNCTION_CATALOG.some(item => item.name === name), `Thiếu ${name}`);
  });
  test("TEXT định dạng hàng nghìn, thập phân và ngày chính xác", () => {
    assert(engine.evaluate('=TEXT(1234567,"#,##0")') === "1,234,567", "Sai #,##0");
    assert(engine.evaluate('=TEXT(12.5,"0.00")') === "12.50", "Sai 0.00");
    assert(engine.evaluate('=TEXT("3/2/2026","dd/mm/yyyy")') === "03/02/2026", "Sai ngày");
  });
  test("DATE chuẩn hóa tháng tràn và trả số serial Excel", () => assert(engine.evaluate("=DATE(2025,13,2)") === 46024, "DATE sai"));
  test("DATEDIF tính đúng ngày, tháng và năm trọn vẹn", () => {
    assert(engine.evaluate('=DATEDIF("01/01/2024","11/02/2024","d")') === 41, "Sai ngày");
    assert(engine.evaluate('=DATEDIF("15/01/2024","14/03/2024","m")') === 1, "Sai tháng trọn");
    assert(engine.evaluate('=DATEDIF("15/06/2020","14/06/2025","y")') === 4, "Sai năm trọn");
  });
  test("EDATE kẹp ngày cuối tháng khi cộng/trừ tháng và trả số serial Excel", () => {
    assert(engine.evaluate('=EDATE("31/01/2024",1)') === 45351, "Sai tháng nhuận");
    assert(engine.evaluate('=EDATE("31/03/2024",-1)') === 45351, "Sai trừ tháng");
  });
  test("SUBSTITUTE thay tất cả hoặc đúng lần xuất hiện", () => {
    assert(engine.evaluate('=SUBSTITUTE("a-b-a","a","x")') === "x-b-x", "Sai thay tất cả");
    assert(engine.evaluate('=SUBSTITUTE("a-b-a","a","x",2)') === "a-b-x", "Sai instance_num");
  });
  test("FIND phân biệt hoa thường, start_num và trả #VALUE!", () => {
    assert(engine.evaluate('=FIND("Office","VN Office")') === 4, "Sai vị trí");
    assert(engine.evaluate('=FIND("o","VN Office")') === "#VALUE!", "Không phân biệt hoa thường");
    assert(engine.evaluate('=FIND("f","VN Office",6)') === 6, "Sai start_num");
  });

  const grid = new SheetGridController({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });
  grid.cellsData.set("A1", { val: "10", formula: "", style: {} });
  grid.cellsData.set("A2", { val: "20", formula: "", style: {} });
  grid.cellsData.set("A3", { val: "30", formula: "", style: {} });
  test("Named range workbook tính SUM trên dữ liệu ô thật", () => {
    const item = grid.saveNamedRange({ name: "DoanhThu_Q1", ref: "A1:A3", scope: "workbook" });
    assert(item && grid.formulaEngine.evaluate("=SUM(DoanhThu_Q1)") === 60, "SUM tên vùng không bằng 60");
  });
  test("Tên không hợp lệ và tên giống địa chỉ ô bị từ chối", () => {
    assert(grid.saveNamedRange({ name: "1 Sai", ref: "A1" }) === false, "Nhận tên có khoảng trắng");
    assert(grid.saveNamedRange({ name: "A1", ref: "A1" }) === false, "Nhận tên giống địa chỉ");
  });
  test("Named range theo sheet cô lập; workbook name giữ đúng sheet đích", () => {
    grid.saveNamedRange({ name: "ChiTieu", ref: "A1", scope: "workbook" });
    grid.saveNamedRange({ name: "ChiTieu", ref: "A2", scope: "sheet" });
    assert(grid.formulaEngine.evaluate("=SUM(ChiTieu)") === 20, "Sheet scope không override");
    grid.switchSheet("Kế hoạch Q3"); grid.cellsData.set("A1", { val: "7", formula: "", style: {} });
    assert(grid.formulaEngine.evaluate("=SUM(ChiTieu)") === 10, "Workbook scope phải giữ sheet đích thay vì đổi theo sheet active");
  });
  test("Thêm/sửa/xóa named range undo/redo đối xứng", () => {
    grid.switchSheet("Dự toán chi phí");
    const item = grid.saveNamedRange({ name: "UndoName", ref: "A1:A2", scope: "workbook" });
    grid.undo(); assert(!grid.resolveNamedRange("UndoName"), "Undo thêm thất bại");
    grid.redo(); assert(grid.resolveNamedRange("UndoName")?.ref === "A1:A2", "Redo thêm thất bại");
    grid.saveNamedRange({ ...item, ref: "A2:A3" }); grid.undo(); assert(grid.resolveNamedRange("UndoName")?.ref === "A1:A2", "Undo sửa thất bại");
    grid.deleteNamedRange(item.id); grid.undo(); assert(grid.resolveNamedRange("UndoName"), "Undo xóa thất bại");
  });
  test("Xóa sheet dọn named range sheet scope và undo phục hồi", () => {
    grid.switchSheet("Nhân sự"); const item = grid.saveNamedRange({ name: "NhanSu", ref: "A1:A2", scope: "sheet" });
    grid.deleteSheet("Nhân sự"); assert(!grid.namedRangesBySheet["Nhân sự"], "Còn rác named range");
    grid.undo(); assert(grid.namedRangesBySheet["Nhân sự"].some(range => range.id === item.id), "Undo không phục hồi named range");
  });
  test("Named ranges round-trip qua table:named-expressions ODF chuẩn và giữ scope", () => {
    const first = grid.sheets[0];
    grid.switchSheet(first);
    grid.namedRangesWorkbook = [{ id: "w1", name: "TongNam", ref: "A1:A3", scope: "workbook", sheet: first }];
    grid.namedRangesBySheet[first] = [{ id: "s1", name: "ChiTieu", ref: "A2:A3", scope: "sheet", sheet: first }];
    const adapter = new SheetAdapter(grid);
    const xml = adapter.serializeToFods();
    assert(xml.includes("<table:named-expressions>") && xml.includes('table:name="TongNam"'), "Thiếu named range ODF");
    const parsed = adapter.parseFods(xml);
    assert(parsed.namedRangesWorkbook[0]?.ref === "A1:A3", "Sai workbook range");
    assert(parsed.namedRangesBySheet[first][0]?.scope === "sheet", "Sai sheet scope");
  });
  test("Name Manager có command, UNO mapping, ribbon và icon SVG thật", () => {
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.formula.nameManager"), "Thiếu command");
    assert(VN_TO_UNO_MAP["sheet.formula.nameManager"] === ".uno:DefineName", "Sai UNO mapping");
    assert(SHEET_RIBBON_TABS.find(tab => tab.id === "formulas").groups.some(group => JSON.stringify(group).includes("sheet.formula.nameManager")), "Thiếu ribbon");
    assert(ICONS.nameManager.includes("<svg") && !ICONS.nameManager.includes("<circle"), "Icon generic");
  });
  return results;
}
