import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

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
    } else if (value.includes("data-action=\"duplicate\"")) {
      const duplicate = new FakeElement("button"); duplicate.dataset.action = "duplicate"; duplicate.setAttribute("data-action", "duplicate");
      const remove = new FakeElement("button"); remove.dataset.action = "delete"; remove.setAttribute("data-action", "delete");
      this.appendChild(duplicate); this.appendChild(remove);
    }
  }
  get innerHTML() { return this._innerHTML || ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) { for (const handler of this.listeners[event.type] || []) handler(event); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matches = (el) => selector.startsWith(".") ? el.classList.contains(selector.slice(1))
      : selector === '[data-action="duplicate"]' ? el.dataset.action === "duplicate"
      : selector === '[data-action="delete"]' ? el.dataset.action === "delete" : false;
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
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter(item => item !== handler); }
  dispatchEvent(event) { for (const handler of this.listeners[event.type] || []) handler(event); }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.titleEl = { innerText: "", style: {}, classList: new FakeClassList({ className: "" }) };
  canvas.bodyEl = { innerText: "", style: {} };
  canvas.body2El = { innerText: "", style: {} };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas._renderShapesLayer = () => {};
  return canvas;
}

export async function runSlidesSorterViewTests() {
  const results = [];
  const originalDocument = globalThis.document;
  globalThis.document = new FakeDocument();
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Slide Sorter command có icon SVG thật, UNO mapping và nằm trong tab Chế độ xem", () => {
    const command = SLIDES_COMMANDS.find(item => item.id === "slides.view.slideSorter");
    if (!command || command.icon !== "slideSorter") throw new Error("Thiếu command hoặc icon slideSorter");
    if (mapVnCommandToUno(command.id) !== ".uno:DiaMode") throw new Error("UNO mapping không phải .uno:DiaMode");
    if (!ICONS.slideSorter?.includes("<svg") || ICONS.slideSorter.includes('circle cx="12" cy="12" r="4"')) throw new Error("Icon không phải SVG lưới riêng");
    const view = SLIDES_RIBBON_TABS.find(tab => tab.id === "view");
    if (!view?.groups.some(group => group.items.some(item => item.commandId === command.id))) throw new Error("Command chưa nằm trong tab view");
  });

  await test("Mở Slide Sorter render đúng số thumbnail bằng số slide thật", () => {
    const canvas = createController();
    if (!canvas.openSlideSorter()) throw new Error("Không mở được overlay");
    const items = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid").children;
    if (items.length !== canvas.slides.length) throw new Error(`Có ${items.length} thumbnail nhưng ${canvas.slides.length} slide`);
  });

  await test("Kéo-thả slide 1 xuống vị trí 3 đổi mảng thật và hỗ trợ undo/redo", () => {
    const canvas = createController(); canvas.openSlideSorter();
    const original = canvas.slides.map(slide => slide.id);
    const grid = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid");
    const transfer = { setData(_type, value) { this.value = value; }, getData() { return this.value; } };
    grid.children[0].dispatchEvent({ type: "dragstart", dataTransfer: transfer });
    grid.children[2].dispatchEvent({ type: "drop", dataTransfer: transfer, preventDefault() {} });
    if (canvas.slides.map(slide => slide.id).join(",") !== [original[1], original[2], original[0]].join(",")) throw new Error("Mảng slides không đổi thứ tự thật");
    canvas.undo();
    if (canvas.slides.map(slide => slide.id).join(",") !== original.join(",")) throw new Error("Undo reorder không khôi phục thứ tự");
    canvas.redo();
    if (canvas.slides.map(slide => slide.id).join(",") !== [original[1], original[2], original[0]].join(",")) throw new Error("Redo reorder không áp dụng lại");
  });

  await test("Double-click thumbnail đóng overlay và nhảy Normal view đúng slide", () => {
    const canvas = createController(); canvas.openSlideSorter();
    canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid").children[1]
      .dispatchEvent({ type: "dblclick" });
    if (canvas.slideSorterOverlay !== null || canvas.currentSlideIndex !== 1) throw new Error("Double-click không đóng hoặc chọn đúng slide 2");
  });

  await test("Nút Xóa trong Slide Sorter tái dùng deleteCurrentSlide và giảm mảng thật", () => {
    const canvas = createController(); canvas.openSlideSorter();
    const deletedId = canvas.slides[1].id;
    canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid").children[1]
      .querySelector('[data-action="delete"]').dispatchEvent({ type: "click", stopPropagation() {} });
    if (canvas.slides.length !== 2 || canvas.slides.some(slide => slide.id === deletedId)) throw new Error("Slide không bị xóa khỏi mảng thật");
  });

  await test("Escape đóng và loại overlay khỏi DOM thật", () => {
    const canvas = createController(); canvas.openSlideSorter();
    document.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
    if (canvas.slideSorterOverlay !== null || document.body.children.length !== 0) throw new Error("Escape chưa loại overlay khỏi DOM");
  });

  await test("SlidesAdapter dispatch command mở Slide Sorter qua controller", async () => {
    let opened = false;
    const adapter = new SlidesAdapter({ openSlideSorter() { opened = true; return true; } });
    const result = await adapter.handleDispatch(".uno:DiaMode", null, "slides.view.slideSorter");
    if (!result || !opened) throw new Error("Adapter không gọi openSlideSorter");
  });

  await test("Sections: tạo nhóm liên tiếp và Slide Sorter render thanh chia đúng tên", () => {
    const canvas = createController();
    const sectionId = canvas.addSection(1, "Phần 2: Nội dung chính");
    if (!sectionId || canvas.sections.length !== 1) throw new Error("Không tạo được section ở cấp presentation");
    if (canvas.slides[0].sectionId || canvas.slides[1].sectionId !== sectionId || canvas.slides[2].sectionId !== sectionId) {
      throw new Error("Section không gán đúng dải slide liên tiếp từ slide được chọn");
    }
    canvas.openSlideSorter();
    const grid = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid");
    const dividers = grid.children.filter(child => child.classList.contains("vno-slide-section-divider"));
    const nameEl = dividers[0]?.querySelector?.(".vno-slide-section-name");
    if (dividers.length !== 1 || nameEl?.textContent !== "Phần 2: Nội dung chính") {
      throw new Error("Slide Sorter không hiện đúng thanh chia/tên section");
    }
  });

  await test("Sections: kéo slide sang nhóm khác cập nhật sectionId; xóa section vẫn giữ slide", () => {
    const canvas = createController();
    const firstSection = canvas.addSection(0, "Giới thiệu");
    const secondSection = canvas.addSection(2, "Kết luận");
    canvas.openSlideSorter();
    const items = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid").children
      .filter(child => child.classList.contains("vno-slide-sorter-item"));
    const transfer = { setData(_type, value) { this.value = value; }, getData() { return this.value; } };
    items[0].dispatchEvent({ type: "dragstart", dataTransfer: transfer });
    items[2].dispatchEvent({ type: "drop", dataTransfer: transfer, preventDefault() {} });
    if (canvas.slides[2].sectionId !== secondSection) throw new Error("Drop không cập nhật sectionId theo section đích");
    const idsBeforeRemove = canvas.slides.map(slide => slide.id).join(",");
    if (!canvas.removeSection(firstSection)) throw new Error("Không xóa được section");
    if (canvas.slides.map(slide => slide.id).join(",") !== idsBeforeRemove || canvas.slides.some(slide => slide.sectionId === firstSection)) {
      throw new Error("Xóa section đã xóa/reorder slide hoặc còn sectionId mồ côi");
    }
  });

  await test("Sections FODP: serialize rồi load giữ catalogue, tên và sectionId", () => {
    const canvas = createController();
    const sectionId = canvas.addSection(1, "Nội dung & Kết luận");
    const xml = new SlidesAdapter(canvas).serializeToFodp();
    if (!xml.includes('vno:section-id=') || !xml.includes('vno:section-name="Nội dung &amp; Kết luận"')) {
      throw new Error("FODP thiếu custom section metadata hoặc escape XML sai");
    }
    const loadedCanvas = createController();
    new SlidesAdapter(loadedCanvas).loadFromFodp(xml);
    if (loadedCanvas.sections.length !== 1 || loadedCanvas.sections[0].name !== "Nội dung & Kết luận") {
      throw new Error("Load FODP không khôi phục catalogue section");
    }
    if (loadedCanvas.slides[1].sectionId !== sectionId || loadedCanvas.slides[2].sectionId !== sectionId) {
      throw new Error("Load FODP không khôi phục sectionId trên slides");
    }
  });

  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  return results;
}
