/**
 * Writer Footnotes/Endnotes import fidelity.
 *
 * Fixture: hand-written FODT (ODF text:note footnote + endnote)
 * → soffice --convert-to docx (NOT VN Office serialize).
 *
 * Unlike Track Changes / Comments, StarWriter HTML KEEPS notes as
 * a.sdfootnoteanc / a.sdendnoteanc plus div#sdfootnoteN / #sdendnoteN.
 * The adapter maps those onto VN Writer data-vno-footnote-ref /
 * data-vno-endnote-ref so session UI (renumber, jump, Print Preview) works.
 * No OOXML sidecar / main.py change is required.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-footnotes.docx");
const FODT = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-footnotes.fodt");

const HEADING = "Báo cáo thẩm định dự án thủy lợi Đăk Bla";
const BODY_KENH = "phương án kênh chính";
const BODY_HOIDONG = "trước khi trình hội đồng";
const BODY_HOSO = "hồ sơ gốc phòng Kế hoạch";
const FN1_BODY = "thay thế một số điều của Nghị định 59/2015/NĐ-CP";
const FN2_BODY = "do Bộ Xây dựng ban hành ngày 25/8/2021";
const EN1_BODY = "bảng khối lượng đào đắp Đăk Bla";
const FN1_CITE = "Nghị định 15/2021/NĐ-CP";
const FN2_CITE = "Thông tư 10/2021/TT-BXD";

/**
 * Captured from LibreOffice HTML (StarWriter) of the fixture DOCX
 * (LibreOffice 26.2.5.2). Has sdfootnoteanc / sdendnoteanc — not flattened.
 * Note bodies are line-wrapped (StarWriter inserts breaks between syllables).
 */
const SOFFICE_FOOTNOTES_HTML = `<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8"/>
	<title></title>
	<meta name="generator" content="LibreOffice 26.2.5.2 (Windows)"/>
	<style type="text/css">
		@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
		p { orphans: 0; color: #000000; direction: ltr; line-height: 115%; text-align: left; widows: 0; margin-bottom: 0.21cm; background: transparent }
		h1.western { font-family: "Times New Roman", serif; font-weight: bold; font-size: 18pt; so-language: en-GB }
		p.sdfootnote-western { font-size: 10pt; text-indent: -0.5cm; margin-left: 0.5cm }
		p.sdendnote-western { font-size: 10pt; text-indent: -0.5cm; margin-left: 0.5cm }
		a.sdfootnoteanc { font-size: 57% }
		a.sdendnoteanc { font-size: 57% }
	</style>
</head>
<body lang="en-GB" text="#000000" link="#000080" vlink="#800000" dir="ltr">
<ol><li><h1 class="western" align="left">Báo cáo thẩm định dự
	án thủy lợi Đăk Bla</h1></li>
</ol>
<p class="western" align="left" style="line-height: 115%">Căn cứ
Nghị định 15/2021/NĐ-CP<a class="sdfootnoteanc" name="sdfootnote1anc" href="#sdfootnote1sym"><sup>1</sup></a>
về quản lý đầu tư xây dựng, đơn vị đề xuất
phương án kênh chính.</p>
<p class="western" align="left" style="line-height: 115%">Tổng mức
đầu tư được thẩm định theo Thông tư 10/2021/TT-BXD<a class="sdfootnoteanc" name="sdfootnote2anc" href="#sdfootnote2sym"><sup>2</sup></a>
trước khi trình hội đồng.</p>
<p class="western" align="left" style="line-height: 115%">Kết luận
kèm phụ lục kỹ thuật<a class="sdendnoteanc" name="sdendnote1anc" href="#sdendnote1sym"><sup>i</sup></a>
được lưu tại hồ sơ gốc phòng Kế hoạch.</p>
<div id="sdfootnote1"><p class="sdfootnote-western" align="left"><a class="sdfootnotesym" name="sdfootnote1sym" href="#sdfootnote1anc">1</a>	Nghị
	định này có hiệu lực từ ngày 03 tháng 3 năm 2021, thay
	thế một số điều của Nghị định 59/2015/NĐ-CP.</p>
</div>
<div id="sdfootnote2"><p class="sdfootnote-western" align="left"><a class="sdfootnotesym" name="sdfootnote2sym" href="#sdfootnote2anc">2</a>	Thông
	tư hướng dẫn xác định chi phí đầu tư xây dựng do
	Bộ Xây dựng ban hành ngày 25/8/2021.</p>
</div>
<div id="sdendnote1"><p class="sdendnote-western" align="left"><a class="sdendnotesym" name="sdendnote1sym" href="#sdendnote1anc">i</a>	Phụ
	lục kỹ thuật gồm bản vẽ mặt cắt ngang kênh và bảng
	khối lượng đào đắp Đăk Bla.</p>
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
  if (!xml) throw new Error(`${entryName} missing from sample-writer-footnotes.docx`);
  return xml.toString("utf8");
}

function collapseWs(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function plainText(html) {
  return collapseWs(String(html || "").replace(/<[^>]+>/g, " "));
}

export async function runWriterFootnotesImportTests() {
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

  test("Fixture độc lập VN Office: FODT có text:note, DOCX có word/footnotes.xml + endnotes.xml", () => {
    if (!fs.existsSync(FODT)) throw new Error("Thiếu sample-writer-footnotes.fodt");
    if (!fs.existsSync(DOCX)) throw new Error("Thiếu sample-writer-footnotes.docx");
    const fodt = fs.readFileSync(FODT, "utf8");
    if (!fodt.includes('text:note-class="footnote"') || !fodt.includes('text:note-class="endnote"')) {
      throw new Error("FODT không còn ODF text:note viết tay");
    }
    if (!fodt.includes("<text:note-citation>") || !fodt.includes("<text:note-body>")) {
      throw new Error("FODT mất citation/body của note");
    }
    if (!fodt.includes(FN1_BODY) || !fodt.includes(FN2_BODY) || !fodt.includes(EN1_BODY)) {
      throw new Error("FODT mất nội dung footnote/endnote");
    }
    if (fodt.includes("serializeTo") || fodt.includes("data-vno-footnote") || fodt.includes("sdfootnoteanc")) {
      throw new Error("FODT trông như output VN Office / StarWriter, không phải fixture viết tay");
    }
    if (!fodt.includes(BODY_KENH) || !fodt.includes(HEADING)) {
      throw new Error("FODT mất nội dung thân trang");
    }

    const names = listZipEntries(DOCX).map((entry) => entry.name.replaceAll("\\", "/"));
    if (!names.includes("word/footnotes.xml")) throw new Error(`Thiếu word/footnotes.xml: ${names.join(", ")}`);
    if (!names.includes("word/endnotes.xml")) throw new Error(`Thiếu word/endnotes.xml: ${names.join(", ")}`);

    const documentXml = readFixtureXml("word/document.xml");
    const footnotesXml = readFixtureXml("word/footnotes.xml");
    const endnotesXml = readFixtureXml("word/endnotes.xml");

    if (!documentXml.includes("w:footnoteReference") || !documentXml.includes("w:endnoteReference")) {
      throw new Error("word/document.xml thiếu footnoteReference/endnoteReference");
    }
    if (documentXml.includes(FN1_BODY) || documentXml.includes(FN2_BODY) || documentXml.includes(EN1_BODY)) {
      throw new Error("Nội dung note bị nhét vào word/document.xml — không còn part riêng");
    }
    if (!documentXml.includes(FN1_CITE) || !documentXml.includes(FN2_CITE) || !documentXml.includes(BODY_KENH)) {
      throw new Error("word/document.xml mất thân trang / vị trí neo");
    }
    if (!footnotesXml.includes("<w:footnotes") || !footnotesXml.includes(FN1_BODY) || !footnotesXml.includes(FN2_BODY)) {
      throw new Error(`word/footnotes.xml mất nội dung footnote: ${footnotesXml.slice(0, 400)}`);
    }
    if (footnotesXml.includes(EN1_BODY) || footnotesXml.includes(HEADING)) {
      throw new Error("word/footnotes.xml lẫn endnote/thân trang");
    }
    if (!endnotesXml.includes("<w:endnotes") || !endnotesXml.includes(EN1_BODY)) {
      throw new Error(`word/endnotes.xml mất nội dung endnote: ${endnotesXml.slice(0, 400)}`);
    }
    if (endnotesXml.includes(FN1_BODY) || endnotesXml.includes(FN2_BODY) || endnotesXml.includes(BODY_KENH)) {
      throw new Error("word/endnotes.xml lẫn footnote/thân trang");
    }
  });

  test("StarWriter HTML hiện trạng: CÒN sdfootnoteanc/sdendnoteanc (không flatten như Track Changes)", () => {
    if (!/class=["']sdfootnoteanc["']/i.test(SOFFICE_FOOTNOTES_HTML)) {
      throw new Error("Snapshot HTML mất a.sdfootnoteanc — giả định đo đã đổi");
    }
    if (!/class=["']sdendnoteanc["']/i.test(SOFFICE_FOOTNOTES_HTML)) {
      throw new Error("Snapshot HTML mất a.sdendnoteanc — giả định đo đã đổi");
    }
    if (!/id=["']sdfootnote1["']/i.test(SOFFICE_FOOTNOTES_HTML) || !/id=["']sdfootnote2["']/i.test(SOFFICE_FOOTNOTES_HTML)) {
      throw new Error("Snapshot HTML mất div#sdfootnoteN");
    }
    if (!/id=["']sdendnote1["']/i.test(SOFFICE_FOOTNOTES_HTML)) {
      throw new Error("Snapshot HTML mất div#sdendnote1");
    }
    if (/data-vno-footnote/i.test(SOFFICE_FOOTNOTES_HTML) || /data-vno-endnote/i.test(SOFFICE_FOOTNOTES_HTML)) {
      throw new Error("Snapshot HTML đã là markup VN Writer — không phải StarWriter thô");
    }
    const collapsed = collapseWs(SOFFICE_FOOTNOTES_HTML);
    if (!collapsed.includes(FN1_BODY) || !collapsed.includes(FN2_BODY) || !collapsed.includes(EN1_BODY)) {
      throw new Error("Snapshot HTML mất nội dung note (kể cả khi StarWriter ngắt dòng)");
    }
    if (!collapsed.includes(BODY_KENH) || !collapsed.includes(BODY_HOIDONG) || !collapsed.includes(BODY_HOSO)) {
      throw new Error("Snapshot HTML mất thân trang");
    }
  });

  test("Adapter map StarWriter notes sang data-vno-footnote/endnote, không bịa khi HTML sạch", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_FOOTNOTES_HTML);
    const body = imported.body;
    const text = plainText(body);

    if (!/data-vno-footnote-ref=["']fn-import-1["']/i.test(body) || !/data-vno-footnote-ref=["']fn-import-2["']/i.test(body)) {
      throw new Error(`Mất sup footnote VN: ${body.slice(0, 500)}`);
    }
    if (!/data-vno-endnote-ref=["']en-import-1["']/i.test(body)) {
      throw new Error(`Mất sup endnote VN: ${body.slice(0, 500)}`);
    }
    if (!/data-vno-footnotes=["']true["']/i.test(body) || !/data-vno-endnotes=["']true["']/i.test(body)) {
      throw new Error("Mất container footnotes/endnotes VN");
    }
    if (/sdfootnoteanc/i.test(body) || /sdendnoteanc/i.test(body)) {
      throw new Error("Còn class StarWriter sau normalize");
    }
    if (/id=["']sdfootnote/i.test(body) || /id=["']sdendnote/i.test(body)) {
      throw new Error("Còn div#sdfootnoteN / #sdendnoteN sau normalize");
    }
    if (!text.includes(FN1_BODY) || !text.includes(FN2_BODY) || !text.includes(EN1_BODY)) {
      throw new Error(`Mất nội dung note sau normalize: ${text}`);
    }
    if (!text.includes(BODY_KENH) || !text.includes(BODY_HOIDONG) || !text.includes(BODY_HOSO)) {
      throw new Error(`Mất thân trang sau normalize: ${text}`);
    }
    if (!/<h1\b/i.test(body) || /<ol\b/i.test(body)) {
      throw new Error(`Heading 1 không được gỡ list: ${body.slice(0, 180)}`);
    }
    if (!/CHÚ THÍCH CUỐI TÀI LIỆU/.test(body)) {
      throw new Error("Mất tiêu đề endnotes");
    }
    const fnItems = body.match(/class=["']vno-footnote-item["']/gi) || [];
    const enItems = body.match(/class=["']vno-endnote-item["']/gi) || [];
    if (fnItems.length !== 2) throw new Error(`Kỳ vọng 2 footnote items, được ${fnItems.length}`);
    if (enItems.length !== 1) throw new Error(`Kỳ vọng 1 endnote item, được ${enItems.length}`);

    const empty = new WriterAdapter(null)._normalizeImportedHtml(
      `<!DOCTYPE html><html><body><p>${BODY_KENH}</p></body></html>`
    );
    if (/data-vno-footnote/i.test(empty.body) || /data-vno-endnote/i.test(empty.body)) {
      throw new Error(`Bịa footnote/endnote khi HTML không có note: ${empty.body}`);
    }
    if (!empty.body.includes(BODY_KENH)) throw new Error("Mất body khi HTML không có note");
  });

  await asyncTest("adapter.open() nạp DOCX thật qua stub bridge: notes thành markup VN, thân trang còn", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_FOOTNOTES_HTML,
      fileName: "sample-writer-footnotes.docx"
    });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (body.innerHTML.includes("<html") || body.innerHTML.includes("<!DOCTYPE")) {
        throw new Error("open() dump cả tài liệu HTML vào body");
      }
      if (!/data-vno-footnote-ref=["']fn-import-1["']/i.test(body.innerHTML)) {
        throw new Error(`open() không map footnote: ${body.innerHTML.slice(0, 400)}`);
      }
      if (!/data-vno-endnote-ref=["']en-import-1["']/i.test(body.innerHTML)) {
        throw new Error(`open() không map endnote: ${body.innerHTML.slice(0, 400)}`);
      }
      if (/sdfootnoteanc/i.test(body.innerHTML) || /id=["']sdfootnote/i.test(body.innerHTML)) {
        throw new Error("open() còn markup StarWriter");
      }
      const text = plainText(body.innerHTML);
      if (!text.includes(FN1_BODY) || !text.includes(FN2_BODY) || !text.includes(EN1_BODY)) {
        throw new Error(`open() mất nội dung note: ${text}`);
      }
      if (!text.includes(BODY_KENH) || !/<h1\b/i.test(body.innerHTML)) {
        throw new Error("open() mất thân trang / heading");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  test("Print Preview nhận id/text từ markup import (chân trang theo ref, endnote trang cuối)", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_FOOTNOTES_HTML);
    const adapter = new WriterAdapter(null);
    const footnotes = new Map();
    const endnotes = new Map();
    const fnItemRe = /data-vno-footnote-id=["']([^"']+)["'][\s\S]*?vno-note-num[^>]*>([\s\S]*?)<\/span>[\s\S]*?vno-note-text[^>]*>([\s\S]*?)<\/span>/gi;
    let match;
    while ((match = fnItemRe.exec(imported.body))) {
      footnotes.set(match[1], { id: match[1], num: collapseWs(match[2]), textHtml: match[3] });
    }
    const enItemRe = /data-vno-endnote-id=["']([^"']+)["'][\s\S]*?vno-note-num[^>]*>([\s\S]*?)<\/span>[\s\S]*?vno-note-text[^>]*>([\s\S]*?)<\/span>/gi;
    while ((match = enItemRe.exec(imported.body))) {
      endnotes.set(match[1], { id: match[1], num: collapseWs(match[2]), textHtml: match[3] });
    }
    if (footnotes.size !== 2) throw new Error(`Không parse được 2 footnote items: ${footnotes.size}`);
    if (endnotes.size !== 1) throw new Error(`Không parse được 1 endnote item: ${endnotes.size}`);
    if (!String(footnotes.get("fn-import-1")?.textHtml || "").includes(FN1_BODY)) {
      throw new Error(`FN1 lệch: ${footnotes.get("fn-import-1")?.textHtml}`);
    }
    if (!String(footnotes.get("fn-import-2")?.textHtml || "").includes(FN2_BODY)) {
      throw new Error(`FN2 lệch: ${footnotes.get("fn-import-2")?.textHtml}`);
    }
    if (!String(endnotes.get("en-import-1")?.textHtml || "").includes(EN1_BODY)) {
      throw new Error(`EN1 lệch: ${endnotes.get("en-import-1")?.textHtml}`);
    }

    const pageFoot = adapter._renderPageFootnotesForPreview(imported.body, footnotes);
    if (!pageFoot.includes(FN1_BODY) || !pageFoot.includes(FN2_BODY)) {
      throw new Error(`_renderPageFootnotesForPreview thiếu note: ${pageFoot}`);
    }
    const endHtml = adapter._renderEndnotesForPreview(endnotes);
    if (!endHtml.includes(EN1_BODY)) {
      throw new Error(`_renderEndnotesForPreview thiếu endnote: ${endHtml}`);
    }
  });

  return results;
}
