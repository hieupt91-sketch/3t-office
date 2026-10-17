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
  const kind = value.kind === "timeline" ? "timeline" : "slicer";
  const sourceType = value.sourceType === "pivot" || value.pivotId ? "pivot" : "table";
  return {
    id: String(value.id || `slicer-${Date.now()}`),
    name: String(value.name || "Slicer1"),
    caption: String(value.caption || value.columnName || "Bộ lọc"),
    tableName: String(value.tableName || ""),
    columnName: String(value.columnName || ""),
    fieldName: String(value.fieldName || value.columnName || ""),
    columnIndex: Math.max(0, Number(value.columnIndex) || 0),
    kind,
    sourceType,
    pivotId: String(value.pivotId || ""),
    connectedPivotIds: [...new Set((value.connectedPivotIds || (value.pivotId ? [value.pivotId] : [])).map(String).filter(Boolean))],
    left: Math.max(0, Number(value.left) || 24),
    top: Math.max(0, Number(value.top) || 24),
    width: Math.max(140, Number(value.width) || DEFAULT_WIDTH),
    height: Math.max(140, Number(value.height) || DEFAULT_HEIGHT),
    numberOfColumns: Math.max(1, Number(value.numberOfColumns) || 1),
    buttonHeight: Math.max(20, Number(value.buttonHeight) || 28),
    style: ["green", "light", "dark"].includes(value.style) ? value.style : "green",
    multiSelect: Boolean(value.multiSelect),
    selectedValues: [...new Set((value.selectedValues || []).map(normalizedText))],
    anchorValue: value.anchorValue == null ? null : normalizedText(value.anchorValue),
    granularity: ["days", "months", "quarters", "years"].includes(value.granularity) ? value.granularity : "months",
    startDate: value.startDate ? String(value.startDate).slice(0, 10) : "",
    endDate: value.endDate ? String(value.endDate).slice(0, 10) : ""
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
    for (let index = 0; index < this.grid.slicersBySheet[sheetName].length; index++) {
      const current = this.grid.slicersBySheet[sheetName][index];
      const normalized = normalizeTableSlicer(current);
      if (current && typeof current === "object") Object.assign(current, normalized);
      else this.grid.slicersBySheet[sheetName][index] = normalized;
    }
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
    if (slicer.sourceType === "pivot") return this.grid._pivotSlicerValues?.(slicer) || [];
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

  _applyFilters(slicer = null) {
    if (slicer?.sourceType === "pivot" || this.list().some(item => item.sourceType === "pivot")) {
      this.grid._refreshPivotSlicerConnections?.(slicer);
    } else {
      this.grid._recomputeFilteredRows?.();
    }
    this.render();
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
      fieldName: column.name,
      columnIndex: column.index,
      sourceType: "table",
      kind: "slicer",
      left: 24 + ((serial - 1) % 4) * 196,
      top: 24 + Math.floor((serial - 1) / 4) * 236,
      ...options
    });
    this.list().push(slicer);
    this._applyFilters(slicer);
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return slicer;
  }

  createPivot(pivot, fieldName, options = {}, recordUndo = true) {
    if (!pivot || !fieldName) return false;
    const fields = this.grid._pivotSourceFields?.(pivot) || [];
    if (!fields.includes(fieldName)) return false;
    const before = structuredClone(this.list());
    const serial = this.list().length + 1;
    const isTimeline = options.kind === "timeline";
    const baseName = safeId(`${isTimeline ? "Timeline" : "Slicer"}_${fieldName}`);
    let name = baseName;
    let suffix = 2;
    while (this.list().some(item => item.name.toLowerCase() === name.toLowerCase())) name = `${baseName}_${suffix++}`;
    const slicer = normalizeTableSlicer({
      id: `${baseName}-${Date.now()}-${serial}`,
      name,
      caption: fieldName,
      fieldName,
      columnName: fieldName,
      sourceType: "pivot",
      pivotId: pivot.id,
      connectedPivotIds: [pivot.id],
      kind: isTimeline ? "timeline" : "slicer",
      left: 24 + ((serial - 1) % 4) * 196,
      top: 24 + Math.floor((serial - 1) / 4) * 236,
      width: isTimeline ? 360 : DEFAULT_WIDTH,
      height: isTimeline ? 150 : DEFAULT_HEIGHT,
      ...options
    });
    this.list().push(slicer);
    this._applyFilters(slicer);
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return slicer;
  }

  remove(id, recordUndo = true) {
    const collection = this.list();
    const index = collection.findIndex(item => item.id === id);
    if (index < 0) return false;
    const before = structuredClone(collection);
    const removed = collection[index];
    collection.splice(index, 1);
    this._applyFilters(removed);
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(collection) });
    return true;
  }

  clear(id, recordUndo = true) {
    const slicer = this.list().find(item => item.id === id);
    if (!slicer || (!slicer.selectedValues.length && !slicer.startDate && !slicer.endDate)) return false;
    const before = structuredClone(this.list());
    slicer.selectedValues = [];
    slicer.anchorValue = null;
    slicer.startDate = "";
    slicer.endDate = "";
    this._applyFilters(slicer);
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
    this._applyFilters(slicer);
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
    this._applyFilters();
  }

  setTimelineRange(id, startDate, endDate, recordUndo = true) {
    const timeline = this.list().find(item => item.id === id && item.kind === "timeline");
    if (!timeline) return false;
    const start = String(startDate || "").slice(0, 10);
    const end = String(endDate || "").slice(0, 10);
    if (start && end && start > end) return false;
    const before = structuredClone(this.list());
    timeline.startDate = start;
    timeline.endDate = end;
    this._applyFilters(timeline);
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return true;
  }

  setTimelineGranularity(id, granularity, recordUndo = true) {
    const timeline = this.list().find(item => item.id === id && item.kind === "timeline");
    if (!timeline || !["days", "months", "quarters", "years"].includes(granularity)) return false;
    const before = structuredClone(this.list());
    timeline.granularity = granularity;
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return true;
  }

  updateOptions(id, options = {}, recordUndo = true) {
    const slicer = this.list().find(item => item.id === id);
    if (!slicer) return false;
    const before = structuredClone(this.list());
    if (options.caption != null) slicer.caption = String(options.caption).trim() || slicer.fieldName || slicer.columnName;
    if (options.numberOfColumns != null) slicer.numberOfColumns = Math.max(1, Math.min(20, Number(options.numberOfColumns) || 1));
    if (options.buttonHeight != null) slicer.buttonHeight = Math.max(20, Math.min(80, Number(options.buttonHeight) || 28));
    if (["green", "light", "dark"].includes(options.style)) slicer.style = options.style;
    this.render();
    if (recordUndo) this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
    return true;
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

  showPivotInsertDialog(kind = "slicer") {
    const pivot = this.grid._activePivot?.();
    if (!pivot || typeof document === "undefined" || typeof document.createElement !== "function") {
      this.grid.options?.onStatus?.(t("sheetPivotSlicer.selectPivot", "Hãy chọn một ô trong Bảng tổng hợp trước khi chèn bộ lọc."));
      return false;
    }
    const timeline = kind === "timeline";
    const fields = (this.grid._pivotSourceFields?.(pivot) || []).filter(field => !timeline || this.grid._pivotFieldIsDate?.(pivot, field));
    if (!fields.length) {
      this.grid.options?.onStatus?.(timeline
        ? t("sheetPivotSlicer.noDateField", "Nguồn Bảng tổng hợp không có trường ngày hợp lệ để tạo Dòng thời gian.")
        : t("sheetPivotSlicer.noField", "Nguồn Bảng tổng hợp không có trường khả dụng."));
      return false;
    }
    const rows = fields.map((field, index) => `<label class="vno-slicer-column-choice"><input type="${timeline ? "radio" : "checkbox"}" name="vno-pivot-slicer-field" value="${this.grid._escapeHtml(field)}" ${index === 0 ? "checked" : ""}> <span>${this.grid._escapeHtml(field)}</span></label>`).join("");
    const dialog = this.grid._createSheetDialog(
      timeline ? t("sheetDialogs.pivotTimeline.title", "Chèn Dòng thời gian") : t("sheetDialogs.pivotSlicer.title", "Chèn bộ lọc Bảng tổng hợp"),
      `<div class="vno-slicer-column-dialog"><p>${timeline ? t("sheetDialogs.pivotTimeline.hint", "Chọn trường ngày để lọc Bảng tổng hợp theo khoảng thời gian.") : t("sheetDialogs.pivotSlicer.hint", "Chọn một hoặc nhiều trường để tạo bộ lọc nổi cho Bảng tổng hợp.")}</p><div class="vno-slicer-column-list" role="group">${rows}</div><div class="vno-rule-error" role="alert"></div></div>`
    );
    if (!dialog) return false;
    dialog.querySelector(".vno-rule-apply")?.addEventListener("click", () => {
      const names = Array.from(dialog.querySelectorAll(".vno-slicer-column-list input:checked"), input => input.value);
      if (!names.length) {
        dialog.querySelector(".vno-rule-error").textContent = t("sheetDialogs.slicer.chooseColumn", "Hãy chọn ít nhất một trường.");
        return;
      }
      const before = structuredClone(this.list());
      names.forEach(name => this.createPivot(pivot, name, { kind: timeline ? "timeline" : "slicer" }, false));
      this.grid._recordHistory({ type: "sheet-slicers", sheet: this.grid.activeSheet, before, after: structuredClone(this.list()) });
      dialog.closeDialog();
    });
    dialog.querySelector("input")?.focus();
    return true;
  }

  showOptionsDialog(id) {
    const slicer = this.list().find(item => item.id === id);
    if (!slicer || typeof document === "undefined") return false;
    const dialog = this.grid._createSheetDialog(t("sheetDialogs.slicerOptions.title", "Tùy chọn bộ lọc"), `
      <div class="vno-slicer-options-dialog">
        <label>${t("sheetDialogs.slicerOptions.caption", "Tiêu đề")}<input id="vno-slicer-caption" type="text" value="${this.grid._escapeHtml(slicer.caption)}"></label>
        ${slicer.kind === "timeline" ? "" : `<label>${t("sheetDialogs.slicerOptions.columns", "Số cột")}<input id="vno-slicer-columns" type="number" min="1" max="20" value="${slicer.numberOfColumns}"></label><label>${t("sheetDialogs.slicerOptions.buttonHeight", "Chiều cao nút")}<input id="vno-slicer-button-height" type="number" min="20" max="80" value="${slicer.buttonHeight}"></label>`}
        <label>${t("sheetDialogs.slicerOptions.style", "Kiểu")}<select id="vno-slicer-style"><option value="green">${t("sheetDialogs.slicerOptions.green", "Xanh")}</option><option value="light">${t("sheetDialogs.slicerOptions.light", "Sáng")}</option><option value="dark">${t("sheetDialogs.slicerOptions.dark", "Tối")}</option></select></label>
      </div>`);
    if (!dialog) return false;
    dialog.querySelector("#vno-slicer-style").value = slicer.style;
    dialog.querySelector(".vno-rule-apply")?.addEventListener("click", () => {
      this.updateOptions(id, {
        caption: dialog.querySelector("#vno-slicer-caption").value,
        numberOfColumns: dialog.querySelector("#vno-slicer-columns")?.value,
        buttonHeight: dialog.querySelector("#vno-slicer-button-height")?.value,
        style: dialog.querySelector("#vno-slicer-style").value
      });
      dialog.closeDialog();
    });
    dialog.querySelector("input")?.focus();
    return true;
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
      panel.className = `vno-table-slicer vno-slicer-style-${slicer.style}${slicer.kind === "timeline" ? " vno-pivot-timeline" : ""}`;
      panel.dataset.slicerId = slicer.id;
      panel.tabIndex = 0;
      panel.setAttribute("aria-label", `${t("sheetSlicer.aria", "Bộ lọc")}: ${slicer.caption}`);
      panel.style.left = `${slicer.left}px`;
      panel.style.top = `${slicer.top}px`;
      panel.style.width = `${slicer.width}px`;
      panel.style.height = `${slicer.height}px`;
      const states = this.itemStates(slicer);
      const hasFilter = slicer.kind === "timeline" ? Boolean(slicer.startDate || slicer.endDate) : slicer.selectedValues.length > 0;
      const actions = `<header class="vno-slicer-header"><span class="vno-slicer-caption">${this.grid._escapeHtml(slicer.caption)}</span><span class="vno-slicer-actions" role="toolbar">${slicer.kind === "timeline" ? "" : `<button type="button" data-slicer-multi aria-pressed="${slicer.multiSelect}" title="${t("sheetSlicer.multi", "Chọn nhiều")}">☷</button>`}<button type="button" data-slicer-options title="${t("sheetSlicer.options", "Tùy chọn")}">⚙</button><button type="button" data-slicer-clear ${hasFilter ? "" : "disabled"} title="${t("sheetSlicer.clear", "Xóa bộ lọc")}">⌫</button><button type="button" data-slicer-close title="${t("sheetSlicer.close", "Xóa bộ lọc trực quan")}">×</button></span></header>`;
      if (slicer.kind === "timeline") {
        const bounds = this.grid._pivotTimelineBounds?.(slicer) || { min: "", max: "" };
        const units = ["days", "months", "quarters", "years"].map(unit => `<button type="button" data-timeline-unit="${unit}" aria-pressed="${slicer.granularity === unit}">${t(`sheetTimeline.${unit}`, unit)}</button>`).join("");
        panel.innerHTML = `${actions}<div class="vno-timeline-body"><div class="vno-timeline-units" role="toolbar" aria-label="${t("sheetTimeline.unit", "Mức thời gian")}">${units}</div><div class="vno-timeline-range"><label>${t("sheetTimeline.from", "Từ")}<input type="date" data-timeline-start min="${bounds.min}" max="${bounds.max}" value="${slicer.startDate}"></label><span aria-hidden="true">→</span><label>${t("sheetTimeline.to", "Đến")}<input type="date" data-timeline-end min="${bounds.min}" max="${bounds.max}" value="${slicer.endDate}"></label></div></div><div class="vno-slicer-resize" aria-hidden="true"></div>`;
      } else {
        panel.innerHTML = `${actions}<div class="vno-slicer-items" role="listbox" aria-multiselectable="true" style="grid-template-columns:repeat(${slicer.numberOfColumns},minmax(0,1fr));--vno-slicer-button-height:${slicer.buttonHeight}px">${states.map(state => `<button type="button" role="option" data-slicer-value="${this.grid._escapeHtml(state.value)}" aria-selected="${state.selected}" class="vno-slicer-item${state.selected ? " is-selected" : ""}${state.available ? "" : " is-unavailable"}">${this.grid._escapeHtml(state.value || t("sheetFilter.blank", "(Trống)"))}</button>`).join("")}</div><div class="vno-slicer-resize" aria-hidden="true"></div>`;
      }
      panel.querySelector("[data-slicer-close]")?.addEventListener("click", () => this.remove(slicer.id));
      panel.querySelector("[data-slicer-clear]")?.addEventListener("click", () => this.clear(slicer.id));
      panel.querySelector("[data-slicer-multi]")?.addEventListener("click", () => this.toggleMulti(slicer.id));
      panel.querySelector("[data-slicer-options]")?.addEventListener("click", () => this.showOptionsDialog(slicer.id));
      panel.querySelectorAll("[data-slicer-value]").forEach(button => button.addEventListener("click", event => this.select(slicer.id, button.dataset.slicerValue, event)));
      panel.querySelectorAll("[data-slicer-value]").forEach((button, index, buttons) => button.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        buttons[(index + step + buttons.length) % buttons.length]?.focus();
      }));
      panel.querySelectorAll("[data-timeline-unit]").forEach(button => button.addEventListener("click", () => this.setTimelineGranularity(slicer.id, button.dataset.timelineUnit)));
      const applyTimelineRange = () => {
        const start = panel.querySelector("[data-timeline-start]")?.value || "";
        const end = panel.querySelector("[data-timeline-end]")?.value || "";
        if (!this.setTimelineRange(slicer.id, start, end)) this.grid.options?.onStatus?.(t("sheetTimeline.invalidRange", "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."));
      };
      panel.querySelector("[data-timeline-start]")?.addEventListener("change", applyTimelineRange);
      panel.querySelector("[data-timeline-end]")?.addEventListener("change", applyTimelineRange);
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
