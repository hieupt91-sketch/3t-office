/**
 * Real LibreOffice round-trip for Slides transition + shape animation save:
 *   in-memory transition/animation → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
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
      title: "Fade va Fly In",
      body: "Slide mot",
      layoutType: "title-content",
      notes: "",
      transition: { type: "fade", duration: 500 },
      shapes: [{
        id: "rect-fly",
        type: "rect",
        x: 76, y: 151, w: 227, h: 95,
        color: "#2563eb",
        text: "Bay vao",
        animation: { type: "flyIn", duration: 800, delay: 200 }
      }]
    },
    {
      id: 2,
      title: "Truot va Fade In",
      body: "Slide hai",
      layoutType: "title-content",
      notes: "",
      transition: { type: "slide", duration: 500 },
      shapes: [{
        id: "rect-fade",
        type: "rect",
        x: 76, y: 151, w: 227, h: 95,
        color: "#0f766e",
        text: "Mo dan",
        animation: { type: "fadeIn", duration: 500, delay: 0 }
      }]
    },
    {
      id: 3,
      title: "Zoom va Zoom In",
      body: "Slide ba",
      layoutType: "title-content",
      notes: "",
      transition: { type: "zoom", duration: 800 },
      shapes: [{
        id: "rect-zoom",
        type: "rect",
        x: 76, y: 151, w: 227, h: 95,
        color: "#dc2626",
        text: "Thu phong",
        animation: { type: "zoomIn", duration: 500, delay: 0 }
      }]
    },
    {
      id: 4,
      title: "Flip va Bounce",
      body: "Slide bon",
      layoutType: "title-content",
      notes: "",
      transition: { type: "flip", duration: 1000 },
      shapes: [{
        id: "rect-bounce",
        type: "rect",
        x: 76, y: 151, w: 227, h: 95,
        color: "#7c3aed",
        text: "Nay nhe",
        animation: { type: "bounceIn", duration: 500, delay: 0 }
      }]
    }
  ]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /smil:type="fade"/, "serializer must emit fade transition");
assert.match(fodp, /smil:type="pushWipe"/, "serializer must emit pushWipe for VN slide transition");
assert.match(fodp, /smil:type="irisWipe"/, "serializer must emit irisWipe for VN zoom (PPTX-safe)");
assert.match(fodp, /smil:type="fadeOverColor"/, "serializer must emit fadeOverColor for VN flip");
assert.match(fodp, /ooo-entrance-fly-in/, "serializer must emit fly-in preset");
assert.match(fodp, /ooo-entrance-fade-in/, "serializer must emit fade-in preset");
assert.match(fodp, /ooo-entrance-zoom/, "serializer must emit zoom preset");
assert.match(fodp, /ooo-entrance-bounce/, "serializer must emit bounce preset");
assert.match(fodp, /<anim:transitionFilter\b/, "serializer must emit anim:transitionFilter");

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(inMemory[0].transition?.type, "fade");
assert.equal(inMemory[0].shapes[0].animation?.type, "flyIn");
assert.equal(inMemory[3].transition?.type, "flip", "in-memory FODP must keep flip as fadeOverColor");
assert.equal(inMemory[3].shapes[0].animation?.type, "bounceIn");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-trans-anim-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function dumpXml(xml) {
  const styles = [...xml.matchAll(/<style:style[^>]*style:family="drawing-page"[\s\S]*?<\/style:style>/gi)]
    .map((m) => m[0].replace(/\s+/g, " ").slice(0, 320));
  const filters = [...xml.matchAll(/<anim:transitionFilter\b[^/]*\/?>/gi)].map((m) => m[0]);
  const presets = [...xml.matchAll(/presentation:preset-id=["']([^"']+)["']/gi)].map((m) => m[1]);
  const begins = [...xml.matchAll(/<anim:par\b[^>]*preset-id=["'][^"']+["'][^>]*>/gi)].map((m) => m[0]);
  return { styles, filters, presets, begins };
}

function shapeById(slide, id) {
  return (slide.shapes || []).find((shape) => String(shape.id) === String(id));
}

function readPptxTransitions(pptxPath, unzipDir) {
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
      const trans = xml.match(/<p:transition[\s\S]*?<\/p:transition>|<p:transition\b[^/]*\/>/);
      const presets = [...xml.matchAll(/presetID="(\d+)"/g)].map((m) => m[1]);
      const delays = [...xml.matchAll(/delay="([^"]+)"/g)].map((m) => m[1]);
      return { name, transition: trans ? trans[0] : "NONE", presets, delays };
    });
}

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const pptxSlides = readPptxTransitions(pptxPath, path.join(tempRoot, "pptx-unzip"));
  console.log("PPTX transitions:");
  for (const slide of pptxSlides) {
    console.log(`  ${slide.name} trans=${slide.transition} presets=${JSON.stringify(slide.presets)} delays=${JSON.stringify(slide.delays)}`);
  }

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  const snippets = dumpXml(roundTripXml);
  console.log("SOFFICE drawing-page styles:");
  for (const style of snippets.styles) console.log(" ", style);
  console.log("SOFFICE transitionFilter=", JSON.stringify(snippets.filters));
  console.log("SOFFICE preset-id=", JSON.stringify(snippets.presets));
  console.log("SOFFICE effect par=", JSON.stringify(snippets.begins));

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 4, `expected 4 slides, got ${parsed.length}`);

  const s0 = parsed[0];
  const s1 = parsed[1];
  const s2 = parsed[2];
  const s3 = parsed[3];
  const fly = shapeById(s0, "rect-fly") || s0.shapes.find((shape) => String(shape.text || "").includes("Bay"));
  const fade = shapeById(s1, "rect-fade") || s1.shapes.find((shape) => String(shape.text || "").includes("Mo dan"));
  const zoom = shapeById(s2, "rect-zoom") || s2.shapes.find((shape) => String(shape.text || "").includes("Thu phong"));
  const bounce = shapeById(s3, "rect-bounce") || s3.shapes.find((shape) => String(shape.text || "").includes("Nay"));

  console.log("PARSED transitions=", JSON.stringify(parsed.map((slide) => slide.transition)));
  console.log("PARSED animations=", JSON.stringify({
    fly: fly?.animation,
    fade: fade?.animation,
    zoom: zoom?.animation,
    bounce: bounce?.animation
  }));

  assert.equal(s0.transition?.type, "fade", `slide1 transition=${JSON.stringify(s0.transition)}`);
  assert.equal(s0.transition?.duration, 500, `slide1 fade duration=${s0.transition?.duration} (must survive on anim:transitionFilter)`);
  assert.ok(fly, "rect-fly missing after hop");
  assert.equal(fly.animation?.type, "flyIn", `fly animation=${JSON.stringify(fly.animation)}`);
  assert.equal(fly.animation?.duration, 800, `fly duration=${fly.animation?.duration}`);
  assert.equal(fly.animation?.delay, 200, `fly delay=${fly.animation?.delay}`);

  assert.equal(s1.transition?.type, "slide", `slide2 pushWipe/barWipe must map to VN slide, got ${JSON.stringify(s1.transition)}`);
  assert.ok(fade, "rect-fade missing after hop");
  assert.equal(fade.animation?.type, "fadeIn", `fade animation=${JSON.stringify(fade.animation)}`);
  assert.equal(fade.animation?.duration, 500, `fadeIn duration=${fade.animation?.duration}`);

  assert.equal(s2.transition?.type, "zoom", `slide3 irisWipe/zoom=${JSON.stringify(s2.transition)}`);
  assert.equal(s2.transition?.duration, 800, `slide3 zoom duration=${s2.transition?.duration}`);
  assert.ok(zoom, "rect-zoom missing after hop");
  assert.equal(zoom.animation?.type, "zoomIn", `zoom animation=${JSON.stringify(zoom.animation)}`);
  assert.equal(zoom.animation?.duration, 500, `zoomIn duration=${zoom.animation?.duration}`);

  assert.ok(bounce, "rect-bounce missing after hop");
  assert.equal(bounce.animation?.type, "bounceIn", `bounce animation=${JSON.stringify(bounce.animation)}`);

  const flipKept = s3.transition?.type === "flip";
  const flipNote = flipKept
    ? `flip kept as ${JSON.stringify(s3.transition)}`
    : `flip LOST after PPTX hop (LibreOffice PPTX filter does not map fadeOverColor). parsed=${JSON.stringify(s3.transition)}`;
  console.log("FLIP_STATUS", flipNote);
  // Do not assert flip survives PPTX — probe showed slide2.xml had no <p:transition>.

  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept fade/slide/zoom transitions + flyIn/fadeIn/zoomIn/bounceIn");
  console.log(`      ${flipNote}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
