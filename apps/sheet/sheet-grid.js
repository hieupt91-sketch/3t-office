/**
 * VN Sheet — Enterprise Grid Controller & Microsoft Formula Calculation Engine
 */

import { FormulaEngine, FUNCTION_CATALOG } from "./formula-engine.js";
import { SheetChartBuilder } from "./sheet-chart.js";
import { FormulaAutocompleteController } from "./formula-autocomplete.js";
import { PivotTableEngine } from "./pivot-table.js";
import { NumberFormatter } from "./number-formatter.js";
import { FormatCellsDialog } from "./format-cells-dialog.js";
import { showCellStylesDialog, showFormatAsTableDialog, CELL_STYLE_PRESETS, TABLE_STYLE_PRESETS } from "./cell-styles.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { t } from "../../platform/i18n/i18n.js";
import { SheetDataTools } from "./data-tools.js";
import { showAlertDialog, showConfirmDialog, showPromptDialog } from "../../platform/ui-kit/dialogs.js";
import { VietnameseSpellChecker, normalizeVietnameseWord, tokenizeVietnamese } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

export const DEFAULT_SHEET_PAGE_SETUP = Object.freeze({
  margins: Object.freeze({ top: 1.91, bottom: 1.91, left: 1.78, right: 1.78 }),
  orientation: "portrait",
  size: "a4",
  scale: Object.freeze({ mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0 }),
  headerFooter: Object.freeze({ header: Object.freeze({ left: "", center: "", right: "" }), footer: Object.freeze({ left: "", center: "Trang &P / &N", right: "" }) }),
  centerOnPage: Object.freeze({ horizontal: false, vertical: false }),
  printOptions: Object.freeze({ gridlines: false, headings: false }),
  printTitles: Object.freeze({ rows: "", cols: "" })
});

export const DEFAULT_ROW_HEIGHT_PX = 26;
export const DEFAULT_COL_WIDTH_PX = 100;
export const MIN_ROW_HEIGHT_PX = 1;
export const MAX_ROW_HEIGHT_PX = 409;
export const MIN_COL_WIDTH_PX = 8;
export const MAX_COL_WIDTH_PX = 500;
export const MAX_SHEET_NAME_LENGTH = 31;
export const INVALID_SHEET_NAME_CHARS = /[/\\?*\[\]:]/;
export const SHEET_MOVE_TO_END = "__end__";

function newSheetPageSetup(overrides = {}) {
  return {
    margins: { ...DEFAULT_SHEET_PAGE_SETUP.margins, ...(overrides.margins || {}) },
    orientation: overrides.orientation || DEFAULT_SHEET_PAGE_SETUP.orientation,
    size: overrides.size || DEFAULT_SHEET_PAGE_SETUP.size,
    scale: { ...DEFAULT_SHEET_PAGE_SETUP.scale, ...(overrides.scale || {}) },
    headerFooter: {
      header: { ...DEFAULT_SHEET_PAGE_SETUP.headerFooter.header, ...(overrides.headerFooter?.header || {}) },
      footer: { ...DEFAULT_SHEET_PAGE_SETUP.headerFooter.footer, ...(overrides.headerFooter?.footer || {}) }
    },
    centerOnPage: { ...DEFAULT_SHEET_PAGE_SETUP.centerOnPage, ...(overrides.centerOnPage || {}) },
    printOptions: { ...DEFAULT_SHEET_PAGE_SETUP.printOptions, ...(overrides.printOptions || {}) },
    printTitles: { ...DEFAULT_SHEET_PAGE_SETUP.printTitles, ...(overrides.printTitles || {}) }
  };
}

function trapFocus(element, event) {
  if (event.key !== "Tab") return;
  const focusables = element.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables || focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

export class SheetGridController {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.cols = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    this.rowCount = 200;
    this.rowHeight = DEFAULT_ROW_HEIGHT_PX;
    this.defaultColWidth = DEFAULT_COL_WIDTH_PX;

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
    this.commentsBySheet = Object.fromEntries(this.sheets.map(name => [name, {}]));
    this.printAreaBySheet = Object.fromEntries(this.sheets.map(name => [name, null]));
    this.pageBreaksBySheet = Object.fromEntries(this.sheets.map(name => [name, { rows: [], cols: [] }]));
    this.pageSetupBySheet = Object.fromEntries(this.sheets.map(name => [name, newSheetPageSetup()]));
    this.mergedRangesBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.formulaEngine = new FormulaEngine(
      () => this.cellsData,
      name => this.resolveNamedRange(name),
      sheetName => this.sheetsData?.[sheetName] || null,
      () => this.activeSheet,
      () => this.sheets
    );
    this.autocomplete = new FormulaAutocompleteController(this);

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySteps = 100;
    this.historyMergeWindowMs = 750;

    this.selectedCoord = { r: 1, c: "A" };
    this.selectionRange = { start: { r: 1, c: "A" }, end: { r: 1, c: "A" } };
    this.showFormulas = false;
    this.calculationMode = "automatic"; // "automatic" | "manual"
    this.auditArrows = [];
    this.watchedCells = new Set();
    this._isAutofilling = false;
    this._autofillSource = null;
    this._autofillTarget = null;
    this._isMovingCell = false;
    this._moveSource = null;
    this._moveTarget = null;
    this._isSelectingRange = false;
    this._rangeAnchor = null;
    this._activeContextMenu = null;
    this.formatPainter = null;
    this._formatPainterActivatedAt = 0;
    this._formatPainterEscHandler = null;

    // Rules are workbook state, partitioned explicitly by sheet. They are evaluated,
    // never copied into a shared cell style, so switching tabs cannot leak visuals.
    this.conditionalFormattingBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.dataValidationsBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.chartsBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.imagesBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.textBoxesBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.pivotTablesBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.outlineGroupsBySheet = Object.fromEntries(this.sheets.map(name => [name, []]));
    this.rowHeightsBySheet = Object.fromEntries(this.sheets.map(name => [name, new Map()]));
    this.colWidthsBySheet = Object.fromEntries(this.sheets.map(name => [name, new Map()]));
    this.userHiddenRowsBySheet = Object.fromEntries(this.sheets.map(name => [name, new Set()]));
    this.userHiddenColsBySheet = Object.fromEntries(this.sheets.map(name => [name, new Set()]));
    this.protectionBySheet = Object.fromEntries(this.sheets.map(name => [name, { enabled: false, password: "" }]));
    this.dataTools = new SheetDataTools(this);

    // Freeze Panes & Sort/Filter state (phản ánh sheet đang active)
    this.isFrozenPanes = false;
    this.isFilterActive = false;
    this.hiddenRows = new Set();
    this.activeFilters = new Map();

    // View state is workbook UI state. Gridlines/headings default to visible.
    this.zoomLevel = 1;
    this.gridlinesVisible = true;
    this.headingsVisible = true;
    this.workbookView = "normal"; // "normal" | "pageBreakPreview" | "pageLayout"
    this.formulaBarVisible = true;
    this.formulaBarEl = null;
    this.spellChecker = null;
    this._spellcheckOverlay = null;

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
    // `tabindex="-1"` làm container CÓ THỂ nhận focus qua .focus() (không lọt vào thứ tự
    // Tab của trang) — bắt buộc phải có thì `selectCell()` mới gọi `.focus()` được. Nếu
    // không, click chọn ô để lại `document.activeElement === document.body`, khiến TOÀN
    // BỘ tương tác bàn phím của lưới (mũi tên, Enter, Tab, F2, gõ "=" để bắt đầu công
    // thức, và mọi cách gõ trực tiếp giá trị vào ô) không bao giờ tới được listener
    // `keydown` gắn trên `this.container` — vì sự kiện bàn phím chỉ nổi bọt (bubble) từ
    // phần tử đang có focus, và `document.body` không phải hậu duệ của container. Lỗi
    // thật nghiêm trọng nhất tìm được trong toàn phiên (04/09/2026) — xác nhận qua
    // Playwright: gõ trực tiếp vào ô đã chọn hoàn toàn không có tác dụng gì, kể cả với
    // `=PMT(...)` vừa được Codex thêm.
    this.container.setAttribute("tabindex", "-1");
    this.container.style.outline = "none";

    // 1. Formula Bar
    const fBar = document.createElement("div");
    this.formulaBarEl = fBar;
    this.formulaBarVisible = true;
    this.workbookView = "normal";
    fBar.className = "vno-formula-bar";
    fBar.setAttribute("role", "region");
    fBar.setAttribute("aria-label", "Thanh công thức");
    fBar.innerHTML = `
      <div class="vno-name-box" id="vno-cell-name" role="status" aria-label="Hộp tên ô">A1</div>
      <div class="vno-formula-actions" role="toolbar" aria-label="Thao tác công thức">
        <button class="vno-formula-btn" title="Hủy bỏ (Esc)" aria-label="Hủy bỏ (Esc)" id="vno-fx-cancel">✕</button>
        <button class="vno-formula-btn" title="Nhập (Enter)" aria-label="Nhập (Enter)" id="vno-fx-ok">✓</button>
        <button class="vno-formula-btn vno-formula-btn-fx" title="Chèn hàm tính toán (fx)" aria-label="Chèn hàm tính toán (fx)" id="vno-fx-insert">fx</button>
      </div>
      <input type="text" class="vno-formula-input" id="vno-formula-val" aria-label="Thanh công thức" placeholder="Nhập giá trị hoặc công thức (ví dụ: =SUM(F4:F7), =AVERAGE(E4:E7)...)" />
    `;
    this.nameBox = fBar.querySelector("#vno-cell-name");
    this.formulaInput = fBar.querySelector("#vno-formula-val");

    this.autocomplete.mount();

    this.formulaInput.addEventListener("input", (e) => {
      if (this.isSheetProtected()) {
        e.target.value = this.cellsData.get(`${this.selectedCoord.c}${this.selectedCoord.r}`)?.formula
          || this.cellsData.get(`${this.selectedCoord.c}${this.selectedCoord.r}`)?.val
          || "";
        this._notifySheetProtected();
        return;
      }
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, e.target.value, true, { coalesce: true });
      this.autocomplete.handleInput(e.target.value, this.formulaInput.selectionStart);
    });

    this.formulaInput.addEventListener("keydown", (e) => {
      // Ngăn sự kiện phím trong formulaInput nổi bọt lên container lưới (tránh xử lý trùng lặp Enter, Tab, mũi tên...)
      e.stopPropagation();

      if (this.autocomplete.handleKeyDown(e)) {
        return;
      }
      if (e.key === "Enter") {
        if (e.altKey) {
          e.preventDefault();
          const start = this.formulaInput.selectionStart || 0;
          const end = this.formulaInput.selectionEnd || 0;
          const val = this.formulaInput.value;
          this.formulaInput.value = val.substring(0, start) + "\n" + val.substring(end);
          this.formulaInput.selectionStart = this.formulaInput.selectionEnd = start + 1;
          this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, this.formulaInput.value, true, { coalesce: true });
          return;
        }
        if (e.ctrlKey && e.shiftKey) {
          e.preventDefault();
          this.autocomplete.closeAll();
          globalCommandBus.execute("sheet.formula.arrayEnter");
          return;
        }
        e.preventDefault();
        this.autocomplete.closeAll();
        const nextRow = e.shiftKey
          ? Math.max(1, this.selectedCoord.r - 1)
          : Math.min(this.rowCount, this.selectedCoord.r + 1);
        this.selectCell(this.selectedCoord.c, nextRow);
        return;
      } else if (e.key === "Tab") {
        e.preventDefault();
        this.autocomplete.closeAll();
        const colIdx = this.cols.indexOf(this.selectedCoord.c);
        const nextCol = e.shiftKey
          ? this.cols[Math.max(0, colIdx - 1)]
          : this.cols[Math.min(this.cols.length - 1, colIdx + 1)];
        this.selectCell(nextCol, this.selectedCoord.r);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.autocomplete.closeAll();
        if (this._cellValueBeforeEdit !== undefined) {
          this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, this._cellValueBeforeEdit, false);
          this.formulaInput.value = this._cellValueBeforeEdit;
        } else {
          const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
          const cur = this.cellsData.get(key);
          this.formulaInput.value = cur ? (cur.formula || cur.val || "") : "";
        }
        if (typeof this.container.focus === "function") {
          this.container.focus({ preventScroll: true });
        }
        return;
      }
    });

    fBar.querySelector("#vno-fx-cancel").addEventListener("click", () => {
      this.autocomplete.closeAll();
      if (this._cellValueBeforeEdit !== undefined) {
        this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, this._cellValueBeforeEdit, false);
        this.formulaInput.value = this._cellValueBeforeEdit;
      } else {
        const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
        const cur = this.cellsData.get(key);
        this.formulaInput.value = cur ? (cur.formula || cur.val || "") : "";
      }
      if (typeof this.container.focus === "function") {
        this.container.focus({ preventScroll: true });
      }
    });

    fBar.querySelector("#vno-fx-ok").addEventListener("click", () => {
      this.autocomplete.closeAll();
      this.selectCell(this.selectedCoord.c, Math.min(this.rowCount, this.selectedCoord.r + 1));
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
      this.renderAuditArrows?.();
    });

    const table = document.createElement("table");
    table.className = "vno-grid-table";
    this.table = table;
    this._applyViewState();

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    trHead.innerHTML = `<th class="vno-grid-corner-header" title="Chọn tất cả (Ctrl+A)"></th>`;
    trHead.querySelector(".vno-grid-corner-header")?.addEventListener("click", () => this.selectAll());
    this.cols.forEach(col => {
      const th = document.createElement("th");
      this._bindColumnHeader(th, col);
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
    const imageLayer = document.createElement("div");
    imageLayer.className = "vno-sheet-image-layer";
    imageLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7";
    this.imageLayer = imageLayer;
    vp.appendChild(imageLayer);
    const textBoxLayer = document.createElement("div");
    textBoxLayer.className = "vno-sheet-textbox-layer";
    textBoxLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8";
    this.textBoxLayer = textBoxLayer;
    vp.appendChild(textBoxLayer);
    const auditLayer = document.createElement("div");
    auditLayer.className = "vno-sheet-audit-layer";
    auditLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9";
    this.auditLayer = auditLayer;
    vp.appendChild(auditLayer);
    this.container.appendChild(vp);

    // 3. Sheet Tab Bar dưới đáy
    const tabBar = document.createElement("div");
    tabBar.className = "vno-sheet-tab-bar";
    tabBar.setAttribute("role", "region");
    tabBar.setAttribute("aria-label", "Thanh trang tính");
    tabBar.innerHTML = `
      <div class="vno-sheet-tab-scroll">
        <button class="vno-sheet-scroll-btn" title="Cuộn trái" aria-label="Cuộn trái">◀</button>
        <button class="vno-sheet-scroll-btn" title="Cuộn phải" aria-label="Cuộn phải">▶</button>
      </div>
      <div id="vno-sheet-tabs-list" role="tablist" aria-label="Danh sách trang tính" style="display:flex;gap:3px;"></div>
      <button class="vno-sheet-add-btn" title="Thêm trang tính mới" aria-label="Thêm trang tính mới">+</button>
    `;
    this.tabBar = tabBar;

    const tabsListEl = tabBar.querySelector("#vno-sheet-tabs-list");
    this._renderSheetTabs();

    if (tabsListEl) {
      tabsListEl.addEventListener("keydown", (e) => {
        const tabs = Array.from(tabsListEl.querySelectorAll(".vno-sheet-tab-item"));
        const curIdx = tabs.findIndex(t => t.dataset.sheet === this.activeSheet);
        let targetIdx = -1;
        if (e.key === "ArrowRight") {
          targetIdx = (curIdx + 1) % tabs.length;
        } else if (e.key === "ArrowLeft") {
          targetIdx = (curIdx - 1 + tabs.length) % tabs.length;
        } else if (e.key === "Home") {
          targetIdx = 0;
        } else if (e.key === "End") {
          targetIdx = tabs.length - 1;
        }
        if (targetIdx >= 0 && tabs[targetIdx]) {
          e.preventDefault();
          const nextSheet = tabs[targetIdx].dataset.sheet;
          this.switchSheet(nextSheet);
          tabs[targetIdx].focus();
        }
      });
    }

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
    this.renderImages();
    this.renderTextBoxes();
    this.selectCell("A", 1);
    this._bindGridKeyboardNavigation();
  }

  destroy() {
    this._closeSpellcheckDialog();
    this._closeContextMenu();
    this.autocomplete?.destroy?.();
  }

  selectCurrentColumn() {
    const col = this.selectedCoord.c;
    this.selectCell(col, 1);
    this.selectCell(col, this.rowCount, true);
    return true;
  }

  selectCurrentRow() {
    const row = this.selectedCoord.r;
    this.selectCell(this.cols[0], row);
    this.selectCell(this.cols[this.cols.length - 1], row, true);
    return true;
  }

  toggleShowFormulas() {
    this.showFormulas = !this.showFormulas;
    if (this.container) {
      this.container.classList.toggle("is-formula-view-mode", this.showFormulas);
    }
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    return this.showFormulas;
  }

  insertCurrentTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const timeStr = `${hh}:${mm}:${ss}`;
    this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, timeStr, true);
    if (this.formulaInput) this.formulaInput.value = timeStr;
    return timeStr;
  }

  setCalculationMode(mode = "automatic") {
    if (!["automatic", "manual"].includes(mode)) return false;
    const prev = this.calculationMode;
    this.calculationMode = mode;
    if (prev === "manual" && mode === "automatic") {
      this.recalculateAll();
    }
    return this.calculationMode;
  }

  calculateSheet(sheetName = this.activeSheet) {
    const map = this.sheetsData[sheetName];
    if (!map) return false;
    const prevActive = this.activeSheet;
    this.activeSheet = sheetName;
    for (const [k, itm] of map.entries()) {
      if (itm.formula) {
        let res;
        if (itm.isArrayFormula && itm.arrayRange) {
          const results = this.formulaEngine.evaluateArray(itm.formula);
          const coords = this.formulaEngine.expandRange(itm.arrayRange);
          res = Array.isArray(results) ? results[coords.indexOf(k)] : results;
        } else {
          res = this.formulaEngine.evaluate(itm.formula);
        }
        itm.val = res;
        const dom = sheetName === prevActive ? this.container.querySelector(`.vno-grid-cell[data-coord="${k}"]`) : null;
        if (dom) {
          const [cCoord, rCoord] = this._splitCoord(k);
          this._renderCellVisual(dom, itm, cCoord, rCoord);
          this._applyRuleVisuals(dom, cCoord, rCoord);
        }
      }
    }
    this.activeSheet = prevActive;
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._updateWatchWindow?.();
    return true;
  }

  recalculateAll() {
    this._recalculateAllFormulas(undefined, true);
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._updateWatchWindow?.();
    return true;
  }

  previousSheet() {
    const idx = this.sheets.indexOf(this.activeSheet);
    if (idx > 0) {
      this.switchSheet(this.sheets[idx - 1]);
      return true;
    }
    return false;
  }

  nextSheet() {
    const idx = this.sheets.indexOf(this.activeSheet);
    if (idx < this.sheets.length - 1) {
      this.switchSheet(this.sheets[idx + 1]);
      return true;
    }
    return false;
  }

  _ensureRowColLayout(sheetName = this.activeSheet) {
    this.rowHeightsBySheet ||= {};
    this.colWidthsBySheet ||= {};
    this.userHiddenRowsBySheet ||= {};
    this.userHiddenColsBySheet ||= {};
    if (!this.rowHeightsBySheet[sheetName]) this.rowHeightsBySheet[sheetName] = new Map();
    if (!this.colWidthsBySheet[sheetName]) this.colWidthsBySheet[sheetName] = new Map();
    if (!this.userHiddenRowsBySheet[sheetName]) this.userHiddenRowsBySheet[sheetName] = new Set();
    if (!this.userHiddenColsBySheet[sheetName]) this.userHiddenColsBySheet[sheetName] = new Set();
  }

  _rowHeights(sheetName = this.activeSheet) {
    this._ensureRowColLayout(sheetName);
    return this.rowHeightsBySheet[sheetName];
  }

  _colWidths(sheetName = this.activeSheet) {
    this._ensureRowColLayout(sheetName);
    return this.colWidthsBySheet[sheetName];
  }

  _userHiddenRows(sheetName = this.activeSheet) {
    this._ensureRowColLayout(sheetName);
    return this.userHiddenRowsBySheet[sheetName];
  }

  _userHiddenCols(sheetName = this.activeSheet) {
    this._ensureRowColLayout(sheetName);
    return this.userHiddenColsBySheet[sheetName];
  }

  _snapshotRowColLayout(sheetName = this.activeSheet) {
    this._ensureRowColLayout(sheetName);
    return {
      sheetName,
      rowHeights: [...this._rowHeights(sheetName).entries()],
      colWidths: [...this._colWidths(sheetName).entries()],
      userHiddenRows: [...this._userHiddenRows(sheetName)],
      userHiddenCols: [...this._userHiddenCols(sheetName)]
    };
  }

  _restoreRowColLayout(snapshot, { render = true } = {}) {
    if (!snapshot) return false;
    const sheetName = snapshot.sheetName || this.activeSheet;
    this._ensureRowColLayout(sheetName);
    this.rowHeightsBySheet[sheetName] = new Map(snapshot.rowHeights || []);
    this.colWidthsBySheet[sheetName] = new Map(snapshot.colWidths || []);
    this.userHiddenRowsBySheet[sheetName] = new Set(snapshot.userHiddenRows || []);
    this.userHiddenColsBySheet[sheetName] = new Set(snapshot.userHiddenCols || []);
    if (render && sheetName === this.activeSheet) {
      this._renderColumnHeaders();
      this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    }
    return true;
  }

  _selectedRows(range = this.selectionRange) {
    const area = this._normalizeRange(range || { start: this.selectedCoord, end: this.selectedCoord });
    const rows = [];
    for (let row = area.start.r; row <= area.end.r; row++) rows.push(row);
    return rows;
  }

  _selectedCols(range = this.selectionRange) {
    const area = this._normalizeRange(range || { start: this.selectedCoord, end: this.selectedCoord });
    const start = this._columnNumber(area.start.c);
    const end = this._columnNumber(area.end.c);
    const cols = [];
    for (let number = start; number <= end; number++) cols.push(this._columnLabel(number));
    return cols;
  }

  getRowHeight(row, sheetName = this.activeSheet) {
    const stored = this._rowHeights(sheetName).get(Number(row));
    return Number.isFinite(stored) ? stored : this.rowHeight;
  }

  getColumnWidth(col, sheetName = this.activeSheet) {
    const stored = this._colWidths(sheetName).get(col);
    return Number.isFinite(stored) ? stored : this.defaultColWidth;
  }

  isRowUserHidden(row, sheetName = this.activeSheet) {
    return this._userHiddenRows(sheetName).has(Number(row));
  }

  isColUserHidden(col, sheetName = this.activeSheet) {
    return this._userHiddenCols(sheetName).has(col);
  }

  _isColumnHidden(col) {
    return this._isOutlineColumnHidden(col) || this.isColUserHidden(col);
  }

  _isRowSkipped(row) {
    return this.hiddenRows.has(row) || this._isOutlineRowHidden(row) || this.isRowUserHidden(row);
  }

  _clampRowHeight(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(MIN_ROW_HEIGHT_PX, Math.min(MAX_ROW_HEIGHT_PX, Math.round(numeric)));
  }

  _clampColWidth(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(MIN_COL_WIDTH_PX, Math.min(MAX_COL_WIDTH_PX, Math.round(numeric)));
  }

  _recordRowColLayoutChange(before) {
    const after = this._snapshotRowColLayout();
    const same = JSON.stringify(before) === JSON.stringify(after);
    if (same) return false;
    this._recordHistory({ type: "row-col-layout", sheet: this.activeSheet, before, after });
    return true;
  }

  _refreshRowColLayoutView() {
    this._renderColumnHeaders();
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
  }

  _moveSelectionOffHidden() {
    let { c, r } = this.selectedCoord || { c: "A", r: 1 };
    if (this._isRowSkipped(r)) {
      let next = r + 1;
      while (next <= this.rowCount && this._isRowSkipped(next)) next++;
      if (next > this.rowCount) {
        next = r - 1;
        while (next >= 1 && this._isRowSkipped(next)) next--;
      }
      if (next >= 1 && next <= this.rowCount) r = next;
    }
    if (this._isColumnHidden(c)) {
      const start = this._columnNumber(c);
      let next = start + 1;
      while (next <= this.cols.length && this._isColumnHidden(this._columnLabel(next))) next++;
      if (next > this.cols.length) {
        next = start - 1;
        while (next >= 1 && this._isColumnHidden(this._columnLabel(next))) next--;
      }
      if (next >= 1 && next <= this.cols.length) c = this._columnLabel(next);
    }
    this.selectCell(c, r);
  }

  setRowHeights(heightPx, rows = this._selectedRows(), recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const height = this._clampRowHeight(heightPx);
    const targets = (rows || []).map(Number).filter(row => Number.isInteger(row) && row >= 1 && row <= this.rowCount);
    if (height == null || !targets.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    const map = this._rowHeights();
    for (const row of targets) {
      if (height === this.rowHeight) map.delete(row);
      else map.set(row, height);
    }
    this._refreshRowColLayoutView();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return height;
  }

  setColumnWidths(widthPx, cols = this._selectedCols(), recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const width = this._clampColWidth(widthPx);
    const targets = (cols || []).filter(col => this.cols.includes(col));
    if (width == null || !targets.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    const map = this._colWidths();
    for (const col of targets) {
      if (width === this.defaultColWidth) map.delete(col);
      else map.set(col, width);
    }
    this._refreshRowColLayoutView();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return width;
  }

  computeAutoFitColumnWidth(col) {
    let maxLen = 4;
    for (let r = 1; r <= this.rowCount; r++) {
      const itm = this.cellsData.get(`${col}${r}`);
      if (itm) {
        const text = String(itm.formula || itm.val || "");
        if (text.length > maxLen) maxLen = text.length;
      }
    }
    return Math.max(64, Math.min(MAX_COL_WIDTH_PX, Math.round(maxLen * 8.5 + 28)));
  }

  computeAutoFitRowHeight(row) {
    let maxLines = 1;
    for (const c of this.cols) {
      const itm = this.cellsData.get(`${c}${row}`);
      if (itm) {
        const text = String(itm.formula || itm.val || "");
        const lines = text.split("\n").length;
        if (lines > maxLines) maxLines = lines;
      }
    }
    return Math.max(this.rowHeight, Math.min(MAX_ROW_HEIGHT_PX, maxLines * 22 + 4));
  }

  autoFitColumn(col, recordUndo = true) {
    const width = this.computeAutoFitColumnWidth(col);
    this.setColumnWidths(width, [col], recordUndo);
    return width;
  }

  autoFitRow(row, recordUndo = true) {
    const height = this.computeAutoFitRowHeight(row);
    this.setRowHeights(height, [row], recordUndo);
    return height;
  }

  autoFitSelectedRows(recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const rows = this._selectedRows();
    if (!rows.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    for (const row of rows) this.setRowHeights(this.computeAutoFitRowHeight(row), [row], false);
    this._refreshRowColLayoutView();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return true;
  }

  autoFitSelectedColumns(recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const cols = this._selectedCols();
    if (!cols.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    for (const col of cols) this.setColumnWidths(this.computeAutoFitColumnWidth(col), [col], false);
    this._refreshRowColLayoutView();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return true;
  }

  hideRows(rows = this._selectedRows(), recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const targets = (rows || []).map(Number).filter(row => Number.isInteger(row) && row >= 1 && row <= this.rowCount);
    if (!targets.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    const hidden = this._userHiddenRows();
    for (const row of targets) hidden.add(row);
    this._refreshRowColLayoutView();
    this._moveSelectionOffHidden();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return true;
  }

  unhideRows(rows = this._selectedRows(), recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    let targets = (rows || []).map(Number).filter(row => Number.isInteger(row) && row >= 1 && row <= this.rowCount);
    const hidden = this._userHiddenRows();
    if (!targets.some(row => hidden.has(row))) {
      const min = Math.min(...targets);
      const max = Math.max(...targets);
      const nearby = [...hidden].filter(row => row >= min - 1 && row <= max + 1);
      if (nearby.length) targets = nearby;
    }
    const toShow = targets.filter(row => hidden.has(row));
    if (!toShow.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    for (const row of toShow) hidden.delete(row);
    this._refreshRowColLayoutView();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return true;
  }

  hideColumns(cols = this._selectedCols(), recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const targets = (cols || []).filter(col => this.cols.includes(col));
    if (!targets.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    const hidden = this._userHiddenCols();
    for (const col of targets) hidden.add(col);
    this._refreshRowColLayoutView();
    this._moveSelectionOffHidden();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return true;
  }

  unhideColumns(cols = this._selectedCols(), recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    let targets = (cols || []).filter(col => this.cols.includes(col));
    const hidden = this._userHiddenCols();
    if (!targets.some(col => hidden.has(col))) {
      const numbers = targets.map(col => this._columnNumber(col));
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const nearby = [...hidden].filter(col => {
        const number = this._columnNumber(col);
        return number >= min - 1 && number <= max + 1;
      });
      if (nearby.length) targets = nearby;
    }
    const toShow = targets.filter(col => hidden.has(col));
    if (!toShow.length) return false;
    const before = recordUndo ? this._snapshotRowColLayout() : null;
    for (const col of toShow) hidden.delete(col);
    this._refreshRowColLayoutView();
    if (recordUndo) this._recordRowColLayoutChange(before);
    return true;
  }

  async showRowHeightDialog(args = {}) {
    if (Number.isFinite(Number(args?.height))) {
      return this.setRowHeights(Number(args.height), args.rows || this._selectedRows());
    }
    const rows = this._selectedRows();
    const current = this.getRowHeight(rows[0] || this.selectedCoord.r);
    const value = await showPromptDialog({
      title: t("sheetDialogs.rowHeightTitle", "Chiều cao hàng"),
      message: t("sheetDialogs.rowHeightMessage", "Chiều cao hàng (pixel):"),
      defaultValue: String(current),
      confirmText: t("sheetDialogs.apply", "Áp dụng"),
      cancelText: t("sheetDialogs.cancel", "Hủy")
    });
    if (value == null) return false;
    const parsed = Number(String(value).trim().replace(",", "."));
    if (this._clampRowHeight(parsed) == null) {
      await showAlertDialog({
        title: t("sheetDialogs.rowHeightTitle", "Chiều cao hàng"),
        message: t("sheetDialogs.invalidRowColSize", "Vui lòng nhập một số hợp lệ trong khoảng cho phép.")
      });
      return false;
    }
    return this.setRowHeights(parsed, rows);
  }

  async showColumnWidthDialog(args = {}) {
    if (Number.isFinite(Number(args?.width))) {
      return this.setColumnWidths(Number(args.width), args.cols || this._selectedCols());
    }
    const cols = this._selectedCols();
    const current = this.getColumnWidth(cols[0] || this.selectedCoord.c);
    const value = await showPromptDialog({
      title: t("sheetDialogs.colWidthTitle", "Độ rộng cột"),
      message: t("sheetDialogs.colWidthMessage", "Độ rộng cột (pixel):"),
      defaultValue: String(current),
      confirmText: t("sheetDialogs.apply", "Áp dụng"),
      cancelText: t("sheetDialogs.cancel", "Hủy")
    });
    if (value == null) return false;
    const parsed = Number(String(value).trim().replace(",", "."));
    if (this._clampColWidth(parsed) == null) {
      await showAlertDialog({
        title: t("sheetDialogs.colWidthTitle", "Độ rộng cột"),
        message: t("sheetDialogs.invalidRowColSize", "Vui lòng nhập một số hợp lệ trong khoảng cho phép.")
      });
      return false;
    }
    return this.setColumnWidths(parsed, cols);
  }

  _applyRowColSizeToCell(td, col, row) {
    if (!td?.style) return;
    if (!this._isColumnHidden(col)) {
      const width = this.getColumnWidth(col);
      td.style.width = `${width}px`;
      td.style.minWidth = `${width}px`;
      td.style.maxWidth = `${width}px`;
    }
    td.style.height = `${this.getRowHeight(row)}px`;
  }

  _bindColumnHeader(th, col) {
    th.className = "vno-col-header";
    th.dataset.col = col;
    th.hidden = this._isColumnHidden(col);
    const width = this.getColumnWidth(col);
    if (!th.hidden) {
      th.style.width = `${width}px`;
      th.style.minWidth = `${width}px`;
      th.style.maxWidth = `${width}px`;
    }
    th.innerHTML = `
      ${this._outlineToggleHtml("col", col)}
      <span class="vno-col-title">${col}</span>
      <button class="vno-filter-btn" data-col="${col}" title="Lọc và sắp xếp cột ${col}" style="display:none;">▼</button>
      <div class="vno-col-resizer" data-col="${col}" title="Nhấp đúp để tự động vừa độ rộng cột ${col}"></div>
    `;
    th.querySelector(".vno-outline-toggle")?.addEventListener("click", event => {
      event.stopPropagation();
      this.toggleOutlineGroup(event.currentTarget.dataset.groupId);
    });
    th.addEventListener("click", (e) => {
      if (e.target.closest(".vno-filter-btn") || e.target.closest(".vno-col-resizer")) return;
      this.selectCell(col, 1);
      this.selectCell(col, this.rowCount, true);
    });
    th.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.selectCell(col, 1);
      this.selectCell(col, this.rowCount, true);
      this.showContextMenu(e, "col", col);
    });
    th.querySelector(".vno-col-resizer")?.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this.autoFitColumn(col);
    });
  }

  _attachAutofillHandle(td) {
    if (!td || td.querySelector?.(".vno-cell-autofill-handle")) return;
    const handle = document.createElement("div");
    handle.className = "vno-cell-autofill-handle";
    handle.title = "Kéo để tự động điền (AutoFill)";
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._startAutofill(e);
    });
    td.appendChild(handle);
  }

  _attachMoveHandles(td) {
    if (!td || td.querySelector?.(".vno-cell-move-handle")) return;
    for (const side of ["top", "bottom", "left", "right"]) {
      const mh = document.createElement("div");
      mh.className = `vno-cell-move-handle ${side}`;
      mh.title = "Kéo viền để di chuyển ô (Drag border to move)";
      mh.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._startCellMove(e);
      });
      td.appendChild(mh);
    }
  }

  _startRangeSelect(e, col, row) {
    if (this._isSelectingRange) return;
    this._isSelectingRange = true;
    this._rangeAnchor = { c: col, r: row };
    this.selectCell(col, row, false);

    const onMove = (moveEvt) => {
      if (!this._isSelectingRange) return;
      const el = typeof document !== "undefined" ? document.elementFromPoint(moveEvt.clientX, moveEvt.clientY) : null;
      const cell = el?.closest?.(".vno-grid-cell");
      if (cell && cell.dataset.col && cell.dataset.row) {
        const hoverCol = cell.dataset.col;
        const hoverRow = Number(cell.dataset.row);
        if (hoverCol !== this.selectionRange.end.c || hoverRow !== this.selectionRange.end.r) {
          this.selectionRange.end = { c: hoverCol, r: hoverRow };
          this._updateRangeSelectionVisuals();
        }
      }
      if (this.viewport && this.viewport.getBoundingClientRect) {
        const r = this.viewport.getBoundingClientRect();
        if (moveEvt.clientY > r.bottom - 25) this.viewport.scrollTop += 20;
        else if (moveEvt.clientY < r.top + 25) this.viewport.scrollTop -= 20;
        if (moveEvt.clientX > r.right - 25) this.viewport.scrollLeft += 20;
        else if (moveEvt.clientX < r.left + 25) this.viewport.scrollLeft -= 20;
      }
    };

    const onUp = () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      this._isSelectingRange = false;
      if (this.formatPainter) this.applyFormatPainterToSelection();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
  }

  _updateRangeSelectionVisuals() {
    const isMulti = (this.selectionRange.start.c !== this.selectionRange.end.c || this.selectionRange.start.r !== this.selectionRange.end.r);
    const norm = this._normalizeRange(this.selectionRange);

    this.container?.querySelectorAll?.(".vno-grid-cell[data-coord]").forEach(cell => {
      const inRange = this._rangeContains(this.selectionRange, cell.dataset.col, Number(cell.dataset.row));
      cell.classList.toggle("is-range-selected", inRange && isMulti);
    });

    if (this.nameBox) this.nameBox.textContent = this.getSelectedRangeLabel();

    this.container?.querySelectorAll?.(".vno-cell-autofill-handle").forEach(h => h.remove());
    const endCoord = `${norm.end.c}${norm.end.r}`;
    const endCell = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${endCoord}"]`);
    if (endCell) {
      this._attachAutofillHandle(endCell);
    }
  }

  _startAutofill(e) {
    if (this._isAutofilling) return;
    this._isAutofilling = true;
    const norm = this._normalizeRange(this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    this._autofillSource = norm;
    this._autofillTarget = null;

    const onMove = (moveEvt) => this._onAutofillMouseMove(moveEvt);
    const onUp = (upEvt) => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      this._onAutofillMouseUp(upEvt);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
  }

  _onAutofillMouseMove(e) {
    if (!this._isAutofilling || !this._autofillSource) return;
    const el = typeof document !== "undefined" ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const cell = el?.closest?.(".vno-grid-cell");
    this.container?.querySelectorAll?.(".is-autofill-preview").forEach(c => c.classList.remove("is-autofill-preview"));

    if (cell && cell.dataset.col && cell.dataset.row) {
      const targetCol = cell.dataset.col;
      const targetRow = Number(cell.dataset.row);
      const src = this._autofillSource;
      const srcMaxRow = src.end.r;
      const srcMaxColNum = this._columnNumber(src.end.c);
      const targetColNum = this._columnNumber(targetCol);

      if (targetRow > srcMaxRow) {
        // Vertical Fill Down
        this._autofillTarget = {
          direction: "down",
          startCol: src.start.c,
          endCol: src.end.c,
          startRow: srcMaxRow + 1,
          endRow: targetRow
        };
        for (let r = srcMaxRow + 1; r <= targetRow; r++) {
          for (let cNum = this._columnNumber(src.start.c); cNum <= srcMaxColNum; cNum++) {
            const td = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${this._columnLabel(cNum)}${r}"]`);
            if (td) td.classList.add("is-autofill-preview");
          }
        }
      } else if (targetColNum > srcMaxColNum) {
        // Horizontal Fill Right
        this._autofillTarget = {
          direction: "right",
          startColNum: srcMaxColNum + 1,
          endColNum: targetColNum,
          startRow: src.start.r,
          endRow: src.end.r
        };
        for (let r = src.start.r; r <= src.end.r; r++) {
          for (let cNum = srcMaxColNum + 1; cNum <= targetColNum; cNum++) {
            const td = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${this._columnLabel(cNum)}${r}"]`);
            if (td) td.classList.add("is-autofill-preview");
          }
        }
      } else {
        this._autofillTarget = null;
      }
    }

    if (this.viewport && this.viewport.getBoundingClientRect) {
      const r = this.viewport.getBoundingClientRect();
      if (e.clientY > r.bottom - 25) this.viewport.scrollTop += 20;
      else if (e.clientY < r.top + 25) this.viewport.scrollTop -= 20;
      if (e.clientX > r.right - 25) this.viewport.scrollLeft += 20;
      else if (e.clientX < r.left + 25) this.viewport.scrollLeft -= 20;
    }
  }

  _onAutofillMouseUp() {
    this.container?.querySelectorAll?.(".is-autofill-preview").forEach(c => c.classList.remove("is-autofill-preview"));
    this._isAutofilling = false;
    if (this._autofillSource && this._autofillTarget) {
      this._executeAutofill(this._autofillSource, this._autofillTarget);
    }
    this._autofillSource = null;
    this._autofillTarget = null;
  }

  _executeAutofill(src, target) {
    const before = {};
    const after = {};

    const monthsVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const daysVi = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

    if (target.direction === "down") {
      const srcStartRow = src.start.r;
      const srcEndRow = src.end.r;
      const srcCount = srcEndRow - srcStartRow + 1;
      const minColNum = this._columnNumber(src.start.c);
      const maxColNum = this._columnNumber(src.end.c);

      for (let cNum = minColNum; cNum <= maxColNum; cNum++) {
        const colLetter = this._columnLabel(cNum);
        const sourceCells = [];
        for (let r = srcStartRow; r <= srcEndRow; r++) {
          sourceCells.push(this.cellsData.get(`${colLetter}${r}`) || { val: "", formula: "", style: {} });
        }

        for (let r = target.startRow; r <= target.endRow; r++) {
          const destKey = `${colLetter}${r}`;
          const existing = this.cellsData.get(destKey) || { val: "", formula: "", style: {} };
          before[destKey] = structuredClone(existing);

          const stepOffset = r - srcEndRow;
          const cycleIdx = (stepOffset - 1) % srcCount;
          const sourceCell = sourceCells[cycleIdx];

          let newVal = sourceCell.val;
          let newFormula = "";
          const newStyle = structuredClone(sourceCell.style || {});

          if (sourceCell.formula && String(sourceCell.formula).startsWith("=")) {
            const deltaR = r - (srcStartRow + cycleIdx);
            newFormula = this._offsetFormula(sourceCell.formula, 0, deltaR);
            newVal = this.formulaEngine.evaluate(newFormula);
          } else if (srcCount === 1) {
            const rawVal = String(sourceCell.val || "").trim();
            const numVal = Number(rawVal);
            const numEndMatch = rawVal.match(/^(.*?)(\d+)$/);
            const mViIdx = monthsVi.indexOf(rawVal);
            const mEnIdx = monthsEn.indexOf(rawVal);
            const dViIdx = daysVi.indexOf(rawVal);

            if (Number.isFinite(numVal) && rawVal !== "") {
              newVal = numVal + stepOffset;
            } else if (numEndMatch) {
              const prefix = numEndMatch[1];
              const digits = numEndMatch[2];
              const nextNum = parseInt(digits, 10) + stepOffset;
              newVal = `${prefix}${String(nextNum).padStart(digits.length, "0")}`;
            } else if (mViIdx !== -1) {
              newVal = monthsVi[(mViIdx + stepOffset) % monthsVi.length];
            } else if (mEnIdx !== -1) {
              newVal = monthsEn[(mEnIdx + stepOffset) % monthsEn.length];
            } else if (dViIdx !== -1) {
              newVal = daysVi[(dViIdx + stepOffset) % daysVi.length];
            } else {
              newVal = sourceCell.val;
            }
          } else {
            const vals = sourceCells.map(c => Number(c.val));
            if (vals.every(v => Number.isFinite(v))) {
              const step = (vals[vals.length - 1] - vals[0]) / (srcCount - 1);
              newVal = vals[vals.length - 1] + step * stepOffset;
            } else {
              newVal = sourceCell.val;
            }
          }

          const newItem = { val: newVal, formula: newFormula, style: newStyle };
          this.cellsData.set(destKey, newItem);
          after[destKey] = structuredClone(newItem);
        }
      }

      this.selectionRange = { start: src.start, end: { c: src.end.c, r: target.endRow } };
    } else if (target.direction === "right") {
      const srcStartColNum = this._columnNumber(src.start.c);
      const srcEndColNum = this._columnNumber(src.end.c);
      const srcCount = srcEndColNum - srcStartColNum + 1;

      for (let r = target.startRow; r <= target.endRow; r++) {
        const sourceCells = [];
        for (let cNum = srcStartColNum; cNum <= srcEndColNum; cNum++) {
          sourceCells.push(this.cellsData.get(`${this._columnLabel(cNum)}${r}`) || { val: "", formula: "", style: {} });
        }

        for (let cNum = target.startColNum; cNum <= target.endColNum; cNum++) {
          const colLetter = this._columnLabel(cNum);
          const destKey = `${colLetter}${r}`;
          const existing = this.cellsData.get(destKey) || { val: "", formula: "", style: {} };
          before[destKey] = structuredClone(existing);

          const stepOffset = cNum - srcEndColNum;
          const cycleIdx = (stepOffset - 1) % srcCount;
          const sourceCell = sourceCells[cycleIdx];

          let newVal = sourceCell.val;
          let newFormula = "";
          const newStyle = structuredClone(sourceCell.style || {});

          if (sourceCell.formula && String(sourceCell.formula).startsWith("=")) {
            const deltaC = cNum - (srcStartColNum + cycleIdx);
            newFormula = this._offsetFormula(sourceCell.formula, deltaC, 0);
            newVal = this.formulaEngine.evaluate(newFormula);
          } else if (srcCount === 1) {
            const rawVal = String(sourceCell.val || "").trim();
            const numVal = Number(rawVal);
            const numEndMatch = rawVal.match(/^(.*?)(\d+)$/);
            if (Number.isFinite(numVal) && rawVal !== "") {
              newVal = numVal + stepOffset;
            } else if (numEndMatch) {
              const prefix = numEndMatch[1];
              const digits = numEndMatch[2];
              const nextNum = parseInt(digits, 10) + stepOffset;
              newVal = `${prefix}${String(nextNum).padStart(digits.length, "0")}`;
            } else {
              newVal = sourceCell.val;
            }
          } else {
            const vals = sourceCells.map(c => Number(c.val));
            if (vals.every(v => Number.isFinite(v))) {
              const step = (vals[vals.length - 1] - vals[0]) / (srcCount - 1);
              newVal = vals[vals.length - 1] + step * stepOffset;
            } else {
              newVal = sourceCell.val;
            }
          }

          const newItem = { val: newVal, formula: newFormula, style: newStyle };
          this.cellsData.set(destKey, newItem);
          after[destKey] = structuredClone(newItem);
        }
      }

      this.selectionRange = { start: src.start, end: { c: this._columnLabel(target.endColNum), r: src.end.r } };
    }

    this._recordHistory({
      type: "fill",
      sheet: this.activeSheet,
      before,
      after
    });

    this._recalculateAllFormulas();
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._updateRangeSelectionVisuals();
  }

  _startCellMove(e) {
    if (this._isMovingCell) return;
    this._isMovingCell = true;
    this._moveSource = { ...this.selectedCoord };
    this._moveTarget = null;

    const onMove = (moveEvt) => {
      const el = typeof document !== "undefined" ? document.elementFromPoint(moveEvt.clientX, moveEvt.clientY) : null;
      const cell = el?.closest?.(".vno-grid-cell");
      this.container?.querySelectorAll?.(".is-move-target-preview").forEach(c => c.classList.remove("is-move-target-preview"));
      if (cell && (cell.dataset.col !== this._moveSource.c || Number(cell.dataset.row) !== this._moveSource.r)) {
        this._moveTarget = { c: cell.dataset.col, r: Number(cell.dataset.row) };
        cell.classList.add("is-move-target-preview");
      } else {
        this._moveTarget = null;
      }
    };

    const onUp = () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      this.container?.querySelectorAll?.(".is-move-target-preview").forEach(c => c.classList.remove("is-move-target-preview"));
      this._isMovingCell = false;
      if (this._moveTarget && (this._moveTarget.c !== this._moveSource.c || this._moveTarget.r !== this._moveSource.r)) {
        this._executeCellMove(this._moveSource, this._moveTarget);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
  }

  _executeCellMove(src, dest) {
    const srcKey = `${src.c}${src.r}`;
    const destKey = `${dest.c}${dest.r}`;
    const srcData = this.cellsData.get(srcKey) || { val: "", formula: "", style: {} };
    const destData = this.cellsData.get(destKey) || { val: "", formula: "", style: {} };

    const before = {
      [srcKey]: structuredClone(srcData),
      [destKey]: structuredClone(destData)
    };

    const after = {
      [srcKey]: { val: "", formula: "", style: {} },
      [destKey]: structuredClone(srcData)
    };

    this.cellsData.set(destKey, structuredClone(srcData));
    this.cellsData.delete(srcKey);

    this._recordHistory({
      type: "fill",
      sheet: this.activeSheet,
      before,
      after
    });

    this.selectCell(dest.c, dest.r);
    this._recalculateAllFormulas();
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
  }

  showContextMenu(e, type, target) {
    this._closeContextMenu();
    if (typeof document === "undefined") return;

    const menu = document.createElement("div");
    menu.className = "vno-sheet-context-menu";

    let items = [];
    if (type === "cell") {
      items = [
        { label: "Cắt", shortcut: "Ctrl+X", action: () => globalCommandBus.execute("common.edit.cut") },
        { label: "Sao chép", shortcut: "Ctrl+C", action: () => globalCommandBus.execute("common.edit.copy") },
        { label: "Dán", shortcut: "Ctrl+V", action: () => globalCommandBus.execute("common.edit.paste") },
        { label: "Dán văn bản thuần", shortcut: "Ctrl+Shift+V", action: () => globalCommandBus.execute("common.edit.pastePlain") },
        { sep: true },
        { label: "Chèn hàng", shortcut: "Ctrl+Shift+=", action: () => globalCommandBus.execute("sheet.row.insert") },
        { label: "Chèn cột", action: () => globalCommandBus.execute("sheet.col.insert") },
        { label: "Xóa hàng", action: () => globalCommandBus.execute("sheet.row.delete") },
        { label: "Xóa cột", action: () => globalCommandBus.execute("sheet.col.delete") },
        { sep: true },
        { label: "Xóa nội dung", shortcut: "Delete", action: () => globalCommandBus.execute("sheet.edit.clearContents") },
        { label: "Định dạng ô...", shortcut: "Ctrl+1", action: () => globalCommandBus.execute("sheet.format.cellsDialog") },
        { label: "Thêm ghi chú", shortcut: "Shift+F2", action: () => this.showCommentDialog({ source: "contextmenu" }) }
      ];
    } else if (type === "col") {
      items = [
        { label: "Cắt", shortcut: "Ctrl+X", action: () => globalCommandBus.execute("common.edit.cut") },
        { label: "Sao chép", shortcut: "Ctrl+C", action: () => globalCommandBus.execute("common.edit.copy") },
        { label: "Dán", shortcut: "Ctrl+V", action: () => globalCommandBus.execute("common.edit.paste") },
        { sep: true },
        { label: "Chèn cột", action: () => globalCommandBus.execute("sheet.col.insert") },
        { label: "Xóa cột", action: () => globalCommandBus.execute("sheet.col.delete") },
        { label: "Xóa nội dung cột", shortcut: "Delete", action: () => globalCommandBus.execute("sheet.edit.clearContents") },
        { sep: true },
        { label: "Tự vừa khít độ rộng cột", action: () => this.autoFitColumn(target) },
        { label: "Ẩn cột", action: () => this.hideColumns([target]) },
        { label: "Hiện cột", action: () => this.unhideColumns([target]) },
        { label: "Định dạng ô...", shortcut: "Ctrl+1", action: () => globalCommandBus.execute("sheet.format.cellsDialog") }
      ];
    } else if (type === "row") {
      items = [
        { label: "Cắt", shortcut: "Ctrl+X", action: () => globalCommandBus.execute("common.edit.cut") },
        { label: "Sao chép", shortcut: "Ctrl+C", action: () => globalCommandBus.execute("common.edit.copy") },
        { label: "Dán", shortcut: "Ctrl+V", action: () => globalCommandBus.execute("common.edit.paste") },
        { sep: true },
        { label: "Chèn hàng", shortcut: "Ctrl+Shift+=", action: () => globalCommandBus.execute("sheet.row.insert") },
        { label: "Xóa hàng", action: () => globalCommandBus.execute("sheet.row.delete") },
        { label: "Xóa nội dung hàng", shortcut: "Delete", action: () => globalCommandBus.execute("sheet.edit.clearContents") },
        { sep: true },
        { label: "Tự vừa khít chiều cao hàng", action: () => this.autoFitRow(target) },
        { label: "Ẩn hàng", action: () => this.hideRows([target]) },
        { label: "Hiện hàng", action: () => this.unhideRows([target]) },
        { label: "Định dạng ô...", shortcut: "Ctrl+1", action: () => globalCommandBus.execute("sheet.format.cellsDialog") }
      ];
    }

    items.forEach(item => {
      if (item.sep) {
        const sep = document.createElement("div");
        sep.className = "vno-sheet-context-sep";
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement("div");
      el.className = "vno-sheet-context-item";
      el.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ""}`;
      el.addEventListener("click", () => {
        this._closeContextMenu();
        item.action();
      });
      menu.appendChild(el);
    });

    document.body.appendChild(menu);
    this._activeContextMenu = menu;

    const x = Math.min(e.clientX, (window.innerWidth || 1200) - 230);
    const y = Math.min(e.clientY, (window.innerHeight || 800) - 320);
    menu.style.left = `${Math.max(10, x)}px`;
    menu.style.top = `${Math.max(10, y)}px`;

    const closeHandler = (evt) => {
      if (!menu.contains(evt.target)) {
        this._closeContextMenu();
      }
    };
    const escHandler = (evt) => {
      if (evt.key === "Escape") this._closeContextMenu();
    };
    menu._vnoCleanup = () => {
      document.removeEventListener("mousedown", closeHandler);
      document.removeEventListener("keydown", escHandler);
    };
    setTimeout(() => {
      document.addEventListener("mousedown", closeHandler);
      document.addEventListener("keydown", escHandler);
    }, 10);
  }

  _closeContextMenu() {
    if (this._activeContextMenu) {
      this._activeContextMenu._vnoCleanup?.();
      this._activeContextMenu.remove();
      this._activeContextMenu = null;
    }
  }

  selectAll() {
    this.selectCell("A", 1);
    this.selectCell(this.cols[this.cols.length - 1], this.rowCount, true);
    return true;
  }

  resetToBlank(defaultSheetName = "Trang tính 1") {
    this.sheets = [defaultSheetName];
    this.activeSheet = defaultSheetName;
    this.sheetsData = { [defaultSheetName]: new Map() };
    this.sheetStates = {
      [defaultSheetName]: { hiddenRows: new Set(), activeFilters: new Map(), isFilterActive: false, isFrozenPanes: false, selectedCoord: { r: 1, c: "A" } }
    };
    this.namedRangesWorkbook = [];
    this.namedRangesBySheet = { [defaultSheetName]: [] };
    this.commentsBySheet = { [defaultSheetName]: {} };
    this.printAreaBySheet = { [defaultSheetName]: null };
    this.pageBreaksBySheet = { [defaultSheetName]: { rows: [], cols: [] } };
    this.pageSetupBySheet = { [defaultSheetName]: newSheetPageSetup() };
    this.conditionalFormattingBySheet = { [defaultSheetName]: [] };
    this.dataValidationsBySheet = { [defaultSheetName]: [] };
    this.chartsBySheet = { [defaultSheetName]: [] };
    this.imagesBySheet = { [defaultSheetName]: [] };
    this.textBoxesBySheet = { [defaultSheetName]: [] };
    this.pivotTablesBySheet = { [defaultSheetName]: [] };
    this.rowHeightsBySheet = { [defaultSheetName]: new Map() };
    this.colWidthsBySheet = { [defaultSheetName]: new Map() };
    this.userHiddenRowsBySheet = { [defaultSheetName]: new Set() };
    this.userHiddenColsBySheet = { [defaultSheetName]: new Set() };
    this.protectionBySheet = { [defaultSheetName]: { enabled: false, password: "" } };
    this.isFrozenPanes = false;
    this.isFilterActive = false;
    this.hiddenRows = new Set();
    this.activeFilters = new Map();
    this.undoStack = [];
    this.redoStack = [];

    if (this.chartLayer) this.chartLayer.innerHTML = "";
    if (this.imageLayer) this.imageLayer.innerHTML = "";

    this._renderSheetTabs();

    if (this.container && typeof this.container.querySelectorAll === "function") {
      this.container.querySelectorAll(".vno-grid-cell").forEach((td) => {
        td.textContent = "";
        td.className = "vno-grid-cell";
        td.style.cssText = "";
      });
    }

    this._renderVirtualRows(1, 40);
    this.renderCharts();
    this.renderImages();
    this.renderTextBoxes();
    this.selectCell("A", 1);
    if (this.formulaInput) this.formulaInput.value = "";
    this._syncCommandStates();
    this.updateStatus();
    return true;
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
    if (!this.imagesBySheet[sheetName]) this.imagesBySheet[sheetName] = [];
    if (!this.textBoxesBySheet[sheetName]) this.textBoxesBySheet[sheetName] = [];
    if (!this.pivotTablesBySheet[sheetName]) this.pivotTablesBySheet[sheetName] = [];
    if (!this.namedRangesBySheet[sheetName]) this.namedRangesBySheet[sheetName] = [];
    if (!this.commentsBySheet[sheetName]) this.commentsBySheet[sheetName] = {};
    if (!(sheetName in this.printAreaBySheet)) this.printAreaBySheet[sheetName] = null;
    if (!this.pageBreaksBySheet[sheetName]) this.pageBreaksBySheet[sheetName] = { rows: [], cols: [] };
    if (!this.pageSetupBySheet[sheetName]) this.pageSetupBySheet[sheetName] = newSheetPageSetup();
    if (!this.mergedRangesBySheet[sheetName]) this.mergedRangesBySheet[sheetName] = [];
    if (!this.protectionBySheet) this.protectionBySheet = {};
    if (!this.protectionBySheet[sheetName]) this.protectionBySheet[sheetName] = { enabled: false, password: "" };
    this._ensureRowColLayout(sheetName);

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
    this.renderImages();
    this.renderTextBoxes();

    // 7. Cập nhật ô chọn và thanh công thức
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    this._syncCommandStates();
    this._applyProtectionUi();

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
    if (!this.imagesBySheet[sheetName]) this.imagesBySheet[sheetName] = [];
    if (!this.textBoxesBySheet[sheetName]) this.textBoxesBySheet[sheetName] = [];
    if (!this.pivotTablesBySheet[sheetName]) this.pivotTablesBySheet[sheetName] = [];
    if (!this.namedRangesBySheet[sheetName]) this.namedRangesBySheet[sheetName] = [];
    if (!this.commentsBySheet[sheetName]) this.commentsBySheet[sheetName] = {};
    if (!(sheetName in this.printAreaBySheet)) this.printAreaBySheet[sheetName] = null;
    if (!this.pageBreaksBySheet[sheetName]) this.pageBreaksBySheet[sheetName] = { rows: [], cols: [] };
    if (!this.pageSetupBySheet[sheetName]) this.pageSetupBySheet[sheetName] = newSheetPageSetup();
    if (!this.mergedRangesBySheet[sheetName]) this.mergedRangesBySheet[sheetName] = [];
    if (!this.protectionBySheet) this.protectionBySheet = {};
    if (!this.protectionBySheet[sheetName]) this.protectionBySheet[sheetName] = { enabled: false, password: "" };
    this._ensureRowColLayout(sheetName);
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

    this._renderSheetTabs();
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
    delete this.imagesBySheet[sheetName];
    delete this.textBoxesBySheet[sheetName];
    delete this.pivotTablesBySheet[sheetName];
    delete this.namedRangesBySheet[sheetName];
    delete this.commentsBySheet[sheetName];
    delete this.printAreaBySheet[sheetName];
    delete this.pageBreaksBySheet[sheetName];
    delete this.pageSetupBySheet[sheetName];
    delete this.mergedRangesBySheet[sheetName];
    delete this.rowHeightsBySheet[sheetName];
    delete this.colWidthsBySheet[sheetName];
    delete this.userHiddenRowsBySheet[sheetName];
    delete this.userHiddenColsBySheet[sheetName];
    if (this.protectionBySheet) delete this.protectionBySheet[sheetName];
    if (this.outlineGroupsBySheet) delete this.outlineGroupsBySheet[sheetName];
    this._renderSheetTabs();
    if (this.activeSheet === sheetName) {
      this.activeSheet = "";
      this.switchSheet(nextSheet);
    }
    this._recalculateAllFormulas();
    if (recordUndo) this._recordHistory({ type: "sheet-delete", sheet: sheetName, index, snapshot, nextSheet });
    return true;
  }

  _sheetKeyedCollections() {
    return [
      "sheetsData", "sheetStates", "namedRangesBySheet", "commentsBySheet",
      "printAreaBySheet", "pageBreaksBySheet", "pageSetupBySheet", "mergedRangesBySheet",
      "conditionalFormattingBySheet", "dataValidationsBySheet", "chartsBySheet",
      "imagesBySheet", "textBoxesBySheet", "pivotTablesBySheet", "outlineGroupsBySheet",
      "rowHeightsBySheet", "colWidthsBySheet", "userHiddenRowsBySheet", "userHiddenColsBySheet",
      "protectionBySheet"
    ];
  }

  _flushActiveSheetState() {
    if (!this.activeSheet) return;
    if (!this.sheetStates) this.sheetStates = {};
    this.sheetStates[this.activeSheet] = {
      hiddenRows: new Set(this.hiddenRows || []),
      activeFilters: new Map(this.activeFilters || []),
      isFilterActive: !!this.isFilterActive,
      isFrozenPanes: !!this.isFrozenPanes,
      selectedCoord: { ...(this.selectedCoord || { r: 1, c: "A" }) }
    };
  }

  _renderSheetTabs() {
    const tabsListEl = this.tabBar?.querySelector?.("#vno-sheet-tabs-list");
    if (!tabsListEl || typeof document === "undefined" || typeof document.createElement !== "function") return;
    tabsListEl.innerHTML = "";
    this.sheets.forEach(sheetName => {
      const isActive = sheetName === this.activeSheet;
      const protectedSheet = this.isSheetProtected(sheetName);
      const tab = document.createElement("div");
      tab.className = `vno-sheet-tab-item${isActive ? " is-active" : ""}${protectedSheet ? " is-protected" : ""}`;
      tab.dataset.sheet = sheetName;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      tab.title = protectedSheet
        ? t("sheetDialogs.sheetTabProtectedTitle", { name: sheetName })
        : sheetName;
      tab.setAttribute("aria-label", protectedSheet
        ? t("sheetDialogs.sheetTabProtectedAria", { name: sheetName })
        : sheetName);
      const label = document.createElement("span");
      label.className = "vno-sheet-tab-label";
      label.textContent = sheetName;
      tab.appendChild(label);
      tab.addEventListener("click", () => this.switchSheet(sheetName));
      tab.addEventListener("dblclick", event => {
        event.preventDefault();
        event.stopPropagation();
        this.switchSheet(sheetName);
        this.showRenameSheetDialog(sheetName);
      });
      tab.addEventListener("contextmenu", event => {
        event.preventDefault();
        this.switchSheet(sheetName);
        this._showSheetTabContextMenu(event, sheetName);
      });
      tabsListEl.appendChild(tab);
    });
  }

  _showSheetTabContextMenu(event, sheetName) {
    this._closeContextMenu();
    if (typeof document === "undefined") return;
    const menu = document.createElement("div");
    menu.className = "vno-sheet-context-menu";
    const items = [
      { label: t("sheetDialogs.renameSheetMenu", "Đổi tên trang tính..."), action: () => this.showRenameSheetDialog(sheetName) },
      { label: t("sheetDialogs.moveCopyMenu", "Di chuyển hoặc Sao chép trang tính..."), action: () => this.showMoveCopySheetDialog(sheetName) },
      { label: this.isSheetProtected(sheetName)
        ? t("sheetDialogs.unprotectSheet", "Bỏ bảo vệ trang tính...")
        : t("sheetDialogs.protectSheet", "Bảo vệ trang tính..."), action: () => this.showProtectSheetDialog(sheetName) }
    ];
    items.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vno-sheet-context-item";
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        this._closeContextMenu();
        item.action();
      });
      menu.appendChild(btn);
    });
    menu.style.position = "fixed";
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.zIndex = "80";
    document.body.appendChild(menu);
    this._activeContextMenu = menu;
    const onDoc = ev => {
      if (!menu.contains(ev.target)) {
        this._closeContextMenu();
        document.removeEventListener("mousedown", onDoc);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
  }

  validateSheetName(name, options = {}) {
    const exclude = options.excludeName;
    const trimmed = String(name ?? "").trim();
    if (!trimmed) {
      return { ok: false, error: t("sheetDialogs.sheetNameEmpty", "Tên trang tính không được để trống.") };
    }
    if (trimmed.length > MAX_SHEET_NAME_LENGTH) {
      return { ok: false, error: t("sheetDialogs.sheetNameTooLong", { max: String(MAX_SHEET_NAME_LENGTH) }) };
    }
    if (INVALID_SHEET_NAME_CHARS.test(trimmed) || trimmed.includes("'")) {
      return { ok: false, error: t("sheetDialogs.sheetNameInvalidChars", "Tên không được chứa các ký tự / \\ ? * [ ] : hoặc dấu nháy đơn.") };
    }
    const duplicate = this.sheets.some(existing =>
      existing.localeCompare(trimmed, undefined, { sensitivity: "accent" }) === 0 && existing !== exclude
    );
    if (duplicate) {
      return { ok: false, error: t("sheetDialogs.sheetNameDuplicate", "Đã có trang tính cùng tên trong workbook này.") };
    }
    return { ok: true, name: trimmed };
  }

  _quoteSheetName(name) {
    return `'${String(name).replace(/'/g, "''")}'`;
  }

  _sheetNameNeedsQuotes(name) {
    return !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(String(name));
  }

  _rewriteSheetNameInText(text, oldName, newName) {
    if (!text || typeof text !== "string" || oldName === newName) return text;
    let out = "";
    let i = 0;
    const source = text;
    while (i < source.length) {
      if (source[i] === '"') {
        out += source[i++];
        while (i < source.length) {
          out += source[i];
          if (source[i] === '"') {
            if (source[i + 1] === '"') {
              out += source[++i];
              i++;
              continue;
            }
            i++;
            break;
          }
          i++;
        }
        continue;
      }
      if (source[i] === "'") {
        let j = i + 1;
        let inner = "";
        while (j < source.length) {
          if (source[j] === "'" && source[j + 1] === "'") {
            inner += "'";
            j += 2;
            continue;
          }
          if (source[j] === "'") {
            j++;
            break;
          }
          inner += source[j++];
        }
        const rewritten = inner.split(":").map(part => (part === oldName ? newName : part)).join(":");
        out += `'${rewritten.replace(/'/g, "''")}'`;
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(source[i])) {
        let j = i;
        while (j < source.length && /[A-Za-z0-9_.]/.test(source[j])) j++;
        const ident = source.slice(i, j);
        if (ident === oldName && (source[j] === "!" || source[j] === ":")) {
          out += this._sheetNameNeedsQuotes(newName) ? this._quoteSheetName(newName) : newName;
          i = j;
          continue;
        }
        out += ident;
        i = j;
        continue;
      }
      out += source[i++];
    }
    return out;
  }

  _rewriteWorkbookSheetName(oldName, newName) {
    if (oldName === newName) return;
    for (const sheetName of this.sheets) {
      const map = this.sheetsData?.[sheetName];
      if (!map) continue;
      for (const item of map.values()) {
        if (item?.formula) item.formula = this._rewriteSheetNameInText(item.formula, oldName, newName);
      }
    }
    const rewriteNamed = collection => {
      (collection || []).forEach(item => {
        if (item.sheet === oldName) item.sheet = newName;
        if (item.ref) item.ref = this._rewriteSheetNameInText(item.ref, oldName, newName);
      });
    };
    rewriteNamed(this.namedRangesWorkbook);
    Object.values(this.namedRangesBySheet || {}).forEach(rewriteNamed);
    Object.values(this.pivotTablesBySheet || {}).forEach(list => {
      (list || []).forEach(pivot => {
        if (pivot.sourceSheet === oldName) pivot.sourceSheet = newName;
        if (pivot.targetSheet === oldName) pivot.targetSheet = newName;
      });
    });
  }

  _renameSheetKey(oldName, newName) {
    if (oldName === newName) return;
    for (const key of this._sheetKeyedCollections()) {
      const bag = this[key];
      if (!bag || typeof bag !== "object") continue;
      if (Object.prototype.hasOwnProperty.call(bag, oldName)) {
        bag[newName] = bag[oldName];
        delete bag[oldName];
      }
    }
  }

  renameSheet(oldName, newName, recordUndo = true) {
    const from = oldName || this.activeSheet;
    if (!this.sheets.includes(from)) return false;
    const validated = this.validateSheetName(newName, { excludeName: from });
    if (!validated.ok) return false;
    const to = validated.name;
    if (to === from) return to;
    this._flushActiveSheetState();
    const index = this.sheets.indexOf(from);
    this.sheets.splice(index, 1, to);
    this._renameSheetKey(from, to);
    this._rewriteWorkbookSheetName(from, to);
    if (this.activeSheet === from) this.activeSheet = to;
    this._renderSheetTabs();
    this._recalculateAllFormulas();
    if (recordUndo) this._recordHistory({ type: "sheet-rename", sheet: to, oldName: from, newName: to });
    return to;
  }

  async showRenameSheetDialog(sheetName = this.activeSheet) {
    const target = sheetName || this.activeSheet;
    if (!this.sheets.includes(target)) return false;
    if (typeof document === "undefined") return false;
    const overlay = this._createSheetDialog(t("sheetDialogs.renameSheetTitle", "Đổi tên trang tính"), `
      <label>${t("sheetDialogs.renameSheetMessage", "Tên trang tính:")}
        <input id="vno-rename-sheet" class="vno-dialog-input" maxlength="${MAX_SHEET_NAME_LENGTH}" value="${this._escapeHtml(target)}" autocomplete="off">
      </label>
      <p class="vno-dialog-hint">${t("sheetDialogs.renameSheetHint", "Tối đa 31 ký tự. Không trùng tên trang khác và không chứa / \\ ? * [ ] :")}</p>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").textContent = t("common.ok", "Đồng ý");
    const input = overlay.querySelector("#vno-rename-sheet");
    input?.focus();
    input?.select?.();
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const validated = this.validateSheetName(input.value, { excludeName: target });
      if (!validated.ok) {
        overlay.querySelector(".vno-rule-error").textContent = validated.error;
        input.focus();
        return;
      }
      this.renameSheet(target, validated.name);
      overlay.closeDialog();
    });
    input?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        overlay.querySelector(".vno-rule-apply").click();
      }
    });
    return true;
  }

  _moveSheetToIndex(sheetName, index) {
    const from = this.sheets.indexOf(sheetName);
    if (from < 0) return false;
    const bounded = Math.max(0, Math.min(this.sheets.length - 1, Number(index)));
    if (from === bounded) return true;
    this.sheets.splice(from, 1);
    this.sheets.splice(bounded, 0, sheetName);
    this._renderSheetTabs();
    return true;
  }

  moveSheet(sheetName, beforeName, recordUndo = true) {
    const name = sheetName || this.activeSheet;
    const from = this.sheets.indexOf(name);
    if (from < 0) return false;
    const others = this.sheets.filter(item => item !== name);
    let to;
    if (beforeName == null || beforeName === SHEET_MOVE_TO_END) to = others.length;
    else {
      const beforeIndex = others.indexOf(beforeName);
      to = beforeIndex < 0 ? others.length : beforeIndex;
    }
    if (from === to) return true;
    this.sheets.splice(from, 1);
    this.sheets.splice(to, 0, name);
    this._renderSheetTabs();
    if (recordUndo) this._recordHistory({ type: "sheet-move", sheet: name, name, fromIndex: from, toIndex: to });
    return true;
  }

  _nextCopiedSheetName(sourceName) {
    const match = String(sourceName).match(/^(.*) \((\d+)\)$/);
    const base = match ? match[1] : sourceName;
    let n = match ? Number(match[2]) + 1 : 2;
    let candidate = `${base} (${n})`;
    while (this.sheets.includes(candidate)) {
      n += 1;
      candidate = `${base} (${n})`;
    }
    if (candidate.length > MAX_SHEET_NAME_LENGTH) {
      const trimmedBase = base.slice(0, Math.max(1, MAX_SHEET_NAME_LENGTH - ` (${n})`.length));
      candidate = `${trimmedBase} (${n})`;
      while (this.sheets.includes(candidate)) {
        n += 1;
        candidate = `${trimmedBase} (${n})`;
      }
    }
    return candidate;
  }

  _cloneSheetCollections(sourceName, targetName) {
    const cells = this.sheetsData[sourceName] || new Map();
    this.sheetsData[targetName] = new Map([...cells.entries()].map(([key, value]) => [key, structuredClone(value)]));
    const state = this.sheetStates[sourceName] || {};
    this.sheetStates[targetName] = {
      hiddenRows: new Set(state.hiddenRows || []),
      activeFilters: new Map([...(state.activeFilters || [])].map(([key, values]) => [key, new Set(values)])),
      isFilterActive: !!state.isFilterActive,
      isFrozenPanes: !!state.isFrozenPanes,
      selectedCoord: { ...(state.selectedCoord || { r: 1, c: "A" }) }
    };
    this.conditionalFormattingBySheet[targetName] = structuredClone(this.conditionalFormattingBySheet[sourceName] || []);
    this.dataValidationsBySheet[targetName] = structuredClone(this.dataValidationsBySheet[sourceName] || []);
    this.chartsBySheet[targetName] = structuredClone(this.chartsBySheet[sourceName] || []);
    this.imagesBySheet[targetName] = structuredClone(this.imagesBySheet[sourceName] || []);
    this.textBoxesBySheet[targetName] = structuredClone(this.textBoxesBySheet[sourceName] || []);
    this.pivotTablesBySheet[targetName] = structuredClone(this.pivotTablesBySheet[sourceName] || []);
    this.namedRangesBySheet[targetName] = structuredClone(this.namedRangesBySheet[sourceName] || []);
    this.commentsBySheet[targetName] = structuredClone(this.commentsBySheet[sourceName] || {});
    this.printAreaBySheet[targetName] = structuredClone(this.printAreaBySheet[sourceName] || null);
    this.pageBreaksBySheet[targetName] = structuredClone(this.pageBreaksBySheet[sourceName] || { rows: [], cols: [] });
    this.pageSetupBySheet[targetName] = newSheetPageSetup(this.pageSetupBySheet[sourceName] || {});
    this.mergedRangesBySheet[targetName] = structuredClone(this.mergedRangesBySheet[sourceName] || []);
    this.outlineGroupsBySheet[targetName] = structuredClone(this.outlineGroupsBySheet[sourceName] || []);
    this.rowHeightsBySheet[targetName] = new Map(this.rowHeightsBySheet[sourceName] || []);
    this.colWidthsBySheet[targetName] = new Map(this.colWidthsBySheet[sourceName] || []);
    this.userHiddenRowsBySheet[targetName] = new Set(this.userHiddenRowsBySheet[sourceName] || []);
    this.userHiddenColsBySheet[targetName] = new Set(this.userHiddenColsBySheet[sourceName] || []);
    this.protectionBySheet[targetName] = structuredClone(this.protectionBySheet[sourceName] || { enabled: false, password: "" });
  }

  copySheet(sourceName, beforeName, recordUndo = true) {
    const source = sourceName || this.activeSheet;
    if (!this.sheets.includes(source)) return false;
    this._flushActiveSheetState();
    const newName = this._nextCopiedSheetName(source);
    this._cloneSheetCollections(source, newName);
    const others = [...this.sheets];
    let insertAt;
    if (beforeName == null || beforeName === SHEET_MOVE_TO_END) insertAt = others.length;
    else {
      const beforeIndex = others.indexOf(beforeName);
      insertAt = beforeIndex < 0 ? others.length : beforeIndex;
    }
    this.sheets.splice(insertAt, 0, newName);
    this._renderSheetTabs();
    this.switchSheet(newName);
    if (recordUndo) this._recordHistory({ type: "sheet-add", sheet: source, sheetName: newName, previousSheet: source, snapshot: this._snapshotSheet(newName) });
    return newName;
  }

  async showMoveCopySheetDialog(sheetName = this.activeSheet) {
    const target = sheetName || this.activeSheet;
    if (!this.sheets.includes(target)) return false;
    if (typeof document === "undefined") return false;
    const options = this.sheets.map(name =>
      `<option value="${this._escapeHtml(name)}"${name === target ? " selected" : ""}>${this._escapeHtml(name)}</option>`
    ).join("");
    const overlay = this._createSheetDialog(t("sheetDialogs.moveCopyTitle", "Di chuyển hoặc Sao chép"), `
      <p>${t("sheetDialogs.moveCopyIntro", { name: this._escapeHtml(target) })}</p>
      <label>${t("sheetDialogs.moveCopyBefore", "Chèn trước trang tính:")}
        <select id="vno-move-before" class="vno-dialog-input">${options}
          <option value="${SHEET_MOVE_TO_END}">${t("sheetDialogs.moveCopyToEnd", "(chuyển đến cuối)")}</option>
        </select>
      </label>
      <label class="vno-dialog-check">
        <input type="checkbox" id="vno-move-copy">
        ${t("sheetDialogs.moveCopyCreateCopy", "Tạo một bản sao")}
      </label>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").textContent = t("common.ok", "Đồng ý");
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const before = overlay.querySelector("#vno-move-before").value;
      const createCopy = overlay.querySelector("#vno-move-copy").checked;
      const beforeArg = before === SHEET_MOVE_TO_END ? SHEET_MOVE_TO_END : before;
      if (createCopy) this.copySheet(target, beforeArg);
      else this.moveSheet(target, beforeArg);
      overlay.closeDialog();
    });
    return true;
  }

  isSheetProtected(sheetName = this.activeSheet) {
    return !!this.protectionBySheet?.[sheetName || this.activeSheet]?.enabled;
  }

  getSheetProtection(sheetName = this.activeSheet) {
    return this.protectionBySheet?.[sheetName || this.activeSheet] || { enabled: false, password: "" };
  }

  _notifySheetProtected() {
    if (typeof document === "undefined" || !document.body) return;
    showAlertDialog({
      title: t("sheetDialogs.protectSheet", "Bảo vệ trang tính"),
      message: t("sheetDialogs.sheetProtectedEdit", "Trang tính đang được bảo vệ. Không thể sửa nội dung ô, định dạng, hay xóa hàng/cột. Chọn Bỏ bảo vệ trang tính để mở khóa (chỉ là khóa giao diện, không phải bảo mật thật)."),
      type: "warning"
    });
  }

  _guardProtectedMutation() {
    if (!this.isSheetProtected()) return false;
    this._notifySheetProtected();
    return true;
  }

  _applyProtectionUi({ renderTabs = false } = {}) {
    const locked = this.isSheetProtected();
    this.container?.classList?.toggle?.("vno-sheet-protected", locked);
    if (this.formulaInput) {
      this.formulaInput.readOnly = locked;
      this.formulaInput.title = locked
        ? t("sheetDialogs.sheetProtectedEdit", "Trang tính đang được bảo vệ.")
        : "";
    }
    globalCommandBus?.updateState?.("sheet.sheet.protect", {
      label: locked
        ? t("sheetDialogs.unprotectSheet", "Bỏ bảo vệ trang tính...")
        : t("sheetDialogs.protectSheet", "Bảo vệ trang tính..."),
      tooltip: locked
        ? t("sheetDialogs.unprotectSheetTooltip", "Tắt khóa giao diện của trang tính hiện tại")
        : t("sheetDialogs.protectSheetTooltip", "Khóa sửa ô, định dạng và xóa hàng/cột trên trang tính hiện tại (khóa giao diện, không phải bảo mật thật)")
    });
    if (renderTabs) this._renderSheetTabs();
  }

  protectSheet(options = {}, recordUndo = false) {
    const sheetName = options.sheetName || this.activeSheet;
    if (!this.sheets.includes(sheetName)) return false;
    if (!this.protectionBySheet) this.protectionBySheet = {};
    this.protectionBySheet[sheetName] = {
      enabled: true,
      password: String(options.password || "")
    };
    if (sheetName === this.activeSheet) this._applyProtectionUi({ renderTabs: true });
    else this._renderSheetTabs();
    this._syncCommandStates();
    return true;
  }

  unprotectSheet(options = {}, recordUndo = false) {
    const sheetName = options.sheetName || this.activeSheet;
    const current = this.getSheetProtection(sheetName);
    if (!current.enabled) return true;
    const supplied = options.password == null ? "" : String(options.password);
    if (current.password && supplied !== current.password) return false;
    this.protectionBySheet[sheetName] = { enabled: false, password: "" };
    if (sheetName === this.activeSheet) this._applyProtectionUi({ renderTabs: true });
    else this._renderSheetTabs();
    this._syncCommandStates();
    return true;
  }

  async showProtectSheetDialog(sheetName = this.activeSheet) {
    const target = sheetName || this.activeSheet;
    if (!this.sheets.includes(target)) return false;
    if (this.isSheetProtected(target)) {
      const current = this.getSheetProtection(target);
      if (!current.password) return this.unprotectSheet({ sheetName: target });
      if (typeof document === "undefined") return false;
      const overlay = this._createSheetDialog(t("sheetDialogs.unprotectSheet", "Bỏ bảo vệ trang tính"), `
        <p>${t("sheetDialogs.unprotectPasswordMessage", "Nhập mật khẩu để bỏ bảo vệ trang tính (khóa giao diện, không phải bảo mật thật).")}</p>
        <label>${t("sheetDialogs.protectPassword", "Mật khẩu")}
          <input id="vno-unprotect-password" class="vno-dialog-input" type="password" autocomplete="off">
        </label>
        <div class="vno-rule-error" role="alert"></div>`);
      if (!overlay) return false;
      overlay.querySelector(".vno-rule-apply").textContent = t("common.ok", "Đồng ý");
      overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
        const ok = this.unprotectSheet({ sheetName: target, password: overlay.querySelector("#vno-unprotect-password").value });
        if (!ok) {
          overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.unprotectPasswordWrong", "Mật khẩu không đúng.");
          return;
        }
        overlay.closeDialog();
      });
      return true;
    }
    if (typeof document === "undefined") return false;
    const overlay = this._createSheetDialog(t("sheetDialogs.protectSheetTitle", "Bảo vệ trang tính"), `
      <label class="vno-dialog-check">
        <input type="checkbox" id="vno-protect-enable" checked>
        ${t("sheetDialogs.protectSheetCheckbox", "Bảo vệ trang tính và nội dung các ô bị khóa")}
      </label>
      <p class="vno-dialog-hint">${t("sheetDialogs.protectSheetHint", "Khi bật: không sửa nội dung ô, không đổi định dạng, không chèn/xóa hàng hoặc cột. Đây là khóa giao diện, mật khẩu lưu dạng chữ thường trong phiên làm việc — không phải bảo mật thật.")}</p>
      <label>${t("sheetDialogs.protectPassword", "Mật khẩu (tùy chọn)")}
        <input id="vno-protect-password" class="vno-dialog-input" type="password" autocomplete="new-password">
      </label>
      <label>${t("sheetDialogs.protectPasswordConfirm", "Nhập lại mật khẩu")}
        <input id="vno-protect-password2" class="vno-dialog-input" type="password" autocomplete="new-password">
      </label>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").textContent = t("common.ok", "Đồng ý");
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      if (!overlay.querySelector("#vno-protect-enable").checked) {
        overlay.closeDialog();
        return;
      }
      const password = overlay.querySelector("#vno-protect-password").value;
      const confirm = overlay.querySelector("#vno-protect-password2").value;
      if (password !== confirm) {
        overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.protectPasswordMismatch", "Hai mật khẩu không khớp.");
        return;
      }
      this.protectSheet({ sheetName: target, password });
      overlay.closeDialog();
    });
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
      if (this._isRowSkipped(r)) continue;

      const tr = document.createElement("tr");
      tr.dataset.row = r;
      const rowHeight = this.getRowHeight(r);
      tr.style.height = `${rowHeight}px`;

      const thRow = document.createElement("th");
      thRow.className = "vno-row-header";
      thRow.dataset.row = r;
      thRow.style.height = `${rowHeight}px`;
      thRow.innerHTML = `
        ${this._outlineToggleHtml("row", r)}
        <span class="vno-row-title">${r}</span>
        <div class="vno-row-resizer" data-row="${r}" title="Nhấp đúp để tự động vừa chiều cao hàng ${r}"></div>
      `;
      thRow.querySelector(".vno-outline-toggle")?.addEventListener("click", event => {
        event.stopPropagation();
        this.toggleOutlineGroup(event.currentTarget.dataset.groupId);
      });
      thRow.addEventListener("click", (e) => {
        if (e.target.closest(".vno-row-resizer")) return;
        this.selectCell(this.cols[0], r);
        this.selectCell(this.cols[this.cols.length - 1], r, true);
      });
      thRow.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.selectCell(this.cols[0], r);
        this.selectCell(this.cols[this.cols.length - 1], r, true);
        this.showContextMenu(e, "row", r);
      });
      thRow.querySelector(".vno-row-resizer")?.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.autoFitRow(r);
      });
      tr.appendChild(thRow);

      const normRange = this._normalizeRange(this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
      const isMulti = (normRange.start.c !== normRange.end.c || normRange.start.r !== normRange.end.r);

      this.cols.forEach(c => {
        const mergedRange = this.getMergedRangeForCell(c, r);
        if (mergedRange && (mergedRange.start.c !== c || mergedRange.start.r !== r)) return;
        const td = document.createElement("td");
        td.hidden = this._isColumnHidden(c);
        td.className = "vno-grid-cell";
        const coordKey = `${c}${r}`;
        td.dataset.coord = coordKey;
        td.dataset.col = c;
        td.dataset.row = r;
        if (mergedRange) {
          td.colSpan = this._columnNumber(mergedRange.end.c) - this._columnNumber(mergedRange.start.c) + 1;
          td.rowSpan = mergedRange.end.r - mergedRange.start.r + 1;
          td.dataset.mergedRange = this._rangeLabel(mergedRange);
          td.classList.add("is-merged-cell");
        }

        const itm = this.cellsData.get(coordKey);
        this._renderCellVisual(td, itm, c, r);
        this._applyRowColSizeToCell(td, c, r);
        this._applyRuleVisuals(td, c, r);
        this._applyAnnotationAndPageVisuals(td, c, r);

        if (this.selectedCoord.c === c && this.selectedCoord.r === r) {
          td.classList.add("is-selected");
          this._attachMoveHandles(td);
        }
        if (this._rangeContains(this.selectionRange, c, r) && isMulti) {
          td.classList.add("is-range-selected");
        }
        if (normRange.end.c === c && normRange.end.r === r) {
          this._attachAutofillHandle(td);
        }

        td.addEventListener("mousedown", (e) => {
          if (e.button !== 0) return;
          if (e.target.closest(".vno-cell-autofill-handle") || e.target.closest(".vno-cell-move-handle")) return;
          this._startRangeSelect(e, c, r);
        });
        td.addEventListener("click", event => {
          if (event.defaultPrevented) return;
          this.selectCell(c, r, event.shiftKey);
        });
        td.addEventListener("dblclick", (e) => {
          e.preventDefault();
          if (this.formatPainter) return;
          if (this._guardProtectedMutation()) return;
          this._focusFormulaInputAtEnd();
        });
        td.addEventListener("contextmenu", event => {
          event.preventDefault();
          const inRange = this._rangeContains(this.selectionRange, c, r);
          if (!inRange) {
            this.selectCell(c, r);
          }
          this.showContextMenu(event, "cell", coordKey);
        });

        tr.appendChild(td);
      });

      frag.appendChild(tr);
    }

    this.tbody.insertBefore(frag, this.bottomSpacer);
    this.renderAuditArrows?.();
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
      if (e.key === "Escape" && this.formatPainter) {
        e.preventDefault();
        this.cancelFormatPainter();
        return;
      }
      if (document.activeElement === this.formulaInput) return;

      const colIdx = this.cols.indexOf(this.selectedCoord.c);
      let nextCol = this.selectedCoord.c;
      let nextRow = this.selectedCoord.r;
      let extendRange = false;

      if (e.key === "ArrowUp") {
        if (e.ctrlKey) {
          const curVal = this.cellsData.get(`${this.selectedCoord.c}${this.selectedCoord.r}`)?.val;
          let r = this.selectedCoord.r - 1;
          if (curVal !== undefined && curVal !== "") {
            while (r > 1) {
              const nextVal = this.cellsData.get(`${this.selectedCoord.c}${r}`)?.val;
              if (nextVal === undefined || nextVal === "") { r++; break; }
              r--;
            }
          } else {
            while (r > 1) {
              const nextVal = this.cellsData.get(`${this.selectedCoord.c}${r}`)?.val;
              if (nextVal !== undefined && nextVal !== "") break;
              r--;
            }
          }
          nextRow = Math.max(1, r);
        } else {
          nextRow = Math.max(1, nextRow - 1);
        }
        extendRange = e.shiftKey;
      } else if (e.key === "ArrowDown") {
        if (e.ctrlKey) {
          const curVal = this.cellsData.get(`${this.selectedCoord.c}${this.selectedCoord.r}`)?.val;
          let r = this.selectedCoord.r + 1;
          if (curVal !== undefined && curVal !== "") {
            while (r < this.rowCount) {
              const nextVal = this.cellsData.get(`${this.selectedCoord.c}${r}`)?.val;
              if (nextVal === undefined || nextVal === "") { r--; break; }
              r++;
            }
          } else {
            while (r < this.rowCount) {
              const nextVal = this.cellsData.get(`${this.selectedCoord.c}${r}`)?.val;
              if (nextVal !== undefined && nextVal !== "") break;
              r++;
            }
          }
          nextRow = Math.min(this.rowCount, r);
        } else {
          nextRow = Math.min(this.rowCount, nextRow + 1);
        }
        extendRange = e.shiftKey;
      } else if (e.key === "ArrowLeft") {
        if (e.ctrlKey) {
          const curVal = this.cellsData.get(`${this.selectedCoord.c}${this.selectedCoord.r}`)?.val;
          let idx = colIdx - 1;
          if (curVal !== undefined && curVal !== "") {
            while (idx > 0) {
              const nextVal = this.cellsData.get(`${this.cols[idx]}${this.selectedCoord.r}`)?.val;
              if (nextVal === undefined || nextVal === "") { idx++; break; }
              idx--;
            }
          } else {
            while (idx > 0) {
              const nextVal = this.cellsData.get(`${this.cols[idx]}${this.selectedCoord.r}`)?.val;
              if (nextVal !== undefined && nextVal !== "") break;
              idx--;
            }
          }
          nextCol = this.cols[Math.max(0, idx)];
        } else {
          nextCol = this.cols[Math.max(0, colIdx - 1)];
        }
        extendRange = e.shiftKey;
      } else if (e.key === "ArrowRight") {
        if (e.ctrlKey) {
          const curVal = this.cellsData.get(`${this.selectedCoord.c}${this.selectedCoord.r}`)?.val;
          let idx = colIdx + 1;
          if (curVal !== undefined && curVal !== "") {
            while (idx < this.cols.length - 1) {
              const nextVal = this.cellsData.get(`${this.cols[idx]}${this.selectedCoord.r}`)?.val;
              if (nextVal === undefined || nextVal === "") { idx--; break; }
              idx++;
            }
          } else {
            while (idx < this.cols.length - 1) {
              const nextVal = this.cellsData.get(`${this.cols[idx]}${this.selectedCoord.r}`)?.val;
              if (nextVal !== undefined && nextVal !== "") break;
              idx++;
            }
          }
          nextCol = this.cols[Math.min(this.cols.length - 1, idx)];
        } else {
          nextCol = this.cols[Math.min(this.cols.length - 1, colIdx + 1)];
        }
        extendRange = e.shiftKey;
      } else if (e.key === "Home" && e.ctrlKey) {
        nextCol = "A";
        nextRow = 1;
      } else if (e.key === "End" && e.ctrlKey) {
        let maxC = 0;
        let maxR = 1;
        for (const [coord, data] of this.cellsData.entries()) {
          if (data && (data.val || data.formula)) {
            const [colLetter, rowNum] = this._splitCoord(coord);
            const cIdx = this.cols.indexOf(colLetter);
            if (cIdx > maxC) maxC = cIdx;
            if (rowNum > maxR) maxR = rowNum;
          }
        }
        nextCol = this.cols[maxC];
        nextRow = maxR;
      } else if (e.key === "PageUp" && e.ctrlKey) {
        e.preventDefault();
        this.previousSheet();
        return;
      } else if (e.key === "PageDown" && e.ctrlKey) {
        e.preventDefault();
        this.nextSheet();
        return;
      } else if (e.key === " " && e.ctrlKey) {
        e.preventDefault();
        this.selectCurrentColumn();
        return;
      } else if (e.key === " " && e.shiftKey) {
        e.preventDefault();
        this.selectCurrentRow();
        return;
      } else if (e.key === "`" && e.ctrlKey) {
        e.preventDefault();
        this.toggleShowFormulas();
        return;
      } else if ((e.key === ";" || e.key === ":") && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        this.insertCurrentTime();
        return;
      } else if (e.key === "F9") {
        e.preventDefault();
        this.recalculateAll();
        return;
      } else if (e.key === "F4") {
        e.preventDefault();
        this.redo();
        return;
      } else if (e.key === "Enter") {
        nextRow = e.shiftKey ? Math.max(1, nextRow - 1) : Math.min(this.rowCount, nextRow + 1);
      } else if (e.key === "Tab") {
        nextCol = e.shiftKey ? this.cols[Math.max(0, colIdx - 1)] : this.cols[Math.min(this.cols.length - 1, colIdx + 1)];
      } else if (e.key === "F2") {
        e.preventDefault();
        if (this._guardProtectedMutation()) return;
        const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
        const cur = this.cellsData.get(key);
        this._cellValueBeforeEdit = cur ? (cur.formula || cur.val || "") : "";
        this._focusFormulaInputAtEnd();
        return;
      } else if (e.key === "=" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (this._guardProtectedMutation()) return;
        const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
        const cur = this.cellsData.get(key);
        this._cellValueBeforeEdit = cur ? (cur.formula || cur.val || "") : "";
        this.formulaInput.value = "=";
        this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, "=", true, { coalesce: true });
        this._focusFormulaInputAtEnd();
        if (this.autocomplete) {
          this.autocomplete.handleInput("=", 1);
        }
        return;
      } else if ((e.key === "Delete" || e.key === "Backspace") && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Xóa nội dung ô hoặc vùng đang chọn ngay, đúng hành vi Excel thật
        e.preventDefault();
        if (this._guardProtectedMutation()) return;
        if (this.selectionRange && (this.selectionRange.start.c !== this.selectionRange.end.c || this.selectionRange.start.r !== this.selectionRange.end.r)) {
          const cells = this.formulaEngine.expandRange(this.getSelectedRangeLabel());
          cells.forEach(coord => {
            const [c, r] = this._splitCoord(coord);
            this.setCellValue(c, r, "");
          });
        } else {
          this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, "");
        }
        if (this.formulaInput) this.formulaInput.value = "";
        return;
      } else if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        globalCommandBus?.execute?.("common.edit.copy");
        return;
      } else if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        globalCommandBus?.execute?.("common.edit.paste");
        return;
      } else if (e.ctrlKey && e.altKey && !e.metaKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        globalCommandBus?.execute?.("sheet.edit.pasteSpecial");
        return;
      } else if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        globalCommandBus?.execute?.("common.edit.cut");
        return;
      } else if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === "1") {
        e.preventDefault();
        this.showFormatCellsDialog();
        return;
      } else if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        this.fillDown();
        return;
      } else if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        this.fillRight();
        return;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Gõ TRỰC TIẾP bất kỳ ký tự in được nào khi đang chọn ô (không bấm F2 trước) phải
        // THAY THẾ nội dung ô đó và vào chế độ sửa — đúng hành vi cơ bản nhất của Excel.
        e.preventDefault();
        if (this._guardProtectedMutation()) return;
        const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
        const cur = this.cellsData.get(key);
        this._cellValueBeforeEdit = cur ? (cur.formula || cur.val || "") : "";
        this.formulaInput.value = e.key;
        this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, e.key, true, { coalesce: true });
        this._focusFormulaInputAtEnd();
        if (this.autocomplete) {
          this.autocomplete.handleInput(e.key, 1);
        }
        return;
      } else return;

      e.preventDefault();
      this.selectCell(nextCol, nextRow, extendRange);
    });
  }

  focusFormulaInput() {
    if (this.formulaInput) {
      this.formulaInput.focus();
      this.formulaInput.select();
    }
  }

  /**
   * Focus ô công thức với con trỏ đặt Ở CUỐI nội dung hiện có, KHÔNG bôi đen chọn hết
   * (khác `focusFormulaInput()`). Dùng khi vừa gán 1 ký tự mở đầu (vd "=" để bắt đầu
   * công thức, hoặc ký tự đầu tiên khi gõ trực tiếp thay thế nội dung ô) — nếu dùng
   * `focusFormulaInput()` (bôi đen chọn hết) ở đây, ký tự tiếp theo gõ vào sẽ THAY THẾ
   * (xóa mất) ký tự vừa đặt thay vì nối tiếp theo sau, dẫn đến gõ "=PMT(...)" chỉ còn
   * lại "PMT(...)" (mất dấu "="). Lỗi thật, phát hiện 04/09/2026.
   */
  _focusFormulaInputAtEnd() {
    if (!this.formulaInput) return;
    this.formulaInput.focus();
    const end = this.formulaInput.value.length;
    if (typeof this.formulaInput.setSelectionRange === "function") {
      this.formulaInput.setSelectionRange(end, end);
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

    const mergedRange = this.getMergedRangeForCell(col, row);
    if (mergedRange && !extendRange) {
      this.selectionRange = structuredClone(mergedRange);
      this.selectedCoord = { ...mergedRange.start };
      col = mergedRange.start.c;
      row = mergedRange.start.r;
    } else if (!extendRange || !this.selectionRange) {
      this.selectionRange = { start: { c: col, r: row }, end: { c: col, r: row } };
      this.selectedCoord = { c: col, r: row };
    } else {
      this.selectionRange.end = { c: col, r: row };
      // Giữ nguyên selectedCoord là ô neo bắt đầu (anchor) của vùng chọn
    }

    // Tự động cuộn viewport nếu ô nằm ngoài phạm vi hiển thị ảo
    if (this.viewport && (row < this.currentStartRow || row > this.currentEndRow)) {
      this.viewport.scrollTop = Math.max(0, (row - 5) * this.rowHeight);
      this._onViewportScroll();
    }

    this.container.querySelectorAll?.(".vno-grid-cell.is-selected, .vno-grid-cell.is-range-selected").forEach(old => {
      old.classList.remove("is-selected", "is-range-selected");
      old.querySelectorAll?.(".vno-cell-autofill-handle, .vno-cell-move-handle, .vno-cell-validation-select").forEach(el => el.remove());
    });

    const activeCoordKey = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const activeTarget = this.container.querySelector(`.vno-grid-cell[data-coord="${activeCoordKey}"]`);
    if (activeTarget) {
      activeTarget.classList.add("is-selected");
      this._attachMoveHandles(activeTarget);
    }

    const norm = this._normalizeRange(this.selectionRange);
    const endCoordKey = `${norm.end.c}${norm.end.r}`;
    const endTarget = this.container.querySelector(`.vno-grid-cell[data-coord="${endCoordKey}"]`);
    if (endTarget) {
      this._attachAutofillHandle(endTarget);
    }

    this.container.querySelectorAll?.(".vno-grid-cell[data-coord]").forEach(cell => {
      const inRange = this._rangeContains(this.selectionRange, cell.dataset.col, Number(cell.dataset.row));
      cell.classList.toggle("is-range-selected", inRange && this.getSelectedRangeLabel().includes(":"));
    });

    if (this.nameBox) this.nameBox.textContent = this.getSelectedRangeLabel();

    const data = this.cellsData.get(activeCoordKey);
    const displayVal = data ? (data.formula || data.val) : "";
    if (this.formulaInput) this.formulaInput.value = displayVal;
    this._showValidationDropdown(activeTarget, col, row);

    if (this.options.onSelect) {
      this.options.onSelect(activeCoordKey, data, this._calculateStats());
    }

    // Đưa focus bàn phím thật về container lưới khi chọn ô
    if (typeof this.container.focus === "function") {
      this.container.focus({ preventScroll: true });
    }
  }

  navigateHome() {
    this.selectCell("A", 1);
    if (this.viewport) this.viewport.scrollLeft = 0;
    return true;
  }

  navigateToDataEnd() {
    let maxRow = 1;
    let maxCol = 1;
    for (const [coord, cell] of this.cellsData.entries()) {
      if (!cell || (cell.val === "" && cell.formula === "")) continue;
      const match = /^([A-Z]+)(\d+)$/i.exec(coord);
      if (!match) continue;
      maxRow = Math.max(maxRow, Number(match[2]));
      maxCol = Math.max(maxCol, this._columnNumber(match[1].toUpperCase()));
    }
    const col = this._columnLabel(maxCol);
    this.selectCell(col, maxRow);
    const target = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${col}${maxRow}"]`);
    target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    return true;
  }

  setCellValue(col, row, val, recordUndo = true, historyOptions = {}) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const key = `${col}${row}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };

    if (recordUndo && val === "" && item.isArrayFormula && item.arrayRange) {
      return this._clearArrayFormula(item.arrayRange);
    }

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
      // Store the raw computed value (number, string, or #ERROR!). Do NOT
      // pre-format as VNĐ currency text here: that both destroys precision
      // for non-money formulas (percentages, ratios, statistics...) and
      // corrupts any later formula that references this cell, because
      // getCellValue()'s Vietnamese-currency-string parser strips "." as a
      // thousands separator - which mangles a formatted decimal string back
      // into the wrong number. Display formatting belongs solely to
      // NumberFormatter at render time, driven by the cell's actual
      // numberFormat (General by default, Currency only if the user set it).
      item.val = this.formulaEngine.evaluate(val);
    } else {
      item.formula = "";
      item.val = NumberFormatter.normalizeInputForFormat(val, item.style?.numberFormat);
    }

    this.cellsData.set(key, item);

    const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    if (cell) {
      this._renderCellVisual(cell, item, col, row);
      this._applyRuleVisuals(cell, col, row);
    }

    // Tự động tính toán lại các ô có công thức khác (trừ khi ở chế độ Manual)
    if (this.calculationMode !== "manual") {
      this._recalculateAllFormulas(key);
    }
    this.refreshCharts();
    this._updateWatchWindow?.();
    return true;
  }

  _recalculateAllFormulas(excludeKey, force = false) {
    if (this.calculationMode === "manual" && !force) return;
    const activeSheet = this.activeSheet;
    for (const sheetName of this.sheets) {
      const map = this.sheetsData[sheetName];
      this.activeSheet = sheetName;
      for (const [k, itm] of map.entries()) {
      if ((sheetName !== activeSheet || k !== excludeKey) && itm.formula) {
        let res;
        if (itm.isArrayFormula && itm.arrayRange) {
          const results = this.formulaEngine.evaluateArray(itm.formula);
          const coords = this.formulaEngine.expandRange(itm.arrayRange);
          res = Array.isArray(results) ? results[coords.indexOf(k)] : results;
        } else res = this.formulaEngine.evaluate(itm.formula);
        // Store the raw computed value - see setCellValue() for why
        // auto-formatting a formula result as VNĐ currency text here is
        // wrong (destroys precision and corrupts any formula chain that
        // references this cell). Display formatting is NumberFormatter's
        // job at render time, driven by the cell's actual numberFormat.
        itm.val = res;
        const dom = sheetName === activeSheet ? this.container.querySelector(`.vno-grid-cell[data-coord="${k}"]`) : null;
        if (dom) {
          const [cCoord, rCoord] = this._splitCoord(k);
          this._renderCellVisual(dom, itm, cCoord, rCoord);
          this._applyRuleVisuals(dom, cCoord, rCoord);
        }
      }
      }
    }
    this.activeSheet = activeSheet;
    this._refreshVisibleRuleVisuals();
  }

  enterArrayFormula(options = {}) {
    options = options || {};
    const formula = String(options.formula ?? this.formulaInput?.value ?? "").trim();
    if (!formula.startsWith("=")) return false;
    const range = this._normalizeRange();
    const coords = [];
    for (let row = range.start.r; row <= range.end.r; row++) {
      for (let col = this.cols.indexOf(range.start.c); col <= this.cols.indexOf(range.end.c); col++) coords.push(`${this.cols[col]}${row}`);
    }
    const result = this.formulaEngine.evaluateArray(formula);
    const values = Array.isArray(result) ? result : [result];
    if (values.length !== coords.length) return false;
    const pending = this.undoStack[this.undoStack.length - 1];
    const activeKey = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const consumesPending = pending?.type === "cell" && pending.sheet === this.activeSheet && `${pending.col}${pending.row}` === activeKey;
    const before = coords.map(coord => {
      const item = structuredClone(this.cellsData.get(coord) || null);
      if (consumesPending && coord === activeKey) return pending.prevVal ? { val: pending.prevVal, formula: pending.prevVal.startsWith?.("=") ? pending.prevVal : "", style: item?.style || {} } : null;
      return item;
    });
    if (consumesPending) this.undoStack.pop();
    const arrayRange = this.getSelectedRangeLabel();
    coords.forEach((coord, index) => {
      const [col, row] = this._splitCoord(coord);
      const old = this.cellsData.get(coord) || { style: {} };
      this.cellsData.set(coord, { ...old, val: values[index], formula, isArrayFormula: true, arrayRange });
      const dom = this.container.querySelector?.(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) dom.textContent = values[index];
    });
    const after = coords.map(coord => structuredClone(this.cellsData.get(coord)));
    this._recordHistory({ type: "array-formula", sheet: this.activeSheet, coords, before, after });
    this.refreshCharts();
    return true;
  }

  _clearArrayFormula(arrayRange) {
    const coords = this.formulaEngine.expandRange(arrayRange);
    const before = coords.map(coord => structuredClone(this.cellsData.get(coord) || null));
    coords.forEach(coord => {
      this.cellsData.delete(coord);
      const dom = this.container.querySelector?.(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) dom.textContent = "";
    });
    this._recordHistory({ type: "array-formula", sheet: this.activeSheet, coords, before, after: coords.map(() => null) });
    this.refreshCharts();
    return true;
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

  showFunctionDialog(categoryFilter = null) {
    if (typeof document === "undefined") return false;
    const modal = document.createElement("div");
    modal.className = "vno-dialog-overlay vno-func-dialog";

    let selectedCat = categoryFilter || t("sheetDialogs.allCategory");
    let searchQuery = "";
    let selectedFunc = FUNCTION_CATALOG[0];

    const getFilteredFunctions = () => {
      return FUNCTION_CATALOG.filter(f => {
        const matchCat = (selectedCat === t("sheetDialogs.allCategory") || selectedCat === "Tất cả")
          ? true
          : (f.category.toLowerCase().includes(selectedCat.toLowerCase()) || selectedCat.toLowerCase().includes(f.category.toLowerCase()));
        if (!matchCat) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      });
    };

    const renderFuncList = () => {
      const listEl = modal.querySelector("#vno-func-list");
      if (!listEl) return;
      listEl.innerHTML = "";

      const filtered = getFilteredFunctions();
      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="padding:12px;color:#94a3b8;font-size:12px;text-align:center;">Không tìm thấy hàm phù hợp.</div>`;
        return;
      }

      if (!filtered.some(f => f.name === selectedFunc?.name)) {
        selectedFunc = filtered[0];
      }

      filtered.forEach(f => {
        const isSel = f.name === selectedFunc?.name;
        const item = document.createElement("div");
        item.className = `vno-func-item ${isSel ? "is-selected" : ""}`;
        item.dataset.funcName = f.name;
        item.style.cssText = `padding:5px 8px; cursor:pointer; font-size:12px; font-weight:600; font-family:var(--vno-font-ui, sans-serif); border-radius:3px; display:flex; justify-content:space-between; align-items:center; background:${isSel ? "#e7f4ec" : "transparent"}; color:${isSel ? "#0f6d38" : "#0f172a"}; transition:background-color 0.1s;`;
        item.innerHTML = `<span>${f.name}</span><span style="font-size:10px;color:${isSel ? "#0f6d38" : "#94a3b8"};font-weight:400;">${f.category}</span>`;

        item.addEventListener("click", () => {
          selectedFunc = f;
          renderFuncList();
          renderDesc();
        });
        item.addEventListener("dblclick", () => {
          selectedFunc = f;
          insertChosenFunction();
        });
        listEl.appendChild(item);
      });
    };

    const renderDesc = () => {
      const syntaxEl = modal.querySelector("#vno-func-syntax");
      const descEl = modal.querySelector("#vno-func-desc");
      const catEl = modal.querySelector("#vno-func-cat-badge");
      if (syntaxEl && selectedFunc) syntaxEl.textContent = `=${selectedFunc.syntax}`;
      if (descEl && selectedFunc) descEl.textContent = selectedFunc.desc;
      if (catEl && selectedFunc) catEl.textContent = `Nhóm: ${selectedFunc.category}`;
    };

    const insertChosenFunction = () => {
      close();
      if (!selectedFunc) return;
      let formulaText;
      if (this.formulaInput && document.activeElement === this.formulaInput) {
        const start = this.formulaInput.selectionStart || 0;
        const end = this.formulaInput.selectionEnd || 0;
        const cur = this.formulaInput.value;
        const insertStr = cur.startsWith("=") ? `${selectedFunc.name}()` : `=${selectedFunc.name}()`;
        formulaText = cur.slice(0, start) + insertStr + cur.slice(end);
      } else {
        formulaText = `=${selectedFunc.syntax.replace(/\s*\[.*?\]/g, "")}`;
      }
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, formulaText);
      if (this.formulaInput) this.formulaInput.value = formulaText;
      this.focusFormulaInput();
    };

    modal.innerHTML = `
      <div class="vno-dialog-box" style="width:620px;">
        <div class="vno-dialog-header">
          <span>${t("sheetDialogs.functionTitle") || "Chèn Hàm (Insert Function fx)"}</span>
          <button class="vno-dialog-close-btn" id="vno-fx-close" aria-label="${t("sheetDialogs.close") || "Đóng"}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-size:12px;font-weight:600;color:#334155;">${t("sheetDialogs.searchFunction") || "Tìm kiếm hàm:"}</label>
            <input id="vno-func-search" class="vno-input" autocomplete="off" placeholder="${t("sheetDialogs.searchPlaceholder") || "Gõ tên hàm hoặc mô tả để tìm kiếm..."}" style="padding:6px 10px;font-size:12px;border:1px solid #cbd5e1;border-radius:4px;outline:none;">
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;font-weight:600;color:#334155;">${t("sheetDialogs.functionCategory") || "Danh mục hàm:"}</span>
            <select class="vno-select" id="vno-func-cat-select" style="flex:1;">
              <option value="${t("sheetDialogs.allCategory")}">${t("sheetDialogs.allFunctions") || "Tất cả các hàm"}</option>
              <option value="Tài chính">${t("sheetDialogs.financialFunctions") || "Tài chính (PMT, FV, PV...)"}</option>
              <option value="Logic">${t("sheetDialogs.logicFunctions") || "Logic (IF, AND, OR...)"}</option>
              <option value="Văn bản">${t("sheetDialogs.textFunctions") || "Văn bản (CONCAT, LEN...)"}</option>
              <option value="Ngày tháng">${t("sheetDialogs.dateFunctions") || "Ngày & Giờ (TODAY, NOW...)"}</option>
              <option value="Tra cứu">${t("sheetDialogs.lookupFunctions") || "Tra cứu & Tham chiếu (VLOOKUP, INDEX...)"}</option>
              <option value="Toán học">${t("sheetDialogs.mathFunctions") || "Toán học & Lượng giác"}</option>
              <option value="Thống kê">${t("sheetDialogs.statsFunctions") || "Thống kê (AVERAGE, COUNT...)"}</option>
            </select>
          </div>

          <div style="display:flex;gap:12px;height:220px;">
            <div id="vno-func-list" style="width:230px;border:1px solid #cbd5e1;border-radius:4px;overflow-y:auto;padding:4px;background:#ffffff;"></div>
            <div style="flex:1;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;">
              <div id="vno-func-cat-badge" style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;"></div>
              <strong id="vno-func-syntax" style="font-family:Consolas, monospace;color:#0f6d38;font-size:13px;word-break:break-all;"></strong>
              <p id="vno-func-desc" style="font-size:12px;color:#334155;line-height:1.5;margin:0;"></p>
            </div>
          </div>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn" id="vno-fx-cancel-btn">${t("sheetDialogs.cancelLong") || "Hủy bỏ"}</button>
          <button class="vno-btn vno-btn-primary" id="vno-fx-insert-btn">${t("sheetDialogs.insertFunction") || "Chèn hàm vào ô"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    if (categoryFilter) {
      const select = modal.querySelector("#vno-func-cat-select");
      if (select) {
        for (const opt of select.options) {
          if (opt.value.toLowerCase() === categoryFilter.toLowerCase() || categoryFilter.toLowerCase().includes(opt.value.toLowerCase())) {
            select.value = opt.value;
            selectedCat = opt.value;
            break;
          }
        }
      }
    }

    renderFuncList();
    renderDesc();

    const searchInput = modal.querySelector("#vno-func-search");
    searchInput?.focus();
    searchInput?.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderFuncList();
      renderDesc();
    });

    const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
    modal.querySelector("#vno-fx-close").addEventListener("click", close);
    modal.querySelector("#vno-fx-cancel-btn").addEventListener("click", close);

    modal.querySelector("#vno-func-cat-select").addEventListener("change", (e) => {
      selectedCat = e.target.value;
      renderFuncList();
      renderDesc();
    });

    modal.querySelector("#vno-fx-insert-btn").addEventListener("click", insertChosenFunction);
    return true;
  }

  showDefineNameDialog() {
    if (typeof document === "undefined") return false;
    const currentRef = this.getSelectedRangeLabel();
    const overlay = this._createSheetDialog(
      t("sheetDialogs.defineNameTitle", "Đặt tên vùng (Define Name)"),
      `<div class="vno-define-name-form" style="display:flex;flex-direction:column;gap:12px;min-width:360px;">
        <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;">
          ${t("sheetDialogs.nameLabel", "Tên:")}
          <input id="vno-defname-name" class="vno-input" autocomplete="off" placeholder="${t("sheetDialogs.namePlaceholder", "Ví dụ: BangLuong, DonGia")}" style="padding:6px;font-size:12px;border:1px solid #cbd5e1;border-radius:4px;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;">
          ${t("sheetDialogs.scopeLabel", "Phạm vi:")}
          <select id="vno-defname-scope" class="vno-select" style="padding:6px;font-size:12px;">
            <option value="workbook">${t("sheetDialogs.scopeWorkbook", "Workbook (Toàn bảng tính)")}</option>
            <option value="sheet">Sheet (${this._escapeHtml(this.activeSheet)})</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;">
          ${t("sheetDialogs.refersTo", "Tham chiếu đến:")}
          <input id="vno-defname-ref" class="vno-input" value="${this._escapeHtml(currentRef)}" style="padding:6px;font-size:12px;border:1px solid #cbd5e1;border-radius:4px;">
        </label>
        <div class="vno-rule-error" role="alert" style="color:#dc2626;font-size:11px;"></div>
      </div>`
    );
    if (!overlay) return false;
    const nameInput = overlay.querySelector("#vno-defname-name");
    nameInput?.focus();

    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const name = overlay.querySelector("#vno-defname-name").value.trim();
      const ref = overlay.querySelector("#vno-defname-ref").value.trim();
      const scope = overlay.querySelector("#vno-defname-scope").value;
      const res = this.saveNamedRange({ name, ref, scope, sheet: this.activeSheet });
      if (!res) {
        overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.invalidName", "Tên không hợp lệ hoặc đã tồn tại.");
        return;
      }
      overlay.remove();
    });
    return true;
  }

  showUseInFormulaDialog() {
    if (typeof document === "undefined") return false;
    const names = [...(this.namedRangesWorkbook || []), ...(this.namedRangesBySheet?.[this.activeSheet] || [])];
    if (names.length === 0) {
      this.showNameManager();
      return false;
    }

    const overlay = this._createSheetDialog(
      t("sheetDialogs.useInFormulaTitle", "Dùng tên trong công thức (Paste Name)"),
      `<div class="vno-use-in-formula-dialog" style="min-width:320px;display:flex;flex-direction:column;gap:10px;">
        <p style="font-size:12px;color:#475569;margin:0;">${t("sheetDialogs.useInFormulaPrompt", "Chọn một tên để chèn vào công thức:")}</p>
        <div style="max-height:180px;overflow-y:auto;border:1px solid #cbd5e1;border-radius:4px;padding:4px;">
          ${names.map((item, idx) => `
            <div class="vno-paste-name-item ${idx === 0 ? "is-selected" : ""}" data-name="${this._escapeHtml(item.name)}" style="padding:6px 10px;cursor:pointer;font-size:12px;border-radius:3px;display:flex;justify-content:space-between;background:${idx === 0 ? "#e7f4ec" : "transparent"};">
              <strong style="color:#0f6d38;">${this._escapeHtml(item.name)}</strong>
              <span style="color:#64748b;font-family:monospace;">${this._escapeHtml(item.ref)}</span>
            </div>
          `).join("")}
        </div>
      </div>`
    );
    if (!overlay) return false;

    let selectedName = names[0]?.name;
    const items = overlay.querySelectorAll(".vno-paste-name-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        items.forEach(i => i.style.backgroundColor = "transparent");
        item.style.backgroundColor = "#e7f4ec";
        selectedName = item.dataset.name;
      });
      item.addEventListener("dblclick", () => {
        selectedName = item.dataset.name;
        applyName();
      });
    });

    const applyName = () => {
      if (!selectedName) return;
      overlay.remove();
      if (this.formulaInput) {
        const start = this.formulaInput.selectionStart || 0;
        const end = this.formulaInput.selectionEnd || 0;
        const cur = this.formulaInput.value;
        const nextVal = cur ? cur.slice(0, start) + selectedName + cur.slice(end) : `=${selectedName}`;
        this.formulaInput.value = nextVal;
        this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, nextVal);
        this.focusFormulaInput();
      } else {
        this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, `=${selectedName}`);
      }
    };

    overlay.querySelector(".vno-rule-apply").addEventListener("click", applyName);
    return true;
  }

  createNamesFromSelection() {
    const range = this._normalizeRange(this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const startRow = range.start.r;
    const endRow = range.end.r;
    const startCol = range.start.c;
    const endCol = range.end.c;

    if (endRow <= startRow) return false;

    let createdCount = 0;
    const startColIdx = this.cols.indexOf(startCol);
    const endColIdx = this.cols.indexOf(endCol);

    for (let c = startColIdx; c <= endColIdx; c++) {
      const colLetter = this.cols[c];
      const headerCell = this.cellsData.get(`${colLetter}${startRow}`);
      const rawHeader = headerCell?.val || "";
      const cleanName = String(rawHeader).trim().replace(/[^\w]/g, "_").replace(/^[^A-Za-z_]+/, "");
      if (cleanName && cleanName.length >= 1) {
        const refRange = `${colLetter}${startRow + 1}:${colLetter}${endRow}`;
        this.saveNamedRange({ name: cleanName, ref: refRange, scope: "workbook", sheet: this.activeSheet });
        createdCount++;
      }
    }
    return createdCount > 0;
  }

  extractFormulaReferences(formula) {
    if (!formula || typeof formula !== "string" || !formula.startsWith("=")) return [];
    const text = formula.substring(1).trim();
    const refs = new Set();
    // Range references: A1:B10 or Sheet1!A1:B10
    const rangeRegex = /(?:(?:'[^']+'|[A-Za-z0-9_]+)!)?\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/gi;
    let match;
    while ((match = rangeRegex.exec(text)) !== null) {
      const rangeStr = `${match[1].toUpperCase()}${match[2]}:${match[3].toUpperCase()}${match[4]}`;
      try {
        const coords = this.formulaEngine.expandRange(rangeStr);
        for (const c of coords) refs.add(c.toUpperCase());
      } catch (_) {}
    }
    const stripped = text.replace(rangeRegex, " ");
    // Single cell references: A1, $A$1, etc.
    const singleRegex = /(?:(?:'[^']+'|[A-Za-z0-9_]+)!)?\$?([A-Z]+)\$?(\d+)/gi;
    while ((match = singleRegex.exec(stripped)) !== null) {
      refs.add(`${match[1].toUpperCase()}${match[2]}`);
    }
    // Also resolve named ranges if any
    const names = [...(this.namedRangesWorkbook || []), ...(this.namedRangesBySheet?.[this.activeSheet] || [])];
    for (const nr of names) {
      if (new RegExp(`\\b${nr.name}\\b`, "i").test(text)) {
        try {
          const coords = this.formulaEngine.expandRange(nr.ref);
          for (const c of coords) refs.add(c.toUpperCase());
        } catch (_) {}
      }
    }
    return Array.from(refs);
  }

  tracePrecedents() {
    const coordKey = `${this.selectedCoord.c}${this.selectedCoord.r}`.toUpperCase();
    const item = this.cellsData.get(coordKey);
    if (!item || !item.formula) {
      return { type: "precedents", target: coordKey, cells: [] };
    }
    const precedents = this.extractFormulaReferences(item.formula);
    if (!this.auditArrows) this.auditArrows = [];
    this.auditArrows = this.auditArrows.filter(a => !(a.type === "precedents" && a.target === coordKey));
    this.auditArrows.push({ type: "precedents", target: coordKey, cells: precedents });
    this.renderAuditArrows();
    for (const c of precedents) {
      const el = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${c}"]`);
      if (el?.classList) el.classList.add("vno-cell-precedent");
    }
    return { type: "precedents", target: coordKey, cells: precedents };
  }

  traceDependents() {
    const coordKey = `${this.selectedCoord.c}${this.selectedCoord.r}`.toUpperCase();
    const dependents = [];
    for (const [k, itm] of this.cellsData.entries()) {
      if (k !== coordKey && itm && itm.formula) {
        const refs = this.extractFormulaReferences(itm.formula);
        if (refs.includes(coordKey)) {
          dependents.push(k);
        }
      }
    }
    if (!this.auditArrows) this.auditArrows = [];
    this.auditArrows = this.auditArrows.filter(a => !(a.type === "dependents" && a.source === coordKey));
    this.auditArrows.push({ type: "dependents", source: coordKey, cells: dependents });
    this.renderAuditArrows();
    for (const c of dependents) {
      const el = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${c}"]`);
      if (el?.classList) el.classList.add("vno-cell-dependent");
    }
    return { type: "dependents", source: coordKey, cells: dependents };
  }

  removeArrows() {
    this.auditArrows = [];
    if (this.auditLayer) this.auditLayer.innerHTML = "";
    if (this.container?.querySelectorAll) {
      this.container.querySelectorAll(".vno-cell-precedent, .vno-cell-dependent").forEach(el => {
        el.classList?.remove?.("vno-cell-precedent", "vno-cell-dependent");
      });
    }
    return true;
  }

  renderAuditArrows() {
    if (!this.auditLayer || typeof document === "undefined" || typeof document.createElementNS !== "function") return;
    this.auditLayer.innerHTML = "";
    if (!this.auditArrows || !this.auditArrows.length) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "vno-audit-svg");
    svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="vno-arrow-precedent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563EB"/>
      </marker>
      <marker id="vno-arrow-dependent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#0F6D38"/>
      </marker>
    `;
    svg.appendChild(defs);

    const getCellCenter = (coord) => {
      const [c, r] = this._splitCoord(coord);
      const colIdx = this.cols.indexOf(c);
      const rNum = parseInt(r, 10);
      const cellEl = this.container?.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (cellEl && this.viewport) {
        const rect = cellEl.getBoundingClientRect();
        const vpRect = this.viewport.getBoundingClientRect();
        return {
          x: rect.left - vpRect.left + this.viewport.scrollLeft + rect.width / 2,
          y: rect.top - vpRect.top + this.viewport.scrollTop + rect.height / 2
        };
      }
      return {
        x: 46 + Math.max(0, colIdx) * 100 + 50,
        y: 28 + Math.max(0, rNum - 1) * this.rowHeight + this.rowHeight / 2
      };
    };

    for (const audit of this.auditArrows) {
      if (audit.type === "precedents") {
        const targetPt = getCellCenter(audit.target);
        for (const cellCoord of audit.cells) {
          const fromPt = getCellCenter(cellCoord);
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", fromPt.x);
          circle.setAttribute("cy", fromPt.y);
          circle.setAttribute("r", "4");
          circle.setAttribute("fill", "#2563EB");
          circle.setAttribute("stroke", "#FFFFFF");
          circle.setAttribute("stroke-width", "1");
          svg.appendChild(circle);

          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", fromPt.x);
          line.setAttribute("y1", fromPt.y);
          line.setAttribute("x2", targetPt.x);
          line.setAttribute("y2", targetPt.y);
          line.setAttribute("stroke", "#2563EB");
          line.setAttribute("stroke-width", "2");
          line.setAttribute("marker-end", "url(#vno-arrow-precedent)");
          svg.appendChild(line);
        }
      } else if (audit.type === "dependents") {
        const fromPt = getCellCenter(audit.source);
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", fromPt.x);
        circle.setAttribute("cy", fromPt.y);
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", "#0F6D38");
        circle.setAttribute("stroke", "#FFFFFF");
        circle.setAttribute("stroke-width", "1");
        svg.appendChild(circle);

        for (const cellCoord of audit.cells) {
          const targetPt = getCellCenter(cellCoord);
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", fromPt.x);
          line.setAttribute("y1", fromPt.y);
          line.setAttribute("x2", targetPt.x);
          line.setAttribute("y2", targetPt.y);
          line.setAttribute("stroke", "#0F6D38");
          line.setAttribute("stroke-width", "2");
          line.setAttribute("marker-end", "url(#vno-arrow-dependent)");
          svg.appendChild(line);
        }
      }
    }

    this.auditLayer.appendChild(svg);
  }

  showErrorCheckingDialog() {
    if (typeof document === "undefined") return false;
    const errors = [];
    for (const [k, itm] of this.cellsData.entries()) {
      if (itm && this.formulaEngine && this.formulaEngine._isError(itm.val)) {
        errors.push({ coord: k, val: String(itm.val), formula: itm.formula || "" });
      }
    }

    const overlay = this._createSheetDialog(
      t("sheetDialogs.errorCheckingTitle") || "Kiểm tra lỗi công thức (Error Checking)",
      `<div class="vno-error-checking-dialog" style="min-width:480px;display:flex;flex-direction:column;gap:12px;">
        ${errors.length === 0 ? `
          <div style="padding:16px;text-align:center;color:#0f6d38;font-size:13px;font-weight:600;">
            ✓ ${t("sheetDialogs.noErrorsFound") || "Kiểm tra hoàn tất. Không tìm thấy ô nào có giá trị lỗi trong trang tính."}
          </div>
        ` : `
          <p style="font-size:12px;color:#475569;margin:0;">${t("sheetDialogs.errorsFoundPrompt", { count: errors.length }) || `Phát hiện <strong>${errors.length}</strong> ô có lỗi công thức trong trang tính hiện tại:`}</p>
          <div style="max-height:220px;overflow-y:auto;border:1px solid #cbd5e1;border-radius:4px;">
            <table class="vno-dialog-table" style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;text-align:left;">
                  <th style="padding:6px 10px;">${t("sheetDialogs.errorColCell", "Ô")}</th>
                  <th style="padding:6px 10px;">${t("sheetDialogs.errorColCode", "Mã lỗi")}</th>
                  <th style="padding:6px 10px;">${t("sheetDialogs.errorColFormula", "Công thức")}</th>
                  <th style="padding:6px 10px;">${t("sheetDialogs.errorColReason", "Nguyên nhân")}</th>
                </tr>
              </thead>
              <tbody>
                ${errors.map((err, i) => {
                  let reason = t("sheetDialogs.calcError", "Lỗi tính toán");
                  if (err.val.includes("DIV/0")) reason = t("sheetDialogs.divZero", "Chia cho số 0 hoặc ô trống");
                  else if (err.val.includes("REF")) reason = t("sheetDialogs.invalidRef", "Tham chiếu ô không hợp lệ");
                  else if (err.val.includes("VALUE")) reason = t("sheetDialogs.wrongType", "Sai kiểu dữ liệu (số vs chữ)");
                  else if (err.val.includes("N/A")) reason = t("sheetDialogs.naError", "Giá trị không tồn tại");
                  else if (err.val.includes("NAME")) reason = t("sheetDialogs.nameError", "Tên hàm/vùng không xác định");
                  else if (err.val.includes("NUM")) reason = t("sheetDialogs.numError", "Giá trị số ngoài phạm vi");
                  return `
                    <tr class="vno-error-row" data-coord="${err.coord}" style="cursor:pointer;border-bottom:1px solid #f1f5f9;${i % 2 === 1 ? "background:#f8fafc;" : ""}">
                      <td style="padding:6px 10px;font-weight:700;color:#0f6d38;">${err.coord}</td>
                      <td style="padding:6px 10px;color:#dc2626;font-weight:700;">${this._escapeHtml(err.val)}</td>
                      <td style="padding:6px 10px;font-family:monospace;">${this._escapeHtml(err.formula || "")}</td>
                      <td style="padding:6px 10px;color:#64748b;">${reason}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>`
    );
    if (!overlay) return false;
    const applyBtn = overlay.querySelector(".vno-rule-apply");
    if (applyBtn) applyBtn.style.display = "none";
    const cancelBtn = overlay.querySelector(".vno-rule-cancel");
    if (cancelBtn) cancelBtn.textContent = "Đóng";

    overlay.querySelectorAll(".vno-error-row").forEach(row => {
      row.addEventListener("click", () => {
        const coord = row.dataset.coord;
        if (coord) {
          const [c, r] = this._splitCoord(coord);
          this.selectCell(c, r);
          overlay.remove();
        }
      });
    });
    return true;
  }

  showWatchWindow() {
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return false;
    let win = document.querySelector("#vno-watch-window");
    if (win) {
      win.style.display = win.style.display === "none" ? "flex" : "none";
      if (win.style.display !== "none") this._updateWatchWindow();
      return true;
    }

    if (!this.watchedCells) this.watchedCells = new Set();
    const coordKey = `${this.activeSheet}!${this.selectedCoord.c}${this.selectedCoord.r}`;
    if (this.watchedCells.size === 0) {
      this.watchedCells.add(coordKey);
    }

    win = document.createElement("div");
    win.id = "vno-watch-window";
    win.className = "vno-watch-window";
    win.style.cssText = `
      position:fixed;right:24px;bottom:36px;width:440px;height:250px;background:#ffffff;border:1px solid #cbd5e1;
      border-radius:6px;box-shadow:0 8px 24px rgba(15,23,42,0.16);z-index:9999;display:flex;flex-direction:column;font-size:12px;overflow:hidden;
    `;

    win.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f1f5f9;color:#0f172a;font-weight:600;border-bottom:1px solid #cbd5e1;">
        <span style="font-size:12px;display:flex;align-items:center;gap:6px;">${t("sheetDialogs.watchWindowTitle") || "Cửa sổ theo dõi (Watch Window)"}</span>
        <button id="vno-watch-close" type="button" class="vno-dialog-close-btn" style="width:22px;height:22px;min-width:22px;min-height:22px;padding:0;font-size:16px;">&times;</button>
      </div>
      <div style="display:flex;gap:8px;padding:6px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <button id="vno-watch-add" type="button" class="vno-btn" style="font-size:11px;padding:3px 10px;height:24px;background:#ffffff;border:1px solid #cbd5e1;border-radius:3px;font-weight:500;">+ ${t("sheetDialogs.addWatch") || "Thêm ô theo dõi"}</button>
        <button id="vno-watch-del" type="button" class="vno-btn" style="font-size:11px;padding:3px 10px;height:24px;background:#ffffff;border:1px solid #cbd5e1;border-radius:3px;font-weight:500;">- ${t("sheetDialogs.deleteWatch") || "Xóa"}</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0;">
        <table class="vno-watch-table" style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #cbd5e1;text-align:left;color:#475569;">
              <th style="padding:5px 8px;border-right:1px solid #e2e8f0;font-weight:600;">Sheet</th>
              <th style="padding:5px 8px;border-right:1px solid #e2e8f0;font-weight:600;">Ô</th>
              <th style="padding:5px 8px;border-right:1px solid #e2e8f0;font-weight:600;">Giá trị</th>
              <th style="padding:5px 8px;font-weight:600;">Công thức</th>
            </tr>
          </thead>
          <tbody id="vno-watch-tbody"></tbody>
        </table>
      </div>
    `;

    document.body.appendChild(win);

    win.querySelector("#vno-watch-close").addEventListener("click", () => {
      win.style.display = "none";
    });

    win.querySelector("#vno-watch-add").addEventListener("click", () => {
      const cKey = `${this.activeSheet}!${this.selectedCoord.c}${this.selectedCoord.r}`;
      this.watchedCells.add(cKey);
      this._updateWatchWindow();
    });

    win.querySelector("#vno-watch-del").addEventListener("click", () => {
      const selectedRow = win.querySelector(".vno-watch-row.is-selected");
      if (selectedRow) {
        this.watchedCells.delete(selectedRow.dataset.watchKey);
        this._updateWatchWindow();
      }
    });

    this._updateWatchWindow();
    return true;
  }

  _updateWatchWindow() {
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return;
    const tbody = document.querySelector("#vno-watch-tbody");
    if (!tbody || !this.watchedCells) return;
    tbody.innerHTML = "";
    if (this.watchedCells.size === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:16px;color:#94a3b8;">Chưa có ô theo dõi nào.</td></tr>`;
      return;
    }

    for (const key of this.watchedCells) {
      const [sheetName, coord] = key.split("!");
      const map = this.sheetsData?.[sheetName] || (sheetName === this.activeSheet ? this.cellsData : null);
      const itm = map?.get(coord);
      const val = itm ? (itm.val ?? "") : "";
      const formula = itm ? (itm.formula || "") : "";

      const tr = document.createElement("tr");
      tr.className = "vno-watch-row";
      tr.dataset.watchKey = key;
      tr.style.cssText = "border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background-color 0.1s;";
      tr.innerHTML = `
        <td style="padding:5px 8px;font-weight:600;border-right:1px solid #f1f5f9;">${this._escapeHtml(sheetName)}</td>
        <td style="padding:5px 8px;font-weight:700;color:#0f6d38;border-right:1px solid #f1f5f9;">${this._escapeHtml(coord)}</td>
        <td style="padding:5px 8px;border-right:1px solid #f1f5f9;">${this._escapeHtml(String(val))}</td>
        <td style="padding:5px 8px;font-family:Consolas, monospace;color:#64748b;">${this._escapeHtml(formula)}</td>
      `;
      tr.addEventListener("click", () => {
        tbody.querySelectorAll(".vno-watch-row").forEach(r => r.classList.remove("is-selected"));
        tr.classList.add("is-selected");
      });
      tbody.appendChild(tr);
    }
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

  insertImage(src, anchor = this.selectedCoord, recordUndo = true) {
    if (typeof src !== "string" || !src.startsWith("data:image/")) return false;
    const image = {
      id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      src,
      anchor: { c: anchor?.c || this.selectedCoord.c, r: Number(anchor?.r || this.selectedCoord.r) }
    };
    this.imagesBySheet[this.activeSheet] ||= [];
    this.imagesBySheet[this.activeSheet].push(image);
    this.renderImages();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: this.activeSheet, collection: "imagesBySheet", operation: "insert", index: this.imagesBySheet[this.activeSheet].length - 1, item: structuredClone(image) });
    return image;
  }

  deleteImage(imageId, sheetName = this.activeSheet, recordUndo = true) {
    const images = this.imagesBySheet[sheetName] || [];
    const index = images.findIndex(image => image.id === imageId);
    if (index < 0) return false;
    const [image] = images.splice(index, 1);
    if (sheetName === this.activeSheet) this.renderImages();
    if (recordUndo) this._recordHistory({ type: "collection", sheet: sheetName, collection: "imagesBySheet", operation: "delete", index, item: structuredClone(image) });
    return true;
  }

  renderImages() {
    if (!this.imageLayer || typeof document === "undefined") return;
    this.imageLayer.innerHTML = "";
    for (const image of this.imagesBySheet[this.activeSheet] || []) {
      const panel = document.createElement("figure");
      const colOffset = Math.max(0, this.cols.indexOf(image.anchor.c)) * 100 + 46;
      const rowOffset = Math.max(0, image.anchor.r - 1) * this.rowHeight + 28;
      panel.className = "vno-sheet-image";
      panel.dataset.imageId = image.id;
      panel.dataset.sheet = this.activeSheet;
      panel.dataset.anchor = `${image.anchor.c}${image.anchor.r}`;
      panel.style.cssText = `position:absolute;left:${colOffset}px;top:${rowOffset}px;width:240px;min-height:80px;margin:0;padding:5px;background:#fff;border:1px solid #94a3b8;border-radius:6px;box-shadow:0 6px 18px rgba(15,23,42,.2);pointer-events:auto`;
      const img = document.createElement("img");
      img.src = image.src;
      img.alt = t("sheetDialogs.insertedImageAlt");
      img.style.cssText = "display:block;width:100%;height:auto;max-height:240px;object-fit:contain";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.imageDelete = "";
      remove.setAttribute("aria-label", t("sheetDialogs.deleteImage"));
      remove.title = t("sheetDialogs.deleteImage");
      remove.textContent = "×";
      remove.style.cssText = "position:absolute;right:7px;top:7px;border:0;background:#fff;border-radius:4px;font-size:18px;cursor:pointer;box-shadow:0 1px 4px rgba(15,23,42,.25)";
      remove.addEventListener("click", () => this.deleteImage(image.id));
      panel.append(img, remove);
      this.imageLayer.appendChild(panel);
    }
  }

  insertSparkline(type, range = this.selectionRange) {
    if (!["line", "column"].includes(type)) return false;
    const sourceRange = this._normalizeRange(range || { start: this.selectedCoord, end: this.selectedCoord });
    const values = [];
    for (let row = sourceRange.start.r; row <= sourceRange.end.r; row++) {
      for (let col = this._columnNumber(sourceRange.start.c); col <= this._columnNumber(sourceRange.end.c); col++) {
        const raw = this.cellsData.get(`${this._columnLabel(col)}${row}`)?.val;
        const value = Number(String(raw ?? "").replace(/\s/g, "").replace(/[₫%]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^\d.+-]/g, ""));
        if (String(raw ?? "").trim() && Number.isFinite(value)) values.push(value);
      }
    }
    if (!values.length) return false;
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const item = this.cellsData.get(key) || { val: "", formula: "", style: {} };
    item.sparkline = { type, values, sourceRange };
    this.cellsData.set(key, item);
    this._renderCellVisual(this.container?.querySelector?.(`.vno-grid-cell[data-coord="${key}"]`), item, this.selectedCoord.c, this.selectedCoord.r);
    return item.sparkline;
  }

  insertHyperlink(url, text = "") {
    const safeUrl = String(url || "").trim();
    if (!/^(https?:|mailto:)/i.test(safeUrl)) return false;
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const item = this.cellsData.get(key) || { val: "", formula: "", style: {} };
    item.hyperlink = safeUrl;
    if (text) item.val = text;
    else if (!item.val) item.val = safeUrl;
    this.cellsData.set(key, item);
    this._renderCellVisual(this.container?.querySelector?.(`.vno-grid-cell[data-coord="${key}"]`), item, this.selectedCoord.c, this.selectedCoord.r);
    return true;
  }

  insertTextBox(text, anchor = this.selectedCoord) {
    const box = { id: `textbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: String(text), anchor: { c: anchor.c, r: anchor.r } };
    this.textBoxesBySheet[this.activeSheet] ||= [];
    this.textBoxesBySheet[this.activeSheet].push(box);
    this.renderTextBoxes();
    this._recordHistory({ type: "collection", sheet: this.activeSheet, collection: "textBoxesBySheet", operation: "insert", index: this.textBoxesBySheet[this.activeSheet].length - 1, item: structuredClone(box) });
    return box;
  }

  renderTextBoxes() {
    if (!this.textBoxLayer || typeof document === "undefined") return;
    this.textBoxLayer.innerHTML = "";
    for (const box of this.textBoxesBySheet[this.activeSheet] || []) {
      const el = document.createElement("div");
      el.className = "vno-sheet-textbox";
      el.dataset.textboxId = box.id;
      el.contentEditable = "true";
      el.textContent = box.text;
      el.style.cssText = `position:absolute;left:${Math.max(0, this.cols.indexOf(box.anchor.c)) * 100 + 46}px;top:${Math.max(0, box.anchor.r - 1) * this.rowHeight + 28}px;min-width:180px;min-height:54px;padding:10px;background:#fff;border:1px solid #64748b;box-shadow:0 4px 12px rgba(15,23,42,.16);pointer-events:auto;resize:both;overflow:auto`;
      el.addEventListener("input", () => { box.text = el.textContent || ""; });
      this.textBoxLayer.appendChild(el);
    }
  }

  insertCurrentDate() {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, dateStr);
    return true;
  }

  showFormatCellsDialog() {
    const activeKey = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const item = this.cellsData.get(activeKey);
    FormatCellsDialog.show({
      currentConfig: item?.style?.numberFormat,
      sampleValue: item?.val,
      onApply: (config) => {
        this.applyNumberFormat(config);
        if (typeof this.container?.focus === "function") {
          this.container.focus({ preventScroll: true });
        }
      },
      onClose: () => {
        if (typeof this.container?.focus === "function") {
          this.container.focus({ preventScroll: true });
        }
      }
    });
    return true;
  }

  applyNumberFormat(config, range = null, recordUndo = true) {
    const targetRange = this._normalizeRange(range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(targetRange));

    const before = {};
    const after = {};

    coords.forEach(coord => {
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
      before[coord] = {
        numberFormat: existing.style?.numberFormat ? structuredClone(existing.style.numberFormat) : null,
        style: structuredClone(existing.style || {}),
        val: existing.val
      };

      existing.style = existing.style ? structuredClone(existing.style) : {};

      if (!config || config.category === "general") {
        delete existing.style.numberFormat;
      } else {
        existing.style.numberFormat = structuredClone(config);
      }

      if (config?.category === "text") {
        existing.style.textAlign = "left";
      }

      after[coord] = {
        numberFormat: existing.style?.numberFormat ? structuredClone(existing.style.numberFormat) : null,
        style: structuredClone(existing.style || {}),
        val: existing.val
      };

      this.cellsData.set(coord, existing);

      const [c, r] = this._splitCoord(coord);
      const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        this._renderCellVisual(dom, existing, c, r);
      }
    });

    if (recordUndo) {
      this._recordHistory({
        type: "format-cells",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    return true;
  }

  formatCurrentCellCurrencyVND() {
    return this.applyNumberFormat({
      category: "currency",
      currencySymbol: "₫",
      decimals: 0,
      useThousands: true,
      negativeStyle: 0
    });
  }

  formatCurrentCellPercent() {
    return this.applyNumberFormat({
      category: "percentage",
      decimals: 2
    });
  }

  formatCurrentCellStandard() {
    return this.applyNumberFormat({
      category: "number",
      decimals: 2,
      useThousands: true,
      negativeStyle: 0
    });
  }

  applyQuickNumberCategory(category) {
    const defaults = {
      general: { category: "general" },
      number: { category: "number", decimals: 2, useThousands: true, negativeStyle: 0 },
      currency: { category: "currency", currencySymbol: "₫", decimals: 2, useThousands: true, negativeStyle: 0 },
      accounting: { category: "accounting", currencySymbol: "₫", decimals: 2 },
      date: { category: "date", dateFormat: "dd/mm/yyyy" },
      percentage: { category: "percentage", decimals: 2 },
      scientific: { category: "scientific", decimals: 2 },
      text: { category: "text" }
    };
    return defaults[category] ? this.applyNumberFormat(defaults[category]) : false;
  }

  adjustDecimalPlaces(direction) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const current = this.cellsData.get(key)?.style?.numberFormat;
    const config = structuredClone(current || {
      category: "number",
      decimals: 0,
      useThousands: false,
      negativeStyle: 0
    });
    if (["general", "text", "date"].includes(config.category)) return false;
    config.decimals = Math.max(0, Math.min(30, (Number(config.decimals) || 0) + (direction > 0 ? 1 : -1)));
    return this.applyNumberFormat(config);
  }

  applyCellStyle(presetOrId, range = null, recordUndo = true) {
    let preset = presetOrId;
    if (typeof presetOrId === "string") {
      preset = CELL_STYLE_PRESETS.find(p => p.id === presetOrId) || { id: presetOrId, style: {} };
    }
    if (!preset) return false;

    const targetRange = this._normalizeRange(range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(targetRange));

    const before = {};
    const after = {};

    coords.forEach(coord => {
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
      before[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      existing.style = existing.style ? structuredClone(existing.style) : {};

      if (preset.id === "normal") {
        delete existing.style.backgroundColor;
        delete existing.style.color;
        delete existing.style.fontWeight;
        delete existing.style.fontStyle;
        delete existing.style.textDecoration;
        delete existing.style.border;
        delete existing.style.borderTop;
        delete existing.style.borderBottom;
        delete existing.style.fontSize;
      } else if (preset.style) {
        Object.assign(existing.style, preset.style);
      }

      if (preset.numberFormat) {
        existing.style.numberFormat = structuredClone(preset.numberFormat);
      }

      after[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      this.cellsData.set(coord, existing);

      const [c, r] = this._splitCoord(coord);
      const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        this._renderCellVisual(dom, existing, c, r);
      }
    });

    if (recordUndo) {
      this._recordHistory({
        type: "cell-style",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    return true;
  }

  showCellStylesDialog() {
    return showCellStylesDialog(this);
  }

  formatAsTable(presetOrId, range = null, recordUndo = true) {
    let preset = presetOrId;
    if (typeof presetOrId === "string") {
      preset = TABLE_STYLE_PRESETS.find(p => p.id === presetOrId) || TABLE_STYLE_PRESETS[0];
    }
    if (!preset) return false;

    const targetRange = this._normalizeRange(range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(targetRange));

    const minRow = Math.min(targetRange.start.r, targetRange.end.r);

    const before = {};
    const after = {};

    coords.forEach(coord => {
      const [c, r] = this._splitCoord(coord);
      const rowNum = Number(r);
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };

      before[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      existing.style = existing.style ? structuredClone(existing.style) : {};

      if (rowNum === minRow) {
        Object.assign(existing.style, preset.headerStyle);
      } else {
        const isEvenBanded = (rowNum - minRow) % 2 === 1;
        const rowStyle = isEvenBanded ? preset.evenRowStyle : preset.oddRowStyle;
        Object.assign(existing.style, rowStyle);
      }

      after[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      this.cellsData.set(coord, existing);

      const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        this._renderCellVisual(dom, existing, c, r);
      }
    });

    if (recordUndo) {
      this._recordHistory({
        type: "format-table",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    return true;
  }

  showFormatAsTableDialog() {
    return showFormatAsTableDialog(this);
  }

  _offsetFormula(formula, deltaCol, deltaRow) {
    if (!formula || typeof formula !== "string" || !formula.startsWith("=")) return formula;
    return formula.split(/("(?:""|[^"])*")/).map((segment, index) => {
      if (index % 2 === 1) return segment;
      return segment.replace(/(^|[^A-Z0-9_])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![A-Z0-9_])/gi, (match, prefix, colAbs, col, rowAbs, row) => {
        let nextCol = col.toUpperCase();
        let nextRow = Number(row);
        if (!colAbs && deltaCol !== 0) {
          const colNum = this._columnNumber(nextCol) + deltaCol;
          if (colNum >= 1 && colNum <= 26) {
            nextCol = this._columnLabel(colNum);
          }
        }
        if (!rowAbs && deltaRow !== 0) {
          const rNum = nextRow + deltaRow;
          if (rNum >= 1) {
            nextRow = rNum;
          }
        }
        return `${prefix}${colAbs}${nextCol}${rowAbs}${nextRow}`;
      });
    }).join("");
  }

  applyPasteSpecial(clipboard, mode = "all", destination = this.selectedCoord) {
    if (!clipboard?.cells?.length || !destination) return false;
    const sourceRows = clipboard.cells;
    const transpose = mode === "transpose";
    const height = transpose ? sourceRows[0].length : sourceRows.length;
    const width = transpose ? sourceRows.length : sourceRows[0].length;
    const before = {};
    const after = {};
    const sourceStartCol = this._columnNumber(clipboard.range?.start?.c || "A");
    const sourceStartRow = Number(clipboard.range?.start?.r || 1);
    const destStartCol = this._columnNumber(destination.c);

    for (let rowOffset = 0; rowOffset < height; rowOffset++) {
      for (let colOffset = 0; colOffset < width; colOffset++) {
        const source = structuredClone(transpose ? sourceRows[colOffset][rowOffset] : sourceRows[rowOffset][colOffset]);
        const destColNumber = destStartCol + colOffset;
        const destRow = Number(destination.r) + rowOffset;
        if (destColNumber < 1 || destColNumber > this.cols.length || destRow < 1 || destRow > this.rowCount) continue;
        const coord = `${this._columnLabel(destColNumber)}${destRow}`;
        const existing = structuredClone(this.cellsData.get(coord) || { val: "", formula: "", style: {} });
        before[coord] = existing;
        let next = structuredClone(existing);
        if (mode === "formats") {
          next.style = structuredClone(source.style || {});
        } else if (mode === "values") {
          next.val = source.val ?? "";
          next.formula = "";
        } else {
          const sourceColOffset = transpose ? rowOffset : colOffset;
          const sourceRowOffset = transpose ? colOffset : rowOffset;
          const formula = source.formula
            ? this._offsetFormula(source.formula, destColNumber - (sourceStartCol + sourceColOffset), destRow - (sourceStartRow + sourceRowOffset))
            : "";
          next.val = mode === "formulas" && !formula ? "" : (source.val ?? "");
          next.formula = formula;
          if (mode !== "formulas") next.style = structuredClone(source.style || {});
        }
        this.cellsData.set(coord, next);
        after[coord] = structuredClone(next);
      }
    }
    if (!Object.keys(after).length) return false;
    this._recordHistory({ type: "batch-cells", sheet: this.activeSheet, before, after });
    this._recalculateAllFormulas();
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this.selectCell(destination.c, destination.r);
    return true;
  }

  toggleFormatPainter(opts = {}) {
    const locked = !!opts.locked;
    const now = Date.now();
    if (this.formatPainter) {
      if (locked) {
        this.formatPainter.locked = true;
        this._syncFormatPainterUi();
        return true;
      }
      if (now - (this._formatPainterActivatedAt || 0) < 400) {
        return true;
      }
      this.cancelFormatPainter();
      return false;
    }
    return this.startFormatPainter({ locked });
  }

  startFormatPainter({ locked = false } = {}) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const item = this.cellsData.get(key);
    this.formatPainter = {
      locked: !!locked,
      sourceCoord: key,
      style: structuredClone(item?.style || {})
    };
    this._formatPainterActivatedAt = Date.now();
    this._bindFormatPainterEscape();
    this._syncFormatPainterUi();
    return true;
  }

  cancelFormatPainter() {
    if (!this.formatPainter) return false;
    this.formatPainter = null;
    this._unbindFormatPainterEscape();
    this._syncFormatPainterUi();
    return true;
  }

  applyFormatPainterToSelection(range = this.selectionRange) {
    if (!this.formatPainter) return false;
    const sourceStyle = structuredClone(this.formatPainter.style || {});
    const norm = this._normalizeRange(range || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(norm));
    if (!coords.length) return false;

    const before = {};
    const after = {};
    for (const coord of coords) {
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
      before[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };
      const next = {
        ...existing,
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(sourceStyle)
      };
      this.cellsData.set(coord, next);
      after[coord] = {
        val: next.val,
        formula: next.formula,
        style: structuredClone(next.style)
      };
      const [c, r] = this._splitCoord(coord);
      const dom = this.container?.querySelector?.(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        dom.style.cssText = "";
        this._renderCellVisual(dom, next, c, r);
        this._applyRuleVisuals?.(dom, c, r);
      }
    }

    this._recordHistory({ type: "batch-cells", sheet: this.activeSheet, before, after });
    if (!this.formatPainter.locked) this.cancelFormatPainter();
    return true;
  }

  _syncFormatPainterUi() {
    const active = !!this.formatPainter;
    const locked = !!this.formatPainter?.locked;
    this.container?.classList?.toggle?.("vno-format-painter-active", active);
    this.container?.classList?.toggle?.("vno-format-painter-locked", locked);
    if (this.container?.dataset) {
      if (active) this.container.dataset.formatPainter = locked ? "locked" : "on";
      else delete this.container.dataset.formatPainter;
    }
    globalCommandBus?.updateState?.("sheet.edit.formatPainter", { checked: active });
  }

  _bindFormatPainterEscape() {
    this._unbindFormatPainterEscape();
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    this._formatPainterEscHandler = (event) => {
      if (event.key === "Escape" && this.formatPainter) {
        event.preventDefault();
        this.cancelFormatPainter();
      }
    };
    document.addEventListener("keydown", this._formatPainterEscHandler, true);
  }

  _unbindFormatPainterEscape() {
    if (this._formatPainterEscHandler && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
      document.removeEventListener("keydown", this._formatPainterEscHandler, true);
    }
    this._formatPainterEscHandler = null;
  }

  showPasteSpecialDialog(clipboard) {
    if (typeof document === "undefined" || !clipboard?.cells?.length) return false;
    const title = t("sheetDialogs.pasteSpecialTitle", "Dán đặc biệt");
    const overlay = this._createSheetDialog(title, `
      <form class="vno-paste-special-dialog" aria-label="${title}">
        <fieldset><legend>${t("sheetDialogs.pasteSpecialGroup", "Dán")}</legend>
          <label><input type="radio" name="paste-special-mode" value="all" checked> ${t("sheetDialogs.pasteSpecialAll", "Tất cả")}</label>
          <label><input type="radio" name="paste-special-mode" value="values"> ${t("sheetDialogs.pasteSpecialValues", "Chỉ giá trị")}</label>
          <label><input type="radio" name="paste-special-mode" value="formulas"> ${t("sheetDialogs.pasteSpecialFormulas", "Chỉ công thức")}</label>
          <label><input type="radio" name="paste-special-mode" value="formats"> ${t("sheetDialogs.pasteSpecialFormats", "Chỉ định dạng")}</label>
          <label><input type="radio" name="paste-special-mode" value="transpose"> ${t("sheetDialogs.pasteSpecialTranspose", "Chuyển vị (đổi hàng/cột)")}</label>
        </fieldset>
      </form>`);
    if (!overlay) return false;
    const form = overlay.querySelector(".vno-paste-special-dialog");
    const paste = () => {
      const mode = form.querySelector('input[name="paste-special-mode"]:checked')?.value || "all";
      this.applyPasteSpecial(clipboard, mode);
      overlay.closeDialog();
    };
    form.addEventListener("submit", event => { event.preventDefault(); paste(); });
    form.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        paste();
      }
    });
    overlay.querySelector(".vno-rule-apply")?.addEventListener("click", paste);
    form.querySelector('input[name="paste-special-mode"]')?.focus();
    return true;
  }

  fillDown(range = null, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const rawRange = range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord };
    const norm = this._normalizeRange(rawRange);
    const minColNum = this._columnNumber(norm.start.c);
    const maxColNum = this._columnNumber(norm.end.c);
    const minRow = norm.start.r;
    const maxRow = norm.end.r;

    const isSingleRow = (minRow === maxRow);
    const sourceRow = isSingleRow ? (minRow - 1) : minRow;
    if (sourceRow < 1) return false;

    const destStartRow = isSingleRow ? minRow : (minRow + 1);
    const destEndRow = maxRow;
    if (destStartRow > destEndRow) return false;

    const before = {};
    const after = {};

    for (let colNum = minColNum; colNum <= maxColNum; colNum++) {
      const colLabel = this._columnLabel(colNum);
      const sourceKey = `${colLabel}${sourceRow}`;
      const sourceCell = this.cellsData.get(sourceKey) || { val: "", formula: "", style: {} };

      for (let r = destStartRow; r <= destEndRow; r++) {
        const destKey = `${colLabel}${r}`;
        const existing = this.cellsData.get(destKey) || { val: "", formula: "", style: {} };
        before[destKey] = {
          val: existing.val,
          formula: existing.formula,
          style: structuredClone(existing.style || {})
        };

        const deltaRow = r - sourceRow;
        let newFormula = "";
        let newVal = "";
        const newStyle = structuredClone(sourceCell.style || {});

        if (sourceCell.formula && sourceCell.formula.startsWith("=")) {
          newFormula = this._offsetFormula(sourceCell.formula, 0, deltaRow);
          newVal = this.formulaEngine.evaluate(newFormula);
        } else {
          newFormula = "";
          newVal = sourceCell.val;
        }

        const newItem = { val: newVal, formula: newFormula, style: newStyle };
        this.cellsData.set(destKey, newItem);

        after[destKey] = {
          val: newItem.val,
          formula: newItem.formula,
          style: structuredClone(newItem.style)
        };

        const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${destKey}"]`);
        if (dom) {
          this._renderCellVisual(dom, newItem, colLabel, r);
          this._applyRuleVisuals?.(dom, colLabel, r);
        }
      }
    }

    if (recordUndo) {
      this._recordHistory({
        type: "fill",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    this._recalculateAllFormulas();
    return true;
  }

  fillRight(range = null, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const rawRange = range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord };
    const norm = this._normalizeRange(rawRange);
    const minColNum = this._columnNumber(norm.start.c);
    const maxColNum = this._columnNumber(norm.end.c);
    const minRow = norm.start.r;
    const maxRow = norm.end.r;

    const isSingleCol = (minColNum === maxColNum);
    const sourceColNum = isSingleCol ? (minColNum - 1) : minColNum;
    if (sourceColNum < 1) return false;

    const destStartCol = isSingleCol ? minColNum : (minColNum + 1);
    const destEndCol = maxColNum;
    if (destStartCol > destEndCol) return false;

    const before = {};
    const after = {};

    for (let r = minRow; r <= maxRow; r++) {
      const sourceColLabel = this._columnLabel(sourceColNum);
      const sourceKey = `${sourceColLabel}${r}`;
      const sourceCell = this.cellsData.get(sourceKey) || { val: "", formula: "", style: {} };

      for (let colNum = destStartCol; colNum <= destEndCol; colNum++) {
        const destColLabel = this._columnLabel(colNum);
        const destKey = `${destColLabel}${r}`;
        const existing = this.cellsData.get(destKey) || { val: "", formula: "", style: {} };
        before[destKey] = {
          val: existing.val,
          formula: existing.formula,
          style: structuredClone(existing.style || {})
        };

        const deltaCol = colNum - sourceColNum;
        let newFormula = "";
        let newVal = "";
        const newStyle = structuredClone(sourceCell.style || {});

        if (sourceCell.formula && sourceCell.formula.startsWith("=")) {
          newFormula = this._offsetFormula(sourceCell.formula, deltaCol, 0);
          newVal = this.formulaEngine.evaluate(newFormula);
        } else {
          newFormula = "";
          newVal = sourceCell.val;
        }

        const newItem = { val: newVal, formula: newFormula, style: newStyle };
        this.cellsData.set(destKey, newItem);

        after[destKey] = {
          val: newItem.val,
          formula: newItem.formula,
          style: structuredClone(newItem.style)
        };

        const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${destKey}"]`);
        if (dom) {
          this._renderCellVisual(dom, newItem, destColLabel, r);
          this._applyRuleVisuals?.(dom, destColLabel, r);
        }
      }
    }

    if (recordUndo) {
      this._recordHistory({
        type: "fill",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    this._recalculateAllFormulas();
    return true;
  }

  clearAll(range = null, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const targetRange = this._normalizeRange(range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(targetRange));

    const before = {};
    const after = {};

    coords.forEach(coord => {
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
      before[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      const newItem = { val: "", formula: "", style: {} };
      this.cellsData.set(coord, newItem);

      after[coord] = {
        val: "",
        formula: "",
        style: {}
      };

      const [c, r] = this._splitCoord(coord);
      const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        dom.style.cssText = "";
        this._renderCellVisual(dom, newItem, c, r);
      }
    });

    if (this.formulaInput && coords.includes(`${this.selectedCoord.c}${this.selectedCoord.r}`)) {
      this.formulaInput.value = "";
    }

    if (recordUndo) {
      this._recordHistory({
        type: "clear",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    this._recalculateAllFormulas();
    return true;
  }

  clearFormats(range = null, recordUndo = true) {
    const targetRange = this._normalizeRange(range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(targetRange));

    const before = {};
    const after = {};

    coords.forEach(coord => {
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
      before[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      existing.style = {};
      this.cellsData.set(coord, existing);

      after[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: {}
      };

      const [c, r] = this._splitCoord(coord);
      const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        dom.style.cssText = "";
        this._renderCellVisual(dom, existing, c, r);
      }
    });

    if (recordUndo) {
      this._recordHistory({
        type: "clear",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    return true;
  }

  clearContents(range = null, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const targetRange = this._normalizeRange(range || this.selectionRange || { start: this.selectedCoord, end: this.selectedCoord });
    const coords = this.formulaEngine.expandRange(this._rangeLabel(targetRange));

    const before = {};
    const after = {};

    coords.forEach(coord => {
      const existing = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
      before[coord] = {
        val: existing.val,
        formula: existing.formula,
        style: structuredClone(existing.style || {})
      };

      existing.val = "";
      existing.formula = "";
      this.cellsData.set(coord, existing);

      after[coord] = {
        val: "",
        formula: "",
        style: structuredClone(existing.style || {})
      };

      const [c, r] = this._splitCoord(coord);
      const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      if (dom) {
        this._renderCellVisual(dom, existing, c, r);
      }
    });

    if (this.formulaInput && coords.includes(`${this.selectedCoord.c}${this.selectedCoord.r}`)) {
      this.formulaInput.value = "";
    }

    if (recordUndo) {
      this._recordHistory({
        type: "clear",
        sheet: this.activeSheet,
        before,
        after
      });
    }

    this._recalculateAllFormulas();
    return true;
  }

  showFindDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);

    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay vno-find-dialog";
      const titleText = (typeof t === "function" && t("commonDialogs.findTitle") !== "commonDialogs.findTitle")
        ? t("commonDialogs.findTitle")
        : "Tìm kiếm trong bảng tính";

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 380px;" role="dialog" aria-modal="true" aria-labelledby="vno-find-title">
          <div class="vno-dialog-header">
            <span id="vno-find-title" style="font-weight:600;font-size:14px;color:#0f172a;">${titleText}</span>
            <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="Đóng">&times;</button>
          </div>
          <div class="vno-dialog-body" style="padding:16px;">
            <div style="margin-bottom:12px;">
              <label for="vno-find-query-input" style="display:block;font-size:12px;font-weight:500;color:#334155;margin-bottom:4px;">Nội dung cần tìm:</label>
              <input type="text" id="vno-find-query-input" class="vno-input" style="width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;" placeholder="Nhập từ khóa hoặc số..." />
            </div>
            <div id="vno-find-status" style="font-size:12px;color:#64748b;min-height:18px;margin-bottom:8px;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button type="button" class="vno-btn" id="vno-find-cancel-btn" style="padding:6px 12px;">Đóng</button>
              <button type="button" class="vno-btn vno-btn-primary" id="vno-find-next-btn" style="padding:6px 14px;background:#0f6d38;color:#fff;border-radius:4px;border:none;cursor:pointer;">Tìm tiếp</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector("#vno-find-query-input");
      const status = overlay.querySelector("#vno-find-status");
      const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
      const cancelBtn = overlay.querySelector("#vno-find-cancel-btn");
      const nextBtn = overlay.querySelector("#vno-find-next-btn");

      let lastFoundCoord = null;

      const doFind = () => {
        const query = (input?.value || "").trim().toLowerCase();
        if (!query) {
          if (status) {
            status.textContent = "Vui lòng nhập nội dung cần tìm";
            status.style.color = "#dc2626";
          }
          return;
        }

        const entries = Array.from(this.cellsData.entries());
        if (entries.length === 0) {
          if (status) {
            status.textContent = "Bảng tính hiện chưa có dữ liệu";
            status.style.color = "#dc2626";
          }
          return;
        }

        let startIndex = 0;
        if (lastFoundCoord) {
          const idx = entries.findIndex(([c]) => c === lastFoundCoord);
          if (idx >= 0) startIndex = idx + 1;
        }

        let found = null;
        for (let i = 0; i < entries.length; i++) {
          const checkIdx = (startIndex + i) % entries.length;
          const [coord, item] = entries[checkIdx];
          const valStr = String(item.val ?? "").toLowerCase();
          const formulaStr = String(item.formula ?? "").toLowerCase();
          if (valStr.includes(query) || formulaStr.includes(query)) {
            found = coord;
            break;
          }
        }

        if (found) {
          lastFoundCoord = found;
          const [c, r] = this._splitCoord(found);
          this.selectCell(c, r);
          if (status) {
            status.textContent = `Đã tìm thấy tại ô ${found}`;
            status.style.color = "#0f6d38";
          }
        } else {
          if (status) {
            status.textContent = `Không tìm thấy "${query}"`;
            status.style.color = "#dc2626";
          }
        }
      };

      const close = () => {
        document.removeEventListener("keydown", onKey);
        overlay.remove();
        this.container?.focus?.();
        resolve(true);
      };

      const onKey = e => {
        if (e.key === "Escape") close();
        if (e.key === "Enter" && e.target === input) {
          e.preventDefault();
          doFind();
        }
        trapFocus(overlay, e);
      };

      document.addEventListener("keydown", onKey);
      closeBtn?.addEventListener("click", close);
      cancelBtn?.addEventListener("click", close);
      nextBtn?.addEventListener("click", doFind);
      input?.focus();
    });
  }

  setStyle(prop, val, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
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

  setFontFamily(family) {
    const allowed = ["Times New Roman", "Be Vietnam Pro", "Arial", "Calibri", "Roboto"];
    return allowed.includes(family) ? this.setStyle("fontFamily", family) : false;
  }

  setFontSize(size) {
    const numericSize = Number.parseInt(size, 10);
    if (!Number.isFinite(numericSize) || numericSize < 1 || numericSize > 409) return false;
    return this.setStyle("fontSize", `${numericSize}px`);
  }

  adjustFontSize(direction) {
    const steps = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const current = Number.parseInt(this.cellsData.get(key)?.style?.fontSize, 10) || 11;
    const next = direction > 0
      ? (steps.find(size => size > current) || steps[steps.length - 1])
      : ([...steps].reverse().find(size => size < current) || steps[0]);
    return this.setFontSize(next);
  }

  toggleWrapText() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const current = this.cellsData.get(key)?.style?.whiteSpace;
    const result = this.setStyle("whiteSpace", current === "normal" ? "nowrap" : "normal");
    const cell = this.container.querySelector?.(`.vno-grid-cell[data-coord="${key}"]`);
    cell?.classList?.toggle?.("is-wrap-text", current !== "normal");
    const row = cell?.closest?.("tr");
    if (row) {
      row.style.height = current !== "normal" ? `${Math.max(this.rowHeight, cell.scrollHeight)}px` : `${this.rowHeight}px`;
    }
    return result;
  }

  adjustIndent(direction) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const current = Number.parseInt(this.cellsData.get(key)?.style?.paddingLeft, 10) || 8;
    const next = Math.max(8, Math.min(56, current + (direction > 0 ? 12 : -12)));
    return this.setStyle("paddingLeft", `${next}px`);
  }

  _rangeLabel(range) {
    const normalized = this._normalizeRange(range);
    return `${normalized.start.c}${normalized.start.r}:${normalized.end.c}${normalized.end.r}`;
  }

  getMergedRanges(sheetName = this.activeSheet) {
    return this.mergedRangesBySheet[sheetName] ||= [];
  }

  getMergedRangeForCell(col, row, sheetName = this.activeSheet) {
    return this.getMergedRanges(sheetName).find(range => this._rangeContains(range, col, row)) || null;
  }

  _rangesIntersect(left, right) {
    const a = this._normalizeRange(left);
    const b = this._normalizeRange(right);
    return !(this._columnNumber(a.end.c) < this._columnNumber(b.start.c) ||
      this._columnNumber(a.start.c) > this._columnNumber(b.end.c) ||
      a.end.r < b.start.r || a.start.r > b.end.r);
  }

  async mergeCells(mode = "mergeCenter", range = this.selectionRange, { confirmDataLoss = true } = {}) {
    if (this._guardProtectedMutation()) return false;
    const normalized = this._normalizeRange(range || { start: this.selectedCoord, end: this.selectedCoord });
    const width = this._columnNumber(normalized.end.c) - this._columnNumber(normalized.start.c) + 1;
    const height = normalized.end.r - normalized.start.r + 1;
    if (width === 1 && height === 1) return false;
    if (this.getMergedRanges().some(existing => this._rangesIntersect(existing, normalized))) return false;

    const ranges = mode === "mergeAcross"
      ? Array.from({ length: height }, (_, index) => ({ start: { c: normalized.start.c, r: normalized.start.r + index }, end: { c: normalized.end.c, r: normalized.start.r + index } }))
      : [normalized];
    const populated = [];
    for (const mergeRange of ranges) {
      for (let row = mergeRange.start.r; row <= mergeRange.end.r; row++) {
        for (let colNumber = this._columnNumber(mergeRange.start.c); colNumber <= this._columnNumber(mergeRange.end.c); colNumber++) {
          const coord = `${this._columnLabel(colNumber)}${row}`;
          const item = this.cellsData.get(coord);
          if (item && (item.formula || item.val !== "" && item.val !== null && item.val !== undefined)) populated.push(coord);
        }
      }
    }
    if (confirmDataLoss && populated.length > ranges.length) {
      const confirmed = await showConfirmDialog({
        title: t("sheetDialogs.mergeConfirmTitle", "Trộn ô"),
        message: t("sheetDialogs.mergeConfirmMessage", "Vùng chọn có nhiều ô chứa dữ liệu. Chỉ dữ liệu ở ô trên cùng bên trái của mỗi vùng gộp được giữ lại."),
        confirmText: t("sheetDialogs.mergeConfirmOk", "Tiếp tục gộp"),
        cancelText: t("sheetDialogs.cancel", "Hủy")
      });
      if (!confirmed) return false;
    }

    const beforeCells = this._snapshotCells();
    const beforeRanges = structuredClone(this.getMergedRanges());
    for (const mergeRange of ranges) {
      const topLeft = `${mergeRange.start.c}${mergeRange.start.r}`;
      for (let row = mergeRange.start.r; row <= mergeRange.end.r; row++) {
        for (let colNumber = this._columnNumber(mergeRange.start.c); colNumber <= this._columnNumber(mergeRange.end.c); colNumber++) {
          const coord = `${this._columnLabel(colNumber)}${row}`;
          if (coord !== topLeft) this.cellsData.delete(coord);
        }
      }
      if (mode === "mergeCenter") {
        const item = this.cellsData.get(topLeft) || { val: "", formula: "", style: {} };
        item.style = { ...(item.style || {}), textAlign: "center", verticalAlign: "middle" };
        this.cellsData.set(topLeft, item);
      }
      this.getMergedRanges().push(structuredClone(mergeRange));
    }
    this.selectionRange = structuredClone(normalized);
    this.selectedCoord = { ...normalized.start };
    const action = { type: "merge-cells", sheet: this.activeSheet, beforeCells, afterCells: this._snapshotCells(), beforeRanges, afterRanges: structuredClone(this.getMergedRanges()), selection: structuredClone(normalized) };
    this._recordHistory(action);
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this.selectCell(normalized.start.c, normalized.start.r);
    return true;
  }

  unmergeCells(range = this.selectionRange) {
    const normalized = this._normalizeRange(range || { start: this.selectedCoord, end: this.selectedCoord });
    const beforeRanges = structuredClone(this.getMergedRanges());
    const removed = beforeRanges.filter(existing => this._rangesIntersect(existing, normalized));
    if (!removed.length) return false;
    const beforeCells = this._snapshotCells();
    this.mergedRangesBySheet[this.activeSheet] = beforeRanges.filter(existing => !this._rangesIntersect(existing, normalized));
    this.selectionRange = structuredClone(normalized);
    this.selectedCoord = { ...normalized.start };
    this._recordHistory({ type: "merge-cells", sheet: this.activeSheet, beforeCells, afterCells: this._snapshotCells(), beforeRanges, afterRanges: structuredClone(this.getMergedRanges()), selection: structuredClone(normalized) });
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this.selectCell(normalized.start.c, normalized.start.r);
    return true;
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
    globalCommandBus?.updateState?.("sheet.view.gridlines", { checked: this.gridlinesVisible });
    globalCommandBus?.updateState?.("sheet.view.headings", { checked: this.headingsVisible });
    globalCommandBus?.updateState?.("sheet.view.formulaBar", { checked: this.formulaBarVisible });
    globalCommandBus?.updateState?.("sheet.view.normal", { checked: this.workbookView === "normal" });
    globalCommandBus?.updateState?.("sheet.view.pageBreakPreview", { checked: this.workbookView === "pageBreakPreview" });
    globalCommandBus?.updateState?.("sheet.view.pageLayout", { checked: this.workbookView === "pageLayout" });
    globalCommandBus?.updateState?.("sheet.edit.formatPainter", { checked: !!this.formatPainter });
    const locked = this.isSheetProtected();
    globalCommandBus?.updateState?.("sheet.sheet.protect", {
      label: locked
        ? t("sheetDialogs.unprotectSheet", "Bỏ bảo vệ trang tính...")
        : t("sheetDialogs.protectSheet", "Bảo vệ trang tính..."),
      tooltip: locked
        ? t("sheetDialogs.unprotectSheetTooltip", "Tắt khóa giao diện của trang tính hiện tại")
        : t("sheetDialogs.protectSheetTooltip", "Khóa sửa ô, định dạng và xóa hàng/cột trên trang tính hiện tại (khóa giao diện, không phải bảo mật thật)")
    });
  }

  _applyViewState() {
    if (this.table) {
      this.table.style.transform = `scale(${this.zoomLevel})`;
      this.table.style.transformOrigin = "top left";
      this.table.dataset.zoom = String(this.zoomLevel);
    }
    this.container?.classList.toggle("vno-hide-gridlines", !this.gridlinesVisible);
    this.container?.classList.toggle("vno-hide-headings", !this.headingsVisible);
    this.container?.classList.toggle("vno-hide-formula-bar", !this.formulaBarVisible);
    this.container?.classList.toggle("vno-sheet-page-break-preview", this.workbookView === "pageBreakPreview");
    this.container?.classList.toggle("vno-sheet-page-layout", this.workbookView === "pageLayout");
    if (this.formulaBarEl) {
      this.formulaBarEl.style.display = this.formulaBarVisible ? "" : "none";
    }
    this._renderPageBreakPreviewOverlay();
    this._renderPageLayoutChrome();
  }

  setWorkbookView(viewMode) {
    if (!["normal", "pageBreakPreview", "pageLayout"].includes(viewMode)) return false;
    this.workbookView = viewMode;
    this._applyViewState();
    this._refreshPageAndCommentVisuals();
    this._syncCommandStates();
    return this.workbookView;
  }

  toggleFormulaBar() {
    this.formulaBarVisible = !this.formulaBarVisible;
    this._applyViewState();
    this._syncCommandStates();
    return this.formulaBarVisible;
  }

  setZoom(level) {
    const next = Math.min(2, Math.max(0.5, Math.round(Number(level) * 10) / 10));
    if (!Number.isFinite(next)) return false;
    this.zoomLevel = next;
    this._applyViewState();
    return this.zoomLevel;
  }

  zoomIn() { return this.setZoom(this.zoomLevel + 0.1); }
  zoomOut() { return this.setZoom(this.zoomLevel - 0.1); }
  zoomReset() { return this.setZoom(1); }

  zoomToSelection() {
    const range = this.selectedRange || {
      start: { c: this.selectedCoord.c, r: this.selectedCoord.r },
      end: { c: this.selectedCoord.c, r: this.selectedCoord.r }
    };
    const startColIdx = Math.min(this.cols.indexOf(range.start.c), this.cols.indexOf(range.end.c));
    const endColIdx = Math.max(this.cols.indexOf(range.start.c), this.cols.indexOf(range.end.c));
    const startRow = Math.min(range.start.r, range.end.r);
    const endRow = Math.max(range.start.r, range.end.r);

    const numCols = Math.max(1, endColIdx - startColIdx + 1);
    const numRows = Math.max(1, endRow - startRow + 1);

    const selWidth = numCols * 85 + 40;
    const selHeight = numRows * 26 + 30;

    const vpWidth = this.viewport?.clientWidth || 800;
    const vpHeight = this.viewport?.clientHeight || 600;

    const scale = Math.min(2.0, Math.max(0.5, Math.round(Math.min((vpWidth - 60) / selWidth, (vpHeight - 60) / selHeight) * 10) / 10));
    this.setZoom(scale);
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    return scale;
  }

  newWindow() {
    if (typeof window === "undefined") return false;
    const opened = window.open?.(window.location.href, "_blank");
    if (!opened) {
      this.options?.shell?.setStatus?.("Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho VN Office.");
      return false;
    }
    try { opened.opener = null; } catch (_) {}
    return true;
  }

  _getEffectivePrintArea() {
    const explicit = this.printAreaBySheet[this.activeSheet];
    if (explicit) return this._parseRange(explicit);
    const sheetData = this.cellsData;
    let minColIdx = this.cols.length - 1;
    let maxColIdx = 0;
    let minRow = this.rowCount;
    let maxRow = 1;
    let hasData = false;

    if (sheetData && typeof sheetData.forEach === "function") {
      sheetData.forEach((cell, coord) => {
        if (cell && ((cell.val !== "" && cell.val !== null && cell.val !== undefined) || cell.formula)) {
          const parsed = this._splitCoord(coord);
          if (parsed) {
            const colIdx = this.cols.indexOf(parsed[0]);
            const row = parsed[1];
            if (colIdx >= 0 && row >= 1) {
              hasData = true;
              if (colIdx < minColIdx) minColIdx = colIdx;
              if (colIdx > maxColIdx) maxColIdx = colIdx;
              if (row < minRow) minRow = row;
              if (row > maxRow) maxRow = row;
            }
          }
        }
      });
    }

    if (!hasData) {
      minColIdx = 0;
      maxColIdx = Math.min(9, this.cols.length - 1);
      minRow = 1;
      maxRow = Math.min(30, this.rowCount);
    } else {
      minColIdx = 0;
      maxColIdx = Math.max(maxColIdx, Math.min(7, this.cols.length - 1));
      minRow = 1;
      maxRow = Math.max(maxRow, Math.min(25, this.rowCount));
    }

    return {
      start: { c: this.cols[minColIdx], r: minRow },
      end: { c: this.cols[maxColIdx], r: maxRow }
    };
  }

  _renderPageBreakPreviewOverlay() {
    if (!this.viewport || typeof document === "undefined") return;
    let watermark = this.viewport.querySelector?.(".vno-sheet-page-break-watermark");
    if (this.workbookView === "pageBreakPreview") {
      if (!watermark && typeof document.createElement === "function") {
        watermark = document.createElement("div");
        watermark.className = "vno-sheet-page-break-watermark";
        watermark.setAttribute?.("aria-hidden", "true");
        watermark.textContent = "Trang 1";
        this.viewport.appendChild?.(watermark);
      }
      if (watermark?.style) watermark.style.display = "block";
    } else if (watermark?.style) {
      watermark.style.display = "none";
    }
  }

  _renderPageLayoutChrome() {
    if (!this.viewport || typeof document === "undefined") return;
    let chrome = this.viewport.querySelector?.(".vno-sheet-page-layout-chrome");
    if (this.workbookView === "pageLayout") {
      if (!chrome && typeof document.createElement === "function") {
        chrome = document.createElement("div");
        chrome.className = "vno-sheet-page-layout-chrome";
        chrome.innerHTML = `
          <div class="vno-sheet-page-header-band" role="region" aria-label="Đầu trang">
            <div class="vno-sheet-page-header-cell">Bấm để thêm đầu trang (trái)</div>
            <div class="vno-sheet-page-header-cell">Bấm để thêm đầu trang (giữa)</div>
            <div class="vno-sheet-page-header-cell">Bấm để thêm đầu trang (phải)</div>
          </div>
        `;
        this.viewport.insertBefore?.(chrome, this.table);
      }
      if (chrome?.style) chrome.style.display = "block";
    } else if (chrome?.style) {
      chrome.style.display = "none";
    }
  }

  toggleGridlines() {
    this.gridlinesVisible = !this.gridlinesVisible;
    this._applyViewState();
    this._syncCommandStates();
    return this.gridlinesVisible;
  }

  toggleHeadings() {
    this.headingsVisible = !this.headingsVisible;
    this._applyViewState();
    this._syncCommandStates();
    return this.headingsVisible;
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
    if (action.type === "sheet-rename") {
      const from = direction === "undo" ? action.newName : action.oldName;
      const to = direction === "undo" ? action.oldName : action.newName;
      return !!this.renameSheet(from, to, false);
    }
    if (action.type === "sheet-move") {
      const index = direction === "undo" ? action.fromIndex : action.toIndex;
      return this._moveSheetToIndex(action.name, index);
    }
    if (action.sheet && action.sheet !== this.activeSheet) this.switchSheet(action.sheet);
    const value = direction === "undo" ? "prevVal" : "nextVal";
    if (action.type === "merge-cells") {
      const useBefore = direction === "undo";
      this.sheetsData[action.sheet] = new Map((useBefore ? action.beforeCells : action.afterCells).map(([key, item]) => [key, structuredClone(item)]));
      this.mergedRangesBySheet[action.sheet] = structuredClone(useBefore ? action.beforeRanges : action.afterRanges);
      this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
      this.selectCell(action.selection.start.c, action.selection.start.r);
    } else if (action.type === "grid-structure") {
      this._restoreGridStructure(direction === "undo" ? action.before : action.after);
    } else if (action.type === "row-col-layout") {
      this._restoreRowColLayout(direction === "undo" ? action.before : action.after);
    } else if (action.type === "cell") {
      this.setCellValue(action.col, action.row, action[value], false);
      this.selectCell(action.col, action.row);
    } else if (action.type === "array-formula") {
      const snapshots = direction === "undo" ? action.before : action.after;
      action.coords.forEach((coord, index) => snapshots[index] ? this.cellsData.set(coord, structuredClone(snapshots[index])) : this.cellsData.delete(coord));
      this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
      this.selectCell(...this._splitCoord(action.coords[0]));
    } else if (action.type === "style") {
      this.selectedCoord = { c: action.col, r: action.row };
      this.setStyle(action.prop, action[value], false);
    } else if (action.type === "format-cells") {
      const snapshots = direction === "undo" ? action.before : action.after;
      for (const [coord, snap] of Object.entries(snapshots)) {
        const itm = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
        itm.style = structuredClone(snap.style || {});
        if (snap.numberFormat) {
          itm.style.numberFormat = structuredClone(snap.numberFormat);
        } else {
          delete itm.style.numberFormat;
        }
        this.cellsData.set(coord, itm);
        const [c, r] = this._splitCoord(coord);
        const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
        if (dom) {
          this._renderCellVisual(dom, itm, c, r);
        }
      }
    } else if (action.type === "cell-style" || action.type === "format-table" || action.type === "fill" || action.type === "clear" || action.type === "batch-cells") {
      const snapshots = direction === "undo" ? action.before : action.after;
      for (const [coord, snap] of Object.entries(snapshots)) {
        if (!snap) {
          this.cellsData.delete(coord);
        } else {
          const itm = this.cellsData.get(coord) || { val: "", formula: "", style: {} };
          itm.val = snap.val ?? "";
          itm.formula = snap.formula ?? "";
          itm.style = structuredClone(snap.style || {});
          this.cellsData.set(coord, itm);
        }
        const [c, r] = this._splitCoord(coord);
        const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
        if (dom) {
          const itm = this.cellsData.get(coord);
          if (itm) {
            this._renderCellVisual(dom, itm, c, r);
            this._applyRuleVisuals?.(dom, c, r);
          } else {
            dom.textContent = "";
            dom.style.cssText = "";
          }
        }
      }
      this._recalculateAllFormulas();
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
      if (action.collection === "chartsBySheet") this.renderCharts();
      else if (action.collection === "imagesBySheet") this.renderImages();
      else if (action.collection === "textBoxesBySheet") this.renderTextBoxes();
      else this._refreshVisibleRuleVisuals();
    } else if (action.type === "named-range") {
      const collection = action.scope === "workbook" ? this.namedRangesWorkbook : (this.namedRangesBySheet[action.sheet] ||= []);
      const desired = direction === "undo" ? action.before : action.after;
      const currentIndex = collection.findIndex(item => item.id === action.id);
      if (currentIndex >= 0) collection.splice(currentIndex, 1);
      if (desired) collection.splice(Math.min(action.index, collection.length), 0, structuredClone(desired));
      this._recalculateAllFormulas();
    } else if (action.type === "comment") {
      const comments = this.commentsBySheet[action.sheet] ||= {};
      const desired = direction === "undo" ? action.before : action.after;
      if (desired) comments[action.coord] = structuredClone(desired);
      else delete comments[action.coord];
      this._refreshPageAndCommentVisuals();
    } else if (action.type === "sheet-page-layout") {
      const desired = structuredClone(action[direction === "undo" ? "before" : "after"]);
      if (action.property === "printAreaBySheet") this.printAreaBySheet[action.sheet] = desired;
      else if (action.property === "pageBreaksBySheet") this.pageBreaksBySheet[action.sheet] = desired;
      else this.pageSetupBySheet[action.sheet] = desired;
      this._refreshPageAndCommentVisuals();
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
    // Ưu tiên đúng vùng người dùng đã chọn. Trước đây hàm hard-code r >= 4,
    // khiến Sort không làm gì với bảng bắt đầu ở hàng 1/2 dù dispatch vẫn chạy.
    const selectedRange = this._normalizeRange(this.selectionRange);
    const hasRowSelection = selectedRange.end.r > selectedRange.start.r;
    const rowsWithData = hasRowSelection
      ? Array.from({ length: selectedRange.end.r - selectedRange.start.r + 1 }, (_, index) => selectedRange.start.r + index)
      : [];
    for (const [key, item] of this.cellsData.entries()) {
      if (hasRowSelection) break;
      if ((item.val !== "" && item.val !== undefined) || item.formula) {
        const m = key.match(/^([A-Z]+)(\d+)$/);
        if (m) {
          const r = parseInt(m[2], 10);
          const isTotalRow = (item.formula && item.formula.toLowerCase().includes("sum")) || String(item.val).toLowerCase().includes("tổng");
          if (!isTotalRow && !rowsWithData.includes(r)) {
            rowsWithData.push(r);
          }
        }
      }
    }

    if (rowsWithData.length < 2) return false;

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

  _snapshotGridStructure(sheetName = this.activeSheet) {
    const state = this.sheetStates[sheetName] || {};
    return {
      sheetName,
      cells: this._snapshotCells(sheetName),
      rowCount: this.rowCount,
      cols: [...this.cols],
      conditionalFormatting: structuredClone(this.conditionalFormattingBySheet[sheetName] || []),
      dataValidations: structuredClone(this.dataValidationsBySheet[sheetName] || []),
      comments: structuredClone(this.commentsBySheet[sheetName] || {}),
      printArea: this.printAreaBySheet[sheetName] || null,
      pageBreaks: structuredClone(this.pageBreaksBySheet[sheetName] || { rows: [], cols: [] }),
      pageSetup: structuredClone(this.pageSetupBySheet[sheetName] || newSheetPageSetup()),
      hiddenRows: [...(sheetName === this.activeSheet ? this.hiddenRows : (state.hiddenRows || []))],
      activeFilters: Array.from(sheetName === this.activeSheet ? this.activeFilters : (state.activeFilters || []), ([col, values]) => [col, [...values]]),
      selectedCoord: { ...(sheetName === this.activeSheet ? this.selectedCoord : (state.selectedCoord || { r: 1, c: "A" })) },
      selectionRange: structuredClone(this.selectionRange),
      outlineGroups: structuredClone(this.outlineGroupsBySheet[sheetName] || [])
      ,mergedRanges: structuredClone(this.mergedRangesBySheet[sheetName] || []),
      rowColLayout: this._snapshotRowColLayout(sheetName)
    };
  }

  _restoreGridStructure(snapshot) {
    this.rowCount = snapshot.rowCount;
    this.cols = [...snapshot.cols];
    this.sheetsData[snapshot.sheetName] = new Map(snapshot.cells.map(([key, value]) => [key, structuredClone(value)]));
    this.conditionalFormattingBySheet[snapshot.sheetName] = structuredClone(snapshot.conditionalFormatting);
    this.dataValidationsBySheet[snapshot.sheetName] = structuredClone(snapshot.dataValidations);
    this.commentsBySheet[snapshot.sheetName] = structuredClone(snapshot.comments);
    this.printAreaBySheet[snapshot.sheetName] = snapshot.printArea;
    this.pageBreaksBySheet[snapshot.sheetName] = structuredClone(snapshot.pageBreaks);
    this.pageSetupBySheet[snapshot.sheetName] = newSheetPageSetup(snapshot.pageSetup);
    this.hiddenRows = new Set(snapshot.hiddenRows);
    this.activeFilters = new Map(snapshot.activeFilters.map(([col, values]) => [col, new Set(values)]));
    this.selectedCoord = { ...snapshot.selectedCoord };
    this.selectionRange = structuredClone(snapshot.selectionRange);
    this.outlineGroupsBySheet[snapshot.sheetName] = structuredClone(snapshot.outlineGroups || []);
    this.mergedRangesBySheet[snapshot.sheetName] = structuredClone(snapshot.mergedRanges || []);
    if (snapshot.rowColLayout) this._restoreRowColLayout({ ...snapshot.rowColLayout, sheetName: snapshot.sheetName }, { render: false });
    if (this.sheetStates[snapshot.sheetName]) {
      Object.assign(this.sheetStates[snapshot.sheetName], {
        hiddenRows: new Set(this.hiddenRows),
        activeFilters: new Map(this.activeFilters),
        selectedCoord: { ...this.selectedCoord }
      });
    }
    this._renderColumnHeaders();
    this._renderVirtualRows(this.currentStartRow || 1, Math.min(this.currentEndRow || 40, this.rowCount));
    this._recalculateAllFormulas();
    this.refreshCharts();
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
  }

  _columnNumber(label) {
    return String(label).toUpperCase().split("").reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
  }

  _columnLabel(number) {
    let value = number;
    let label = "";
    while (value > 0) {
      value--;
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26);
    }
    return label;
  }

  _shiftCellReference(reference, axis, insertionPoint, direction = 1) {
    return String(reference).split(/("(?:""|[^"])*")/).map((segment, index) => {
      if (index % 2 === 1) return segment;
      return segment.replace(/(^|[^A-Z0-9_])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![A-Z0-9_])/gi, (match, prefix, colAbs, col, rowAbs, row) => {
        let nextCol = col.toUpperCase();
        let nextRow = Number(row);
        const cmp = value => direction > 0 ? value >= insertionPoint : value > insertionPoint;
        if (axis === "row" && cmp(nextRow)) nextRow += direction;
        if (axis === "col" && cmp(this._columnNumber(nextCol))) nextCol = this._columnLabel(this._columnNumber(nextCol) + direction);
        return `${prefix}${colAbs}${nextCol}${rowAbs}${nextRow}`;
      });
    }).join("");
  }

  _shiftRange(range, axis, insertionPoint, direction = 1) {
    if (!range?.start || !range?.end) return range;
    const cmp = value => direction > 0 ? value >= insertionPoint : value > insertionPoint;
    const shift = point => ({
      c: axis === "col" && cmp(this._columnNumber(point.c)) ? this._columnLabel(this._columnNumber(point.c) + direction) : point.c,
      r: axis === "row" && cmp(point.r) ? point.r + direction : point.r
    });
    return { ...structuredClone(range), start: shift(range.start), end: shift(range.end) };
  }

  _renderColumnHeaders() {
    const row = this.table?.querySelector?.("thead tr");
    if (row) {
      row.innerHTML = `<th class="vno-grid-corner-header" title="Chọn tất cả (Ctrl+A)"></th>`;
      row.querySelector(".vno-grid-corner-header")?.addEventListener("click", () => this.selectAll());
      this.cols.forEach(col => {
        const th = document.createElement("th");
        this._bindColumnHeader(th, col);
        row.appendChild(th);
      });
    }
    this.topSpacer?.querySelector?.("td")?.setAttribute?.("colspan", String(this.cols.length + 1));
    this.bottomSpacer?.querySelector?.("td")?.setAttribute?.("colspan", String(this.cols.length + 1));
    this._updateFilterButtons();
  }

  _shiftGridMetadata(axis, insertionPoint, direction = 1) {
    const sheet = this.activeSheet;
    const cmp = value => direction > 0 ? value >= insertionPoint : value > insertionPoint;
    const shiftRange = range => this._shiftRange(range, axis, insertionPoint, direction);
    this.conditionalFormattingBySheet[sheet] = (this.conditionalFormattingBySheet[sheet] || []).map(rule => ({ ...rule, range: shiftRange(rule.range) }));
    this.dataValidationsBySheet[sheet] = (this.dataValidationsBySheet[sheet] || []).map(rule => ({ ...rule, range: shiftRange(rule.range) }));
    this.mergedRangesBySheet[sheet] = (this.mergedRangesBySheet[sheet] || []).flatMap(range => {
      if (direction > 0) return [shiftRange(range)];
      const normalized = this._normalizeRange(range);
      const start = axis === "row" ? normalized.start.r : this._columnNumber(normalized.start.c);
      const end = axis === "row" ? normalized.end.r : this._columnNumber(normalized.end.c);
      if (insertionPoint < start) return [shiftRange(normalized)];
      if (insertionPoint > end) return [normalized];
      if (start === end) return [];
      const next = structuredClone(normalized);
      if (axis === "row") next.end.r--;
      else next.end.c = this._columnLabel(end - 1);
      return [next];
    });

    const comments = {};
    for (const [coord, comment] of Object.entries(this.commentsBySheet[sheet] || {})) {
      const shifted = this._shiftCellReference(coord, axis, insertionPoint, direction);
      comments[shifted] = { ...structuredClone(comment), coord: shifted };
    }
    this.commentsBySheet[sheet] = comments;

    if (this.printAreaBySheet[sheet]) this.printAreaBySheet[sheet] = this._shiftCellReference(this.printAreaBySheet[sheet], axis, insertionPoint, direction);
    const breaks = structuredClone(this.pageBreaksBySheet[sheet] || { rows: [], cols: [] });
    if (axis === "row") breaks.rows = breaks.rows.map(row => cmp(row) ? row + direction : row);
    else breaks.cols = breaks.cols.map(col => cmp(this._columnNumber(col)) ? this._columnLabel(this._columnNumber(col) + direction) : col);
    this.pageBreaksBySheet[sheet] = breaks;

    this.hiddenRows = new Set([...this.hiddenRows].map(row => axis === "row" && cmp(row) ? row + direction : row));
    if (axis === "col") this.activeFilters = new Map([...this.activeFilters].map(([col, values]) => [cmp(this._columnNumber(col)) ? this._columnLabel(this._columnNumber(col) + direction) : col, values]));

    const shiftKeyedMap = (source, toKey) => {
      const next = new Map();
      for (const [key, value] of source.entries()) {
        const numeric = axis === "row" ? Number(key) : this._columnNumber(key);
        if (direction < 0 && numeric === insertionPoint) continue;
        next.set(toKey(cmp(numeric) ? numeric + direction : numeric), value);
      }
      return next;
    };
    const shiftKeyedSet = (source, toKey) => {
      const next = new Set();
      for (const key of source) {
        const numeric = axis === "row" ? Number(key) : this._columnNumber(key);
        if (direction < 0 && numeric === insertionPoint) continue;
        next.add(toKey(cmp(numeric) ? numeric + direction : numeric));
      }
      return next;
    };
    if (axis === "row") {
      this.rowHeightsBySheet[sheet] = shiftKeyedMap(this._rowHeights(sheet), value => value);
      this.userHiddenRowsBySheet[sheet] = shiftKeyedSet(this._userHiddenRows(sheet), value => value);
    } else {
      this.colWidthsBySheet[sheet] = shiftKeyedMap(this._colWidths(sheet), value => this._columnLabel(value));
      this.userHiddenColsBySheet[sheet] = shiftKeyedSet(this._userHiddenCols(sheet), value => this._columnLabel(value));
    }
  }

  insertRow(atRow = this.selectedCoord.r, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    atRow = Number(atRow);
    if (!Number.isInteger(atRow) || atRow < 1 || atRow > this.rowCount) return false;
    const before = this._snapshotGridStructure();
    const shifted = new Map();
    for (const [key, item] of this.cellsData.entries()) {
      const [col, row] = this._splitCoord(key);
      const nextKey = `${col}${row >= atRow ? row + 1 : row}`;
      const nextItem = structuredClone(item);
      if (nextItem.formula) nextItem.formula = this._shiftCellReference(nextItem.formula, "row", atRow);
      shifted.set(nextKey, nextItem);
    }
    this.sheetsData[this.activeSheet] = shifted;
    this.rowCount++;
    this._shiftGridMetadata("row", atRow);
    this.selectedCoord = { c: this.selectedCoord.c, r: atRow };
    this.selectionRange = { start: { ...this.selectedCoord }, end: { ...this.selectedCoord } };
    this._renderVirtualRows(this.currentStartRow || 1, Math.min(this.currentEndRow || 40, this.rowCount));
    this._recalculateAllFormulas();
    this.refreshCharts();
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    if (recordUndo) this._recordHistory({ type: "grid-structure", sheet: this.activeSheet, before, after: this._snapshotGridStructure() });
    return true;
  }

  insertColumn(atCol = this.selectedCoord.c, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const atColumnNumber = typeof atCol === "number" ? atCol : this._columnNumber(atCol);
    if (!Number.isInteger(atColumnNumber) || atColumnNumber < 1 || atColumnNumber > this.cols.length) return false;
    const before = this._snapshotGridStructure();
    const shifted = new Map();
    for (const [key, item] of this.cellsData.entries()) {
      const [col, row] = this._splitCoord(key);
      const colNumber = this._columnNumber(col);
      const nextKey = `${colNumber >= atColumnNumber ? this._columnLabel(colNumber + 1) : col}${row}`;
      const nextItem = structuredClone(item);
      if (nextItem.formula) nextItem.formula = this._shiftCellReference(nextItem.formula, "col", atColumnNumber);
      shifted.set(nextKey, nextItem);
    }
    this.sheetsData[this.activeSheet] = shifted;
    this.cols = Array.from({ length: this.cols.length + 1 }, (_, index) => this._columnLabel(index + 1));
    this._shiftGridMetadata("col", atColumnNumber);
    this.selectedCoord = { c: this._columnLabel(atColumnNumber), r: this.selectedCoord.r };
    this.selectionRange = { start: { ...this.selectedCoord }, end: { ...this.selectedCoord } };
    this._renderColumnHeaders();
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._recalculateAllFormulas();
    this.refreshCharts();
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    if (recordUndo) this._recordHistory({ type: "grid-structure", sheet: this.activeSheet, before, after: this._snapshotGridStructure() });
    return true;
  }

  deleteRow(atRow = this.selectedCoord.r, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    atRow = Number(atRow);
    if (!Number.isInteger(atRow) || atRow < 1 || atRow > this.rowCount || this.rowCount <= 1) return false;
    const before = this._snapshotGridStructure();
    const shifted = new Map();
    for (const [key, item] of this.cellsData.entries()) {
      const [col, row] = this._splitCoord(key);
      if (row === atRow) continue;
      const nextRow = row > atRow ? row - 1 : row;
      const nextItem = structuredClone(item);
      if (nextItem.formula) nextItem.formula = this._shiftCellReference(nextItem.formula, "row", atRow, -1);
      shifted.set(`${col}${nextRow}`, nextItem);
    }
    this.sheetsData[this.activeSheet] = shifted;
    this.rowCount--;
    this._shiftGridMetadata("row", atRow, -1);
    this.selectedCoord = { c: this.selectedCoord.c, r: Math.min(atRow, this.rowCount) };
    this.selectionRange = { start: { ...this.selectedCoord }, end: { ...this.selectedCoord } };
    this._renderVirtualRows(this.currentStartRow || 1, Math.min(this.currentEndRow || 40, this.rowCount));
    this._recalculateAllFormulas();
    this.refreshCharts();
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    if (recordUndo) this._recordHistory({ type: "grid-structure", sheet: this.activeSheet, before, after: this._snapshotGridStructure() });
    return true;
  }

  deleteColumn(atCol = this.selectedCoord.c, recordUndo = true) {
    if (recordUndo && this._guardProtectedMutation()) return false;
    const atColumnNumber = typeof atCol === "number" ? atCol : this._columnNumber(atCol);
    if (!Number.isInteger(atColumnNumber) || atColumnNumber < 1 || atColumnNumber > this.cols.length || this.cols.length <= 1) return false;
    const before = this._snapshotGridStructure();
    const shifted = new Map();
    for (const [key, item] of this.cellsData.entries()) {
      const [col, row] = this._splitCoord(key);
      const colNumber = this._columnNumber(col);
      if (colNumber === atColumnNumber) continue;
      const nextCol = colNumber > atColumnNumber ? this._columnLabel(colNumber - 1) : col;
      const nextItem = structuredClone(item);
      if (nextItem.formula) nextItem.formula = this._shiftCellReference(nextItem.formula, "col", atColumnNumber, -1);
      shifted.set(`${nextCol}${row}`, nextItem);
    }
    this.sheetsData[this.activeSheet] = shifted;
    this.cols = Array.from({ length: this.cols.length - 1 }, (_, index) => this._columnLabel(index + 1));
    this._shiftGridMetadata("col", atColumnNumber, -1);
    this.selectedCoord = { c: this._columnLabel(Math.min(atColumnNumber, this.cols.length)), r: this.selectedCoord.r };
    this.selectionRange = { start: { ...this.selectedCoord }, end: { ...this.selectedCoord } };
    this._renderColumnHeaders();
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._recalculateAllFormulas();
    this.refreshCharts();
    this.selectCell(this.selectedCoord.c, this.selectedCoord.r);
    if (recordUndo) this._recordHistory({ type: "grid-structure", sheet: this.activeSheet, before, after: this._snapshotGridStructure() });
    return true;
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
      images: structuredClone(this.imagesBySheet[sheetName] || []),
      textBoxes: structuredClone(this.textBoxesBySheet[sheetName] || []),
      pivotTables: structuredClone(this.pivotTablesBySheet[sheetName] || []),
      namedRanges: structuredClone(this.namedRangesBySheet[sheetName] || []),
      comments: structuredClone(this.commentsBySheet[sheetName] || {}),
      printArea: this.printAreaBySheet[sheetName] || null,
      pageBreaks: structuredClone(this.pageBreaksBySheet[sheetName] || { rows: [], cols: [] }),
      pageSetup: structuredClone(this.pageSetupBySheet[sheetName] || newSheetPageSetup()),
      mergedRanges: structuredClone(this.mergedRangesBySheet[sheetName] || []),
      rowColLayout: this._snapshotRowColLayout(sheetName),
      protection: structuredClone(this.protectionBySheet?.[sheetName] || { enabled: false, password: "" })
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
    this.imagesBySheet[sheetName] = structuredClone(snapshot.images || []);
    this.textBoxesBySheet[sheetName] = structuredClone(snapshot.textBoxes || []);
    this.pivotTablesBySheet[sheetName] = structuredClone(snapshot.pivotTables || []);
    this.namedRangesBySheet[sheetName] = structuredClone(snapshot.namedRanges || []);
    this.commentsBySheet[sheetName] = structuredClone(snapshot.comments || {});
    this.printAreaBySheet[sheetName] = snapshot.printArea || null;
    this.pageBreaksBySheet[sheetName] = structuredClone(snapshot.pageBreaks || { rows: [], cols: [] });
    this.pageSetupBySheet[sheetName] = newSheetPageSetup(snapshot.pageSetup);
    this.mergedRangesBySheet[sheetName] = structuredClone(snapshot.mergedRanges || []);
    if (!this.protectionBySheet) this.protectionBySheet = {};
    this.protectionBySheet[sheetName] = structuredClone(snapshot.protection || { enabled: false, password: "" });
    if (snapshot.rowColLayout) this._restoreRowColLayout({ ...snapshot.rowColLayout, sheetName }, { render: false });
    else this._ensureRowColLayout(sheetName);
    this._renderSheetTabs();
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
    const item = { id: config.id || `name-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: String(config.name).trim(), ref, scope, sheet };
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
    const overlay = this._createSheetDialog(t("sheetDialogs.nameManagerTitle", "Trình quản lý tên"), `<div class="vno-name-manager">
      <div class="vno-name-list" role="list"></div>
      <div class="vno-name-actions"><button type="button" class="vno-btn" id="vno-name-new">${t("sheetDialogs.nameNew", "Thêm mới")}</button><button type="button" class="vno-btn" id="vno-name-edit">${t("sheetDialogs.nameEdit", "Sửa")}</button><button type="button" class="vno-btn" id="vno-name-delete">${t("sheetDialogs.nameDelete", "Xóa")}</button></div>
      <div class="vno-name-form" hidden><label>${t("sheetDialogs.nameLabel", "Tên")}<input id="vno-name-value" autocomplete="off"></label><label>${t("sheetDialogs.refersTo", "Vùng tham chiếu")}<input id="vno-name-ref" value="${this._escapeHtml(this.getSelectedRangeLabel())}"></label><label>${t("sheetDialogs.scopeLabel", "Phạm vi")}<select id="vno-name-scope"><option value="workbook">Workbook</option><option value="sheet">Sheet: ${this._escapeHtml(this.activeSheet)}</option></select></label></div>
      <div class="vno-rule-error" role="alert"></div></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").textContent = t("sheetDialogs.save", "Lưu");
    let selected = null;
    const form = overlay.querySelector(".vno-name-form");
    const render = () => {
      const names = [...this.namedRangesWorkbook, ...(this.namedRangesBySheet[this.activeSheet] || [])];
      overlay.querySelector(".vno-name-list").innerHTML = names.length ? names.map(item => `<button type="button" class="vno-name-row" data-id="${item.id}"><strong>${this._escapeHtml(item.name)}</strong><span>${this._escapeHtml(item.ref)}</span><span>${item.scope === "workbook" ? "Workbook" : this._escapeHtml(item.sheet)}</span></button>`).join("") : `<p class="vno-name-empty">${t("sheetDialogs.noNamedRanges", "Chưa có vùng được đặt tên.")}</p>`;
      overlay.querySelectorAll(".vno-name-row").forEach(row => row.addEventListener("click", () => { selected = names.find(item => item.id === row.dataset.id); overlay.querySelectorAll(".vno-name-row").forEach(item => item.classList.toggle("is-selected", item === row)); }));
    };
    const openForm = item => { form.hidden = false; selected = item || null; overlay.querySelector("#vno-name-value").value = item?.name || ""; overlay.querySelector("#vno-name-ref").value = item?.ref || this.getSelectedRangeLabel(); overlay.querySelector("#vno-name-scope").value = item?.scope || "workbook"; overlay.querySelector("#vno-name-scope").disabled = !!item; overlay.querySelector("#vno-name-value").focus(); };
    overlay.querySelector("#vno-name-new").addEventListener("click", () => openForm(null));
    overlay.querySelector("#vno-name-edit").addEventListener("click", () => selected && openForm(selected));
    overlay.querySelector("#vno-name-delete").addEventListener("click", () => { if (selected && this.deleteNamedRange(selected.id, selected.scope, selected.sheet || this.activeSheet)) { selected = null; render(); } });
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      if (form.hidden) { openForm(null); return; }
      const result = this.saveNamedRange({ id: selected?.id, name: overlay.querySelector("#vno-name-value").value, ref: overlay.querySelector("#vno-name-ref").value, scope: overlay.querySelector("#vno-name-scope").value, sheet: this.activeSheet });
      if (!result) { overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.invalidNameOrRef", "Tên hoặc vùng tham chiếu không hợp lệ/trùng lặp."); return; }
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
    select.setAttribute("aria-label", t("sheetDialogs.selectCellValue", { col, row }) || `Chọn giá trị cho ô ${col}${row}`);
    select.innerHTML = `<option value="">${t("sheetDialogs.chooseOption", "-- Chọn --")}</option>` + rule.values
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

  _parseRange(label) {
    const match = String(label || "").toUpperCase().match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
    if (!match || !this.cols.includes(match[1]) || (match[3] && !this.cols.includes(match[3]))) return null;
    return {
      start: { c: match[1], r: Number(match[2]) },
      end: { c: match[3] || match[1], r: Number(match[4] || match[2]) }
    };
  }

  _refreshPageAndCommentVisuals() {
    this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
  }

  _applyAnnotationAndPageVisuals(cell, col, row) {
    if (typeof cell?.classList?.remove === "function") {
      cell.classList.remove("is-outside-print-area", "is-print-area-top", "is-print-area-bottom", "is-print-area-left", "is-print-area-right", "has-page-break-row", "has-page-break-col");
    }
    const coord = `${col}${row}`;
    const comment = this.commentsBySheet[this.activeSheet]?.[coord];
    if (comment) {
      cell.classList.add("has-comment");
      cell.classList.toggle?.("is-comment-resolved", !!comment.resolved);
      const popup = document.createElement("span");
      popup.className = "vno-cell-comment-popup";
      popup.setAttribute("role", "tooltip");
      popup.textContent = comment.author ? `${comment.author}: ${comment.text}` : comment.text;
      cell.appendChild(popup);
    }

    const isPageBreakPreview = this.workbookView === "pageBreakPreview";
    const area = this.printAreaBySheet[this.activeSheet]
      ? this._parseRange(this.printAreaBySheet[this.activeSheet])
      : (isPageBreakPreview ? this._getEffectivePrintArea() : null);

    if (area) {
      const inArea = this._rangeContains(area, col, row);
      if (inArea) {
        if (row === Math.min(area.start.r, area.end.r)) cell.classList.add("is-print-area-top");
        if (row === Math.max(area.start.r, area.end.r)) cell.classList.add("is-print-area-bottom");
        const startCol = this.cols.indexOf(area.start.c);
        const endCol = this.cols.indexOf(area.end.c);
        const colIndex = this.cols.indexOf(col);
        if (colIndex === Math.min(startCol, endCol)) cell.classList.add("is-print-area-left");
        if (colIndex === Math.max(startCol, endCol)) cell.classList.add("is-print-area-right");
      } else if (isPageBreakPreview) {
        cell.classList.add("is-outside-print-area");
      }
    }

    const breaks = this.pageBreaksBySheet[this.activeSheet] || { rows: [], cols: [] };
    if (breaks.rows.includes(row)) cell.classList.add("has-page-break-row");
    if (breaks.cols.includes(col)) cell.classList.add("has-page-break-col");
  }

  saveComment(options = {}) {
    options = options || {};
    const coord = String(options.coord || `${this.selectedCoord.c}${this.selectedCoord.r}`).toUpperCase();
    const text = String(options.text || "").trim();
    const parsedCoord = this._parseRange(coord);
    if (!parsedCoord || parsedCoord.start.r < 1 || parsedCoord.start.r > this.rowCount || !text) return false;
    const comments = this.commentsBySheet[this.activeSheet] ||= {};
    const before = comments[coord] ? structuredClone(comments[coord]) : null;
    const after = { coord, text, author: String(options.author || before?.author || "Người dùng VN Office"), timestamp: options.timestamp || new Date().toISOString() };
    comments[coord] = after;
    this._recordHistory({ type: "comment", sheet: this.activeSheet, coord, before, after: structuredClone(after) });
    this._refreshPageAndCommentVisuals();
    return after;
  }

  deleteComment(options = {}) {
    options = options || {};
    const coord = String(options.coord || `${this.selectedCoord.c}${this.selectedCoord.r}`).toUpperCase();
    const comments = this.commentsBySheet[this.activeSheet] ||= {};
    if (!comments[coord]) return false;
    const before = structuredClone(comments[coord]);
    delete comments[coord];
    this._recordHistory({ type: "comment", sheet: this.activeSheet, coord, before, after: null });
    this._refreshPageAndCommentVisuals();
    return true;
  }

  _listComments() {
    const result = [];
    for (const sheet of this.sheets) {
      const entries = Object.values(this.commentsBySheet[sheet] || {});
      entries.sort((a, b) => {
        const pa = this._parseRange(a.coord)?.start || { r: 0, c: "A" };
        const pb = this._parseRange(b.coord)?.start || { r: 0, c: "A" };
        return pa.r - pb.r || this.cols.indexOf(pa.c) - this.cols.indexOf(pb.c);
      });
      entries.forEach(comment => result.push({ sheet, comment }));
    }
    return result;
  }

  _focusComment(entry) {
    if (!entry) return false;
    if (entry.sheet !== this.activeSheet) this.switchSheet(entry.sheet);
    const cell = this._parseRange(entry.comment.coord)?.start;
    if (!cell) return false;
    this.selectCell(cell.c, cell.r);
    this.container?.querySelector?.(`.vno-grid-cell[data-coord="${entry.comment.coord}"]`)?.scrollIntoView?.({ block: "center", inline: "center" });
    return entry.comment;
  }

  nextComment() {
    const comments = this._listComments();
    if (!comments.length) return false;
    const coord = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const index = comments.findIndex(entry => entry.sheet === this.activeSheet && entry.comment.coord === coord);
    return this._focusComment(comments[(index + 1) % comments.length]);
  }

  previousComment() {
    const comments = this._listComments();
    if (!comments.length) return false;
    const coord = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const index = comments.findIndex(entry => entry.sheet === this.activeSheet && entry.comment.coord === coord);
    return this._focusComment(comments[index <= 0 ? comments.length - 1 : index - 1]);
  }

  deleteCurrentComment() { return this.deleteComment(); }

  toggleCurrentCommentResolved() {
    const coord = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const comments = this.commentsBySheet[this.activeSheet] ||= {};
    const before = comments[coord] ? structuredClone(comments[coord]) : null;
    if (!before) return false;
    const after = { ...before, resolved: !before.resolved };
    comments[coord] = after;
    this._recordHistory({ type: "comment", sheet: this.activeSheet, coord, before, after: structuredClone(after) });
    this._refreshPageAndCommentVisuals();
    return after.resolved;
  }

  _ensureSpellChecker() {
    if (!this.spellChecker) {
      this.spellChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
    }
    return this.spellChecker;
  }

  isSpellcheckableCell(item) {
    if (!item) return false;
    if (String(item.formula || "").startsWith("=")) return false;
    const val = item.val;
    if (val == null || val === "") return false;
    if (typeof val === "number" || typeof val === "boolean") return false;
    const text = String(val).trim();
    if (!text || text.startsWith("#")) return false;
    return /[\p{L}]/u.test(text);
  }

  _compareCellCoords(left, right) {
    const [leftCol, leftRow] = this._splitCoord(left);
    const [rightCol, rightRow] = this._splitCoord(right);
    if (leftRow !== rightRow) return leftRow - rightRow;
    return this.cols.indexOf(leftCol) - this.cols.indexOf(rightCol);
  }

  collectSpellcheckIssues(sheetName = this.activeSheet) {
    const checker = this._ensureSpellChecker();
    const map = this.sheetsData?.[sheetName] || this.cellsData;
    const issues = [];
    for (const [coord, item] of map.entries()) {
      if (!this.isSpellcheckableCell(item)) continue;
      const text = String(item.val ?? "");
      for (const token of checker.checkText(text)) {
        issues.push({
          coord,
          sheet: sheetName,
          word: token.word,
          normalized: token.normalized,
          start: token.start,
          end: token.end,
          text
        });
      }
    }
    issues.sort((a, b) => this._compareCellCoords(a.coord, b.coord) || a.start - b.start);
    return issues;
  }

  suggestSpellcheckWord(word) {
    return this._ensureSpellChecker().suggest(word);
  }

  replaceSpellcheckIssue(issue, replacement) {
    if (!issue?.coord) return false;
    const item = this.cellsData.get(issue.coord);
    if (!item || !this.isSpellcheckableCell(item)) return false;
    const source = String(item.val ?? "");
    const nextReplacement = String(replacement ?? "");
    let next;
    if (source.slice(issue.start, issue.end) === issue.word) {
      next = source.slice(0, issue.start) + nextReplacement + source.slice(issue.end);
    } else {
      const index = source.indexOf(issue.word);
      if (index < 0) return false;
      next = source.slice(0, index) + nextReplacement + source.slice(index + issue.word.length);
    }
    const [col, row] = this._splitCoord(issue.coord);
    this.setCellValue(col, row, next, true);
    return true;
  }

  replaceAllSpellcheckWord(word, replacement) {
    const target = normalizeVietnameseWord(word);
    if (!target) return 0;
    const nextReplacement = String(replacement ?? "");
    const coords = [];
    for (const issue of this.collectSpellcheckIssues()) {
      if (issue.normalized === target && !coords.includes(issue.coord)) coords.push(issue.coord);
    }
    let count = 0;
    for (const coord of coords) {
      const item = this.cellsData.get(coord);
      if (!item || !this.isSpellcheckableCell(item)) continue;
      const tokens = tokenizeVietnamese(String(item.val ?? ""));
      let text = String(item.val ?? "");
      for (let index = tokens.length - 1; index >= 0; index--) {
        const token = tokens[index];
        if (token.normalized !== target) continue;
        text = text.slice(0, token.start) + nextReplacement + text.slice(token.end);
        count++;
      }
      const [col, row] = this._splitCoord(coord);
      this.setCellValue(col, row, text, true);
    }
    return count;
  }

  _closeSpellcheckDialog() {
    this._spellcheckOverlay?.closeDialog?.();
    this._spellcheckOverlay = null;
  }

  showSpellcheckDialog(options = {}) {
    options = options || {};
    const issues = this.collectSpellcheckIssues();
    if (typeof document === "undefined" || !document.createElement || !document.body) return issues;
    this._closeSpellcheckDialog();

    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-sheet-rule-dialog vno-sheet-spellcheck-dialog";
    overlay.dataset.dialog = "sheet-spellcheck";
    overlay.innerHTML = `
      <div class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-spell-title" style="width:460px;">
        <div class="vno-dialog-header">
          <strong id="vno-spell-title">${this._escapeHtml(t("sheetDialogs.spellcheckTitle", "Chính tả"))}</strong>
          <button type="button" class="vno-btn vno-rule-close" aria-label="${this._escapeHtml(t("sheetDialogs.close", "Đóng"))}">&times;</button>
        </div>
        <div class="vno-dialog-body" id="vno-spell-body"></div>
        <div class="vno-dialog-footer vno-spell-footer"></div>
      </div>`;

    const previousActive = document.activeElement;
    const body = overlay.querySelector("#vno-spell-body");
    const footer = overlay.querySelector(".vno-spell-footer");
    let currentIndex = 0;
    let sessionIssues = issues;

    const close = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (this._spellcheckOverlay === overlay) this._spellcheckOverlay = null;
      if (previousActive && typeof previousActive.focus === "function") {
        try { previousActive.focus(); } catch (_) {}
      }
    };
    overlay.closeDialog = close;

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else {
        trapFocus(overlay.querySelector(".vno-dialog-box"), event);
      }
    };

    const refreshIssues = () => {
      sessionIssues = this.collectSpellcheckIssues();
      if (currentIndex >= sessionIssues.length) currentIndex = Math.max(0, sessionIssues.length - 1);
    };

    const renderComplete = (messageKey) => {
      overlay.dataset.spellcheckState = "done";
      overlay.removeAttribute("data-spell-word");
      overlay.removeAttribute("data-spell-coord");
      body.innerHTML = `<p class="vno-spell-complete" role="status">${this._escapeHtml(t(messageKey, "Đã kiểm tra xong toàn bộ trang tính. Không tìm thấy lỗi chính tả."))}</p>`;
      footer.innerHTML = `<button type="button" class="vno-btn vno-btn-primary" id="vno-spell-close">${this._escapeHtml(t("sheetDialogs.spellcheckClose", "Đóng"))}</button>`;
      footer.querySelector("#vno-spell-close").addEventListener("click", close);
      footer.querySelector("#vno-spell-close").focus();
    };

    const renderIssue = () => {
      if (!sessionIssues.length) {
        renderComplete("sheetDialogs.spellcheckComplete");
        return;
      }
      const issue = sessionIssues[currentIndex];
      const suggestions = this.suggestSpellcheckWord(issue.word);
      overlay.dataset.spellcheckState = "issue";
      overlay.dataset.spellWord = issue.word;
      overlay.dataset.spellCoord = issue.coord;
      const [col, row] = this._splitCoord(issue.coord);
      this.selectCell(col, row);
      const suggestionOptions = suggestions.length
        ? suggestions.map((word, index) => `<option value="${this._escapeHtml(word)}" ${index === 0 ? "selected" : ""}>${this._escapeHtml(word)}</option>`).join("")
        : `<option value="">${this._escapeHtml(t("sheetDialogs.spellcheckNoSuggestions", "(Không có gợi ý gần)"))}</option>`;
      body.innerHTML = `
        <p class="vno-spell-status" role="status">${this._escapeHtml(t("sheetDialogs.spellcheckStatus", { current: currentIndex + 1, total: sessionIssues.length }))}</p>
        <label>${this._escapeHtml(t("sheetDialogs.spellcheckNotInDictionary", "Không có trong từ điển:"))}
          <input id="vno-spell-word" class="vno-dialog-input" value="${this._escapeHtml(issue.word)}" autocomplete="off">
        </label>
        <p class="vno-spell-meta">${this._escapeHtml(t("sheetDialogs.spellcheckCell", "Ô"))}: <strong id="vno-spell-coord">${this._escapeHtml(issue.coord)}</strong></p>
        <p class="vno-spell-context">${this._escapeHtml(t("sheetDialogs.spellcheckContext", "Nội dung ô"))}: <span id="vno-spell-context">${this._escapeHtml(issue.text)}</span></p>
        <label>${this._escapeHtml(t("sheetDialogs.spellcheckSuggestions", "Gợi ý:"))}
          <select id="vno-spell-suggestions" class="vno-select" size="${Math.min(5, Math.max(2, suggestions.length || 1))}">${suggestionOptions}</select>
        </label>`;
      footer.innerHTML = `
        <button type="button" class="vno-btn" id="vno-spell-ignore">${this._escapeHtml(t("sheetDialogs.spellcheckIgnore", "Bỏ qua"))}</button>
        <button type="button" class="vno-btn" id="vno-spell-ignore-all">${this._escapeHtml(t("sheetDialogs.spellcheckIgnoreAll", "Bỏ qua tất cả"))}</button>
        <button type="button" class="vno-btn" id="vno-spell-add">${this._escapeHtml(t("sheetDialogs.spellcheckAdd", "Thêm vào từ điển"))}</button>
        <button type="button" class="vno-btn vno-btn-primary" id="vno-spell-replace">${this._escapeHtml(t("sheetDialogs.spellcheckReplace", "Thay thế"))}</button>
        <button type="button" class="vno-btn" id="vno-spell-replace-all">${this._escapeHtml(t("sheetDialogs.spellcheckReplaceAll", "Thay thế tất cả"))}</button>
        <button type="button" class="vno-btn" id="vno-spell-close">${this._escapeHtml(t("sheetDialogs.spellcheckClose", "Đóng"))}</button>`;

      const wordInput = body.querySelector("#vno-spell-word");
      const suggestionList = body.querySelector("#vno-spell-suggestions");
      suggestionList.addEventListener("change", () => {
        if (suggestionList.value) wordInput.value = suggestionList.value;
      });
      suggestionList.addEventListener("dblclick", () => {
        if (suggestionList.value) {
          wordInput.value = suggestionList.value;
          applyReplace(false);
        }
      });

      const skipCurrent = () => {
        currentIndex += 1;
        if (currentIndex >= sessionIssues.length) renderComplete("sheetDialogs.spellcheckCompleteRemaining");
        else renderIssue();
      };

      const applyReplace = (all) => {
        const replacement = wordInput.value;
        if (!replacement) return;
        if (all) this.replaceAllSpellcheckWord(issue.word, replacement);
        else this.replaceSpellcheckIssue(issue, replacement);
        refreshIssues();
        renderIssue();
      };

      footer.querySelector("#vno-spell-ignore").addEventListener("click", skipCurrent);
      footer.querySelector("#vno-spell-ignore-all").addEventListener("click", () => {
        this._ensureSpellChecker().ignore(issue.word);
        refreshIssues();
        renderIssue();
      });
      footer.querySelector("#vno-spell-add").addEventListener("click", () => {
        this._ensureSpellChecker().addToPersonalDictionary(issue.word);
        refreshIssues();
        renderIssue();
      });
      footer.querySelector("#vno-spell-replace").addEventListener("click", () => applyReplace(false));
      footer.querySelector("#vno-spell-replace-all").addEventListener("click", () => applyReplace(true));
      footer.querySelector("#vno-spell-close").addEventListener("click", close);
      wordInput.focus();
      wordInput.select();
    };

    overlay.querySelector(".vno-rule-close").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    this._spellcheckOverlay = overlay;
    renderIssue();
    return true;
  }

  showCommentDialog(options = {}) {
    options = options || {};
    const coord = String(options.coord || `${this.selectedCoord.c}${this.selectedCoord.r}`).toUpperCase();
    const existing = this.commentsBySheet[this.activeSheet]?.[coord] || null;
    const overlay = this._createSheetDialog(t(existing ? "sheetDialogs.editComment" : "sheetDialogs.newComment", { coord }), `
      <label class="vno-comment-field">${t("sheetDialogs.commentContent")}<textarea id="vno-comment-text" rows="5" maxlength="2000" placeholder="${t("sheetDialogs.commentPlaceholder", { coord })}">${this._escapeHtml(existing?.text || "")}</textarea></label>
      <label class="vno-comment-field">${t("sheetDialogs.author")}<input id="vno-comment-author" maxlength="100" value="${this._escapeHtml(existing?.author || t("sheetDialogs.defaultAuthor"))}"></label>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    const apply = overlay.querySelector(".vno-rule-apply");
    apply.textContent = t(existing ? "sheetDialogs.saveChanges" : "sheetDialogs.addComment");
    if (existing) {
      const remove = document.createElement("button");
      remove.className = "vno-btn vno-btn-danger vno-comment-delete";
      remove.textContent = t("sheetDialogs.deleteComment");
      overlay.querySelector(".vno-dialog-footer").prepend(remove);
      remove.addEventListener("click", () => { this.deleteComment({ coord }); overlay.closeDialog(); });
    }
    apply.addEventListener("click", () => {
      const text = overlay.querySelector("#vno-comment-text").value.trim();
      if (!text) { overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.emptyComment"); return; }
      this.saveComment({ coord, text, author: overlay.querySelector("#vno-comment-author").value });
      overlay.closeDialog();
    });
    overlay.querySelector("#vno-comment-text")?.focus();
    return true;
  }

  getPageSetup(sheetName = this.activeSheet) {
    return structuredClone(this.pageSetupBySheet[sheetName] || newSheetPageSetup());
  }

  setPageSetup(changes = {}) {
    const before = this.getPageSetup();
    const presets = {
      normal: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78 },
      wide: { top: 2.54, bottom: 2.54, left: 5.08, right: 5.08 },
      narrow: { top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 }
    };
    const marginInput = presets[changes.marginPreset] || changes.margins || {};
    const margins = { ...before.margins };
    for (const side of ["top", "bottom", "left", "right"]) {
      if (marginInput[side] === undefined) continue;
      const value = Number(marginInput[side]);
      if (!Number.isFinite(value) || value < 0 || value > 25) return false;
      margins[side] = Math.round(value * 1000) / 1000;
    }
    const orientation = changes.orientation || before.orientation;
    const size = changes.size || before.size;
    if (!["portrait", "landscape"].includes(orientation) || !["a4", "letter", "legal"].includes(size)) return false;
    const printTitles = { ...before.printTitles, ...(changes.printTitles || {}) };
    printTitles.rows = String(printTitles.rows || "").trim();
    printTitles.cols = String(printTitles.cols || "").trim().toUpperCase();
    if (printTitles.rows && !/^\d+(?::\d+)?$/.test(printTitles.rows)) return false;
    if (printTitles.cols && !/^[A-Z]+(?::[A-Z]+)?$/.test(printTitles.cols)) return false;
    const scale = { ...before.scale, ...(changes.scale || {}) };
    if (!["percent", "pages"].includes(scale.mode)) return false;
    scale.percent = Number(scale.percent);
    scale.pagesWide = Number(scale.pagesWide);
    scale.pagesTall = Number(scale.pagesTall);
    if (!Number.isInteger(scale.percent) || scale.percent < 10 || scale.percent > 400) return false;
    if (![scale.pagesWide, scale.pagesTall].every(value => Number.isInteger(value) && value >= 0 && value <= 1000)) return false;
    const headerFooter = {
      header: { ...before.headerFooter.header, ...(changes.headerFooter?.header || {}) },
      footer: { ...before.headerFooter.footer, ...(changes.headerFooter?.footer || {}) }
    };
    for (const section of [headerFooter.header, headerFooter.footer]) {
      for (const position of ["left", "center", "right"]) section[position] = String(section[position] || "").slice(0, 500);
    }
    const centerOnPage = { ...before.centerOnPage, ...(changes.centerOnPage || {}) };
    centerOnPage.horizontal = Boolean(centerOnPage.horizontal);
    centerOnPage.vertical = Boolean(centerOnPage.vertical);
    const printOptions = { ...before.printOptions, ...(changes.printOptions || {}) };
    printOptions.gridlines = Boolean(printOptions.gridlines);
    printOptions.headings = Boolean(printOptions.headings);
    const after = { margins, orientation, size, scale, headerFooter, centerOnPage, printOptions, printTitles };
    if (JSON.stringify(before) === JSON.stringify(after)) return after;
    this.pageSetupBySheet[this.activeSheet] = after;
    this._recordHistory({ type: "sheet-page-layout", sheet: this.activeSheet, property: "pageSetupBySheet", before, after: structuredClone(after) });
    return structuredClone(after);
  }

  showPageSetupDialog(focusField = "margins") {
    if (typeof document === "undefined" || !document.body) return false;
    const setup = this.getPageSetup();
    const overlay = this._createSheetDialog("Thiết lập trang", `
      <label>Kiểu lề
        <select id="vno-sheet-margin-preset" class="vno-select" style="width:100%;margin-top:4px">
          <option value="custom">Tùy chỉnh</option><option value="normal">Thường</option><option value="wide">Rộng</option><option value="narrow">Hẹp</option>
        </select>
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${["top", "bottom", "left", "right"].map(side => `<label>${({ top: "Trên", bottom: "Dưới", left: "Trái", right: "Phải" })[side]} (cm)<input id="vno-sheet-margin-${side}" type="number" min="0" max="25" step="0.01" value="${setup.margins[side]}" class="vno-dialog-input" style="width:100%;box-sizing:border-box"></label>`).join("")}
      </div>
      <label>Hướng trang<select id="vno-sheet-orientation" class="vno-select" style="width:100%;margin-top:4px"><option value="portrait" ${setup.orientation === "portrait" ? "selected" : ""}>Dọc</option><option value="landscape" ${setup.orientation === "landscape" ? "selected" : ""}>Ngang</option></select></label>
      <label>Khổ giấy<select id="vno-sheet-size" class="vno-select" style="width:100%;margin-top:4px"><option value="a4" ${setup.size === "a4" ? "selected" : ""}>A4</option><option value="letter" ${setup.size === "letter" ? "selected" : ""}>Letter</option><option value="legal" ${setup.size === "legal" ? "selected" : ""}>Legal</option></select></label>
      <fieldset style="border:1px solid var(--vno-border-default);border-radius:6px"><legend>Tiêu đề in (tùy chọn)</legend><label>Hàng lặp lại (ví dụ 1:2)<input id="vno-sheet-title-rows" value="${this._escapeHtml(setup.printTitles.rows)}" class="vno-dialog-input"></label><label>Cột lặp lại (ví dụ A:B)<input id="vno-sheet-title-cols" value="${this._escapeHtml(setup.printTitles.cols)}" class="vno-dialog-input"></label></fieldset>
      <fieldset style="border:1px solid var(--vno-border-default);border-radius:6px"><legend>Tỷ lệ vừa trang</legend>
        <label><input type="radio" name="vno-sheet-scale-mode" value="percent" ${setup.scale.mode === "percent" ? "checked" : ""}> Vừa theo tỷ lệ <input id="vno-sheet-scale-percent" type="number" min="10" max="400" value="${setup.scale.percent}" class="vno-dialog-input" style="width:76px">%</label>
        <label><input type="radio" name="vno-sheet-scale-mode" value="pages" ${setup.scale.mode === "pages" ? "checked" : ""}> Vừa trong <input id="vno-sheet-scale-wide" type="number" min="0" max="1000" value="${setup.scale.pagesWide}" class="vno-dialog-input" style="width:64px"> trang ngang × <input id="vno-sheet-scale-tall" type="number" min="0" max="1000" value="${setup.scale.pagesTall}" class="vno-dialog-input" style="width:64px"> trang dọc <small>(0 = tự động)</small></label>
      </fieldset>
      <fieldset style="border:1px solid var(--vno-border-default);border-radius:6px"><legend>Căn giữa trang khi in</legend><label><input id="vno-sheet-center-horizontal" type="checkbox" ${setup.centerOnPage.horizontal ? "checked" : ""}> Theo chiều ngang</label><label><input id="vno-sheet-center-vertical" type="checkbox" ${setup.centerOnPage.vertical ? "checked" : ""}> Theo chiều dọc</label></fieldset>
      <fieldset style="border:1px solid var(--vno-border-default);border-radius:6px"><legend>Tùy chọn in</legend><label><input id="vno-sheet-print-gridlines" type="checkbox" ${setup.printOptions.gridlines ? "checked" : ""}> In đường kẻ ô</label><label><input id="vno-sheet-print-headings" type="checkbox" ${setup.printOptions.headings ? "checked" : ""}> In tiêu đề hàng và cột</label></fieldset>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    const presets = { normal: [1.91, 1.91, 1.78, 1.78], wide: [2.54, 2.54, 5.08, 5.08], narrow: [1.27, 1.27, 1.27, 1.27] };
    overlay.querySelector("#vno-sheet-margin-preset").addEventListener("change", event => {
      const values = presets[event.target.value];
      if (values) ["top", "bottom", "left", "right"].forEach((side, index) => { overlay.querySelector(`#vno-sheet-margin-${side}`).value = values[index]; });
    });
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const result = this.setPageSetup({
        margins: Object.fromEntries(["top", "bottom", "left", "right"].map(side => [side, overlay.querySelector(`#vno-sheet-margin-${side}`).value])),
        orientation: overlay.querySelector("#vno-sheet-orientation").value,
        size: overlay.querySelector("#vno-sheet-size").value,
        scale: { mode: overlay.querySelector('[name="vno-sheet-scale-mode"]:checked').value, percent: overlay.querySelector("#vno-sheet-scale-percent").value, pagesWide: overlay.querySelector("#vno-sheet-scale-wide").value, pagesTall: overlay.querySelector("#vno-sheet-scale-tall").value },
        centerOnPage: { horizontal: overlay.querySelector("#vno-sheet-center-horizontal").checked, vertical: overlay.querySelector("#vno-sheet-center-vertical").checked },
        printOptions: { gridlines: overlay.querySelector("#vno-sheet-print-gridlines").checked, headings: overlay.querySelector("#vno-sheet-print-headings").checked },
        printTitles: { rows: overlay.querySelector("#vno-sheet-title-rows").value, cols: overlay.querySelector("#vno-sheet-title-cols").value }
      });
      if (!result) { overlay.querySelector(".vno-rule-error").textContent = "Giá trị lề hoặc tiêu đề in không hợp lệ."; return; }
      overlay.closeDialog();
    });
    const focusIds = { margins: "vno-sheet-margin-preset", orientation: "vno-sheet-orientation", size: "vno-sheet-size", scale: "vno-sheet-scale-percent", printTitles: "vno-sheet-title-rows" };
    overlay.querySelector(`#${focusIds[focusField] || focusIds.margins}`)?.focus();
    return true;
  }

  showHeaderFooterDialog() {
    if (typeof document === "undefined" || !document.body) return false;
    const current = this.getPageSetup().headerFooter;
    const fieldset = (kind, title) => `<fieldset style="border:1px solid var(--vno-border-default);border-radius:6px"><legend>${title}</legend>
      <label>Mẫu dùng sẵn<select class="vno-select vno-sheet-hf-preset" data-kind="${kind}" style="width:100%"><option value="custom">Tùy chỉnh</option><option value="page">Trang X</option><option value="sheet">Tên sheet</option><option value="date">Ngày</option><option value="none">Không có</option></select></label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${["left", "center", "right"].map((position, index) => `<label>${["Trái", "Giữa", "Phải"][index]}<input id="vno-sheet-${kind}-${position}" class="vno-dialog-input" maxlength="500" value="${this._escapeHtml(current[kind][position])}"></label>`).join("")}</div>
    </fieldset>`;
    const overlay = this._createSheetDialog("Tiêu đề Đầu/Cuối trang", `${fieldset("header", "Đầu trang")}${fieldset("footer", "Cuối trang")}<p><small>Mã động: &amp;P số trang, &amp;N tổng số trang, &amp;D ngày, &amp;T giờ, &amp;F tên file, &amp;A tên sheet.</small></p><div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.querySelectorAll(".vno-sheet-hf-preset").forEach(select => select.addEventListener("change", event => {
      const kind = event.target.dataset.kind;
      const preset = { page: "Trang &P", sheet: "Tên sheet: &A", date: "Ngày: &D", none: "" }[event.target.value];
      if (preset === undefined) return;
      ["left", "center", "right"].forEach(position => { overlay.querySelector(`#vno-sheet-${kind}-${position}`).value = position === "center" ? preset : ""; });
    }));
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const read = kind => Object.fromEntries(["left", "center", "right"].map(position => [position, overlay.querySelector(`#vno-sheet-${kind}-${position}`).value]));
      if (!this.setPageSetup({ headerFooter: { header: read("header"), footer: read("footer") } })) return;
      overlay.closeDialog();
    });
    overlay.querySelector("#vno-sheet-header-left")?.focus();
    return true;
  }

  setPrintArea(options = {}) {
    options = options || {};
    const next = options.range || this.getSelectedRangeLabel();
    if (!this._parseRange(next)) return false;
    const before = this.printAreaBySheet[this.activeSheet] || null;
    if (before === next) return next;
    this.printAreaBySheet[this.activeSheet] = next;
    this._recordHistory({ type: "sheet-page-layout", sheet: this.activeSheet, property: "printAreaBySheet", before, after: next });
    this._refreshPageAndCommentVisuals();
    return next;
  }

  clearPrintArea(options = {}) {
    options = options || {};
    const before = this.printAreaBySheet[this.activeSheet] || null;
    if (!before) return false;
    this.printAreaBySheet[this.activeSheet] = null;
    this._recordHistory({ type: "sheet-page-layout", sheet: this.activeSheet, property: "printAreaBySheet", before, after: null });
    this._refreshPageAndCommentVisuals();
    return true;
  }

  insertPageBreak(options = {}) {
    options = options || {};
    const before = structuredClone(this.pageBreaksBySheet[this.activeSheet] || { rows: [], cols: [] });
    const row = Number(options.row || this.selectedCoord.r);
    const col = String(options.col || this.selectedCoord.c).toUpperCase();
    if (!Number.isInteger(row) || row < 1 || row > this.rowCount || !this.cols.includes(col)) return false;
    const after = structuredClone(before);
    if (!after.rows.includes(row)) after.rows.push(row);
    if (!after.cols.includes(col)) after.cols.push(col);
    after.rows.sort((a, b) => a - b);
    after.cols.sort((a, b) => this.cols.indexOf(a) - this.cols.indexOf(b));
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    this.pageBreaksBySheet[this.activeSheet] = after;
    this._recordHistory({ type: "sheet-page-layout", sheet: this.activeSheet, property: "pageBreaksBySheet", before, after: structuredClone(after) });
    this._refreshPageAndCommentVisuals();
    return true;
  }

  removePageBreak(options = {}) {
    options = options || {};
    const before = structuredClone(this.pageBreaksBySheet[this.activeSheet] || { rows: [], cols: [] });
    const row = Number(options.row || this.selectedCoord.r);
    const col = String(options.col || this.selectedCoord.c).toUpperCase();
    if (!Number.isInteger(row) || row < 1 || row > this.rowCount || !this.cols.includes(col)) return false;
    const after = { rows: before.rows.filter(item => item !== row), cols: before.cols.filter(item => item !== col) };
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    this.pageBreaksBySheet[this.activeSheet] = after;
    this._recordHistory({ type: "sheet-page-layout", sheet: this.activeSheet, property: "pageBreaksBySheet", before, after });
    this._refreshPageAndCommentVisuals();
    return true;
  }

  _outlineGroups() { return this.outlineGroupsBySheet[this.activeSheet] ||= []; }

  _isOutlineRowHidden(row) {
    return this._outlineGroups().some(group => group.axis === "row" && group.collapsed && row > group.start && row <= group.end);
  }

  _isOutlineColumnHidden(col) {
    const number = this._columnNumber(col);
    return this._outlineGroups().some(group => group.axis === "col" && group.collapsed && number > group.start && number <= group.end);
  }

  _outlineToggleHtml(axis, value) {
    const numeric = axis === "row" ? Number(value) : this._columnNumber(value);
    const group = this._outlineGroups().find(item => item.axis === axis && item.start === numeric);
    return group ? `<button type="button" class="vno-outline-toggle" data-group-id="${group.id}" aria-label="${group.collapsed ? "Mở rộng" : "Thu gọn"} nhóm">${group.collapsed ? "+" : "−"}</button>` : "";
  }

  groupSelection() {
    const area = this._normalizeRange(this.selectionRange);
    const wholeRows = area.start.c === this.cols[0] && area.end.c === this.cols[this.cols.length - 1];
    const wholeCols = area.start.r === 1 && area.end.r === this.rowCount;
    const axis = wholeCols ? "col" : "row";
    const start = axis === "row" ? area.start.r : this._columnNumber(area.start.c);
    const end = axis === "row" ? area.end.r : this._columnNumber(area.end.c);
    if (end <= start || (!wholeRows && !wholeCols)) return false;
    if (this._outlineGroups().some(group => group.axis === axis && group.start === start && group.end === end)) return false;
    const before = this._snapshotGridStructure();
    this._outlineGroups().push({ id: `outline-${Date.now()}`, axis, start, end, collapsed: false });
    this._renderColumnHeaders(); this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._recordHistory({ type: "grid-structure", sheet: this.activeSheet, before, after: this._snapshotGridStructure() });
    return true;
  }

  ungroupSelection() {
    const area = this._normalizeRange(this.selectionRange);
    const before = this._snapshotGridStructure();
    const previous = this._outlineGroups();
    const remaining = previous.filter(group => group.axis === "row"
      ? group.end < area.start.r || group.start > area.end.r
      : group.end < this._columnNumber(area.start.c) || group.start > this._columnNumber(area.end.c));
    if (remaining.length === previous.length) return false;
    this.outlineGroupsBySheet[this.activeSheet] = remaining;
    this._renderColumnHeaders(); this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    this._recordHistory({ type: "grid-structure", sheet: this.activeSheet, before, after: this._snapshotGridStructure() });
    return true;
  }

  toggleOutlineGroup(id) {
    const group = this._outlineGroups().find(item => item.id === id);
    if (!group) return false;
    group.collapsed = !group.collapsed;
    this._renderColumnHeaders(); this._renderVirtualRows(this.currentStartRow || 1, this.currentEndRow || 40);
    return group.collapsed;
  }

  removeDuplicates(options) { return this.dataTools.removeDuplicates(options); }
  createSubtotal(options) { return this.dataTools.subtotal(options); }
  applyTextToColumns(options) { return this.dataTools.textToColumns(options); }
  applyFlashFill(options) { return this.dataTools.flashFill(options); }

  showRemoveDuplicatesDialog() {
    const area = this._normalizeRange(this.selectionRange);
    const columns = this.dataTools.columns(area);
    const overlay = this._createSheetDialog(t("sheetDialogs.removeDuplicatesTitle", "Xóa trùng lặp"), `
      <p>${t("sheetDialogs.rangeLabel", "Vùng:")} <strong>${this.getSelectedRangeLabel()}</strong></p>
      <label><input id="vno-rd-header" type="checkbox" checked> ${t("sheetDialogs.myHeaderRow", "Dữ liệu có hàng tiêu đề")}</label>
      <fieldset><legend>${t("sheetDialogs.columnsToCompare", "Cột dùng để xét trùng")}</legend>${columns.map(col => `<label><input class="vno-rd-col" type="checkbox" value="${col}" checked> ${col}: ${String(this.dataTools.value(col, area.start.r))}</label>`).join("")}</fieldset>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const selected = [...overlay.querySelectorAll(".vno-rd-col:checked")].map(input => input.value);
      if (!selected.length) { overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.selectAtLeastOneColumn", "Hãy chọn ít nhất một cột."); return; }
      const result = this.removeDuplicates({ hasHeader: overlay.querySelector("#vno-rd-header").checked, columns: selected });
      if (!result) return;
      overlay.closeDialog();
      this._showDataNotice(t("sheetDialogs.duplicatesRemovedResult", { removed: result.removed, remaining: result.remaining }) || `Đã xóa ${result.removed} hàng trùng lặp; còn ${result.remaining} hàng dữ liệu.`);
    });
    return true;
  }

  showSubtotalDialog() {
    const area = this._normalizeRange(this.selectionRange), columns = this.dataTools.columns(area);
    const overlay = this._createSheetDialog(t("sheetDialogs.subtotalTitle", "Tổng phụ"), `
      <p>${t("sheetDialogs.subtotalHint", "Vùng đã chọn phải có tiêu đề và được sắp xếp theo cột nhóm.")}</p>
      <label>${t("sheetDialogs.atEachChangeIn", "Mỗi khi thay đổi ở")}<select id="vno-st-group">${columns.map(col => `<option value="${col}">${col}: ${String(this.dataTools.value(col, area.start.r))}</option>`).join("")}</select></label>
      <label>${t("sheetDialogs.useFunction", "Hàm")}<select id="vno-st-op"><option>SUM</option><option>COUNT</option><option>AVERAGE</option></select></label>
      <fieldset><legend>${t("sheetDialogs.addToSubtotal", "Cộng tổng vào")}</legend>${columns.slice(1).map(col => `<label><input class="vno-st-col" type="checkbox" value="${col}" checked> ${col}: ${String(this.dataTools.value(col, area.start.r))}</label>`).join("")}</fieldset>
      <div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const valueColumns = [...overlay.querySelectorAll(".vno-st-col:checked")].map(input => input.value);
      const result = this.createSubtotal({ groupColumn: overlay.querySelector("#vno-st-group").value, valueColumns, operation: overlay.querySelector("#vno-st-op").value });
      if (!result) { overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.selectRangeAndCol", "Hãy chọn vùng và ít nhất một cột giá trị."); return; }
      overlay.closeDialog(); this._showDataNotice(t("sheetDialogs.subtotalResult", { groups: result.groups }) || `Đã chèn ${result.groups} nhóm tổng phụ và hàng tổng cộng.`);
    });
    return true;
  }

  /**
   * Find a numeric input which makes a formula cell reach the requested value.
   * Trial values never enter history. The sheet is restored before this method
   * returns; callers explicitly commit result.value through applyGoalSeekResult().
   */
  findGoalSeekSolution({ setCell, targetValue, changingCell, tolerance = 0.001, maxIterations = 100 } = {}) {
    const normalizeCoord = value => String(value || "").trim().replace(/^\$/, "").replace(/\$/g, "").toUpperCase();
    const setKey = normalizeCoord(setCell);
    const changingKey = normalizeCoord(changingCell);
    const fail = error => ({ success: false, error });
    if (!/^[A-Z]+[1-9]\d*$/.test(setKey) || !/^[A-Z]+[1-9]\d*$/.test(changingKey)) {
      return fail("Địa chỉ ô không hợp lệ.");
    }
    if (setKey === changingKey) return fail("Ô đặt và ô thay đổi phải khác nhau.");
    const targetCell = this.cellsData.get(setKey);
    const inputCell = this.cellsData.get(changingKey);
    if (!targetCell?.formula) return fail("Ô đặt phải chứa công thức.");
    if (inputCell?.formula) return fail("Ô thay đổi phải là ô giá trị, không được chứa công thức.");
    const target = Number(targetValue);
    const originalInput = structuredClone(inputCell || null);
    const initial = Number(this.formulaEngine.getCellValue(changingKey));
    if (!Number.isFinite(target)) return fail("Giá trị mục tiêu phải là một số hợp lệ.");
    if (!Number.isFinite(initial)) return fail("Ô thay đổi phải chứa giá trị số.");

    const evaluateAt = value => {
      const item = this.cellsData.get(changingKey) || { val: "", formula: "", style: {} };
      item.formula = "";
      item.val = value;
      this.cellsData.set(changingKey, item);
      // Repeat to settle indirect dependencies regardless of Map insertion order.
      const formulaCount = [...this.cellsData.values()].filter(cell => cell?.formula).length;
      for (let pass = 0; pass < Math.max(1, formulaCount); pass++) {
        for (const cell of this.cellsData.values()) {
          if (cell?.formula) cell.val = this.formulaEngine.evaluate(cell.formula);
        }
      }
      const output = Number(this.cellsData.get(setKey)?.val);
      return Number.isFinite(output) ? output - target : NaN;
    };
    const restore = () => {
      if (originalInput) this.cellsData.set(changingKey, structuredClone(originalInput));
      else this.cellsData.delete(changingKey);
      this._recalculateAllFormulas(undefined, true);
    };

    let iterations = 0;
    let best = { x: initial, error: Infinity };
    let left = null;
    let right = null;
    const samples = [];
    const sample = x => {
      const fx = evaluateAt(x);
      iterations++;
      if (Number.isFinite(fx) && Math.abs(fx) < best.error) best = { x, error: Math.abs(fx) };
      if (!left) {
        for (const point of samples) {
          if (Number.isFinite(fx) && point.fx * fx < 0) {
            left = point.x < x ? point : { x, fx };
            right = point.x < x ? { x, fx } : point;
            break;
          }
        }
      }
      samples.push({ x, fx });
      return fx;
    };

    try {
      let x0 = initial;
      let f0 = sample(x0);
      if (Number.isFinite(f0) && Math.abs(f0) <= tolerance) return { success: true, value: x0, residual: Math.abs(f0), iterations };
      let step = Math.max(1, Math.abs(initial) * 0.1);
      let x1 = initial + step;
      let f1 = sample(x1);
      for (let probe = 0; probe < 20 && !left && iterations < maxIterations; probe++) {
        if (Number.isFinite(f1) && Math.abs(f1) <= tolerance) return { success: true, value: x1, residual: Math.abs(f1), iterations };
        step *= 2;
        const x = initial + (probe % 2 === 0 ? -step : step);
        const fx = sample(x);
        if (Number.isFinite(fx) && Math.abs(fx) <= tolerance) return { success: true, value: x, residual: Math.abs(fx), iterations };
        if (Number.isFinite(fx) && (!Number.isFinite(f1) || fx !== f1)) { x0 = x1; f0 = f1; x1 = x; f1 = fx; }
      }

      while (iterations < maxIterations) {
        let next;
        if (left && right) {
          next = (left.x + right.x) / 2;
        } else if (Number.isFinite(f0) && Number.isFinite(f1) && Math.abs(f1 - f0) > Number.EPSILON) {
          next = x1 - f1 * (x1 - x0) / (f1 - f0);
        } else break;
        if (!Number.isFinite(next)) break;
        const fn = sample(next);
        if (Number.isFinite(fn) && Math.abs(fn) <= tolerance) return { success: true, value: next, residual: Math.abs(fn), iterations };
        if (left && right && Number.isFinite(fn)) {
          if (left.fx * fn <= 0) right = { x: next, fx: fn };
          else left = { x: next, fx: fn };
        }
        x0 = x1; f0 = f1; x1 = next; f1 = fn;
      }
      return fail("Goal Seek không tìm được đáp án phù hợp.");
    } finally {
      restore();
    }
  }

  applyGoalSeekResult(changingCell, value) {
    const match = /^([A-Z]+)([1-9]\d*)$/.exec(String(changingCell || "").trim().replace(/\$/g, "").toUpperCase());
    if (!match || !Number.isFinite(Number(value))) return false;
    this.setCellValue(match[1], Number(match[2]), Number(value), true);
    return true;
  }

  goalSeek(config = {}) {
    const result = this.findGoalSeekSolution(config);
    if (result.success && config.apply !== false) this.applyGoalSeekResult(config.changingCell, result.value);
    return result;
  }

  showGoalSeekDialog() {
    const selected = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const overlay = this._createSheetDialog("Dò tìm mục tiêu", `
      <label for="vno-goal-set-cell">Ô đặt<input id="vno-goal-set-cell" value="${this._escapeHtml(selected)}" autocomplete="off"></label>
      <label for="vno-goal-value">Đến giá trị<input id="vno-goal-value" type="number" step="any" autocomplete="off"></label>
      <label for="vno-goal-changing-cell">Bằng cách đổi ô<input id="vno-goal-changing-cell" autocomplete="off"></label>
      <div class="vno-rule-error" role="alert" aria-live="assertive"></div>
      <div class="vno-goal-result" role="status" aria-live="polite" hidden></div>`);
    if (!overlay) return false;
    const apply = overlay.querySelector(".vno-rule-apply");
    const error = overlay.querySelector(".vno-rule-error");
    const resultBox = overlay.querySelector(".vno-goal-result");
    let pending = null;
    apply.textContent = "Tìm kết quả";
    apply.addEventListener("click", () => {
      if (pending) {
        this.applyGoalSeekResult(pending.changingCell, pending.value);
        overlay.closeDialog();
        return;
      }
      const config = {
        setCell: overlay.querySelector("#vno-goal-set-cell").value,
        targetValue: overlay.querySelector("#vno-goal-value").value,
        changingCell: overlay.querySelector("#vno-goal-changing-cell").value,
        apply: false
      };
      const result = this.findGoalSeekSolution(config);
      if (!result.success) {
        error.textContent = result.error;
        resultBox.hidden = true;
        return;
      }
      error.textContent = "";
      pending = { changingCell: config.changingCell, value: result.value };
      resultBox.hidden = false;
      resultBox.textContent = `Đã tìm thấy ${config.changingCell.toUpperCase()} = ${NumberFormatter.formatGeneralNumber(result.value)} (sai số ${result.residual.toPrecision(3)}). Chọn OK để áp dụng.`;
      apply.textContent = "OK";
      overlay.querySelectorAll("input").forEach(input => { input.disabled = true; });
    });
    return true;
  }

  showTextToColumnsDialog() {
    const preview = value => this.dataTools.splitText(this.dataTools.value(this.selectedCoord.c, this.selectedCoord.r), value).join(" | ");
    const overlay = this._createSheetDialog(t("sheetDialogs.textToColumnsTitle", "Tách văn bản thành cột"), `
      <label>${t("sheetDialogs.ttcMode", "Kiểu tách")}<select id="vno-ttc-mode"><option value="delimiter">${t("sheetDialogs.ttcDelimited", "Dấu phân cách")}</option><option value="fixed">${t("sheetDialogs.ttcFixedWidth", "Độ rộng cố định")}</option></select></label>
      <label id="vno-ttc-del-row">${t("sheetDialogs.ttcDelimited", "Dấu phân cách")}<select id="vno-ttc-del"><option value=",">${t("sheetDialogs.ttcComma", "Dấu phẩy")}</option><option value=";">${t("sheetDialogs.ttcSemicolon", "Dấu chấm phẩy")}</option><option value="space">${t("sheetDialogs.ttcSpace", "Khoảng trắng")}</option><option value="tab">Tab</option><option value="custom">${t("sheetDialogs.ttcCustom", "Tùy chọn")}</option></select></label>
      <label id="vno-ttc-custom-row" hidden>${t("sheetDialogs.ttcCustomChar", "Ký tự tùy chọn")}<input id="vno-ttc-custom" maxlength="3"></label>
      <label id="vno-ttc-width-row" hidden>${t("sheetDialogs.ttcWidths", "Độ rộng (cách nhau bằng dấu phẩy)")}<input id="vno-ttc-width" value="5,5"></label>
      <div class="vno-data-preview" role="status"></div><div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    const options = () => { const mode = overlay.querySelector("#vno-ttc-mode").value; const selected = overlay.querySelector("#vno-ttc-del").value; return { mode, delimiter: selected === "custom" ? overlay.querySelector("#vno-ttc-custom").value : selected, widths: overlay.querySelector("#vno-ttc-width").value.split(",") }; };
    const update = () => { const config = options(); overlay.querySelector("#vno-ttc-del-row").hidden = config.mode !== "delimiter"; overlay.querySelector("#vno-ttc-width-row").hidden = config.mode !== "fixed"; overlay.querySelector("#vno-ttc-custom-row").hidden = overlay.querySelector("#vno-ttc-del").value !== "custom" || config.mode !== "delimiter"; overlay.querySelector(".vno-data-preview").textContent = `${t("sheetDialogs.ttcPreview", "Xem trước: ")}${preview(config)}`; };
    overlay.querySelectorAll("select,input").forEach(input => input.addEventListener("input", update)); update();
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => { const result = this.applyTextToColumns(options()); if (!result) { overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.selectSingleCol", "Chỉ chọn dữ liệu trong một cột."); return; } overlay.closeDialog(); });
    return true;
  }

  runFlashFill() {
    const result = this.applyFlashFill();
    this._showDataNotice(result ? (t("sheetDialogs.flashFillSuccess", { filled: result.filled, pattern: result.pattern }) || `Flash Fill đã điền ${result.filled} ô (${result.pattern}).`) : t("sheetDialogs.flashFillFailure", "Không nhận diện được mẫu. Hãy nhập 1–2 ví dụ ở cột kết quả kế bên dữ liệu nguồn."));
    return result;
  }

  _showDataNotice(message) {
    if (typeof document === "undefined") return;
    const overlay = this._createSheetDialog(t("sheetDialogs.resultTitle", "Kết quả"), `<p class="vno-data-result" role="status">${message}</p>`);
    overlay?.querySelector(".vno-rule-apply")?.addEventListener("click", () => overlay.closeDialog());
  }

  _createSheetDialog(title, bodyHtml) {
    if (typeof document === "undefined") return null;
    const previousActive = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-sheet-rule-dialog";
    overlay.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="vno-dialog-header"><strong>${title}</strong><button class="vno-btn vno-rule-close" aria-label="${t("sheetDialogs.close")}">&times;</button></div>
      <div class="vno-dialog-body">${bodyHtml}</div>
      <div class="vno-dialog-footer"><button class="vno-btn vno-rule-cancel">${t("sheetDialogs.cancel")}</button><button class="vno-btn vno-btn-primary vno-rule-apply">${t("sheetDialogs.apply")}</button></div>
    </div>`;
    const onKey = (event) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "Tab") {
        const dialogBox = overlay.querySelector(".vno-dialog-box");
        const focusables = dialogBox ? Array.from(dialogBox.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0) : [];
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (event.shiftKey && (document.activeElement === first || !dialogBox.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !dialogBox.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };
    const close = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (previousActive && typeof previousActive.focus === "function") {
        try { previousActive.focus(); } catch (_) {}
      }
    };
    overlay.closeDialog = close;
    overlay.querySelector(".vno-rule-close").addEventListener("click", close);
    overlay.querySelector(".vno-rule-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    overlay.querySelector("select, input")?.focus();
    return overlay;
  }

  showConditionalFormattingDialog() {
    const overlay = this._createSheetDialog(t("sheetDialogs.conditionalFormatting"), `
      <p class="vno-rule-range">${t("sheetDialogs.range")}: <strong>${this.getSelectedRangeLabel()}</strong></p>
      <label>${t("sheetDialogs.rule")}<select id="vno-cf-type"><option value="greaterThan">${t("sheetDialogs.greaterThan")}</option><option value="lessThan">${t("sheetDialogs.lessThan")}</option><option value="blank">${t("sheetDialogs.blankCell")}</option></select></label>
      <label id="vno-cf-value-row">${t("sheetDialogs.value")}<input id="vno-cf-value" type="number" value="0"></label>
      <label>${t("sheetDialogs.fillColor")}<input id="vno-cf-color" type="color" value="#fff2cc"></label>
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
      if (!result) overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.invalidNumber");
      else overlay.closeDialog();
    });
    return true;
  }

  showDataValidationDialog() {
    const overlay = this._createSheetDialog(t("sheetDialogs.dataValidation"), `
      <p class="vno-rule-range">${t("sheetDialogs.range")}: <strong>${this.getSelectedRangeLabel()}</strong></p>
      <label>${t("sheetDialogs.allow")}<select id="vno-dv-type"><option value="list">${t("sheetDialogs.list")}</option><option value="numberRange">${t("sheetDialogs.numberRange")}</option></select></label>
      <label id="vno-dv-list-row">${t("sheetDialogs.listValues")}<input id="vno-dv-list" type="text" placeholder="${t("sheetDialogs.listPlaceholder")}"></label>
      <div id="vno-dv-number-row" hidden><label>${t("sheetDialogs.minimum")}<input id="vno-dv-min" type="number" value="0"></label><label>${t("sheetDialogs.maximum")}<input id="vno-dv-max" type="number" value="100"></label></div>
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
      if (!result) overlay.querySelector(".vno-rule-error").textContent = t("sheetDialogs.invalidValidation");
      else overlay.closeDialog();
    });
    return true;
  }

  createPivotTable(config, recordUndo = true) {
    const sourceSheet = config.sourceSheet || this.activeSheet;
    const sourceCells = this.sheetsData[sourceSheet];
    if (!sourceCells) throw new Error(t("sheetDialogs.sourceSheetNotFound"));
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
    const overlay = this._createSheetDialog(t("sheetDialogs.pivotTitle"), `
      <div class="vno-pivot-dialog">
        <label>${t("sheetDialogs.pivotSource")}<input id="vno-pivot-range" value="${this._escapeHtml(defaultRange)}" aria-label="${t("sheetDialogs.pivotSource")}"></label>
        <button class="vno-btn" id="vno-pivot-load-fields" type="button">${t("sheetDialogs.loadFields")}</button>
        <div class="vno-pivot-fields" aria-live="polite"></div>
        <div class="vno-rule-error" role="alert"></div>
      </div>`);
    if (!overlay) return false;
    const fieldsHost = overlay.querySelector(".vno-pivot-fields");
    const error = overlay.querySelector(".vno-rule-error");
    const loadFields = () => {
      try {
        const { headers } = PivotTableEngine.readSource(this.sheetsData[sourceSheet], overlay.querySelector("#vno-pivot-range").value);
        fieldsHost.innerHTML = `<p>${t("sheetDialogs.chooseFields")}</p>${headers.map((header, index) => `
          <div class="vno-pivot-field" data-field="${this._escapeHtml(header)}">
            <strong>${this._escapeHtml(header)}</strong>
            <label><input type="checkbox" data-zone="rows" data-index="${index}"> Rows</label>
            <label><input type="checkbox" data-zone="columns" data-index="${index}"> Columns</label>
            <label><input type="checkbox" data-zone="values" data-index="${index}"> Values</label>
            <select data-aggregate="${index}" aria-label="${t("sheetDialogs.aggregateFor", { field: this._escapeHtml(header) })}"><option>SUM</option><option>COUNT</option><option>AVERAGE</option><option>MIN</option><option>MAX</option></select>
          </div>`).join("")}`;
        fieldsHost.dataset.headers = JSON.stringify(headers);
        error.textContent = "";
      } catch (err) {
        fieldsHost.innerHTML = "";
        error.textContent = err.message;
      }
    };
    overlay.querySelector("#vno-pivot-load-fields").addEventListener("click", loadFields);
    overlay.querySelector(".vno-rule-apply").textContent = t("sheetDialogs.createPivotBtn", "Tạo Pivot Table");
    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      try {
        const headers = JSON.parse(fieldsHost.dataset.headers || "[]");
        const selected = zone => [...fieldsHost.querySelectorAll(`input[data-zone="${zone}"]:checked`)].map(input => headers[+input.dataset.index]);
        const valueFields = [...fieldsHost.querySelectorAll('input[data-zone="values"]:checked')].map(input => ({ field: headers[+input.dataset.index], aggregate: fieldsHost.querySelector(`select[data-aggregate="${input.dataset.index}"]`).value }));
        this.createPivotTable({ sourceSheet, sourceRange: overlay.querySelector("#vno-pivot-range").value, rows: selected("rows"), columns: selected("columns"), values: valueFields });
        overlay.closeDialog();
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
    if (!dom || !styles) return;
    for (const [k, v] of Object.entries(styles)) {
      if (k === "numberFormat") continue;
      dom.style[k] = v;
    }
  }

  _renderCellVisual(td, itm, col, row) {
    if (!td) return;
    td.style.cssText = "";
    td.classList?.toggle?.("is-wrap-text", itm?.style?.whiteSpace === "normal");
    if (!itm) {
      td.textContent = "";
      return;
    }

    if (itm.style) {
      this._applyStylesToDom(td, itm.style);
    }

    if (itm.sparkline) {
      const values = itm.sparkline.values;
      const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
      if (itm.sparkline.type === "column") {
        const width = 96 / values.length;
        td.innerHTML = `<svg data-sparkline="column" viewBox="0 0 100 24" width="100%" height="24" aria-label="Sparkline column">${values.map((value, i) => `<rect x="${i * width + 1}" y="${22 - (value - min) / span * 20}" width="${Math.max(1, width - 2)}" height="${Math.max(1, (value - min) / span * 20)}" fill="#0f6d38"/>`).join("")}</svg>`;
      } else {
        const points = values.map((value, i) => `${values.length === 1 ? 50 : i * 100 / (values.length - 1)},${22 - (value - min) / span * 20}`).join(" ");
        td.innerHTML = `<svg data-sparkline="line" viewBox="0 0 100 24" width="100%" height="24" aria-label="Sparkline line"><polyline points="${points}" fill="none" stroke="#0f6d38" stroke-width="2"/></svg>`;
      }
      return;
    }

    if (itm.hyperlink) {
      td.innerHTML = `<a href="${this._escapeHtml(itm.hyperlink)}" target="_blank" rel="noopener noreferrer">${this._escapeHtml(itm.val || itm.hyperlink)}</a>`;
      return;
    }

    if (this.showFormulas && itm.formula) {
      td.textContent = itm.formula;
      td.style.textAlign = "left";
      return;
    }

    if (itm.style?.numberFormat) {
      const formatted = NumberFormatter.formatValue(itm.val, itm.style.numberFormat);
      if (formatted.isAccounting) {
        td.innerHTML = `<span class="vno-cell-accounting-symbol" style="float:left;user-select:none;color:inherit;">${formatted.symbol || ""}</span><span class="vno-cell-accounting-num" style="float:right;color:inherit;">${formatted.numberText}</span>`;
        td.style.textAlign = "right";
      } else {
        td.textContent = formatted.text;
        if (formatted.isRed) td.style.color = "#dc2626";
        else if (itm.style?.color) td.style.color = itm.style.color;
        if (formatted.align) td.style.textAlign = formatted.align;
        else if (itm.style?.textAlign) td.style.textAlign = itm.style.textAlign;
      }
    } else {
      td.textContent = typeof itm.val === "number" ? NumberFormatter.formatGeneralNumber(itm.val) : (itm.val ?? "");
    }
  }
}
