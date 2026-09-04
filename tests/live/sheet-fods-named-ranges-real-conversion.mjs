import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe"); assert.ok(fs.existsSync(soffice));
const sheet = "Doanh thu quý";
const grid = {
  sheets: [sheet], activeSheet: sheet,
  sheetsData: { [sheet]: new Map([["A1", { val: 10, formula: "", style: {} }], ["A2", { val: 20, formula: "", style: {} }], ["A3", { val: 30, formula: "", style: {} }]]) },
  namedRangesWorkbook: [{ id: "w1", name: "DoanhThuNam", ref: "A1:A3", scope: "workbook", sheet }],
  namedRangesBySheet: { [sheet]: [{ id: "s1", name: "ChiTieuQuy", ref: "A2:A3", scope: "sheet", sheet }] }
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-named-ranges-"));
const xlsxDir = path.join(root, "xlsx"), fodsDir = path.join(root, "fods"), profile = path.join(root, "profile"); [xlsxDir, fodsDir, profile].forEach(dir => fs.mkdirSync(dir));
const source = path.join(root, "named-ranges.fods"); fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
const convert = (input, target, filter, outdir) => { const result = spawnSync(soffice, ["--headless", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 }); assert.equal(result.status, 0, result.stderr || result.stdout); };
try {
  convert(source, "xlsx", "Calc MS Excel 2007 XML", xlsxDir); const xlsx = path.join(xlsxDir, "named-ranges.xlsx"); assert.ok(fs.existsSync(xlsx));
  convert(xlsx, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir); const xml = fs.readFileSync(path.join(fodsDir, "named-ranges.fods"), "utf8");
  assert.match(xml, /<table:named-range\b/);
  const parsed = new SheetAdapter(null).parseFods(xml);
  assert.equal(parsed.namedRangesWorkbook.find(item => item.name === "DoanhThuNam")?.ref, "A1:A3");
  assert.equal(parsed.namedRangesBySheet[sheet].find(item => item.name === "ChiTieuQuy")?.ref, "A2:A3");
  console.log(`PASS: real LibreOffice preserved workbook and sheet scoped named ranges through FODS -> XLSX -> FODS (${fs.statSync(xlsx).size} bytes).`);
} finally { if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`); else fs.rmSync(root, { recursive: true, force: true }); }
