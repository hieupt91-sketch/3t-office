/**
 * Probe (not a suite test): hand-written FODT Footnotes/Endnotes → soffice DOCX
 * → HTML (StarWriter), same path as main.py open_document_dialog.
 * Never uses VN Office serializers.
 *
 * Measures whether StarWriter keeps footnote/endnote markup (sdfootnoteanc /
 * sdendnoteanc / note bodies) or flattens/drops them like Track Changes /
 * Comments. Also inspects native OOXML parts word/footnotes.xml +
 * word/endnotes.xml — separate from word/document.xml.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodt = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-footnotes.fodt");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-footnotes-probe-"));
const profileDir = path.join(tmp, "profile");

const HEADING = "Báo cáo thẩm định dự án thủy lợi Đăk Bla";
const BODY_KENH = "phương án kênh chính";
const BODY_HOIDONG = "trước khi trình hội đồng";
const BODY_HOSO = "hồ sơ gốc phòng Kế hoạch";
const FN1_BODY = "thay thế một số điều của Nghị định 59/2015/NĐ-CP";
const FN2_BODY = "do Bộ Xây dựng ban hành ngày 25/8/2021";
const EN1_BODY = "bảng khối lượng đào đắp Đăk Bla";
const FN1_CITE = "Nghị định 15/2021/NĐ-CP";
const FN2_CITE = "Thông tư 10/2021/TT-BXD";
const EN1_CITE = "phụ lục kỹ thuật";

function dump(label, text, max = 12000) {
  console.log(`\n===== ${label} =====`);
  console.log(text.length > max ? `${text.slice(0, max)}\n… [${text.length} chars]` : text);
}

function extractZip(zipPath, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tar -xf failed: ${result.stderr || result.stdout || ""}`);
}

function reportTokens(label, text, tokens) {
  console.log(`\n--- ${label} ---`);
  for (const token of tokens) {
    const source = token.toLowerCase ? text.toLowerCase() : text;
    const needle = token.toLowerCase ? token.toLowerCase() : token;
    const count = source.split(needle).length - 1;
    console.log(`  ${token}: ${count > 0 ? "YES" : "NO"}  count=${count}`);
  }
}

const fodtXml = fs.readFileSync(fodt, "utf8");
reportTokens("FODT source", fodtXml, [
  'text:note-class="footnote"',
  'text:note-class="endnote"',
  "text:note-citation",
  "text:note-body",
  "text:notes-configuration",
  HEADING,
  BODY_KENH,
  FN1_BODY,
  FN2_BODY,
  EN1_BODY,
  FN1_CITE,
  FN2_CITE,
  EN1_CITE
]);

const docx = convertWithSoffice(fodt, "docx", path.join(tmp, "docx"), { profileDir });
console.log("\nDOCX", docx, fs.statSync(docx).size, "bytes");

const unzipDir = path.join(tmp, "unzip");
extractZip(docx, unzipDir);
const wordDir = path.join(unzipDir, "word");
console.log("\nword/ members:", fs.existsSync(wordDir) ? fs.readdirSync(wordDir).join(", ") : "(missing)");

function dumpIfExists(relPath) {
  const full = path.join(unzipDir, relPath);
  if (!fs.existsSync(full)) {
    console.log(`\n===== ${relPath} MISSING =====`);
    return "";
  }
  const xml = fs.readFileSync(full, "utf8");
  dump(relPath, xml);
  return xml;
}

const documentXml = dumpIfExists("word/document.xml");
reportTokens("word/document.xml", documentXml, [
  "w:footnoteReference",
  "w:endnoteReference",
  "w:footnote",
  "w:endnote",
  HEADING,
  BODY_KENH,
  BODY_HOIDONG,
  BODY_HOSO,
  FN1_BODY,
  FN2_BODY,
  EN1_BODY,
  FN1_CITE,
  FN2_CITE,
  EN1_CITE
]);

const footnotesXml = dumpIfExists("word/footnotes.xml");
reportTokens("word/footnotes.xml", footnotesXml, [
  "<w:footnotes",
  "<w:footnote",
  "w:type=\"separator\"",
  FN1_BODY,
  FN2_BODY,
  EN1_BODY,
  HEADING,
  BODY_KENH
]);

const endnotesXml = dumpIfExists("word/endnotes.xml");
reportTokens("word/endnotes.xml", endnotesXml, [
  "<w:endnotes",
  "<w:endnote",
  FN1_BODY,
  FN2_BODY,
  EN1_BODY,
  HEADING,
  BODY_KENH
]);

const htmlFromDocx = convertWithSoffice(docx, "html", path.join(tmp, "html-from-docx"), { profileDir });
const html = fs.readFileSync(htmlFromDocx, "utf8");
dump("HTML from DOCX (StarWriter, same as main.py)", html);
reportTokens("HTML from DOCX", html, [
  "sdfootnoteanc",
  "sdfootnotesym",
  "sdfootnote",
  "sdendnoteanc",
  "sdendnotesym",
  "sdendnote",
  "footnote",
  "endnote",
  "data-vno-footnote",
  "data-vno-endnote",
  "<sup",
  HEADING,
  BODY_KENH,
  BODY_HOIDONG,
  BODY_HOSO,
  FN1_BODY,
  FN2_BODY,
  EN1_BODY,
  FN1_CITE,
  FN2_CITE,
  EN1_CITE
]);

const htmlFromFodt = convertWithSoffice(fodt, "html", path.join(tmp, "html-from-fodt"), { profileDir });
const htmlFodt = fs.readFileSync(htmlFromFodt, "utf8");
dump("HTML from FODT directly", htmlFodt);
reportTokens("HTML from FODT", htmlFodt, [
  "sdfootnoteanc",
  "sdfootnotesym",
  "sdfootnote",
  "sdendnoteanc",
  "sdendnotesym",
  "sdendnote",
  "footnote",
  "endnote",
  "<sup",
  HEADING,
  BODY_KENH,
  FN1_BODY,
  FN2_BODY,
  EN1_BODY
]);

const fixtureDest = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-footnotes.docx");
fs.copyFileSync(docx, fixtureDest);
console.log(`\nCopied DOCX fixture → ${fixtureDest} (${fs.statSync(fixtureDest).size} bytes)`);
console.log(`Probe temp kept at ${tmp}`);
console.log("\nDONE");
