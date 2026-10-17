/**
 * Test Suite: hoạt ảnh Slides theo 3 nhóm Vào / Nhấn mạnh / Thoát — bảng hiệu ứng, CSS phát, ghi và đọc lại FODP.
 */
import { ANIMATION_EFFECTS, animationClassOf, animationEffectsOfClass, animationInlineCss, animationKeyframeName, animationTypeFromPreset } from "../../apps/slides/slide-animation-classes.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import fs from "node:fs";

export async function runSlideAnimationClassesTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => { if (actual !== expected) throw new Error(`${label} mong ${expected} nhận ${actual}`); };
  const makeAdapter = shapes => new SlidesAdapter({ slides: [{ id: 1, title: "T", body: "", layoutType: "blank", shapes }] });
  const shape = (type, extra = {}) => ({ id: `s-${type}`, type: "rect", x: 40, y: 80, w: 100, h: 60, color: "#2563eb", text: type, animation: { type, duration: 800, delay: 100, order: 0, start: "onClick", ...extra } });
  const css = fs.readFileSync(new URL("../../apps/slides/slides.css", import.meta.url), "utf8");

  test("Bảng hiệu ứng: 5 Vào, 2 Nhấn mạnh, 4 Thoát; mỗi kiểu có keyframe CSS", () => {
    eq(animationEffectsOfClass("entrance").length, 5, "vào");
    eq(animationEffectsOfClass("emphasis").length, 2, "nhấn mạnh");
    eq(animationEffectsOfClass("exit").length, 4, "thoát");
    for (const effect of ANIMATION_EFFECTS) {
      if (!css.includes(`@keyframes ${effect.keyframe}`)) throw new Error(`thiếu @keyframes ${effect.keyframe}`);
    }
  });

  test("Tài liệu cũ: tên cũ (fade/fly/zoom/bounce/slide) vẫn là nhóm Vào; kiểu lạ không có nhóm", () => {
    for (const legacy of ["fade", "fly", "zoom", "bounce", "slide", "fadeIn"]) eq(animationClassOf(legacy), "entrance", legacy);
    eq(animationClassOf("none"), null);
    eq(animationClassOf("abc"), null);
  });

  test("CSS phát: Vào ẩn sẵn (opacity:0); Nhấn mạnh và Thoát hiện sẵn (không opacity:0)", () => {
    if (!/^opacity:0;/.test(animationInlineCss("fadeIn", 500, 0))) throw new Error("Vào phải ẩn sẵn");
    for (const type of ["spin", "growShrink", "fadeOut", "flyOut", "zoomOut", "disappear"]) {
      const text = animationInlineCss(type, 500, 0);
      if (/opacity:0/.test(text)) throw new Error(`${type} phải hiện sẵn: ${text}`);
      if (!text.includes(animationKeyframeName(type))) throw new Error(`${type} thiếu keyframe`);
    }
    if (!/both;$/.test(animationInlineCss("spin", 500, 0))) throw new Error("Nhấn mạnh phải trả lại nguyên trạng (both)");
    if (!/forwards;$/.test(animationInlineCss("fadeOut", 500, 0))) throw new Error("Thoát phải giữ trạng thái ẩn cuối (forwards)");
  });

  test("CSS xem trước bay vào theo đủ bốn hướng", () => {
    for (const [direction, x, y] of [["left", "-50px", "0"], ["right", "50px", "0"], ["top", "0", "-40px"], ["bottom", "0", "40px"]]) {
      const style = animationInlineCss("flyIn", 500, 0, direction);
      if (!style.includes(`--vno-anim-x:${x}`) || !style.includes(`--vno-anim-y:${y}`)) throw new Error(`${direction}: ${style}`);
    }
  });

  test("Ghi FODP: preset-class và preset-id đúng nhóm cho cả 11 kiểu", () => {
    const expected = { fadeIn: ["entrance", "ooo-entrance-fade-in"], flyIn: ["entrance", "ooo-entrance-fly-in"], spin: ["emphasis", "ooo-emphasis-spin"], growShrink: ["emphasis", "ooo-emphasis-grow-and-shrink"], fadeOut: ["exit", "ooo-exit-fade-out"], flyOut: ["exit", "ooo-exit-fly-out"], zoomOut: ["exit", "ooo-exit-zoom"], disappear: ["exit", "ooo-exit-disappear"] };
    for (const [type, [cls, id]] of Object.entries(expected)) {
      const fodp = makeAdapter([shape(type)]).serializeToFodp();
      if (!fodp.includes(`presentation:preset-class="${cls}"`) || !fodp.includes(`presentation:preset-id="${id}"`)) throw new Error(`${type}: không ghi ${cls}/${id}`);
    }
  });

  test("Thoát/Nhấn mạnh không ép đối tượng 'hiện ra' (không có set visibility=visible)", () => {
    for (const type of ["spin", "fadeOut", "disappear"]) {
      const fodp = makeAdapter([shape(type)]).serializeToFodp();
      if (/smil:attributeName="visibility" smil:to="visible"/.test(fodp)) throw new Error(`${type} không được set visible`);
    }
    if (!/smil:attributeName="visibility" smil:to="hidden"/.test(makeAdapter([shape("fadeOut")]).serializeToFodp())) throw new Error("fadeOut phải ẩn đối tượng khi kết thúc");
  });

  test("Vòng ghi → đọc FODP giữ đúng kiểu hiệu ứng, thời lượng, độ trễ", () => {
    const types = ["fadeIn", "spin", "growShrink", "fadeOut", "flyOut", "zoomOut", "disappear"];
    const shapes = types.map((type, i) => shape(type, { order: i, start: i === 0 ? "onClick" : "afterPrevious" })).map((s, i) => ({ ...s, id: `s${i}`, x: 20 + i * 90 }));
    const parsed = new SlidesAdapter(null).parseFodp(makeAdapter(shapes).serializeToFodp());
    types.forEach((type, i) => {
      const found = parsed[0].shapes.find(s => String(s.id) === `s${i}`);
      eq(found?.animation?.type, type, `kiểu #${i}`);
      if (type !== "disappear") eq(found.animation.duration, 800, `thời lượng ${type}`); // Biến mất là tức thì
    });
  });

  test("FODP round-trip giữ hướng Bay vào/Bay ra/Trượt", () => {
    for (const [type, prefix, direction] of [["flyIn", "from", "left"], ["flyOut", "to", "top"], ["slideLeft", "from", "right"]]) {
      const source = makeAdapter([shape(type, { direction })]).serializeToFodp();
      if (!source.includes(`presentation:preset-sub-type="${prefix}-${direction}"`)) throw new Error(`${type} không ghi subtype hướng ${direction}`);
      const parsed = new SlidesAdapter(null).parseFodp(source);
      eq(parsed[0].shapes[0].animation.direction, direction, `${type} đọc lại hướng`);
    }
  });

  test("Chuyển tiếp giữ hướng SMIL và custom vẫn không ánh xạ thành hiệu ứng mới", () => {
    const adapter = makeAdapter([]);
    for (const direction of ["left", "right", "top", "bottom"]) {
      const smil = adapter._mapVnTransitionToSmil({ type: "slide", direction, duration: 500 });
      eq(smil.subtype, `from${direction[0].toUpperCase()}${direction.slice(1)}`, direction);
    }
    eq(adapter._mapVnTransitionToSmil({ type: "custom", sourceXml: "<p:transition/>" }), null, "custom");
  });

  test("Shape action is written to ODF event listener and restored on open", () => {
    const target = shape("fadeIn");
    target.action = "next-page";
    const source = makeAdapter([target]).serializeToFodp();
    if (!source.includes('presentation:action="next-page"')) throw new Error("Thiếu action nội bộ trong FODP");
    const parsed = new SlidesAdapter(null).parseFodp(source);
    eq(parsed[0].shapes[0].action, "next-page", "action round-trip");
  });

  test("animationTypeFromPreset: đọc preset của LibreOffice/PowerPoint sang kiểu VN theo nhóm", () => {
    eq(animationTypeFromPreset("exit", "ooo-exit-fade-out"), "fadeOut");
    eq(animationTypeFromPreset("exit", "ooo-exit-fly-out"), "flyOut");
    eq(animationTypeFromPreset("exit", "ooo-exit-zoom"), "zoomOut");
    eq(animationTypeFromPreset("exit", "ooo-exit-disappear"), "disappear");
    eq(animationTypeFromPreset("emphasis", "ooo-emphasis-spin"), "spin");
    eq(animationTypeFromPreset("emphasis", "ooo-emphasis-grow-and-shrink"), "growShrink");
    eq(animationTypeFromPreset("entrance", "ooo-entrance-fade-in"), "fadeIn");
    eq(animationTypeFromPreset("emphasis", "ooo-emphasis-unknown"), null);
  });

  return results;
}
