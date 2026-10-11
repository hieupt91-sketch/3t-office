/**
 * Probe: what does soffice emit when converting a real PPTX SmartArt
 * (ppt/diagrams/data+layout+style+colors+drawing) to FODP, and what does
 * current parseFodp() keep? Independent of VN serializers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-smartart-"));
const ownPptx = path.join(root, "tests", "fixtures", "real-office-samples", "sample-slides-smartart.pptx");

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

function texts(xml) {
  const out = [];
  const re = /<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const clean = match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
    if (clean) out.push(clean);
  }
  return out;
}

function dumpPptx(label, pptxPath) {
  console.log(`\n========== PPTX ${label} ==========`);
  console.log("path", pptxPath, fs.statSync(pptxPath).size, "bytes");
  const names = listZipEntries(pptxPath).map((e) => e.name);
  const diagram = names.filter((n) => /diagram/i.test(n));
  console.log("diagram entries:\n ", diagram.join("\n  ") || "(none)");
  const slide = readZipEntry(pptxPath, "ppt/slides/slide1.xml")?.toString("utf8") || "";
  console.log("slide1 graphicFrame", /<p:graphicFrame\b/i.test(slide));
  console.log("slide1 dgm:relIds", /<dgm:relIds\b/i.test(slide));
  console.log("slide1 diagram uri", /drawingml\/2006\/diagram/i.test(slide));
  const data = readZipEntry(pptxPath, "ppt/diagrams/data1.xml")?.toString("utf8") || "";
  const aTexts = [];
  const re = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;
  let match;
  while ((match = re.exec(data)) !== null) {
    const t = match[1].replace(/<[^>]+>/g, "").trim();
    if (t) aTexts.push(t);
  }
  console.log("data1.xml <a:t>:", aTexts);
  console.log("data1 drawing ext", /dataModelExt|diagramDrawing/i.test(data));
  const drawing = readZipEntry(pptxPath, "ppt/diagrams/drawing1.xml")?.toString("utf8") || "";
  console.log("drawing1.xml present", drawing.length > 0, "dsp:sp", countTags(drawing, "dsp:sp"));
}

function dumpFodp(label, fodpXml) {
  console.log(`\n========== FODP ${label} ==========`);
  console.log("chars", fodpXml.length);
  console.log("draw tags:", uniqueTags(fodpXml, "draw").join(", "));
  console.log("counts", {
    page: countTags(fodpXml, "draw:page"),
    g: countTags(fodpXml, "draw:g"),
    rect: countTags(fodpXml, "draw:rect"),
    ellipse: countTags(fodpXml, "draw:ellipse"),
    custom: countTags(fodpXml, "draw:custom-shape"),
    connector: countTags(fodpXml, "draw:connector"),
    line: countTags(fodpXml, "draw:line"),
    frame: countTags(fodpXml, "draw:frame"),
    image: countTags(fodpXml, "draw:image"),
    polygon: countTags(fodpXml, "draw:polygon"),
    path: countTags(fodpXml, "draw:path"),
    caption: countTags(fodpXml, "draw:caption")
  });
  console.log("has svg:desc", /<svg:desc\b/i.test(fodpXml));
  console.log("has smartart/diagram/dgm", /smartart|diagram|dgm:/i.test(fodpXml));
  console.log("text:p:", texts(fodpXml));
  const page = fodpXml.match(/<draw:page(?![-a-zA-Z])[\s\S]*?<\/draw:page>/i)?.[0] || "";
  console.log("page snippet:\n", page.slice(0, 2500).replace(/\s+/g, " "));
}

function dumpParse(label, fodpXml) {
  const adapter = new SlidesAdapter(null);
  const slides = adapter.parseFodp(fodpXml);
  console.log(`\n========== parseFodp ${label} ==========`);
  console.log("slides", slides.length);
  for (const [i, slide] of slides.entries()) {
    const shapes = slide.shapes || [];
    console.log(`slide[${i}] title=${JSON.stringify(slide.title)} body=${JSON.stringify(slide.body)} shapes=${shapes.length}`);
    for (const shape of shapes) {
      console.log(" ", {
        id: shape.id,
        type: shape.type,
        text: shape.text,
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        color: shape.color,
        diagramGroupId: shape.diagramGroupId || null,
        diagramRole: shape.diagramRole || null,
        diagramLevel: shape.diagramLevel ?? null,
        sourceId: shape.sourceId || null,
        targetId: shape.targetId || null
      });
    }
  }
  return slides;
}

function convert(pptxPath, tag) {
  const outDir = path.join(tmp, tag);
  const fodpPath = convertWithSoffice(pptxPath, "fodp", outDir, {
    profileDir: path.join(tmp, `profile-${tag}`),
    timeoutMs: 60000
  });
  const xml = fs.readFileSync(fodpPath, "utf8");
  fs.writeFileSync(path.join(tmp, `${tag}.fodp`), xml, "utf8");
  console.log("converted", fodpPath, fs.statSync(fodpPath).size, "bytes");
  return xml;
}

try {
  console.log("tmp", tmp);
  if (!fs.existsSync(ownPptx)) {
    throw new Error(`Missing fixture ${ownPptx}. Run node tests/scripts/pack-slides-smartart-pptx.mjs`);
  }
  dumpPptx("own-fixture", ownPptx);
  const ownFodp = convert(ownPptx, "own");
  dumpFodp("own-fixture via soffice", ownFodp);
  dumpParse("own-fixture via soffice", ownFodp);
  console.log("\nKept probe files at", tmp);
} catch (error) {
  console.error("PROBE FAIL", error);
  process.exitCode = 1;
}
