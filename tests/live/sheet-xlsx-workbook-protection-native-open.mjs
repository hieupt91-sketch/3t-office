/**
 * Live soffice: Save Protect Workbook → XLSX (Phase 1 post-process) →
 * Open that XLSX (soffice XLSX→FODS + Phase 2a overlay) →
 * SheetAdapter.workbookProtection.enabled === true.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { postProcessSheetXlsx, overlaySheetXlsxFods } from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import {
  fodsHasStructureProtection,
  workbookHasStructureLock
} from "../../adapters/libreoffice/sheet/xlsx-workbook-protection.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

function container() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

const sheet = "BaoCao";
const grid = {
  sheets: [sheet],
  activeSheet: sheet,
  sheetsData: {
    [sheet]: new Map([
      ["A1", { val: "Khóa cấu trúc", formula: "", style: {} }],
      ["B1", { val: 42, formula: "", style: {} }]
    ])
  },
  workbookProtection: { enabled: true, password: "" }
};
const saveAdapter = new SheetAdapter(grid);
assert.equal(saveAdapter.wantsNativeXlsxWorkbookProtection(), true);
const sourceXml = saveAdapter.serializeToFods();
assert.match(sourceXml, /table:structure-protected="true"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-xlsx-open-lock-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "lock.fods");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const xlsxPath = convertWithSoffice(source, "xlsx", path.join(tempRoot, "xlsx"), { profileDir, appKind: "sheet" });
  const loWorkbook = readZipEntry(xlsxPath, "xl/workbook.xml").toString("utf8");
  assert.equal(workbookHasStructureLock(loWorkbook), false, "LO FODS→XLSX chưa ghi lockStructure (đúng giới hạn Phase 1)");

  const patchedBytes = postProcessSheetXlsx(xlsxPath, { adapter: saveAdapter, sourceFods: sourceXml });
  const patchedPath = path.join(tempRoot, "saved.xlsx");
  fs.writeFileSync(patchedPath, patchedBytes);
  const patchedWorkbook = readZipEntry(patchedPath, "xl/workbook.xml").toString("utf8");
  assert.equal(workbookHasStructureLock(patchedWorkbook), true, "Phase 1 Lưu XLSX phải có lockStructure=1");

  const reopenFodsPath = convertWithSoffice(patchedPath, "fods", path.join(tempRoot, "reopen-fods"), { profileDir, appKind: "sheet" });
  const loReopenFods = fs.readFileSync(reopenFodsPath, "utf8");
  assert.ok(loReopenFods.includes("Khóa cấu trúc") || loReopenFods.includes("BaoCao"), "FODS mở lại mất nội dung");
  assert.equal(fodsHasStructureProtection(loReopenFods), false, "LibreOffice XLSX→FODS vẫn không map lockStructure (lý do Phase 2a)");

  const jsOverlaid = overlaySheetXlsxFods(patchedPath, loReopenFods);
  assert.equal(fodsHasStructureProtection(jsOverlaid), true, "JS overlay phải gắn table:structure-protected");

  const pyOut = path.join(tempRoot, "py-overlaid.fods");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--xlsx", patchedPath,
    "--overlay-fods", reopenFodsPath,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyOverlaid = fs.readFileSync(pyOut, "utf8");
  assert.equal(fodsHasStructureProtection(pyOverlaid), true, "Python overlay phải gắn structure-protected");
  assert.equal(jsOverlaid, pyOverlaid, "JS/Python overlay phải cùng FODS trên file soffice thật");

  const openedGrid = new SheetGridController(container());
  const opened = new SheetAdapter(openedGrid);
  assert.equal(opened.loadFromFods(jsOverlaid), true, "loadFromFods FODS overlay");
  assert.equal(opened.workbookProtection.enabled, true, "SheetAdapter.workbookProtection.enabled phải true sau khi mở XLSX đã Lưu");
  assert.equal(openedGrid.isWorkbookProtected(), true, "canvas UI phải khóa cấu trúc");
  const beforeCount = openedGrid.sheets.length;
  assert.equal(openedGrid.addSheet(), false, "không thêm được trang khi khóa workbook");
  assert.equal(openedGrid.sheets.length, beforeCount);

  console.log(JSON.stringify({
    loExportHadLockStructure: false,
    phase1LockStructure: true,
    loReopenHadStructureProtected: false,
    jsOverlayStructureProtected: true,
    pythonOverlayStructureProtected: true,
    adapterWorkbookProtectionEnabled: opened.workbookProtection.enabled,
    uiIsWorkbookProtected: openedGrid.isWorkbookProtected(),
    xlsxBytes: fs.statSync(patchedPath).size
  }));
  console.log("PASS: Lưu XLSX Protect Workbook → Mở lại → SheetAdapter.workbookProtection.enabled === true");
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
