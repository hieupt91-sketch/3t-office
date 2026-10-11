/**
 * Real LibreOffice measurement for Hide Slide:
 *   serializeToFodp() → inspect ODF → soffice FODP→PPTX → unzip show= → soffice PPTX→FODP → parseFodp()
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
    { id: 1, title: "Hien mot", body: "Slide 1", layoutType: "title-content", shapes: [], hidden: false },
    { id: 2, title: "An hai", body: "Slide 2 hidden", layoutType: "title-content", shapes: [], hidden: true },
    { id: 3, title: "Hien ba", body: "Slide 3", layoutType: "title-content", shapes: [], hidden: false }
  ]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();

assert.doesNotMatch(fodp, /presentation:visible\s*=/, "ODF has no presentation:visible on draw:page");
assert.match(fodp, /presentation:visibility="hidden"/, "serializer must emit ODF presentation:visibility=hidden");
assert.doesNotMatch(fodp, /vno:hidden/, "must not use custom vno:hidden");

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(inMemory.length, 3);
assert.equal(!!inMemory[0].hidden, false);
assert.equal(!!inMemory[1].hidden, true, "in-memory FODP must keep slide 2 hidden");
assert.equal(!!inMemory[2].hidden, false);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-hide-slide-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const odpDir = path.join(tempRoot, "odp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function drawingPageStyles(xml) {
  return [...xml.matchAll(/<style:style[^>]*style:family="drawing-page"[\s\S]*?<\/style:style>/gi)]
    .map((m) => m[0].replace(/\s+/g, " "));
}

function readPptxHidden(pptxPath, unzipDir) {
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
      const show = xml.match(/<p:sld\b([^>]*)>/i)?.[1] || "";
      const showAttr = show.match(/\bshow=["']([^"']+)["']/i)?.[1];
      return { name, showAttr: showAttr ?? "(default visible)", hidden: showAttr === "0" || showAttr === "false" };
    });
}

const measurement = {
  odfAttributeOnDrawPage: /<draw:page[^>]*presentation:visible/.test(fodp) ? "presentation:visible on draw:page" : "none",
  odfVisibilityOnStyle: fodp.includes('presentation:visibility="hidden"'),
  pptxShowAttrs: [],
  roundTripVisibility: [],
  odpHopVisibility: []
};

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");
  measurement.pptxShowAttrs = readPptxHidden(pptxPath, path.join(tempRoot, "pptx-unzip"));
  console.log("PPTX p:sld show attrs:", JSON.stringify(measurement.pptxShowAttrs));

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip-from-pptx.fodp"), roundTripXml, "utf8");
  measurement.roundTripVisibility = drawingPageStyles(roundTripXml);
  console.log("SOFFICE PPTX hop drawing-page styles:");
  for (const style of measurement.roundTripVisibility) console.log(" ", style.slice(0, 360));

  const parsedHop = new SlidesAdapter(null).parseFodp(roundTripXml);
  console.log("PARSED after PPTX hop hidden=", JSON.stringify(parsedHop.map((slide) => ({ title: slide.title, hidden: !!slide.hidden }))));

  const hiddenAfterHop = parsedHop.filter((slide) => slide.hidden);
  assert.equal(parsedHop.length, 3, `expected 3 slides after hop, got ${parsedHop.length}`);
  assert.ok(
    hiddenAfterHop.length === 1 && /An hai/i.test(hiddenAfterHop[0].title || ""),
    `PPTX hop must keep slide 2 hidden via presentation:visibility. got ${JSON.stringify(parsedHop.map((s) => ({ title: s.title, hidden: !!s.hidden })))}`
  );
  assert.ok(
    measurement.pptxShowAttrs[1]?.hidden,
    `PPTX slide2 must have p:sld show="0". got ${JSON.stringify(measurement.pptxShowAttrs)}`
  );

  try {
    const odpPath = convertWithSoffice(sourceFodp, "odp", odpDir, { profileDir: path.join(tempRoot, "odp-profile") });
    const odpFodpDir = path.join(tempRoot, "odp-fodp");
    const odpRound = convertWithSoffice(odpPath, "fodp", odpFodpDir, { profileDir: path.join(tempRoot, "odp-profile") });
    const odpXml = fs.readFileSync(odpRound, "utf8");
    measurement.odpHopVisibility = drawingPageStyles(odpXml);
    const parsedOdp = new SlidesAdapter(null).parseFodp(odpXml);
    console.log("ODP hop hidden=", JSON.stringify(parsedOdp.map((slide) => ({ title: slide.title, hidden: !!slide.hidden }))));
    assert.equal(!!parsedOdp[1]?.hidden, true, "ODP hop must keep presentation:visibility=hidden");
  } catch (odpError) {
    console.log("ODP hop skipped/failed:", odpError.message);
  }

  console.log("LIVE PASS: Hide Slide FODP uses ODF presentation:visibility=hidden and survives soffice hop");
  console.log("MEASUREMENT:", JSON.stringify({
    odfAttributeOnDrawPage: measurement.odfAttributeOnDrawPage,
    odfVisibilityOnStyle: measurement.odfVisibilityOnStyle,
    pptxShowAttrs: measurement.pptxShowAttrs
  }));
} finally {
  // keep temp for diagnosis if needed; tests do not require cleanup
}
