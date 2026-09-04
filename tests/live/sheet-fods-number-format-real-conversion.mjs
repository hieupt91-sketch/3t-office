import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe");
assert.ok(fs.existsSync(soffice), `LibreOffice not found: ${soffice}`);
const formats = [
  ["A1", 1234567.89, { category: "number", decimals: 2, useThousands: true }],
  ["A2", 0.125, { category: "percentage", decimals: 1 }],
  ["A3", 1250.5, { category: "currency", currencySymbol: "$", decimals: 2, useThousands: true }],
  ["A4", 1500000, { category: "accounting", currencySymbol: "₫", decimals: 0 }],
  ["A5", 45365, { category: "date", dateFormat: "dd/mm/yyyy" }],
  ["A6", 12345, { category: "scientific", decimals: 3 }],
  ["A7", "00123", { category: "text" }],
  ["A8", 1250000, { category: "custom", customPattern: '#,##0.00 "đ"' }],
  ["A9", -2500, { category: "number", decimals: 2, useThousands: true, negativeStyle: 3 }]
];
const cells = new Map(formats.map(([coord, val, numberFormat]) => [coord, { val, formula: "", style: { numberFormat } }]));
const grid = { sheets: ["Định dạng"], activeSheet: "Định dạng", sheetsData: { "Định dạng": cells } };
const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-number-format-"));
const xlsxDir = path.join(root, "xlsx"); const fodsDir = path.join(root, "fods"); const profile = path.join(root, "profile");
[xlsxDir, fodsDir, profile].forEach(dir => fs.mkdirSync(dir));
const source = path.join(root, "number-formats.fods");
fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
const convert = (input, target, filter, outdir) => {
  const result = spawnSync(soffice, ["--headless", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
try {
  convert(source, "xlsx", "Calc MS Excel 2007 XML", xlsxDir);
  const xlsx = path.join(xlsxDir, "number-formats.xlsx"); assert.ok(fs.existsSync(xlsx));
  convert(xlsx, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir);
  const resultXml = fs.readFileSync(path.join(fodsDir, "number-formats.fods"), "utf8");
  assert.match(resultXml, /<number:(?:number|percentage|currency|date|text)-style\b/);
  const parsed = new SheetAdapter(null).parseFods(resultXml).sheetsData["Định dạng"];
  for (const [coord, , expected] of formats) {
    const actual = parsed.get(coord)?.style?.numberFormat;
    assert.equal(actual?.category, expected.category, `${coord}: ${JSON.stringify(actual)}`);
    if (expected.decimals !== undefined) assert.equal(actual.decimals, expected.decimals, `${coord} decimals`);
    if (expected.currencySymbol !== undefined) assert.equal(actual.currencySymbol, expected.currencySymbol, `${coord} symbol`);
    if (expected.dateFormat !== undefined) assert.equal(actual.dateFormat, expected.dateFormat, `${coord} date pattern`);
    if (expected.customPattern !== undefined) assert.ok(actual.customPattern?.includes("đ"), `${coord} custom pattern: ${JSON.stringify(actual)}`);
    if (expected.negativeStyle !== undefined) assert.equal(actual.negativeStyle, expected.negativeStyle, `${coord} negative style: ${JSON.stringify(actual)}`);
  }
  console.log(`PASS: real LibreOffice preserved ${formats.length} standard ODF number formats through FODS -> XLSX -> FODS (${fs.statSync(xlsx).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`);
  else fs.rmSync(root, { recursive: true, force: true });
}
