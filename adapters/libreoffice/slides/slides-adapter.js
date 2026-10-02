/**
 * 3T Office LibreOffice Adapter — 3T Slide Adapter
 * Quản lý tương tác với StarImpress (sd) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog, showFindReplaceDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { withLazyFeatureProgress } from "../../../platform/startup/lazy-feature.js";
import { globalShortcutManager } from "../../../platform/commands/shortcut-manager.js";
import { overlayFodpMasterLogo } from "./pptx-master-logo.js";
import { overlayFodpSections } from "./pptx-section-list.js";
import { overlayFodpShowProperties } from "./pptx-show-properties.js";

const KNOWN_INSTALLED_FONTS = new Set([
  "arial",
  "arial black",
  "calibri",
  "cambria",
  "candara",
  "comic sans ms",
  "consolas",
  "constantia",
  "corbel",
  "courier new",
  "georgia",
  "impact",
  "lucida console",
  "lucida sans unicode",
  "microsoft sans serif",
  "microsoft yahei",
  "segoe ui",
  "simsun",
  "tahoma",
  "times new roman",
  "trebuchet ms",
  "verdana"
]);

export function isFontAvailable(fontName) {
  if (!fontName) return false;
  const clean = String(fontName).replace(/['"]/g, "").trim();
  if (!clean) return false;

  // In Node.js without DOM: check known installed fonts
  if (typeof document === "undefined") {
    return KNOWN_INSTALLED_FONTS.has(clean.toLowerCase());
  }

  // If document.fonts.check exists:
  if (document.fonts && typeof document.fonts.check === "function") {
    try {
      if (!document.fonts.check(`12px "${clean}"`)) {
        return false;
      }
    } catch (_) {}
  }

  if (KNOWN_INSTALLED_FONTS.has(clean.toLowerCase())) {
    return true;
  }

  // In browser runtime (WebView2), measure via canvas to verify actual OS font availability
  if (typeof document.createElement === "function") {
    try {
      const c = document.createElement("canvas");
      const ctx = c?.getContext?.("2d");
      if (ctx && typeof ctx.measureText === "function") {
        const str = "mmmmmmmmmmlli";
        ctx.font = "72px monospace";
        const wMono = ctx.measureText(str).width;
        ctx.font = "72px sans-serif";
        const wSans = ctx.measureText(str).width;
        ctx.font = `72px "${clean}", monospace`;
        const cMono = ctx.measureText(str).width;
        ctx.font = `72px "${clean}", sans-serif`;
        const cSans = ctx.measureText(str).width;
        return cMono !== wMono || cSans !== wSans;
      }
    } catch (_) {}
  }

  return false;
}

export function resolveDisplayFont(name, genericFamily) {
  if (!name) return "Arial";
  const clean = String(name).replace(/['"]/g, "").trim();
  if (!clean) return "Arial";

  if (isFontAvailable(clean)) {
    return clean;
  }

  // Font not installed: check generic serif / roman
  const generic = typeof genericFamily === "string" ? genericFamily.trim().toLowerCase() : "";
  if (generic === "serif" || generic === "roman" || generic === "times" || generic.includes("serif") || generic.includes("roman")) {
    return "Times New Roman";
  }

  // Default fallback for Windows PowerPoint/Word/Excel: Arial (sans)
  return "Arial";
}

export class SlidesAdapter {
  constructor(canvasController) {
    this.canvas = canvasController;
    this.isDirty = false;
    this.sourceFileName = "TrinhChieu";
    this.sourceFilePath = "";
    this.shell = null;
  }

  /** Gắn tham chiếu AppShell — xem chú thích trong WriterAdapter.setShell(). */
  setShell(shell) {
    this.shell = shell;
    if (shell) {
      shell.adapter = this;
      if (this.canvas) shell.canvas = this.canvas;
    }
  }

  newDocument() {
    this.sourceFileName = "TrinhChieu";
    this.sourceFilePath = "";
    this.isDirty = false;
    if (this.canvas?.resetToBlank) {
      this.canvas.resetToBlank();
    }
    this.shell?.resetDocumentChrome?.("Bản trình bày 1.pptx", "home", false);
    return true;
  }

  closeDocument() {
    if (this.shell?.requestCloseDocument) return this.shell.requestCloseDocument();
    return this.newDocument();
  }

  attach() {
    globalUnoBridge.attachDocument(this);
    // common.edit.undo/redo dùng chung 1 handler toàn Suite qua Command Bus — mỗi app
    // (Writer/Sheet/Slides) PHẢI tự bindHandler() lại khi active, nếu không app kích hoạt
    // trước (mặc định Writer) sẽ chiếm vĩnh viễn phím Ctrl+Z/Ctrl+Y cho mọi app khác.
    // (Lỗi thật đã xảy ra: Ctrl+Z trong Slides gọi nhầm WriterAdapter.undo().)
    globalCommandBus.bindHandler("common.file.new", () => this.shell?.requestNewDocumentWindow?.() ?? this.newDocument());
    globalCommandBus.bindHandler("common.file.close", () => this.closeDocument());
    globalCommandBus.bindHandler("common.file.print", () => this.print());
    globalCommandBus.bindHandler("common.edit.undo", () => this.canvas.undo ? this.canvas.undo() : false);
    globalCommandBus.bindHandler("common.edit.redo", () => this.canvas.redo ? this.canvas.redo() : false);
    globalCommandBus.bindHandler("common.edit.selectAll", () => {
      return this.canvas.selectAllForContext ? this.canvas.selectAllForContext() : false;
    });
    globalCommandBus.bindHandler("common.edit.find", () => this._showFindReplaceDialog(false));
    globalCommandBus.bindHandler("common.edit.replace", () => this._showFindReplaceDialog(true));
    globalCommandBus.bindHandler("slides.edit.selectAll", () => this.canvas.selectAllShapes ? this.canvas.selectAllShapes() : false);
    globalCommandBus.bindHandler("slides.edit.selectObjects", () => this.canvas.selectDrawingObjects ? this.canvas.selectDrawingObjects() : false);
    globalCommandBus.bindHandler("common.edit.pastePlain", () => {
      if (typeof document !== "undefined") {
        document.execCommand("paste", false, null);
        return true;
      }
      return false;
    });
    globalCommandBus.bindHandler("slides.review.commentInsert", (options) => {
      options = options || {};
      return this.canvas.openCommentsPanel ? this.canvas.openCommentsPanel(true) : false;
    });
    globalCommandBus.bindHandler("slides.review.commentPrevious", () => this.canvas.previousComment?.());
    globalCommandBus.bindHandler("slides.review.commentNext", () => this.canvas.nextComment?.());
    globalCommandBus.bindHandler("slides.review.commentDelete", () => this.canvas.deleteActiveComment?.());
    globalCommandBus.bindHandler("slides.review.commentResolve", () => this.canvas.toggleActiveCommentResolved?.());
    globalCommandBus.bindHandler("slides.review.spellCheck", (args) => {
      args = args || {};
      return this.canvas.showSpellcheckDialog ? this.canvas.showSpellcheckDialog(args) : false;
    });
    globalCommandBus.bindHandler("slides.review.toggleSpellCheck", () => {
      return this.canvas.toggleSpellcheck ? this.canvas.toggleSpellcheck() : false;
    });
    globalShortcutManager.bind("F7", "slides.review.spellCheck", "slides");
    globalShortcutManager.bind("F1", "slides.help.open", "slides");
    globalCommandBus.bindHandler("slides.edit.formatPainter", (args) => this.canvas.toggleFormatPainter ? this.canvas.toggleFormatPainter(args || {}) : false);
    globalCommandBus.bindHandler("slides.design.formatBackground", (args) => this.canvas.showFormatBackgroundDialog ? this.canvas.showFormatBackgroundDialog(args || {}) : false);
    globalCommandBus.bindHandler("slides.animation.pane", () => this.canvas.toggleAnimationPane ? this.canvas.toggleAnimationPane() : false);
    globalCommandBus.bindHandler("slides.show.setupShow", () => this.canvas.showSetupShowDialog ? this.canvas.showSetupShowDialog() : false);
    this._bindFormatPainterRibbon();
    // Command metadata is app-local because this feature is scoped to Slides;
    // bind explicitly instead of requiring a Platform registry change.
    globalCommandBus.bindHandler("slides.insert.chart", (options) => this.canvas.insertChart ? this.canvas.insertChart(options) : false);
    globalCommandBus.bindHandler("slides.file.printPreview", () => this.print());
    globalCommandBus.bindHandler("slides.view.normal", () => this.canvas.setNormalView ? this.canvas.setNormalView() : false);
    globalCommandBus.bindHandler("slides.view.slideSorter", () => this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false);
    globalCommandBus.bindHandler("slides.notes.toggle", () => this.canvas.toggleNotes ? this.canvas.toggleNotes() : false);
    globalCommandBus.bindHandler("slides.arrange.alignToSlide", () => this.canvas.toggleAlignToSlide ? this.canvas.toggleAlignToSlide() : false);
    globalCommandBus.bindHandler("slides.view.reading", () => this.canvas.toggleReadingView ? this.canvas.toggleReadingView() : false);
    globalCommandBus.bindHandler("slides.view.ruler", () => this.canvas.toggleRuler ? this.canvas.toggleRuler() : false);
    globalCommandBus.bindHandler("slides.view.gridlines", () => this.canvas.toggleGridlines ? this.canvas.toggleGridlines() : false);
    globalCommandBus.bindHandler("slides.view.guides", () => this.canvas.toggleGuides ? this.canvas.toggleGuides() : false);
    globalCommandBus.bindHandler("slides.view.zoomIn", () => this.canvas.zoomIn ? this.canvas.zoomIn() : false);
    globalCommandBus.bindHandler("slides.view.zoomOut", () => this.canvas.zoomOut ? this.canvas.zoomOut() : false);
    globalCommandBus.bindHandler("slides.view.zoomReset", () => this.canvas.zoomReset ? this.canvas.zoomReset() : false);
    globalCommandBus.bindHandler("slides.view.fitToWindow", () => this.canvas.fitToWindow ? this.canvas.fitToWindow() : false);
    globalCommandBus.bindHandler("slides.view.newWindow", () => this.canvas.newWindow ? this.canvas.newWindow() : false);
    globalCommandBus.bindHandler("slides.section.add", () => this.canvas.promptAddCurrentSection ? this.canvas.promptAddCurrentSection() : false);
    globalCommandBus.bindHandler("slides.section.rename", () => this.canvas.promptRenameCurrentSection ? this.canvas.promptRenameCurrentSection() : false);
    globalCommandBus.bindHandler("slides.section.remove", () => this.canvas.removeCurrentSection ? this.canvas.removeCurrentSection() : false);
    globalCommandBus.bindHandler("slides.section.moveUp", () => this.canvas.moveCurrentSectionUp ? this.canvas.moveCurrentSectionUp() : false);
    globalCommandBus.bindHandler("slides.section.moveDown", () => this.canvas.moveCurrentSectionDown ? this.canvas.moveCurrentSectionDown() : false);
    globalCommandBus.bindHandler("slides.section.menu", () => this.canvas.promptAddCurrentSection ? this.canvas.promptAddCurrentSection() : false);
    globalCommandBus.bindHandler("slides.drawing.arrange", () => this.canvas.reorderSelectedShapes ? this.canvas.reorderSelectedShapes("front") : false);
    globalCommandBus.bindHandler("slides.edit.select", () => this.canvas.selectAllShapes ? this.canvas.selectAllShapes() : false);
    globalCommandBus.bindHandler("slides.text.vAlign", () => this.canvas.setTextVerticalAlign ? this.canvas.setTextVerticalAlign("middle") : false);
    globalCommandBus.bindHandler("slides.text.direction", () => this.canvas.setTextDirection ? this.canvas.setTextDirection("horizontal") : false);
    this._bindTextFormatTracking();
  }

  _showFindReplaceDialog(isReplace = false) {
    if (!this.canvas) return false;
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body?.appendChild) {
      return true;
    }
    try {
      showFindReplaceDialog({
        isReplace,
        app: "slides",
        onFind: (text, options) => this.canvas.findNext ? this.canvas.findNext(text, options) : false,
        onFindPrev: (text, options) => this.canvas.findPrev ? this.canvas.findPrev(text, options) : false,
        onReplace: (findText, replaceText, options) => {
          if (!findText) return false;
          return this.canvas.replaceOne ? this.canvas.replaceOne(findText, replaceText, options) : false;
        },
        onReplaceAll: (findText, replaceText, options) => {
          if (!findText) return 0;
          return this.canvas.replaceAll ? this.canvas.replaceAll(findText, replaceText, options) : 0;
        }
      });
    } catch (_) {
      return true;
    }
    return true;
  }

  _bindFormatPainterRibbon() {
    if (this._formatPainterRibbonBound) return;
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    this._formatPainterRibbonBound = true;
    document.addEventListener("dblclick", (event) => {
      const btn = event.target?.closest?.('[data-command-id="slides.edit.formatPainter"]');
      if (!btn) return;
      event.preventDefault();
      this.canvas?.toggleFormatPainter?.({ locked: true });
    }, true);
  }

  _bindTextFormatTracking() {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    if (this._textFormatSelectionHandler) return;
    this._textFormatSelectionHandler = () => {
      this._rememberTextSelection();
      this._syncTextFormatState();
    };
    this._textFormatMouseDownHandler = (event) => {
      const host = event.target?.closest?.("[data-command-id]");
      const id = host?.getAttribute?.("data-command-id") || "";
      if (!/^slides\.(text|font|para|list|color)\./.test(id) && id !== "slides.edit.formatPainter") return;
      this._rememberTextSelection();
      const tag = (event.target?.tagName || host?.tagName || "").toUpperCase();
      if (tag === "SELECT" || tag === "OPTION") return;
      event.preventDefault();
    };
    document.addEventListener("selectionchange", this._textFormatSelectionHandler);
    document.addEventListener("mousedown", this._textFormatMouseDownHandler, true);
  }

  _isSlideEditable(el) {
    if (!el) return false;
    const editable = el.contentEditable === "true" || el.contentEditable === true;
    if (!editable) return false;
    if (this.canvas?.canvasEl?.contains?.(el)) return true;
    const cls = el.classList;
    return !!(cls?.contains?.("vno-slide-title")
      || cls?.contains?.("vno-slide-body")
      || cls?.contains?.("vno-diagram-node-text")
      || cls?.contains?.("vno-wordart-text")
      || el.tagName === "TD"
      || el.tagName === "TH");
  }

  _containingEditable(node) {
    let current = node;
    if (current?.nodeType === 3) current = current.parentNode;
    while (current) {
      if (this._isSlideEditable(current)) return current;
      current = current.parentNode;
    }
    return null;
  }

  _rememberTextSelection() {
    if (typeof window === "undefined" || typeof window.getSelection !== "function") return;
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (active && !this._isSlideEditable(active) && active !== document.body && active?.tagName !== "BODY") {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const editable = this._containingEditable(range.commonAncestorContainer);
    if (!editable) return;
    try {
      this._savedRange = range.cloneRange();
    } catch {
      this._savedRange = range;
    }
    this._savedEditable = editable;
  }

  _restoreTextSelection() {
    if (typeof window !== "undefined" && typeof window.getSelection === "function") {
      const live = window.getSelection();
      if (live?.rangeCount && !live.getRangeAt(0).collapsed) {
        const liveEditable = this._containingEditable(live.getRangeAt(0).commonAncestorContainer);
        if (liveEditable) {
          this._savedEditable = liveEditable;
          try { this._savedRange = live.getRangeAt(0).cloneRange(); } catch { this._savedRange = live.getRangeAt(0); }
          liveEditable.focus?.();
          return liveEditable;
        }
      }
    }
    const editable = this._savedEditable && this._isSlideEditable(this._savedEditable)
      ? this._savedEditable
      : (this._isSlideEditable(typeof document !== "undefined" ? document.activeElement : null)
        ? document.activeElement
        : this.canvas?.titleEl);
    editable?.focus?.();
    if (this._savedRange && typeof window !== "undefined" && typeof window.getSelection === "function") {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this._savedRange);
      } catch {
        /* selection may be stale after slide switch */
      }
    }
    return editable;
  }

  _queryCommandState(command) {
    try {
      return !!(typeof document !== "undefined" && document.queryCommandState?.(command));
    } catch {
      return false;
    }
  }

  _queryCommandValue(command) {
    try {
      return typeof document !== "undefined" ? String(document.queryCommandValue?.(command) || "") : "";
    } catch {
      return "";
    }
  }

  _syncTextFormatState() {
    if (typeof globalCommandBus?.updateState !== "function") return;
    globalCommandBus.updateState("slides.text.bold", { checked: this._queryCommandState("bold") });
    globalCommandBus.updateState("slides.text.italic", { checked: this._queryCommandState("italic") });
    globalCommandBus.updateState("slides.text.underline", { checked: this._queryCommandState("underline") });
    globalCommandBus.updateState("slides.text.strike", { checked: this._queryCommandState("strikeThrough") });
    globalCommandBus.updateState("slides.list.bullet", { checked: this._queryCommandState("insertUnorderedList") });
    globalCommandBus.updateState("slides.list.numbered", { checked: this._queryCommandState("insertOrderedList") });
    globalCommandBus.updateState("slides.para.alignLeft", { checked: this._queryCommandState("justifyLeft") });
    globalCommandBus.updateState("slides.para.alignCenter", { checked: this._queryCommandState("justifyCenter") });
    globalCommandBus.updateState("slides.para.alignRight", { checked: this._queryCommandState("justifyRight") });
    globalCommandBus.updateState("slides.para.justify", { checked: this._queryCommandState("justifyFull") });

    const familyRaw = this._queryCommandValue("fontName").replace(/['"]/g, "").split(",")[0].trim();
    if (typeof document !== "undefined" && document.querySelectorAll) {
      document.querySelectorAll('select[data-command-id="slides.font.family"]').forEach((select) => {
        if (familyRaw && [...(select.options || [])].some((option) => option.value === familyRaw)) {
          select.value = familyRaw;
        }
      });
      const sizeRaw = this._queryCommandValue("fontSize");
      document.querySelectorAll('select[data-command-id="slides.font.size"]').forEach((select) => {
        if (sizeRaw && [...(select.options || [])].some((option) => option.value === sizeRaw)) {
          select.value = sizeRaw;
        }
      });
    }
  }

  _applyExecCommand(command, value) {
    this._restoreTextSelection();
    if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
    const ok = document.execCommand(command, false, value === undefined ? null : value);
    this.canvas?._syncEditableFieldsFromDom?.();
    this._syncTextFormatState();
    return ok;
  }

  _setLineHeight(value) {
    this._restoreTextSelection();
    const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
    let node = selection?.anchorNode;
    if (node?.nodeType === 3) node = node.parentNode;
    const root = this._savedEditable || this.canvas?.canvasEl;
    while (node && node !== root && node.tagName !== "P" && node.tagName !== "DIV" && node.tagName !== "LI") {
      node = node.parentNode;
    }
    // Ribbon chọn bội số kiểu PowerPoint (1.0/1.5/2.0 × chiều cao dòng tự nhiên) → CSS qua cùng hằng số.
    const multiple = parseFloat(value);
    const cssValue = Number.isFinite(multiple) && !/[a-z%]/i.test(String(value))
      ? (this._odfProportionalToCssLineHeight(`${multiple * 100}%`) || String(value))
      : String(value);
    if (node && node !== root && node.style) node.style.lineHeight = cssValue;
    else if (this._savedEditable?.style) this._savedEditable.style.lineHeight = cssValue;
    this.canvas?._syncEditableFieldsFromDom?.();
    this._syncTextFormatState();
    return true;
  }

  _adjustFontSize(delta) {
    this._restoreTextSelection();
    if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
    const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
    let node = selection?.anchorNode;
    if (node?.nodeType === 3) node = node.parentNode;
    const current = (typeof window !== "undefined" && node && window.getComputedStyle)
      ? parseInt(window.getComputedStyle(node).fontSize, 10)
      : 16;
    const nextSize = Math.max(10, Math.min(96, (Number.isFinite(current) ? current : 16) + delta * 4));
    document.execCommand("fontSize", false, "7");
    const root = this._savedEditable || this.canvas?.canvasEl;
    const fonts = root?.getElementsByTagName?.("font") || [];
    for (let index = 0; index < fonts.length; index++) {
      if (fonts[index].size === "7" || fonts[index].getAttribute?.("size") === "7") {
        fonts[index].removeAttribute("size");
        fonts[index].style.fontSize = `${nextSize}px`;
      }
    }
    this.canvas?._syncEditableFieldsFromDom?.();
    this._syncTextFormatState();
    return true;
  }

  /** Giá trị ô Cỡ chữ trên ribbon ("1".."7" = 10/13/16/18/24/32/48) hoặc số pt trực tiếp. */
  _ribbonFontSizeToPt(value) {
    const raw = String(value ?? "").trim();
    const index = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 };
    if (/^[1-7]$/.test(raw)) return index[raw];
    const num = parseFloat(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  /**
   * Đặt cỡ chữ đúng N pt cho vùng chọn (PowerPoint: ô Cỡ chữ). execCommand("fontSize") chỉ
   * có 7 bậc từ khóa CSS (x-small…xxx-large); bản cũ lưu nguyên từ khóa đó, LibreOffice
   * không hiểu và PowerPoint mở ra chữ cỡ 1 pt (đo bằng COM, G8). Ở đây đánh dấu vùng chọn
   * bằng bậc 7 rồi thay bằng cỡ pt thật.
   */
  _applyFontSizePt(pt) {
    if (!pt) return false;
    this._restoreTextSelection();
    if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
    document.execCommand("fontSize", false, "7");
    const root = this._savedEditable || this.canvas?.canvasEl || document.body;
    const marked = [
      ...(root?.querySelectorAll?.('font[size="7"]') || []),
      ...[...(root?.querySelectorAll?.("span[style]") || [])].filter((el) => /xxx-large/i.test(el.style?.fontSize || ""))
    ];
    // Cỡ trên màn hình theo đơn vị canvas: N pt tài liệu = N / ptPerPx px (bản mới 1 px = 1 pt).
    const px = Math.round((pt / this._ptPerPx()) * 100) / 100;
    for (const el of marked) {
      el.removeAttribute?.("size");
      el.style.fontSize = `${px}px`;
    }
    this.canvas?._syncEditableFieldsFromDom?.();
    this._syncTextFormatState();
    return true;
  }

  /**
   * Số pt tài liệu ứng với 1 px canvas. Bản trình chiếu MỚI dùng khổ PowerPoint thật
   * (16:9 = 960 × 540 pt, 4:3 = 720 × 540 pt) trên canvas 960/720 × 540 px ⇒ 1 px = 1 pt.
   * Tệp mở từ ngoài giữ khổ gốc theo 96 dpi ⇒ 1 px = 0,75 pt.
   */
  _ptPerPx() {
    const value = Number(this.canvas?.ptPerPx);
    return Number.isFinite(value) && value > 0 ? value : 0.75;
  }

  /** Cỡ chữ CSS (đang hiển thị trên canvas) → pt cho ODF theo đơn vị của tài liệu. */
  _cssFontSizeToOdf(value) {
    const raw = String(value || "").trim().toLowerCase();
    const ptPerPx = this._ptPerPx();
    const toPt = (px) => `${Math.round(px * ptPerPx * 10) / 10}pt`;
    const keywords = { "xx-small": 9, "x-small": 10, small: 13, medium: 16, large: 18, "x-large": 24, "xx-large": 32, "xxx-large": 48, "-webkit-xxx-large": 48 };
    if (keywords[raw]) return toPt(keywords[raw]);
    const px = raw.match(/^([\d.]+)px$/);
    if (px) return toPt(parseFloat(px[1]));
    const pt = raw.match(/^([\d.]+)pt$/);
    if (pt) return toPt(parseFloat(pt[1]) * 96 / 72);
    if (/^[\d.]+(em|%)$/.test(raw)) return raw;
    if (/^[\d.]+$/.test(raw)) return `${raw}pt`;
    return null;
  }

  _isTextFormatCommand(cmd) {
    return /^(slides\.text\.(bold|italic|underline|strike|clearFormat)|slides\.font\.(family|size|grow|shrink)|slides\.color\.(text|highlight)|slides\.list\.(bullet|numbered)|slides\.para\.(alignLeft|alignCenter|alignRight|justify|indentInc|indentDec|lineSpacing))$/.test(cmd || "");
  }

  _handleTextFormatCommand(cmd, args) {
    switch (cmd) {
      case "slides.text.bold":
        this._applyExecCommand("bold");
        return this._queryCommandState("bold");
      case "slides.text.italic":
        this._applyExecCommand("italic");
        return this._queryCommandState("italic");
      case "slides.text.underline":
        this._applyExecCommand("underline");
        return this._queryCommandState("underline");
      case "slides.text.strike":
        this._applyExecCommand("strikeThrough");
        return this._queryCommandState("strikeThrough");
      case "slides.text.clearFormat":
        this._applyExecCommand("removeFormat");
        return true;
      case "slides.font.family":
        if (args) this._applyExecCommand("fontName", args);
        return true;
      case "slides.font.size":
        if (args) return this._applyFontSizePt(this._ribbonFontSizeToPt(args));
        return true;
      case "slides.font.grow":
        return this._adjustFontSize(1);
      case "slides.font.shrink":
        return this._adjustFontSize(-1);
      case "slides.color.text":
        return this._applyExecCommand("foreColor", args || "#dc2626");
      case "slides.color.highlight":
        return this._applyExecCommand("hiliteColor", args || "#ffcd00");
      case "slides.list.bullet":
        this._applyExecCommand("insertUnorderedList");
        return this._queryCommandState("insertUnorderedList");
      case "slides.list.numbered":
        this._applyExecCommand("insertOrderedList");
        return this._queryCommandState("insertOrderedList");
      case "slides.para.alignLeft":
        this._applyExecCommand("justifyLeft");
        this._syncTextFormatState();
        return this._queryCommandState("justifyLeft");
      case "slides.para.alignCenter":
        this._applyExecCommand("justifyCenter");
        this._syncTextFormatState();
        return this._queryCommandState("justifyCenter");
      case "slides.para.alignRight":
        this._applyExecCommand("justifyRight");
        this._syncTextFormatState();
        return this._queryCommandState("justifyRight");
      case "slides.para.justify":
        this._applyExecCommand("justifyFull");
        this._syncTextFormatState();
        return this._queryCommandState("justifyFull");
      case "slides.para.indentInc":
        return this._applyExecCommand("indent");
      case "slides.para.indentDec":
        return this._applyExecCommand("outdent");
      case "slides.para.lineSpacing":
        return this._setLineHeight(args || "1.0");
      default:
        return false;
    }
  }

  _newRichTextContext() {
    return { textStyles: [], paraStyles: [], listStyles: [] };
  }

  _richKey(props) {
    return Object.keys(props || {}).sort().filter((key) => props[key]).map((key) => `${key}=${props[key]}`).join(";");
  }

  _ensureNamedStyle(list, prefix, props) {
    const filtered = {};
    for (const [key, value] of Object.entries(props || {})) {
      if (value) filtered[key] = value;
    }
    if (!Object.keys(filtered).length) return null;
    const key = this._richKey(filtered);
    let found = list.find((item) => item.key === key);
    if (!found) {
      found = { name: `${prefix}${list.length + 1}`, key, props: filtered };
      list.push(found);
    }
    return found.name;
  }

  _htmlHasFormat(html) {
    const value = String(html || "");
    if (!value) return false;
    if (/<(b|strong|i|em|u|s|strike|sub|sup|font|ul|ol|li|blockquote)\b/i.test(value)) return true;
    const styleMatch = value.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const styleVal = styleMatch ? (styleMatch[1] !== undefined ? styleMatch[1] : (styleMatch[2] || "")) : "";
    if (/(?:font-weight|font-style|text-decoration|color|background|font-family|font-size|text-align|line-height)/i.test(styleVal)) return true;
    return /<(span|div|p)\b[^>]*(align|face|color|size)=/i.test(value);
  }

  _plainFromHtml(html) {
    return this._unescapeXml(String(html || "")
      .replace(/<span[^>]*data-vno-spelling-uncertain[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/<span[^>]*class="[^"]*vno-spelling-uncertain[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\n+$/g, ""));
  }

  _cssColorToHex(raw) {
    const value = String(raw || "").trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      if (value.length === 4) {
        return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
      }
      return value.toLowerCase();
    }
    const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
      const hex = (num) => Number(num).toString(16).padStart(2, "0");
      return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
    }
    return value;
  }

  _htmlFontSizeToPt(size) {
    const map = { 1: "10pt", 2: "13pt", 3: "16pt", 4: "18pt", 5: "24pt", 6: "32pt", 7: "48pt" };
    return map[String(size)] || null;
  }

  _styleFromHtmlAttrs(tag, attrs) {
    const out = {};
    const lower = String(tag || "").toLowerCase();
    if (lower === "b" || lower === "strong") out.bold = true;
    if (lower === "i" || lower === "em") out.italic = true;
    if (lower === "u") out.underline = true;
    if (lower === "s" || lower === "strike") out.strike = true;
    if (lower === "font") {
      const face = this._attr(` ${attrs} `, "face") || attrs.match(/face\s*=\s*(?:"([^"]+)"|'([^']+)')/i)?.[1];
      const color = this._attr(` ${attrs} `, "color") || attrs.match(/color\s*=\s*(?:"([^"]+)"|'([^']+)')/i)?.[1];
      const size = this._attr(` ${attrs} `, "size") || attrs.match(/size\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i)?.[1];
      if (face) out.family = face.split(",")[0].replace(/['"]/g, "").trim();
      if (color) out.color = this._cssColorToHex(color);
      if (size) out.size = this._htmlFontSizeToPt(size);
    }
    const styleMatch = attrs.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const style = styleMatch ? (styleMatch[1] !== undefined ? styleMatch[1] : (styleMatch[2] || "")) : "";
    for (const part of style.split(";")) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      const key = part.slice(0, colon).trim().toLowerCase();
      const value = part.slice(colon + 1).trim();
      if (!key || !value) continue;
      if (key === "font-weight" && /^(bold|bolder|[6-9]00)$/i.test(value)) out.bold = true;
      // Bỏ đậm tường minh (vd tiêu đề mặc định đậm rồi bấm Ctrl+B) phải thắng định dạng gốc.
      if (key === "font-weight" && /^(normal|lighter|[1-5]00)$/i.test(value)) out.bold = false;
      if (key === "font-style" && /italic/i.test(value)) out.italic = true;
      if (key === "font-style" && /^normal$/i.test(value)) out.italic = false;
      if (key === "text-decoration" && /underline/i.test(value)) out.underline = true;
      if (key === "text-decoration" && /line-through/i.test(value)) out.strike = true;
      if (key === "color") out.color = this._cssColorToHex(value);
      if (key === "background-color" || key === "background") {
        // Nền bán trong suốt (rgba alpha < 1) là màu tô khung đang chọn của giao diện mà
        // Chromium execCommand chép vào span — không phải màu tô sáng người dùng chọn.
        const alpha = value.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i)?.[1];
        if (!(alpha !== undefined && parseFloat(alpha) < 1) && !/^transparent$/i.test(value)) out.bg = this._cssColorToHex(value);
      }
      if (key === "font-family") out.family = value.replace(/['"]/g, "").split(",")[0].trim();
      if (key === "font-size") {
        const size = this._cssFontSizeToOdf(value);
        if (size) out.size = size;
      }
      if (key === "text-align") out.align = value;
      if (key === "line-height") out.lineHeight = value;
      if (key === "margin-left") out.indent = value;
    }
    const align = this._attr(` ${attrs} `, "align") || attrs.match(/\balign\s*=\s*(?:"([^"]+)"|'([^']+)')/i)?.[1];
    if (align) out.align = align;
    return out;
  }

  _walkHtml(html, handlers) {
    const re = /<\/?([a-zA-Z0-9]+)([^>]*)\/?>|([^<]+)/g;
    let match;
    const source = String(html || "");
    while ((match = re.exec(source))) {
      if (match[3]) {
        handlers.text?.(this._unescapeXml(match[3].replace(/&nbsp;/gi, " ")));
        continue;
      }
      const tag = match[1].toLowerCase();
      const isClose = source[match.index + 1] === "/";
      const selfClose = /\/\s*>$/.test(match[0]) || tag === "br";
      if (isClose) handlers.close?.(tag);
      else {
        handlers.open?.(tag, match[2] || "");
        if (selfClose) handlers.close?.(tag);
      }
    }
  }

  _spansToOdf(texts, block, ctx) {
    const paraName = this._ensureNamedStyle(ctx.paraStyles, "vnoP", {
      align: block.align,
      lineHeight: block.lineHeight,
      indent: block.indent
    });
    const styleAttr = paraName ? ` text:style-name="${paraName}"` : "";
    const inner = (texts || []).map(({ text, fmt }) => {
      const escaped = this._escapeXml(text);
      const name = this._ensureNamedStyle(ctx.textStyles, "vnoT", fmt);
      return name ? `<text:span text:style-name="${name}">${escaped}</text:span>` : escaped;
    }).join("");
    return `<text:p${styleAttr}>${inner}</text:p>`;
  }

  _htmlToOdfXml(html, ctx, base = null) {
    if (!this._htmlHasFormat(html)) {
      return base ? this._plainParagraphsWithBase(this._plainFromHtml(html), ctx, base) : this._textParagraphsXml(this._plainFromHtml(html));
    }
    const blocks = [];
    let current = { texts: [], align: base?.align || null, lineHeight: null, indent: null, list: null };
    const formatStack = [base?.fmt ? { ...base.fmt } : {}];
    const currentFmt = () => Object.assign({}, ...formatStack);
    const flush = () => {
      if (current.texts.some((item) => item.text) || current.list) blocks.push(current);
      current = { texts: [], align: current.align, lineHeight: current.lineHeight, indent: current.indent, list: current.list };
    };

    this._walkHtml(html, {
      text: (text) => {
        if (text) current.texts.push({ text, fmt: currentFmt() });
      },
      open: (tag, attrs) => {
        const css = this._styleFromHtmlAttrs(tag, attrs);
        if (css.align) current.align = css.align;
        if (css.lineHeight) current.lineHeight = css.lineHeight;
        if (css.indent) current.indent = css.indent;
        if (tag === "ul") current.list = "bullet";
        if (tag === "ol") current.list = "number";
        if (tag === "br") {
          flush();
          return;
        }
        if ((tag === "p" || tag === "div" || tag === "li") && current.texts.length) flush();
        if (tag === "li") current.list = current.list || "bullet";
        formatStack.push(css);
      },
      close: (tag) => {
        if (tag === "li" || tag === "p" || tag === "div") {
          if (current.texts.length || tag === "li") flush();
        }
        if (tag === "ul" || tag === "ol") current.list = null;
        if (formatStack.length > 1) formatStack.pop();
      }
    });
    if (current.texts.length) flush();
    if (!blocks.length) {
      return base ? this._plainParagraphsWithBase(this._plainFromHtml(html), ctx, base) : this._textParagraphsXml(this._plainFromHtml(html));
    }

    const parts = [];
    let listBuffer = null;
    const flushList = () => {
      if (!listBuffer) return;
      const listName = this._ensureNamedStyle(ctx.listStyles, "vnoL", { kind: listBuffer.kind });
      const items = listBuffer.items.map((item) => `<text:list-item>${item}</text:list-item>`).join("");
      parts.push(`<text:list text:style-name="${listName}">${items}</text:list>`);
      listBuffer = null;
    };
    for (const block of blocks) {
      const para = this._spansToOdf(block.texts, block, ctx);
      if (block.list) {
        if (!listBuffer || listBuffer.kind !== block.list) {
          flushList();
          listBuffer = { kind: block.list, items: [] };
        }
        listBuffer.items.push(para);
      } else {
        flushList();
        parts.push(para);
      }
    }
    flushList();
    return parts.join("") || "<text:p/>";
  }

  _richOrPlainXml(plain, html, ctx, base = null) {
    if (html && this._htmlHasFormat(html) && ctx) return this._htmlToOdfXml(html, ctx, base);
    if (base && ctx) return this._plainParagraphsWithBase(plain, ctx, base);
    return this._textParagraphsXml(plain);
  }

  /** Đoạn chữ thường mang định dạng gốc của khung (phông/cỡ/màu/đậm/căn lề của chủ đề). */
  _plainParagraphsWithBase(plain, ctx, base) {
    const lines = String(plain ?? "").split("\n");
    if (lines.length === 1 && lines[0] === "") return "<text:p/>";
    return lines.map((line) => this._spansToOdf(line ? [{ text: line, fmt: { ...(base.fmt || {}) } }] : [], { align: base.align }, ctx)).join("");
  }

  _firstAvailableFontFamily(list) {
    const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif"]);
    const names = String(list || "").split(",").map((name) => name.replace(/['"]/g, "").trim()).filter(Boolean);
    for (const name of names) {
      if (generic.has(name.toLowerCase())) continue;
      if (isFontAvailable(name)) return name;
    }
    return resolveDisplayFont(names.find((name) => !generic.has(name.toLowerCase())) || "Arial", names.find((name) => generic.has(name.toLowerCase())));
  }

  /**
   * Định dạng chữ mà trang chiếu VN đang HIỂN THỊ cho khung tiêu đề / nội dung (phông và
   * màu của chủ đề, cỡ/độ đậm/căn lề theo slides.css), ghi thẳng vào từng đoạn khi lưu.
   * LibreOffice bỏ qua text-properties của style presentation (prTitle/prBody) khi xuất
   * PPTX (đo: mọi tiêu đề ra Arial 44pt đen, căn giữa, không đậm — khác hẳn màn hình), nên
   * phải đặt ở mức đoạn/span thì PowerPoint mới mở ra đúng như 3T Slide. Tệp mở từ ngoài
   * (imported) giữ nguyên định dạng gốc của tệp, không áp chủ đề VN.
   */
  _themeTextBase(role, slide) {
    if (this.canvas?.imported || slide?.imported) return null;
    const theme = this._masterTheme();
    if (!theme) return null;
    const family = this._firstAvailableFontFamily(theme.fontFamily || "Arial");
    // Cỡ chữ canvas (slides.css: tiêu đề 32 px, trang Tiêu đề 44 px, nội dung 20 px) quy
    // ra pt theo đơn vị tài liệu — bản mới 1 px = 1 pt nên giữ đúng tỉ lệ chữ / khổ trang.
    const pt = (px) => `${Math.round(px * this._ptPerPx() * 10) / 10}pt`;
    if (role === "title") {
      const titleOnly = (slide?.layoutType || "title-content") === "title-only";
      return {
        align: titleOnly ? "center" : "left",
        fmt: { family, size: pt(titleOnly ? 44 : 32), bold: true, color: this._cssColorToHex(theme.titleColor || "#0f172a") }
      };
    }
    return {
      align: "left",
      fmt: { family, size: pt(20), color: this._cssColorToHex(theme.bodyColor || "#334155") }
    };
  }

  /**
   * ODF/PowerPoint "100%" = chiều cao dòng TỰ NHIÊN của font (ascent+descent+lineGap,
   * ≈ 1.15 × cỡ chữ với Arial/Calibri), còn CSS `line-height: 1` = đúng 1 × cỡ chữ.
   * Hai chiều đều đi qua hằng số này: proportional P → CSS P × 1.15 (P = 1 → `normal`),
   * CSS r → ODF round(r / 1.15 × 100)%.
   */
  static get LINE_HEIGHT_NATURAL_RATIO() { return 1.15; }

  _odfProportionalToCssLineHeight(percent) {
    const num = parseFloat(percent) / 100;
    if (!Number.isFinite(num) || num <= 0) return null;
    if (Math.abs(num - 1) < 0.001) return "normal";
    return String(Math.round(num * SlidesAdapter.LINE_HEIGHT_NATURAL_RATIO * 1000) / 1000);
  }

  _formatLineHeightForOdf(lh) {
    if (!lh) return null;
    const str = String(lh).trim().toLowerCase();
    if (str === "normal") return null;
    if (/^[\d.]+%$/.test(str) || /^[\d.]+(?:pt|cm|mm|in)$/.test(str)) {
      return str;
    }
    if (/^([\d.]+)px$/.test(str)) {
      const px = parseFloat(str);
      const pt = Math.round(px * this._ptPerPx() * 100) / 100;
      return `${pt}pt`;
    }
    const n = parseFloat(str);
    if (Number.isFinite(n) && !/[a-z%]/i.test(str)) {
      return `${Math.round((n / SlidesAdapter.LINE_HEIGHT_NATURAL_RATIO) * 100)}%`;
    }
    return str;
  }

  _serializeRichTextStyles(ctx) {
    if (!ctx) return "";
    let xml = "";
    for (const style of ctx.paraStyles) {
      const props = style.props || {};
      const attrs = [];
      if (props.align) attrs.push(`fo:text-align="${this._escapeXml(props.align)}"`);
      if (props.lineHeight) {
        const odfLh = this._formatLineHeightForOdf(props.lineHeight);
        if (odfLh) attrs.push(`fo:line-height="${this._escapeXml(odfLh)}"`);
      }
      if (props.indent) attrs.push(`fo:margin-left="${this._escapeXml(props.indent)}"`);
      xml += `
    <style:style style:name="${style.name}" style:family="paragraph">
      <style:paragraph-properties ${attrs.join(" ")}/>
    </style:style>`;
    }
    for (const style of ctx.textStyles) {
      const props = style.props || {};
      const attrs = [];
      if (props.bold) attrs.push('fo:font-weight="bold"');
      if (props.italic) attrs.push('fo:font-style="italic"');
      if (props.underline) {
        attrs.push('style:text-underline-style="solid"');
        attrs.push('style:text-underline-width="auto"');
        attrs.push('style:text-underline-color="font-color"');
      }
      if (props.strike) attrs.push('style:text-line-through-style="solid"');
      if (props.color) attrs.push(`fo:color="${this._escapeXml(props.color)}"`);
      if (props.bg) attrs.push(`fo:background-color="${this._escapeXml(props.bg)}"`);
      if (props.family) {
        attrs.push(`fo:font-family="${this._escapeXml(props.family)}"`);
        attrs.push(`style:font-name="${this._escapeXml(props.family)}"`);
      }
      if (props.size) attrs.push(`fo:font-size="${this._escapeXml(props.size)}"`);
      xml += `
    <style:style style:name="${style.name}" style:family="text">
      <style:text-properties ${attrs.join(" ")}/>
    </style:style>`;
    }
    for (const style of ctx.listStyles) {
      if (style.props?.kind === "number") {
        xml += `
    <text:list-style style:name="${style.name}">
      <text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix=".">
        <style:list-level-properties text:space-before="0.5cm" text:min-label-width="0.5cm"/>
      </text:list-level-style-number>
    </text:list-style>`;
      } else {
        xml += `
    <text:list-style style:name="${style.name}">
      <text:list-level-style-bullet text:level="1" text:bullet-char="•">
        <style:list-level-properties text:space-before="0.5cm" text:min-label-width="0.5cm"/>
      </text:list-level-style-bullet>
    </text:list-style>`;
      }
    }
    return xml;
  }

  _parseRichStyleMaps(xmlText) {
    const text = new Map();
    const para = new Map();
    const list = new Map();
    const styleRe = /<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi;
    let match;
    while ((match = styleRe.exec(xmlText || "")) !== null) {
      const family = match[1].match(/style:family=["']([^"']+)["']/i)?.[1];
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const inner = match[2] || "";
      if (family === "text") {
        const weightMatch = inner.match(/fo:font-weight=["']([^"']+)["']/i)?.[1];
        const isBold = /fo:font-weight=["']bold["']/i.test(inner) || /fo:font-weight=["'][7-9]00["']/i.test(inner);
        text.set(name, {
          bold: isBold,
          weight: weightMatch || (isBold ? "bold" : null),
          fontWeight: weightMatch || (isBold ? "bold" : null),
          italic: /fo:font-style=["']italic["']/i.test(inner),
          underline: /style:text-underline-style=["'](?!none)[^"']+["']/i.test(inner),
          strike: /style:text-line-through-style=["'](?!none)[^"']+["']/i.test(inner),
          color: inner.match(/fo:color=["']([^"']+)["']/i)?.[1],
          bg: inner.match(/fo:background-color=["']([^"']+)["']/i)?.[1],
          family: inner.match(/fo:font-family=["']([^"']+)["']/i)?.[1] || inner.match(/style:font-name=["']([^"']+)["']/i)?.[1],
          genericFamily: inner.match(/style:font-family-generic=["']([^"']+)["']/i)?.[1],
          size: inner.match(/fo:font-size=["']([^"']+)["']/i)?.[1]
        });
      } else if (family === "paragraph") {
        let rawLh = inner.match(/fo:line-height=["']([^"']+)["']/i)?.[1];
        if (rawLh && rawLh.endsWith("%")) {
          rawLh = this._odfProportionalToCssLineHeight(rawLh) || rawLh;
        }
        const weightMatch = inner.match(/fo:font-weight=["']([^"']+)["']/i)?.[1];
        const isBold = /fo:font-weight=["']bold["']/i.test(inner) || /fo:font-weight=["'][7-9]00["']/i.test(inner);
        para.set(name, {
          align: inner.match(/fo:text-align=["']([^"']+)["']/i)?.[1],
          fontSize: inner.match(/fo:font-size=["']([^"']+)["']/i)?.[1],
          bold: isBold,
          weight: weightMatch || (isBold ? "bold" : null),
          fontWeight: weightMatch || (isBold ? "bold" : null),
          color: inner.match(/fo:color=["']([^"']+)["']/i)?.[1],
          lineHeight: rawLh,
          indent: inner.match(/fo:margin-left=["']([^"']+)["']/i)?.[1]
        });
      }
    }
    const listRe = /<text:list-style\b([^>]*)>([\s\S]*?)<\/text:list-style>/gi;
    while ((match = listRe.exec(xmlText || "")) !== null) {
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      list.set(name, /list-level-style-number/i.test(match[2] || "") ? "number" : "bullet");
    }
    return { text, para, list };
  }

  _odfInlineToHtml(inner, maps) {
    let html = String(inner || "");
    html = html.replace(/<text:line-break\b[^>]*\/?>/gi, "<br>");
    html = html.replace(/<text:s\b[^>]*text:c=["'](\d+)["'][^>]*\/?>/gi, (_, c) => " ".repeat(parseInt(c, 10) || 1));
    html = html.replace(/<text:s\b[^>]*\/?>/gi, " ");
    html = html.replace(/<text:span\b([^>]*)>([\s\S]*?)<\/text:span>/gi, (_, attrs, content) => {
      const name = attrs.match(/text:style-name=["']([^"']+)["']/i)?.[1];
      const fmt = maps?.text?.get(name) || {};
      let cleanContent = String(content)
        .replace(/<text:line-break\b[^>]*\/?>/gi, "<br>")
        .replace(/<text:s\b[^>]*text:c=["'](\d+)["'][^>]*\/?>/gi, (_, c) => " ".repeat(parseInt(c, 10) || 1))
        .replace(/<text:s\b[^>]*\/?>/gi, " ");
      const parts = cleanContent.split(/<br\s*\/?>/i);
      let wrapped = parts.map(p => this._escapeXml(this._unescapeXml(p.replace(/<[^>]+>/g, "")))).join("<br>");
      if (fmt.bold) wrapped = `<b>${wrapped}</b>`;
      if (fmt.italic) wrapped = `<i>${wrapped}</i>`;
      if (fmt.underline) wrapped = `<u>${wrapped}</u>`;
      if (fmt.strike) wrapped = `<s>${wrapped}</s>`;
      const spanStyles = [];
      if (fmt.color) spanStyles.push(`color:${fmt.color}`);
      if (fmt.bg && fmt.bg !== "transparent") spanStyles.push(`background-color:${fmt.bg}`);
      if (fmt.family) {
        const cleanFamily = fmt.family.replace(/['"]/g, "").trim();
        const generic = fmt.genericFamily && /serif|roman|times/i.test(fmt.genericFamily) ? "serif" : "sans-serif";
        spanStyles.push(`font-family:'${cleanFamily}',${generic}`);
      }
      if (fmt.size) spanStyles.push(`font-size:${fmt.size}`);
      if (fmt.fontWeight) spanStyles.push(`font-weight:${fmt.fontWeight}`);
      if (spanStyles.length) wrapped = `<span style="${spanStyles.join(";")}">${wrapped}</span>`;
      return wrapped;
    });
    return html.replace(/<\/?text:[^>]+>/g, "");
  }

  _htmlFromOdfXml(xml, maps) {
    const source = String(xml || "");
    if (!source) return "";
    let out = "";
    const re = /<text:list\b([^>]*)>([\s\S]*?)<\/text:list>|<text:p\b([^>]*)>([\s\S]*?)<\/text:p>/gi;
    let match;
    while ((match = re.exec(source)) !== null) {
      if (match[0].startsWith("<text:list")) {
        const listName = (match[1] || "").match(/text:style-name=["']([^"']+)["']/i)?.[1];
        const kind = maps?.list?.get(listName) || "bullet";
        const tag = kind === "number" ? "ol" : "ul";
        const items = [];
        const itemRe = /<text:list-item\b[^>]*>([\s\S]*?)<\/text:list-item>/gi;
        let itemMatch;
        while ((itemMatch = itemRe.exec(match[2] || "")) !== null) {
          items.push(`<li>${this._odfInlineToHtml(itemMatch[1], maps)}</li>`);
        }
        out += `<${tag}>${items.join("")}</${tag}>`;
      } else {
        const paraName = (match[3] || "").match(/text:style-name=["']([^"']+)["']/i)?.[1];
        const para = maps?.para?.get(paraName) || {};
        const inner = this._odfInlineToHtml(match[4], maps);
        const styles = [];
        if (para.align) styles.push(`text-align:${para.align}`);
        if (para.fontSize) styles.push(`font-size:${para.fontSize}`);
        if (para.lineHeight) {
          // para.lineHeight đã ở dạng CSS (qua _odfProportionalToCssLineHeight khi parse);
          // giá trị % còn sót (từ nguồn khác) được quy đổi tại đây cho cùng một quy tắc.
          const lh = String(para.lineHeight);
          const css = lh.endsWith("%") ? (this._odfProportionalToCssLineHeight(lh) || lh) : lh;
          styles.push(`line-height:${css}`);
        }
        if (para.indent) styles.push(`margin-left:${para.indent}`);
        const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
        out += `<div${styleAttr}>${inner}</div>`;
      }
    }
    return out;
  }

  _frameHtmlByClass(pageXml, className, maps) {
    const frames = [];
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let match;
    while ((match = regex.exec(pageXml || "")) !== null) {
      const cls = match[1].match(/presentation:class=["']([^"']+)["']/i)?.[1];
      if (cls === className) frames.push(this._htmlFromOdfXml(match[2], maps));
    }
    return frames;
  }

  _shapeHtmlFromXml(inner) {
    const html = this._htmlFromOdfXml(inner, this._richMaps);
    return this._htmlHasFormat(html) ? html : undefined;
  }

  _escapeXml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  _unescapeXml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  _odfLengthToPx(raw, round = true) {
    const match = String(raw || "").trim().match(/^(-?[\d.]+)\s*(cm|mm|in|pt|px)?$/i);
    if (!match) return 0;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return 0;
    const unit = (match[2] || "cm").toLowerCase();
    const pxPerUnit = { cm: 37.795275591, mm: 3.7795275591, in: 96, pt: 96 / 72, px: 1 };
    const px = value * (pxPerUnit[unit] || pxPerUnit.cm);
    return round ? Math.round(px) : Math.round(px * 1000) / 1000;
  }

  _pxToOdf(px) {
    const value = Number(px);
    if (!Number.isFinite(value)) return "0cm";
    // px canvas → pt tài liệu (xem _ptPerPx) → cm. Tệp mở từ ngoài: 0,75 pt/px = 96 dpi như cũ.
    const cm = value * this._ptPerPx() / 72 * 2.54;
    return `${Math.round(cm * 1000) / 1000}cm`;
  }

  /**
   * Khổ trang chiếu ghi vào FODP, ĐÚNG tới từng EMU: pt với đủ chữ số (1 pt = 12700 EMU).
   * Tệp mở từ PowerPoint giữ nguyên <p:sldSz> gốc (sourceEmu) khi người dùng không đổi khổ.
   */
  _pageSizeOdf() {
    const size = this.canvas?.slideSize || {};
    const src = size.sourceEmu;
    const fmt = (pt) => `${Math.round(pt * 1e6) / 1e6}pt`;
    if (src && src.cx > 0 && src.cy > 0) {
      return { width: fmt(src.cx / 12700), height: fmt(src.cy / 12700), type: src.type || "" };
    }
    const ptPerPx = this._ptPerPx();
    const widthPt = (size.width || 960) * ptPerPx;
    const heightPt = (size.height || 540) * ptPerPx;
    // PowerPoint ghi type="screen4x3" cho khổ Standard (4:3) 10 × 7,5 in; Widescreen không có type.
    const type = Math.round(widthPt * 12700) === 9144000 && Math.round(heightPt * 12700) === 6858000 ? "screen4x3" : "";
    return { width: fmt(widthPt), height: fmt(heightPt), type };
  }

  _attr(attrs, name) {
    const escaped = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = String(attrs || "").match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
    return m ? (m[1] !== undefined ? m[1] : (m[2] || "")) : "";
  }

  _parseClipRect(raw) {
    if (!raw) return null;
    const m = String(raw).match(/rect\s*\(\s*([^,\s)]+)[,\s]+([^,\s)]+)[,\s]+([^,\s)]+)[,\s]+([^,\s)]+)\s*\)/i);
    if (!m) return null;
    return {
      top: m[1].trim(),
      right: m[2].trim(),
      bottom: m[3].trim(),
      left: m[4].trim()
    };
  }

  _formatClipRect(crop) {
    if (!crop) return "";
    const fmt = (v) => {
      if (v == null) return "0cm";
      const s = String(v).trim();
      return /^[-\d.]+(?:cm|pt|mm|in|px|%)?$/i.test(s) ? (/cm|pt|mm|in|px|%/i.test(s) ? s : `${s}cm`) : s;
    };
    return `rect(${fmt(crop.top)}, ${fmt(crop.right)}, ${fmt(crop.bottom)}, ${fmt(crop.left)})`;
  }

  _parseSrcRectPct(raw) {
    if (!raw) return null;
    if (typeof raw === "object" && raw !== null) return raw;
    const parts = String(raw).split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return {
        l: parts[0],
        t: parts[1],
        r: parts[2],
        b: parts[3]
      };
    }
    return null;
  }

  _formatSrcRectPct(cropPct) {
    if (!cropPct || typeof cropPct !== "object") return "";
    const fmt = (v) => {
      const n = Number(v) || 0;
      return String(Number(n.toFixed(5)));
    };
    const l = cropPct.l ?? cropPct.left ?? 0;
    const t = cropPct.t ?? cropPct.top ?? 0;
    const r = cropPct.r ?? cropPct.right ?? 0;
    const b = cropPct.b ?? cropPct.bottom ?? 0;
    return `${fmt(l)},${fmt(t)},${fmt(r)},${fmt(b)}`;
  }

  _styleKey(color) {
    return String(color || "3b82f6").replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "3b82f6";
  }

  _isTransparentFill(shape) {
    if (shape?.type === "wordart") return true;
    const color = shape?.color;
    return !color || color === "transparent" || color === "none";
  }

  _sanitizeDrawId(raw, used) {
    let id = String(raw ?? "").replace(/[^A-Za-z0-9._-]/g, "-");
    if (!/^[A-Za-z_]/.test(id)) id = `shape-${id}`;
    if (!id || id === "shape-") id = `shape-${used.size + 1}`;
    let unique = id;
    let n = 2;
    while (used.has(unique)) unique = `${id}-${n++}`;
    used.add(unique);
    return unique;
  }

  _restoreShapeId(attrs, fallback) {
    const name = this._attr(attrs, "draw:name");
    const drawId = this._attr(attrs, "draw:id") || this._attr(attrs, "xml:id");
    if (name && !/^PlaceHolder\b/i.test(name)) {
      return /^\d+$/.test(name) ? Number(name) : name;
    }
    if (drawId) {
      const numeric = drawId.match(/^shape-(\d+)$/);
      return numeric ? Number(numeric[1]) : drawId;
    }
    return fallback ?? (Date.now() + Math.floor(Math.random() * 1000));
  }

  _recordShapeId(attrs, shape, idMap) {
    const restored = shape.id;
    const drawId = this._attr(attrs, "draw:id") || this._attr(attrs, "xml:id");
    const name = this._attr(attrs, "draw:name");
    if (drawId) idMap.set(drawId, restored);
    if (name) idMap.set(name, restored);
    if (restored != null) idMap.set(String(restored), restored);
  }

  _mapConnectorRef(raw, idMap) {
    if (!raw) return raw;
    if (idMap.has(raw)) return idMap.get(raw);
    if (idMap.has(String(raw))) return idMap.get(String(raw));
    return raw;
  }

  _textParagraphsXml(text) {
    const lines = String(text ?? "").split("\n");
    if (lines.length === 1 && lines[0] === "") return "<text:p/>";
    return lines.map((line) => `<text:p>${this._escapeXml(line)}</text:p>`).join("");
  }

  _dataUrlParts(src) {
    const match = String(src || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    return { mime: match[1] || "application/octet-stream", isBase64: !!match[2], data: match[3] };
  }

  _binaryDataXml(src) {
    const parts = this._dataUrlParts(src);
    if (!parts?.isBase64 || !parts.data) return "";
    return `<office:binary-data>${parts.data.replace(/\s+/g, "")}</office:binary-data>`;
  }

  _shapeStyleName(shape) {
    if (shape.type === "connector") return "grConnector";
    if (shape.type === "ink" || shape.type === "path") return `grInk_${this._styleKey(shape.stroke || shape.color || "DC2626")}_${shape.strokeWidth || 3}`;
    if (shape.type === "image" && shape.crop) return `grImage_crop_${this._styleKey(shape.id || "img")}`;
    if (shape.type === "image" || shape.type === "video" || shape.type === "audio") return "grImage";
    const suffix = this._shapeTextStyleSuffix(shape);
    if (this._isTransparentFill(shape)) return suffix ? `grNone${suffix}` : "grNone";
    return `gr${this._styleKey(shape.color)}${suffix}`;
  }

  /**
   * GAP-SLIDES-05/06: hậu tố tên style khi hình có căn lề dọc / hướng chữ
   * KHÁC mặc định (middle/horizontal) - giữ nguyên tên style gốc (gr3b82f6,
   * grNone...) cho trường hợp phổ biến không dùng 2 tính năng này, tránh phá
   * vỡ các fixture/test đã có tên style cố định từ trước.
   */
  _padKey(shape) {
    if (shape?.paddingTop == null && shape?.paddingBottom == null && shape?.paddingLeft == null && shape?.paddingRight == null) {
      return "";
    }
    const pt = shape.paddingTop != null ? this._pxToOdf(shape.paddingTop).replace(/[^a-z0-9]/gi, "") : "none";
    const pr = shape.paddingRight != null ? this._pxToOdf(shape.paddingRight).replace(/[^a-z0-9]/gi, "") : "none";
    const pb = shape.paddingBottom != null ? this._pxToOdf(shape.paddingBottom).replace(/[^a-z0-9]/gi, "") : "none";
    const pl = shape.paddingLeft != null ? this._pxToOdf(shape.paddingLeft).replace(/[^a-z0-9]/gi, "") : "none";
    return `_p${pt}_${pr}_${pb}_${pl}`;
  }

  _shapeTextStyleSuffix(shape) {
    if (["connector", "image", "video", "audio", "chart", "table", "wordart"].includes(shape?.type)) return "";
    const vAlign = shape.textVAlign && shape.textVAlign !== "middle" ? shape.textVAlign : "";
    const dir = shape.textDirection && shape.textDirection !== "horizontal" ? shape.textDirection : "";
    const pad = this._padKey(shape);
    if (!vAlign && !dir && !pad) return "";
    return `_${vAlign || "m"}${dir ? `_${dir}` : ""}${pad}`;
  }

  /** Thuộc tính ODF chuẩn cho căn lề dọc + hướng chữ + padding hộp chữ + autofit/wrap. */
  _textStyleGraphicAttrs(shape) {
    let attrs = "";
    if (shape.textVAlign) {
      attrs += ` draw:textarea-vertical-align="${this._escapeXml(shape.textVAlign)}"`;
    }
    if (shape.textDirection && shape.textDirection !== "horizontal") {
      const writingMode = shape.textDirection === "stacked" ? "tb-lr" : "tb-rl";
      attrs += ` style:writing-mode="${writingMode}" vno:text-direction="${this._escapeXml(shape.textDirection)}"`;
    }
    if (shape.paddingTop != null) attrs += ` fo:padding-top="${this._pxToOdf(shape.paddingTop)}"`;
    if (shape.paddingBottom != null) attrs += ` fo:padding-bottom="${this._pxToOdf(shape.paddingBottom)}"`;
    if (shape.paddingLeft != null) attrs += ` fo:padding-left="${this._pxToOdf(shape.paddingLeft)}"`;
    if (shape.paddingRight != null) attrs += ` fo:padding-right="${this._pxToOdf(shape.paddingRight)}"`;
    if (shape.wrap) attrs += ` fo:wrap-option="${this._escapeXml(shape.wrap)}"`;
    // autofit: noAutofit → auto-grow-height/width=false; shrinkToFit → shrink-to-fit=true; fitToSize → fit-to-size=true
    if (shape.autofit === false || shape.noAutofit) {
      attrs += ` draw:auto-grow-height="false" draw:auto-grow-width="false"`;
    } else if (shape.shrinkToFit) {
      attrs += ` style:shrink-to-fit="true"`;
    } else if (shape.fitToSize) {
      attrs += ` draw:fit-to-size="true"`;
    }
    return attrs;
  }

  _wordArtTextStyleName(shape) {
    return `vnoWa${this._styleKey(shape?.presetId || shape?.id || "wordart")}`;
  }

  _serializeWordArtGradient(gradient) {
    if (!gradient?.from || !gradient?.to) return "";
    const angle = Number.isFinite(Number(gradient.angle)) ? Number(gradient.angle) : 90;
    return `${gradient.from};${gradient.to};${angle}`;
  }

  _serializeWordArtShadow(shadow) {
    if (!shadow) return "";
    return `${Number(shadow.offsetX) || 0};${Number(shadow.offsetY) || 0};${Number(shadow.blur) || 0};${shadow.color || "rgba(0,0,0,0.4)"}`;
  }

  _wordArtCustomAttrs(shape) {
    const preset = this._escapeXml(shape.presetId || "navy-outline");
    const font = this._escapeXml(shape.fontFamily || "Arial, Helvetica, sans-serif");
    const size = Number(shape.fontSize) > 0 ? Number(shape.fontSize) : 48;
    const fill = this._escapeXml(shape.fillColor || "#1e3a8a");
    const stroke = this._escapeXml(shape.strokeColor || "");
    const strokeWidth = Number(shape.strokeWidth) || 0;
    const gradient = this._escapeXml(this._serializeWordArtGradient(shape.gradient));
    const shadow = this._escapeXml(this._serializeWordArtShadow(shape.shadow));
    let attrs = ` vno:wordart="true" vno:wordart-preset="${preset}" vno:wordart-font="${font}" vno:wordart-size="${size}" vno:wordart-fill="${fill}"`;
    if (gradient) attrs += ` vno:wordart-gradient="${gradient}"`;
    if (stroke) attrs += ` vno:wordart-stroke="${stroke}" vno:wordart-stroke-width="${strokeWidth}"`;
    if (shadow) attrs += ` vno:wordart-shadow="${shadow}"`;
    return attrs;
  }

  _parseWordArtAttrs(attrs) {
    if (this._attr(attrs, "vno:wordart").toLowerCase() !== "true") return null;
    const gradientRaw = this._unescapeXml(this._attr(attrs, "vno:wordart-gradient"));
    let gradient = null;
    if (gradientRaw) {
      const [from, to, angle] = gradientRaw.split(";");
      if (from && to) gradient = { from, to, angle: Number(angle) || 90 };
    }
    const shadowRaw = this._unescapeXml(this._attr(attrs, "vno:wordart-shadow"));
    let shadow = null;
    if (shadowRaw) {
      const parts = shadowRaw.split(";");
      shadow = {
        offsetX: Number(parts[0]) || 0,
        offsetY: Number(parts[1]) || 0,
        blur: Number(parts[2]) || 0,
        color: parts.slice(3).join(";") || "rgba(0,0,0,0.4)"
      };
    }
    return {
      type: "wordart",
      color: "transparent",
      presetId: this._unescapeXml(this._attr(attrs, "vno:wordart-preset")) || "navy-outline",
      fontFamily: this._unescapeXml(this._attr(attrs, "vno:wordart-font")) || "Arial, Helvetica, sans-serif",
      fontSize: Number(this._attr(attrs, "vno:wordart-size")) || 48,
      fillColor: this._unescapeXml(this._attr(attrs, "vno:wordart-fill")) || "#1e3a8a",
      gradient,
      strokeColor: this._unescapeXml(this._attr(attrs, "vno:wordart-stroke")) || "",
      strokeWidth: Number(this._attr(attrs, "vno:wordart-stroke-width")) || 0,
      shadow
    };
  }

  _serializeWordArtTextStyles(slides) {
    const seen = new Set();
    let xml = "";
    for (const slide of slides || []) {
      for (const shape of slide.shapes || []) {
        if (shape.type !== "wordart") continue;
        const name = this._wordArtTextStyleName(shape);
        if (seen.has(name)) continue;
        seen.add(name);
        const color = this._escapeXml(shape.fillColor || shape.gradient?.to || "#1e3a8a");
        const size = Number(shape.fontSize) > 0 ? Number(shape.fontSize) : 48;
        const family = this._escapeXml(String(shape.fontFamily || "Arial").split(",")[0].replace(/['"]/g, "").trim() || "Arial");
        const outline = Number(shape.strokeWidth) > 0 ? ' style:text-outline="true"' : "";
        const shadow = shape.shadow ? ' fo:text-shadow="1pt 1pt"' : "";
        xml += `
    <style:style style:name="${name}" style:family="text">
      <style:text-properties fo:color="${color}" fo:font-size="${size}pt" fo:font-weight="bold" fo:font-family="${family}" style:font-name="${family}"${outline}${shadow}/>
    </style:style>`;
      }
    }
    return xml;
  }

  _noneAnimation() {
    return { type: "none", duration: 500, delay: 0 };
  }

  _msToSmilDur(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) return null;
    if (value === 0) return "0s";
    const seconds = Math.round((value / 1000) * 1000) / 1000;
    return `${seconds}s`;
  }

  _parseSmilTimeToMs(raw) {
    if (raw == null || raw === "") return null;
    const value = String(raw).trim();
    if (!value || /^(indefinite|media|next)$/i.test(value)) return null;
    const ms = value.match(/^([\d.]+)\s*ms$/i);
    if (ms) return Math.round(Number(ms[1]));
    const sec = value.match(/^([\d.]+)\s*s$/i);
    if (sec) return Math.round(Number(sec[1]) * 1000);
    const pt = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/i);
    if (pt) {
      const hours = Number(pt[1] || 0);
      const minutes = Number(pt[2] || 0);
      const seconds = Number(pt[3] || 0);
      return Math.round((((hours * 60) + minutes) * 60 + seconds) * 1000);
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return numeric >= 20 ? Math.round(numeric) : Math.round(numeric * 1000);
  }

  _mapVnTransitionToSmil(transition) {
    const type = String(transition?.type || "").toLowerCase();
    if (!type || type === "none") return null;
    const dur = this._msToSmilDur(transition.duration > 0 ? transition.duration : 500) || "0.5s";
    if (type === "fade") return { type: "fade", subtype: "crossfade", dur };
    if (type === "slide") return { type: "pushWipe", subtype: "fromLeft", dur };
    // Direct smil:type="zoom" exports to PPTX as an empty <p:transition> (measured).
    // irisWipe/rectangle maps to a real PPTX transition and returns as smil:type="zoom".
    if (type === "zoom") return { type: "irisWipe", subtype: "rectangle", dur };
    // fadeOverColor is valid ODF; LibreOffice PPTX filter drops it (measured).
    if (type === "flip") return { type: "fadeOverColor", subtype: "crossfade", dur, fadeColor: "#000000" };
    // ODF/SMIL has no Morph transition. Persist a standards-safe fade plus vno:transition metadata on draw:page.
    if (type === "morph") return { type: "fade", subtype: "crossfade", dur };
    return { type: "fade", subtype: "crossfade", dur };
  }

  _mapSmilTransitionToVn(smilType, smilSubtype) {
    const type = String(smilType || "").toLowerCase();
    const subtype = String(smilSubtype || "").toLowerCase();
    if (!type && !subtype) return null;
    if (type === "fadeovercolor") return "flip";
    if (type === "fade") return "fade";
    if (type === "pushwipe" || type === "barwipe" || type === "slidewipe") return "slide";
    if (type === "zoom" || type === "iriswipe") return "zoom";
    return null;
  }

  _hasPageBackground(slide) {
    const bg = slide?.background;
    if (!bg) return false;
    // Don't serialize default white background for imported slides
    // (original PPTX had no background element)
    if (slide?.imported && bg.type === "solid" && (bg.color === "#ffffff" || bg.color === "#FFFFFF" || bg.color === "white")) {
      return false;
    }
    return bg.type === "solid" || bg.type === "gradient" || (bg.type === "picture" && bg.picture);
  }

  _slideNeedsOwnDrawingStyle(slide) {
    return !!this._mapVnTransitionToSmil(slide?.transition) || !!slide?.hidden || this._hasPageBackground(slide);
  }

  _pageBackgroundFillAttrs(slide, idx) {
    const bg = slide?.background;
    if (!this._hasPageBackground(slide)) return "";
    if (bg.type === "solid") {
      const color = this._cssColorToHex(bg.color || "#ffffff") || bg.color;
      return ` draw:fill="solid" draw:fill-color="${this._escapeXml(color)}"`;
    }
    if (bg.type === "gradient") {
      return ` draw:fill="gradient" draw:fill-gradient-name="vnoBgGrad${idx + 1}"`;
    }
    if (bg.type === "picture") {
      return ` draw:fill="bitmap" draw:fill-image-name="vnoBgImg${idx + 1}" style:repeat="stretch"`;
    }
    return "";
  }

  _serializeBackgroundResources(slides) {
    let xml = "";
    (slides || []).forEach((slide, idx) => {
      const bg = slide?.background;
      if (bg?.type === "gradient") {
        const from = this._cssColorToHex(bg.gradient?.from || "#1e3a8a") || "#1e3a8a";
        const to = this._cssColorToHex(bg.gradient?.to || "#ffffff") || "#ffffff";
        const angle = bg.gradient?.direction === "vertical" ? "900" : "0";
        xml += `
    <draw:gradient draw:name="vnoBgGrad${idx + 1}" draw:style="linear" draw:angle="${angle}" draw:start-color="${this._escapeXml(from)}" draw:end-color="${this._escapeXml(to)}" draw:start-intensity="100%" draw:end-intensity="100%"/>`;
      }
      if (bg?.type === "picture" && bg.picture) {
        const binary = this._binaryDataXml(bg.picture);
        if (binary) {
          xml += `
    <draw:fill-image draw:name="vnoBgImg${idx + 1}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad">${binary}</draw:fill-image>`;
        }
      }
    });
    return xml;
  }

  _pageDrawingStyleName(slide, idx) {
    return this._slideNeedsOwnDrawingStyle(slide) ? `dp${idx + 2}` : "dp1";
  }

  _mapVnAnimationToPreset(animation) {
    const type = String(animation?.type || "");
    if (!type || type === "none") return null;
    const dur = this._msToSmilDur(animation.duration > 0 ? animation.duration : 500) || "0.5s";
    const delayMs = Number(animation.delay) || 0;
    const begin = delayMs > 0 ? (this._msToSmilDur(delayMs) || "0s") : "0s";
    switch (type) {
      case "fadeIn":
      case "fade":
        return { presetId: "ooo-entrance-fade-in", subType: null, dur, begin, kind: "fade" };
      case "flyIn":
      case "fly":
        return { presetId: "ooo-entrance-fly-in", subType: "from-bottom", dur, begin, kind: "fly" };
      case "zoomIn":
      case "zoom":
        return { presetId: "ooo-entrance-zoom", subType: null, dur, begin, kind: "zoom" };
      case "bounceIn":
      case "bounce":
        return { presetId: "ooo-entrance-bounce", subType: null, dur, begin, kind: "bounce" };
      case "slideLeft":
      case "slide":
        return { presetId: "ooo-entrance-wipe", subType: "from-left", dur, begin, kind: "wipe" };
      default:
        return null;
    }
  }

  _mapPresetToVnAnimation(presetId) {
    const id = String(presetId || "").toLowerCase();
    if (!id) return null;
    if (id.includes("fly-in")) return "flyIn";
    if (id.includes("zoom")) return "zoomIn";
    if (id.includes("bounce")) return "bounceIn";
    if (id.includes("wipe") || id.includes("peek-in")) return "slideLeft";
    if (id.includes("fade-in") || id.endsWith("fade") || id.includes("appear")) return "fadeIn";
    return null;
  }

  _collectShapeIdMap(shapes, used = new Set()) {
    const idMap = new Map();
    for (const shape of shapes || []) {
      idMap.set(String(shape.id), this._sanitizeDrawId(shape.id, used));
    }
    return idMap;
  }

  _allocPlaceholderIds(slide, pageIndex, used) {
    const layout = slide?.layoutType || "title-content";
    const ids = {};
    if (layout === "blank") return ids;
    ids.title = this._sanitizeDrawId(`title-${pageIndex + 1}`, used);
    if (layout !== "title-only") {
      ids.body = this._sanitizeDrawId(`body-${pageIndex + 1}`, used);
      if (layout === "two-content") {
        ids.body2 = this._sanitizeDrawId(`body2-${pageIndex + 1}`, used);
      }
    }
    return ids;
  }

  _placeholderIdAttrs(role, drawId) {
    if (!drawId) return "";
    const id = this._escapeXml(drawId);
    const name = this._escapeXml(role);
    return ` draw:id="${id}" xml:id="${id}" draw:name="${name}"`;
  }

  _placeholderRoleFromName(name) {
    const raw = String(name || "");
    if (/^title(-\d+)?$/i.test(raw)) return "title";
    if (/^body2(-\d+)?$/i.test(raw)) return "body2";
    if (/^body(-\d+)?$/i.test(raw)) return "body";
    return null;
  }

  _serializeEntranceAnimation(animation, drawId) {
    const preset = this._mapVnAnimationToPreset(animation);
    if (!preset || !drawId) return "";
    const target = this._escapeXml(drawId);
    const sub = preset.subType ? ` presentation:preset-sub-type="${this._escapeXml(preset.subType)}"` : "";
    let animates = `
                <anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="visibility" smil:to="visible"/>`;
    if (preset.kind === "fly") {
      animates += `
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="x" smil:values="x;x" smil:keyTimes="0;1"/>
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="y" smil:values="height;y" smil:keyTimes="0;1"/>`;
    } else if (preset.kind === "zoom") {
      animates += `
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="width" smil:values="0;width" smil:keyTimes="0;1"/>
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="height" smil:values="0;height" smil:keyTimes="0;1"/>`;
    } else {
      animates += `
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="opacity" smil:from="0" smil:to="1"/>`;
    }
    const nodeType = animation?.start === "withPrevious"
      ? "with-previous"
      : animation?.start === "afterPrevious"
        ? "after-previous"
        : "on-click";
    return `
            <anim:par smil:begin="indefinite">
              <anim:par smil:begin="${preset.begin}" smil:fill="hold" presentation:node-type="${nodeType}" presentation:preset-class="entrance" presentation:preset-id="${this._escapeXml(preset.presetId)}"${sub}>${animates}
              </anim:par>
            </anim:par>`;
  }

  _serializeShapeAnimation(shape, drawId) {
    return this._serializeEntranceAnimation(shape?.animation, drawId);
  }

  _orderedAnimationSlots(slide, placeholderIds, shapeIds) {
    const slots = [];
    const push = (animation, drawId, defaultIndex) => {
      if (!animation || !drawId || !animation.type || animation.type === "none") return;
      slots.push({
        animation,
        drawId,
        defaultIndex,
        order: Number.isFinite(animation.order) ? animation.order : defaultIndex
      });
    };
    push(slide?.titleAnimation, placeholderIds?.title, 0);
    push(slide?.bodyAnimation, placeholderIds?.body, 1);
    push(slide?.body2Animation, placeholderIds?.body2, 2);
    (slide?.shapes || []).forEach((shape, index) => {
      push(shape.animation, shapeIds?.get?.(String(shape.id)), 100 + index);
    });
    slots.sort((a, b) => a.order - b.order || a.defaultIndex - b.defaultIndex);
    return slots;
  }

  _serializePageAnimXml(pageXmlId, slide, idMap, placeholderIds) {
    const smil = this._mapVnTransitionToSmil(slide?.transition);
    const placeholders = placeholderIds || {};
    const shapeIds = idMap || new Map();
    const effectXml = this._orderedAnimationSlots(slide, placeholders, shapeIds)
      .map((slot) => this._serializeEntranceAnimation(slot.animation, slot.drawId))
      .filter(Boolean)
      .join("");
    if (!smil && !effectXml) return "";
    let transXml = "";
    if (smil) {
      const sub = smil.subtype ? ` smil:subtype="${smil.subtype}"` : "";
      const fade = smil.fadeColor ? ` smil:fadeColor="${smil.fadeColor}"` : "";
      transXml = `
          <anim:par smil:begin="${this._escapeXml(pageXmlId)}.begin">
            <anim:transitionFilter smil:dur="${smil.dur}" smil:type="${smil.type}"${sub}${fade}/>
          </anim:par>`;
    }
    const seqXml = effectXml
      ? `
          <anim:seq presentation:node-type="main-sequence">${effectXml}
          </anim:seq>`
      : "";
    return `
        <anim:par presentation:node-type="timing-root">${transXml}${seqXml}
        </anim:par>`;
  }

  _parseDrawingPageStyles(xmlText) {
    const styles = new Map();
    const regex = /<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi;
    let match;
    while ((match = regex.exec(xmlText)) !== null) {
      if (!/style:family=["']drawing-page["']/i.test(match[1])) continue;
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const smilType = match[2].match(/smil:type=["']([^"']+)["']/i)?.[1] || "";
      const smilSubtype = match[2].match(/smil:subtype=["']([^"']+)["']/i)?.[1] || "";
      const smilDur = match[2].match(/smil:dur=["']([^"']+)["']/i)?.[1] || "";
      const visibility = match[2].match(/presentation:visibility=["']([^"']+)["']/i)?.[1] || "";
      const fill = match[2].match(/draw:fill=["']([^"']+)["']/i)?.[1] || "";
      const fillColor = match[2].match(/draw:fill-color=["']([^"']+)["']/i)?.[1] || "";
      const gradientName = match[2].match(/draw:fill-gradient-name=["']([^"']+)["']/i)?.[1] || "";
      const fillImageName = match[2].match(/draw:fill-image-name=["']([^"']+)["']/i)?.[1] || "";
      styles.set(name, {
        smilType,
        smilSubtype,
        duration: this._parseSmilTimeToMs(smilDur),
        vnType: this._mapSmilTransitionToVn(smilType, smilSubtype),
        hidden: /^hidden$/i.test(visibility),
        fill,
        fillColor,
        gradientName,
        fillImageName
      });
    }
    return styles;
  }

  _parseBackgroundResources(xmlText) {
    const gradients = new Map();
    const images = new Map();
    const gradientRegex = /<draw:gradient\b([^>]*)\/?>/gi;
    let match;
    while ((match = gradientRegex.exec(xmlText)) !== null) {
      const attrs = match[1] || "";
      const name = this._attr(attrs, "draw:name");
      if (!name) continue;
      const angle = Number(this._attr(attrs, "draw:angle") || 0);
      gradients.set(name, {
        from: this._attr(attrs, "draw:start-color") || "#1e3a8a",
        to: this._attr(attrs, "draw:end-color") || "#ffffff",
        direction: Math.abs(angle) >= 450 ? "vertical" : "horizontal"
      });
    }
    const imageRegex = /<draw:fill-image\b([^>]*)>([\s\S]*?)<\/draw:fill-image>/gi;
    while ((match = imageRegex.exec(xmlText)) !== null) {
      const name = this._attr(match[1] || "", "draw:name");
      const binary = match[2].match(/<office:binary-data[^>]*>([\s\S]*?)<\/office:binary-data>/i)?.[1];
      if (!name || !binary) continue;
      images.set(name, `data:image/png;base64,${String(binary).replace(/\s+/g, "")}`);
    }
    return { gradients, images };
  }

  _backgroundFromPageStyle(pageStyle, resources) {
    if (!pageStyle) return null;
    const fill = String(pageStyle.fill || "").toLowerCase();
    if (fill === "solid" && pageStyle.fillColor) {
      return { type: "solid", color: this._cssColorToHex(pageStyle.fillColor) || pageStyle.fillColor };
    }
    if (fill === "gradient" && pageStyle.gradientName) {
      const gradient = resources?.gradients?.get(pageStyle.gradientName);
      if (!gradient) return null;
      return { type: "gradient", gradient: { ...gradient } };
    }
    if ((fill === "bitmap" || fill === "image") && pageStyle.fillImageName) {
      const picture = resources?.images?.get(pageStyle.fillImageName);
      if (!picture) return null;
      return { type: "picture", picture };
    }
    if (pageStyle.fillColor && !fill) {
      return { type: "solid", color: this._cssColorToHex(pageStyle.fillColor) || pageStyle.fillColor };
    }
    return null;
  }

  _parsePageTransition(pageAttrs, pageContent, drawingPageStyles) {
    const vnCustomType = this._attr(pageAttrs, "vno:transition").toLowerCase();
    const styleName = this._attr(pageAttrs, "draw:style-name");
    const fromStyle = drawingPageStyles.get(styleName) || {};
    const filterMatch = String(pageContent || "").match(/<anim:transitionFilter\b([^>]*?)\/?>/i);
    const filterAttrs = filterMatch ? filterMatch[1] : "";
    const filterType = this._attr(filterAttrs, "smil:type");
    const filterSubtype = this._attr(filterAttrs, "smil:subtype");
    const filterDur = this._attr(filterAttrs, "smil:dur");
    const vnType = this._mapSmilTransitionToVn(
      filterType || fromStyle.smilType,
      filterSubtype || fromStyle.smilSubtype
    );
    if (vnCustomType === "morph") {
      return {
        type: "morph",
        duration: this._parseSmilTimeToMs(filterDur) || fromStyle.duration || 500
      };
    }
    if (!vnType) return undefined;
    return {
      type: vnType,
      duration: this._parseSmilTimeToMs(filterDur) || fromStyle.duration || 500
    };
  }

  _parsePageAnimations(pageXml) {
    const byTarget = new Map();
    const regex = /<anim:par\b([^>]*presentation:preset-id=["'][^"']+["'][^>]*)>/gi;
    let match;
    while ((match = regex.exec(pageXml || "")) !== null) {
      const attrs = match[1];
      const vnType = this._mapPresetToVnAnimation(this._attr(attrs, "presentation:preset-id"));
      if (!vnType) continue;
      const afterOpen = pageXml.indexOf(">", match.index);
      const close = afterOpen >= 0 ? pageXml.indexOf("</anim:par>", afterOpen) : -1;
      const chunk = close >= 0
        ? pageXml.slice(match.index, close)
        : pageXml.slice(match.index, match.index + 2500);
      const target = chunk.match(/smil:targetElement=["']([^"']+)["']/i)?.[1];
      if (!target) continue;
      const animateDurs = [...chunk.matchAll(/<anim:animate\b([^>]*?)(?:\/>|>)/gi)]
        .map((item) => this._parseSmilTimeToMs(this._attr(item[1], "smil:dur")))
        .filter((ms) => Number.isFinite(ms) && ms >= 20);
      const duration = animateDurs.length
        ? Math.max(...animateDurs)
        : (this._parseSmilTimeToMs(this._attr(attrs, "smil:dur")) || 500);
      const delay = this._parseSmilTimeToMs(this._attr(attrs, "smil:begin")) || 0;
      const nodeType = String(this._attr(attrs, "presentation:node-type") || "").toLowerCase();
      const start = nodeType === "with-previous"
        ? "withPrevious"
        : nodeType === "after-previous"
          ? "afterPrevious"
          : "onClick";
      byTarget.set(target, { type: vnType, duration, delay, order: byTarget.size, start });
    }
    return byTarget;
  }

  _applyParsedAnimations(shapes, idMap, animByTarget) {
    if (!animByTarget || animByTarget.size === 0) return;
    for (const [target, animation] of animByTarget) {
      const restored = idMap.has(target) ? idMap.get(target) : target;
      const shape = (shapes || []).find((item) => String(item.id) === String(restored) || String(item.id) === String(target));
      if (shape) shape.animation = { ...animation };
    }
  }

  _collectPlaceholderTargets(pageXml) {
    const map = new Map();
    const regex = /<draw:frame\b([^>]*)>/gi;
    let match;
    let outlineIndex = 0;
    while ((match = regex.exec(pageXml || "")) !== null) {
      const attrs = match[1];
      const cls = this._attr(attrs, "presentation:class");
      if (this._isLayoutPresentationClass(cls) && !/^(title|outline)$/i.test(cls)) continue;
      const name = this._attr(attrs, "draw:name");
      let role = this._placeholderRoleFromName(name);
      if (!role) {
        if (cls === "title") role = "title";
        else if (cls === "outline") role = outlineIndex++ === 0 ? "body" : "body2";
      } else if (cls === "outline") {
        outlineIndex = Math.max(outlineIndex, role === "body2" ? 2 : 1);
      }
      if (!role) continue;
      const drawId = this._attr(attrs, "draw:id");
      const xmlId = this._attr(attrs, "xml:id");
      if (drawId) map.set(drawId, role);
      if (xmlId) map.set(xmlId, role);
      if (name) map.set(name, role);
    }
    return map;
  }

  _applyPlaceholderAnimations(slide, placeholderTargets, animByTarget) {
    if (!slide || !placeholderTargets || !animByTarget || animByTarget.size === 0) return;
    const fields = { title: "titleAnimation", body: "bodyAnimation", body2: "body2Animation" };
    for (const [target, animation] of animByTarget) {
      const role = placeholderTargets.get(target);
      if (!role || !fields[role]) continue;
      slide[fields[role]] = { ...animation };
    }
  }

  _shapeGeomAttrs(shape, drawId) {
    const name = this._escapeXml(String(shape.id ?? drawId));
    const styleName = this._shapeStyleName(shape);
    const fill = this._isTransparentFill(shape) ? "" : ` draw:fill-color="${this._escapeXml(shape.color)}"`;
    if (shape.rotation) {
      const radianOdf = -(shape.rotation * Math.PI / 180);
      // ODF «rotate(a) translate(x y)» xoay hình quanh GÓC TRÊN-TRÁI rồi dời tới (x, y), nên
      // (x, y) là vị trí góc trên-trái SAU khi xoay. VN (CSS) và PowerPoint xoay quanh TÂM hình
      // với shape.x/y là góc chưa xoay — ghi thẳng shape.x/y làm PowerPoint mở ra lệch vị trí
      // (đo COM, G8: hình 30° lệch ~38pt/54pt). Quy đổi: T = C − R(θ)·(w/2, h/2).
      const theta = shape.rotation * Math.PI / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const halfW = (Number(shape.w) || 0) / 2;
      const halfH = (Number(shape.h) || 0) / 2;
      const cx = (Number(shape.x) || 0) + halfW;
      const cy = (Number(shape.y) || 0) + halfH;
      const xCm = this._pxToOdf(cx - (halfW * cos - halfH * sin));
      const yCm = this._pxToOdf(cy - (halfW * sin + halfH * cos));
      return `draw:id="${this._escapeXml(drawId)}" draw:name="${name}" draw:style-name="${styleName}" svg:width="${this._pxToOdf(shape.w)}" svg:height="${this._pxToOdf(shape.h)}" draw:transform="rotate (${radianOdf}) translate (${xCm} ${yCm})"${fill}`;
    }
    return `draw:id="${this._escapeXml(drawId)}" draw:name="${name}" draw:style-name="${styleName}" svg:x="${this._pxToOdf(shape.x)}" svg:y="${this._pxToOdf(shape.y)}" svg:width="${this._pxToOdf(shape.w)}" svg:height="${this._pxToOdf(shape.h)}"${fill}`;
  }

  _serializeGraphicStyles(slides) {
    const fills = new Map();
    const namedStyles = new Map();
    let needsConnector = false;
    let needsMedia = false;
    for (const slide of slides) {
      for (const shape of slide.shapes || []) {
        if (shape.type === "connector") {
          needsConnector = true;
          continue;
        }
        if (shape.type === "ink" || shape.type === "path") {
          namedStyles.set(this._shapeStyleName(shape), shape);
          continue;
        }
        if (shape.type === "image" || shape.type === "video" || shape.type === "audio") {
          if (shape.type === "image" && shape.crop) {
            namedStyles.set(this._shapeStyleName(shape), shape);
          } else {
            needsMedia = true;
          }
          continue;
        }
        const suffix = this._shapeTextStyleSuffix(shape);
        if (suffix) {
          namedStyles.set(this._shapeStyleName(shape), shape);
          continue;
        }
        if (this._isTransparentFill(shape)) {
          fills.set("none", null);
        } else {
          fills.set(this._styleKey(shape.color), shape.color);
        }
      }
    }

    const slideWidthPx = this.canvas?.slideSize?.width || 960;
    const slideHeightPx = this.canvas?.slideSize?.height || 540;
    const pageOrientation = slideWidthPx >= slideHeightPx ? "landscape" : "portrait";
    const page = this._pageSizeOdf();
    const typeAttr = page.type ? ` vno:sld-type="${this._escapeXml(page.type)}"` : "";
    let xml = `
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="${page.width}" fo:page-height="${page.height}" style:print-orientation="${pageOrientation}"${typeAttr}/>
    </style:page-layout>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true"${this._masterPageFillAttrs()}/>
    </style:style>`;

    const isImported = Boolean(this.canvas?.imported);
    const theme = this._masterTheme();
    const isVnDefaultLogo = !theme?.logoText || [
      "VN OFFICE • THUYẾT TRÌNH", "VN OFFICE",
      "3T OFFICE • THUYẾT TRÌNH", "3T OFFICE"
    ].includes(theme.logoText);
    const effectiveLogoText = (isImported && isVnDefaultLogo) ? "" : (theme?.logoText || "");
    const effectiveFooterText = theme?.footerText || "";

    if (!isImported) {
      xml += `
    <style:style style:name="grMasterAccent" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="solid" draw:fill-color="${this._escapeXml(theme?.accentColor || "#2563eb")}"/>
    </style:style>`;
    }
    if (!isImported || effectiveLogoText) {
      xml += `
    <style:style style:name="grMasterLogo" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
      <style:text-properties fo:color="${this._escapeXml(theme?.accentColor || "#2563eb")}" fo:font-size="14pt" fo:font-weight="bold"/>
    </style:style>`;
    }
    if (!isImported || effectiveFooterText) {
      xml += `
    <style:style style:name="grMasterFooter" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
      <style:text-properties fo:color="${this._escapeXml(theme?.bodyColor || "#64748b")}" fo:font-size="10pt"/>
    </style:style>`;
    }

    (slides || []).forEach((slide, idx) => {
      if (!this._slideNeedsOwnDrawingStyle(slide)) return;
      const smil = this._mapVnTransitionToSmil(slide?.transition);
      const hidden = !!slide?.hidden;
      const name = this._pageDrawingStyleName(slide, idx);
      const smilAttrs = smil
        ? ` smil:type="${smil.type}"${smil.subtype ? ` smil:subtype="${smil.subtype}"` : ""}${smil.dur ? ` smil:dur="${smil.dur}"` : ""}${smil.fadeColor ? ` smil:fadeColor="${smil.fadeColor}"` : ""}`
        : "";
      const visibilityAttr = hidden ? ' presentation:visibility="hidden"' : "";
      const fillAttrs = this._pageBackgroundFillAttrs(slide, idx);
      xml += `
    <style:style style:name="${name}" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true"${smilAttrs}${visibilityAttr}${fillAttrs}/>
    </style:style>`;
    });

    const themeFont = theme?.fontFamily || "Arial";
    const titleColor = theme?.titleColor || "#000000";
    const bodyColor = theme?.bodyColor || "#000000";
    xml += `
    <style:style style:name="prTitle" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
      <style:text-properties fo:font-family="${this._escapeXml(themeFont)}" fo:font-size="44pt" fo:font-weight="bold" fo:color="${this._escapeXml(titleColor)}" style:font-name="${this._escapeXml(themeFont)}"/>
    </style:style>
    <style:style style:name="prBody" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
      <style:text-properties fo:font-family="${this._escapeXml(themeFont)}" fo:font-size="32pt" fo:color="${this._escapeXml(bodyColor)}" style:font-name="${this._escapeXml(themeFont)}"/>
    </style:style>
    <style:style style:name="prNotes" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
      <style:text-properties fo:font-size="12pt" fo:color="#000000"/>
    </style:style>
    <style:style style:name="grNone" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>`;

    for (const [key, color] of fills) {
      if (key === "none" || !color) continue;
      xml += `
    <style:style style:name="gr${key}" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="solid" draw:fill-color="${this._escapeXml(color)}"/>
    </style:style>`;
    }
    for (const [styleName, shape] of namedStyles) {
      if (shape.type === "image" && shape.crop) {
        const clip = this._formatClipRect(shape.crop);
        xml += `
    <style:style style:name="${styleName}" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none" fo:clip="${this._escapeXml(clip)}"/>
    </style:style>`;
        continue;
      }
      if (shape.type === "ink" || shape.type === "path") {
        const sc = shape.stroke || shape.color || "#DC2626";
        const sw = shape.strokeWidth ? this._pxToOdf(shape.strokeWidth) : "0.08cm";
        xml += `
    <style:style style:name="${styleName}" style:family="graphic">
      <style:graphic-properties draw:stroke="solid" svg:stroke-color="${this._escapeXml(sc)}" svg:stroke-width="${sw}" draw:fill="none"/>
    </style:style>`;
        continue;
      }
      const isTextBox = shape.type === "textbox";
      const isTransparent = this._isTransparentFill(shape);
      let fillAttrs = "";
      let strokeAttrs = "";
      if (isTransparent) {
        fillAttrs = ` draw:fill="none"`;
      } else {
        fillAttrs = ` draw:fill="solid" draw:fill-color="${this._escapeXml(shape.fill || shape.color)}"`;
      }
      if (shape.stroke || shape.strokeColor) {
        const sc = shape.stroke || shape.strokeColor;
        const sw = shape.strokeWidth ? this._pxToOdf(shape.strokeWidth) : "0.02cm";
        strokeAttrs = ` draw:stroke="solid" svg:stroke-color="${this._escapeXml(sc)}" svg:stroke-width="${sw}"`;
      } else {
        strokeAttrs = ` draw:stroke="none"`;
      }
      xml += `
    <style:style style:name="${styleName}" style:family="graphic">
      <style:graphic-properties${strokeAttrs}${fillAttrs}${this._textStyleGraphicAttrs(shape)}/>
    </style:style>`;
    }
    if (needsConnector) {
      xml += `
    <style:style style:name="grConnector" style:family="graphic">
      <style:graphic-properties draw:stroke="solid" svg:stroke-color="#475569" svg:stroke-width="0.08cm" draw:fill="none"/>
    </style:style>`;
    }
    if (needsMedia) {
      xml += `
    <style:style style:name="grImage" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>`;
    }
    xml += this._serializeWordArtTextStyles(slides);
    return xml;
  }

  _serializeShape(shape, drawId, idMap, richCtx) {
    const type = shape?.type || "rect";
    const geom = this._shapeGeomAttrs(shape, drawId);
    const textXml = this._richOrPlainXml(shape.text, shape.textHtml, richCtx);

    if (type === "connector") {
      const start = this._escapeXml(String(idMap.get(String(shape.sourceId)) || shape.sourceId || ""));
      const end = this._escapeXml(String(idMap.get(String(shape.targetId)) || shape.targetId || ""));
      const x1 = this._pxToOdf(shape.x1 ?? shape.x);
      const y1 = this._pxToOdf(shape.y1 ?? shape.y);
      const x2 = this._pxToOdf(shape.x2 ?? (Number(shape.x) + Number(shape.w) || 0));
      const y2 = this._pxToOdf(shape.y2 ?? (Number(shape.y) + Number(shape.h) || 0));
      const stroke = shape.color && shape.color !== "transparent" ? ` svg:stroke-color="${this._escapeXml(shape.color)}"` : "";
      const marker = shape.arrowEnd ? ' draw:marker-end="arrow"' : "";
      return `
        <draw:connector ${geom} draw:type="line" svg:x1="${x1}" svg:y1="${y1}" svg:x2="${x2}" svg:y2="${y2}" draw:start-shape="${start}" draw:end-shape="${end}"${stroke}${marker}>
          <text:p/>
        </draw:connector>`;
    }

    if (type === "ink" || type === "path") {
      const viewBox = shape.viewBox || `0 0 ${shape.w} ${shape.h}`;
      return `
        <draw:path ${geom} svg:d="${this._escapeXml(shape.d || "")}" svg:viewBox="${this._escapeXml(viewBox)}">
          <text:p/>
        </draw:path>`;
    }

    if (type === "image") {
      const parts = this._dataUrlParts(shape.src);
      const mime = this._escapeXml(parts?.mime || "image/png");
      const href = parts ? "" : this._escapeXml(shape.src || "");
      const srcRectAttr = shape.cropPct
        ? ` vno:src-rect="${this._escapeXml(this._formatSrcRectPct(shape.cropPct))}"`
        : "";
      return `
        <draw:frame ${geom}${srcRectAttr}>
          <draw:image xlink:href="${href}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="${mime}">
            ${this._binaryDataXml(shape.src)}
          </draw:image>
        </draw:frame>`;
    }

    if (type === "video" || type === "audio") {
      const parts = this._dataUrlParts(shape.src);
      const mime = this._escapeXml(parts?.mime || (type === "audio" ? "audio/mpeg" : "video/mp4"));
      // soffice PPTX hop ignores office:binary-data inside draw:plugin (not in ODF
      // schema). Measured: empty href → media dropped; xlink:href="data:..." is
      // copied into ppt/slides/_rels and survives PPTX→FODP with original bytes.
      const href = this._escapeXml(shape.src || "");
      return `
        <draw:frame ${geom}>
          <draw:plugin xlink:href="${href}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="${mime}">
            ${this._binaryDataXml(shape.src)}
            <draw:param draw:name="Loop" draw:value="false"/>
            <draw:param draw:name="Mute" draw:value="false"/>
          </draw:plugin>
        </draw:frame>`;
    }

    if (type === "table") {
      const rows = Array.isArray(shape.cells) ? shape.cells : [];
      const cols = Math.max(1, Number(shape.cols) || rows.reduce((max, row) => Math.max(max, (row || []).length), 1));
      const rowsXml = rows.map((row) => {
        const cells = Array.from({ length: cols }, (_, index) => row?.[index] ?? "");
        const cellsXml = cells.map((cell) => {
          const html = this._htmlHasFormat(cell) ? cell : "";
          const plain = html ? this._plainFromHtml(cell) : cell;
          return `<table:table-cell office:value-type="string">${this._richOrPlainXml(plain, html, richCtx)}</table:table-cell>`;
        }).join("");
        return `<table:table-row>${cellsXml}</table:table-row>`;
      }).join("");
      return `
        <draw:frame ${geom}>
          <table:table table:name="${this._escapeXml(String(shape.id ?? drawId))}">
            <table:table-column table:number-columns-repeated="${cols}"/>
            ${rowsXml}
          </table:table>
        </draw:frame>`;
    }

    if (type === "chart") {
      const chartType = ["bar", "line", "pie", "area"].includes(shape.chartType) ? shape.chartType : "bar";
      const labels = Array.isArray(shape.labels) ? shape.labels.map(String) : [];
      const data = Array.isArray(shape.data) ? shape.data.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0) : [];
      const count = Math.max(labels.length, data.length);
      const title = this._escapeXml(shape.title || "Biểu đồ dữ liệu");
      const vnAttrs = ` vno:chart="true" vno:chart-type="${chartType}" vno:chart-title="${title}" vno:chart-labels="${this._escapeXml(JSON.stringify(labels))}" vno:chart-data="${this._escapeXml(JSON.stringify(data))}"`;
      const rows = Array.from({ length: count }, (_, index) => `<table:table-row><table:table-cell office:value-type="string"><text:p>${this._escapeXml(labels[index] || `Mục ${index + 1}`)}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="${data[index] ?? 0}"><text:p>${data[index] ?? 0}</text:p></table:table-cell></table:table-row>`).join("");
      const endRow = Math.max(2, count + 1);
      const axes = chartType === "pie" ? "" : `<chart:axis chart:dimension="x" chart:name="primary-x"><chart:categories table:cell-range-address="local-table.$A$2:.$A$${endRow}"/></chart:axis><chart:axis chart:dimension="y" chart:name="primary-y"><chart:grid chart:class="major"/></chart:axis>`;
      return `
        <draw:frame ${geom}${vnAttrs}>
          <draw:object>
            <office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart">
              <office:body><office:chart>
                <chart:chart svg:width="${this._pxToOdf(shape.w)}" svg:height="${this._pxToOdf(shape.h)}" xlink:href="." xlink:type="simple" chart:class="chart:${chartType}">
                  <chart:title><text:p>${title}</text:p></chart:title><chart:legend chart:legend-position="end"/>
                  <chart:plot-area>${axes}<chart:series chart:values-cell-range-address="local-table.$B$2:.$B$${endRow}" chart:label-cell-address="local-table.$B$1" chart:class="chart:${chartType}">${Array.from({ length: count }, () => "<chart:data-point/>").join("")}</chart:series></chart:plot-area>
                  <table:table table:name="local-table"><table:table-header-columns><table:table-column/></table:table-header-columns><table:table-columns><table:table-column/></table:table-columns><table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>${title}</text:p></table:table-cell></table:table-row></table:table-header-rows><table:table-rows>${rows}</table:table-rows></table:table>
                </chart:chart>
              </office:chart></office:body>
            </office:document>
          </draw:object>
        </draw:frame>`;
    }

    if (type === "wordart") {
      const styleName = this._wordArtTextStyleName(shape);
      const wordartAttrs = this._wordArtCustomAttrs(shape);
      const spanText = this._escapeXml(shape.text || "");
      return `
        <draw:frame ${geom}${wordartAttrs}>
          <draw:text-box>
            <text:p><text:span text:style-name="${styleName}">${spanText}</text:span></text:p>
          </draw:text-box>
        </draw:frame>`;
    }

    if (type === "textbox" || type === "text") {
      const pClass = /^(title|subtitle|outline)$/.test(shape.presentationClass || "") ? shape.presentationClass : "";
      const pAttrs = pClass
        ? ` presentation:class="${pClass}" presentation:style-name="${pClass === "title" ? "prTitle" : "prBody"}" presentation:user-transformed="true"`
        : "";
      return `
        <draw:frame ${geom}${pAttrs}>
          <draw:text-box>
            ${textXml}
          </draw:text-box>
        </draw:frame>`;
    }

    if (type === "ellipse") {
      return `
        <draw:ellipse ${geom}>
          ${textXml}
        </draw:ellipse>`;
    }

    if (type === "arrow") {
      // LibreOffice PPTX filter maps classic ODF draw:type="arrow" to prst=rect.
      // draw:type="right-arrow" maps to prst=rightArrow and returns as ooxml-rightArrow.
      return `
        <draw:custom-shape ${geom}>
          ${textXml}
          <draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="right-arrow" draw:enhanced-path="M 0 7640 L 13955 7640 13955 3890 21600 10800 13955 17710 13955 13960 0 13960 Z"/>
        </draw:custom-shape>`;
    }

    return `
        <draw:rect ${geom}>
          ${textXml}
        </draw:rect>`;
  }

  _serializeSlideShapes(shapes, idMap, richCtx) {
    if (!Array.isArray(shapes) || shapes.length === 0) return "";
    const map = idMap || this._collectShapeIdMap(shapes);
    return shapes.map((shape) => this._serializeShape(shape, map.get(String(shape.id)), map, richCtx)).join("");
  }

  _parseGraphicFillStyles(xmlText) {
    const styles = new Map();
    const regex = /<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi;
    let match;
    while ((match = regex.exec(xmlText)) !== null) {
      if (!/style:family=["'](graphic|presentation)["']/i.test(match[1])) continue;
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const parentStyleName = match[1].match(/style:parent-style-name=["']([^"']+)["']/i)?.[1] || null;
      const fill = match[2].match(/draw:fill-color=["']([^"']+)["']/i)?.[1];
      const fillKind = match[2].match(/draw:fill=["']([^"']+)["']/i)?.[1];
      const stroke = match[2].match(/svg:stroke-color=["']([^"']+)["']/i)?.[1];
      const strokeKind = match[2].match(/draw:stroke=["']([^"']+)["']/i)?.[1];
      const strokeWidthRaw = match[2].match(/svg:stroke-width=["']([^"']+)["']/i)?.[1];
      const hAlignRaw = match[2].match(/draw:textarea-horizontal-align=["']([^"']+)["']/i)?.[1];
      const fontSize = match[2].match(/fo:font-size=["']([^"']+)["']/i)?.[1];
      const fontWeight = match[2].match(/fo:font-weight=["']([^"']+)["']/i)?.[1];
      const fontColor = match[2].match(/fo:color=["']([^"']+)["']/i)?.[1];
      const fontFamily = match[2].match(/fo:font-family=["']([^"']+)["']/i)?.[1] || match[2].match(/style:font-name=["']([^"']+)["']/i)?.[1];
      let strokeWidth = null;
      if (strokeWidthRaw) {
        strokeWidth = this._odfLengthToPx(strokeWidthRaw, false);
      }
      if ((stroke || strokeKind === "solid") && (strokeWidth == null || strokeWidth <= 0)) {
        strokeWidth = 1;
      }
      const markerEnd = match[2].match(/draw:marker-end=["']([^"']+)["']/i)?.[1];
      const vAlignRaw = match[2].match(/draw:textarea-vertical-align=["']([^"']+)["']/i)?.[1];
      const vnoDirection = match[2].match(/vno:text-direction=["']([^"']+)["']/i)?.[1];
      const writingMode = match[2].match(/style:writing-mode=["']([^"']+)["']/i)?.[1];
      let textDirection = null;
      if (vnoDirection) textDirection = vnoDirection;
      else if (writingMode === "tb-rl") textDirection = "vertical";
      else if (writingMode === "tb-lr") textDirection = "stacked";
      const padTop = match[2].match(/fo:padding-top=["']([^"']+)["']/i)?.[1];
      const padBottom = match[2].match(/fo:padding-bottom=["']([^"']+)["']/i)?.[1];
      const padLeft = match[2].match(/fo:padding-left=["']([^"']+)["']/i)?.[1];
      const padRight = match[2].match(/fo:padding-right=["']([^"']+)["']/i)?.[1];
      const padAll = match[2].match(/(?:^|\s)fo:padding=["']([^"']+)["']/i)?.[1];
      const finalPadTop = padTop || padAll;
      const finalPadBottom = padBottom || padAll;
      const finalPadLeft = padLeft || padAll;
      const finalPadRight = padRight || padAll;
      const shrinkToFit = /style:shrink-to-fit=["']true["']/i.test(match[2]);
      const fitToSize = /draw:fit-to-size=["']true["']/i.test(match[2]);
      const autoGrowHeight = /draw:auto-grow-height=["']true["']/i.test(match[2]);
      const clipRaw = match[2].match(/fo:clip=["']([^"']+)["']/i)?.[1];
      const crop = this._parseClipRect(clipRaw);
      styles.set(name, {
        parentStyleName,
        fill: fillKind === "none" ? "transparent" : (fill || null),
        stroke: strokeKind === "none" ? null : (stroke || (strokeKind === "solid" ? "#000000" : null)),
        strokeWidth,
        strokeWidthRaw,
        strokeKind: strokeKind || null,
        markerEnd: markerEnd || null,
        textVAlign: vAlignRaw || null,
        textAlign: hAlignRaw || null,
        fontSize: fontSize || null,
        fontWeight: fontWeight || null,
        fontColor: fontColor || null,
        fontFamily: fontFamily || null,
        textDirection: (textDirection && textDirection !== "horizontal") ? textDirection : null,
        paddingTop: finalPadTop ? this._odfLengthToPx(finalPadTop, false) : null,
        paddingBottom: finalPadBottom ? this._odfLengthToPx(finalPadBottom, false) : null,
        paddingLeft: finalPadLeft ? this._odfLengthToPx(finalPadLeft, false) : null,
        paddingRight: finalPadRight ? this._odfLengthToPx(finalPadRight, false) : null,
        shrinkToFit,
        fitToSize,
        autoGrowHeight,
        crop: crop || null,
        autofit: shrinkToFit || fitToSize
      });
    }
    for (const [, s] of styles) {
      let p = s.parentStyleName ? styles.get(s.parentStyleName) : null;
      let depth = 0;
      while (p && depth < 10) {
        if (!s.fill && p.fill) s.fill = p.fill;
        if (!s.stroke && p.stroke) s.stroke = p.stroke;
        if (s.strokeWidth == null && p.strokeWidth != null) s.strokeWidth = p.strokeWidth;
        if (!s.strokeKind && p.strokeKind) s.strokeKind = p.strokeKind;
        if (!s.textVAlign && p.textVAlign) s.textVAlign = p.textVAlign;
        if (!s.textAlign && p.textAlign) s.textAlign = p.textAlign;
        if (!s.fontSize && p.fontSize) s.fontSize = p.fontSize;
        if (!s.fontWeight && p.fontWeight) s.fontWeight = p.fontWeight;
        if (!s.fontColor && p.fontColor) s.fontColor = p.fontColor;
        if (!s.fontFamily && p.fontFamily) s.fontFamily = p.fontFamily;
        if (!s.textDirection && p.textDirection) s.textDirection = p.textDirection;
        if (s.paddingTop == null && p.paddingTop != null) s.paddingTop = p.paddingTop;
        if (s.paddingBottom == null && p.paddingBottom != null) s.paddingBottom = p.paddingBottom;
        if (s.paddingLeft == null && p.paddingLeft != null) s.paddingLeft = p.paddingLeft;
        if (s.paddingRight == null && p.paddingRight != null) s.paddingRight = p.paddingRight;
        if (!s.shrinkToFit && p.shrinkToFit) s.shrinkToFit = true;
        if (!s.fitToSize && p.fitToSize) s.fitToSize = true;
        if (!s.autofit && p.autofit) s.autofit = true;
        if (!s.crop && p.crop) s.crop = p.crop;
        p = p.parentStyleName ? styles.get(p.parentStyleName) : null;
        depth++;
      }
    }
    return styles;
  }

  _paragraphsFromXml(xml) {
    const paragraphs = [];
    const regex = /<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      let inner = match[1]
        .replace(/<text:line-break\b[^>]*\/?>/gi, "\n")
        .replace(/<text:s\b[^>]*text:c=["'](\d+)["'][^>]*\/?>/gi, (_, c) => " ".repeat(parseInt(c, 10) || 1))
        .replace(/<text:s\b[^>]*\/?>/gi, " ");
      const clean = this._unescapeXml(inner.replace(/<[^>]+>/g, "")).trim();
      if (clean && clean !== "<number>" && !clean.startsWith("<")) paragraphs.push(clean);
    }
    return paragraphs;
  }

  /**
   * Speaker notes body is presentation:class="notes". soffice PPTX→FODP also
   * emits page-thumbnail + header/footer/date-time/page-number on the notes
   * master (sometimes inlined on the page). Those must not become slide.notes.
   */
  _parseNotesText(notesXml) {
    if (!notesXml) return "";
    if (/presentation:class=["']notes["']/i.test(notesXml)) {
      return this._frameParagraphsByClass(notesXml, "notes").join("\n");
    }
    return this._paragraphsFromXml(notesXml).join("\n");
  }

  _frameParagraphsByClass(pageXml, className) {
    const frames = [];
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let match;
    while ((match = regex.exec(pageXml)) !== null) {
      const cls = match[1].match(/presentation:class=["']([^"']+)["']/i)?.[1];
      if (cls === className) frames.push(this._paragraphsFromXml(match[2]));
    }
    return frames.flat();
  }

  _parseDrawShape(tagName, attrs, inner, graphicStyles) {
    const get = (name) => this._attr(attrs, name);
    const geomType = inner.match(/draw:type=["']([^"']+)["']/i)?.[1] || tagName;
    const dAttr = get("svg:d");
    const enhancedPath = inner.match(/draw:enhanced-path=["']([^"']+)["']/i)?.[1];
    let type = "rect";
    if (/ellipse|circle/i.test(geomType) || tagName === "ellipse" || tagName === "circle") type = "ellipse";
    else if (/arrow/i.test(geomType)) type = "arrow";
    else if (/path|ink/i.test(geomType) || tagName === "path" || (dAttr && !/arrow/i.test(geomType))) type = "ink";
    const styleName = get("draw:style-name");
    const style = graphicStyles.get(styleName) || {};
    const color = get("draw:fill-color") || style.fill || "#3b82f6";

    // Stroke / border resolution
    const strokeKind = get("draw:stroke") || style.strokeKind;
    let stroke = get("svg:stroke-color") || (strokeKind === "none" ? null : style.stroke);
    if (!stroke && strokeKind === "solid") stroke = "#000000";
    let strokeWidth = null;
    const strokeWidthAttr = get("svg:stroke-width");
    if (strokeWidthAttr) {
      strokeWidth = this._odfLengthToPx(strokeWidthAttr, false);
    } else if (style.strokeWidth != null) {
      strokeWidth = style.strokeWidth;
    }
    if (stroke && (strokeWidth == null || strokeWidth <= 0)) {
      strokeWidth = 1;
    }

    // Font properties resolution (weight, size, color)
    let resolvedFontWeight = null;
    let resolvedFontSize = null;
    let resolvedFontColor = null;

    const spanStyleMatches = inner.matchAll(/<text:span\b[^>]*text:style-name=["']([^"']+)["']/gi);
    for (const sm of spanStyleMatches) {
      const tStyle = this._richMaps?.text?.get(sm[1]);
      if (tStyle) {
        if (!resolvedFontWeight && tStyle.fontWeight) resolvedFontWeight = tStyle.fontWeight;
        if (!resolvedFontSize && tStyle.size) resolvedFontSize = tStyle.size;
        if (!resolvedFontColor && tStyle.color) resolvedFontColor = tStyle.color;
      }
    }

    const pStyleMatches = inner.matchAll(/<text:p\b[^>]*text:style-name=["']([^"']+)["']/gi);
    for (const pm of pStyleMatches) {
      const pStyle = this._richMaps?.para?.get(pm[1]);
      if (pStyle) {
        if (!resolvedFontWeight && pStyle.fontWeight) resolvedFontWeight = pStyle.fontWeight;
        if (!resolvedFontSize && pStyle.fontSize) resolvedFontSize = pStyle.fontSize;
        if (!resolvedFontColor && pStyle.color) resolvedFontColor = pStyle.color;
      }
    }

    const textStyleName = get("draw:text-style-name");
    if (textStyleName) {
      const pStyle = this._richMaps?.para?.get(textStyleName);
      if (pStyle) {
        if (!resolvedFontWeight && pStyle.fontWeight) resolvedFontWeight = pStyle.fontWeight;
        if (!resolvedFontSize && pStyle.fontSize) resolvedFontSize = pStyle.fontSize;
        if (!resolvedFontColor && pStyle.color) resolvedFontColor = pStyle.color;
      }
      const tStyle = this._richMaps?.text?.get(textStyleName);
      if (tStyle) {
        if (!resolvedFontWeight && tStyle.fontWeight) resolvedFontWeight = tStyle.fontWeight;
        if (!resolvedFontSize && tStyle.size) resolvedFontSize = tStyle.size;
        if (!resolvedFontColor && tStyle.color) resolvedFontColor = tStyle.color;
      }
    }

    if (!resolvedFontWeight) {
      resolvedFontWeight = inner.match(/fo:font-weight=["']([^"']+)["']/i)?.[1] || style.fontWeight || null;
    }
    if (!resolvedFontSize) {
      resolvedFontSize = inner.match(/fo:font-size=["']([^"']+)["']/i)?.[1] || style.fontSize || null;
    }
    if (!resolvedFontColor) {
      resolvedFontColor = inner.match(/fo:color=["']([^"']+)["']/i)?.[1] || style.fontColor || null;
    }

    const textAlign = inner.match(/fo:text-align=["']([^"']+)["']/i)?.[1] || style.textAlign || get("draw:textarea-horizontal-align") || null;

    // Cùng lỗi thật đã sửa cho _parseFrameShape() (ảnh): hình rect/ellipse/
    // custom-shape bị XOAY trong PPTX thật cũng được soffice ghi vị trí qua
    // draw:transform="rotate(...) translate(...)" thay vì svg:x/svg:y —
    // dùng _parseDrawTranslate() để xử lý đúng cả 2 trường hợp.
    const origin = this._parseDrawTranslate(attrs);
    const shape = {
      id: this._restoreShapeId(attrs),
      type,
      x: origin.x,
      y: origin.y,
      w: this._odfLengthToPx(get("svg:width")) || 200,
      h: this._odfLengthToPx(get("svg:height")) || 120,
      ...(origin.rotationDeg ? { rotation: origin.rotationDeg } : {}),
      color,
      fill: color,
      ...(stroke ? { stroke, strokeColor: stroke, strokeWidth, "svg:stroke-color": stroke, "draw:stroke": strokeKind || "solid" } : {}),
      ...(resolvedFontWeight ? {
        fontWeight: resolvedFontWeight,
        "fo:font-weight": resolvedFontWeight,
        bold: resolvedFontWeight === "bold" || parseInt(resolvedFontWeight, 10) >= 600
      } : {}),
      ...(resolvedFontSize ? { fontSize: resolvedFontSize, "fo:font-size": resolvedFontSize } : {}),
      ...(resolvedFontColor ? { fontColor: resolvedFontColor, color: color } : {}),
      ...(textAlign ? { textAlign: textAlign === "justify" ? "left" : textAlign } : {}),
      text: this._paragraphsFromXml(inner).join("\n"),
      textHtml: this._shapeHtmlFromXml(inner),
      animation: this._noneAnimation()
    };
    if (style.textVAlign) shape.textVAlign = style.textVAlign;
    if (style.textDirection) shape.textDirection = style.textDirection;
    const inlinePadTop = get("fo:padding-top") || get("fo:padding") || inner.match(/fo:padding(?:-top)?=["']([^"']+)["']/i)?.[1];
    const inlinePadBottom = get("fo:padding-bottom") || get("fo:padding") || inner.match(/fo:padding(?:-bottom)?=["']([^"']+)["']/i)?.[1];
    const inlinePadLeft = get("fo:padding-left") || get("fo:padding") || inner.match(/fo:padding(?:-left)?=["']([^"']+)["']/i)?.[1];
    const inlinePadRight = get("fo:padding-right") || get("fo:padding") || inner.match(/fo:padding(?:-right)?=["']([^"']+)["']/i)?.[1];
    const pLeft = inlinePadLeft ? this._odfLengthToPx(inlinePadLeft, false) : style.paddingLeft;
    const pRight = inlinePadRight ? this._odfLengthToPx(inlinePadRight, false) : style.paddingRight;
    const pTop = inlinePadTop ? this._odfLengthToPx(inlinePadTop, false) : style.paddingTop;
    const pBottom = inlinePadBottom ? this._odfLengthToPx(inlinePadBottom, false) : style.paddingBottom;
    if (pLeft != null) shape.paddingLeft = pLeft;
    if (pRight != null) shape.paddingRight = pRight;
    if (pTop != null) shape.paddingTop = pTop;
    if (pBottom != null) shape.paddingBottom = pBottom;
    if (type === "ink" || tagName === "path" || dAttr) {
      shape.type = "ink";
      shape.d = dAttr || enhancedPath || "";
      shape.viewBox = get("svg:viewBox") || inner.match(/svg:viewBox=["']([^"']+)["']/i)?.[1] || "";
      shape.stroke = get("svg:stroke-color") || style.stroke || color || "#DC2626";
      shape.strokeWidth = strokeWidth || style.strokeWidth || 3;
      shape.color = shape.stroke;
      shape.fill = "none";
    }
    return shape;
  }

  _parseConnectorShape(attrs, inner, graphicStyles) {
    const get = (name) => this._attr(attrs, name);
    const style = graphicStyles.get(get("draw:style-name")) || {};
    const x1 = this._odfLengthToPx(get("svg:x1"));
    const y1 = this._odfLengthToPx(get("svg:y1"));
    const x2 = this._odfLengthToPx(get("svg:x2"));
    const y2 = this._odfLengthToPx(get("svg:y2"));
    const x = this._odfLengthToPx(get("svg:x")) || Math.min(x1, x2);
    const y = this._odfLengthToPx(get("svg:y")) || Math.min(y1, y2);
    const w = this._odfLengthToPx(get("svg:width")) || Math.max(1, Math.abs(x2 - x1));
    const h = this._odfLengthToPx(get("svg:height")) || Math.max(1, Math.abs(y2 - y1));
    return {
      id: this._restoreShapeId(attrs),
      type: "connector",
      x, y, w, h, x1, y1, x2, y2,
      color: get("svg:stroke-color") || style.stroke || "#475569",
      arrowEnd: !!(get("draw:marker-end") || style.markerEnd),
      sourceId: get("draw:start-shape") || null,
      targetId: get("draw:end-shape") || null,
      diagramRole: "connector",
      animation: this._noneAnimation()
    };
  }

  _parseEmbeddedSrc(inner, fallbackMime) {
    const href = this._unescapeXml(inner.match(/xlink:href=["']([^"']*)["']/i)?.[1] || "");
    // Prefer a data: href: soffice PPTX hop keeps media bytes there and may also
    // inject a sibling <draw:image> poster whose office:binary-data is a PNG.
    if (/^data:/i.test(href)) return href.replace(/\s+/g, "");
    const mime = inner.match(/draw:mime-type=["']([^"']+)["']/i)?.[1] || fallbackMime;
    const binary = inner.match(/<office:binary-data[^>]*>([\s\S]*?)<\/office:binary-data>/i)?.[1];
    if (binary && binary.replace(/\s+/g, "")) {
      return `data:${mime};base64,${binary.replace(/\s+/g, "")}`;
    }
    return href;
  }

  _pluginMediaType(inner) {
    const mime = inner.match(/draw:mime-type=["']([^"']+)["']/i)?.[1] || "";
    const href = this._unescapeXml(inner.match(/<draw:plugin\b[^>]*xlink:href=["']([^"']*)["']/i)?.[1]
      || inner.match(/xlink:href=["']([^"']*)["']/i)?.[1]
      || "");
    const dataMime = href.match(/^data:([^;,]+)/i)?.[1] || "";
    if (/^audio\//i.test(mime) || /^audio\//i.test(dataMime)) return "audio";
    return "video";
  }

  _parseTableCells(inner) {
    const rows = [];
    // soffice FODP may compress identical consecutive cells/rows
    // (table:number-columns-repeated / table:number-rows-repeated) and may emit
    // empty cells as self-closing. Count each logical cell, not each XML tag.
    const rowRegex = /<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      const rowRepeat = Math.max(1, Number(this._attr(rowMatch[1], "table:number-rows-repeated")) || 1);
      const cells = [];
      const cellRegex = /<(?:table:)?(?:table-cell|covered-table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:table:)?(?:table-cell|covered-table-cell)>)/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[2] || "")) !== null) {
        const colRepeat = Math.max(1, Number(this._attr(cellMatch[1], "table:number-columns-repeated")) || 1);
        const isCovered = /^<(?:table:)?covered-table-cell\b/i.test(cellMatch[0]);
        const text = isCovered ? "" : this._paragraphsFromXml(cellMatch[2] || "").join("\n");
        const fallback = isCovered
          ? ""
          : this._unescapeXml(this._attr(cellMatch[1], "office:value") || this._attr(cellMatch[1], "office:string-value") || "");
        const cellHtml = isCovered ? "" : this._htmlFromOdfXml(cellMatch[2] || "", this._richMaps);
        const cellText = this._htmlHasFormat(cellHtml) ? cellHtml : (text || fallback);
        for (let index = 0; index < colRepeat; index++) cells.push(cellText);
      }
      for (let index = 0; index < rowRepeat; index++) rows.push(cells.slice());
    }
    return rows;
  }

  _parseFrameShape(attrs, inner, graphicStyles) {
    const get = (name) => this._attr(attrs, name);
    const styleName = get("draw:style-name") || get("presentation:style-name");
    const style = graphicStyles.get(styleName) || {};
    // Lỗi thật đã xác nhận qua probe soffice thật: khi hình (ảnh/bảng/khối)
    // trong PPTX thật bị XOAY, soffice ghi vị trí qua
    // draw:transform="rotate(...) translate(...)" thay vì svg:x/svg:y (2
    // thuộc tính này HOÀN TOÀN VẮNG MẶT trong trường hợp đó). Đọc thẳng
    // svg:x/svg:y như trước đây làm mọi hình xoay bị đặt nhầm về góc
    // (0,0) — dùng _parseDrawTranslate() (đã có sẵn, đang dùng cho
    // <draw:g> ở _extractDrawGroups()) để xử lý đúng cả 2 trường hợp.
    const origin = this._parseDrawTranslate(attrs);
    const base = {
      id: this._restoreShapeId(attrs),
      x: origin.x,
      y: origin.y,
      w: this._odfLengthToPx(get("svg:width")) || 200,
      h: this._odfLengthToPx(get("svg:height")) || 120,
      ...(origin.rotationDeg ? { rotation: origin.rotationDeg } : {}),
      animation: this._noneAnimation()
    };

    if (this._attr(attrs, "vno:chart").toLowerCase() === "true" || /<chart:chart\b/i.test(inner)) {
      const chartClass = inner.match(/<chart:chart\b[^>]*chart:class=["']chart:([^"']+)/i)?.[1] || this._attr(attrs, "vno:chart-type") || "bar";
      const supportedType = ["bar", "line", "pie", "area"].includes(chartClass) ? chartClass : "bar";
      const metadataLabels = this._unescapeXml(this._attr(attrs, "vno:chart-labels"));
      const metadataData = this._unescapeXml(this._attr(attrs, "vno:chart-data"));
      let labels = [], data = [];
      try { labels = JSON.parse(metadataLabels || "[]"); } catch (_) { labels = []; }
      try { data = JSON.parse(metadataData || "[]"); } catch (_) { data = []; }
      if (!labels.length && /<table:table\b/i.test(inner)) {
        const rows = this._parseTableCells(inner).slice(1);
        labels = rows.map((row) => row[0] || "");
        data = rows.map((row) => Number(row[1]) || 0);
      }
      const xmlTitle = inner.match(/<chart:title\b[^>]*>[\s\S]*?<text:p\b[^>]*>([\s\S]*?)<\/text:p>/i)?.[1] || "";
      return { ...base, type: "chart", chartType: supportedType, title: this._unescapeXml(this._attr(attrs, "vno:chart-title")) || this._unescapeXml(xmlTitle.replace(/<[^>]+>/g, "")).trim() || "Biểu đồ dữ liệu", labels, data, color: "transparent" };
    }

    // soffice PPTX hop keeps <table:table> but injects a sibling <draw:image> preview
    // (WMF/bitmap). Table must win or the shape is misread as type "image".
    if (/<table:table\b/i.test(inner)) {
      const cells = this._parseTableCells(inner);
      return {
        ...base,
        type: "table",
        cells,
        rows: cells.length,
        cols: cells.reduce((max, row) => Math.max(max, row.length), 0),
        color: get("draw:fill-color") || style.fill || "transparent",
        text: ""
      };
    }
    // Same poster-image trap for media: plugin + draw:image preview. Plugin wins.
    if (/<draw:plugin\b/i.test(inner)) {
      const type = this._pluginMediaType(inner);
      const pluginMatch = inner.match(/<draw:plugin\b([^>]*)>([\s\S]*?)<\/draw:plugin>/i);
      const pluginXml = pluginMatch ? pluginMatch[0] : inner;
      return { ...base, type, src: this._parseEmbeddedSrc(pluginXml, type === "audio" ? "audio/mpeg" : "video/mp4"), color: "transparent" };
    }
    if (/<draw:image\b/i.test(inner)) {
      const crop = style.crop || this._parseClipRect(this._attr(attrs, "fo:clip")) || this._parseClipRect(inner.match(/fo:clip=["']([^"']+)["']/i)?.[1]);
      const cropPct = this._parseSrcRectPct(this._attr(attrs, "vno:src-rect")) || this._parseSrcRectPct(inner.match(/vno:src-rect=["']([^"']+)["']/i)?.[1]);
      return {
        ...base,
        type: "image",
        src: this._parseEmbeddedSrc(inner, "image/png"),
        color: "transparent",
        ...(crop ? { crop } : {}),
        ...(cropPct ? { cropPct } : {})
      };
    }

    const hasId = get("draw:id") || get("xml:id") || get("draw:name") || get("svg:x");
    const wordart = this._parseWordArtAttrs(attrs);
    if (wordart) {
      return {
        ...base,
        ...wordart,
        text: this._paragraphsFromXml(inner).join("\n")
      };
    }
    if (/<draw:text-box\b/i.test(inner) && (hasId || get("svg:width"))) {
      const frameVAlign = this._attr(attrs, "draw:textarea-vertical-align");
      const boxVAlign = inner.match(/draw:textarea-vertical-align=["']([^"']+)["']/i)?.[1];
      const vAlign = frameVAlign || boxVAlign || style.textVAlign || null;
      const frameShrink = /style:shrink-to-fit=["']true["']/i.test(attrs) || /style:shrink-to-fit=["']true["']/i.test(inner);
      const frameFit = /draw:fit-to-size=["']true["']/i.test(attrs) || /draw:fit-to-size=["']true["']/i.test(inner);
      const frameAutoGrowH = /draw:auto-grow-height=["']false["']/i.test(attrs) || /draw:auto-grow-height=["']false["']/i.test(inner);
      const frameAutoGrowW = /draw:auto-grow-width=["']false["']/i.test(attrs) || /draw:auto-grow-width=["']false["']/i.test(inner);
      const frameWrap = this._attr(attrs, "fo:wrap-option") || inner.match(/fo:wrap-option=["']([^"']+)["']/i)?.[1];
      const frameFill = get("draw:fill-color");
      const boxFill = inner.match(/draw:fill-color=["']([^"']+)["']/i)?.[1];
      const frameFillKind = get("draw:fill");
      const boxFillKind = inner.match(/draw:fill=["']([^"']+)["']/i)?.[1];
      let color = "transparent";
      if (frameFillKind === "none" || boxFillKind === "none" || style.fill === "transparent") {
        color = "transparent";
      } else {
        color = frameFill || boxFill || style.fill || "transparent";
      }
      const textbox = {
        ...base,
        type: "textbox",
        color,
        text: this._paragraphsFromXml(inner).join("\n"),
        textHtml: this._shapeHtmlFromXml(inner),
        shrinkToFit: frameShrink || Boolean(style.shrinkToFit),
        fitToSize: frameFit || Boolean(style.fitToSize),
        noAutofit: frameAutoGrowH && frameAutoGrowW,
        autofit: frameShrink || frameFit || Boolean(style.autofit),
        wrap: frameWrap || style.wrap || null
      };
      if (vAlign) textbox.textVAlign = vAlign;
      if (style.textDirection) textbox.textDirection = style.textDirection;
      const inlinePadTop = this._attr(attrs, "fo:padding-top") || this._attr(attrs, "fo:padding") || inner.match(/fo:padding(?:-top)?=["']([^"']+)["']/i)?.[1];
      const inlinePadBottom = this._attr(attrs, "fo:padding-bottom") || this._attr(attrs, "fo:padding") || inner.match(/fo:padding(?:-bottom)?=["']([^"']+)["']/i)?.[1];
      const inlinePadLeft = this._attr(attrs, "fo:padding-left") || this._attr(attrs, "fo:padding") || inner.match(/fo:padding(?:-left)?=["']([^"']+)["']/i)?.[1];
      const inlinePadRight = this._attr(attrs, "fo:padding-right") || this._attr(attrs, "fo:padding") || inner.match(/fo:padding(?:-right)?=["']([^"']+)["']/i)?.[1];
      const pLeft = inlinePadLeft ? this._odfLengthToPx(inlinePadLeft, false) : style.paddingLeft;
      const pRight = inlinePadRight ? this._odfLengthToPx(inlinePadRight, false) : style.paddingRight;
      const pTop = inlinePadTop ? this._odfLengthToPx(inlinePadTop, false) : style.paddingTop;
      const pBottom = inlinePadBottom ? this._odfLengthToPx(inlinePadBottom, false) : style.paddingBottom;
      if (pLeft != null) textbox.paddingLeft = pLeft;
      if (pRight != null) textbox.paddingRight = pRight;
      if (pTop != null) textbox.paddingTop = pTop;
      if (pBottom != null) textbox.paddingBottom = pBottom;
      return textbox;
    }
    return null;
  }

  _isLayoutPresentationClass(className) {
    return /^(title|subtitle|outline|notes|header|footer|page-number|date-time|page)$/i.test(className || "");
  }

  _extractTaggedShapes(pageContent, tagNames, handler) {
    const names = tagNames.join("|");
    const regex = new RegExp(`<draw:(${names})\\b([^>]*?)(?:/>|>([\\s\\S]*?)</draw:\\1>)`, "gi");
    const blocks = [];
    let match;
    while ((match = regex.exec(pageContent)) !== null) {
      handler(match[1], match[2] || "", match[3] || "");
      blocks.push(match[0]);
    }
    let next = pageContent;
    for (const block of blocks) next = next.replace(block, "");
    return next;
  }

  _extractShapeFrames(pageContent, shapes, graphicStyles, idMap) {
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    const blocks = [];
    let match;
    while ((match = regex.exec(pageContent)) !== null) {
      const cls = this._attr(match[1], "presentation:class");
      if (/^(notes|header|footer|page-number|date-time|page)$/i.test(cls)) continue;
      const name = this._attr(match[1], "draw:name");
      const userTransformed = this._attr(match[1], "presentation:user-transformed") === "true";
      const isPlaceholder = /^(title|subtitle|outline)$/i.test(cls)
        && (!name || /^(title|body|body2|subtitle|outline)$/i.test(name))
        && !userTransformed;
      if (isPlaceholder) continue;
      const shape = this._parseFrameShape(match[1], match[2], graphicStyles);
      if (!shape) continue;
      // Khung tiêu đề / phụ đề / nội dung của tệp PowerPoint mở vào thành hộp chữ tự do trên
      // canvas; nhớ vai trò placeholder để khi lưu lại PowerPoint vẫn thấy đúng khung Tiêu đề
      // (bản cũ lưu thành hộp chữ thường — mất tiêu đề trong dàn ý/điều hướng, đo COM G8).
      if (shape.type === "textbox" && /^(title|subtitle|outline)$/i.test(cls || "")) {
        shape.presentationClass = cls.toLowerCase();
      }
      this._recordShapeId(match[1], shape, idMap);
      shapes.push(shape);
      blocks.push(match[0]);
    }
    let next = pageContent;
    for (const block of blocks) next = next.replace(block, "");
    return next;
  }

  /**
   * LibreOffice Impress flattens PPTX DrawingML SmartArt to <draw:g> of
   * custom-shapes (measured: not a bitmap). Stamp diagramGroupId so canvas
   * treats the imported boxes as one diagram; drop the empty background
   * rect LO adds as the first child.
   */
  _diagramGroupIdFromAttrs(attrs, index) {
    const raw = this._attr(attrs, "draw:name") || this._attr(attrs, "draw:id") || this._attr(attrs, "xml:id") || "";
    const slug = String(raw).trim().replace(/\s+/g, "-");
    return slug || `diagram-import-${index}`;
  }

  _parseDrawTranslate(attrs) {
    const transform = this._attr(attrs, "draw:transform") || this._attr(attrs, "svg:transform");
    // Lỗi thật đã xác nhận qua probe soffice thật: soffice ghi
    // "rotate (-0.785...) translate (5.318cm 1.726cm)" — CÓ khoảng trắng
    // giữa tên hàm và dấu ngoặc — nhưng regex cũ yêu cầu "translate(" liền
    // nhau nên không bao giờ khớp, khiến vị trí luôn rơi về nhánh dự phòng
    // svg:x/svg:y (thường vắng mặt khi có transform) → vị trí sai về (0,0).
    const match = String(transform || "").match(/translate\s*\(\s*([^,)\s]+)\s*[, ]\s*([^,)\s]+)\s*\)/i);
    // ODF rotate(radian) dùng chiều DƯƠNG = ngược kim đồng hồ (chuẩn toán
    // học), trong khi OOXML a:xfrm rot=... VÀ CSS transform:rotate(deg)
    // đều dùng chiều DƯƠNG = xuôi kim đồng hồ — phải ĐẢO DẤU khi quy đổi
    // sang độ để hiển thị CSS đúng chiều xoay thật (xác nhận qua probe:
    // OOXML rot="1800000" [30° xuôi kim] → ODF ghi rotate(-0.5235987...)
    // [-30° theo chuẩn ngược kim] — đảo dấu lại đúng 30°).
    const rotateMatch = String(transform || "").match(/rotate\s*\(\s*(-?[\d.]+)\s*\)/i);
    const rotationDeg = rotateMatch ? -(parseFloat(rotateMatch[1]) * 180 / Math.PI) : 0;
    if (match) {
      let x = this._odfLengthToPx(match[1], false);
      let y = this._odfLengthToPx(match[2], false);
      const w = this._odfLengthToPx(this._attr(attrs, "svg:width"), false);
      const h = this._odfLengthToPx(this._attr(attrs, "svg:height"), false);
      if (rotationDeg && w > 0 && h > 0) {
        // translate = góc trên-trái SAU khi xoay (xoay quanh góc). VN/PowerPoint giữ góc
        // CHƯA xoay và xoay quanh tâm: C = T + R(θ)·(w/2, h/2); x = Cx − w/2, y = Cy − h/2.
        const theta = rotationDeg * Math.PI / 180;
        const cx = x + (w / 2) * Math.cos(theta) - (h / 2) * Math.sin(theta);
        const cy = y + (w / 2) * Math.sin(theta) + (h / 2) * Math.cos(theta);
        x = cx - w / 2;
        y = cy - h / 2;
      }
      return { x: Math.round(x), y: Math.round(y), rotationDeg };
    }
    return {
      x: this._odfLengthToPx(this._attr(attrs, "svg:x")),
      y: this._odfLengthToPx(this._attr(attrs, "svg:y")),
      rotationDeg
    };
  }

  _shapeArea(shape) {
    return Math.max(0, Number(shape?.w) || 0) * Math.max(0, Number(shape?.h) || 0);
  }

  _omitGroupBackground(shapes) {
    if (!Array.isArray(shapes) || shapes.length < 2) return shapes || [];
    let backgroundIndex = -1;
    let backgroundArea = 0;
    for (let index = 0; index < shapes.length; index++) {
      const shape = shapes[index];
      if (shape.type === "connector") continue;
      if (String(shape.text || "").trim()) continue;
      const area = this._shapeArea(shape);
      if (area > backgroundArea) {
        backgroundArea = area;
        backgroundIndex = index;
      }
    }
    if (backgroundIndex < 0) return shapes;
    const others = shapes.filter((shape, index) => index !== backgroundIndex && shape.type !== "connector");
    if (!others.length) return shapes;
    const maxOther = Math.max(...others.map((shape) => this._shapeArea(shape)));
    if (backgroundArea > maxOther * 2.5) {
      return shapes.filter((_, index) => index !== backgroundIndex);
    }
    return shapes;
  }

  _applyGroupOffset(shapes, groupX, groupY) {
    if (!groupX && !groupY) return;
    const xs = shapes.map((shape) => shape.x).filter((value) => Number.isFinite(value));
    const ys = shapes.map((shape) => shape.y).filter((value) => Number.isFinite(value));
    if (!xs.length) return;
    // soffice FODP for SmartArt writes absolute svg:x/y on children (measured).
    // Only add the group origin when children look relative (near 0,0).
    if (Math.min(...xs) >= 24 || Math.min(...ys) >= 24) return;
    for (const shape of shapes) {
      if (Number.isFinite(shape.x)) shape.x += groupX;
      if (Number.isFinite(shape.y)) shape.y += groupY;
      if (Number.isFinite(shape.x1)) shape.x1 += groupX;
      if (Number.isFinite(shape.x2)) shape.x2 += groupX;
      if (Number.isFinite(shape.y1)) shape.y1 += groupY;
      if (Number.isFinite(shape.y2)) shape.y2 += groupY;
    }
  }

  _parseInnerDrawShapes(xml, graphicStyles, idMap) {
    const shapes = [];
    let rest = xml;
    rest = this._extractTaggedShapes(rest, ["rect", "ellipse", "circle", "custom-shape", "polygon", "path"], (tagName, attrs, inner) => {
      const shape = this._parseDrawShape(tagName, attrs, inner, graphicStyles);
      this._recordShapeId(attrs, shape, idMap);
      shapes.push(shape);
    });
    rest = this._extractTaggedShapes(rest, ["connector", "line"], (tagName, attrs, inner) => {
      const shape = this._parseConnectorShape(attrs, inner, graphicStyles);
      if (tagName === "line" && !shape.sourceId && !shape.targetId) shape.type = "connector";
      this._recordShapeId(attrs, shape, idMap);
      shapes.push(shape);
    });
    this._extractShapeFrames(rest, shapes, graphicStyles, idMap);
    return shapes;
  }

  _stampImportedDiagramGroup(children, groupId, idMap) {
    const kept = this._omitGroupBackground(children);
    let nodeIndex = 0;
    let connectorIndex = 0;
    for (const shape of kept) {
      shape.diagramGroupId = groupId;
      const previousId = shape.id;
      const generatedId = typeof previousId === "number";
      if (shape.type === "connector") {
        shape.diagramRole = "connector";
        if (generatedId) shape.id = `${groupId}-connector-${++connectorIndex}`;
      } else {
        shape.diagramRole = "node";
        if (shape.diagramLevel == null) shape.diagramLevel = 0;
        if (generatedId) shape.id = `${groupId}-node-${++nodeIndex}`;
      }
      if (idMap && generatedId && previousId !== shape.id) {
        for (const [key, value] of idMap) {
          if (value === previousId) idMap.set(key, shape.id);
        }
        idMap.set(String(shape.id), shape.id);
      }
    }
    return kept;
  }

  _extractDrawGroups(pageContent, shapes, graphicStyles, idMap) {
    const regex = /<draw:g\b([^>]*)>([\s\S]*?)<\/draw:g>/gi;
    const blocks = [];
    let match;
    let groupIndex = 0;
    while ((match = regex.exec(pageContent)) !== null) {
      blocks.push(match[0]);
      groupIndex += 1;
      const attrs = match[1] || "";
      const inner = match[2] || "";
      const groupId = this._diagramGroupIdFromAttrs(attrs, groupIndex);
      const origin = this._parseDrawTranslate(attrs);
      const children = this._parseInnerDrawShapes(inner, graphicStyles, idMap);
      this._applyGroupOffset(children, origin.x, origin.y);
      const grouped = this._stampImportedDiagramGroup(children, groupId, idMap);
      for (const shape of grouped) shapes.push(shape);
    }
    let next = pageContent;
    for (const block of blocks) next = next.replace(block, "");
    return next;
  }

  _frameBlocksByClass(pageXml, className) {
    const frames = [];
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let match;
    while ((match = regex.exec(pageXml)) !== null) {
      const cls = match[1].match(/presentation:class=["']([^"']+)["']/i)?.[1];
      if (cls === className) frames.push(this._paragraphsFromXml(match[2]).join("\n"));
    }
    return frames;
  }

  /**
   * ODF dateTime for dc:date. Canvas stores toISOString() (UTC + ms + Z).
   * LibreOffice Impress rewrites to YYYY-MM-DDTHH:mm:ss without fraction/Z
   * (measured FODP→FODP and PPTX hop).
   */
  _odfAnnotationDate(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString().replace(/\.\d{3}Z$/, "");
    }
    return value.replace(/\.\d+Z?$/, "").replace(/Z$/, "");
  }

  /**
   * Page-level Impress comments. ODF uses office:annotation on draw:page
   * (not table:table-cell like Sheet). LibreOffice rewrites the element to
   * officeooo:annotation after FODP/PPTX hop but keeps dc:creator/dc:date/text:p.
   */
  _serializePageCommentsXml(comments) {
    const list = (Array.isArray(comments) ? comments : []).filter((comment) => String(comment?.text || "").trim());
    if (!list.length) return "";
    const pageWidthCm = parseFloat(this._pxToOdf(this.canvas?.slideSize?.width || 960));
    const commentXCm = Math.round(pageWidthCm * (22 / 28) * 1000) / 1000;
    return list.map((comment, index) => {
      const name = this._escapeXml(String(comment.id || `comment-${index + 1}`));
      const author = this._escapeXml(comment.author || "");
      const date = this._escapeXml(this._odfAnnotationDate(comment.timestamp));
      const y = Math.round((0.4 + index * 3.2) * 1000) / 1000;
      return `
        <office:annotation draw:name="${name}" svg:x="${commentXCm}cm" svg:y="${y}cm" svg:width="5cm" svg:height="3cm">
          <dc:creator>${author}</dc:creator>${date ? `
          <dc:date>${date}</dc:date>` : ""}
          ${this._textParagraphsXml(comment.text)}
        </office:annotation>`;
    }).join("");
  }

  _parsePageComments(pageXml) {
    const comments = [];
    const blocks = [];
    const regex = /<(office:annotation|officeooo:annotation)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(pageXml)) !== null) {
      blocks.push(match[0]);
      const attrs = match[2] || "";
      const inner = match[3] || "";
      const author = this._unescapeXml((inner.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1] || "").replace(/<[^>]+>/g, "")).trim();
      const timestamp = this._unescapeXml((inner.match(/<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1] || "").replace(/<[^>]+>/g, "")).trim();
      const text = this._paragraphsFromXml(inner).join("\n");
      if (!text && !author) continue;
      const rawId = this._attr(attrs, "draw:name") || this._attr(attrs, "office:name") || this._attr(attrs, "draw:id");
      comments.push({
        id: rawId || `comment-${comments.length + 1}`,
        text,
        author,
        timestamp
      });
    }
    let next = pageXml;
    for (const block of blocks) next = next.replace(block, "");
    return { comments, pageXml: next };
  }

  _masterTheme() {
    return this.canvas?.masterTheme || null;
  }

  _masterPageFillAttrs() {
    const isImported = Boolean(this.canvas?.imported);
    const theme = this._masterTheme();
    // Default 3T Office theme bgColor - don't serialize for imported docs
    const defaultBgColor = "#f8fafc";
    if (isImported && (!theme?.bgColor || theme.bgColor === defaultBgColor)) return "";
    const color = this._cssColorToHex(theme?.bgColor || "") || theme?.bgColor;
    if (!color) return "";
    return ` draw:fill="solid" draw:fill-color="${this._escapeXml(color)}"`;
  }

  _serializeMasterPageXml() {
    const isImported = Boolean(this.canvas?.imported);
    const theme = this._masterTheme();
    if (!theme) {
      return `<style:master-page style:name="Standard" style:page-layout-name="PM1" draw:style-name="dp1"/>`;
    }
    const isVnDefaultLogo = !theme.logoText || [
      "VN OFFICE • THUYẾT TRÌNH", "VN OFFICE",
      "3T OFFICE • THUYẾT TRÌNH", "3T OFFICE"
    ].includes(theme.logoText);
    const effectiveLogoText = (isImported && isVnDefaultLogo) ? "" : (theme.logoText || "");
    const effectiveFooterText = theme.footerText || "";
    const payload = {
      id: theme.id || theme.themeId || "",
      fontFamily: theme.fontFamily || "",
      titleColor: theme.titleColor || "",
      bodyColor: theme.bodyColor || "",
      accentColor: theme.accentColor || "",
      bgColor: theme.bgColor || "",
      logoText: effectiveLogoText,
      footerText: effectiveFooterText
    };
    const logo = this._escapeXml(effectiveLogoText);
    const footer = this._escapeXml(effectiveFooterText);

    if (isImported && !effectiveLogoText && !effectiveFooterText) {
      const themeAttr = (payload.bgColor || payload.fontFamily)
        ? ` vno:master-theme="${this._escapeXml(JSON.stringify(payload))}"`
        : "";
      return `<style:master-page style:name="Standard" style:page-layout-name="PM1" draw:style-name="dp1"${themeAttr}/>`;
    }

    // Kích thước thật của trang chiếu (canvas.slideSize) - KHÔNG hardcode 28cm/15.75cm
    // nữa (giá trị cũ giả định sai một khổ 960x540 thật ra ~25.4x14.29cm, khiến
    // slide xuất ra khai báo khổ giấy khác hẳn hệ tọa độ hình khối thật bên trong -
    // lỗi thật phát hiện khi kiểm tra vòng chuyển đổi PPTX thật). Các phần tử trang
    // trí (thanh nhấn, logo, chân trang) co giãn theo đúng tỉ lệ của khổ cũ để giữ
    // nguyên bố cục tương đối, không bị lấn ra ngoài khi khổ trang chiếu khác 16:9 mặc định.
    const slideWidthPx = this.canvas?.slideSize?.width || 960;
    const slideHeightPx = this.canvas?.slideSize?.height || 540;
    const pageWidthCm = parseFloat(this._pxToOdf(slideWidthPx));
    const pageHeightCm = parseFloat(this._pxToOdf(slideHeightPx));
    const footerWidthCm = (Math.round(pageWidthCm * (26.8 / 28) * 1000) / 1000);
    const footerYCm = (Math.round(pageHeightCm * (14.6 / 15.75) * 1000) / 1000);
    // FODP keeps the logo on style:master-page. LibreOffice FODP→PPTX drops it
    // (placeholders only). File → Lưu PPTX post-process inserts a DrawingML
    // p:sp without p:ph onto ppt/slideMasters/slideMaster1.xml — see
    // pptx-master-logo.js / ooxml_zip_patch.postprocess_slides_pptx.
    const accentBar = !isImported
      ? `<draw:rect draw:style-name="grMasterAccent" svg:x="0cm" svg:y="0cm" svg:width="${pageWidthCm}cm" svg:height="0.25cm"/>\n      `
      : "";
    const logoFrame = logo
      ? `<draw:frame draw:style-name="grMasterLogo" svg:x="0.6cm" svg:y="0.4cm" svg:width="16cm" svg:height="0.8cm">\n        <draw:text-box><text:p>${logo}</text:p></draw:text-box>\n      </draw:frame>\n      `
      : "";
    const footerFrame = footer
      ? `<draw:frame draw:style-name="grMasterFooter" svg:x="0.6cm" svg:y="${footerYCm}cm" svg:width="${footerWidthCm}cm" svg:height="0.7cm">\n        <draw:text-box><text:p>${footer}</text:p></draw:text-box>\n      </draw:frame>`
      : "";

    return `<style:master-page style:name="Standard" style:page-layout-name="PM1" draw:style-name="dp1" vno:master-theme="${this._escapeXml(JSON.stringify(payload))}">
      ${accentBar}${logoFrame}${footerFrame}
    </style:master-page>`;
  }

  _parseMasterTheme(xmlText) {
    const master = String(xmlText || "").match(/<style:master-page\b([^>]*)>/i)?.[1] || "";
    const raw = this._unescapeXml(this._attr(master, "vno:master-theme"));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (_) { /* ignore malformed metadata */ }
    }
    const logoMatch = String(xmlText || "").match(/<style:master-page\b[\s\S]*?<draw:frame[^>]*grMasterLogo[\s\S]*?<text:p\b[^>]*>([\s\S]*?)<\/text:p>/i);
    const logoText = logoMatch ? this._unescapeXml(logoMatch[1].replace(/<[^>]+>/g, "")).trim() : "";
    if (!logoText) return null;
    return { logoText };
  }

  /**
   * Chuyển đổi toàn bộ slide hiện tại thành định dạng OpenDocument Flat XML (FODP).
   * LibreOffice Impress có thể chuyển đổi FODP trực tiếp sang PPTX, ODP hoặc PDF.
   */
  serializeToFodp() {
    const slides = (this.canvas && this.canvas.slides) || [];
    const sections = (this.canvas && this.canvas.sections) || [];
    const richCtx = this._newRichTextContext();
    let pagesXml = "";

    // Mọi khung placeholder (title/body/notes) bên dưới được thiết kế theo tỉ lệ
    // của khổ 28cm x 15.75cm (khớp khổ trang chiếu đã khai báo trước khi sửa lỗi
    // thật: khổ khai báo trong style:page-layout trước đây bị hardcode sai, không
    // khớp hệ tọa độ px thật của canvas.slideSize). scaleX/scaleY co giãn các
    // khung này đúng theo TỈ LỆ khi khổ trang chiếu thật khác 960x540 mặc định,
    // giữ nguyên bố cục tương đối thay vì bị lấn ra ngoài mép trang mới.
    const slideWidthPx = this.canvas?.slideSize?.width || 960;
    const slideHeightPx = this.canvas?.slideSize?.height || 540;
    const pageWidthCm = parseFloat(this._pxToOdf(slideWidthPx));
    const pageHeightCm = parseFloat(this._pxToOdf(slideHeightPx));
    const scaleX = pageWidthCm / 28;
    const scaleY = pageHeightCm / 15.75;
    const cmX = value => Math.round(value * scaleX * 1000) / 1000;
    const cmY = value => Math.round(value * scaleY * 1000) / 1000;

    slides.forEach((slide, idx) => {
      const pageName = `page${idx + 1}`;
      // Tiêu đề trống giữ nguyên là placeholder trống như PowerPoint — không tự điền
      // «Trang chiếu N» thành chữ thật vào tệp của người dùng.
      const titleXml = this._richOrPlainXml(slide.title || "", slide.titleHtml, richCtx, this._themeTextBase("title", slide));
      const layoutType = slide.layoutType || "title-content";

      // Ghi chú người thuyết trình phải là placeholder «notes» thật (presentation:style-name +
      // ảnh trang chiếu) — thiếu style-name, LibreOffice xuất thành một hộp chữ xanh thường trên
      // trang ghi chú và PowerPoint hiện khung Ghi chú TRỐNG (đo bằng PowerPoint COM, G8).
      const notesXml = slide.notes ? `
        <presentation:notes>
          <draw:page-thumbnail presentation:class="page" svg:x="2.1cm" svg:y="2.1cm" svg:width="16.8cm" svg:height="9.45cm" draw:page-number="${idx + 1}"/>
          <draw:frame presentation:style-name="prNotes" presentation:class="notes" svg:x="2.1cm" svg:y="12.7cm" svg:width="16.8cm" svg:height="12.8cm">
            <draw:text-box>
              ${slide.notes.split("\n").map((line) => `<text:p>${this._escapeXml(line)}</text:p>`).join("")}
            </draw:text-box>
          </draw:frame>
        </presentation:notes>` : "";

      const usedIds = new Set();
      const placeholderIds = this._allocPlaceholderIds(slide, idx, usedIds);
      const idMap = this._collectShapeIdMap(slide.shapes || [], usedIds);
      const titleIds = this._placeholderIdAttrs("title", placeholderIds.title);
      const bodyIds = this._placeholderIdAttrs("body", placeholderIds.body);
      const body2Ids = this._placeholderIdAttrs("body2", placeholderIds.body2);

      let framesXml = "";
      if (layoutType === "blank") {
        framesXml = "";
      } else if (layoutType === "title-only") {
        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="${cmX(2)}cm" svg:y="${cmY(6)}cm" svg:width="${cmX(24)}cm" svg:height="${cmY(6)}cm">
          <draw:text-box>
            ${titleXml}
          </draw:text-box>
        </draw:frame>`;
      } else if (layoutType === "two-content") {
        const bodyParasXml = this._richOrPlainXml(slide.body, slide.bodyHtml, richCtx, this._themeTextBase("body", slide));
        const body2ParasXml = this._richOrPlainXml(slide.body2, slide.body2Html, richCtx, this._themeTextBase("body", slide));

        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="${cmX(2)}cm" svg:y="${cmY(2)}cm" svg:width="${cmX(24)}cm" svg:height="${cmY(3)}cm">
          <draw:text-box>
            ${titleXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${bodyIds} svg:x="${cmX(2)}cm" svg:y="${cmY(5.5)}cm" svg:width="${cmX(11.5)}cm" svg:height="${cmY(11)}cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${body2Ids} svg:x="${cmX(14.5)}cm" svg:y="${cmY(5.5)}cm" svg:width="${cmX(11.5)}cm" svg:height="${cmY(11)}cm">
          <draw:text-box>
            ${body2ParasXml}
          </draw:text-box>
        </draw:frame>`;
      } else {
        const bodyParasXml = this._richOrPlainXml(slide.body, slide.bodyHtml, richCtx, this._themeTextBase("body", slide));

        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="${cmX(2)}cm" svg:y="${cmY(2)}cm" svg:width="${cmX(24)}cm" svg:height="${cmY(3)}cm">
          <draw:text-box>
            ${titleXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${bodyIds} svg:x="${cmX(2)}cm" svg:y="${cmY(5.5)}cm" svg:width="${cmX(24)}cm" svg:height="${cmY(11)}cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>`;
      }

      const shapesXml = this._serializeSlideShapes(slide.shapes || [], idMap, richCtx);
      const pageXmlId = `idPage${idx + 1}`;
      const pageStyleName = this._pageDrawingStyleName(slide, idx);
      const animXml = this._serializePageAnimXml(pageXmlId, slide, idMap, placeholderIds);
      const commentsXml = this._serializePageCommentsXml(slide.comments);

      const vnTransitionAttr = slide.transition?.type === "morph" ? ' vno:transition="morph"' : "";
      const section = sections.find(item => item.id === slide.sectionId);
      // FODP keeps the group on draw:page. LibreOffice FODP→PPTX drops
      // vno:section-* (probe: no p:extLst). File → Lưu PPTX post-process
      // inserts p14:sectionLst into ppt/presentation.xml — see
      // pptx-section-list.js / ooxml_zip_patch.postprocess_slides_pptx.
      // File → Mở overlays those attributes back before parseFodp
      // (LibreOffice PPTX→FODP drops p14:sectionLst).
      const vnSectionAttrs = section
        ? ` vno:section-id="${this._escapeXml(section.id)}" vno:section-name="${this._escapeXml(section.name)}"`
        : "";
      pagesXml += `
      <draw:page draw:name="${pageName}" draw:style-name="${pageStyleName}" draw:master-page-name="Standard" presentation:layout="${layoutType}" xml:id="${pageXmlId}" draw:id="${pageXmlId}"${vnTransitionAttr}${vnSectionAttrs}>
        ${framesXml}${shapesXml}${animXml}${notesXml}${commentsXml}
      </draw:page>`;
    });

    const automaticStyles = this._serializeGraphicStyles(slides) + this._serializeRichTextStyles(richCtx);
    const backgroundResources = this._serializeBackgroundResources(slides);
    const officeStyles = backgroundResources
      ? `
  <office:styles>${backgroundResources}
  </office:styles>`
      : "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:dc="http://purl.org/dc/elements/1.1/"
                 xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0"
                 xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0"
                 xmlns:vno="urn:vn-office:slides:1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">${officeStyles}
  <office:automatic-styles>${automaticStyles}
  </office:automatic-styles>
  <office:master-styles>
    ${this._serializeMasterPageXml()}
  </office:master-styles>
  <office:body>
    <office:presentation>${pagesXml}${this._serializePresentationSettings()}
    </office:presentation>
  </office:body>
</office:document>`;
  }

  /**
   * Phân tích nội dung FODP XML thành danh sách slide.
   * Dùng parser chuỗi thống nhất (Node và trình duyệt) vì CSS selector của
   * DOMParser dễ khớp nhầm `draw:page-thumbnail` và placeholder master-page.
   */
  parseFodp(xmlText) {
    if (!xmlText) return [];
    const parsedSlides = [];
    const graphicStyles = this._parseGraphicFillStyles(xmlText);
    const drawingPageStyles = this._parseDrawingPageStyles(xmlText);
    const backgroundResources = this._parseBackgroundResources(xmlText);
    this._richMaps = this._parseRichStyleMaps(xmlText);
    const parsedSections = [];

    const masterPageStyles = new Map();
    const masterRe = /<style:master-page\b([^>]*)>/gi;
    let mm;
    while ((mm = masterRe.exec(xmlText)) !== null) {
      const mName = this._attr(mm[1], "style:name");
      const mStyle = this._attr(mm[1], "draw:style-name");
      if (mName && mStyle) masterPageStyles.set(mName, mStyle);
    }

    let presentationWidth = 960;
    let presentationHeight = 540;
    // Resolve page layout from master-page (typically "Standard" with page-layout-name="PM1")
    // rather than blindly taking the first <style:page-layout-properties> (which may be PM0 handouts A4 portrait).
    const masterPageLayoutMatch = String(xmlText || "").match(/<style:master-page\b[^>]*style:page-layout-name=["']([^"']+)["']/i);
    const masterLayoutName = masterPageLayoutMatch ? masterPageLayoutMatch[1] : null;
    let pageLayoutPropMatch = null;
    if (masterLayoutName) {
      const layoutRegex = new RegExp(`<style:page-layout\\b[^>]*style:name=["']${masterLayoutName}["'][\\s\\S]*?<style:page-layout-properties\\b[^>]*fo:page-width=["']([^"']+)["'][^>]*fo:page-height=["']([^"']+)["']`, "i");
      pageLayoutPropMatch = String(xmlText || "").match(layoutRegex);
    }
    if (!pageLayoutPropMatch) {
      pageLayoutPropMatch = String(xmlText || "").match(/<style:page-layout-properties\b[^>]*fo:page-width=["']([^"']+)["'][^>]*fo:page-height=["']([^"']+)["'][^>]*style:print-orientation=["']landscape["']/i)
        || String(xmlText || "").match(/<style:page-layout-properties\b[^>]*style:print-orientation=["']landscape["'][^>]*fo:page-width=["']([^"']+)["'][^>]*fo:page-height=["']([^"']+)["']/i)
        || String(xmlText || "").match(/<style:page-layout-properties\b[^>]*fo:page-width=["']([^"']+)["'][^>]*fo:page-height=["']([^"']+)["']/i);
    }
    if (pageLayoutPropMatch) {
      const pw = this._odfLengthToPx(pageLayoutPropMatch[1]);
      const ph = this._odfLengthToPx(pageLayoutPropMatch[2]);
      if (pw > 0 && ph > 0) {
        presentationWidth = pw;
        presentationHeight = ph;
      }
    }

    // Negative lookahead: do not match draw:page-thumbnail / page-number placeholders.
    const pageRegex = /<draw:page(?![-a-zA-Z])([^>]*)>([\s\S]*?)<\/draw:page>/gi;
    let pageMatch;
    let idx = 0;
    while ((pageMatch = pageRegex.exec(xmlText)) !== null) {
      idx++;
      const fullPageTag = pageMatch[1] || "";
      const sectionId = this._unescapeXml(this._attr(fullPageTag, "vno:section-id"));
      const sectionName = this._unescapeXml(this._attr(fullPageTag, "vno:section-name"));
      if (sectionId && !parsedSections.some(section => section.id === sectionId)) {
        parsedSections.push({ id: sectionId, name: sectionName || "Phần không tên" });
      }
      const layoutMatch = fullPageTag.match(/presentation:layout=["']([^"']+)["']/i);
      let pageLayout = layoutMatch ? layoutMatch[1] : "";
      const originalPageXml = pageMatch[2];
      const pageTransition = this._parsePageTransition(fullPageTag, originalPageXml, drawingPageStyles);
      const animByTarget = this._parsePageAnimations(originalPageXml);
      let pageContent = originalPageXml;

      let notesText = "";
      const notesRegex = /<presentation:notes[^>]*>([\s\S]*?)<\/presentation:notes>/i;
      const notesMatch = notesRegex.exec(pageContent);
      if (notesMatch) {
        notesText = this._parseNotesText(notesMatch[1]);
        pageContent = pageContent.replace(notesRegex, "");
      }

      const parsedComments = this._parsePageComments(pageContent);
      pageContent = parsedComments.pageXml;

      const shapes = [];
      const idMap = new Map();
      pageContent = this._extractDrawGroups(pageContent, shapes, graphicStyles, idMap);
      pageContent = this._extractTaggedShapes(pageContent, ["rect", "ellipse", "circle", "custom-shape", "polygon", "path"], (tagName, attrs, inner) => {
        const shape = this._parseDrawShape(tagName, attrs, inner, graphicStyles);
        this._recordShapeId(attrs, shape, idMap);
        shapes.push(shape);
      });
      pageContent = this._extractTaggedShapes(pageContent, ["connector", "line"], (tagName, attrs, inner) => {
        const shape = this._parseConnectorShape(attrs, inner, graphicStyles);
        if (tagName === "line" && !shape.sourceId && !shape.targetId) {
          shape.type = "connector";
        }
        this._recordShapeId(attrs, shape, idMap);
        shapes.push(shape);
      });
      pageContent = this._extractShapeFrames(pageContent, shapes, graphicStyles, idMap);
      for (const shape of shapes) {
        if (shape.type !== "connector") continue;
        shape.sourceId = this._mapConnectorRef(shape.sourceId, idMap);
        shape.targetId = this._mapConnectorRef(shape.targetId, idMap);
      }
      this._applyParsedAnimations(shapes, idMap, animByTarget);

      const titleParas = this._frameParagraphsByClass(originalPageXml, "title");
      const subtitleParas = this._frameParagraphsByClass(originalPageXml, "subtitle");
      const outlineParas = this._frameParagraphsByClass(originalPageXml, "outline");
      const outlineBlocks = this._frameBlocksByClass(originalPageXml, "outline");
      const hasPlaceholderClasses = titleParas.length > 0 || subtitleParas.length > 0 || outlineParas.length > 0;

      const masterPageName = this._attr(fullPageTag, "draw:master-page-name");
      const hasTextBoxShapes = shapes.some(s => s.type === "textbox");
      const isImportedSlide = !layoutMatch || masterPageName === "BLANK" || hasTextBoxShapes;

      // PPTX hop drops presentation:layout; restore two-content / title-only from remaining placeholders.
      if (isImportedSlide && (hasTextBoxShapes || masterPageName === "BLANK" || shapes.length > 0)) {
        pageLayout = "blank";
      } else if (pageLayout !== "blank") {
        if (outlineBlocks.length > 1) pageLayout = "two-content";
        else if (!pageLayout && hasPlaceholderClasses && titleParas.length && outlineBlocks.length === 0 && subtitleParas.length === 0) {
          pageLayout = "title-only";
        }
      }
      if (!pageLayout) pageLayout = "title-content";

      let title = `Trang chiếu ${idx}`;
      let body = "";
      let body2 = undefined;

      if (hasPlaceholderClasses) {
        title = titleParas.filter(Boolean).join(" ");
        if (pageLayout === "two-content") {
          body = outlineBlocks[0] || "";
          body2 = outlineBlocks.length > 1 ? outlineBlocks.slice(1).join("\n") : undefined;
        } else {
          body = subtitleParas.length ? subtitleParas.join("\n") : outlineParas.join("\n");
        }
      } else if (pageLayout === "blank") {
        title = "";
        body = "";
      } else if (pageLayout === "two-content") {
        const frameRegex = /<draw:frame[^>]*>([\s\S]*?)<\/draw:frame>/gi;
        const frames = [];
        let fm;
        while ((fm = frameRegex.exec(pageContent)) !== null) {
          const fParas = [];
          const fpRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
          let fpm;
          while ((fpm = fpRegex.exec(fm[1])) !== null) {
            const clean = fpm[1].replace(/<[^>]+>/g, "").trim();
            if (clean && !clean.startsWith("<")) fParas.push(this._unescapeXml(clean));
          }
          frames.push(fParas.join("\n"));
        }
        if (frames.length >= 3) {
          title = frames[0] || `Trang chiếu ${idx}`;
          body = frames[1] || "";
          body2 = frames[2] || "";
        } else {
          const pRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
          const paragraphs = [];
          let pMatch;
          while ((pMatch = pRegex.exec(pageContent)) !== null) {
            const cleanText = pMatch[1].replace(/<[^>]+>/g, "").trim();
            if (cleanText && !cleanText.startsWith("<")) {
              paragraphs.push(this._unescapeXml(cleanText));
            }
          }
          title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx}`;
          body = paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "";
        }
      } else {
        const pRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
        const paragraphs = [];
        let pMatch;
        while ((pMatch = pRegex.exec(pageContent)) !== null) {
          const cleanText = pMatch[1].replace(/<[^>]+>/g, "").trim();
          if (cleanText && !cleanText.startsWith("<")) {
            paragraphs.push(this._unescapeXml(cleanText));
          }
        }
        title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx}`;
        body = pageLayout === "title-only" ? "" : (paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "");
      }

      const titleHtmls = this._frameHtmlByClass(originalPageXml, "title", this._richMaps);
      const outlineHtmls = this._frameHtmlByClass(originalPageXml, "outline", this._richMaps);
      const subtitleHtmls = this._frameHtmlByClass(originalPageXml, "subtitle", this._richMaps);
      const titleHtml = titleHtmls.find((item) => this._htmlHasFormat(item));
      const bodyHtml = (subtitleHtmls.find((item) => this._htmlHasFormat(item))
        || (pageLayout === "two-content" ? outlineHtmls[0] : outlineHtmls.find((item) => this._htmlHasFormat(item))));
      const body2Html = pageLayout === "two-content" ? outlineHtmls[1] : undefined;

      const styleName = this._attr(fullPageTag, "draw:style-name");
      const fromPageStyle = drawingPageStyles.get(styleName) || {};
      const pageVisibility = this._attr(fullPageTag, "presentation:visibility") || this._attr(fullPageTag, "presentation:visible");
      const hidden = !!fromPageStyle.hidden
        || /^hidden$/i.test(pageVisibility)
        || /^(false|0)$/i.test(pageVisibility);
      let background = this._backgroundFromPageStyle(fromPageStyle, backgroundResources);
      if (!background) {
        const masterStyleName = masterPageStyles.get(masterPageName);
        if (masterStyleName) {
          const fromMasterStyle = drawingPageStyles.get(masterStyleName);
          background = this._backgroundFromPageStyle(fromMasterStyle, backgroundResources);
        }
      }
      if (!background) {
        background = { type: "solid", color: "#ffffff" };
      }

      const parsedSlide = {
        id: Date.now() + idx,
        title,
        body,
        body2,
        ...(titleHtml && this._htmlHasFormat(titleHtml) ? { titleHtml } : {}),
        ...(bodyHtml && this._htmlHasFormat(bodyHtml) ? { bodyHtml } : {}),
        ...(body2Html && this._htmlHasFormat(body2Html) ? { body2Html } : {}),
        layoutType: pageLayout,
        shapes,
        notes: notesText,
        ...(background ? { background } : {}),
        comments: parsedComments.comments,
        hidden,
        ...(sectionId ? { sectionId } : {}),
        ...(pageTransition ? { transition: pageTransition } : {}),
        ...(isImportedSlide ? { imported: true } : {})
      };
      this._applyPlaceholderAnimations(
        parsedSlide,
        this._collectPlaceholderTargets(originalPageXml),
        animByTarget
      );
      parsedSlides.push(parsedSlide);
    }

    Object.defineProperty(parsedSlides, "sections", { value: parsedSections, enumerable: false });
    Object.defineProperty(parsedSlides, "slideShowSettings", { value: this._parsePresentationSettings(xmlText), enumerable: false });
    Object.defineProperty(parsedSlides, "masterTheme", { value: this._parseMasterTheme(xmlText), enumerable: false });
    Object.defineProperty(parsedSlides, "slideWidth", { value: presentationWidth, enumerable: false });
    Object.defineProperty(parsedSlides, "slideHeight", { value: presentationHeight, enumerable: false });
    return parsedSlides;
  }

  _serializePresentationSettings() {
    // Loop = ODF presentation:endless (LibreOffice already maps to p:showPr @loop).
    // Narration/pointer have no ODF slot LO maps — File → Lưu PPTX patches
    // ppt/presProps.xml via pptx-show-properties.js / ooxml_zip_patch.
    const settings = this.canvas?.getSlideShowSettings
      ? this.canvas.getSlideShowSettings()
      : (this.canvas?.slideShowSettings || {});
    const attrs = [];
    if (settings.loopUntilEsc) attrs.push('presentation:endless="true"');
    if (settings.showWithoutNarration) attrs.push('vno:without-narration="true"');
    if (settings.pointerColor && settings.pointerColor !== "#DC2626") {
      attrs.push(`vno:pointer-color="${this._escapeXml(settings.pointerColor)}"`);
    }
    if (!attrs.length) return "";
    return `
      <presentation:settings ${attrs.join(" ")}/>`;
  }

  _parsePresentationSettings(xmlText) {
    const match = String(xmlText || "").match(/<presentation:settings\b([^>]*)\/?>/i);
    if (!match) {
      return { loopUntilEsc: false, showWithoutNarration: false, pointerColor: "#DC2626" };
    }
    const attrs = match[1] || "";
    const pointer = this._attr(attrs, "vno:pointer-color") || "#DC2626";
    return {
      loopUntilEsc: /presentation:endless=["']true["']/i.test(attrs),
      showWithoutNarration: /vno:without-narration=["']true["']/i.test(attrs),
      pointerColor: pointer
    };
  }

  /**
   * Nạp danh sách slide từ nội dung FODP vào Canvas hiện tại.
   * Optional ooxmlPresentationXml / ooxmlSlideMasterXml / ooxmlPresPropsXml
   * overlay p14:sectionLst, VNOfficeMasterLogo, and p:showPr onto FODP
   * before parseFodp (belt-and-suspenders; production File → Mở already
   * overlays in main.py).
   */
  /**
   * Khổ trang gốc tính bằng EMU: ưu tiên <p:sldSz> của PPTX gốc (chính xác tuyệt đối, kèm
   * type như "screen4x3"), không có thì lấy page-layout của FODP (tệp ODP / bản khôi phục).
   */
  _sourcePageEmu(fodpXml, ooxmlPresentationXml) {
    const sld = String(ooxmlPresentationXml || "").match(/<(?:\w+:)?sldSz\b([^>]*)\/?>/i)?.[1];
    if (sld) {
      const cx = Number(this._attr(sld, "cx"));
      const cy = Number(this._attr(sld, "cy"));
      if (cx > 0 && cy > 0) return { cx, cy, type: this._attr(sld, "type") || "" };
    }
    const props = String(fodpXml || "").match(/<style:page-layout-properties\b([^>]*)\/?>/i)?.[1];
    if (!props) return null;
    const toEmu = (raw) => {
      const m = String(raw || "").trim().match(/^([\d.]+)\s*(cm|mm|in|pt)$/i);
      if (!m) return 0;
      const perUnit = { cm: 360000, mm: 36000, in: 914400, pt: 12700 }[m[2].toLowerCase()];
      return Math.round(parseFloat(m[1]) * perUnit);
    };
    const cx = toEmu(this._attr(props, "fo:page-width"));
    const cy = toEmu(this._attr(props, "fo:page-height"));
    if (!(cx > 0 && cy > 0)) return null;
    return { cx, cy, type: this._attr(props, "vno:sld-type") || "" };
  }

  loadFromFodp(fodpText, ooxmlPresentationXml, ooxmlSlideMasterXml, ooxmlPresPropsXml) {
    if (!this.canvas) return;
    let xml = fodpText;
    if (ooxmlPresentationXml) xml = overlayFodpSections(xml, ooxmlPresentationXml);
    if (ooxmlSlideMasterXml) xml = overlayFodpMasterLogo(xml, ooxmlSlideMasterXml);
    if (ooxmlPresPropsXml) xml = overlayFodpShowProperties(xml, ooxmlPresPropsXml);
    const newSlides = this.parseFodp(xml);
    if (newSlides && newSlides.length > 0) {
      this.canvas.imported = true;
      // Tệp mở từ ngoài: toạ độ canvas theo 96 dpi (1 px = 0,75 pt) như trước.
      this.canvas.ptPerPx = 0.75;
      if (newSlides.slideWidth && newSlides.slideHeight) {
        const ratio = newSlides.slideWidth / newSlides.slideHeight;
        const preset = Math.abs(ratio - (4 / 3)) < 0.15 ? "standard" : "wide";
        if (this.canvas.setSlideSize) {
          this.canvas.setSlideSize({ preset, width: newSlides.slideWidth, height: newSlides.slideHeight }, false);
        } else {
          this.canvas.slideSize = { preset, width: newSlides.slideWidth, height: newSlides.slideHeight };
        }
      }
      // Giữ khổ trang GỐC tới từng EMU (px canvas đã làm tròn) để Lưu không đổi khổ của tệp.
      const sourceEmu = this._sourcePageEmu(xml, ooxmlPresentationXml);
      const size = this.canvas.slideSize;
      if (sourceEmu && size
        && Math.abs(sourceEmu.cx / 9525 - size.width) <= 2 && Math.abs(sourceEmu.cy / 9525 - size.height) <= 2) {
        this.canvas.slideSize = { ...this.canvas.slideSize, sourceEmu };
      }
      this.canvas.slides = newSlides;
      this.canvas.sections = [...(newSlides.sections || [])];
      if (newSlides.slideShowSettings && this.canvas.applySlideShowSettings) {
        this.canvas.applySlideShowSettings(newSlides.slideShowSettings);
      } else if (newSlides.slideShowSettings) {
        this.canvas.slideShowSettings = { ...newSlides.slideShowSettings };
      }
      if (newSlides.masterTheme && this.canvas.applySlideMaster) {
        this.canvas.applySlideMaster(newSlides.masterTheme);
      } else if (newSlides.masterTheme) {
        this.canvas.masterTheme = { ...(this.canvas.masterTheme || {}), ...newSlides.masterTheme };
      } else if (this.canvas.masterTheme) {
        this.canvas.masterTheme.logoText = "";
      }
      if (typeof this.canvas.selectSlide === "function") {
        this.canvas.selectSlide(0);
      }
    }
  }

  /** Load the existing Save FODP serialization as a new, unsaved recovery copy. */
  restoreFromAutoRecover(fodpText, manifest = {}) {
    const content = String(fodpText || "");
    if (!/<office:document\b/i.test(content) || !/<draw:page\b/i.test(content)) return false;
    this.loadFromFodp(content);
    if (!this.canvas?.slides?.length) return false;
    const originalTitle = String(manifest.title || "Bản trình bày 1.pptx").split(/[\\/]/).filter(Boolean).pop().replace(/\.[^/.]+$/, "") || "Bản trình bày";
    this.sourceFileName = `${originalTitle} (đã khôi phục)`;
    this.isDirty = true;
    this.shell?.resetDocumentChrome?.(`${this.sourceFileName}.pptx`, null, false);
    return true;
  }

  /**
   * Lưu bản trình chiếu thành tệp PPTX thật trên đĩa (qua LibreOffice headless engine).
   */
  async save() {
    if (!this.sourceFilePath) return await this.saveAs();
    const fodpContent = this.serializeToFodp();
    const result = await globalUnoBridge.saveRealFileInPlace(
      "slides",
      fodpContent,
      this.sourceFilePath,
      this.sourceFilePath
    );
    if (result.status === "ok") {
      this.isDirty = false;
      const savedPath = result.path || this.sourceFilePath;
      if (savedPath) {
        const savedFileName = savedPath.split(/[/\\]/).pop();
        if (savedFileName) {
          this.sourceFilePath = savedPath;
          this.sourceFileName = savedFileName.replace(/\.[^/.]+$/, "");
          this.shell?.resetDocumentChrome?.(savedFileName, null, true, savedPath);
        }
      }
      this.shell?.setStatus?.("Đã lưu");
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể lưu", message: result.message, type: "error" });
    return false;
  }

  async saveAs() {
    const fodpContent = this.serializeToFodp();
    const currentName = this.sourceFilePath
      ? this.sourceFilePath.split(/[/\\]/).pop()
      : (this.shell?.documentName || "Bản trình bày 1.pptx");
    const targetFormat = this.sourceFilePath
      ? (this.sourceFilePath.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || "pptx")
      : "pptx";
    const result = await globalUnoBridge.saveRealFile(
      "slides",
      fodpContent,
      targetFormat,
      currentName,
      this.sourceFilePath || null
    );
    if (result.status === "ok") {
      const savedPath = result.path || result.fileName;
      // Như PowerPoint: Lưu thành PDF chỉ xuất bản PDF; bản trình chiếu giữ tên, định dạng và trạng thái chưa lưu.
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
    await showAlertDialog({ title: "Không thể lưu bản trình chiếu", message: result.message || "Lỗi không xác định khi lưu bản trình chiếu.", type: "error" });
    return false;
  }

  /**
   * Mở một tệp PPTX/ODP thật từ đĩa, nạp các trang chiếu vào Canvas.
   */
  async open() {
    if (typeof this.shell?.confirmUnsavedChangesBeforeReplace === "function"
      && !(await this.shell.confirmUnsavedChangesBeforeReplace())) return false;
    const result = await globalUnoBridge.openRealFile("slides");
    if (result.status === "ok") {
      const previous = {
        content: this.serializeToFodp(),
        sourceFileName: this.sourceFileName,
        sourceFilePath: this.sourceFilePath,
        isDirty: this.isDirty
      };
      try {
        this.loadFromFodp(
          result.content,
          result.ooxmlPresentationXml,
          result.ooxmlSlideMasterXml,
          result.ooxmlPresPropsXml
        );
        if (!this.canvas?.slides?.length) throw new Error("Tệp không có trang chiếu hợp lệ.");
      } catch (error) {
        try { this.loadFromFodp(previous.content); } catch (restoreError) {
          console.error("[SlidesAdapter] Không khôi phục được bản trình chiếu sau khi mở tệp lỗi:", restoreError);
        }
        this.sourceFileName = previous.sourceFileName;
        this.sourceFilePath = previous.sourceFilePath;
        this.isDirty = previous.isDirty;
        await showAlertDialog({
          title: "Không thể mở tệp",
          message: "Slide không thể đọc nội dung tệp. Hãy kiểm tra tệp gốc hoặc thử lưu bản sao ở định dạng .pptx. Bản trình chiếu đang mở được giữ nguyên.",
          type: "error"
        });
        return false;
      }
      this.sourceFileName = (result.fileName || "TrinhChieu").replace(/\.[^/.]+$/, "");
      this.sourceFilePath = result.sourcePath || "";
      this.isDirty = false;
      // Lỗi thật đã xác nhận: nội dung nạp đúng nhưng nhãn tên tệp trên tab
      // vẫn giữ nguyên tên demo cũ vì resetDocumentChrome() chỉ được gọi ở
      // File > Mới/Đóng, chưa bao giờ gọi sau khi Mở tệp thật.
      this.shell?.resetDocumentChrome?.(result.fileName || "Bản trình bày 1.pptx", null, true, this.sourceFilePath);
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể mở tệp", message: result.message, type: "error" });
    return false;
  }

  async exportPdf() {
    const fodpContent = this.serializeToFodp();
    const result = await globalUnoBridge.exportRealPdf("slides", fodpContent, this.sourceFileName);
    if (result.status === "ok") {
      await showAlertDialog({ title: "Đã xuất PDF", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể xuất PDF", message: result.message, type: "error" });
    return false;
  }

  print() {
    const size = this.canvas?.slideSize || { width: 960, height: 540 };
    const orientation = size.width >= size.height ? "Ngang" : "Dọc";
    const slides = this.canvas?.slides || [];
    const currentSlide = this.canvas?.currentSlideIndex || 0;
    const currentPage = slides.slice(0, currentSlide + 1).filter((slide) => !slide.hidden).length || 1;
    return withLazyFeatureProgress("slides", "In và xem trước", () => import("../../../platform/print/print-dialog.js"))
      .then(({ openPrintDialog }) => openPrintDialog({
      appKind: "slides",
      content: this.serializeToFodp(),
      documentName: this.sourceFileName || "Bản trình chiếu",
      pageSetupLabel: `${size.width} × ${size.height} px · ${orientation}`,
      currentPage,
      engine: globalUnoBridge
    }));
  }

  /**
   * Mở hộp thoại chọn ảnh THẬT của trình duyệt, đọc tệp thật và chèn vào slide hiện tại.
   * Trả về Promise để handleDispatch có thể await đúng kết quả thật (không giả vờ thành công).
   */
  _insertImageDialog() {
    if (typeof document === "undefined") return Promise.resolve(false);
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const ok = this.canvas.insertImage ? this.canvas.insertImage(evt.target.result) : false;
          resolve(ok);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve(false);
      input.click();
    });
  }

  /**
   * Mở hộp thoại chọn video/audio THẬT của trình duyệt, đọc tệp thật thành Data URL và chèn
   * vào slide hiện tại. Trả về Promise để handleDispatch await đúng kết quả thật.
   * @param {"video"|"audio"} mediaType
   */
  _insertMediaDialog(mediaType) {
    if (typeof document === "undefined") return Promise.resolve(false);
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = mediaType === "video" ? "video/*" : "audio/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const ok = this.canvas.insertMedia ? this.canvas.insertMedia(mediaType, evt.target.result, file.size) : false;
          resolve(ok);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve(false);
      input.click();
    });
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.canvas) return false;
    const cmd = vnCmdId || (unoUrl === ".uno:AssignLayout" ? "slides.layout.apply" : vnCmdId);

    if (this._isTextFormatCommand(cmd)) {
      return this._handleTextFormatCommand(cmd, args);
    }

    switch (cmd) {
      case "slides.slide.new":
        return this.canvas.addNewSlide();

      case "slides.slide.duplicate":
        return this.canvas.duplicateCurrentSlide();

      case "slides.slide.delete":
        return this.canvas.deleteCurrentSlide();

      case "slides.section.add":
        return this.canvas.promptAddCurrentSection ? this.canvas.promptAddCurrentSection() : false;

      case "slides.section.rename":
        return this.canvas.promptRenameCurrentSection ? this.canvas.promptRenameCurrentSection() : false;

      case "slides.section.remove":
        return this.canvas.removeCurrentSection ? this.canvas.removeCurrentSection() : false;

      case "slides.section.moveUp":
        return this.canvas.moveCurrentSectionUp ? this.canvas.moveCurrentSectionUp() : false;

      case "slides.section.moveDown":
        return this.canvas.moveCurrentSectionDown ? this.canvas.moveCurrentSectionDown() : false;

      case "slides.slide.toggleHidden":
      case ".uno:HideSlide":
      case ".uno:ShowSlide":
        if (!this.canvas.toggleCurrentSlideHidden) return false;
        if (cmd === ".uno:ShowSlide") return this.canvas.toggleCurrentSlideHidden(true, false);
        if (cmd === ".uno:HideSlide" && vnCmdId !== "slides.slide.toggleHidden") {
          return this.canvas.toggleCurrentSlideHidden(true, true);
        }
        return this.canvas.toggleCurrentSlideHidden();

      case "slides.shape.group":
        return this.canvas.groupSelectedShapes ? this.canvas.groupSelectedShapes() : false;

      case "slides.shape.ungroup":
        return this.canvas.ungroupSelectedShapes ? this.canvas.ungroupSelectedShapes() : false;

      case "slides.arrange.alignLeft":
      case ".uno:ObjectAlignLeft":
        return this.canvas.alignShapes ? this.canvas.alignShapes("left", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.alignCenter":
      case ".uno:AlignCenter":
        return this.canvas.alignShapes ? this.canvas.alignShapes("center", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.alignRight":
      case ".uno:ObjectAlignRight":
        return this.canvas.alignShapes ? this.canvas.alignShapes("right", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.alignTop":
      case ".uno:AlignUp":
        return this.canvas.alignShapes ? this.canvas.alignShapes("top", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.alignMiddle":
      case ".uno:AlignMiddle":
        return this.canvas.alignShapes ? this.canvas.alignShapes("middle", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.alignBottom":
      case ".uno:AlignDown":
        return this.canvas.alignShapes ? this.canvas.alignShapes("bottom", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.distributeHorizontal":
      case ".uno:DistributeSelectionHorizontal":
        return this.canvas.distributeShapes ? this.canvas.distributeShapes("horizontal", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.distributeVertical":
      case ".uno:DistributeSelectionVertical":
        return this.canvas.distributeShapes ? this.canvas.distributeShapes("vertical", this.canvas.alignToSlideMode ? "slide" : "selection") : false;

      case "slides.arrange.alignToSlide":
        return this.canvas.toggleAlignToSlide ? this.canvas.toggleAlignToSlide() : false;

      case "slides.text.vAlignTop":
      case ".uno:TextVertAnchorTop":
        return this.canvas.setTextVerticalAlign ? this.canvas.setTextVerticalAlign("top") : false;

      case "slides.text.vAlignMiddle":
      case ".uno:TextVertAnchorCenter":
        return this.canvas.setTextVerticalAlign ? this.canvas.setTextVerticalAlign("middle") : false;

      case "slides.text.vAlignBottom":
      case ".uno:TextVertAnchorBottom":
        return this.canvas.setTextVerticalAlign ? this.canvas.setTextVerticalAlign("bottom") : false;

      case "slides.text.directionHorizontal":
      case ".uno:TextdirectionLeftToRight":
        return this.canvas.setTextDirection ? this.canvas.setTextDirection("horizontal") : false;

      case "slides.text.directionVertical":
      case ".uno:TextdirectionTopToBottom":
        return this.canvas.setTextDirection ? this.canvas.setTextDirection("vertical") : false;

      case "slides.text.directionVertical270":
        return this.canvas.setTextDirection ? this.canvas.setTextDirection("vertical270") : false;

      case "slides.text.directionStacked":
        return this.canvas.setTextDirection ? this.canvas.setTextDirection("stacked") : false;

      case "slides.nav.firstSlide":
        this.canvas.selectSlide(0);
        return true;

      case "slides.nav.lastSlide":
        this.canvas.selectSlide(this.canvas.slides.length - 1);
        return true;

      case "slides.nav.prevSlide":
        this.canvas.selectSlide(this.canvas.currentSlideIndex - 1);
        return true;

      case "slides.nav.nextSlide":
        this.canvas.selectSlide(this.canvas.currentSlideIndex + 1);
        return true;

      case "slides.layout.apply":
      case "slides.layout.select":
        return this.canvas.showLayoutDialog ? this.canvas.showLayoutDialog() : false;

      case "slides.show.startFromBegin":
        return this.canvas.startSlideShow(0);

      case "slides.show.startFromCurrent":
        return this.canvas.startSlideShow();

      case "slides.text.insert":
        // PowerPoint Chèn > Hộp văn bản: một đối tượng hộp chữ riêng trên trang (không phải
        // thêm dòng chữ mẫu vào khung nội dung như bản cũ).
        if (this.canvas.insertTextBox) return this.canvas.insertTextBox();
        return this.canvas.insertShape ? this.canvas.insertShape("textbox") : false;

      case "slides.arrange.bringForward":
        return this.canvas.reorderSelectedShapes ? this.canvas.reorderSelectedShapes("forward") : false;

      case "slides.arrange.sendBackward":
        return this.canvas.reorderSelectedShapes ? this.canvas.reorderSelectedShapes("backward") : false;

      case "slides.arrange.bringToFront":
        return this.canvas.reorderSelectedShapes ? this.canvas.reorderSelectedShapes("front") : false;

      case "slides.arrange.sendToBack":
        return this.canvas.reorderSelectedShapes ? this.canvas.reorderSelectedShapes("back") : false;

      case "slides.shape.insert":
        return this.canvas.insertShape ? this.canvas.insertShape("rect") : false;

      case "slides.diagram.insert":
        return this.canvas.showDiagramDialog ? this.canvas.showDiagramDialog() : false;

      case "slides.insert.chart":
        return this.canvas.insertChart ? await this.canvas.insertChart(args) : false;

      case "slides.image.insert":
        return await this._insertImageDialog();

      case "slides.master.apply":
        return this.canvas.showSlideMasterDialog ? this.canvas.showSlideMasterDialog() : false;

      case "slides.design.themeGallery":
        return this.canvas.showThemeGalleryDialog ? this.canvas.showThemeGalleryDialog() : false;

      case "slides.design.slideSize":
        return this.canvas.showSlideSizeDialog ? this.canvas.showSlideSizeDialog() : false;

      case "slides.design.formatBackground":
        return this.canvas.showFormatBackgroundDialog ? this.canvas.showFormatBackgroundDialog(args || {}) : false;

      case "slides.transition.apply":
        return this.canvas.showTransitionDialog ? this.canvas.showTransitionDialog() : false;

      case "slides.animation.apply":
        return this.canvas.showAnimationDialog ? this.canvas.showAnimationDialog() : false;

      case "slides.animation.pane":
      case ".uno:AnimationPane":
        return this.canvas.toggleAnimationPane ? this.canvas.toggleAnimationPane() : false;

      case "slides.show.setupShow":
      case ".uno:PresentationDialog":
        return this.canvas.showSetupShowDialog ? this.canvas.showSetupShowDialog() : false;

      case "slides.file.printPreview":
      case ".uno:PrintPreview":
        return this.print();

      case "slides.view.normal":
      case ".uno:NormalMultiPaneGUI":
        return this.canvas.setNormalView ? this.canvas.setNormalView() : false;

      case "slides.notes.toggle":
      case ".uno:NotesMode":
        return this.canvas.toggleNotes ? this.canvas.toggleNotes() : false;

      case "slides.view.slideSorter":
      case ".uno:DiaMode":
        return this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false;

      case "slides.view.reading":
      case ".uno:SlideShow":
        return this.canvas.toggleReadingView ? this.canvas.toggleReadingView() : false;

      case "slides.view.ruler":
      case ".uno:Ruler":
        return this.canvas.toggleRuler ? this.canvas.toggleRuler() : false;

      case "slides.view.gridlines":
      case ".uno:GridUse":
        return this.canvas.toggleGridlines ? this.canvas.toggleGridlines() : false;

      case "slides.view.guides":
      case ".uno:HelplinesUse":
        return this.canvas.toggleGuides ? this.canvas.toggleGuides() : false;

      case "slides.view.zoomIn":
      case ".uno:ZoomIn":
        return this.canvas.zoomIn ? this.canvas.zoomIn() : false;

      case "slides.view.zoomOut":
      case ".uno:ZoomOut":
        return this.canvas.zoomOut ? this.canvas.zoomOut() : false;

      case "slides.view.zoomReset":
      case ".uno:Zoom100Percent":
        return this.canvas.zoomReset ? this.canvas.zoomReset() : false;

      case "slides.view.fitToWindow":
      case ".uno:ZoomOptimal":
        return this.canvas.fitToWindow ? this.canvas.fitToWindow() : false;

      case "slides.view.newWindow":
      case ".uno:NewWindow":
        return this.canvas.newWindow ? this.canvas.newWindow() : false;

      case "slides.show.presenterMode":
        return this.canvas.startPresenterMode ? this.canvas.startPresenterMode() : false;

      case "slides.show.rehearseTimings":
        return this.canvas.startRehearseTimings ? !!this.canvas.startRehearseTimings() : false;

      case "slides.media.insertVideo":
        return await this._insertMediaDialog("video");

      case "slides.media.insertAudio":
        return await this._insertMediaDialog("audio");

      case "slides.review.commentInsert":
        return this.canvas.openCommentsPanel ? this.canvas.openCommentsPanel(true) : false;

      case "slides.review.spellCheck":
        return this.canvas.showSpellcheckDialog ? this.canvas.showSpellcheckDialog(args || {}) : false;

      case "slides.edit.formatPainter":
        return this.canvas.toggleFormatPainter ? this.canvas.toggleFormatPainter(args || {}) : false;

      case "slides.insert.table":
        return this.canvas.insertTable ? await this.canvas.insertTable(args) : false;

      case "slides.insert.headerFooter":
        return this.canvas.openHeaderFooterDialog ? await this.canvas.openHeaderFooterDialog(args) : false;

      case "slides.insert.dateTime":
        return this.canvas.insertDateTime ? await this.canvas.insertDateTime(args) : false;

      case "slides.insert.slideNumber":
        return this.canvas.insertSlideNumber ? this.canvas.insertSlideNumber(args) : false;

      case "slides.insert.symbol":
        return this.canvas.insertSymbol ? await this.canvas.insertSymbol(args) : false;

      case "slides.insert.wordart":
        return this.canvas.insertWordArt ? await this.canvas.insertWordArt(args) : false;

      case "common.edit.cut":
        if (typeof document !== "undefined") document.execCommand("cut", false, null);
        return true;

      case "common.edit.copy":
        if (typeof document !== "undefined") document.execCommand("copy", false, null);
        return true;

      case "common.edit.paste":
        if (typeof document !== "undefined") document.execCommand("paste", false, null);
        return true;

      case "common.edit.pastePlain":
        if (typeof document !== "undefined") document.execCommand("paste", false, null);
        return true;

      case "common.edit.selectAll":
        return this.canvas.selectAllForContext ? this.canvas.selectAllForContext() : false;

      case "common.edit.find":
        return this._showFindReplaceDialog(false);

      case "common.edit.replace":
        return this._showFindReplaceDialog(true);

      case "slides.edit.selectAll":
        return this.canvas.selectAllShapes ? this.canvas.selectAllShapes() : false;

      case "slides.edit.selectObjects":
        return this.canvas.selectDrawingObjects ? this.canvas.selectDrawingObjects() : false;

      case "common.edit.undo":
        return this.canvas.undo ? this.canvas.undo() : false;

      case "common.edit.redo":
        return this.canvas.redo ? this.canvas.redo() : false;

      case "common.file.new":
        return this.newDocument();

      case "common.file.open":
        return await this.open();

      case "common.file.save":
        return await this.save();

      case "common.file.saveAs":
        return await this.saveAs();

      case "common.file.exportPdf":
        return await this.exportPdf();

      case "common.file.print":
        return this.print();

      case "common.file.close":
        return this.closeDocument();

      default:
        return false;
    }
  }
}

SlidesAdapter.resolveDisplayFont = resolveDisplayFont;
SlidesAdapter.isFontAvailable = isFontAvailable;
