/**
 * VN Slides Format Background — Design > Customize, per-slide fill, FODP ODF, undo.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function container() {
  return {
    innerHTML: "",
    className: "",
    dataset: {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: { setProperty() {} }
  };
}

function canvasWithTwoSlides() {
  const canvas = new SlidesCanvasController(container());
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas._renderThumbnails = () => {};
  canvas._renderSlideSorterGrid = () => {};
  canvas._renderShapesLayer = () => {};
  canvas._refreshSpellcheckRoots = () => {};
  canvas.slides = [
    { id: 1, title: "Mot", body: "A", layoutType: "title-content", shapes: [] },
    { id: 2, title: "Hai", body: "B", layoutType: "title-content", shapes: [] }
  ];
  canvas.currentSlideIndex = 0;
  canvas.undoStack = [];
  canvas.redoStack = [];
  return canvas;
}

export async function runSlidesFormatBackgroundTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Design > Tùy chỉnh có slides.design.formatBackground cạnh Cỡ trang chiếu", () => {
    const design = SLIDES_RIBBON_TABS.find((tab) => tab.id === "design");
    const customize = design.groups.find((group) => group.labelKey === "slidesRibbon.group.customize");
    const ids = customize.items.map((item) => item.commandId);
    assert(ids.includes("slides.design.slideSize"), "Thiếu Slide Size");
    assert(ids.includes("slides.design.formatBackground"), "Thiếu Format Background");
  });

  await test("Command, icon, UNO mapping FormatPage", () => {
    const cmd = SLIDES_COMMANDS.find((item) => item.id === "slides.design.formatBackground");
    assert(cmd, "Thiếu command");
    assert(cmd.icon === "formatBackground", "Sai icon");
    assert(ICONS.formatBackground?.includes("<svg"), "Thiếu SVG");
    assert(VN_TO_UNO_MAP["slides.design.formatBackground"] === ".uno:FormatPage", "UNO mapping sai");
  });

  await test("i18n VI/EN cho slides.design.formatBackground", () => {
    try {
      setLocale("vi");
      assert(tCommand("slides.design.formatBackground", "label") === "Định dạng nền", "VI label sai");
      setLocale("en");
      assert(tCommand("slides.design.formatBackground", "label") === "Format Background", "EN label sai");
    } finally {
      setLocale("vi");
    }
  });

  await test("Màu đơn chỉ đổi slide hiện tại, không đổi theme hay slide khác", () => {
    const canvas = canvasWithTwoSlides();
    const themeBg = canvas.masterTheme.bgColor;
    assert(canvas.applySlideBackground({ type: "solid", color: "#dc2626" }) === true, "apply thất bại");
    assert(canvas.slides[0].background?.type === "solid", "Thiếu background solid");
    assert(canvas.slides[0].background.color === "#dc2626", "Sai màu");
    assert(!canvas.slides[1].background, "Không được đụng slide khác");
    assert(canvas.masterTheme.bgColor === themeBg, "Không được đổi theme");
    assert(canvas.canvasEl.style.backgroundColor === "#dc2626", "Canvas chưa áp màu");
  });

  await test("Gradient 2 màu áp dụng tất cả trang", () => {
    const canvas = canvasWithTwoSlides();
    canvas.applySlideBackground({
      type: "gradient",
      gradient: { from: "#1e3a8a", to: "#ffffff", direction: "horizontal" }
    }, { applyAll: true });
    assert(canvas.slides[0].background?.type === "gradient", "slide 1 thiếu gradient");
    assert(canvas.slides[1].background?.gradient?.to === "#ffffff", "slide 2 thiếu gradient");
    assert(String(canvas.canvasEl.style.backgroundImage).includes("linear-gradient"), "Canvas chưa có CSS gradient");
  });

  await test("Undo/Redo khôi phục nền trên stack hiện có", () => {
    const canvas = canvasWithTwoSlides();
    canvas.applySlideBackground({ type: "solid", color: "#16a34a" });
    assert(canvas.undoStack.at(-1)?.type === "slide-background", "Phải dùng type slide-background");
    canvas.undo();
    assert(!canvas.slides[0].background, "Undo phải gỡ nền tùy chỉnh");
    canvas.redo();
    assert(canvas.slides[0].background?.color === "#16a34a", "Redo phải trả màu");
  });

  await test("FODP dùng draw:fill/draw:fill-color ODF, không vno:background", () => {
    const canvas = canvasWithTwoSlides();
    canvas.slides[0].background = { type: "solid", color: "#dc2626" };
    canvas.slides[1].background = {
      type: "gradient",
      gradient: { from: "#1e3a8a", to: "#f8fafc", direction: "vertical" }
    };
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();
    assert(!/vno:background/i.test(xml), "Không được dùng vno:background");
    assert(/draw:fill="solid"/i.test(xml) && /draw:fill-color="#dc2626"/i.test(xml), "Thiếu solid ODF");
    assert(/draw:fill="gradient"/i.test(xml) && /<draw:gradient /i.test(xml), "Thiếu gradient ODF");
    assert(/draw:start-color="#1e3a8a"/i.test(xml), "Thiếu start-color");
    const parsed = adapter.parseFodp(xml);
    assert(parsed[0].background?.type === "solid", "parse mất solid");
    assert(parsed[0].background.color === "#dc2626", `parse solid sai: ${JSON.stringify(parsed[0].background)}`);
    assert(parsed[1].background?.type === "gradient", "parse mất gradient");
    assert(parsed[1].background.gradient.direction === "vertical", "parse direction sai");
  });

  await test("FODP ảnh nền dùng draw:fill=bitmap + office:binary-data", () => {
    const canvas = canvasWithTwoSlides();
    canvas.slides[0].background = { type: "picture", picture: TINY_PNG };
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();
    assert(/draw:fill="bitmap"/i.test(xml), "Thiếu draw:fill=bitmap");
    assert(/<draw:fill-image /i.test(xml) && /<office:binary-data>/i.test(xml), "Thiếu fill-image binary");
    assert(!/vno:background/i.test(xml), "Không dùng vno:* cho ảnh nền");
    const parsed = adapter.parseFodp(xml);
    assert(parsed[0].background?.type === "picture", "parse mất picture");
    assert(String(parsed[0].background.picture).startsWith("data:image/png;base64,"), "picture không phải data URL");
  });

  await test("Adapter handleDispatch slides.design.formatBackground gọi dialog", async () => {
    const calls = [];
    const adapter = new SlidesAdapter({
      showFormatBackgroundDialog(args) { calls.push(args || {}); return true; }
    });
    const ok = await adapter.handleDispatch(".uno:FormatPage", null, "slides.design.formatBackground");
    assert(ok === true && calls.length === 1, "Dispatch dialog thất bại");
  });

  return results;
}
