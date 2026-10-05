/**
 * P8 viewport-first Sheet preview.
 *
 * This is deliberately separate from SheetGridController: it is a bounded,
 * read-only window over the LibreOffice document and never mutates the real
 * workbook model. The normal FODS/payload route remains the sole editable model.
 */

const DEFAULT_ROW_HEIGHT = 26;
const DEFAULT_COL_WIDTH = 100;
const WINDOW_ROWS = 80;
const WINDOW_COLS = 30;

export function quickViewColumnLabel(index) {
  let value = Math.max(0, Number(index) || 0) + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function colorToCss(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  return `#${(number & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function viewFormatToStyle(format = {}) {
  const horizontal = String(format.halign || "").toLowerCase();
  const vertical = String(format.valign || "").toLowerCase();
  const posture = String(format.posture || "").toLowerCase();
  const decorations = [];
  if (Number(format.underline) > 0) decorations.push("underline");
  if (Number(format.strike) > 0) decorations.push("line-through");
  const style = {
    fontFamily: format.font ? String(format.font) : "",
    fontSize: Number(format.size) > 0 ? `${Number(format.size)}pt` : "",
    fontWeight: Number(format.weight) >= 150 ? "700" : "400",
    fontStyle: posture.includes("italic") || posture.includes("oblique") ? "italic" : "normal",
    color: colorToCss(format.color),
    backgroundColor: colorToCss(format.bg),
    textAlign: horizontal.includes("center") ? "center" : horizontal.includes("right") ? "right" : horizontal.includes("left") ? "left" : "",
    verticalAlign: vertical.includes("center") || vertical.includes("middle") ? "middle" : vertical.includes("bottom") ? "bottom" : "top",
    whiteSpace: format.wrap ? "pre-wrap" : "nowrap",
    textDecoration: decorations.join(" ")
  };
  return Object.fromEntries(Object.entries(style).filter(([, value]) => value !== ""));
}

export function mapFormatBlocks(blocks, rowCount, colCount) {
  const mapped = Array.from({ length: rowCount }, () => Array(colCount).fill(null));
  for (const block of blocks || []) {
    const style = viewFormatToStyle(block);
    const r0 = Math.max(0, Number(block.r0) || 0);
    const c0 = Math.max(0, Number(block.c0) || 0);
    const r1 = Math.min(rowCount - 1, Number(block.r1) || 0);
    const c1 = Math.min(colCount - 1, Number(block.c1) || 0);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) mapped[row][col] = style;
    }
  }
  return mapped;
}

export class ViewWindowCache {
  constructor(limit = 12) {
    this.limit = Math.max(1, Number(limit) || 12);
    this.entries = new Map();
  }

  get(key) {
    if (!this.entries.has(key)) return undefined;
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key, value) {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value);
    return value;
  }

  async getOrLoad(key, loader) {
    const cached = this.get(key);
    if (cached !== undefined) return await cached;
    const pending = Promise.resolve().then(loader);
    this.set(key, pending);
    try {
      const value = await pending;
      this.set(key, value);
      return value;
    } catch (error) {
      if (this.entries.get(key) === pending) this.entries.delete(key);
      throw error;
    }
  }

  clear() { this.entries.clear(); }
}

export function captureQuickViewState(view) {
  return {
    sheetName: view?.sheets?.[view.activeSheet]?.name || "",
    sheetIndex: Number(view?.activeSheet) || 0,
    selectedRow: Math.max(1, Number(view?.selected?.row) || 1),
    selectedCol: Math.max(0, Number(view?.selected?.col) || 0),
    anchorRow: Math.max(1, Number(view?.anchorRow) || 1),
    anchorCol: Math.max(0, Number(view?.anchorCol) || 0)
  };
}

export function restoreQuickViewState(grid, state) {
  if (!grid || !state) return false;
  const sheetName = grid.sheets?.includes(state.sheetName)
    ? state.sheetName
    : grid.sheets?.[Math.min(state.sheetIndex, Math.max(0, (grid.sheets?.length || 1) - 1))];
  if (sheetName && grid.activeSheet !== sheetName) grid.switchSheet?.(sheetName, { skipSave: true });
  const col = quickViewColumnLabel(state.selectedCol);
  grid.selectCell?.(col, state.selectedRow);
  if (grid.viewport) {
    const anchorCol = state.anchorCol + 1;
    grid.viewport.scrollTop = Math.max(0, grid._rowTop?.(state.anchorRow) ?? ((state.anchorRow - 1) * (grid.rowHeight || DEFAULT_ROW_HEIGHT)));
    grid.viewport.scrollLeft = Math.max(0, grid._colLeft?.(anchorCol) ?? (state.anchorCol * (grid.defaultColWidth || DEFAULT_COL_WIDTH)));
    grid._onViewportScroll?.();
  }
  return true;
}

export class SheetQuickView {
  constructor({ grid, shell, bridge, documentRef = globalThis.document, timers = globalThis } = {}) {
    this.grid = grid;
    this.shell = shell;
    this.bridge = bridge;
    this.document = documentRef;
    this.timers = timers;
    this.cache = new ViewWindowCache(12);
    this.active = false;
    this.docId = null;
    this.sheets = [];
    this.activeSheet = 0;
    this.selected = { row: 1, col: 0 };
    this.anchorRow = 1;
    this.anchorCol = 0;
    this.root = null;
    this.viewport = null;
    this.layer = null;
    this.status = null;
    this.tabs = null;
    this._renderToken = 0;
    this._scrollTimer = null;
    this._closed = false;
    this._windowHandler = payload => this.open(payload);
    this._readyHandler = () => this.completeFullLoad();
    this._failedHandler = () => this.failFullLoad();
    this._documentClickHandler = event => {
      if (!this.active || this.root?.contains?.(event.target)) return;
      const command = event.target?.closest?.("[data-command-id],[data-backstage-cmd]");
      if (!command) return;
      const commandId = command.dataset.commandId || command.dataset.backstageCmd || "";
      if (/\.help\.|^common\.help\./.test(commandId)) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
      this.notifyReadOnly();
    };
  }

  install() {
    if (typeof window === "undefined") return;
    window.__vnoSheetQuickViewOpen = this._windowHandler;
    window.__vnoSheetQuickViewController = this;
    window.addEventListener("vno:sheet-full-model-ready", this._readyHandler);
    window.addEventListener("vno:sheet-full-model-failed", this._failedHandler);
  }

  async open(payload) {
    if (!payload?.doc_id || !payload?.window?.ok || !Array.isArray(payload.sheets) || !payload.sheets.length) return false;
    if (this.active) await this.closeView();
    this.docId = String(payload.doc_id);
    this._closed = false;
    this.sheets = payload.sheets;
    this.activeSheet = Math.max(0, Number(payload.sheet) || 0);
    this.selected = { row: 1, col: 0 };
    this._mount();
    this.active = true;
    const key = this._cacheKey(this.activeSheet, Number(payload.r0) || 0, Number(payload.c0) || 0);
    this.cache.set(key, payload.window);
    this._renderTabs();
    this.updateProgress("Chỉ đọc · đang nạp đầy đủ…", 12);
    await this._renderWindow(Number(payload.r0) || 0, Number(payload.c0) || 0, payload.window);
    this.root?.focus?.({ preventScroll: true });
    if (typeof window !== "undefined") {
      window.__vnoSheetQuickViewShownAt = performance.now();
      window.dispatchEvent(new CustomEvent("vno:sheet-quick-view-ready", { detail: { docId: this.docId } }));
    }
    return true;
  }

  _mount() {
    if (!this.document?.createElement || !this.grid?.container) return;
    this.root?.remove?.();
    const root = this.document.createElement("section");
    root.className = "vno-sheet-quick-view";
    root.tabIndex = 0;
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Màn hình xem nhanh bảng tính chỉ đọc");
    root.innerHTML = `
      <div class="vno-sheet-quick-status" role="status" aria-live="polite"></div>
      <div class="vno-sheet-quick-viewport"><div class="vno-sheet-quick-spacer"></div><div class="vno-sheet-quick-layer"></div></div>
      <div class="vno-sheet-quick-tabs" role="tablist" aria-label="Danh sách trang tính"></div>`;
    this.root = root;
    this.status = root.querySelector(".vno-sheet-quick-status");
    this.viewport = root.querySelector(".vno-sheet-quick-viewport");
    this.layer = root.querySelector(".vno-sheet-quick-layer");
    this.tabs = root.querySelector(".vno-sheet-quick-tabs");
    this.grid.container.classList.add("vno-quick-view-active");
    this.grid.container.appendChild(root);
    this.document.addEventListener?.("click", this._documentClickHandler, true);
    this.viewport.addEventListener("scroll", () => {
      if (this._scrollTimer) this.timers.clearTimeout(this._scrollTimer);
      this._scrollTimer = this.timers.setTimeout(() => this._requestVisibleWindow(), 90);
    });
    root.addEventListener("click", event => this._handleClick(event));
    root.addEventListener("keydown", event => this._handleKeyDown(event));
    root.addEventListener("paste", event => this._blockReadOnly(event));
    root.addEventListener("beforeinput", event => this._blockReadOnly(event));
  }

  _cacheKey(sheet, r0, c0) { return `${sheet}:${Math.floor(r0 / WINDOW_ROWS)}:${Math.floor(c0 / WINDOW_COLS)}`; }

  _windowOrigin() {
    const row = Math.max(0, Math.floor((this.viewport?.scrollTop || 0) / DEFAULT_ROW_HEIGHT));
    const col = Math.max(0, Math.floor((this.viewport?.scrollLeft || 0) / DEFAULT_COL_WIDTH));
    return {
      r0: Math.floor(row / WINDOW_ROWS) * WINDOW_ROWS,
      c0: Math.floor(col / WINDOW_COLS) * WINDOW_COLS
    };
  }

  async _requestVisibleWindow() {
    if (!this.active || !this.docId) return;
    const { r0, c0 } = this._windowOrigin();
    this.anchorRow = Math.floor((this.viewport.scrollTop || 0) / DEFAULT_ROW_HEIGHT) + 1;
    this.anchorCol = Math.floor((this.viewport.scrollLeft || 0) / DEFAULT_COL_WIDTH);
    const sheet = this.sheets[this.activeSheet] || { rows: 1, cols: 1 };
    const r1 = Math.min(Math.max(0, Number(sheet.rows) - 1), r0 + WINDOW_ROWS - 1);
    const c1 = Math.min(Math.max(0, Number(sheet.cols) - 1), c0 + WINDOW_COLS - 1);
    const key = this._cacheKey(this.activeSheet, r0, c0);
    const token = ++this._renderToken;
    try {
      const data = await this.cache.getOrLoad(key, () => this.bridge.sheetViewWindow(
        this.docId, this.activeSheet, r0, c0, r1, c1, true, true
      ));
      if (!this.active || token !== this._renderToken || !data?.ok) return;
      await this._renderWindow(r0, c0, data);
    } catch (error) {
      if (this.active) this.updateProgress("Xem nhanh tạm gián đoạn; dữ liệu đầy đủ vẫn đang được nạp.", null);
    }
  }

  async _renderWindow(r0, c0, data) {
    if (!this.layer || !this.viewport) return;
    const sheet = this.sheets[this.activeSheet] || { rows: 1, cols: 1 };
    const spacer = this.root.querySelector(".vno-sheet-quick-spacer");
    spacer.style.width = `${Math.max(this.viewport.clientWidth || 1, Number(sheet.cols || 1) * DEFAULT_COL_WIDTH + 44)}px`;
    spacer.style.height = `${Math.max(this.viewport.clientHeight || 1, Number(sheet.rows || 1) * DEFAULT_ROW_HEIGHT + 24)}px`;
    const rows = Array.isArray(data.values) ? data.values.length : 0;
    const cols = rows ? data.values[0].length : 0;
    const styles = mapFormatBlocks(data.formats, rows, cols);
    const table = this.document.createElement("table");
    table.className = "vno-sheet-quick-table";
    table.setAttribute("role", "grid");
    table.dataset.r0 = String(r0);
    table.dataset.c0 = String(c0);
    table.style.transform = `translate(${c0 * DEFAULT_COL_WIDTH}px, ${r0 * DEFAULT_ROW_HEIGHT}px)`;
    const colgroup = this.document.createElement("colgroup");
    const rowHeadCol = this.document.createElement("col");
    rowHeadCol.style.width = "44px";
    colgroup.appendChild(rowHeadCol);
    for (let c = 0; c < cols; c++) {
      const col = this.document.createElement("col");
      const hidden = !!data.col_hidden?.[c];
      const px = hidden ? 0 : Math.max(24, Math.round((Number(data.col_widths?.[c]) || 2646) * 96 / 2540));
      col.style.width = `${px}px`;
      colgroup.appendChild(col);
    }
    table.appendChild(colgroup);
    const thead = this.document.createElement("thead");
    const headerRow = this.document.createElement("tr");
    headerRow.innerHTML = `<th class="vno-sheet-quick-corner"></th>`;
    for (let c = 0; c < cols; c++) {
      const th = this.document.createElement("th");
      th.className = "vno-sheet-quick-col-header";
      th.textContent = quickViewColumnLabel(c0 + c);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = this.document.createElement("tbody");
    for (let r = 0; r < rows; r++) {
      const tr = this.document.createElement("tr");
      if (data.row_hidden?.[r]) tr.dataset.sourceHidden = "true";
      const height = Math.max(18, Math.round((Number(data.row_heights?.[r]) || 529) * 96 / 2540));
      tr.style.height = `${height}px`;
      const rowHeader = this.document.createElement("th");
      rowHeader.className = "vno-sheet-quick-row-header";
      rowHeader.textContent = String(r0 + r + 1);
      tr.appendChild(rowHeader);
      for (let c = 0; c < cols; c++) {
        const td = this.document.createElement("td");
        td.className = "vno-sheet-quick-cell";
        td.dataset.row = String(r0 + r + 1);
        td.dataset.col = String(c0 + c);
        if (data.col_hidden?.[c]) td.dataset.sourceHidden = "true";
        const raw = data.values?.[r]?.[c];
        // UNO doubles can contain binary tails (10598500.000000002) that the
        // established FODS route canonicalizes to the integer. Match that model.
        const nearest = typeof raw === "number" ? Math.round(raw) : raw;
        const value = typeof raw === "number"
          && Math.abs(raw - nearest) <= Number.EPSILON * Math.max(1, Math.abs(raw)) * 8 ? nearest : raw;
        td.dataset.value = value == null ? "" : String(value);
        const formatted = data.strings?.[r]?.[c];
        // Calc's getString() includes alignment padding for numeric formats.
        // The real Sheet renderer does not; string cells retain intentional spaces.
        const display = typeof value === "string" ? value
          : (formatted !== undefined && formatted !== "" ? String(formatted).trim() : value);
        td.textContent = display == null ? "" : String(display);
        const style = styles[r]?.[c];
        if (style) Object.assign(td.style, style);
        if (this.selected.row === r0 + r + 1 && this.selected.col === c0 + c) td.classList.add("is-selected");
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    this.layer.replaceChildren(table);
  }

  _renderTabs() {
    if (!this.tabs) return;
    this.tabs.replaceChildren();
    this.sheets.forEach((sheet, index) => {
      const button = this.document.createElement("button");
      button.type = "button";
      button.className = `vno-sheet-quick-tab${index === this.activeSheet ? " is-active" : ""}`;
      button.dataset.sheetIndex = String(index);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", index === this.activeSheet ? "true" : "false");
      button.textContent = sheet.name;
      this.tabs.appendChild(button);
    });
  }

  _handleClick(event) {
    const tab = event.target?.closest?.("[data-sheet-index]");
    if (tab) {
      this.activeSheet = Number(tab.dataset.sheetIndex) || 0;
      this.selected = { row: 1, col: 0 };
      this.viewport.scrollTop = 0;
      this.viewport.scrollLeft = 0;
      this._renderTabs();
      this._requestVisibleWindow();
      return;
    }
    const cell = event.target?.closest?.(".vno-sheet-quick-cell");
    if (!cell) return;
    this.selected = { row: Number(cell.dataset.row) || 1, col: Number(cell.dataset.col) || 0 };
    this.root.querySelectorAll(".vno-sheet-quick-cell.is-selected").forEach(item => item.classList.remove("is-selected"));
    cell.classList.add("is-selected");
  }

  _handleKeyDown(event) {
    const key = event.key;
    if ((event.ctrlKey || event.metaKey) && ["s", "v", "x"].includes(String(key).toLowerCase())) {
      this._blockReadOnly(event);
      return;
    }
    if (["Enter", "F2", "Backspace", "Delete"].includes(key) || (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)) {
      this._blockReadOnly(event);
      return;
    }
    const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!directions[key]) return;
    event.preventDefault();
    const sheet = this.sheets[this.activeSheet] || { rows: 1, cols: 1 };
    this.selected.row = Math.max(1, Math.min(Number(sheet.rows) || 1, this.selected.row + directions[key][0]));
    this.selected.col = Math.max(0, Math.min((Number(sheet.cols) || 1) - 1, this.selected.col + directions[key][1]));
    this.viewport.scrollTop = Math.max(0, (this.selected.row - 2) * DEFAULT_ROW_HEIGHT);
    this.viewport.scrollLeft = Math.max(0, (this.selected.col - 1) * DEFAULT_COL_WIDTH);
    this._requestVisibleWindow();
  }

  _blockReadOnly(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    this.notifyReadOnly();
  }

  notifyReadOnly() {
    const message = "Bảng tính đang ở màn hình xem nhanh chỉ đọc. Vui lòng chờ nạp đầy đủ để sửa, dán hoặc lưu.";
    this.shell?.setStatus?.(message);
    if (this.status) this.status.textContent = message;
    return false;
  }

  updateProgress(message, percent) {
    if (!this.active && !this.root) return false;
    const suffix = Number.isFinite(Number(percent)) ? ` ${Math.max(0, Math.min(99, Math.round(Number(percent))))}%` : "";
    const text = `${String(message || "Chỉ đọc · đang nạp đầy đủ…").replace(/\s+\d+%\s*$/, "")}${suffix}`;
    if (this.status) this.status.textContent = text;
    this.shell?.setStatus?.(text);
    return true;
  }

  async completeFullLoad() {
    if (!this.active) return false;
    const state = captureQuickViewState(this);
    restoreQuickViewState(this.grid, state);
    this.updateProgress("Đã nạp đầy đủ", 100);
    await new Promise(resolve => {
      const raf = this.timers.requestAnimationFrame || (callback => this.timers.setTimeout(callback, 0));
      raf(() => raf(resolve));
    });
    this.root?.classList?.add("is-leaving");
    await new Promise(resolve => this.timers.setTimeout(resolve, 120));
    await this.closeView();
    this.grid?.focusGrid?.();
    return true;
  }

  async failFullLoad() {
    if (!this.active && !this.docId) return false;
    await this.closeView();
    return true;
  }

  async closeView() {
    const docId = this.docId;
    this.docId = null;
    this.active = false;
    this._closed = true;
    this._renderToken += 1;
    if (this._scrollTimer) this.timers.clearTimeout(this._scrollTimer);
    this._scrollTimer = null;
    this.root?.remove?.();
    this.root = null;
    this.document?.removeEventListener?.("click", this._documentClickHandler, true);
    this.grid?.container?.classList?.remove?.("vno-quick-view-active");
    this.cache.clear();
    if (docId) {
      try { await this.bridge?.sheetViewClose?.(docId); } catch { /* native window cleanup is the final guard */ }
    }
    return true;
  }

  destroy() {
    if (typeof window !== "undefined") {
      if (window.__vnoSheetQuickViewOpen === this._windowHandler) delete window.__vnoSheetQuickViewOpen;
      if (window.__vnoSheetQuickViewController === this) delete window.__vnoSheetQuickViewController;
      window.removeEventListener("vno:sheet-full-model-ready", this._readyHandler);
      window.removeEventListener("vno:sheet-full-model-failed", this._failedHandler);
    }
    void this.closeView();
  }
}
