/**
 * Real LibreOffice probe: does CSS WordArt survive Writer HTML → FODT / DOCX?
 * Measures, does not assume. Never SendKeys.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";
import { buildWriterWordArtHtml } from "../../apps/writer/insert-dialogs.js";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer WordArt conversion test");

const wordArt = buildWriterWordArtHtml("Khai giảng", { presetId: "ocean-gradient" });
const sourceHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<p>Trước ${wordArt} sau.</p>
</body></html>`;

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-wordart-persistence-"));
const report = {
  nativeHtmlHasCss: /linear-gradient/.test(sourceHtml) && /background-clip:text/.test(sourceHtml) && /data-vno-wordart="true"/.test(sourceHtml),
  fodtKeepsText: null,
  fodtKeepsDataAttr: null,
  fodtKeepsGradientCss: null,
  fodtKeepsTextShadow: null,
  fodtKeepsWebkitStroke: null,
  fodtRewriteKeepsText: null,
  fodtRewriteKeepsDataAttr: null,
  docxKeepsText: null,
  docxHasWordArtPrst: null,
  docxRoundTripHtmlKeepsText: null,
  docxRoundTripHtmlKeepsDataAttr: null,
  docxRoundTripHtmlKeepsGradientCss: null
};

try {
  const sourcePath = path.join(tempRoot, "source.html");
  fs.writeFileSync(sourcePath, sourceHtml, "utf8");

  const fodtDir = path.join(tempRoot, "fodt");
  const fodtPath = convertWithSoffice(sourcePath, "fodt", fodtDir, { profileDir: path.join(tempRoot, "profile-fodt") });
  const fodtXml = fs.readFileSync(fodtPath, "utf8");
  report.fodtKeepsText = /Khai giảng/.test(fodtXml);
  report.fodtKeepsDataAttr = /data-vno-wordart|vno:wordart/.test(fodtXml);
  report.fodtKeepsGradientCss = /linear-gradient|gradFill|gradient/i.test(fodtXml);
  report.fodtKeepsTextShadow = /text-shadow|fo:text-shadow|textshadow/i.test(fodtXml);
  report.fodtKeepsWebkitStroke = /-webkit-text-stroke|text-outline|fontwork/i.test(fodtXml);

  const rewriteDir = path.join(tempRoot, "rewrite");
  const rewrittenPath = convertWithSoffice(fodtPath, "fodt", rewriteDir, { profileDir: path.join(tempRoot, "profile-rewrite") });
  const rewrittenXml = fs.readFileSync(rewrittenPath, "utf8");
  report.fodtRewriteKeepsText = /Khai giảng/.test(rewrittenXml);
  report.fodtRewriteKeepsDataAttr = /data-vno-wordart|vno:wordart/.test(rewrittenXml);

  const docxDir = path.join(tempRoot, "docx");
  const docxPath = convertWithSoffice(sourcePath, "docx", docxDir, { profileDir: path.join(tempRoot, "profile-docx") });
  const documentXml = readZipEntry(docxPath, "word/document.xml")?.toString("utf8") || "";
  report.docxKeepsText = /Khai giảng/.test(documentXml);
  report.docxHasWordArtPrst = /wps:wordArt|w14:glow|a:gradFill|fontwork/i.test(documentXml);

  const htmlDir = path.join(tempRoot, "html");
  const roundTripHtmlPath = convertWithSoffice(docxPath, "html", htmlDir, { profileDir: path.join(tempRoot, "profile-html") });
  const roundTripHtml = fs.readFileSync(roundTripHtmlPath, "utf8");
  const htmlHasKhai = /Khai/i.test(roundTripHtml);
  const htmlHasGiangEntity = /gi&#7843;ng|gi&#x1ea3;ng|giảng/i.test(roundTripHtml);
  report.docxRoundTripHtmlKeepsText = htmlHasKhai && htmlHasGiangEntity;
  report.docxRoundTripHtmlKeepsDataAttr = /data-vno-wordart/.test(roundTripHtml);
  report.docxRoundTripHtmlKeepsGradientCss = /linear-gradient|background-clip:\s*text/i.test(roundTripHtml);
  report.docxRoundTripHtmlSnippet = roundTripHtml.replace(/\s+/g, " ").slice(0, 400);

  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.nativeHtmlHasCss, true, "Source HTML must include WordArt CSS + data attributes");
  assert.equal(report.fodtKeepsText, true, "LibreOffice FODT dropped the visible WordArt text");
  assert.equal(report.docxKeepsText, true, "LibreOffice DOCX dropped the visible WordArt text");
  assert.equal(report.fodtKeepsDataAttr, false, "LibreOffice unexpectedly retained data-vno-wordart in FODT");
  assert.equal(report.fodtKeepsGradientCss, false, "LibreOffice unexpectedly retained gradient CSS in FODT");
  assert.equal(report.docxHasWordArtPrst, false, "LibreOffice unexpectedly emitted WordArt OOXML");
  console.log("PASS: real soffice probe documents Writer WordArt text survival and CSS/data-attr limits");
  if (!report.docxRoundTripHtmlKeepsText) {
    console.log("LIMIT: DOCX→HTML did not keep the original Unicode string; see snippet");
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
