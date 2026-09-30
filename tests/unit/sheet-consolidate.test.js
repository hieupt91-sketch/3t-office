/**
 * VN Sheet — Consolidate (Hợp nhất dữ liệu).
 * Kết quả phải khớp FormulaEngine và phép tính tay trên dữ liệu nhiều sheet.
 */

import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { computeConsolidate, evaluateConsolidateFunction, formatSheetRange, parseConsolidateReference } from "../../apps/sheet/consolidate.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

const S1 = "Dự toán chi phí";
const S2 = "Kế hoạch Q3";
const S3 = "Nhân sự";

const container = () => ({
  querySelector() { return null; },
  querySelectorAll() { return []; },
  classList: { add() {}, remove() {}, toggle() {} }
});

const assert = (value, message) => { if (!value) throw new Error(message); };
const num = value => Number(value);
const cellVal = (grid, coord) => grid.cellsData.get(coord)?.val;

function put(grid, sheet, coord, val) {
  const previous = grid.activeSheet;
  if (sheet !== previous) grid.switchSheet(sheet);
  grid.cellsData.set(coord, { val, formula: "", style: {} });
  if (sheet !== previous) grid.switchSheet(previous);
}

function seedPositionGrids(grid) {
  put(grid, S1, "A1", 10); put(grid, S1, "B1", 20);
  put(grid, S1, "A2", 3); put(grid, S1, "B2", 7);
  put(grid, S2, "A1", 1); put(grid, S2, "B1", 2);
  put(grid, S2, "A2", 4); put(grid, S2, "B2", 8);
}

export async function runSheetConsolidateTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Consolidate: SUM 2 sheet cùng kích thước — engine và tính tay 10+1=11", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    seedPositionGrids(grid);
    grid.switchSheet(S3);
    grid.selectCell("A", 1);
    const hand = { A1: 10 + 1, B1: 20 + 2, A2: 3 + 4, B2: 7 + 8 };
    const engineA1 = grid.formulaEngine.evaluate(`=SUM(${formatSheetRange(S1, "A1")},${formatSheetRange(S2, "A1")})`);
    assert(engineA1 === hand.A1, `Engine SUM A1=${engineA1}, tính tay ${hand.A1}`);
    const result = grid.applyConsolidate({
      functionName: "SUM",
      references: [`${formatSheetRange(S1, "A1:B2")}`, `${formatSheetRange(S2, "A1:B2")}`]
    });
    assert(result.ok && result.mode === "position", `applyConsolidate thất bại: ${result.error}`);
    assert(num(cellVal(grid, "A1")) === hand.A1, `A1=${cellVal(grid, "A1")}, cần ${hand.A1}`);
    assert(num(cellVal(grid, "B1")) === hand.B1, `B1=${cellVal(grid, "B1")}, cần ${hand.B1}`);
    assert(num(cellVal(grid, "A2")) === hand.A2, `A2=${cellVal(grid, "A2")}, cần ${hand.A2}`);
    assert(num(cellVal(grid, "B2")) === hand.B2, `B2=${cellVal(grid, "B2")}, cần ${hand.B2}`);
    const sumCell = result.cells.find(cell => cell.rowOffset === 0 && cell.colOffset === 0);
    assert(sumCell.formulaUsed.includes("SUM"), "Phải gọi công thức SUM");
    assert(num(sumCell.value) === grid.formulaEngine.evaluate(sumCell.formulaUsed), "Giá trị ghi ra phải = engine.evaluate(công thức đã dùng)");
  });

  await test("Consolidate: AVERAGE và MAX trên cùng dữ liệu, không chỉ SUM", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    seedPositionGrids(grid);
    grid.switchSheet(S3);
    const avgHand = { A1: (10 + 1) / 2, B1: (20 + 2) / 2, A2: (3 + 4) / 2, B2: (7 + 8) / 2 };
    const avg = grid.applyConsolidate({
      functionName: "AVERAGE",
      references: [`${formatSheetRange(S1, "A1:B2")}`, `${formatSheetRange(S2, "A1:B2")}`],
      destination: { c: "A", r: 1 }
    });
    assert(avg.ok, `AVERAGE thất bại: ${avg.error}`);
    assert(num(cellVal(grid, "A1")) === avgHand.A1, `AVERAGE A1=${cellVal(grid, "A1")}, tính tay ${avgHand.A1}`);
    assert(num(cellVal(grid, "B2")) === avgHand.B2, `AVERAGE B2=${cellVal(grid, "B2")}, tính tay ${avgHand.B2}`);
    const engineAvg = grid.formulaEngine.evaluate(`=AVERAGE(${formatSheetRange(S1, "A1")},${formatSheetRange(S2, "A1")})`);
    assert(engineAvg === avgHand.A1, `Engine AVERAGE A1=${engineAvg}`);

    grid.undo();
    const maxHand = { A1: Math.max(10, 1), B1: Math.max(20, 2), A2: Math.max(3, 4), B2: Math.max(7, 8) };
    const max = grid.applyConsolidate({
      functionName: "MAX",
      references: [`${formatSheetRange(S1, "A1:B2")}`, `${formatSheetRange(S2, "A1:B2")}`]
    });
    assert(max.ok, `MAX thất bại: ${max.error}`);
    assert(num(cellVal(grid, "A1")) === maxHand.A1, `MAX A1=${cellVal(grid, "A1")}, tính tay ${maxHand.A1}`);
    assert(num(cellVal(grid, "A2")) === maxHand.A2, `MAX A2=${cellVal(grid, "A2")}, tính tay ${maxHand.A2}`);
    assert(grid.formulaEngine.evaluate(`=MAX(${formatSheetRange(S1, "A1")},${formatSheetRange(S2, "A1")})`) === maxHand.A1, "Engine MAX A1 sai");
  });

  await test("Consolidate: COUNT 3 sheet và Undo/Redo khôi phục đúng khối đã chèn", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    seedPositionGrids(grid);
    put(grid, S3, "A1", 100); put(grid, S3, "B1", 200);
    put(grid, S3, "A2", 9); put(grid, S3, "B2", 11);
    const refs = [
      `${formatSheetRange(S1, "A1:B2")}`,
      `${formatSheetRange(S2, "A1:B2")}`,
      `${formatSheetRange(S3, "A1:B2")}`
    ];
    grid.addSheet("Tổng hợp", false);
    grid.selectCell("D", 5);
    const count = grid.applyConsolidate({ functionName: "COUNT", references: refs });
    assert(count.ok, `COUNT thất bại: ${count.error}`);
    assert(num(cellVal(grid, "D5")) === 3, `COUNT D5=${cellVal(grid, "D5")}, 3 ô số từ 3 sheet`);
    assert(num(cellVal(grid, "E6")) === 3, `COUNT E6=${cellVal(grid, "E6")}`);
    const beforeUndo = { D5: cellVal(grid, "D5"), E6: cellVal(grid, "E6") };
    assert(grid.undo(), "Undo phải chạy");
    assert(cellVal(grid, "D5") == null || cellVal(grid, "D5") === "", `Undo phải xóa D5, còn ${cellVal(grid, "D5")}`);
    assert(cellVal(grid, "E6") == null || cellVal(grid, "E6") === "", "Undo phải xóa E6");
    assert(grid.redo(), "Redo phải chạy");
    assert(num(cellVal(grid, "D5")) === num(beforeUndo.D5), "Redo D5 sai");
    assert(num(cellVal(grid, "E6")) === num(beforeUndo.E6), "Redo E6 sai");
    assert(grid.activeSheet === "Tổng hợp", "Đích phải là sheet Tổng hợp, không ghi đè nguồn");
    assert(grid.sheetsData[S1].get("A1").val === 10, "Không được sửa sheet nguồn");
  });

  await test("Consolidate: theo nhãn (hàng trên + cột trái) khớp thứ tự khác nhau", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    put(grid, S1, "A1", "Mặt hàng"); put(grid, S1, "B1", "Q1"); put(grid, S1, "C1", "Q2");
    put(grid, S1, "A2", "Hà Nội"); put(grid, S1, "B2", 10); put(grid, S1, "C2", 20);
    put(grid, S1, "A3", "HCM"); put(grid, S1, "B3", 5); put(grid, S1, "C3", 8);
    put(grid, S2, "A1", "Mặt hàng"); put(grid, S2, "B1", "Q2"); put(grid, S2, "C1", "Q1");
    put(grid, S2, "A2", "HCM"); put(grid, S2, "B2", 2); put(grid, S2, "C2", 3);
    put(grid, S2, "A3", "Hà Nội"); put(grid, S2, "B3", 4); put(grid, S2, "C3", 6);
    grid.switchSheet(S3);
    grid.selectCell("A", 1);
    const result = grid.applyConsolidate({
      functionName: "SUM",
      references: [`${formatSheetRange(S1, "A1:C3")}`, `${formatSheetRange(S2, "A1:C3")}`],
      topRow: true,
      leftColumn: true
    });
    assert(result.ok && result.mode === "label", `Label mode thất bại: ${result.error}`);
    assert(String(cellVal(grid, "B1")) === "Q1", `Header cột B phải Q1, được ${cellVal(grid, "B1")}`);
    assert(String(cellVal(grid, "C1")) === "Q2", `Header cột C phải Q2, được ${cellVal(grid, "C1")}`);
    assert(String(cellVal(grid, "A2")) === "Hà Nội", `Hàng 2 phải Hà Nội, được ${cellVal(grid, "A2")}`);
    assert(String(cellVal(grid, "A3")) === "HCM", `Hàng 3 phải HCM, được ${cellVal(grid, "A3")}`);
    const hnQ1 = 10 + 6;
    const hnQ2 = 20 + 4;
    const hcmQ1 = 5 + 3;
    const hcmQ2 = 8 + 2;
    assert(num(cellVal(grid, "B2")) === hnQ1, `Hà Nội Q1=${cellVal(grid, "B2")}, tính tay ${hnQ1}`);
    assert(num(cellVal(grid, "C2")) === hnQ2, `Hà Nội Q2=${cellVal(grid, "C2")}, tính tay ${hnQ2}`);
    assert(num(cellVal(grid, "B3")) === hcmQ1, `HCM Q1=${cellVal(grid, "B3")}, tính tay ${hcmQ1}`);
    assert(num(cellVal(grid, "C3")) === hcmQ2, `HCM Q2=${cellVal(grid, "C3")}, tính tay ${hcmQ2}`);
    const engineHnQ1 = grid.formulaEngine.evaluate(`=SUM(${formatSheetRange(S1, "B2")},${formatSheetRange(S2, "C3")})`);
    assert(engineHnQ1 === hnQ1, `Engine Hà Nội Q1=${engineHnQ1}`);
  });

  await test("Consolidate: theo vị trí từ chối vùng khác kích thước; parse ref có tên sheet tiếng Việt", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    seedPositionGrids(grid);
    grid.switchSheet(S3);
    const mismatch = grid.applyConsolidate({
      functionName: "SUM",
      references: [`${formatSheetRange(S1, "A1:B2")}`, `${formatSheetRange(S2, "A1:A2")}`]
    });
    assert(!mismatch.ok && mismatch.error === "size-mismatch", `Phải báo size-mismatch, được ${mismatch.error}`);
    const parsed = parseConsolidateReference(grid.formulaEngine, `${S1}!A1:B5`, S3);
    assert(!parsed.error && parsed.sheet === S1 && parsed.width === 2 && parsed.height === 5, `Parse ref tiếng Việt sai: ${JSON.stringify(parsed)}`);
    const empty = computeConsolidate({ engine: grid.formulaEngine, functionName: "SUM", references: [] });
    assert(empty.error === "no-references", "Thiếu tham chiếu phải lỗi");
    const badFn = computeConsolidate({
      engine: grid.formulaEngine,
      functionName: "PRODUCT",
      references: [`${formatSheetRange(S1, "A1")}`]
    });
    assert(badFn.error === "bad-function", "Chỉ cho SUM/AVERAGE/COUNT/MAX/MIN");
  });

  await test("Consolidate: evaluateConsolidateFunction ủy thác FormulaEngine, không cộng cứng", () => {
    const engine = new FormulaEngine(new Map([
      ["A1", { val: 4, formula: "" }],
      ["A2", { val: 6, formula: "" }]
    ]));
    const sum = evaluateConsolidateFunction(engine, "SUM", ["A1", "A2"]);
    const avg = evaluateConsolidateFunction(engine, "AVERAGE", ["A1", "A2"]);
    assert(sum === engine.evaluate("=SUM(A1,A2)") && sum === 4 + 6, `SUM ủy thác sai ${sum}`);
    assert(avg === engine.evaluate("=AVERAGE(A1,A2)") && avg === (4 + 6) / 2, `AVERAGE ủy thác sai ${avg}`);
  });

  await test("Consolidate: ribbon, icon, i18n, UNO và SheetAdapter", async () => {
    const dataTab = SHEET_RIBBON_TABS.find(tab => tab.id === "data");
    const tools = dataTab?.groups.find(group => group.labelKey === "sheetRibbon.group.dataTools");
    const found = JSON.stringify(tools?.items || []).includes("sheet.data.consolidate");
    assert(found, "Ribbon nhóm Công cụ dữ liệu phải có Hợp nhất dữ liệu");
    assert(ICONS.consolidate?.includes("<svg"), "Thiếu icon consolidate");
    assert(viStrings.commands["sheet.data.consolidate"]?.label === "Hợp nhất dữ liệu", "Thiếu i18n VI");
    assert(enStrings.commands["sheet.data.consolidate"]?.label === "Consolidate", "Thiếu i18n EN");
    assert(viStrings.sheetDialogs.consolidateTitle === "Hợp nhất dữ liệu", "Thiếu tiêu đề dialog VI");
    assert(enStrings.sheetDialogs.consolidateTitle === "Consolidate", "Thiếu tiêu đề dialog EN");
    assert(VN_TO_UNO_MAP["sheet.data.consolidate"] === ".uno:DataConsolidate", "Thiếu UNO mapping");
    let calls = 0;
    const mock = new Proxy({}, { get(target, key) { if (key in target) return target[key]; return () => { if (key === "showConsolidateDialog") calls++; return true; }; } });
    new SheetAdapter(mock).attach();
    assert(await globalCommandBus.execute("sheet.data.consolidate"), "Command bus không chạy consolidate");
    assert(calls === 1, "Adapter không gọi showConsolidateDialog đúng một lần");
  });

  return results;
}
