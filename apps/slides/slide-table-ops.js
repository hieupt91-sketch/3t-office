/**
 * Thao tác bảng trên trang chiếu (logic thuần, không DOM): chèn/xóa hàng và cột, gộp ô, tách ô.
 *
 * Mô hình bảng (shape.type === "table"): { rows, cols, cells: string[][], merges?: [{ r, c, rs, cs }], w, h }.
 * - `merges`: mỗi mục là ô neo (r, c) trải rs hàng và cs cột (rs >= 1, cs >= 1, ít nhất một giá trị > 1).
 * - Ô bị phủ (không phải ô neo) vẫn tồn tại trong `cells` với nội dung rỗng.
 * Mọi hàm trả về trạng thái MỚI { rows, cols, cells, merges, w, h } mà không sửa shape; null nếu thao tác không hợp lệ.
 */

export const TABLE_MAX_ROWS = 50;
export const TABLE_MAX_COLS = 26;

const clone = value => JSON.parse(JSON.stringify(value));

export function tableState(shape) {
  const rows = Math.max(1, Number(shape?.rows) || (shape?.cells || []).length || 1);
  const cols = Math.max(1, Number(shape?.cols) || (shape?.cells || []).reduce((max, row) => Math.max(max, (row || []).length), 1));
  const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => shape?.cells?.[r]?.[c] ?? ""));
  const merges = (shape?.merges || [])
    .map(m => ({ r: m.r | 0, c: m.c | 0, rs: Math.max(1, m.rs | 0), cs: Math.max(1, m.cs | 0) }))
    .filter(m => (m.rs > 1 || m.cs > 1) && m.r >= 0 && m.c >= 0 && m.r + m.rs <= rows && m.c + m.cs <= cols);
  return { rows, cols, cells, merges, w: Number(shape?.w) || 0, h: Number(shape?.h) || 0 };
}

/** Bản đồ hiển thị: với mỗi ô cho biết là ô neo (kèm rowSpan/colSpan) hay bị phủ. */
export function mergeMap(state) {
  const map = Array.from({ length: state.rows }, () => Array.from({ length: state.cols }, () => ({ covered: false, rs: 1, cs: 1 })));
  for (const m of state.merges) {
    for (let r = m.r; r < m.r + m.rs; r++) {
      for (let c = m.c; c < m.c + m.cs; c++) {
        if (r === m.r && c === m.c) map[r][c] = { covered: false, rs: m.rs, cs: m.cs };
        else map[r][c] = { covered: true, rs: 1, cs: 1, anchorR: m.r, anchorC: m.c };
      }
    }
  }
  return map;
}

/** Ô neo của ô (r, c): chính nó nếu không bị gộp. */
export function anchorOf(state, r, c) {
  const cell = mergeMap(state)[r]?.[c];
  return cell?.covered ? { r: cell.anchorR, c: cell.anchorC } : { r, c };
}

function scaled(state, rows, cols) {
  // Bảng giữ chiều cao hàng và độ rộng cột trung bình: thêm hàng/cột thì bảng lớn thêm tương ứng.
  const h = state.rows ? Math.round(state.h * rows / state.rows) : state.h;
  const w = state.cols ? Math.min(Math.round(state.w * cols / state.cols), 900) : state.w;
  return { h: Math.max(h, rows * 24), w: Math.max(w, cols * 40) };
}

/** Chèn một hàng trống TRƯỚC hàng `index` (0..rows). */
export function insertRow(shape, index) {
  const s = tableState(shape);
  if (s.rows >= TABLE_MAX_ROWS || index < 0 || index > s.rows) return null;
  const cells = clone(s.cells);
  cells.splice(index, 0, Array.from({ length: s.cols }, () => ""));
  const merges = s.merges.map(m => {
    if (m.r >= index) return { ...m, r: m.r + 1 };
    if (m.r < index && index < m.r + m.rs) return { ...m, rs: m.rs + 1 }; // chèn vào giữa vùng gộp: vùng gộp dài thêm
    return { ...m };
  });
  return { rows: s.rows + 1, cols: s.cols, cells, merges, ...scaled(s, s.rows + 1, s.cols) };
}

/** Chèn một cột trống TRƯỚC cột `index` (0..cols). */
export function insertCol(shape, index) {
  const s = tableState(shape);
  if (s.cols >= TABLE_MAX_COLS || index < 0 || index > s.cols) return null;
  const cells = clone(s.cells).map(row => { row.splice(index, 0, ""); return row; });
  const merges = s.merges.map(m => {
    if (m.c >= index) return { ...m, c: m.c + 1 };
    if (m.c < index && index < m.c + m.cs) return { ...m, cs: m.cs + 1 };
    return { ...m };
  });
  return { rows: s.rows, cols: s.cols + 1, cells, merges, ...scaled(s, s.rows, s.cols + 1) };
}

/** Xóa hàng `r`. Không xóa hàng duy nhất (trả null: người dùng dùng "Xóa bảng"). */
export function deleteRow(shape, r) {
  const s = tableState(shape);
  if (s.rows <= 1 || r < 0 || r >= s.rows) return null;
  const cells = clone(s.cells);
  // Nếu hàng bị xóa chứa ô neo của vùng gộp còn kéo dài xuống dưới, chuyển nội dung ô neo xuống ô neo mới.
  for (const m of s.merges) {
    if (m.r === r && m.rs > 1 && cells[r][m.c] !== "" && cells[r + 1]) {
      if (cells[r + 1][m.c] === "") cells[r + 1][m.c] = cells[r][m.c];
    }
  }
  cells.splice(r, 1);
  const merges = [];
  for (const m of s.merges) {
    let { rs } = m; let row = m.r;
    if (r >= m.r && r < m.r + m.rs) { rs -= 1; } else if (r < m.r) { row -= 1; }
    if (rs < 1) continue;
    if (rs === 1 && m.cs === 1) continue;
    merges.push({ ...m, r: row, rs });
  }
  return { rows: s.rows - 1, cols: s.cols, cells, merges, ...scaled(s, s.rows - 1, s.cols) };
}

/** Xóa cột `c`. Không xóa cột duy nhất. */
export function deleteCol(shape, c) {
  const s = tableState(shape);
  if (s.cols <= 1 || c < 0 || c >= s.cols) return null;
  const cells = clone(s.cells);
  for (const m of s.merges) {
    if (m.c === c && m.cs > 1 && cells[m.r][c] !== "" && cells[m.r][c + 1] === "") cells[m.r][c + 1] = cells[m.r][c];
  }
  cells.forEach(row => row.splice(c, 1));
  const merges = [];
  for (const m of s.merges) {
    let { cs } = m; let col = m.c;
    if (c >= m.c && c < m.c + m.cs) { cs -= 1; } else if (c < m.c) { col -= 1; }
    if (cs < 1) continue;
    if (cs === 1 && m.rs === 1) continue;
    merges.push({ ...m, c: col, cs });
  }
  return { rows: s.rows, cols: s.cols - 1, cells, merges, ...scaled(s, s.rows, s.cols - 1) };
}

function rectOf(r1, c1, r2, c2) {
  return { r: Math.min(r1, r2), c: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
}

/**
 * Mở rộng vùng chọn để chứa trọn mọi vùng gộp bị cắt ngang (như bảng tính / bản trình chiếu thật).
 */
export function expandSelection(shape, r1, c1, r2, c2) {
  const s = tableState(shape);
  let box = rectOf(r1, c1, r2, c2);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of s.merges) {
      const overlaps = m.r <= box.r2 && m.r + m.rs - 1 >= box.r && m.c <= box.c2 && m.c + m.cs - 1 >= box.c;
      if (!overlaps) continue;
      const nr = Math.min(box.r, m.r), nc = Math.min(box.c, m.c);
      const nr2 = Math.max(box.r2, m.r + m.rs - 1), nc2 = Math.max(box.c2, m.c + m.cs - 1);
      if (nr !== box.r || nc !== box.c || nr2 !== box.r2 || nc2 !== box.c2) { box = { r: nr, c: nc, r2: nr2, c2: nc2 }; changed = true; }
    }
  }
  return box;
}

/** Gộp các ô trong hình chữ nhật. Nội dung các ô không rỗng nối bằng xuống dòng vào ô neo (trên-trái). */
export function mergeCells(shape, r1, c1, r2, c2) {
  const s = tableState(shape);
  const box = expandSelection(shape, r1, c1, r2, c2);
  if (box.r < 0 || box.c < 0 || box.r2 >= s.rows || box.c2 >= s.cols) return null;
  if (box.r === box.r2 && box.c === box.c2) return null; // một ô: không có gì để gộp
  const cells = clone(s.cells);
  const parts = [];
  for (let r = box.r; r <= box.r2; r++) {
    for (let c = box.c; c <= box.c2; c++) {
      const text = String(cells[r][c] ?? "");
      if (text !== "") parts.push(text);
      cells[r][c] = "";
    }
  }
  cells[box.r][box.c] = parts.join("\n");
  const merges = s.merges.filter(m => !(m.r >= box.r && m.r + m.rs - 1 <= box.r2 && m.c >= box.c && m.c + m.cs - 1 <= box.c2));
  merges.push({ r: box.r, c: box.c, rs: box.r2 - box.r + 1, cs: box.c2 - box.c + 1 });
  return { rows: s.rows, cols: s.cols, cells, merges, w: s.w, h: s.h };
}

/** Tách ô (r, c) đang thuộc vùng gộp: bỏ vùng gộp, nội dung ở lại ô neo. */
export function splitCell(shape, r, c) {
  const s = tableState(shape);
  const hit = s.merges.find(m => r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs);
  if (!hit) return null;
  return { rows: s.rows, cols: s.cols, cells: clone(s.cells), merges: s.merges.filter(m => m !== hit), w: s.w, h: s.h };
}
