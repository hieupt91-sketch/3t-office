/**
 * Probe (not a suite test): hand-written FODT Track Changes → soffice DOCX
 * → HTML (StarWriter), same path as main.py open_document_dialog.
 * Never uses VN Office serializers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodt = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-writer-trackchanges.fodt");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-tc-probe-"));
const profileDir = path.join(tmp, "profile");

function dump(label, text, max = 4000) {
  console.log(`\n===== ${label} =====`);
  console.log(text.length > max ? `${text.slice(0, max)}\n… [${text.length} chars]` : text);
}

function extractZip(zipPath, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tar -xf failed: ${result.stderr || result.stdout || ""}`);
}

const docx = convertWithSoffice(fodt, "docx", path.join(tmp, "docx"), { profileDir });
console.log("DOCX", docx, fs.statSync(docx).size, "bytes");

const unzipDir = path.join(tmp, "unzip");
extractZip(docx, unzipDir);
const documentXml = fs.readFileSync(path.join(unzipDir, "word", "document.xml"), "utf8");
dump("word/document.xml", documentXml);
console.log("\n--- OOXML markers ---");
for (const token of ["w:ins", "w:del", "w:author", "theo yêu cầu khẩn", "bản nháp nội bộ", "Nguyen Van An"]) {
  console.log(`  ${token}: ${documentXml.includes(token) ? "YES" : "NO"}  count=${(documentXml.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length}`);
}

const htmlFromDocx = convertWithSoffice(docx, "html", path.join(tmp, "html-from-docx"), { profileDir });
const html = fs.readFileSync(htmlFromDocx, "utf8");
dump("HTML from DOCX (StarWriter, same as main.py)", html);
console.log("\n--- HTML markers ---");
for (const token of [
  "<ins", "</ins>", "<del", "</del>",
  "text-decoration:underline", "text-decoration: line-through", "line-through",
  "theo yêu cầu khẩn", "bản nháp nội bộ", "Nguyen Van An",
  "change-id", "tracked-changes", "data-vno-change"
]) {
  console.log(`  ${token}: ${html.toLowerCase().includes(token.toLowerCase()) ? "YES" : "NO"}`);
}

const htmlFromFodt = convertWithSoffice(fodt, "html", path.join(tmp, "html-from-fodt"), { profileDir });
const htmlFodt = fs.readFileSync(htmlFromFodt, "utf8");
dump("HTML from FODT directly", htmlFodt);
console.log("\n--- HTML-from-FODT markers ---");
for (const token of [
  "<ins", "</ins>", "<del", "</del>",
  "line-through", "underline",
  "theo yêu cầu khẩn", "bản nháp nội bộ", "Nguyen Van An"
]) {
  console.log(`  ${token}: ${htmlFodt.toLowerCase().includes(token.toLowerCase()) ? "YES" : "NO"}`);
}

console.log("\nTemp kept at", tmp);
console.log("Copy DOCX to fixtures next if conversion succeeded.");
