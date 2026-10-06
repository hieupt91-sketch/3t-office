/**
 * 3T Office — Office Clipboard Interoperability Layer
 * Xử lý sao chép và dán 2 chiều giữa 3T Office (3T Doc, 3T Sheet) và Microsoft Word, Excel, LibreOffice Calc.
 *
 * Tính năng chính:
 * 1. 3T Sheet:
 *    - Phân tích mã HTML từ Excel và LibreOffice Calc (CSS rules, mso-number-format, x:num, sdval, sdnum).
 *    - Giữ nguyên số dạng number, ngày tháng, phần trăm, tiền tệ, in đậm/nghiêng, màu chữ, màu nền, đường viền, ô gộp (colspan/rowspan) và độ rộng cột.
 *    - Công thức từ Excel dán dạng giá trị trừ khi bảng nhớ tạm mang theo công thức (x:f, data-formula).
 *    - Đóng gói dữ liệu dải ô 3T Sheet thành HTML table chuẩn kèm inline styles và TSV text/plain khi sao chép ra Word/Excel.
 * 2. 3T Doc:
 *    - Lọc sạch mã rác từ Microsoft Word (mso-* styles, conditional comments, o:p tags, w:* tags) mà không làm mất định dạng hiển thị.
 *    - Giữ nguyên tiêu đề (h1-h6), in đậm/nghiêng/gạch chân, cỡ chữ, màu sắc, danh sách (bullet và numbering), bảng biểu và liên kết.
 *    - Đóng gói vùng chọn 3T Doc thành HTML chuẩn kèm inline styles và text/plain khi sao chép sang Word.
 */

import { NumberFormatter } from "../../apps/sheet/number-formatter.js";

/**
 * Bộ nhớ tạm nội bộ để chia sẻ giữa các thành phần và làm fallback
 * khi môi trường (như headless browser/node) chặn Clipboard API.
 */
class SharedClipboardStorage {
  constructor() {
    this._data = {
      text: "",
      html: "",
      model: null,
      app: null,
      timestamp: 0
    };
  }

  set({ text = "", html = "", model = null, app = null } = {}) {
    this._data = {
      text: String(text || ""),
      html: String(html || ""),
      model: model ? structuredClone(model) : null,
      app,
      timestamp: Date.now()
    };
  }

  get() {
    return this._data;
  }

  clear() {
    this._data = { text: "", html: "", model: null, app: null, timestamp: 0 };
  }
}

export const sharedOfficeClipboard = new SharedClipboardStorage();

// =============================================================================
// PHẦN 1: TIỆN ÍCH PHÂN TÍCH CSS & HTML DÙNG CHUNG
// =============================================================================

/**
 * Phân tích các khối <style>...</style> trong HTML để lấy CSS declarations theo class (.xl65, .MsoNormal...)
 * @param {string} html
 * @returns {Record<string, Record<string, string>>}
 */
export function parseCssStyleBlocks(html) {
  const rules = {};
  if (!html || typeof html !== "string") return rules;

  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    let rawCss = block
      .replace(/<\/?style[^>]*>/gi, "")
      .trim();

    // Excel wraps entire CSS in <!-- --> comments for legacy browser compatibility
    // Strip outer comment wrapper if present
    if (rawCss.startsWith("<!--") && rawCss.endsWith("-->")) {
      rawCss = rawCss.slice(4, -3).trim();
    }
    // Also remove any remaining inline comments
    rawCss = rawCss.replace(/<!--[\s\S]*?-->/g, "");

    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    while ((match = ruleRegex.exec(rawCss)) !== null) {
      const selectors = match[1].split(",");
      const declarations = parseCssDeclarations(match[2]);

      for (const sel of selectors) {
        const s = sel.trim();
        // Nhận diện class name như .xl65, td.xl65, .MsoNormal, p.MsoNormal
        const classMatches = s.match(/\.([a-zA-Z0-9_-]+)/g);
        if (classMatches) {
          for (const cls of classMatches) {
            const className = cls.slice(1);
            rules[className] = Object.assign(rules[className] || {}, declarations);
          }
        }
        // Lưu cả selector nguyên gốc để tra cứu thẻ (ví dụ h1, p, td)
        rules[s.toLowerCase()] = Object.assign(rules[s.toLowerCase()] || {}, declarations);
      }
    }
  }
  return rules;
}

/**
 * Phân tích chuỗi CSS declarations thành key-value map.
 * @param {string} cssText
 * @returns {Record<string, string>}
 */
export function parseCssDeclarations(cssText) {
  const decls = {};
  if (!cssText) return decls;

  const parts = cssText.split(";");
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    let val = part.slice(colonIdx + 1).trim();
    if (!prop || !val) continue;

    // Loại bỏ dấu nháy bọc ngoài nếu có
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).trim();
    }
    decls[prop] = val;
  }
  return decls;
}

/**
 * Giải mã các thực thể HTML cơ bản sang ký tự thật.
 * @param {string} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Làm sạch chuỗi HTML, loại bỏ thẻ tag để lấy nội dung văn bản thuần.
 * @param {string} html
 * @returns {string}
 */
export function stripHtmlTags(html) {
  if (!html) return "";
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

/**
 * Chuẩn hóa giá trị kích thước CSS (pt, px, cm, in) sang pixels (96dpi).
 * @param {string|number} size
 * @returns {number|null}
 */
export function parseCssLengthToPx(size) {
  if (size == null) return null;
  if (typeof size === "number") return Number.isFinite(size) ? size : null;

  const str = String(size).trim().toLowerCase();
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return null;

  if (str.endsWith("pt")) return Math.round(num * (96 / 72));
  if (str.endsWith("cm")) return Math.round(num * 37.795275591);
  if (str.endsWith("mm")) return Math.round(num * 3.7795275591);
  if (str.endsWith("in")) return Math.round(num * 96);
  if (str.endsWith("px")) return Math.round(num);
  return Math.round(num);
}

// =============================================================================
// PHẦN 2: 3T SHEET — PARSER BẢNG HTML TỪ EXCEL & CALC
// =============================================================================

/**
 * Chuyển số cột (1-indexed) thành chữ cái nhãn cột (1 -> A, 27 -> AA...)
 * @param {number} colNum
 * @returns {string}
 */
export function columnLabel(colNum) {
  let label = "";
  let n = colNum;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label || "A";
}

/**
 * Chuyển chữ cái nhãn cột thành số (A -> 1, AA -> 27...)
 * @param {string} colStr
 * @returns {number}
 */
export function columnNumber(colStr) {
  let num = 0;
  const str = String(colStr || "A").toUpperCase();
  for (let i = 0; i < str.length; i++) {
    num = num * 26 + (str.charCodeAt(i) - 64);
  }
  return num;
}

/**
 * Bỏ escape backslash trong chuỗi format Excel (vd: \#\.\#\#0 -> #.##0).
 * Excel dùng backslash để escape ký tự đặc biệt trong mso-number-format.
 * @param {string} fmt
 * @returns {string}
 */
function unescapeExcelFormat(fmt) {
  if (!fmt) return "";
  return fmt.replace(/\\(.)/g, "$1");
}

/**
 * Nhận diện loại định dạng số từ chuỗi mso-number-format hoặc sdnum.
 * @param {string} formatStr
 * @param {string} cellText
 * @param {any} rawValue
 * @param {{ decimal?: string, thousand?: string }|null} displayedSeparators
 * @returns {{ category: string, decimals?: number, formatPattern?: string, symbol?: string }|null}
 */
export function detectNumberFormat(formatStr, cellText = "", rawValue = null, displayedSeparators = null) {
  let fmt = (formatStr || "").trim();
  // Bỏ escape backslash (Excel format: \#\.\#\#0 -> #.##0)
  fmt = unescapeExcelFormat(fmt);
  const fmtLower = fmt.toLowerCase();
  const text = (cellText || "").trim();

  // 1. Dạng văn bản thuần (Text)
  if (fmtLower === "@" || fmtLower === "text" || fmt === "\\@") {
    return { category: "text" };
  }

  // 2. Dạng phần trăm (Percentage)
  if (fmtLower.includes("%") || text.endsWith("%")) {
    let decimals = 0;
    if (fmtLower.includes("0.00%") || fmtLower.includes("0.00%")) decimals = 2;
    else if (fmtLower.includes("0.0%") || fmtLower.includes("0.0%")) decimals = 1;
    else if (/\.\d+/.test(text.replace("%", ""))) {
      const match = text.replace("%", "").trim().match(/\.(\d+)/);
      if (match) decimals = match[1].length;
    }
    return { category: "percentage", decimals };
  }

  // 3. Dạng ngày tháng (Date)
  if (
    fmtLower.includes("yy") ||
    fmtLower.includes("dd") ||
    fmtLower.includes("short date") ||
    fmtLower.includes("long date") ||
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(text)
  ) {
    return { category: "date", formatPattern: "dd/mm/yyyy" };
  }

  // 4. Dạng tiền tệ (Currency / Accounting)
  if (
    fmtLower.includes("$") ||
    fmtLower.includes("₫") ||
    fmtLower.includes("currency") ||
    text.includes("₫") ||
    text.includes("$") ||
    text.includes("vnđ") ||
    text.includes("vnd")
  ) {
    const symbol = text.includes("$") || fmtLower.includes("$") ? "$" : "₫";
    return { category: "currency", symbol };
  }

  // 5. Dạng số có dấu phân cách hoặc phần thập phân (Number)
  // Xử lý các dạng: #,##0 / #.##0 (locale), #,##0.00 / #.##0,00, 0, 0.00, standard
  const hasHash = fmt.includes("#");
  const hasZero = fmt.includes("0");
  const hasThousandSep = /[#,][#,]/.test(fmt) || /#[\.,]#/.test(fmt) || /0[\.,]0/.test(fmt);

  if (hasHash || hasZero || fmtLower.includes("standard") || fmtLower.includes("general")) {
    let decimals = 0;
    // Phân tích vị trí dấu phân cách để phân biệt thousand separator vs decimal separator
    // Thousand separator: thường là , hoặc . theo sau bởi 3 placeholder (##0, ###, 000...)
    // Decimal separator: là dấu , hoặc . CUỐI CÙNG trong chuỗi format
    const separators = [];
    for (let i = 0; i < fmt.length; i++) {
      if (fmt[i] === "," || fmt[i] === ".") {
        separators.push({ pos: i, char: fmt[i] });
      }
    }
    
    if (separators.length >= 2) {
      // Có 2+ dấu phân cách: dấu cuối là decimal separator
      const lastSep = separators[separators.length - 1];
      const afterSep = fmt.slice(lastSep.pos + 1);
      const digitPlaceholders = afterSep.match(/[#0]/g);
      if (digitPlaceholders) decimals = digitPlaceholders.length;
    } else if (separators.length === 1) {
      // Chỉ có 1 dấu phân cách: kiểm tra xem có phải thousand separator không
      const sep = separators[0];
      const afterSep = fmt.slice(sep.pos + 1);
      const digitPlaceholders = afterSep.match(/[#0]/g);
      const placeholderCount = digitPlaceholders ? digitPlaceholders.length : 0;
      // Nếu sau dấu phân cách có đúng 3 placeholder (##0, ###, 000...) và không có exponent part
      // thì đây là thousand separator (dạng số nguyên), không phải decimal
      const isDisplayedThousandSep = displayedSeparators?.thousand === sep.char;
      const isThousandSep = placeholderCount === 3 && /^[#0]{3}$/.test(afterSep);
      if (isDisplayedThousandSep && placeholderCount >= 3 && /^[#0]+$/.test(afterSep)) {
        // Excel CF_HTML in locales such as vi-VN can collapse the invariant
        // '#,##0.00' into '#.##000'. The first three placeholders belong to
        // the thousands group; only the remainder are decimal places.
        decimals = placeholderCount - 3;
      } else if (!isThousandSep && placeholderCount > 0) {
        decimals = placeholderCount;
      }
      // Nếu là thousand separator -> decimals = 0 (số nguyên)
    }
    // Nếu không có dấu phân cách -> decimals = 0
    
    const useSeparator = hasThousandSep;
    return { category: "number", decimals, useSeparator, useThousands: useSeparator };
  }

  return null;
}

/**
 * Trích xuất và chuẩn hóa giá trị ô từ HTML (x:num, sdval, x:f, nội dung văn bản).
 * @param {Record<string, string>} attrs
 * @param {string} innerHtml
 * @param {Object|null} numberFormat
 * @returns {{ val: any, formula: string, numberFormat: Object|null }}
 */
export function extractCellValueAndFormula(attrs, innerHtml, numberFormat = null) {
  const plainText = stripHtmlTags(innerHtml);
  let formula = "";
  let val = plainText;

  // Trích xuất công thức nếu clipboard mang theo công thức (x:f của Excel, data-formula...)
  if (attrs["x:f"]) {
    formula = attrs["x:f"].trim();
    if (!formula.startsWith("=")) formula = "=" + formula;
  } else if (attrs["data-formula"]) {
    formula = attrs["data-formula"].trim();
    if (!formula.startsWith("=")) formula = "=" + formula;
  }

  // Trích xuất giá trị số thực tế từ thuộc tính x:num (Excel) hoặc sdval (Calc)
  if (attrs["x:num"] !== undefined && attrs["x:num"] !== "") {
    const num = Number(attrs["x:num"]);
    if (Number.isFinite(num)) {
      val = num;
    }
  } else if (attrs["sdval"] !== undefined && attrs["sdval"] !== "") {
    const num = Number(attrs["sdval"]);
    if (Number.isFinite(num)) {
      val = num;
    }
  } else {
    // Không có thuộc tính số: phân tích nội dung văn bản hiển thị
    if (numberFormat?.category === "percentage") {
      const cleaned = plainText.replace(/[% \t]/g, "").replace(",", ".");
      const parsed = parseFloat(cleaned);
      if (Number.isFinite(parsed)) {
        // Displayed "25%", "-7%", "0.5%" are percents; a bare number is already the fraction.
        val = plainText.includes("%") ? parsed / 100 : parsed;
      }
    } else if (numberFormat?.category === "date") {
      val = NumberFormatter.normalizeInputForFormat(plainText, numberFormat);
    } else {
      // Thử chuyển đổi sang số bằng NumberFormatter.parseNumber chuẩn của 3T Sheet
      const parsedNumber = NumberFormatter.parseNumber(plainText);
      if (parsedNumber !== null && !isNaN(parsedNumber)) {
        val = parsedNumber;
      }
    }
  }

  // Quy tắc: công thức sao chép từ Excel dán dạng giá trị trừ khi clipboard mang công thức
  if (!attrs["x:f"] && !attrs["data-formula"] && typeof val === "string" && !val.startsWith("=")) {
    formula = "";
  }

  return { val, formula, numberFormat };
}

/**
 * Chuẩn hóa màu sắc CSS sang hex hoặc chuỗi rgb chuẩn.
 * @param {string} color
 * @returns {string}
 */
export function normalizeCssColor(color) {
  if (!color) return "";
  const str = color.trim().toLowerCase();
  if (str === "windowtext" || str === "auto") return "#000000";
  if (str === "window" || str === "transparent") return "";
  return str;
}

/**
 * Trích xuất style ô từ thuộc tính HTML và CSS classes.
 * @param {Record<string, string>} combinedStyles
 * @param {Record<string, string>} attrs
 * @param {string} innerHtml
 * @returns {Record<string, any>}
 */
export function extractCellStyle(combinedStyles, attrs, innerHtml, tagName = "td") {
  const style = {};

  // In đậm (Bold)
  const isTh = String(tagName || "").toLowerCase() === "th" &&
    combinedStyles["font-weight"] !== "normal" &&
    combinedStyles["font-weight"] !== "400";
  const isBold =
    isTh ||
    combinedStyles["font-weight"] === "bold" ||
    parseInt(combinedStyles["font-weight"], 10) >= 600 ||
    /<(b|strong)\b/i.test(innerHtml);
  if (isBold) style.fontWeight = "bold";

  // In nghiêng (Italic)
  const isItalic =
    combinedStyles["font-style"] === "italic" ||
    /<(i|em)\b/i.test(innerHtml);
  if (isItalic) style.fontStyle = "italic";

  // Gạch chân (Underline)
  const isUnderline =
    combinedStyles["text-decoration"]?.includes("underline") ||
    /<u\b/i.test(innerHtml);
  if (isUnderline) style.textDecoration = "underline";

  // Màu chữ (Color)
  const fontColor =
    combinedStyles["color"] ||
    innerHtml.match(/<font\b[^>]*color=["']?([^"'>]+)["']?/i)?.[1];
  if (fontColor) {
    const norm = normalizeCssColor(fontColor);
    if (norm) style.color = norm;
  }

  // Màu nền / Màu tô (Fill Colour / Background)
  const bgColor =
    combinedStyles["background-color"] ||
    combinedStyles["background"] ||
    attrs["bgcolor"];
  if (bgColor) {
    const norm = normalizeCssColor(bgColor);
    if (norm) style.backgroundColor = norm;
  }

  // Đường viền (Borders)
  if (combinedStyles["border"]) {
    style.border = combinedStyles["border"];
  }
  if (combinedStyles["border-top"]) style.borderTop = combinedStyles["border-top"];
  if (combinedStyles["border-right"]) style.borderRight = combinedStyles["border-right"];
  if (combinedStyles["border-bottom"]) style.borderBottom = combinedStyles["border-bottom"];
  if (combinedStyles["border-left"]) style.borderLeft = combinedStyles["border-left"];

  if (attrs["border"] && !style.border && !style.borderTop) {
    style.border = "1px solid #000000";
  }

  // Căn lề ngang (Text Align)
  const align = combinedStyles["text-align"] || attrs["align"];
  if (align) {
    const a = align.toLowerCase();
    if (["left", "center", "right", "justify"].includes(a)) {
      style.textAlign = a;
    }
  }

  // Căn lề dọc (Vertical Align)
  const valign = combinedStyles["vertical-align"] || attrs["valign"];
  if (valign) {
    const va = valign.toLowerCase();
    if (["top", "middle", "bottom"].includes(va)) {
      style.verticalAlign = va;
    }
  }

  return style;
}

/**
 * Phân tích thuộc tính của một thẻ HTML.
 * @param {string} tagOpen
 * @returns {Record<string, string>}
 */
export function parseHtmlAttributes(tagOpen) {
  const attrs = {};
  if (!tagOpen) return attrs;

  const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attrRegex.exec(tagOpen)) !== null) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = val;
  }
  return attrs;
}

/**
 * Phân tích chuỗi HTML dạng bảng của Excel / LibreOffice Calc thành mô hình dải ô 3T Sheet.
 * @param {string} html
 * @param {string} [fallbackPlainText]
 * @returns {{
 *   cells: Array<Array<{ val: any, formula: string, style: Record<string, any> }>>,
 *   colWidths: Array<number>,
 *   rowHeights: Array<number>,
 *   mergedRanges: Array<{ start: { c: string, r: number }, end: { c: string, r: number } }>,
 *   range: { start: { c: string, r: number }, end: { c: string, r: number } }
 * }|null}
 */
export function parseOfficeHtmlTable(html, fallbackPlainText = "") {
  if (!html || typeof html !== "string" || !/<table\b/i.test(html)) {
    return null;
  }

  const cssRules = parseCssStyleBlocks(html);
  const displayedSeparators = {
    decimal: unescapeExcelFormat(cssRules.table?.["mso-displayed-decimal-separator"] || ""),
    thousand: unescapeExcelFormat(cssRules.table?.["mso-displayed-thousand-separator"] || "")
  };

  // 1. Phân tích độ rộng các cột từ <col> hoặc <colgroup>
  const colWidths = [];
  const colRegex = /<col\b([^>]*)\/?>/gi;
  let colMatch;
  while ((colMatch = colRegex.exec(html)) !== null) {
    const attrs = parseHtmlAttributes(colMatch[1]);
    const styles = parseCssDeclarations(attrs["style"] || "");
    const widthVal = styles["width"] || attrs["width"];
    const px = parseCssLengthToPx(widthVal);
    if (px && px > 0) {
      colWidths.push(px);
    }
  }

  // 2. Phân tích các hàng (<tr>) và ô (<td>, <th>)
  const rows = [];
  const rowHeights = [];
  const mergedRanges = [];

  // Ma trận 2D đánh dấu các ô đã bị ô gộp (rowspan / colspan) chiếm đóng
  // occupancy[r][c] = true nếu vị trí đã bị chiếm
  const occupancy = [];

  const trRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let rowIndex = 0;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trAttrs = parseHtmlAttributes(trMatch[1]);
    const trStyles = parseCssDeclarations(trAttrs["style"] || "");
    const rowHeight = parseCssLengthToPx(trStyles["height"] || trAttrs["height"]);
    rowHeights.push(rowHeight || 20);

    if (!occupancy[rowIndex]) occupancy[rowIndex] = [];
    const currentRowCells = [];
    let colIndex = 0;

    const cellRegex = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(trMatch[2])) !== null) {
      // Tìm vị trí cột trống tiếp theo không bị chiếm bởi rowspan/colspan trước đó
      while (occupancy[rowIndex]?.[colIndex]) {
        currentRowCells.push({ val: "", formula: "", style: {}, covered: true });
        colIndex++;
      }

      const cellAttrs = parseHtmlAttributes(cellMatch[2]);
      const inlineStyles = parseCssDeclarations(cellAttrs["style"] || "");
      const classNames = (cellAttrs["class"] || "").split(/\s+/).filter(Boolean);

      // Gộp styles: CSS rule class -> inline style
      const combinedStyles = {};
      for (const cls of classNames) {
        if (cssRules[cls]) Object.assign(combinedStyles, cssRules[cls]);
      }
      Object.assign(combinedStyles, inlineStyles);

      // Colspan & Rowspan
      const colSpan = Math.max(1, parseInt(cellAttrs["colspan"], 10) || 1);
      const rowSpan = Math.max(1, parseInt(cellAttrs["rowspan"], 10) || 1);

      // Nhận diện number format
      const msoFormat = combinedStyles["mso-number-format"] || cellAttrs["sdnum"];
      const innerHtml = cellMatch[3];
      const numberFormat = detectNumberFormat(msoFormat, stripHtmlTags(innerHtml), null, displayedSeparators);

      // Trích xuất giá trị & công thức
      const { val, formula } = extractCellValueAndFormula(cellAttrs, innerHtml, numberFormat);

      // Trích xuất style
      const style = extractCellStyle(combinedStyles, cellAttrs, innerHtml, cellMatch[1]);
      if (numberFormat) {
        style.numberFormat = numberFormat;
      }

      const cellData = { val, formula, style, text: stripHtmlTags(innerHtml) };
      currentRowCells.push(cellData);

      // Đánh dấu ô gộp vào ma trận occupancy và danh sách mergedRanges
      if (colSpan > 1 || rowSpan > 1) {
        for (let r = 0; r < rowSpan; r++) {
          const targetR = rowIndex + r;
          if (!occupancy[targetR]) occupancy[targetR] = [];
          for (let c = 0; c < colSpan; c++) {
            const targetC = colIndex + c;
            if (r > 0 || c > 0) {
              occupancy[targetR][targetC] = true;
            }
          }
        }
        // Ghi lại phạm vi ô gộp tương đối (1-indexed theo phạm vi dán)
        mergedRanges.push({
          start: { c: columnLabel(colIndex + 1), r: rowIndex + 1 },
          end: { c: columnLabel(colIndex + colSpan), r: rowIndex + rowSpan }
        });
      }

      // Chèn các ô bị che bởi colspan (trừ ô đầu tiên đã push ở trên)
      for (let c = 1; c < colSpan; c++) {
        currentRowCells.push({ val: "", formula: "", style: {}, covered: true });
      }

      colIndex += colSpan;
    }

    rows.push(currentRowCells);
    rowIndex++;
  }

  if (rows.length === 0) return null;

  // Chuẩn hóa độ dài các hàng thành hình chữ nhật đều
  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  for (const row of rows) {
    while (row.length < maxCols) {
      row.push({ val: "", formula: "", style: {} });
    }
  }

  return {
    cells: rows,
    colWidths,
    rowHeights,
    mergedRanges,
    range: {
      start: { c: "A", r: 1 },
      end: { c: columnLabel(maxCols), r: rows.length }
    }
  };
}

/**
 * Phân tích văn bản ngăn cách bằng tab (TSV text/plain) thành ma trận ô 3T Sheet.
 * @param {string} text
 * @returns {{
 *   cells: Array<Array<{ val: any, formula: string, style: Record<string, any> }>>,
 *   colWidths: Array<number>,
 *   rowHeights: Array<number>,
 *   mergedRanges: Array<any>,
 *   range: { start: { c: string, r: number }, end: { c: string, r: number } }
 * }}
 */
export function parseOfficeTsv(text) {
  if (!text || typeof text !== "string") {
    return {
      cells: [[{ val: "", formula: "", style: {} }]],
      colWidths: [],
      rowHeights: [],
      mergedRanges: [],
      range: { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } }
    };
  }

  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  // Loại bỏ hàng rỗng cuối cùng nếu có
  if (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const cells = [];
  for (const line of lines) {
    const rawCols = line.split("\t");
    const row = [];
    for (const raw of rawCols) {
      const trimmed = raw.trim();
      let val = raw;
      let formula = "";
      const style = {};

      if (trimmed.startsWith("=")) {
        formula = trimmed;
        val = "";
      } else {
        const numberFormat = detectNumberFormat("", trimmed);
        if (numberFormat?.category === "percentage") {
          const num = parseFloat(trimmed.replace("%", "").replace(",", "."));
          if (Number.isFinite(num)) {
            val = num > 1 ? num / 100 : num;
            style.numberFormat = numberFormat;
          }
        } else if (numberFormat?.category === "date") {
          val = trimmed;
          style.numberFormat = numberFormat;
        } else {
          const num = NumberFormatter.parseNumber(trimmed);
          if (num !== null && !isNaN(num)) {
            val = num;
            if (numberFormat) style.numberFormat = numberFormat;
          }
        }
      }

      row.push({ val, formula, style, text: trimmed });
    }
    cells.push(row);
  }

  const maxCols = Math.max(...cells.map((r) => r.length), 1);
  return {
    cells,
    colWidths: [],
    rowHeights: [],
    mergedRanges: [],
    range: {
      start: { c: "A", r: 1 },
      end: { c: columnLabel(maxCols), r: cells.length }
    }
  };
}

/**
 * Trả về chuỗi văn bản hiển thị chính xác của một ô tính 3T Sheet
 * (ví dụ: 60%, 1,250, 31/12/2026), dựa trên giá trị thô và cấu hình numberFormat.
 * @param {{ val?: any, formula?: string, style?: Record<string, any> }} cell
 * @returns {string}
 */
export function getSheetCellDisplayText(cell) {
  if (!cell) return "";
  const val = cell.val;
  if (val === undefined || val === null || val === "") return "";
  const style = cell.style || {};
  if (style.numberFormat) {
    const formatted = NumberFormatter.formatValue(val, style.numberFormat);
    if (formatted && formatted.text !== undefined) {
      return formatted.text;
    }
  }
  if (typeof val === "number") {
    return NumberFormatter.formatGeneralNumber(val);
  }
  return String(val);
}

/**
 * Kiểm tra xem một ô tính hoặc đoạn văn bản có mang định dạng in đậm hay không.
 * @param {{ val?: any, text?: string, style?: Record<string, any> }|string} cellOrText
 * @returns {boolean}
 */
export function isCellBold(cellOrText) {
  if (!cellOrText) return false;
  if (typeof cellOrText === "string") {
    return /<(b|strong)\b/i.test(cellOrText) || /font-weight:\s*(?:bold|[6-9]\d{2})/i.test(cellOrText);
  }
  const style = cellOrText.style || {};
  const fw = style.fontWeight;
  if (fw === "bold" || style.bold === true || (typeof fw === "number" && fw >= 600) || parseInt(fw, 10) >= 600) {
    return true;
  }
  const val = String(cellOrText.val ?? "");
  const text = String(cellOrText.text ?? "");
  return /<(b|strong)\b/i.test(val) || /<(b|strong)\b/i.test(text);
}

/**
 * Đóng gói một dải ô trong 3T Sheet thành chuỗi HTML bảng (text/html) và TSV (text/plain)
 * để dán chuẩn sang Microsoft Excel, Word hoặc LibreOffice Calc.
 * @param {any} grid SheetGridController
 * @param {{ start: { c: string, r: number }, end: { c: string, r: number } }} range
 * @returns {{ html: string, text: string, model: any }}
 */
export function serializeSheetRangeToClipboard(grid, range) {
  const norm = grid._normalizeRange ? grid._normalizeRange(range) : range;
  const startCol = grid._columnNumber(norm.start.c);
  const endCol = grid._columnNumber(norm.end.c);
  const startRow = norm.start.r;
  const endRow = norm.end.r;

  const textLines = [];
  const cellsModel = [];
  const colWidths = [];

  for (let c = startCol; c <= endCol; c++) {
    const colLbl = grid._columnLabel(c);
    colWidths.push(grid.getColumnWidth ? grid.getColumnWidth(colLbl) : 64);
  }

  let htmlTable = `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">\n`;
  htmlTable += `  <colgroup>\n`;
  for (const w of colWidths) {
    htmlTable += `    <col width="${w}" style="width:${w}px;">\n`;
  }
  htmlTable += `  </colgroup>\n`;

  // Theo dõi các ô đã bị ô gộp chiếm để bỏ qua trong HTML bảng
  const coveredSet = new Set();

  for (let r = startRow; r <= endRow; r++) {
    const rowHeight = grid.getRowHeight ? grid.getRowHeight(r) : 20;
    htmlTable += `  <tr height="${rowHeight}" style="height:${rowHeight}px;">\n`;

    const textRow = [];
    const modelRow = [];

    for (let c = startCol; c <= endCol; c++) {
      const colLbl = grid._columnLabel(c);
      const coordKey = `${colLbl}${r}`;
      const item = grid.cellsData?.get(coordKey) || { val: "", formula: "", style: {} };
      modelRow.push(structuredClone(item));

      // Tính toán text hiển thị cho TSV và nội dung bảng
      const displayStr = getSheetCellDisplayText(item);
      textRow.push(displayStr);

      if (coveredSet.has(coordKey)) {
        continue;
      }

      // Kiểm tra ô gộp
      let colSpan = 1;
      let rowSpan = 1;
      const merged = grid.getMergedRangeForCell ? grid.getMergedRangeForCell(colLbl, r) : null;
      if (merged) {
        if (merged.start.c === colLbl && merged.start.r === r) {
          const mEndCol = Math.min(endCol, grid._columnNumber(merged.end.c));
          const mEndRow = Math.min(endRow, merged.end.r);
          colSpan = mEndCol - startCol + 1;
          rowSpan = mEndRow - startRow + 1;

          for (let mr = r; mr <= mEndRow; mr++) {
            for (let mc = c; mc <= mEndCol; mc++) {
              if (mr !== r || mc !== c) {
                coveredSet.add(`${grid._columnLabel(mc)}${mr}`);
              }
            }
          }
        } else {
          continue;
        }
      }

      // Tạo inline styles
      const styles = [];
      const st = item.style || {};

      if (isCellBold(item)) styles.push("font-weight:bold");
      if (st.fontStyle === "italic") styles.push("font-style:italic");
      if (st.textDecoration?.includes("underline")) styles.push("text-decoration:underline");
      if (st.color) styles.push(`color:${st.color}`);
      if (st.backgroundColor) styles.push(`background-color:${st.backgroundColor}`);
      if (st.textAlign) styles.push(`text-align:${st.textAlign}`);
      else if (typeof item.val === "number") styles.push("text-align:right");

      if (st.border) styles.push(`border:${st.border}`);
      else {
        if (st.borderTop) styles.push(`border-top:${st.borderTop}`);
        if (st.borderRight) styles.push(`border-right:${st.borderRight}`);
        if (st.borderBottom) styles.push(`border-bottom:${st.borderBottom}`);
        if (st.borderLeft) styles.push(`border-left:${st.borderLeft}`);
      }

      // mso-number-format cho Excel
      let msoFormat = "";
      if (st.numberFormat) {
        const cat = st.numberFormat.category;
        const decimals = st.numberFormat.decimals !== undefined ? Number(st.numberFormat.decimals) : 2;
        const decStr = decimals > 0 ? "." + "0".repeat(decimals) : "";
        if (cat === "percentage") msoFormat = `0${decStr}%`;
        else if (cat === "date") msoFormat = st.numberFormat.dateFormat || "dd/mm/yyyy";
        else if (cat === "currency") msoFormat = `"$"#,##0${decStr};("$"#,##0${decStr});"-"`;
        else if (cat === "number") {
          msoFormat = st.numberFormat.useThousands ? `#,##0${decStr}` : `0${decStr}`;
        }
        else if (cat === "text") msoFormat = "\\@";
      }
      if (msoFormat) styles.push(`mso-number-format:'${msoFormat}'`);

      const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
      const spanAttrs = [];
      if (colSpan > 1) spanAttrs.push(`colspan="${colSpan}"`);
      if (rowSpan > 1) spanAttrs.push(`rowspan="${rowSpan}"`);

      // Excel data attributes
      if (typeof item.val === "number") spanAttrs.push(`x:num="${item.val}"`);
      if (item.formula) spanAttrs.push(`x:f="${item.formula}"`);

      const escapedContent = String(displayStr)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      htmlTable += `    <td${spanAttrs.length ? " " + spanAttrs.join(" ") : ""}${styleAttr}>${escapedContent}</td>\n`;
    }

    htmlTable += `  </tr>\n`;
    textLines.push(textRow.join("\t"));
    cellsModel.push(modelRow);
  }

  htmlTable += `</table>`;

  const text = textLines.join("\n");
  const model = {
    range: structuredClone(norm),
    cells: cellsModel,
    colWidths
  };

  return { html: htmlTable, text, model };
}

// =============================================================================
// PHẦN 3: 3T DOC — BẢO TOÀN ĐỊNH DẠNG & LỌC MÃ RÁC TỪ MICROSOFT WORD
// =============================================================================

/**
 * Danh sách thuộc tính CSS chuẩn được phép giữ lại khi làm sạch HTML từ Word.
 */
const ALLOWED_CSS_PROPERTIES = new Set([
  "font-weight",
  "font-style",
  "text-decoration",
  "font-size",
  "font-family",
  "color",
  "background-color",
  "background",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-collapse",
  "border-spacing",
  "text-align",
  "line-height",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "width",
  "height",
  "vertical-align"
]);

/**
 * Làm sạch chuỗi style CSS, loại bỏ toàn bộ mso-* và tab-stops mà giữ nguyên định dạng hiển thị.
 * @param {string} styleAttr
 * @returns {string}
 */
export function cleanCssStyleString(styleAttr) {
  if (!styleAttr) return "";
  const decls = parseCssDeclarations(styleAttr);
  const cleaned = [];

  for (const [prop, val] of Object.entries(decls)) {
    // Bỏ thuộc tính mso-*, -ms-*, tab-stops, v:*, o:*
    if (
      prop.startsWith("mso-") ||
      prop.startsWith("-ms-") ||
      prop.startsWith("tab-") ||
      prop.startsWith("v:") ||
      prop.startsWith("o:")
    ) {
      continue;
    }
    // Giữ thuộc tính CSS chuẩn hợp lệ
    if (ALLOWED_CSS_PROPERTIES.has(prop)) {
      // Dấu " trong giá trị (font-family:"Times New Roman") sẽ phá thuộc tính style="..." => đổi sang nháy đơn.
      cleaned.push(`${prop}:${String(val).replace(/"/g, "'")}`);
    }
  }

  return cleaned.join(";");
}

/**
 * Làm sạch mã HTML sao chép từ Microsoft Word (mso-* styles, conditional comments,
 * thẻ o:p, w:*) mà bảo toàn toàn bộ định dạng nhìn thấy: headings, bold/italic/underline,
 * cỡ chữ, màu sắc, danh sách (bullets & numbering), bảng biểu và liên kết.
 * @param {string} html
 * @returns {string}
 */
export function cleanWordHtml(html) {
  if (!html || typeof html !== "string") return "";

  let cleaned = html;

  // 0. An toàn: không để mã chủ động lọt vào tài liệu (script, iframe, onXxx=, javascript:)
  cleaned = cleaned.replace(/<(script|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "");
  cleaned = cleaned.replace(/<(script|iframe|object|embed)\b[^>]*\/?>/gi, "");
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  cleaned = cleaned.replace(/(\s(?:href|src)\s*=\s*["'])\s*(?:javascript|vbscript):[^"']*/gi, "$1#");

  // 1. Loại bỏ các khối chú thích có điều kiện của Microsoft (<!--[if ...]>...<![endif]-->)
  cleaned = cleaned.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "");
  // 1b. Dạng "downlevel-revealed" của Word: <![if !supportLists]> ... <![endif]> (không phải chú thích) — bỏ thẻ, giữ nội dung
  cleaned = cleaned.replace(/<!\[(?:if\b[^\]]*|endif)\]>/gi, "");

  // 2. Loại bỏ các khối meta XML, Office Document Settings, VML shapes
  cleaned = cleaned.replace(/<xml[\s\S]*?<\/xml>/gi, "");
  cleaned = cleaned.replace(/<\/?(w:[a-z0-9_-]+|o:[a-z0-9_-]+|m:[a-z0-9_-]+|v:[a-z0-9_-]+)[^>]*>/gi, "");

  // 3. Loại bỏ thẻ <o:p>...</o:p> rác của Word
  cleaned = cleaned.replace(/<o:p>[\s\S]*?<\/o:p>/gi, "");
  cleaned = cleaned.replace(/<\/?o:p[^>]*>/gi, "");

  // 4. Chuẩn hóa danh sách Word (p.MsoListParagraph hoặc mso-list) thành <ul>/<li> hoặc <ol>/<li>
  cleaned = convertMsoListsToHtmlLists(cleaned);

  // 5. Chuẩn hóa tiêu đề Word (p.MsoHeading1 -> h1...)
  cleaned = cleaned.replace(/<p\b[^>]*class=["']?[^"'>]*\bMsoHeading1\b[^"'>]*["']?[^>]*>([\s\S]*?)<\/p>/gi, "<h1>$1</h1>");
  cleaned = cleaned.replace(/<p\b[^>]*class=["']?[^"'>]*\bMsoHeading2\b[^"'>]*["']?[^>]*>([\s\S]*?)<\/p>/gi, "<h2>$1</h2>");
  cleaned = cleaned.replace(/<p\b[^>]*class=["']?[^"'>]*\bMsoHeading3\b[^"'>]*["']?[^>]*>([\s\S]*?)<\/p>/gi, "<h3>$1</h3>");

  // 6. Làm sạch thuộc tính style trên toàn bộ các thẻ HTML
  cleaned = cleaned.replace(/\sstyle=(["'])([\s\S]*?)\1/gi, (_, quote, css) => {
    const cleanCss = cleanCssStyleString(css);
    return cleanCss ? ` style="${cleanCss}"` : "";
  });

  // 7. Loại bỏ các class của Microsoft Word (MsoNormal, MsoTableGrid, MsoListParagraph...)
  cleaned = cleaned.replace(/\sclass=(["'])[^"']*\bMso[a-zA-Z0-9_-]+\b[^"']*\1/gi, "");

  // 8. Dọn dẹp khoảng trắng thừa và thẻ trống vô nghĩa
  cleaned = cleaned.replace(/<span\s*>([\s\S]*?)<\/span>/gi, "$1");

  return cleaned.trim();
}

/**
 * Nhận diện các đoạn MsoListParagraph liên tiếp và gom nhóm thành <ul><li> hoặc <ol><li> chuẩn.
 * @param {string} html
 * @returns {string}
 */
export function convertMsoListsToHtmlLists(html) {
  if (!html) return "";

  // Tìm các đoạn <p ...class="MsoListParagraph"...>...</p> hoặc có mso-list
  const listParaRegex = /<p\b([^>]*(?:MsoListParagraph|mso-list)[^>]*)>([\s\S]*?)<\/p>/gi;

  // Gỡ cả <span style="mso-list:Ignore">…</span> kể cả khi bên trong còn span lồng nhau (Word chèn span font 7pt chứa dấu cách)
  const removeIgnoredMarker = (source) => {
    const open = /<span\b[^>]*mso-list:\s*Ignore[^>]*>/i.exec(source);
    if (!open) return { content: source, marker: "" };
    let depth = 1;
    const tagRe = /<(\/?)span\b[^>]*>/gi;
    tagRe.lastIndex = open.index + open[0].length;
    let match;
    while ((match = tagRe.exec(source))) {
      depth += match[1] ? -1 : 1;
      if (depth === 0) {
        const markerHtml = source.slice(open.index + open[0].length, match.index);
        return { content: source.slice(0, open.index) + source.slice(match.index + match[0].length), marker: stripHtmlTags(markerHtml).replace(/&nbsp;| /g, " ").trim() };
      }
    }
    return { content: source, marker: "" };
  };

  return html.replace(listParaRegex, (match, pAttrs, rawContent) => {
    const { content, marker } = removeIgnoredMarker(rawContent);
    // Xác định xem đây là bullet (unordered) hay numbering (ordered): nhìn dấu đầu dòng Word đã chèn (1. a) i. hay •)
    const isNumbered = /^(?:\d+|[a-zA-Z]|[ivxIVX]+)[.)]$/.test(marker)
      || (!marker && /^\s*(?:\d+|[a-zA-Z]|[ivxIVX]+)[.)]\s+/.test(stripHtmlTags(content)));

    // Bỏ phần còn lại của dấu đầu dòng Word
    const cleanedContent = content
      // Bỏ span bullet của Word (font Symbol/Wingdings chứa · • o §)
      .replace(/<span[^>]*font-family\s*:\s*['"]?(Symbol|Wingdings)['"]?[^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/^[\s·•§\-*]+\s*/, "")
      .replace(/^\s*(?:\d+|[a-zA-Z]|[ivxIVX]+)[\.\)]\s*/, "");

    const tag = isNumbered ? "ol" : "ul";
    return `<${tag} data-vno-mso-list="1"><li>${cleanedContent}</li></${tag}>`;
  }).replace(/<\/(ul|ol)>\s*<\1\b[^>]*data-vno-mso-list="1"[^>]*>/gi, "\n");
}

/**
 * Trích xuất văn bản có cấu trúc từ DOM: bảng thành các hàng/cột tab-separated (\t, \n),
 * các đoạn văn ngăn cách bằng dòng mới.
 * @param {HTMLElement|DocumentFragment} root
 * @returns {string}
 */
export function extractStructuredTextFromDom(root) {
  if (!root) return "";
  if (typeof document === "undefined") {
    return String(root.textContent || "").trim();
  }

  // Nếu chứa bảng biểu: trích xuất theo định dạng TSV chuẩn Office
  const tables = root.querySelectorAll ? root.querySelectorAll("table") : [];
  if (tables.length > 0) {
    const tableTexts = [];
    tables.forEach(tbl => {
      const rows = tbl.querySelectorAll("tr");
      const rowTexts = [];
      rows.forEach(tr => {
        const cells = tr.querySelectorAll("th, td");
        const cellTexts = [];
        cells.forEach(td => {
          cellTexts.push((td.textContent || "").trim());
        });
        if (cellTexts.length > 0) {
          rowTexts.push(cellTexts.join("\t"));
        }
      });
      if (rowTexts.length > 0) {
        tableTexts.push(rowTexts.join("\n"));
      }
    });
    return tableTexts.join("\n");
  }

  // Xử lý các khối đoạn văn p, div, li
  if (root.querySelectorAll) {
    const blocks = root.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li");
    if (blocks.length > 0) {
      const lines = [];
      blocks.forEach(b => {
        const t = (b.textContent || "").trim();
        if (t) lines.push(t);
      });
      if (lines.length > 0) return lines.join("\n");
    }
  }

  return (root.textContent || "").trim();
}

/**
 * Đóng gói vùng chọn hoặc toàn bộ nội dung 3T Doc thành HTML chuẩn để dán sang Microsoft Word,
 * 3T Sheet và 3T Slide. Bảo toàn thẻ <table> và trích xuất text/plain dạng TSV chuẩn.
 * @param {Range|null} selectionRange
 * @param {HTMLElement} bodyDom
 * @returns {{ html: string, text: string }}
 */
export function serializeWriterSelectionToClipboard(selectionRange, bodyDom) {
  let html = "";
  let text = "";

  if (selectionRange && typeof document !== "undefined" && document.createRange) {
    const fragment = selectionRange.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(fragment);

    // Kiểm tra nếu vùng chọn chứa tr/td nhưng thiếu thẻ table bao bọc
    const hasTr = tempDiv.querySelector("tr");
    const hasTd = tempDiv.querySelector("td, th");
    const hasTable = tempDiv.querySelector("table");

    if ((hasTr || hasTd) && !hasTable) {
      if (hasTr) {
        tempDiv.innerHTML = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;"><tbody>${tempDiv.innerHTML}</tbody></table>`;
      } else {
        tempDiv.innerHTML = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;"><tbody><tr>${tempDiv.innerHTML}</tr></tbody></table>`;
      }
    }

    text = extractStructuredTextFromDom(tempDiv);
    html = tempDiv.innerHTML;
  } else if (bodyDom) {
    text = extractStructuredTextFromDom(bodyDom);
    html = bodyDom.innerHTML || "";
  }

  // Đảm bảo HTML bọc trong container có styles cơ bản cho Word và các app khác
  const wrappedHtml = `<div style="font-family:'Times New Roman',Calibri,serif;font-size:13pt;line-height:1.3;color:#000000;">\n${html}\n</div>`;

  return {
    html: wrappedHtml,
    text: text.trim()
  };
}
