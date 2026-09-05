/**
 * Live soffice: FODS (structure-protected) → XLSX, then VN post-process
 * adds lockStructure="1". Patched XLSX must reopen via soffice and stay valid.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { postProcessSheetXlsx } from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import {
  applyWorkbookProtectionLockStructure,
  workbookHasStructureLock
} from "../../adapters/libreoffice/sheet/xlsx-workbook-protection.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

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
const adapter = new SheetAdapter(grid);
assert.equal(adapter.wantsNativeXlsxWorkbookProtection(), true);
const sourceXml = adapter.serializeToFods();
assert.match(sourceXml, /table:structure-protected="true"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-xlsx-lock-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "lock.fods");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const xlsxPath = convertWithSoffice(source, "xlsx", path.join(tempRoot, "xlsx"), { profileDir, appKind: "sheet" });
  const loWorkbook = readZipEntry(xlsxPath, "xl/workbook.xml").toString("utf8");
  assert.match(loWorkbook, /<workbookProtection\b/, "LO phải còn element workbookProtection");
  assert.equal(workbookHasStructureLock(loWorkbook), false, "LO convert chưa ghi lockStructure=1 (đúng giới hạn đã audit)");

  const jsPatchedBytes = postProcessSheetXlsx(xlsxPath, { adapter, sourceFods: sourceXml });
  const jsPatchedPath = path.join(tempRoot, "js-patched.xlsx");
  fs.writeFileSync(jsPatchedPath, jsPatchedBytes);

  const jsWorkbook = readZipEntry(jsPatchedPath, "xl/workbook.xml").toString("utf8");
  assert.equal(workbookHasStructureLock(jsWorkbook), true, `JS patch thiếu lockStructure. tag=${jsWorkbook.match(/<workbookProtection\b[^>]*>/i)}`);
  assert.match(jsWorkbook, /lockStructure="1"/);
  const pr = jsWorkbook.search(/<(?:[\w]+:)?workbookPr\b/i);
  const prot = jsWorkbook.search(/<(?:[\w]+:)?workbookProtection\b/i);
  const views = jsWorkbook.search(/<(?:[\w]+:)?bookViews\b/i);
  assert.ok(pr >= 0 && pr < prot && prot < views, "JS: workbookProtection phải nằm sau workbookPr, trước bookViews");
  assert.equal((jsWorkbook.match(/<workbookProtection\b/gi) || []).length, 1, "không nhân đôi workbookProtection");

  const roundFods = convertWithSoffice(jsPatchedPath, "fods", path.join(tempRoot, "fods"), { profileDir, appKind: "sheet" });
  const roundXml = fs.readFileSync(roundFods, "utf8");
  assert.ok(roundXml.includes("Khóa cấu trúc") || roundXml.includes("BaoCao"), "FODS round-trip mất nội dung");
  const structureKept = /table:structure-protected="true"/i.test(roundXml);
  const parsed = new SheetAdapter(null).parseFods(roundXml);
  assert.ok(parsed.sheets?.includes(sheet) || parsed.sheets?.length > 0, `sheets=${JSON.stringify(parsed.sheets)}`);

  const pdfPath = convertWithSoffice(jsPatchedPath, "pdf", path.join(tempRoot, "pdf"), { profileDir, appKind: "sheet" });
  assert.ok(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 100, "patched XLSX → PDF thất bại (file hỏng)");

  const pyOut = path.join(tempRoot, "py-patched.xlsx");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--xlsx", xlsxPath,
    "--fods", source,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyWorkbook = readZipEntry(pyOut, "xl/workbook.xml").toString("utf8");
  assert.equal(workbookHasStructureLock(pyWorkbook), true, "Python twin phải ghi lockStructure");
  assert.equal(
    applyWorkbookProtectionLockStructure(loWorkbook),
    applyWorkbookProtectionLockStructure(applyWorkbookProtectionLockStructure(loWorkbook)),
    "JS XML transform idempotent trên XML soffice thật"
  );

  console.log(JSON.stringify({
    loHadProtectionElement: true,
    loHadLockStructure: false,
    jsLockStructure: true,
    pythonLockStructure: true,
    sofficeReopenFodsOk: true,
    sofficeReopenPdfOk: true,
    loRoundTripStructureProtected: structureKept,
    xlsxBytes: fs.statSync(jsPatchedPath).size
  }));
  console.log(`PASS: native XLSX workbookProtection lockStructure patched; soffice reopened FODS+PDF. structureKeptAfterHop=${structureKept}`);
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
