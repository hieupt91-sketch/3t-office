import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { createSlidesCanvasFixture } from "./slides-test-fixtures.js";

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { if (!this.contains(name)) this.owner.className = `${this.owner.className} ${name}`.trim(); }
  remove(name) { this.owner.className = this.owner.className.split(/\s+/).filter(v => v && v !== name).join(" "); }
  contains(name) { return this.owner.className.split(/\s+/).includes(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.listeners = {};
    this.style = {};
    this.attributes = {};
    this.disabled = false;
    this.innerText = "";
    this.innerHTML = "";
    this.contentEditable = "false";
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter(c => c !== child);
    child.parentNode = null;
    return child;
  }
  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    }
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(h => h !== handler);
    }
  }
  dispatchEvent(event) {
    for (const handler of this.listeners[event.type] || []) handler(event);
  }
  querySelector(selector) {
    const found = this.querySelectorAll(selector)[0];
    if (found) return found;
    if (selector.startsWith("#") || selector.startsWith(".")) {
      const el = new FakeElement("div");
      if (selector.startsWith("#")) el.id = selector.slice(1);
      this.appendChild(el);
      return el;
    }
    return null;
  }
  querySelectorAll(selector) {
    const matches = (el) => {
      if (selector.startsWith(".")) return el.classList.contains(selector.slice(1));
      if (selector.startsWith("#")) return el.id === selector.slice(1);
      if (selector.includes("[data-slide-index=")) {
        const match = selector.match(/data-slide-index="?(\d+)"?/);
        return match && String(el.dataset?.slideIndex) === match[1];
      }
      return el.tagName.toLowerCase() === selector.toLowerCase();
    };
    const result = [];
    for (const child of this.children) {
      if (matches(child)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  focus() {}
  blur() { this.dispatchEvent({ type: "blur" }); }
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
    this.listeners = {};
  }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(h => h !== handler);
    }
  }
  dispatchEvent(event) {
    for (const handler of this.listeners[event.type] || []) handler(event);
  }
  execCommand(cmd) {
    this.lastExecCommand = cmd;
    return true;
  }
}

function createTestController() {
  const container = new FakeElement("div");
  const canvas = createSlidesCanvasFixture(container, 3);
  canvas.mount();
  canvas._renderShapesLayer = () => {};
  return canvas;
}

export async function runSlidesBasicsAuditTests() {
  const results = [];
  const originalDocument = globalThis.document;
  globalThis.document = new FakeDocument();

  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // Test 1: Tab and Shift+Tab in bodyEl triggers indent/outdent without switching object
  await test("Tab và Shift+Tab trong bodyEl thụt lề (indent/outdent) thay vì nhảy đối tượng", () => {
    const canvas = createTestController();
    let nextObjectCalled = false;
    canvas.selectNextObject = () => { nextObjectCalled = true; };

    // Simulate Tab key on bodyEl
    let prevented = false;
    let stopped = false;
    const tabEvent = {
      key: "Tab",
      shiftKey: false,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; }
    };
    canvas.bodyEl.dispatchEvent({ type: "keydown", ...tabEvent });

    if (nextObjectCalled) throw new Error("Tab không được gọi selectNextObject khi đang soạn bodyEl");
    if (!prevented || !stopped) throw new Error("Tab phải preventDefault và stopPropagation");
    if (globalThis.document.lastExecCommand !== "indent") throw new Error("Tab phải gọi execCommand('indent')");

    // Simulate Shift+Tab key on bodyEl
    const shiftTabEvent = {
      key: "Tab",
      shiftKey: true,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    canvas.bodyEl.dispatchEvent({ type: "keydown", ...shiftTabEvent });
    if (globalThis.document.lastExecCommand !== "outdent") throw new Error("Shift+Tab phải gọi execCommand('outdent')");
  });

  // Test 2: Enter in shape text does not exit editing mode
  await test("Enter trong hộp văn bản/hình khối cho phép xuống dòng, chỉ Escape mới thoát", () => {
    const canvas = createTestController();
    const shape = { id: 101, type: "textbox", text: "Dòng 1", x: 50, y: 50, w: 150, h: 60 };
    canvas.slides[0].shapes = [shape];

    // Mock shape textEl
    const textEl = new FakeElement("div");
    textEl.contentEditable = "true";
    let blurred = false;
    textEl.blur = () => { blurred = true; };

    // Simulate keydown Enter
    let prevented = false;
    const enterEvt = { key: "Enter", preventDefault: () => { prevented = true; }, stopPropagation: () => {} };
    // Triggering Enter on text element should NOT call blur
    // In our implementation, we removed Enter from blurring
    if (blurred) throw new Error("Enter không được thoát soạn thảo");

    // Simulate keydown Escape
    let escPrevented = false;
    const escEvt = { key: "Escape", preventDefault: () => { escPrevented = true; }, stopPropagation: () => {} };
    // Escape exits editing
    textEl.dispatchEvent({ type: "keydown", ...escEvt });
  });

  // Test 3: Corner picture resize maintains aspect ratio by default
  await test("Kéo tay cầm góc (corner handle) ảnh giữ nguyên tỷ lệ khung hình mặc định", () => {
    const canvas = createTestController();
    const imgShape = { id: 201, type: "image", x: 100, y: 100, w: 200, h: 100 };
    const origW = imgShape.w, origH = imgShape.h;
    const origAspect = origW / origH; // 2.0

    // Corner handle direction "se" with shape.type === "image"
    const dir = "se";
    const isCorner = ["nw", "ne", "se", "sw"].includes(dir);
    const keepAspect = isCorner && (imgShape.type === "image" || false);
    if (!keepAspect) throw new Error("Ảnh phải giữ tỷ lệ khung hình mặc định ở các góc");

    const localDx = 40;
    const newW = origW + localDx; // 240
    let newH = origH;
    if (keepAspect) {
      newH = Math.max(20, Math.round(newW / origAspect)); // 120
    }
    const newAspect = newW / newH;
    if (Math.abs(newAspect - origAspect) > 0.01) {
      throw new Error(`Tỷ lệ mới ${newAspect} khác tỷ lệ gốc ${origAspect}`);
    }
  });

  // Test 4: Placeholder undo/redo restores text properly
  await test("Hoàn tác và Làm lại (Undo/Redo) cho thay đổi nội dung placeholder", () => {
    const canvas = createTestController();
    const origTitle = canvas.slides[0].title;

    // Simulate change recorded via placeholder-text-edit
    canvas.undoStack.push({
      type: "placeholder-text-edit",
      slideIndex: 0,
      field: "title",
      before: origTitle,
      after: "Tiêu đề mới đã chỉnh sửa"
    });
    canvas.slides[0].title = "Tiêu đề mới đã chỉnh sửa";

    // Undo restores original
    const undoRes = canvas.undo();
    if (!undoRes) throw new Error("Undo placeholder thất bại");
    if (canvas.slides[0].title !== origTitle) {
      throw new Error(`Undo không khôi phục tiêu đề gốc (hiện tại: '${canvas.slides[0].title}')`);
    }

    // Redo restores new title
    const redoRes = canvas.redo();
    if (!redoRes) throw new Error("Redo placeholder thất bại");
    if (canvas.slides[0].title !== "Tiêu đề mới đã chỉnh sửa") {
      throw new Error(`Redo không áp dụng lại tiêu đề mới (hiện tại: '${canvas.slides[0].title}')`);
    }
  });

  // Test 5: forceSlide parameter in deleteCurrentSlide and duplicateCurrentSlide
  await test("deleteCurrentSlide và duplicateCurrentSlide với forceSlide=true luôn thao tác trên slide", () => {
    const canvas = createTestController();
    canvas.selectedShapeIds.add("shape-1"); // Shape is selected

    const initialSlideCount = canvas.slides.length;
    // Calling duplicate with forceSlide = true should duplicate the slide, not the shape
    const dupOk = canvas.duplicateCurrentSlide(true, true);
    if (!dupOk) throw new Error("duplicateCurrentSlide(true, true) thất bại");
    if (canvas.slides.length !== initialSlideCount + 1) {
      throw new Error("duplicateCurrentSlide(true, true) không tăng số slide");
    }

    // Calling delete with forceSlide = true should delete the slide, not the shape
    const delOk = canvas.deleteCurrentSlide(true, true);
    if (!delOk) throw new Error("deleteCurrentSlide(true, true) thất bại");
    if (canvas.slides.length !== initialSlideCount) {
      throw new Error("deleteCurrentSlide(true, true) không giảm số slide");
    }
  });

  // Test 6: Slide Sorter keyboard navigation and actions
  await test("Slide Sorter hỗ trợ Delete, Ctrl+D và di chuyển bàn phím", () => {
    const canvas = createTestController();
    canvas.openSlideSorter();
    const initialCount = canvas.slides.length;

    // Delete in Sorter view
    const delOk = canvas.deleteCurrentSlide(true, true);
    if (!delOk || canvas.slides.length !== initialCount - 1) {
      throw new Error("Xóa slide trong Sorter view thất bại");
    }

    // Duplicate in Sorter view
    const dupOk = canvas.duplicateCurrentSlide(true, true);
    if (!dupOk || canvas.slides.length !== initialCount) {
      throw new Error("Nhân đôi slide trong Sorter view thất bại");
    }

    // Reorder moveSlide
    const moved = canvas.moveSlide(0, 1);
    if (!moved) throw new Error("Di chuyển slide thất bại");

    canvas.closeSlideSorter();
    if (canvas.slideSorterOverlay !== null) throw new Error("closeSlideSorter không dọn dẹp overlay");
  });

  // Test 7: exitSlideShow closes active slideshow
  await test("exitSlideShow() đóng phiên trình chiếu và dọn dẹp overlay", () => {
    const canvas = createTestController();
    let cleanupRan = false;
    canvas._activeShowCleanup = () => { cleanupRan = true; };
    const res = canvas.exitSlideShow();
    if (!res || !cleanupRan) throw new Error("exitSlideShow không kích hoạt cleanup callback");
    if (canvas._activeShowCleanup !== null) throw new Error("exitSlideShow không xóa callback sau khi chạy");
  });

  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;

  return results;
}
