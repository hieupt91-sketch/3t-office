/**
 * Probe: after Phase 3b patches p:showPr (showNarration=0 / p:penClr) into a
 * PPTX, does soffice PPTX→FODP keep vno:without-narration / vno:pointer-color
 * so parseFodp() can restore the Set Up Show dialog? Measures BEFORE import
 * overlay is written. Not part of the unit suite.
 *
 * Loop is out of scope: LibreOffice already maps @loop ↔ presentation:endless
 * (loRoundTripEndless=true in Phase 3b). This probe re-measures that too.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import {
  parseShowProperties,
  parseShowSettingsFromFodp
} from "../../adapters/libreoffice/slides/pptx-show-properties.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) {
  console.error("LibreOffice soffice.exe not found");
  process.exit(1);
}
console.log("soffice", soffice);

const canvas = {
  slideShowSettings: {
    loopUntilEsc: true,
    showWithoutNarration: true,
    pointerColor: "#112233"
  },
  getSlideShowSettings() {
    return this.slideShowSettings;
  },
  slides: [
    { id: 1, title: "Mo dau", body: "A1", layoutType: "title-content", notes: "", shapes: [] },
    { id: 2, title: "Noi dung", body: "A2", layoutType: "title-content", notes: "", shapes: [] },
    { id: 3, title: "Ket luan", body: "A3", layoutType: "title-content", notes: "", shapes: [] }
  ]
};

const sourceFodp = new SlidesAdapter(canvas).serializeToFodp();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-setup-show-open-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceFodp, "utf8");
fs.writeFileSync(path.join(tempRoot, "source.fodp"), sourceFodp, "utf8");
console.log("tempRoot", tempRoot);

const sourceSettings = parseShowSettingsFromFodp(sourceFodp);
const sourceSettingsTag = sourceFodp.match(/<presentation:settings\b[^>]*\/?>/i)?.[0] || "";
console.log("\n=== source FODP presentation:settings ===");
console.log(sourceSettingsTag);
console.log("source settings", sourceSettings);

const loPptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "lo-pptx"), {
  profileDir,
  appKind: "slides"
});
const loPres = readZipEntry(loPptxPath, "ppt/presentation.xml").toString("utf8");
const loProps = readZipEntry(loPptxPath, "ppt/presProps.xml").toString("utf8");
fs.writeFileSync(path.join(tempRoot, "lo-presentation.xml"), loPres, "utf8");
fs.writeFileSync(path.join(tempRoot, "lo-presProps.xml"), loProps, "utf8");
console.log("\n=== LO FODP→PPTX ppt/presentation.xml (showPr?) ===");
console.log("bytes", loPres.length, "hasShowPr", /<(?:[\w]+:)?showPr\b/i.test(loPres));
console.log("\n=== LO FODP→PPTX ppt/presProps.xml ===");
console.log(loProps);
const loParsed = parseShowProperties(loProps);
console.log("LO parseShowProperties", loParsed);

const patchedBytes = postProcessSlidesPptx(loPptxPath, { sourceFodp });
const patchedPath = path.join(tempRoot, "patched.pptx");
fs.writeFileSync(patchedPath, patchedBytes);
const patchedPres = readZipEntry(patchedPath, "ppt/presentation.xml").toString("utf8");
const patchedProps = readZipEntry(patchedPath, "ppt/presProps.xml").toString("utf8");
fs.writeFileSync(path.join(tempRoot, "patched-presentation.xml"), patchedPres, "utf8");
fs.writeFileSync(path.join(tempRoot, "patched-presProps.xml"), patchedProps, "utf8");
console.log("\n=== Phase 3b patched ppt/presProps.xml ===");
console.log(patchedProps);
const patchedParsed = parseShowProperties(patchedProps);
console.log("patched parseShowProperties", patchedParsed);
console.log("patched presentation.xml has showPr", /<(?:[\w]+:)?showPr\b/i.test(patchedPres));
console.log("patched presProps has vno:", /vno:/i.test(patchedProps));

const roundFodpPath = convertWithSoffice(patchedPath, "fodp", path.join(tempRoot, "round-fodp"), {
  profileDir,
  appKind: "slides"
});
const roundFodp = fs.readFileSync(roundFodpPath, "utf8");
fs.writeFileSync(path.join(tempRoot, "round.fodp"), roundFodp, "utf8");

const officeDocOpen = roundFodp.match(/<office:document\b[^>]*>/i)?.[0] || "";
const settingsTags = [...roundFodp.matchAll(/<presentation:settings\b[^>]*\/?>/gi)].map((m) => m[0]);
const roundSettings = parseShowSettingsFromFodp(roundFodp);
const hasVnoWithoutNarration = /vno:without-narration=/i.test(roundFodp);
const hasVnoPointerColor = /vno:pointer-color=/i.test(roundFodp);
const hasXmlnsVno = /xmlns:vno=/i.test(roundFodp);
const hasEndless = /presentation:endless\s*=\s*["']true["']/i.test(roundFodp);
const has112233 = /112233/i.test(roundFodp);
const hasShowNarrationText = /showNarration/i.test(roundFodp);
const hasPenClrText = /penClr/i.test(roundFodp);

console.log("\n=== soffice PPTX→FODP office:document open (truncated xmlns) ===");
console.log(officeDocOpen.slice(0, 400) + (officeDocOpen.length > 400 ? "…" : ""));
console.log("xmlns:vno", /xmlns:vno=/i.test(officeDocOpen));
console.log("\n=== soffice PPTX→FODP presentation:settings tags ===");
if (!settingsTags.length) console.log("(none)");
settingsTags.forEach((tag, i) => console.log(i, tag));

const parsed = new SlidesAdapter(null).parseFodp(roundFodp);
const parsedSettings = parsed.slideShowSettings || null;

console.log("\n=== parseFodp after soffice PPTX→FODP ===");
console.log("slide count", parsed.length);
console.log("titles", parsed.map((s) => s.title));
console.log("slideShowSettings", parsedSettings);

console.log("\nPROBE_JSON", JSON.stringify({
  soffice,
  tempRoot,
  sourceFodpBytes: sourceFodp.length,
  sourceSettingsTag,
  sourceSettings,
  loPptxBytes: fs.statSync(loPptxPath).size,
  loPresHasShowPr: /<(?:[\w]+:)?showPr\b/i.test(loPres),
  loShowNarration: loParsed.showNarration,
  loPenRgb: loParsed.penRgb,
  loLoop: loParsed.loop,
  patchedPptxBytes: patchedBytes.length,
  patchedShowNarration: patchedParsed.showNarration,
  patchedPenRgb: patchedParsed.penRgb,
  patchedLoop: patchedParsed.loop,
  patchedPresHasShowPr: /<(?:[\w]+:)?showPr\b/i.test(patchedPres),
  patchedPropsHasVno: /vno:/i.test(patchedProps),
  patchedPresPropsXml: patchedProps,
  roundFodpBytes: roundFodp.length,
  roundSettingsTags: settingsTags,
  roundSettings,
  roundHasXmlnsVno: hasXmlnsVno,
  roundHasVnoWithoutNarration: hasVnoWithoutNarration,
  roundHasVnoPointerColor: hasVnoPointerColor,
  roundHasEndless: hasEndless,
  roundHas112233: has112233,
  roundHasShowNarrationText: hasShowNarrationText,
  roundHasPenClrText: hasPenClrText,
  parsedSlideCount: parsed.length,
  parsedSettings,
  loRoundTripEndless: hasEndless,
  loRoundTripVno: hasVnoWithoutNarration || hasVnoPointerColor,
  insertionHint:
    "stamp vno:without-narration / vno:pointer-color on <presentation:settings> from original ppt/presProps.xml; do not overlay @loop"
}, null, 2));
