/**
 * Probe: after Phase 2b inserts VNOfficeMasterLogo into PPTX, does soffice
 * PPTX→FODP keep vno:master-theme / grMasterLogo so parseFodp() can restore
 * canvas.masterTheme.logoText? Measures BEFORE import overlay is written.
 * Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import {
  MASTER_LOGO_SHAPE_NAME,
  masterHasLogoShape,
  parseMasterLogoFromFodp
} from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) {
  console.error("LibreOffice soffice.exe not found");
  process.exit(1);
}
console.log("soffice", soffice);

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

const sourceFodp = new SlidesAdapter(canvas).serializeToFodp();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-masterlogo-open-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceFodp, "utf8");
fs.writeFileSync(path.join(tempRoot, "source.fodp"), sourceFodp, "utf8");
console.log("tempRoot", tempRoot);
console.log("source FODP bytes", Buffer.byteLength(sourceFodp, "utf8"));
console.log("source has vno:master-theme", /vno:master-theme=/.test(sourceFodp));
console.log("source has grMasterLogo", /grMasterLogo/.test(sourceFodp));
console.log("source has logo text", sourceFodp.includes(LOGO));
console.log("source parseMasterLogoFromFodp", parseMasterLogoFromFodp(sourceFodp));

const loPptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "lo-pptx"), {
  profileDir,
  appKind: "slides"
});
const loMaster = readZipEntry(loPptxPath, "ppt/slideMasters/slideMaster1.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "lo-slideMaster1.xml"), loMaster, "utf8");
console.log("\n=== LO FODP→PPTX slideMaster1.xml ===");
console.log("size", loMaster.length);
console.log("has VNOfficeMasterLogo", loMaster.includes(MASTER_LOGO_SHAPE_NAME));
console.log("has logo text", loMaster.includes(LOGO));
console.log("masterHasLogoShape", masterHasLogoShape(loMaster, LOGO));
console.log("p:sp count", (loMaster.match(/<(?:[\w]+:)?sp\b/gi) || []).length);
console.log("p:ph count", (loMaster.match(/<(?:[\w]+:)?ph\b/gi) || []).length);

const patchedBytes = postProcessSlidesPptx(loPptxPath, { sourceFodp });
const patchedPath = path.join(tempRoot, "phase2b.pptx");
fs.writeFileSync(patchedPath, patchedBytes);
const patchedMaster = readZipEntry(patchedPath, "ppt/slideMasters/slideMaster1.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "phase2b-slideMaster1.xml"), patchedMaster, "utf8");
console.log("\n=== Phase 2b patched PPTX slideMaster1.xml ===");
console.log("size", patchedMaster.length, "pptxBytes", patchedBytes.length);
console.log("has VNOfficeMasterLogo", patchedMaster.includes(MASTER_LOGO_SHAPE_NAME));
console.log("has logo text", patchedMaster.includes(LOGO));
console.log("masterHasLogoShape", masterHasLogoShape(patchedMaster, LOGO));
const namedBlocks = (patchedMaster.match(/<(?:[\w]+:)?sp\b[\s\S]*?<\/(?:[\w]+:)?sp>/gi) || [])
  .filter((sp) => sp.includes(MASTER_LOGO_SHAPE_NAME));
console.log("named VNOfficeMasterLogo p:sp count", namedBlocks.length);
const named = namedBlocks[0] || "";
console.log("named has p:ph", /<(?:[\w]+:)?ph\b/i.test(named));
console.log("named a:t", named.match(/<(?:[\w]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?t>/i)?.[1] || null);
console.log("named srgbClr", named.match(/<(?:[\w]+:)?srgbClr\b[^>]*val=["']([^"']+)["']/i)?.[1] || null);
console.log("named latin typeface", named.match(/<(?:[\w]+:)?latin\b[^>]*typeface=["']([^"']+)["']/i)?.[1] || null);

const reopenFodpPath = convertWithSoffice(patchedPath, "fodp", path.join(tempRoot, "reopen-fodp"), {
  profileDir,
  appKind: "slides"
});
const loReopenFodp = fs.readFileSync(reopenFodpPath, "utf8");
fs.writeFileSync(path.join(tempRoot, "lo-reopen.fodp"), loReopenFodp, "utf8");
const masterPage = (loReopenFodp.match(/<style:master-page\b[\s\S]*?<\/style:master-page>/i) || [""])[0];
fs.writeFileSync(path.join(tempRoot, "lo-reopen-master-page.xml"), masterPage, "utf8");

const parsed = new SlidesAdapter(null).parseFodp(loReopenFodp);
const fromFodp = parseMasterLogoFromFodp(loReopenFodp);

console.log("\n=== soffice PPTX→FODP (Phase 2b PPTX) ===");
console.log("fodp bytes", Buffer.byteLength(loReopenFodp, "utf8"));
console.log("xmlns:vno", /xmlns:vno\s*=/i.test(loReopenFodp));
console.log("vno:master-theme", /vno:master-theme\s*=/i.test(loReopenFodp));
console.log("grMasterLogo", /grMasterLogo/.test(loReopenFodp));
console.log("logo text anywhere", loReopenFodp.includes(LOGO));
console.log("logo text on master-page", masterPage.includes(LOGO));
console.log("parseMasterLogoFromFodp", fromFodp);
console.log("parseFodp().masterTheme", parsed.masterTheme || null);
console.log("parseFodp().length", parsed.length);
console.log("slide0.title", parsed[0]?.title || null);

console.log("\n=== master-page snippet ===");
console.log(masterPage.slice(0, 2500));

const zipNames = listZipEntries(patchedPath).map((e) => e.name).filter((n) => /slideMaster/i.test(n));
console.log("\n=== zip slideMaster entries ===", zipNames);

const summary = {
  tempRoot,
  loExportHadLogoShape: masterHasLogoShape(loMaster, LOGO),
  phase2bHadLogoShape: masterHasLogoShape(patchedMaster, LOGO),
  namedLogoCount: namedBlocks.length,
  namedLogoHasPh: /<(?:[\w]+:)?ph\b/i.test(named),
  namedLogoText: named.match(/<(?:[\w]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?t>/i)?.[1] || null,
  namedAccent: named.match(/<(?:[\w]+:)?srgbClr\b[^>]*val=["']([^"']+)["']/i)?.[1] || null,
  namedFont: named.match(/<(?:[\w]+:)?latin\b[^>]*typeface=["']([^"']+)["']/i)?.[1] || null,
  loReopenHasVnoMasterTheme: /vno:master-theme\s*=/i.test(loReopenFodp),
  loReopenHasGrMasterLogo: /grMasterLogo/.test(loReopenFodp),
  loReopenHasXmlnsVno: /xmlns:vno\s*=/i.test(loReopenFodp),
  loReopenHasLogoText: loReopenFodp.includes(LOGO),
  loReopenLogoOnMasterPage: masterPage.includes(LOGO),
  parseMasterLogoFromFodp: fromFodp,
  adapterMasterTheme: parsed.masterTheme || null,
  adapterMasterThemeLogo: parsed.masterTheme?.logoText || null,
  adapterMasterThemeAccent: parsed.masterTheme?.accentColor || null,
  adapterMasterThemeFont: parsed.masterTheme?.fontFamily || null
};
console.log("\n=== SUMMARY JSON ===");
console.log(JSON.stringify(summary, null, 2));
