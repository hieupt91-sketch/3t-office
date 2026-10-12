/**
 * Writer Comments import fidelity.
 *
 * Fixture: hand-written FODT → soffice --convert-to docx (NOT VN Office serialize).
 * StarWriter HTML flattens comment ranges/authors; the adapter overlays
 * word/document.xml + word/comments.xml from the same .docx.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-comments.docx");
const FODT = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-comments.fodt");

/** Captured from LibreOffice HTML (StarWriter) of the fixture DOCX — no <mark>, authors gone. */
const SOFFICE_COMMENTS_HTML = `<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8"/>
	<style type="text/css">
		@page { size: 21cm 29.7cm; margin-left: 2.5cm; margin-right: 2cm; margin-top: 2cm; margin-bottom: 2cm }
		h1.western { font-weight: bold; font-size: 18pt }
	</style>
</head>
<body lang="en-GB" dir="ltr">
<ol><li><h1 class="western" align="left">Công văn thẩm định dự
	toán năm 2026</h1></li>
</ol>
<p class="western" align="left" style="line-height: 115%">Kính gửi
Ban Giám đốc. Đề nghị phê duyệt dự toán năm 2026<!-- Cần đối chiếu số liệu quý II trước khi trình. -->
theo phương án đã thống nhất.</p>
<p class="western" align="left" style="line-height: 115%">Người
soạn: Lê Văn Cường<!-- Xác nhận chữ ký người soạn. -->.
Ngày soạn: 05/09/2026.</p>
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
  if (!xml) throw new Error(`${entryName} missing from sample-writer-comments.docx`);
  return xml.toString("utf8");
}

export async function runWriterCommentsImportTests() {
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

  test("Fixture độc lập VN Office: FODT viết tay có office:annotation, DOCX có comments.xml", () => {
    if (!fs.existsSync(FODT)) throw new Error("Thiếu sample-writer-comments.fodt");
    if (!fs.existsSync(DOCX)) throw new Error("Thiếu sample-writer-comments.docx");
    const fodt = fs.readFileSync(FODT, "utf8");
    if (!fodt.includes("<office:annotation") || !fodt.includes("Tran Thi Hoa") || !fodt.includes("Pham Minh Duc")) {
      throw new Error("FODT không còn ODF Comments viết tay");
    }
    if (!fodt.includes("Cần đối chiếu số liệu quý II trước khi trình.") || !fodt.includes("Xác nhận chữ ký người soạn.")) {
      throw new Error("FODT mất nội dung ghi chú");
    }
    if (fodt.includes("serializeTo") || fodt.includes("data-comment-id")) {
      throw new Error("FODT trông như output VN Office, không phải fixture viết tay");
    }
    const documentXml = readFixtureXml("word/document.xml");
    const commentsXml = readFixtureXml("word/comments.xml");
    if (!documentXml.includes("w:commentRangeStart") || !documentXml.includes("w:commentReference")) {
      throw new Error("DOCX soffice không giữ native comment range/reference");
    }
    if (!commentsXml.includes('w:author="Tran Thi Hoa"') || !commentsXml.includes('w:author="Pham Minh Duc"')) {
      throw new Error("word/comments.xml mất tên người comment");
    }
    if (!commentsXml.includes("Cần đối chiếu số liệu quý II trước khi trình.") || !commentsXml.includes("Xác nhận chữ ký người soạn.")) {
      throw new Error("word/comments.xml mất nội dung ghi chú");
    }
  });

  test("StarWriter HTML flatten: không có mark, không có tên người comment", () => {
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_COMMENTS_HTML);
    if (/<mark\b/i.test(imported.body)) {
      throw new Error("HTML snapshot bất ngờ còn mark — không còn phản ánh filter StarWriter");
    }
    if (imported.body.includes("Tran Thi Hoa") || imported.body.includes("Pham Minh Duc")) {
      throw new Error("HTML flatten vẫn còn author");
    }
    if (!imported.body.includes("Cần đối chiếu số liệu quý II trước khi trình.")) {
      throw new Error("HTML flatten mất body comment (còn trong HTML comment)");
    }
    if (imported.comments?.length) {
      throw new Error("Không có OOXML mà vẫn bịa comments state");
    }
    if (!/dự\s+toán\s+năm\s+2026/i.test(imported.body) || !/Lê\s+Văn\s+Cường/i.test(imported.body)) {
      throw new Error(`HTML flatten mất chữ neo: ${imported.body.slice(0, 240)}`);
    }
  });

  test("Overlay OOXML: mark đúng neo, giữ nội dung và tên người comment", () => {
    const documentXml = readFixtureXml("word/document.xml");
    const commentsXml = readFixtureXml("word/comments.xml");
    const imported = new WriterAdapter(null)._normalizeImportedHtml(SOFFICE_COMMENTS_HTML, documentXml, commentsXml);
    if (!imported.comments || imported.comments.length !== 2) {
      throw new Error(`Cần 2 comment, nhận ${imported.comments?.length}: ${JSON.stringify(imported.comments)}`);
    }
    const first = imported.comments.find((item) => item.author === "Tran Thi Hoa");
    const second = imported.comments.find((item) => item.author === "Pham Minh Duc");
    if (!first || first.content !== "Cần đối chiếu số liệu quý II trước khi trình.") {
      throw new Error(`Sai comment Tran Thi Hoa: ${JSON.stringify(first)}`);
    }
    if (!/dự toán năm 2026/i.test(first.anchorText)) {
      throw new Error(`Sai neo comment 1: ${first.anchorText}`);
    }
    if (!second || second.content !== "Xác nhận chữ ký người soạn.") {
      throw new Error(`Sai comment Pham Minh Duc: ${JSON.stringify(second)}`);
    }
    if (!/Lê Văn Cường/i.test(second.anchorText)) {
      throw new Error(`Sai neo comment 2: ${second.anchorText}`);
    }

    const marks = [...imported.body.matchAll(/<mark\b([^>]*)>([\s\S]*?)<\/mark>/gi)];
    if (marks.length !== 2) throw new Error(`Cần 2 mark, nhận ${marks.length}: ${imported.body}`);
    const firstMark = marks.find((item) => /dự\s+toán\s+năm\s+2026/i.test(item[2]));
    const secondMark = marks.find((item) => /Lê\s+Văn\s+Cường/i.test(item[2]));
    if (!firstMark) throw new Error(`Không bọc neo dự toán: ${imported.body}`);
    if (!secondMark) throw new Error(`Không bọc neo Lê Văn Cường: ${imported.body}`);
    if (!/class="vno-comment-anchor"/i.test(firstMark[1]) || !/data-comment-id=/i.test(firstMark[1])) {
      throw new Error(`mark thiếu class/id: ${firstMark[0]}`);
    }
    if (!firstMark[1].includes("Tran Thi Hoa") || !secondMark[1].includes("Pham Minh Duc")) {
      throw new Error("Mất tên người comment trên mark");
    }
    if (imported.body.includes("<!--")) {
      throw new Error("Còn HTML comment StarWriter sau overlay");
    }
    const heading = imported.body.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || "";
    if (/<mark\b/i.test(heading)) {
      throw new Error(`Bọc nhầm heading trùng chữ: ${heading}`);
    }
  });

  test("Overlay ODF sidecar: khôi phục comments ODT trên HTML StarWriter", () => {
    const fodt = fs.readFileSync(FODT, "utf8");
    const imported = new WriterAdapter(null)._normalizeImportedHtml(
      SOFFICE_COMMENTS_HTML, undefined, undefined, "", "", "", "", {}, {}, {}, "", "", fodt
    );
    if (imported.comments?.length !== 2) {
      throw new Error(`Cần 2 ODF comments, nhận ${imported.comments?.length}: ${JSON.stringify(imported.comments)}`);
    }
    const first = imported.comments.find(item => item.author === "Tran Thi Hoa");
    const second = imported.comments.find(item => item.author === "Pham Minh Duc");
    if (!first || !/dự toán năm 2026/i.test(first.anchorText) || first.content !== "Cần đối chiếu số liệu quý II trước khi trình.") {
      throw new Error(`Sai ODF comment 1: ${JSON.stringify(first)}`);
    }
    if (!second || !/Lê Văn Cường/i.test(second.anchorText) || second.content !== "Xác nhận chữ ký người soạn.") {
      throw new Error(`Sai ODF comment 2: ${JSON.stringify(second)}`);
    }
    const marks = [...imported.body.matchAll(/<mark\b([^>]*)>([\s\S]*?)<\/mark>/gi)];
    if (marks.length !== 2 || imported.body.includes("<!--")) {
      throw new Error(`ODF comment anchors không được bọc/HTML comment còn sót: ${imported.body}`);
    }
  });

  await asyncTest("adapter.open() nạp DOCX thật qua stub bridge: body có mark + state comment", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_COMMENTS_HTML,
      fileName: "sample-writer-comments.docx",
      ooxmlDocumentXml: readFixtureXml("word/document.xml"),
      ooxmlCommentsXml: readFixtureXml("word/comments.xml")
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
      if (!/<mark\b[^>]*data-comment-id="writer-comment-import-0"[^>]*>[\s\S]*dự\s+toán\s+năm\s+2026[\s\S]*<\/mark>/i.test(body.innerHTML)) {
        throw new Error(`open() không gắn mark neo 1: ${body.innerHTML}`);
      }
      if (!/<mark\b[^>]*data-comment-id="writer-comment-import-1"[^>]*>[\s\S]*Lê\s+Văn\s+Cường[\s\S]*<\/mark>/i.test(body.innerHTML)) {
        throw new Error(`open() không gắn mark neo 2: ${body.innerHTML}`);
      }
      if (adapter.comments.length !== 2) {
        throw new Error(`open() state comments=${adapter.comments.length}`);
      }
      if (!adapter.comments.some((item) => item.author === "Tran Thi Hoa" && item.content.includes("Cần đối chiếu"))) {
        throw new Error(`open() mất comment Tran Thi Hoa: ${JSON.stringify(adapter.comments)}`);
      }
      if (!adapter.comments.some((item) => item.author === "Pham Minh Duc" && item.content.includes("Xác nhận chữ ký"))) {
        throw new Error(`open() mất comment Pham Minh Duc: ${JSON.stringify(adapter.comments)}`);
      }
      if (!body.innerHTML.includes("Kính gửi") || !body.innerHTML.includes("Ngày soạn: 05/09/2026")) {
        throw new Error("open() mất đoạn văn không comment");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  await asyncTest("adapter.open() chỉ có HTML StarWriter: mất comments", async () => {
    const { editor, body } = makeWriterDom();
    const adapter = new WriterAdapter(editor);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_COMMENTS_HTML,
      fileName: "sample-writer-comments.docx"
    });
    try {
      const ok = await adapter.open();
      if (!ok) throw new Error("open() trả về false");
      if (/<mark\b/i.test(body.innerHTML)) {
        throw new Error("Không có OOXML mà vẫn bịa mark comment");
      }
      if (adapter.comments.length !== 0) {
        throw new Error("Không có OOXML mà vẫn bịa comments state");
      }
      if (!/dự\s+toán\s+năm\s+2026/i.test(body.innerHTML) || !/Lê\s+Văn\s+Cường/i.test(body.innerHTML)) {
        throw new Error("Mất chữ khi flatten");
      }
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  return results;
}
