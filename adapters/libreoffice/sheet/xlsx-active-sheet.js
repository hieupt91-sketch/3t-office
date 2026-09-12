/**
 * Pure XML helpers for native XLSX active sheet (<workbookView activeTab="..."> ↔ FODS ActiveTable).
 *
 * LibreOffice headless XLSX→FODS drops config:name="ActiveTable" in
 * office:settings. parseFods() in SheetAdapter reads ActiveTable to set
 * activeSheet; when missing, it falls back to the first sheet.
 *
 * Browser-safe: no Node APIs. SheetAdapter may import this file.
 */

const CONFIG_NS = "urn:oasis:names:tc:opendocument:xmlns:config:1.0";
const CONFIG_ITEM_ACTIVE_TABLE_RE = /<config:config-item\b[^>]*config:name\s*=\s*(["'])ActiveTable\1/i;
const VIEW_SETTINGS_SET_RE = /(<config:config-item-set\b[^>]*config:name\s*=\s*(["'])ooo:view-settings\2[^>]*>)([\s\S]*?)(<\/config:config-item-set>)/i;
const VIEW_MAP_ENTRY_RE = /(<config:config-item-map-entry\b[^>]*>)([\s\S]*?)(<\/config:config-item-map-entry>)/i;
const OFFICE_SETTINGS_RE = /(<office:settings\b[^>]*>)([\s\S]*?)(<\/office:settings>)/i;
const OFFICE_BODY_RE = /<office:body\b/i;
const OFFICE_DOCUMENT_CLOSE_RE = /<\/office:document\s*>/i;
const OFFICE_DOCUMENT_OPEN_RE = /<office:document\b([^>]*)>/i;

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function parseActiveTabFromWorkbook(workbookXml) {
  if (!workbookXml) return 0;
  const match = String(workbookXml).match(/<(?:\w+:)?workbookView\b([^>]*)\/?>/i);
  if (match) {
    const tabMatch = match[1].match(/\b(?:activeTab|activeSheet)\s*=\s*(["'])(\d+)\1/i);
    if (tabMatch) {
      const idx = parseInt(tabMatch[2], 10);
      return Number.isNaN(idx) ? 0 : idx;
    }
  }
  return 0;
}

export function parseSheetNamesFromWorkbook(workbookXml) {
  if (!workbookXml) return [];
  const names = [];
  const xml = String(workbookXml);
  const re = /<sheet\b([^>]*)\/?>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const attrs = match[1] || "";
    const nameMatch = attrs.match(/\bname\s*=\s*(["'])(.*?)\1/i);
    if (nameMatch) {
      names.push(unescapeXml(nameMatch[2]));
    }
  }
  return names;
}

export function parseActiveSheetFromWorkbook(workbookXml) {
  if (!workbookXml) return null;
  const wvMatch = String(workbookXml).match(/<(?:\w+:)?workbookView\b([^>]*)\/?>/i);
  if (!wvMatch) return null;
  const sheetNames = parseSheetNamesFromWorkbook(workbookXml);
  if (!sheetNames.length) return null;
  const tabIndex = parseActiveTabFromWorkbook(workbookXml);
  if (tabIndex >= 0 && tabIndex < sheetNames.length) {
    return sheetNames[tabIndex];
  }
  return sheetNames[0];
}

export function ensureConfigXmlns(fodsXml) {
  const xml = String(fodsXml || "");
  if (/xmlns:config\s*=/i.test(xml)) return xml;
  const match = xml.match(OFFICE_DOCUMENT_OPEN_RE);
  if (!match) return xml;
  const attrs = match[1] || "";
  const nextTag = `<office:document${attrs} xmlns:config="${CONFIG_NS}">`;
  return xml.slice(0, match.index) + nextTag + xml.slice(match.index + match[0].length);
}

export function applyActiveSheetToFods(fodsXml, activeSheet) {
  let xml = String(fodsXml || "");
  if (!activeSheet || !xml) return xml;
  if (CONFIG_ITEM_ACTIVE_TABLE_RE.test(xml)) return xml;

  const escaped = escapeXml(activeSheet);
  const activeItem = `<config:config-item config:name="ActiveTable" config:type="string">${escaped}</config:config-item>`;
  xml = ensureConfigXmlns(xml);

  const viewMatch = xml.match(VIEW_SETTINGS_SET_RE);
  if (viewMatch) {
    const openTag = viewMatch[1];
    const inner = viewMatch[3];
    const closeTag = viewMatch[4];
    const entryMatch = inner.match(VIEW_MAP_ENTRY_RE);
    if (entryMatch) {
      const entryIdx = inner.indexOf(entryMatch[0]);
      const closeEntryIdx = inner.indexOf("</config:config-item-map-entry>", entryIdx);
      const newInner = inner.slice(0, closeEntryIdx) + activeItem + inner.slice(closeEntryIdx);
      return xml.slice(0, viewMatch.index) + openTag + newInner + closeTag + xml.slice(viewMatch.index + viewMatch[0].length);
    }
    const viewsBlock = `<config:config-item-map-indexed config:name="Views"><config:config-item-map-entry>${activeItem}</config:config-item-map-entry></config:config-item-map-indexed>`;
    return xml.slice(0, viewMatch.index) + openTag + inner + viewsBlock + closeTag + xml.slice(viewMatch.index + viewMatch[0].length);
  }

  const settingsMatch = xml.match(OFFICE_SETTINGS_RE);
  if (settingsMatch) {
    const openTag = settingsMatch[1];
    const inner = settingsMatch[2];
    const closeTag = settingsMatch[3];
    const setBlock = `<config:config-item-set config:name="ooo:view-settings"><config:config-item-map-indexed config:name="Views"><config:config-item-map-entry>${activeItem}</config:config-item-map-entry></config:config-item-map-indexed></config:config-item-set>`;
    return xml.slice(0, settingsMatch.index) + openTag + inner + setBlock + closeTag + xml.slice(settingsMatch.index + settingsMatch[0].length);
  }

  const fullBlock = `<office:settings><config:config-item-set config:name="ooo:view-settings"><config:config-item-map-indexed config:name="Views"><config:config-item-map-entry>${activeItem}</config:config-item-map-entry></config:config-item-map-indexed></config:config-item-set></office:settings>`;
  const bodyMatch = xml.match(OFFICE_BODY_RE);
  if (bodyMatch) {
    return xml.slice(0, bodyMatch.index) + fullBlock + xml.slice(bodyMatch.index);
  }
  const docClose = xml.match(OFFICE_DOCUMENT_CLOSE_RE);
  if (docClose) {
    return xml.slice(0, docClose.index) + fullBlock + xml.slice(docClose.index);
  }
  return xml + fullBlock;
}

export function overlayActiveSheetToFods(fodsXml, workbookXml) {
  const xml = String(fodsXml || "");
  if (!workbookXml) return xml;
  const activeSheet = parseActiveSheetFromWorkbook(workbookXml);
  if (!activeSheet) return xml;
  return applyActiveSheetToFods(xml, activeSheet);
}
