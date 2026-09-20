/**
 * Writer Header/Footer import fidelity.
 *
 * Fixture: hand-written FODT (ODF style:header / style:footer + PAGE fields)
 * → soffice --convert-to docx (NOT VN Office serialize).
 *
 * Unlike Track Changes / Comments, StarWriter HTML KEEPS header/footer as
 * <div title="header|footer"> — the same markers WriterAdapter already parses
 * for VN round-trip. PAGE/NUMPAGES become <sdfield>; the adapter unwraps them
 * so Print Preview can still replace `Trang N / M`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-headerfooter.docx");
const FODT = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-headerfooter.fodt");

const HEADER_COMPANY = "Công ty TNHH Sao Việt";
const HEADER_DEPT = "Phòng Kế hoạch";
const FOOTER_DATE = "05/09/2026";
const BODY_TOKEN = "Nội dung thân trang công văn số 128/KH-ĐT";
const HEADING = "Công văn triển khai kế hoạch quý IV";

/**
 * Captured from LibreOffice HTML (StarWriter) of the fixture DOCX
 * (LibreOffice 26.2.5.2). Has title="header|footer" — not flattened.
 * PAGE/NUMPAGES are <sdfield> with a gray span.
 */
const SOFFICE_HEADERFOOTER_HTML = `<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8"/>
	<title></title>
	<meta name="generator" content="LibreOffice 26.2.5.2 (Windows)"/>
	<meta name="created" content="00:00:00"/>
	<meta name="changed" content="00:00:00"/>
	<meta name="AppVersion" content="15.0000"/>
	<style type="text/css">
		@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
		p { orphans: 0; color: #000000; direction: ltr; line-height: 115%; text-align: left; widows: 0; margin-bottom: 0.21cm; background: transparent }
		p.western { font-family: "Times New Roman", serif; font-size: 12pt; so-language: en-GB }
		p.cjk { font-size: 12pt; so-language: zh-CN; font-family: "NSimSun" }
		p.ctl { font-family: "Lucida Sans"; font-size: 12pt; so-language: hi-IN }
		h1 { orphans: 0; color: #000000; text-align: left; widows: 0; margin-bottom: 0.21cm; direction: ltr; background: transparent; page-break-after: avoid }
		h1.western { font-family: "Times New Roman", serif; font-weight: bold; font-size: 18pt; so-language: en-GB }
		h1.cjk { font-size: 18pt; so-language: zh-CN; font-weight: bold; font-family: "NSimSun" }
		h1.ctl { font-family: "Lucida Sans"; font-size: 12pt; so-language: hi-IN }
	</style>
</head>
<body lang="en-GB" text="#000000" link="#000080" vlink="#800000" dir="ltr">
<div title="header"><p align="left" style="line-height: 100%; margin-bottom: 0.81cm">
	<font size="2" style="font-size: 10pt">Công ty TNHH Sao Việt —
	Phòng Kế hoạch</font></p>
</div>
<ol><li><h1 class="western" align="left">Công văn triển khai kế
	hoạch quý IV</h1></li>
</ol>
<p class="western" align="left" style="line-height: 115%">Nội dung
thân trang công văn số 128/KH-ĐT. Đoạn này chỉ thuộc
body, không phải header hay footer.</p>
<div title="footer"><p align="center" style="line-height: 100%; margin-top: 0.81cm; margin-bottom: 0cm">
	<font size="2" style="font-size: 10pt">Trang <span style="background: #c0c0c0"><sdfield type=PAGE subtype=RANDOM format=PAGE>1</sdfield></span>
	/ <span style="background: #c0c0c0"><sdfield type=DOCSTAT subtype=PAGE format=PAGE>1</sdfield></span>
	· Ngày 05/09/2026</font></p>
</div>
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
  if (!xml) throw new Error(`${entryName} missing from sample-writer-headerfooter.docx`);
  return xml.toString("utf8");
}

function ooxmlPlainText(xml) {
  const texts = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
  let match;
  while ((match = re.exec(String(xml || "")))) {
    texts.push(
      match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    );
  }
  return texts.join("");
}

function collapseWs(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function runWriterHeaderFooterImportTests() {
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

  test("Fixture độc lập VN Office: FODT có style:header/footer, DOCX có word/header1.xml + footer1.xml", () => {
    if (!fs.existsSync(FODT)) throw new Error("Thiếu sample-writer-headerfooter.fodt");
    if (!fs.existsSync(DOCX)) throw new Error("Thiếu sample-writer-headerfooter.docx");
    const fodt = fs.readFileSync(FODT, "utf8");
    if (!fodt.includes("<style:header>") || !fodt.includes("<style:footer>")) {
      throw new Error("FODT không còn ODF header/footer viết tay");
    }
    if (!fodt.includes(HEADER_COMPANY) || !fodt.includes(HEADER_DEPT) || !fodt.includes(FOOTER_DATE)) {
      throw new Error("FODT mất nội dung header/footer");
    }
    if (!fodt.includes("<text:page-number") || !fodt.includes("<text:page-count")) {
      throw new Error("FODT mất trường số trang ODF");
    }
    if (fodt.includes("serializeTo") || fodt.includes('title="header"')) {
      throw new Error("FODT trông như output VN Office, không phải fixture viết tay");
    }
    if (!fodt.includes(BODY_TOKEN) || !fodt.includes(HEADING)) {
      throw new Error("FODT mất nội dung thân trang");
    }

    const names = listZipEntries(DOCX).map((entry) => entry.name.replaceAll("\\", "/"));
    if (!names.includes("word/header1.xml")) throw new Error(`Thiếu word/header1.xml: ${names.join(", ")}`);
    if (!names.includes("word/footer1.xml")) throw new Error(`Thiếu word/footer1.xml: ${names.join(", ")}`);

    const documentXml = readFixtureXml("word/document.xml");
    const headerXml = readFixtureXml("word/header1.xml");
    const footerXml = readFixtureXml("word/footer1.xml");

    if (!documentXml.includes("w:headerReference") || !documentXml.includes("w:footerReference")) {
      throw new Error("word/document.xml thiếu sectPr headerReference/footerReference");
    }
    if (documentXml.includes(HEADER_COMPANY) || documentXml.includes(FOOTER_DATE)) {
      throw new Error("Header/footer bị nhét vào word/document.xml — không còn part riêng");
    }
    if (!documentXml.includes("128/KH-ĐT") || !documentXml.includes("Công văn triển khai kế hoạch quý IV")) {
      throw new Error("word/document.xml mất thân trang");
    }
    if (!headerXml.includes("<w:hdr") || !headerXml.includes(HEADER_COMPANY) || !headerXml.includes(HEADER_DEPT)) {
      throw new Error(`word/header1.xml mất nội dung header: ${headerXml.slice(0, 400)}`);
    }
    if (headerXml.includes(BODY_TOKEN) || headerXml.includes(HEADING)) {
      throw new Error("word/header1.xml lẫn nội dung thân trang");
    }
    if (!footerXml.includes("<w:ftr") || !footerXml.includes(FOOTER_DATE) || !footerXml.includes("Trang")) {
      throw new Error(`word/footer1.xml mất nội dung footer: ${footerXml.slice(0, 400)}`);
    }
    if (!footerXml.includes("PAGE") || !footerXml.includes("NUMPAGES") || !footerXml.includes("w:instrText")) {
      throw new Error("word/footer1.xml mất trường PAGE/NUMPAGES");
    }
    if (footerXml.includes(HEADER_COMPANY) || footerXml.includes(BODY_TOKEN)) {
      throw new Error("word/footer1.xml lẫn header/body");
    }
  });

  test("StarWriter HTML hiện trạng: CÒN title=header/footer (không flatten như Track Changes)", () => {
    if (!/title=["']header["']/i.test(SOFFICE_HEADERFOOTER_HTML)) {
      throw new Error("Snapshot HTML mất <div title=\"header\"> — giả định đo đã đổi");
    }
    if (!/title=["']footer["']/i.test(SOFFICE_HEADERFOOTER_HTML)) {
      throw new Error("Snapshot HTML mất <div title=\"footer\"> — giả định đo đã đổi");
    }
    if (!SOFFICE_HEADERFOOTER_HTML.includes(HEADER_COMPANY) || !SOFFICE_HEADERFOOTER_HTML.includes(HEADER_DEPT)) {
      throw new Error("Snapshot HTML mất tên công ty header");
    }
    if (!SOFFICE_HEADERFOOTER_HTML.includes(FOOTER_DATE) || !SOFFICE_HEADERFOOTER_HTML.includes("Trang")) {
      throw new Error("Snapshot HTML mất footer ngày/Trang");
    }
    if (!/<sdfield\b/i.test(SOFFICE_HEADERFOOTER_HTML)) {
      throw new Error("Snapshot HTML không còn <sdfield> PAGE — giả định đo đã đổi");
    }
    if (!/Nội\s+dung\s+thân\s+trang/i.test(SOFFICE_HEADERFOOTER_HTML)) {
      throw new Error("Snapshot HTML mất thân trang (StarWriter ngắt dòng giữa từ)");
    }
  });

  test("Adapter tách header/footer khỏi body, gỡ sdfield, Print Preview còn khớp Trang N / M", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_HEADERFOOTER_HTML);
    const headerText = collapseWs(imported.header.replace(/<[^>]+>/g, " "));
    const footerText = collapseWs(imported.footer.replace(/<[^>]+>/g, " "));
    const bodyText = collapseWs(imported.body.replace(/<[^>]+>/g, " "));

    if (!headerText.includes(HEADER_COMPANY) || !headerText.includes(HEADER_DEPT)) {
      throw new Error(`Header mất tên công ty: ${imported.header}`);
    }
    if (!footerText.includes(FOOTER_DATE) || !/Trang\s+1\s*\/\s*1/.test(footerText)) {
      throw new Error(`Footer mất ngày/số trang: ${imported.footer}`);
    }
    if (/sdfield/i.test(imported.header) || /sdfield/i.test(imported.footer)) {
      throw new Error(`Còn <sdfield> sau normalize: ${imported.footer}`);
    }
    if (/background:\s*#c0c0c0/i.test(imported.footer)) {
      throw new Error("Còn span nền xám StarWriter quanh số trang");
    }
    if (/title=["']header["']/i.test(imported.body) || /title=["']footer["']/i.test(imported.body)) {
      throw new Error("Header/footer div còn sót trong body");
    }
    if (imported.body.includes(HEADER_COMPANY) || imported.body.includes(FOOTER_DATE)) {
      throw new Error("Nội dung header/footer bị tràn vào body");
    }
    if (!/<h1\b/i.test(imported.body) || /<ol\b/i.test(imported.body)) {
      throw new Error(`Heading 1 không được gỡ list: ${imported.body.slice(0, 180)}`);
    }
    if (!/Công\s+văn\s+triển\s+khai/i.test(imported.body) || !/Nội\s+dung\s+thân\s+trang/i.test(imported.body)) {
      throw new Error(`Mất thân trang: ${imported.body.slice(0, 240)}`);
    }

    const previewFooter = imported.footer.replace(/Trang\s+\d+(\s*\/\s*\d+)?/gi, "Trang 3 / 5");
    if (!previewFooter.includes("Trang 3 / 5") || !previewFooter.includes(FOOTER_DATE)) {
      throw new Error(`Print Preview không thay được số trang sau normalize: ${previewFooter}`);
    }

    const headerXml = readFixtureXml("word/header1.xml");
    const footerXml = readFixtureXml("word/footer1.xml");
    if (collapseWs(ooxmlPlainText(headerXml)) !== collapseWs(`${HEADER_COMPANY} — ${HEADER_DEPT}`)) {
      throw new Error(`OOXML header text lệch: ${ooxmlPlainText(headerXml)}`);
    }
    if (collapseWs(ooxmlPlainText(footerXml)) !== collapseWs(`Trang 1 / 1 · Ngày ${FOOTER_DATE}`)) {
      throw new Error(`OOXML footer text lệch: ${ooxmlPlainText(footerXml)}`);
    }
  });

  await asyncTest("adapter.open() nạp DOCX thật qua stub bridge: header/footer đúng vùng, body không lẫn", async () => {
    const { editor, header, body, footer } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_HEADERFOOTER_HTML,
      fileName: "sample-writer-headerfooter.docx"
    });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (body.innerHTML.includes("<html") || body.innerHTML.includes("<!DOCTYPE")) {
        throw new Error("open() dump cả tài liệu HTML vào body");
      }
      if (!header.innerHTML.includes(HEADER_COMPANY) || !header.innerHTML.includes(HEADER_DEPT)) {
        throw new Error(`open() headerDom sai: ${header.innerHTML}`);
      }
      if (!footer.innerHTML.includes(FOOTER_DATE) || !/Trang\s+1/i.test(footer.innerHTML)) {
        throw new Error(`open() footerDom sai: ${footer.innerHTML}`);
      }
      if (/sdfield/i.test(footer.innerHTML)) {
        throw new Error("open() footer còn sdfield");
      }
      if (body.innerHTML.includes(HEADER_COMPANY) || body.innerHTML.includes(FOOTER_DATE)) {
        throw new Error("open() tràn header/footer vào body");
      }
      if (!/<h1\b/i.test(body.innerHTML) || /<ol\b/i.test(body.innerHTML)) {
        throw new Error(`Heading 1 không được gỡ list: ${body.innerHTML.slice(0, 180)}`);
      }
      if (!/Nội\s+dung\s+thân\s+trang/i.test(body.innerHTML)) {
        throw new Error("open() mất thân trang");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  test("HTML không có title=header/footer thì không bịa header/footer", () => {
    const html = `<!DOCTYPE html><html><body><p>${BODY_TOKEN}</p></body></html>`;
    const imported = new WriterAdapter(null)._normalizeImportedHtml(html);
    if (imported.header) throw new Error(`Bịa header khi HTML không có: ${imported.header}`);
    if (imported.footer) throw new Error(`Bịa footer khi HTML không có: ${imported.footer}`);
    if (!imported.body.includes(BODY_TOKEN)) throw new Error("Mất body khi không có header/footer");
  });

  test("W23a: Header/Footer loại bỏ spacer nhân tạo (margin-bottom đoạn cuối header, margin-top đoạn đầu footer)", () => {
    const html = `<div title="header">
      <p style="margin-bottom: 0.35cm">Đoạn 1 giữ nguyên margin-bottom</p>
      <p style="line-height: 100%; margin-bottom: 2.44cm">Đoạn cuối bị xén spacer</p>
    </div>
    <div title="footer">
      <p style="margin-top: 2.19cm; margin-bottom: 0.35cm">Đoạn đầu footer bị xén margin-top</p>
      <p style="line-height: 100%; margin-bottom: 0cm">Đoạn 2 footer giữ nguyên</p>
    </div>`;
    const imported = new WriterAdapter(null)._normalizeImportedHtml(html);
    if (!imported.header.includes("margin-bottom: 0.35cm")) {
      throw new Error(`Đoạn 1 header bị mất margin-bottom: ${imported.header}`);
    }
    if (imported.header.includes("2.44cm")) {
      throw new Error(`Đoạn cuối header chưa bỏ margin-bottom 2.44cm: ${imported.header}`);
    }
    if (imported.footer.includes("2.19cm")) {
      throw new Error(`Đoạn đầu footer chưa bỏ margin-top 2.19cm: ${imported.footer}`);
    }
    if (!imported.footer.includes("margin-bottom: 0.35cm")) {
      throw new Error(`Đoạn đầu footer mất margin-bottom hợp lệ: ${imported.footer}`);
    }
    // line-height: 100% phải được chuẩn hoá thành --vno-lh: 1
    if (!imported.header.includes("--vno-lh: 1")) {
      throw new Error(`Header chưa được mã hoá proportional line-height (--vno-lh): ${imported.header}`);
    }
    if (!imported.footer.includes("--vno-lh: 1")) {
      throw new Error(`Footer chưa được mã hoá proportional line-height (--vno-lh): ${imported.footer}`);
    }
  });

  return results;
}
