/**
 * Test Suite: VN Sheet & VN Slides View Tabs (Chế độ xem hoàn chỉnh chuẩn Excel & PowerPoint)
 */

import { readFileSync } from "node:fs";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Classes {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(n => this.values.add(n)); }
  remove(...names) { names.forEach(n => this.values.delete(n)); }
  toggle(name, force) {
    if (force !== undefined) {
      force ? this.values.add(name) : this.values.delete(name);
    } else {
      this.values.has(name) ? this.values.delete(name) : this.values.add(name);
    }
  }
  contains(name) { return this.values.has(name); }
}

function createMockSheetGrid() {
  const container = {
    classList: new Classes(),
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const viewport = {
    clientWidth: 1000,
    clientHeight: 700,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    insertBefore: () => {}
  };
  const grid = new SheetGridController(container);
  grid.viewport = viewport;
  grid.table = { style: {}, dataset: {} };
  grid.formulaBarEl = { style: {} };
  grid._refreshPageAndCommentVisuals = () => {};
  return grid;
}

function createMockSlidesCanvas() {
  const container = {
    classList: new Classes(),
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const canvas = new SlidesCanvasController(container);
  canvas.titleEl = { innerText: "", style: {}, classList: new Classes() };
  canvas.bodyEl = { innerText: "", style: {} };
  canvas.body2El = { innerText: "", style: {} };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = {
    style: {},
    dataset: {},
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 960, height: 540 })
  };
  canvas.stageEl = { clientWidth: 1200, clientHeight: 800 };
  canvas.workspaceEl = { style: {} };
  canvas.rulerCornerEl = { style: {} };
  canvas.rulerHEl = { innerHTML: "", style: {} };
  canvas.rulerVEl = { innerHTML: "", style: {} };
  canvas.gridlinesLayer = { style: {} };
  canvas.guidesLayer = {
    innerHTML: "",
    style: {},
    querySelector: () => ({
      style: {},
      querySelector: () => ({ style: {}, textContent: "" }),
      addEventListener: () => {}
    }),
    querySelectorAll: () => []
  };
  canvas._renderThumbnails = () => {};
  canvas._renderShapesLayer = () => {};
  canvas._renderCommentsUi = () => {};
  canvas._renderSlideSorterGrid = () => {};
  return canvas;
}

export async function runSheetSlidesViewTabTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // 1. Ribbon Structures
  await test("Sheet & Slides View Tab Ribbon: 4 nhóm chuẩn Excel & PowerPoint", () => {
    const sheetView = SHEET_RIBBON_TABS.find(t => t.id === "view");
    assert(sheetView, "Thiếu tab View trong VN Sheet");
    const sheetGroupIds = sheetView.groups.map(g => g.id);
    assert(sheetGroupIds.includes("workbookViews"), "Thiếu nhóm workbookViews trong Sheet View");
    assert(sheetGroupIds.includes("show"), "Thiếu nhóm show trong Sheet View");
    assert(sheetGroupIds.includes("zoom"), "Thiếu nhóm zoom trong Sheet View");
    assert(sheetGroupIds.includes("window"), "Thiếu nhóm window trong Sheet View");

    const sheetCommands = sheetView.groups.flatMap(g => g.items.map(i => i.commandId));
    assert(sheetCommands.includes("sheet.view.normal"), "Thiếu sheet.view.normal");
    assert(sheetCommands.includes("sheet.view.pageBreakPreview"), "Thiếu sheet.view.pageBreakPreview");
    assert(sheetCommands.includes("sheet.view.pageLayout"), "Thiếu sheet.view.pageLayout");
    assert(sheetCommands.includes("sheet.view.formulaBar"), "Thiếu sheet.view.formulaBar");
    assert(sheetCommands.includes("sheet.view.zoomToSelection"), "Thiếu sheet.view.zoomToSelection");
    assert(sheetCommands.includes("sheet.view.newWindow"), "Thiếu sheet.view.newWindow");

    const slidesView = SLIDES_RIBBON_TABS.find(t => t.id === "view");
    assert(slidesView, "Thiếu tab View trong VN Slides");
    const slidesGroupIds = slidesView.groups.map(g => g.id);
    assert(slidesGroupIds.includes("presentationViews"), "Thiếu nhóm presentationViews trong Slides View");
    assert(slidesGroupIds.includes("show"), "Thiếu nhóm show trong Slides View");
    assert(slidesGroupIds.includes("zoom"), "Thiếu nhóm zoom trong Slides View");
    assert(slidesGroupIds.includes("window"), "Thiếu nhóm window trong Slides View");

    const slidesCommands = slidesView.groups.flatMap(g => g.items.map(i => i.commandId));
    assert(slidesCommands.includes("slides.view.normal"), "Thiếu slides.view.normal");
    assert(slidesCommands.includes("slides.view.slideSorter"), "Thiếu slides.view.slideSorter");
    assert(slidesCommands.includes("slides.notes.toggle"), "Thiếu slides.notes.toggle");
    assert(slidesCommands.includes("slides.view.reading"), "Thiếu slides.view.reading");
    assert(slidesCommands.includes("slides.view.ruler"), "Thiếu slides.view.ruler");
    assert(slidesCommands.includes("slides.view.gridlines"), "Thiếu slides.view.gridlines");
    assert(slidesCommands.includes("slides.view.guides"), "Thiếu slides.view.guides");
    assert(slidesCommands.includes("slides.view.fitToWindow"), "Thiếu slides.view.fitToWindow");
    assert(slidesCommands.includes("slides.view.newWindow"), "Thiếu slides.view.newWindow");
  });

  // 2. Command Definitions, UNO Mappings & i18n
  await test("Sheet & Slides View Tab Commands: Đầy đủ định nghĩa, UNO mapping, icon SVG và song ngữ VI/EN", () => {
    const requiredSheet = [
      "sheet.view.normal",
      "sheet.view.pageBreakPreview",
      "sheet.view.pageLayout",
      "sheet.view.formulaBar",
      "sheet.view.zoomToSelection",
      "sheet.view.newWindow"
    ];
    for (const id of requiredSheet) {
      const def = SHEET_COMMANDS.find(c => c.id === id);
      assert(def, `Thiếu định nghĩa lệnh ${id}`);
      assert(VN_TO_UNO_MAP[id], `Thiếu UNO mapping cho ${id}`);
      assert(viStrings.commands[id]?.label, `Thiếu nhãn tiếng Việt cho ${id}`);
      assert(enStrings.commands[id]?.label, `Thiếu nhãn tiếng Anh cho ${id}`);
      assert(ICONS[def.icon] && ICONS[def.icon].includes("<svg"), `Thiếu icon SVG cho ${def.icon}`);
    }

    const requiredSlides = [
      "slides.view.normal",
      "slides.view.reading",
      "slides.view.ruler",
      "slides.view.gridlines",
      "slides.view.guides",
      "slides.view.zoomIn",
      "slides.view.zoomOut",
      "slides.view.zoomReset",
      "slides.view.fitToWindow",
      "slides.view.newWindow"
    ];
    for (const id of requiredSlides) {
      const def = SLIDES_COMMANDS.find(c => c.id === id);
      assert(def, `Thiếu định nghĩa lệnh ${id}`);
      assert(VN_TO_UNO_MAP[id], `Thiếu UNO mapping cho ${id}`);
      assert(viStrings.commands[id]?.label, `Thiếu nhãn tiếng Việt cho ${id}`);
      assert(enStrings.commands[id]?.label, `Thiếu nhãn tiếng Anh cho ${id}`);
      assert(ICONS[def.icon] && ICONS[def.icon].includes("<svg"), `Thiếu icon SVG cho ${def.icon}`);
    }
  });

  // 3. Sheet Workbook Views
  await test("VN Sheet Workbook Views: Chuyển đổi normal, pageBreakPreview, pageLayout", () => {
    const grid = createMockSheetGrid();
    assert(grid.workbookView === "normal", "Mặc định phải là normal view");

    grid.setWorkbookView("pageBreakPreview");
    assert(grid.workbookView === "pageBreakPreview", "Không đổi sang pageBreakPreview");
    assert(grid.container.classList.contains("vno-sheet-page-break-preview"), "Thiếu class vno-sheet-page-break-preview");

    grid.setWorkbookView("pageLayout");
    assert(grid.workbookView === "pageLayout", "Không đổi sang pageLayout");
    assert(grid.container.classList.contains("vno-sheet-page-layout"), "Thiếu class vno-sheet-page-layout");
    assert(!grid.container.classList.contains("vno-sheet-page-break-preview"), "Không gỡ bỏ class pageBreakPreview");

    grid.setWorkbookView("normal");
    assert(grid.workbookView === "normal", "Không về normal");
    assert(!grid.container.classList.contains("vno-sheet-page-layout"), "Không gỡ class pageLayout");
  });

  // 4. Sheet Show/Hide Formula Bar
  await test("VN Sheet Show/Hide: Bật/tắt Formula Bar", () => {
    const grid = createMockSheetGrid();
    assert(grid.formulaBarVisible === true, "Mặc định formula bar phải hiện");

    grid.toggleFormulaBar();
    assert(grid.formulaBarVisible === false, "toggleFormulaBar không tắt");
    assert(grid.formulaBarEl.style.display === "none", "Element formulaBar không ẩn");

    grid.toggleFormulaBar();
    assert(grid.formulaBarVisible === true, "toggleFormulaBar không bật lại");
    assert(grid.formulaBarEl.style.display === "", "Element formulaBar không hiện lại");
  });

  // 5. Sheet Zoom To Selection & New Window
  await test("VN Sheet Zoom & Window: zoomToSelection và newWindow", () => {
    const grid = createMockSheetGrid();
    grid.selectedCoord = { c: "B", r: 3 };
    grid.selectedRange = { start: { c: "B", r: 3 }, end: { c: "E", r: 8 } };

    const scale = grid.zoomToSelection();
    assert(typeof scale === "number" && scale >= 0.5 && scale <= 2.0, "zoomToSelection trả về scale không hợp lệ");
    assert(grid.zoomLevel === scale, "zoomLevel không khớp scale");
    assert(grid.table.style.transform === `scale(${scale})`, "transform không khớp scale");

    let openedUrl = null;
    const origOpen = globalThis.window?.open;
    if (typeof globalThis.window === "undefined") {
      globalThis.window = { location: { href: "http://localhost:3000" }, open: (url) => { openedUrl = url; return { opener: null }; } };
    } else {
      globalThis.window.open = (url) => { openedUrl = url; return { opener: null }; };
    }
    const result = grid.newWindow();
    assert(result === true && openedUrl !== null, "newWindow không gọi window.open");
  });

  // 6. Slides Presentation Views
  await test("VN Slides Presentation Views: normal, slideSorter, reading mode", () => {
    const canvas = createMockSlidesCanvas();
    assert(canvas.presentationView === "normal", "Mặc định phải là normal view");

    // Reading View
    const origDoc = globalThis.document;
    const mockDoc = {
      createElement: () => ({
        className: "", style: {}, setAttribute() {}, querySelector: () => null, addEventListener() {}, remove() {}
      }),
      body: globalThis.document?.body || { appendChild() {} },
      addEventListener() {},
      removeEventListener() {}
    };
    globalThis.document = Object.assign(globalThis.document || {}, mockDoc);

    try {
      canvas.enterReadingView();
      assert(canvas.presentationView === "reading" && canvas.isReadingView === true, "enterReadingView không cập nhật state");

      canvas.exitReadingView();
      assert(canvas.presentationView === "normal" && canvas.isReadingView === false, "exitReadingView không về normal");

      canvas.toggleReadingView();
      assert(canvas.isReadingView === true, "toggleReadingView không bật");
      canvas.toggleReadingView();
      assert(canvas.isReadingView === false, "toggleReadingView không tắt");

      // Normal View resets any other view
      canvas.isReadingView = true;
      canvas.presentationView = "reading";
      canvas.setNormalView();
      assert(canvas.presentationView === "normal" && canvas.isReadingView === false, "setNormalView không reset");
    } finally {
      globalThis.document = origDoc;
    }
  });

  // 7. Slides Show/Hide: Rulers, Gridlines & Draggable Guides
  await test("VN Slides Show/Hide: Thước kẻ, Lưới căn chỉnh 20px và Đường gióng", () => {
    // _renderRulers() needs a global document. This test used to pass only because an earlier
    // Sheet suite leaked its fake document; provide our own and restore it afterwards.
    const origDoc = globalThis.document;
    if (!globalThis.document) globalThis.document = { body: { appendChild() {} }, createElement: () => ({ style: {}, classList: new Classes(), appendChild() {}, setAttribute() {}, addEventListener() {} }) };
    try {
    const canvas = createMockSlidesCanvas();
    assert(!canvas.rulerVisible && !canvas.gridlinesVisible && !canvas.guidesVisible, "Mặc định phải tắt");

    // Ruler
    canvas.toggleRuler();
    assert(canvas.rulerVisible === true, "toggleRuler không bật");
    assert(canvas.rulerHEl.style.display === "block", "rulerHEl không hiện");
    assert(canvas.rulerHEl.innerHTML.includes("<svg") && canvas.rulerHEl.innerHTML.includes("<line"), "rulerHEl thiếu SVG ticks");
    assert(canvas.rulerVEl.innerHTML.includes("<svg"), "rulerVEl thiếu SVG ticks");
    canvas.toggleRuler();
    assert(canvas.rulerVisible === false && canvas.rulerHEl.style.display === "none", "toggleRuler không tắt");

    // Gridlines
    canvas.toggleGridlines();
    assert(canvas.gridlinesVisible === true, "toggleGridlines không bật");
    assert(canvas.gridlinesLayer.style.display === "block", "gridlinesLayer không hiện");
    canvas.toggleGridlines();
    assert(canvas.gridlinesVisible === false && canvas.gridlinesLayer.style.display === "none", "toggleGridlines không tắt");

    // Guides
    canvas.toggleGuides();
    assert(canvas.guidesVisible === true, "toggleGuides không bật");
    assert(canvas.guidesLayer.style.display === "block", "guidesLayer không hiện");
    assert(canvas.guidesLayer.innerHTML.includes("vno-slide-guide-v") && canvas.guidesLayer.innerHTML.includes("vno-slide-guide-h"), "guidesLayer thiếu guide elements");
    assert(canvas.guidesLayer.innerHTML.includes("vno-slide-guide-tooltip"), "guidesLayer thiếu tooltip");
    canvas.toggleGuides();
    assert(canvas.guidesVisible === false && canvas.guidesLayer.style.display === "none", "toggleGuides không tắt");
    } finally {
      globalThis.document = origDoc;
    }
  });

  // 8. Slides Zoom & Fit To Window
  await test("VN Slides Zoom: zoomIn, zoomOut, zoomReset, fitToWindow", () => {
    const canvas = createMockSlidesCanvas();
    assert(canvas.zoomLevel === 1.0, "Mặc định zoomLevel = 1.0");

    canvas.zoomIn();
    assert(canvas.zoomLevel === 1.1, "zoomIn không tăng 0.1");
    assert(canvas.canvasEl.style.transform === "scale(1.1)", "canvasEl style transform sai");

    canvas.zoomOut();
    assert(canvas.zoomLevel === 1.0, "zoomOut không giảm về 1.0");

    canvas.setZoom(1.8);
    assert(canvas.zoomLevel === 1.8, "setZoom(1.8) sai");
    canvas.zoomReset();
    assert(canvas.zoomLevel === 1.0, "zoomReset không về 1.0");

    const fitScale = canvas.fitToWindow();
    assert(typeof fitScale === "number" && fitScale > 0.3 && fitScale <= 2.0, "fitToWindow trả về scale không hợp lệ");
    assert(canvas.zoomLevel === fitScale, "zoomLevel không khớp fitScale");
  });

  // 9. Sheet & Slides Adapter Dispatch & Command Bus Integration
  await test("Sheet & Slides Adapter E2E: globalCommandBus.execute kích hoạt chính xác toàn bộ lệnh View tab", async () => {
    const sheetGrid = createMockSheetGrid();
    const sheetAdapter = new SheetAdapter(sheetGrid);
    sheetAdapter.attach();

    await globalCommandBus.execute("sheet.view.pageBreakPreview");
    assert(sheetGrid.workbookView === "pageBreakPreview", "execute sheet.view.pageBreakPreview thất bại");

    await globalCommandBus.execute("sheet.view.pageLayout");
    assert(sheetGrid.workbookView === "pageLayout", "execute sheet.view.pageLayout thất bại");

    await globalCommandBus.execute("sheet.view.normal");
    assert(sheetGrid.workbookView === "normal", "execute sheet.view.normal thất bại");

    await globalCommandBus.execute("sheet.view.formulaBar");
    assert(sheetGrid.formulaBarVisible === false, "execute sheet.view.formulaBar thất bại");

    await globalCommandBus.execute("sheet.view.formulaBar");
    assert(sheetGrid.formulaBarVisible === true, "execute sheet.view.formulaBar bật lại thất bại");

    const slidesCanvas = createMockSlidesCanvas();
    const slidesAdapter = new SlidesAdapter(slidesCanvas);
    slidesAdapter.attach();

    await globalCommandBus.execute("slides.view.ruler");
    assert(slidesCanvas.rulerVisible === true, "execute slides.view.ruler thất bại");

    await globalCommandBus.execute("slides.view.gridlines");
    assert(slidesCanvas.gridlinesVisible === true, "execute slides.view.gridlines thất bại");

    await globalCommandBus.execute("slides.view.guides");
    assert(slidesCanvas.guidesVisible === true, "execute slides.view.guides thất bại");

    await globalCommandBus.execute("slides.view.zoomIn");
    assert(slidesCanvas.zoomLevel === 1.1, "execute slides.view.zoomIn thất bại");

    await globalCommandBus.execute("slides.view.zoomReset");
    assert(slidesCanvas.zoomLevel === 1.0, "execute slides.view.zoomReset thất bại");

    await globalCommandBus.execute("slides.view.fitToWindow");
    assert(slidesCanvas.zoomLevel > 0, "execute slides.view.fitToWindow thất bại");

    // Test UNO handleDispatch
    const sheetRes = await sheetAdapter.handleDispatch(".uno:PagebreakMode");
    assert(sheetRes === "pageBreakPreview", "handleDispatch .uno:PagebreakMode thất bại");

    const slidesRes = await slidesAdapter.handleDispatch(".uno:Ruler");
    assert(slidesRes === false || slidesRes === true, "handleDispatch .uno:Ruler thất bại");
  });

  return results;
}
