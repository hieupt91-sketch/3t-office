import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WORDART_PRESETS, buildWordArtCss, resolveWordArtStyle } from "../../apps/slides/insert-dialogs.js";

class FakeElement {
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.listeners = {}; this.className = ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  closest() { return null; }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || ""; }
  get offsetWidth() { return 960; }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.shapesLayer = null;
  canvas._renderThumbnails = () => {};
  canvas.selectSlide = (index) => { canvas.currentSlideIndex = index; };
  return canvas;
}

function collectCommandIds(items = []) {
  const ids = [];
  for (const item of items) {
    if (item.commandId) ids.push(item.commandId);
    if (item.items) ids.push(...collectCommandIds(item.items));
  }
  return ids;
}

export async function runSlidesWordArtTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("WordArt: command, UNO mapping, icon SVG, ribbon Chèn và i18n VI/EN", async () => {
    const command = SLIDES_COMMANDS.find(item => item.id === "slides.insert.wordart");
    if (!command) throw new Error("Thiếu slides.insert.wordart");
    if (mapVnCommandToUno(command.id) !== ".uno:FontworkGalleryFloater") throw new Error("UNO mapping sai");
    if (!ICONS[command.icon]?.includes("<svg") || ICONS[command.icon].includes('circle cx="12" cy="12" r="4"')) {
      throw new Error("Icon WordArt không phải SVG riêng");
    }
    const insertTab = SLIDES_RIBBON_TABS.find(tab => tab.id === "insert");
    const textGroup = insertTab?.groups.find(group => group.id === "text");
    if (!collectCommandIds(textGroup?.items).includes("slides.insert.wordart")) {
      throw new Error("WordArt chưa nằm trong nhóm Văn bản trên tab Chèn");
    }
    if (!viStrings.commands[command.id]?.label || !enStrings.commands[command.id]?.label) {
      throw new Error("Thiếu chuỗi command VI/EN");
    }
    const canvas = { insertWordArt: async (args) => args };
    const dispatched = await new SlidesAdapter(canvas).handleDispatch(mapVnCommandToUno(command.id), { text: "Aa", presetId: "navy-outline" }, command.id);
    if (!dispatched || dispatched.presetId !== "navy-outline") throw new Error("handleDispatch chưa gọi insertWordArt thật");
  });

  await test("WordArt: thư viện có ít nhất 8 mẫu fill/outline/gradient/shadow", () => {
    if (WORDART_PRESETS.length < 8) throw new Error(`Chỉ có ${WORDART_PRESETS.length} mẫu`);
    const ids = new Set(WORDART_PRESETS.map(item => item.id));
    if (ids.size !== WORDART_PRESETS.length) throw new Error("Preset trùng id");
    if (!WORDART_PRESETS.some(item => item.gradient?.from && item.gradient?.to)) throw new Error("Thiếu mẫu gradient");
    if (!WORDART_PRESETS.some(item => Number(item.strokeWidth) >= 3)) throw new Error("Thiếu mẫu outline đậm");
    if (!WORDART_PRESETS.some(item => item.shadow?.blur >= 6)) throw new Error("Thiếu mẫu đổ bóng");
    const css = buildWordArtCss(resolveWordArtStyle({ presetId: "ocean-gradient" }));
    if (!css.includes("linear-gradient") || !css.includes("background-clip:text") || !css.includes("-webkit-text-stroke") || !css.includes("text-shadow")) {
      throw new Error(`CSS ocean-gradient thiếu hiệu ứng: ${css}`);
    }
  });

  await test("WordArt: chèn shape type=wordart với text, font, fill/stroke/shadow", async () => {
    const canvas = createController();
    const shape = await canvas.insertWordArt({ text: "Khai giảng", presetId: "ocean-gradient" });
    if (!shape || shape.type !== "wordart") throw new Error("Không tạo shape wordart");
    const stored = canvas.slides[0].shapes.find(item => item.id === shape.id);
    if (!stored || stored.text !== "Khai giảng") throw new Error("Text chưa lưu vào slide.shapes");
    if (stored.presetId !== "ocean-gradient" || !stored.gradient?.from || !stored.strokeColor || !stored.shadow) {
      throw new Error(`Thiếu thuộc tính hiệu ứng: ${JSON.stringify(stored)}`);
    }
    if (stored.color !== "transparent") throw new Error("WordArt không được tô nền hình chữ nhật");
  });

  await test("WordArt: đổi chữ, xóa, Undo/Redo dùng stack shape có sẵn", async () => {
    const canvas = createController();
    const shape = await canvas.insertWordArt({ text: "Tiêu đề", presetId: "navy-outline" });
    if (canvas.undoStack.length !== 1 || canvas.undoStack[0].type !== "shape-add") {
      throw new Error("Insert không ghi action shape-add");
    }
    if (!canvas.updateShapeText(shape.id, "Học kỳ mới") || shape.text !== "Học kỳ mới") {
      throw new Error("updateShapeText không đổi chữ WordArt");
    }
    canvas.undoStack.push({ type: "shape-text-edit", slideIndex: 0, shapeId: shape.id, before: "Tiêu đề", after: "Học kỳ mới" });
    if (!canvas.undo() || shape.text !== "Tiêu đề") throw new Error("Undo chưa hoàn tác chữ");
    if (!canvas.redo() || shape.text !== "Học kỳ mới") throw new Error("Redo chưa làm lại chữ");
    if (!canvas.deleteShape(shape.id) || canvas.slides[0].shapes.length !== 0) throw new Error("Xóa WordArt thất bại");
    if (!canvas.undo() || canvas.slides[0].shapes.length !== 1) throw new Error("Undo xóa chưa khôi phục WordArt");
    if (!canvas.redo() || canvas.slides[0].shapes.length !== 0) throw new Error("Redo xóa chưa bỏ lại WordArt");
  });

  await test("WordArt: F5 và Slide Sorter render CSS text-shadow / text-stroke / background-clip", async () => {
    const canvas = createController();
    const shape = await canvas.insertWordArt({ text: "VN Office", presetId: "ocean-gradient" });
    const show = canvas._shapePresentationHtml(shape);
    if (!show.includes("vno-wordart-text") || !show.includes("VN Office")) throw new Error("F5 thiếu WordArt");
    if (!show.includes("linear-gradient") || !show.includes("background-clip:text") || !show.includes("-webkit-text-stroke") || !show.includes("text-shadow")) {
      throw new Error(`F5 HTML thiếu CSS hiệu ứng: ${show}`);
    }
    const sorter = canvas._shapeSorterHtml(shape);
    if (!sorter.includes("vno-sorter-wordart") || !sorter.includes("VN Office") || !sorter.includes("background-clip:text")) {
      throw new Error(`Slide Sorter thiếu WordArt CSS: ${sorter}`);
    }
  });

  await test("WordArt: serialize FODP ghi draw:text-box + vno:wordart-* rồi parse giữ nguyên", async () => {
    const canvas = createController();
    await canvas.insertWordArt({ text: "Chào năm học <mới>", presetId: "violet-gradient" });
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();
    if (!xml.includes('xmlns:vno="urn:vn-office:slides:1.0"')) throw new Error("Thiếu namespace vno");
    if (!xml.includes('vno:wordart="true"') || !xml.includes('vno:wordart-preset="violet-gradient"')) {
      throw new Error("FODP thiếu thuộc tính vno:wordart");
    }
    if (!xml.includes("<draw:text-box>") || !xml.includes("Chào năm học &lt;mới&gt;")) {
      throw new Error("FODP không ghi text-box / không escape chữ");
    }
    if (!xml.includes("style:text-outline") || !xml.includes("fo:text-shadow") || !xml.includes("fo:color")) {
      throw new Error("FODP thiếu style ODF best-effort cho màu/viền/bóng");
    }
    const parsed = adapter.parseFodp(xml);
    const wordart = (parsed[0]?.shapes || []).find(item => item.type === "wordart");
    if (!wordart) throw new Error("parseFodp không khôi phục type=wordart");
    if (wordart.text !== "Chào năm học <mới>") throw new Error(`Text lệch: ${wordart.text}`);
    if (wordart.presetId !== "violet-gradient" || !wordart.gradient?.from || !wordart.strokeColor || !wordart.shadow) {
      throw new Error(`Mất hiệu ứng sau round-trip: ${JSON.stringify(wordart)}`);
    }
  });

  await test("WordArt: handleDispatch trả false trung thực khi canvas không hỗ trợ", async () => {
    const adapter = new SlidesAdapter({});
    const result = await adapter.handleDispatch(".uno:FontworkGalleryFloater", { text: "Aa" }, "slides.insert.wordart");
    if (result !== false) throw new Error("Phải trả false khi thiếu insertWordArt, không được giả vờ thành công");
  });

  return results;
}
