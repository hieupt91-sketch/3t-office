/**
 * Real LibreOffice round-trip for Slides shape save:
 *   in-memory slides.shapes → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *
 * Mirrors tests/live/sheet-fods-real-conversion.mjs and the soffice hop used by
 * tests/live/real-office-file-import-fidelity.playwright.mjs. Not part of
 * node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const canvas = {
  slides: [{
    id: 1,
    title: "Slide có hình khối",
    body: "Nội dung placeholder",
    layoutType: "title-content",
    notes: "",
    shapes: [
      { id: "node-a", type: "rect", x: 76, y: 151, w: 227, h: 95, color: "#2563eb", text: "Nút A" },
      { id: "node-b", type: "ellipse", x: 529, y: 151, w: 227, h: 95, color: "#0f766e", text: "Nút B" },
      { id: "tb1", type: "textbox", x: 76, y: 302, w: 302, h: 76, color: "transparent", text: "Hộp văn bản" },
      {
        id: "conn-1", type: "connector", x: 303, y: 198, w: 226, h: 1,
        x1: 303, y1: 198, x2: 529, y2: 198, color: "#475569", arrowEnd: true,
        sourceId: "node-a", targetId: "node-b", diagramRole: "connector"
      },
      { id: "img1", type: "image", x: 454, y: 302, w: 76, h: 76, src: TINY_PNG }
    ]
  }]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /<draw:rect\b/, "serializer must emit draw:rect before soffice");
assert.match(fodp, /<draw:connector\b/, "serializer must emit draw:connector before soffice");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-shapes-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function approx(actual, expected, tol = 8) {
  return Math.abs(Number(actual) - Number(expected)) <= tol;
}

function byIdOrText(shapes) {
  const map = {};
  for (const shape of shapes || []) {
    map[String(shape.id)] = shape;
    if (shape.text) map[`text:${shape.text}`] = shape;
    if (shape.type === "connector") map.connector = shape;
    if (shape.type === "image") map.image = shape;
  }
  return map;
}

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 1, `expected 1 slide, got ${parsed.length}`);
  const slide = parsed[0];
  assert.ok(
    String(slide.title || "").includes("Slide có hình khối")
      || (slide.shapes || []).some((shape) => String(shape.text || "").includes("Slide có hình khối")),
    `title lost after soffice hop: title=${slide.title}`
  );

  const shapes = slide.shapes || [];
  const lookup = byIdOrText(shapes);
  const rect = lookup["node-a"] || lookup["text:Nút A"];
  const ellipse = lookup["node-b"] || lookup["text:Nút B"];
  const textbox = lookup.tb1 || lookup["text:Hộp văn bản"];
  const connector = lookup["conn-1"] || lookup.connector;
  const image = lookup.img1 || lookup.image;

  assert.ok(rect && rect.text === "Nút A", `rect/text Nút A missing: ${JSON.stringify(rect)}`);
  assert.ok(rect.type === "rect" || rect.type === "textbox", `Nút A type=${rect.type}`);
  assert.equal(String(rect.color).toLowerCase(), "#2563eb", `Nút A color=${rect.color}`);
  assert.ok(approx(rect.x, 76) && approx(rect.y, 151) && approx(rect.w, 227) && approx(rect.h, 95), `Nút A geom ${JSON.stringify(rect)}`);

  assert.ok(ellipse && ellipse.text === "Nút B", `ellipse/text Nút B missing: ${JSON.stringify(ellipse)}`);
  assert.equal(ellipse.type, "ellipse", `Nút B type=${ellipse.type}`);
  assert.equal(String(ellipse.color).toLowerCase(), "#0f766e", `Nút B color=${ellipse.color}`);
  assert.ok(approx(ellipse.x, 529) && approx(ellipse.y, 151), `Nút B geom ${JSON.stringify(ellipse)}`);

  assert.ok(textbox && textbox.text === "Hộp văn bản", `textbox missing: ${JSON.stringify(textbox)}`);
  // soffice PPTX hop turns draw:frame text-box into ooxml-rect custom-shape
  assert.ok(textbox.type === "textbox" || textbox.type === "rect", `textbox type=${textbox.type}`);

  assert.ok(connector && connector.type === "connector", `connector missing: ${JSON.stringify(connector)}`);
  assert.ok(
    String(connector.sourceId) === String(rect.id) && String(connector.targetId) === String(ellipse.id),
    `connector refs ${connector.sourceId}→${connector.targetId}, nodes ${rect.id}/${ellipse.id}`
  );
  assert.ok(approx(connector.x1, 303, 12) && approx(connector.x2, 529, 12), `connector x ${connector.x1},${connector.x2}`);

  assert.ok(image && image.type === "image", `image missing: ${JSON.stringify(image && { type: image?.type, id: image?.id })}`);
  assert.ok(String(image.src || "").includes("iVBORw0KGgo"), `image src not base64 png: ${(image.src || "").slice(0, 60)}`);
  assert.ok(approx(image.x, 454) && approx(image.y, 302), `image geom ${JSON.stringify(image)}`);

  const shapeTexts = shapes.map((shape) => shape.text).filter(Boolean);
  assert.ok(shapeTexts.includes("Nút A") && shapeTexts.includes("Nút B") && shapeTexts.includes("Hộp văn bản"));

  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept rect/ellipse/textbox/connector/image");
  console.log(`      slide.title=${JSON.stringify(slide.title)} shapes=${shapes.map((s) => `${s.type}:${s.id}:${s.text || ""}`).join(" | ")}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
