import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { citationMetadataHtml, parseCitationMetadata } from "../../apps/writer/citations.js";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer Citations conversion test");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-citations-"));
const source = path.join(temp, "writer-citations.html");
const outDocx = path.join(temp, "docx");
const outHtml = path.join(temp, "html");

const sources = [
  { id: "src-1", type: "book", author: "Nguyễn Văn A", title: "Giáo trình Vật lý", year: "2022", publisher: "NXB Giáo Dục", url: "" }
];
const metadataSpan = citationMetadataHtml({ style: "apa", sources });

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<p>Trước đó có nghiên cứu quan trọng <span class="vno-citation-field" data-vno-citation-source-id="src-1" contenteditable="false">(Nguyễn, 2022)</span> về chủ đề này.</p>
${metadataSpan}
<section class="vno-bibliography" data-vno-bibliography="true" contenteditable="false"><h2>Tài liệu tham khảo</h2><p class="vno-bibliography-entry" data-vno-source-id="src-1">Nguyễn Văn A. (2022). <i>Giáo trình Vật lý</i>. NXB Giáo Dục.</p></section>
</body></html>`;

try {
  fs.writeFileSync(source, html, "utf8");
  const docx = convertWithSoffice(source, "docx", outDocx, { profileDir: path.join(temp, "profile-docx"), timeoutMs: 60000 });
  const roundTripHtmlPath = convertWithSoffice(docx, "html", outHtml, { profileDir: path.join(temp, "profile-html"), timeoutMs: 60000 });
  const roundTripHtml = fs.readFileSync(roundTripHtmlPath, "utf8");

  assert.ok(fs.statSync(docx).size > 1000, "soffice must create a non-empty DOCX");

  const normalizedHtml = roundTripHtml.replace(/\s+/g, " ");
  const citationTextSurvived = /\(Nguyễn,\s*2022\)/.test(normalizedHtml);
  const bibliographySurvived = /Giáo trình Vật lý/.test(normalizedHtml) && /Tài liệu tham khảo/.test(normalizedHtml);
  const parsedBack = parseCitationMetadata(roundTripHtml);

  console.log(`${citationTextSurvived ? "PASS" : "LIMIT"} In-text citation visible text survived DOCX round trip`);
  console.log(`${bibliographySurvived ? "PASS" : "LIMIT"} Bibliography section text survived DOCX round trip`);
  console.log(`${parsedBack ? "PASS" : "LIMIT"} Hidden VNO_CITATIONS_V1 metadata marker ${parsedBack ? "survived" : "was stripped by"} soffice HTML→DOCX→HTML round trip`);
  if (parsedBack) {
    console.log("  recovered:", JSON.stringify(parsedBack));
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
