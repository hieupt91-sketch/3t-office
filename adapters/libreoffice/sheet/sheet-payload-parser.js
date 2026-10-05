// 3T Sheet's owned parser for the compact v2 open payload. Workbook state is
// returned as an intermediate model; SheetAdapter commits only after parsing
// and validating the complete payload.

const LOCAL_TABLE_RE = /<table:table(?=[\s/>])([^>]*)>([\s\S]*?)<\/table:table>/gi;
const NS_TABLE = "table";

function parseAttrsLegacy(adapter, raw) {
  const attrs = {};
  String(raw || "").replace(/([\w:-]+)=(["'])([\s\S]*?)\2/g, (_, key, quote, value) => {
    attrs[key] = adapter._unescapeXml(value);
    return "";
  });
  return attrs;
}

function unescapeXmlP2(value) {
  if (!value || !value.includes("&")) return value || "";
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|apos|quot|gt|lt|amp);/g, (entity, token) => {
    const lower = token.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return { apos: "'", quot: '"', gt: ">", lt: "<", amp: "&" }[lower] ?? entity;
  });
}

const P2_ATTR_RE = /([\w:-]+)=(["'])([\s\S]*?)\2/g;

function parseAttrsP2(raw) {
  const attrs = {};
  const source = String(raw || "");
  const isNameChar = code => code === 95 || code === 58 || code === 45
    || code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122;
  let i = 0;
  while (i < source.length) {
    while (i < source.length && !isNameChar(source.charCodeAt(i))) i++;
    const start = i;
    while (i < source.length && isNameChar(source.charCodeAt(i))) i++;
    if (start === i) break;
    const nameEnd = i;
    if (source.charCodeAt(i) !== 61) continue;
    i++;
    const quote = source.charCodeAt(i);
    if (quote !== 34 && quote !== 39) continue;
    const valueStart = ++i;
    while (i < source.length && source.charCodeAt(i) !== quote) i++;
    if (i === source.length) break;
    attrs[source.slice(start, nameEnd)] = unescapeXmlP2(source.slice(valueStart, i));
    i++;
  }
  return attrs;
}

function parseAttrs(adapter, raw, p2Fast = false) {
  return p2Fast ? parseAttrsP2(raw) : parseAttrsLegacy(adapter, raw);
}

const PAYLOAD_ROWS_PER_UI_SLICE = 128;

// setTimeout(0) is clamped to >= 4 ms once nested, and the model build yields ~1100 times on a big workbook
// (every 128 rows, two passes): lan14 spent ~7 s just waiting. A MessageChannel message is a macrotask without
// that clamp; the renderer still gets its frame/input turn between tasks. A real timer is used every
// PAYLOAD_TIMER_YIELD_MS so timers and other low-priority work are never starved.
// globalThis.__VNO_OPEN_LEGACY (the existing P2 rollback) keeps the old setTimeout yield.
const PAYLOAD_TIMER_YIELD_MS = 50;
const payloadYieldResolvers = [];
let payloadYieldPort = null;
let payloadLastTimerYield = 0;

function yieldToRenderer() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (
    typeof MessageChannel !== "function" || globalThis.__VNO_OPEN_LEGACY === true
    || now - payloadLastTimerYield >= PAYLOAD_TIMER_YIELD_MS
  ) {
    payloadLastTimerYield = now;
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  if (!payloadYieldPort) {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => { payloadYieldResolvers.shift()?.(); };
    payloadYieldPort = channel.port2;
  }
  return new Promise(resolve => {
    payloadYieldResolvers.push(resolve);
    payloadYieldPort.postMessage(0);
  });
}

async function eachCachedRecord(records, onRecord, options = {}) {
  const shouldYield = typeof process === "undefined" || !process.versions?.node;
  let processedRows = 0;
  const totalRows = Math.max(1, Number(options.totalRows) || 1);
  const progressStart = Number(options.progressStart) || 0;
  const progressSpan = Math.max(0, (Number(options.progressEnd) || 0) - progressStart);
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    records[index] = null;
    onRecord(record);
    if (record[0] !== "row") continue;
    processedRows++;
    if (!shouldYield || processedRows % PAYLOAD_ROWS_PER_UI_SLICE !== 0) continue;
    options.onProgress?.(progressStart + progressSpan * Math.min(1, processedRows / totalRows));
    await yieldToRenderer();
  }
  options.onProgress?.(progressStart + progressSpan);
}

async function eachCompressedRecord(payload, onRecord, options = {}) {
  if (typeof process !== "undefined" && process.versions?.node) {
    const { createInflate } = await import("node:zlib");
    const inflate = createInflate();
    const decoder = new TextDecoder();
    let carry = "";
    const finished = new Promise((resolve, reject) => {
      inflate.on("data", chunk => {
        try {
          const lines = (carry + decoder.decode(chunk, { stream: true })).split("\n");
          carry = lines.pop() || "";
          for (const line of lines) if (line) onRecord(JSON.parse(line));
        } catch (error) {
          reject(error);
        }
      });
      inflate.on("end", () => {
        try {
          carry += decoder.decode();
          if (carry) onRecord(JSON.parse(carry));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      inflate.on("error", reject);
    });
    inflate.end(Buffer.from(payload.rowsDeflateBase64, "base64"));
    await finished;
    return;
  }

  if (typeof DecompressionStream === "undefined") {
    throw new Error("WebView2 does not expose DecompressionStream('deflate')");
  }
  const binary = atob(payload.rowsDeflateBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let processedRows = 0;
  const totalRows = Math.max(1, Number(payload.rows) || 1);
  const progressStart = Number(options.progressStart) || 0;
  const progressSpan = Math.max(0, (Number(options.progressEnd) || 0) - progressStart);
  const processLine = async line => {
    if (!line) return;
    const record = JSON.parse(line);
    onRecord(record);
    if (record[0] !== "row-xml") return;
    processedRows++;
    if (processedRows % PAYLOAD_ROWS_PER_UI_SLICE !== 0) return;
    options.onProgress?.(progressStart + progressSpan * Math.min(1, processedRows / totalRows));
    // Keep WebView2 painting/responding while a large workbook model is built.
    await yieldToRenderer();
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const lines = (carry + decoder.decode(value, { stream: true })).split("\n");
    carry = lines.pop() || "";
    for (const line of lines) await processLine(line);
  }
  carry += decoder.decode();
  await processLine(carry);
  options.onProgress?.(progressStart + progressSpan);
}

function tableBlocks(adapter, xml) {
  const blocks = [];
  String(xml || "").replace(LOCAL_TABLE_RE, (all, attrs, body) => {
    if (parseAttrs(adapter, attrs)[`${NS_TABLE}:name`] !== "local-table") blocks.push({ all, attrs, body });
    return all;
  });
  return blocks;
}

function cellText(adapter, content) {
  const valueContent = adapter._stripCellFrames(String(content || ""));
  const paragraphs = [];
  valueContent.replace(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi, (_, value) => {
    paragraphs.push(adapter._odfInlineTextFromXml(value));
    return "";
  });
  return adapter._decodeImportedCellText(paragraphs.join("\n"));
}

function directXmlChildren(xml) {
  const source = String(xml || "");
  const token = /<(\/?)([A-Za-z_][\w.:-]*)\b([^<>]*?)(\/?)>/g;
  const stack = [];
  const children = [];
  let match;
  while ((match = token.exec(source)) !== null) {
    const closing = match[1] === "/";
    const selfClosing = match[4] === "/";
    const name = match[2];
    if (closing) {
      const open = stack.pop();
      if (!open || open.name !== name) continue;
      if (stack.length === 0) children.push(source.slice(open.start, token.lastIndex));
    } else if (stack.length === 0) {
      if (selfClosing) children.push(match[0]);
      else stack.push({ name, start: match.index });
    } else if (!selfClosing) {
      stack.push({ name, start: match.index });
    }
  }
  return children;
}

function domRichRecordsForRow(adapter, rowXml, richContext) {
  if (!richContext?.textStyles?.size || !/<text:span\b/i.test(rowXml)) return null;
  try {
    const wrapped = `<office:document-content${richContext.namespaceAttrs}>${rowXml}</office:document-content>`;
    const parsed = new DOMParser().parseFromString(wrapped, "application/xml");
    if (parsed.querySelector("parsererror")) return null;
    const row = parsed.getElementsByTagNameNS(
      "urn:oasis:names:tc:opendocument:xmlns:table:1.0", "table-row"
    )[0];
    if (!row) return null;
    return Array.from(row.children).map(cell => {
      if (!["table-cell", "covered-table-cell"].includes(cell.localName)) return null;
      const hasSpans = cell.getElementsByTagNameNS(
        "urn:oasis:names:tc:opendocument:xmlns:text:1.0", "span"
      ).length > 0;
      const styleName = cell.getAttribute("table:style-name") || "";
      const cellStyle = richContext.cellVisualStyles.get(styleName) || {};
      return hasSpans
        ? adapter._extractRichTextFromDom(cell, richContext.textStyles, cellStyle)
        : null;
    });
  } catch {
    return null;
  }
}

function rowXmlRecord(adapter, rowXml, richContext = null, p2Fast = false) {
  const source = String(rowXml || "");
  const rowOpen = source.match(/^<table:table-row\b([^>]*)>/i);
  if (!rowOpen) throw new Error("Malformed row XML payload record");
  const rowAttrs = parseAttrs(adapter, rowOpen[1], p2Fast);
  const rowBody = source.slice(rowOpen[0].length).replace(/<\/table:table-row\s*>\s*$/i, "");
  const cells = [];
  const domRich = domRichRecordsForRow(adapter, source, richContext);
  let cellIndex = 0;
  for (const cellXml of directXmlChildren(rowBody)) {
    const cellOpen = cellXml.match(/^<(table:covered-table-cell|table:table-cell)\b([^>]*)>/i);
    if (!cellOpen) continue;
    const covered = cellOpen[1].toLowerCase() === "table:covered-table-cell" ? 1 : 0;
    const attrs = parseAttrs(adapter, cellOpen[2], p2Fast);
    const selfClosing = /\/\s*>$/.test(cellOpen[0]);
    const closeTag = `</${cellOpen[1]}>`;
    const closeAt = selfClosing ? -1 : cellXml.lastIndexOf(closeTag);
    const rawContent = closeAt < 0 ? "" : cellXml.slice(cellOpen[0].length, closeAt);
    // The v1 Python serializer used ElementTree.tostring(child) for each
    // direct cell child, which intentionally omitted whitespace-only tails
    // between those children. Match that boundary while keeping text inside
    // each child intact (spaces between rich-text spans are meaningful).
    const content = directXmlChildren(rawContent).join("");
    const cellRecord = [covered, p2Fast ? attrs : Object.entries(attrs), content];
    if (domRich) cellRecord.push({ domRich: true, value: domRich[cellIndex] || null });
    cells.push(cellRecord);
    cellIndex++;
  }
  return ["row", p2Fast ? rowAttrs : Object.entries(rowAttrs), cells];
}

function normalizedRecord(adapter, record, richContext = null, p2Fast = false) {
  // XML parsers normalize CRLF/CR to LF before exposing text nodes. Match the
  // prior ElementTree payload behavior before regex-based rich-text extraction.
  return record?.[0] === "row-xml"
    ? rowXmlRecord(adapter, String(record[1] || "").replace(/\r\n?/g, "\n"), richContext, p2Fast)
    : record;
}

function cellImagesDomEquivalent(adapter, content, baseId) {
  if (!/<draw:frame\b/i.test(String(content || ""))) return [];
  const images = [];
  const frames = directXmlChildren(content).filter(xml => /^<draw:frame\b/i.test(xml));
  for (let index = 0; index < frames.length; index++) {
    const frameXml = frames[index];
    const frameOpen = frameXml.match(/^<draw:frame\b([^>]*)>/i);
    if (!frameOpen) continue;
    const frameAttrs = frameOpen[1];
    const frameBody = frameXml.slice(frameOpen[0].length).replace(/<\/draw:frame>\s*$/i, "");
    const imageXml = directXmlChildren(frameBody).find(xml => /^<draw:image\b/i.test(xml));
    if (!imageXml) continue;
    const imageOpen = imageXml.match(/^<draw:image\b([^>]*)>/i);
    if (!imageOpen) continue;
    const imageBody = imageXml.slice(imageOpen[0].length).replace(/<\/draw:image>\s*$/i, "");
    const binaryXml = directXmlChildren(imageBody).find(xml => /^<office:binary-data\b/i.test(xml));
    if (!binaryXml) continue;
    const binaryOpen = binaryXml.match(/^<office:binary-data\b[^>]*>/i);
    if (!binaryOpen) continue;
    const base64 = binaryXml.slice(binaryOpen[0].length).replace(/<\/office:binary-data>\s*$/i, "").replace(/\s+/g, "");
    if (!base64) continue;
    const imageAttrs = imageOpen[1];
    const mime = imageAttrs.match(/draw:mime-type=["']([^"']*)["']/i)?.[1] || "image/png";
    const widthCm = adapter._odfLengthToCm(frameAttrs.match(/svg:width=["']([^"']*)["']/i)?.[1]);
    const heightCm = adapter._odfLengthToCm(frameAttrs.match(/svg:height=["']([^"']*)["']/i)?.[1]);
    const offsetXCm = adapter._odfLengthToCm(frameAttrs.match(/svg:x=["']([^"']*)["']/i)?.[1]);
    const offsetYCm = adapter._odfLengthToCm(frameAttrs.match(/svg:y=["']([^"']*)["']/i)?.[1]);
    images.push({
      id: frameAttrs.match(/draw:name=["']([^"']*)["']/i)?.[1] || (baseId + "_" + (index + 1)),
      ...adapter._imageSourceIdFromAttrs(frameAttrs),
      src: "data:" + String(mime).toLowerCase() + ";base64," + base64,
      ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
      ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
      ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
      ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {}),
    });
  }
  return images;
}

function setupForSheet(adapter, table, tableXml, rowColStyles) {
  const attrs = parseAttrs(adapter, table.attrs);
  const name = attrs["table:name"] || `Trang tính ${table.index + 1}`;
  const printArea = adapter._parsePrintRangeAddress(attrs["table:print-ranges"] || "");
  const parseJson = key => {
    try { return JSON.parse(attrs[key] || "{}"); } catch { return {}; }
  };
  const pageMargins = parseJson("vno:page-margins");
  const pageScale = parseJson("vno:page-scale");
  const pageHeaderFooter = parseJson("vno:page-header-footer");
  const pageCentering = parseJson("vno:page-centering");
  const pagePrintOptions = parseJson("vno:page-print-options");
  const standardLayout = adapter._parseStandardOdfPageLayout(tableXml, attrs["table:style-name"] || "");
  const pageSetup = {
    size: attrs["vno:page-size"] || standardLayout?.size || "a4",
    orientation: attrs["vno:page-orientation"] || standardLayout?.orientation || "portrait",
    margins: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78, ...(standardLayout?.margins || {}), ...pageMargins },
    scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0, ...(standardLayout?.scale || {}), ...pageScale },
    headerFooter: {
      header: { left: "", center: "", right: "", ...(standardLayout?.headerFooter?.header || {}), ...(pageHeaderFooter.header || {}) },
      footer: { left: "", center: "Trang &P / &N", right: "", ...(standardLayout?.headerFooter?.footer || {}), ...(pageHeaderFooter.footer || {}) },
    },
    centerOnPage: { horizontal: false, vertical: false, ...(standardLayout?.centerOnPage || {}), ...pageCentering },
    printOptions: { gridlines: false, headings: false, ...(standardLayout?.printOptions || {}), ...pagePrintOptions },
    printTitles: { rows: attrs["vno:print-title-rows"] || "", cols: attrs["vno:print-title-cols"] || "" },
  };
  if (!pageSetup.printTitles.rows && !pageSetup.printTitles.cols) {
    const standardTitles = adapter._parseStandardPrintTitles(tableXml, name);
    if (standardTitles) pageSetup.printTitles = standardTitles;
  }

  const localRanges = [];
  let localNameIndex = 0;
  table.body.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, rangeAttrs) => {
    const range = adapter._parseNamedRangeElement(rangeAttrs, "sheet", name, ++localNameIndex);
    // parseFods' DOM outerHTML scan omits the built-in print-area name on
    // lan14; that range is retained independently as printAreaBySheet.
    if (range && range.name !== "_xlnm.Print_Area") localRanges.push(range);
    return "";
  });

  const columnStyles = [];
  const colWidths = new Map();
  const hiddenCols = new Set();
  let layoutColumn = 1;
  const effectiveColLimit = Math.max(table.lastDataCol, 26);
  table.body.replace(/<table:table-column(?=[\s/>])([^>]*)\/?\s*>/gi, (_, columnAttrs) => {
    const column = parseAttrs(adapter, columnAttrs);
    const repeat = Math.max(1, Number(column["table:number-columns-repeated"]) || 1);
    const styleName = column["table:style-name"] || "";
    const visibility = (column["table:visibility"] || "").toLowerCase();
    const widthPx = rowColStyles.columns.get(styleName)?.widthPx;
    const defaultCellStyle = column["table:default-cell-style-name"] || "";
    for (let index = 0; index < repeat; index++, layoutColumn++) {
      if (layoutColumn > effectiveColLimit) continue;
      columnStyles.push(defaultCellStyle);
      const colName = adapter._columnName(layoutColumn);
      if (Number.isFinite(widthPx) && !adapter._isCloseToDefault(widthPx, adapter._sheetPayloadImportDefaultColWidth || adapter.grid?.defaultColWidth || 64)) colWidths.set(colName, widthPx);
      if (visibility === "collapse") hiddenCols.add(colName);
    }
    return "";
  });

  return { attrs, name, printArea, pageSetup, localRanges, columnStyles, colWidths, hiddenCols, lastDataCol: table.lastDataCol };
}

function validatePayload(payload, adapter, supportXmlOverride) {
  if (!payload || payload.format !== "vno.sheet.payload.v2") {
    throw new TypeError("Unsupported Sheet payload format");
  }
  if (payload.rowsEncoding !== "deflate-base64-jsonl-row-xml") {
    throw new TypeError("Unsupported Sheet payload row encoding");
  }
  if (!Number.isSafeInteger(payload.sheets) || payload.sheets < 1 || payload.sheets > 4096
    || !Number.isSafeInteger(payload.rows) || payload.rows < 1 || payload.rows > 2_000_000
    || !Number.isSafeInteger(payload.sourceBytes) || payload.sourceBytes < 1) {
    throw new TypeError("Invalid Sheet payload counts");
  }
  if (typeof payload.rowsDeflateBase64 !== "string"
    || !payload.rowsDeflateBase64.length
    || payload.rowsDeflateBase64.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.rowsDeflateBase64)) {
    throw new TypeError("Invalid Sheet payload row data");
  }
  const rawSupportXml = supportXmlOverride ?? payload.supportXml;
  if (typeof rawSupportXml !== "string" || !/<office:document\b[\s\S]*<\/office:document\s*>/i.test(rawSupportXml)) {
    throw new TypeError("Sheet payload support XML is missing or incomplete");
  }
  const rawStyleXml = payload.rawStyleXml;
  if (!rawStyleXml || typeof rawStyleXml !== "object" || Array.isArray(rawStyleXml)) {
    throw new TypeError("Sheet payload styles are missing");
  }
  let supportXml = rawSupportXml;
  for (const [tag, raw] of Object.entries(rawStyleXml)) {
    if (!["office:styles", "office:automatic-styles", "office:font-face-decls"].includes(tag)
      || typeof raw !== "string" || !raw.startsWith(`<${tag}`) || !raw.endsWith(`</${tag}>`)) {
      throw new TypeError("Invalid Sheet payload style block");
    }
    if (!raw) continue;
    const name = tag.slice("office:".length);
    const pattern = new RegExp("<office:" + name + "\\b[^>]*>[\\s\\S]*?<\\/office:" + name + ">", "i");
    supportXml = supportXml.replace(pattern, raw);
  }
  return supportXml;
}

export async function buildSheetPayloadModel(payload, adapter, supportXmlOverride, options = {}) {
  if (!adapter) throw new TypeError("SheetAdapter is required to build a payload model");
  const useLegacy = options.legacy === true || globalThis.__VNO_OPEN_LEGACY === true;
  const perfEnabled = typeof window !== "undefined" && window.__vnoPerfDebug === true;
  const perfNow = () => performance.now();
  const perfReport = (name, started) => {
    if (perfEnabled) window.__vnoPerfReport?.(`buildSheetPayloadModel:${name}`, perfNow() - started);
  };
  let phaseStarted = perfEnabled ? perfNow() : 0;
  const supportXml = validatePayload(payload, adapter, supportXmlOverride);
  perfReport("validate payload", phaseStarted);
  phaseStarted = perfEnabled ? perfNow() : 0;
  const xml = adapter._xmlWithoutEmbeddedObjects(supportXml);
  perfReport("strip embedded objects", phaseStarted);
  phaseStarted = perfEnabled ? perfNow() : 0;
  const numberStyles = adapter._parseNumberStyles(xml);
  const rotationStyles = adapter._parseRotationStyles(xml);
  const cellVisualStyles = adapter._parseCellVisualStyles(xml);
  const textStyles = adapter._parseTextStyles(xml);
  const rowColStyles = adapter._parseRowColStyles(xml);
  perfReport("parse styles", phaseStarted);
  phaseStarted = perfEnabled ? perfNow() : 0;
  const blocks = tableBlocks(adapter, xml);
  const workbook = {
    sheets: [], sheetsData: {}, activeSheet: "", commentsBySheet: {}, mergedRangesBySheet: {},
    namedRangesWorkbook: [], namedRangesBySheet: {}, printAreaBySheet: {}, pageSetupBySheet: {},
    validationHits: [], rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {},
    userHiddenColsBySheet: {}, imagesAtOpenBySheet: {},
  };

  const activeMatch = xml.match(/<config:config-item\b([^>]*)config:name=["']ActiveTable["'][^>]*>([\s\S]*?)<\/config:config-item>/i);
  workbook.activeSheet = activeMatch ? adapter._unescapeXml(activeMatch[2].replace(/<[^>]+>/g, "")) : "";
  let workbookOnlyXml = xml;
  for (const block of blocks) workbookOnlyXml = workbookOnlyXml.replace(block.all, "");
  let workbookNameIndex = 0;
  workbookOnlyXml.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
    const range = adapter._parseNamedRangeElement(attrs, "workbook", "", ++workbookNameIndex);
    if (range) workbook.namedRangesWorkbook.push(range);
    return "";
  });
  perfReport("scan support XML", phaseStarted);

  const cellScan = new Map();
  let scanSheet = "";
  let openSheet = "";
  const seenSheets = new Set();
  const sheetRecordNames = [];
  let rowRecords = 0;
  let sheetRecords = 0;
  // Superseded by P2 - xoa chi khi chu so huu duyet: the legacy path still
  // inflates and normalizes all row XML twice. P2 retains pass-1 records and
  // releases them one by one while building the workbook in pass 2.
  const p2Records = useLegacy ? null : [];
  const rootOpen = xml.match(/<office:document\b([^>]*)>/i);
  const richContext = {
    textStyles,
    cellVisualStyles,
    namespaceAttrs: rootOpen?.[1] || "",
  };
  let scanNormalizeMs = 0;
  let scanRowsMs = 0;
  phaseStarted = perfEnabled ? perfNow() : 0;
  await eachCompressedRecord(payload, record => {
    const recordStarted = perfEnabled ? perfNow() : 0;
    if (!Array.isArray(record)) throw new TypeError("Invalid Sheet payload record");
    if (record[0] === "sheet") {
      const name = record[1];
      if (openSheet || typeof name !== "string" || !name || seenSheets.has(name)) {
        throw new TypeError("Invalid Sheet payload sheet record");
      }
      seenSheets.add(name);
      sheetRecordNames.push(name);
      openSheet = name;
      sheetRecords++;
    } else if (record[0] === "row-xml") {
      if (!openSheet || typeof record[1] !== "string" || !/<table:table-row\b/i.test(record[1])) {
        throw new TypeError("Invalid Sheet payload row record");
      }
      rowRecords++;
    } else if (record[0] === "end-sheet") {
      if (!openSheet) throw new TypeError("Invalid Sheet payload sheet boundary");
      openSheet = "";
    } else {
      throw new TypeError("Unknown Sheet payload record type");
    }
    record = normalizedRecord(adapter, record, useLegacy ? null : richContext, !useLegacy);
    if (p2Records) p2Records.push(record);
    if (perfEnabled) scanNormalizeMs += perfNow() - recordStarted;
    const scanStarted = perfEnabled ? perfNow() : 0;
    if (record[0] === "sheet") {
      scanSheet = record[1];
      if (scanSheet) cellScan.set(scanSheet, { row: 1, lastDataRow: 0, lastDataCol: 0 });
      return;
    }
    if (record[0] !== "row" || !scanSheet) return;
    const stats = cellScan.get(scanSheet);
    const rowAttrs = useLegacy ? Object.fromEntries(record[1]) : record[1];
    const rowRepeat = Math.max(1, Number(rowAttrs["table:number-rows-repeated"]) || 1);
    let column = 1;
    let rowHasData = false;
    for (const [covered, pairs, content] of record[2]) {
      if (covered !== 0 && covered !== 1) continue;
      const attrs = useLegacy ? Object.fromEntries(pairs) : pairs;
      const colRepeat = Math.max(1, Number(attrs["table:number-columns-repeated"]) || 1);
      const hasValue = adapter._fodsCellMarkupHasRealContent(attrs, content, cellVisualStyles, false);
      const compactBorderBlock = !hasValue && colRepeat <= adapter.constructor.STYLE_ONLY_MAX_COLUMN_REPEAT
        && rowRepeat <= adapter.constructor.STYLE_ONLY_MAX_ROW_REPEAT
        && adapter._fodsCellMarkupHasRealContent(attrs, content, cellVisualStyles);
      if (hasValue || compactBorderBlock) {
        rowHasData = true;
        stats.lastDataCol = Math.max(stats.lastDataCol, column + colRepeat - 1);
      }
      column += colRepeat;
    }
    if (rowHasData) stats.lastDataRow = stats.row + rowRepeat - 1;
    stats.row += rowRepeat;
    if (perfEnabled) scanRowsMs += perfNow() - scanStarted;
  }, { ...options, progressStart: 0, progressEnd: 0.35 });
  perfReport("pass 1 total", phaseStarted);
  if (perfEnabled) {
    window.__vnoPerfReport?.("buildSheetPayloadModel:pass 1 normalize rows", scanNormalizeMs);
    window.__vnoPerfReport?.("buildSheetPayloadModel:pass 1 scan cells", scanRowsMs);
  }
  if (openSheet || sheetRecords !== payload.sheets || rowRecords !== payload.rows) {
    throw new TypeError("Sheet payload record counts do not match its header");
  }

  let tableIndex = 0;
  const sheetBlocks = [];
  for (const block of blocks) {
    const attrs = parseAttrs(adapter, block.attrs);
    if (attrs["table:name"] === "local-table") continue;
    const name = attrs["table:name"] || `Trang tính ${tableIndex + 1}`;
    sheetBlocks.push({ ...block, index: tableIndex++, name, lastDataCol: cellScan.get(name)?.lastDataCol || 0 });
  }
  if (sheetBlocks.length !== sheetRecordNames.length
    || sheetBlocks.some((block, index) => block.name !== sheetRecordNames[index])) {
    throw new TypeError("Sheet payload support XML does not match its sheet records");
  }
  const sheetState = new Map();
  for (const block of sheetBlocks) {
    const table = setupForSheet(adapter, block, xml, rowColStyles);
    const data = new Map();
    const comments = {};
    const mergedRanges = [];
    const images = [];
    const arrayFormulas = [];
    const rowHeights = new Map();
    const hiddenRows = new Set();
    const state = { ...table, data, comments, mergedRanges, images, arrayFormulas, rowHeights, hiddenRows, rowNumber: 1, lastDataRow: cellScan.get(table.name)?.lastDataRow || 0 };
    sheetState.set(table.name, state);
    workbook.sheets.push(table.name);
    workbook.sheetsData[table.name] = data;
    workbook.commentsBySheet[table.name] = comments;
    workbook.mergedRangesBySheet[table.name] = mergedRanges;
    workbook.namedRangesBySheet[table.name] = table.localRanges;
    workbook.printAreaBySheet[table.name] = table.printArea;
    workbook.pageSetupBySheet[table.name] = table.pageSetup;
    workbook.rowHeightsBySheet[table.name] = rowHeights;
    workbook.colWidthsBySheet[table.name] = table.colWidths;
    workbook.userHiddenRowsBySheet[table.name] = hiddenRows;
    workbook.userHiddenColsBySheet[table.name] = table.hiddenCols;
    workbook.autoRowsAtImportBySheet ||= {};
    workbook.autoRowsAtImportBySheet[table.name] = new Map();
    workbook.imagesBySheet ||= {};
    workbook.imagesBySheet[table.name] = images;
    workbook.imagesAtOpenBySheet[table.name] = 0;
  }

  const tableByName = new Map(sheetBlocks.map(block => [parseAttrs(adapter, block.attrs)["table:name"] || `Trang tính ${block.index + 1}`, block]));
  let buildingSheet = "";
  const p2CellCache = useLegacy ? null : { numberFormats: new Map(), styleHashes: new Map(), styles: new Map() };
  let buildNormalizeMs = 0;
  let buildRowsMs = 0;
  let buildEndSheetMs = 0;
  phaseStarted = perfEnabled ? perfNow() : 0;
  const buildRecord = record => {
    const recordStarted = perfEnabled ? perfNow() : 0;
    if (useLegacy) record = normalizedRecord(adapter, record, richContext);
    if (perfEnabled) buildNormalizeMs += perfNow() - recordStarted;
    const buildStarted = perfEnabled ? perfNow() : 0;
    if (record[0] === "sheet") {
      buildingSheet = record[1];
      return;
    }
    if (record[0] === "end-sheet") {
      const state = sheetState.get(buildingSheet);
      if (state) {
        state.arrayFormulas.forEach(region => adapter._restoreArrayFormula(state.data, region.column, region.row, region.columns, region.rows, region.formula));
        const tableXml = tableByName.get(buildingSheet)?.all || "";
        const tableAttrs = tableByName.get(buildingSheet)?.attrs || "";
        const layoutXml = parseAttrs(adapter, tableAttrs)["vno:xlsx-layout"] || "";
        workbook.autoRowsAtImportBySheet[buildingSheet] = adapter._applyXlsxLayoutOverlay(layoutXml, state.rowHeights, state.colWidths, { data: state.data, mergedRanges: state.mergedRanges });
        const shapesImages = adapter._parseTableShapesImagesRegex(tableByName.get(buildingSheet)?.body || "", buildingSheet);
        state.images.push(...shapesImages);
        const sheetAttrs = parseAttrs(adapter, tableAttrs);
        let tabColor = sheetAttrs["vno:tab-color"] || sheetAttrs["tableooo:tab-color"] || sheetAttrs["table:tab-color"] || "";
        if (!tabColor) tabColor = adapter._parseStandardOdfTabColor(xml, sheetAttrs["table:style-name"] || "");
        if (tabColor) {
          workbook.tabColors ||= {};
          workbook.tabColors[buildingSheet] = tabColor;
        }
        workbook.imagesAtOpenBySheet[buildingSheet] = state.images.length;
      }
      buildingSheet = "";
      if (perfEnabled) buildEndSheetMs += perfNow() - buildStarted;
      return;
    }
    if (record[0] !== "row" || !buildingSheet) return;
    const state = sheetState.get(buildingSheet);
    if (!state) return;
    const rowAttrs = useLegacy ? Object.fromEntries(record[1]) : record[1];
    const rowRepeat = Math.max(1, Number(rowAttrs["table:number-rows-repeated"]) || 1);
    const rowStyleName = rowAttrs["table:style-name"] || "";
    const rowVisibility = (rowAttrs["table:visibility"] || "").toLowerCase();
    const heightPx = rowColStyles.rows.get(rowStyleName)?.heightPx;
    if (state.rowNumber > state.lastDataRow && (rowRepeat > 32 || state.rowNumber > state.lastDataRow + 1000)
      && rowVisibility !== "collapse" && rowVisibility !== "filter") {
      state.rowNumber += rowRepeat;
      return;
    }
    for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
      if (rowRepeat <= 32 || rowVisibility === "collapse" || rowVisibility === "filter") {
        if (Number.isFinite(heightPx) && !adapter._isCloseToDefault(heightPx, adapter.grid?.rowHeight || 20)) state.rowHeights.set(state.rowNumber, heightPx);
        if (rowVisibility === "collapse" || rowVisibility === "filter") state.hiddenRows.add(state.rowNumber);
      }
      if (state.rowNumber > state.lastDataRow) {
        state.rowNumber++;
        continue;
      }
      let columnNumber = 1;
      for (const [isCoveredNumber, pairs, content, domRich] of record[2]) {
        const attributes = useLegacy ? Object.fromEntries(pairs) : pairs;
        const columnRepeat = Math.max(1, Number(attributes["table:number-columns-repeated"]) || 1);
        const isCovered = isCoveredNumber === 1;
        const isCoveredErrorFormula = isCovered && Boolean(attributes["table:formula"] || attributes["vno:formula"])
          && (attributes["calcext:value-type"] || "").toLowerCase() === "error";
        const mergedColumns = Math.max(1, Number(attributes["table:number-columns-spanned"]) || 1);
        const mergedRows = Math.max(1, Number(attributes["table:number-rows-spanned"]) || 1);
        if (!isCovered && (mergedColumns > 1 || mergedRows > 1)) {
          for (let repeat = 0; repeat < columnRepeat; repeat++) {
            state.mergedRanges.push({
              start: { c: adapter._columnName(columnNumber + repeat), r: state.rowNumber },
              end: { c: adapter._columnName(columnNumber + repeat + mergedColumns - 1), r: state.rowNumber + mergedRows - 1 },
            });
          }
        }
        if (!attributes["table:style-name"] && state.columnStyles[columnNumber - 1]) attributes["table:style-name"] = state.columnStyles[columnNumber - 1];
        const annotationMatch = String(content || "").match(/<office:annotation\b([^>]*)>([\s\S]*?)<\/office:annotation>/i);
        const valueContent = annotationMatch ? content.replace(annotationMatch[0], "") : content;
        const text = cellText(adapter, valueContent);
        const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"]
          || text !== "" || annotationMatch || attributes["table:content-validation-name"]
          || (columnNumber <= state.lastDataCol && adapter._cellStyleHasBorder(attributes["table:style-name"], cellVisualStyles));
        if (hasValue && (!isCovered || isCoveredErrorFormula)) {
          const item = useLegacy
            ? adapter._cellFromFodsAttributesLegacy(attributes, text, numberStyles, rotationStyles, cellVisualStyles)
            : adapter._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles, p2CellCache);
          if (textStyles.size > 0 && (useLegacy || domRich?.domRich || /<text:span\b/i.test(valueContent))) {
            const cellVisual = cellVisualStyles.get(attributes["table:style-name"]) || {};
            const rich = domRich?.domRich
              ? domRich.value
              : adapter._extractRichTextFromXml(valueContent, textStyles, cellVisual);
            if (rich?.runs) {
              item.richText = adapter._normalizeRichTextCellFont(rich.runs, item.style);
              item.val = attributes["vno:original-string"] ?? rich.text;
              item.style.styleHashAtImport = adapter._computeStyleHash(item.style);
            }
          }
          const matrixColumns = Math.max(1, Number(attributes["table:number-matrix-columns-spanned"]) || 1);
          const matrixRows = Math.max(1, Number(attributes["table:number-matrix-rows-spanned"]) || 1);
          if ((attributes["table:number-matrix-columns-spanned"] || attributes["table:number-matrix-rows-spanned"]) && item.formula) {
            state.arrayFormulas.push({ column: columnNumber, row: state.rowNumber, columns: matrixColumns, rows: matrixRows, formula: item.formula });
          }
          const materializeRepeat = Math.max(0, Math.min(columnRepeat, state.lastDataCol - columnNumber + 1));
          for (let repeat = 0; repeat < materializeRepeat; repeat++) {
            const coord = `${adapter._columnName(columnNumber + repeat)}${state.rowNumber}`;
            state.data.set(coord, { ...item });
            if (attributes["table:content-validation-name"]) {
              workbook.validationHits.push({ sheet: buildingSheet, coord, name: attributes["table:content-validation-name"] });
            }
            if (annotationMatch) {
              const body = annotationMatch[2];
              state.comments[coord] = {
                coord,
                text: adapter._unescapeXml(body.match(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/i)?.[1]?.replace(/<[^>]+>/g, "") || ""),
                author: adapter._unescapeXml(body.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1]?.replace(/<[^>]+>/g, "") || annotationMatch[1].match(/office:author=["']([^"']*)["']/i)?.[1] || ""),
                timestamp: adapter._unescapeXml(body.match(/<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]?.replace(/<[^>]+>/g, "") || annotationMatch[1].match(/office:create-date=["']([^"']*)["']/i)?.[1] || ""),
              };
            }
          }
        }
        const embeddedImages = cellImagesDomEquivalent(adapter, content, "Image" + (state.images.length + 1));
        for (const image of embeddedImages) {
          state.images.push({ ...image, anchor: { c: adapter._columnName(columnNumber), r: state.rowNumber } });
        }
        columnNumber += columnRepeat;
      }
      state.rowNumber++;
    }
    if (perfEnabled) buildRowsMs += perfNow() - buildStarted;
  };
  if (useLegacy) {
    await eachCompressedRecord(payload, buildRecord, { ...options, progressStart: 0.35, progressEnd: 1 });
  } else {
    await eachCachedRecord(p2Records, buildRecord, {
      ...options, totalRows: payload.rows, progressStart: 0.35, progressEnd: 1,
    });
  }
  perfReport("pass 2 total", phaseStarted);
  if (perfEnabled) {
    window.__vnoPerfReport?.("buildSheetPayloadModel:pass 2 normalize rows", buildNormalizeMs);
    window.__vnoPerfReport?.("buildSheetPayloadModel:pass 2 build rows", buildRowsMs);
    window.__vnoPerfReport?.("buildSheetPayloadModel:pass 2 finalize sheets", buildEndSheetMs);
  }

  phaseStarted = perfEnabled ? perfNow() : 0;
  if (!workbook.sheets.includes(workbook.activeSheet)) workbook.activeSheet = workbook.sheets[0] || "";
  adapter._attachImportedRules(workbook, supportXml);
  adapter._attachImportedPivots(workbook, supportXml);
  adapter._attachImportedCharts(workbook, supportXml);
  adapter._attachImportedPageBreaks(workbook, supportXml, rowColStyles);
  adapter._attachImportedProtection(workbook, supportXml);
  adapter._attachImportedFreezePanes(workbook, supportXml);
  adapter._attachImportedSheetVisibility(workbook, supportXml);
  adapter._attachImportedAutoFilter(workbook, supportXml);
  adapter._attachImportedSparklines(workbook, supportXml);
  adapter._attachImportedOutline(workbook, supportXml);
  perfReport("attach workbook metadata", phaseStarted);
  return workbook;
}

export function toPlain(value) {
  if (value instanceof Map) return Object.fromEntries([...value].map(([key, item]) => [key, toPlain(item)]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  if (value instanceof Set) return [...value].sort();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, toPlain(value[key])]));
  return value;
}
