import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe");
assert.ok(fs.existsSync(soffice), `Không tìm thấy LibreOffice tại ${soffice}`);
const sheet = "Báo cáo quý";
const grid = {
  sheets: [sheet], activeSheet: sheet,
  sheetsData: { [sheet]: new Map([["A1", { val: "Doanh thu", formula: "", style: {} }], ["F20", { val: 120, formula: "", style: {} }]]) },
  commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [],
  printAreaBySheet: { [sheet]: "A1:F20" }
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-print-area-"));
const xlsxDir = path.join(root, "xlsx"), fodsDir = path.join(root, "fods"), profile = path.join(root, "profile");
[xlsxDir, fodsDir, profile].forEach(dir => fs.mkdirSync(dir));
const source = path.join(root, "print-area.fods");
fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
const convert = (input, target, filter, outdir) => {
  const result = spawnSync(soffice, ["--headless", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
try {
  convert(source, "xlsx", "Calc MS Excel 2007 XML", xlsxDir);
  const xlsx = path.join(xlsxDir, "print-area.xlsx");
  assert.ok(fs.existsSync(xlsx));
  convert(xlsx, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir);
  const xml = fs.readFileSync(path.join(fodsDir, "print-area.fods"), "utf8");
  assert.match(xml, /table:print-ranges=/);
  const parsed = new SheetAdapter(null).parseFods(xml);
  assert.equal(parsed.printAreaBySheet[sheet], "A1:F20");
  console.log(`PASS: real LibreOffice preserved Print Area through FODS -> XLSX -> FODS (${fs.statSync(xlsx).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`);
  else fs.rmSync(root, { recursive: true, force: true });
}
