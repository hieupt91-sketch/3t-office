/**
 * VN Office LibreOffice Adapter — VN Writer Adapter
 * Quản lý tương tác với StarWriter (sw) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showPromptDialog, showFindReplaceDialog, showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { parseCsv, replaceMergeFields, showMailMergeDataSourceDialog, showInsertMergeFieldDialog } from "../../../apps/writer/mail-merge.js";
import { STYLE_PRESETS, showStyleGalleryDropdown, closeStyleGalleryDropdown, createStyleGalleryStrip } from "../../../apps/writer/style-gallery.js";
import { showWatermarkDialog, showPageBorderDialog } from "../../../apps/writer/page-decorations.js";
import { showColumnsDialog } from "../../../apps/writer/columns-dialog.js";
import { showShapeDialog, renderShapeSvg, showDiagramDialog, generateDiagramHtml, showChartDialog, generateChartHtml } from "../../../apps/writer/writer-illustrations.js";
import { DOCUMENT_THEMES, showThemeGalleryDialog } from "../../../apps/writer/theme-gallery.js";
import { showSymbolPicker } from "../../../platform/ui-kit/symbol-picker.js";
import { formatDateTime, showDateTimeDialog } from "../../../platform/ui-kit/datetime-picker.js";
import { showEquationDialog, showBookmarkDialog, showCrossReferenceDialog, slugBookmarkName } from "../../../apps/writer/insert-dialogs.js";
import { t } from "../../../platform/i18n/i18n.js";

// Kích thước khổ giấy chuẩn (mm, khổ dọc — hoán đổi W/H khi ngang)
const PAGE_SIZES_MM = {
  a4: { label: "A4 (210 × 297 mm)", w: 210, h: 297 },
  letter: { label: "Letter (216 × 279 mm)", w: 216, h: 279 },
  legal: { label: "Legal (216 × 356 mm)", w: 216, h: 356 }
};

// Lề mặc định theo Nghị định 30/2020/NĐ-CP: Trên 20mm, Dưới 20mm, Trái 30mm, Phải 15mm
const DEFAULT_MARGINS_MM = { top: 20, bottom: 20, left: 30, right: 15 };
const MM_TO_PX = 3.7795275591; // 96dpi

/**
 * Chuyển đổi số nguyên dương sang chữ số La Mã (dành cho Endnotes chuẩn Word)
 * @param {number} num
 * @returns {string}
 */
export function toRoman(num) {
  const romanMap = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
    [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]
  ];
  let res = "";
  let n = Math.max(1, parseInt(num, 10) || 1);
  for (const [val, roman] of romanMap) {
    while (n >= val) {
      res += roman;
      n -= val;
    }
  }
  return res || "i";
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

export class WriterAdapter {
  constructor(editorDom) {
    this.editorDom = editorDom;
    this.documentContent = "";
    this.isDirty = false;
    this.sourceFileName = "TaiLieu";
    this.pageSetup = {
      size: "a4",
      orientation: "portrait",
      margins: { ...DEFAULT_MARGINS_MM }
    };
    this.copiedFormat = null;
    /** @type {Array<{id:string, anchorText:string, content:string, createdAt:string, author?:string}>} */
    this.comments = [];
    this.commentsPanel = null;
    this.activeCommentId = null;
    this._commentSequence = 0;
    this._commentAnchorClickHandler = null;
    this._commentPanelClickHandler = null;
    this._commentAnchorKeyHandler = null;
    this._commentPanelKeyHandler = null;
    this.trackChangesEnabled = false;
    this._trackChangesBeforeInputHandler = null;
    this._workflowBeforeInputHandler = null;
    this._workflowInputHandler = null;
    this._workflowKeydownHandler = null;
    this._resetInlineFormattingOnNextInput = null;
    this._normalizeParagraphAfterHeading = false;
    this._referenceClickHandler = null;
    this.printPreviewOverlay = null;
    this.currentPreviewPage = 1;
    this.previewTotalPages = 1;
    this.previewZoom = 1.0;
    this._previewKeyHandler = null;

    // Undo / Redo Deep History Stack
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoStack = 100;
    this._isUndoingRedoing = false;
    this._typingDebounceTimer = null;
    this._typingDebounceMs = 600;
    this._inputHandler = null;
    this._undoKeyHandler = null;
    this._lastSnapshot = null;
    this._paginationInputHandler = null;
    this._paginationDebounceTimer = null;
    this._paginationDebounceMs = 250;
    this._paginating = false;
    this._livePageCount = 1;

    // Mail Merge (Trộn thư) State
    this.mailMergeData = {
      fields: [],
      records: [],
      rawCsv: ""
    };
    this.mailMergePreview = {
      enabled: false,
      recordIndex: 0
    };

    // Watermark & Page Border State
    this.watermark = null;
    this.pageBorder = {
      enabled: false,
      style: "solid",
      width: 2,
      color: "#0f4c81"
    };
    this.columns = {
      count: 1,
      gap: 10,
      rule: false
    };
    this.shapes = [];
    this.selectedShapeId = null;
    this.documentTheme = "office";
    this.showFormattingMarks = false;
    this._styleSelectionHandler = null;

    this._initZones();
    if (this.editorDom) {
      this._lastSnapshot = this._createSnapshot("Initial State");
      this._updateUndoRedoUI();
    }
  }

  _initZones() {
    if (!this.editorDom || typeof this.editorDom.querySelector !== "function") {
      this.headerDom = null;
      this.bodyDom = this.editorDom;
      this.footerDom = null;
      return;
    }
    this.headerDom = this.editorDom.querySelector(".vno-writer-header");
    this.bodyDom = this.editorDom.querySelector(".vno-writer-body") || this.editorDom;
    this.footerDom = this.editorDom.querySelector(".vno-writer-footer");
  }

  attach() {
    this._initZones();
    globalUnoBridge.attachDocument(this);
    this._applyPageSetup();
    this._bindCommentInteractions();
    this._bindContinuousEditingWorkflow();
    this._bindTrackChanges();
    this._renderCommentsPanel();
    this._updateTrackChangesCommandState();
    globalCommandBus.bindHandler("writer.file.printPreview", () => this.openPrintPreview());

    // Bind Review (Ghi chú & Theo dõi thay đổi)
    globalCommandBus.bindHandler("writer.comment.insert", (args) => this.insertComment(args));
    globalCommandBus.bindHandler("writer.trackChanges.toggle", (args) => this.toggleTrackChanges(args?.enabled));
    globalCommandBus.bindHandler("writer.trackChanges.acceptAll", () => this.acceptAllTrackChanges());
    globalCommandBus.bindHandler("writer.trackChanges.rejectAll", () => this.rejectAllTrackChanges());

    // Bind undo/redo listeners & command handlers
    this._bindUndoRedo();
    globalCommandBus.bindHandler("common.edit.undo", () => this.undo());
    globalCommandBus.bindHandler("common.edit.redo", () => this.redo());

    // Bind References (TOC & Footnotes/Endnotes)
    this._bindReferenceInteractions();
    globalCommandBus.bindHandler("writer.reference.tocInsert", () => this.insertTableOfContents());
    globalCommandBus.bindHandler("writer.reference.tocUpdate", () => this.updateTableOfContents());
    globalCommandBus.bindHandler("writer.reference.footnoteInsert", (args) => this.insertFootnote(args));
    globalCommandBus.bindHandler("writer.reference.endnoteInsert", (args) => this.insertEndnote(args));

    // Bind Mail Merge (Trộn thư)
    globalCommandBus.bindHandler("writer.mailMerge.open", (args) => this.openMailMergeDataSourceDialog(args));
    globalCommandBus.bindHandler("writer.mailMerge.insertField", (args) => this.insertMergeField(args));
    globalCommandBus.bindHandler("writer.mailMerge.preview", (args) => this.toggleMailMergePreview(args));
    globalCommandBus.bindHandler("writer.mailMerge.prevRecord", (args) => this.prevMailMergeRecord(args));
    globalCommandBus.bindHandler("writer.mailMerge.nextRecord", (args) => this.nextMailMergeRecord(args));
    globalCommandBus.bindHandler("writer.mailMerge.finish", (args) => this.finishMailMerge(args));
    this._updateMailMergeCommandStates();

    // Áp dụng trang trí trang (Hình mờ & Viền trang)
    this._applyDecorations();

    // Bind Thư viện Kiểu & Trang trí trang (Watermark & Page Border)
    this._bindStyleTracking();
    globalCommandBus.bindHandler("writer.style.gallery", (args) => this.toggleStyleGallery(args));
    globalCommandBus.bindHandler("writer.page.watermark", (args) => this.openWatermarkDialog(args));
    globalCommandBus.bindHandler("writer.page.border", (args) => this.openPageBorderDialog(args));
    globalCommandBus.bindHandler("writer.page.columns", (args) => this.openColumnsDialog(args));
    globalCommandBus.bindHandler("writer.page.columns1", () => this.setColumns({ count: 1, gap: 0, rule: false }));
    globalCommandBus.bindHandler("writer.page.columns2", () => this.setColumns({ count: 2, gap: 10, rule: false }));
    globalCommandBus.bindHandler("writer.page.columns3", () => this.setColumns({ count: 3, gap: 10, rule: false }));
    globalCommandBus.bindHandler("writer.shape.insert", (args) => this.insertShape(args));
    globalCommandBus.bindHandler("writer.diagram.insert", (args) => this.insertDiagram(args));
    globalCommandBus.bindHandler("writer.chart.insert", (args) => this.insertChart(args));
    globalCommandBus.bindHandler("writer.design.themeGallery", (args) => this.openThemeGalleryDialog(args));
    globalCommandBus.bindHandler("writer.insert.textbox", (args) => this.insertTextBox(args));
    globalCommandBus.bindHandler("writer.format.dropCap", (args) => this.applyDropCap(args));
    globalCommandBus.bindHandler("writer.insert.dateTime", (args) => this.insertDateTime(args));
    globalCommandBus.bindHandler("writer.insert.equation", (args) => this.insertEquation(args));
    globalCommandBus.bindHandler("writer.insert.symbol", (args) => this.insertSymbol(args));
    globalCommandBus.bindHandler("writer.insert.bookmark", (args) => this.insertBookmark(args));
    globalCommandBus.bindHandler("writer.insert.crossReference", (args) => this.insertCrossReference(args));

    // Bind Office Parity Mouse & Shortcuts
    this._bindMouseAndKeyboardParity();
    globalCommandBus.bindHandler("writer.style.normal", () => this._applyParagraphStyle("normal"));
    globalCommandBus.bindHandler("writer.text.changeCase", () => this.changeCase());
    globalCommandBus.bindHandler("writer.para.sort", () => this.sortParagraphs());
    globalCommandBus.bindHandler("writer.para.showFormattingMarks", () => this.toggleFormattingMarks());
    globalCommandBus.bindHandler("writer.para.shading", (args) => this.applyParagraphShading(args));
    globalCommandBus.bindHandler("writer.para.borders", (args) => this.applyParagraphBorders(args));
    globalCommandBus.bindHandler("writer.para.moveUp", () => this.moveParagraph("up"));
    globalCommandBus.bindHandler("writer.para.moveDown", () => this.moveParagraph("down"));
    globalCommandBus.bindHandler("common.edit.repeat", () => this.repeatLastAction());

    if (!this._lastSnapshot) {
      this._lastSnapshot = this._createSnapshot("Initial State");
    }
    this._updateUndoRedoUI();
    this._recomputeLivePagination();
  }

  _bindTrackChanges() {
    if (!this.bodyDom?.addEventListener || this._trackChangesBeforeInputHandler) return;
    this._trackChangesBeforeInputHandler = (event) => this._handleTrackChangesBeforeInput(event);
    this.bodyDom.addEventListener("beforeinput", this._trackChangesBeforeInputHandler);
  }

  /**
   * Giữ hành vi nhập liên tục giống Writer/Word ở ranh giới một vùng vừa được định
   * dạng. Chromium đặt caret ở trong thẻ <b> khi người dùng chọn một đoạn, Ctrl+B,
   * nhấn mũi tên phải rồi gõ tiếp; nếu không can thiệp, chữ mới bị in đậm ngoài ý
   * muốn. Cờ này chỉ áp dụng cho lần chèn chữ kế tiếp sau một selection thật.
   */
  _bindContinuousEditingWorkflow() {
    if (!this.bodyDom?.addEventListener || this._workflowBeforeInputHandler) return;
    this._workflowBeforeInputHandler = (event) => {
      if (event.inputType === "insertParagraph") {
        const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
        const anchor = selection?.anchorNode?.nodeType === 1 ? selection.anchorNode : selection?.anchorNode?.parentElement;
        this._normalizeParagraphAfterHeading = Boolean(anchor?.closest?.("h1,h2,h3") && this.bodyDom.contains(anchor));
      }
      if (!this._resetInlineFormattingOnNextInput) return;
      if (event.inputType !== "insertText" && event.inputType !== "insertCompositionText") return;
      const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
      if (!selection?.isCollapsed || !this.bodyDom.contains?.(selection.anchorNode)) return;

      const formats = this._resetInlineFormattingOnNextInput;
      this._resetInlineFormattingOnNextInput = null;
      if (formats.bold && document.queryCommandState?.("bold")) {
        document.execCommand("bold", false, null);
      }
    };
    this.bodyDom.addEventListener("beforeinput", this._workflowBeforeInputHandler);

    this._workflowInputHandler = (event) => {
      if (event.inputType !== "insertParagraph" || !this._normalizeParagraphAfterHeading) return;
      this._normalizeParagraphAfterHeading = false;
      try {
        document.execCommand("formatBlock", false, "<p>");
      } catch {
        document.execCommand?.("formatBlock", false, "p");
      }
    };
    this.bodyDom.addEventListener("input", this._workflowInputHandler);

    this._workflowKeydownHandler = (event) => {
      if (event.key !== "Tab") return;
      const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
      const anchor = selection?.anchorNode?.nodeType === 1 ? selection.anchorNode : selection?.anchorNode?.parentElement;
      const cell = anchor?.closest?.("td,th");
      if (!cell || !this.bodyDom.contains(cell)) return;

      const table = cell.closest("table");
      const cells = [...(table?.querySelectorAll?.("td,th") || [])];
      const currentIndex = cells.indexOf(cell);
      const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
      if (nextIndex < 0 || nextIndex >= cells.length) return;

      event.preventDefault();
      event.stopPropagation();
      this.bodyDom.focus?.({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(cells[nextIndex]);
      selection.removeAllRanges();
      selection.addRange(range);
    };
    this.bodyDom.addEventListener("keydown", this._workflowKeydownHandler);
  }

  _bindMouseAndKeyboardParity() {
    if (!this.bodyDom?.addEventListener) return;

    // 1. Di chuột mép cột bảng đổi cursor col-resize & nhấp đúp tự động co giãn độ rộng cột
    this.bodyDom.addEventListener("mousemove", (e) => {
      const cell = e.target?.closest?.("td, th");
      if (!cell || !cell.getBoundingClientRect) return;
      const rect = cell.getBoundingClientRect();
      if (e.clientX >= rect.right - 8 && e.clientX <= rect.right + 2) {
        cell.classList.add("is-col-resize-hover");
      } else {
        cell.classList.remove("is-col-resize-hover");
      }
    });

    this.bodyDom.addEventListener("dblclick", (e) => {
      const cell = e.target?.closest?.("td, th");
      if (!cell || !cell.getBoundingClientRect) return;
      const rect = cell.getBoundingClientRect();
      if (e.clientX >= rect.right - 8 && e.clientX <= rect.right + 2) {
        const table = cell.closest?.("table");
        if (table) {
          e.preventDefault?.();
          this.autoFitTableColumn(table, cell.cellIndex);
        }
      }
    });

    // 2. Kéo thả đoạn văn bản đã chọn (Drag & Drop) tích hợp hoàn tác Undo
    this.bodyDom.addEventListener("dragstart", () => {
      this._isDraggingText = true;
    });

    this.bodyDom.addEventListener("drop", () => {
      if (this._isDraggingText) {
        this._isDraggingText = false;
        setTimeout(() => {
          this.isDirty = true;
          this.recordSnapshot("writer.text.dragDrop");
        }, 10);
      }
    });

    this.bodyDom.addEventListener("dragend", () => {
      this._isDraggingText = false;
    });
  }

  autoFitTableColumn(table, colIndex) {
    if (!table) return null;
    const rows = table.rows || [];
    let maxLen = 4;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells ? rows[i].cells[colIndex] : null;
      if (cell) {
        const text = (cell.innerText || cell.textContent || "").trim();
        if (text.length > maxLen) maxLen = text.length;
      }
    }
    const computedWidth = Math.max(50, Math.min(650, Math.round(maxLen * 9.5 + 24)));
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells ? rows[i].cells[colIndex] : null;
      if (cell) {
        cell.style.width = `${computedWidth}px`;
      }
    }
    this.isDirty = true;
    this.recordSnapshot("writer.table.autoFitColumn");
    return computedWidth;
  }

  changeCase() {
    if (typeof window === "undefined") return false;
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return false;

    let range = sel.getRangeAt(0);
    if (sel.isCollapsed && range) {
      const node = sel.anchorNode;
      if (node && node.nodeType === 3) {
        const text = node.textContent || "";
        const offset = sel.anchorOffset;
        let start = offset;
        let end = offset;
        while (start > 0 && /\S/.test(text[start - 1])) start--;
        while (end < text.length && /\S/.test(text[end])) end++;
        if (end > start && typeof document !== "undefined") {
          const newRange = document.createRange?.();
          if (newRange) {
            newRange.setStart(node, start);
            newRange.setEnd(node, end);
            sel.removeAllRanges();
            sel.addRange(newRange);
            range = newRange;
          }
        }
      }
    }

    const text = sel.toString();
    if (!text) return false;

    this.flushTyping();
    let newText = "";
    const isAllUpper = (text === text.toUpperCase() && text !== text.toLowerCase());
    const isAllLower = (text === text.toLowerCase() && text !== text.toUpperCase());

    if (isAllUpper) {
      // UPPER -> Title Case: Capitalize first letter of each word
      newText = text.toLowerCase().replace(/(^|\s)\S/g, char => char.toUpperCase());
    } else if (isAllLower) {
      // lower -> UPPER
      newText = text.toUpperCase();
    } else {
      // Mixed/Title -> lower
      newText = text.toLowerCase();
    }

    let success = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        success = document.execCommand("insertText", false, newText);
      } catch {
        success = false;
      }
    }
    if (!success && range?.deleteContents) {
      range.deleteContents();
      if (typeof document !== "undefined") {
        range.insertNode(document.createTextNode(newText));
      }
    }

    this.isDirty = true;
    this.recordSnapshot("writer.text.changeCase");
    return true;
  }

  _getSelectedParagraphBlocks() {
    if (typeof window === "undefined" || !this.bodyDom) return [];
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return [];
    const range = selection.getRangeAt(0);
    const startElement = range.startContainer?.nodeType === 1
      ? range.startContainer
      : range.startContainer?.parentElement;
    const listItem = startElement?.closest?.("li");
    if (listItem && this.bodyDom.contains(listItem)) {
      const siblings = Array.from(listItem.parentElement?.children || []).filter(node => node.tagName === "LI");
      if (range.collapsed) return siblings;
      return siblings.filter(node => range.intersectsNode?.(node));
    }
    const blocks = Array.from(this.bodyDom.children || []).filter(node =>
      !node.hasAttribute?.("data-vno-auto-page-gap") && range.intersectsNode?.(node)
    );
    if (blocks.length === 1 && /^(OL|UL)$/i.test(blocks[0].tagName)) {
      return Array.from(blocks[0].children || []).filter(node => node.tagName === "LI");
    }
    if (blocks.length) return blocks;
    const closest = startElement?.closest?.("p,h1,h2,h3,h4,h5,h6,blockquote,div,td,th");
    return closest && this.bodyDom.contains(closest) ? [closest] : [];
  }

  sortParagraphs() {
    const blocks = this._getSelectedParagraphBlocks();
    if (blocks.length < 2) return false;
    const parent = blocks[0].parentNode;
    if (!parent || blocks.some(node => node.parentNode !== parent)) return false;
    this.flushTyping();
    const marker = document.createComment("vno-sort-anchor");
    parent.insertBefore(marker, blocks[0]);
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    blocks
      .slice()
      .sort((a, b) => collator.compare(a.textContent.trim(), b.textContent.trim()))
      .forEach(node => parent.insertBefore(node, marker));
    marker.remove();
    this.isDirty = true;
    this.recordSnapshot("writer.para.sort");
    return true;
  }

  toggleFormattingMarks() {
    this.showFormattingMarks = !this.showFormattingMarks;
    this.bodyDom?.classList?.toggle("vno-show-formatting-marks", this.showFormattingMarks);
    this._renderInlineFormattingMarks(this.showFormattingMarks);
    globalCommandBus?.updateState?.("writer.para.showFormattingMarks", { checked: this.showFormattingMarks });
    return this.showFormattingMarks;
  }

  _renderInlineFormattingMarks(show) {
    if (!this.bodyDom || typeof document === "undefined") return;
    if (!show) {
      this.bodyDom.querySelectorAll?.("span[data-vno-format-mark]").forEach(span => span.replaceWith(document.createTextNode(span.textContent || "")));
      this.bodyDom.normalize?.();
      return;
    }
    const walker = document.createTreeWalker(this.bodyDom, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement?.closest?.("[data-vno-format-mark],script,style")
        ? NodeFilter.FILTER_REJECT
        : (/[ \t]/.test(node.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.data.split(/([ \t])/).filter(part => part !== "").forEach(part => {
        if (part === " " || part === "\t") {
          const mark = document.createElement("span");
          mark.dataset.vnoFormatMark = part === "\t" ? "tab" : "space";
          mark.textContent = part;
          fragment.appendChild(mark);
        } else fragment.appendChild(document.createTextNode(part));
      });
      node.replaceWith(fragment);
    });
  }

  _applyParagraphVisualStyle(styles, description) {
    const blocks = this._getSelectedParagraphBlocks();
    if (!blocks.length) return false;
    this.flushTyping();
    blocks.forEach(block => Object.assign(block.style, styles));
    this.isDirty = true;
    this.recordSnapshot(description);
    return true;
  }

  applyParagraphShading(color = "#FFF2CC") {
    const value = typeof color === "string" && color ? color : "#FFF2CC";
    return this._applyParagraphVisualStyle({ backgroundColor: value }, "writer.para.shading");
  }

  applyParagraphBorders(style = "bottom") {
    const borders = {
      bottom: { border: "none", borderBottom: "1px solid #334155" },
      all: { border: "1px solid #334155", borderBottom: "1px solid #334155" },
      none: { border: "none", borderBottom: "none" }
    };
    return borders[style] ? this._applyParagraphVisualStyle(borders[style], "writer.para.borders") : false;
  }

  moveParagraph(direction = "up") {
    if (typeof window === "undefined") return false;
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return false;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== this.bodyDom && node.parentElement !== this.bodyDom) {
      node = node.parentElement;
    }
    if (!node || node === this.bodyDom) return false;

    this.flushTyping();
    if (direction === "up") {
      const prev = node.previousElementSibling;
      if (prev && this.bodyDom?.contains?.(prev)) {
        this.bodyDom.insertBefore(node, prev);
        this.isDirty = true;
        this.recordSnapshot("writer.para.moveUp");
        return true;
      }
    } else if (direction === "down") {
      const next = node.nextElementSibling;
      if (next && this.bodyDom?.contains?.(next)) {
        this.bodyDom.insertBefore(next, node);
        this.isDirty = true;
        this.recordSnapshot("writer.para.moveDown");
        return true;
      }
    }
    return false;
  }

  repeatLastAction() {
    if (this.redoStack && this.redoStack.length > 0) {
      return this.redo();
    }
    const history = globalCommandBus.getHistory();
    const last = history.filter(h => h.commandId && !h.commandId.includes("repeat") && !h.commandId.includes("undo") && !h.commandId.includes("redo")).pop();
    if (last) {
      return globalCommandBus.execute(last.commandId, last.args);
    }
    return false;
  }

  _handleTrackChangesBeforeInput(event) {
    if (!this.trackChangesEnabled || event.defaultPrevented) return false;
    const inputType = event.inputType || "";
    const isInsert = inputType === "insertText" || inputType === "insertCompositionText" || inputType === "insertFromPaste";
    const isDelete = inputType === "deleteContentBackward" || inputType === "deleteContentForward" || inputType === "deleteByCut";
    if (!isInsert && !isDelete) return false;

    const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer;
    if (!(commonNode === this.bodyDom || this.bodyDom?.contains?.(commonNode))) return false;

    const hadSelection = !range.collapsed;
    event.preventDefault?.();
    if (hadSelection) this._markRangeDeleted(range, selection);

    if (isInsert) {
      const text = inputType === "insertFromPaste"
        ? (event.dataTransfer?.getData?.("text/plain") || event.clipboardData?.getData?.("text/plain") || event.data || "")
        : (event.data || "");
      if (text) this._insertTrackedText(range, text, selection);
    } else if (!hadSelection) {
      const characterRange = this._adjacentCharacterRange(range, inputType === "deleteContentBackward");
      if (characterRange) this._markRangeDeleted(characterRange, selection);
    }

    this.isDirty = true;
    this._updateTrackChangesCommandState();
    this.bodyDom.dispatchEvent?.(new Event("input", { bubbles: true }));
    return true;
  }

  _insertTrackedText(range, text, selection) {
    const insertion = document.createElement("ins");
    insertion.dataset.vnoChange = "insert";
    insertion.appendChild(document.createTextNode(text));
    range.insertNode(insertion);
    range.setStartAfter(insertion);
    range.collapse(true);
    selection?.removeAllRanges?.();
    selection?.addRange?.(range);
    return insertion;
  }

  _markRangeDeleted(range, selection) {
    const parentElement = range.commonAncestorContainer?.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer?.parentElement;
    const trackedInsertion = parentElement?.closest?.('ins[data-vno-change="insert"]');
    if (trackedInsertion && this.bodyDom?.contains?.(trackedInsertion)) {
      range.deleteContents();
      if (!trackedInsertion.textContent) trackedInsertion.remove();
    } else {
      const deletion = document.createElement("del");
      deletion.dataset.vnoChange = "delete";
      deletion.setAttribute("contenteditable", "false");
      deletion.appendChild(range.extractContents());
      range.insertNode(deletion);
      range.setStartAfter(deletion);
    }
    range.collapse(true);
    selection?.removeAllRanges?.();
    selection?.addRange?.(range);
    return true;
  }

  _adjacentCharacterRange(caretRange, backward) {
    let node = caretRange.startContainer;
    let offset = caretRange.startOffset;
    const range = document.createRange();
    if (node?.nodeType === 3 && ((backward && offset > 0) || (!backward && offset < node.data.length))) {
      range.setStart(node, backward ? offset - 1 : offset);
      range.setEnd(node, backward ? offset : offset + 1);
      return range;
    }

    const walker = document.createTreeWalker(this.bodyDom, NodeFilter.SHOW_TEXT, {
      acceptNode: (textNode) => textNode.parentElement?.closest?.('del[data-vno-change="delete"]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = nodes.indexOf(node);
    if (index < 0 && node?.nodeType === 1) {
      index = nodes.findIndex((textNode) => node.contains?.(textNode));
      if (!backward && index >= 0) index--;
    }
    const adjacent = nodes[index + (backward ? -1 : 1)];
    if (!adjacent?.data?.length) return null;
    const adjacentOffset = backward ? adjacent.data.length : 0;
    range.setStart(adjacent, backward ? adjacentOffset - 1 : adjacentOffset);
    range.setEnd(adjacent, backward ? adjacentOffset : adjacentOffset + 1);
    return range;
  }

  toggleTrackChanges(force) {
    this.trackChangesEnabled = typeof force === "boolean" ? force : !this.trackChangesEnabled;
    this._updateTrackChangesCommandState();
    return this.trackChangesEnabled;
  }

  acceptAllTrackChanges() {
    this._resolveAllTrackChanges(true);
    return true;
  }

  rejectAllTrackChanges() {
    this._resolveAllTrackChanges(false);
    return true;
  }

  _resolveAllTrackChanges(accept) {
    this.flushTyping();
    this._initZones();
    const insertions = [...(this.bodyDom?.querySelectorAll?.('ins[data-vno-change="insert"]') || [])];
    const deletions = [...(this.bodyDom?.querySelectorAll?.('del[data-vno-change="delete"]') || [])];
    const unwrap = (node) => node.replaceWith(...node.childNodes);
    if (accept) {
      insertions.forEach(unwrap);
      deletions.forEach((node) => node.remove());
    } else {
      insertions.forEach((node) => node.remove());
      deletions.forEach(unwrap);
    }
    if (insertions.length || deletions.length) this.isDirty = true;
    this._updateTrackChangesCommandState();
    this.recordSnapshot(accept ? "writer.trackChanges.acceptAll" : "writer.trackChanges.rejectAll");
    return { insertions: insertions.length, deletions: deletions.length };
  }

  _updateTrackChangesCommandState() {
    const hasChanges = !!this.bodyDom?.querySelector?.('[data-vno-change]');
    globalCommandBus.updateState("writer.trackChanges.toggle", { checked: this.trackChangesEnabled });
    globalCommandBus.updateState("writer.trackChanges.acceptAll", { enabled: hasChanges });
    globalCommandBus.updateState("writer.trackChanges.rejectAll", { enabled: hasChanges });
  }

  /**
   * Gắn tham chiếu AppShell để newDocument()/closeDocument() có thể đưa ribbon về tab
   * "Trang đầu" và đặt lại tên tài liệu hiển thị — trước đây thiếu bước này nên File >
   * Mới chỉ xóa nội dung soạn thảo nhưng vẫn để ribbon kẹt ở tab cũ và giữ nguyên tên
   * tệp mẫu cũ trên thanh tab, không giống hành vi thật của Word (lỗi thật, người dùng
   * phát hiện 04/09/2026).
   */
  setShell(shell) {
    this.shell = shell;
  }

  setCommentsPanel(panelDom) {
    if (this.commentsPanel && this._commentPanelClickHandler) {
      this.commentsPanel.removeEventListener?.("click", this._commentPanelClickHandler);
      this.commentsPanel.removeEventListener?.("keydown", this._commentPanelKeyHandler);
    }
    this.commentsPanel = panelDom;
    this._commentPanelClickHandler = null;
    this._bindCommentInteractions();
    this._renderCommentsPanel();
  }

  _bindCommentInteractions() {
    if (this.bodyDom?.addEventListener && !this._commentAnchorClickHandler) {
      this._commentAnchorClickHandler = (event) => {
        const anchor = event.target?.closest?.("[data-comment-id]");
        if (anchor && this.bodyDom.contains(anchor)) {
          this.focusComment(anchor.dataset?.commentId || (typeof anchor.getAttribute === "function" ? anchor.getAttribute("data-comment-id") : null));
          return;
        }
        if (event.detail === 3) {
          let node = event.target;
          while (node && node !== this.bodyDom && !/^(P|H[1-6]|BLOCKQUOTE|LI|DIV|TD|TH)$/i.test(node?.tagName)) {
            node = node?.parentElement;
          }
          if (node && node !== this.bodyDom && typeof window !== "undefined" && typeof document !== "undefined") {
            const range = document.createRange?.();
            if (range) {
              range.selectNodeContents(node);
              const sel = window.getSelection?.();
              sel?.removeAllRanges?.();
              sel?.addRange?.(range);
              event.preventDefault?.();
            }
          }
          return;
        }
        this._referenceClickHandler?.(event);
      };
      this.bodyDom.addEventListener("click", this._commentAnchorClickHandler);
      this._commentAnchorKeyHandler = (event) => {
        if (event.altKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "Up")) {
          event.preventDefault?.();
          this.moveParagraph("up");
          return;
        }
        if (event.altKey && event.shiftKey && (event.key === "ArrowDown" || event.key === "Down")) {
          event.preventDefault?.();
          this.moveParagraph("down");
          return;
        }
        if (event.shiftKey && (event.key === "F3" || event.keyCode === 114)) {
          event.preventDefault?.();
          this.changeCase();
          return;
        }
        if (event.ctrlKey && event.shiftKey && (event.key === "N" || event.key === "n")) {
          event.preventDefault?.();
          this._applyParagraphStyle("normal");
          return;
        }
        if (event.key === "F4" || event.keyCode === 115) {
          event.preventDefault?.();
          this.repeatLastAction();
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") return;
        const anchor = event.target?.closest?.("[data-comment-id]");
        if (anchor) {
          event.preventDefault?.();
          this.focusComment(anchor.dataset.commentId);
        }
      };
      this.bodyDom.addEventListener("keydown", this._commentAnchorKeyHandler);
    }

    if (this.commentsPanel?.addEventListener && !this._commentPanelClickHandler) {
      this._commentPanelClickHandler = (event) => {
        const deleteButton = event.target?.closest?.("[data-comment-delete]");
        if (deleteButton) {
          event.stopPropagation?.();
          this.deleteComment(deleteButton.dataset.commentDelete);
          return;
        }
        const card = event.target?.closest?.("[data-comment-card]");
        if (card) this.focusComment(card.dataset.commentCard);
      };
      this.commentsPanel.addEventListener("click", this._commentPanelClickHandler);
      this._commentPanelKeyHandler = (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const card = event.target?.closest?.("[data-comment-card]");
        if (card && !event.target?.closest?.("button")) {
          event.preventDefault?.();
          this.focusComment(card.dataset.commentCard);
        }
      };
      this.commentsPanel.addEventListener("keydown", this._commentPanelKeyHandler);
    }
  }

  /** Áp dụng kích thước/lề trang hiện tại lên canvas thật (không chỉ lưu state suông). */
  _applyPageSetup() {
    if (!this.editorDom || !this.editorDom.style) return;
    const base = PAGE_SIZES_MM[this.pageSetup.size] || PAGE_SIZES_MM.a4;
    const isLandscape = this.pageSetup.orientation === "landscape";
    const widthMm = isLandscape ? base.h : base.w;
    const heightMm = isLandscape ? base.w : base.h;
    const { top, right, bottom, left } = this.pageSetup.margins;

    this.editorDom.style.width = `${(widthMm * MM_TO_PX).toFixed(1)}px`;
    this.editorDom.style.minHeight = `${(heightMm * MM_TO_PX).toFixed(1)}px`;
    this.editorDom.style.padding =
      `${(top * MM_TO_PX).toFixed(1)}px ${(right * MM_TO_PX).toFixed(1)}px ` +
      `${(bottom * MM_TO_PX).toFixed(1)}px ${(left * MM_TO_PX).toFixed(1)}px`;
    const viewContainer = this.editorDom.closest?.(".vno-writer-container");
    viewContainer?.style?.setProperty("--vno-page-width", (widthMm * MM_TO_PX).toFixed(1) + "px");
    viewContainer?.style?.setProperty("--vno-margin-left", (left * MM_TO_PX).toFixed(1) + "px");
    viewContainer?.style?.setProperty("--vno-margin-right", (right * MM_TO_PX).toFixed(1) + "px");
  }

  /**
   * CSS `@page` thật để nhúng vào HTML trung gian trước khi gửi cho LibreOffice headless —
   * đảm bảo khổ giấy/lề đúng trong DOCX/PDF xuất ra thật, không chỉ đúng trên canvas.
   */
  _getPageSetupCss() {
    const base = PAGE_SIZES_MM[this.pageSetup.size] || PAGE_SIZES_MM.a4;
    const isLandscape = this.pageSetup.orientation === "landscape";
    const widthMm = isLandscape ? base.h : base.w;
    const heightMm = isLandscape ? base.w : base.h;
    const { top, right, bottom, left } = this.pageSetup.margins;
    let pageCss = `@page { size: ${widthMm}mm ${heightMm}mm; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm;`;
    if (this.pageBorder && this.pageBorder.enabled && this.pageBorder.style !== "none") {
      pageCss += ` border: ${this.pageBorder.width || 2}pt ${this.pageBorder.style || "solid"} ${this.pageBorder.color || "#0f4c81"};`;
    }
    pageCss += ` }`;
    return pageCss;
  }

  _lengthToMm(raw) {
    const match = String(raw || "").trim().match(/^([\d.]+)\s*(cm|mm|in)?$/i);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    const unit = (match[2] || "mm").toLowerCase();
    if (unit === "cm") return value * 10;
    if (unit === "in") return value * 25.4;
    return value;
  }

  _pageSetupFromImportedCss(html) {
    const block = String(html || "").match(/@page\s*\{([^}]+)\}/i)?.[1];
    if (!block) return null;
    const setup = { margins: {} };
    const sizeMatch = block.match(/size:\s*([\d.]+(?:cm|mm|in))\s+([\d.]+(?:cm|mm|in))/i);
    if (sizeMatch) {
      const widthMm = this._lengthToMm(sizeMatch[1]);
      const heightMm = this._lengthToMm(sizeMatch[2]);
      if (widthMm && heightMm) {
        setup.orientation = widthMm > heightMm ? "landscape" : "portrait";
        const portraitW = setup.orientation === "landscape" ? heightMm : widthMm;
        const portraitH = setup.orientation === "landscape" ? widthMm : heightMm;
        if (Math.abs(portraitW - 210) < 8 && Math.abs(portraitH - 297) < 8) setup.size = "a4";
        else if (Math.abs(portraitW - 216) < 8 && Math.abs(portraitH - 279) < 8) setup.size = "letter";
        else if (Math.abs(portraitW - 216) < 8 && Math.abs(portraitH - 356) < 8) setup.size = "legal";
      }
    }
    const marginMap = { top: /margin-top:\s*([^;]+)/i, bottom: /margin-bottom:\s*([^;]+)/i, left: /margin-left:\s*([^;]+)/i, right: /margin-right:\s*([^;]+)/i };
    for (const [side, regex] of Object.entries(marginMap)) {
      const mm = this._lengthToMm(block.match(regex)?.[1]);
      if (mm != null) setup.margins[side] = Math.round(mm);
    }
    return setup;
  }

  /**
   * LibreOffice HTML (StarWriter) emits a full HTML document. Outline-level
   * Heading 1 is also wrapped as `<ol><li><h1>` — unwrap so Writer keeps h1
   * instead of a numbered list / Normal paragraph.
   *
   * StarWriter HTML also flattens OOXML Track Changes (`w:ins` / `w:del`) and
   * Word comments into ordinary paragraph text (comment bodies survive only as
   * HTML comments; authors are dropped). When the desktop bridge forwards
   * `word/document.xml` and `word/comments.xml`, wrap those runs back into
   * `<ins>` / `<del>` / `<mark data-comment-id>` before the body is mounted.
   *
   * Header/Footer are different: StarWriter keeps them as
   * `<div title="header|footer">` (the same markers VN Writer already emits
   * on save). PAGE/NUMPAGES become `<sdfield>` plus a gray span — unwrap so
   * Print Preview can still replace `Trang N / M`.
   */
  _normalizeImportedHtml(raw, ooxmlDocumentXml, ooxmlCommentsXml) {
    let html = String(raw || "");
    let comments = [];
    if (ooxmlDocumentXml) {
      html = this._applyOoxmlTrackChangesToHtml(html, ooxmlDocumentXml);
    }
    if (ooxmlDocumentXml && ooxmlCommentsXml) {
      const overlaid = this._applyOoxmlCommentsToHtml(html, ooxmlDocumentXml, ooxmlCommentsXml);
      html = overlaid.html;
      comments = overlaid.comments;
    }
    html = this._upgradeImportedTrackChangeMarkup(html);
    const page = this._pageSetupFromImportedCss(html);
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];

    html = html.replace(
      /<(ol|ul)\b[^>]*>\s*<li\b[^>]*>\s*(<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>)\s*<\/li>\s*<\/\1>/gi,
      "$2"
    );
    html = html.replace(/<\/img>/gi, "");
    html = html.replace(/<br\s+clear=["']left["']\s*\/?>/gi, "");

    const headerMatch = html.match(/<div\s+title=["']header["'][^>]*>([\s\S]*?)<\/div>/i);
    const footerMatch = html.match(/<div\s+title=["']footer["'][^>]*>([\s\S]*?)<\/div>/i);
    let header = "";
    let footer = "";
    if (headerMatch) {
      header = this._normalizeImportedHeaderFooterHtml(headerMatch[1]);
      html = html.replace(headerMatch[0], "");
    }
    if (footerMatch) {
      footer = this._normalizeImportedHeaderFooterHtml(footerMatch[1]);
      html = html.replace(footerMatch[0], "");
    }
    return { body: html.trim(), header, footer, page, comments };
  }

  /**
   * Unwrap StarWriter PAGE/NUMPAGES fields. They are not valid HTML and the
   * gray `<span>` wrapping them prevents Print Preview from matching
   * `Trang N / M` (the replacement lives on the footer innerHTML string).
   */
  _normalizeImportedHeaderFooterHtml(html) {
    let out = String(html || "");
    out = out.replace(/<sdfield\b[^>]*>([\s\S]*?)<\/sdfield>/gi, "$1");
    out = out.replace(
      /<span\b[^>]*\bstyle=["'][^"']*background:\s*#c0c0c0[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
      "$1"
    );
    return out.trim();
  }

  /**
   * Parse native Word revision marks. LibreOffice HTML (StarWriter) drops the
   * tags and author, but keeps both inserted and deleted text as plain runs.
   */
  _extractOoxmlRevisions(xml) {
    const source = String(xml || "");
    const revisions = [];
    const blockRe = /<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/gi;
    let match;
    while ((match = blockRe.exec(source))) {
      const kind = match[1].toLowerCase() === "ins" ? "insert" : "delete";
      const attrs = match[2] || "";
      const inner = match[3] || "";
      const author = this._decodeXmlEntities((attrs.match(/\bw:author="([^"]*)"/i) || [])[1] || "");
      const date = this._decodeXmlEntities((attrs.match(/\bw:date="([^"]*)"/i) || [])[1] || "");
      const texts = [];
      const textRe = /<w:(?:t|delText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText)>/gi;
      let textMatch;
      while ((textMatch = textRe.exec(inner))) {
        texts.push(this._decodeXmlEntities(textMatch[1]));
      }
      const text = texts.join("");
      if (text) revisions.push({ kind, text, author, date });
    }
    return revisions;
  }

  _decodeXmlEntities(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  _escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  _isInsideImportedRevision(html, offset) {
    const before = String(html || "").slice(0, offset);
    const lastOpenIns = Math.max(before.lastIndexOf("<ins"), before.lastIndexOf("<INS"));
    const lastOpenDel = Math.max(before.lastIndexOf("<del"), before.lastIndexOf("<DEL"));
    const lastOpen = Math.max(lastOpenIns, lastOpenDel);
    if (lastOpen < 0) return false;
    const lastCloseIns = Math.max(before.lastIndexOf("</ins>"), before.lastIndexOf("</INS>"));
    const lastCloseDel = Math.max(before.lastIndexOf("</del>"), before.lastIndexOf("</DEL>"));
    return Math.max(lastCloseIns, lastCloseDel) < lastOpen;
  }

  _trackChangeTooltip(revision) {
    const author = String(revision?.author || "").trim();
    const date = String(revision?.date || "").trim();
    if (author && date) return `${author} (${date})`;
    return author || date;
  }

  _wrapImportedRevisionMatch(match, revision) {
    const kind = revision.kind === "delete" ? "delete" : "insert";
    const tag = kind === "delete" ? "del" : "ins";
    const tooltip = this._trackChangeTooltip(revision);
    const authorAttr = revision.author
      ? ` data-vno-author="${this._escapeHtml(revision.author)}"`
      : "";
    const dateAttr = revision.date ? ` data-vno-date="${this._escapeHtml(revision.date)}"` : "";
    const titleAttr = tooltip ? ` title="${this._escapeHtml(tooltip)}"` : "";
    const editable = kind === "delete" ? ` contenteditable="false"` : "";
    return `<${tag} data-vno-change="${kind}"${editable}${authorAttr}${dateAttr}${titleAttr}>${match}</${tag}>`;
  }

  _applyOoxmlTrackChangesToHtml(html, ooxmlDocumentXml) {
    const revisions = this._extractOoxmlRevisions(ooxmlDocumentXml);
    if (!revisions.length) return html;
    const ordered = [...revisions].sort((a, b) => b.text.length - a.text.length);
    let next = String(html || "");
    for (const revision of ordered) {
      const parts = String(revision.text || "").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) continue;
      const pattern = new RegExp(parts.map((part) => this._escapeRegExp(part)).join("\\s+"), "g");
      next = next.replace(pattern, (matched, offset) => {
        if (/[<>]/.test(matched)) return matched;
        if (this._isInsideImportedRevision(next, offset)) return matched;
        return this._wrapImportedRevisionMatch(matched, revision);
      });
    }
    return next;
  }

  /**
   * Map generic HTML `<ins>` / `<del>` (or already-wrapped OOXML overlays) onto
   * the session Track Changes markers the Writer canvas already styles.
   */
  _upgradeImportedTrackChangeMarkup(html) {
    const upgrade = (full, attrs, kind) => {
      if (/\bdata-vno-change\s*=/i.test(attrs)) return full;
      const author = (attrs.match(/\b(?:title|cite|data-author|data-vno-author)\s*=\s*(["'])(.*?)\1/i) || [])[2] || "";
      const authorAttr = author && !/\bdata-vno-author\s*=/i.test(attrs)
        ? ` data-vno-author="${this._escapeHtml(author)}"`
        : "";
      const titleAttr = author && !/\btitle\s*=/i.test(attrs) ? ` title="${this._escapeHtml(author)}"` : "";
      const editable = kind === "delete" && !/\bcontenteditable\s*=/i.test(attrs) ? ` contenteditable="false"` : "";
      const tag = kind === "delete" ? "del" : "ins";
      return `<${tag}${attrs} data-vno-change="${kind}"${editable}${authorAttr}${titleAttr}>`;
    };
    return String(html || "")
      .replace(/<ins\b([^>]*)>/gi, (full, attrs) => upgrade(full, attrs, "insert"))
      .replace(/<del\b([^>]*)>/gi, (full, attrs) => upgrade(full, attrs, "delete"));
  }

  _ooxmlPlainText(xml) {
    const texts = [];
    const textRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let match;
    while ((match = textRe.exec(String(xml || "")))) {
      texts.push(this._decodeXmlEntities(match[1]));
    }
    return texts.join("");
  }

  _flexibleTextPattern(text) {
    const parts = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    return parts.map((part) => this._escapeRegExp(part)).join("\\s+");
  }

  _lastWords(text, count = 4) {
    const parts = String(text || "").trim().split(/\s+/).filter(Boolean);
    return parts.slice(-count).join(" ");
  }

  _firstWords(text, count = 4) {
    const parts = String(text || "").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, count).join(" ");
  }

  /**
   * Parse word/comments.xml: id → author, date, body.
   * StarWriter HTML keeps the body only as `<!-- ... -->` and drops the author.
   */
  _extractOoxmlCommentBodies(commentsXml) {
    const source = String(commentsXml || "");
    const bodies = new Map();
    const blockRe = /<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/gi;
    let match;
    while ((match = blockRe.exec(source))) {
      const attrs = match[1] || "";
      const inner = match[2] || "";
      const id = this._decodeXmlEntities((attrs.match(/\bw:id="([^"]*)"/i) || [])[1] || "");
      if (id === "") continue;
      const author = this._decodeXmlEntities((attrs.match(/\bw:author="([^"]*)"/i) || [])[1] || "");
      const date = this._decodeXmlEntities((attrs.match(/\bw:date="([^"]*)"/i) || [])[1] || "");
      const paragraphs = [];
      const pRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;
      let pMatch;
      while ((pMatch = pRe.exec(inner))) {
        const para = this._ooxmlPlainText(pMatch[1]).trim();
        if (para) paragraphs.push(para);
      }
      bodies.set(id, { author, date, content: paragraphs.join("\n").trim() });
    }
    return bodies;
  }

  /**
   * Parse word/document.xml comment ranges. The anchored text lives between
   * `w:commentRangeStart` and `w:commentRangeEnd`; prefix/suffix help disambiguate
   * when the same phrase also appears in a heading.
   */
  _extractOoxmlCommentAnchors(documentXml) {
    const source = String(documentXml || "");
    const anchors = new Map();
    const startRe = /<w:commentRangeStart\b([^>]*)\/?>/gi;
    let startMatch;
    while ((startMatch = startRe.exec(source))) {
      const id = this._decodeXmlEntities((startMatch[1].match(/\bw:id="([^"]*)"/i) || [])[1] || "");
      if (id === "") continue;
      const rest = source.slice(startMatch.index + startMatch[0].length);
      const endRe = new RegExp(`<w:commentRangeEnd\\b[^>]*\\bw:id="${this._escapeRegExp(id)}"[^>]*\\/?>`, "i");
      const endMatch = endRe.exec(rest);
      if (!endMatch) continue;
      const inner = rest.slice(0, endMatch.index);
      const after = rest.slice(endMatch.index + endMatch[0].length);
      const before = source.slice(0, startMatch.index);
      anchors.set(id, {
        text: this._ooxmlPlainText(inner),
        prefix: this._ooxmlPlainText(before),
        suffix: this._ooxmlPlainText(after)
      });
    }
    return anchors;
  }

  _isInsideImportedComment(html, offset) {
    const before = String(html || "").slice(0, offset);
    const lastOpen = Math.max(before.lastIndexOf("<mark"), before.lastIndexOf("<MARK"));
    if (lastOpen < 0) return false;
    const lastClose = Math.max(before.lastIndexOf("</mark>"), before.lastIndexOf("</MARK>"));
    return lastClose < lastOpen;
  }

  _importedCommentMarkOpen(comment) {
    const authorAttr = comment.author
      ? ` data-vno-comment-author="${this._escapeHtml(comment.author)}"`
      : "";
    const titleAttr = comment.author ? ` title="${this._escapeHtml(comment.author)}"` : "";
    const label = `Mở ghi chú cho: ${String(comment.anchorText || "").slice(0, 80)}`;
    return `<mark class="vno-comment-anchor" data-comment-id="${this._escapeHtml(comment.id)}" tabindex="0" role="button"${authorAttr}${titleAttr} aria-label="${this._escapeHtml(label)}">`;
  }

  _wrapImportedCommentInHtml(html, comment) {
    const targetFlex = this._flexibleTextPattern(comment.anchorText);
    if (!targetFlex) return { html, applied: false };
    const markOpen = this._importedCommentMarkOpen(comment);
    const markClose = "</mark>";
    const source = String(html || "");

    if (comment.content) {
      const hint = new RegExp(`(${targetFlex})(\\s*)<!--\\s*${this._escapeRegExp(comment.content)}\\s*-->`);
      if (hint.test(source)) {
        return {
          html: source.replace(hint, (_full, target) => `${markOpen}${target}${markClose}`),
          applied: true
        };
      }
    }

    const prefixFlex = this._flexibleTextPattern(comment.prefix);
    if (prefixFlex) {
      const withPrefix = new RegExp(`(${prefixFlex})(\\s+)(${targetFlex})`);
      let applied = false;
      const next = source.replace(withPrefix, (full, pre, ws, target, offset) => {
        if (applied || /[<>]/.test(target) || this._isInsideImportedComment(source, offset + pre.length + ws.length)) {
          return full;
        }
        applied = true;
        return `${pre}${ws}${markOpen}${target}${markClose}`;
      });
      if (applied) return { html: next, applied: true };
    }

    const targetOnly = new RegExp(targetFlex, "g");
    const matches = [...source.matchAll(targetOnly)].filter((item) => (
      !/[<>]/.test(item[0]) && !this._isInsideImportedComment(source, item.index)
    ));
    if (matches.length === 1) {
      const match = matches[0];
      const next = source.slice(0, match.index) + markOpen + match[0] + markClose + source.slice(match.index + match[0].length);
      return { html: next, applied: true };
    }

    return { html: source, applied: false };
  }

  _applyOoxmlCommentsToHtml(html, documentXml, commentsXml) {
    const bodies = this._extractOoxmlCommentBodies(commentsXml);
    const anchors = this._extractOoxmlCommentAnchors(documentXml);
    if (!bodies.size) return { html: String(html || ""), comments: [] };
    let next = String(html || "");
    const imported = [];
    for (const [ooxmlId, body] of bodies) {
      const anchor = anchors.get(ooxmlId) || { text: "", prefix: "", suffix: "" };
      const id = `writer-comment-import-${ooxmlId}`;
      const wrapped = this._wrapImportedCommentInHtml(next, {
        id,
        anchorText: anchor.text,
        prefix: this._lastWords(anchor.prefix, 4),
        suffix: this._firstWords(anchor.suffix, 4),
        content: body.content,
        author: body.author
      });
      if (!wrapped.applied) continue;
      next = wrapped.html;
      imported.push({
        id,
        anchorText: String(anchor.text || "").trim().replace(/\s+/g, " "),
        content: body.content,
        author: body.author || "",
        createdAt: body.date || new Date().toISOString()
      });
    }
    for (const comment of imported) {
      if (!comment.content) continue;
      next = next.replace(new RegExp(`<!--\\s*${this._escapeRegExp(comment.content)}\\s*-->`, "g"), "");
    }
    return { html: next, comments: imported };
  }

  async _showPageSetupDialog(focusField = "size") {
    if (typeof document === "undefined" || !document.body) return null;

    return new Promise((resolve) => {
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";
      const sizeOptions = Object.entries(PAGE_SIZES_MM)
        .map(([key, v]) => `<option value="${key}" ${key === this.pageSetup.size ? "selected" : ""}>${v.label}</option>`)
        .join("");

      const titleText = (typeof t === "function" && t("writerDialogs.pageSetup.title") !== "writerDialogs.pageSetup.title")
        ? t("writerDialogs.pageSetup.title")
        : "Thiết lập trang";
      const closeTitle = (typeof t === "function" && t("writerDialogs.pageSetup.close") !== "writerDialogs.pageSetup.close")
        ? t("writerDialogs.pageSetup.close")
        : "Đóng";
      const paperSizeLabel = (typeof t === "function" && t("writerDialogs.pageSetup.paperSize") !== "writerDialogs.pageSetup.paperSize")
        ? t("writerDialogs.pageSetup.paperSize")
        : "Khổ giấy";
      const orientationLabel = (typeof t === "function" && t("writerDialogs.pageSetup.orientation") !== "writerDialogs.pageSetup.orientation")
        ? t("writerDialogs.pageSetup.orientation")
        : "Hướng giấy";
      const portraitLabel = (typeof t === "function" && t("writerDialogs.pageSetup.portrait") !== "writerDialogs.pageSetup.portrait")
        ? t("writerDialogs.pageSetup.portrait")
        : "Dọc (Portrait)";
      const landscapeLabel = (typeof t === "function" && t("writerDialogs.pageSetup.landscape") !== "writerDialogs.pageSetup.landscape")
        ? t("writerDialogs.pageSetup.landscape")
        : "Ngang (Landscape)";
      const cancelBtn = (typeof t === "function" && t("writerDialogs.pageSetup.cancel") !== "writerDialogs.pageSetup.cancel")
        ? t("writerDialogs.pageSetup.cancel")
        : "Hủy bỏ";
      const applyBtn = (typeof t === "function" && t("writerDialogs.pageSetup.apply") !== "writerDialogs.pageSetup.apply")
        ? t("writerDialogs.pageSetup.apply")
        : "Áp dụng";

      const marginLabels = {
        top: (typeof t === "function" && t("writerDialogs.pageSetup.marginTop") !== "writerDialogs.pageSetup.marginTop") ? t("writerDialogs.pageSetup.marginTop") : "Lề trên",
        bottom: (typeof t === "function" && t("writerDialogs.pageSetup.marginBottom") !== "writerDialogs.pageSetup.marginBottom") ? t("writerDialogs.pageSetup.marginBottom") : "Lề dưới",
        left: (typeof t === "function" && t("writerDialogs.pageSetup.marginLeft") !== "writerDialogs.pageSetup.marginLeft") ? t("writerDialogs.pageSetup.marginLeft") : "Lề trái",
        right: (typeof t === "function" && t("writerDialogs.pageSetup.marginRight") !== "writerDialogs.pageSetup.marginRight") ? t("writerDialogs.pageSetup.marginRight") : "Lề phải"
      };

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 420px;" role="dialog" aria-modal="true" aria-labelledby="vno-pagesetup-dialog-title">
          <div class="vno-dialog-header">
            <span id="vno-pagesetup-dialog-title">${titleText}</span>
            <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${closeTitle}" aria-label="${closeTitle}">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <label style="font-size:13px;font-weight:500;">${paperSizeLabel}
              <select class="vno-select" id="vno-pagesetup-size" style="width:100%;margin-top:4px;">${sizeOptions}</select>
            </label>
            <label style="font-size:13px;font-weight:500;">${orientationLabel}
              <select class="vno-select" id="vno-pagesetup-orientation" style="width:100%;margin-top:4px;">
                <option value="portrait" ${this.pageSetup.orientation === "portrait" ? "selected" : ""}>${portraitLabel}</option>
                <option value="landscape" ${this.pageSetup.orientation === "landscape" ? "selected" : ""}>${landscapeLabel}</option>
              </select>
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${["top", "bottom", "left", "right"].map(side => {
                const sideLabel = marginLabels[side];
                return `<label style="font-size:12px;">${sideLabel} (mm)
                  <input type="number" min="0" max="100" class="vno-dialog-input" id="vno-pagesetup-margin-${side}"
                    value="${this.pageSetup.margins[side]}"
                    style="width:100%;margin-top:4px;box-sizing:border-box;padding:6px 10px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;" />
                </label>`;
              }).join("")}
            </div>
          </div>
          <div class="vno-dialog-footer">
            <button class="vno-btn vno-dialog-cancel-btn">${cancelBtn}</button>
            <button class="vno-btn vno-btn-primary vno-dialog-ok-btn">${applyBtn}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");
      overlay.querySelector(`#vno-pagesetup-${focusField === "orientation" ? "orientation" : "size"}`)?.focus();

      const finish = (result) => {
        document.removeEventListener("keydown", onKeyDown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (previousFocused && typeof previousFocused.focus === "function") {
          previousFocused.focus();
        }
        resolve(result);
      };

      const readForm = () => ({
        size: overlay.querySelector("#vno-pagesetup-size").value,
        orientation: overlay.querySelector("#vno-pagesetup-orientation").value,
        margins: {
          top: Number(overlay.querySelector("#vno-pagesetup-margin-top").value) || 0,
          bottom: Number(overlay.querySelector("#vno-pagesetup-margin-bottom").value) || 0,
          left: Number(overlay.querySelector("#vno-pagesetup-margin-left").value) || 0,
          right: Number(overlay.querySelector("#vno-pagesetup-margin-right").value) || 0
        }
      });

      overlay.querySelector(".vno-dialog-ok-btn").addEventListener("click", () => finish(readForm()));
      overlay.querySelector(".vno-dialog-cancel-btn").addEventListener("click", () => finish(null));
      overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => finish(null));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) finish(null);
      });

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finish(null);
        } else if (e.key === "Tab") {
          trapFocus(dialogBox, e);
        }
      };
      document.addEventListener("keydown", onKeyDown);
    });
  }

  setPageSetup(newSetup) {
    if (!newSetup) return false;
    this.flushTyping();
    this.pageSetup = {
      size: newSetup.size || this.pageSetup.size,
      orientation: newSetup.orientation || this.pageSetup.orientation,
      margins: { ...this.pageSetup.margins, ...(newSetup.margins || {}) }
    };
    this._applyPageSetup();
    this.isDirty = true;
    this.recordSnapshot("writer.page.setup");
    return true;
  }

  async _openPageSetup(focusField) {
    const result = await this._showPageSetupDialog(focusField);
    if (!result) return false;
    return this.setPageSetup(result);
  }

  /**
   * Xử lý dispatch lệnh dành riêng cho Writer
   */
  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.editorDom) return false;

    // Clone vùng chọn trước khi nút ribbon/dialog lấy focus khỏi trình soạn thảo.
    if (vnCmdId === "writer.comment.insert") {
      return await this.insertComment(args);
    }

    if (vnCmdId === "writer.trackChanges.toggle") return this.toggleTrackChanges(args?.enabled);
    if (vnCmdId === "writer.trackChanges.acceptAll") return this.acceptAllTrackChanges();
    if (vnCmdId === "writer.trackChanges.rejectAll") return this.rejectAllTrackChanges();

    if (vnCmdId !== "common.edit.undo" && vnCmdId !== "common.edit.redo") {
      this.flushTyping();
    }

    this.editorDom.focus?.();

    let dispatchResult = false;

    switch (vnCmdId) {
      case "writer.nav.docStart":
        return this.navigateDocumentBoundary(false);

      case "writer.nav.docEnd":
        return this.navigateDocumentBoundary(true);

      case "writer.text.bold":
        {
          const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
          const hadSelection = Boolean(selection && !selection.isCollapsed && this.bodyDom?.contains?.(selection.anchorNode));
        document.execCommand("bold", false, null);
        dispatchResult = document.queryCommandState("bold");
          this._resetInlineFormattingOnNextInput = hadSelection ? { bold: true } : null;
        }
        break;

      case "writer.text.italic":
        document.execCommand("italic", false, null);
        dispatchResult = document.queryCommandState("italic");
        break;

      case "writer.text.underline":
        document.execCommand("underline", false, null);
        dispatchResult = document.queryCommandState("underline");
        break;

      case "writer.text.strike":
        document.execCommand("strikeThrough", false, null);
        dispatchResult = document.queryCommandState("strikeThrough");
        break;

      case "writer.text.subscript":
        document.execCommand("subscript", false, null);
        dispatchResult = document.queryCommandState("subscript");
        break;

      case "writer.text.superscript":
        document.execCommand("superscript", false, null);
        dispatchResult = document.queryCommandState("superscript");
        break;

      case "writer.font.grow":
        this._adjustFontSize(1);
        dispatchResult = true;
        break;

      case "writer.font.shrink":
        this._adjustFontSize(-1);
        dispatchResult = true;
        break;

      case "writer.text.clearFormat":
        document.execCommand("removeFormat", false, null);
        dispatchResult = true;
        break;

      case "writer.para.alignLeft":
        document.execCommand("justifyLeft", false, null);
        dispatchResult = true;
        break;

      case "writer.para.alignCenter":
        document.execCommand("justifyCenter", false, null);
        dispatchResult = true;
        break;

      case "writer.para.alignRight":
        document.execCommand("justifyRight", false, null);
        dispatchResult = true;
        break;

      case "writer.para.justify":
        document.execCommand("justifyFull", false, null);
        dispatchResult = true;
        break;

      case "writer.para.sort":
        return this.sortParagraphs();

      case "writer.para.showFormattingMarks":
        return this.toggleFormattingMarks();

      case "writer.para.shading":
        return this.applyParagraphShading(args);

      case "writer.para.borders":
        return this.applyParagraphBorders(args);

      case "writer.para.spacing1":
        this._setLineHeight("1.0");
        dispatchResult = true;
        break;

      case "writer.para.spacing15":
        this._setLineHeight("1.5");
        dispatchResult = true;
        break;

      case "writer.para.spacing2":
        this._setLineHeight("2.0");
        dispatchResult = true;
        break;

      case "writer.list.bullet":
        document.execCommand("insertUnorderedList", false, null);
        dispatchResult = true;
        break;

      case "writer.list.numbered":
        document.execCommand("insertOrderedList", false, null);
        dispatchResult = true;
        break;

      case "writer.para.indentInc":
        document.execCommand("indent", false, null);
        dispatchResult = true;
        break;

      case "writer.para.indentDec":
        document.execCommand("outdent", false, null);
        dispatchResult = true;
        break;

      case "writer.font.family":
        if (args) document.execCommand("fontName", false, args);
        dispatchResult = true;
        break;

      case "writer.font.size":
        if (args) document.execCommand("fontSize", false, args);
        dispatchResult = true;
        break;

      case "writer.color.text":
        document.execCommand("foreColor", false, args || "#dc2626");
        dispatchResult = true;
        break;

      case "writer.color.highlight":
        document.execCommand("hiliteColor", false, args || "#ffcd00");
        dispatchResult = true;
        break;

      case "writer.table.insert":
        this.insertTable(3, 4);
        return true;

      case "writer.image.insert":
        this._insertImageDialog();
        return true;

      case "writer.page.break":
        this._insertPageBreak();
        return true;

      case "common.edit.undo":
        return this.undo();

      case "common.edit.redo":
        return this.redo();

      case "common.edit.cut":
        document.execCommand("cut", false, null);
        dispatchResult = true;
        break;

      case "common.edit.copy":
        document.execCommand("copy", false, null);
        return true;

      case "common.edit.paste":
        document.execCommand("paste", false, null);
        dispatchResult = true;
        break;

      case "common.edit.pastePlain":
        await this._pastePlainText();
        dispatchResult = true;
        break;

      case "common.edit.selectAll":
        document.execCommand("selectAll", false, null);
        return true;

      case "common.edit.find":
      case "common.edit.replace":
        this._showFindReplaceDialog(vnCmdId === "common.edit.replace");
        return true;

      case "common.edit.hyperlink":
        await this._insertHyperlink(args);
        dispatchResult = true;
        break;

      case "common.edit.formatPainter":
        return this._toggleFormatPainter();

      case "writer.header.insert":
        return this.activateHeader();

      case "writer.footer.insert":
        return this.activateFooter();

      case "writer.style.apply":
        return this._applyParagraphStyle(args);

      case "writer.style.normal":
        return this._applyParagraphStyle("normal");

      case "writer.text.changeCase":
        return this.changeCase();

      case "writer.para.moveUp":
        return this.moveParagraph("up");

      case "writer.para.moveDown":
        return this.moveParagraph("down");

      case "common.edit.repeat":
        return this.repeatLastAction();

      case "writer.style.gallery":
        return this.toggleStyleGallery(args);

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

      case "writer.file.printPreview":
        return Boolean(this.openPrintPreview());

      case "writer.page.margins":
        return await this._openPageSetup("margins");

      case "writer.page.size":
        return await this._openPageSetup("size");

      case "writer.page.orientation":
        return await this._openPageSetup("orientation");

      case "writer.page.watermark":
        return await this.openWatermarkDialog(args);

      case "writer.page.border":
        return await this.openPageBorderDialog(args);

      case "writer.page.columns":
        return await this.openColumnsDialog(args);

      case "writer.page.columns1":
        return this.setColumns({ count: 1, gap: 0, rule: false });

      case "writer.page.columns2":
        return this.setColumns({ count: 2, gap: 10, rule: false });

      case "writer.page.columns3":
        return this.setColumns({ count: 3, gap: 10, rule: false });

      case "writer.shape.insert":
        return await this.insertShape(args);

      case "writer.diagram.insert":
        return await this.insertDiagram(args);

      case "writer.chart.insert":
        return await this.insertChart(args);

      case "writer.insert.textbox":
        return this.insertTextBox(args);

      case "writer.format.dropCap":
        return this.applyDropCap(args);

      case "writer.insert.dateTime":
        return await this.insertDateTime(args);

      case "writer.insert.equation":
        return await this.insertEquation(args);

      case "writer.insert.symbol":
        return await this.insertSymbol(args);

      case "writer.insert.bookmark":
        return await this.insertBookmark(args);

      case "writer.insert.crossReference":
        return await this.insertCrossReference(args);

      case "writer.design.themeGallery":
        return await this.openThemeGalleryDialog(args);

      case "writer.reference.tocInsert":
        return this.insertTableOfContents();

      case "writer.reference.tocUpdate":
        return this.updateTableOfContents();

      case "writer.reference.footnoteInsert":
        return Boolean(this.insertFootnote(args));

      case "writer.reference.endnoteInsert":
        return Boolean(this.insertEndnote(args));

      case "writer.mailMerge.open":
        return await this.openMailMergeDataSourceDialog(args);

      case "writer.mailMerge.insertField":
        return Boolean(this.insertMergeField(args));

      case "writer.mailMerge.preview":
        return Boolean(this.toggleMailMergePreview(args));

      case "writer.mailMerge.prevRecord":
        return this.prevMailMergeRecord(args) !== false;

      case "writer.mailMerge.nextRecord":
        return this.nextMailMergeRecord(args) !== false;

      case "writer.mailMerge.finish":
        return Boolean(this.finishMailMerge(args));

      default:
        return false;
    }

    this.recordSnapshot(vnCmdId);
    return dispatchResult;
  }

  navigateDocumentBoundary(toEnd = false) {
    if (!this.bodyDom || typeof document === "undefined" || typeof window === "undefined") return false;
    const selection = window.getSelection?.();
    const range = document.createRange?.();
    if (!selection || !range) return false;
    range.selectNodeContents(this.bodyDom);
    range.collapse(!toEnd);
    selection.removeAllRanges();
    selection.addRange(range);
    this.bodyDom.focus?.({ preventScroll: true });
    const anchor = toEnd ? this.bodyDom.lastElementChild || this.bodyDom : this.bodyDom.firstElementChild || this.bodyDom;
    anchor.scrollIntoView?.({ block: toEnd ? "end" : "start", inline: "nearest" });
    return true;
  }

  async insertComment(args = null) {
    this._initZones();
    const selection = args?.selection || (typeof window !== "undefined" ? window.getSelection?.() : null);
    const sourceRange = args?.range || (selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
    const range = sourceRange?.cloneRange ? sourceRange.cloneRange() : sourceRange;
    const anchorText = (args?.anchorText || range?.toString?.() || "").trim();
    const commonNode = range?.commonAncestorContainer;
    const insideBody = !!(
      range &&
      !range.collapsed &&
      anchorText &&
      this.bodyDom &&
      (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode))
    );

    if (!insideBody) {
      if (!args?.silent) {
        const noSelTitle = (typeof t === "function" && t("writerDialogs.comments.noSelectionTitle") !== "writerDialogs.comments.noSelectionTitle")
          ? t("writerDialogs.comments.noSelectionTitle")
          : "Chưa chọn văn bản";
        const noSelMsg = (typeof t === "function" && t("writerDialogs.comments.noSelectionMsg") !== "writerDialogs.comments.noSelectionMsg")
          ? t("writerDialogs.comments.noSelectionMsg")
          : "Hãy bôi đen đoạn văn bản trong nội dung tài liệu trước khi thêm ghi chú.";
        await showAlertDialog({
          title: noSelTitle,
          message: noSelMsg,
          type: "warning"
        });
      }
      return false;
    }

    const addTitle = (typeof t === "function" && t("writerDialogs.comments.addCommentTitle") !== "writerDialogs.comments.addCommentTitle")
      ? t("writerDialogs.comments.addCommentTitle")
      : "Thêm ghi chú";
    const addPlaceholder = (typeof t === "function" && t("writerDialogs.comments.addCommentPlaceholder") !== "writerDialogs.comments.addCommentPlaceholder")
      ? t("writerDialogs.comments.addCommentPlaceholder")
      : "Nhập nội dung ghi chú...";
    const addConfirm = (typeof t === "function" && t("writerDialogs.comments.addCommentBtn") !== "writerDialogs.comments.addCommentBtn")
      ? t("writerDialogs.comments.addCommentBtn")
      : "Thêm ghi chú";
    const notePrefix = (typeof t === "function" && t("writerRibbon.group.comments") !== "writerRibbon.group.comments")
      ? t("writerRibbon.group.comments")
      : "Ghi chú";

    const content = args && Object.prototype.hasOwnProperty.call(args, "content")
      ? args.content
      : await showPromptDialog({
          title: addTitle,
          message: `${notePrefix} cho “${anchorText.slice(0, 80)}${anchorText.length > 80 ? "…" : ""}”`,
          placeholder: addPlaceholder,
          confirmText: addConfirm
        });

    if (content === null || !String(content).trim()) return false;

    const id = `writer-comment-${Date.now()}-${++this._commentSequence}`;
    const mark = document.createElement("mark");
    mark.className = "vno-comment-anchor";
    mark.dataset.commentId = id;
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("role", "button");
    const openCommentPattern = (typeof t === "function" && t("writerDialogs.comments.openCommentAria") !== "writerDialogs.comments.openCommentAria")
      ? t("writerDialogs.comments.openCommentAria")
      : "Mở ghi chú cho: {text}";
    mark.setAttribute("aria-label", openCommentPattern.replace("{text}", anchorText.slice(0, 80)));

    try {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    } catch (error) {
      console.warn("[WriterAdapter] Không thể tạo anchor ghi chú từ vùng chọn:", error);
      return false;
    }

    this.comments.push({
      id,
      anchorText,
      content: String(content).trim(),
      createdAt: new Date().toISOString()
    });
    this.activeCommentId = id;
    this.isDirty = true;
    selection?.removeAllRanges?.();
    this._renderCommentsPanel();
    this.focusComment(id);
    this.recordSnapshot("writer.comment.insert");
    return id;
  }

  focusComment(commentId) {
    const comment = this.comments.find((item) => item.id === commentId);
    if (!comment) return false;
    this.activeCommentId = commentId;
    const anchor = this.bodyDom?.querySelector?.(`[data-comment-id="${commentId}"]`);
    const card = this.commentsPanel?.querySelector?.(`[data-comment-card="${commentId}"]`);

    this.bodyDom?.querySelectorAll?.(".vno-comment-anchor.is-active").forEach((node) => node.classList.remove("is-active"));
    this.commentsPanel?.querySelectorAll?.(".vno-comment-card.is-active").forEach((node) => node.classList.remove("is-active"));
    anchor?.classList?.add("is-active");
    card?.classList?.add("is-active");
    anchor?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    card?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    return true;
  }

  deleteComment(commentId) {
    const index = this.comments.findIndex((item) => item.id === commentId);
    if (index < 0) return false;
    const anchor = this.bodyDom?.querySelector?.(`[data-comment-id="${commentId}"]`);
    if (anchor?.parentNode) {
      const parent = anchor.parentNode;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
      parent.normalize?.();
    }
    this.comments.splice(index, 1);
    if (this.activeCommentId === commentId) this.activeCommentId = null;
    this.isDirty = true;
    this._renderCommentsPanel();
    this.recordSnapshot("writer.comment.delete");
    return true;
  }

  _renderCommentsPanel() {
    if (!this.commentsPanel || typeof document === "undefined") return;
    this.commentsPanel.replaceChildren?.();
    this.commentsPanel.hidden = this.comments.length === 0;
    if (this.comments.length === 0) return;

    const title = document.createElement("h2");
    title.className = "vno-comments-title";
    title.textContent = `Ghi chú (${this.comments.length})`;
    this.commentsPanel.appendChild(title);

    for (const comment of this.comments) {
      const card = document.createElement("article");
      card.className = `vno-comment-card${comment.id === this.activeCommentId ? " is-active" : ""}`;
      card.dataset.commentCard = comment.id;
      card.tabIndex = 0;

      const preview = document.createElement("div");
      preview.className = "vno-comment-anchor-preview";
      preview.textContent = `“${comment.anchorText}”`;
      const content = document.createElement("div");
      content.className = "vno-comment-content";
      content.textContent = comment.content;
      const meta = document.createElement("div");
      meta.className = "vno-comment-meta";
      const info = document.createElement("span");
      info.className = "vno-comment-info";
      if (comment.author) {
        const who = document.createElement("span");
        who.className = "vno-comment-author";
        who.textContent = comment.author;
        info.appendChild(who);
      }
      const time = document.createElement("time");
      time.dateTime = comment.createdAt;
      time.textContent = new Date(comment.createdAt).toLocaleString("vi-VN");
      info.appendChild(time);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "vno-comment-delete";
      remove.dataset.commentDelete = comment.id;
      remove.setAttribute("aria-label", `Xóa ghi chú cho ${comment.anchorText}`);
      remove.textContent = "Xóa";
      meta.append(info, remove);
      card.append(preview, content, meta);
      this.commentsPanel.appendChild(card);
    }
  }

  insertTable(rows = 3, cols = 4) {
    this.flushTyping();
    this._initZones();
    let html = `<table style="width:100%; border-collapse:collapse; margin:14pt 0;"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += `<tr>`;
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid #94a3b8; padding:6pt 10pt;">${r === 0 ? "<strong>Tiêu đề</strong>" : "Dữ liệu"}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table><p><br></p>`;
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (sel && sel.rangeCount > 0 && this.bodyDom?.contains?.(sel.anchorNode)) {
          inserted = document.execCommand("insertHTML", false, html);
        }
      } catch {
        inserted = false;
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!inserted && targetDom) {
      targetDom.innerHTML = (targetDom.innerHTML || "") + html;
    }
    this.isDirty = true;
    this.recordSnapshot("writer.table.insert");
    return true;
  }

  _insertPageBreak() {
    this.flushTyping();
    this._initZones();
    const html = `<div style="page-break-before:always; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</div><p><br></p>`;
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (sel && sel.rangeCount > 0 && this.bodyDom?.contains?.(sel.anchorNode)) {
          inserted = document.execCommand("insertHTML", false, html);
        }
      } catch {
        inserted = false;
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!inserted && targetDom) {
      targetDom.innerHTML = (targetDom.innerHTML || "") + html;
    }
    this.isDirty = true;
    this.recordSnapshot("writer.page.break");
    return true;
  }

  activateHeader() {
    this.flushTyping();
    this._initZones();
    if (!this.headerDom) return false;
    let modified = false;
    if (!this.headerDom.innerText?.trim()) {
      this.headerDom.innerHTML = "<p style='text-align: center; font-size: 10pt; margin: 0;'>Tiêu đề đầu trang</p>";
      modified = true;
    }
    this.headerDom.focus();
    if (typeof window !== "undefined" && typeof document !== "undefined" && document.createRange) {
      try {
        const range = document.createRange();
        range.selectNodeContents(this.headerDom);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {}
    }
    this.isDirty = true;
    if (modified) {
      this.recordSnapshot("writer.header.insert");
    }
    return true;
  }

  activateFooter() {
    this.flushTyping();
    this._initZones();
    if (!this.footerDom) return false;
    let modified = false;
    if (!this.footerDom.innerText?.trim()) {
      this.footerDom.innerHTML = "<p style='text-align: center; font-size: 10pt; margin: 0;'>Trang 1 / 1</p>";
      modified = true;
    }
    this.footerDom.focus();
    if (typeof window !== "undefined" && typeof document !== "undefined" && document.createRange) {
      try {
        const range = document.createRange();
        range.selectNodeContents(this.footerDom);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {}
    }
    this.isDirty = true;
    if (modified) {
      this.recordSnapshot("writer.footer.insert");
    }
    return true;
  }

  _applyParagraphStyle(tag = "p") {
    this.flushTyping();
    const styleKey = String(tag || "p").toLowerCase().trim();

    let targetTag = "p";
    let addClass = "";

    if (styleKey === "h1" || styleKey === "heading1") {
      targetTag = "h1";
    } else if (styleKey === "h2" || styleKey === "heading2") {
      targetTag = "h2";
    } else if (styleKey === "h3" || styleKey === "heading3") {
      targetTag = "h3";
    } else if (styleKey === "quote" || styleKey === "trichdan" || styleKey === "blockquote") {
      targetTag = "blockquote";
      addClass = "vno-style-quote";
    } else if (styleKey === "emphasis" || styleKey === "nhanmanh") {
      targetTag = "p";
      addClass = "vno-style-emphasis";
    } else {
      targetTag = "p";
    }

    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        document.execCommand("formatBlock", false, `<${targetTag}>`);
      } catch {
        try {
          document.execCommand("formatBlock", false, targetTag);
        } catch {}
      }
    }

    this._updateCurrentBlockStyle(targetTag, addClass);

    this.isDirty = true;
    this.recordSnapshot("writer.style.apply");
    this._syncActiveStyleUI();
    return true;
  }

  _updateCurrentBlockStyle(targetTag, addClass) {
    if (typeof window === "undefined") return;
    const sel = window.getSelection ? window.getSelection() : null;
    let node = sel && sel.rangeCount > 0 ? sel.anchorNode : null;
    if (!node && this.bodyDom) {
      node = this.bodyDom.firstElementChild || this.bodyDom.firstChild;
    }
    if (!node) return;

    // Kiểm tra xem node có thực sự còn gắn trong bodyDom / editorDom không
    let isConnected = false;
    let check = node;
    while (check) {
      if (check === this.bodyDom || check === this.editorDom) {
        isConnected = true;
        break;
      }
      check = check.parentNode;
    }
    if (!isConnected && this.bodyDom) {
      node = this.bodyDom.firstElementChild || this.bodyDom.children?.[0] || this.bodyDom.firstChild;
    }
    if (!node) return;
    if (node.nodeType === 3) node = node.parentNode;

    let block = node;
    while (block && block !== this.bodyDom && block !== this.editorDom) {
      const tag = (block.tagName || "").toLowerCase();
      if (["p", "h1", "h2", "h3", "blockquote", "div", "li"].includes(tag)) {
        break;
      }
      block = block.parentNode;
    }

    if (!block || block === this.bodyDom || block === this.editorDom) {
      if (this.bodyDom && this.bodyDom.children && this.bodyDom.children.length > 0) {
        block = this.bodyDom.children[0];
      } else {
        return;
      }
    }

    // Chuyển đổi tag nếu khác targetTag (hoặc formatBlock không đổi element trong test mock)
    if (block.tagName && block.tagName.toLowerCase() !== targetTag.toLowerCase()) {
      if (typeof document !== "undefined" && document.createElement && block.parentNode) {
        const newBlock = document.createElement(targetTag);
        newBlock.innerHTML = block.innerHTML;
        if (block.className) {
          newBlock.className = block.className;
        }
        if (typeof block.parentNode.replaceChild === "function") {
          block.parentNode.replaceChild(newBlock, block);
        }
        block = newBlock;
      }
    }

    if (block) {
      block.classList?.remove?.("vno-style-quote");
      block.classList?.remove?.("vno-style-emphasis");
      if (addClass) {
        block.classList?.add?.(addClass);
      }
    }
  }

  getCurrentParagraphStyle() {
    if (typeof window === "undefined" || !window.getSelection) return "normal";
    const sel = window.getSelection();
    let node = (sel && sel.rangeCount > 0) ? sel.anchorNode : null;
    if (!node && this.bodyDom) {
      node = this.bodyDom.firstElementChild || this.bodyDom.firstChild;
    }
    if (!node) return "normal";
    if (node.nodeType === 3) node = node.parentNode;

    while (node && node !== this.bodyDom && node !== this.editorDom) {
      const tag = (node.tagName || "").toLowerCase();
      if (tag === "h1") return "h1";
      if (tag === "h2") return "h2";
      if (tag === "h3") return "h3";
      if (tag === "blockquote" || node.classList?.contains?.("vno-style-quote")) return "quote";
      if (node.classList?.contains?.("vno-style-emphasis")) return "emphasis";
      if (tag === "p") {
        if (node.classList?.contains?.("vno-style-quote")) return "quote";
        if (node.classList?.contains?.("vno-style-emphasis")) return "emphasis";
        return "normal";
      }
      node = node.parentNode;
    }
    return "normal";
  }

  toggleStyleGallery(options = null) {
    options = options || {};
    if (options.style) {
      return this._applyParagraphStyle(options.style);
    }
    const targetEl = options.targetEl ||
      (typeof document !== "undefined" ? document.querySelector('[data-command-id="writer.style.gallery"]') : null);
    const currentStyle = this.getCurrentParagraphStyle();
    return showStyleGalleryDropdown({
      targetEl,
      activeStyle: currentStyle,
      onSelectStyle: (styleId) => this._applyParagraphStyle(styleId)
    });
  }

  _bindStyleTracking() {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function" || this._styleSelectionHandler) return;
    this._styleSelectionHandler = () => this._syncActiveStyleUI();
    document.addEventListener("selectionchange", this._styleSelectionHandler);
    if (this.bodyDom?.addEventListener) {
      this.bodyDom.addEventListener("keyup", this._styleSelectionHandler);
      this.bodyDom.addEventListener("mouseup", this._styleSelectionHandler);
    }
  }

  _syncActiveStyleUI() {
    const currentStyle = this.getCurrentParagraphStyle();
    if (typeof document !== "undefined") {
      const selects = document.querySelectorAll ? document.querySelectorAll('select[data-command-id="writer.style.apply"]') : [];
      selects.forEach?.((sel) => {
        if (sel.value !== currentStyle) sel.value = currentStyle;
      });

      const cards = document.querySelectorAll ? document.querySelectorAll(".vno-style-gallery-dropdown .vno-style-card") : [];
      cards.forEach?.((card) => {
        const id = card.getAttribute?.("data-style-id");
        const isActive = (id === currentStyle) || (id === "normal" && currentStyle === "p");
        if (isActive) {
          card.classList?.add?.("is-active");
          if (!card.querySelector?.(".vno-style-card-check") && document.createElement) {
            const check = document.createElement("span");
            check.className = "vno-style-card-check";
            check.title = "Đang áp dụng";
            check.textContent = "✓";
            card.appendChild?.(check);
          }
        } else {
          card.classList?.remove?.("is-active");
          const check = card.querySelector?.(".vno-style-card-check");
          if (check && check.parentNode) check.parentNode.removeChild(check);
        }
      });

      const stripItems = document.querySelectorAll ? document.querySelectorAll(".vno-style-gallery-strip .vno-style-strip-item") : [];
      stripItems.forEach?.((item) => {
        const id = item.getAttribute?.("data-style-id");
        const isActive = (id === currentStyle) || (id === "normal" && currentStyle === "p");
        if (isActive) {
          item.classList?.add?.("is-active");
        } else {
          item.classList?.remove?.("is-active");
        }
      });
    }
  }

  // --- HÌNH MỜ (WATERMARK) ---

  setWatermark(watermarkData = null) {
    watermarkData = watermarkData || {};
    this.flushTyping();
    const text = String(watermarkData.text || "").trim();
    if (!text) {
      return this.clearWatermark();
    }
    this.watermark = {
      text,
      color: watermarkData.color || "#dc2626",
      opacity: typeof watermarkData.opacity === "number" ? watermarkData.opacity : 0.2,
      angle: typeof watermarkData.angle === "number" ? watermarkData.angle : 45,
      fontSize: watermarkData.fontSize || 72
    };
    this._applyWatermark();
    this.isDirty = true;
    this.recordSnapshot("writer.page.watermark");
    return true;
  }

  clearWatermark() {
    this.flushTyping();
    const hadWatermark = Boolean(this.watermark && this.watermark.text);
    this.watermark = null;
    this._applyWatermark();
    this.isDirty = true;
    if (hadWatermark) {
      this.recordSnapshot("writer.page.watermark.remove");
    }
    return true;
  }

  async openWatermarkDialog(options = null) {
    options = options || {};
    if (options.text !== undefined) {
      return this.setWatermark(options);
    }
    const result = await showWatermarkDialog(this.watermark);
    if (result === null) return false;
    if (result === "") return this.clearWatermark();
    return this.setWatermark(result);
  }

  _applyWatermark() {
    if (!this.editorDom) return;
    const existing = this.editorDom.querySelector?.(".vno-page-watermark") ||
      this.editorDom.querySelector?.('[data-vno-watermark="true"]');
    if (this.watermark && this.watermark.text) {
      const angle = this.watermark.angle ?? 45;
      const opacity = this.watermark.opacity ?? 0.2;
      const color = this.watermark.color || "#dc2626";
      const fontSize = this.watermark.fontSize || 72;
      const text = this.watermark.text;
      if (existing) {
        existing.innerHTML = `<div class="vno-watermark-text" style="transform:rotate(-${angle}deg); color:${color}; opacity:${opacity}; font-size:${fontSize}px;">${text}</div>`;
      } else {
        const wmEl = (typeof document !== "undefined" && document.createElement)
          ? document.createElement("div")
          : null;
        if (wmEl) {
          wmEl.className = "vno-page-watermark";
          wmEl.dataset.vnoWatermark = "true";
          wmEl.innerHTML = `<div class="vno-watermark-text" style="transform:rotate(-${angle}deg); color:${color}; opacity:${opacity}; font-size:${fontSize}px;">${text}</div>`;
          this.editorDom.appendChild(wmEl);
        }
      }
    } else {
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    }
  }

  // --- VIỀN TRANG (PAGE BORDER) ---

  setPageBorder(borderData = null) {
    borderData = borderData || {};
    this.flushTyping();
    if (borderData.enabled === false || borderData.style === "none") {
      return this.clearPageBorder();
    }
    this.pageBorder = {
      enabled: true,
      style: borderData.style || "solid",
      width: typeof borderData.width === "number" ? borderData.width : 2,
      color: borderData.color || "#0f4c81"
    };
    this._applyPageBorder();
    this.isDirty = true;
    this.recordSnapshot("writer.page.border");
    return true;
  }

  clearPageBorder() {
    this.flushTyping();
    const hadBorder = Boolean(this.pageBorder && this.pageBorder.enabled);
    this.pageBorder = {
      enabled: false,
      style: "none",
      width: 2,
      color: "#0f4c81"
    };
    this._applyPageBorder();
    this.isDirty = true;
    if (hadBorder) {
      this.recordSnapshot("writer.page.border.remove");
    }
    return true;
  }

  async openPageBorderDialog(options = null) {
    options = options || {};
    if (options.style !== undefined || options.enabled !== undefined) {
      return this.setPageBorder(options);
    }
    const result = await showPageBorderDialog(this.pageBorder);
    if (result === null) return false;
    if (result.enabled === false || result.style === "none") return this.clearPageBorder();
    return this.setPageBorder(result);
  }

  _applyPageBorder() {
    if (!this.editorDom) return;
    const existing = this.editorDom.querySelector?.(".vno-page-border-frame") ||
      this.editorDom.querySelector?.('[data-vno-page-border="true"]');
    if (this.pageBorder && this.pageBorder.enabled && this.pageBorder.style !== "none") {
      const style = this.pageBorder.style || "solid";
      const width = this.pageBorder.width ?? 2;
      const color = this.pageBorder.color || "#0f4c81";
      if (existing) {
        existing.style.border = `${width}pt ${style} ${color}`;
      } else {
        const borderEl = (typeof document !== "undefined" && document.createElement)
          ? document.createElement("div")
          : null;
        if (borderEl) {
          borderEl.className = "vno-page-border-frame";
          borderEl.dataset.vnoPageBorder = "true";
          borderEl.style.border = `${width}pt ${style} ${color}`;
          this.editorDom.appendChild(borderEl);
        }
      }
    } else {
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    }
  }

  _applyDecorations() {
    this._applyWatermark();
    this._applyPageBorder();
    this._applyColumns();
    this._renderShapes();
  }

  // --- HÌNH KHỐI (SHAPES) ---

  insertShape(options = null) {
    options = options || {};
    this.flushTyping();
    this._initZones();

    const shapeType = options.shapeType || options.type || "rectangle";
    const width = typeof options.width === "number" ? options.width : (typeof options.w === "number" ? options.w : 140);
    const height = typeof options.height === "number" ? options.height : (typeof options.h === "number" ? options.h : 80);
    const fill = options.fill || (shapeType === "line" ? "none" : shapeType === "circle" ? "#0ea5e9" : shapeType === "arrow" ? "#f59e0b" : "#2563eb");
    const stroke = options.stroke || (shapeType === "line" ? "#0f172a" : shapeType === "circle" ? "#0284c7" : shapeType === "arrow" ? "#d97706" : "#1d4ed8");
    const strokeWidth = options.strokeWidth || (shapeType === "line" ? 3 : 2);

    const shapeId = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const shape = {
      id: shapeId,
      type: shapeType,
      shapeType: shapeType,
      x: typeof options.x === "number" ? options.x : 100,
      y: typeof options.y === "number" ? options.y : (160 + ((this.shapes?.length || 0) * 25) % 250),
      w: width,
      h: height,
      width: width,
      height: height,
      fill: fill,
      stroke: stroke,
      strokeWidth: strokeWidth,
      text: typeof options.text === "string" ? options.text : undefined
    };

    if (!this.shapes) this.shapes = [];
    this.shapes.push(shape);
    this._renderShapes();
    this.isDirty = true;
    this.recordSnapshot("writer.shape.insert");
    return shape;
  }

  deleteShape(shapeId) {
    if (!shapeId || !this.shapes) return false;
    const idx = this.shapes.findIndex(s => s.id === shapeId);
    if (idx === -1) return false;
    this.shapes.splice(idx, 1);
    if (this.selectedShapeId === shapeId) this.selectedShapeId = null;
    this._renderShapes();
    this.isDirty = true;
    this.recordSnapshot("writer.shape.delete");
    return true;
  }

  moveShape(shapeId, newX, newY) {
    if (!shapeId || !this.shapes) return false;
    const shape = this.shapes.find(s => s.id === shapeId);
    if (!shape) return false;
    shape.x = Math.max(0, newX);
    shape.y = Math.max(0, newY);
    this._renderShapes();
    this.isDirty = true;
    this.recordSnapshot("writer.shape.move");
    return true;
  }

  _selectShape(shapeId) {
    this.selectedShapeId = shapeId;
    if (!this.editorDom || !this.editorDom.querySelectorAll) return;
    const items = this.editorDom.querySelectorAll(".vno-writer-shape-item");
    items.forEach(item => {
      const isCur = (item.dataset?.shapeId || (typeof item.getAttribute === "function" ? item.getAttribute("data-shape-id") : null)) === shapeId;
      if (isCur) {
        item.classList.add("is-selected");
      } else {
        item.classList.remove("is-selected");
      }
    });
  }

  _renderShapes() {
    if (!this.editorDom || typeof document === "undefined" || !document.createElement) return;
    let layer = this.editorDom.querySelector ? this.editorDom.querySelector(".vno-writer-shapes-layer") : null;
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "vno-writer-shapes-layer";
      this.editorDom.appendChild(layer);
    }
    layer.innerHTML = "";
    if (!this.shapes || !this.shapes.length) return;

    for (const shape of this.shapes) {
      const el = document.createElement("div");
      el.className = `vno-writer-shape-item ${shape.id === this.selectedShapeId ? "is-selected" : ""}`;
      el.dataset.shapeId = shape.id;
      el.dataset.shapeType = shape.type;
      el.style.cssText = `position:absolute; left:${shape.x}px; top:${shape.y}px; width:${shape.w}px; height:${shape.h}px; pointer-events:auto; cursor:move; user-select:none; z-index:10;`;

      const delBtn = `<button type="button" class="vno-shape-delete-btn" title="Xóa hình khối">&times;</button>`;
      const isTextBox = shape.type === "textbox" || shape.shapeType === "textbox";
      if (isTextBox) {
        el.classList.add("vno-writer-textbox");
        const text = String(shape.text || "Nhập văn bản").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        el.innerHTML = `<div class="vno-writer-textbox-body" contenteditable="true" role="textbox">${text}</div>${delBtn}<div class="vno-shape-resize-handle vno-handle-se" data-handle-dir="se"></div>`;
        const body = el.querySelector(".vno-writer-textbox-body");
        if (body?.addEventListener) {
          body.addEventListener("input", () => {
            shape.text = body.textContent || "";
            this.isDirty = true;
          });
          body.addEventListener("mousedown", (evt) => evt.stopPropagation());
        }
      } else {
        el.innerHTML = `${renderShapeSvg(shape)}${delBtn}`;
      }

      if (el.addEventListener) {
        el.addEventListener("mousedown", (e) => {
          if (e.target?.closest?.(".vno-shape-delete-btn")) return;
          if (e.target?.closest?.(".vno-writer-textbox-body")) return;
          if (e.target?.closest?.(".vno-shape-resize-handle")) return;
          this._selectShape(shape.id);
          const startMouseX = e.clientX;
          const startMouseY = e.clientY;
          const startX = shape.x;
          const startY = shape.y;
          let moved = false;

          const onMouseMove = (moveEvt) => {
            const dx = moveEvt.clientX - startMouseX;
            const dy = moveEvt.clientY - startMouseY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
            el.style.left = `${Math.max(0, startX + dx)}px`;
            el.style.top = `${Math.max(0, startY + dy)}px`;
          };

          const onMouseUp = (upEvt) => {
            if (typeof document !== "undefined") {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            }
            if (moved) {
              const dx = upEvt.clientX - startMouseX;
              const dy = upEvt.clientY - startMouseY;
              shape.x = Math.max(0, startX + dx);
              shape.y = Math.max(0, startY + dy);
              this.isDirty = true;
              this.recordSnapshot("writer.shape.move");
            }
          };

          if (typeof document !== "undefined") {
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          }
        });
      }

      const resizeHandle = el.querySelector?.(".vno-shape-resize-handle");
      if (resizeHandle?.addEventListener) {
        resizeHandle.addEventListener("mousedown", (event) => {
          event.stopPropagation();
          event.preventDefault();
          this._selectShape(shape.id);
          const startX = event.clientX;
          const startY = event.clientY;
          const origW = shape.w;
          const origH = shape.h;
          const onMove = (moveEvt) => {
            shape.w = Math.max(80, origW + (moveEvt.clientX - startX));
            shape.h = Math.max(40, origH + (moveEvt.clientY - startY));
            el.style.width = `${shape.w}px`;
            el.style.height = `${shape.h}px`;
          };
          const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            this.isDirty = true;
            this.recordSnapshot("writer.shape.resize");
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        });
      }

      layer.appendChild(el);
    }
  }

  // --- SƠ ĐỒ SMARTART (DIAGRAMS) ---

  insertDiagram(options = null) {
    options = options || {};
    this.flushTyping();
    this._initZones();

    const type = options.diagramType || options.type || "process";
    const opts = { ...options, type, diagramType: type };
    const html = generateDiagramHtml(opts);
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (sel && sel.rangeCount > 0 && this.bodyDom?.contains?.(sel.anchorNode)) {
          inserted = document.execCommand("insertHTML", false, html);
        }
      } catch {
        inserted = false;
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!inserted && targetDom) {
      targetDom.innerHTML = (targetDom.innerHTML || "") + html;
    }
    this.isDirty = true;
    this.recordSnapshot("writer.diagram.insert");
    return true;
  }

  // --- BIỂU ĐỒ MINH HỌA (CHARTS) ---

  insertChart(options = null) {
    options = options || {};
    this.flushTyping();
    this._initZones();

    const type = options.chartType || options.type || "bar";
    const opts = { ...options, type, chartType: type };
    const html = generateChartHtml(opts);
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (sel && sel.rangeCount > 0 && this.bodyDom?.contains?.(sel.anchorNode)) {
          inserted = document.execCommand("insertHTML", false, html);
        }
      } catch {
        inserted = false;
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!inserted && targetDom) {
      targetDom.innerHTML = (targetDom.innerHTML || "") + html;
    }
    this.isDirty = true;
    this.recordSnapshot("writer.chart.insert");
    return true;
  }

  // --- SIÊU LIÊN KẾT (HYPERLINK) ---

  insertHyperlink(options = null) {
    options = options || {};
    let url = typeof options === "string" ? options : options.url;
    let text = typeof options === "string" ? "" : options.text;

    if (!url) {
      url = "https://";
    }

    this.flushTyping();
    this._initZones();

    const targetDom = this.bodyDom || this.editorDom;
    const linkText = text || url;
    const safeUrl = String(url).replace(/"/g, "&quot;");
    const safeText = String(linkText).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${safeText}</a>`;

    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function" && !text) {
      try {
        const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed && this.bodyDom?.contains?.(sel.anchorNode)) {
          inserted = document.execCommand("createLink", false, safeUrl);
        }
      } catch {
        inserted = false;
      }
    }

    if (!inserted && targetDom) {
      if (typeof document !== "undefined" && typeof document.execCommand === "function") {
        try {
          const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
          if (sel && sel.rangeCount > 0 && this.bodyDom?.contains?.(sel.anchorNode)) {
            inserted = document.execCommand("insertHTML", false, linkHtml);
          }
        } catch {}
      }
      if (!inserted && targetDom.innerHTML !== undefined) {
        targetDom.innerHTML = (targetDom.innerHTML || "") + linkHtml;
      }
    }

    this.isDirty = true;
    this.recordSnapshot("common.edit.hyperlink");
    return true;
  }

  async _insertHyperlink(options = null) {
    options = options || {};
    let url = typeof options === "string" ? options : options.url;
    let text = typeof options === "string" ? "" : options.text;
    if (!url) {
      if (typeof window !== "undefined" && typeof document !== "undefined" && document.body) {
        const linkTitle = (typeof t === "function" && t("writerDialogs.hyperlink.title") !== "writerDialogs.hyperlink.title")
          ? t("writerDialogs.hyperlink.title")
          : "Chèn Liên Kết (Hyperlink)";
        const linkMsg = (typeof t === "function" && t("writerDialogs.hyperlink.message") !== "writerDialogs.hyperlink.message")
          ? t("writerDialogs.hyperlink.message")
          : "Nhập địa chỉ liên kết (URL):";
        url = await showPromptDialog({
          title: linkTitle,
          message: linkMsg,
          defaultValue: "https://",
          placeholder: "https://example.com"
        });
      }
      if (!url) return false;
    }
    return this.insertHyperlink({ url, text });
  }

  _escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  _insertHtmlAtCursor(html) {
    this.flushTyping();
    this._initZones();
    const targetDom = this.bodyDom || this.editorDom;
    let inserted = false;
    if (typeof document !== "undefined" && typeof window !== "undefined" && targetDom) {
      try {
        const sel = window.getSelection?.();
        if (sel && sel.rangeCount > 0 && targetDom.contains?.(sel.anchorNode) && document.createElement) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const temp = document.createElement("div");
          temp.innerHTML = html;
          const frag = document.createDocumentFragment();
          while (temp.firstChild) frag.appendChild(temp.firstChild);
          range.insertNode(frag);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          inserted = true;
        }
      } catch {
        inserted = false;
      }
    }
    if (!inserted && targetDom) {
      if (typeof targetDom.insertAdjacentHTML === "function") {
        targetDom.insertAdjacentHTML("beforeend", html);
      } else {
        targetDom.innerHTML = (targetDom.innerHTML || "") + html;
      }
    }
    this.isDirty = true;
    return true;
  }

  insertTextBox(options = null) {
    options = options || {};
    const text = typeof options.text === "string" ? options.text : "Nhập văn bản";
    return this.insertShape({
      type: "textbox",
      shapeType: "textbox",
      width: typeof options.width === "number" ? options.width : 220,
      height: typeof options.height === "number" ? options.height : 80,
      fill: "transparent",
      stroke: "#2563eb",
      text,
      x: typeof options.x === "number" ? options.x : 72,
      y: typeof options.y === "number" ? options.y : 120
    });
  }

  applyDropCap(options = null) {
    options = options || {};
    const lines = Math.max(2, Math.min(3, Number(options.lines) || 3));
    this.flushTyping();
    this._initZones();
    const targetDom = this.bodyDom || this.editorDom;
    if (!targetDom) return false;

    let para = null;
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const sel = window.getSelection?.();
      let node = sel && sel.anchorNode && targetDom.contains?.(sel.anchorNode) ? sel.anchorNode : null;
      if (node && node.nodeType === 3) node = node.parentElement;
      while (node && node !== targetDom) {
        const tag = node.tagName;
        if (tag === "P" || tag === "LI" || /^H[1-6]$/.test(tag)) {
          para = node;
          break;
        }
        node = node.parentElement;
      }
      if (!para && targetDom.querySelector) {
        para = targetDom.querySelector("p, li, h1, h2, h3");
      }
    }

    if (para && para.querySelector) {
      const existing = para.querySelector(".vno-drop-cap");
      if (existing) {
        const letter = existing.textContent || "";
        existing.replaceWith(document.createTextNode(letter));
        para.normalize?.();
        this.isDirty = true;
        this.recordSnapshot("writer.format.dropCap");
        return true;
      }
      const walkerText = para.textContent || "";
      const match = walkerText.match(/[A-Za-zÀ-ỹ0-9]/);
      if (!match) return false;
      const letter = match[0];
      const html = para.innerHTML || "";
      const idx = html.indexOf(letter);
      if (idx === -1) return false;
      para.innerHTML = `${html.slice(0, idx)}<span class="vno-drop-cap" data-drop-lines="${lines}">${this._escapeHtml(letter)}</span>${html.slice(idx + letter.length)}`;
      this.isDirty = true;
      this.recordSnapshot("writer.format.dropCap");
      return true;
    }

    const html = String(targetDom.innerHTML || "");
    if (html.includes("vno-drop-cap")) {
      targetDom.innerHTML = html.replace(/<span\b[^>]*class=["'][^"']*\bvno-drop-cap\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, "$1");
      this.isDirty = true;
      this.recordSnapshot("writer.format.dropCap");
      return true;
    }
    const replaced = html.replace(
      /(<(?:p|li|h[1-6])\b[^>]*>)(\s*)([^<\s])/i,
      `$1$2<span class="vno-drop-cap" data-drop-lines="${lines}">$3</span>`
    );
    if (replaced === html) return false;
    targetDom.innerHTML = replaced;
    this.isDirty = true;
    this.recordSnapshot("writer.format.dropCap");
    return true;
  }

  async insertDateTime(options = null) {
    options = options || {};
    let format = options.format;
    let text = options.text;
    const now = options.now instanceof Date ? options.now : new Date();
    if (!format && !text) {
      const picked = await showDateTimeDialog({ now, defaultFormat: "dd/MM/yyyy" });
      if (!picked) return false;
      format = picked.format;
      text = picked.text;
    }
    format = format || "dd/MM/yyyy";
    text = text || formatDateTime(now, format);
    const html = `<span class="vno-datetime" data-datetime-format="${this._escapeHtml(format)}">${this._escapeHtml(text)}</span>`;
    this._insertHtmlAtCursor(html);
    this.recordSnapshot("writer.insert.dateTime");
    return true;
  }

  async insertEquation(options = null) {
    options = options || {};
    let expression = options.expression || options.text;
    if (!expression) {
      expression = await showEquationDialog({ expression: "E = mc²" });
      if (!expression) return false;
    }
    const html = `<span class="vno-equation" role="math" data-equation="true">${this._escapeHtml(expression)}</span>`;
    this._insertHtmlAtCursor(html);
    this.recordSnapshot("writer.insert.equation");
    return true;
  }

  async insertSymbol(options = null) {
    options = options || {};
    let ch = options.char || options.symbol;
    if (!ch) {
      ch = await showSymbolPicker();
      if (!ch) return false;
    }
    this._insertHtmlAtCursor(this._escapeHtml(ch));
    this.recordSnapshot("writer.insert.symbol");
    return true;
  }

  _uniqueBookmarkId(baseId) {
    const targetDom = this.bodyDom || this.editorDom;
    let id = baseId;
    let n = 2;
    const html = String(targetDom?.innerHTML || "");
    while (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) {
      id = `${baseId}-${n}`;
      n += 1;
    }
    return id;
  }

  async insertBookmark(options = null) {
    options = options || {};
    let name = options.name;
    if (!name) {
      name = await showBookmarkDialog({ name: "bookmark1" });
      if (!name) return false;
    }
    const id = this._uniqueBookmarkId(slugBookmarkName(name));
    const html = `<a id="${this._escapeHtml(id)}" class="vno-bookmark" data-bookmark-name="${this._escapeHtml(name)}"></a>`;
    this._insertHtmlAtCursor(html);
    this.recordSnapshot("writer.insert.bookmark");
    return { id, name };
  }

  listCrossReferenceTargets() {
    const targets = [];
    const targetDom = this.bodyDom || this.editorDom;
    if (targetDom?.querySelectorAll) {
      const headings = targetDom.querySelectorAll("h1, h2, h3");
      headings.forEach((el, index) => {
        const label = (el.textContent || "").trim();
        if (!label) return;
        if (!el.id) el.id = this._uniqueBookmarkId(slugBookmarkName(`heading-${index + 1}-${label}`));
        targets.push({ id: el.id, type: "heading", label });
      });
      targetDom.querySelectorAll("a.vno-bookmark").forEach((el) => {
        const id = el.id || el.getAttribute("data-bookmark-name");
        if (!id) return;
        if (!el.id) el.id = id;
        targets.push({
          id,
          type: "bookmark",
          label: el.getAttribute("data-bookmark-name") || id
        });
      });
      return targets;
    }

    const html = String(targetDom?.innerHTML || "");
    const headingRe = /<(h[1-3])([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match;
    let headingIndex = 0;
    while ((match = headingRe.exec(html))) {
      const label = String(match[3] || "").replace(/<[^>]+>/g, "").trim();
      if (!label) continue;
      headingIndex += 1;
      const idMatch = /id=["']([^"']+)["']/.exec(match[2] || "");
      targets.push({
        id: idMatch ? idMatch[1] : slugBookmarkName(`heading-${headingIndex}-${label}`),
        type: "heading",
        label
      });
    }
    const bookmarkRe = /<a\b[^>]*class=["'][^"']*\bvno-bookmark\b[^"']*["'][^>]*>/gi;
    while ((match = bookmarkRe.exec(html))) {
      const tag = match[0];
      const idMatch = /id=["']([^"']+)["']/.exec(tag);
      const nameMatch = /data-bookmark-name=["']([^"']+)["']/.exec(tag);
      const id = (idMatch && idMatch[1]) || (nameMatch && nameMatch[1]);
      if (!id) continue;
      targets.push({ id, type: "bookmark", label: (nameMatch && nameMatch[1]) || id });
    }
    return targets;
  }

  async insertCrossReference(options = null) {
    options = options || {};
    let targetId = options.targetId || options.id;
    let display = options.display || options.text;
    let type = options.type || "bookmark";
    if (!targetId) {
      const picked = await showCrossReferenceDialog(this.listCrossReferenceTargets());
      if (!picked) return false;
      targetId = picked.targetId;
      display = picked.display;
      type = picked.type;
    }
    if (!targetId) return false;
    display = display || targetId;
    const html = `<a href="#${this._escapeHtml(targetId)}" class="vno-cross-ref" data-xref-type="${this._escapeHtml(type)}">${this._escapeHtml(display)}</a>`;
    this._insertHtmlAtCursor(html);
    this.recordSnapshot("writer.insert.crossReference");
    return true;
  }

  // --- ĐỊNH DẠNG TÀI LIỆU & CHỦ ĐỀ (DOCUMENT THEMES) ---

  async openThemeGalleryDialog(options = null) {
    options = options || {};
    const currentTheme = typeof options === "string" ? options : (options.themeId || this.documentTheme || "office");
    const chosenTheme = await showThemeGalleryDialog(currentTheme);
    if (!chosenTheme) return false;
    return this.applyDocumentTheme(chosenTheme, true);
  }

  applyDocumentTheme(themeId = "office", record = true) {
    if (record) {
      this.flushTyping();
    }
    this._initZones();

    const theme = DOCUMENT_THEMES.find(t => t.id === themeId) || DOCUMENT_THEMES[0];
    this.documentTheme = theme.id;

    const target = this.bodyDom || this.editorDom;
    if (target) {
      if (target.style) {
        target.style.fontFamily = theme.fontFamily;
        target.style.lineHeight = theme.lineHeight;
        target.style.color = theme.bodyColor;
      }
      if (target.dataset) {
        target.dataset.vnoTheme = theme.id;
      }
      if (typeof target.setAttribute === "function") {
        try {
          target.setAttribute("data-vno-theme", theme.id);
        } catch {}
      }
    }

    this.isDirty = true;
    if (record) {
      this.recordSnapshot("writer.design.themeGallery");
    }
    return true;
  }

  // --- CHIA CỘT VĂN BẢN (COLUMNS) ---

  setColumns(columnsData = null) {
    columnsData = columnsData || {};
    this.flushTyping();
    this._initZones();

    const count = Math.max(1, Math.min(4, Number(columnsData.count) || 1));
    const gap = typeof columnsData.gap === "number" ? columnsData.gap : (parseFloat(columnsData.gap) || 10);
    const rule = Boolean(columnsData.rule);

    this.columns = {
      count,
      gap: count > 1 ? gap : 0,
      rule: count > 1 ? rule : false
    };

    this._applyColumns();
    this.isDirty = true;
    this.recordSnapshot(count > 1 ? `writer.page.columns.${count}` : "writer.page.columns.reset");
    return this.columns;
  }

  clearColumns() {
    return this.setColumns({ count: 1, gap: 0, rule: false });
  }

  async openColumnsDialog(options = null) {
    options = options || {};
    if (options.count !== undefined && !options.openDialog) {
      return this.setColumns(options);
    }
    const result = await showColumnsDialog(this.columns);
    if (result === null) return null;
    return this.setColumns(result);
  }

  _applyColumns() {
    this._initZones();
    const target = this.bodyDom || this.editorDom;
    if (!target) return;

    const config = this.columns || { count: 1 };
    const count = Math.max(1, Math.min(4, Number(config.count) || 1));
    const gap = config.gap ?? 10;
    const rule = config.rule;

    if (!target.style) {
      target.style = {};
    }
    if (!target.dataset) {
      target.dataset = {};
    }

    if (count > 1) {
      const gapStr = typeof gap === "number" ? `${gap}mm` : String(gap);
      const ruleStr = rule ? (typeof rule === "string" ? rule : "1px solid #94a3b8") : "none";

      target.style.columnCount = String(count);
      target.style.webkitColumnCount = String(count);
      target.style.columnGap = gapStr;
      target.style.webkitColumnGap = gapStr;
      target.style.columnRule = ruleStr;
      target.style.webkitColumnRule = ruleStr;

      target.dataset.vnoColumnCount = String(count);
      if (target.classList) {
        target.classList.add?.("vno-columns-active");
        target.classList.toggle?.("vno-columns-2", count === 2);
        target.classList.toggle?.("vno-columns-3", count === 3);
        target.classList.toggle?.("vno-columns-4", count === 4);
      }
    } else {
      target.style.columnCount = "";
      target.style.webkitColumnCount = "";
      target.style.columnGap = "";
      target.style.webkitColumnGap = "";
      target.style.columnRule = "";
      target.style.webkitColumnRule = "";

      delete target.dataset.vnoColumnCount;
      if (target.classList) {
        target.classList.remove?.("vno-columns-active");
        target.classList.remove?.("vno-columns-2");
        target.classList.remove?.("vno-columns-3");
        target.classList.remove?.("vno-columns-4");
      }
    }
  }

  _toggleFormatPainter() {
    if (typeof window === "undefined") return false;
    if (!this.copiedFormat) {
      const sel = window.getSelection?.();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.anchorNode;
      if (node && node.nodeType === 3) node = node.parentNode;
      if (!node) return false;

      const style = window.getComputedStyle(node);
      this.copiedFormat = {
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecorationLine || style.textDecoration,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize
      };

      globalCommandBus.updateState("common.edit.formatPainter", { checked: true });
      this.editorDom?.classList?.add("vno-format-painter-active");

      const onMouseUp = () => {
        setTimeout(() => {
          const activeSel = window.getSelection?.();
          if (activeSel && !activeSel.isCollapsed && this.copiedFormat) {
            this._applyCopiedFormat();
          }
        }, 20);
      };
      document.addEventListener("mouseup", onMouseUp, { once: true });
      return true;
    } else {
      const sel = window.getSelection?.();
      if (sel && !sel.isCollapsed) {
        this._applyCopiedFormat();
      } else {
        this._clearFormatPainter();
      }
      return true;
    }
  }

  _applyCopiedFormat() {
    this.flushTyping();
    if (!this.copiedFormat || typeof document === "undefined") return;
    const fmt = this.copiedFormat;
    const isBold = fmt.fontWeight === "bold" || parseInt(fmt.fontWeight, 10) >= 600;
    const isItalic = fmt.fontStyle === "italic";
    const isUnderline = (fmt.textDecoration || "").includes("underline");

    if (isBold && !document.queryCommandState("bold")) document.execCommand("bold");
    if (!isBold && document.queryCommandState("bold")) document.execCommand("bold");

    if (isItalic && !document.queryCommandState("italic")) document.execCommand("italic");
    if (!isItalic && document.queryCommandState("italic")) document.execCommand("italic");

    if (isUnderline && !document.queryCommandState("underline")) document.execCommand("underline");
    if (!isUnderline && document.queryCommandState("underline")) document.execCommand("underline");

    if (fmt.color) document.execCommand("foreColor", false, fmt.color);
    if (fmt.backgroundColor && fmt.backgroundColor !== "transparent" && fmt.backgroundColor !== "rgba(0, 0, 0, 0)") {
      document.execCommand("hiliteColor", false, fmt.backgroundColor);
    }
    if (fmt.fontFamily) document.execCommand("fontName", false, fmt.fontFamily);

    this._clearFormatPainter();
    this.isDirty = true;
    this.recordSnapshot("common.edit.formatPainter");
  }

  _clearFormatPainter() {
    this.copiedFormat = null;
    globalCommandBus.updateState("common.edit.formatPainter", { checked: false });
    this.editorDom?.classList?.remove("vno-format-painter-active");
  }

  _setLineHeight(val) {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;
      while (node && node !== this.editorDom && node.tagName !== "P" && node.tagName !== "DIV") {
        node = node.parentNode;
      }
      if (node && node !== this.editorDom) {
        node.style.lineHeight = val;
      }
    }
  }

  _adjustFontSize(delta) {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;
      const curSize = parseInt(window.getComputedStyle(node).fontSize) || 16;
      const nextSize = Math.max(8, Math.min(72, curSize + delta * 2));
      document.execCommand("fontSize", false, "7");
      const fontElements = this.editorDom.getElementsByTagName("font");
      for (let i = 0; i < fontElements.length; i++) {
        if (fontElements[i].size === "7") {
          fontElements[i].removeAttribute("size");
          fontElements[i].style.fontSize = `${nextSize}px`;
        }
      }
    }
  }

  async _pastePlainText() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) document.execCommand("insertText", false, text);
    } catch {
      document.execCommand("paste");
    }
  }

  _insertImageDialog() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.flushTyping();
          const imgHtml = `<img src="${evt.target.result}" style="max-width:100%; height:auto; margin:10pt 0; box-shadow:0 2px 8px rgba(0,0,0,0.15);" /><p><br></p>`;
          document.execCommand("insertHTML", false, imgHtml);
          this.isDirty = true;
          this.recordSnapshot("writer.image.insert");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  _showFindReplaceDialog(isReplace = false) {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    showFindReplaceDialog({
      isReplace,
      onFind: (text) => {
        if (typeof window !== "undefined" && window.find) {
          window.find(text);
        }
      },
      onReplace: (findText, repText) => {
        if (findText && repText !== null) {
          this.flushTyping();
          const content = this.editorDom.innerHTML;
          const idx = content.indexOf(findText);
          if (idx !== -1) {
            this.editorDom.innerHTML = content.substring(0, idx) + repText + content.substring(idx + findText.length);
            this.isDirty = true;
            this.recordSnapshot("common.edit.replace");
          }
        }
      },
      onReplaceAll: (findText, repText) => {
        if (findText && repText !== null) {
          this.flushTyping();
          this.editorDom.innerHTML = this.editorDom.innerHTML.split(findText).join(repText);
          this.isDirty = true;
          this.recordSnapshot("common.edit.replaceAll");
        }
      }
    });
  }

  /**
   * Nội dung HTML thật sự gửi cho LibreOffice để lưu/xuất — có kèm `@page` CSS của
   * Page Setup hiện tại, để khổ giấy/lề trong DOCX/PDF xuất ra khớp với canvas.
   * Đặt `<style>` ở đầu body thay vì head vì bộ dispatch hiện chỉ truyền 1 chuỗi
   * nội dung (xem `main.py: save_document_dialog` bọc `<body>{content}</body>`) —
   * trình phân tích HTML của LibreOffice vẫn áp dụng đúng CSS ở vị trí này.
   */
  _contentForExport() {
    this._initZones();
    let bodyHtml = "";
    let headerHtml = "";
    let footerHtml = "";
    let watermarkHtml = "";

    if (this.watermark && this.watermark.text) {
      const angle = this.watermark.angle ?? 45;
      const opacity = this.watermark.opacity ?? 0.2;
      const color = this.watermark.color || "#dc2626";
      const fontSize = this.watermark.fontSize || 72;
      watermarkHtml = `<div class="vno-export-watermark" style="position:fixed;top:35%;left:10%;width:80%;text-align:center;transform:rotate(-${angle}deg);opacity:${opacity};font-size:${fontSize}pt;color:${color};font-weight:900;font-family:sans-serif;pointer-events:none;z-index:-10;">${this.watermark.text}</div>\n`;
    }

    if (this.headerDom && this.headerDom.innerText?.trim()) {
      headerHtml = `<div title="header">\n${this.headerDom.innerHTML}\n</div>\n`;
    }

    if (this.bodyDom) {
      bodyHtml = this._stripSessionMarkup(this.bodyDom.innerHTML);
    } else if (this.editorDom) {
      bodyHtml = this._stripSessionMarkup(this.editorDom.innerHTML);
    }

    if (this.footerDom && this.footerDom.innerText?.trim()) {
      footerHtml = `\n<div title="footer">\n${this.footerDom.innerHTML}\n</div>`;
    }

    let columnsCss = "";
    let bodyExportHtml = bodyHtml;
    if (this.columns && this.columns.count > 1) {
      const colCount = this.columns.count;
      const colGap = typeof this.columns.gap === "number" ? `${this.columns.gap}mm` : (this.columns.gap || "10mm");
      const colRule = this.columns.rule ? (typeof this.columns.rule === "string" ? this.columns.rule : "1px solid #94a3b8") : "none";
      columnsCss = `\n.vno-writer-body, .vno-writer-columns-content, body { column-count: ${colCount}; -webkit-column-count: ${colCount}; column-gap: ${colGap}; -webkit-column-gap: ${colGap}; ${this.columns.rule ? `column-rule: ${colRule}; -webkit-column-rule: ${colRule};` : ''} }`;
      bodyExportHtml = `<div class="vno-writer-columns-content vno-writer-body" style="column-count:${colCount};-webkit-column-count:${colCount};column-gap:${colGap};-webkit-column-gap:${colGap};${this.columns.rule ? `column-rule:${colRule};-webkit-column-rule:${colRule};` : ''}">${bodyHtml}</div>`;
    }

    let shapesHtml = "";
    if (this.shapes && this.shapes.length) {
      shapesHtml = `<div class="vno-export-shapes" style="position:relative; width:100%; height:0; overflow:visible;">\n` +
        this.shapes.map(s => {
          const inner = (s.type === "textbox" || s.shapeType === "textbox")
            ? `<div class="vno-writer-textbox-body">${this._escapeHtml(s.text || "")}</div>`
            : renderShapeSvg(s);
          return `  <div style="position:absolute; left:${s.x}px; top:${s.y}px; width:${s.w}px; height:${s.h}px;">${inner}</div>\n`;
        }).join("") +
        `</div>\n`;
    }

    const fullHtml = `${watermarkHtml}${shapesHtml}${headerHtml}${bodyExportHtml}${footerHtml}`;
    return `<style>${this._getPageSetupCss()}${columnsCss}</style>${fullHtml}`;
  }

  _stripCommentMarkup(html) {
    return String(html || "").replace(
      /<mark\b(?=[^>]*\bdata-comment-id=(?:"[^"]*"|'[^']*'))[^>]*>([\s\S]*?)<\/mark>/gi,
      "$1"
    );
  }

  _stripSessionMarkup(html) {
    const withoutComments = this._stripCommentMarkup(html);
    return withoutComments
      .replace(/<del\b(?=[^>]*\bdata-vno-change=(?:"delete"|'delete'))[^>]*>[\s\S]*?<\/del>/gi, "")
      .replace(/<ins\b(?=[^>]*\bdata-vno-change=(?:"insert"|'insert'))[^>]*>([\s\S]*?)<\/ins>/gi, "$1")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-toc-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-note-delete-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-diagram-delete-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-chart-delete-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<div\b[^>]*class=["'][^"']*\bvno-page-watermark\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*class=["'][^"']*\bvno-page-border-frame\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*class=["'][^"']*\bvno-writer-shapes-layer\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*data-vno-watermark=["']true["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*data-vno-page-border=["']true["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/\s*\bvno-merge-preview\b/gi, "")
      .replace(/<div\b[^>]*data-vno-auto-page-gap=["']true["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<span\b[^>]*data-vno-format-mark=["'][^"']+["'][^>]*>([\s\S]*?)<\/span>/gi, "$1");
  }

  /**
   * Loại bỏ các dải ngăn trang tự động (`_recomputeLivePagination()`) khỏi HTML —
   * dùng khi lưu snapshot Undo/Redo. Các dải này là dữ liệu SUY RA (derived) từ chiều
   * cao đo được, không phải nội dung người dùng gõ, nên không được coi là một phần
   * thay đổi thực chất khi so sánh snapshot (`_isSnapshotEqual`) — nếu không loại bỏ,
   * việc đo lại chiều cao (vd font web tải xong sau) có thể tạo khác biệt string giả,
   * gây bước Undo thừa không tương ứng với thao tác thật nào của người dùng.
   */
  _stripAutoPageGaps(html) {
    return String(html || "")
      .replace(/<div\b[^>]*data-vno-auto-page-gap=["']true["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<span\b[^>]*data-vno-format-mark=["'][^"']+["'][^>]*>([\s\S]*?)<\/span>/gi, "$1");
  }

  /**
   * Lưu tài liệu thành tệp DOCX thật trên đĩa (qua LibreOffice headless engine).
   * V1: luôn mở hộp thoại chọn nơi lưu (chưa lưu ngầm vào đường dẫn cũ) — sẽ tối ưu ở bản sau.
   */
  async save() {
    this.documentContent = this.editorDom ? this.editorDom.innerHTML : "";
    const result = await globalUnoBridge.saveRealFile("writer", this._contentForExport(), "docx", this.sourceFileName);
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
   * Mở một tệp DOCX/ODT thật từ đĩa, thay thế nội dung soạn thảo hiện tại.
   */
  async open() {
    const result = await globalUnoBridge.openRealFile("writer");
    if (result.status === "ok") {
      this._initZones();
      // Comments chỉ thuộc tài liệu đang mở trong phiên; file khác không dùng lại anchor cũ.
      this.comments = [];
      this.trackChangesEnabled = false;
      this.activeCommentId = null;
      this._renderCommentsPanel();
      const imported = this._normalizeImportedHtml(
        result.content || "",
        result.ooxmlDocumentXml,
        result.ooxmlCommentsXml
      );
      if (imported.page) {
        this.pageSetup = {
          size: imported.page.size || this.pageSetup.size,
          orientation: imported.page.orientation || this.pageSetup.orientation,
          margins: { ...this.pageSetup.margins, ...imported.page.margins }
        };
        this._applyPageSetup();
      }

      if (this.headerDom && this.bodyDom && this.footerDom) {
        this.headerDom.innerHTML = imported.header;
        this.bodyDom.innerHTML = imported.body;
        this.footerDom.innerHTML = imported.footer;
      } else if (this.bodyDom) {
        this.bodyDom.innerHTML = imported.body;
      } else if (this.editorDom) {
        this.editorDom.innerHTML = imported.body;
      }

      if (imported.comments?.length) {
        this.comments = imported.comments;
        this._commentSequence = Math.max(this._commentSequence, imported.comments.length);
        this._renderCommentsPanel();
      }

      this.documentContent = this.editorDom ? this.editorDom.innerHTML : raw;
      this.sourceFileName = (result.fileName || "TaiLieu").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
      this._updateTrackChangesCommandState();
      this.clearUndoRedo();
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể mở tệp", message: result.message, type: "error" });
    return false;
  }

  /**
   * Tạo tài liệu mới trắng hoặc đóng tài liệu hiện tại, làm sạch vùng soạn thảo và các trạng thái trang.
   */
  async newDocument() {
    this._initZones();
    this.comments = [];
    this.trackChangesEnabled = false;
    this.activeCommentId = null;
    this._renderCommentsPanel?.();

    if (this.headerDom) this.headerDom.innerHTML = "";
    if (this.footerDom) this.footerDom.innerHTML = "";
    if (this.bodyDom) {
      this.bodyDom.innerHTML = "<p><br></p>";
    } else if (this.editorDom) {
      this.editorDom.innerHTML = "<p><br></p>";
    }

    this.clearWatermark?.();
    this.clearPageBorder?.();
    this.setColumns?.({ count: 1, gap: 0, rule: false });

    this.mailMergeData = { fields: [], records: [], rawCsv: "" };
    this.mailMergePreview = { enabled: false, recordIndex: 0 };
    this._updateMailMergeCommandStates?.();

    this.documentContent = this.editorDom ? this.editorDom.innerHTML : "";
    this.sourceFileName = "TaiLieu";
    this.isDirty = false;
    this._updateTrackChangesCommandState?.();
    this.clearUndoRedo?.();
    this.shell?.resetDocumentChrome?.("Tài liệu 1.docx");
    this._recomputeLivePagination?.();
    this.editorDom?.focus?.();
    return true;
  }

  async closeDocument() {
    return await this.newDocument();
  }

  async exportPdf() {
    this.documentContent = this.editorDom.innerHTML;
    const result = await globalUnoBridge.exportRealPdf("writer", this._contentForExport(), this.sourceFileName);
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

  /**
   * Tính toán kích thước, lề trang và kích thước vùng in thực tế (px & mm)
   * dựa trên cấu hình Page Setup hiện tại của tài liệu.
   */
  getPageDimensions() {
    const base = PAGE_SIZES_MM[this.pageSetup?.size] || PAGE_SIZES_MM.a4;
    const isLandscape = this.pageSetup?.orientation === "landscape";
    const widthMm = isLandscape ? base.h : base.w;
    const heightMm = isLandscape ? base.w : base.h;
    const margins = this.pageSetup?.margins || DEFAULT_MARGINS_MM;
    const { top, right, bottom, left } = margins;

    const widthPx = Math.round(widthMm * MM_TO_PX);
    const heightPx = Math.round(heightMm * MM_TO_PX);
    const topPx = Math.round(top * MM_TO_PX);
    const rightPx = Math.round(right * MM_TO_PX);
    const bottomPx = Math.round(bottom * MM_TO_PX);
    const leftPx = Math.round(left * MM_TO_PX);

    const printableWidthPx = Math.max(100, widthPx - leftPx - rightPx);
    const printableHeightPx = Math.max(100, heightPx - topPx - bottomPx);

    return {
      base,
      sizeKey: this.pageSetup?.size || "a4",
      sizeLabel: base.label,
      isLandscape,
      orientation: this.pageSetup?.orientation || "portrait",
      orientationLabel: isLandscape ? "Ngang (Landscape)" : "Dọc (Portrait)",
      widthMm,
      heightMm,
      widthPx,
      heightPx,
      margins,
      topPx,
      rightPx,
      bottomPx,
      leftPx,
      printableWidthPx,
      printableHeightPx
    };
  }

  /**
   * Nguồn duy nhất cho chiều cao thân trang mà cả live pagination và Print Preview sử dụng.
   * Header/footer chỉ chiếm chỗ khi thực sự có nội dung, giống cách chúng được render.
   */
  _getUsablePageHeight(dim = this.getPageDimensions()) {
    const hasHeader = Boolean(this.headerDom && this.headerDom.innerText?.trim());
    const hasFooter = Boolean(this.footerDom && this.footerDom.innerText?.trim());
    const headerReservedPx = hasHeader ? 46 : 0;
    const footerReservedPx = hasFooter ? 48 : 0;
    return Math.max(150, dim.printableHeightPx - headerReservedPx - footerReservedPx);
  }

  /**
   * Phân trang nội dung tài liệu dựa trên chiều cao trang in khả dụng và ngắt trang thủ công.
   * @param {string} bodyHtml Nội dung HTML của phần thân tài liệu
   * @param {number} availableHeightPx Chiều cao vùng thân trang (đã trừ lề, header, footer)
   * @param {number} printableWidthPx Chiều rộng vùng in khả dụng
   * @returns {string[]} Danh sách chuỗi HTML tương ứng với từng trang
   */
  paginateContent(bodyHtml, availableHeightPx, printableWidthPx, columns = null) {
    if (!bodyHtml || !bodyHtml.trim()) {
      return ["<p><br></p>"];
    }

    const activeCols = columns || this.columns;
    const colCount = (activeCols && activeCols.count > 1) ? activeCols.count : 1;
    const gapMm = (activeCols && typeof activeCols.gap === "number") ? activeCols.gap : 10;
    const gapPx = gapMm * MM_TO_PX;
    const effectiveAvailableHeightPx = colCount > 1 ? availableHeightPx * colCount * 0.95 : availableHeightPx;
    const colWidthPx = colCount > 1 ? Math.max(100, (printableWidthPx - gapPx * (colCount - 1)) / colCount) : printableWidthPx;

    let blocks = [];
    let measurementHost = null;
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.className = "vno-writer-body vno-pagination-measurement-host";
      temp.setAttribute?.("aria-hidden", "true");
      if (temp.style) {
        temp.style.position = "absolute";
        temp.style.visibility = "hidden";
        temp.style.pointerEvents = "none";
        temp.style.left = "-100000px";
        temp.style.top = "0";
        temp.style.width = `${colWidthPx}px`;
        temp.style.height = "auto";
        temp.style.columnCount = "1";
        temp.style.webkitColumnCount = "1";
      }
      temp.innerHTML = bodyHtml;
      // Phải gắn vào DOM thật để Chromium tính wrapping, line-height và offsetHeight.
      // Gắn dưới trang Writer giúp thừa kế đúng typography của tài liệu.
      const measurementParent = this.editorDom?.appendChild ? this.editorDom : document.body;
      if (measurementParent?.appendChild) {
        measurementParent.appendChild(temp);
        measurementHost = temp;
      }
      if (temp.children && temp.children.length > 0) {
        blocks = Array.from(temp.children);
      } else if (temp.childNodes && temp.childNodes.length > 0) {
        blocks = Array.from(temp.childNodes).map(node => {
          if (node.nodeType === 1) return node;
          const p = document.createElement("p");
          p.textContent = node.textContent || "";
          return p;
        });
      }
    }

    // Fallback cho môi trường không có DOM đầy đủ (test hoặc headless string)
    if (blocks.length === 0) {
      const rawParts = bodyHtml.split(/(?=<p\b|<div\b|<table\b|<h[1-6]\b|<ul\b|<ol\b|<blockquote\b)/gi).filter(Boolean);
      blocks = rawParts.map(part => {
        const div = typeof document !== "undefined" && document.createElement ? document.createElement("div") : {
          innerHTML: part,
          textContent: part.replace(/<[^>]+>/g, ""),
          getAttribute: (attr) => (attr === "style" ? (part.match(/style="([^"]*)"/i)?.[1] || "") : "")
        };
        if (div.innerHTML !== undefined) div.innerHTML = part;
        return div;
      });
    }

    const pages = [];
    let currentPageHtmls = [];
    let currentHeight = 0;

    const estimateHeight = (el) => {
      if (el.offsetHeight && el.offsetHeight > 0) {
        return el.offsetHeight;
      }
      const tagName = (el.tagName || "").toUpperCase();
      const text = (el.textContent || el.innerText || "").trim();

      if (tagName === "TABLE") {
        let rows = 1;
        if (el.querySelectorAll) {
          rows = el.querySelectorAll("tr").length || 1;
        } else if (el.innerHTML) {
          rows = (el.innerHTML.match(/<tr\b/gi) || []).length || 1;
        }
        return rows * 36 + 24;
      }
      if (tagName === "H1") return 60;
      if (tagName === "H2") return 48;
      if (tagName === "H3") return 40;
      if (el.dataset?.vnoToc === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-toc") === "true")) {
        let items = 2;
        if (el.querySelectorAll) items = el.querySelectorAll(".vno-toc-item").length || 2;
        return 40 + items * 26 + 16;
      }
      if (tagName === "UL" || tagName === "OL") {
        let items = 3;
        if (el.querySelectorAll) items = el.querySelectorAll("li").length || 3;
        return items * 26 + 16;
      }
      if (tagName === "IMG") return 250;

      // Đoạn văn mặc định
      const charsPerLine = Math.max(20, Math.floor(colWidthPx / 8.5));
      const lines = text ? Math.max(1, Math.ceil(text.length / charsPerLine)) : 1;
      return lines * 26 + 10;
    };

    for (const el of blocks) {
      if (el.dataset?.vnoFootnotes === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-footnotes") === "true") ||
          el.dataset?.vnoEndnotes === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-endnotes") === "true")) {
        continue;
      }

      const styleStr = (typeof el.getAttribute === "function" ? el.getAttribute("style") : (el.style ? JSON.stringify(el.style) : "")) || "";
      const textContent = el.textContent || el.innerText || "";
      const isExplicitBreak = styleStr.includes("page-break-before") ||
                              styleStr.includes("break-before") ||
                              textContent.includes("Phân tách trang");

      if (isExplicitBreak) {
        if (currentPageHtmls.length > 0) {
          pages.push(currentPageHtmls.join("\n"));
          currentPageHtmls = [];
          currentHeight = 0;
        }
        // Chỉ bỏ qua nếu là phần tử phân tách trang chuyên biệt
        if (textContent.includes("Phân tách trang") || (el.tagName || "").toUpperCase() === "HR") {
          continue;
        }
      }

      const h = estimateHeight(el);
      const elHtml = el.outerHTML || el.innerHTML || `<p>${textContent}</p>`;

      if (currentHeight + h > availableHeightPx && currentPageHtmls.length > 0) {
        pages.push(currentPageHtmls.join("\n"));
        currentPageHtmls = [elHtml];
        currentHeight = h;
      } else {
        currentPageHtmls.push(elHtml);
        currentHeight += h;
      }
    }

    if (currentPageHtmls.length > 0 || pages.length === 0) {
      pages.push(currentPageHtmls.length > 0 ? currentPageHtmls.join("\n") : "<p><br></p>");
    }

    if (measurementHost?.parentNode?.removeChild) {
      measurementHost.parentNode.removeChild(measurementHost);
    }

    return pages;
  }

  /**
   * Mở Overlay Print Preview hiển thị bản xem trước THẬT của tài liệu.
   * Dựa trên _getPageSetupCss() và _contentForExport() chuẩn xác.
   */
  openPrintPreview() {
    if (typeof document === "undefined") return null;

    if (this.printPreviewOverlay) {
      this.closePrintPreview();
    }

    this._initZones();
    const dim = this.getPageDimensions();

    let headerHtml = "";
    if (this.headerDom && this.headerDom.innerText?.trim()) {
      headerHtml = this.headerDom.innerHTML;
    }

    let footerHtml = "";
    if (this.footerDom && this.footerDom.innerText?.trim()) {
      footerHtml = this.footerDom.innerHTML;
    }

    let rawBody = "";
    if (this.bodyDom) {
      rawBody = this._stripCommentMarkup(this.bodyDom.innerHTML);
    } else if (this.editorDom) {
      rawBody = this._stripCommentMarkup(this.editorDom.innerHTML);
    }

    const hasHeader = Boolean(headerHtml && headerHtml.trim());
    const hasFooter = Boolean(footerHtml && footerHtml.trim());
    const availableBodyHeightPx = this._getUsablePageHeight(dim);

    const notesData = this._extractNotesForPreview(rawBody);
    // Live pagination chèn gap chỉ để hiển thị. Không cho markup suy ra này tham gia đo preview.
    const bodyForPagination = this._stripAutoPageGaps(notesData.cleanHtml);

    const pageBodies = this.paginateContent(bodyForPagination, availableBodyHeightPx, dim.printableWidthPx, this.columns);

    // Gắn Footnote vào chân trang của đúng trang chứa số mũ tương ứng
    for (let i = 0; i < pageBodies.length; i++) {
      const pageFootnotesHtml = this._renderPageFootnotesForPreview(pageBodies[i], notesData.footnotes);
      if (pageFootnotesHtml) {
        pageBodies[i] = `${pageBodies[i]}\n${pageFootnotesHtml}`;
      }
    }

    // Gắn Endnote vào cuối trang cuối cùng của tài liệu
    if (pageBodies.length > 0 && notesData.endnotes && notesData.endnotes.size > 0) {
      const endnotesHtml = this._renderEndnotesForPreview(notesData.endnotes);
      pageBodies[pageBodies.length - 1] = `${pageBodies[pageBodies.length - 1]}\n${endnotesHtml}`;
    }

    const totalPages = Math.max(1, pageBodies.length);
    this.previewTotalPages = totalPages;
    this.currentPreviewPage = 1;
    this.previewZoom = 1.0;

    const previewTitle = (typeof t === "function" && t("writerDialogs.printPreview.title") !== "writerDialogs.printPreview.title")
      ? t("writerDialogs.printPreview.title")
      : "Xem trước khi in";
    const printBtnLabel = (typeof t === "function" && t("writerDialogs.printPreview.printBtn") !== "writerDialogs.printPreview.printBtn")
      ? t("writerDialogs.printPreview.printBtn")
      : "In tài liệu";
    const printTooltip = (typeof t === "function" && t("writerDialogs.printPreview.printTooltip") !== "writerDialogs.printPreview.printTooltip")
      ? t("writerDialogs.printPreview.printTooltip")
      : "In tài liệu (Ctrl+P)";
    const prevPageLabel = (typeof t === "function" && t("writerDialogs.printPreview.prevPage") !== "writerDialogs.printPreview.prevPage")
      ? t("writerDialogs.printPreview.prevPage")
      : "◀ Trang trước";
    const nextPageLabel = (typeof t === "function" && t("writerDialogs.printPreview.nextPage") !== "writerDialogs.printPreview.nextPage")
      ? t("writerDialogs.printPreview.nextPage")
      : "Trang sau ▶";
    const pagePrefix = (typeof t === "function" && t("writerDialogs.printPreview.pagePrefix") !== "writerDialogs.printPreview.pagePrefix")
      ? t("writerDialogs.printPreview.pagePrefix")
      : "Trang ";
    const fitPageLabel = (typeof t === "function" && t("writerDialogs.printPreview.fitPage") !== "writerDialogs.printPreview.fitPage")
      ? t("writerDialogs.printPreview.fitPage")
      : "Vừa trang";
    const closeTooltip = (typeof t === "function" && t("writerDialogs.printPreview.closeTooltip") !== "writerDialogs.printPreview.closeTooltip")
      ? t("writerDialogs.printPreview.closeTooltip")
      : "Đóng xem trước (Esc)";
    const paperSizeLabel = (typeof t === "function" && t("writerDialogs.printPreview.paperSize") !== "writerDialogs.printPreview.paperSize")
      ? t("writerDialogs.printPreview.paperSize")
      : "Khổ";
    const marginsLabel = (typeof t === "function" && t("writerDialogs.printPreview.margins") !== "writerDialogs.printPreview.margins")
      ? t("writerDialogs.printPreview.margins")
      : "Lề";

    const overlay = document.createElement("div");
    overlay.className = "vno-print-preview-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", previewTitle);
    overlay.dataset.paperSize = dim.sizeKey;
    overlay.dataset.paperOrientation = dim.orientation;
    overlay.dataset.pageCount = String(totalPages);
    overlay.dataset.activePage = "1";
    overlay.dataset.widthMm = String(dim.widthMm);
    overlay.dataset.heightMm = String(dim.heightMm);
    overlay.dataset.columnCount = String(this.columns?.count || 1);

    // Toolbar
    const toolbar = document.createElement("header");
    toolbar.className = "vno-print-preview-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Thanh công cụ xem trước khi in");
    toolbar.innerHTML = `
      <div class="vno-print-preview-toolbar-left">
        <button class="vno-btn vno-btn-primary vno-print-preview-btn-print" title="${printTooltip}" aria-label="${printTooltip}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" style="margin-right:6px;" aria-hidden="true"><rect x="6" y="2" width="12" height="6" rx="1" fill="#E2E8F0" stroke="#475569" stroke-width="1.2"/><rect x="3" y="7" width="18" height="10" rx="2" fill="#0F4C81"/><rect x="6" y="13" width="12" height="8" rx="1" fill="#FFFFFF" stroke="#475569" stroke-width="1.2"/><line x1="8" y1="16" x2="16" y2="16" stroke="#94A3B8" stroke-width="1.2"/><line x1="8" y1="18" x2="14" y2="18" stroke="#94A3B8" stroke-width="1.2"/><circle cx="18" cy="10" r="1" fill="#10B981"/></svg>
          <span>${printBtnLabel}</span>
        </button>
        <div class="vno-print-preview-divider" aria-hidden="true"></div>
        <div class="vno-print-preview-badge">
          <span class="vno-print-preview-paper-info">
            ${paperSizeLabel}: <strong>${dim.sizeLabel}</strong> · <strong>${dim.orientationLabel}</strong> · ${marginsLabel}: T${dim.margins.top} D${dim.margins.bottom} T${dim.margins.left} P${dim.margins.right} mm
          </span>
        </div>
      </div>

      <div class="vno-print-preview-toolbar-center">
        <button class="vno-btn vno-print-preview-nav-prev" title="${prevPageLabel}" aria-label="${prevPageLabel}" ${totalPages <= 1 ? "disabled" : ""}>
          ${prevPageLabel}
        </button>
        <div class="vno-print-preview-page-indicator">
          <span>${pagePrefix}</span>
          <input type="number" min="1" max="${totalPages}" value="1" class="vno-print-preview-page-input" aria-label="Số trang" />
          <span> / <span class="vno-print-preview-total-pages">${totalPages}</span></span>
        </div>
        <button class="vno-btn vno-print-preview-nav-next" title="${nextPageLabel}" aria-label="${nextPageLabel}" ${totalPages <= 1 ? "disabled" : ""}>
          ${nextPageLabel}
        </button>
      </div>

      <div class="vno-print-preview-toolbar-right">
        <button class="vno-btn vno-print-preview-zoom-out" title="Thu nhỏ" aria-label="Thu nhỏ">−</button>
        <span class="vno-print-preview-zoom-level" aria-live="polite">100%</span>
        <button class="vno-btn vno-print-preview-zoom-in" title="Phóng to" aria-label="Phóng to">+</button>
        <button class="vno-btn vno-print-preview-zoom-fit" title="Vừa chiều cao" aria-label="${fitPageLabel}">${fitPageLabel}</button>
        <div class="vno-print-preview-divider" aria-hidden="true"></div>
        <button class="vno-btn vno-btn-icon-only vno-print-preview-close-btn" title="${closeTooltip}" aria-label="${closeTooltip}">&times;</button>
      </div>
    `;

    // Viewport
    const viewport = document.createElement("main");
    viewport.className = "vno-print-preview-viewport";

    const pagesContainer = document.createElement("div");
    pagesContainer.className = "vno-print-preview-pages-container";

    for (let i = 0; i < totalPages; i++) {
      const pageIndex = i + 1;
      const sheet = document.createElement("div");
      sheet.className = `vno-print-preview-sheet ${pageIndex === 1 ? "is-active" : ""}`;
      sheet.dataset.pageIndex = String(pageIndex);
      sheet.dataset.paperSize = dim.sizeKey;
      sheet.dataset.paperOrientation = dim.orientation;
      sheet.dataset.pageWidthMm = String(dim.widthMm);
      sheet.dataset.pageHeightMm = String(dim.heightMm);
      sheet.style.width = `${dim.widthPx}px`;
      sheet.style.minHeight = `${dim.heightPx}px`;
      sheet.style.height = `${dim.heightPx}px`;
      sheet.style.padding = `${dim.topPx}px ${dim.rightPx}px ${dim.bottomPx}px ${dim.leftPx}px`;

      let pageFooterHtml = footerHtml;
      if (hasFooter) {
        pageFooterHtml = footerHtml.replace(/Trang\s+\d+(\s*\/\s*\d+)?/gi, `Trang ${pageIndex} / ${totalPages}`);
      }

      const hasColumns = Boolean(this.columns && this.columns.count > 1);
      const colCount = hasColumns ? this.columns.count : 1;
      const colGap = hasColumns ? (typeof this.columns.gap === "number" ? `${this.columns.gap}mm` : (this.columns.gap || "10mm")) : "";
      const colRule = hasColumns && this.columns.rule ? (typeof this.columns.rule === "string" ? this.columns.rule : "1px solid #94a3b8") : "";
      const colStyleAttr = hasColumns
        ? `column-count:${colCount}; -webkit-column-count:${colCount}; column-gap:${colGap}; -webkit-column-gap:${colGap}; ${colRule ? `column-rule:${colRule}; -webkit-column-rule:${colRule};` : ''}`
        : "";

      sheet.innerHTML = `
        <div class="vno-print-preview-page-number-tag">Trang ${pageIndex} / ${totalPages}</div>
        ${hasHeader ? `<div class="vno-print-preview-header">${headerHtml}</div>` : ""}
        <div class="vno-print-preview-body${hasColumns ? ` vno-columns-active vno-columns-${colCount}` : ""}" style="${colStyleAttr}">${pageBodies[i] || "<p><br></p>"}</div>
        ${hasFooter ? `<div class="vno-print-preview-footer">${pageFooterHtml}</div>` : ""}
      `;

      if (this.watermark && this.watermark.text) {
        const wmEl = document.createElement("div");
        wmEl.className = "vno-print-preview-watermark";
        wmEl.dataset.vnoWatermark = "true";
        wmEl.innerHTML = `<div class="vno-watermark-text" style="transform:rotate(-${this.watermark.angle ?? 45}deg); color:${this.watermark.color || "#dc2626"}; opacity:${this.watermark.opacity ?? 0.2}; font-size:${this.watermark.fontSize || 72}px;">${this.watermark.text}</div>`;
        sheet.appendChild(wmEl);
      }

      if (this.pageBorder && this.pageBorder.enabled && this.pageBorder.style !== "none") {
        const borderEl = document.createElement("div");
        borderEl.className = "vno-print-preview-page-border";
        borderEl.dataset.vnoPageBorder = "true";
        borderEl.style.cssText = `position:absolute; top:12px; left:12px; right:12px; bottom:12px; border:${this.pageBorder.width || 2}pt ${this.pageBorder.style || "solid"} ${this.pageBorder.color || "#0f4c81"}; pointer-events:none; z-index:2; box-sizing:border-box;`;
        sheet.appendChild(borderEl);
      }

      pagesContainer.appendChild(sheet);
    }

    viewport.appendChild(pagesContainer);
    overlay.appendChild(toolbar);
    overlay.appendChild(viewport);

    const mountTarget = document.body || (this.editorDom?.parentNode || this.editorDom);
    mountTarget.appendChild(overlay);
    this.printPreviewOverlay = overlay;

    // Gắn sự kiện tương tác
    const btnPrint = overlay.querySelector(".vno-print-preview-btn-print");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => this.print());
    }

    const btnClose = overlay.querySelector(".vno-print-preview-close-btn");
    if (btnClose) {
      btnClose.addEventListener("click", () => this.closePrintPreview());
    }

    const btnPrev = overlay.querySelector(".vno-print-preview-nav-prev");
    if (btnPrev) {
      btnPrev.addEventListener("click", () => this.goToPreviewPage(this.currentPreviewPage - 1));
    }

    const btnNext = overlay.querySelector(".vno-print-preview-nav-next");
    if (btnNext) {
      btnNext.addEventListener("click", () => this.goToPreviewPage(this.currentPreviewPage + 1));
    }

    const pageInput = overlay.querySelector(".vno-print-preview-page-input");
    if (pageInput) {
      pageInput.addEventListener("change", () => {
        const val = parseInt(pageInput.value, 10);
        if (!isNaN(val)) this.goToPreviewPage(val);
      });
      pageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = parseInt(pageInput.value, 10);
          if (!isNaN(val)) this.goToPreviewPage(val);
        }
      });
    }

    const btnZoomIn = overlay.querySelector(".vno-print-preview-zoom-in");
    if (btnZoomIn) {
      btnZoomIn.addEventListener("click", () => this.setPreviewZoom(this.previewZoom + 0.15));
    }

    const btnZoomOut = overlay.querySelector(".vno-print-preview-zoom-out");
    if (btnZoomOut) {
      btnZoomOut.addEventListener("click", () => this.setPreviewZoom(this.previewZoom - 0.15));
    }

    const btnZoomFit = overlay.querySelector(".vno-print-preview-zoom-fit");
    if (btnZoomFit) {
      btnZoomFit.addEventListener("click", () => {
        const viewH = viewport.clientHeight || 700;
        const scale = Math.min(1.2, Math.max(0.35, (viewH - 80) / dim.heightPx));
        this.setPreviewZoom(scale);
      });
    }

    this._previewKeyHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault?.();
        e.stopPropagation?.();
        this.closePrintPreview();
      } else if ((e.key === "ArrowLeft" || e.key === "PageUp") && !e.target?.matches?.("input")) {
        e.preventDefault?.();
        this.goToPreviewPage(this.currentPreviewPage - 1);
      } else if ((e.key === "ArrowRight" || e.key === "PageDown") && !e.target?.matches?.("input")) {
        e.preventDefault?.();
        this.goToPreviewPage(this.currentPreviewPage + 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault?.();
        this.print();
      }
    };
    document.addEventListener("keydown", this._previewKeyHandler, true);

    return overlay;
  }

  goToPreviewPage(pageIndex) {
    if (!this.printPreviewOverlay) return;
    const clamped = Math.max(1, Math.min(this.previewTotalPages, pageIndex));
    this.currentPreviewPage = clamped;
    this.printPreviewOverlay.dataset.activePage = String(clamped);

    const input = this.printPreviewOverlay.querySelector(".vno-print-preview-page-input");
    if (input) input.value = String(clamped);

    const btnPrev = this.printPreviewOverlay.querySelector(".vno-print-preview-nav-prev");
    const btnNext = this.printPreviewOverlay.querySelector(".vno-print-preview-nav-next");
    if (btnPrev) btnPrev.disabled = clamped <= 1;
    if (btnNext) btnNext.disabled = clamped >= this.previewTotalPages;

    const sheets = this.printPreviewOverlay.querySelectorAll(".vno-print-preview-sheet");
    sheets.forEach((sheet, idx) => {
      if (idx + 1 === clamped) {
        sheet.classList.add("is-active");
        sheet.scrollIntoView?.({ behavior: "smooth", block: "center" });
      } else {
        sheet.classList.remove("is-active");
      }
    });
  }

  setPreviewZoom(zoom) {
    if (!this.printPreviewOverlay) return;
    const clamped = Math.max(0.3, Math.min(2.0, Math.round(zoom * 100) / 100));
    this.previewZoom = clamped;
    const container = this.printPreviewOverlay.querySelector(".vno-print-preview-pages-container");
    if (container) {
      container.style.transform = `scale(${clamped})`;
      container.style.transformOrigin = "top center";
    }
    const label = this.printPreviewOverlay.querySelector(".vno-print-preview-zoom-level");
    if (label) {
      label.textContent = `${Math.round(clamped * 100)}%`;
    }
  }

  closePrintPreview() {
    if (this._previewKeyHandler && typeof document !== "undefined") {
      document.removeEventListener("keydown", this._previewKeyHandler, true);
      this._previewKeyHandler = null;
    }
    if (this.printPreviewOverlay) {
      if (this.printPreviewOverlay.parentNode) {
        this.printPreviewOverlay.parentNode.removeChild(this.printPreviewOverlay);
      }
      this.printPreviewOverlay = null;
    }
    const targetFocus = this.bodyDom || this.editorDom;
    if (targetFocus?.focus) {
      targetFocus.focus();
    }
    return true;
  }

  // =========================================================================
  // HE THONG HOAN TAC & LAM LAI (DEEP UNDO / REDO HISTORY ENGINE)
  // =========================================================================

  /**
   * Kiểm tra có thể hoàn tác hay không
   * @returns {boolean}
   */
  canUndo() {
    if (this._typingDebounceTimer) return true;
    if (this._lastSnapshot) {
      const current = this._createSnapshot("Check Can Undo");
      if (!this._isSnapshotEqual(current, this._lastSnapshot)) {
        return true;
      }
    }
    return this.undoStack.length > 0;
  }

  /**
   * Kiểm tra có thể làm lại hay không
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Cam kết các ký tự đang gõ dở dang vào snapshot trước khi thực hiện thao tác rời rạc hoặc Undo
   */
  flushTyping() {
    if (this._typingDebounceTimer) {
      clearTimeout(this._typingDebounceTimer);
      this._typingDebounceTimer = null;
    }
    if (!this._lastSnapshot) {
      this._lastSnapshot = this._createSnapshot("Initial State");
      return;
    }
    const current = this._createSnapshot("Typing Commit");
    if (!this._isSnapshotEqual(current, this._lastSnapshot)) {
      this.recordSnapshot("Typing Commit");
    }
  }

  /**
   * Ghi lại một snapshot vào undo stack
   * @param {string} [description]
   * @returns {boolean}
   */
  recordSnapshot(description = "") {
    if (this._isUndoingRedoing) return false;

    if (this._typingDebounceTimer) {
      clearTimeout(this._typingDebounceTimer);
      this._typingDebounceTimer = null;
    }

    const currentSnapshot = this._createSnapshot(description);

    if (!this._lastSnapshot) {
      this._lastSnapshot = currentSnapshot;
      this._updateUndoRedoUI();
      return false;
    }

    if (this._isSnapshotEqual(currentSnapshot, this._lastSnapshot)) {
      return false;
    }

    this.undoStack.push(this._lastSnapshot);
    if (this.undoStack.length > this.maxUndoStack) {
      this.undoStack.shift();
    }

    // Một hành động mới làm xóa nhánh redo tương lai (chuẩn Office)
    this.redoStack = [];
    this._lastSnapshot = currentSnapshot;
    this.isDirty = true;
    this._updateUndoRedoUI();
    return true;
  }

  /**
   * Thực hiện hoàn tác (Undo - Ctrl+Z)
   * @returns {boolean}
   */
  undo() {
    this.flushTyping();

    if (this.undoStack.length === 0) {
      this._updateUndoRedoUI();
      return false;
    }

    const currentSnapshot = this._createSnapshot("Current for Redo");
    this.redoStack.push(currentSnapshot);
    if (this.redoStack.length > this.maxUndoStack) {
      this.redoStack.shift();
    }

    const prevSnapshot = this.undoStack.pop();
    this._isUndoingRedoing = true;
    try {
      this._restoreSnapshot(prevSnapshot);
      this._lastSnapshot = prevSnapshot;
    } finally {
      this._isUndoingRedoing = false;
    }

    this._updateUndoRedoUI();
    return true;
  }

  /**
   * Thực hiện làm lại (Redo - Ctrl+Y)
   * @returns {boolean}
   */
  redo() {
    this.flushTyping();

    if (this.redoStack.length === 0) {
      this._updateUndoRedoUI();
      return false;
    }

    const currentSnapshot = this._createSnapshot("Current for Undo");
    this.undoStack.push(currentSnapshot);
    if (this.undoStack.length > this.maxUndoStack) {
      this.undoStack.shift();
    }

    const nextSnapshot = this.redoStack.pop();
    this._isUndoingRedoing = true;
    try {
      this._restoreSnapshot(nextSnapshot);
      this._lastSnapshot = nextSnapshot;
    } finally {
      this._isUndoingRedoing = false;
    }

    this._updateUndoRedoUI();
    return true;
  }

  /**
   * Làm sạch toàn bộ lịch sử hoàn tác (dùng khi mở tài liệu mới)
   */
  clearUndoRedo() {
    if (this._typingDebounceTimer) {
      clearTimeout(this._typingDebounceTimer);
      this._typingDebounceTimer = null;
    }
    this.undoStack = [];
    this.redoStack = [];
    this._lastSnapshot = this._createSnapshot("Reset State");
    this._updateUndoRedoUI();
  }

  /**
   * Tạo bản sao lưu trạng thái hiện tại của tài liệu
   * @param {string} [description]
   * @private
   */
  _createSnapshot(description = "") {
    this._initZones();
    return {
      bodyHtml: this._stripAutoPageGaps(this.bodyDom ? this.bodyDom.innerHTML : (this.editorDom ? this.editorDom.innerHTML : "")),
      headerHtml: this.headerDom ? this.headerDom.innerHTML : null,
      footerHtml: this.footerDom ? this.footerDom.innerHTML : null,
      pageSetup: this.pageSetup ? JSON.parse(JSON.stringify(this.pageSetup)) : null,
      comments: this.comments ? JSON.parse(JSON.stringify(this.comments)) : [],
      watermark: this.watermark ? JSON.parse(JSON.stringify(this.watermark)) : null,
      pageBorder: this.pageBorder ? JSON.parse(JSON.stringify(this.pageBorder)) : null,
      columns: this.columns ? JSON.parse(JSON.stringify(this.columns)) : { count: 1, gap: 10, rule: false },
      shapes: this.shapes ? JSON.parse(JSON.stringify(this.shapes)) : [],
      documentTheme: this.documentTheme || "office",
      description,
      timestamp: Date.now()
    };
  }

  /**
   * So sánh hai snapshot xem có sự thay đổi thực chất hay không
   * @private
   */
  _isSnapshotEqual(a, b) {
    if (!a || !b) return false;
    if (a.bodyHtml !== b.bodyHtml) return false;
    if (a.headerHtml !== b.headerHtml) return false;
    if (a.footerHtml !== b.footerHtml) return false;
    if (JSON.stringify(a.pageSetup) !== JSON.stringify(b.pageSetup)) return false;
    if (JSON.stringify(a.comments) !== JSON.stringify(b.comments)) return false;
    if (JSON.stringify(a.watermark) !== JSON.stringify(b.watermark)) return false;
    if (JSON.stringify(a.pageBorder) !== JSON.stringify(b.pageBorder)) return false;
    if (JSON.stringify(a.columns) !== JSON.stringify(b.columns)) return false;
    if (JSON.stringify(a.shapes || []) !== JSON.stringify(b.shapes || [])) return false;
    if ((a.documentTheme || "office") !== (b.documentTheme || "office")) return false;
    return true;
  }

  /**
   * Khôi phục tài liệu từ một snapshot
   * @private
   */
  _restoreSnapshot(snapshot) {
    if (!snapshot) return;
    this._initZones();

    if (snapshot.headerHtml !== null && this.headerDom) {
      this.headerDom.innerHTML = snapshot.headerHtml;
    }
    if (snapshot.bodyHtml !== null) {
      if (this.bodyDom) {
        this.bodyDom.innerHTML = snapshot.bodyHtml;
      } else if (this.editorDom) {
        this.editorDom.innerHTML = snapshot.bodyHtml;
      }
    }
    if (snapshot.footerHtml !== null && this.footerDom) {
      this.footerDom.innerHTML = snapshot.footerHtml;
    }

    if (snapshot.pageSetup) {
      this.pageSetup = JSON.parse(JSON.stringify(snapshot.pageSetup));
      this._applyPageSetup();
    }

    if (snapshot.comments) {
      this.comments = JSON.parse(JSON.stringify(snapshot.comments));
      this._renderCommentsPanel();
    }

    if (Object.prototype.hasOwnProperty.call(snapshot, "watermark")) {
      this.watermark = snapshot.watermark ? JSON.parse(JSON.stringify(snapshot.watermark)) : null;
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "pageBorder")) {
      this.pageBorder = snapshot.pageBorder ? JSON.parse(JSON.stringify(snapshot.pageBorder)) : { enabled: false };
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "columns")) {
      this.columns = snapshot.columns ? JSON.parse(JSON.stringify(snapshot.columns)) : { count: 1, gap: 10, rule: false };
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "shapes")) {
      this.shapes = snapshot.shapes ? JSON.parse(JSON.stringify(snapshot.shapes)) : [];
    }
    if (snapshot.documentTheme) {
      this.applyDocumentTheme(snapshot.documentTheme, false);
    }
    this._applyDecorations();
    this._syncActiveStyleUI?.();

    this.isDirty = true;
    this._updateTrackChangesCommandState?.();

    // Phát sự kiện input để các thành phần quan sát (đếm từ, đếm trang) cập nhật lại
    if (this.bodyDom?.dispatchEvent) {
      try {
        this.bodyDom.dispatchEvent(new Event("input", { bubbles: true }));
      } catch {}
    }
  }

  /**
   * Gom cụm việc tính lại dàn trang với debounce ngắn (250ms) — độc lập với debounce
   * 600ms của Undo/Redo vì đây chỉ là cập nhật HIỂN THỊ (không tạo bước lịch sử).
   * @private
   */
  _schedulePaginationRecompute() {
    if (this._paginationDebounceTimer) {
      clearTimeout(this._paginationDebounceTimer);
    }
    this._paginationDebounceTimer = setTimeout(() => {
      this._paginationDebounceTimer = null;
      this._recomputeLivePagination();
    }, this._paginationDebounceMs);
  }

  /**
   * Dàn trang thời gian thực trong khung soạn thảo trực tiếp (KHÁC Print Preview,
   * vốn đã tự tính trang riêng qua `paginateContent()`). `.vno-writer-page` trước đây
   * chỉ có `min-height` bằng 1 trang A4 và không giới hạn chiều cao tối đa — khi nội
   * dung tràn quá 1 trang, tờ giấy chỉ kéo dài vô hạn thành MỘT trang duy nhất, không
   * tự tách sang trang 2/3 như Word/LibreOffice thật (lỗi thật người dùng phát hiện
   * 04/09/2026). Hàm này đo chiều cao THẬT của từng khối con trực tiếp trong
   * `bodyDom` (DOM đã gắn kết, `offsetHeight` chính xác — KHÔNG cần ước lượng như
   * `paginateContent()` phải làm vì nó đo trên DOM tạm chưa gắn kết), và khi tổng chiều
   * cao vượt quá vùng nội dung khả dụng của 1 trang thì chèn một dải ngăn trang
   * (`contenteditable="false"`, đánh dấu `data-vno-auto-page-gap="true"`) ngay trước
   * khối làm tràn — dải này bị loại bỏ khỏi snapshot Undo/Redo (`_stripAutoPageGaps`)
   * và khỏi nội dung xuất file (`_stripSessionMarkup`) vì nó là dữ liệu SUY RA từ phép
   * đo, không phải nội dung người dùng gõ. Ngắt trang thủ công (Ctrl+Enter) được coi
   * là điểm reset trang cứng, giống hệt logic trong `paginateContent()`.
   *
   * Giới hạn đã biết (ghi nhận trung thực, không giả vờ đã xong 100%): một khối ĐƠN
   * LẺ tự nó đã cao hơn 1 trang (bảng rất lớn, ảnh rất lớn) sẽ không tự tách nhỏ hơn —
   * giống hạn chế đã có của `paginateContent()`/Print Preview. Header/Footer KHÔNG
   * được lặp lại hình ảnh ở mỗi trang trong khung soạn thảo sống (chỉ hiện 1 lần như
   * trước) — việc lặp Header/Footer chính xác theo từng trang vẫn do Print Preview đảm
   * nhiệm khi cần xem trước chuẩn xác để in/xuất.
   */
  _recomputeLivePagination() {
    if (typeof document === "undefined" || !this.bodyDom || this._paginating) return;
    // `bodyDom.children` chỉ tồn tại trên DOM trình duyệt thật — các mock DOM nhẹ dùng
    // trong unit test (vd tests/unit/writer-undo-redo.test.js) không khai báo `children`,
    // nên phải kiểm tra trước khi Array.from(), nếu không sẽ crash toàn bộ suite Undo/Redo.
    if (!this.bodyDom.children || typeof this.bodyDom.querySelectorAll !== "function") return;
    this._paginating = true;
    try {
      const oldGaps = this.bodyDom.querySelectorAll('[data-vno-auto-page-gap="true"]');
      if (oldGaps && typeof oldGaps.forEach === "function") {
        oldGaps.forEach((el) => el.remove());
      }

      const dim = this.getPageDimensions();
      const availableHeightPx = this._getUsablePageHeight(dim);

      const children = Array.from(this.bodyDom.children);
      let currentHeight = 0;
      let pageCount = 1;
      const gapBeforeEls = [];

      for (const el of children) {
        const styleStr = (typeof el.getAttribute === "function" ? el.getAttribute("style") : "") || "";
        const textContent = el.textContent || "";
        const isManualBreak = styleStr.includes("page-break-before") || styleStr.includes("break-before") || textContent.includes("Phân tách trang");

        if (isManualBreak) {
          currentHeight = 0;
          pageCount++;
          continue;
        }

        const h = el.offsetHeight || 0;
        if (currentHeight > 0 && currentHeight + h > availableHeightPx) {
          gapBeforeEls.push(el);
          currentHeight = h;
          pageCount++;
        } else {
          currentHeight += h;
        }
      }

      for (const el of gapBeforeEls) {
        const gap = document.createElement("div");
        gap.className = "vno-page-auto-gap";
        gap.setAttribute("contenteditable", "false");
        gap.setAttribute("data-vno-auto-page-gap", "true");
        this.bodyDom.insertBefore(gap, el);
      }

      this._livePageCount = pageCount;
      if (typeof this.bodyDom.dispatchEvent === "function") {
        try {
          this.bodyDom.dispatchEvent(new CustomEvent("vno-pagination-updated", { bubbles: true, detail: { pageCount } }));
        } catch {}
      }
    } finally {
      this._paginating = false;
    }
  }

  /**
   * Lắng nghe sự kiện bàn phím & gõ chữ để lưu lịch sử
   * @private
   */
  _bindUndoRedo() {
    if (this._inputHandler) return;
    const target = this.editorDom;
    if (!target || typeof target.addEventListener !== "function") return;

    this._inputHandler = (event) => {
      if (this._isUndoingRedoing) return;
      if (event && event._vnoHandled) return;
      if (event) event._vnoHandled = true;
      this.isDirty = true;
      this._syncNotesFromDom();
      if (event?.inputType === "insertParagraph") {
        this.flushTyping();
        this.recordSnapshot("writer.text.newParagraph");
      } else {
        this._scheduleTypingSnapshot();
      }
    };

    target.addEventListener("input", this._inputHandler);
    if (this.bodyDom && this.bodyDom !== target && typeof this.bodyDom.addEventListener === "function") {
      this.bodyDom.addEventListener("input", this._inputHandler);
    }

    // Lắng nghe "input" ĐỘC LẬP với `_inputHandler` ở trên — cố ý KHÔNG kiểm tra
    // `_isUndoingRedoing`, vì `_restoreSnapshot()` (chạy trong lúc cờ đó đang true)
    // tự phát sự kiện "input" tổng hợp ở cuối để các bên quan sát (đếm từ, đếm trang)
    // cập nhật lại — dàn trang PHẢI chạy lại đúng lúc đó (sau Undo/Redo) chứ không được
    // bỏ qua. Việc chèn/xóa dải ngăn trang bằng JS (insertBefore/remove) không tự phát
    // sự kiện "input" của trình duyệt, nên không có nguy cơ đệ quy vô hạn.
    if (!this._paginationInputHandler && this.bodyDom && typeof this.bodyDom.addEventListener === "function") {
      this._paginationInputHandler = () => this._schedulePaginationRecompute();
      this.bodyDom.addEventListener("input", this._paginationInputHandler);
    }

    if (!this._undoKeyHandler && typeof target.addEventListener === "function") {
      this._undoKeyHandler = (event) => {
        if ((event.key === "Delete" || event.key === "Backspace") && this.selectedShapeId) {
          const active = typeof document !== "undefined" ? document.activeElement : null;
          const isInput = active && (active.isContentEditable || active.tagName === "INPUT" || active.tagName === "TEXTAREA");
          if (!isInput) {
            event.preventDefault();
            this.deleteShape(this.selectedShapeId);
            return;
          }
        }
        if (!event.ctrlKey && !event.metaKey) return;
        const key = (event.key || "").toLowerCase();
        if (key === "z" && !event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          this.undo();
        } else if (key === "y" || (key === "z" && event.shiftKey)) {
          event.preventDefault();
          event.stopPropagation();
          this.redo();
        }
      };
      target.addEventListener("keydown", this._undoKeyHandler, true);
    }
  }

  /**
   * Gom cụm thao tác gõ chữ liên tục với debounce (500ms - 1s, mặc định 600ms)
   * @private
   */
  _scheduleTypingSnapshot() {
    if (this._typingDebounceTimer) {
      clearTimeout(this._typingDebounceTimer);
    }
    this._updateUndoRedoUI();
    this._typingDebounceTimer = setTimeout(() => {
      this._typingDebounceTimer = null;
      this.recordSnapshot("Typing");
    }, this._typingDebounceMs);
  }

  /**
   * Cập nhật trạng thái nút Undo/Redo trên Command Bus và Quick Access Toolbar
   * @private
   */
  _updateUndoRedoUI() {
    const canUndo = this.canUndo();
    const canRedo = this.canRedo();

    globalCommandBus.updateState("common.edit.undo", { enabled: canUndo });
    globalCommandBus.updateState("common.edit.redo", { enabled: canRedo });

    if (typeof document !== "undefined") {
      const undoButtons = document.querySelectorAll?.('[data-cmd="common.edit.undo"], [data-command-id="common.edit.undo"]');
      undoButtons?.forEach?.((btn) => {
        btn.disabled = !canUndo;
        btn.classList?.toggle?.("is-disabled", !canUndo);
        if (!canUndo) {
          btn.setAttribute?.("disabled", "true");
        } else {
          btn.removeAttribute?.("disabled");
        }
      });

      const redoButtons = document.querySelectorAll?.('[data-cmd="common.edit.redo"], [data-command-id="common.edit.redo"]');
      redoButtons?.forEach?.((btn) => {
        btn.disabled = !canRedo;
        btn.classList?.toggle?.("is-disabled", !canRedo);
        if (!canRedo) {
          btn.setAttribute?.("disabled", "true");
        } else {
          btn.removeAttribute?.("disabled");
        }
      });
    }
  }

  // =========================================================================
  // HE THONG MUC LUC TU DONG & CHU THICH (TOC & FOOTNOTES/ENDNOTES)
  // =========================================================================

  _extractNotesForPreview(rawHtml) {
    const footnotes = new Map();
    const endnotes = new Map();
    let cleanHtml = rawHtml;

    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.innerHTML = rawHtml;

      const fnContainer = temp.querySelector ? temp.querySelector('[data-vno-footnotes="true"]') : null;
      if (fnContainer) {
        const items = Array.from(fnContainer.querySelectorAll ? fnContainer.querySelectorAll(".vno-footnote-item") : []);
        for (const item of items) {
          const id = (typeof item.getAttribute === "function" ? item.getAttribute("data-vno-footnote-id") : item.dataset?.vnoFootnoteId) || "";
          const numEl = item.querySelector ? item.querySelector(".vno-note-num") : null;
          const num = (numEl ? (numEl.textContent || numEl.innerText) : "").trim();
          const textEl = item.querySelector ? item.querySelector(".vno-note-text") : null;
          const textHtml = textEl ? (textEl.innerHTML || textEl.textContent || "").trim() : "";
          if (id) {
            footnotes.set(id, { id, num, textHtml });
          }
        }
        if (typeof fnContainer.remove === "function") fnContainer.remove();
        else if (fnContainer.parentNode) fnContainer.parentNode.removeChild(fnContainer);
      }

      const enContainer = temp.querySelector ? temp.querySelector('[data-vno-endnotes="true"]') : null;
      if (enContainer) {
        const items = Array.from(enContainer.querySelectorAll ? enContainer.querySelectorAll(".vno-endnote-item") : []);
        for (const item of items) {
          const id = (typeof item.getAttribute === "function" ? item.getAttribute("data-vno-endnote-id") : item.dataset?.vnoEndnoteId) || "";
          const numEl = item.querySelector ? item.querySelector(".vno-note-num") : null;
          const num = (numEl ? (numEl.textContent || numEl.innerText) : "").trim();
          const textEl = item.querySelector ? item.querySelector(".vno-note-text") : null;
          const textHtml = textEl ? (textEl.innerHTML || textEl.textContent || "").trim() : "";
          if (id) {
            endnotes.set(id, { id, num, textHtml });
          }
        }
        if (typeof enContainer.remove === "function") enContainer.remove();
        else if (enContainer.parentNode) enContainer.parentNode.removeChild(enContainer);
      }

      cleanHtml = temp.innerHTML;
    } else {
      cleanHtml = rawHtml
        .replace(/<div\b[^>]*\bdata-vno-footnotes=["']?true["']?[^>]*>[\s\S]*?<\/div>/gi, "")
        .replace(/<div\b[^>]*\bdata-vno-endnotes=["']?true["']?[^>]*>[\s\S]*?<\/div>/gi, "");
    }

    return { cleanHtml, footnotes, endnotes };
  }

  _renderPageFootnotesForPreview(pageHtml, footnotesMap) {
    if (!footnotesMap || footnotesMap.size === 0) return "";
    const matches = Array.from(pageHtml.matchAll(/data-vno-footnote-ref=["']([^"']+)["']/gi));
    if (matches.length === 0) return "";

    const rendered = [];
    const seen = new Set();
    for (const match of matches) {
      const id = match[1];
      if (id && !seen.has(id) && footnotesMap.has(id)) {
        seen.add(id);
        const fn = footnotesMap.get(id);
        rendered.push(`
          <div class="vno-print-preview-footnote-item" data-vno-footnote-id="${fn.id}">
            <sup>${fn.num}</sup>
            <span>${fn.textHtml || ""}</span>
          </div>
        `.trim());
      }
    }

    if (rendered.length === 0) return "";
    return `
      <div class="vno-print-preview-footnotes">
        <div class="vno-notes-separator" style="width:120px; border-top:1px solid #64748b; margin:10px 0 6px 0;"></div>
        ${rendered.join("\n")}
      </div>
    `.trim();
  }

  _renderEndnotesForPreview(endnotesMap) {
    if (!endnotesMap || endnotesMap.size === 0) return "";
    const rendered = [];
    for (const [id, en] of endnotesMap.entries()) {
      rendered.push(`
        <div class="vno-print-preview-endnote-item" data-vno-endnote-id="${en.id}">
          <sup>${en.num}</sup>
          <span>${en.textHtml || ""}</span>
        </div>
      `.trim());
    }

    if (rendered.length === 0) return "";
    return `
      <div class="vno-print-preview-endnotes">
        <div class="vno-notes-separator" style="width:140px; border-top:1.5px solid #64748b; margin:14px 0 6px 0;"></div>
        <div class="vno-notes-title" style="font-size:9pt; font-weight:bold; margin-bottom:4px;">CHÚ THÍCH CUỐI TÀI LIỆU</div>
        ${rendered.join("\n")}
      </div>
    `.trim();
  }

  _bindReferenceInteractions() {
    if (!this.bodyDom?.addEventListener || this._referenceClickHandler) return;

    this._referenceClickHandler = (event) => {
      const target = event.target;
      if (!target) return;

      // 0. Comment: Nhấp anchor ghi chú
      const commentAnchor = target.closest ? target.closest("[data-comment-id]") : null;
      if (commentAnchor && this.bodyDom?.contains?.(commentAnchor)) {
        const commentId = commentAnchor.dataset?.commentId || (typeof commentAnchor.getAttribute === "function" ? commentAnchor.getAttribute("data-comment-id") : null);
        if (commentId) {
          this.focusComment(commentId);
          return;
        }
      }

      // 1. TOC: Nút cập nhật mục lục
      const updateBtn = target.closest ? target.closest(".vno-toc-btn-update") : null;
      if (updateBtn) {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.updateTableOfContents();
        return;
      }

      // 2. TOC: Nút xóa mục lục
      const deleteBtn = target.closest ? target.closest(".vno-toc-btn-delete") : null;
      if (deleteBtn) {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.deleteTableOfContents();
        return;
      }

      // 3. TOC: Nhấp link nhảy tới tiêu đề
      const tocLink = target.closest ? target.closest(".vno-toc-link") : null;
      if (tocLink) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const targetId = (tocLink.dataset?.targetId) || (typeof tocLink.getAttribute === "function" ? tocLink.getAttribute("href") : "")?.replace(/^#/, "");
        if (targetId && this.bodyDom) {
          const heading = this.bodyDom.querySelector ? this.bodyDom.querySelector(`#${targetId}`) : null;
          if (heading) {
            heading.scrollIntoView?.({ behavior: "smooth", block: "start" });
            if (heading.focus) heading.focus();
          }
        }
        return;
      }

      // 4. Footnote: Nhấp số mũ nhảy xuống ô nhập chú thích
      const fnRef = target.closest ? target.closest("sup[data-vno-footnote-ref]") : null;
      if (fnRef) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const fnId = typeof fnRef.getAttribute === "function" ? fnRef.getAttribute("data-vno-footnote-ref") : fnRef.dataset?.vnoFootnoteRef;
        if (fnId && this.bodyDom) {
          const noteItem = this.bodyDom.querySelector ? this.bodyDom.querySelector(`[data-vno-footnote-id="${fnId}"]`) : null;
          if (noteItem) {
            noteItem.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
            const textInput = noteItem.querySelector ? noteItem.querySelector(".vno-note-text") : null;
            if (textInput?.focus) textInput.focus();
          }
        }
        return;
      }

      // 5. Footnote: Nhấp số thứ tự ở chú thích nhảy ngược lên số mũ trong bài
      const fnNum = target.closest ? target.closest(".vno-footnote-item .vno-note-num") : null;
      if (fnNum) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const noteItem = fnNum.closest ? fnNum.closest(".vno-footnote-item") : null;
        const fnId = noteItem ? (typeof noteItem.getAttribute === "function" ? noteItem.getAttribute("data-vno-footnote-id") : noteItem.dataset?.vnoFootnoteId) : null;
        if (fnId && this.bodyDom) {
          const refEl = this.bodyDom.querySelector ? this.bodyDom.querySelector(`sup[data-vno-footnote-ref="${fnId}"]`) : null;
          if (refEl) {
            refEl.scrollIntoView?.({ behavior: "smooth", block: "center" });
          }
        }
        return;
      }

      // 6. Footnote: Nút xóa chú thích
      const fnDelete = target.closest ? target.closest(".vno-footnote-item .vno-note-delete-btn") : null;
      if (fnDelete) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const noteItem = fnDelete.closest ? fnDelete.closest(".vno-footnote-item") : null;
        const fnId = noteItem ? (typeof noteItem.getAttribute === "function" ? noteItem.getAttribute("data-vno-footnote-id") : noteItem.dataset?.vnoFootnoteId) : null;
        if (fnId) {
          this.deleteFootnote(fnId);
        }
        return;
      }

      // 7. Endnote: Nhấp số mũ nhảy xuống ô nhập chú thích cuối
      const enRef = target.closest ? target.closest("sup[data-vno-endnote-ref]") : null;
      if (enRef) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const enId = typeof enRef.getAttribute === "function" ? enRef.getAttribute("data-vno-endnote-ref") : enRef.dataset?.vnoEndnoteRef;
        if (enId && this.bodyDom) {
          const noteItem = this.bodyDom.querySelector ? this.bodyDom.querySelector(`[data-vno-endnote-id="${enId}"]`) : null;
          if (noteItem) {
            noteItem.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
            const textInput = noteItem.querySelector ? noteItem.querySelector(".vno-note-text") : null;
            if (textInput?.focus) textInput.focus();
          }
        }
        return;
      }

      // 8. Endnote: Nhấp số thứ tự nhảy ngược lên số mũ trong bài
      const enNum = target.closest ? target.closest(".vno-endnote-item .vno-note-num") : null;
      if (enNum) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const noteItem = enNum.closest ? enNum.closest(".vno-endnote-item") : null;
        const enId = noteItem ? (typeof noteItem.getAttribute === "function" ? noteItem.getAttribute("data-vno-endnote-id") : noteItem.dataset?.vnoEndnoteId) : null;
        if (enId && this.bodyDom) {
          const refEl = this.bodyDom.querySelector ? this.bodyDom.querySelector(`sup[data-vno-endnote-ref="${enId}"]`) : null;
          if (refEl) {
            refEl.scrollIntoView?.({ behavior: "smooth", block: "center" });
          }
        }
        return;
      }

      // 9. Endnote: Nút xóa chú thích cuối
      const enDelete = target.closest ? target.closest(".vno-endnote-item .vno-note-delete-btn") : null;
      if (enDelete) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const noteItem = enDelete.closest ? enDelete.closest(".vno-endnote-item") : null;
        const enId = noteItem ? (typeof noteItem.getAttribute === "function" ? noteItem.getAttribute("data-vno-endnote-id") : noteItem.dataset?.vnoEndnoteId) : null;
        if (enId) {
          this.deleteEndnote(enId);
        }
        return;
      }

      // 10. Diagram: Nút xóa sơ đồ
      const diagramDel = target.closest ? target.closest(".vno-diagram-delete-btn") : null;
      if (diagramDel) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const dEl = diagramDel.closest ? diagramDel.closest(".vno-writer-diagram") : null;
        if (dEl) {
          if (typeof dEl.remove === "function") dEl.remove();
          else if (dEl.parentNode) dEl.parentNode.removeChild(dEl);
          this.isDirty = true;
          this.recordSnapshot("writer.diagram.delete");
        }
        return;
      }

      // 11. Chart: Nút xóa biểu đồ
      const chartDel = target.closest ? target.closest(".vno-chart-delete-btn") : null;
      if (chartDel) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const cEl = chartDel.closest ? chartDel.closest(".vno-writer-chart") : null;
        if (cEl) {
          if (typeof cEl.remove === "function") cEl.remove();
          else if (cEl.parentNode) cEl.parentNode.removeChild(cEl);
          this.isDirty = true;
          this.recordSnapshot("writer.chart.delete");
        }
        return;
      }

      // 12. Shape: Nút xóa hình khối
      const shapeDel = target.closest ? target.closest(".vno-shape-delete-btn") : null;
      if (shapeDel) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const sEl = shapeDel.closest ? shapeDel.closest(".vno-writer-shape-item") : null;
        const sId = sEl ? (typeof sEl.getAttribute === "function" ? sEl.getAttribute("data-shape-id") : sEl.dataset?.shapeId) : null;
        if (sId) {
          this.deleteShape(sId);
        }
        return;
      }

      // 13. Shape: Chọn hình khối khi click
      const shapeItem = target.closest ? target.closest(".vno-writer-shape-item") : null;
      if (shapeItem) {
        const sId = typeof shapeItem.getAttribute === "function" ? shapeItem.getAttribute("data-shape-id") : shapeItem.dataset?.shapeId;
        this._selectShape(sId);
      } else if (!target.closest?.(".vno-writer-shape-item")) {
        this._selectShape(null);
      }
    };

    this.bodyDom.addEventListener("click", this._referenceClickHandler);
  }

  _syncNotesFromDom() {
    if (!this.bodyDom) return;
    const fnRefs = this.bodyDom.querySelectorAll ? Array.from(this.bodyDom.querySelectorAll("sup[data-vno-footnote-ref]")) : [];
    const fnContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-footnotes="true"]') : null;
    if (fnContainer) {
      const validFnIds = new Set(fnRefs.map(s => typeof s.getAttribute === "function" ? s.getAttribute("data-vno-footnote-ref") : s.dataset?.vnoFootnoteRef).filter(Boolean));
      const items = fnContainer.querySelectorAll ? Array.from(fnContainer.querySelectorAll(".vno-footnote-item")) : [];
      let changed = false;
      for (const item of items) {
        const id = typeof item.getAttribute === "function" ? item.getAttribute("data-vno-footnote-id") : item.dataset?.vnoFootnoteId;
        if (id && !validFnIds.has(id)) {
          if (typeof item.remove === "function") item.remove();
          else if (item.parentNode) item.parentNode.removeChild(item);
          changed = true;
        }
      }
      if (changed || items.length !== fnRefs.length) {
        this.renumberFootnotes();
      }
    }

    const enRefs = this.bodyDom.querySelectorAll ? Array.from(this.bodyDom.querySelectorAll("sup[data-vno-endnote-ref]")) : [];
    const enContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-endnotes="true"]') : null;
    if (enContainer) {
      const validEnIds = new Set(enRefs.map(s => typeof s.getAttribute === "function" ? s.getAttribute("data-vno-endnote-ref") : s.dataset?.vnoEndnoteRef).filter(Boolean));
      const items = enContainer.querySelectorAll ? Array.from(enContainer.querySelectorAll(".vno-endnote-item")) : [];
      let changed = false;
      for (const item of items) {
        const id = typeof item.getAttribute === "function" ? item.getAttribute("data-vno-endnote-id") : item.dataset?.vnoEndnoteId;
        if (id && !validEnIds.has(id)) {
          if (typeof item.remove === "function") item.remove();
          else if (item.parentNode) item.parentNode.removeChild(item);
          changed = true;
        }
      }
      if (changed || items.length !== enRefs.length) {
        this.renumberEndnotes();
      }
    }
  }

  /**
   * Kiểm tra xem một node DOM có nằm trong các vùng được bảo vệ (Footnotes, Endnotes, TOC, Auto page gap) hay không
   * Để ngăn chặn việc chèn lồng footnote vào footnote, endnote vào endnote, hoặc merge field vào TOC/notes.
   * @param {Node|Element} node
   * @returns {boolean}
   * @private
   */
  _isInsideProtectedZone(node) {
    if (!node) return false;
    let curr = (node.nodeType === 1 || (!node.nodeType && (node.tagName || node.getAttribute)))
      ? node
      : (node.parentElement || node.parentNode);
    let depth = 0;
    while (curr && curr !== this.bodyDom && depth < 50) {
      if (typeof curr.getAttribute === "function") {
        if (
          curr.getAttribute("data-vno-footnotes") === "true" ||
          curr.getAttribute("data-vno-endnotes") === "true" ||
          curr.getAttribute("data-vno-toc") === "true" ||
          curr.getAttribute("data-vno-auto-page-gap") === "true"
        ) {
          return true;
        }
      }
      if (curr.classList) {
        if (
          curr.classList.contains("vno-footnote-item") ||
          curr.classList.contains("vno-endnote-item") ||
          curr.classList.contains("vno-toc-block") ||
          curr.classList.contains("vno-writer-footnotes-container") ||
          curr.classList.contains("vno-writer-endnotes-container")
        ) {
          return true;
        }
      }
      curr = curr.parentNode || curr.parentElement;
      depth++;
    }
    return false;
  }

  insertTableOfContents() {
    this._initZones();
    if (!this.bodyDom) return false;

    const existing = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-toc="true"]') : null;
    if (existing) {
      return this.updateTableOfContents();
    }

    this.flushTyping();

    const tocElement = this._buildTableOfContentsElement();
    if (!tocElement) return false;

    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (!this._isInsideProtectedZone(commonNode) && (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode))) {
          try {
            range.collapse(true);
            if (typeof tocElement === "string") {
              const temp = document.createElement("div");
              temp.innerHTML = tocElement;
              const node = temp.firstElementChild;
              range.insertNode(node);
              range.setStartAfter(node);
            } else {
              range.insertNode(tocElement);
              range.setStartAfter(tocElement);
            }
            inserted = true;
          } catch {}
        }
      }
    }

    if (!inserted) {
      if (typeof tocElement === "string") {
        this.bodyDom.innerHTML = `${tocElement}\n${this.bodyDom.innerHTML}`;
      } else if (typeof this.bodyDom.prepend === "function") {
        this.bodyDom.prepend(tocElement);
      } else if (this.bodyDom.firstChild && typeof this.bodyDom.insertBefore === "function") {
        this.bodyDom.insertBefore(tocElement, this.bodyDom.firstChild);
      } else if (typeof this.bodyDom.appendChild === "function") {
        this.bodyDom.appendChild(tocElement);
      }
    }

    this.isDirty = true;
    this.recordSnapshot("writer.reference.tocInsert");
    return true;
  }

  updateTableOfContents() {
    this._initZones();
    if (!this.bodyDom) return false;

    const tocBlock = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-toc="true"]') : null;
    if (!tocBlock) {
      return this.insertTableOfContents();
    }

    this.flushTyping();

    const headings = this._collectHeadings();
    let entriesHtml = "";

    const emptyMsg = (typeof t === "function" && t("writerDialogs.toc.empty") !== "writerDialogs.toc.empty")
      ? t("writerDialogs.toc.empty")
      : "Chưa có tiêu đề nào trong tài liệu. Hãy định dạng các đoạn văn bằng Kiểu dáng Heading 1, 2 hoặc 3 rồi cập nhật lại mục lục.";

    if (headings.length === 0) {
      entriesHtml = `<div class="vno-toc-empty">${emptyMsg}</div>`;
    } else {
      entriesHtml = headings.map((h) => {
        return `
          <div class="vno-toc-item vno-toc-level-${h.level}">
            <a href="#${h.id}" class="vno-toc-link" data-target-id="${h.id}">
              <span class="vno-toc-text">${h.text}</span>
              <span class="vno-toc-leader"></span>
              <span class="vno-toc-page">${h.page}</span>
            </a>
          </div>
        `.trim();
      }).join("\n");
    }

    const entriesContainer = tocBlock.querySelector ? tocBlock.querySelector(".vno-toc-entries") : null;
    if (entriesContainer) {
      entriesContainer.innerHTML = entriesHtml;
    } else {
      const newElement = this._buildTableOfContentsElement();
      if (typeof newElement !== "string" && tocBlock.parentNode) {
        tocBlock.parentNode.replaceChild(newElement, tocBlock);
      } else {
        tocBlock.innerHTML = (typeof newElement === "string" ? newElement : newElement.innerHTML);
      }
    }

    this.isDirty = true;
    this.recordSnapshot("writer.reference.tocUpdate");
    return true;
  }

  deleteTableOfContents() {
    this._initZones();
    if (!this.bodyDom) return false;

    const tocBlock = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-toc="true"]') : null;
    if (!tocBlock) return false;

    this.flushTyping();

    if (typeof tocBlock.remove === "function") {
      tocBlock.remove();
    } else if (tocBlock.parentNode && typeof tocBlock.parentNode.removeChild === "function") {
      tocBlock.parentNode.removeChild(tocBlock);
    } else {
      this.bodyDom.innerHTML = this.bodyDom.innerHTML.replace(/<div\b[^>]*\bdata-vno-toc=["']?true["']?[^>]*>[\s\S]*?<\/div>/i, "");
    }

    this.isDirty = true;
    this.recordSnapshot("writer.reference.tocDelete");
    return true;
  }

  _buildTableOfContentsElement() {
    const headings = this._collectHeadings();
    let entriesHtml = "";

    const emptyMsg = (typeof t === "function" && t("writerDialogs.toc.empty") !== "writerDialogs.toc.empty")
      ? t("writerDialogs.toc.empty")
      : "Chưa có tiêu đề nào trong tài liệu. Hãy định dạng các đoạn văn bằng Kiểu dáng Heading 1, 2 hoặc 3 rồi cập nhật lại mục lục.";

    if (headings.length === 0) {
      entriesHtml = `<div class="vno-toc-empty">${emptyMsg}</div>`;
    } else {
      entriesHtml = headings.map((h) => {
        return `
          <div class="vno-toc-item vno-toc-level-${h.level}">
            <a href="#${h.id}" class="vno-toc-link" data-target-id="${h.id}">
              <span class="vno-toc-text">${h.text}</span>
              <span class="vno-toc-leader"></span>
              <span class="vno-toc-page">${h.page}</span>
            </a>
          </div>
        `.trim();
      }).join("\n");
    }

    const tocTitle = (typeof t === "function" && t("writerDialogs.toc.title") !== "writerDialogs.toc.title")
      ? t("writerDialogs.toc.title")
      : "MỤC LỤC";
    const updateBtnText = (typeof t === "function" && t("writerDialogs.toc.updateBtn") !== "writerDialogs.toc.updateBtn")
      ? t("writerDialogs.toc.updateBtn")
      : "🔄 Cập nhật";
    const updateTooltip = (typeof t === "function" && t("writerDialogs.toc.updateTooltip") !== "writerDialogs.toc.updateTooltip")
      ? t("writerDialogs.toc.updateTooltip")
      : "Cập nhật mục lục";
    const deleteTooltip = (typeof t === "function" && t("writerDialogs.toc.deleteTooltip") !== "writerDialogs.toc.deleteTooltip")
      ? t("writerDialogs.toc.deleteTooltip")
      : "Xóa mục lục";

    const html = `
      <div data-vno-toc="true" class="vno-toc-block" contenteditable="false">
        <div class="vno-toc-header">
          <span class="vno-toc-title">${tocTitle}</span>
          <div class="vno-toc-actions">
            <button type="button" class="vno-toc-btn vno-toc-btn-update" title="${updateTooltip}">${updateBtnText}</button>
            <button type="button" class="vno-toc-btn vno-toc-btn-delete" title="${deleteTooltip}">&times;</button>
          </div>
        </div>
        <div class="vno-toc-entries">
          ${entriesHtml}
        </div>
      </div>
    `.trim();

    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      return temp.firstElementChild || html;
    }
    return html;
  }

  _collectHeadings() {
    if (!this.bodyDom) return [];
    let headingNodes = [];
    if (typeof this.bodyDom.querySelectorAll === "function") {
      let all = [];
      try {
        all = Array.from(this.bodyDom.querySelectorAll("h1, h2, h3"));
      } catch {}
      if (!all || all.length === 0) {
        const walker = (node) => {
          if (!node || !node.children) return;
          for (const child of node.children) {
            const tag = (child.tagName || "").toUpperCase();
            if (tag === "H1" || tag === "H2" || tag === "H3") {
              all.push(child);
            }
            walker(child);
          }
        };
        walker(this.bodyDom);
      }
      headingNodes = all.filter((el) => !(el.closest && el.closest('[data-vno-toc="true"]')));
    } else if (this.bodyDom.innerHTML) {
      const matches = this.bodyDom.innerHTML.matchAll(/<(h[1-3])\b([^>]*)>([\s\S]*?)<\/\1>/gi);
      let idx = 1;
      for (const m of matches) {
        headingNodes.push({
          tagName: m[1].toUpperCase(),
          textContent: m[3].replace(/<[^>]+>/g, "").trim(),
          id: (m[2].match(/id=["']([^"']+)["']/i) || [])[1] || `heading-${idx++}`
        });
      }
      return headingNodes.map((h, i) => ({
        level: parseInt(h.tagName[1], 10),
        id: h.id,
        text: h.textContent || `Tiêu đề ${i + 1}`,
        page: 1
      }));
    }

    const headings = [];
    headingNodes.forEach((node, index) => {
      let id = typeof node.getAttribute === "function" ? node.getAttribute("id") : (node.attributes?.id || node.id);
      if (!id) {
        const rawText = (node.textContent || node.innerText || "").trim();
        const slug = rawText
          .toLowerCase()
          .replace(/[^a-z0-9\u00C0-\u024F\u1EA0-\u1EF9]+/gi, "-")
          .replace(/^-+|-+$/g, "");
        id = `heading-${index + 1}${slug ? `-${slug.slice(0, 30)}` : ""}`;
        if (typeof node.setAttribute === "function") {
          node.setAttribute("id", id);
        } else {
          node.id = id;
          if (node.attributes) node.attributes.id = id;
        }
      }

      // h1/h2/h3 không nhận focus() bằng trình duyệt thật nếu thiếu tabindex —
      // TOC link nhảy tới heading cần focus() thật sự hoạt động (không chỉ scroll).
      if (typeof node.hasAttribute === "function" && !node.hasAttribute("tabindex")) {
        node.setAttribute("tabindex", "-1");
      } else if (node.attributes && node.attributes.tabindex === undefined) {
        node.attributes.tabindex = "-1";
      }

      const tagName = (node.tagName || "H1").toUpperCase();
      const level = tagName === "H1" ? 1 : (tagName === "H2" ? 2 : 3);
      const text = (node.textContent || node.innerText || "").trim() || `Tiêu đề ${index + 1}`;
      const page = this._estimateHeadingPage(node);

      headings.push({ level, id, text, page });
    });

    return headings;
  }

  _estimateHeadingPage(headingNode) {
    if (!this.bodyDom) return 1;
    const dim = this.getPageDimensions ? this.getPageDimensions() : { printableHeightPx: 800, printableWidthPx: 600 };
    const hasHeader = Boolean(this.headerDom?.innerText?.trim());
    const hasFooter = Boolean(this.footerDom?.innerText?.trim());
    const headerReservedPx = hasHeader ? 46 : 0;
    const footerReservedPx = hasFooter ? 48 : 0;
    const availableHeightPx = Math.max(150, (dim.printableHeightPx || 800) - headerReservedPx - footerReservedPx);

    let blocks = [];
    if (this.bodyDom.children && this.bodyDom.children.length > 0) {
      blocks = Array.from(this.bodyDom.children);
    }

    let currentPage = 1;
    let currentHeight = 0;

    for (const el of blocks) {
      if (el.dataset?.vnoToc === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-toc") === "true")) {
        continue;
      }
      if (el.dataset?.vnoFootnotes === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-footnotes") === "true") ||
          el.dataset?.vnoEndnotes === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-endnotes") === "true")) {
        continue;
      }
      if (typeof el.getAttribute === "function" && el.getAttribute("data-vno-auto-page-gap") === "true") {
        continue;
      }

      const styleStr = (typeof el.getAttribute === "function" ? el.getAttribute("style") : "") || "";
      const text = el.textContent || el.innerText || "";
      const isBreak = styleStr.includes("page-break-before") || text.includes("Phân tách trang");

      if (isBreak && currentHeight > 0) {
        currentPage++;
        currentHeight = 0;
      }

      let h = 26;
      const tag = (el.tagName || "").toUpperCase();
      if (tag === "H1") h = 60;
      else if (tag === "H2") h = 48;
      else if (tag === "H3") h = 40;
      else if (tag === "TABLE") h = 120;
      else if (tag === "IMG") h = 200;
      else {
        const len = text.length;
        h = Math.max(1, Math.ceil(len / 70)) * 26 + 8;
      }

      if (currentHeight + h > availableHeightPx && currentHeight > 0) {
        currentPage++;
        currentHeight = h;
      } else {
        currentHeight += h;
      }

      if (el === headingNode || el.contains?.(headingNode)) {
        return currentPage;
      }
    }

    return 1;
  }

  insertFootnote(options = {}) {
    this._initZones();
    if (!this.bodyDom) return null;

    this.flushTyping();

    options = options || {};
    const id = options.id || `fn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const sup = typeof document !== "undefined" && typeof document.createElement === "function"
      ? document.createElement("sup")
      : {
          tagName: "SUP",
          attributes: { "data-vno-footnote-ref": id, class: "vno-footnote-ref", contenteditable: "false" },
          dataset: { vnoFootnoteRef: id },
          className: "vno-footnote-ref",
          textContent: "1",
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k]; }
        };
    const jumpToNoteTitle = (typeof t === "function" && t("writerDialogs.notes.jumpToNote") !== "writerDialogs.notes.jumpToNote")
      ? t("writerDialogs.notes.jumpToNote")
      : "Nhấp để chuyển đến chú thích";
    if (typeof sup.setAttribute === "function") {
      sup.setAttribute("data-vno-footnote-ref", id);
      sup.setAttribute("class", "vno-footnote-ref");
      sup.setAttribute("contenteditable", "false");
      sup.setAttribute("title", jumpToNoteTitle);
      sup.textContent = "1";
    }

    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (!this._isInsideProtectedZone(commonNode) && (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode))) {
          try {
            range.collapse(false);
            range.insertNode(sup);
            range.setStartAfter(sup);
            inserted = true;
          } catch {}
        }
      }
    }

    if (!inserted) {
      const existingContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-footnotes="true"], [data-vno-endnotes="true"]') : null;
      if (existingContainer && existingContainer.parentNode) {
        existingContainer.parentNode.insertBefore(sup, existingContainer);
      } else if (typeof this.bodyDom.appendChild === "function") {
        this.bodyDom.appendChild(sup);
      } else {
        const supHtml = `<sup data-vno-footnote-ref="${id}" class="vno-footnote-ref" contenteditable="false">1</sup>`;
        this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}${supHtml}`;
      }
    }

    let container = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-footnotes="true"]') : null;
    if (!container) {
      const containerHtml = `
        <div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false">
          <div class="vno-notes-separator"></div>
        </div>
      `.trim();

      if (typeof document !== "undefined" && typeof document.createElement === "function") {
        const temp = document.createElement("div");
        temp.innerHTML = containerHtml;
        container = temp.firstElementChild;
      } else {
        container = {
          tagName: "DIV",
          className: "vno-writer-footnotes-container",
          attributes: { "data-vno-footnotes": "true", class: "vno-writer-footnotes-container", contenteditable: "false" },
          dataset: { vnoFootnotes: "true" },
          children: [],
          appendChild(c) { this.children.push(c); return c; },
          querySelector() { return null; },
          querySelectorAll() { return []; },
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k]; },
          remove() {}
        };
      }

      const endnotesContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-endnotes="true"]') : null;
      if (endnotesContainer && endnotesContainer.parentNode) {
        endnotesContainer.parentNode.insertBefore(container, endnotesContainer);
      } else if (typeof this.bodyDom.appendChild === "function") {
        this.bodyDom.appendChild(container);
      }
    }

    const initialText = options.text || "";
    const jumpToRefTitle = (typeof t === "function" && t("writerDialogs.notes.jumpToRef") !== "writerDialogs.notes.jumpToRef")
      ? t("writerDialogs.notes.jumpToRef")
      : "Chuyển tới vị trí tham chiếu";
    const placeholder = (typeof t === "function" && t("writerDialogs.notes.footnotePlaceholder") !== "writerDialogs.notes.footnotePlaceholder")
      ? t("writerDialogs.notes.footnotePlaceholder")
      : "Nhập nội dung chú thích...";
    const deleteTitle = (typeof t === "function" && t("writerDialogs.notes.deleteFootnote") !== "writerDialogs.notes.deleteFootnote")
      ? t("writerDialogs.notes.deleteFootnote")
      : "Xóa chú thích";

    const itemHtml = `
      <div class="vno-footnote-item" data-vno-footnote-id="${id}">
        <span class="vno-note-num" title="${jumpToRefTitle}">1</span>
        <span class="vno-note-text" contenteditable="true" data-placeholder="${placeholder}">${initialText}</span>
        <button type="button" class="vno-note-delete-btn" title="${deleteTitle}">&times;</button>
      </div>
    `.trim();

    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.innerHTML = itemHtml;
      const itemEl = temp.firstElementChild;
      if (typeof container.appendChild === "function") {
        container.appendChild(itemEl);
      }
      const textInput = itemEl.querySelector ? itemEl.querySelector(".vno-note-text") : null;
      if (textInput?.focus) {
        setTimeout(() => textInput.focus(), 10);
      }
    } else if (typeof container.appendChild === "function") {
      container.appendChild({
        tagName: "DIV",
        className: "vno-footnote-item",
        dataset: { vnoFootnoteId: id },
        attributes: { "data-vno-footnote-id": id, class: "vno-footnote-item" },
        innerHTML: itemHtml,
        getAttribute(k) { return this.attributes ? this.attributes[k] : null; },
        setAttribute(k, v) { if (!this.attributes) this.attributes = {}; this.attributes[k] = v; },
        querySelector(s) {
          if (s === ".vno-note-num") return { textContent: "1" };
          return null;
        },
        remove() {}
      });
    }

    this.renumberFootnotes();

    this.isDirty = true;
    this.recordSnapshot("writer.reference.footnoteInsert");
    return id;
  }

  renumberFootnotes() {
    this._initZones();
    if (!this.bodyDom) return;

    let refs = [];
    if (typeof this.bodyDom.querySelectorAll === "function") {
      refs = Array.from(this.bodyDom.querySelectorAll("sup[data-vno-footnote-ref]"));
    }

    const container = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-footnotes="true"]') : null;

    if (refs.length === 0) {
      if (container) {
        if (typeof container.remove === "function") container.remove();
        else if (container.parentNode) container.parentNode.removeChild(container);
      }
      return;
    }

    const validIds = new Set();
    refs.forEach((sup, index) => {
      const num = index + 1;
      sup.textContent = String(num);
      const id = typeof sup.getAttribute === "function" ? sup.getAttribute("data-vno-footnote-ref") : (sup.dataset?.vnoFootnoteRef || sup.attributes?.["data-vno-footnote-ref"]);
      if (id) {
        validIds.add(id);
        if (container && typeof container.querySelector === "function") {
          const item = container.querySelector(`[data-vno-footnote-id="${id}"]`);
          if (item) {
            const numSpan = item.querySelector ? item.querySelector(".vno-note-num") : null;
            if (numSpan) numSpan.textContent = String(num);
            if (typeof container.appendChild === "function") {
              container.appendChild(item);
            }
          }
        }
      }
    });

    if (container && typeof container.querySelectorAll === "function") {
      const items = Array.from(container.querySelectorAll(".vno-footnote-item") || []);
      for (const item of items) {
        const id = typeof item.getAttribute === "function" ? item.getAttribute("data-vno-footnote-id") : (item.dataset?.vnoFootnoteId || item.attributes?.["data-vno-footnote-id"]);
        if (id && !validIds.has(id)) {
          if (typeof item.remove === "function") item.remove();
          else if (item.parentNode) item.parentNode.removeChild(item);
        }
      }
      const remaining = container.querySelectorAll(".vno-footnote-item") || [];
      if (remaining.length === 0) {
        if (typeof container.remove === "function") container.remove();
        else if (container.parentNode) container.parentNode.removeChild(container);
      }
    }
  }

  deleteFootnote(id) {
    this._initZones();
    if (!this.bodyDom || !id) return false;

    this.flushTyping();

    const sup = this.bodyDom.querySelector ? this.bodyDom.querySelector(`sup[data-vno-footnote-ref="${id}"]`) : null;
    if (sup) {
      if (typeof sup.remove === "function") sup.remove();
      else if (sup.parentNode) sup.parentNode.removeChild(sup);
    }

    const item = this.bodyDom.querySelector ? this.bodyDom.querySelector(`[data-vno-footnote-id="${id}"]`) : null;
    if (item) {
      if (typeof item.remove === "function") item.remove();
      else if (item.parentNode) item.parentNode.removeChild(item);
    }

    this.renumberFootnotes();

    this.isDirty = true;
    this.recordSnapshot("writer.reference.footnoteDelete");
    return true;
  }

  insertEndnote(options = {}) {
    this._initZones();
    if (!this.bodyDom) return null;

    this.flushTyping();

    options = options || {};
    const id = options.id || `en-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const sup = typeof document !== "undefined" && typeof document.createElement === "function"
      ? document.createElement("sup")
      : {
          tagName: "SUP",
          attributes: { "data-vno-endnote-ref": id, class: "vno-endnote-ref", contenteditable: "false" },
          dataset: { vnoEndnoteRef: id },
          className: "vno-endnote-ref",
          textContent: "i",
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k]; }
        };
    const jumpToEndnoteTitle = (typeof t === "function" && t("writerDialogs.notes.jumpToEndnote") !== "writerDialogs.notes.jumpToEndnote")
      ? t("writerDialogs.notes.jumpToEndnote")
      : "Nhấp để chuyển đến chú thích cuối";
    if (typeof sup.setAttribute === "function") {
      sup.setAttribute("data-vno-endnote-ref", id);
      sup.setAttribute("class", "vno-endnote-ref");
      sup.setAttribute("contenteditable", "false");
      sup.setAttribute("title", jumpToEndnoteTitle);
      sup.textContent = "i";
    }

    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (!this._isInsideProtectedZone(commonNode) && (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode))) {
          try {
            range.collapse(false);
            range.insertNode(sup);
            range.setStartAfter(sup);
            inserted = true;
          } catch {}
        }
      }
    }

    if (!inserted) {
      const existingContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-endnotes="true"], [data-vno-footnotes="true"]') : null;
      if (existingContainer && existingContainer.parentNode) {
        existingContainer.parentNode.insertBefore(sup, existingContainer);
      } else if (typeof this.bodyDom.appendChild === "function") {
        this.bodyDom.appendChild(sup);
      } else {
        const supHtml = `<sup data-vno-endnote-ref="${id}" class="vno-endnote-ref" contenteditable="false">i</sup>`;
        this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}${supHtml}`;
      }
    }

    let container = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-endnotes="true"]') : null;
    if (!container) {
      const endnotesTitle = (typeof t === "function" && t("writerDialogs.notes.endnotesTitle") !== "writerDialogs.notes.endnotesTitle")
        ? t("writerDialogs.notes.endnotesTitle")
        : "CHÚ THÍCH CUỐI TÀI LIỆU";
      const containerHtml = `
        <div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false">
          <div class="vno-notes-separator"></div>
          <div class="vno-notes-title">${endnotesTitle}</div>
        </div>
      `.trim();

      if (typeof document !== "undefined" && typeof document.createElement === "function") {
        const temp = document.createElement("div");
        temp.innerHTML = containerHtml;
        container = temp.firstElementChild;
      } else {
        container = {
          tagName: "DIV",
          className: "vno-writer-endnotes-container",
          attributes: { "data-vno-endnotes": "true", class: "vno-writer-endnotes-container", contenteditable: "false" },
          dataset: { vnoEndnotes: "true" },
          children: [],
          appendChild(c) { this.children.push(c); return c; },
          querySelector() { return null; },
          querySelectorAll() { return []; },
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k]; },
          remove() {}
        };
      }

      if (typeof this.bodyDom.appendChild === "function") {
        this.bodyDom.appendChild(container);
      }
    }

    const initialText = options.text || "";
    const jumpToRefTitle = (typeof t === "function" && t("writerDialogs.notes.jumpToRef") !== "writerDialogs.notes.jumpToRef")
      ? t("writerDialogs.notes.jumpToRef")
      : "Chuyển tới vị trí tham chiếu";
    const placeholder = (typeof t === "function" && t("writerDialogs.notes.endnotePlaceholder") !== "writerDialogs.notes.endnotePlaceholder")
      ? t("writerDialogs.notes.endnotePlaceholder")
      : "Nhập nội dung chú thích cuối...";
    const deleteTitle = (typeof t === "function" && t("writerDialogs.notes.deleteEndnote") !== "writerDialogs.notes.deleteEndnote")
      ? t("writerDialogs.notes.deleteEndnote")
      : "Xóa chú thích";

    const itemHtml = `
      <div class="vno-endnote-item" data-vno-endnote-id="${id}">
        <span class="vno-note-num" title="${jumpToRefTitle}">i</span>
        <span class="vno-note-text" contenteditable="true" data-placeholder="${placeholder}">${initialText}</span>
        <button type="button" class="vno-note-delete-btn" title="${deleteTitle}">&times;</button>
      </div>
    `.trim();

    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.innerHTML = itemHtml;
      const itemEl = temp.firstElementChild;
      if (typeof container.appendChild === "function") {
        container.appendChild(itemEl);
      }
      const textInput = itemEl.querySelector ? itemEl.querySelector(".vno-note-text") : null;
      if (textInput?.focus) {
        setTimeout(() => textInput.focus(), 10);
      }
    } else if (typeof container.appendChild === "function") {
      container.appendChild({
        tagName: "DIV",
        className: "vno-endnote-item",
        dataset: { vnoEndnoteId: id },
        attributes: { "data-vno-endnote-id": id, class: "vno-endnote-item" },
        innerHTML: itemHtml,
        getAttribute(k) { return this.attributes ? this.attributes[k] : null; },
        setAttribute(k, v) { if (!this.attributes) this.attributes = {}; this.attributes[k] = v; },
        querySelector(s) {
          if (s === ".vno-note-num") return { textContent: "i" };
          return null;
        },
        remove() {}
      });
    }

    this.renumberEndnotes();

    this.isDirty = true;
    this.recordSnapshot("writer.reference.endnoteInsert");
    return id;
  }

  renumberEndnotes() {
    this._initZones();
    if (!this.bodyDom) return;

    let refs = [];
    if (typeof this.bodyDom.querySelectorAll === "function") {
      refs = Array.from(this.bodyDom.querySelectorAll("sup[data-vno-endnote-ref]"));
    }

    const container = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-endnotes="true"]') : null;

    if (refs.length === 0) {
      if (container) {
        if (typeof container.remove === "function") container.remove();
        else if (container.parentNode) container.parentNode.removeChild(container);
      }
      return;
    }

    const validIds = new Set();
    refs.forEach((sup, index) => {
      const roman = toRoman(index + 1);
      sup.textContent = roman;
      const id = typeof sup.getAttribute === "function" ? sup.getAttribute("data-vno-endnote-ref") : (sup.dataset?.vnoEndnoteRef || sup.attributes?.["data-vno-endnote-ref"]);
      if (id) {
        validIds.add(id);
        if (container && typeof container.querySelector === "function") {
          const item = container.querySelector(`[data-vno-endnote-id="${id}"]`);
          if (item) {
            const numSpan = item.querySelector ? item.querySelector(".vno-note-num") : null;
            if (numSpan) numSpan.textContent = roman;
            if (typeof container.appendChild === "function") {
              container.appendChild(item);
            }
          }
        }
      }
    });

    if (container && typeof container.querySelectorAll === "function") {
      const items = Array.from(container.querySelectorAll(".vno-endnote-item") || []);
      for (const item of items) {
        const id = typeof item.getAttribute === "function" ? item.getAttribute("data-vno-endnote-id") : (item.dataset?.vnoEndnoteId || item.attributes?.["data-vno-endnote-id"]);
        if (id && !validIds.has(id)) {
          if (typeof item.remove === "function") item.remove();
          else if (item.parentNode) item.parentNode.removeChild(item);
        }
      }
      const remaining = container.querySelectorAll(".vno-endnote-item") || [];
      if (remaining.length === 0) {
        if (typeof container.remove === "function") container.remove();
        else if (container.parentNode) container.parentNode.removeChild(container);
      }
    }
  }

  deleteEndnote(id) {
    this._initZones();
    if (!this.bodyDom || !id) return false;

    this.flushTyping();

    const sup = this.bodyDom.querySelector ? this.bodyDom.querySelector(`sup[data-vno-endnote-ref="${id}"]`) : null;
    if (sup) {
      if (typeof sup.remove === "function") sup.remove();
      else if (sup.parentNode) sup.parentNode.removeChild(sup);
    }

    const item = this.bodyDom.querySelector ? this.bodyDom.querySelector(`[data-vno-endnote-id="${id}"]`) : null;
    if (item) {
      if (typeof item.remove === "function") item.remove();
      else if (item.parentNode) item.parentNode.removeChild(item);
    }

    this.renumberEndnotes();

    this.isDirty = true;
    this.recordSnapshot("writer.reference.endnoteDelete");
    return true;
  }

  // =========================================================================
  // HE THONG TRON THU (MAIL MERGE ENGINE)
  // =========================================================================

  /**
   * Thiết lập nguồn dữ liệu trộn thư từ chuỗi CSV
   * @param {string} csvText
   * @returns {{ fields: string[], records: Array<Record<string, string>> }}
   */
  setMailMergeData(csvText) {
    if (typeof csvText !== "string") {
      this.mailMergeData = { fields: [], records: [], rawCsv: "" };
      this._updateMailMergeCommandStates();
      return { fields: [], records: [] };
    }
    const { fields, records } = parseCsv(csvText);
    this.mailMergeData = {
      rawCsv: csvText,
      fields,
      records
    };
    this.mailMergePreview.recordIndex = 0;
    if (this.mailMergePreview.enabled) {
      if (records.length > 0) {
        this._renderMergePreview(records[0]);
      } else {
        this._clearMergePreview();
        this.mailMergePreview.enabled = false;
      }
    }
    this._updateMailMergeCommandStates();
    return { fields, records };
  }

  /**
   * Mở hộp thoại nhập nguồn dữ liệu CSV hoặc nạp trực tiếp qua options.csv
   * @param {Object} [options={}]
   * @returns {Promise<{ fields: string[], records: Array<Record<string, string>> }|null>}
   */
  async openMailMergeDataSourceDialog(options = {}) {
    options = options || {};
    const csvInput = options.csv !== undefined ? options.csv : options.csvText;
    if (csvInput !== undefined) {
      return this.setMailMergeData(csvInput);
    }
    return new Promise((resolve) => {
      showMailMergeDataSourceDialog({
        currentCsv: this.mailMergeData?.rawCsv || "",
        onSave: (csv) => {
          const res = this.setMailMergeData(csv);
          resolve(res);
        },
        onCancel: () => {
          resolve(null);
        }
      });
    });
  }

  /**
   * Chèn trường trộn thư tại vị trí con trỏ trong tài liệu
   * Cú pháp chuẩn Word: <span class="vno-merge-field" data-field="TenCot" contenteditable="false">«TenCot»</span>
   * @param {Object|string} [options={}]
   * @returns {HTMLElement|Object|null}
   */
  insertMergeField(options = {}) {
    options = options || {};
    this._initZones();
    if (!this.bodyDom) return null;

    this.flushTyping();

    if (typeof options === "string") {
      options = { field: options };
    }

    let fieldName = (options.field || options.fieldName || "").trim();

    if (!fieldName) {
      if (this.mailMergeData?.fields?.length > 0) {
        if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
          showInsertMergeFieldDialog({
            fields: this.mailMergeData.fields,
            onInsert: (selected) => {
              if (selected) {
                this.insertMergeField({ field: selected });
              }
            }
          });
          return null;
        } else {
          fieldName = this.mailMergeData.fields[0];
        }
      } else {
        if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
          const insertPromptTitle = (typeof t === "function" && t("writerDialogs.mailMerge.insertFieldTitle") !== "writerDialogs.mailMerge.insertFieldTitle")
            ? t("writerDialogs.mailMerge.insertFieldTitle")
            : "Chèn trường trộn thư";
          const insertPromptMsg = (typeof t === "function" && t("writerDialogs.mailMerge.selectFieldPrompt") !== "writerDialogs.mailMerge.selectFieldPrompt")
            ? t("writerDialogs.mailMerge.selectFieldPrompt")
            : "Chưa có nguồn dữ liệu. Nhập tên trường cần chèn:";
          showPromptDialog({
            title: insertPromptTitle,
            message: insertPromptMsg,
            defaultValue: "HoTen"
          }).then((val) => {
            if (val && val.trim()) {
              this.insertMergeField({ field: val.trim() });
            }
          });
          return null;
        } else {
          fieldName = "HoTen";
        }
      }
    }

    const span = typeof document !== "undefined" && typeof document.createElement === "function"
      ? document.createElement("span")
      : {
          tagName: "SPAN",
          className: "vno-merge-field",
          dataset: { field: fieldName },
          attributes: { class: "vno-merge-field", "data-field": fieldName, contenteditable: "false" },
          textContent: `«${fieldName}»`,
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k]; }
        };

    if (typeof span.setAttribute === "function") {
      span.setAttribute("class", "vno-merge-field");
      span.setAttribute("data-field", fieldName);
      span.setAttribute("contenteditable", "false");
      span.textContent = `«${fieldName}»`;
    }

    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (!this._isInsideProtectedZone(commonNode) && (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode))) {
          try {
            range.deleteContents();
            range.insertNode(span);
            range.setStartAfter(span);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            inserted = true;
          } catch {}
        }
      }
    }

    if (!inserted) {
      const existingContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-footnotes="true"], [data-vno-endnotes="true"]') : null;
      if (existingContainer && existingContainer.parentNode) {
        existingContainer.parentNode.insertBefore(span, existingContainer);
      } else if (typeof this.bodyDom.appendChild === "function") {
        const lastP = this.bodyDom.querySelector ? this.bodyDom.querySelector("p:last-of-type") : null;
        if (lastP && typeof lastP.appendChild === "function") {
          lastP.appendChild(span);
        } else {
          this.bodyDom.appendChild(span);
        }
      } else {
        const spanHtml = `<span class="vno-merge-field" data-field="${fieldName}" contenteditable="false">«${fieldName}»</span>`;
        this.bodyDom.innerHTML = (this.bodyDom.innerHTML || "") + spanHtml;
      }
    }

    if (this.mailMergePreview.enabled) {
      const record = this.mailMergeData.records[this.mailMergePreview.recordIndex];
      if (record && record[fieldName] !== undefined) {
        span.textContent = record[fieldName];
        if (span.classList?.add) span.classList.add("vno-merge-preview");
      }
    }

    this.isDirty = true;
    this.recordSnapshot("writer.mailMerge.insertField");
    return span;
  }

  /**
   * Bật/tắt chế độ xem trước bản ghi trộn thư (Preview Results)
   * @param {Object|boolean} [options={}]
   * @returns {boolean}
   */
  toggleMailMergePreview(options = {}) {
    options = options || {};
    this.flushTyping();
    this._initZones();

    const force = typeof options.force === "boolean"
      ? options.force
      : (typeof options === "boolean" ? options : null);

    const records = this.mailMergeData?.records || [];
    if (records.length === 0) {
      if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
        const previewWarnTitle = (typeof t === "function" && t("writerDialogs.mailMerge.noDataWarningTitle") !== "writerDialogs.mailMerge.noDataWarningTitle")
          ? t("writerDialogs.mailMerge.noDataWarningTitle")
          : "Xem trước trộn thư";
        const previewWarnMsg = (typeof t === "function" && t("writerDialogs.mailMerge.noDataWarningMsg") !== "writerDialogs.mailMerge.noDataWarningMsg")
          ? t("writerDialogs.mailMerge.noDataWarningMsg")
          : "Chưa có nguồn dữ liệu trộn thư. Vui lòng mở 'Nguồn dữ liệu' để dán bảng CSV trước.";
        showAlertDialog({
          title: previewWarnTitle,
          message: previewWarnMsg,
          type: "warning"
        });
      }
      this.mailMergePreview.enabled = false;
      this._updateMailMergeCommandStates();
      return false;
    }

    const nextState = force !== null ? force : !this.mailMergePreview.enabled;
    this.mailMergePreview.enabled = nextState;

    if (options.recordIndex !== undefined) {
      this.mailMergePreview.recordIndex = Math.max(0, Math.min(records.length - 1, parseInt(options.recordIndex, 10) || 0));
    }

    if (this.mailMergePreview.enabled) {
      const currentIdx = Math.max(0, Math.min(records.length - 1, this.mailMergePreview.recordIndex));
      this.mailMergePreview.recordIndex = currentIdx;
      this._renderMergePreview(records[currentIdx]);
    } else {
      this._clearMergePreview();
    }

    this._updateMailMergeCommandStates();
    return this.mailMergePreview.enabled;
  }

  /**
   * Chuyển đến bản ghi trước đó trong danh sách trộn thư
   * @param {Object} [options={}]
   * @returns {number|boolean}
   */
  prevMailMergeRecord(options = {}) {
    options = options || {};
    const records = this.mailMergeData?.records || [];
    if (records.length === 0) return false;

    if (!this.mailMergePreview.enabled) {
      return this.toggleMailMergePreview({ force: true, recordIndex: 0 });
    }

    if (this.mailMergePreview.recordIndex > 0) {
      this.mailMergePreview.recordIndex--;
      this._renderMergePreview(records[this.mailMergePreview.recordIndex]);
      this._updateMailMergeCommandStates();
      return this.mailMergePreview.recordIndex;
    }
    return false;
  }

  /**
   * Chuyển đến bản ghi tiếp theo trong danh sách trộn thư
   * @param {Object} [options={}]
   * @returns {number|boolean}
   */
  nextMailMergeRecord(options = {}) {
    options = options || {};
    const records = this.mailMergeData?.records || [];
    if (records.length === 0) return false;

    if (!this.mailMergePreview.enabled) {
      return this.toggleMailMergePreview({ force: true, recordIndex: 0 });
    }

    if (this.mailMergePreview.recordIndex < records.length - 1) {
      this.mailMergePreview.recordIndex++;
      this._renderMergePreview(records[this.mailMergePreview.recordIndex]);
      this._updateMailMergeCommandStates();
      return this.mailMergePreview.recordIndex;
    }
    return false;
  }

  /**
   * Hoàn tất trộn thư: tạo ra N bản sao nội dung thật, nối bằng ngắt trang page-break-before
   * @param {Object} [options={}]
   * @returns {boolean}
   */
  finishMailMerge(options = {}) {
    options = options || {};
    this.flushTyping();
    this._initZones();
    if (!this.bodyDom) return false;

    // Tắt chế độ preview trước để lấy HTML mẫu nguyên bản chứa field marker
    if (this.mailMergePreview.enabled) {
      this._clearMergePreview();
      this.mailMergePreview.enabled = false;
      this._updateMailMergeCommandStates();
    }

    const records = (options.records && options.records.length > 0)
      ? options.records
      : (this.mailMergeData?.records || []);

    const finishTitle = (typeof t === "function" && t("writerDialogs.mailMerge.finishTitle") !== "writerDialogs.mailMerge.finishTitle")
      ? t("writerDialogs.mailMerge.finishTitle")
      : "Hoàn tất trộn thư";
    const finishNoData = (typeof t === "function" && t("writerDialogs.mailMerge.finishNoData") !== "writerDialogs.mailMerge.finishNoData")
      ? t("writerDialogs.mailMerge.finishNoData")
      : "Chưa có nguồn dữ liệu trộn thư để tạo tài liệu. Vui lòng mở 'Nguồn dữ liệu' để dán bảng CSV.";
    const finishNoFields = (typeof t === "function" && t("writerDialogs.mailMerge.finishNoFields") !== "writerDialogs.mailMerge.finishNoFields")
      ? t("writerDialogs.mailMerge.finishNoFields")
      : "Tài liệu hiện tại chưa chứa trường trộn thư nào. Hãy dùng lệnh 'Chèn trường' để chèn ít nhất một trường trộn.";

    if (records.length === 0) {
      if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
        showAlertDialog({
          title: finishTitle,
          message: finishNoData,
          type: "warning"
        });
      }
      return false;
    }

    const templateHtml = this.bodyDom.innerHTML || "";

    const hasField = templateHtml.includes("vno-merge-field") || templateHtml.includes("data-field");
    if (!hasField) {
      if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
        showAlertDialog({
          title: finishTitle,
          message: finishNoFields,
          type: "warning"
        });
      }
      return false;
    }

    // Bảo đảm snapshot trước khi trộn chứa template nguyên bản với field markers để Undo khôi phục chuẩn
    this._lastSnapshot = this._createSnapshot("Template Before Merge");

    const PAGE_BREAK_HTML = `<div style="page-break-before:always; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</div>`;

    const copies = records.map((record) => {
      return replaceMergeFields(templateHtml, record);
    });

    const mergedHtml = copies.join(`\n${PAGE_BREAK_HTML}\n`);

    this.bodyDom.innerHTML = mergedHtml;
    this.isDirty = true;
    this.recordSnapshot("writer.mailMerge.finish");

    if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
      const pattern = (typeof t === "function" && t("writerDialogs.mailMerge.finishSuccess") !== "writerDialogs.mailMerge.finishSuccess")
        ? t("writerDialogs.mailMerge.finishSuccess")
        : "Đã hoàn tất trộn thư thành công {count} bản ghi vào tài liệu. Bạn có thể xem trước khi in hoặc xuất tệp.";
      showAlertDialog({
        title: finishTitle,
        message: pattern.replace("{count}", records.length),
        type: "success"
      });
    }

    return true;
  }

  /**
   * Cập nhật hiển thị preview cho các trường trộn thư
   * @param {Record<string, string>} record
   * @private
   */
  _renderMergePreview(record) {
    if (!this.bodyDom) return;
    const fields = this.bodyDom.querySelectorAll
      ? this.bodyDom.querySelectorAll(".vno-merge-field, [data-field]")
      : [];
    if (fields.length > 0) {
      for (const field of fields) {
        const fieldName = field.getAttribute ? field.getAttribute("data-field") : (field.dataset?.field || field.attributes?.["data-field"]);
        if (fieldName) {
          const val = record && record[fieldName] !== undefined ? record[fieldName] : `«${fieldName}»`;
          field.textContent = val;
          if (field.classList?.add) {
            field.classList.add("vno-merge-preview");
          }
        }
      }
    } else if (typeof this.bodyDom.innerHTML === "string") {
      this.bodyDom.innerHTML = this.bodyDom.innerHTML.replace(
        /<span\b([^>]*\bdata-field=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/span>/gi,
        (match, attrs, fieldName) => {
          const val = record && record[fieldName] !== undefined ? record[fieldName] : `«${fieldName}»`;
          const withClass = attrs.includes("vno-merge-preview") ? attrs : attrs + ' class="vno-merge-preview"';
          return `<span${withClass}>${val}</span>`;
        }
      );
    }
  }

  /**
   * Khôi phục hiển thị trường trộn thư về dạng marker ban đầu «FieldName»
   * @private
   */
  _clearMergePreview() {
    if (!this.bodyDom) return;
    const fields = this.bodyDom.querySelectorAll
      ? this.bodyDom.querySelectorAll(".vno-merge-field, [data-field]")
      : [];
    if (fields.length > 0) {
      for (const field of fields) {
        const fieldName = field.getAttribute ? field.getAttribute("data-field") : (field.dataset?.field || field.attributes?.["data-field"]);
        if (fieldName) {
          field.textContent = `«${fieldName}»`;
          if (field.classList?.remove) {
            field.classList.remove("vno-merge-preview");
          }
        }
      }
    } else if (typeof this.bodyDom.innerHTML === "string") {
      this.bodyDom.innerHTML = this.bodyDom.innerHTML.replace(
        /<span\b([^>]*\bdata-field=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/span>/gi,
        (match, attrs, fieldName) => {
          const cleanAttrs = attrs.replace(/\bvno-merge-preview\b/g, "").trim();
          return `<span${cleanAttrs}>«${fieldName}»</span>`;
        }
      );
    }
  }

  /**
   * Cập nhật trạng thái enabled/disabled/active của các command trộn thư trên Ribbon
   * @private
   */
  _updateMailMergeCommandStates() {
    if (typeof globalCommandBus?.updateState !== "function") return;

    const hasData = Boolean(this.mailMergeData?.records?.length > 0);
    const isPreview = Boolean(this.mailMergePreview?.enabled);
    const currentIndex = this.mailMergePreview?.recordIndex || 0;
    const totalRecords = this.mailMergeData?.records?.length || 0;

    globalCommandBus.updateState("writer.mailMerge.preview", {
      checked: isPreview,
      enabled: hasData
    });
    globalCommandBus.updateState("writer.mailMerge.prevRecord", {
      enabled: hasData && currentIndex > 0
    });
    globalCommandBus.updateState("writer.mailMerge.nextRecord", {
      enabled: hasData && currentIndex < totalRecords - 1
    });
    globalCommandBus.updateState("writer.mailMerge.finish", {
      enabled: hasData
    });
  }
}

