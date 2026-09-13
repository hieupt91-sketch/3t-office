/**
 * Unit tests — Slides PPTX/FODP Import Fidelity
 * Requirement 5: Fixture FODP 1 slide có 2 ảnh + 1 text box với tọa độ cụ thể:
 * - parseFodp extracts correct px coordinates (x, y, w, h) @96DPI
 * - slide background resolved from draw:page / master-page (not text highlight)
 * - imported=true and layoutType=blank set
 * - Canvas render: left/top/width/height set properly, object-fit: cover for images,
 *   no fake drop-shadow, no theme accent/logo/footer when imported=true.
 */
import { SlidesAdapter, resolveDisplayFont } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) { names.forEach(n => this.classes.add(n)); }
  remove(...names) { names.forEach(n => this.classes.delete(n)); }
  contains(name) { return this.classes.has(name); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.children = [];
    this._innerHTML = "";
    this.innerText = "";
    this.textContent = "";
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  querySelector() { return new FakeElement("div"); }
  querySelectorAll() { return []; }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
  addEventListener() {}
  removeEventListener() {}
  focus() {}
  blur() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; }
  set innerHTML(val) { this._innerHTML = String(val); }
  get innerHTML() { return this._innerHTML; }
}

const FIXTURE_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="25.4cm" fo:page-height="14.288cm" style:print-orientation="landscape"/>
    </style:page-layout>
  </office:styles>
  <office:automatic-styles>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties draw:fill="solid" draw:fill-color="#ffffff"/>
    </style:style>
    <style:style style:name="prTitle" style:family="presentation">
      <style:graphic-properties draw:fill="none" draw:textarea-vertical-align="bottom" style:shrink-to-fit="false"/>
    </style:style>
    <style:style style:name="T1" style:family="text">
      <style:text-properties fo:font-family="Oswald" fo:font-size="48pt" fo:color="#666666" fo:background-color="#f8e71c"/>
    </style:style>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="BLANK" style:page-layout-name="PM1" draw:style-name="dp1"/>
  </office:master-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 1" draw:style-name="dp1" draw:master-page-name="BLANK">
        <draw:frame draw:name="Img1" svg:x="0.212cm" svg:y="0.196cm" svg:width="5.061cm" svg:height="13.894cm">
          <draw:image draw:mime-type="image/png">
            <office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data>
          </draw:image>
        </draw:frame>
        <draw:frame draw:name="Img2" svg:x="5.387cm" svg:y="0.196cm" svg:width="5.061cm" svg:height="13.894cm">
          <draw:image draw:mime-type="image/png">
            <office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data>
          </draw:image>
        </draw:frame>
        <draw:frame draw:name="TextTitle" presentation:style-name="prTitle" presentation:class="title" svg:x="16.212cm" svg:y="4.669cm" svg:width="8.899cm" svg:height="7.021cm">
          <draw:text-box>
            <text:p><text:span text:style-name="T1">WEST COAST</text:span><text:line-break/><text:span text:style-name="T1">ROAD TRIP</text:span></text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

export async function runSlidesImportFidelityTests() {
  const results = [];
  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err?.message || String(err) });
    }
  }

  await test("parseFodp: fixture 1 slide có 2 ảnh + 1 textbox đọc đúng tọa độ x/y/w/h px và nền slide trắng", async () => {
    const adapter = new SlidesAdapter(null);
    const slides = adapter.parseFodp(FIXTURE_FODP);

    assert(slides.length === 1, `Số slide phải là 1, nhận: ${slides.length}`);
    const slide = slides[0];

    assert(slide.background?.type === "solid", `Background type phải là solid: ${JSON.stringify(slide.background)}`);
    assert(slide.background?.color === "#ffffff", `Background color phải là #ffffff trắng, không được vàng: ${slide.background?.color}`);
    assert(slide.layoutType === "blank", `Layout type phải là blank: ${slide.layoutType}`);
    assert(slide.imported === true, "slide.imported phải là true");
    assert(slide.title.replace(/\s+/g, " ") === "WEST COAST ROAD TRIP", `Tiêu đề phải là 'WEST COAST ROAD TRIP', nhận: '${slide.title}'`);

    const shapes = slide.shapes || [];
    assert(shapes.length === 3, `Phải có 3 shape (2 ảnh + 1 textbox), nhận: ${shapes.length}`);

    const img1 = shapes[0];
    assert(img1.type === "image", `Shape 0 phải là image: ${img1.type}`);
    assert(Math.abs(img1.x - 8) <= 1, `Img1 x phải ~8px: ${img1.x}`);
    assert(Math.abs(img1.y - 7) <= 1, `Img1 y phải ~7px: ${img1.y}`);
    assert(Math.abs(img1.w - 191) <= 2, `Img1 w phải ~191px: ${img1.w}`);
    assert(Math.abs(img1.h - 525) <= 2, `Img1 h phải ~525px: ${img1.h}`);

    const img2 = shapes[1];
    assert(img2.type === "image", `Shape 1 phải là image: ${img2.type}`);
    assert(Math.abs(img2.x - 204) <= 1, `Img2 x phải ~204px: ${img2.x}`);
    assert(Math.abs(img2.y - 7) <= 1, `Img2 y phải ~7px: ${img2.y}`);
    assert(Math.abs(img2.w - 191) <= 2, `Img2 w phải ~191px: ${img2.w}`);
    assert(Math.abs(img2.h - 525) <= 2, `Img2 h phải ~525px: ${img2.h}`);

    const tb = shapes[2];
    assert(tb.type === "textbox", `Shape 2 phải là textbox: ${tb.type}`);
    assert(Math.abs(tb.x - 613) <= 2, `Textbox x phải ~613px: ${tb.x}`);
    assert(Math.abs(tb.y - 176) <= 2, `Textbox y phải ~176px: ${tb.y}`);
    assert(Math.abs(tb.w - 336) <= 2, `Textbox w phải ~336px: ${tb.w}`);
    assert(Math.abs(tb.h - 265) <= 2, `Textbox h phải ~265px: ${tb.h}`);
    assert(tb.text.includes("WEST COAST") && tb.text.includes("ROAD TRIP"), `Textbox text phải có nội dung: '${tb.text}'`);
    assert(tb.textHtml.includes("Oswald"), `Textbox textHtml phải giữ font gốc (Oswald): '${tb.textHtml}'`);
    assert(tb.textHtml.includes("#f8e71c"), `Textbox textHtml phải giữ highlight vàng #f8e71c: '${tb.textHtml}'`);
    assert(tb.textHtml.includes("#666666"), `Textbox textHtml phải giữ màu chữ xám #666666: '${tb.textHtml}'`);
    assert(tb.textVAlign === "bottom", `Textbox textVAlign phải là bottom: '${tb.textVAlign}'`);
    assert(tb.shrinkToFit === false, "Textbox shrinkToFit phải là false");
    assert(tb.autofit === false, "Textbox autofit phải là false");
  });

  await test("Canvas render: slide imported=true ẩn các phần tử theme và đặt tọa độ shape chính xác", async () => {
    const origDoc = global.document;
    const origWin = global.window;
    try {
      global.document = {
        createElement: tag => new FakeElement(tag),
        getElementById: () => null,
        addEventListener() {},
        removeEventListener() {},
        body: new FakeElement("body")
      };
      global.window = {
        addEventListener() {},
        removeEventListener() {}
      };

      const container = new FakeElement("div");
      const canvas = new SlidesCanvasController(container);
      canvas.mount();
      canvas.imported = true;

      const adapter = new SlidesAdapter(canvas);
      const slides = adapter.parseFodp(FIXTURE_FODP);
      canvas.slides = slides;
      canvas.selectSlide(0);

      // Kiểm tra các phần tử theme bị ẩn khi imported=true
      assert(canvas.masterAccentEl?.style.display === "none", "masterAccentEl phải bị ẩn (display: none)");
      assert(canvas.masterLogoEl?.style.display === "none", "masterLogoEl phải bị ẩn (display: none)");
      assert(canvas.masterFooterEl?.style.display === "none", "masterFooterEl phải bị ẩn khi không có headerFooter");
      assert(canvas.titleEl?.style.display === "none", "titleEl phải bị ẩn khi layout=blank");
      assert(canvas.bodyRowEl?.style.display === "none", "bodyRowEl phải bị ẩn khi layout=blank");

      // Kiểm tra surface canvas nền trắng
      assert(canvas.canvasEl?.style.backgroundColor === "#ffffff", `Nền canvas phải là #ffffff: ${canvas.canvasEl?.style.backgroundColor}`);
    } finally {
      global.document = origDoc;
      global.window = origWin;
    }
  });

  await test("resolveDisplayFont: font cài giữ nguyên, không cài thành Arial, generic serif rõ ràng thành Times", async () => {
    // Font cài -> giữ nguyên
    assert(resolveDisplayFont("Arial") === "Arial", "Arial đã cài phải giữ nguyên Arial");
    assert(resolveDisplayFont("Times New Roman") === "Times New Roman", "Times New Roman đã cài phải giữ nguyên");
    assert(resolveDisplayFont("Segoe UI") === "Segoe UI", "Segoe UI đã cài phải giữ nguyên");

    // Font không cài -> Arial (không đoán mò serif/condensed)
    assert(resolveDisplayFont("Oswald") === "Arial", "Oswald không cài phải fallback về Arial");
    assert(resolveDisplayFont("Playfair Display") === "Arial", "Playfair Display không cài phải fallback về Arial");
    assert(resolveDisplayFont("Montserrat") === "Arial", "Montserrat không cài phải fallback về Arial");
    assert(resolveDisplayFont("UnknownSansFont") === "Arial", "Font không rõ phải fallback về Arial");

    // Generic serif rõ ràng -> Times (Times New Roman)
    assert(resolveDisplayFont("UnknownSerifFont", "serif").includes("Times"), "Generic serif rõ ràng phải fallback về Times New Roman");
    assert(resolveDisplayFont("UnknownRomanFont", "roman").includes("Times"), "Generic roman rõ ràng phải fallback về Times New Roman");
  });

  await test("Neo đáy + tràn: textbox neo bottom đặt justifyContent flex-end và flexShrink 0 tràn không bị cắt", async () => {
    const origDoc = global.document;
    const origWin = global.window;
    try {
      global.document = {
        createElement: tag => new FakeElement(tag),
        getElementById: () => null,
        addEventListener() {},
        removeEventListener() {},
        body: new FakeElement("body")
      };
      global.window = {
        addEventListener() {},
        removeEventListener() {}
      };

      const container = new FakeElement("div");
      const canvas = new SlidesCanvasController(container);
      canvas.mount();
      canvas.imported = true;

      const adapter = new SlidesAdapter(canvas);
      const slides = adapter.parseFodp(FIXTURE_FODP);
      canvas.slides = slides;
      canvas.selectSlide(0);

      const shapeEl = canvas.shapesLayer.children.find(c => c.dataset?.shapeId === "TextTitle" || c.classList?.contains("is-textbox"));
      assert(shapeEl, "Phải tìm thấy shapeEl textbox");
      assert(shapeEl.style.justifyContent === "flex-end", `Shape neo bottom phải có justifyContent flex-end: ${shapeEl.style.justifyContent}`);
      assert(shapeEl.style.overflow === "visible", `Shape phải có overflow visible: ${shapeEl.style.overflow}`);

      const textChild = shapeEl.children.find(c => c.className?.includes("is-textbox-text"));
      assert(textChild, "Phải tìm thấy textChild");
      assert(textChild.style.flexShrink === "0", `textChild phải có flexShrink 0 để không bị co chữ: ${textChild.style.flexShrink}`);
      assert(textChild.style.overflow === "visible", `textChild phải có overflow visible để tràn tự nhiên: ${textChild.style.overflow}`);
    } finally {
      global.document = origDoc;
      global.window = origWin;
    }
  });

  await test("parseFodp: custom-shape đọc đúng fill, stroke hairline 1px, và fo:font-weight normal từ FODP", async () => {
    const FODP_CUSTOM_SHAPE = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:style style:name="gr4" style:family="graphic">
      <style:graphic-properties draw:stroke="solid" svg:stroke-width="0cm" svg:stroke-color="#2f5496" draw:fill="solid" draw:fill-color="#4472c4"/>
      <style:text-properties fo:font-weight="normal" fo:font-size="18pt"/>
    </style:style>
    <style:style style:name="T4" style:family="text">
      <style:text-properties fo:font-weight="normal" fo:font-size="18pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 2">
        <draw:custom-shape draw:style-name="gr4" svg:x="5cm" svg:y="5cm" svg:width="10cm" svg:height="6cm">
          <text:p><text:span text:style-name="T4">Khối kiến trúc</text:span></text:p>
        </draw:custom-shape>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

    const adapter = new SlidesAdapter(null);
    const slides = adapter.parseFodp(FODP_CUSTOM_SHAPE);
    assert(slides.length === 1, `Phải có 1 slide, nhận ${slides.length}`);
    const shapes = slides[0].shapes || [];
    assert(shapes.length === 1, `Phải có 1 shape, nhận ${shapes.length}`);
    const shape = shapes[0];

    assert(shape.type === "rect", `Type shape phải là rect: ${shape.type}`);
    assert(shape.fill === "#4472c4", `Fill color phải là #4472c4: ${shape.fill}`);
    assert(shape.stroke === "#2f5496", `Stroke color phải là #2f5496: ${shape.stroke}`);
    assert(shape.strokeWidth === 1, `Stroke width cho 0cm hairline phải là 1px: ${shape.strokeWidth}`);
    assert(shape.fontWeight === "normal", `Font weight phải là normal: ${shape.fontWeight}`);
    assert(shape.text === "Khối kiến trúc", `Text phải là 'Khối kiến trúc': ${shape.text}`);
    assert(/font-weight:\s*normal/i.test(shape.textHtml), `textHtml phải có font-weight: normal: ${shape.textHtml}`);

    // Kiểm tra Canvas render cho shape
    const origDoc = global.document;
    const origWin = global.window;
    try {
      global.document = {
        createElement: tag => new FakeElement(tag),
        getElementById: () => null,
        addEventListener() {},
        removeEventListener() {},
        body: new FakeElement("body")
      };
      global.window = {
        addEventListener() {},
        removeEventListener() {}
      };

      const container = new FakeElement("div");
      const canvas = new SlidesCanvasController(container);
      canvas.mount();
      canvas.slides = slides;
      canvas.selectSlide(0);

      const shapeEl = canvas.shapesLayer.children.find(c => String(c.dataset?.shapeId) === String(shape.id)) || canvas.shapesLayer.children[0];
      assert(shapeEl, "Phải tìm thấy shapeEl trong canvas");
      assert(shapeEl.style.backgroundColor === "#4472c4", `backgroundColor phải là #4472c4: ${shapeEl.style.backgroundColor}`);
      assert(shapeEl.style.border === "1px solid #2f5496", `border phải là 1px solid #2f5496: ${shapeEl.style.border}`);
      assert(shapeEl.style.opacity === "1", `opacity phải là 1 (không mờ 0.85): ${shapeEl.style.opacity}`);
      assert(shapeEl.style.borderRadius === "0" || shapeEl.style.borderRadius === "0px", `borderRadius phải là 0: ${shapeEl.style.borderRadius}`);

      const textChild = shapeEl.children.find(c => c.className?.includes("vno-shape-text"));
      assert(textChild, "Phải tìm thấy textChild có class vno-shape-text");
      assert(textChild.style.fontWeight === "normal", `textChild.style.fontWeight phải là normal: ${textChild.style.fontWeight}`);
    } finally {
      global.document = origDoc;
      global.window = origWin;
    }
  });

  return results;
}
