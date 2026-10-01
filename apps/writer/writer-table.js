/**
 * 3T Doc — Table Controller (Move Handle, Column Border Drag Resize, Cell Selection & Contextual Ribbon)
 */

export class WriterTableController {
  constructor({ body, page, adapter, ribbonHost, mountElement, shell } = {}) {
    this.body = body;
    this.page = page;
    this.adapter = adapter;
    this.ribbonHost = ribbonHost;
    this.mountElement = mountElement;
    this.shell = shell;

    this.activeTable = null;
    this.activeCell = null;
    this.selectedCells = new Set();
    this.moveHandle = null;

    this._resizing = false;
    this._resizeColIndex = -1;
    this._resizeStartX = 0;
    this._resizeStartWidth = 0;
    this._resizeTable = null;
    this._resizingCell = null;

    this._isSelecting = false;
    this._selectStartCell = null;

    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onSelectionChange = this._handleSelectionChange.bind(this);
    this._onDocMouseMove = this._handleDocMouseMove.bind(this);
    this._onDocMouseUp = this._handleDocMouseUp.bind(this);
  }

  attach() {
    if (!this.body) return this;

    this._createMoveHandle();

    this.body.addEventListener("mousemove", this._onPointerMove);
    this.body.addEventListener("mousedown", this._onPointerDown);
    this.body.addEventListener("click", this._onSelectionChange);
    this.body.addEventListener("keyup", this._onSelectionChange);

    if (typeof document !== "undefined") {
      document.addEventListener("selectionchange", this._onSelectionChange);
      document.addEventListener("mousemove", this._onDocMouseMove);
      document.addEventListener("mouseup", this._onDocMouseUp);
    }

    this._syncContextualTabs(false);
    return this;
  }

  destroy() {
    this.body?.removeEventListener("mousemove", this._onPointerMove);
    this.body?.removeEventListener("mousedown", this._onPointerDown);
    this.body?.removeEventListener("click", this._onSelectionChange);
    this.body?.removeEventListener("keyup", this._onSelectionChange);

    if (typeof document !== "undefined") {
      document.removeEventListener("selectionchange", this._onSelectionChange);
      document.removeEventListener("mousemove", this._onDocMouseMove);
      document.removeEventListener("mouseup", this._onDocMouseUp);
    }

    this.moveHandle?.remove();
    this.moveHandle = null;
    this.clearCellSelection();
    this._syncContextualTabs(false);
  }

  _createMoveHandle() {
    if (this.moveHandle || typeof document === "undefined") return;
    const handle = document.createElement("div");
    handle.className = "vno-table-move-handle";
    handle.id = "vno-table-move-handle";
    handle.title = "Chọn hoặc di chuyển bảng";
    handle.setAttribute("aria-label", "Chọn hoặc di chuyển bảng");
    handle.style.display = "none";
    handle.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#475569" stroke-width="1.6" stroke-linecap="round"><path d="M8 2v12M2 8h12M8 2 6 4m2-2 2 2M8 14l-2-2m2 2 2-2M2 8l2-2M2 8l2 2m10-2-2-2m2 2-2 2"/></svg>`;

    handle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.activeTable) {
        this.selectTable(this.activeTable);
      }
    });

    const parent = this.page || this.body.parentElement || this.body;
    parent.style.position ||= "relative";
    parent.appendChild(handle);
    this.moveHandle = handle;
  }

  _syncContextualTabs(visible) {
    this.mountElement?.classList?.toggle("vno-writer-table-context", visible);
    const designTab = this.mountElement?.querySelector("#vno-ribbon-tab-tableDesign");
    const layoutTab = this.mountElement?.querySelector("#vno-ribbon-tab-tableLayout");

    if (designTab) {
      designTab.hidden = !visible;
      designTab.setAttribute("aria-hidden", visible ? "false" : "true");
    }
    if (layoutTab) {
      layoutTab.hidden = !visible;
      layoutTab.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  }

  _positionMoveHandle(table) {
    if (!this.moveHandle || !table) return;
    const parent = this.moveHandle.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();

    const left = tableRect.left - parentRect.left - 18;
    const top = tableRect.top - parentRect.top - 18;

    this.moveHandle.style.left = `${Math.max(2, left)}px`;
    this.moveHandle.style.top = `${Math.max(2, top)}px`;
    this.moveHandle.style.display = "flex";
  }

  _hideMoveHandle() {
    if (this.moveHandle) {
      this.moveHandle.style.display = "none";
    }
  }

  _handleSelectionChange() {
    if (typeof window === "undefined") return;
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) {
      if (!this.activeTable) {
        this._syncContextualTabs(false);
        this._hideMoveHandle();
      }
      return;
    }

    const anchor = sel.anchorNode;
    const el = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
    const cell = el?.closest?.("td, th");
    const table = cell?.closest?.("table");

    if (table && this.body.contains(table)) {
      this.activeTable = table;
      this.activeCell = cell;
      this._positionMoveHandle(table);
      this._syncContextualTabs(true);
    } else {
      // Check if mouse is still inside active table
      const hoveredTable = this.body?.querySelector("table:hover");
      if (!hoveredTable) {
        this.activeTable = null;
        this.activeCell = null;
        this._hideMoveHandle();
        this._syncContextualTabs(false);
      }
    }
  }

  _handlePointerMove(event) {
    if (this._resizing) return;

    const cell = event.target?.closest?.("td, th");
    const table = cell?.closest?.("table") || event.target?.closest?.("table");

    if (table && this.body.contains(table)) {
      this.activeTable = table;
      this._positionMoveHandle(table);
      this._syncContextualTabs(true);

      if (cell) {
        const rect = cell.getBoundingClientRect();
        const distFromRight = Math.abs(event.clientX - rect.right);
        if (distFromRight <= 5) {
          cell.style.cursor = "col-resize";
        } else {
          cell.style.cursor = "";
        }
      }
    } else {
      if (!this.activeCell) {
        this._hideMoveHandle();
      }
    }
  }

  _handlePointerDown(event) {
    const cell = event.target?.closest?.("td, th");
    if (!cell) return;

    const rect = cell.getBoundingClientRect();
    const distFromRight = Math.abs(event.clientX - rect.right);

    if (distFromRight <= 5) {
      // Bắt đầu kéo chỉnh độ rộng cột
      event.preventDefault();
      this._resizing = true;
      this._resizingCell = cell;
      this._resizeTable = cell.closest("table");
      this._resizeColIndex = cell.cellIndex;
      this._resizeStartX = event.clientX;
      this._resizeStartWidth = cell.offsetWidth;
      document.body.style.cursor = "col-resize";
      return;
    }

    // Xử lý chọn ô
    if (event.shiftKey && this.activeCell && this.activeTable === cell.closest("table")) {
      event.preventDefault();
      this.selectCellRange(this.activeCell, cell);
    } else {
      this.clearCellSelection();
      this.activeCell = cell;
      this.activeTable = cell.closest("table");
      this._isSelecting = true;
      this._selectStartCell = cell;
    }
  }

  _handleDocMouseMove(event) {
    if (this._resizing && this._resizingCell && this._resizeTable) {
      const dx = event.clientX - this._resizeStartX;
      const newWidth = Math.max(30, this._resizeStartWidth + dx);
      const colIdx = this._resizeColIndex;

      // Áp dụng độ rộng cho tất cả các ô trong cùng cột
      for (const row of this._resizeTable.rows) {
        const target = row.cells[colIdx];
        if (target && target.colSpan === 1) {
          target.style.width = `${newWidth}px`;
        }
      }
      return;
    }

    if (this._isSelecting && this._selectStartCell) {
      const cell = event.target?.closest?.("td, th");
      if (cell && cell.closest("table") === this.activeTable && cell !== this._selectStartCell) {
        this.selectCellRange(this._selectStartCell, cell);
      }
    }
  }

  _handleDocMouseUp() {
    if (this._resizing) {
      this._resizing = false;
      this._resizingCell = null;
      this._resizeTable = null;
      document.body.style.cursor = "";
      this.adapter?.recordSnapshot?.("writer.table.colResize");
    }
    this._isSelecting = false;
  }

  selectCellRange(startCell, endCell) {
    const table = startCell?.closest("table");
    if (!table || table !== endCell?.closest("table")) return;

    this.clearCellSelection();
    const startRow = startCell.parentElement.rowIndex;
    const startCol = startCell.cellIndex;
    const endRow = endCell.parentElement.rowIndex;
    const endCol = endCell.cellIndex;

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    for (let r = minRow; r <= maxRow; r++) {
      const row = table.rows[r];
      if (!row) continue;
      for (let c = minCol; c <= maxCol; c++) {
        const cell = row.cells[c];
        if (cell) {
          cell.classList.add("is-vno-cell-selected");
          this.selectedCells.add(cell);
        }
      }
    }
  }

  clearCellSelection() {
    for (const cell of this.selectedCells) {
      cell.classList.remove("is-vno-cell-selected");
    }
    this.selectedCells.clear();
  }

  selectTable(table = this.activeTable) {
    if (!table) return;
    this.clearCellSelection();
    this.activeTable = table;
    for (const row of table.rows) {
      for (const cell of row.cells) {
        cell.classList.add("is-vno-cell-selected");
        this.selectedCells.add(cell);
      }
    }
    this._syncContextualTabs(true);
    this._positionMoveHandle(table);
  }

  selectRow(cell = this.activeCell) {
    const row = cell?.closest("tr");
    if (!row) return;
    this.clearCellSelection();
    for (const c of row.cells) {
      c.classList.add("is-vno-cell-selected");
      this.selectedCells.add(c);
    }
  }

  selectCol(cell = this.activeCell) {
    const table = cell?.closest("table");
    if (!table || !cell) return;
    const idx = cell.cellIndex;
    this.clearCellSelection();
    for (const row of table.rows) {
      const c = row.cells[idx];
      if (c) {
        c.classList.add("is-vno-cell-selected");
        this.selectedCells.add(c);
      }
    }
  }

  selectCell(cell = this.activeCell) {
    if (!cell) return;
    this.clearCellSelection();
    cell.classList.add("is-vno-cell-selected");
    this.selectedCells.add(cell);
  }
}
