/**
 * VN Slides Clipboard — text box Cut/Copy/Paste behavior parity with Writer.
 * Tests use mock objects to avoid real DOM dependency.
 */

import { SlidesAdapter, stripClipboardFragmentMarkers } from "../../adapters/libreoffice/slides/slides-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mockElement(attrs = {}) {
  const element = {
    contentEditable: attrs.contentEditable || "false",
    dataset: attrs.dataset || {},
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    attributes: attrs.attributes || {},
    className: attrs.className || "",
    classList: {
      _classes: new Set(attrs.classList || []),
      add(...names) { names.forEach(name => this._classes.add(name)); },
      remove(...names) { names.forEach(name => this._classes.delete(name)); },
      contains(name) { return this._classes.has(name); }
    },
    style: {},
    innerHTML: "",
    textContent: "",
    focus() {},
    blur() {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  return element;
}

function mockCanvas() {
  const titleEl = mockElement({
    contentEditable: "true",
    dataset: { vnoNativeClipboard: "true" },
    className: "vno-slide-title"
  });
  const bodyEl = mockElement({
    contentEditable: "true",
    dataset: { vnoNativeClipboard: "true" },
    className: "vno-slide-body"
  });
  const body2El = mockElement({
    contentEditable: "true",
    dataset: { vnoNativeClipboard: "true" },
    className: "vno-slide-body vno-slide-body-col2"
  });
  return {
    titleEl,
    bodyEl,
    body2El,
    shapesLayer: mockElement({
      querySelector: (sel) => {
        if (sel.includes("data-shape-text-id")) return mockShapeTextEl();
        if (sel.includes("vno-slide-table")) return mockTableCell();
        if (sel.includes("vno-wordart")) return mockWordArtTextEl();
        if (sel.includes("vno-diagram-node-text")) return mockDiagramNodeTextEl();
        return null;
      },
      querySelectorAll: () => []
    }),
    slides: [{
      id: 1,
      title: "Tiêu đề",
      body: "Nội dung",
      layoutType: "title-content",
      shapes: []
    }],
    currentSlideIndex: 0,
    undoStack: [],
    redoStack: [],
    _renderThumbnails: () => {},
    _renderShapesLayer: () => {},
    _refreshSpellcheckRoots: () => {},
    _syncEditableFieldsFromDom: () => {},
    _applySlideSizeToDom: () => {},
    selectSlide: () => {}
  };
}

function mockShapeTextEl() {
  const el = mockElement({
    contentEditable: "false",
    className: "vno-shape-text",
    dataset: { shapeTextId: "11" }
  });
  el._startEditing = () => {
    if (el.contentEditable !== "true") el.dataset.originalText = "Hộp văn bản";
    el.contentEditable = "true";
    el.dataset.vnoNativeClipboard = "true";
    el.focus();
  };
  return el;
}

function mockTableCell() {
  return mockElement({
    contentEditable: "true",
    dataset: { vnoNativeClipboard: "true" },
    className: "vno-slide-table-cell"
  });
}

function mockWordArtTextEl() {
  const el = mockElement({
    contentEditable: "false",
    className: "vno-wordart-text",
    dataset: { vnoWordart: "true" }
  });
  el._startEditing = () => {
    if (el.contentEditable !== "true") el.dataset.originalText = "WordArt";
    el.contentEditable = "true";
    el.dataset.vnoNativeClipboard = "true";
    el.focus();
  };
  return el;
}

function mockDiagramNodeTextEl() {
  const el = mockElement({
    contentEditable: "false",
    className: "vno-diagram-node-text"
  });
  el._startEditing = () => {
    if (el.contentEditable !== "true") el.dataset.originalText = "Node 1";
    el.contentEditable = "true";
    el.dataset.vnoNativeClipboard = "true";
    el.focus();
  };
  return el;
}

export async function runSlidesClipboardTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Title/Body/Body2 elements have data-vno-native-clipboard attribute", () => {
    const canvas = mockCanvas();
    assert(canvas.titleEl.dataset.vnoNativeClipboard === "true", "titleEl phải có data-vno-native-clipboard=true");
    assert(canvas.bodyEl.dataset.vnoNativeClipboard === "true", "bodyEl phải có data-vno-native-clipboard=true");
    assert(canvas.body2El.dataset.vnoNativeClipboard === "true", "body2El phải có data-vno-native-clipboard=true");
  });

  await test("Shape text elements get data-vno-native-clipboard when editing starts", () => {
    const canvas = mockCanvas();
    const textEl = mockShapeTextEl();
    canvas.shapesLayer.querySelector = () => textEl;
    canvas.selectSlide(0);
    
    assert(textEl.contentEditable === "false", "Ban đầu contentEditable=false");
    assert(!textEl.dataset.vnoNativeClipboard, "Ban đầu không có attribute");

    canvas.setSelectedTarget = () => {};
    textEl._startEditing();
    
    assert(textEl.contentEditable === "true", "Sau khi edit: contentEditable=true");
    assert(textEl.dataset.vnoNativeClipboard === "true", "Sau khi edit: có data-vno-native-clipboard=true");
  });

  await test("Table cells have data-vno-native-clipboard attribute", () => {
    const canvas = mockCanvas();
    const td = mockTableCell();
    canvas.shapesLayer.querySelector = () => td;
    
    assert(td.contentEditable === "true", "Table cell contentEditable=true");
    assert(td.dataset.vnoNativeClipboard === "true", "Table cell phải có data-vno-native-clipboard=true");
  });

  await test("WordArt text elements get data-vno-native-clipboard when editing starts", () => {
    const canvas = mockCanvas();
    const textEl = mockWordArtTextEl();
    canvas.shapesLayer.querySelector = () => textEl;
    
    assert(textEl.contentEditable === "false", "Ban đầu contentEditable=false");
    assert(!textEl.dataset.vnoNativeClipboard, "Ban đầu không có attribute");

    textEl._startEditing();
    
    assert(textEl.contentEditable === "true", "Sau khi edit: contentEditable=true");
    assert(textEl.dataset.vnoNativeClipboard === "true", "Sau khi edit: có data-vno-native-clipboard=true");
  });

  await test("Diagram node text elements get data-vno-native-clipboard when editing starts", () => {
    const canvas = mockCanvas();
    const textEl = mockDiagramNodeTextEl();
    canvas.shapesLayer.querySelector = () => textEl;
    
    assert(textEl.contentEditable === "false", "Ban đầu contentEditable=false");
    assert(!textEl.dataset.vnoNativeClipboard, "Ban đầu không có attribute");

    textEl._startEditing();
    
    assert(textEl.contentEditable === "true", "Sau khi edit: contentEditable=true");
    assert(textEl.dataset.vnoNativeClipboard === "true", "Sau khi edit: có data-vno-native-clipboard=true");
  });

  await test("SlidesAdapter handles common.edit.cut/copy/paste/pastePlain commands", async () => {
    const canvas = mockCanvas();
    const adapter = new SlidesAdapter(canvas);

    const cutResult = await adapter.handleDispatch(".uno:Cut", null, "common.edit.cut");
    const copyResult = await adapter.handleDispatch(".uno:Copy", null, "common.edit.copy");
    const pasteResult = await adapter.handleDispatch(".uno:Paste", null, "common.edit.paste");
    const pastePlainResult = await adapter.handleDispatch(".uno:PasteUnformatted", null, "common.edit.pastePlain");

    assert(cutResult === true, "common.edit.cut phải trả về true");
    assert(copyResult === true, "common.edit.copy phải trả về true");
    assert(pasteResult === true, "common.edit.paste phải trả về true");
    assert(pastePlainResult === true, "common.edit.pastePlain phải trả về true");
  });

  await test("Ribbon Cut/Copy/Paste restore the saved text selection", async () => {
    const adapter = new SlidesAdapter(mockCanvas());
    let restored = 0;
    adapter._restoreTextSelection = () => { restored += 1; };

    await adapter.handleDispatch(".uno:Cut", null, "common.edit.cut");
    await adapter.handleDispatch(".uno:Copy", null, "common.edit.copy");
    await adapter.handleDispatch(".uno:Paste", null, "common.edit.paste");

    assert(restored === 3, `Cut/Copy/Paste phải phục hồi vùng chọn trước thao tác, nhận ${restored}/3`);
  });

  await test("Clipboard HTML fragment markers are stripped before Slides paste", async () => {
    const html = stripClipboardFragmentMarkers("<!--StartFragment--><b>Nội dung</b><!--EndFragment-->");
    assert(html === "<b>Nội dung</b>", `Không được dán marker CF_HTML: ${html}`);
  });

  return results;
}
