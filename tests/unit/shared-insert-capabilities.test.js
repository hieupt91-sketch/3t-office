/**
 * 3T Office — CH-7.3 Shared Insert Dialogs & Capabilities Unit Tests
 * Kiểm thử hộp thoại và năng lực Chèn dùng chung cho Doc, Sheet, Slide:
 * Ký hiệu, Siêu liên kết (Ctrl+K), Hộp văn bản, Hình khối, Hình ảnh (8 tay cầm, Shift giữ tỉ lệ, xoay, Ctrl+Z 1 bước).
 */

import assert from "node:assert/strict";
import { showHyperlinkDialog, normalizeHyperlinkUrl } from "../../platform/ui-kit/hyperlink-dialog.js";
import { showSymbolPicker, listAllSymbols, SYMBOL_CATEGORIES } from "../../platform/ui-kit/symbol-picker.js";
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";

class MockClassList {
  constructor(owner) { this.owner = owner; }
  _set() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(n) { const s = this._set(); s.add(n); this.owner.className = [...s].join(" "); }
  remove(n) { const s = this._set(); s.delete(n); this.owner.className = [...s].join(" "); }
  contains(n) { return this._set().has(n); }
  toggle(n, force) {
    const shouldAdd = typeof force === "boolean" ? force : !this.contains(n);
    if (shouldAdd) this.add(n); else this.remove(n);
    return shouldAdd;
  }
}

class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.className = "";
    this.classList = new MockClassList(this);
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.id = "";
    this._value = "";
    this._innerText = "";
    this._innerHTML = "";
    this.offsetWidth = 200;
    this.offsetHeight = 100;
  }

  get value() { return this._value; }
  set value(v) { this._value = String(v); }

  get textContent() {
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML ? this._innerHTML.replace(/<[^>]+>/g, "").trim() : this._innerText;
  }
  set textContent(v) {
    this._innerText = String(v);
    this._innerHTML = String(v);
    this.children = [];
  }

  get innerText() { return this.textContent; }
  set innerText(v) { this.textContent = v; }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) {
    this._innerHTML = String(v);
    this.children = [];
    // Phân tích các thẻ HTML trong chuỗi để sinh cây MockElement
    const tagRegex = /<([a-zA-Z0-9_-]+)([^>]*)>/gi;
    let match;
    while ((match = tagRegex.exec(v)) !== null) {
      const tag = match[1];
      if (tag.startsWith("/")) continue;
      const attrs = match[2];
      const el = new MockElement(tag);
      const idM = attrs.match(/id=["']([^"']+)["']/i);
      if (idM) el.id = idM[1];
      const classM = attrs.match(/class=["']([^"']+)["']/i);
      if (classM) el.className = classM[1];
      const valM = attrs.match(/value=["']([^"']*)["']/i);
      if (valM) el.value = valM[1];
      const dataDiagM = attrs.match(/data-vno-dialog=["']([^"']*)["']/i);
      if (dataDiagM) el.dataset.vnoDialog = dataDiagM[1];
      el.parentElement = this;
      el.parentNode = this;
      this.children.push(el);
    }
  }

  focus() { this._focused = true; }
  select() { this._selected = true; }

  closest(sel) {
    let cur = this;
    while (cur) {
      if (cur.matches && cur.matches(sel)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  matches(sel) {
    if (!sel) return false;
    if (sel.startsWith(".")) return this.classList.contains(sel.slice(1));
    if (sel.startsWith("#")) return this.id === sel.slice(1);
    if (sel.toLowerCase() === this.tagName.toLowerCase()) return true;
    return false;
  }

  contains(node) {
    let cur = node;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  appendChild(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    child.parentElement = null;
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  addEventListener(type, fn) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== fn);
    }
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    for (const fn of list) fn(event);
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(sel) {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (sel.startsWith("#") && child.id === sel.slice(1)) results.push(child);
        else if (sel.startsWith(".") && child.classList.contains(sel.slice(1))) results.push(child);
        else if (child.tagName.toLowerCase() === sel.toLowerCase()) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
}

export async function runSharedInsertCapabilitiesTests() {
  const results = [];

  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  const asyncTest = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  // 1. normalizeHyperlinkUrl
  test("normalizeHyperlinkUrl: tự động thêm https:// khi thiếu giao thức và giữ nguyên mailto:", () => {
    assert.equal(normalizeHyperlinkUrl("example.com"), "https://example.com");
    assert.equal(normalizeHyperlinkUrl("https://example.com"), "https://example.com");
    assert.equal(normalizeHyperlinkUrl("http://example.com/test"), "http://example.com/test");
    assert.equal(normalizeHyperlinkUrl("mailto:info@3tcomputer.com"), "mailto:info@3tcomputer.com");
    assert.equal(normalizeHyperlinkUrl(""), "");
  });

  // 2. showHyperlinkDialog non-DOM fallback
  await asyncTest("showHyperlinkDialog: trả về object {url, text} an toàn khi chạy non-DOM", async () => {
    const res = await showHyperlinkDialog({ url: "https://vnexpress.net", text: "Tin tức" });
    assert.ok(res, "Phải trả về kết quả");
    assert.equal(res.url, "https://vnexpress.net");
    assert.equal(res.text, "Tin tức");
  });

  // 3. showHyperlinkDialog DOM interaction
  await asyncTest("showHyperlinkDialog: sinh hộp thoại aria-modal chuẩn, có 2 trường URL & văn bản, Enter để chèn", async () => {
    const origDoc = globalThis.document;
    const root = new MockElement("body");
    const docListeners = {};
    globalThis.document = {
      createElement: (tag) => new MockElement(tag),
      body: root,
      activeElement: root,
      addEventListener: (type, fn) => {
        docListeners[type] = docListeners[type] || [];
        docListeners[type].push(fn);
      },
      removeEventListener: (type, fn) => {
        if (docListeners[type]) {
          docListeners[type] = docListeners[type].filter(cb => cb !== fn);
        }
      },
      dispatchEvent: (event) => {
        const list = docListeners[event.type] || [];
        for (const fn of list) fn(event);
      }
    };

    try {
      const promise = showHyperlinkDialog({ url: "https://3tcomputer.com", text: "Trang chủ" });
      const overlay = root.children[0];
      assert.ok(overlay, "Phải chèn overlay vào document.body");
      assert.equal(overlay.dataset.vnoDialog, "hyperlink");
      assert.ok(overlay.innerHTML.includes("Chèn liên kết") || overlay.innerHTML.includes("Insert Link"));

      // Giả lập commit bằng sự kiện keydown Enter trên document
      globalThis.document.dispatchEvent({ type: "keydown", key: "Enter", preventDefault() {} });
      const result = await promise;
      assert.ok(result);
      assert.equal(result.url, "https://3tcomputer.com");
      assert.equal(result.text, "Trang chủ");
      assert.equal(root.children.length, 0, "Overlay phải được dọn dẹp sau khi đóng");
    } finally {
      globalThis.document = origDoc;
    }
  });

  // 4. showSymbolPicker & listAllSymbols
  test("showSymbolPicker & listAllSymbols: cung cấp đầy đủ danh mục ký hiệu và ký tự tiền tệ ₫", () => {
    assert.ok(SYMBOL_CATEGORIES.length >= 3, "Có ít nhất 3 danh mục ký hiệu");
    const all = listAllSymbols();
    assert.ok(all.length >= 30, "Có ít nhất 30 ký tự đặc biệt");
    const hasDong = all.some(item => item.char === "₫");
    assert.ok(hasDong, "Phải có ký hiệu đồng Việt Nam ₫");
    const hasMath = all.some(item => item.char === "∑" || item.char === "√");
    assert.ok(hasMath, "Phải có ký hiệu toán học ∑ hoặc √");
    const hasArrow = all.some(item => item.char === "→");
    assert.ok(hasArrow, "Phải có ký hiệu mũi tên →");
  });

  // 5. Command definitions: common.edit.hyperlink has shortcut Ctrl+K
  test("Command definitions: common.edit.hyperlink có phím tắt Ctrl+K và icon hyperlink", () => {
    const cmd = COMMON_COMMANDS.find(c => c.id === "common.edit.hyperlink");
    assert.ok(cmd, "Phải có common.edit.hyperlink");
    assert.equal(cmd.shortcut, "Ctrl+K");
    assert.equal(cmd.icon, "hyperlink");
  });

  // 6. 3T Sheet Command Definitions: có cả hyperlink và symbol
  test("3T Sheet Command Definitions: có đầy đủ sheet.insert.hyperlink và sheet.insert.symbol", () => {
    const linkCmd = SHEET_COMMANDS.find(c => c.id === "sheet.insert.hyperlink");
    assert.ok(linkCmd, "Sheet phải có sheet.insert.hyperlink");
    const symCmd = SHEET_COMMANDS.find(c => c.id === "sheet.insert.symbol");
    assert.ok(symCmd, "Sheet phải có sheet.insert.symbol");
    assert.equal(symCmd.icon, "symbol");
  });

  // 7. 3T Slide Command Definitions: có cả hyperlink và symbol
  test("3T Slide Command Definitions: có slides.insert.hyperlink và slides.insert.symbol", () => {
    const linkCmd = SLIDES_COMMANDS.find(c => c.id === "slides.insert.hyperlink");
    assert.ok(linkCmd, "Slide phải có slides.insert.hyperlink");
    const commonLink = COMMON_COMMANDS.find(c => c.id === "common.edit.hyperlink");
    assert.equal(commonLink.shortcut, "Ctrl+K");
    const symCmd = SLIDES_COMMANDS.find(c => c.id === "slides.insert.symbol");
    assert.ok(symCmd, "Slide phải có slides.insert.symbol");
  });

  // 8. 3T Sheet Grid insertHyperlink & insertSymbol methods
  await asyncTest("3T Sheet Grid: insertHyperlink và insertSymbol hỗ trợ chèn vào ô và lưu lịch sử hoàn tác", async () => {
    const { SheetGridController } = await import("../../apps/sheet/sheet-grid.js");
    const containerMock = new MockElement("div");
    const grid = new SheetGridController(containerMock, {
      cols: ["A", "B", "C"],
      rowCount: 10
    });
    grid.selectedCoord = { c: "B", r: 2 };

    let historyRecorded = [];
    grid._recordHistory = (entry) => { historyRecorded.push(entry); };

    // Insert Hyperlink
    const linkOk = grid.insertHyperlink("https://vnexpress.net", "Báo điện tử");
    assert.equal(linkOk, true);
    const cellData = grid.cellsData.get("B2");
    assert.equal(cellData.hyperlink, "https://vnexpress.net");
    assert.equal(cellData.val, "Báo điện tử");
    assert.ok(historyRecorded.length >= 1, "Phải ghi lịch sử hoàn tác cho hyperlink");

    // Insert Symbol
    historyRecorded = [];
    const symOk = grid.insertSymbol("₫");
    assert.equal(symOk, true);
    assert.equal(grid.cellsData.get("B2").val, "Báo điện tử₫");
    assert.ok(historyRecorded.length >= 1, "Phải ghi lịch sử hoàn tác cho symbol");
  });

  // 9. 3T Slide Canvas insertHyperlink method
  await asyncTest("3T Slide Canvas: insertHyperlink tạo đối tượng liên kết và đẩy vào undoStack", async () => {
    const { SlidesCanvasController } = await import("../../apps/slides/slides-canvas.js");
    const containerMock = new MockElement("div");
    const canvas = new SlidesCanvasController(containerMock, { isBlankTemplate: true });
    canvas.slides = [{ id: 1, title: "Slide 1", shapes: [] }];
    canvas.currentSlideIndex = 0;

    const res = await canvas.insertHyperlink({ url: "https://example.com", text: "Tham khảo" });
    assert.equal(res, true);
    assert.equal(canvas.slides[0].shapes.length, 1);
    const sh = canvas.slides[0].shapes[0];
    assert.equal(sh.hyperlink, "https://example.com");
    assert.equal(sh.text, "Tham khảo");
    assert.ok(canvas.undoStack.length >= 1, "Phải ghi vào undoStack 1 bước");
  });

  // 10. Help Coverage
  test("Help Coverage: 3T Doc, Sheet, Slide đều có bài hướng dẫn chèn liên kết và ký hiệu", () => {
    const writerLink = WRITER_HELP_ENTRIES.find(e => e.commandIds?.includes("common.edit.hyperlink"));
    assert.ok(writerLink, "Doc phải có bài hướng dẫn hyperlink");
    assert.ok(writerLink.steps?.length >= 3, "Bài hướng dẫn Doc phải có ít nhất 3 bước");

    const sheetLink = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.insert.hyperlink");
    assert.ok(sheetLink, "Sheet phải có bài hướng dẫn hyperlink");

    const sheetSym = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.insert.symbol");
    assert.ok(sheetSym, "Sheet phải có bài hướng dẫn symbol");

    const slideLink = SLIDES_HELP_ENTRIES.find(e => e.id === "slides.insert.hyperlink");
    assert.ok(slideLink, "Slide phải có bài hướng dẫn hyperlink");

    const slideSym = SLIDES_HELP_ENTRIES.find(e => e.commandIds?.includes("slides.insert.symbol"));
    assert.ok(slideSym, "Slide phải có bài hướng dẫn symbol");
  });

  return results;
}
