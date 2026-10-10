/**
 * VN Office — Writer & Slides Insert tab gaps (observed Word / PowerPoint)
 */

import { WRITER_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { CommandBus } from "../../platform/commands/command-bus.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { listAllSymbols } from "../../platform/ui-kit/symbol-picker.js";
import { formatDateTime } from "../../platform/ui-kit/datetime-picker.js";
import { slugBookmarkName } from "../../apps/writer/insert-dialogs.js";
import { readFileSync } from "node:fs";

function createMockWriterDoc(initialHtml = "<p>Alpha paragraph for insert tests</p>") {
  const datasetObj = {};
  const bodyEl = {
    innerHTML: initialHtml,
    innerText: initialHtml.replace(/<[^>]*>/g, ""),
    style: {},
    dataset: datasetObj,
    focus() {},
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const pageEl = {
    style: {},
    dataset: {},
    querySelector(sel) {
      if (sel === ".vno-writer-body") return bodyEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".vno-writer-body") return [bodyEl];
      return [];
    }
  };
  return { page: pageEl, body: bodyEl };
}

function commandIds(group) {
  const ids = [];
  const walk = (items = []) => {
    for (const item of items) {
      if (item.commandId) ids.push(item.commandId);
      if (item.items) walk(item.items);
    }
  };
  walk(group?.items);
  return ids;
}

export async function runWriterSlidesInsertGapsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const writerInsertCmds = [
    "writer.insert.textbox",
    "writer.format.dropCap",
    "writer.insert.dateTime",
    "writer.insert.equation",
    "writer.insert.symbol",
    "writer.insert.bookmark",
    "writer.insert.crossReference"
  ];
  const slidesInsertCmds = [
    "slides.insert.table",
    "slides.insert.headerFooter",
    "slides.insert.dateTime",
    "slides.insert.slideNumber",
    "slides.insert.symbol"
  ];

  await test("Writer shape layer: absolute overlay stays out of page flow", () => {
    const css = readFileSync(new URL("../../apps/writer/writer.css", import.meta.url), "utf8");
    if (!/\.vno-writer-page\s*>\s*:not\(\[data-vno-float-anchor\]\):not\(\.vno-writer-shapes-layer\)/.test(css)) {
      throw new Error("The page flow rule must exclude the Writer shapes layer");
    }
    if (!/\.vno-writer-shapes-layer\s*\{[^}]*\bposition:\s*absolute\b/s.test(css)) {
      throw new Error("The Writer shapes layer must remain absolutely positioned");
    }
  });

  await test("Writer Insert ribbon: nhóm đúng thứ tự Word (Pages/Tables/Illustrations/Links/Comments/Header/Text/Symbols)", () => {
    const insertTab = WRITER_RIBBON_TABS.find(tab => tab.id === "insert");
    const keys = insertTab.groups.map(group => group.labelKey);
    const required = [
      "writerRibbon.group.pages",
      "writerRibbon.group.tables",
      "writerRibbon.group.illustrations",
      "writerRibbon.group.links",
      "writerRibbon.group.comments",
      "writerRibbon.group.headerFooter",
      "writerRibbon.group.text",
      "writerRibbon.group.symbols"
    ];
    required.forEach((key, index) => {
      if (keys[index] !== key) throw new Error(`Nhóm ${index} phải là ${key}, thực tế ${keys[index]}`);
    });
    const links = commandIds(insertTab.groups.find(group => group.id === "links"));
    if (!links.includes("common.edit.hyperlink") || !links.includes("writer.insert.bookmark") || !links.includes("writer.insert.crossReference")) {
      throw new Error("Nhóm Links thiếu Hyperlink/Bookmark/Cross-reference");
    }
    const text = commandIds(insertTab.groups.find(group => group.id === "text"));
    if (!text.includes("writer.insert.textbox") || !text.includes("writer.format.dropCap") || !text.includes("writer.insert.dateTime")) {
      throw new Error("Nhóm Text thiếu Text Box/Drop Cap/Date & Time");
    }
    const symbols = commandIds(insertTab.groups.find(group => group.id === "symbols"));
    if (!symbols.includes("writer.insert.equation") || !symbols.includes("writer.insert.symbol")) {
      throw new Error("Nhóm Symbols thiếu Equation/Symbol");
    }
  });

  await test("Slides Insert ribbon: Tables → Images → Illustrations → Comments → Text → Symbols → Media", () => {
    const insertTab = SLIDES_RIBBON_TABS.find(tab => tab.id === "insert");
    const keys = insertTab.groups.map(group => group.labelKey);
    const required = [
      "slidesRibbon.group.tables",
      "slidesRibbon.group.images",
      "slidesRibbon.group.illustrations",
      "slidesRibbon.group.comments",
      "slidesRibbon.group.text",
      "slidesRibbon.group.symbols",
      "slidesRibbon.group.media"
    ];
    if (JSON.stringify(keys) !== JSON.stringify(required)) {
      throw new Error(`Thứ tự nhóm Insert Slides sai: ${keys.join(" | ")}`);
    }
    const allIds = insertTab.groups.flatMap(commandIds);
    for (const id of [...slidesInsertCmds, "slides.text.insert", "slides.image.insert", "slides.media.insertVideo"]) {
      if (!allIds.includes(id)) throw new Error(`Thiếu nút ${id} trên tab Chèn Slides`);
    }
  });

  await test("Mọi lệnh Insert mới có định nghĩa, icon SVG, mapping UNO và i18n VI/EN", () => {
    for (const id of [...writerInsertCmds, ...slidesInsertCmds]) {
      const def = [...WRITER_COMMANDS, ...SLIDES_COMMANDS].find(item => item.id === id);
      if (!def) throw new Error(`Thiếu command ${id}`);
      if (!ICONS[def.icon] || !ICONS[def.icon].includes("<svg")) throw new Error(`Icon ${def.icon} không phải SVG`);
      if (ICONS[def.icon].includes('circle cx="12" cy="12" r="4"')) throw new Error(`Icon ${def.icon} là placeholder`);
      if (!mapVnCommandToUno(id)) throw new Error(`Thiếu UNO mapping cho ${id}`);
      if (!viStrings.commands[id]?.label || !viStrings.commands[id]?.tooltip) throw new Error(`Thiếu i18n VI ${id}`);
      if (!enStrings.commands[id]?.label || !enStrings.commands[id]?.tooltip) throw new Error(`Thiếu i18n EN ${id}`);
    }
    if (listAllSymbols().length < 20) throw new Error("Symbol picker thiếu ký tự thường dùng");
    if (formatDateTime(new Date(2026, 8, 4, 8, 30), "dd/MM/yyyy") !== "04/09/2026") {
      throw new Error("formatDateTime sai định dạng VN");
    }
    if (slugBookmarkName("Mục 1") !== "muc-1") throw new Error("slug bookmark không bỏ dấu");
  });

  await test("Writer Insert: Text Box / Drop Cap / Date / Equation / Symbol / Bookmark / Cross-ref hoạt động trên model", async () => {
    const { page, body } = createMockWriterDoc("<p>Alpha paragraph</p>");
    const adapter = new WriterAdapter(page);

    const box = adapter.insertTextBox({ text: "Khung chữ" });
    if (!box || box.type !== "textbox" || box.text !== "Khung chữ" || adapter.shapes.length !== 1) {
      throw new Error("insertTextBox không lưu shape textbox");
    }

    if (!adapter.applyDropCap({ lines: 3 }) || !body.innerHTML.includes("vno-drop-cap")) {
      throw new Error(`Drop Cap không bọc chữ đầu: ${body.innerHTML}`);
    }

    await adapter.insertDateTime({ format: "dd/MM/yyyy", text: "04/09/2026", now: new Date("2026-09-04T08:00:00") });
    if (!body.innerHTML.includes("vno-datetime") || !body.innerHTML.includes("04/09/2026")) {
      throw new Error("Date & Time không chèn span");
    }

    await adapter.insertEquation({ expression: "E = mc²" });
    if (!body.innerHTML.includes("vno-equation") || !body.innerHTML.includes("E = mc²")) {
      throw new Error("Equation không chèn hộp công thức");
    }

    await adapter.insertSymbol({ char: "©" });
    if (!body.innerHTML.includes("©")) throw new Error("Symbol không chèn ký tự");

    const bookmark = await adapter.insertBookmark({ name: "intro" });
    if (!bookmark?.id || !body.innerHTML.includes('class="vno-bookmark"') || !body.innerHTML.includes("intro")) {
      throw new Error("Bookmark không chèn thẻ neo");
    }

    const xrefOk = await adapter.insertCrossReference({ targetId: bookmark.id, display: "intro", type: "bookmark" });
    if (!xrefOk || !body.innerHTML.includes(`href="#${bookmark.id}"`) || !body.innerHTML.includes("vno-cross-ref")) {
      throw new Error("Cross-reference không chèn link nội bộ");
    }
  });

  await test("Writer Insert: hộp văn bản neo theo vị trí con trỏ hiện tại", () => {
    const { page, body } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const priorWindow = globalThis.window;
    const range = {
      commonAncestorContainer: {},
      getBoundingClientRect: () => ({ left: 520, top: 610, width: 0, height: 0 })
    };
    globalThis.window = { getSelection: () => ({ rangeCount: 1, getRangeAt: () => range }) };
    adapter.bodyDom = body;
    body.contains = () => true;
    adapter.editorDom = {
      getBoundingClientRect: () => ({ left: 300, top: 400, width: 500, height: 900 }),
      querySelectorAll: () => []
    };
    adapter.insertShape = options => options;
    try {
      const shape = adapter.insertTextBox();
      if (shape.x !== 220 || shape.y !== 210) {
        throw new Error(`Textbox lệch khỏi caret: x=${shape.x}, y=${shape.y}`);
      }
    } finally {
      if (priorWindow === undefined) delete globalThis.window;
      else globalThis.window = priorWindow;
    }
  });

  await test("Writer Insert: CommandBus.execute đi qua UNO mapping (không gọi handleDispatch trực tiếp)", async () => {
    const { page, body } = createMockWriterDoc("<p>Bus path</p>");
    const adapter = new WriterAdapter(page);
    const bus = new CommandBus();
    for (const id of writerInsertCmds) {
      const uno = mapVnCommandToUno(id);
      if (!uno) throw new Error(`CommandBus không bind được vì thiếu mapping ${id}`);
      bus.register({ id, category: "insert", label: id });
      bus.bindHandler(id, (args) => adapter.handleDispatch(uno, args, id));
    }
    const symbol = await bus.execute("writer.insert.symbol", { char: "®" });
    if (!symbol || !body.innerHTML.includes("®")) throw new Error("execute(symbol) không chèn ký tự");
    const box = await bus.execute("writer.insert.textbox", { text: "Bus box" });
    if (!box || adapter.shapes[adapter.shapes.length - 1].type !== "textbox") {
      throw new Error("execute(textbox) không tạo shape");
    }
    const date = await bus.execute("writer.insert.dateTime", { format: "yyyy-MM-dd", text: "2026-09-04" });
    if (!date || !body.innerHTML.includes("2026-09-04")) throw new Error("execute(dateTime) thất bại");
  });

  await test("Slides Insert: Table / HeaderFooter / Date / Slide Number / Symbol hoạt động trên canvas", async () => {
    const canvas = new SlidesCanvasController({ innerHTML: "", className: "" });
    canvas.shapesLayer = null;
    canvas._renderThumbnails = () => {};
    canvas._renderShapesLayer = () => {};
    canvas.setSelectedTarget = (id) => { canvas.selectedTarget = id; };
    canvas.bodyEl = { innerText: "Nội dung" };

    const table = await canvas.insertTable({ rows: 2, cols: 3 });
    if (!table || table.type !== "table" || table.rows !== 2 || table.cols !== 3 || !table.cells?.[0]?.length) {
      throw new Error("insertTable không tạo shape bảng");
    }
    if (canvas.slides[0].shapes.filter(shape => shape.type === "table").length !== 1) {
      throw new Error("Bảng không nằm trong slide.shapes");
    }

    const hf = canvas.applyHeaderFooter({
      showDate: true,
      showSlideNumber: true,
      showFooter: true,
      footerText: "VN Office",
      dateFormat: "dd/MM/yyyy"
    }, { applyToAll: true });
    if (!hf || canvas.headerFooter.showDate !== true || canvas.slides[0].headerFooter.footerText !== "VN Office") {
      throw new Error("applyHeaderFooter không lưu placeholder");
    }

    await canvas.insertDateTime({ format: "yyyy-MM-dd", applyToAll: true });
    if (canvas.headerFooter.dateFormat !== "yyyy-MM-dd" || !canvas.headerFooter.showDate) {
      throw new Error("insertDateTime không bật placeholder ngày");
    }

    canvas.insertSlideNumber({ applyToAll: true });
    if (canvas.headerFooter.showSlideNumber !== true) throw new Error("insertSlideNumber không bật số trang");

    canvas.bodyEl.innerText = "Hello";
    const symbol = await canvas.insertSymbol({ char: "™" });
    if (!symbol || !canvas.bodyEl.innerText.includes("™")) throw new Error("insertSymbol không chèn vào body");
  });

  await test("Slides Insert: CommandBus.execute + adapter.handleDispatch với mapping UNO", async () => {
    const canvas = new SlidesCanvasController({ innerHTML: "", className: "" });
    canvas.shapesLayer = null;
    canvas._renderThumbnails = () => {};
    canvas._renderShapesLayer = () => {};
    canvas.setSelectedTarget = (id) => { canvas.selectedTarget = id; };
    canvas.bodyEl = { innerText: "Slide" };
    const adapter = new SlidesAdapter(canvas);
    const bus = new CommandBus();
    for (const id of slidesInsertCmds) {
      const uno = mapVnCommandToUno(id);
      if (!uno) throw new Error(`Thiếu mapping ${id}`);
      bus.register({ id, category: "insert", label: id });
      bus.bindHandler(id, (args) => adapter.handleDispatch(uno, args, id));
    }
    const table = await bus.execute("slides.insert.table", { rows: 4, cols: 2 });
    if (!table || table.rows !== 4 || table.cols !== 2) throw new Error("execute(table) không tạo bảng đúng kích thước");
    const number = await bus.execute("slides.insert.slideNumber", { applyToAll: true });
    if (!number || canvas.headerFooter.showSlideNumber !== true) throw new Error("execute(slideNumber) thất bại");
    const symbol = await bus.execute("slides.insert.symbol", { char: "§" });
    if (!symbol || !canvas.bodyEl.innerText.includes("§")) throw new Error("execute(symbol) thất bại");
  });

  return results;
}
