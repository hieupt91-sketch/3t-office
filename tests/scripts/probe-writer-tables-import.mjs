/**
 * Probe (not a suite test): hand-written FODT table (colspan/rowspan/borders/shading)
 * → soffice DOCX → HTML (StarWriter), same path as main.py open_document_dialog.
 * Never uses VN Office serializers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodt = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-tables.fodt");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-tables-probe-"));
const profileDir = path.join(tmp, "profile");

function dump(label, text, max = 8000) {
  console.log(`\n===== ${label} =====`);
  console.log(text.length > max ? `${text.slice(0, max)}\n… [${text.length} chars]` : text);
}

function extractZip(zipPath, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tar -xf failed: ${result.stderr || result.stdout || ""}`);
}

function count(hay, needle) {
  const src = String(hay || "");
  const token = String(needle);
  if (!token) return 0;
  return src.split(token).length - 1;
}

function report(label, text, tokens) {
  console.log(`\n--- ${label} ---`);
  for (const token of tokens) {
    const n = typeof token === "string" && token.startsWith("/")
      ? null
      : count(text, token);
    if (token instanceof RegExp) {
      const matches = text.match(token);
      console.log(`  ${token}: ${matches ? "YES" : "NO"}  count=${matches ? matches.length : 0}`);
    } else {
      console.log(`  ${token}: ${text.includes(token) ? "YES" : "NO"}  count=${n}`);
    }
  }
}

const fodtXml = fs.readFileSync(fodt, "utf8");
report("FODT source", fodtXml, [
  "table:number-columns-spanned=\"2\"",
  "table:number-rows-spanned=\"2\"",
  "table:covered-table-cell",
  "fo:background-color=\"#fef3c7\"",
  "fo:background-color=\"#dbeafe\"",
  "fo:background-color=\"#dcfce7\"",
  "fo:background-color=\"#fecaca\"",
  "fo:border-left=\"2.25pt solid #b45309\"",
  "fo:border-top=\"1.5pt solid #1d4ed8\"",
  "fo:border-right=\"1.5pt solid #b91c1c\"",
  "fo:border-bottom=\"1.5pt solid #6d28d9\"",
  "Nhóm dự án thủy lợi",
  "Phân bổ ngân sách năm 2026",
  "DA-001 Đăk Bla",
  "980.000.000"
]);

const docx = convertWithSoffice(fodt, "docx", path.join(tmp, "docx"), { profileDir });
console.log("\nDOCX", docx, fs.statSync(docx).size, "bytes");

const unzipDir = path.join(tmp, "unzip");
extractZip(docx, unzipDir);
const documentXml = fs.readFileSync(path.join(unzipDir, "word", "document.xml"), "utf8");
dump("word/document.xml", documentXml, 12000);
report("OOXML markers", documentXml, [
  "<w:tbl",
  "<w:gridSpan",
  'w:val="2"',
  "<w:vMerge",
  "w:restart",
  "<w:tcBorders",
  "<w:shd",
  "w:fill=",
  "FEF3C7",
  "DBEAFE",
  "DCFCE7",
  "FECACA",
  "1D4ED8",
  "B45309",
  "15803D",
  "B91C1C",
  "6D28D9",
  "Nhóm dự án thủy lợi",
  "Phân bổ ngân sách năm 2026",
  "DA-001 Đăk Bla",
  "980.000.000",
  "850.000.000 TH"
]);

const fillMatches = [...documentXml.matchAll(/w:fill="([^"]+)"/g)].map((m) => m[1]);
const colorMatches = [...documentXml.matchAll(/<w:(?:top|left|bottom|right)\b[^>]*w:color="([^"]+)"/g)]
  .map((m) => `${m[0].match(/w:(top|left|bottom|right)/)?.[1]}=${m[1]}`);
console.log("\nOOXML w:fill values:", [...new Set(fillMatches)]);
console.log("OOXML border colors:", colorMatches);

const htmlFromDocx = convertWithSoffice(docx, "html", path.join(tmp, "html-from-docx"), { profileDir });
const html = fs.readFileSync(htmlFromDocx, "utf8");
dump("HTML from DOCX (StarWriter, same as main.py)", html, 14000);
report("HTML-from-DOCX markers", html, [
  "<table",
  "colspan",
  "rowspan",
  'colspan="2"',
  'rowspan="2"',
  "bgcolor",
  "background",
  "#fef3c7",
  "#dbeafe",
  "#dcfce7",
  "#fecaca",
  "fef3c7",
  "dbeafe",
  "dcfce7",
  "fecaca",
  "#1d4ed8",
  "#b45309",
  "#15803d",
  "#b91c1c",
  "#6d28d9",
  "border-top",
  "border-left",
  "border-right",
  "border-bottom",
  "Nhóm dự án thủy lợi",
  "Phân bổ ngân sách năm 2026",
  "DA-001 Đăk Bla",
  "980.000.000"
]);

const htmlFromFodt = convertWithSoffice(fodt, "html", path.join(tmp, "html-from-fodt"), { profileDir });
const htmlFodt = fs.readFileSync(htmlFromFodt, "utf8");
dump("HTML from FODT directly", htmlFodt, 8000);
report("HTML-from-FODT markers", htmlFodt, [
  "<table",
  'colspan="2"',
  'rowspan="2"',
  "bgcolor",
  "background",
  "fef3c7",
  "dbeafe",
  "border-top",
  "Nhóm dự án thủy lợi",
  "Phân bổ ngân sách năm 2026"
]);

console.log("\nTemp kept at", tmp);
console.log("Copy DOCX to fixtures next if conversion succeeded.");
