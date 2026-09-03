/**
 * VN Office LibreOffice Adapter — VN Slides Adapter
 * Quản lý tương tác với StarImpress (sd) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";

export class SlidesAdapter {
  constructor(canvasController) {
    this.canvas = canvasController;
    this.isDirty = false;
    this.sourceFileName = "TrinhChieu";
  }

  attach() {
    globalUnoBridge.attachDocument(this);
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

  /**
   * Chuyển đổi toàn bộ slide hiện tại thành định dạng OpenDocument Flat XML (FODP).
   * LibreOffice Impress có thể chuyển đổi FODP trực tiếp sang PPTX, ODP hoặc PDF.
   */
  serializeToFodp() {
    const slides = (this.canvas && this.canvas.slides) || [];
    let pagesXml = "";

    slides.forEach((slide, idx) => {
      const pageName = `page${idx + 1}`;
      const titleEscaped = this._escapeXml(slide.title || `Trang chiếu ${idx + 1}`);
      const bodyLines = (slide.body || "").split("\n");
      const bodyParasXml = bodyLines
        .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
        .join("");

      pagesXml += `
      <draw:page draw:name="${pageName}">
        <draw:frame svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>
      </draw:page>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body>
    <office:presentation>${pagesXml}
    </office:presentation>
  </office:body>
</office:document>`;
  }

  /**
   * Phân tích nội dung FODP XML thành danh sách slide.
   * Hỗ trợ cả trình duyệt (DOMParser) và môi trường Node.js (regex fallback).
   */
  parseFodp(xmlText) {
    if (!xmlText) return [];
    const parsedSlides = [];

    // 1. Phân tích qua DOMParser nếu có (môi trường Browser / WebView2)
    if (typeof DOMParser !== "undefined") {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");
        const pages = doc.querySelectorAll("page, draw\\:page");
        if (pages && pages.length > 0) {
          pages.forEach((page, idx) => {
            const paragraphs = [];
            const pEls = page.querySelectorAll("p, text\\:p");
            pEls.forEach((p) => {
              const txt = (p.textContent || "").trim();
              if (txt && !txt.startsWith("<")) {
                paragraphs.push(txt);
              }
            });

            const title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx + 1}`;
            const body = paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "";
            parsedSlides.push({
              id: Date.now() + idx,
              title,
              body,
              shapes: []
            });
          });
          if (parsedSlides.length > 0) return parsedSlides;
        }
      } catch (e) {
        console.warn("[SlidesAdapter] Lỗi phân tích DOMParser, chuyển sang regex fallback:", e);
      }
    }

    // 2. Fallback regex parser (hoạt động tốt cả trong Node test runner)
    const pageRegex = /<draw:page[^>]*>([\s\S]*?)<\/draw:page>/gi;
    let pageMatch;
    let idx = 0;
    while ((pageMatch = pageRegex.exec(xmlText)) !== null) {
      idx++;
      const pageContent = pageMatch[1];
      const pRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
      const paragraphs = [];
      let pMatch;
      while ((pMatch = pRegex.exec(pageContent)) !== null) {
        const cleanText = pMatch[1].replace(/<[^>]+>/g, "").trim();
        if (cleanText && !cleanText.startsWith("<")) {
          paragraphs.push(this._unescapeXml(cleanText));
        }
      }
      const title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx}`;
      const body = paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "";
      parsedSlides.push({
        id: Date.now() + idx,
        title,
        body,
        shapes: []
      });
    }

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

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.canvas) return false;

    switch (vnCmdId) {
      case "slides.slide.new":
        return this.canvas.addNewSlide();

      case "slides.slide.duplicate":
        return this.canvas.duplicateCurrentSlide();

      case "slides.slide.delete":
        return this.canvas.deleteCurrentSlide();

      case "slides.show.startFromBegin":
        return this.canvas.startSlideShow(0);

      case "slides.show.startFromCurrent":
        return this.canvas.startSlideShow();

      case "slides.text.insert":
        this.canvas.bodyEl.innerText += "\n• Khung văn bản mới bổ sung";
        this.canvas._renderThumbnails();
        return true;

      case "slides.shape.insert":
        return this.canvas.insertShape ? this.canvas.insertShape("rect") : false;

      case "slides.image.insert":
        return await this._insertImageDialog();

      case "slides.master.apply":
        return this.canvas.showSlideMasterDialog ? this.canvas.showSlideMasterDialog() : false;

      case "slides.transition.apply":
        return this.canvas.showTransitionDialog ? this.canvas.showTransitionDialog() : false;

      case "common.edit.undo":
        return this.canvas.undo ? this.canvas.undo() : false;

      case "common.edit.redo":
        return this.canvas.redo ? this.canvas.redo() : false;

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
}
