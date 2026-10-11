/**
 * Import fidelity for files that did NOT go through VN Office serializers.
 * Snippets match LibreOffice HTML/FODS/FODP after soffice --convert-to from
 * tests/fixtures/real-office-samples/*.docx|xlsx|pptx (see live Playwright).
 */
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import fs from "node:fs";
import crypto from "node:crypto";

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

  test("Sheet: parseFods workbook snapshots match pre-optimization results", () => {
    const baselineHashes = new Map([
      ["sample-sheet.fods", "27d6a029634b9d23b3018034ec3ac3e31f2695dc336f60a081eac86a2de15129"],
      ["sample-sheet-validation.fods", "5a61f84f3e86fec0fbda3ce2f3184723f5282a2109e2669ac85bd5c7343bf4d0"],
      ["sample-sheet-pivot.fods", "9da11d96699646fd171f3e71d520aeeb5c3ce61fea3683e1657fd601195c56c5"],
      ["sample-sheet-formulas.fods", "6fe5161ffbdb734037194fd132e3ddfd615074142f7a4ff2c00f9b3b9f19d9db"]
    ]);
    const normalizeWorkbook = value => JSON.stringify(value, (_, item) =>
      item instanceof Map ? { __map: [...item.entries()] } : item instanceof Set ? { __set: [...item.values()] } : item);
    for (const [filename, expectedHash] of baselineHashes) {
      const xml = fs.readFileSync(`tests/fixtures/real-office-samples/src/${filename}`, "utf8");
      const workbook = new SheetAdapter(null).parseFods(xml);
      const hash = crypto.createHash("sha256").update(normalizeWorkbook(workbook)).digest("hex");
      if (hash !== expectedHash) throw new Error(`${filename}: workbook hash ${hash} != baseline ${expectedHash}`);
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

  const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAIAAADmAupWAAAARUlEQVR4nO3PQQ0AAAgEoOtka7MYyhb6YaMAmeRFqn8ICwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwvfWrnJYNfTtrHkAAAAAElFTkSuQmCC";
  const SOFFICE_WRITER_IMAGE_HTML = `<!DOCTYPE html>
<html><head><style type="text/css">
@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
</style></head>
<body>
<ol><li><h1 class="western">Logo đơn vị nhúng trong văn bản</h1></li></ol>
<p>Ảnh dưới đây là PNG 80×40 pixel.</p>
<p><img src="data:image/png;base64,${PNG_B64}" name="LogoDonVi" align="left" width="192" height="96" border="0"><br clear="left"/></img></p>
<p>Chú thích ảnh: logo đỏ-xanh dùng để đối chiếu nội dung nhúng sau khi mở DOCX thật.</p>
</body></html>`;

  const SOFFICE_SHEET_FORMULAS_FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="Danh mục">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Mã SP</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Tên</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Đơn giá</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>SP02</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Vở</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="12000"><text:p>12000</text:p></table:table-cell>
      </table:table-row>
    </table:table>
    <table:table table:name="Công thức">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Hệ số</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Mã tra</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="float" office:value="1.1"><text:p>1.1</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>SP02</text:p></table:table-cell>
        <table:table-cell table:formula="of:=VLOOKUP([.B2];[$&apos;Danh mục&apos;.A2:.C4];2;0)" office:value-type="string" office:string-value="Vở"><text:p>Vở</text:p></table:table-cell>
        <table:table-cell table:formula="of:=VLOOKUP([.B2];[$&apos;Danh mục&apos;.A2:.C4];3;0)" office:value-type="float" office:value="12000"><text:p>12000</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="80"><text:p>80</text:p></table:table-cell>
        <table:table-cell table:formula="of:=[.$A$2]*[.E2]" office:value-type="float" office:value="88"><text:p>88</text:p></table:table-cell>
        <table:table-cell table:formula="of:=IF([.E2]&gt;=100;&quot;Cao&quot;;IF([.E2]&gt;=50;&quot;Trung bình&quot;;&quot;Thấp&quot;))" office:value-type="string" office:string-value="Trung bình"><text:p>Trung bình</text:p></table:table-cell>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document>`;

  const SOFFICE_SHEET_VALIDATION_FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
 xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:automatic-styles>
    <style:style style:name="ConditionalStyle_5f_1" style:display-name="ConditionalStyle_1" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#c6efce"/>
    </style:style>
    <style:style style:name="ConditionalStyle_5f_2" style:display-name="ConditionalStyle_2" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#ffc7ce"/>
    </style:style>
    <style:style style:name="ConditionalStyle_5f_3" style:display-name="ConditionalStyle_3" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#fff2cc"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:spreadsheet>
    <table:content-validations>
      <table:content-validation table:name="val1" table:condition="of:cell-content-is-in-list(&quot;Đạt&quot;;&quot;Không đạt&quot;;&quot;Đang xử lý&quot;)" table:base-cell-address="&apos;Kiểm tra&apos;.B2"/>
      <table:content-validation table:name="val2" table:condition="of:cell-content-is-whole-number() and cell-content-is-between(0,10)" table:base-cell-address="&apos;Kiểm tra&apos;.C2"/>
    </table:content-validations>
    <table:table table:name="Kiểm tra">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Điểm</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Trạng thái</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Điểm phụ</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="float" office:value="95"><text:p>95</text:p></table:table-cell>
        <table:table-cell table:content-validation-name="val1" office:value-type="string"><text:p>Đạt</text:p></table:table-cell>
        <table:table-cell table:content-validation-name="val2" office:value-type="float" office:value="8"><text:p>8</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="float" office:value="45"><text:p>45</text:p></table:table-cell>
        <table:table-cell table:content-validation-name="val1" office:value-type="string"><text:p>Sai giá trị</text:p></table:table-cell>
        <table:table-cell table:content-validation-name="val2" office:value-type="float" office:value="15"><text:p>15</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell/>
        <table:table-cell table:content-validation-name="val1" office:value-type="string"><text:p>Đang xử lý</text:p></table:table-cell>
        <table:table-cell table:content-validation-name="val2" office:value-type="float" office:value="3"><text:p>3</text:p></table:table-cell>
      </table:table-row>
      <calcext:conditional-formats>
        <calcext:conditional-format calcext:target-range-address="&apos;Kiểm tra&apos;.A2:&apos;Kiểm tra&apos;.A4">
          <calcext:condition calcext:apply-style-name="ConditionalStyle_1" calcext:value="&gt;80" calcext:base-cell-address="&apos;Kiểm tra&apos;.A2"/>
          <calcext:condition calcext:apply-style-name="ConditionalStyle_2" calcext:value="&lt;50" calcext:base-cell-address="&apos;Kiểm tra&apos;.A2"/>
          <calcext:condition calcext:apply-style-name="ConditionalStyle_3" calcext:value="formula-is(LEN(TRIM([.A2]))=0)" calcext:base-cell-address="&apos;Kiểm tra&apos;.A2"/>
        </calcext:conditional-format>
      </calcext:conditional-formats>
    </table:table>
  </office:spreadsheet></office:body>
</office:document>`;

  test("Writer: ảnh nhúng soffice HTML giữ data URI, tên, width/height", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_WRITER_IMAGE_HTML);
    const img = imported.body.match(/<img\b[^>]*>/i)?.[0] || "";
    if (!img.includes(`src="data:image/png;base64,${PNG_B64}"`)) {
      throw new Error(`Mất nội dung ảnh base64: ${img.slice(0, 180)}`);
    }
    if (!/width="192"/i.test(img) || !/height="96"/i.test(img)) {
      throw new Error(`Kích thước ảnh sai (cần 192×96 px = 5,08×2,54 cm): ${img}`);
    }
    if (!/name="LogoDonVi"/i.test(img)) throw new Error(`Mất name LogoDonVi: ${img}`);
    if (/<\/img>/i.test(imported.body)) throw new Error("Thẻ </img> thừa chưa được gỡ");
  });

  await asyncTest("Writer: common.file.open nạp ảnh nhúng vào body", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({ status: "ok", content: SOFFICE_WRITER_IMAGE_HTML, fileName: "sample-writer-image.docx" });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (!body.innerHTML.includes("data:image/png;base64,") || !body.innerHTML.includes("LogoDonVi")) {
        throw new Error(`Body sau open() mất ảnh: ${body.innerHTML.slice(0, 220)}`);
      }
      if (!body.innerHTML.includes("width=\"192\"")) throw new Error("Mất width ảnh sau open()");
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  test("Sheet: FODS soffice giữ VLOOKUP, IF lồng, tham chiếu tuyệt đối — không flatten", () => {
    const workbook = new SheetAdapter(null).parseFods(SOFFICE_SHEET_FORMULAS_FODS);
    if (workbook.sheets.join("|") !== "Danh mục|Công thức") {
      throw new Error(`Sheets: ${workbook.sheets.join("|")}`);
    }
    const sheet = workbook.sheetsData["Công thức"];
    const nameLookup = sheet.get("C2");
    const priceLookup = sheet.get("D2");
    const absProduct = sheet.get("F2");
    const nestedIf = sheet.get("G2");
    if (!String(nameLookup?.formula || "").includes("VLOOKUP") || nameLookup.val !== "Vở") {
      throw new Error(`VLOOKUP tên bị flatten/sai: ${JSON.stringify(nameLookup)}`);
    }
    if (!String(priceLookup?.formula || "").includes("VLOOKUP") || priceLookup.val !== 12000) {
      throw new Error(`VLOOKUP giá bị flatten/sai: ${JSON.stringify(priceLookup)}`);
    }
    if (absProduct?.formula !== "=$A$2*E2" || absProduct.val !== 88) {
      throw new Error(`Tham chiếu tuyệt đối sai: ${JSON.stringify(absProduct)}`);
    }
    if (!String(nestedIf?.formula || "").startsWith("=IF(") || !String(nestedIf.formula).includes("IF(E2>=50") || nestedIf.val !== "Trung bình") {
      throw new Error(`IF lồng sai: ${JSON.stringify(nestedIf)}`);
    }
  });

  test("Sheet: FODS soffice giữ Conditional Formatting và Data Validation", () => {
    const workbook = new SheetAdapter(null).parseFods(SOFFICE_SHEET_VALIDATION_FODS);
    const rules = workbook.conditionalFormattingBySheet["Kiểm tra"] || [];
    const validations = workbook.dataValidationsBySheet["Kiểm tra"] || [];
    const greater = rules.find(rule => rule.type === "greaterThan");
    const less = rules.find(rule => rule.type === "lessThan");
    const blank = rules.find(rule => rule.type === "blank");
    if (!greater || greater.value !== 80 || greater.color !== "#c6efce") {
      throw new Error(`CF >80 sai: ${JSON.stringify(rules)}`);
    }
    if (!less || less.value !== 50 || less.color !== "#ffc7ce") {
      throw new Error(`CF <50 sai: ${JSON.stringify(rules)}`);
    }
    if (!blank || blank.color !== "#fff2cc") {
      throw new Error(`CF blank sai: ${JSON.stringify(rules)}`);
    }
    if (greater.range.start.c !== "A" || greater.range.end.r !== 4) {
      throw new Error(`CF range sai: ${JSON.stringify(greater.range)}`);
    }
    const list = validations.find(item => item.type === "list");
    const numeric = validations.find(item => item.type === "numberRange");
    if (!list || list.values.join("|") !== "Đạt|Không đạt|Đang xử lý" || list.range.start.c !== "B") {
      throw new Error(`List validation sai: ${JSON.stringify(validations)}`);
    }
    if (!numeric || numeric.min !== 0 || numeric.max !== 10 || numeric.range.start.c !== "C") {
      throw new Error(`Number validation sai: ${JSON.stringify(validations)}`);
    }
  });

  return results;
}
