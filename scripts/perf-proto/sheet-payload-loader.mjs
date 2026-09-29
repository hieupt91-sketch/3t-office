// Scratch-only loader for fods_to_sheet_payload.py output. It deliberately
// shares SheetAdapter's normalization helpers while avoiding DOMParser.
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const LOCAL_TABLE_RE = /<table:table(?=[\s/>])([^>]*)>([\s\S]*?)<\/table:table>/gi;
const NS_TABLE = "table";

function parseAttrs(adapter, raw) {
  const attrs = {};
  String(raw || "").replace(/([\w:-]+)=(["'])([\s\S]*?)\2/g, (_, key, quote, value) => {
    attrs[key] = adapter._unescapeXml(value);
    return "";
  });
  return attrs;
}

async function eachCompressedRecord(payload, onRecord) {
  if (typeof process !== "undefined" && process.versions?.node) {
    const { createInflate } = await import("node:zlib");
    const inflate = createInflate();
    const decoder = new TextDecoder();
    let carry = "";
    const finished = new Promise((resolve, reject) => {
      inflate.on("data", chunk => {
        const lines = (carry + decoder.decode(chunk, { stream: true })).split("\n");
        carry = lines.pop() || "";
        for (const line of lines) if (line) onRecord(JSON.parse(line));
      });
      inflate.on("end", () => {
        carry += decoder.decode();
        if (carry) onRecord(JSON.parse(carry));
        resolve();
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
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const lines = (carry + decoder.decode(value, { stream: true })).split("\n");
    carry = lines.pop() || "";
    for (const line of lines) if (line) onRecord(JSON.parse(line));
  }
  carry += decoder.decode();
  if (carry) onRecord(JSON.parse(carry));
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

function cellImagesDomEquivalent(adapter, content, baseId) {
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
      header: { left: "", center: "", right: "", ...(pageHeaderFooter.header || {}) },
      footer: { left: "", center: "Trang &P / &N", right: "", ...(pageHeaderFooter.footer || {}) },
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
      if (Number.isFinite(widthPx) && !adapter._isCloseToDefault(widthPx, adapter.grid?.defaultColWidth || 64)) colWidths.set(colName, widthPx);
      if (visibility === "collapse") hiddenCols.add(colName);
    }
    return "";
  });

  return { attrs, name, printArea, pageSetup, localRanges, columnStyles, colWidths, hiddenCols, lastDataCol: table.lastDataCol };
}

export async function loadSheetPayload(payload, adapter = new SheetAdapter(null)) {
  if (!payload || payload.format !== "vno.sheet.payload.v1") throw new TypeError("Unsupported Sheet payload format");
  let supportXml = payload.supportXml || "";
  for (const [tag, raw] of Object.entries(payload.rawStyleXml || {})) {
    if (!raw) continue;
    const name = tag.slice("office:".length);
    const pattern = new RegExp("<office:" + name + "\\b[^>]*>[\\s\\S]*?<\\/office:" + name + ">", "i");
    supportXml = supportXml.replace(pattern, raw);
  }
  const xml = adapter._xmlWithoutEmbeddedObjects(supportXml);
  const numberStyles = adapter._parseNumberStyles(xml);
  const rotationStyles = adapter._parseRotationStyles(xml);
  const cellVisualStyles = adapter._parseCellVisualStyles(xml);
  const textStyles = adapter._parseTextStyles(xml);
  const rowColStyles = adapter._parseRowColStyles(xml);
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

  const cellScan = new Map();
  let scanSheet = "";
  await eachCompressedRecord(payload, record => {
    if (record[0] === "sheet") {
      scanSheet = record[1];
      if (scanSheet) cellScan.set(scanSheet, { row: 1, lastDataRow: 0, lastDataCol: 0 });
      return;
    }
    if (record[0] !== "row" || !scanSheet) return;
    const stats = cellScan.get(scanSheet);
    const rowAttrs = Object.fromEntries(record[1]);
    const rowRepeat = Math.max(1, Number(rowAttrs["table:number-rows-repeated"]) || 1);
    let column = 1;
    let rowHasData = false;
    for (const [covered, pairs, content] of record[2]) {
      if (covered !== 0 && covered !== 1) continue;
      const attrs = Object.fromEntries(pairs);
      const colRepeat = Math.max(1, Number(attrs["table:number-columns-repeated"]) || 1);
      const hasValue = adapter._fodsCellMarkupHasRealContent(attrs, content, cellVisualStyles, false);
      const compactBorderBlock = !hasValue && colRepeat <= SheetAdapter.STYLE_ONLY_MAX_COLUMN_REPEAT
        && rowRepeat <= SheetAdapter.STYLE_ONLY_MAX_ROW_REPEAT
        && adapter._fodsCellMarkupHasRealContent(attrs, content, cellVisualStyles);
      if (hasValue || compactBorderBlock) {
        rowHasData = true;
        stats.lastDataCol = Math.max(stats.lastDataCol, column + colRepeat - 1);
      }
      column += colRepeat;
    }
    if (rowHasData) stats.lastDataRow = stats.row + rowRepeat - 1;
    stats.row += rowRepeat;
  });

  let tableIndex = 0;
  const sheetBlocks = [];
  for (const block of blocks) {
    const attrs = parseAttrs(adapter, block.attrs);
    if (attrs["table:name"] === "local-table") continue;
    const name = attrs["table:name"] || `Trang tính ${tableIndex + 1}`;
    sheetBlocks.push({ ...block, index: tableIndex++, name, lastDataCol: cellScan.get(name)?.lastDataCol || 0 });
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
  await eachCompressedRecord(payload, record => {
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
      return;
    }
    if (record[0] !== "row" || !buildingSheet) return;
    const state = sheetState.get(buildingSheet);
    if (!state) return;
    const rowAttrs = Object.fromEntries(record[1]);
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
      for (const [isCoveredNumber, pairs, content] of record[2]) {
        const attributes = Object.fromEntries(pairs);
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
          const item = adapter._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles);
          if (textStyles.size > 0) {
            const cellVisual = cellVisualStyles.get(attributes["table:style-name"]) || {};
            const rich = adapter._extractRichTextFromXml(valueContent, textStyles, cellVisual);
            if (rich.runs) {
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
  });

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
  return workbook;
}

export function toPlain(value) {
  if (value instanceof Map) return Object.fromEntries([...value].map(([key, item]) => [key, toPlain(item)]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  if (value instanceof Set) return [...value].sort();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, toPlain(value[key])]));
  return value;
}
