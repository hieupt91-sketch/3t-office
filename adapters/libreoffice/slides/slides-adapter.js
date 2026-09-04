/**
 * VN Office LibreOffice Adapter — VN Slides Adapter
 * Quản lý tương tác với StarImpress (sd) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";

export class SlidesAdapter {
  constructor(canvasController) {
    this.canvas = canvasController;
    this.isDirty = false;
    this.sourceFileName = "TrinhChieu";
  }

  attach() {
    globalUnoBridge.attachDocument(this);
    // common.edit.undo/redo dùng chung 1 handler toàn Suite qua Command Bus — mỗi app
    // (Writer/Sheet/Slides) PHẢI tự bindHandler() lại khi active, nếu không app kích hoạt
    // trước (mặc định Writer) sẽ chiếm vĩnh viễn phím Ctrl+Z/Ctrl+Y cho mọi app khác.
    // (Lỗi thật đã xảy ra: Ctrl+Z trong Slides gọi nhầm WriterAdapter.undo().)
    globalCommandBus.bindHandler("common.edit.undo", () => this.canvas.undo ? this.canvas.undo() : false);
    globalCommandBus.bindHandler("common.edit.redo", () => this.canvas.redo ? this.canvas.redo() : false);
    globalCommandBus.bindHandler("slides.review.commentInsert", (options) => {
      options = options || {};
      return this.canvas.openCommentsPanel ? this.canvas.openCommentsPanel(true) : false;
    });
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
      const layoutType = slide.layoutType || "title-content";

      const notesXml = slide.notes ? `
        <presentation:notes>
          <draw:frame svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="15cm">
            <draw:text-box>
              ${slide.notes.split("\n").map((line) => `<text:p>${this._escapeXml(line)}</text:p>`).join("")}
            </draw:text-box>
          </draw:frame>
        </presentation:notes>` : "";

      let framesXml = "";
      if (layoutType === "blank") {
        framesXml = "";
      } else if (layoutType === "title-only") {
        framesXml = `
        <draw:frame svg:x="2cm" svg:y="6cm" svg:width="24cm" svg:height="6cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>`;
      } else if (layoutType === "two-content") {
        const bodyLines = (slide.body || "").split("\n");
        const bodyParasXml = bodyLines
          .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
          .join("");
        const body2Lines = (slide.body2 || "").split("\n");
        const body2ParasXml = body2Lines
          .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
          .join("");

        framesXml = `
        <draw:frame svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="2cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="14.5cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${body2ParasXml}
          </draw:text-box>
        </draw:frame>`;
      } else {
        // title-content (default)
        const bodyLines = (slide.body || "").split("\n");
        const bodyParasXml = bodyLines
          .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
          .join("");

        framesXml = `
        <draw:frame svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>`;
      }

      pagesXml += `
      <draw:page draw:name="${pageName}" presentation:layout="${layoutType}">
        ${framesXml}${notesXml}
      </draw:page>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
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
            const pageLayout = page.getAttribute("presentation:layout") || "title-content";
            let notesText = "";
            const notesEl = page.querySelector("presentation\\:notes, notes");
            if (notesEl) {
              const notesParas = [];
              notesEl.querySelectorAll("p, text\\:p").forEach((p) => {
                const txt = (p.textContent || "").trim();
                if (txt && !txt.startsWith("<")) notesParas.push(txt);
              });
              notesText = notesParas.join("\n");
              notesEl.parentNode?.removeChild(notesEl);
            }

            const frames = page.querySelectorAll("draw\\:frame, frame");
            let title = `Trang chiếu ${idx + 1}`;
            let body = "";
            let body2 = undefined;

            if (pageLayout === "blank") {
              title = "";
              body = "";
            } else if (pageLayout === "title-only") {
              const pEls = page.querySelectorAll("p, text\\:p");
              if (pEls.length > 0) title = (pEls[0].textContent || "").trim();
              body = "";
            } else if (pageLayout === "two-content" && frames.length >= 3) {
              const f0Paras = [];
              frames[0].querySelectorAll("p, text\\:p").forEach(p => f0Paras.push((p.textContent || "").trim()));
              title = f0Paras.filter(Boolean).join(" ") || `Trang chiếu ${idx + 1}`;

              const f1Paras = [];
              frames[1].querySelectorAll("p, text\\:p").forEach(p => f1Paras.push((p.textContent || "").trim()));
              body = f1Paras.filter(Boolean).join("\n");

              const f2Paras = [];
              frames[2].querySelectorAll("p, text\\:p").forEach(p => f2Paras.push((p.textContent || "").trim()));
              body2 = f2Paras.filter(Boolean).join("\n");
            } else {
              const paragraphs = [];
              const pEls = page.querySelectorAll("p, text\\:p");
              pEls.forEach((p) => {
                const txt = (p.textContent || "").trim();
                if (txt && !txt.startsWith("<")) {
                  paragraphs.push(txt);
                }
              });
              title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx + 1}`;
              body = paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "";
            }

            parsedSlides.push({
              id: Date.now() + idx,
              title,
              body,
              body2,
              layoutType: pageLayout,
              shapes: [],
              notes: notesText
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
      const fullPageTag = pageMatch[0].match(/<draw:page[^>]*>/i)?.[0] || "";
      const layoutMatch = fullPageTag.match(/presentation:layout=["']([^"']+)["']/i);
      const pageLayout = layoutMatch ? layoutMatch[1] : "title-content";
      let pageContent = pageMatch[1];

      let notesText = "";
      const notesRegex = /<presentation:notes[^>]*>([\s\S]*?)<\/presentation:notes>/i;
      const notesMatch = notesRegex.exec(pageContent);
      if (notesMatch) {
        const notesContent = notesMatch[1];
        const npRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
        const nParas = [];
        let npm;
        while ((npm = npRegex.exec(notesContent)) !== null) {
          const cleanText = npm[1].replace(/<[^>]+>/g, "").trim();
          if (cleanText && !cleanText.startsWith("<")) {
            nParas.push(this._unescapeXml(cleanText));
          }
        }
        notesText = nParas.join("\n");
        pageContent = pageContent.replace(notesRegex, "");
      }

      let title = `Trang chiếu ${idx}`;
      let body = "";
      let body2 = undefined;

      if (pageLayout === "blank") {
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

      parsedSlides.push({
        id: Date.now() + idx,
        title,
        body,
        body2,
        layoutType: pageLayout,
        shapes: [],
        notes: notesText
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

    switch (cmd) {
      case "slides.slide.new":
        return this.canvas.addNewSlide();

      case "slides.slide.duplicate":
        return this.canvas.duplicateCurrentSlide();

      case "slides.slide.delete":
        return this.canvas.deleteCurrentSlide();

      case "slides.layout.apply":
      case "slides.layout.select":
        return this.canvas.showLayoutDialog ? this.canvas.showLayoutDialog() : false;

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

      case "slides.animation.apply":
        return this.canvas.showAnimationDialog ? this.canvas.showAnimationDialog() : false;

      case "slides.notes.toggle":
        return this.canvas.toggleNotes ? this.canvas.toggleNotes() : false;

      case "slides.view.slideSorter":
        return this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false;

      case "slides.show.presenterMode":
        return this.canvas.startPresenterMode ? this.canvas.startPresenterMode() : false;

      case "slides.show.rehearseTimings":
        return this.canvas.startRehearseTimings ? !!this.canvas.startRehearseTimings() : false;

      case "slides.media.insertVideo":
        return await this._insertMediaDialog("video");

      case "slides.media.insertAudio":
        return await this._insertMediaDialog("audio");

      case "common.edit.cut":
        if (typeof document !== "undefined") document.execCommand("cut", false, null);
        return true;

      case "common.edit.copy":
        if (typeof document !== "undefined") document.execCommand("copy", false, null);
        return true;

      case "common.edit.paste":
        if (typeof document !== "undefined") document.execCommand("paste", false, null);
        return true;

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
