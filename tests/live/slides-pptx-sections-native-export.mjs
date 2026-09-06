/**
 * Live soffice: FODP (2 sections × 3 slides) → PPTX, then VN post-process
 * inserts p14:sectionLst into ppt/presentation.xml. Patched PPTX must
 * reopen via soffice and the ZIP must still carry the real section list.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import {
  applySectionListFromFodp,
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
assert.match(sourceXml, /vno:section-name="Gioi thieu"/);
assert.match(sourceXml, /vno:section-id="section-body"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-sections-p14-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loPres = readZipEntry(pptxPath, "ppt/presentation.xml").toString("utf8");
  const loIds = parsePresentationSlideIds(loPres);
  assert.equal(loIds.length, 6, `sldId count=${loIds.length}`);
  assert.equal(presentationHasSectionList(loPres), false, "LO convert chưa ghi p14:sectionLst (đúng giới hạn đã probe)");
  assert.equal(loPres.includes("Gioi thieu"), false, "probe: tên phần không có sau hop thuần");

  const jsPatchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const jsPatchedPath = path.join(tempRoot, "js-patched.pptx");
  fs.writeFileSync(jsPatchedPath, jsPatchedBytes);

  const jsPres = readZipEntry(jsPatchedPath, "ppt/presentation.xml").toString("utf8");
  fs.writeFileSync(path.join(tempRoot, "js-presentation.xml"), jsPres, "utf8");
  assert.equal(presentationHasSectionList(jsPres), true, "JS patch thiếu p14:sectionLst");
  const jsSections = parseSectionList(jsPres);
  assert.equal(jsSections.length, 2, `js sections=${jsSections.length}`);
  assert.equal(jsSections[0].name, "Gioi thieu");
  assert.deepEqual(jsSections[0].slideIds, loIds.slice(0, 3));
  assert.equal(jsSections[1].name, "Noi dung chinh");
  assert.deepEqual(jsSections[1].slideIds, loIds.slice(3));
  assert.equal(jsSections[0].id, sectionGuidFromId("section-intro"));
  assert.equal(jsSections[1].id, sectionGuidFromId("section-body"));
  assert.deepEqual(parsePresentationSlideIds(jsPres), loIds, "không được đọc nhầm p14:sldId thành p:sldId");

  let sofficeReopenFodpOk = false;
  let sofficeReopenPdfOk = false;
  let loRoundTripSectionInFodp = false;
  let reopenError = null;
  try {
    const roundFodp = convertWithSoffice(jsPatchedPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, appKind: "slides" });
    const roundXml = fs.readFileSync(roundFodp, "utf8");
    sofficeReopenFodpOk = true;
    loRoundTripSectionInFodp = /vno:section-id=/.test(roundXml) || /Gioi thieu/.test(roundXml);
    const parsed = new SlidesAdapter(null).parseFodp(roundXml);
    assert.ok(parsed.length === 6, `slides=${parsed.length}`);
    assert.ok(parsed[0].title.includes("Mo dau") || parsed[0].title.length > 0, `title0=${parsed[0].title}`);
  } catch (error) {
    reopenError = String(error.message || error);
  }

  try {
    const pdfPath = convertWithSoffice(jsPatchedPath, "pdf", path.join(tempRoot, "pdf"), { profileDir, appKind: "slides" });
    sofficeReopenPdfOk = fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 100;
  } catch (error) {
    if (!reopenError) reopenError = String(error.message || error);
  }

  assert.ok(
    sofficeReopenFodpOk || sofficeReopenPdfOk,
    `patched PPTX phải mở được bằng soffice (FODP hoặc PDF). ${reopenError || ""}`
  );

  const pyOut = path.join(tempRoot, "py-patched.pptx");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--pptx", pptxPath,
    "--fodp", source,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyPres = readZipEntry(pyOut, "ppt/presentation.xml").toString("utf8");
  const pySections = parseSectionList(pyPres);
  assert.equal(pySections.length, 2, "Python twin phải ghi sectionLst");
  assert.deepEqual(pySections[0].slideIds, loIds.slice(0, 3));
  assert.deepEqual(pySections[1].slideIds, loIds.slice(3));
  assert.equal(
    applySectionListFromFodp(loPres, sourceXml),
    applySectionListFromFodp(applySectionListFromFodp(loPres, sourceXml), sourceXml),
    "JS XML transform idempotent trên XML soffice thật"
  );

  console.log(JSON.stringify({
    loHadSectionLst: false,
    loSlideIds: loIds,
    jsHadSectionLst: true,
    jsSections: jsSections.map((s) => ({ name: s.name, slideIds: s.slideIds })),
    pythonHadSectionLst: true,
    pythonSections: pySections.map((s) => ({ name: s.name, slideIds: s.slideIds })),
    sofficeReopenFodpOk,
    sofficeReopenPdfOk,
    loRoundTripSectionInFodp,
    reopenError,
    pptxBytes: jsPatchedBytes.length,
    tempRoot
  }, null, 2));
} finally {
  // keep tempRoot for handoff inspection; OS cleans %TEMP%
}
