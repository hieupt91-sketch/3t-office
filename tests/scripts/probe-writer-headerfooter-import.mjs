/**
 * Probe (not a suite test): hand-written FODT Header/Footer → soffice DOCX
 * → HTML (StarWriter), same path as main.py open_document_dialog.
 * Never uses VN Office serializers.
 *
 * Measures whether StarWriter keeps header/footer as <div title="header|footer">
 * (the format WriterAdapter already parses for VN round-trip), or flattens /
 * drops them like Track Changes / Comments. Also inspects native OOXML parts
 * word/header1.xml + word/footer1.xml — separate from word/document.xml.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodt = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-headerfooter.fodt");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-headerfooter-probe-"));
const profileDir = path.join(tmp, "profile");

const HEADER_TOKEN = "Công ty TNHH Sao Việt";
const HEADER_DEPT = "Phòng Kế hoạch";
const FOOTER_DATE = "05/09/2026";
const BODY_TOKEN = "Nội dung thân trang công văn số 128/KH-ĐT";
const HEADING = "Công văn triển khai kế hoạch quý IV";

function dump(label, text, max = 8000) {
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
  "style:header",
  "style:footer",
  "text:page-number",
  "text:page-count",
  HEADER_TOKEN,
  HEADER_DEPT,
  FOOTER_DATE,
  BODY_TOKEN,
  HEADING
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
  "w:hdr",
  "w:ftr",
  "headerReference",
  "footerReference",
  HEADER_TOKEN,
  HEADER_DEPT,
  FOOTER_DATE,
  BODY_TOKEN,
  HEADING,
  "PAGE",
  "NUMPAGES"
]);

const headerXml = dumpIfExists("word/header1.xml");
reportTokens("word/header1.xml", headerXml, [
  "w:hdr",
  HEADER_TOKEN,
  HEADER_DEPT,
  BODY_TOKEN,
  HEADING
]);

const footerXml = dumpIfExists("word/footer1.xml");
reportTokens("word/footer1.xml", footerXml, [
  "w:ftr",
  "PAGE",
  "NUMPAGES",
  "w:fldChar",
  "w:instrText",
  "w:fldSimple",
  FOOTER_DATE,
  "Trang",
  BODY_TOKEN,
  HEADER_TOKEN
]);

const htmlFromDocx = convertWithSoffice(docx, "html", path.join(tmp, "html-from-docx"), { profileDir });
const html = fs.readFileSync(htmlFromDocx, "utf8");
dump("HTML from DOCX (StarWriter, same as main.py)", html);
reportTokens("HTML from DOCX", html, [
  'title="header"',
  "title='header'",
  "title=header",
  'title="footer"',
  "title='footer'",
  "title=footer",
  "<div title=",
  "HEADER",
  "FOOTER",
  HEADER_TOKEN,
  HEADER_DEPT,
  FOOTER_DATE,
  "Trang",
  BODY_TOKEN,
  HEADING
]);

const htmlFromFodt = convertWithSoffice(fodt, "html", path.join(tmp, "html-from-fodt"), { profileDir });
const htmlFodt = fs.readFileSync(htmlFromFodt, "utf8");
dump("HTML from FODT directly", htmlFodt);
reportTokens("HTML from FODT", htmlFodt, [
  'title="header"',
  'title="footer"',
  HEADER_TOKEN,
  HEADER_DEPT,
  FOOTER_DATE,
  "Trang",
  BODY_TOKEN,
  HEADING
]);

const destDocx = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-headerfooter.docx");
fs.copyFileSync(docx, destDocx);
console.log("\nCopied DOCX fixture to", destDocx);
console.log("Temp kept at", tmp);
