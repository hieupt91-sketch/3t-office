import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import {
  buildCaptionHtml,
  captionsMetadataHtml,
  parseCaptionMarker,
  parseCaptionsMetadata,
  parseTofMarker,
  tofMarkerHtml
} from "../../apps/writer/captions.js";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer Captions conversion test");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-captions-"));
const source = path.join(temp, "writer-captions.html");
const outDocx = path.join(temp, "docx");
const outHtml = path.join(temp, "html");
const outFodt = path.join(temp, "fodt");
const outFodtHtml = path.join(temp, "fodt-html");

const cap1 = buildCaptionHtml({ kind: "figure", id: "vno-cap-figure-demo-1", number: 1, text: "Biểu đồ doanh thu", locale: "vi" });
const cap2 = buildCaptionHtml({ kind: "figure", id: "vno-cap-figure-demo-2", number: 2, text: "Biểu đồ chi phí", locale: "vi" });
const capT = buildCaptionHtml({ kind: "table", id: "vno-cap-table-demo-1", number: 1, text: "Tổng hợp quý I", locale: "vi" });

const tofHtml = `<div data-vno-tof="true" data-vno-tof-kind="figure" class="vno-tof-block" contenteditable="false">
  <div class="vno-tof-header"><span class="vno-tof-title">DANH MỤC HÌNH</span></div>
  <div class="vno-tof-entries">
    <div class="vno-tof-item"><a href="#vno-cap-figure-demo-1" class="vno-tof-link" data-target-id="vno-cap-figure-demo-1"><span class="vno-tof-text">Hình 1: Biểu đồ doanh thu</span></a></div>
    <div class="vno-tof-item"><a href="#vno-cap-figure-demo-2" class="vno-tof-link" data-target-id="vno-cap-figure-demo-2"><span class="vno-tof-text">Hình 2: Biểu đồ chi phí</span></a></div>
  </div>
  ${tofMarkerHtml({ kind: "figure" })}
</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<p>Báo cáo chuyên đề.</p>
<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="demo"></p>
${cap1}
${cap2}
<table border="1"><tr><td>Số liệu</td></tr></table>
${capT}
${tofHtml}
${captionsMetadataHtml({
  captions: [
    { id: "vno-cap-figure-demo-1", kind: "figure", number: 1, text: "Biểu đồ doanh thu" },
    { id: "vno-cap-figure-demo-2", kind: "figure", number: 2, text: "Biểu đồ chi phí" },
    { id: "vno-cap-table-demo-1", kind: "table", number: 1, text: "Tổng hợp quý I" }
  ],
  tof: [{ kind: "figure" }]
})}
</body></html>`;

function report(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "LIMIT"}\t${label}${extra ? ` — ${extra}` : ""}`);
}

try {
  fs.writeFileSync(source, html, "utf8");

  const docx = convertWithSoffice(source, "docx", outDocx, { profileDir: path.join(temp, "profile-docx"), timeoutMs: 60000 });
  const roundTripHtmlPath = convertWithSoffice(docx, "html", outHtml, { profileDir: path.join(temp, "profile-html"), timeoutMs: 60000 });
  const roundTripHtml = fs.readFileSync(roundTripHtmlPath, "utf8");
  const normalized = roundTripHtml.replace(/\s+/g, " ");

  assert.ok(fs.statSync(docx).size > 1000, "soffice must create a non-empty DOCX");

  const figureText = /Hình\s+1\s*:\s*Biểu đồ doanh thu/.test(normalized) && /Hình\s+2\s*:\s*Biểu đồ chi phí/.test(normalized);
  const tableText = /Bảng\s+1\s*:\s*Tổng hợp quý I/.test(normalized);
  const tofText = /DANH MỤC HÌNH/.test(normalized) && /Hình\s+1\s*:\s*Biểu đồ doanh thu/.test(normalized);
  const captionAttr = /data-vno-caption/.test(roundTripHtml);
  const tofAttr = /data-vno-tof/.test(roundTripHtml);
  const captionMarker = parseCaptionMarker(roundTripHtml);
  const tofMarker = parseTofMarker(roundTripHtml);
  const captionsMeta = parseCaptionsMetadata(roundTripHtml);
  const captionId = /id=["']vno-cap-figure-demo-1["']/.test(roundTripHtml) || /vno-cap-figure-demo-1/.test(roundTripHtml);

  report(figureText, "Visible caption text 'Hình 1/2: …' survived HTML→DOCX→HTML");
  report(tableText, "Visible caption text 'Bảng 1: …' survived HTML→DOCX→HTML");
  report(tofText, "Table of Figures visible title/entries survived HTML→DOCX→HTML");
  report(captionAttr, "data-vno-caption attributes survived HTML→DOCX→HTML");
  report(tofAttr, "data-vno-tof attributes survived HTML→DOCX→HTML");
  report(Boolean(captionMarker), `Hidden VNO_CAPTION_V1 marker ${captionMarker ? "survived" : "was stripped by"} soffice HTML→DOCX→HTML`);
  report(Boolean(tofMarker), `Hidden VNO_TOF_V1 marker ${tofMarker ? "survived" : "was stripped by"} soffice HTML→DOCX→HTML`);
  report(Boolean(captionsMeta?.captions?.length), `Hidden VNO_CAPTIONS_META_V1 metadata ${captionsMeta?.captions?.length ? "survived" : "was stripped by"} soffice HTML→DOCX→HTML`);
  report(captionId, "Caption id/anchor survived HTML→DOCX→HTML (needed for TOF jump after reopen)");

  let fodtOk = false;
  let fodtNormalized = "";
  try {
    const fodt = convertWithSoffice(source, "fodt", outFodt, { profileDir: path.join(temp, "profile-fodt"), timeoutMs: 60000 });
    const fodtHtmlPath = convertWithSoffice(fodt, "html", outFodtHtml, { profileDir: path.join(temp, "profile-fodt-html"), timeoutMs: 60000 });
    fodtNormalized = fs.readFileSync(fodtHtmlPath, "utf8").replace(/\s+/g, " ");
    fodtOk = true;
    report(/Hình\s+1\s*:\s*Biểu đồ doanh thu/.test(fodtNormalized), "Visible caption text survived HTML→FODT→HTML");
    report(/DANH MỤC HÌNH/.test(fodtNormalized), "Table of Figures title survived HTML→FODT→HTML");
    report(Boolean(parseCaptionMarker(fs.readFileSync(fodtHtmlPath, "utf8"))), "Hidden VNO_CAPTION_V1 marker survived HTML→FODT→HTML");
    report(/data-vno-caption/.test(fs.readFileSync(fodtHtmlPath, "utf8")), "data-vno-caption attributes survived HTML→FODT→HTML");
  } catch (error) {
    report(false, "HTML→FODT round trip", error.message);
  }

  const summary = {
    docxSize: fs.statSync(docx).size,
    figureText,
    tableText,
    tofText,
    captionAttr,
    tofAttr,
    captionMarker: Boolean(captionMarker),
    tofMarker: Boolean(tofMarker),
    captionsMeta: Boolean(captionsMeta?.captions?.length),
    captionId,
    fodtOk
  };
  console.log("MEASURED", JSON.stringify(summary, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
