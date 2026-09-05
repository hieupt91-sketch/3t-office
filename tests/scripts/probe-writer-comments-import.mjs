/**
 * Probe (not a suite test): hand-written FODT Comments → soffice DOCX
 * → HTML (StarWriter), same path as main.py open_document_dialog.
 * Never uses VN Office serializers.
 *
 * Measures whether StarWriter keeps comment anchors / author / body, and
 * whether the DOCX still has word/comments.xml + w:commentReference.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodt = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-comments.fodt");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-comments-probe-"));
const profileDir = path.join(tmp, "profile");

function dump(label, text, max = 6000) {
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
  "office:annotation",
  "office:annotation-end",
  "Tran Thi Hoa",
  "Pham Minh Duc",
  "Cần đối chiếu số liệu quý II trước khi trình.",
  "Xác nhận chữ ký người soạn.",
  "dự toán năm 2026",
  "Lê Văn Cường"
]);

const docx = convertWithSoffice(fodt, "docx", path.join(tmp, "docx"), { profileDir });
console.log("\nDOCX", docx, fs.statSync(docx).size, "bytes");

const unzipDir = path.join(tmp, "unzip");
extractZip(docx, unzipDir);
const wordDir = path.join(unzipDir, "word");
console.log("\nword/ members:", fs.existsSync(wordDir) ? fs.readdirSync(wordDir).join(", ") : "(missing)");

const documentXml = fs.readFileSync(path.join(wordDir, "document.xml"), "utf8");
dump("word/document.xml", documentXml);
reportTokens("word/document.xml", documentXml, [
  "w:commentRangeStart",
  "w:commentRangeEnd",
  "w:commentReference",
  "dự toán năm 2026",
  "Lê Văn Cường",
  "Tran Thi Hoa",
  "Pham Minh Duc",
  "Cần đối chiếu",
  "Xác nhận chữ ký"
]);

const commentsPath = path.join(wordDir, "comments.xml");
if (fs.existsSync(commentsPath)) {
  const commentsXml = fs.readFileSync(commentsPath, "utf8");
  dump("word/comments.xml", commentsXml);
  reportTokens("word/comments.xml", commentsXml, [
    "w:comment",
    "w:author",
    "Tran Thi Hoa",
    "Pham Minh Duc",
    "Cần đối chiếu số liệu quý II trước khi trình.",
    "Xác nhận chữ ký người soạn."
  ]);
} else {
  console.log("\n===== word/comments.xml MISSING =====");
}

const htmlFromDocx = convertWithSoffice(docx, "html", path.join(tmp, "html-from-docx"), { profileDir });
const html = fs.readFileSync(htmlFromDocx, "utf8");
dump("HTML from DOCX (StarWriter, same as main.py)", html);
reportTokens("HTML from DOCX", html, [
  "<mark",
  "data-comment",
  "comment",
  "annotation",
  "<a ",
  "Tran Thi Hoa",
  "Pham Minh Duc",
  "Cần đối chiếu số liệu quý II trước khi trình.",
  "Xác nhận chữ ký người soạn.",
  "dự toán năm 2026",
  "Lê Văn Cường",
  "Kính gửi Ban Giám đốc"
]);

const htmlFromFodt = convertWithSoffice(fodt, "html", path.join(tmp, "html-from-fodt"), { profileDir });
const htmlFodt = fs.readFileSync(htmlFromFodt, "utf8");
dump("HTML from FODT directly", htmlFodt);
reportTokens("HTML from FODT", htmlFodt, [
  "<mark",
  "annotation",
  "Tran Thi Hoa",
  "Pham Minh Duc",
  "Cần đối chiếu",
  "Xác nhận chữ ký",
  "dự toán năm 2026",
  "Lê Văn Cường"
]);

const destDocx = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-comments.docx");
fs.copyFileSync(docx, destDocx);
console.log("\nCopied DOCX fixture to", destDocx);
console.log("Temp kept at", tmp);
