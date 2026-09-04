/**
 * VN Sheet — Enterprise Grid Controller & Microsoft Formula Calculation Engine
 */

import { FormulaEngine, FUNCTION_CATALOG } from "./formula-engine.js";
import { SheetChartBuilder } from "./sheet-chart.js";
import { FormulaAutocompleteController } from "./formula-autocomplete.js";
import { PivotTableEngine } from "./pivot-table.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export class SheetGridController {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.cols = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    this.rowCount = 200;
    this.rowHeight = 26;

    this.sheets = ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"];
    this.activeSheet = "Dự toán chi phí";

    /** @type {Record<string, Map<string, {val: string|number, formula: string, style: Object}>>} */
    this.sheetsData = {
      "Dự toán chi phí": new Map(),
      "Kế hoạch Q3": new Map(),
      "Nhân sự": new Map()
    };

    /** @type {Record<string, {hiddenRows: Set<number>, activeFilters: Map<string, Set<string>>, isFilterActive: boolean, isFrozenPanes: boolean, selectedCoord: {r: number, c: string}}>} */
    this.sheetStates = {
      "Dự toán chi phí": { hiddenRows: new Set(), activeFilters: new Map(), isFilterActive: false, isFrozenPanes: false, selectedCoord: { r: 1, c: "A" } },
      "Kế hoạch Q3": { hiddenRows: new Set(), activeFilters: new Map(), isFilterActive: false, isFrozenPanes: false, selectedCoord: { r: 1, c: "A" } },
      "Nhân sự": { hiddenRows: new Set(), activeFilters: new Map(), isFilterActive: false, isFrozenPanes: false, selectedCoord: { r: 1, c: "A" } }
    };

    this.namedRangesWorkbook = [];
    this.namedRangesBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.formulaEngine = new FormulaEngine(() => this.cellsData, name => this.resolveNamedRange(name));
    this.autocomplete = new FormulaAutocompleteController(this);

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySteps = 100;
    this.historyMergeWindowMs = 750;

    this.selectedCoord = { r: 1, c: "A" };
    this.selectionRange = { start: { r: 1, c: "A" }, end: { r: 1, c: "A" } };

    // Rules are workbook state, partitioned explicitly by sheet. They are evaluated,
    // never copied into a shared cell style, so switching tabs cannot leak visuals.
    this.conditionalFormattingBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.dataValidationsBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.chartsBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.pivotTablesBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));

    // Freeze Panes & Sort/Filter state (phản ánh sheet đang active)
    this.isFrozenPanes = false;
    this.isFilterActive = false;
    this.hiddenRows = new Set();
    this.activeFilters = new Map();

    // Virtual scroll state
    this.currentStartRow = 1;
    this.currentEndRow = 35;
    this.topSpacer = null;
    this.bottomSpacer = null;
    this.viewport = null;
    this.tbody = null;
    this.tabBar = null;
  }

  get cellsData() {
    if (!this.sheetsData) {
      this.sheetsData = {};
    }
    if (!this.sheetsData[this.activeSheet]) {
      this.sheetsData[this.activeSheet] = new Map();
    }
    return this.sheetsData[this.activeSheet];
  }

  set cellsData(val) {
    if (!this.sheetsData) {
      this.sheetsData = {};
    }
    this.sheetsData[this.activeSheet] = val;
  }

  mount() {
    this.container.innerHTML = "";
    this.container.className = "vno-sheet-container";

    // 1. Formula Bar
    const fBar = document.createElement("div");
    fBar.className = "vno-formula-bar";
    fBar.innerHTML = `
      <div class="vno-name-box" id="vno-cell-name">A1</div>
      <div class="vno-formula-actions">
        <button class="vno-formula-btn" title="Hủy bỏ (Esc)" id="vno-fx-cancel">✕</button>
        <button class="vno-formula-btn" title="Nhập (Enter)" id="vno-fx-ok">✓</button>
        <button class="vno-formula-btn vno-formula-btn-fx" title="Chèn hàm tính toán (fx)" id="vno-fx-insert">fx</button>
      </div>
      <input type="text" class="vno-formula-input" id="vno-formula-val" placeholder="Nhập giá trị hoặc công thức (ví dụ: =SUM(F4:F7), =AVERAGE(E4:E7)...)" />
    `;
    this.nameBox = fBar.querySelector("#vno-cell-name");
    this.formulaInput = fBar.querySelector("#vno-formula-val");

    this.autocomplete.mount();

    this.formulaInput.addEventListener("input", (e) => {
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, e.target.value, true, { coalesce: true });
      this.autocomplete.handleInput(e.target.value, this.formulaInput.selectionStart);
    });

    this.formulaInput.addEventListener("keydown", (e) => {
      if (this.autocomplete.handleKeyDown(e)) {
        return;
      }
      if (e.key === "Enter") {
        this.autocomplete.closeAll();
        this.selectCell(this.selectedCoord.c, this.selectedCoord.r + 1);
      } else if (e.key === "Escape") {
        this.autocomplete.closeAll();
        const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
        const cur = this.cellsData.get(key);
        this.formulaInput.value = cur ? cur.val : "";
      }
    });

    fBar.querySelector("#vno-fx-cancel").addEventListener("click", () => {
      this.autocomplete.closeAll();
      const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
      const cur = this.cellsData.get(key);
      this.formulaInput.value = cur ? cur.val : "";
    });

    fBar.querySelector("#vno-fx-ok").addEventListener("click", () => {
      this.autocomplete.closeAll();
      this.selectCell(this.selectedCoord.c, this.selectedCoord.r + 1);
    });

    fBar.querySelector("#vno-fx-insert").addEventListener("click", () => {
      this.autocomplete.closeAll();
      this.showFunctionDialog();
    });

    this.container.appendChild(fBar);

    // 2. Grid Table Viewport
    const vp = document.createElement("div");
    vp.className = "vno-grid-viewport";
    vp.style.position = "relative";
    this.viewport = vp;
    vp.addEventListener("scroll", () => {
      this.autocomplete.updatePosition();
      this._onViewportScroll();
    });

    const table = document.createElement("table");
    table.className = "vno-grid-table";
    this.table = table;

    // Column Headers
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    trHead.innerHTML = `<th class="vno-grid-corner-header" title="Chọn tất cả (Ctrl+A)"></th>`;
    this.cols.forEach(col => {
      const th = document.createElement("th");
      th.className = "vno-col-header";
      th.dataset.col = col;
      th.innerHTML = `
        <span class="vno-col-title">${col}</span>
        <button class="vno-filter-btn" data-col="${col}" title="Lọc và sắp xếp cột ${col}" style="display:none;">▼</button>
      `;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Filter button click listener via delegation
    thead.addEventListener("click", (e) => {
      const btn = e.target.closest(".vno-filter-btn");
      if (btn) {
        e.stopPropagation();
        this.openFilterMenu(btn.dataset.col, btn);
      }
    });

    // Virtualization Rows
    const tbody = document.createElement("tbody");
    this.tbody = tbody;

    this.topSpacer = document.createElement("tr");
    this.topSpacer.className = "vno-grid-spacer-top";
    this.topSpacer.innerHTML = `<td colspan="${this.cols.length + 1}" style="height:0px;padding:0;border:none;"></td>`;
    tbody.appendChild(this.topSpacer);

    this.bottomSpacer = document.createElement("tr");
    this.bottomSpacer.className = "vno-grid-spacer-bottom";
    this.bottomSpacer.innerHTML = `<td colspan="${this.cols.length + 1}" style="height:0px;padding:0;border:none;"></td>`;
    tbody.appendChild(this.bottomSpacer);

    table.appendChild(tbody);
    vp.appendChild(table);
    const chartLayer = document.createElement("div");
    chartLayer.className = "vno-sheet-chart-layer";
    chartLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6";
    this.chartLayer = chartLayer;
    vp.appendChild(chartLayer);
    this.container.appendChild(vp);

    // 3. Sheet Tab Bar dưới đáy
    const tabBar = document.createElement("div");
    tabBar.className = "vno-sheet-tab-bar";
    tabBar.innerHTML = `
      <div class="vno-sheet-tab-scroll">
        <button class="vno-sheet-scroll-btn" title="Cuộn trái">◀</button>
        <button class="vno-sheet-scroll-btn" title="Cuộn phải">▶</button>
      </div>
      <div id="vno-sheet-tabs-list" style="display:flex;gap:3px;"></div>
      <button class="vno-sheet-add-btn" title="Thêm trang tính mới">+</button>
    `;
    this.tabBar = tabBar;

    const tabsListEl = tabBar.querySelector("#vno-sheet-tabs-list");
    this.sheets.forEach(s => {
      const tab = document.createElement("div");
      tab.className = `vno-sheet-tab-item ${s === this.activeSheet ? "is-active" : ""}`;
      tab.dataset.sheet = s;
      tab.textContent = s;
      tab.addEventListener("click", () => {
        this.switchSheet(s);
      });
      tabsListEl.appendChild(tab);
    });

    const addBtn = tabBar.querySelector(".vno-sheet-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.addSheet();
      });
    }

    this.container.appendChild(tabBar);

    this._populateInitialData();
    this.undoStack = [];
    this.redoStack = [];
    this._syncCommandStates();
    this._renderVirtualRows(1, 40);
    this.renderCharts();
    this.selectCell("A", 1);
    this._bindGridKeyboardNavigation();
  }

  switchSheet(sheetName) {
    if (!sheetName) return false;
    if (!this.sheets.includes(sheetName)) {
      this.sheets.push(sheetName);
    }
    if (!this.sheetsData) {
      this.sheetsData = {};
    }
    if (!this.sheetsData[sheetName]) {
      this.sheetsData[sheetName] = new Map();
    }
    if (!this.conditionalFormattingBySheet[sheetName]) this.conditionalFormattingBySheet[sheetName] = [];
    if (!this.dataValidationsBySheet[sheetName]) this.dataValidationsBySheet[sheetName] = [];
    if (!this.chartsBySheet[sheetName]) this.chartsBySheet[sheetName] = [];
    if (!this.pivotTablesBySheet[sheetName]) this.pivotTablesBySheet[sheetName] = [];
    if (!this.namedRangesBySheet[sheetName]) this.namedRangesBySheet[sheetName] = [];

    // 1. Lưu trạng thái sheet hiện tại
    if (this.activeSheet && this.sheetStates) {
      this.sheetStates[this.activeSheet] = {
        hiddenRows: new Set(this.hiddenRows || []),
        activeFilters: new Map(this.activeFilters || []),
        isFilterActive: !!this.isFilterActive,
        isFrozenPanes: !!this.isFrozenPanes,
        selectedCoord: { ...(this.selectedCoord || { r: 1, c: "A" }) }
      };
    }

    // 2. Chuyển sang sheet mới
    this.activeSheet = sheetName;

    // 3. Khôi phục trạng thái cho sheet mới
    if (!this.sheetStates) {
      this.sheetStates = {};
    }
    if (!this.sheetStates[sheetName]) {
      this.sheetStates[sheetName] = {
        hiddenRows: new Set(),
        activeFilters: new Map(),
        isFilterActive: false,
        isFrozenPanes: false,
        selectedCoord: { r: 1, c: "A" }
      };
    }
    const nextState = this.sheetStates[sheetName];
    this.hiddenRows = new Set(nextState.hiddenRows);
    this.activeFilters = new Map(nextState.activeFilters);
    this.isFilterActive = nextState.isFilterActive;
    this.isFrozenPanes = !!nextState.isFrozenPanes;
    this.selectedCoord = { ...nextState.selectedCoord };
    this.selectionRange = { start: { ...this.selectedCoord }, end: { ...this.selectedCoord } };

    if (this.container && this.container.classList) {
      if (this.isFilterActive) {
        this.container.classList.add("vno-filter-mode");
      } else {
        this.container.classList.remove("vno-filter-mode");
      }
      this.container.classList.toggle?.("vno-freeze-panes", this.isFrozenPanes);
    }
    if (typeof this._updateFilterButtons === "function") {
      this._updateFilterButtons();
    }

    // 4. Đồng bộ FormulaEngine với dữ liệu sheet active
    if (this.formulaEngine) {
      if (typeof this.formulaEngine.setCellsData === "function") {
        this.formulaEngine.setCellsData(this.cellsData);
      } else {
        this.formulaEngine.cellsData = this.cellsData;
      }
    }

    // 5. Cập nhật trạng thái visual của tab bar
    if (this.tabBar && typeof this.tabBar.querySelectorAll === "function") {
      const tabs = this.tabBar.querySelectorAll(".vno-sheet-tab-item");
      tabs.forEach(t => {
        if (t.dataset?.sheet === sheetName || t.textContent === sheetName) {
          t.classList.add("is-active");
        } else {
          t.classList.remove("is-active");
        }
      });
    }

    // 6. Re-render lưới hiển thị ảo
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this.renderCharts();

    // 7. Cập nhật ô chọn và thanh công thức
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    this._syncCommandStates();

    return true;
  }

  addSheet(name, recordUndo = true) {
    const previousSheet = this.activeSheet;
    const sheetName = name || `Trang tính ${this.sheets.length + 1}`;
    const isNewSheet = !this.sheets.includes(sheetName);
    if (isNewSheet) {
      this.sheets.push(sheetName);
    }
    if (!this.sheetsData) {
      this.sheetsData = {};
    }
    if (!this.sheetsData[sheetName]) {
      this.sheetsData[sheetName] = new Map();
    }
    if (!this.conditionalFormattingBySheet[sheetName]) this.conditionalFormattingBySheet[sheetName] = [];
    if (!this.dataValidationsBySheet[sheetName]) this.dataValidationsBySheet[sheetName] = [];
    if (!this.chartsBySheet[sheetName]) this.chartsBySheet[sheetName] = [];
    if (!this.pivotTablesBySheet[sheetName]) this.pivotTablesBySheet[sheetName] = [];
    if (!this.sheetStates) {
      this.sheetStates = {};
    }
    if (!this.sheetStates[sheetName]) {
      this.sheetStates[sheetName] = {
        hiddenRows: new Set(),
        activeFilters: new Map(),
        isFilterActive: false,
        isFrozenPanes: false,
        selectedCoord: { r: 1, c: "A" }
      };
    }

    if (this.tabBar && typeof this.tabBar.querySelector === "function") {
      const tabsListEl = this.tabBar.querySelector("#vno-sheet-tabs-list");
      if (tabsListEl && typeof document !== "undefined" && typeof document.createElement === "function") {
        const tab = document.createElement("div");
        tab.className = "vno-sheet-tab-item";
        tab.dataset.sheet = sheetName;
        tab.textContent = sheetName;
        tab.addEventListener("click", () => this.switchSheet(sheetName));
        tabsListEl.appendChild(tab);
      }
    }

    this.switchSheet(sheetName);
    if (recordUndo && isNewSheet) this._recordHistory({ type: "sheet-add", sheet: previousSheet, sheetName, previousSheet, snapshot: this._snapshotSheet(sheetName) });
    return sheetName;
  }

  deleteSheet(sheetName = this.activeSheet, recordUndo = true) {
    const index = this.sheets.indexOf(sheetName);
    if (index < 0 || this.sheets.length <= 1) return false;
    const snapshot = this._snapshotSheet(sheetName);
    const nextSheet = this.sheets[index === 0 ? 1 : index - 1];
    this.sheets.splice(index, 1);
    delete this.sheetsData[sheetName];
    delete this.sheetStates[sheetName];
    delete this.conditionalFormattingBySheet[sheetName];
    delete this.dataValidationsBySheet[sheetName];
    delete this.chartsBySheet[sheetName];
    delete this.pivotTablesBySheet[sheetName];
    delete this.namedRangesBySheet[sheetName];
    this.tabBar?.querySelector?.(`.vno-sheet-tab-item[data-sheet="${sheetName}"]`)?.remove?.();
    if (this.activeSheet === sheetName) {
      this.activeSheet = "";
      this.switchSheet(nextSheet);
    }
    if (recordUndo) this._recordHistory({ type: "sheet-delete", sheet: sheetName, index, snapshot, nextSheet });
    return true;
  }

  _renderVirtualRows(startRow, endRow) {
    if (!this.tbody || !this.topSpacer || !this.bottomSpacer) return;

    startRow = Math.max(1, startRow);
    endRow = Math.min(this.rowCount, endRow);
    this.currentStartRow = startRow;
    this.currentEndRow = endRow;

    // Cập nhật khoảng cách cuộn ảo
    const topHeight = (startRow - 1) * this.rowHeight;
    const bottomHeight = Math.max(0, this.rowCount - endRow) * this.rowHeight;
    const topTd = this.topSpacer.querySelector("td");
    if (topTd) topTd.style.height = `${topHeight}px`;
    const bottomTd = this.bottomSpacer.querySelector("td");
    if (bottomTd) bottomTd.style.height = `${bottomHeight}px`;

    // Xóa các hàng cũ nằm giữa topSpacer và bottomSpacer
    while (this.topSpacer.nextSibling && this.topSpacer.nextSibling !== this.bottomSpacer) {
      this.tbody.removeChild(this.topSpacer.nextSibling);
    }

    const frag = document.createDocumentFragment();
    for (let r = startRow; r <= endRow; r++) {
      if (this.hiddenRows.has(r)) continue;

      const tr = document.createElement("tr");
      tr.dataset.row = r;

      const thRow = document.createElement("th");
      thRow.className = "vno-row-header";
      thRow.textContent = r;
      tr.appendChild(thRow);

      this.cols.forEach(c => {
        const td = document.createElement("td");
        td.className = "vno-grid-cell";
        const coordKey = `${c}${r}`;
        td.dataset.coord = coordKey;
        td.dataset.col = c;
        td.dataset.row = r;

        const itm = this.cellsData.get(coordKey);
        if (itm) {
          td.textContent = itm.val ?? "";
          if (itm.style) this._applyStylesToDom(td, itm.style);
        }
        this._applyRuleVisuals(td, c, r);

        if (this.selectedCoord.c === c && this.selectedCoord.r === r) {
          td.classList.add("is-selected");
          const handle = document.createElement("div");
          handle.className = "vno-cell-autofill-handle";
          td.appendChild(handle);
        }
        if (this._rangeContains(this.selectionRange, c, r) &&
            (this.selectionRange.start.c !== this.selectionRange.end.c || this.selectionRange.start.r !== this.selectionRange.end.r)) {
          td.classList.add("is-range-selected");
        }

        td.addEventListener("click", event => this.selectCell(c, r, event.shiftKey));
        td.addEventListener("dblclick", () => this.focusFormulaInput());

        tr.appendChild(td);
      });

      frag.appendChild(tr);
    }

    this.tbody.insertBefore(frag, this.bottomSpacer);
  }

  _onViewportScroll() {
    if (!this.viewport) return;
    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight || 500;
    const visibleCount = Math.ceil(viewportHeight / this.rowHeight);
    const buffer = 8;
    const startRow = Math.max(1, Math.floor(scrollTop / this.rowHeight) - buffer);
    const endRow = Math.min(this.rowCount, startRow + visibleCount + buffer * 2);

    if (Math.abs(startRow - this.currentStartRow) >= 3 || Math.abs(endRow - this.currentEndRow) >= 3) {
      this._renderVirtualRows(startRow, endRow);
    }
  }

  _bindGridKeyboardNavigation() {
    this.container.addEventListener("keydown", (e) => {
      if (document.activeElement === this.formulaInput) return;

      const colIdx = this.cols.indexOf(this.selectedCoord.c);
      let nextCol = this.selectedCoord.c;
      let nextRow = this.selectedCoord.r;

      if (e.key === "ArrowUp") nextRow = Math.max(1, nextRow - 1);
      else if (e.key === "ArrowDown" || e.key === "Enter") nextRow = Math.min(this.rowCount, nextRow + 1);
      else if (e.key === "ArrowLeft") nextCol = this.cols[Math.max(0, colIdx - 1)];
      else if (e.key === "ArrowRight" || e.key === "Tab") nextCol = this.cols[Math.min(this.cols.length - 1, colIdx + 1)];
      else if (e.key === "F2") {
        e.preventDefault();
        this.focusFormulaInput();
        return;
      } else if (e.key === "=" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.formulaInput.value = "=";
        this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, "=");
        this.focusFormulaInput();
        if (this.autocomplete) {
          this.autocomplete.handleInput("=", 1);
        }
        return;
      } else return;

      e.preventDefault();
      this.selectCell(nextCol, nextRow);
    });
  }

  focusFormulaInput() {
    if (this.formulaInput) {
      this.formulaInput.focus();
      this.formulaInput.select();
    }
  }

  _populateInitialData() {
    this.setCellValue("A", 1, "BẢNG DỰ TOÁN KINH PHÍ PHÁT TRIỂN VN OFFICE 2026");
    this.setStyle("fontWeight", "bold");
    this.setStyle("fontSize", "14px");
    this.setStyle("color", "#0f6d38");

    const headers = [
      { col: "A", val: "STT" },
      { col: "B", val: "Hạng mục nhiệm vụ" },
      { col: "C", val: "Khối lượng" },
      { col: "D", val: "Đơn vị tính" },
      { col: "E", val: "Đơn giá (VNĐ)" },
      { col: "F", val: "Thành tiền (VNĐ)" }
    ];

    headers.forEach(h => {
      this.setCellValue(h.col, 3, h.val);
      this.selectedCoord = { c: h.col, r: 3 };
      this.setStyle("fontWeight", "bold");
      this.setStyle("backgroundColor", "#f1f5f9");
    });

    const rows = [
      ["1", "Thiết kế giao diện thuần Việt & UI Kit", "1", "Gói", "25.000.000 ₫", "25.000.000 ₫"],
      ["2", "Tích hợp lõi xử lý văn bản LibreOffice Core", "1", "Hệ thống", "45.000.000 ₫", "45.000.000 ₫"],
      ["3", "Xây dựng cầu nối UNO Bridge & Command Bus", "1", "Module", "30.000.000 ₫", "30.000.000 ₫"],
      ["4", "Bộ kiểm thử tương thích chuẩn OOXML", "2", "Đợt", "10.000.000 ₫", "20.000.000 ₫"]
    ];

    rows.forEach((rData, idx) => {
      const r = 4 + idx;
      this.setCellValue("A", r, rData[0]);
      this.setCellValue("B", r, rData[1]);
      this.setCellValue("C", r, rData[2]);
      this.setCellValue("D", r, rData[3]);
      this.setCellValue("E", r, rData[4]);
      this.setCellValue("F", r, rData[5]);
    });

    this.setCellValue("B", 8, "TỔNG CỘNG:");
    this.setCellValue("F", 8, "=SUM(F4:F7)");
    this.selectedCoord = { c: "B", r: 8 };
    this.setStyle("fontWeight", "bold");
    this.selectedCoord = { c: "F", r: 8 };
    this.setStyle("fontWeight", "bold");
    this.setStyle("color", "#0f6d38");
  }

  selectCell(col, row, extendRange = false) {
    if (row < 1 || row > this.rowCount) return;
    if (this.autocomplete) {
      this.autocomplete.closeAll();
    }

    if (!extendRange || !this.selectionRange) {
      this.selectionRange = { start: { c: col, r: row }, end: { c: col, r: row } };
    } else {
      this.selectionRange.end = { c: col, r: row };
    }
    this.selectedCoord = { c: col, r: row };

    // Tự động cuộn viewport nếu ô nằm ngoài phạm vi hiển thị ảo
    if (this.viewport && (row < this.currentStartRow || row > this.currentEndRow)) {
      this.viewport.scrollTop = Math.max(0, (row - 5) * this.rowHeight);
      this._onViewportScroll();
    }

    this.container.querySelectorAll?.(".vno-grid-cell.is-selected, .vno-grid-cell.is-range-selected").forEach(old => {
      old.classList.remove("is-selected", "is-range-selected");
      old.querySelector(".vno-cell-autofill-handle")?.remove();
      old.querySelector(".vno-cell-validation-select")?.remove();
    });

    const coordKey = `${col}${row}`;
    const target = this.container.querySelector(`.vno-grid-cell[data-coord="${coordKey}"]`);
    if (target) {
      target.classList.add("is-selected");
      const handle = document.createElement("div");
      handle.className = "vno-cell-autofill-handle";
      target.appendChild(handle);
    }
    this.container.querySelectorAll?.(".vno-grid-cell[data-coord]").forEach(cell => {
      const inRange = this._rangeContains(this.selectionRange, cell.dataset.col, Number(cell.dataset.row));
      cell.classList.toggle("is-range-selected", inRange && this.getSelectedRangeLabel().includes(":"));
    });

    if (this.nameBox) this.nameBox.textContent = this.getSelectedRangeLabel();

    const data = this.cellsData.get(coordKey);
    const displayVal = data ? (data.formula || data.val) : "";
    if (this.formulaInput) this.formulaInput.value = displayVal;
    this._showValidationDropdown(target, col, row);

    if (this.options.onSelect) {
      this.options.onSelect(coordKey, data, this._calculateStats());
    }
  }

  setCellValue(col, row, val, recordUndo = true, historyOptions = {}) {
    const key = `${col}${row}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };

    if (recordUndo) {
      this._recordHistory({
        type: "cell",
        sheet: this.activeSheet,
        col,
        row,
        prevVal: item.formula || item.val || "",
        nextVal: val,
        timestamp: Date.now()
      }, historyOptions);
    }

    if (typeof val === "string" && val.startsWith("=")) {
      item.formula = val;
      const calculated = this.formulaEngine.evaluate(val);
      if (typeof calculated === "number" && !val.toLowerCase().includes("count") && !val.toLowerCase().includes("len")) {
        item.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(calculated);
      } else {
        item.val = calculated;
      }
    } else {
      item.formula = "";
      item.val = val;
    }

    this.cellsData.set(key, item);

    const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    if (cell) {
      cell.textContent = item.val;
      this._applyStylesToDom(cell, item.style);
      this._applyRuleVisuals(cell, col, row);
    }

    // Tự động tính toán lại các ô có công thức khác
    this._recalculateAllFormulas(key);
    this.refreshCharts();
  }

  _recalculateAllFormulas(excludeKey) {
    for (const [k, itm] of this.cellsData.entries()) {
      if (k !== excludeKey && itm.formula) {
        const res = this.formulaEngine.evaluate(itm.formula);
        if (typeof res === "number" && !itm.formula.toLowerCase().includes("count")) {
          itm.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(res);
        } else {
          itm.val = res;
        }
        const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${k}"]`);
        if (dom) {
          dom.textContent = itm.val;
          this._applyRuleVisuals(dom, ...this._splitCoord(k));
        }
      }
    }
    this._refreshVisibleRuleVisuals();
  }

  insertFormula(funcName = "SUM") {
    const col = this.selectedCoord.c;
    const r = this.selectedCoord.r;
    const startR = Math.max(1, r - 4);
    const endR = Math.max(1, r - 1);
    const formulaStr = `=${funcName}(${col}${startR}:${col}${endR})`;
    this.setCellValue(col, r, formulaStr);
    if (this.formulaInput) this.formulaInput.value = formulaStr;
    return true;
  }

  showFunctionDialog() {
    const modal = document.createElement("div");
    modal.className = "vno-dialog-overlay";

    let selectedCat = "Tất cả";
    let selectedFunc = FUNCTION_CATALOG[0];

    const renderFuncList = () => {
      const listEl = modal.querySelector("#vno-func-list");
      listEl.innerHTML = "";

      const filtered = selectedCat === "Tất cả" 
        ? FUNCTION_CATALOG 
        : FUNCTION_CATALOG.filter(f => f.category === selectedCat);

      filtered.forEach((f, idx) => {
        const item = document.createElement("div");
        item.className = `vno-func-item ${f.name === selectedFunc.name ? "is-selected" : ""}`;
        item.style.cssText = `padding:6px 12px; cursor:pointer; font-size:12px; font-weight:600; font-family:monospace; border-radius:3px; background:${f.name === selectedFunc.name ? "#e7f4ec" : "transparent"}; color:${f.name === selectedFunc.name ? "#0f6d38" : "#0f172a"};`;
        item.textContent = f.name;

        item.addEventListener("click", () => {
          selectedFunc = f;
          renderFuncList();
          renderDesc();
        });
        listEl.appendChild(item);
      });
    };

    const renderDesc = () => {
      modal.querySelector("#vno-func-syntax").textContent = `=${selectedFunc.syntax}`;
      modal.querySelector("#vno-func-desc").textContent = selectedFunc.desc;
    };

    modal.innerHTML = `
      <div class="vno-dialog-box" style="width:580px;">
        <div class="vno-dialog-header">
          <span>Chèn Hàm (Insert Function fx)</span>
          <button class="vno-btn" id="vno-fx-close" style="font-size:16px;">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;font-weight:600;">Danh mục hàm:</span>
            <select class="vno-select" id="vno-func-cat-select" style="flex:1;">
              <option value="Tất cả">Tất cả các hàm</option>
              <option value="Toán học">Toán học & Lượng giác</option>
              <option value="Thống kê">Thống kê (AVERAGE, COUNT...)</option>
              <option value="Logic">Logic (IF, AND, OR...)</option>
              <option value="Văn bản">Văn bản (CONCAT, LEN...)</option>
              <option value="Ngày tháng">Ngày & Giờ (TODAY, NOW...)</option>
            </select>
          </div>

          <div style="display:flex;gap:12px;height:180px;">
            <div id="vno-func-list" style="width:180px;border:1px solid #cbd5e1;border-radius:4px;overflow-y:auto;padding:4px;"></div>
            <div style="flex:1;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:8px;">
              <strong id="vno-func-syntax" style="font-family:monospace;color:#0f6d38;font-size:13px;"></strong>
              <p id="vno-func-desc" style="font-size:12px;color:#334155;line-height:1.5;"></p>
            </div>
          </div>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn" id="vno-fx-cancel-btn">Hủy bỏ</button>
          <button class="vno-btn vno-btn-primary" id="vno-fx-insert-btn">Chèn hàm vào ô</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    renderFuncList();
    renderDesc();

    const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
    modal.querySelector("#vno-fx-close").addEventListener("click", close);
    modal.querySelector("#vno-fx-cancel-btn").addEventListener("click", close);

    modal.querySelector("#vno-func-cat-select").addEventListener("change", (e) => {
      selectedCat = e.target.value;
      const filtered = selectedCat === "Tất cả" 
        ? FUNCTION_CATALOG 
        : FUNCTION_CATALOG.filter(f => f.category === selectedCat);
      if (filtered[0]) selectedFunc = filtered[0];
      renderFuncList();
      renderDesc();
    });

    modal.querySelector("#vno-fx-insert-btn").addEventListener("click", () => {
      close();
      const template = `=${selectedFunc.syntax.replace(/\s*\[.*?\]/g, "")}`;
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, template);
      this.focusFormulaInput();
    });
  }

  openChartBuilder() {
    const range = this._normalizeRange(this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const extracted = SheetChartBuilder.extractRangeData(this.cellsData, range, this.cols);
    const dataItems = extracted.labels.map((label, index) => ({ label, value: extracted.data[index] }));
    const rangeLabel = this._rangeLabel(range);
    return SheetChartBuilder.showChartModal(dataItems, chartType => this.insertChart(chartType, range), {
      rangeLabel,
      title: `Biểu đồ ${rangeLabel}`
    });
  }

  insertChart(type, range = this.selectionRange, recordUndo = true) {
    if (!SheetChartBuilder.supportedTypes.includes(type)) return false;
    const normalizedRange = this._normalizeRange(range);
    const chart = {
      id: `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      range: normalizedRange,
      title: `Biểu đồ ${this._rangeLabel(normalizedRange)}`,
      labels: [],
      data: []
    };
    this.chartsBySheet[this.activeSheet] ||= [];
    this.chartsBySheet[this.activeSheet].push(chart);
    this._updateChartData(chart);
    this.renderCharts();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: this.activeSheet, collection: "chartsBySheet", operation: "insert", index: this.chartsBySheet[this.activeSheet].length - 1, item: structuredClone(chart) });
    return chart;
  }

  getCharts(sheetName = this.activeSheet) {
    return [...(this.chartsBySheet[sheetName] || [])];
  }

  deleteChart(chartId, sheetName = this.activeSheet, recordUndo = true) {
    const charts = this.chartsBySheet[sheetName] || [];
    const index = charts.findIndex(chart => chart.id === chartId);
    if (index < 0) return false;
    const [chart] = charts.splice(index, 1);
    if (sheetName === this.activeSheet) this.renderCharts();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: sheetName, collection: "chartsBySheet", operation: "delete", index, item: structuredClone(chart) });
    return true;
  }

  _rangeLabel(range) {
    const first = `${range.start.c}${range.start.r}`;
    const last = `${range.end.c}${range.end.r}`;
    return first === last ? first : `${first}:${last}`;
  }

  _updateChartData(chart) {
    const extracted = SheetChartBuilder.extractRangeData(this.cellsData, chart.range, this.cols);
    chart.labels = extracted.labels;
    chart.data = extracted.data;
    return chart;
  }

  refreshCharts() {
    for (const chart of this.chartsBySheet[this.activeSheet] || []) this._updateChartData(chart);
    this.renderCharts();
  }

  renderCharts() {
    if (!this.chartLayer || typeof document === "undefined") return;
    this.chartLayer.innerHTML = "";
    for (const chart of this.chartsBySheet[this.activeSheet] || []) {
      const panel = document.createElement("section");
      const colOffset = Math.max(0, this.cols.indexOf(chart.range.end.c) + 1) * 100 + 46;
      const rowOffset = Math.max(0, chart.range.start.r - 1) * this.rowHeight + 28;
      panel.className = "vno-sheet-chart";
      panel.dataset.chartId = chart.id;
      panel.dataset.sheet = this.activeSheet;
      panel.style.cssText = `position:absolute;left:${colOffset}px;top:${rowOffset}px;width:520px;height:300px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);pointer-events:auto;overflow:hidden`;
      panel.innerHTML = `<button type="button" data-chart-delete aria-label="Xóa biểu đồ" title="Xóa biểu đồ" style="position:absolute;right:6px;top:4px;z-index:1;border:0;background:#fff;border-radius:4px;font-size:18px;cursor:pointer">&times;</button>${SheetChartBuilder.generateSvg(chart)}`;
      panel.querySelector("[data-chart-delete]")?.addEventListener("click", () => this.deleteChart(chart.id));
      this.chartLayer.appendChild(panel);
    }
  }

  insertCurrentDate() {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, dateStr);
    return true;
  }

  formatCurrentCellCurrencyVND() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;

    const num = parseFloat(data.val.toString().replace(/\./g, "").replace(/[^\d-]/g, ""));
    if (!isNaN(num)) {
      data.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
      this.cellsData.set(key, data);
      const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
      if (cell) cell.textContent = data.val;
    }
    return true;
  }

  formatCurrentCellPercent() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;
    const num = parseFloat(data.val.toString().replace(/[^\d.]/g, ""));
    if (!isNaN(num)) {
      data.val = `${num}%`;
      this.cellsData.set(key, data);
      const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
      if (cell) cell.textContent = data.val;
    }
    return true;
  }

  formatCurrentCellStandard() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;
    const num = parseFloat(data.val.toString().replace(/\./g, "").replace(/[^\d-]/g, ""));
    if (!isNaN(num)) {
      data.val = new Intl.NumberFormat("vi-VN").format(num);
      this.cellsData.set(key, data);
      const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
      if (cell) cell.textContent = data.val;
    }
    return true;
  }

  setStyle(prop, val, recordUndo = true) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };
    const prevVal = item.style[prop] || "";

    if (recordUndo) {
      this._recordHistory({
        type: "style",
        sheet: this.activeSheet,
        col: this.selectedCoord.c,
        row: this.selectedCoord.r,
        prop,
        prevVal,
        nextVal: val
      });
    }

    item.style[prop] = val;
    this.cellsData.set(key, item);

    const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    if (cell) cell.style[prop] = val;
    return true;
  }

  toggleStyle(prop, valOn, valOff) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };
    const cur = item.style[prop];
    const next = cur === valOn ? valOff : valOn;
    return this.setStyle(prop, next);
  }

  _recordHistory(action, { coalesce = false } = {}) {
    const previous = this.undoStack[this.undoStack.length - 1];
    const mergeCellEdit = coalesce && previous?.type === "cell" && action.type === "cell" &&
      previous.sheet === action.sheet && previous.col === action.col && previous.row === action.row &&
      action.timestamp - previous.timestamp <= this.historyMergeWindowMs;
    if (mergeCellEdit) {
      previous.nextVal = action.nextVal;
      previous.timestamp = action.timestamp;
    } else {
      this.undoStack.push(action);
      if (this.undoStack.length > this.maxHistorySteps) this.undoStack.shift();
    }
    this.redoStack = [];
    this._syncCommandStates();
  }

  _syncCommandStates() {
    globalCommandBus?.updateState?.("common.edit.undo", { enabled: this.undoStack.length > 0 });
    globalCommandBus?.updateState?.("common.edit.redo", { enabled: this.redoStack.length > 0 });
    globalCommandBus?.updateState?.("sheet.view.freezePanes", { checked: !!this.isFrozenPanes });
    globalCommandBus?.updateState?.("sheet.data.filter", { checked: !!this.isFilterActive });
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) { this._syncCommandStates(); return false; }
    const applied = this._applyHistoryAction(action, "undo");
    if (applied) this.redoStack.push(action);
    else this.undoStack.push(action);
    this._syncCommandStates();
    return applied;
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) { this._syncCommandStates(); return false; }
    const applied = this._applyHistoryAction(action, "redo");
    if (applied) {
      this.undoStack.push(action);
      if (this.undoStack.length > this.maxHistorySteps) this.undoStack.shift();
    } else this.redoStack.push(action);
    this._syncCommandStates();
    return applied;
  }

  _applyHistoryAction(action, direction) {
    if (action.type === "sheet-add") {
      if (direction === "undo") {
        const removed = this.deleteSheet(action.sheetName, false);
        if (removed && this.sheets.includes(action.previousSheet)) this.switchSheet(action.previousSheet);
        return removed;
      }
      this._restoreSheet(action.sheetName, action.snapshot, this.sheets.length);
      this.switchSheet(action.sheetName);
      return true;
    }
    if (action.type === "sheet-delete") {
      if (direction === "undo") {
        this._restoreSheet(action.sheet, action.snapshot, action.index);
        this.switchSheet(action.sheet);
        return true;
      }
      return this.deleteSheet(action.sheet, false);
    }
    if (action.sheet && action.sheet !== this.activeSheet) this.switchSheet(action.sheet);
    const value = direction === "undo" ? "prevVal" : "nextVal";
    if (action.type === "cell") {
      this.setCellValue(action.col, action.row, action[value], false);
      this.selectCell(action.col, action.row);
    } else if (action.type === "style") {
      this.selectedCoord = { c: action.col, r: action.row };
      this.setStyle(action.prop, action[value], false);
    } else if (action.type === "sort") {
      this._restoreCells(direction === "undo" ? action.before : action.after);
    } else if (action.type === "pivot-refresh") {
      this._restoreCells(direction === "undo" ? action.before : action.after);
    } else if (action.type === "collection") {
      const collection = this[action.collection][action.sheet] ||= [];
      const shouldInsert = (action.operation === "insert") === (direction === "redo");
      if (shouldInsert) collection.splice(action.index, 0, structuredClone(action.item));
      else {
        const index = collection.findIndex(item => item.id === action.item.id);
        if (index >= 0) collection.splice(index, 1);
      }
      action.collection === "chartsBySheet" ? this.renderCharts() : this._refreshVisibleRuleVisuals();
    } else if (action.type === "named-range") {
      const collection = action.scope === "workbook" ? this.namedRangesWorkbook : (this.namedRangesBySheet[action.sheet] ||= []);
      const desired = direction === "undo" ? action.before : action.after;
      const currentIndex = collection.findIndex(item => item.id === action.id);
      if (currentIndex >= 0) collection.splice(currentIndex, 1);
      if (desired) collection.splice(Math.min(action.index, collection.length), 0, structuredClone(desired));
      this._recalculateAllFormulas();
    } else if (action.type === "freeze") {
      this._setFreezePanes(action[value], false);
    } else if (action.type === "filter") {
      this._restoreFilterState(action[value]);
    } else return false;
    return true;
  }

  toggleFreezePanes() {
    return this._setFreezePanes(!this.isFrozenPanes, true);
  }

  _setFreezePanes(value, recordUndo = false) {
    const previous = !!this.isFrozenPanes;
    this.isFrozenPanes = !!value;
    if (this.container) {
      if (this.isFrozenPanes) {
        this.container.classList.add("vno-freeze-panes");
      } else {
        this.container.classList.remove("vno-freeze-panes");
      }
    }
    if (this.sheetStates[this.activeSheet]) this.sheetStates[this.activeSheet].isFrozenPanes = this.isFrozenPanes;
    if (recordUndo && previous !== this.isFrozenPanes) this._recordHistory({ type: "freeze", sheet: this.activeSheet, prevVal: previous, nextVal: this.isFrozenPanes });
    this._syncCommandStates();
    return this.isFrozenPanes;
  }

  sort(col = this.selectedCoord.c, ascending = true) {
    const before = this._snapshotCells();
    // Thu thập các hàng dữ liệu cần sắp xếp
    const rowsWithData = [];
    for (const [key, item] of this.cellsData.entries()) {
      if ((item.val !== "" && item.val !== undefined) || item.formula) {
        const m = key.match(/^([A-Z]+)(\d+)$/);
        if (m) {
          const r = parseInt(m[2], 10);
          const isTotalRow = (item.formula && item.formula.toLowerCase().includes("sum")) || String(item.val).toLowerCase().includes("tổng");
          if (r >= 4 && !isTotalRow && !rowsWithData.includes(r)) {
            rowsWithData.push(r);
          }
        }
      }
    }

    if (rowsWithData.length < 2) {
      rowsWithData.push(4, 5, 6, 7);
    }

    rowsWithData.sort((a, b) => a - b);
    const minRow = rowsWithData[0];
    const maxRow = rowsWithData[rowsWithData.length - 1];

    const rowSnapshots = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData = {};
      this.cols.forEach(c => {
        const k = `${c}${r}`;
        const itm = this.cellsData.get(k);
        if (itm) rowData[c] = { ...itm, style: { ...itm.style } };
      });
      const sortVal = rowData[col]?.val ?? "";
      rowSnapshots.push({ originalRow: r, data: rowData, sortVal });
    }

    rowSnapshots.sort((a, b) => {
      const vA = a.sortVal;
      const vB = b.sortVal;
      const numA = typeof vA === "number" ? vA : parseFloat(String(vA).replace(/\./g, "").replace(/[^\d-]/g, ""));
      const numB = typeof vB === "number" ? vB : parseFloat(String(vB).replace(/\./g, "").replace(/[^\d-]/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return ascending ? numA - numB : numB - numA;
      }
      return ascending 
        ? String(vA).localeCompare(String(vB), "vi-VN") 
        : String(vB).localeCompare(String(vA), "vi-VN");
    });

    rowSnapshots.forEach((snap, idx) => {
      const targetRow = minRow + idx;
      this.cols.forEach(c => {
        const k = `${c}${targetRow}`;
        if (snap.data[c]) {
          this.cellsData.set(k, { ...snap.data[c] });
        } else {
          this.cellsData.delete(k);
        }
      });
    });

    this._renderVirtualRows(this.currentStartRow, this.currentEndRow);
    this._recalculateAllFormulas();
    this._recordHistory({ type: "sort", sheet: this.activeSheet, col, ascending, before, after: this._snapshotCells() });
    return true;
  }

  toggleFilter() {
    const previous = this._snapshotFilterState();
    this.isFilterActive = !this.isFilterActive;
    if (this.container) {
      if (this.isFilterActive) {
        this.container.classList.add("vno-filter-mode");
      } else {
        this.container.classList.remove("vno-filter-mode");
        this.hiddenRows.clear();
        this.activeFilters.clear();
      }
    }
    this._updateFilterButtons();
    this._renderVirtualRows(this.currentStartRow, this.currentEndRow);
    this._recordHistory({ type: "filter", sheet: this.activeSheet, prevVal: previous, nextVal: this._snapshotFilterState() });
    this._syncCommandStates();
    return this.isFilterActive;
  }

  _updateFilterButtons() {
    if (!this.container) return;
    const btns = this.container.querySelectorAll(".vno-filter-btn");
    btns.forEach(btn => {
      btn.style.display = this.isFilterActive ? "inline-flex" : "none";
      const col = btn.dataset.col;
      if (this.activeFilters.has(col)) {
        btn.classList.add("is-active");
      } else {
        btn.classList.remove("is-active");
      }
    });
  }

  openFilterMenu(col, anchorBtn) {
    if (typeof document === "undefined") return;
    const old = document.querySelector(".vno-filter-popover");
    if (old) old.remove();

    const popover = document.createElement("div");
    popover.className = "vno-filter-popover";

    const valuesSet = new Set();
    for (const [k, itm] of this.cellsData.entries()) {
      const m = k.match(/^([A-Z]+)(\d+)$/);
      if (m && m[1] === col) {
        const r = parseInt(m[2], 10);
        if (r >= 4 && itm.val !== undefined && itm.val !== "") {
          valuesSet.add(String(itm.val));
        }
      }
    }
    const uniqueVals = Array.from(valuesSet);
    const currentAllowed = this.activeFilters.get(col) || new Set(uniqueVals);

    popover.innerHTML = `
      <div class="vno-filter-popover-item" id="vno-filter-sort-asc">
        <span>▲ Sắp xếp tăng dần (A-Z)</span>
      </div>
      <div class="vno-filter-popover-item" id="vno-filter-sort-desc">
        <span>▼ Sắp xếp giảm dần (Z-A)</span>
      </div>
      <div style="height:1px;background:#e2e8f0;margin:2px 0;"></div>
      <div style="font-weight:600;font-size:11px;color:#475569;">Lọc theo giá trị:</div>
      <div class="vno-filter-values-list">
        ${uniqueVals.map(val => `
          <label class="vno-filter-value-row">
            <input type="checkbox" value="${val}" ${currentAllowed.has(val) ? "checked" : ""} />
            <span>${val}</span>
          </label>
        `).join("")}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <button class="vno-btn" id="vno-filter-select-all" style="font-size:10px;padding:2px 6px;">Tất cả</button>
        <button class="vno-btn" id="vno-filter-clear-all" style="font-size:10px;padding:2px 6px;">Bỏ chọn</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end;">
        <button class="vno-btn" id="vno-filter-cancel" style="padding:4px 8px;font-size:11px;">Hủy</button>
        <button class="vno-btn vno-btn-primary" id="vno-filter-apply" style="padding:4px 8px;font-size:11px;">Áp dụng</button>
      </div>
    `;

    document.body.appendChild(popover);

    if (anchorBtn && anchorBtn.getBoundingClientRect) {
      const rect = anchorBtn.getBoundingClientRect();
      popover.style.top = `${rect.bottom + (window.scrollY || 0) + 2}px`;
      popover.style.left = `${Math.min((window.innerWidth || 800) - 220, Math.max(10, rect.left + (window.scrollX || 0) - 80))}px`;
    }

    popover.querySelector("#vno-filter-sort-asc")?.addEventListener("click", () => {
      this.sort(col, true);
      popover.remove();
    });
    popover.querySelector("#vno-filter-sort-desc")?.addEventListener("click", () => {
      this.sort(col, false);
      popover.remove();
    });

    popover.querySelector("#vno-filter-select-all")?.addEventListener("click", () => {
      popover.querySelectorAll(".vno-filter-value-row input").forEach(cb => cb.checked = true);
    });
    popover.querySelector("#vno-filter-clear-all")?.addEventListener("click", () => {
      popover.querySelectorAll(".vno-filter-value-row input").forEach(cb => cb.checked = false);
    });

    popover.querySelector("#vno-filter-cancel")?.addEventListener("click", () => popover.remove());

    popover.querySelector("#vno-filter-apply")?.addEventListener("click", () => {
      const allowed = new Set();
      popover.querySelectorAll(".vno-filter-value-row input:checked").forEach(cb => allowed.add(cb.value));
      this.applyFilter(col, allowed);
      popover.remove();
    });

    const onDocClick = (e) => {
      if (!popover.contains(e.target) && e.target !== anchorBtn) {
        popover.remove();
        document.removeEventListener("click", onDocClick);
      }
    };
    setTimeout(() => document.addEventListener("click", onDocClick), 10);
  }

  applyFilter(col, allowedSet, recordUndo = true) {
    const previous = this._snapshotFilterState();
    this.activeFilters.set(col, allowedSet);
    this.hiddenRows.clear();

    for (let r = 4; r <= this.rowCount; r++) {
      let shouldHide = false;
      for (const [filterCol, allowed] of this.activeFilters.entries()) {
        const key = `${filterCol}${r}`;
        const itm = this.cellsData.get(key);
        const val = itm ? String(itm.val ?? "") : "";
        if (val && !allowed.has(val)) {
          shouldHide = true;
          break;
        }
      }
      if (shouldHide) this.hiddenRows.add(r);
    }

    this._updateFilterButtons();
    this._renderVirtualRows(this.currentStartRow, this.currentEndRow);
    if (recordUndo) this._recordHistory({ type: "filter", sheet: this.activeSheet, prevVal: previous, nextVal: this._snapshotFilterState() });
  }

  _snapshotCells(sheetName = this.activeSheet) {
    return Array.from((this.sheetsData[sheetName] || new Map()).entries(), ([key, value]) => [key, structuredClone(value)]);
  }

  _restoreCells(entries) {
    this.sheetsData[this.activeSheet] = new Map(entries.map(([key, value]) => [key, structuredClone(value)]));
    this._renderVirtualRows(this.currentStartRow, this.currentEndRow);
    this._recalculateAllFormulas();
    this.refreshCharts();
  }

  _snapshotFilterState() {
    return {
      isFilterActive: !!this.isFilterActive,
      hiddenRows: [...this.hiddenRows],
      activeFilters: Array.from(this.activeFilters, ([col, values]) => [col, [...values]])
    };
  }

  _restoreFilterState(snapshot) {
    this.isFilterActive = !!snapshot.isFilterActive;
    this.hiddenRows = new Set(snapshot.hiddenRows);
    this.activeFilters = new Map(snapshot.activeFilters.map(([col, values]) => [col, new Set(values)]));
    const state = this.sheetStates[this.activeSheet];
    if (state) Object.assign(state, { isFilterActive: this.isFilterActive, hiddenRows: new Set(this.hiddenRows), activeFilters: new Map(this.activeFilters) });
    this.container?.classList?.toggle?.("vno-filter-mode", this.isFilterActive);
    this._updateFilterButtons();
    this._renderVirtualRows(this.currentStartRow, this.currentEndRow);
  }

  _snapshotSheet(sheetName) {
    const savedState = this.sheetStates[sheetName] || {};
    const state = sheetName === this.activeSheet ? {
      hiddenRows: this.hiddenRows,
      activeFilters: this.activeFilters,
      isFilterActive: this.isFilterActive,
      isFrozenPanes: this.isFrozenPanes,
      selectedCoord: this.selectedCoord
    } : savedState;
    return {
      cells: this._snapshotCells(sheetName),
      state: {
        hiddenRows: [...(state.hiddenRows || [])],
        activeFilters: Array.from(state.activeFilters || [], ([col, values]) => [col, [...values]]),
        isFilterActive: !!state.isFilterActive,
        isFrozenPanes: !!state.isFrozenPanes,
        selectedCoord: { ...(state.selectedCoord || { r: 1, c: "A" }) }
      },
      conditionalFormatting: structuredClone(this.conditionalFormattingBySheet[sheetName] || []),
      dataValidations: structuredClone(this.dataValidationsBySheet[sheetName] || []),
      charts: structuredClone(this.chartsBySheet[sheetName] || []),
      pivotTables: structuredClone(this.pivotTablesBySheet[sheetName] || []),
      namedRanges: structuredClone(this.namedRangesBySheet[sheetName] || [])
    };
  }

  _restoreSheet(sheetName, snapshot, index) {
    if (!this.sheets.includes(sheetName)) this.sheets.splice(Math.min(index, this.sheets.length), 0, sheetName);
    this.sheetsData[sheetName] = new Map(snapshot.cells.map(([key, value]) => [key, structuredClone(value)]));
    this.sheetStates[sheetName] = {
      hiddenRows: new Set(snapshot.state.hiddenRows),
      activeFilters: new Map(snapshot.state.activeFilters.map(([col, values]) => [col, new Set(values)])),
      isFilterActive: snapshot.state.isFilterActive,
      isFrozenPanes: snapshot.state.isFrozenPanes,
      selectedCoord: { ...snapshot.state.selectedCoord }
    };
    this.conditionalFormattingBySheet[sheetName] = structuredClone(snapshot.conditionalFormatting);
    this.dataValidationsBySheet[sheetName] = structuredClone(snapshot.dataValidations);
    this.chartsBySheet[sheetName] = structuredClone(snapshot.charts);
    this.pivotTablesBySheet[sheetName] = structuredClone(snapshot.pivotTables || []);
    this.namedRangesBySheet[sheetName] = structuredClone(snapshot.namedRanges || []);
    const tabs = this.tabBar?.querySelector?.("#vno-sheet-tabs-list");
    if (tabs && typeof document !== "undefined" && !this.tabBar.querySelector?.(`.vno-sheet-tab-item[data-sheet="${sheetName}"]`)) {
      const tab = document.createElement("div");
      tab.className = "vno-sheet-tab-item";
      tab.dataset.sheet = sheetName;
      tab.textContent = sheetName;
      tab.addEventListener("click", () => this.switchSheet(sheetName));
      tabs.appendChild(tab);
    }
  }

  _deleteCollectionItem(collectionName, itemId, sheetName, recordUndo) {
    const collection = this[collectionName][sheetName] || [];
    const index = collection.findIndex(item => item.id === itemId);
    if (index < 0) return false;
    const [item] = collection.splice(index, 1);
    if (sheetName === this.activeSheet) this._refreshVisibleRuleVisuals();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: sheetName, collection: collectionName, operation: "delete", index, item: structuredClone(item) });
    return true;
  }

  updateStatus() {
    const coordKey = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(coordKey);
    if (this.options.onSelect) {
      this.options.onSelect(coordKey, data, this._calculateStats());
    }
  }

  _splitCoord(coord) {
    const match = String(coord).match(/^([A-Z]+)(\d+)$/);
    return match ? [match[1], Number(match[2])] : ["A", 1];
  }

  _normalizeRange(range = this.selectionRange) {
    const start = range?.start || this.selectedCoord;
    const end = range?.end || start;
    const startCol = this.cols.indexOf(start.c);
    const endCol = this.cols.indexOf(end.c);
    return {
      start: { c: this.cols[Math.min(startCol, endCol)], r: Math.min(start.r, end.r) },
      end: { c: this.cols[Math.max(startCol, endCol)], r: Math.max(start.r, end.r) }
    };
  }

  getSelectedRangeLabel() {
    const range = this._normalizeRange();
    const first = `${range.start.c}${range.start.r}`;
    const last = `${range.end.c}${range.end.r}`;
    return first === last ? first : `${first}:${last}`;
  }

  resolveNamedRange(name, sheetName = this.activeSheet) {
    const key = String(name).trim().toLocaleLowerCase();
    return (this.namedRangesBySheet[sheetName] || []).find(item => item.name.toLocaleLowerCase() === key) ||
      this.namedRangesWorkbook.find(item => item.name.toLocaleLowerCase() === key) || null;
  }

  validateNamedRangeName(name, editingId = null, scope = "workbook", sheetName = this.activeSheet) {
    const value = String(name || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value) || /^[A-Za-z]+\d+$/.test(value)) return false;
    const collection = scope === "workbook" ? this.namedRangesWorkbook : (this.namedRangesBySheet[sheetName] || []);
    return !collection.some(item => item.id !== editingId && item.name.toLocaleLowerCase() === value.toLocaleLowerCase());
  }

  saveNamedRange(config, recordUndo = true) {
    config = config || {};
    const scope = config.scope === "sheet" ? "sheet" : "workbook";
    const sheet = config.sheet || this.activeSheet;
    const ref = String(config.ref || "").replace(/\$/g, "").toUpperCase();
    if (!this.validateNamedRangeName(config.name, config.id, scope, sheet) || !/^[A-Z]+\d+(?::[A-Z]+\d+)?$/.test(ref)) return false;
    const collection = scope === "workbook" ? this.namedRangesWorkbook : (this.namedRangesBySheet[sheet] ||= []);
    const oldIndex = collection.findIndex(item => item.id === config.id);
    const before = oldIndex >= 0 ? structuredClone(collection[oldIndex]) : null;
    const item = { id: config.id || `name-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: String(config.name).trim(), ref, scope, sheet: scope === "sheet" ? sheet : null };
    const index = oldIndex >= 0 ? oldIndex : collection.length;
    oldIndex >= 0 ? collection.splice(oldIndex, 1, item) : collection.push(item);
    if (recordUndo) this._recordHistory({ type: "named-range", sheet, scope, id: item.id, index, before, after: structuredClone(item) });
    this._recalculateAllFormulas();
    return item;
  }

  deleteNamedRange(id, scope = "workbook", sheetName = this.activeSheet, recordUndo = true) {
    const collection = scope === "workbook" ? this.namedRangesWorkbook : (this.namedRangesBySheet[sheetName] || []);
    const index = collection.findIndex(item => item.id === id);
    if (index < 0) return false;
    const [before] = collection.splice(index, 1);
    if (recordUndo) this._recordHistory({ type: "named-range", sheet: sheetName, scope, id, index, before: structuredClone(before), after: null });
    this._recalculateAllFormulas();
    return true;
  }

  showNameManager(options = {}) {
    options = options || {};
    if (typeof document === "undefined") return false;
    const overlay = this._createSheetDialog("Trình quản lý tên", `<div class="vno-name-manager">
      <div class="vno-name-list" role="list"></div>
      <div class="vno-name-actions"><button type="button" class="vno-btn" id="vno-name-new">Thêm mới</button><button type="button" class="vno-btn" id="vno-name-edit">Sửa</button><button type="button" class="vno-btn" id="vno-name-delete">Xóa</button></div>
      <div class="vno-name-form" hidden><label>Tên<input id="vno-name-value" autocomplete="off"></label><label>Vùng tham chiếu<input id="vno-name-ref" value="${this._escapeHtml(this.getSelectedRangeLabel())}"></label><label>Phạm vi<select id="vno-name-scope"><option value="workbook">Workbook</option><option value="sheet">Sheet: ${this._escapeHtml(this.activeSheet)}</option></select></label></div>
      <div class="vno-rule-error" role="alert"></div></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").textContent = "Lưu";
    let selected = null;
    const form = overlay.querySelector(".vno-name-form");
    const render = () => {
      const names = [...this.namedRangesWorkbook, ...(this.namedRangesBySheet[this.activeSheet] || [])];
      overlay.querySelector(".vno-name-list").innerHTML = names.length ? names.map(item => `<button type="button" class="vno-name-row" data-id="${item.id}"><strong>${this._escapeHtml(item.name)}</strong><span>${this._escapeHtml(item.ref)}</span><span>${item.scope === "workbook" ? "Workbook" : this._escapeHtml(item.sheet)}</span></button>`).join("") : `<p class="vno-name-empty">Chưa có vùng được đặt tên.</p>`;
      overlay.querySelectorAll(".vno-name-row").forEach(row => row.addEventListener("click", () => { selected = names.find(item => item.id === row.dataset.id); overlay.querySelectorAll(".vno-name-row").forEach(item => item.classList.toggle("is-selected", item === row)); }));
    };
    const openForm = item => { form.hidden = false; selected = item || null; overlay.querySelector("#vno-name-value").value = item?.name || ""; overlay.querySelector("#vno-name-ref").value = item?.ref || this.getSelectedRangeLabel(); overlay.querySelector("#vno-name-scope").value = item?.scope || "workbook"; overlay.querySelector("#vno-name-scope").disabled = !!item; overlay.querySelector("#vno-name-value").focus(); };
    overlay.querySelector("#vno-name-new").addEventListener("click", () => openForm(null));
    overlay.querySelector("#vno-name-edit").addEventListener("click", () => selected && openForm(selected));
    overlay.querySelector("#vno-name-delete").addEventListener("click", () => { if (selected && this.deleteNamedRange(selected.id, selected.scope, selected.sheet || this.activeSheet)) { selected = null; render(); } });
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      if (form.hidden) { openForm(null); return; }
      const result = this.saveNamedRange({ id: selected?.id, name: overlay.querySelector("#vno-name-value").value, ref: overlay.querySelector("#vno-name-ref").value, scope: overlay.querySelector("#vno-name-scope").value, sheet: this.activeSheet });
      if (!result) { overlay.querySelector(".vno-rule-error").textContent = "Tên hoặc vùng tham chiếu không hợp lệ/trùng lặp."; return; }
      selected = result; form.hidden = true; overlay.querySelector(".vno-rule-error").textContent = ""; render();
    });
    render();
    return true;
  }

  _rangeContains(range, col, row) {
    const normalized = this._normalizeRange(range);
    const colIndex = this.cols.indexOf(col);
    return colIndex >= this.cols.indexOf(normalized.start.c) &&
      colIndex <= this.cols.indexOf(normalized.end.c) &&
      row >= normalized.start.r && row <= normalized.end.r;
  }

  addConditionalFormattingRule(range, config, recordUndo = true) {
    const validTypes = ["greaterThan", "lessThan", "blank"];
    if (!config || !validTypes.includes(config.type)) return false;
    const numericThreshold = config.type === "blank" ? null : Number(config.value);
    if (config.type !== "blank" && !Number.isFinite(numericThreshold)) return false;
    const rule = {
      id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      range: this._normalizeRange(range),
      type: config.type,
      value: numericThreshold,
      color: config.color || "#fff2cc"
    };
    this.conditionalFormattingBySheet[this.activeSheet].push(rule);
    this._refreshVisibleRuleVisuals();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: this.activeSheet, collection: "conditionalFormattingBySheet", operation: "insert", index: this.conditionalFormattingBySheet[this.activeSheet].length - 1, item: structuredClone(rule) });
    return rule;
  }

  deleteConditionalFormattingRule(ruleId, sheetName = this.activeSheet, recordUndo = true) {
    return this._deleteCollectionItem("conditionalFormattingBySheet", ruleId, sheetName, recordUndo);
  }

  getConditionalFormattingRules(sheetName = this.activeSheet) {
    return [...(this.conditionalFormattingBySheet[sheetName] || [])];
  }

  _numericCellValue(value) {
    if (typeof value === "number") return value;
    const text = String(value ?? "").trim();
    if (!text) return NaN;
    const normalized = text.replace(/\s/g, "").replace(/₫/g, "").replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }

  _matchingConditionalRule(col, row) {
    const value = this.cellsData.get(`${col}${row}`)?.val ?? "";
    return (this.conditionalFormattingBySheet[this.activeSheet] || []).find(rule => {
      if (!this._rangeContains(rule.range, col, row)) return false;
      if (rule.type === "blank") return String(value).trim() === "";
      const numeric = this._numericCellValue(value);
      if (!Number.isFinite(numeric)) return false;
      return rule.type === "greaterThan" ? numeric > rule.value : numeric < rule.value;
    }) || null;
  }

  addDataValidation(range, config, recordUndo = true) {
    if (!config || !["list", "numberRange"].includes(config.type)) return false;
    let normalizedConfig;
    if (config.type === "list") {
      const values = Array.isArray(config.values)
        ? config.values.map(String).map(v => v.trim()).filter(Boolean)
        : String(config.values || "").split(",").map(v => v.trim()).filter(Boolean);
      if (!values.length) return false;
      normalizedConfig = { type: "list", values: [...new Set(values)] };
    } else {
      const min = Number(config.min);
      const max = Number(config.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return false;
      normalizedConfig = { type: "numberRange", min, max };
    }
    const validation = {
      id: `dv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      range: this._normalizeRange(range),
      ...normalizedConfig
    };
    this.dataValidationsBySheet[this.activeSheet].push(validation);
    this._refreshVisibleRuleVisuals();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: this.activeSheet, collection: "dataValidationsBySheet", operation: "insert", index: this.dataValidationsBySheet[this.activeSheet].length - 1, item: structuredClone(validation) });
    return validation;
  }

  deleteDataValidation(validationId, sheetName = this.activeSheet, recordUndo = true) {
    return this._deleteCollectionItem("dataValidationsBySheet", validationId, sheetName, recordUndo);
  }

  getDataValidations(sheetName = this.activeSheet) {
    return [...(this.dataValidationsBySheet[sheetName] || [])];
  }

  getValidationForCell(col, row) {
    const rules = this.dataValidationsBySheet[this.activeSheet] || [];
    return [...rules].reverse().find(rule => this._rangeContains(rule.range, col, row)) || null;
  }

  validateCellValue(col, row, value = this.cellsData.get(`${col}${row}`)?.val ?? "") {
    const rule = this.getValidationForCell(col, row);
    if (!rule || String(value).trim() === "") return { valid: true, rule };
    if (rule.type === "list") {
      const valid = rule.values.includes(String(value).trim());
      return { valid, rule, message: valid ? "" : `Giá trị phải thuộc danh sách: ${rule.values.join(", ")}` };
    }
    const numeric = this._numericCellValue(value);
    const valid = Number.isFinite(numeric) && numeric >= rule.min && numeric <= rule.max;
    return { valid, rule, message: valid ? "" : `Giá trị phải là số từ ${rule.min} đến ${rule.max}` };
  }

  _applyRuleVisuals(dom, col, row) {
    if (!dom) return;
    const item = this.cellsData.get(`${col}${row}`);
    const conditionalRule = this._matchingConditionalRule(col, row);
    dom.style.backgroundColor = conditionalRule?.color || item?.style?.backgroundColor || "";
    dom.classList.toggle("has-validation", !!this.getValidationForCell(col, row));
    const validation = this.validateCellValue(col, row);
    dom.classList.toggle("is-validation-invalid", !validation.valid);
    if (!validation.valid) {
      dom.title = `Cảnh báo kiểm tra dữ liệu: ${validation.message}`;
      dom.setAttribute("aria-invalid", "true");
    } else {
      if (dom.title?.startsWith("Cảnh báo kiểm tra dữ liệu:")) dom.title = "";
      dom.removeAttribute?.("aria-invalid");
    }
  }

  _refreshVisibleRuleVisuals() {
    if (!this.container?.querySelectorAll) return;
    this.container.querySelectorAll(".vno-grid-cell[data-coord]").forEach(dom => {
      this._applyRuleVisuals(dom, dom.dataset.col, Number(dom.dataset.row));
    });
  }

  _showValidationDropdown(cell, col, row) {
    if (!cell || typeof document === "undefined") return;
    const rule = this.getValidationForCell(col, row);
    if (!rule || rule.type !== "list") return;
    const select = document.createElement("select");
    select.className = "vno-cell-validation-select";
    select.setAttribute("aria-label", `Chọn giá trị cho ô ${col}${row}`);
    select.innerHTML = `<option value="">-- Chọn --</option>` + rule.values
      .map(value => `<option value="${this._escapeHtml(value)}">${this._escapeHtml(value)}</option>`).join("");
    const current = String(this.cellsData.get(`${col}${row}`)?.val ?? "");
    if (rule.values.includes(current)) select.value = current;
    select.addEventListener("click", event => event.stopPropagation());
    select.addEventListener("change", () => {
      this.setCellValue(col, row, select.value);
      if (this.formulaInput) this.formulaInput.value = select.value;
      this.selectCell(col, row);
    });
    cell.appendChild(select);
    select.focus();
  }

  _escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }

  _createSheetDialog(title, bodyHtml) {
    if (typeof document === "undefined") return null;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-sheet-rule-dialog";
    overlay.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="vno-dialog-header"><strong>${title}</strong><button class="vno-btn vno-rule-close" aria-label="Đóng">&times;</button></div>
      <div class="vno-dialog-body">${bodyHtml}</div>
      <div class="vno-dialog-footer"><button class="vno-btn vno-rule-cancel">Hủy</button><button class="vno-btn vno-btn-primary vno-rule-apply">Áp dụng</button></div>
    </div>`;
    const close = () => overlay.remove();
    overlay.querySelector(".vno-rule-close").addEventListener("click", close);
    overlay.querySelector(".vno-rule-cancel").addEventListener("click", close);
    overlay.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    document.body.appendChild(overlay);
    overlay.querySelector("select, input")?.focus();
    return overlay;
  }

  showConditionalFormattingDialog() {
    const overlay = this._createSheetDialog("Định dạng có điều kiện", `
      <p class="vno-rule-range">Phạm vi: <strong>${this.getSelectedRangeLabel()}</strong></p>
      <label>Quy tắc<select id="vno-cf-type"><option value="greaterThan">Giá trị lớn hơn</option><option value="lessThan">Giá trị nhỏ hơn</option><option value="blank">Ô trống</option></select></label>
      <label id="vno-cf-value-row">Giá trị<input id="vno-cf-value" type="number" value="0"></label>
      <label>Màu nền<input id="vno-cf-color" type="color" value="#fff2cc"></label>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    const type = overlay.querySelector("#vno-cf-type");
    const valueRow = overlay.querySelector("#vno-cf-value-row");
    type.addEventListener("change", () => { valueRow.hidden = type.value === "blank"; });
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const result = this.addConditionalFormattingRule(this.selectionRange, {
        type: type.value,
        value: overlay.querySelector("#vno-cf-value").value,
        color: overlay.querySelector("#vno-cf-color").value
      });
      if (!result) overlay.querySelector(".vno-rule-error").textContent = "Vui lòng nhập một giá trị số hợp lệ.";
      else overlay.remove();
    });
    return true;
  }

  showDataValidationDialog() {
    const overlay = this._createSheetDialog("Kiểm tra dữ liệu", `
      <p class="vno-rule-range">Phạm vi: <strong>${this.getSelectedRangeLabel()}</strong></p>
      <label>Cho phép<select id="vno-dv-type"><option value="list">Danh sách lựa chọn</option><option value="numberRange">Số trong khoảng</option></select></label>
      <label id="vno-dv-list-row">Các giá trị (cách nhau bằng dấu phẩy)<input id="vno-dv-list" type="text" placeholder="Đạt, Chưa đạt, Đang xử lý"></label>
      <div id="vno-dv-number-row" hidden><label>Tối thiểu<input id="vno-dv-min" type="number" value="0"></label><label>Tối đa<input id="vno-dv-max" type="number" value="100"></label></div>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    const type = overlay.querySelector("#vno-dv-type");
    type.addEventListener("change", () => {
      overlay.querySelector("#vno-dv-list-row").hidden = type.value !== "list";
      overlay.querySelector("#vno-dv-number-row").hidden = type.value !== "numberRange";
    });
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const config = type.value === "list"
        ? { type: "list", values: overlay.querySelector("#vno-dv-list").value }
        : { type: "numberRange", min: overlay.querySelector("#vno-dv-min").value, max: overlay.querySelector("#vno-dv-max").value };
      const result = this.addDataValidation(this.selectionRange, config);
      if (!result) overlay.querySelector(".vno-rule-error").textContent = "Thông tin kiểm tra dữ liệu chưa hợp lệ.";
      else overlay.remove();
    });
    return true;
  }

  createPivotTable(config, recordUndo = true) {
    const sourceSheet = config.sourceSheet || this.activeSheet;
    const sourceCells = this.sheetsData[sourceSheet];
    if (!sourceCells) throw new Error("Không tìm thấy sheet dữ liệu nguồn.");
    const table = PivotTableEngine.aggregate(sourceCells, config);
    const baseName = `${sourceSheet} (2)`;
    let targetSheet = config.targetSheet || baseName;
    let suffix = 3;
    while (this.sheets.includes(targetSheet)) targetSheet = `${sourceSheet} (${suffix++})`;
    const previousSheet = this.activeSheet;
    this.addSheet(targetSheet, false);
    this.sheetsData[targetSheet] = PivotTableEngine.toCells(table);
    const pivot = { ...structuredClone(config), id: config.id || `pivot-${Date.now()}`, sourceSheet, targetSheet };
    this.pivotTablesBySheet[targetSheet] = [pivot];
    this._renderVirtualRows(1, Math.min(40, this.rowCount));
    this.selectCell("A", 1);
    if (recordUndo) this._recordHistory({ type: "sheet-add", sheet: previousSheet, sheetName: targetSheet, previousSheet, snapshot: this._snapshotSheet(targetSheet) });
    return pivot;
  }

  refreshPivotTable(sheetName = this.activeSheet, recordUndo = true) {
    const pivot = this.pivotTablesBySheet[sheetName]?.[0];
    if (!pivot) return false;
    const sourceCells = this.sheetsData[pivot.sourceSheet];
    if (!sourceCells) return false;
    const before = this._snapshotCells(sheetName);
    const table = PivotTableEngine.aggregate(sourceCells, pivot);
    this.sheetsData[sheetName] = PivotTableEngine.toCells(table);
    if (sheetName === this.activeSheet) {
      this._renderVirtualRows(1, Math.min(40, this.rowCount));
      this.selectCell("A", 1);
    }
    if (recordUndo) this._recordHistory({ type: "pivot-refresh", sheet: sheetName, before, after: this._snapshotCells(sheetName) });
    return true;
  }

  showPivotTableDialog() {
    const sourceSheet = this.activeSheet;
    const defaultRange = this.getSelectedRangeLabel();
    const overlay = this._createSheetDialog("Tạo Bảng tổng hợp", `
      <div class="vno-pivot-dialog">
        <label>Vùng dữ liệu nguồn (hàng đầu là tiêu đề)<input id="vno-pivot-range" value="${this._escapeHtml(defaultRange)}" aria-label="Vùng dữ liệu nguồn"></label>
        <button class="vno-btn" id="vno-pivot-load-fields" type="button">Đọc tên cột</button>
        <div class="vno-pivot-fields" aria-live="polite"></div>
        <div class="vno-rule-error" role="alert"></div>
      </div>`);
    if (!overlay) return false;
    const fieldsHost = overlay.querySelector(".vno-pivot-fields");
    const error = overlay.querySelector(".vno-rule-error");
    const loadFields = () => {
      try {
        const { headers } = PivotTableEngine.readSource(this.sheetsData[sourceSheet], overlay.querySelector("#vno-pivot-range").value);
        fieldsHost.innerHTML = `<p>Chọn trường cho từng vùng:</p>${headers.map((header, index) => `
          <div class="vno-pivot-field" data-field="${this._escapeHtml(header)}">
            <strong>${this._escapeHtml(header)}</strong>
            <label><input type="checkbox" data-zone="rows" data-index="${index}"> Rows</label>
            <label><input type="checkbox" data-zone="columns" data-index="${index}"> Columns</label>
            <label><input type="checkbox" data-zone="values" data-index="${index}"> Values</label>
            <select data-aggregate="${index}" aria-label="Phép tổng hợp cho ${this._escapeHtml(header)}"><option>SUM</option><option>COUNT</option><option>AVERAGE</option><option>MIN</option><option>MAX</option></select>
          </div>`).join("")}`;
        fieldsHost.dataset.headers = JSON.stringify(headers);
        error.textContent = "";
      } catch (err) {
        fieldsHost.innerHTML = "";
        error.textContent = err.message;
      }
    };
    overlay.querySelector("#vno-pivot-load-fields").addEventListener("click", loadFields);
    overlay.querySelector(".vno-rule-apply").textContent = "Tạo Pivot Table";
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      try {
        const headers = JSON.parse(fieldsHost.dataset.headers || "[]");
        const selected = zone => [...fieldsHost.querySelectorAll(`input[data-zone="${zone}"]:checked`)].map(input => headers[+input.dataset.index]);
        const valueFields = [...fieldsHost.querySelectorAll('input[data-zone="values"]:checked')].map(input => ({ field: headers[+input.dataset.index], aggregate: fieldsHost.querySelector(`select[data-aggregate="${input.dataset.index}"]`).value }));
        this.createPivotTable({ sourceSheet, sourceRange: overlay.querySelector("#vno-pivot-range").value, rows: selected("rows"), columns: selected("columns"), values: valueFields });
        overlay.remove();
      } catch (err) {
        error.textContent = err.message;
      }
    });
    loadFields();
    return true;
  }

  _calculateStats() {
    let total = 0;
    let count = 0;
    for (const [k, itm] of this.cellsData.entries()) {
      if (itm.val && !itm.formula) {
        count++;
        const num = parseFloat(itm.val.toString().replace(/\./g, "").replace(/[^\d-]/g, ""));
        if (!isNaN(num)) total += num;
      }
    }
    const avg = count > 0 ? Math.round(total / count) : 0;
    return {
      count: count,
      sum: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(total),
      avg: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(avg)
    };
  }

  _applyStylesToDom(dom, styles) {
    for (const [k, v] of Object.entries(styles)) {
      dom.style[k] = v;
    }
  }
}
