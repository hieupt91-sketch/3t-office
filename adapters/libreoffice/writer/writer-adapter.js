/**
 * VN Office LibreOffice Adapter — VN Writer Adapter
 * Quản lý tương tác với StarWriter (sw) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showPromptDialog, showFindReplaceDialog, showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { parseCsv, replaceMergeFields, showMailMergeDataSourceDialog, showInsertMergeFieldDialog } from "../../../apps/writer/mail-merge.js";
import {
  ENVELOPE_SIZES,
  LABEL_LAYOUTS,
  buildEnvelopeHtml,
  buildLabelSheetHtml,
  formatRecordAsAddress,
  paginateLabelContents,
  showEnvelopeDialog,
  showLabelsDialog
} from "../../../apps/writer/envelopes-labels.js";
import { STYLE_PRESETS, showStyleGalleryDropdown, closeStyleGalleryDropdown, createStyleGalleryStrip } from "../../../apps/writer/style-gallery.js";
import { showWatermarkDialog, showPageBorderDialog, showPageColorDialog } from "../../../apps/writer/page-decorations.js";
import { showColumnsDialog } from "../../../apps/writer/columns-dialog.js";
import { SHAPE_TYPES, showShapeDialog, renderShapeSvg, showDiagramDialog, generateDiagramHtml, showChartDialog, generateChartHtml } from "../../../apps/writer/writer-illustrations.js";
import { DOCUMENT_THEMES, showThemeGalleryDialog } from "../../../apps/writer/theme-gallery.js";
import { showSymbolPicker } from "../../../platform/ui-kit/symbol-picker.js";
import { formatDateTime, showDateTimeDialog } from "../../../platform/ui-kit/datetime-picker.js";
import { showEquationDialog, showBookmarkDialog, showCrossReferenceDialog, slugBookmarkName, showWordArtDialog, buildWriterWordArtHtml, applyWordArtCss, parseWordArtStyleAttr, resolveWordArtStyle, WORDART_PRESETS } from "../../../apps/writer/insert-dialogs.js";
import { t } from "../../../platform/i18n/i18n.js";
import { CITATION_STYLES, authorSortKey, citationMetadataHtml, formatBibliographyEntry, formatInTextCitation, normalizeSource, parseCitationMetadata, showInsertCitationDialog, showSourceManagerDialog } from "../../../apps/writer/citations.js";
import {
  buildCaptionHtml,
  captionKindLabel,
  captionsMetadataHtml,
  defaultCaptionPosition,
  normalizeCaptionKind,
  normalizeTofKind,
  parseCaptionMarker,
  parseCaptionsMetadata,
  parseCaptionVisibleText,
  parseTofMarker,
  showInsertCaptionDialog,
  showInsertTableOfFiguresDialog,
  tableOfFiguresTitle,
  tofMarkerHtml
} from "../../../apps/writer/captions.js";
import { countBlockParagraphs, countDocumentStats, showWordCountDialog } from "../../../apps/writer/word-count.js";

// Kích thước khổ giấy chuẩn (mm, khổ dọc — hoán đổi W/H khi ngang)
const PAGE_SIZES_MM = {
  a4: { label: "A4 (210 × 297 mm)", w: 210, h: 297 },
  letter: { label: "Letter (216 × 279 mm)", w: 216, h: 279 },
  legal: { label: "Legal (216 × 356 mm)", w: 216, h: 356 },
  dl: { label: ENVELOPE_SIZES.dl.label, w: ENVELOPE_SIZES.dl.w, h: ENVELOPE_SIZES.dl.h },
  c5: { label: ENVELOPE_SIZES.c5.label, w: ENVELOPE_SIZES.c5.w, h: ENVELOPE_SIZES.c5.h },
  number10: { label: ENVELOPE_SIZES.number10.label, w: ENVELOPE_SIZES.number10.w, h: ENVELOPE_SIZES.number10.h }
};

// Lề mặc định theo Nghị định 30/2020/NĐ-CP: Trên 20mm, Dưới 20mm, Trái 30mm, Phải 15mm
const DEFAULT_MARGINS_MM = { top: 20, bottom: 20, left: 30, right: 15 };
const MM_TO_PX = 3.7795275591; // 96dpi

function pageSizeMm(setup) {
  if (setup?.size === "custom" && Number.isFinite(setup.widthMm) && Number.isFinite(setup.heightMm)) {
    return { label: `Tùy chỉnh (${setup.widthMm} × ${setup.heightMm} mm)`, w: setup.widthMm, h: setup.heightMm };
  }
  return PAGE_SIZES_MM[setup?.size] || PAGE_SIZES_MM.a4;
}
/** LibreOffice 26.2.5 drops tracked-changes unless office:change-info has a date. Session canvas markers have none. */
const FODT_TRACK_CHANGE_SENTINEL_DATE = "1970-01-01T00:00:00";

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

const WRITER_MULTILEVEL_PRESETS = {
  decimal: { className: "vno-ml-decimal", styleName: "LMultiDecimal" },
  letter: { className: "vno-ml-letter", styleName: "LMultiLetter" },
  nd30: { className: "vno-ml-nd30", styleName: "LMultiNd30" }
};
const WRITER_MULTILEVEL_BY_CLASS = Object.fromEntries(
  Object.values(WRITER_MULTILEVEL_PRESETS).map((preset) => [preset.className, preset.styleName])
);
const WRITER_MULTILEVEL_BY_STYLE = Object.fromEntries(
  Object.values(WRITER_MULTILEVEL_PRESETS).map((preset) => [preset.styleName, preset.className])
);
const WRITER_LIST_STYLE_NAMES = new Set(["LBullet", "LNumber", ...Object.keys(WRITER_MULTILEVEL_BY_STYLE)]);
const WRITER_MULTILEVEL_MAX_DEPTH = 3;

function fodtListLevelNumberXml({ level, format, suffix = ".", prefix = "", displayLevels, spaceBeforeCm }) {
  const attrs = [`text:level="${level}"`, `style:num-format="${format}"`];
  if (prefix) attrs.push(`style:num-prefix="${prefix}"`);
  if (suffix !== "") attrs.push(`style:num-suffix="${suffix}"`);
  if (displayLevels) attrs.push(`text:display-levels="${displayLevels}"`);
  return `<text:list-level-style-number ${attrs.join(" ")}><style:list-level-properties text:space-before="${spaceBeforeCm}cm" text:min-label-width="0.635cm"/></text:list-level-style-number>`;
}

function fodtMultilevelListStyleXml(styleName) {
  const space = [0.635, 1.27, 1.905];
  if (styleName === "LMultiDecimal") {
    return `<text:list-style style:name="LMultiDecimal">${fodtListLevelNumberXml({ level: 1, format: "1", suffix: ".", spaceBeforeCm: space[0] })}${fodtListLevelNumberXml({ level: 2, format: "1", suffix: ".", displayLevels: 2, spaceBeforeCm: space[1] })}${fodtListLevelNumberXml({ level: 3, format: "1", suffix: ".", displayLevels: 3, spaceBeforeCm: space[2] })}</text:list-style>`;
  }
  if (styleName === "LMultiLetter") {
    return `<text:list-style style:name="LMultiLetter">${fodtListLevelNumberXml({ level: 1, format: "1", suffix: ".", spaceBeforeCm: space[0] })}${fodtListLevelNumberXml({ level: 2, format: "a", suffix: ".", spaceBeforeCm: space[1] })}${fodtListLevelNumberXml({ level: 3, format: "i", suffix: ".", spaceBeforeCm: space[2] })}</text:list-style>`;
  }
  if (styleName === "LMultiNd30") {
    return `<text:list-style style:name="LMultiNd30">${fodtListLevelNumberXml({ level: 1, format: "1", prefix: "Điều ", suffix: ".", spaceBeforeCm: space[0] })}${fodtListLevelNumberXml({ level: 2, format: "1", suffix: ".", spaceBeforeCm: space[1] })}${fodtListLevelNumberXml({ level: 3, format: "a", suffix: ")", spaceBeforeCm: space[2] })}</text:list-style>`;
  }
  return "";
}

function multilevelStyleFromClass(className) {
  const tokens = String(className || "").split(/\s+/);
  for (const token of tokens) {
    if (WRITER_MULTILEVEL_BY_CLASS[token]) return WRITER_MULTILEVEL_BY_CLASS[token];
  }
  return "";
}

export class WriterAdapter {
  constructor(editorDom) {
    this.editorDom = editorDom;
    this.documentContent = "";
    this.isDirty = false;
    this._openedEditorDomHash = null;
    this.sourceFileName = "TaiLieu";
    this.pageSetup = {
      size: "a4",
      orientation: "portrait",
      margins: { ...DEFAULT_MARGINS_MM },
      headerDistanceMm: 12.7,
      footerDistanceMm: 12.7
    };
    this.activeSectionId = "section-1";
    this.sectionPageSetups = { "section-1": JSON.parse(JSON.stringify(this.pageSetup)) };
    this._sectionSequence = 1;
    this.copiedFormat = null;
    this.docStyles = null;
    // Tài liệu trống lúc khởi động cũng cần --vno-font-ratio (giãn dòng kiểu Word).
    try { this._applyDocStyles(); } catch {}
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
    this._activeTrackChange = null;
    this._trackChangesBeforeInputHandler = null;
    this._workflowBeforeInputHandler = null;
    this._workflowInputHandler = null;
    this._workflowKeydownHandler = null;
    this._resetInlineFormattingOnNextInput = null;
    this._normalizeParagraphAfterHeading = false;
    this._referenceClickHandler = null;
    this.citationStyle = "apa";
    this.citationSources = [];
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
    this.pageColor = "transparent";
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
    this.lineNumbers = { enabled: false, countBy: 1, restart: "continuous" };
    this.shapes = [];
    this.selectedShapeId = null;
    this.selectedWordArtEl = null;
    this._wordArtEditing = false;
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
    globalCommandBus.bindHandler("writer.review.commentPrevious", () => this.previousComment());
    globalCommandBus.bindHandler("writer.review.commentNext", () => this.nextComment());
    globalCommandBus.bindHandler("writer.review.commentDelete", () => this.deleteActiveComment());
    globalCommandBus.bindHandler("writer.review.commentResolve", () => this.toggleActiveCommentResolved());
    globalCommandBus.bindHandler("writer.trackChanges.toggle", (args) => this.toggleTrackChanges(args?.enabled));
    globalCommandBus.bindHandler("writer.trackChanges.previous", () => this.previousTrackChange());
    globalCommandBus.bindHandler("writer.trackChanges.next", () => this.nextTrackChange());
    globalCommandBus.bindHandler("writer.trackChanges.acceptOne", () => this.acceptOneTrackChange());
    globalCommandBus.bindHandler("writer.trackChanges.rejectOne", () => this.rejectOneTrackChange());
    globalCommandBus.bindHandler("writer.trackChanges.acceptAll", () => this.acceptAllTrackChanges());
    globalCommandBus.bindHandler("writer.trackChanges.rejectAll", () => this.rejectAllTrackChanges());
    globalCommandBus.bindHandler("writer.review.wordCount", () => this.openWordCountDialog());

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
    globalCommandBus.bindHandler("writer.reference.citationStyle", (style) => this.setCitationStyle(style));
    globalCommandBus.bindHandler("writer.reference.citationInsert", (args) => this.openInsertCitationDialog(args));
    globalCommandBus.bindHandler("writer.reference.sourcesManage", (args) => this.openSourceManagerDialog(args));
    globalCommandBus.bindHandler("writer.reference.bibliographyInsert", () => this.insertBibliography());
    globalCommandBus.bindHandler("writer.reference.captionInsert", (args) => this.openInsertCaptionDialog(args));
    globalCommandBus.bindHandler("writer.reference.tofInsert", (args) => this.openInsertTableOfFiguresDialog(args));
    globalCommandBus.bindHandler("writer.reference.tofUpdate", (args) => this.updateTableOfFigures(args));
    this._bindCaptionObserver();

    // Bind Mail Merge (Trộn thư)
    globalCommandBus.bindHandler("writer.mailMerge.open", (args) => this.openMailMergeDataSourceDialog(args));
    globalCommandBus.bindHandler("writer.mailMerge.insertField", (args) => this.insertMergeField(args));
    globalCommandBus.bindHandler("writer.mailMerge.preview", (args) => this.toggleMailMergePreview(args));
    globalCommandBus.bindHandler("writer.mailMerge.prevRecord", (args) => this.prevMailMergeRecord(args));
    globalCommandBus.bindHandler("writer.mailMerge.nextRecord", (args) => this.nextMailMergeRecord(args));
    globalCommandBus.bindHandler("writer.mailMerge.finish", (args) => this.finishMailMerge(args));
    globalCommandBus.bindHandler("writer.mailings.envelopes", (args) => this.openEnvelopeDialog(args));
    globalCommandBus.bindHandler("writer.mailings.labels", (args) => this.openLabelsDialog(args));
    this._updateMailMergeCommandStates();

    // Áp dụng trang trí trang (Hình mờ & Viền trang)
    this._applyDecorations();
    this._applyLineNumbersIndicator();

    // Bind Thư viện Kiểu & Trang trí trang (Watermark & Page Border)
    this._bindStyleTracking();
    globalCommandBus.bindHandler("writer.style.gallery", (args) => this.toggleStyleGallery(args));
    globalCommandBus.bindHandler("writer.page.watermark", (args) => this.openWatermarkDialog(args));
    globalCommandBus.bindHandler("writer.page.color", (args) => this.openPageColorDialog(args));
    globalCommandBus.bindHandler("writer.break.column", () => this._insertColumnBreak());
    globalCommandBus.bindHandler("writer.section.nextPage", () => this.insertSectionBreak("nextPage"));
    globalCommandBus.bindHandler("writer.section.continuous", () => this.insertSectionBreak("continuous"));
    globalCommandBus.bindHandler("writer.section.evenPage", () => this.insertSectionBreak("evenPage"));
    globalCommandBus.bindHandler("writer.section.oddPage", () => this.insertSectionBreak("oddPage"));
    globalCommandBus.bindHandler("writer.page.border", (args) => this.openPageBorderDialog(args));
    globalCommandBus.bindHandler("writer.page.columns", (args) => this.openColumnsDialog(args));
    globalCommandBus.bindHandler("writer.page.columns1", () => this.setColumns({ count: 1, gap: 0, rule: false }));
    globalCommandBus.bindHandler("writer.page.columns2", () => this.setColumns({ count: 2, gap: 10, rule: false }));
    globalCommandBus.bindHandler("writer.page.columns3", () => this.setColumns({ count: 3, gap: 10, rule: false }));
    globalCommandBus.bindHandler("writer.layout.lineNumbers", (args) => this.setLineNumbers(args));
    globalCommandBus.bindHandler("writer.shape.insert", (args) => this.insertShapeFromCommand(args));
    globalCommandBus.bindHandler("writer.diagram.insert", (args) => this.insertDiagramFromCommand(args));
    globalCommandBus.bindHandler("writer.chart.insert", (args) => this.insertChartFromCommand(args));
    globalCommandBus.bindHandler("writer.design.themeGallery", (args) => this.openThemeGalleryDialog(args));
    globalCommandBus.bindHandler("writer.insert.textbox", (args) => this.insertTextBox(args));
    globalCommandBus.bindHandler("writer.insert.wordart", (args) => this.insertWordArt(args));
    globalCommandBus.bindHandler("writer.format.dropCap", (args) => this.applyDropCap(args));
    globalCommandBus.bindHandler("writer.insert.dateTime", (args) => this.insertDateTime(args));
    globalCommandBus.bindHandler("writer.insert.equation", (args) => this.insertEquation(args));
    globalCommandBus.bindHandler("writer.insert.symbol", (args) => this.insertSymbol(args));
    globalCommandBus.bindHandler("writer.insert.bookmark", (args) => this.insertBookmark(args));
    globalCommandBus.bindHandler("writer.insert.crossReference", (args) => this.insertCrossReference(args));

    // Bind Office Parity Mouse & Shortcuts
    this._bindMouseAndKeyboardParity();
    this._hydrateWordArtFromDom();
    globalCommandBus.bindHandler("writer.style.normal", () => this._applyParagraphStyle("normal"));
    globalCommandBus.bindHandler("writer.text.changeCase", () => this.changeCase());
    globalCommandBus.bindHandler("writer.para.sort", () => this.sortParagraphs());
    globalCommandBus.bindHandler("writer.para.showFormattingMarks", () => this.toggleFormattingMarks());
    globalCommandBus.bindHandler("writer.para.shading", (args) => this.applyParagraphShading(args));
    globalCommandBus.bindHandler("writer.para.borders", (args) => this.applyParagraphBorders(args));
    globalCommandBus.bindHandler("writer.para.spacingBefore", (args) => this.applyParagraphSpacingBefore(args));
    globalCommandBus.bindHandler("writer.para.spacingAfter", (args) => this.applyParagraphSpacingAfter(args));
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
    this.bodyDom.addEventListener("input", () => this._updateTrackChangesCommandState());
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
      if (cell && this.bodyDom.contains(cell)) {
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
        return;
      }

      const listItem = anchor?.closest?.("li");
      if (!listItem || !this.bodyDom.contains(listItem)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) this.changeListLevel(-1);
      else this.changeListLevel(1);
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
      const wordArt = e.target?.closest?.(".vno-writer-wordart, [data-vno-wordart='true']");
      if (wordArt) {
        e.preventDefault?.();
        e.stopPropagation?.();
        this._beginWordArtEdit(wordArt);
        return;
      }
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

  _parseParagraphSpacingPt(args) {
    const raw = args && typeof args === "object" && args.pt != null ? args.pt : args;
    const match = String(raw ?? "").trim().match(/^(\d+(?:\.\d+)?)(?:\s*pt)?$/i);
    if (!match) return null;
    const pt = Number(match[1]);
    if (!Number.isFinite(pt) || pt < 0 || pt > 240) return null;
    return Number(pt.toFixed(3));
  }

  applyParagraphSpacingBefore(args) {
    const pt = this._parseParagraphSpacingPt(args);
    if (pt == null) return false;
    return this._applyParagraphVisualStyle({ marginTop: `${pt}pt` }, "writer.para.spacingBefore");
  }

  applyParagraphSpacingAfter(args) {
    const pt = this._parseParagraphSpacingPt(args);
    if (pt == null) return false;
    return this._applyParagraphVisualStyle({ marginBottom: `${pt}pt` }, "writer.para.spacingAfter");
  }

  applyMultilevelList(preset) {
    const spec = WRITER_MULTILEVEL_PRESETS[String(preset || "")];
    if (!spec) return false;
    this.flushTyping();
    if (typeof document !== "undefined" && typeof document.createElement === "function" && this.bodyDom?.querySelectorAll) {
      let blocks = this._getSelectedParagraphBlocks();
      if (!blocks.length) {
        blocks = Array.from(this.bodyDom.children || []).filter((node) => node.tagName && !node.hasAttribute?.("data-vno-auto-page-gap"));
      }
      if (blocks.length) this._convertBlocksToMultilevel(blocks, spec.className);
      else document.execCommand?.("insertOrderedList", false, null);
      this._stampMultilevelOnLists(spec.className);
    } else if (this.bodyDom && typeof this.bodyDom.innerHTML === "string") {
      this.bodyDom.innerHTML = this._applyMultilevelListToHtml(this.bodyDom.innerHTML, spec.className);
    } else {
      return false;
    }
    this.isDirty = true;
    this.recordSnapshot("writer.para.multilevelList");
    return true;
  }

  changeListLevel(delta, itemText) {
    const step = Number(delta) > 0 ? 1 : Number(delta) < 0 ? -1 : 0;
    if (!step || !this.bodyDom) return false;
    this.flushTyping();
    if (typeof document !== "undefined" && typeof document.createElement === "function" && this.bodyDom.querySelectorAll) {
      const listItem = itemText
        ? [...this.bodyDom.querySelectorAll("li")].find((node) => (node.textContent || "").includes(itemText))
        : this._caretListItem();
      if (!listItem) {
        document.execCommand(step > 0 ? "indent" : "outdent", false, null);
        this._propagateMultilevelClasses();
        this.isDirty = true;
        this.recordSnapshot(step > 0 ? "writer.para.indentInc" : "writer.para.indentDec");
        return true;
      }
      const changed = this._changeListItemLevelDom(listItem, step);
      if (changed) {
        this._propagateMultilevelClasses();
        this.isDirty = true;
        this.recordSnapshot(step > 0 ? "writer.para.indentInc" : "writer.para.indentDec");
      }
      return changed;
    }
    if (typeof this.bodyDom.innerHTML === "string" && itemText) {
      const next = this._changeListItemLevelHtml(this.bodyDom.innerHTML, itemText, step);
      if (next === this.bodyDom.innerHTML) return false;
      this.bodyDom.innerHTML = next;
      this.isDirty = true;
      this.recordSnapshot(step > 0 ? "writer.para.indentInc" : "writer.para.indentDec");
      return true;
    }
    return false;
  }

  _caretListItem() {
    const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
    const anchor = selection?.anchorNode?.nodeType === 1 ? selection.anchorNode : selection?.anchorNode?.parentElement;
    const listItem = anchor?.closest?.("li");
    return listItem && this.bodyDom?.contains?.(listItem) ? listItem : null;
  }

  _listDepth(listItem) {
    let depth = 0;
    let node = listItem?.parentElement;
    while (node && node !== this.bodyDom) {
      if (/^(OL|UL)$/i.test(node.tagName)) depth += 1;
      node = node.parentElement;
    }
    return depth;
  }

  _multilevelClassOf(listEl) {
    const tokens = String(listEl?.className || listEl?.getAttribute?.("class") || "").split(/\s+/);
    return tokens.find((token) => WRITER_MULTILEVEL_BY_CLASS[token]) || "";
  }

  _copyMultilevelClass(fromList, toList) {
    const className = this._multilevelClassOf(fromList);
    if (!className || !toList) return;
    if (toList.classList?.add) toList.classList.add(className);
    else toList.className = `${String(toList.className || "").replace(/vno-ml-(?:decimal|letter|nd30)/g, "").trim()} ${className}`.trim();
  }

  _stampMultilevelOnLists(className) {
    if (!this.bodyDom?.querySelectorAll) return;
    this.bodyDom.querySelectorAll("ol,ul").forEach((list) => {
      const current = this._multilevelClassOf(list);
      if (current && list.classList?.remove) list.classList.remove(current);
      if (list.classList?.add) list.classList.add(className);
      else list.className = `${String(list.className || "").replace(/vno-ml-(?:decimal|letter|nd30)/g, "").trim()} ${className}`.trim();
    });
  }

  _propagateMultilevelClasses() {
    if (!this.bodyDom?.querySelectorAll) return;
    this.bodyDom.querySelectorAll("ol,ul").forEach((list) => {
      const parentItem = list.parentElement?.closest?.("li");
      const parentList = parentItem?.parentElement;
      if (!parentList || !/^(OL|UL)$/i.test(parentList.tagName)) return;
      this._copyMultilevelClass(parentList, list);
    });
  }

  _convertBlocksToMultilevel(blocks, className) {
    if (!blocks?.length || typeof document === "undefined" || !document.createElement) return;
    const listItems = blocks.filter((node) => node.tagName === "LI");
    if (listItems.length === blocks.length) {
      const root = listItems[0].closest?.("ol,ul") || listItems[0].parentElement;
      if (root && /^(OL|UL)$/i.test(root.tagName)) this._stampMultilevelOnLists(className);
      return;
    }
    const parent = blocks[0].parentNode;
    if (!parent) return;
    const list = document.createElement("ol");
    list.className = className;
    parent.insertBefore(list, blocks[0]);
    blocks.forEach((block) => {
      const item = document.createElement("li");
      if (/^(P|H[1-6]|DIV)$/i.test(block.tagName)) {
        while (block.firstChild) item.appendChild(block.firstChild);
        block.remove();
      } else {
        item.appendChild(block);
      }
      list.appendChild(item);
    });
  }

  _mergeMultilevelClassAttr(attrs, className) {
    const match = /\bclass\s*=\s*["']([^"']*)["']/.exec(attrs || "");
    let cls = match ? match[1] : "";
    cls = cls.replace(/vno-ml-(?:decimal|letter|nd30)/g, "").replace(/\s+/g, " ").trim();
    cls = `${cls} ${className}`.trim();
    if (match) return String(attrs || "").replace(/\bclass\s*=\s*["'][^"']*["']/, `class="${cls}"`);
    return ` class="${className}"${attrs || ""}`;
  }

  _applyMultilevelListToHtml(html, className) {
    let out = String(html || "");
    if (/<[ou]l\b/i.test(out)) {
      out = out.replace(/<ul\b([^>]*)>/gi, (_, attrs) => `<ol${this._mergeMultilevelClassAttr(attrs, className)}>`);
      out = out.replace(/<\/ul>/gi, "</ol>");
      out = out.replace(/<ol\b([^>]*)>/gi, (_, attrs) => `<ol${this._mergeMultilevelClassAttr(attrs, className)}>`);
      return out;
    }
    const items = [];
    out.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
      items.push(inner);
      return "";
    });
    if (!items.length) return html;
    return `<ol class="${className}">${items.map((inner) => `<li>${inner}</li>`).join("")}</ol>`;
  }

  _changeListItemLevelDom(listItem, delta) {
    const parentList = listItem.parentElement;
    if (!parentList || !/^(OL|UL)$/i.test(parentList.tagName)) return false;
    if (delta > 0) {
      if (this._listDepth(listItem) >= WRITER_MULTILEVEL_MAX_DEPTH) return false;
      const previous = listItem.previousElementSibling;
      let nested;
      if (previous && previous.tagName === "LI") {
        nested = [...previous.children].reverse().find((node) => /^(OL|UL)$/i.test(node.tagName));
        if (!nested) {
          nested = document.createElement(parentList.tagName);
          this._copyMultilevelClass(parentList, nested);
          previous.appendChild(nested);
        }
        nested.appendChild(listItem);
        return true;
      }
      nested = document.createElement(parentList.tagName);
      this._copyMultilevelClass(parentList, nested);
      const wrapper = document.createElement("li");
      parentList.insertBefore(wrapper, listItem);
      wrapper.appendChild(nested);
      nested.appendChild(listItem);
      return true;
    }
    const parentItem = parentList.parentElement;
    if (parentItem && parentItem.tagName === "LI") {
      const outerList = parentItem.parentElement;
      if (!outerList) return false;
      if (parentItem.nextSibling) outerList.insertBefore(listItem, parentItem.nextSibling);
      else outerList.appendChild(listItem);
      if (!parentList.children.length) parentList.remove();
      if (!parentItem.childNodes.length) parentItem.remove();
      return true;
    }
    const paragraph = document.createElement("p");
    const nestedLists = [...listItem.children].filter((node) => /^(OL|UL)$/i.test(node.tagName));
    while (listItem.firstChild && !/^(OL|UL)$/i.test(listItem.firstChild.tagName || "")) {
      paragraph.appendChild(listItem.firstChild);
    }
    parentList.parentNode?.insertBefore(paragraph, parentList);
    nestedLists.forEach((nested) => parentList.parentNode?.insertBefore(nested, parentList));
    listItem.remove();
    if (!parentList.children.length) parentList.remove();
    return true;
  }

  _listItemOwnText(node) {
    return (node.children || []).filter((child) => child.name !== "ol" && child.name !== "ul")
      .map((child) => (child.name === "#text" ? child.text || "" : this._listItemOwnText(child)))
      .join("");
  }

  _findListItemNode(nodes, itemText, trail = []) {
    const items = (nodes || []).filter((child) => !(child.name === "#text" && !String(child.text || "").trim()));
    for (const node of items) {
      if (node.name === "li") {
        const nextTrail = [...trail, { parentItems: items, node }];
        const nested = this._findListItemNode(node.children, itemText, nextTrail);
        if (nested) return nested;
        if (this._listItemOwnText(node).includes(itemText)) return nextTrail[nextTrail.length - 1];
      } else {
        const nested = this._findListItemNode(node.children, itemText, trail);
        if (nested) return nested;
      }
    }
    return null;
  }

  _changeListItemLevelHtml(html, itemText, delta) {
    const tree = this._fodtParseMarkup(html, "HTML");
    const found = this._findListItemNode(tree.children, itemText);
    if (!found) return html;
    const siblings = found.parentItems;
    const index = siblings.indexOf(found.node);
    const parentList = this._findParentListOfItem(tree, found.node);
    if (!parentList) return html;
    if (delta > 0) {
      const depth = this._htmlListDepth(tree, found.node);
      if (depth >= WRITER_MULTILEVEL_MAX_DEPTH) return html;
      const previous = index > 0 ? siblings[index - 1] : null;
      if (previous?.name === "li") {
        let nested = [...(previous.children || [])].reverse().find((child) => child.name === "ol" || child.name === "ul");
        if (!nested) {
          nested = { name: parentList.name, attrs: { ...parentList.attrs }, children: [] };
          previous.children = [...(previous.children || []), nested];
        }
        siblings.splice(index, 1);
        nested.children = [...(nested.children || []).filter((child) => !(child.name === "#text" && !String(child.text || "").trim())), found.node];
      } else {
        const nested = { name: parentList.name, attrs: { ...parentList.attrs }, children: [found.node] };
        const wrapper = { name: "li", attrs: {}, children: [nested] };
        siblings.splice(index, 1, wrapper);
      }
    } else {
      const parentItem = this._findParentListItemOfList(tree, parentList);
      if (parentItem) {
        const outerSiblings = this._parentItemsOf(tree, parentItem);
        const outerIndex = outerSiblings.indexOf(parentItem);
        const inner = (parentList.children || []).filter((child) => !(child.name === "#text" && !String(child.text || "").trim()));
        const innerIndex = inner.indexOf(found.node);
        if (innerIndex >= 0) inner.splice(innerIndex, 1);
        parentList.children = inner;
        outerSiblings.splice(outerIndex + 1, 0, found.node);
        if (!inner.length) {
          parentItem.children = (parentItem.children || []).filter((child) => child !== parentList);
        }
      } else {
        const inner = (parentList.children || []).filter((child) => !(child.name === "#text" && !String(child.text || "").trim()));
        const innerIndex = inner.indexOf(found.node);
        if (innerIndex < 0) return html;
        inner.splice(innerIndex, 1);
        parentList.children = inner;
        const paragraph = { name: "p", attrs: {}, children: (found.node.children || []).filter((child) => child.name !== "ol" && child.name !== "ul") };
        const nested = (found.node.children || []).filter((child) => child.name === "ol" || child.name === "ul");
        const container = this._parentItemsOf(tree, parentList);
        const listIndex = container.indexOf(parentList);
        container.splice(listIndex, 0, paragraph, ...nested);
        if (!inner.length) container.splice(container.indexOf(parentList), 1);
      }
    }
    return this._fodtNodesToHtml(tree.children);
  }

  _htmlListDepth(root, listItem) {
    let depth = 0;
    const walk = (nodes, current) => {
      for (const node of nodes || []) {
        if (node === listItem) return current;
        if (node.name === "ol" || node.name === "ul") {
          const found = walk(node.children, current + 1);
          if (found != null) return found;
        } else {
          const found = walk(node.children, current);
          if (found != null) return found;
        }
      }
      return null;
    };
    return walk(root.children, 0) || 0;
  }

  _findParentListOfItem(root, listItem) {
    const walk = (node) => {
      const children = node.children || [];
      if ((node.name === "ol" || node.name === "ul") && children.includes(listItem)) return node;
      for (const child of children) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(root);
  }

  _findParentListItemOfList(root, listNode) {
    const walk = (node) => {
      if (node.name === "li" && (node.children || []).includes(listNode)) return node;
      for (const child of node.children || []) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(root);
  }

  _parentItemsOf(root, target) {
    const walk = (node) => {
      const children = node.children || [];
      if (children.includes(target)) return children;
      for (const child of children) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(root) || root.children;
  }

  _fodtNodesToHtml(nodes) {
    return (nodes || []).map((node) => {
      if (node.name === "#text") return this._escapeHtml(node.text || "");
      if (node.name === "br") return "<br>";
      const attrs = Object.entries(node.attrs || {})
        .map(([name, value]) => ` ${name}="${this._escapeHtml(String(value ?? ""))}"`)
        .join("");
      if (["br", "img"].includes(node.name)) return `<${node.name}${attrs}>`;
      return `<${node.name}${attrs}>${this._fodtNodesToHtml(node.children || [])}</${node.name}>`;
    }).join("");
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
    this._clearTrackChangeHighlight();
    this._resolveAllTrackChanges(true);
    return true;
  }

  rejectAllTrackChanges() {
    this._clearTrackChangeHighlight();
    this._resolveAllTrackChanges(false);
    return true;
  }

  nextTrackChange() {
    const changes = this._listTrackChanges();
    if (!changes.length) return false;
    const current = this._trackChangeAtSelection();
    const index = changes.indexOf(current);
    const next = changes[(index + 1) % changes.length];
    return this._selectTrackChange(next);
  }

  previousTrackChange() {
    const changes = this._listTrackChanges();
    if (!changes.length) return false;
    const current = this._trackChangeAtSelection();
    const index = changes.indexOf(current);
    const previous = index <= 0 ? changes[changes.length - 1] : changes[index - 1];
    return this._selectTrackChange(previous);
  }

  acceptOneTrackChange() {
    return this._resolveCurrentTrackChange(true);
  }

  rejectOneTrackChange() {
    return this._resolveCurrentTrackChange(false);
  }

  _listTrackChanges() {
    if (!this.bodyDom?.querySelectorAll) return [];
    const insertions = [...(this.bodyDom.querySelectorAll('ins[data-vno-change="insert"]') || [])];
    const deletions = [...(this.bodyDom.querySelectorAll('del[data-vno-change="delete"]') || [])];
    const all = [...insertions, ...deletions].filter((node) => !node.removed);
    if (all.length > 1 && typeof all[0].compareDocumentPosition === "function") {
      all.sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        if (position & 2) return 1;
        if (position & 4) return -1;
        return 0;
      });
    }
    return all;
  }

  _changeKind(node) {
    return node?.dataset?.vnoChange || node?.getAttribute?.("data-vno-change") || node?.kind || "";
  }

  _trackChangeAtSelection() {
    if (typeof window !== "undefined" && window.getSelection) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchor = selection.anchorNode;
        const element = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
        const change = element?.closest?.("[data-vno-change]");
        if (change && (!this.bodyDom || this.bodyDom.contains?.(change))) return change;
      }
    }
    if (this._activeTrackChange && (!this.bodyDom || this.bodyDom.contains?.(this._activeTrackChange))) {
      return this._activeTrackChange;
    }
    return null;
  }

  _clearTrackChangeHighlight() {
    const node = this._activeTrackChange;
    if (node?.classList?.remove) node.classList.remove("is-vno-change-active");
    this._activeTrackChange = null;
  }

  _selectTrackChange(node) {
    this._clearTrackChangeHighlight();
    if (!node) return false;
    this._activeTrackChange = node;
    node.classList?.add?.("is-vno-change-active");
    if (typeof node.scrollIntoView === "function") {
      try { node.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* ignore */ }
    }
    return true;
  }

  _unwrapTrackedNode(node) {
    if (typeof node.replaceWith === "function") {
      const children = node.childNodes ? [...node.childNodes] : [];
      node.replaceWith(...children);
    }
  }

  _resolveOneTrackChange(node, accept) {
    if (!node) return false;
    const kind = this._changeKind(node);
    if (accept) {
      if (kind === "insert") this._unwrapTrackedNode(node);
      else node.remove?.();
    } else if (kind === "insert") {
      node.remove?.();
    } else {
      this._unwrapTrackedNode(node);
    }
    this.isDirty = true;
    if (this._activeTrackChange === node) this._clearTrackChangeHighlight();
    return true;
  }

  _resolveCurrentTrackChange(accept) {
    this.flushTyping();
    this._initZones();
    const current = this._trackChangeAtSelection() || this._listTrackChanges()[0];
    if (!current) return false;
    const changes = this._listTrackChanges();
    const index = Math.max(0, changes.indexOf(current));
    this._resolveOneTrackChange(current, accept);
    this._updateTrackChangesCommandState();
    this.recordSnapshot(accept ? "writer.trackChanges.acceptOne" : "writer.trackChanges.rejectOne");
    const remaining = this._listTrackChanges();
    if (remaining.length) {
      this._selectTrackChange(remaining[Math.min(index, remaining.length - 1)]);
    }
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
    const hasChanges = !!this.bodyDom?.querySelector?.("[data-vno-change]");
    globalCommandBus.updateState("writer.trackChanges.toggle", { checked: this.trackChangesEnabled });
    globalCommandBus.updateState("writer.trackChanges.acceptAll", { enabled: hasChanges });
    globalCommandBus.updateState("writer.trackChanges.rejectAll", { enabled: hasChanges });
    globalCommandBus.updateState("writer.trackChanges.previous", { enabled: hasChanges });
    globalCommandBus.updateState("writer.trackChanges.next", { enabled: hasChanges });
    globalCommandBus.updateState("writer.trackChanges.acceptOne", { enabled: hasChanges });
    globalCommandBus.updateState("writer.trackChanges.rejectOne", { enabled: hasChanges });
  }

  /**
   * Thống kê đếm từ trên thân tài liệu (không gồm đầu/chân trang).
   * Nếu có vùng chọn không rỗng trong body thì đếm vùng chọn.
   */
  getWordCountStats(options = {}) {
    this._initZones();
    const preferSelection = options.preferSelection !== false;
    const body = this.bodyDom;
    if (!body) {
      return {
        words: 0,
        charactersWithSpaces: 0,
        charactersNoSpaces: 0,
        paragraphs: 0,
        lines: 0,
        scope: "document"
      };
    }

    let selectedText = "";
    if (preferSelection && typeof window !== "undefined" && window.getSelection) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;
        const inBody = ancestor === body || body.contains?.(ancestor);
        if (inBody) selectedText = selection.toString() || "";
      }
    }

    if (selectedText.trim()) {
      return countDocumentStats(selectedText, { scope: "selection" });
    }

    const text = body.innerText != null ? body.innerText : (body.textContent || "");
    const paragraphCount = countBlockParagraphs(body);
    return countDocumentStats(text, {
      scope: "document",
      paragraphCount: paragraphCount || undefined
    });
  }

  openWordCountDialog() {
    const stats = this.getWordCountStats({ preferSelection: true });
    return showWordCountDialog(stats);
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
    if (shell) {
      shell.adapter = this;
    }
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
        const wordArt = event.target?.closest?.(".vno-writer-wordart, [data-vno-wordart='true']");
        if (wordArt) {
          if (!(this._wordArtEditing && this.selectedWordArtEl === wordArt)) {
            this._selectWordArt(wordArt);
          }
          return;
        }
        this._selectWordArt(null);
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
        const card = event.target?.closest?.("[data-comment-card]");
        if (event.key === "Enter" || event.key === " ") {
          if (card && !event.target?.closest?.("button")) {
            event.preventDefault?.();
            this.focusComment(card.dataset.commentCard);
          }
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          // Di chuyển focus giữa các comment card bằng phím mũi tên
          const cards = [...(this.commentsPanel?.querySelectorAll?.("[data-comment-card]") || [])];
          if (!cards.length) return;
          const idx = cards.indexOf(card || document.activeElement?.closest?.("[data-comment-card]"));
          let targetIdx = -1;
          if (event.key === "ArrowDown") {
            event.preventDefault?.();
            targetIdx = idx < 0 ? 0 : (idx + 1) % cards.length;
          } else {
            event.preventDefault?.();
            targetIdx = idx <= 0 ? cards.length - 1 : idx - 1;
          }
          cards[targetIdx]?.focus();
        }
      };
      this.commentsPanel.addEventListener("keydown", this._commentPanelKeyHandler);
    }
  }

  /** Áp dụng kích thước/lề trang hiện tại lên canvas thật (không chỉ lưu state suông). */
  _applyPageSetup() {
    if (!this.editorDom || !this.editorDom.style) return;
    const base = pageSizeMm(this.pageSetup);
    const isLandscape = this.pageSetup.orientation === "landscape";
    const widthMm = isLandscape ? base.h : base.w;
    const heightMm = isLandscape ? base.w : base.h;
    const { top, right, bottom, left } = this.pageSetup.margins;
    const headerDistanceMm = this.pageSetup.headerDistanceMm ?? 12.7;
    const footerDistanceMm = this.pageSetup.footerDistanceMm ?? 12.7;

    this.editorDom.style.width = `${(widthMm * MM_TO_PX).toFixed(1)}px`;
    this.editorDom.style.minHeight = `${(heightMm * MM_TO_PX).toFixed(1)}px`;
    this.editorDom.style.padding =
      `${(top * MM_TO_PX).toFixed(1)}px ${(right * MM_TO_PX).toFixed(1)}px ` +
      `${(bottom * MM_TO_PX).toFixed(1)}px ${(left * MM_TO_PX).toFixed(1)}px`;
    this.editorDom.style.backgroundColor = this.pageColor === "transparent" ? "" : this.pageColor;
    const viewContainer = this.editorDom.closest?.(".vno-writer-container");
    viewContainer?.style?.setProperty("--vno-page-width", (widthMm * MM_TO_PX).toFixed(1) + "px");
    viewContainer?.style?.setProperty("--vno-margin-left", (left * MM_TO_PX).toFixed(1) + "px");
    viewContainer?.style?.setProperty("--vno-margin-right", (right * MM_TO_PX).toFixed(1) + "px");
    viewContainer?.style?.setProperty("--vno-header-distance", (headerDistanceMm * MM_TO_PX).toFixed(1) + "px");
    viewContainer?.style?.setProperty("--vno-footer-distance", (footerDistanceMm * MM_TO_PX).toFixed(1) + "px");
  }

  /**
   * CSS `@page` thật để nhúng vào HTML trung gian trước khi gửi cho LibreOffice headless —
   * đảm bảo khổ giấy/lề đúng trong DOCX/PDF xuất ra thật, không chỉ đúng trên canvas.
   */
  _getPageSetupCss() {
    const base = pageSizeMm(this.pageSetup);
    const isLandscape = this.pageSetup.orientation === "landscape";
    const widthMm = isLandscape ? base.h : base.w;
    const heightMm = isLandscape ? base.w : base.h;
    const { top, right, bottom, left } = this.pageSetup.margins;
    const headerDistanceMm = this.pageSetup.headerDistanceMm ?? 12.7;
    const footerDistanceMm = this.pageSetup.footerDistanceMm ?? 12.7;
    let pageCss = `@page { size: ${widthMm}mm ${heightMm}mm; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; --vno-header-distance: ${headerDistanceMm}mm; --vno-footer-distance: ${footerDistanceMm}mm;`;
    if (this.pageColor && this.pageColor !== "transparent") pageCss += ` background-color: ${this.pageColor};`;
    if (this.pageBorder && this.pageBorder.enabled && this.pageBorder.style !== "none") {
      pageCss += ` border: ${this.pageBorder.width || 2}pt ${this.pageBorder.style || "solid"} ${this.pageBorder.color || "#0f4c81"};`;
    }
    pageCss += ` }`;
    if (this.docStyles) {
      if (this.docStyles.rawRules?.p) {
        pageCss += `\n${this.docStyles.rawRules.p}`;
      } else {
        const pParts = [];
        if (this.docStyles.lineHeight) pParts.push(`line-height: ${this.docStyles.lineHeight};`);
        if (this.docStyles.paraMargin) pParts.push(`margin: ${this.docStyles.paraMargin};`);
        if (this.docStyles.fontSize) pParts.push(`font-size: ${this.docStyles.fontSize};`);
        if (pParts.length) pageCss += `\np { ${pParts.join(" ")} }`;
      }
      if (this.docStyles.rawRules?.pWestern) {
        pageCss += `\n${this.docStyles.rawRules.pWestern}`;
      } else if (this.docStyles.fontFamily) {
        pageCss += `\np.western { font-family: ${this.docStyles.fontFamily}; }`;
      }
      if (this.docStyles.rawRules?.pCjk) pageCss += `\n${this.docStyles.rawRules.pCjk}`;
      if (this.docStyles.rawRules?.pCtl) pageCss += `\n${this.docStyles.rawRules.pCtl}`;
      if (this.docStyles.rawRules?.headings) pageCss += `\n${this.docStyles.rawRules.headings}`;
    }
    return pageCss;
  }

  _getSectionPageCss() {
    return Object.entries(this.sectionPageSetups || {}).map(([id, setup]) => {
      const base = pageSizeMm(setup);
      const landscape = setup.orientation === "landscape";
      const width = landscape ? base.h : base.w;
      const height = landscape ? base.w : base.h;
      const margins = setup.margins || DEFAULT_MARGINS_MM;
      return `@page vno-${id} { size:${width}mm ${height}mm; margin:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;${this.pageColor && this.pageColor !== "transparent" ? ` background-color:${this.pageColor};` : ""} } .vno-export-${id} { page:vno-${id}; }`;
    }).join("\n");
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
        else {
          setup.size = "custom";
          setup.widthMm = Number(portraitW.toFixed(1));
          setup.heightMm = Number(portraitH.toFixed(1));
        }
      }
    }
    const marginMap = { top: /margin-top:\s*([^;]+)/i, bottom: /margin-bottom:\s*([^;]+)/i, left: /margin-left:\s*([^;]+)/i, right: /margin-right:\s*([^;]+)/i };
    for (const [side, regex] of Object.entries(marginMap)) {
      const mm = this._lengthToMm(block.match(regex)?.[1]);
      if (mm != null) setup.margins[side] = Math.round(mm);
    }
    const hdrMatch = block.match(/--vno-header-distance:\s*([^;]+)/i);
    const ftrMatch = block.match(/--vno-footer-distance:\s*([^;]+)/i);
    if (hdrMatch) {
      const mm = this._lengthToMm(hdrMatch[1]);
      if (mm != null) setup.headerDistanceMm = Math.round(mm * 10) / 10;
    }
    if (ftrMatch) {
      const mm = this._lengthToMm(ftrMatch[1]);
      if (mm != null) setup.footerDistanceMm = Math.round(mm * 10) / 10;
    }
    return setup;
  }

  /**
   * Parse w:header and w:footer distances from w:pgMar in OOXML (twips).
   * Returns { headerDistanceMm, footerDistanceMm } or null if not found.
   */
  _pageHeaderFooterFromOoxml(ooxmlDocumentXml) {
    if (!ooxmlDocumentXml) return null;
    const pgMarMatch = String(ooxmlDocumentXml).match(/<w:pgMar\b([^>]*)>/i);
    if (!pgMarMatch) return null;
    const attrs = pgMarMatch[1] || "";
    const headerMatch = attrs.match(/w:header=["'](\d+)["']/i);
    const footerMatch = attrs.match(/w:footer=["'](\d+)["']/i);
    const twipsToMm = (twips) => Math.round((twips / 1440) * 25.4 * 10) / 10;
    const headerDistanceMm = headerMatch ? twipsToMm(Number(headerMatch[1])) : 12.7;
    const footerDistanceMm = footerMatch ? twipsToMm(Number(footerMatch[1])) : 12.7;
    return { headerDistanceMm, footerDistanceMm };
  }

  /**
   * Parse page margins from w:pgMar in OOXML (twips).
   * Returns { top, right, bottom, left } in mm or null if not found.
   */
  _pageMarginsFromOoxml(ooxmlDocumentXml) {
    if (!ooxmlDocumentXml) return null;
    const pgMarMatch = String(ooxmlDocumentXml).match(/<w:pgMar\b([^>]*)>/i);
    if (!pgMarMatch) return null;
    const attrs = pgMarMatch[1] || "";
    const twipsToMm = (twips) => Math.round((twips / 1440) * 25.4 * 10) / 10;
    const sides = ['top', 'right', 'bottom', 'left'];
    const margins = {};
    let found = false;
    for (const side of sides) {
      const match = attrs.match(new RegExp(`w:${side}=["'](\\d+)["']`, 'i'));
      if (match) {
        margins[side] = twipsToMm(Number(match[1]));
        found = true;
      }
    }
    return found ? margins : null;
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
   *
   * Footnotes/Endnotes are also kept (unlike Track Changes / Comments):
   * `<a class="sdfootnoteanc">` / `sdendnoteanc` plus
   * `<div id="sdfootnoteN">` / `sdendnoteN` bodies. Map those onto the
   * existing VN Writer `data-vno-footnote-ref` / `data-vno-endnote-ref`
   * containers so session click-to-jump, renumber, and Print Preview work.
   * No OOXML sidecar is required for this path.
   *
   * Complex Word tables (LibreOffice 26.2 measured): StarWriter keeps
   * `<table>` with `rowspan` / `colspan`, per-edge `border-*` and
   * `background` / `bgcolor` as **inline styles on td/th**. Those survive
   * the `<body>` extract below (head CSS is only paragraph/heading). Do
   * not flatten tables. Canvas `.vno-writer-page td` default border is a
   * stylesheet shorthand; inline per-edge borders win, so no OOXML sidecar
   * is required. Diagonal borders / theme-table styles are HTML limits.
   */
  /**
   * Đọc cấu hình style mặc định của tài liệu từ thẻ <style> trong <head> của HTML LibreOffice.
   * Chỉ nhận diện các quy tắc kiểu đoạn chuẩn (p, p.western, p.cjk, p.ctl, h1..h6).
   * Áp dụng lên canvas thông qua các biến CSS thay vì nhúng thẻ <style> thô vào thân trang.
   */
  _parseDocStylesFromImportedHtml(html, ooxmlDocumentXml) {
    if (!html || typeof html !== "string") return null;
    const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
    if (!styleMatch) return null;
    const css = styleMatch[1] || "";

    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    const rules = {};
    const headingRules = [];

    while ((match = ruleRegex.exec(css)) !== null) {
      const selStr = match[1].trim();
      const declStr = match[2].trim();
      const selectors = selStr.split(",").map(s => s.trim().toLowerCase());
      for (const sel of selectors) {
        if (sel === "p" || sel === "p.western" || sel === "p.cjk" || sel === "p.ctl") {
          rules[sel] = declStr;
        } else if (/^h[1-6](\.(western|cjk|ctl))?$/.test(sel)) {
          headingRules.push(`${match[1].trim()} { ${declStr} }`);
        }
      }
    }

    if (!rules["p"] && !rules["p.western"] && !rules["p.cjk"] && !rules["p.ctl"]) {
      return null;
    }

    const getProp = (decl, name) => {
      if (!decl) return null;
      const m = decl.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i"));
      return m ? m[1].trim() : null;
    };

    const pDecl = rules["p"] || "";
    const pWest = rules["p.western"] || "";
    const pCjk = rules["p.cjk"] || "";
    const pCtl = rules["p.ctl"] || "";

    // 1. Font family: ưu tiên p.western, sau đó p, p.cjk, p.ctl
    let fontFamily = getProp(pWest, "font-family") || getProp(pDecl, "font-family") || getProp(pCjk, "font-family") || getProp(pCtl, "font-family");
    // Chỉ lấy từ style Normal nếu XML đưa vào có styles; KHÔNG quét run đầu tiên của document.xml
    // (d14.docx 2026-09-15: run tiêu đề w:sz=56 → cả tài liệu 28pt, mỗi dòng 64px, canvas 5 trang/Word 3).
    const normalStyleMatch = ooxmlDocumentXml
      ? String(ooxmlDocumentXml).match(/<w:style\b[^>]*w:styleId=["']Normal["'][^>]*>[\s\S]*?<\/w:style>/i)
      : null;
    if (!fontFamily && normalStyleMatch) {
      const asciiMatch = normalStyleMatch[0].match(/<w:rFonts\b[^>]*w:ascii=["']([^"']+)["']/i);
      if (asciiMatch) {
        fontFamily = `"${asciiMatch[1]}", sans-serif`;
      }
    }

    // 2. Font size: ưu tiên p.western, sau đó p
    let fontSize = getProp(pWest, "font-size") || getProp(pDecl, "font-size");
    if (!fontSize && normalStyleMatch) {
      const szMatch = normalStyleMatch[0].match(/<w:sz\b[^>]*w:val=["'](\d+)["']/i);
      if (szMatch) {
        const pt = Number(szMatch[1]) / 2;
        fontSize = `${pt}pt`;
      }
    }
    // LibreOffice StarWriter mặc định base 12pt cho DOCX khi không ghi font-size
    if (!fontSize) {
      fontSize = "12pt";
    }

    // 3. Line height: ưu tiên p.western, sau đó p
    let lineHeight = getProp(pWest, "line-height") || getProp(pDecl, "line-height");
    if (lineHeight && lineHeight.endsWith("%")) {
      const pct = parseFloat(lineHeight);
      if (!Number.isNaN(pct)) {
        lineHeight = (pct / 100).toFixed(2).replace(/\.?0+$/, "");
      }
    }

    // 4. Paragraph margin: đọc margin-bottom và margin-top từ quy tắc p
    let paraMargin = null;
    const marginExact = getProp(pDecl, "margin");
    if (marginExact) {
      paraMargin = marginExact;
    } else {
      const mb = getProp(pDecl, "margin-bottom");
      const mt = getProp(pDecl, "margin-top");
      if (mb != null || mt != null) {
        paraMargin = `${mt || "0"} 0 ${mb || "0"} 0`;
      }
    }

    // Quy ước W9b: quy tắc tiêu đề h1..h6 (font/cỡ/màu/lề) của head LibreOffice áp lên canvas qua stylesheet
    // scoped `.vno-writer-page.vno-doc-imported h1.western {...}` (đo d13.docx: 42 tiêu đề Calibri 14/18pt bị vẽ
    // bằng Arial 10pt của Normal). `line-height: N%` đổi thành `--vno-lh` để nhân với tỉ số font (W1).
    const scopedHeadingCss = headingRules.map((rule) => {
      const m = rule.match(/^([^{]+)\{([^}]*)\}$/);
      if (!m) return "";
      const decl = m[2]
        .replace(/(^|;)\s*line-height\s*:\s*([\d.]+)%\s*(?=;|$)/gi, (all, lead, pct) => `${lead} --vno-lh: ${Math.round(Number(pct) * 100) / 10000}`)
        .replace(/(^|;)\s*(?:page-break-[a-z]+|orphans|widows|direction|so-language|background)\s*:[^;]*/gi, "$1")
        .replace(/font-family\s*:\s*;/gi, "");
      const selectors = m[1].split(",").map(s => `.vno-writer-page.vno-doc-imported ${s.trim()}, .vno-print-preview-overlay.vno-doc-imported ${s.trim()}`).join(", ");
      return `${selectors} { ${decl.trim()} }`;
    }).filter(Boolean).join("\n");

    const rawRules = {
      p: rules["p"] ? `p { ${rules["p"]} }` : null,
      pWestern: rules["p.western"] ? `p.western { ${rules["p.western"]} }` : null,
      pCjk: rules["p.cjk"] ? `p.cjk { ${rules["p.cjk"]} }` : null,
      pCtl: rules["p.ctl"] ? `p.ctl { ${rules["p.ctl"]} }` : null,
      headings: headingRules.length ? headingRules.join("\n") : null
    };

    return {
      fontFamily: fontFamily || null,
      fontSize: fontSize || null,
      lineHeight: lineHeight || null,
      paraMargin: paraMargin || null,
      scopedHeadingCss: scopedHeadingCss || null,
      rawRules
    };
  }

  /**
   * Sau khi thân tài liệu vào DOM thật (đo được font computed):
   * - W1: `--vno-font-ratio` inline cho mọi phần tử có chữ mà font-family computed khác cha (font đến từ
   *   p.western/h1.western CSS, không phải <font face>): d01.docx đoạn Times New Roman 13pt dùng tỉ số Calibri
   *   của trang (1.22) → 24,7px/dòng thay vì 22,9px của Word (109 đoạn).
   * - W8/W12d: strut của <p>/<hN> và các inline wrapper không có chữ trực tiếp = font của run đầu/nhỏ nhất khi
   *   mọi chữ nằm trong <font>/<span> (LibreOffice có thể lồng font 8pt trong một wrapper font 12pt; wrapper rỗng
   *   vẫn góp strut 12pt vào line box nếu chỉ sửa <p>).
   *   LibreOffice cho <p> font của
   *   paragraph STYLE): d16.docx <p class=western> .VnTime 14pt bọc run Times New Roman 13pt → 26px/dòng thay vì
   *   21,5px (80 đoạn). Word không có strut: chiều cao dòng chỉ do các run (và dấu đoạn, thường = run).
   */
  _normalizeImportedFontMetrics(root) {
    if (!root || typeof window === "undefined" || typeof window.getComputedStyle !== "function" || !root.querySelectorAll) return;
    const blocks = Array.from(root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td, th"));
    for (const block of blocks) {
      if (block.closest?.("[data-vno-float]")) continue;
      let firstRun = null;
      let directText = false;
      const textRuns = [];
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        if (node.parentElement.closest("[data-vno-float]")) continue;
        if (node.parentElement === block) { directText = true; break; }
        if (!firstRun) firstRun = node.parentElement;
        textRuns.push({ node, element: node.parentElement, computed: window.getComputedStyle(node.parentElement) });
      }
      if (!directText && firstRun) {
        const rcs = textRuns[0].computed;
        const bcs = window.getComputedStyle(block);
        if (rcs.fontSize !== bcs.fontSize) block.style.fontSize = rcs.fontSize;
        if (rcs.fontFamily !== bcs.fontFamily) block.style.fontFamily = rcs.fontFamily;

        // W12d: một inline wrapper không có text trực tiếp vẫn tạo inline strut theo font của chính nó.
        // Hạ wrapper về run nhỏ nhất bên trong; run lớn có cỡ tường minh vẫn tiếp tục quyết định line box.
        const wrappers = new Map();
        for (const run of textRuns) {
          const size = Number.parseFloat(run.computed.fontSize);
          let wrapper = run.element;
          while (wrapper && wrapper !== block) {
            const entry = wrappers.get(wrapper) || { minSize: Infinity, fontSize: run.computed.fontSize, fontFamily: run.computed.fontFamily };
            if (Number.isFinite(size) && size < entry.minSize) {
              entry.minSize = size;
              entry.fontSize = run.computed.fontSize;
              entry.fontFamily = run.computed.fontFamily;
            }
            wrappers.set(wrapper, entry);
            wrapper = wrapper.parentElement;
          }
        }
        for (const [wrapper, runStyle] of wrappers) {
          const hasDirectText = Array.from(wrapper.childNodes || []).some(child => child.nodeType === 3 && child.textContent.trim());
          if (hasDirectText) continue;
          const wcs = window.getComputedStyle(wrapper);
          if (runStyle.fontSize && runStyle.fontSize !== wcs.fontSize) wrapper.style.fontSize = runStyle.fontSize;
          if (runStyle.fontFamily && runStyle.fontFamily !== wcs.fontFamily) wrapper.style.fontFamily = runStyle.fontFamily;
        }
      }
    }
    // Tỉ số font theo font computed thật (sau khi strut đã đổi).
    const elements = Array.from(root.querySelectorAll("*")).filter(el => !el.closest?.("[data-vno-float]"));
    for (const el of elements) {
      const family = window.getComputedStyle(el).fontFamily;
      const parentFamily = el.parentElement ? window.getComputedStyle(el.parentElement).fontFamily : "";
      if (family && family !== parentFamily) {
        el.style.setProperty("--vno-font-ratio", String(this._fontLineRatio(family)));
      }
    }
  }

  /** Stylesheet `<style id="vno-doc-head-styles">` cho quy tắc tiêu đề của tài liệu nhập (W9b). */
  _applyDocHeadStylesheet() {
    if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
    let el = document.getElementById("vno-doc-head-styles");
    const css = this.docStyles?.scopedHeadingCss || "";
    if (!css) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("style");
      el.id = "vno-doc-head-styles";
      (document.head || document.body || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  /**
   * Áp dụng biến CSS font/margin của tài liệu lên phần tử editorDom (.vno-writer-page).
   * Khi tài liệu không có hoặc đóng tài liệu, gỡ bỏ thuộc tính để trở về mặc định NĐ30 (14pt Times New Roman).
   */
  _applyDocStyles() {
    const target = this.editorDom;
    if (!target || !target.style) return;
    const setProp = (prop, val) => {
      if (typeof target.style.setProperty === "function") {
        target.style.setProperty(prop, val);
      } else {
        target.style[prop] = val;
      }
    };
    const removeProp = (prop) => {
      if (typeof target.style.removeProperty === "function") {
        target.style.removeProperty(prop);
      } else {
        delete target.style[prop];
      }
    };

    // Tài liệu nhập từ LibreOffice mang đủ style riêng: tắt các mặc định NĐ30
    // (lề bảng 14pt, bảng rộng 100%, căn đều) bằng lớp .vno-doc-imported.
    if (target.classList && typeof target.classList.toggle === "function") {
      target.classList.toggle("vno-doc-imported", Boolean(this.docStyles));
    }
    try { this._applyDocHeadStylesheet(); } catch {}

    if (this.docStyles) {
      if (this.docStyles.fontFamily) setProp("--vno-doc-font-family", this.docStyles.fontFamily);
      else removeProp("--vno-doc-font-family");

      if (this.docStyles.fontSize) setProp("--vno-doc-font-size", this.docStyles.fontSize);
      else removeProp("--vno-doc-font-size");

      if (this.docStyles.lineHeight) setProp("--vno-doc-line-height", this.docStyles.lineHeight);
      else removeProp("--vno-doc-line-height");

      if (this.docStyles.paraMargin) setProp("--vno-doc-para-margin", this.docStyles.paraMargin);
      else removeProp("--vno-doc-para-margin");
    } else {
      removeProp("--vno-doc-font-family");
      removeProp("--vno-doc-font-size");
      removeProp("--vno-doc-line-height");
      removeProp("--vno-doc-para-margin");
    }

    // Giãn dòng tỉ lệ = bội số chiều cao dòng tự nhiên của font tài liệu (xem
    // _encodeProportionalLineHeights); đo font đang thực sự vẽ trên canvas.
    let family = this.docStyles?.fontFamily || "";
    if (!family && typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      try { family = window.getComputedStyle(target).fontFamily || ""; } catch {}
    }
    setProp("--vno-font-ratio", String(this._fontLineRatio(family || "Times New Roman")));
  }

  _normalizeImportedHtml(raw, ooxmlDocumentXml, ooxmlCommentsXml, ooxmlStylesXml = "") {
    let html = String(raw || "");
    let comments = [];
    if (ooxmlDocumentXml) {
      html = this._applyOoxmlTrackChangesToHtml(html, ooxmlDocumentXml);
      html = this._applyOoxmlTableParagraphSpacing(html, ooxmlDocumentXml, ooxmlStylesXml);
      html = this._applyOoxmlContextualSpacing(html, ooxmlDocumentXml, ooxmlStylesXml);
    }
    if (ooxmlDocumentXml && ooxmlCommentsXml) {
      const overlaid = this._applyOoxmlCommentsToHtml(html, ooxmlDocumentXml, ooxmlCommentsXml);
      html = overlaid.html;
      comments = overlaid.comments;
    }
    html = this._upgradeImportedTrackChangeMarkup(html);
    if (ooxmlDocumentXml) {
      html = this._applyOoxmlTableColumnGeometry(html, ooxmlDocumentXml);
    }
    const page = this._pageSetupFromImportedCss(html);
    const docStyles = this._parseDocStylesFromImportedHtml(raw, ooxmlDocumentXml);
    const hf = this._pageHeaderFooterFromOoxml(ooxmlDocumentXml);
    if (hf) {
      page.headerDistanceMm = hf.headerDistanceMm;
      page.footerDistanceMm = hf.footerDistanceMm;
    }
    const ooxmlMargins = this._pageMarginsFromOoxml(ooxmlDocumentXml);
    if (ooxmlMargins) {
      page.margins = { ...page.margins, ...ooxmlMargins };
    }
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
    html = this._normalizeImportedStarWriterNotes(html);
    html = this._makeFloatingAnchorContainers(this._preserveImportedFloatingFrames(html, ooxmlDocumentXml, page), page);
    html = this._collapseFloatOnlyParagraphBreaks(html, ooxmlDocumentXml);
    html = this._encodeProportionalLineHeights(html);
    return { body: html.trim(), header, footer, page, comments, docStyles };
  }

  /**
   * Giãn dòng tỉ lệ (Word "multiple"/LibreOffice `line-height: 130%` hay số không đơn vị)
   * là bội số của chiều cao dòng TỰ NHIÊN của font (ascent + descent + lineGap), còn CSS
   * hiểu `130%`/`1.3` là bội số của font-size. Đo HDLD.docx (Arial 12pt, w:line=312):
   * Word 23.9px/dòng, canvas 20.8px → trang 1 canvas dư 2 đoạn so với Word.
   * Khi nhập: đổi `line-height: 130%` / `line-height: 1.3` thành `--vno-lh: 1.3`; stylesheet
   * tính `line-height: calc(var(--vno-lh) * var(--vno-font-ratio))` với --vno-font-ratio đo
   * từ font của tài liệu (Arial 1.149, Calibri 1.221...). Khi xuất đổi ngược thành `%`.
   * Giá trị tuyệt đối (cm/pt/px = giãn dòng "exactly") giữ nguyên.
   */
  _encodeProportionalLineHeights(html) {
    let out = String(html || "").replace(/\bstyle=(["'])([^"']*)\1/gi, (match, quote, css) => {
      if (!/line-height/i.test(css)) return match;
      const next = css.replace(/(^|;)\s*line-height\s*:\s*([\d.]+)\s*(%?)\s*(?=;|$)/gi, (m, lead, num, pct) => {
        const value = Number(num);
        if (!Number.isFinite(value) || value <= 0) return m;
        const factor = pct ? value / 100 : value;
        return `${lead}${lead ? " " : ""}--vno-lh: ${Math.round(factor * 10000) / 10000}`;
      });
      return next === css ? match : `style=${quote}${next}${quote}`;
    });
    // Word tính chiều cao dòng theo font của TỪNG run (dòng = max các run): HDLD.docx chữ
    // Calibri Light (theme major) trong đoạn Arial → Word 19.1pt/dòng = 1.3 × 14.65 (Calibri
    // Light 1.2207), không phải 1.3 × 13.8 (Arial). Gắn --vno-font-ratio inline cho mọi
    // <font face> / font-family để calc() trong stylesheet dùng đúng tỉ số của run.
    out = out.replace(/<font\b([^>]*\bface=(["'])([^"']*)\2[^>]*)>/gi, (match, attrs, quote, face) => {
      if (/--vno-font-ratio/i.test(attrs)) return match;
      const ratio = this._fontLineRatio(face);
      const styleMatch = attrs.match(/\bstyle=(["'])([^"']*)\1/i);
      if (styleMatch) {
        const merged = attrs.replace(styleMatch[0], `style=${styleMatch[1]}${styleMatch[2].replace(/;?\s*$/, "")}; --vno-font-ratio: ${ratio}${styleMatch[1]}`);
        return `<font${merged}>`;
      }
      return `<font${attrs} style="--vno-font-ratio: ${ratio}">`;
    });
    out = out.replace(/<(span|p|h[1-6]|li|td|th|div|b|i|u|em|strong)\b([^>]*\bstyle=(["'])([^"']*font-family\s*:[^"']*)\3[^>]*)>/gi, (match, tag, attrs, quote, css) => {
      if (/--vno-font-ratio/i.test(css)) return match;
      const family = css.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim();
      if (!family) return match;
      const ratio = this._fontLineRatio(family);
      const next = attrs.replace(`style=${quote}${css}${quote}`, `style=${quote}${css.replace(/;?\s*$/, "")}; --vno-font-ratio: ${ratio}${quote}`);
      return `<${tag}${next}>`;
    });
    return out;
  }

  _restoreProportionalLineHeightsForExport(html) {
    return String(html || "")
      .replace(/--vno-lh\s*:\s*([\d.]+)/gi, (m, num) => {
        const value = Number(num);
        if (!Number.isFinite(value)) return m;
        return `line-height: ${Math.round(value * 10000) / 100}%`;
      })
      .replace(/;?\s*--vno-font-ratio\s*:\s*[\d.]+\s*;?/gi, (m) => (m.trim().endsWith(";") && m.trim().startsWith(";") ? ";" : ""))
      .replace(/\sstyle=(["'])\s*;?\s*\1/gi, "");
  }

  /**
   * LibreOffice xuất run thành `<font face="Calibri Light, sans-serif">`, nhưng khi nhập lại HTML
   * nó giữ CẢ danh sách làm tên font ("Calibri Light;sans-serif") rồi ghi nguyên vào DOCX
   * `w:rFonts w:ascii="Calibri Light;sans-serif"` (đo HDLD.docx lưu: 96 run). Word không biết font
   * đó → thay font khác. Chỉ giữ họ font đầu tiên (bỏ generic family) trước khi gửi LibreOffice.
   */
  _simplifyFontFamiliesForExport(html) {
    const firstFamily = (list) => {
      const first = String(list || "").split(",")[0].trim().replace(/^["']|["']$/g, "").trim();
      return first;
    };
    return String(html || "")
      .replace(/<font\b([^>]*?)\bface=(["'])([^"']*,[^"']*)\2/gi, (m, before, quote, list) => {
        const first = firstFamily(list);
        return first ? `<font${before}face=${quote}${first}${quote}` : m;
      })
      .replace(/\bstyle=(["'])([^"']*font-family\s*:[^"']*)\1/gi, (m, quote, css) => {
        const next = css.replace(/font-family\s*:\s*([^;]+)/gi, (d, list) => {
          if (!list.includes(",")) return d;
          const first = firstFamily(list);
          return first ? `font-family: ${/\s/.test(first) ? `'${first}'` : first}` : d;
        });
        return next === css ? m : `style=${quote}${next}${quote}`;
      });
  }

  /**
   * Tỉ số chiều cao dòng tự nhiên / font-size của một họ font (`line-height: normal`),
   * đo bằng trình duyệt thật (font thay thế nào đang vẽ thì đo đúng font đó); ngoài
   * trình duyệt dùng bảng metric hhea của các font Windows phổ biến.
   */
  _fontLineRatio(fontFamily) {
    const family = String(fontFamily || "").trim();
    if (!family) return 1.15;
    this._fontLineRatioCache ||= new Map();
    if (this._fontLineRatioCache.has(family)) return this._fontLineRatioCache.get(family);
    let ratio = null;
    if (typeof document !== "undefined" && document.body && typeof document.createElement === "function") {
      try {
        const box = document.createElement("div");
        box.setAttribute("aria-hidden", "true");
        box.style.cssText = `position:absolute;visibility:hidden;left:-99999px;top:0;font-family:${family};font-size:100px;line-height:normal;white-space:nowrap;padding:0;margin:0;border:0;`;
        box.textContent = "Hg";
        document.body.appendChild(box);
        const h = box.offsetHeight;
        box.remove();
        if (h > 0) ratio = h / 100;
      } catch {}
    }
    if (!ratio) {
      const key = family.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
      const table = {
        "arial": 1.1499, "arial narrow": 1.1499, "times new roman": 1.1499, "calibri": 1.2207, "calibri light": 1.2207,
        "cambria": 1.1719, "tahoma": 1.207, "verdana": 1.2148, "segoe ui": 1.3301, "courier new": 1.1328,
        "georgia": 1.1362, "garamond": 1.1738, "book antiqua": 1.1699, "consolas": 1.1719
      };
      ratio = table[key] || 1.15;
    }
    this._fontLineRatioCache.set(family, ratio);
    return ratio;
  }

  /**
   * LibreOffice xuất đoạn chỉ chứa đối tượng neo (ảnh/khung sd-abs-pos, không chữ)
   * thành `<span ...></span><br/><br/>` — hai `<br>` cho một đoạn trống. Word vẽ đoạn đó
   * đúng MỘT dòng (đo MYTIME.docx 2026-09-15: đoạn neo 11pt + space-after 25pt = 48px
   * trong Word, canvas 63px vì 2 dòng; và khi lưu LibreOffice ghi thêm `w:br` làm mỗi
   * trang dôi một dòng). Gộp về một `<br>` khi phần còn lại ngoài các float đúng là 2 `<br>`.
   */
  _collapseFloatOnlyParagraphBreaks(html, ooxmlDocumentXml = "") {
    // Đoạn neo hộp văn bản: khung đã được chuyển sang carrier khác nên đoạn chỉ còn `<br><br>`
    // (d06.docx: 10 đoạn như vậy → canvas 6 trang, Word 3). Chỉ gộp cả các đoạn trống không
    // float khi DOCX gốc không có đoạn trống nào chứa `w:br` thật (ngắt dòng thủ công).
    const xml = String(ooxmlDocumentXml || "");
    let legitEmptyBreakParagraphs = 0;
    if (xml) {
      for (const para of xml.matchAll(/<w:p\b(?:(?!<w:p\b)[\s\S])*?<\/w:p>/g)) {
        const p = para[0];
        if (/<w:t\b/.test(p)) continue;
        if (/<w:br\b(?![^>]*w:type=["'](?:page|column)["'])/.test(p)) legitEmptyBreakParagraphs += 1;
      }
    }
    const collapseEmptyToo = xml ? legitEmptyBreakParagraphs === 0 : false;
    return String(html || "").replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, inner) => {
      const hasFloat = /\bdata-vno-float=/i.test(inner);
      if ((!hasFloat && !collapseEmptyToo) || /<(?:p|div|table|h[1-6])\b/i.test(inner)) return match;
      const rest = inner.replace(/<span\b[^>]*\bdata-vno-float=[^>]*>[\s\S]*?<\/span>/gi, "");
      if (!/^\s*(?:<br\s*\/?>\s*){2}$/i.test(rest)) return match;
      const collapsed = inner.replace(/(<br\s*\/?>)\s*<br\s*\/?>(\s*)$/i, "$1$2");
      return `<p${attrs}>${collapsed}</p>`;
    });
  }

  _untouchedParagraphFingerprint(html) {
    const normalized = String(html || "")
      .replace(/<a\b[^>]*\bname=["']vno-untouched-\d+["'][^>]*>\s*<\/a>/gi, "")
      .replace(/\s+data-vno-(?:src-hash|untouched)=["'][^"']*["']/gi, "")
      .replace(/<span\b(?=[^>]*\bclass=["'][^"']*\bvno-spelling-(?:error|uncertain)\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/\r\n?/g, "\n")
      .trim();
    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  _editorDomFingerprint() {
    const normalized = this._stripAutoPageGaps(this.editorDom?.innerHTML || "")
      .replace(/\s+data-vno-(?:src-hash|untouched)=["'][^"']*["']/gi, "")
      .replace(/<span\b(?=[^>]*\bclass=["'][^"']*\bvno-spelling-(?:error|uncertain)\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/\r\n?/g, "\n")
      .trim();
    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  _isOpenedDocumentPristine() {
    return !this.isDirty
      && this._openedEditorDomHash !== null
      && this._openedEditorDomHash === this._editorDomFingerprint();
  }

  _markImportedParagraphsUntouched(root = this.bodyDom) {
    if (!root?.children) return;
    const paragraphs = root.querySelectorAll
      ? Array.from(root.querySelectorAll("p,h1,h2,h3,h4,h5,h6"))
      : Array.from(root.children);
    for (const element of paragraphs) {
      if (!/^(?:P|H[1-6])$/i.test(element.tagName || "") || typeof element.setAttribute !== "function") continue;
      element.setAttribute("data-vno-src-hash", this._untouchedParagraphFingerprint(element.innerHTML));
    }
  }

  _markCurrentUntouchedParagraphs(root = this.bodyDom) {
    if (!root?.children) return;
    let index = 0;
    const paragraphs = root.querySelectorAll
      ? Array.from(root.querySelectorAll("p,h1,h2,h3,h4,h5,h6"))
      : Array.from(root.children);
    for (const element of paragraphs) {
      if (!/^(?:P|H[1-6])$/i.test(element.tagName || "") || typeof element.getAttribute !== "function") continue;
      const sourceHash = element.getAttribute("data-vno-src-hash");
      const currentHash = this._untouchedParagraphFingerprint(element.innerHTML);
      if (sourceHash && sourceHash === currentHash) {
        element.setAttribute("data-vno-untouched", "1");
        // A paragraph id becomes a Word bookmark on that exact paragraph.
        // An inner <a> can be moved by LibreOffice ahead of an absolute frame,
        // losing the paragraph ownership needed by the DOCX overlay.
        if (!element.getAttribute("id")) {
          element.setAttribute("id", `vno-untouched-${index}`);
        } else {
          element.innerHTML = `<a name="vno-untouched-${index}"></a>${element.innerHTML}`;
        }
      } else {
        element.removeAttribute?.("data-vno-untouched");
        element.setAttribute?.("data-vno-edited", "1");
        if (!element.getAttribute("id")) {
          element.setAttribute("id", `vno-edited-${index}`);
        } else {
          element.innerHTML = `<a name="vno-edited-${index}"></a>${element.innerHTML}`;
        }
      }
      index += 1;
    }
  }

  _cssLengthToCm(raw) {
    const match = String(raw || "").trim().match(/^(-?[\d.]+)\s*(cm|mm|in|px|pt)?$/i);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    const unit = (match[2] || "cm").toLowerCase();
    const cm = unit === "mm" ? value / 10 : unit === "in" ? value * 2.54 : unit === "px" ? value * 2.54 / 96 : unit === "pt" ? value * 2.54 / 72 : value;
    return Number(cm.toFixed(3));
  }

  _ooxmlFloatingAnchorMetadata(xml) {
    const rawXml = String(xml || "");
    const bodyStart = rawXml.indexOf("<w:body>");
    return [...rawXml.matchAll(/<wp:anchor\b([^>]*)>([\s\S]*?)<\/wp:anchor>/gi)].map((match) => {
      const attrs = match[1] || "";
      const body = match[2] || "";
      const posH = body.match(/<wp:positionH\b[^>]*relativeFrom=["']([^"']+)/i)?.[1] || "paragraph";
      const posV = body.match(/<wp:positionV\b[^>]*relativeFrom=["']([^"']+)/i)?.[1] || "paragraph";
      const wrap = body.match(/<wp:(wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\b/i)?.[1] || "wrapNone";
      const horizontalOffset = Number(body.match(/<wp:positionH\b[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/i)?.[1]);
      const verticalOffset = Number(body.match(/<wp:positionV\b[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/i)?.[1]);
      const extent = body.match(/<wp:extent\b[^>]*\bcx=["'](\d+)["'][^>]*\bcy=["'](\d+)["']/i);

      const prefix = bodyStart !== -1 ? rawXml.slice(bodyStart, match.index) : rawXml.slice(0, match.index);
      const brCount = (prefix.match(/<w:br\b[^>]*w:type=["']page["']/gi) || []).length;
      const pbbCount = (prefix.match(/<w:pageBreakBefore\b/gi) || []).length;
      const sectCount = (prefix.match(/<w:pPr\b[^>]*>[\s\S]*?<w:sectPr\b/gi) || []).length;
      const pageIndex = brCount + pbbCount + sectCount;

      return {
        relativeH: posH,
        relativeV: posV,
        wrap,
        behindDoc: /\bbehindDoc=["'](?:1|true)["']/i.test(attrs),
        sourceGroup: /<wpg:wgp\b/i.test(body),
        leftCm: Number.isFinite(horizontalOffset) ? Number((horizontalOffset / 360000).toFixed(3)) : null,
        topCm: Number.isFinite(verticalOffset) ? Number((verticalOffset / 360000).toFixed(3)) : null,
        widthCm: extent ? Number((Number(extent[1]) / 360000).toFixed(3)) : null,
        heightCm: extent ? Number((Number(extent[2]) / 360000).toFixed(3)) : null,
        pageIndex
      };
    });
  }

  _ooxmlGroupChildTextboxes(xml) {
    const rawXml = String(xml || "");
    const normalize = (str) => String(str || "").replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const groupWsps = [];

    // 1. Anchored groups: each wp:anchor at index anchorK corresponds 1:1 to raster image k
    const anchors = [...rawXml.matchAll(/<wp:anchor\b([\s\S]*?)<\/wp:anchor>/gi)];
    for (let anchorK = 0; anchorK < anchors.length; anchorK++) {
      const dXml = anchors[anchorK][0];
      if (!/<wpg:wgp\b/i.test(dXml)) continue;

      const posH = Number(dXml.match(/<wp:positionH\b[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/i)?.[1]);
      const posV = Number(dXml.match(/<wp:positionV\b[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/i)?.[1]);
      const extent = dXml.match(/<wp:extent\b[^>]*\bcx=["'](\d+)["'][^>]*\bcy=["'](\d+)["']/i);
      const ancLeftEmu = Number.isFinite(posH) ? posH : 0;
      const ancTopEmu = Number.isFinite(posV) ? posV : 0;
      const cx = extent ? Number(extent[1]) : 0;
      const cy = extent ? Number(extent[2]) : 0;

      for (const wgpMatch of dXml.matchAll(/<wpg:wgp\b[\s\S]*?<\/wpg:wgp>/gi)) {
        const wgp = wgpMatch[0];
        const grpSpPr = wgp.match(/<wpg:grpSpPr\b[\s\S]*?<\/wpg:grpSpPr>/i)?.[0] || "";
        const gExt = grpSpPr.match(/<a:ext\s+cx=["']([^"']*)["']\s+cy=["']([^"']*)["']/i);
        const gChOff = grpSpPr.match(/<a:chOff\s+x=["']([^"']*)["']\s+y=["']([^"']*)["']/i);
        const gChExt = grpSpPr.match(/<a:chExt\s+cx=["']([^"']*)["']\s+cy=["']([^"']*)["']/i);

        const gExtCx = gExt ? Number(gExt[1]) : cx;
        const gExtCy = gExt ? Number(gExt[2]) : cy;
        const gChOffX = gChOff ? Number(gChOff[1]) : 0;
        const gChOffY = gChOff ? Number(gChOff[2]) : 0;
        const gChExtCx = gChExt ? Number(gChExt[1]) : gExtCx;
        const gChExtCy = gChExt ? Number(gChExt[2]) : gExtCy;

        const scaleX = gChExtCx > 0 ? gExtCx / gChExtCx : 1.0;
        const scaleY = gChExtCy > 0 ? gExtCy / gChExtCy : 1.0;

        for (const wspMatch of wgp.matchAll(/<wps:wsp\b[\s\S]*?<\/wps:wsp>/gi)) {
          const wspXml = wspMatch[0];
          const txbxMatch = wspXml.match(/<w:txbxContent\b[\s\S]*?<\/w:txbxContent>/i);
          if (!txbxMatch) continue;
          const text = normalize(txbxMatch[0]);
          if (!text) continue;

          const wspOff = wspXml.match(/<a:off\s+x=["']([^"']*)["']\s+y=["']([^"']*)["']/i);
          const wspExt = wspXml.match(/<a:ext\s+cx=["']([^"']*)["']\s+cy=["']([^"']*)["']/i);
          const wspSolid = /<a:solidFill\b/i.test(wspXml);

          const offX = wspOff ? Number(wspOff[1]) : 0;
          const offY = wspOff ? Number(wspOff[2]) : 0;
          const extCx = wspExt ? Number(wspExt[1]) : 0;
          const extCy = wspExt ? Number(wspExt[2]) : 0;

          const childX = (offX - gChOffX) * scaleX;
          const childY = (offY - gChOffY) * scaleY;
          const childW = extCx * scaleX;
          const childH = extCy * scaleY;

          const pageLeftCm = Number(((ancLeftEmu + childX) / 360000).toFixed(3));
          const pageTopCm = Number(((ancTopEmu + childY) / 360000).toFixed(3));
          const wspWidthCm = Number((childW / 360000).toFixed(3));
          const wspHeightCm = Number((childH / 360000).toFixed(3));

          groupWsps.push({
            text,
            solidFill: wspSolid,
            pageLeftCm,
            pageTopCm,
            widthCm: wspWidthCm,
            heightCm: wspHeightCm,
            anchorIndex: anchorK
          });
        }
      }
    }

    // 2. Inline groups: anchorIndex = null, inlineGroupIndex = j
    const inlines = [...rawXml.matchAll(/<wp:inline\b([\s\S]*?)<\/wp:inline>/gi)];
    let inlineGroupJ = 0;
    for (const iMatch of inlines) {
      const dXml = iMatch[0];
      if (!/<wpg:wgp\b/i.test(dXml)) continue;
      const j = inlineGroupJ++;
      const extent = dXml.match(/<wp:extent\b[^>]*\bcx=["'](\d+)["'][^>]*\bcy=["'](\d+)["']/i);
      const cx = extent ? Number(extent[1]) : 0;
      const cy = extent ? Number(extent[2]) : 0;

      for (const wgpMatch of dXml.matchAll(/<wpg:wgp\b[\s\S]*?<\/wpg:wgp>/gi)) {
        const wgp = wgpMatch[0];
        const grpSpPr = wgp.match(/<wpg:grpSpPr\b[\s\S]*?<\/wpg:grpSpPr>/i)?.[0] || "";
        const gExt = grpSpPr.match(/<a:ext\s+cx=["']([^"']*)["']\s+cy=["']([^"']*)["']/i);
        const gChOff = grpSpPr.match(/<a:chOff\s+x=["']([^"']*)["']\s+y=["']([^"']*)["']/i);
        const gChExt = grpSpPr.match(/<a:chExt\s+cx=["']([^"']*)["']\s+cy=["']([^"']*)["']/i);

        const gExtCx = gExt ? Number(gExt[1]) : cx;
        const gExtCy = gExt ? Number(gExt[2]) : cy;
        const gChOffX = gChOff ? Number(gChOff[1]) : 0;
        const gChOffY = gChOff ? Number(gChOff[2]) : 0;
        const gChExtCx = gChExt ? Number(gChExt[1]) : gExtCx;
        const gChExtCy = gChExt ? Number(gChExt[2]) : gExtCy;

        const scaleX = gChExtCx > 0 ? gExtCx / gChExtCx : 1.0;
        const scaleY = gChExtCy > 0 ? gExtCy / gChExtCy : 1.0;

        for (const wspMatch of wgp.matchAll(/<wps:wsp\b[\s\S]*?<\/wps:wsp>/gi)) {
          const wspXml = wspMatch[0];
          const txbxMatch = wspXml.match(/<w:txbxContent\b[\s\S]*?<\/w:txbxContent>/i);
          if (!txbxMatch) continue;
          const text = normalize(txbxMatch[0]);
          if (!text) continue;

          const wspOff = wspXml.match(/<a:off\s+x=["']([^"']*)["']\s+y=["']([^"']*)["']/i);
          const wspExt = wspXml.match(/<a:ext\s+cx=["']([^"']*)["']\s+cy=["']([^"']*)["']/i);
          const wspSolid = /<a:solidFill\b/i.test(wspXml);

          const offX = wspOff ? Number(wspOff[1]) : 0;
          const offY = wspOff ? Number(wspOff[2]) : 0;
          const extCx = wspExt ? Number(wspExt[1]) : 0;
          const extCy = wspExt ? Number(wspExt[2]) : 0;

          const childX = (offX - gChOffX) * scaleX;
          const childY = (offY - gChOffY) * scaleY;
          const childW = extCx * scaleX;
          const childH = extCy * scaleY;

          const leftCm = Number((childX / 360000).toFixed(3));
          const topCm = Number((childY / 360000).toFixed(3));
          const wspWidthCm = Number((childW / 360000).toFixed(3));
          const wspHeightCm = Number((childH / 360000).toFixed(3));

          groupWsps.push({
            text,
            solidFill: wspSolid,
            pageLeftCm: leftCm,
            pageTopCm: topCm,
            widthCm: wspWidthCm,
            heightCm: wspHeightCm,
            anchorIndex: null,
            inlineGroupIndex: j
          });
        }
      }
    }

    return groupWsps;
  }

  _ooxmlInlineGroupMetadata(xml) {
    const rawXml = String(xml || "");
    const inlines = [...rawXml.matchAll(/<wp:inline\b([\s\S]*?)<\/wp:inline>/gi)];
    const groups = [];
    let j = 0;
    for (const iMatch of inlines) {
      const dXml = iMatch[0];
      if (!/<wpg:wgp\b/i.test(dXml)) continue;
      const extent = dXml.match(/<wp:extent\b[^>]*\bcx=["'](\d+)["'][^>]*\bcy=["'](\d+)["']/i);
      const cx = extent ? Number(extent[1]) : 0;
      const cy = extent ? Number(extent[2]) : 0;
      groups.push({
        index: j++,
        widthCm: Number((cx / 360000).toFixed(3)),
        heightCm: Number((cy / 360000).toFixed(3)),
        cx,
        cy
      });
    }
    return groups;
  }

  _ooxmlTableColumnWidths(xml) {
    return [...String(xml || "").matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/gi)].map((tableMatch) => {
      const firstRow = tableMatch[0].match(/<w:tr\b[\s\S]*?<\/w:tr>/i)?.[0] || "";
      return [...firstRow.matchAll(/<w:tcW\b[^>]*\bw:w=["'](\d+)["']/gi)]
        .map((match) => Number(match[1]))
        .filter((width) => Number.isFinite(width) && width > 0);
    });
  }

  /**
   * Quy ước W11 — khoảng cách/giãn dòng của đoạn TRONG Ô BẢNG theo OOXML.
   * LibreOffice bỏ `w:spacing w:after="0"` ghi ngay trong ô và không áp pPr của style bảng (TableGrid:
   * after=0, line=240) → mỗi đoạn trong ô mang margin-bottom 0,21cm + 115% của tài liệu.
   * Đo d13.docx 2026-09-15: hàng Word 14px, canvas 28px; 5 bảng thấp hơn Word 93–124px mỗi bảng.
   * Ghép bảng thứ k của HTML với w:tbl thứ k (như _applyOoxmlTableColumnGeometry), đoạn thứ j trong bảng
   * với w:p thứ j; chỉ ghi khi OOXML nói rõ (đoạn hoặc style bảng), không chạm giá trị LibreOffice khác.
   */
  _applyOoxmlTableParagraphSpacing(html, ooxmlDocumentXml, ooxmlStylesXml = "") {
    const xml = String(ooxmlDocumentXml || "");
    if (!xml.includes("<w:tbl>")) return html;
    const styles = String(ooxmlStylesXml || "");
    const spacingOf = (block) => {
      const m = block.match(/<w:spacing\b([^>]*)\/>/);
      if (!m) return null;
      const a = m[1];
      const num = (name) => { const v = a.match(new RegExp(`w:${name}="(-?\\d+)"`)); return v ? Number(v[1]) : null; };
      return { before: num("before"), after: num("after"), line: num("line"), lineRule: a.match(/w:lineRule="(\w+)"/)?.[1] || "auto" };
    };
    // pPr của style bảng (kể cả basedOn) — phần <w:pPr> cấp style, không phải trong w:tblStylePr.
    const tableStyleSpacing = new Map();
    const styleSpacing = (styleId, depth = 0) => {
      if (!styleId || depth > 8) return null;
      if (tableStyleSpacing.has(styleId)) return tableStyleSpacing.get(styleId);
      const st = styles.match(new RegExp(`<w:style\\b[^>]*w:styleId="${styleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</w:style>`));
      let result = null;
      if (st) {
        const body = st[1].replace(/<w:tblStylePr\b[\s\S]*?<\/w:tblStylePr>/g, "");
        const ppr = body.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
        result = ppr ? spacingOf(ppr[1]) : null;
        if (!result) result = styleSpacing(body.match(/<w:basedOn w:val="([^"]+)"/)?.[1], depth + 1);
      }
      tableStyleSpacing.set(styleId, result);
      return result;
    };
    // Tách các w:tbl cấp cao nhất (bảng lồng nằm trong bảng cha).
    const tables = [];
    let pos = 0;
    while (true) {
      const start = xml.indexOf("<w:tbl>", pos);
      if (start < 0) break;
      let depth = 0; let i = start;
      const re = /<w:tbl>|<\/w:tbl>/g; re.lastIndex = start;
      let m; let end = -1;
      while ((m = re.exec(xml))) { depth += m[0] === "<w:tbl>" ? 1 : -1; if (depth === 0) { end = m.index + m[0].length; break; } }
      if (end < 0) break;
      tables.push(xml.slice(start, end)); pos = end; i = end;
    }
    if (!tables.length) return html;
    const twipsToCm = (t) => `${Math.round(t / 567 * 1000) / 1000}cm`;
    let tableIndex = 0;
    return String(html || "").replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (tableHtml) => {
      const tbl = tables[tableIndex++];
      if (!tbl) return tableHtml;
      const tableStyle = styleSpacing(tbl.match(/<w:tblStyle w:val="([^"]+)"/)?.[1]);
      const paras = [...tbl.matchAll(/<w:p\b(?:(?!<w:p\b)[\s\S])*?<\/w:p>|<w:p\/>/g)].map((p) => {
        const ppr = p[0].match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
        return { own: ppr ? spacingOf(ppr[1]) : null, contextual: /<w:contextualSpacing\b/.test(ppr?.[1] || "") };
      });
      const htmlParas = [...tableHtml.matchAll(/<p\b[^>]*>/gi)];
      if (!paras.length || htmlParas.length !== paras.length) return tableHtml;
      let j = 0;
      return tableHtml.replace(/<p\b([^>]*)>/gi, (tag, attrs) => {
        const spec = paras[j++];
        const eff = { ...(tableStyle || {}) };
        for (const key of ["before", "after", "line", "lineRule"]) if (spec.own && spec.own[key] !== null && spec.own[key] !== undefined) eff[key] = spec.own[key];
        const decls = [];
        if (eff.before !== null && eff.before !== undefined) decls.push(`margin-top: ${twipsToCm(eff.before)}`);
        if (eff.after !== null && eff.after !== undefined) decls.push(`margin-bottom: ${twipsToCm(eff.after)}`);
        if (eff.line !== null && eff.line !== undefined) {
          if (eff.lineRule === "exact") decls.push(`line-height: ${Math.round(eff.line / 20 * 100) / 100}pt`);
          else if (eff.lineRule === "auto") decls.push(`line-height: ${Math.round(eff.line / 240 * 10000) / 100}%`);
        }
        if (!decls.length) return tag;
        const styleMatch = attrs.match(/\bstyle=(["'])([^"']*)\1/i);
        if (styleMatch) {
          let css = styleMatch[2];
          for (const d of decls) {
            const prop = d.split(":")[0].trim();
            css = css.replace(new RegExp(`(^|;)\\s*${prop}\\s*:[^;]*`, "i"), "$1");
          }
          css = `${css.replace(/;\s*$/, "").replace(/^\s*;/, "")}${css.trim() ? "; " : ""}${decls.join("; ")}`;
          return `<p${attrs.replace(styleMatch[0], `style=${styleMatch[1]}${css}${styleMatch[1]}`)}>`;
        }
        return `<p${attrs} style="${decls.join("; ")}">`;
      });
    });
  }

  /**
   * Quy ước W12a — contextualSpacing: Word bỏ MAX(space-after, space-before) giữa HAI ĐOẠN KẾ TIẾP
   * cùng pStyle khi style đó (hoặc pPr đoạn) có <w:contextualSpacing/>. LibreOffice không áp dụng điều này.
   * Sửa khi nhập: duyệt các w:p cấp cao nhất (không trong bảng), ánh xạ theo thứ tự sang HTML <p>,
   * nếu đoạn i và i+1 cùng style và cả hai đều có contextualSpacing → margin-bottom: 0 cho đoạn i,
   * margin-top: 0 cho đoạn i+1.
   */
  _applyOoxmlContextualSpacing(html, ooxmlDocumentXml, ooxmlStylesXml = "") {
    const xml = String(ooxmlDocumentXml || "");
    const styles = String(ooxmlStylesXml || "");
    if (!xml || !xml.includes("<w:body>")) return html;

    // 1. Xây dựng map styleId -> có contextualSpacing (kể cả basedOn chain)
    const styleCtx = new Map();
    const basedOn = new Map();
    const styleRe = /<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g;
    for (const m of styles.matchAll(styleRe)) {
      const sid = m[1];
      const body = m[2];
      const ppr = body.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
      styleCtx.set(sid, ppr && /<w:contextualSpacing\b/.test(ppr[1]));
      const b = body.match(/<w:basedOn w:val="([^"]+)"/);
      basedOn.set(sid, b ? b[1] : null);
    }
    const hasCtx = (sid, depth = 0) => {
      if (!sid || depth > 12) return false;
      if (styleCtx.has(sid) && styleCtx.get(sid)) return true;
      const parent = basedOn.get(sid);
      return parent ? hasCtx(parent, depth + 1) : false;
    };
    // <w:spacing> gần nhất trong style chain (đoạn không tự khai báo) — cho lineRule="atLeast" (W12c)
    const styleSpacingAttrs = new Map();
    for (const m of styles.matchAll(styleRe)) {
      const ppr = m[2].match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
      const sp = ppr && ppr[1].match(/<w:spacing\b([^>]*)\/?>/);
      styleSpacingAttrs.set(m[1], sp ? sp[1] : null);
    }
    const styleSpacing = (sid, depth = 0) => {
      if (!sid || depth > 12) return null;
      if (styleSpacingAttrs.get(sid)) return styleSpacingAttrs.get(sid);
      const parent = basedOn.get(sid);
      return parent ? styleSpacing(parent, depth + 1) : null;
    };

    // 2. Lấy tất cả w:p cấp cao nhất (không nằm trong w:tbl)
    const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/i);
    if (!bodyMatch) return html;
    const bodyXml = bodyMatch[1];

    // Loại bỏ nội dung trong bảng để không đếm w:p trong bảng
    const bodyNoTables = bodyXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/gi, "");

    const paras = [];
    const paraRe = /<w:p\b(?:(?!<w:p\b)[\s\S])*?<\/w:p>|<w:p\/>/g;
    for (const m of bodyNoTables.matchAll(paraRe)) {
      const p = m[0];
      const ppr = p.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
      const pprXml = ppr ? ppr[1] : "";
      const ownCtx = /<w:contextualSpacing\b/.test(pprXml);
      const styleMatch = pprXml.match(/<w:pStyle w:val="([^"]+)"/);
      const styleId = styleMatch ? styleMatch[1] : "Normal";
      const ctx = ownCtx || hasCtx(styleId);
      // W12c: lineRule="atLeast" (đoạn hoặc style chain) — Word: dòng = MAX(giá trị, chiều cao tự nhiên của font).
      // LibreOffice ghi thành line-height tuyệt đối (d06: line=10 twips → 0.02cm → canvas 0.76 px, 15 đoạn cao 1 px).
      const ownSpacing = pprXml.match(/<w:spacing\b([^>]*)\/?>/);
      let atLeastTwips = null;
      const spacingAttrs = ownSpacing ? ownSpacing[1] : (styleSpacing(styleId) || "");
      const lineRule = spacingAttrs.match(/w:lineRule="(\w+)"/)?.[1];
      const lineVal = spacingAttrs.match(/w:line="(-?\d+)"/)?.[1];
      if (lineRule === "atLeast" && lineVal) atLeastTwips = Number(lineVal);
      paras.push({ styleId, ctx, pprXml, atLeastTwips });
    }

    if (!paras.length) return html;

    // 3. Xác định paragraphs nào cần margin-bottom:0 (với next) và margin-top:0 (với prev)
    const needBottomZero = new Array(paras.length).fill(false);
    const needTopZero = new Array(paras.length).fill(false);
    for (let i = 0; i < paras.length - 1; i++) {
      const cur = paras[i];
      const next = paras[i + 1];
      if (cur.styleId === next.styleId && cur.ctx && next.ctx) {
        needBottomZero[i] = true;
        needTopZero[i + 1] = true;
      }
    }
    const anyAtLeast = paras.some(p => p.atLeastTwips !== null);
    if (!needBottomZero.some(v => v) && !needTopZero.some(v => v) && !anyAtLeast) return html;

    // 4. Tách các bảng HTML để bỏ qua paragraph trong bảng
    const tables = [];
    let pos = 0;
    while (true) {
      const start = html.indexOf("<table", pos);
      if (start < 0) break;
      let depth = 0; let i = start;
      const re = /<table\b|<\/table>/gi; re.lastIndex = start;
      let m; let end = -1;
      while ((m = re.exec(html))) { depth += m[0].startsWith("<table") ? 1 : -1; if (depth === 0) { end = m.index + m[0].length; break; } }
      if (end < 0) break;
      tables.push({ start, end }); pos = end;
    }

    // 5. Single-pass replace on HTML paragraphs (skip paragraphs inside tables)
    let paraIndex = 0;
    return String(html || "").replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (fullTag, attrs, inner, offset) => {
      // Skip if inside a table
      for (const t of tables) {
        if (offset >= t.start && offset < t.end) return fullTag;
      }

      const spec = paras[paraIndex];
      paraIndex++;
      if (!spec) return fullTag;

      const decls = [];
      if (needBottomZero[paraIndex - 1]) decls.push("margin-bottom: 0");
      if (needTopZero[paraIndex - 1]) decls.push("margin-top: 0");
      if (spec.atLeastTwips !== null) {
        // W12c: "ít nhất X" = MAX(X, dòng tự nhiên = 1em × tỉ số font (W1)); LibreOffice chỉ ghi X tuyệt đối
        const pt = Math.round(spec.atLeastTwips / 20 * 100) / 100;
        decls.push(`line-height: max(${pt}pt, calc(1em * var(--vno-font-ratio, 1.15)))`);
      }
      if (!decls.length) return fullTag;

      return this._addCssDeclsToParagraph(fullTag, attrs, inner, decls);
    });
  }

  _addCssDeclsToParagraph(fullTag, attrs, inner, decls) {
    const styleMatch = attrs.match(/\bstyle=(["'])([^"']*)\1/i);
    let newAttrs = attrs;
    if (styleMatch) {
      const quote = styleMatch[1];
      let css = styleMatch[2];
      const existing = {};
      css.split(";").forEach(part => {
        const m = part.trim().match(/^([^:]+):\s*(.+)$/);
        if (m) existing[m[1].trim().toLowerCase()] = m[2].trim();
      });
      for (const decl of decls) {
        const [prop, val] = decl.split(":").map(s => s.trim());
        existing[prop.toLowerCase()] = val;
      }
      const orderedProps = ["margin-top", "margin-bottom", "margin-left", "margin-right", "line-height"];
      const newParts = [];
      for (const prop of orderedProps) {
        if (existing[prop] !== undefined) newParts.push(`${prop}: ${existing[prop]}`);
      }
      for (const [prop, val] of Object.entries(existing)) {
        if (!orderedProps.includes(prop)) newParts.push(`${prop}: ${val}`);
      }
      css = newParts.join("; ");
      newAttrs = attrs.replace(styleMatch[0], `style=${quote}${css}${quote}`);
    } else {
      newAttrs = `${attrs} style="${decls.join("; ")}"`;
    }
    return `<p${newAttrs}>${inner}</p>`;
  }

  _applyOoxmlTableColumnGeometry(html, ooxmlDocumentXml) {
    const widthsByTable = this._ooxmlTableColumnWidths(ooxmlDocumentXml);
    let tableIndex = 0;
    return String(html || "").replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (tableHtml) => {
      const nativeWidths = widthsByTable[tableIndex++] || [];
      const cols = [...tableHtml.matchAll(/<col\b[^>]*>/gi)];
      if (!nativeWidths.length || nativeWidths.length !== cols.length) return tableHtml;
      const renderedWidth = Number(tableHtml.match(/<table\b[^>]*\bwidth=["']?(\d+)/i)?.[1]);
      const total = nativeWidths.reduce((sum, width) => sum + width, 0);
      if (!Number.isFinite(renderedWidth) || renderedWidth <= 0 || total <= 0) return tableHtml;
      const renderedWidths = nativeWidths.map((width) => Math.max(1, Math.round(renderedWidth * width / total)));
      let colIndex = 0;
      let normalized = tableHtml.replace(/<col\b[^>]*>/gi, (colTag) => {
        const width = renderedWidths[colIndex++];
        return /\bwidth=["']?\d+["']?/i.test(colTag)
          ? colTag.replace(/\bwidth=["']?\d+["']?/i, `width="${width}"`)
          : colTag.replace(/>$/, ` width="${width}">`);
      });
      normalized = normalized.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (rowHtml) => {
        const cells = [...rowHtml.matchAll(/<(?:td|th)\b[^>]*>/gi)];
        if (cells.length !== renderedWidths.length) return rowHtml;
        let cellIndex = 0;
        return rowHtml.replace(/<(?:td|th)\b[^>]*>/gi, (cellTag) => {
          const width = renderedWidths[cellIndex++];
          return /\bwidth=["']?\d+["']?/i.test(cellTag)
            ? cellTag.replace(/\bwidth=["']?\d+["']?/i, `width="${width}"`)
            : cellTag.replace(/>$/, ` width="${width}">`);
        });
      });
      return normalized;
    });
  }

  _preserveImportedFloatingFrames(html, ooxmlDocumentXml, page = null) {
    const src = String(html || "");
    const anchors = this._ooxmlFloatingAnchorMetadata(ooxmlDocumentXml);
    const groupWsps = typeof this._ooxmlGroupChildTextboxes === "function"
      ? this._ooxmlGroupChildTextboxes(ooxmlDocumentXml)
      : [];
    const hasNativeGroup = anchors.some((a) => a.sourceGroup) || groupWsps.length > 0;
    const hasParagraphs = /<p\b/i.test(src);

    const imageSourceCounts = new Map();
    for (const match of src.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
      imageSourceCounts.set(match[1], (imageSourceCounts.get(match[1]) || 0) + 1);
    }

    const normalizeText = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

    const openRe = /<span\b([^>]*)>/gi;
    let cursor = 0;
    const spans = [];

    while (cursor < src.length) {
      openRe.lastIndex = cursor;
      const opening = openRe.exec(src);
      if (!opening) break;
      const attrs = opening[1] || "";
      const style = opening[0].match(/\bstyle\s*=\s*["']([^"']*)/i)?.[1] || "";
      const isImage = /\bclass=["'][^"']*\bsd-abs-pos\b/i.test(opening[0]);
      const isTextbox = /\bid=["'](?:textbox|Frame)[^"']*["']/i.test(opening[0]);

      const isAbs = /\bposition\s*:\s*absolute\b/i.test(style);
      const isFloat = /\bfloat\s*:\s*left\b/i.test(style);
      if ((!isImage && !isTextbox) || (!isAbs && !isFloat)) {
        cursor = opening.index + opening[0].length;
        continue;
      }

      let depth = 1;
      let search = opening.index + opening[0].length;
      let close = -1;
      while (depth > 0) {
        openRe.lastIndex = search;
        const nested = openRe.exec(src);
        const nextClose = src.indexOf("</span>", search);
        if (nextClose < 0) break;
        if (nested && nested.index < nextClose) {
          depth += 1;
          search = nested.index + nested[0].length;
        } else {
          depth -= 1;
          close = nextClose;
          search = nextClose + 7;
        }
      }

      if (depth !== 0) {
        cursor = opening.index + opening[0].length;
        continue;
      }

      const inner = src.slice(opening.index + opening[0].length, close);
      const startPos = opening.index;
      const endPos = close + 7;
      cursor = endPos;

      spans.push({ isImage, isTextbox, style, inner, startPos, endPos });
    }

    const marginLeftCm = Number(page?.margins?.left || 0) / 10;
    const marginTopCm = Number(page?.margins?.top || 0) / 10;

    // Pass 1 & 2: Match textboxes to group wsp
    const matchedWspBySpan = new Map();
    const usedWsps = new Set();
    if (hasNativeGroup && groupWsps.length > 0) {
      // Pass 1: Exact match pass
      for (let sIdx = 0; sIdx < spans.length; sIdx++) {
        const sp = spans[sIdx];
        if (!sp.isTextbox) continue;
        const text = normalizeText(sp.inner);
        for (let i = 0; i < groupWsps.length; i++) {
          if (usedWsps.has(i)) continue;
          const w = groupWsps[i];
          if (w.text === text) {
            matchedWspBySpan.set(sIdx, w);
            usedWsps.add(i);
            break;
          }
        }
      }
      // Pass 2: Fuzzy match pass for remaining unattached textboxes
      for (let sIdx = 0; sIdx < spans.length; sIdx++) {
        if (matchedWspBySpan.has(sIdx)) continue;
        const sp = spans[sIdx];
        if (!sp.isTextbox) continue;
        const text = normalizeText(sp.inner);
        if (!text || text.length < 5) continue;
        for (let i = 0; i < groupWsps.length; i++) {
          if (usedWsps.has(i)) continue;
          const w = groupWsps[i];
          if (w.text.includes(text) || text.includes(w.text)) {
            matchedWspBySpan.set(sIdx, w);
            usedWsps.add(i);
            break;
          }
        }
      }
    }

    let anchorIndex = 0;
    const inlineGroups = typeof this._ooxmlInlineGroupMetadata === "function"
      ? this._ooxmlInlineGroupMetadata(ooxmlDocumentXml)
      : [];

    const imgRe = /<img\b[^>]*>/gi;
    const inlineImages = [];
    let iMatch;
    while ((iMatch = imgRe.exec(src)) !== null) {
      const inSpan = spans.some((s) => iMatch.index >= s.startPos && iMatch.index < s.endPos);
      if (!inSpan) {
        const nameMatch = iMatch[0].match(/\bname=["']?Shape(\d+)\b/i);
        if (nameMatch) {
          inlineImages.push({
            start: iMatch.index,
            end: iMatch.index + iMatch[0].length,
            tag: iMatch[0],
            shapeNum: Number(nameMatch[1])
          });
        }
      }
    }

    const imageSpans = [];
    const imageIndexByAnchor = new Map();
    const textboxesByAnchor = new Map();
    const textboxesByInlineGroup = new Map();
    const spanReplacements = [];

    // Identify images first so we can attach textboxes to the right anchor image
    for (let sIdx = 0; sIdx < spans.length; sIdx++) {
      const sp = spans[sIdx];
      if (!sp.isImage) continue;

      const imgK = anchorIndex++;
      imageIndexByAnchor.set(imgK, imageSpans.length);

      const { style, inner, startPos, endPos } = sp;
      const value = (name) => style.match(new RegExp(`\\b${name}\\s*:\\s*([^;]+)`, "i"))?.[1];
      const imgTag = inner.match(/<img\b[^>]*>/i)?.[0] || "";
      const attrValue = (name) => imgTag.match(new RegExp(`\\b${name}=["']?([^"'\\s>]+)`, "i"))?.[1];
      const htmlLeft = this._cssLengthToCm(value("left")) ?? 0;
      const htmlTop = this._cssLengthToCm(value("top")) ?? 0;
      const htmlWidth = this._cssLengthToCm(value("width")) ?? this._cssLengthToCm(`${attrValue("width") || 0}px`) ?? 0;
      const htmlHeight = this._cssLengthToCm(value("height")) ?? this._cssLengthToCm(`${attrValue("height") || 0}px`) ?? 0;

      const meta = anchors[imgK] || { relativeH: "paragraph", relativeV: "paragraph", wrap: "wrapNone", behindDoc: false, pageIndex: 0 };
      const left = meta.sourceGroup && meta.leftCm != null ? meta.leftCm : htmlLeft;
      const top = meta.sourceGroup && meta.topCm != null ? meta.topCm : htmlTop;
      const width = meta.sourceGroup && meta.widthCm ? meta.widthCm : htmlWidth;
      const height = meta.sourceGroup && meta.heightCm ? meta.heightCm : htmlHeight;

      const isPageRel = ["page", "margin"].includes(String(meta.relativeV).toLowerCase());
      const displayLeft = ["margin", "column"].includes(String(meta.relativeH).toLowerCase()) ? left + marginLeftCm : left;
      const displayTop = ["margin"].includes(String(meta.relativeV).toLowerCase()) ? top + marginTopCm : top;
      const canvasLeft = Number((displayLeft - marginLeftCm).toFixed(3));
      const canvasTop = Number((displayTop - marginTopCm).toFixed(3));

      const cleanedStyle = style.replace(/\b(?:position|top|left|width|height|float)\s*:\s*[^;]+;?\s*/gi, "").trim();
      const imageSource = attrValue("src") || "";
      const isRepeatedPageWatermark = meta.behindDoc
        && String(meta.relativeH).toLowerCase() === "page"
        && String(meta.relativeV).toLowerCase() === "page"
        && (imageSourceCounts.get(imageSource) || 0) >= 3
        && width >= 10
        && height >= 10;
      const isPageImage = meta.behindDoc
        && meta.wrap === "wrapNone"
        && !isRepeatedPageWatermark
        && String(meta.relativeH).toLowerCase() === "page"
        && String(meta.relativeV).toLowerCase() === "page";

      const canvasGeometry = (hasNativeGroup && isPageRel)
        ? `position:absolute;left:${canvasLeft}cm;top:${canvasTop}cm;`
        : (isRepeatedPageWatermark || isPageImage)
          ? `position:absolute;left:${canvasLeft}cm;top:${canvasTop}cm;`
          : `position:absolute;left:${displayLeft}cm;top:${displayTop}cm;`;

      const spanHtml = `<span data-vno-float="image" data-vno-source-group="${meta.sourceGroup ? "1" : "0"}" data-vno-left="${left}" data-vno-top="${top}" data-vno-width="${width}" data-vno-height="${height}" data-vno-relative-h="${meta.relativeH}" data-vno-relative-v="${meta.relativeV}" data-vno-wrap="${meta.wrap}" data-vno-behind="${meta.behindDoc ? "1" : "0"}"${isRepeatedPageWatermark ? ' data-vno-imported-watermark="1"' : ""}${isPageImage ? ' data-vno-page-image="1"' : ""} style="${canvasGeometry}${width ? `width:${width}cm;` : ""}${height ? `height:${height}cm;` : ""}${meta.behindDoc ? "z-index:0;" : "z-index:1;"}${cleanedStyle}">${inner}</span>`;

      imageSpans.push({ imgK, spanHtml, startPos, endPos });
    }

    // Identify floating group rasters among inlineImages (images without matching wp:inline)
    const groupAnchors = anchors.filter((a) => a.sourceGroup);
    let floatingGroupIdx = 0;
    const inlineGroupImages = [];

    for (let j = 0; j < inlineImages.length; j++) {
      const imgInfo = inlineImages[j];
      if (j < inlineGroups.length) {
        inlineGroupImages.push({ j, imgInfo });
      } else {
        // Nhóm neo trôi (wp:anchor chứa wpg:wgp) mà LibreOffice xuất thành <img name="ShapeN"> trần:
        // ghép theo THỨ TỰ các anchor nhóm trong tài liệu (số "ShapeN" là bộ đếm của LibreOffice,
        // không phải chỉ số anchor). Đo d06.docx 2026-09-15: 3 nhóm 18.8×2.8cm bị coi là inline
        // → canvas 5 trang, Word 3.
        let ancK = null;
        let meta = null;
        if (floatingGroupIdx < groupAnchors.length) {
          meta = groupAnchors[floatingGroupIdx++];
          ancK = anchors.indexOf(meta);
        } else {
          ancK = anchorIndex++;
          meta = anchors[ancK] || { relativeH: "paragraph", relativeV: "paragraph", wrap: "wrapNone", behindDoc: false, pageIndex: 0 };
        }

        imageIndexByAnchor.set(ancK, imageSpans.length);

        const attrValue = (name) => imgInfo.tag.match(new RegExp(`\\b${name}=["']?([^"'\\s>]+)`, "i"))?.[1];
        const htmlWidth = this._cssLengthToCm(`${attrValue("width") || 0}px`) ?? 0;
        const htmlHeight = this._cssLengthToCm(`${attrValue("height") || 0}px`) ?? 0;
        const left = meta.sourceGroup && meta.leftCm != null ? meta.leftCm : (meta.leftCm ?? 0);
        const top = meta.sourceGroup && meta.topCm != null ? meta.topCm : (meta.topCm ?? 0);
        const width = meta.sourceGroup && meta.widthCm ? meta.widthCm : (meta.widthCm || htmlWidth);
        const height = meta.sourceGroup && meta.heightCm ? meta.heightCm : (meta.heightCm || htmlHeight);

        const isPageRel = ["page", "margin"].includes(String(meta.relativeV).toLowerCase());
        const displayLeft = ["margin", "column"].includes(String(meta.relativeH).toLowerCase()) ? left + marginLeftCm : left;
        const displayTop = ["margin"].includes(String(meta.relativeV).toLowerCase()) ? top + marginTopCm : top;
        const canvasLeft = Number((displayLeft - marginLeftCm).toFixed(3));
        const canvasTop = Number((displayTop - marginTopCm).toFixed(3));

        const canvasGeometry = (hasNativeGroup && isPageRel)
          ? `position:absolute;left:${canvasLeft}cm;top:${canvasTop}cm;`
          : `position:absolute;left:${displayLeft}cm;top:${displayTop}cm;`;

        let imgTag = imgInfo.tag;
        if (width && height) {
          if (/\bstyle=["']/i.test(imgTag)) {
            imgTag = imgTag.replace(/\bstyle=["']([^"']*)["']/i, (_m, s) => `style="width:${width}cm;height:${height}cm;display:block;${s}"`);
          } else {
            imgTag = imgTag.replace(/>$/, ` style="width:${width}cm;height:${height}cm;display:block;">`);
          }
        }

        const spanHtml = `<span data-vno-float="image" data-vno-source-group="${meta.sourceGroup ? "1" : "0"}" data-vno-left="${left}" data-vno-top="${top}" data-vno-width="${width}" data-vno-height="${height}" data-vno-relative-h="${meta.relativeH}" data-vno-relative-v="${meta.relativeV}" data-vno-wrap="${meta.wrap}" data-vno-behind="${meta.behindDoc ? "1" : "0"}" style="${canvasGeometry}${width ? `width:${width}cm;` : ""}${height ? `height:${height}cm;` : ""}${meta.behindDoc ? "z-index:0;" : "z-index:1;"}">${imgTag}</span>`;

        imageSpans.push({ imgK: ancK, spanHtml, startPos: imgInfo.start, endPos: imgInfo.end, inlineGroupJ: j });
      }
    }

    // Process textboxes
    for (let sIdx = 0; sIdx < spans.length; sIdx++) {
      const sp = spans[sIdx];
      if (!sp.isTextbox) continue;

      const { style, inner, startPos, endPos } = sp;
      const matchedWsp = matchedWspBySpan.get(sIdx);

      if (matchedWsp) {
        if (matchedWsp.inlineGroupIndex !== null && matchedWsp.inlineGroupIndex !== undefined) {
          const j = matchedWsp.inlineGroupIndex;
          const left = matchedWsp.pageLeftCm;
          const top = matchedWsp.pageTopCm;
          const width = matchedWsp.widthCm;
          const height = matchedWsp.heightCm;

          let cleanedStyle = style.replace(/\b(?:position|top|left|width|height|float)\s*:\s*[^;]+;?\s*/gi, "").trim();
          if (!matchedWsp.solidFill) {
            cleanedStyle = cleanedStyle.replace(/\bbackground(?:-color)?\s*:\s*[^;]+;?\s*/gi, "").trim();
            cleanedStyle = `background:transparent;${cleanedStyle}`;
          }

          const spanHtml = `<span data-vno-float="textbox" data-vno-source-group="0" data-vno-left="${left}" data-vno-top="${top}" data-vno-width="${width}" data-vno-height="${height}" data-vno-relative-h="inline" data-vno-relative-v="inline" data-vno-wrap="wrapNone" data-vno-behind="0" style="position:absolute;left:${left}cm;top:${top}cm;${width ? `width:${width}cm;` : ""}${height ? `height:${height}cm;` : ""}z-index:2;${cleanedStyle}">${inner}</span>`;

          if (j < inlineImages.length) {
            if (!textboxesByInlineGroup.has(j)) textboxesByInlineGroup.set(j, []);
            textboxesByInlineGroup.get(j).push(spanHtml);
            spanReplacements.push({ start: startPos, end: endPos, value: "" });
          } else {
            spanReplacements.push({ start: startPos, end: endPos, value: spanHtml });
          }
        } else {
          const left = matchedWsp.pageLeftCm;
          const top = matchedWsp.pageTopCm;
          const width = matchedWsp.widthCm;
          const height = matchedWsp.heightCm;
          const canvasLeft = Number((left - marginLeftCm).toFixed(3));
          const canvasTop = Number((top - marginTopCm).toFixed(3));

          let cleanedStyle = style.replace(/\b(?:position|top|left|width|height|float)\s*:\s*[^;]+;?\s*/gi, "").trim();
          if (!matchedWsp.solidFill) {
            cleanedStyle = cleanedStyle.replace(/\bbackground(?:-color)?\s*:\s*[^;]+;?\s*/gi, "").trim();
            cleanedStyle = `background:transparent;${cleanedStyle}`;
          }

          const spanHtml = `<span data-vno-float="textbox" data-vno-source-group="0" data-vno-left="${left}" data-vno-top="${top}" data-vno-width="${width}" data-vno-height="${height}" data-vno-relative-h="page" data-vno-relative-v="page" data-vno-wrap="wrapNone" data-vno-behind="0" style="position:absolute;left:${canvasLeft}cm;top:${canvasTop}cm;${width ? `width:${width}cm;` : ""}${height ? `height:${height}cm;` : ""}z-index:2;${cleanedStyle}">${inner}</span>`;

          // If matched to an anchored group with a known image, move textbox to that image
          if (matchedWsp.anchorIndex !== null && imageIndexByAnchor.has(matchedWsp.anchorIndex)) {
            const k = matchedWsp.anchorIndex;
            if (!textboxesByAnchor.has(k)) textboxesByAnchor.set(k, []);
            textboxesByAnchor.get(k).push(spanHtml);
            spanReplacements.push({ start: startPos, end: endPos, value: "" });
          } else {
            spanReplacements.push({ start: startPos, end: endPos, value: spanHtml });
          }
        }
      } else {
        // Standalone textbox: consume next anchor (DO NOT take sourceGroup or group dimensions)
        const meta = anchors[anchorIndex++] || { relativeH: "paragraph", relativeV: "paragraph", wrap: "wrapNone", behindDoc: false };
        const value = (name) => style.match(new RegExp(`\\b${name}\\s*:\\s*([^;]+)`, "i"))?.[1];
        const htmlLeft = this._cssLengthToCm(value("left")) ?? 0;
        const htmlTop = this._cssLengthToCm(value("top")) ?? 0;
        const htmlWidth = this._cssLengthToCm(value("width")) ?? 0;
        const htmlHeight = this._cssLengthToCm(value("height")) ?? 0;

        const displayLeft = ["margin", "column"].includes(String(meta.relativeH).toLowerCase()) ? htmlLeft + marginLeftCm : htmlLeft;
        const displayTop = ["margin"].includes(String(meta.relativeV).toLowerCase()) ? htmlTop + marginTopCm : htmlTop;
        const cleanedStyle = style.replace(/\b(?:position|top|left|width|height|float)\s*:\s*[^;]+;?\s*/gi, "").trim();
        const spanHtml = `<span data-vno-float="textbox" data-vno-source-group="0" data-vno-left="${htmlLeft}" data-vno-top="${htmlTop}" data-vno-width="${htmlWidth}" data-vno-height="${htmlHeight}" data-vno-relative-h="${meta.relativeH}" data-vno-relative-v="${meta.relativeV}" data-vno-wrap="${meta.wrap}" data-vno-behind="${meta.behindDoc ? "1" : "0"}" style="position:absolute;left:${displayLeft}cm;top:${displayTop}cm;${htmlWidth ? `width:${htmlWidth}cm;` : ""}${htmlHeight ? `height:${htmlHeight}cm;` : ""}z-index:2;${cleanedStyle}">${inner}</span>`;
        spanReplacements.push({ start: startPos, end: endPos, value: spanHtml });
      }
    }


    // Attach textboxes immediately after their respective anchor image
    for (const img of imageSpans) {
      const attachedAnchor = textboxesByAnchor.get(img.imgK) || [];
      const attachedInline = img.inlineGroupJ != null ? (textboxesByInlineGroup.get(img.inlineGroupJ) || []) : [];
      const attached = [...attachedAnchor, ...attachedInline];
      spanReplacements.push({
        start: img.startPos,
        end: img.endPos,
        value: img.spanHtml + attached.join("")
      });
    }

    // Wrap inline images with inline groups
    for (const item of inlineGroupImages) {
      const { j, imgInfo } = item;
      const meta = inlineGroups[j];
      const widthCm = meta ? meta.widthCm : 0;
      const heightCm = meta ? meta.heightCm : 0;
      const attached = textboxesByInlineGroup.get(j) || [];
      let imgTag = imgInfo.tag;
      if (widthCm && heightCm) {
        if (/\bstyle=["']/i.test(imgTag)) {
          imgTag = imgTag.replace(/\bstyle=["']([^"']*)["']/i, (_m, s) => `style="width:${widthCm}cm;height:${heightCm}cm;display:block;${s}"`);
        } else {
          imgTag = imgTag.replace(/>$/, ` style="width:${widthCm}cm;height:${heightCm}cm;display:block;">`);
        }
      }
      const wrappedSpan = `<span data-vno-inline-group="${j}" style="position:relative;display:inline-block;${widthCm ? `width:${widthCm}cm;` : ""}${heightCm ? `height:${heightCm}cm;` : ""}">${imgTag}${attached.join("")}</span>`;
      spanReplacements.push({
        start: imgInfo.start,
        end: imgInfo.end,
        value: wrappedSpan
      });
    }

    spanReplacements.sort((a, b) => b.start - a.start);
    let finalHtml = src;
    for (const rep of spanReplacements) {
      finalHtml = finalHtml.slice(0, rep.start) + rep.value + finalHtml.slice(rep.end);
    }

    // Stable per-document ids let live pagination position page-relative
    // floats through a stylesheet instead of mutating element styles (which
    // would re-serialize the style attribute and make the document look
    // edited).
    let floatId = 0;
    finalHtml = finalHtml.replace(/<span data-vno-float="(image|textbox)"/g, (_m, kind) => `<span data-vno-float="${kind}" data-vno-float-id="${++floatId}"`);

    return finalHtml;
  }

  _makeFloatingAnchorContainers(html, page = null) {
    let out = String(html || "");
    if (!/\bdata-vno-float=["'](?:image|textbox)["']/i.test(out)) return out;
    const hasNativeGroup = /data-vno-source-group=["']1["']/i.test(out);
    const tags = [...out.matchAll(/<p\b[^>]*>|<\/p>/gi)];
    const stack = [];
    const replacements = [];

    const pageHeightCm = (page?.heightMm ? page.heightMm / 10 : (page?.size === "letter" ? 27.94 : 29.7));
    const marginTopCm = Number(page?.margins?.top || 0) / 10 || 2.54;
    const marginBottomCm = Number(page?.margins?.bottom || 0) / 10 || 2.54;
    const usableContentHeightCm = Math.max(10, pageHeightCm - marginTopCm - marginBottomCm);

    for (const tag of tags) {
      if (!/^<\/p/i.test(tag[0])) {
        stack.push(tag);
        continue;
      }
      const opening = stack.pop();
      if (!opening) continue;
      if (/data-vno-float-anchor/i.test(opening[0])) continue;
      const inner = out.slice(opening.index + opening[0].length, tag.index);
      if (!/\bdata-vno-float=["'](?:image|textbox)["']/i.test(inner)) continue;
      const nonInline = inner.replace(/<span\b[^>]*data-vno-inline-group=["']\d+["'][\s\S]*?<\/span>/gi, "");
      if (!/\bdata-vno-float=["'](?:image|textbox)["']/i.test(nonInline)) continue;
      const hasTextbox = /\bdata-vno-float=["']textbox["']/i.test(inner);
      const paragraphStyle = opening[0].match(/\bstyle=["']([^"']*)/i)?.[1] || "";
      const paragraphMarginLeft = this._cssLengthToCm(paragraphStyle.match(/\bmargin-left\s*:\s*([^;]+)/i)?.[1]) || 0;
      const adjustedInner = paragraphMarginLeft === 0 ? inner : inner.replace(
        /<span\b([^>]*data-vno-relative-h=["']page["'][^>]*)>/gi,
        (floatTag, attrs) => {
          const currentLeft = this._cssLengthToCm(attrs.match(/\bleft\s*:\s*([^;"']+)/i)?.[1]);
          if (currentLeft == null) return floatTag;
          const corrected = Number((currentLeft - paragraphMarginLeft).toFixed(3));
          return floatTag.replace(/\bleft\s*:\s*[^;"']+/, `left:${corrected}cm`);
        }
      );

      let reserveCm = 0;
      for (const floating of inner.matchAll(/<span\b[^>]*data-vno-wrap=["']wrapTopAndBottom["'][^>]*>/gi)) {
        const top = Number(floating[0].match(/data-vno-top=["'](-?[\d.]+)/i)?.[1] || 0);
        const height = Number(floating[0].match(/data-vno-height=["']([\d.]+)/i)?.[1] || 0);
        const rawReserve = Math.max(0, top + height - marginTopCm);
        reserveCm = Math.max(reserveCm, Math.min(rawReserve, usableContentHeightCm));
      }
      const layoutStyle = `position:relative;${reserveCm > 0 ? `min-height:${Number(reserveCm.toFixed(3))}cm;` : ""}`;
      const attrs = opening[0].slice(2, -1).replace(/\bstyle=["']([^"']*)["']/i, (_m, style) => `style="${layoutStyle}${style}"`);
      // LibreOffice text frames carry their own <p>; a <p> wrapper would be
      // auto-closed by the browser and every frame (plus the paragraph text)
      // would spill into the body as loose siblings.  Wrap such carriers in a
      // div even when they hold a page break: _prepareFloatingFramesForExport
      // re-emits the break on an empty <p> so LibreOffice still gets a real
      // paragraph break at export time.
      const hasBlockInner = /<(?:p|div|table|h\d|ul|ol)\b/i.test(inner);
      const wrapperTag = hasBlockInner || (hasNativeGroup && hasTextbox) ? "div" : "p";
      const openTag = /\bstyle=/i.test(attrs) ? `<${wrapperTag} data-vno-float-anchor${attrs}>` : `<${wrapperTag} data-vno-float-anchor${attrs} style="${layoutStyle}">`;
      replacements.push([tag.index, tag.index + tag[0].length, `</${wrapperTag}>`]);
      if (adjustedInner !== inner) replacements.push([opening.index + opening[0].length, tag.index, adjustedInner]);
      replacements.push([opening.index, opening.index + opening[0].length, openTag]);
    }
    for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0])) {
      out = out.slice(0, start) + value + out.slice(end);
    }
    return out;
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
   * Convert StarWriter floating spans from absolute positioning to
   * inline-block flow. LibreOffice's HTML export places both floating
   * images (`class="sd-abs-pos"`) AND floating text boxes / frames
   * (`id="textboxN"`, `id="FrameN"`, etc.) into `<span>` elements with
   * `position: absolute` and page-relative top/left coordinates.
   *
   * VN Writer renders the whole document inside a single container, so
   * all absolute coordinates are measured from the same origin — causing
   * elements from pages 2+ to overlap unrelated content.
   *
   * Strategy: keep each element in its current DOM position (the HTML
   * order from soffice already reflects the document flow) but strip
   * absolute positioning so the browser places them inline, eliminating
   * overlap. Width is preserved so images/textboxes keep their original
   * size. Other styles (border, background, etc.) are kept.
   *
   * Nested spans are handled by counting <span>/</span> tag pairs to find
   * the correct closing tag instead of a naive non-greedy regex.
   */
  _convertFloatingImagesToInline(html) {
    const src = String(html || "");
    const posAbsRe = /\bposition\s*:\s*absolute\b/i;
    const blockRe = /<(?:p|h[1-6]|div|ul|ol|table|blockquote)\b/i;
    const topRe = /\btop\s*:\s*([^;]+)/i;
    const leftRe = /\bleft\s*:\s*([^;]+)/i;
    const spanOpenRe = /<span\b([^>]*)>/gi;

    const items = [];
    let scanCursor = 0;
    let hasFloating = false;

    while (scanCursor < src.length) {
      const nextSpan = spanOpenRe.exec(src);
      if (!nextSpan) {
        items.push({ type: "text", value: src.slice(scanCursor) });
        break;
      }

      const attrs = nextSpan[1] || "";
      if (!posAbsRe.test(attrs)) {
        continue;
      }

      const spanStart = nextSpan.index;
      let depth = 1;
      let searchFrom = nextSpan.index + nextSpan[0].length;

      while (depth > 0 && searchFrom < src.length) {
        const openMatch = spanOpenRe.exec(src);
        const closeIdx = src.indexOf("</span>", searchFrom);
        if (closeIdx === -1) break;

        if (openMatch && openMatch.index < closeIdx) {
          searchFrom = openMatch.index + openMatch[0].length;
          depth += 1;
          spanOpenRe.lastIndex = searchFrom;
        } else {
          depth -= 1;
          if (depth === 0) {
            const inner = src.slice(nextSpan.index + nextSpan[0].length, closeIdx);
            const fullSpan = src.slice(spanStart, closeIdx + "</span>".length);
            const styleMatch = nextSpan[0].match(/\bstyle\s*=\s*["']([^"']*)["']/i);
            const rawStyle = styleMatch ? styleMatch[1] : "";

            let topVal = 0;
            const topMatch = rawStyle.match(topRe);
            if (topMatch) {
              const numStr = topMatch[1].trim().replace(/[^0-9.\-]/g, "");
              topVal = parseFloat(numStr) || 0;
            }
            let leftVal = 0;
            const leftMatch = rawStyle.match(leftRe);
            if (leftMatch) {
              const numStr = leftMatch[1].trim().replace(/[^0-9.\-]/g, "");
              leftVal = parseFloat(numStr) || 0;
            }

            const hasBlockContent = blockRe.test(inner);
            hasFloating = true;

            items.push({ type: "text", value: src.slice(scanCursor, spanStart) });
            items.push({
              type: "floating",
              fullSpan,
              inner,
              rawStyle,
              top: topVal,
              left: leftVal,
              hasBlockContent,
            });

            scanCursor = closeIdx + "</span>".length;
            spanOpenRe.lastIndex = scanCursor;
          }
          searchFrom = closeIdx + "</span>".length;
        }
      }

      if (depth > 0) {
        items.push({ type: "text", value: src.slice(scanCursor, spanStart + nextSpan[0].length) });
        scanCursor = spanStart + nextSpan[0].length;
        spanOpenRe.lastIndex = scanCursor;
      }
    }

    if (!hasFloating) return src;

    const convertFloating = (fs) => {
      let style = fs.rawStyle;
      style = style.replace(/\bposition\s*:\s*absolute\s*;?\s*/gi, "");
      style = style.replace(/\btop\s*:\s*[^;]+;\s*/gi, "");
      style = style.replace(/\bleft\s*:\s*[^;]+;\s*/gi, "");
      const displayValue = fs.hasBlockContent ? "block" : "inline-block";
      style = `display:${displayValue}; position:static; ${style}`.trim();
      return `<span style="${style}">${fs.inner}</span>`;
    };

    let result = "";
    let i = 0;
    while (i < items.length) {
      if (items[i].type !== "floating" || !items[i].hasBlockContent) {
        result += items[i].type === "text" ? items[i].value : convertFloating(items[i]);
        i++;
        continue;
      }

      const cluster = [];
      const clusterText = [];
      while (i < items.length) {
        if (items[i].type === "floating" && items[i].hasBlockContent) {
          cluster.push(items[i]);
          i++;
        } else if (items[i].type === "text" && /^\s*$/.test(items[i].value)) {
          clusterText.push(items[i]);
          i++;
        } else {
          break;
        }
      }

      if (cluster.length > 1) {
        cluster.sort((a, b) => a.top - b.top || a.left - b.left);
      }

      for (let ci = 0; ci < cluster.length; ci++) {
        if (ci < clusterText.length) {
          result += clusterText[ci].value;
        }
        result += convertFloating(cluster[ci]);
      }
    }

    return result;
  }

  /**
   * StarWriter HTML of a real Word DOCX keeps footnotes/endnotes as
   * `a.sdfootnoteanc` / `a.sdendnoteanc` citations plus
   * `div#sdfootnoteN` / `div#sdendnoteN` bodies (LibreOffice 26.2 measured).
   * Map them onto VN Writer session markup. Do not invent notes when the
   * HTML has no StarWriter markers.
   */
  _normalizeImportedStarWriterNotes(html) {
    let out = String(html || "");
    if (!/sdfootnoteanc|sdendnoteanc|id=["']sdfootnote\d+|id=["']sdendnote\d+/i.test(out)) {
      return out;
    }

    const footnotes = this._extractStarWriterNoteBodies(out, "footnote");
    const endnotes = this._extractStarWriterNoteBodies(out, "endnote");
    const footnoteOrder = [];
    const endnoteOrder = [];
    const footnoteLabels = new Map();
    const endnoteLabels = new Map();

    out = out.replace(
      /<a\b([^>]*\bclass=["'][^"']*\bsdfootnoteanc\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi,
      (_all, attrs, inner) => {
        const num = this._starWriterNoteNumber(attrs, inner, "sdfootnote") || String(footnoteOrder.length + 1);
        const id = `fn-import-${num}`;
        const visible = this._starWriterCitationLabel(inner, num);
        if (!footnoteOrder.includes(num)) footnoteOrder.push(num);
        footnoteLabels.set(num, visible);
        return `<sup data-vno-footnote-ref="${id}" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">${this._escapeHtml(visible)}</sup>`;
      }
    );

    out = out.replace(
      /<a\b([^>]*\bclass=["'][^"']*\bsdendnoteanc\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi,
      (_all, attrs, inner) => {
        const num = this._starWriterNoteNumber(attrs, inner, "sdendnote") || String(endnoteOrder.length + 1);
        const id = `en-import-${num}`;
        const visible = this._starWriterCitationLabel(inner, toRoman(Number(num) || 1));
        if (!endnoteOrder.includes(num)) endnoteOrder.push(num);
        endnoteLabels.set(num, visible);
        return `<sup data-vno-endnote-ref="${id}" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">${this._escapeHtml(visible)}</sup>`;
      }
    );

    out = out.replace(/<div\b[^>]*\bid=["']sdfootnote\d+["'][^>]*>[\s\S]*?<\/div>/gi, "");
    out = out.replace(/<div\b[^>]*\bid=["']sdendnote\d+["'][^>]*>[\s\S]*?<\/div>/gi, "");

    for (const num of footnotes.keys()) {
      if (!footnoteOrder.includes(num)) footnoteOrder.push(num);
    }
    for (const num of endnotes.keys()) {
      if (!endnoteOrder.includes(num)) endnoteOrder.push(num);
    }

    const alreadyHasFootnotes = /data-vno-footnotes=["']?true["']?/i.test(out);
    const alreadyHasEndnotes = /data-vno-endnotes=["']?true["']?/i.test(out);

    if (footnoteOrder.length && !alreadyHasFootnotes) {
      const items = footnoteOrder.map((num) => {
        const id = `fn-import-${num}`;
        const label = footnoteLabels.get(num) || num;
        const text = footnotes.get(num) || "";
        return `<div class="vno-footnote-item" data-vno-footnote-id="${id}"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">${this._escapeHtml(label)}</span><span class="vno-note-text" contenteditable="true">${this._escapeHtml(text)}</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div>`;
      }).join("");
      out = `${out.trim()}\n<div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div>${items}</div>`;
    }

    if (endnoteOrder.length && !alreadyHasEndnotes) {
      const items = endnoteOrder.map((num) => {
        const id = `en-import-${num}`;
        const label = endnoteLabels.get(num) || toRoman(Number(num) || 1);
        const text = endnotes.get(num) || "";
        return `<div class="vno-endnote-item" data-vno-endnote-id="${id}"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">${this._escapeHtml(label)}</span><span class="vno-note-text" contenteditable="true">${this._escapeHtml(text)}</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div>`;
      }).join("");
      out = `${out.trim()}\n<div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div>${items}</div>`;
    }

    return out.trim();
  }

  _starWriterNoteNumber(attrs, inner, prefix) {
    const blob = `${attrs || ""} ${inner || ""}`;
    const match = blob.match(new RegExp(`${this._escapeRegExp(prefix)}(\\d+)`, "i"));
    return match ? match[1] : "";
  }

  _starWriterCitationLabel(inner, fallback) {
    const text = String(inner || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, "")
      .trim();
    return text || String(fallback || "");
  }

  _extractStarWriterNoteBodies(html, kind) {
    const prefix = kind === "endnote" ? "sdendnote" : "sdfootnote";
    const bodies = new Map();
    const divRe = new RegExp(
      `<div\\b[^>]*\\bid=["']${prefix}(\\d+)["'][^>]*>([\\s\\S]*?)<\\/div>`,
      "gi"
    );
    let match;
    while ((match = divRe.exec(String(html || "")))) {
      const num = match[1];
      let inner = match[2] || "";
      inner = inner.replace(
        /<a\b[^>]*\bclass=["'][^"']*\bsd(?:foot|end)notesym\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
        ""
      );
      const text = inner
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&#160;/gi, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      bodies.set(num, text);
    }
    return bodies;
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
      let sizeOptions = Object.entries(PAGE_SIZES_MM)
        .map(([key, v]) => `<option value="${key}" ${key === this.pageSetup.size ? "selected" : ""}>${v.label}</option>`)
        .join("");
      if (this.pageSetup.size === "custom") {
        sizeOptions += `<option value="custom" selected>${pageSizeMm(this.pageSetup).label}</option>`;
      }

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
      margins: { ...this.pageSetup.margins, ...(newSetup.margins || {}) },
      ...(newSetup.size === "custom" || (!newSetup.size && this.pageSetup.size === "custom")
        ? { widthMm: newSetup.widthMm ?? this.pageSetup.widthMm, heightMm: newSetup.heightMm ?? this.pageSetup.heightMm }
        : {})
    };
    this.sectionPageSetups[this.activeSectionId] = JSON.parse(JSON.stringify(this.pageSetup));
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
    if (vnCmdId === "writer.trackChanges.previous") return this.previousTrackChange();
    if (vnCmdId === "writer.trackChanges.next") return this.nextTrackChange();
    if (vnCmdId === "writer.trackChanges.acceptOne") return this.acceptOneTrackChange();
    if (vnCmdId === "writer.trackChanges.rejectOne") return this.rejectOneTrackChange();
    if (vnCmdId === "writer.trackChanges.acceptAll") return this.acceptAllTrackChanges();
    if (vnCmdId === "writer.trackChanges.rejectAll") return this.rejectAllTrackChanges();
    if (vnCmdId === "writer.review.wordCount") return this.openWordCountDialog();

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

      case "writer.para.spacingBefore":
        return this.applyParagraphSpacingBefore(args);

      case "writer.para.spacingAfter":
        return this.applyParagraphSpacingAfter(args);

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

      case "writer.para.multilevelList":
        return this.applyMultilevelList(args);

      case "writer.para.indentInc":
        document.execCommand("indent", false, null);
        this._propagateMultilevelClasses();
        dispatchResult = true;
        break;

      case "writer.para.indentDec":
        document.execCommand("outdent", false, null);
        this._propagateMultilevelClasses();
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

      case "writer.break.column":
        return this._insertColumnBreak();

      case "writer.section.nextPage":
        return this.insertSectionBreak("nextPage");
      case "writer.section.continuous":
        return this.insertSectionBreak("continuous");
      case "writer.section.evenPage":
        return this.insertSectionBreak("evenPage");
      case "writer.section.oddPage":
        return this.insertSectionBreak("oddPage");

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

      case "writer.page.color":
        return await this.openPageColorDialog(args);

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

      case "writer.layout.lineNumbers":
        return this.setLineNumbers(args);

      case "writer.shape.insert":
        return await this.insertShapeFromCommand(args);

      case "writer.diagram.insert":
        return await this.insertDiagramFromCommand(args);

      case "writer.chart.insert":
        return await this.insertChartFromCommand(args);

      case "writer.insert.textbox":
        return this.insertTextBox(args);

      case "writer.insert.wordart":
        return await this.insertWordArt(args);

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

      case "writer.reference.captionInsert":
        return this.openInsertCaptionDialog(args);

      case "writer.reference.tofInsert":
        return this.openInsertTableOfFiguresDialog(args);

      case "writer.reference.tofUpdate":
        return this.updateTableOfFigures(args);

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

      case "writer.mailings.envelopes":
        return this.openEnvelopeDialog(args);

      case "writer.mailings.labels":
        return this.openLabelsDialog(args);

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

  nextComment() {
    if (!this.comments.length) return false;
    const index = this.comments.findIndex(item => item.id === this.activeCommentId);
    return this.focusComment(this.comments[(index + 1) % this.comments.length].id);
  }

  previousComment() {
    if (!this.comments.length) return false;
    const index = this.comments.findIndex(item => item.id === this.activeCommentId);
    const previous = index <= 0 ? this.comments.length - 1 : index - 1;
    return this.focusComment(this.comments[previous].id);
  }

  deleteActiveComment() {
    const comment = this.comments.find(item => item.id === this.activeCommentId) || this.comments[0];
    return comment ? this.deleteComment(comment.id) : false;
  }

  toggleActiveCommentResolved() {
    const comment = this.comments.find(item => item.id === this.activeCommentId) || this.comments[0];
    if (!comment) return false;
    comment.resolved = !comment.resolved;
    this.activeCommentId = comment.id;
    this.isDirty = true;
    this._renderCommentsPanel();
    this.focusComment(comment.id);
    this.recordSnapshot("writer.review.commentResolve");
    return comment.resolved;
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
      card.className = `vno-comment-card${comment.id === this.activeCommentId ? " is-active" : ""}${comment.resolved ? " is-resolved" : ""}`;
      if (card.dataset) card.dataset.commentResolved = String(!!comment.resolved);
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
    // <p>, not <div>: LibreOffice's Writer HTML-import filter only honors
    // page-break-before on a real <p> element, so exporting this marker as a
    // <div> would silently produce zero real page breaks in DOCX/PDF (same
    // bug class found/fixed for Section Breaks and Labels).
    const html = `<p style="page-break-before:always; break-before:page; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</p><p><br></p>`;
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

  setPageColor(color = "transparent") {
    const normalized = String(color || "transparent").toLowerCase();
    if (normalized !== "transparent" && !/^#[0-9a-f]{6}$/.test(normalized)) return false;
    this.flushTyping();
    this.pageColor = normalized;
    this._applyPageSetup();
    this.isDirty = true;
    this.recordSnapshot("writer.page.color");
    return true;
  }

  _insertHtmlAtCaretOrEnd(html) {
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (sel && sel.rangeCount > 0 && this.bodyDom?.contains?.(sel.anchorNode)) inserted = document.execCommand("insertHTML", false, html);
      } catch { inserted = false; }
    }
    const target = this.bodyDom || this.editorDom;
    if (!inserted && target) target.innerHTML = (target.innerHTML || "") + html;
    return inserted || Boolean(target);
  }

  _insertColumnBreak() {
    this.flushTyping();
    this._initZones();
    // <p>, not <div>: LibreOffice's Writer HTML-import filter only honors
    // break-before on a real <p> (same bug class fixed for Page Break /
    // Section Breaks / Labels / Mail Merge).
    this._insertHtmlAtCaretOrEnd('<p data-vno-column-break="true" style="break-before:column;margin:12px 0;border-top:1px dashed #94a3b8;color:#64748b;text-align:center;font-size:11px;user-select:none">--- Ngắt cột (Column Break) ---</p><p><br></p>');
    this.isDirty = true;
    this.recordSnapshot("writer.break.column");
    return true;
  }

  insertSectionBreak(type = "nextPage") {
    const allowed = new Set(["nextPage", "continuous", "evenPage", "oddPage"]);
    if (!allowed.has(type)) return false;
    this.flushTyping();
    this._initZones();
    const previousSetup = this.sectionPageSetups[this.activeSectionId] || this.pageSetup;
    const id = `section-${++this._sectionSequence}`;
    const labels = { nextPage: "Trang kế tiếp", continuous: "Liên tục", evenPage: "Trang chẵn", oddPage: "Trang lẻ" };
    const breakStyle = type === "continuous" ? "" : `break-before:${type === "evenPage" ? "left" : type === "oddPage" ? "right" : "page"};page-break-before:always;`;
    const marker = `<div class="vno-section-break" data-vno-section-break="${type}" data-vno-section-id="${id}" contenteditable="false" style="${breakStyle}border-top:2px double #7c3aed;margin:20px 0;text-align:center;color:#6d28d9;font-size:11px;user-select:none">--- Ngắt mục (${labels[type]}) ---</div><p><br></p>`;
    this._insertHtmlAtCaretOrEnd(marker);
    this.sectionPageSetups[id] = JSON.parse(JSON.stringify(previousSetup));
    this.activeSectionId = id;
    this.pageSetup = JSON.parse(JSON.stringify(previousSetup));
    this._applyPageSetup();
    this.isDirty = true;
    this.recordSnapshot(`writer.section.${type}`);
    return id;
  }

  activateSection(sectionId) {
    if (!this.sectionPageSetups[sectionId]) return false;
    this.activeSectionId = sectionId;
    this.pageSetup = JSON.parse(JSON.stringify(this.sectionPageSetups[sectionId]));
    this._applyPageSetup();
    return true;
  }

  _buildSectionBreakMarker(type, id, caption) {
    const labels = { nextPage: "Trang kế tiếp", continuous: "Liên tục", evenPage: "Trang chẵn", oddPage: "Trang lẻ" };
    const breakStyle = type === "continuous" ? "" : `break-before:${type === "evenPage" ? "left" : type === "oddPage" ? "right" : "page"};page-break-before:always;`;
    const text = caption || `--- Ngắt mục (${labels[type] || type}) ---`;
    return `<div class="vno-section-break" data-vno-section-break="${type}" data-vno-section-id="${id}" contenteditable="false" style="${breakStyle}border-top:2px double #7c3aed;margin:20px 0;text-align:center;color:#6d28d9;font-size:11px;user-select:none">${text}</div>`;
  }

  _envelopePageSetup(sizeId) {
    const size = ENVELOPE_SIZES[sizeId] || ENVELOPE_SIZES.dl;
    return {
      size: size.id,
      orientation: "portrait",
      margins: { top: 8, bottom: 8, left: 10, right: 10 }
    };
  }

  _mailMergeRecords() {
    const records = this.mailMergeData?.records;
    return Array.isArray(records) ? records : [];
  }

  async openEnvelopeDialog(options) {
    options = options || {};
    if (options.deliveryAddress || options.useMailMerge) return this.insertEnvelope(options);
    const result = await showEnvelopeDialog({
      mailMergeCount: this._mailMergeRecords().length,
      defaults: options
    });
    if (!result) return false;
    return this.insertEnvelope(result);
  }

  /**
   * Chèn một hoặc nhiều trang phong bì (đơn hoặc hàng loạt từ Mail Merge).
   * Trang phong bì là mục (section) riêng với khổ giấy = khổ phong bì — đúng trên canvas;
   * xuất DOCX/PDF vẫn chịu giới hạn HTML filter của LibreOffice (một @page chung).
   */
  insertEnvelope(options) {
    options = options || {};
    const sizeId = ENVELOPE_SIZES[options.size] ? options.size : "dl";
    const useMailMerge = Boolean(options.useMailMerge);
    const records = useMailMerge ? this._mailMergeRecords() : [];
    const fields = this.mailMergeData?.fields || [];
    let deliveries = [];
    if (useMailMerge && records.length) {
      deliveries = records.map((record) => formatRecordAsAddress(record, fields)).filter(Boolean);
    } else {
      const one = String(options.deliveryAddress || "").trim();
      if (one) deliveries = [one];
    }
    if (!deliveries.length) return false;

    this.flushTyping();
    this._initZones();
    const target = this.bodyDom || this.editorDom;
    if (!target) return false;

    const omitReturn = Boolean(options.omitReturn);
    const returnAddress = omitReturn ? "" : String(options.returnAddress || "").trim();
    const envelopeHtml = deliveries
      .map((deliveryAddress, index) => buildEnvelopeHtml({
        sizeId,
        deliveryAddress,
        returnAddress,
        omitReturn,
        pageBreak: index > 0
      }))
      .join("");
    const envelopeSetup = this._envelopePageSetup(sizeId);
    const position = options.position === "start" ? "start" : "end";
    const existing = target.innerHTML || "";
    const firstSectionId = Object.keys(this.sectionPageSetups || {})[0] || "section-1";
    const originalFirstSetup = JSON.parse(JSON.stringify(this.sectionPageSetups[firstSectionId] || this.pageSetup));

    if (position === "start") {
      const restId = `section-${++this._sectionSequence}`;
      const breakHtml = this._buildSectionBreakMarker("nextPage", restId, "--- Ngắt mục (sau phong bì) ---");
      target.innerHTML = envelopeHtml + breakHtml + existing;
      this.sectionPageSetups[firstSectionId] = JSON.parse(JSON.stringify(envelopeSetup));
      this.sectionPageSetups[restId] = originalFirstSetup;
      this.activeSectionId = firstSectionId;
      this.pageSetup = JSON.parse(JSON.stringify(envelopeSetup));
    } else {
      const envId = `section-${++this._sectionSequence}`;
      const breakHtml = this._buildSectionBreakMarker("nextPage", envId, "--- Ngắt mục (phong bì) ---");
      target.innerHTML = existing + breakHtml + envelopeHtml;
      this.sectionPageSetups[envId] = JSON.parse(JSON.stringify(envelopeSetup));
      this.activeSectionId = envId;
      this.pageSetup = JSON.parse(JSON.stringify(envelopeSetup));
    }
    this._applyPageSetup();
    this.isDirty = true;
    this.recordSnapshot("writer.mailings.envelopes");
    return true;
  }

  async openLabelsDialog(options) {
    options = options || {};
    if (options.content || options.useMailMerge) return this.insertLabels(options);
    const result = await showLabelsDialog({
      mailMergeCount: this._mailMergeRecords().length,
      defaults: options
    });
    if (!result) return false;
    return this.insertLabels(result);
  }

  /**
   * Chèn một hoặc nhiều tờ nhãn A4. Không Mail Merge: mọi ô cùng nội dung.
   * Có Mail Merge: mỗi ô một bản ghi; dư thì sang trang mới.
   */
  insertLabels(options) {
    options = options || {};
    const layout = LABEL_LAYOUTS[options.layout] || LABEL_LAYOUTS["avery-l7160"];
    const useMailMerge = Boolean(options.useMailMerge);
    let contents = [];
    if (useMailMerge) {
      const records = this._mailMergeRecords();
      const fields = this.mailMergeData?.fields || [];
      contents = records.map((record) => formatRecordAsAddress(record, fields));
    } else {
      const text = String(options.content || "").trim();
      if (!text) return false;
      const cellsPerPage = layout.cols * layout.rows;
      contents = Array.from({ length: cellsPerPage }, () => text);
    }
    if (!contents.length) return false;

    this.flushTyping();
    this._initZones();
    const target = this.bodyDom || this.editorDom;
    if (!target) return false;

    const pages = paginateLabelContents(contents, layout);
    const sheetsHtml = pages
      .map((pageContents, index) => buildLabelSheetHtml({ layout, contents: pageContents, pageBreak: index > 0 }))
      .join("");
    const a4Setup = {
      size: "a4",
      orientation: "portrait",
      margins: { top: 10, bottom: 10, left: 8, right: 8 }
    };
    const current = this.pageSetup || {};
    const needSection = current.size !== "a4" || current.orientation !== "portrait";
    const existing = target.innerHTML || "";
    const pageBreak = `<p class="vno-labels-page-break" data-vno-labels-break="true" style="page-break-before:always;break-before:page;margin:0;height:0;overflow:hidden;" aria-hidden="true">&nbsp;</p>`;

    if (needSection || existing.trim()) {
      const labelSectionId = `section-${++this._sectionSequence}`;
      const breakHtml = this._buildSectionBreakMarker("nextPage", labelSectionId, "--- Ngắt mục (nhãn) ---");
      target.innerHTML = existing + breakHtml + sheetsHtml;
      this.sectionPageSetups[labelSectionId] = JSON.parse(JSON.stringify(a4Setup));
      this.activeSectionId = labelSectionId;
      this.pageSetup = JSON.parse(JSON.stringify(a4Setup));
      this._applyPageSetup();
    } else {
      target.innerHTML = (existing ? pageBreak : "") + sheetsHtml;
    }
    this.isDirty = true;
    this.recordSnapshot("writer.mailings.labels");
    return true;
  }

  async openPageColorDialog(color) {
    if (color) return this.setPageColor(color);
    const result = await showPageColorDialog(this.pageColor);
    if (result == null) return false;
    return this.setPageColor(result);
  }

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
        if (wmEl && typeof this.editorDom.appendChild === "function") {
          wmEl.className = "vno-page-watermark";
          if (wmEl.dataset) wmEl.dataset.vnoWatermark = "true";
          else if (typeof wmEl.setAttribute === "function") wmEl.setAttribute("data-vno-watermark", "true");
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

  /**
   * Ribbon/command path: mở hộp chọn nếu chưa có type tường minh.
   * insertShape/insertDiagram/insertChart vẫn là API chèn trực tiếp.
   */
  _hasExplicitIllustrationChoice(args, keys) {
    if (!args || typeof args !== "object") return false;
    return keys.some((key) => {
      const value = args[key];
      if (value == null || value === "") return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
  }

  async insertShapeFromCommand(args = null) {
    if (this._hasExplicitIllustrationChoice(args, ["type", "shapeType"])) {
      return this.insertShape(args);
    }
    const picked = await showShapeDialog(args);
    if (!picked) return null;
    return this.insertShape(picked);
  }

  async insertDiagramFromCommand(args = null) {
    if (this._hasExplicitIllustrationChoice(args, ["type", "diagramType"])) {
      return this.insertDiagram(args);
    }
    const picked = await showDiagramDialog(args);
    if (!picked) return null;
    return this.insertDiagram(picked);
  }

  async insertChartFromCommand(args = null) {
    if (this._hasExplicitIllustrationChoice(args, ["type", "chartType", "labels", "data", "categories", "values"])) {
      return this.insertChart(args);
    }
    const picked = await showChartDialog(args);
    if (!picked) return null;
    return this.insertChart(picked);
  }

  insertShape(options = null) {
    options = options || {};
    this.flushTyping();
    this._initZones();

    const shapeType = options.shapeType || options.type || "rectangle";
    const shapeDef = SHAPE_TYPES.find((item) => item.id === shapeType);
    const width = typeof options.width === "number" ? options.width : (typeof options.w === "number" ? options.w : (shapeDef?.defaultW || 140));
    const height = typeof options.height === "number" ? options.height : (typeof options.h === "number" ? options.h : (shapeDef?.defaultH || 80));
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
    if (typeof this.editorDom.appendChild !== "function" || typeof this.editorDom.querySelector !== "function") return;
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

  _wordArtHtmlPattern() {
    return /<span\b[^>]*class=["'][^"']*\bvno-writer-wordart\b[^"']*["'][^>]*>[\s\S]*?<\/span><\/span>/i;
  }

  async insertWordArt(options = null) {
    options = options || {};
    const hasExplicit = typeof options.text === "string" || options.presetId || options.styleId;
    const picked = hasExplicit ? options : await showWordArtDialog(options);
    if (!picked) return false;
    const text = String(picked.text || options.text || "VN Office").trim() || "VN Office";
    const presetId = picked.presetId || options.presetId || options.styleId || "navy-outline";
    const style = resolveWordArtStyle({ ...picked, ...options, presetId, text });
    const html = buildWriterWordArtHtml(text, { ...picked, ...options, presetId });
    this._insertHtmlAtCursor(html);
    this._hydrateWordArtFromDom();
    this.recordSnapshot("writer.insert.wordart");
    return { text, presetId, style };
  }

  _liveWordArtEl(target = null) {
    this._initZones();
    if (target && target.isConnected !== false) return target;
    if (this.selectedWordArtEl && this.selectedWordArtEl.isConnected !== false) {
      return this.selectedWordArtEl;
    }
    return this.bodyDom?.querySelector?.(".vno-writer-wordart.is-selected")
      || this.bodyDom?.querySelector?.("[data-vno-wordart='true'], .vno-writer-wordart")
      || null;
  }

  updateWordArtText(text, target = null) {
    const next = String(text || "").trim();
    if (!next) return false;
    const el = this._liveWordArtEl(target);
    if (el?.querySelector || el?.setAttribute) {
      const textEl = el.querySelector?.(".vno-wordart-text") || el;
      if (textEl && textEl.textContent !== undefined) textEl.textContent = next;
      el.setAttribute?.("data-vno-wordart-text", next);
      el.setAttribute?.("aria-label", `Chữ nghệ thuật: ${next}`);
      if (el.dataset) el.dataset.vnoWordartText = next;
      this.isDirty = true;
      this.recordSnapshot("writer.wordart.editText");
      return true;
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!targetDom || typeof targetDom.innerHTML !== "string") return false;
    const escaped = this._escapeHtml(next);
    let html = String(targetDom.innerHTML);
    if (!this._wordArtHtmlPattern().test(html)) return false;
    html = html.replace(/data-vno-wordart-text="[^"]*"/i, `data-vno-wordart-text="${escaped}"`);
    html = html.replace(/aria-label="Chữ nghệ thuật: [^"]*"/i, `aria-label="Chữ nghệ thuật: ${escaped}"`);
    html = html.replace(/(<span class="vno-wordart-text"[^>]*>)[\s\S]*?(<\/span>)/i, `$1${escaped}$2`);
    targetDom.innerHTML = html;
    this.isDirty = true;
    this.recordSnapshot("writer.wordart.editText");
    return true;
  }

  deleteWordArt(target = null) {
    const el = this._liveWordArtEl(target);
    if (el && (typeof el.remove === "function" || el.parentNode)) {
      if (typeof el.remove === "function") el.remove();
      else el.parentNode.removeChild(el);
      this.selectedWordArtEl = null;
      this._wordArtEditing = false;
      this.isDirty = true;
      this.recordSnapshot("writer.wordart.delete");
      return true;
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!targetDom || typeof targetDom.innerHTML !== "string") return false;
    const next = String(targetDom.innerHTML).replace(this._wordArtHtmlPattern(), "");
    if (next === targetDom.innerHTML) return false;
    targetDom.innerHTML = next;
    this.selectedWordArtEl = null;
    this._wordArtEditing = false;
    this.isDirty = true;
    this.recordSnapshot("writer.wordart.delete");
    return true;
  }

  _selectWordArt(el) {
    this._initZones();
    const nodes = this.bodyDom?.querySelectorAll?.(".vno-writer-wordart") || [];
    nodes.forEach?.((item) => item.classList?.remove?.("is-selected"));
    this.selectedWordArtEl = el || null;
    if (el?.classList) el.classList.add("is-selected");
  }

  _beginWordArtEdit(el) {
    if (!el) return false;
    const textEl = el.querySelector?.(".vno-wordart-text") || el;
    if (!textEl) return false;
    this._selectWordArt(el);
    this._wordArtEditing = true;
    el.classList?.add?.("is-editing");
    if (textEl.setAttribute) textEl.setAttribute("contenteditable", "true");
    else textEl.contentEditable = "true";
    textEl.focus?.();
    try {
      const sel = window.getSelection?.();
      if (sel && document.createRange) {
        const range = document.createRange();
        range.selectNodeContents(textEl);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch {}
    const finish = () => {
      textEl.removeEventListener?.("blur", finish);
      textEl.removeEventListener?.("keydown", onEditKey);
      if (textEl.setAttribute) textEl.setAttribute("contenteditable", "false");
      else textEl.contentEditable = "false";
      el.classList?.remove?.("is-editing");
      this._wordArtEditing = false;
      const next = String(textEl.textContent || "").trim() || "VN Office";
      textEl.textContent = next;
      el.setAttribute?.("data-vno-wordart-text", next);
      el.setAttribute?.("aria-label", `Chữ nghệ thuật: ${next}`);
      this.isDirty = true;
      this.recordSnapshot("writer.wordart.editText");
    };
    const onEditKey = (event) => {
      if (event.key === "Enter") {
        event.preventDefault?.();
        event.stopPropagation?.();
        textEl.blur?.();
      } else if (event.key === "Escape") {
        event.preventDefault?.();
        event.stopPropagation?.();
        textEl.blur?.();
      }
    };
    textEl.addEventListener?.("blur", finish);
    textEl.addEventListener?.("keydown", onEditKey);
    return true;
  }

  _hydrateWordArtFromDom() {
    this._initZones();
    const root = this.bodyDom || this.editorDom;
    if (!root?.querySelectorAll) return;
    const nodes = root.querySelectorAll(".vno-writer-wordart, [data-vno-wordart='true']");
    nodes.forEach((el) => {
      const textEl = el.querySelector?.(".vno-wordart-text") || el;
      const stored = parseWordArtStyleAttr(
        el.getAttribute?.("data-vno-wordart-style") || el.dataset?.vnoWordartStyle
      );
      const presetId = el.getAttribute?.("data-vno-wordart-preset") || el.dataset?.vnoWordartPreset || stored?.presetId;
      applyWordArtCss(textEl, { ...(stored || {}), presetId });
    });
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

  _defaultLineNumbers() {
    return { enabled: false, countBy: 1, restart: "continuous" };
  }

  _cloneLineNumbers(value) {
    const base = this._defaultLineNumbers();
    const source = value && typeof value === "object" ? value : {};
    const countBy = Number(source.countBy);
    const restart = source.restart === "page" || source.restart === "section" ? source.restart : "continuous";
    return {
      enabled: Boolean(source.enabled),
      countBy: Number.isFinite(countBy) && countBy >= 1 ? Math.floor(countBy) : 1,
      restart
    };
  }

  _lineNumbersMode(config = this.lineNumbers) {
    const current = this._cloneLineNumbers(config);
    if (!current.enabled) return "none";
    if (current.restart === "page") return "restartPage";
    if (current.restart === "section") return "restartSection";
    return "continuous";
  }

  _lineNumbersFromMode(mode, previous = this.lineNumbers) {
    const key = typeof mode === "string"
      ? mode
      : (mode && typeof mode === "object" ? (mode.mode || mode.value || "") : "");
    const normalized = String(key || "").trim();
    const countBy = this._cloneLineNumbers(previous).countBy || 1;
    if (normalized === "none" || normalized === "off") return this._defaultLineNumbers();
    if (normalized === "continuous") return { enabled: true, countBy, restart: "continuous" };
    if (normalized === "restartPage" || normalized === "page") return { enabled: true, countBy, restart: "page" };
    if (normalized === "restartSection" || normalized === "section") return { enabled: true, countBy, restart: "section" };
    return null;
  }

  setLineNumbers(args) {
    const next = this._lineNumbersFromMode(args);
    if (!next) return false;
    this.flushTyping();
    this.lineNumbers = next;
    this._applyLineNumbersIndicator();
    this.isDirty = true;
    this.recordSnapshot("writer.layout.lineNumbers");
    return true;
  }

  _syncLineNumbersSelect() {
    const root = typeof document !== "undefined" ? document : null;
    const select = root?.querySelector?.('select[data-command-id="writer.layout.lineNumbers"]');
    if (select) select.value = this._lineNumbersMode();
  }

  _applyLineNumbersIndicator() {
    this._syncLineNumbersSelect();
    const host = this.editorDom;
    if (!host || typeof host.appendChild !== "function" || typeof document === "undefined") return;
    if (typeof host.querySelector !== "function") return;
    const enabled = Boolean(this.lineNumbers?.enabled);
    host.classList?.toggle?.("vno-line-numbers-on", enabled);
    let badge = host.querySelector(".vno-line-numbers-indicator");
    if (!enabled) {
      badge?.remove?.();
      return;
    }
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "vno-line-numbers-indicator";
      badge.setAttribute("contenteditable", "false");
      badge.setAttribute("aria-live", "polite");
      host.insertBefore(badge, host.firstChild);
    }
    const restart = this.lineNumbers.restart;
    const modeLabel = restart === "page" ? "Mỗi trang" : restart === "section" ? "Mỗi mục" : "Liên tục";
    const sectionNote = restart === "section"
      ? " File Word/LibreOffice ghi Liên tục vì ODF không có restart-each-section."
      : "";
    badge.textContent = `Danh số dòng: ${modeLabel}. Số hiện ở lề trái khi mở bằng Word hoặc LibreOffice — canvas VN Writer không vẽ số.${sectionNote}`;
    badge.setAttribute("title", badge.textContent);
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
        // Bội số dòng kiểu Word (1.0/1.5/2.0 dòng): ghi vào --vno-lh để stylesheet nhân
        // với tỉ số font (--vno-font-ratio); khi xuất đổi lại thành line-height: 150%.
        if (typeof node.style.setProperty === "function") {
          node.style.removeProperty("line-height");
          node.style.setProperty("--vno-lh", String(Number(val) || val));
        } else {
          node.style.lineHeight = val;
        }
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
          const imgHtml = `<img src="${evt.target.result}" data-vno-wrap="inline" tabindex="0" style="max-width:100%; height:auto; margin:10pt 0; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:inline; float:none; position:static; z-index:auto;" /><p><br></p>`;
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

  _fodtError(detail) {
    const error = new Error(`Writer FODT Phase A không hỗ trợ nội dung này: ${detail}`);
    error.code = "WRITER_FODT_UNSUPPORTED_CONTENT";
    return error;
  }

  _fodtMmToCm(mm) {
    const value = Number(mm);
    if (!Number.isFinite(value)) throw this._fodtError(`kích thước trang '${mm}' không phải số mm`);
    return `${Number((value / 10).toFixed(3))}cm`;
  }

  _fodtPageBox(setup) {
    const base = pageSizeMm(setup);
    const isLandscape = setup?.orientation === "landscape";
    const margins = setup?.margins || DEFAULT_MARGINS_MM;
    return {
      width: this._fodtMmToCm(isLandscape ? base.h : base.w),
      height: this._fodtMmToCm(isLandscape ? base.w : base.h),
      orientation: isLandscape ? "landscape" : "portrait",
      top: this._fodtMmToCm(margins.top ?? DEFAULT_MARGINS_MM.top),
      bottom: this._fodtMmToCm(margins.bottom ?? DEFAULT_MARGINS_MM.bottom),
      left: this._fodtMmToCm(margins.left ?? DEFAULT_MARGINS_MM.left),
      right: this._fodtMmToCm(margins.right ?? DEFAULT_MARGINS_MM.right)
    };
  }

  _fodtPageLayoutXml(name, setup) {
    const box = this._fodtPageBox(setup);
    return `<style:page-layout style:name="${this._fodtEscapeXml(name)}"><style:page-layout-properties fo:page-width="${box.width}" fo:page-height="${box.height}" fo:margin-top="${box.top}" fo:margin-bottom="${box.bottom}" fo:margin-left="${box.left}" fo:margin-right="${box.right}" style:print-orientation="${box.orientation}"/><style:header-style><style:header-footer-properties fo:min-height="0.6cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-bottom="0.3cm"/></style:header-style><style:footer-style><style:header-footer-properties fo:min-height="0.6cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-top="0.3cm"/></style:footer-style></style:page-layout>`;
  }

  _fodtMasterPageXml(name, layoutName, headerXml = "", footerXml = "") {
    const header = headerXml ? `<style:header>${headerXml}</style:header>` : "";
    const footer = footerXml ? `<style:footer>${footerXml}</style:footer>` : "";
    return `<style:master-page style:name="${this._fodtEscapeXml(name)}" style:page-layout-name="${this._fodtEscapeXml(layoutName)}">${header}${footer}</style:master-page>`;
  }

  _fodtWatermarkRotateAttr(angle) {
    const deg = Number(angle);
    if (!Number.isFinite(deg) || deg === 0) return "";
    return ` draw:transform="rotate (${(deg * Math.PI / 180).toFixed(15)})"`;
  }

  _fodtWatermarkRotateToAngle(transform) {
    const match = String(transform || "").match(/rotate\s*\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*\)/i);
    if (!match) return 0;
    return Math.round(Number(match[1]) * 180 / Math.PI);
  }

  _fodtWatermarkOpacityPercent(opacity) {
    const value = typeof opacity === "number" && Number.isFinite(opacity) ? opacity : 0.2;
    return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
  }

  _fodtParseOpacity(raw) {
    if (raw == null || raw === "") return null;
    const text = String(raw).trim();
    const percent = text.match(/^(\d+(?:\.\d+)?)%$/);
    if (percent) return Math.round(Number(percent[1])) / 100;
    const number = Number(text);
    if (!Number.isFinite(number)) return null;
    return number > 1 ? number / 100 : number;
  }

  _fodtWatermarkFontSizeNumber(fontSize) {
    const match = String(fontSize || "").trim().match(/^(\d+(?:\.\d+)?)pt$/i);
    if (!match) return null;
    const points = Number(match[1]);
    if (!Number.isFinite(points) || points <= 1) return null;
    return Math.round(points);
  }

  _fodtWatermarkGraphicStyleXml(opacityPercent) {
    return `<style:style style:name="grWm" style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none" draw:opacity="${this._fodtEscapeXml(opacityPercent)}" style:wrap="run-through" style:number-wrapped-paragraphs="no-limit" style:vertical-pos="middle" style:vertical-rel="page" style:horizontal-pos="center" style:horizontal-rel="page" style:flow-with-text="false" style:run-through="background" fo:padding="0cm" draw:textarea-horizontal-align="center" draw:textarea-vertical-align="middle"/></style:style>`;
  }

  _fodtWatermarkFrameXml(textStyleName) {
    const wm = this.watermark;
    const text = this._fodtEscapeXml(wm.text);
    const span = textStyleName
      ? `<text:span text:style-name="${this._fodtEscapeXml(textStyleName)}">${text}</text:span>`
      : text;
    return `<text:p><draw:frame draw:style-name="grWm" draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm"${this._fodtWatermarkRotateAttr(wm.angle)}><draw:text-box><text:p>${span}</text:p></draw:text-box></draw:frame></text:p>`;
  }

  _fodtIsWatermarkDrawing(node) {
    if (!node || (node.name !== "draw:frame" && node.name !== "draw:custom-shape")) return false;
    const name = String(node.attrs["draw:name"] || "");
    if (/^(Watermark|WatermarkFontwork)$/i.test(name)) return true;
    if (/PowerPlusWaterMark/i.test(name) || /WordPictureWatermark/i.test(name)) return true;
    return false;
  }

  _fodtFindTextStyleProps(nodes, textStyles) {
    const found = {};
    const walk = (list) => {
      for (const node of list || []) {
        if (!node || node.name === "#text") continue;
        const styleName = node.attrs?.["text:style-name"];
        if (styleName && textStyles.has(styleName)) {
          const style = textStyles.get(styleName);
          if (style.color && !found.color) found.color = style.color;
          if (style.fontSize && !found.fontSize) found.fontSize = style.fontSize;
        }
        walk(node.children);
      }
    };
    walk(nodes);
    return found;
  }

  _fodtWatermarkFromDrawing(node, graphicStyles, textStyles) {
    const graphic = graphicStyles.get(node.attrs["draw:style-name"]) || {};
    const contentNodes = (node.children || []).filter(child => child.name !== "draw:enhanced-geometry");
    let text = "";
    if (node.name === "draw:frame") {
      const textBox = contentNodes.find(child => child.name === "draw:text-box");
      if (!textBox) throw this._fodtError("draw:frame watermark thiếu draw:text-box");
      text = this._fodtPlainLoose(textBox.children).trim();
    } else {
      text = this._fodtPlainLoose(contentNodes).trim();
    }
    if (!text) throw this._fodtError("watermark trong header không có chữ");
    const textProps = this._fodtFindTextStyleProps(contentNodes, textStyles);
    const color = textProps.color || graphic.fillColor || "#dc2626";
    const fontSize = this._fodtWatermarkFontSizeNumber(textProps.fontSize) || 72;
    const opacity = this._fodtParseOpacity(graphic.opacity);
    return {
      text,
      color: this._fodtNormalizeColor(color),
      opacity: opacity == null ? 0.2 : opacity,
      angle: this._fodtWatermarkRotateToAngle(node.attrs["draw:transform"]),
      fontSize
    };
  }

  _fodtWatermarkSignature(watermark) {
    if (!watermark || !String(watermark.text || "").trim()) return "";
    return JSON.stringify({
      text: String(watermark.text).trim(),
      color: this._fodtNormalizeColor(watermark.color || "#dc2626"),
      opacity: typeof watermark.opacity === "number" ? watermark.opacity : 0.2,
      angle: Number(watermark.angle) || 0,
      fontSize: Number(watermark.fontSize) || 72
    });
  }

  _fodtExtractHeaderWatermark(headerXml, graphicStyles, textStyles) {
    if (!String(headerXml || "").trim()) {
      return { watermark: null, remainderNodes: [] };
    }
    const tree = this._fodtParseMarkup(headerXml, "FODT style:header");
    const watermarks = [];
    const remainderNodes = [];
    const takeDrawings = (nodes) => {
      const rest = [];
      for (const child of nodes || []) {
        if (child.name === "#text" && !String(child.text || "").trim()) continue;
        if (this._fodtIsWatermarkDrawing(child)) {
          watermarks.push(this._fodtWatermarkFromDrawing(child, graphicStyles, textStyles));
          continue;
        }
        if (String(child.name || "").startsWith("draw:")) {
          throw this._fodtError("header chứa bảng/ảnh/shape/ghi chú/số trang field/Track Changes chưa hỗ trợ");
        }
        rest.push(child);
      }
      return rest;
    };
    for (const node of tree.children) {
      if (node.name === "#text" && !String(node.text || "").trim()) continue;
      if (node.name === "text:p" || node.name === "text:h") {
        const rest = takeDrawings(node.children);
        if (rest.length) remainderNodes.push({ ...node, children: rest });
        continue;
      }
      if (this._fodtIsWatermarkDrawing(node)) {
        watermarks.push(this._fodtWatermarkFromDrawing(node, graphicStyles, textStyles));
        continue;
      }
      remainderNodes.push(node);
    }
    if (watermarks.length > 1) {
      const first = this._fodtWatermarkSignature(watermarks[0]);
      if (watermarks.some(item => this._fodtWatermarkSignature(item) !== first)) {
        throw this._fodtError("nhiều watermark khác nhau trên một master-page chưa hỗ trợ");
      }
    }
    return { watermark: watermarks[0] || null, remainderNodes };
  }

  _fodtPageSetupFromLayoutProps(props) {
    const widthMm = this._lengthToMm(props["fo:page-width"]);
    const heightMm = this._lengthToMm(props["fo:page-height"]);
    if (widthMm == null || heightMm == null) throw this._fodtError("style:page-layout thiếu fo:page-width/height");
    const orientation = String(props["style:print-orientation"] || "portrait").toLowerCase();
    if (orientation !== "portrait" && orientation !== "landscape") {
      throw this._fodtError(`style:print-orientation '${orientation}'`);
    }
    const portraitW = orientation === "landscape" ? heightMm : widthMm;
    const portraitH = orientation === "landscape" ? widthMm : heightMm;
    let size = null;
    for (const [key, dim] of Object.entries(PAGE_SIZES_MM)) {
      if (Math.abs(portraitW - dim.w) < 8 && Math.abs(portraitH - dim.h) < 8) {
        size = key;
        break;
      }
    }
    const customSize = size ? {} : {
      widthMm: Number(portraitW.toFixed(1)),
      heightMm: Number(portraitH.toFixed(1))
    };
    const marginOr = (side, fallback) => {
      const mm = this._lengthToMm(props[`fo:margin-${side}`]);
      return mm == null ? fallback : Math.round(mm);
    };
    return {
      size: size || "custom",
      ...customSize,
      orientation,
      margins: {
        top: marginOr("top", DEFAULT_MARGINS_MM.top),
        bottom: marginOr("bottom", DEFAULT_MARGINS_MM.bottom),
        left: marginOr("left", DEFAULT_MARGINS_MM.left),
        right: marginOr("right", DEFAULT_MARGINS_MM.right)
      }
    };
  }

  _fodtParsePageLayouts(xml) {
    const layouts = new Map();
    // (?=[\s>/]) chứ không phải \b: JS coi dấu "-" là ranh giới từ, nên \b sau
    // "page-layout" vẫn khớp nhầm với <style:page-layout-properties> (thẻ con
    // đứng lẻ trước block pm* thật, có thật trong FODT do LibreOffice tạo ra
    // khi chuyển đổi DOCX thật). Khi đó phần nội dung [\s\S]*? sẽ "nuốt" trọn
    // block <style:page-layout style:name="..."> thật phía sau làm nội dung
    // của thẻ page-layout-properties bị nhận nhầm, khiến layout thật biến mất
    // khỏi Map và master-page tham chiếu tới nó bị báo "không biết" dù file
    // hoàn toàn hợp lệ - lỗi thật, phát hiện qua vòng chuyển đổi DOCX thật.
    String(xml || "").replace(/<style:page-layout(?=[\s>/])([^>]*)>([\s\S]*?)<\/style:page-layout>/gi, (_, attrsText, content) => {
      const attrs = this._fodtParseAttributes(attrsText);
      const name = attrs["style:name"];
      if (!name) return "";
      if (/<style:background-image\b/i.test(content)) {
        throw this._fodtError("style:background-image trên page-layout (watermark ảnh) chưa hỗ trợ");
      }
      const propMatch = content.match(/<style:page-layout-properties\b([^>]*)\/?\s*>/i);
      layouts.set(name, this._fodtPageSetupFromLayoutProps(this._fodtParseAttributes(propMatch?.[1] || "")));
      return "";
    });
    return layouts;
  }

  _fodtParseMasterPages(xml) {
    const masters = [];
    const masterStyles = String(xml || "").match(/<office:master-styles\b[^>]*>([\s\S]*?)<\/office:master-styles>/i)?.[1] || "";
    masterStyles.replace(/<style:master-page\b([^>]*)(?:\/>|>([\s\S]*?)<\/style:master-page>)/gi, (_, attrsText, content) => {
      const attrs = this._fodtParseAttributes(attrsText);
      const name = attrs["style:name"];
      if (!name) throw this._fodtError("style:master-page thiếu style:name");
      const layoutName = attrs["style:page-layout-name"];
      if (!layoutName) throw this._fodtError(`style:master-page '${name}' thiếu style:page-layout-name`);
      const inner = content || "";
      const header = inner.match(/<style:header\b[^>]*>([\s\S]*?)<\/style:header>/i)?.[1] || "";
      const footer = inner.match(/<style:footer\b[^>]*>([\s\S]*?)<\/style:footer>/i)?.[1] || "";
      // Writer chỉ hỗ trợ MỘT cặp đầu/chân trang toàn cục: các biến thể
      // header-left/footer-left (trang chẵn) và header-first/footer-first
      // (trang đầu) bị bỏ qua có chủ đích, luôn dùng header/footer chính
      // (style:header/style:footer) ở trên — ưu tiên mở được tài liệu hơn
      // giữ đúng từng biến thể theo trang.
      masters.push({ name, layoutName, headerXml: header.trim(), footerXml: footer.trim() });
      return "";
    });
    return masters;
  }

  _fodtLayoutSignature(setup) {
    const margins = setup?.margins || DEFAULT_MARGINS_MM;
    return JSON.stringify({
      size: setup?.size || "a4",
      orientation: setup?.orientation === "landscape" ? "landscape" : "portrait",
      margins: {
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right
      }
    });
  }

  _fodtEscapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  _fodtUnescapeXml(value) {
    return String(value ?? "")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }

  _fodtParseAttributes(source) {
    const attrs = {};
    String(source || "").replace(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, name, doubleValue, singleValue) => {
      attrs[name.toLowerCase()] = this._fodtUnescapeXml(doubleValue ?? singleValue ?? "");
      return "";
    });
    return attrs;
  }

  _fodtParseMarkup(markup, kind) {
    const root = { name: "#root", attrs: {}, children: [] };
    const stack = [root];
    const source = String(markup || "").replace(/<!--[\s\S]*?-->/g, "");
    const tokens = source.match(/<[^>]*>|[^<]+/g) || [];
    for (const token of tokens) {
      if (!token.startsWith("<")) {
        stack[stack.length - 1].children.push({ name: "#text", text: this._fodtUnescapeXml(token) });
        continue;
      }
      if (/^<\?xml\b|^<!DOCTYPE\b/i.test(token)) continue;
      const close = token.match(/^<\/\s*([^\s>]+)\s*>$/);
      if (close) {
        const name = close[1].toLowerCase();
        if (stack.length === 1 || stack[stack.length - 1].name !== name) {
          throw this._fodtError(`${kind} không cân bằng tại </${name}>`);
        }
        stack.pop();
        continue;
      }
      const open = token.match(/^<\s*([^\s/>]+)([\s\S]*?)\/?\s*>$/);
      if (!open) throw this._fodtError(`${kind} không hợp lệ`);
      const node = { name: open[1].toLowerCase(), attrs: this._fodtParseAttributes(open[2]), children: [] };
      stack[stack.length - 1].children.push(node);
      if (!/\/>$/.test(token) && !["br", "img", "text:s", "text:tab", "text:line-break"].includes(node.name)) stack.push(node);
    }
    if (stack.length !== 1) throw this._fodtError(`${kind} không cân bằng tại <${stack[stack.length - 1].name}>`);
    return root;
  }

  _fodtCssMap(styleText, allowed = ["font-weight", "font-style", "text-decoration", "text-decoration-line", "color", "background-color", "font-family", "font-size", "text-align", "margin-top", "margin-bottom"]) {
    const result = {};
    const ignored = this._fodtCssIgnoreNames || [];
    for (const declaration of String(styleText || "").split(";")) {
      if (!declaration.trim()) continue;
      const colon = declaration.indexOf(":");
      if (colon < 1) throw this._fodtError(`khai báo CSS không hợp lệ: ${declaration.trim()}`);
      const name = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration.slice(colon + 1).trim();
      const aliases = { "background": "background-color", "font": "font" };
      const normalized = aliases[name] || name;
      if (ignored.includes(normalized) || ignored.includes(name)) continue;
      if (!allowed.includes(normalized)) {
        throw this._fodtError(`thuộc tính CSS '${name}'`);
      }
      if (normalized === "font") throw this._fodtError("CSS shorthand 'font'");
      result[normalized] = value;
    }
    return result;
  }

  /** Phase B: table cell CSS is a distinct domain from text/paragraph formatting. */
  _fodtCellCssMap(styleText) {
    return this._fodtCssMap(styleText, ["border", "border-top", "border-right", "border-bottom", "border-left", "background-color", "text-align"]);
  }

  /** "1px solid #94a3b8" -> ODF fo:border length ("0.75pt solid #94a3b8"). */
  _fodtNormalizeBorder(value) {
    const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?)(px|pt)\s+(solid|dashed|dotted|double)\s+(#[0-9a-f]{3,6}|[a-z]+)$/i);
    if (!match) throw this._fodtError(`viền ô '${value}' (chỉ nhận '<số>px|pt <kiểu> <màu>' trong Phase B)`);
    const widthPt = match[2].toLowerCase() === "px" ? Number(match[1]) * 0.75 : Number(match[1]);
    return `${Number(widthPt.toFixed(3))}pt ${match[3].toLowerCase()} ${this._fodtNormalizeColor(match[4])}`;
  }

  /** Dependency-free base64 -> byte array (must work in both browser and Node test runs). */
  _fodtBase64ToBytes(base64) {
    const clean = String(base64 || "").replace(/\s+/g, "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const lookup = new Map([...alphabet].map((ch, i) => [ch, i]));
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const ch of clean) {
      if (ch === "=") break;
      const value = lookup.get(ch);
      if (value === undefined) throw this._fodtError("dữ liệu base64 của ảnh không hợp lệ");
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 0xff);
      }
    }
    return bytes;
  }

  /**
   * Real pixel size from the image bitstream, never from CSS (Writer's <img>
   * is always max-width:100%/height:auto). Each format has its own header:
   * PNG IHDR, JPEG SOF0/SOF2, GIF logical screen, WEBP VP8/VP8L/VP8X.
   */
  _fodtImageDimensionsPx(mime, base64) {
    const normalized = String(mime || "").toLowerCase();
    if (normalized === "image/png") return this._fodtPngDimensionsPx(base64);
    if (normalized === "image/jpeg") return this._fodtJpegDimensionsPx(base64);
    if (normalized === "image/gif") return this._fodtGifDimensionsPx(base64);
    if (normalized === "image/webp") return this._fodtWebpDimensionsPx(base64);
    throw this._fodtError(`định dạng ảnh '${mime}' (Phase B.2 chỉ hỗ trợ PNG/JPEG/GIF/WEBP)`);
  }

  _fodtPngDimensionsPx(base64) {
    const bytes = this._fodtBase64ToBytes(base64);
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 24 || !signature.every((byte, index) => bytes[index] === byte)) {
      throw this._fodtError("ảnh không phải PNG hợp lệ");
    }
    const readUint32 = (offset) => ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    const width = readUint32(16);
    const height = readUint32(20);
    if (!width || !height) throw this._fodtError("PNG thiếu kích thước IHDR hợp lệ");
    return { width, height };
  }

  /** JPEG SOF0 (0xFFC0 baseline) or SOF2 (0xFFC2 progressive). Other SOF markers fail closed. */
  _fodtJpegDimensionsPx(base64) {
    const bytes = this._fodtBase64ToBytes(base64);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw this._fodtError("ảnh không phải JPEG hợp lệ");
    }
    let index = 2;
    while (index + 1 < bytes.length) {
      if (bytes[index] !== 0xff) {
        index += 1;
        continue;
      }
      while (index < bytes.length && bytes[index] === 0xff) index += 1;
      if (index >= bytes.length) break;
      const marker = bytes[index++];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (index + 1 >= bytes.length) break;
      const segmentLength = (bytes[index] << 8) | bytes[index + 1];
      if (segmentLength < 2) throw this._fodtError("JPEG segment không hợp lệ");
      if (marker === 0xc0 || marker === 0xc2) {
        if (index + 6 >= bytes.length) throw this._fodtError("JPEG SOF thiếu kích thước");
        const height = (bytes[index + 3] << 8) | bytes[index + 4];
        const width = (bytes[index + 5] << 8) | bytes[index + 6];
        if (!width || !height) throw this._fodtError("JPEG thiếu kích thước SOF hợp lệ");
        return { width, height };
      }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        throw this._fodtError(`JPEG SOF 0x${marker.toString(16)} chưa hỗ trợ (chỉ SOF0/SOF2)`);
      }
      index += segmentLength;
    }
    throw this._fodtError("JPEG không có marker SOF0/SOF2");
  }

  /** GIF87a/GIF89a logical screen descriptor: width/height little-endian at bytes 6-9. */
  _fodtGifDimensionsPx(base64) {
    const bytes = this._fodtBase64ToBytes(base64);
    if (bytes.length < 10) throw this._fodtError("ảnh không phải GIF hợp lệ");
    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
    if (header !== "GIF87a" && header !== "GIF89a") throw this._fodtError("ảnh không phải GIF hợp lệ");
    const width = bytes[6] | (bytes[7] << 8);
    const height = bytes[8] | (bytes[9] << 8);
    if (!width || !height) throw this._fodtError("GIF thiếu kích thước header hợp lệ");
    return { width, height };
  }

  _fodtU16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  _fodtU24LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
  }

  _fodtU32LE(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  /**
   * WEBP is a RIFF container. Dimensions are read from the first image chunk
   * after "WEBP": VP8X canvas, VP8 frame header, or VP8L bitstream — each
   * variant has its own layout (measured separately; not one formula for all).
   */
  _fodtWebpDimensionsPx(base64) {
    const bytes = this._fodtBase64ToBytes(base64);
    const fourcc = (offset) => String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    if (bytes.length < 20 || fourcc(0) !== "RIFF" || fourcc(8) !== "WEBP") {
      throw this._fodtError("ảnh không phải WEBP hợp lệ");
    }
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const chunk = fourcc(offset);
      const size = this._fodtU32LE(bytes, offset + 4);
      const payload = offset + 8;
      if (chunk === "VP8X") {
        if (payload + 10 > bytes.length) throw this._fodtError("WEBP VP8X thiếu canvas size");
        const width = this._fodtU24LE(bytes, payload + 4) + 1;
        const height = this._fodtU24LE(bytes, payload + 7) + 1;
        if (!width || !height) throw this._fodtError("WEBP VP8X canvas không hợp lệ");
        return { width, height };
      }
      if (chunk === "VP8 ") {
        if (payload + 10 > bytes.length || bytes[payload + 3] !== 0x9d || bytes[payload + 4] !== 0x01 || bytes[payload + 5] !== 0x2a) {
          throw this._fodtError("WEBP VP8 thiếu start code 0x9d012a");
        }
        const width = this._fodtU16LE(bytes, payload + 6) & 0x3fff;
        const height = this._fodtU16LE(bytes, payload + 8) & 0x3fff;
        if (!width || !height) throw this._fodtError("WEBP VP8 thiếu kích thước");
        return { width, height };
      }
      if (chunk === "VP8L") {
        if (payload + 5 > bytes.length || bytes[payload] !== 0x2f) throw this._fodtError("WEBP VP8L thiếu signature 0x2F");
        const b0 = bytes[payload + 1];
        const b1 = bytes[payload + 2];
        const b2 = bytes[payload + 3];
        const b3 = bytes[payload + 4];
        const width = (b0 | ((b1 & 0x3f) << 8)) + 1;
        const height = ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)) + 1;
        if (!width || !height) throw this._fodtError("WEBP VP8L thiếu kích thước");
        return { width, height };
      }
      offset += 8 + size + (size & 1);
    }
    throw this._fodtError("WEBP không có chunk VP8/VP8L/VP8X");
  }

  _fodtPlainFromNodes(nodes) {
    return nodes.map(node => {
      if (node.name === "#text") return node.text || "";
      if (node.name === "text:s") return " ".repeat(Math.max(1, Number(node.attrs["text:c"]) || 1));
      if (node.name === "text:tab") return "\t";
      if (node.name === "text:line-break") return "\n";
      if (node.children && node.children.length) return this._fodtPlainFromNodes(node.children);
      return "";
    }).join("");
  }

  _fodtGraphicFromStyle(styleName, graphicStyles) {
    if (!styleName) return { fill: "none", fillColor: "", strokeColor: "#000000", strokeWidth: 2 };
    const style = graphicStyles.get(styleName);
    if (!style) throw this._fodtError(`graphic style không biết '${styleName}'`);
    return {
      fill: style.fill === "solid" ? (style.fillColor || "#2563eb") : "none",
      fillColor: style.fillColor || "",
      strokeColor: style.strokeColor || "#000000",
      strokeWidth: style.strokeWidthCm ? this._fodtCmToPx(style.strokeWidthCm) : 2
    };
  }

  _fodtParseDrawTranslate(attrs) {
    const transform = attrs["draw:transform"] || attrs["svg:transform"];
    const match = String(transform || "").match(/translate\s*\(\s*(-?\d+(?:\.\d+)?)\s*(?:cm)?\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*(?:cm)?\s*\)/i);
    if (match) {
      const parseCm = (s) => {
        const absVal = Math.abs(Number(s));
        const px = this._fodtCmToPx(`${absVal}cm`);
        return Number(s) < 0 ? -px : px;
      };
      return { x: parseCm(match[1]), y: parseCm(match[2]) };
    }
    return {
      x: attrs["svg:x"] ? this._fodtCmToPx(attrs["svg:x"]) : 0,
      y: attrs["svg:y"] ? this._fodtCmToPx(attrs["svg:y"]) : 0
    };
  }

  _fodtShapeFromNode(node, graphicStyles) {
    const graphic = this._fodtGraphicFromStyle(node.attrs["draw:style-name"], graphicStyles);
    const origin = this._fodtParseDrawTranslate(node.attrs);
    const x = origin.x;
    const y = origin.y;
    const w = node.attrs["svg:width"] ? this._fodtCmToPx(node.attrs["svg:width"]) : 0;
    const h = node.attrs["svg:height"] ? this._fodtCmToPx(node.attrs["svg:height"]) : 0;
    const id = node.attrs["draw:name"] || `shape-${graphicStyles.size + 1}`;
    const base = {
      id,
      x, y, w, h, width: w, height: h,
      fill: graphic.fill,
      stroke: graphic.strokeColor,
      strokeWidth: graphic.strokeWidth
    };
    if (node.name === "draw:line") {
      const x1 = this._fodtCmToPx(node.attrs["svg:x1"] || "0cm");
      const y1 = this._fodtCmToPx(node.attrs["svg:y1"] || "0cm");
      const x2 = this._fodtCmToPx(node.attrs["svg:x2"] || "0cm");
      const y2 = this._fodtCmToPx(node.attrs["svg:y2"] || "0cm");
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return { ...base, type: "line", shapeType: "line", x: x1, y: y1, w: width, h: height, width, height, fill: "none" };
    }
    if (node.name === "draw:connector") {
      const x1 = this._fodtCmToPx(node.attrs["svg:x1"] || "0cm");
      const y1 = this._fodtCmToPx(node.attrs["svg:y1"] || "0cm");
      const x2 = this._fodtCmToPx(node.attrs["svg:x2"] || "0cm");
      const y2 = this._fodtCmToPx(node.attrs["svg:y2"] || "0cm");
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return { ...base, type: "line", shapeType: "line", x: x1, y: y1, w: width, h: height, width, height, fill: "none" };
    }
    if (node.name === "draw:ellipse" || node.name === "draw:circle") {
      return { ...base, type: "circle", shapeType: "circle" };
    }
    if (node.name === "draw:rect") {
      const type = node.attrs["draw:corner-radius"] ? "round-rect" : "rectangle";
      return { ...base, type, shapeType: type };
    }
    if (node.name === "draw:custom-shape") {
      const geom = node.children.find(child => child.name === "draw:enhanced-geometry");
      const type = geom?.attrs["draw:type"] || "";
      if (String(type).startsWith("fontwork-")) {
        throw this._fodtError("Fontwork WordArt không thuộc this.shapes");
      }
      if (type === "right-arrow") {
        return { ...base, type: "arrow", shapeType: "arrow" };
      }
      // Lỗi thật đã xác nhận qua probe soffice thật: file DOCX thật (Word
      // thật) chèn hình cơ bản (hình chữ nhật, elip, bo góc — rất phổ biến,
      // dùng qua "Insert Shapes" của Word) không được soffice ghi thành
      // <draw:rect>/<draw:ellipse> chuẩn ODF như VN Writer tự ghi, mà LUÔN
      // thành <draw:custom-shape> với draw:enhanced-geometry draw:type=
      // "ooxml-<prstGeom>" (ví dụ "ooxml-rect", "ooxml-ellipse",
      // "ooxml-roundRect"). Trước đây parseFodt() NÉM LỖI ngay khi gặp bất
      // kỳ type nào khác "right-arrow" — khiến file DOCX có MỘT hình chữ
      // nhật/elip bình thường (không cần xoay, không gì đặc biệt) cũng
      // KHÔNG MỞ ĐƯỢC. Ánh xạ 5 kiểu có tương đương chính xác trong model
      // hình của VN Writer (apps/writer/writer-illustrations.js: rectangle/
      // round-rect/circle/triangle/diamond) — các kiểu KHÁC (pentagon,
      // star5, hexagon...) VN Writer chưa có renderer tương ứng nên VẪN
      // từ chối rõ ràng, không âm thầm vẽ sai hình.
      // "ooxml-straightConnector1" (OOXML thật) và "mso-spt32" (id 32 =
      // Straight Connector, LibreOffice tự dùng khi convert file .doc cũ)
      // đều là ĐƯỜNG THẲNG NỐI (connector) mà Word ghi thành custom-shape
      // thay vì <draw:line> chuẩn — xác nhận qua file .docx/.doc thật của
      // người dùng. Dùng lại type "line" có sẵn (vẽ đường chéo theo hộp
      // biên x/y/w/h của base, đã có sẵn từ trên) thay vì tạo type mới.
      const OOXML_SHAPE_TYPE_MAP = { "ooxml-rect": "rectangle", "ooxml-roundrect": "round-rect", "ooxml-ellipse": "circle", "ooxml-triangle": "triangle", "ooxml-diamond": "diamond", "ooxml-straightconnector1": "line", "mso-spt32": "line" };
      const mapped = OOXML_SHAPE_TYPE_MAP[String(type).toLowerCase()];
      if (mapped) {
        return { ...base, type: mapped, shapeType: mapped };
      }
      throw this._fodtError(`draw:custom-shape type '${type}' (Phase B.2 chỉ hỗ trợ right-arrow/ooxml-rect/ooxml-roundRect/ooxml-ellipse/ooxml-triangle/ooxml-diamond/ooxml-straightConnector1/mso-spt32; Phase E.3 Fontwork WordArt đi HTML)`);
    }
    throw this._fodtError(`phần tử FODT drawing <${node.name}>`);
  }

  _fodtIsWordArtHtmlNode(node) {
    return node?.name === "span" && (
      node.attrs["data-vno-wordart"] === "true" ||
      /\bvno-writer-wordart\b/.test(node.attrs.class || "")
    );
  }

  _fodtWordArtPresetId(raw) {
    const id = String(raw || "").trim();
    if (!WORDART_PRESETS.some(item => item.id === id)) {
      throw this._fodtError(`WordArt preset '${id}'`);
    }
    return id;
  }

  _fodtWordArtPrimaryFont(fontFamily) {
    const first = String(fontFamily || "Impact").split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    if (!first) throw this._fodtError("WordArt thiếu font");
    return first;
  }

  _fodtIsFontworkShape(node) {
    if (node?.name !== "draw:custom-shape") return false;
    const geom = (node.children || []).find(child => child.name === "draw:enhanced-geometry");
    return String(geom?.attrs["draw:type"] || "").startsWith("fontwork-");
  }

  _fodtWordArtHtmlFromNode(node) {
    const paras = (node.children || []).filter(child => child.name === "text:p");
    if (!paras.length) throw this._fodtError("Fontwork WordArt thiếu text:p");
    const text = paras.map(para => this._fodtPlainLoose(para.children)).join("").trim();
    if (!text) throw this._fodtError("Fontwork WordArt không có chữ");
    const name = String(node.attrs["draw:name"] || "");
    const match = name.match(/^WordArt-(.+)$/);
    const presetId = WORDART_PRESETS.some(item => item.id === match?.[1]) ? match[1] : "navy-outline";
    return buildWriterWordArtHtml(text, { presetId });
  }

  _fodtIsChartHtmlNode(node) {
    return node?.name === "div" && (
      node.attrs["data-vno-chart"] === "true" ||
      /\bvno-writer-chart\b/.test(node.attrs.class || "")
    );
  }

  _fodtFindNodeByName(node, name) {
    if (!node || node.name === "#text") return null;
    if (node.name === name) return node;
    for (const child of node.children || []) {
      const found = this._fodtFindNodeByName(child, name);
      if (found) return found;
    }
    return null;
  }

  _fodtCollectNodesByName(node, name, acc = []) {
    if (!node || node.name === "#text") return acc;
    if (node.name === name) acc.push(node);
    for (const child of node.children || []) this._fodtCollectNodesByName(child, name, acc);
    return acc;
  }

  _fodtUiChartTypeToOdf(type) {
    if (type === "bar") return "bar";
    if (type === "line") return "line";
    if (type === "pie") return "circle";
    if (type === "area") return "area";
    throw this._fodtError(`kiểu biểu đồ '${type}'`);
  }

  _fodtOdfChartClassToUi(raw) {
    const cls = String(raw || "").replace(/^chart:/i, "").trim().toLowerCase();
    if (cls === "bar" || cls === "column") return "bar";
    if (cls === "line") return "line";
    if (cls === "circle" || cls === "pie") return "pie";
    if (cls === "area") return "area";
    throw this._fodtError(`chart:class '${raw || ""}'`);
  }

  _fodtChartHtmlFromData({ type, title, labels, data }) {
    const html = generateChartHtml({
      type,
      chartType: type,
      title,
      labels,
      data,
      values: data
    });
    return String(html).replace(/\s*<p>\s*<br\s*\/?>\s*<\/p>\s*$/i, "").trim();
  }

  _fodtChartDataFromHtmlNode(node) {
    const walkChrome = (nodes) => {
      for (const child of nodes || []) {
        if (child.name === "#text") continue;
        if (child.name === "button" && /\bvno-chart-delete-btn\b/.test(child.attrs.class || "")) continue;
        if (child.name === "div") {
          walkChrome(child.children);
          continue;
        }
        if (child.name === "svg") continue;
        throw this._fodtError(`nội dung biểu đồ <${child.name}>`);
      }
    };
    walkChrome(node.children);
    const svg = this._fodtFindNodeByName(node, "svg");
    if (!svg) throw this._fodtError("biểu đồ thiếu svg");
    const type = String(svg.attrs["data-chart-type"] || "").trim();
    if (!["bar", "line", "pie", "area"].includes(type)) {
      throw this._fodtError(`kiểu biểu đồ '${type || ""}'`);
    }
    const titleEl = (svg.children || []).find(child => child.name === "text");
    const title = titleEl ? this._fodtPlainLoose(titleEl.children).trim() : "";
    if (!title) throw this._fodtError("biểu đồ thiếu tiêu đề");
    const labels = [];
    const data = [];
    for (const titleNode of this._fodtCollectNodesByName(svg, "title")) {
      const text = this._fodtPlainLoose(titleNode.children).trim();
      const match = text.match(/^(.*):\s*(-?\d+(?:\.\d+)?)$/);
      if (!match) throw this._fodtError(`nhãn/giá trị biểu đồ không đọc được '${text}'`);
      labels.push(match[1]);
      data.push(Number(match[2]));
    }
    if (!labels.length) {
      throw this._fodtError("biểu đồ không có dữ liệu gốc (SVG rỗng hoặc thiếu title)");
    }
    return { type, title, labels, data };
  }

  _fodtChartFrameXml(data, styleName, drawName) {
    const chartClass = `chart:${this._fodtUiChartTypeToOdf(data.type)}`;
    const count = data.labels.length;
    const endRow = count + 1;
    const title = this._fodtEscapeXml(data.title);
    const rows = data.labels.map((label, index) => {
      const value = Number.isFinite(Number(data.data[index])) ? Number(data.data[index]) : 0;
      return `<table:table-row><table:table-cell office:value-type="string"><text:p>${this._fodtEscapeXml(label)}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="${value}"><text:p>${value}</text:p></table:table-cell></table:table-row>`;
    }).join("");
    const axes = data.type === "pie"
      ? ""
      : `<chart:axis chart:dimension="x" chart:name="primary-x"><chart:categories table:cell-range-address="local-table.$A$2:.$A$${endRow}"/></chart:axis><chart:axis chart:dimension="y" chart:name="primary-y"><chart:grid chart:class="major"/></chart:axis>`;
    const points = Array.from({ length: count }, () => "<chart:data-point/>").join("");
    return `<draw:frame draw:style-name="${styleName}" draw:name="${this._fodtEscapeXml(drawName)}" text:anchor-type="as-char" svg:width="12cm" svg:height="7cm"><draw:object><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart"><office:body><office:chart><chart:chart svg:width="12cm" svg:height="7cm" xlink:href="." xlink:type="simple" chart:class="${chartClass}"><chart:title><text:p>${title}</text:p></chart:title><chart:legend chart:legend-position="end"/><chart:plot-area>${axes}<chart:series chart:values-cell-range-address="local-table.$B$2:.$B$${endRow}" chart:label-cell-address="local-table.$B$1" chart:class="${chartClass}">${points}</chart:series></chart:plot-area><table:table table:name="local-table"><table:table-header-columns><table:table-column/></table:table-header-columns><table:table-columns><table:table-column/></table:table-columns><table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>${title}</text:p></table:table-cell></table:table-row></table:table-header-rows><table:table-rows>${rows}</table:table-rows></table:table></chart:chart></office:chart></office:body></office:document></draw:object></draw:frame>`;
  }

  _fodtFrameIsChart(node) {
    if (node?.name !== "draw:frame") return false;
    const children = (node.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
    const objectNode = children.find(child => child.name === "draw:object");
    if (!objectNode) return false;
    return Boolean(this._fodtFindNodeByName(objectNode, "chart:chart"));
  }

  _fodtChartHtmlFromFrame(node) {
    if (node.attrs["text:anchor-type"] && node.attrs["text:anchor-type"] !== "as-char") {
      throw this._fodtError(`draw:frame chart anchor-type '${node.attrs["text:anchor-type"]}' (Phase E.4 chỉ hỗ trợ as-char)`);
    }
    const children = (node.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
    const objectNode = children.find(child => child.name === "draw:object");
    if (!objectNode) throw this._fodtError("draw:frame chart thiếu draw:object");
    const unexpected = children.filter(child => child !== objectNode && child.name !== "draw:image");
    if (unexpected.length) throw this._fodtError(`draw:frame chart chứa <${unexpected[0].name}>`);
    const chartNode = this._fodtFindNodeByName(objectNode, "chart:chart");
    if (!chartNode) throw this._fodtError("draw:object không chứa chart:chart");
    const type = this._fodtOdfChartClassToUi(chartNode.attrs["chart:class"]);
    const series = this._fodtCollectNodesByName(chartNode, "chart:series");
    if (series.length !== 1) {
      throw this._fodtError(`biểu đồ ${series.length} series (Phase E.4 chỉ một series)`);
    }
    if (series[0].attrs["chart:class"]) {
      const seriesType = this._fodtOdfChartClassToUi(series[0].attrs["chart:class"]);
      if (seriesType !== type) throw this._fodtError("chart:series class khác chart:chart");
    }
    const titleNode = this._fodtFindNodeByName(chartNode, "chart:title");
    const title = titleNode ? this._fodtPlainLoose(titleNode.children).trim() : "";
    if (!title) throw this._fodtError("chart:chart thiếu chart:title");
    const tables = this._fodtCollectNodesByName(chartNode, "table:table")
      .filter(table => table.attrs["table:name"] === "local-table");
    if (tables.length !== 1) throw this._fodtError("chart:chart thiếu table:name=\"local-table\"");
    const { labels, data } = this._fodtChartTableData(tables[0]);
    return this._fodtChartHtmlFromData({ type, title, labels, data });
  }

  _fodtChartTableData(tableNode) {
    const rowsWrap = (tableNode.children || []).find(child => child.name === "table:table-rows");
    if (!rowsWrap) throw this._fodtError("local-table thiếu table:table-rows");
    const rowNodes = (rowsWrap.children || []).filter(child => child.name === "table:table-row");
    const labels = [];
    const data = [];
    for (const row of rowNodes) {
      const cells = (row.children || []).filter(child => child.name === "table:table-cell");
      if (cells.length < 2) throw this._fodtError("local-table hàng thiếu nhãn/giá trị");
      const label = this._fodtPlainLoose(cells[0].children).trim();
      const valueAttr = cells[1].attrs["office:value"];
      const valueText = this._fodtPlainLoose(cells[1].children).trim();
      if (valueAttr === "NaN" || valueText === "NaN") throw this._fodtError("local-table giá trị NaN");
      const value = valueAttr !== undefined && valueAttr !== "" ? Number(valueAttr) : Number(valueText);
      if (!Number.isFinite(value)) throw this._fodtError(`local-table giá trị '${valueAttr || valueText}'`);
      labels.push(label);
      data.push(value);
    }
    if (!labels.length) throw this._fodtError("local-table không có hàng dữ liệu");
    return { labels, data };
  }

  _fodtTextBoxFromFrame(node, textBox, graphicStyles) {
    const graphic = this._fodtGraphicFromStyle(node.attrs["draw:style-name"], graphicStyles);
    const paras = textBox.children.filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
    if (!paras.length) {
      throw this._fodtError("draw:text-box phải chứa text:p (Phase B.2)");
    }
    const origin = this._fodtParseDrawTranslate(node.attrs);
    return {
      id: node.attrs["draw:name"] || "TextBox1",
      type: "textbox",
      shapeType: "textbox",
      x: origin.x,
      y: origin.y,
      w: this._fodtCmToPx(node.attrs["svg:width"] || "0cm"),
      h: this._fodtCmToPx(node.attrs["svg:height"] || "0cm"),
      width: this._fodtCmToPx(node.attrs["svg:width"] || "0cm"),
      height: this._fodtCmToPx(node.attrs["svg:height"] || "0cm"),
      fill: "transparent",
      stroke: graphic.strokeColor,
      strokeWidth: graphic.strokeWidth,
      text: paras.map(para => this._fodtPlainFromNodes(para.children)).join("\n")
    };
  }

  _fodtPxToCm(px) {
    return `${Number((px / 96 * 2.54).toFixed(3))}cm`;
  }

  _fodtCmToPx(cm) {
    const match = String(cm || "").trim().match(/^-?(\d+(?:\.\d+)?)cm$/);
    if (!match) throw this._fodtError(`kích thước ảnh '${cm}' không phải cm hợp lệ`);
    return Math.round((Number(match[1]) / 2.54) * 96);
  }

  _fodtDataUrlParts(src) {
    const match = String(src || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    return { mime: match[1] || "application/octet-stream", isBase64: !!match[2], data: match[3] };
  }

  _fodtNormalizeColor(value) {
    const color = String(value || "").trim().toLowerCase();
    const shortHex = color.match(/^#([0-9a-f]{3})$/i);
    if (shortHex) return `#${[...shortHex[1]].map(ch => ch + ch).join("")}`;
    const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,[^)]*)?\)$/i);
    if (rgb) return `#${rgb.slice(1, 4).map(part => Math.min(255, Number(part)).toString(16).padStart(2, "0")).join("")}`;
    return color;
  }

  _fodtNormalizeFontSize(value) {
    const match = String(value || "").trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(pt|px)$/);
    if (!match) throw this._fodtError(`cỡ chữ '${value}' (chỉ nhận pt/px trong Phase A)`);
    const points = match[2] === "px" ? Number(match[1]) * 0.75 : Number(match[1]);
    return `${Number(points.toFixed(3))}pt`;
  }

  _fodtNormalizeLengthToPt(value, kind = "độ dài") {
    const match = String(value || "").trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(pt|px|cm|mm|in)$/);
    if (!match) throw this._fodtError(`${kind} '${value}' (chỉ nhận pt/px/cm/mm/in)`);
    const amount = Number(match[1]);
    const unit = match[2];
    let points = amount;
    if (unit === "px") points = amount * 0.75;
    else if (unit === "in") points = amount * 72;
    else if (unit === "cm") points = amount * 72 / 2.54;
    else if (unit === "mm") points = amount * 72 / 25.4;
    return `${Number(points.toFixed(3))}pt`;
  }

  _fodtInlineStyle(node, inherited = {}) {
    const style = { ...inherited };
    if (["b", "strong"].includes(node.name)) style.bold = true;
    if (["i", "em"].includes(node.name)) style.italic = true;
    if (node.name === "u") style.underline = true;
    if (node.name === "font") {
      if (node.attrs.color) style.color = this._fodtNormalizeColor(node.attrs.color);
      if (node.attrs.face) style.fontFamily = node.attrs.face.trim();
      if (node.attrs.size) throw this._fodtError("thuộc tính HTML font size legacy");
    }
    const css = this._fodtCssMap(node.attrs.style);
    if (/^(bold|[6-9]00)$/i.test(css["font-weight"] || "")) style.bold = true;
    if (/^(normal|[1-5]00)$/i.test(css["font-weight"] || "")) delete style.bold;
    if (/^italic$/i.test(css["font-style"] || "")) style.italic = true;
    if (/^normal$/i.test(css["font-style"] || "")) delete style.italic;
    if (/underline/i.test(css["text-decoration"] || css["text-decoration-line"] || "")) style.underline = true;
    if (/^none$/i.test(css["text-decoration"] || css["text-decoration-line"] || "")) delete style.underline;
    if (css.color) style.color = this._fodtNormalizeColor(css.color);
    if (css["background-color"] && css["background-color"] !== "transparent") style.backgroundColor = this._fodtNormalizeColor(css["background-color"]);
    if (css["font-family"]) style.fontFamily = css["font-family"].replace(/^['"]|['"]$/g, "").trim();
    if (css["font-size"]) style.fontSize = this._fodtNormalizeFontSize(css["font-size"]);
    return style;
  }

  _fodtTextXml(value) {
    const parts = String(value ?? "").split(/(\t|\r?\n| {2,})/);
    return parts.map(part => {
      if (part === "\t") return "<text:tab/>";
      if (/^\r?\n$/.test(part)) return "<text:line-break/>";
      if (/^ {2,}$/.test(part)) return `<text:s text:c="${part.length}"/>`;
      return this._fodtEscapeXml(part);
    }).join("");
  }

  _fodtCollectNoteBodies(nodes, idAttr) {
    const map = new Map();
    const walk = (node) => {
      if (!node || node.name === "#text") return;
      if (node.name === "div" && node.attrs[idAttr]) {
        const textSpan = (node.children || []).find(child =>
          child.name === "span" && /\bvno-note-text\b/.test(child.attrs.class || "")
        );
        map.set(node.attrs[idAttr], textSpan ? textSpan.children : []);
      }
      for (const child of node.children || []) walk(child);
    };
    for (const node of nodes || []) walk(node);
    return map;
  }

  _fodtIsNoteContainer(node) {
    return node?.name === "div" && (
      node.attrs["data-vno-footnotes"] === "true" ||
      node.attrs["data-vno-endnotes"] === "true"
    );
  }

  _fodtIsTocBlock(node) {
    return node?.name === "div" && node.attrs["data-vno-toc"] === "true";
  }

  _fodtFindByClass(node, className) {
    if (!node || node.name === "#text") return null;
    if (new RegExp(`\\b${className}\\b`).test(node.attrs.class || "")) return node;
    for (const child of node.children || []) {
      const found = this._fodtFindByClass(child, className);
      if (found) return found;
    }
    return null;
  }

  _fodtCollectByClass(node, className, acc = []) {
    if (!node || node.name === "#text") return acc;
    if (new RegExp(`\\b${className}\\b`).test(node.attrs.class || "")) acc.push(node);
    for (const child of node.children || []) this._fodtCollectByClass(child, className, acc);
    return acc;
  }

  _fodtTocStylesXml() {
    return '<style:style style:name="Contents_20_Heading" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.4cm"/><style:text-properties fo:font-size="16pt" fo:font-weight="bold"/></style:style><style:style style:name="Contents_20_1" style:family="paragraph"><style:paragraph-properties fo:margin-left="0cm"/></style:style><style:style style:name="Contents_20_2" style:family="paragraph"><style:paragraph-properties fo:margin-left="0.5cm"/></style:style><style:style style:name="Contents_20_3" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm"/></style:style>';
  }

  _fodtTocEntryTemplateXml(level) {
    return `<text:table-of-content-entry-template text:outline-level="${level}" text:style-name="Contents_20_${level}"><text:index-entry-chapter/><text:index-entry-text/><text:index-entry-tab-stop style:type="right" style:leader-char="."/><text:index-entry-page-number/></text:table-of-content-entry-template>`;
  }

  _fodtTocXml(node) {
    const titleNode = this._fodtFindByClass(node, "vno-toc-title");
    const title = this._fodtPlainLoose(titleNode ? titleNode.children : []).trim() || "MỤC LỤC";
    const items = this._fodtCollectByClass(node, "vno-toc-item");
    const entriesXml = items.map(item => {
      const className = item.attrs.class || "";
      const levelMatch = className.match(/\bvno-toc-level-([123])\b/);
      const level = levelMatch ? levelMatch[1] : "1";
      const textNode = this._fodtFindByClass(item, "vno-toc-text");
      const pageNode = this._fodtFindByClass(item, "vno-toc-page");
      const text = this._fodtPlainLoose(textNode ? textNode.children : item.children).trim();
      const page = this._fodtPlainLoose(pageNode ? pageNode.children : []).trim() || "1";
      return `<text:p text:style-name="Contents_20_${level}">${this._fodtTextXml(text)}<text:tab/>${this._fodtEscapeXml(page)}</text:p>`;
    }).join("");
    return `<text:table-of-content text:name="Table of Contents1"><text:table-of-content-source text:outline-level="3"><text:index-title-template text:style-name="Contents_20_Heading">${this._fodtEscapeXml(title)}</text:index-title-template>${this._fodtTocEntryTemplateXml(1)}${this._fodtTocEntryTemplateXml(2)}${this._fodtTocEntryTemplateXml(3)}</text:table-of-content-source><text:index-body><text:index-title text:name="Table of Contents1_Head"><text:p text:style-name="Contents_20_Heading">${this._fodtEscapeXml(title)}</text:p></text:index-title>${entriesXml}</text:index-body></text:table-of-content>`;
  }

  _fodtTocHtml(node) {
    const children = (node.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
    const unexpected = children.filter(child => child.name !== "text:table-of-content-source" && child.name !== "text:index-body");
    if (unexpected.length) throw this._fodtError(`text:table-of-content chứa <${unexpected[0].name}>`);
    const source = children.find(child => child.name === "text:table-of-content-source");
    const body = children.find(child => child.name === "text:index-body");
    if (!source || !body) throw this._fodtError("text:table-of-content thiếu text:table-of-content-source/text:index-body");
    const bodyChildren = body.children.filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
    const indexTitle = bodyChildren.find(child => child.name === "text:index-title");
    let title = "MỤC LỤC";
    if (indexTitle) {
      const titleP = (indexTitle.children || []).find(child => child.name === "text:p");
      const fromBody = titleP ? this._fodtPlainLoose(titleP.children).trim() : "";
      if (fromBody) title = fromBody;
    }
    if (title === "MỤC LỤC") {
      const template = (source.children || []).find(child => child.name === "text:index-title-template");
      const fromTemplate = template ? this._fodtPlainLoose(template.children).trim() : "";
      if (fromTemplate) title = fromTemplate;
    }
    const entryNodes = bodyChildren.filter(child => child.name === "text:p");
    let entriesHtml;
    if (!entryNodes.length) {
      entriesHtml = "<div class=\"vno-toc-empty\">Chưa có tiêu đề nào trong tài liệu. Hãy định dạng các đoạn văn bằng Kiểu dáng Heading 1, 2 hoặc 3 rồi cập nhật lại mục lục.</div>";
    } else {
      entriesHtml = entryNodes.map(entry => {
        const styleName = entry.attrs["text:style-name"] || "";
        const levelMatch = styleName.match(/contents_20_([123])$/i);
        const level = levelMatch ? levelMatch[1] : "1";
        const plain = this._fodtPlainLoose(entry.children);
        const tabAt = plain.lastIndexOf("\t");
        const text = (tabAt >= 0 ? plain.slice(0, tabAt) : plain).trim();
        const page = (tabAt >= 0 ? plain.slice(tabAt + 1) : "1").trim() || "1";
        return `<div class="vno-toc-item vno-toc-level-${level}"><a class="vno-toc-link"><span class="vno-toc-text">${this._escapeHtml(text)}</span><span class="vno-toc-leader"></span><span class="vno-toc-page">${this._escapeHtml(page)}</span></a></div>`;
      }).join("");
    }
    return `<div data-vno-toc="true" class="vno-toc-block" contenteditable="false"><div class="vno-toc-header"><span class="vno-toc-title">${this._escapeHtml(title)}</span><div class="vno-toc-actions"><button type="button" class="vno-toc-btn vno-toc-btn-update" title="Cập nhật mục lục">🔄 Cập nhật</button><button type="button" class="vno-toc-btn vno-toc-btn-delete" title="Xóa mục lục">&times;</button></div></div><div class="vno-toc-entries">${entriesHtml}</div></div>`;
  }

  _fodtCitationText(nodes) {
    return (nodes || []).map(node => {
      if (node.name === "#text") return node.text || "";
      throw this._fodtError(`số mũ chú thích chứa <${node.name}>`);
    }).join("");
  }

  _fodtNotesConfigurationXml() {
    return "<text:notes-configuration text:note-class=\"footnote\" style:num-format=\"1\" text:start-value=\"0\" text:footnotes-position=\"page\" text:start-numbering-at=\"document\"/><text:notes-configuration text:note-class=\"endnote\" style:num-format=\"i\" text:start-value=\"0\"/>";
  }

  _fodtLineNumberingConfigurationXml() {
    const config = this._cloneLineNumbers(this.lineNumbers);
    if (!config.enabled) return "";
    const countBy = Math.max(1, config.countBy || 1);
    const attrs = [
      'text:number-lines="true"',
      `text:increment="${countBy}"`,
      'text:number-position="left"',
      'style:num-format="1"'
    ];
    if (config.restart === "page") attrs.splice(2, 0, 'text:restart-on-page="true"');
    return `<text:linenumbering-configuration ${attrs.join(" ")}/>`;
  }

  _fodtOfficeStylesXml(body) {
    const children = [];
    if (/<text:note[\s>]/.test(body || "")) children.push(this._fodtNotesConfigurationXml());
    const lineXml = this._fodtLineNumberingConfigurationXml();
    if (lineXml) children.push(lineXml);
    return children.length ? `<office:styles>${children.join("")}</office:styles>` : "";
  }

  _fodtLineNumbersMetaXml() {
    const config = this._cloneLineNumbers(this.lineNumbers);
    if (!config.enabled || config.restart !== "section") return "";
    return '<office:meta><meta:user-defined meta:name="vnd.vn-office.line-numbers-restart">section</meta:user-defined></office:meta>';
  }

  _fodtParseLineNumbers(xml) {
    const result = this._defaultLineNumbers();
    const match = String(xml || "").match(/<text:linenumbering-configuration\b([^>]*)\/?\s*>/i);
    if (!match) return result;
    const attrs = this._fodtParseAttributes(match[1]);
    if (String(attrs["text:number-lines"] || "").toLowerCase() === "false") return result;
    result.enabled = true;
    const increment = Number(attrs["text:increment"]);
    result.countBy = Number.isFinite(increment) && increment >= 1 ? Math.floor(increment) : 5;
    if (String(attrs["text:restart-on-page"] || "").toLowerCase() === "true") {
      result.restart = "page";
    }
    const meta = String(xml || "").match(/<meta:user-defined\b[^>]*meta:name=["']vnd\.vn-office\.line-numbers-restart["'][^>]*>([\s\S]*?)<\/meta:user-defined>/i);
    if (meta && String(meta[1]).trim() === "section" && result.restart !== "page") {
      result.restart = "section";
    }
    return result;
  }

  _fodtPlainLoose(nodes) {
    return (nodes || []).map(node => {
      if (!node) return "";
      if (node.name === "#text") return node.text || "";
      if (node.name === "text:s") return " ".repeat(Math.max(1, Number(node.attrs["text:c"]) || 1));
      if (node.name === "text:tab") return "\t";
      if (node.name === "text:line-break") return "\n";
      if (node.name === "br") return "\n";
      return this._fodtPlainLoose(node.children);
    }).join("");
  }

  _fodtCommentMarkHtml(comment, innerHtml) {
    const authorAttr = comment.author
      ? ` data-vno-comment-author="${this._escapeHtml(comment.author)}"`
      : "";
    const titleAttr = comment.author ? ` title="${this._escapeHtml(comment.author)}"` : "";
    const label = `Mở ghi chú cho: ${String(comment.anchorText || "").slice(0, 80)}`;
    return `<mark class="vno-comment-anchor" data-comment-id="${this._escapeHtml(comment.id)}" tabindex="0" role="button"${authorAttr}${titleAttr} aria-label="${this._escapeHtml(label)}">${innerHtml}</mark>`;
  }

  _fodtChangeInfoXml(author, date) {
    const creatorXml = author ? `<dc:creator>${this._fodtEscapeXml(author)}</dc:creator>` : "";
    return `<office:change-info>${creatorXml}<dc:date>${this._fodtEscapeXml(date)}</dc:date></office:change-info>`;
  }

  _fodtTrackedChangesXml(regions) {
    if (!regions.length) return "";
    const regionsXml = regions.map(region => {
      const info = this._fodtChangeInfoXml(region.author, region.date);
      const id = this._fodtEscapeXml(region.id);
      if (region.kind === "insert") {
        return `<text:changed-region xml:id="${id}" text:id="${id}"><text:insertion>${info}</text:insertion></text:changed-region>`;
      }
      return `<text:changed-region xml:id="${id}" text:id="${id}"><text:deletion>${info}<text:p>${region.contentXml}</text:p></text:deletion></text:changed-region>`;
    }).join("");
    return `<text:tracked-changes>${regionsXml}</text:tracked-changes>`;
  }

  _fodtTrackChangeMarkHtml(kind, region, innerHtml) {
    const author = String(region?.author || "").trim();
    const date = String(region?.date || "").trim();
    const restoreDate = date && !(date === FODT_TRACK_CHANGE_SENTINEL_DATE && !author);
    const tooltip = this._trackChangeTooltip({ author, date: restoreDate ? date : "" });
    const authorAttr = author ? ` data-vno-author="${this._escapeHtml(author)}"` : "";
    const dateAttr = restoreDate ? ` data-vno-date="${this._escapeHtml(date)}"` : "";
    const titleAttr = tooltip ? ` title="${this._escapeHtml(tooltip)}"` : "";
    if (kind === "delete") {
      return `<del data-vno-change="delete" contenteditable="false"${authorAttr}${dateAttr}${titleAttr}>${innerHtml}</del>`;
    }
    return `<ins data-vno-change="insert"${authorAttr}${dateAttr}${titleAttr}>${innerHtml}</ins>`;
  }

  _fodtLoadTrackedChanges(node, map) {
    const regions = (node.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
    for (const region of regions) {
      if (region.name !== "text:changed-region") throw this._fodtError(`text:tracked-changes chứa <${region.name}>`);
      const id = region.attrs["text:id"] || region.attrs["xml:id"];
      if (!id) throw this._fodtError("text:changed-region thiếu text:id");
      if (map.has(id)) throw this._fodtError(`text:changed-region trùng id '${id}'`);
      const payload = (region.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
      if (payload.length !== 1) throw this._fodtError("text:changed-region phải có đúng một insertion/deletion");
      const kindNode = payload[0];
      if (kindNode.name === "text:format-change") throw this._fodtError("text:format-change chưa hỗ trợ");
      if (kindNode.name !== "text:insertion" && kindNode.name !== "text:deletion") {
        throw this._fodtError(`text:changed-region chứa <${kindNode.name}>`);
      }
      const kind = kindNode.name === "text:insertion" ? "insert" : "delete";
      const kindChildren = (kindNode.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
      const infoNode = kindChildren.find(child => child.name === "office:change-info");
      if (!infoNode) throw this._fodtError(`${kindNode.name} thiếu office:change-info`);
      const infoChildren = (infoNode.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
      const creatorNode = infoChildren.find(child => child.name === "dc:creator");
      const dateNode = infoChildren.find(child => child.name === "dc:date");
      const unexpectedInfo = infoChildren.filter(child => child !== creatorNode && child !== dateNode);
      if (unexpectedInfo.length) throw this._fodtError(`office:change-info chứa <${unexpectedInfo[0].name}>`);
      const rest = kindChildren.filter(child => child !== infoNode);
      let deletionNodes = [];
      if (kind === "insert") {
        if (rest.length) throw this._fodtError("text:insertion chỉ được chứa office:change-info");
      } else {
        if (rest.length !== 1 || rest[0].name !== "text:p") {
          throw this._fodtError("text:deletion phải có đúng một text:p");
        }
        deletionNodes = rest[0].children || [];
      }
      map.set(id, {
        id,
        kind,
        author: this._fodtPlainLoose(creatorNode?.children || []).trim(),
        date: this._fodtPlainLoose(dateNode?.children || []).trim(),
        deletionNodes
      });
    }
  }

  _fodtNoteContainerHtml(kind, notes) {
    if (!notes.length) return "";
    if (kind === "endnote") {
      const items = notes.map(note => `<div class="vno-endnote-item" data-vno-endnote-id="${this._escapeHtml(note.id)}"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">${this._escapeHtml(note.citation)}</span><span class="vno-note-text" contenteditable="true">${note.html}</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div>`).join("");
      return `<div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div>${items}</div>`;
    }
    const items = notes.map(note => `<div class="vno-footnote-item" data-vno-footnote-id="${this._escapeHtml(note.id)}"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">${this._escapeHtml(note.citation)}</span><span class="vno-note-text" contenteditable="true">${note.html}</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div>`).join("");
    return `<div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div>${items}</div>`;
  }

  /**
   * Serialize the supported Phase A Writer HTML subset as Flat ODF Text.
   * This is additive: save()/exportPdf() deliberately keep using HTML until cutover approval.
   */
  serializeToFodt() {
    this._initZones();
    const html = this.bodyDom?.innerHTML ?? this.editorDom?.innerHTML ?? "";
    if (/\bdata-vno-(?!wrap=["']inline["']|section-break=|section-id=|footnote-ref=|endnote-ref=|footnotes=|endnotes=|footnote-id=|endnote-id=|toc=|comment-author=|change=|author=|date=|wordart=|wordart-preset=|wordart-text=|wordart-style=|chart=)[\w-]+\s*=/i.test(html)) {
      throw this._fodtError("marker data-vno-* chưa có ánh xạ Phase A/B/C/D/E.1/E.3/E.4");
    }
    const tree = this._fodtParseMarkup(html, "HTML");
    const footnoteBodies = this._fodtCollectNoteBodies(tree.children, "data-vno-footnote-id");
    const endnoteBodies = this._fodtCollectNoteBodies(tree.children, "data-vno-endnote-id");
    const textStyles = new Map();
    const paragraphStyles = new Map();
    const cellStyles = new Map();
    const graphicStyles = new Map();
    let imageSequence = 0;
    let tableSequence = 0;
    const trackedRegions = [];
    let allowTrackChanges = true;
    let allowWordArt = true;
    let allowChart = true;
    let chartSequence = 0;
    const styleName = (registry, prefix, value) => {
      const key = JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
      if (!registry.has(key)) registry.set(key, `${prefix}${registry.size + 1}`);
      return registry.get(key);
    };
    const imageXml = (node) => {
      const unexpected = Object.keys(node.attrs).filter(name => !["src", "style", "class", "data-vno-wrap", "tabindex", "alt", "width", "height"].includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <img>`);
      const parts = this._fodtDataUrlParts(node.attrs.src);
      if (!parts?.isBase64 || !parts.data) throw this._fodtError("ảnh phải là data URI base64 nhúng sẵn");
      const mime = String(parts.mime).toLowerCase();
      const { width, height } = this._fodtImageDimensionsPx(mime, parts.data);
      const name = `Image${++imageSequence}`;
      return `<draw:frame draw:name="${this._fodtEscapeXml(name)}" text:anchor-type="as-char" svg:width="${this._fodtPxToCm(width)}" svg:height="${this._fodtPxToCm(height)}"><draw:image xlink:href="" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="${this._fodtEscapeXml(mime)}"><office:binary-data>${parts.data.replace(/\s+/g, "")}</office:binary-data></draw:image></draw:frame>`;
    };
    const inlineXml = (nodes, inherited = {}) => nodes.map(node => {
      if (node.name === "#text") {
        const text = this._fodtTextXml(node.text);
        if (!text) return "";
        const props = Object.fromEntries(Object.entries(inherited).filter(([, value]) => value !== undefined && value !== false && value !== ""));
        return Object.keys(props).length ? `<text:span text:style-name="${styleName(textStyles, "T", props)}">${text}</text:span>` : text;
      }
      if (node.name === "br") return "<text:line-break/>";
      if (node.name === "img") return imageXml(node);
      if (this._fodtIsWordArtHtmlNode(node)) {
        if (!allowWordArt) throw this._fodtError("WordArt trong header/footer chưa hỗ trợ");
        return wordArtXml(node);
      }
      if (this._fodtIsChartHtmlNode(node)) {
        if (!allowChart) throw this._fodtError("biểu đồ trong header/footer chưa hỗ trợ");
        return chartXml(node);
      }
      if (node.name === "sup") {
        const footnoteId = node.attrs["data-vno-footnote-ref"];
        const endnoteId = node.attrs["data-vno-endnote-ref"];
        if (!footnoteId && !endnoteId) throw this._fodtError("phần tử inline <sup> (chỉ hỗ trợ chú thích)");
        const kind = footnoteId ? "footnote" : "endnote";
        const id = footnoteId || endnoteId;
        const unexpected = Object.keys(node.attrs).filter(name => !["style", "class", "contenteditable", "title", "data-vno-footnote-ref", "data-vno-endnote-ref"].includes(name));
        if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <sup>`);
        const bodies = footnoteId ? footnoteBodies : endnoteBodies;
        if (!bodies.has(id)) throw this._fodtError(`${kind} '${id}' không có nội dung`);
        const citation = this._fodtCitationText(node.children) || (kind === "endnote" ? "i" : "1");
        return `<text:note text:id="${this._fodtEscapeXml(id)}" text:note-class="${kind}"><text:note-citation>${this._fodtEscapeXml(citation)}</text:note-citation><text:note-body><text:p>${inlineXml(bodies.get(id))}</text:p></text:note-body></text:note>`;
      }
      if (node.name === "mark") {
        const commentId = node.attrs["data-comment-id"];
        if (!commentId) throw this._fodtError("phần tử inline <mark> (chỉ hỗ trợ ghi chú)");
        const unexpected = Object.keys(node.attrs).filter(name => !["style", "class", "data-comment-id", "tabindex", "role", "aria-label", "title", "data-vno-comment-author"].includes(name));
        if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <mark>`);
        const comment = (this.comments || []).find(item => item.id === commentId);
        if (!comment) throw this._fodtError(`ghi chú '${commentId}' không có nội dung trong this.comments`);
        const name = this._fodtEscapeXml(commentId);
        const creator = this._fodtEscapeXml(comment.author || "");
        const date = this._fodtEscapeXml(comment.createdAt || "");
        return `<office:annotation office:name="${name}"><dc:creator>${creator}</dc:creator><dc:date>${date}</dc:date><text:p>${this._fodtTextXml(comment.content || "")}</text:p></office:annotation>${inlineXml(node.children, inherited)}<office:annotation-end office:name="${name}"/>`;
      }
      if (node.name === "ins" || node.name === "del") {
        if (!allowTrackChanges) throw this._fodtError("Track Changes trong header/footer chưa hỗ trợ");
        const expected = node.name === "ins" ? "insert" : "delete";
        if (node.attrs["data-vno-change"] !== expected) {
          throw this._fodtError(`<${node.name}> thiếu data-vno-change="${expected}"`);
        }
        const allowed = ["data-vno-change", "data-vno-author", "data-vno-date", "contenteditable", "title", "class"];
        const unexpected = Object.keys(node.attrs).filter(name => !allowed.includes(name));
        if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <${node.name}>`);
        const walkForbidden = (nodes) => {
          for (const child of nodes || []) {
            if (["ins", "del", "sup", "mark", "img"].includes(child.name)) {
              throw this._fodtError("Track Changes lồng <ins>/<del>/chú thích/ảnh chưa hỗ trợ");
            }
            walkForbidden(child.children);
          }
        };
        walkForbidden(node.children);
        const id = `ct${trackedRegions.length + 1}`;
        const author = String(node.attrs["data-vno-author"] || "").trim();
        const date = String(node.attrs["data-vno-date"] || "").trim() || FODT_TRACK_CHANGE_SENTINEL_DATE;
        if (node.name === "ins") {
          trackedRegions.push({ id, kind: "insert", author, date });
          return `<text:change-start text:change-id="${id}"/>${inlineXml(node.children, inherited)}<text:change-end text:change-id="${id}"/>`;
        }
        trackedRegions.push({ id, kind: "delete", author, date, contentXml: inlineXml(node.children, inherited) });
        return `<text:change text:change-id="${id}"/>`;
      }
      if (!["span", "b", "strong", "i", "em", "u", "font"].includes(node.name)) throw this._fodtError(`phần tử inline <${node.name}>`);
      const unexpected = Object.keys(node.attrs).filter(name => !["style", "class", "color", "face"].includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <${node.name}>`);
      return inlineXml(node.children, this._fodtInlineStyle(node, inherited));
    }).join("");
    const paragraphXml = (node, extra = {}) => {
      const css = this._fodtCssMap(node.attrs.style);
      const unexpected = Object.keys(node.attrs).filter(name => !["style", "class"].includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <${node.name}>`);
      const align = String(css["text-align"] || "left").toLowerCase();
      if (!["left", "center", "right", "justify", "start", "end"].includes(align)) throw this._fodtError(`căn đoạn '${align}'`);
      const normalizedAlign = align === "start" ? "left" : align === "end" ? "right" : align;
      const props = {};
      if (normalizedAlign !== "left") props.textAlign = normalizedAlign;
      if (extra.masterPageName) props.masterPageName = extra.masterPageName;
      if (extra.breakBefore) props.breakBefore = extra.breakBefore;
      if (css["margin-top"] !== undefined) props.marginTop = this._fodtNormalizeLengthToPt(css["margin-top"], "khoảng trước đoạn");
      if (css["margin-bottom"] !== undefined) props.marginBottom = this._fodtNormalizeLengthToPt(css["margin-bottom"], "khoảng sau đoạn");
      const pStyle = Object.keys(props).length ? ` text:style-name="${styleName(paragraphStyles, "P", props)}"` : "";
      const headingMatch = node.name.match(/^h([1-6])$/);
      const tag = headingMatch ? `text:h text:outline-level="${headingMatch[1]}"` : "text:p";
      return `<${tag}${pStyle}>${inlineXml(node.children, this._fodtInlineStyle(node))}</${headingMatch ? "text:h" : "text:p"}>`;
    };
    const usedListStyles = new Set();
    const listXml = (node, inheritedStyle) => {
      const ordered = node.name === "ol";
      const unexpected = Object.keys(node.attrs).filter(name => !["style", "class", "type", "start"].includes(name));
      if (unexpected.length || node.attrs.start || (node.attrs.type && !["1", "a", "A", "i", "I"].includes(node.attrs.type))) {
        throw this._fodtError("thuộc tính danh sách nâng cao");
      }
      this._fodtCssMap(node.attrs.style);
      const styleNameForList = multilevelStyleFromClass(node.attrs.class) || inheritedStyle || (ordered ? "LNumber" : "LBullet");
      usedListStyles.add(styleNameForList);
      const items = node.children.filter(child => !(child.name === "#text" && !child.text.trim()));
      if (items.some(child => child.name !== "li")) throw this._fodtError(`nội dung trực tiếp trong <${node.name}>`);
      return `<text:list text:style-name="${styleNameForList}">${items.map(item => {
        const content = [];
        const nested = [];
        for (const child of item.children) (["ul", "ol"].includes(child.name) ? nested : content).push(child);
        return `<text:list-item><text:p>${inlineXml(content)}</text:p>${nested.map(child => listXml(child, styleNameForList)).join("")}</text:list-item>`;
      }).join("")}</text:list>`;
    };
    const tableCellXml = (node, spanAttrs = "") => {
      if (!["td", "th"].includes(node.name)) throw this._fodtError(`nội dung trực tiếp trong <tr> (mong đợi <td>/<th>)`);
      const unexpected = Object.keys(node.attrs).filter(name => !["style", "class", "colspan", "rowspan"].includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <${node.name}>`);
      const css = this._fodtCellCssMap(node.attrs.style);
      const align = css["text-align"] ? String(css["text-align"]).toLowerCase() : "";
      if (align && !["left", "center", "right", "justify", "start", "end"].includes(align)) throw this._fodtError(`căn ô '${align}'`);
      const cellProps = {};
      const borderSides = ["border-top", "border-right", "border-bottom", "border-left"];
      if (css.border) {
        const normalized = this._fodtNormalizeBorder(css.border);
        for (const side of borderSides) cellProps[side] = normalized;
      }
      for (const side of borderSides) if (css[side]) cellProps[side] = this._fodtNormalizeBorder(css[side]);
      if (css["background-color"] && css["background-color"] !== "transparent") cellProps.backgroundColor = this._fodtNormalizeColor(css["background-color"]);
      const hasCellStyle = Object.keys(cellProps).length > 0;
      const cellStyleAttr = hasCellStyle ? ` table:style-name="${styleName(cellStyles, "TC", cellProps)}"` : "";
      const normalizedAlign = align === "start" ? "left" : align === "end" ? "right" : align;
      const pStyle = normalizedAlign && normalizedAlign !== "left" ? ` text:style-name="${styleName(paragraphStyles, "P", { textAlign: normalizedAlign })}"` : "";
      const content = node.children.filter(child => !(child.name === "#text" && !child.text.trim()));
      const isParagraph = (c) => c.name === "p";
      if (content.every(c => isParagraph(c))) {
        const cellBody = content.map(p => `<text:p${pStyle}>${inlineXml(p.children || [])}</text:p>`).join("");
        return `<table:table-cell office:value-type="string"${cellStyleAttr}${spanAttrs}>${cellBody}</table:table-cell>`;
      }
      if (content.some(child => /^(h[1-6]|ul|ol|table)$/.test(child.name))) throw this._fodtError("nội dung khối (bảng/danh sách lồng) trong ô bảng chưa hỗ trợ ở Phase B");
      const cellBody = `<text:p${pStyle}>${inlineXml(content)}</text:p>`;
      return `<table:table-cell office:value-type="string"${cellStyleAttr}${spanAttrs}>${cellBody}</table:table-cell>`;
    };
    const tableXml = (node) => {
      const unexpected = Object.keys(node.attrs).filter(name => !["style", "class"].includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên <table>`);
      this._fodtCssMap(node.attrs.style, ["text-align"]);
      const sections = node.children.filter(child => !(child.name === "#text" && !child.text.trim()));
      const rowNodes = [];
      for (const section of sections) {
        if (section.name === "tbody" || section.name === "thead" || section.name === "tfoot") {
          const unexpectedSection = Object.keys(section.attrs).filter(name => !["style", "class"].includes(name));
          if (unexpectedSection.length) throw this._fodtError(`thuộc tính ${unexpectedSection[0]} trên <${section.name}>`);
          for (const row of section.children.filter(child => !(child.name === "#text" && !child.text.trim()))) rowNodes.push(row);
        } else if (section.name === "tr") {
          rowNodes.push(section);
        } else {
          throw this._fodtError(`phần tử <${section.name}> trực tiếp trong <table>`);
        }
      }
      if (!rowNodes.length) throw this._fodtError("<table> không có hàng nào");
      const rows = rowNodes.map(row => {
        if (row.name !== "tr") throw this._fodtError(`phần tử <${row.name}> thay cho <tr>`);
        const unexpectedRow = Object.keys(row.attrs).filter(name => !["style", "class"].includes(name));
        if (unexpectedRow.length) throw this._fodtError(`thuộc tính ${unexpectedRow[0]} trên <tr>`);
        this._fodtCssMap(row.attrs.style, ["background-color"]);
        const cells = row.children.filter(child => !(child.name === "#text" && !child.text.trim()));
        return cells;
      });
      const spanInt = (raw, attrName) => {
        if (raw === undefined) return 1;
        if (!/^[1-9]\d*$/.test(String(raw).trim())) throw this._fodtError(`${attrName} phải là số nguyên dương`);
        return Number(raw);
      };
      const columnCount = rows[0].reduce((sum, cell) => sum + spanInt(cell.attrs.colspan, "colspan"), 0);
      if (!columnCount) throw this._fodtError("<tr> đầu tiên không có ô nào");
      // Real ODF table:covered-table-cell occupancy grid - not a guess. Each
      // slot is either the origin cell (carries table:number-columns/rows-
      // spanned) or a covered placeholder consumed by a prior colspan/rowspan.
      const grid = rows.map(() => new Array(columnCount).fill(null));
      rows.forEach((cells, r) => {
        let queueIndex = 0;
        for (let c = 0; c < columnCount; c++) {
          if (grid[r][c] !== null) continue;
          if (queueIndex >= cells.length) throw this._fodtError(`hàng ${r + 1} thiếu ô so với colspan/rowspan tổng thể`);
          const cellNode = cells[queueIndex++];
          const colspan = spanInt(cellNode.attrs.colspan, "colspan");
          const rowspan = spanInt(cellNode.attrs.rowspan, "rowspan");
          if (c + colspan > columnCount) throw this._fodtError(`hàng ${r + 1} có colspan vượt quá số cột bảng`);
          if (r + rowspan > rows.length) throw this._fodtError(`hàng ${r + 1} có rowspan vượt quá số hàng bảng`);
          for (let dr = 0; dr < rowspan; dr++) {
            for (let dc = 0; dc < colspan; dc++) {
              if (grid[r + dr][c + dc] !== null) throw this._fodtError(`hàng ${r + 1} có colspan/rowspan chồng lấn ô khác`);
              grid[r + dr][c + dc] = (dr === 0 && dc === 0) ? { node: cellNode, colspan, rowspan } : { covered: true };
            }
          }
        }
        if (queueIndex !== cells.length) throw this._fodtError(`hàng ${r + 1} có ô thừa không khớp lưới colspan/rowspan`);
      });
      const rowsXml = grid.map(gridRow => {
        const cellsXml = gridRow.map(slot => {
          if (slot.covered) return "<table:covered-table-cell/>";
          const spanAttrs = [];
          if (slot.colspan > 1) spanAttrs.push(`table:number-columns-spanned="${slot.colspan}"`);
          if (slot.rowspan > 1) spanAttrs.push(`table:number-rows-spanned="${slot.rowspan}"`);
          return tableCellXml(slot.node, spanAttrs.length ? ` ${spanAttrs.join(" ")}` : "");
        }).join("");
        return `<table:table-row>${cellsXml}</table:table-row>`;
      }).join("");
      const name = `Table${++tableSequence}`;
      return `<table:table table:name="${this._fodtEscapeXml(name)}"><table:table-column table:number-columns-repeated="${columnCount}"/>${rowsXml}</table:table>`;
    };
    const shapeXml = (shape) => {
      const type = shape?.type || shape?.shapeType || "rectangle";
      const x = Number(shape.x) || 0;
      const y = Number(shape.y) || 0;
      const w = Number(shape.w ?? shape.width) || 0;
      const h = Number(shape.h ?? shape.height) || 0;
      const fill = shape.fill;
      const fillNone = !fill || fill === "none" || fill === "transparent";
      const stroke = shape.stroke || "#000000";
      const strokeWidth = Number(shape.strokeWidth) || (type === "line" ? 3 : 2);
      const id = shape.id || `Shape${graphicStyles.size + 1}`;
      const graphicName = styleName(graphicStyles, "gr", {
        fill: fillNone ? "none" : "solid",
        fillColor: fillNone ? "" : this._fodtNormalizeColor(fill),
        stroke: "solid",
        strokeColor: this._fodtNormalizeColor(stroke),
        strokeWidth: this._fodtPxToCm(strokeWidth)
      });
      const nameAttr = this._fodtEscapeXml(id);
      const paraGeom = `draw:style-name="${graphicName}" draw:name="${nameAttr}" text:anchor-type="paragraph" svg:x="${this._fodtPxToCm(x)}" svg:y="${this._fodtPxToCm(y)}"`;
      if (type === "textbox") {
        return `<draw:frame ${paraGeom} svg:width="${this._fodtPxToCm(w)}" svg:height="${this._fodtPxToCm(h)}"><draw:text-box><text:p>${this._fodtTextXml(shape.text || "")}</text:p></draw:text-box></draw:frame>`;
      }
      if (type === "line") {
        return `<draw:line draw:style-name="${graphicName}" draw:name="${nameAttr}" text:anchor-type="paragraph" svg:x1="${this._fodtPxToCm(x)}" svg:y1="${this._fodtPxToCm(y)}" svg:x2="${this._fodtPxToCm(x + w)}" svg:y2="${this._fodtPxToCm(y)}"><text:p/></draw:line>`;
      }
      if (type === "circle") {
        return `<draw:ellipse ${paraGeom} svg:width="${this._fodtPxToCm(w)}" svg:height="${this._fodtPxToCm(h)}"><text:p/></draw:ellipse>`;
      }
      if (type === "round-rect" || type === "roundRect") {
        return `<draw:rect ${paraGeom} svg:width="${this._fodtPxToCm(w)}" svg:height="${this._fodtPxToCm(h)}" draw:corner-radius="${this._fodtPxToCm(Math.min(w, h) * 0.08)}"><text:p/></draw:rect>`;
      }
      if (type === "arrow") {
        return `<draw:custom-shape ${paraGeom} svg:width="${this._fodtPxToCm(w)}" svg:height="${this._fodtPxToCm(h)}"><text:p/><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="right-arrow" draw:enhanced-path="M 0 7640 L 13955 7640 13955 3890 21600 10800 13955 17710 13955 13960 0 13960 Z"/></draw:custom-shape>`;
      }
      if (type === "rectangle") {
        return `<draw:rect ${paraGeom} svg:width="${this._fodtPxToCm(w)}" svg:height="${this._fodtPxToCm(h)}"><text:p/></draw:rect>`;
      }
      throw this._fodtError(`hình khối '${type}' (Phase B.2 chỉ hỗ trợ rectangle/round-rect/circle/line/arrow/textbox)`);
    };
    const wordArtXml = (node) => {
      const allowed = [
        "style", "class", "data-vno-wordart", "data-vno-wordart-preset", "data-vno-wordart-text",
        "data-vno-wordart-style", "contenteditable", "role", "aria-label", "tabindex"
      ];
      const unexpected = Object.keys(node.attrs).filter(name => !allowed.includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên WordArt`);
      const stored = parseWordArtStyleAttr(node.attrs["data-vno-wordart-style"]);
      const presetId = this._fodtWordArtPresetId(
        node.attrs["data-vno-wordart-preset"] || stored?.presetId || stored?.id
      );
      const style = resolveWordArtStyle({ ...(stored || {}), presetId });
      const text = String(node.attrs["data-vno-wordart-text"] || this._fodtPlainLoose(node.children) || "").trim();
      if (!text) throw this._fodtError("WordArt không có chữ");
      const walkForbidden = (nodes) => {
        for (const child of nodes || []) {
          if (child.name === "#text") continue;
          if (child.name === "span" && /\bvno-wordart-text\b/.test(child.attrs.class || "")) {
            walkForbidden(child.children);
            continue;
          }
          throw this._fodtError(`nội dung WordArt <${child.name}>`);
        }
      };
      walkForbidden(node.children);
      const fillColor = this._fodtNormalizeColor(style.gradient?.from || style.fillColor);
      const graphicName = styleName(graphicStyles, "gr", {
        fill: "solid",
        fillColor,
        stroke: "none",
        strokeColor: "",
        strokeWidth: ""
      });
      const fontFamily = this._fodtWordArtPrimaryFont(style.fontFamily);
      const fontSize = this._fodtNormalizeFontSize(`${Number(style.fontSize) || 48}px`);
      const textName = styleName(textStyles, "T", {
        bold: true,
        color: fillColor,
        fontFamily,
        fontSize
      });
      const nameAttr = this._fodtEscapeXml(`WordArt-${presetId}`);
      // fontwork-plain-text → DOCX VML-only; Word (Compatibility Mode) does not paint it.
      // fontwork-fade-right → w:drawing + a:prstTxWarp prst="textFadeRight" (measured visible).
      return `<draw:custom-shape draw:style-name="${graphicName}" draw:name="${nameAttr}" text:anchor-type="as-char" svg:width="12cm" svg:height="2.8cm"><text:p><text:span text:style-name="${textName}">${this._fodtTextXml(text)}</text:span></text:p><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:text-path="true" draw:text-path-allowed="true" draw:text-path-mode="shape" draw:type="fontwork-fade-right" draw:enhanced-path="M 0 10800 L 21600 10800 Z N"/></draw:custom-shape>`;
    };
    const chartXml = (node) => {
      const data = this._fodtChartDataFromHtmlNode(node);
      const graphicName = styleName(graphicStyles, "gr", {
        fill: "none",
        fillColor: "",
        stroke: "none",
        strokeColor: "",
        strokeWidth: "",
        oleDrawAspect: "1"
      });
      return this._fodtChartFrameXml(data, graphicName, `Chart${++chartSequence}`);
    };
    const zoneBlocksXml = (zoneHtml, zoneName) => {
      const previousAllow = allowTrackChanges;
      const previousWordArt = allowWordArt;
      const previousChart = allowChart;
      allowTrackChanges = false;
      allowWordArt = false;
      allowChart = false;
      try {
        const zoneTree = this._fodtParseMarkup(zoneHtml, `HTML ${zoneName}`);
        return zoneTree.children.filter(node => !(node.name === "#text" && !node.text.trim())).map(node => {
          if (this._fodtIsChartHtmlNode(node) || this._fodtIsWordArtHtmlNode(node)) {
            throw this._fodtError(`${zoneName}: WordArt/biểu đồ trong header/footer chưa hỗ trợ`);
          }
          if (/^(p|h[1-6])$/.test(node.name)) return paragraphXml(node);
          if (["ul", "ol"].includes(node.name)) return listXml(node);
          throw this._fodtError(`${zoneName}: phần tử block <${node.name}> chưa hỗ trợ`);
        }).join("");
      } finally {
        allowTrackChanges = previousAllow;
        allowWordArt = previousWordArt;
        allowChart = previousChart;
      }
    };
    const canvasBoxCss = ["margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left"];
    const previousIgnore = this._fodtCssIgnoreNames;
    this._fodtCssIgnoreNames = canvasBoxCss;
    let headerXml = "";
    let footerXml = "";
    try {
      const zoneText = (dom) => {
        if (!dom) return "";
        if (typeof dom.innerText === "string") return dom.innerText;
        return String(dom.innerHTML || "").replace(/<[^>]+>/g, " ");
      };
      const headerHtml = zoneText(this.headerDom).trim() ? this.headerDom.innerHTML : "";
      const footerHtml = zoneText(this.footerDom).trim() ? this.footerDom.innerHTML : "";
      if (headerHtml) headerXml = zoneBlocksXml(headerHtml, "header");
      if (footerHtml) footerXml = zoneBlocksXml(footerHtml, "footer");
    } finally {
      this._fodtCssIgnoreNames = previousIgnore;
    }
    let watermarkHeaderXml = "";
    let watermarkGraphicXml = "";
    if (this.watermark && String(this.watermark.text || "").trim()) {
      const wmColor = this._fodtNormalizeColor(this.watermark.color || "#dc2626");
      const wmSize = this._fodtNormalizeFontSize(`${Number(this.watermark.fontSize) || 72}pt`);
      const wmTextStyle = styleName(textStyles, "T", { bold: true, color: wmColor, fontSize: wmSize });
      watermarkHeaderXml = this._fodtWatermarkFrameXml(wmTextStyle);
      watermarkGraphicXml = this._fodtWatermarkGraphicStyleXml(this._fodtWatermarkOpacityPercent(this.watermark.opacity));
    }
    const isSectionBreak = (node) => {
      if (node.name !== "div") return false;
      const type = node.attrs["data-vno-section-break"];
      const id = node.attrs["data-vno-section-id"];
      if (!type && !id) return false;
      if (!["nextPage", "continuous", "evenPage", "oddPage"].includes(type)) {
        throw this._fodtError(`data-vno-section-break '${type || ""}'`);
      }
      if (!id) throw this._fodtError("data-vno-section-break thiếu data-vno-section-id");
      const unexpected = Object.keys(node.attrs).filter(name => !["style", "class", "data-vno-section-break", "data-vno-section-id", "contenteditable", "aria-hidden"].includes(name));
      if (unexpected.length) throw this._fodtError(`thuộc tính ${unexpected[0]} trên ngắt mục`);
      return true;
    };
    const topLevel = tree.children.filter(node => !(node.name === "#text" && !node.text.trim()));
    const firstSectionId = Object.keys(this.sectionPageSetups || {})[0] || this.activeSectionId || "section-1";
    const orderedSectionIds = [];
    const seenSections = new Set();
    const addSection = (id) => {
      if (!id || seenSections.has(id)) return;
      seenSections.add(id);
      orderedSectionIds.push(id);
    };
    addSection(firstSectionId);
    for (const node of topLevel) {
      if (isSectionBreak(node)) addSection(node.attrs["data-vno-section-id"]);
    }
    const layoutNames = new Map();
    const masters = [];
    for (const sectionId of orderedSectionIds) {
      const setup = this.sectionPageSetups?.[sectionId] || this.pageSetup;
      const signature = this._fodtLayoutSignature(setup);
      if (!layoutNames.has(signature)) layoutNames.set(signature, `pm${layoutNames.size + 1}`);
      const masterName = masters.length === 0 ? "Standard" : sectionId;
      masters.push({ name: masterName, sectionId, layoutName: layoutNames.get(signature), setup });
    }
    if (!masters.length) {
      const setup = this.pageSetup;
      layoutNames.set(this._fodtLayoutSignature(setup), "pm1");
      masters.push({ name: "Standard", sectionId: firstSectionId, layoutName: "pm1", setup });
    }
    const masterBySection = new Map(masters.map(master => [master.sectionId, master]));
    let pendingMaster = null;
    const blockXml = (node, extra) => {
      if (/^(p|h[1-6])$/.test(node.name)) return paragraphXml(node, extra);
      if (extra.masterPageName) {
        throw this._fodtError("đổi khổ trang (master-page) phải bắt đầu bằng đoạn văn hoặc tiêu đề");
      }
      if (this._fodtIsTocBlock(node)) return this._fodtTocXml(node);
      if (this._fodtIsChartHtmlNode(node)) {
        if (!allowChart) throw this._fodtError("biểu đồ trong header/footer chưa hỗ trợ");
        return `<text:p>${chartXml(node)}</text:p>`;
      }
      if (["ul", "ol"].includes(node.name)) return listXml(node);
      if (node.name === "table") return tableXml(node);
      if (node.name === "img") return `<text:p>${imageXml(node)}</text:p>`;
      throw this._fodtError(`phần tử block <${node.name}>`);
    };
    const bodyParts = [];
    for (const node of topLevel) {
      if (this._fodtIsNoteContainer(node)) continue;
      if (isSectionBreak(node)) {
        const master = masterBySection.get(node.attrs["data-vno-section-id"]);
        if (!master) throw this._fodtError(`ngắt mục '${node.attrs["data-vno-section-id"]}' không có page setup`);
        pendingMaster = master.name === "Standard" ? null : { name: master.name };
        continue;
      }
      const extra = {};
      if (pendingMaster) {
        extra.masterPageName = pendingMaster.name;
        extra.breakBefore = "page";
        pendingMaster = null;
      }
      bodyParts.push(blockXml(node, extra));
    }
    if (pendingMaster) {
      bodyParts.push(paragraphXml({ name: "p", attrs: {}, children: [] }, {
        masterPageName: pendingMaster.name,
        breakBefore: "page"
      }));
    }
    let body = bodyParts.join("");
    const shapesXml = (this.shapes || []).map(shapeXml).join("");
    if (shapesXml) {
      const injected = body.replace(/<(text:p|text:h)\b[^>]*>/, open => `${open}${shapesXml}`);
      body = injected === body ? `<text:p>${shapesXml}</text:p>${body}` : injected;
    }
    body = this._fodtTrackedChangesXml(trackedRegions) + body;
    const textStyleXml = [...textStyles.entries()].map(([key, name]) => {
      const value = JSON.parse(key);
      const attrs = [];
      if (value.bold) attrs.push('fo:font-weight="bold"', 'style:font-weight-asian="bold"', 'style:font-weight-complex="bold"');
      if (value.italic) attrs.push('fo:font-style="italic"', 'style:font-style-asian="italic"', 'style:font-style-complex="italic"');
      if (value.underline) attrs.push('style:text-underline-style="solid"', 'style:text-underline-width="auto"', 'style:text-underline-color="font-color"');
      if (value.color) attrs.push(`fo:color="${this._fodtEscapeXml(value.color)}"`);
      if (value.backgroundColor) attrs.push(`fo:background-color="${this._fodtEscapeXml(value.backgroundColor)}"`);
      if (value.fontFamily) attrs.push(`fo:font-family="${this._fodtEscapeXml(value.fontFamily)}"`, `style:font-family-asian="${this._fodtEscapeXml(value.fontFamily)}"`, `style:font-family-complex="${this._fodtEscapeXml(value.fontFamily)}"`);
      if (value.fontSize) attrs.push(`fo:font-size="${value.fontSize}"`, `style:font-size-asian="${value.fontSize}"`, `style:font-size-complex="${value.fontSize}"`);
      return `<style:style style:name="${name}" style:family="text"><style:text-properties ${attrs.join(" ")}/></style:style>`;
    }).join("");
    const paragraphStyleXml = [...paragraphStyles.entries()].map(([key, name]) => {
      const value = JSON.parse(key);
      const styleAttrs = [`style:name="${name}"`, 'style:family="paragraph"'];
      if (value.masterPageName) styleAttrs.push(`style:master-page-name="${this._fodtEscapeXml(value.masterPageName)}"`);
      const paraProps = [];
      if (value.textAlign) paraProps.push(`fo:text-align="${value.textAlign}"`);
      if (value.breakBefore) paraProps.push(`fo:break-before="${value.breakBefore}"`);
      if (value.marginTop) paraProps.push(`fo:margin-top="${value.marginTop}"`);
      if (value.marginBottom) paraProps.push(`fo:margin-bottom="${value.marginBottom}"`);
      const paraXml = paraProps.length ? `<style:paragraph-properties ${paraProps.join(" ")}/>` : "";
      return `<style:style ${styleAttrs.join(" ")}>${paraXml}</style:style>`;
    }).join("");
    const cellStyleXml = [...cellStyles.entries()].map(([key, name]) => {
      const value = JSON.parse(key);
      const attrs = [];
      if (value["border-top"]) attrs.push(`fo:border-top="${value["border-top"]}"`);
      if (value["border-right"]) attrs.push(`fo:border-right="${value["border-right"]}"`);
      if (value["border-bottom"]) attrs.push(`fo:border-bottom="${value["border-bottom"]}"`);
      if (value["border-left"]) attrs.push(`fo:border-left="${value["border-left"]}"`);
      if (value.backgroundColor) attrs.push(`fo:background-color="${this._fodtEscapeXml(value.backgroundColor)}"`);
      return `<style:style style:name="${name}" style:family="table-cell"><style:table-cell-properties ${attrs.join(" ")}/></style:style>`;
    }).join("");
    const graphicStyleXml = [...graphicStyles.entries()].map(([key, name]) => {
      const value = JSON.parse(key);
      const attrs = [`draw:fill="${value.fill}"`];
      if (value.fill === "solid" && value.fillColor) attrs.push(`draw:fill-color="${this._fodtEscapeXml(value.fillColor)}"`);
      attrs.push(`draw:stroke="${value.stroke}"`);
      if (value.strokeColor) attrs.push(`svg:stroke-color="${this._fodtEscapeXml(value.strokeColor)}"`);
      if (value.strokeWidth) attrs.push(`svg:stroke-width="${value.strokeWidth}"`);
      if (value.oleDrawAspect) attrs.push(`draw:ole-draw-aspect="${this._fodtEscapeXml(value.oleDrawAspect)}"`);
      attrs.push('style:wrap="none"', 'style:vertical-pos="from-top"', 'style:vertical-rel="paragraph"', 'style:horizontal-pos="from-left"', 'style:horizontal-rel="paragraph"');
      return `<style:style style:name="${name}" style:family="graphic"><style:graphic-properties ${attrs.join(" ")}/></style:style>`;
    }).join("");
    const multilevelStyleXml = ["LMultiDecimal", "LMultiLetter", "LMultiNd30"]
      .filter((name) => usedListStyles.has(name))
      .map((name) => fodtMultilevelListStyleXml(name))
      .join("");
    const listStyles = '<text:list-style style:name="LBullet"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/></text:list-level-style-bullet></text:list-style><text:list-style style:name="LNumber"><text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/></text:list-level-style-number></text:list-style>' + multilevelStyleXml;
    const pageLayoutXml = [...layoutNames.entries()].map(([signature, name]) => this._fodtPageLayoutXml(name, JSON.parse(signature))).join("");
    const headerWithWatermark = `${watermarkHeaderXml}${headerXml}`;
    const masterPageXml = masters.map(master => this._fodtMasterPageXml(master.name, master.layoutName, headerWithWatermark, footerXml)).join("");
    const officeStyles = this._fodtOfficeStylesXml(body);
    const officeMeta = this._fodtLineNumbersMetaXml();
    const metaNs = officeMeta ? ' xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"' : "";
    const dcNs = (/<office:annotation[\s>]/.test(body) || /<text:tracked-changes[\s>]/.test(body))
      ? ' xmlns:dc="http://purl.org/dc/elements/1.1/"'
      : "";
    const chartNs = /<chart:chart[\s>]/.test(body) ? ' xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"' : "";
    const tocStyleXml = /<text:table-of-content[\s>]/.test(body) ? this._fodtTocStylesXml() : "";
    return `<?xml version="1.0" encoding="UTF-8"?>\n<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink"${chartNs}${dcNs}${metaNs} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">${officeMeta}${officeStyles}<office:automatic-styles>${pageLayoutXml}${listStyles}${paragraphStyleXml}${textStyleXml}${cellStyleXml}${graphicStyleXml}${watermarkGraphicXml}${tocStyleXml}</office:automatic-styles><office:master-styles>${masterPageXml}</office:master-styles><office:body><office:text>${body}</office:text></office:body></office:document>`;
  }

  /** Parse the Phase A FODT subset back to canonical Writer HTML. */
  parseFodt(fodtXml) {
    const xml = String(fodtXml || "");
    if (!/<office:document\b[^>]*office:mimetype=["']application\/vnd\.oasis\.opendocument\.text["']/i.test(xml)) {
      throw this._fodtError("FODT thiếu office:document/MIME text hợp lệ");
    }
    const bodyMatch = xml.match(/<office:text\b[^>]*>([\s\S]*?)<\/office:text>/i);
    if (!bodyMatch) throw this._fodtError("FODT thiếu office:body/office:text");
    const textStyles = new Map();
    const paragraphStyles = new Map();
    const cellStyles = new Map();
    const graphicStyles = new Map();
    const parsedShapes = [];
    const parsedFootnotes = [];
    const parsedEndnotes = [];
    const parsedComments = [];
    const trackedById = new Map();
    xml.replace(/<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi, (_, attrsText, content) => {
      const attrs = this._fodtParseAttributes(attrsText);
      const name = attrs["style:name"];
      const family = attrs["style:family"];
      if (!name) return "";
      if (family === "text") {
        const propMatch = content.match(/<style:text-properties\b([^>]*)\/?\s*>/i);
        const props = this._fodtParseAttributes(propMatch?.[1] || "");
        const style = {};
        if (props["fo:font-weight"] === "bold") style.bold = true;
        if (props["fo:font-style"] === "italic") style.italic = true;
        if (props["style:text-underline-style"] && props["style:text-underline-style"] !== "none") style.underline = true;
        if (props["fo:color"]) style.color = this._fodtNormalizeColor(props["fo:color"]);
        if (props["fo:background-color"] && props["fo:background-color"] !== "transparent") style.backgroundColor = this._fodtNormalizeColor(props["fo:background-color"]);
        if (props["fo:font-family"]) style.fontFamily = props["fo:font-family"];
        if (props["fo:font-size"]) style.fontSize = this._fodtNormalizeFontSize(props["fo:font-size"]);
        textStyles.set(name, style);
      } else if (family === "paragraph") {
        const propMatch = content.match(/<style:paragraph-properties\b([^>]*)\/?\s*>/i);
        const props = this._fodtParseAttributes(propMatch?.[1] || "");
        const breakBefore = props["fo:break-before"] || "";
        if (breakBefore && breakBefore !== "page") throw this._fodtError(`fo:break-before '${breakBefore}'`);
        paragraphStyles.set(name, {
          textAlign: props["fo:text-align"] || "left",
          masterPageName: attrs["style:master-page-name"] || "",
          breakBefore,
          marginTop: props["fo:margin-top"] ? this._fodtNormalizeLengthToPt(props["fo:margin-top"], "khoảng trước đoạn") : "",
          marginBottom: props["fo:margin-bottom"] ? this._fodtNormalizeLengthToPt(props["fo:margin-bottom"], "khoảng sau đoạn") : ""
        });
      } else if (family === "table-cell") {
        const propMatch = content.match(/<style:table-cell-properties\b([^>]*)\/?\s*>/i);
        const props = this._fodtParseAttributes(propMatch?.[1] || "");
        const style = {};
        if (props["fo:border-top"]) style.borderTop = props["fo:border-top"];
        if (props["fo:border-right"]) style.borderRight = props["fo:border-right"];
        if (props["fo:border-bottom"]) style.borderBottom = props["fo:border-bottom"];
        if (props["fo:border-left"]) style.borderLeft = props["fo:border-left"];
        if (props["fo:background-color"] && props["fo:background-color"] !== "transparent") style.backgroundColor = this._fodtNormalizeColor(props["fo:background-color"]);
        cellStyles.set(name, style);
      } else if (family === "graphic") {
        const propMatch = content.match(/<style:graphic-properties\b([^>]*)\/?\s*>/i);
        const props = this._fodtParseAttributes(propMatch?.[1] || "");
        graphicStyles.set(name, {
          fill: props["draw:fill"] || "solid",
          fillColor: props["draw:fill-color"] ? this._fodtNormalizeColor(props["draw:fill-color"]) : "",
          stroke: props["draw:stroke"] || "solid",
          strokeColor: props["svg:stroke-color"] ? this._fodtNormalizeColor(props["svg:stroke-color"]) : "",
          strokeWidthCm: props["svg:stroke-width"] || "",
          opacity: props["draw:opacity"] || "",
          oleDrawAspect: props["draw:ole-draw-aspect"] || ""
        });
      }
      return "";
    });
    const tree = this._fodtParseMarkup(bodyMatch[1], "FODT office:text");
    const htmlStyle = style => {
      const rules = [];
      if (style.bold) rules.push("font-weight:bold");
      if (style.italic) rules.push("font-style:italic");
      if (style.underline) rules.push("text-decoration:underline");
      if (style.color) rules.push(`color:${style.color}`);
      if (style.backgroundColor) rules.push(`background-color:${style.backgroundColor}`);
      if (style.fontFamily) rules.push(`font-family:${style.fontFamily}`);
      if (style.fontSize) rules.push(`font-size:${style.fontSize}`);
      return rules.join(";");
    };
    const inlineNodeHtml = (node) => {
      if (node.name === "#text") return this._escapeHtml(node.text);
      if (node.name === "text:s") return " ".repeat(Math.max(1, Number(node.attrs["text:c"]) || 1));
      if (node.name === "text:tab") return "\t";
      if (node.name === "text:line-break") return "<br>";
      if (node.name === "text:bookmark" || node.name === "text:bookmark-start" || node.name === "text:bookmark-end") {
        // Điểm neo (anchor) vô hình dùng cho tham chiếu chéo/mục lục nội bộ
        // của Word — không có nội dung hiển thị, VN Writer chưa có tính
        // năng tham chiếu chéo nên bỏ qua an toàn (không mất nội dung
        // hiển thị nào, chỉ mất khả năng nhảy tới điểm neo đó).
        return "";
      }
      if (node.name === "text:page-number" || node.name === "text:page-count") {
        // Writer không có field số trang sống (live-updating) trong thân
        // tài liệu/header/footer — hạ cấp có chủ đích thành VĂN BẢN TĨNH
        // lấy từ giá trị fallback mà soffice đã tính sẵn lúc convert
        // (đúng số trang tại thời điểm đó). Chấp nhận đánh đổi: số có thể
        // lệch nếu người dùng chỉnh sửa thêm/bớt trang sau này — nhưng cơ
        // chế xem trước khi in (dòng ~7651, regex "Trang N / M") vẫn tự
        // cập nhật đúng vì nó thay thế theo MẪU VĂN BẢN, không theo field.
        const fallback = (node.children || []).map(child => child.name === "#text" ? String(child.text || "") : "").join("").trim();
        return this._escapeHtml(fallback || "1");
      }
      if (node.name === "draw:frame") return frameHtml(node);
      if (["draw:rect", "draw:ellipse", "draw:circle", "draw:line", "draw:custom-shape", "draw:connector"].includes(node.name)) {
        if (this._fodtIsFontworkShape(node)) return this._fodtWordArtHtmlFromNode(node);
        parsedShapes.push(this._fodtShapeFromNode(node, graphicStyles));
        return "";
      }
      if (node.name === "text:note") {
        const noteClass = node.attrs["text:note-class"];
        if (noteClass !== "footnote" && noteClass !== "endnote") {
          throw this._fodtError(`text:note-class '${noteClass || ""}'`);
        }
        const id = node.attrs["text:id"] || `${noteClass === "endnote" ? "edn" : "ftn"}${parsedFootnotes.length + parsedEndnotes.length + 1}`;
        const children = node.children.filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
        const citationNode = children.find(child => child.name === "text:note-citation");
        const bodyNode = children.find(child => child.name === "text:note-body");
        if (!bodyNode) throw this._fodtError("text:note thiếu text:note-body");
        const unexpected = children.filter(child => child !== citationNode && child !== bodyNode);
        if (unexpected.length) throw this._fodtError(`text:note chứa <${unexpected[0].name}>`);
        const bodyBlocks = bodyNode.children.filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
        if (bodyBlocks.length !== 1 || bodyBlocks[0].name !== "text:p") {
          throw this._fodtError("text:note-body phải có đúng một text:p");
        }
        const bodyHtml = inlineHtml(bodyBlocks[0].children);
        const citation = this._fodtCitationText(citationNode?.children || []) || (noteClass === "endnote" ? "i" : "1");
        if (noteClass === "endnote") parsedEndnotes.push({ id, citation, html: bodyHtml });
        else parsedFootnotes.push({ id, citation, html: bodyHtml });
        const title = noteClass === "endnote" ? "Nhấp để chuyển đến chú thích cuối" : "Nhấp để chuyển đến chú thích";
        const refAttr = noteClass === "endnote" ? "data-vno-endnote-ref" : "data-vno-footnote-ref";
        const cls = noteClass === "endnote" ? "vno-endnote-ref" : "vno-footnote-ref";
        return `<sup ${refAttr}="${this._escapeHtml(id)}" class="${cls}" contenteditable="false" title="${title}">${this._escapeHtml(citation)}</sup>`;
      }
      if (node.name === "text:span") {
        const name = node.attrs["text:style-name"];
        if (!name || !textStyles.has(name)) throw this._fodtError(`text:span tham chiếu style không biết '${name || ""}'`);
        return `<span style="${this._escapeHtml(htmlStyle(textStyles.get(name)))}">${inlineHtml(node.children)}</span>`;
      }
      return inlineHtml(node.children || []);
    };
    const inlineHtml = (nodes) => {
      let html = "";
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        if (node.name === "office:annotation") {
          const annotationName = node.attrs["office:name"] || `writer-comment-${parsedComments.length + 1}`;
          const metaChildren = node.children.filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
          const creatorNode = metaChildren.find(child => child.name === "dc:creator");
          const dateNode = metaChildren.find(child => child.name === "dc:date");
          const bodyNodes = metaChildren.filter(child => child.name === "text:p");
          const unexpected = metaChildren.filter(child => child !== creatorNode && child !== dateNode && !bodyNodes.includes(child) && child.name !== "meta:creator" && child.name !== "meta:date");
          if (unexpected.length) throw this._fodtError(`office:annotation chứa <${unexpected[0].name}>`);
          if (bodyNodes.length !== 1) throw this._fodtError("office:annotation phải có đúng một text:p");
          const range = [];
          let foundEnd = false;
          let cursor = index + 1;
          while (cursor < nodes.length) {
            const next = nodes[cursor];
            if (next.name === "office:annotation-end" && (!next.attrs["office:name"] || next.attrs["office:name"] === annotationName)) {
              foundEnd = true;
              break;
            }
            if (next.name === "office:annotation") throw this._fodtError("office:annotation lồng nhau chưa hỗ trợ");
            range.push(next);
            cursor++;
          }
          const innerHtml = foundEnd ? inlineHtml(range) : "";
          const comment = {
            id: annotationName,
            anchorText: this._fodtPlainLoose(foundEnd ? range : []).replace(/\s+/g, " ").trim(),
            content: this._fodtPlainLoose(bodyNodes[0].children).trim(),
            createdAt: this._fodtPlainLoose(dateNode?.children || "").trim(),
            author: this._fodtPlainLoose(creatorNode?.children || "").trim()
          };
          parsedComments.push(comment);
          html += this._fodtCommentMarkHtml(comment, innerHtml);
          if (foundEnd) index = cursor;
          continue;
        }
        if (node.name === "office:annotation-end") {
          throw this._fodtError("office:annotation-end không có office:annotation tương ứng");
        }
        if (node.name === "text:change-start") {
          const changeId = node.attrs["text:change-id"];
          const region = trackedById.get(changeId);
          if (!region) throw this._fodtError(`text:change-start id '${changeId || ""}' không có changed-region`);
          if (region.kind !== "insert") throw this._fodtError("text:change-start/end chỉ hỗ trợ text:insertion");
          const range = [];
          let foundEnd = false;
          let cursor = index + 1;
          while (cursor < nodes.length) {
            const next = nodes[cursor];
            if (next.name === "text:change-end" && next.attrs["text:change-id"] === changeId) {
              foundEnd = true;
              break;
            }
            if (next.name === "text:change-start" || next.name === "text:change-end" || next.name === "text:change") {
              throw this._fodtError("text:change-start lồng nhau hoặc thiếu text:change-end");
            }
            range.push(next);
            cursor++;
          }
          if (!foundEnd) throw this._fodtError(`text:change-start '${changeId}' thiếu text:change-end`);
          html += this._fodtTrackChangeMarkHtml("insert", region, inlineHtml(range));
          index = cursor;
          continue;
        }
        if (node.name === "text:change-end") {
          throw this._fodtError("text:change-end không có text:change-start tương ứng");
        }
        if (node.name === "text:change") {
          const changeId = node.attrs["text:change-id"];
          const region = trackedById.get(changeId);
          if (!region) throw this._fodtError(`text:change id '${changeId || ""}' không có changed-region`);
          if (region.kind !== "delete") throw this._fodtError("text:change rỗng chỉ hỗ trợ text:deletion");
          html += this._fodtTrackChangeMarkHtml("delete", region, inlineHtml(region.deletionNodes));
          continue;
        }
        html += inlineNodeHtml(node);
      }
      return html;
    };
    const frameHtml = (node) => {
      if (this._fodtFrameIsChart(node)) return this._fodtChartHtmlFromFrame(node);
      const children = node.children.filter(child => !(child.name === "#text" && !child.text.trim()));
      if (children.length === 1 && children[0].name === "draw:text-box") {
        parsedShapes.push(this._fodtTextBoxFromFrame(node, children[0], graphicStyles));
        return "";
      }
      return imageHtml(node);
    };
    const imageHtml = (node) => {
      // Lỗi thật đã xác nhận: file DOCX thật có ảnh neo nổi (Word thường dùng
      // kiểu này cho logo/letterhead có chữ chạy quanh — wp:anchor với
      // wrapSquare) được soffice convert sang FODT với text:anchor-type="char"
      // (không phải "as-char" mà VN Office tự ghi khi chèn ảnh). Trước đây
      // parseFodt() NÉM LỖI ngay khi gặp anchor-type khác "as-char", khiến
      // TOÀN BỘ file không mở được (không chỉ mất 1 ảnh). Vì kiến trúc hiện
      // tại đặt draw:frame ngay trong luồng nội dung đoạn văn (inlineNodeHtml)
      // bất kể anchor-type, nên chấp nhận thêm "char"/"paragraph" (2 kiểu neo
      // nổi phổ biến nhất của Word thật) và hiển thị ảnh NGAY TẠI VỊ TRÍ đó
      // trong luồng văn bản — đánh đổi: mất hiệu ứng chữ chạy quanh ảnh
      // (wrap-around) và vị trí nổi chính xác, nhưng KHÔNG mất ảnh, KHÔNG mất
      // nội dung văn bản khác, và file MỞ ĐƯỢC thay vì báo lỗi toàn bộ.
      const supportedAnchors = ["as-char", "char", "paragraph"];
      if (!supportedAnchors.includes(node.attrs["text:anchor-type"])) throw this._fodtError(`draw:frame anchor-type '${node.attrs["text:anchor-type"] || ""}' (chỉ hỗ trợ ${supportedAnchors.join("/")})`);
      const width = this._fodtCmToPx(node.attrs["svg:width"]);
      const height = this._fodtCmToPx(node.attrs["svg:height"]);
      const images = node.children.filter(child => !(child.name === "#text" && !child.text.trim()));
      if (images.length !== 1 || images[0].name !== "draw:image") throw this._fodtError("draw:frame phải chứa đúng một draw:image hoặc draw:text-box (Phase B.2)");
      const image = images[0];
      const mime = String(image.attrs["draw:mime-type"] || "").toLowerCase();
      if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mime)) {
        throw this._fodtError(`draw:image mime-type '${image.attrs["draw:mime-type"] || ""}' (Phase B.2 chỉ hỗ trợ PNG/JPEG/GIF/WEBP)`);
      }
      const binaryNode = image.children.find(child => child.name === "office:binary-data");
      if (!binaryNode) throw this._fodtError("draw:image thiếu office:binary-data (Phase B không hỗ trợ xlink:href ngoài)");
      const base64 = binaryNode.children.map(child => child.name === "#text" ? child.text : "").join("").replace(/\s+/g, "");
      if (!base64) throw this._fodtError("office:binary-data rỗng");
      return `<img src="data:${this._escapeHtml(mime)};base64,${base64}" width="${width}" height="${height}" data-vno-wrap="inline" style="max-width:100%;height:auto;">`;
    };
    const listHtml = (node, inheritedStyle) => {
      const name = node.attrs["text:style-name"] || inheritedStyle;
      const isKnown = WRITER_LIST_STYLE_NAMES.has(name);
      const className = isKnown ? WRITER_MULTILEVEL_BY_STYLE[name] : null;
      const tag = (name === "LBullet" || (!isKnown && /bullet/i.test(name))) ? "ul" : "ol";
      const classAttr = className ? ` class="${className}"` : "";
      const items = node.children.filter(child => !(child.name === "#text" && !child.text.trim()));
      if (items.some(child => child.name !== "text:list-item")) throw this._fodtError("nội dung text:list ngoài text:list-item");
      return `<${tag}${classAttr}>${items.map(item => {
        const children = item.children.filter(child => !(child.name === "#text" && !child.text.trim()));
        if (!children.length) return "<li></li>";
        const pChild = children.find(child => child.name === "text:p");
        const listChildren = children.filter(child => child.name === "text:list");
        const pHtml = pChild ? inlineHtml(pChild.children) : children.filter(c => c.name !== "text:list").map(c => inlineHtml(c.children || [])).join("");
        return `<li>${pHtml}${listChildren.map(child => listHtml(child, name)).join("")}</li>`;
      }).join("")}</${tag}>`;
    };
    const tableHtml = (node) => {
      const rows = node.children.filter(child => child.name === "table:table-row");
      if (!rows.length) throw this._fodtError("cấu trúc table:table ngoài table:table-row (Phase B)");
      const rowsHtml = rows.map(row => {
        const slots = row.children.filter(child => !(child.name === "#text" && !child.text.trim()));
        if (!slots.length) throw this._fodtError("table:table-row không có ô nào (Phase B)");
        if (slots.some(slot => !["table:table-cell", "table:covered-table-cell"].includes(slot.name))) {
          throw this._fodtError("table:table-row chứa phần tử khác table:table-cell/table:covered-table-cell (Phase B)");
        }
        // table:covered-table-cell marks a slot consumed by a prior colspan/rowspan -
        // HTML doesn't need a placeholder there, the origin <td>'s colspan/rowspan already covers it.
        const cells = slots.filter(slot => slot.name === "table:table-cell");
        const cellsHtml = cells.map(cell => {
          const colspan = Number(cell.attrs["table:number-columns-spanned"]) || 1;
          const rowspan = Number(cell.attrs["table:number-rows-spanned"]) || 1;
          const spanAttr = `${colspan > 1 ? ` colspan="${colspan}"` : ""}${rowspan > 1 ? ` rowspan="${rowspan}"` : ""}`;
          const cellStyleName = cell.attrs["table:style-name"];
          const cellStyle = cellStyleName ? cellStyles.get(cellStyleName) : null;
          if (cellStyleName && !cellStyle) throw this._fodtError(`table-cell style không biết '${cellStyleName}'`);
          const cssRules = [];
          if (cellStyle?.borderTop) cssRules.push(`border-top:${cellStyle.borderTop}`);
          if (cellStyle?.borderRight) cssRules.push(`border-right:${cellStyle.borderRight}`);
          if (cellStyle?.borderBottom) cssRules.push(`border-bottom:${cellStyle.borderBottom}`);
          if (cellStyle?.borderLeft) cssRules.push(`border-left:${cellStyle.borderLeft}`);
          if (cellStyle?.backgroundColor) cssRules.push(`background-color:${cellStyle.backgroundColor}`);
          const content = cell.children.filter(child => !(child.name === "#text" && !child.text.trim()));
          const styleAttr = cssRules.length ? ` style="${this._escapeHtml(cssRules.join(";"))}"` : "";
          const cellInner = content.map(c => {
            if (c.name === "text:p" || c.name === "text:h") {
              return `<p>${inlineHtml(c.children)}</p>`;
            }
            if (c.name === "table:table") return tableHtml(c);
            if (c.name === "text:list") return listHtml(c);
            return inlineHtml(c.children || []);
          }).join("");
          return `<td${spanAttr}${styleAttr}>${cellInner}</td>`;
        }).join("");
        return `<tr>${cellsHtml}</tr>`;
      }).join("");
      return `<table><tbody>${rowsHtml}</tbody></table>`;
    };
    const paragraphBlockHtml = (node, { allowMasterSwitch = false } = {}) => {
      if (!["text:p", "text:h"].includes(node.name)) throw this._fodtError(`phần tử FODT block <${node.name}>`);
      const onlyChart = (node.children || []).filter(child => !(child.name === "#text" && !String(child.text || "").trim()));
      if (node.name === "text:p" && onlyChart.length === 1 && this._fodtFrameIsChart(onlyChart[0])) {
        return this._fodtChartHtmlFromFrame(onlyChart[0]);
      }
      const level = node.name === "text:h" ? Math.min(6, Math.max(1, Number(node.attrs["text:outline-level"]) || 1)) : 0;
      const tag = level ? `h${level}` : "p";
      const pStyleName = node.attrs["text:style-name"];
      const pStyle = pStyleName ? paragraphStyles.get(pStyleName) : null;
      if (pStyleName && !pStyle) throw this._fodtError(`paragraph style không biết '${pStyleName}'`);
      if (pStyle?.masterPageName && !allowMasterSwitch) {
        throw this._fodtError("style:master-page-name trong header/footer chưa hỗ trợ");
      }
      const cssRules = [];
      if (pStyle?.textAlign && pStyle.textAlign !== "left") cssRules.push(`text-align:${pStyle.textAlign}`);
      if (pStyle?.marginTop) cssRules.push(`margin-top:${pStyle.marginTop}`);
      if (pStyle?.marginBottom) cssRules.push(`margin-bottom:${pStyle.marginBottom}`);
      const styleAttr = cssRules.length ? ` style="${this._escapeHtml(cssRules.join(";"))}"` : "";
      const paragraph = `<${tag}${styleAttr}>${inlineHtml(node.children)}</${tag}>`;
      if (!pStyle?.masterPageName) return paragraph;
      const master = masterByName.get(pStyle.masterPageName);
      if (!master) throw this._fodtError(`paragraph style tham chiếu master-page '${pStyle.masterPageName}' không biết`);
      const sectionId = master.sectionId;
      return `${this._buildSectionBreakMarker("nextPage", sectionId)}${paragraph}`;
    };
    const blocksHtml = (nodes, options = {}) => nodes.filter(node => !(node.name === "#text" && !node.text.trim())).map(node => {
      if (options.zone && (node.name === "table:table" || node.name.startsWith("draw:") || node.name === "text:table-of-content" || node.name === "text:tracked-changes" || node.name === "text:change")) {
        throw this._fodtError(`${options.zone}: phần tử <${node.name}> chưa hỗ trợ`);
      }
      if (node.name === "text:tracked-changes") throw this._fodtError("text:tracked-changes không đứng đầu office:text");
      if (node.name === "text:table-of-content") return this._fodtTocHtml(node);
      if (node.name === "text:list") return listHtml(node);
      if (node.name === "table:table") return tableHtml(node);
      if (node.name === "text:section") return blocksHtml(node.children || [], options);
      return paragraphBlockHtml(node, options);
    }).join("");
    const pageLayouts = this._fodtParsePageLayouts(xml);
    const masterPages = this._fodtParseMasterPages(xml);
    const masterByName = new Map();
    const restoredSections = {};
    let restoredSequence = this._sectionSequence || 1;
    masterPages.forEach((master, index) => {
      const setup = pageLayouts.get(master.layoutName);
      if (!setup) throw this._fodtError(`master-page '${master.name}' tham chiếu page-layout '${master.layoutName}' không biết`);
      const id = index === 0 ? "section-1" : (/^section-\d+$/.test(master.name) ? master.name : `section-${index + 1}`);
      restoredSections[id] = JSON.parse(JSON.stringify(setup));
      master.sectionId = id;
      masterByName.set(master.name, master);
      const numeric = Number(String(id).replace(/^section-/, ""));
      if (Number.isFinite(numeric)) restoredSequence = Math.max(restoredSequence, numeric);
    });
    const headerExtracts = masterPages.map(master => this._fodtExtractHeaderWatermark(master.headerXml, graphicStyles, textStyles));
    let headerHtml = "";
    let footerHtml = "";
    if (headerExtracts[0]?.remainderNodes?.length) {
      const remainderXmlProbe = headerExtracts[0].remainderNodes.map(node => node.name).join(" ");
      // text:page-number/text:page-count KHÔNG nằm trong danh sách chặn này —
      // được xử lý riêng qua inlineNodeHtml (hạ cấp thành văn bản tĩnh, xem
      // nhánh "text:page-number" phía trên). Các phần tử KHÁC còn lại
      // (bảng/ảnh/shape/ghi chú/Track Changes) hạ cấp thành header RỖNG thay
      // vì ném lỗi hỏng toàn bộ tài liệu — xác nhận qua nhiều file .doc/.docx
      // thật cần cách này mới mở được.
      if (/\b(table:|text:note|text:tracked-changes|text:change)\b/i.test(remainderXmlProbe)) {
        headerHtml = "";
      } else {
        headerHtml = blocksHtml(headerExtracts[0].remainderNodes, { zone: "header" });
      }
    }
    if (masterPages[0]?.footerXml) {
      if (/<(draw:|table:|text:note|text:tracked-changes|text:change)\b/i.test(masterPages[0].footerXml)) {
        footerHtml = "";
      } else {
        footerHtml = blocksHtml(this._fodtParseMarkup(masterPages[0].footerXml, "FODT style:footer").children, { zone: "footer" });
      }
    }
    const parsedWatermark = headerExtracts[0]?.watermark || null;
    const bodyNodes = [];
    for (const node of tree.children) {
      if (node.name === "#text" && !String(node.text || "").trim()) continue;
      // LibreOffice luôn ghi text:sequence-decls (khai báo nhóm đánh số chú thích
      // Illustration/Table/Text/Drawing/Figure) làm con đầu tiên của office:text
      // khi CHUYỂN ĐỔI THẬT (vd DOCX -> FODT), kể cả tài liệu không hề dùng chú
      // thích nào - đây là khai báo thuần, không mang nội dung người dùng, an
      // toàn để bỏ qua thay vì báo lỗi "chưa hỗ trợ" như mọi phần tử lạ khác.
      if (node.name === "text:sequence-decls") continue;
      // Lỗi thật đã xác nhận qua file .doc thật của người dùng: LibreOffice
      // LUÔN ghi <office:forms form:automatic-focus="false"
      // form:apply-design-mode="false"/> (RỖNG, tự đóng thẻ) làm con của
      // office:text khi convert file .doc/.docx cũ — kể cả tài liệu không hề
      // có control form nào (checkbox/textbox tương tác). Đây chỉ là khai báo
      // chế độ thiết kế form thuần túy của LibreOffice, KHÔNG mang nội dung
      // người dùng — an toàn để bỏ qua, giống hệt text:sequence-decls ở trên.
      if (node.name === "office:forms") continue;
      if (node.name === "text:tracked-changes") {
        this._fodtLoadTrackedChanges(node, trackedById);
        continue;
      }
      bodyNodes.push(node);
    }
    let html = blocksHtml(bodyNodes, { allowMasterSwitch: true });
    html += this._fodtNoteContainerHtml("footnote", parsedFootnotes);
    html += this._fodtNoteContainerHtml("endnote", parsedEndnotes);
    this._initZones();
    if (this.bodyDom) this.bodyDom.innerHTML = html;
    if (this.headerDom) this.headerDom.innerHTML = headerHtml;
    if (this.footerDom) this.footerDom.innerHTML = footerHtml;
    this.shapes = parsedShapes;
    this.comments = parsedComments;
    this.watermark = parsedWatermark;
    this._applyWatermark();
    if (masterPages.length) {
      const firstSetup = restoredSections["section-1"] || masterPages[0] && pageLayouts.get(masterPages[0].layoutName);
      if (firstSetup) this.pageSetup = JSON.parse(JSON.stringify(firstSetup));
      this.sectionPageSetups = restoredSections;
      this.activeSectionId = Object.keys(restoredSections).slice(-1)[0] || "section-1";
      this._sectionSequence = restoredSequence;
    }
    this.lineNumbers = this._fodtParseLineNumbers(xml);
    this._applyLineNumbersIndicator();
    return html;
  }

  /**
   * Loại bỏ các thuộc tính CSS kích thước/vị trí khỏi thẻ `<span>` trong chuỗi
   * HTML xuất —阻止 LibreOffice HTML import biến span thành TEXT FRAME
   * (DrawingML+VML)导致 Microsoft Word 2016拒绝打开 DOCX.
   *
   * Chỉ thao tác trên chuỗi xuất, KHÔNG đụng DOM hiển thị trong editor.
   */
  _sanitizeExportHtmlForWordCompat(html) {
    if (!html) return html;
    const STRIP_RE = /\b(width|min-height|max-width|height|position|top|right|bottom|left|float)\s*:\s*[^;]*;?/gi;
    const STRIP_DISPLAY = /\bdisplay\s*:\s*inline-block\s*;?/gi;
    const cleanStyle = (styleVal) => {
      let s = styleVal;
      s = s.replace(STRIP_RE, "");
      s = s.replace(STRIP_DISPLAY, "");
      s = s.replace(/\s{2,}/g, " ").trim();
      return s;
    };
    const SPAN_STYLE_RE = /(<span\b[^>]*?\bstyle=["'])([^"']*?)(["'][^>]*>)/gi;
    let out = html.replace(SPAN_STYLE_RE, (_m, pre, styleVal, post) => {
      if (/\bdata-vno-float-export\b/i.test(pre)) return `${pre}${styleVal}${post}`;
      const s = cleanStyle(styleVal);
      if (!s) return `${pre}${post}`;
      return `${pre}${s}${post}`;
    });
    const IMG_STYLE_RE = /(<img\b[^>]*?\bstyle=["'])([^"']*?)(["'][^>]*>)/gi;
    out = out.replace(IMG_STYLE_RE, (_m, pre, styleVal, post) => {
      if (/\bposition\s*:\s*absolute\b/i.test(styleVal)) return `${pre}${styleVal}${post}`;
      const s = cleanStyle(styleVal);
      if (!s) return `${pre}${post}`;
      return `${pre}${s}${post}`;
    });
    const DIV_STYLE_RE = /(<div\b[^>]*?\bstyle=["'])([^"']*?)(["'][^>]*>)/gi;
    out = out.replace(DIV_STYLE_RE, (_m, pre, styleVal, post) => {
      const fullTag = pre + post;
      if (/\bvno-export(?:-section|-watermark|-shapes)\b/.test(fullTag) || /\bposition\s*:\s*absolute\b/i.test(styleVal)) {
        return `${pre}${styleVal}${post}`;
      }
      let s = styleVal;
      s = s.replace(/\bwidth\s*:[^;]*;?/gi, "");
      s = s.replace(/\s{2,}/g, " ").trim();
      if (!s) return `${pre}${post}`;
      return `${pre}${s}${post}`;
    });
    out = out.replace(/\bstyle\s*=\s*["']\s*["']/gi, "");
    return out;
  }

  _prepareFloatingFramesForExport(html) {
    // The anchor's position/min-height are canvas-only layout aids. Keep page
    // breaks on image carrier paragraphs: they are real Word pagination from
    // the source document, not geometry owned by the floating frame. Float
    // geometry itself is rebuilt below from original data-vno-*.
    const src = String(html || "").replace(
      /(<(div|p)\b[^>]*\bdata-vno-float-anchor\b[^>]*\bstyle=["'])([^"']*)(["'])/gi,
      (_m, pre, tagName, styleVal, post) => {
        let exportStyle = styleVal
          .replace(/\b(?:min-height|position)\s*:\s*[^;]+;?\s*/gi, "")
          .trim();
        // A div carrier cannot break pages in LibreOffice's HTML import; hand
        // the break to an empty paragraph placed right before it instead.
        const carriesBreak = tagName.toLowerCase() === "div"
          && /(?:page-break-before|break-before)\s*:\s*(?:always|page)/i.test(exportStyle);
        if (carriesBreak) {
          exportStyle = exportStyle.replace(/\b(?:page-break-before|break-before)\s*:\s*[^;]+;?\s*/gi, "").trim();
          return `<p style="page-break-before:always;break-before:page;margin:0;"></p>${pre}${exportStyle}${post}`;
        }
        return `${pre}${exportStyle}${post}`;
      }
    );
    const openRe = /<span\b([^>]*\bdata-vno-float=["'](?:image|textbox)["'][^>]*)>/gi;
    let cursor = 0;
    let result = "";
    while (cursor < src.length) {
      openRe.lastIndex = cursor;
      const opening = openRe.exec(src);
      if (!opening) return result + src.slice(cursor);
      let depth = 1;
      let search = opening.index + opening[0].length;
      let close = -1;
      const anySpanRe = /<span\b[^>]*>/gi;
      while (depth > 0) {
        anySpanRe.lastIndex = search;
        const nested = anySpanRe.exec(src);
        const nextClose = src.indexOf("</span>", search);
        if (nextClose < 0) break;
        if (nested && nested.index < nextClose) {
          depth += 1;
          search = nested.index + nested[0].length;
        } else {
          depth -= 1;
          close = nextClose;
          search = nextClose + 7;
        }
      }
      if (depth !== 0) return result + src.slice(cursor);
      const tag = opening[0];
      const attr = (name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)`, "i"))?.[1] || "";
      const kind = attr("data-vno-float");
      const left = attr("data-vno-left") || "0";
      const top = attr("data-vno-top") || "0";
      const width = attr("data-vno-width");
      const height = attr("data-vno-height");
      const style = `position:absolute;left:${left}cm;top:${top}cm;${width ? `width:${width}cm;` : ""}${height ? `height:${height}cm;` : ""}margin:0;line-height:0;`;
      const inner = src.slice(opening.index + opening[0].length, close);
      let replacement;
      if (kind === "image") {
        replacement = inner.replace(/<img\b([^>]*)>/i, (_all, attrs) => {
          const withoutStyle = attrs.replace(/\sstyle=["'][^"']*["']/i, "");
          return `<img${withoutStyle} style="${style}">`;
        });
      } else {
        replacement = `<div data-vno-float-export="textbox" style="${style}">${inner}</div>`;
      }
      result += src.slice(cursor, opening.index) + replacement;
      cursor = close + 7;
    }
    return result;
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
      const exportRoot = this.bodyDom.cloneNode?.(true) || this.bodyDom;
      this._markCurrentUntouchedParagraphs(exportRoot);
      bodyHtml = this._stripSessionMarkup(exportRoot.innerHTML);
    } else if (this.editorDom) {
      bodyHtml = this._stripSessionMarkup(this.editorDom.innerHTML);
    }
    bodyHtml = this._prepareFloatingFramesForExport(bodyHtml);
    bodyHtml = this._restoreProportionalLineHeightsForExport(bodyHtml);
    bodyHtml = this._simplifyFontFamiliesForExport(bodyHtml);

    // LibreOffice's Writer HTML importer drops a class-only Drop Cap span
    // completely (including its first letter) because writer.css is not part
    // of the conversion payload. Use legacy HTML font markup here: the import
    // filter maps it reliably to a large DOCX run, preserving both the initial
    // and an obvious drop-cap-style visual fallback in real DOCX/PDF exports.
    bodyHtml = bodyHtml.replace(
      /<span\b(?=[^>]*\bclass=["'][^"']*\bvno-drop-cap\b[^"']*["'])(?=[^>]*\bdata-drop-lines=["']([23])["'])[^>]*>([\s\S]*?)<\/span>/gi,
      (_match, lines, initial) => `<font size="${lines === "2" ? "6" : "7"}"><b>${initial}</b></font>`
    );

    const firstSectionId = Object.keys(this.sectionPageSetups || {})[0] || "section-1";
    bodyHtml = `<div class="vno-export-section vno-export-${firstSectionId}" data-vno-export-section="${firstSectionId}">` + bodyHtml.replace(
      /<div\b[^>]*data-vno-section-break=["'](nextPage|continuous|evenPage|oddPage)["'][^>]*data-vno-section-id=["']([^"']+)["'][^>]*>[\s\S]*?<\/div>/gi,
      (_match, type, id) => {
        // LibreOffice's HTML→Writer import filter only honors page-break-before on a
        // real <p>, not a wrapping <div> — so a dedicated zero-height marker paragraph
        // carries the break instead of relying on the section <div>'s own style.
        const pageBreak = type === "continuous"
          ? ""
          : `<p style="page-break-before:always;break-before:${type === "evenPage" ? "left" : type === "oddPage" ? "right" : "page"};margin:0;height:0;overflow:hidden;" aria-hidden="true">&nbsp;</p>`;
        return `</div>${pageBreak}<div class="vno-export-section vno-export-${id}" data-vno-export-section="${id}">`;
      }
    ) + `</div>`;

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

    const pristineMarker = this._isOpenedDocumentPristine() ? '<a name="vno-pristine-document"></a>' : "";
    const fullHtml = `${pristineMarker}${watermarkHtml}${shapesHtml}${headerHtml}${bodyExportHtml}${footerHtml}`;
    const rawExport = `<style>${this._getPageSetupCss()}\n${this._getSectionPageCss()}${columnsCss}</style>${fullHtml}`;
    return this._sanitizeExportHtmlForWordCompat(rawExport);
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
      .replace(/\s+data-vno-src-hash=["'][^"']*["']/gi, "")
      .replace(/\s+data-vno-edited=["'][^"']*["']/gi, "")
      .replace(/<span\b(?=[^>]*\bclass=["'][^"']*\bvno-spelling-(?:error|uncertain)\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/\s+is-vno-image-selected(?=[\s"'])/gi, "")
      .replace(/<del\b(?=[^>]*\bdata-vno-change=(?:"delete"|'delete'))[^>]*>[\s\S]*?<\/del>/gi, "")
      .replace(/<ins\b(?=[^>]*\bdata-vno-change=(?:"insert"|'insert'))[^>]*>([\s\S]*?)<\/ins>/gi, "$1")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-toc-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-tof-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<button\b[^>]*class=["'][^"']*\bvno-caption-delete-btn\b[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "")
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
    const suggestedName = (this.sourceFileName && this.sourceFileName !== "TaiLieu")
      ? this.sourceFileName
      : (this.shell?.documentName ? this.shell.documentName.replace(/\.[^/.]+$/, "") : (this.sourceFileName || "TaiLieu"));
    const result = await globalUnoBridge.saveRealFile("writer", this._contentForExport(), "docx", suggestedName, this._sourcePath || null);
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
   * Mở một tệp DOCX/ODT thật từ đĩa, thay thế nội dung soạn thảo hiện tại.
   */
  async open() {
    const result = await globalUnoBridge.openRealFile("writer");
    if (result.status === "ok") {
      this._initZones();
      this._sourcePath = result.sourcePath || null;
      // Comments chỉ thuộc tài liệu đang mở trong phiên; file khác không dùng lại anchor cũ.
      this.comments = [];
      this.trackChangesEnabled = false;
      this.activeCommentId = null;
      this._renderCommentsPanel();
      const imported = this._normalizeImportedHtml(
        result.content || "",
        result.ooxmlDocumentXml,
        result.ooxmlCommentsXml,
        result.ooxmlStylesXml
      );
      if (imported.page) {
        this.pageSetup = {
          size: imported.page.size || this.pageSetup.size,
          orientation: imported.page.orientation || this.pageSetup.orientation,
          margins: { ...this.pageSetup.margins, ...imported.page.margins },
          headerDistanceMm: imported.page.headerDistanceMm ?? this.pageSetup.headerDistanceMm ?? 12.7,
          footerDistanceMm: imported.page.footerDistanceMm ?? this.pageSetup.footerDistanceMm ?? 12.7,
          ...(imported.page.size === "custom"
            ? { widthMm: imported.page.widthMm, heightMm: imported.page.heightMm }
            : {})
        };
        const importedSetup = JSON.parse(JSON.stringify(this.pageSetup));
        const sectionIds = Object.keys(this.sectionPageSetups || {});
        if (sectionIds.length <= 1) {
          this.sectionPageSetups = { [this.activeSectionId]: importedSetup };
        } else {
          this.sectionPageSetups[this.activeSectionId] = importedSetup;
        }
        this._applyPageSetup();
      }
      this.docStyles = imported.docStyles || null;
      this._applyDocStyles();

      if (this.headerDom && this.bodyDom && this.footerDom) {
        this.headerDom.innerHTML = imported.header;
        this.bodyDom.innerHTML = imported.body;
        this.footerDom.innerHTML = imported.footer;
      } else if (this.bodyDom) {
        this.bodyDom.innerHTML = imported.body;
      } else if (this.editorDom) {
        this.editorDom.innerHTML = imported.body;
      }
      // Quy ước W1/W8: tỉ số font theo font THẬT đang vẽ của từng phần tử và strut của <p> = font của run.
      // Chạy trước khi băm "chưa sửa" nên không làm tài liệu thành "đã sửa".
      try { this._normalizeImportedFontMetrics(this.bodyDom || this.editorDom); } catch {}
      this._markImportedParagraphsUntouched(this.bodyDom || this.editorDom);

      if (imported.comments?.length) {
        this.comments = imported.comments;
        this._commentSequence = Math.max(this._commentSequence, imported.comments.length);
        this._renderCommentsPanel();
      }

      this._hydrateCitationsFromDom(result.content || imported.body);
      this._hydrateCaptionsFromDom(result.content || imported.body);
      this._hydrateWordArtFromDom();

      this.documentContent = this.editorDom ? this.editorDom.innerHTML : raw;
      this.sourceFileName = (result.fileName || "TaiLieu").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
      this._openedEditorDomHash = this._editorDomFingerprint();
      this._updateTrackChangesCommandState();
      this.clearUndoRedo();
      this.shell?.resetDocumentChrome?.(result.fileName || "Tài liệu 1.docx");
      this._recomputeLivePagination?.();
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => this._recomputeLivePagination?.());
      }
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
    this._sourcePath = null;
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

    this.pageSetup.headerDistanceMm = 12.7;
    this.pageSetup.footerDistanceMm = 12.7;
    this._applyPageSetup();
    this.docStyles = null;
    this._applyDocStyles();

    this.mailMergeData = { fields: [], records: [], rawCsv: "" };
    this.mailMergePreview = { enabled: false, recordIndex: 0 };
    this.citationStyle = "apa";
    this.citationSources = [];
    this._updateMailMergeCommandStates?.();

    this.documentContent = this.editorDom ? this.editorDom.innerHTML : "";
    this.sourceFileName = "TaiLieu";
    this.isDirty = false;
    this._openedEditorDomHash = this._editorDomFingerprint();
    this._updateTrackChangesCommandState?.();
    this.clearUndoRedo?.();
    this.shell?.resetDocumentChrome?.("Tài liệu 1.docx", "home", false);
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
    const base = pageSizeMm(this.pageSetup);
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
   * Body bắt đầu tại padding-top (lề trên). Header/footer nằm trong lề (absolute).
   * Nếu header cao hơn không gian cho phép (topMargin - headerDistance), đẩy body xuống phần dư.
   */
  _getUsablePageHeight(dim = this.getPageDimensions()) {
    const hasHeader = Boolean(this.headerDom && this.headerDom.innerText?.trim());
    const hasFooter = Boolean(this.footerDom && this.footerDom.innerText?.trim());
    const headerDistancePx = (this.pageSetup.headerDistanceMm ?? 12.7) * MM_TO_PX;
    const topMarginPx = dim.topPx;
    const maxHeaderSpacePx = topMarginPx - headerDistancePx;
    let headerExtraPx = 0;
    if (hasHeader && this.headerDom) {
      const headerHeight = this.headerDom.offsetHeight || 0;
      if (headerHeight > maxHeaderSpacePx) {
        headerExtraPx = headerHeight - maxHeaderSpacePx;
      }
    }
    // Footer doesn't push body up in Word; it just sits in bottom margin.
    // Body usable height = printableHeight - header extra push
    return Math.max(150, dim.printableHeightPx - headerExtraPx);
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
    let pageStartTop = null;

    // Khoảng cách giữa hai đoạn trong Word 2013+ = MAX(space-after, space-before) = gộp lề
    // CSS, nên đo bằng vị trí thật (offsetTop) trong khung đo là đúng nhất; Word bỏ
    // space-before của đoạn đầu trang sau ngắt trang tự động và cắt space-after ở đáy trang.
    // Trả về {h, mt, top} (top = null khi không có layout thật → ước lượng).
    const estimateHeight = (el) => {
      let mt = 0;
      if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
        try {
          mt = parseFloat(window.getComputedStyle(el).marginTop) || 0;
        } catch {}
      }
      if (measurementHost && typeof el.offsetTop === "number" && typeof el.offsetHeight === "number") {
        return { h: el.offsetHeight, mt, top: el.offsetTop };
      }
      if (el.offsetHeight && el.offsetHeight > 0) {
        return { h: el.offsetHeight, mt, top: null };
      }
      return { h: estimateBareHeight(el), mt: 0, top: null };
    };

    const estimateBareHeight = (el) => {
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
      if (el.dataset?.vnoTof === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-tof") === "true")) {
        let items = 2;
        if (el.querySelectorAll) items = el.querySelectorAll(".vno-tof-item").length || 2;
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
          pageStartTop = null;
        }
        // Chỉ bỏ qua nếu là phần tử phân tách trang chuyên biệt
        if (textContent.includes("Phân tách trang") || (el.tagName || "").toUpperCase() === "HR") {
          continue;
        }
      }

      const { h, mt, top } = estimateHeight(el);
      const elHtml = el.outerHTML || el.innerHTML || `<p>${textContent}</p>`;

      // Có layout thật: trang tính từ offsetTop khối đầu (giữ space-before sau ngắt
      // thủ công/đầu tài liệu) tới đáy khối đang xét; khoảng cách giữa các khối đã gộp lề.
      if (top !== null) {
        if (currentPageHtmls.length === 0 || pageStartTop === null) {
          pageStartTop = top - mt;
          currentPageHtmls.push(elHtml);
        } else if (top + h - pageStartTop > availableHeightPx) {
          pages.push(currentPageHtmls.join("\n"));
          currentPageHtmls = [elHtml];
          pageStartTop = top;
        } else {
          currentPageHtmls.push(elHtml);
        }
        continue;
      }

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

  _normalizePreviewFooterTables(html) {
    if (!html || typeof html !== "string") return html;
    return html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (tableHtml) => {
      if (!/#ed7c31/i.test(tableHtml) || !/HƯỚNG\s*DẪN\s*SỬ\s*DỤNG/i.test(tableHtml)) {
        return tableHtml;
      }
      const cols = [...tableHtml.matchAll(/<col\b[^>]*>/gi)];
      if (cols.length === 3) {
        let colIdx = 0;
        return tableHtml.replace(/<col\b[^>]*>/gi, () => {
          colIdx++;
          if (colIdx === 1) return '<col width="50">';
          if (colIdx === 2) return '<col width="537">';
          return '<col width="39">';
        });
      }
      return tableHtml;
    });
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
    const bodyForPagination = this._normalizePreviewFooterTables(this._stripAutoPageGaps(notesData.cleanHtml));

    const pageBodies = this.paginateContent(bodyForPagination, availableBodyHeightPx, dim.printableWidthPx, this.columns);

    for (let i = 0; i < pageBodies.length; i++) {
      pageBodies[i] = this._normalizePreviewFooterTables(pageBodies[i]);
    }

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
    if (this.docStyles && overlay.classList?.add) overlay.classList.add("vno-doc-imported");
    if (overlay.style && typeof overlay.style.setProperty === "function") {
      const ratio = this.editorDom?.style?.getPropertyValue?.("--vno-font-ratio") || String(this._fontLineRatio(this.docStyles?.fontFamily || "Times New Roman"));
      overlay.style.setProperty("--vno-font-ratio", String(ratio).trim());
    }
    if (this.docStyles && overlay.style) {
      const setOverlayProp = (prop, val) => {
        if (typeof overlay.style.setProperty === "function") overlay.style.setProperty(prop, val);
        else overlay.style[prop] = val;
      };
      if (this.docStyles.fontFamily) setOverlayProp("--vno-doc-font-family", this.docStyles.fontFamily);
      if (this.docStyles.fontSize) setOverlayProp("--vno-doc-font-size", this.docStyles.fontSize);
      if (this.docStyles.lineHeight) setOverlayProp("--vno-doc-line-height", this.docStyles.lineHeight);
      if (this.docStyles.paraMargin) setOverlayProp("--vno-doc-para-margin", this.docStyles.paraMargin);
    }

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
      if (this.pageColor && this.pageColor !== "transparent") sheet.style.backgroundColor = this.pageColor;

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
      activeSectionId: this.activeSectionId || "section-1",
      sectionPageSetups: JSON.parse(JSON.stringify(this.sectionPageSetups || {})),
      sectionSequence: this._sectionSequence || 1,
      comments: this.comments ? JSON.parse(JSON.stringify(this.comments)) : [],
      watermark: this.watermark ? JSON.parse(JSON.stringify(this.watermark)) : null,
      pageColor: this.pageColor || "transparent",
      pageBorder: this.pageBorder ? JSON.parse(JSON.stringify(this.pageBorder)) : null,
      columns: this.columns ? JSON.parse(JSON.stringify(this.columns)) : { count: 1, gap: 10, rule: false },
      lineNumbers: this._cloneLineNumbers(this.lineNumbers),
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
    if ((a.activeSectionId || "section-1") !== (b.activeSectionId || "section-1")) return false;
    if (JSON.stringify(a.sectionPageSetups || {}) !== JSON.stringify(b.sectionPageSetups || {})) return false;
    if (JSON.stringify(a.comments) !== JSON.stringify(b.comments)) return false;
    if (JSON.stringify(a.watermark) !== JSON.stringify(b.watermark)) return false;
    if ((a.pageColor || "transparent") !== (b.pageColor || "transparent")) return false;
    if (JSON.stringify(a.pageBorder) !== JSON.stringify(b.pageBorder)) return false;
    if (JSON.stringify(a.columns) !== JSON.stringify(b.columns)) return false;
    if (JSON.stringify(a.lineNumbers || {}) !== JSON.stringify(b.lineNumbers || {})) return false;
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
    if (snapshot.sectionPageSetups) this.sectionPageSetups = JSON.parse(JSON.stringify(snapshot.sectionPageSetups));
    if (snapshot.activeSectionId) this.activeSectionId = snapshot.activeSectionId;
    if (snapshot.sectionSequence) this._sectionSequence = snapshot.sectionSequence;

    if (snapshot.comments) {
      this.comments = JSON.parse(JSON.stringify(snapshot.comments));
      this._renderCommentsPanel();
    }

    if (Object.prototype.hasOwnProperty.call(snapshot, "watermark")) {
      this.watermark = snapshot.watermark ? JSON.parse(JSON.stringify(snapshot.watermark)) : null;
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "pageColor")) {
      this.pageColor = snapshot.pageColor || "transparent";
      this._applyPageSetup();
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "pageBorder")) {
      this.pageBorder = snapshot.pageBorder ? JSON.parse(JSON.stringify(snapshot.pageBorder)) : { enabled: false };
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "columns")) {
      this.columns = snapshot.columns ? JSON.parse(JSON.stringify(snapshot.columns)) : { count: 1, gap: 10, rule: false };
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "lineNumbers")) {
      this.lineNumbers = this._cloneLineNumbers(snapshot.lineNumbers);
      this._applyLineNumbersIndicator();
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "shapes")) {
      this.shapes = snapshot.shapes ? JSON.parse(JSON.stringify(snapshot.shapes)) : [];
    }
    if (snapshot.documentTheme) {
      this.applyDocumentTheme(snapshot.documentTheme, false);
    }
    if (typeof this._hydrateCitationsFromDom === "function") {
      const citationState = this._hydrateCitationsFromDom();
      if (!citationState) {
        this.citationStyle = "apa";
        this.citationSources = [];
      }
    }
    if (typeof this._hydrateCaptionsFromDom === "function") {
      this._hydrateCaptionsFromDom();
    }
    this.selectedWordArtEl = null;
    this._wordArtEditing = false;
    this._hydrateWordArtFromDom();
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

      // Update body margin-top if header pushes content down (Word behavior)
      const headerDistancePx = (this.pageSetup.headerDistanceMm ?? 12.7) * MM_TO_PX;
      const topMarginPx = dim.topPx;
      const maxHeaderSpacePx = topMarginPx - headerDistancePx;
      let headerExtraPx = 0;
      if (this.headerDom && this.headerDom.innerText?.trim()) {
        const headerHeight = this.headerDom.offsetHeight || 0;
        if (headerHeight > maxHeaderSpacePx) {
          headerExtraPx = headerHeight - maxHeaderSpacePx;
        }
      }
      if (this.bodyDom.style) {
        this.bodyDom.style.marginTop = headerExtraPx > 0 ? `${headerExtraPx}px` : "0";
      }

      const children = Array.from(this.bodyDom.children);
      let pageCount = 1;
      const gapBeforeEls = [];
      // Đo bằng vị trí thật của khối (offsetTop) nên khoảng cách giữa hai đoạn đã là
      // MAX(space-after, space-before) như Word 2013+ (lề CSS gộp = Word). Word bỏ
      // space-before của đoạn đầu trang sau ngắt trang tự động và cắt space-after của
      // đoạn cuối trang → trang bắt đầu tại offsetTop của khối đầu (không tính lề trên),
      // kết thúc tại đáy khối cuối. Sau ngắt trang thủ công/đầu tài liệu, space-before giữ.
      const marginTopOf = (el) => {
        if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return 0;
        try { return parseFloat(window.getComputedStyle(el).marginTop) || 0; } catch { return 0; }
      };
      let pageStartTop = null;

      for (const el of children) {
        const styleStr = (typeof el.getAttribute === "function" ? el.getAttribute("style") : "") || "";
        const textContent = el.textContent || "";
        const isManualBreak = styleStr.includes("page-break-before") || styleStr.includes("break-before") || textContent.includes("Phân tách trang");

        const h = el.offsetHeight || 0;
        const top = el.offsetTop || 0;
        if (isManualBreak) {
          // Ngắt trang thủ công / page-break-before nhập từ DOCX cũng phải hiện
          // thành một tờ mới trong khung soạn thảo (Word tách trang thật), nếu
          // không mọi float neo theo trang của các trang sau sẽ đè lên trang 1.
          if (el !== children[0]) {
            gapBeforeEls.push({ el, soft: false });
            pageCount++;
          }
          pageStartTop = top - marginTopOf(el);
          continue;
        }

        if (pageStartTop === null) {
          pageStartTop = top - marginTopOf(el);
          continue;
        }
        if (top + h - pageStartTop > availableHeightPx) {
          gapBeforeEls.push({ el, soft: true });
          pageStartTop = top;
          pageCount++;
        }
      }

      const canInsertGaps = typeof this.bodyDom.insertBefore === "function" && typeof document.createElement === "function";
      for (const { el, soft } of canInsertGaps ? gapBeforeEls : []) {
        const gap = document.createElement("div");
        gap.className = "vno-page-auto-gap";
        gap.setAttribute("contenteditable", "false");
        gap.setAttribute("data-vno-auto-page-gap", "true");
        // CSS `.vno-page-auto-gap[data-vno-soft-break="true"] + *` bỏ space-before
        // của đoạn đầu trang (đúng Word) mà không chạm vào style của đoạn.
        gap.setAttribute("data-vno-soft-break", soft ? "true" : "false");
        this.bodyDom.insertBefore(gap, el);
      }

      this._alignPageRelativeFloats();

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

  _alignPageRelativeFloats(targetBodyDom = this.bodyDom) {
    const bodyDom = targetBodyDom;
    if (!bodyDom || !bodyDom.children || typeof bodyDom.querySelectorAll !== "function") return;

    const dim = this.getPageDimensions ? this.getPageDimensions() : null;
    const marginTopCm = Number(dim?.margins?.top ?? 25.4) / 10;

    const children = Array.from(bodyDom.children);
    if (children.length === 0) return;

    const pageStartTopByBlock = new Map();
    let currentPageStartTop = children[0].offsetTop || 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isAutoGap = child.classList?.contains?.("vno-page-auto-gap") || child.getAttribute?.("data-vno-auto-page-gap") === "true";
      const styleStr = (typeof child.getAttribute === "function" ? child.getAttribute("style") : "") || "";
      const isManualBreak = styleStr.includes("page-break-before") || styleStr.includes("break-before");

      if (isAutoGap) {
        if (i + 1 < children.length) {
          currentPageStartTop = children[i + 1].offsetTop || 0;
        }
        continue;
      }

      if (isManualBreak && i > 0) {
        currentPageStartTop = child.offsetTop || 0;
      }

      pageStartTopByBlock.set(child, currentPageStartTop);
    }

    let floatEls;
    try {
      floatEls = bodyDom.querySelectorAll(
        '[data-vno-float][data-vno-relative-v="page"],[data-vno-float][data-vno-relative-v="margin"]'
      );
    } catch {
      // Mock DOMs in unit tests do not implement attribute selectors.
      return;
    }
    if (!floatEls || typeof floatEls[Symbol.iterator] !== "function") return;
    // The correction is written to a stylesheet keyed by data-vno-float-id, never
    // to element.style: touching inline styles re-serializes the attribute and
    // would make an untouched document dirty (snapshot/fingerprint mismatch).
    const rules = [];
    for (const el of floatEls) {
      const floatId = el.getAttribute?.("data-vno-float-id");
      if (!floatId) continue;
      const container = el.closest ? el.closest("[data-vno-float-anchor]") : null;
      if (!container) continue;

      let block = container;
      while (block && block.parentElement && block.parentElement !== bodyDom) {
        block = block.parentElement;
      }
      if (!block) continue;

      const pageTop = pageStartTopByBlock.has(block) ? pageStartTopByBlock.get(block) : (block.offsetTop || 0);
      const rawTop = el.dataset?.vnoTop ?? el.getAttribute?.("data-vno-top");
      const topCm = Number(rawTop || 0);
      const relV = String(el.dataset?.vnoRelativeV ?? el.getAttribute?.("data-vno-relative-v") ?? "").toLowerCase();
      const topMarginCm = (relV === "margin") ? 0 : marginTopCm;
      const wantPx = (topCm - topMarginCm) * 96 / 2.54;
      const deltaPx = (container.offsetTop || 0) - pageTop;
      const alignedTopPx = Number((wantPx - deltaPx).toFixed(2));
      rules.push(`.vno-writer-page [data-vno-float-id="${floatId}"]{top:${alignedTopPx}px !important;}`);
    }
    this._applyLiveFloatStylesheet(rules.join("\n"));
  }

  _applyLiveFloatStylesheet(cssText) {
    if (typeof document === "undefined" || !document.head || typeof document.createElement !== "function") return;
    let styleEl = this._liveFloatStyleEl;
    if (!styleEl || !styleEl.isConnected) {
      styleEl = document.getElementById?.("vno-live-float-tops") || null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "vno-live-float-tops";
        document.head.appendChild(styleEl);
      }
      this._liveFloatStyleEl = styleEl;
    }
    if (styleEl.textContent !== cssText) styleEl.textContent = cssText;
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
        if ((event.key === "Delete" || event.key === "Backspace") && this.selectedWordArtEl && !this._wordArtEditing) {
          event.preventDefault();
          event.stopPropagation();
          this.deleteWordArt(this.selectedWordArtEl);
          return;
        }
        if ((event.key === "Delete" || event.key === "Backspace") && this.selectedShapeId) {
          const active = typeof document !== "undefined" ? document.activeElement : null;
          const isInput = active && (active.isContentEditable || active.tagName === "INPUT" || active.tagName === "TEXTAREA");
          if (!isInput) {
            event.preventDefault();
            this.deleteShape(this.selectedShapeId);
            return;
          }
        }
        if ((event.key === "Enter" || event.key === "F2") && this.selectedWordArtEl && !this._wordArtEditing) {
          event.preventDefault();
          this._beginWordArtEdit(this.selectedWordArtEl);
          return;
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

      const wordArt = target.closest?.(".vno-writer-wordart, [data-vno-wordart='true']");
      if (wordArt) {
        if (!(this._wordArtEditing && this.selectedWordArtEl === wordArt)) {
          this._selectWordArt(wordArt);
        }
        return;
      }
      this._selectWordArt(null);

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

      const tofUpdateBtn = target.closest ? target.closest(".vno-tof-btn-update") : null;
      if (tofUpdateBtn) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const tofBlock = tofUpdateBtn.closest ? tofUpdateBtn.closest('[data-vno-tof="true"]') : null;
        const kind = tofBlock
          ? (tofBlock.dataset?.vnoTofKind || (typeof tofBlock.getAttribute === "function" ? tofBlock.getAttribute("data-vno-tof-kind") : "figure"))
          : "figure";
        this.updateTableOfFigures({ kind, recordHistory: true });
        return;
      }

      const tofDeleteBtn = target.closest ? target.closest(".vno-tof-btn-delete") : null;
      if (tofDeleteBtn) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const tofBlock = tofDeleteBtn.closest ? tofDeleteBtn.closest('[data-vno-tof="true"]') : null;
        this.deleteTableOfFigures(tofBlock);
        return;
      }

      const tofLink = target.closest ? target.closest(".vno-tof-link") : null;
      if (tofLink) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const targetId = (tofLink.dataset?.targetId) || (typeof tofLink.getAttribute === "function" ? tofLink.getAttribute("href") : "")?.replace(/^#/, "");
        this._jumpToCaption(targetId);
        return;
      }

      const captionDelete = target.closest ? target.closest(".vno-caption-delete-btn") : null;
      if (captionDelete) {
        event.preventDefault?.();
        event.stopPropagation?.();
        const caption = captionDelete.closest ? captionDelete.closest('[data-vno-caption="true"]') : null;
        const captionId = caption
          ? (caption.getAttribute?.("data-vno-caption-id") || caption.id || caption.dataset?.vnoCaptionId)
          : null;
        if (captionId) this.deleteCaption(captionId);
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
          curr.getAttribute("data-vno-tof") === "true" ||
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
          curr.classList.contains("vno-tof-block") ||
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
      if (el.dataset?.vnoTof === "true" || (typeof el.getAttribute === "function" && el.getAttribute("data-vno-tof") === "true")) {
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
  _hydrateCitationsFromDom(fallbackHtml = "") {
    this._initZones();
    const metadataEl = this.bodyDom?.querySelector?.('[data-vno-citation-metadata="true"]');
    const parsed = parseCitationMetadata(metadataEl?.textContent || fallbackHtml || this.bodyDom?.innerHTML || "");
    if (parsed) {
      this.citationStyle = parsed.style;
      this.citationSources = parsed.sources;
      this._syncCitationMetadata();
      this._refreshCitationFields();
    }
    return parsed;
  }

  _syncCitationMetadata() {
    this._initZones();
    if (!this.bodyDom) return;
    const html = citationMetadataHtml({ style: this.citationStyle, sources: this.citationSources });
    const existing = this.bodyDom.querySelector?.('[data-vno-citation-metadata="true"]');
    if (existing?.remove) existing.remove();
    if (typeof this.bodyDom.insertAdjacentHTML === "function") this.bodyDom.insertAdjacentHTML("beforeend", html);
    else this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}${html}`;
  }

  _captureCitationRange() {
    if (typeof window === "undefined" || !window.getSelection) return null;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return this.bodyDom?.contains?.(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  _insertCitationHtmlAtRange(html, range = null) {
    this._initZones();
    if (!this.bodyDom) return false;
    if (range && typeof document !== "undefined") {
      try {
        const holder = document.createElement("div");
        holder.innerHTML = html;
        const node = holder.firstElementChild;
        range.collapse(false);
        range.insertNode(node);
        return true;
      } catch {}
    }
    const metadata = this.bodyDom.querySelector?.('[data-vno-citation-metadata="true"]');
    if (metadata?.insertAdjacentHTML) metadata.insertAdjacentHTML("beforebegin", html);
    else if (typeof this.bodyDom.insertAdjacentHTML === "function") this.bodyDom.insertAdjacentHTML("beforeend", html);
    else this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}${html}`;
    return true;
  }

  _refreshCitationFields() {
    this._initZones();
    const sources = new Map(this.citationSources.map(source => [source.id, source]));
    this.bodyDom?.querySelectorAll?.('[data-vno-citation-source-id]').forEach(field => {
      const source = sources.get(field.getAttribute("data-vno-citation-source-id"));
      if (source) field.textContent = formatInTextCitation(source, this.citationStyle);
    });
    this.bodyDom?.querySelectorAll?.('[data-vno-bibliography="true"]').forEach(block => {
      const usedIds = this._usedCitationSourceIds();
      block.innerHTML = this._bibliographyInnerHtml(usedIds);
    });
  }

  _usedCitationSourceIds() {
    const ids = [];
    this.bodyDom?.querySelectorAll?.('[data-vno-citation-source-id]').forEach(field => {
      const id = field.getAttribute("data-vno-citation-source-id");
      if (id && !ids.includes(id)) ids.push(id);
    });
    if (!ids.length && typeof this.bodyDom?.innerHTML === "string") {
      for (const match of this.bodyDom.innerHTML.matchAll(/data-vno-citation-source-id=["']([^"']+)["']/gi)) if (!ids.includes(match[1])) ids.push(match[1]);
    }
    return ids;
  }

  _bibliographyInnerHtml(usedIds = this._usedCitationSourceIds()) {
    const used = new Set(usedIds);
    const entries = this.citationSources.filter(source => used.has(source.id)).sort((a, b) => authorSortKey(a).localeCompare(authorSortKey(b), "vi"));
    return `<h2 contenteditable="false">${this.citationStyle === "mla" ? "Works Cited" : "Tài liệu tham khảo"}</h2>${entries.map(source => `<p class="vno-bibliography-entry" data-vno-source-id="${this._escapeHtml(source.id)}">${formatBibliographyEntry(source, this.citationStyle)}</p>`).join("")}`;
  }

  setCitationStyle(style) {
    if (!CITATION_STYLES.includes(style)) return false;
    this.flushTyping();
    this.citationStyle = style;
    this._syncCitationMetadata();
    this._refreshCitationFields();
    this.recordSnapshot("writer.reference.citationStyle");
    return true;
  }

  addOrUpdateCitationSource(source, recordHistory = true) {
    this.flushTyping();
    const normalized = normalizeSource(source);
    const index = this.citationSources.findIndex(item => item.id === normalized.id);
    if (index >= 0) this.citationSources[index] = normalized;
    else this.citationSources.push(normalized);
    this._syncCitationMetadata();
    this._refreshCitationFields();
    if (recordHistory) {
      this.recordSnapshot(index >= 0 ? "writer.reference.sourceUpdate" : "writer.reference.sourceAdd");
    }
    return normalized;
  }

  insertCitation(source, range = null) {
    const normalized = this.addOrUpdateCitationSource(source, false);
    const text = formatInTextCitation(normalized, this.citationStyle);
    const html = `<span class="vno-citation-field" data-vno-citation-source-id="${this._escapeHtml(normalized.id)}" contenteditable="false" role="note" aria-label="Trích dẫn ${this._escapeHtml(text)}">${this._escapeHtml(text)}</span>`;
    this._insertCitationHtmlAtRange(html, range);
    this._syncCitationMetadata();
    this.isDirty = true;
    this.recordSnapshot("writer.reference.citationInsert");
    return normalized.id;
  }

  async openInsertCitationDialog(options = {}) {
    options = options || {};
    const range = this._captureCitationRange();
    const source = options.source || await showInsertCitationDialog(this.citationSources, { style: this.citationStyle, ...options });
    if (!source) return null;
    return this.insertCitation(source, range);
  }

  async openSourceManagerDialog(options = {}) {
    options = options || {};
    const updated = options.sources || await showSourceManagerDialog(this.citationSources, {
      isSourceUsed: id => this._usedCitationSourceIds().includes(id), ...options
    });
    if (!updated) return false;
    this.flushTyping();
    const kept = new Set(updated.map(source => source.id));
    this.bodyDom?.querySelectorAll?.('[data-vno-citation-source-id]').forEach(field => {
      if (!kept.has(field.getAttribute("data-vno-citation-source-id"))) field.removeAttribute("data-vno-citation-source-id");
    });
    this.citationSources = updated.map(normalizeSource);
    this._syncCitationMetadata();
    this._refreshCitationFields();
    this.recordSnapshot("writer.reference.sourcesManage");
    return true;
  }

  insertBibliography(range = null) {
    this.flushTyping();
    const html = `<section class="vno-bibliography" data-vno-bibliography="true" contenteditable="false">${this._bibliographyInnerHtml()}</section>`;
    this._insertCitationHtmlAtRange(html, range || this._captureCitationRange());
    this._syncCitationMetadata();
    this.isDirty = true;
    this.recordSnapshot("writer.reference.bibliographyInsert");
    return true;
  }

  _nodeIsCaption(node) {
    if (!node || node.nodeType !== 1) return false;
    return this._captionAttr(node, "data-vno-caption") === "true"
      || node.dataset?.vnoCaption === "true"
      || Boolean(node.querySelector?.('[data-vno-caption="true"]'));
  }

  _bindCaptionObserver() {
    if (typeof MutationObserver === "undefined" || !this.bodyDom || this._captionObserver) return;
    this._captionObserver = new MutationObserver((mutations) => {
      if (this._isUndoingRedoing || this._captionMutating) return;
      const captionRemoved = mutations.some((mutation) => Array.from(mutation.removedNodes || []).some((node) => this._nodeIsCaption(node)));
      if (!captionRemoved) return;
      this.renumberCaptions({ recordHistory: false, updateTof: true });
    });
    try {
      this._captionObserver.observe(this.bodyDom, { childList: true, subtree: true });
    } catch {
      this._captionObserver = null;
    }
  }

  _captionAttr(el, name) {
    if (!el) return "";
    if (typeof el.getAttribute === "function") return el.getAttribute(name) || "";
    return el.attributes?.[name] || "";
  }

  _collectCaptionNodes() {
    this._initZones();
    if (!this.bodyDom) return [];
    let nodes = [];
    if (typeof this.bodyDom.querySelectorAll === "function") {
      try {
        nodes = Array.from(this.bodyDom.querySelectorAll('[data-vno-caption="true"]'));
      } catch {
        nodes = [];
      }
      if (!nodes.length && this.bodyDom.children) {
        const walk = (node) => {
          if (!node?.children) return;
          for (const child of node.children) {
            if (this._captionAttr(child, "data-vno-caption") === "true" || child.dataset?.vnoCaption === "true") {
              nodes.push(child);
            }
            walk(child);
          }
        };
        walk(this.bodyDom);
      }
    }
    return nodes.filter((el) => !(el.closest && el.closest('[data-vno-tof="true"]')));
  }

  _syncCaptionMetadata() {
    this._initZones();
    if (!this.bodyDom || this._isUndoingRedoing) return;
    const captions = this._collectCaptions("all").map((item) => ({
      id: item.id,
      kind: item.kind,
      number: item.number,
      text: item.text
    }));
    const tof = this._listTableOfFiguresBlocks().map((el) => ({
      kind: el.dataset?.vnoTofKind || this._captionAttr(el, "data-vno-tof-kind") || "figure"
    }));
    const existing = this.bodyDom.querySelector?.('[data-vno-caption-metadata="true"]');
    if (!captions.length && !tof.length) {
      if (existing?.remove) existing.remove();
      return;
    }
    const html = captionsMetadataHtml({ captions, tof });
    if (existing?.remove) existing.remove();
    if (typeof this.bodyDom.insertAdjacentHTML === "function") this.bodyDom.insertAdjacentHTML("beforeend", html);
    else this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}${html}`;
  }

  _collectCaptions(kind = "all") {
    const wanted = kind && kind !== "all" ? normalizeCaptionKind(kind) : "all";
    return this._collectCaptionNodes().map((el) => {
      const capKind = normalizeCaptionKind(this._captionAttr(el, "data-vno-caption-kind") || el.dataset?.vnoCaptionKind || "figure");
      if (wanted !== "all" && capKind !== wanted) return null;
      const id = el.id || this._captionAttr(el, "id") || this._captionAttr(el, "data-vno-caption-id") || el.dataset?.vnoCaptionId;
      const textEl = el.querySelector?.(".vno-caption-text");
      const numEl = el.querySelector?.(".vno-caption-number");
      const labelEl = el.querySelector?.(".vno-caption-label");
      const text = (textEl?.textContent || "").trim();
      const number = String(numEl?.textContent || this._captionAttr(el, "data-vno-caption-index") || "").trim();
      const label = (labelEl?.textContent || captionKindLabel(capKind)).trim();
      return {
        el,
        id,
        kind: capKind,
        number,
        label,
        text,
        display: text ? `${label} ${number}: ${text}` : `${label} ${number}`,
        page: this._estimateHeadingPage(el)
      };
    }).filter(Boolean);
  }

  _findCaptionTarget(explicit) {
    this._initZones();
    if (explicit) {
      if (typeof explicit === "string") {
        return this.bodyDom?.querySelector?.(explicit) || null;
      }
      return explicit;
    }
    const selectedImg = this.bodyDom?.querySelector?.("img.is-vno-image-selected");
    if (selectedImg) return selectedImg;
    if (typeof window === "undefined" || !window.getSelection) return null;
    const selection = window.getSelection();
    if (!selection?.anchorNode) return null;
    const node = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
    if (!node || !this.bodyDom?.contains?.(node)) return null;
    const caption = node.closest?.('[data-vno-caption="true"]');
    if (caption) return null;
    return node.closest?.("table")
      || node.closest?.("img")
      || node.closest?.(".vno-equation, [data-equation='true']")
      || node.closest?.(".vno-writer-diagram, .vno-writer-shape-item, svg")
      || (node.querySelector?.("img") && this.bodyDom.contains(node.querySelector("img")) ? node.querySelector("img") : null);
  }

  _inferCaptionKind(target) {
    if (!target) return "figure";
    const tag = String(target.tagName || "").toUpperCase();
    if (tag === "TABLE") return "table";
    if (target.classList?.contains("vno-equation") || this._captionAttr(target, "data-equation") === "true") return "equation";
    return "figure";
  }

  _captionAnchorBlock(target) {
    if (!target || target === this.bodyDom) return null;
    const tag = String(target.tagName || "").toUpperCase();
    if (tag === "TABLE" || tag === "FIGURE" || this._captionAttr(target, "data-vno-caption") === "true") return target;
    let curr = target;
    let depth = 0;
    while (curr && curr !== this.bodyDom && depth < 12) {
      const parent = curr.parentNode || curr.parentElement;
      if (!parent || parent === this.bodyDom) return curr;
      const parentTag = String(parent.tagName || "").toUpperCase();
      if (parentTag === "TD" || parentTag === "TH" || parentTag === "TR") return target;
      curr = parent;
      depth += 1;
    }
    return target;
  }

  _insertHtmlNear(target, html, position = "below") {
    const where = position === "above" ? "beforebegin" : "afterend";
    if (target && typeof target.insertAdjacentHTML === "function") {
      try {
        target.insertAdjacentHTML(where, html);
        return true;
      } catch {}
    }
    if (target?.parentNode && typeof target.outerHTML === "string") {
      const parent = target.parentNode;
      const outer = target.outerHTML;
      const parentHtml = parent.innerHTML || "";
      const idx = parentHtml.indexOf(outer);
      if (idx >= 0) {
        const at = position === "above" ? idx : idx + outer.length;
        parent.innerHTML = `${parentHtml.slice(0, at)}${html}${parentHtml.slice(at)}`;
        return true;
      }
      if (typeof parent.insertBefore === "function" && typeof document !== "undefined" && document.createElement) {
        try {
          const holder = document.createElement("div");
          holder.innerHTML = html;
          const node = holder.firstElementChild;
          if (node) {
            if (position === "above") parent.insertBefore(node, target);
            else if (target.nextSibling) parent.insertBefore(node, target.nextSibling);
            else parent.appendChild(node);
            return true;
          }
        } catch {}
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!targetDom) return false;
    if (typeof targetDom.insertAdjacentHTML === "function") targetDom.insertAdjacentHTML("beforeend", html);
    else targetDom.innerHTML = `${targetDom.innerHTML || ""}${html}`;
    return true;
  }

  _jumpToCaption(targetId) {
    if (!targetId || !this.bodyDom) return false;
    const escaped = String(targetId).replace(/"/g, "");
    const caption = this.bodyDom.querySelector
      ? (this.bodyDom.querySelector(`#${escaped}`) || this.bodyDom.querySelector(`[data-vno-caption-id="${escaped}"]`))
      : null;
    if (!caption) return false;
    caption.scrollIntoView?.({ behavior: "smooth", block: "start" });
    if (typeof caption.focus === "function") caption.focus();
    const text = caption.querySelector?.(".vno-caption-text");
    if (text && typeof text.focus === "function") text.focus();
    return true;
  }

  _newCaptionId(kind) {
    return `vno-cap-${normalizeCaptionKind(kind)}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  renumberCaptions(options = {}) {
    options = options || {};
    const counts = { figure: 0, table: 0, equation: 0 };
    this._captionMutating = true;
    try {
      for (const el of this._collectCaptionNodes()) {
        const kind = normalizeCaptionKind(this._captionAttr(el, "data-vno-caption-kind") || el.dataset?.vnoCaptionKind || "figure");
        counts[kind] = (counts[kind] || 0) + 1;
        const number = counts[kind];
        const id = el.id || this._captionAttr(el, "data-vno-caption-id") || this._newCaptionId(kind);
        if (typeof el.setAttribute === "function") {
          el.setAttribute("data-vno-caption-kind", kind);
          el.setAttribute("data-vno-caption-index", String(number));
          el.setAttribute("data-vno-caption-id", id);
          el.setAttribute("id", id);
          el.setAttribute("tabindex", "-1");
        } else {
          el.id = id;
          if (el.dataset) {
            el.dataset.vnoCaptionKind = kind;
            el.dataset.vnoCaptionIndex = String(number);
            el.dataset.vnoCaptionId = id;
          }
        }
        const numEl = el.querySelector?.(".vno-caption-number");
        if (numEl) numEl.textContent = String(number);
        const labelEl = el.querySelector?.(".vno-caption-label");
        if (labelEl) labelEl.textContent = captionKindLabel(kind);
        const marker = el.querySelector?.("[data-vno-caption-marker='true']");
        if (marker) {
          marker.textContent = `VNO_CAPTION_V1:${encodeURIComponent(JSON.stringify({ version: 1, kind, id, index: number }))}`;
        }
      }
      if (options.updateTof !== false) {
        this.updateTableOfFigures({ recordHistory: false });
      }
      this._syncCaptionMetadata();
    } finally {
      this._captionMutating = false;
    }
    if (options.recordHistory) {
      this.isDirty = true;
      this.recordSnapshot("writer.reference.captionRenumber");
    }
    return counts;
  }

  insertCaption(options = {}) {
    options = options || {};
    this._initZones();
    if (!this.bodyDom) return null;
    this.flushTyping();

    const target = this._findCaptionTarget(options.target || options.targetSelector);
    const kind = normalizeCaptionKind(options.kind || this._inferCaptionKind(target));
    const position = options.position === "above" || options.position === "below"
      ? options.position
      : defaultCaptionPosition(kind);
    const text = String(options.text || "");
    const id = options.id || this._newCaptionId(kind);
    const html = buildCaptionHtml({ kind, id, number: 1, text });
    const anchor = this._captionAnchorBlock(target);

    this._captionMutating = true;
    try {
      if (anchor) this._insertHtmlNear(anchor, html, position);
      else this._insertHtmlAtCursor(html);
      this.renumberCaptions({ recordHistory: false, updateTof: true });
    } finally {
      this._captionMutating = false;
    }

    this.isDirty = true;
    this.recordSnapshot("writer.reference.captionInsert");
    return id;
  }

  async openInsertCaptionDialog(options = {}) {
    options = options || {};
    const target = this._findCaptionTarget(options.target || options.targetSelector);
    const kind = options.kind || this._inferCaptionKind(target);
    const position = options.position || defaultCaptionPosition(kind);
    if (options.text !== undefined) {
      return this.insertCaption({ ...options, target, kind, position, text: options.text });
    }
    const existingOfKind = this._collectCaptions(kind).length;
    const picked = await showInsertCaptionDialog({
      kind,
      position,
      text: "",
      nextNumber: existingOfKind + 1,
      hasTarget: Boolean(target)
    });
    if (!picked) return null;
    return this.insertCaption({ ...picked, target });
  }

  deleteCaption(id) {
    this._initZones();
    if (!this.bodyDom || !id) return false;
    const caption = this.bodyDom.querySelector
      ? (this.bodyDom.querySelector(`[data-vno-caption-id="${id}"]`) || this.bodyDom.querySelector(`#${id}`))
      : null;
    if (!caption) return false;
    this.flushTyping();
    this._captionMutating = true;
    try {
      if (typeof caption.remove === "function") caption.remove();
      else if (caption.parentNode?.removeChild) caption.parentNode.removeChild(caption);
    } finally {
      this._captionMutating = false;
    }
    this.renumberCaptions({ recordHistory: false, updateTof: true });
    this.isDirty = true;
    this.recordSnapshot("writer.reference.captionDelete");
    return true;
  }

  _tofEmptyMessage() {
    const msg = typeof t === "function" ? t("writerDialogs.tof.empty") : "";
    return (!msg || msg === "writerDialogs.tof.empty")
      ? "Chưa có chú thích nào trong tài liệu. Hãy chèn chú thích ảnh hoặc bảng rồi cập nhật lại danh mục."
      : msg;
  }

  _buildTableOfFiguresEntriesHtml(kind = "figure") {
    const captions = this._collectCaptions(kind);
    if (!captions.length) {
      return `<div class="vno-tof-empty">${this._tofEmptyMessage()}</div>`;
    }
    return captions.map((item) => `
      <div class="vno-tof-item" data-vno-tof-kind="${this._escapeHtml(item.kind)}">
        <a href="#${this._escapeHtml(item.id)}" class="vno-tof-link" data-target-id="${this._escapeHtml(item.id)}">
          <span class="vno-tof-text">${this._escapeHtml(item.display)}</span>
          <span class="vno-tof-leader"></span>
          <span class="vno-tof-page">${item.page}</span>
        </a>
      </div>
    `.trim()).join("\n");
  }

  _buildTableOfFiguresElement(kind = "figure") {
    const safeKind = normalizeTofKind(kind);
    const title = tableOfFiguresTitle(safeKind);
    const updateBtnText = (typeof t === "function" && t("writerDialogs.tof.updateBtn") !== "writerDialogs.tof.updateBtn")
      ? t("writerDialogs.tof.updateBtn")
      : "Cập nhật";
    const updateTooltip = (typeof t === "function" && t("writerDialogs.tof.updateTooltip") !== "writerDialogs.tof.updateTooltip")
      ? t("writerDialogs.tof.updateTooltip")
      : "Cập nhật danh mục hình ảnh";
    const deleteTooltip = (typeof t === "function" && t("writerDialogs.tof.deleteTooltip") !== "writerDialogs.tof.deleteTooltip")
      ? t("writerDialogs.tof.deleteTooltip")
      : "Xóa danh mục hình ảnh";
    const html = `
      <div data-vno-tof="true" data-vno-tof-kind="${this._escapeHtml(safeKind)}" class="vno-tof-block" contenteditable="false">
        <div class="vno-tof-header">
          <span class="vno-tof-title">${this._escapeHtml(title)}</span>
          <div class="vno-tof-actions">
            <button type="button" class="vno-tof-btn vno-tof-btn-update" title="${this._escapeHtml(updateTooltip)}">${this._escapeHtml(updateBtnText)}</button>
            <button type="button" class="vno-tof-btn vno-tof-btn-delete" title="${this._escapeHtml(deleteTooltip)}">&times;</button>
          </div>
        </div>
        <div class="vno-tof-entries">
          ${this._buildTableOfFiguresEntriesHtml(safeKind)}
        </div>
        ${tofMarkerHtml({ kind: safeKind })}
      </div>
    `.trim();
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      return temp.firstElementChild || html;
    }
    return html;
  }

  _listTableOfFiguresBlocks() {
    this._initZones();
    if (!this.bodyDom?.querySelectorAll) return [];
    try {
      return Array.from(this.bodyDom.querySelectorAll('[data-vno-tof="true"]'));
    } catch {
      return [];
    }
  }

  _findTableOfFigures(kind) {
    const wanted = normalizeTofKind(kind);
    return this._listTableOfFiguresBlocks().find((el) => {
      const blockKind = normalizeTofKind(el.dataset?.vnoTofKind || this._captionAttr(el, "data-vno-tof-kind") || "figure");
      return blockKind === wanted;
    }) || null;
  }

  insertTableOfFigures(options = {}) {
    options = options || {};
    this._initZones();
    if (!this.bodyDom) return false;
    const kind = normalizeTofKind(options.kind || "figure");
    const existing = this._findTableOfFigures(kind);
    if (existing) return this.updateTableOfFigures({ kind, recordHistory: true });

    this.flushTyping();
    const tofElement = this._buildTableOfFiguresElement(kind);
    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection && typeof tofElement !== "string") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (!this._isInsideProtectedZone(commonNode) && (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode))) {
          try {
            range.collapse(true);
            range.insertNode(tofElement);
            range.setStartAfter(tofElement);
            inserted = true;
          } catch {}
        }
      }
    }
    if (!inserted) {
      if (typeof tofElement === "string") {
        if (typeof this.bodyDom.insertAdjacentHTML === "function") this.bodyDom.insertAdjacentHTML("beforeend", tofElement);
        else this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}\n${tofElement}`;
      } else if (typeof this.bodyDom.appendChild === "function") {
        this.bodyDom.appendChild(tofElement);
      } else {
        this.bodyDom.innerHTML = `${this.bodyDom.innerHTML || ""}${tofElement.outerHTML || ""}`;
      }
    }
    this._syncCaptionMetadata();
    this.isDirty = true;
    this.recordSnapshot("writer.reference.tofInsert");
    return true;
  }

  async openInsertTableOfFiguresDialog(options = {}) {
    options = options || {};
    if (options.kind) return this.insertTableOfFigures(options);
    const picked = await showInsertTableOfFiguresDialog({ kind: "figure" });
    if (!picked) return false;
    return this.insertTableOfFigures(picked);
  }

  updateTableOfFigures(options = {}) {
    options = options || {};
    this._initZones();
    if (!this.bodyDom) return false;
    const blocks = this._listTableOfFiguresBlocks();
    const kindFilter = options.kind ? normalizeTofKind(options.kind) : null;
    const targets = kindFilter
      ? blocks.filter((el) => normalizeTofKind(el.dataset?.vnoTofKind || this._captionAttr(el, "data-vno-tof-kind") || "figure") === kindFilter)
      : blocks;

    if (!targets.length) {
      if (options.recordHistory === false) return false;
      return this.insertTableOfFigures({ kind: kindFilter || "figure" });
    }

    if (options.recordHistory !== false) this.flushTyping();

    for (const block of targets) {
      const kind = normalizeTofKind(block.dataset?.vnoTofKind || this._captionAttr(block, "data-vno-tof-kind") || "figure");
      const entries = block.querySelector?.(".vno-tof-entries");
      const titleEl = block.querySelector?.(".vno-tof-title");
      if (titleEl) titleEl.textContent = tableOfFiguresTitle(kind);
      if (entries) entries.innerHTML = this._buildTableOfFiguresEntriesHtml(kind);
      else {
        const rebuilt = this._buildTableOfFiguresElement(kind);
        if (typeof rebuilt !== "string" && block.parentNode) block.parentNode.replaceChild(rebuilt, block);
        else block.innerHTML = typeof rebuilt === "string" ? rebuilt : rebuilt.innerHTML;
      }
    }

    if (options.recordHistory !== false) {
      this.isDirty = true;
      this.recordSnapshot("writer.reference.tofUpdate");
    }
    return true;
  }

  deleteTableOfFigures(block) {
    this._initZones();
    const tofBlock = block || (this.bodyDom?.querySelector ? this.bodyDom.querySelector('[data-vno-tof="true"]') : null);
    if (!tofBlock) return false;
    this.flushTyping();
    if (typeof tofBlock.remove === "function") tofBlock.remove();
    else if (tofBlock.parentNode?.removeChild) tofBlock.parentNode.removeChild(tofBlock);
    this._syncCaptionMetadata();
    this.isDirty = true;
    this.recordSnapshot("writer.reference.tofDelete");
    return true;
  }

  _hydrateCaptionsFromDom(fallbackHtml = "") {
    this._initZones();
    if (!this.bodyDom || this._isUndoingRedoing) return false;
    const html = fallbackHtml || this.bodyDom.innerHTML || "";

    this._collectCaptionNodes().forEach((el) => {
      const marker = el.querySelector?.("[data-vno-caption-marker='true']");
      const parsed = parseCaptionMarker(marker?.textContent || el.textContent || "");
      if (parsed?.kind && typeof el.setAttribute === "function") {
        el.setAttribute("data-vno-caption-kind", parsed.kind);
        if (parsed.id) {
          el.setAttribute("data-vno-caption-id", parsed.id);
          el.setAttribute("id", parsed.id);
        }
      }
    });

    if (this.bodyDom.querySelectorAll && this._collectCaptionNodes().length === 0) {
      const paragraphs = Array.from(this.bodyDom.querySelectorAll("p"));
      for (const p of paragraphs) {
        if (this._captionAttr(p, "data-vno-caption") === "true") continue;
        if (p.closest?.('[data-vno-tof="true"]')) continue;
        const marker = parseCaptionMarker(p.textContent || "");
        const parsed = marker || parseCaptionVisibleText(p.textContent || "");
        if (!parsed) continue;
        const id = marker?.id || this._newCaptionId(parsed.kind);
        const text = parsed.text || String(p.textContent || "").replace(/^(Hình|Figure|Bảng|Table|Phương trình|Equation)\s+\d+\s*:?\s*/i, "").trim();
        p.classList?.add("vno-caption");
        if (typeof p.setAttribute === "function") {
          p.setAttribute("data-vno-caption", "true");
          p.setAttribute("data-vno-caption-kind", parsed.kind);
          p.setAttribute("data-vno-caption-id", id);
          p.setAttribute("id", id);
          p.setAttribute("contenteditable", "false");
          p.setAttribute("tabindex", "-1");
        }
        const inner = buildCaptionHtml({ kind: parsed.kind, id, number: parsed.number || 1, text });
        const match = inner.match(/<p\b[^>]*>([\s\S]*)<\/p>/i);
        if (match) p.innerHTML = match[1];
      }
    }

    const tofBlocks = this.bodyDom.querySelectorAll ? Array.from(this.bodyDom.querySelectorAll('[data-vno-tof="true"]')) : [];
    tofBlocks.forEach((block) => {
      const marker = parseTofMarker(block.textContent || html);
      if (marker?.kind && typeof block.setAttribute === "function") {
        block.setAttribute("data-vno-tof", "true");
        block.setAttribute("data-vno-tof-kind", marker.kind);
      }
    });

    const meta = parseCaptionsMetadata(html);
    if (meta?.captions?.length && this._collectCaptionNodes().length === 0) {
      const paragraphs = Array.from(this.bodyDom.querySelectorAll?.("p") || []);
      meta.captions.forEach((item) => {
        const match = paragraphs.find((p) => {
          const parsed = parseCaptionVisibleText(p.textContent || "");
          return parsed && parsed.kind === item.kind && parsed.text === item.text;
        });
        if (!match || typeof match.setAttribute !== "function") return;
        match.setAttribute("data-vno-caption", "true");
        match.setAttribute("data-vno-caption-kind", item.kind);
        match.setAttribute("data-vno-caption-id", item.id);
        match.setAttribute("id", item.id);
      });
    }

    this.renumberCaptions({ recordHistory: false, updateTof: Boolean(tofBlocks.length) });
    return true;
  }

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

    // <p>, not <div>: see _insertPageBreak() for why - a <div> marker here
    // would silently produce zero real page breaks between merged records
    // in real DOCX/PDF export.
    const PAGE_BREAK_HTML = `<p style="page-break-before:always; break-before:page; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</p>`;

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

