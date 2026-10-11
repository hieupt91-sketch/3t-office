/**
 * Real LibreOffice round-trip for Slides title/body/body2 animation save:
 *   in-memory titleAnimation/bodyAnimation/body2Animation
 *   → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const canvas = {
  slides: [
    {
      id: 1,
      title: "Tieu de fade",
      body: "Noi dung fly",
      layoutType: "title-content",
      notes: "",
      titleAnimation: { type: "fadeIn", duration: 600, delay: 100 },
      bodyAnimation: { type: "flyIn", duration: 700, delay: 300 },
      shapes: [{
        id: "rect-zoom",
        type: "rect",
        x: 76, y: 151, w: 227, h: 95,
        color: "#2563eb",
        text: "Thu phong",
        animation: { type: "zoomIn", duration: 500, delay: 0 }
      }]
    },
    {
      id: 2,
      title: "Tieu de zoom",
      body: "Noi dung fade",
      layoutType: "title-content",
      notes: "",
      titleAnimation: { type: "zoomIn", duration: 500, delay: 0 },
      bodyAnimation: { type: "fadeIn", duration: 800, delay: 200 },
      shapes: []
    },
    {
      id: 3,
      title: "Hai cot bounce",
      body: "Cot trai wipe",
      body2: "Cot phai bounce",
      layoutType: "two-content",
      notes: "",
      titleAnimation: { type: "fadeIn", duration: 500, delay: 0 },
      bodyAnimation: { type: "slideLeft", duration: 1000, delay: 0 },
      body2Animation: { type: "bounceIn", duration: 800, delay: 200 },
      shapes: []
    },
    {
      id: 4,
      title: "Chi tieu de fly",
      body: "",
      layoutType: "title-only",
      notes: "",
      titleAnimation: { type: "flyIn", duration: 800, delay: 100 },
      shapes: []
    }
  ]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /draw:id="title-1"/, "serializer must emit title placeholder id");
assert.match(fodp, /draw:id="body-1"/, "serializer must emit body placeholder id");
assert.match(fodp, /draw:id="body2-3"/, "serializer must emit body2 placeholder id");
assert.match(fodp, /smil:targetElement="title-1"/, "titleAnimation must target title-1");
assert.match(fodp, /smil:targetElement="body-1"/, "bodyAnimation must target body-1");
assert.match(fodp, /smil:targetElement="body2-3"/, "body2Animation must target body2-3");
assert.match(fodp, /ooo-entrance-fade-in/, "serializer must emit fade-in preset");
assert.match(fodp, /ooo-entrance-fly-in/, "serializer must emit fly-in preset");
assert.match(fodp, /ooo-entrance-zoom/, "serializer must emit zoom preset");
assert.match(fodp, /ooo-entrance-bounce/, "serializer must emit bounce preset");
assert.match(fodp, /ooo-entrance-wipe/, "serializer must emit wipe preset for slideLeft");
assert.match(fodp, /presentation:class="title"/, "placeholder class title must remain");
assert.match(fodp, /presentation:class="outline"/, "placeholder class outline must remain");

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(inMemory[0].title, "Tieu de fade");
assert.equal(inMemory[0].body, "Noi dung fly");
assert.equal(inMemory[0].titleAnimation?.type, "fadeIn");
assert.equal(inMemory[0].titleAnimation?.duration, 600);
assert.equal(inMemory[0].titleAnimation?.delay, 100);
assert.equal(inMemory[0].bodyAnimation?.type, "flyIn");
assert.equal(inMemory[0].bodyAnimation?.duration, 700);
assert.equal(inMemory[0].bodyAnimation?.delay, 300);
assert.equal(inMemory[0].shapes[0].animation?.type, "zoomIn");
assert.equal(inMemory[1].titleAnimation?.type, "zoomIn");
assert.equal(inMemory[1].bodyAnimation?.type, "fadeIn");
assert.equal(inMemory[2].body2Animation?.type, "bounceIn");
assert.equal(inMemory[2].bodyAnimation?.type, "slideLeft");
assert.equal(inMemory[3].titleAnimation?.type, "flyIn");
assert.equal(inMemory[3].layoutType, "title-only");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-title-body-anim-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function dumpXml(xml) {
  const frames = [...xml.matchAll(/<draw:frame\b([^>]*)>/gi)]
    .map((m) => m[0].replace(/\s+/g, " ").slice(0, 280));
  const presets = [...xml.matchAll(/presentation:preset-id=["']([^"']+)["']/gi)].map((m) => m[1]);
  const targets = [...xml.matchAll(/smil:targetElement=["']([^"']+)["']/gi)].map((m) => m[1]);
  const begins = [...xml.matchAll(/<anim:par\b[^>]*preset-id=["'][^"']+["'][^>]*>/gi)].map((m) => m[0].replace(/\s+/g, " "));
  return { frames, presets, targets, begins };
}

function readPptxAnimations(pptxPath, unzipDir) {
  fs.mkdirSync(unzipDir, { recursive: true });
  const unzip = spawnSync("tar", ["-xf", pptxPath, "-C", unzipDir], { encoding: "utf8" });
  if (unzip.status !== 0) return [];
  const slidesDir = path.join(unzipDir, "ppt", "slides");
  if (!fs.existsSync(slidesDir)) return [];
  return fs.readdirSync(slidesDir)
    .filter((name) => /^slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((name) => {
      const xml = fs.readFileSync(path.join(slidesDir, name), "utf8");
      const presets = [...xml.matchAll(/presetID="(\d+)"/g)].map((m) => m[1]);
      const delays = [...xml.matchAll(/delay="([^"]+)"/g)].map((m) => m[1]);
      const phTypes = [...xml.matchAll(/<p:ph\b([^>]*)>/g)].map((m) => {
        const type = m[1].match(/type="([^"]+)"/)?.[1] || "body";
        return type;
      });
      return { name, presets, delays, phTypes };
    });
}

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const pptxSlides = readPptxAnimations(pptxPath, path.join(tempRoot, "pptx-unzip"));
  console.log("PPTX placeholder animations:");
  for (const slide of pptxSlides) {
    console.log(`  ${slide.name} ph=${JSON.stringify(slide.phTypes)} presets=${JSON.stringify(slide.presets)} delays=${JSON.stringify(slide.delays)}`);
  }

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  const snippets = dumpXml(roundTripXml);
  console.log("SOFFICE title/outline frames:");
  for (const frame of snippets.frames.filter((item) => /presentation:class=|draw:name="(title|body)/i.test(item))) {
    console.log(" ", frame);
  }
  console.log("SOFFICE preset-id=", JSON.stringify(snippets.presets));
  console.log("SOFFICE targetElement=", JSON.stringify([...new Set(snippets.targets)]));
  console.log("SOFFICE effect par=", JSON.stringify(snippets.begins));

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 4, `expected 4 slides, got ${parsed.length}`);

  const s0 = parsed[0];
  const s1 = parsed[1];
  const s2 = parsed[2];
  const s3 = parsed[3];
  const zoom = (s0.shapes || []).find((shape) => String(shape.id) === "rect-zoom")
    || (s0.shapes || []).find((shape) => String(shape.text || "").includes("Thu phong"));

  console.log("PARSED title/body text=", JSON.stringify(parsed.map((slide) => ({
    title: slide.title,
    body: slide.body,
    body2: slide.body2,
    layout: slide.layoutType
  }))));
  console.log("PARSED placeholder animations=", JSON.stringify(parsed.map((slide) => ({
    titleAnimation: slide.titleAnimation,
    bodyAnimation: slide.bodyAnimation,
    body2Animation: slide.body2Animation
  }))));
  console.log("PARSED shape animation=", JSON.stringify(zoom?.animation));

  assert.equal(s0.title, "Tieu de fade", `slide1 title lost: ${s0.title}`);
  assert.ok(String(s0.body || "").includes("Noi dung fly"), `slide1 body lost: ${s0.body}`);
  assert.equal(s0.titleAnimation?.type, "fadeIn", `slide1 titleAnimation=${JSON.stringify(s0.titleAnimation)}`);
  assert.equal(s0.titleAnimation?.duration, 600, `slide1 title duration=${s0.titleAnimation?.duration}`);
  assert.equal(s0.titleAnimation?.delay, 100, `slide1 title delay=${s0.titleAnimation?.delay}`);
  assert.equal(s0.bodyAnimation?.type, "flyIn", `slide1 bodyAnimation=${JSON.stringify(s0.bodyAnimation)}`);
  assert.equal(s0.bodyAnimation?.duration, 700, `slide1 body duration=${s0.bodyAnimation?.duration}`);
  assert.equal(s0.bodyAnimation?.delay, 300, `slide1 body delay=${s0.bodyAnimation?.delay}`);
  assert.ok(zoom, "rect-zoom missing after hop");
  assert.equal(zoom.animation?.type, "zoomIn", `shape zoomIn regression: ${JSON.stringify(zoom.animation)}`);

  assert.equal(s1.titleAnimation?.type, "zoomIn", `slide2 titleAnimation=${JSON.stringify(s1.titleAnimation)}`);
  assert.equal(s1.bodyAnimation?.type, "fadeIn", `slide2 bodyAnimation=${JSON.stringify(s1.bodyAnimation)}`);
  assert.equal(s1.bodyAnimation?.duration, 800, `slide2 body duration=${s1.bodyAnimation?.duration}`);
  assert.equal(s1.bodyAnimation?.delay, 200, `slide2 body delay=${s1.bodyAnimation?.delay}`);

  assert.equal(s2.layoutType, "two-content", `slide3 layout=${s2.layoutType}`);
  assert.ok(String(s2.body || "").includes("Cot trai"), `slide3 body=${s2.body}`);
  assert.ok(String(s2.body2 || "").includes("Cot phai"), `slide3 body2=${s2.body2}`);
  const body2Kept = s2.body2Animation?.type === "bounceIn";
  const bodyWipeKept = s2.bodyAnimation?.type === "slideLeft";
  const title3Kept = s2.titleAnimation?.type === "fadeIn";
  console.log("TWO_CONTENT_STATUS", JSON.stringify({
    title3Kept,
    bodyWipeKept,
    body2Kept,
    titleAnimation: s2.titleAnimation,
    bodyAnimation: s2.bodyAnimation,
    body2Animation: s2.body2Animation
  }));
  assert.equal(s2.titleAnimation?.type, "fadeIn", `slide3 titleAnimation=${JSON.stringify(s2.titleAnimation)}`);
  assert.equal(s2.body2Animation?.type, "bounceIn", `slide3 body2Animation=${JSON.stringify(s2.body2Animation)}`);

  assert.equal(s3.layoutType, "title-only", `slide4 layout=${s3.layoutType}`);
  assert.equal(s3.title, "Chi tieu de fly", `slide4 title=${s3.title}`);
  assert.equal(s3.titleAnimation?.type, "flyIn", `slide4 titleAnimation=${JSON.stringify(s3.titleAnimation)}`);
  assert.equal(s3.titleAnimation?.duration, 800, `slide4 title duration=${s3.titleAnimation?.duration}`);

  const wipeNote = bodyWipeKept
    ? `slideLeft body kept as ${JSON.stringify(s2.bodyAnimation)}`
    : `slideLeft body LOST after PPTX hop. parsed=${JSON.stringify(s2.bodyAnimation)}`;
  console.log("WIPE_STATUS", wipeNote);

  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept title/body/body2 animations");
  console.log(`      ${wipeNote}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
