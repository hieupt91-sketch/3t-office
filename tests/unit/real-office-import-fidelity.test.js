/**
 * Import fidelity for files that did NOT go through VN Office serializers.
 * Snippets match LibreOffice HTML/FODS/FODP after soffice --convert-to from
 * tests/fixtures/real-office-samples/*.docx|xlsx|pptx (see live Playwright).
 */
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

const SOFFICE_WRITER_HTML = `<!DOCTYPE html>
<html><head><style type="text/css">
@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
h1.western { font-weight: bold; font-size: 18pt }
</style></head>
<body>
<ol><li><h1 class="western">Báo cáo tổng hợp hoạt động quý III</h1></li></ol>
<p>Đơn vị <b>đảm bảo</b> chất lượng đã <i>hoàn thành</i> kiểm định nội bộ theo kế hoạch.</p>
<table><tr><td>STT</td><td>Hạng mục</td><td>Kết quả</td></tr>
<tr><td>1</td><td>Tài liệu hướng dẫn</td><td>Đạt</td></tr>
<tr><td>2</td><td>Quy trình kiểm thử</td><td>Đạt có điều kiện</td></tr></table>
<ul><li><p>Rà soát định dạng văn bản hành chính</p></li>
<li><p>Đối chiếu số liệu quý III với kế hoạch</p></li>
<li><p>Bàn giao biên bản cho phòng ban liên quan</p></li></ul>
</body></html>`;

const SOFFICE_SHEET_FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:automatic-styles>
    <number:currency-style style:name="N136">
      <number:number number:decimal-places="0" number:min-integer-digits="1" number:grouping="true"/>
      <number:text> </number:text>
      <number:currency-symbol number:language="vi" number:country="VN">₫</number:currency-symbol>
    </number:currency-style>
    <style:style style:name="ce2" style:family="table-cell" style:data-style-name="N136"/>
  </office:automatic-styles>
  <office:body><office:spreadsheet>
    <table:table table:name="Doanh thu">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Hạng mục</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Số liệu</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tháng 7</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tháng 8</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="150"><text:p>150</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tháng 9</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="180"><text:p>180</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tổng</text:p></table:table-cell>
        <table:table-cell table:formula="of:=SUM([.B2:.B4])" office:value-type="float" office:value="450"><text:p>450</text:p></table:table-cell>
      </table:table-row>
    </table:table>
    <table:table table:name="Chi phí">
      <table:table-column table:default-cell-style-name="ce2"/>
      <table:table-column table:default-cell-style-name="ce2"/>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Khoản mục</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Số tiền</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Văn phòng phẩm</text:p></table:table-cell>
        <table:table-cell office:value-type="currency" office:currency="VND" office:value="1250000"><text:p>1.250.000 ₫</text:p></table:table-cell>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document>`;

const SOFFICE_SLIDES_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:automatic-styles>
    <style:style style:name="gr4" style:family="graphic">
      <style:graphic-properties draw:fill="solid" draw:fill-color="#4472C4"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:presentation>
    <draw:page-thumbnail svg:width="8.999cm" svg:height="5.061cm" svg:x="1cm" svg:y="3.742cm"/>
    <draw:page draw:name="VN Office 2026">
      <draw:frame presentation:class="title" svg:x="1.4cm" svg:y="3.5cm" svg:width="25.2cm" svg:height="3.2cm">
        <draw:text-box><text:p>VN Office 2026</text:p></draw:text-box>
      </draw:frame>
      <draw:frame presentation:class="subtitle" svg:x="1.4cm" svg:y="7.2cm" svg:width="25.2cm" svg:height="3cm">
        <draw:text-box><text:p>Bộ ứng dụng văn phòng Việt</text:p></draw:text-box>
      </draw:frame>
      <presentation:notes>
        <draw:frame presentation:class="notes"><draw:text-box><text:p></text:p></draw:text-box></draw:frame>
      </presentation:notes>
    </draw:page>
    <draw:page draw:name="page2">
      <draw:custom-shape draw:style-name="gr4" svg:width="7.999cm" svg:height="3.999cm" svg:x="2cm" svg:y="4.5cm">
        <text:p>Khối kiến trúc</text:p>
        <draw:enhanced-geometry draw:type="ooxml-rect"/>
      </draw:custom-shape>
      <draw:frame presentation:class="outline" svg:x="11.5cm" svg:y="4.5cm" svg:width="14cm" svg:height="6cm">
        <draw:text-box><text:p>Kiến trúc nền tảng LibreOffice</text:p></draw:text-box>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;

function makeWriterDom() {
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

export async function runRealOfficeImportFidelityTests() {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  test("Writer: soffice HTML giữ Heading 1, không bọc numbered list", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_WRITER_HTML);
    if (!/<h1\b[^>]*>[\s\S]*Báo cáo tổng hợp hoạt động quý III[\s\S]*<\/h1>/i.test(imported.body)) {
      throw new Error(`Thiếu h1: ${imported.body.slice(0, 200)}`);
    }
    if (/<(ol|ul)\b[\s\S]*<h1\b/i.test(imported.body)) {
      throw new Error("Heading 1 vẫn bị bọc trong list — LibreOffice HTML outline wrap chưa được gỡ");
    }
    if (imported.page?.size !== "a4" || imported.page?.orientation !== "portrait") {
      throw new Error(`Khổ giấy import sai: ${JSON.stringify(imported.page)}`);
    }
    if (imported.page.margins.left !== 25 || imported.page.margins.top !== 20) {
      throw new Error(`Lề A4 import sai: ${JSON.stringify(imported.page.margins)}`);
    }
  });

  test("Writer: bold/italic, bảng 3x3 và bullet list còn trong HTML import", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_WRITER_HTML);
    if (!imported.body.includes("<b>đảm bảo</b>") || !imported.body.includes("<i>hoàn thành</i>")) {
      throw new Error("Mất vị trí in đậm/nghiêng");
    }
    if ((imported.body.match(/<tr\b/gi) || []).length !== 3) {
      throw new Error("Bảng không còn 3 hàng");
    }
    if (!imported.body.includes("Tài liệu hướng dẫn") || !imported.body.includes("Đạt có điều kiện")) {
      throw new Error("Dữ liệu bảng sai");
    }
    if ((imported.body.match(/<li\b/gi) || []).length !== 3 || !imported.body.includes("Rà soát định dạng văn bản hành chính")) {
      throw new Error("Bullet list sai");
    }
  });

  await asyncTest("Writer: common.file.open nạp HTML soffice vào body, không dump <html>", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({ status: "ok", content: SOFFICE_WRITER_HTML, fileName: "sample-writer.docx" });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (body.innerHTML.includes("<html") || body.innerHTML.includes("<!DOCTYPE")) {
        throw new Error("open() dump cả tài liệu HTML vào body");
      }
      if (!body.innerHTML.includes("<h1") || body.innerHTML.includes("<ol")) {
        throw new Error(`Body sau open() không phải Heading 1 sạch: ${body.innerHTML.slice(0, 180)}`);
      }
      if (adapter.sourceFileName !== "sample-writer") throw new Error(`sourceFileName=${adapter.sourceFileName}`);
      if (adapter.pageSetup.size !== "a4") throw new Error(`pageSetup.size=${adapter.pageSetup.size}`);
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  test("Sheet: FODS soffice giữ 2 sheet, SUM và currency", () => {
    const workbook = new SheetAdapter(null).parseFods(SOFFICE_SHEET_FODS);
    if (workbook.sheets.join("|") !== "Doanh thu|Chi phí") {
      throw new Error(`Sheets: ${workbook.sheets.join("|")}`);
    }
    const revenue = workbook.sheetsData["Doanh thu"];
    const cost = workbook.sheetsData["Chi phí"];
    if (revenue.get("B2")?.val !== 120 || revenue.get("B4")?.val !== 180) {
      throw new Error("Mất số liệu sheet Doanh thu");
    }
    if (revenue.get("B5")?.formula !== "=SUM(B2:B4)" || revenue.get("B5")?.val !== 450) {
      throw new Error(`SUM sai: ${JSON.stringify(revenue.get("B5"))}`);
    }
    const currency = cost.get("B2");
    if (currency?.val !== 1250000) throw new Error(`Giá trị currency sai: ${JSON.stringify(currency)}`);
    if (currency.style?.numberFormat?.category !== "currency" || currency.style.numberFormat.currencySymbol !== "₫") {
      throw new Error(`Định dạng currency sai: ${JSON.stringify(currency.style)}`);
    }
    if (revenue.get("A1")?.style?.numberFormat) {
      throw new Error("Ô chữ không được gán number format của cột mặc định");
    }
  });

  test("Slides: FODP soffice không nuốt page-thumbnail, giữ shape slide 2", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_SLIDES_FODP);
    if (slides.length !== 2) throw new Error(`Số slide: ${slides.length}`);
    if (slides[0].title !== "VN Office 2026") throw new Error(`Title slide 1: ${slides[0].title}`);
    if (slides[0].body !== "Bộ ứng dụng văn phòng Việt") throw new Error(`Subtitle slide 1: ${slides[0].body}`);
    if (slides[1].body !== "Kiến trúc nền tảng LibreOffice") throw new Error(`Body slide 2: ${slides[1].body}`);
    if (slides[1].title === "Khối kiến trúc") throw new Error("Text trong shape bị lấy làm tiêu đề slide");
    const shape = slides[1].shapes?.[0];
    if (!shape || shape.type !== "rect" || shape.text !== "Khối kiến trúc") {
      throw new Error(`Shape slide 2 sai: ${JSON.stringify(shape)}`);
    }
    if (shape.x < 50 || shape.y < 100 || shape.w < 200 || shape.h < 100) {
      throw new Error(`Vị trí/kích thước shape không tương đối đúng: ${JSON.stringify(shape)}`);
    }
    if (String(shape.color).toLowerCase() !== "#4472c4") {
      throw new Error(`Màu shape sai: ${shape.color}`);
    }
  });

  return results;
}
