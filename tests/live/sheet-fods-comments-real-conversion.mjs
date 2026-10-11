import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe");
assert.ok(fs.existsSync(soffice));
const sheet = "Ghi chú";
const grid = {
  sheets: [sheet], activeSheet: sheet,
  sheetsData: { [sheet]: new Map([["B2", { val: "Số liệu", formula: "", style: {} }]]) },
  commentsBySheet: { [sheet]: {
    B2: { coord: "B2", text: "Kiểm tra hóa đơn", author: "Nguyễn Lan", timestamp: "2026-09-04T08:30:00.000Z" },
    D4: { coord: "D4", text: "Ghi chú trên ô trống", author: "Kế toán", timestamp: "2026-09-04T09:00:00.000Z" }
  } }
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-comments-"));
const xlsxDir = path.join(root, "xlsx"), fodsDir = path.join(root, "fods"), profile = path.join(root, "profile");
[xlsxDir, fodsDir, profile].forEach(dir => fs.mkdirSync(dir));
const source = path.join(root, "comments.fods"); fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");
const convert = (input, target, filter, outdir) => {
  const result = spawnSync(soffice, ["--headless", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
try {
  convert(source, "xlsx", "Calc MS Excel 2007 XML", xlsxDir);
  const xlsx = path.join(xlsxDir, "comments.xlsx"); assert.ok(fs.existsSync(xlsx));
  convert(xlsx, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir);
  const xml = fs.readFileSync(path.join(fodsDir, "comments.fods"), "utf8");
  assert.match(xml, /<office:annotation\b/);
  const comments = new SheetAdapter(null).parseFods(xml).commentsBySheet[sheet];
  assert.equal(comments.B2.text, "Kiểm tra hóa đơn"); assert.equal(comments.B2.author, "Nguyễn Lan");
  assert.equal(comments.D4.text, "Ghi chú trên ô trống"); assert.equal(comments.D4.author, "Kế toán");
  console.log(`PASS: real LibreOffice preserved comments on populated and empty cells through FODS -> XLSX -> FODS (${fs.statSync(xlsx).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`); else fs.rmSync(root, { recursive: true, force: true });
}
