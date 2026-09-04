/**
 * VN Office LibreOffice Adapter — VN Sheet Adapter
 * Quản lý tương tác với StarCalc (sc) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";

export class SheetAdapter {
  constructor(gridController) {
    this.grid = gridController;
    this.isDirty = false;
    this.sourceFileName = "BangTinh";
    this.shell = null;
  }

  /** Gắn tham chiếu AppShell — xem chú thích trong WriterAdapter.setShell(). */
  setShell(shell) {
    this.shell = shell;
  }

  attach() {
    globalUnoBridge.attachDocument(this);
    // common.edit.undo/redo dùng chung 1 handler toàn Suite qua Command Bus — mỗi app
    // (Writer/Sheet/Slides) PHẢI tự bindHandler() lại khi active, nếu không app kích hoạt
    // trước (mặc định Writer) sẽ chiếm vĩnh viễn phím Ctrl+Z/Ctrl+Y cho mọi app khác.
    globalCommandBus.bindHandler("common.file.new", () => this.newDocument());
    globalCommandBus.bindHandler("common.file.close", () => this.closeDocument());
    globalCommandBus.bindHandler("common.edit.undo", () => this.grid.undo ? this.grid.undo() : false);
    globalCommandBus.bindHandler("common.edit.redo", () => this.grid.redo ? this.grid.redo() : false);
    globalCommandBus.bindHandler("common.edit.selectAll", () => this.grid.selectAll ? this.grid.selectAll() : false);
    globalCommandBus.bindHandler("common.edit.pastePlain", () => this._pasteIntoSelectedCell());
    globalCommandBus.bindHandler("sheet.format.conditional", () => this.grid.showConditionalFormattingDialog());
    globalCommandBus.bindHandler("sheet.data.validation", () => this.grid.showDataValidationDialog());
    globalCommandBus.bindHandler("sheet.data.pivotTable", () => this.grid.showPivotTableDialog());
    globalCommandBus.bindHandler("sheet.data.pivotRefresh", () => this.grid.refreshPivotTable());
    globalCommandBus.bindHandler("sheet.formula.nameManager", (args) => {
      args = args || {};
      return this.grid.showNameManager(args);
    });
    globalCommandBus.bindHandler("sheet.formula.arrayEnter", (options) => {
      options = options || {};
      return this.grid.enterArrayFormula(options);
    });
    globalCommandBus.bindHandler("sheet.review.commentInsert", (args) => {
      args = args || {};
      return this.grid.showCommentDialog(args);
    });
    globalCommandBus.bindHandler("sheet.view.zoomIn", (options) => {
      options = options || {};
      return this.grid.zoomIn();
    });
    globalCommandBus.bindHandler("sheet.view.zoomOut", (options) => {
      options = options || {};
      return this.grid.zoomOut();
    });
    globalCommandBus.bindHandler("sheet.view.zoomReset", (options) => {
      options = options || {};
      return this.grid.zoomReset();
    });
    globalCommandBus.bindHandler("sheet.view.gridlines", (options) => {
      options = options || {};
      return this.grid.toggleGridlines();
    });
    globalCommandBus.bindHandler("sheet.view.headings", (options) => {
      options = options || {};
      return this.grid.toggleHeadings();
    });
    globalCommandBus.bindHandler("sheet.page.setPrintArea", (args) => {
      args = args || {};
      return this.grid.setPrintArea(args);
    });
    globalCommandBus.bindHandler("sheet.page.clearPrintArea", (args) => {
      args = args || {};
      return this.grid.clearPrintArea(args);
    });
    globalCommandBus.bindHandler("sheet.page.insertPageBreak", (args) => {
      args = args || {};
      return this.grid.insertPageBreak(args);
    });
    globalCommandBus.bindHandler("sheet.page.removePageBreak", (args) => {
      args = args || {};
      return this.grid.removePageBreak(args);
    });
    globalCommandBus.bindHandler("sheet.row.insert", (options) => {
      options = options || {};
      return this.grid.insertRow(options.atRow);
    });
    globalCommandBus.bindHandler("sheet.col.insert", (options) => {
      options = options || {};
      return this.grid.insertColumn(options.atCol);
    });
  }

  _insertImageDialog(options) {
    options = options || {};
    if (typeof document === "undefined" || typeof FileReader === "undefined") return Promise.resolve(false);
    return new Promise(resolve => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = event => resolve(!!this.grid.insertImage?.(event.target.result, options.anchor));
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve(false);
      input.click();
    });
  }

  /**
   * Chuyển đổi dữ liệu bảng tính hiện tại thành chuỗi CSV (RFC 4180).
   * Giữ nguyên công thức bắt đầu bằng '=' để LibreOffice Calc xử lý chuẩn xác.
   */
  serializeToCsv() {
    if (!this.grid || !this.grid.cellsData) return "";

    const cols = this.grid.cols || ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    let maxRow = 1;
    let maxColIdx = 0;

    for (const [key, item] of this.grid.cellsData.entries()) {
      if ((item.val !== undefined && item.val !== "") || item.formula) {
        const match = key.match(/^([A-Z]+)(\d+)$/);
        if (match) {
          const colLetter = match[1];
          const rowNum = parseInt(match[2], 10);
          const cIdx = cols.indexOf(colLetter);
          if (cIdx !== -1 && cIdx > maxColIdx) maxColIdx = cIdx;
          if (rowNum > maxRow) maxRow = rowNum;
        }
      }
    }

    const rows = [];
    for (let r = 1; r <= maxRow; r++) {
      const rowCells = [];
      for (let c = 0; c <= maxColIdx; c++) {
        const colLetter = cols[c];
        const key = `${colLetter}${r}`;
        const item = this.grid.cellsData.get(key);
        let cellText = "";
        if (item) {
          if (item.formula && typeof item.formula === "string" && item.formula.startsWith("=")) {
            cellText = item.formula;
          } else if (item.val !== undefined && item.val !== null) {
            cellText = String(item.val);
          }
        }
        if (cellText.includes('"') || cellText.includes(',') || cellText.includes('\n') || cellText.includes('\r')) {
          cellText = `"${cellText.replace(/"/g, '""')}"`;
        }
        rowCells.push(cellText);
      }
      rows.push(rowCells.join(","));
    }

    return rows.join("\r\n");
  }

  /**
   * Phân tích chuỗi CSV theo chuẩn RFC 4180 thành mảng 2 chiều.
   */
  parseCsv(text) {
    if (!text) return [];
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(current);
          current = "";
        } else if (ch === '\r' && next === '\n') {
          row.push(current);
          rows.push(row);
          row = [];
          current = "";
          i++;
        } else if (ch === '\n' || ch === '\r') {
          row.push(current);
          rows.push(row);
          row = [];
          current = "";
        } else {
          current += ch;
        }
      }
    }
    if (current || row.length > 0) {
      row.push(current);
      rows.push(row);
    }
    return rows;
  }

  /**
   * Nạp dữ liệu từ chuỗi CSV vào bảng tính hiện tại.
   */
  loadFromCsv(csvText) {
    if (!this.grid) return;
    const rows = this.parseCsv(csvText);
    const cols = this.grid.cols || ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

    if (this.grid.cellsData) {
      this.grid.cellsData.clear();
    }
    if (this.grid.container && typeof this.grid.container.querySelectorAll === "function") {
      const cells = this.grid.container.querySelectorAll(".vno-grid-cell");
      if (cells) {
        cells.forEach((td) => {
          td.textContent = "";
        });
      }
    }

    for (let r = 0; r < rows.length; r++) {
      const rowCells = rows[r];
      const rowNum = r + 1;
      if (this.grid.rowCount && rowNum > this.grid.rowCount) break;

      for (let c = 0; c < rowCells.length; c++) {
        if (c >= cols.length) break;
        const colLetter = cols[c];
        const val = rowCells[c];
        if (val !== undefined && val !== "") {
          this.grid.setCellValue(colLetter, rowNum, val, false);
        }
      }
    }

    if (typeof this.grid.selectCell === "function") {
      this.grid.selectCell("A", 1);
    }
    if (typeof this.grid.updateStatus === "function") {
      this.grid.updateStatus();
    }
  }

  /**
   * Tạo tài liệu bảng tính mới trắng hoặc đóng bảng tính hiện tại.
   */
  async newDocument() {
    if (this.grid && typeof this.grid.resetToBlank === "function") {
      this.grid.resetToBlank();
    }
    this.sourceFileName = "BangTinh";
    this.isDirty = false;
    this.shell?.resetDocumentChrome?.("Bảng tính 1.xlsx");
    return true;
  }

  async closeDocument() {
    return await this.newDocument();
  }

  /**
   * Lưu bảng tính thành tệp XLSX thật trên đĩa (qua LibreOffice headless engine).
   */
  async save() {
    const csvContent = this.serializeToCsv();
    const result = await globalUnoBridge.saveRealFile("sheet", csvContent, "xlsx", this.sourceFileName);
    if (result.status === "ok") {
      this.isDirty = false;
      await showAlertDialog({ title: "Đã lưu", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể lưu", message: result.message, type: "error" });
    return false;
  }

  async saveAs() {
    return await this.save();
  }

  /**
   * Mở một tệp XLSX/ODS/CSV thật từ đĩa, nạp dữ liệu vào bảng tính.
   */
  async open() {
    const result = await globalUnoBridge.openRealFile("sheet");
    if (result.status === "ok") {
      this.loadFromCsv(result.content);
      this.sourceFileName = (result.fileName || "BangTinh").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể mở tệp", message: result.message, type: "error" });
    return false;
  }

  async exportPdf() {
    const csvContent = this.serializeToCsv();
    const result = await globalUnoBridge.exportRealPdf("sheet", csvContent, this.sourceFileName);
    if (result.status === "ok") {
      await showAlertDialog({ title: "Đã xuất PDF", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể xuất PDF", message: result.message, type: "error" });
    return false;
  }

  print() {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
    return true;
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.grid) return false;

    switch (vnCmdId) {
      case "sheet.cell.edit":
        this.grid.focusFormulaInput();
        return true;

      case "sheet.cell.bold":
        return this.grid.toggleStyle("fontWeight", "bold", "normal");

      case "sheet.cell.italic":
        return this.grid.toggleStyle("fontStyle", "italic", "normal");

      case "sheet.cell.underline":
        return this.grid.toggleStyle("textDecoration", "underline", "none");

      case "sheet.cell.alignLeft":
        return this.grid.setStyle("textAlign", "left");

      case "sheet.cell.alignCenter":
        return this.grid.setStyle("textAlign", "center");

      case "sheet.cell.alignRight":
        return this.grid.setStyle("textAlign", "right");

      case "sheet.cell.merge":
        return this.grid.toggleStyle("backgroundColor", "#e2e8f0", "transparent");

      case "sheet.cell.borders":
        return this.grid.setStyle("border", "2px solid #0f172a");

      case "sheet.cell.fillColor": {
        const color = (typeof args === "string" && args) ? args : (args?.color || "#FFF200");
        return this.grid.setStyle("backgroundColor", color);
      }

      case "sheet.cell.textColor": {
        const color = (typeof args === "string" && args) ? args : (args?.color || "#DC2626");
        return this.grid.setStyle("color", color);
      }

      case "sheet.format.currencyVND":
        return this.grid.formatCurrentCellCurrencyVND();

      case "sheet.format.percent":
        return this.grid.formatCurrentCellPercent();

      case "sheet.format.standard":
        return this.grid.formatCurrentCellStandard();

      case "sheet.insert.date":
        return this.grid.insertCurrentDate();

      case "sheet.row.insert":
        return this.grid.insertRow(args?.atRow);

      case "sheet.col.insert":
        return this.grid.insertColumn(args?.atCol);

      case "sheet.formula.sum":
        return this.grid.insertFormula("SUM");

      case "sheet.formula.average":
        return this.grid.insertFormula("AVERAGE");

      case "sheet.formula.nameManager":
        return this.grid.showNameManager(args || {});

      case "sheet.formula.arrayEnter":
        return this.grid.enterArrayFormula(args || {});

      case "sheet.format.conditional":
        return this.grid.showConditionalFormattingDialog();

      case "sheet.data.validation":
        return this.grid.showDataValidationDialog();

      case "sheet.data.pivotTable":
        return this.grid.showPivotTableDialog();

      case "sheet.data.pivotRefresh":
        return this.grid.refreshPivotTable();

      case "sheet.chart.insert":
        this.grid.openChartBuilder();
        return true;

      case "sheet.insert.image":
        return await this._insertImageDialog(args || {});

      case "sheet.view.freezePanes":
        return this.grid.toggleFreezePanes ? this.grid.toggleFreezePanes() : false;

      case "sheet.view.zoomIn":
        return this.grid.zoomIn ? this.grid.zoomIn() : false;

      case "sheet.view.zoomOut":
        return this.grid.zoomOut ? this.grid.zoomOut() : false;

      case "sheet.view.zoomReset":
        return this.grid.zoomReset ? this.grid.zoomReset() : false;

      case "sheet.view.gridlines":
        return this.grid.toggleGridlines ? this.grid.toggleGridlines() : false;

      case "sheet.view.headings":
        return this.grid.toggleHeadings ? this.grid.toggleHeadings() : false;

      case "sheet.review.commentInsert":
        return this.grid.showCommentDialog ? this.grid.showCommentDialog(args || {}) : false;

      case "sheet.page.setPrintArea":
        return this.grid.setPrintArea ? this.grid.setPrintArea(args || {}) : false;

      case "sheet.page.clearPrintArea":
        return this.grid.clearPrintArea ? this.grid.clearPrintArea(args || {}) : false;

      case "sheet.page.insertPageBreak":
        return this.grid.insertPageBreak ? this.grid.insertPageBreak(args || {}) : false;

      case "sheet.page.removePageBreak":
        return this.grid.removePageBreak ? this.grid.removePageBreak(args || {}) : false;

      case "sheet.data.sortAsc":
        return this.grid.sort ? this.grid.sort(this.grid.selectedCoord?.c || "A", true) : false;

      case "sheet.data.sortDesc":
        return this.grid.sort ? this.grid.sort(this.grid.selectedCoord?.c || "A", false) : false;

      case "sheet.data.filter":
        return this.grid.toggleFilter ? this.grid.toggleFilter() : false;

      case "common.edit.cut":
        return await this._copySelectedCell(true);

      case "common.edit.copy":
        return await this._copySelectedCell(false);

      case "common.edit.paste":
        return await this._pasteIntoSelectedCell();

      case "common.edit.pastePlain":
        return await this._pasteIntoSelectedCell();

      case "common.edit.selectAll":
        return this.grid.selectAll ? this.grid.selectAll() : false;

      case "common.edit.undo":
        return this.grid.undo ? this.grid.undo() : false;

      case "common.edit.redo":
        return this.grid.redo ? this.grid.redo() : false;

      case "common.file.new":
        return await this.newDocument();

      case "common.file.close":
        return await this.closeDocument();

      case "common.file.save":
        return await this.save();

      case "common.file.saveAs":
        return await this.saveAs();

      case "common.file.open":
        return await this.open();

      case "common.file.exportPdf":
        return await this.exportPdf();

      case "common.file.print":
        return this.print();

      default:
        return false;
    }
  }

  /**
   * Mở hộp chọn màu THẬT của hệ điều hành (input type=color chuẩn, không giả)
   * rồi áp dụng màu đã chọn vào ô đang chọn qua grid.setStyle().
   * @param {string} cssProp "backgroundColor" hoặc "color"
   * @param {string} defaultColor
   */
  _pickAndApplyColor(cssProp, defaultColor) {
    if (typeof document === "undefined") return false;
    const input = document.createElement("input");
    input.type = "color";
    input.value = defaultColor;
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    document.body.appendChild(input);

    return new Promise((resolve) => {
      let applied = false;
      input.addEventListener("input", () => {
        applied = true;
        this.grid.setStyle(cssProp, input.value);
      });
      input.addEventListener("change", () => {
        document.body.removeChild(input);
        resolve(applied);
      });
      input.click();
    });
  }

  /**
   * Sao chép giá trị ô đang chọn thật vào Clipboard (Clipboard API), có thể dán
   * ra ngoài ứng dụng khác — không phải execCommand giả trên vùng chọn DOM
   * (không đáng tin cậy trong lưới ô bảng tính).
   * @param {boolean} isCut nếu true, xóa nội dung ô sau khi sao chép
   */
  async _copySelectedCell(isCut) {
    const coord = this.grid.selectedCoord;
    if (!coord) return false;
    const key = `${coord.c}${coord.r}`;
    const item = this.grid.cellsData?.get(key);
    const text = item ? (item.formula || item.val || "") : "";

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
      }
    } catch {
      // Một số môi trường (vd. test headless) chặn Clipboard API — không coi là lỗi nghiêm trọng
    }

    if (isCut && this.grid.setCellValue) {
      this.grid.setCellValue(coord.c, coord.r, "");
    }
    return true;
  }

  /**
   * Dán nội dung Clipboard thật vào ô đang chọn.
   */
  async _pasteIntoSelectedCell() {
    const coord = this.grid.selectedCoord;
    if (!coord || !this.grid.setCellValue) return false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        this.grid.setCellValue(coord.c, coord.r, text);
        return true;
      }
    } catch {
      // Trình duyệt có thể chặn đọc Clipboard nếu chưa có quyền/tương tác người dùng
    }
    return false;
  }
}
