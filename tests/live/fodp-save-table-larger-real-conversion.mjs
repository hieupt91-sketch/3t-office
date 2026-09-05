/**
 * Real LibreOffice round-trip for a Slides table larger than 2×2:
 *   in-memory 3×4 table → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *
 * Follow-up to tests/live/fodp-save-table-arrow-real-conversion.mjs (2×2 only).
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

// 3 hàng × 4 cột, dữ liệu thật từng ô: tiếng Việt có dấu + số.
// Hàng "Chi phí" có hai ô "45" liền nhau để thăm dò table:number-columns-repeated.
const TABLE_CELLS = [
  ["Hạng mục", "Tháng 1", "Tháng 2", "Tháng 3"],
  ["Doanh thu", "120", "135", "150"],
  ["Chi phí", "45", "45", "52"]
];

// Probe: soffice PPTX hop ghi ô trống thành <table:table-cell .../> tự đóng
// (không dùng number-columns-repeated trên hop đo được). Parser cũ bỏ những ô này.
const EMPTY_CELLS = [
  ["A", "B", "", ""],
  ["C", "", "", "D"]
];

const canvas = {
  slides: [{
    id: 1,
    title: "Slide bảng 3x4",
    body: "",
    layoutType: "title-content",
    notes: "",
    shapes: [
      {
        id: "tbl3x4",
        type: "table",
        x: 76,
        y: 151,
        w: 680,
        h: 160,
        rows: 3,
        cols: 4,
        cells: TABLE_CELLS.map((row) => row.slice()),
        color: "transparent"
      },
      {
        id: "tbl-gap",
        type: "table",
        x: 76,
        y: 340,
        w: 400,
        h: 80,
        rows: 2,
        cols: 4,
        cells: EMPTY_CELLS.map((row) => row.slice()),
        color: "transparent"
      }
    ]
  }]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /<table:table\b/, "serializer must emit table:table before soffice");
assert.match(fodp, /<table:table-cell\b/, "serializer must emit table cells before soffice");
assert.match(fodp, /<text:p>Hạng mục<\/text:p>/, "serializer must emit Vietnamese header cell");
assert.match(fodp, /<text:p>Doanh thu<\/text:p>/, "serializer must emit Vietnamese body cell");
assert.match(fodp, /<text:p>120<\/text:p>/, "serializer must emit numeric cell 120");
assert.match(fodp, /<text:p>45<\/text:p>/, "serializer must emit numeric cell 45");
assert.equal([...fodp.matchAll(/<table:table(?:\s|>)/gi)].length, 2, "serializer must emit both tables");
assert.match(fodp, /<text:p>A<\/text:p>/, "serializer must emit empty-probe cell A");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-table-larger-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function approx(actual, expected, tol = 8) {
  return Math.abs(Number(actual) - Number(expected)) <= tol;
}

function dumpTableXml(xml) {
  const tableHits = [...xml.matchAll(/<table:table\b[\s\S]{0,8000}?<\/table:table>/gi)].map((m) => m[0]);
  const cellRepeats = [...xml.matchAll(/<(?:table:)?table-cell\b[^>]*number-columns-repeated=["']([^"']+)["'][^>]*/gi)]
    .map((m) => m[0].slice(0, 220));
  const rowRepeats = [...xml.matchAll(/<(?:table:)?table-row\b[^>]*number-rows-repeated=["']([^"']+)["'][^>]*/gi)]
    .map((m) => m[0].slice(0, 220));
  const spanned = [...xml.matchAll(/number-(?:columns|rows)-spanned=["']([^"']+)["']/gi)].map((m) => m[0]);
  const covered = [...xml.matchAll(/<(?:table:)?covered-table-cell\b[^>]*/gi)].map((m) => m[0].slice(0, 220));
  return {
    tableCount: tableHits.length,
    tableSnippet: (tableHits[0] || "").slice(0, 4000),
    cellRepeatTags: cellRepeats,
    rowRepeatTags: rowRepeats,
    spannedAttrs: spanned,
    coveredTags: covered
  };
}

function byId(shapes) {
  const map = {};
  for (const shape of shapes || []) map[String(shape.id)] = shape;
  return map;
}

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  const snippets = dumpTableXml(roundTripXml);
  const selfClosingCells = [...roundTripXml.matchAll(/<(?:table:)?table-cell\b[^>]*\/>/gi)].map((m) => m[0]);
  console.log("SOFFICE_XML tableCount=" + snippets.tableCount);
  console.log("SOFFICE_XML cell number-columns-repeated tags=" + JSON.stringify(snippets.cellRepeatTags));
  console.log("SOFFICE_XML row number-rows-repeated tags=" + JSON.stringify(snippets.rowRepeatTags));
  console.log("SOFFICE_XML spanned attrs=" + JSON.stringify(snippets.spannedAttrs));
  console.log("SOFFICE_XML covered-table-cell tags=" + JSON.stringify(snippets.coveredTags));
  console.log("SOFFICE_XML self-closing table-cell tags=" + JSON.stringify(selfClosingCells));
  if (snippets.tableSnippet) {
    console.log("SOFFICE_XML first table snippet:\n" + snippets.tableSnippet);
  } else {
    console.log("SOFFICE_XML no <table:table> after hop");
    const cellLike = roundTripXml.match(/Hạng mục|Doanh thu|Chi phí|Tháng 1|120|135|150|45|52/g);
    console.log("SOFFICE_XML text hits=" + JSON.stringify(cellLike));
  }

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 1, `expected 1 slide, got ${parsed.length}`);
  const slide = parsed[0];
  assert.ok(
    String(slide.title || "").includes("Slide bảng 3x4")
      || (slide.shapes || []).some((shape) => String(shape.text || "").includes("Slide bảng 3x4")),
    `title lost after soffice hop: title=${slide.title}`
  );

  const shapes = slide.shapes || [];
  const lookup = byId(shapes);
  const tables = shapes.filter((shape) => shape.type === "table" || Array.isArray(shape.cells));
  const table = lookup.tbl3x4
    || tables.find((shape) => Array.isArray(shape.cells) && shape.cells[0]?.[0] === "Hạng mục")
    || tables[0];
  const gap = lookup["tbl-gap"]
    || tables.find((shape) => Array.isArray(shape.cells) && shape.cells[0]?.[0] === "A");

  console.log("PARSED shapes=" + shapes.map((s) => `${s.type}:${s.id}:${JSON.stringify(s.cells || null)}`).join(" | "));

  assert.ok(table, `3x4 table missing after hop. shapes=${JSON.stringify(shapes.map((s) => ({ type: s.type, id: s.id, text: s.text })))}`);
  assert.equal(table.type, "table", `table type=${table.type}`);
  assert.ok(Array.isArray(table.cells), `table.cells missing: ${JSON.stringify(table)}`);
  assert.equal(table.rows, 3, `table.rows=${table.rows}`);
  assert.equal(table.cols, 4, `table.cols=${table.cols}`);
  assert.equal(table.cells.length, 3, `table.cells.length=${table.cells.length}`);
  for (let r = 0; r < 3; r++) {
    assert.equal(table.cells[r].length, 4, `row ${r} length=${table.cells[r].length} cells=${JSON.stringify(table.cells[r])}`);
    for (let c = 0; c < 4; c++) {
      assert.equal(
        table.cells[r][c],
        TABLE_CELLS[r][c],
        `cell[${r}][${c}] expected ${JSON.stringify(TABLE_CELLS[r][c])} got ${JSON.stringify(table.cells[r][c])}`
      );
    }
  }
  assert.deepEqual(table.cells, TABLE_CELLS, `table cells lost/changed: ${JSON.stringify(table.cells)}`);
  assert.ok(approx(table.x, 76) && approx(table.y, 151), `table geom ${JSON.stringify({ x: table.x, y: table.y, w: table.w, h: table.h })}`);

  assert.ok(gap, `empty-cell probe table missing after hop. shapes=${JSON.stringify(shapes.map((s) => ({ type: s.type, id: s.id })))}`);
  assert.equal(gap.type, "table", `gap type=${gap.type}`);
  assert.equal(gap.rows, 2, `gap.rows=${gap.rows}`);
  assert.equal(gap.cols, 4, `gap.cols=${gap.cols} (parser cũ mất cột khi ô tự đóng)`);
  assert.deepEqual(gap.cells, EMPTY_CELLS, `gap cells lost/changed: ${JSON.stringify(gap.cells)}`);
  assert.ok(selfClosingCells.length >= 4, `expected soffice self-closing empty cells, got ${JSON.stringify(selfClosingCells)}`);

  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept table 3x4 cells + empty-cell 2x4");
  console.log(`      slide.title=${JSON.stringify(slide.title)}`);
  console.log(`      table id=${table.id} rows=${table.rows} cols=${table.cols}`);
  console.log(`      cells=${JSON.stringify(table.cells)}`);
  console.log(`      geom=${table.x},${table.y},${table.w}x${table.h}`);
  console.log(`      gap id=${gap.id} cells=${JSON.stringify(gap.cells)} geom=${gap.x},${gap.y},${gap.w}x${gap.h}`);
  console.log(`      soffice compressed cell-repeat=${snippets.cellRepeatTags.length > 0} row-repeat=${snippets.rowRepeatTags.length > 0} spanned=${snippets.spannedAttrs.length > 0} self-closing-empty=${selfClosingCells.length}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
