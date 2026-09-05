import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

const soffice = findSoffice();
assert.ok(soffice, "LibreOffice soffice.exe not found");

const sheet = "Merge Cells";
const expected = [
  { start: { c: "B", r: 2 }, end: { c: "D", r: 3 } },
  { start: { c: "F", r: 5 }, end: { c: "F", r: 7 } }
];
const grid = {
  sheets: [sheet], activeSheet: sheet,
  sheetsData: { [sheet]: new Map([
    ["B2", { val: "Merged title", formula: "", style: {} }],
    ["F5", { val: 42, formula: "", style: {} }]
  ]) },
  mergedRangesBySheet: { [sheet]: expected },
  commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] },
  namedRangesWorkbook: [], printAreaBySheet: { [sheet]: null }
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-merge-cells-fods-"));
const profileDir = path.join(root, "profile");
try {
  const source = path.join(root, "merge-cells.fods");
  fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
  const xlsx = convertWithSoffice(source, "xlsx", path.join(root, "xlsx"), { profileDir });
  const roundTrip = convertWithSoffice(xlsx, "fods", path.join(root, "fods"), { profileDir });
  const xml = fs.readFileSync(roundTrip, "utf8");
  assert.match(xml, /table:number-columns-spanned="3"[^>]*table:number-rows-spanned="2"/);
  assert.match(xml, /table:number-columns-spanned="1"[^>]*table:number-rows-spanned="3"/);
  assert.match(xml, /<table:covered-table-cell\b/);

  const parsed = new SheetAdapter(null).parseFods(xml);
  assert.deepEqual(parsed.mergedRangesBySheet[sheet], expected);
  assert.equal(parsed.sheetsData[sheet].get("B2")?.val, "Merged title");
  assert.equal(parsed.sheetsData[sheet].get("F5")?.val, 42);
  for (const coordinate of ["C2", "D2", "B3", "C3", "D3", "F6", "F7"]) {
    assert.equal(parsed.sheetsData[sheet].has(coordinate), false, `${coordinate} covered cell must remain empty`);
  }
  console.log(`PASS: LibreOffice ${soffice} preserved merged ranges through FODS -> XLSX -> FODS (${fs.statSync(xlsx).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept live-test files at ${root}`);
  else fs.rmSync(root, { recursive: true, force: true });
}
