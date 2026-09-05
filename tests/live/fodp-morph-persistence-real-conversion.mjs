/**
 * Real LibreOffice probe for VN Morph persistence and Microsoft's p159:morph PPTX extension.
 * No GUI automation and no SendKeys.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { createZip, listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const canvas = { slides: [{
  id: 1, title: "Morph persistence", body: "", layoutType: "blank",
  transition: { type: "morph", duration: 800 }, shapes: []
}] };
const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /vno:transition="morph"/);
assert.equal(new SlidesAdapter(null).parseFodp(sourceXml)[0]?.transition?.type, "morph");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-morph-persistence-"));
try {
  const sourcePath = path.join(tempRoot, "source.fodp");
  fs.writeFileSync(sourcePath, sourceXml, "utf8");

  const rewriteDir = path.join(tempRoot, "rewrite");
  const rewrittenPath = convertWithSoffice(sourcePath, "fodp", rewriteDir, { profileDir: path.join(tempRoot, "profile-rewrite") });
  const rewrittenXml = fs.readFileSync(rewrittenPath, "utf8");
  const rewriteKeepsVno = /vno:transition="morph"/.test(rewrittenXml);

  const pptxDir = path.join(tempRoot, "pptx");
  const pptxPath = convertWithSoffice(sourcePath, "pptx", pptxDir, { profileDir: path.join(tempRoot, "profile-pptx") });
  const slideXml = readZipEntry(pptxPath, "ppt/slides/slide1.xml")?.toString("utf8") || "";
  const pptxHasMorph = /(?:p159|p14):morph\b/.test(slideXml);
  const pptxHasFade = /<p:fade\b/.test(slideXml);

  const nativeMorphTransition = '<p:transition spd="slow" p14:dur="800"><p:extLst><p:ext uri="{9C61073A-1D6D-4CF0-9456-214D3AE550B1}"><p159:morph xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" option="byObject"/></p:ext></p:extLst></p:transition>';
  const patchedEntries = listZipEntries(pptxPath).map(entry => {
    let data = readZipEntry(pptxPath, entry.name);
    if (entry.name === "ppt/slides/slide1.xml") {
      const xml = data.toString("utf8");
      data = Buffer.from(xml.replace(/<p:transition[\s\S]*?<\/p:transition>|<p:transition\b[^>]*\/>/, nativeMorphTransition), "utf8");
    }
    return { name: entry.name, data };
  });
  const nativePptxPath = path.join(tempRoot, "native-morph.pptx");
  fs.writeFileSync(nativePptxPath, createZip(patchedEntries));
  const nativeFodpDir = path.join(tempRoot, "native-fodp");
  const nativeFodpPath = convertWithSoffice(nativePptxPath, "fodp", nativeFodpDir, { profileDir: path.join(tempRoot, "profile-native") });
  const nativeFodpXml = fs.readFileSync(nativeFodpPath, "utf8");
  const nativeParsed = new SlidesAdapter(null).parseFodp(nativeFodpXml)[0]?.transition;

  console.log(JSON.stringify({
    libreOfficeFodpRewriteKeepsVno: rewriteKeepsVno,
    libreOfficePptxExportHasMorph: pptxHasMorph,
    libreOfficePptxExportHasFadeFallback: pptxHasFade,
    libreOfficeReadsP159MorphAs: nativeParsed || null,
    nativeFodpHasMorphToken: /morph/i.test(nativeFodpXml)
  }, null, 2));

  // These assertions document measured compatibility rather than pretending SMIL has native Morph.
  assert.equal(rewriteKeepsVno, false, "LibreOffice unexpectedly retained foreign vno metadata; re-audit persistence notes");
  assert.equal(pptxHasMorph, false, "LibreOffice unexpectedly emitted Microsoft's Morph extension; re-audit mapping");
  assert.equal(pptxHasFade, true, "PPTX must retain the standards-safe fade fallback");
  assert.notEqual(nativeParsed?.type, "morph", "LibreOffice unexpectedly mapped p159:morph to native FODP Morph; re-audit adapter");
  console.log("PASS: real soffice probe confirms custom VN Morph + safe fade behavior and measured p159 limitation");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
