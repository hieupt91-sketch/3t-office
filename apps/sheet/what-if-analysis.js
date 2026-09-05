/** Pure helpers for VN Sheet What-If Analysis. */
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

  static validateScenario(name, changingCells, values) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Tên kịch bản không được để trống.");
    const cells = String(changingCells || "").split(/[;,\s]+/).filter(Boolean).map(this.normalizeCoord);
    if (!cells.length) throw new Error("Hãy nhập ít nhất một ô thay đổi.");
    if (new Set(cells).size !== cells.length) throw new Error("Danh sách ô thay đổi bị trùng.");
    const parsedValues = Array.isArray(values) ? values : String(values ?? "").split(/[;,]/).map(value => value.trim());
    if (parsedValues.length !== cells.length) throw new Error("Số giá trị phải bằng số ô thay đổi.");
    return { name: cleanName, changingCells: cells, values: parsedValues.map(value => {
      const number = Number(value);
      return value !== "" && Number.isFinite(number) ? number : value;
    }) };
  }
}
