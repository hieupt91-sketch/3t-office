import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";

const container = () => ({ querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } });
const assert = (value, message) => { if (!value) throw new Error(message); };
const put = (grid, coord, val) => grid.cellsData.set(coord, { val, formula: "", style: {} });

export async function runSheetDataToolsTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Data commands: có mapping thật và globalCommandBus.execute gọi đúng Sheet handler", async () => {
    const ids = ["textToColumns", "flashFill", "removeDuplicates", "group", "ungroup", "subtotal"].map(name => `sheet.data.${name}`);
    ids.forEach(id => assert(VN_TO_UNO_MAP[id], `Thiếu mapper cho ${id}`));
    registerAllStandardCommands(globalCommandBus);
    const calls = [];
    const mock = new Proxy({ selectedCoord: { c: "A" } }, { get(target, key) { if (key in target) return target[key]; return (...args) => { calls.push([key, args]); return true; }; } });
    new SheetAdapter(mock).attach();
    for (const id of ids) assert(await globalCommandBus.execute(id) !== false, `execute(${id}) thất bại`);
    assert(calls.length >= ids.length, "Command bus chưa đi tới grid handler");
  });

  await test("Remove Duplicates: xét cột chọn, giữ header và Undo/Redo", () => {
    const grid = new SheetGridController(container());
    [["A1","Name"],["B1","Amount"],["A2","An"],["B2",10],["A3","An"],["B3",10],["A4","An"],["B4",20]].forEach(([c,v]) => put(grid,c,v));
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 4 } };
    const result = grid.removeDuplicates({ columns: ["A","B"], hasHeader: true });
    assert(result.removed === 1 && grid.cellsData.get("B3").val === 20, "Xóa duplicate sai");
    assert(grid.undo() && grid.cellsData.get("B4").val === 20, "Undo sai");
    assert(grid.redo() && grid.cellsData.get("B3").val === 20, "Redo sai");
  });

  await test("Subtotal: SUM theo điểm đổi nhóm và Grand Total", () => {
    const grid = new SheetGridController(container());
    [["A1","Team"],["B1","Amount"],["A2","A"],["B2",10],["A3","A"],["B3",20],["A4","B"],["B4",5]].forEach(([c,v]) => put(grid,c,v));
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 4 } };
    const result = grid.createSubtotal({ groupColumn: "A", valueColumns: ["B"], operation: "SUM" });
    assert(result.groups === 2 && grid.cellsData.get("A4").val === "A Total", "Thiếu subtotal nhóm A");
    assert(grid.cellsData.get(`A${result.grandTotalRow}`).val === "Grand Total", "Thiếu grand total");
    assert(grid.undo() && grid.cellsData.get("A4").val === "B", "Undo subtotal sai");
  });

  await test("Text to Columns: delimiter và fixed width", () => {
    const grid = new SheetGridController(container()); put(grid, "A1", "Nguyen,Van,An");
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    assert(grid.applyTextToColumns({ delimiter: "," }).columns === 3 && grid.cellsData.get("C1").val === "An", "Delimiter sai");
    grid.undo(); put(grid, "A1", "ABCDE123");
    assert(grid.applyTextToColumns({ mode: "fixed", widths: [5] }).columns === 2 && grid.cellsData.get("B1").val === "123", "Fixed width sai");
  });

  await test("Flash Fill: nối hai cột và cắt N ký tự", () => {
    const grid = new SheetGridController(container());
    [["A1","An"],["B1","Nguyen"],["C1","An Nguyen"],["A2","Binh"],["B2","Tran"]].forEach(([c,v]) => put(grid,c,v));
    grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 2 } };
    assert(grid.applyFlashFill().pattern === "join: " && grid.cellsData.get("C2").val === "Binh Tran", "Nối chuỗi sai");
    put(grid,"D1","ABC123"); put(grid,"E1","ABC"); put(grid,"D2","XYZ999");
    grid.selectionRange = { start: { c: "E", r: 1 }, end: { c: "E", r: 2 } };
    assert(grid.applyFlashFill().pattern === "first:3" && grid.cellsData.get("E2").val === "XYZ", "Cắt đầu sai");
  });

  await test("Custom Sort command: có mapping UNO thật và dispatch mở đúng dialog trên grid", async () => {
    assert(VN_TO_UNO_MAP["sheet.data.customSort"], "Thiếu mapper cho sheet.data.customSort");
    registerAllStandardCommands(globalCommandBus);
    const calls = [];
    const mock = new Proxy({ selectedCoord: { c: "A" } }, { get(target, key) { if (key in target) return target[key]; return (...args) => { calls.push(key); return true; }; } });
    new SheetAdapter(mock).attach();
    assert(await globalCommandBus.execute("sheet.data.customSort") !== false, "execute(sheet.data.customSort) thất bại");
    assert(calls.includes("showCustomSortDialog"), "Dispatch không gọi tới grid.showCustomSortDialog");
  });

  await test("Custom Sort: sắp theo nhiều cấp (Team A-Z, rồi Amount Z-A), giữ header, Undo/Redo", () => {
    const grid = new SheetGridController(container());
    [
      ["A1","Team"],["B1","Amount"],
      ["A2","B"],["B2",5],
      ["A3","A"],["B3",10],
      ["A4","A"],["B4",20],
      ["A5","B"],["B5",1]
    ].forEach(([c,v]) => put(grid,c,v));
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 5 } };
    const result = grid.sortMultiLevel({ hasHeader: true, levels: [{ col: "A", ascending: true }, { col: "B", ascending: false }] });
    assert(result && result.sorted === 4, "Phải báo đã sắp 4 hàng dữ liệu");
    assert(grid.cellsData.get("A1").val === "Team", "Header không được động vào khi hasHeader=true");
    const teamOrder = [2,3,4,5].map(r => grid.cellsData.get(`A${r}`).val).join(",");
    const amountOrder = [2,3,4,5].map(r => grid.cellsData.get(`B${r}`).val).join(",");
    assert(teamOrder === "A,A,B,B", `Cấp 1 (Team A-Z) sai thứ tự: ${teamOrder}`);
    assert(amountOrder === "20,10,5,1", `Cấp 2 (Amount Z-A trong từng nhóm Team) sai thứ tự: ${amountOrder}`);
    assert(grid.undo() && grid.cellsData.get("A2").val === "B" && grid.cellsData.get("B2").val === 5, "Undo phải khôi phục đúng thứ tự gốc");
    assert(grid.redo() && grid.cellsData.get("A2").val === "A" && grid.cellsData.get("B2").val === 20, "Redo phải áp lại đúng kết quả sắp xếp");
  });

  await test("Custom Sort: hasHeader=false sắp cả hàng đầu; cấp trỏ tới cột ngoài vùng bị bỏ qua chứ không ném lỗi", () => {
    const grid = new SheetGridController(container());
    [["A1","B"],["A2","A"],["A3","C"]].forEach(([c,v]) => put(grid,c,v));
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 3 } };
    const result = grid.sortMultiLevel({ hasHeader: false, levels: [{ col: "Z", ascending: true }, { col: "A", ascending: true }] });
    assert(result && result.sorted === 3, "Phải sắp cả 3 hàng khi không có header");
    const order = [1,2,3].map(r => grid.cellsData.get(`A${r}`).val).join(",");
    assert(order === "A,B,C", `Cấp hợp lệ duy nhất (cột A) phải quyết định thứ tự: ${order}`);
  });

  await test("Custom Sort: không có cấp hợp lệ nào (mọi cột đều ngoài vùng) thì trả về false, không sửa gì", () => {
    const grid = new SheetGridController(container());
    [["A1","B"],["A2","A"]].forEach(([c,v]) => put(grid,c,v));
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } };
    assert(grid.sortMultiLevel({ hasHeader: false, levels: [{ col: "Z", ascending: true }] }) === false, "Không có cấp nào trỏ tới cột trong vùng thì phải false");
  });

  await test("Custom Sort: một hàng dữ liệu (không header) là no-op an toàn, không báo lỗi và không đổi dữ liệu", () => {
    const grid = new SheetGridController(container());
    put(grid, "A1", "Chỉ một hàng");
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    const result = grid.sortMultiLevel({ hasHeader: false, levels: [{ col: "A", ascending: true }] });
    assert(result && result.sorted === 0, "Một hàng thì không có gì đổi thứ tự, nhưng vẫn phải là no-op hợp lệ chứ không phải lỗi");
    assert(grid.cellsData.get("A1").val === "Chỉ một hàng", "Dữ liệu không được thay đổi");
  });

  await test("Outline: Group/Ungroup hàng và collapse state", () => {
    const grid = new SheetGridController(container());
    grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "Z", r: 5 } };
    assert(grid.groupSelection(), "Group thất bại");
    const group = grid._outlineGroups()[0]; assert(grid.toggleOutlineGroup(group.id) && grid._isOutlineRowHidden(3), "Collapse thất bại");
    assert(grid.ungroupSelection() && !grid._outlineGroups().length, "Ungroup thất bại");
  });
  return results;
}
