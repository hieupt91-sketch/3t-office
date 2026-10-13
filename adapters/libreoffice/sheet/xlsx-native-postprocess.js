/**
 * Node-only: patch a real XLSX (ZIP) after soffice FODS→XLSX convert.
 *
 * Do not import from SheetAdapter (browser / pywebview). Tests call this
 * after `convertWithSoffice`. Production File → Lưu uses the Python twin
 * hooked in main.py (`ooxml_zip_patch.py`).
 */
import { patchOoxmlZip, readZipEntry } from "../common/ooxml-zip-patch.js";
import {
  applyWorkbookProtectionLockStructure,
  overlayFodsStructureProtection,
  resolveWorkbookProtectionEnabled
} from "./xlsx-workbook-protection.js";
import {
  applyFreezePaneToSheetXml,
  applyFreezePanesToFods,
  applySplitPaneToSheetXml,
  applySplitPanesToFods,
  parseFreezePaneFromSheetXml,
  parseFreezePanesFromFods,
  parseSplitPaneFromSheetXml,
  parseSplitPanesFromFods,
  resolveRidTargetMap,
  resolveSheetRidMap
} from "./xlsx-freeze-panes.js";

export const XLSX_WORKBOOK_ENTRY = "xl/workbook.xml";
export const XLSX_WORKBOOK_RELS_ENTRY = "xl/_rels/workbook.xml.rels";
const SHEET_VNO_NS = "https://vnoffice.vn/ns/spreadsheet/1.0";

// --- Sheet visibility (veryHidden) helpers ---

const WB_SHEET_TAG_RE = /<sheet\b([^>]*)\/?>/gi;
const SHEET_STATE_RE = /state="(visible|hidden|veryHidden)"/i;
const VNO_SHEET_STATE_RE = /vno:sheet-state="(visible|hidden|veryHidden)"/i;
const TABLE_TAG_RE = /<table:table\b([^>]*)>/gi;

function unescapeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function parsePrintTitlesFromWorkbook(workbookXml) {
  const sheetNames = parseSheetNamesFromWorkbook(workbookXml || "");
  const result = {};
  String(workbookXml || "").replace(/<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/gi, (_, rawAttrs, rawExpression) => {
    const name = rawAttrs.match(/\bname="([^"]*)"/i)?.[1] || "";
    const localSheetId = Number(rawAttrs.match(/\blocalSheetId="(\d+)"/i)?.[1]);
    if (name.toLowerCase() !== "_xlnm.print_titles" || !Number.isInteger(localSheetId) || !sheetNames[localSheetId]) return "";
    const titles = { rows: "", cols: "" };
    const expression = unescapeXml(rawExpression);
    const rangeRe = /(?:'((?:[^']|'')*)'|([^!,]+))!\$([A-Z]+|\d+):\$([A-Z]+|\d+)/gi;
    let range;
    while ((range = rangeRe.exec(expression)) !== null) {
      const start = range[3].toUpperCase();
      const end = range[4].toUpperCase();
      if (/^\d+$/.test(start) && /^\d+$/.test(end)) titles.rows = start === end ? start : `${start}:${end}`;
      else if (/^[A-Z]+$/.test(start) && /^[A-Z]+$/.test(end)) titles.cols = start === end ? start : `${start}:${end}`;
    }
    if (titles.rows || titles.cols) result[sheetNames[localSheetId]] = titles;
    return "";
  });
  return result;
}

export function applyPrintTitlesToFods(fodsXml, titlesBySheet) {
  if (!Object.keys(titlesBySheet || {}).length) return String(fodsXml || "");
  let xml = String(fodsXml || "").replace(TABLE_TAG_RE, (full, attrs) => {
    const name = unescapeXml(attrs.match(/table:name="([^"]*)"/i)?.[1] || "");
    const titles = titlesBySheet[name];
    if (!titles) return full;
    const nextAttrs = attrs
      .replace(/\s+vno:print-title-rows="[^"]*"/i, "")
      .replace(/\s+vno:print-title-cols="[^"]*"/i, "");
    return `<table:table${nextAttrs} vno:print-title-rows="${titles.rows || ""}" vno:print-title-cols="${titles.cols || ""}">`;
  });
  if (!/xmlns:vno\s*=/.test(xml)) {
    xml = xml.replace(/<office:document\b([^>]*)>/i, `<office:document$1 xmlns:vno="${SHEET_VNO_NS}">`);
  }
  return xml;
}

/** Read sheet state from xl/workbook.xml <sheet state="..."> elements. */
function parseSheetVisibilityFromWorkbook(workbookXml) {
  const result = {};
  if (!workbookXml) return result;
  let match;
  WB_SHEET_TAG_RE.lastIndex = 0;
  while ((match = WB_SHEET_TAG_RE.exec(workbookXml)) !== null) {
    const attrs = match[1] || "";
    const nameMatch = attrs.match(/name="([^"]*)"/);
    const stateMatch = attrs.match(SHEET_STATE_RE);
    if (nameMatch && stateMatch) {
      const state = stateMatch[1].toLowerCase();
      if (state === "hidden" || state === "veryhidden") {
        result[unescapeXml(nameMatch[1])] = state === "veryhidden" ? "veryHidden" : "hidden";
      }
    }
  }
  return result;
}

/** Write state="hidden|veryHidden" back into xl/workbook.xml <sheet> elements. */
function applySheetVisibilityToWorkbook(workbookXml, visibilityBySheet) {
  let xml = workbookXml || "";
  if (!Object.keys(visibilityBySheet).length) return xml;
  return xml.replace(WB_SHEET_TAG_RE, (full, attrs) => {
    const nameMatch = attrs.match(/name="([^"]*)"/);
    if (!nameMatch) return full;
    const name = unescapeXml(nameMatch[1]);
    const state = visibilityBySheet[name];
    if (!state) return full;
    // <sheet> is always self-closing in xl/workbook.xml. WB_SHEET_TAG_RE's
    // greedy [^>]* can swallow a trailing "/" into `attrs` before the
    // optional /? — strip it so we don't corrupt the tag (e.g.
    // `.../ state="x">` instead of a valid self-closing element).
    const nextAttrs = attrs.replace(/\/\s*$/, "").replace(SHEET_STATE_RE, "") + ` state="${state}"`;
    return `<sheet${nextAttrs}/>`;
  });
}

/** Read vno:sheet-state from FODS <table:table> tags. */
function parseSheetVisibilityFromFods(fodsXml) {
  const result = {};
  if (!fodsXml) return result;
  let match;
  TABLE_TAG_RE.lastIndex = 0;
  while ((match = TABLE_TAG_RE.exec(fodsXml)) !== null) {
    const attrs = match[1] || "";
    const nameMatch = attrs.match(/table:name="([^"]*)"/i);
    if (!nameMatch) continue;
    const stateMatch = attrs.match(VNO_SHEET_STATE_RE);
    if (stateMatch) result[unescapeXml(nameMatch[1])] = stateMatch[1].toLowerCase();
  }
  return result;
}

/** Inject vno:sheet-state onto <table:table> tags in FODS. */
function applySheetVisibilityToFods(fodsXml, visibilityBySheet) {
  let xml = fodsXml || "";
  if (!Object.keys(visibilityBySheet).length) return xml;
  return xml.replace(TABLE_TAG_RE, (full, attrs) => {
    const nameMatch = attrs.match(/table:name="([^"]*)"/i);
    if (!nameMatch) return full;
    const name = unescapeXml(nameMatch[1]);
    const state = visibilityBySheet[name];
    if (!state) return full;
    const nextAttrs = attrs.replace(VNO_SHEET_STATE_RE, "") + ` vno:sheet-state="${state}"`;
    return `<table:table${nextAttrs}>`;
  });
}

// --- Active sheet (activeTab) helpers ---

import {
  parseActiveTabFromWorkbook,
  parseSheetNamesFromWorkbook,
  parseActiveSheetFromWorkbook,
  ensureConfigXmlns,
  applyActiveSheetToFods,
  overlayActiveSheetToFods
} from "./xlsx-active-sheet.js";

export {
  parseActiveTabFromWorkbook,
  parseSheetNamesFromWorkbook,
  parseActiveSheetFromWorkbook,
  ensureConfigXmlns,
  applyActiveSheetToFods,
  overlayActiveSheetToFods
};

// --- AutoFilter helpers ---

const AUTOFILTER_REF_RE = /<autoFilter\b[^>]*ref="([^"]*)"[^>]*\/?\s*>/i;
const DB_RANGE_RE = /<table:database-range\b([^>]*)\/?\s*>/gi;

/** Read <autoFilter ref="..."/> from a single worksheetN.xml. */
function parseAutofilterFromWorksheet(sheetXml) {
  if (!sheetXml) return null;
  const m = sheetXml.match(AUTOFILTER_REF_RE);
  return m ? m[1] : null;
}

/** Read <table:database-range> from FODS. Returns {sheetName: ref}. */
function parseAutofilterFromFods(fodsXml) {
  const result = {};
  if (!fodsXml) return result;
  let match;
  DB_RANGE_RE.lastIndex = 0;
  while ((match = DB_RANGE_RE.exec(fodsXml)) !== null) {
    const attrs = match[1] || "";
    const targetMatch = attrs.match(/table:target-range-address="([^"]*)"/i);
    if (!targetMatch) continue;
    const target = unescapeXml(targetMatch[1]);
    const dotIdx = target.indexOf(".");
    if (dotIdx === -1) continue;
    const sheetName = target.substring(0, dotIdx);
    const ref = target.substring(dotIdx + 1);
    if (sheetName && ref) result[sheetName] = ref;
  }
  return result;
}

/** Inject <autoFilter ref="..."/> into a worksheet XML if not already present. */
function applyAutofilterToWorksheet(sheetXml, ref) {
  let xml = sheetXml || "";
  if (!ref) return xml;
  if (AUTOFILTER_REF_RE.test(xml)) return xml;
  const marker = "</worksheet>";
  const idx = xml.lastIndexOf(marker);
  if (idx === -1) return xml + `<autoFilter ref="${ref}"/>`;
  return xml.substring(0, idx) + `<autoFilter ref="${ref}"/>` + xml.substring(idx);
}

// --- Scenarios (Scenario Manager) helpers ---

const VNO_SCENARIOS_ATTR_RE = /vno:scenarios="([^"]*)"/i;

function parseScenariosFromFods(fodsXml) {
  const result = {};
  if (!fodsXml) return result;
  let match;
  TABLE_TAG_RE.lastIndex = 0;
  while ((match = TABLE_TAG_RE.exec(fodsXml)) !== null) {
    const attrs = match[1] || "";
    const nameMatch = attrs.match(/table:name="([^"]*)"/i);
    if (!nameMatch) continue;
    const scenMatch = attrs.match(VNO_SCENARIOS_ATTR_RE);
    if (scenMatch) {
      try {
        const decoded = unescapeXml(scenMatch[1]);
        const list = JSON.parse(decoded);
        if (Array.isArray(list) && list.length) {
          result[unescapeXml(nameMatch[1])] = list;
        }
      } catch (_) {}
    }
  }
  return result;
}

function escapeXmlAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildScenariosXml(scenarios) {
  if (!Array.isArray(scenarios) || !scenarios.length) return "";
  const scenarioTags = scenarios.map(s => {
    const inputCells = (s.changingCells || []).map((coord, idx) => {
      const val = s.values?.[idx] ?? "";
      return `<inputCells r="${escapeXmlAttr(coord)}" val="${escapeXmlAttr(val)}"/>`;
    }).join("");
    const commentAttr = s.comment ? ` comment="${escapeXmlAttr(s.comment)}"` : "";
    return `<scenario name="${escapeXmlAttr(s.name)}"${commentAttr} count="${s.changingCells?.length || 0}">${inputCells}</scenario>`;
  }).join("");
  return `<scenarios current="0" show="0">${scenarioTags}</scenarios>`;
}

function applyScenariosToWorksheet(sheetXml, scenarios) {
  let xml = sheetXml || "";
  const scenariosXml = buildScenariosXml(scenarios);
  if (!scenariosXml) return xml;
  xml = xml.replace(/<scenarios\b[\s\S]*?<\/scenarios>/i, "");
  const siblingPattern = /<(?:autoFilter|sortState|dataConsolidate|customSheetViews|mergeCells|phoneticPr|conditionalFormatting|dataValidations|hyperlinks|printOptions|pageMargins|pageSetup)\b|<\/worksheet>/i;
  const match = siblingPattern.exec(xml);
  if (match) {
    const idx = match.index;
    return xml.substring(0, idx) + scenariosXml + xml.substring(idx);
  }
  const endIdx = xml.lastIndexOf("</worksheet>");
  if (endIdx !== -1) {
    return xml.substring(0, endIdx) + scenariosXml + xml.substring(endIdx);
  }
  return xml + scenariosXml;
}

function parseScenariosFromWorksheet(sheetXml) {
  if (!sheetXml) return [];
  const m = sheetXml.match(/<scenarios\b[^>]*>([\s\S]*?)<\/scenarios>/i);
  if (!m) return [];
  const body = m[1];
  const scenarios = [];
  const scenarioRegex = /<scenario\b([^>]*)>([\s\S]*?)<\/scenario>/gi;
  let scenMatch;
  while ((scenMatch = scenarioRegex.exec(body)) !== null) {
    const attrs = scenMatch[1] || "";
    const nameMatch = attrs.match(/name="([^"]*)"/i);
    const commentMatch = attrs.match(/comment="([^"]*)"/i);
    const name = nameMatch ? unescapeXml(nameMatch[1]) : "";
    const comment = commentMatch ? unescapeXml(commentMatch[1]) : "";
    const inner = scenMatch[2] || "";
    const changingCells = [];
    const values = [];
    const cellRegex = /<inputCells\b[^>]*r="([^"]*)"[^>]*val="([^"]*)"[^>]*\/?>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(inner)) !== null) {
      changingCells.push(unescapeXml(cellMatch[1]));
      const v = unescapeXml(cellMatch[2]);
      const num = Number(v);
      values.push(v !== "" && Number.isFinite(num) ? num : v);
    }
    if (name && changingCells.length) {
      scenarios.push({
        id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        changingCells,
        values,
        comment
      });
    }
  }
  return scenarios;
}

function overlayScenariosFromXlsx(source, fodsXml) {
  const sheetEntries = resolveXlsxSheetEntries(source);
  if (Object.keys(sheetEntries).length === 0) return fodsXml;
  const scenariosBySheet = {};
  for (const [sheetName, entryPath] of Object.entries(sheetEntries)) {
    const sheetXml = readZipEntry(source, entryPath)?.toString("utf8");
    if (!sheetXml) continue;
    const scenarios = parseScenariosFromWorksheet(sheetXml);
    if (scenarios.length) scenariosBySheet[sheetName] = scenarios;
  }
  if (!Object.keys(scenariosBySheet).length) return fodsXml;

  return fodsXml.replace(TABLE_TAG_RE, (full, attrs) => {
    const nameMatch = attrs.match(/table:name="([^"]*)"/i);
    if (!nameMatch) return full;
    const name = unescapeXml(nameMatch[1]);
    const scenarios = scenariosBySheet[name];
    if (!scenarios || !scenarios.length) return full;
    const jsonStr = escapeXmlAttr(JSON.stringify(scenarios));
    const nextAttrs = attrs.replace(VNO_SCENARIOS_ATTR_RE, "") + ` vno:scenarios="${jsonStr}"`;
    return `<table:table${nextAttrs}>`;
  });
}

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
  // vno:frozen-rows/cols mà 3T Office tự lưu trong FODS nguồn.
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

  const splitBySheet = parseSplitPanesFromFods(options.sourceFods);
  if (Object.keys(splitBySheet).length > 0) {
    const sheetEntries = resolveXlsxSheetEntries(source);
    for (const [sheetName, split] of Object.entries(splitBySheet)) {
      const entryPath = sheetEntries[sheetName];
      if (!entryPath) continue;
      const sheetXml = (replacements[entryPath] || readZipEntry(source, entryPath)?.toString("utf8"));
      if (!sheetXml) continue;
      const nextSheetXml = applySplitPaneToSheetXml(sheetXml, split);
      if (nextSheetXml !== sheetXml) replacements[entryPath] = nextSheetXml;
    }
  }

  // Sheet visibility (veryHidden): soffice downgrades veryHidden → hidden
  // during FODS→XLSX. Read vno:sheet-state from FODS and write state back.
  const visibilityBySheet = parseSheetVisibilityFromFods(options.sourceFods);
  if (Object.keys(visibilityBySheet).length > 0) {
    const current = readZipEntry(source, XLSX_WORKBOOK_ENTRY);
    if (current) {
      const wbXml = current.toString("utf8");
      const nextWbXml = applySheetVisibilityToWorkbook(wbXml, visibilityBySheet);
      if (nextWbXml !== wbXml) replacements[XLSX_WORKBOOK_ENTRY] = nextWbXml;
    }
  }

  // AutoFilter: soffice may drop <autoFilter> during FODS→XLSX. Read
  // database-ranges from FODS and write <autoFilter ref> into worksheets.
  const autofilterBySheet = parseAutofilterFromFods(options.sourceFods);
  if (Object.keys(autofilterBySheet).length > 0) {
    const sheetEntries = resolveXlsxSheetEntries(source);
    for (const [sheetName, ref] of Object.entries(autofilterBySheet)) {
      const entryPath = sheetEntries[sheetName];
      if (!entryPath) continue;
      const sheetXml = (replacements[entryPath] || readZipEntry(source, entryPath)?.toString("utf8"));
      if (!sheetXml) continue;
      const nextSheetXml = applyAutofilterToWorksheet(sheetXml, ref);
      if (nextSheetXml !== sheetXml) replacements[entryPath] = nextSheetXml;
    }
  }

  // Scenarios: soffice drops <scenarios> during FODS→XLSX. Read
  // vno:scenarios from FODS and write <scenarios> into worksheets.
  const scenariosBySheet = parseScenariosFromFods(options.sourceFods);
  if (Object.keys(scenariosBySheet).length > 0) {
    const sheetEntries = resolveXlsxSheetEntries(source);
    for (const [sheetName, scenarios] of Object.entries(scenariosBySheet)) {
      const entryPath = sheetEntries[sheetName];
      if (!entryPath) continue;
      const sheetXml = (replacements[entryPath] || readZipEntry(source, entryPath)?.toString("utf8"));
      if (!sheetXml) continue;
      const nextSheetXml = applyScenariosToWorksheet(sheetXml, scenarios);
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
  if (current) {
    const workbookXml = current.toString("utf8");
    xml = overlayFodsStructureProtection(xml, workbookXml);
    // Sheet visibility: inject vno:sheet-state for veryHidden/hidden sheets
    const visibility = parseSheetVisibilityFromWorkbook(workbookXml);
    if (Object.keys(visibility).length > 0) {
      xml = applySheetVisibilityToFods(xml, visibility);
    }
    // Active sheet (activeTab -> ActiveTable): soffice headless drops ActiveTable
    xml = overlayActiveSheetToFods(xml, workbookXml);
    // LibreOffice drops _xlnm.Print_Titles while converting XLSX to FODS.
    xml = applyPrintTitlesToFods(xml, parsePrintTitlesFromWorkbook(workbookXml));
  }
  xml = overlaySheetXlsxFreezePanes(source, xml);
  xml = overlaySheetXlsxSplitPanes(source, xml);
  // AutoFilter: read <autoFilter ref> from worksheet XMLs and inject
  // <table:database-ranges> into FODS.
  xml = overlayAutofilterFromXlsx(source, xml);
  // Scenarios: read <scenarios> from worksheet XMLs and inject vno:scenarios into FODS.
  xml = overlayScenariosFromXlsx(source, xml);
  return xml;
}

/** Read <autoFilter ref> from each worksheet and inject database-ranges into FODS. */
function overlayAutofilterFromXlsx(source, fodsXml) {
  const sheetEntries = resolveXlsxSheetEntries(source);
  if (Object.keys(sheetEntries).length === 0) return fodsXml;
  const autofilterBySheet = {};
  for (const [sheetName, entryPath] of Object.entries(sheetEntries)) {
    const sheetXml = readZipEntry(source, entryPath)?.toString("utf8");
    if (!sheetXml) continue;
    const ref = parseAutofilterFromWorksheet(sheetXml);
    if (ref) autofilterBySheet[sheetName] = ref;
  }
  if (!Object.keys(autofilterBySheet).length) return fodsXml;
  const ranges = [];
  // LibreOffice's anonymous sheet-filter name; a custom name would export as an
  // Excel Table part (see _serializeDatabaseRanges in sheet-adapter.js).
  for (const [index, [sheetName, ref]] of Object.entries(autofilterBySheet).entries()) {
    ranges.push(
      `<table:database-range table:name="__Anonymous_Sheet_DB__${index}"`
      + ` table:target-range-address="${sheetName}.${ref}"`
      + ` table:display-filter-buttons="true"/>`
    );
  }
  const dbBlock = `<table:database-ranges>${ranges.join("")}</table:database-ranges>`;
  const marker = "</office:spreadsheet>";
  const idx = fodsXml.lastIndexOf(marker);
  if (idx === -1) return fodsXml + dbBlock;
  return fodsXml.substring(0, idx) + dbBlock + fodsXml.substring(idx);
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

/** Preserve real state="split" panes separately from Freeze Panes on open. */
export function overlaySheetXlsxSplitPanes(xlsxPathOrBuffer, fodsXml) {
  const source = asBuffer(xlsxPathOrBuffer);
  const xml = String(fodsXml || "");
  const sheetEntries = resolveXlsxSheetEntries(source);
  if (Object.keys(sheetEntries).length === 0) return xml;
  const splitBySheet = {};
  for (const [sheetName, entryPath] of Object.entries(sheetEntries)) {
    const sheetXml = readZipEntry(source, entryPath)?.toString("utf8");
    if (!sheetXml) continue;
    const split = parseSplitPaneFromSheetXml(sheetXml);
    if (split) splitBySheet[sheetName] = split;
  }
  return applySplitPanesToFods(xml, splitBySheet);
}
