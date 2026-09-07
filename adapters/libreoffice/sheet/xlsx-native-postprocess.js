/**
 * Node-only: patch a real XLSX (ZIP) after soffice FODS→XLSX convert.
 *
 * Do not import from SheetAdapter (browser / pywebview). Tests call this
 * after `convertWithSoffice`. Production File → Lưu uses the Python twin
 * hooked in main.py (`ooxml_zip_patch.py`).
 */
import fs from "node:fs";
import { patchOoxmlZip, readZipEntry } from "../common/ooxml-zip-patch.js";
import {
  applyWorkbookProtectionLockStructure,
  overlayFodsStructureProtection,
  resolveWorkbookProtectionEnabled
} from "./xlsx-workbook-protection.js";
import {
  applyFreezePaneToSheetXml,
  applyFreezePanesToFods,
  parseFreezePaneFromSheetXml,
  parseFreezePanesFromFods,
  resolveRidTargetMap,
  resolveSheetRidMap
} from "./xlsx-freeze-panes.js";

export const XLSX_WORKBOOK_ENTRY = "xl/workbook.xml";
export const XLSX_WORKBOOK_RELS_ENTRY = "xl/_rels/workbook.xml.rels";

function asBuffer(zipPathOrBuffer) {
  return Buffer.isBuffer(zipPathOrBuffer) ? zipPathOrBuffer : fs.readFileSync(zipPathOrBuffer);
}

/** Tên sheet (thứ tự trong xl/workbook.xml) -> đường dẫn zip entry worksheetN.xml thật. */
function resolveXlsxSheetEntries(source) {
  const workbookXml = readZipEntry(source, XLSX_WORKBOOK_ENTRY)?.toString("utf8");
  const relsXml = readZipEntry(source, XLSX_WORKBOOK_RELS_ENTRY)?.toString("utf8");
  if (!workbookXml || !relsXml) return {};
  const ridBySheet = resolveSheetRidMap(workbookXml);
  const targetByRid = resolveRidTargetMap(relsXml);
  const result = {};
  for (const [sheetName, rid] of Object.entries(ridBySheet)) {
    const target = targetByRid[rid];
    if (target) result[sheetName] = target;
  }
  return result;
}

/**
 * @param {string|Buffer} xlsxPathOrBuffer
 * @param {{
 *   workbookProtectionEnabled?: boolean,
 *   adapter?: { wantsNativeXlsxWorkbookProtection?: function },
 *   grid?: { workbookProtection?: { enabled?: boolean } },
 *   sourceFods?: string
 * }} [options]
 * @returns {Buffer} original bytes when no patch is needed
 */
export function postProcessSheetXlsx(xlsxPathOrBuffer, options = {}) {
  const source = asBuffer(xlsxPathOrBuffer);
  const replacements = {};

  if (resolveWorkbookProtectionEnabled(options)) {
    const current = readZipEntry(source, XLSX_WORKBOOK_ENTRY);
    if (!current) {
      throw new Error("XLSX thiếu xl/workbook.xml — không thể bổ sung workbookProtection");
    }
    const xml = current.toString("utf8");
    const next = applyWorkbookProtectionLockStructure(xml);
    if (next !== xml) replacements[XLSX_WORKBOOK_ENTRY] = next;
  }

  // Freeze Panes: soffice thật không khôi phục <pane> qua ODF office:settings
  // khi chuyển đổi headless FODS->XLSX (xác nhận qua vòng chuyển đổi soffice
  // thật) - ghi thẳng <pane> chuẩn vào (các) worksheetN.xml thật dựa theo
  // vno:frozen-rows/cols mà VN Office tự lưu trong FODS nguồn.
  const freezeBySheet = parseFreezePanesFromFods(options.sourceFods);
  if (Object.keys(freezeBySheet).length > 0) {
    const sheetEntries = resolveXlsxSheetEntries(source);
    for (const [sheetName, freeze] of Object.entries(freezeBySheet)) {
      const entryPath = sheetEntries[sheetName];
      if (!entryPath) continue;
      const sheetXml = (replacements[entryPath] || readZipEntry(source, entryPath)?.toString("utf8"));
      if (!sheetXml) continue;
      const nextSheetXml = applyFreezePaneToSheetXml(sheetXml, freeze.rows, freeze.cols);
      if (nextSheetXml !== sheetXml) replacements[entryPath] = nextSheetXml;
    }
  }

  if (Object.keys(replacements).length === 0) return source;
  return patchOoxmlZip(source, replacements);
}

/**
 * Phase 2a File → Mở: read xl/workbook.xml from the original XLSX ZIP
 * (via ooxml-zip-patch.js, not a rewritten ZIP reader) and overlay FODS
 * before SheetAdapter.parseFods().
 *
 * @param {string|Buffer} xlsxPathOrBuffer original XLSX, before or after convert
 * @param {string} fodsXml soffice XLSX→FODS output (usually missing structure-protected)
 * @returns {string} FODS with table:structure-protected when lockStructure is set
 */
export function overlaySheetXlsxFods(xlsxPathOrBuffer, fodsXml) {
  const source = asBuffer(xlsxPathOrBuffer);
  const current = readZipEntry(source, XLSX_WORKBOOK_ENTRY);
  let xml = String(fodsXml || "");
  if (current) xml = overlayFodsStructureProtection(xml, current.toString("utf8"));
  xml = overlaySheetXlsxFreezePanes(source, xml);
  return xml;
}

/**
 * File → Mở: đọc <pane state="frozen"> thật từ MỖI worksheetN.xml của XLSX
 * gốc (soffice không tự khôi phục việc này vào ODF office:settings khi
 * chuyển đổi XLSX->FODS) và ghi đè vno:frozen-rows/cols vào FODS trước khi
 * SheetAdapter.parseFods() chạy.
 */
export function overlaySheetXlsxFreezePanes(xlsxPathOrBuffer, fodsXml) {
  const source = asBuffer(xlsxPathOrBuffer);
  const xml = String(fodsXml || "");
  const sheetEntries = resolveXlsxSheetEntries(source);
  if (Object.keys(sheetEntries).length === 0) return xml;
  const freezeBySheet = {};
  for (const [sheetName, entryPath] of Object.entries(sheetEntries)) {
    const sheetXml = readZipEntry(source, entryPath)?.toString("utf8");
    if (!sheetXml) continue;
    const freeze = parseFreezePaneFromSheetXml(sheetXml);
    if (freeze) freezeBySheet[sheetName] = freeze;
  }
  return applyFreezePanesToFods(xml, freezeBySheet);
}
