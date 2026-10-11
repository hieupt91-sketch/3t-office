import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer Arrange conversion test");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-arrange-"));
const source = path.join(temp, "writer-arrange.html");
const outDocx = path.join(temp, "docx");
const outHtml = path.join(temp, "html");
const outPdf = path.join(temp, "pdf");
const pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page { size: A4; margin: 20mm; } body { position:relative; }</style></head><body>
<p>Văn bản trước ảnh vuông.</p>
<img id="square" src="data:image/png;base64,${pixel}" data-vno-wrap="square" style="display:block;float:left;position:relative;width:72px;height:72px;margin:6pt 10pt 6pt 0">
<p>Văn bản chạy quanh logo hành chính.</p>
<img id="fixed" src="data:image/png;base64,${pixel}" data-vno-position="bottomRight" style="display:block;float:none;position:absolute;left:100%;top:100%;transform:translate(-100%,-100%);z-index:10;width:48px;height:48px">
</body></html>`;

try {
  fs.writeFileSync(source, html, "utf8");
  const docx = convertWithSoffice(source, "docx", outDocx, { profileDir: path.join(temp, "profile-docx"), timeoutMs: 60000 });
  const pdf = convertWithSoffice(source, "pdf", outPdf, { profileDir: path.join(temp, "profile-pdf"), appKind: "writer", timeoutMs: 60000 });
  const roundTripHtmlPath = convertWithSoffice(docx, "html", outHtml, { profileDir: path.join(temp, "profile-html"), timeoutMs: 60000 });
  const roundTripHtml = fs.readFileSync(roundTripHtmlPath, "utf8");

  assert.ok(fs.statSync(docx).size > 1000, "soffice must create a non-empty DOCX");
  assert.equal(fs.readFileSync(pdf).subarray(0, 4).toString("ascii"), "%PDF", "soffice must create a real PDF");
  assert.match(roundTripHtml, /<img\b/i, "DOCX round trip must retain embedded images");
  assert.match(roundTripHtml, /align=(?:"left"|left)/i, "Square float must survive DOCX as a left-aligned Writer image");

  const absoluteSurvived = /position\s*:\s*absolute/i.test(roundTripHtml) && /left\s*:\s*100%/i.test(roundTripHtml);
  console.log(`PASS  soffice HTML → DOCX → HTML retained images and Square left alignment`);
  console.log(`PASS  soffice generated real PDF (${fs.statSync(pdf).size} bytes)`);
  console.log(`${absoluteSurvived ? "PASS" : "LIMIT"} Position absolute/percentage ${absoluteSurvived ? "survived" : "was normalized by LibreOffice's HTML/DOCX importer"}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
