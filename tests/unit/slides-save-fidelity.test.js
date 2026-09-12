/**
 * Unit tests — Slides Save Fidelity (PowerPoint 2016 parity)
 *
 * Covers:
 * - A: Span style quote parsing (preserves font-size:48pt and font-family:'Arial')
 * - B: Unitless line-height converted to percentage for ODF/LibreOffice parity & reverse parsing
 * - C: Image crop (fo:clip) parsing, preservation during serialization, and canvas crop styles
 * - D: Master page chrome ("VN OFFICE • THUYẾT TRÌNH" / accent bar) suppression on imported files
 */

import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
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

export async function runSlidesSaveFidelityTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  await test("A. Span style quote parsing: font-family có dấu nháy đơn không làm mất font-size và font-family khi serialize", async () => {
    const canvas = {
      slides: [
        {
          id: "slide-1",
          layoutType: "blank",
          imported: true,
          shapes: [
            {
              id: "title-shape",
              type: "rect",
              x: 100,
              y: 100,
              w: 500,
              h: 200,
              textHtml: '<p><span style="color:#666666;background-color:#f8e71c;font-family:\'Arial\',sans-serif;font-size:48pt">WEST COAST</span></p>'
            }
          ]
        }
      ],
      currentSlideIndex: 0,
      imported: true,
      masterTheme: { logoText: "", accentColor: "#0078d4" },
      slideDimensions: { width: 960, height: 540, widthCm: 25.4, heightCm: 14.288 }
    };

    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();

    assert(xml.includes('fo:font-size="48pt"'), 'XML phải chứa fo:font-size="48pt" thay vì bị cắt cụt do dấu nháy đơn');
    assert(xml.includes('fo:font-family="Arial"'), 'XML phải chứa fo:font-family="Arial"');
    assert(xml.includes('fo:background-color="#f8e71c"'), 'XML phải chứa fo:background-color');
    assert(xml.includes('fo:color="#666666"'), 'XML phải chứa fo:color');
  });

  await test("B1. Line-height formatting: hệ số không đơn vị đổi thành %, px đổi thành pt, normal bị loại bỏ", async () => {
    const canvas = {
      slides: [
        {
          id: "slide-1",
          layoutType: "blank",
          imported: true,
          shapes: [
            {
              id: "lh-test-1",
              type: "rect",
              x: 50,
              y: 50,
              w: 300,
              h: 100,
              textHtml: '<p style="line-height:1.15">Dòng 1</p>'
            },
            {
              id: "lh-test-2",
              type: "rect",
              x: 50,
              y: 200,
              w: 300,
              h: 100,
              textHtml: '<p style="line-height:1.4375">Dòng 2</p>'
            },
            {
              id: "lh-test-3",
              type: "rect",
              x: 50,
              y: 350,
              w: 300,
              h: 100,
              textHtml: '<p style="line-height:16px">Dòng 3</p>'
            }
          ]
        }
      ],
      currentSlideIndex: 0,
      imported: true,
      masterTheme: { logoText: "" },
      slideDimensions: { width: 960, height: 540, widthCm: 25.4, heightCm: 14.288 }
    };

    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();

    // CSS line-height là bội số × cỡ chữ; ODF/PowerPoint % là bội số × chiều cao dòng tự nhiên (≈1.15 cỡ chữ).
    assert(xml.includes('fo:line-height="100%"'), 'line-height:1.15 (= 1 × tự nhiên) phải thành fo:line-height="100%"');
    assert(xml.includes('fo:line-height="125%"'), 'line-height:1.4375 (= 1.25 × 1.15) phải thành fo:line-height="125%"');
    assert(xml.includes('fo:line-height="12pt"'), 'line-height:16px (16*0.75=12pt) phải được định dạng thành fo:line-height="12pt"');
    assert(!xml.includes('fo:line-height="1"'), 'Không được còn fo:line-height="1" không đơn vị trong ODF');
  });

  await test("B2. Line-height reverse parse: fo:line-height percentage chuyển đổi ngược thành hệ số cho canvas", async () => {
    const FODP_LH = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:style style:name="P_lh" style:family="paragraph">
      <style:paragraph-properties fo:line-height="120%"/>
    </style:style>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="BLANK"/>
  </office:master-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 1" draw:master-page-name="BLANK">
        <draw:frame draw:name="Tb1" svg:x="1cm" svg:y="1cm" svg:width="5cm" svg:height="3cm">
          <draw:text-box>
            <text:p text:style-name="P_lh">Thử nghiệm line-height</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

    const adapter = new SlidesAdapter({});
    const slides = adapter.parseFodp(FODP_LH);
    assert(slides.length === 1, "Phải parse được 1 slide");
    const shape = (slides[0].shapes || [])[0];
    assert(shape && shape.textHtml, "Phải có shape chứa textHtml");
    // 120% × chiều cao dòng tự nhiên (1.15) = CSS 1.38
    assert(shape.textHtml.includes("line-height:1.38") || shape.textHtml.includes("line-height: 1.38"), `textHtml phải chứa line-height:1.38: ${shape.textHtml}`);
  });

  await test("C1. Image crop (fo:clip): parseFodp đọc đúng fo:clip và serializeToFodp giữ nguyên fo:clip", async () => {
    const FODP_CROP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:style style:name="grCrop1" style:family="graphic">
      <style:graphic-properties fo:clip="rect(1.486cm, 3.79cm, 0cm, 17.65cm)"/>
    </style:style>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="BLANK"/>
  </office:master-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 1" draw:master-page-name="BLANK">
        <draw:frame draw:name="ImgCropped" draw:style-name="grCrop1" svg:x="0.212cm" svg:y="0.196cm" svg:width="5.061cm" svg:height="13.894cm">
          <draw:image draw:mime-type="image/png">
            <office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data>
          </draw:image>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

    const adapter = new SlidesAdapter({});
    const slides = adapter.parseFodp(FODP_CROP);
    assert(slides.length === 1, "Phải parse được 1 slide");
    const imgElem = (slides[0].shapes || [])[0];
    assert(imgElem && imgElem.type === "image", "Phải tìm thấy shape ảnh");
    assert(imgElem.crop, "Ảnh phải có thuộc tính crop");
    assert(imgElem.crop.top === "1.486cm", `crop.top phải là 1.486cm, nhận được: ${imgElem.crop.top}`);
    assert(imgElem.crop.right === "3.79cm", `crop.right phải là 3.79cm, nhận được: ${imgElem.crop.right}`);
    assert(imgElem.crop.bottom === "0cm", `crop.bottom phải là 0cm, nhận được: ${imgElem.crop.bottom}`);
    assert(imgElem.crop.left === "17.65cm", `crop.left phải là 17.65cm, nhận được: ${imgElem.crop.left}`);

    // Roundtrip serialize
    const canvas = {
      slides,
      currentSlideIndex: 0,
      imported: true,
      masterTheme: { logoText: "" },
      slideDimensions: { width: 960, height: 540, widthCm: 25.4, heightCm: 14.288 }
    };
    const outXml = new SlidesAdapter(canvas).serializeToFodp();
    assert(outXml.includes('fo:clip="rect(1.486cm, 3.79cm, 0cm, 17.65cm)"'), `XML xuất ra phải chứa fo:clip chính xác`);
  });

  await test("C2. Image crop rendering: tính toán style crop cho canvas hiển thị chính xác", async () => {
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

      const shape = {
        type: "image",
        crop: { top: "1.486cm", right: "3.79cm", bottom: "0cm", left: "17.65cm" },
        w: 200,
        h: 400
      };
      const styles = canvas._computeImageCropStyles(shape);
      assert(styles !== null, "Phải tính toán được crop styles");
      assert(styles.cssText.includes("position:absolute"), "Vị trí img trong wrapper phải là absolute");
      assert(styles.wPct > 100, `wPct phải > 100% để hiển thị vùng cắt: ${styles.wPct}`);
      assert(styles.hPct > 100, `hPct phải > 100% để hiển thị vùng cắt: ${styles.hPct}`);
      assert(styles.leftPct > 0, `leftPct phải > 0: ${styles.leftPct}`);
    } finally {
      global.document = origDoc;
      global.window = origWin;
    }
  });

  await test("D. Master Page Chrome: tài liệu imported không phát sinh chữ VN OFFICE • THUYẾT TRÌNH hoặc thanh điểm nhấn", async () => {
    // 1. Imported = true -> KHÔNG có chrome VN Office
    const canvasImported = {
      slides: [
        {
          id: "slide-1",
          layoutType: "blank",
          imported: true,
          shapes: []
        }
      ],
      currentSlideIndex: 0,
      imported: true,
      masterTheme: { logoText: "VN OFFICE • THUYẾT TRÌNH", accentColor: "#0078d4" },
      slideDimensions: { width: 960, height: 540, widthCm: 25.4, heightCm: 14.288 }
    };
    const adapterImported = new SlidesAdapter(canvasImported);
    const xmlImported = adapterImported.serializeToFodp();
    assert(!xmlImported.includes("grMasterAccent"), "Tài liệu imported không được chứa grMasterAccent");
    assert(!xmlImported.includes("grMasterLogo"), "Tài liệu imported không được chứa grMasterLogo");
    assert(!xmlImported.includes("THUYẾT TRÌNH"), "Tài liệu imported không được chứa chữ THUYẾT TRÌNH");

    // 2. Imported = false (tạo mới từ template VN Office) -> PHẢI giữ nguyên chrome
    const canvasNew = {
      slides: [
        {
          id: "slide-1",
          layoutType: "title",
          imported: false,
          shapes: []
        }
      ],
      currentSlideIndex: 0,
      imported: false,
      masterTheme: { logoText: "VN OFFICE • THUYẾT TRÌNH", accentColor: "#0078d4" },
      slideDimensions: { width: 960, height: 540, widthCm: 25.4, heightCm: 14.288 }
    };
    const adapterNew = new SlidesAdapter(canvasNew);
    const xmlNew = adapterNew.serializeToFodp();
    assert(xmlNew.includes("grMasterAccent"), "Tài liệu tạo mới từ mẫu phải giữ grMasterAccent");
    assert(xmlNew.includes("grMasterLogo"), "Tài liệu tạo mới từ mẫu phải giữ grMasterLogo");
    assert(xmlNew.includes("THUYẾT TRÌNH"), "Tài liệu tạo mới từ mẫu phải chứa chữ THUYẾT TRÌNH");
  });

  return results;
}
