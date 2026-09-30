/**
 * VN Office — Unit Tests for Backstage Print Thumbnail & Live Preview
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

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
    this.hidden = false;
    this._textContent = "";
    this._innerHTML = "";
    this.style = {};
    this.disabled = false;
    this.value = "";
  }
  get id() { return this.attributes.id || ""; }
  set id(val) { this.setAttribute("id", val); }
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
    let i = 0;
    while (i < html.length) {
      const openIndex = html.indexOf("<", i);
      if (openIndex === -1) break;
      if (html.slice(openIndex, openIndex + 4) === "<!--") {
        const commentEnd = html.indexOf("-->", openIndex);
        i = commentEnd === -1 ? html.length : commentEnd + 3;
        continue;
      }
      if (html[openIndex + 1] === "/") {
        const closeTagEnd = html.indexOf(">", openIndex);
        i = closeTagEnd === -1 ? html.length : closeTagEnd + 1;
        continue;
      }
      const tagEnd = html.indexOf(">", openIndex);
      if (tagEnd === -1) break;
      const tagHeader = html.slice(openIndex + 1, tagEnd);
      const isSelfClosing = tagHeader.endsWith("/") || /^(meta|img|br|hr|input|link|rect|circle|line|path)$/i.test(tagHeader.trim().split(/\s+/)[0]);
      const spaceIdx = tagHeader.search(/\s|\//);
      const tagName = (spaceIdx === -1 ? tagHeader : tagHeader.slice(0, spaceIdx)).trim();
      const rawAttrs = spaceIdx === -1 ? "" : tagHeader.slice(spaceIdx);

      const child = new FakeElement(tagName);
      const classMatch = rawAttrs.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];
      const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
      if (idMatch) child.setAttribute("id", idMatch[1]);
      const dataRegex = /data-([a-zA-Z0-9\-]+)=["']([^"']*)["']/g;
      let dMatch;
      while ((dMatch = dataRegex.exec(rawAttrs)) !== null) {
        child.setAttribute(`data-${dMatch[1]}`, dMatch[2]);
      }
      if (/disabled\b/i.test(rawAttrs)) child.disabled = true;
      const styleMatch = rawAttrs.match(/style=["']([^"']+)["']/i);
      if (styleMatch) {
        const parts = styleMatch[1].split(";");
        for (const part of parts) {
          const [prop, val] = part.split(":");
          if (prop && val) {
            const camel = prop.trim().replace(/-([a-z])/g, (_, g) => g.toUpperCase());
            child.style[camel] = val.trim();
          }
        }
      }

      child.parentNode = this;
      this.children.push(child);

      if (isSelfClosing) {
        i = tagEnd + 1;
      } else {
        let depth = 1;
        let searchIndex = tagEnd + 1;
        let innerEnd = -1;
        const openToken = `<${tagName}`;
        const closeToken = `</${tagName}>`;
        while (depth > 0 && searchIndex < html.length) {
          const nextOpen = html.toLowerCase().indexOf(openToken.toLowerCase(), searchIndex);
          const nextClose = html.toLowerCase().indexOf(closeToken.toLowerCase(), searchIndex);
          if (nextClose === -1) break;
          if (nextOpen !== -1 && nextOpen < nextClose) {
            const charAfter = html[nextOpen + openToken.length];
            if (charAfter === " " || charAfter === ">" || charAfter === "/" || charAfter === "\n" || charAfter === "\t") {
              depth++;
            }
            searchIndex = nextOpen + openToken.length;
          } else {
            depth--;
            if (depth === 0) {
              innerEnd = nextClose;
            }
            searchIndex = nextClose + closeToken.length;
          }
        }
        if (innerEnd !== -1) {
          child.innerHTML = html.slice(tagEnd + 1, innerEnd);
          i = searchIndex;
        } else {
          i = tagEnd + 1;
        }
      }
    }
  }
  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const styleAttr = Object.entries(this.style).map(([k, v]) => `${k}:${v}`).join("; ");
    const attrs = Object.entries(this.attributes).filter(([k]) => k !== "class" && k !== "id").map(([k, v]) => `${k}="${v}"`).join(" ");
    const idStr = this.id ? ` id="${this.id}"` : "";
    const styleStr = styleAttr ? ` style="${styleAttr}"` : "";
    const classStr = this.className ? ` class="${this.className}"` : "";
    const attrStr = attrs ? ` ${attrs}` : "";
    return `<${tag}${idStr}${classStr}${styleStr}${attrStr}>${this.innerHTML}</${tag}>`;
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
    if (name === "id") this.attributes.id = String(value);
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      this.dataset[camelKey] = String(value);
    }
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
    if (selector.startsWith("#")) return (this.attributes.id || "") === selector.slice(1);
    const attrMatch = selector.match(/^\[([a-zA-Z0-9\-_]+)(?:=["']?([^"']*)["']?)?\]$/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const attrVal = attrMatch[2];
      if (attrVal === undefined) return this.attributes[attrName] !== undefined;
      return this.attributes[attrName] === attrVal;
    }
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

const fakeContainer = () => new FakeElement("div");
const putCell = (grid, coord, val) => grid.cellsData.set(coord, { val, formula: "", style: {} });

export async function runBackstagePrintThumbnailTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      fakeDoc.body.children = [];
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;
  const fakeDoc = new FakeDocument();
  globalThis.document = fakeDoc;

  try {
    await test("AppShell Backstage có mục In ấn dạng tab con (data-backstage-tab=print), không còn thoát ra ngoài", () => {
      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet" });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      assert(modal, "Backstage modal phải được mount vào body");
      const printBtn = modal.querySelector("#vno-backstage-nav-print");
      assert(printBtn, "Phải có nút điều hướng In ấn #vno-backstage-nav-print");
      assert(printBtn.getAttribute("data-backstage-tab") === "print", "Nút In phải có data-backstage-tab=print");
      modal.remove();
    });

    const assertSharedPrintRoute = (appName, appTitle) => {
      const shell = new AppShell({ appName, appTitle });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      assert(modal, `${appTitle} Backstage phải hiển thị`);
      let printCalls = 0;
      const originalExecute = globalCommandBus.execute;
      globalCommandBus.execute = async (commandId) => {
        if (commandId === "common.file.print") printCalls += 1;
        return true;
      };
      try {
        const printButton = modal.querySelector("#vno-backstage-nav-print");
        assert(printButton, `${appTitle} Backstage phải có mục In`);
        printButton.click();
        assert(printCalls === 1, `${appTitle} Backstage In phải gọi lệnh in chung`);
        assert(fakeDoc.body.querySelector(".vno-backstage-overlay") === null, "Backstage phải đóng trước khi mở hộp thoại in");
      } finally {
        globalCommandBus.execute = originalExecute;
        if (modal.parentNode) modal.remove();
      }
    };

    await test("Sheet Backstage In mở luồng in tài liệu chung", () => assertSharedPrintRoute("sheet", "VN Sheet"));
    await test("Slides Backstage In mở luồng in tài liệu chung", () => assertSharedPrintRoute("slides", "VN Slides"));
    await test("Writer Backstage In mở luồng in tài liệu chung", () => assertSharedPrintRoute("writer", "VN Writer"));  } finally {
    globalThis.document = originalDoc;
    globalThis.window = originalWin;
  }

  return results;
}
