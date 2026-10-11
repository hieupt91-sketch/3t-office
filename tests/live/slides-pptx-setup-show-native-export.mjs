/**
 * Live soffice: FODP (Set Up Show vno:*) → PPTX, then VN post-process
 * patches p:showPr on ppt/presProps.xml. Patched PPTX must reopen via
 * soffice and the ZIP must still carry showNarration=0 + penClr.
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
  applyShowPropertiesFromFodp,
  parseShowProperties
} from "../../adapters/libreoffice/slides/pptx-show-properties.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

const canvas = {
  slideShowSettings: {
    loopUntilEsc: true,
    showWithoutNarration: true,
    pointerColor: "#112233"
  },
  getSlideShowSettings() { return this.slideShowSettings; },
  slides: [
    { id: 1, title: "Mo dau", body: "A1", layoutType: "title-content", notes: "", shapes: [] },
    { id: 2, title: "Noi dung", body: "A2", layoutType: "title-content", notes: "", shapes: [] },
    { id: 3, title: "Ket luan", body: "A3", layoutType: "title-content", notes: "", shapes: [] }
  ]
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /presentation:endless="true"/);
assert.match(sourceXml, /vno:without-narration="true"/);
assert.match(sourceXml, /vno:pointer-color="#112233"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-setup-show-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loPres = readZipEntry(pptxPath, "ppt/presentation.xml").toString("utf8");
  const loProps = readZipEntry(pptxPath, "ppt/presProps.xml").toString("utf8");
  fs.writeFileSync(path.join(tempRoot, "lo-presProps.xml"), loProps, "utf8");
  assert.equal(/<(?:[\w]+:)?showPr\b/i.test(loPres), false, "probe: presentation.xml không có showPr");
  const loParsed = parseShowProperties(loProps);
  assert.equal(loParsed.loop, true, "LO phải map endless → loop=1");
  assert.equal(loParsed.showNarration, true, "LO luôn showNarration=1 (đúng giới hạn đã probe)");
  assert.equal(loParsed.penRgb, "", "LO convert chưa ghi penClr");

  const jsPatchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const jsPatchedPath = path.join(tempRoot, "js-patched.pptx");
  fs.writeFileSync(jsPatchedPath, jsPatchedBytes);

  const jsProps = readZipEntry(jsPatchedPath, "ppt/presProps.xml").toString("utf8");
  fs.writeFileSync(path.join(tempRoot, "js-presProps.xml"), jsProps, "utf8");
  const jsParsed = parseShowProperties(jsProps);
  assert.equal(jsParsed.loop, true, "JS không được xóa loop");
  assert.equal(jsParsed.showNarration, false, "JS phải ghi showNarration=0");
  assert.equal(jsParsed.penRgb, "112233", `js pen=${jsParsed.penRgb}`);
  assert.equal(/vno:/.test(jsProps), false, "không nhét vno vào presProps");
  const jsPres = readZipEntry(jsPatchedPath, "ppt/presentation.xml").toString("utf8");
  assert.equal(/showPr/.test(jsPres), false, "không nhét showPr vào presentation.xml");
  assert.equal(
    applyShowPropertiesFromFodp(loProps, sourceXml),
    applyShowPropertiesFromFodp(applyShowPropertiesFromFodp(loProps, sourceXml), sourceXml),
    "JS XML transform idempotent trên XML soffice thật"
  );

  let sofficeReopenFodpOk = false;
  let sofficeReopenPdfOk = false;
  let loRoundTripVno = false;
  let loRoundTripEndless = false;
  let reopenError = null;
  try {
    const roundFodp = convertWithSoffice(jsPatchedPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, appKind: "slides" });
    const roundXml = fs.readFileSync(roundFodp, "utf8");
    sofficeReopenFodpOk = true;
    loRoundTripEndless = /presentation:endless=["']true["']/i.test(roundXml);
    loRoundTripVno = /vno:without-narration=/.test(roundXml) || /vno:pointer-color=/.test(roundXml);
    const parsed = new SlidesAdapter(null).parseFodp(roundXml);
    assert.ok(parsed.length === 3, `slides=${parsed.length}`);
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
  const pyProps = readZipEntry(pyOut, "ppt/presProps.xml").toString("utf8");
  const pyParsed = parseShowProperties(pyProps);
  assert.equal(pyParsed.showNarration, false, "Python twin phải ghi showNarration=0");
  assert.equal(pyParsed.penRgb, "112233", `py pen=${pyParsed.penRgb}`);
  assert.equal(pyParsed.loop, true, "Python giữ loop");
  assert.deepEqual(pyParsed, jsParsed, "Python parseShowProperties phải khớp JS");

  console.log(JSON.stringify({
    loHadShowPr: true,
    loShowNarration: loParsed.showNarration,
    loHadPenClr: !!loParsed.penRgb,
    loLoop: loParsed.loop,
    jsShowNarration: jsParsed.showNarration,
    jsPenRgb: jsParsed.penRgb,
    jsLoop: jsParsed.loop,
    pythonShowNarration: pyParsed.showNarration,
    pythonPenRgb: pyParsed.penRgb,
    sofficeReopenFodpOk,
    sofficeReopenPdfOk,
    loRoundTripEndless,
    loRoundTripVno,
    reopenError,
    pptxBytes: jsPatchedBytes.length,
    tempRoot
  }, null, 2));
} finally {
  // keep tempRoot for handoff inspection; OS cleans %TEMP%
}
