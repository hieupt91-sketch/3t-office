/**
 * Live soffice: Save Set Up Show → PPTX (Phase 3b post-process) →
 * Open that PPTX (soffice PPTX→FODP + overlay) →
 * FODP has vno:without-narration / vno:pointer-color and parseFodp
 * restores the Set Up Show dialog. Loop stays from LibreOffice, not overlay.
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
  fodpHasShowSetupPatch,
  parseShowProperties,
  parseShowSettingsFromFodp
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
  applySlideShowSettings(next) {
    this.slideShowSettings = { ...this.slideShowSettings, ...next };
  },
  slides: [
    { id: 1, title: "Mo dau", body: "A1", layoutType: "title-content", notes: "", shapes: [] },
    { id: 2, title: "Noi dung", body: "A2", layoutType: "title-content", notes: "", shapes: [] },
    { id: 3, title: "Ket luan", body: "A3", layoutType: "title-content", notes: "", shapes: [] }
  ],
  selectSlide() {}
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /vno:without-narration="true"/);
assert.match(sourceXml, /vno:pointer-color="#112233"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-setup-show-open-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loProps = readZipEntry(pptxPath, "ppt/presProps.xml").toString("utf8");
  const loParsed = parseShowProperties(loProps);
  assert.equal(loParsed.showNarration, true, "LO FODP→PPTX vẫn showNarration=1");
  assert.equal(loParsed.penRgb, "", "LO FODP→PPTX chưa ghi penClr");
  assert.equal(loParsed.loop, true, "LO đã map endless → loop");

  const patchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const patchedPath = path.join(tempRoot, "saved.pptx");
  fs.writeFileSync(patchedPath, patchedBytes);
  const patchedParsed = parseShowProperties(
    readZipEntry(patchedPath, "ppt/presProps.xml").toString("utf8")
  );
  assert.equal(patchedParsed.showNarration, false, "Phase 3b Lưu PPTX phải có showNarration=0");
  assert.equal(patchedParsed.penRgb, "112233");
  assert.equal(patchedParsed.loop, true, "Phase 3b giữ loop");

  const reopenFodpPath = convertWithSoffice(patchedPath, "fodp", path.join(tempRoot, "reopen-fodp"), {
    profileDir,
    appKind: "slides"
  });
  const loReopenFodp = fs.readFileSync(reopenFodpPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "lo-reopen.fodp"), loReopenFodp, "utf8");
  assert.equal(
    fodpHasShowSetupPatch(loReopenFodp),
    false,
    "LibreOffice PPTX→FODP vẫn không map vno:* (lý do overlay)"
  );
  assert.match(loReopenFodp, /presentation:endless=["']true["']/, "LO giữ endless — không overlay loop");

  const jsOverlaid = overlaySlidesPptxFodp(patchedBytes, loReopenFodp);
  fs.writeFileSync(path.join(tempRoot, "js-overlaid.fodp"), jsOverlaid, "utf8");
  assert.equal(fodpHasShowSetupPatch(jsOverlaid), true, "JS overlay phải gắn vno:*");
  const jsSettings = parseShowSettingsFromFodp(jsOverlaid);
  assert.equal(jsSettings.showWithoutNarration, true);
  assert.equal(jsSettings.pointerColor, "#112233");
  assert.equal(jsSettings.loopUntilEsc, true);

  const pyOut = path.join(tempRoot, "py-overlaid.fodp");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--pptx", patchedPath,
    "--overlay-fodp", reopenFodpPath,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyOverlaid = fs.readFileSync(pyOut, "utf8");
  assert.equal(pyOverlaid, jsOverlaid, "Python overlay phải khớp JS trên FODP soffice thật");

  const openedCanvas = {
    slideShowSettings: {
      loopUntilEsc: false,
      showWithoutNarration: false,
      pointerColor: "#DC2626"
    },
    applySlideShowSettings(next) {
      this.slideShowSettings = { ...this.slideShowSettings, ...next };
    },
    slides: [],
    selectSlide() {}
  };
  const opened = new SlidesAdapter(openedCanvas);
  opened.loadFromFodp(jsOverlaid);
  assert.equal(openedCanvas.slideShowSettings.showWithoutNarration, true);
  assert.equal(openedCanvas.slideShowSettings.pointerColor, "#112233");
  assert.equal(openedCanvas.slideShowSettings.loopUntilEsc, true);
  assert.equal(openedCanvas.slides.length, 3);

  console.log(JSON.stringify({
    loExportShowNarration: loParsed.showNarration,
    loExportPenRgb: loParsed.penRgb,
    phase3bShowNarration: patchedParsed.showNarration,
    phase3bPenRgb: patchedParsed.penRgb,
    loReopenHadVno: fodpHasShowSetupPatch(loReopenFodp),
    loReopenEndless: /presentation:endless=["']true["']/.test(loReopenFodp),
    jsOverlayHadVno: fodpHasShowSetupPatch(jsOverlaid),
    pythonOverlayHadVno: fodpHasShowSetupPatch(pyOverlaid),
    jsSettings,
    adapterWithoutNarration: openedCanvas.slideShowSettings.showWithoutNarration,
    adapterPointerColor: openedCanvas.slideShowSettings.pointerColor,
    adapterLoop: openedCanvas.slideShowSettings.loopUntilEsc,
    pptxBytes: patchedBytes.length,
    tempRoot
  }, null, 2));
} finally {
  // keep tempRoot for handoff inspection; OS cleans %TEMP%
}
