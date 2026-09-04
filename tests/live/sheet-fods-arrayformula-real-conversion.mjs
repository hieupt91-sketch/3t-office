import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe");
assert.ok(fs.existsSync(soffice), `Không tìm thấy LibreOffice tại ${soffice}`);
const sheet = "Mảng dữ liệu";
const cells = new Map();
for (let row = 1; row <= 5; row++) {
  cells.set(`A${row}`, { val: row, formula: "", style: {} });
  cells.set(`B${row}`, { val: row * 10, formula: "", style: {} });
  cells.set(`C${row}`, { val: row * row * 10, formula: "=A1:A5*B1:B5", isArrayFormula: true, arrayRange: "C1:C5", style: {} });
}
const grid = {
  sheets: [sheet], activeSheet: sheet, sheetsData: { [sheet]: cells },
  commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [], printAreaBySheet: { [sheet]: null }
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-array-formula-"));
const xlsxDir = path.join(root, "xlsx"), fodsDir = path.join(root, "fods"), profile = path.join(root, "profile");
[xlsxDir, fodsDir, profile].forEach(dir => fs.mkdirSync(dir));
const source = path.join(root, "array-formula.fods");
fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
const convert = (input, target, filter, outdir) => {
  const result = spawnSync(soffice, ["--headless", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
try {
  convert(source, "xlsx", "Calc MS Excel 2007 XML", xlsxDir);
  const xlsx = path.join(xlsxDir, "array-formula.xlsx");
  assert.ok(fs.existsSync(xlsx));
  convert(xlsx, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir);
  const xml = fs.readFileSync(path.join(fodsDir, "array-formula.fods"), "utf8");
  assert.match(xml, /table:number-matrix-columns-spanned="1"/);
  assert.match(xml, /table:number-matrix-rows-spanned="5"/);
  const parsed = new SheetAdapter(null).parseFods(xml);
  for (let row = 1; row <= 5; row++) {
    const item = parsed.sheetsData[sheet].get(`C${row}`);
    assert.equal(item?.isArrayFormula, true);
    assert.equal(item?.arrayRange, "C1:C5");
    assert.equal(item?.formula, "=A1:A5*B1:B5");
  }
  console.log(`PASS: real LibreOffice preserved array-formula matrix metadata through FODS -> XLSX -> FODS (${fs.statSync(xlsx).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`);
  else fs.rmSync(root, { recursive: true, force: true });
}
