/**
 * Live soffice: FODS (Freeze Panes tại D5 => 4 hàng, 3 cột) → XLSX thật qua
 * soffice, xác nhận soffice BỎ QUA hoàn toàn <pane> (không khôi phục từ ODF
 * office:settings — giới hạn thật đã xác nhận), rồi postProcessSheetXlsx()
 * ghi lại đúng <pane> chuẩn OOXML vào XLSX thật. Vòng ngược lại: XLSX đã vá →
 * FODS thật qua soffice (soffice cũng không giữ <pane> qua FODS), rồi
 * overlaySheetXlsxFods() đọc lại <pane> thật từ XLSX gốc và khôi phục đúng
 * vno:frozen-rows/cols trước khi SheetAdapter.parseFods() chạy.
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
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

function fakeContainer() {
  return {
    style: {}, className: "", classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  };
}

const grid = new SheetGridController(fakeContainer());
grid.selectedCoord = { c: "D", r: 5 };
grid.toggleFreezePanes();
assert.equal(grid.frozenRows, 4);
assert.equal(grid.frozenCols, 3);

const adapter = new SheetAdapter(grid);
const sourceFods = adapter.serializeToFods();
assert.match(sourceFods, /vno:frozen-rows="4" vno:frozen-cols="3"/, "FODS nguồn phải khai báo đúng freeze thật");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-freeze-panes-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "sheet.fods");
fs.writeFileSync(source, sourceFods, "utf8");

try {
  const xlsxPath = convertWithSoffice(source, "xlsx", path.join(tempRoot, "xlsx"), { profileDir, appKind: "sheet" });
  const loSheet1 = readZipEntry(xlsxPath, "xl/worksheets/sheet1.xml").toString("utf8");
  assert.equal(/<pane\b/i.test(loSheet1), false, "probe: soffice thật bỏ qua Freeze Panes qua ODF (giới hạn đã xác nhận, không phải lỗi VN Office)");

  const jsPatchedBytes = postProcessSheetXlsx(xlsxPath, { sourceFods });
  const jsPatchedPath = path.join(tempRoot, "js-patched.xlsx");
  fs.writeFileSync(jsPatchedPath, jsPatchedBytes);
  const jsSheet1 = readZipEntry(jsPatchedPath, "xl/worksheets/sheet1.xml").toString("utf8");
  assert.match(jsSheet1, /xSplit="3"/, "JS patch phải ghi đúng xSplit=3 (3 cột cố định)");
  assert.match(jsSheet1, /ySplit="4"/, "JS patch phải ghi đúng ySplit=4 (4 hàng cố định)");
  assert.match(jsSheet1, /state="frozen"/);

  const roundFods = convertWithSoffice(jsPatchedPath, "fods", path.join(tempRoot, "fods2"), { profileDir, appKind: "sheet" });
  const roundXml = fs.readFileSync(roundFods, "utf8");
  const loKeptPaneInFods = /HorizontalSplitMode|VerticalSplitMode/.test(roundXml);

  const overlaidFods = overlaySheetXlsxFods(jsPatchedPath, roundXml);
  assert.match(overlaidFods, /vno:frozen-rows="4" vno:frozen-cols="3"/, "Overlay phải khôi phục đúng freeze thật từ XLSX gốc vào FODS");

  const reparsedGrid = { sheets: [], sheetsData: {}, sheetStates: {} };
  const reparsedAdapter = new SheetAdapter(reparsedGrid);
  assert.ok(reparsedAdapter.loadFromFods(overlaidFods), "Phải nạp lại được FODS đã overlay");
  assert.equal(reparsedGrid.frozenRows, 4, `frozenRows sau khi mở lại phải là 4, thực tế: ${reparsedGrid.frozenRows}`);
  assert.equal(reparsedGrid.frozenCols, 3, `frozenCols sau khi mở lại phải là 3, thực tế: ${reparsedGrid.frozenCols}`);

  const pyOut = path.join(tempRoot, "py-patched.xlsx");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--xlsx", xlsxPath,
    "--fods", source,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pySheet1 = readZipEntry(pyOut, "xl/worksheets/sheet1.xml").toString("utf8");
  assert.match(pySheet1, /xSplit="3"/, "Python twin phải ghi đúng xSplit=3");
  assert.match(pySheet1, /ySplit="4"/, "Python twin phải ghi đúng ySplit=4");

  console.log(JSON.stringify({
    loHadPane: false,
    loKeptPaneInFodsRoundTrip: loKeptPaneInFods,
    jsPatchedHasPane: true,
    pythonPatchedHasPane: true,
    reparsedFrozenRows: reparsedGrid.frozenRows,
    reparsedFrozenCols: reparsedGrid.frozenCols
  }));
  console.log("PASS: soffice thật bỏ qua Freeze Panes qua ODF cả 2 chiều; postprocess (JS+Python) và open-overlay khôi phục đúng, round-trip đầy đủ qua VN Office.");
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
