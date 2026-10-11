/**
 * Probe Phase 2b: FODP with master-theme → soffice PPTX → dump slideMaster1.xml.
 * Not part of the unit suite. Measures whether LO keeps the logo and what
 * placeholder ids/EMU the master already uses.
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
  masterTheme: {
    id: "corporate-red",
    fontFamily: "'Times New Roman', serif",
    titleColor: "#991b1b",
    bodyColor: "#1f2937",
    accentColor: "#b53818",
    bgColor: "#fffdfa",
    logoText: "VN OFFICE • SANG TAO",
    footerText: "Bao mat noi bo"
  },
  slides: [
    { id: 1, title: "Mo dau", body: "Slide mot", layoutType: "title-content", notes: "", shapes: [] }
  ]
};

const fodp = new SlidesAdapter(canvas).serializeToFodp();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-master-logo-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, fodp, "utf8");
fs.writeFileSync(path.join(tempRoot, "source.fodp"), fodp, "utf8");

console.log("tempRoot", tempRoot);
console.log("fodp has vno:master-theme", /vno:master-theme=/.test(fodp));
console.log("fodp has logo text", fodp.includes("VN OFFICE • SANG TAO"));
console.log("fodp master-page snippet:\n", (fodp.match(/<style:master-page[\s\S]*?<\/style:master-page>/i) || [""])[0]);

const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
console.log("pptx", pptxPath, fs.statSync(pptxPath).size, "bytes");

const entries = listZipEntries(pptxPath).map((e) => e.name);
console.log("zip entries:\n", entries.join("\n"));

const masterXml = readZipEntry(pptxPath, "ppt/slideMasters/slideMaster1.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "slideMaster1.xml"), masterXml, "utf8");
console.log("\n=== slideMaster1.xml size", masterXml.length);
console.log(masterXml);

const presXml = readZipEntry(pptxPath, "ppt/presentation.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "presentation.xml"), presXml, "utf8");
console.log("\n=== sldSz", presXml.match(/<(?:p:)?sldSz\b[^>]*>/i)?.[0]);

const ids = [...masterXml.matchAll(/<(?:p:)?cNvPr\b([^>]*)>/gi)].map((m) => m[0]);
console.log("\n=== cNvPr", ids);
const ph = [...masterXml.matchAll(/<(?:p:)?ph\b([^>]*)\/?>/gi)].map((m) => m[0]);
console.log("=== ph", ph);
const offs = [...masterXml.matchAll(/<(?:a:)?off\b[^>]*>/gi)].map((m) => m[0]);
const exts = [...masterXml.matchAll(/<(?:a:)?ext\b[^>]*>/gi)].map((m) => m[0]);
console.log("=== off", offs);
console.log("=== ext", exts);
console.log("logo in master?", masterXml.includes("VN OFFICE • SANG TAO"));
console.log("p:ph count", (masterXml.match(/<(?:p:)?ph\b/gi) || []).length);
console.log("p:sp count", (masterXml.match(/<(?:p:)?sp\b/gi) || []).length);

const layoutXml = readZipEntry(pptxPath, "ppt/slideLayouts/slideLayout1.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "slideLayout1.xml"), layoutXml, "utf8");
console.log("\n=== layout1 showMasterSp / hide", layoutXml.match(/showMasterSp=["'][^"']+["']/i)?.[0], layoutXml.includes("VN OFFICE"));

const slideXml = readZipEntry(pptxPath, "ppt/slides/slide1.xml")?.toString("utf8") || "";
fs.writeFileSync(path.join(tempRoot, "slide1.xml"), slideXml, "utf8");
console.log("logo on slide1?", slideXml.includes("VN OFFICE • SANG TAO"));

const roundPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, appKind: "slides" });
const roundXml = fs.readFileSync(roundPath, "utf8");
fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundXml, "utf8");
console.log("\n=== PPTX→FODP logo?", roundXml.includes("VN OFFICE • SANG TAO"));
console.log("vno:master-theme after hop?", /vno:master-theme=/.test(roundXml));
const masterPage = roundXml.match(/<style:master-page[\s\S]*?<\/style:master-page>/i)?.[0] || "";
console.log("roundtrip master-page:\n", masterPage.slice(0, 2000));

console.log("\nKEPT", tempRoot);
