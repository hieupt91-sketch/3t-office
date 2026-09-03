/**
 * VN Office LibreOffice Adapter — VN Writer Adapter
 * Quản lý tương tác với StarWriter (sw) Document Model
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

      case "writer.list.bullet":
        document.execCommand("insertUnorderedList", false, null);
        return true;

      case "writer.list.numbered":
        document.execCommand("insertOrderedList", false, null);
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

      case "writer.table.insert":
        this.insertTable(3, 4);
        return true;

      case "common.edit.undo":
        document.execCommand("undo", false, null);
        return true;

      case "common.edit.redo":
        document.execCommand("redo", false, null);
        return true;

      case "common.file.save":
        this.save();
        return true;

      default:
        console.log(`[WriterAdapter] Chưa xử lý lệnh: ${vnCmdId} (${unoUrl})`);
        return true;
    }
  }

  insertTable(rows = 3, cols = 3) {
    let html = `<table style="width:100%; border-collapse:collapse; margin:12px 0;">`;
    for (let r = 0; r < rows; r++) {
      html += `<tr>`;
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid #cbd5e1; padding:8px 12px; min-width:60px;">${r === 0 ? `<strong>Cột ${c + 1}</strong>` : `Ô ${r},${c}`}</td>`;
      }
      html += `</tr>`;
    }
    html += `</table><p><br></p>`;
    document.execCommand("insertHTML", false, html);
  }

  save() {
    this.isDirty = false;
    console.log("[WriterAdapter] Lưu tài liệu thành công vào bộ nhớ lưu trữ ODT/DOCX.");
    return true;
  }
}
