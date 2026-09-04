import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

function assert(condition, message) { if (!condition) throw new Error(message); }
function container() { return { innerHTML: "", className: "", appendChild() {}, querySelector() { return null; }, style: { setProperty() {} } }; }

export async function runSlidesSlideSizeTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Slides Slide Size: command, mapping, Customize ribbon và SVG icon", () => {
    const design = SLIDES_RIBBON_TABS.find(tab => tab.id === "design");
    const customize = design.groups.find(group => group.labelKey === "slidesRibbon.group.customize");
    assert(customize?.items.some(item => item.commandId === "slides.design.slideSize"), "Thiếu Slide Size trong Customize");
    assert(VN_TO_UNO_MAP["slides.design.slideSize"] === ".uno:PageSetup", "UNO PageSetup mapping sai");
    assert(ICONS.slideSize?.includes("<svg"), "Thiếu icon slideSize SVG");
  });

  test("Slides Slide Size: 16:9 sang 4:3 scale mọi shape và connector", () => {
    const canvas = new SlidesCanvasController(container());
    canvas.slides[0].shapes = [
      { id: "box", type: "rect", x: 800, y: 400, w: 160, h: 100 },
      { id: "line", type: "connector", x: 100, y: 100, w: 700, h: 300, x1: 100, y1: 100, x2: 800, y2: 400 }
    ];
    canvas.slides[1].shapes = [{ id: "image", type: "image", x: 480, y: 270, w: 240, h: 135 }];
    assert(canvas.setSlideSize({ preset: "standard" }), "Không đổi được sang 4:3");
    assert(canvas.slideSize.width === 720 && canvas.slideSize.height === 540, "Khung 4:3 sai kích thước");
    assert(canvas.slides[0].shapes[0].x === 600 && canvas.slides[0].shapes[0].w === 120, "Shape slide 1 không scale ngang 0.75");
    assert(canvas.slides[0].shapes[1].x2 === 600 && canvas.slides[1].shapes[0].x === 360, "Connector hoặc shape slide 2 không scale");
    assert(canvas.slides.every(slide => (slide.shapes || []).every(shape => !Number.isFinite(shape.x + shape.w) || shape.x + shape.w <= 720)), "Có shape trôi khỏi khung 4:3");
  });

  test("Slides Slide Size: Undo/Redo khôi phục tỷ lệ và geometry chính xác", () => {
    const canvas = new SlidesCanvasController(container());
    canvas.slides[0].shapes = [{ id: "box", type: "rect", x: 320, y: 90, w: 200, h: 120 }];
    canvas.setSlideSize({ preset: "standard" });
    assert(canvas.undo() && canvas.slideSize.preset === "wide" && canvas.slides[0].shapes[0].x === 320, "Undo Slide Size sai");
    assert(canvas.redo() && canvas.slideSize.preset === "standard" && canvas.slides[0].shapes[0].x === 240, "Redo Slide Size sai");
  });

  return results;
}
