/**
 * VN Slides — Enterprise Canvas Controller & Presentation Engine
 */

export const SLIDE_MASTER_THEMES = [
  {
    id: "modern-blue",
    name: "Xanh Doanh Nghiệp",
    fontFamily: "Inter, 'Segoe UI', sans-serif",
    titleColor: "#1e3a8a",
    bodyColor: "#334155",
    accentColor: "#2563eb",
    bgColor: "#f8fafc",
    logoText: "VN OFFICE • DOANH NGHIỆP"
  },
  {
    id: "corporate-red",
    name: "Đỏ Hành Chính",
    fontFamily: "'Times New Roman', serif",
    titleColor: "#991b1b",
    bodyColor: "#1f2937",
    accentColor: "#b53818",
    bgColor: "#fffdfa",
    logoText: "VN OFFICE • HÀNH CHÍNH"
  },
  {
    id: "emerald-green",
    name: "Xanh Kinh Tế",
    fontFamily: "'Segoe UI', sans-serif",
    titleColor: "#064e3b",
    bodyColor: "#334155",
    accentColor: "#059669",
    bgColor: "#f0fdf4",
    logoText: "VN OFFICE • KINH TẾ"
  },
  {
    id: "minimal-dark",
    name: "Tối Giản Công Nghệ",
    fontFamily: "system-ui, sans-serif",
    titleColor: "#f8fafc",
    bodyColor: "#cbd5e1",
    accentColor: "#38bdf8",
    bgColor: "#0f172a",
    logoText: "VN OFFICE • CÔNG NGHỆ"
  }
];

export class SlidesCanvasController {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.slides = [
      {
        id: 1,
        title: "VN OFFICE — BỘ ỨNG DỤNG VĂN PHÒNG VIỆT",
        body: "• Giải pháp công nghệ độc lập, bảo mật và chuẩn mực quốc gia\n• Tận dụng sức mạnh xử lý tài liệu vượt trội từ LibreOffice Core Engine\n• Giao diện thuần Việt, hiện đại, quen thuộc và thân thiện với người dùng",
        shapes: []
      },
      {
        id: 2,
        title: "KIẾN TRÚC HỆ THỐNG PHÂN TẦNG",
        body: "1. VN App UI (Writer, Sheet, Slides đồng bộ phát triển)\n2. VN Shared Platform & Global Command Bus\n3. VN LibreOffice Adapter Layer (UNO Bridge & PyUNO)\n4. LibreOffice Core Engine C++",
        shapes: []
      },
      {
        id: 3,
        title: "KẾ HOẠCH TRIỂN KHAI & TIÊU CHUẨN KỸ THUẬT",
        body: "• Hỗ trợ toàn diện định dạng văn bản hành chính theo Nghị định 30/2020/NĐ-CP\n• Tương thích 100% hai chiều với hệ sinh thái OOXML (DOCX, XLSX, PPTX)\n• Tích hợp trợ lý AI bảo mật cục bộ, bảo vệ quyền riêng tư tuyệt đối",
        shapes: []
      }
    ];
    this.currentSlideIndex = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.navEl = null;
    this.canvasEl = null;
    this.titleEl = null;
    this.bodyEl = null;

    // Master Theme (Mẫu slide chủ đạo toàn bài)
    this.masterTheme = {
      themeId: "modern-blue",
      fontFamily: "Inter, 'Segoe UI', sans-serif",
      titleColor: "#1e3a8a",
      bodyColor: "#334155",
      accentColor: "#2563eb",
      bgColor: "#f8fafc",
      logoText: "VN OFFICE • THUYẾT TRÌNH",
      footerText: "Tài liệu trình chiếu tiêu chuẩn VN Office",
      showLogo: true,
      showFooter: true
    };

    // Transitions (Hiệu ứng chuyển slide thật)
    this.transitionConfig = {
      type: "fade", // "fade" | "slide" | "zoom" | "flip"
      duration: 500 // ms
    };
  }

  mount() {
    this.container.innerHTML = "";
    this.container.className = "vno-slides-studio";

    // 1. Thumbnails Navigator
    this.navEl = document.createElement("div");
    this.navEl.className = "vno-slide-navigator";

    const navHeader = document.createElement("div");
    navHeader.className = "vno-slide-nav-header";
    navHeader.innerHTML = `<button class="vno-slide-new-btn" id="vno-new-slide-btn" title="Thêm trang chiếu mới (Ctrl+M)">+ Thêm trang chiếu mới</button>`;
    navHeader.querySelector("#vno-new-slide-btn").addEventListener("click", () => this.addNewSlide());
    this.navEl.appendChild(navHeader);

    this.slideListContainer = document.createElement("div");
    this.slideListContainer.style.display = "flex";
    this.slideListContainer.style.flexDirection = "column";
    this.slideListContainer.style.gap = "10px";
    this.navEl.appendChild(this.slideListContainer);

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
    this.canvasEl.style.position = "relative";

    // Slide Master UI Elements
    this.masterAccentEl = document.createElement("div");
    this.masterAccentEl.className = "vno-slide-master-accent";
    this.canvasEl.appendChild(this.masterAccentEl);

    this.masterLogoEl = document.createElement("div");
    this.masterLogoEl.className = "vno-slide-master-logo";
    this.canvasEl.appendChild(this.masterLogoEl);

    this.masterFooterEl = document.createElement("div");
    this.masterFooterEl.className = "vno-slide-master-footer";
    this.canvasEl.appendChild(this.masterFooterEl);

    this.shapesLayer = document.createElement("div");
    this.shapesLayer.className = "vno-slide-shapes-layer";
    this.shapesLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    this.canvasEl.appendChild(this.shapesLayer);

    stage.appendChild(this.canvasEl);
    this.container.appendChild(stage);

    this.selectSlide(0);
    this.applySlideMaster(this.masterTheme);
  }

  /**
   * Chèn một hình khối vector THẬT vào slide hiện tại — lưu vào slide.shapes
   * (không chỉ hiện thông báo giả), hiển thị ngay trên canvas, có trong dữ liệu
   * để lưu file thật.
   * @param {"rect"|"ellipse"} shapeType
   */
  insertShape(shapeType = "rect") {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return false;
    if (!Array.isArray(slide.shapes)) slide.shapes = [];

    const offset = slide.shapes.length * 24;
    slide.shapes.push({
      id: Date.now(),
      type: shapeType === "ellipse" ? "ellipse" : "rect",
      x: 80 + offset,
      y: 80 + offset,
      w: 200,
      h: 120,
      color: "#3b82f6"
    });

    this._renderShapesLayer();
    return true;
  }

  /**
   * Chèn một hình ảnh THẬT (do người dùng chọn qua hộp thoại file) vào slide hiện tại.
   * @param {string} dataUrl Ảnh dạng data URI đã đọc thật từ tệp người dùng chọn
   */
  insertImage(dataUrl) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !dataUrl) return false;
    if (!Array.isArray(slide.shapes)) slide.shapes = [];

    const offset = slide.shapes.length * 24;
    slide.shapes.push({
      id: Date.now(),
      type: "image",
      x: 100 + offset,
      y: 100 + offset,
      w: 280,
      h: 180,
      src: dataUrl
    });

    this._renderShapesLayer();
    return true;
  }

  _renderShapesLayer() {
    if (!this.shapesLayer) return;
    this.shapesLayer.innerHTML = "";
    const slide = this.slides[this.currentSlideIndex];
    const shapes = (slide && slide.shapes) || [];

    shapes.forEach((shape) => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute; left:${shape.x}px; top:${shape.y}px; width:${shape.w}px; height:${shape.h}px; pointer-events:auto;`;

      if (shape.type === "image" && shape.src) {
        const img = document.createElement("img");
        img.src = shape.src;
        img.style.cssText = "width:100%;height:100%;object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,0.15);";
        el.appendChild(img);
      } else {
        el.style.backgroundColor = shape.color || "#3b82f6";
        el.style.opacity = "0.85";
        el.style.borderRadius = shape.type === "ellipse" ? "50%" : "6px";
      }
      this.shapesLayer.appendChild(el);
    });

    this._renderThumbnails();
  }

  _renderThumbnails() {
    if (!this.slideListContainer) return;
    this.slideListContainer.innerHTML = "";
    const theme = this.masterTheme || {};
    this.slides.forEach((slide, idx) => {
      const item = document.createElement("div");
      item.className = `vno-slide-thumb-item ${idx === this.currentSlideIndex ? "is-active" : ""}`;

      item.innerHTML = `
        <span class="vno-slide-thumb-num">${idx + 1}</span>
        <div class="vno-slide-thumb-card" style="background:${theme.bgColor || "#ffffff"};font-family:${theme.fontFamily || "sans-serif"};">
          <div style="height:2px;background:${theme.accentColor || "#b53818"};margin-bottom:3px;"></div>
          <div style="font-weight:bold;color:${theme.titleColor || "#0f172a"};margin-bottom:4px;">${slide.title.substring(0, 24)}...</div>
          <div style="color:${theme.bodyColor || "#64748b"};">${slide.body.substring(0, 36)}...</div>
        </div>
      `;

      item.addEventListener("click", () => this.selectSlide(idx));
      this.slideListContainer.appendChild(item);
    });
  }

  selectSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.currentSlideIndex = index;
    const s = this.slides[index];

    this.titleEl.innerText = s.title;
    this.bodyEl.innerText = s.body;

    if (this.masterFooterEl) {
      this.masterFooterEl.innerHTML = `
        <span>${this.masterTheme?.footerText || "VN Office Slides"}</span>
        <span>Trang ${this.currentSlideIndex + 1} / ${this.slides.length}</span>
      `;
    }

    this._renderShapesLayer();

    if (this.options.onChange) {
      this.options.onChange(this.currentSlideIndex + 1, this.slides.length);
    }
  }

  addNewSlide(recordUndo = true) {
    const newSlide = {
      id: Date.now(),
      title: "Tiêu đề trang chiếu mới",
      body: "• Nhập nội dung chính tại đây...\n• Trình bày các điểm nổi bật",
      shapes: []
    };
    this.slides.push(newSlide);
    const newIdx = this.slides.length - 1;
    if (recordUndo) {
      this.undoStack.push({ type: "add", index: newIdx, slide: newSlide });
      this.redoStack = [];
    }
    this.selectSlide(newIdx);
    return true;
  }

  duplicateCurrentSlide(recordUndo = true) {
    const cur = this.slides[this.currentSlideIndex];
    if (!cur) return false;
    const dup = {
      id: Date.now(),
      title: `${cur.title} (Bản sao)`,
      body: cur.body,
      shapes: [...cur.shapes]
    };
    const targetIdx = this.currentSlideIndex + 1;
    this.slides.splice(targetIdx, 0, dup);
    if (recordUndo) {
      this.undoStack.push({ type: "add", index: targetIdx, slide: dup });
      this.redoStack = [];
    }
    this.selectSlide(targetIdx);
    return true;
  }

  deleteCurrentSlide(recordUndo = true) {
    if (this.slides.length <= 1) return false;
    const delIdx = this.currentSlideIndex;
    const [deleted] = this.slides.splice(delIdx, 1);
    if (recordUndo) {
      this.undoStack.push({ type: "delete", index: delIdx, slide: deleted });
      this.redoStack = [];
    }
    const nextIdx = Math.max(0, delIdx - 1);
    this.selectSlide(nextIdx);
    return true;
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const action = this.undoStack.pop();
    if (action.type === "add") {
      const [removed] = this.slides.splice(action.index, 1);
      this.redoStack.push({ type: "delete", index: action.index, slide: removed });
      this.selectSlide(Math.max(0, action.index - 1));
      return true;
    } else if (action.type === "delete") {
      this.slides.splice(action.index, 0, action.slide);
      this.redoStack.push({ type: "add", index: action.index, slide: action.slide });
      this.selectSlide(action.index);
      return true;
    }
    return false;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const action = this.redoStack.pop();
    if (action.type === "delete") {
      this.slides.splice(action.index, 0, action.slide);
      this.undoStack.push({ type: "add", index: action.index, slide: action.slide });
      this.selectSlide(action.index);
      return true;
    } else if (action.type === "add") {
      const [removed] = this.slides.splice(action.index, 1);
      this.undoStack.push({ type: "delete", index: action.index, slide: removed });
      this.selectSlide(Math.max(0, action.index - 1));
      return true;
    }
    return false;
  }

  applySlideMaster(themeConfig) {
    if (!themeConfig) return false;
    if (typeof themeConfig === "string") {
      const found = SLIDE_MASTER_THEMES.find(t => t.id === themeConfig);
      if (found) themeConfig = found;
      else return false;
    }

    this.masterTheme = { ...this.masterTheme, ...themeConfig };

    if (this.canvasEl) {
      this.canvasEl.style.fontFamily = this.masterTheme.fontFamily;
      this.canvasEl.style.backgroundColor = this.masterTheme.bgColor;
    }
    if (this.titleEl) {
      this.titleEl.style.color = this.masterTheme.titleColor;
      this.titleEl.style.fontFamily = this.masterTheme.fontFamily;
    }
    if (this.bodyEl) {
      this.bodyEl.style.color = this.masterTheme.bodyColor || "#334155";
      this.bodyEl.style.fontFamily = this.masterTheme.fontFamily;
    }
    if (this.masterAccentEl) {
      this.masterAccentEl.style.background = this.masterTheme.accentColor;
    }
    if (this.masterLogoEl) {
      this.masterLogoEl.textContent = this.masterTheme.logoText || "";
      this.masterLogoEl.style.color = this.masterTheme.accentColor;
    }
    if (this.masterFooterEl) {
      this.masterFooterEl.innerHTML = `
        <span>${this.masterTheme.footerText || "VN Office Slides"}</span>
        <span>Trang ${this.currentSlideIndex + 1} / ${this.slides.length}</span>
      `;
      this.masterFooterEl.style.color = this.masterTheme.bodyColor || "#64748b";
    }

    this._renderThumbnails();
    return true;
  }

  showSlideMasterDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      let selectedId = this.masterTheme.themeId || "modern-blue";

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 540px;" role="dialog" aria-modal="true">
          <div class="vno-dialog-header">
            <span>Thiết Lập Mẫu Slide Master (Chủ Đề Toàn Bài)</span>
            <button class="vno-btn vno-dialog-close-btn" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <p style="font-size:12px;color:#64748b;margin:0;">Chọn một mẫu phong cách để đồng bộ màu sắc, phông chữ và logo cho tất cả các trang chiếu:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" id="vno-master-themes-grid">
              ${SLIDE_MASTER_THEMES.map(t => `
                <div class="vno-theme-card ${t.id === selectedId ? "is-selected" : ""}" data-theme-id="${t.id}" style="background:${t.bgColor};">
                  <div style="height:4px;background:${t.accentColor};border-radius:2px;"></div>
                  <div style="font-weight:bold;font-size:12px;color:${t.titleColor};font-family:${t.fontFamily};">${t.name}</div>
                  <div style="font-size:10px;color:${t.bodyColor};opacity:0.8;">Logo: ${t.logoText}</div>
                </div>
              `).join("")}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
              <label style="font-size:11px;font-weight:600;color:#334155;">Tên đơn vị / Logo chữ góc trang:</label>
              <input type="text" class="vno-input" id="vno-master-logo-input" value="${this.masterTheme.logoText || "VN OFFICE"}" style="padding:4px 8px;font-size:12px;" />
            </div>
          </div>
          <div class="vno-dialog-footer">
            <button class="vno-btn" id="vno-master-cancel">Hủy bỏ</button>
            <button class="vno-btn vno-btn-primary" id="vno-master-apply">Áp dụng cho toàn bộ slide</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const cards = overlay.querySelectorAll(".vno-theme-card");
      cards.forEach(c => {
        c.addEventListener("click", () => {
          cards.forEach(x => x.classList.remove("is-selected"));
          c.classList.add("is-selected");
          selectedId = c.dataset.themeId;
          const found = SLIDE_MASTER_THEMES.find(t => t.id === selectedId);
          if (found) {
            const logoInp = overlay.querySelector("#vno-master-logo-input");
            if (logoInp) logoInp.value = found.logoText;
          }
        });
      });

      const close = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => { close(); resolve(false); });
      overlay.querySelector("#vno-master-cancel")?.addEventListener("click", () => { close(); resolve(false); });

      overlay.querySelector("#vno-master-apply")?.addEventListener("click", () => {
        const logoInp = overlay.querySelector("#vno-master-logo-input");
        const logoVal = logoInp ? logoInp.value : "VN OFFICE";
        const found = SLIDE_MASTER_THEMES.find(t => t.id === selectedId);
        if (found) {
          this.applySlideMaster({ ...found, themeId: selectedId, logoText: logoVal });
        }
        close();
        resolve(true);
      });
    });
  }

  setTransition(type = "fade", duration = 500, applyToAll = true) {
    this.transitionConfig = { type, duration: parseInt(duration, 10) || 500 };
    if (applyToAll) {
      this.slides.forEach(s => {
        s.transition = { ...this.transitionConfig };
      });
    } else {
      if (this.slides[this.currentSlideIndex]) {
        this.slides[this.currentSlideIndex].transition = { ...this.transitionConfig };
      }
    }
    return true;
  }

  showTransitionDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      const currentType = this.transitionConfig.type || "fade";
      const currentDuration = this.transitionConfig.duration || 500;

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 460px;" role="dialog" aria-modal="true">
          <div class="vno-dialog-header">
            <span>Hiệu Ứng Chuyển Trang Chiếu (Slide Transitions)</span>
            <button class="vno-btn vno-dialog-close-btn" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;font-weight:600;color:#334155;">Kiểu chuyển trang:</label>
              <select class="vno-select" id="vno-trans-type-select">
                <option value="fade" ${currentType === "fade" ? "selected" : ""}>Mờ dần (Fade)</option>
                <option value="slide" ${currentType === "slide" ? "selected" : ""}>Trượt ngang (Slide)</option>
                <option value="zoom" ${currentType === "zoom" ? "selected" : ""}>Thu phóng (Zoom)</option>
                <option value="flip" ${currentType === "flip" ? "selected" : ""}>Lật trang 3D (Flip)</option>
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;font-weight:600;color:#334155;">Thời gian hiệu ứng:</label>
              <select class="vno-select" id="vno-trans-duration-select">
                <option value="300" ${currentDuration === 300 ? "selected" : ""}>Nhanh (0.3 giây)</option>
                <option value="500" ${currentDuration === 500 ? "selected" : ""}>Tiêu chuẩn (0.5 giây)</option>
                <option value="800" ${currentDuration === 800 ? "selected" : ""}>Chậm (0.8 giây)</option>
                <option value="1000" ${currentDuration === 1000 ? "selected" : ""}>Rất chậm (1.0 giây)</option>
              </select>
            </div>
            <div style="padding:16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;text-align:center;overflow:hidden;">
              <div id="vno-trans-preview-box" style="font-size:16px;font-weight:bold;color:#b53818;padding:12px;background:#ffffff;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                Trang Chiếu Mẫu
              </div>
              <button class="vno-btn" id="vno-trans-preview-btn" style="margin-top:8px;font-size:11px;">▶ Xem thử hiệu ứng</button>
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
            <button class="vno-btn" id="vno-trans-cancel">Hủy bỏ</button>
            <div style="display:flex;gap:6px;">
              <button class="vno-btn" id="vno-trans-apply-current">Chỉ slide này</button>
              <button class="vno-btn vno-btn-primary" id="vno-trans-apply-all">Áp dụng tất cả slide</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const previewBox = overlay.querySelector("#vno-trans-preview-box");
      const typeSelect = overlay.querySelector("#vno-trans-type-select");
      const durationSelect = overlay.querySelector("#vno-trans-duration-select");

      const runPreview = () => {
        if (!previewBox || !typeSelect || !durationSelect) return;
        const type = typeSelect.value;
        const dur = durationSelect.value;
        const animName = `vnoTransition${type.charAt(0).toUpperCase() + type.slice(1)}`;
        previewBox.style.animation = "none";
        void previewBox.offsetWidth;
        previewBox.style.animation = `${animName} ${dur}ms ease-out forwards`;
      };

      overlay.querySelector("#vno-trans-preview-btn")?.addEventListener("click", runPreview);
      typeSelect?.addEventListener("change", runPreview);

      const close = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => { close(); resolve(false); });
      overlay.querySelector("#vno-trans-cancel")?.addEventListener("click", () => { close(); resolve(false); });

      overlay.querySelector("#vno-trans-apply-current")?.addEventListener("click", () => {
        this.setTransition(typeSelect.value, durationSelect.value, false);
        close();
        resolve(true);
      });

      overlay.querySelector("#vno-trans-apply-all")?.addEventListener("click", () => {
        this.setTransition(typeSelect.value, durationSelect.value, true);
        close();
        resolve(true);
      });
    });
  }

  startSlideShow(startIndex) {
    const idx = startIndex !== undefined ? startIndex : this.currentSlideIndex;
    let currentShowIdx = idx;

    const overlay = document.createElement("div");
    overlay.className = "vno-slideshow-overlay";

    const content = document.createElement("div");
    content.className = "vno-slideshow-content";

    const theme = this.masterTheme || {};

    const renderShow = () => {
      const s = this.slides[currentShowIdx];
      const shapesHtml = (s.shapes || []).map((shape) => {
        const pos = `position:absolute;left:${shape.x}px;top:${shape.y}px;width:${shape.w}px;height:${shape.h}px;`;
        if (shape.type === "image" && shape.src) {
          return `<img src="${shape.src}" style="${pos}object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,0.15);" />`;
        }
        const radius = shape.type === "ellipse" ? "50%" : "6px";
        return `<div style="${pos}background:${shape.color || "#3b82f6"};opacity:0.85;border-radius:${radius};"></div>`;
      }).join("");

      content.style.fontFamily = theme.fontFamily || "sans-serif";
      content.style.backgroundColor = theme.bgColor || "#ffffff";

      content.innerHTML = `
        <div class="vno-slide-master-accent" style="background:${theme.accentColor || "#b53818"};"></div>
        <div class="vno-slide-master-logo" style="color:${theme.accentColor || "#b53818"};">${theme.logoText || "VN OFFICE"}</div>
        <div style="position:relative;flex:1;padding-top:20px;">
          <h1 style="font-size:44px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:36px;">${s.title}</h1>
          <div style="font-size:26px;line-height:1.7;color:${theme.bodyColor || "#334155"};white-space:pre-line;">${s.body}</div>
          ${shapesHtml}
        </div>
        <div class="vno-slide-master-footer" style="color:${theme.bodyColor || "#64748b"};">
          <span>${theme.footerText || "Tài liệu thuyết trình VN Office"}</span>
          <span>Trang ${currentShowIdx + 1} / ${this.slides.length}</span>
          <span>Phím Space hoặc Click để tiếp tục | Esc để thoát</span>
        </div>
      `;

      // Áp dụng Transition Animation thật
      const t = s.transition || this.transitionConfig || { type: "fade", duration: 500 };
      const animName = `vnoTransition${t.type.charAt(0).toUpperCase() + t.type.slice(1)}`;
      content.style.animation = "none";
      void content.offsetWidth;
      content.style.animation = `${animName} ${t.duration}ms ease-out forwards`;
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
