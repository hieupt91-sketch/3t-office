/**
 * VN Office LibreOffice Adapter — VN Writer Adapter
 * Quản lý tương tác với StarWriter (sw) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";

export class WriterAdapter {
  constructor(editorDom) {
    this.editorDom = editorDom;
    this.documentContent = "";
    this.isDirty = false;
  }

  attach() {
    globalUnoBridge.attachDocument(this);
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
        this._insertHyperlink();
        return true;

      case "common.file.save":
        this.save();
        return true;

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
    document.execCommand("insertHTML", false, html);
    this.isDirty = true;
  }

  _insertPageBreak() {
    const html = `<div style="page-break-before:always; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</div><p><br></p>`;
    document.execCommand("insertHTML", false, html);
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

  _insertHyperlink() {
    const url = prompt("Nhập địa chỉ liên kết (URL):", "https://");
    if (url && url !== "https://") {
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
    const findText = prompt("Tìm kiếm văn bản:", "");
    if (!findText) return;
    if (isReplace) {
      const repText = prompt(`Thay thế "${findText}" bằng:`, "");
      if (repText !== null) {
        this.editorDom.innerHTML = this.editorDom.innerHTML.split(findText).join(repText);
      }
    } else {
      window.find(findText);
    }
  }

  save() {
    this.documentContent = this.editorDom.innerHTML;
    this.isDirty = false;
    console.log("[WriterAdapter] Đã lưu tài liệu sw.");
  }
}
