/**
 * Pure XML helpers for native XLSX Freeze Panes (<pane state="frozen">).
 *
 * LibreOffice thật GIỮ ĐÚNG <pane> khi chuyển đổi headless XLSX->XLSX (đã xác
 * nhận qua vòng chuyển đổi soffice thật), nhưng KHÔNG khôi phục nó vào ODF
 * office:settings khi chuyển đổi XLSX->FODS hay FODS->XLSX (mất hoàn toàn cả
 * hai chiều qua ODF) - một giới hạn thật của bản thân soffice, không phải lỗi
 * cú pháp. Vì vậy Freeze Panes phải đi qua đúng 2 lớp overlay/postprocess như
 * Slide Master logo / p14:sectionLst / p:showPr / khổ trang chiếu của Slides:
 *   - Export: VN Office tự lưu frozenRows/frozenCols dạng vno:frozen-rows/cols
 *     trên <table:table> trong FODS của chính nó -> postprocess đọc lại giá
 *     trị này và ghi thẳng <pane> chuẩn vào XLSX thật SAU KHI soffice xuất ra.
 *   - Mở file XLSX thật (từ Excel hoặc nguồn khác): đọc trực tiếp <pane> từ
 *     XLSX gốc (soffice không giữ được qua FODS) và ghi đè vno:frozen-rows/cols
 *     vào FODS TRƯỚC KHI SheetAdapter.parseFods() chạy.
 *
 * Browser-safe: no Node APIs. SheetAdapter may import this file.
 */

const TABLE_TAG_RE = /<table:table\b([^>]*)>/gi;
const SHEET_VIEW_RE = /(<sheetView\b[^>]*>)([\s\S]*?)(<\/sheetView>)/i;
const SHEET_VIEW_SELFCLOSE_RE = /<sheetView\b([^>]*)\/>/i;
const PANE_RE = /<pane\b[^>]*\/>/gi;
const SELECTION_RE = /<selection\b[^>]*\/>/gi;
const PANE_MATCH_RE = /<pane\b([^>]*)\/>/i;

function unescapeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Số cột 1-based -> nhãn cột kiểu Excel (1="A", 26="Z", 27="AA"...). */
export function columnLabelFromIndex(oneBasedIndex) {
  let n = Math.max(1, Math.floor(oneBasedIndex));
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

/**
 * Đọc vno:frozen-rows/vno:frozen-cols từ FODS chính VN Office đã tự ghi
 * (xem SheetAdapter.serializeToFods()'s <table:table> attrs).
 * @returns {Record<string, {rows: number, cols: number}>}
 */
export function parseFreezePanesFromFods(fodsXml) {
  const xml = String(fodsXml || "");
  const result = {};
  let match;
  TABLE_TAG_RE.lastIndex = 0;
  while ((match = TABLE_TAG_RE.exec(xml)) !== null) {
    const attrs = match[1] || "";
    const nameMatch = attrs.match(/table:name=["']([^"']*)["']/i);
    if (!nameMatch) continue;
    const name = unescapeXml(nameMatch[1]);
    const rows = Number(attrs.match(/vno:frozen-rows=["'](\d+)["']/i)?.[1]) || 0;
    const cols = Number(attrs.match(/vno:frozen-cols=["'](\d+)["']/i)?.[1]) || 0;
    if (rows > 0 || cols > 0) result[name] = { rows, cols };
  }
  return result;
}

/** Đọc <pane state="frozen" xSplit ySplit> thật từ một worksheetN.xml XLSX. */
export function parseFreezePaneFromSheetXml(sheetXml) {
  const match = String(sheetXml || "").match(PANE_MATCH_RE);
  if (!match) return null;
  const attrs = match[1] || "";
  if (!/state=["']frozen["']/i.test(attrs)) return null;
  const cols = Number(attrs.match(/xSplit=["'](\d+)["']/i)?.[1]) || 0;
  const rows = Number(attrs.match(/ySplit=["'](\d+)["']/i)?.[1]) || 0;
  if (rows === 0 && cols === 0) return null;
  return { rows, cols };
}

/**
 * Ghi <pane state="frozen"> chuẩn OOXML vào <sheetView> của một worksheetN.xml
 * - xSplit/ySplit là SỐ CỘT/HÀNG cố định thật (không phải pixel/twips).
 */
export function applyFreezePaneToSheetXml(sheetXml, rows, cols) {
  const xml = String(sheetXml || "");
  if (!(rows > 0) && !(cols > 0)) return xml;

  const topLeftCol = columnLabelFromIndex(cols + 1);
  const topLeftRow = rows + 1;
  const topLeftCell = `${topLeftCol}${topLeftRow}`;
  const activePane = rows > 0 && cols > 0 ? "bottomRight" : rows > 0 ? "bottomLeft" : "topRight";

  const paneAttrs = [];
  if (cols > 0) paneAttrs.push(`xSplit="${cols}"`);
  if (rows > 0) paneAttrs.push(`ySplit="${rows}"`);
  paneAttrs.push(`topLeftCell="${topLeftCell}"`, `activePane="${activePane}"`, 'state="frozen"');
  const paneXml = `<pane ${paneAttrs.join(" ")}/>`;
  const selectionXml = `<selection pane="${activePane}" activeCell="${topLeftCell}" sqref="${topLeftCell}"/>`;

  const clean = (inner) => inner.replace(PANE_RE, "").replace(SELECTION_RE, "");

  const openClose = xml.match(SHEET_VIEW_RE);
  if (openClose) {
    const [full, open, inner, close] = openClose;
    const replacement = `${open}${paneXml}${selectionXml}${clean(inner)}${close}`;
    return xml.slice(0, openClose.index) + replacement + xml.slice(openClose.index + full.length);
  }

  const selfClose = xml.match(SHEET_VIEW_SELFCLOSE_RE);
  if (selfClose) {
    const [full, attrs] = selfClose;
    const replacement = `<sheetView${attrs}>${paneXml}${selectionXml}</sheetView>`;
    return xml.slice(0, selfClose.index) + replacement + xml.slice(selfClose.index + full.length);
  }

  return xml;
}

/**
 * File → Mở: ghi vno:frozen-rows/cols vào đúng <table:table> trong FODS
 * (soffice XLSX->FODS xuất ra) TRƯỚC KHI SheetAdapter.parseFods() chạy, dựa
 * theo dữ liệu {sheetName: {rows, cols}} đọc trực tiếp từ <pane> thật của
 * XLSX gốc (soffice không tự khôi phục việc này vào ODF).
 */
export function applyFreezePanesToFods(fodsXml, freezeBySheetName) {
  let xml = String(fodsXml || "");
  if (!freezeBySheetName || Object.keys(freezeBySheetName).length === 0) return xml;
  xml = xml.replace(/<table:table\b([^>]*)>/gi, (full, attrs) => {
    const nameMatch = attrs.match(/table:name=["']([^"']*)["']/i);
    if (!nameMatch) return full;
    const name = unescapeXml(nameMatch[1]);
    const freeze = freezeBySheetName[name];
    if (!freeze || (!(freeze.rows > 0) && !(freeze.cols > 0))) return full;
    const nextAttrs = `${attrs.replace(/\s*vno:frozen-rows=["']\d+["']/gi, "").replace(/\s*vno:frozen-cols=["']\d+["']/gi, "")} vno:frozen-rows="${freeze.rows}" vno:frozen-cols="${freeze.cols}"`;
    return `<table:table${nextAttrs}>`;
  });
  return xml;
}

/** Ánh xạ tên sheet (VN Office) -> {rows, cols} -> tên sheet -> r:id -> ánh xạ tới file worksheetN.xml thật, dùng ở lớp Node/Python có quyền đọc ZIP. */
export function resolveSheetRidMap(workbookXml) {
  const xml = String(workbookXml || "");
  const result = {};
  const sheetRe = /<sheet\b([^>]*)\/?>/gi;
  let match;
  while ((match = sheetRe.exec(xml)) !== null) {
    const attrs = match[1] || "";
    const name = attrs.match(/\bname=["']([^"']*)["']/i)?.[1];
    const rid = attrs.match(/\br:id=["']([^"']*)["']/i)?.[1];
    if (name && rid) result[unescapeXml(name)] = rid;
  }
  return result;
}

export function resolveRidTargetMap(workbookRelsXml) {
  const xml = String(workbookRelsXml || "");
  const result = {};
  const relRe = /<Relationship\b([^>]*)\/?>/gi;
  let match;
  while ((match = relRe.exec(xml)) !== null) {
    const attrs = match[1] || "";
    const id = attrs.match(/\bId=["']([^"']*)["']/i)?.[1];
    const target = attrs.match(/\bTarget=["']([^"']*)["']/i)?.[1];
    if (id && target) result[id] = target.startsWith("xl/") ? target : `xl/${target.replace(/^\.?\/?/, "")}`;
  }
  return result;
}
