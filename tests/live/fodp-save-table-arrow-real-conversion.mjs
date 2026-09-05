/**
 * Real LibreOffice round-trip for Slides table + arrow save:
 *   in-memory table/arrow → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *
 * Follow-up to tests/live/fodp-save-shapes-real-conversion.mjs (rect/ellipse/textbox/connector/image).
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const TABLE_CELLS = [
  ["Sản phẩm", "Số lượng"],
  ["VN Writer", "120"]
];

const canvas = {
  slides: [{
    id: 1,
    title: "Slide bảng và mũi tên",
    body: "",
    layoutType: "title-content",
    notes: "",
    shapes: [
      {
        id: "tbl1",
        type: "table",
        x: 76,
        y: 151,
        w: 454,
        h: 114,
        rows: 2,
        cols: 2,
        cells: TABLE_CELLS.map((row) => row.slice()),
        color: "transparent"
      },
      {
        id: "arr1",
        type: "arrow",
        x: 568,
        y: 189,
        w: 200,
        h: 80,
        color: "#dc2626",
        text: "Mũi tên phải"
      }
    ]
  }]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /<table:table\b/, "serializer must emit table:table before soffice");
assert.match(fodp, /<table:table-cell\b/, "serializer must emit table cells before soffice");
assert.match(fodp, /<text:p>Sản phẩm<\/text:p>/, "serializer must emit first table cell text");
assert.match(fodp, /<text:p>120<\/text:p>/, "serializer must emit last table cell text");
assert.match(fodp, /draw:type="right-arrow"/, "serializer must emit PPTX-safe draw:type=right-arrow before soffice");
assert.match(fodp, /Mũi tên phải/, "serializer must emit arrow text before soffice");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-table-arrow-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function approx(actual, expected, tol = 8) {
  return Math.abs(Number(actual) - Number(expected)) <= tol;
}

function dumpSnippets(xml) {
  const tableHits = [...xml.matchAll(/<table:table\b[\s\S]{0,1800}?<\/table:table>/gi)].map((m) => m[0]);
  const geomHits = [...xml.matchAll(/draw:type=["']([^"']+)["']/gi)].map((m) => m[1]);
  const frameHits = [...xml.matchAll(/<draw:frame\b[^>]*>/gi)].map((m) => m[0]);
  const customHits = [...xml.matchAll(/<draw:custom-shape\b[^>]*>/gi)].map((m) => m[0]);
  return {
    tableCount: tableHits.length,
    tableSnippet: (tableHits[0] || "").slice(0, 1200),
    drawTypes: geomHits,
    frameOpenTags: frameHits.slice(0, 8),
    customOpenTags: customHits.slice(0, 8)
  };
}

function byIdOrText(shapes) {
  const map = {};
  for (const shape of shapes || []) {
    map[String(shape.id)] = shape;
    if (shape.text) map[`text:${shape.text}`] = shape;
    if (shape.type === "table") map.table = shape;
    if (shape.type === "arrow") map.arrow = shape;
  }
  return map;
}

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  const snippets = dumpSnippets(roundTripXml);
  console.log("SOFFICE_XML tableCount=" + snippets.tableCount);
  console.log("SOFFICE_XML draw:type=" + JSON.stringify(snippets.drawTypes));
  console.log("SOFFICE_XML custom-shape tags=" + JSON.stringify(snippets.customOpenTags));
  if (snippets.tableSnippet) {
    console.log("SOFFICE_XML table snippet:\n" + snippets.tableSnippet);
  } else {
    console.log("SOFFICE_XML no <table:table> after hop");
    const cellLike = roundTripXml.match(/Sản phẩm|VN Writer|Số lượng|120|Mũi tên phải/g);
    console.log("SOFFICE_XML text hits=" + JSON.stringify(cellLike));
  }

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 1, `expected 1 slide, got ${parsed.length}`);
  const slide = parsed[0];
  assert.ok(
    String(slide.title || "").includes("Slide bảng và mũi tên")
      || (slide.shapes || []).some((shape) => String(shape.text || "").includes("Slide bảng và mũi tên")),
    `title lost after soffice hop: title=${slide.title}`
  );

  const shapes = slide.shapes || [];
  const lookup = byIdOrText(shapes);
  const table = lookup.tbl1 || lookup.table
    || shapes.find((shape) => shape.type === "table")
    || shapes.find((shape) => Array.isArray(shape.cells));
  const arrow = lookup.arr1 || lookup.arrow || lookup["text:Mũi tên phải"]
    || shapes.find((shape) => shape.type === "arrow")
    || shapes.find((shape) => String(shape.text || "").includes("Mũi tên"));

  console.log("PARSED shapes=" + shapes.map((s) => `${s.type}:${s.id}:${s.text || ""}:${JSON.stringify(s.cells || null)}`).join(" | "));

  assert.ok(table, `table missing after hop. shapes=${JSON.stringify(shapes.map((s) => ({ type: s.type, id: s.id, text: s.text })))}`);
  assert.equal(table.type, "table", `table type=${table.type}`);
  assert.ok(Array.isArray(table.cells), `table.cells missing: ${JSON.stringify(table)}`);
  assert.equal(table.rows, 2, `table.rows=${table.rows}`);
  assert.equal(table.cols, 2, `table.cols=${table.cols}`);
  assert.equal(table.cells.length, 2, `table.cells.length=${table.cells.length}`);
  assert.deepEqual(table.cells, TABLE_CELLS, `table cells lost/changed: ${JSON.stringify(table.cells)}`);
  assert.equal(table.cells[0][0], "Sản phẩm");
  assert.equal(table.cells[0][1], "Số lượng");
  assert.equal(table.cells[1][0], "VN Writer");
  assert.equal(table.cells[1][1], "120");
  assert.ok(approx(table.x, 76) && approx(table.y, 151), `table geom ${JSON.stringify({ x: table.x, y: table.y, w: table.w, h: table.h })}`);

  assert.ok(arrow, `arrow missing after hop. shapes=${JSON.stringify(shapes.map((s) => ({ type: s.type, id: s.id, text: s.text })))}`);
  // Live hop rewrites draw:type="right-arrow" to ooxml-rightArrow; parse must still recover type "arrow".
  assert.equal(arrow.type, "arrow", `arrow type=${arrow.type} drawTypes=${JSON.stringify(snippets.drawTypes)}`);
  assert.ok(
    snippets.drawTypes.some((t) => /arrow/i.test(t)),
    `soffice hop dropped arrow geometry, draw:type=${JSON.stringify(snippets.drawTypes)}`
  );
  assert.equal(arrow.text, "Mũi tên phải", `arrow text=${arrow.text}`);
  assert.equal(String(arrow.color).toLowerCase(), "#dc2626", `arrow color=${arrow.color}`);
  assert.ok(approx(arrow.x, 568) && approx(arrow.y, 189) && approx(arrow.w, 200) && approx(arrow.h, 80), `arrow geom ${JSON.stringify(arrow)}`);

  const arrowGeom = snippets.drawTypes.find((t) => /arrow/i.test(t)) || snippets.drawTypes[0] || "";
  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept table 2x2 cells + arrow");
  console.log(`      slide.title=${JSON.stringify(slide.title)}`);
  console.log(`      table id=${table.id} cells=${JSON.stringify(table.cells)} geom=${table.x},${table.y},${table.w}x${table.h}`);
  console.log(`      arrow id=${arrow.id} type=${arrow.type} soffice draw:type=${arrowGeom} geom=${arrow.x},${arrow.y},${arrow.w}x${arrow.h}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
