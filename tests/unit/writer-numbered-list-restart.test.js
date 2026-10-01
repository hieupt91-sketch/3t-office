/**
 * VN Writer — Numbered List Restart at 1 / Continue Numbering Unit Tests
 */
import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WriterApp } from "../../apps/writer/writer-app.js";

class MockClassList {
  constructor(owner) { this.owner = owner; }
  _set() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(n) { const s = this._set(); s.add(n); this.owner.className = [...s].join(" "); }
  remove(n) { const s = this._set(); s.delete(n); this.owner.className = [...s].join(" "); }
  contains(n) { return this._set().has(n); }
  toggle(n) {
    if (this.contains(n)) { this.remove(n); return false; }
    this.add(n); return true;
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
    this.attributes = {};
    this.listeners = {};
    this.id = "";
    this._innerHTML = "";
    this.dataset = {};
  }

  get isConnected() { return true; }

  get firstElementChild() {
    return this.children.length > 0 ? this.children[0] : null;
  }

  get textContent() {
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(v) {
    this._innerHTML = String(v);
    this.children = [];
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }

  closest(sel) {
    const targetTag = sel.toUpperCase();
    let cur = this;
    while (cur) {
      if (cur.tagName === targetTag) return cur;
      if (sel.startsWith(".") && cur.classList.contains(sel.slice(1))) return cur;
      cur = cur.parentElement;
    }
    return null;
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

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx >= 0) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
      this.parentNode = null;
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
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  removeAttribute(k) { delete this.attributes[k]; }
  getBoundingClientRect() { return { left: 50, top: 50, right: 250, bottom: 150, width: 200, height: 100 }; }
  focus() {}
}

function setupMockEnvironment() {
  const root = new MockElement("div");
  root.id = "root";
  const body = new MockElement("div");
  body.className = "vno-writer-body";
  root.appendChild(body);

  global.document = {
    createElement(tag) { return new MockElement(tag); },
    body: root,
    addEventListener(type, fn) { root.addEventListener(type, fn); },
    removeEventListener(type, fn) { root.removeEventListener(type, fn); },
    querySelector(sel) { return root.querySelector(sel); },
    querySelectorAll(sel) { return root.querySelectorAll(sel); }
  };
  global.window = {
    getSelection() { return null; },
    innerWidth: 1024,
    innerHeight: 768
  };

  return { root, body };
}

export async function runWriterNumberedListRestartTests() {
  const __savedGlobalDocument = global.document; const __savedGlobalWindow = global.window;
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Command definitions: writer.list.restartNumbering & continueNumbering khai báo đầy đủ", () => {
    const restartCmd = WRITER_COMMANDS.find(c => c.id === "writer.list.restartNumbering");
    const continueCmd = WRITER_COMMANDS.find(c => c.id === "writer.list.continueNumbering");

    assert.ok(restartCmd, "Thiếu writer.list.restartNumbering");
    assert.equal(restartCmd.category, "paragraph");
    assert.ok(restartCmd.label);

    assert.ok(continueCmd, "Thiếu writer.list.continueNumbering");
    assert.equal(continueCmd.category, "paragraph");
    assert.ok(continueCmd.label);
  });

  await test("Ribbon: dropdown writer.list.restartNumbering hiện diện trong nhóm Đoạn văn", () => {
    const homeTab = WRITER_RIBBON_TABS.find(t => t.id === "home");
    const paraGroup = homeTab.groups.find(g => g.id === "paragraph");
    const items = paraGroup.items[0].items[0].items; // row 1
    const dropdown = items.find(i => i.id === "writer.list.restartNumbering");

    assert.ok(dropdown, "Thiếu dropdown tùy chọn đánh số");
    assert.equal(dropdown.type, "dropdown");
    assert.equal(dropdown.items.length, 2);
    assert.equal(dropdown.items[0].commandId, "writer.list.restartNumbering");
    assert.equal(dropdown.items[1].commandId, "writer.list.continueNumbering");
  });

  await test("Help coverage: bài viết Hướng dẫn Đánh số lại từ 1 và Tiếp tục đánh số chuẩn chỉ", () => {
    const entry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.list.restartContinue");
    assert.ok(entry, "Thiếu bài help writer.list.restartContinue");
    assert.ok(entry.steps.length >= 4, "Bài help phải có ít nhất 4 bước cụ thể");
    assert.deepEqual(entry.commandIds, ["writer.list.restartNumbering", "writer.list.continueNumbering"]);
    assert.equal(entry.ribbon.tabId, "home");
    assert.equal(entry.ribbon.group, "Đoạn văn");
  });

  await test("Adapter restartNumbering: đánh số lại từ 1 trên mục đầu tiên đặt start=1", () => {
    const { body } = setupMockEnvironment();
    const ol = new MockElement("ol");
    ol.id = "ol1";
    const li1 = new MockElement("li");
    li1.textContent = "Mục A";
    const li2 = new MockElement("li");
    li2.textContent = "Mục B";
    ol.appendChild(li1);
    ol.appendChild(li2);
    body.appendChild(ol);

    const adapter = new WriterAdapter();
    adapter.body = body;
    adapter.bodyDom = body;

    let snapshotRecorded = null;
    adapter.recordSnapshot = (action) => { snapshotRecorded = action; };

    const ok = adapter.restartNumbering(li1);
    assert.ok(ok);
    assert.equal(ol.getAttribute("start"), "1");
    assert.equal(snapshotRecorded, "Đánh số lại từ 1");
  });

  await test("Adapter restartNumbering: đánh số lại từ 1 ở mục giữa đặt value=1", () => {
    const { body } = setupMockEnvironment();
    const ol = new MockElement("ol");
    ol.id = "ol1";
    const li1 = new MockElement("li");
    li1.textContent = "Mục 1";
    const li2 = new MockElement("li");
    li2.id = "mid";
    li2.textContent = "Mục 2";
    const li3 = new MockElement("li");
    li3.textContent = "Mục 3";
    ol.appendChild(li1);
    ol.appendChild(li2);
    ol.appendChild(li3);
    body.appendChild(ol);

    const adapter = new WriterAdapter();
    adapter.body = body;
    adapter.bodyDom = body;

    const ok = adapter.restartNumbering(li2);
    assert.ok(ok);
    assert.equal(li2.getAttribute("value"), "1");
    assert.equal(li2.dataset.vnoRestart, "true");
  });

  await test("Adapter continueNumbering: tiếp tục đánh số nối tiếp danh sách trước đó", () => {
    const { body } = setupMockEnvironment();

    const ol1 = new MockElement("ol");
    ol1.id = "ol1";
    const liA = new MockElement("li");
    liA.textContent = "A";
    const liB = new MockElement("li");
    liB.textContent = "B";
    ol1.appendChild(liA);
    ol1.appendChild(liB);
    body.appendChild(ol1);

    const p = new MockElement("p");
    p.textContent = "Đoạn ngăn";
    body.appendChild(p);

    const ol2 = new MockElement("ol");
    ol2.id = "ol2";
    const liC = new MockElement("li");
    liC.id = "target";
    liC.textContent = "C";
    const liD = new MockElement("li");
    liD.textContent = "D";
    ol2.appendChild(liC);
    ol2.appendChild(liD);
    body.appendChild(ol2);

    const adapter = new WriterAdapter();
    adapter.body = body;
    adapter.bodyDom = body;

    let snapshotRecorded = null;
    adapter.recordSnapshot = (action) => { snapshotRecorded = action; };

    const ok = adapter.continueNumbering(liC);
    assert.ok(ok);
    // Danh sách 1 có 2 mục (start=1 mặc định) -> danh sách 2 tiếp tục từ 3
    assert.equal(ol2.getAttribute("start"), "3");
    assert.equal(ol2.dataset.vnoContinue, "true");
    assert.equal(snapshotRecorded, "Tiếp tục đánh số");
  });

  await test("Adapter continueNumbering: gỡ bỏ thuộc tính value khi nối tiếp", () => {
    const { body } = setupMockEnvironment();

    const ol1 = new MockElement("ol");
    ol1.id = "ol1";
    const liA = new MockElement("li");
    liA.textContent = "A";
    const liB = new MockElement("li");
    liB.id = "target";
    liB.setAttribute("value", "1");
    liB.textContent = "B";
    ol1.appendChild(liA);
    ol1.appendChild(liB);
    body.appendChild(ol1);

    const adapter = new WriterAdapter();
    adapter.body = body;
    adapter.bodyDom = body;

    const ok = adapter.continueNumbering(liB);
    assert.ok(ok);
    assert.equal(liB.hasAttribute("value"), false);
  });

  global.document = __savedGlobalDocument; global.window = __savedGlobalWindow; // tra lai moi truong cho cac bo test sau
  return results;
}
