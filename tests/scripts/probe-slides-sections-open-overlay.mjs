/**
 * Probe: after Phase 3a p14:sectionLst is in a PPTX, does soffice PPTX→FODP
 * keep any section trace on draw:page? Measures BEFORE import overlay is written.
 * Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import {
  parseFodpPages,
  parsePresentationSlideIds,
  parseSectionList,
  presentationHasSectionList
} from "../../adapters/libreoffice/slides/pptx-section-list.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) {
  console.error("LibreOffice soffice.exe not found");
  process.exit(1);
}
console.log("soffice", soffice);

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

const sourceFodp = new SlidesAdapter(canvas).serializeToFodp();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-sections-open-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceFodp, "utf8");
console.log("tempRoot", tempRoot);

const sourcePages = parseFodpPages(sourceFodp);
console.log("source FODP draw:page", sourcePages.length);
console.log("source has vno:section-id", /vno:section-id=/.test(sourceFodp));

const loPptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "lo-pptx"), {
  profileDir,
  appKind: "slides"
});
const loPres = readZipEntry(loPptxPath, "ppt/presentation.xml").toString("utf8");
fs.writeFileSync(path.join(tempRoot, "lo-presentation.xml"), loPres, "utf8");
console.log("\n=== LO FODP→PPTX presentation.xml ===");
console.log(loPres);
const loIds = parsePresentationSlideIds(loPres);
console.log("LO sldIdLst", loIds);
console.log("LO has sectionLst", presentationHasSectionList(loPres));

const patchedBytes = postProcessSlidesPptx(loPptxPath, { sourceFodp });
const patchedPath = path.join(tempRoot, "patched.pptx");
fs.writeFileSync(patchedPath, patchedBytes);
const patchedPres = readZipEntry(patchedPath, "ppt/presentation.xml").toString("utf8");
fs.writeFileSync(path.join(tempRoot, "patched-presentation.xml"), patchedPres, "utf8");
const patchedIds = parsePresentationSlideIds(patchedPres);
const patchedSections = parseSectionList(patchedPres);
console.log("\n=== Phase 3a patched presentation.xml (sectionLst only excerpt) ===");
const extMatch = patchedPres.match(/<(?:[\w]+:)?extLst[\s\S]*$/i);
console.log(extMatch ? extMatch[0] : "(no extLst)");
console.log("patched sldIdLst", patchedIds);
console.log("patched sections", JSON.stringify(patchedSections, null, 2));
console.log("patched has sectionLst", presentationHasSectionList(patchedPres));

const roundFodpPath = convertWithSoffice(patchedPath, "fodp", path.join(tempRoot, "round-fodp"), {
  profileDir,
  appKind: "slides"
});
const roundFodp = fs.readFileSync(roundFodpPath, "utf8");
fs.writeFileSync(path.join(tempRoot, "round.fodp"), roundFodp, "utf8");

const roundPages = parseFodpPages(roundFodp);
const pageOpenTags = [...roundFodp.matchAll(/<draw:page(?![-a-zA-Z])([^>]*)>/gi)].map((m) => m[0]);
const officeDocOpen = roundFodp.match(/<office:document\b[^>]*>/i)?.[0] || "";
const xmlnsVno = /xmlns:vno=/.test(officeDocOpen);
const vnoSectionId = /vno:section-id=/.test(roundFodp);
const vnoSectionName = /vno:section-name=/.test(roundFodp);
const hasGioiThieu = roundFodp.includes("Gioi thieu");
const hasNoiDung = roundFodp.includes("Noi dung chinh");
const hasSectionLstText = /sectionLst/i.test(roundFodp);
const hasP14Uri = /521415D9-36F7-43E2-AB2F-B90AF26B5E84/i.test(roundFodp);
const hasPresentation2010Ns = /schemas\.microsoft\.com\/office\/powerpoint\/2010\/main/i.test(roundFodp);

console.log("\n=== soffice PPTX→FODP office:document open tag ===");
console.log(officeDocOpen);
console.log("\n=== soffice PPTX→FODP draw:page open tags ===");
pageOpenTags.forEach((tag, i) => console.log(i, tag));

const parsed = new SlidesAdapter(null).parseFodp(roundFodp);
const parsedTitles = parsed.map((s) => s.title);
const parsedSectionIds = parsed.map((s) => s.sectionId || null);
const parsedSectionsProp = parsed.sections || [];

console.log("\n=== parseFodp after soffice PPTX→FODP ===");
console.log("slide count", parsed.length);
console.log("titles", parsedTitles);
console.log("slide.sectionId", parsedSectionIds);
console.log("parsed.sections", parsedSectionsProp);

const countMatch = patchedIds.length === roundPages.length;

console.log("\nPROBE_JSON", JSON.stringify({
  soffice,
  tempRoot,
  sourcePageCount: sourcePages.length,
  loExportHadSectionLst: presentationHasSectionList(loPres),
  loSlideIds: loIds,
  patchedHadSectionLst: presentationHasSectionList(patchedPres),
  patchedSlideIds: patchedIds,
  patchedSections: patchedSections.map((s) => ({ name: s.name, id: s.id, slideIds: s.slideIds })),
  roundFodpBytes: roundFodp.length,
  roundPageCount: roundPages.length,
  roundPageOpenTags: pageOpenTags,
  roundHasXmlnsVno: xmlnsVno,
  roundHasVnoSectionId: vnoSectionId,
  roundHasVnoSectionName: vnoSectionName,
  roundHasGioiThieu: hasGioiThieu,
  roundHasNoiDungChinh: hasNoiDung,
  roundHasSectionLstText: hasSectionLstText,
  roundHasP14Uri: hasP14Uri,
  roundHasP14Ns: hasPresentation2010Ns,
  roundPageSectionAttrs: roundPages,
  parsedSlideCount: parsed.length,
  parsedTitles,
  parsedSectionIds,
  parsedSections: parsedSectionsProp,
  sldIdCountEqualsDrawPageCount: countMatch,
  insertionHint: "stamp vno:section-id / vno:section-name on each <draw:page ...> open tag; add xmlns:vno on office:document if missing"
}, null, 2));
