/**
 * VN Slides Sections — model, ribbon commands, collapse/expand, move group, undo/redo.
 * Không đụng Writer/Sheet.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { if (!this.contains(name)) this.owner.className = `${this.owner.className} ${name}`.trim(); }
  remove(name) { this.owner.className = this.owner.className.split(/\s+/).filter(v => v && v !== name).join(" "); }
  contains(name) { return this.owner.className.split(/\s+/).includes(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.listeners = {};
    this.style = {};
    this.attributes = {};
    this.disabled = false;
    this._textContent = "";
    this._innerHTML = "";
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
    } else if (value.includes('data-action="duplicate"')) {
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
  set textContent(value) { this._textContent = String(value); }
  get textContent() {
    if (this.children.length) return this.children.map(child => child.textContent).join("");
    return this._textContent;
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  contains(node) {
    let cur = node;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) { for (const handler of this.listeners[event.type] || []) handler(event); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matches = (el) => {
      if (selector.startsWith(".")) return el.classList.contains(selector.slice(1));
      if (selector === '[data-action="duplicate"]') return el.dataset.action === "duplicate";
      if (selector === '[data-action="delete"]') return el.dataset.action === "delete";
      if (selector === '[data-section-toggle="true"]') return el.dataset.sectionToggle === "true";
      return false;
    };
    const result = [];
    for (const child of this.children) {
      if (matches(child)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
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
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

function flattenRibbon(items = []) {
  return items.flatMap(item => {
    if (item?.type === "dropdown") return [item, ...flattenRibbon(item.items || [])];
    if (item?.items) return flattenRibbon(item.items);
    return [item];
  });
}

function sixSlides() {
  return Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    title: `Trang ${index + 1}`,
    body: `Nội dung ${index + 1}`,
    layoutType: "title-content",
    shapes: [],
    comments: [],
    hidden: false
  }));
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.titleEl = { innerText: "", innerHTML: "", style: {}, classList: new FakeClassList({ className: "" }) };
  canvas.bodyEl = { innerText: "", innerHTML: "", style: {} };
  canvas.body2El = { innerText: "", innerHTML: "", style: {} };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas.slideListContainer = new FakeElement("div");
  canvas._renderShapesLayer = () => {};
  canvas._applyLayoutToDom = () => {};
  canvas._setEditableContent = () => {};
  canvas._renderHeaderFooter = () => {};
  canvas._applySlideSurface = () => {};
  canvas._refreshSpellcheckRoots = () => {};
  canvas._renderCommentsUi = () => {};
  canvas._renderAnimationPane = () => {};
  canvas.slides = sixSlides();
  canvas.sections = [];
  canvas.collapsedSectionIds = new Set();
  canvas.currentSlideIndex = 0;
  canvas.undoStack = [];
  canvas.redoStack = [];
  return canvas;
}

function click(el) {
  el.dispatchEvent({ type: "click", preventDefault() {}, stopPropagation() {}, target: el });
}

function membershipNames(canvas) {
  return canvas.slides.map((_, index) => canvas.getSectionForSlide(index)?.name || null);
}

export async function runSlidesSectionsTests() {
  const results = [];
  const originalDocument = globalThis.document;
  globalThis.document = new FakeDocument();
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Sections: lệnh slides.section.* có trong command-definitions, icon SVG và i18n VI/EN", () => {
    const ids = ["slides.section.add", "slides.section.rename", "slides.section.remove", "slides.section.moveUp", "slides.section.moveDown"];
    for (const id of ids) {
      const command = SLIDES_COMMANDS.find(item => item.id === id);
      if (!command) throw new Error(`Thiếu command ${id}`);
      if (!viStrings.commands[id]?.label || !enStrings.commands[id]?.label) throw new Error(`Thiếu i18n ${id}`);
      if (!ICONS[command.icon]?.includes("<svg")) throw new Error(`Thiếu icon SVG cho ${id} (${command.icon})`);
    }
    if (ICONS.slideSection.includes('circle cx="12" cy="12" r="4"')) throw new Error("Icon section còn placeholder");
  });

  await test("Sections: dropdown Phần nằm Home > nhóm Trang chiếu cạnh lệnh quản lý slide", () => {
    const home = SLIDES_RIBBON_TABS.find(tab => tab.id === "home");
    const group = home?.groups.find(item => item.labelKey === "slidesRibbon.group.slides");
    const items = flattenRibbon(group?.items || []);
    const dropdown = items.find(item => item.id === "slides.section.menu");
    if (!dropdown || dropdown.type !== "dropdown") throw new Error("Thiếu dropdown Phần trên Home > Trang chiếu");
    const cmdIds = (dropdown.items || []).map(item => item.commandId);
    ["slides.section.add", "slides.section.rename", "slides.section.remove", "slides.section.moveUp", "slides.section.moveDown"]
      .forEach(id => { if (!cmdIds.includes(id)) throw new Error(`Dropdown thiếu ${id}`); });
    const neighborIds = flattenRibbon(group.items).map(item => item.commandId);
    ["slides.slide.new", "slides.slide.duplicate", "slides.slide.delete"].forEach(id => {
      if (!neighborIds.includes(id)) throw new Error(`Nhóm Trang chiếu mất ${id}`);
    });
  });

  await test("Sections: 6 slide — phần 1 = trang 1-3, phần 2 = trang 4-6", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    const second = canvas.addSection(3, "Nội dung chính");
    if (!first || !second || canvas.sections.length !== 2) throw new Error("Không tạo được 2 phần");
    const names = membershipNames(canvas);
    if (names.join("|") !== "Giới thiệu|Giới thiệu|Giới thiệu|Nội dung chính|Nội dung chính|Nội dung chính") {
      throw new Error(`Sai thành viên phần: ${names.join(", ")}`);
    }
    const range1 = canvas.getSectionRange(first);
    const range2 = canvas.getSectionRange(second);
    if (range1.start !== 0 || range1.count !== 3) throw new Error("Phần 1 phải là slide 1-3");
    if (range2.start !== 3 || range2.count !== 3) throw new Error("Phần 2 phải là slide 4-6");
    if (canvas.sections[0].startSlideIndex !== 0 || canvas.sections[1].startSlideIndex !== 3) {
      throw new Error("startSlideIndex không khớp biên phần");
    }
  });

  await test("Sections: đổi tên phần cập nhật catalogue, không đổi slide", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    canvas.addSection(3, "Nội dung chính");
    const ids = canvas.slides.map(slide => slide.id).join(",");
    if (!canvas.renameSection(first, "Mở đầu")) throw new Error("Đổi tên thất bại");
    if (canvas.sections.find(item => item.id === first)?.name !== "Mở đầu") throw new Error("Catalogue không đổi tên");
    if (canvas.slides.map(slide => slide.id).join(",") !== ids) throw new Error("Đổi tên đã đụng slide");
    if (membershipNames(canvas)[0] !== "Mở đầu") throw new Error("Membership không theo tên mới");
  });

  await test("Sections: xóa phần giữ nguyên slide, chỉ mất nhóm", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    canvas.addSection(3, "Nội dung chính");
    const ids = canvas.slides.map(slide => slide.id).join(",");
    const titles = canvas.slides.map(slide => slide.title).join("|");
    if (!canvas.removeSection(first)) throw new Error("Xóa phần thất bại");
    if (canvas.slides.map(slide => slide.id).join(",") !== ids) throw new Error("Xóa phần đã xóa/đổi thứ tự slide");
    if (canvas.slides.map(slide => slide.title).join("|") !== titles) throw new Error("Nội dung slide bị đổi khi xóa phần");
    if (canvas.slides.some(slide => slide.sectionId === first)) throw new Error("Còn sectionId mồ côi");
    if (canvas.sections.some(item => item.id === first)) throw new Error("Catalogue còn phần đã xóa");
    if (canvas.sections.length !== 1) throw new Error("Phần còn lại phải giữ nguyên");
  });

  await test("Sections: chuyển cả nhóm lên/xuống đổi vị trí slide đúng khối", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    canvas.addSection(3, "Nội dung chính");
    const titlesBefore = canvas.slides.map(slide => slide.title);
    canvas.selectSlide(0);
    if (!canvas.moveSection(first, 1)) throw new Error("moveDown thất bại");
    const titlesDown = canvas.slides.map(slide => slide.title);
    if (titlesDown.join("|") !== "Trang 4|Trang 5|Trang 6|Trang 1|Trang 2|Trang 3") {
      throw new Error(`moveDown sai thứ tự: ${titlesDown.join(", ")}`);
    }
    if (membershipNames(canvas).join("|") !== "Nội dung chính|Nội dung chính|Nội dung chính|Giới thiệu|Giới thiệu|Giới thiệu") {
      throw new Error("moveDown không giữ membership theo khối");
    }
    if (canvas.slides.slice(3, 6).map(slide => slide.title).join("|") !== "Trang 1|Trang 2|Trang 3") {
      throw new Error("Thứ tự trong nhóm bị đảo khi chuyển phần");
    }
    if (!canvas.moveSection(canvas.sections.find(item => item.name === "Giới thiệu").id, -1)) {
      throw new Error("moveUp thất bại");
    }
    if (canvas.slides.map(slide => slide.title).join("|") !== titlesBefore.join("|")) {
      throw new Error("moveUp không đưa khối về chỗ cũ");
    }
  });

  await test("Sections: thumbnail thu gọn ẩn đúng slide trong nhóm, mở rộng hiện lại", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    canvas.addSection(3, "Nội dung chính");
    canvas._renderThumbnails();
    const thumbsOpen = canvas.slideListContainer.querySelectorAll(".vno-slide-thumb-item");
    const headers = canvas.slideListContainer.querySelectorAll(".vno-slide-section-header");
    if (thumbsOpen.length !== 6) throw new Error(`Mở rộng phải hiện 6 thumbnail, được ${thumbsOpen.length}`);
    if (headers.length !== 2) throw new Error("Phải có 2 thanh tiêu đề phần trên dải thumbnail");
    const toggle = headers[0].querySelector(".vno-slide-section-toggle");
    if (!toggle) throw new Error("Thiếu nút thu gọn trên thanh tiêu đề");
    click(toggle);
    if (!canvas.isSectionCollapsed(first)) throw new Error("Phần 1 chưa thu gọn");
    const thumbsCollapsed = canvas.slideListContainer.querySelectorAll(".vno-slide-thumb-item");
    if (thumbsCollapsed.length !== 3) throw new Error(`Thu gọn phần 1 phải ẩn 3 thumbnail, còn ${thumbsCollapsed.length}`);
    const titles = thumbsCollapsed.map(item => item.dataset.slideIndex);
    if (titles.join(",") !== "3,4,5") throw new Error(`Thu gọn ẩn sai slide, còn index ${titles.join(",")}`);
    click(canvas.slideListContainer.querySelectorAll(".vno-slide-section-header")[0].querySelector(".vno-slide-section-toggle"));
    if (canvas.isSectionCollapsed(first)) throw new Error("Mở rộng không xóa trạng thái collapsed");
    if (canvas.slideListContainer.querySelectorAll(".vno-slide-thumb-item").length !== 6) {
      throw new Error("Mở rộng không hiện lại đủ thumbnail");
    }
  });

  await test("Sections: Slide Sorter thu gọn ẩn item trong nhóm", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    canvas.addSection(3, "Nội dung chính");
    canvas.openSlideSorter();
    const grid = canvas.slideSorterOverlay.querySelector(".vno-slide-sorter-grid");
    const itemsOpen = grid.children.filter(child => child.classList.contains("vno-slide-sorter-item"));
    if (itemsOpen.length !== 6) throw new Error("Sorter phải hiện 6 item khi mở rộng");
    const divider = grid.children.find(child => child.classList.contains("vno-slide-section-divider"));
    click(divider.querySelector(".vno-slide-section-toggle"));
    const itemsCollapsed = grid.children.filter(child => child.classList.contains("vno-slide-sorter-item"));
    if (itemsCollapsed.length !== 3) throw new Error(`Sorter thu gọn phải còn 3 item, được ${itemsCollapsed.length}`);
    if (!canvas.isSectionCollapsed(first)) throw new Error("Sorter toggle không thu gọn model");
  });

  await test("Sections: Undo/Redo thêm, đổi tên, xóa và chuyển nhóm", () => {
    const canvas = createController();
    const first = canvas.addSection(0, "Giới thiệu");
    const second = canvas.addSection(3, "Nội dung chính");
    const snapshot = () => ({
      titles: canvas.slides.map(slide => slide.title).join("|"),
      names: membershipNames(canvas).join("|"),
      sectionNames: canvas.sections.map(item => item.name).join("|")
    });
    const afterAdd = snapshot();
    canvas.renameSection(second, "Kết luận");
    if (snapshot().sectionNames !== "Giới thiệu|Kết luận") throw new Error("Rename chưa vào model");
    canvas.undo();
    if (snapshot().sectionNames !== "Giới thiệu|Nội dung chính") throw new Error("Undo rename sai");
    canvas.redo();
    if (snapshot().sectionNames !== "Giới thiệu|Kết luận") throw new Error("Redo rename sai");
    const afterRename = snapshot();
    canvas.removeSection(first);
    if (canvas.slides.length !== 6) throw new Error("Remove làm mất slide");
    canvas.undo();
    if (snapshot().names !== afterRename.names) throw new Error("Undo remove không trả nhóm");
    canvas.selectSlide(0);
    canvas.moveSection(first, 1);
    if (canvas.slides.map(slide => slide.title).join("|") !== "Trang 4|Trang 5|Trang 6|Trang 1|Trang 2|Trang 3") {
      throw new Error("moveDown chưa đổi vị trí trước undo");
    }
    canvas.undo();
    if (snapshot().titles !== afterAdd.titles) throw new Error("Undo moveSection không trả thứ tự slide");
    canvas.redo();
    if (canvas.slides.map(slide => slide.title).join("|") !== "Trang 4|Trang 5|Trang 6|Trang 1|Trang 2|Trang 3") {
      throw new Error("Redo moveSection sai");
    }
  });

  await test("Sections: adapter bind 5 lệnh section và handleDispatch gọi canvas", async () => {
    const canvas = createController();
    let added = false;
    canvas.promptAddCurrentSection = () => { added = true; return true; };
    canvas.promptRenameCurrentSection = () => true;
    canvas.removeCurrentSection = () => true;
    canvas.moveCurrentSectionUp = () => true;
    canvas.moveCurrentSectionDown = () => true;
    const adapter = new SlidesAdapter(canvas);
    adapter.attach();
    const addRes = await adapter.handleDispatch(null, null, "slides.section.add");
    if (!addRes || !added) throw new Error("handleDispatch slides.section.add không gọi canvas");
    for (const id of ["slides.section.rename", "slides.section.remove", "slides.section.moveUp", "slides.section.moveDown"]) {
      const res = await adapter.handleDispatch(null, null, id);
      if (!res) throw new Error(`handleDispatch ${id} thất bại`);
    }
  });

  await test("Sections: bài Help tiếng Việt khớp ribbon Home > Trang chiếu", () => {
    const entry = SLIDES_HELP_ENTRIES.find(item => item.id === "slides.section.groups");
    if (!entry) throw new Error("Thiếu help entry slides.section.groups");
    if (entry.ribbon?.tab !== "Trang đầu" || entry.ribbon?.group !== "Trang chiếu") {
      throw new Error("Help Sections phải trỏ tab Trang đầu / nhóm Trang chiếu");
    }
    ["slides.section.add", "slides.section.rename", "slides.section.remove", "slides.section.moveUp", "slides.section.moveDown"]
      .forEach(id => { if (!(entry.commandIds || []).includes(id)) throw new Error(`Help thiếu commandId ${id}`); });
    const blob = [entry.title, entry.summary, ...(entry.steps || [])].join(" ");
    if (!/dropdown Phần/.test(blob) || !/Thu gọn/.test(blob) || !/không xóa/.test(blob)) {
      throw new Error("Help Sections chưa mô tả đúng UI dropdown / thu gọn / xóa không mất slide");
    }
  });

  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  return results;
}
