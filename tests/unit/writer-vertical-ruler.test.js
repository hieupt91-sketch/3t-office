/**
 * VN Office — Unit Tests: Thước đo dọc (Vertical Ruler) trong VN Writer (Doc)
 * Đảm bảo thước đo dọc hiển thị chuẩn, tự động đồng bộ theo cuộn trang/zoom,
 * ẩn/hiện đồng bộ cùng thước ngang và có hướng dẫn sử dụng tiếng Việt chi tiết.
 */

import assert from "node:assert/strict";
import { WriterViewController } from "../../apps/writer/writer-view-controller.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) { this.classes.add(cls); }
  delete(cls) { this.classes.delete(cls); }
  has(cls) { return this.classes.has(cls); }
  toggle(cls, val) {
    if (val === undefined) val = !this.classes.has(cls);
    if (val) this.classes.add(cls);
    else this.classes.delete(cls);
    return val;
  }
  contains(cls) { return this.classes.has(cls); }
}

class MockElement {
  constructor(className = "") {
    this.className = className;
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; }
    };
    this.dataset = {};
    this.hidden = false;
    this.classList = new MockClassList();
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this._rect = { top: 30, left: 20, width: 794, height: 1123 };
    this.offsetHeight = 1123;
    this.scrollHeight = 1123;
    this.offsetWidth = 794;
    this.clientWidth = 900;
  }

  setAttribute(k, v) { this.attributes.set(k, v); }
  getAttribute(k) { return this.attributes.get(k) || null; }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  querySelector(sel) {
    if (sel.startsWith(".")) {
      const cls = sel.slice(1);
      return this._find((el) => el.className && el.className.split(" ").includes(cls));
    }
    return null;
  }

  _find(predicate) {
    for (const c of this.children) {
      if (predicate(c)) return c;
      const f = c._find?.(predicate);
      if (f) return f;
    }
    return null;
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(cb => cb !== fn));
  }

  dispatchEvent(evt) {
    const list = this.listeners.get(evt.type) || [];
    for (const cb of list) cb(evt);
  }

  getBoundingClientRect() {
    return { ...this._rect };
  }
}

export async function runWriterVerticalRulerTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  await test("Vertical Ruler: Định nghĩa lệnh và chuỗi bản dịch VI/EN thể hiện cả thước ngang và dọc", () => {
    const def = WRITER_COMMANDS.find(c => c.id === "writer.view.ruler");
    assert.ok(def, "Lệnh writer.view.ruler phải tồn tại trong WRITER_COMMANDS");
    assert.match(def.tooltip, /thước đo dọc|thước dọc/i, "Tooltip định nghĩa phải mô tả cả thước dọc");

    const vi = viStrings.commands["writer.view.ruler"];
    assert.ok(vi, "Bản dịch tiếng Việt phải tồn tại");
    assert.match(vi.tooltip, /thước đo dọc|thước dọc/i, "Tooltip tiếng Việt phải đề cập thước dọc");

    const en = enStrings.commands["writer.view.ruler"];
    assert.ok(en, "Bản dịch tiếng Anh phải tồn tại");
    assert.match(en.tooltip, /vertical/i, "Tooltip tiếng Anh phải đề cập vertical ruler");
  });

  await test("Vertical Ruler: Cấu trúc DOM của thước dọc có track, scale và hai điểm đánh dấu lề", () => {
    const verticalRuler = new MockElement("vno-writer-ruler-vertical");
    const track = new MockElement("vno-ruler-vertical-track");
    const markerTop = new MockElement("vno-ruler-marker-top");
    markerTop.setAttribute("title", "Lề trên: 20mm (NĐ 30/2020/NĐ-CP)");
    const scale = new MockElement("vno-ruler-vertical-scale");
    const markerBottom = new MockElement("vno-ruler-marker-bottom");
    markerBottom.setAttribute("title", "Lề dưới: 20mm (NĐ 30/2020/NĐ-CP)");

    track.appendChild(markerTop);
    track.appendChild(scale);
    track.appendChild(markerBottom);
    verticalRuler.appendChild(track);

    assert.ok(verticalRuler.querySelector(".vno-ruler-vertical-track"));
    assert.ok(verticalRuler.querySelector(".vno-ruler-marker-top"));
    assert.ok(verticalRuler.querySelector(".vno-ruler-vertical-scale"));
    assert.ok(verticalRuler.querySelector(".vno-ruler-marker-bottom"));
    assert.match(markerTop.getAttribute("title"), /Lề trên: 20mm/);
    assert.match(markerBottom.getAttribute("title"), /Lề dưới: 20mm/);
  });

  await test("Vertical Ruler: toggleRuler ẩn/hiện đồng bộ cả thước ngang và thước dọc", () => {
    const container = new MockElement("vno-writer-container");
    const viewport = new MockElement("vno-writer-viewport");
    const page = new MockElement("vno-writer-page");
    const ruler = new MockElement("vno-writer-ruler");
    const verticalRuler = new MockElement("vno-writer-ruler-vertical");
    const track = new MockElement("vno-ruler-vertical-track");
    verticalRuler.appendChild(track);

    const shell = {
      zoomLevel: 100,
      subscribeZoom() { return () => {}; },
      setZoomLevel() {},
      setZoomDisplay() {}
    };

    const vc = new WriterViewController({
      container,
      viewport,
      page,
      ruler,
      verticalRuler,
      shell
    });

    vc.attach();
    assert.equal(ruler.hidden, false, "Thước ngang mặc định hiện");
    assert.equal(verticalRuler.hidden, false, "Thước dọc mặc định hiện");

    // Toggle tắt thước
    vc.toggleRuler();
    assert.equal(ruler.hidden, true, "Thước ngang phải ẩn khi toggle tắt");
    assert.equal(verticalRuler.hidden, true, "Thước dọc phải ẩn khi toggle tắt");

    // Toggle bật lại thước
    vc.toggleRuler();
    assert.equal(ruler.hidden, false, "Thước ngang phải hiện khi toggle bật");
    assert.equal(verticalRuler.hidden, false, "Thước dọc phải hiện khi toggle bật");

    vc.destroy();
  });

  await test("Vertical Ruler: chuyển sang chế độ đọc (readMode) ẩn cả hai thước", () => {
    const container = new MockElement("vno-writer-container");
    const viewport = new MockElement("vno-writer-viewport");
    const page = new MockElement("vno-writer-page");
    const ruler = new MockElement("vno-writer-ruler");
    const verticalRuler = new MockElement("vno-writer-ruler-vertical");
    const track = new MockElement("vno-ruler-vertical-track");
    verticalRuler.appendChild(track);

    const shell = {
      zoomLevel: 100,
      subscribeZoom() { return () => {}; },
      setZoomLevel() {},
      setZoomDisplay() {}
    };

    const vc = new WriterViewController({
      container,
      viewport,
      page,
      ruler,
      verticalRuler,
      shell
    });

    vc.attach();
    vc.setMode("readMode");
    assert.equal(ruler.hidden, true, "Thước ngang phải ẩn trong readMode");
    assert.equal(verticalRuler.hidden, true, "Thước dọc phải ẩn trong readMode");

    vc.setMode("printLayout");
    assert.equal(ruler.hidden, false, "Thước ngang phục hồi trong printLayout");
    assert.equal(verticalRuler.hidden, false, "Thước dọc phục hồi trong printLayout");

    vc.destroy();
  });

  await test("Vertical Ruler: _syncVerticalRuler tính toán chiều cao và translateY khớp vị trí trang", () => {
    const container = new MockElement("vno-writer-container");
    const viewport = new MockElement("vno-writer-viewport");
    const page = new MockElement("vno-writer-page");
    const ruler = new MockElement("vno-writer-ruler");
    const verticalRuler = new MockElement("vno-writer-ruler-vertical");
    const track = new MockElement("vno-ruler-vertical-track");
    verticalRuler.appendChild(track);

    viewport._rect = { top: 100, left: 50, width: 900, height: 600 };
    page._rect = { top: 130, left: 100, width: 794, height: 1123 };
    page.scrollHeight = 1123;

    const shell = {
      zoomLevel: 100,
      subscribeZoom() { return () => {}; },
      setZoomLevel() {},
      setZoomDisplay() {}
    };

    const vc = new WriterViewController({
      container,
      viewport,
      page,
      ruler,
      verticalRuler,
      shell
    });

    vc.attach();
    assert.equal(track.style.height, "1123px");
    assert.equal(track.style.transform, "translateY(30px)");

    // Khi cuộn trang xuống 80px: page.top giảm từ 130 xuống 50
    page._rect.top = 50;
    vc._syncVerticalRuler();
    assert.equal(track.style.transform, "translateY(-50px)");

    // Khi thay đổi zoom lên 150%
    vc.setZoom(1.5);
    assert.equal(track.style.height, `${Math.ceil(1123 * 1.5)}px`);

    vc.destroy();
  });

  await test("Vertical Ruler: Bài viết Help tiếng Việt hướng dẫn chi tiết cả thước ngang và dọc", () => {
    const entry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.view.showAndWindow");
    assert.ok(entry, "Bài help writer.view.showAndWindow phải tồn tại");
    assert.ok(entry.commandIds.includes("writer.view.ruler"), "Phải chứa lệnh writer.view.ruler");
    assert.equal(entry.ribbon.tabId, "view");
    assert.equal(entry.ribbon.group, "Hiển thị");

    const fullText = [entry.title, entry.summary, ...entry.steps].join(" ");
    assert.match(fullText, /thước ngang/i, "Phải giải thích thước ngang");
    assert.match(fullText, /thước dọc/i, "Phải giải thích thước dọc");
    assert.match(fullText, /lề trên/i, "Phải nêu lề trên");
    assert.match(fullText, /lề dưới/i, "Phải nêu lề dưới");
    assert.match(fullText, /30\s*mm/i, "Phải nêu mốc lề 30 mm");
    assert.match(fullText, /Nghị định 30|NĐ 30/i, "Phải nêu quy chuẩn NĐ 30");
  });

  return results;
}
