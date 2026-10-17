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

  await test("Tạo từ vùng chọn: một ô hiện thông báo cụ thể thay vì thất bại im lặng", () => {
    const grid = new SheetGridController(container());
    const messages = [];
    grid._showDataNotice = message => messages.push(message);
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    grid.selectedCoord = { c: "A", r: 1 };
    assert(grid.createNamesFromSelection() === false, "Vùng một ô không tạo tên");
    assert(messages.length === 1 && messages[0].includes("ít nhất hai hàng") && messages[0].includes("tiêu đề"), `Thiếu thông báo tiếng Việt rõ ràng: ${messages}`);
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

  await test("Sort A-Z/Z-A: ô trống luôn xuống cuối với số, chữ Việt, ngày serial và dữ liệu hỗn hợp", () => {
    const sortedValues = (values, ascending) => {
      const grid = new SheetGridController(container());
      put(grid, "A1", "Giá trị");
      // Excel đoán hàng đầu là tiêu đề khi nó được định dạng khác dữ liệu (ở đây: chữ đậm).
      grid.cellsData.get("A1").style = { fontWeight: "bold" };
      values.forEach((value, index) => {
        put(grid, `A${index + 2}`, value);
        put(grid, `B${index + 2}`, `hàng-${index + 1}`);
      });
      grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: values.length + 1 } };
      assert(grid.sort("A", ascending), "Sort phải chạy trên vùng đã chọn");
      return Array.from({ length: values.length }, (_, index) => grid.cellsData.get(`A${index + 2}`)?.val ?? "");
    };
    const numeric = sortedValues([10, 2, "", 1], true);
    assert(numeric.join("|") === "1|2|10|", `Sort số tăng dần sai hoặc ô trống không cuối: ${numeric}`);
    const vietnamese = sortedValues(["Ổi", "Áo", "", "Đào"], true);
    assert(vietnamese.at(-1) === "" && vietnamese.slice(0, -1).join("|") === ["Ổi", "Áo", "Đào"].sort((a, b) => a.localeCompare(b, "vi-VN")).join("|"), `Sort chữ Việt sai: ${vietnamese}`);
    const dates = sortedValues([44500, 44100, "", 44200], true);
    assert(dates.join("|") === "44100|44200|44500|", `Sort ngày dạng serial sai: ${dates}`);
    const mixedDescending = sortedValues([8, "Táo", "", 3], false);
    assert(mixedDescending.at(-1) === "" && mixedDescending.length === 4, `Sort hỗn hợp giảm dần phải để ô trống cuối: ${mixedDescending}`);
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
  await test("Data validation: reject invalid user commits and preserve the previous cell value", () => {
    const grid = new SheetGridController(container());
    const cell = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    grid.addDataValidation(cell, { type: "list", values: ["Red", "Green"] });
    grid.setCellValue("A", 1, "Red", false);
    const historyLength = grid.undoStack.length;
    grid.setCellValue("A", 1, "Yellow", false); // in-cell edit preview before Enter
    assert(!grid._validateDataValidationCommit("A", 1, "Yellow", "Red"), "Invalid list value must be rejected");
    assert(grid.cellsData.get("A1").val === "Red", "Rejected edit must restore the prior valid value");
    assert(grid.undoStack.length === historyLength, "Rejected edit must not create Undo history");
    assert(grid._validateDataValidationCommit("A", 1, "Green", "Red"), "Valid list value must be accepted");
  });

  await test("AutoFilter: show arrows only for selected range and infer used range from one selected cell", () => {
    const makeButtons = () => ["A", "B", "C", "D", "E"].map(col => ({
      dataset: { col }, style: {}, classList: { add() {}, remove() {} }
    }));
    const selectedRangeButtons = makeButtons();
    const selectedRangeHost = container();
    selectedRangeHost.querySelectorAll = selector => selector === ".vno-filter-btn" ? selectedRangeButtons : [];
    const selectedRangeGrid = new SheetGridController(selectedRangeHost);
    [["A1", "Name"], ["B1", "Amount"], ["A2", "An"], ["B2", 10]].forEach(([coord, value]) => put(selectedRangeGrid, coord, value));
    selectedRangeGrid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } };
    selectedRangeGrid.toggleFilter();
    assert(selectedRangeGrid.sheetStates[selectedRangeGrid.activeSheet].filterRange === "A1:B2", "Explicit filter selection must be retained");
    assert(selectedRangeButtons.map(button => button.style.display).join(",") === "inline-flex,inline-flex,none,none,none", "Only selected filter columns may show arrows");

    const usedRangeButtons = makeButtons();
    const usedRangeHost = container();
    usedRangeHost.querySelectorAll = selector => selector === ".vno-filter-btn" ? usedRangeButtons : [];
    const usedRangeGrid = new SheetGridController(usedRangeHost);
    [["A1", "Name"], ["B1", "Amount"], ["D4", 12]].forEach(([coord, value]) => put(usedRangeGrid, coord, value));
    usedRangeGrid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    usedRangeGrid.toggleFilter();
    assert(usedRangeGrid.sheetStates[usedRangeGrid.activeSheet].filterRange === "A1:D4", "Single-cell AutoFilter must infer the used range");
    assert(usedRangeButtons.map(button => button.style.display).join(",") === "inline-flex,inline-flex,inline-flex,inline-flex,none", "Inferred range arrows must stop at the used last column");
  });

  await test("Consolidate: Hợp nhất theo vị trí và theo nhãn (Top row, Left column)", () => {
    const grid = new SheetGridController(container());
    [["A1", 10], ["B1", 20], ["A2", 30], ["B2", 40], ["D1", 1], ["E1", 2], ["D2", 3], ["E2", 4]].forEach(([c, v]) => put(grid, c, v));
    const posRes = grid.applyConsolidate({ references: ["Sheet1!A1:B2", "Sheet1!D1:E2"], functionName: "SUM", destination: { c: "G", r: 1 } });
    assert(posRes.ok && grid.cellsData.get("G1").val === 11 && grid.cellsData.get("H2").val === 44, "Consolidate theo vị trí sai");

    [["A4", ""], ["B4", "Q1"], ["A5", "Apples"], ["B5", 10], ["D4", ""], ["E4", "Q1"], ["D5", "Apples"], ["E5", 5]].forEach(([c, v]) => put(grid, c, v));
    const lblRes = grid.applyConsolidate({ references: ["Sheet1!A4:B5", "Sheet1!D4:E5"], functionName: "SUM", destination: { c: "G", r: 4 }, topRow: true, leftColumn: true });
    assert(lblRes.ok && grid.cellsData.get("G4")?.val === "" && grid.cellsData.get("H4")?.val === "Q1" && grid.cellsData.get("G5")?.val === "Apples" && grid.cellsData.get("H5")?.val === 15, "Consolidate theo nhãn sai");
  });

  await test("Goal Seek & Data Table: giải phương trình và tính bảng độ nhạy", () => {
    const grid = new SheetGridController(container());
    put(grid, "B1", 10); put(grid, "B2", 2);
    grid.cellsData.set("B3", { val: 25, formula: "=B1*B2+5", style: {} });
    const gs = grid.goalSeek({ setCell: "B3", targetValue: 25, changingCell: "B1" });
    assert(gs.success && Math.abs(grid.cellsData.get("B1").val - 10) < 0.01, "Goal Seek giải sai nghiệm bậc 1");

    grid.cellsData.set("A5", { val: 25, formula: "=B3", style: {} }); put(grid, "B5", 2); put(grid, "C5", 3);
    put(grid, "A6", 10); put(grid, "A7", 20);
    grid.calculateDataTable({ range: { start: { c: "A", r: 5 }, end: { c: "C", r: 7 } }, rowInputCell: "B2", columnInputCell: "B1" }, false);
    assert(grid.cellsData.get("B6").val === 25 && grid.cellsData.get("C7").val === 65, "Data table 2 biến tính sai");
  });

  await test("Scenario Manager: thêm và hiển thị kịch bản vào bảng tính", () => {
    const grid = new SheetGridController(container());
    put(grid, "B1", 10); put(grid, "B2", 20);
    grid.cellsData.set("B3", { val: 30, formula: "=B1+B2", style: {} });
    grid.saveScenario({ name: "High", changingCells: ["B1", "B2"], values: [50, 60] });
    assert(grid.getScenarios().length === 1, "Thêm kịch bản thất bại");
    grid.applyScenario("High");
    assert(grid.cellsData.get("B1").val === 50 && grid.cellsData.get("B2").val === 60 && grid.cellsData.get("B3").val === 110, "Hiển thị kịch bản thất bại");
  });

  await test("Clear: Clear All, Clear Contents, Clear Formats", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("A1", { val: 100, formula: "", style: { fontWeight: "bold" } });
    grid.clearFormats({ start: { c: "A", r: 1 }, end: { c: "A", r: 1 } }, false);
    assert(grid.cellsData.get("A1").val === 100 && !grid.cellsData.get("A1").style.fontWeight, "Clear Formats phải giữ giá trị");

    grid.cellsData.set("A2", { val: 200, formula: "", style: { fontWeight: "bold" } });
    grid.clearContents({ start: { c: "A", r: 2 }, end: { c: "A", r: 2 } }, false);
    assert(grid.cellsData.get("A2").val === "" && grid.cellsData.get("A2").style.fontWeight === "bold", "Clear Contents phải giữ định dạng");

    grid.clearAll({ start: { c: "A", r: 2 }, end: { c: "A", r: 2 } }, false);
    assert(grid.cellsData.get("A2").val === "" && !grid.cellsData.get("A2").style.fontWeight, "Clear All phải xóa cả hai");
  });

  await test("Merge Cells: Merge Across theo từng hàng ngang và Unmerge", async () => {
    const grid = new SheetGridController(container());
    put(grid, "A1", "H1"); put(grid, "B1", "X");
    put(grid, "A2", "H2"); put(grid, "B2", "Y");
    await grid.mergeCells("mergeAcross", { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }, { confirmDataLoss: false });
    assert(grid.getMergedRanges().length === 2, "Merge Across phải tạo 2 dải ô gộp riêng biệt");
    assert(grid.cellsData.get("A1").val === "H1" && !grid.cellsData.has("B1"), "Ô B1 phải được dọn sau gộp hàng 1");
    assert(grid.cellsData.get("A2").val === "H2" && !grid.cellsData.has("B2"), "Ô B2 phải được dọn sau gộp hàng 2");

    grid.unmergeCells({ start: { c: "A", r: 1 }, end: { c: "B", r: 2 } });
    assert(grid.getMergedRanges().length === 0, "Unmerge phải gỡ bỏ cả 2 vùng gộp");
  });

  await test("Outline: groupRows, groupCols và showOutlineLevels", () => {
    const grid = new SheetGridController(container());
    assert(grid.groupRows(2, 4), "groupRows thất bại");
    assert(grid.groupCols("B", "D"), "groupCols thất bại");
    grid.showOutlineLevels(1, null);
    assert(grid._isOutlineRowHidden(2) && grid._isOutlineRowHidden(3) && grid._isOutlineRowHidden(4), "showOutlineLevels(1) phải ẩn các hàng đã nhóm");
    grid.showOutlineLevels(2, null);
    assert(!grid._isOutlineRowHidden(2), "showOutlineLevels(2) phải mở lại các hàng đã nhóm");
    assert(grid.ungroupRows(2, 4), "ungroupRows thất bại");
  });

  return results;
}
