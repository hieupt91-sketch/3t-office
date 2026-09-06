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

export const XLSX_WORKBOOK_ENTRY = "xl/workbook.xml";

function asBuffer(zipPathOrBuffer) {
  return Buffer.isBuffer(zipPathOrBuffer) ? zipPathOrBuffer : fs.readFileSync(zipPathOrBuffer);
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
  if (!resolveWorkbookProtectionEnabled(options)) return source;
  const current = readZipEntry(source, XLSX_WORKBOOK_ENTRY);
  if (!current) {
    throw new Error("XLSX thiếu xl/workbook.xml — không thể bổ sung workbookProtection");
  }
  const xml = current.toString("utf8");
  const next = applyWorkbookProtectionLockStructure(xml);
  if (next === xml) return source;
  return patchOoxmlZip(source, { [XLSX_WORKBOOK_ENTRY]: next });
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
  if (!current) return String(fodsXml || "");
  return overlayFodsStructureProtection(fodsXml, current.toString("utf8"));
}
