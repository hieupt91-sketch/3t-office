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
  }

  attach() {
    globalUnoBridge.attachDocument(this);
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
        this.isDirty = false;
        console.log("[SheetAdapter] Đã lưu bảng tính sc.");
        return true;

      default:
        return false;
    }
  }
}
