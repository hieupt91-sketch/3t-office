/**
 * Real LibreOffice round-trip for Slides shape rotation serialize:
 *   in-memory shape.rotation=30 → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *
 * Verifies that the rotation survives the round-trip through real soffice
 * (not just VN Office's own parser), proving the draw:transform format is correct.
 *
 * Not part of node tests/run-tests.js (requires soffice, runs separately).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const canvas = {
  slides: [{
    id: 1,
    title: "Slide hình xoay",
    body: "",
    layoutType: "blank",
    notes: "",
    shapes: [
      { id: "rotated-box", type: "rect", x: 100, y: 50, w: 200, h: 100, color: "#ff0000", text: "Hình xoay", rotation: 30 },
      { id: "normal-box", type: "rect", x: 400, y: 50, w: 200, h: 100, color: "#00ff00", text: "Hình thường" }
    ]
  }]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();

// Verify FODP contains draw:transform before sending to soffice
assert.match(fodp, /draw:transform="rotate \(-0\.523598/, "FODP must contain correct radian for 30° rotation");
assert.match(fodp, /svg:width="/, "FODP must contain svg:width");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-rotation-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function approx(a, b, tol = 1) {
  return Math.abs(Number(a) - Number(b)) <= tol;
}

try {
  // Step 1: FODP → PPTX
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  // Step 2: PPTX → FODP (round-trip)
  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  // Step 3: Parse round-trip FODP
  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 1, `expected 1 slide, got ${parsed.length}`);
  const slide = parsed[0];

  const shapes = slide.shapes || [];
  const rotatedShape = shapes.find((s) => String(s.id || "").includes("rotated") || (s.text || "").includes("xoay"));
  const normalShape = shapes.find((s) => String(s.id || "").includes("normal") || (s.text || "").includes("thường"));

  assert.ok(rotatedShape, `rotated shape missing after round-trip: ${JSON.stringify(shapes.map(s => ({ id: s.id, text: s.text })))}`);

  // Key assertion: rotation survives the round-trip (within tolerance)
  assert.ok(
    typeof rotatedShape.rotation === "number" && approx(rotatedShape.rotation, 30, 1),
    `rotation after round-trip: expected ~30, got ${rotatedShape.rotation}`
  );

  // Position survives too (within tolerance)
  assert.ok(approx(rotatedShape.x, 100, 20), `x after round-trip: expected ~100, got ${rotatedShape.x}`);
  assert.ok(approx(rotatedShape.y, 50, 20), `y after round-trip: expected ~50, got ${rotatedShape.y}`);

  assert.ok(normalShape, `normal shape missing after round-trip`);
  // Normal shape should NOT have rotation
  assert.ok(
    !normalShape.rotation || normalShape.rotation === 0,
    `normal shape rotation: expected undefined/0, got ${normalShape.rotation}`
  );

  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept rotation ~30°");
  console.log(`      rotated: rotation=${rotatedShape.rotation} x=${rotatedShape.x} y=${rotatedShape.y} text="${rotatedShape.text}"`);
  console.log(`      normal: rotation=${normalShape.rotation} text="${normalShape.text}"`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
