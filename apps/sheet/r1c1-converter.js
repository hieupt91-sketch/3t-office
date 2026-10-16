/**
 * VN Sheet — R1C1 & A1 Reference Style Converter
 *
 * Chuyển đổi hai chiều giữa kiểu tham chiếu A1 chuẩn và kiểu tham chiếu hàng/cột R1C1
 * tương thích 100% với đặc tả bảng tính.
 */

export function colLetterToNumber(col) {
  let num = 0;
  const str = String(col || "").toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      num = num * 26 + (code - 64);
    }
  }
  return num;
}

export function colNumberToLetter(num) {
  let s = "";
  let n = Math.floor(Number(num) || 0);
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s || "A";
}

export function normalizeCoord(coord) {
  if (typeof coord === "object" && coord !== null) {
    const rawC = coord.c !== undefined ? coord.c : coord.col;
    const rawR = coord.r !== undefined ? coord.r : coord.row;
    const c = typeof rawC === "number" ? colNumberToLetter(rawC) : String(rawC || "A").toUpperCase();
    const r = Number(rawR || 1);
    return { c, r, colNum: colLetterToNumber(c) };
  }
  const match = String(coord || "A1").toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (match) {
    return { c: match[1], r: Number(match[2]), colNum: colLetterToNumber(match[1]) };
  }
  return { c: "A", r: 1, colNum: 1 };
}

/**
 * Chuyển đổi công thức từ kiểu tham chiếu A1 sang R1C1 tương đối với ô cơ sở (baseCoord).
 * @param {string} formula Công thức dạng A1 (ví dụ: "=A1+C3" hoặc "=SUM($A$1:$B$2)")
 * @param {string|{c:string, r:number}} baseCoord Tọa độ ô hiện tại (ví dụ: "B2" hoặc {c:"B", r:2})
 * @returns {string} Công thức dạng R1C1
 */
export function a1ToR1C1(formula, baseCoord) {
  if (!formula || typeof formula !== "string") return formula;
  const base = normalizeCoord(baseCoord);
  const baseRow = base.r;
  const baseCol = base.colNum;

  // Tách chuỗi ký tự trong dấu ngoặc kép để tránh biến đổi văn bản bên trong chuỗi
  const stringLiterals = [];
  const placeholderPrefix = "__VNO_STR_";
  const formulaWithoutStrings = formula.replace(/"(?:[^"]|"")*"/g, (match) => {
    const idx = stringLiterals.length;
    stringLiterals.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  // Chuyển đổi tham chiếu ô: Sheet1!$A$1, $A$1, A1, A$1, $A1
  const cellRefRegex = /((?:'(?:[^']|'')+'|[A-Za-z0-9_.\s]+)!)?(\$?)([A-Z]+)(\$?)(\d+)\b/gi;

  const converted = formulaWithoutStrings.replace(cellRefRegex, (match, sheet, absCol, colStr, absRow, rowStr, offset, fullStr) => {
    const prevChar = offset > 0 ? fullStr[offset - 1] : "";
    if (/[A-Za-z0-9_]/.test(prevChar)) {
      return match;
    }

    const colNum = colLetterToNumber(colStr);
    const rowNum = Number(rowStr);
    if (colNum < 1 || colNum > 16384 || rowNum < 1 || rowNum > 1048576) {
      return match;
    }

    let rPart = "";
    if (absRow === "$") {
      rPart = `R${rowNum}`;
    } else {
      const rowOffset = rowNum - baseRow;
      rPart = rowOffset === 0 ? "R" : `R[${rowOffset}]`;
    }

    let cPart = "";
    if (absCol === "$") {
      cPart = `C${colNum}`;
    } else {
      const colOffset = colNum - baseCol;
      cPart = colOffset === 0 ? "C" : `C[${colOffset}]`;
    }

    return `${sheet || ""}${rPart}${cPart}`;
  });

  // Khôi phục chuỗi ký tự ban đầu
  return converted.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, "g"), (_, idx) => {
    return stringLiterals[Number(idx)];
  });
}

/**
 * Chuyển đổi công thức từ kiểu tham chiếu R1C1 sang A1 tương đối với ô cơ sở (baseCoord).
 * @param {string} formula Công thức dạng R1C1 (ví dụ: "=R[-1]C[-1]+R[1]C[1]")
 * @param {string|{c:string, r:number}} baseCoord Tọa độ ô hiện tại (ví dụ: "B2" hoặc {c:"B", r:2})
 * @returns {string} Công thức dạng A1
 */
export function r1c1ToA1(formula, baseCoord) {
  if (!formula || typeof formula !== "string") return formula;
  const base = normalizeCoord(baseCoord);
  const baseRow = base.r;
  const baseCol = base.colNum;

  // Tách chuỗi ký tự trong dấu ngoặc kép
  const stringLiterals = [];
  const placeholderPrefix = "__VNO_STR_";
  const formulaWithoutStrings = formula.replace(/"(?:[^"]|"")*"/g, (match) => {
    const idx = stringLiterals.length;
    stringLiterals.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  // Pattern R1C1 với non-capturing group:
  // Group 1: sheet
  // Group 2: rRel (khi có [offset])
  // Group 3: rAbs (khi là số tuyệt đối)
  // Group 4: cRel (khi có [offset])
  // Group 5: cAbs (khi là số tuyệt đối)
  const r1c1Regex = /((?:'(?:[^']|'')+'|[A-Za-z0-9_.\s]+)!)?R(?:\[([+-]?\d+)\]|(\d+))?C(?:\[([+-]?\d+)\]|(\d+))?(?![A-Za-z0-9_])/gi;

  const converted = formulaWithoutStrings.replace(r1c1Regex, (match, sheet, rRel, rAbs, cRel, cAbs, offset, fullStr) => {
    const prevChar = offset > 0 ? fullStr[offset - 1] : "";
    if (/[A-Za-z0-9_]/.test(prevChar)) {
      return match;
    }

    let targetRow = 0;
    let isRowAbs = false;
    if (rAbs !== undefined && rAbs !== "") {
      targetRow = Number(rAbs);
      isRowAbs = true;
    } else if (rRel !== undefined && rRel !== "") {
      targetRow = baseRow + Number(rRel);
    } else {
      targetRow = baseRow;
    }

    let targetCol = 0;
    let isColAbs = false;
    if (cAbs !== undefined && cAbs !== "") {
      targetCol = Number(cAbs);
      isColAbs = true;
    } else if (cRel !== undefined && cRel !== "") {
      targetCol = baseCol + Number(cRel);
    } else {
      targetCol = baseCol;
    }

    if (targetRow < 1 || targetRow > 1048576 || targetCol < 1 || targetCol > 16384) {
      return "#REF!";
    }

    const colLetter = colNumberToLetter(targetCol);
    const colStr = (isColAbs ? "$" : "") + colLetter;
    const rowStr = (isRowAbs ? "$" : "") + targetRow;

    return `${sheet || ""}${colStr}${rowStr}`;
  });

  return converted.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, "g"), (_, idx) => {
    return stringLiterals[Number(idx)];
  });
}

/**
 * Kiểm tra xem công thức có chứa tham chiếu kiểu R1C1 hay không.
 */
export function isR1C1Formula(text) {
  if (!text || typeof text !== "string") return false;
  return /\bR(?:\[[+-]?\d+\]|\d+)?C(?:\[[+-]?\d+\]|\d+)?(?![A-Za-z0-9_])/i.test(text);
}

/**
 * Chuyển đổi một địa chỉ ô đơn tuyệt đối giữa A1 và R1C1.
 * Ví dụ: "B2" -> "R2C2", "R2C2" -> "B2"
 */
export function formatAddressAsR1C1(address) {
  const str = String(address || "").trim().toUpperCase();
  if (str.includes(":")) {
    const [start, end] = str.split(":");
    if (/^\d+$/.test(start) && /^\d+$/.test(end)) {
      return `R${start}:R${end}`;
    }
    if (/^[A-Z]+$/.test(start) && /^[A-Z]+$/.test(end)) {
      return `C${colLetterToNumber(start)}:C${colLetterToNumber(end)}`;
    }
    const sNorm = normalizeCoord(start);
    const eNorm = normalizeCoord(end);
    return `R${sNorm.r}C${sNorm.colNum}:R${eNorm.r}C${eNorm.colNum}`;
  }
  if (/^\d+$/.test(str)) {
    return `R${str}`;
  }
  if (/^[A-Z]+$/.test(str)) {
    return `C${colLetterToNumber(str)}`;
  }
  const norm = normalizeCoord(address);
  return `R${norm.r}C${norm.colNum}`;
}

export function parseR1C1Address(r1c1Address) {
  const str = String(r1c1Address || "").trim().toUpperCase();
  if (str.includes(":")) {
    const [startStr, endStr] = str.split(":");
    const start = parseR1C1Address(startStr);
    const end = parseR1C1Address(endStr);
    if (!start || !end) return null;
    return { start, end };
  }
  const match = str.match(/^R(\d+)C(\d+)$/);
  if (!match) return null;
  const r = Number(match[1]);
  const cNum = Number(match[2]);
  if (r < 1 || r > 1048576 || cNum < 1 || cNum > 16384) return null;
  return { c: colNumberToLetter(cNum), r };
}
