/**
 * Đến (Go To, F5 / Ctrl+G) và Đến đặc biệt (Go To Special) cho 3T Sheet.
 * Logic tách khỏi sheet-grid.js: nhận grid làm tham số, chỉ dùng API chọn ô sẵn có của grid.
 */

const MAX_AREAS = 3000;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]);
}

function stripSheetPrefix(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^(?:'((?:[^']|'')+)'|([^'!]+))!(.+)$/);
  if (!match) return { sheet: null, ref: raw };
  return { sheet: match[1] !== undefined ? match[1].replace(/''/g, "'") : match[2], ref: match[3].trim() };
}

/** Phân giải chuỗi người dùng nhập (A1, A1:B5, Sheet2!C3, tên đã xác định) thành { sheet, range }. */
export function resolveGoToTarget(grid, input) {
  const typed = String(input || "").trim();
  if (!typed) return null;
  const names = [...(grid.namedRangesWorkbook || []), ...(grid.namedRangesBySheet?.[grid.activeSheet] || [])];
  const named = names.find(item => String(item.name).toLowerCase() === typed.toLowerCase());
  const { sheet, ref } = stripSheetPrefix(named ? named.ref : typed);
  const targetSheet = sheet || grid.activeSheet;
  if (!grid.sheets.includes(targetSheet)) return null;
  const range = grid._parseRange(ref.replace(/\$/g, ""));
  if (!range) return null;
  if (range.start.r < 1 || range.end.r > grid.rowCount) return null;
  return { sheet: targetSheet, range };
}

export function goToReference(grid, input) {
  const target = resolveGoToTarget(grid, input);
  if (!target) return false;
  if (target.sheet !== grid.activeSheet) grid.switchSheet(target.sheet);
  grid.selectCell(target.range.start.c, target.range.start.r);
  if (target.range.end.c !== target.range.start.c || target.range.end.r !== target.range.start.r) {
    grid.selectCell(target.range.end.c, target.range.end.r, true);
  }
  return true;
}

function hasContent(cell) {
  if (!cell) return false;
  const value = cell.val;
  return Boolean(cell.formula) || (value !== undefined && value !== null && value !== "");
}

function scopeBounds(grid) {
  const selection = grid._normalizeRange(grid.selectionRange);
  const multi = selection.start.c !== selection.end.c || selection.start.r !== selection.end.r;
  if (multi) return { start: selection.start, end: selection.end, selectionIsScope: true };
  const used = grid._usedRangeForCells(grid.cellsData);
  if (!used) return { start: { c: "A", r: 1 }, end: { c: "A", r: 1 }, selectionIsScope: false };
  return { start: used.start, end: used.end, selectionIsScope: false };
}

function eachCellInScope(grid, scope, callback) {
  const c1 = grid._columnNumber(scope.start.c);
  const c2 = grid._columnNumber(scope.end.c);
  for (let r = scope.start.r; r <= scope.end.r; r++) {
    for (let c = c1; c <= c2; c++) callback(grid._columnLabel(c), r);
  }
}

/** Danh sách ô thỏa loại "đặc biệt" trong phạm vi chọn (hoặc cả vùng dữ liệu nếu chỉ chọn một ô). */
export function findSpecialCells(grid, kind) {
  const scope = scopeBounds(grid);
  const cells = grid.cellsData;
  const found = [];
  const push = (c, r) => found.push({ c, r });
  switch (kind) {
    case "comments": {
      for (const key of Object.keys(grid.commentsBySheet?.[grid.activeSheet] || {})) {
        const match = key.match(/^([A-Z]+)(\d+)$/);
        if (match) push(match[1], Number(match[2]));
      }
      break;
    }
    case "constants":
      eachCellInScope(grid, scope, (c, r) => { const cell = cells.get(`${c}${r}`); if (hasContent(cell) && !cell.formula) push(c, r); });
      break;
    case "formulas":
      eachCellInScope(grid, scope, (c, r) => { const cell = cells.get(`${c}${r}`); if (cell && String(cell.formula || "").startsWith("=")) push(c, r); });
      break;
    case "blanks":
      eachCellInScope(grid, scope, (c, r) => { if (!hasContent(cells.get(`${c}${r}`))) push(c, r); });
      break;
    case "visible":
      eachCellInScope(grid, scope, (c, r) => {
        if (grid.hiddenRows?.has?.(r)) return;
        if (grid.hiddenCols?.has?.(c) || grid.hiddenColumns?.has?.(c)) return;
        push(c, r);
      });
      break;
    case "lastCell": {
      const used = grid._usedRangeForCells(cells);
      if (used) push(used.end.c, used.end.r);
      break;
    }
    case "currentRegion": {
      let minC = grid._columnNumber(grid.selectedCoord.c), maxC = minC;
      let minR = grid.selectedCoord.r, maxR = minR;
      let grew = true;
      const nonEmptyAt = (c, r) => c >= 1 && r >= 1 && r <= grid.rowCount && hasContent(cells.get(`${grid._columnLabel(c)}${r}`));
      while (grew) {
        grew = false;
        for (let r = minR - 1; r <= maxR + 1 && !grew; r++) {
          for (const c of [minC - 1, maxC + 1]) if (nonEmptyAt(c, r) && r >= 1) { c < minC ? minC = c : maxC = c; grew = true; break; }
        }
        for (let c = minC - 1; c <= maxC + 1 && !grew; c++) {
          for (const r of [minR - 1, maxR + 1]) if (nonEmptyAt(c, r)) { r < minR ? minR = r : maxR = r; grew = true; break; }
        }
      }
      for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) push(grid._columnLabel(c), r);
      break;
    }
    case "conditionalFormats": {
      const seen = new Set();
      for (const rule of grid.getConditionalFormattingRules?.() || []) {
        const range = grid._normalizeRange(rule.range);
        eachCellInScope(grid, range, (c, r) => { const key = `${c}${r}`; if (!seen.has(key)) { seen.add(key); push(c, r); } });
      }
      break;
    }
    case "validation": {
      const seen = new Set();
      for (const rule of grid.getDataValidations?.() || []) {
        const range = grid._normalizeRange(rule.range);
        eachCellInScope(grid, range, (c, r) => { const key = `${c}${r}`; if (!seen.has(key)) { seen.add(key); push(c, r); } });
      }
      break;
    }
    case "rowDifferences":
    case "columnDifferences": {
      if (!scope.selectionIsScope) break;
      const baseCol = grid.selectedCoord.c;
      const baseRow = grid.selectedCoord.r;
      const cellKey = cell => String(cell?.formula || (cell?.val ?? ""));
      const sameValue = (a, b) => cellKey(a) === cellKey(b);
      eachCellInScope(grid, scope, (c, r) => {
        if (kind === "rowDifferences") {
          if (c === baseCol) return;
          if (!sameValue(cells.get(`${c}${r}`), cells.get(`${baseCol}${r}`))) push(c, r);
        } else {
          if (r === baseRow) return;
          if (!sameValue(cells.get(`${c}${r}`), cells.get(`${c}${baseRow}`))) push(c, r);
        }
      });
      break;
    }
    default:
      return [];
  }
  return found;
}

/** Chọn một danh sách ô, gộp thành các đoạn liền kề theo hàng để giảm số vùng chọn. */
export function selectCoordinates(grid, coords) {
  if (!coords.length) return false;
  const sorted = [...coords].sort((a, b) => a.r - b.r || grid._columnNumber(a.c) - grid._columnNumber(b.c));
  const runs = [];
  for (const cell of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.end.r === cell.r && grid._columnNumber(cell.c) === grid._columnNumber(last.end.c) + 1) last.end = { c: cell.c, r: cell.r };
    else runs.push({ start: { c: cell.c, r: cell.r }, end: { c: cell.c, r: cell.r } });
  }
  const areas = runs.slice(0, MAX_AREAS);
  const first = areas[0];
  grid._applySelectionRange(first, { ...first.start }, {
    anchor: first.start,
    additive: areas.length > 1,
    baseAreas: areas.slice(1),
    kind: "cell",
    scrollActive: true
  });
  return runs.length > MAX_AREAS ? "truncated" : true;
}

export function goToSpecial(grid, kind) {
  const coords = findSpecialCells(grid, kind);
  if (!coords.length) return false;
  return selectCoordinates(grid, coords);
}

const SPECIAL_OPTIONS = [
  ["comments", "Ghi chú"],
  ["constants", "Hằng số (giá trị nhập tay)"],
  ["formulas", "Công thức"],
  ["blanks", "Ô trống"],
  ["currentRegion", "Vùng hiện tại"],
  ["lastCell", "Ô cuối cùng"],
  ["rowDifferences", "Khác biệt theo hàng"],
  ["columnDifferences", "Khác biệt theo cột"],
  ["visible", "Chỉ ô nhìn thấy"],
  ["conditionalFormats", "Định dạng có điều kiện"],
  ["validation", "Kiểm tra dữ liệu"]
];

export function showGoToDialog(grid, t = (key, fallback) => fallback) {
  const names = [...(grid.namedRangesWorkbook || []), ...(grid.namedRangesBySheet?.[grid.activeSheet] || [])];
  const overlay = grid._createSheetDialog(t("sheetGoTo.title", "Đến"), `
    <label>${t("sheetGoTo.reference", "Tham chiếu")}<input id="vno-goto-ref" type="text" autocomplete="off" aria-label="${t("sheetGoTo.reference", "Tham chiếu")}" placeholder="${t("sheetGoTo.placeholder", "Ví dụ: B5, A1:C10, Sheet2!D3 hoặc một tên")}"></label>
    <p class="vno-rule-hint">${t("sheetGoTo.nameList", "Tên đã xác định")}</p>
    <div id="vno-goto-names" role="listbox" aria-label="${t("sheetGoTo.nameList", "Tên đã xác định")}">
      ${names.length ? names.map(item => `<button type="button" class="vno-btn" role="option" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)} <small>${escapeHtml(item.ref)}</small></button>`).join("") : `<p class="vno-cf-empty">${t("sheetGoTo.noNames", "Chưa có tên nào.")}</p>`}
    </div>
    <div class="vno-rule-error" role="alert"></div>
    <button type="button" class="vno-btn" id="vno-goto-special-btn">${t("sheetGoTo.special", "Đặc biệt...")}</button>`);
  if (!overlay) return false;
  const input = overlay.querySelector("#vno-goto-ref");
  overlay.querySelectorAll("[data-name]").forEach(button => button.addEventListener("click", () => { input.value = button.dataset.name; input.focus(); }));
  overlay.querySelector("#vno-goto-special-btn").addEventListener("click", () => { overlay.closeDialog(); showGoToSpecialDialog(grid, t); });
  overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
    if (goToReference(grid, input.value)) overlay.closeDialog();
    else overlay.querySelector(".vno-rule-error").textContent = t("sheetGoTo.invalid", "Tham chiếu không hợp lệ.");
  });
  input.focus();
  return true;
}

export function showGoToSpecialDialog(grid, t = (key, fallback) => fallback) {
  const overlay = grid._createSheetDialog(t("sheetGoTo.specialTitle", "Đến đặc biệt"), `
    <fieldset class="vno-goto-special-options"><legend>${t("sheetGoTo.select", "Chọn")}</legend>
      ${SPECIAL_OPTIONS.map(([value, label], index) => `<label class="vno-goto-special-row"><input type="radio" name="vno-goto-special" value="${value}"${index === 0 ? " checked" : ""}> <span>${label}</span></label>`).join("")}
    </fieldset>
    <div class="vno-rule-error" role="alert"></div>`);
  if (!overlay) return false;
  overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
    const kind = overlay.querySelector('input[name="vno-goto-special"]:checked')?.value || "comments";
    const result = goToSpecial(grid, kind);
    if (result) {
      overlay.closeDialog();
      if (result === "truncated") grid._showDataNotice?.(t("sheetGoTo.truncated", "Có quá nhiều vùng; chỉ chọn một phần đầu tiên."));
    } else {
      overlay.querySelector(".vno-rule-error").textContent = t("sheetGoTo.noCells", "Không tìm thấy ô nào.");
    }
  });
  overlay.querySelector('input[name="vno-goto-special"]:checked')?.focus();
  return true;
}
