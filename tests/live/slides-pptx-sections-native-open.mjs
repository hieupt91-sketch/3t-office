/**
 * Live soffice: Save sections → PPTX (Phase 3a post-process) →
 * Open that PPTX (soffice PPTX→FODP + overlay) →
 * FODP has vno:section-* on the right draw:page in the right order.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  overlaySlidesPptxFodp,
  postProcessSlidesPptx
} from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import {
  fodpHasSections,
  parseFodpPages,
  parsePresentationSlideIds,
  parseSectionList,
  presentationHasSectionList,
  sectionGuidFromId
} from "../../adapters/libreoffice/slides/pptx-section-list.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

const canvas = {
  sections: [
    { id: "section-intro", name: "Gioi thieu" },
    { id: "section-body", name: "Noi dung chinh" }
  ],
  slides: [
    { id: 1, title: "Mo dau 1", body: "A1", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-intro" },
    { id: 2, title: "Mo dau 2", body: "A2", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-intro" },
    { id: 3, title: "Mo dau 3", body: "A3", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-intro" },
    { id: 4, title: "Noi dung 1", body: "B1", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" },
    { id: 5, title: "Noi dung 2", body: "B2", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" },
    { id: 6, title: "Noi dung 3", body: "B3", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" }
  ]
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /vno:section-id="section-intro"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-sections-open-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loPres = readZipEntry(pptxPath, "ppt/presentation.xml").toString("utf8");
  const loIds = parsePresentationSlideIds(loPres);
  assert.equal(loIds.length, 6, `sldId count=${loIds.length}`);
  assert.equal(presentationHasSectionList(loPres), false, "LO FODP→PPTX chưa ghi p14:sectionLst");

  const patchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const patchedPath = path.join(tempRoot, "saved.pptx");
  fs.writeFileSync(patchedPath, patchedBytes);
  const patchedPres = readZipEntry(patchedPath, "ppt/presentation.xml").toString("utf8");
  assert.equal(presentationHasSectionList(patchedPres), true, "Phase 3a Lưu PPTX phải có p14:sectionLst");
  const patchedSections = parseSectionList(patchedPres);
  assert.equal(patchedSections[0].name, "Gioi thieu");
  assert.deepEqual(patchedSections[0].slideIds, loIds.slice(0, 3));

  const reopenFodpPath = convertWithSoffice(patchedPath, "fodp", path.join(tempRoot, "reopen-fodp"), {
    profileDir,
    appKind: "slides"
  });
  const loReopenFodp = fs.readFileSync(reopenFodpPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "lo-reopen.fodp"), loReopenFodp, "utf8");
  assert.equal(fodpHasSections(loReopenFodp), false, "LibreOffice PPTX→FODP vẫn không map p14:sectionLst (lý do overlay)");
  const loPages = parseFodpPages(loReopenFodp);
  assert.equal(loPages.length, loIds.length, "số draw:page phải khớp sldIdLst — nếu lệch overlay phải ném, không đoán");

  const jsOverlaid = overlaySlidesPptxFodp(patchedPath, loReopenFodp);
  assert.equal(fodpHasSections(jsOverlaid), true, "JS overlay phải gắn vno:section-*");
  const jsPages = parseFodpPages(jsOverlaid);
  const intro = sectionGuidFromId("section-intro");
  const body = sectionGuidFromId("section-body");
  assert.ok(jsPages.slice(0, 3).every((p) => p.sectionId === intro && p.sectionName === "Gioi thieu"), JSON.stringify(jsPages.slice(0, 3)));
  assert.ok(jsPages.slice(3).every((p) => p.sectionId === body && p.sectionName === "Noi dung chinh"), JSON.stringify(jsPages.slice(3)));

  const parsed = new SlidesAdapter(null).parseFodp(jsOverlaid);
  assert.equal(parsed.length, 6);
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].name, "Gioi thieu");
  assert.equal(parsed[0].sectionId, intro);
  assert.equal(parsed[5].sectionId, body);

  const pyOut = path.join(tempRoot, "py-overlaid.fodp");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--pptx", patchedPath,
    "--overlay-fodp", reopenFodpPath,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyFodp = fs.readFileSync(pyOut, "utf8");
  assert.equal(jsOverlaid, pyFodp, "JS và Python overlay phải ra cùng FODP trên file soffice thật");

  console.log(JSON.stringify({
    loExportHadSectionLst: false,
    phase3aSectionLst: true,
    loSlideIds: loIds,
    loReopenHadVnoSection: false,
    jsOverlayHadVnoSection: true,
    pythonOverlayHadVnoSection: true,
    jsPages: jsPages.map((p) => ({ id: p.sectionId, name: p.sectionName })),
    adapterSectionNames: parsed.sections.map((s) => s.name),
    pptxBytes: patchedBytes.length,
    tempRoot
  }, null, 2));
} finally {
  // keep tempRoot for handoff inspection; OS cleans %TEMP%
}
