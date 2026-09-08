/**
 * Writer floating-image (sd-abs-pos) import normalization.
 *
 * LibreOffice's StarWriter HTML export places images with "Behind Text" /
 * "In Front of Text" wrapping into `<span class="sd-abs-pos"
 * style="position:absolute; top:Xcm; left:Ycm">` where top/left are
 * relative to the original Word page.  VN Writer renders everything inside
 * a single `.vno-writer-page` container, so all absolute coordinates are
 * measured from the same origin — causing images from pages 2+ to overlap
 * unrelated content.
 *
 * `_convertFloatingImagesToInline()` strips absolute positioning so images
 * flow inline, eliminating overlap.  This test suite verifies that
 * transformation.
 */
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

const SOFFICE_FLOATING_HTML = `<!DOCTYPE html>
<html><head><style type="text/css">
@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
p { orphans: 0; widows: 0 }
</style></head>
<body>
<p>Nội dung trang 1, đoạn văn bản bình thường.</p>
<span class="sd-abs-pos" style="position: absolute; top: 7.41cm; left: 3.39cm; width: 528px">
  <img src="data:image/png;base64,iVBOR" name="Picture 1" width="528" height="492"/>
</span>
<p>Bảng dữ liệu ở trang 2:</p>
<table><tr><td>STT</td><td>Mã NV</td><td>Tên</td></tr>
<tr><td>1</td><td>NV001</td><td>Nguyễn Văn A</td></tr></table>
<span class="sd-abs-pos" style="position: absolute; top: 15.2cm; left: 1cm; width: 300px">
  <img src="data:image/png;base64,iVBOR" name="Picture 2" width="300" height="200"/>
</span>
<p>Nội dung trang 3.</p>
</body></html>`;

function makeMinimalAdapter() {
  const zone = (className) => ({
    className,
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => []
  });
  const header = zone("vno-writer-header");
  const body = zone("vno-writer-body");
  const footer = zone("vno-writer-footer");
  const editor = {
    innerHTML: "",
    style: {},
    querySelector(selector) {
      if (selector === ".vno-writer-header") return header;
      if (selector === ".vno-writer-body") return body;
      if (selector === ".vno-writer-footer") return footer;
      return null;
    }
  };
  return { editor, header, body, footer };
}

export async function runWriterFloatingImageImportTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("StarWriter HTML snapshot còn sd-abs-pos với position:absolute", () => {
    if (!/class=["']sd-abs-pos["']/.test(SOFFICE_FLOATING_HTML)) {
      throw new Error("Snapshot HTML mất sd-abs-pos — giả định đã đổi");
    }
    if (!/position\s*:\s*absolute/.test(SOFFICE_FLOATING_HTML)) {
      throw new Error("Snapshot HTML mất position:absolute — giả định đã đổi");
    }
    if (!/top\s*:\s*7\.41cm/.test(SOFFICE_FLOATING_HTML)) {
      throw new Error("Snapshot HTML mất top:7.41cm — giả định đã đổi");
    }
  });

  test("Sau _normalizeImportedHtml: không còn position:absolute trên sd-abs-pos", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SOFFICE_FLOATING_HTML);
    const body = imported.body;

    if (/position\s*:\s*absolute/.test(body)) {
      throw new Error(`Vẫn còn position:absolute trong body: ${body.slice(0, 300)}`);
    }
  });

  test("Sau _normalizeImportedHtml: sd-abs-pos converted thành inline-block", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SOFFICE_FLOATING_HTML);
    const body = imported.body;

    const inlineBlockMatches = body.match(/display\s*:\s*inline-block/g);
    if (!inlineBlockMatches || inlineBlockMatches.length < 2) {
      throw new Error(`Expected >=2 display:inline-block, found ${inlineBlockMatches ? inlineBlockMatches.length : 0}: ${body.slice(0, 400)}`);
    }
  });

  test("Sau _normalizeImportedHtml: top/left absolute coords bị loại bỏ", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SOFFICE_FLOATING_HTML);
    const body = imported.body;

    if (/top\s*:\s*7\.41cm/.test(body)) {
      throw new Error("Còn top:7.41cm — toạ độ absolute chưa bị xóa");
    }
    if (/left\s*:\s*3\.39cm/.test(body)) {
      throw new Error("Còn left:3.39cm — toạ độ absolute chưa bị xóa");
    }
    if (/top\s*:\s*15\.2cm/.test(body)) {
      throw new Error("Còn top:15.2cm — toạ độ absolute chưa bị xóa");
    }
    if (/left\s*:\s*1cm/.test(body)) {
      throw new Error("Còn left:1cm — toạ độ absolute chưa bị xóa");
    }
  });

  test("Sau _normalizeImportedHtml: width được giữ nguyên", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SOFFICE_FLOATING_HTML);
    const body = imported.body;

    if (!/width\s*:\s*528px/.test(body) && !/width="528"/.test(body)) {
      throw new Error("Mất width:528px — width phải được giữ nguyên");
    }
    if (!/width\s*:\s*300px/.test(body) && !/width="300"/.test(body)) {
      throw new Error("Mất width:300px — width phải được giữ nguyên");
    }
  });

  test("Sau _normalizeImportedHtml: img tags vẫn còn đầy đủ", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SOFFICE_FLOATING_HTML);
    const body = imported.body;

    const imgCount = (body.match(/<img\b/g) || []).length;
    if (imgCount !== 2) {
      throw new Error(`Expected 2 <img> tags, found ${imgCount}`);
    }
    if (!/name="Picture 1"/.test(body)) {
      throw new Error("Mất Picture 1");
    }
    if (!/name="Picture 2"/.test(body)) {
      throw new Error("Mất Picture 2");
    }
  });

  test("Sau _normalizeImportedHtml: nội dung văn bản/bảng không bị ảnh hưởng", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SOFFICE_FLOATING_HTML);
    const body = imported.body;

    if (!/Nội dung trang 1/.test(body)) {
      throw new Error("Mất nội dung trang 1");
    }
    if (!/Bảng dữ liệu/.test(body)) {
      throw new Error("Mất text bảng dữ liệu");
    }
    if (!/Nguyễn Văn A/.test(body)) {
      throw new Error("Mất tên nhân viên trong bảng");
    }
    if (!/Nội dung trang 3/.test(body)) {
      throw new Error("Mất nội dung trang 3");
    }
    if (!/<table/.test(body)) {
      throw new Error("Mất bảng");
    }
  });

  test("HTML không có sd-abs-pos: giữ nguyên (không hồi quy)", () => {
    const plainHtml = `<!DOCTYPE html>
<html><head></head><body>
<p>Hello world</p>
<img src="data:image/png;base64,iVBOR" width="100" height="50"/>
<table><tr><td>A</td></tr></table>
</body></html>`;
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(plainHtml);

    if (!/Hello world/.test(imported.body)) {
      throw new Error("Mất nội dung plain HTML");
    }
    if (!/<img/.test(imported.body)) {
      throw new Error("Mất img trong plain HTML");
    }
    if (!/<table/.test(imported.body)) {
      throw new Error("Mất table trong plain HTML");
    }
  });

  test("sd-abs-pos với style attributes khác (border, background) không bị mất", () => {
    const html = `<body>
<span class="sd-abs-pos" style="position: absolute; top: 2cm; left: 1cm; width: 200px; border: 1px solid red; background: yellow">
  <img src="data:image/png;base64,iVBOR" width="200" height="100"/>
</span>
</body>`;
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(html);

    if (/position\s*:\s*absolute/.test(imported.body)) {
      throw new Error("Vẫn còn position:absolute");
    }
    if (!/border\s*:\s*1px\s+solid\s+red/.test(imported.body)) {
      throw new Error("Mất border style");
    }
    if (!/background\s*:\s*yellow/.test(imported.body)) {
      throw new Error("Mất background style");
    }
    if (!/display\s*:\s*inline-block/.test(imported.body)) {
      throw new Error("Không có display:inline-block");
    }
  });

  test("Nhiều sd-abs-pos liên tiếp: tất cả được convert", () => {
    const html = `<body>
<span class="sd-abs-pos" style="position: absolute; top: 1cm; left: 1cm; width: 100px">
  <img src="data:image/png;base64,abc" width="100" height="50"/>
</span>
<span class="sd-abs-pos" style="position: absolute; top: 5cm; left: 2cm; width: 150px">
  <img src="data:image/png;base64,def" width="150" height="75"/>
</span>
<span class="sd-abs-pos" style="position: absolute; top: 10cm; left: 3cm; width: 200px">
  <img src="data:image/png;base64,ghi" width="200" height="100"/>
</span>
</body>`;
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(html);

    if (/position\s*:\s*absolute/.test(imported.body)) {
      throw new Error("Vẫn còn position:absolute");
    }
    const inlineBlocks = (imported.body.match(/display\s*:\s*inline-block/g) || []).length;
    if (inlineBlocks !== 3) {
      throw new Error(`Expected 3 display:inline-block, found ${inlineBlocks}`);
    }
    const imgCount = (imported.body.match(/<img\b/g) || []).length;
    if (imgCount !== 3) {
      throw new Error(`Expected 3 imgs, found ${imgCount}`);
    }
  });

  return results;
}
