/**
 * Live soffice: FODP (master-theme logo) → PPTX, then VN post-process
 * inserts a non-placeholder p:sp on slideMaster1.xml. Patched PPTX must
 * reopen via soffice and still carry the logo text.
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
  MASTER_LOGO_SHAPE_NAME,
  applyMasterLogoShape,
  masterHasLogoShape,
  parsePlaceholderBoxes
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
  ]
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /vno:master-theme=/);
assert.match(sourceXml, new RegExp(LOGO.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-master-logo-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

function logoShape(xml) {
  const blocks = String(xml).match(/<(?:[\w]+:)?sp\b[\s\S]*?<\/(?:[\w]+:)?sp>/gi) || [];
  return blocks.find((sp) => sp.includes(MASTER_LOGO_SHAPE_NAME)) || "";
}

function overlaps(a, b) {
  return a.x < b.x + b.cx && a.x + a.cx > b.x && a.y < b.y + b.cy && a.y + a.cy > b.y;
}

function boxOf(shapeXml) {
  const off = shapeXml.match(/<(?:[\w]+:)?off\b[^>]*>/i)?.[0] || "";
  const ext = shapeXml.match(/<(?:[\w]+:)?ext\b[^>]*>/i)?.[0] || "";
  return {
    x: Number(off.match(/\bx=["'](-?\d+)["']/i)?.[1] || 0),
    y: Number(off.match(/\by=["'](-?\d+)["']/i)?.[1] || 0),
    cx: Number(ext.match(/\bcx=["'](\d+)["']/i)?.[1] || 0),
    cy: Number(ext.match(/\bcy=["'](\d+)["']/i)?.[1] || 0)
  };
}

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loMaster = readZipEntry(pptxPath, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
  assert.match(loMaster, /<(?:p:)?ph\b[^>]*type="title"/i, "LO phải còn placeholder title");
  assert.equal(masterHasLogoShape(loMaster, LOGO), false, "LO convert chưa ghi logo (đúng giới hạn đã audit)");
  assert.equal(loMaster.includes(LOGO), false, "probe: logo text không có trên master sau hop thuần");

  const jsPatchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const jsPatchedPath = path.join(tempRoot, "js-patched.pptx");
  fs.writeFileSync(jsPatchedPath, jsPatchedBytes);

  const jsMaster = readZipEntry(jsPatchedPath, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
  assert.equal(masterHasLogoShape(jsMaster, LOGO), true, "JS patch thiếu logo shape");
  const jsSp = logoShape(jsMaster);
  assert.ok(jsSp, "thiếu p:sp đặt tên VNOfficeMasterLogo");
  assert.equal(/<(?:p:)?ph\b/i.test(jsSp), false, "logo không được mang p:ph");
  assert.match(jsSp, /id="7"/, "id kế tiếp sau probe 1–6");
  const placeholders = parsePlaceholderBoxes(jsMaster);
  const logoBox = boxOf(jsSp);
  for (const ph of placeholders) {
    assert.equal(overlaps(logoBox, ph), false, `logo đè placeholder ${JSON.stringify(ph)}`);
  }

  const roundFodp = convertWithSoffice(jsPatchedPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, appKind: "slides" });
  const roundXml = fs.readFileSync(roundFodp, "utf8");
  const logoInFodp = roundXml.includes(LOGO);
  const logoOnMasterPage = /<style:master-page\b[\s\S]*VN OFFICE • SANG TAO/.test(roundXml);
  const parsed = new SlidesAdapter(null).parseFodp(roundXml);
  assert.ok(parsed.length >= 1, `slides=${parsed.length}`);
  assert.ok(
    parsed[0].title.includes("Mo dau") || parsed[0].title.length > 0,
    `title0=${parsed[0].title}`
  );

  const pdfPath = convertWithSoffice(jsPatchedPath, "pdf", path.join(tempRoot, "pdf"), { profileDir, appKind: "slides" });
  assert.ok(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 100, "patched PPTX → PDF thất bại (file hỏng)");
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfAscii = pdfBytes.toString("latin1");
  const pdfHasLogo = pdfAscii.includes("VN OFFICE") || pdfBytes.includes(Buffer.from(LOGO, "utf8"))
    || pdfBytes.toString("utf16le").includes("VN OFFICE");

  assert.ok(
    logoInFodp || pdfHasLogo,
    "sau patch, soffice mở lại PPTX phải còn chữ logo trên FODP hoặc PDF (không được rỗng/mất)"
  );

  const pyOut = path.join(tempRoot, "py-patched.pptx");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--pptx", pptxPath,
    "--fodp", source,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyMaster = readZipEntry(pyOut, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
  assert.equal(masterHasLogoShape(pyMaster, LOGO), true, "Python twin phải ghi logo");
  assert.equal(
    applyMasterLogoShape(loMaster, { logoText: LOGO, slideCx: 10080625, slideCy: 5670550 }),
    applyMasterLogoShape(
      applyMasterLogoShape(loMaster, { logoText: LOGO, slideCx: 10080625, slideCy: 5670550 }),
      { logoText: LOGO, slideCx: 10080625, slideCy: 5670550 }
    ),
    "JS XML transform idempotent trên XML soffice thật"
  );

  console.log(JSON.stringify({
    loHadLogo: false,
    jsHadLogo: true,
    pythonHadLogo: true,
    logoHadPh: false,
    sofficeReopenFodpOk: true,
    sofficeReopenPdfOk: true,
    loRoundTripLogoInFodp: logoInFodp,
    loRoundTripLogoOnMasterPage: logoOnMasterPage,
    adapterMasterThemeLogo: parsed.masterTheme?.logoText || null,
    loRoundTripLogoInPdf: pdfHasLogo,
    pptxBytes: fs.statSync(jsPatchedPath).size
  }));
  console.log(`PASS: native PPTX master logo p:sp patched; soffice reopened FODP+PDF. fodpKept=${logoInFodp} masterPage=${logoOnMasterPage} adapterLogo=${parsed.masterTheme?.logoText || ""} pdfKept=${pdfHasLogo}`);
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
