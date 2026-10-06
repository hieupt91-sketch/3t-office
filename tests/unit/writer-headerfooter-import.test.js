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

  test("Adapter tách header/footer khỏi body, giữ field Trang N / M cho Print Preview và DOCX", () => {
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

    if (!/data-vno-field=["']PAGE["']/i.test(imported.footer) || !/data-vno-field=["']NUMPAGES["']/i.test(imported.footer)) {
      throw new Error(`PAGE/NUMPAGES không còn marker để save DOCX và thay số theo trang: ${imported.footer}`);
    }
    const previewFooter = imported.footer
      .replace(/(<span\b[^>]*data-vno-field=["']PAGE["'][^>]*>)[\s\S]*?(<\/span>)/i, (_match, before, after) => `${before}3${after}`)
      .replace(/(<span\b[^>]*data-vno-field=["']NUMPAGES["'][^>]*>)[\s\S]*?(<\/span>)/i, (_match, before, after) => `${before}5${after}`);
    const previewFooterText = collapseWs(previewFooter.replace(/<[^>]*>/g, " "));
    if (!/Trang\s+3\s*\/\s*5/.test(previewFooterText) || !previewFooterText.includes(FOOTER_DATE)) {
      throw new Error(`Print Preview không thay được số trang sau normalize: ${previewFooterText}`);
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
      const footerText = collapseWs(footer.innerHTML.replace(/<[^>]*>/g, " "));
      if (!footerText.includes(FOOTER_DATE) || !/Trang\s+1\s*\/\s*1/i.test(footerText)) {
        throw new Error(`open() footerDom sai: ${footer.innerHTML}`);
      }
      if (!/data-vno-field=["']PAGE["']/i.test(footer.innerHTML) || !/data-vno-field=["']NUMPAGES["']/i.test(footer.innerHTML)) {
        throw new Error(`open() không giữ PAGE/NUMPAGES fields: ${footer.innerHTML}`);
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

  test("W23b: _getUsablePageHeight tính chiều cao thân theo quy tắc Word (max lề trên, min đáy trang)", () => {
    const adapter = new WriterAdapter(null);
    const MM_TO_PX = 96 / 25.4;

    // Cấu hình: lề trên 20mm (=75.6px), lề dưới 20mm (=75.6px), headerDist 10mm (=37.8px), footerDist 10mm (=37.8px)
    adapter.pageSetup = {
      size: "a4",
      orientation: "portrait",
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      headerDistanceMm: 10,
      footerDistanceMm: 10
    };

    const dim = adapter.getPageDimensions();
    const topMarginPx = dim.topPx;
    const bottomMarginPx = dim.bottomPx;

    // Trường hợp 1: Không có header/footer -> availableHeightPx = printableHeightPx
    adapter.headerDom = null;
    adapter.footerDom = null;
    let usableH = adapter._getUsablePageHeight(dim);
    if (usableH !== dim.printableHeightPx) {
      throw new Error(`Usable height khi không có header/footer phải bằng printableHeightPx (${dim.printableHeightPx}), thực tế: ${usableH}`);
    }

    // Trường hợp 2: Header và Footer nằm gọn trong lề
    // headerDist = 37.8px, headerH = 20px -> headerBottom = 57.8px <= topMarginPx (~76px) -> không đẩy
    // footerDist = 37.8px, footerH = 20px -> footerBottomSpace = 57.8px <= bottomMarginPx (~76px) -> không cắt
    adapter.headerDom = { innerText: "Header text", offsetHeight: 20 };
    adapter.footerDom = { innerText: "Footer text", offsetHeight: 20 };
    usableH = adapter._getUsablePageHeight(dim);
    if (usableH !== dim.printableHeightPx) {
      throw new Error(`Khi header/footer nằm gọn trong lề, usable height phải giữ nguyên lề (${dim.printableHeightPx}), thực tế: ${usableH}`);
    }

    // Trường hợp 3: Header cao hơn lề, Footer nằm gọn trong lề
    // headerDist = 37.8px, headerH = 60px -> headerBottom = 97.8px > 76px -> đẩy 21.8px
    adapter.headerDom = { innerText: "Cao hon le tren", offsetHeight: 60 };
    adapter.footerDom = { innerText: "Nam trong le duoi", offsetHeight: 20 };
    usableH = adapter._getUsablePageHeight(dim);
    const expectedHeaderExtra = (10 * MM_TO_PX + 60) - topMarginPx;
    if (Math.abs(usableH - (dim.printableHeightPx - expectedHeaderExtra)) > 0.01) {
      throw new Error(`Khi header cao hơn lề, usable height phải giảm đúng headerExtra (${expectedHeaderExtra}), thực tế: ${dim.printableHeightPx - usableH}`);
    }

    // Trường hợp 4: Footer cao hơn lề (như d15), Header nằm gọn trong lề
    // footerDist = 37.8px, footerH = 80px -> footerBottomSpace = 117.8px > 76px -> cắt đáy 41.8px
    adapter.headerDom = { innerText: "Nam trong le", offsetHeight: 20 };
    adapter.footerDom = { innerText: "Footer dai 6 doan", offsetHeight: 80 };
    usableH = adapter._getUsablePageHeight(dim);
    const expectedFooterExtra = (10 * MM_TO_PX + 80) - bottomMarginPx;
    if (Math.abs(usableH - (dim.printableHeightPx - expectedFooterExtra)) > 0.01) {
      throw new Error(`Khi footer cao hơn lề, usable height phải giảm đúng footerExtra (${expectedFooterExtra}), thực tế: ${dim.printableHeightPx - usableH}`);
    }

    // Trường hợp 5: Cả Header và Footer đều cao hơn lề
    adapter.headerDom = { innerText: "Header cao", offsetHeight: 60 };
    adapter.footerDom = { innerText: "Footer cao", offsetHeight: 80 };
    usableH = adapter._getUsablePageHeight(dim);
    if (Math.abs(usableH - (dim.printableHeightPx - expectedHeaderExtra - expectedFooterExtra)) > 0.01) {
      throw new Error(`Khi cả header và footer cao hơn lề, usable height phải trừ cả 2 extra, thực tế: ${usableH}`);
    }
  });

  test("W23b: _recomputeLivePagination cập nhật marginTop và marginBottom của bodyDom theo Word rule", () => {
    const adapter = new WriterAdapter(null);
    adapter.pageSetup = {
      size: "a4",
      orientation: "portrait",
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      headerDistanceMm: 10,
      footerDistanceMm: 10
    };

    const mockBodyStyle = { marginTop: "", marginBottom: "" };
    adapter.bodyDom = {
      style: mockBodyStyle,
      children: [],
      querySelectorAll: () => [],
      insertBefore: () => {},
      dispatchEvent: () => {}
    };

    const origDoc = globalThis.document;
    globalThis.document = {
      createElement: () => ({ setAttribute: () => {}, className: "" })
    };
    try {
      // Header 20px (nằm trong lề), Footer 20px (nằm trong lề) -> marginTop = "0", marginBottom = "0"
      adapter.headerDom = { innerText: "Header", offsetHeight: 20 };
      adapter.footerDom = { innerText: "Footer", offsetHeight: 20 };
      adapter._recomputeLivePagination();
      if (mockBodyStyle.marginTop !== "0") {
        throw new Error(`marginTop phải là "0" khi header trong lề, thực tế: ${mockBodyStyle.marginTop}`);
      }
      if (mockBodyStyle.marginBottom !== "0") {
        throw new Error(`marginBottom phải là "0" khi footer trong lề, thực tế: ${mockBodyStyle.marginBottom}`);
      }

      // Header 60px (cao hơn lề), Footer 80px (cao hơn lề) -> marginTop > 0, marginBottom > 0
      adapter.headerDom = { innerText: "Header", offsetHeight: 60 };
      adapter.footerDom = { innerText: "Footer", offsetHeight: 80 };
      adapter._recomputeLivePagination();
      if (!mockBodyStyle.marginTop || mockBodyStyle.marginTop === "0") {
        throw new Error(`marginTop phải > 0 khi header vượt lề, thực tế: ${mockBodyStyle.marginTop}`);
      }
      if (!mockBodyStyle.marginBottom || mockBodyStyle.marginBottom === "0") {
        throw new Error(`marginBottom phải > 0 khi footer vượt lề, thực tế: ${mockBodyStyle.marginBottom}`);
      }
    } finally {
      globalThis.document = origDoc;
    }
  });

  // Đo R16/d07: 20 bảng trải ≥ 2 trang Word trong 10 file; d07 <ul> 2 mục bị đẩy cả khối. Word cắt giữa hàng / giữa mục.
  test("D23: live pagination uses the page margins of each section", () => {
    const adapter = new WriterAdapter(null);
    adapter.pageSetup = { size: "custom", widthMm: 147, heightMm: 213, orientation: "portrait", margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 } };
    adapter.sectionPageSetups = { "section-1": adapter.pageSetup, "section-2": { ...adapter.pageSetup, margins: { top: 5.7, right: 25.4, bottom: 5.7, left: 25.4 } } };
    const mk = (tag, top, height, sectionId = "") => ({ tagName: tag, textContent: tag === "DIV" ? "Ngắt mục (Trang tiếp theo)" : "x", offsetTop: top, offsetHeight: height, children: [], parentNode: null, classList: { contains: name => name === "vno-section-break" && tag === "DIV" }, getAttribute: name => name === "style" ? "" : name === "data-vno-section-id" ? sectionId : null, getBoundingClientRect: () => ({ top, height }), querySelectorAll: () => [] });
    const first = mk("P", 0, 500), marker = mk("DIV", 500, 0, "section-2"), second = mk("P", 520, 600), third = mk("P", 1120, 100);
    const inserted = [];
    const body = { style: {}, children: [first, marker, second, third], scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }), querySelectorAll: () => [], insertBefore: (gap, ref) => inserted.push(ref), dispatchEvent: () => {} };
    for (const el of body.children) el.parentNode = body;
    adapter.bodyDom = body;
    adapter.headerDom = { innerText: "", offsetHeight: 0 };
    adapter.footerDom = { innerText: "", offsetHeight: 0 };
    adapter._alignPageRelativeFloats = () => {};
    adapter._bleedInnerPageGaps = () => {};
    const heights = [];
    const getUsable = adapter._getUsablePageHeight.bind(adapter);
    adapter._getUsablePageHeight = dim => { const value = getUsable(dim); heights.push({ value, margins: { ...adapter.pageSetup.margins } }); return value; };
    const origDoc = globalThis.document, origWin = globalThis.window;
    globalThis.document = { createElement: tag => ({ tagName: tag.toUpperCase(), setAttribute() {}, classList: { add() {} } }) };
    globalThis.window = { getComputedStyle: () => ({ marginTop: "0px", lineHeight: "normal", fontSize: "16px" }) };
    try {
      adapter._recomputeLivePagination();
      if (adapter._livePageCount !== 2 || inserted.includes(third)) throw new Error(`Section 2 margin should fit 700px on one page; pages=${adapter._livePageCount}, gaps=${inserted.length}, heights=${JSON.stringify(heights)}`);
      if (adapter.pageSetup !== adapter.sectionPageSetups["section-1"]) throw new Error("Pagination did not restore the original page setup");
    } finally { globalThis.document = origDoc; globalThis.window = origWin; }
  });

  test("D25c: imported section markers do not add a blank spacer paragraph", () => {
    const adapter = new WriterAdapter(null);
    adapter._extractSectionsFromOoxml = () => ({
      sections: [
        { id: "section-1", type: "nextPage" },
        { id: "section-2", type: "nextPage" }
      ],
      sectionPageSetups: {},
      sectionHeadersFooters: {}
    });
    const documentXml = '<w:document><w:body>'
      + '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/></w:sectPr></w:pPr></w:p>'
      + '<w:sectPr/></w:body></w:document>';
    const imported = adapter._normalizeImportedHtml(
      '<html><body><p style="page-break-before: always; break-before: page"><span>Image anchor carrier</span></p><p>After section</p></body></html>',
      documentXml
    );
    const markerAt = imported.body.indexOf('data-vno-section-id="section-2"');
    if (markerAt < 0) throw new Error("Imported section marker was not inserted");
    const afterMarker = imported.body.slice(markerAt);
    if (/<\/div>\s*<p>\s*<br\s*\/?\s*>\s*<\/p>/i.test(afterMarker)) {
      throw new Error("Imported section marker still creates a synthetic blank spacer");
    }
    if (!/<\/div>\s*<p\b[^>]*>\s*<span>Image anchor carrier<\/span>/i.test(afterMarker)) {
      throw new Error("The original page-break paragraph was not preserved directly after the marker");
    }
  });

  test("W24a: bảng và danh sách cao hơn trang được cắt theo hàng/mục (gap tr/li), khối thường vẫn đẩy nguyên", () => {
    const check = (value, message) => { if (!value) throw new Error(message); };
    const adapter = new WriterAdapter(null);
    adapter.pageSetup = { size: "a4", orientation: "portrait", margins: { top: 20, right: 20, bottom: 20, left: 20 }, headerDistanceMm: 10, footerDistanceMm: 10 };
    adapter.headerDom = { innerText: "", offsetHeight: 0 };
    adapter.footerDom = { innerText: "", offsetHeight: 0 };
    adapter._getUsablePageHeight = () => 1000;
    const inserted = [];
    const mk = (tag, top, h, extra = {}) => {
      const el = { tagName: tag, offsetTop: top, offsetHeight: h, children: [], cells: extra.cells || [], parentNode: null,
        getBoundingClientRect: () => ({ top }), getAttribute: (n) => (n === "style" ? "" : null), textContent: "", classList: { contains: () => false },
        querySelectorAll: () => [], ...extra };
      el.parentNode = { insertBefore: (gap, ref) => inserted.push({ gap: gap.tagName, before: ref }) };
      return el;
    };
    const rows = [mk("TR", 900, 300, { cells: [1, 2] }), mk("TR", 1200, 300, { cells: [1, 2] }), mk("TR", 1500, 300, { cells: [1, 2] }), mk("TR", 1800, 300, { cells: [1, 2] })];
    const table = mk("TABLE", 900, 1200, { querySelectorAll: () => rows });
    const items = [mk("LI", 2100, 400), mk("LI", 2500, 400), mk("LI", 2900, 400)];
    const list = mk("UL", 2100, 1200, { children: items });
    const para = mk("P", 0, 900);
    const tall = mk("P", 3300, 1500);
    const bodyDom = { style: {}, children: [para, table, list, tall], querySelectorAll: () => [], insertBefore: (gap, ref) => inserted.push({ gap: gap.tagName, before: ref }), dispatchEvent: () => {}, getBoundingClientRect: () => ({ top: 0 }), scrollTop: 0 };
    adapter.bodyDom = bodyDom;
    for (const el of [para, table, list, tall]) el.parentNode = bodyDom;
    const origDoc = globalThis.document; const origWin = globalThis.window;
    globalThis.document = { createElement: (tag) => ({ tagName: tag.toUpperCase(), setAttribute() {}, appendChild() {}, className: "" }) };
    globalThis.window = { getComputedStyle: () => ({ marginTop: "0px" }) };
    try {
      adapter._alignPageRelativeFloats = () => {};
      adapter._recomputeLivePagination();
      const seq = inserted.map(x => `${x.gap}@${x.before.tagName}:${x.before.offsetTop}`);
      const expected = ["TR@TR:1200", "TR@TR:2100", "LI@LI:2500", "LI@LI:3300", "DIV@P:3300"];
      // Trang 1: para 0–900 + hàng 1 (900–1200) vừa 1000? không (1200 > 1000) → gap trước hàng 2? Hàng 1 kết thúc 1200 > 1000 → đẩy cả bảng?
      // Quy tắc: đơn vị đầu (hàng 1) không vừa → gap trước bảng (khối), rồi các hàng tiếp theo cắt theo trang 1000px từ 900.
      check(inserted.length > 0, "phải chèn gap");
      check(seq.some(s => s.startsWith("TR@TR")), `phải có gap giữa các hàng bảng: ${seq.join(", ")}`);
      check(seq.some(s => s.startsWith("LI@LI")), `phải có gap giữa các mục danh sách: ${seq.join(", ")}`);
      check(seq.some(s => s === "DIV@P:3300"), `khối P cao 1500 vẫn được đẩy nguyên khối bằng gap div: ${seq.join(", ")}`);
      check(!seq.some(s => s.startsWith("DIV@TABLE") && seq.filter(x => x.startsWith("TR@")).length === 0), "bảng không được coi là khối nguyên tử khi có hàng");
      void expected;
    } finally {
      globalThis.document = origDoc; globalThis.window = origWin;
    }
  });

  // Đo d15 (Word COM): style Footer sz=24 (12pt, basedOn Normal không sz, docDefaults 28 = 14pt); canvas dùng
  // --vno-doc-font-size 14pt cho đoạn rỗng footer → footer 124px so với Word 98,5px.
  test("W23c: _headerFooterFontSizesFromStyles lấy cỡ style Header/Footer theo chuỗi basedOn rồi docDefaults", () => {
    const adapter = new WriterAdapter(null);
    const styles = '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="28"/></w:rPr></w:rPrDefault></w:docDefaults>'
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:szCs w:val="24"/></w:rPr></w:style>'
      + '<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs/></w:pPr></w:style>'
      + '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:rPr><w:bCs w:val="0"/><w:sz w:val="24"/></w:rPr></w:style>'
      + '</w:styles>';
    const sizes = adapter._headerFooterFontSizesFromStyles(styles);
    if (sizes.footer !== "12pt") throw new Error(`Footer sz=24 phải là 12pt, thực tế: ${sizes.footer}`);
    if (sizes.header !== "14pt") throw new Error(`Header không có sz → docDefaults 28 = 14pt, thực tế: ${sizes.header}`);
    const none = adapter._headerFooterFontSizesFromStyles('<w:styles><w:style w:styleId="Normal"/></w:styles>');
    if (none.header !== undefined || none.footer !== undefined) throw new Error("Không có style Header/Footer thì không đặt cỡ vùng");
  });

  test("W26b: _normalizeImportedHeaderFooterHtml chuẩn hóa cỡ chữ đoạn rỗng theo cỡ dấu đoạn từ ooxmlZoneXml", () => {
    const adapter = new WriterAdapter(null);
    const styles = '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="28"/></w:rPr></w:rPrDefault></w:docDefaults>'
      + '<w:style w:styleId="Footer"><w:rPr><w:sz w:val="24"/></w:rPr></w:style>'
      + '</w:styles>';
    const footerXml = '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      + '<w:p><w:pPr><w:pStyle w:val="Footer"/><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr></w:p>' // empty 10pt
      + '<w:p><w:r><w:t>Đoạn có chữ</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr></w:p>' // empty 12pt (Footer style fallback)
      + '</w:ftr>';
    const html = '<p style="line-height: 100%; margin-top: 1.8cm; margin-bottom: 0cm"><br/></p>'
      + '<p style="line-height: 100%; margin-bottom: 0cm">Đoạn có chữ</p>'
      + '<p style="line-height: 100%; margin-bottom: 0cm"><br/></p>';
    const out = adapter._normalizeImportedHeaderFooterHtml(html, "footer", "", footerXml, styles);
    if (!out.includes('font-size: 10pt')) throw new Error(`Đoạn rỗng 1 có sz=20 phải nhận font-size: 10pt, thực tế: ${out}`);
    if (!out.includes('font-size: 12pt')) throw new Error(`Đoạn rỗng 3 thừa kế style Footer sz=24 phải nhận font-size: 12pt, thực tế: ${out}`);
    if (out.includes('font-size: 10pt">Đoạn có chữ') || out.includes('font-size: 12pt">Đoạn có chữ')) {
      throw new Error(`Đoạn có chữ không được thêm font-size: ${out}`);
    }
  });

  return results;
}
