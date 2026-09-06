/**
 * VN Office — Unit & Behavioral Tests for Slides Print Preview
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

const assert = (value, message) => { if (!value) throw new Error(message); };

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(name) { const items = this._items(); items.add(name); this.owner.className = [...items].join(" "); }
  remove(name) { const items = this._items(); items.delete(name); this.owner.className = [...items].join(" "); }
  toggle(name, force) {
    const items = this._items();
    const has = items.has(name);
    const shouldHave = force === undefined ? !has : force;
    if (shouldHave) items.add(name); else items.delete(name);
    this.owner.className = [...items].join(" ");
  }
  contains(name) { return this._items().has(name); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.attributes = {};
    this.listeners = {};
    this._textContent = "";
    this._innerHTML = "";
    this.style = {};
    this.disabled = false;
  }
  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(val) { this._textContent = String(val); this._innerHTML = String(val); this.children = []; }
  get innerHTML() { return this.children.length > 0 ? this.children.map(c => c.outerHTML || "").join("\n") : this._innerHTML; }
  set innerHTML(val) { this._innerHTML = String(val); this._parseChildHtml(this._innerHTML); }
  _parseChildHtml(html) {
    this.children = [];
    if (!html || typeof html !== "string") return;
    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9\-]+)([^>]*)\/>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1] || match[4];
      const rawAttrs = match[2] || match[5] || "";
      const innerContent = match[3] || "";
      const child = new FakeElement(tagName);
      const classMatch = rawAttrs.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];
      const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
      if (idMatch) child.setAttribute("id", idMatch[1]);
      if (/disabled\b/i.test(rawAttrs)) child.disabled = true;
      child.innerHTML = innerContent;
      child.parentNode = this;
      this.children.push(child);
    }
  }
  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const classStr = this.className ? ` class="${this.className}"` : "";
    return `<${tag}${classStr}>${this.innerHTML}</${tag}>`;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(h => h !== handler); }
  dispatchEvent(event) { (this.listeners[event.type] || []).forEach(h => h(event)); }
  click() { this.dispatchEvent({ type: "click", target: this, stopPropagation() {}, preventDefault() {} }); }
  contains(node) { return node === this || this.children.some(child => child.contains?.(node)); }
  _matches(selector) {
    if (!selector) return false;
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    if (selector.startsWith("#")) return this.attributes.id === selector.slice(1);
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child._matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  focus() {}
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body"); this.listeners = {}; }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(h => h !== handler); }
  querySelector(selector) { return selector === "body" ? this.body : this.body.querySelector(selector); }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
  get activeElement() { return this.body; }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.titleEl = { innerText: "", style: {}, classList: new FakeClassList({ className: "" }) };
  canvas.bodyEl = { innerText: "", style: {} };
  canvas.body2El = { innerText: "", style: {} };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas._renderShapesLayer = () => {};
  canvas._renderThumbnails = () => {};
  canvas._renderSlideSorterGrid = () => {};
  return canvas;
}

function fourSlideDeck(canvas) {
  canvas.slides = [
    { id: 1, title: "Mở đầu", body: "Nội dung mở đầu", layoutType: "title-content", shapes: [], comments: [], hidden: false },
    { id: 2, title: "Trang ẩn", body: "Không được in", layoutType: "title-content", shapes: [], comments: [], hidden: true },
    { id: 3, title: "Nội dung chính", body: "Số liệu quan trọng", layoutType: "title-content", shapes: [{ type: "rect", x: 10, y: 10, w: 100, h: 50, color: "#3b82f6", text: "Khối" }], comments: [], hidden: false },
    { id: 4, title: "Kết luận", body: "Tóm tắt", layoutType: "title-content", shapes: [], comments: [], hidden: false }
  ];
  canvas.currentSlideIndex = 0;
}

export async function runSlidesPrintPreviewTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("slides.file.printPreview: lệnh chuẩn, mapping .uno:PrintPreview, i18n VI/EN", () => {
    const def = SLIDES_COMMANDS.find(c => c.id === "slides.file.printPreview");
    assert(def, "Thiếu lệnh slides.file.printPreview");
    assert(def.category === "file", `Category sai: ${def.category}`);
    assert(def.shortcut === "Ctrl+F2", `Shortcut sai: ${def.shortcut}`);
    assert(def.icon === "printPreview", `Icon sai: ${def.icon}`);
    assert(mapVnCommandToUno("slides.file.printPreview") === ".uno:PrintPreview", "Thiếu mapping UNO thật");
  });

  await test("slides.file.printPreview: có mặt trong ribbon tab Chế độ xem, nhóm Dạng xem bản trình chiếu", () => {
    const viewTab = SLIDES_RIBBON_TABS.find(tab => tab.id === "view");
    assert(viewTab, "Không tìm thấy tab view");
    const group = viewTab.groups.find(g => g.id === "presentationViews");
    assert(group, "Không tìm thấy nhóm presentationViews");
    assert(group.items.some(item => item.commandId === "slides.file.printPreview"), "Thiếu nút slides.file.printPreview trong nhóm");
  });

  await test("computePrintPages: bỏ qua trang chiếu Ẩn, giữ đúng thứ tự các trang còn lại", () => {
    const canvas = createController();
    fourSlideDeck(canvas);
    const result = canvas.computePrintPages();
    assert(result.totalPages === 3, `Mong 3 trang (bỏ trang ẩn), nhận ${result.totalPages}`);
    assert(result.pages.map(p => p.index).join(",") === "0,2,3", `Thứ tự trang sai: ${result.pages.map(p => p.index)}`);
    assert(result.pages[0].slide.title === "Mở đầu", "Trang đầu tiên sai nội dung");
  });

  await test("computePrintPages: tất cả trang không ẩn cho một deck bình thường", () => {
    const canvas = createController();
    canvas.slides = [
      { id: 1, title: "A", body: "", shapes: [], comments: [], hidden: false },
      { id: 2, title: "B", body: "", shapes: [], comments: [], hidden: false }
    ];
    const result = canvas.computePrintPages();
    assert(result.totalPages === 2, `Mong 2 trang, nhận ${result.totalPages}`);
  });

  await test("_computeSlideFooterTexts: mặc định hiện số trang thật (showSlideNumber=true), theo đúng tổng số slide thật", () => {
    const canvas = createController();
    fourSlideDeck(canvas);
    const { pageText } = canvas._computeSlideFooterTexts(canvas.slides[2], 2);
    assert(pageText === "Trang 3 / 4", `Số trang sai: ${pageText}`);
  });

  await test("_computeSlideFooterTexts: showFooter=false thì không hiện footerText dù có cấu hình", () => {
    const canvas = createController();
    fourSlideDeck(canvas);
    canvas.slides[0].headerFooter = { showDate: false, showSlideNumber: false, showFooter: false, footerText: "Bí mật" };
    const { footerText, pageText } = canvas._computeSlideFooterTexts(canvas.slides[0], 0);
    assert(footerText === "", `footerText phải rỗng khi showFooter=false, nhận: ${footerText}`);
    assert(pageText === "", `pageText phải rỗng khi showSlideNumber=false, nhận: ${pageText}`);
  });

  // ---------- DOM thật (openPrintPreview/print/_syncSlidesPrintOnlyDom) ----------

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  try {
    const fakeDoc = new FakeDocument();
    globalThis.document = fakeDoc;
    let printCalled = 0;
    globalThis.window = { print: () => { printCalled++; } };

    await test("openPrintPreview: overlay thật hiển thị đúng tổng số trang (đã loại trang ẩn) và nội dung thật", () => {
      const canvas = createController();
      fourSlideDeck(canvas);
      const overlay = canvas.openPrintPreview();
      assert(overlay, "openPrintPreview phải trả về overlay");
      assert(overlay.querySelector(".vno-slides-pp-total").textContent === "3", "Tổng số trang hiển thị sai");
      const pageText = overlay.querySelector(".vno-slides-print-preview-page").textContent;
      assert(pageText.includes("Mở đầu"), "Trang đầu phải hiển thị đúng tiêu đề thật", pageText);
      assert(canvas.closePrintPreview() === true, "closePrintPreview phải trả về true khi đang mở");
      assert(fakeDoc.body.querySelector(".vno-slides-print-preview-overlay") === null, "Overlay phải bị gỡ khỏi DOM sau khi đóng");
    });

    await test("openPrintPreview: điều hướng Trang sau bỏ qua đúng trang ẩn, hiển thị trang kế tiếp thật", () => {
      const canvas = createController();
      fourSlideDeck(canvas);
      const overlay = canvas.openPrintPreview();
      overlay.querySelector(".vno-slides-pp-next").click();
      assert(overlay.querySelector(".vno-slides-pp-current").textContent === "2", "Phải chuyển sang trang 2 (slide 'Nội dung chính', slide ẩn đã bị loại)");
      const pageText = overlay.querySelector(".vno-slides-print-preview-page").textContent;
      assert(pageText.includes("Nội dung chính"), "Trang 2 phải là slide 'Nội dung chính', không phải slide Ẩn", pageText);
      assert(!pageText.includes("Trang ẩn"), "Slide Ẩn không được xuất hiện trong bản in", pageText);
      canvas.closePrintPreview();
    });

    await test("openPrintPreview: nút In gọi window.print() thật đúng 1 lần", () => {
      const canvas = createController();
      fourSlideDeck(canvas);
      const overlay = canvas.openPrintPreview();
      printCalled = 0;
      overlay.querySelector(".vno-slides-pp-print").click();
      assert(printCalled === 1, "Nút In phải gọi window.print() đúng 1 lần");
      canvas.closePrintPreview();
    });

    await test("print(): dựng #vno-slides-print-only với đúng số trang thật (loại trang Ẩn), không phải canvas 1-trang-active", () => {
      const canvas = createController();
      fourSlideDeck(canvas);
      canvas.print();
      const printOnly = fakeDoc.body.querySelector("#vno-slides-print-only");
      assert(printOnly, "Phải dựng #vno-slides-print-only");
      const pages = printOnly.querySelectorAll(".vno-slides-print-page");
      assert(pages.length === 3, `Mong 3 trang in (bỏ trang ẩn), nhận ${pages.length}`);
      assert(printOnly.textContent.includes("Nội dung chính") && !printOnly.textContent.includes("Trang ẩn"),
        "Nội dung in phải là dữ liệu slide thật, loại đúng slide Ẩn");
    });

    await test("common.file.print (Ctrl+P) đi qua SlidesAdapter.print() gọi đúng canvas.print() thật", () => {
      const canvas = createController();
      fourSlideDeck(canvas);
      const adapter = new SlidesAdapter(canvas);
      const before = fakeDoc.body.querySelector("#vno-slides-print-only");
      if (before) before.remove();
      adapter.print();
      const printOnly = fakeDoc.body.querySelector("#vno-slides-print-only");
      assert(printOnly && printOnly.querySelectorAll(".vno-slides-print-page").length === 3,
        "common.file.print phải render đủ deck thật (trừ slide ẩn), không chỉ gọi window.print() suông");
    });
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }

  return results;
}
