/**
 * Bộ lọc nâng cao (Dữ liệu > Sắp xếp & Lọc > Nâng cao), logic thuần (EXCEL-F1).
 *
 * Vùng điều kiện: dòng đầu là tiêu đề cột (trùng tiêu đề của danh sách), các dòng sau là điều kiện:
 * các ô cùng dòng là VÀ, các dòng khác nhau là HOẶC; ô trống bỏ qua; dòng điều kiện trống khớp mọi bản ghi.
 * Cách so khớp chữ/số/toán tử giống hàm cơ sở dữ liệu (DSUM...): chữ trần khớp phần đầu, =, <>, <, >, <=, >=, ký tự đại diện.
 */
import { matchCell } from "./formula-functions-database.js";

const blank = value => value === null || value === undefined || value === "";

/**
 * @param engine FormulaEngine (dùng để so sánh chuẩn Excel)
 * @param list ma trận danh sách (dòng 0 là tiêu đề)
 * @param criteria ma trận vùng điều kiện (dòng 0 là tiêu đề)
 * @returns {number[]} chỉ số dòng dữ liệu khớp (0-based trong phần dữ liệu, không tính tiêu đề)
 */
export function advancedFilterRows(engine, list, criteria, { unique = false } = {}) {
  if (!list || list.length < 1) return [];
  const headers = list[0].map(value => String(value ?? "").trim().toLowerCase());
  const criteriaHeaders = (criteria?.[0] || []).map(value => String(value ?? "").trim().toLowerCase());
  const criteriaRows = (criteria || []).slice(1);
  const matched = [];
  const seen = new Set();
  for (let r = 1; r < list.length; r++) {
    let any = criteriaRows.length === 0;
    for (const row of criteriaRows) {
      let all = true;
      let used = false;
      for (let k = 0; k < criteriaHeaders.length; k++) {
        const criterion = row[k];
        if (blank(criterion)) continue;
        used = true;
        const column = headers.indexOf(criteriaHeaders[k]);
        if (column < 0 || !matchCell(engine, list[r][column], criterion)) { all = false; break; }
      }
      if (all) { any = true; break; }
      void used;
    }
    if (!any) continue;
    if (unique) {
      const key = list[r].map(value => String(value ?? "").toLowerCase()).join("\u0001");
      if (seen.has(key)) continue;
      seen.add(key);
    }
    matched.push(r - 1);
  }
  return matched;
}
