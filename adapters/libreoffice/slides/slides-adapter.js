/**
 * VN Office LibreOffice Adapter — VN Slides Adapter
 * Quản lý tương tác với StarImpress (sd) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";
import { globalShortcutManager } from "../../../platform/commands/shortcut-manager.js";

export class SlidesAdapter {
  constructor(canvasController) {
    this.canvas = canvasController;
    this.isDirty = false;
    this.sourceFileName = "TrinhChieu";
    this.shell = null;
  }

  /** Gắn tham chiếu AppShell — xem chú thích trong WriterAdapter.setShell(). */
  setShell(shell) {
    this.shell = shell;
  }

  newDocument() {
    this.sourceFileName = "TrinhChieu";
    this.isDirty = false;
    if (this.canvas?.resetToBlank) {
      this.canvas.resetToBlank("BẢN TRÌNH CHIẾU MỚI");
    }
    this.shell?.resetDocumentChrome?.("Bản trình chiếu 1.pptx");
    return true;
  }

  closeDocument() {
    return this.newDocument();
  }

  attach() {
    globalUnoBridge.attachDocument(this);
    // common.edit.undo/redo dùng chung 1 handler toàn Suite qua Command Bus — mỗi app
    // (Writer/Sheet/Slides) PHẢI tự bindHandler() lại khi active, nếu không app kích hoạt
    // trước (mặc định Writer) sẽ chiếm vĩnh viễn phím Ctrl+Z/Ctrl+Y cho mọi app khác.
    // (Lỗi thật đã xảy ra: Ctrl+Z trong Slides gọi nhầm WriterAdapter.undo().)
    globalCommandBus.bindHandler("common.file.new", () => this.newDocument());
    globalCommandBus.bindHandler("common.file.close", () => this.closeDocument());
    globalCommandBus.bindHandler("common.edit.undo", () => this.canvas.undo ? this.canvas.undo() : false);
    globalCommandBus.bindHandler("common.edit.redo", () => this.canvas.redo ? this.canvas.redo() : false);
    globalCommandBus.bindHandler("common.edit.selectAll", () => {
      if (typeof document !== "undefined") {
        document.execCommand("selectAll", false, null);
        return true;
      }
      return false;
    });
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
    globalCommandBus.bindHandler("slides.review.spellCheck", (args) => {
      args = args || {};
      return this.canvas.showSpellcheckDialog ? this.canvas.showSpellcheckDialog(args) : false;
    });
    globalShortcutManager.bind("F7", "slides.review.spellCheck", "slides");
    globalShortcutManager.bind("F1", "slides.help.open", "slides");
    globalCommandBus.bindHandler("slides.edit.formatPainter", (args) => this.canvas.toggleFormatPainter ? this.canvas.toggleFormatPainter(args || {}) : false);
    globalCommandBus.bindHandler("slides.design.formatBackground", (args) => this.canvas.showFormatBackgroundDialog ? this.canvas.showFormatBackgroundDialog(args || {}) : false);
    this._bindFormatPainterRibbon();
    // Command metadata is app-local because this feature is scoped to Slides;
    // bind explicitly instead of requiring a Platform registry change.
    globalCommandBus.bindHandler("slides.insert.chart", (options) => this.canvas.insertChart ? this.canvas.insertChart(options) : false);
    globalCommandBus.bindHandler("slides.view.normal", () => this.canvas.setNormalView ? this.canvas.setNormalView() : false);
    globalCommandBus.bindHandler("slides.view.slideSorter", () => this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false);
    globalCommandBus.bindHandler("slides.notes.toggle", () => this.canvas.toggleNotes ? this.canvas.toggleNotes() : false);
    globalCommandBus.bindHandler("slides.view.reading", () => this.canvas.toggleReadingView ? this.canvas.toggleReadingView() : false);
    globalCommandBus.bindHandler("slides.view.ruler", () => this.canvas.toggleRuler ? this.canvas.toggleRuler() : false);
    globalCommandBus.bindHandler("slides.view.gridlines", () => this.canvas.toggleGridlines ? this.canvas.toggleGridlines() : false);
    globalCommandBus.bindHandler("slides.view.guides", () => this.canvas.toggleGuides ? this.canvas.toggleGuides() : false);
    globalCommandBus.bindHandler("slides.view.zoomIn", () => this.canvas.zoomIn ? this.canvas.zoomIn() : false);
    globalCommandBus.bindHandler("slides.view.zoomOut", () => this.canvas.zoomOut ? this.canvas.zoomOut() : false);
    globalCommandBus.bindHandler("slides.view.zoomReset", () => this.canvas.zoomReset ? this.canvas.zoomReset() : false);
    globalCommandBus.bindHandler("slides.view.fitToWindow", () => this.canvas.fitToWindow ? this.canvas.fitToWindow() : false);
    globalCommandBus.bindHandler("slides.view.newWindow", () => this.canvas.newWindow ? this.canvas.newWindow() : false);
    this._bindTextFormatTracking();
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
    if (node && node !== root && node.style) node.style.lineHeight = String(value);
    else if (this._savedEditable?.style) this._savedEditable.style.lineHeight = String(value);
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
        return this._applyExecCommand("removeFormat");
      case "slides.font.family":
        if (args) this._applyExecCommand("fontName", args);
        return true;
      case "slides.font.size":
        if (args) this._applyExecCommand("fontSize", args);
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
    if (/style\s*=\s*["'][^"']*(font-weight|font-style|text-decoration|color|background|font-family|font-size|text-align|line-height)/i.test(value)) return true;
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
      const face = this._attr(` ${attrs} `, "face") || attrs.match(/face\s*=\s*["']([^"']+)["']/i)?.[1];
      const color = this._attr(` ${attrs} `, "color") || attrs.match(/color\s*=\s*["']([^"']+)["']/i)?.[1];
      const size = this._attr(` ${attrs} `, "size") || attrs.match(/size\s*=\s*["']?(\d+)/i)?.[1];
      if (face) out.family = face.split(",")[0].replace(/['"]/g, "").trim();
      if (color) out.color = this._cssColorToHex(color);
      if (size) out.size = this._htmlFontSizeToPt(size);
    }
    const style = attrs.match(/style\s*=\s*["']([^"']*)["']/i)?.[1] || "";
    for (const part of style.split(";")) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      const key = part.slice(0, colon).trim().toLowerCase();
      const value = part.slice(colon + 1).trim();
      if (!key || !value) continue;
      if (key === "font-weight" && /^(bold|[7-9]00)$/i.test(value)) out.bold = true;
      if (key === "font-style" && /italic/i.test(value)) out.italic = true;
      if (key === "text-decoration" && /underline/i.test(value)) out.underline = true;
      if (key === "text-decoration" && /line-through/i.test(value)) out.strike = true;
      if (key === "color") out.color = this._cssColorToHex(value);
      if (key === "background-color" || key === "background") out.bg = this._cssColorToHex(value);
      if (key === "font-family") out.family = value.replace(/['"]/g, "").split(",")[0].trim();
      if (key === "font-size") out.size = /pt|px|em|%/i.test(value) ? value : `${value}pt`;
      if (key === "text-align") out.align = value;
      if (key === "line-height") out.lineHeight = value;
      if (key === "margin-left") out.indent = value;
    }
    const align = attrs.match(/\balign\s*=\s*["']([^"']+)["']/i)?.[1];
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

  _htmlToOdfXml(html, ctx) {
    if (!this._htmlHasFormat(html)) return this._textParagraphsXml(this._plainFromHtml(html));
    const blocks = [];
    let current = { texts: [], align: null, lineHeight: null, indent: null, list: null };
    const formatStack = [{}];
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
    if (!blocks.length) return this._textParagraphsXml(this._plainFromHtml(html));

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

  _richOrPlainXml(plain, html, ctx) {
    if (html && this._htmlHasFormat(html) && ctx) return this._htmlToOdfXml(html, ctx);
    return this._textParagraphsXml(plain);
  }

  _serializeRichTextStyles(ctx) {
    if (!ctx) return "";
    let xml = "";
    for (const style of ctx.paraStyles) {
      const props = style.props || {};
      const attrs = [];
      if (props.align) attrs.push(`fo:text-align="${this._escapeXml(props.align)}"`);
      if (props.lineHeight) attrs.push(`fo:line-height="${this._escapeXml(props.lineHeight)}"`);
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
        text.set(name, {
          bold: /fo:font-weight=["']bold["']/i.test(inner) || /fo:font-weight=["'][7-9]00["']/i.test(inner),
          italic: /fo:font-style=["']italic["']/i.test(inner),
          underline: /style:text-underline-style=["'](?!none)[^"']+["']/i.test(inner),
          strike: /style:text-line-through-style=["'](?!none)[^"']+["']/i.test(inner),
          color: inner.match(/fo:color=["']([^"']+)["']/i)?.[1],
          bg: inner.match(/fo:background-color=["']([^"']+)["']/i)?.[1],
          family: inner.match(/fo:font-family=["']([^"']+)["']/i)?.[1] || inner.match(/style:font-name=["']([^"']+)["']/i)?.[1],
          size: inner.match(/fo:font-size=["']([^"']+)["']/i)?.[1]
        });
      } else if (family === "paragraph") {
        para.set(name, {
          align: inner.match(/fo:text-align=["']([^"']+)["']/i)?.[1],
          lineHeight: inner.match(/fo:line-height=["']([^"']+)["']/i)?.[1],
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
    let html = String(inner || "").replace(/<text:line-break\b[^>]*\/?>/gi, "<br>");
    html = html.replace(/<text:span\b([^>]*)>([\s\S]*?)<\/text:span>/gi, (_, attrs, content) => {
      const name = attrs.match(/text:style-name=["']([^"']+)["']/i)?.[1];
      const fmt = maps?.text?.get(name) || {};
      let wrapped = this._escapeXml(this._unescapeXml(String(content).replace(/<[^>]+>/g, "")));
      if (fmt.bold) wrapped = `<b>${wrapped}</b>`;
      if (fmt.italic) wrapped = `<i>${wrapped}</i>`;
      if (fmt.underline) wrapped = `<u>${wrapped}</u>`;
      if (fmt.strike) wrapped = `<s>${wrapped}</s>`;
      const spanStyles = [];
      if (fmt.color) spanStyles.push(`color:${fmt.color}`);
      if (fmt.bg) spanStyles.push(`background-color:${fmt.bg}`);
      if (fmt.family) spanStyles.push(`font-family:${fmt.family}`);
      if (fmt.size) spanStyles.push(`font-size:${fmt.size}`);
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
        if (para.lineHeight) styles.push(`line-height:${para.lineHeight}`);
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

  _odfLengthToPx(raw) {
    const match = String(raw || "").trim().match(/^(-?[\d.]+)\s*(cm|mm|in|pt|px)?$/i);
    if (!match) return 0;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return 0;
    const unit = (match[2] || "cm").toLowerCase();
    const pxPerUnit = { cm: 37.795275591, mm: 3.7795275591, in: 96, pt: 96 / 72, px: 1 };
    return Math.round(value * (pxPerUnit[unit] || pxPerUnit.cm));
  }

  _pxToOdf(px) {
    const value = Number(px);
    if (!Number.isFinite(value)) return "0cm";
    return `${Math.round((value / 37.795275591) * 1000) / 1000}cm`;
  }

  _attr(attrs, name) {
    return String(attrs || "").match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] || "";
  }

  _styleKey(color) {
    return String(color || "3b82f6").replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "3b82f6";
  }

  _isTransparentFill(shape) {
    const type = shape?.type;
    return type === "textbox" || type === "text" || type === "table" || type === "wordart"
      || !shape?.color || shape.color === "transparent";
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
    if (shape.type === "image" || shape.type === "video" || shape.type === "audio") return "grImage";
    if (this._isTransparentFill(shape)) return "grNone";
    return `gr${this._styleKey(shape.color)}`;
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
    return !!(bg && (bg.type === "solid" || bg.type === "gradient" || (bg.type === "picture" && bg.picture)));
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
    return `
            <anim:par smil:begin="indefinite">
              <anim:par smil:begin="${preset.begin}" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="${this._escapeXml(preset.presetId)}"${sub}>${animates}
              </anim:par>
            </anim:par>`;
  }

  _serializeShapeAnimation(shape, drawId) {
    return this._serializeEntranceAnimation(shape?.animation, drawId);
  }

  _serializePageAnimXml(pageXmlId, slide, idMap, placeholderIds) {
    const smil = this._mapVnTransitionToSmil(slide?.transition);
    const placeholders = placeholderIds || {};
    const shapeIds = idMap || new Map();
    const effectXml = [
      this._serializeEntranceAnimation(slide?.titleAnimation, placeholders.title),
      this._serializeEntranceAnimation(slide?.bodyAnimation, placeholders.body),
      this._serializeEntranceAnimation(slide?.body2Animation, placeholders.body2),
      ...((slide?.shapes || []).map((shape) => this._serializeShapeAnimation(shape, shapeIds.get(String(shape.id)))))
    ].filter(Boolean).join("");
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
      byTarget.set(target, { type: vnType, duration, delay });
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
    return `draw:id="${this._escapeXml(drawId)}" draw:name="${name}" draw:style-name="${styleName}" svg:x="${this._pxToOdf(shape.x)}" svg:y="${this._pxToOdf(shape.y)}" svg:width="${this._pxToOdf(shape.w)}" svg:height="${this._pxToOdf(shape.h)}"${fill}`;
  }

  _serializeGraphicStyles(slides) {
    const fills = new Map();
    let needsConnector = false;
    let needsMedia = false;
    for (const slide of slides) {
      for (const shape of slide.shapes || []) {
        if (shape.type === "connector") {
          needsConnector = true;
          continue;
        }
        if (shape.type === "image" || shape.type === "video" || shape.type === "audio") {
          needsMedia = true;
          continue;
        }
        if (this._isTransparentFill(shape)) {
          fills.set("none", null);
        } else {
          fills.set(this._styleKey(shape.color), shape.color);
        }
      }
    }

    let xml = `
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm" style:print-orientation="landscape"/>
    </style:page-layout>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true"/>
    </style:style>`;

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

    xml += `
    <style:style style:name="prTitle" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>
    <style:style style:name="prBody" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
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

    if (type === "image") {
      const parts = this._dataUrlParts(shape.src);
      const mime = this._escapeXml(parts?.mime || "image/png");
      const href = parts ? "" : this._escapeXml(shape.src || "");
      return `
        <draw:frame ${geom}>
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
      return `
        <draw:frame ${geom}>
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
      if (!/style:family=["']graphic["']/i.test(match[1])) continue;
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const fill = match[2].match(/draw:fill-color=["']([^"']+)["']/i)?.[1];
      const fillKind = match[2].match(/draw:fill=["']([^"']+)["']/i)?.[1];
      const stroke = match[2].match(/svg:stroke-color=["']([^"']+)["']/i)?.[1];
      const markerEnd = match[2].match(/draw:marker-end=["']([^"']+)["']/i)?.[1];
      styles.set(name, {
        fill: fillKind === "none" ? "transparent" : (fill || null),
        stroke: stroke || null,
        markerEnd: markerEnd || null
      });
    }
    return styles;
  }

  _paragraphsFromXml(xml) {
    const paragraphs = [];
    const regex = /<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const clean = this._unescapeXml(match[1].replace(/<[^>]+>/g, "")).trim();
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
    let type = "rect";
    if (/ellipse|circle/i.test(geomType) || tagName === "ellipse" || tagName === "circle") type = "ellipse";
    else if (/arrow/i.test(geomType)) type = "arrow";
    const styleName = get("draw:style-name");
    const style = graphicStyles.get(styleName) || {};
    const color = get("draw:fill-color") || style.fill || "#3b82f6";
    return {
      id: this._restoreShapeId(attrs),
      type,
      x: this._odfLengthToPx(get("svg:x")),
      y: this._odfLengthToPx(get("svg:y")),
      w: this._odfLengthToPx(get("svg:width")) || 200,
      h: this._odfLengthToPx(get("svg:height")) || 120,
      color,
      text: this._paragraphsFromXml(inner).join("\n"),
      textHtml: this._shapeHtmlFromXml(inner),
      animation: this._noneAnimation()
    };
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
    const style = graphicStyles.get(get("draw:style-name")) || {};
    const base = {
      id: this._restoreShapeId(attrs),
      x: this._odfLengthToPx(get("svg:x")),
      y: this._odfLengthToPx(get("svg:y")),
      w: this._odfLengthToPx(get("svg:width")) || 200,
      h: this._odfLengthToPx(get("svg:height")) || 120,
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
      return { ...base, type: "image", src: this._parseEmbeddedSrc(inner, "image/png"), color: "transparent" };
    }

    const hasId = get("draw:id") || get("xml:id") || get("draw:name");
    const wordart = this._parseWordArtAttrs(attrs);
    if (wordart) {
      return {
        ...base,
        ...wordart,
        text: this._paragraphsFromXml(inner).join("\n")
      };
    }
    if (/<draw:text-box\b/i.test(inner) && hasId) {
      return {
        ...base,
        type: "textbox",
        color: get("draw:fill-color") || style.fill || "transparent",
        text: this._paragraphsFromXml(inner).join("\n"),
        textHtml: this._shapeHtmlFromXml(inner)
      };
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
      if (this._isLayoutPresentationClass(cls)) continue;
      const shape = this._parseFrameShape(match[1], match[2], graphicStyles);
      if (!shape) continue;
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
    const match = String(transform || "").match(/translate\(\s*([^,)\s]+)\s*[, ]\s*([^,)\s]+)\s*\)/i);
    if (match) {
      return { x: this._odfLengthToPx(match[1]), y: this._odfLengthToPx(match[2]) };
    }
    return {
      x: this._odfLengthToPx(this._attr(attrs, "svg:x")),
      y: this._odfLengthToPx(this._attr(attrs, "svg:y"))
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
    rest = this._extractTaggedShapes(rest, ["rect", "ellipse", "circle", "custom-shape", "polygon"], (tagName, attrs, inner) => {
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
    return list.map((comment, index) => {
      const name = this._escapeXml(String(comment.id || `comment-${index + 1}`));
      const author = this._escapeXml(comment.author || "");
      const date = this._escapeXml(this._odfAnnotationDate(comment.timestamp));
      const y = Math.round((0.4 + index * 3.2) * 1000) / 1000;
      return `
        <office:annotation draw:name="${name}" svg:x="22cm" svg:y="${y}cm" svg:width="5cm" svg:height="3cm">
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

  /**
   * Chuyển đổi toàn bộ slide hiện tại thành định dạng OpenDocument Flat XML (FODP).
   * LibreOffice Impress có thể chuyển đổi FODP trực tiếp sang PPTX, ODP hoặc PDF.
   */
  serializeToFodp() {
    const slides = (this.canvas && this.canvas.slides) || [];
    const sections = (this.canvas && this.canvas.sections) || [];
    const richCtx = this._newRichTextContext();
    let pagesXml = "";

    slides.forEach((slide, idx) => {
      const pageName = `page${idx + 1}`;
      const titleXml = this._richOrPlainXml(slide.title || `Trang chiếu ${idx + 1}`, slide.titleHtml, richCtx);
      const layoutType = slide.layoutType || "title-content";

      const notesXml = slide.notes ? `
        <presentation:notes>
          <draw:frame presentation:class="notes" svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="15cm">
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
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="2cm" svg:y="6cm" svg:width="24cm" svg:height="6cm">
          <draw:text-box>
            ${titleXml}
          </draw:text-box>
        </draw:frame>`;
      } else if (layoutType === "two-content") {
        const bodyParasXml = this._richOrPlainXml(slide.body, slide.bodyHtml, richCtx);
        const body2ParasXml = this._richOrPlainXml(slide.body2, slide.body2Html, richCtx);

        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            ${titleXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${bodyIds} svg:x="2cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${body2Ids} svg:x="14.5cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${body2ParasXml}
          </draw:text-box>
        </draw:frame>`;
      } else {
        const bodyParasXml = this._richOrPlainXml(slide.body, slide.bodyHtml, richCtx);

        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            ${titleXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${bodyIds} svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
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
    <style:master-page style:name="Standard" style:page-layout-name="PM1" draw:style-name="dp1"/>
  </office:master-styles>
  <office:body>
    <office:presentation>${pagesXml}
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
      pageContent = this._extractTaggedShapes(pageContent, ["rect", "ellipse", "circle", "custom-shape", "polygon"], (tagName, attrs, inner) => {
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

      const titleParas = this._frameParagraphsByClass(pageContent, "title");
      const subtitleParas = this._frameParagraphsByClass(pageContent, "subtitle");
      const outlineParas = this._frameParagraphsByClass(pageContent, "outline");
      const outlineBlocks = this._frameBlocksByClass(pageContent, "outline");
      const hasPlaceholderClasses = titleParas.length > 0 || subtitleParas.length > 0 || outlineParas.length > 0;
      // PPTX hop drops presentation:layout; restore two-content / title-only from remaining placeholders.
      if (pageLayout !== "blank") {
        if (outlineBlocks.length > 1) pageLayout = "two-content";
        else if (!pageLayout && hasPlaceholderClasses && titleParas.length && outlineBlocks.length === 0 && subtitleParas.length === 0) {
          pageLayout = "title-only";
        }
      }
      if (!pageLayout) pageLayout = "title-content";

      let title = `Trang chiếu ${idx}`;
      let body = "";
      let body2 = undefined;

      if (pageLayout === "blank") {
        title = "";
        body = "";
      } else if (hasPlaceholderClasses) {
        title = titleParas.filter(Boolean).join(" ");
        if (pageLayout === "two-content") {
          body = outlineBlocks[0] || "";
          body2 = outlineBlocks.length > 1 ? outlineBlocks.slice(1).join("\n") : undefined;
        } else {
          body = subtitleParas.length ? subtitleParas.join("\n") : outlineParas.join("\n");
        }
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

      const titleHtmls = this._frameHtmlByClass(pageContent, "title", this._richMaps);
      const outlineHtmls = this._frameHtmlByClass(pageContent, "outline", this._richMaps);
      const subtitleHtmls = this._frameHtmlByClass(pageContent, "subtitle", this._richMaps);
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
      const background = this._backgroundFromPageStyle(fromPageStyle, backgroundResources);
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
        ...(pageTransition ? { transition: pageTransition } : {})
      };
      this._applyPlaceholderAnimations(
        parsedSlide,
        this._collectPlaceholderTargets(originalPageXml),
        animByTarget
      );
      parsedSlides.push(parsedSlide);
    }

    Object.defineProperty(parsedSlides, "sections", { value: parsedSections, enumerable: false });
    return parsedSlides;
  }

  /**
   * Nạp danh sách slide từ nội dung FODP vào Canvas hiện tại.
   */
  loadFromFodp(fodpText) {
    if (!this.canvas) return;
    const newSlides = this.parseFodp(fodpText);
    if (newSlides && newSlides.length > 0) {
      this.canvas.slides = newSlides;
      this.canvas.sections = [...(newSlides.sections || [])];
      if (typeof this.canvas.selectSlide === "function") {
        this.canvas.selectSlide(0);
      }
    }
  }

  /**
   * Lưu bản trình chiếu thành tệp PPTX thật trên đĩa (qua LibreOffice headless engine).
   */
  async save() {
    const fodpContent = this.serializeToFodp();
    const result = await globalUnoBridge.saveRealFile("slides", fodpContent, "pptx", this.sourceFileName);
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
   * Mở một tệp PPTX/ODP thật từ đĩa, nạp các trang chiếu vào Canvas.
   */
  async open() {
    const result = await globalUnoBridge.openRealFile("slides");
    if (result.status === "ok") {
      this.loadFromFodp(result.content);
      this.sourceFileName = (result.fileName || "TrinhChieu").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
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
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
    return true;
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
        if (this.canvas.bodyEl) {
          this.canvas.bodyEl.innerText += "\n• Khung văn bản mới bổ sung";
          const currentSlide = this.canvas.slides?.[this.canvas.currentSlideIndex];
          if (currentSlide) {
            currentSlide.body = this.canvas.bodyEl.innerText;
          }
        }
        this.canvas._renderThumbnails?.();
        return true;

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
        if (typeof document !== "undefined") document.execCommand("selectAll", false, null);
        return true;

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
