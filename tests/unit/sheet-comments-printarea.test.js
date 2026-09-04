import { readFileSync } from "node:fs";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const container = () => ({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });

class FakeCell {
  constructor() { this.classes = new Set(); this.children = []; this.classList = { add: (...names) => names.forEach(name => this.classes.add(name)) }; }
  appendChild(child) { this.children.push(child); }
}

export async function runSheetCommentsPrintAreaTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ className: "", textContent: "", setAttribute() {} }) };
  try {
    const grid = new SheetGridController(container());
    grid._refreshPageAndCommentVisuals = () => {};

    await test("Sheet Comments: thêm ghi chú lưu đúng state và render tam giác/popup DOM", () => {
      const comment = grid.saveComment({ coord: "B2", text: "Cần kiểm tra", author: "Lan", timestamp: "2026-09-04T00:00:00.000Z" });
      const cell = new FakeCell();
      grid._applyAnnotationAndPageVisuals(cell, "B", 2);
      assert(comment.text === "Cần kiểm tra" && grid.commentsBySheet[grid.activeSheet].B2.author === "Lan", "State comment sai");
      assert(cell.classes.has("has-comment"), "Thiếu class tạo tam giác đỏ");
      assert(cell.children[0]?.className === "vno-cell-comment-popup" && cell.children[0].textContent.includes("Cần kiểm tra"), "Thiếu popup nội dung DOM");
    });

    await test("Sheet Comments: sửa/xóa có undo-redo và marker biến mất", () => {
      grid.saveComment({ coord: "B2", text: "Đã sửa", author: "Lan" });
      grid.undo(); assert(grid.commentsBySheet[grid.activeSheet].B2.text === "Cần kiểm tra", "Undo sửa comment sai");
      grid.redo(); assert(grid.commentsBySheet[grid.activeSheet].B2.text === "Đã sửa", "Redo sửa comment sai");
      grid.deleteComment({ coord: "B2" });
      const deletedCell = new FakeCell(); grid._applyAnnotationAndPageVisuals(deletedCell, "B", 2);
      assert(!grid.commentsBySheet[grid.activeSheet].B2 && !deletedCell.classes.has("has-comment"), "Xóa không bỏ marker");
      grid.undo(); assert(grid.commentsBySheet[grid.activeSheet].B2.text === "Đã sửa", "Undo xóa comment sai");
    });

    await test("Sheet Comments: state cô lập theo sheet", () => {
      const first = grid.activeSheet;
      grid.switchSheet("Kế hoạch Q3"); grid._refreshPageAndCommentVisuals = () => {};
      assert(!grid.commentsBySheet[grid.activeSheet].B2, "Comment rò sang sheet 2");
      grid.saveComment({ coord: "B2", text: "Riêng sheet 2" });
      grid.switchSheet(first); grid._refreshPageAndCommentVisuals = () => {};
      assert(grid.commentsBySheet[first].B2.text === "Đã sửa", "Comment sheet 1 bị thay thế");
    });

    await test("Sheet Comments: FODS dùng office:annotation chuẩn và nạp lại đủ metadata", () => {
      const first = grid.activeSheet;
      grid.commentsBySheet[first].C3 = { coord: "C3", text: "Ô trống vẫn có ghi chú", author: "Lan", timestamp: "2026-09-04T08:30:00.000Z" };
      const adapter = new SheetAdapter(grid);
      const xml = adapter.serializeToFods();
      assert(xml.includes("<office:annotation>") && xml.includes("<dc:creator>Lan</dc:creator>"), "Thiếu annotation ODF chuẩn");
      const parsed = adapter.parseFods(xml);
      assert(parsed.commentsBySheet[first].C3.text === "Ô trống vẫn có ghi chú", "Không đọc lại comment ô trống");
      assert(parsed.commentsBySheet[first].C3.timestamp === "2026-09-04T08:30:00.000Z", "Không đọc lại timestamp");
    });

    await test("Print Area: viền đúng bốn cạnh, clear và undo-redo", () => {
      grid.selectionRange = { start: { c: "B", r: 2 }, end: { c: "D", r: 4 } };
      assert(grid.setPrintArea() === "B2:D4", "Không lưu B2:D4");
      const topLeft = new FakeCell(); grid._applyAnnotationAndPageVisuals(topLeft, "B", 2);
      const bottomRight = new FakeCell(); grid._applyAnnotationAndPageVisuals(bottomRight, "D", 4);
      assert(topLeft.classes.has("is-print-area-top") && topLeft.classes.has("is-print-area-left"), "Sai viền trên/trái");
      assert(bottomRight.classes.has("is-print-area-bottom") && bottomRight.classes.has("is-print-area-right"), "Sai viền dưới/phải");
      grid.clearPrintArea(); assert(grid.printAreaBySheet[grid.activeSheet] === null, "Clear thất bại");
      grid.undo(); assert(grid.printAreaBySheet[grid.activeSheet] === "B2:D4", "Undo clear sai");
      grid.redo(); assert(grid.printAreaBySheet[grid.activeSheet] === null, "Redo clear sai");
    });

    await test("Page Breaks: đường hàng/cột đúng vị trí và insert/remove undo-redo", () => {
      grid.selectedCoord = { c: "C", r: 5 };
      grid.insertPageBreak();
      const cell = new FakeCell(); grid._applyAnnotationAndPageVisuals(cell, "C", 5);
      assert(cell.classes.has("has-page-break-row") && cell.classes.has("has-page-break-col"), "Thiếu đường ngắt DOM");
      grid.removePageBreak(); assert(grid.pageBreaksBySheet[grid.activeSheet].rows.length === 0, "Remove break thất bại");
      grid.undo(); assert(grid.pageBreaksBySheet[grid.activeSheet].rows.includes(5), "Undo remove break sai");
      grid.redo(); assert(!grid.pageBreaksBySheet[grid.activeSheet].rows.includes(5), "Redo remove break sai");
    });

    await test("Print Area/Page Breaks cô lập theo sheet và snapshot xóa sheet", () => {
      grid.setPrintArea({ range: "A1:A3" }); grid.insertPageBreak({ row: 3, col: "A" });
      const first = grid.activeSheet;
      grid.switchSheet("Nhân sự"); grid._refreshPageAndCommentVisuals = () => {};
      assert(grid.printAreaBySheet[grid.activeSheet] === null && grid.pageBreaksBySheet[grid.activeSheet].rows.length === 0, "Metadata rò sheet");
      grid.switchSheet(first); grid.deleteSheet(first); grid.undo(); grid._refreshPageAndCommentVisuals = () => {};
      assert(grid.printAreaBySheet[first] === "A1:A3" && grid.pageBreaksBySheet[first].rows.includes(3), "Snapshot không phục hồi metadata");
    });

    await test("Commands có mapping, ribbon và SVG thật; handler chịu args=null", async () => {
      const ids = ["sheet.review.commentInsert", "sheet.page.setPrintArea", "sheet.page.clearPrintArea", "sheet.page.insertPageBreak", "sheet.page.removePageBreak"];
      ids.forEach(id => assert(SHEET_COMMANDS.some(command => command.id === id) && VN_TO_UNO_MAP[id], `Thiếu command/mapping ${id}`));
      assert(SHEET_RIBBON_TABS.find(tab => tab.id === "review") && SHEET_RIBBON_TABS.find(tab => tab.id === "pageLayout"), "Thiếu tab ribbon");
      ["cellComment", "printArea", "clearPrintArea", "sheetPageBreak", "removePageBreak"].forEach(icon => assert(ICONS[icon]?.includes("<svg") && !ICONS[icon].includes("<circle"), `Icon ${icon} không đạt`));
      const calls = [];
      const adapter = new SheetAdapter({ showCommentDialog: value => calls.push(value), setPrintArea: value => calls.push(value), clearPrintArea() {}, insertPageBreak() {}, removePageBreak() {} });
      adapter.attach();
      await globalCommandBus.execute("sheet.review.commentInsert");
      await globalCommandBus.execute("sheet.page.setPrintArea");
      assert(calls.length === 2 && calls.every(value => value && typeof value === "object"), "Handler không chuẩn hóa args=null");
    });

    await test("CSS chứa marker đỏ, popup hover, viền vùng in và ngắt trang thật", () => {
      const css = readFileSync(new URL("../../apps/sheet/sheet.css", import.meta.url), "utf8");
      ["has-comment::after", "has-comment:hover", "is-print-area-top", "is-print-area-bottom", "has-page-break-row", "has-page-break-col"].forEach(token => assert(css.includes(token), `Thiếu CSS ${token}`));
    });
    await test("Print Area: FODS round-trip dùng table:print-ranges chuẩn", () => {
      const first = grid.activeSheet;
      grid.printAreaBySheet[first] = "B2:F20";
      const adapter = new SheetAdapter(grid);
      const xml = adapter.serializeToFods();
      assert(xml.includes("table:print-ranges="), "Thiếu table:print-ranges ODF chuẩn");
      const parsed = adapter.parseFods(xml);
      assert(parsed.printAreaBySheet[first] === "B2:F20", "Không đọc lại Print Area từ FODS");

      const loaded = new SheetGridController(container());
      loaded._refreshPageAndCommentVisuals = () => {};
      assert(new SheetAdapter(loaded).loadFromFods(xml), "loadFromFods thất bại");
      assert(loaded.printAreaBySheet[first] === "B2:F20", "loadFromFods không khôi phục Print Area");
    });
  } finally { globalThis.document = originalDocument; }
  return results;
}
