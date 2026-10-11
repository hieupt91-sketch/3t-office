/**
 * Probe Phase 3a / p14: does LibreOffice emit p:extLst / p14:sectionLst
 * when converting a FODP that already has vno:section-* on draw:page?
 * Not part of the unit suite. Measures before any post-process is written.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

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

const fodp = new SlidesAdapter(canvas).serializeToFodp();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-sections-p14-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, fodp, "utf8");
fs.writeFileSync(path.join(tempRoot, "source.fodp"), fodp, "utf8");

const sectionPages = [...fodp.matchAll(/<draw:page\b([^>]*)>/gi)].map((m) => m[1]);
console.log("tempRoot", tempRoot);
console.log("fodp has vno:section-id", /vno:section-id=/.test(fodp));
console.log("fodp has vno:section-name", /vno:section-name=/.test(fodp));
console.log("draw:page count", sectionPages.length);
for (const attrs of sectionPages) {
  const name = attrs.match(/draw:name=["']([^"']+)/)?.[1];
  const sid = attrs.match(/vno:section-id=["']([^"']+)/)?.[1];
  const sname = attrs.match(/vno:section-name=["']([^"']+)/)?.[1];
  console.log("  page", name, "section-id=", sid, "section-name=", sname);
}

const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
console.log("pptx", pptxPath, fs.statSync(pptxPath).size, "bytes");

const entries = listZipEntries(pptxPath).map((e) => e.name);
console.log("zip entries:\n", entries.join("\n"));

const presXml = readZipEntry(pptxPath, "ppt/presentation.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "presentation.xml"), presXml, "utf8");
console.log("\n=== presentation.xml size", presXml.length);
console.log(presXml);

const sldIds = [...presXml.matchAll(/<(?:[\w]+:)?sldId\b([^>]*)\/?\s*>/gi)].map((m) => m[0]);
console.log("\n=== sldId tags", sldIds);
console.log("has p:extLst", /<(?:[\w]+:)?extLst\b/i.test(presXml));
console.log("has p14:sectionLst", /sectionLst/i.test(presXml));
console.log("has p14 ns", /schemas\.microsoft\.com\/office\/powerpoint\/2010\/main/i.test(presXml));
console.log("has 521415D9", /521415D9-36F7-43E2-AB2F-B90AF26B5E84/i.test(presXml));
console.log("has Gioi thieu", presXml.includes("Gioi thieu"));
console.log("has Noi dung chinh", presXml.includes("Noi dung chinh"));
console.log("has vno:section", /vno:section/i.test(presXml));

const contentTypes = readZipEntry(pptxPath, "[Content_Types].xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "Content_Types.xml"), contentTypes, "utf8");
console.log("\n=== Content_Types has section?", /section/i.test(contentTypes));

console.log("\nPROBE_JSON", JSON.stringify({
  soffice,
  pptxBytes: fs.statSync(pptxPath).size,
  presentationBytes: presXml.length,
  sldIdCount: sldIds.length,
  hasExtLst: /<(?:[\w]+:)?extLst\b/i.test(presXml),
  hasSectionLst: /sectionLst/i.test(presXml),
  hasP14Ns: /schemas\.microsoft\.com\/office\/powerpoint\/2010\/main/i.test(presXml),
  hasSectionGuid: /521415D9-36F7-43E2-AB2F-B90AF26B5E84/i.test(presXml),
  hasSectionNames: presXml.includes("Gioi thieu") || presXml.includes("Noi dung chinh"),
  tempRoot
}, null, 2));
