/**
 * VN Slides Format Painter — ribbon, command, shape fill, lock/Esc, undo, adapter.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

function flatten(items) {
  return (items || []).flatMap((item) => item.items ? flatten(item.items) : [item]);
}

function container() {
  const classes = new Set();
  const dataset = {};
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    innerHTML: "",
    dataset,
    className: "",
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
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

function canvasWithShapes() {
  const canvas = new SlidesCanvasController(container());
  canvas.shapesLayer = null;
  canvas._renderThumbnails = () => {};
  canvas._renderShapesLayer = () => {};
  canvas._refreshSpellcheckRoots = () => {};
  canvas.slides = [{
    id: 1,
    title: "Tieu de",
    body: "Noi dung",
    layoutType: "title-content",
    shapes: [
      { id: 11, type: "rect", x: 40, y: 40, w: 120, h: 80, color: "#fff200", text: "" },
      { id: 22, type: "ellipse", x: 200, y: 40, w: 120, h: 80, color: "#3b82f6", text: "" },
      { id: 33, type: "rect", x: 360, y: 40, w: 120, h: 80, color: "#16a34a", text: "" }
    ]
  }];
  canvas.currentSlideIndex = 0;
  canvas.undoStack = [];
  canvas.redoStack = [];
  return canvas;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSlidesFormatPainterTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Ribbon Home / Bảng nhớ tạm có slides.edit.formatPainter cạnh Cắt/Sao chép", () => {
    const home = SLIDES_RIBBON_TABS.find((tab) => tab.id === "home");
    const clipboard = home.groups.find((group) => group.labelKey === "slidesRibbon.group.clipboard");
    const ids = flatten(clipboard.items).map((item) => item.commandId);
    assert(ids.includes("common.edit.paste"), "Thiếu Dán");
    assert(ids.includes("common.edit.cut"), "Thiếu Cắt");
    assert(ids.includes("common.edit.copy"), "Thiếu Sao chép");
    assert(ids.includes("slides.edit.formatPainter"), "Thiếu Format Painter");
    assert(ids.indexOf("slides.edit.formatPainter") > ids.indexOf("common.edit.copy"), "Format Painter phải nằm dưới Copy trong nhóm clipboard");
  });

  await test("Command slides.edit.formatPainter được khai báo, icon cọ vẽ, map UNO Impress", () => {
    const cmd = SLIDES_COMMANDS.find((item) => item.id === "slides.edit.formatPainter");
    assert(cmd, "Thiếu command slides.edit.formatPainter");
    assert(cmd.icon === "formatPainter", "Phải dùng icon formatPainter");
    assert(cmd.isToggle === true, "Phải là lệnh toggle");
    assert(!cmd.shortcut, "Không được trùng Ctrl+Shift+C của Writer");
    assert(ICONS.formatPainter, "Thiếu SVG formatPainter");
    assert(VN_TO_UNO_MAP["slides.edit.formatPainter"] === ".uno:FormatPaintbrush", "Phải map .uno:FormatPaintbrush của Impress");
  });

  await test("i18n VI/EN cho slides.edit.formatPainter", () => {
    try {
      setLocale("vi");
      assert(tCommand("slides.edit.formatPainter", "label") === "Sao chép định dạng", "VI label sai");
      setLocale("en");
      assert(tCommand("slides.edit.formatPainter", "label") === "Format Painter", "EN label sai");
    } finally {
      setLocale("vi");
    }
  });

  await test("Format Painter: click hình đích nhận màu nền nguồn, không đổi vị trí/chữ", () => {
    const canvas = canvasWithShapes();
    canvas.setSelectedTarget(11);
    assert(canvas.toggleFormatPainter() === true, "Bật Format Painter phải thành công");
    assert(canvas.formatPainter?.shape?.color === "#fff200", "Nguồn phải là màu hình đang chọn");
    assert(canvas.container.classList.contains("vno-format-painter-active"), "Phải gắn class con trỏ cọ vẽ");
    assert(canvas.container.dataset.formatPainter === "on", "dataset phải ghi on");
    const dest = canvas.slides[0].shapes[1];
    assert(canvas.applyFormatPainterToShape(dest) === true, "Áp dụng lên hình đích phải thành công");
    assert(dest.color === "#fff200", "Hình đích phải nhận màu nguồn");
    assert(dest.x === 200 && dest.w === 120, "Không được đổi hình học đích");
    assert(dest.text === "", "Không được đổi chữ đích");
    assert(!canvas.formatPainter, "Chế độ một lần phải tự tắt sau khi áp dụng");
    assert(!canvas.container.classList.contains("vno-format-painter-active"), "Con trỏ phải trở về bình thường");
  });

  await test("Format Painter: áp cỡ chữ nguồn lên toàn bộ các run chữ đích", () => {
    const canvas = canvasWithShapes();
    const previousDocument = globalThis.document;
    const run = { style: { fontSize: "18pt" } };
    globalThis.document = {
      execCommand() { return true; },
      queryCommandState() { return false; }
    };
    try {
      const editable = {
        style: {},
        focus() {},
        querySelectorAll() { return [run]; }
      };
      assert(canvas._applyCopiedTextFormat({ fontSize: "64px" }, editable), "Phải áp được định dạng cỡ chữ");
      assert(editable.style.fontSize === "64px", "Phải áp cỡ chữ lên vùng chữ");
      assert(run.style.fontSize === "64px", "Phải thay cỡ chữ trên run có định dạng riêng");
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });

  await test("Format Painter: double-click khóa, áp dụng nhiều hình đến khi Esc", () => {
    const canvas = canvasWithShapes();
    canvas.setSelectedTarget(11);
    canvas.toggleFormatPainter({ locked: true });
    assert(canvas.formatPainter.locked === true, "Phải vào chế độ khóa");
    assert(canvas.container.dataset.formatPainter === "locked", "dataset phải ghi locked");
    canvas.applyFormatPainterToShape(canvas.slides[0].shapes[1]);
    assert(canvas.formatPainter?.locked === true, "Khóa phải giữ sau lần áp dụng đầu");
    assert(canvas.slides[0].shapes[1].color === "#fff200", "Ellipse phải nhận màu");
    canvas.applyFormatPainterToShape(canvas.slides[0].shapes[2]);
    assert(canvas.slides[0].shapes[2].color === "#fff200", "Hình thứ ba phải nhận màu lần 2");
    assert(canvas.formatPainter, "Chế độ khóa vẫn bật trước Esc");
    canvas.cancelFormatPainter();
    assert(!canvas.formatPainter, "Esc/hủy phải tắt chế độ");
  });

  await test("Format Painter: Esc hủy khi chưa áp dụng; bấm lại nút cũng tắt", () => {
    const canvas = canvasWithShapes();
    canvas.setSelectedTarget(11);
    canvas.toggleFormatPainter();
    assert(canvas.formatPainter, "Phải đang bật");
    canvas.cancelFormatPainter();
    assert(!canvas.formatPainter, "cancelFormatPainter phải tắt");
    canvas.toggleFormatPainter();
    canvas._formatPainterActivatedAt = Date.now() - 500;
    assert(canvas.toggleFormatPainter() === false, "Bấm lại nút sau khi đã bật phải tắt");
    assert(!canvas.formatPainter, "Bấm lại nút phải hủy chế độ");
  });

  await test("Format Painter: mỗi lần sơn hình là một bước Undo/Redo trên stack hiện có", () => {
    const canvas = canvasWithShapes();
    canvas.setSelectedTarget(11);
    canvas.startFormatPainter();
    canvas.undoStack = [];
    canvas.applyFormatPainterToShape(canvas.slides[0].shapes[1]);
    assert(canvas.undoStack.length === 1, "Một lần áp dụng phải đúng một bước history");
    assert(canvas.undoStack[0].type === "shape-format", "Phải dùng type shape-format trên undoStack sẵn có");
    assert(canvas.slides[0].shapes[1].color === "#fff200", "Style mới phải được áp");
    canvas.undo();
    assert(canvas.slides[0].shapes[1].color === "#3b82f6", "Undo phải trả màu cũ");
    assert(canvas.slides[0].shapes[1].x === 200, "Undo không được đụng vị trí");
    canvas.redo();
    assert(canvas.slides[0].shapes[1].color === "#fff200", "Redo phải sơn lại màu nguồn");
  });

  await test("Format Painter: không sao chép fill của ảnh/bảng/WordArt", () => {
    const canvas = canvasWithShapes();
    canvas.slides[0].shapes.push({ id: 99, type: "image", x: 10, y: 10, w: 80, h: 80, src: "data:image/png;base64,xx" });
    canvas.setSelectedTarget(99);
    assert(canvas.toggleFormatPainter() === false, "Ảnh không phải nguồn fill");
    canvas.setSelectedTarget(11);
    canvas.startFormatPainter();
    const image = canvas.slides[0].shapes.find((item) => item.id === 99);
    assert(canvas.applyFormatPainterToShape(image) === false, "Không sơn fill lên ảnh");
  });

  await test("SlidesAdapter handleDispatch slides.edit.formatPainter gọi canvas.toggleFormatPainter", async () => {
    const calls = [];
    const adapter = new SlidesAdapter({
      toggleFormatPainter(args) { calls.push(args || {}); return true; }
    });
    const ok = await adapter.handleDispatch(".uno:FormatPaintbrush", { locked: true }, "slides.edit.formatPainter");
    assert(ok === true, "Dispatch phải thành công");
    assert(calls[0]?.locked === true, "Phải chuyển args.locked");
  });

  return results;
}
