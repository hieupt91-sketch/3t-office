/**
 * Writer Track Changes import fidelity.
 *
 * Fixture: hand-written FODT → soffice --convert-to docx (NOT VN Office serialize).
 * StarWriter HTML flattens w:ins/w:del; the adapter overlays OOXML from the same .docx.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-trackchanges.docx");
const FODT = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-trackchanges.fodt");

/** Captured from LibreOffice HTML (StarWriter) of the fixture DOCX — no <ins>/<del>. */
const SOFFICE_TRACKCHANGES_HTML = `<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8"/>
	<style type="text/css">
		@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
		h1.western { font-weight: bold; font-size: 18pt }
	</style>
</head>
<body lang="en-GB" dir="ltr">
<ol><li><h1 class="western" align="left">Biên bản rà soát ngân
	sách quý III</h1></li>
</ol>
<p class="western" align="left" style="line-height: 115%">Kính gửi
Ban Giám đốc. Phòng kế toán đã hoàn thành bản nháp nội
bộ theo yêu cầu khẩn báo cáo quý III.</p>
<p class="western" align="left" style="line-height: 115%; margin-bottom: 0cm">
Người lập: Nguyễn Thị Bình. Ngày lập: 05/09/2026.</p>
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

function readFixtureOoxml() {
  const xml = readZipEntry(DOCX, "word/document.xml");
  if (!xml) throw new Error("word/document.xml missing from sample-writer-trackchanges.docx");
  return xml.toString("utf8");
}

export async function runWriterTrackChangesImportTests() {
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

  test("Fixture độc lập VN Office: FODT viết tay có tracked-changes, DOCX có w:ins/w:del", () => {
    if (!fs.existsSync(FODT)) throw new Error("Thiếu sample-writer-trackchanges.fodt");
    if (!fs.existsSync(DOCX)) throw new Error("Thiếu sample-writer-trackchanges.docx");
    const fodt = fs.readFileSync(FODT, "utf8");
    if (!fodt.includes("<text:tracked-changes") || !fodt.includes("theo yêu cầu khẩn") || !fodt.includes("bản nháp nội bộ")) {
      throw new Error("FODT không còn ODF Track Changes viết tay");
    }
    if (fodt.includes("serializeTo") || fodt.includes("data-vno-change")) {
      throw new Error("FODT trông như output VN Office, không phải fixture viết tay");
    }
    const xml = readFixtureOoxml();
    if (!xml.includes("<w:ins") || !xml.includes("<w:del") || !xml.includes("w:author=\"Nguyen Van An\"")) {
      throw new Error("DOCX soffice không giữ native OOXML Track Changes");
    }
    if (!xml.includes("theo yêu cầu khẩn") || !xml.includes("bản nháp nội bộ")) {
      throw new Error("DOCX mất nội dung insertion/deletion");
    }
  });

  test("StarWriter HTML flatten: không có ins/del, không có tên người sửa", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_TRACKCHANGES_HTML);
    if (/<(ins|del)\b/i.test(imported.body)) {
      throw new Error("HTML snapshot bất ngờ còn ins/del — không còn phản ánh filter StarWriter");
    }
    if (imported.body.includes("Nguyen Van An")) {
      throw new Error("HTML flatten vẫn còn author");
    }
    if (!/theo\s+yêu\s+cầu\s+khẩn/i.test(imported.body) || !/bản\s+nháp\s+nội\s+bộ/i.test(imported.body)) {
      throw new Error(`HTML flatten mất chữ: ${imported.body.slice(0, 240)}`);
    }
  });

  test("Overlay OOXML: insertion xanh/gạch chân, deletion đỏ/gạch ngang, giữ author", () => {
    const xml = readFixtureOoxml();
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_TRACKCHANGES_HTML, xml);
    const insert = imported.body.match(/<ins\b([^>]*)>([\s\S]*?)<\/ins>/i);
    const deletion = imported.body.match(/<del\b([^>]*)>([\s\S]*?)<\/del>/i);
    if (!insert) throw new Error(`Thiếu insertion: ${imported.body}`);
    if (!deletion) throw new Error(`Thiếu deletion: ${imported.body}`);
    if (!/data-vno-change="insert"/i.test(insert[1])) throw new Error(`ins thiếu marker: ${insert[0]}`);
    if (!/data-vno-change="delete"/i.test(deletion[1])) throw new Error(`del thiếu marker: ${deletion[0]}`);
    if (!/theo\s+yêu\s+cầu\s+khẩn/i.test(insert[2])) throw new Error(`Sai chữ insertion: ${insert[2]}`);
    if (!/bản\s+nháp\s+nội\s+bộ/i.test(deletion[2])) throw new Error(`Sai chữ deletion: ${deletion[2]}`);
    if (!insert[1].includes("Nguyen Van An") || !deletion[1].includes("Nguyen Van An")) {
      throw new Error("Mất tên người sửa trên ins/del");
    }
    if (!/contenteditable="false"/i.test(deletion[1])) {
      throw new Error("Deletion import thiếu contenteditable=false");
    }
  });

  await asyncTest("adapter.open() nạp DOCX thật qua stub bridge: body có ins/del đúng chữ", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_TRACKCHANGES_HTML,
      fileName: "sample-writer-trackchanges.docx",
      ooxmlDocumentXml: readFixtureOoxml()
    });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (body.innerHTML.includes("<html") || body.innerHTML.includes("<!DOCTYPE")) {
        throw new Error("open() dump cả tài liệu HTML vào body");
      }
      if (!/<h1\b/i.test(body.innerHTML) || /<ol\b/i.test(body.innerHTML)) {
        throw new Error(`Heading 1 không được gỡ list: ${body.innerHTML.slice(0, 180)}`);
      }
      if (!/<ins\b[^>]*data-vno-change="insert"[^>]*>[\s\S]*theo\s+yêu\s+cầu\s+khẩn[\s\S]*<\/ins>/i.test(body.innerHTML)) {
        throw new Error(`open() không gắn insertion: ${body.innerHTML}`);
      }
      if (!/<del\b[^>]*data-vno-change="delete"[^>]*>[\s\S]*bản\s+nháp\s+nội\s+bộ[\s\S]*<\/del>/i.test(body.innerHTML)) {
        throw new Error(`open() không gắn deletion: ${body.innerHTML}`);
      }
      if (!body.innerHTML.includes("Nguyen Van An")) {
        throw new Error("open() mất author");
      }
      if (!body.innerHTML.includes("Người lập: Nguyễn Thị Bình")) {
        throw new Error("open() mất đoạn văn không sửa");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  await asyncTest("adapter.open() chỉ có HTML StarWriter: mất markup Track Changes", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_TRACKCHANGES_HTML,
      fileName: "sample-writer-trackchanges.docx"
    });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (/<(ins|del)\b/i.test(body.innerHTML)) {
        throw new Error("Không có OOXML mà vẫn bịa ins/del");
      }
      if (!/theo\s+yêu\s+cầu\s+khẩn/i.test(body.innerHTML) || !/bản\s+nháp\s+nội\s+bộ/i.test(body.innerHTML)) {
        throw new Error("Mất chữ khi flatten");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  test("HTML ins/del sẵn có được nâng lên marker VN Writer", () => {
    const html = `<body><p>Gốc <ins title="Lan">mới</ins><del>cũ</del></p></body>`;
    const imported = new WriterAdapter(null)._normalizeImportedHtml(html);
    if (!/<ins\b[^>]*data-vno-change="insert"[^>]*>mới<\/ins>/i.test(imported.body)) {
      throw new Error(`ins không được upgrade: ${imported.body}`);
    }
    if (!/<del\b[^>]*data-vno-change="delete"[^>]*contenteditable="false"[^>]*>cũ<\/del>/i.test(imported.body)
      && !/<del\b[^>]*contenteditable="false"[^>]*data-vno-change="delete"[^>]*>cũ<\/del>/i.test(imported.body)) {
      throw new Error(`del không được upgrade: ${imported.body}`);
    }
    if (!imported.body.includes("data-vno-author=\"Lan\"") && !imported.body.includes('title="Lan"')) {
      throw new Error(`Mất author từ title: ${imported.body}`);
    }
  });

  return results;
}
