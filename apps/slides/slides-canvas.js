/**
 * VN Slides — Canvas & Presentation Controller
 */

export class SlidesCanvasController {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.slides = [
      {
        id: 1,
        title: "VN OFFICE — BỘ ỨNG DỤNG VĂN PHÒNG VIỆT",
        body: "• Giải pháp công nghệ độc lập, bảo mật và hiện đại\n• Kế thừa nền tảng xử lý tài liệu mạnh mẽ từ LibreOffice Core\n• Giao diện tối ưu sâu sắc cho người dùng và văn bản hành chính Việt Nam",
        shapes: []
      },
      {
        id: 2,
        title: "KIẾN TRÚC HỆ THỐNG PHÂN TẦNG",
        body: "1. VN App UI (Writer, Sheet, Slides phát triển song song)\n2. VN Shared Platform & Command Bus\n3. VN LibreOffice Adapter Layer\n4. LibreOffice Core Engine C++",
        shapes: []
      }
    ];
    this.currentSlideIndex = 0;
    this.navEl = null;
    this.canvasEl = null;
    this.titleEl = null;
    this.bodyEl = null;
  }

  mount() {
    this.container.innerHTML = "";
    this.container.className = "vno-slides-studio";

    // 1. Thumbnails Navigator
    this.navEl = document.createElement("div");
    this.navEl.className = "vno-slide-navigator";
    this.container.appendChild(this.navEl);

    // 2. Stage & Canvas
    const stage = document.createElement("div");
    stage.className = "vno-slide-stage";

    this.canvasEl = document.createElement("div");
    this.canvasEl.className = "vno-slide-canvas";

    this.titleEl = document.createElement("div");
    this.titleEl.className = "vno-slide-title";
    this.titleEl.contentEditable = "true";
    this.titleEl.spellcheck = false;

    this.bodyEl = document.createElement("div");
    this.bodyEl.className = "vno-slide-body";
    this.bodyEl.contentEditable = "true";
    this.bodyEl.spellcheck = false;

    this.titleEl.addEventListener("input", () => {
      this.slides[this.currentSlideIndex].title = this.titleEl.innerText;
      this._renderThumbnails();
    });

    this.bodyEl.addEventListener("input", () => {
      this.slides[this.currentSlideIndex].body = this.bodyEl.innerText;
      this._renderThumbnails();
    });

    this.canvasEl.appendChild(this.titleEl);
    this.canvasEl.appendChild(this.bodyEl);
    stage.appendChild(this.canvasEl);
    this.container.appendChild(stage);

    this.selectSlide(0);
  }

  _renderThumbnails() {
    this.navEl.innerHTML = "";
    this.slides.forEach((slide, idx) => {
      const item = document.createElement("div");
      item.className = `vno-slide-thumb-item ${idx === this.currentSlideIndex ? "is-active" : ""}`;

      item.innerHTML = `
        <span class="vno-slide-thumb-num">${idx + 1}</span>
        <div class="vno-slide-thumb-card">
          <div style="font-weight:bold;margin-bottom:2px;">${slide.title.substring(0, 20)}...</div>
          <div>${slide.body.substring(0, 30)}...</div>
        </div>
      `;

      item.addEventListener("click", () => this.selectSlide(idx));
      this.navEl.appendChild(item);
    });
  }

  selectSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.currentSlideIndex = index;
    const s = this.slides[index];

    this.titleEl.innerText = s.title;
    this.bodyEl.innerText = s.body;

    this._renderThumbnails();

    if (this.options.onChange) {
      this.options.onChange(this.currentSlideIndex + 1, this.slides.length);
    }
  }

  addNewSlide() {
    const newSlide = {
      id: Date.now(),
      title: "Tiêu đề trang chiếu mới",
      body: "• Nhập nội dung thuyết trình tại đây...",
      shapes: []
    };
    this.slides.push(newSlide);
    this.selectSlide(this.slides.length - 1);
    return true;
  }

  deleteCurrentSlide() {
    if (this.slides.length <= 1) return false;
    this.slides.splice(this.currentSlideIndex, 1);
    const nextIdx = Math.max(0, this.currentSlideIndex - 1);
    this.selectSlide(nextIdx);
    return true;
  }

  insertShape(type = "rect") {
    const shape = document.createElement("div");
    shape.className = "vno-slide-shape";
    shape.style.left = "60px";
    shape.style.bottom = "40px";
    shape.style.width = "140px";
    shape.style.height = "60px";
    shape.style.backgroundColor = "var(--vno-app-slides-primary)";
    shape.style.color = "#ffffff";
    shape.style.borderRadius = type === "circle" ? "50%" : "6px";
    shape.textContent = type === "circle" ? "Hình tròn" : "Hình khối";

    this.canvasEl.appendChild(shape);
    return true;
  }

  insertTextBox() {
    const tb = document.createElement("div");
    tb.className = "vno-slide-shape";
    tb.contentEditable = "true";
    tb.style.left = "240px";
    tb.style.bottom = "40px";
    tb.style.border = "1px dashed var(--vno-app-slides-primary)";
    tb.style.padding = "6px 12px";
    tb.style.backgroundColor = "#ffffff";
    tb.textContent = "Nhập chữ...";
    this.canvasEl.appendChild(tb);
    tb.focus();
    return true;
  }

  startSlideShow(startIndex) {
    const idx = startIndex !== undefined ? startIndex : this.currentSlideIndex;
    let currentShowIdx = idx;

    const overlay = document.createElement("div");
    overlay.className = "vno-slideshow-overlay";

    const content = document.createElement("div");
    content.className = "vno-slideshow-content";

    const renderShow = () => {
      const s = this.slides[currentShowIdx];
      content.innerHTML = `
        <h1 style="font-size:44px;font-weight:bold;color:#1e293b;margin-bottom:32px;">${s.title}</h1>
        <div style="font-size:26px;line-height:1.6;color:#334155;white-space:pre-line;flex:1;">${s.body}</div>
        <div style="font-size:14px;color:#94a3b8;display:flex;justify-content:space-between;">
          <span>Trang ${currentShowIdx + 1} / ${this.slides.length}</span>
          <span>Nhấn Space hoặc Click để tiếp tục | Esc để thoát</span>
        </div>
      `;
    };

    renderShow();
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const closeShow = () => {
      document.removeEventListener("keydown", keyHandler);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        closeShow();
      } else if (e.key === " " || e.key === "ArrowRight" || e.key === "PageDown") {
        if (currentShowIdx < this.slides.length - 1) {
          currentShowIdx++;
          renderShow();
        } else {
          closeShow();
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (currentShowIdx > 0) {
          currentShowIdx--;
          renderShow();
        }
      }
    };

    document.addEventListener("keydown", keyHandler);
    overlay.addEventListener("click", () => {
      if (currentShowIdx < this.slides.length - 1) {
        currentShowIdx++;
        renderShow();
      } else {
        closeShow();
      }
    });

    return true;
  }
}
