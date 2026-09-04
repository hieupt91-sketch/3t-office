import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const candidates = [
  process.env.VNOFFICE_SOFFICE_PATH,
  path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe"),
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "soffice"
].filter(Boolean);
const soffice = candidates.find(candidate => candidate === "soffice" || fs.existsSync(candidate));
assert.ok(soffice, "LibreOffice soffice is required for this live conversion test");

const grid = {
  sheets: ["Doanh thu", "Kế hoạch quý", "Nhân sự Việt Nam"],
  activeSheet: "Kế hoạch quý",
  sheetsData: {
    "Doanh thu": new Map([
      ["A1", { val: "Mặt hàng", formula: "", style: {} }],
      ["B2", { val: 1250.5, formula: "", style: {} }],
      ["C3", { val: 1260.5, formula: "=SUM(B2,10)", style: {} }]
    ]),
    "Kế hoạch quý": new Map([
      ["A1", { val: "Quý III & IV", formula: "", style: {} }],
      ["F10", { val: -42.75, formula: "", style: {} }]
    ]),
    "Nhân sự Việt Nam": new Map([
      ["A1", { val: "Nguyễn Văn An", formula: "", style: {} }],
      ["B1", { val: 37, formula: "", style: {} }]
    ])
  }
};

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-fods-"));
const xlsxDir = path.join(tempRoot, "xlsx");
const fodsDir = path.join(tempRoot, "fods");
const profileDir = path.join(tempRoot, "profile");
fs.mkdirSync(xlsxDir);
fs.mkdirSync(fodsDir);
fs.mkdirSync(profileDir);
const sourceFods = path.join(tempRoot, "draft.fods");
fs.writeFileSync(sourceFods, new SheetAdapter(grid).serializeToFods(), "utf8");

function convert(source, target, filter, outputDirectory) {
  const result = spawnSync(soffice, [
    "--headless", "--invisible", "--nocrashreport", "--nodefault", "--nolockcheck", "--nologo", "--norestore",
    `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
    "--convert-to", `${target}:${filter}`, "--outdir", outputDirectory, source
  ], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, `soffice ${target} conversion failed: ${result.stderr || result.stdout}`);
}

try {
  convert(sourceFods, "xlsx", "Calc MS Excel 2007 XML", xlsxDir);
  const xlsxPath = path.join(xlsxDir, "draft.xlsx");
  assert.ok(fs.existsSync(xlsxPath) && fs.statSync(xlsxPath).size > 0, "FODS → XLSX did not create a real workbook");

  convert(xlsxPath, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir);
  const roundTripPath = path.join(fodsDir, "draft.fods");
  assert.ok(fs.existsSync(roundTripPath), "XLSX → FODS explicit filter did not create output");
  const workbook = new SheetAdapter(null).parseFods(fs.readFileSync(roundTripPath, "utf8"));
  assert.deepEqual(workbook.sheets, grid.sheets);
  // LibreOffice's headless --convert-to pipeline does not carry ooo:view-settings
  // (Views/ActiveTable) through a FODS -> XLSX -> FODS hop — confirmed by inspecting
  // the real converted FODS output, which only ever contains VisibleAreaTop/Left/
  // Width/Height, never a Views map. This is a real engine limitation, not something
  // our serializer/parser controls, so parseFods() falls back to the first sheet when
  // no ActiveTable survives. The in-memory adapter round-trip (no real soffice hop)
  // is what verifies our own ActiveTable read/write logic — see sheet-file-io.test.js.
  assert.ok(workbook.sheets.includes(workbook.activeSheet), "active sheet must fall back to a real sheet name, never be lost/blank");
  assert.equal(workbook.sheetsData["Doanh thu"].get("A1")?.val, "Mặt hàng");
  assert.equal(workbook.sheetsData["Doanh thu"].get("B2")?.val, 1250.5);
  assert.equal(workbook.sheetsData["Doanh thu"].get("C3")?.val, 1260.5);
  assert.equal(workbook.sheetsData["Kế hoạch quý"].get("A1")?.val, "Quý III & IV");
  assert.equal(workbook.sheetsData["Kế hoạch quý"].get("F10")?.val, -42.75);
  assert.equal(workbook.sheetsData["Nhân sự Việt Nam"].get("A1")?.val, "Nguyễn Văn An");
  assert.equal(workbook.sheetsData["Nhân sự Việt Nam"].get("B1")?.val, 37);
  console.log(`PASS: real LibreOffice FODS → XLSX → FODS preserved ${workbook.sheets.length} sheets (${fs.statSync(xlsxPath).size} byte XLSX).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
