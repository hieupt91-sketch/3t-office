/**
 * Tham chiếu có cấu trúc kiểu bảng: Table1[Cột], Table1[[#All],[Cột]], Table1[@Cột],
 * Table1[[Cột1]:[Cột2]], [@Cột] ... được đổi thành địa chỉ A1 thật trước khi tính.
 * Module thuần (không phụ thuộc DOM) để kiểm thử bằng Node.
 *
 * `resolver` cung cấp:
 *   byName(name) -> { name, sheet, ref:"A1:D10", hasHeaders, totals } | null
 *   at(sheet, "B5") -> bảng chứa ô đó | null
 *   headerValue(sheet, "B1") -> chuỗi tiêu đề hiện tại của ô
 */

const columnIndex = name => [...name].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
const columnName = index => {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value--;
    name = String.fromCharCode(65 + value % 26) + name;
    value = Math.floor(value / 26);
  }
  return name;
};

function parseRef(ref) {
  const match = String(ref || "").replace(/\$/g, "").match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) return null;
  return {
    startCol: columnIndex(match[1].toUpperCase()), startRow: Number(match[2]),
    endCol: columnIndex(match[3].toUpperCase()), endRow: Number(match[4])
  };
}

/** Bỏ ký tự thoát của Excel trong tên cột: '[ '] '# '' */
const unescapeColumn = text => String(text).replace(/'([\[\]#'@])/g, "$1");

/** Tìm ']' khớp với '[' tại vị trí start (hỗ trợ lồng nhau và ký tự thoát '). */
function matchingBracket(text, start) {
  let depth = 0;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (char === "'" && index + 1 < text.length) { index++; continue; }
    if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Tách nội dung ngoặc thành các mục; ngăn cách bằng ',' (mục) hoặc ':' (nối cột). */
function parseSpec(content) {
  const text = String(content).trim();
  const items = [];
  let span = false;
  if (text.startsWith("[")) {
    let index = 0;
    while (index < text.length) {
      if (text[index] === "[") {
        const end = matchingBracket(text, index);
        if (end < 0) return null;
        items.push(text.slice(index + 1, end).trim());
        index = end + 1;
      } else if (text[index] === ":") {
        span = true;
        index++;
      } else if (text[index] === "," || /\s/.test(text[index])) {
        index++;
      } else return null;
    }
    return { items, span };
  }
  return { items: [text], span: false };
}

function tableGeometry(table, resolver, sheet) {
  const bounds = parseRef(table.ref);
  if (!bounds) return null;
  const hasHeaders = table.hasHeaders !== false;
  const totals = Boolean(table.totals);
  const names = [];
  for (let col = bounds.startCol; col <= bounds.endCol; col++) {
    let name = "";
    if (hasHeaders) name = String(resolver.headerValue?.(sheet, `${columnName(col)}${bounds.startRow}`) ?? "");
    names.push(name || `Column${col - bounds.startCol + 1}`);
  }
  return {
    ...bounds,
    names,
    headerRow: hasHeaders ? bounds.startRow : null,
    totalsRow: totals ? bounds.endRow : null,
    dataStart: bounds.startRow + (hasHeaders ? 1 : 0),
    dataEnd: bounds.endRow - (totals ? 1 : 0)
  };
}

/**
 * Đổi một tham chiếu cấu trúc thành địa chỉ A1; trả null nếu không nhận ra (để giữ nguyên văn bản).
 * `error` được trả khi nhận ra bảng nhưng cột/khu vực sai (#REF!).
 */
export function resolveStructuredReference(tableName, content, context, resolver, options = {}) {
  const formulaSheet = context?.sheet || "";
  const coord = String(context?.coord || "").toUpperCase();
  const spec = parseSpec(content);
  if (!spec || !spec.items.length) return null;

  let table = null;
  if (tableName) table = resolver.byName?.(tableName) || null;
  else if (coord) table = resolver.at?.(formulaSheet, coord) || null;
  if (!table) return null;
  const sheet = table.sheet || formulaSheet;
  const geometry = tableGeometry(table, resolver, sheet);
  if (!geometry) return null;

  const areas = new Set();
  const columns = [];
  for (const rawItem of spec.items) {
    let item = rawItem;
    if (item.startsWith("@")) {
      areas.add("thisRow");
      item = item.slice(1).trim();
      if (item.startsWith("[") && item.endsWith("]")) item = item.slice(1, -1);
      if (!item) continue;
    }
    const lower = item.toLowerCase();
    if (lower === "#all") areas.add("all");
    else if (lower === "#data") areas.add("data");
    else if (lower === "#headers") areas.add("headers");
    else if (lower === "#totals") areas.add("totals");
    else if (lower === "#this row") areas.add("thisRow");
    else if (item) columns.push(unescapeColumn(item));
  }

  // Cột
  let firstCol = geometry.startCol;
  let lastCol = geometry.endCol;
  if (columns.length) {
    const find = name => geometry.names.findIndex(n => n.toLowerCase() === name.toLowerCase());
    const first = find(columns[0]);
    const last = columns.length > 1 ? find(columns[columns.length - 1]) : first;
    if (first < 0 || last < 0) return { error: "#REF!" };
    firstCol = geometry.startCol + Math.min(first, last);
    lastCol = geometry.startCol + Math.max(first, last);
  }

  // Hàng
  let rowMin = Infinity;
  let rowMax = -Infinity;
  const take = (from, to) => { rowMin = Math.min(rowMin, from); rowMax = Math.max(rowMax, to); };
  if (!areas.size) areas.add("data");
  for (const area of areas) {
    if (area === "all") take(geometry.startRow, geometry.endRow);
    else if (area === "data") take(geometry.dataStart, geometry.dataEnd);
    else if (area === "headers") {
      if (geometry.headerRow === null) return { error: "#REF!" };
      take(geometry.headerRow, geometry.headerRow);
    } else if (area === "totals") {
      if (geometry.totalsRow === null) return { error: "#REF!" };
      take(geometry.totalsRow, geometry.totalsRow);
    } else if (area === "thisRow") {
      const row = Number(coord.match(/(\d+)$/)?.[1]);
      if (!row || row < geometry.dataStart || row > geometry.dataEnd) return { error: "#VALUE!" };
      take(row, row);
    }
  }
  if (!Number.isFinite(rowMin) || rowMax < rowMin) return { error: "#REF!" };

  const quoted = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(String(sheet)) ? String(sheet) : `'${String(sheet).replace(/'/g, "''")}'`;
  let prefix = sheet && sheet !== formulaSheet ? `${quoted}!` : "";
  let from = `${columnName(firstCol)}${rowMin}`;
  let to = `${columnName(lastCol)}${rowMax}`;
  if (options.mode === "unlist") {
    prefix = sheet ? `${quoted}!` : "";
    if (areas.has("thisRow")) {
      from = `$${columnName(firstCol)}${rowMin}`;
      to = `$${columnName(lastCol)}${rowMax}`;
    } else {
      from = `$${columnName(firstCol)}$${rowMin}`;
      to = `$${columnName(lastCol)}$${rowMax}`;
    }
  }
  return {
    ref: `${prefix}${from === to ? from : `${from}:${to}`}`,
    table,
    thisRow: areas.has("thisRow"),
    columns,
    span: spec.span,
    onlyThisRow: areas.size === 1 && areas.has("thisRow")
  };
}

/** Escape ký tự đặc biệt trong tên cột theo cú pháp tệp: ' [ ] # */
const escapeColumn = name => String(name).replace(/(['\[\]#])/g, "'$1");

/** Dạng tệp OOXML của tham chiếu có @ : Table[[#This Row],[Cột]] (tệp không chấp nhận [@Cột]). */
function fileForm(resolved) {
  if (!resolved?.thisRow || !resolved.table?.name) return null;
  const name = resolved.table.name;
  const cols = resolved.columns || [];
  if (!cols.length) return `${name}[[#This Row]]`;
  const first = `[${escapeColumn(cols[0])}]`;
  if (cols.length > 1 && resolved.span) return `${name}[[#This Row],${first}:[${escapeColumn(cols[cols.length - 1])}]]`;
  return `${name}[[#This Row],${first}]`;
}

/** Thay mọi tham chiếu cấu trúc trong biểu thức công thức; bỏ qua chuỗi "..." và tên sheet '...'. */
export function expandStructuredReferences(expression, context, resolver, options = {}) {
  const text = String(expression);
  if (!resolver || !text.includes("[")) return text;
  let output = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === '"') {
          if (text[end + 1] === '"') { end += 2; continue; }
          break;
        }
        end++;
      }
      output += text.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    if (char === "'") {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "'") {
          if (text[end + 1] === "'") { end += 2; continue; }
          break;
        }
        end++;
      }
      output += text.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    if (char === "[") {
      // Tên bảng đứng ngay trước dấu '[' (đã được copy vào output): lấy lại.
      const nameMatch = output.match(/([A-Za-z_\\][A-Za-z0-9_.\\]*)$/);
      const tableName = nameMatch ? nameMatch[1] : "";
      const end = matchingBracket(text, index);
      if (end < 0) { output += text.slice(index); break; }
      const resolved = resolveStructuredReference(tableName, text.slice(index + 1, end), context, resolver, options);
      if (options.mode === "file") {
        // Chỉ chuẩn hóa dạng có @ về dạng tệp; mọi dạng khác giữ nguyên văn bản người dùng nhập.
        const canonical = fileForm(resolved);
        if (canonical) output = output.slice(0, output.length - tableName.length) + canonical;
        else output += text.slice(index, end + 1);
        index = end + 1;
        continue;
      }
      if (resolved?.ref) {
        output = output.slice(0, output.length - tableName.length) + resolved.ref;
        index = end + 1;
        continue;
      }
      if (resolved?.error) {
        output = output.slice(0, output.length - tableName.length) + resolved.error;
        index = end + 1;
        continue;
      }
      output += text.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    output += char;
    index++;
  }
  return output;
}

/**
 * Công thức có chứa tham chiếu cấu trúc Tên[...] / [@...] / [#...] / [[...]] (bỏ qua chuỗi "..." và tên trang '...').
 * Liên kết sổ khác dạng [1]Sheet!A1, [Book.xlsx]Sheet!A1 KHÔNG phải tham chiếu cấu trúc.
 */
export function hasStructuredReference(formula) {
  let text = String(formula || "")
    .replace(/"(?:""|[^"])*"/g, '""')
    .replace(/'(?:(?:[A-Za-z]:\\[^'\[\]]*\\|\\\\\w+\\[^'\[\]]+\\|[A-Za-z0-9_/.-]+[\\/]))?\[[^\]]+\][^'\[\]]*'\s*!/g, "''!")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/(?:^|[^'A-Za-z0-9_.\\])\[[^\]]+\][A-Za-z0-9_.\u0080-\uFFFF]*\s*!/g, " !");
  return /(?:^|[^A-Za-z0-9_.\]'])[A-Za-z_\\][A-Za-z0-9_.\\]*\[(?!\d+\])/.test(text) || /(?:^|[^A-Za-z0-9_.\]'])\[(?!\d+\])[^\]]+\]/.test(text);
}

/**
 * Đổi tên bảng trong các tham chiếu cấu trúc của công thức: OldTable[...] -> NewTable[...]
 */
export function renameTableInStructuredReferences(formula, oldTableName, newTableName) {
  if (!formula || typeof formula !== "string" || !oldTableName || !newTableName) return formula;
  const oldEscaped = String(oldTableName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^A-Za-z0-9_.\\\\])${oldEscaped}(\\s*\\[)`, "gi");
  return formula.replace(regex, `$1${newTableName}$2`);
}

/**
 * Đổi tên cột trong các tham chiếu cấu trúc của công thức:
 * TableName[OldCol] -> TableName[NewCol]
 * Nếu isSameTable: [@OldCol] -> [@NewCol], [OldCol] -> [NewCol]
 */
export function renameColumnInStructuredReferences(formula, tableName, oldColName, newColName, isSameTable = false) {
  const text = String(formula || "");
  if (!text.includes("[") || !oldColName || !newColName) return text;
  const tableLower = (tableName || "").toLowerCase();

  const replaceCol = content => {
    const oldEscaped = String(oldColName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[@#\\s,:\\[])(${oldEscaped})([\\s,:\\]]|$)`, "gi");
    return content.replace(regex, `$1${newColName}$3`);
  };

  let output = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === '"') {
          if (text[end + 1] === '"') { end += 2; continue; }
          break;
        }
        end++;
      }
      output += text.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    if (char === "'") {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "'") {
          if (text[end + 1] === "'") { end += 2; continue; }
          break;
        }
        end++;
      }
      output += text.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    if (char === "[") {
      const nameMatch = output.match(/([A-Za-z_\\][A-Za-z0-9_.\\]*)$/);
      const matchedTableName = nameMatch ? nameMatch[1] : "";
      const end = matchingBracket(text, index);
      if (end < 0) { output += text.slice(index); break; }

      const rawInner = text.slice(index + 1, end);
      const isTargetTable = matchedTableName && matchedTableName.toLowerCase() === tableLower;
      const isContextTable = !matchedTableName && isSameTable;

      if (isTargetTable || isContextTable) {
        const updatedInner = replaceCol(rawInner);
        output += `[${updatedInner}]`;
      } else {
        output += text.slice(index, end + 1);
      }
      index = end + 1;
      continue;
    }
    output += char;
    index++;
  }
  return output;
}
