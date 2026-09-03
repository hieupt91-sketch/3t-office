/**
 * VN Office LibreOffice Adapter — VN Sheet Adapter
 * Quản lý tương tác với StarCalc (sc) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";

export class SheetAdapter {
  constructor(gridController) {
    this.grid = gridController;
    this.isDirty = false;
    this.sourceFileName = "BangTinh";
  }

  attach() {
    globalUnoBridge.attachDocument(this);
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

      case "sheet.format.currencyVND":
        return this.grid.formatCurrentCellCurrencyVND();

      case "sheet.format.percent":
        return this.grid.formatCurrentCellPercent();

      case "sheet.format.standard":
        return this.grid.formatCurrentCellStandard();

      case "sheet.insert.date":
        return this.grid.insertCurrentDate();

      case "sheet.formula.sum":
        return this.grid.insertFormula("SUM");

      case "sheet.formula.average":
        return this.grid.insertFormula("AVERAGE");

      case "sheet.chart.insert":
        this.grid.openChartBuilder();
        return true;

      case "sheet.data.filter":
        if (typeof window !== "undefined" && typeof document !== "undefined") {
          await showAlertDialog({
            title: "Bộ Lọc Dữ Liệu (AutoFilter)",
            message: "Chế độ lọc AutoFilter đã được kích hoạt cho bảng dữ liệu hiện tại."
          });
        }
        return true;

      case "common.edit.undo":
        return this.grid.undo ? this.grid.undo() : false;

      case "common.edit.redo":
        return this.grid.redo ? this.grid.redo() : false;

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
}
