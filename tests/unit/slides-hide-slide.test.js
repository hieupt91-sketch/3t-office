/**
 * Hide Slide (Ẩn trang chiếu) — model, ribbon, Slide Sorter, F5 skip, FODP.
 * Không dùng SendKeys. F5 được lái bằng handle.next()/prev() từ startSlideShow.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";

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
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    if (value.includes("vno-slide-sorter-header")) {
      const header = new FakeElement("header");
      header.className = "vno-slide-sorter-header";
      const close = new FakeElement("button");
      close.className = "vno-slide-sorter-close";
      header.appendChild(close);
      const grid = new FakeElement("main");
      grid.className = "vno-slide-sorter-grid";
      this.appendChild(header);
      this.appendChild(grid);
    } else if (value.includes("data-action=\"duplicate\"")) {
      const duplicate = new FakeElement("button");
      duplicate.dataset.action = "duplicate";
      duplicate.setAttribute("data-action", "duplicate");
      const remove = new FakeElement("button");
      remove.dataset.action = "delete";
      remove.setAttribute("data-action", "delete");
      this.appendChild(duplicate);
      this.appendChild(remove);
    }
  }
  get innerHTML() { return this._innerHTML || ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    this.children = this.children.filter(item => item !== child);
    if (child) child.parentNode = null;
    return child;
  }
  remove() {
    if (this.parentNode?.removeChild) this.parentNode.removeChild(this);
    else if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    }
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) { for (const handler of this.listeners[event.type] || []) handler(event); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matches = (el) => selector.startsWith(".")
      ? el.classList.contains(selector.slice(1))
      : selector === '[data-action="duplicate"]' ? el.dataset.action === "duplicate"
        : selector === '[data-action="delete"]' ? el.dataset.action === "delete"
          : false;
    const result = [];
    for (const child of this.children) {
      if (matches(child)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  closest(selector) {
    let node = this;
    const cls = selector.startsWith(".") ? selector.slice(1) : selector;
    while (node) {
      if (node.classList?.contains?.(cls) || (typeof selector === "string" && selector.split(",").some(part => node.tagName === part.trim().toUpperCase()))) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }
  focus() {}
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
    this.listeners = {};
    this.activeElement = null;
  }
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
  canvas._renderThumbnails = canvas._renderThumbnails.bind(canvas);
  return canvas;
}

function threeSlideDeck(canvas) {
  canvas.slides = [
    { id: 1, title: "Slide một", body: "A", layoutType: "title-content", shapes: [], comments: [], hidden: false },
    { id: 2, title: "Slide hai ẩn", body: "B", layoutType: "title-content", shapes: [], comments: [], hidden: false },
    { id: 3, title: "Slide ba", body: "C", layoutType: "title-content", shapes: [], comments: [], hidden: false }
  ];
  canvas.currentSlideIndex = 0;
}

export async function runSlidesHideSlideTests() {
  const results = [];
  const originalDocument = globalThis.document;
  globalThis.document = new FakeDocument();
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Hide Slide: command, icon SVG, UNO HideSlide, nhóm Thiết lập tab Trình chiếu, không gán Alt+H", () => {
    const command = SLIDES_COMMANDS.find(item => item.id === "slides.slide.toggleHidden");
    if (!command) throw new Error("Thiếu command slides.slide.toggleHidden");
    if (command.icon !== "hideSlide") throw new Error("Icon phải là hideSlide");
    if (command.shortcut) throw new Error(`Không gán phím tắt toàn cục (Alt+H trùng Home tab). Nhận: ${command.shortcut}`);
    if (mapVnCommandToUno(command.id) !== ".uno:HideSlide") throw new Error("UNO mapping phải là .uno:HideSlide");
    if (!ICONS.hideSlide?.includes("<svg") || !ICONS.hideSlide.includes("L25 8.5")) throw new Error("Icon hideSlide phải là SVG riêng, có gạch chéo");
    const slideshow = SLIDES_RIBBON_TABS.find(tab => tab.id === "slideshow");
    const setup = slideshow?.groups.find(group => group.labelKey === "slidesRibbon.group.setup");
    if (!setup?.items.some(item => item.commandId === command.id)) {
      throw new Error("Command chưa nằm trong nhóm Thiết lập của tab Trình chiếu");
    }
    setLocale("vi");
    if (tCommand(command.id, "label") !== "Ẩn trang chiếu") throw new Error("Nhãn VI sai");
    setLocale("en");
    if (tCommand(command.id, "label") !== "Hide Slide") throw new Error("Nhãn EN sai");
    setLocale("vi");
  });

  await test("toggleHidden đảo slide.hidden trên trang đang chọn và hỗ trợ undo/redo", () => {
    const canvas = createController();
    threeSlideDeck(canvas);
    canvas.selectSlide(1);
    if (canvas.slides[1].hidden) throw new Error("Slide 2 mặc định không ẩn");
    if (!canvas.toggleCurrentSlideHidden()) throw new Error("toggle phải thành công");
    if (canvas.slides[1].hidden !== true) throw new Error("hidden phải là true sau khi ẩn");
    if (canvas.slides[0].hidden || canvas.slides[2].hidden) throw new Error("Chỉ slide đang chọn bị ẩn");
    canvas.undo();
    if (canvas.slides[1].hidden) throw new Error("Undo phải hiện lại slide");
    canvas.redo();
    if (canvas.slides[1].hidden !== true) throw new Error("Redo phải ẩn lại");
    canvas.toggleCurrentSlideHidden();
    if (canvas.slides[1].hidden) throw new Error("Toggle lần hai phải hiện lại");
  });

  await test("Nhân đôi giữ hidden; trang mới không ẩn", () => {
    const canvas = createController();
    threeSlideDeck(canvas);
    canvas.selectSlide(1);
    canvas.toggleCurrentSlideHidden();
    canvas.duplicateCurrentSlide();
    if (!canvas.slides[2].hidden) throw new Error("Bản sao phải giữ hidden=true");
    canvas.addNewSlide();
    if (canvas.slides[canvas.slides.length - 1].hidden) throw new Error("Trang mới không được ẩn");
  });

  await test("Slide Sorter: slide ẩn vẫn hiện, mờ, gạch số, vẫn chọn/xóa được", () => {
    const canvas = createController();
    threeSlideDeck(canvas);
    canvas.selectSlide(1);
    canvas.toggleCurrentSlideHidden();
    canvas.openSlideSorter();
    const items = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid").children
      .filter(child => child.classList.contains("vno-slide-sorter-item"));
    if (items.length !== 3) throw new Error(`Sorter phải hiện đủ 3 slide, nhận ${items.length}`);
    if (!items[1].classList.contains("is-hidden")) throw new Error("Slide ẩn phải có class is-hidden");
    if (!String(items[1].innerHTML).includes("vno-slide-sorter-hidden-mark")) throw new Error("Thiếu icon/dấu ẩn trên số thứ tự");
    if (!String(items[1].innerHTML).includes("is-hidden-number")) throw new Error("Số thứ tự slide ẩn phải có class gạch chéo");
    if (items[0].classList.contains("is-hidden") || items[2].classList.contains("is-hidden")) {
      throw new Error("Slide không ẩn không được đánh dấu hidden");
    }
    const deletedId = canvas.slides[1].id;
    items[1].querySelector('[data-action="delete"]').dispatchEvent({ type: "click", stopPropagation() {} });
    if (canvas.slides.some(slide => slide.id === deletedId)) throw new Error("Xóa slide ẩn phải xóa khỏi mảng thật");
  });

  await test("F5 từ đầu: ẩn slide 2/3 thì Next nhảy 1 → 3, không hiện slide ẩn; hiện lại thì đi đủ 1-2-3", () => {
    const canvas = createController();
    threeSlideDeck(canvas);
    canvas.selectSlide(1);
    canvas.toggleCurrentSlideHidden();
    const show = canvas.startSlideShow(0);
    if (!show || show.isEmpty) throw new Error("F5 phải khởi động khi còn slide hiện");
    if (show.getIndex() !== 0 || show.getTitle() !== "Slide một") {
      throw new Error(`F5 phải bắt đầu ở slide 1, nhận index=${show.getIndex()} title=${show.getTitle()}`);
    }
    show.next();
    if (show.getIndex() !== 2 || show.getTitle() !== "Slide ba") {
      throw new Error(`Next phải nhảy sang slide 3, nhận index=${show.getIndex()} title=${show.getTitle()}`);
    }
    show.close();
    canvas.selectSlide(1);
    canvas.toggleCurrentSlideHidden();
    const again = canvas.startSlideShow(0);
    if (again.getIndex() !== 0) throw new Error("Sau khi hiện lại, F5 phải bắt đầu slide 1");
    again.next();
    if (again.getIndex() !== 1 || again.getTitle() !== "Slide hai ẩn") {
      throw new Error(`Sau khi hiện lại, Next phải tới slide 2, nhận ${again.getIndex()}/${again.getTitle()}`);
    }
    again.next();
    if (again.getIndex() !== 2) throw new Error("Next tiếp phải tới slide 3");
    again.close();
  });

  await test("F5: tất cả slide ẩn không crash, overlay báo rõ, isEmpty=true", () => {
    const canvas = createController();
    threeSlideDeck(canvas);
    canvas.slides.forEach(slide => { slide.hidden = true; });
    const show = canvas.startSlideShow(0);
    if (!show) throw new Error("Không được trả về falsy/crash khi mọi slide ẩn");
    if (!show.isEmpty || show.getIndex() >= 0) throw new Error("Phải đánh dấu isEmpty khi không còn slide hiện");
    const html = show.overlay?.innerHTML || show.overlay?.children?.[0]?.innerHTML || "";
    if (!String(html).includes("vno-slideshow-empty-hidden") && !String(html).includes("Không có trang chiếu")) {
      throw new Error(`Overlay tất cả ẩn phải có thông báo rõ, html=${String(html).slice(0, 180)}`);
    }
    show.close();
  });

  await test("FODP: serialize dùng presentation:visibility=hidden trên drawing-page-properties, không vno: custom", () => {
    const canvas = createController();
    threeSlideDeck(canvas);
    canvas.slides[1].hidden = true;
    const adapter = new SlidesAdapter(canvas);
    const fodp = adapter.serializeToFodp();
    if (/presentation:visible\s*=/.test(fodp)) {
      throw new Error("Không được ghi presentation:visible trên draw:page — ODF không có thuộc tính đó");
    }
    if (!fodp.includes('presentation:visibility="hidden"')) {
      throw new Error("FODP phải ghi presentation:visibility=\"hidden\" theo ODF 1.3 §20.241");
    }
    const hiddenStyle = fodp.match(/<style:style[^>]*style:name="dp3"[^>]*>[\s\S]*?<\/style:style>/)?.[0] || "";
    if (!hiddenStyle.includes('style:family="drawing-page"') || !hiddenStyle.includes('presentation:visibility="hidden"')) {
      throw new Error(`Style dp3 của slide ẩn phải chứa presentation:visibility=hidden: ${hiddenStyle.slice(0, 240)}`);
    }
    const page2 = fodp.match(/<draw:page[^>]*draw:name="page2"[^>]*>/)?.[0] || "";
    if (page2.includes("presentation:visibility") || page2.includes("presentation:visible")) {
      throw new Error("draw:page không được mang presentation:visible/visibility — thuộc tính nằm ở style");
    }
    if (fodp.includes("vno:hidden") || fodp.includes("vno:visible")) {
      throw new Error("Không dùng custom vno: attribute cho ẩn trang — đã có chuẩn ODF");
    }
    const parsed = adapter.parseFodp(fodp);
    if (parsed.length !== 3) throw new Error(`parse phải ra 3 slide, nhận ${parsed.length}`);
    if (parsed[0].hidden || !parsed[1].hidden || parsed[2].hidden) {
      throw new Error(`parse hidden flags sai: ${parsed.map(s => !!s.hidden)}`);
    }
  });

  await test("FODP: parse style soffice presentation:visibility=hidden trên drawing-page-properties", () => {
    const adapter = new SlidesAdapter(null);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:automatic-styles>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true"/>
    </style:style>
    <style:style style:name="dpHidden" style:family="drawing-page">
      <style:drawing-page-properties presentation:visibility="hidden"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1" draw:style-name="dp1">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Hiện</text:p></draw:text-box></draw:frame>
    </draw:page>
    <draw:page draw:name="page2" draw:style-name="dpHidden">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Ẩn</text:p></draw:text-box></draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(xml);
    if (parsed.length !== 2) throw new Error(`số slide ${parsed.length}`);
    if (parsed[0].hidden) throw new Error("slide 1 không ẩn");
    if (!parsed[1].hidden) throw new Error("slide 2 phải hidden=true từ presentation:visibility=hidden");
    if (parsed[1].title !== "Ẩn") throw new Error(`title slide ẩn: ${parsed[1].title}`);
  });

  await test("Adapter dispatch slides.slide.toggleHidden gọi toggleCurrentSlideHidden", async () => {
    let called = false;
    const adapter = new SlidesAdapter({
      toggleCurrentSlideHidden() { called = true; return true; }
    });
    const result = await adapter.handleDispatch(".uno:HideSlide", null, "slides.slide.toggleHidden");
    if (!result || !called) throw new Error("Adapter không gọi toggleCurrentSlideHidden");
  });

  globalThis.document = originalDocument;
  return results;
}
