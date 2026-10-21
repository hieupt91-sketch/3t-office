/**
 * P8 viewport-first Sheet preview.
 *
 * This is deliberately separate from SheetGridController: it is a bounded,
 * read-only window over the LibreOffice document and never mutates the real
 * workbook model. The normal FODS/payload route remains the sole editable model.
 */

const DEFAULT_ROW_HEIGHT = 26;
const DEFAULT_COL_WIDTH = 100;
const WINDOW_ROWS = 40;
const WINDOW_COLS = 20;

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
  constructor({ grid, shell, bridge, reopenFile, getSourceFilePath, documentRef = globalThis.document, timers = globalThis } = {}) {
    this.grid = grid;
    this.shell = shell;
    this.bridge = bridge;
    this.reopenFile = reopenFile;
    this.getSourceFilePath = getSourceFilePath;
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
    this._retrying = false;
    this._retryButton = null;
    this.pendingHistory = [];
    this.historyPointer = 0;
    this.valueOverrides = new Map();
    this.styleOverrides = new Map();
    this.editor = null;
    this.editorCell = null;
    this._historyReplayed = false;
    this._windowHandler = payload => this.open(payload);
    this._engineAttachHandler = payload => this.attachEngine(payload);
    this._windowClickHandler = event => {
      if (!this.active || !this.root?.contains?.(event.target)) return;
      if (event.target?.closest?.("button") && !event.target.closest?.("[data-sheet-index]")) return;
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      if (event.target === this.editor) this.editor?.focus?.();
      else this._handleClick(event);
    };
    this._windowShortcutHandler = event => {
      if (!this.active || event.target === this.editor || !(event.ctrlKey || event.metaKey)) return;
      if (!["z", "y", "b", "i", "u", "v", "s", "p", "x"].includes(String(event.key || "").toLowerCase())) return;
      this._handleKeyDown(event);
    };
    this._readyHandler = () => this.completeFullLoad();
    this._failedHandler = () => this.failFullLoad();
    this._documentClickHandler = event => {
      if (!this.active || this.root?.contains?.(event.target)) return;
      const command = event.target?.closest?.("[data-command-id],[data-backstage-cmd]");
      if (!command) return;
      const commandId = command.dataset.commandId || command.dataset.backstageCmd || "";
      if (/\.help\.|^common\.help\./.test(commandId)) return;
      const styleCommand = {
        "sheet.cell.bold": ["fontWeight", "bold", "normal"],
        "sheet.cell.italic": ["fontStyle", "italic", "normal"],
        "sheet.cell.underline": ["textDecoration", "underline", "none"]
      }[commandId];
      if (styleCommand) {
        event.preventDefault(); event.stopImmediatePropagation?.();
        this._toggleQuickStyle(...styleCommand);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation?.();
      this.notifyReadOnly();
    };
  }

  install() {
    if (typeof window === "undefined") return;
    window.__vnoSheetQuickViewOpen = this._windowHandler;
    window.__vnoSheetQuickViewAttachEngine = this._engineAttachHandler;
    window.__vnoSheetQuickViewController = this;
    window.addEventListener("keydown", this._windowShortcutHandler, true);
    window.addEventListener("click", this._windowClickHandler, true);
    window.addEventListener("vno:sheet-full-model-ready", this._readyHandler);
    window.addEventListener("vno:sheet-full-model-failed", this._failedHandler);
  }

  async open(payload) {
    if (!payload?.doc_id || !payload?.window?.ok || !Array.isArray(payload.sheets) || !payload.sheets.length) return false;
    if (this.active) await this.closeView();
    this.docId = String(payload.doc_id);
    this.sourcePath = String(payload.sourcePath || "");
    this._closed = false;
    this.sheets = payload.sheets;
    this.activeSheet = Math.max(0, Number(payload.sheet) || 0);
    this.selected = { row: 1, col: 0 };
    this._mount();
    this.active = true;
    const key = this._cacheKey(this.activeSheet, Number(payload.r0) || 0, Number(payload.c0) || 0);
    this.cache.set(key, payload.window);
    this._renderTabs();
    this.updateProgress("Đang nạp đầy đủ · bạn có thể sửa ô trong lúc chờ…", 12);
    await this._renderWindow(Number(payload.r0) || 0, Number(payload.c0) || 0, payload.window);
    this.root?.focus?.({ preventScroll: true });
    if (typeof window !== "undefined") {
      window.__vnoSheetQuickViewShownAt = performance.now();
      window.dispatchEvent(new CustomEvent("vno:sheet-quick-view-ready", { detail: { docId: this.docId } }));
    }
    return true;
  }

  async attachEngine(payload) {
    if (!this.active || !payload?.doc_id || !payload?.window?.ok || !Array.isArray(payload.sheets)) return false;
    if (this.editor) {
      this.docId = String(payload.doc_id);
      this._pendingEnginePayload = payload;
      return true;
    }
    const selectedName = this.sheets[this.activeSheet]?.name || "";
    const engineIndex = payload.sheets.findIndex(sheet => sheet.name === selectedName);
    this.docId = String(payload.doc_id);
    this.sourcePath = String(payload.sourcePath || this.sourcePath || "");
    this.sheets = payload.sheets;
    this.activeSheet = engineIndex >= 0 ? engineIndex : Math.max(0, Number(payload.sheet) || 0);
    this.cache.clear();
    this._renderTabs();
    const payloadSheet = Math.max(0, Number(payload.sheet) || 0);
    const r0 = Math.max(0, Number(payload.r0) || 0);
    const c0 = Math.max(0, Number(payload.c0) || 0);
    this.cache.set(this._cacheKey(payloadSheet, r0, c0), payload.window);
    if (this.activeSheet === payloadSheet) {
      this._applyWindowDimensions(payload.window);
      await this._renderWindow(r0, c0, payload.window);
    } else {
      const first = await this.bridge.sheetViewWindow(this.docId, this.activeSheet, 0, 0, 0, 0, true, true);
      if (first?.ok) {
        this._applyWindowDimensions(first);
        this.cache.set(this._cacheKey(this.activeSheet, 0, 0), first);
      }
    }
    this._pendingEnginePayload = null;
    await this._requestVisibleWindow();
    return true;
  }

  _mount() {
    if (!this.document?.createElement || !this.grid?.container) return;
    this.root?.remove?.();
    const root = this.document.createElement("section");
    root.className = "vno-sheet-quick-view";
    root.tabIndex = 0;
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Màn hình xem nhanh bảng tính, có thể sửa ô trong lúc nạp đầy đủ");
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
    root.addEventListener("keydown", event => this._handleKeyDown(event));
    root.addEventListener("paste", event => this._handlePaste(event));
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
      const data = await this.cache.getOrLoad(key, () => this.docId.startsWith("xlsx-preview-")
        ? this.bridge.sheetXlsxPreviewWindow(this.sourcePath, this.activeSheet, r0, c0, r1, c1)
        : this.bridge.sheetViewWindow(this.docId, this.activeSheet, r0, c0, r1, c1, true, true));
      if (!this.active || token !== this._renderToken || !data?.ok) return;
      this._applyWindowDimensions(data);
      await this._renderWindow(r0, c0, data);
    } catch (error) {
      if (this.active) this.updateProgress("Xem nhanh tạm gián đoạn; dữ liệu đầy đủ vẫn đang được nạp.", null);
    }
  }

  _applyWindowDimensions(data) {
    const sheet = this.sheets[this.activeSheet];
    const rows = Number(data?.sheet_rows), cols = Number(data?.sheet_cols);
    if (!sheet || !Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) return false;
    sheet.rows = rows;
    sheet.cols = cols;
    sheet.dimensions_known = true;
    return true;
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
        const overrideKey = this._cellKey(this.activeSheet, r0 + r + 1, c0 + c);
        const valueOverride = this.valueOverrides.get(overrideKey);
        td.textContent = valueOverride !== undefined ? valueOverride : (display == null ? "" : String(display));
        const style = styles[r]?.[c];
        if (style) Object.assign(td.style, style);
        const styleOverride = this.styleOverrides.get(overrideKey);
        if (styleOverride) Object.assign(td.style, styleOverride);
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
    event.stopPropagation?.();
    if (this.editor && !this.editor.contains?.(event.target)) this._finishEdit(true);
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
    if (this.editor) this._finishEdit(true);
    this.selected = { row: Number(cell.dataset.row) || 1, col: Number(cell.dataset.col) || 0 };
    this.root.querySelectorAll(".vno-sheet-quick-cell.is-selected").forEach(item => item.classList.remove("is-selected"));
    cell.classList.add("is-selected");
    this.root?.focus?.({ preventScroll: true });
  }

  _handleKeyDown(event) {
    // This overlay is mounted inside the grid container; keep its keyboard events
    // from falling through to SheetGrid's normal formula-bar keyboard handler.
    event.stopPropagation?.();
    const key = event.key;
    if (event.target === this.editor) {
      if (key === "Enter") {
        event.preventDefault();
        this._finishEdit(true);
        this._moveSelection(1, 0);
      } else if (key === "Escape") {
        event.preventDefault();
        this._finishEdit(false);
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "z") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      this._undoPendingEdit(); return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "y") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      this._redoPendingEdit(); return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "b") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      this._toggleQuickStyle("fontWeight", "bold", "normal"); return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "i") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      this._toggleQuickStyle("fontStyle", "italic", "normal"); return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "u") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      this._toggleQuickStyle("textDecoration", "underline", "none"); return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "v") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      void this._pasteFromClipboard(); return;
    }
    if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === "p") {
      event.preventDefault(); event.stopImmediatePropagation?.();
      this.notifyReadOnly(); return;
    }
    if ((event.ctrlKey || event.metaKey) && ["s", "x"].includes(String(key).toLowerCase())) {
      this._blockReadOnly(event);
      return;
    }
    // Tìm/Thay thế chạy trên lưới đầy đủ (còn rỗng ở màn hình xem nhanh): báo rõ thay vì mở hộp thoại tìm trên lưới trống.
    if ((event.ctrlKey || event.metaKey) && ["f", "h"].includes(String(key).toLowerCase())) {
      event.preventDefault?.();
      event.stopPropagation?.();
      const message = "Tìm kiếm và thay thế dùng được sau khi nạp đầy đủ. Bạn vẫn có thể cuộn và đọc dữ liệu ở màn hình xem nhanh.";
      this.shell?.setStatus?.(message);
      if (this.status) this.status.textContent = message;
      return;
    }
    if (key === "F2") {
      event.preventDefault(); this._beginEdit(this._selectedValue()); return;
    }
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault(); this._queueValueEdit(this.selected.row, this.selected.col, ""); return;
    }
    if (key === "Enter") {
      event.preventDefault(); this._moveSelection(1, 0); return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); this._beginEdit(key); return;
    }
    if (key === "Tab") {
      event.preventDefault(); this._moveSelection(0, event.shiftKey ? -1 : 1);
      return;
    }
    const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!directions[key]) return;
    event.preventDefault();
    const sheet = this.sheets[this.activeSheet] || { rows: 1, cols: 1 };
    this._moveSelection(...directions[key]);
  }

  _cellKey(sheet, row, col) { return `${Number(sheet) || 0}:${Number(row) || 1}:${Number(col) || 0}`; }

  _selectedElement() {
    return [...(this.root?.querySelectorAll?.(".vno-sheet-quick-cell") || [])].find(cell =>
      Number(cell.dataset.row) === this.selected.row && Number(cell.dataset.col) === this.selected.col
    ) || null;
  }

  _selectedValue() {
    const cell = this._selectedElement();
    return this.valueOverrides.get(this._cellKey(this.activeSheet, this.selected.row, this.selected.col))
      ?? cell?.dataset.value ?? "";
  }

  _beginEdit(initialValue = "") {
    if (!this.active || this.editor) return false;
    const cell = this._selectedElement();
    if (!cell) return this.notifyReadOnly();
    const input = this.document.createElement("input");
    input.type = "text";
    input.className = "vno-sheet-quick-editor";
    input.setAttribute("aria-label", `Sửa ô ${quickViewColumnLabel(this.selected.col)}${this.selected.row}`);
    input.value = String(initialValue ?? "");
    cell.appendChild(input);
    this.editor = input;
    this.editorCell = cell;
    input.focus?.();
    return true;
  }

  _finishEdit(commit) {
    const input = this.editor;
    const cell = this.editorCell;
    if (!input) return false;
    const value = input.value;
    input.remove?.();
    this.editor = null;
    this.editorCell = null;
    if (commit) this._queueValueEdit(Number(cell?.dataset.row) || this.selected.row, Number(cell?.dataset.col) || this.selected.col, value);
    this.root?.focus?.({ preventScroll: true });
    if (this._pendingEnginePayload) {
      const pending = this._pendingEnginePayload;
      this._pendingEnginePayload = null;
      this.timers.setTimeout(() => { void this.attachEngine(pending); }, 0);
    }
    return true;
  }

  _queueValueEdit(row, col, value) {
    const cellKey = this._cellKey(this.activeSheet, row, col);
    const element = [...(this.root?.querySelectorAll?.(".vno-sheet-quick-cell") || [])].find(cell =>
      Number(cell.dataset.row) === row && Number(cell.dataset.col) === col
    );
    const before = this.valueOverrides.get(cellKey) ?? element?.dataset.value ?? "";
    const next = String(value ?? "").normalize("NFC");
    if (String(before) === next) return false;
    this._recordPendingHistory({ sheet: this.sheets[this.activeSheet]?.name || "", edits: [{ row, col, before: String(before ?? ""), after: next, hasValue: true }] });
    return true;
  }

  _recordPendingHistory(action) {
    this.pendingHistory.splice(this.historyPointer);
    this.pendingHistory.push(action);
    if (this.pendingHistory.length > 500) this.pendingHistory.shift();
    this.historyPointer = this.pendingHistory.length;
    this._applyQuickAction(action, "after");
    this.updateProgress("Đang nạp đầy đủ · chỉnh sửa đã được giữ lại");
    return true;
  }

  _applyQuickAction(action, direction) {
    const sheetIndex = Math.max(0, this.sheets.findIndex(sheet => sheet.name === action.sheet));
    for (const edit of action.edits || []) {
      const key = this._cellKey(sheetIndex, edit.row, edit.col);
      const value = direction === "undo" ? edit.before : edit.after;
      if (edit.hasValue) this.valueOverrides.set(key, String(value ?? ""));
      const style = edit[direction === "undo" ? "beforeStyle" : "afterStyle"];
      if (style) this.styleOverrides.set(key, style);
      else if (edit.hasStyle) this.styleOverrides.delete(key);
      const cell = [...(this.root?.querySelectorAll?.(".vno-sheet-quick-cell") || [])].find(item =>
        Number(item.dataset.row) === edit.row && Number(item.dataset.col) === edit.col
      );
      if (cell) {
        if (edit.hasValue) {
          cell.textContent = String(value ?? "");
          cell.dataset.value = String(value ?? "");
        }
        if (style) Object.assign(cell.style, style);
        else if (edit.hasStyle) cell.style.fontWeight = "";
      }
    }
  }

  _undoPendingEdit() {
    if (this.editor) { this._finishEdit(false); return true; }
    if (this.historyPointer <= 0) return false;
    const action = this.pendingHistory[--this.historyPointer];
    this._applyQuickAction(action, "undo");
    this.updateProgress("Đã hoàn tác · chỉnh sửa vẫn được giữ trong lúc nạp");
    return true;
  }

  _redoPendingEdit() {
    if (this.historyPointer >= this.pendingHistory.length) return false;
    const action = this.pendingHistory[this.historyPointer++];
    this._applyQuickAction(action, "after");
    this.updateProgress("Đã làm lại · chỉnh sửa vẫn được giữ trong lúc nạp");
    return true;
  }

  _toggleQuickStyle(property, enabled, disabled) {
    const cell = this._selectedElement();
    if (!cell) return this.notifyReadOnly();
    const currentStyle = this.styleOverrides.get(this._cellKey(this.activeSheet, this.selected.row, this.selected.col)) || {};
    const current = currentStyle[property] || cell.style[property] || (property === "fontWeight" ? "400" : "normal");
    const beforeStyle = { [property]: current };
    const afterStyle = { [property]: current === enabled || (property === "fontWeight" && current === "700") ? disabled : enabled };
    const value = this._selectedValue();
    this._recordPendingHistory({
      sheet: this.sheets[this.activeSheet]?.name || "",
      edits: [{ row: this.selected.row, col: this.selected.col, before: value, after: value, hasValue: false, hasStyle: true, styleProp: property, beforeStyle, afterStyle }]
    });
    return true;
  }

  _moveSelection(rowDelta, colDelta) {
    const sheet = this.sheets[this.activeSheet] || { rows: 1, cols: 1 };
    this.selected.row = Math.max(1, Math.min(Number(sheet.rows) || 1, this.selected.row + rowDelta));
    this.selected.col = Math.max(0, Math.min((Number(sheet.cols) || 1) - 1, this.selected.col + colDelta));
    this.viewport.scrollTop = Math.max(0, (this.selected.row - 2) * DEFAULT_ROW_HEIGHT);
    this.viewport.scrollLeft = Math.max(0, (this.selected.col - 1) * DEFAULT_COL_WIDTH);
    this._requestVisibleWindow();
  }

  _handlePaste(event) {
    if (this.editor) return;
    const text = event.clipboardData?.getData?.("text/plain");
    if (typeof text !== "string") return this._blockReadOnly(event);
    event.preventDefault?.();
    this._pasteText(text);
  }

  async _pasteFromClipboard() {
    if (this.editor) return false;
    try {
      const result = await this.bridge?.readClipboardData?.();
      if (result?.status !== "ok" || typeof result.text !== "string") return this._blockReadOnly();
      return this._pasteText(result.text);
    } catch {
      return this._blockReadOnly();
    }
  }

  _pasteText(text) {
    const lines = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
    const edits = [];
    const sheet = this.sheets[this.activeSheet] || { rows: 1, cols: 1 };
    for (let rowOffset = 0; rowOffset < lines.length; rowOffset++) {
      const values = lines[rowOffset].split("\t");
      for (let colOffset = 0; colOffset < values.length; colOffset++) {
        const row = this.selected.row + rowOffset, col = this.selected.col + colOffset;
        if (row > (Number(sheet.rows) || row) || col >= (Number(sheet.cols) || col + 1)) continue;
        const cell = [...(this.root?.querySelectorAll?.(".vno-sheet-quick-cell") || [])].find(item => Number(item.dataset.row) === row && Number(item.dataset.col) === col);
        const key = this._cellKey(this.activeSheet, row, col);
        edits.push({ row, col, before: this.valueOverrides.get(key) ?? cell?.dataset.value ?? "", after: values[colOffset], hasValue: true });
      }
    }
    if (edits.length) this._recordPendingHistory({ sheet: sheet.name || "", edits });
    return edits.length > 0;
  }

  applyPendingEditsToGrid(grid) {
    if (this._historyReplayed || !grid || !this.pendingHistory.length) return false;
    if (this.editor) this._finishEdit(true);
    for (const action of this.pendingHistory) {
      if (action.sheet && grid.activeSheet !== action.sheet) grid.switchSheet?.(action.sheet, { skipSave: true });
      const before = {}, after = {};
      for (const edit of action.edits || []) {
        const col = quickViewColumnLabel(edit.col), coord = `${col}${edit.row}`;
        const current = grid.cellsData.get(coord);
        before[coord] = current ? structuredClone(current) : null;
        if (edit.hasValue) grid.setCellValue(col, edit.row, edit.after, false);
        if (edit.hasStyle) {
          const item = grid.cellsData.get(coord) || { val: "", formula: "", style: {} };
          const nextStyle = edit.afterStyle?.[edit.styleProp];
          const modelValue = edit.styleProp === "fontWeight" ? (nextStyle === "bold" || nextStyle === "700" ? "bold" : "normal") : nextStyle;
          item.style = { ...(item.style || {}), [edit.styleProp]: modelValue };
          grid.cellsData.set(coord, item);
        }
        const updated = grid.cellsData.get(coord);
        after[coord] = updated ? structuredClone(updated) : null;
      }
      grid._recordHistory?.({ type: "batch-cells", sheet: action.sheet || grid.activeSheet, before, after });
    }
    for (let index = this.historyPointer; index < this.pendingHistory.length; index++) grid.undo?.();
    const sheetName = this.sheets[this.activeSheet]?.name;
    if (sheetName && grid.activeSheet !== sheetName) grid.switchSheet?.(sheetName, { skipSave: true });
    grid.selectCell?.(quickViewColumnLabel(this.selected.col), this.selected.row);
    grid._renderVirtualRows?.(grid.currentStartRow || 1, grid.currentEndRow || 40);
    this._historyReplayed = true;
    return true;
  }

  _blockReadOnly(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    this.notifyReadOnly();
  }

  notifyReadOnly() {
    const message = "Bảng tính đang nạp đầy đủ. Gõ, xóa, dán ô và Ctrl+B có thể dùng ngay; Lưu, In và thao tác toàn sổ khả dụng sau khi nạp xong.";
    this.shell?.setStatus?.(message);
    if (this.status) this.status.textContent = message;
    return false;
  }

  updateProgress(message, percent) {
    if (!this.active && !this.root) return false;
    const suffix = Number.isFinite(Number(percent)) ? ` ${Math.max(0, Math.min(100, Math.round(Number(percent))))}%` : "";
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
    // Giữ màn hình xem nhanh để vẫn đọc được dữ liệu; chỉ cho biết nạp đầy đủ thất bại. (Bản cũ: đóng ngay về lưới trống.)
    if (this.active && this.root && !globalThis.__VNO_QUICKVIEW_CLOSE_ON_FAIL) {
      this._showFailure(this.reopenFile
        ? "Không nạp đầy đủ được bảng tính. Nội dung sửa tạm vẫn nằm ở cửa sổ này. Nhấn Thử lại để mở bản gốc trong cửa sổ mới; đừng đóng cửa sổ này nếu chưa chép lại nội dung sửa."
        : "Không nạp đầy đủ được bảng tính. Nội dung sửa tạm vẫn nằm trong cửa sổ này; hãy chép lại nội dung sửa trước khi đóng hoặc mở lại tệp.");
      return true;
    }
    await this.closeView();
    return true;
  }

  // Thanh trạng thái đỏ + nút Thử lại (gán textContent xóa nút, nên luôn đặt lại nút sau khi đổi chữ).
  _showFailure(message) {
    this.shell?.setStatus?.(message);
    if (!this.status) return;
    this.status.textContent = message;
    this.status.classList?.add?.("is-failed");
    if (!this.reopenFile) return;
    if (!this._retryButton) {
      const button = this.document.createElement("button");
      button.type = "button";
      button.className = "vno-sheet-quick-retry";
      button.textContent = "Thử lại";
      button.setAttribute("aria-label", "Thử lại mở tệp bảng tính này");
      button.addEventListener("click", () => this.retryFullLoad());
      this._retryButton = button;
    }
    this._retryButton.disabled = false;
    this.status.appendChild(this._retryButton);
  }

  // Mở lại tệp trong cửa sổ mới. Giữ màn hình đọc được cho tới khi cửa sổ mới mở xong; lỗi (kể cả {status:"error"} từ
  // Python) hiện lại thông báo đỏ và nút, không bao giờ coi là thành công.
  async retryFullLoad() {
    if (this._retrying || !this.active || !this.reopenFile) return false;
    const filePath = this.getSourceFilePath?.() || this.sourcePath;
    if (!filePath) return false;
    this._retrying = true;
    if (this._retryButton) this._retryButton.disabled = true;
    this.status?.classList?.remove?.("is-failed");
    if (this.status) this.status.textContent = "Đang mở lại…";
    this.shell?.setStatus?.("Đang mở lại…");
    try {
      const result = await this.reopenFile(filePath);
      if (result && typeof result === "object" && result.status && result.status !== "ok") {
        throw new Error(String(result.message || ""));
      }
      const done = "Đã mở bản gốc trong cửa sổ mới. Chỉnh sửa tạm vẫn ở cửa sổ này; hãy chép lại trước khi đóng.";
      if (this.status) this.status.textContent = done;
      this.shell?.setStatus?.(done);
      this._retrying = false;
      return true;
    } catch (error) {
      this._retrying = false;
      this._showFailure(`Không mở lại được tệp${error?.message ? `: ${error.message}` : ""}. Bạn có thể thử lại.`);
      return false;
    }
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
    if (typeof window !== "undefined") window.removeEventListener("keydown", this._windowShortcutHandler, true);
    if (typeof window !== "undefined") window.removeEventListener("click", this._windowClickHandler, true);
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
      if (window.__vnoSheetQuickViewAttachEngine === this._engineAttachHandler) delete window.__vnoSheetQuickViewAttachEngine;
      if (window.__vnoSheetQuickViewController === this) delete window.__vnoSheetQuickViewController;
      window.removeEventListener("vno:sheet-full-model-ready", this._readyHandler);
      window.removeEventListener("vno:sheet-full-model-failed", this._failedHandler);
      window.removeEventListener("click", this._windowClickHandler, true);
    }
    void this.closeView();
  }
}
