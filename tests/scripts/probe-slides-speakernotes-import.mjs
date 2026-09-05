/**
 * Probe: what does soffice emit for Speaker Notes?
 *
 * Pipeline (independent of VN serializers):
 *   1. Hand-written FODP with <presentation:notes>
 *   2. soffice --convert-to pptx  → unzip, look for ppt/notesSlides/notesSlideN.xml
 *   3. soffice --convert-to fodp  (same as VN Slides open: PPTX → FODP)
 *   4. parseFodp() on that FODP
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcFodp = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-slides-notes.fodp");
const MARKERS = [
  "Nhấn mạnh số liệu quý 4",
  "Tỷ giá ngoại tệ không được đọc trước khán giả",
  "Gợi ý chuyển slide: dừng 5 giây tại sơ đồ kiến trúc"
];

function countTags(xml, tag) {
  const re = new RegExp(`<${tag}\\b`, "gi");
  return (xml.match(re) || []).length;
}

function uniqueTags(xml, prefix) {
  const set = new Set();
  const re = new RegExp(`<(${prefix}:[A-Za-z0-9._-]+)\\b`, "g");
  let match;
  while ((match = re.exec(xml)) !== null) set.add(match[1]);
  return [...set].sort();
}

function aTexts(xml) {
  const out = [];
  const re = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const t = match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
    if (t) out.push(t);
  }
  return out;
}

function odfParagraphs(xml) {
  const out = [];
  const re = /<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const t = match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
    if (t) out.push(t);
  }
  return out;
}

function presentationClasses(xml) {
  const out = [];
  const re = /<draw:frame\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const cls = match[1].match(/presentation:class=["']([^"']+)["']/i)?.[1] || "(none)";
    out.push(cls);
  }
  return out;
}

function notesBlocks(fodp) {
  const blocks = [];
  const re = /<presentation:notes\b([^>]*)>([\s\S]*?)<\/presentation:notes>/gi;
  let match;
  while ((match = re.exec(fodp)) !== null) {
    blocks.push({ attrs: match[1].trim(), inner: match[2], classes: presentationClasses(match[2]), paras: odfParagraphs(match[2]) });
  }
  return blocks;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-notes-"));
console.log("tmp", tmp);
console.log("src", srcFodp, fs.statSync(srcFodp).size, "bytes");

const srcXml = fs.readFileSync(srcFodp, "utf8");
console.log("\n========== SOURCE FODP ==========");
console.log("presentation:notes count", countTags(srcXml, "presentation:notes"));
console.log("class=notes frames", (srcXml.match(/presentation:class=["']notes["']/gi) || []).length);
for (const marker of MARKERS) {
  console.log("marker in src?", marker, srcXml.includes(marker) || srcXml.includes(marker.replace(/&/g, "&amp;")));
}

console.log("\n========== FODP → PPTX (soffice) ==========");
const pptxPath = convertWithSoffice(srcFodp, "pptx", path.join(tmp, "pptx"), {
  profileDir: path.join(tmp, "profile-pptx"),
  timeoutMs: 60000
});
const pptxDest = path.join(tmp, "sample-slides-notes.pptx");
fs.copyFileSync(pptxPath, pptxDest);
console.log("pptx", pptxPath, fs.statSync(pptxPath).size, "bytes");

const names = listZipEntries(pptxPath).map((e) => e.name);
const notesParts = names.filter((n) => /notes/i.test(n));
console.log("zip entries with 'notes':\n ", notesParts.join("\n  ") || "(none)");
console.log("all ppt/ entries:\n ", names.filter((n) => n.startsWith("ppt/")).join("\n  "));

const contentTypes = readZipEntry(pptxPath, "[Content_Types].xml")?.toString("utf8") || "";
console.log("\n[Content_Types] notesSlide?", /notesSlide/i.test(contentTypes));
console.log("notesMaster?", /notesMaster/i.test(contentTypes));

for (const part of names.filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(n))) {
  const xml = readZipEntry(pptxPath, part).toString("utf8");
  console.log(`\n----- ${part} (${xml.length} chars) -----`);
  console.log("p:notes", /<p:notes\b/i.test(xml));
  console.log("ph type=body", /<p:ph\b[^>]*type=["']body["']/i.test(xml));
  console.log("ph type=sldImg", /<p:ph\b[^>]*type=["']sldImg["']/i.test(xml));
  console.log("<a:t>:", aTexts(xml));
  for (const marker of MARKERS) {
    console.log("  has", JSON.stringify(marker), xml.includes(marker));
  }
}

for (let i = 1; i <= 3; i++) {
  const relsName = `ppt/slides/_rels/slide${i}.xml.rels`;
  const rels = readZipEntry(pptxPath, relsName)?.toString("utf8") || "";
  const notesRel = /notesSlide/i.test(rels);
  const target = rels.match(/Type="[^"]*notesSlide"[^>]*Target="([^"]+)"/i)?.[1]
    || rels.match(/Target="([^"]+)"[^>]*Type="[^"]*notesSlide"/i)?.[1]
    || null;
  console.log(`\n${relsName} notesSlide rel=${notesRel} target=${target}`);
  if (rels) console.log(rels.slice(0, 800));
}

console.log("\n========== PPTX → FODP (soffice, VN Slides open path) ==========");
const fodpPath = convertWithSoffice(pptxPath, "fodp", path.join(tmp, "fodp"), {
  profileDir: path.join(tmp, "profile-fodp"),
  timeoutMs: 60000
});
const fodpXml = fs.readFileSync(fodpPath, "utf8");
fs.writeFileSync(path.join(tmp, "roundtrip.fodp"), fodpXml, "utf8");
console.log("fodp", fodpPath, fs.statSync(fodpPath).size, "bytes", "chars", fodpXml.length);
console.log("draw tags:", uniqueTags(fodpXml, "draw").join(", "));
console.log("presentation tags:", uniqueTags(fodpXml, "presentation").join(", "));
console.log("counts", {
  page: countTags(fodpXml, "draw:page"),
  notes: countTags(fodpXml, "presentation:notes"),
  pageThumbnail: countTags(fodpXml, "draw:page-thumbnail"),
  frame: countTags(fodpXml, "draw:frame")
});
console.log("has notesMaster / Notes master-page?", /master-page[^>]*Notes|style:name=["']Notes["']/i.test(fodpXml));

const blocks = notesBlocks(fodpXml);
console.log("presentation:notes blocks", blocks.length);
blocks.forEach((block, i) => {
  console.log(`\n----- notes block ${i} attrs=${block.attrs} -----`);
  console.log("classes", block.classes);
  console.log("paragraphs", block.paras);
  console.log("snippet", block.inner.replace(/\s+/g, " ").slice(0, 1200));
});

for (const marker of MARKERS) {
  console.log("marker in FODP?", marker, fodpXml.includes(marker));
}

console.log("\n========== parseFodp() on soffice FODP ==========");
const adapter = new SlidesAdapter(null);
const slides = adapter.parseFodp(fodpXml);
console.log("slides", slides.length);
for (const [i, slide] of slides.entries()) {
  console.log(`slide[${i}]`, {
    title: slide.title,
    body: slide.body,
    notes: slide.notes,
    notesLen: (slide.notes || "").length
  });
}

console.log("\nKept probe files at", tmp);
