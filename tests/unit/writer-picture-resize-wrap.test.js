/**
 * VN Writer — Picture Resize Handles & Wrap Text Menu
 * Tests for 8 resize handles, aspect ratio locking on corners,
 * quick wrap menu, and size controls.
 */
import assert from "node:assert/strict";
import { WriterArrangeController, WRAP_STYLES } from "../../apps/writer/writer-arrange.js";
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
    this._innerHTML = "";
    this.offsetWidth = 200;
    this.offsetHeight = 100;
  }

  get isConnected() { return true; }

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
        else if (sel.includes("[data-handle")) {
          const match = sel.match(/data-handle=['"]?([^'"\]]+)/);
          if (match && child.dataset.handle === match[1]) results.push(child);
        }
        else if (child.tagName.toLowerCase() === sel.toLowerCase()) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  getBoundingClientRect() {
    const w = parseFloat(this.style.width) || this.offsetWidth || 200;
    const h = parseFloat(this.style.height) || this.offsetHeight || 100;
    return { left: 50, top: 50, right: 50 + w, bottom: 50 + h, width: w, height: h };
  }
}

function setupEnvironment() {
  const root = new MockElement("div");
  root.id = "root";
  const page = new MockElement("div");
  page.className = "vno-writer-page";
  const body = new MockElement("div");
  body.className = "vno-writer-body";

  root.appendChild(page);
  page.appendChild(body);

  const img = new MockElement("img");
  img.style.width = "200px";
  img.style.height = "100px";
  img.offsetWidth = 200;
  img.offsetHeight = 100;
  body.appendChild(img);

  global.document = {
    createElement(tag) { return new MockElement(tag); },
    body: root,
    addEventListener(type, fn) { root.addEventListener(type, fn); },
    removeEventListener(type, fn) { root.removeEventListener(type, fn); }
  };
  global.window = {
    addEventListener() {},
    removeEventListener() {}
  };

  const adapter = {
    isDirty: false,
    flushTyping() {},
    recordSnapshot(action) { this.lastAction = action; },
    _recomputeLivePagination() {}
  };

  const controller = new WriterArrangeController({
    body,
    page,
    adapter,
    mountElement: root
  }).attach();

  return { root, page, body, img, adapter, controller };
}

export async function runWriterPictureResizeWrapTests() {
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

  await test("Picture selection: sinh overlay với 8 tay cầm và nút ngắt dòng nhanh", () => {
    const { img, controller, page } = setupEnvironment();
    controller.selectImage(img);

    assert.ok(img.classList.contains("is-vno-image-selected"));
    assert.ok(controller.overlay, "Phải có overlay resize");

    const handles = controller.overlay.querySelectorAll(".vno-image-resize-handle");
    assert.equal(handles.length, 8, "Phải có đúng 8 tay cầm (4 góc + 4 cạnh)");

    const quickWrapBtn = controller.overlay.querySelector(".vno-image-quick-wrap-btn");
    assert.ok(quickWrapBtn, "Phải có nút chọn ngắt dòng nhanh trên ảnh");
  });

  await test("Corner resize: giữ nguyên tỷ lệ khung hình (Aspect Ratio Locked) khi kéo góc", () => {
    const { img, controller, root } = setupEnvironment();
    controller.selectImage(img);

    // Kích thước ban đầu 200x100 -> tỷ lệ aspect ratio = 2.0
    img.style.width = "200px";
    img.style.height = "100px";
    img.offsetWidth = 200;
    img.offsetHeight = 100;

    const seHandle = controller.overlay.querySelector("[data-handle='se']");
    assert.ok(seHandle, "Thiếu tay cầm se (bottom-right)");

    // Kéo góc se sang phải 50px
    seHandle.dispatchEvent({ type: "mousedown", clientX: 250, clientY: 150, preventDefault() {}, stopPropagation() {} });
    root.dispatchEvent({ type: "mousemove", clientX: 300, clientY: 150 });
    root.dispatchEvent({ type: "mouseup" });

    // Chiều rộng mới = 250px, chiều cao mới phải là 250 / 2.0 = 125px
    assert.equal(img.style.width, "250px");
    assert.equal(img.style.height, "125px");
    const ratio = parseFloat(img.style.width) / parseFloat(img.style.height);
    assert.equal(Math.round(ratio * 10) / 10, 2.0);
  });

  await test("Edge resize: thay đổi kích thước theo 1 trục độc lập", () => {
    const { img, controller, root } = setupEnvironment();
    controller.selectImage(img);

    img.style.width = "200px";
    img.style.height = "100px";
    img.offsetWidth = 200;
    img.offsetHeight = 100;

    const eHandle = controller.overlay.querySelector("[data-handle='e']");
    assert.ok(eHandle, "Thiếu tay cầm e (middle-right)");

    // Kéo tay cầm e sang phải 60px (chỉ đổi chiều rộng)
    eHandle.dispatchEvent({ type: "mousedown", clientX: 250, clientY: 100, preventDefault() {}, stopPropagation() {} });
    root.dispatchEvent({ type: "mousemove", clientX: 310, clientY: 100 });
    root.dispatchEvent({ type: "mouseup" });

    assert.equal(img.style.width, "260px");
    assert.equal(img.style.height, "100px"); // chiều cao giữ nguyên
  });

  await test("Wrap text menu: hiển thị đủ 6 tùy chọn ngắt dòng và cập nhật kiểu bọc chữ", () => {
    const { img, controller } = setupEnvironment();
    controller.selectImage(img);

    const wrapBtn = controller.overlay.querySelector(".vno-image-quick-wrap-btn");
    wrapBtn.dispatchEvent({ type: "click", stopPropagation() {} });

    assert.ok(controller.wrapMenu, "Phải mở menu ngắt dòng");
    const options = controller.wrapMenu.querySelectorAll(".vno-image-wrap-option");
    assert.equal(options.length, 6, "Phải có đủ 6 kiểu ngắt dòng văn bản");

    // Chọn kiểu square
    controller.applyWrap("square");
    assert.equal(img.dataset.vnoWrap, "square");
    assert.equal(img.style.float, "left");

    // Chọn kiểu front
    controller.applyWrap("front");
    assert.equal(img.dataset.vnoWrap, "front");
    assert.equal(img.style.position, "absolute");
    assert.equal(img.style.zIndex, "10");
  });

  await test("Direct size setting: setImageSize cập nhật kích thước ảnh và ghi snapshot", () => {
    const { img, controller, adapter } = setupEnvironment();
    controller.selectImage(img);

    controller.setImageSize(320, 240);
    assert.equal(img.style.width, "320px");
    assert.equal(img.style.height, "240px");
    assert.equal(adapter.lastAction, "writer.image.resize");
  });

  await test("Deselection: dọn dẹp overlay và đóng menu ngắt dòng", () => {
    const { img, controller } = setupEnvironment();
    controller.selectImage(img);
    assert.ok(controller.overlay);

    controller.clearSelection();
    assert.equal(controller.selectedImage, null);
    assert.equal(controller.overlay, null);
    assert.equal(controller.wrapMenu, null);
  });

  global.document = __savedGlobalDocument; global.window = __savedGlobalWindow; // tra lai moi truong cho cac bo test sau
  return results;
}
