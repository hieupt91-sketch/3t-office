/**
 * Unit tests — SLIDES-2-3110 (docs/PLAN-SLIDES-2-3110.md).
 * a: mở lại PPTX do 3T lưu mất thanh nhấn chủ đề (canvas.imported luôn true khi mở tệp).
 * b: mở lại trang 1280×720 px ở thu phóng 100 % tràn vùng nhìn.
 * c: hình thu nhỏ / Sắp xếp trang / in / trình chiếu vẽ hình dựng sẵn thành chữ nhật (hoặc không vẽ).
 * d: chữ nhật/elip lưu PPTX chữ căn trên (anchor="t") trong khi trình soạn căn giữa.
 * FODP_3T mô phỏng đúng cấu trúc soffice trả về khi chuyển PPTX do 3T lưu sang FODP (đo bằng soffice pilot macOS
 * 31-10: master VNOTitleContent có draw:custom-shape ooxml-rect 33,866 × 0,249 cm tại 0,0 tô accent1 và loext:theme
 * mang bảng màu chủ đề VN). Nội dung tổng hợp, không dùng tệp người dùng.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SlidesCanvasController, SLIDE_MASTER_THEMES } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { presetOf } from "../../platform/shapes/shape-presets.js";
import { readZipEntry } from "../helpers/zip-package.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function newCanvas() {
  const canvas = new SlidesCanvasController({ innerHTML: "", className: "", appendChild() {} });
  canvas.slides = [{ id: 1, title: "Một", body: "", layoutType: "title-content", shapes: [], notes: "" }];
  canvas.currentSlideIndex = 0;
  return canvas;
}

const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"';

const EMERALD = SLIDE_MASTER_THEMES.find((theme) => theme.id === "emerald-green");

const themeXml = (name, colors) => `<loext:theme loext:name="${name}"><loext:theme-colors loext:name="${name}">${
  Object.entries(colors).map(([slot, color]) => `<loext:color loext:name="${slot}" loext:color="${color}"/>`).join("")
}</loext:theme-colors></loext:theme>`;

const EMERALD_THEME_XML = themeXml(EMERALD.name, {
  dark1: EMERALD.bodyColor, light1: EMERALD.bgColor, dark2: EMERALD.titleColor, light2: EMERALD.titleColor,
  accent1: EMERALD.accentColor, accent2: "#0369a3"
});

const ACCENT_STRIP = `<draw:custom-shape draw:style-name="gr3" draw:text-style-name="P5" draw:layer="backgroundobjects" svg:width="33.866cm" svg:height="0.249cm" svg:x="0cm" svg:y="0cm"><text:p/><draw:enhanced-geometry svg:viewBox="0 0 0 0" draw:type="ooxml-rect" draw:enhanced-path="M 0 0 L ?f3 0 ?f3 ?f2 0 ?f2 Z N"/></draw:custom-shape>`;

const placeholderFrame = (n, cls, x, y, w, h, inner) =>
  `<draw:frame draw:name="PlaceHolder ${n}" presentation:style-name="pr${n}" draw:layer="layout" svg:width="${w}cm" svg:height="${h}cm" svg:x="${x}cm" svg:y="${y}cm" presentation:class="${cls}" presentation:user-transformed="true"><draw:text-box>${inner}</draw:text-box></draw:frame>`;

function sofficeLikeFodp({ masterName = "VNOTitleContent", masterContent = "", accentFill = EMERALD.accentColor } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS}>
<office:automatic-styles>
<style:page-layout style:name="PM1"><style:page-layout-properties fo:page-width="33.866cm" fo:page-height="19.05cm" style:print-orientation="landscape"/></style:page-layout>
<style:style style:name="gr3" style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="solid" draw:fill-color="${accentFill}" draw:textarea-vertical-align="top"/></style:style>
</office:automatic-styles>
<office:master-styles>
<style:master-page style:name="${masterName}" style:page-layout-name="PM1" draw:style-name="dp1">${masterContent}</style:master-page>
</office:master-styles>
<office:body><office:presentation>
<draw:page draw:name="Trang 1" draw:style-name="dp3" draw:master-page-name="${masterName}" presentation:presentation-page-layout-name="AL1T1">
${placeholderFrame(1, "title", "2.419", "2.418", "29.028", "3.63", "<text:p>Báo cáo tổng hợp</text:p>")}
${placeholderFrame(2, "outline", "2.419", "6.652", "29.028", "13.304", "<text:p>Nhóm Dự án mẫu</text:p>")}
</draw:page>
</office:presentation></office:body></office:document>`;
}

const FODP_3T = sofficeLikeFodp({ masterContent: `${EMERALD_THEME_XML}${ACCENT_STRIP}` });
// Tệp PowerPoint mở rồi lưu bằng 3T: master vẫn mang tên VNO* nhưng KHÔNG có thanh nhấn 3T.
const FODP_PPT_SAVED_BY_3T = sofficeLikeFodp({ masterContent: themeXml("Office Theme", { dark1: "#000000", light1: "#ffffff", accent1: "#4472c4" }) });
// Tệp PowerPoint gốc: master «Title Slide», chủ đề Office.
const FODP_POWERPOINT = sofficeLikeFodp({ masterName: "Title Slide", masterContent: themeXml("Office Theme", { dark1: "#000000", light1: "#ffffff", accent1: "#4472c4" }) });

/** Fake DOM tối thiểu cho _renderThumbnails (ghi lại innerHTML của từng mục hình thu nhỏ). */
class FakeElement {
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.className = ""; this._html = ""; this.classList = { add() {}, remove() {}, contains: () => false, toggle() {} }; }
  set innerHTML(value) { this._html = String(value); this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

export async function runSlides23110Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // ---------------------------------------------------------------- a
  await test("a Mở lại PPTX do 3T lưu (master có thanh nhấn 3T): KHÔNG coi là tệp ngoài, thanh nhấn hiện, màu chủ đề khôi phục từ loext:theme", () => {
    const canvas = newCanvas();
    new SlidesAdapter(canvas).loadFromFodp(FODP_3T);
    assert(canvas.imported === false, `tệp 3T phải có canvas.imported=false (thanh nhấn hiện), nhận ${canvas.imported}`);
    assert(canvas.masterTheme.accentColor === EMERALD.accentColor, `màu nhấn phải là ${EMERALD.accentColor}, nhận ${canvas.masterTheme.accentColor}`);
    assert(canvas.masterTheme.titleColor === EMERALD.titleColor && canvas.masterTheme.bgColor === EMERALD.bgColor,
      `màu tiêu đề/nền chủ đề phải khôi phục: ${JSON.stringify(canvas.masterTheme)}`);
    assert(canvas.masterTheme.themeId === "emerald-green", `chủ đề VN phải nhận đúng ID theo tên trong tệp, nhận ${canvas.masterTheme.themeId}`);
    assert(!canvas.masterTheme.logoText, "không tự thêm chữ logo mặc định khi tệp không có logo");
    // Lưu lại: master vẫn ghi thanh nhấn (không mất sau lần lưu thứ hai).
    const fodp = new SlidesAdapter(canvas).serializeToFodp();
    assert(/grMasterAccent/.test(fodp) && fodp.includes(`draw:fill-color="${EMERALD.accentColor}"`), "lưu lại phải giữ thanh nhấn đúng màu trong master");
  });

  await test("a Thanh nhấn trong hình thu nhỏ ngăn trái hiện cho tệp 3T mở lại", () => {
    const realDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };
    try {
      const canvas = newCanvas();
      new SlidesAdapter(canvas).loadFromFodp(FODP_3T);
      canvas.slideListContainer = new FakeElement();
      canvas._renderThumbnails();
      const html = canvas.slideListContainer.children.map((item) => item.innerHTML).join("");
      assert(html.includes(`background:${EMERALD.accentColor}`), "hình thu nhỏ phải có dải nhấn màu chủ đề");
    } finally {
      globalThis.document = realDoc;
    }
  });

  await test("a Tệp PowerPoint (gốc, hoặc đã lưu bằng 3T nhưng master không có thanh nhấn 3T) vẫn là tệp ngoài: không thêm thanh nhấn/chủ đề VN", () => {
    for (const [label, xml] of [["PowerPoint gốc", FODP_POWERPOINT], ["PowerPoint lưu bằng 3T", FODP_PPT_SAVED_BY_3T]]) {
      const canvas = newCanvas();
      const accentBefore = canvas.masterTheme.accentColor;
      new SlidesAdapter(canvas).loadFromFodp(xml);
      assert(canvas.imported === true, `${label}: phải giữ imported=true, nhận ${canvas.imported}`);
      assert(canvas.masterTheme.accentColor === accentBefore, `${label}: không được lấy bảng màu Office làm chủ đề VN`);
      const fodp = new SlidesAdapter(canvas).serializeToFodp();
      assert(!/grMasterAccent/.test(fodp), `${label}: lưu lại không được thêm thanh nhấn 3T`);
    }
  });

  // ---------------------------------------------------------------- b
  await test("b Mở tệp trang 1280×720 px trong vùng nhìn nhỏ hơn: tự thu nhỏ cho vừa; tài liệu vừa sẵn giữ 100 %", () => {
    const canvas = newCanvas();
    canvas.stageEl = { clientWidth: 1300, clientHeight: 760 };
    canvas.canvasEl = { style: {}, dataset: {} };
    new SlidesAdapter(canvas).loadFromFodp(FODP_3T);
    assert(canvas.slideSize.width === 1280 && canvas.slideSize.height === 720, `khổ mở lại ${JSON.stringify(canvas.slideSize)}`);
    const visibleW = canvas.slideSize.width * canvas.zoomLevel;
    const visibleH = canvas.slideSize.height * canvas.zoomLevel;
    assert(canvas.zoomLevel < 1 && visibleW <= 1300 - 64 && visibleH <= 760 - 80,
      `trang phải nằm gọn vùng nhìn (thu phóng ${canvas.zoomLevel}, ${visibleW}×${visibleH})`);
    const roomy = newCanvas();
    roomy.stageEl = { clientWidth: 2400, clientHeight: 1400 };
    roomy.canvasEl = { style: {}, dataset: {} };
    new SlidesAdapter(roomy).loadFromFodp(FODP_3T);
    assert(roomy.zoomLevel === 1, `vùng nhìn đủ rộng: giữ 100 % (không phóng to), nhận ${roomy.zoomLevel}`);
    const noLayout = newCanvas();
    noLayout.stageEl = { clientWidth: 0, clientHeight: 0 };
    noLayout.canvasEl = { style: {}, dataset: {} };
    new SlidesAdapter(noLayout).loadFromFodp(FODP_3T);
    assert(noLayout.zoomLevel === 1, "chưa có layout thật (clientWidth 0): không đổi thu phóng");
  });

  // ---------------------------------------------------------------- c
  const arrowPath = presetOf("rightArrow").path;
  const starPath = presetOf("star5").path;
  const presetShapes = [
    { id: "a1", type: "arrow", geomType: "ooxml-rightArrow", x: 100, y: 100, w: 200, h: 120, color: "#3b82f6", text: "Mục tiêu" },
    { id: "s1", type: "rect", geomType: "ooxml-star5", x: 400, y: 100, w: 120, h: 120, color: "#ef4444", text: "" },
    { id: "r1", type: "rect", x: 600, y: 100, w: 120, h: 60, color: "#22c55e", text: "Thường" }
  ];

  await test("c Sắp xếp trang / in / trang ghi chú (_shapeSorterHtml) vẽ hình dựng sẵn bằng SVG như trình soạn; chữ nhật thường vẫn là khối nền", () => {
    const canvas = newCanvas();
    const arrow = canvas._shapeSorterHtml(presetShapes[0]);
    assert(arrow.includes(`d="${arrowPath}"`), `mũi tên (type arrow) phải vẽ path preset, nhận ${arrow.slice(0, 200)}`);
    assert(arrow.includes("Mục tiêu"), "chữ trong mũi tên vẫn hiện");
    const star = canvas._shapeSorterHtml(presetShapes[1]);
    assert(star.includes(`d="${starPath}"`) && /background:transparent/.test(star), `sao 5 cánh phải là SVG, nền trong suốt: ${star.slice(0, 200)}`);
    const rect = canvas._shapeSorterHtml(presetShapes[2]);
    assert(!rect.includes("<svg") && rect.includes("background:#22c55e"), `chữ nhật thường giữ khối nền: ${rect.slice(0, 200)}`);
  });

  await test("c Trình chiếu (_shapePresentationHtml) vẽ hình dựng sẵn bằng SVG, không tô nền chữ nhật", () => {
    const canvas = newCanvas();
    const arrow = canvas._shapePresentationHtml(presetShapes[0], { suppressAnimation: true });
    assert(arrow.includes(`d="${arrowPath}"`), `trình chiếu: mũi tên phải là path preset, nhận ${arrow.slice(0, 240)}`);
    assert(/background:transparent/.test(arrow) && !/background:#3b82f6/.test(arrow), `trình chiếu: không tô nền chữ nhật cho mũi tên: ${arrow.slice(0, 240)}`);
    assert(arrow.includes("vno-show-shape-text") && arrow.includes("Mục tiêu"), "trình chiếu: chữ vẫn hiện trên hình");
    const rect = canvas._shapePresentationHtml(presetShapes[2], { suppressAnimation: true });
    assert(!rect.includes("<svg") && rect.includes("background:#22c55e"), "trình chiếu: chữ nhật thường giữ nền");
  });

  await test("c Hình thu nhỏ ngăn trái vẽ các hình của trang (hình dựng sẵn bằng SVG) — cùng hàm với Sắp xếp trang", () => {
    const realDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };
    try {
      const canvas = newCanvas();
      canvas.slides[0].shapes = presetShapes.map((shape) => ({ ...shape }));
      canvas.slideListContainer = new FakeElement();
      canvas._renderThumbnails();
      const html = canvas.slideListContainer.children.map((item) => item.innerHTML).join("");
      assert(html.includes(`d="${arrowPath}"`) && html.includes(`d="${starPath}"`), "ngăn trái phải vẽ mũi tên và sao bằng path preset");
      assert(html.includes("background:#22c55e"), "ngăn trái phải vẽ chữ nhật thường");
    } finally {
      globalThis.document = realDoc;
    }
  });

  // ---------------------------------------------------------------- d
  const textShapes = () => [
    { id: 21, type: "rect", x: 10, y: 10, w: 200, h: 100, color: "#3b82f6", text: "Chữ nhật" },
    { id: 22, type: "ellipse", x: 300, y: 10, w: 200, h: 100, color: "#3b82f6", text: "Elip" },
    { id: 23, type: "textbox", x: 10, y: 300, w: 200, h: 60, color: "#3b82f6", text: "Hộp chữ có nền" },
    { id: 24, type: "textbox", x: 300, y: 300, w: 200, h: 60, color: "transparent", text: "Hộp chữ" },
    { id: 25, type: "rect", x: 600, y: 300, w: 200, h: 100, color: "transparent", text: "Không nền" }
  ];
  const styleOf = (fodp, shapeId) => {
    const el = fodp.match(new RegExp(`<draw:[a-z-]+ [^>]*vno:shape-id="${shapeId}"[^>]*>`))?.[0] || "";
    const name = el.match(/draw:style-name="([^"]+)"/)?.[1];
    const style = fodp.match(new RegExp(`<style:style style:name="${name}" style:family="graphic">[\\s\\S]*?</style:style>`))?.[0] || "";
    return { name, style };
  };

  await test("d Lưu: chữ nhật/elip có chữ căn GIỮA dọc như trình soạn (draw:textarea-vertical-align=middle), vẫn giữ tên style gr3b82f6; hộp chữ vẫn căn trên", () => {
    const canvas = newCanvas();
    canvas.slides[0].shapes = textShapes();
    const fodp = new SlidesAdapter(canvas).serializeToFodp();
    const rect = styleOf(fodp, 21);
    const ellipse = styleOf(fodp, 22);
    assert(rect.name === "gr3b82f6" && ellipse.name === "gr3b82f6", `chữ nhật/elip giữ tên gr3b82f6, nhận ${rect.name}/${ellipse.name}`);
    assert(/draw:textarea-vertical-align="middle"/.test(rect.style), `style chữ nhật phải căn giữa dọc: ${rect.style}`);
    const box = styleOf(fodp, 23);
    assert(box.name !== "gr3b82f6" && /draw:fill-color="#3b82f6"/.test(box.style) && !/textarea-vertical-align="middle"/.test(box.style),
      `hộp chữ có nền không được căn giữa (style riêng, giữ màu): ${box.name} ${box.style}`);
    const plainBox = styleOf(fodp, 24);
    assert(plainBox.name === "grNone" && !/textarea-vertical-align/.test(plainBox.style), `hộp chữ không nền giữ grNone: ${plainBox.name}`);
    const noFill = styleOf(fodp, 25);
    assert(/draw:fill="none"/.test(noFill.style) && /draw:textarea-vertical-align="middle"/.test(noFill.style), `hình không nền có chữ cũng căn giữa: ${noFill.name} ${noFill.style}`);
    const names = [...fodp.matchAll(/<style:style style:name="([^"]+)" style:family="graphic">/g)].map((m) => m[1]);
    assert(names.length === new Set(names).size, `không được trùng tên style: ${names.join(",")}`);
  });

  await test("d Lưu → mở lại FODP: hình căn giữa (mặc định) không thêm textVAlign; hộp chữ không bị căn giữa; căn trên/dưới tường minh giữ nguyên", () => {
    const canvas = newCanvas();
    canvas.slides[0].shapes = [...textShapes(), { id: 26, type: "rect", x: 10, y: 400, w: 100, h: 50, color: "#3b82f6", text: "t", textVAlign: "top" }];
    const adapter = new SlidesAdapter(canvas);
    const back = adapter.parseFodp(adapter.serializeToFodp())[0].shapes;
    const byId = (id) => back.find((shape) => String(shape.id) === String(id));
    for (const id of [21, 22, 25]) assert(!byId(id).textVAlign, `hình ${id} mặc định căn giữa không được có textVAlign thừa: ${byId(id).textVAlign}`);
    for (const id of [23, 24]) assert(byId(id).textVAlign !== "middle", `hộp chữ ${id} không được thành căn giữa`);
    assert(byId(26).textVAlign === "top", `căn trên tường minh phải giữ: ${byId(26).textVAlign}`);
  });

  const soffice = process.env.VNOFFICE_SOFFICE_PATH;
  await test("d soffice FODP → PPTX thật: chữ nhật/elip anchor=\"ctr\", hộp chữ anchor=\"t\" (BỎ QUA nếu không có VNOFFICE_SOFFICE_PATH)", () => {
    if (!soffice || !fs.existsSync(soffice)) return;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vno-slides2-3110-"));
    try {
      const canvas = newCanvas();
      canvas.slides[0].shapes = textShapes();
      fs.writeFileSync(path.join(dir, "d.fodp"), new SlidesAdapter(canvas).serializeToFodp());
      execFileSync(soffice, [`-env:UserInstallation=file://${path.join(dir, "profile")}`, "--headless", "--convert-to", "pptx", "--outdir", dir, path.join(dir, "d.fodp")], { stdio: "ignore", timeout: 120000 });
      const slideXml = readZipEntry(fs.readFileSync(path.join(dir, "d.pptx")), "ppt/slides/slide1.xml")?.toString("utf8") || "";
      const anchorOf = (text) => {
        const sp = [...slideXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map((m) => m[0]).find((block) => block.includes(`<a:t>${text}</a:t>`)) || "";
        return sp.match(/anchor="([a-z]+)"/)?.[1] || "(none)";
      };
      assert(anchorOf("Chữ nhật") === "ctr" && anchorOf("Elip") === "ctr" && anchorOf("Không nền") === "ctr",
        `chữ nhật/elip/không nền phải anchor=ctr: ${anchorOf("Chữ nhật")}/${anchorOf("Elip")}/${anchorOf("Không nền")}`);
      assert(anchorOf("Hộp chữ có nền") === "t" && anchorOf("Hộp chữ") === "t", `hộp chữ giữ anchor=t: ${anchorOf("Hộp chữ có nền")}/${anchorOf("Hộp chữ")}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  return results;
}
