/**
 * VN Office LibreOffice Adapter — VN Writer Adapter
 * Quản lý tương tác với StarWriter (sw) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showPromptDialog, showFindReplaceDialog, showAlertDialog } from "../../../platform/ui-kit/dialogs.js";

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
  }

  attach() {
    globalUnoBridge.attachDocument(this);
    this._applyPageSetup();
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

  insertTable(rows = 3, cols = 4) {
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
    if (!inserted && this.editorDom) {
      this.editorDom.innerHTML = (this.editorDom.innerHTML || "") + html;
    }
    this.isDirty = true;
  }

  _insertPageBreak() {
    const html = `<div style="page-break-before:always; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</div><p><br></p>`;
    let inserted = false;
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        inserted = document.execCommand("insertHTML", false, html);
      } catch {
        inserted = false;
      }
    }
    if (!inserted && this.editorDom) {
      this.editorDom.innerHTML = (this.editorDom.innerHTML || "") + html;
    }
    this.isDirty = true;
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
    const html = this.editorDom.innerHTML;
    return `<style>${this._getPageSetupCss()}</style>${html}`;
  }

  /**
   * Lưu tài liệu thành tệp DOCX thật trên đĩa (qua LibreOffice headless engine).
   * V1: luôn mở hộp thoại chọn nơi lưu (chưa lưu ngầm vào đường dẫn cũ) — sẽ tối ưu ở bản sau.
   */
  async save() {
    this.documentContent = this.editorDom.innerHTML;
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
      this.editorDom.innerHTML = result.content;
      this.documentContent = result.content;
      this.sourceFileName = (result.fileName || "TaiLieu").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
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
    window.print();
    return true;
  }
}
