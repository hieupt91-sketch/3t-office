/** Behavioral tests — Slides Home Editing group: Find / Replace / Select. */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";

function flatten(items) {
  return (items || []).flatMap(item => {
    if (item?.type === "dropdown") return [item];
    if (item?.items) return flatten(item.items);
    return [item];
  });
}

function container() {
  const classes = new Set();
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    innerHTML: "",
    dataset: {},
    className: "",
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, force) {
        if (force === true) classes.add(name);
        else if (force === false) classes.delete(name);
        else if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      },
      contains(name) { return classes.has(name); }
    },
    style: {}
  };
}

function canvasWithSlides() {
  const canvas = new SlidesCanvasController(container());
  canvas.shapesLayer = null;
  canvas._renderThumbnails = () => {};
  canvas._renderShapesLayer = () => {};
  canvas._refreshSpellcheckRoots = () => {};
  canvas.slides = [
    {
      id: 1,
      title: "Ngân sách quý 1",
      body: "Tổng chi phí dự toán",
      layoutType: "title-content",
      shapes: [
        { id: 11, type: "rect", x: 40, y: 40, w: 120, h: 80, text: "Ghi chú chi phí" },
        { id: 12, type: "connector", x: 0, y: 0, w: 10, h: 10, text: "" }
      ]
    },
    {
      id: 2,
      title: "Kế hoạch nhân sự",
      body: "chi phí đào tạo nhân viên",
      layoutType: "title-content",
      shapes: [
        { id: 21, type: "ellipse", x: 80, y: 80, w: 100, h: 60, text: "Đào tạo" }
      ]
    }
  ];
  canvas.currentSlideIndex = 0;
  canvas.undoStack = [];
  canvas.redoStack = [];
  canvas.selectedShapeIds = new Set();
  return canvas;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSlidesEditingGroupTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Ribbon Home kết thúc bằng nhóm Chỉnh sửa: Tìm kiếm / Thay thế / Chọn", () => {
    const home = SLIDES_RIBBON_TABS.find(tab => tab.id === "home");
    assert(home, "Thiếu tab Home");
    const last = home.groups[home.groups.length - 1];
    assert(last.id === "editing" && last.label === "Chỉnh sửa", "Nhóm cuối Home phải là Chỉnh sửa");
    const ids = flatten(last.items).map(item => item.commandId || item.id);
    assert(ids.includes("common.edit.find"), "Thiếu Tìm kiếm");
    assert(ids.includes("common.edit.replace"), "Thiếu Thay thế");
    const dropdown = flatten(last.items).find(item => item.id === "slides.edit.select");
    assert(dropdown && dropdown.type === "dropdown", "Thiếu dropdown Chọn");
    const menu = dropdown.items.map(item => item.commandId);
    assert(menu.includes("slides.edit.selectAll"), "Dropdown phải có Chọn tất cả");
    assert(menu.includes("slides.edit.selectObjects"), "Dropdown phải có Chọn đối tượng");
    assert(SLIDES_COMMANDS.some(cmd => cmd.id === "slides.edit.selectAll"), "Thiếu command selectAll");
    assert(SLIDES_COMMANDS.some(cmd => cmd.id === "slides.edit.selectObjects"), "Thiếu command selectObjects");
    assert(viStrings.slidesRibbon.group.editing === "Chỉnh sửa", "i18n nhóm VI");
    assert(enStrings.slidesRibbon.group.editing === "Editing", "i18n nhóm EN");
    assert(viStrings.commands["slides.edit.selectAll"]?.label, "i18n selectAll VI");
    assert(enStrings.commands["slides.edit.selectAll"]?.label, "i18n selectAll EN");
    assert(ICONS.selectAll.includes("<svg") && ICONS.selectObjects.includes("<svg"), "Thiếu icon vector");
    assert(VN_TO_UNO_MAP["slides.edit.selectAll"] === ".uno:SelectAll", "UNO SelectAll");
    assert(VN_TO_UNO_MAP["slides.edit.selectObjects"] === ".uno:SelectObject", "UNO SelectObject");
  });

  await test("Help có bài Tìm/Thay và Chọn, chỉ đúng nhóm Chỉnh sửa", () => {
    const find = SLIDES_HELP_ENTRIES.find(item => item.id === "slides.edit.findReplace");
    const select = SLIDES_HELP_ENTRIES.find(item => item.id === "slides.edit.select");
    assert(find && select, "Thiếu bài Help");
    assert(find.ribbon.group === "Chỉnh sửa" && find.ribbon.tab === "Trang đầu", "Find phải ở Home / Chỉnh sửa");
    assert(select.ribbon.group === "Chỉnh sửa", "Select phải ở nhóm Chỉnh sửa");
    assert(find.commandIds.includes("common.edit.find") && find.commandIds.includes("common.edit.replace"), "Find/Replace dùng lệnh chung");
    assert(find.steps.length >= 3 && select.steps.length >= 3, "Phải có bước dùng thật");
    assert(/tất cả/i.test(find.summary), "Phải nói tìm trên mọi trang");
  });

  await test("Find nhảy đúng chuỗi trên nhiều slide khác nhau", () => {
    const canvas = canvasWithSlides();
    const first = canvas.findNext("chi phí");
    assert(first && first.slideIndex === 0 && first.field === "body", `Khớp đầu phải là body slide 0, thực tế ${JSON.stringify(first)}`);
    const second = canvas.findNext("chi phí");
    assert(second && second.slideIndex === 0 && second.field === "shape", `Khớp hai phải là shape slide 0, thực tế ${JSON.stringify(second)}`);
    const third = canvas.findNext("chi phí");
    assert(third && third.slideIndex === 1 && third.field === "body", `Khớp ba phải là body slide 1, thực tế ${JSON.stringify(third)}`);
    assert(canvas.currentSlideIndex === 1, "Phải chuyển sang slide chứa khớp");
  });

  await test("Replace All đổi thật nội dung nhiều slide và Undo khôi phục", () => {
    const canvas = canvasWithSlides();
    const count = canvas.replaceAll("chi phí", "ngân sách");
    assert(count === 3, `Phải thay 3 chỗ (body1, shape1, body2), thực tế ${count}`);
    assert(canvas.slides[0].body === "Tổng ngân sách dự toán", `Body slide 0: ${canvas.slides[0].body}`);
    assert(canvas.slides[0].shapes[0].text === "Ghi chú ngân sách", `Shape: ${canvas.slides[0].shapes[0].text}`);
    assert(canvas.slides[1].body === "ngân sách đào tạo nhân viên", `Body slide 1: ${canvas.slides[1].body}`);
    assert(canvas.slides[0].title === "Ngân sách quý 1", "Title không chứa 'chi phí' phải giữ nguyên");
    assert(canvas.undo() === true, "Undo replaceAll");
    assert(canvas.slides[0].body === "Tổng chi phí dự toán", "Undo phải trả body slide 0");
    assert(canvas.slides[0].shapes[0].text === "Ghi chú chi phí", "Undo phải trả chữ trên hình");
    assert(canvas.slides[1].body === "chi phí đào tạo nhân viên", "Undo phải trả body slide 1");
    assert(canvas.redo() === true, "Redo replaceAll");
    assert(canvas.slides[1].body === "ngân sách đào tạo nhân viên", "Redo phải áp lại thay thế");
  });

  await test("Replace một chỗ rồi Undo; Chọn tất cả / Chọn đối tượng", () => {
    const canvas = canvasWithSlides();
    assert(canvas.replaceOne("Ngân sách", "Dự toán") === true, "replaceOne title slide 0");
    assert(canvas.slides[0].title === "Dự toán quý 1", `Title sau replace: ${canvas.slides[0].title}`);
    assert(canvas.slides[1].title === "Kế hoạch nhân sự", "Slide khác không bị replaceOne");
    assert(canvas.undo() === true, "Undo replaceOne");
    assert(canvas.slides[0].title === "Ngân sách quý 1", "Undo phải trả title");
    assert(canvas.selectAllShapes() === true, "selectAllShapes");
    assert(canvas.selectedShapeIds.size === 2, `Chọn tất cả phải 2 hình, thực tế ${canvas.selectedShapeIds.size}`);
    assert(canvas.selectDrawingObjects() === true, "selectDrawingObjects");
    assert(canvas.selectedShapeIds.size === 1 && canvas.selectedShapeIds.has("11"), "Chọn đối tượng bỏ connector");
  });

  await test("Ctrl+G cÃ³ thá»ƒ nhÃ³m lÃªn nhÃ³m con vÃ  Ctrl+Shift+G gá»¡ nhÃ³m cha", () => {
    const canvas = canvasWithSlides();
    canvas.slides[0].shapes.push(
      { id: 13, type: "textbox", x: 220, y: 40, w: 80, h: 40, text: "Text" },
      { id: 14, type: "rect", x: 320, y: 40, w: 80, h: 40, text: "Shape" }
    );
    canvas.selectedShapeIds = new Set(["11", "13"]);
    assert(canvas.groupSelectedShapes(), "NhÃ³m hai shape Ä‘áº§u");
    const innerGroup = canvas.slides[0].shapes[0].groupId;
    canvas.selectedShapeIds = new Set(["11", "14"]);
    assert(canvas.groupSelectedShapes(), "NhÃ³m nhÃ³m con cÃ¹ng textbox");
    const outerGroup = canvas.slides[0].shapes[3].groupId;
    assert(outerGroup && outerGroup !== innerGroup, "NhÃ³m cha cÃ³ ID riÃªng");
    assert(canvas.slides[0].groups.find(group => group.id === innerGroup)?.parentId === outerGroup, "NhÃ³m con cÃ³ liÃªn káº¿t cha");
    assert(canvas.selectShapeFromUserClick(canvas.slides[0].shapes[0]), "Chá»n group sau khi táº¡o");
    assert(canvas.selectedShapeIds.size === 3, `Click nhÃ³m cha chá»n 3 shape, thá»±c táº¿ ${canvas.selectedShapeIds.size}`);
    assert(canvas.ungroupSelectedShapes(), "Bá»� nhÃ³m cha");
    assert(canvas.slides[0].shapes[0].groupId === innerGroup, "Gá»¡ nhÃ³m cha giá»¯ nhÃ³m con");
    assert(canvas.slides[0].shapes[3].groupId === null, "Shape trá»±c tiáº¿p thuá»™c nhÃ³m cha Ä‘Æ°á»£c gá»¡");
  });

  await test("Adapter handleDispatch Find/Replace/Select", async () => {
    const canvas = canvasWithSlides();
    const adapter = new SlidesAdapter(canvas);
    assert(await adapter.handleDispatch(".uno:SearchDialog", {}, "common.edit.find") === true, "dispatch find");
    assert(await adapter.handleDispatch(".uno:SearchDialog", {}, "common.edit.replace") === true, "dispatch replace");
    assert(await adapter.handleDispatch(".uno:SelectAll", {}, "slides.edit.selectAll") === true, "dispatch selectAll");
    assert(canvas.selectedShapeIds.size === 2, "handleDispatch chọn tất cả hình");
    assert(await adapter.handleDispatch(".uno:SelectObject", {}, "slides.edit.selectObjects") === true, "dispatch selectObjects");
    assert(canvas.selectedShapeIds.has("11") && canvas.selectedShapeIds.size === 1, "handleDispatch chọn đối tượng");
    canvas.replaceAll("chi phí", "NS");
    assert(canvas.slides[0].body.includes("NS"), "replaceAll qua canvas sau adapter");
  });

  return results;
}
