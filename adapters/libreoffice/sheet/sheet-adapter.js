/**
 * VN Office LibreOffice Adapter — VN Sheet Adapter
 * Quản lý tương tác với StarCalc (sc) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog, showPromptDialog, showFindReplaceDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { globalShortcutManager } from "../../../platform/commands/shortcut-manager.js";
import { getVnCommand } from "../common/command-dispatch-mapper.js";
import { SheetChartBuilder } from "../../../apps/sheet/sheet-chart.js";
import { overlayFodsStructureProtection } from "./xlsx-workbook-protection.js";
import { overlayActiveSheetToFods } from "./xlsx-active-sheet.js";

export function numberFormatFromExcelCode(code) {
  const source = String(code ?? "").trim();
  if (!source || /^general$/i.test(source)) return { category: "general" };
  if (source === "@") return { category: "text" };
  const first = source.split(";")[0];
  const visible = first.replace(/"[^"]*"|\\.|\[[^\]]*\]|_[^ ]|\*./g, "");
  const decimals = (visible.match(/\.([0#?]+)/)?.[1] || "").length;
  const negative = source.split(";")[1] || "";
  const negativeStyle = /\([^)]*[0#?]/.test(negative) ? (/\[red\]/i.test(negative) ? 3 : 2) : (/\[red\]/i.test(negative) ? 1 : 0);
  const useThousands = /#,##|0,000/.test(visible);
  if (/%/.test(visible)) return { category: "percentage", decimals };
  const currency = source.match(/\[\$([^\]-]+)(?:-[^\]]+)?\]/)?.[1]
    || source.match(/"([$€£¥₫])"/)?.[1]
    || source.match(/[$€£¥₫]/)?.[0]
    || (/\bVND\b/i.test(source) ? "₫" : "");
  if (currency) {
    const accounting = /_[([]|\*\s|_\)/.test(source);
    return { category: accounting ? "accounting" : "currency", decimals, useThousands, currencySymbol: currency, negativeStyle };
  }
  const dateCode = visible.replace(/AM\/PM/ig, "").toLowerCase();
  if (/[dmy]/.test(dateCode) || /h+\s*:|\[h\]/i.test(source)) {
    return { category: "date", dateFormat: source.replace(/\[[^\]]*\]/g, "").replace(/"([^"]*)"/g, "$1") };
  }
  if (/e[+-]0/i.test(visible)) return { category: "scientific", decimals };
  if (/[/][?#0]/.test(visible)) return { category: "custom", code: source, customPattern: source };
  if (/[#0?]/.test(visible)) return { category: "number", decimals, useThousands, negativeStyle };
  return { category: "custom", code: source, customPattern: source };
}

export class SheetAdapter {
  constructor(gridController) {
    this.grid = gridController;
    this.isDirty = false;
    this.sourceFileName = "BangTinh";
    this.shell = null;
  }

  /**
   * Grid-model signal for the native XLSX post-process (lockStructure).
   * serializeToFods() already writes table:structure-protected from this flag.
   * Production File → Lưu patches xl/workbook.xml in main.py after soffice;
   * tests call postProcessSheetXlsx() with this adapter or the grid.
   */
  wantsNativeXlsxWorkbookProtection() {
    return !!this.grid?.workbookProtection?.enabled;
  }

  /**
   * Grid-model Protect Workbook flag after File → Mở / loadFromFods.
   * Tests assert this is true when the original XLSX has lockStructure.
   */
  get workbookProtection() {
    return this.grid?.workbookProtection || { enabled: false, password: "" };
  }

  /** Gắn tham chiếu AppShell — xem chú thích trong WriterAdapter.setShell(). */
  setShell(shell) {
    this.shell = shell;
    if (shell) {
      shell.adapter = this;
      if (this.grid) shell.grid = this.grid;
    }
  }

  _bindFormatPainterRibbon() {
    if (this._formatPainterRibbonBound) return;
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    this._formatPainterRibbonBound = true;
    document.addEventListener("dblclick", (event) => {
      const btn = event.target?.closest?.('[data-command-id="sheet.edit.formatPainter"]');
      if (!btn) return;
      event.preventDefault();
      this.grid?.toggleFormatPainter?.({ locked: true });
    }, true);
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
    globalCommandBus.bindHandler("common.edit.repeat", () => this.grid.redo ? this.grid.redo() : false);
    globalCommandBus.bindHandler("common.edit.copy", () => this._copySelectedCell(false));
    globalCommandBus.bindHandler("common.edit.cut", () => this._copySelectedCell(true));
    globalCommandBus.bindHandler("common.edit.paste", () => this._pasteIntoSelectedCell());
    globalCommandBus.bindHandler("common.edit.pastePlain", () => this._pasteIntoSelectedCell());
    globalCommandBus.bindHandler("sheet.edit.pasteSpecial", () => this.grid.showPasteSpecialDialog?.(this._clipboardModel));
    globalCommandBus.bindHandler("sheet.edit.formatPainter", (args) => this.grid.toggleFormatPainter?.(args || {}));
    this._bindFormatPainterRibbon();
    globalCommandBus.bindHandler("common.edit.selectAll", () => this.grid.selectAll ? this.grid.selectAll() : false);
    globalCommandBus.bindHandler("sheet.select.column", () => this.grid.selectCurrentColumn ? this.grid.selectCurrentColumn() : false);
    globalCommandBus.bindHandler("sheet.select.row", () => this.grid.selectCurrentRow ? this.grid.selectCurrentRow() : false);
    globalCommandBus.bindHandler("sheet.insert.time", () => this.grid.insertCurrentTime ? this.grid.insertCurrentTime() : false);
    globalCommandBus.bindHandler("sheet.formula.recalculate", () => this.grid.recalculateAll ? this.grid.recalculateAll() : false);
    globalCommandBus.bindHandler("sheet.view.toggleFormulas", () => this.grid.toggleShowFormulas ? this.grid.toggleShowFormulas() : false);
    globalCommandBus.bindHandler("sheet.format.cellsDialog", () => this.grid.showFormatCellsDialog());
    globalCommandBus.bindHandler("sheet.format.alignmentDialog", () => this.grid.showFormatCellsDialog("alignment"));
    globalCommandBus.bindHandler("sheet.format.currencyVND", () => this.grid.formatCurrentCellCurrencyVND());
    globalCommandBus.bindHandler("sheet.format.percent", () => this.grid.formatCurrentCellPercent());
    globalCommandBus.bindHandler("sheet.format.standard", () => this.grid.formatCurrentCellStandard());
    globalCommandBus.bindHandler("sheet.font.family", (value) => this.grid.setFontFamily(value));
    globalCommandBus.bindHandler("sheet.font.size", (value) => this.grid.setFontSize(value));
    globalCommandBus.bindHandler("sheet.font.grow", () => this.grid.adjustFontSize(1));
    globalCommandBus.bindHandler("sheet.font.shrink", () => this.grid.adjustFontSize(-1));
    globalCommandBus.bindHandler("sheet.cell.alignTop", () => this.grid.setStyle("verticalAlign", "top"));
    globalCommandBus.bindHandler("sheet.cell.alignMiddle", () => this.grid.setStyle("verticalAlign", "middle"));
    globalCommandBus.bindHandler("sheet.cell.alignBottom", () => this.grid.setStyle("verticalAlign", "bottom"));
    globalCommandBus.bindHandler("sheet.cell.wrapText", () => this.grid.toggleWrapText());
    globalCommandBus.bindHandler("sheet.cell.orientation", (value) => this.grid.setCellOrientation(value));
    globalCommandBus.bindHandler("sheet.cell.indentIncrease", () => this.grid.adjustIndent(1));
    globalCommandBus.bindHandler("sheet.cell.indentDecrease", () => this.grid.adjustIndent(-1));
    globalCommandBus.bindHandler("sheet.cell.mergeCenter", () => this.grid.mergeCells("mergeCenter"));
    globalCommandBus.bindHandler("sheet.cell.mergeAcross", () => this.grid.mergeCells("mergeAcross"));
    globalCommandBus.bindHandler("sheet.cell.mergeCells", () => this.grid.mergeCells("mergeCells"));
    globalCommandBus.bindHandler("sheet.cell.unmerge", () => this.grid.unmergeCells());
    globalCommandBus.bindHandler("sheet.format.quickCategory", (value) => this.grid.applyQuickNumberCategory(value));
    globalCommandBus.bindHandler("sheet.format.increaseDecimal", () => this.grid.adjustDecimalPlaces(1));
    globalCommandBus.bindHandler("sheet.format.decreaseDecimal", () => this.grid.adjustDecimalPlaces(-1));
    globalCommandBus.bindHandler("sheet.format.conditional", () => this.grid.showConditionalFormattingDialog());
    globalCommandBus.bindHandler("sheet.data.validation", () => this.grid.showDataValidationDialog());
    globalCommandBus.bindHandler("sheet.data.textToColumns", () => this.grid.showTextToColumnsDialog());
    globalCommandBus.bindHandler("sheet.data.flashFill", () => this.grid.runFlashFill());
    globalCommandBus.bindHandler("sheet.data.removeDuplicates", () => this.grid.showRemoveDuplicatesDialog());
    globalCommandBus.bindHandler("sheet.data.consolidate", () => this.grid.showConsolidateDialog());
    globalCommandBus.bindHandler("sheet.data.group", () => this.grid.groupSelection());
    globalCommandBus.bindHandler("sheet.data.ungroup", () => this.grid.ungroupSelection());
    globalCommandBus.bindHandler("sheet.data.subtotal", () => this.grid.showSubtotalDialog());
    globalCommandBus.bindHandler("sheet.data.goalSeek", () => this.grid.showGoalSeekDialog());
    globalCommandBus.bindHandler("sheet.data.dataTable", () => this.grid.showDataTableDialog());
    globalCommandBus.bindHandler("sheet.data.scenarioManager", () => this.grid.showScenarioManagerDialog());
    globalCommandBus.bindHandler("sheet.data.pivotTable", () => this.grid.showPivotTableDialog());
    globalCommandBus.bindHandler("sheet.data.pivotRefresh", () => this.grid.refreshPivotTable());
    globalCommandBus.bindHandler("sheet.chart.pivotChart", () => this.grid.openPivotChartBuilder());
    globalCommandBus.bindHandler("sheet.formula.nameManager", (args) => {
      args = args || {};
      return this.grid.showNameManager(args);
    });
    globalCommandBus.bindHandler("sheet.formula.insertFunction", (category) => this.grid.showFunctionDialog ? this.grid.showFunctionDialog(category) : false);
    globalCommandBus.bindHandler("sheet.formula.sum", () => this.grid.insertFormula ? this.grid.insertFormula("SUM") : false);
    globalCommandBus.bindHandler("sheet.formula.average", () => this.grid.insertFormula ? this.grid.insertFormula("AVERAGE") : false);
    globalCommandBus.bindHandler("sheet.formula.countNumbers", () => this.grid.insertFormula ? this.grid.insertFormula("COUNT") : false);
    globalCommandBus.bindHandler("sheet.formula.max", () => this.grid.insertFormula ? this.grid.insertFormula("MAX") : false);
    globalCommandBus.bindHandler("sheet.formula.min", () => this.grid.insertFormula ? this.grid.insertFormula("MIN") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryFinancial", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Tài chính") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryLogical", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Logic") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryText", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Văn bản") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryDateTime", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Ngày tháng") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryLookup", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Tra cứu") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryMath", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Toán học") : false);
    globalCommandBus.bindHandler("sheet.formula.categoryMore", () => this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Thống kê") : false);
    globalCommandBus.bindHandler("sheet.formula.defineName", () => this.grid.showDefineNameDialog ? this.grid.showDefineNameDialog() : false);
    globalCommandBus.bindHandler("sheet.formula.useInFormula", () => this.grid.showUseInFormulaDialog ? this.grid.showUseInFormulaDialog() : false);
    globalCommandBus.bindHandler("sheet.formula.createFromSelection", () => this.grid.createNamesFromSelection ? this.grid.createNamesFromSelection() : false);
    globalCommandBus.bindHandler("sheet.formula.tracePrecedents", () => this.grid.tracePrecedents ? this.grid.tracePrecedents() : false);
    globalCommandBus.bindHandler("sheet.formula.traceDependents", () => this.grid.traceDependents ? this.grid.traceDependents() : false);
    globalCommandBus.bindHandler("sheet.formula.removeArrows", () => this.grid.removeArrows ? this.grid.removeArrows() : false);
    globalCommandBus.bindHandler("sheet.formula.showFormulas", () => this.grid.toggleShowFormulas ? this.grid.toggleShowFormulas() : false);
    globalCommandBus.bindHandler("sheet.formula.errorChecking", () => this.grid.showErrorCheckingDialog ? this.grid.showErrorCheckingDialog() : false);
    globalCommandBus.bindHandler("sheet.formula.watchWindow", () => this.grid.showWatchWindow ? this.grid.showWatchWindow() : false);
    globalCommandBus.bindHandler("sheet.formula.evaluateFormula", () => this.grid.showEvaluateFormulaDialog ? this.grid.showEvaluateFormulaDialog() : false);
    globalCommandBus.bindHandler("sheet.calc.calculationOptions", (args) => this.grid.setCalculationMode ? this.grid.setCalculationMode(args) : false);
    globalCommandBus.bindHandler("sheet.calc.modeAutomatic", () => this.grid.setCalculationMode ? this.grid.setCalculationMode("automatic") : false);
    globalCommandBus.bindHandler("sheet.calc.modeManual", () => this.grid.setCalculationMode ? this.grid.setCalculationMode("manual") : false);
    globalCommandBus.bindHandler("sheet.calc.calculateSheet", () => this.grid.calculateSheet ? this.grid.calculateSheet() : false);
    globalCommandBus.bindHandler("sheet.formula.arrayEnter", (options) => {
      options = options || {};
      return this.grid.enterArrayFormula(options);
    });
    globalCommandBus.bindHandler("sheet.review.spellCheck", (args) => {
      args = args || {};
      return this.grid.showSpellcheckDialog(args);
    });
    globalShortcutManager.bind("F7", "sheet.review.spellCheck", "sheet");
    globalShortcutManager.bind("F1", "sheet.help.open", "sheet");
    globalCommandBus.bindHandler("sheet.review.commentInsert", (args) => {
      args = args || {};
      return this.grid.showCommentDialog(args);
    });
    globalCommandBus.bindHandler("sheet.review.commentPrevious", () => this.grid.previousComment?.());
    globalCommandBus.bindHandler("sheet.review.commentNext", () => this.grid.nextComment?.());
    globalCommandBus.bindHandler("sheet.review.commentDelete", () => this.grid.deleteCurrentComment?.());
    globalCommandBus.bindHandler("sheet.review.commentResolve", () => this.grid.toggleCurrentCommentResolved?.());
    globalCommandBus.bindHandler("sheet.file.printPreview", () => Boolean(this.grid.openPrintPreview ? this.grid.openPrintPreview() : false));
    globalCommandBus.bindHandler("sheet.view.normal", () => this.grid.setWorkbookView ? this.grid.setWorkbookView("normal") : false);
    globalCommandBus.bindHandler("sheet.view.pageBreakPreview", () => this.grid.setWorkbookView ? this.grid.setWorkbookView("pageBreakPreview") : false);
    globalCommandBus.bindHandler("sheet.view.pageLayout", () => this.grid.setWorkbookView ? this.grid.setWorkbookView("pageLayout") : false);
    globalCommandBus.bindHandler("sheet.view.formulaBar", () => this.grid.toggleFormulaBar ? this.grid.toggleFormulaBar() : false);
    globalCommandBus.bindHandler("sheet.view.zoomToSelection", () => this.grid.zoomToSelection ? this.grid.zoomToSelection() : false);
    globalCommandBus.bindHandler("sheet.view.newWindow", () => this.grid.newWindow ? this.grid.newWindow() : false);
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
    globalCommandBus.bindHandler("sheet.page.margins", () => this.grid.showPageSetupDialog?.("margins") || false);
    globalCommandBus.bindHandler("sheet.page.orientation", () => this.grid.showPageSetupDialog?.("orientation") || false);
    globalCommandBus.bindHandler("sheet.page.size", () => this.grid.showPageSetupDialog?.("size") || false);
    globalCommandBus.bindHandler("sheet.page.scale", () => this.grid.showPageSetupDialog?.("scale") || false);
    globalCommandBus.bindHandler("sheet.page.headerFooter", () => this.grid.showHeaderFooterDialog?.() || false);
    globalCommandBus.bindHandler("sheet.page.printTitles", () => this.grid.showPageSetupDialog?.("printTitles") || false);
    globalCommandBus.bindHandler("sheet.row.insert", (options) => {
      options = options || {};
      return this.grid.insertRow(options.atRow);
    });
    globalCommandBus.bindHandler("sheet.col.insert", (options) => {
      options = options || {};
      return this.grid.insertColumn(options.atCol);
    });
    globalCommandBus.bindHandler("sheet.row.delete", (options) => {
      options = options || {};
      return this.grid.deleteRow(options.atRow);
    });
    globalCommandBus.bindHandler("sheet.col.delete", (options) => {
      options = options || {};
      return this.grid.deleteColumn(options.atCol);
    });
    globalCommandBus.bindHandler("sheet.row.height", (args) => {
      args = args || {};
      return this.grid.showRowHeightDialog ? this.grid.showRowHeightDialog(args) : false;
    });
    globalCommandBus.bindHandler("sheet.row.autoFit", (args) => {
      args = args || {};
      return this.grid.autoFitSelectedRows ? this.grid.autoFitSelectedRows() : false;
    });
    globalCommandBus.bindHandler("sheet.col.width", (args) => {
      args = args || {};
      return this.grid.showColumnWidthDialog ? this.grid.showColumnWidthDialog(args) : false;
    });
    globalCommandBus.bindHandler("sheet.col.autoFit", (args) => {
      args = args || {};
      return this.grid.autoFitSelectedColumns ? this.grid.autoFitSelectedColumns() : false;
    });
    globalCommandBus.bindHandler("sheet.row.hide", (args) => {
      args = args || {};
      return this.grid.hideRows ? this.grid.hideRows(args.rows) : false;
    });
    globalCommandBus.bindHandler("sheet.row.unhide", (args) => {
      args = args || {};
      return this.grid.unhideRows ? this.grid.unhideRows(args.rows) : false;
    });
    globalCommandBus.bindHandler("sheet.col.hide", (args) => {
      args = args || {};
      return this.grid.hideColumns ? this.grid.hideColumns(args.cols) : false;
    });
    globalCommandBus.bindHandler("sheet.col.unhide", (args) => {
      args = args || {};
      return this.grid.unhideColumns ? this.grid.unhideColumns(args.cols) : false;
    });
    globalCommandBus.bindHandler("sheet.sheet.rename", (args) => {
      args = args || {};
      if (args.newName) return this.grid.renameSheet(args.oldName || this.grid.activeSheet, args.newName);
      return this.grid.showRenameSheetDialog ? this.grid.showRenameSheetDialog(args.sheetName) : false;
    });
    globalCommandBus.bindHandler("sheet.sheet.moveOrCopy", (args) => {
      args = args || {};
      if (args.copy) return this.grid.copySheet(args.sheetName, args.beforeName);
      if (args.move || args.beforeName !== undefined) return this.grid.moveSheet(args.sheetName, args.beforeName);
      return this.grid.showMoveCopySheetDialog ? this.grid.showMoveCopySheetDialog(args.sheetName) : false;
    });
    globalCommandBus.bindHandler("sheet.sheet.protect", (args) => {
      args = args || {};
      if (args.unprotect) return this.grid.unprotectSheet(args);
      if (args.protect || args.password !== undefined && args.dialog === false) return this.grid.protectSheet(args);
      return this.grid.showProtectSheetDialog ? this.grid.showProtectSheetDialog(args.sheetName) : false;
    });
    globalCommandBus.bindHandler("sheet.workbook.protect", (args) => {
      args = args || {};
      if (args.unprotect) return this.grid.unprotectWorkbook(args);
      if (args.protect || args.password !== undefined && args.dialog === false) return this.grid.protectWorkbook(args);
      return this.grid.showProtectWorkbookDialog ? this.grid.showProtectWorkbookDialog() : false;
    });
    globalCommandBus.bindHandler("sheet.style.formatAsTable", () => {
      return this.grid.showFormatAsTableDialog ? this.grid.showFormatAsTableDialog() : false;
    });
    globalCommandBus.bindHandler("sheet.style.cellStyles", () => {
      return this.grid.showCellStylesDialog ? this.grid.showCellStylesDialog() : false;
    });
    globalCommandBus.bindHandler("sheet.edit.fillDown", (options) => {
      options = options || {};
      return this.grid.fillDown ? this.grid.fillDown(options.range) : false;
    });
    globalCommandBus.bindHandler("sheet.edit.fillRight", (options) => {
      options = options || {};
      return this.grid.fillRight ? this.grid.fillRight(options.range) : false;
    });
    globalCommandBus.bindHandler("sheet.edit.clearAll", (options) => {
      options = options || {};
      return this.grid.clearAll ? this.grid.clearAll(options.range) : false;
    });
    globalCommandBus.bindHandler("sheet.edit.clearFormats", (options) => {
      options = options || {};
      return this.grid.clearFormats ? this.grid.clearFormats(options.range) : false;
    });
    globalCommandBus.bindHandler("sheet.edit.clearContents", (options) => {
      options = options || {};
      return this.grid.clearContents ? this.grid.clearContents(options.range) : false;
    });
    globalCommandBus.bindHandler("common.edit.find", () => this._showFindReplaceDialog(false));
    globalCommandBus.bindHandler("common.edit.replace", () => this._showFindReplaceDialog(true));
  }

  _showFindReplaceDialog(isReplace = false) {
    if (!this.grid) return false;
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body?.appendChild) {
      return true;
    }
    try {
      showFindReplaceDialog({
        isReplace: !!isReplace,
        onFind: (text) => this.grid.findNext ? this.grid.findNext(text) : false,
        onReplace: (findText, replaceText) => {
          if (!findText) return false;
          return this.grid.replaceOne ? this.grid.replaceOne(findText, replaceText) : false;
        },
        onReplaceAll: (findText, replaceText) => {
          if (!findText) return 0;
          return this.grid.replaceAll ? this.grid.replaceAll(findText, replaceText) : 0;
        }
      });
    } catch (_) {
      return true;
    }
    return true;
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

  _escapeXml(value) {
    if (value === undefined || value === null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  _unescapeXml(value) {
    if (!value) return "";
    return String(value)
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  // soffice escapes entity-looking text from XLSX once for the spreadsheet
  // value and once again for XML. XML DOM/text stripping removes one layer;
  // this removes the remaining transport layer while preserving user text.
  _decodeImportedCellText(value) {
    const once = this._unescapeXml(value);
    return /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/i.test(once) ? this._unescapeXml(once) : once;
  }

  /** Đọc mọi thuộc tính trong một đoạn mở-thẻ XML (vd 'style:name="ta1" style:master-page-name="X"') thành object, không phụ thuộc thứ tự. */
  _parseTagAttrs(tagInner) {
    const attrs = {};
    String(tagInner || "").replace(/([\w:.-]+)=["']([^"']*)["']/g, (_, key, value) => { attrs[key] = this._unescapeXml(value); return ""; });
    return attrs;
  }

  /** Tìm thẻ mở đầu tiên có tagName khớp và một thuộc tính bằng đúng giá trị cho trước, trả về mọi thuộc tính của thẻ đó. */
  _findTagAttrsByAttr(xml, tagName, attrName, attrValue) {
    if (!attrValue) return null;
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<${escapedTag}\\b([^>]*)>`, "gi");
    let match;
    while ((match = re.exec(xml)) !== null) {
      const attrs = this._parseTagAttrs(match[1]);
      if (attrs[attrName] === attrValue) return attrs;
    }
    return null;
  }

  /** Quy đổi một độ dài ODF (vd "2.5cm", "0.75in", "10pt") về cm - LibreOffice luôn ghi cm trong FODS nhưng file từ nguồn khác có thể dùng đơn vị khác. */
  _odfLengthToCm(raw) {
    const match = String(raw || "").match(/^(-?[\d.]+)\s*(cm|mm|in|pt|px)?$/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value)) return null;
    const factors = { cm: 1, mm: 0.1, in: 2.54, pt: 2.54 / 72, px: 2.54 / 96 };
    const unit = (match[2] || "cm").toLowerCase();
    return Math.round(value * (factors[unit] ?? 1) * 1000) / 1000;
  }

  /**
   * Đọc Page Setup chuẩn ODF thật (style:page-layout-properties) qua chuỗi liên kết
   * table:style-name -> style:style[master-page-name] -> style:master-page[page-layout-name]
   * -> style:page-layout[style:name]. Đây là cách MỌI file ODF/FODS thật (kể cả file do
   * chính LibreOffice/Excel thật tạo ra, không đi qua các thuộc tính vno:* riêng của app)
   * lưu Page Setup - dùng làm fallback khi thuộc tính vno:page-* (chỉ tồn tại khi FODS này
   * do chính VN Office ghi ra và chưa qua bất kỳ vòng chuyển đổi thật nào) không có sẵn.
   */
  _parseStandardOdfPageLayout(xml, tableStyleName) {
    if (!tableStyleName) return null;
    const tableStyleAttrs = this._findTagAttrsByAttr(xml, "style:style", "style:name", tableStyleName);
    const masterPageName = tableStyleAttrs?.["style:master-page-name"];
    if (!masterPageName) return null;
    const masterPageAttrs = this._findTagAttrsByAttr(xml, "style:master-page", "style:name", masterPageName);
    const pageLayoutName = masterPageAttrs?.["style:page-layout-name"];
    if (!pageLayoutName) return null;
    const escapedLayoutName = pageLayoutName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockMatch = xml.match(new RegExp(`<style:page-layout\\b[^>]*style:name=["']${escapedLayoutName}["'][^>]*>([\\s\\S]*?)<\\/style:page-layout>`, "i"));
    if (!blockMatch) return null;
    const propsMatch = blockMatch[1].match(/<style:page-layout-properties\b([^>]*)\/?>/i);
    if (!propsMatch) return null;
    const props = this._parseTagAttrs(propsMatch[1]);

    const orientation = props["style:print-orientation"] === "landscape" ? "landscape" : "portrait";
    const widthCm = this._odfLengthToCm(props["fo:page-width"]);
    const heightCm = this._odfLengthToCm(props["fo:page-height"]);
    let size = "a4";
    if (Number.isFinite(widthCm) && Number.isFinite(heightCm)) {
      const longCm = Math.max(widthCm, heightCm);
      const shortCm = Math.min(widthCm, heightCm);
      const candidates = [
        { key: "a4", w: 21.0, h: 29.7 },
        { key: "letter", w: 21.59, h: 27.94 },
        { key: "legal", w: 21.59, h: 35.56 }
      ];
      let best = null;
      let bestDelta = Infinity;
      for (const candidate of candidates) {
        const delta = Math.abs(shortCm - candidate.w) + Math.abs(longCm - candidate.h);
        if (delta < bestDelta) { bestDelta = delta; best = candidate.key; }
      }
      if (best && bestDelta < 1.5) size = best;
    }

    const printTokens = (props["style:print"] || "").split(/\s+/).filter(Boolean);
    const centering = props["style:table-centering"] || "none";
    const scalePercent = parseInt(props["style:scale-to"], 10);

    return {
      size,
      orientation,
      margins: {
        top: this._odfLengthToCm(props["fo:margin-top"]) ?? 1.91,
        bottom: this._odfLengthToCm(props["fo:margin-bottom"]) ?? 1.91,
        left: this._odfLengthToCm(props["fo:margin-left"]) ?? 1.78,
        right: this._odfLengthToCm(props["fo:margin-right"]) ?? 1.78
      },
      scale: {
        mode: "percent",
        percent: Number.isFinite(scalePercent) && scalePercent > 0 ? scalePercent : 100,
        pagesWide: 1,
        pagesTall: 0
      },
      centerOnPage: {
        horizontal: centering === "horizontal" || centering === "both",
        vertical: centering === "vertical" || centering === "both"
      },
      printOptions: {
        gridlines: printTokens.includes("grid"),
        headings: printTokens.includes("headers")
      }
    };
  }

  /**
   * Đọc Print Titles chuẩn ODF thật (table:named-expression name="_xlnm.Print_Titles")
   * từ file FODS thật. Khi LibreOffice/Excel convert XLSX→FODS, Print Titles được ghi
   * vào <table:named-expression table:name="_xlnm.Print_Titles"> với table:expression
   * chứa tham chiếu ODF dạng: ";[$Sheet1.$1:.$1];[$Sheet1.$A:.$A]" (phan cach boi dau cham phay).
   * Mỗi phan trong dau [ ] la mot vung tham chieu: $Sheet.$Hang:.$Hang (hang) hoac
   * $Sheet.$Cot:.$Cot (cot). Ham nay tra ve { rows: "1" hoac "1:2", cols: "A" hoac "A:B" }
   * hoac null neu khong tim thay.
   */
  _parseStandardPrintTitles(xml, sheetName) {
    if (!sheetName) return null;
    const escapedSheet = sheetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namedExprRegex = new RegExp(
      `<table:named-expression\\b[^>]*table:name=["']_xlnm\\.Print_Titles["'][^>]*>`,
      "gi"
    );
    let namedExprMatch;
    while ((namedExprMatch = namedExprRegex.exec(xml)) !== null) {
      const tagEnd = xml.indexOf("/>", namedExprMatch.index);
      const tagClose = xml.indexOf(">", namedExprMatch.index);
      const tagEndIdx = tagEnd !== -1 && tagEnd < tagClose ? tagEnd : tagClose;
      const tag = xml.substring(namedExprMatch.index, tagEndIdx + 2);
      const baseCellMatch = tag.match(new RegExp(`table:base-cell-address=["']([^"']*)["']`, "i"));
      if (!baseCellMatch) continue;
      const exprMatch = tag.match(/table:expression=["']([^"']*)["']/i);
      if (!exprMatch) continue;
      const expression = exprMatch[1];
      const parts = expression.split(";").filter(Boolean);
      let rows = "";
      let cols = "";
      for (const part of parts) {
        const rangeMatch = part.match(/^\[(?:\$([^.\]]+)\.)?(?:\.)?\$([^:\]]+)(?::(?:\.?\$?(?:\$([^.\]]+)\.)?(?:\.)?)?([^.\]]+))?\]$/);
        if (!rangeMatch) continue;
        const rangeSheet = rangeMatch[1] || sheetName;
        const ref1 = rangeMatch[2];
        const ref2 = rangeMatch[4] || ref1;
        if (rangeSheet !== sheetName) continue;
        if (/^\d+$/.test(ref1)) {
          const start = parseInt(ref1, 10);
          const end = parseInt(ref2, 10);
          rows = start === end ? String(start) : `${Math.min(start, end)}:${Math.max(start, end)}`;
        } else if (/^[A-Z]+$/i.test(ref1)) {
          const start = ref1.toUpperCase();
          const end = ref2.toUpperCase();
          const startNum = this._columnNumber(start);
          const endNum = this._columnNumber(end);
          cols = startNum === endNum ? start : (startNum < endNum ? start : end) + ":" + (startNum < endNum ? end : start);
        }
      }
      if (rows || cols) return { rows, cols };
    }
    return null;
  }

  _columnNumber(columnName) {
    return String(columnName || "").split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
  }

  _odfLengthToCm(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(-?[\d.]+)\s*(cm|mm|in|pt|pc|px)?$/i);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;
    const unit = (match[2] || "cm").toLowerCase();
    const cm = unit === "mm" ? amount * 0.1
      : unit === "in" ? amount * 2.54
      : unit === "pt" ? amount * (2.54 / 72)
      : unit === "pc" ? amount * (2.54 / 6)
      : unit === "px" ? amount * (2.54 / 96)
      : amount;
    return Number(cm.toFixed(4));
  }

  /**
   * Đọc <draw:frame><draw:image> nhúng trực tiếp bên trong một <table:table-cell>
   * (định dạng CHUẨN ODF thật do soffice ghi khi convert XLSX→FODS: ảnh được neo
   * vào ô bằng cách làm con của chính <table:table-cell> đó, KHÔNG dùng thuộc tính
   * neo riêng). Trả về { id, src, widthCm, heightCm, offsetXCm, offsetYCm } hoặc null nếu ô không có ảnh.
   * cellXml: toàn bộ nội dung bên trong thẻ <table:table-cell>...</table:table-cell>.
   */
  _parseCellEmbeddedImage(cellXml, fallbackId) {
    const frameMatch = String(cellXml || "").match(/<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/i);
    if (!frameMatch) return null;
    const frameAttrs = frameMatch[1];
    const frameBody = frameMatch[2];
    const imageMatch = frameBody.match(/<draw:image\b([^>]*)>([\s\S]*?)<\/draw:image>/i);
    if (!imageMatch) return null;
    const binaryMatch = imageMatch[2].match(/<office:binary-data\b[^>]*>([\s\S]*?)<\/office:binary-data>/i);
    const base64 = binaryMatch ? binaryMatch[1].replace(/\s+/g, "") : "";
    if (!base64) return null;
    const mime = (imageMatch[1].match(/draw:mime-type=["']([^"']*)["']/i)?.[1] || "image/png").toLowerCase();
    const widthRaw = frameAttrs.match(/svg:width=["']([^"']*)["']/i)?.[1];
    const heightRaw = frameAttrs.match(/svg:height=["']([^"']*)["']/i)?.[1];
    const xRaw = frameAttrs.match(/svg:x=["']([^"']*)["']/i)?.[1];
    const yRaw = frameAttrs.match(/svg:y=["']([^"']*)["']/i)?.[1];

    const widthCm = this._odfLengthToCm(widthRaw);
    const heightCm = this._odfLengthToCm(heightRaw);
    const offsetXCm = this._odfLengthToCm(xRaw);
    const offsetYCm = this._odfLengthToCm(yRaw);

    return {
      id: this._unescapeXml(frameAttrs.match(/draw:name=["']([^"']*)["']/i)?.[1] || fallbackId),
      src: `data:${mime};base64,${base64}`,
      ...(Number.isFinite(widthCm) && widthCm > 0 ? { widthCm } : {}),
      ...(Number.isFinite(heightCm) && heightCm > 0 ? { heightCm } : {}),
      ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
      ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {})
    };
  }

  /** Bản DOM-native của _parseCellEmbeddedImage(), dùng cho nhánh parse bằng DOMParser. */
  _parseCellEmbeddedImageDom(cellElement, fallbackId) {
    const DRAW_NS = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0";
    const OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";
    const SVG_NS = "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0";
    const frame = Array.from(cellElement.children).find(child => child.localName === "frame" && child.namespaceURI === DRAW_NS);
    if (!frame) return null;
    const image = Array.from(frame.children).find(child => child.localName === "image" && child.namespaceURI === DRAW_NS);
    if (!image) return null;
    const binaryNode = Array.from(image.children).find(child => child.localName === "binary-data" && child.namespaceURI === OFFICE_NS);
    const base64 = binaryNode ? (binaryNode.textContent || "").replace(/\s+/g, "") : "";
    if (!base64) return null;
    const mime = (image.getAttribute("draw:mime-type") || "image/png").toLowerCase();
    const widthRaw = frame.getAttribute("svg:width") || frame.getAttributeNS?.(SVG_NS, "width");
    const heightRaw = frame.getAttribute("svg:height") || frame.getAttributeNS?.(SVG_NS, "height");
    const xRaw = frame.getAttribute("svg:x") || frame.getAttributeNS?.(SVG_NS, "x");
    const yRaw = frame.getAttribute("svg:y") || frame.getAttributeNS?.(SVG_NS, "y");

    const widthCm = this._odfLengthToCm(widthRaw);
    const heightCm = this._odfLengthToCm(heightRaw);
    const offsetXCm = this._odfLengthToCm(xRaw);
    const offsetYCm = this._odfLengthToCm(yRaw);

    return {
      id: frame.getAttribute("draw:name") || fallbackId,
      src: `data:${mime};base64,${base64}`,
      ...(Number.isFinite(widthCm) && widthCm > 0 ? { widthCm } : {}),
      ...(Number.isFinite(heightCm) && heightCm > 0 ? { heightCm } : {}),
      ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
      ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {})
    };
  }

  _columnName(columnNumber) {
    let result = "";
    for (let n = columnNumber; n > 0; n = Math.floor((n - 1) / 26)) {
      result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
    }
    return result;
  }

  _pxToOdfCm(px) {
    return (Number(px) / 37.79527559055118).toFixed(3);
  }

  _odfLengthToPx(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(-?[\d.]+)\s*(cm|mm|in|pt|pc|px)?$/i);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;
    const unit = (match[2] || "cm").toLowerCase();
    const px = unit === "mm" ? amount * 3.779527559055118
      : unit === "in" ? amount * 96
      : unit === "pt" ? amount * (96 / 72)
      : unit === "pc" ? amount * 16
      : unit === "px" ? amount
      : amount * 37.79527559055118;
    return Math.round(px);
  }

  _asLayoutMap(value, numericKeys = false) {
    if (!value) return new Map();
    if (value instanceof Map) return value;
    return new Map(Object.entries(value).map(([key, item]) => [numericKeys ? Number(key) : key, item]));
  }

  _asLayoutSet(value, numeric = false) {
    if (!value) return new Set();
    if (value instanceof Set) return value;
    const items = Array.isArray(value) ? value : [...value];
    return new Set(numeric ? items.map(Number) : items);
  }

  _applyXlsxLayoutOverlay(raw, rowHeights, colWidths) {
    if (!raw) return;
    try {
      const layout = JSON.parse(this._unescapeXml(raw));
      for (const [column, width] of Object.entries(layout.columns || {})) if (Number.isFinite(Number(width))) colWidths.set(column, Number(width));
      for (const [row, height] of Object.entries(layout.rows || {})) if (Number.isFinite(Number(height))) rowHeights.set(Number(row), Number(height));
    } catch (_) {
      // Ignore malformed optional overlay; standard ODF dimensions remain usable.
    }
  }

  _sheetRowColLayout(sheetName) {
    return {
      rowHeights: this._asLayoutMap(this.grid?.rowHeightsBySheet?.[sheetName], true),
      colWidths: this._asLayoutMap(this.grid?.colWidthsBySheet?.[sheetName], false),
      hiddenRows: this._asLayoutSet(this.grid?.userHiddenRowsBySheet?.[sheetName], true),
      hiddenCols: this._asLayoutSet(this.grid?.userHiddenColsBySheet?.[sheetName], false)
    };
  }

  _parseRowColStyles(xmlText) {
    const columns = new Map();
    const rows = new Map();
    String(xmlText || "").replace(/<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi, (_, attrs, body = "") => {
      const name = this._unescapeXml(attrs.match(/style:name=["']([^"']*)["']/i)?.[1] || "");
      const family = (attrs.match(/style:family=["']([^"']*)["']/i)?.[1] || "").toLowerCase();
      if (!name) return "";
      if (family === "table-column") {
        const widthPx = this._odfLengthToPx(String(body).match(/style:column-width=["']([^"']+)["']/i)?.[1]);
        const pageBreak = /fo:break-before=["']page["']/i.test(body);
        if (widthPx != null || pageBreak) columns.set(name, { widthPx, pageBreak });
      } else if (family === "table-row") {
        const heightPx = this._odfLengthToPx(String(body).match(/style:row-height=["']([^"']+)["']/i)?.[1]);
        const pageBreak = /fo:break-before=["']page["']/i.test(body);
        if (heightPx != null || pageBreak) rows.set(name, { heightPx, pageBreak });
      }
      return "";
    });
    return { columns, rows };
  }

  _isCloseToDefault(px, fallback) {
    // Không nuốt độ rộng hay chiều cao thật (kể cả khi lệch <= 1px hoặc bằng đúng default)
    return false;
  }

  _tableAttr(element, localName) {
    return element.getAttribute(`table:${localName}`)
      || element.getAttributeNS?.("urn:oasis:names:tc:opendocument:xmlns:table:1.0", localName)
      || "";
  }

  _formulaToOdf(formula) {
    if (!formula || !String(formula).startsWith("=")) return "";
    let expression = String(formula).slice(1);
    const references = [];
    expression = expression.replace(/((?:'[^']+'|[A-Za-z0-9_À-ỹ ]+)!)?(\$?[A-Z]+\$?\d+):(\$?[A-Z]+\$?\d+)/g, (_, sheet, start, end) => {
      const prefix = sheet ? `$${sheet.slice(0, -1)}.` : ".";
      references.push(`[${prefix}${start}:${prefix}${end}]`);
      return `__VNO_REF_${references.length - 1}__`;
    });
    expression = expression.replace(/((?:'[^']+'|[A-Za-z0-9_À-ỹ ]+)!)?(\$?[A-Z]+\$?\d+)/g, (_, sheet, cell) => {
      const prefix = sheet ? `$${sheet.slice(0, -1)}.` : ".";
      references.push(`[${prefix}${cell}]`);
      return `__VNO_REF_${references.length - 1}__`;
    });
    expression = expression.replace(/__VNO_REF_(\d+)__/g, (_, index) => references[Number(index)]);
    expression = this._replaceFormulaSeparators(expression, ",", ";");
    return `of:=${expression}`;
  }

  _formulaFromOdf(formula) {
    if (!formula) return "";
    let expression = String(formula).replace(/^of:=/i, "=");
    expression = expression.replace(/\[([^\]]+)\]/g, (_, reference) => {
      const parts = reference.split(":").map(part => {
        if (part.startsWith(".")) return part.slice(1);
        const match = part.match(/^\$((?:'[^']+'|[^.]+))\.(.+)$/);
        return match ? `${match[1]}!${match[2]}` : part;
      });
      return parts.join(":");
    });
    return this._replaceFormulaSeparators(expression, ";", ",");
  }

  _replaceFormulaSeparators(expression, from, to) {
    let inString = false;
    let result = "";
    for (let index = 0; index < expression.length; index++) {
      const char = expression[index];
      if (char === '"') {
        if (inString && expression[index + 1] === '"') {
          result += '""';
          index++;
          continue;
        }
        inString = !inString;
      }
      result += !inString && char === from ? to : char;
    }
    return result;
  }

  _numberFormatXml(config, name) {
    const category = String(config.category || "number");
    const decimals = Math.max(0, Math.min(30, Number(config.decimals ?? (["currency", "accounting", "percentage", "scientific"].includes(category) ? 2 : 0))));
    const grouping = config.useThousands || category === "accounting" ? ' number:grouping="true"' : "";
    const number = `<number:number number:min-integer-digits="1" number:decimal-places="${decimals}" number:min-decimal-places="${decimals}"${grouping}/>`;
    const negativeStyle = Number(config.negativeStyle || 0);
    const negativeWrapper = negativeStyle >= 2 ? `<number:text>(</number:text>${number}<number:text>)</number:text>` : number;
    const negativeColor = [1, 3].includes(negativeStyle) ? '<style:text-properties fo:color="#ff0000"/>' : "";
    const mappedStyles = body => negativeStyle > 0
      ? `<number:number-style style:name="${name}P">${number}</number:number-style><number:number-style style:name="${name}">${negativeColor}${body}<style:map style:condition="value()&gt;=0" style:apply-style-name="${name}P"/></number:number-style>`
      : `<number:number-style style:name="${name}">${body}</number:number-style>`;
    if (category === "percentage") return `<number:percentage-style style:name="${name}">${number}<number:text>%</number:text></number:percentage-style>`;
    if (category === "scientific") return `<number:number-style style:name="${name}"><number:scientific-number number:min-integer-digits="1" number:decimal-places="${decimals}" number:min-decimal-places="${decimals}" number:min-exponent-digits="2"/></number:number-style>`;
    if (category === "text") return `<number:text-style style:name="${name}"><number:text-content/></number:text-style>`;
    if (category === "date") {
      const tokens = String(config.dateFormat || "dd/mm/yyyy").match(/"[^"]*"|yyyy|yy|mmmm|mm|dd|hh|ss|m|d|./gi) || [];
      const parts = tokens.map(token => {
        const lower = token.toLowerCase();
        if (["d", "dd"].includes(lower)) return `<number:day number:style="${lower === "dd" ? "long" : "short"}"/>`;
        if (["m", "mm", "mmmm"].includes(lower)) return `<number:month number:style="${lower === "m" ? "short" : "long"}"${lower === "mmmm" ? ' number:textual="true"' : ""}/>`;
        if (["yy", "yyyy"].includes(lower)) return `<number:year number:style="${lower === "yyyy" ? "long" : "short"}"/>`;
        if (lower === "hh") return '<number:hours number:style="long"/>';
        if (lower === "ss") return '<number:seconds number:style="long"/>';
        return `<number:text>${this._escapeXml(token.replace(/^"|"$/g, ""))}</number:text>`;
      }).join("");
      return `<number:date-style style:name="${name}">${parts}</number:date-style>`;
    }
    if (["currency", "accounting"].includes(category)) {
      const rawSymbol = config.currencySymbol ?? "₫";
      const symbol = `<number:currency-symbol>${this._escapeXml(rawSymbol)}</number:currency-symbol>`;
      const after = config.symbolPosition === "after" || (config.symbolPosition === undefined && rawSymbol === "₫");
      const spacer = category === "accounting" ? '<number:fill-character> </number:fill-character>' : "";
      return `<number:currency-style style:name="${name}">${after ? `${number}${spacer}${symbol}` : `${symbol}${spacer}${number}`}</number:currency-style>`;
    }
    if (category === "custom") {
      const pattern = String(config.customPattern || "General");
      const numeric = pattern.match(/[#0,]+(?:\.([#0]+))?/);
      const customDecimals = numeric?.[1]?.length || 0;
      const customGrouping = numeric?.[0]?.includes(",") ? ' number:grouping="true"' : "";
      const prefix = numeric ? pattern.slice(0, numeric.index) : "";
      const suffix = numeric ? pattern.slice(numeric.index + numeric[0].length) : pattern;
      return `<number:number-style style:name="${name}">${prefix ? `<number:text>${this._escapeXml(prefix)}</number:text>` : ""}<number:number number:min-integer-digits="1" number:decimal-places="${customDecimals}" number:min-decimal-places="${customDecimals}"${customGrouping}/>${suffix ? `<number:text>${this._escapeXml(suffix)}</number:text>` : ""}</number:number-style>`;
    }
    return mappedStyles(negativeWrapper);
  }

  _collectNumberFormats(sheetNames) {
    const formats = new Map();
    for (const sheetName of sheetNames) {
      const cells = this.grid.sheetsData?.[sheetName] || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null) || new Map();
      for (const item of cells.values()) {
        if (!item?.style?.numberFormat) continue;
        const key = JSON.stringify(item.style.numberFormat);
        if (!formats.has(key)) {
          const index = formats.size + 1;
          formats.set(key, { config: item.style.numberFormat, dataStyle: `n${index}`, cellStyle: `ce${index}` });
        }
      }
    }
    return formats;
  }

  _odfSheetName(sheetName) {
    const name = String(sheetName || "").replace(/'/g, "''");
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `'${name}'`;
  }

  _namedRangeXml(range, fallbackSheet) {
    const sheet = range.sheet || fallbackSheet;
    const ref = String(range.ref || "A1").replace(/\$/g, "").toUpperCase();
    const [start, end = start] = ref.split(":");
    const sheetRef = this._odfSheetName(sheet);
    return `<table:named-range table:name="${this._escapeXml(range.name)}" table:base-cell-address="$${this._escapeXml(sheetRef)}.$${start.replace(/(\D+)(\d+)/, "$1$$$2")}" table:cell-range-address="$${this._escapeXml(sheetRef)}.$${start.replace(/(\D+)(\d+)/, "$1$$$2")}:.$${end.replace(/(\D+)(\d+)/, "$1$$$2")}"/>`;
  }

  _printRangeAddress(sheetName, range) {
    const match = String(range || "").replace(/\$/g, "").toUpperCase().match(/^([A-Z]+\d+)(?::([A-Z]+\d+))?$/);
    if (!match) return "";
    const sheetRef = this._odfSheetName(sheetName);
    return `${sheetRef}.${match[1]}:${sheetRef}.${match[2] || match[1]}`;
  }

  _parsePrintRangeAddress(address) {
    const cells = [...String(address || "").matchAll(/\.\$?([A-Z]+)\$?(\d+)/gi)]
      .map(match => `${match[1].toUpperCase()}${match[2]}`);
    if (cells.length === 0) return null;
    return cells.length > 1 && cells[1] !== cells[0] ? `${cells[0]}:${cells[1]}` : cells[0];
  }

  _arrayFormulaInfo(coordinate, item) {
    if (!item?.isArrayFormula || !item.arrayRange) return null;
    const match = String(item.arrayRange).replace(/\$/g, "").toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) return null;
    const startColumn = this._columnNumber(match[1]);
    const startRow = Number(match[2]);
    const endColumn = this._columnNumber(match[3]);
    const endRow = Number(match[4]);
    if (endColumn < startColumn || endRow < startRow) return null;
    return {
      isAnchor: coordinate === `${match[1]}${match[2]}`,
      columns: endColumn - startColumn + 1,
      rows: endRow - startRow + 1
    };
  }

  _restoreArrayFormula(data, startColumn, startRow, columns, rows, formula) {
    const endColumn = startColumn + columns - 1;
    const endRow = startRow + rows - 1;
    const arrayRange = `${this._columnName(startColumn)}${startRow}:${this._columnName(endColumn)}${endRow}`;
    for (let row = startRow; row <= endRow; row++) {
      for (let column = startColumn; column <= endColumn; column++) {
        const coordinate = `${this._columnName(column)}${row}`;
        const item = data.get(coordinate) || { val: "", formula: "", style: {} };
        data.set(coordinate, { ...item, formula, isArrayFormula: true, arrayRange });
      }
    }
  }

  _parseNamedRangeElement(attributes, scope, fallbackSheet, index) {
    const get = name => this._unescapeXml(attributes.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] || "");
    const name = get("table:name");
    const address = get("table:cell-range-address");
    const sheetMatch = address.match(/^\$(?:'((?:[^']|'')+)'|([^.]+))\./);
    const sheet = (sheetMatch?.[1]?.replace(/''/g, "'") || sheetMatch?.[2] || fallbackSheet || "");
    const cells = [...address.matchAll(/\.\$?([A-Z]+)\$?(\d+)/gi)].map(match => `${match[1].toUpperCase()}${match[2]}`);
    if (!name || cells.length === 0) return null;
    const ref = cells.length > 1 && cells[1] !== cells[0] ? `${cells[0]}:${cells[1]}` : cells[0];
    return { id: `name-import-${scope}-${index}`, name, ref, scope, sheet };
  }

  _parseNumberStyles(xmlText) {
    // LibreOffice replaces common custom styles with its built-in N* styles during
    // XLSX import; seed the subset produced by the formats VN Sheet writes.
    const dataStyles = new Map([
      ["N0", { category: "number", decimals: 0, useThousands: false }],
      ["N4", { category: "number", decimals: 2, useThousands: true }],
      ["N36", { category: "date", dateFormat: "dd/mm/yyyy" }],
      ["N100", { category: "text" }]
    ]);
    const styleRegex = /<number:(number-style|percentage-style|currency-style|date-style|text-style)\b([^>]*)>([\s\S]*?)<\/number:\1>/gi;
    let match;
    while ((match = styleRegex.exec(xmlText)) !== null) {
      const name = match[2].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const body = match[3];
      const numberAttrs = body.match(/<number:(?:number|scientific-number)\b([^>]*)\/?\s*>/i)?.[1] || "";
      const config = {
        category: "number",
        decimals: Number(numberAttrs.match(/number:decimal-places=["'](\d+)["']/i)?.[1] || 0),
        useThousands: /number:grouping=["']true["']/i.test(numberAttrs)
      };
      if (/<style:map\b/i.test(body)) {
        const parentheses = /<number:text>\s*\(<\/number:text>/i.test(body) && /<number:text>\s*\)<\/number:text>/i.test(body);
        const red = /fo:color=["']#(?:ff0000|f00)["']/i.test(body);
        config.negativeStyle = parentheses ? (red ? 3 : 2) : (red ? 1 : 0);
      }
      if (match[1] === "percentage-style") config.category = "percentage";
      else if (match[1] === "currency-style") {
        config.category = "currency";
        config.currencySymbol = this._unescapeXml(body.match(/<number:currency-symbol\b[^>]*>([\s\S]*?)<\/number:currency-symbol>/i)?.[1]?.replace(/<[^>]+>/g, "") || "");
        if (body.search(/<number:currency-symbol\b/i) > body.search(/<number:number\b/i)) config.symbolPosition = "after";
        if (/<number:fill-character\b/i.test(body)) config.category = "accounting";
      } else if (match[1] === "date-style") {
        config.category = "date";
        const parts = [];
        body.replace(/<number:(day|month|year|hours|minutes|seconds)\b([^>]*)\/>|<number:text\b[^>]*>([\s\S]*?)<\/number:text>/gi, (all, kind, attrs, text) => {
          if (!kind) parts.push(this._unescapeXml((text || "").replace(/<[^>]+>/g, "")));
          else if (kind === "day") parts.push(/style=["']long/i.test(attrs) ? "dd" : "d");
          else if (kind === "month") parts.push(/textual=["']true/i.test(attrs) ? "mmmm" : (/style=["']long/i.test(attrs) ? "mm" : "m"));
          else if (kind === "year") parts.push(/style=["']long/i.test(attrs) ? "yyyy" : "yy");
          else parts.push({ hours: "hh", minutes: "mm", seconds: "ss" }[kind]);
          return all;
        });
        config.dateFormat = parts.join(""); delete config.decimals; delete config.useThousands;
      } else if (match[1] === "text-style") {
        config.category = "text"; delete config.decimals; delete config.useThousands;
      } else if (/<number:scientific-number\b/i.test(body)) config.category = "scientific";
      else if (!/<style:map\b/i.test(body)) {
        const literalTexts = [...body.matchAll(/<number:text\b[^>]*>([\s\S]*?)<\/number:text>/gi)].map(item => this._unescapeXml(item[1].replace(/<[^>]+>/g, ""))).filter(Boolean);
        if (literalTexts.length) {
          config.category = "custom";
          const numericPattern = `${config.useThousands ? "#,##" : ""}0${config.decimals ? `.${"0".repeat(config.decimals)}` : ""}`;
          config.customPattern = `${numericPattern}${literalTexts.map(text => ` "${text.replace(/"/g, '""')}"`).join("")}`;
          delete config.decimals; delete config.useThousands;
        }
      }
      dataStyles.set(name, config);
    }
    const cellStyles = new Map();
    xmlText.replace(/<style:style\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const name = attrs.match(/style:name=["']([^"']+)["']/i)?.[1];
      const dataName = attrs.match(/style:data-style-name=["']([^"']+)["']/i)?.[1];
      if (name && dataName && dataStyles.has(dataName)) cellStyles.set(name, dataStyles.get(dataName));
      return "";
    });
    return cellStyles;
  }

  _odfChartClass(type) {
    const raw = String(type || "").toLowerCase();
    if (raw === "pie") return "circle";
    if (raw === "bar" || raw === "column") return "bar";
    if (raw === "line" || raw === "area") return raw;
    return null;
  }

  _odfCellAddress(sheetName, cell) {
    return `${this._odfSheetName(sheetName)}.${cell}`;
  }

  _odfRangePair(sheetName, start, end) {
    const first = this._odfCellAddress(sheetName, start);
    const last = this._odfCellAddress(sheetName, end);
    return first === last ? first : `${first}:${last}`;
  }

  _cellHasPersistableContent(item) {
    if (!item) return false;
    if (item.formula) return true;
    if (item.sparkline) return true;
    if (this._normalizedTextRotation(item.style?.textRotation) != null) return true;
    return item.val !== "" && item.val !== undefined && item.val !== null;
  }

  _normalizedTextRotation(value) {
    const rotation = Number(value);
    if (rotation === 255) return 255;
    if ([45, -45, 90, -90].includes(rotation)) return rotation;
    return null;
  }

  _odfRotationAttrs(textRotation) {
    if (textRotation === 255) return 'style:direction="ttb" style:rotation-angle="0"';
    const signed = Number(textRotation);
    const angle = signed < 0 ? 360 + signed : signed;
    return `style:rotation-angle="${angle}"`;
  }

  _rotationCellStyleXml(styleName, textRotation, dataStyleName = "") {
    const dataAttr = dataStyleName ? ` style:data-style-name="${this._escapeXml(dataStyleName)}"` : "";
    return `<style:style style:name="${this._escapeXml(styleName)}" style:family="table-cell"${dataAttr}><style:table-cell-properties ${this._odfRotationAttrs(textRotation)}/></style:style>`;
  }

  _collectRotationStyles(sheetNames) {
    const rotations = new Map();
    for (const sheetName of sheetNames) {
      const cells = this.grid.sheetsData?.[sheetName] || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null) || new Map();
      for (const item of cells.values()) {
        const rotation = this._normalizedTextRotation(item?.style?.textRotation);
        if (rotation == null) continue;
        const key = String(rotation);
        if (!rotations.has(key)) {
          rotations.set(key, { textRotation: rotation, styleName: `ceRot${rotations.size + 1}` });
        }
      }
    }
    return rotations;
  }

  _textRotationFromOdf(direction, angleRaw) {
    if (String(direction || "").toLowerCase() === "ttb") return 255;
    if (angleRaw == null || angleRaw === "") return null;
    const angle = Number(String(angleRaw).replace(/deg$/i, ""));
    if (!Number.isFinite(angle) || angle === 0) return null;
    const signed = angle > 180 ? angle - 360 : angle;
    return this._normalizedTextRotation(signed);
  }

  _parseRotationStyles(xmlText) {
    const rotations = new Map();
    String(xmlText || "").replace(/<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi, (_, attrs, body = "") => {
      const name = this._unescapeXml(attrs.match(/style:name=["']([^"']+)["']/i)?.[1] || "");
      if (!name) return "";
      const direction = body.match(/style:direction=["']([^"']+)["']/i)?.[1];
      const angleRaw = body.match(/style:rotation-angle=["']([^"']+)["']/i)?.[1];
      const rotation = this._textRotationFromOdf(direction, angleRaw);
      if (rotation != null) rotations.set(name, rotation);
      return "";
    });
    return rotations;
  }

  /**
   * Parse office:automatic-styles (and office:styles) into a Map<styleName, styleObject>
   * covering visual cell properties: background, border, font, alignment, wrap.
   * Resolves style:parent-style-name for 1-level inheritance.
   */
  _parseCellVisualStyles(xmlText) {
    const raw = new Map();
    const parseStyleBlock = (block) => {
      String(block || "").replace(/<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi, (_, attrs, body = "") => {
        const family = attrs.match(/style:family=["']([^"']+)["']/i)?.[1] || "";
        if (family !== "table-cell") return "";
        const name = this._unescapeXml(attrs.match(/style:name=["']([^"']+)["']/i)?.[1] || "");
        const parentName = this._unescapeXml(attrs.match(/style:parent-style-name=["']([^"']+)["']/i)?.[1] || "");
        if (!name) return "";
        const cellProps = (body.match(/<style:table-cell-properties\b([^>]*?)\/?\s*>/i)?.[1] || "");
        const paraProps = (body.match(/<style:paragraph-properties\b([^>]*?)\/?\s*>/i)?.[1] || "");
        const textProps = (body.match(/<style:text-properties\b([^>]*?)\/?\s*>/i)?.[1] || "");
        const style = {};
        const bg = cellProps.match(/fo:background-color=["']([^"']+)["']/i)?.[1];
        if (bg && bg !== "transparent") style.backgroundColor = bg;
        const vAlign = cellProps.match(/style:vertical-align=["']([^"']+)["']/i)?.[1];
        if (vAlign) style.verticalAlign = vAlign;
        const wrap = cellProps.match(/fo:wrap-option=["']([^"']+)["']/i)?.[1];
        if (wrap === "wrap") style.whiteSpace = "pre-wrap";
        else if (wrap === "no-wrap") style.whiteSpace = "nowrap";
        const borderLeft = cellProps.match(/fo:border-left=["']([^"']+)["']/i)?.[1];
        const borderRight = cellProps.match(/fo:border-right=["']([^"']+)["']/i)?.[1];
        const borderTop = cellProps.match(/fo:border-top=["']([^"']+)["']/i)?.[1];
        const borderBottom = cellProps.match(/fo:border-bottom=["']([^"']+)["']/i)?.[1];
        const odfBorderToCss = (val) => {
          if (!val || val === "none" || val === "hidden") return "none";
          const parts = val.trim().split(/\s+/);
          if (parts.length < 3) return val;
          const [width, style, ...rest] = parts;
          let w = width;
          if (w.endsWith("pt")) {
            const pxVal = Math.round(parseFloat(w) * (96 / 72) * 100) / 100;
            w = `${pxVal}px`;
          }
          const color = rest.join(" ") || "#000000";
          return `${w} ${style} ${color}`;
        };
        if (borderLeft) style.borderLeft = odfBorderToCss(borderLeft);
        if (borderRight) style.borderRight = odfBorderToCss(borderRight);
        if (borderTop) style.borderTop = odfBorderToCss(borderTop);
        if (borderBottom) style.borderBottom = odfBorderToCss(borderBottom);
        const hAlign = paraProps.match(/fo:text-align=["']([^"']+)["']/i)?.[1];
        if (hAlign) style.textAlign = hAlign;
        const fontSize = textProps.match(/fo:font-size=["']([^"']+)["']/i)?.[1];
        if (fontSize) {
          if (fontSize.endsWith("pt")) {
            const pxVal = Math.round(parseFloat(fontSize) * (96 / 72) * 100) / 100;
            style.fontSize = `${pxVal}px`;
          } else if (fontSize.endsWith("px")) {
            const pxVal = Math.round(parseFloat(fontSize) * 100) / 100;
            style.fontSize = `${pxVal}px`;
          } else {
            const pxVal = Math.round(parseFloat(fontSize) * 100) / 100;
            style.fontSize = `${pxVal}px`;
          }
        }
        const fontWeight = textProps.match(/fo:font-weight=["']([^"']+)["']/i)?.[1];
        if (fontWeight) style.fontWeight = fontWeight;
        const fontStyle = textProps.match(/fo:font-style=["']([^"']+)["']/i)?.[1];
        if (fontStyle) style.fontStyle = fontStyle;
        const textDecoration = textProps.match(/fo:text-decoration=["']([^"']+)["']/i)?.[1];
        if (textDecoration) style.textDecoration = textDecoration;
        const color = textProps.match(/fo:color=["']([^"']+)["']/i)?.[1];
        if (color) style.color = color;
        const fontName = textProps.match(/style:font-name=["']([^"']+)["']/i)?.[1];
        if (fontName) style.fontFamily = fontName;
        raw.set(name, { style, parentName });
        return "";
      });
    };
    parseStyleBlock(xmlText);
    const resolved = new Map();
    for (const [name, entry] of raw) {
      let merged = { ...entry.style };
      if (entry.parentName && raw.has(entry.parentName)) {
        merged = { ...raw.get(entry.parentName).style, ...merged };
      }
      resolved.set(name, merged);
    }
    return resolved;
  }

  /**
   * Parse office:automatic-styles with style:family="text" into a Map<styleName, styleObject>.
   * These are the text-level styles used by <text:span text:style-name="Tn"> for rich text runs.
   */
  _parseTextStyles(xmlText) {
    const raw = new Map();
    String(xmlText || "").replace(/<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi, (_, attrs, body = "") => {
      const family = attrs.match(/style:family=["']([^"']+)["']/i)?.[1] || "";
      if (family !== "text") return "";
      const name = this._unescapeXml(attrs.match(/style:name=["']([^"']+)["']/i)?.[1] || "");
      const parentName = this._unescapeXml(attrs.match(/style:parent-style-name=["']([^"']+)["']/i)?.[1] || "");
      if (!name) return "";
      const textProps = (body.match(/<style:text-properties\b([^>]*?)\/?\s*>/i)?.[1] || "");
      const style = {};
      const color = textProps.match(/fo:color=["']([^"']+)["']/i)?.[1];
      if (color) style.color = color;
      const fontWeight = textProps.match(/fo:font-weight=["']([^"']+)["']/i)?.[1];
      if (fontWeight) style.fontWeight = fontWeight;
      const fontStyle = textProps.match(/fo:font-style=["']([^"']+)["']/i)?.[1];
      if (fontStyle) style.fontStyle = fontStyle;
      const textDecoration = textProps.match(/fo:text-decoration=["']([^"']+)["']/i)?.[1];
      if (textDecoration) style.textDecoration = textDecoration;
      const fontName = textProps.match(/style:font-name=["']([^"']+)["']/i)?.[1];
      if (fontName) style.fontFamily = fontName;
      const fontSize = textProps.match(/fo:font-size=["']([^"']+)["']/i)?.[1];
      if (fontSize) {
        if (fontSize.endsWith("pt")) style.fontSize = `${parseFloat(fontSize) * 1.3333}px`;
        else if (fontSize.endsWith("px")) style.fontSize = fontSize;
        else style.fontSize = `${fontSize}px`;
      }
      raw.set(name, { style, parentName });
      return "";
    });
    const resolved = new Map();
    for (const [name, entry] of raw) {
      let merged = { ...entry.style };
      if (entry.parentName && raw.has(entry.parentName)) {
        merged = { ...raw.get(entry.parentName).style, ...merged };
      }
      resolved.set(name, merged);
    }
    return resolved;
  }

  /**
   * Extract rich text runs from a DOM cell element's <text:p> paragraphs.
   * Returns { text, runs } where text is the flat joined text and runs is the richText array.
   * Only returns runs when there are ≥2 runs with different styles.
   */
  _extractRichTextFromDom(cellElement, textStyles, cellStyle) {
    const TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
    const paragraphs = Array.from(cellElement.getElementsByTagNameNS(TEXT_NS, "p"));
    const allRuns = [];
    let firstRun = true;

    for (const para of paragraphs) {
      if (!firstRun) {
        allRuns.push({ text: "\n", style: {} });
      }
      firstRun = false;

      const spans = Array.from(para.getElementsByTagNameNS(TEXT_NS, "span"));
      if (spans.length === 0) {
        allRuns.push({ text: para.textContent || "", style: {} });
      } else {
        for (const span of spans) {
          const styleName = span.getAttribute("text:style-name") || "";
          const spanStyle = textStyles.get(styleName) || {};
          allRuns.push({ text: span.textContent || "", style: { ...spanStyle } });
        }
      }
    }

    if (allRuns.length === 0) return { text: "", runs: null };

    const flatText = allRuns.map(r => r.text).join("");

    // Normalize: merge consecutive runs with identical styles
    const merged = [];
    for (const run of allRuns) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        const prevStyleStr = JSON.stringify(prev.style);
        const thisStyleStr = JSON.stringify(run.style);
        if (prevStyleStr === thisStyleStr) {
          prev.text += run.text;
          continue;
        }
      }
      merged.push({ ...run });
    }

    // Check if there are at least 2 runs with meaningfully different styles
    // (different from cell-level style). If all runs share the same effective
    // style as the cell, treat as flat text.
    if (merged.length < 2) return { text: flatText, runs: null };
    const cellStyleStr = JSON.stringify(cellStyle || {});
    const uniqueStyles = new Set(merged.map(r => JSON.stringify(r.style)));
    if (uniqueStyles.size < 2) return { text: flatText, runs: null };

    return { text: flatText, runs: merged };
  }

  /**
   * Extract rich text runs from raw XML content of a cell (regex branch).
   * Returns { text, runs } analogous to _extractRichTextFromDom.
   */
  _extractRichTextFromXml(cellContent, textStyles, cellStyle) {
    const paragraphs = [];
    String(cellContent || "").replace(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi, (_, inner) => {
      paragraphs.push(inner);
      return "";
    });

    const allRuns = [];
    let firstRun = true;

    for (const paraInner of paragraphs) {
      if (!firstRun) {
        allRuns.push({ text: "\n", style: {} });
      }
      firstRun = false;

      const spanRegex = /<text:span\b([^>]*)>([\s\S]*?)<\/text:span>/gi;
      let spanMatch;
      let lastIdx = 0;
      let hasSpans = false;

      while ((spanMatch = spanRegex.exec(paraInner)) !== null) {
        hasSpans = true;
        // Text before this span (if any) is unstyled
        if (spanMatch.index > lastIdx) {
          const gap = this._unescapeXml(paraInner.substring(lastIdx, spanMatch.index).replace(/<[^>]+>/g, ""));
          if (gap) allRuns.push({ text: gap, style: {} });
        }
        const attrs = spanMatch[1];
        const styleName = (attrs.match(/text:style-name=["']([^"']*)["']/i)?.[1] || "");
        const spanStyle = textStyles.get(styleName) || {};
        const text = this._unescapeXml(spanMatch[2].replace(/<[^>]+>/g, ""));
        allRuns.push({ text, style: { ...spanStyle } });
        lastIdx = spanMatch.index + spanMatch[0].length;
      }

      if (!hasSpans) {
        const text = this._unescapeXml(paraInner.replace(/<[^>]+>/g, ""));
        allRuns.push({ text, style: {} });
      } else if (lastIdx < paraInner.length) {
        const tail = this._unescapeXml(paraInner.substring(lastIdx).replace(/<[^>]+>/g, ""));
        if (tail) allRuns.push({ text: tail, style: {} });
      }
    }

    if (allRuns.length === 0) return { text: "", runs: null };

    const flatText = allRuns.map(r => r.text).join("");

    // Normalize: merge consecutive runs with identical styles
    const merged = [];
    for (const run of allRuns) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        const prevStyleStr = JSON.stringify(prev.style);
        const thisStyleStr = JSON.stringify(run.style);
        if (prevStyleStr === thisStyleStr) {
          prev.text += run.text;
          continue;
        }
      }
      merged.push({ ...run });
    }

    if (merged.length < 2) return { text: flatText, runs: null };
    const uniqueStyles = new Set(merged.map(r => JSON.stringify(r.style)));
    if (uniqueStyles.size < 2) return { text: flatText, runs: null };

    return { text: flatText, runs: merged };
  }

  _chartSeriesPlan(sheetName, chart) {
    const chartClass = this._odfChartClass(chart?.type);
    const range = chart?.range;
    if (!chartClass || !range?.start || !range?.end) return null;
    const startCol = this._columnNumber(range.start.c);
    const endCol = this._columnNumber(range.end.c);
    const startRow = Number(range.start.r);
    const endRow = Number(range.end.r);
    if (![startCol, endCol, startRow, endRow].every(Number.isInteger) || startCol < 1 || startRow < 1) return null;
    const left = Math.min(startCol, endCol);
    const right = Math.max(startCol, endCol);
    const top = Math.min(startRow, endRow);
    const bottom = Math.max(startRow, endRow);
    const cells = this.grid.sheetsData?.[sheetName]
      || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null)
      || new Map();
    const numeric = (col, row) => {
      const raw = cells.get(`${this._columnName(col)}${row}`)?.val;
      if (typeof raw === "number") return Number.isFinite(raw);
      const text = String(raw ?? "").trim();
      return text !== "" && Number.isFinite(Number(text.replace(/\s/g, "").replace(",", ".")));
    };
    let valueCol = -1;
    for (let col = left === right ? left : left + 1; col <= right; col++) {
      for (let row = top; row <= bottom; row++) {
        if (numeric(col, row)) { valueCol = col; break; }
      }
      if (valueCol > 0) break;
    }
    if (valueCol < 0) {
      for (let col = left; col <= right; col++) {
        for (let row = top; row <= bottom; row++) {
          if (numeric(col, row)) { valueCol = col; break; }
        }
        if (valueCol > 0) break;
      }
    }
    if (valueCol < 0) return null;
    const labelCol = left !== valueCol ? left : 0;
    const headerIsText = !numeric(valueCol, top);
    const dataTop = headerIsText && top < bottom ? top + 1 : top;
    const pointCount = bottom - dataTop + 1;
    if (pointCount < 1) return null;
    const valueStart = `${this._columnName(valueCol)}${dataTop}`;
    const valueEnd = `${this._columnName(valueCol)}${bottom}`;
    const categoryStart = labelCol ? `${this._columnName(labelCol)}${dataTop}` : "";
    const categoryEnd = labelCol ? `${this._columnName(labelCol)}${bottom}` : "";
    const labelCell = headerIsText ? `${this._columnName(valueCol)}${top}` : "";
    const plotStart = `${this._columnName(left)}${top}`;
    const plotEnd = `${this._columnName(right)}${bottom}`;
    const localRows = [];
    for (let row = dataTop; row <= bottom; row++) {
      const labelVal = labelCol
        ? String(cells.get(`${this._columnName(labelCol)}${row}`)?.val ?? `${this._columnName(valueCol)}${row}`)
        : `${this._columnName(valueCol)}${row}`;
      const raw = cells.get(`${this._columnName(valueCol)}${row}`)?.val;
      const number = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/\s/g, "").replace(",", "."));
      localRows.push({ label: labelVal, value: Number.isFinite(number) ? number : 0 });
    }
    return {
      chartClass,
      pointCount,
      plotRange: this._odfRangePair(sheetName, plotStart, plotEnd),
      valuesRange: this._odfRangePair(sheetName, valueStart, valueEnd),
      categoriesRange: categoryStart ? this._odfRangePair(sheetName, categoryStart, categoryEnd) : "",
      labelCellRange: labelCell ? this._odfCellAddress(sheetName, labelCell) : "",
      notifyRange: this._odfRangePair(sheetName, plotStart, plotEnd),
      localRows,
      title: String(chart.title || `Biểu đồ ${plotStart}:${plotEnd}`)
    };
  }

  _serializeChartsXml(sheetName) {
    const charts = this.grid.chartsBySheet?.[sheetName] || [];
    const frames = [];
    charts.forEach((chart, index) => {
      const plan = this._chartSeriesPlan(sheetName, chart);
      if (!plan) return;
      const width = Number.isFinite(Number(chart.w)) ? this._pxToOdfCm(chart.w) : "12.000";
      const height = Number.isFinite(Number(chart.h)) ? this._pxToOdfCm(chart.h) : "8.000";
      const x = Number.isFinite(Number(chart.x)) ? this._pxToOdfCm(chart.x) : (5.5 + (index % 2) * 0.4).toFixed(3);
      const y = Number.isFinite(Number(chart.y)) ? this._pxToOdfCm(chart.y) : (0.4 + index * 0.5).toFixed(3);
      const title = this._escapeXml(plan.title);
      const kindAttr = chart.kind === "pivot" ? ` vno:chart-kind="pivot" vno:pivot-id="${this._escapeXml(chart.pivotId || "")}"` : "";
      const categories = plan.categoriesRange
        ? `<chart:axis chart:dimension="x" chart:name="primary-x"><chart:categories table:cell-range-address="${this._escapeXml(plan.categoriesRange)}"/></chart:axis>`
        : "";
      const yAxis = plan.chartClass === "circle" ? "" : `<chart:axis chart:dimension="y" chart:name="primary-y"><chart:grid chart:class="major"/></chart:axis>`;
      const labelAddr = plan.labelCellRange ? ` chart:label-cell-address="${this._escapeXml(plan.labelCellRange)}"` : "";
      const points = Array.from({ length: plan.pointCount }, () => "<chart:data-point/>").join("");
      const localRows = plan.localRows.map(row => `<table:table-row><table:table-cell office:value-type="string"><text:p>${this._escapeXml(row.label)}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="${row.value}"><text:p>${row.value}</text:p></table:table-cell></table:table-row>`).join("");
      frames.push(`<draw:frame draw:name="${this._escapeXml(chart.id || `Chart${index + 1}`)}" draw:z-index="${index}" svg:width="${width}cm" svg:height="${height}cm" svg:x="${x}cm" svg:y="${y}cm"${kindAttr}>
          <draw:object draw:notify-on-update-of-ranges="${this._escapeXml(plan.notifyRange)}">
            <office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart">
              <office:body><office:chart>
                <chart:chart svg:width="${width}cm" svg:height="${height}cm" xlink:href=".." xlink:type="simple" chart:class="chart:${plan.chartClass}">
                  <chart:title><text:p>${title}</text:p></chart:title>
                  <chart:legend chart:legend-position="end"/>
                  <chart:plot-area table:cell-range-address="${this._escapeXml(plan.plotRange)}" chart:data-source-has-labels="${plan.labelCellRange || plan.categoriesRange ? "both" : "none"}">
                    ${categories}${yAxis}
                    <chart:series chart:values-cell-range-address="${this._escapeXml(plan.valuesRange)}"${labelAddr} chart:class="chart:${plan.chartClass}">${points}</chart:series>
                  </chart:plot-area>
                  <table:table table:name="local-table">
                    <table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>${title}</text:p></table:table-cell></table:table-row></table:table-header-rows>
                    <table:table-rows>${localRows}</table:table-rows>
                  </table:table>
                </chart:chart>
              </office:chart></office:body>
            </office:document>
          </draw:object>
        </draw:frame>`);
    });
    return frames.length ? `<table:shapes>${frames.join("")}</table:shapes>` : "";
  }

  /**
   * Ghi một ảnh (imagesBySheet item: { id, src, anchor, widthCm?, heightCm? }) thành
   * <draw:frame><draw:image> nhúng NGAY BÊN TRONG ô neo của nó — cùng định dạng chuẩn
   * ODF thật mà soffice tự ghi khi convert XLSX→FODS (đã xác nhận qua probe thật),
   * để lần đọc lại (kể cả từ file VN Office tự lưu) dùng chung một đường phân tích
   * _parseCellEmbeddedImage()/_parseCellEmbeddedImageDom() với file thật bên ngoài.
   */
  _serializeCellImageXml(image) {
    const match = String(image?.src || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) return "";
    const mime = match[1].toLowerCase();
    const base64 = match[2].replace(/\s+/g, "");
    if (!base64) return "";
    const widthCm = Number.isFinite(Number(image.widthCm)) && Number(image.widthCm) > 0 ? Number(Number(image.widthCm).toFixed(4)) : 6.35;
    const heightCm = Number.isFinite(Number(image.heightCm)) && Number(image.heightCm) > 0 ? Number(Number(image.heightCm).toFixed(4)) : 2.117;
    const xCm = Number.isFinite(Number(image.offsetXCm)) ? Number(Number(image.offsetXCm).toFixed(4)) : 0;
    const yCm = Number.isFinite(Number(image.offsetYCm)) ? Number(Number(image.offsetYCm).toFixed(4)) : 0;
    const name = this._escapeXml(image.id || "Image");
    return `<draw:frame draw:name="${name}" svg:x="${xCm}cm" svg:y="${yCm}cm" svg:width="${widthCm}cm" svg:height="${heightCm}cm"><draw:image draw:mime-type="${this._escapeXml(mime)}"><office:binary-data>${base64}</office:binary-data></draw:image></draw:frame>`;
  }

  _serializeSparklinesXml(sheetName) {
    const cells = this.grid.sheetsData?.[sheetName]
      || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null)
      || new Map();
    const groups = { line: [], column: [] };
    for (const [coordinate, item] of cells.entries()) {
      const spark = item?.sparkline;
      if (!spark || !["line", "column"].includes(spark.type)) continue;
      const source = spark.sourceRange;
      if (!source?.start || !source?.end) continue;
      const dataRange = this._odfRangePair(sheetName, `${source.start.c}${source.start.r}`, `${source.end.c}${source.end.r}`);
      groups[spark.type].push(`<calcext:sparkline calcext:cell-address="${this._escapeXml(this._odfCellAddress(sheetName, coordinate))}" calcext:data-range="${this._escapeXml(dataRange)}"/>`);
    }
    const blocks = [];
    for (const [type, sparklines] of Object.entries(groups)) {
      if (!sparklines.length) continue;
      blocks.push(`<calcext:sparkline-group calcext:type="${type}" calcext:display-empty-cells-as="gap" calcext:display-hidden="false"><calcext:sparklines>${sparklines.join("")}</calcext:sparklines></calcext:sparkline-group>`);
    }
    return blocks.length ? `<calcext:sparkline-groups>${blocks.join("")}</calcext:sparkline-groups>` : "";
  }

  _wrapOutlineGroups(sheetName, parts, axis, tagName) {
    const groups = (this.grid.outlineGroupsBySheet?.[sheetName] || [])
      .filter(group => group?.axis === axis && Number.isFinite(Number(group.start)) && Number.isFinite(Number(group.end)) && Number(group.end) > Number(group.start))
      .map(group => ({ start: Number(group.start), end: Number(group.end), collapsed: !!group.collapsed }))
      .sort((a, b) => a.start - b.start || b.end - a.end);
    if (!groups.length) return parts.map(part => part.xml).join("");
    const claimed = new Set();
    const wrapAt = new Map();
    for (const group of groups) {
      let overlap = false;
      for (let key = group.start; key <= group.end; key++) {
        if (claimed.has(key)) { overlap = true; break; }
      }
      if (overlap) continue;
      for (let key = group.start; key <= group.end; key++) claimed.add(key);
      wrapAt.set(group.start, group);
    }
    let xml = "";
    let index = 0;
    while (index < parts.length) {
      const part = parts[index];
      const group = wrapAt.get(part.key);
      if (!group) {
        xml += part.xml;
        index += 1;
        continue;
      }
      const display = group.collapsed ? ' table:display="false"' : "";
      xml += `<${tagName}${display}>`;
      while (index < parts.length && parts[index].key <= group.end) {
        xml += parts[index].xml;
        index += 1;
      }
      xml += `</${tagName}>`;
    }
    return xml;
  }

  _attachImportedPageBreaks(workbook, xmlText, rowColStyles) {
    workbook.pageBreaksBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, { rows: [], cols: [] }]));
    const pageColStyles = new Set();
    const pageRowStyles = new Set();
    for (const [name, style] of rowColStyles.columns || []) {
      if (style?.pageBreak) pageColStyles.add(name);
    }
    for (const [name, style] of rowColStyles.rows || []) {
      if (style?.pageBreak) pageRowStyles.add(name);
    }
    if (!pageColStyles.size && !pageRowStyles.size) return;
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>([\s\S]*?)<\/table:table>/gi, (_, attrs, body) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      const target = workbook.pageBreaksBySheet[name];
      if (!target) return "";
      let column = 1;
      body.replace(/<table:table-column(?=[\s>/])([^>]*)\/?\s*>/gi, (all, colAttrs) => {
        const repeat = Math.max(1, Number(colAttrs.match(/table:number-columns-repeated=["'](\d+)["']/i)?.[1]) || 1);
        const styleName = this._unescapeXml(colAttrs.match(/table:style-name=["']([^"']*)["']/i)?.[1] || "");
        for (let index = 0; index < repeat; index++, column++) {
          if (pageColStyles.has(styleName)) target.cols.push(this._columnName(column));
        }
        return "";
      });
      let row = 1;
      body.replace(/<table:table-row(?=[\s>/])([^>]*)(?:\/>|>)/gi, (all, rowAttrs) => {
        const repeat = Math.max(1, Number(rowAttrs.match(/table:number-rows-repeated=["'](\d+)["']/i)?.[1]) || 1);
        const styleName = this._unescapeXml(rowAttrs.match(/table:style-name=["']([^"']*)["']/i)?.[1] || "");
        for (let index = 0; index < repeat; index++, row++) {
          if (pageRowStyles.has(styleName)) target.rows.push(row);
        }
        return "";
      });
      return "";
    });
  }

  _attachImportedProtection(workbook, xmlText) {
    workbook.workbookProtection = {
      enabled: /<office:spreadsheet\b[^>]*table:structure-protected=["']true["']/i.test(xmlText || "")
    };
    workbook.protectionBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, { enabled: false, password: "" }]));
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>/gi, (_, attrs) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      if (!name || !workbook.protectionBySheet[name]) return "";
      if (/table:protected=["']true["']/i.test(attrs)) {
        workbook.protectionBySheet[name] = { enabled: true, password: "" };
      }
      return "";
    });
  }

  /**
   * vno:frozen-rows/cols (đọc lại từ chính FODS VN Office tự ghi - xem
   * serializeToFods()). soffice thật KHÔNG khôi phục Freeze Panes vào
   * office:settings khi chuyển đổi headless XLSX->FODS (xác nhận qua vòng
   * chuyển đổi soffice thật, xem docs/HANDOFF-SHEET-FREEZE-PANES.md) - khi mở
   * FILE XLSX THẬT từ Excel/nguồn khác, dùng sheet-xlsx-open-overlay đọc trực
   * tiếp <pane> từ XLSX gốc thay vì hàm này (hàm này chỉ phục vụ tự round-trip
   * FODS nội bộ của VN Office).
   */
  _attachImportedFreezePanes(workbook, xmlText) {
    workbook.freezePanesBySheet = {};
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>/gi, (_, attrs) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      if (!name) return "";
      const rows = Number(attrs.match(/vno:frozen-rows=["'](\d+)["']/i)?.[1]) || 0;
      const cols = Number(attrs.match(/vno:frozen-cols=["'](\d+)["']/i)?.[1]) || 0;
      if (rows > 0 || cols > 0) workbook.freezePanesBySheet[name] = { rows, cols };
      return "";
    });
  }

  /**
   * vno:sheet-state (hidden/veryHidden) — read back from FODS that VN Office
   * self-wrote during File → Mở overlay.  LibreOffice downgrades veryHidden
   * to hidden during XLSX→FODS; the Python overlay writes vno:sheet-state so
   * we can round-trip correctly.
   */
  _attachImportedSheetVisibility(workbook, xmlText) {
    workbook.sheetVisibilityBySheet = {};
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>/gi, (_, attrs) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      if (!name) return "";
      const rawState = attrs.match(/vno:sheet-state=["']([^"']*)["']/i)?.[1] || "";
      const state = rawState.toLowerCase();
      if (state === "hidden" || state === "veryhidden") {
        // Preserve canonical OOXML casing ("veryHidden", not "veryhidden")
        // for round-trip back into vno:sheet-state / xl/workbook.xml state=.
        workbook.sheetVisibilityBySheet[name] = state === "veryhidden" ? "veryHidden" : "hidden";
      }
      return "";
    });
  }

  /**
   * <table:database-ranges> — read back from FODS that VN Office self-wrote
   * during File → Mở overlay.  These represent AutoFilter ranges that
   * LibreOffice preserves in FODS but may drop during FODS→XLSX export.
   */
  _attachImportedAutoFilter(workbook, xmlText) {
    workbook.autoFilterBySheet = {};
    String(xmlText || "").replace(/<table:database-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const target = this._unescapeXml(attrs.match(/table:target-range-address=["']([^"']*)["']/i)?.[1] || "");
      if (!target) return "";
      // Format: SheetName.A1:D10
      const dotIdx = target.indexOf(".");
      if (dotIdx === -1) return "";
      const sheetName = target.substring(0, dotIdx);
      const ref = target.substring(dotIdx + 1);
      if (sheetName && ref) workbook.autoFilterBySheet[sheetName] = ref;
      return "";
    });
  }

  /**
   * Serialize <table:database-ranges> for sheets with active AutoFilter.
   * Each range uses the stored filterRef from sheetStates or the sheet's
   * used range as fallback.  This ensures the filter survives FODS→XLSX
   * round-trip via the Python postprocess layer.
   */
  _serializeDatabaseRanges(sheetNames) {
    const ranges = [];
    for (const sheetName of sheetNames) {
      const ss = this.grid.sheetStates?.[sheetName];
      const isActive = ss?.isFilterActive;
      if (!isActive) continue;
      const ref = ss?.filterRange || "";
      if (!ref) continue;
      ranges.push(
        `<table:database-range table:name="AutoFilter_${this._escapeXml(sheetName)}"`
        + ` table:target-range-address="${this._escapeXml(sheetName)}.${this._escapeXml(ref)}"`
        + ` table:display-filter-buttons="true"/>`
      );
    }
    if (ranges.length === 0) return "";
    return `<table:database-ranges>${ranges.join("")}</table:database-ranges>`;
  }

  _attachImportedSparklines(workbook, xmlText) {
    String(xmlText || "").replace(/<calcext:sparkline-group\b([^>]*)>([\s\S]*?)<\/calcext:sparkline-group>/gi, (_, attrs, body) => {
      const typeRaw = (attrs.match(/calcext:type=["']([^"']+)["']/i)?.[1] || "line").toLowerCase();
      const type = typeRaw === "column" ? "column" : "line";
      body.replace(/<calcext:sparkline\b([^>]*)\/?\s*>/gi, (all, sparkAttrs) => {
        const cell = this._parseOdfTargetRange(sparkAttrs.match(/calcext:cell-address=["']([^"']+)["']/i)?.[1] || "", workbook.sheets[0]);
        const data = this._parseOdfTargetRange(sparkAttrs.match(/calcext:data-range=["']([^"']+)["']/i)?.[1] || "", workbook.sheets[0]);
        if (!cell?.range || !data?.range || !workbook.sheetsData[cell.sheet]) return "";
        const coord = `${cell.range.start.c}${cell.range.start.r}`;
        const item = workbook.sheetsData[cell.sheet].get(coord) || { val: "", formula: "", style: {} };
        const values = [];
        const startCol = this._columnNumber(data.range.start.c);
        const endCol = this._columnNumber(data.range.end.c);
        for (let row = data.range.start.r; row <= data.range.end.r; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const raw = workbook.sheetsData[data.sheet || cell.sheet]?.get(`${this._columnName(col)}${row}`)?.val;
            const number = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/\s/g, "").replace(",", "."));
            if (Number.isFinite(number)) values.push(number);
          }
        }
        item.sparkline = { type, values, sourceRange: data.range };
        workbook.sheetsData[cell.sheet].set(coord, item);
        return "";
      });
      return "";
    });
  }

  _attachImportedOutline(workbook, xmlText) {
    workbook.outlineGroupsBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, []]));
    let index = 0;
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>([\s\S]*?)<\/table:table>/gi, (_, attrs, body) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      const groups = workbook.outlineGroupsBySheet[name];
      if (!groups) return "";
      let column = 1;
      const walkColumns = (xml) => {
        const regex = /<table:table-column-group\b([^>]*)>([\s\S]*?)<\/table:table-column-group>|<table:table-column(?=[\s>/])([^>]*)\/?\s*>/gi;
        let match;
        while ((match = regex.exec(xml)) !== null) {
          if (match[0].startsWith("<table:table-column-group")) {
            const start = column;
            const collapsed = /table:display=["']false["']/i.test(match[1] || "");
            walkColumns(match[2] || "");
            const end = column - 1;
            if (end > start) groups.push({ id: `outline-import-${++index}`, axis: "col", start, end, collapsed });
          } else {
            column += Math.max(1, Number((match[3] || "").match(/table:number-columns-repeated=["'](\d+)["']/i)?.[1]) || 1);
          }
        }
      };
      walkColumns(body);
      let row = 1;
      const walkRows = (xml) => {
        const regex = /<table:table-row-group\b([^>]*)>([\s\S]*?)<\/table:table-row-group>|<table:table-row(?=[\s>/])([^>]*)(?:\/>|>)/gi;
        let match;
        while ((match = regex.exec(xml)) !== null) {
          if (match[0].startsWith("<table:table-row-group")) {
            const start = row;
            const collapsed = /table:display=["']false["']/i.test(match[1] || "");
            walkRows(match[2] || "");
            const end = row - 1;
            if (end > start) groups.push({ id: `outline-import-${++index}`, axis: "row", start, end, collapsed });
          } else {
            row += Math.max(1, Number((match[3] || "").match(/table:number-rows-repeated=["'](\d+)["']/i)?.[1]) || 1);
          }
        }
      };
      walkRows(body);
      return "";
    });
  }

  /** Serialize the complete workbook as Flat OpenDocument Spreadsheet XML. */
  serializeToFods() {
    if (!this.grid) return "";
    const sheetNames = (this.grid.sheets && this.grid.sheets.length)
      ? [...this.grid.sheets]
      : Object.keys(this.grid.sheetsData || {});
    if (sheetNames.length === 0) sheetNames.push(this.grid.activeSheet || "Trang tính 1");

    const numberFormats = this._collectNumberFormats(sheetNames);
    const rotationStyles = this._collectRotationStyles(sheetNames);

    // ── Collect font families for office:font-face-decls ──
    const fontFaces = new Map();
    const addFontFace = (fontName) => {
      if (!fontName || fontFaces.has(fontName)) return;
      fontFaces.set(fontName, true);
    };
    for (const sheetName of sheetNames) {
      const cells = this.grid.sheetsData?.[sheetName]
        || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null)
        || new Map();
      for (const item of cells.values()) {
        if (item?.style?.fontFamily) addFontFace(item.style.fontFamily);
        if (Array.isArray(item?.richText)) {
          for (const run of item.richText) {
            if (run?.style?.fontFamily) addFontFace(run.style.fontFamily);
          }
        }
      }
    }
    const fontFaceDeclsXml = fontFaces.size > 0
      ? `<office:font-face-decls>${[...fontFaces.keys()].map(name => {
          const escaped = this._escapeXml(name);
          const needsQuote = /\s/.test(name);
          const familyAttr = needsQuote ? `svg:font-family="&apos;${escaped}&apos;"` : `svg:font-family="${escaped}"`;
          return `<style:font-face style:name="${escaped}" ${familyAttr}/>`;
        }).join("")}</office:font-face-decls>`
      : "";
    const rotationCombinedStyles = [];
    const conditionalNamedStyles = [];
    const conditionalBaseStyles = [];
    const conditionalStyleNames = new Map();
    const conditionalBaseByCell = new Map();
    const visualStyleEntries = [];
    const visualStyleNames = new Map();
    const richTextAutoStyles = [];
    const richTextStyleNames = new Map();
    const validationDefinitions = [];
    const validationsByCell = new Map();
    const pageLayouts = [];
    const tablePageStyles = [];
    const masterPages = [];
    const pageStyleBySheet = new Map();
    const dimensionStyles = [];
    const colStyleNames = new Map();
    const rowStyleNames = new Map();
    const defaultRowHeight = this.grid.rowHeight || 26;
    const defaultColWidth = this.grid.defaultColWidth || 100;
    const colStyleFor = (px, pageBreak = false) => {
      const widthKey = Math.round(Number(px));
      const key = `${widthKey}:${pageBreak ? "page" : "auto"}`;
      if (!colStyleNames.has(key)) {
        const name = `vno-co-${colStyleNames.size + 1}`;
        colStyleNames.set(key, name);
        dimensionStyles.push(`<style:style style:name="${name}" style:family="table-column"><style:table-column-properties fo:break-before="${pageBreak ? "page" : "auto"}" style:column-width="${this._pxToOdfCm(widthKey)}cm"/></style:style>`);
      }
      return colStyleNames.get(key);
    };
    const rowStyleFor = (px, pageBreak = false) => {
      const heightKey = Math.round(Number(px));
      const key = `${heightKey}:${pageBreak ? "page" : "auto"}`;
      if (!rowStyleNames.has(key)) {
        const name = `vno-ro-${rowStyleNames.size + 1}`;
        rowStyleNames.set(key, name);
        dimensionStyles.push(`<style:style style:name="${name}" style:family="table-row"><style:table-row-properties style:row-height="${this._pxToOdfCm(heightKey)}cm" fo:break-before="${pageBreak ? "page" : "auto"}" style:use-optimal-row-height="false"/></style:style>`);
      }
      return rowStyleNames.get(key);
    };
    const cssToOdfBorder = (side, cssVal) => {
      if (!cssVal || cssVal === "none") return `${side}="none"`;
      const m = String(cssVal).match(/^([\d.]+)px\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]+|[\w]+)$/);
      if (!m) return `${side}="none"`;
      const ptVal = Number((parseFloat(m[1]) * (72 / 96)).toFixed(2));
      return `${side}="${ptVal}pt ${m[2]} ${m[3]}"`;
    };
    const visualStyleFor = (item) => {
      const s = item?.style || {};
      const keys = ["backgroundColor", "color", "fontWeight", "fontStyle", "textDecoration", "fontFamily", "fontSize", "textAlign", "verticalAlign", "whiteSpace", "borderLeft", "borderRight", "borderTop", "borderBottom"];
      const hasVisual = keys.some(k => s[k] !== undefined && s[k] !== "" && s[k] !== null);
      if (!hasVisual) return null;
      const hash = JSON.stringify(keys.map(k => s[k] || ""));
      if (visualStyleNames.has(hash)) return visualStyleNames.get(hash);
      const name = `vno_vs_${visualStyleNames.size + 1}`;
      visualStyleNames.set(hash, name);
      const cellProps = [];
      if (s.backgroundColor) cellProps.push(`fo:background-color="${this._escapeXml(s.backgroundColor)}"`);
      if (s.verticalAlign) cellProps.push(`style:vertical-align="${this._escapeXml(s.verticalAlign)}"`);
      if (s.whiteSpace === "pre-wrap") cellProps.push(`fo:wrap-option="wrap"`);
      else if (s.whiteSpace === "nowrap") cellProps.push(`fo:wrap-option="no-wrap"`);
      if (s.borderLeft) cellProps.push(cssToOdfBorder("fo:border-left", s.borderLeft));
      if (s.borderRight) cellProps.push(cssToOdfBorder("fo:border-right", s.borderRight));
      if (s.borderTop) cellProps.push(cssToOdfBorder("fo:border-top", s.borderTop));
      if (s.borderBottom) cellProps.push(cssToOdfBorder("fo:border-bottom", s.borderBottom));
      const paraProps = [];
      if (s.textAlign) paraProps.push(`fo:text-align="${this._escapeXml(s.textAlign)}"`);
      const textProps = [];
      if (s.fontSize) {
        const ptVal = s.fontSize.endsWith("px") ? Number((parseFloat(s.fontSize) * (72 / 96)).toFixed(2)) : s.fontSize;
        textProps.push(`fo:font-size="${ptVal}pt"`);
      }
      if (s.fontWeight) textProps.push(`fo:font-weight="${this._escapeXml(s.fontWeight)}"`);
      if (s.fontStyle) textProps.push(`fo:font-style="${this._escapeXml(s.fontStyle)}"`);
      if (s.textDecoration) textProps.push(`fo:text-decoration="${this._escapeXml(s.textDecoration)}"`);
      if (s.color) textProps.push(`fo:color="${this._escapeXml(s.color)}"`);
      if (s.fontFamily) textProps.push(`style:font-name="${this._escapeXml(s.fontFamily)}"`);
      const parts = [];
      if (cellProps.length) parts.push(`<style:table-cell-properties ${cellProps.join(" ")}/>`);
      if (paraProps.length) parts.push(`<style:paragraph-properties ${paraProps.join(" ")}/>`);
      if (textProps.length) parts.push(`<style:text-properties ${textProps.join(" ")}/>`);
      visualStyleEntries.push(`<style:style style:name="${name}" style:family="table-cell">${parts.join("")}</style:style>`);
      return name;
    };
    const richTextStyleFor = (runStyle) => {
      if (!runStyle || Object.keys(runStyle).length === 0) return null;
      const hash = JSON.stringify(runStyle);
      if (richTextStyleNames.has(hash)) return richTextStyleNames.get(hash);
      const name = `T${richTextStyleNames.size + 1}`;
      richTextStyleNames.set(hash, name);
      const textProps = [];
      if (runStyle.color) textProps.push(`fo:color="${this._escapeXml(runStyle.color)}"`);
      if (runStyle.fontWeight) textProps.push(`fo:font-weight="${this._escapeXml(runStyle.fontWeight)}"`);
      if (runStyle.fontStyle) textProps.push(`fo:font-style="${this._escapeXml(runStyle.fontStyle)}"`);
      if (runStyle.textDecoration) textProps.push(`fo:text-decoration="${this._escapeXml(runStyle.textDecoration)}"`);
      if (runStyle.fontFamily) textProps.push(`style:font-name="${this._escapeXml(runStyle.fontFamily)}"`);
      if (runStyle.fontSize) {
        const ptVal = runStyle.fontSize.endsWith("px") ? (parseFloat(runStyle.fontSize) / 1.3333).toFixed(1) : runStyle.fontSize;
        textProps.push(`fo:font-size="${ptVal}pt"`);
      }
      if (textProps.length) {
        richTextAutoStyles.push(`<style:style style:name="${name}" style:family="text"><style:text-properties ${textProps.join(" ")}/></style:style>`);
      }
      return name;
    };
    const paperSizes = { a4: [21, 29.7], letter: [21.59, 27.94], legal: [21.59, 35.56] };
    const headerFooterTextXml = value => String(value || "").split(/(&[PNDTFA])/g).map(part => ({
      "&P": "<text:page-number>1</text:page-number>", "&N": "<text:page-count>1</text:page-count>",
      "&D": "<text:date/>", "&T": "<text:time/>", "&F": '<text:file-name text:display="name-and-extension"/>', "&A": "<text:sheet-name/>"
    })[part] || this._escapeXml(part)).join("");
    const headerFooterXml = (kind, sections) => `<style:${kind}>${["left", "center", "right"].map(position => `<style:region-${position}><text:p>${headerFooterTextXml(sections?.[position])}</text:p></style:region-${position}>`).join("")}</style:${kind}>`;
    sheetNames.forEach((sheetName, index) => {
      const setup = this.grid.pageSetupBySheet?.[sheetName] || {};
      const size = paperSizes[setup.size] ? setup.size : "a4";
      const orientation = setup.orientation === "landscape" ? "landscape" : "portrait";
      const base = paperSizes[size];
      const width = orientation === "landscape" ? base[1] : base[0];
      const height = orientation === "landscape" ? base[0] : base[1];
      const margins = { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78, ...(setup.margins || {}) };
      const scale = { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0, ...(setup.scale || {}) };
      const headerFooter = { header: { left: "", center: "", right: "", ...(setup.headerFooter?.header || {}) }, footer: { left: "", center: "Trang &P / &N", right: "", ...(setup.headerFooter?.footer || {}) } };
      const centerOnPage = { horizontal: false, vertical: false, ...(setup.centerOnPage || {}) };
      const printOptions = { gridlines: false, headings: false, ...(setup.printOptions || {}) };
      const printTokens = ["objects", "charts", "drawings", "zero-values", printOptions.gridlines ? "grid" : "", printOptions.headings ? "headers" : ""].filter(Boolean).join(" ");
      const tableCentering = centerOnPage.horizontal && centerOnPage.vertical ? "both" : centerOnPage.horizontal ? "horizontal" : centerOnPage.vertical ? "vertical" : "none";
      const scaleAttribute = scale.mode === "pages"
        ? ` style:scale-to-X="${Math.max(0, scale.pagesWide)}" style:scale-to-Y="${Math.max(0, scale.pagesTall)}"`
        : ` style:scale-to="${Math.min(400, Math.max(10, scale.percent || 100))}%"`;
      const suffix = index + 1;
      pageStyleBySheet.set(sheetName, { tableStyle: `vno-table-page-${suffix}`, size, orientation, margins, scale, headerFooter, centerOnPage, printOptions });
      pageLayouts.push(`<style:page-layout style:name="vno-page-layout-${suffix}"><style:page-layout-properties fo:page-width="${width}cm" fo:page-height="${height}cm" style:print-orientation="${orientation}" fo:margin-top="${margins.top}cm" fo:margin-bottom="${margins.bottom}cm" fo:margin-left="${margins.left}cm" fo:margin-right="${margins.right}cm" style:table-centering="${tableCentering}"${scaleAttribute}/><style:header-style><style:header-footer-properties fo:min-height="0.75cm" fo:margin-bottom="0.25cm"/></style:header-style><style:footer-style><style:header-footer-properties fo:min-height="0.75cm" fo:margin-top="0.25cm"/></style:footer-style></style:page-layout>`);
      tablePageStyles.push(`<style:style style:name="vno-table-page-${suffix}" style:family="table" style:master-page-name="vno-master-page-${suffix}"><style:table-properties style:print="${printTokens}"/></style:style>`);
      masterPages.push(`<style:master-page style:name="vno-master-page-${suffix}" style:page-layout-name="vno-page-layout-${suffix}">${headerFooterXml("header", headerFooter.header)}${headerFooterXml("footer", headerFooter.footer)}</style:master-page>`);
    });
    const odfAddress = (sheetName, cell) => `'${String(sheetName).replace(/'/g, "''")}'.${cell}`;
    const rangeAddress = (sheetName, range) => `${odfAddress(sheetName, `${range.start.c}${range.start.r}`)}:${odfAddress(sheetName, `${range.end.c}${range.end.r}`)}`;
    const usedRange = sheetName => {
      const cells = this.grid.sheetsData?.[sheetName]
        || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null)
        || new Map();
      let minRow = Infinity, maxRow = 0, minColumn = Infinity, maxColumn = 0;
      for (const [coordinate, item] of cells.entries()) {
        const match = String(coordinate).match(/^([A-Z]+)(\d+)$/);
        if (!match || !item || ((item.val === "" || item.val === undefined || item.val === null) && !item.formula)) continue;
        const row = Number(match[2]);
        const column = this._columnNumber(match[1]);
        minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row);
        minColumn = Math.min(minColumn, column); maxColumn = Math.max(maxColumn, column);
      }
      if (!maxRow || !maxColumn) return { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
      return { start: { c: this._columnName(minColumn), r: minRow }, end: { c: this._columnName(maxColumn), r: maxRow } };
    };
    const normalizedColor = color => String(color || "#fff2cc").trim().toLowerCase();
    const styleForColor = color => {
      const normalized = normalizedColor(color);
      if (!conditionalStyleNames.has(normalized)) {
        const name = `vno_cf_${conditionalStyleNames.size + 1}`;
        conditionalStyleNames.set(normalized, name);
        conditionalNamedStyles.push(`<style:style style:name="${name}" style:family="table-cell"><style:table-cell-properties fo:background-color="${this._escapeXml(normalized)}"/></style:style>`);
      }
      return conditionalStyleNames.get(normalized);
    };

    const conditionalFormatsBySheet = {};
    sheetNames.forEach((sheetName, sheetIndex) => {
      const rules = this.grid.conditionalFormattingBySheet?.[sheetName] || [];
      const groupedRules = new Map();
      for (const rule of rules) {
        if (!rule?.range || !["greaterThan", "lessThan", "blank"].includes(rule.type)) continue;
        const key = JSON.stringify(rule.range);
        if (!groupedRules.has(key)) groupedRules.set(key, []);
        groupedRules.get(key).push(rule);
      }
      const sheetConditionalCells = new Map();
      for (const grouped of groupedRules.values()) {
        const baseName = `vno_cf_base_${sheetIndex + 1}_${conditionalBaseStyles.length + 1}`;
        const base = odfAddress(sheetName, `${grouped[0].range.start.c}${grouped[0].range.start.r}`);
        const maps = grouped.map(rule => {
          const condition = rule.type === "greaterThan"
            ? `cell-content()&gt;${Number(rule.value)}`
            : rule.type === "lessThan"
              ? `cell-content()&lt;${Number(rule.value)}`
              : `is-true-formula(LEN(TRIM([.${grouped[0].range.start.c}${grouped[0].range.start.r}]))=0)`;
          return `<style:map style:condition="${condition}" style:apply-style-name="${styleForColor(rule.color)}" style:base-cell-address="${this._escapeXml(base)}"/>`;
        }).join("");
        conditionalBaseStyles.push(`<style:style style:name="${baseName}" style:family="table-cell">${maps}</style:style>`);
        const range = grouped[0].range;
        for (let row = range.start.r; row <= range.end.r; row++) {
          for (let column = this._columnNumber(range.start.c); column <= this._columnNumber(range.end.c); column++) {
            sheetConditionalCells.set(`${this._columnName(column)}${row}`, { baseName, maps });
          }
        }
      }
      conditionalBaseByCell.set(sheetName, sheetConditionalCells);
      conditionalFormatsBySheet[sheetName] = rules.map(rule => {
        if (!rule?.range || !["greaterThan", "lessThan", "blank"].includes(rule.type)) return "";
        const styleName = styleForColor(rule.color);
        const value = rule.type === "greaterThan"
          ? `&gt;${Number(rule.value)}`
          : rule.type === "lessThan"
            ? `&lt;${Number(rule.value)}`
            : `formula-is(LEN(TRIM([.${rule.range.start.c}${rule.range.start.r}]))=0)`;
        const base = odfAddress(sheetName, `${rule.range.start.c}${rule.range.start.r}`);
        return `<calcext:conditional-format calcext:target-range-address="${this._escapeXml(rangeAddress(sheetName, rule.range))}"><calcext:condition calcext:apply-style-name="${styleName}" calcext:value="${value}" calcext:base-cell-address="${this._escapeXml(base)}"/></calcext:conditional-format>`;
      }).filter(Boolean).join("");

      (this.grid.dataValidationsBySheet?.[sheetName] || []).forEach((rule, ruleIndex) => {
        if (!rule?.range || !["list", "numberRange"].includes(rule.type)) return;
        const name = `vno_validation_${sheetIndex + 1}_${ruleIndex + 1}`;
        let condition = "";
        if (rule.type === "list") {
          const values = Array.isArray(rule.values) ? rule.values : String(rule.values || "").split(",");
          const quoted = values.map(value => `&quot;${this._escapeXml(String(value).trim().replace(/"/g, '""'))}&quot;`).join(";");
          if (!quoted) return;
          condition = `of:cell-content-is-in-list(${quoted})`;
        } else {
          if (!Number.isFinite(Number(rule.min)) || !Number.isFinite(Number(rule.max))) return;
          condition = `of:cell-content-is-whole-number() and cell-content-is-between(${Number(rule.min)},${Number(rule.max)})`;
        }
        const base = odfAddress(sheetName, `${rule.range.start.c}${rule.range.start.r}`);
        validationDefinitions.push(`<table:content-validation table:name="${name}" table:condition="${condition}" table:base-cell-address="${this._escapeXml(base)}" table:allow-empty-cell="true" table:display-list="unsorted"/>`);
        const sheetCells = validationsByCell.get(sheetName) || new Map();
        for (let row = rule.range.start.r; row <= rule.range.end.r; row++) {
          for (let column = this._columnNumber(rule.range.start.c); column <= this._columnNumber(rule.range.end.c); column++) {
            sheetCells.set(`${this._columnName(column)}${row}`, name);
          }
        }
        validationsByCell.set(sheetName, sheetCells);
      });
    });
    const tablesXml = sheetNames.map(sheetName => {
      const cells = this.grid.sheetsData?.[sheetName]
        || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null)
        || new Map();
      const comments = this.grid.commentsBySheet?.[sheetName] || {};
      const cellValidations = validationsByCell.get(sheetName) || new Map();
      const cellConditionalBases = conditionalBaseByCell.get(sheetName) || new Map();
      const mergeAnchors = new Map();
      const coveredCells = new Set();
      let maxRow = 0;
      const rows = new Map();
      for (const [coordinate, item] of cells.entries()) {
        const match = String(coordinate).match(/^([A-Z]+)(\d+)$/);
        if (!match || !this._cellHasPersistableContent(item)) continue;
        const rowNumber = Number(match[2]);
        const columnNumber = this._columnNumber(match[1]);
        if (!rows.has(rowNumber)) rows.set(rowNumber, new Map());
        rows.get(rowNumber).set(columnNumber, item);
        maxRow = Math.max(maxRow, rowNumber);
      }
      for (const coordinate of Object.keys(comments)) {
        const match = String(coordinate).match(/^([A-Z]+)(\d+)$/);
        if (!match) continue;
        const rowNumber = Number(match[2]);
        const columnNumber = this._columnNumber(match[1]);
        if (!rows.has(rowNumber)) rows.set(rowNumber, new Map());
        if (!rows.get(rowNumber).has(columnNumber)) rows.get(rowNumber).set(columnNumber, { val: "", formula: "", style: {} });
        maxRow = Math.max(maxRow, rowNumber);
      }
      for (const coordinate of cellValidations.keys()) {
        const match = String(coordinate).match(/^([A-Z]+)(\d+)$/);
        if (!match) continue;
        const rowNumber = Number(match[2]);
        const columnNumber = this._columnNumber(match[1]);
        if (!rows.has(rowNumber)) rows.set(rowNumber, new Map());
        if (!rows.get(rowNumber).has(columnNumber)) rows.get(rowNumber).set(columnNumber, { val: "", formula: "", style: {} });
        maxRow = Math.max(maxRow, rowNumber);
      }
      for (const coordinate of cellConditionalBases.keys()) {
        const match = String(coordinate).match(/^([A-Z]+)(\d+)$/);
        if (!match) continue;
        const rowNumber = Number(match[2]);
        const columnNumber = this._columnNumber(match[1]);
        if (!rows.has(rowNumber)) rows.set(rowNumber, new Map());
        if (!rows.get(rowNumber).has(columnNumber)) rows.get(rowNumber).set(columnNumber, { val: "", formula: "", style: {} });
        maxRow = Math.max(maxRow, rowNumber);
      }
      for (const range of this.grid.mergedRangesBySheet?.[sheetName] || []) {
        const startColumn = this._columnNumber(range?.start?.c);
        const endColumn = this._columnNumber(range?.end?.c);
        const startRow = Number(range?.start?.r);
        const endRow = Number(range?.end?.r);
        if (![startColumn, endColumn, startRow, endRow].every(Number.isInteger)) continue;
        const left = Math.min(startColumn, endColumn);
        const right = Math.max(startColumn, endColumn);
        const top = Math.min(startRow, endRow);
        const bottom = Math.max(startRow, endRow);
        if (left < 1 || top < 1 || (left === right && top === bottom)) continue;
        const anchor = `${this._columnName(left)}${top}`;
        mergeAnchors.set(anchor, { columns: right - left + 1, rows: bottom - top + 1 });
        for (let row = top; row <= bottom; row++) {
          if (!rows.has(row)) rows.set(row, new Map());
          for (let column = left; column <= right; column++) {
            const coordinate = `${this._columnName(column)}${row}`;
            if (!rows.get(row).has(column)) rows.get(row).set(column, null);
            if (coordinate !== anchor) coveredCells.add(coordinate);
          }
        }
        maxRow = Math.max(maxRow, bottom);
      }

      const imagesByAnchor = new Map();
      for (const image of this.grid.imagesBySheet?.[sheetName] || []) {
        const column = this._columnNumber(image.anchor?.c);
        const row = Number(image.anchor?.r);
        if (!Number.isInteger(column) || column < 1 || !Number.isInteger(row) || row < 1) continue;
        imagesByAnchor.set(`${this._columnName(column)}${row}`, image);
        if (!rows.has(row)) rows.set(row, new Map());
        if (!rows.get(row).has(column)) rows.get(row).set(column, null);
        maxRow = Math.max(maxRow, row);
      }

      const layout = this._sheetRowColLayout(sheetName);
      const pageBreaks = this.grid.pageBreaksBySheet?.[sheetName] || { rows: [], cols: [] };
      const pageBreakRows = new Set((pageBreaks.rows || []).map(Number).filter(Number.isInteger));
      const pageBreakCols = new Set((pageBreaks.cols || []).map(col => String(col).toUpperCase()));
      let maxCol = 1;
      for (const rowCells of rows.values()) {
        for (const columnNumber of rowCells.keys()) maxCol = Math.max(maxCol, columnNumber);
      }
      for (const [rowNumber] of layout.rowHeights) maxRow = Math.max(maxRow, Number(rowNumber) || 0);
      for (const rowNumber of layout.hiddenRows) maxRow = Math.max(maxRow, Number(rowNumber) || 0);
      for (const rowNumber of pageBreakRows) maxRow = Math.max(maxRow, Number(rowNumber) || 0);
      for (const [col] of layout.colWidths) maxCol = Math.max(maxCol, this._columnNumber(col));
      for (const col of layout.hiddenCols) maxCol = Math.max(maxCol, this._columnNumber(col));
      for (const col of pageBreakCols) maxCol = Math.max(maxCol, this._columnNumber(col));
      for (const group of this.grid.outlineGroupsBySheet?.[sheetName] || []) {
        if (group?.axis === "row") maxRow = Math.max(maxRow, Number(group.end) || 0);
        if (group?.axis === "col") maxCol = Math.max(maxCol, Number(group.end) || 0);
      }
      // Safety cap: never iterate beyond 4096 columns/rows even if upstream
      // data is tainted (the real fix is in parseFods which limits
      // colWidths/rowHeights, but this prevents serialize blowup defensively).
      maxCol = Math.min(maxCol, 4096);
      maxRow = Math.min(maxRow, 1048576);

      const columnParts = [];
      for (let columnNumber = 1; columnNumber <= Math.max(1, maxCol); columnNumber++) {
        const colName = this._columnName(columnNumber);
        const hidden = layout.hiddenCols.has(colName);
        const width = layout.colWidths.get(colName);
        const pageBreak = pageBreakCols.has(colName);
        const attrs = [];
        if (Number.isFinite(width) || hidden || pageBreak) attrs.push(`table:style-name="${colStyleFor(Number.isFinite(width) ? width : defaultColWidth, pageBreak)}"`);
        if (hidden) attrs.push(`table:visibility="collapse"`);
        columnParts.push({ key: columnNumber, xml: `<table:table-column${attrs.length ? ` ${attrs.join(" ")}` : ""}/>` });
      }
      const columnsXml = this._wrapOutlineGroups(sheetName, columnParts, "col", "table:table-column-group");

      const rowParts = [];
      for (let rowNumber = 1; rowNumber <= Math.max(1, maxRow); rowNumber++) {
        const rowCells = rows.get(rowNumber) || new Map();
        const usedColumns = [...rowCells.keys()].sort((a, b) => a - b);
        let cellsXml = "";
        let previousColumn = 0;
        for (const columnNumber of usedColumns) {
          const gap = columnNumber - previousColumn - 1;
          if (gap === 1) cellsXml += "<table:table-cell/>";
          else if (gap > 1) cellsXml += `<table:table-cell table:number-columns-repeated="${gap}"/>`;

          const coordinate = `${this._columnName(columnNumber)}${rowNumber}`;
          if (coveredCells.has(coordinate)) {
            cellsXml += "<table:covered-table-cell/>";
            previousColumn = columnNumber;
            continue;
          }
          const storedItem = rowCells.get(columnNumber);
          const item = storedItem || { val: "", formula: "", style: {} };
          const arrayFormula = this._arrayFormulaInfo(coordinate, item);
          const formula = (!arrayFormula || arrayFormula.isAnchor) && item.formula && String(item.formula).startsWith("=") ? String(item.formula) : "";
          const formulaAttrs = formula
            ? ` table:formula="${this._escapeXml(this._formulaToOdf(formula))}" vno:formula="${this._escapeXml(formula)}"`
            : "";
          const matrixAttrs = arrayFormula?.isAnchor
            ? ` table:number-matrix-columns-spanned="${arrayFormula.columns}" table:number-matrix-rows-spanned="${arrayFormula.rows}"`
            : "";
          const numFmtAttr = item.style?.numberFormat
            ? ` vno:number-format="${this._escapeXml(JSON.stringify(item.style.numberFormat))}"`
            : "";
          const formatStyle = item.style?.numberFormat ? numberFormats.get(JSON.stringify(item.style.numberFormat)) : null;
          const conditionalBase = cellConditionalBases.get(coordinate);
          let cellStyleName = conditionalBase?.baseName || formatStyle?.cellStyle || "";
          if (conditionalBase && formatStyle) {
            cellStyleName = `${conditionalBase.baseName}_${formatStyle.cellStyle}`;
            if (!conditionalBaseStyles.some(style => style.includes(`style:name="${cellStyleName}"`))) {
              conditionalBaseStyles.push(`<style:style style:name="${cellStyleName}" style:family="table-cell" style:data-style-name="${formatStyle.dataStyle}">${conditionalBase.maps}</style:style>`);
            }
          }
          const rotation = this._normalizedTextRotation(item.style?.textRotation);
          const rotStyle = rotation != null ? rotationStyles.get(String(rotation)) : null;
          if (rotStyle) {
            if (cellStyleName) {
              const combined = `${cellStyleName}_${rotStyle.styleName}`;
              const dataAttr = formatStyle ? ` style:data-style-name="${formatStyle.dataStyle}"` : "";
              const maps = conditionalBase?.maps || "";
              if (!rotationCombinedStyles.some(style => style.includes(`style:name="${combined}"`))) {
                rotationCombinedStyles.push(`<style:style style:name="${combined}" style:family="table-cell"${dataAttr}>${maps}<style:table-cell-properties ${this._odfRotationAttrs(rotStyle.textRotation)}/></style:style>`);
              }
              cellStyleName = combined;
            } else {
              cellStyleName = rotStyle.styleName;
            }
          }
          const vsName = visualStyleFor(item);
          if (vsName) {
            if (cellStyleName) {
              const combined = `${cellStyleName}_${vsName}`;
              const dataAttr = formatStyle ? ` style:data-style-name="${formatStyle.dataStyle}"` : "";
              if (!rotationCombinedStyles.some(style => style.includes(`style:name="${combined}"`))) {
                let vsEntry = visualStyleEntries[visualStyleEntries.length - 1];
                if (rotStyle) {
                  const rotAttrs = this._odfRotationAttrs(rotStyle.textRotation);
                  vsEntry = vsEntry.replace(/<style:table-cell-properties/, `<style:table-cell-properties ${rotAttrs}`);
                }
                const vsInner = vsEntry.replace(/^<style:style[^>]*>/, "").replace(/<\/style:style>$/, "");
                rotationCombinedStyles.push(`<style:style style:name="${combined}" style:family="table-cell"${dataAttr}>${conditionalBase?.maps || ""}${vsInner}</style:style>`);
              }
              cellStyleName = combined;
            } else {
              cellStyleName = vsName;
            }
          }
          const validationName = cellValidations.get(coordinate);
          const validationAttr = validationName ? ` table:content-validation-name="${validationName}"` : "";
          const merge = mergeAnchors.get(coordinate);
          const mergeAttrs = merge
            ? ` table:number-columns-spanned="${merge.columns}" table:number-rows-spanned="${merge.rows}"`
            : "";
          const cellAttrs = `${formulaAttrs}${matrixAttrs}${mergeAttrs}${numFmtAttr}${cellStyleName ? ` table:style-name="${cellStyleName}"` : ""}${validationAttr}`;
          const comment = comments[coordinate];
          const annotationXml = comment ? `<office:annotation><dc:creator>${this._escapeXml(comment.author || "")}</dc:creator>${comment.timestamp ? `<dc:date>${this._escapeXml(comment.timestamp)}</dc:date>` : ""}<text:p>${this._escapeXml(comment.text || "")}</text:p></office:annotation>` : "";
          const cellImage = imagesByAnchor.get(coordinate);
          const cellImageXml = cellImage ? this._serializeCellImageXml(cellImage) : "";
          if (!storedItem && !comment && !validationName && !conditionalBase && !cellImageXml) {
            cellsXml += `<table:table-cell${cellAttrs}/>`;
          } else if (!storedItem && !comment && !validationName && !conditionalBase) {
            cellsXml += `<table:table-cell${cellAttrs}>${cellImageXml}</table:table-cell>`;
          } else if (typeof item.val === "number" && Number.isFinite(item.val)) {
            cellsXml += `<table:table-cell office:value-type="float" office:value="${item.val}"${cellAttrs}>${cellImageXml}${annotationXml}<text:p>${this._escapeXml(item.val)}</text:p></table:table-cell>`;
          } else {
            const text = item.val === undefined || item.val === null ? "" : String(item.val);
            if (Array.isArray(item.richText) && item.richText.length > 0) {
              // Serialize rich text as <text:p> with <text:span> elements
              const paraRuns = [];
              let currentPara = [];
              for (const run of item.richText) {
                if (run.text === "\n") {
                  if (currentPara.length) paraRuns.push(currentPara);
                  currentPara = [];
                  continue;
                }
                currentPara.push(run);
              }
              if (currentPara.length) paraRuns.push(currentPara);
              if (paraRuns.length === 0) paraRuns.push([{ text, style: {} }]);
              const paraXml = paraRuns.map(runs => {
                if (runs.length === 1 && Object.keys(runs[0].style || {}).length === 0) {
                  return `<text:p>${this._escapeXml(runs[0].text)}</text:p>`;
                }
                const spanXml = runs.map(run => {
                  const styleName = richTextStyleFor(run.style);
                  const styleAttr = styleName ? ` text:style-name="${styleName}"` : "";
                  return `<text:span${styleAttr}>${this._escapeXml(run.text)}</text:span>`;
                }).join("");
                return `<text:p>${spanXml}</text:p>`;
              }).join("");
              cellsXml += `<table:table-cell office:value-type="string"${cellAttrs}>${cellImageXml}${annotationXml}${paraXml}</table:table-cell>`;
            } else {
              const lines = text.split("\n");
              const linesXml = lines.map(line => `<text:p>${this._escapeXml(line)}</text:p>`).join("");
              cellsXml += `<table:table-cell office:value-type="string"${cellAttrs}>${cellImageXml}${annotationXml}${linesXml}</table:table-cell>`;
            }
          }
          previousColumn = columnNumber;
        }
        const rowHidden = layout.hiddenRows.has(rowNumber);
        const rowHeight = layout.rowHeights.get(rowNumber);
        const rowPageBreak = pageBreakRows.has(rowNumber);
        const rowAttrs = [];
        if (Number.isFinite(rowHeight) || rowHidden || rowPageBreak) rowAttrs.push(`table:style-name="${rowStyleFor(Number.isFinite(rowHeight) ? rowHeight : defaultRowHeight, rowPageBreak)}"`);
        if (rowHidden) rowAttrs.push(`table:visibility="collapse"`);
        rowParts.push({ key: rowNumber, xml: `<table:table-row${rowAttrs.length ? ` ${rowAttrs.join(" ")}` : ""}>${cellsXml || "<table:table-cell/>"}</table:table-row>` });
      }
      const rowsXml = this._wrapOutlineGroups(sheetName, rowParts, "row", "table:table-row-group");
      const localNames = (this.grid.namedRangesBySheet?.[sheetName] || []).map(range => this._namedRangeXml(range, sheetName)).join("");
      const printRange = this._printRangeAddress(sheetName, this.grid.printAreaBySheet?.[sheetName]);
      const printRangeAttr = printRange ? ` table:print-ranges="${this._escapeXml(printRange)}"` : "";
      const pageStyle = pageStyleBySheet.get(sheetName);
      const printTitles = this.grid.pageSetupBySheet?.[sheetName]?.printTitles || {};
      const protectedSheet = !!this.grid.protectionBySheet?.[sheetName]?.enabled;
      const protectedAttr = protectedSheet ? ' table:protected="true"' : "";
      const isActiveSheet = sheetName === this.grid.activeSheet;
      const freezeRows = isActiveSheet ? (this.grid.frozenRows || 0) : (this.grid.sheetStates?.[sheetName]?.frozenRows || 0);
      const freezeCols = isActiveSheet ? (this.grid.frozenCols || 0) : (this.grid.sheetStates?.[sheetName]?.frozenCols || 0);
      // vno:frozen-rows/cols: LibreOffice thật KHÔNG ghi lại trạng thái Freeze
      // Panes vào office:settings khi chuyển đổi headless XLSX<->FODS (đã xác
      // nhận qua vòng chuyển đổi soffice thật - xem HANDOFF-SHEET-FREEZE-PANES.md).
      // Lưu riêng ở đây để tự round-trip đúng trong VN Office; khi xuất XLSX
      // thật, postprocess_sheet_xlsx() đọc thuộc tính này để ghi <pane> chuẩn.
      const freezeAttr = (freezeRows > 0 || freezeCols > 0) ? ` vno:frozen-rows="${freezeRows}" vno:frozen-cols="${freezeCols}"` : "";
      // vno:sheet-state: preserve hidden/veryHidden through round-trip.
      // LibreOffice downgrades veryHidden → hidden during XLSX→FODS; the
      // Python overlay writes vno:sheet-state so serializeToFods can echo it.
      const rawVisState = this.grid.sheetVisibilityBySheet?.[sheetName] || "";
      const visStateLower = rawVisState.toLowerCase();
      const sheetStateAttr = (visStateLower === "hidden" || visStateLower === "veryhidden")
        ? ` vno:sheet-state="${visStateLower === "veryhidden" ? "veryHidden" : "hidden"}"`
        : "";
      const pageAttrs = ` table:style-name="${pageStyle.tableStyle}" vno:page-size="${pageStyle.size}" vno:page-orientation="${pageStyle.orientation}" vno:page-margins="${this._escapeXml(JSON.stringify(pageStyle.margins))}" vno:page-scale="${this._escapeXml(JSON.stringify(pageStyle.scale))}" vno:page-header-footer="${this._escapeXml(JSON.stringify(pageStyle.headerFooter))}" vno:page-centering="${this._escapeXml(JSON.stringify(pageStyle.centerOnPage))}" vno:page-print-options="${this._escapeXml(JSON.stringify(pageStyle.printOptions))}" vno:print-title-rows="${this._escapeXml(printTitles.rows || "")}" vno:print-title-cols="${this._escapeXml(printTitles.cols || "")}"${freezeAttr}${sheetStateAttr}`;
      const conditionalXml = conditionalFormatsBySheet[sheetName];
      const chartsXml = this._serializeChartsXml(sheetName);
      const sparklinesXml = this._serializeSparklinesXml(sheetName);
      return `<table:table table:name="${this._escapeXml(sheetName)}"${pageAttrs}${printRangeAttr}${protectedAttr}>${chartsXml}${columnsXml}${rowsXml}${localNames ? `<table:named-expressions>${localNames}</table:named-expressions>` : ""}${conditionalXml ? `<calcext:conditional-formats>${conditionalXml}</calcext:conditional-formats>` : ""}${sparklinesXml}</table:table>`;
    }).join("");

    const dataPilotTables = [];
    for (const [ownerSheet, pivots] of Object.entries(this.grid.pivotTablesBySheet || {})) {
      for (const pivot of pivots || []) {
        const sourceSheet = pivot?.sourceSheet;
        const targetSheet = pivot?.targetSheet || ownerSheet;
        const source = String(pivot?.sourceRange || "").trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!source || !sheetNames.includes(sourceSheet) || !sheetNames.includes(targetSheet)) continue;
        const fields = [];
        for (const field of pivot.rows || []) {
          if (field) fields.push(`<table:data-pilot-field table:source-field-name="${this._escapeXml(field)}" table:orientation="row" table:function="auto"/>`);
        }
        for (const field of pivot.columns || []) {
          if (field) fields.push(`<table:data-pilot-field table:source-field-name="${this._escapeXml(field)}" table:orientation="column" table:function="auto"/>`);
        }
        for (const value of pivot.values || []) {
          const fn = this._dataPilotFunction(value?.aggregate);
          if (value?.field && fn) fields.push(`<table:data-pilot-field table:source-field-name="${this._escapeXml(value.field)}" table:orientation="data" table:function="${fn}"/>`);
        }
        if (!fields.some(field => /table:orientation="data"/.test(field))) continue;
        const sourceRange = {
          start: { c: source[1], r: Number(source[2]) },
          end: { c: source[3], r: Number(source[4]) }
        };
        dataPilotTables.push(`<table:data-pilot-table table:name="${this._escapeXml(pivot.name || pivot.id || `Pivot ${dataPilotTables.length + 1}`)}" table:target-range-address="${this._escapeXml(rangeAddress(targetSheet, usedRange(targetSheet)))}"><table:source-cell-range table:cell-range-address="${this._escapeXml(rangeAddress(sourceSheet, sourceRange))}"/>${fields.join("")}</table:data-pilot-table>`);
      }
    }
    const dataPilotXml = dataPilotTables.length ? `<table:data-pilot-tables>${dataPilotTables.join("")}</table:data-pilot-tables>` : "";

    const activeSheet = sheetNames.includes(this.grid.activeSheet) ? this.grid.activeSheet : sheetNames[0];
    const tableViewsXml = sheetNames.map(sheetName => `<config:config-item-map-entry config:name="${this._escapeXml(sheetName)}">
          <config:config-item config:name="CursorPositionX" config:type="int">0</config:config-item>
          <config:config-item config:name="CursorPositionY" config:type="int">0</config:config-item>
        </config:config-item-map-entry>`).join("");
    const structureProtected = !!this.grid.workbookProtection?.enabled;
    // ODF flag. LibreOffice FODS→XLSX keeps <workbookProtection> but drops
    // lockStructure; native-export post-process restores it (see xlsx-native-postprocess.js).
    const structureAttr = structureProtected ? ' table:structure-protected="true"' : "";
    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 xmlns:dc="http://purl.org/dc/elements/1.1/"
                 xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"
                 xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
                 xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  ${fontFaceDeclsXml}
  ${conditionalNamedStyles.length ? `<office:styles>${conditionalNamedStyles.join("")}</office:styles>` : ""}
  <office:automatic-styles>${pageLayouts.join("")}${tablePageStyles.join("")}${dimensionStyles.join("")}${[...numberFormats.values()].map(format => `${this._numberFormatXml(format.config, format.dataStyle)}<style:style style:name="${format.cellStyle}" style:family="table-cell" style:data-style-name="${format.dataStyle}"/>`).join("")}${[...rotationStyles.values()].map(style => this._rotationCellStyleXml(style.styleName, style.textRotation)).join("")}${rotationCombinedStyles.join("")}${conditionalBaseStyles.join("")}${visualStyleEntries.join("")}${richTextAutoStyles.join("")}</office:automatic-styles>
  <office:master-styles>${masterPages.join("")}</office:master-styles>
  <office:settings>
    <config:config-item-set config:name="ooo:view-settings">
      <config:config-item-map-indexed config:name="Views"><config:config-item-map-entry>
        <config:config-item config:name="ViewId" config:type="string">view1</config:config-item>
        <config:config-item-map-named config:name="Tables">${tableViewsXml}</config:config-item-map-named>
        <config:config-item config:name="ActiveTable" config:type="string">${this._escapeXml(activeSheet)}</config:config-item>
      </config:config-item-map-entry></config:config-item-map-indexed>
    </config:config-item-set>
  </office:settings>
  <office:body><office:spreadsheet${structureAttr}>${validationDefinitions.length ? `<table:content-validations>${validationDefinitions.join("")}</table:content-validations>` : ""}${tablesXml}${this.grid.namedRangesWorkbook?.length ? `<table:named-expressions>${this.grid.namedRangesWorkbook.map(range => this._namedRangeXml(range, range.sheet || activeSheet)).join("")}</table:named-expressions>` : ""}${dataPilotXml}${this._serializeDatabaseRanges(sheetNames)}</office:spreadsheet></office:body>
</office:document>`;
  }

  /**
   * True only when a FODS cell carries something a user would see as content:
   * an actual value attribute, a formula, text, a comment or a validation.
   * A bare office:value-type (what LibreOffice writes on formatted-but-empty
   * cells) does not count — that is what lets the used-range bound in
   * parseFods ignore the million-row repeated tail of real XLSX files.
   */
  _fodsCellHasRealContent(cell) {
    if (cell.getAttribute("vno:original-string") !== null) return true;
    if (cell.getAttribute("table:formula") || cell.getAttribute("vno:formula")) return true;
    if (cell.getAttribute("table:content-validation-name")) return true;
    if (Number(cell.getAttribute("table:number-columns-spanned")) > 1 || Number(cell.getAttribute("table:number-rows-spanned")) > 1) return true;
    for (const attr of ["office:value", "office:string-value", "office:date-value", "office:time-value", "office:boolean-value"]) {
      const value = cell.getAttribute(attr);
      if (value !== null && value !== undefined && value !== "") return true;
    }
    for (const child of Array.from(cell.children)) {
      if (child.localName === "annotation" || child.localName === "frame") return true;
    }
    const paragraphs = cell.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:text:1.0", "p");
    for (const paragraph of Array.from(paragraphs)) {
      if ((paragraph.textContent || "").trim() !== "") return true;
    }
    return false;
  }

  /** Regex-branch twin of _fodsCellHasRealContent (attributes map + raw inner markup). */
  _fodsCellMarkupHasRealContent(attributes, content) {
    if (attributes["vno:original-string"] !== undefined) return true;
    if (attributes["table:formula"] || attributes["vno:formula"] || attributes["table:content-validation-name"]) return true;
    if (Number(attributes["table:number-columns-spanned"]) > 1 || Number(attributes["table:number-rows-spanned"]) > 1) return true;
    for (const attr of ["office:value", "office:string-value", "office:date-value", "office:time-value", "office:boolean-value"]) {
      if (attributes[attr] !== undefined && attributes[attr] !== "") return true;
    }
    const markup = String(content || "");
    if (!markup) return false;
    if (/<office:annotation\b/i.test(markup) || /<draw:frame\b/i.test(markup)) return true;
    return markup.replace(/<[^>]+>/g, "").trim() !== "";
  }

  _cellFromFodsAttributes(attributes, text, numberStyles = new Map(), rotationStyles = new Map(), cellVisualStyles = new Map()) {
    const get = name => attributes[name] ?? "";
    const valueType = get("office:value-type");
    let value = text;
    if (["float", "percentage", "currency"].includes(valueType)) {
      const numericValue = Number(get("office:value"));
      value = Number.isFinite(numericValue) ? numericValue : text;
    } else if (valueType === "boolean") {
      value = get("office:boolean-value") === "true";
    } else if (get("vno:original-string") !== "") {
      value = get("vno:original-string");
    } else if (get("office:string-value")) {
      value = this._decodeImportedCellText(get("office:string-value"));
    }
    const formula = get("vno:formula") || this._formulaFromOdf(get("table:formula"));
    const style = {};
    const numFmtAttr = get("vno:number-format");
    const standardFormat = numberStyles.get(get("table:style-name"));
    const numericTypes = new Set(["float", "percentage", "currency", "date", "time"]);
    if (numFmtAttr && (numericTypes.has(valueType) || !valueType)) {
      try {
        style.numberFormat = JSON.parse(numFmtAttr);
      } catch (e) {
        style.numberFormat = numberFormatFromExcelCode(numFmtAttr);
      }
    } else if (standardFormat && (numericTypes.has(valueType) || !valueType)) {
      style.numberFormat = { ...standardFormat };
    } else if (valueType === "percentage") {
      style.numberFormat = { category: "percentage", decimals: 2 };
    } else if (valueType === "currency") {
      style.numberFormat = { category: "currency", currencySymbol: "₫", decimals: 0, useThousands: true };
    }
    const rotation = rotationStyles.get(get("table:style-name"));
    if (rotation != null) style.textRotation = rotation;
    const visualStyle = cellVisualStyles.get(get("table:style-name"));
    if (visualStyle) {
      for (const [key, val] of Object.entries(visualStyle)) {
        if (val !== undefined && val !== null && val !== "") style[key] = val;
      }
    }
    return { val: value, formula, style };
  }

  _parseCellStyleColors(xmlText) {
    const colors = new Map();
    String(xmlText || "").replace(/<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi, (_, attrs, body = "") => {
      const name = this._unescapeXml(attrs.match(/style:name=["']([^"']*)["']/i)?.[1] || "");
      const display = this._unescapeXml(attrs.match(/style:display-name=["']([^"']*)["']/i)?.[1] || "");
      const color = (body.match(/fo:background-color=["']([^"']+)["']/i)?.[1] || "").trim().toLowerCase();
      if (name && color && color !== "transparent") {
        colors.set(name, color);
        if (display) colors.set(display, color);
      }
      return "";
    });
    return colors;
  }

  _parseOdfTargetRange(address, fallbackSheet) {
    const raw = this._unescapeXml(String(address || "")).trim();
    if (!raw) return null;
    const parsePart = token => {
      const text = String(token || "").trim();
      const quoted = text.match(/^'([^']+)'\.(.+)$/);
      if (quoted) return { sheet: quoted[1], cell: quoted[2].replace(/\$/g, "").toUpperCase() };
      const dotted = text.match(/^([^'.]+)\.(.+)$/);
      if (dotted && /[A-Z]+\d+/i.test(dotted[2])) {
        return { sheet: dotted[1], cell: dotted[2].replace(/\$/g, "").toUpperCase() };
      }
      return { sheet: fallbackSheet, cell: text.replace(/\$/g, "").toUpperCase() };
    };
    const parts = raw.split(":").map(part => part.trim()).filter(Boolean);
    const start = parsePart(parts[0]);
    const end = parts[1] ? parsePart(parts[1]) : start;
    const startCell = start.cell.match(/^([A-Z]+)(\d+)$/i);
    const endCell = end.cell.match(/^([A-Z]+)(\d+)$/i);
    if (!startCell || !endCell) return null;
    return {
      sheet: start.sheet || fallbackSheet || "",
      range: {
        start: { c: startCell[1].toUpperCase(), r: Number(startCell[2]) },
        end: { c: endCell[1].toUpperCase(), r: Number(endCell[2]) }
      }
    };
  }

  _parseConditionalCondition(value, styleName, colors) {
    const raw = this._unescapeXml(String(value || "")).trim();
    const color = colors.get(styleName) || colors.get(String(styleName || "").replace(/_5f_/g, "_")) || "#fff2cc";
    const greater = raw.match(/^(?:cell-content\(\)\s*)?>\s*([+-]?\d+(?:\.\d+)?)$/i);
    if (greater) return { type: "greaterThan", value: Number(greater[1]), color };
    const less = raw.match(/^(?:cell-content\(\)\s*)?<\s*([+-]?\d+(?:\.\d+)?)$/i);
    if (less) return { type: "lessThan", value: Number(less[1]), color };
    if (/empty|blank|LEN\s*\(\s*TRIM|cell-content\(\)\s*=\s*""/i.test(raw)) {
      return { type: "blank", value: null, color };
    }
    return null;
  }

  _parseValidationCondition(condition) {
    const raw = this._unescapeXml(String(condition || ""));
    const listMatch = raw.match(/cell-content-is-in-list\((.+)\)\s*$/i);
    if (listMatch) {
      const inner = listMatch[1];
      const parts = inner.includes(";") ? inner.split(";") : inner.split(",");
      const values = parts.map(part => part.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      return values.length ? { type: "list", values } : null;
    }
    const between = raw.match(/cell-content-is-between\(\s*([+-]?\d+(?:\.\d+)?)\s*[,;]\s*([+-]?\d+(?:\.\d+)?)\s*\)/i);
    if (between) return { type: "numberRange", min: Number(between[1]), max: Number(between[2]) };
    return null;
  }

  _rangeFromCoords(coords) {
    if (!coords.length) return null;
    const parsed = coords.map(coord => {
      const match = String(coord).match(/^([A-Z]+)(\d+)$/i);
      return match ? { c: match[1].toUpperCase(), r: Number(match[2]) } : null;
    }).filter(Boolean);
    if (!parsed.length) return null;
    const colNumber = name => this._columnNumber(name);
    parsed.sort((a, b) => colNumber(a.c) - colNumber(b.c) || a.r - b.r);
    const cols = parsed.map(item => item.c).sort((a, b) => colNumber(a) - colNumber(b));
    const rows = parsed.map(item => item.r);
    return { start: { c: cols[0], r: Math.min(...rows) }, end: { c: cols[cols.length - 1], r: Math.max(...rows) } };
  }

  _attachImportedRules(workbook, xmlText) {
    const colors = this._parseCellStyleColors(xmlText);
    workbook.conditionalFormattingBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, []]));
    workbook.dataValidationsBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, []]));

    let cfIndex = 0;
    String(xmlText || "").replace(/<calcext:conditional-format\b([^>]*)>([\s\S]*?)<\/calcext:conditional-format>/gi, (_, attrs, body) => {
      const target = this._parseOdfTargetRange(attrs.match(/calcext:target-range-address=["']([^"']*)["']/i)?.[1] || "", workbook.sheets[0]);
      if (!target?.range || !workbook.conditionalFormattingBySheet[target.sheet]) return "";
      body.replace(/<calcext:condition\b([^>]*)\/?\s*>/gi, (all, conditionAttrs) => {
        const styleName = this._unescapeXml(conditionAttrs.match(/calcext:apply-style-name=["']([^"']*)["']/i)?.[1] || "");
        const value = this._unescapeXml(conditionAttrs.match(/calcext:value=["']([^"']*)["']/i)?.[1] || "");
        const parsed = this._parseConditionalCondition(value, styleName, colors);
        if (!parsed) return "";
        workbook.conditionalFormattingBySheet[target.sheet].push({
          id: `cf-import-${++cfIndex}`,
          range: target.range,
          type: parsed.type,
          value: parsed.value,
          color: parsed.color
        });
        return "";
      });
      return "";
    });

    const definitions = new Map();
    String(xmlText || "").replace(/<table:content-validation\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      if (!name) return "";
      definitions.set(name, {
        condition: this._unescapeXml(attrs.match(/table:condition=["']([^"']*)["']/i)?.[1] || ""),
        base: this._unescapeXml(attrs.match(/table:base-cell-address=["']([^"']*)["']/i)?.[1] || "")
      });
      return "";
    });

    const hitsByName = new Map();
    for (const hit of workbook.validationHits || []) {
      if (!hitsByName.has(hit.name)) hitsByName.set(hit.name, []);
      hitsByName.get(hit.name).push(hit);
    }

    let dvIndex = 0;
    for (const [name, definition] of definitions.entries()) {
      const parsed = this._parseValidationCondition(definition.condition);
      if (!parsed) continue;
      const hits = hitsByName.get(name) || [];
      const bySheet = new Map();
      for (const hit of hits) {
        if (!bySheet.has(hit.sheet)) bySheet.set(hit.sheet, []);
        bySheet.get(hit.sheet).push(hit.coord);
      }
      if (!bySheet.size && definition.base) {
        const target = this._parseOdfTargetRange(definition.base, workbook.sheets[0]);
        if (target?.sheet) bySheet.set(target.sheet, [`${target.range.start.c}${target.range.start.r}`]);
      }
      for (const [sheet, coords] of bySheet.entries()) {
        const range = this._rangeFromCoords(coords);
        if (!range || !workbook.dataValidationsBySheet[sheet]) continue;
        workbook.dataValidationsBySheet[sheet].push({
          id: `dv-import-${++dvIndex}`,
          range,
          ...parsed
        });
      }
    }
    delete workbook.validationHits;
  }

  _mapDataPilotFunction(fn) {
    const raw = String(fn || "sum").trim().toLowerCase();
    if (raw === "count" || raw === "countnums") return "COUNT";
    if (raw === "average") return "AVERAGE";
    if (raw === "min") return "MIN";
    if (raw === "max") return "MAX";
    if (raw === "sum" || raw === "auto" || raw === "") return "SUM";
    return null;
  }

  _dataPilotFunction(aggregate) {
    const raw = String(aggregate || "SUM").trim().toUpperCase();
    return ({ SUM: "sum", COUNT: "count", AVERAGE: "average", MIN: "min", MAX: "max" })[raw] || null;
  }

  _a1FromOdfRange(parsed) {
    if (!parsed?.range) return "";
    const start = `${parsed.range.start.c}${parsed.range.start.r}`;
    const end = `${parsed.range.end.c}${parsed.range.end.r}`;
    return start === end ? start : `${start}:${end}`;
  }

  /**
   * Nested chart objects inline `table:table name="local-table"`. The table regex
   * `<table:table\b` also matches `<table:table-row`, so an unstripped chart FODS
   * leaks a fake worksheet. Strip embedded objects before cell parsing.
   */
  _xmlWithoutEmbeddedObjects(xmlText) {
    return String(xmlText || "").replace(/<draw:object\b([^>]*)>([\s\S]*?)<\/draw:object>/gi, "<draw:object$1/>");
  }

  _mapOdfChartClass(value) {
    const raw = String(value || "").replace(/^chart:/i, "").trim().toLowerCase();
    if (raw === "bar" || raw === "column") return "bar";
    if (raw === "line") return "line";
    if (raw === "area") return "area";
    if (raw === "circle" || raw === "ring" || raw === "pie") return "pie";
    return null;
  }

  _unionOdfRanges(ranges, fallbackSheet) {
    if (!ranges.length) return null;
    const sheet = ranges.find(item => item.sheet)?.sheet || fallbackSheet || "";
    let minColumn = Infinity;
    let maxColumn = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;
    for (const item of ranges) {
      if (item.sheet && sheet && item.sheet !== sheet) continue;
      const columns = [this._columnNumber(item.range.start.c), this._columnNumber(item.range.end.c)];
      const rows = [Number(item.range.start.r), Number(item.range.end.r)];
      minColumn = Math.min(minColumn, ...columns);
      maxColumn = Math.max(maxColumn, ...columns);
      minRow = Math.min(minRow, ...rows);
      maxRow = Math.max(maxRow, ...rows);
    }
    if (!Number.isFinite(minColumn) || minColumn < 1 || !Number.isFinite(minRow) || minRow < 1) return null;
    return {
      sheet,
      range: {
        start: { c: this._columnName(minColumn), r: minRow },
        end: { c: this._columnName(maxColumn), r: maxRow }
      }
    };
  }

  _columnsForChartExtract() {
    if (Array.isArray(this.grid?.cols) && this.grid.cols.length) return this.grid.cols;
    return Array.from({ length: 26 }, (_, index) => this._columnName(index + 1));
  }

  /**
   * Map ODF `<chart:chart>` (LibreOffice Calc / Excel chart after soffice XLSX→FODS)
   * onto the existing VN Sheet chartsBySheet object:
   * { id, type, range, title, labels, data }.
   *
   * Supported classes: bar/column, line, area, circle/ring/pie — the four SVG types
   * VN Sheet already renders. First series only (engine is single-series).
   * Same-sheet source range required because extractRangeData reads one sheet Map.
   */
  _attachImportedCharts(workbook, xmlText) {
    workbook.chartsBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, []]));
    let index = 0;
    String(xmlText || "").replace(/<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi, (_, frameAttrs, body) => {
      const chartMatch = body.match(/<chart:chart\b([^>]*)>([\s\S]*?)<\/chart:chart>/i);
      if (!chartMatch) return "";
      const type = this._mapOdfChartClass(chartMatch[1].match(/chart:class=["']([^"']+)["']/i)?.[1] || "");
      const seriesAttrs = [];
      chartMatch[2].replace(/<chart:series\b([^>]*)(?:\/>|>([\s\S]*?)<\/chart:series>)/gi, (all, attrs) => {
        seriesAttrs.push(attrs);
        return "";
      });
      if (!type || !seriesAttrs.length) return "";
      const seriesType = this._mapOdfChartClass(seriesAttrs[0].match(/chart:class=["']([^"']+)["']/i)?.[1] || "") || type;
      const titleXml = chartMatch[2].match(/<chart:title\b[^>]*>([\s\S]*?)<\/chart:title>/i)?.[1] || "";
      const title = this._unescapeXml(titleXml.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      const categoryAttrs = chartMatch[2].match(/<chart:categories\b([^>]*)\/?\s*>/i)?.[1] || "";
      const ranges = [];
      const values = this._parseOdfTargetRange(
        seriesAttrs[0].match(/chart:values-cell-range-address=["']([^"']+)["']/i)?.[1] || "",
        workbook.sheets[0]
      );
      if (values) ranges.push(values);
      const categories = this._parseOdfTargetRange(
        categoryAttrs.match(/table:cell-range-address=["']([^"']+)["']/i)?.[1] || "",
        workbook.sheets[0]
      );
      if (categories) ranges.push(categories);
      const union = this._unionOdfRanges(ranges, workbook.sheets[0]);
      if (!union?.range || !union.sheet || !workbook.sheets.includes(union.sheet)) return "";
      const chart = {
        id: `chart-import-${++index}`,
        type: seriesType,
        range: union.range,
        title: title || `Biểu đồ ${this._a1FromOdfRange(union)}`,
        labels: [],
        data: [],
        imported: true,
        seriesCount: seriesAttrs.length
      };
      if (this._unescapeXml(String(frameAttrs || "").match(/vno:chart-kind=["']([^"']+)["']/i)?.[1] || "") === "pivot") {
        chart.kind = "pivot";
        chart.pivotId = this._unescapeXml(String(frameAttrs || "").match(/vno:pivot-id=["']([^"']+)["']/i)?.[1] || "");
      }
      const cells = workbook.sheetsData[union.sheet];
      if (cells instanceof Map) {
        const extracted = SheetChartBuilder.extractRangeData(cells, chart.range, this._columnsForChartExtract());
        chart.labels = extracted.labels;
        chart.data = extracted.data;
      }
      workbook.chartsBySheet[union.sheet].push(chart);
      return "";
    });
  }

  /**
   * Map ODF DataPilot (LibreOffice Calc / Excel Pivot Table after soffice XLSX→FODS)
   * onto the existing VN Sheet pivotTablesBySheet object:
   * { id, name, sourceSheet, sourceRange, rows, columns, values[{field,aggregate}], targetSheet }.
   *
   * Only cell-range DataPilots with a value field using SUM/COUNT/AVERAGE/MIN/MAX.
   * Page/hidden/data-layout fields are skipped. Same-sheet output is skipped because
   * refreshPivotTable() replaces the whole target sheet and would wipe the source.
   */
  _attachImportedPivots(workbook, xmlText) {
    workbook.pivotTablesBySheet = Object.fromEntries((workbook.sheets || []).map(name => [name, []]));
    let index = 0;
    String(xmlText || "").replace(/<table:data-pilot-table\b([^>]*)>([\s\S]*?)<\/table:data-pilot-table>/gi, (_, attrs, body) => {
      const name = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      const target = this._parseOdfTargetRange(
        attrs.match(/table:target-range-address=["']([^"']*)["']/i)?.[1] || "",
        workbook.sheets[0]
      );
      const sourceMatch = body.match(/<table:source-cell-range\b([^>]*)\/?\s*>/i);
      const source = this._parseOdfTargetRange(
        sourceMatch?.[1]?.match(/table:cell-range-address=["']([^"']*)["']/i)?.[1] || "",
        workbook.sheets[0]
      );
      if (!source?.sheet || !source.range) return "";
      const sourceRange = this._a1FromOdfRange(source);
      if (!sourceRange.includes(":")) return "";

      const rows = [];
      const columns = [];
      const values = [];
      body.replace(/<table:data-pilot-field\b([^>]*)(?:\/>|>([\s\S]*?)<\/table:data-pilot-field>)/gi, (all, fieldAttrs) => {
        if (/table:is-data-layout-field=["']true["']/i.test(fieldAttrs)) return "";
        const fieldName = this._unescapeXml(fieldAttrs.match(/table:source-field-name=["']([^"']*)["']/i)?.[1] || "").trim();
        const orientation = (fieldAttrs.match(/table:orientation=["']([^"']*)["']/i)?.[1] || "").trim().toLowerCase();
        if (!fieldName || orientation === "hidden" || orientation === "page") return "";
        if (orientation === "row") rows.push(fieldName);
        else if (orientation === "column") columns.push(fieldName);
        else if (orientation === "data") {
          const aggregate = this._mapDataPilotFunction(fieldAttrs.match(/table:function=["']([^"']*)["']/i)?.[1] || "sum");
          if (aggregate) values.push({ field: fieldName, aggregate });
        }
        return "";
      });
      if (!values.length) return "";

      const targetSheet = target?.sheet || source.sheet;
      if (!workbook.sheets.includes(source.sheet) || !workbook.sheets.includes(targetSheet)) return "";
      if (targetSheet === source.sheet) return "";

      if (!workbook.pivotTablesBySheet[targetSheet]) workbook.pivotTablesBySheet[targetSheet] = [];
      workbook.pivotTablesBySheet[targetSheet].push({
        id: `pivot-import-${++index}`,
        name: name || `pivot-import-${index}`,
        sourceSheet: source.sheet,
        sourceRange,
        rows,
        columns,
        values,
        targetSheet,
        imported: true
      });
      return "";
    });
  }

  /** Parse FODS into every worksheet, including repeated rows/cells emitted by LibreOffice. */
  parseFods(xmlText) {
    const workbook = { sheets: [], sheetsData: {}, activeSheet: "", commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesWorkbook: [], namedRangesBySheet: {}, printAreaBySheet: {}, pageSetupBySheet: {}, validationHits: [], rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {} };
    if (!xmlText) return workbook;
    const tableXml = this._xmlWithoutEmbeddedObjects(xmlText);
    const numberStyles = this._parseNumberStyles(tableXml);
    const rotationStyles = this._parseRotationStyles(tableXml);
    const cellVisualStyles = this._parseCellVisualStyles(tableXml);
    const textStyles = this._parseTextStyles(tableXml);
    const rowColStyles = this._parseRowColStyles(tableXml);
    const defaultRowHeight = this.grid?.rowHeight || 26;
    const defaultColWidth = this.grid?.defaultColWidth || 100;
    const tableBlocks = [];
    tableXml.replace(/<table:table(?=[\s>/])([^>]*)>([\s\S]*?)<\/table:table>/gi, all => { tableBlocks.push(all); return all; });
    const workbookOnlyXml = tableBlocks.reduce((text, block) => text.replace(block, ""), tableXml);
    let workbookNameIndex = 0;
    workbookOnlyXml.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const range = this._parseNamedRangeElement(attrs, "workbook", "", ++workbookNameIndex);
      if (range) workbook.namedRangesWorkbook.push(range);
      return "";
    });

    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(tableXml, "text/xml");
      if (!doc.querySelector("parsererror")) {
        const configItems = Array.from(doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:config:1.0", "config-item"));
        workbook.activeSheet = configItems.find(item => item.getAttribute("config:name") === "ActiveTable")?.textContent || "";
        const tables = Array.from(doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:table:1.0", "table"))
          .filter(table => table.getAttribute("table:name") !== "local-table");
        tables.forEach((table, tableIndex) => {
          const name = table.getAttribute("table:name") || `Trang tính ${tableIndex + 1}`;
          const printArea = this._parsePrintRangeAddress(table.getAttribute("table:print-ranges"));
          let pageMargins = {};
          try { pageMargins = JSON.parse(table.getAttribute("vno:page-margins") || "{}"); } catch (_) { pageMargins = {}; }
          let pageScale = {};
          try { pageScale = JSON.parse(table.getAttribute("vno:page-scale") || "{}"); } catch (_) { pageScale = {}; }
          let pageHeaderFooter = {};
          try { pageHeaderFooter = JSON.parse(table.getAttribute("vno:page-header-footer") || "{}"); } catch (_) { pageHeaderFooter = {}; }
          let pageCentering = {};
          try { pageCentering = JSON.parse(table.getAttribute("vno:page-centering") || "{}"); } catch (_) { pageCentering = {}; }
          let pagePrintOptions = {};
          try { pagePrintOptions = JSON.parse(table.getAttribute("vno:page-print-options") || "{}"); } catch (_) { pagePrintOptions = {}; }
          // Thuộc tính vno:page-* chỉ tồn tại khi chính VN Office ghi ra và CHƯA từng qua vòng
          // chuyển đổi thật nào (LibreOffice/Excel không giữ lại thuộc tính lạ khi convert).
          // Với file thật (mở lần đầu từ Excel/LibreOffice, hoặc đã convert qua lại), phải đọc
          // Page Setup chuẩn ODF thật (style:page-layout-properties) làm nguồn dự phòng.
          const standardLayout = this._parseStandardOdfPageLayout(tableXml, table.getAttribute("table:style-name"));
          const pageSetup = {
            size: table.getAttribute("vno:page-size") || standardLayout?.size || "a4",
            orientation: table.getAttribute("vno:page-orientation") || standardLayout?.orientation || "portrait",
            margins: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78, ...(standardLayout?.margins || {}), ...pageMargins },
            scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0, ...(standardLayout?.scale || {}), ...pageScale },
            headerFooter: { header: { left: "", center: "", right: "", ...(pageHeaderFooter.header || {}) }, footer: { left: "", center: "Trang &P / &N", right: "", ...(pageHeaderFooter.footer || {}) } },
            centerOnPage: { horizontal: false, vertical: false, ...(standardLayout?.centerOnPage || {}), ...pageCentering },
            printOptions: { gridlines: false, headings: false, ...(standardLayout?.printOptions || {}), ...pagePrintOptions },
            printTitles: { rows: table.getAttribute("vno:print-title-rows") || "", cols: table.getAttribute("vno:print-title-cols") || "" }
          };
          if (!pageSetup.printTitles.rows && !pageSetup.printTitles.cols) {
            const standardTitles = this._parseStandardPrintTitles(tableXml, name);
            if (standardTitles) {
              pageSetup.printTitles = standardTitles;
            }
          }
          const data = new Map();
          const comments = {};
          const mergedRanges = [];
          const images = [];
          const localRanges = [];
          const arrayFormulas = [];
          let localNameIndex = 0;
          table.outerHTML.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
            const range = this._parseNamedRangeElement(attrs, "sheet", name, ++localNameIndex);
            if (range) localRanges.push(range);
            return "";
          });
          const rowHeights = new Map();
          const hiddenRows = new Set();
          let rowNumber = 1;
          const rowElements = Array.from(table.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:table:1.0", "table-row"));

          // LibreOffice collapses the formatted-but-empty tail of a real XLSX into
          // one <table:table-row table:number-rows-repeated="1048570"> (and the
          // same for columns, up to 16384). Those cells still carry
          // office:value-type, so "has a value-type" cannot mean "has data" —
          // expanding them literally creates millions of Map entries and hangs
          // the app. Bound materialization to the used range like Excel does:
          // pre-scan for the last row/column holding REAL content, then never
          // expand a repeat that lies entirely beyond it.
          let lastDataRow = 0;
          let lastDataCol = 0;
          {
            let scanRow = 1;
            for (const row of rowElements) {
              const scanRepeat = Math.max(1, Number(row.getAttribute("table:number-rows-repeated")) || 1);
              let scanCol = 1;
              let rowHasData = false;
              for (const cell of Array.from(row.children)) {
                if (!["table-cell", "covered-table-cell"].includes(cell.localName)) continue;
                const colRepeat = Math.max(1, Number(cell.getAttribute("table:number-columns-repeated")) || 1);
                if (this._fodsCellHasRealContent(cell)) {
                  rowHasData = true;
                  lastDataCol = Math.max(lastDataCol, scanCol + colRepeat - 1);
                }
                scanCol += colRepeat;
              }
              if (rowHasData) lastDataRow = scanRow + scanRepeat - 1;
              scanRow += scanRepeat;
            }
          }

          const columnStyles = [];
          const colWidths = new Map();
          const hiddenCols = new Set();
          let layoutColumn = 1;
          const effectiveColLimit = Math.max(lastDataCol, 26);
          Array.from(table.children).filter(element => element.localName === "table-column").forEach(column => {
            const repeat = Math.max(1, Number(column.getAttribute("table:number-columns-repeated")) || 1);
            const styleName = this._tableAttr(column, "style-name");
            const visibility = this._tableAttr(column, "visibility").toLowerCase();
            const widthPx = rowColStyles.columns.get(styleName)?.widthPx;
            const defaultCellStyle = column.getAttribute("table:default-cell-style-name") || "";
            for (let index = 0; index < repeat; index++) {
              if (layoutColumn <= effectiveColLimit) {
                columnStyles.push(defaultCellStyle);
                const colName = this._columnName(layoutColumn);
                if (Number.isFinite(widthPx) && !this._isCloseToDefault(widthPx, defaultColWidth)) colWidths.set(colName, widthPx);
                if (visibility === "collapse") hiddenCols.add(colName);
              }
              layoutColumn++;
            }
          });

          rowElements.forEach(row => {
            const rowRepeat = Math.max(1, Number(row.getAttribute("table:number-rows-repeated")) || 1);
            const rowStyleName = this._tableAttr(row, "style-name");
            const rowVisibility = this._tableAttr(row, "visibility").toLowerCase();
            const heightPx = rowColStyles.rows.get(rowStyleName)?.heightPx;

            if (rowNumber > lastDataRow && (rowRepeat > 32 || rowNumber > lastDataRow + 1000) && rowVisibility !== "collapse") {
              rowNumber += rowRepeat;
              return;
            }

            for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
              if (rowRepeat <= 32 || rowVisibility === "collapse") {
                if (Number.isFinite(heightPx) && !this._isCloseToDefault(heightPx, defaultRowHeight)) rowHeights.set(rowNumber, heightPx);
                if (rowVisibility === "collapse") hiddenRows.add(rowNumber);
              }
              if (rowNumber > lastDataRow) {
                rowNumber++;
                continue;
              }
              let columnNumber = 1;
              Array.from(row.children).filter(cell => ["table-cell", "covered-table-cell"].includes(cell.localName)).forEach(cell => {
                const columnRepeat = Math.max(1, Number(cell.getAttribute("table:number-columns-repeated")) || 1);
                const attributes = Object.fromEntries(Array.from(cell.attributes).map(attr => [attr.name, attr.value]));
                const isCovered = cell.localName === "covered-table-cell";
                const mergedColumns = Math.max(1, Number(attributes["table:number-columns-spanned"]) || 1);
                const mergedRows = Math.max(1, Number(attributes["table:number-rows-spanned"]) || 1);
                if (!isCovered && (mergedColumns > 1 || mergedRows > 1)) {
                  for (let repeat = 0; repeat < columnRepeat; repeat++) {
                    mergedRanges.push({
                      start: { c: this._columnName(columnNumber + repeat), r: rowNumber },
                      end: { c: this._columnName(columnNumber + repeat + mergedColumns - 1), r: rowNumber + mergedRows - 1 }
                    });
                  }
                }
                if (!attributes["table:style-name"] && columnStyles[columnNumber - 1]) attributes["table:style-name"] = columnStyles[columnNumber - 1];
                const annotation = Array.from(cell.children).find(child => child.localName === "annotation");
                const paragraphs = Array.from(cell.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:text:1.0", "p")).filter(paragraph => !annotation?.contains(paragraph));
                const text = this._decodeImportedCellText(paragraphs.map(paragraph => paragraph.textContent || "").join("\n"));
                const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"] || text !== "" || annotation || attributes["table:content-validation-name"];
                if (hasValue && !isCovered) {
                  const item = this._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles);
                  // Extract rich text runs from <text:span> elements
                  if (textStyles.size > 0) {
                    const cellVisual = cellVisualStyles.get(attributes["table:style-name"]) || {};
                    const rt = this._extractRichTextFromDom(cell, textStyles, cellVisual);
                    if (rt.runs) {
                      item.richText = rt.runs;
                      item.val = attributes["vno:original-string"] ?? rt.text;
                    }
                  }
                  const matrixColumns = Math.max(1, Number(attributes["table:number-matrix-columns-spanned"]) || 1);
                  const matrixRows = Math.max(1, Number(attributes["table:number-matrix-rows-spanned"]) || 1);
                  if ((attributes["table:number-matrix-columns-spanned"] || attributes["table:number-matrix-rows-spanned"]) && item.formula) {
                    arrayFormulas.push({ column: columnNumber, row: rowNumber, columns: matrixColumns, rows: matrixRows, formula: item.formula });
                  }
                  // A style-only cell keeps its entries inside the used range so
                  // borders/fills on blank table cells survive; past lastDataCol it
                  // is the collapsed empty tail and must not be expanded.
                  const materializeRepeat = this._fodsCellHasRealContent(cell)
                    ? columnRepeat
                    : Math.max(0, Math.min(columnRepeat, lastDataCol - columnNumber + 1));
                  for (let repeat = 0; repeat < materializeRepeat; repeat++) {
                    const coord = `${this._columnName(columnNumber + repeat)}${rowNumber}`;
                    data.set(coord, { ...item });
                    if (attributes["table:content-validation-name"]) {
                      workbook.validationHits.push({ sheet: name, coord, name: attributes["table:content-validation-name"] });
                    }
                    if (annotation) comments[coord] = {
                      coord,
                      text: Array.from(annotation.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:text:1.0", "p")).map(p => p.textContent || "").join("\n"),
                      author: annotation.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "creator")[0]?.textContent || annotation.getAttribute("office:author") || "",
                      timestamp: annotation.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "date")[0]?.textContent || annotation.getAttribute("office:create-date") || ""
                    };
                  }
                }
                if (!isCovered) {
                  const embeddedImage = this._parseCellEmbeddedImageDom(cell, `Image${images.length + 1}`);
                  if (embeddedImage) images.push({ ...embeddedImage, anchor: { c: this._columnName(columnNumber), r: rowNumber } });
                }
                columnNumber += columnRepeat;
              });
              rowNumber++;
            }
          });
          arrayFormulas.forEach(region => this._restoreArrayFormula(data, region.column, region.row, region.columns, region.rows, region.formula));
          this._applyXlsxLayoutOverlay(table.getAttribute("vno:xlsx-layout"), rowHeights, colWidths);
          workbook.sheets.push(name);
          workbook.sheetsData[name] = data;
          workbook.commentsBySheet[name] = comments;
          workbook.mergedRangesBySheet[name] = mergedRanges;
          workbook.namedRangesBySheet[name] = localRanges;
          workbook.printAreaBySheet[name] = printArea;
          workbook.pageSetupBySheet[name] = pageSetup;
          workbook.rowHeightsBySheet[name] = rowHeights;
          workbook.colWidthsBySheet[name] = colWidths;
          workbook.userHiddenRowsBySheet[name] = hiddenRows;
          workbook.userHiddenColsBySheet[name] = hiddenCols;
          workbook.imagesBySheet = workbook.imagesBySheet || {};
          workbook.imagesBySheet[name] = images;
        });
      }
    }

    if (workbook.sheets.length === 0) {
      const activeMatch = tableXml.match(/<config:config-item[^>]*config:name=["']ActiveTable["'][^>]*>([\s\S]*?)<\/config:config-item>/i);
      workbook.activeSheet = activeMatch ? this._unescapeXml(activeMatch[1].replace(/<[^>]+>/g, "")) : "";
      const tableRegex = /<table:table(?=[\s>/])([^>]*)>([\s\S]*?)<\/table:table>/gi;
      let tableMatch;
      let tableIndex = 0;
      while ((tableMatch = tableRegex.exec(tableXml)) !== null) {
        tableIndex++;
        const nameMatch = tableMatch[1].match(/table:name=["']([^"']*)["']/i);
        const name = this._unescapeXml(nameMatch?.[1] || `Trang tính ${tableIndex}`);
        const printRangeMatch = tableMatch[1].match(/table:print-ranges=["']([^"']*)["']/i);
        const printArea = this._parsePrintRangeAddress(this._unescapeXml(printRangeMatch?.[1] || ""));
        const pageAttr = key => this._unescapeXml(tableMatch[1].match(new RegExp(`${key}=["']([^"']*)["']`, "i"))?.[1] || "");
        let pageMargins = {};
        try { pageMargins = JSON.parse(pageAttr("vno:page-margins") || "{}"); } catch (_) { pageMargins = {}; }
        let pageScale = {};
        try { pageScale = JSON.parse(pageAttr("vno:page-scale") || "{}"); } catch (_) { pageScale = {}; }
        let pageHeaderFooter = {};
        try { pageHeaderFooter = JSON.parse(pageAttr("vno:page-header-footer") || "{}"); } catch (_) { pageHeaderFooter = {}; }
        let pageCentering = {};
        try { pageCentering = JSON.parse(pageAttr("vno:page-centering") || "{}"); } catch (_) { pageCentering = {}; }
        let pagePrintOptions = {};
        try { pagePrintOptions = JSON.parse(pageAttr("vno:page-print-options") || "{}"); } catch (_) { pagePrintOptions = {}; }
        // Xem chú thích ở nhánh DOM phía trên: vno:page-* chỉ có khi VN Office ghi ra và chưa
        // qua vòng chuyển đổi thật nào; file thật cần đọc style:page-layout-properties chuẩn ODF.
        const tableStyleMatch = tableMatch[1].match(/table:style-name=["']([^"']*)["']/i);
        const standardLayout = this._parseStandardOdfPageLayout(tableXml, this._unescapeXml(tableStyleMatch?.[1] || ""));
        const pageSetup = {
          size: pageAttr("vno:page-size") || standardLayout?.size || "a4",
          orientation: pageAttr("vno:page-orientation") || standardLayout?.orientation || "portrait",
          margins: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78, ...(standardLayout?.margins || {}), ...pageMargins },
          scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0, ...(standardLayout?.scale || {}), ...pageScale },
          headerFooter: { header: { left: "", center: "", right: "", ...(pageHeaderFooter.header || {}) }, footer: { left: "", center: "Trang &P / &N", right: "", ...(pageHeaderFooter.footer || {}) } },
          centerOnPage: { horizontal: false, vertical: false, ...(standardLayout?.centerOnPage || {}), ...pageCentering },
          printOptions: { gridlines: false, headings: false, ...(standardLayout?.printOptions || {}), ...pagePrintOptions },
          printTitles: { rows: pageAttr("vno:print-title-rows"), cols: pageAttr("vno:print-title-cols") }
        };
        if (!pageSetup.printTitles.rows && !pageSetup.printTitles.cols) {
          const standardTitles = this._parseStandardPrintTitles(tableXml, name);
          if (standardTitles) {
            pageSetup.printTitles = standardTitles;
          }
        }
        const data = new Map();
        const comments = {};
        const mergedRanges = [];
        const images = [];
        const localRanges = [];
        const arrayFormulas = [];
        let localNameIndex = 0;
        tableMatch[2].replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
          const range = this._parseNamedRangeElement(attrs, "sheet", name, ++localNameIndex);
          if (range) localRanges.push(range);
          return "";
        });
        const rowHeights = new Map();
        const hiddenRows = new Set();
        let rowNumber = 1;
        const rowRegex = /<table:table-row(?=[\s>/])([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/gi;
        const cellRegexSource = /<(?:table:)?(table-cell|covered-table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:table:)?(?:table-cell|covered-table-cell)>)/gi;
        // Same used-range bound as the DOM branch above (see the comment there):
        // never expand a number-rows/columns-repeated tail that holds no real content.
        let lastDataRow = 0;
        let lastDataCol = 0;
        {
          const scanRowRegex = new RegExp(rowRegex.source, "gi");
          let scanRow = 1;
          let scanRowMatch;
          while ((scanRowMatch = scanRowRegex.exec(tableMatch[2])) !== null) {
            const scanRepeat = Math.max(1, Number(scanRowMatch[1].match(/table:number-rows-repeated=["'](\d+)["']/i)?.[1]) || 1);
            const scanCellRegex = new RegExp(cellRegexSource.source, "gi");
            let scanCol = 1;
            let rowHasData = false;
            let scanCellMatch;
            while ((scanCellMatch = scanCellRegex.exec(scanRowMatch[2] || "")) !== null) {
              const scanAttrs = {};
              scanCellMatch[2].replace(/([\w:-]+)=["']([^"']*)["']/g, (_, key, value) => { scanAttrs[key] = value; return ""; });
              const colRepeat = Math.max(1, Number(scanAttrs["table:number-columns-repeated"]) || 1);
              if (this._fodsCellMarkupHasRealContent(scanAttrs, scanCellMatch[3] || "")) {
                rowHasData = true;
                lastDataCol = Math.max(lastDataCol, scanCol + colRepeat - 1);
              }
              scanCol += colRepeat;
            }
            if (rowHasData) lastDataRow = scanRow + scanRepeat - 1;
            scanRow += scanRepeat;
          }
        }
        const columnStyles = [];
        const colWidths = new Map();
        const hiddenCols = new Set();
        let layoutColumn = 1;
        const effectiveColLimit = Math.max(lastDataCol, 26);
        tableMatch[2].replace(/<table:table-column(?=[\s>/])([^>]*)\/?\s*>/gi, (_, attrs) => {
          const repeat = Math.max(1, Number(attrs.match(/table:number-columns-repeated=["'](\d+)["']/i)?.[1]) || 1);
          const defaultCellStyle = this._unescapeXml(attrs.match(/table:default-cell-style-name=["']([^"']*)["']/i)?.[1] || "");
          const styleName = this._unescapeXml(attrs.match(/table:style-name=["']([^"']*)["']/i)?.[1] || "");
          const visibility = (attrs.match(/table:visibility=["']([^"']*)["']/i)?.[1] || "").toLowerCase();
          const widthPx = rowColStyles.columns.get(styleName)?.widthPx;
          for (let index = 0; index < repeat; index++) {
            if (layoutColumn <= effectiveColLimit) {
              columnStyles.push(defaultCellStyle);
              const colName = this._columnName(layoutColumn);
              if (Number.isFinite(widthPx) && !this._isCloseToDefault(widthPx, defaultColWidth)) colWidths.set(colName, widthPx);
              if (visibility === "collapse") hiddenCols.add(colName);
            }
            layoutColumn++;
          }
          return "";
        });
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableMatch[2])) !== null) {
          const rowRepeat = Math.max(1, Number(rowMatch[1].match(/table:number-rows-repeated=["'](\d+)["']/i)?.[1]) || 1);
          const rowStyleName = this._unescapeXml(rowMatch[1].match(/table:style-name=["']([^"']*)["']/i)?.[1] || "");
          const rowVisibility = (rowMatch[1].match(/table:visibility=["']([^"']*)["']/i)?.[1] || "").toLowerCase();
          const heightPx = rowColStyles.rows.get(rowStyleName)?.heightPx;
          if (rowNumber > lastDataRow && (rowRepeat > 32 || rowNumber > lastDataRow + 1000) && rowVisibility !== "collapse") {
            rowNumber += rowRepeat;
            continue;
          }
          for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
            if (rowRepeat <= 32 || rowVisibility === "collapse") {
              if (Number.isFinite(heightPx) && !this._isCloseToDefault(heightPx, defaultRowHeight)) rowHeights.set(rowNumber, heightPx);
              if (rowVisibility === "collapse") hiddenRows.add(rowNumber);
            }
            if (rowNumber > lastDataRow) {
              rowNumber++;
              continue;
            }
            let columnNumber = 1;
            const cellRegex = new RegExp(cellRegexSource.source, "gi");
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowMatch[2] || "")) !== null) {
              const attributes = {};
              cellMatch[2].replace(/([\w:-]+)=["']([^"']*)["']/g, (_, key, value) => { attributes[key] = this._unescapeXml(value); return ""; });
              const columnRepeat = Math.max(1, Number(attributes["table:number-columns-repeated"]) || 1);
              const isCovered = cellMatch[1].toLowerCase() === "covered-table-cell";
              const mergedColumns = Math.max(1, Number(attributes["table:number-columns-spanned"]) || 1);
              const mergedRows = Math.max(1, Number(attributes["table:number-rows-spanned"]) || 1);
              if (!isCovered && (mergedColumns > 1 || mergedRows > 1)) {
                for (let repeat = 0; repeat < columnRepeat; repeat++) {
                  mergedRanges.push({
                    start: { c: this._columnName(columnNumber + repeat), r: rowNumber },
                    end: { c: this._columnName(columnNumber + repeat + mergedColumns - 1), r: rowNumber + mergedRows - 1 }
                  });
                }
              }
              if (!attributes["table:style-name"] && columnStyles[columnNumber - 1]) attributes["table:style-name"] = columnStyles[columnNumber - 1];
              const content = String(cellMatch[3] || "");
              const annotationMatch = content.match(/<office:annotation\b([^>]*)>([\s\S]*?)<\/office:annotation>/i);
              const valueContent = annotationMatch ? content.replace(annotationMatch[0], "") : content;
              const paragraphs = [];
              valueContent.replace(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi, (_, value) => { paragraphs.push(this._unescapeXml(value.replace(/<[^>]+>/g, ""))); return ""; });
              const text = this._decodeImportedCellText(paragraphs.join("\n"));
              const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"] || text !== "" || annotationMatch || attributes["table:content-validation-name"];
              if (hasValue && !isCovered) {
                const item = this._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles);
                // Extract rich text runs from <text:span> elements (regex branch)
                if (textStyles.size > 0) {
                  const cellVisual = cellVisualStyles.get(attributes["table:style-name"]) || {};
                  const rt = this._extractRichTextFromXml(valueContent, textStyles, cellVisual);
                  if (rt.runs) {
                    item.richText = rt.runs;
                    item.val = attributes["vno:original-string"] ?? rt.text;
                  }
                }
                const matrixColumns = Math.max(1, Number(attributes["table:number-matrix-columns-spanned"]) || 1);
                const matrixRows = Math.max(1, Number(attributes["table:number-matrix-rows-spanned"]) || 1);
                if ((attributes["table:number-matrix-columns-spanned"] || attributes["table:number-matrix-rows-spanned"]) && item.formula) {
                  arrayFormulas.push({ column: columnNumber, row: rowNumber, columns: matrixColumns, rows: matrixRows, formula: item.formula });
                }
                const materializeRepeat = this._fodsCellMarkupHasRealContent(attributes, content)
                  ? columnRepeat
                  : Math.max(0, Math.min(columnRepeat, lastDataCol - columnNumber + 1));
                for (let repeat = 0; repeat < materializeRepeat; repeat++) {
                  const coord = `${this._columnName(columnNumber + repeat)}${rowNumber}`;
                  data.set(coord, { ...item });
                  if (attributes["table:content-validation-name"]) {
                    workbook.validationHits.push({ sheet: name, coord, name: attributes["table:content-validation-name"] });
                  }
                  if (annotationMatch) {
                    const annotationBody = annotationMatch[2];
                    comments[coord] = {
                      coord,
                      text: this._unescapeXml(annotationBody.match(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/i)?.[1]?.replace(/<[^>]+>/g, "") || ""),
                      author: this._unescapeXml(annotationBody.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1]?.replace(/<[^>]+>/g, "") || annotationMatch[1].match(/office:author=["']([^"']*)["']/i)?.[1] || ""),
                      timestamp: this._unescapeXml(annotationBody.match(/<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]?.replace(/<[^>]+>/g, "") || annotationMatch[1].match(/office:create-date=["']([^"']*)["']/i)?.[1] || "")
                    };
                  }
                }
              }
              if (!isCovered) {
                const embeddedImage = this._parseCellEmbeddedImage(content, `Image${images.length + 1}`);
                if (embeddedImage) images.push({ ...embeddedImage, anchor: { c: this._columnName(columnNumber), r: rowNumber } });
              }
              columnNumber += columnRepeat;
            }
            rowNumber++;
          }
        }
        arrayFormulas.forEach(region => this._restoreArrayFormula(data, region.column, region.row, region.columns, region.rows, region.formula));
        this._applyXlsxLayoutOverlay(pageAttr("vno:xlsx-layout"), rowHeights, colWidths);
        workbook.sheets.push(name);
        workbook.sheetsData[name] = data;
        workbook.commentsBySheet[name] = comments;
        workbook.mergedRangesBySheet[name] = mergedRanges;
        workbook.namedRangesBySheet[name] = localRanges;
        workbook.printAreaBySheet[name] = printArea;
        workbook.pageSetupBySheet[name] = pageSetup;
        workbook.rowHeightsBySheet[name] = rowHeights;
        workbook.colWidthsBySheet[name] = colWidths;
        workbook.userHiddenRowsBySheet[name] = hiddenRows;
        workbook.userHiddenColsBySheet[name] = hiddenCols;
        workbook.imagesBySheet = workbook.imagesBySheet || {};
        workbook.imagesBySheet[name] = images;
      }
    }
    if (!workbook.sheets.includes(workbook.activeSheet)) workbook.activeSheet = workbook.sheets[0] || "";
    this._attachImportedRules(workbook, tableXml);
    this._attachImportedPivots(workbook, xmlText);
    this._attachImportedCharts(workbook, xmlText);
    this._attachImportedPageBreaks(workbook, tableXml, rowColStyles);
    this._attachImportedProtection(workbook, xmlText);
    this._attachImportedFreezePanes(workbook, xmlText);
    this._attachImportedSheetVisibility(workbook, xmlText);
    this._attachImportedAutoFilter(workbook, xmlText);
    this._attachImportedSparklines(workbook, xmlText);
    this._attachImportedOutline(workbook, tableXml);
    return workbook;
  }

  loadFromFods(fodsText, ooxmlWorkbookXml) {
    if (!this.grid) return false;
    let xml = overlayFodsStructureProtection(fodsText, ooxmlWorkbookXml);
    xml = overlayActiveSheetToFods(xml, ooxmlWorkbookXml);
    const workbook = this.parseFods(xml);
    if (workbook.sheets.length === 0) return false;
    const firstSheet = workbook.sheets[0];
    if (typeof this.grid.resetToBlank === "function") this.grid.resetToBlank(firstSheet);
    this.grid.sheets = [firstSheet];
    this.grid.sheetsData = { [firstSheet]: workbook.sheetsData[firstSheet] };
    this.grid.commentsBySheet = { [firstSheet]: workbook.commentsBySheet[firstSheet] || {} };
    this.grid.mergedRangesBySheet = { [firstSheet]: workbook.mergedRangesBySheet[firstSheet] || [] };
    this.grid.namedRangesWorkbook = workbook.namedRangesWorkbook || [];
    this.grid.namedRangesBySheet = { [firstSheet]: workbook.namedRangesBySheet[firstSheet] || [] };
    this.grid.printAreaBySheet = { [firstSheet]: workbook.printAreaBySheet[firstSheet] || null };
    this.grid.pageSetupBySheet = { [firstSheet]: workbook.pageSetupBySheet[firstSheet] };
    for (const sheetName of workbook.sheets.slice(1)) {
      if (typeof this.grid.addSheet === "function") this.grid.addSheet(sheetName, false);
      else this.grid.sheets.push(sheetName);
      this.grid.sheetsData[sheetName] = workbook.sheetsData[sheetName];
      this.grid.commentsBySheet[sheetName] = workbook.commentsBySheet[sheetName] || {};
      this.grid.mergedRangesBySheet[sheetName] = workbook.mergedRangesBySheet[sheetName] || [];
      this.grid.namedRangesBySheet[sheetName] = workbook.namedRangesBySheet[sheetName] || [];
      this.grid.printAreaBySheet[sheetName] = workbook.printAreaBySheet[sheetName] || null;
      this.grid.pageSetupBySheet[sheetName] = workbook.pageSetupBySheet[sheetName];
    }
    if (typeof this.grid.switchSheet === "function") this.grid.switchSheet(workbook.activeSheet);
    else this.grid.activeSheet = workbook.activeSheet;
    this.grid.conditionalFormattingBySheet = {};
    this.grid.dataValidationsBySheet = {};
    this.grid.pivotTablesBySheet = {};
    this.grid.chartsBySheet = {};
    this.grid.imagesBySheet = {};
    this.grid.rowHeightsBySheet = {};
    this.grid.colWidthsBySheet = {};
    this.grid.userHiddenRowsBySheet = {};
    this.grid.userHiddenColsBySheet = {};
    this.grid.pageBreaksBySheet = {};
    this.grid.protectionBySheet = {};
    this.grid.outlineGroupsBySheet = {};
    this.grid.workbookProtection = workbook.workbookProtection || { enabled: false, password: "" };
    // Sheet visibility (hidden/veryHidden) — round-trip via vno:sheet-state
    this.grid.sheetVisibilityBySheet = workbook.sheetVisibilityBySheet || {};
    for (const sheetName of workbook.sheets) {
      this.grid.conditionalFormattingBySheet[sheetName] = workbook.conditionalFormattingBySheet?.[sheetName] || [];
      this.grid.dataValidationsBySheet[sheetName] = workbook.dataValidationsBySheet?.[sheetName] || [];
      this.grid.pivotTablesBySheet[sheetName] = workbook.pivotTablesBySheet?.[sheetName] || [];
      this.grid.chartsBySheet[sheetName] = workbook.chartsBySheet?.[sheetName] || [];
      this.grid.imagesBySheet[sheetName] = workbook.imagesBySheet?.[sheetName] || [];
      this.grid.rowHeightsBySheet[sheetName] = this._asLayoutMap(workbook.rowHeightsBySheet?.[sheetName], true);
      this.grid.colWidthsBySheet[sheetName] = this._asLayoutMap(workbook.colWidthsBySheet?.[sheetName], false);
      this.grid.userHiddenRowsBySheet[sheetName] = this._asLayoutSet(workbook.userHiddenRowsBySheet?.[sheetName], true);
      this.grid.userHiddenColsBySheet[sheetName] = this._asLayoutSet(workbook.userHiddenColsBySheet?.[sheetName], false);
      this.grid.pageBreaksBySheet[sheetName] = workbook.pageBreaksBySheet?.[sheetName] || { rows: [], cols: [] };
      this.grid.protectionBySheet[sheetName] = workbook.protectionBySheet?.[sheetName] || { enabled: false, password: "" };
      this.grid.outlineGroupsBySheet[sheetName] = workbook.outlineGroupsBySheet?.[sheetName] || [];
      const freeze = workbook.freezePanesBySheet?.[sheetName] || { rows: 0, cols: 0 };
      if (!this.grid.sheetStates) this.grid.sheetStates = {};
      if (!this.grid.sheetStates[sheetName]) {
        this.grid.sheetStates[sheetName] = { hiddenRows: new Set(), activeFilters: new Map(), isFilterActive: false, isFrozenPanes: false, frozenRows: 0, frozenCols: 0, selectedCoord: { r: 1, c: "A" } };
      }
      this.grid.sheetStates[sheetName].frozenRows = freeze.rows;
      this.grid.sheetStates[sheetName].frozenCols = freeze.cols;
      this.grid.sheetStates[sheetName].isFrozenPanes = freeze.rows > 0 || freeze.cols > 0;
      // AutoFilter: if the FODS had <table:database-range> for this sheet,
      // restore the filter state so it round-trips through serializeToFods.
      const autoFilterRef = workbook.autoFilterBySheet?.[sheetName];
      if (autoFilterRef) {
        this.grid.sheetStates[sheetName].isFilterActive = true;
        this.grid.sheetStates[sheetName].filterRange = autoFilterRef;
      }
    }
    // switchSheet() ở trên chạy TRƯỚC vòng lặp này gán frozenRows/frozenCols
    // vào sheetStates, nên trạng thái sống của grid cho sheet đang active cần
    // đồng bộ lại thủ công ở đây.
    const activeFreezeState = this.grid.sheetStates[this.grid.activeSheet];
    this.grid.frozenRows = activeFreezeState?.frozenRows || 0;
    this.grid.frozenCols = activeFreezeState?.frozenCols || 0;
    this.grid.isFrozenPanes = activeFreezeState?.isFrozenPanes || false;
    this.grid.container?.classList?.toggle?.("vno-freeze-panes", this.grid.isFrozenPanes);
    // Restore AutoFilter state for the active sheet
    if (activeFreezeState?.isFilterActive) {
      this.grid.isFilterActive = true;
      this.grid.container?.classList?.add?.("vno-filter-mode");
      this.grid._updateFilterButtons?.();
    }
    this.grid.undoStack = [];
    this.grid.redoStack = [];

    // Dat rowCount = max(200, maxRow + 50) de cuon toi cuoi sheet khong bi trong
    let _maxRowInFile = 0;
    for (const sheetData of Object.values(this.grid.sheetsData || {})) {
      if (!sheetData) continue;
      for (const key of sheetData.keys()) {
        const m = /^([A-Z]+)(\d+)$/.exec(key);
        if (m) _maxRowInFile = Math.max(_maxRowInFile, Number(m[2]));
      }
    }
    this.grid.rowCount = Math.max(200, _maxRowInFile + 50);
    this._invalidateRowTopsCache?.();

    this.grid._refreshVisibleRuleVisuals?.();
    this.grid._refreshRowColLayoutView?.();
    this.grid.refreshCharts?.();
    this.grid.renderCharts?.();
    this.grid.renderImages?.();
    this.grid._applyProtectionUi?.({ renderTabs: true });
    this.grid.updateStatus?.();
    return true;
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
    text = String(text).replace(/^\uFEFF/, "");
    const candidates = [",", ";", "\t"];
    const firstRecord = text.split(/\r?\n/, 1)[0];
    const counts = new Map(candidates.map((candidate) => [candidate, 0]));
    let detectingQuotes = false;
    for (let i = 0; i < firstRecord.length; i++) {
      const ch = firstRecord[i];
      if (ch === '"') {
        if (detectingQuotes && firstRecord[i + 1] === '"') i++;
        else detectingQuotes = !detectingQuotes;
      } else if (!detectingQuotes && counts.has(ch)) {
        counts.set(ch, counts.get(ch) + 1);
      }
    }
    const delimiter = candidates.reduce((best, candidate) => (
      counts.get(candidate) > counts.get(best) ? candidate : best
    ), ",");

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
        } else if (ch === delimiter) {
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
        let val = rowCells[c];
        if (/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+$/.test(val)) {
          val = Number(val.replace(/\./g, "").replace(",", "."));
        }
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
    this.shell?.resetDocumentChrome?.("Bảng tính 1.xlsx", "home", false);
    return true;
  }

  async closeDocument() {
    return await this.newDocument();
  }

  /**
   * Lưu bảng tính thành tệp XLSX thật trên đĩa (qua LibreOffice headless engine).
   */
  async save() {
    const fodsContent = this.serializeToFods();
    const suggestedName = (this.sourceFileName && this.sourceFileName !== "BangTinh")
      ? this.sourceFileName
      : (this.shell?.documentName ? this.shell.documentName.replace(/\.[^/.]+$/, "") : (this.sourceFileName || "BangTinh"));
    const result = await globalUnoBridge.saveRealFile("sheet", fodsContent, "xlsx", suggestedName);
    if (result.status === "ok") {
      this.isDirty = false;
      const savedPath = result.path || result.fileName;
      if (savedPath) {
        const savedFileName = savedPath.split(/[/\\]/).pop();
        if (savedFileName) {
          this.sourceFileName = savedFileName.replace(/\.[^/.]+$/, "");
          this.shell?.resetDocumentChrome?.(savedFileName, null);
        }
      }
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
      // Overlay lockStructure from original XLSX onto FODS before parseFods.
      // Production File → Mở already overlays in main.py; this is the Writer-like
      // belt-and-suspenders path (ooxmlWorkbookXml) plus tests that stub the bridge.
      this.loadFromFods(result.content, result.ooxmlWorkbookXml);
      this.sourceFileName = (result.fileName || "BangTinh").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
      // Lỗi thật đã xác nhận: dữ liệu nạp đúng nhưng nhãn tên tệp trên tab
      // (đầu cửa sổ) vẫn giữ nguyên tên demo cũ vì resetDocumentChrome() chỉ
      // được gọi ở File > Mới/Đóng, chưa bao giờ gọi sau khi Mở tệp thật.
      this.shell?.resetDocumentChrome?.(result.fileName || "Bảng tính 1.xlsx");
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể mở tệp", message: result.message, type: "error" });
    return false;
  }

  async exportPdf() {
    const fodsContent = this.serializeToFods();
    const result = await globalUnoBridge.exportRealPdf("sheet", fodsContent, this.sourceFileName);
    if (result.status === "ok") {
      await showAlertDialog({ title: "Đã xuất PDF", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể xuất PDF", message: result.message, type: "error" });
    return false;
  }

  print() {
    if (this.grid?.print) return this.grid.print();
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
    return true;
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.grid) return false;
    const cmd = vnCmdId || (unoUrl ? getVnCommand(unoUrl) : null) || unoUrl;

    switch (cmd) {
      case "sheet.file.printPreview":
      case ".uno:PrintPreview":
        return Boolean(this.grid.openPrintPreview ? this.grid.openPrintPreview() : false);

      case "sheet.view.normal":
      case ".uno:NormalViewMode":
        return this.grid.setWorkbookView ? this.grid.setWorkbookView("normal") : false;

      case "sheet.view.pageBreakPreview":
      case ".uno:PagebreakMode":
      case ".uno:PageBreakPreview":
        return this.grid.setWorkbookView ? this.grid.setWorkbookView("pageBreakPreview") : false;

      case "sheet.view.pageLayout":
      case ".uno:PageView":
      case ".uno:PrintLayout":
        return this.grid.setWorkbookView ? this.grid.setWorkbookView("pageLayout") : false;

      case "sheet.view.formulaBar":
      case ".uno:InputLineVisible":
      case ".uno:ToggleFormulaBar":
        return this.grid.toggleFormulaBar ? this.grid.toggleFormulaBar() : false;

      case "sheet.view.zoomToSelection":
      case ".uno:ZoomOptimal":
        return this.grid.zoomToSelection ? this.grid.zoomToSelection() : false;

      case "sheet.view.newWindow":
      case ".uno:NewWindow":
        return this.grid.newWindow ? this.grid.newWindow() : false;

      case "sheet.view.zoomIn":
      case ".uno:ZoomIn":
      case ".uno:ZoomPlus":
        return this.grid.zoomIn ? this.grid.zoomIn() : false;

      case "sheet.view.zoomOut":
      case ".uno:ZoomOut":
      case ".uno:ZoomMinus":
        return this.grid.zoomOut ? this.grid.zoomOut() : false;

      case "sheet.view.zoomReset":
      case ".uno:Zoom100Percent":
        return this.grid.zoomReset ? this.grid.zoomReset() : false;

      case "sheet.view.gridlines":
      case ".uno:ToggleGrid":
      case ".uno:ViewGridLines":
        return this.grid.toggleGridlines ? this.grid.toggleGridlines() : false;

      case "sheet.view.headings":
      case ".uno:ToggleHeadings":
      case ".uno:ViewRowColumnHeaders":
        return this.grid.toggleHeadings ? this.grid.toggleHeadings() : false;

      case "sheet.nav.home":
        return this.grid.navigateHome();

      case "sheet.nav.end":
        return this.grid.navigateToDataEnd();

      case "sheet.cell.edit":
        if (typeof this.grid._focusFormulaInputAtEnd === "function") {
          this.grid._focusFormulaInputAtEnd();
        } else {
          this.grid.focusFormulaInput();
        }
        return true;

      case "sheet.cell.bold":
        return this.grid.toggleStyle("fontWeight", "bold", "normal");

      case "sheet.cell.italic":
        return this.grid.toggleStyle("fontStyle", "italic", "normal");

      case "sheet.cell.underline":
        return this.grid.toggleStyle("textDecoration", "underline", "none");

      case "sheet.font.family":
        return this.grid.setFontFamily(args);

      case "sheet.font.size":
        return this.grid.setFontSize(args);

      case "sheet.font.grow":
        return this.grid.adjustFontSize(1);

      case "sheet.font.shrink":
        return this.grid.adjustFontSize(-1);

      case "sheet.cell.alignLeft":
        return this.grid.setStyle("textAlign", "left");

      case "sheet.cell.alignCenter":
        return this.grid.setStyle("textAlign", "center");

      case "sheet.cell.alignRight":
        return this.grid.setStyle("textAlign", "right");

      case "sheet.cell.alignTop":
        return this.grid.setStyle("verticalAlign", "top");

      case "sheet.cell.alignMiddle":
        return this.grid.setStyle("verticalAlign", "middle");

      case "sheet.cell.alignBottom":
        return this.grid.setStyle("verticalAlign", "bottom");

      case "sheet.cell.wrapText":
        return this.grid.toggleWrapText();

      case "sheet.cell.orientation":
        return this.grid.setCellOrientation ? this.grid.setCellOrientation(args) : false;

      case "sheet.cell.indentIncrease":
        return this.grid.adjustIndent(1);

      case "sheet.cell.indentDecrease":
        return this.grid.adjustIndent(-1);

      case "sheet.cell.merge":
      case "sheet.cell.mergeCenter":
        return this.grid.mergeCells("mergeCenter");
      case "sheet.cell.mergeAcross":
        return this.grid.mergeCells("mergeAcross");
      case "sheet.cell.mergeCells":
        return this.grid.mergeCells("mergeCells");
      case "sheet.cell.unmerge":
        return this.grid.unmergeCells();

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

      case "sheet.format.cellsDialog":
        return this.grid.showFormatCellsDialog();

      case "sheet.format.alignmentDialog":
        return this.grid.showFormatCellsDialog("alignment");

      case "sheet.format.currencyVND":
        return this.grid.formatCurrentCellCurrencyVND();

      case "sheet.format.percent":
        return this.grid.formatCurrentCellPercent();

      case "sheet.format.standard":
        return this.grid.formatCurrentCellStandard();

      case "sheet.format.quickCategory":
        return this.grid.applyQuickNumberCategory(args);

      case "sheet.format.increaseDecimal":
        return this.grid.adjustDecimalPlaces(1);

      case "sheet.format.decreaseDecimal":
        return this.grid.adjustDecimalPlaces(-1);

      case "sheet.insert.date":
        return this.grid.insertCurrentDate();

      case "sheet.row.insert":
        return this.grid.insertRow(args?.atRow);

      case "sheet.col.insert":
        return this.grid.insertColumn(args?.atCol);

      case "sheet.row.delete":
        return this.grid.deleteRow(args?.atRow);

      case "sheet.col.delete":
        return this.grid.deleteColumn(args?.atCol);

      case "sheet.row.height":
      case ".uno:RowHeight":
        return this.grid.showRowHeightDialog ? this.grid.showRowHeightDialog(args || {}) : false;

      case "sheet.row.autoFit":
      case ".uno:SetOptimalRowHeight":
        return this.grid.autoFitSelectedRows ? this.grid.autoFitSelectedRows() : false;

      case "sheet.col.width":
      case ".uno:ColumnWidth":
        return this.grid.showColumnWidthDialog ? this.grid.showColumnWidthDialog(args || {}) : false;

      case "sheet.col.autoFit":
      case ".uno:SetOptimalColumnWidth":
        return this.grid.autoFitSelectedColumns ? this.grid.autoFitSelectedColumns() : false;

      case "sheet.row.hide":
      case ".uno:HideRow":
        return this.grid.hideRows ? this.grid.hideRows(args?.rows) : false;

      case "sheet.row.unhide":
      case ".uno:ShowRow":
        return this.grid.unhideRows ? this.grid.unhideRows(args?.rows) : false;

      case "sheet.col.hide":
      case ".uno:HideColumn":
        return this.grid.hideColumns ? this.grid.hideColumns(args?.cols) : false;

      case "sheet.col.unhide":
      case ".uno:ShowColumn":
        return this.grid.unhideColumns ? this.grid.unhideColumns(args?.cols) : false;

      case "sheet.sheet.rename":
      case ".uno:RenameTable":
        if (args?.newName) return this.grid.renameSheet(args.oldName || this.grid.activeSheet, args.newName);
        return this.grid.showRenameSheetDialog ? this.grid.showRenameSheetDialog(args?.sheetName) : false;

      case "sheet.sheet.moveOrCopy":
      case ".uno:Move":
        if (args?.copy) return this.grid.copySheet(args.sheetName, args.beforeName);
        if (args?.move || args?.beforeName !== undefined) return this.grid.moveSheet(args.sheetName, args.beforeName);
        return this.grid.showMoveCopySheetDialog ? this.grid.showMoveCopySheetDialog(args?.sheetName) : false;

      case "sheet.sheet.protect":
      case ".uno:Protect":
        if (args?.unprotect) return this.grid.unprotectSheet(args);
        if (args?.protect) return this.grid.protectSheet(args);
        return this.grid.showProtectSheetDialog ? this.grid.showProtectSheetDialog(args?.sheetName) : false;

      case "sheet.workbook.protect":
      case ".uno:ToolProtectionDocument":
        if (args?.unprotect) return this.grid.unprotectWorkbook(args);
        if (args?.protect) return this.grid.protectWorkbook(args);
        return this.grid.showProtectWorkbookDialog ? this.grid.showProtectWorkbookDialog() : false;

      case "sheet.formula.insertFunction":
      case ".uno:InsertFunction":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog(args) : false;

      case "sheet.formula.sum":
      case ".uno:AutoSum":
        return this.grid.insertFormula ? this.grid.insertFormula("SUM") : false;

      case "sheet.formula.average":
        return this.grid.insertFormula ? this.grid.insertFormula("AVERAGE") : false;

      case "sheet.formula.countNumbers":
      case ".uno:AutoCount":
        return this.grid.insertFormula ? this.grid.insertFormula("COUNT") : false;

      case "sheet.formula.max":
      case ".uno:AutoMax":
        return this.grid.insertFormula ? this.grid.insertFormula("MAX") : false;

      case "sheet.formula.min":
      case ".uno:AutoMin":
        return this.grid.insertFormula ? this.grid.insertFormula("MIN") : false;

      case "sheet.formula.categoryFinancial":
      case ".uno:FinancialFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Tài chính") : false;

      case "sheet.formula.categoryLogical":
      case ".uno:LogicalFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Logic") : false;

      case "sheet.formula.categoryText":
      case ".uno:TextFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Văn bản") : false;

      case "sheet.formula.categoryDateTime":
      case ".uno:DateTimeFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Ngày tháng") : false;

      case "sheet.formula.categoryLookup":
      case ".uno:LookupFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Tra cứu") : false;

      case "sheet.formula.categoryMath":
      case ".uno:MathFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Toán học") : false;

      case "sheet.formula.categoryMore":
      case ".uno:MoreFunctions":
        return this.grid.showFunctionDialog ? this.grid.showFunctionDialog("Thống kê") : false;

      case "sheet.formula.nameManager":
      case ".uno:DefineName":
        return this.grid.showNameManager ? this.grid.showNameManager(args || {}) : false;

      case "sheet.formula.defineName":
      case ".uno:AddName":
        return this.grid.showDefineNameDialog ? this.grid.showDefineNameDialog() : false;

      case "sheet.formula.useInFormula":
      case ".uno:InsertName":
        return this.grid.showUseInFormulaDialog ? this.grid.showUseInFormulaDialog() : false;

      case "sheet.formula.createFromSelection":
      case ".uno:CreateNames":
        return this.grid.createNamesFromSelection ? this.grid.createNamesFromSelection() : false;

      case "sheet.formula.tracePrecedents":
      case ".uno:ShowPrecedents":
        return this.grid.tracePrecedents ? this.grid.tracePrecedents() : false;

      case "sheet.formula.traceDependents":
      case ".uno:ShowDependents":
        return this.grid.traceDependents ? this.grid.traceDependents() : false;

      case "sheet.formula.removeArrows":
      case ".uno:ClearArrows":
        return this.grid.removeArrows ? this.grid.removeArrows() : false;

      case "sheet.formula.showFormulas":
        return this.grid.toggleShowFormulas ? this.grid.toggleShowFormulas() : false;

      case "sheet.formula.errorChecking":
      case ".uno:ErrorChecking":
        return this.grid.showErrorCheckingDialog ? this.grid.showErrorCheckingDialog() : false;

      case "sheet.formula.watchWindow":
      case ".uno:WatchWindow":
        return this.grid.showWatchWindow ? this.grid.showWatchWindow() : false;

      case "sheet.formula.evaluateFormula":
      case ".uno:EvaluateFormula":
        return this.grid.showEvaluateFormulaDialog ? this.grid.showEvaluateFormulaDialog() : false;

      case "sheet.calc.calculationOptions":
      case ".uno:CalculationMode":
        return this.grid.setCalculationMode ? this.grid.setCalculationMode(args) : false;

      case "sheet.calc.modeAutomatic":
      case ".uno:AutomaticCalculation":
        return this.grid.setCalculationMode ? this.grid.setCalculationMode("automatic") : false;

      case "sheet.calc.modeManual":
      case ".uno:ManualCalculation":
        return this.grid.setCalculationMode ? this.grid.setCalculationMode("manual") : false;

      case "sheet.calc.calculateNow":
      case "sheet.formula.recalculate":
      case ".uno:Calculate":
        return this.grid.recalculateAll ? this.grid.recalculateAll() : false;

      case "sheet.calc.calculateSheet":
      case ".uno:CalculateHard":
        return this.grid.calculateSheet ? this.grid.calculateSheet() : false;

      case "sheet.formula.arrayEnter":
        return this.grid.enterArrayFormula(args || {});

      case "sheet.format.conditional":
        return this.grid.showConditionalFormattingDialog();

      case "sheet.data.validation":
        return this.grid.showDataValidationDialog();

      case "sheet.data.textToColumns": return this.grid.showTextToColumnsDialog();
      case "sheet.data.flashFill": return this.grid.runFlashFill();
      case "sheet.data.removeDuplicates": return this.grid.showRemoveDuplicatesDialog();
      case "sheet.data.consolidate":
      case ".uno:DataConsolidate":
        return this.grid.showConsolidateDialog();
      case "sheet.data.group": return this.grid.groupSelection();
      case "sheet.data.ungroup": return this.grid.ungroupSelection();
      case "sheet.data.subtotal": return this.grid.showSubtotalDialog();
      case "sheet.data.goalSeek": return this.grid.showGoalSeekDialog();
      case "sheet.data.dataTable": return this.grid.showDataTableDialog();
      case "sheet.data.scenarioManager": return this.grid.showScenarioManagerDialog();

      case "sheet.data.pivotTable":
        return this.grid.showPivotTableDialog();

      case "sheet.data.pivotRefresh":
        return this.grid.refreshPivotTable();

      case "sheet.style.formatAsTable":
        return this.grid.showFormatAsTableDialog ? this.grid.showFormatAsTableDialog() : false;

      case "sheet.style.cellStyles":
        return this.grid.showCellStylesDialog ? this.grid.showCellStylesDialog() : false;

      case "sheet.edit.fillDown":
        return this.grid.fillDown ? this.grid.fillDown(args?.range) : false;

      case "sheet.edit.fillRight":
        return this.grid.fillRight ? this.grid.fillRight(args?.range) : false;

      case "sheet.edit.clearAll":
        return this.grid.clearAll ? this.grid.clearAll(args?.range) : false;

      case "sheet.edit.clearFormats":
        return this.grid.clearFormats ? this.grid.clearFormats(args?.range) : false;

      case "sheet.edit.clearContents":
        return this.grid.clearContents ? this.grid.clearContents(args?.range) : false;

      case "common.edit.find":
        return this._showFindReplaceDialog(false);

      case "common.edit.replace":
        return this._showFindReplaceDialog(true);

      case "sheet.chart.insert":
        this.grid.openChartBuilder();
        return true;
      case "sheet.chart.pivotChart":
        return this.grid.openPivotChartBuilder();

      case "sheet.insert.sparklineLine":
        return this.grid.insertSparkline("line");

      case "sheet.insert.sparklineColumn":
        return this.grid.insertSparkline("column");

      case "common.edit.hyperlink":
      case "sheet.insert.hyperlink": {
        const url = args?.url || await showPromptDialog({ title: "Chèn liên kết", message: "Nhập địa chỉ liên kết (URL):", defaultValue: "https://", placeholder: "https://example.com" });
        return url ? this.grid.insertHyperlink(url, args?.text) : false;
      }

      case "sheet.insert.textbox": {
        const text = args?.text || await showPromptDialog({ title: "Chèn hộp văn bản", message: "Nhập nội dung hộp văn bản:", defaultValue: "", placeholder: "Nội dung" });
        return text ? this.grid.insertTextBox(text) : false;
      }

      case "sheet.insert.image":
        return await this._insertImageDialog(args || {});

      case "sheet.view.freezePanes":
        return this.grid.toggleFreezePanes ? this.grid.toggleFreezePanes() : false;

      case "sheet.view.freezeTopRow":
        return this.grid.freezeTopRow ? this.grid.freezeTopRow() : false;

      case "sheet.view.freezeFirstColumn":
        return this.grid.freezeFirstColumn ? this.grid.freezeFirstColumn() : false;

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

      case "sheet.review.spellCheck":
        return this.grid.showSpellcheckDialog ? this.grid.showSpellcheckDialog(args || {}) : false;

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

      case "sheet.data.customSort":
        return this.grid.showCustomSortDialog ? this.grid.showCustomSortDialog() : false;

      case "common.edit.cut":
        return await this._copySelectedCell(true);

      case "common.edit.copy":
        return await this._copySelectedCell(false);

      case "common.edit.paste":
        return await this._pasteIntoSelectedCell();

      case "common.edit.pastePlain":
        return await this._pasteIntoSelectedCell();

      case "sheet.edit.pasteSpecial":
        return this.grid.showPasteSpecialDialog ? this.grid.showPasteSpecialDialog(this._clipboardModel) : false;

      case "sheet.edit.formatPainter":
        return this.grid.toggleFormatPainter ? this.grid.toggleFormatPainter(args || {}) : false;

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
    let range = this.grid._normalizeRange?.(this.grid.selectionRange) || { start: coord, end: coord };
    if (!this.grid._rangeContains?.(range, coord.c, coord.r)) range = { start: { ...coord }, end: { ...coord } };
    const cells = [];
    const textRows = [];
    for (let row = range.start.r; row <= range.end.r; row++) {
      const cellRow = [], textRow = [];
      for (let col = this.grid._columnNumber(range.start.c); col <= this.grid._columnNumber(range.end.c); col++) {
        const item = this.grid.cellsData?.get(`${this.grid._columnLabel(col)}${row}`) || { val: "", formula: "", style: {} };
        cellRow.push(structuredClone(item));
        textRow.push(String(item.formula || item.val || ""));
      }
      cells.push(cellRow); textRows.push(textRow.join("\t"));
    }
    this._clipboardModel = { range: structuredClone(range), cells };
    const text = textRows.join("\n");

    this._clipboardText = String(text);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
      }
    } catch {
      // Một số môi trường (vd. test headless) chặn Clipboard API — không coi là lỗi nghiêm trọng
    }

    if (isCut && this.grid.setCellValue) {
      for (let row = range.start.r; row <= range.end.r; row++) for (let col = this.grid._columnNumber(range.start.c); col <= this.grid._columnNumber(range.end.c); col++) this.grid.setCellValue(this.grid._columnLabel(col), row, "");
    }
    return true;
  }

  /**
   * Dán nội dung Clipboard thật vào ô đang chọn.
   */
  async _pasteIntoSelectedCell() {
    const coord = this.grid.selectedCoord;
    if (!coord || !this.grid.setCellValue) return false;
    if (this._clipboardModel && this.grid.applyPasteSpecial) return this.grid.applyPasteSpecial(this._clipboardModel, "all");
    let text = this._clipboardText || "";
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip) text = clip;
      }
    } catch {
      // Trình duyệt có thể chặn đọc Clipboard nếu chưa có quyền/tương tác người dùng
    }
    if (text !== undefined && text !== null) {
      this.grid.setCellValue(coord.c, coord.r, text);
      return true;
    }
    return false;
  }
}
