import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { if (!this.contains(name)) this.owner.className = `${this.owner.className} ${name}`.trim(); }
  remove(name) { this.owner.className = this.owner.className.split(/\s+/).filter(v => v && v !== name).join(" "); }
  contains(name) { return this.owner.className.split(/\s+/).includes(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null;
    this.className = ""; this.classList = new FakeClassList(this); this.dataset = {};
    this.listeners = {}; this.style = {}; this.attributes = {}; this.disabled = false;
  }
  set innerHTML(value) {
    this._innerHTML = String(value); this.children = [];
    if (value.includes("vno-slide-sorter-header")) {
      const header = new FakeElement("header"); header.className = "vno-slide-sorter-header";
      const close = new FakeElement("button"); close.className = "vno-slide-sorter-close"; header.appendChild(close);
      const grid = new FakeElement("main"); grid.className = "vno-slide-sorter-grid";
      this.appendChild(header); this.appendChild(grid);
    } else if (value.includes("vno-slide-sorter-number")) {
      const timingMatch = value.match(/vno-slide-sorter-timing[^>]*>([^<]*)</);
      if (timingMatch) {
        const timing = new FakeElement("div"); timing.className = "vno-slide-sorter-timing"; timing.textContent = timingMatch[1];
        this.appendChild(timing);
      }
    }
  }
  get innerHTML() { return this._innerHTML || ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter((c) => c !== child); child.parentNode = null; return child; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) { for (const handler of this.listeners[event.type] || []) handler(event); }
  closest() { return null; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matches = (el) => selector.startsWith(".") ? el.classList.contains(selector.slice(1)) : false;
    const result = [];
    for (const child of this.children) { if (matches(child)) result.push(child); result.push(...child.querySelectorAll(selector)); }
    return result;
  }
  focus() {}
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body"); this.listeners = {}; }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter(h => h !== handler); }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.titleEl = { innerText: "", style: {}, classList: new FakeClassList({ className: "" }) };
  canvas.bodyEl = { innerText: "", style: {}, classList: new FakeClassList({ className: "" }) };
  canvas.body2El = { innerText: "", style: {}, classList: new FakeClassList({ className: "" }) };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas.shapesLayer = new FakeElement();
  canvas._renderThumbnails = () => {};
  return canvas;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runSlidesTimingsMediaTests() {
  const results = [];
  const originalDocument = globalThis.document;
  globalThis.document = new FakeDocument();
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Media/Rehearse Timings: command có mapping, icon SVG thật và nằm trong ribbon", () => {
    const ids = ["slides.media.insertVideo", "slides.media.insertAudio", "slides.show.rehearseTimings"];
    for (const id of ids) {
      const command = SLIDES_COMMANDS.find((item) => item.id === id);
      if (!command) throw new Error(`Thiếu command ${id}`);
      if (!mapVnCommandToUno(id)) throw new Error(`Thiếu UNO mapping cho ${id}`);
      if (!ICONS[command.icon]?.includes("<svg") || ICONS[command.icon].includes('circle cx="12" cy="12" r="4"')) {
        throw new Error(`Icon ${command.icon} không phải SVG riêng`);
      }
      const foundInRibbon = SLIDES_RIBBON_TABS.some((tab) => tab.groups.some((group) => group.items.some((item) => item.commandId === id)));
      if (!foundInRibbon) throw new Error(`Command ${id} chưa nằm trong ribbon`);
    }
  });

  await test("insertVideo/insertAudio chèn shape thật với type và src đúng", () => {
    const canvas = createController();
    const okVideo = canvas.insertVideo("data:video/mp4;base64,AAA", 1024);
    const okAudio = canvas.insertAudio("data:audio/mpeg;base64,BBB", 2048);
    if (!okVideo || !okAudio) throw new Error("insertVideo/insertAudio trả về false");
    const shapes = canvas.slides[canvas.currentSlideIndex].shapes;
    const video = shapes.find((s) => s.type === "video");
    const audio = shapes.find((s) => s.type === "audio");
    if (!video || video.src !== "data:video/mp4;base64,AAA") throw new Error("Shape video không đúng src thật");
    if (!audio || audio.src !== "data:audio/mpeg;base64,BBB") throw new Error("Shape audio không đúng src thật");
  });

  await test("_renderShapesLayer dựng thẻ <video>/<audio> thật trong DOM canvas", () => {
    const canvas = createController();
    canvas.insertVideo("data:video/mp4;base64,AAA", 100);
    canvas._renderShapesLayer();
    const item = canvas.shapesLayer.children[0];
    const mediaEl = item.children.find((c) => c.tagName === "VIDEO");
    if (!mediaEl) throw new Error("Không tìm thấy thẻ <video> thật trong DOM");
  });

  await test("deleteShape xóa thật và Undo/Redo khôi phục đúng qua stack Slides", () => {
    const canvas = createController();
    canvas.insertAudio("data:audio/mpeg;base64,BBB", 100);
    const shapeId = canvas.slides[canvas.currentSlideIndex].shapes[0].id;
    if (!canvas.deleteShape(shapeId)) throw new Error("deleteShape trả về false");
    if (canvas.slides[canvas.currentSlideIndex].shapes.length !== 0) throw new Error("Shape không bị xóa thật");
    if (!canvas.undo()) throw new Error("Undo xóa shape thất bại");
    if (canvas.slides[canvas.currentSlideIndex].shapes.length !== 1) throw new Error("Undo không khôi phục shape");
    if (!canvas.redo()) throw new Error("Redo xóa shape thất bại");
    if (canvas.slides[canvas.currentSlideIndex].shapes.length !== 0) throw new Error("Redo không xóa lại shape");
  });

  await test("Chèn shape/media có Undo/Redo đối xứng qua stack Slides", () => {
    const canvas = createController();
    canvas.insertVideo("data:video/mp4;base64,AAA", 100);
    if (canvas.slides[canvas.currentSlideIndex].shapes.length !== 1) throw new Error("Insert video thất bại");
    if (!canvas.undo()) throw new Error("Undo insert video thất bại");
    if (canvas.slides[canvas.currentSlideIndex].shapes.length !== 0) throw new Error("Undo không xóa video vừa chèn");
    if (!canvas.redo()) throw new Error("Redo insert video thất bại");
    if (canvas.slides[canvas.currentSlideIndex].shapes.length !== 1) throw new Error("Redo không khôi phục video");
  });

  await test("Rehearse Timings: đồng hồ thật ghi thời gian dương thật cho từng slide và lưu vào rehearsedDuration", async () => {
    const canvas = createController();
    canvas.slides.push({ id: 900, title: "Trang phụ", body: "", shapes: [] });
    const rehearsal = canvas.startRehearseTimings(0);
    if (!rehearsal || typeof rehearsal.next !== "function") throw new Error("startRehearseTimings không trả về controller hợp lệ");
    await wait(120);
    rehearsal.next();
    await wait(120);
    const saved = rehearsal.close();
    if (saved !== true) throw new Error("Rehearsal không tự lưu khi không có window.confirm (mặc định true trong môi trường test)");
    if (typeof canvas.slides[0].rehearsedDuration !== "number" || canvas.slides[0].rehearsedDuration <= 0) {
      throw new Error(`Slide 0 phải có rehearsedDuration dương thật, nhận ${canvas.slides[0].rehearsedDuration}`);
    }
    if (typeof canvas.slides[1].rehearsedDuration !== "number" || canvas.slides[1].rehearsedDuration <= 0) {
      throw new Error(`Slide 1 phải có rehearsedDuration dương thật, nhận ${canvas.slides[1].rehearsedDuration}`);
    }
  });

  await test("Rehearse Timings: nhãn thời gian hiển thị thật trong Slide Sorter sau khi lưu", async () => {
    const canvas = createController();
    const rehearsal = canvas.startRehearseTimings(0);
    await wait(60);
    rehearsal.close();
    canvas.openSlideSorter();
    const firstItem = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid").children[0];
    const timingLabel = firstItem.children.find((c) => c.className.includes("vno-slide-sorter-timing"));
    if (!timingLabel) throw new Error("Slide Sorter không hiển thị nhãn thời gian đã lưu");
  });

  await test("SlidesAdapter handleDispatch điều phối media/rehearse timings và chịu args=null", async () => {
    const calls = [];
    const canvas = {
      insertMedia: (type) => { calls.push(type); return true; },
      startRehearseTimings: () => { calls.push("rehearse"); return { close() {} }; }
    };
    const adapter = new SlidesAdapter(canvas);
    adapter.attach();
    await globalCommandBus.execute("slides.show.rehearseTimings");
    if (!calls.includes("rehearse")) throw new Error("rehearseTimings không được gọi qua Command Bus với args=null");
  });

  globalThis.document = originalDocument;
  return results;
}
