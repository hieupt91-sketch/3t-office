/**
 * VN Office LibreOffice Adapter — VN Sheet Adapter
 * Quản lý tương tác với StarCalc (sc) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog, showPromptDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { getVnCommand } from "../common/command-dispatch-mapper.js";

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
    globalCommandBus.bindHandler("common.edit.repeat", () => this.grid.redo ? this.grid.redo() : false);
    globalCommandBus.bindHandler("common.edit.copy", () => this._copySelectedCell(false));
    globalCommandBus.bindHandler("common.edit.cut", () => this._copySelectedCell(true));
    globalCommandBus.bindHandler("common.edit.paste", () => this._pasteIntoSelectedCell());
    globalCommandBus.bindHandler("common.edit.pastePlain", () => this._pasteIntoSelectedCell());
    globalCommandBus.bindHandler("common.edit.selectAll", () => this.grid.selectAll ? this.grid.selectAll() : false);
    globalCommandBus.bindHandler("sheet.select.column", () => this.grid.selectCurrentColumn ? this.grid.selectCurrentColumn() : false);
    globalCommandBus.bindHandler("sheet.select.row", () => this.grid.selectCurrentRow ? this.grid.selectCurrentRow() : false);
    globalCommandBus.bindHandler("sheet.insert.time", () => this.grid.insertCurrentTime ? this.grid.insertCurrentTime() : false);
    globalCommandBus.bindHandler("sheet.formula.recalculate", () => this.grid.recalculateAll ? this.grid.recalculateAll() : false);
    globalCommandBus.bindHandler("sheet.view.toggleFormulas", () => this.grid.toggleShowFormulas ? this.grid.toggleShowFormulas() : false);
    globalCommandBus.bindHandler("sheet.format.cellsDialog", () => this.grid.showFormatCellsDialog());
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
    globalCommandBus.bindHandler("sheet.cell.indentIncrease", () => this.grid.adjustIndent(1));
    globalCommandBus.bindHandler("sheet.cell.indentDecrease", () => this.grid.adjustIndent(-1));
    globalCommandBus.bindHandler("sheet.format.quickCategory", (value) => this.grid.applyQuickNumberCategory(value));
    globalCommandBus.bindHandler("sheet.format.increaseDecimal", () => this.grid.adjustDecimalPlaces(1));
    globalCommandBus.bindHandler("sheet.format.decreaseDecimal", () => this.grid.adjustDecimalPlaces(-1));
    globalCommandBus.bindHandler("sheet.format.conditional", () => this.grid.showConditionalFormattingDialog());
    globalCommandBus.bindHandler("sheet.data.validation", () => this.grid.showDataValidationDialog());
    globalCommandBus.bindHandler("sheet.data.textToColumns", () => this.grid.showTextToColumnsDialog());
    globalCommandBus.bindHandler("sheet.data.flashFill", () => this.grid.runFlashFill());
    globalCommandBus.bindHandler("sheet.data.removeDuplicates", () => this.grid.showRemoveDuplicatesDialog());
    globalCommandBus.bindHandler("sheet.data.group", () => this.grid.groupSelection());
    globalCommandBus.bindHandler("sheet.data.ungroup", () => this.grid.ungroupSelection());
    globalCommandBus.bindHandler("sheet.data.subtotal", () => this.grid.showSubtotalDialog());
    globalCommandBus.bindHandler("sheet.data.pivotTable", () => this.grid.showPivotTableDialog());
    globalCommandBus.bindHandler("sheet.data.pivotRefresh", () => this.grid.refreshPivotTable());
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
    globalCommandBus.bindHandler("sheet.calc.calculationOptions", (args) => this.grid.setCalculationMode ? this.grid.setCalculationMode(args) : false);
    globalCommandBus.bindHandler("sheet.calc.modeAutomatic", () => this.grid.setCalculationMode ? this.grid.setCalculationMode("automatic") : false);
    globalCommandBus.bindHandler("sheet.calc.modeManual", () => this.grid.setCalculationMode ? this.grid.setCalculationMode("manual") : false);
    globalCommandBus.bindHandler("sheet.calc.calculateSheet", () => this.grid.calculateSheet ? this.grid.calculateSheet() : false);
    globalCommandBus.bindHandler("sheet.formula.arrayEnter", (options) => {
      options = options || {};
      return this.grid.enterArrayFormula(options);
    });
    globalCommandBus.bindHandler("sheet.review.commentInsert", (args) => {
      args = args || {};
      return this.grid.showCommentDialog(args);
    });
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
    globalCommandBus.bindHandler("common.edit.find", () => {
      return this.grid.showFindDialog ? this.grid.showFindDialog() : false;
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

  _columnNumber(columnName) {
    return String(columnName || "").split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
  }

  _columnName(columnNumber) {
    let result = "";
    for (let n = columnNumber; n > 0; n = Math.floor((n - 1) / 26)) {
      result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
    }
    return result;
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

  /** Serialize the complete workbook as Flat OpenDocument Spreadsheet XML. */
  serializeToFods() {
    if (!this.grid) return "";
    const sheetNames = (this.grid.sheets && this.grid.sheets.length)
      ? [...this.grid.sheets]
      : Object.keys(this.grid.sheetsData || {});
    if (sheetNames.length === 0) sheetNames.push(this.grid.activeSheet || "Trang tính 1");

    const numberFormats = this._collectNumberFormats(sheetNames);
    const tablesXml = sheetNames.map(sheetName => {
      const cells = this.grid.sheetsData?.[sheetName]
        || (sheetName === this.grid.activeSheet ? this.grid.cellsData : null)
        || new Map();
      const comments = this.grid.commentsBySheet?.[sheetName] || {};
      let maxRow = 0;
      const rows = new Map();
      for (const [coordinate, item] of cells.entries()) {
        const match = String(coordinate).match(/^([A-Z]+)(\d+)$/);
        if (!match || !item || ((item.val === "" || item.val === undefined || item.val === null) && !item.formula)) continue;
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

      let rowsXml = "";
      for (let rowNumber = 1; rowNumber <= Math.max(1, maxRow); rowNumber++) {
        const rowCells = rows.get(rowNumber) || new Map();
        const usedColumns = [...rowCells.keys()].sort((a, b) => a - b);
        let cellsXml = "";
        let previousColumn = 0;
        for (const columnNumber of usedColumns) {
          const gap = columnNumber - previousColumn - 1;
          if (gap === 1) cellsXml += "<table:table-cell/>";
          else if (gap > 1) cellsXml += `<table:table-cell table:number-columns-repeated="${gap}"/>`;

          const item = rowCells.get(columnNumber);
          const coordinate = `${this._columnName(columnNumber)}${rowNumber}`;
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
          const cellAttrs = `${formulaAttrs}${matrixAttrs}${numFmtAttr}${formatStyle ? ` table:style-name="${formatStyle.cellStyle}"` : ""}`;
          const comment = comments[coordinate];
          const annotationXml = comment ? `<office:annotation><dc:creator>${this._escapeXml(comment.author || "")}</dc:creator>${comment.timestamp ? `<dc:date>${this._escapeXml(comment.timestamp)}</dc:date>` : ""}<text:p>${this._escapeXml(comment.text || "")}</text:p></office:annotation>` : "";
          if (typeof item.val === "number" && Number.isFinite(item.val)) {
            cellsXml += `<table:table-cell office:value-type="float" office:value="${item.val}"${cellAttrs}>${annotationXml}<text:p>${this._escapeXml(item.val)}</text:p></table:table-cell>`;
          } else {
            const text = item.val === undefined || item.val === null ? "" : String(item.val);
            cellsXml += `<table:table-cell office:value-type="string" office:string-value="${this._escapeXml(text)}"${cellAttrs}>${annotationXml}<text:p>${this._escapeXml(text)}</text:p></table:table-cell>`;
          }
          previousColumn = columnNumber;
        }
        rowsXml += `<table:table-row>${cellsXml || "<table:table-cell/>"}</table:table-row>`;
      }
      const localNames = (this.grid.namedRangesBySheet?.[sheetName] || []).map(range => this._namedRangeXml(range, sheetName)).join("");
      const printRange = this._printRangeAddress(sheetName, this.grid.printAreaBySheet?.[sheetName]);
      const printRangeAttr = printRange ? ` table:print-ranges="${this._escapeXml(printRange)}"` : "";
      return `<table:table table:name="${this._escapeXml(sheetName)}"${printRangeAttr}>${rowsXml}${localNames ? `<table:named-expressions>${localNames}</table:named-expressions>` : ""}</table:table>`;
    }).join("");

    const activeSheet = sheetNames.includes(this.grid.activeSheet) ? this.grid.activeSheet : sheetNames[0];
    const tableViewsXml = sheetNames.map(sheetName => `<config:config-item-map-entry config:name="${this._escapeXml(sheetName)}">
          <config:config-item config:name="CursorPositionX" config:type="int">0</config:config-item>
          <config:config-item config:name="CursorPositionY" config:type="int">0</config:config-item>
        </config:config-item-map-entry>`).join("");
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
                 xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:automatic-styles>${[...numberFormats.values()].map(format => `${this._numberFormatXml(format.config, format.dataStyle)}<style:style style:name="${format.cellStyle}" style:family="table-cell" style:data-style-name="${format.dataStyle}"/>`).join("")}</office:automatic-styles>
  <office:settings>
    <config:config-item-set config:name="ooo:view-settings">
      <config:config-item-map-indexed config:name="Views"><config:config-item-map-entry>
        <config:config-item config:name="ViewId" config:type="string">view1</config:config-item>
        <config:config-item-map-named config:name="Tables">${tableViewsXml}</config:config-item-map-named>
        <config:config-item config:name="ActiveTable" config:type="string">${this._escapeXml(activeSheet)}</config:config-item>
      </config:config-item-map-entry></config:config-item-map-indexed>
    </config:config-item-set>
  </office:settings>
  <office:body><office:spreadsheet>${tablesXml}${this.grid.namedRangesWorkbook?.length ? `<table:named-expressions>${this.grid.namedRangesWorkbook.map(range => this._namedRangeXml(range, range.sheet || activeSheet)).join("")}</table:named-expressions>` : ""}</office:spreadsheet></office:body>
</office:document>`;
  }

  _cellFromFodsAttributes(attributes, text, numberStyles = new Map()) {
    const get = name => attributes[name] ?? "";
    const valueType = get("office:value-type");
    let value = text;
    if (["float", "percentage", "currency"].includes(valueType)) {
      const numericValue = Number(get("office:value"));
      value = Number.isFinite(numericValue) ? numericValue : text;
    } else if (valueType === "boolean") {
      value = get("office:boolean-value") === "true";
    } else if (get("office:string-value")) {
      value = get("office:string-value");
    }
    const formula = get("vno:formula") || this._formulaFromOdf(get("table:formula"));
    const style = {};
    const numFmtAttr = get("vno:number-format");
    const standardFormat = numberStyles.get(get("table:style-name"));
    const numericTypes = new Set(["float", "percentage", "currency", "date", "time"]);
    if (standardFormat && (numericTypes.has(valueType) || !valueType)) {
      style.numberFormat = { ...standardFormat };
    } else if (numFmtAttr) {
      try {
        style.numberFormat = JSON.parse(numFmtAttr);
      } catch (e) {
        // ignore parse error
      }
    } else if (valueType === "percentage") {
      style.numberFormat = { category: "percentage", decimals: 2 };
    } else if (valueType === "currency") {
      style.numberFormat = { category: "currency", currencySymbol: "₫", decimals: 0, useThousands: true };
    }
    return { val: value, formula, style };
  }

  _parseCellStyleColors(xmlText) {
    const colors = new Map();
    String(xmlText || "").replace(/<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi, (_, attrs, body) => {
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

  /** Parse FODS into every worksheet, including repeated rows/cells emitted by LibreOffice. */
  parseFods(xmlText) {
    const workbook = { sheets: [], sheetsData: {}, activeSheet: "", commentsBySheet: {}, namedRangesWorkbook: [], namedRangesBySheet: {}, printAreaBySheet: {}, validationHits: [] };
    if (!xmlText) return workbook;
    const numberStyles = this._parseNumberStyles(xmlText);
    const tableBlocks = [];
    xmlText.replace(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/gi, all => { tableBlocks.push(all); return all; });
    const workbookOnlyXml = tableBlocks.reduce((text, block) => text.replace(block, ""), xmlText);
    let workbookNameIndex = 0;
    workbookOnlyXml.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
      const range = this._parseNamedRangeElement(attrs, "workbook", "", ++workbookNameIndex);
      if (range) workbook.namedRangesWorkbook.push(range);
      return "";
    });

    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (!doc.querySelector("parsererror")) {
        const configItems = Array.from(doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:config:1.0", "config-item"));
        workbook.activeSheet = configItems.find(item => item.getAttribute("config:name") === "ActiveTable")?.textContent || "";
        const tables = Array.from(doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:table:1.0", "table"));
        tables.forEach((table, tableIndex) => {
          const name = table.getAttribute("table:name") || `Trang tính ${tableIndex + 1}`;
          const printArea = this._parsePrintRangeAddress(table.getAttribute("table:print-ranges"));
          const data = new Map();
          const comments = {};
          const localRanges = [];
          const arrayFormulas = [];
          let localNameIndex = 0;
          table.outerHTML.replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
            const range = this._parseNamedRangeElement(attrs, "sheet", name, ++localNameIndex);
            if (range) localRanges.push(range);
            return "";
          });
          const columnStyles = [];
          Array.from(table.children).filter(element => element.localName === "table-column").forEach(column => {
            const repeat = Math.max(1, Number(column.getAttribute("table:number-columns-repeated")) || 1);
            for (let index = 0; index < repeat; index++) columnStyles.push(column.getAttribute("table:default-cell-style-name") || "");
          });
          let rowNumber = 1;
          const rowElements = Array.from(table.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:table:1.0", "table-row"));
          rowElements.forEach(row => {
            const rowRepeat = Math.max(1, Number(row.getAttribute("table:number-rows-repeated")) || 1);
            for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
              let columnNumber = 1;
              Array.from(row.children).filter(cell => ["table-cell", "covered-table-cell"].includes(cell.localName)).forEach(cell => {
                const columnRepeat = Math.max(1, Number(cell.getAttribute("table:number-columns-repeated")) || 1);
                const attributes = Object.fromEntries(Array.from(cell.attributes).map(attr => [attr.name, attr.value]));
                if (!attributes["table:style-name"] && columnStyles[columnNumber - 1]) attributes["table:style-name"] = columnStyles[columnNumber - 1];
                const annotation = Array.from(cell.children).find(child => child.localName === "annotation");
                const paragraphs = Array.from(cell.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:text:1.0", "p")).filter(paragraph => !annotation?.contains(paragraph));
                const text = paragraphs.map(paragraph => paragraph.textContent || "").join("\n");
                const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"] || text !== "" || annotation;
                if (hasValue) {
                  const item = this._cellFromFodsAttributes(attributes, text, numberStyles);
                  const matrixColumns = Math.max(1, Number(attributes["table:number-matrix-columns-spanned"]) || 1);
                  const matrixRows = Math.max(1, Number(attributes["table:number-matrix-rows-spanned"]) || 1);
                  if ((attributes["table:number-matrix-columns-spanned"] || attributes["table:number-matrix-rows-spanned"]) && item.formula) {
                    arrayFormulas.push({ column: columnNumber, row: rowNumber, columns: matrixColumns, rows: matrixRows, formula: item.formula });
                  }
                  for (let repeat = 0; repeat < columnRepeat; repeat++) {
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
                columnNumber += columnRepeat;
              });
              rowNumber++;
            }
          });
          arrayFormulas.forEach(region => this._restoreArrayFormula(data, region.column, region.row, region.columns, region.rows, region.formula));
          workbook.sheets.push(name);
          workbook.sheetsData[name] = data;
          workbook.commentsBySheet[name] = comments;
          workbook.namedRangesBySheet[name] = localRanges;
          workbook.printAreaBySheet[name] = printArea;
        });
      }
    }

    if (workbook.sheets.length === 0) {
      const activeMatch = xmlText.match(/<config:config-item[^>]*config:name=["']ActiveTable["'][^>]*>([\s\S]*?)<\/config:config-item>/i);
      workbook.activeSheet = activeMatch ? this._unescapeXml(activeMatch[1].replace(/<[^>]+>/g, "")) : "";
      const tableRegex = /<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/gi;
      let tableMatch;
      let tableIndex = 0;
      while ((tableMatch = tableRegex.exec(xmlText)) !== null) {
        tableIndex++;
        const nameMatch = tableMatch[1].match(/table:name=["']([^"']*)["']/i);
        const name = this._unescapeXml(nameMatch?.[1] || `Trang tính ${tableIndex}`);
        const printRangeMatch = tableMatch[1].match(/table:print-ranges=["']([^"']*)["']/i);
        const printArea = this._parsePrintRangeAddress(this._unescapeXml(printRangeMatch?.[1] || ""));
        const data = new Map();
        const comments = {};
        const localRanges = [];
        const arrayFormulas = [];
        let localNameIndex = 0;
        tableMatch[2].replace(/<table:named-range\b([^>]*)\/?\s*>/gi, (_, attrs) => {
          const range = this._parseNamedRangeElement(attrs, "sheet", name, ++localNameIndex);
          if (range) localRanges.push(range);
          return "";
        });
        const columnStyles = [];
        tableMatch[2].replace(/<table:table-column\b([^>]*)\/?\s*>/gi, (_, attrs) => {
          const repeat = Math.max(1, Number(attrs.match(/table:number-columns-repeated=["'](\d+)["']/i)?.[1]) || 1);
          const styleName = this._unescapeXml(attrs.match(/table:default-cell-style-name=["']([^"']*)["']/i)?.[1] || "");
          for (let index = 0; index < repeat; index++) columnStyles.push(styleName);
          return "";
        });
        let rowNumber = 1;
        const rowRegex = /<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableMatch[2])) !== null) {
          const rowRepeat = Math.max(1, Number(rowMatch[1].match(/table:number-rows-repeated=["'](\d+)["']/i)?.[1]) || 1);
          for (let repeatedRow = 0; repeatedRow < rowRepeat; repeatedRow++) {
            let columnNumber = 1;
            const cellRegex = /<(?:table:)?(?:table-cell|covered-table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:table:)?(?:table-cell|covered-table-cell)>)/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowMatch[2] || "")) !== null) {
              const attributes = {};
              cellMatch[1].replace(/([\w:-]+)=["']([^"']*)["']/g, (_, key, value) => { attributes[key] = this._unescapeXml(value); return ""; });
              const columnRepeat = Math.max(1, Number(attributes["table:number-columns-repeated"]) || 1);
              if (!attributes["table:style-name"] && columnStyles[columnNumber - 1]) attributes["table:style-name"] = columnStyles[columnNumber - 1];
              const content = String(cellMatch[2] || "");
              const annotationMatch = content.match(/<office:annotation\b([^>]*)>([\s\S]*?)<\/office:annotation>/i);
              const valueContent = annotationMatch ? content.replace(annotationMatch[0], "") : content;
              const paragraphs = [];
              valueContent.replace(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi, (_, value) => { paragraphs.push(this._unescapeXml(value.replace(/<[^>]+>/g, ""))); return ""; });
              const text = paragraphs.join("\n");
              const hasValue = attributes["office:value-type"] || attributes["table:formula"] || attributes["vno:formula"] || text !== "" || annotationMatch;
              if (hasValue) {
                const item = this._cellFromFodsAttributes(attributes, text, numberStyles);
                const matrixColumns = Math.max(1, Number(attributes["table:number-matrix-columns-spanned"]) || 1);
                const matrixRows = Math.max(1, Number(attributes["table:number-matrix-rows-spanned"]) || 1);
                if ((attributes["table:number-matrix-columns-spanned"] || attributes["table:number-matrix-rows-spanned"]) && item.formula) {
                  arrayFormulas.push({ column: columnNumber, row: rowNumber, columns: matrixColumns, rows: matrixRows, formula: item.formula });
                }
                for (let repeat = 0; repeat < columnRepeat; repeat++) {
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
              columnNumber += columnRepeat;
            }
            rowNumber++;
          }
        }
        arrayFormulas.forEach(region => this._restoreArrayFormula(data, region.column, region.row, region.columns, region.rows, region.formula));
        workbook.sheets.push(name);
        workbook.sheetsData[name] = data;
        workbook.commentsBySheet[name] = comments;
        workbook.namedRangesBySheet[name] = localRanges;
        workbook.printAreaBySheet[name] = printArea;
      }
    }
    if (!workbook.sheets.includes(workbook.activeSheet)) workbook.activeSheet = workbook.sheets[0] || "";
    this._attachImportedRules(workbook, xmlText);
    return workbook;
  }

  loadFromFods(fodsText) {
    if (!this.grid) return false;
    const workbook = this.parseFods(fodsText);
    if (workbook.sheets.length === 0) return false;
    const firstSheet = workbook.sheets[0];
    if (typeof this.grid.resetToBlank === "function") this.grid.resetToBlank(firstSheet);
    this.grid.sheets = [firstSheet];
    this.grid.sheetsData = { [firstSheet]: workbook.sheetsData[firstSheet] };
    this.grid.commentsBySheet = { [firstSheet]: workbook.commentsBySheet[firstSheet] || {} };
    this.grid.namedRangesWorkbook = workbook.namedRangesWorkbook || [];
    this.grid.namedRangesBySheet = { [firstSheet]: workbook.namedRangesBySheet[firstSheet] || [] };
    this.grid.printAreaBySheet = { [firstSheet]: workbook.printAreaBySheet[firstSheet] || null };
    for (const sheetName of workbook.sheets.slice(1)) {
      if (typeof this.grid.addSheet === "function") this.grid.addSheet(sheetName, false);
      else this.grid.sheets.push(sheetName);
      this.grid.sheetsData[sheetName] = workbook.sheetsData[sheetName];
      this.grid.commentsBySheet[sheetName] = workbook.commentsBySheet[sheetName] || {};
      this.grid.namedRangesBySheet[sheetName] = workbook.namedRangesBySheet[sheetName] || [];
      this.grid.printAreaBySheet[sheetName] = workbook.printAreaBySheet[sheetName] || null;
    }
    if (typeof this.grid.switchSheet === "function") this.grid.switchSheet(workbook.activeSheet);
    else this.grid.activeSheet = workbook.activeSheet;
    this.grid.conditionalFormattingBySheet = {};
    this.grid.dataValidationsBySheet = {};
    for (const sheetName of workbook.sheets) {
      this.grid.conditionalFormattingBySheet[sheetName] = workbook.conditionalFormattingBySheet?.[sheetName] || [];
      this.grid.dataValidationsBySheet[sheetName] = workbook.dataValidationsBySheet?.[sheetName] || [];
    }
    this.grid.undoStack = [];
    this.grid.redoStack = [];
    this.grid._refreshVisibleRuleVisuals?.();
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
    const fodsContent = this.serializeToFods();
    const result = await globalUnoBridge.saveRealFile("sheet", fodsContent, "xlsx", this.sourceFileName);
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
      this.loadFromFods(result.content);
      this.sourceFileName = (result.fileName || "BangTinh").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
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
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
    return true;
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.grid) return false;
    const cmd = vnCmdId || (unoUrl ? getVnCommand(unoUrl) : null) || unoUrl;

    switch (cmd) {
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

      case "sheet.cell.indentIncrease":
        return this.grid.adjustIndent(1);

      case "sheet.cell.indentDecrease":
        return this.grid.adjustIndent(-1);

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

      case "sheet.format.cellsDialog":
        return this.grid.showFormatCellsDialog();

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
      case "sheet.data.group": return this.grid.groupSelection();
      case "sheet.data.ungroup": return this.grid.ungroupSelection();
      case "sheet.data.subtotal": return this.grid.showSubtotalDialog();

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
        return this.grid.showFindDialog ? this.grid.showFindDialog() : false;

      case "sheet.chart.insert":
        this.grid.openChartBuilder();
        return true;

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

    this._clipboardText = String(text);
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
