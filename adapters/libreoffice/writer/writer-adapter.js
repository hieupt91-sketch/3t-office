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
    /** @type {Array<{id:string, anchorText:string, content:string, createdAt:string}>} */
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
    this._bindTrackChanges();
    this._renderCommentsPanel();
    this._updateTrackChangesCommandState();
    globalCommandBus.bindHandler("writer.file.printPreview", () => this.openPrintPreview());

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

    if (!this._lastSnapshot) {
      this._lastSnapshot = this._createSnapshot("Initial State");
    }
    this._updateUndoRedoUI();
  }

  _bindTrackChanges() {
    if (!this.bodyDom?.addEventListener || this._trackChangesBeforeInputHandler) return;
    this._trackChangesBeforeInputHandler = (event) => this._handleTrackChangesBeforeInput(event);
    this.bodyDom.addEventListener("beforeinput", this._trackChangesBeforeInputHandler);
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
        this._referenceClickHandler?.(event);
      };
      this.bodyDom.addEventListener("click", this._commentAnchorClickHandler);
      this._commentAnchorKeyHandler = (event) => {
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

  async _showPageSetupDialog(focusField = "size") {
    if (typeof document === "undefined" || !document.body) return null;

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";
      const sizeOptions = Object.entries(PAGE_SIZES_MM)
        .map(([key, v]) => `<option value="${key}" ${key === this.pageSetup.size ? "selected" : ""}>${v.label}</option>`)
        .join("");

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 420px;" role="dialog" aria-modal="true">
          <div class="vno-dialog-header">
            <span>Thiết lập trang</span>
            <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <label style="font-size:13px;font-weight:500;">Khổ giấy
              <select class="vno-select" id="vno-pagesetup-size" style="width:100%;margin-top:4px;">${sizeOptions}</select>
            </label>
            <label style="font-size:13px;font-weight:500;">Hướng giấy
              <select class="vno-select" id="vno-pagesetup-orientation" style="width:100%;margin-top:4px;">
                <option value="portrait" ${this.pageSetup.orientation === "portrait" ? "selected" : ""}>Dọc (Portrait)</option>
                <option value="landscape" ${this.pageSetup.orientation === "landscape" ? "selected" : ""}>Ngang (Landscape)</option>
              </select>
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${["top", "bottom", "left", "right"].map(side => {
                const sideLabel = { top: "Lề trên", bottom: "Lề dưới", left: "Lề trái", right: "Lề phải" }[side];
                return `<label style="font-size:12px;">${sideLabel} (mm)
                  <input type="number" min="0" max="100" class="vno-dialog-input" id="vno-pagesetup-margin-${side}"
                    value="${this.pageSetup.margins[side]}"
                    style="width:100%;margin-top:4px;box-sizing:border-box;padding:6px 10px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;" />
                </label>`;
              }).join("")}
            </div>
          </div>
          <div class="vno-dialog-footer">
            <button class="vno-btn vno-dialog-cancel-btn">Hủy bỏ</button>
            <button class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.querySelector(`#vno-pagesetup-${focusField === "orientation" ? "orientation" : "size"}`)?.focus();

      const finish = (result) => {
        document.removeEventListener("keydown", onKeyDown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
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
      case "writer.text.bold":
        document.execCommand("bold", false, null);
        dispatchResult = document.queryCommandState("bold");
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
        if (args) document.execCommand("foreColor", false, args);
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
        await this._insertHyperlink();
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

      case "writer.style.gallery":
        return this.toggleStyleGallery(args);

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

      case "writer.reference.tocInsert":
        return this.insertTableOfContents();

      case "writer.reference.tocUpdate":
        return this.updateTableOfContents();

      case "writer.reference.footnoteInsert":
        return this.insertFootnote(args);

      case "writer.reference.endnoteInsert":
        return this.insertEndnote(args);

      case "writer.mailMerge.open":
        return this.openMailMergeDataSourceDialog(args);

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
        await showAlertDialog({
          title: "Chưa chọn văn bản",
          message: "Hãy bôi đen đoạn văn bản trong nội dung tài liệu trước khi thêm ghi chú.",
          type: "warning"
        });
      }
      return false;
    }

    const content = args && Object.prototype.hasOwnProperty.call(args, "content")
      ? args.content
      : await showPromptDialog({
          title: "Thêm ghi chú",
          message: `Ghi chú cho “${anchorText.slice(0, 80)}${anchorText.length > 80 ? "…" : ""}”`,
          placeholder: "Nhập nội dung ghi chú...",
          confirmText: "Thêm ghi chú"
        });

    if (content === null || !String(content).trim()) return false;

    const id = `writer-comment-${Date.now()}-${++this._commentSequence}`;
    const mark = document.createElement("mark");
    mark.className = "vno-comment-anchor";
    mark.dataset.commentId = id;
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("role", "button");
    mark.setAttribute("aria-label", `Mở ghi chú cho: ${anchorText.slice(0, 80)}`);

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
      const time = document.createElement("time");
      time.dateTime = comment.createdAt;
      time.textContent = new Date(comment.createdAt).toLocaleString("vi-VN");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "vno-comment-delete";
      remove.dataset.commentDelete = comment.id;
      remove.setAttribute("aria-label", `Xóa ghi chú cho ${comment.anchorText}`);
      remove.textContent = "Xóa";
      meta.append(time, remove);
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

      globalCommandBus.setState("common.edit.formatPainter", { checked: true });
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
    globalCommandBus.setState("common.edit.formatPainter", { checked: false });
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

  async _insertHyperlink() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const url = await showPromptDialog({
      title: "Chèn Liên Kết (Hyperlink)",
      message: "Nhập địa chỉ liên kết (URL):",
      defaultValue: "https://",
      placeholder: "https://example.com"
    });
    if (url && url !== "https://") {
      this.editorDom.focus();
      document.execCommand("createLink", false, url);
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

    const fullHtml = `${watermarkHtml}${headerHtml}${bodyExportHtml}${footerHtml}`;
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
      .replace(/<div\b[^>]*class=["'][^"']*\bvno-page-watermark\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*class=["'][^"']*\bvno-page-border-frame\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*data-vno-watermark=["']true["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div\b[^>]*data-vno-page-border=["']true["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/\s*\bvno-merge-preview\b/gi, "");
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
      const raw = result.content || "";
      const headerMatch = raw.match(/<div\s+title=["']header["'][^>]*>([\s\S]*?)<\/div>/i);
      const footerMatch = raw.match(/<div\s+title=["']footer["'][^>]*>([\s\S]*?)<\/div>/i);

      let bodyContent = raw;
      let headerContent = "";
      let footerContent = "";

      if (headerMatch) {
        headerContent = headerMatch[1].trim();
        bodyContent = bodyContent.replace(headerMatch[0], "");
      }
      if (footerMatch) {
        footerContent = footerMatch[1].trim();
        bodyContent = bodyContent.replace(footerMatch[0], "");
      }

      if (this.headerDom && this.bodyDom && this.footerDom) {
        this.headerDom.innerHTML = headerContent;
        this.bodyDom.innerHTML = bodyContent;
        this.footerDom.innerHTML = footerContent;
      } else if (this.editorDom) {
        this.editorDom.innerHTML = raw;
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
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const temp = document.createElement("div");
      temp.innerHTML = bodyHtml;
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
    const headerReservedPx = hasHeader ? 46 : 0;
    const footerReservedPx = hasFooter ? 48 : 0;
    const availableBodyHeightPx = Math.max(150, dim.printableHeightPx - headerReservedPx - footerReservedPx);

    const notesData = this._extractNotesForPreview(rawBody);
    const bodyForPagination = notesData.cleanHtml;

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

    const overlay = document.createElement("div");
    overlay.className = "vno-print-preview-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Xem trước khi in");
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
    toolbar.innerHTML = `
      <div class="vno-print-preview-toolbar-left">
        <button class="vno-btn vno-btn-primary vno-print-preview-btn-print" title="In tài liệu (Ctrl+P)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" style="margin-right:6px;"><rect x="6" y="2" width="12" height="6" rx="1" fill="#E2E8F0" stroke="#475569" stroke-width="1.2"/><rect x="3" y="7" width="18" height="10" rx="2" fill="#0F4C81"/><rect x="6" y="13" width="12" height="8" rx="1" fill="#FFFFFF" stroke="#475569" stroke-width="1.2"/><line x1="8" y1="16" x2="16" y2="16" stroke="#94A3B8" stroke-width="1.2"/><line x1="8" y1="18" x2="14" y2="18" stroke="#94A3B8" stroke-width="1.2"/><circle cx="18" cy="10" r="1" fill="#10B981"/></svg>
          <span>In tài liệu</span>
        </button>
        <div class="vno-print-preview-divider"></div>
        <div class="vno-print-preview-badge">
          <span class="vno-print-preview-paper-info">
            Khổ: <strong>${dim.sizeLabel}</strong> · <strong>${dim.orientationLabel}</strong> · Lề: T${dim.margins.top} D${dim.margins.bottom} T${dim.margins.left} P${dim.margins.right} mm
          </span>
        </div>
      </div>

      <div class="vno-print-preview-toolbar-center">
        <button class="vno-btn vno-print-preview-nav-prev" title="Trang trước (Mũi tên trái / PageUp)" ${totalPages <= 1 ? "disabled" : ""}>
          ◀ Trang trước
        </button>
        <div class="vno-print-preview-page-indicator">
          <span>Trang </span>
          <input type="number" min="1" max="${totalPages}" value="1" class="vno-print-preview-page-input" aria-label="Số trang" />
          <span> / <span class="vno-print-preview-total-pages">${totalPages}</span></span>
        </div>
        <button class="vno-btn vno-print-preview-nav-next" title="Trang sau (Mũi tên phải / PageDown)" ${totalPages <= 1 ? "disabled" : ""}>
          Trang sau ▶
        </button>
      </div>

      <div class="vno-print-preview-toolbar-right">
        <button class="vno-btn vno-print-preview-zoom-out" title="Thu nhỏ">−</button>
        <span class="vno-print-preview-zoom-level">100%</span>
        <button class="vno-btn vno-print-preview-zoom-in" title="Phóng to">+</button>
        <button class="vno-btn vno-print-preview-zoom-fit" title="Vừa chiều cao">Vừa trang</button>
        <div class="vno-print-preview-divider"></div>
        <button class="vno-btn vno-btn-icon-only vno-print-preview-close-btn" title="Đóng xem trước (Esc)">&times;</button>
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
    if (this.editorDom?.focus) {
      this.editorDom.focus();
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
      bodyHtml: this.bodyDom ? this.bodyDom.innerHTML : (this.editorDom ? this.editorDom.innerHTML : ""),
      headerHtml: this.headerDom ? this.headerDom.innerHTML : null,
      footerHtml: this.footerDom ? this.footerDom.innerHTML : null,
      pageSetup: this.pageSetup ? JSON.parse(JSON.stringify(this.pageSetup)) : null,
      comments: this.comments ? JSON.parse(JSON.stringify(this.comments)) : [],
      watermark: this.watermark ? JSON.parse(JSON.stringify(this.watermark)) : null,
      pageBorder: this.pageBorder ? JSON.parse(JSON.stringify(this.pageBorder)) : null,
      columns: this.columns ? JSON.parse(JSON.stringify(this.columns)) : { count: 1, gap: 10, rule: false },
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

    if (!this._undoKeyHandler && typeof target.addEventListener === "function") {
      this._undoKeyHandler = (event) => {
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
        if (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode)) {
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

    if (headings.length === 0) {
      entriesHtml = `<div class="vno-toc-empty">Chưa có tiêu đề nào trong tài liệu. Hãy định dạng các đoạn văn bằng Kiểu dáng Heading 1, 2 hoặc 3 rồi cập nhật lại mục lục.</div>`;
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

    if (headings.length === 0) {
      entriesHtml = `<div class="vno-toc-empty">Chưa có tiêu đề nào trong tài liệu. Hãy định dạng các đoạn văn bằng Kiểu dáng Heading 1, 2 hoặc 3 rồi cập nhật lại mục lục.</div>`;
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

    const html = `
      <div data-vno-toc="true" class="vno-toc-block" contenteditable="false">
        <div class="vno-toc-header">
          <span class="vno-toc-title">MỤC LỤC</span>
          <div class="vno-toc-actions">
            <button type="button" class="vno-toc-btn vno-toc-btn-update" title="Cập nhật mục lục">🔄 Cập nhật</button>
            <button type="button" class="vno-toc-btn vno-toc-btn-delete" title="Xóa mục lục">&times;</button>
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
    if (typeof sup.setAttribute === "function") {
      sup.setAttribute("data-vno-footnote-ref", id);
      sup.setAttribute("class", "vno-footnote-ref");
      sup.setAttribute("contenteditable", "false");
      sup.setAttribute("title", "Nhấp để chuyển đến chú thích");
      sup.textContent = "1";
    }

    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode)) {
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
      const existingContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-footnotes="true"]') : null;
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
    const itemHtml = `
      <div class="vno-footnote-item" data-vno-footnote-id="${id}">
        <span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">1</span>
        <span class="vno-note-text" contenteditable="true" data-placeholder="Nhập nội dung chú thích...">${initialText}</span>
        <button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button>
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
    if (typeof sup.setAttribute === "function") {
      sup.setAttribute("data-vno-endnote-ref", id);
      sup.setAttribute("class", "vno-endnote-ref");
      sup.setAttribute("contenteditable", "false");
      sup.setAttribute("title", "Nhấp để chuyển đến chú thích cuối");
      sup.textContent = "i";
    }

    let inserted = false;
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        if (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode)) {
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
      const existingContainer = this.bodyDom.querySelector ? this.bodyDom.querySelector('[data-vno-endnotes="true"]') : null;
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
      const containerHtml = `
        <div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false">
          <div class="vno-notes-separator"></div>
          <div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div>
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
    const itemHtml = `
      <div class="vno-endnote-item" data-vno-endnote-id="${id}">
        <span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">i</span>
        <span class="vno-note-text" contenteditable="true" data-placeholder="Nhập nội dung chú thích cuối...">${initialText}</span>
        <button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button>
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
    if (options.csv !== undefined) {
      return this.setMailMergeData(options.csv);
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
          showPromptDialog({
            title: "Chèn trường trộn thư",
            message: "Chưa có nguồn dữ liệu. Nhập tên trường cần chèn:",
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
        if (commonNode === this.bodyDom || this.bodyDom.contains?.(commonNode)) {
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
      if (typeof this.bodyDom.appendChild === "function") {
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
        showAlertDialog({
          title: "Xem trước trộn thư",
          message: "Chưa có nguồn dữ liệu trộn thư. Vui lòng mở 'Nguồn dữ liệu' để dán bảng CSV trước.",
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

    if (records.length === 0) {
      if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
        showAlertDialog({
          title: "Hoàn tất trộn thư",
          message: "Chưa có nguồn dữ liệu trộn thư để tạo tài liệu. Vui lòng mở 'Nguồn dữ liệu' để dán bảng CSV.",
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
          title: "Hoàn tất trộn thư",
          message: "Tài liệu hiện tại chưa chứa trường trộn thư nào. Hãy dùng lệnh 'Chèn trường' để chèn ít nhất một trường trộn.",
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
      showAlertDialog({
        title: "Hoàn tất trộn thư",
        message: `Đã hoàn tất trộn thư thành công ${records.length} bản ghi vào tài liệu. Bạn có thể xem trước khi in hoặc xuất tệp.`,
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

