/** Pure helpers for 3T Sheet What-If Analysis. */
export class WhatIfAnalysisEngine {
  static normalizeCoord(value) {
    const coord = String(value || "").trim().replace(/\$/g, "").toUpperCase();
    if (!/^[A-Z]+[1-9]\d*$/.test(coord)) throw new Error("Địa chỉ ô không hợp lệ.");
    return coord;
  }

  static rangeCoords(range, columns) {
    const left = Math.min(columns.indexOf(range.start.c), columns.indexOf(range.end.c));
    const right = Math.max(columns.indexOf(range.start.c), columns.indexOf(range.end.c));
    const top = Math.min(range.start.r, range.end.r);
    const bottom = Math.max(range.start.r, range.end.r);
    if (left < 0 || right < 0) throw new Error("Vùng bảng dữ liệu không hợp lệ.");
    const rows = [];
    for (let row = top; row <= bottom; row++) {
      const coords = [];
      for (let col = left; col <= right; col++) coords.push(`${columns[col]}${row}`);
      rows.push(coords);
    }
    return rows;
  }

  static colToIdx(col) {
    let idx = 0;
    const s = String(col || "").trim().replace(/\$/g, "").toUpperCase();
    for (let i = 0; i < s.length; i++) {
      idx = idx * 26 + (s.charCodeAt(i) - 64);
    }
    return idx - 1;
  }

  static idxToCol(idx) {
    let col = "";
    let n = idx + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      col = String.fromCharCode(65 + rem) + col;
      n = Math.floor((n - 1) / 26);
    }
    return col;
  }

  static parseCoord(value) {
    const coord = this.normalizeCoord(value);
    const match = /^([A-Z]+)(\d+)$/.exec(coord);
    if (!match) throw new Error("Địa chỉ ô không hợp lệ.");
    return { c: match[1], r: parseInt(match[2], 10) };
  }

  static expandCellReferences(input) {
    if (Array.isArray(input)) {
      return input.flatMap(item => this.expandCellReferences(item));
    }
    const rawTokens = String(input || "").split(/[;,\s]+/).map(t => t.trim()).filter(Boolean);
    const result = [];
    for (const token of rawTokens) {
      if (token.includes(":")) {
        const [startPart, endPart] = token.split(":");
        const start = this.parseCoord(startPart);
        const end = this.parseCoord(endPart);
        const minCol = Math.min(this.colToIdx(start.c), this.colToIdx(end.c));
        const maxCol = Math.max(this.colToIdx(start.c), this.colToIdx(end.c));
        const minRow = Math.min(start.r, end.r);
        const maxRow = Math.max(start.r, end.r);
        for (let c = minCol; c <= maxCol; c++) {
          for (let r = minRow; r <= maxRow; r++) {
            result.push(`${this.idxToCol(c)}${r}`);
          }
        }
      } else {
        result.push(this.normalizeCoord(token));
      }
    }
    return result;
  }

  static validateScenario(name, changingCells, values, comment = "") {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Tên kịch bản không được để trống.");
    const cells = this.expandCellReferences(changingCells);
    if (!cells.length) throw new Error("Hãy nhập ít nhất một ô thay đổi.");
    if (new Set(cells).size !== cells.length) throw new Error("Danh sách ô thay đổi bị trùng.");
    const parsedValues = Array.isArray(values) ? values : String(values ?? "").split(/[;,]/).map(value => value.trim());
    if (parsedValues.length !== cells.length) throw new Error("Số giá trị phải bằng số ô thay đổi.");
    return {
      name: cleanName,
      changingCells: cells,
      values: parsedValues.map(value => {
        const number = Number(value);
        return value !== "" && Number.isFinite(number) ? number : value;
      }),
      comment: String(comment ?? "").trim()
    };
  }
}
