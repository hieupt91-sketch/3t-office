/**
 * Real LibreOffice probe: does CSS-like WordArt survive FODP rewrite / PPTX?
 * Measures, does not assume. Never SendKeys.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const canvas = {
  slides: [{
    id: 1,
    title: "WordArt persistence",
    body: "",
    layoutType: "blank",
    shapes: [{
      id: "wa1",
      type: "wordart",
      x: 120,
      y: 160,
      w: 560,
      h: 120,
      color: "transparent",
      text: "Khai giảng",
      presetId: "ocean-gradient",
      fontFamily: "Impact, Arial Black, Arial, sans-serif",
      fontSize: 48,
      fillColor: "#1d4ed8",
      gradient: { from: "#38bdf8", to: "#1d4ed8", angle: 90 },
      strokeColor: "#0c4a6e",
      strokeWidth: 1.5,
      shadow: { offsetX: 2, offsetY: 4, blur: 8, color: "rgba(12, 74, 110, 0.55)" }
    }]
  }]
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /vno:wordart="true"/);
assert.match(sourceXml, /<draw:text-box>/);
assert.equal(new SlidesAdapter(null).parseFodp(sourceXml)[0]?.shapes?.[0]?.type, "wordart");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-wordart-persistence-"));
const report = {
  nativeKeepsVno: true,
  nativeKeepsText: true,
  libreOfficeFodpRewriteKeepsVno: null,
  libreOfficeFodpRewriteKeepsText: null,
  libreOfficePptxHasText: null,
  libreOfficePptxHasWordArtPrst: null,
  parsedAfterRewriteType: null
};

try {
  const sourcePath = path.join(tempRoot, "source.fodp");
  fs.writeFileSync(sourcePath, sourceXml, "utf8");

  const rewriteDir = path.join(tempRoot, "rewrite");
  const rewrittenPath = convertWithSoffice(sourcePath, "fodp", rewriteDir, { profileDir: path.join(tempRoot, "profile-rewrite") });
  const rewrittenXml = fs.readFileSync(rewrittenPath, "utf8");
  report.libreOfficeFodpRewriteKeepsVno = /vno:wordart="true"/.test(rewrittenXml);
  report.libreOfficeFodpRewriteKeepsText = /Khai giảng/.test(rewrittenXml);
  report.parsedAfterRewriteType = new SlidesAdapter(null).parseFodp(rewrittenXml)[0]?.shapes?.find(Boolean)?.type || null;

  const pptxDir = path.join(tempRoot, "pptx");
  const pptxPath = convertWithSoffice(sourcePath, "pptx", pptxDir, { profileDir: path.join(tempRoot, "profile-pptx") });
  const slideXml = readZipEntry(pptxPath, "ppt/slides/slide1.xml")?.toString("utf8") || "";
  report.libreOfficePptxHasText = /Khai giảng/.test(slideXml);
  report.libreOfficePptxHasWordArtPrst = /wordArt|fontwork|gradFill|outerShdw/i.test(slideXml);

  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.libreOfficeFodpRewriteKeepsVno, false, "LibreOffice unexpectedly retained vno:wordart; re-audit persistence notes");
  assert.equal(report.libreOfficeFodpRewriteKeepsText, true, "LibreOffice rewrite dropped the visible WordArt text");
  console.log("PASS: real soffice probe documents WordArt vno:* limitation and text-box fallback");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
