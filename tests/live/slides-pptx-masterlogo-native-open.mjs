/**
 * Live soffice: Save master logo → PPTX (Phase 2b post-process) →
 * Open that PPTX (soffice PPTX→FODP + overlay) →
 * FODP has vno:master-theme logoText/accentColor/fontFamily and parseFodp
 * restores canvas.masterTheme.
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
  MASTER_LOGO_SHAPE_NAME,
  fodpHasMasterLogo,
  masterHasLogoShape,
  parseMasterLogoFromFodp
} from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");
const LOGO = "VN OFFICE • SANG TAO";

const canvas = {
  masterTheme: {
    id: "corporate-red",
    fontFamily: "'Times New Roman', serif",
    titleColor: "#991b1b",
    bodyColor: "#1f2937",
    accentColor: "#b53818",
    bgColor: "#fffdfa",
    logoText: LOGO,
    footerText: "Bao mat noi bo"
  },
  slides: [
    { id: 1, title: "Mo dau", body: "Slide mot", layoutType: "title-content", notes: "", shapes: [] }
  ],
  applySlideMaster(theme) {
    this.masterTheme = { ...this.masterTheme, ...theme };
  },
  selectSlide() {}
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /vno:master-theme=/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-masterlogo-open-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loMaster = readZipEntry(pptxPath, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
  assert.equal(masterHasLogoShape(loMaster, LOGO), false, "LO FODP→PPTX chưa ghi logo");

  const patchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const patchedPath = path.join(tempRoot, "saved.pptx");
  fs.writeFileSync(patchedPath, patchedBytes);
  const patchedMaster = readZipEntry(patchedPath, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
  assert.equal(masterHasLogoShape(patchedMaster, LOGO), true, "Phase 2b Lưu PPTX phải có VNOfficeMasterLogo");
  assert.match(patchedMaster, new RegExp(`name="${MASTER_LOGO_SHAPE_NAME}"`));

  const reopenFodpPath = convertWithSoffice(patchedPath, "fodp", path.join(tempRoot, "reopen-fodp"), {
    profileDir,
    appKind: "slides"
  });
  const loReopenFodp = fs.readFileSync(reopenFodpPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "lo-reopen.fodp"), loReopenFodp, "utf8");
  assert.equal(fodpHasMasterLogo(loReopenFodp), false, "LibreOffice PPTX→FODP vẫn không map vno:master-theme (lý do overlay)");
  assert.equal(/vno:master-theme\s*=/i.test(loReopenFodp), false);
  assert.equal(/grMasterLogo/.test(loReopenFodp), false);
  const loParsed = new SlidesAdapter(null).parseFodp(loReopenFodp);
  assert.equal(loParsed.masterTheme?.logoText || null, null);

  const jsOverlaid = overlaySlidesPptxFodp(patchedPath, loReopenFodp);
  assert.equal(fodpHasMasterLogo(jsOverlaid), true, "JS overlay phải gắn vno:master-theme");
  const jsLogo = parseMasterLogoFromFodp(jsOverlaid);
  assert.equal(jsLogo.logoText, LOGO);
  assert.equal(jsLogo.accentColor, "#b53818");
  assert.equal(jsLogo.fontFamily, "Times New Roman");

  const parsed = new SlidesAdapter(null).parseFodp(jsOverlaid);
  assert.ok(parsed.length >= 1);
  assert.equal(parsed.masterTheme?.logoText, LOGO);
  assert.equal(parsed.masterTheme?.accentColor, "#b53818");
  assert.equal(parsed.masterTheme?.fontFamily, "Times New Roman");

  const openCanvas = {
    masterTheme: { logoText: "KHAC", accentColor: "#000000", fontFamily: "Arial", bgColor: "#ffffff" },
    slides: [],
    applySlideMaster(theme) {
      this.masterTheme = { ...this.masterTheme, ...theme };
    },
    selectSlide() {}
  };
  new SlidesAdapter(openCanvas).loadFromFodp(jsOverlaid);
  assert.equal(openCanvas.masterTheme.logoText, LOGO);
  assert.equal(openCanvas.masterTheme.accentColor, "#b53818");
  assert.equal(openCanvas.masterTheme.fontFamily, "Times New Roman");

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
    loExportHadLogoShape: false,
    phase2bHadLogoShape: true,
    loReopenHadVnoMasterTheme: false,
    jsOverlayHadVnoMasterTheme: true,
    pythonOverlayHadVnoMasterTheme: true,
    jsLogo,
    adapterMasterThemeLogo: parsed.masterTheme?.logoText,
    adapterMasterThemeAccent: parsed.masterTheme?.accentColor,
    adapterMasterThemeFont: parsed.masterTheme?.fontFamily,
    canvasLogo: openCanvas.masterTheme.logoText,
    pptxBytes: patchedBytes.length,
    tempRoot
  }, null, 2));
} finally {
  // keep tempRoot for handoff inspection; OS cleans %TEMP%
}
