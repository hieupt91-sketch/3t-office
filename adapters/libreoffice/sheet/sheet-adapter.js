/**
 * 3T Office LibreOffice Adapter — 3T Sheet Adapter
 * Quản lý tương tác với StarCalc (sc) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog, showPromptDialog, showFindReplaceDialog, showHyperlinkDialog, showSymbolPicker } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { withLazyFeatureProgress } from "../../../platform/startup/lazy-feature.js";
import { globalShortcutManager } from "../../../platform/commands/shortcut-manager.js";
import { getVnCommand } from "../common/command-dispatch-mapper.js";
import { overlayFodsStructureProtection } from "./xlsx-workbook-protection.js";
import { overlayActiveSheetToFods } from "./xlsx-active-sheet.js";
import { buildSheetPayloadModel, toPlain as sheetPayloadToPlain } from "./sheet-payload-parser.js";
import {
  parseOfficeHtmlTable,
  parseOfficeTsv,
  serializeSheetRangeToClipboard
} from "../../../platform/clipboard/office-clipboard.js";
import { extractSheetRangeData } from "../../../apps/sheet/sheet-chart-data.js";
import { TABLE_STYLE_PRESETS } from "../../../apps/sheet/cell-style-presets.js";

// MS-XLSX 2.2.3 marks these names as future functions. Keep only functions
// present in the Excel 2016 catalog; newer names must not be advertised as
// compatible with that version. Source: https://learn.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/5d1b6d44-6fc1-4ecd-8fef-0b27406cc2bf
export const EXCEL2016_OOXML_FUTURE_FUNCTIONS = new Set(`
  ACOT ACOTH AGGREGATE ARABIC BASE BETA.DIST BETA.INV BINOM.DIST BINOM.DIST.RANGE BINOM.INV
  BITAND BITLSHIFT BITOR BITRSHIFT BITXOR CEILING.MATH CEILING.PRECISE
  CHISQ.DIST CHISQ.DIST.RT CHISQ.INV CHISQ.INV.RT CHISQ.TEST COMBINA
  CONFIDENCE.NORM CONFIDENCE.T COT COTH COVARIANCE.P COVARIANCE.S CSC CSCH DAYS DECIMAL
  ERF.PRECISE ERFC.PRECISE EXPON.DIST F.DIST F.DIST.RT F.INV F.INV.RT F.TEST
  FLOOR.MATH FLOOR.PRECISE FORECAST.ETS FORECAST.ETS.CONFINT FORECAST.ETS.SEASONALITY
  FORECAST.ETS.STAT FORECAST.LINEAR FORMULATEXT GAMMA GAMMA.DIST GAMMA.INV GAMMALN.PRECISE
  GAUSS HYPGEOM.DIST IFNA IMCOSH IMCOT IMCSC IMCSCH IMSEC IMSECH IMSINH IMTAN ISFORMULA
  ISOWEEKNUM LOGNORM.DIST LOGNORM.INV MODE.MULT MODE.SNGL MUNIT NEGBINOM.DIST NORM.DIST
  NORM.INV NORM.S.DIST NORM.S.INV NUMBERVALUE PDURATION PERCENTILE.EXC PERCENTILE.INC
  PERCENTRANK.EXC PERCENTRANK.INC PERMUTATIONA PHI POISSON.DIST QUARTILE.EXC QUARTILE.INC
  RANK.AVG RANK.EQ RRI SEC SECH SHEET SHEETS SKEW.P STDEV.P STDEV.S T.DIST T.DIST.2T
  T.DIST.RT T.INV T.INV.2T T.TEST UNICHAR UNICODE VAR.P VAR.S WEIBULL.DIST XOR Z.TEST
`.trim().split(/\s+/));

function mapOoxmlFunctionPrefixes(expression, { write }) {
  return String(expression).split(/("(?:[^"]|"")*")/).map((part, index) => {
    if (index % 2 === 1) return part;
    return part.replace(/(^|[^A-Za-z0-9_.])((?:_xlfn\.)?_xlws\.|_xlfn\.)?([A-Za-z_][A-Za-z0-9_.]*)(\s*\()/gi,
      (match, before, prefix = "", name, open) => {
        const canonicalPrefix = String(prefix).toLowerCase();
        const upperName = String(name).toUpperCase();
        if (write) {
          if (!EXCEL2016_OOXML_FUTURE_FUNCTIONS.has(upperName) || canonicalPrefix) return match;
          return `${before}_xlfn.${name}${open}`;
        }
        return canonicalPrefix ? `${before}${name}${open}` : match;
      });
  }).join("");
}

export function numberFormatFromExcelCode(code) {
  const source = String(code ?? "").trim();
  if (!source || /^general$/i.test(source)) return { category: "general" };
  if (source === "@") return { category: "text" };
  const first = source.split(";")[0];
  const visible = first.replace(/"[^"]*"|\\.|\[[^\]]*\]|_[\s\S]|\*[\s\S]/g, "");
  const decimals = (visible.match(/\.([0#?]+)/)?.[1] || "").length;
  const negative = source.split(";")[1] || "";
  const negativeStyle = /\([^)]*[0#?]/.test(negative) ? (/\[red\]/i.test(negative) ? 3 : 2) : (/\[red\]/i.test(negative) ? 1 : 0);
  const useThousands = /#,##|0,000/.test(visible);
  if (/%/.test(visible)) return { category: "percentage", decimals };

  // Strip non-currency parts (_x padding, *x fill, \x escape, [tags]) before matching naked currency
  const bracketCurrency = source.match(/\[\$([^\]-]+)(?:-[^\]]+)?\]/)?.[1];
  const quotedCurrency = source.match(/"([^"]*?[$€£¥₫][^"]*?)"/)?.[1] || source.match(/"([$€£¥₫])"/)?.[1];
  const stripped = source
    .replace(/\[\$([^\]-]+)(?:-[^\]]+)?\]/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/_[\s\S]|\*[\s\S]|\\./g, "");
  const nakedCurrency = stripped.match(/[$€£¥₫]/)?.[0] || (/\bVND\b/i.test(stripped) ? "₫" : "");
  const currency = bracketCurrency || quotedCurrency || nakedCurrency || "";

  if (currency) {
    const accounting = /_[([]|\*\s|_\)/.test(source);
    return { category: accounting ? "accounting" : "currency", decimals, useThousands, currencySymbol: currency, negativeStyle };
  }

  // Section 3 (zero value) format
  const sections = source.split(";");
  let zeroFormat;
  if (sections.length > 2) {
    const zeroSec = sections[2].replace(/_[\s\S]|\*[\s\S]|\\./g, "").trim();
    if (zeroSec.includes('"-"') || /^-+$/.test(zeroSec.replace(/\?/g, "").trim())) {
      zeroFormat = "-";
    }
  }

  const dateCode = visible.replace(/AM\/PM/ig, "").toLowerCase();
  const timePattern = dateCode.replace(/\s+/g, "");
  if (/^h{1,2}(?::m{1,2}(?::s{1,2})?)?$/i.test(timePattern)) {
    return { category: "time", timeFormat: timePattern };
  }
  if (/[dmy]/.test(dateCode) || /h+\s*:|\[h\]/i.test(source)) {
    return { category: "date", dateFormat: source.replace(/\[[^\]]*\]/g, "").replace(/"([^"]*)"/g, "$1") };
  }
  if (/e[+-]0/i.test(visible)) return { category: "scientific", decimals };
  if (/[/][?#0]/.test(visible)) return { category: "custom", code: source, customPattern: source };
  if (/[#0?]/.test(visible)) {
    const res = { category: "number", decimals, useThousands, negativeStyle };
    if (zeroFormat) res.zeroFormat = zeroFormat;
    return res;
  }
  return { category: "custom", code: source, customPattern: source };
}

export class SheetAdapter {
  // A border-only cell repeated over more columns / a border-only row repeated
  // over more rows than this is Excel's "format the whole row/column", not a
  // bordered table; it must not extend the used range (see parseFods scan).
  static get STYLE_ONLY_MAX_COLUMN_REPEAT() { return 64; }
  static get STYLE_ONLY_MAX_ROW_REPEAT() { return 32; }

  constructor(gridController, options = {}) {
    this.grid = gridController;
    this.options = { excel2016FunctionNameCompat: true, ...options };
    this.isDirty = false;
    this.sourceFileName = "BangTinh";
    this.sourceFilePath = "";
    this.shell = null;
    this._clipboardText = "";
    this._clipboardModel = null;
    this._clipboardSourceSheet = null;
    this._nativeClipboardHandlers = null;
  }

  /**
   * Reconstruct Excel format code from simplified numberFormat object.
   * Used to preserve original format when round-tripping through ODF.
   */
  _excelCodeFromNumberFormat(fmt) {
    if (!fmt || !fmt.category) return null;
    const cat = fmt.category;
    if (cat === "date") return String(fmt.dateFormat || "dd/mm/yyyy");
    if (cat === "time") return String(fmt.timeFormat || "hh:mm");
    const decimals = Number(fmt.decimals || 0);
    const useThousands = fmt.useThousands;
    const currencySymbol = fmt.currencySymbol || "";
    const negativeStyle = Number(fmt.negativeStyle || 0);
    const zeroFormat = fmt.zeroFormat;

    // Build negative section
    let negSection = "";
    if (negativeStyle === 1 || negativeStyle === 3) {
      negSection = "[Red]";
    }
    if (negativeStyle >= 2) {
      negSection += "(";
    }

    // Build number pattern
    let numPattern = "";
    if (useThousands) numPattern += "#,##";
    numPattern += "0";
    if (decimals > 0) {
      numPattern += "." + "0".repeat(decimals);
    }

    // Build positive section (section 1)
    let posSection = numPattern;
    if (cat === "currency" || cat === "accounting") {
      const symbol = currencySymbol || "₫";
      if (cat === "accounting") {
        posSection = `_(* ${symbol} ${numPattern}_);_(* ${negSection}${symbol} ${numPattern}`;
        if (negativeStyle >= 2) posSection += ")";
        posSection += `;_(* \"-\"??_)`;
      } else {
        posSection = `${symbol} ${numPattern}`;
      }
    } else if (cat === "percentage") {
      posSection = numPattern + "%";
    } else {
      posSection = numPattern;
    }

    // Build full format code with sections
    let code = posSection;
    if (negSection || negativeStyle >= 2) {
      code += ";" + negSection + numPattern + (cat === "currency" || cat === "accounting" ? ` ${currencySymbol}` : "") + (negativeStyle >= 2 ? ")" : "");
    } else {
      code += ";" + numPattern;
    }

    // Section 3 (zero)
    if (zeroFormat === "-") {
      code += ";\"-\"";
    } else {
      code += ";0";
    }

    // Section 4 (text)
    code += ";@";

    // Add accounting padding for accounting category
    if (cat === "accounting") {
      code = code.replace(/^_\(\* /, "_(* ").replace(/_\);_/, "_);_(* ").replace(/_\);_/, "_);_(* ").replace(/;@$/, ";_(@_)");
    }

    return code;
  }

  _excelCodeForNewNumberFormat(fmt) {
    const category = fmt?.category;
    const decimals = Math.max(0, Math.min(30, Number(fmt?.decimals) || 0));
    const number = `${fmt?.useThousands || category === "accounting" ? "#,##" : ""}0${decimals ? `.${"0".repeat(decimals)}` : ""}`;
    const symbol = String(fmt?.currencySymbol || "₫");
    if (category === "currency" && symbol === "₫") return `${number} [$₫];-${number} [$₫];${number} [$₫];@`;
    if (category === "accounting") {
      const currency = symbol === "₫" ? "[$₫]" : `[${symbol}]`;
      return `_(* ${number} ${currency}_);_(* (${number} ${currency})_);_(* \"-\"?? ${currency}_);_(@_)`;
    }
    return this._excelCodeFromNumberFormat(fmt);
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

  _guardQuickViewReadOnly() {
    const quickView = typeof window !== "undefined" ? window.__vnoSheetQuickViewController : null;
    if (!quickView?.active) return false;
    quickView.notifyReadOnly?.();
    return true;
  }

  async _refreshPivotTable() {
    if (!this.grid?.pivotTableEngine && typeof this.grid?._loadPivotEngine === "function") {
      await this.grid._loadPivotEngine();
    }
    return this.grid?.refreshPivotTable?.() || false;
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
    if (this.grid) this.grid.adapter = this;
    globalUnoBridge.attachDocument(this);
    // common.edit.undo/redo dùng chung 1 handler toàn Suite qua Command Bus — mỗi app
    // (Writer/Sheet/Slides) PHẢI tự bindHandler() lại khi active, nếu không app kích hoạt
    // trước (mặc định Writer) sẽ chiếm vĩnh viễn phím Ctrl+Z/Ctrl+Y cho mọi app khác.
    globalCommandBus.bindHandler("common.file.new", () => this.shell?.requestNewDocumentWindow?.() ?? this.newDocument());
    globalCommandBus.bindHandler("common.file.close", () => this.closeDocument());
    globalCommandBus.bindHandler("common.file.print", () => this.print());
    globalCommandBus.bindHandler("common.edit.undo", () => this.grid.undo ? this.grid.undo() : false);
    globalCommandBus.bindHandler("common.edit.redo", () => this.grid.redo ? this.grid.redo() : false);
    globalCommandBus.bindHandler("common.edit.repeat", () => this.grid.redo ? this.grid.redo() : false);
    globalCommandBus.bindHandler("common.edit.copy", () => this._copySelectedCell(false));
    globalCommandBus.bindHandler("common.edit.cut", () => this._copySelectedCell(true));
    globalCommandBus.bindHandler("common.edit.paste", () => this._pasteIntoSelectedCell(false));
    globalCommandBus.bindHandler("common.edit.pastePlain", () => this._pasteIntoSelectedCell(true));
    globalCommandBus.bindHandler("sheet.edit.pasteSpecial", () => this._openPasteSpecialFromClipboard());
    this._bindNativeClipboardEvents();
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
    globalCommandBus.bindHandler("sheet.font.family", (value) => this.grid.setFontFamily(typeof value === "string" ? value : (value?.family || value?.value || "Calibri")));
    globalCommandBus.bindHandler("sheet.font.size", (value) => this.grid.setFontSize((value && (typeof value === "number" || typeof value === "string")) ? value : (value?.size || value?.value || 11)));
    globalCommandBus.bindHandler("sheet.font.grow", () => this.grid.adjustFontSize(1));
    globalCommandBus.bindHandler("sheet.font.shrink", () => this.grid.adjustFontSize(-1));
    globalCommandBus.bindHandler("sheet.cell.alignTop", () => this.grid.setStyle("verticalAlign", "top"));
    globalCommandBus.bindHandler("sheet.cell.alignMiddle", () => this.grid.setStyle("verticalAlign", "middle"));
    globalCommandBus.bindHandler("sheet.cell.alignBottom", () => this.grid.setStyle("verticalAlign", "bottom"));
    globalCommandBus.bindHandler("sheet.cell.wrapText", () => this.grid.toggleWrapText());
    globalCommandBus.bindHandler("sheet.cell.insertLineBreak", () => this.grid.insertLineBreak?.());
    globalCommandBus.bindHandler("sheet.cell.orientation", (value) => this.grid.setCellOrientation(value));
    globalCommandBus.bindHandler("sheet.cell.indentIncrease", () => this.grid.adjustIndent(1));
    globalCommandBus.bindHandler("sheet.cell.indentDecrease", () => this.grid.adjustIndent(-1));
    globalCommandBus.bindHandler("sheet.cell.mergeCenter", () => this.grid.mergeCells("mergeCenter"));
    globalCommandBus.bindHandler("sheet.cell.mergeAcross", () => this.grid.mergeCells("mergeAcross"));
    globalCommandBus.bindHandler("sheet.cell.mergeCells", () => this.grid.mergeCells("mergeCells"));
    globalCommandBus.bindHandler("sheet.cell.unmerge", () => this.grid.unmergeCells());
    globalCommandBus.bindHandler("sheet.format.quickCategory", (value) => this.grid.applyQuickNumberCategory((typeof value === "string" ? value : (value?.category || value?.value)) || "general"));
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
    globalCommandBus.bindHandler("sheet-what-if-analysis", () => this.grid.showGoalSeekDialog ? this.grid.showGoalSeekDialog() : false);
    globalCommandBus.bindHandler("sheet.data.dataTable", () => this.grid.showDataTableDialog());
    globalCommandBus.bindHandler("sheet.data.scenarioManager", () => this.grid.showScenarioManagerDialog());
    globalCommandBus.bindHandler("sheet.data.pivotTable", () => this.grid.showPivotTableDialog());
    globalCommandBus.bindHandler("sheet.data.pivotRefresh", () => this._refreshPivotTable());
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
    globalCommandBus.bindHandler("sheet.review.toggleSpellCheck", () => {
      return this.grid.toggleSpellcheck ? this.grid.toggleSpellcheck() : false;
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
    globalCommandBus.bindHandler("sheet.file.printPreview", () => this.print());
    globalCommandBus.bindHandler("sheet.view.normal", () => this.grid.setWorkbookView ? this.grid.setWorkbookView("normal") : false);
    globalCommandBus.bindHandler("sheet.view.pageBreakPreview", () => this.grid.setWorkbookView ? this.grid.setWorkbookView("pageBreakPreview") : false);
    globalCommandBus.bindHandler("sheet.view.pageLayout", () => this.grid.setWorkbookView ? this.grid.setWorkbookView("pageLayout") : false);
    globalCommandBus.bindHandler("sheet.view.formulaBar", () => this.grid.toggleFormulaBar ? this.grid.toggleFormulaBar() : false);
    globalCommandBus.bindHandler("sheet.view.zoomToSelection", () => this.grid.zoomToSelection ? this.grid.zoomToSelection() : false);
    globalCommandBus.bindHandler("sheet.view.newWindow", () => this.grid.newWindow ? this.grid.newWindow() : false);
    globalCommandBus.bindHandler("sheet.view.freezePanesMenu", () => this.grid.toggleFreezePanes ? this.grid.toggleFreezePanes() : false);
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
    globalCommandBus.bindHandler("sheet.insert.cells", () => {
      return this.grid?.handleInsertShortcut ? this.grid.handleInsertShortcut() : false;
    });
    globalCommandBus.bindHandler("sheet.sheet.insertBefore", () => {
      return this.grid?.addSheetBefore ? this.grid.addSheetBefore() : false;
    });
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
    globalCommandBus.bindHandler("sheet.sheet.hide", (args) => this.grid.hideSheet ? this.grid.hideSheet(args?.sheetName) : false);
    globalCommandBus.bindHandler("sheet.sheet.unhide", (args) => args?.sheetName
      ? this.grid.unhideSheet?.(args.sheetName)
      : this.grid.showUnhideSheetDialog?.());
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
    globalCommandBus.bindHandler("sheet.cells.format", () => this.grid.showFormatCellsDialog());
    globalCommandBus.bindHandler("sheet.edit.fill", (options) => {
      options = options || {};
      return this.grid.fillDown ? this.grid.fillDown(options.range) : false;
    });
    globalCommandBus.bindHandler("sheet.edit.clear", (options) => {
      options = options || {};
      return this.grid.clearContents ? this.grid.clearContents(options.range) : false;
    });
    globalCommandBus.bindHandler("sheet.data.sortAsc", () => {
      return this.grid.sort ? this.grid.sort(this.grid.selectedCoord?.c || "A", true) : false;
    });
    globalCommandBus.bindHandler("sheet.data.sortDesc", () => {
      return this.grid.sort ? this.grid.sort(this.grid.selectedCoord?.c || "A", false) : false;
    });
    globalCommandBus.bindHandler("sheet.data.filter", () => {
      return this.grid.toggleFilter ? this.grid.toggleFilter() : false;
    });
    globalCommandBus.bindHandler("sheet.data.customSort", () => {
      return this.grid.showCustomSortDialog ? this.grid.showCustomSortDialog() : false;
    });
    globalCommandBus.bindHandler("sheet.insert.image", async (args) => {
      return await this._insertImageDialog(args || {});
    });
    globalCommandBus.bindHandler("sheet.chart.insert", () => {
      this.grid.openChartBuilder();
      return true;
    });
    globalCommandBus.bindHandler("sheet.insert.sparklineLine", (args) => {
      let range = args?.range;
      if (!range && typeof args === "string") range = this.grid._parseRange?.(args);
      return Boolean(this.grid.insertSparkline("line", range));
    });
    globalCommandBus.bindHandler("sheet.insert.sparklineColumn", (args) => {
      let range = args?.range;
      if (!range && typeof args === "string") range = this.grid._parseRange?.(args);
      return Boolean(this.grid.insertSparkline("column", range));
    });
    globalCommandBus.bindHandler("sheet.insert.hyperlink", async (args) => {
      let url = args?.url;
      let text = args?.text;
      if (!url) {
        const currentVal = this.grid?.selectedCoord ? (this.grid.getCellValue?.(this.grid.selectedCoord) || "") : "";
        const existingLink = this.grid?.selectedCoord ? (this.grid.getCellData?.(this.grid.selectedCoord)?.hyperlink || "https://") : "https://";
        const result = await showHyperlinkDialog({
          url: existingLink !== "https://" ? existingLink : "https://",
          text: text || currentVal
        });
        if (!result || !result.url) return false;
        url = result.url;
        text = result.text;
      }
      return url ? this.grid.insertHyperlink(url, text) : false;
    });
    globalCommandBus.bindHandler("sheet.insert.symbol", async (args) => {
      let ch = args?.char || args?.symbol;
      if (!ch) {
        ch = await showSymbolPicker();
      }
      return ch ? this.grid.insertSymbol(ch) : false;
    });
    globalCommandBus.bindHandler("sheet.insert.textbox", async (args) => {
      const text = args?.text || await showPromptDialog({ title: "Chèn hộp văn bản", message: "Nhập nội dung hộp văn bản:", defaultValue: "", placeholder: "Nội dung" });
      return text ? this.grid.insertTextBox(text) : false;
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
        app: "sheet",
        onFind: (text, options) => this.grid.findNext ? this.grid.findNext(text, options) : false,
        onFindPrev: (text, options) => this.grid.findPrev ? this.grid.findPrev(text, options) : false,
        onReplace: (findText, replaceText, options) => {
          if (!findText) return false;
          return this.grid.replaceOne ? this.grid.replaceOne(findText, replaceText, options) : false;
        },
        onReplaceAll: (findText, replaceText, options) => {
          if (!findText) return 0;
          return this.grid.replaceAll ? this.grid.replaceAll(findText, replaceText, options) : 0;
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
    const source = String(value);
    if (!source.includes("&")) return source;
    return source
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  /**
   * Compute a stable hash of a cell's style object for S8 untouched-cell detection.
   * Only includes properties that affect visual formatting: numberFormat, font, borders, fill, alignment.
   * Returns a simple string hash (not cryptographic).
   */
  _computeStyleHash(style) {
    if (!style || Object.keys(style).length === 0) return "";
    // Extract only visual formatting properties
    const visualProps = {
      numberFormat: style.numberFormat?.excelCode || style.numberFormat?.code || style.numberFormat?.category || "",
      fontFamily: style.fontFamily || "",
      fontSize: style.fontSize || "",
      fontWeight: style.fontWeight || "",
      fontStyle: style.fontStyle || "",
      textDecoration: style.textDecoration || "",
      color: style.color || "",
      backgroundColor: style.backgroundColor || "",
      borderLeft: style.borderLeft || "",
      borderRight: style.borderRight || "",
      borderTop: style.borderTop || "",
      borderBottom: style.borderBottom || "",
      textAlign: style.textAlign || "",
      verticalAlign: style.verticalAlign || "",
      whiteSpace: style.whiteSpace || "",
      textRotation: style.textRotation || "",
      indentLevel: style.indentLevel || 0,
    };
    // Viền chung (nút ribbon "Viền") chỉ vào hash khi có, để hash của ô không viền (và ảnh chụp kiểm thử cũ) không đổi.
    if (style.border) visualProps.border = style.border;
    return JSON.stringify(visualProps);
  }

  // Calc never writes fo:text-decoration for cells/runs; it uses
  // style:text-underline-style / style:text-line-through-style. Read both
  // forms so imported underline/strikethrough survive, and write both so
  // LibreOffice honours them on export.
  _odfTextDecoration(textProps) {
    const props = String(textProps || "");
    const explicit = props.match(/fo:text-decoration=["']([^"']+)["']/i)?.[1];
    if (explicit) return explicit;
    const parts = [];
    const underline = props.match(/style:text-underline-style=["']([^"']+)["']/i)?.[1];
    if (underline && underline !== "none") parts.push("underline");
    const strike = props.match(/style:text-line-through-(?:style|type)=["']([^"']+)["']/i)?.[1];
    if (strike && strike !== "none") parts.push("line-through");
    return parts.length ? parts.join(" ") : undefined;
  }

  _odfTextDecorationAttrs(textDecoration) {
    const value = String(textDecoration || "").trim();
    if (!value || value === "none") return [];
    const attrs = [`fo:text-decoration="${this._escapeXml(value)}"`];
    if (/underline/.test(value)) {
      attrs.push('style:text-underline-style="solid"', 'style:text-underline-width="auto"', 'style:text-underline-color="font-color"');
    }
    if (/line-through/.test(value)) {
      attrs.push('style:text-line-through-style="solid"', 'style:text-line-through-type="single"');
    }
    return attrs;
  }

  _normalizeFontFamily(value) {
    let font = this._unescapeXml(String(value || "")).trim();
    // LibreOffice may put a quoted family in style:font-name.  Quotes are
    // syntax in fo/svg font-family, but data when retained in style:font-name,
    // so carrying them into the model produces a literal &quot;...&quot; XLSX font.
    const wrapped = font.match(/^(["'])([\s\S]*)\1$/);
    if (wrapped) font = wrapped[2].trim();
    return font;
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

  _findTagBlockByAttr(xml, tagName, attrName, attrValue) {
    if (!attrValue) return null;
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<${escapedTag}\\b([^>]*)>([\\s\\S]*?)<\\/${escapedTag}>`, "gi");
    let match;
    while ((match = re.exec(xml)) !== null) {
      const attrs = this._parseTagAttrs(match[1]);
      if (attrs[attrName] === attrValue) return { attrs, body: match[2] };
    }
    return null;
  }

  _parseOdfHeaderFooter(masterPageBody) {
    const fieldTokens = [
      ["page-number", "&P"], ["page-count", "&N"], ["date", "&D"],
      ["time", "&T"], ["file-name", "&F"], ["sheet-name", "&A"]
    ];
    const plainText = value => {
      let text = String(value || "");
      for (const [tag, token] of fieldTokens) {
        const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        text = text
          .replace(new RegExp(`<text:${escaped}\\b[^>]*\\/>`, "gi"), token)
          .replace(new RegExp(`<text:${escaped}\\b[^>]*>[\\s\\S]*?<\\/text:${escaped}>`, "gi"), token);
      }
      text = text.replace(/<text:s\b([^>]*)\/>/gi, (_, attrs) => {
        const count = Number(this._parseTagAttrs(attrs)["text:c"] || 1);
        return " ".repeat(Math.max(1, Math.min(count, 100)));
      });
      text = text.replace(/<text:tab\b[^>]*\/>/gi, "\t").replace(/<text:line-break\b[^>]*\/>/gi, "\n");
      return this._unescapeXml(text.replace(/<[^>]+>/g, "")).replace(/\r/g, "").trim();
    };
    const parseSection = kind => {
      const block = String(masterPageBody || "").match(new RegExp(`<style:${kind}(?=[\\s>])[^>]*>([\\s\\S]*?)<\\/style:${kind}>`, "i"));
      const result = { left: "", center: "", right: "" };
      if (!block) return result;
      let hasRegions = false;
      for (const position of ["left", "center", "right"]) {
        const region = block[1].match(new RegExp(`<style:region-${position}(?=[\\s>])[^>]*>([\\s\\S]*?)<\\/style:region-${position}>`, "i"));
        if (region) {
          hasRegions = true;
          result[position] = plainText(region[1]);
        }
      }
      if (!hasRegions) result.center = plainText(block[1]);
      return result;
    };
    return { header: parseSection("header"), footer: parseSection("footer") };
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
   * do chính 3T Office ghi ra và chưa qua bất kỳ vòng chuyển đổi thật nào) không có sẵn.
   */
  _parseStandardOdfPageLayout(xml, tableStyleName) {
    if (!tableStyleName) return null;
    const tableStyleAttrs = this._findTagAttrsByAttr(xml, "style:style", "style:name", tableStyleName);
    const masterPageName = tableStyleAttrs?.["style:master-page-name"];
    if (!masterPageName) return null;
    const masterPageBlock = this._findTagBlockByAttr(xml, "style:master-page", "style:name", masterPageName);
    const masterPageAttrs = masterPageBlock?.attrs || this._findTagAttrsByAttr(xml, "style:master-page", "style:name", masterPageName);
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

    const tableStyleBlock = this._findTagBlockByAttr(xml, "style:style", "style:name", tableStyleName);
    const tablePropsMatch = tableStyleBlock?.body?.match(/<style:table-properties\b([^>]*)\/?>/i);
    const tableProps = this._parseTagAttrs(tablePropsMatch?.[1] || "");
    const printTokens = (props["style:print"] || tableProps["style:print"] || "").split(/\s+/).filter(Boolean);
    const centering = props["style:table-centering"] || "none";
    const scalePercent = parseInt(props["style:scale-to"], 10);
    const hasPageAxes = props["style:scale-to-X"] !== undefined || props["style:scale-to-Y"] !== undefined;
    const pagesWide = parseInt(props["style:scale-to-X"], 10);
    const pagesTall = parseInt(props["style:scale-to-Y"], 10);

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
        mode: hasPageAxes ? "pages" : "percent",
        percent: Number.isFinite(scalePercent) && scalePercent > 0 ? scalePercent : 100,
        pagesWide: Number.isFinite(pagesWide) && pagesWide >= 0 ? pagesWide : 1,
        pagesTall: Number.isFinite(pagesTall) && pagesTall >= 0 ? pagesTall : 0
      },
      headerFooter: this._parseOdfHeaderFooter(masterPageBlock?.body || ""),
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
   * Đọc tab-color từ style:style family="table" trong FODS do LibreOffice hoặc 3T Office tạo ra.
   */
  _parseStandardOdfTabColor(xml, tableStyleName) {
    if (!tableStyleName || !xml) return "";
    const escapedStyle = tableStyleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const styleMatch = xml.match(new RegExp(`<style:style\\b[^>]*style:name=["']${escapedStyle}["'][^>]*>([\\s\\S]*?)<\\/style:style>`, "i"));
    if (!styleMatch) return "";
    const propMatch = styleMatch[1].match(/<style:table-properties\b([^>]*)\/?>/i);
    if (!propMatch) return "";
    const attrs = this._parseTagAttrs(propMatch[1]);
    return attrs["table:tab-color"] || attrs["tableooo:tab-color"] || attrs["vno:tab-color"] || "";
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
      ...this._imageSourceIdFromAttrs(frameAttrs),
      src: `data:${mime};base64,${base64}`,
      ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
      ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
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
      ...this._imageSourceIdFromNode(frame),
      src: `data:${mime};base64,${base64}`,
      ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
      ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
      ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
      ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {})
    };
  }

  /**
   * Parse ALL embedded images from a cell (DOM branch).
   * Returns array of image objects.
   */
  _parseCellEmbeddedImagesDom(cellElement, baseId) {
    const DRAW_NS = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0";
    const OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";
    const SVG_NS = "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0";
    const frames = Array.from(cellElement.children).filter(child => child.localName === "frame" && child.namespaceURI === DRAW_NS);
    const images = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const image = Array.from(frame.children).find(child => child.localName === "image" && child.namespaceURI === DRAW_NS);
      if (!image) continue;
      const binaryNode = Array.from(image.children).find(child => child.localName === "binary-data" && child.namespaceURI === OFFICE_NS);
      const base64 = binaryNode ? (binaryNode.textContent || "").replace(/\s+/g, "") : "";
      if (!base64) continue;
      const mime = (image.getAttribute("draw:mime-type") || "image/png").toLowerCase();
      const widthRaw = frame.getAttribute("svg:width") || frame.getAttributeNS?.(SVG_NS, "width");
      const heightRaw = frame.getAttribute("svg:height") || frame.getAttributeNS?.(SVG_NS, "height");
      const xRaw = frame.getAttribute("svg:x") || frame.getAttributeNS?.(SVG_NS, "x");
      const yRaw = frame.getAttribute("svg:y") || frame.getAttributeNS?.(SVG_NS, "y");

      const widthCm = this._odfLengthToCm(widthRaw);
      const heightCm = this._odfLengthToCm(heightRaw);
      const offsetXCm = this._odfLengthToCm(xRaw);
      const offsetYCm = this._odfLengthToCm(yRaw);

      images.push({
        id: frame.getAttribute("draw:name") || `${baseId}_${i + 1}`,
        ...this._imageSourceIdFromNode(frame),
        src: `data:${mime};base64,${base64}`,
        ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
        ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
        ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
        ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {})
      });
    }
    return images;
  }

  /**
   * Parse ALL embedded images from a cell (regex branch).
   * Returns array of image objects.
   */
  _parseCellEmbeddedImages(cellXml, baseId) {
    const images = [];
    let match;
    const frameRegex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let index = 0;
    while ((match = frameRegex.exec(cellXml)) !== null) {
      const frameAttrs = match[1];
      const frameBody = match[2];
      const imageMatch = frameBody.match(/<draw:image\b([^>]*)>([\s\S]*?)<\/draw:image>/i);
      if (!imageMatch) continue;
      const binaryMatch = imageMatch[2].match(/<office:binary-data\b[^>]*>([\s\S]*?)<\/office:binary-data>/i);
      const base64 = binaryMatch ? binaryMatch[1].replace(/\s+/g, "") : "";
      if (!base64) continue;
      const mime = (imageMatch[1].match(/draw:mime-type=["']([^"']*)["']/i)?.[1] || "image/png").toLowerCase();
      const widthRaw = frameAttrs.match(/svg:width=["']([^"']*)["']/i)?.[1];
      const heightRaw = frameAttrs.match(/svg:height=["']([^"']*)["']/i)?.[1];
      const xRaw = frameAttrs.match(/svg:x=["']([^"']*)["']/i)?.[1];
      const yRaw = frameAttrs.match(/svg:y=["']([^"']*)["']/i)?.[1];

      const widthCm = this._odfLengthToCm(widthRaw);
      const heightCm = this._odfLengthToCm(heightRaw);
      const offsetXCm = this._odfLengthToCm(xRaw);
      const offsetYCm = this._odfLengthToCm(yRaw);

      images.push({
        id: frameAttrs.match(/draw:name=["']([^"']*)["']/i)?.[1] || `${baseId}_${index + 1}`,
        ...this._imageSourceIdFromAttrs(frameAttrs),
        src: `data:${mime};base64,${base64}`,
        ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
        ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
        ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
        ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {})
      });
      index++;
    }
    return images;
  }

  /**
   * Parse images from <table:shapes> (page-anchored images) using DOM.
   * These images have table:end-cell-address and svg:x/y for positioning.
   * Returns array of image objects with anchorType: "page" and position info.
   */
  _parseTableShapesImages(tableElement, sheetName) {
    const DRAW_NS = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0";
    const OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";
    const SVG_NS = "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0";
    const TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0";
    const shapes = Array.from(tableElement.getElementsByTagNameNS(TABLE_NS, "shapes"));
    if (!shapes.length) return [];
    const images = [];
    for (const shapesEl of shapes) {
      const frames = Array.from(shapesEl.getElementsByTagNameNS(DRAW_NS, "frame"));
      for (const frame of frames) {
        const image = Array.from(frame.getElementsByTagNameNS(DRAW_NS, "image"))[0];
        if (!image) continue;
        const binaryNode = Array.from(image.getElementsByTagNameNS(OFFICE_NS, "binary-data"))[0];
        const base64 = binaryNode ? (binaryNode.textContent || "").replace(/\s+/g, "") : "";
        if (!base64) continue;
        const mime = (image.getAttribute("draw:mime-type") || "image/png").toLowerCase();
        const widthRaw = frame.getAttribute("svg:width") || frame.getAttributeNS?.(SVG_NS, "width");
        const heightRaw = frame.getAttribute("svg:height") || frame.getAttributeNS?.(SVG_NS, "height");
        const xRaw = frame.getAttribute("svg:x") || frame.getAttributeNS?.(SVG_NS, "x");
        const yRaw = frame.getAttribute("svg:y") || frame.getAttributeNS?.(SVG_NS, "y");
        const endCellAddress = frame.getAttribute("table:end-cell-address") || frame.getAttributeNS?.(TABLE_NS, "end-cell-address");
        const widthCm = this._odfLengthToCm(widthRaw);
        const heightCm = this._odfLengthToCm(heightRaw);
        const offsetXCm = this._odfLengthToCm(xRaw);
        const offsetYCm = this._odfLengthToCm(yRaw);
        images.push({
          id: frame.getAttribute("draw:name") || `ShapeImage${images.length + 1}`,
          ...this._imageSourceIdFromNode(frame),
          src: `data:${mime};base64,${base64}`,
          ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
          ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
          ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
          ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {}),
          anchorType: "page",
          endCellAddress,
          sheetName
        });
      }
    }
    return images;
  }

  /**
   * Parse images from <table:shapes> (page-anchored images) using regex.
   * Used by the regex branch of parseFods.
   */
  _parseTableShapesImagesRegex(tableBodyXml, sheetName) {
    const shapesMatch = tableBodyXml.match(/<table:shapes>([\s\S]*?)<\/table:shapes>/i);
    if (!shapesMatch) return [];
    const shapesXml = shapesMatch[1];
    const images = [];
    const frameRegex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let frameMatch;
    while ((frameMatch = frameRegex.exec(shapesXml)) !== null) {
      const frameAttrs = frameMatch[1];
      const frameBody = frameMatch[2];
      const imageMatch = frameBody.match(/<draw:image\b([^>]*)>([\s\S]*?)<\/draw:image>/i);
      if (!imageMatch) continue;
      const binaryMatch = imageMatch[2].match(/<office:binary-data\b[^>]*>([\s\S]*?)<\/office:binary-data>/i);
      const base64 = binaryMatch ? binaryMatch[1].replace(/\s+/g, "") : "";
      if (!base64) continue;
      const mime = (imageMatch[1].match(/draw:mime-type=["']([^"']*)["']/i)?.[1] || "image/png").toLowerCase();
      const widthRaw = frameAttrs.match(/svg:width=["']([^"']*)["']/i)?.[1];
      const heightRaw = frameAttrs.match(/svg:height=["']([^"']*)["']/i)?.[1];
      const xRaw = frameAttrs.match(/svg:x=["']([^"']*)["']/i)?.[1];
      const yRaw = frameAttrs.match(/svg:y=["']([^"']*)["']/i)?.[1];
      const endCellAddress = frameAttrs.match(/table:end-cell-address=["']([^"']*)["']/i)?.[1];
      const widthCm = this._odfLengthToCm(widthRaw);
      const heightCm = this._odfLengthToCm(heightRaw);
      const offsetXCm = this._odfLengthToCm(xRaw);
      const offsetYCm = this._odfLengthToCm(yRaw);
      images.push({
        id: frameAttrs.match(/draw:name=["']([^"']*)["']/i)?.[1] || `ShapeImage${images.length + 1}`,
        ...this._imageSourceIdFromAttrs(frameAttrs),
        src: `data:${mime};base64,${base64}`,
        ...(Number.isFinite(widthCm) && widthCm >= 0 ? { widthCm } : {}),
        ...(Number.isFinite(heightCm) && heightCm >= 0 ? { heightCm } : {}),
        ...(Number.isFinite(offsetXCm) ? { offsetXCm } : {}),
        ...(Number.isFinite(offsetYCm) ? { offsetYCm } : {}),
        anchorType: "page",
        endCellAddress,
        sheetName
      });
    }
    return images;
  }

  _columnName(columnNumber) {
    let result = "";
    for (let n = columnNumber; n > 0; n = Math.floor((n - 1) / 26)) {
      result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
    }
    return result;
  }

  _excelSerialToIsoDate(serial) {
    if (!Number.isFinite(serial)) return null;
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + serial * 86400000);
    if (isNaN(date.getTime())) return null;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _excelSerialToIsoTime(serial) {
    if (!Number.isFinite(serial)) return null;
    const totalSeconds = Math.round(serial * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `PT${String(hours).padStart(2, "0")}H${String(minutes).padStart(2, "0")}M${String(seconds).padStart(2, "0")}S`;
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

  /**
   * Trả về Map(hàng tự động trong XLSX gốc -> chiều cao px lúc mở) để khi lưu, hàng còn nguyên chiều cao được
   * ghi `vno:auto-rows` và Python khôi phục đúng `ht`/không customHeight của file gốc (S30b).
   */
  _applyXlsxLayoutOverlay(raw, rowHeights, colWidths, context = null) {
    const autoRows = new Map();
    if (!raw) return autoRows;
    try {
      const layout = JSON.parse(this._unescapeXml(raw));
      for (const [column, width] of Object.entries(layout.columns || {})) if (Number.isFinite(Number(width))) colWidths.set(column, Number(width));
      // S30c: cột không có <col> trong XLSX = bề rộng mặc định Excel (không phải dcw·MDW + 5 của LibreOffice)
      if (Number.isFinite(Number(layout.defaultCol)) && Number(layout.defaultCol) > 0) {
        const explicit = new Set(Object.keys(layout.columns || {}));
        for (const column of [...colWidths.keys()]) {
          if (!explicit.has(column)) colWidths.set(column, Number(layout.defaultCol));
        }
        // Sheet gần trống (lan22 s2: LibreOffice không ghi style cột) vẫn phải vẽ A..Z theo mặc định Excel (72px MDW 8)
        let maxNumber = 26;
        for (const column of [...explicit, ...colWidths.keys()]) maxNumber = Math.max(maxNumber, this._columnNumber(column) || 0);
        for (let number = 1; number <= Math.min(maxNumber, 256); number++) {
          const name = this._columnName(number);
          if (!colWidths.has(name)) colWidths.set(name, Number(layout.defaultCol));
        }
      }
      for (const [row, height] of Object.entries(layout.rows || {})) if (Number.isFinite(Number(height))) rowHeights.set(Number(row), Number(height));
      if (layout.wrap && context?.data) this._raiseAutoRowsForWrappedCells(layout.wrap, rowHeights, colWidths, context);
      for (const row of layout.auto || []) {
        const height = rowHeights.get(Number(row));
        if (Number.isFinite(height)) autoRows.set(Number(row), height);
      }
    } catch (_) {
      // Ignore malformed optional overlay; standard ODF dimensions remain usable.
    }
    return autoRows;
  }

  /** Danh sách hàng tự động (S30b) còn nguyên chiều cao lúc mở, dạng "19,20,21" cho vno:auto-rows. */
  _untouchedAutoRowsAttr(sheetName) {
    const imported = this.grid?.autoRowsAtImportBySheet?.[sheetName];
    if (!imported || typeof imported.entries !== "function") return "";
    const current = this._asLayoutMap(this.grid?.rowHeightsBySheet?.[sheetName], true);
    const rows = [];
    for (const [row, height] of imported.entries()) {
      const now = current.get(Number(row));
      if (Number.isFinite(now) && Math.abs(now - height) < 0.01) rows.push(Number(row));
    }
    return rows.length ? ` vno:auto-rows="${rows.join(",")}"` : "";
  }

  /**
   * S30a: hàng không có customHeight trong XLSX được Excel tính lại theo số dòng của ô bọc chữ.
   * Python đã đặt chiều cao nền (font 1 dòng); ở đây đo số dòng thật bằng DOM ẩn (cùng CSS ô lưới:
   * padding 3px, pre-wrap, overflow-wrap anywhere) rồi nâng hàng lên h(n) đo từ Excel
   * (`wrap` = {coord: [h1, h2, h3, h5]}). Không có DOM (node test) thì giữ chiều cao nền.
   */
  _raiseAutoRowsForWrappedCells(wrapMap, rowHeights, colWidths, context) {
    if (typeof document === "undefined" || !document.body) return;
    const entries = Object.entries(wrapMap || {});
    if (!entries.length) return;
    const data = context.data;
    const merged = Array.isArray(context.mergedRanges) ? context.mergedRanges : [];
    const defaultColWidth = Number.isFinite(context.defaultColWidth) ? context.defaultColWidth : 64;
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none;";
    const probes = [];
    for (const [coord, spec] of entries) {
      const match = /^([A-Z]+)(\d+)$/.exec(coord);
      const item = data.get(coord);
      const heights = Array.isArray(spec) ? spec : spec?.h;
      if (!match || !item || !Array.isArray(heights) || heights.length < 4) continue;
      // S31b: Python kèm các run rich text của ô (`runs` = [{t, h, f}]) để tính cao từng dòng theo font trên dòng
      const richRuns = Array.isArray(spec?.runs) && spec.runs.length ? spec.runs.filter(run => run && typeof run.t === "string" && Array.isArray(run.h) && run.h.length >= 4) : null;
      const text = richRuns ? richRuns.map(run => run.t).join("")
        : Array.isArray(item.richText) && item.richText.length ? item.richText.map(run => run.text || "").join("") : String(item.val ?? "");
      if (!text) continue;
      const col = match[1];
      const row = Number(match[2]);
      const span = merged.find(range => range.start?.c === col && range.start?.r === row);
      let width = 0;
      if (span) {
        const from = this._columnNumber(span.start.c);
        const to = this._columnNumber(span.end.c);
        for (let number = from; number <= to; number++) width += Number(colWidths.get(this._columnName(number))) || defaultColWidth;
      } else {
        width = Number(colWidths.get(col)) || defaultColWidth;
      }
      const style = item.style || {};
      const cellFont = {
        css: `${style.fontStyle || "normal"} ${style.fontWeight || "normal"} ${style.fontSize || "14.67px"} ${style.fontFamily || "Calibri, Carlito, Arial, sans-serif"}`,
        px: parseFloat(style.fontSize) || 14.67,
        family: style.fontFamily || "Calibri, Carlito, Arial, sans-serif",
        heights: heights.map(Number)
      };
      const runs = richRuns
        ? richRuns.map(run => ({ text: run.t, heights: run.h.map(Number), css: this._wrapProbeRunFont(run.f, cellFont), px: run.f ? Number(run.f.size) * 96 / 72 : cellFont.px }))
        : [{ text, heights: cellFont.heights, css: cellFont.css, px: cellFont.px }];
      const paragraphs = this._wrapProbeParagraphs(runs);
      // Thanh chống (strut) cao hơn mọi font trong ô để mỗi hộp dòng đúng bằng strut -> chỉ số dòng = floor(tâm rect / strut)
      const strut = Math.ceil(Math.max(cellFont.px, ...runs.map(run => run.px || 0)) * 4);
      const cell = document.createElement("div");
      cell.style.cssText = `box-sizing:border-box;width:${width}px;padding:3px;font:${cellFont.css};`;
      for (const paragraph of paragraphs) {
        const block = document.createElement("div");
        block.style.cssText = `white-space:pre-wrap;overflow-wrap:anywhere;line-height:${strut}px;min-height:${strut}px;`;
        for (const fragment of paragraph.spans) {
          const node = document.createElement("span");
          node.style.cssText = `font:${fragment.css};line-height:normal;`;
          node.textContent = fragment.text;
          block.appendChild(node);
          fragment.node = node;
        }
        cell.appendChild(block);
        paragraph.block = block;
      }
      host.appendChild(cell);
      probes.push({ row, strut, paragraphs, runs });
    }
    if (!probes.length) return;
    document.body.appendChild(host);
    try {
      for (const probe of probes) {
        const target = this._excelRowHeightFromProbe(probe);
        if (!Number.isFinite(target)) continue;
        const current = Number(rowHeights.get(probe.row));
        if (!Number.isFinite(current) || target > current) rowHeights.set(probe.row, target);
      }
    } finally {
      host.remove();
    }
  }

  /** CSS `font` cho run rich text từ font XLSX ({name, size pt, bold, italic}); thiếu -> font ô. */
  _wrapProbeRunFont(font, cellFont) {
    if (!font || !font.name) return cellFont.css;
    const px = Number(font.size) > 0 ? Number(font.size) * 96 / 72 : cellFont.px;
    return `${font.italic ? "italic" : "normal"} ${font.bold ? "bold" : "normal"} ${px}px "${String(font.name).replace(/"/g, "")}", ${cellFont.family}`;
  }

  /**
   * Tách các run thành đoạn (theo "\n"): {spans: [{text, heights, css}], term: heights của run chứa ký tự "\n"
   * kết thúc đoạn (null ở đoạn cuối)}. Đoạn trống (hai "\n" liền, "\n" cuối ô) vẫn là một dòng như Excel (S31a).
   */
  _wrapProbeParagraphs(runs) {
    const paragraphs = [{ spans: [], term: null }];
    for (const run of runs) {
      const pieces = String(run.text).split("\n");
      pieces.forEach((piece, index) => {
        if (index > 0) {
          paragraphs[paragraphs.length - 1].term = run.heights;
          paragraphs.push({ spans: [], term: null });
        }
        if (piece) paragraphs[paragraphs.length - 1].spans.push({ text: piece, heights: run.heights, css: run.css });
      });
    }
    return paragraphs;
  }

  /**
   * Chiều cao hàng AutoFit của Excel cho ô bọc chữ (đo COM 21/9, _excel_multiline.ps1/_excel_mixed2.ps1):
   * 1 dòng = h1; n dòng = tổng bước dòng L (= (h5-h3)/2) của font cao nhất trên từng dòng — kể cả font của
   * ký tự "\n" kết thúc dòng — cộng phần dư pad (= h2 - 2L) của font dòng cuối; trần 409.5pt = 546px.
   * Font đồng nhất: n·L + pad = đúng bảng h2/h3/h5 và ngoại suy n>5 (TNR 10: 17n+1, TNR 18: 31n).
   */
  _excelRowHeightFromProbe(probe) {
    const stepOf = heights => (Number(heights[3]) - Number(heights[2])) / 2;
    const padOf = heights => Number(heights[1]) - 2 * stepOf(heights);
    const lines = [];
    let lastHeights = probe.runs[probe.runs.length - 1].heights;
    for (const paragraph of probe.paragraphs) {
      const rect = paragraph.block.getBoundingClientRect();
      const count = Math.max(1, Math.round(rect.height / probe.strut));
      const start = lines.length;
      for (let index = 0; index < count; index++) lines.push({ step: 0, heights: null });
      for (const fragment of paragraph.spans) {
        const range = document.createRange();
        range.selectNodeContents(fragment.node);
        for (const box of range.getClientRects()) {
          if (!(box.width > 0)) continue;
          const index = Math.min(count - 1, Math.max(0, Math.floor((box.top + box.height / 2 - rect.top) / probe.strut)));
          const line = lines[start + index];
          const step = stepOf(fragment.heights);
          if (step >= line.step) { line.step = step; line.heights = fragment.heights; }
        }
        lastHeights = fragment.heights;
      }
      const term = paragraph.term || (paragraph.spans.length ? null : lastHeights);
      if (term) {
        const line = lines[start + count - 1];
        if (stepOf(term) >= line.step) { line.step = stepOf(term); line.heights = term; }
        lastHeights = term;
      }
      for (let index = 0; index < count; index++) {
        const line = lines[start + index];
        if (!line.heights) { line.heights = lastHeights; line.step = stepOf(lastHeights); }
      }
    }
    if (!lines.length) return NaN;
    if (lines.length === 1) return Math.min(546, Number(lines[0].heights[0]));
    const total = lines.reduce((sum, line) => sum + line.step, 0) + padOf(lines[lines.length - 1].heights);
    return Math.min(546, Math.round(total));
  }

  /** h(n) từ [h1, h2, h3, h5] đo Excel: n<=5 tra/nội suy, n>5 ngoại suy theo (h5-h3)/2 mỗi dòng (font đồng nhất). */
  _excelAutoRowHeightPx(heights, lines) {
    const [h1, h2, h3, h5] = heights.map(Number);
    if (lines <= 1) return h1;
    if (lines === 2) return h2;
    if (lines === 3) return h3;
    if (lines === 4) return Math.round(h3 + (h5 - h3) / 2);
    if (lines === 5) return h5;
    return Math.min(546, Math.round(h5 + (lines - 5) * (h5 - h3) / 2));
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
    if (this.options?.excel2016FunctionNameCompat !== false) {
      expression = mapOoxmlFunctionPrefixes(expression, { write: true });
    }
    const references = [];
    // A deleted reference is `#REF!` in Excel syntax but `[#REF!]` in ODF. Written bare,
    // LibreOffice cannot parse the formula and saves `=#N/A` (legacy06.xls, 9 cells).
    // Only outside "string literals" — a quoted "#REF!" is user text.
    expression = expression.split(/("(?:[^"]|"")*")/).map((part, index) => (
      index % 2 === 1 ? part : part.replace(/(^|[^\w\]])#REF!/g, (_, before) => {
        references.push("[#REF!]");
        return `${before}__VNO_REF_${references.length - 1}__`;
      })
    )).join("");
    expression = expression.replace(/((?:'[^']+'|[A-Za-z0-9_À-ỹ ]+)!)?(\$?[A-Z]+\$?\d+):(\$?[A-Z]+\$?\d+)/g, (_, sheet, start, end) => {
      const prefix = sheet ? `$${sheet.slice(0, -1)}.` : ".";
      references.push(`[${prefix}${start}:${prefix}${end}]`);
      return `__VNO_REF_${references.length - 1}__`;
    });
    // Whole-column ranges (`$A:$C`, `'Giá cost1'!$A:$C`): ODF has no column-only
    // reference, LibreOffice writes rows 1..1048576. Left as Excel syntax the
    // sheet part became `'giá cost1' $A:$C` in the saved XLSX and Excel refused
    // to open the workbook (measured on xét lương công ty.xlsx).
    expression = expression.replace(/((?:'[^']+'|[A-Za-z0-9_À-ỹ ]+)!)?(?<![A-Za-z0-9_.\]])(\$?)([A-Z]{1,3}):(\$?)([A-Z]{1,3})(?![A-Za-z0-9_(])/g, (_, sheet, startAbs, startCol, endAbs, endCol) => {
      const prefix = sheet ? `$${sheet.slice(0, -1)}.` : ".";
      references.push(`[${prefix}${startAbs}${startCol}$1:${prefix}${endAbs}${endCol}$1048576]`);
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

  /** True when a LibreOffice formula references another workbook ('file:///…/B.xlsx'#$Sheet1.A1). */
  _isExternalOdfFormula(formula) {
    return /\[\s*'[^']*'#\$/.test(String(formula || ""));
  }

  /**
   * Excel spelling of one LibreOffice external reference, e.g.
   * 'file:///E:/x/B.xlsx'#$Sheet1.A1:.A3 → [B.xlsx]Sheet1!A1:A3. The file name
   * is what Excel shows while the source workbook is closed.
   */
  _externalReferenceToExcel(reference) {
    const match = String(reference).match(/^'([^']*)'#\$((?:'[^']+'|[^.]+))\.(.+)$/);
    if (!match) return null;
    const fileName = decodeURIComponent(match[1].split(/[\\/]/).pop() || match[1]);
    const sheet = match[2].replace(/^'(.*)'$/, "$1").replace(/''/g, "'");
    const cells = match[3].split(":").map(part => part.replace(/^\$?[^.]*\./, "")).join(":");
    const book = `[${fileName}]${sheet}`;
    const needsQuotes = /[^A-Za-z0-9_À-ỹ[\].]/.test(book);
    return `${needsQuotes ? `'${book.replace(/'/g, "''")}'` : book}!${cells}`;
  }

  _formulaFromOdf(formula) {
    if (!formula) return "";
    let expression = String(formula).replace(/^of:=/i, "=");
    expression = mapOoxmlFunctionPrefixes(expression, { write: false });
    // External workbook references contain "file:///E:" — resolve them before the
    // generic ':' split below, which would cut the path apart.
    const externals = [];
    expression = expression.replace(/\[\s*('[^']*'#\$[^\]]+)\]/g, (all, reference) => {
      const excel = this._externalReferenceToExcel(reference);
      if (!excel) return all;
      externals.push(excel);
      return `__VNO_EXT_${externals.length - 1}__`;
    });
    expression = expression.replace(/\[([^\]]+)\]/g, (_, reference) => {
      const parts = reference.split(":").map(part => {
        if (part.startsWith(".")) return part.slice(1);
        const match = part.match(/^\$((?:'[^']+'|[^.]+))\.(.+)$/);
        return match ? `${match[1]}!${match[2]}` : part;
      });
      // Rows 1..1048576 is how LibreOffice spells an Excel whole-column range.
      if (parts.length === 2) {
        const first = parts[0].match(/^((?:'[^']+'|[^!]+)!)?(\$?[A-Z]{1,3})\$?1$/);
        const second = parts[1].match(/^((?:'[^']+'|[^!]+)!)?(\$?[A-Z]{1,3})\$?1048576$/);
        if (first && second) return `${first[1] || ""}${first[2]}:${second[2]}`;
      }
      return parts.join(":");
    });
    expression = expression.replace(/__VNO_EXT_(\d+)__/g, (_, index) => externals[Number(index)]);
    return this._replaceFormulaSeparators(expression, ";", ",");
  }

  _replaceFormulaSeparators(expression, from, to) {
    let inString = false;
    // A quoted sheet name ('Mạng, camera'!G8) may contain the separator itself; replacing
    // it there broke the reference and the saved workbook showed #VALUE! (legacy09.xls).
    let inSheetName = false;
    let result = "";
    for (let index = 0; index < expression.length; index++) {
      const char = expression[index];
      if (char === '"' && !inSheetName) {
        if (inString && expression[index + 1] === '"') {
          result += '""';
          index++;
          continue;
        }
        inString = !inString;
      } else if (char === "'" && !inString) {
        if (inSheetName && expression[index + 1] === "'") {
          result += "''";
          index++;
          continue;
        }
        inSheetName = !inSheetName;
      }
      result += !inString && !inSheetName && char === from ? to : char;
    }
    return result;
  }

  _numberFormatXml(config, name) {
    // Quy ước S7: định dạng số nhập từ file giữ NGUYÊN data-style ODF mà LibreOffice sinh khi nhập XLSX
    // (biểu diễn chính xác của mã Excel: 4 section qua style:map, đệm _( _), [$€-1], [Red]...). Đổi tên
    // style + các style phụ theo tên mới; LibreOffice ghi lại đúng numFmt gốc. Chỉ khi người dùng đổi
    // định dạng trong app (không còn odf) mới sinh từ category/excelCode.
    if (config.odf?.xml) {
      const rename = new Map([[config.odf.name, name]]);
      (config.odf.deps || []).forEach((dep, k) => rename.set(dep.name, `${name}S${k}`));
      const renamed = (xml) => xml
        .replace(/style:name=(["'])([^"']+)\1/g, (m, q, n) => `style:name=${q}${rename.get(n) || n}${q}`)
        .replace(/style:apply-style-name=(["'])([^"']+)\1/g, (m, q, n) => `style:apply-style-name=${q}${rename.get(n) || n}${q}`);
      return (config.odf.deps || []).map(dep => renamed(dep.xml)).join("") + renamed(config.odf.xml);
    }
    if (config.excelCode) {
      return this._numberFormatXmlFromExcelCode(config.excelCode, name);
    }
    const category = String(config.category || "number");
    if (category === "currency" || category === "accounting") {
      return this._numberFormatXmlFromExcelCode(this._excelCodeForNewNumberFormat(config), name);
    }
    const decimals = Math.max(0, Math.min(30, Number(config.decimals ?? (["currency", "accounting", "percentage", "scientific"].includes(category) ? 2 : 0))));
    const grouping = config.useThousands || category === "accounting" ? ' number:grouping="true"' : "";
    const number = `<number:number number:min-integer-digits="1" number:decimal-places="${decimals}" number:min-decimal-places="${decimals}"${grouping}/>`;
    const negativeStyle = Number(config.negativeStyle || 0);
    const negativeWrapper = negativeStyle >= 2
      ? `<number:text>(</number:text>${number}<number:text>)</number:text>`
      : (negativeStyle === 1 ? `<number:text>-</number:text>${number}` : number);
    const negativeColor = [1, 3].includes(negativeStyle) ? '<style:text-properties fo:color="#ff0000"/>' : "";
    const mappedStyles = body => negativeStyle > 0
      ? `<number:number-style style:name="${name}P">${number}</number:number-style><number:number-style style:name="${name}">${negativeColor}${body}<style:map style:condition="value()&gt;=0" style:apply-style-name="${name}P"/></number:number-style>`
      : `<number:number-style style:name="${name}">${body}</number:number-style>`;
    if (category === "percentage") return `<number:percentage-style style:name="${name}">${number}<number:text>%</number:text></number:percentage-style>`;
    if (category === "scientific") return `<number:number-style style:name="${name}"><number:scientific-number number:min-integer-digits="1" number:decimal-places="${decimals}" number:min-decimal-places="${decimals}" number:min-exponent-digits="2"/></number:number-style>`;
    if (category === "text") return `<number:text-style style:name="${name}"><number:text-content/></number:text-style>`;
    if (category === "date" || category === "time") {
      const tokens = String(config.dateFormat || config.timeFormat || (category === "time" ? "hh:mm" : "dd/mm/yyyy")).match(/"[^"]*"|yyyy|yy|mmmm|mm|dd|hh|h|ss|s|m|d|./gi) || [];
      const parts = tokens.map(token => {
        const lower = token.toLowerCase();
        if (["d", "dd"].includes(lower)) return `<number:day number:style="${lower === "dd" ? "long" : "short"}"/>`;
        if (category === "time" && ["m", "mm"].includes(lower)) return `<number:minutes number:style="${lower === "mm" ? "long" : "short"}"/>`;
        if (["m", "mm", "mmmm"].includes(lower)) return `<number:month number:style="${lower === "m" ? "short" : "long"}"${lower === "mmmm" ? ' number:textual="true"' : ""}/>`;
        if (["yy", "yyyy"].includes(lower)) return `<number:year number:style="${lower === "yyyy" ? "long" : "short"}"/>`;
        if (["h", "hh"].includes(lower)) return `<number:hours number:style="${lower === "hh" ? "long" : "short"}"/>`;
        if (["s", "ss"].includes(lower)) return `<number:seconds number:style="${lower === "ss" ? "long" : "short"}"/>`;
        return `<number:text>${this._escapeXml(token.replace(/^"|"$/g, ""))}</number:text>`;
      }).join("");
      return `<number:${category === "time" ? "time" : "date"}-style style:name="${name}">${parts}</number:${category === "time" ? "time" : "date"}-style>`;
    }
    if (["currency", "accounting"].includes(category)) {
      const rawSymbol = config.currencySymbol ?? "₫";
      const symbol = `<number:currency-symbol>${this._escapeXml(rawSymbol)}</number:currency-symbol>`;
      const after = config.symbolPosition === "after" || (config.symbolPosition === undefined && rawSymbol === "₫");
      const spacer = category === "accounting" ? '<number:fill-character> </number:fill-character>' : '<number:text> </number:text>';
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

  /**
   * Generate ODF number-style XML from raw Excel format code.
   * Preserves all 4 sections: positive; negative; zero; text.
   * Handles Accounting padding (_(), _), currency symbols, colors, etc.
   */
  _numberFormatXmlFromExcelCode(excelCode, name) {
    const code = String(excelCode || "General");
    if (/^general$/i.test(code)) return `<number:number-style style:name="${name}"><number:number number:min-integer-digits="1"/></number:number-style>`;
    if (code === "@") return `<number:text-style style:name="${name}"><number:text-content/></number:text-style>`;

    // Parse Excel format code into 4 sections
    const sections = code.split(";").map(s => s.trim());
    const pos = sections[0] || "";
    const neg = sections[1] || "";
    const zero = sections[2] || "";
    const text = sections[3] || "";

    // Detect accounting style: _(* ...)_) padding
    const isAccounting = /_\(/.test(pos) && /_\)/.test(pos);
    // Detect currency symbol
    const currencyMatch = code.match(/\[\$([^\]-]+)(?:-[^\]]+)?\]/) || code.match(/[$€£¥₫]/);
    const currencySymbol = currencyMatch ? (currencyMatch[1] || currencyMatch[0]) : "";
    // Detect negative style: parentheses, red color
    const negHasParen = /\(/.test(neg) && /\)/.test(neg);
    const negIsRed = /\[red\]/i.test(neg);
    // Detect zero format "-"
    const zeroIsDash = /^-+$/.test(zero.replace(/\?/g, "").trim()) || zero.includes('"-"');
    // Detect thousands separator
    const useThousands = /#,##|0,000/.test(pos);
    // Extract decimal places
    const decimalMatch = pos.match(/\.([0#?]+)/);
    const decimals = decimalMatch ? decimalMatch[1].length : 0;

    // Build the core number format element
    const grouping = useThousands ? ' number:grouping="true"' : "";
    const numberEl = `<number:number number:min-integer-digits="1" number:decimal-places="${decimals}" number:min-decimal-places="${decimals}"${grouping}/>`;

    // Build positive section
    let posBody = "";
    if (isAccounting) {
      // Accounting: _( * symbol number _) with padding
      const symbol = currencySymbol || "₫";
      posBody = `<number:text> </number:text>${numberEl}<number:fill-character> </number:fill-character><number:currency-symbol>${this._escapeXml(symbol)}</number:currency-symbol><number:text> </number:text>`;
    } else if (currencySymbol) {
      // Currency
      const after = pos.indexOf(currencySymbol) > pos.indexOf("0") || pos.indexOf(currencySymbol) > pos.indexOf("#");
      posBody = after ? `${numberEl}<number:text> </number:text><number:currency-symbol>${this._escapeXml(currencySymbol)}</number:currency-symbol>` : `<number:currency-symbol>${this._escapeXml(currencySymbol)}</number:currency-symbol><number:text> </number:text>${numberEl}`;
    } else if (/%/.test(pos)) {
      // Percentage
      posBody = `${numberEl}<number:text>%</number:text>`;
    } else {
      // Number
      posBody = numberEl;
    }

    // Handle negative/zero/text sections via style:map. style:map phải nằm TRONG style chính và điều kiện phải
    // escape (`value()&lt;0`) — bản đầu ghi `<` trần + map ngoài style: FODS hỏng, LibreOffice không mở được (lan10).
    const maps = [];
    const mapEls = [];
    let negBody = posBody;
    let negName = name;
    const subType = (isAccounting || currencySymbol) ? "currency-style" : (/%/.test(pos) ? "percentage-style" : "number-style");

    if (negHasParen || negIsRed) {
      // Create separate negative style
      negName = `${name}N`;
      let negInner = numberEl;
      if (currencySymbol && !isAccounting) {
        const after = neg.indexOf(currencySymbol) > neg.indexOf("0") || neg.indexOf(currencySymbol) > neg.indexOf("#");
        negInner = after ? `${numberEl}<number:text> </number:text><number:currency-symbol>${this._escapeXml(currencySymbol)}</number:currency-symbol>` : `<number:currency-symbol>${this._escapeXml(currencySymbol)}</number:currency-symbol><number:text> </number:text>${numberEl}`;
      } else if (isAccounting) {
        const symbol = currencySymbol || "₫";
        negInner = `<number:text> </number:text>${numberEl}<number:fill-character> </number:fill-character><number:currency-symbol>${this._escapeXml(symbol)}</number:currency-symbol><number:text> </number:text>`;
      } else if (/%/.test(neg)) {
        negInner = `${numberEl}<number:text>%</number:text>`;
      }
      if (negHasParen) {
        negInner = `<number:text>(</number:text>${negInner}<number:text>)</number:text>`;
      }
      const negColor = negIsRed ? '<style:text-properties fo:color="#ff0000"/>' : "";
      maps.push(`<number:${subType} style:name="${negName}">${negColor}${negInner}</number:${subType}>`);
      mapEls.push(`<style:map style:condition="value()&lt;0" style:apply-style-name="${negName}"/>`);
    } else if (negIsRed) {
      // Red negative without parentheses
      negName = `${name}N`;
      let negInner = numberEl;
      if (currencySymbol && !isAccounting) {
        const after = neg.indexOf(currencySymbol) > neg.indexOf("0") || neg.indexOf(currencySymbol) > neg.indexOf("#");
        negInner = after ? `${numberEl}<number:fill-character> </number:fill-character><number:currency-symbol>${this._escapeXml(currencySymbol)}</number:currency-symbol>` : `<number:currency-symbol>${this._escapeXml(currencySymbol)}</number:currency-symbol><number:fill-character> </number:fill-character>${numberEl}`;
      } else if (/%/.test(neg)) {
        negInner = `${numberEl}<number:text>%</number:text>`;
      }
      maps.push(`<number:${subType} style:name="${negName}"><style:text-properties fo:color="#ff0000"/>${negInner}</number:${subType}>`);
      mapEls.push(`<style:map style:condition="value()&lt;0" style:apply-style-name="${negName}"/>`);
    }

    // Zero section
    if (zeroIsDash) {
      const zeroName = `${name}Z`;
      maps.push(`<number:${subType} style:name="${zeroName}"><number:text>-</number:text></number:${subType}>`);
      mapEls.push(`<style:map style:condition="value()=0" style:apply-style-name="${zeroName}"/>`);
    }
    // Section chuỗi (@): ODF không có điều kiện cho chuỗi; LibreOffice hiển thị chuỗi nguyên văn nên bỏ qua.

    const styleType = subType;
    const mainStyle = `<number:${styleType} style:name="${name}">${posBody}${mapEls.join("")}</number:${styleType}>`;
    return maps.join("") + mainStyle;
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
    // XLSX import; seed the subset produced by the formats 3T Sheet writes.
    const dataStyles = new Map([
      ["N0", { category: "number", decimals: 0, useThousands: false }],
      ["N4", { category: "number", decimals: 2, useThousands: true }],
      ["N36", { category: "date", dateFormat: "dd/mm/yyyy" }],
      ["N100", { category: "text" }]
    ]);
    const styleRegex = /<number:(number-style|percentage-style|currency-style|date-style|time-style|text-style|boolean-style)\b([^>]*)>([\s\S]*?)<\/number:\1>/gi;
    // XML thô của từng data-style (để ghi lại nguyên vẹn khi lưu — quy ước S7) + các style phụ mà style:map trỏ tới.
    const rawByName = new Map();
    for (const raw of xmlText.matchAll(styleRegex)) {
      const rawName = raw[2].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (rawName) rawByName.set(rawName, raw[0]);
    }
    const odfFor = (styleName) => {
      const xml = rawByName.get(styleName);
      if (!xml) return null;
      const deps = [];
      for (const m of xml.matchAll(/style:apply-style-name=["']([^"']+)["']/g)) {
        const depXml = rawByName.get(m[1]);
        if (depXml && m[1] !== styleName && !deps.some(d => d.name === m[1])) deps.push({ name: m[1], xml: depXml });
      }
      return { name: styleName, xml, deps };
    };
    let match;
    while ((match = styleRegex.exec(xmlText)) !== null) {
      const name = match[2].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      if (match[1] === "boolean-style") { dataStyles.set(name, { category: "general", odf: odfFor(name) }); continue; }
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
      } else if (match[1] === "date-style" || match[1] === "time-style") {
        config.category = match[1] === "time-style" ? "time" : "date";
        const parts = [];
        body.replace(/<number:(day|month|year|hours|minutes|seconds)\b([^>]*)\/>|<number:text\b[^>]*>([\s\S]*?)<\/number:text>/gi, (all, kind, attrs, text) => {
          if (!kind) parts.push(this._unescapeXml((text || "").replace(/<[^>]+>/g, "")));
          else if (kind === "day") parts.push(/style=["']long/i.test(attrs) ? "dd" : "d");
          else if (kind === "month") parts.push(/textual=["']true/i.test(attrs) ? "mmmm" : (/style=["']long/i.test(attrs) ? "mm" : "m"));
          else if (kind === "year") parts.push(/style=["']long/i.test(attrs) ? "yyyy" : "yy");
          else parts.push({ hours: "hh", minutes: "mm", seconds: "ss" }[kind]);
          return all;
        });
        if (config.category === "time") config.timeFormat = parts.join("");
        else config.dateFormat = parts.join("");
        delete config.decimals; delete config.useThousands;
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
      config.odf = odfFor(name);
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
    // Cells with visual styles (borders, background, font, alignment, etc.) should be persisted
    // even if they have no value — this preserves empty cells with borders.
    const s = item.style || {};
    const hasVisualStyle = s.backgroundColor || s.color || s.fontWeight || s.fontStyle ||
      s.textDecoration || s.fontFamily || s.fontSize || s.textAlign || s.verticalAlign ||
      s.whiteSpace || s.borderLeft || s.borderRight || s.borderTop || s.borderBottom;
    if (hasVisualStyle) return true;
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
  /**
   * <office:font-face-decls>: style:font-name là TÊN khai báo, không phải họ font. LibreOffice đặt "Calibri1",
   * "Arial1" khi cùng họ xuất hiện với pitch/charset khác (đo vòng 5: 56 ô "Calibri1", 54 ô "Arial1"; vòng 8 lan25
   * 14 ô) — họ thật nằm ở svg:font-family. Trả về Map tên → họ.
   */
  _parseFontFaceDecls(xmlText) {
    const faces = new Map();
    const block = String(xmlText || "").match(/<office:font-face-decls\b[^>]*>([\s\S]*?)<\/office:font-face-decls>/i)?.[1] || "";
    block.replace(/<style:font-face\b([^>]*?)\/?>/gi, (_, attrs) => {
      const name = this._unescapeXml(attrs.match(/style:name=["']([^"']+)["']/i)?.[1] || "");
      const family = this._normalizeFontFamily(attrs.match(/svg:font-family=["']([^"']+)["']/i)?.[1] || "");
      if (name && family) faces.set(name, family);
      return "";
    });
    return faces;
  }

  _resolveFontFaceName(rawName, fontFaces) {
    const name = this._normalizeFontFamily(rawName);
    if (!name) return name;
    return fontFaces?.get(name) || fontFaces?.get(String(rawName || "").trim()) || name;
  }

  _parseCellVisualStyles(xmlText) {
    const raw = new Map();
    const fontFaces = this._parseFontFaceDecls(xmlText);
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
        const borderShorthand = cellProps.match(/fo:border=["']([^"']+)["']/i)?.[1];
        const odfBorderToCss = (val) => {
          if (!val || val === "none" || val === "hidden") return "none";
          const parts = val.trim().split(/\s+/);
          if (parts.length < 3) return val;
          const [width, style, ...rest] = parts;
          let w = width;
          const wMatch = String(w).match(/^(-?[\d.]+)\s*(cm|mm|in|pt|pc|px)?$/i);
          if (wMatch) {
            const amount = Number(wMatch[1]);
            const unit = (wMatch[2] || "px").toLowerCase();
            const px = unit === "mm" ? amount * 3.779527559055118
              : unit === "cm" ? amount * 37.79527559055118
              : unit === "in" ? amount * 96
              : unit === "pt" ? amount * (96 / 72)
              : unit === "pc" ? amount * 16
              : amount;
            w = `${Math.round(px * 100) / 100}px`;
          }
          let s = style;
          if (s === "double-thin") s = "double";
          const color = rest.join(" ") || "#000000";
          return `${w} ${s} ${color}`;
        };
        if (borderShorthand) {
          const css = odfBorderToCss(borderShorthand);
          style.borderLeft = css;
          style.borderRight = css;
          style.borderTop = css;
          style.borderBottom = css;
        } else {
          if (borderLeft) style.borderLeft = odfBorderToCss(borderLeft);
          if (borderRight) style.borderRight = odfBorderToCss(borderRight);
          if (borderTop) style.borderTop = odfBorderToCss(borderTop);
          if (borderBottom) style.borderBottom = odfBorderToCss(borderBottom);
        }
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
        const textDecoration = this._odfTextDecoration(textProps);
        if (textDecoration) style.textDecoration = textDecoration;
        const color = textProps.match(/fo:color=["']([^"']+)["']/i)?.[1];
        if (color) style.color = color;
        const fontName = this._resolveFontFaceName(textProps.match(/style:font-name=["']([^"']+)["']/i)?.[1], fontFaces);
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
    const fontFaces = this._parseFontFaceDecls(xmlText);
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
      const textDecoration = this._odfTextDecoration(textProps);
      if (textDecoration) style.textDecoration = textDecoration;
      const fontName = this._resolveFontFaceName(textProps.match(/style:font-name=["']([^"']+)["']/i)?.[1], fontFaces);
      if (fontName) style.fontFamily = fontName;
      const fontSize = textProps.match(/fo:font-size=["']([^"']+)["']/i)?.[1];
      if (fontSize) {
        if (fontSize.endsWith("pt")) style.fontSize = `${Math.round(parseFloat(fontSize) * (96 / 72) * 100) / 100}px`;
        else if (fontSize.endsWith("px")) style.fontSize = `${Math.round(parseFloat(fontSize) * 100) / 100}px`;
        else style.fontSize = `${Math.round(parseFloat(fontSize) * 100) / 100}px`;
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
   * <text:p> là nội dung chữ của ô: chỉ lấy các đoạn không nằm trong <draw:frame>
   * (ảnh neo ô: soffice ghi `<draw:image>…<text:p/></draw:image>` — đo lan04 B23:
   * 2 ảnh → chuỗi "\n", 233 ô / 7 file) và không nằm trong <office:annotation>.
   */
  _cellTextParagraphs(cellElement) {
    const TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
    const DRAW_NS = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0";
    return Array.from(cellElement.getElementsByTagNameNS(TEXT_NS, "p")).filter(paragraph => {
      for (let node = paragraph.parentNode; node && node !== cellElement; node = node.parentNode) {
        // Mọi đối tượng vẽ neo ô: draw:frame (ảnh), draw:custom-shape / draw:rect / draw:g (text box, hình —
        // đo lan11 A19: chữ "Update V2" của text box lọt vào ô), office:annotation (ghi chú)
        if (node.namespaceURI === DRAW_NS || node.localName === "annotation") return false;
      }
      return true;
    });
  }

  /**
   * Chữ của một nút ODF inline: <text:s text:c="n"/> = n dấu cách, <text:tab/> = tab,
   * <text:line-break/> = xuống dòng (textContent bỏ mất cả ba).
   */
  _odfInlineText(node) {
    if (node.nodeType === 3) return node.nodeValue || "";
    if (node.nodeType !== 1) return "";
    if (node.localName === "s") return " ".repeat(Math.max(1, Number(node.getAttribute("text:c")) || 1));
    if (node.localName === "tab") return "\t";
    if (node.localName === "line-break") return "\n";
    let text = "";
    for (const child of Array.from(node.childNodes)) text += this._odfInlineText(child);
    return text;
  }

  /** Bản regex của _cellTextParagraphs: bỏ mọi phần tử <draw:*> (ảnh, text box, hình — kể cả lồng nhau) khỏi nội dung ô. */
  _stripCellFrames(cellContent) {
    const xml = String(cellContent || "");
    if (!/<draw:/i.test(xml)) return xml;
    let out = "";
    const tagRe = /<(\/?)draw:([\w-]+)\b[^>]*?(\/?)>/gi;
    let depth = 0;
    let keepFrom = 0;
    let m;
    while ((m = tagRe.exec(xml)) !== null) {
      const closing = m[1] === "/";
      const selfClosing = m[3] === "/";
      if (!closing && depth === 0) {
        out += xml.slice(keepFrom, m.index);
        if (selfClosing) { keepFrom = m.index + m[0].length; continue; }
        depth = 1;
      } else if (!closing && !selfClosing) {
        depth++;
      } else if (closing) {
        depth = Math.max(0, depth - 1);
        if (depth === 0) keepFrom = m.index + m[0].length;
      }
    }
    return out + xml.slice(keepFrom);
  }

  /** Bản regex của _odfInlineText cho nội dung trong <text:p>. */
  _odfInlineTextFromXml(inner) {
    return this._unescapeXml(String(inner || "")
      .replace(/<text:s\b([^>]*)\/>/gi, (_, attrs) => " ".repeat(Math.max(1, Number(attrs.match(/text:c=["'](\d+)["']/i)?.[1]) || 1)))
      .replace(/<text:tab\b[^>]*\/>/gi, "\t")
      .replace(/<text:line-break\b[^>]*\/>/gi, "\n")
      .replace(/<[^>]+>/g, ""));
  }

  /**
   * Extract rich text runs from a DOM cell element's <text:p> paragraphs.
   * Returns { text, runs } where text is the flat joined text and runs is the richText array.
   * Only returns runs when there are ≥2 runs with different styles.
   */
  _extractRichTextFromDom(cellElement, textStyles, cellStyle) {
    const paragraphs = this._cellTextParagraphs(cellElement);
    const allRuns = [];
    let firstRun = true;

    for (const para of paragraphs) {
      if (!firstRun) {
        allRuns.push({ text: "\n", style: {} });
      }
      firstRun = false;

      // Đo lan02 G3: soffice ghi `<text:p>SỐ TIỀN<text:span>(With Amount)</text:span></text:p>` —
      // chữ trần đứng trước/giữa các span là run không style; duyệt theo thứ tự con
      // của <text:p>, không chỉ lấy các <text:span> (mất "SỐ TIỀN", 52 ô / 5 file).
      for (const node of Array.from(para.childNodes)) {
        if (node.nodeType === 3) {
          if (node.nodeValue) allRuns.push({ text: node.nodeValue, style: {} });
        } else if (node.nodeType === 1 && node.localName === "span") {
          const styleName = node.getAttribute("text:style-name") || "";
          const spanStyle = textStyles.get(styleName) || {};
          allRuns.push({ text: this._odfInlineText(node), style: { ...spanStyle } });
        } else if (node.nodeType === 1) {
          const text = this._odfInlineText(node);
          if (text) allRuns.push({ text, style: {} });
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
    this._stripCellFrames(cellContent).replace(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi, (_, inner) => {
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
          const gap = this._odfInlineTextFromXml(paraInner.substring(lastIdx, spanMatch.index));
          if (gap) allRuns.push({ text: gap, style: {} });
        }
        const attrs = spanMatch[1];
        const styleName = (attrs.match(/text:style-name=["']([^"']*)["']/i)?.[1] || "");
        const spanStyle = textStyles.get(styleName) || {};
        const text = this._odfInlineTextFromXml(spanMatch[2]);
        allRuns.push({ text, style: { ...spanStyle } });
        lastIdx = spanMatch.index + spanMatch[0].length;
      }

      if (!hasSpans) {
        const text = this._odfInlineTextFromXml(paraInner);
        allRuns.push({ text, style: {} });
      } else if (lastIdx < paraInner.length) {
        const tail = this._odfInlineTextFromXml(paraInner.substring(lastIdx));
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

  _normalizeRichTextCellFont(runs, cellStyle) {
    const fontKeys = ["color", "fontWeight", "fontStyle", "textDecoration", "fontFamily", "fontSize"];
    const effectiveRuns = runs.map(run => {
      const style = { ...(run.style || {}) };
      for (const key of fontKeys) {
        if ((style[key] === undefined || style[key] === null || style[key] === "") && cellStyle?.[key]) {
          style[key] = cellStyle[key];
        }
      }
      return { ...run, style };
    });

    for (const key of fontKeys) {
      const values = effectiveRuns.map(run => run.style?.[key] ?? "");
      if (values.length > 0 && values.every(value => value === values[0]) && values[0] !== "") {
        cellStyle[key] = values[0];
      } else if (key === "fontWeight" || key === "fontStyle") {
        // An omitted cell-level weight/style lets Calc promote the first rich
        // text run to the XLSX cell font. Use a neutral baseline while each
        // run keeps its complete effective formatting.
        cellStyle[key] = "normal";
      } else {
        delete cellStyle[key];
      }
    }
    return effectiveRuns;
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
   * để lần đọc lại (kể cả từ file 3T Office tự lưu) dùng chung một đường phân tích
   * _parseCellEmbeddedImage()/_parseCellEmbeddedImageDom() với file thật bên ngoài.
   */
  /**
   * S16: overlay Python gắn vno:image-id="<sheet>:<n>" (thứ tự anchor trong drawing gốc) cho từng ảnh khi mở;
   * giữ nguyên qua model (sourceId) và ghi lại khi lưu để hậu xử lý biết sheet nào chưa đụng tới ảnh.
   */
  _imageSourceIdFromAttrs(frameAttrs) {
    const id = this._unescapeXml(String(frameAttrs || "").match(/vno:image-id=["']([^"']*)["']/i)?.[1] || "");
    return id ? { sourceId: id } : {};
  }

  _imageSourceIdFromNode(frame) {
    const id = frame?.getAttribute?.("vno:image-id") || "";
    return id ? { sourceId: id } : {};
  }

  _imageSourceIdAttr(image) {
    return image?.sourceId ? ` vno:image-id="${this._escapeXml(image.sourceId)}"` : "";
  }

  _serializeCellImageXml(image) {
    const match = String(image?.src || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) return "";
    const mime = match[1].toLowerCase();
    const base64 = match[2].replace(/\s+/g, "");
    if (!base64) return "";
    const widthCm = Number.isFinite(Number(image.widthCm)) && Number(image.widthCm) >= 0 ? Number(Number(image.widthCm).toFixed(4)) : 6.35;
    const heightCm = Number.isFinite(Number(image.heightCm)) && Number(image.heightCm) >= 0 ? Number(Number(image.heightCm).toFixed(4)) : 2.117;
    const xCm = Number.isFinite(Number(image.offsetXCm)) ? Number(Number(image.offsetXCm).toFixed(4)) : 0;
    const yCm = Number.isFinite(Number(image.offsetYCm)) ? Number(Number(image.offsetYCm).toFixed(4)) : 0;
    const name = this._escapeXml(image.id || "Image");
    return `<draw:frame draw:name="${name}"${this._imageSourceIdAttr(image)} svg:x="${xCm}cm" svg:y="${yCm}cm" svg:width="${widthCm}cm" svg:height="${heightCm}cm"><draw:image draw:mime-type="${this._escapeXml(mime)}"><office:binary-data>${base64}</office:binary-data></draw:image></draw:frame>`;
  }

  /**
   * Serialize page-anchored images (from table:shapes) back to <table:shapes>.
   * These images have absolute positioning with table:end-cell-address and svg:x/y.
   */
  _serializePageAnchoredImagesXml(images) {
    if (!images || images.length === 0) return "";
    const frames = images.map(image => {
      const match = String(image?.src || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (!match) return "";
      const mime = match[1].toLowerCase();
      const base64 = match[2].replace(/\s+/g, "");
      if (!base64) return "";
      const widthCm = Number.isFinite(Number(image.widthCm)) && Number(image.widthCm) >= 0 ? Number(Number(image.widthCm).toFixed(4)) : 6.35;
      const heightCm = Number.isFinite(Number(image.heightCm)) && Number(image.heightCm) >= 0 ? Number(Number(image.heightCm).toFixed(4)) : 2.117;
      const xCm = Number.isFinite(Number(image.offsetXCm)) ? Number(Number(image.offsetXCm).toFixed(4)) : 0;
      const yCm = Number.isFinite(Number(image.offsetYCm)) ? Number(Number(image.offsetYCm).toFixed(4)) : 0;
      const name = this._escapeXml(image.id || "ShapeImage");
      const endCellAttr = image.endCellAddress ? ` table:end-cell-address="${this._escapeXml(image.endCellAddress)}"` : "";
      return `<draw:frame draw:name="${name}"${this._imageSourceIdAttr(image)} svg:x="${xCm}cm" svg:y="${yCm}cm" svg:width="${widthCm}cm" svg:height="${heightCm}cm"${endCellAttr}><draw:image draw:mime-type="${this._escapeXml(mime)}"><office:binary-data>${base64}</office:binary-data></draw:image></draw:frame>`;
    }).filter(Boolean);
    return frames.length ? `<table:shapes>${frames.join("")}</table:shapes>` : "";
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
   * vno:frozen-rows/cols (đọc lại từ chính FODS 3T Office tự ghi - xem
   * serializeToFods()). soffice thật KHÔNG khôi phục Freeze Panes vào
   * office:settings khi chuyển đổi headless XLSX->FODS (xác nhận qua vòng
   * chuyển đổi soffice thật, xem docs/HANDOFF-SHEET-FREEZE-PANES.md) - khi mở
   * FILE XLSX THẬT từ Excel/nguồn khác, dùng sheet-xlsx-open-overlay đọc trực
   * tiếp <pane> từ XLSX gốc thay vì hàm này (hàm này chỉ phục vụ tự round-trip
   * FODS nội bộ của 3T Office).
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

  _attachImportedTextBoxes(workbook, xmlText) {
    const importedTextBoxes = {};
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>/gi, (_, attrs) => {
      const sheetName = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      const raw = attrs.match(/vno:text-boxes=["']([^"']*)["']/i)?.[1];
      if (!sheetName || !raw) return "";
      try {
        const boxes = JSON.parse(this._unescapeXml(raw));
        if (!Array.isArray(boxes)) return "";
        importedTextBoxes[sheetName] = boxes.filter(box => box && typeof box.text === "string" && box.anchor?.c && Number.isFinite(Number(box.anchor?.r)))
          .map((box, index) => ({
            id: `textbox-import-${sheetName}-${index}`,
            text: box.text,
            anchor: { c: String(box.anchor.c), r: Number(box.anchor.r) },
            widthPx: Math.max(180, Number(box.widthPx) || 180),
            heightPx: Math.max(54, Number(box.heightPx) || 54)
          }));
      } catch (_) {}
      return "";
    });
    // Chỉ gắn khi tệp có hộp văn bản: giữ nguyên dấu băm snapshot của các sổ tính không có hộp văn bản.
    if (Object.keys(importedTextBoxes).length) workbook.textBoxesBySheet = importedTextBoxes;
  }

  _attachImportedResolvedComments(workbook, xmlText) {
    String(xmlText || "").replace(/<table:table(?=[\s>/])([^>]*)>/gi, (_, attrs) => {
      const sheetName = this._unescapeXml(attrs.match(/table:name=["']([^"']*)["']/i)?.[1] || "");
      const raw = attrs.match(/vno:resolved-comments=["']([^"']*)["']/i)?.[1];
      if (!sheetName || !raw) return "";
      try {
        const states = JSON.parse(this._unescapeXml(raw));
        for (const [coord, resolved] of Object.entries(states || {})) {
          const comment = workbook.commentsBySheet?.[sheetName]?.[coord];
          if (comment) comment.resolved = Boolean(resolved);
        }
      } catch (_) {}
      return "";
    });
  }

  /**
   * vno:sheet-state (hidden/veryHidden) — read back from FODS that 3T Office
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
   * <table:database-ranges> — read back from FODS that 3T Office self-wrote
   * during File → Mở overlay.  These represent AutoFilter ranges that
   * LibreOffice preserves in FODS but may drop during FODS→XLSX export.
   * Only activate filter when display-filter-buttons="true" (S25d).
   */
  _attachImportedAutoFilter(workbook, xmlText) {
    workbook.autoFilterBySheet = {};
    String(xmlText || "").replace(/<table:database-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const displayFilterButtons = attrs.match(/table:display-filter-buttons=["']([^"']*)["']/i)?.[1];
      if (displayFilterButtons !== "true") return "";
      const target = this._unescapeXml(attrs.match(/table:target-range-address="([^"]*)"/i)?.[1] || "");
      if (!target) return "";
      // Calc ghi 'Tên sheet'.A1:'Tên sheet'.J2650 (nháy đơn khi tên có dấu cách/ký tự đặc biệt) hoặc
      // Sheet.A3:Sheet.CF145 — tách theo dấu "." đầu tiên làm sai cả hai (đo vòng 8: lan01 sheet 3 và
      // lan11 sheet 3 mất AutoFilter vì tên sheet lẫn vào vùng).
      const m = target.match(/^(?:'((?:[^']|'')*)'|([^.'!]+))\.(\$?[A-Z]+\$?\d+)(?::(?:(?:'(?:[^']|'')*'|[^.'!]+)\.)?(\$?[A-Z]+\$?\d+))?$/i);
      if (!m) return "";
      const sheetName = m[1] !== undefined ? m[1].replace(/''/g, "'") : m[2];
      const ref = (m[3] + (m[4] ? `:${m[4]}` : "")).replace(/\$/g, "");
      if (sheetName && ref) workbook.autoFilterBySheet[sheetName] = ref;
      return "";
    });
  }

  _attachImportedTables(workbook, xmlText) {
    const importedTablesBySheet = {};
    String(xmlText || "").replace(/<table:database-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const get = name => this._unescapeXml(attrs.match(new RegExp(`(?:vno:)?${name}=["']([^"']*)["']`, "i"))?.[1] || "");
      const name = get("table-name");
      const target = this._unescapeXml(attrs.match(/table:target-range-address="([^"]*)"/i)?.[1] || "");
      const match = target.match(/^(?:'((?:[^']|'')*)'|([^.'!]+))\.\$?([A-Z]+)\$?(\d+):(?:'(?:[^']|'')*'|[^.'!]+)\.\$?([A-Z]+)\$?(\d+)$/i);
      if (!name || !match) return "";
      const sheet = match[1] !== undefined ? match[1].replace(/''/g, "'") : match[2];
      const table = {
        name,
        ref: `${match[3]}${match[4]}:${match[5]}${match[6]}`,
        hasHeaders: get("table-headers") !== "false",
        style: ({ TableStyleMedium2: "tableBlue", TableStyleMedium4: "tableGreen", TableStyleDark1: "tableDark" })[get("table-style")] || "tableBlue",
        excelStyle: get("table-style") || "TableStyleMedium2",
        showAutoFilter: get("table-show-autofilter") !== "false",
        showRowStripes: get("table-row-stripes") !== "false"
      };
      (importedTablesBySheet[sheet] ||= []).push(table);
      return "";
    });
    if (Object.keys(importedTablesBySheet).length) workbook.tablesBySheet = importedTablesBySheet;
    for (const [sheetName, tables] of Object.entries(importedTablesBySheet)) {
      const cells = workbook.sheetsData?.[sheetName];
      if (!cells) continue;
      for (const table of tables) {
        const bounds = /^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i.exec(table.ref);
        if (!bounds) continue;
        const preset = TABLE_STYLE_PRESETS.find(item => item.id === table.style) || TABLE_STYLE_PRESETS[0];
        const startCol = this._columnNumber(bounds[1]), endCol = this._columnNumber(bounds[3]);
        const startRow = Number(bounds[2]), endRow = Number(bounds[4]);
        for (let row = startRow; row <= endRow; row++) {
          for (let column = startCol; column <= endCol; column++) {
            const coord = `${this._columnName(column)}${row}`;
            const cell = cells.get(coord) || { val: "", formula: "", style: {} };
            const rowStyle = table.hasHeaders !== false && row === startRow
              ? preset.headerStyle
              : ((row - startRow) % 2 === 1 ? preset.evenRowStyle : preset.oddRowStyle);
            cell.style = { ...(cell.style || {}), ...rowStyle };
            cells.set(coord, cell);
          }
        }
      }
    }
  }

  /**
   * Serialize <table:database-ranges> for sheets with active AutoFilter.
   * Each range uses the stored filterRef from sheetStates or the sheet's
   * used range as fallback.  This ensures the filter survives FODS→XLSX
   * round-trip via the Python postprocess layer.
   */
  _usedRangeOfSheet(sheetName) {
    const cells = this.grid?.sheetsData?.[sheetName] || (sheetName === this.grid?.activeSheet ? this.grid?.cellsData : null);
    if (!cells || typeof cells.keys !== "function") return "";
    let maxCol = 0, maxRow = 0;
    for (const coord of cells.keys()) {
      const m = /^([A-Z]+)(\d+)$/.exec(coord);
      if (!m) continue;
      maxCol = Math.max(maxCol, this._columnNumber(m[1]));
      maxRow = Math.max(maxRow, Number(m[2]));
    }
    return maxCol && maxRow ? `A1:${this._columnName(maxCol)}${maxRow}` : "";
  }

  _serializeDatabaseRanges(sheetNames) {
    const ranges = [];
    // "__Anonymous_Sheet_DB__<sheet index>" is LibreOffice's own name for a
    // sheet AutoFilter; it exports as <autoFilter>. Any other name becomes an
    // Excel Table part, which Excel rejects for header-only ranges or empty
    // column captions (measured: lan11 "Reyee" A3:F3 could not be opened).
    sheetNames.forEach((sheetName, sheetIndex) => {
      const ss = this.grid.sheetStates?.[sheetName];
      const tables = (this.grid.tablesBySheet?.[sheetName] || []).filter(table => table?.name && table?.ref);
      for (const table of tables) {
        const match = /^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i.exec(table.ref);
        if (!match) continue;
        const quotedSheet = /^[A-Za-z0-9_]+$/.test(sheetName) ? sheetName : `'${sheetName.replace(/'/g, "''")}'`;
        const address = `${quotedSheet}.${match[1]}${match[2]}:${quotedSheet}.${match[3]}${match[4]}`;
        const style = table.excelStyle || ({ tableBlue: "TableStyleMedium2", tableGreen: "TableStyleMedium4", tableDark: "TableStyleDark1" })[table.style] || "TableStyleMedium2";
        ranges.push(
          `<table:database-range table:name="${this._escapeXml(table.name)}"`
          + ` table:target-range-address="${this._escapeXml(address)}" table:display-filter-buttons="${table.showAutoFilter === false ? "false" : "true"}"`
          + ` table:contains-header="${table.hasHeaders === false ? "false" : "true"}"`
          + ` vno:table-name="${this._escapeXml(table.name)}" vno:table-style="${style}"`
          + ` vno:table-headers="${table.hasHeaders === false ? "false" : "true"}"`
          + ` vno:table-show-autofilter="${table.showAutoFilter === false ? "false" : "true"}"`
          + ` vno:table-row-stripes="${table.showRowStripes === false ? "false" : "true"}"/>`
        );
      }
      // The active sheet's live grid fields may be newer than sheetStates
      // (toggle/apply filter updates history first and persists sheet state on
      // sheet switch). Serialize the live state for that sheet.
      const isActiveSheet = sheetName === this.grid.activeSheet;
      const isActive = isActiveSheet ? this.grid.isFilterActive : ss?.isFilterActive;
      const liveRange = isActiveSheet ? ss?.filterRange : ss?.filterRange;
      if (!isActive || (!liveRange && !ss?.filterSetByUser)) return;
      // Bộ lọc người dùng bật trong app không có filterRange -> dùng vùng đã dùng của sheet
      const ref = liveRange || this._usedRangeOfSheet(sheetName) || "";
      if (!ref) return;
      if (tables.some(table => table.ref === ref)) return;
      // Tên sheet có khoảng trắng/ký tự đặc biệt phải đặt trong nháy đơn ở CẢ HAI đầu vùng
      // ('Nguồn 2020 (GVCN)'.A1:'Nguồn 2020 (GVCN)'.J2650) như Calc ghi; không nháy LibreOffice
      // bỏ AutoFilter khi lưu XLSX (lan01.xlsx sheet 3: autoFilter A1:J2650 mất, sheet 1 tên không dấu cách giữ).
      const quotedSheet = /^[A-Za-z0-9_]+$/.test(sheetName) ? sheetName : `'${sheetName.replace(/'/g, "''")}'`;
      const [start, end] = ref.split(":");
      const address = end ? `${quotedSheet}.${start}:${quotedSheet}.${end}` : `${quotedSheet}.${start}`;
      const filters = isActiveSheet ? this.grid.activeFilters : ss?.activeFilters;
      const startCol = this._columnNumber(start.match(/^\$?([A-Z]+)/)?.[1] || "A");
      const filterColumns = Array.from(filters || [], ([column, values]) => ({
        colId: this._columnNumber(column) - startCol,
        values: Array.from(values || [], value => String(value))
      })).filter(item => item.colId >= 0 && item.values.length > 0);
      const filterAttr = filterColumns.length
        ? ` vno:filter-columns="${this._escapeXml(JSON.stringify(filterColumns))}"`
        : "";
      ranges.push(
        `<table:database-range table:name="__Anonymous_Sheet_DB__${sheetIndex}"`
        + ` table:target-range-address="${this._escapeXml(address)}"`
        + ` table:display-filter-buttons="true"${filterAttr}/>`
      );
    });
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
    const isNewWorkbook = !this.sourceFilePath;
    const hasNativeXlsxStateChanges = (this.grid.xlsxViewStateTouched?.size || 0) > 0
      || (this.grid.printAreaTouchedBySheet?.size || 0) > 0
      || (this.grid.pivotRefreshTouchedBySheet?.size || 0) > 0;
    const sourceIsPristineXlsx = !this.isDirty && !hasNativeXlsxStateChanges && /\.xlsx$/i.test(String(this.sourceFilePath || ""));
    const pristineXlsxMarker = sourceIsPristineXlsx ? "<!-- vno-pristine-xlsx-source -->\n" : "";
    const sheetNames = (this.grid.sheets && this.grid.sheets.length)
      ? [...this.grid.sheets]
      : Object.keys(this.grid.sheetsData || {});
    if (sheetNames.length === 0) sheetNames.push(this.grid.activeSheet || "Trang tính 1");

    const numberFormats = this._collectNumberFormats(sheetNames);
    const rotationStyles = this._collectRotationStyles(sheetNames);

    // ── Collect font families for office:font-face-decls ──
    const fontFaces = new Map();
    const addFontFace = (rawFontName) => {
      const fontName = this._normalizeFontFamily(rawFontName);
      if (!fontName || fontFaces.has(fontName)) return;
      fontFaces.set(fontName, true);
    };
    if (isNewWorkbook) addFontFace("Calibri");
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
    const visualStyleXmlByName = new Map();
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
    const defaultRowHeight = this.grid.rowHeight || 20;
    const defaultColWidth = this.grid.defaultColWidth || 64;
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
      let style = m[2];
      if (style === "double") style = "double-thin";
      return `${side}="${ptVal}pt ${style} ${m[3]}"`;
    };
    const visualStyleFor = (item) => {
      const s = item?.style || {};
      const keys = ["backgroundColor", "color", "fontWeight", "fontStyle", "textDecoration", "fontFamily", "fontSize", "textAlign", "verticalAlign", "whiteSpace", "indentLevel", "borderLeft", "borderRight", "borderTop", "borderBottom", "border"];
      const hasVisual = keys.some(k => s[k] !== undefined && s[k] !== "" && s[k] !== null);
      if (!hasVisual) return null;
      const hash = JSON.stringify(keys.map(k => s[k] || ""));
      if (visualStyleNames.has(hash)) return visualStyleNames.get(hash);
      const name = `vno_vs_${visualStyleNames.size + 1}`;
      visualStyleNames.set(hash, name);
      const cellProps = [];
      if (s.backgroundColor) cellProps.push(`fo:background-color="${this._escapeXml(s.backgroundColor)}"`);
      if (s.verticalAlign) cellProps.push(`style:vertical-align="${this._escapeXml(s.verticalAlign)}"`);
      // Nút ribbon "Gói văn bản" ghi whiteSpace="normal" (CSS: có xuống dòng) và nút "Viền" ghi khóa chung `border`
      // (viền 4 cạnh): trước đây cả hai bị bỏ qua khi xuất FODS nên mất khi lưu XLSX (đối chiếu Excel thật 11/10).
      if (s.whiteSpace === "pre-wrap" || s.whiteSpace === "normal" || s.whiteSpace === "pre-line" || s.whiteSpace === "break-spaces") cellProps.push(`fo:wrap-option="wrap"`);
      else if (s.whiteSpace === "nowrap") cellProps.push(`fo:wrap-option="no-wrap"`);
      const sideBorder = (side) => s[side] || s.border;
      if (sideBorder("borderLeft")) cellProps.push(cssToOdfBorder("fo:border-left", sideBorder("borderLeft")));
      if (sideBorder("borderRight")) cellProps.push(cssToOdfBorder("fo:border-right", sideBorder("borderRight")));
      if (sideBorder("borderTop")) cellProps.push(cssToOdfBorder("fo:border-top", sideBorder("borderTop")));
      if (sideBorder("borderBottom")) cellProps.push(cssToOdfBorder("fo:border-bottom", sideBorder("borderBottom")));
      if (s.textAlign) cellProps.push(`style:text-align-source="fix"`);
      const paraProps = [];
      // LibreOffice đọc fo:text-align="right"/"left" thành "chung" (mất căn lề khi lưu XLSX); chỉ "end"/"start" được nhận (đo 11/10).
      const odfAlign = { right: "end", left: "start" }[s.textAlign] || s.textAlign;
      if (s.textAlign) paraProps.push(`fo:text-align="${this._escapeXml(odfAlign)}"`);
      if (s.indentLevel !== undefined && s.indentLevel !== null && Number.isFinite(Number(s.indentLevel))) {
        paraProps.push(`fo:margin-left="${(Math.max(0, Number(s.indentLevel)) * 0.235).toFixed(3)}cm"`);
      }
      const textProps = [];
      if (s.fontSize) {
        const ptVal = s.fontSize.endsWith("px") ? Number((parseFloat(s.fontSize) * (72 / 96)).toFixed(2)) : s.fontSize;
        textProps.push(`fo:font-size="${ptVal}pt"`);
      }
      if (s.fontWeight) textProps.push(`fo:font-weight="${this._escapeXml(s.fontWeight)}"`);
      if (s.fontStyle) textProps.push(`fo:font-style="${this._escapeXml(s.fontStyle)}"`);
      if (s.textDecoration) textProps.push(...this._odfTextDecorationAttrs(s.textDecoration));
      if (s.color) textProps.push(`fo:color="${this._escapeXml(s.color)}"`);
      if (s.fontFamily) textProps.push(`style:font-name="${this._escapeXml(this._normalizeFontFamily(s.fontFamily))}"`);
      const parts = [];
      if (cellProps.length) parts.push(`<style:table-cell-properties ${cellProps.join(" ")}/>`);
      if (paraProps.length) parts.push(`<style:paragraph-properties ${paraProps.join(" ")}/>`);
      if (textProps.length) parts.push(`<style:text-properties ${textProps.join(" ")}/>`);
      const xml = `<style:style style:name="${name}" style:family="table-cell">${parts.join("")}</style:style>`;
      visualStyleEntries.push(xml);
      visualStyleXmlByName.set(name, xml);
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
      if (runStyle.textDecoration) textProps.push(...this._odfTextDecorationAttrs(runStyle.textDecoration));
      if (runStyle.fontFamily) textProps.push(`style:font-name="${this._escapeXml(this._normalizeFontFamily(runStyle.fontFamily))}"`);
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
      const tabColor = (this.grid.sheetStates?.[sheetName]?.tabColor) || (this.grid.tabColors?.[sheetName]) || "";
      const tabColorProp = tabColor ? ` table:tab-color="${this._escapeXml(tabColor)}" tableooo:tab-color="${this._escapeXml(tabColor)}"` : "";
      tablePageStyles.push(`<style:style style:name="vno-table-page-${suffix}" style:family="table" style:master-page-name="vno-master-page-${suffix}"><style:table-properties table:display="true" style:writing-mode="lr-tb" style:print="${printTokens}"${tabColorProp}/></style:style>`);
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
        if (!rule?.range || !["greaterThan", "lessThan", "blank", "duplicate"].includes(rule.type)) continue;
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
              : rule.type === "duplicate"
                ? `is-duplicate-content()`
                : `is-true-formula(LEN(TRIM([.${grouped[0].range.start.c}${grouped[0].range.start.r}]))=0)`;
          return `<style:map style:condition="${condition}" style:apply-style-name="${styleForColor(rule.color)}" style:base-cell-address="${this._escapeXml(base)}"/>`;
        }).join("");
        conditionalBaseStyles.push(`<style:style style:name="${baseName}" style:family="table-cell">${maps}</style:style>`);
        const range = grouped[0].range;
        const maxCfRow = Math.min(range.end.r, 10000);
        for (let row = range.start.r; row <= maxCfRow; row++) {
          for (let column = this._columnNumber(range.start.c); column <= this._columnNumber(range.end.c); column++) {
            sheetConditionalCells.set(`${this._columnName(column)}${row}`, { baseName, maps });
          }
        }
      }
      conditionalBaseByCell.set(sheetName, sheetConditionalCells);
      conditionalFormatsBySheet[sheetName] = rules.map(rule => {
        if (!rule?.range || !["greaterThan", "lessThan", "blank", "duplicate"].includes(rule.type)) return "";
        const styleName = styleForColor(rule.color);
        const value = rule.type === "greaterThan"
          ? `&gt;${Number(rule.value)}`
          : rule.type === "lessThan"
            ? `&lt;${Number(rule.value)}`
            : rule.type === "duplicate"
              ? `duplicate`
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
      const resolvedComments = Object.fromEntries(Object.entries(comments).filter(([, comment]) => comment).map(([coord, comment]) => [coord, Boolean(comment.resolved)]));
      const resolvedCommentsAttr = Object.keys(resolvedComments).length ? ` vno:resolved-comments="${this._escapeXml(JSON.stringify(resolvedComments))}"` : "";
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
        if (rowNumber > maxRow) continue;
        const columnNumber = this._columnNumber(match[1]);
        if (!rows.has(rowNumber)) rows.set(rowNumber, new Map());
        if (!rows.get(rowNumber).has(columnNumber)) rows.get(rowNumber).set(columnNumber, { val: "", formula: "", style: {} });
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
      const pageAnchoredImages = [];
      for (const image of this.grid.imagesBySheet?.[sheetName] || []) {
        if (image.anchorType === "page") {
          pageAnchoredImages.push(image);
          continue;
        }
        const column = this._columnNumber(image.anchor?.c);
        const row = Number(image.anchor?.r);
        if (!Number.isInteger(column) || column < 1 || !Number.isInteger(row) || row < 1) continue;
        const coordinate = `${this._columnName(column)}${row}`;
        if (!imagesByAnchor.has(coordinate)) {
          imagesByAnchor.set(coordinate, []);
        }
        imagesByAnchor.get(coordinate).push(image);
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
        else if (isNewWorkbook) attrs.push('table:style-name="vno-default-column"');
        if (hidden) attrs.push(`table:visibility="collapse"`);
        columnParts.push({ key: columnNumber, xml: `<table:table-column${attrs.length ? ` ${attrs.join(" ")}` : ""}/>` });
      }
      const columnsXml = this._wrapOutlineGroups(sheetName, columnParts, "col", "table:table-column-group");

      const rowParts = [];
      for (let rowNumber = 1; rowNumber <= Math.max(1, maxRow); rowNumber++) {
        const rowCells = rows.get(rowNumber) || new Map();
        const usedColumns = [...rowCells.keys()].sort((a, b) => a - b);
        let cellsXml = "";
        let pendingRepeatedBlank = null;
        const flushRepeatedBlank = () => {
          if (!pendingRepeatedBlank) return;
          const repeatAttr = pendingRepeatedBlank.count > 1
            ? ` table:number-columns-repeated="${pendingRepeatedBlank.count}"`
            : "";
          cellsXml += pendingRepeatedBlank.xml.replace(/\/>$/, `${repeatAttr}/>`);
          pendingRepeatedBlank = null;
        };
        const appendCellXml = (xml, repeatableBlank = false) => {
          if (repeatableBlank && pendingRepeatedBlank?.xml === xml) {
            pendingRepeatedBlank.count += 1;
            return;
          }
          flushRepeatedBlank();
          if (repeatableBlank && /^<table:table-cell(?:\s[^>]*)?\/>$/.test(xml)) {
            pendingRepeatedBlank = { xml, count: 1 };
          } else {
            cellsXml += xml;
          }
        };
        let previousColumn = 0;
        for (const columnNumber of usedColumns) {
          const gap = columnNumber - previousColumn - 1;
          if (gap === 1) appendCellXml("<table:table-cell/>");
          else if (gap > 1) appendCellXml(`<table:table-cell table:number-columns-repeated="${gap}"/>`);

          const coordinate = `${this._columnName(columnNumber)}${rowNumber}`;
          const storedItem = rowCells.get(columnNumber);
          // Some XLSX files legitimately store an error formula in a cell
          // which Calc exposes as covered. It is document data, so do not let
          // the visual merge marker erase it during serialization.
          if (coveredCells.has(coordinate) && !storedItem?.formula) {
            const cellImages = imagesByAnchor.get(coordinate) || [];
            const cellImageXml = cellImages.length > 0
              ? cellImages.map(img => this._serializeCellImageXml(img)).join("")
              : "";
            appendCellXml(cellImageXml ? `<table:covered-table-cell>${cellImageXml}</table:covered-table-cell>` : "<table:covered-table-cell/>");
            previousColumn = columnNumber;
            continue;
          }
          const item = storedItem || { val: "", formula: "", style: {} };
          const arrayFormula = this._arrayFormulaInfo(coordinate, item);
          const formula = (!arrayFormula || arrayFormula.isAnchor) && item.formula && String(item.formula).startsWith("=") ? String(item.formula) : "";
          const untouchedExternal = formula && item.externalLink?.formula === formula;
          const formulaAttrs = untouchedExternal
            ? ` table:formula="${this._escapeXml(item.externalLink.odf)}"`
            : formula
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
                // visualStyleFor() may return a deduplicated style created for
                // an earlier cell.  Combining it with a number/rotation style
                // must use that exact entry, not the most recently collected
                // visual style from an unrelated cell.
                let vsEntry = visualStyleXmlByName.get(vsName);
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
          // S8: Write vno:xf only if style hasn't changed since import.
          let xfAttr = "";
          if (item.style?.origXf != null && item.style.styleHashAtImport === this._computeStyleHash(item.style)) {
            xfAttr = ` vno:xf="${item.style.origXf}"`;
          }
          const cellAttrs = `${formulaAttrs}${matrixAttrs}${mergeAttrs}${numFmtAttr}${cellStyleName ? ` table:style-name="${cellStyleName}"` : ""}${validationAttr}${xfAttr}`;
          const comment = comments[coordinate];
          const annotationXml = comment ? `<office:annotation><dc:creator>${this._escapeXml(comment.author || "")}</dc:creator>${comment.timestamp ? `<dc:date>${this._escapeXml(comment.timestamp)}</dc:date>` : ""}<text:p>${this._escapeXml(comment.text || "")}</text:p></office:annotation>` : "";
          const hyperlink = /^(https?:|mailto:)/i.test(String(item.hyperlink || "")) ? String(item.hyperlink) : "";
          const linkText = content => hyperlink
            ? `<text:a xlink:href="${this._escapeXml(hyperlink)}" xlink:type="simple">${content}</text:a>`
            : content;
          const cellImages = imagesByAnchor.get(coordinate) || [];
          const cellImageXml = cellImages.length > 0
? cellImages.map(img => this._serializeCellImageXml(img)).join("")
          : "";
          const numberCategory = item.style?.numberFormat?.category;
          const isDateType = numberCategory === "date" || numberCategory === "time";
          const dateFormat = item.style?.numberFormat?.dateFormat || item.style?.numberFormat?.timeFormat || "";
          // Detect if format has time component (h, hh) but not just as part of month (m, mm)
          // Time formats: h, hh, h:mm, hh:mm, h:mm:ss, hh:mm:ss
          // Date formats with time: dd/mm/yyyy hh:mm, etc.
          // Use a more precise regex: h followed by : or end, or hh followed by : or end
          const hasTimeComponent = isDateType && /(^|[^m])h{1,2}(?::|$)/i.test(dateFormat);
          // Time-only: format consists ONLY of time parts (h, hh, h:mm, hh:mm, h:mm:ss, hh:mm:ss)
          // No date parts (d, dd, m, mm, mmm, y, yy, yyyy) outside of time context
          const isTimeOnly = isDateType && /^h{1,2}(?::m{1,2}(?::s{1,2})?)?$/i.test(dateFormat);
          if (!storedItem && !comment && !validationName && !conditionalBase && !cellImageXml) {
            appendCellXml(`<table:table-cell${cellAttrs}/>`, true);
          } else if (!storedItem && !comment && !validationName && !conditionalBase) {
            appendCellXml(`<table:table-cell${cellAttrs}>${cellImageXml}</table:table-cell>`);
          } else if (typeof item.val === "number" && Number.isFinite(item.val)) {
            if (isDateType && !isTimeOnly) {
              const isoDate = this._excelSerialToIsoDate(item.val);
              if (isoDate) {
                // ODF: ngày-giờ nằm trong CÙNG office:date-value dạng "2021-10-01T08:30:00"
                // (office:time-value chỉ dành cho value-type="time"; LibreOffice bỏ qua nó trên ô date).
                let dateValue = isoDate;
                if (hasTimeComponent) {
                  const timeFraction = item.val - Math.floor(item.val);
                  const isoTime = this._excelSerialToIsoTime(timeFraction);
                  const m = isoTime ? isoTime.match(/^PT(\d+)H(\d+)M(\d+)S$/) : null;
                  if (m) dateValue = `${isoDate}T${m[1]}:${m[2]}:${m[3]}`;
                }
                appendCellXml(`<table:table-cell office:value-type="date" office:date-value="${dateValue}"${cellAttrs}>${cellImageXml}${annotationXml}<text:p>${linkText(this._escapeXml(item.val))}</text:p></table:table-cell>`);
              } else {
                appendCellXml(`<table:table-cell office:value-type="float" office:value="${item.val}"${cellAttrs}>${cellImageXml}${annotationXml}<text:p>${linkText(this._escapeXml(item.val))}</text:p></table:table-cell>`);
              }
            } else if (isTimeOnly) {
              const isoTime = this._excelSerialToIsoTime(item.val);
              if (isoTime) {
                appendCellXml(`<table:table-cell office:value-type="time" office:time-value="${isoTime}"${cellAttrs}>${cellImageXml}${annotationXml}<text:p>${linkText(this._escapeXml(item.val))}</text:p></table:table-cell>`);
              } else {
                appendCellXml(`<table:table-cell office:value-type="float" office:value="${item.val}"${cellAttrs}>${cellImageXml}${annotationXml}<text:p>${linkText(this._escapeXml(item.val))}</text:p></table:table-cell>`);
              }
            } else {
              appendCellXml(`<table:table-cell office:value-type="float" office:value="${item.val}"${cellAttrs}>${cellImageXml}${annotationXml}<text:p>${linkText(this._escapeXml(item.val))}</text:p></table:table-cell>`);
            }
          } else {
            const text = item.val === undefined || item.val === null ? "" : String(item.val);
            const richTextValue = Array.isArray(item.richText) ? item.richText.map(run => String(run.text || "")).join("") : "";
            // vno:original-string is authoritative. Calc can omit an empty
            // first <text:p>, so its rich runs no longer represent a leading
            // newline even though the original plain value still does.
            if (Array.isArray(item.richText) && item.richText.length > 0 && richTextValue === text.replace(/\r\n|\r/g, "\n")) {
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
                  return `<text:p>${linkText(this._escapeXml(runs[0].text))}</text:p>`;
                }
                const spanXml = runs.map(run => {
                  const styleName = richTextStyleFor(run.style);
                  const styleAttr = styleName ? ` text:style-name="${styleName}"` : "";
                  return `<text:span${styleAttr}>${this._escapeXml(run.text)}</text:span>`;
                }).join("");
                return `<text:p>${linkText(spanXml)}</text:p>`;
              }).join("");
              appendCellXml(`<table:table-cell office:value-type="string"${cellAttrs}>${cellImageXml}${annotationXml}${paraXml}</table:table-cell>`);
            } else if (text === "" && !item.formula) {
              // Ô chỉ có style (viền/nền, không giá trị): KHÔNG ghi office:value-type="string" +
              // <text:p/> — LibreOffice biến thành ô chuỗi rỗng trong XLSX (lan09: 21.930 ô, COUNTA/
              // ISBLANK/Ctrl+End sai, auditor 115k lệch). Ghi ô trống mang style như ODF của Calc.
              if (!comment && !cellImageXml && !validationName && !conditionalBase) {
                appendCellXml(`<table:table-cell${cellAttrs}/>`, true);
              } else {
                appendCellXml(`<table:table-cell${cellAttrs}>${cellImageXml}${annotationXml}</table:table-cell>`);
              }
            } else {
              // Excel lưu xuống dòng trong ô là "\n" (đôi khi "\r\n" qua vno:original-string);
              // một "\r" lẻ trong <text:p> sẽ bị XML chuẩn hoá thành "\n" -> thừa dòng trống.
              const lines = text.split(/\r\n|\r|\n/);
              const linesXml = lines.map(line => `<text:p>${linkText(this._escapeXml(line))}</text:p>`).join("");
              appendCellXml(`<table:table-cell office:value-type="string"${cellAttrs}>${cellImageXml}${annotationXml}${linesXml}</table:table-cell>`);
            }
          }
          previousColumn = columnNumber;
        }
        flushRepeatedBlank();
        const rowHidden = layout.hiddenRows.has(rowNumber);
        const rowHeight = layout.rowHeights.get(rowNumber);
        const rowPageBreak = pageBreakRows.has(rowNumber);
        const rowAttrs = [];
        if (Number.isFinite(rowHeight) || rowHidden || rowPageBreak) rowAttrs.push(`table:style-name="${rowStyleFor(Number.isFinite(rowHeight) ? rowHeight : defaultRowHeight, rowPageBreak)}"`);
        else if (isNewWorkbook) rowAttrs.push('table:style-name="vno-default-row"');
        if (rowHidden) rowAttrs.push(`table:visibility="collapse"`);
        const rowOpen = `<table:table-row${rowAttrs.length ? ` ${rowAttrs.join(" ")}` : ""}`;
        // Consecutive empty rows are run-length encoded when their layout matches.
        // This also covers blank rows between populated rows without shifting data.
        const repeatableEmptyRow = !cellsXml && !rowPageBreak;
        const previous = rowParts[rowParts.length - 1];
        if (repeatableEmptyRow && previous?.repeatOpen === rowOpen) {
          previous.repeat += 1;
          previous.xml = `${rowOpen} table:number-rows-repeated="${previous.repeat}"><table:table-cell/></table:table-row>`;
          continue;
        }
        rowParts.push({
          key: rowNumber,
          xml: `${rowOpen}>${cellsXml || "<table:table-cell/>"}</table:table-row>`,
          ...(repeatableEmptyRow ? { repeatOpen: rowOpen, repeat: 1 } : {})
        });
      }
      const rowsXml = this._wrapOutlineGroups(sheetName, rowParts, "row", "table:table-row-group");
      const localNames = (this.grid.namedRangesBySheet?.[sheetName] || []).map(range => this._namedRangeXml(range, sheetName)).join("");
      const printRange = this._printRangeAddress(sheetName, this.grid.printAreaBySheet?.[sheetName]);
      const printRangeAttr = printRange ? ` table:print-ranges="${this._escapeXml(printRange)}"` : "";
      const clearPrintAreaAttr = !printRange && this.grid.printAreaTouchedBySheet?.has(sheetName)
        ? ' vno:clear-print-area="true"' : "";
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
      // Lưu riêng ở đây để tự round-trip đúng trong 3T Office; khi xuất XLSX
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
      // Tab color: serialize vno:tab-color for round-trip fidelity
      const tabColor = (this.grid.sheetStates?.[sheetName]?.tabColor) || (this.grid.tabColors?.[sheetName]) || "";
      const tabColorAttr = tabColor ? ` vno:tab-color="${this._escapeXml(tabColor)}"` : "";
      // S27c: retain how many images entered the editable model at open time.
      // If all are later deleted, the save-side repair must not resurrect them.
      const imagesAtOpen = Math.max(0, Number(this.grid.imagesAtOpenBySheet?.[sheetName]) || 0);
      const scenarios = this.grid.getScenarios ? this.grid.getScenarios(sheetName) : (this.grid.scenariosBySheet?.[sheetName] || []);
      const scenariosAttr = scenarios && scenarios.length ? ` vno:scenarios="${this._escapeXml(JSON.stringify(scenarios))}"` : "";
      const textBoxes = this.grid.textBoxesBySheet?.[sheetName] || [];
      const textBoxesAttr = textBoxes.length ? ` vno:text-boxes="${this._escapeXml(JSON.stringify(textBoxes.map(box => ({ text: String(box.text || ""), anchor: box.anchor, widthPx: Math.max(180, Number(box.widthPx) || 180), heightPx: Math.max(54, Number(box.heightPx) || 54) }))))}"` : "";
      const pageAttrs = ` table:style-name="${pageStyle.tableStyle}" vno:page-size="${pageStyle.size}" vno:page-orientation="${pageStyle.orientation}" vno:page-margins="${this._escapeXml(JSON.stringify(pageStyle.margins))}" vno:page-scale="${this._escapeXml(JSON.stringify(pageStyle.scale))}" vno:page-header-footer="${this._escapeXml(JSON.stringify(pageStyle.headerFooter))}" vno:page-centering="${this._escapeXml(JSON.stringify(pageStyle.centerOnPage))}" vno:page-print-options="${this._escapeXml(JSON.stringify(pageStyle.printOptions))}" vno:print-title-rows="${this._escapeXml(printTitles.rows || "")}" vno:print-title-cols="${this._escapeXml(printTitles.cols || "")}" vno:images-at-open="${imagesAtOpen}"${freezeAttr}${sheetStateAttr}${tabColorAttr}${scenariosAttr}${textBoxesAttr}${resolvedCommentsAttr}${this._untouchedAutoRowsAttr(sheetName)}`;
      const conditionalXml = conditionalFormatsBySheet[sheetName];
      const chartsXml = this._serializeChartsXml(sheetName);
      const sparklinesXml = this._serializeSparklinesXml(sheetName);
      const shapesXml = this._serializePageAnchoredImagesXml(pageAnchoredImages);
      return `<table:table table:name="${this._escapeXml(sheetName)}"${pageAttrs}${printRangeAttr}${clearPrintAreaAttr}${protectedAttr}>${chartsXml}${shapesXml}${columnsXml}${rowsXml}${localNames ? `<table:named-expressions>${localNames}</table:named-expressions>` : ""}${conditionalXml ? `<calcext:conditional-formats>${conditionalXml}</calcext:conditional-formats>` : ""}${sparklinesXml}</table:table>`;
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
        const resultRange = pivot?.resultRange;
        const resultLocation = this.grid.pivotRefreshTouchedBySheet?.has(targetSheet)
          && resultRange?.start?.c && resultRange?.start?.r && resultRange?.end?.c && resultRange?.end?.r
          ? ` vno:xlsx-location="${this._escapeXml(`${resultRange.start.c}${resultRange.start.r}:${resultRange.end.c}${resultRange.end.r}`)}"`
          : "";
        const sourceRange = {
          start: { c: source[1], r: Number(source[2]) },
          end: { c: source[3], r: Number(source[4]) }
        };
        const pivotIdAttr = pivot.id ? ` vno:pivot-id="${this._escapeXml(pivot.id)}"` : "";
        dataPilotTables.push(`<table:data-pilot-table table:name="${this._escapeXml(pivot.name || pivot.id || `Pivot ${dataPilotTables.length + 1}`)}"${pivotIdAttr} table:target-range-address="${this._escapeXml(rangeAddress(targetSheet, usedRange(targetSheet)))}"${resultLocation}><table:source-cell-range table:cell-range-address="${this._escapeXml(rangeAddress(sourceSheet, sourceRange))}"/>${fields.join("")}</table:data-pilot-table>`);
      }
    }
    const dataPilotXml = dataPilotTables.length ? `<table:data-pilot-tables>${dataPilotTables.join("")}</table:data-pilot-tables>` : "";

    const activeSheet = sheetNames.includes(this.grid.activeSheet) ? this.grid.activeSheet : sheetNames[0];
    const tableViewsXml = sheetNames.map(sheetName => `<config:config-item-map-entry config:name="${this._escapeXml(sheetName)}">
          <config:config-item config:name="CursorPositionX" config:type="int">0</config:config-item>
          <config:config-item config:name="CursorPositionY" config:type="int">0</config:config-item>
        </config:config-item-map-entry>`).join("");
    const structureProtected = !!this.grid.workbookProtection?.enabled;
    const xlsxViewState = this.grid.xlsxViewStateTouched instanceof Set ? this.grid.xlsxViewStateTouched : new Set();
    const xlsxViewAttrs = [
      ["showGridLines", "show-grid-lines", this.grid.gridlinesVisible],
      ["showRowColHeaders", "show-row-col-headers", this.grid.headingsVisible],
      ["showFormulas", "show-formulas", this.grid.showFormulas],
      ["showFormulaBar", "show-formula-bar", this.grid.formulaBarVisible],
      ["view", "sheet-view", this.grid.workbookView],
      ["zoomScale", "zoom-scale", Math.round(Number(this.grid.zoomLevel || 1) * 100)],
    ].filter(([key]) => xlsxViewState.has(key))
      .map(([, attr, value]) => {
        const encoded = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
        return ` vno:${attr}="${this._escapeXml(encoded)}"`;
      }).join("");
    // ODF flag. LibreOffice FODS→XLSX keeps <workbookProtection> but drops
    // lockStructure; native-export post-process restores it (see xlsx-native-postprocess.js).
    const structureAttr = structureProtected ? ' table:structure-protected="true"' : "";
    return `<?xml version="1.0" encoding="UTF-8"?>
${pristineXlsxMarker}
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
                 xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"
                 xmlns:tableooo="http://openoffice.org/2009/table"
                 xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet"${xlsxViewAttrs}>
  ${fontFaceDeclsXml}
  <office:styles>${isNewWorkbook ? '<style:default-style style:family="table-cell"><style:text-properties style:font-name="Calibri" fo:font-size="11pt"/></style:default-style>' : ""}${conditionalNamedStyles.join("")}</office:styles>
  <office:automatic-styles>${isNewWorkbook ? '<style:style style:name="vno-default-column" style:family="table-column"><style:table-column-properties style:column-width="1.693cm"/></style:style><style:style style:name="vno-default-row" style:family="table-row"><style:table-row-properties style:row-height="0.529cm" style:use-optimal-row-height="false"/></style:style>' : ""}${pageLayouts.join("")}${tablePageStyles.join("")}${dimensionStyles.join("")}${[...numberFormats.values()].map(format => `${this._numberFormatXml(format.config, format.dataStyle)}<style:style style:name="${format.cellStyle}" style:family="table-cell" style:data-style-name="${format.dataStyle}"/>`).join("")}${[...rotationStyles.values()].map(style => this._rotationCellStyleXml(style.styleName, style.textRotation)).join("")}${rotationCombinedStyles.join("")}${conditionalBaseStyles.join("")}${visualStyleEntries.join("")}${richTextAutoStyles.join("")}</office:automatic-styles>
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
  <office:body><office:spreadsheet${structureAttr}${["automatic", "manual"].includes(this.grid.calculationMode) ? ` vno:calculation-mode="${this.grid.calculationMode === "manual" ? "manual" : "auto"}"` : ""}>${validationDefinitions.length ? `<table:content-validations>${validationDefinitions.join("")}</table:content-validations>` : ""}${tablesXml}${this.grid.namedRangesWorkbook?.length ? `<table:named-expressions>${this.grid.namedRangesWorkbook.map(range => this._namedRangeXml(range, range.sheet || activeSheet)).join("")}</table:named-expressions>` : ""}${dataPilotXml}${this._serializeDatabaseRanges(sheetNames)}</office:spreadsheet></office:body>
</office:document>`;
  }

  /**
   * True only when a FODS cell carries something a user would see as content:
   * an actual value attribute, a formula, text, a comment or a validation.
   * A bare office:value-type (what LibreOffice writes on formatted-but-empty
   * cells) does not count — that is what lets the used-range bound in
   * parseFods ignore the million-row repeated tail of real XLSX files.
   * ALSO counts cells that have a style with borders (visual formatting),
   * so that empty cells with borders are preserved within the used range.
   */
  _fodsCellHasRealContent(cell, cellVisualStyles = new Map(), includeBorderStyle = true) {
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
    // Check if cell has a style with borders
    if (!includeBorderStyle) return false;
    const styleName = cell.getAttribute("table:style-name");
    if (styleName && cellVisualStyles.has(styleName)) {
      const visualStyle = cellVisualStyles.get(styleName);
      if (visualStyle && (visualStyle.borderLeft || visualStyle.borderRight || visualStyle.borderTop || visualStyle.borderBottom)) {
        return true;
      }
    }
    return false;
  }

  /** True when the cell's automatic style draws at least one border. */
  _cellStyleHasBorder(styleName, cellVisualStyles = new Map()) {
    if (!styleName || !cellVisualStyles.has(styleName)) return false;
    const visualStyle = cellVisualStyles.get(styleName);
    return Boolean(visualStyle && (visualStyle.borderLeft || visualStyle.borderRight || visualStyle.borderTop || visualStyle.borderBottom));
  }

  /** Regex-branch twin of _fodsCellHasRealContent (attributes map + raw inner markup). */
  _fodsCellMarkupHasRealContent(attributes, content, cellVisualStyles = new Map(), includeBorderStyle = true) {
    if (attributes["vno:original-string"] !== undefined) return true;
    if (attributes["table:formula"] || attributes["vno:formula"] || attributes["table:content-validation-name"]) return true;
    if (Number(attributes["table:number-columns-spanned"]) > 1 || Number(attributes["table:number-rows-spanned"]) > 1) return true;
    for (const attr of ["office:value", "office:string-value", "office:date-value", "office:time-value", "office:boolean-value"]) {
      if (attributes[attr] !== undefined && attributes[attr] !== "") return true;
    }
    // Check if cell has a style with borders (empty cells with borders must be materialized)
    const styleName = attributes["table:style-name"];
    if (includeBorderStyle && styleName && cellVisualStyles.has(styleName)) {
      const visualStyle = cellVisualStyles.get(styleName);
      if (visualStyle && (visualStyle.borderLeft || visualStyle.borderRight || visualStyle.borderTop || visualStyle.borderBottom)) {
        return true;
      }
    }
    const markup = String(content || "");
    if (!markup) return false;
    if (/<office:annotation\b/i.test(markup) || /<draw:frame\b/i.test(markup)) return true;
    if (markup.replace(/<[^>]+>/g, "").trim() !== "") return true;
    return false;
  }

  _cellFromFodsAttributesLegacy(attributes, text, numberStyles = new Map(), rotationStyles = new Map(), cellVisualStyles = new Map()) {
    // Superseded by P2 - xoa chi khi chu so huu duyet. Keep the uncached
    // conversion entry point for model parity checks and immediate rollback.
    return this._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles, null);
  }

  _cellFromFodsAttributes(attributes, text, numberStyles = new Map(), rotationStyles = new Map(), cellVisualStyles = new Map(), p2Cache = null) {
    const get = name => attributes[name] ?? "";
    const valueType = get("office:value-type");
    let value = text;
    if (valueType === "float" || valueType === "percentage" || valueType === "currency") {
      const numericValue = Number(get("office:value"));
      value = Number.isFinite(numericValue) ? numericValue : text;
    } else if (valueType === "date") {
      const dateValue = get("office:date-value");
      if (dateValue) {
        // Tách thành phần bằng tay, tính theo UTC: `new Date("2021-10-01 08:30")` hiểu là giờ ĐỊA PHƯƠNG
        // rồi trừ mốc UTC → lệch múi giờ (+7h ở VN = +0.29 ngày).
        const m = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?)?/);
        if (m) {
          const epoch = Date.UTC(1899, 11, 30);
          const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
          value = Math.round((ms - epoch) / 86400000 * 1000000) / 1000000;
        }
      }
    } else if (valueType === "time") {
      const timeValue = get("office:time-value");
      if (timeValue) {
        const match = String(timeValue).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
        if (match) {
          const hours = Number(match[1] || 0);
          const minutes = Number(match[2] || 0);
          const seconds = Number(match[3] || 0);
          value = (hours * 3600 + minutes * 60 + seconds) / 86400;
        }
      }
    } else if (valueType === "boolean") {
      value = get("office:boolean-value") === "true";
    } else if (get("vno:original-string") !== "") {
      value = get("vno:original-string");
    } else if (get("office:string-value")) {
      value = this._decodeImportedCellText(get("office:string-value"));
    }
    const odfFormula = get("table:formula");
    const formula = get("vno:formula") || this._formulaFromOdf(odfFormula);
    // Excel keeps the cached value of a link to a closed workbook and never
    // recalculates it; remember the exact LibreOffice formula so an unedited
    // link is written back byte-for-byte on save.
    const externalOdf = !get("vno:formula") && this._isExternalOdfFormula(odfFormula) ? odfFormula : "";
    const styleName = get("table:style-name");
    const numFmtAttr = get("vno:number-format");
    const origXf = get("vno:xf");
    const styleKey = p2Cache ? `${styleName}\u0000${numFmtAttr}\u0000${origXf}\u0000${valueType}` : "";
    const cachedStyle = p2Cache?.styles.get(styleKey);
    const style = cachedStyle
      ? { ...cachedStyle, ...(cachedStyle.numberFormat ? { numberFormat: { ...cachedStyle.numberFormat } } : {}) }
      : {};
    if (!cachedStyle) {
    const standardFormat = numberStyles.get(styleName);
    const numericTypes = new Set(["float", "percentage", "currency", "date", "time"]);
    // Apply number format from vno:number-format for ALL cell types (including string/empty)
    // Per task requirement: keep original Excel format code for every cell/column/row with format
    if (numFmtAttr) {
      let parsed;
      let excelCode = null;
      const cachedFormat = p2Cache?.numberFormats.get(numFmtAttr);
      if (cachedFormat) {
        parsed = { ...cachedFormat.parsed };
        excelCode = cachedFormat.excelCode;
      } else {
        try {
          parsed = JSON.parse(numFmtAttr);
          // If parsed from app's own JSON, try to reconstruct excelCode from category
          if (parsed.category) {
            excelCode = this._excelCodeFromNumberFormat(parsed);
          }
        } catch (e) {
          // Raw Excel format code from Python overlay
          excelCode = numFmtAttr;
          parsed = numberFormatFromExcelCode(numFmtAttr);
        }
        if (p2Cache && parsed) {
          p2Cache.numberFormats.set(numFmtAttr, { parsed: { ...parsed }, excelCode });
        }
      }
      if (parsed) {
        style.numberFormat = parsed;
        if (excelCode) style.numberFormat.excelCode = excelCode;
        // S7: data-style ODF của LibreOffice cho ô này (nếu có) là biểu diễn chính xác nhất khi ghi lại.
        if (standardFormat?.odf) style.numberFormat.odf = standardFormat.odf;
      }
    } else if (standardFormat && (numericTypes.has(valueType) || !valueType || standardFormat.odf)) {
      const fmt = { ...standardFormat };
      // Try to reconstruct excelCode from standard format
      const inferred = this._excelCodeFromNumberFormat(fmt);
      if (inferred) fmt.excelCode = inferred;
      style.numberFormat = fmt;
    } else if (valueType === "percentage") {
      style.numberFormat = { category: "percentage", decimals: 2 };
    } else if (valueType === "currency") {
      style.numberFormat = { category: "currency", currencySymbol: "₫", decimals: 0, useThousands: true };
    }
    const rotation = rotationStyles.get(styleName);
    if (rotation != null) style.textRotation = rotation;
    const visualStyle = cellVisualStyles.get(styleName);
    if (visualStyle) {
      for (const [key, val] of Object.entries(visualStyle)) {
        if (val !== undefined && val !== null && val !== "") style[key] = val;
      }
    }
    // S8: Preserve original xf index for untouched cells round-trip.
    if (origXf !== "") {
      style.origXf = parseInt(origXf, 10);
    }
    // S8: Compute stable hash of style at import time.
    if (p2Cache) {
      let styleHash = p2Cache.styleHashes.get(styleKey);
      if (styleHash === undefined) {
        styleHash = this._computeStyleHash(style);
        p2Cache.styleHashes.set(styleKey, styleHash);
      }
      style.styleHashAtImport = styleHash;
      p2Cache.styles.set(styleKey, {
        ...style,
        ...(style.numberFormat ? { numberFormat: { ...style.numberFormat } } : {}),
      });
    } else {
      style.styleHashAtImport = this._computeStyleHash(style);
    }
    }
    return externalOdf
      ? { val: value, formula, style, externalLink: { odf: externalOdf, formula } }
      : { val: value, formula, style };
  }

  _parseCellStyleColors(xmlText) {
    const colors = new Map();
    String(xmlText || "").replace(/<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi, (_, attrs, body = "") => {
      const name = this._unescapeXml(attrs.match(/style:name=["']([^"']*)["']/i)?.[1] || "");
      const display = this._unescapeXml(attrs.match(/style:display-name=["']([^"']*)["']/i)?.[1] || "");
      const color = (body.match(/fo:background-color=["']([^"']+)["']/i)?.[1] || "").trim().toLowerCase();
      if (name && color && color !== "transparent") {
        const resolvedColor = color;
        colors.set(name, resolvedColor);
        if (display) colors.set(display, resolvedColor);
        const normalized = name.replace(/_5f_/g, "_");
        colors.set(normalized, resolvedColor);
      }
      return "";
    });
    return colors;
  }

  _splitOdfAddressList(raw) {
    const tokens = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "'") inQuote = !inQuote;
      if (/\s/.test(ch) && !inQuote) {
        if (current.trim()) tokens.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) tokens.push(current.trim());
    return tokens;
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

  _parseOdfTargetRanges(addressList, fallbackSheet) {
    const unescaped = this._unescapeXml(String(addressList || "")).trim();
    if (!unescaped) return [];
    const tokens = this._splitOdfAddressList(unescaped);
    const results = [];
    for (const token of tokens) {
      const target = this._parseOdfTargetRange(token, fallbackSheet);
      if (target?.range) results.push(target);
    }
    return results;
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
    if (/duplicate/i.test(raw)) {
      return { type: "duplicate", value: null, color };
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
      const rawTarget = attrs.match(/calcext:target-range-address=["']([^"']*)["']/i)?.[1] || "";
      const targets = this._parseOdfTargetRanges(rawTarget, workbook.sheets[0]);
      if (!targets.length) return "";
      body.replace(/<calcext:condition\b([^>]*)\/?\s*>/gi, (all, conditionAttrs) => {
        const styleName = this._unescapeXml(conditionAttrs.match(/calcext:apply-style-name=["']([^"']*)["']/i)?.[1] || "");
        const value = this._unescapeXml(conditionAttrs.match(/calcext:value=["']([^"']*)["']/i)?.[1] || "");
        const parsed = this._parseConditionalCondition(value, styleName, colors);
        if (!parsed) return "";
        for (const target of targets) {
          if (!workbook.conditionalFormattingBySheet[target.sheet]) continue;
          workbook.conditionalFormattingBySheet[target.sheet].push({
            id: `cf-import-${++cfIndex}`,
            range: target.range,
            type: parsed.type,
            value: parsed.value,
            color: parsed.color
          });
        }
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
   * onto the existing 3T Sheet chartsBySheet object:
   * { id, type, range, title, labels, data }.
   *
   * Supported classes: bar/column, line, area, circle/ring/pie — the four SVG types
   * 3T Sheet already renders. First series only (engine is single-series).
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
        const extracted = extractSheetRangeData(cells, chart.range, this._columnsForChartExtract());
        chart.labels = extracted.labels;
        chart.data = extracted.data;
      }
      workbook.chartsBySheet[union.sheet].push(chart);
      return "";
    });
  }

  /**
   * Map ODF DataPilot (LibreOffice Calc / Excel Pivot Table after soffice XLSX→FODS)
   * onto the existing 3T Sheet pivotTablesBySheet object:
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
      const pivotId = this._unescapeXml(attrs.match(/vno:pivot-id=["']([^"']*)["']/i)?.[1] || "");
      workbook.pivotTablesBySheet[targetSheet].push({
        id: pivotId || `pivot-import-${++index}`,
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
    const workbook = { sheets: [], sheetsData: {}, activeSheet: "", commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesWorkbook: [], namedRangesBySheet: {}, printAreaBySheet: {}, pageSetupBySheet: {}, validationHits: [], rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, imagesAtOpenBySheet: {} };
    if (!xmlText) return workbook;
    const calculationMode = String(xmlText).match(/<office:spreadsheet\b[^>]*\bvno:calculation-mode=["'](auto|manual)["']/i)?.[1]?.toLowerCase();
    if (calculationMode) workbook.calculationMode = calculationMode === "manual" ? "manual" : "automatic";
    const perfEnabled = typeof window !== "undefined" && window.__vnoPerfDebug === true;
    const perfNow = () => perfEnabled ? performance.now() : 0;
    const perfReport = (name, started) => { if (perfEnabled) window.__vnoPerfReport?.(`parseFods:${name}`, performance.now() - started); };
    let phaseStart = perfNow();
    const tableXml = this._xmlWithoutEmbeddedObjects(xmlText);
    perfReport("strip embedded objects", phaseStart);
    phaseStart = perfNow();
    const numberStyles = this._parseNumberStyles(tableXml);
    perfReport("number styles", phaseStart); phaseStart = perfNow();
    const rotationStyles = this._parseRotationStyles(tableXml);
    perfReport("rotation styles", phaseStart); phaseStart = perfNow();
    const cellVisualStyles = this._parseCellVisualStyles(tableXml);
    perfReport("cell visual styles", phaseStart); phaseStart = perfNow();
    const textStyles = this._parseTextStyles(tableXml);
    perfReport("text styles", phaseStart); phaseStart = perfNow();
    const rowColStyles = this._parseRowColStyles(tableXml);
    perfReport("row/column styles", phaseStart);
    const defaultRowHeight = this.grid?.rowHeight || 20;
    const defaultColWidth = this.grid?.defaultColWidth || 64;
    phaseStart = perfNow();
    const workbookOnlyXml = tableXml.replace(/<table:table(?=[\s>/])[^>]*>[\s\S]*?<\/table:table>/gi, "");
    perfReport("remove table blocks", phaseStart);
    let workbookNameIndex = 0;
    workbookOnlyXml.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const range = this._parseNamedRangeElement(attrs, "workbook", "", ++workbookNameIndex);
      if (range) workbook.namedRangesWorkbook.push(range);
      return "";
    });

    if (typeof DOMParser !== "undefined") {
      phaseStart = perfNow();
      const doc = new DOMParser().parseFromString(tableXml, "text/xml");
      perfReport("DOM parse", phaseStart);
      if (!doc.querySelector("parsererror")) {
        const configItems = Array.from(doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:config:1.0", "config-item"));
        workbook.activeSheet = configItems.find(item => item.getAttribute("config:name") === "ActiveTable")?.textContent || "";
        const tables = Array.from(doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:table:1.0", "table"))
          .filter(table => table.getAttribute("table:name") !== "local-table");
        const repeatedXmlScanMs = { pageLayout: 0, printTitles: 0, tabColor: 0 };
        const worksheetPhaseMs = { findUsedRange: 0, buildWorkbookModel: 0 };
        phaseStart = perfNow();
        tables.forEach((table, tableIndex) => {
          // Large sheets revisit the same column index for every populated row.
          // Resolve each index once instead of rebuilding its base-26 name per cell.
          const columnNames = [""];
          const columnName = number => columnNames[number] || (columnNames[number] = this._columnName(number));
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
          // Thuộc tính vno:page-* chỉ tồn tại khi chính 3T Office ghi ra và CHƯA từng qua vòng
          // chuyển đổi thật nào (LibreOffice/Excel không giữ lại thuộc tính lạ khi convert).
          // Với file thật (mở lần đầu từ Excel/LibreOffice, hoặc đã convert qua lại), phải đọc
          // Page Setup chuẩn ODF thật (style:page-layout-properties) làm nguồn dự phòng.
          let repeatedScanStart = perfNow();
          const standardLayout = this._parseStandardOdfPageLayout(tableXml, table.getAttribute("table:style-name"));
          if (perfEnabled) repeatedXmlScanMs.pageLayout += performance.now() - repeatedScanStart;
          const pageSetup = {
            size: table.getAttribute("vno:page-size") || standardLayout?.size || "a4",
            orientation: table.getAttribute("vno:page-orientation") || standardLayout?.orientation || "portrait",
            margins: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78, ...(standardLayout?.margins || {}), ...pageMargins },
            scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0, ...(standardLayout?.scale || {}), ...pageScale },
            headerFooter: { header: { left: "", center: "", right: "", ...(standardLayout?.headerFooter?.header || {}), ...(pageHeaderFooter.header || {}) }, footer: { left: "", center: "Trang &P / &N", right: "", ...(standardLayout?.headerFooter?.footer || {}), ...(pageHeaderFooter.footer || {}) } },
            centerOnPage: { horizontal: false, vertical: false, ...(standardLayout?.centerOnPage || {}), ...pageCentering },
            printOptions: { gridlines: false, headings: false, ...(standardLayout?.printOptions || {}), ...pagePrintOptions },
            printTitles: { rows: table.getAttribute("vno:print-title-rows") || "", cols: table.getAttribute("vno:print-title-cols") || "" }
          };
          if (!pageSetup.printTitles.rows && !pageSetup.printTitles.cols) {
            repeatedScanStart = perfNow();
            const standardTitles = this._parseStandardPrintTitles(tableXml, name);
            if (perfEnabled) repeatedXmlScanMs.printTitles += performance.now() - repeatedScanStart;
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
          // Reuse each row's cell children in the model pass below.
          const rowCellsByElement = new WeakMap();

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
            const scanStarted = perfNow();
            let scanRow = 1;
            for (const row of rowElements) {
              const scanRepeat = Math.max(1, Number(row.getAttribute("table:number-rows-repeated")) || 1);
              let scanCol = 1;
              let rowHasData = false;
              const rowCells = [];
              for (const cell of row.children) {
                if (cell.localName !== "table-cell" && cell.localName !== "covered-table-cell") continue;
                rowCells.push(cell);
                const colRepeat = Math.max(1, Number(cell.getAttribute("table:number-columns-repeated")) || 1);
                // A border-only cell repeated across a whole row/column block is
                // "format the entire row" (Excel writes it for 16384 columns and
                // up to 1M rows); counting it as data blew the used range up to
                // 16384 x 1M coords and crashed the Map (lan02.xlsx: "Map maximum
                // size exceeded"). Only compact bordered blocks extend the range.
                const hasValue = this._fodsCellHasRealContent(cell, cellVisualStyles, false);
                const compactBorderBlock = !hasValue && colRepeat <= SheetAdapter.STYLE_ONLY_MAX_COLUMN_REPEAT
                  && scanRepeat <= SheetAdapter.STYLE_ONLY_MAX_ROW_REPEAT
                  && this._fodsCellHasRealContent(cell, cellVisualStyles);
                if (hasValue || compactBorderBlock) {
                  rowHasData = true;
                  lastDataCol = Math.max(lastDataCol, scanCol + colRepeat - 1);
                }
                scanCol += colRepeat;
              }
              rowCellsByElement.set(row, rowCells);
              if (rowHasData) lastDataRow = scanRow + scanRepeat - 1;
              scanRow += scanRepeat;
            }
            if (perfEnabled) worksheetPhaseMs.findUsedRange += performance.now() - scanStarted;
          }

          const columnStyles = [];
          const colWidths = new Map();
          const hiddenCols = new Set();
          let layoutColumn = 1;
          const effectiveColLimit = Math.max(lastDataCol, 26);
          for (const column of table.children) {
            if (column.localName !== "table-column") continue;
            const repeat = Math.max(1, Number(column.getAttribute("table:number-columns-repeated")) || 1);
            const styleName = this._tableAttr(column, "style-name");
            const visibility = this._tableAttr(column, "visibility").toLowerCase();
            const widthPx = rowColStyles.columns.get(styleName)?.widthPx;
            const defaultCellStyle = column.getAttribute("table:default-cell-style-name") || "";
            for (let index = 0; index < repeat; index++) {
              if (layoutColumn <= effectiveColLimit) {
                columnStyles.push(defaultCellStyle);
                const colName = columnName(layoutColumn);
                if (Number.isFinite(widthPx) && !this._isCloseToDefault(widthPx, defaultColWidth)) colWidths.set(colName, widthPx);
                if (visibility === "collapse") hiddenCols.add(colName);
              }
              layoutColumn++;
            }
          }

          const modelStarted = perfNow();
          rowElements.forEach(row => {
            const rowRepeat = Math.max(1, Number(row.getAttribute("table:number-rows-repeated")) || 1);
            const rowStyleName = this._tableAttr(row, "style-name");
            const rowVisibility = this._tableAttr(row, "visibility").toLowerCase();
            const heightPx = rowColStyles.rows.get(rowStyleName)?.heightPx;

            if (rowNumber > lastDataRow && (rowRepeat > 32 || rowNumber > lastDataRow + 1000) && rowVisibility !== "collapse" && rowVisibility !== "filter") {
              rowNumber += rowRepeat;
              rowCellsByElement.delete(row);
              row.replaceChildren();
              return;
            }

            for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
              if (rowRepeat <= 32 || (rowVisibility === "collapse" || rowVisibility === "filter")) {
                if (Number.isFinite(heightPx) && !this._isCloseToDefault(heightPx, defaultRowHeight)) rowHeights.set(rowNumber, heightPx);
                if ((rowVisibility === "collapse" || rowVisibility === "filter")) hiddenRows.add(rowNumber);
              }
              if (rowNumber > lastDataRow) {
                rowNumber++;
                continue;
              }
              let columnNumber = 1;
              for (const cell of rowCellsByElement.get(row) || []) {
                const columnRepeat = Math.max(1, Number(cell.getAttribute("table:number-columns-repeated")) || 1);
                const attributes = Object.fromEntries(Array.from(cell.attributes).map(attr => [attr.name, attr.value]));
                const isCovered = cell.localName === "covered-table-cell";
                const isCoveredErrorFormula = isCovered && Boolean(attributes["table:formula"] || attributes["vno:formula"])
                  && (attributes["calcext:value-type"] || "").toLowerCase() === "error";
                const mergedColumns = Math.max(1, Number(attributes["table:number-columns-spanned"]) || 1);
                const mergedRows = Math.max(1, Number(attributes["table:number-rows-spanned"]) || 1);
                if (!isCovered && (mergedColumns > 1 || mergedRows > 1)) {
                  for (let repeat = 0; repeat < columnRepeat; repeat++) {
                    mergedRanges.push({
                      start: { c: columnName(columnNumber + repeat), r: rowNumber },
                      end: { c: columnName(columnNumber + repeat + mergedColumns - 1), r: rowNumber + mergedRows - 1 }
                    });
                  }
                }
                if (!attributes["table:style-name"] && columnStyles[columnNumber - 1]) attributes["table:style-name"] = columnStyles[columnNumber - 1];
                const annotation = Array.from(cell.children).find(child => child.localName === "annotation");
                const paragraphs = this._cellTextParagraphs(cell);
                const text = this._decodeImportedCellText(paragraphs.map(paragraph => this._odfInlineText(paragraph)).join("\n"));
                // Ô rỗng nhưng có viền/nền (style-only) cũng phải vào model, nếu không
                // serializeToFods bỏ table:style-name -> XLSX lưu ra mất viền (đo Dahua:
                // FODS soffice 573 ô viền, app gửi đi 468 khi thiếu nhánh này).
                const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"] || text !== "" || annotation || attributes["table:content-validation-name"]
                  || (columnNumber <= lastDataCol && this._cellStyleHasBorder(attributes["table:style-name"], cellVisualStyles));
                if (hasValue && (!isCovered || isCoveredErrorFormula)) {
                  const item = this._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles);
                  const hyperlinkNode = Array.from(cell.getElementsByTagName("*") || []).find(node => node.localName === "a");
                  const hyperlink = hyperlinkNode?.getAttribute("xlink:href")
                    || hyperlinkNode?.getAttributeNS?.("http://www.w3.org/1999/xlink", "href")
                    || "";
                  if (/^(https?:|mailto:)/i.test(hyperlink)) item.hyperlink = hyperlink;
                  // Extract rich text runs from <text:span> elements
                  if (textStyles.size > 0) {
                    const cellVisual = cellVisualStyles.get(attributes["table:style-name"]) || {};
                    const rt = this._extractRichTextFromDom(cell, textStyles, cellVisual);
                    if (rt.runs) {
                      item.richText = this._normalizeRichTextCellFont(rt.runs, item.style);
                      item.val = attributes["vno:original-string"] ?? rt.text;
                      item.style.styleHashAtImport = this._computeStyleHash(item.style);
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
                  // lastDataCol already covers every value-bearing repeat, so the
                  // bound applies to all cells: a border-only run of 16384
                  // columns inside the used rows would otherwise still explode.
                  const materializeRepeat = Math.max(0, Math.min(columnRepeat, lastDataCol - columnNumber + 1));
                  for (let repeat = 0; repeat < materializeRepeat; repeat++) {
                    const coord = `${columnName(columnNumber + repeat)}${rowNumber}`;
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
                const embeddedImages = this._parseCellEmbeddedImagesDom(cell, `Image${images.length + 1}`);
                for (const embeddedImage of embeddedImages) {
                  images.push({ ...embeddedImage, anchor: { c: columnName(columnNumber), r: rowNumber } });
                }
                columnNumber += columnRepeat;
              }
              rowNumber++;
            }
            // The model now owns values/styles/images for every repetition.
            // Release this temporary XML subtree before building the next row:
            // large imports otherwise keep both millions of DOM nodes and the
            // editable model alive when Save allocates its FODS strings.
            rowCellsByElement.delete(row);
            row.replaceChildren();
          });
          if (perfEnabled) worksheetPhaseMs.buildWorkbookModel += performance.now() - modelStarted;
          arrayFormulas.forEach(region => this._restoreArrayFormula(data, region.column, region.row, region.columns, region.rows, region.formula));
          const autoRowsAtImport = this._applyXlsxLayoutOverlay(table.getAttribute("vno:xlsx-layout"), rowHeights, colWidths, { data, mergedRanges });

          // Parse images from <table:shapes> (page-anchored images)
          const shapesImages = this._parseTableShapesImages(table, name);
          images.push(...shapesImages);

          // Tab color: read vno:tab-color, tableooo:tab-color, table:tab-color, or from table style
          let tabColor = table.getAttribute("vno:tab-color") || table.getAttribute("tableooo:tab-color") || table.getAttribute("table:tab-color") || "";
          if (!tabColor) {
            repeatedScanStart = perfNow();
            tabColor = this._parseStandardOdfTabColor(tableXml, table.getAttribute("table:style-name"));
            if (perfEnabled) repeatedXmlScanMs.tabColor += performance.now() - repeatedScanStart;
          }
          workbook.sheets.push(name);
          workbook.sheetsData[name] = data;
          workbook.commentsBySheet[name] = comments;
          workbook.mergedRangesBySheet[name] = mergedRanges;
          workbook.namedRangesBySheet[name] = localRanges;
          workbook.printAreaBySheet[name] = printArea;
          workbook.pageSetupBySheet[name] = pageSetup;
          workbook.rowHeightsBySheet[name] = rowHeights;
          workbook.colWidthsBySheet[name] = colWidths;
          workbook.autoRowsAtImportBySheet = workbook.autoRowsAtImportBySheet || {};
          workbook.autoRowsAtImportBySheet[name] = autoRowsAtImport;
          workbook.userHiddenRowsBySheet[name] = hiddenRows;
          workbook.userHiddenColsBySheet[name] = hiddenCols;
          workbook.imagesBySheet = workbook.imagesBySheet || {};
          workbook.imagesBySheet[name] = images;
          workbook.imagesAtOpenBySheet[name] = images.length;
          if (tabColor) {
            workbook.tabColors = workbook.tabColors || {};
            workbook.tabColors[name] = tabColor;
          }
          const scenariosRaw = table.getAttribute("vno:scenarios");
          if (scenariosRaw) {
            try {
              const scens = JSON.parse(scenariosRaw);
              if (scens && scens.length) {
                workbook.scenariosBySheet = workbook.scenariosBySheet || {};
                workbook.scenariosBySheet[name] = scens;
              }
            } catch (_) {}
          }
        });
        perfReport("DOM worksheet traversal", phaseStart);
        if (perfEnabled) {
          window.__vnoPerfReport?.("parseFods:repeat page-layout scans", repeatedXmlScanMs.pageLayout);
          window.__vnoPerfReport?.("parseFods:repeat print-title scans", repeatedXmlScanMs.printTitles);
          window.__vnoPerfReport?.("parseFods:repeat tab-color scans", repeatedXmlScanMs.tabColor);
          window.__vnoPerfReport?.("parseFods:find used range", worksheetPhaseMs.findUsedRange);
          window.__vnoPerfReport?.("parseFods:build workbook model", worksheetPhaseMs.buildWorkbookModel);
        }
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
        // Xem chú thích ở nhánh DOM phía trên: vno:page-* chỉ có khi 3T Office ghi ra và chưa
        // qua vòng chuyển đổi thật nào; file thật cần đọc style:page-layout-properties chuẩn ODF.
        const tableStyleMatch = tableMatch[1].match(/table:style-name=["']([^"']*)["']/i);
        const standardLayout = this._parseStandardOdfPageLayout(tableXml, this._unescapeXml(tableStyleMatch?.[1] || ""));
        const pageSetup = {
          size: pageAttr("vno:page-size") || standardLayout?.size || "a4",
          orientation: pageAttr("vno:page-orientation") || standardLayout?.orientation || "portrait",
          margins: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78, ...(standardLayout?.margins || {}), ...pageMargins },
          scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0, ...(standardLayout?.scale || {}), ...pageScale },
          headerFooter: { header: { left: "", center: "", right: "", ...(standardLayout?.headerFooter?.header || {}), ...(pageHeaderFooter.header || {}) }, footer: { left: "", center: "Trang &P / &N", right: "", ...(standardLayout?.headerFooter?.footer || {}), ...(pageHeaderFooter.footer || {}) } },
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
              // Same bound as the DOM branch: whole-row/column border formatting
              // must not extend the used range (see STYLE_ONLY_MAX_*_REPEAT).
              const hasValue = this._fodsCellMarkupHasRealContent(scanAttrs, scanCellMatch[3] || "", cellVisualStyles, false);
              const compactBorderBlock = !hasValue && colRepeat <= SheetAdapter.STYLE_ONLY_MAX_COLUMN_REPEAT
                && scanRepeat <= SheetAdapter.STYLE_ONLY_MAX_ROW_REPEAT
                && this._fodsCellMarkupHasRealContent(scanAttrs, scanCellMatch[3] || "", cellVisualStyles);
              if (hasValue || compactBorderBlock) {
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
          if (rowNumber > lastDataRow && (rowRepeat > 32 || rowNumber > lastDataRow + 1000) && rowVisibility !== "collapse" && rowVisibility !== "filter") {
            rowNumber += rowRepeat;
            continue;
          }
          for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
            if (rowRepeat <= 32 || (rowVisibility === "collapse" || rowVisibility === "filter")) {
              if (Number.isFinite(heightPx) && !this._isCloseToDefault(heightPx, defaultRowHeight)) rowHeights.set(rowNumber, heightPx);
              if ((rowVisibility === "collapse" || rowVisibility === "filter")) hiddenRows.add(rowNumber);
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
              const isCoveredErrorFormula = isCovered && Boolean(attributes["table:formula"] || attributes["vno:formula"])
                && (attributes["calcext:value-type"] || "").toLowerCase() === "error";
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
              this._stripCellFrames(valueContent).replace(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi, (_, value) => { paragraphs.push(this._odfInlineTextFromXml(value)); return ""; });
              const text = this._decodeImportedCellText(paragraphs.join("\n"));
              // Regex-branch twin of the DOM rule: border-only cells inside the
              // used range enter the model so their borders survive the save.
              const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"] || text !== "" || annotationMatch || attributes["table:content-validation-name"]
                || (columnNumber <= lastDataCol && this._cellStyleHasBorder(attributes["table:style-name"], cellVisualStyles));
              if (hasValue && (!isCovered || isCoveredErrorFormula)) {
                const item = this._cellFromFodsAttributes(attributes, text, numberStyles, rotationStyles, cellVisualStyles);
                const hyperlink = valueContent.match(/<(?:text:)?a\b[^>]*\bxlink:href=["']([^"']+)["']/i)?.[1] || "";
                const safeHyperlink = this._unescapeXml(hyperlink);
                if (/^(https?:|mailto:)/i.test(safeHyperlink)) item.hyperlink = safeHyperlink;
                // Extract rich text runs from <text:span> elements (regex branch)
                if (textStyles.size > 0) {
                  const cellVisual = cellVisualStyles.get(attributes["table:style-name"]) || {};
                  const rt = this._extractRichTextFromXml(valueContent, textStyles, cellVisual);
                  if (rt.runs) {
                    item.richText = this._normalizeRichTextCellFont(rt.runs, item.style);
                    item.val = attributes["vno:original-string"] ?? rt.text;
                    item.style.styleHashAtImport = this._computeStyleHash(item.style);
                  }
                }
                const matrixColumns = Math.max(1, Number(attributes["table:number-matrix-columns-spanned"]) || 1);
                const matrixRows = Math.max(1, Number(attributes["table:number-matrix-rows-spanned"]) || 1);
                if ((attributes["table:number-matrix-columns-spanned"] || attributes["table:number-matrix-rows-spanned"]) && item.formula) {
                  arrayFormulas.push({ column: columnNumber, row: rowNumber, columns: matrixColumns, rows: matrixRows, formula: item.formula });
                }
                const materializeRepeat = Math.max(0, Math.min(columnRepeat, lastDataCol - columnNumber + 1));
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
              const embeddedImages = this._parseCellEmbeddedImages(content, `Image${images.length + 1}`);
              for (const embeddedImage of embeddedImages) {
                images.push({ ...embeddedImage, anchor: { c: this._columnName(columnNumber), r: rowNumber } });
              }
              columnNumber += columnRepeat;
            }
            rowNumber++;
          }
        }
        arrayFormulas.forEach(region => this._restoreArrayFormula(data, region.column, region.row, region.columns, region.rows, region.formula));
        const autoRowsAtImport = this._applyXlsxLayoutOverlay(pageAttr("vno:xlsx-layout"), rowHeights, colWidths, { data, mergedRanges });

        // Parse images from <table:shapes> (page-anchored images) - regex branch
        const shapesImages = this._parseTableShapesImagesRegex(tableMatch[2], name);
        images.push(...shapesImages);

        // Tab color: read vno:tab-color from table:table element (regex branch) or table style
        const tabColorMatch = tableMatch[1].match(/(?:vno|tableooo|table):tab-color=["']([^"']*)["']/i);
        let tabColor = tabColorMatch ? tabColorMatch[1] : "";
        if (!tabColor) {
          const tableStyleMatch = tableMatch[1].match(/table:style-name=["']([^"']*)["']/i);
          tabColor = this._parseStandardOdfTabColor(tableXml, tableStyleMatch ? this._unescapeXml(tableStyleMatch[1]) : "");
        }
        workbook.sheets.push(name);
        workbook.sheetsData[name] = data;
        workbook.commentsBySheet[name] = comments;
        workbook.mergedRangesBySheet[name] = mergedRanges;
        workbook.namedRangesBySheet[name] = localRanges;
        workbook.printAreaBySheet[name] = printArea;
        workbook.pageSetupBySheet[name] = pageSetup;
        workbook.rowHeightsBySheet[name] = rowHeights;
        workbook.colWidthsBySheet[name] = colWidths;
        workbook.autoRowsAtImportBySheet = workbook.autoRowsAtImportBySheet || {};
        workbook.autoRowsAtImportBySheet[name] = autoRowsAtImport;
        workbook.userHiddenRowsBySheet[name] = hiddenRows;
        workbook.userHiddenColsBySheet[name] = hiddenCols;
        workbook.imagesBySheet = workbook.imagesBySheet || {};
        workbook.imagesBySheet[name] = images;
        workbook.imagesAtOpenBySheet[name] = images.length;
        if (tabColor) {
          workbook.tabColors = workbook.tabColors || {};
          workbook.tabColors[name] = tabColor;
        }
        const scenariosRaw = pageAttr("vno:scenarios");
        if (scenariosRaw) {
          try {
            const scens = JSON.parse(scenariosRaw);
            if (scens && scens.length) {
              workbook.scenariosBySheet = workbook.scenariosBySheet || {};
              workbook.scenariosBySheet[name] = scens;
            }
          } catch (_) {}
        }
      }
    }
    if (!workbook.sheets.includes(workbook.activeSheet)) workbook.activeSheet = workbook.sheets[0] || "";
    phaseStart = perfNow();
    this._attachImportedRules(workbook, tableXml);
    perfReport("attach rules", phaseStart); phaseStart = perfNow();
    this._attachImportedPivots(workbook, xmlText);
    perfReport("attach pivots", phaseStart); phaseStart = perfNow();
    this._attachImportedCharts(workbook, xmlText);
    perfReport("attach charts", phaseStart); phaseStart = perfNow();
    this._attachImportedPageBreaks(workbook, tableXml, rowColStyles);
    perfReport("attach page breaks", phaseStart); phaseStart = perfNow();
    this._attachImportedProtection(workbook, xmlText);
    perfReport("attach protection", phaseStart); phaseStart = perfNow();
    this._attachImportedFreezePanes(workbook, xmlText);
    perfReport("attach freeze panes", phaseStart); phaseStart = perfNow();
    this._attachImportedSheetVisibility(workbook, xmlText);
    perfReport("attach visibility", phaseStart); phaseStart = perfNow();
    this._attachImportedAutoFilter(workbook, xmlText);
    perfReport("attach autofilter", phaseStart); phaseStart = perfNow();
    this._attachImportedTables(workbook, xmlText);
    perfReport("attach tables", phaseStart); phaseStart = perfNow();
    this._attachImportedSparklines(workbook, xmlText);
    perfReport("attach sparklines", phaseStart); phaseStart = perfNow();
    this._attachImportedOutline(workbook, tableXml);
    perfReport("attach outline", phaseStart);
    this._attachImportedTextBoxes(workbook, tableXml);
    this._attachImportedResolvedComments(workbook, tableXml);
    return workbook;
  }

  loadFromFods(fodsText, ooxmlWorkbookXml) {
    if (!this.grid) return false;
    const perfEnabled = typeof window !== "undefined" && window.__vnoPerfDebug === true;
    const perfStart = perfEnabled ? performance.now() : 0;
    if (perfEnabled) {
      this.grid.__vnoPerfLoadAt = perfStart;
      this.grid.__vnoPerfRenderLogged = false;
    }
    const oldRowHeight = this.grid.rowHeight;
    const oldDefaultColWidth = this.grid.defaultColWidth;
    // Keep the established imported-workbook defaults while parsing, then
    // restore the live grid until the fully parsed model is ready to commit.
    this.grid.rowHeight = 26;
    this.grid.defaultColWidth = 100;
    let workbook;
    try {
      let xml = overlayFodsStructureProtection(fodsText, ooxmlWorkbookXml);
      xml = overlayActiveSheetToFods(xml, ooxmlWorkbookXml);
      const parseStart = perfEnabled ? performance.now() : 0;
      workbook = this.parseFods(xml);
      if (perfEnabled) window.__vnoPerfReport?.("parseFods", performance.now() - parseStart);
    } finally {
      this.grid.rowHeight = oldRowHeight;
      this.grid.defaultColWidth = oldDefaultColWidth;
    }
    if (workbook.sheets.length === 0) return false;
    return this._commitWorkbook(workbook, perfStart, "loadFromFods");
  }

  async loadFromPayload(payload, ooxmlWorkbookXml) {
    if (!this.grid) return false;
    const perfEnabled = typeof window !== "undefined" && window.__vnoPerfDebug === true;
    const perfStart = perfEnabled ? performance.now() : 0;
    if (perfEnabled) {
      this.grid.__vnoPerfLoadAt = perfStart;
      this.grid.__vnoPerfRenderLogged = false;
    }
    const hadDefaultWidth = Object.prototype.hasOwnProperty.call(this, "_sheetPayloadImportDefaultColWidth");
    const oldDefaultWidth = this._sheetPayloadImportDefaultColWidth;
    this._sheetPayloadImportDefaultColWidth = 100;
    try {
      let supportXml = payload?.supportXml;
      supportXml = overlayFodsStructureProtection(supportXml, ooxmlWorkbookXml);
      supportXml = overlayActiveSheetToFods(supportXml, ooxmlWorkbookXml);
      const parseStart = perfEnabled ? performance.now() : 0;
      let lastReportedPercent = -1;
      const workbook = await buildSheetPayloadModel(payload, this, supportXml, {
        onProgress: ratio => {
          const percent = Math.max(0, Math.min(100, Math.floor(Number(ratio || 0) * 100)));
          if (percent < lastReportedPercent + 2 && percent !== 100) return;
          lastReportedPercent = percent;
          this.shell?.setStatus?.(`Đang mở bảng tính lớn… ${percent}%`);
        }
      });
      if (perfEnabled) window.__vnoPerfReport?.("buildSheetPayloadModel", performance.now() - parseStart);
      // Diagnostic only (set by the CDP test harness): rebuild the model with the retained
      // legacy parser and compare, so P2 equivalence is proven on real payloads.
      if (typeof window !== "undefined" && window.__vnoP2Verify === true) {
        try {
          const legacyWorkbook = await buildSheetPayloadModel(payload, this, supportXml, { legacy: true });
          const deepEqual = (a, b, path) => {
            if (a === b) return null;
            if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
              return Number.isNaN(a) && Number.isNaN(b) ? null : path;
            }
            if (Array.isArray(a) !== Array.isArray(b)) return path;
            const keysA = Object.keys(a), keysB = Object.keys(b);
            if (keysA.length !== keysB.length) return `${path}#keys`;
            for (const key of keysA) {
              if (!Object.prototype.hasOwnProperty.call(b, key)) return `${path}.${key}#missing`;
              const diff = deepEqual(a[key], b[key], `${path}.${key}`);
              if (diff) return diff;
            }
            return null;
          };
          const firstDiff = deepEqual(sheetPayloadToPlain(workbook), sheetPayloadToPlain(legacyWorkbook), "$");
          window.__vnoP2VerifyResult = { equal: firstDiff === null, firstDiff, sheets: workbook.sheets.length };
        } catch (error) {
          window.__vnoP2VerifyResult = { equal: false, error: String(error?.message || error) };
        }
      }
      if (!workbook.sheets.length) return false;
      return this._commitWorkbook(workbook, perfStart, "loadFromPayload");
    } finally {
      if (hadDefaultWidth) this._sheetPayloadImportDefaultColWidth = oldDefaultWidth;
      else delete this._sheetPayloadImportDefaultColWidth;
    }
  }

  _snapshotGridForOpen() {
    return new Map(Object.keys(this.grid || {}).map(key => [key, this.grid[key]]));
  }

  _restoreGridAfterFailedOpen(snapshot) {
    if (!this.grid || !snapshot) return;
    for (const key of Object.keys(this.grid)) {
      if (!snapshot.has(key)) delete this.grid[key];
    }
    for (const [key, value] of snapshot) this.grid[key] = value;
    try {
      this.grid._renderSheetTabs?.();
      if (this.grid.activeSheet) this.grid.switchSheet?.(this.grid.activeSheet, { skipSave: true });
      this.grid._refreshVisibleRuleVisuals?.();
      this.grid._refreshRowColLayoutView?.();
      this.grid.renderCharts?.();
      this.grid.renderImages?.();
      this.grid.renderTextBoxes?.();
      this.grid._applyProtectionUi?.({ renderTabs: true });
      this.grid.updateStatus?.();
    } catch {
      // The original model references are restored even if a secondary repaint fails.
    }
  }

  _commitWorkbook(workbook, perfStart, perfName) {
    const perfEnabled = typeof window !== "undefined" && window.__vnoPerfDebug === true;
    const gridSnapshot = this._snapshotGridForOpen();
    const previousExternalLinkCells = this.externalLinkCells;
    try {
      // Imported files retain the legacy layout fallback while explicit XLSX
      // dimensions are overlaid. S24's 20/64 defaults apply only to new books.
      this.grid.rowHeight = 26;
      this.grid.defaultColWidth = 100;
    const firstSheet = workbook.sheets[0];
    if (typeof this.grid.resetToBlank === "function") this.grid.resetToBlank(firstSheet);
    this.grid.calculationMode = workbook.calculationMode || "automatic";
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
    this.grid.conditionalFormattingBySheet = {};
    this.grid.dataValidationsBySheet = {};
    this.grid.pivotTablesBySheet = {};
    this.grid.chartsBySheet = {};
    this.grid.imagesBySheet = {};
    this.grid.imagesAtOpenBySheet = {};
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
    // Store tabColors on grid for fallback access in _renderSheetTabs
    this.grid.tabColors = workbook.tabColors || {};
    this.grid.scenariosBySheet = workbook.scenariosBySheet || {};
    this.grid.tablesBySheet = workbook.tablesBySheet || {};
    this.grid.textBoxesBySheet = {};
    const equivalentSheetValue = (mapping, sheetName) => {
      if (!mapping) return undefined;
      if (Object.prototype.hasOwnProperty.call(mapping, sheetName)) return mapping[sheetName];
      const key = String(sheetName).replace(/_x([0-9a-f]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/[\x00-\x20]+/g, " ").trim().toLowerCase();
      const found = Object.keys(mapping).find(name => String(name).replace(/_x([0-9a-f]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/[\x00-\x20]+/g, " ").trim().toLowerCase() === key);
      return found === undefined ? undefined : mapping[found];
    };
    for (const sheetName of workbook.sheets) {
      this.grid.tablesBySheet[sheetName] = workbook.tablesBySheet?.[sheetName] || [];
      this.grid.scenariosBySheet[sheetName] = workbook.scenariosBySheet?.[sheetName] || [];
      this.grid.conditionalFormattingBySheet[sheetName] = workbook.conditionalFormattingBySheet?.[sheetName] || [];
      this.grid.dataValidationsBySheet[sheetName] = workbook.dataValidationsBySheet?.[sheetName] || [];
      this.grid.pivotTablesBySheet[sheetName] = workbook.pivotTablesBySheet?.[sheetName] || [];
      this.grid.chartsBySheet[sheetName] = workbook.chartsBySheet?.[sheetName] || [];
      this.grid.imagesBySheet[sheetName] = workbook.imagesBySheet?.[sheetName] || [];
      this.grid.textBoxesBySheet[sheetName] = workbook.textBoxesBySheet?.[sheetName] || [];
      this.grid.imagesAtOpenBySheet[sheetName] = workbook.imagesAtOpenBySheet?.[sheetName] || 0;
      this.grid.rowHeightsBySheet[sheetName] = this._asLayoutMap(equivalentSheetValue(workbook.rowHeightsBySheet, sheetName), true);
      this.grid.colWidthsBySheet[sheetName] = this._asLayoutMap(workbook.colWidthsBySheet?.[sheetName], false);
      this.grid.autoRowsAtImportBySheet = this.grid.autoRowsAtImportBySheet || {};
      this.grid.autoRowsAtImportBySheet[sheetName] = workbook.autoRowsAtImportBySheet?.[sheetName] || new Map();
      this.grid.userHiddenRowsBySheet[sheetName] = this._asLayoutSet(workbook.userHiddenRowsBySheet?.[sheetName], true);
      this.grid.userHiddenColsBySheet[sheetName] = this._asLayoutSet(workbook.userHiddenColsBySheet?.[sheetName], false);
      this.grid.pageBreaksBySheet[sheetName] = workbook.pageBreaksBySheet?.[sheetName] || { rows: [], cols: [] };
      this.grid.protectionBySheet[sheetName] = workbook.protectionBySheet?.[sheetName] || { enabled: false, password: "" };
      this.grid.outlineGroupsBySheet[sheetName] = workbook.outlineGroupsBySheet?.[sheetName] || [];
      const freeze = equivalentSheetValue(workbook.freezePanesBySheet, sheetName) || { rows: 0, cols: 0 };
      if (!this.grid.sheetStates) this.grid.sheetStates = {};
      if (!this.grid.sheetStates[sheetName]) {
        this.grid.sheetStates[sheetName] = { hiddenRows: new Set(), activeFilters: new Map(), isFilterActive: false, isFrozenPanes: false, frozenRows: 0, frozenCols: 0, selectedCoord: { r: 1, c: "A" } };
      }
      this.grid.sheetStates[sheetName].frozenRows = freeze.rows;
      this.grid.sheetStates[sheetName].frozenCols = freeze.cols;
      this.grid.sheetStates[sheetName].isFrozenPanes = freeze.rows > 0 || freeze.cols > 0;
      // Tab color: restore from workbook.tabColors
      if (workbook.tabColors?.[sheetName]) {
        this.grid.sheetStates[sheetName].tabColor = workbook.tabColors[sheetName];
      }
      // AutoFilter: if the FODS had <table:database-range> for this sheet,
      // restore the filter state so it round-trips through serializeToFods.
      const autoFilterRef = workbook.autoFilterBySheet?.[sheetName];
      if (autoFilterRef) {
        this.grid.sheetStates[sheetName].isFilterActive = true;
        this.grid.sheetStates[sheetName].filterRange = autoFilterRef;
      }
    }
    // switchSheet bước 1 ghi trạng thái SỐNG của grid (isFilterActive=false lúc mới mở) đè lên sheetStates
    // của sheet đang active — đo vòng 8: sheet cuối của lan01/lan11 mất AutoFilter vì grid vừa tạo sheet đó.
    // Mọi trạng thái đã được nạp từ workbook ở trên nên bỏ qua bước lưu này (skipSave: true).
    this.grid.activeSheet = null;
    if (typeof this.grid.switchSheet === "function") this.grid.switchSheet(workbook.activeSheet, { skipSave: true });
    else this.grid.activeSheet = workbook.activeSheet;
    this.grid.renderTextBoxes?.();
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
    // LibreOffice recalculates add-in functions it does not have (e.g. the Vietnamese
    // VND() "amount in words" XLL) to #ADDIN?/#NAME? on import and drops the cached
    // text. When 3T Sheet implements the function, compute the value once on open.
    const engine = this.grid.formulaEngine;
    if (engine?.evaluate) {
      const openSheet = this.grid.activeSheet;
      for (const [sheetName, sheetData] of Object.entries(this.grid.sheetsData || {})) {
        for (const item of sheetData?.values?.() || []) {
          // Only functions LibreOffice lacks but 3T Sheet implements: a broad "#NAME?" rule
          // replaced Excel's cached #REF! with numbers (lan04.xlsx, 23 cells, 28/9).
          if (!item?.formula || item.externalLink || !/^#(ADDIN|NAME)\?$/.test(String(item.val))
            || !/(^|[^A-Z0-9_.])(_XLL\.)?VND\s*\(/i.test(item.formula)) continue;
          this.grid.activeSheet = sheetName;
          const value = engine.evaluate(item.formula);
          if (!(typeof value === "string" && /^#[A-Z/0!?]+[!?]?$/.test(value))) item.val = value;
        }
      }
      this.grid.activeSheet = openSheet;
    }
    // Excel opens such a workbook with a notice and shows the last saved values;
    // 3T Office is offline and never opens the other workbook itself.
    let externalLinkCells = 0;
    for (const sheetData of Object.values(this.grid.sheetsData || {})) {
      for (const item of sheetData?.values?.() || []) {
        if (item?.externalLink) externalLinkCells++;
      }
    }
    this.externalLinkCells = externalLinkCells;
    if (externalLinkCells > 0) {
      this.shell?.setStatus?.(`Tệp có ${externalLinkCells} ô liên kết tới sổ làm việc khác — đang hiển thị giá trị lưu lần cuối (không tự cập nhật).`);
      this.shell?.showNotification?.({
        message: `Tệp có ${externalLinkCells} ô liên kết tới sổ làm việc khác. 3T Office hiển thị giá trị lưu lần cuối và không tự cập nhật (ứng dụng chạy ngoại tuyến).`,
        type: "warning",
        action: {
          label: "Tìm hiểu thêm",
          ariaLabel: "Tìm hiểu thêm về liên kết ngoài",
          onClick: () => {
            globalCommandBus.execute("sheet.help.open", { entryId: "sheet.formula.externalLinks" });
          }
        },
        dismissible: true
      });
    } else {
      this.shell?.clearNotification?.();
    }

    this.grid._refreshVisibleRuleVisuals?.();
    this.grid._refreshRowColLayoutView?.();
    this.grid.refreshCharts?.();
    this.grid.renderCharts?.();
    this.grid.renderImages?.();
    this.grid._applyProtectionUi?.({ renderTabs: true });
    this.grid.updateStatus?.();
    if (perfEnabled) {
      const elapsed = performance.now() - perfStart;
      window.__vnoPerfReport?.(perfName, elapsed);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.__vnoPerfReport?.("first layout", performance.now() - perfStart);
      }));
    }
    return true;
    } catch (error) {
      this._restoreGridAfterFailedOpen(gridSnapshot);
      this.externalLinkCells = previousExternalLinkCells;
      throw error;
    }
  }

  /** Load the existing Save FODS serialization as a new, unsaved recovery copy. */
  restoreFromAutoRecover(fodsText, manifest = {}) {
    if (!this.loadFromFods(String(fodsText || ""))) return false;
    const originalTitle = String(manifest.title || "Bảng tính 1.xlsx").split(/[\\/]/).filter(Boolean).pop().replace(/\.[^/.]+$/, "") || "Bảng tính";
    this.sourceFilePath = "";
    this.sourceFileName = `${originalTitle} (đã khôi phục)`;
    this.isDirty = true;
    this.shell?.resetDocumentChrome?.(`${this.sourceFileName}.xlsx`, null, false);
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
    this.externalLinkCells = 0;
    this.sourceFileName = "BangTinh";
    this.sourceFilePath = "";
    this.isDirty = false;
    this.shell?.clearNotification?.();
    this.shell?.resetDocumentChrome?.("Bảng tính 1.xlsx", "home", false);
    return true;
  }

  async closeDocument() {
    if (this.shell?.requestCloseDocument) return await this.shell.requestCloseDocument();
    return await this.newDocument();
  }

  /**
   * Lưu bảng tính:
   * - Nếu bảng tính đã có đường dẫn gốc (sourceFilePath): Ctrl+S / Lưu lưu thẳng vào tệp đó,
   *   tôn trọng định dạng gốc (.xls/.xlsx/.ods/.csv) và thông báo nhẹ "Đã lưu" trên thanh trạng thái.
   * - Nếu bảng tính mới (chưa có đường dẫn): chuyển tiếp sang saveAs() để mở hộp thoại lưu tệp.
   */
  async save() {
    if (this._guardQuickViewReadOnly()) return false;
    if (!this.sourceFilePath) {
      return await this.saveAs();
    }

    const fodsContent = this.serializeToFods();
    const result = await globalUnoBridge.saveRealFileInPlace(
      "sheet",
      fodsContent,
      this.sourceFilePath,
      this.sourceFilePath
    );

    if (result.status === "ok") {
      this.isDirty = false;
      const savedPath = result.path || this.sourceFilePath;
      if (savedPath) {
        const savedFileName = savedPath.split(/[/\\]/).pop();
        if (savedFileName) {
          this.sourceFileName = savedFileName.replace(/\.[^/.]+$/, "");
          this.shell?.resetDocumentChrome?.(savedFileName, null, true, savedPath);
        }
      }
      this.shell?.setStatus?.("Đã lưu");
      return true;
    }

    if (result.status === "cancelled") return false;
    await showAlertDialog({
      title: "Không thể lưu bảng tính",
      message: result.message || "Lỗi không xác định khi lưu bảng tính.",
      type: "error"
    });
    return false;
  }

  /**
   * Lưu bản sao (F12 / Tệp → Lưu bản sao):
   * Luôn mở hộp thoại lưu native của hệ điều hành, cho phép chọn thư mục, đổi tên
   * hoặc chọn định dạng xuất (.xlsx, .xls, .ods, .csv).
   */
  async saveAs() {
    if (this._guardQuickViewReadOnly()) return false;
    const fodsContent = this.serializeToFods();
    const currentName = this.sourceFileName || "BangTinh";
    const suggestedName = this.sourceFilePath
      ? this.sourceFilePath.split(/[/\\]/).pop()
      : (this.shell?.documentName ? this.shell.documentName : (currentName !== "BangTinh" ? currentName : "BangTinh.xlsx"));

    const targetFormat = this.sourceFilePath ? (this.sourceFilePath.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || "xlsx") : "xlsx";

    const result = await globalUnoBridge.saveRealFile(
      "sheet",
      fodsContent,
      targetFormat,
      suggestedName,
      this.sourceFilePath || null
    );

    if (result.status === "ok") {
      const savedPath = result.path || result.fileName;
      // Như Excel: Lưu thành PDF chỉ xuất bản PDF; sổ đang mở giữ tên, định dạng và trạng thái chưa lưu.
      if (/\.pdf$/i.test(String(savedPath || ""))) {
        this.shell?.setStatus?.(`Đã xuất PDF: ${String(savedPath).split(/[/\\]/).pop()}`);
        return true;
      }
      this.isDirty = false;
      if (savedPath) {
        this.sourceFilePath = savedPath;
        const savedFileName = savedPath.split(/[/\\]/).pop();
        if (savedFileName) {
          this.sourceFileName = savedFileName.replace(/\.[^/.]+$/, "");
          this.shell?.resetDocumentChrome?.(savedFileName, null, true, savedPath);
        }
      }
      this.shell?.setStatus?.("Đã lưu");
      return true;
    }

    if (result.status === "cancelled") return false;
    await showAlertDialog({
      title: "Không thể lưu bảng tính",
      message: result.message || "Lỗi không xác định khi lưu bảng tính.",
      type: "error"
    });
    return false;
  }

  /**
   * Mở một tệp XLSX/ODS/CSV thật từ đĩa, nạp dữ liệu vào bảng tính.
   */
  async open() {
    if (typeof this.shell?.confirmUnsavedChangesBeforeReplace === "function"
      && !(await this.shell.confirmUnsavedChangesBeforeReplace())) return false;
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new Event("vno:document-open-progress"));
    }
    try {
      return await this._openWorkbookFromDisk();
    } finally {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new Event("vno:document-open-complete"));
      }
    }
  }

  async _openWorkbookFromDisk() {
    const reportOpenIssue = (type, message) => {
      try {
        const pending = globalUnoBridge.reportFrontendError({ type, message, stack: "" });
        pending?.catch?.(() => {});
      } catch {
        // Error reporting must never interrupt the local fallback.
      }
    };
    this.shell?.setStatus?.("Đang chuẩn bị mở bảng tính…");
    let removeQuickViewListener = () => {};
    try {
      let quickViewReady = null;
      if (typeof window !== "undefined" && window.__vnoSheetQuickViewController) {
        quickViewReady = new Promise(resolve => {
          const onReady = () => resolve(true);
          window.addEventListener("vno:sheet-quick-view-ready", onReady, { once: true });
          removeQuickViewListener = () => window.removeEventListener("vno:sheet-quick-view-ready", onReady);
        });
      }
      const opening = (async () => {
        try {
          return await globalUnoBridge.openRealFile("sheet");
        } catch {
        // A pywebview transfer can fail after Python has retained the FODS.
        // The latest session is process-local and exposes no filesystem path.
          reportOpenIssue("SheetOpenPayloadTransferError", "Sheet payload transfer failed; requesting the retained FODS fallback.");
          this.shell?.setStatus?.("Kết nối dữ liệu bị gián đoạn. Đang lấy bản dự phòng…");
          const fallback = await globalUnoBridge.getLatestSheetOpenFallback();
          if (fallback?.status !== "ok") throw new Error("Không thể nhận dữ liệu dự phòng của bảng tính.");
          return fallback;
        }
      })();
      const outcomes = [opening.then(result => ({ kind: "result", result }))];
      if (quickViewReady) outcomes.push(quickViewReady.then(() => ({ kind: "quick-view" })));
      const outcome = await Promise.race(outcomes);
      removeQuickViewListener();
      if (outcome.kind === "quick-view") {
        // The pywebview bridge keeps its request open until full import finishes.
        // Let the rendered quick view return control to WebView2, then apply the result.
        this._backgroundSheetOpen = opening
          .then(result => this._applyOpenedWorkbookResult(result, reportOpenIssue))
          .catch(error => {
            console.error("[SheetAdapter] Lỗi nạp nền bảng tính:", error);
            window.dispatchEvent(new Event("vno:sheet-full-model-failed"));
            this.shell?.setStatus?.("Không thể nạp đầy đủ bảng tính. Dữ liệu xem nhanh vẫn được giữ lại.");
            return false;
          });
        return true;
      }
      return await this._applyOpenedWorkbookResult(outcome.result, reportOpenIssue);
    } catch {
      removeQuickViewListener();
      reportOpenIssue("SheetOpenError", "Workbook opening failed before a full model could be loaded.");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("vno:sheet-full-model-failed"));
      this.shell?.setStatus?.("Không thể mở tệp. Sổ làm việc đang mở được giữ nguyên.");
      await showAlertDialog({
        title: "Không thể mở tệp",
        message: "Sheet không thể nạp bảng tính từ dữ liệu đã đọc hoặc bản dự phòng. Sổ làm việc đang mở được giữ nguyên.",
        type: "error"
      });
      return false;
    }
  }

  async _applyOpenedWorkbookResult(result, reportOpenIssue) {
    let previous = null;
    let openId = null;
    try {
      if (result?.status === "cancelled") return false;
      if (result?.status === "error") {
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("vno:sheet-full-model-failed"));
        await showAlertDialog({ title: "Không thể mở tệp", message: result.message, type: "error" });
        return false;
      }
      if (result?.status !== "ok") throw new Error("Phản hồi mở tệp không hợp lệ.");
      previous = {
        content: this.serializeToFods(),
        sourceFileName: this.sourceFileName,
        sourceFilePath: this.sourceFilePath,
        isDirty: this.isDirty
      };

      if (result.sheetPayload) {
        openId = result.openId || openId;
        try {
          this.shell?.setStatus?.("Đang dựng mô hình bảng tính và chuẩn bị lưới…");
          const loaded = await this.loadFromPayload(result.sheetPayload, result.ooxmlWorkbookXml);
          if (!loaded) throw new Error("Không dựng được sổ làm việc từ dữ liệu đã đọc.");
        } catch {
          reportOpenIssue("SheetOpenPayloadError", "Sheet payload parsing or model construction failed; using the retained FODS fallback.");
          this.shell?.setStatus?.("Đang tải dữ liệu bảng tính dự phòng…");
          const fallback = openId
            ? await globalUnoBridge.getSheetOpenFallback(openId)
            : await globalUnoBridge.getLatestSheetOpenFallback();
          if (fallback?.status !== "ok") throw new Error("Không lấy được bản dự phòng của bảng tính.");
          openId = fallback.openId || openId;
          const loaded = this.loadFromFods(
            fallback.content,
            fallback.ooxmlWorkbookXml || result.ooxmlWorkbookXml
          );
          if (!loaded) throw new Error("Không dựng được sổ làm việc từ bản dự phòng.");
          result = { ...result, ...fallback };
        }
      } else {
        this.shell?.setStatus?.("Đang đọc dữ liệu bảng tính và hiển thị lưới…");
        if (typeof result.content !== "string" || !this.loadFromFods(result.content, result.ooxmlWorkbookXml)) {
          throw new Error("Không thể đọc nội dung bảng tính.");
        }
      }

      this.sourceFileName = (result.fileName || "BangTinh").replace(/\.[^/.]+$/, "");
      this.sourceFilePath = result.sourcePath || "";
      this.isDirty = false;
      this.shell?.resetDocumentChrome?.(result.fileName || "Bảng tính 1.xlsx", null, true, result.sourcePath || "");
      const quickView = typeof window !== "undefined" ? window.__vnoSheetQuickViewController : null;
      quickView?.applyPendingEditsToGrid?.(this.grid);
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("vno:sheet-full-model-ready"));
      return true;
    } catch {
      try {
        if (previous?.content) this.loadFromFods(previous.content);
      } catch (restoreError) {
        console.error("[SheetAdapter] Không khôi phục được bảng tính sau khi mở tệp lỗi:", restoreError);
      }
      if (previous) {
        this.sourceFileName = previous.sourceFileName;
        this.sourceFilePath = previous.sourceFilePath;
        this.isDirty = previous.isDirty;
      }
      reportOpenIssue("SheetOpenError", "Workbook opening failed; the previously open workbook was preserved.");
      if (typeof window !== "undefined") window.__vnoSheetOpenStartedAt = null;
      this.shell?.setStatus?.("Không thể mở tệp. Sổ làm việc đang mở được giữ nguyên.");
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("vno:sheet-full-model-failed"));
      await showAlertDialog({
        title: "Không thể mở tệp",
        message: "Sheet không thể nạp bảng tính từ dữ liệu đã đọc hoặc bản dự phòng. Sổ làm việc đang mở được giữ nguyên.",
        type: "error"
      });
      return false;
    } finally {
      if (openId) {
        try { await globalUnoBridge.releaseSheetOpenFallback(openId); } catch { /* expires automatically */ }
      }
    }
  }

  async exportPdf() {
    const fodsContent = this.serializeToFods();
    const result = await globalUnoBridge.exportRealPdf(
      "sheet", fodsContent, this.sourceFileName, this.sourceFilePath || null,
    );
    if (result.status === "ok") {
      await showAlertDialog({ title: "Đã xuất PDF", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể xuất PDF", message: result.message, type: "error" });
    return false;
  }

  print() {
    if (this._guardQuickViewReadOnly()) return false;
    const grid = this.grid;
    const setup = grid?.getPageSetup?.(grid.activeSheet) || grid?.pageSetupBySheet?.[grid?.activeSheet] || {};
    const pages = grid?.computePrintPages?.(grid.activeSheet)?.pages || [];
    const selected = grid?.selectedCoord || grid?.selectionRange?.start || { r: 1, c: "A" };
    const selectedRow = Number(selected.r) || 1;
    const selectedCol = grid?._columnNumber?.(selected.c) || 1;
    const activePage = pages.findIndex((page) => page.rowNums?.includes(selectedRow) && page.colNums?.includes(selectedCol));
    const selectionRanges = (grid?._getSelectionRanges?.() || [grid?.selectionRange].filter(Boolean))
      .map((range) => grid?._normalizeRange?.(range) || range)
      .filter((range) => range?.start?.c && range?.start?.r && range?.end?.c && range?.end?.r)
      .map((range) => {
        const start = `${range.start.c}${range.start.r}`;
        const end = `${range.end.c}${range.end.r}`;
        return start === end ? start : `${start}:${end}`;
      });
    const pageSize = String(setup.size || "a4").toUpperCase();
    const orientation = setup.orientation === "landscape" ? "Ngang" : "Dọc";
    return withLazyFeatureProgress("sheet", "In và xem trước", () => import("../../../platform/print/print-dialog.js"))
      .then(({ openPrintDialog }) => openPrintDialog({
      appKind: "sheet",
      content: this.serializeToFods(),
      documentName: this.sourceFileName || "Bảng tính",
      sourcePath: this.sourceFilePath || null,
      pageSetupLabel: `${pageSize} · ${orientation}`,
      currentPage: activePage >= 0 ? activePage + 1 : 1,
      selectionRanges,
      engine: globalUnoBridge
    }));
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.grid) return false;
    const cmd = vnCmdId || (unoUrl ? getVnCommand(unoUrl) : null) || unoUrl;

    switch (cmd) {
      case "sheet.file.printPreview":
      case ".uno:PrintPreview":
        return this.print();

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
      case "sheet.cell.insertLineBreak":
        return this.grid.insertLineBreak ? this.grid.insertLineBreak() : false;

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
        const color = (typeof args === "string" && args) ? args : (args?.color || "#FFFF00");
        return this.grid.setStyle("backgroundColor", color);
      }

      case "sheet.cell.textColor": {
        const color = (typeof args === "string" && args) ? args : (args?.color || "#FF0000");
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

      case "sheet.insert.cells":
      case ".uno:InsertCell":
        return this.grid?.handleInsertShortcut ? this.grid.handleInsertShortcut() : false;

      case "sheet.sheet.insertBefore":
      case ".uno:Insert":
        return this.grid?.addSheetBefore ? Boolean(this.grid.addSheetBefore()) : false;

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

      case "sheet.sheet.hide":
        return this.grid.hideSheet ? this.grid.hideSheet(args?.sheetName) : false;

      case "sheet.sheet.unhide":
        return args?.sheetName ? this.grid.unhideSheet?.(args.sheetName) : this.grid.showUnhideSheetDialog?.();

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
        return this._refreshPivotTable();

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
        let url = args?.url;
        let text = args?.text;
        if (!url) {
          const currentVal = this.grid?.selectedCoord ? (this.grid.getCellValue?.(this.grid.selectedCoord) || "") : "";
          const existingLink = this.grid?.selectedCoord ? (this.grid.getCellData?.(this.grid.selectedCoord)?.hyperlink || "https://") : "https://";
          const result = await showHyperlinkDialog({
            url: existingLink !== "https://" ? existingLink : "https://",
            text: text || currentVal
          });
          if (!result || !result.url) return false;
          url = result.url;
          text = result.text;
        }
        return url ? this.grid.insertHyperlink(url, text) : false;
      }

      case "sheet.insert.symbol": {
        let ch = args?.char || args?.symbol;
        if (!ch) {
          ch = await showSymbolPicker();
        }
        return ch ? this.grid.insertSymbol(ch) : false;
      }

      case "sheet.insert.textbox": {
        const text = args?.text || await showPromptDialog({ title: "Chèn hộp văn bản", message: "Nhập nội dung hộp văn bản:", defaultValue: "", placeholder: "Nội dung" });
        return text ? this.grid.insertTextBox(text) : false;
      }

      case "sheet.insert.image":
        return await this._insertImageDialog(args || {});

      case "sheet-what-if-analysis":
        return this.grid.showGoalSeekDialog ? this.grid.showGoalSeekDialog() : false;

      case "sheet.view.freezePanesMenu":
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
        return await this._pasteIntoSelectedCell(false);

      case "common.edit.pastePlain":
        return await this._pasteIntoSelectedCell(true);

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
    if (isCut && this._guardQuickViewReadOnly()) return false;
    const payload = this._captureSelectedClipboard();
    if (!payload) return false;
    this._rememberClipboard(payload, isCut ? "cut" : "copy");
    try {
      if (globalUnoBridge.writeClipboardData) {
        await globalUnoBridge.writeClipboardData({ text: payload.text, html: payload.html });
      }
    } catch {}
    try {
      if (typeof navigator !== "undefined" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write && payload.html) {
        const item = new ClipboardItem({
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
          "text/html": new Blob([payload.html], { type: "text/html" })
        });
        await navigator.clipboard.write([item]);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
      }
    } catch {
      // Keyboard copy/cut uses ClipboardEvents; the app-local model still supports ribbon paste.
    }
    return true;
  }

  _captureSelectedClipboard() {
    const coord = this.grid.selectedCoord;
    if (!coord) return null;
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
    const clipboardHtml = serializeSheetRangeToClipboard(this.grid, range);
    return {
      range: structuredClone(range),
      cells,
      text: clipboardHtml.text,
      html: clipboardHtml.html,
      colWidths: structuredClone(clipboardHtml.model?.colWidths || []),
      mergedRanges: structuredClone(clipboardHtml.model?.mergedRanges || []),
      sourceSheet: this.grid.activeSheet
    };
  }

  _rememberClipboard(payload, mode = "copy") {
    this._clipboardModel = {
      range: structuredClone(payload.range),
      cells: structuredClone(payload.cells),
      colWidths: structuredClone(payload.colWidths || []),
      mergedRanges: structuredClone(payload.mergedRanges || []),
      sourceSheet: payload.sourceSheet || this.grid.activeSheet
    };
    this._clipboardText = String(payload.text ?? "");
    this._clipboardSourceSheet = payload.sourceSheet || this.grid.activeSheet;
    this.grid.setClipboardRange?.(payload.range, mode, this._clipboardSourceSheet);
  }

  _bindNativeClipboardEvents() {
    const container = this.grid?.container;
    if (!container?.addEventListener || this._nativeClipboardHandlers) return;
    const isGridClipboardTarget = event => !event.target?.closest?.("input,textarea,select,[contenteditable='true']");
    const copy = event => {
      if (!isGridClipboardTarget(event)) return;
      const payload = this._captureSelectedClipboard();
      if (!payload || !event.clipboardData) return;
      event.clipboardData.setData("text/plain", payload.text);
      if (payload.html) event.clipboardData.setData("text/html", payload.html);
      event.preventDefault();
      this._rememberClipboard(payload, "copy");
    };
    const cut = event => {
      if (!isGridClipboardTarget(event)) return;
      const payload = this._captureSelectedClipboard();
      if (!payload || !event.clipboardData) return;
      event.clipboardData.setData("text/plain", payload.text);
      if (payload.html) event.clipboardData.setData("text/html", payload.html);
      event.preventDefault();
      this._rememberClipboard(payload, "cut");
    };
    const paste = async event => {
      if (!isGridClipboardTarget(event)) return;
      const text = event.clipboardData?.getData("text/plain") || "";
      const html = event.clipboardData?.getData("text/html") || "";
      if (globalThis.window?.__vnoClipboardDiagnostics) console.info("__VNO_CLIPBOARD_DIAG__" + JSON.stringify({ phase: "sheet-paste-event", types: Array.from(event.clipboardData?.types || []), textLength: text.length, htmlLength: html.length, htmlHasStyle: /<style\b/i.test(html), htmlHasXNum: /x:num/i.test(html) }));
      if (!text && !html) return;
      if (event.clipboardData) event.preventDefault();
      const needsNativeHtml = !html || (/\b(?:xl\d+|Mso[a-z0-9_-]+)\b/i.test(html) && !/<style\b/i.test(html));
      const native = needsNativeHtml ? await this._readClipboardData() : null;
      let model = null;
      const nativeText = native?.status === "ok" ? (native.text || text) : text;
      const nativeHtml = native?.status === "ok" ? (native.html || html) : html;
      const isInternal = Boolean(
        this._clipboardModel?.cells?.length &&
        String(nativeText || "").replace(/\r\n/g, "\n").trim() === String(this._clipboardText || "").replace(/\r\n/g, "\n").trim()
      );
      if (isInternal) model = this._clipboardModel;
      if (nativeHtml) {
        model ||= parseOfficeHtmlTable(nativeHtml, nativeText);
      }
      if (!model) {
        model = this._clipboardModelFromText(nativeText, nativeHtml);
      }
      if (globalThis.window?.__vnoClipboardDiagnostics) console.info("__VNO_CLIPBOARD_DIAG__" + JSON.stringify({ phase: "sheet-paste-model", cells: (model?.cells || []).map(row => row.map(cell => ({ val: cell.val, style: cell.style }))) }));
      await this._pasteModelIntoGrid(model, nativeText, !!isInternal);
    };
    container.addEventListener("copy", copy);
    container.addEventListener("cut", cut);
    container.addEventListener("paste", paste);
    this._nativeClipboardHandlers = { container, copy, cut, paste };
  }

  _clipboardModelFromText(text, html = "") {
    if (html) {
      const model = parseOfficeHtmlTable(html, text);
      if (model) return model;
    }
    return parseOfficeTsv(text);
  }

  async _readClipboardData() {
    try {
      const native = await globalUnoBridge.readClipboardData?.();
      if (globalThis.window?.__vnoClipboardDiagnostics) console.info("__VNO_CLIPBOARD_DIAG__" + JSON.stringify({ phase: "clipboard-bridge-result", status: native?.status, textLength: native?.text?.length || 0, htmlLength: native?.html?.length || 0, htmlHasStyle: /<style\b/i.test(native?.html || ""), htmlHasXNum: /x:num/i.test(native?.html || ""), message: native?.message || "" }));
      if (native?.status === "ok") return native;
    } catch { /* Browser clipboard is the web-mode fallback. */ }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const types = item.types || [];
          const htmlType = types.find(type => type === "text/html");
          const textType = types.find(type => type === "text/plain");
          const html = htmlType ? await (await item.getType(htmlType)).text() : "";
          const text = textType ? await (await item.getType(textType)).text() : "";
          if (html || text) return { status: "ok", html, text };
        }
      }
      if (navigator.clipboard?.readText) {
        return { status: "ok", text: await navigator.clipboard.readText(), html: "" };
      }
    } catch { /* The command reports no-op when the browser denies clipboard access. */ }
    return null;
  }

  async _pasteTextIntoGrid(text, html = "") {
    const isInternal = String(text) === this._clipboardText && this._clipboardModel?.cells?.length;
    return this._pasteModelIntoGrid(
      isInternal ? this._clipboardModel : this._clipboardModelFromText(text, html),
      String(text),
      !!isInternal
    );
  }

  async _pasteModelIntoGrid(model, text, isInternal = false) {
    if (this._guardQuickViewReadOnly()) return false;
    if (!model?.cells?.length || !this.grid.selectedCoord || !this.grid.applyPasteSpecial) return false;
    if (globalThis.window?.__vnoClipboardDiagnostics) console.info("__VNO_CLIPBOARD_DIAG__" + JSON.stringify({ phase: "sheet-paste-destination", selectedCoord: this.grid.selectedCoord, isInternal, cellsBefore: [...this.grid.cellsData.entries()].filter(([coord]) => /^(A1|B2|C2|B3|C3)$/.test(coord)).map(([coord, cell]) => ({ coord, val: cell.val, style: cell.style })) }));
    const clipboardState = this.grid._clipboardRange;
    const moveRange = isInternal && clipboardState?.mode === "cut" &&
      clipboardState.sheet === this.grid.activeSheet && this._clipboardSourceSheet === this.grid.activeSheet
      ? clipboardState.range
      : null;
    const applied = this.grid.applyPasteSpecial(model, "all", this.grid.selectedCoord, {
      moveRange,
      sourceSheet: this._clipboardSourceSheet,
      coerceInput: !isInternal
    });
    if (globalThis.window?.__vnoClipboardDiagnostics) console.info("__VNO_CLIPBOARD_DIAG__" + JSON.stringify({ phase: "sheet-paste-applied", applied, cellsAfter: [...this.grid.cellsData.entries()].filter(([coord]) => /^(A1|B2|C2|B3|C3)$/.test(coord)).map(([coord, cell]) => ({ coord, val: cell.val, style: cell.style })) }));
    if (applied && moveRange) this.grid.clearClipboardRange?.();
    return applied;
  }

  async _openPasteSpecialFromClipboard() {
    if (this._guardQuickViewReadOnly()) return false;
    const native = await this._readClipboardData();
    let model = null;
    if (native?.status === "ok") {
      const sameInternal = String(native.text || "") === this._clipboardText && this._clipboardModel?.cells?.length;
      if (sameInternal) {
        model = this._clipboardModel;
      } else if (native.html) {
        model = parseOfficeHtmlTable(native.html, native.text || "");
      } else {
        model = this._clipboardModelFromText(native.text || "", native.html || "");
      }
    } else {
      model = this._clipboardModel;
    }
    if (!model?.cells?.length) {
      this.shell?.setStatus?.("Bộ nhớ tạm chưa có dữ liệu bảng để dán đặc biệt.");
      return false;
    }
    this._clipboardSourceSheet = model.sourceSheet || this._clipboardSourceSheet;
    return this.grid.showPasteSpecialDialog?.(model) ?? false;
  }

  async _applyPasteSpecialMode(mode) {
    if (this._guardQuickViewReadOnly()) return false;
    const native = await this._readClipboardData();
    let model = null;
    if (native?.status === "ok") {
      const sameInternal = String(native.text || "") === this._clipboardText && this._clipboardModel?.cells?.length;
      if (sameInternal) {
        model = this._clipboardModel;
      } else if (native.html) {
        model = parseOfficeHtmlTable(native.html, native.text || "");
      } else {
        model = this._clipboardModelFromText(native.text || "", native.html || "");
      }
    } else {
      model = this._clipboardModel;
    }
    if (!model?.cells?.length) {
      this.shell?.setStatus?.("Bộ nhớ tạm chưa có dữ liệu bảng để dán đặc biệt.");
      return false;
    }
    const coord = this.grid?.selectedCoord;
    if (!coord) return false;
    const cut = !!model.sourceSheet && model.sourceSheet === this.grid.activeSheet &&
      this.grid._clipboardRange?.mode === "cut" && this.grid._clipboardRange.sheet === this.grid.activeSheet;
    const applied = this.grid.applyPasteSpecial(model, mode, coord, {
      moveRange: cut ? this.grid._clipboardRange.range : null,
      sourceSheet: model.sourceSheet
    });
    if (applied && cut) this.grid.clearClipboardRange();
    return applied;
  }

  /**
   * Dán nội dung Clipboard thật vào ô đang chọn.

   * @param {boolean} plainTextOnly Nếu true thì chỉ dán giá trị thuần, không nhận diện định dạng hay HTML
   */
  async _pasteIntoSelectedCell(plainTextOnly = false) {
    if (this._guardQuickViewReadOnly()) return false;
    const coord = this.grid.selectedCoord;
    if (!coord || !this.grid.setCellValue) return false;
    const native = await this._readClipboardData();
    if (plainTextOnly) {
      const text = native?.status === "ok" ? (native.text || "") : (this._clipboardText || "");
      if (!text) return false;
      const model = parseOfficeTsv(text);
      if (model?.cells) {
        model.cells.forEach(row => row.forEach(cell => { cell.style = {}; }));
      }
      return this.grid.applyPasteSpecial(model, "values", coord, { coerceInput: true });
    }
    const isInternal = Boolean(
      this._clipboardModel?.cells?.length && (
        !native || native.status !== "ok" || String(native.text || "").replace(/\r\n/g, "\n").trim() === String(this._clipboardText || "").replace(/\r\n/g, "\n").trim()
      )
    );
    if (isInternal) return this._pasteModelIntoGrid(this._clipboardModel, this._clipboardText, true);
    if (native?.status === "ok" && native.html) {
      const model = parseOfficeHtmlTable(native.html, native.text || "");
      if (model) return this._pasteModelIntoGrid(model, native.text || "", isInternal);
    }
    if (native?.status === "ok" && native.text) return this._pasteTextIntoGrid(native.text, native.html || "");
    if (this._clipboardModel?.cells?.length) return this._pasteModelIntoGrid(this._clipboardModel, this._clipboardText, true);
    if (native?.status === "ok") return this._pasteTextIntoGrid(native.text || "", native.html || "");
    return false;
  }
}
