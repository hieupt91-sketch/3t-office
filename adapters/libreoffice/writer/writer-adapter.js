/**
 * VN Office LibreOffice Adapter — VN Writer Adapter
 * Quản lý tương tác với StarWriter (sw) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showPromptDialog, showFindReplaceDialog, showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";

// Kích thước khổ giấy chuẩn (mm, khổ dọc — hoán đổi W/H khi ngang)
const PAGE_SIZES_MM = {
  a4: { label: "A4 (210 × 297 mm)", w: 210, h: 297 },
  letter: { label: "Letter (216 × 279 mm)", w: 216, h: 279 },
  legal: { label: "Legal (216 × 356 mm)", w: 216, h: 356 }
};

// Lề mặc định theo Nghị định 30/2020/NĐ-CP: Trên 20mm, Dưới 20mm, Trái 30mm, Phải 15mm
const DEFAULT_MARGINS_MM = { top: 20, bottom: 20, left: 30, right: 15 };
const MM_TO_PX = 3.7795275591; // 96dpi

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
    this.printPreviewOverlay = null;
    this.currentPreviewPage = 1;
    this.previewTotalPages = 1;
    this.previewZoom = 1.0;
    this._previewKeyHandler = null;
    this.trackChangesEnabled = false;
    this._trackChangesBeforeInputHandler = null;
    this._initZones();
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
    globalCommandBus.bindHandler("writer.file.printPreview", () => this.openPrintPreview());
    this._updateTrackChangesCommandState();
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
          this.focusComment(anchor.dataset.commentId);
        }
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
    if (!this.editorDom) return;
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
    return `@page { size: ${widthMm}mm ${heightMm}mm; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }`;
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

  async _openPageSetup(focusField) {
    const result = await this._showPageSetupDialog(focusField);
    if (!result) return false;
    this.pageSetup = result;
    this._applyPageSetup();
    this.isDirty = true;
    return true;
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

    this.editorDom.focus();

    switch (vnCmdId) {
      case "writer.text.bold":
        document.execCommand("bold", false, null);
        return document.queryCommandState("bold");

      case "writer.text.italic":
        document.execCommand("italic", false, null);
        return document.queryCommandState("italic");

      case "writer.text.underline":
        document.execCommand("underline", false, null);
        return document.queryCommandState("underline");

      case "writer.text.strike":
        document.execCommand("strikeThrough", false, null);
        return document.queryCommandState("strikeThrough");

      case "writer.text.subscript":
        document.execCommand("subscript", false, null);
        return document.queryCommandState("subscript");

      case "writer.text.superscript":
        document.execCommand("superscript", false, null);
        return document.queryCommandState("superscript");

      case "writer.font.grow":
        this._adjustFontSize(1);
        return true;

      case "writer.font.shrink":
        this._adjustFontSize(-1);
        return true;

      case "writer.text.clearFormat":
        document.execCommand("removeFormat", false, null);
        return true;

      case "writer.para.alignLeft":
        document.execCommand("justifyLeft", false, null);
        return true;

      case "writer.para.alignCenter":
        document.execCommand("justifyCenter", false, null);
        return true;

      case "writer.para.alignRight":
        document.execCommand("justifyRight", false, null);
        return true;

      case "writer.para.justify":
        document.execCommand("justifyFull", false, null);
        return true;

      case "writer.para.spacing1":
        this._setLineHeight("1.0");
        return true;

      case "writer.para.spacing15":
        this._setLineHeight("1.5");
        return true;

      case "writer.para.spacing2":
        this._setLineHeight("2.0");
        return true;

      case "writer.list.bullet":
        document.execCommand("insertUnorderedList", false, null);
        return true;

      case "writer.list.numbered":
        document.execCommand("insertOrderedList", false, null);
        return true;

      case "writer.para.indentInc":
        document.execCommand("indent", false, null);
        return true;

      case "writer.para.indentDec":
        document.execCommand("outdent", false, null);
        return true;

      case "writer.font.family":
        if (args) document.execCommand("fontName", false, args);
        return true;

      case "writer.font.size":
        if (args) document.execCommand("fontSize", false, args);
        return true;

      case "writer.color.text":
        if (args) document.execCommand("foreColor", false, args);
        return true;

      case "writer.color.highlight":
        document.execCommand("hiliteColor", false, args || "#ffcd00");
        return true;

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
        document.execCommand("undo", false, null);
        return true;

      case "common.edit.redo":
        document.execCommand("redo", false, null);
        return true;

      case "common.edit.cut":
        document.execCommand("cut", false, null);
        return true;

      case "common.edit.copy":
        document.execCommand("copy", false, null);
        return true;

      case "common.edit.paste":
        document.execCommand("paste", false, null);
        return true;

      case "common.edit.pastePlain":
        this._pastePlainText();
        return true;

      case "common.edit.selectAll":
        document.execCommand("selectAll", false, null);
        return true;

      case "common.edit.find":
      case "common.edit.replace":
        this._showFindReplaceDialog(vnCmdId === "common.edit.replace");
        return true;

      case "common.edit.hyperlink":
        await this._insertHyperlink();
        return true;

      case "common.edit.formatPainter":
        return this._toggleFormatPainter();

      case "writer.header.insert":
        return this.activateHeader();

      case "writer.footer.insert":
        return this.activateFooter();

      case "writer.style.apply":
        this._applyParagraphStyle(args);
        return true;

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

      default:
        return false;
    }
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
        inserted = document.execCommand("insertHTML", false, html);
      } catch {
        inserted = false;
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!inserted && targetDom) {
      targetDom.innerHTML = (targetDom.innerHTML || "") + html;
    }
    this.isDirty = true;
  }

  _insertPageBreak() {
    this._initZones();
    const html = `<div style="page-break-before:always; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</div><p><br></p>`;
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        inserted = document.execCommand("insertHTML", false, html);
      } catch {
        inserted = false;
      }
    }
    const targetDom = this.bodyDom || this.editorDom;
    if (!inserted && targetDom) {
      targetDom.innerHTML = (targetDom.innerHTML || "") + html;
    }
    this.isDirty = true;
  }

  activateHeader() {
    this._initZones();
    if (!this.headerDom) return false;
    if (!this.headerDom.innerText?.trim()) {
      this.headerDom.innerHTML = "<p style='text-align: center; font-size: 10pt; margin: 0;'>Tiêu đề đầu trang</p>";
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
    return true;
  }

  activateFooter() {
    this._initZones();
    if (!this.footerDom) return false;
    if (!this.footerDom.innerText?.trim()) {
      this.footerDom.innerHTML = "<p style='text-align: center; font-size: 10pt; margin: 0;'>Trang 1 / 1</p>";
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
    return true;
  }

  _applyParagraphStyle(tag = "p") {
    const targetTag = (tag || "p").toLowerCase();
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        document.execCommand("formatBlock", false, `<${targetTag}>`);
      } catch {
        try {
          document.execCommand("formatBlock", false, targetTag);
        } catch {}
      }
    }
    this.isDirty = true;
    return true;
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
          const imgHtml = `<img src="${evt.target.result}" style="max-width:100%; height:auto; margin:10pt 0; box-shadow:0 2px 8px rgba(0,0,0,0.15);" /><p><br></p>`;
          document.execCommand("insertHTML", false, imgHtml);
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
          const content = this.editorDom.innerHTML;
          const idx = content.indexOf(findText);
          if (idx !== -1) {
            this.editorDom.innerHTML = content.substring(0, idx) + repText + content.substring(idx + findText.length);
          }
        }
      },
      onReplaceAll: (findText, repText) => {
        if (findText && repText !== null) {
          this.editorDom.innerHTML = this.editorDom.innerHTML.split(findText).join(repText);
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

    const fullHtml = `${headerHtml}${bodyHtml}${footerHtml}`;
    return `<style>${this._getPageSetupCss()}</style>${fullHtml}`;
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
      .replace(/<ins\b(?=[^>]*\bdata-vno-change=(?:"insert"|'insert'))[^>]*>([\s\S]*?)<\/ins>/gi, "$1");
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
  paginateContent(bodyHtml, availableHeightPx, printableWidthPx) {
    if (!bodyHtml || !bodyHtml.trim()) {
      return ["<p><br></p>"];
    }

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
      if (tagName === "UL" || tagName === "OL") {
        let items = 3;
        if (el.querySelectorAll) items = el.querySelectorAll("li").length || 3;
        return items * 26 + 16;
      }
      if (tagName === "IMG") return 250;

      // Đoạn văn mặc định
      const charsPerLine = Math.max(25, Math.floor(printableWidthPx / 8.5));
      const lines = text ? Math.max(1, Math.ceil(text.length / charsPerLine)) : 1;
      return lines * 26 + 10;
    };

    for (const el of blocks) {
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
        // Bỏ qua đường kẻ dashed phân tách trang khi preview
        continue;
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

    const pageBodies = this.paginateContent(rawBody, availableBodyHeightPx, dim.printableWidthPx);
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

      sheet.innerHTML = `
        <div class="vno-print-preview-page-number-tag">Trang ${pageIndex} / ${totalPages}</div>
        ${hasHeader ? `<div class="vno-print-preview-header">${headerHtml}</div>` : ""}
        <div class="vno-print-preview-body">${pageBodies[i] || "<p><br></p>"}</div>
        ${hasFooter ? `<div class="vno-print-preview-footer">${pageFooterHtml}</div>` : ""}
      `;

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
}

