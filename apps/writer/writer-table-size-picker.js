import { t } from "../../platform/i18n/i18n.js";

const MAX_ROWS = 63;
const MAX_COLUMNS = 63;
const GRID_ROWS = 8;
const GRID_COLUMNS = 10;

function text(key, fallback, args) {
  const value = t(key, args);
  return value === key ? fallback : value;
}

export function showTableSizePicker(anchor, { onInsert } = {}) {
  if (!anchor || typeof document === "undefined" || !document.body) return null;
  const selection = window.getSelection?.();
  const savedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  const previousFocus = document.activeElement;
  const rect = anchor.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.className = "vno-table-size-picker";
  popup.dataset.tableSizePicker = "true";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "false");
  popup.setAttribute("aria-label", text("writerDialogs.tableSize.title", "Chèn bảng"));
  popup.style.cssText = `position:fixed;z-index:10020;top:${Math.min(rect.bottom + 6, window.innerHeight - 360)}px;left:${Math.max(8, Math.min(rect.left, window.innerWidth - 310))}px;width:292px;padding:14px;background:var(--vno-bg-window,#fff);color:var(--vno-text-primary,#172033);border:1px solid var(--vno-border-default,#cbd5e1);border-radius:8px;box-shadow:0 12px 34px #0f172a33;font-family:inherit;font-size:13px;line-height:1.4;`;
  popup.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px">${text("writerDialogs.tableSize.title", "Chèn bảng")}</div>
    <div data-grid-wrap style="display:grid;grid-template-columns:repeat(${GRID_COLUMNS},1fr);gap:3px;touch-action:none" role="grid" aria-label="${text("writerDialogs.tableSize.gridLabel", "Chọn số cột và hàng")}">
      ${Array.from({ length: GRID_ROWS }, (_, r) => Array.from({ length: GRID_COLUMNS }, (_, c) => `<button type="button" data-table-size="${c + 1}x${r + 1}" data-row="${r + 1}" data-column="${c + 1}" role="gridcell" tabindex="${r === 0 && c === 0 ? "0" : "-1"}" aria-label="${text("writerDialogs.tableSize.cellLabel", "{columns} cột, {rows} hàng", { columns: c + 1, rows: r + 1 })}" style="height:21px;min-width:0;padding:0;border:1px solid var(--vno-border-default,#94a3b8);border-radius:2px;background:var(--vno-bg-window,#fff);cursor:pointer"></button>`).join("")).join("")}
    </div>
    <div data-size-label aria-live="polite" style="min-height:20px;margin:8px 0;color:var(--vno-text-secondary,#475569)">${text("writerDialogs.tableSize.hint", "Chọn số cột × hàng")}</div>
    <button type="button" class="vno-btn" data-action="custom-size" style="width:100%;text-align:left">${text("writerDialogs.tableSize.custom", "Chèn bảng...")}</button>`;
  document.body.appendChild(popup);

  let rows = 1;
  let columns = 1;
  let dragging = false;
  let closed = false;
  const cells = [...popup.querySelectorAll("[data-table-size]")];
  const label = popup.querySelector("[data-size-label]");
  const labelFor = (cols, rs) => text("writerDialogs.tableSize.selection", "{columns} cột × {rows} hàng", { columns: cols, rows: rs });
  const update = (rs, cols, focus = false) => {
    rows = Math.max(1, Math.min(GRID_ROWS, rs));
    columns = Math.max(1, Math.min(GRID_COLUMNS, cols));
    label.textContent = labelFor(columns, rows);
    for (const cell of cells) {
      const active = Number(cell.dataset.row) <= rows && Number(cell.dataset.column) <= columns;
      cell.style.background = active ? "var(--vno-accent-soft,#dbeafe)" : "var(--vno-surface,#fff)";
      cell.style.borderColor = active ? "var(--vno-accent,#2563eb)" : "var(--vno-border-default,#94a3b8)";
      cell.tabIndex = Number(cell.dataset.row) === rows && Number(cell.dataset.column) === columns ? 0 : -1;
    }
      if (focus) popup.querySelector(`[data-table-size="${columns}x${rows}"]`)?.focus();
  };
  const close = (restore = true) => {
    if (closed) return;
    closed = true;
    popup.remove();
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", keydown, true);
    if (restore && previousFocus?.isConnected) previousFocus.focus();
  };
  const insert = (rs, cols) => {
    if (savedRange && savedRange.startContainer.isConnected) {
      const current = window.getSelection?.();
      current?.removeAllRanges();
      current?.addRange(savedRange);
    }
    close(false);
    onInsert?.(rs, cols);
  };
  const outside = event => { if (!popup.contains(event.target) && !anchor.contains(event.target)) close(); };
  const keydown = event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (!popup.contains(event.target) || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Enter" || event.key === " ") { insert(rows, columns); return; }
    const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
    update(rows + delta[0], columns + delta[1], true);
  };
  for (const cell of cells) {
    cell.addEventListener("pointerenter", () => update(Number(cell.dataset.row), Number(cell.dataset.column)));
    cell.addEventListener("focus", () => update(Number(cell.dataset.row), Number(cell.dataset.column)));
    cell.addEventListener("pointerdown", event => { if (event.button === 0) dragging = true; });
    cell.addEventListener("click", () => insert(Number(cell.dataset.row), Number(cell.dataset.column)));
  }
  popup.addEventListener("pointerup", event => {
    if (!dragging) return;
    dragging = false;
    const cell = event.target?.closest?.("[data-table-size]");
    if (cell && popup.contains(cell)) {
      update(Number(cell.dataset.row), Number(cell.dataset.column));
      insert(rows, columns);
    }
  });
  popup.addEventListener("pointercancel", () => { dragging = false; });
  popup.querySelector('[data-action="custom-size"]').addEventListener("click", () => {
    close(false);
    showCustomTableSizeDialog({ initialRows: rows, initialColumns: columns, onInsert, returnFocus: anchor });
  });
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("keydown", keydown, true);
  update(1, 1);
  cells[0]?.focus();
  return popup;
}

export function showCustomTableSizeDialog({ initialRows = 3, initialColumns = 4, onInsert, returnFocus } = {}) {
  if (typeof document === "undefined" || !document.body) return null;
  const previousFocus = returnFocus || document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  overlay.dataset.tableSizeDialog = "true";
  overlay.innerHTML = `<div class="vno-dialog-box" style="width:420px;max-width:calc(100vw - 32px)" role="dialog" aria-modal="true" aria-labelledby="vno-table-size-title"><div class="vno-dialog-header"><span id="vno-table-size-title">${text("writerDialogs.tableSize.customTitle", "Chèn bảng")}</span><button type="button" class="vno-btn vno-btn-icon-only" data-action="close" aria-label="${text("writerDialogs.tableSize.cancel", "Hủy")}">×</button></div><div class="vno-dialog-body" style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><label>${text("writerDialogs.tableSize.columns", "Số cột (1–63)")}<input class="vno-dialog-input" name="columns" type="number" min="1" max="63" step="1" value="${initialColumns}" style="display:block;width:100%;box-sizing:border-box;margin-top:6px"></label><label>${text("writerDialogs.tableSize.rows", "Số hàng (1–63)")}<input class="vno-dialog-input" name="rows" type="number" min="1" max="63" step="1" value="${initialRows}" style="display:block;width:100%;box-sizing:border-box;margin-top:6px"></label><div data-validation role="status" aria-live="polite" style="grid-column:1/-1;color:var(--vno-danger,#b91c1c)"></div></div><div class="vno-dialog-footer"><button type="button" class="vno-btn" data-action="cancel">${text("writerDialogs.tableSize.cancel", "Hủy")}</button><button type="button" class="vno-btn vno-btn-primary" data-action="insert">${text("writerDialogs.tableSize.insert", "Chèn")}</button></div></div>`;
  document.body.appendChild(overlay);
  const columnsInput = overlay.querySelector('[name="columns"]');
  const rowsInput = overlay.querySelector('[name="rows"]');
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKeydown, true); if (previousFocus?.isConnected) previousFocus.focus(); };
  const onKeydown = event => { if (event.key === "Escape" && overlay.isConnected) { event.preventDefault(); event.stopPropagation(); close(); } };
  const commit = () => {
    const cols = Number(columnsInput.value);
    const rows = Number(rowsInput.value);
    const valid = Number.isInteger(cols) && cols >= 1 && cols <= MAX_COLUMNS && Number.isInteger(rows) && rows >= 1 && rows <= MAX_ROWS;
    if (!valid) {
      overlay.querySelector("[data-validation]").textContent = text("writerDialogs.tableSize.invalid", "Nhập số nguyên từ 1 đến 63 cho cả số cột và số hàng.");
      (cols < 1 || cols > MAX_COLUMNS || !Number.isInteger(cols) ? columnsInput : rowsInput).focus();
      return;
    }
    close();
    onInsert?.(rows, cols);
  };
  overlay.querySelector('[data-action="insert"]').addEventListener("click", commit);
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.querySelector('[data-action="close"]').addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", onKeydown, true);
  columnsInput.focus();
  columnsInput.select();
  return overlay;
}
