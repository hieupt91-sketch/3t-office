/**
 * Writer Tables import fidelity.
 *
 * Fixture: hand-written FODT (ODF table:number-columns-spanned / number-rows-spanned
 * + per-edge fo:border-* + fo:background-color)
 * → soffice --convert-to docx (NOT VN Office serialize).
 *
 * Unlike Track Changes / Comments, StarWriter HTML KEEPS complex tables:
 * <table> with rowspan/colspan and inline border/background on td/th.
 * Adapter extracts <body> only; those inline styles survive. No OOXML sidecar.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-tables.docx");
const FODT = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-tables.fodt");

const HEADING = "Bảng phân bổ vốn đầu tư công 2026";
const ROWSPAN_TEXT = "Nhóm dự án thủy lợi";
const COLSPAN_TEXT = "Phân bổ ngân sách năm 2026";
const CELL_DA001 = "DA-001 Đăk Bla";
const CELL_GREEN = "1.250.000.000";
const CELL_PER_EDGE = "980.000.000";
const CELL_PINK = "850.000.000 TH";

/**
 * Captured from LibreOffice HTML (StarWriter) of the fixture DOCX
 * (LibreOffice 26.2.5.2). Has rowspan/colspan + inline per-edge borders
 * and cell shading — not flattened.
 */
const SOFFICE_TABLES_HTML = `<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8"/>
	<title></title>
	<meta name="generator" content="LibreOffice 26.2.5.2 (Windows)"/>
	<style type="text/css">
		@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
		p { orphans: 0; color: #000000; direction: ltr; line-height: 115%; text-align: left; widows: 0; margin-bottom: 0.21cm; background: transparent }
		h1.western { font-family: "Times New Roman", serif; font-weight: bold; font-size: 18pt; so-language: en-GB }
		td p.western { font-family: "Times New Roman", serif; font-size: 12pt; so-language: en-GB }
		th p.western { font-family: "Times New Roman", serif; font-weight: bold; font-size: 12pt; so-language: en-GB }
	</style>
</head>
<body lang="en-GB" text="#000000" link="#000080" vlink="#800000" dir="ltr">
<ol><li><h1 class="western" align="left">Bảng phân bổ vốn đầu
	tư công 2026</h1></li>
</ol>
<p class="western" align="left" style="line-height: 115%">Đơn vị
lập biểu Phòng Kế hoạch. Số liệu đối chiếu với
quyết định giao vốn.</p>
<table width="100%" cellpadding="5" cellspacing="0">
	<col width="93*"/>
	<col width="81*"/>
	<col width="81*"/>
	<tr valign="top">
		<th rowspan="2" width="36%" bgcolor="#fef3c7" style="background: #fef3c7; border-top: 1px solid #b45309; border-bottom: 1px solid #b45309; border-left: 2.25pt solid #b45309; border-right: 1px solid #b45309; padding: 0.15cm"><p class="western" align="center">
			Nhóm dự án thủy lợi</p>
		</th>
		<th colspan="2" width="64%" bgcolor="#dbeafe" style="background: #dbeafe; border-top: 1.50pt solid #1d4ed8; border-bottom: 1px solid #1d4ed8; border-left: 1px solid #1d4ed8; border-right: 1px solid #1d4ed8; padding: 0.15cm"><p class="western" align="center">
			Phân bổ ngân sách năm 2026</p>
		</th>
	</tr>
	<tr valign="top">
		<th width="32%" style="border-top: 1px solid #15803d; border-bottom: 1px solid #15803d; border-left: 1.50pt solid #15803d; border-right: 1px solid #15803d; padding: 0.12cm"><p class="western" align="center">
			Kế hoạch</p>
		</th>
		<th width="32%" style="border-top: 1px solid #b91c1c; border-bottom: 1px solid #b91c1c; border-left: 1px solid #b91c1c; border-right: 1.50pt solid #b91c1c; padding: 0.12cm"><p class="western" align="center">
			Thực hiện</p>
		</th>
	</tr>
	<tr valign="top">
		<td width="36%" style="border: 1px solid #64748b; padding: 0.12cm"><p class="western" align="left">
			DA-001 Đăk Bla</p>
		</td>
		<td width="32%" bgcolor="#dcfce7" style="background: #dcfce7; border: 1px solid #15803d; padding: 0.12cm"><p class="western" align="left">
			1.250.000.000</p>
		</td>
		<td width="32%" style="border-top: 1.50pt solid #1d4ed8; border-bottom: 1.50pt solid #6d28d9; border-left: 1.50pt solid #15803d; border-right: 1.50pt solid #b91c1c; padding: 0.12cm"><p class="western" align="left">
			980.000.000</p>
		</td>
	</tr>
	<tr valign="top">
		<td width="36%" style="border: 1px solid #64748b; padding: 0.12cm"><p class="western" align="left">
			DA-002 Đường huyện</p>
		</td>
		<td width="32%" style="border: 1px solid #64748b; padding: 0.12cm"><p class="western" align="left">
			850.000.000 KH</p>
		</td>
		<td width="32%" bgcolor="#fecaca" style="background: #fecaca; border: 1px solid #b91c1c; padding: 0.12cm"><p class="western" align="left">
			850.000.000 TH</p>
		</td>
	</tr>
</table>
<p class="western" align="left" style="line-height: 115%">Ghi chú: ô
gộp ngang là tiêu đề năm, ô gộp dọc là nhóm dự án.</p>
</body>
</html>`;

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

function readFixtureXml(entryName) {
  const xml = readZipEntry(DOCX, entryName);
  if (!xml) throw new Error(`${entryName} missing from sample-writer-tables.docx`);
  return xml.toString("utf8");
}

function collapseWs(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function assertTableFidelity(html, label) {
  const text = collapseWs(html);
  if (!/<table\b/i.test(html)) throw new Error(`${label}: mất <table>`);
  if (!/rowspan=["']2["']/i.test(html)) throw new Error(`${label}: mất rowspan=2`);
  if (!/colspan=["']2["']/i.test(html)) throw new Error(`${label}: mất colspan=2`);
  if (!html.includes("#fef3c7") || !html.includes("#dbeafe") || !html.includes("#dcfce7") || !html.includes("#fecaca")) {
    throw new Error(`${label}: mất shading hex: ${html.slice(0, 400)}`);
  }
  if (!html.includes("#b45309") || !html.includes("#1d4ed8") || !html.includes("#15803d") || !html.includes("#b91c1c") || !html.includes("#6d28d9")) {
    throw new Error(`${label}: mất per-edge border colors`);
  }
  if (!html.includes("border-left: 2.25pt solid #b45309")) {
    throw new Error(`${label}: mất viền trái dày ô rowspan`);
  }
  if (!html.includes("border-top: 1.50pt solid #1d4ed8") || !html.includes("border-bottom: 1.50pt solid #6d28d9")) {
    throw new Error(`${label}: mất viền trên/dưới khác màu ô 980.000.000`);
  }
  if (!text.includes(ROWSPAN_TEXT) || !text.includes(COLSPAN_TEXT) || !text.includes(CELL_DA001) || !text.includes(CELL_PER_EDGE) || !text.includes(CELL_PINK)) {
    throw new Error(`${label}: mất chữ trong ô: ${text.slice(0, 240)}`);
  }
  if (html.includes("#94a3b8")) {
    throw new Error(`${label}: HTML StarWriter không được chứa viền mặc định VN Writer`);
  }
}

export async function runWriterTablesImportTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };
  const asyncTest = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Fixture độc lập VN Office: FODT có merge/border/shading, DOCX có w:tbl native", () => {
    if (!fs.existsSync(FODT)) throw new Error("Thiếu sample-writer-tables.fodt");
    if (!fs.existsSync(DOCX)) throw new Error("Thiếu sample-writer-tables.docx");
    const fodt = fs.readFileSync(FODT, "utf8");
    if (!fodt.includes('table:number-columns-spanned="2"') || !fodt.includes('table:number-rows-spanned="2"')) {
      throw new Error("FODT không còn ODF merge viết tay");
    }
    if (!fodt.includes("table:covered-table-cell")) {
      throw new Error("FODT thiếu covered-table-cell");
    }
    if (!fodt.includes('fo:background-color="#fef3c7"') || !fodt.includes('fo:background-color="#dcfce7"') || !fodt.includes('fo:background-color="#fecaca"')) {
      throw new Error("FODT mất shading");
    }
    if (!fodt.includes('fo:border-left="2.25pt solid #b45309"') || !fodt.includes('fo:border-bottom="1.5pt solid #6d28d9"')) {
      throw new Error("FODT mất per-edge borders");
    }
    if (fodt.includes("serializeTo") || fodt.includes("data-vno-")) {
      throw new Error("FODT trông như output VN Office, không phải fixture viết tay");
    }
    const names = listZipEntries(DOCX).map((entry) => entry.name.replaceAll("\\", "/"));
    if (!names.includes("word/document.xml")) throw new Error("DOCX thiếu word/document.xml");
    const documentXml = readFixtureXml("word/document.xml");
    if (!documentXml.includes("<w:tbl") || !documentXml.includes("<w:gridSpan") || !documentXml.includes("<w:vMerge")) {
      throw new Error("DOCX soffice không giữ native merge (gridSpan/vMerge)");
    }
    if (!documentXml.includes('w:val="restart"') || !documentXml.includes('w:val="continue"')) {
      throw new Error("DOCX mất w:vMerge restart/continue");
    }
    if (!documentXml.includes("<w:tcBorders") || !documentXml.includes("<w:shd")) {
      throw new Error("DOCX mất w:tcBorders / w:shd");
    }
    if (!documentXml.includes('w:fill="FEF3C7"') || !documentXml.includes('w:fill="DBEAFE"') || !documentXml.includes('w:fill="DCFCE7"') || !documentXml.includes('w:fill="FECACA"')) {
      throw new Error("DOCX mất w:shd fill hex");
    }
    if (!documentXml.includes('w:color="1D4ED8"') || !documentXml.includes('w:color="B91C1C"') || !documentXml.includes('w:color="6D28D9"') || !documentXml.includes('w:color="B45309"')) {
      throw new Error("DOCX mất per-edge w:color");
    }
    if (!documentXml.includes(ROWSPAN_TEXT) || !documentXml.includes(COLSPAN_TEXT) || !documentXml.includes(CELL_DA001) || !documentXml.includes(CELL_PER_EDGE)) {
      throw new Error("DOCX mất chữ trong ô");
    }
  });

  test("StarWriter HTML (snapshot đo được): giữ table merge + inline border/shading", () => {
    assertTableFidelity(SOFFICE_TABLES_HTML, "snapshot");
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_TABLES_HTML);
    if (imported.body.includes("<html") || imported.body.includes("<!DOCTYPE")) {
      throw new Error("Normalize dump cả HTML document vào body");
    }
    if (!/<h1\b/i.test(imported.body) || /<ol\b/i.test(imported.body)) {
      throw new Error(`Heading 1 không được gỡ list: ${imported.body.slice(0, 180)}`);
    }
    assertTableFidelity(imported.body, "normalized body");
    if (imported.body.includes("<style") || imported.body.includes("@page")) {
      throw new Error("Body vẫn còn head CSS — extract <body> bị lệch");
    }
    if (!collapseWs(imported.body).includes("Đơn vị lập biểu Phòng Kế hoạch")) {
      throw new Error("Mất đoạn văn ngoài bảng");
    }
  });

  test("Normalize không bịa sidecar OOXML và không flatten bảng thành đoạn", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_TABLES_HTML);
    if (imported.comments?.length) {
      throw new Error("Bịa comments state từ file không có comment");
    }
    const tables = imported.body.match(/<table\b[\s\S]*?<\/table>/gi) || [];
    if (tables.length !== 1) throw new Error(`Cần 1 table, nhận ${tables.length}`);
    const rows = tables[0].match(/<tr\b/gi) || [];
    if (rows.length !== 4) throw new Error(`Cần 4 hàng, nhận ${rows.length}`);
    const cells = tables[0].match(/<(td|th)\b/gi) || [];
    if (cells.length !== 10) throw new Error(`Cần 10 ô HTML sau merge, nhận ${cells.length}`);
  });

  await asyncTest("adapter.open() nạp DOCX thật qua stub bridge: canvas HTML còn merge/border/shading", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_TABLES_HTML,
      fileName: "sample-writer-tables.docx"
    });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      assertTableFidelity(body.innerHTML, "open() body");
      if (body.innerHTML.includes("<html") || body.innerHTML.includes("<!DOCTYPE")) {
        throw new Error("open() dump cả tài liệu HTML vào body");
      }
      if (!/<h1\b/i.test(body.innerHTML) || /<ol\b/i.test(body.innerHTML)) {
        throw new Error(`Heading 1 không được gỡ list: ${body.innerHTML.slice(0, 180)}`);
      }
      if (!collapseWs(body.innerHTML).includes(HEADING)) {
        throw new Error("open() mất heading");
      }
      if (!collapseWs(body.innerHTML).includes(CELL_GREEN)) {
        throw new Error("open() mất ô tô xanh");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  return results;
}
