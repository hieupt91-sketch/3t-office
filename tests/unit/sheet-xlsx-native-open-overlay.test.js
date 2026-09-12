/**
 * Unit tests — Sheet native XLSX open overlay (Phase 2a).
 * LibreOffice XLSX→FODS drops lockStructure; overlay FODS before parseFods.
 * No soffice. Fake OOXML ZIP + serialize/parse of a real SheetAdapter grid.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import {
  applyFodsStructureProtection,
  fodsHasStructureProtection,
  overlayFodsStructureProtection,
  workbookHasStructureLock
} from "../../adapters/libreoffice/sheet/xlsx-workbook-protection.js";
import {
  overlayActiveSheetToFods,
  overlaySheetXlsxFods,
  postProcessSheetXlsx
} from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PYTHON_PATCHER = path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const LO_WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="Calc" lowestEdited="4"/><workbookPr backupFile="false" showObjects="all" date1904="false"/><workbookProtection lockWindows="false"/><bookViews><workbookView showHorizontalScroll="true" showVerticalScroll="true" showSheetTabs="true" xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192" tabRatio="500" firstSheet="0" activeSheet="0"/></bookViews><sheets><sheet name="BaoCao" sheetId="1" state="visible" r:id="rId3"/></sheets><calcPr iterateCount="100" refMode="A1" iterate="false" iterateDelta="0.001"/></workbook>`;

const LOCKED_WORKBOOK_XML = LO_WORKBOOK_XML.replace(
  "<workbookProtection lockWindows=\"false\"/>",
  "<workbookProtection lockWindows=\"false\" lockStructure=\"1\"/>"
);

const LO_FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="BaoCao"><table:table-row><table:table-cell office:value-type="string"><text:p>Khóa cấu trúc</text:p></table:table-cell></table:table-row></table:table>
  </office:spreadsheet></office:body>
</office:document>`;

const WORKBOOK_XML_3_SHEETS_ACTIVE_1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView activeTab="1"/></bookViews>
  <sheets>
    <sheet name="foxz" sheetId="1" state="veryHidden" r:id="rId1"/>
    <sheet name="Thông báo Sản phẩm mới" sheetId="2" r:id="rId2"/>
    <sheet name="Camera IP" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`;

const FODS_3_SHEETS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="foxz"><table:table-row><table:table-cell office:value-type="string"><text:p>foxz</text:p></table:table-cell></table:table-row></table:table>
    <table:table table:name="Thông báo Sản phẩm mới"><table:table-row><table:table-cell office:value-type="string"><text:p>tb</text:p></table:table-cell></table:table-row></table:table>
    <table:table table:name="Camera IP"><table:table-row><table:table-cell office:value-type="string"><text:p>cam</text:p></table:table-cell></table:table-row></table:table>
  </office:spreadsheet></office:body>
</office:document>`;

const FODS_3_SHEETS_WITH_ACTIVE_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:settings>
    <config:config-item-set config:name="ooo:view-settings">
      <config:config-item-map-indexed config:name="Views">
        <config:config-item-map-entry>
          <config:config-item config:name="ActiveTable" config:type="string">Camera IP</config:config-item>
        </config:config-item-map-entry>
      </config:config-item-map-indexed>
    </config:config-item-set>
  </office:settings>
  <office:body><office:spreadsheet>
    <table:table table:name="foxz"><table:table-row><table:table-cell office:value-type="string"><text:p>foxz</text:p></table:table-cell></table:table-row></table:table>
    <table:table table:name="Thông báo Sản phẩm mới"><table:table-row><table:table-cell office:value-type="string"><text:p>tb</text:p></table:table-cell></table:table-row></table:table>
    <table:table table:name="Camera IP"><table:table-row><table:table-cell office:value-type="string"><text:p>cam</text:p></table:table-cell></table:table-row></table:table>
  </office:spreadsheet></office:body>
</office:document>`;

function fakeXlsx(workbookXml) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/worksheets/sheet1.xml", data: '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>' }
  ]);
}

function container() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

function makeProtectedAdapter() {
  const sheet = "BaoCao";
  return new SheetAdapter({
    sheets: [sheet],
    activeSheet: sheet,
    sheetsData: {
      [sheet]: new Map([["A1", { val: "Khóa cấu trúc", formula: "", style: {} }]])
    },
    workbookProtection: { enabled: true, password: "" }
  });
}

function stripStructureProtected(fods) {
  return String(fods).replace(/\s*table:structure-protected\s*=\s*["']true["']/gi, "");
}

export async function runSheetXlsxNativeOpenOverlayTests() {
  const results = [];
  const test = async (name, callback) => {
    try {
      await callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("overlayFodsStructureProtection: chèn table:structure-protected khi lockStructure=1", () => {
    assert(!fodsHasStructureProtection(LO_FODS), "FODS soffice giả lập chưa khóa");
    const next = overlayFodsStructureProtection(LO_FODS, LOCKED_WORKBOOK_XML);
    assert(fodsHasStructureProtection(next), "sau overlay phải có structure-protected=true");
    assert(/<office:spreadsheet table:structure-protected="true">/.test(next), `tag=${next.match(/<office:spreadsheet\b[^>]*>/)}`);
    assert(next.includes("Khóa cấu trúc"), "giữ nội dung FODS");
  });

  await test("overlay no-op khi XLSX không khóa structure", () => {
    assert(!workbookHasStructureLock(LO_WORKBOOK_XML), "probe LO chưa lockStructure");
    const next = overlayFodsStructureProtection(LO_FODS, LO_WORKBOOK_XML);
    assert(next === LO_FODS, "không sửa FODS khi lockStructure tắt");
    assert(!fodsHasStructureProtection(next), "không tự khóa");
  });

  await test("overlay no-op khi FODS đã có structure-protected; false được nâng lên true", () => {
    const already = overlayFodsStructureProtection(LO_FODS, LOCKED_WORKBOOK_XML);
    const twice = overlayFodsStructureProtection(already, LOCKED_WORKBOOK_XML);
    assert(already === twice, "idempotent khi đã true");
    const off = LO_FODS.replace("<office:spreadsheet>", '<office:spreadsheet table:structure-protected="false">');
    const upgraded = applyFodsStructureProtection(off);
    assert(fodsHasStructureProtection(upgraded), "false → true");
    assert(!/structure-protected="false"/.test(upgraded), "không còn false");
  });

  await test("parseFods sau overlay: workbookProtection.enabled === true", () => {
    const overlaid = overlayFodsStructureProtection(LO_FODS, LOCKED_WORKBOOK_XML);
    const parsed = new SheetAdapter(null).parseFods(overlaid);
    assert(parsed.workbookProtection?.enabled === true, `parsed=${JSON.stringify(parsed.workbookProtection)}`);
    assert(parsed.sheets.includes("BaoCao"), `sheets=${JSON.stringify(parsed.sheets)}`);
  });

  await test("Save XLSX (Phase 1 post-process) → Mở (Phase 2a overlay) → SheetAdapter.workbookProtection.enabled === true", () => {
    const savedAdapter = makeProtectedAdapter();
    assert(savedAdapter.wantsNativeXlsxWorkbookProtection() === true, "grid khóa trước khi lưu");
    const sourceFods = savedAdapter.serializeToFods();
    assert(fodsHasStructureProtection(sourceFods), "serialize FODS phải có structure-protected");

    const loXlsx = fakeXlsx(LO_WORKBOOK_XML);
    assert(!workbookHasStructureLock(readZipEntry(loXlsx, "xl/workbook.xml").toString("utf8")));
    const nativeXlsx = postProcessSheetXlsx(loXlsx, { adapter: savedAdapter, sourceFods });
    assert(workbookHasStructureLock(readZipEntry(nativeXlsx, "xl/workbook.xml").toString("utf8")), "Phase 1 phải ghi lockStructure");

    const loReopenFods = stripStructureProtected(sourceFods);
    assert(!fodsHasStructureProtection(loReopenFods), "soffice XLSX→FODS giả lập phải mất khóa");
    const overlaid = overlaySheetXlsxFods(nativeXlsx, loReopenFods);
    assert(fodsHasStructureProtection(overlaid), "Phase 2a phải gắn lại structure-protected từ XLSX gốc");

    const grid = new SheetGridController(container());
    const opened = new SheetAdapter(grid);
    assert(opened.loadFromFods(overlaid) === true, "loadFromFods phải thành công");
    assert(opened.workbookProtection.enabled === true, "SheetAdapter.workbookProtection.enabled phải true sau khi mở");
    assert(opened.wantsNativeXlsxWorkbookProtection() === true, "adapter vẫn báo khóa native");
    assert(grid.workbookProtection?.enabled === true, "grid.workbookProtection.enabled");
    assert(grid.isWorkbookProtected() === true, "UI isWorkbookProtected");
    const beforeCount = grid.sheets.length;
    assert(grid.addSheet() === false, "canvas phải chặn thêm trang khi khóa cấu trúc");
    assert(grid.sheets.length === beforeCount, "số trang không tăng");
  });

  await test("loadFromFods(fods, ooxmlWorkbookXml) overlay trước parseFods (pattern Writer)", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    assert(!fodsHasStructureProtection(LO_FODS));
    assert(adapter.loadFromFods(LO_FODS, LOCKED_WORKBOOK_XML) === true);
    assert(adapter.workbookProtection.enabled === true, "adapter phải khóa khi nhận ooxmlWorkbookXml");
    assert(grid.isWorkbookProtected() === true, "UI khóa từ workbook xml gốc");
  });

  await test("SheetAdapter.open() overlay từ payload ooxmlWorkbookXml", async () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    const orig = globalUnoBridge.openRealFile;
    const origEngine = globalUnoBridge.hasRealEngine;
    const origApi = globalUnoBridge.desktopApi;
    globalUnoBridge.hasRealEngine = true;
    globalUnoBridge.desktopApi = {
      open_document_dialog: async () => ({
        status: "ok",
        content: LO_FODS,
        ooxmlWorkbookXml: LOCKED_WORKBOOK_XML,
        fileName: "BaoCao.xlsx"
      })
    };
    try {
      const ok = await adapter.open();
      assert(ok === true, "open() phải thành công");
      assert(adapter.workbookProtection.enabled === true, "open() phải khóa canvas");
      assert(grid.isWorkbookProtected() === true);
    } finally {
      globalUnoBridge.openRealFile = orig;
      globalUnoBridge.hasRealEngine = origEngine;
      globalUnoBridge.desktopApi = origApi;
    }
  });

  await test("Python twin overlay FODS giống JS (CLI --overlay-fods)", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-xlsx-open-"));
    try {
      const xlsxPath = path.join(tempRoot, "locked.xlsx");
      const fodsPath = path.join(tempRoot, "lo.fods");
      const outPath = path.join(tempRoot, "overlaid.fods");
      fs.writeFileSync(xlsxPath, fakeXlsx(LOCKED_WORKBOOK_XML));
      fs.writeFileSync(fodsPath, LO_FODS, "utf8");
      const py = spawnSync(process.env.PYTHON || "python", [
        PYTHON_PATCHER,
        "--xlsx", xlsxPath,
        "--overlay-fods", fodsPath,
        "--out", outPath
      ], { encoding: "utf8" });
      assert(py.status === 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
      const pyFods = fs.readFileSync(outPath, "utf8");
      const jsFods = overlaySheetXlsxFods(fs.readFileSync(xlsxPath), LO_FODS);
      assert(fodsHasStructureProtection(pyFods), "Python phải gắn structure-protected");
      assert(jsFods === pyFods, "JS và Python overlay phải ra cùng FODS");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  await test("loadFromFods(fods, workbookXml): FODS 3 sheet không ActiveTable + workbook.xml activeTab='1' -> grid.activeSheet = tên sheet thứ 2", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    assert(adapter.loadFromFods(FODS_3_SHEETS, WORKBOOK_XML_3_SHEETS_ACTIVE_1) === true);
    assert(grid.activeSheet === "Thông báo Sản phẩm mới", `grid.activeSheet = ${grid.activeSheet}`);
  });

  await test("loadFromFods(fods) không có workbookXml -> sheet đầu (fallback)", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    assert(adapter.loadFromFods(FODS_3_SHEETS) === true);
    assert(grid.activeSheet === "foxz", `grid.activeSheet = ${grid.activeSheet}`);
  });

  await test("loadFromFods(fods, workbookXml): FODS đã có ActiveTable -> giữ nguyên", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    assert(adapter.loadFromFods(FODS_3_SHEETS_WITH_ACTIVE_TABLE, WORKBOOK_XML_3_SHEETS_ACTIVE_1) === true);
    assert(grid.activeSheet === "Camera IP", `grid.activeSheet = ${grid.activeSheet}`);
  });

  await test("Python twin overlay ActiveTable trong FODS giống JS (CLI --overlay-fods)", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-xlsx-active-"));
    try {
      const xlsxPath = path.join(tempRoot, "active.xlsx");
      const fodsPath = path.join(tempRoot, "lo.fods");
      const outPath = path.join(tempRoot, "overlaid.fods");
      fs.writeFileSync(xlsxPath, fakeXlsx(WORKBOOK_XML_3_SHEETS_ACTIVE_1));
      fs.writeFileSync(fodsPath, FODS_3_SHEETS, "utf8");
      const py = spawnSync(process.env.PYTHON || "python", [
        PYTHON_PATCHER,
        "--xlsx", xlsxPath,
        "--overlay-fods", fodsPath,
        "--out", outPath
      ], { encoding: "utf8" });
      assert(py.status === 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
      const pyFods = fs.readFileSync(outPath, "utf8");
      const jsFods = overlaySheetXlsxFods(fs.readFileSync(xlsxPath), FODS_3_SHEETS);
      assert(pyFods.includes('config:name="ActiveTable"'), "Python phải gắn ActiveTable");
      assert(pyFods.includes(">Thông báo Sản phẩm mới<"), "Python phải trỏ đúng sheet thứ 2");
      assert(jsFods === pyFods, "JS và Python active sheet overlay phải ra cùng FODS");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  return results;
}
