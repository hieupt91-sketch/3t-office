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

  // --- Floating text-box / frame tests (generalized fix) ---

  const TEXTBOX_FLOATING_HTML = `<!DOCTYPE html>
<html><head></head><body>
<p>Văn bản trước textbox.</p>
<span id="textbox20" dir="ltr" style="position: absolute; top: 3.55cm; left: 0.82cm; width: 5.85cm; border: none; padding: 0cm; background: #ffffff">
  <p class="western">CÂU CHUYỆN THƯƠNG HIỆU</p>
</span>
<span id="Frame159" dir="ltr" style="position: absolute; top: 7.15cm; width: 4.37cm; border: 1px solid #000">
  <p class="western">BỘ ĐIỀU KHIỂN RÈM CUỐN</p>
</span>
<p>Văn bản sau textbox.</p>
</body></html>`;

  test("Textbox có id='textboxN' và position:absolute → position:absolute bị xóa", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(TEXTBOX_FLOATING_HTML);
    const body = imported.body;

    if (/position\s*:\s*absolute/.test(body)) {
      throw new Error(`Vẫn còn position:absolute: ${body.slice(0, 500)}`);
    }
  });

  test("Textbox có id='textboxN' chứa block content → display:block", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(TEXTBOX_FLOATING_HTML);
    const body = imported.body;

    const blocks = (body.match(/display\s*:\s*block(?:\s*;|\s*")/g) || []).length;
    if (blocks < 2) {
      throw new Error(`Expected >=2 display:block cho 2 textbox, found ${blocks}: ${body.slice(0, 500)}`);
    }
  });

  test("Textbox frame giữ nguyên width", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(TEXTBOX_FLOATING_HTML);
    const body = imported.body;

    if (!/width\s*:\s*5\.85cm/.test(body)) {
      throw new Error("Mất width 5.85cm của textbox");
    }
    if (!/width\s*:\s*4\.37cm/.test(body)) {
      throw new Error("Mất width 4.37cm của frame");
    }
  });

  test("Textbox frame giữ nguyên border/background", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(TEXTBOX_FLOATING_HTML);
    const body = imported.body;

    if (!/background\s*:\s*#ffffff/.test(body)) {
      throw new Error("Mất background #ffffff");
    }
    if (!/border\s*:\s*1px\s+solid\s+#000/.test(body)) {
      throw new Error("Mất border 1px solid #000");
    }
  });

  test("Nội dung text bên trong textbox vẫn còn", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(TEXTBOX_FLOATING_HTML);
    const body = imported.body;

    if (!/CÂU CHUYỆN THƯƠNG HIỆU/.test(body)) {
      throw new Error("Mất nội dung textbox 1");
    }
    if (!/BỘ ĐIỀU KHIỂN RÈM CUỐN/.test(body)) {
      throw new Error("Mất nội dung textbox 2");
    }
  });

  test("Văn bản xung quanh không bị ảnh hưởng", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(TEXTBOX_FLOATING_HTML);
    const body = imported.body;

    if (!/Văn bản trước textbox/.test(body)) {
      throw new Error("Mất văn bản trước");
    }
    if (!/Văn bản sau textbox/.test(body)) {
      throw new Error("Mất văn bản sau");
    }
  });

  // --- Nested spans inside floating span ---

  const NESTED_SPAN_HTML = `<body>
<span id="textbox5" style="position: absolute; top: 2cm; left: 1cm; width: 300px; background: #fff">
  <p><span style="font-weight: bold">Tiêu đề in đậm</span> và <span style="font-style: italic">nghiêng</span></p>
  <p>Đoạn văn thường.</p>
</span>
<p>Nội dung bên ngoài.</p>
</body>`;

  test("Span lồng nhau bên trong floating span: nội dung đầy đủ, không cắt nhầm", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(NESTED_SPAN_HTML);
    const body = imported.body;

    if (!/Tiêu đề in đậm/.test(body)) {
      throw new Error("Mất nội dung span lồng in đậm");
    }
    if (!/nghiêng/.test(body)) {
      throw new Error("Mất nội dung span lồng nghiêng");
    }
    if (!/Đoạn văn thường/.test(body)) {
      throw new Error("Mất đoạn văn bên trong");
    }
    if (!/Nội dung bên ngoài/.test(body)) {
      throw new Error("Mất nội dung bên ngoài");
    }
  });

  test("Span lồng nhau: position:absolute bị xóa", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(NESTED_SPAN_HTML);
    const body = imported.body;

    if (/position\s*:\s*absolute/.test(body)) {
      throw new Error(`Vẫn còn position:absolute: ${body.slice(0, 500)}`);
    }
  });

  test("Span lồng nhau: span format nội bộ không bị phá vỡ", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(NESTED_SPAN_HTML);
    const body = imported.body;

    const spanCount = (body.match(/<span\b/g) || []).length;
    if (spanCount < 3) {
      throw new Error(`Cần >=3 span (1 outer + 2 inner), tìm thấy ${spanCount}`);
    }
  });

  // --- Mixed types: sd-abs-pos + textbox + frame together ---

  const MIXED_FLOATING_HTML = `<body>
<p>Banner nền xanh.</p>
<span class="sd-abs-pos" style="position: absolute; top: 1cm; left: 0cm; width: 100%">
  <img src="data:image/png;base64,abc" width="800" height="200"/>
</span>
<span id="textbox1" dir="ltr" style="position: absolute; top: 4cm; left: 2cm; width: 5cm">
  <p>Thông số kỹ thuật A</p>
</span>
<span id="Frame42" dir="ltr" style="position: absolute; top: 8cm; width: 4cm">
  <p>Thông số kỹ thuật B</p>
</span>
<p>Danh sách thông số.</p>
</body>`;

  test("Cả sd-abs-pos, textbox, frame đều được xử lý trong một file", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(MIXED_FLOATING_HTML);
    const body = imported.body;

    if (/position\s*:\s*absolute/.test(body)) {
      throw new Error(`Vẫn còn position:absolute: ${body.slice(0, 500)}`);
    }
    const inlineBlocks = (body.match(/display\s*:\s*inline-block/g) || []).length;
    if (inlineBlocks < 1) {
      throw new Error(`Expected >=1 display:inline-block for sd-abs-pos img, found ${inlineBlocks}`);
    }
    const blocks = (body.match(/display\s*:\s*block(?:\s*;|\s*")/g) || []).length;
    if (blocks < 2) {
      throw new Error(`Expected >=2 display:block for textbox+frame, found ${blocks}: ${body.slice(0, 500)}`);
    }
    if (!/banner nền xanh/i.test(body)) {
      throw new Error("Mất banner text");
    }
    if (!/Thông số kỹ thuật A/.test(body)) {
      throw new Error("Mất thông số A");
    }
    if (!/Thông số kỹ thuật B/.test(body)) {
      throw new Error("Mất thông số B");
    }
    if (!/Danh sách thông số/.test(body)) {
      throw new Error("Mất danh sách");
    }
    if (!/<img\b/.test(body)) {
      throw new Error("Mất img");
    }
  });

  // --- Top-position sorting for block-content clusters ---

  const SORTING_HTML = `<!DOCTYPE html>
<html><head></head><body>
<p>Văn bản đầu trang.</p>
<span id="textbox22" dir="ltr" style="position: absolute; top: 13.85cm; left: 0.82cm; width: 5cm; border: none; background: #fff">
  <p class="western">HỆ SINH THÁI NHÀ THÔNG MINH TOÀN DIỆN</p>
</span>
<span id="textbox21" dir="ltr" style="position: absolute; top: 12.08cm; left: 0.82cm; width: 5cm; border: none; background: #fff">
  <p class="western">DỄ DÀNG CÀI ĐẶT</p>
</span>
<span id="textbox20" dir="ltr" style="position: absolute; top: 3.55cm; left: 0.82cm; width: 5cm; border: none; background: #fff">
  <p class="western">CÂU CHUYỆN THƯƠNG HIỆU</p>
</span>
<span id="textbox19" dir="ltr" style="position: absolute; top: 10.32cm; left: 0.82cm; width: 5cm; border: none; background: #fff">
  <p class="western">THIẾT KẾ ĐẸP VÀ CHU ĐÁO</p>
</span>
<p>Văn bản cuối trang.</p>
</body></html>`;

  test("Cụm block-content spans sắp xếp theo top tăng dần (đọc từ trên xuống)", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SORTING_HTML);
    const body = imported.body;

    const idxCauChuyen = body.indexOf("CÂU CHUYỆN THƯƠNG HIỆU");
    const idxThietKe = body.indexOf("THIẾT KẾ ĐẸP VÀ CHU ĐÁO");
    const idxDeDang = body.indexOf("DỄ DÀNG CÀI ĐẶT");
    const idxHeSinhThai = body.indexOf("HỆ SINH THÁI NHÀ THÔNG MINH TOÀN DIỆN");

    if (idxCauChuyen === -1) throw new Error("Mất CÂU CHUYỆN THƯƠNG HIỆU");
    if (idxThietKe === -1) throw new Error("Mất THIẾT KẾ ĐẸP VÀ CHU ĐÁO");
    if (idxDeDang === -1) throw new Error("Mất DỄ DÀNG CÀI ĐẶT");
    if (idxHeSinhThai === -1) throw new Error("Mất HỆ SINH THÁI NHÀ THÔNG MINH TOÀN DIỆN");

    if (!(idxCauChuyen < idxThietKe)) {
      throw new Error(`CÂU CHUYỆN (${idxCauChuyen}) phải đứng TRƯỚC THIẾT KẾ (${idxThietKe})`);
    }
    if (!(idxThietKe < idxDeDang)) {
      throw new Error(`THIẾT KẾ (${idxThietKe}) phải đứng TRƯỚC DỄ DÀNG (${idxDeDang})`);
    }
    if (!(idxDeDang < idxHeSinhThai)) {
      throw new Error(`DỄ DÀNG (${idxDeDang}) phải đứng TRƯỚC HỆ SINH THÁI (${idxHeSinhThai})`);
    }
  });

  test("Văn bản xung quanh không bị ảnh hưởng sau khi sắp xếp top", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SORTING_HTML);
    const body = imported.body;

    if (!/Văn bản đầu trang/.test(body)) {
      throw new Error("Mất văn bản đầu trang");
    }
    if (!/Văn bản cuối trang/.test(body)) {
      throw new Error("Mất văn bản cuối trang");
    }
  });

  test("Sắp xếp top: position:absolute bị xóa, display:block cho block content", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SORTING_HTML);
    const body = imported.body;

    if (/position\s*:\s*absolute/.test(body)) {
      throw new Error(`Vẫn còn position:absolute: ${body.slice(0, 500)}`);
    }
    const blocks = (body.match(/display\s*:\s*block(?:\s*;|\s*")/g) || []).length;
    if (blocks < 4) {
      throw new Error(`Expected >=4 display:block cho 4 textbox, found ${blocks}`);
    }
  });

  // --- Test spec-grid (cột ngang) không bị phá vỡ ---

  const SPECGRID_HTML = `<body>
<p>Văn bản thường.</p>
<span id="textbox1" dir="ltr" style="position: absolute; top: 5cm; left: 1cm; width: 4cm">
  <p>CÔNG TẮC (CẦN CÓ AQARA HUB)</p>
</span>
<span id="textbox2" dir="ltr" style="position: absolute; top: 5cm; left: 6cm; width: 4cm">
  <p>CHUÔNG CỬA VIDEO G4</p>
</span>
<span id="textbox3" dir="ltr" style="position: absolute; top: 5cm; left: 11cm; width: 4cm">
  <p>BÓNG ĐÈN LED T1</p>
</span>
</body>`;

  test("Spec-grid (cùng top, khác left): giữ nguyên thứ tự DOM khi left tăng dần", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(SPECGRID_HTML);
    const body = imported.body;

    const idxCongTac = body.indexOf("CÔNG TẮC");
    const idxChuong = body.indexOf("CHUÔNG CỬA");
    const idxBongDen = body.indexOf("BÓNG ĐÈN");

    if (idxCongTac === -1) throw new Error("Mất CÔNG TẮC");
    if (idxChuong === -1) throw new Error("Mất CHUÔNG CỬA");
    if (idxBongDen === -1) throw new Error("Mất BÓNG ĐÈN");

    if (!(idxCongTac < idxChuong)) {
      throw new Error(`CÔNG TẮC (${idxCongTac}) phải đứng TRƯỚC CHUÔNG (${idxChuong}) khi cùng top, left tăng dần`);
    }
    if (!(idxChuong < idxBongDen)) {
      throw new Error(`CHUÔNG (${idxChuong}) phải đứng TRƯỚC BÓNG ĐÈN (${idxBongDen}) khi cùng top, left tăng dần`);
    }
  });

  return results;
}
