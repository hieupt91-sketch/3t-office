/**
 * Điều chỉnh tham chiếu ô trong công thức (EXCEL-E2).
 *
 * - shiftFormulaRefs(): khi CHÈN/XÓA hàng/cột — chỉ đổi tham chiếu trỏ tới trang bị tác động, vùng co giãn đúng như Excel,
 *   ô/vùng bị xóa hết thành #REF!.
 * - translateFormulaRefs(): khi SAO CHÉP/ĐIỀN/SẮP XẾP — các thành phần tương đối dịch theo (dòng, cột), thành phần tuyệt đối ($) giữ nguyên.
 *
 * Bỏ qua chuỗi "...", nội dung trong [..] (tham chiếu bảng) và tên hàm kiểu LOG10( .
 */

const REF_PATTERN = new RegExp(
  "(?<![A-Za-z0-9_.$'!:\\u00C0-\\u1EF9])" +
  "(?:(?:'((?:[^']|'')+)'|([A-Za-z_\\u00C0-\\u1EF9][A-Za-z0-9_.\\u00C0-\\u1EF9]*))!)?" +
  "(\\$?[A-Za-z]{1,3}\\$?\\d+(?::\\$?[A-Za-z]{1,3}\\$?\\d+)?|\\$?[A-Za-z]{1,3}:\\$?[A-Za-z]{1,3}|\\$?\\d+:\\$?\\d+)" +
  "(?![A-Za-z0-9_(.!:\\u00C0-\\u1EF9])",
  "g"
);

const colNumber = label => [...label.toUpperCase()].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
const colLabel = number => {
  let value = number; let label = "";
  while (value > 0) { value--; label = String.fromCharCode(65 + (value % 26)) + label; value = Math.floor(value / 26); }
  return label;
};

/** Gọi `fn` cho từng tham chiếu ngoài chuỗi và ngoài ngoặc vuông. fn trả về chuỗi thay thế (hoặc undefined = giữ nguyên). */
function mapReferences(formula, fn) {
  return String(formula).split(/("(?:""|[^"])*")/).map((segment, index) => {
    if (index % 2 === 1) return segment;
    return segment.split(/(\[(?:[^\[\]]|\[[^\[\]]*\])*\])/).map((part, partIndex) => {
      if (partIndex % 2 === 1) return part;
      return part.replace(REF_PATTERN, (match, quoted, plain, body) => {
        const prefixLength = match.length - body.length;
        const prefix = match.slice(0, prefixLength);
        const sheet = quoted !== undefined ? quoted.replace(/''/g, "'") : plain;
        const replaced = fn({ match, prefix, body, sheet });
        return replaced === undefined ? match : replaced;
      });
    }).join("");
  }).join("");
}

/** Phân tích phần thân tham chiếu thành các thành phần có dấu $ để dịch chuyển. */
function parseBody(body) {
  let m = body.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?::(\$?)([A-Za-z]{1,3})(\$?)(\d+))?$/);
  if (m) {
    const first = { colAbs: m[1], col: colNumber(m[2]), rowAbs: m[3], row: Number(m[4]) };
    const second = m[6] ? { colAbs: m[5], col: colNumber(m[6]), rowAbs: m[7], row: Number(m[8]) } : null;
    return { kind: "cells", first, second };
  }
  m = body.match(/^(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})$/);
  if (m) return { kind: "cols", first: { abs: m[1], n: colNumber(m[2]) }, second: { abs: m[3], n: colNumber(m[4]) } };
  m = body.match(/^(\$?)(\d+):(\$?)(\d+)$/);
  if (m) return { kind: "rows", first: { abs: m[1], n: Number(m[2]) }, second: { abs: m[3], n: Number(m[4]) } };
  return null;
}

function formatBody(parsed) {
  if (parsed.kind === "cells") {
    const f = parsed.first; const s = parsed.second;
    const one = c => `${c.colAbs}${colLabel(c.col)}${c.rowAbs}${c.row}`;
    return s ? `${one(f)}:${one(s)}` : one(f);
  }
  if (parsed.kind === "cols") return `${parsed.first.abs}${colLabel(parsed.first.n)}:${parsed.second.abs}${colLabel(parsed.second.n)}`;
  return `${parsed.first.abs}${parsed.first.n}:${parsed.second.abs}${parsed.second.n}`;
}

/** Chỉ số đơn lẻ khi chèn/xóa. Trả về số mới hoặc null nếu bị xóa. */
function singleIndex(n, at, delta) {
  if (delta > 0) return n >= at ? n + delta : n;
  const removed = -delta;
  if (n >= at && n < at + removed) return null;
  return n >= at + removed ? n + delta : n;
}

/** Hai đầu vùng khi chèn/xóa: vùng co/giãn như Excel. Trả về null nếu cả vùng bị xóa. */
function rangeIndexes(a, b, at, delta) {
  const low = Math.min(a, b); const high = Math.max(a, b);
  if (delta > 0) {
    if (low >= at) return [a + delta, b + delta];
    if (high >= at) return a <= b ? [a, b + delta] : [a + delta, b];
    return [a, b];
  }
  const removed = -delta;
  const removedEnd = at + removed - 1;
  if (low >= at && high <= removedEnd) return null;
  const mapLow = value => (value > removedEnd ? value + delta : (value >= at ? at : value));
  const mapHigh = value => (value > removedEnd ? value + delta : (value >= at ? at - 1 : value));
  const nLow = mapLow(low); const nHigh = mapHigh(high);
  return a <= b ? [nLow, nHigh] : [nHigh, nLow];
}

/**
 * Cập nhật công thức sau khi chèn (delta > 0) hoặc xóa (delta < 0) `|delta|` hàng/cột tại vị trí `at` của trang `targetSheet`.
 * ownerSheet = trang chứa công thức (tham chiếu không ghi tên trang trỏ tới trang này).
 */
export function shiftFormulaRefs(formula, { ownerSheet, targetSheet, axis, at, delta }) {
  if (typeof formula !== "string" || formula === "") return formula;
  const target = String(targetSheet).toLowerCase();
  const owner = String(ownerSheet).toLowerCase();
  return mapReferences(formula, ({ prefix, body, sheet }) => {
    const refSheet = (sheet === undefined || sheet === "" ? owner : String(sheet).toLowerCase());
    if (refSheet !== target) return undefined;
    const parsed = parseBody(body);
    if (!parsed) return undefined;
    if (parsed.kind === "cells") {
      const f = parsed.first; const s = parsed.second;
      const key = axis === "row" ? "row" : "col";
      if (!s) {
        const next = singleIndex(f[key], at, delta);
        if (next === null) return "#REF!";
        f[key] = next;
      } else {
        const next = rangeIndexes(f[key], s[key], at, delta);
        if (next === null) return "#REF!";
        f[key] = next[0]; s[key] = next[1];
      }
      return prefix + formatBody(parsed);
    }
    if ((parsed.kind === "cols" && axis !== "col") || (parsed.kind === "rows" && axis !== "row")) return undefined;
    const next = rangeIndexes(parsed.first.n, parsed.second.n, at, delta);
    if (next === null) return "#REF!";
    parsed.first.n = next[0]; parsed.second.n = next[1];
    return prefix + formatBody(parsed);
  });
}

/** Dịch các thành phần tương đối của mọi tham chiếu (sao chép/điền/sắp xếp). Ra ngoài biên trang → #REF!. */
export function translateFormulaRefs(formula, deltaRow, deltaCol) {
  if (typeof formula !== "string" || formula === "" || (!deltaRow && !deltaCol)) return formula;
  return mapReferences(formula, ({ prefix, body }) => {
    const parsed = parseBody(body);
    if (!parsed) return undefined;
    let invalid = false;
    const shiftCell = c => {
      if (!c.colAbs) { c.col += deltaCol; if (c.col < 1 || c.col > 16384) invalid = true; }
      if (!c.rowAbs) { c.row += deltaRow; if (c.row < 1 || c.row > 1048576) invalid = true; }
    };
    if (parsed.kind === "cells") { shiftCell(parsed.first); if (parsed.second) shiftCell(parsed.second); }
    else if (parsed.kind === "cols") {
      for (const part of [parsed.first, parsed.second]) if (!part.abs) { part.n += deltaCol; if (part.n < 1 || part.n > 16384) invalid = true; }
    } else {
      for (const part of [parsed.first, parsed.second]) if (!part.abs) { part.n += deltaRow; if (part.n < 1 || part.n > 1048576) invalid = true; }
    }
    return invalid ? "#REF!" : prefix + formatBody(parsed);
  });
}

/**
 * Cắt-dán (di chuyển ô): tham chiếu tới ô nằm trong vùng bị di chuyển đi theo vùng (Excel).
 * Ô đơn nằm trong vùng → dịch; vùng nhiều ô chỉ dịch khi CẢ vùng nằm trong khối bị di chuyển. Cả $ tuyệt đối cũng đi theo.
 * range = { c1, r1, c2, r2 } (số cột 1-based).
 */
export function moveFormulaRefs(formula, { ownerSheet, targetSheet, range, deltaCol, deltaRow }) {
  if (typeof formula !== "string" || formula === "" || (!deltaCol && !deltaRow)) return formula;
  const target = String(targetSheet).toLowerCase();
  const owner = String(ownerSheet).toLowerCase();
  const inside = (col, row) => col >= range.c1 && col <= range.c2 && row >= range.r1 && row <= range.r2;
  return mapReferences(formula, ({ prefix, body, sheet }) => {
    const refSheet = (sheet === undefined || sheet === "" ? owner : String(sheet).toLowerCase());
    if (refSheet !== target) return undefined;
    const parsed = parseBody(body);
    if (!parsed || parsed.kind !== "cells") return undefined;
    const f = parsed.first; const s = parsed.second;
    if (!s) {
      if (!inside(f.col, f.row)) return undefined;
      f.col += deltaCol; f.row += deltaRow;
    } else {
      if (!inside(f.col, f.row) || !inside(s.col, s.row)) return undefined;
      f.col += deltaCol; f.row += deltaRow; s.col += deltaCol; s.row += deltaRow;
    }
    return prefix + formatBody(parsed);
  });
}

/**
 * Chuyển vị công thức (Transpose): hoán đổi trục hàng và cột của các tham chiếu tương đối (Excel).
 * sourceCol/sourceRow: tọa độ ô nguồn chứa công thức.
 * destCol/destRow: tọa độ ô đích nhận công thức sau chuyển vị.
 */
export function transposeFormulaRefs(formula, { sourceStartCol, sourceStartRow, destStartCol, destStartRow, sourceCol, sourceRow, destCol, destRow }) {
  if (typeof formula !== "string" || formula === "") return formula;
  return mapReferences(formula, ({ prefix, body }) => {
    const parsed = parseBody(body);
    if (!parsed) return undefined;
    let invalid = false;
    const transposeCell = c => {
      const colAbs = !!c.colAbs;
      const rowAbs = !!c.rowAbs;
      if (colAbs && rowAbs) {
        if (sourceStartCol != null && sourceStartRow != null && destStartCol != null && destStartRow != null) {
          const relC = c.col - sourceStartCol;
          const relR = c.row - sourceStartRow;
          c.col = destStartCol + relR;
          c.row = destStartRow + relC;
        }
        return;
      }
      if (!colAbs && !rowAbs) {
        const dCol = c.col - sourceCol;
        const dRow = c.row - sourceRow;
        c.col = destCol + dRow;
        c.row = destRow + dCol;
        if (c.col < 1 || c.col > 16384 || c.row < 1 || c.row > 1048576) invalid = true;
        return;
      }
      c.colAbs = rowAbs ? "$" : "";
      c.rowAbs = colAbs ? "$" : "";
      if (colAbs && !rowAbs) {
        const dRow = c.row - sourceRow;
        c.col = destCol + dRow;
        c.row = (sourceStartRow != null && destStartRow != null) ? destStartRow + (c.col - sourceStartCol) : c.row;
      } else {
        const dCol = c.col - sourceCol;
        c.row = destRow + dCol;
        c.col = (sourceStartCol != null && destStartCol != null) ? destStartCol + (c.row - sourceStartRow) : c.col;
      }
      if (c.col < 1 || c.col > 16384 || c.row < 1 || c.row > 1048576) invalid = true;
    };
    if (parsed.kind === "cells") {
      transposeCell(parsed.first);
      if (parsed.second) transposeCell(parsed.second);
    } else if (parsed.kind === "cols") {
      const abs1 = parsed.first.abs; const abs2 = parsed.second.abs;
      return prefix + `${abs1}${parsed.first.n}:${abs2}${parsed.second.n}`;
    } else if (parsed.kind === "rows") {
      const abs1 = parsed.first.abs; const abs2 = parsed.second.abs;
      return prefix + `${abs1}${colLabel(parsed.first.n)}:${abs2}${colLabel(parsed.second.n)}`;
    }
    return invalid ? "#REF!" : prefix + formatBody(parsed);
  });
}
