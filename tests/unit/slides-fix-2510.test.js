/**
 * Unit tests — FIX-SLIDES-2510 (docs/PLAN-FIX-SLIDES-2510.md).
 * D1: mở lại PPTX do Slide lưu bị vẽ tiêu đề/nội dung hai lần.
 * D7: dấu đầu dòng bị cắt khi soạn (ul padding-left 0).
 * D8: chữ trong hình dựng sẵn bị SVG che; lưu PPTX co hình theo chữ; mở lại mũi tên thành chữ nhật.
 * FODP dưới đây mô phỏng đúng cấu trúc soffice trả về khi chuyển PPTX do Slide lưu sang FODP
 * (đo bằng soffice pilot macOS ngày 25-10: master-page VNOTitleContent, khung «PlaceHolder N»,
 * presentation:user-transformed="true"). Nội dung tổng hợp, không dùng tệp người dùng.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function newCanvas() {
  const canvas = new SlidesCanvasController({ innerHTML: "", className: "", appendChild() {} });
  canvas.slides = [{ id: 1, title: "Một", body: "", layoutType: "title-content", shapes: [], notes: "" }];
  canvas.currentSlideIndex = 0;
  return canvas;
}

const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"';

function sofficeLikeFodp(pagesXml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS}>
<office:master-styles>
<style:master-page style:name="VNOTitleContent" style:page-layout-name="PM1" draw:style-name="dp1"/>
<style:master-page style:name="VNOTwoContent" style:page-layout-name="PM1" draw:style-name="dp1"/>
</office:master-styles>
<office:body><office:presentation>${pagesXml}</office:presentation></office:body></office:document>`;
}

const placeholderFrame = (n, cls, x, y, w, h, inner) =>
  `<draw:frame draw:name="PlaceHolder ${n}" presentation:style-name="pr${n}" draw:layer="layout" svg:width="${w}cm" svg:height="${h}cm" svg:x="${x}cm" svg:y="${y}cm" presentation:class="${cls}" presentation:user-transformed="true"><draw:text-box>${inner}</draw:text-box></draw:frame>`;

const TITLE_CONTENT_PAGES = `
<draw:page draw:name="Trang 1" draw:style-name="dp3" draw:master-page-name="VNOTitleContent" presentation:presentation-page-layout-name="AL1T1">
${placeholderFrame(1, "title", "2.419", "2.418", "29.028", "3.63", "<text:p>Báo cáo tổng hợp</text:p>")}
${placeholderFrame(2, "outline", "2.419", "6.652", "29.028", "13.304", "<text:p>Nhóm Dự án mẫu</text:p>")}
</draw:page>
<draw:page draw:name="Trang 2" draw:style-name="dp3" draw:master-page-name="VNOTitleContent" presentation:presentation-page-layout-name="AL1T1">
${placeholderFrame(1, "title", "2.419", "2.418", "29.028", "3.63", "<text:p>Việc cần làm</text:p>")}
${placeholderFrame(2, "outline", "2.419", "6.652", "29.028", "13.304", '<text:list text:style-name="L1"><text:list-item><text:p>Mục một</text:p></text:list-item><text:list-item><text:p>Mục hai</text:p></text:list-item></text:list>')}
<draw:custom-shape draw:name="Mũi tên phải 1" draw:style-name="gr5" draw:layer="layout" svg:width="7.055cm" svg:height="3.175cm" svg:x="20.461cm" svg:y="12.347cm"><text:p>Mục tiêu</text:p><draw:enhanced-geometry svg:viewBox="0 0 0 0" draw:type="ooxml-rightArrow" draw:modifiers="50000 50000" draw:enhanced-path="M 0 0 Z N"/></draw:custom-shape>
</draw:page>`;

export async function runSlidesFix2510Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // ---------------------------------------------------------------- D1
  await test("D1 Mở lại PPTX do Slide lưu (bố cục VNOTitleContent, khung PlaceHolder N user-transformed): tiêu đề/nội dung KHÔNG thành thêm hộp chữ", () => {
    const slides = new SlidesAdapter(newCanvas()).parseFodp(sofficeLikeFodp(TITLE_CONTENT_PAGES));
    assert(slides.length === 2, `phải có 2 trang, có ${slides.length}`);
    for (const [i, slide] of slides.entries()) {
      assert(slide.layoutType === "title-content", `trang ${i + 1} phải giữ bố cục title-content, nhận ${slide.layoutType}`);
      const dupes = slide.shapes.filter((s) => s.type === "textbox");
      assert(dupes.length === 0, `trang ${i + 1} không được có hộp chữ trùng tiêu đề/nội dung, nhận ${JSON.stringify(dupes.map((s) => s.text))}`);
    }
    assert(slides[0].title === "Báo cáo tổng hợp" && slides[0].body === "Nhóm Dự án mẫu", `trang 1 sai: ${slides[0].title} | ${slides[0].body}`);
    assert(slides[1].title === "Việc cần làm" && slides[1].body === "Mục một\nMục hai", `trang 2 sai: ${slides[1].title} | ${JSON.stringify(slides[1].body)}`);
    assert(slides[1].shapes.length === 1 && /rightArrow/.test(slides[1].shapes[0].geomType || ""), "hình mũi tên (không phải placeholder) vẫn phải là shape");
  });

  await test("D1 Bố cục hai nội dung (VNOTwoContent): 1 tiêu đề + 2 khung nội dung không bị nhân đôi; khung lớp outline THỪA vẫn giữ là hộp chữ", () => {
    const pages = `
<draw:page draw:name="Trang 1" draw:master-page-name="VNOTwoContent" presentation:presentation-page-layout-name="AL2T3">
${placeholderFrame(1, "title", "2", "2", "24", "3", "<text:p>So sánh</text:p>")}
${placeholderFrame(2, "outline", "2", "5.5", "11.5", "11", "<text:p>Trái</text:p>")}
${placeholderFrame(3, "outline", "14.5", "5.5", "11.5", "11", "<text:p>Phải</text:p>")}
${placeholderFrame(4, "outline", "3", "17", "5", "1", "<text:p>Ghi chú thêm</text:p>")}
</draw:page>`;
    const [slide] = new SlidesAdapter(newCanvas()).parseFodp(sofficeLikeFodp(pages));
    assert(slide.layoutType === "two-content", `phải là two-content, nhận ${slide.layoutType}`);
    assert(slide.title === "So sánh" && slide.body === "Trái", `tiêu đề/nội dung trái sai: ${slide.title} | ${slide.body}`);
    const texts = slide.shapes.filter((s) => s.type === "textbox").map((s) => s.text);
    assert(!texts.includes("So sánh") && !texts.includes("Trái") && !texts.includes("Phải"), `placeholder bị giữ thành hộp chữ: ${JSON.stringify(texts)}`);
    assert(texts.includes("Ghi chú thêm"), `khung outline thừa phải giữ là hộp chữ, nhận ${JSON.stringify(texts)}`);
    assert(slide.body2 === "Phải", `body2 chỉ lấy khung nội dung thứ hai (không gộp khung thừa), nhận ${JSON.stringify(slide.body2)}`);
  });

  await test("D1 Lưu → mở lại qua FODP của chính Slide (bố cục VN) vẫn 1 tiêu đề, 1 nội dung, 0 hộp chữ trùng", () => {
    const canvas = newCanvas();
    canvas.slides = [{ id: 1, title: "Tiêu đề A", body: "Dòng 1\nDòng 2", layoutType: "title-content", shapes: [], notes: "" }];
    const adapter = new SlidesAdapter(canvas);
    const back = adapter.parseFodp(adapter.serializeToFodp());
    assert(back[0].title === "Tiêu đề A" && back[0].shapes.filter((s) => s.type === "textbox").length === 0, `vòng FODP sai: ${JSON.stringify(back[0])}`);
  });

  // ---------------------------------------------------------------- D7
  await test("D7 CSS Slide: danh sách trong khung nội dung/tiêu đề/chữ hình có thụt lề trái > 0 (reset * {padding:0} của shell không cắt dấu đầu dòng)", () => {
    const css = fs.readFileSync(path.join(rootDir, "apps/slides/slides.css"), "utf8");
    const rule = css.match(/([^{}]*\.vno-slide-body\s+:is\(ul,\s*ol\)[^{}]*)\{([^}]*)\}/);
    assert(rule, "slides.css phải có quy tắc cho .vno-slide-body :is(ul, ol)");
    for (const sel of [".vno-slide-title", ".vno-shape-text", ".vno-shape-textbox-text"]) {
      assert(rule[1].includes(sel), `quy tắc danh sách phải phủ ${sel}`);
    }
    const pad = rule[2].match(/padding-(?:left|inline-start)\s*:\s*([\d.]+)(em|px)/);
    assert(pad && Number(pad[1]) > 0, `thụt lề danh sách phải > 0, nhận ${rule[2].trim()}`);
  });

  // ---------------------------------------------------------------- D8
  await test("D8 CSS Slide: khối chữ trong hình nằm TRÊN lớp SVG hình dựng sẵn (position: relative)", () => {
    const css = fs.readFileSync(path.join(rootDir, "apps/slides/slides.css"), "utf8");
    const rule = css.match(/([^{}]*\.vno-shape-geometry\s*~\s*\.vno-shape-text[^{}]*)\{([^}]*)\}/);
    assert(rule, "slides.css phải có quy tắc .vno-shape-geometry ~ .vno-shape-text");
    assert(/position\s*:\s*relative/.test(rule[2]), `chữ phải được định vị để vẽ trên SVG, nhận ${rule[2].trim()}`);
  });

  await test("D8 Mở lại: hình nhập ooxml-rightArrow (type arrow) được vẽ bằng hình dựng sẵn mũi tên, không phải chữ nhật", () => {
    const canvas = newCanvas();
    assert(typeof canvas._presetForShape === "function", "canvas phải có _presetForShape");
    assert(canvas._presetForShape({ type: "arrow", geomType: "ooxml-rightArrow" })?.id === "rightArrow", "arrow + ooxml-rightArrow → rightArrow");
    assert(canvas._presetForShape({ type: "arrow" })?.id === "rightArrow", "arrow cũ không geomType → rightArrow");
    assert(canvas._presetForShape({ type: "arrow", geomType: "ooxml-leftArrow" })?.id === "leftArrow", "arrow + ooxml-leftArrow → leftArrow");
    assert(canvas._presetForShape({ type: "rect", geomType: "ooxml-star5" })?.id === "star5", "rect + ooxml-star5 → star5");
    assert(canvas._presetForShape({ type: "rect" }) === null, "chữ nhật thường không có preset");
    assert(canvas._presetForShape({ type: "ellipse", geomType: "ooxml-rightArrow" }) === null, "elip không dùng preset");
    const [, slide2] = new SlidesAdapter(newCanvas()).parseFodp(sofficeLikeFodp(TITLE_CONTENT_PAGES));
    assert(canvas._presetForShape(slide2.shapes[0])?.path, "mũi tên mở lại phải có đường vẽ SVG");
  });

  await test("D8 Lưu: hình dựng sẵn có chữ ghi draw:auto-grow-height=false (LibreOffice không co hình theo chữ) và căn giữa dọc; hộp chữ có nền vẫn tự giãn", () => {
    const canvas = newCanvas();
    canvas.slides[0].shapes = [
      { id: 11, type: "rect", geomType: "ooxml-rightArrow", x: 380, y: 210, w: 200, h: 120, color: "#3b82f6", text: "Mục tiêu" },
      { id: 12, type: "rect", x: 10, y: 10, w: 100, h: 60, color: "#3b82f6", text: "" },
      { id: 13, type: "textbox", x: 10, y: 300, w: 200, h: 60, color: "#3b82f6", text: "Hộp chữ" },
      { id: 14, type: "rect", x: 300, y: 300, w: 200, h: 60, color: "#3b82f6", text: "Chữ nhật thường" }
    ];
    const fodp = new SlidesAdapter(canvas).serializeToFodp();
    const styleOf = (shapeId) => {
      const el = fodp.match(new RegExp(`<draw:[a-z-]+ [^>]*vno:shape-id="${shapeId}"[^>]*>`))?.[0] || "";
      const name = el.match(/draw:style-name="([^"]+)"/)?.[1];
      const style = fodp.match(new RegExp(`<style:style style:name="${name}" style:family="graphic">[\\s\\S]*?</style:style>`))?.[0] || "";
      return { name, style };
    };
    const arrow = styleOf(11);
    assert(/draw:auto-grow-height="false"/.test(arrow.style), `style mũi tên có chữ (${arrow.name}) phải có auto-grow-height=false: ${arrow.style}`);
    assert(/draw:fill-color="#3b82f6"/.test(arrow.style), "style mũi tên vẫn giữ màu tô");
    assert(/draw:textarea-vertical-align="middle"/.test(arrow.style), `chữ hình phải căn giữa như canvas (PPTX anchor=ctr), nhận ${arrow.style}`);
    const box = styleOf(13);
    assert(!/auto-grow-height="false"/.test(box.style), `hộp chữ phải giữ tự giãn: ${box.style}`);
    assert(styleOf(12).name === "gr3b82f6", "hình không chữ giữ tên style cũ gr3b82f6");
    // draw:rect không bị LibreOffice co theo chữ (đo soffice) → giữ style cũ.
    assert(styleOf(14).name === "gr3b82f6", `chữ nhật thường có chữ (draw:rect) giữ style gr3b82f6, nhận ${styleOf(14).name}`);
    const names = [...fodp.matchAll(/<style:style style:name="([^"]+)" style:family="graphic">/g)].map((m) => m[1]);
    assert(names.length === new Set(names).size, `không được trùng tên style: ${names.join(",")}`);
  });

  return results;
}
