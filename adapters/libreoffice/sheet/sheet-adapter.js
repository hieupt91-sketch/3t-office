/**
 * VN Office LibreOffice Adapter — VN Sheet Adapter
 * Quản lý tương tác với StarCalc (sc) Document Model & Formula Matrix
 */

import { globalUnoBridge } from "../common/uno-bridge.js";

export class SheetAdapter {
  constructor(gridController) {
    this.grid = gridController;
    this.selectedCell = { row: 0, col: 0 };
    this.isDirty = false;
  }

  attach() {
    globalUnoBridge.attachDocument(this);
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.grid) return false;

    switch (vnCmdId) {
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

      case "sheet.format.currencyVND":
        return this.grid.formatCurrentCellCurrencyVND();

      case "sheet.formula.sum":
        return this.grid.insertFormula("SUM");

      case "sheet.formula.average":
        return this.grid.insertFormula("AVERAGE");

      case "common.file.save":
        this.isDirty = false;
        console.log("[SheetAdapter] Đã lưu bảng tính ODS/XLSX.");
        return true;

      default:
        console.log(`[SheetAdapter] Đã điều hướng lệnh: ${vnCmdId} (${unoUrl})`);
        return true;
    }
  }
}
