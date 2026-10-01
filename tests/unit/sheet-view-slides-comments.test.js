import { readFileSync } from "node:fs";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { createSlidesCanvasFixture } from "./slides-test-fixtures.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Classes {
  constructor() { this.values = new Set(); }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  toggle(name, force) { force ? this.values.add(name) : this.values.delete(name); }
  contains(name) { return this.values.has(name); }
}

function sheetGrid() {
  const grid = new SheetGridController({ classList: new Classes(), querySelector: () => null, querySelectorAll: () => [] });
  grid.table = { style: {}, dataset: {} };
  return grid;
}

function slidesCanvas() {
  const canvas = createSlidesCanvasFixture({});
  canvas.titleEl = { innerText: "", style: {}, classList: { add() {}, remove() {} } };
  canvas.bodyEl = { innerText: "", style: {} };
  canvas.body2El = { innerText: "", style: {} };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas._renderShapesLayer = () => {};
  canvas._renderThumbnails = () => {};
  canvas._renderSlideSorterGrid = () => {};
  canvas._renderCommentsUi = () => {};
  return canvas;
}

export async function runSheetViewSlidesCommentsTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Sheet View: ribbon, mapping và SVG riêng đầy đủ; Freeze Panes chỉ còn ở tab View", () => {
    const view = SHEET_RIBBON_TABS.find(tab => tab.id === "view");
    const ids = ["sheet.view.zoomIn", "sheet.view.zoomOut", "sheet.view.zoomReset", "sheet.view.gridlines", "sheet.view.headings", "sheet.view.freezePanes"];
    // sheet.view.freezePanes giờ nằm trong dropdown "Cố định ô" (cùng
    // freezeTopRow/freezeFirstColumn, đúng bố cục thật của Excel) nên phải
    // đệ quy vào items lồng bên trong dropdown, không chỉ lấy commandId trực
    // tiếp trên item cấp 1.
    const collectCommandIds = (items) => (items || []).flatMap(item => [item.commandId, ...collectCommandIds(item.items)].filter(Boolean));
    const flattened = view?.groups.flatMap(group => collectCommandIds(group.items)) || [];
    ids.forEach(id => assert(flattened.includes(id), `Thiếu ${id} trong View`));
    assert(SHEET_RIBBON_TABS.filter(tab => tab.id !== "view").every(tab => !JSON.stringify(tab).includes("sheet.view.freezePanes")), "Freeze Panes còn ở tab khác");
    ids.slice(0, 5).forEach(id => assert(SHEET_COMMANDS.some(command => command.id === id) && VN_TO_UNO_MAP[id], `Thiếu command/mapping ${id}`));
    ["zoomIn", "zoomOut", "zoomReset", "gridlines", "headings"].forEach(icon => assert(ICONS[icon]?.includes("<svg"), `Thiếu SVG ${icon}`));
  });

  await test("Sheet Zoom In/Out/Reset thay đổi transform scale CSS thật", () => {
    const grid = sheetGrid();
    grid.zoomIn(); assert(grid.zoomLevel === 1.1 && grid.table.style.transform === "scale(1.1)", "Zoom In không tăng scale");
    grid.zoomOut(); assert(grid.zoomLevel === 1 && grid.table.style.transform === "scale(1)", "Zoom Out không giảm scale");
    grid.setZoom(1.6); grid.zoomReset(); assert(grid.zoomLevel === 1 && grid.table.dataset.zoom === "1", "Reset không về 100%");
  });

  await test("Sheet Gridlines/Headings toggle class DOM và state mặc định hiện", () => {
    const grid = sheetGrid();
    assert(grid.gridlinesVisible && grid.headingsVisible, "View mặc định phải hiển thị");
    grid.toggleGridlines(); assert(grid.container.classList.contains("vno-hide-gridlines"), "Không ẩn viền ô trong DOM");
    grid.toggleHeadings(); assert(grid.container.classList.contains("vno-hide-headings"), "Không ẩn headings trong DOM");
    const css = readFileSync(new URL("../../apps/sheet/sheet.css", import.meta.url), "utf8");
    assert(css.includes("border-right-color: transparent") && css.includes(".vno-hide-headings .vno-grid-table thead"), "Thiếu CSS ẩn thật");
  });

  await test("Sheet handler chịu args=null và gọi đúng view methods", async () => {
    const calls = [];
    const adapter = new SheetAdapter({ zoomIn: () => calls.push("in"), zoomOut: () => calls.push("out"), zoomReset: () => calls.push("reset"), toggleGridlines: () => calls.push("grid"), toggleHeadings: () => calls.push("head"), undo() {}, redo() {} });
    adapter.attach();
    for (const id of ["sheet.view.zoomIn", "sheet.view.zoomOut", "sheet.view.zoomReset", "sheet.view.gridlines", "sheet.view.headings"]) await globalCommandBus.execute(id);
    assert(calls.join(",") === "in,out,reset,grid,head", "Handler command View không hoạt động với args=null");
  });

  await test("Slides Comments cô lập từng slide, xóa và Undo/Redo đối xứng", () => {
    const canvas = slidesCanvas();
    const added = canvas.addComment("Cần sửa tiêu đề", "Lan");
    assert(added && canvas.slides[0].comments.length === 1, "Không thêm comment vào slide hiện tại");
    canvas.selectSlide(1); assert((canvas.slides[1].comments || []).length === 0, "Comment rò sang slide khác");
    canvas.selectSlide(0); canvas.deleteComment(added.id); assert(canvas.slides[0].comments.length === 0, "Xóa comment thất bại");
    canvas.undo(); assert(canvas.slides[0].comments.length === 1, "Undo xóa không phục hồi");
    canvas.redo(); assert(canvas.slides[0].comments.length === 0, "Redo xóa không loại lại");
    canvas.undo(); canvas.undo(); assert(canvas.slides[0].comments.length === 0, "Undo thêm không loại comment");
    canvas.redo(); assert(canvas.slides[0].comments.length === 1, "Redo thêm không phục hồi comment");
  });

  await test("Slides Review command, icon, UNO mapping, panel và sorter badge có thật", async () => {
    const id = "slides.review.commentInsert";
    assert(SLIDES_COMMANDS.some(command => command.id === id) && VN_TO_UNO_MAP[id] === ".uno:InsertAnnotation", "Thiếu command/mapping comment");
    assert(ICONS.comment?.includes("<svg") && SLIDES_RIBBON_TABS.find(tab => tab.id === "review"), "Thiếu icon/tab Review");
    const source = readFileSync(new URL("../../apps/slides/slides-canvas.js", import.meta.url), "utf8");
    assert(source.includes("vno-slide-sorter-comments") && source.includes("vno-slide-comment-indicator"), "Thiếu badge sorter hoặc indicator canvas");
    let opened = false;
    const adapter = new SlidesAdapter({ openCommentsPanel: value => { opened = value; return true; }, undo() {}, redo() {} });
    adapter.attach(); await globalCommandBus.execute(id);
    assert(opened === true, "Handler args=null không mở panel và focus input");
  });

  await test("Comment không được render vào slideshow toàn màn hình", () => {
    const source = readFileSync(new URL("../../apps/slides/slides-canvas.js", import.meta.url), "utf8");
    const slideshow = source.slice(source.indexOf("startSlideShow("), source.indexOf("startPresenterMode("));
    assert(!slideshow.includes("vno-slide-comment-indicator") && !slideshow.includes("vno-slide-comments-panel"), "Comment bị đưa vào slideshow");
  });

  await test("Slides Comments navigation resolves, deletes and uses existing history", () => {
    const canvas = slidesCanvas(); canvas.openCommentsPanel = () => true;
    const one = canvas.addComment("One", "Lan"); canvas.selectSlide(1); const two = canvas.addComment("Two", "Lan");
    canvas.activeCommentId = one.id;
    assert(canvas.nextComment().id === two.id, "Next order"); assert(canvas.previousComment().id === one.id, "Previous order");
    assert(canvas.toggleActiveCommentResolved() && canvas.slides[0].comments[0].resolved, "Resolve must retain comment");
    canvas.undo(); assert(!canvas.slides[0].comments[0].resolved, "Undo resolve"); canvas.redo(); assert(canvas.slides[0].comments[0].resolved, "Redo resolve");
    assert(canvas.deleteActiveComment() && !canvas.slides[0].comments.length, "Delete"); canvas.undo(); assert(canvas.slides[0].comments.length === 1, "Undo delete");
  });
  return results;
}
