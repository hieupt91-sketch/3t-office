import { t } from "../../platform/i18n/i18n.js";

const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 220;

function normalizedText(value) {
  return String(value ?? "");
}

function safeId(value) {
  return String(value || "Slicer").replace(/[^A-Za-z0-9_]/g, "_");
}

export function normalizeTableSlicer(value = {}) {
  return {
    id: String(value.id || `slicer-${Date.now()}`),
    name: String(value.name || "Slicer1"),
    caption: String(value.caption || value.columnName || "Bộ lọc"),
    tableName: String(value.tableName || ""),
    columnName: String(value.columnName || ""),
    columnIndex: Math.max(0, Number(value.columnIndex) || 0),
    left: Math.max(0, Number(value.left) || 24),
    top: Math.max(0, Number(value.top) || 24),
    width: Math.max(140, Number(value.width) || DEFAULT_WIDTH),
    height: Math.max(140, Number(value.height) || DEFAULT_HEIGHT),
    numberOfColumns: Math.max(1, Number(value.numberOfColumns) || 1),
    multiSelect: Boolean(value.multiSelect),
    selectedValues: [...new Set((value.selectedValues || []).map(normalizedText))],
    anchorValue: value.anchorValue == null ? null : normalizedText(value.anchorValue)
  };
}

export class TableSlicerController {
  constructor(grid) {
    this.grid = grid;
    this.host = null;
  }

  ensureSheet(sheetName = this.grid.activeSheet) {
    this.grid.slicersBySheet ||= {};
    this.grid.slicersBySheet[sheetName] ||= [];
    return this.grid.slicersBySheet[sheetName];
  }

  list(sheetName = this.grid.activeSheet) {
    return this.ensureSheet(sheetName);
  }

  tableColumns(table) {
    const bounds = table && this.grid._normalizeRange(this.grid._parseRange(table.ref));
    if (!bounds) return [];
    const columns = [];
    const start = this.grid._columnNumber(bounds.start.c);
    const end = this.grid._columnNumber(bounds.end.c);
    for (let number = start; number <= end; number++) {
      const col = this.grid._columnLabel(number);
      const fallback = `Column${number - start + 1}`;
      const label = table.hasHeaders === false ? fallback : normalizedText(this.grid.cellsData.get(`${col}${bounds.start.r}`)?.val).trim() || fallback;
      columns.push({ name: label, index: number - start, col });
    }
    return columns;
  }

  values(slicer) {
    const table = this.grid._tableByName(slicer.tableName);
    const bounds = table && this.grid._normalizeRange(this.grid._parseRange(table.ref));
    if (!table || !bounds) return [];
    const startColumn = this.grid._columnNumber(bounds.start.c);
    const col = this.grid._columnLabel(startColumn + slicer.columnIndex);
    const firstRow = bounds.start.r + (table.hasHeaders === false ? 0 : 1);
    const lastRow = bounds.end.r - (table.showTotals ? 1 : 0);
    const values = [];
    const seen = new Set();
    for (let row = firstRow; row <= lastRow; row++) {
      const value = normalizedText(this.grid.cellsData.get(`${col}${row}`)?.val);
      if (!seen.has(value)) {
        seen.add(value);
        values.push(value);
      }
    }
    return values;
  }

  create(tableName, columnName, options = {}, recordUndo = true) {
    const table = this.grid._tableByName(tableName);
    const column = this.tableColumns(table).find(item => item.name === columnName);
    if (!table || !column) return false;
    const before = structuredClone(this.list());
    const serial = this.list().length + 1;
    const baseName = safeId(`Slicer_${table.name}_${column.name}`);
    let name = baseName;
    let suffix = 2;
    while (this.list().some(item => item.name.toLowerCase() === name.toLowerCase())) name = `${baseName}_${suffix++}`;
    const slicer = normalizeTableSlicer({
      id: `${baseName}-${Date.now()}-${serial}`,
      name,
      caption: column.name,
      tableName: table.name,
      columnName: column.name,
      columnIndex: column.index,
      left: 24 + ((serial - 1) % 4) * 196,
      top: 24 + Math.floor((serial - 1) / 4) * 236,
      ...options
    });
    this.list().push(slicer);
    this.grid._recomputeFilteredRows?.();
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return slicer;
  }

  remove(id, recordUndo = true) {
    const collection = this.list();
    const index = collection.findIndex(item => item.id === id);
    if (index < 0) return false;
    const before = structuredClone(collection);
    collection.splice(index, 1);
    this.grid._recomputeFilteredRows?.();
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(collection) });
    return true;
  }

  clear(id, recordUndo = true) {
    const slicer = this.list().find(item => item.id === id);
    if (!slicer || !slicer.selectedValues.length) return false;
    const before = structuredClone(this.list());
    slicer.selectedValues = [];
    slicer.anchorValue = null;
    this.grid._recomputeFilteredRows?.();
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return true;
  }

  select(id, value, event = {}, recordUndo = true) {
    const slicer = this.list().find(item => item.id === id);
    if (!slicer) return false;
    const values = this.values(slicer);
    const target = normalizedText(value);
    if (!values.includes(target)) return false;
    const before = structuredClone(this.list());
    const selected = new Set(slicer.selectedValues.length ? slicer.selectedValues : values);
    if (event.shiftKey && slicer.anchorValue != null && values.includes(slicer.anchorValue)) {
      const from = values.indexOf(slicer.anchorValue);
      const to = values.indexOf(target);
      if (!event.ctrlKey && !slicer.multiSelect) selected.clear();
      for (let index = Math.min(from, to); index <= Math.max(from, to); index++) selected.add(values[index]);
    } else if (event.ctrlKey || slicer.multiSelect) {
      if (selected.has(target) && selected.size > 1) selected.delete(target);
      else selected.add(target);
      slicer.anchorValue = target;
    } else {
      selected.clear();
      selected.add(target);
      slicer.anchorValue = target;
    }
    slicer.selectedValues = selected.size === values.length ? [] : [...selected];
    this.grid._recomputeFilteredRows?.();
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return true;
  }

  toggleMulti(id, recordUndo = true) {
    const slicer = this.list().find(item => item.id === id);
    if (!slicer) return false;
    const before = structuredClone(this.list());
    slicer.multiSelect = !slicer.multiSelect;
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return slicer.multiSelect;
  }

  restore(items) {
    this.grid.slicersBySheet[this.grid.activeSheet] = (items || []).map(normalizeTableSlicer);
    this.grid._recomputeFilteredRows?.();
    this.render();
  }

  itemStates(slicer) {
    const selected = new Set(slicer.selectedValues);
    const hasSelection = selected.size > 0;
    return this.values(slicer).map(value => ({
      value,
      selected: !hasSelection || selected.has(value),
      available: this.grid._slicerValueHasData?.(slicer, value) !== false
    }));
  }

  showInsertDialog() {
    const table = this.grid.getTableAtSelection?.();
    if (!table || typeof document === "undefined" || typeof document.createElement !== "function") {
      this.grid.options?.onStatus?.(t("sheetSlicer.selectTable", "Hãy chọn một ô trong bảng trước khi chèn bộ lọc trực quan."));
      return false;
    }
    const columns = this.tableColumns(table);
    const rows = columns.map((column, index) => `<label class="vno-slicer-column-choice"><input type="checkbox" value="${this.grid._escapeHtml(column.name)}" ${index === 0 ? "checked" : ""}> <span>${this.grid._escapeHtml(column.name)}</span></label>`).join("");
    const dialog = this.grid._createSheetDialog(t("sheetDialogs.slicer.title", "Chèn bộ lọc trực quan"), `<div class="vno-slicer-column-dialog"><p>${t("sheetDialogs.slicer.hint", "Chọn một hoặc nhiều cột của bảng để tạo bộ lọc nổi.")}</p><div class="vno-slicer-column-list" role="group" aria-label="${t("sheetDialogs.slicer.columns", "Cột của bảng")}">${rows}</div><div class="vno-rule-error" role="alert"></div></div>`);
    if (!dialog) return false;
    dialog.querySelector(".vno-rule-apply")?.addEventListener("click", () => {
      const names = Array.from(dialog.querySelectorAll(".vno-slicer-column-list input:checked"), input => input.value);
      if (!names.length) {
        dialog.querySelector(".vno-rule-error").textContent = t("sheetDialogs.slicer.chooseColumn", "Hãy chọn ít nhất một cột.");
        return;
      }
      const before = structuredClone(this.list());
      names.forEach(name => this.create(table.name, name, {}, false));
      this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
      dialog.closeDialog();
    });
    dialog.querySelector("input")?.focus();
    return true;
  }

  render() {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !this.grid.viewport?.appendChild) return false;
    if (!this.host || !this.host.isConnected) {
      this.host = document.createElement("div");
      this.host.className = "vno-sheet-slicer-layer";
      this.host.setAttribute("aria-label", t("sheetSlicer.layer", "Bộ lọc trực quan"));
      this.grid.viewport.appendChild(this.host);
    }
    this.host.innerHTML = "";
    for (const slicer of this.list()) {
      const panel = document.createElement("section");
      panel.className = "vno-table-slicer";
      panel.dataset.slicerId = slicer.id;
      panel.tabIndex = 0;
      panel.setAttribute("aria-label", `${t("sheetSlicer.aria", "Bộ lọc")}: ${slicer.caption}`);
      panel.style.left = `${slicer.left}px`;
      panel.style.top = `${slicer.top}px`;
      panel.style.width = `${slicer.width}px`;
      panel.style.height = `${slicer.height}px`;
      const states = this.itemStates(slicer);
      panel.innerHTML = `<header class="vno-slicer-header"><span class="vno-slicer-caption">${this.grid._escapeHtml(slicer.caption)}</span><span class="vno-slicer-actions" role="toolbar"><button type="button" data-slicer-multi aria-pressed="${slicer.multiSelect}" title="${t("sheetSlicer.multi", "Chọn nhiều")}">☷</button><button type="button" data-slicer-clear ${slicer.selectedValues.length ? "" : "disabled"} title="${t("sheetSlicer.clear", "Xóa bộ lọc")}">⌫</button><button type="button" data-slicer-close title="${t("sheetSlicer.close", "Xóa bộ lọc trực quan")}">×</button></span></header><div class="vno-slicer-items" role="listbox" aria-multiselectable="true" style="grid-template-columns:repeat(${slicer.numberOfColumns},minmax(0,1fr))">${states.map(state => `<button type="button" role="option" data-slicer-value="${this.grid._escapeHtml(state.value)}" aria-selected="${state.selected}" class="vno-slicer-item${state.selected ? " is-selected" : ""}${state.available ? "" : " is-unavailable"}">${this.grid._escapeHtml(state.value || t("sheetFilter.blank", "(Trống)"))}</button>`).join("")}</div><div class="vno-slicer-resize" aria-hidden="true"></div>`;
      panel.querySelector("[data-slicer-close]")?.addEventListener("click", () => this.remove(slicer.id));
      panel.querySelector("[data-slicer-clear]")?.addEventListener("click", () => this.clear(slicer.id));
      panel.querySelector("[data-slicer-multi]")?.addEventListener("click", () => this.toggleMulti(slicer.id));
      panel.querySelectorAll("[data-slicer-value]").forEach(button => button.addEventListener("click", event => this.select(slicer.id, button.dataset.slicerValue, event)));
      this._bindPointerMove(panel, slicer, panel.querySelector(".vno-slicer-header"), false);
      this._bindPointerMove(panel, slicer, panel.querySelector(".vno-slicer-resize"), true);
      this.host.appendChild(panel);
    }
    return true;
  }

  _bindPointerMove(panel, slicer, handle, resizing) {
    if (!handle?.addEventListener) return;
    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest?.("button")) return;
      event.preventDefault();
      const before = structuredClone(this.list());
      const startX = event.clientX;
      const startY = event.clientY;
      const start = { left: slicer.left, top: slicer.top, width: slicer.width, height: slicer.height };
      handle.setPointerCapture?.(event.pointerId);
      const move = current => {
        const dx = current.clientX - startX;
        const dy = current.clientY - startY;
        if (resizing) {
          slicer.width = Math.max(140, start.width + dx);
          slicer.height = Math.max(140, start.height + dy);
          panel.style.width = `${slicer.width}px`;
          panel.style.height = `${slicer.height}px`;
        } else {
          slicer.left = Math.max(0, start.left + dx);
          slicer.top = Math.max(0, start.top + dy);
          panel.style.left = `${slicer.left}px`;
          panel.style.top = `${slicer.top}px`;
        }
      };
      const finish = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", finish);
        this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
    });
  }
}
