/**
 * Pure XML helpers for native XLSX workbook-structure lock.
 *
 * ECMA-376 / ISO 29500-1 CT_Workbook sequence (relevant prefix):
 *   fileVersion, fileSharing, workbookPr, workbookProtection, bookViews, sheets, …
 *
 * LibreOffice FODS→XLSX already emits `<workbookProtection lockWindows="false"/>`
 * in the schema-valid slot, but omits `lockStructure`. Phase 1 sets
 * `lockStructure="1"` — the Excel-standard "Protect Workbook structure" flag.
 *
 * Browser-safe: no Node APIs. SheetAdapter may import this file.
 */

const PROTECTION_OPEN_RE = /<((?:[\w]+:)?workbookProtection)\b([^>]*?)(\/?)\s*>/i;
const LOCK_STRUCTURE_RE = /\blockStructure\s*=\s*(["'])[^"']*\1/i;
const BEFORE_SIBLING_RE = /<(?:[\w]+:)?(?:bookViews|sheets)\b/i;
const WORKBOOK_CLOSE_RE = /<\/(?:[\w]+:)?workbook\s*>/i;
const FODS_STRUCTURE_RE = /<office:spreadsheet\b[^>]*table:structure-protected\s*=\s*["']true["']/i;
const SPREADSHEET_OPEN_RE = /<office:spreadsheet\b([^>]*?)(\/?)\s*>/i;
const STRUCTURE_ATTR_RE = /\btable:structure-protected\s*=\s*(["'])[^"']*\1/i;

export function fodsHasStructureProtection(fodsXml) {
  return FODS_STRUCTURE_RE.test(String(fodsXml || ""));
}

export function workbookHasStructureLock(workbookXml) {
  const match = String(workbookXml || "").match(PROTECTION_OPEN_RE);
  if (!match) return false;
  const attrs = match[2] || "";
  return /\blockStructure\s*=\s*(["']?)(1|true)\1/i.test(attrs);
}

/**
 * Ensure `<workbookProtection lockStructure="1"/>` exists at a schema-valid
 * position. Updates an existing element in place (LibreOffice already writes
 * one); inserts only when the element is missing.
 *
 * @param {string} workbookXml
 * @returns {string}
 */
export function applyWorkbookProtectionLockStructure(workbookXml) {
  const xml = String(workbookXml || "");
  if (!xml) return xml;
  const match = xml.match(PROTECTION_OPEN_RE);
  if (match) {
    const full = match[0];
    const name = match[1];
    let attrs = match[2] || "";
    const selfClose = match[3] === "/";
    if (LOCK_STRUCTURE_RE.test(attrs)) {
      attrs = attrs.replace(LOCK_STRUCTURE_RE, 'lockStructure="1"');
    } else {
      attrs = `${attrs.trimEnd()} lockStructure="1"`;
    }
    if (attrs.length && !attrs.startsWith(" ")) attrs = ` ${attrs}`;
    const nextTag = selfClose ? `<${name}${attrs}/>` : `<${name}${attrs}>`;
    return xml.slice(0, match.index) + nextTag + xml.slice(match.index + full.length);
  }
  const insertion = '<workbookProtection lockStructure="1"/>';
  const sibling = xml.match(BEFORE_SIBLING_RE);
  if (sibling) {
    return xml.slice(0, sibling.index) + insertion + xml.slice(sibling.index);
  }
  return xml.replace(WORKBOOK_CLOSE_RE, `${insertion}</workbook>`);
}

/**
 * Resolve whether the grid/FODS asked for a structure lock.
 * Explicit boolean wins; then adapter/grid; then source FODS.
 */
export function resolveWorkbookProtectionEnabled(options = {}) {
  if (typeof options.workbookProtectionEnabled === "boolean") {
    return options.workbookProtectionEnabled;
  }
  if (typeof options.adapter?.wantsNativeXlsxWorkbookProtection === "function") {
    return !!options.adapter.wantsNativeXlsxWorkbookProtection();
  }
  if (options.grid && options.grid.workbookProtection) {
    return !!options.grid.workbookProtection.enabled;
  }
  if (options.sourceFods) return fodsHasStructureProtection(options.sourceFods);
  return false;
}

/**
 * Phase 2a import overlay: LibreOffice XLSX→FODS drops lockStructure, so
 * inject table:structure-protected="true" onto <office:spreadsheet> when the
 * original XLSX has workbookProtection lockStructure=1|true.
 *
 * Call this AFTER soffice convert and BEFORE SheetAdapter.parseFods().
 *
 * @param {string} fodsXml
 * @param {string} [workbookXml] xl/workbook.xml from the original XLSX
 * @returns {string}
 */
export function overlayFodsStructureProtection(fodsXml, workbookXml) {
  const xml = String(fodsXml || "");
  if (!workbookHasStructureLock(workbookXml)) return xml;
  return applyFodsStructureProtection(xml);
}

/**
 * Ensure office:spreadsheet carries table:structure-protected="true".
 * Updates an existing attribute in place; inserts only when missing.
 *
 * @param {string} fodsXml
 * @returns {string}
 */
export function applyFodsStructureProtection(fodsXml) {
  const xml = String(fodsXml || "");
  if (!xml) return xml;
  const match = xml.match(SPREADSHEET_OPEN_RE);
  if (!match) return xml;
  const full = match[0];
  let attrs = match[1] || "";
  const selfClose = match[2] === "/";
  if (STRUCTURE_ATTR_RE.test(attrs)) {
    attrs = attrs.replace(STRUCTURE_ATTR_RE, 'table:structure-protected="true"');
  } else {
    attrs = `${attrs.trimEnd()} table:structure-protected="true"`;
  }
  if (attrs.length && !attrs.startsWith(" ")) attrs = ` ${attrs}`;
  const nextTag = selfClose ? `<office:spreadsheet${attrs}/>` : `<office:spreadsheet${attrs}>`;
  return xml.slice(0, match.index) + nextTag + xml.slice(match.index + full.length);
}
