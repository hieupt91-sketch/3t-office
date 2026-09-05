import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const container = () => ({
  querySelector() { return null; },
  querySelectorAll() { return []; },
  classList: { add() {}, remove() {}, toggle() {} }
});
const assert = (value, message) => { if (!value) throw new Error(message); };

export async function runSheetGoalSeekTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Goal Seek: A2=50 tìm A1=20 và Undo/Redo là một bước atomic", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 5, false);
    grid.setCellValue("A", 2, "=A1*2+10", false);
    const historyBefore = grid.undoStack.length;
    const result = grid.goalSeek({ setCell: "A2", targetValue: 50, changingCell: "A1" });
    assert(result.success, result.error || "Goal Seek không tìm thấy nghiệm tuyến tính");
    assert(Math.abs(grid.cellsData.get("A1").val - 20) <= 0.001, `A1=${grid.cellsData.get("A1").val}, cần 20`);
    assert(Math.abs(grid.cellsData.get("A2").val - 50) <= 0.001, "A2 chưa đạt mục tiêu 50");
    assert(grid.undoStack.length === historyBefore + 1, "Goal Seek phải tạo đúng một history action");
    assert(grid.undo() && grid.cellsData.get("A1").val === 5, "Undo không khôi phục A1=5");
    assert(grid.redo() && Math.abs(grid.cellsData.get("A1").val - 20) <= 0.001, "Redo không áp lại nghiệm");
  });

  await test("Goal Seek: hỗ trợ phụ thuộc gián tiếp và preview không thay đổi workbook", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 3, false);
    // Insert target before its precedent to prove repeated calculation settles the chain.
    grid.setCellValue("A", 3, "=A2+10", false);
    grid.setCellValue("A", 2, "=A1*2", false);
    const before = grid.cellsData.get("A1").val;
    const result = grid.goalSeek({ setCell: "$A$3", targetValue: 50, changingCell: "$A$1", apply: false });
    assert(result.success && Math.abs(result.value - 20) <= 0.001, "Không tìm được nghiệm qua phụ thuộc gián tiếp");
    assert(grid.cellsData.get("A1").val === before && grid.undoStack.length === 0, "Preview đã làm thay đổi dữ liệu/history");
  });

  await test("Goal Seek: công thức hằng báo lỗi rõ ràng và giữ nguyên input", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 7, false);
    grid.setCellValue("A", 2, "=42", false);
    const result = grid.goalSeek({ setCell: "A2", targetValue: 50, changingCell: "A1" });
    assert(!result.success && result.error === "Goal Seek không tìm được đáp án phù hợp.", `Lỗi không rõ ràng: ${result.error}`);
    assert(grid.cellsData.get("A1").val === 7 && grid.undoStack.length === 0, "Ca không hội tụ đã ghi giá trị bịa/history");
  });

  await test("Goal Seek: từ chối ô đặt không phải công thức và ô đổi là công thức", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 2, false);
    grid.setCellValue("A", 2, 10, false);
    assert(grid.goalSeek({ setCell: "A2", targetValue: 5, changingCell: "A1" }).error.includes("chứa công thức"), "Không chặn ô đặt thường");
    grid.setCellValue("A", 2, "=A1*2", false);
    assert(grid.goalSeek({ setCell: "A2", targetValue: 5, changingCell: "A2" }).error.includes("phải khác nhau"), "Không chặn hai ô trùng nhau");
    grid.setCellValue("B", 1, "=A1+1", false);
    assert(grid.goalSeek({ setCell: "A2", targetValue: 5, changingCell: "B1" }).error.includes("không được chứa công thức"), "Không chặn changing cell là công thức");
  });

  await test("Goal Seek: ribbon và SheetAdapter nối đúng command", async () => {
    const dataTab = SHEET_RIBBON_TABS.find(tab => tab.id === "data");
    const whatIf = dataTab?.groups.flatMap(group => group.items).find(item => item.id === "sheet-what-if-analysis");
    const goalItem = whatIf?.items?.find(item => item.commandId === "sheet.data.goalSeek");
    assert(whatIf?.type === "dropdown" && whatIf.icon === "whatIfAnalysis" && goalItem, "Thiếu Goal Seek trong dropdown What-If trên tab Dữ liệu");
    let calls = 0;
    const mock = new Proxy({}, { get(target, key) { if (key in target) return target[key]; return () => { if (key === "showGoalSeekDialog") calls++; return true; }; } });
    new SheetAdapter(mock).attach();
    assert(await globalCommandBus.execute("sheet.data.goalSeek"), "Command bus không chạy Goal Seek");
    assert(calls === 1, "Adapter không gọi showGoalSeekDialog đúng một lần");
  });

  return results;
}
