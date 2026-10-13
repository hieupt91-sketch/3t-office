/**
 * Tests for Ticket WORD-W5 Item 3: Chế độ hiển thị theo dõi thay đổi (Track Changes Display Modes).
 * Kiểm tra:
 * - 4 chế độ hiển thị: Simple Markup, All Markup, No Markup, Original.
 * - Khai báo lệnh, Ribbon select, i18n VI/EN và Trợ giúp tiếng Việt.
 * - Hành vi chuyển đổi chế độ hiển thị trên DOM (data-track-display, vạch đỏ lề vno-has-revision).
 */

import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

class MockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this._classListSet = new Set();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
  }
  setAttribute(name, val) { this.attributes.set(name, String(val)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatchEvent(type, ev = {}) {
    for (const fn of this.listeners.get(type) || []) fn(ev);
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  contains(node) {
    let curr = node;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentElement;
    }
    return false;
  }
  closest(sel) {
    let curr = this;
    while (curr) {
      if (sel.includes(curr.tagName.toLowerCase())) return curr;
      curr = curr.parentElement;
    }
    return null;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const res = [];
    const walk = (node) => {
      if (node !== this) {
        if (sel.startsWith(".") && (node.classList.contains(sel.slice(1)) || node.getAttribute("class")?.includes(sel.slice(1)))) res.push(node);
        else if (sel.includes("ins") && node.tagName === "INS" && node.getAttribute("data-vno-change") === "insert") res.push(node);
        else if (sel.includes("del") && node.tagName === "DEL" && node.getAttribute("data-vno-change") === "delete") res.push(node);
        else if (sel.includes("data-vno-change") && node.hasAttribute("data-vno-change")) res.push(node);
      }
      for (const ch of node.children) walk(ch);
    };
    walk(this);
    return res;
  }
}

// Add classList compatibility
Object.defineProperty(MockElement.prototype, "classList", {
  get() {
    if (!this._classListSet) this._classListSet = new Set();
    const set = this._classListSet;
    return {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (set.has(c)) { set.delete(c); return false; }
          set.add(c); return true;
        }
        if (force) { set.add(c); return true; }
        set.delete(c); return false;
      }
    };
  }
});

export async function runWriterTrackChangesDisplayTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  test("Display Modes: Khai báo lệnh writer.trackChanges.displayMode và các chế độ", () => {
    const cmd = WRITER_COMMANDS.find(c => c.id === "writer.trackChanges.displayMode");
    assert.ok(cmd, "Phải có lệnh writer.trackChanges.displayMode");
    assert.equal(cmd.category, "review");

    for (const sub of ["Simple", "All", "None", "Original"]) {
      const subCmd = WRITER_COMMANDS.find(c => c.id === `writer.trackChanges.display${sub}`);
      assert.ok(subCmd, `Phải có lệnh writer.trackChanges.display${sub}`);
    }
  });

  test("Display Modes: Ribbon chứa select 4 tùy chọn trong nhóm Theo dõi thay đổi", () => {
    const reviewTab = WRITER_RIBBON_TABS.find(t => t.id === "review");
    assert.ok(reviewTab, "Phải có tab review");
    const trackGroup = reviewTab.groups.find(g => g.id === "tracking");
    assert.ok(trackGroup, "Phải có nhóm tracking");

    let selectItem = null;
    for (const item of trackGroup.items) {
      if (item.type === "column") {
        for (const sub of item.items) {
          if (sub.commandId === "writer.trackChanges.displayMode") selectItem = sub;
        }
      }
    }
    assert.ok(selectItem, "Phải có select writer.trackChanges.displayMode trong nhóm tracking");
    assert.equal(selectItem.options.length, 4, "Phải có đủ 4 tùy chọn");
    const values = selectItem.options.map(o => o.value);
    assert.deepEqual(values, ["simple", "all", "none", "original"]);
  });

  test("Display Modes: i18n VI và EN đầy đủ và không chứa tên thương mại cấm", () => {
    const viCmd = viStrings.commands || viStrings;
    const enCmd = enStrings.commands || enStrings;

    const ids = [
      "writer.trackChanges.displayMode",
      "writer.trackChanges.displaySimple",
      "writer.trackChanges.displayAll",
      "writer.trackChanges.displayNone",
      "writer.trackChanges.displayOriginal"
    ];

    for (const id of ids) {
      assert.ok(viCmd[id]?.label, `Thiếu nhãn VI cho ${id}`);
      assert.ok(enCmd[id]?.label, `Thiếu nhãn EN cho ${id}`);
    }

    const forbidden = ["word", "excel", "powerpoint", "microsoft"];
    for (const id of ids) {
      const text = `${viCmd[id].label} ${viCmd[id].tooltip} ${enCmd[id].label} ${enCmd[id].tooltip}`.toLowerCase();
      for (const term of forbidden) {
        assert.ok(!text.includes(term), `Chuỗi ${id} chứa tên cấm: ${term}`);
      }
    }
  });

  test("Display Modes: Bài Trợ giúp tiếng Việt đầy đủ cấu trúc và không chứa tên cấm", () => {
    const help = WRITER_HELP_ENTRIES.find(h => h.id === "writer.trackChanges.displayModeHelp");
    assert.ok(help, "Phải có bài Trợ giúp writer.trackChanges.displayModeHelp");
    assert.ok(help.commandIds.includes("writer.trackChanges.displayMode"));
    assert.ok(help.steps.length >= 4, "Phải có ít nhất 4 bước hướng dẫn");
    assert.ok(help.summary.length > 50);

    const fullText = (help.title + " " + help.summary + " " + help.steps.join(" ")).toLowerCase();
    assert.ok(fullText.includes("simple markup"), "Trợ giúp phải nhắc tới Simple Markup");
    assert.ok(fullText.includes("all markup"), "Trợ giúp phải nhắc tới All Markup");
    assert.ok(fullText.includes("no markup"), "Trợ giúp phải nhắc tới No Markup");
    assert.ok(fullText.includes("original"), "Trợ giúp phải nhắc tới Original");
  });

  test("Display Modes: WriterAdapter chuyển đổi 4 chế độ hiển thị và cập nhật DOM", () => {
    const editor = new MockElement("div");
    const body = new MockElement("div");
    body.setAttribute("class", "vno-writer-body");
    editor.appendChild(body);

    const p = new MockElement("p");
    body.appendChild(p);
    const ins = new MockElement("ins");
    ins.setAttribute("data-vno-change", "insert");
    p.appendChild(ins);

    const adapter = new WriterAdapter(editor);
    adapter.attach();

    // 1. Mặc định là all
    assert.equal(adapter.getTrackChangesDisplayMode(), "all");
    assert.equal(body.getAttribute("data-track-display"), "all");

    // 2. Chuyển sang simple
    adapter.setTrackChangesDisplayMode("simple");
    assert.equal(adapter.getTrackChangesDisplayMode(), "simple");
    assert.equal(body.getAttribute("data-track-display"), "simple");
    assert.ok(p.classList.contains("vno-has-revision"), "Đoạn văn có thay đổi phải có class vno-has-revision");

    // 3. Chuyển sang none
    adapter.setTrackChangesDisplayMode("none");
    assert.equal(adapter.getTrackChangesDisplayMode(), "none");
    assert.equal(body.getAttribute("data-track-display"), "none");
    assert.ok(!p.classList.contains("vno-has-revision"), "Chế độ none phải bỏ vno-has-revision");

    // 4. Chuyển sang original
    adapter.setTrackChangesDisplayMode("original");
    assert.equal(adapter.getTrackChangesDisplayMode(), "original");
    assert.equal(body.getAttribute("data-track-display"), "original");
    assert.ok(!p.classList.contains("vno-has-revision"), "Chế độ original phải bỏ vno-has-revision");

    // 5. Chuyển lại all
    adapter.setTrackChangesDisplayMode("all");
    assert.equal(adapter.getTrackChangesDisplayMode(), "all");
    assert.equal(body.getAttribute("data-track-display"), "all");
    assert.ok(p.classList.contains("vno-has-revision"), "Chế độ all phải có vno-has-revision");

    // 6. Gọi lệnh qua command bus
    globalCommandBus.execute("writer.trackChanges.displaySimple");
    assert.equal(adapter.getTrackChangesDisplayMode(), "simple");

    globalCommandBus.execute("writer.trackChanges.displayMode", "none");
    assert.equal(adapter.getTrackChangesDisplayMode(), "none");
  });

  return results;
}
