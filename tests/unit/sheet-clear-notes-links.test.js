import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

function mockContainer() {
  return {
    setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent() {},
    classList: { add() {}, remove() {}, toggle() {} }, focus() {}
  };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

export async function runSheetClearNotesLinksTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Sheet Xóa ghi chú: chỉ gỡ ghi chú trong vùng chọn, giữ nội dung, hoàn tác/làm lại được", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Một");
    grid.setCellValue("B", 2, "Hai");
    grid.setCellValue("D", 5, "Ngoài vùng");
    grid.saveComment({ coord: "A1", text: "ghi chú 1" });
    grid.saveComment({ coord: "B2", text: "ghi chú 2" });
    grid.saveComment({ coord: "D5", text: "ghi chú ngoài" });
    const removed = grid.clearComments({ start: { c: "A", r: 1 }, end: { c: "C", r: 3 } });
    assert(removed === 2, `Phải xóa 2 ghi chú, thực tế: ${removed}`);
    const comments = grid.commentsBySheet[grid.activeSheet];
    assert(!comments.A1 && !comments.B2, "Ghi chú trong vùng phải mất");
    assert(comments.D5?.text === "ghi chú ngoài", "Ghi chú ngoài vùng phải còn");
    assert(grid.cellsData.get("A1").val === "Một", "Nội dung ô phải giữ nguyên");
    assert(grid.undo(), "Phải hoàn tác được");
    assert(comments.A1?.text === "ghi chú 1" && comments.B2?.text === "ghi chú 2", "Hoàn tác phải trả lại cả hai ghi chú");
    assert(grid.redo(), "Phải làm lại được");
    assert(!grid.commentsBySheet[grid.activeSheet].A1, "Làm lại phải xóa lại");
    assert(grid.clearComments({ start: { c: "A", r: 1 }, end: { c: "C", r: 3 } }) === false, "Vùng không còn ghi chú thì trả false");
  });

  await test("Sheet Xóa siêu liên kết: gỡ liên kết nhưng giữ văn bản, hoàn tác khôi phục liên kết", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Trang chủ");
    grid.setCellValue("A", 2, "Khác");
    grid.cellsData.get("A1").hyperlink = "https://example.com";
    grid.cellsData.get("A2").hyperlink = "https://example.org";
    const removed = grid.clearHyperlinks({ start: { c: "A", r: 1 }, end: { c: "A", r: 1 } });
    assert(removed === 1, `Phải gỡ 1 liên kết, thực tế: ${removed}`);
    assert(!grid.cellsData.get("A1").hyperlink && grid.cellsData.get("A1").val === "Trang chủ", "Liên kết mất, văn bản còn");
    assert(grid.cellsData.get("A2").hyperlink === "https://example.org", "Ô ngoài vùng giữ liên kết");
    assert(grid.undo(), "Phải hoàn tác được");
    assert(grid.cellsData.get("A1").hyperlink === "https://example.com", "Hoàn tác phải khôi phục liên kết");
    assert(grid.clearHyperlinks({ start: { c: "B", r: 1 }, end: { c: "B", r: 2 } }) === false, "Không có liên kết thì trả false");
  });

  return results;
}