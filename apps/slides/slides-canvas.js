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

export const ENTRANCE_ANIMATION_TYPES = [
  { id: "none", name: "Không có hiệu ứng" },
  { id: "fadeIn", name: "Mờ dần (Fade In)", keyframe: "vnoAnimFadeIn" },
  { id: "flyIn", name: "Bay từ dưới lên (Fly In)", keyframe: "vnoAnimFlyIn" },
  { id: "zoomIn", name: "Thu phóng (Zoom In)", keyframe: "vnoAnimZoomIn" },
  { id: "bounceIn", name: "Nảy nhẹ (Bounce In)", keyframe: "vnoAnimBounceIn" },
  { id: "slideLeft", name: "Trượt từ trái sang (Slide Left)", keyframe: "vnoAnimSlideLeft" }
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
        shapes: [],
        notes: "Giới thiệu tổng quan về bộ ứng dụng VN Office, nhấn mạnh tính độc lập công nghệ và bảo mật dữ liệu theo tiêu chuẩn quốc gia.",
        titleAnimation: { type: "fadeIn", duration: 600, delay: 100 },
        bodyAnimation: { type: "flyIn", duration: 700, delay: 300 }
      },
      {
        id: 2,
        title: "KIẾN TRÚC HỆ THỐNG PHÂN TẦNG",
        body: "1. VN App UI (Writer, Sheet, Slides đồng bộ phát triển)\n2. VN Shared Platform & Global Command Bus\n3. VN LibreOffice Adapter Layer (UNO Bridge & PyUNO)\n4. LibreOffice Core Engine C++",
        shapes: [],
        notes: "Làm rõ vai trò của UNO Bridge kết nối giữa tầng giao diện web và tầng lõi LibreOffice C++ headless mà không phát sinh chi phí bản quyền.",
        titleAnimation: { type: "fadeIn", duration: 500, delay: 0 }
      },
      {
        id: 3,
        title: "KẾ HOẠCH TRIỂN KHAI & TIÊU CHUẨN KỸ THUẬT",
        body: "• Hỗ trợ toàn diện định dạng văn bản hành chính theo Nghị định 30/2020/NĐ-CP\n• Tương thích 100% hai chiều với hệ sinh thái OOXML (DOCX, XLSX, PPTX)\n• Tích hợp trợ lý AI bảo mật cục bộ, bảo vệ quyền riêng tư tuyệt đối",
        shapes: [],
        notes: "Nhấn mạnh khả năng tương thích định dạng DOCX/XLSX/PPTX và tuân thủ Nghị định 30/2020/NĐ-CP về thể thức văn bản hành chính.",
        titleAnimation: { type: "zoomIn", duration: 600, delay: 200 }
      }
    ];
    this.currentSlideIndex = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.navEl = null;
    this.canvasEl = null;
    this.titleEl = null;
    this.bodyEl = null;
    this.selectedTarget = null; // "title" | "body" | shapeId

    // Speaker Notes State
    this.isNotesVisible = false;
    this.notesPanelEl = null;
    this.notesTextarea = null;
    this.notesCharCountEl = null;
    this.notesToggleBtn = null;
    this.notesContentEl = null;

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

    this.titleEl.addEventListener("focus", () => this.setSelectedTarget("title"));
    this.titleEl.addEventListener("click", () => this.setSelectedTarget("title"));
    this.bodyEl.addEventListener("focus", () => this.setSelectedTarget("body"));
    this.bodyEl.addEventListener("click", () => this.setSelectedTarget("body"));

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

    // Speaker Notes Panel (Dưới canvas, có thể thu gọn / mở rộng)
    this.notesPanelEl = document.createElement("div");
    this.notesPanelEl.className = "vno-slide-notes-panel is-collapsed";
    this.notesPanelEl.innerHTML = `
      <div class="vno-slide-notes-bar" id="vno-notes-bar">
        <div class="vno-slide-notes-label">
          <span class="vno-notes-icon">📝</span>
          <span style="font-weight:600;font-size:12px;color:#334155;">Ghi chú người thuyết trình (Speaker Notes)</span>
          <span class="vno-notes-badge" id="vno-notes-count">0 ký tự</span>
        </div>
        <button class="vno-btn vno-btn-sm vno-notes-toggle-btn" id="vno-notes-toggle" title="Ẩn/Hiện khung ghi chú">
          ▲ Mở ghi chú
        </button>
      </div>
      <div class="vno-slide-notes-content" id="vno-notes-content" style="display:none;">
        <textarea class="vno-slide-notes-input" id="vno-notes-textarea" placeholder="Nhập ghi chú dành riêng cho người thuyết trình (chỉ hiển thị ở chế độ Presenter, không hiện cho khán giả khi F5)..."></textarea>
      </div>
    `;

    this.notesToggleBtn = this.notesPanelEl.querySelector("#vno-notes-toggle");
    this.notesContentEl = this.notesPanelEl.querySelector("#vno-notes-content");
    this.notesTextarea = this.notesPanelEl.querySelector("#vno-notes-textarea");
    this.notesCharCountEl = this.notesPanelEl.querySelector("#vno-notes-count");

    this.notesToggleBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleNotes();
    });

    this.notesPanelEl.querySelector("#vno-notes-bar")?.addEventListener("click", (e) => {
      if (e.target !== this.notesToggleBtn) {
        this.toggleNotes();
      }
    });

    this.notesTextarea?.addEventListener("input", () => {
      const s = this.slides[this.currentSlideIndex];
      if (s) {
        s.notes = this.notesTextarea.value;
        this._updateNotesCharCount();
      }
    });

    stage.appendChild(this.notesPanelEl);
    this.container.appendChild(stage);

    this.selectSlide(0);
    this.applySlideMaster(this.masterTheme);
  }

  /**
   * Cập nhật số lượng ký tự của Speaker Notes cho slide hiện tại.
   */
  _updateNotesCharCount() {
    if (!this.notesCharCountEl) return;
    const s = this.slides[this.currentSlideIndex];
    const len = (s && s.notes) ? s.notes.length : 0;
    this.notesCharCountEl.textContent = `${len} ký tự`;
  }

  /**
   * Bật hoặc ẩn thanh ghi chú người thuyết trình bên dưới canvas.
   * @param {boolean} [forceState]
   */
  toggleNotes(forceState) {
    if (forceState !== undefined) {
      this.isNotesVisible = !!forceState;
    } else {
      this.isNotesVisible = !this.isNotesVisible;
    }

    if (this.notesPanelEl && this.notesContentEl && this.notesToggleBtn) {
      if (this.isNotesVisible) {
        this.notesPanelEl.classList.remove("is-collapsed");
        this.notesPanelEl.classList.add("is-expanded");
        this.notesContentEl.style.display = "flex";
        this.notesToggleBtn.textContent = "▼ Thu gọn ghi chú";
        if (this.notesTextarea) this.notesTextarea.focus();
      } else {
        this.notesPanelEl.classList.add("is-collapsed");
        this.notesPanelEl.classList.remove("is-expanded");
        this.notesContentEl.style.display = "none";
        this.notesToggleBtn.textContent = "▲ Mở ghi chú";
      }
    }
    return this.isNotesVisible;
  }

  /**
   * Đặt đối tượng đang được chọn trên canvas (title, body, hoặc shape ID).
   */
  setSelectedTarget(target) {
    this.selectedTarget = target;
    if (this.titleEl) {
      if (target === "title") this.titleEl.classList.add("is-selected");
      else this.titleEl.classList.remove("is-selected");
    }
    if (this.bodyEl) {
      if (target === "body") this.bodyEl.classList.add("is-selected");
      else this.bodyEl.classList.remove("is-selected");
    }
    if (this.shapesLayer) {
      const items = this.shapesLayer.querySelectorAll(".vno-slide-shape-item");
      const slide = this.slides[this.currentSlideIndex];
      const shapes = (slide && slide.shapes) || [];
      items.forEach((item, idx) => {
        const sh = shapes[idx];
        if (sh && String(sh.id) === String(target)) item.classList.add("is-selected");
        else item.classList.remove("is-selected");
      });
    }
  }

  /**
   * Cấu hình hiệu ứng xuất hiện (entrance animation) cho một đối tượng.
   * @param {"title"|"body"|number|string} target
   * @param {{ type: string, duration?: number, delay?: number }} animationConfig
   */
  setObjectAnimation(target, animationConfig) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return false;
    const cfg = {
      type: animationConfig?.type || "none",
      duration: parseInt(animationConfig?.duration, 10) || 500,
      delay: parseInt(animationConfig?.delay, 10) || 0
    };

    if (target === "title") {
      slide.titleAnimation = cfg;
    } else if (target === "body") {
      slide.bodyAnimation = cfg;
    } else {
      const shape = (slide.shapes || []).find(s => String(s.id) === String(target));
      if (shape) {
        shape.animation = cfg;
      } else {
        slide.titleAnimation = cfg;
      }
    }
    this._renderShapesLayer();
    return true;
  }

  /**
   * Lấy cấu hình animation hiện tại của đối tượng.
   */
  getObjectAnimation(target) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return { type: "none", duration: 500, delay: 0 };
    if (target === "title") {
      return slide.titleAnimation || { type: "none", duration: 500, delay: 0 };
    } else if (target === "body") {
      return slide.bodyAnimation || { type: "none", duration: 500, delay: 0 };
    } else {
      const shape = (slide.shapes || []).find(s => String(s.id) === String(target));
      return (shape && shape.animation) || { type: "none", duration: 500, delay: 0 };
    }
  }

  _getKeyframeName(type) {
    switch (type) {
      case "fadeIn":
      case "fade":
        return "vnoAnimFadeIn";
      case "flyIn":
      case "fly":
        return "vnoAnimFlyIn";
      case "zoomIn":
      case "zoom":
        return "vnoAnimZoomIn";
      case "bounceIn":
      case "bounce":
        return "vnoAnimBounceIn";
      case "slideLeft":
      case "slide":
        return "vnoAnimSlideLeft";
      default:
        return "vnoAnimFadeIn";
    }
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
    const newShape = {
      id: Date.now(),
      type: shapeType === "ellipse" ? "ellipse" : "rect",
      x: 80 + offset,
      y: 80 + offset,
      w: 200,
      h: 120,
      color: "#3b82f6",
      animation: { type: "none", duration: 500, delay: 0 }
    };
    slide.shapes.push(newShape);

    this.setSelectedTarget(newShape.id);
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
    const newShape = {
      id: Date.now(),
      type: "image",
      x: 100 + offset,
      y: 100 + offset,
      w: 280,
      h: 180,
      src: dataUrl,
      animation: { type: "none", duration: 500, delay: 0 }
    };
    slide.shapes.push(newShape);

    this.setSelectedTarget(newShape.id);
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
      const isSel = String(this.selectedTarget) === String(shape.id);
      el.className = `vno-slide-shape-item ${isSel ? "is-selected" : ""}`;
      el.style.cssText = `position:absolute; left:${shape.x}px; top:${shape.y}px; width:${shape.w}px; height:${shape.h}px; pointer-events:auto; cursor:pointer;`;

      if (shape.type === "image" && shape.src) {
        const img = document.createElement("img");
        img.src = shape.src;
        img.style.cssText = "width:100%;height:100%;object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,0.15);pointer-events:none;";
        el.appendChild(img);
      } else {
        el.style.backgroundColor = shape.color || "#3b82f6";
        el.style.opacity = "0.85";
        el.style.borderRadius = shape.type === "ellipse" ? "50%" : "6px";
      }

      if (shape.animation && shape.animation.type && shape.animation.type !== "none") {
        const badge = document.createElement("span");
        badge.className = "vno-anim-badge";
        badge.textContent = `★ ${shape.animation.type}`;
        badge.title = `Hiệu ứng: ${shape.animation.type} (${shape.animation.duration}ms)`;
        el.appendChild(badge);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setSelectedTarget(shape.id);
      });

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

    if (this.titleEl) this.titleEl.innerText = s.title;
    if (this.bodyEl) this.bodyEl.innerText = s.body;

    if (this.notesTextarea) {
      this.notesTextarea.value = s.notes || "";
      this._updateNotesCharCount();
    }

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
      shapes: [],
      notes: ""
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
      shapes: (cur.shapes || []).map(s => ({ ...s, animation: s.animation ? { ...s.animation } : undefined })),
      notes: cur.notes || "",
      titleAnimation: cur.titleAnimation ? { ...cur.titleAnimation } : undefined,
      bodyAnimation: cur.bodyAnimation ? { ...cur.bodyAnimation } : undefined,
      transition: cur.transition ? { ...cur.transition } : undefined
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

  showAnimationDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return Promise.resolve(false);

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      const targetOptions = [
        { id: "title", label: `Tiêu đề ("${(slide.title || "").substring(0, 20)}...")` },
        { id: "body", label: `Nội dung ("${(slide.body || "").substring(0, 20)}...")` }
      ];
      (slide.shapes || []).forEach((sh, idx) => {
        const typeName = sh.type === "image" ? "Hình ảnh" : (sh.type === "ellipse" ? "Hình elip" : "Hình chữ nhật");
        targetOptions.push({ id: String(sh.id), label: `${typeName} #${idx + 1}` });
      });

      let initialTarget = "title";
      if (this.selectedTarget) {
        if (targetOptions.some(t => t.id === String(this.selectedTarget))) {
          initialTarget = String(this.selectedTarget);
        }
      }
      let currentAnim = this.getObjectAnimation(initialTarget);

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 500px;" role="dialog" aria-modal="true">
          <div class="vno-dialog-header">
            <span>Hiệu Ứng Đối Tượng (Object Animations)</span>
            <button class="vno-btn vno-dialog-close-btn" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;font-weight:600;color:#334155;">Đối tượng áp dụng:</label>
              <select class="vno-select" id="vno-anim-target-select">
                ${targetOptions.map(t => `<option value="${t.id}" ${t.id === initialTarget ? "selected" : ""}>${t.label}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;font-weight:600;color:#334155;">Kiểu hiệu ứng xuất hiện (Entrance):</label>
              <select class="vno-select" id="vno-anim-type-select">
                <option value="none" ${currentAnim.type === "none" ? "selected" : ""}>Không có hiệu ứng</option>
                <option value="fadeIn" ${currentAnim.type === "fadeIn" || currentAnim.type === "fade" ? "selected" : ""}>Mờ dần xuất hiện (Fade In)</option>
                <option value="flyIn" ${currentAnim.type === "flyIn" || currentAnim.type === "fly" ? "selected" : ""}>Bay từ dưới lên (Fly In)</option>
                <option value="zoomIn" ${currentAnim.type === "zoomIn" || currentAnim.type === "zoom" ? "selected" : ""}>Thu phóng xuất hiện (Zoom In)</option>
                <option value="bounceIn" ${currentAnim.type === "bounceIn" || currentAnim.type === "bounce" ? "selected" : ""}>Nảy nhẹ xuất hiện (Bounce In)</option>
                <option value="slideLeft" ${currentAnim.type === "slideLeft" || currentAnim.type === "slide" ? "selected" : ""}>Trượt từ trái sang (Slide Left)</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:12px;font-weight:600;color:#334155;">Thời gian hiệu ứng:</label>
                <select class="vno-select" id="vno-anim-duration-select">
                  <option value="300" ${currentAnim.duration === 300 ? "selected" : ""}>Rất nhanh (0.3s)</option>
                  <option value="500" ${currentAnim.duration === 500 ? "selected" : ""}>Tiêu chuẩn (0.5s)</option>
                  <option value="800" ${currentAnim.duration === 800 ? "selected" : ""}>Chậm (0.8s)</option>
                  <option value="1000" ${currentAnim.duration === 1000 ? "selected" : ""}>1.0 giây</option>
                </select>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:12px;font-weight:600;color:#334155;">Độ trễ xuất hiện:</label>
                <select class="vno-select" id="vno-anim-delay-select">
                  <option value="0" ${currentAnim.delay === 0 ? "selected" : ""}>Ngay lập tức (0s)</option>
                  <option value="200" ${currentAnim.delay === 200 ? "selected" : ""}>Sau 0.2s</option>
                  <option value="500" ${currentAnim.delay === 500 ? "selected" : ""}>Sau 0.5s</option>
                  <option value="1000" ${currentAnim.delay === 1000 ? "selected" : ""}>Sau 1.0s</option>
                </select>
              </div>
            </div>
            <div style="padding:16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;text-align:center;overflow:hidden;">
              <div id="vno-anim-preview-box" style="font-size:15px;font-weight:bold;color:#2563eb;padding:12px;background:#ffffff;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:inline-block;min-width:180px;">
                Đối tượng xem thử
              </div>
              <div>
                <button class="vno-btn" id="vno-anim-preview-btn" style="margin-top:10px;font-size:11px;">▶ Xem thử hiệu ứng</button>
              </div>
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
            <button class="vno-btn" id="vno-anim-cancel">Hủy bỏ</button>
            <div style="display:flex;gap:6px;">
              <button class="vno-btn" id="vno-anim-clear" style="color:#ef4444;">Xóa hiệu ứng</button>
              <button class="vno-btn vno-btn-primary" id="vno-anim-apply">Áp dụng hiệu ứng</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const targetSelect = overlay.querySelector("#vno-anim-target-select");
      const typeSelect = overlay.querySelector("#vno-anim-type-select");
      const durSelect = overlay.querySelector("#vno-anim-duration-select");
      const delaySelect = overlay.querySelector("#vno-anim-delay-select");
      const previewBox = overlay.querySelector("#vno-anim-preview-box");

      const runPreview = () => {
        if (!previewBox || !typeSelect || !durSelect || !delaySelect) return;
        const type = typeSelect.value;
        const dur = parseInt(durSelect.value, 10) || 500;
        const del = parseInt(delaySelect.value, 10) || 0;
        if (type === "none") {
          previewBox.style.animation = "none";
          previewBox.style.opacity = "1";
          previewBox.style.transform = "none";
          return;
        }
        const kf = this._getKeyframeName(type);
        previewBox.style.animation = "none";
        previewBox.style.opacity = "0";
        void previewBox.offsetWidth;
        previewBox.style.animation = `${kf} ${dur}ms ease-out ${del}ms forwards`;
      };

      targetSelect?.addEventListener("change", () => {
        const conf = this.getObjectAnimation(targetSelect.value);
        typeSelect.value = conf.type || "none";
        durSelect.value = String(conf.duration || 500);
        delaySelect.value = String(conf.delay || 0);
        runPreview();
      });

      typeSelect?.addEventListener("change", runPreview);
      durSelect?.addEventListener("change", runPreview);
      delaySelect?.addEventListener("change", runPreview);
      overlay.querySelector("#vno-anim-preview-btn")?.addEventListener("click", runPreview);

      const close = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => { close(); resolve(false); });
      overlay.querySelector("#vno-anim-cancel")?.addEventListener("click", () => { close(); resolve(false); });

      overlay.querySelector("#vno-anim-clear")?.addEventListener("click", () => {
        this.setObjectAnimation(targetSelect.value, { type: "none", duration: 500, delay: 0 });
        close();
        resolve(true);
      });

      overlay.querySelector("#vno-anim-apply")?.addEventListener("click", () => {
        this.setObjectAnimation(targetSelect.value, {
          type: typeSelect.value,
          duration: parseInt(durSelect.value, 10) || 500,
          delay: parseInt(delaySelect.value, 10) || 0
        });
        close();
        resolve(true);
      });
    });
  }

  startSlideShow(startIndex) {
    if (typeof document === "undefined" || !document.createElement) return false;
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
        let animStyle = "";
        if (shape.animation && shape.animation.type && shape.animation.type !== "none") {
          const kf = this._getKeyframeName(shape.animation.type);
          const dur = shape.animation.duration || 500;
          const del = shape.animation.delay || 0;
          animStyle = `opacity:0;animation:${kf} ${dur}ms ease-out ${del}ms forwards;`;
        }
        if (shape.type === "image" && shape.src) {
          return `<img src="${shape.src}" style="${pos}${animStyle}object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,0.15);" />`;
        }
        const radius = shape.type === "ellipse" ? "50%" : "6px";
        return `<div style="${pos}${animStyle}background:${shape.color || "#3b82f6"};opacity:0.85;border-radius:${radius};"></div>`;
      }).join("");

      let titleAnimStyle = "";
      if (s.titleAnimation && s.titleAnimation.type && s.titleAnimation.type !== "none") {
        const kf = this._getKeyframeName(s.titleAnimation.type);
        const dur = s.titleAnimation.duration || 500;
        const del = s.titleAnimation.delay || 0;
        titleAnimStyle = `opacity:0;animation:${kf} ${dur}ms ease-out ${del}ms forwards;`;
      }

      let bodyAnimStyle = "";
      if (s.bodyAnimation && s.bodyAnimation.type && s.bodyAnimation.type !== "none") {
        const kf = this._getKeyframeName(s.bodyAnimation.type);
        const dur = s.bodyAnimation.duration || 500;
        const del = s.bodyAnimation.delay || 0;
        bodyAnimStyle = `opacity:0;animation:${kf} ${dur}ms ease-out ${del}ms forwards;`;
      }

      content.style.fontFamily = theme.fontFamily || "sans-serif";
      content.style.backgroundColor = theme.bgColor || "#ffffff";

      content.innerHTML = `
        <div class="vno-slide-master-accent" style="background:${theme.accentColor || "#b53818"};"></div>
        <div class="vno-slide-master-logo" style="color:${theme.accentColor || "#b53818"};">${theme.logoText || "VN OFFICE"}</div>
        <div style="position:relative;flex:1;padding-top:20px;">
          <h1 style="font-size:44px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:36px;${titleAnimStyle}">${s.title}</h1>
          <div style="font-size:26px;line-height:1.7;color:${theme.bodyColor || "#334155"};white-space:pre-line;${bodyAnimStyle}">${s.body}</div>
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

  startPresenterMode(startIndex) {
    if (typeof document === "undefined" || !document.createElement) return false;
    const idx = startIndex !== undefined ? startIndex : this.currentSlideIndex;
    let currentShowIdx = idx;
    let secondsElapsed = 0;
    let timerInterval = null;

    const overlay = document.createElement("div");
    overlay.className = "vno-presenter-overlay";

    const formatTime = (secs) => {
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      return `${h}:${m}:${s}`;
    };

    const getClockTime = () => {
      const now = new Date();
      return now.toLocaleTimeString("vi-VN", { hour12: false });
    };

    overlay.innerHTML = `
      <div class="vno-presenter-header">
        <div class="vno-presenter-brand">
          <strong>CHẾ ĐỘ NGƯỜI THUYẾT TRÌNH (PRESENTER VIEW)</strong>
          <span style="font-size:11px;opacity:0.7;margin-left:8px;">• VN Slides</span>
        </div>
        <div class="vno-presenter-clocks">
          <div class="vno-presenter-timer-box" title="Thời gian thuyết trình">
            <span style="font-size:11px;opacity:0.7;">ĐÃ THUYẾT TRÌNH:</span>
            <strong id="vno-presenter-timer">00:00:00</strong>
          </div>
          <div class="vno-presenter-clock-box" title="Đồng hồ thực tế">
            <span style="font-size:11px;opacity:0.7;">ĐỒNG HỒ:</span>
            <strong id="vno-presenter-clock">${getClockTime()}</strong>
          </div>
        </div>
        <button class="vno-btn vno-btn-sm vno-presenter-exit-btn" id="vno-presenter-close">✕ Thoát (Esc)</button>
      </div>

      <div class="vno-presenter-body">
        <!-- Cột trái: Slide hiện tại & Điều hướng -->
        <div class="vno-presenter-left-col">
          <div class="vno-presenter-slide-viewport" id="vno-presenter-slide-view"></div>
          <div class="vno-presenter-nav-bar">
            <button class="vno-btn" id="vno-presenter-prev" title="Trang trước (←)">◄ Trang trước</button>
            <span class="vno-presenter-counter" id="vno-presenter-counter">Trang ${currentShowIdx + 1} / ${this.slides.length}</span>
            <button class="vno-btn vno-btn-primary" id="vno-presenter-next" title="Trang tiếp (Space hoặc →)">Trang tiếp ►</button>
          </div>
        </div>

        <!-- Cột phải: Ghi chú thuyết trình & Trang kế tiếp -->
        <div class="vno-presenter-right-col">
          <!-- Ghi chú -->
          <div class="vno-presenter-notes-box">
            <div class="vno-presenter-box-header">
              <span>📝 Ghi chú người thuyết trình</span>
              <div class="vno-presenter-font-controls">
                <button class="vno-btn vno-btn-sm" id="vno-notes-font-dec" title="Thu nhỏ chữ">A-</button>
                <button class="vno-btn vno-btn-sm" id="vno-notes-font-inc" title="Phóng to chữ">A+</button>
              </div>
            </div>
            <div class="vno-presenter-notes-text" id="vno-presenter-notes-text"></div>
          </div>

          <!-- Trang kế tiếp -->
          <div class="vno-presenter-next-box">
            <div class="vno-presenter-box-header">
              <span>⏭ Trang tiếp theo</span>
            </div>
            <div class="vno-presenter-next-preview" id="vno-presenter-next-preview"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const slideViewEl = overlay.querySelector("#vno-presenter-slide-view");
    const counterEl = overlay.querySelector("#vno-presenter-counter");
    const notesTextEl = overlay.querySelector("#vno-presenter-notes-text");
    const nextPreviewEl = overlay.querySelector("#vno-presenter-next-preview");
    const timerEl = overlay.querySelector("#vno-presenter-timer");
    const clockEl = overlay.querySelector("#vno-presenter-clock");

    let notesFontSize = 16;

    const renderPresenterState = () => {
      const s = this.slides[currentShowIdx];
      const theme = this.masterTheme || {};

      const shapesHtml = (s.shapes || []).map((shape) => {
        const pos = `position:absolute;left:${shape.x * 0.7}px;top:${shape.y * 0.7}px;width:${shape.w * 0.7}px;height:${shape.h * 0.7}px;`;
        if (shape.type === "image" && shape.src) {
          return `<img src="${shape.src}" style="${pos}object-fit:contain;" />`;
        }
        const radius = shape.type === "ellipse" ? "50%" : "4px";
        return `<div style="${pos}background:${shape.color || "#3b82f6"};border-radius:${radius};"></div>`;
      }).join("");

      if (slideViewEl) {
        slideViewEl.innerHTML = `
          <div class="vno-presenter-slide-card" style="font-family:${theme.fontFamily || "sans-serif"};background:${theme.bgColor || "#ffffff"};">
            <div class="vno-slide-master-accent" style="background:${theme.accentColor || "#b53818"};"></div>
            <div style="font-size:10px;font-weight:700;color:${theme.accentColor || "#b53818"};margin-bottom:8px;">${theme.logoText || "VN OFFICE"}</div>
            <h2 style="font-size:24px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:14px;">${s.title}</h2>
            <div style="font-size:14px;line-height:1.6;color:${theme.bodyColor || "#334155"};white-space:pre-line;">${s.body}</div>
            <div style="position:relative;flex:1;min-height:120px;">${shapesHtml}</div>
            <div style="font-size:9px;color:${theme.bodyColor || "#64748b"};display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;margin-top:auto;">
              <span>${theme.footerText || "Tài liệu thuyết trình"}</span>
              <span>Trang ${currentShowIdx + 1} / ${this.slides.length}</span>
            </div>
          </div>
        `;
      }

      if (counterEl) {
        counterEl.textContent = `Trang ${currentShowIdx + 1} / ${this.slides.length}`;
      }

      if (notesTextEl) {
        if (s.notes && s.notes.trim()) {
          notesTextEl.textContent = s.notes;
          notesTextEl.style.fontStyle = "normal";
          notesTextEl.style.color = "#f1f5f9";
        } else {
          notesTextEl.textContent = "(Chưa có ghi chú cho trang chiếu này. Bạn có thể nhập ghi chú ở bảng Ghi chú dưới canvas khi biên tập).";
          notesTextEl.style.fontStyle = "italic";
          notesTextEl.style.color = "#94a3b8";
        }
        notesTextEl.style.fontSize = `${notesFontSize}px`;
      }

      if (nextPreviewEl) {
        if (currentShowIdx < this.slides.length - 1) {
          const nextSlide = this.slides[currentShowIdx + 1];
          nextPreviewEl.innerHTML = `
            <div style="font-weight:700;font-size:13px;color:#38bdf8;margin-bottom:4px;">Trang ${currentShowIdx + 2}: ${nextSlide.title}</div>
            <div style="font-size:11px;color:#cbd5e1;line-height:1.4;white-space:pre-line;">${(nextSlide.body || "").substring(0, 120)}...</div>
          `;
        } else {
          nextPreviewEl.innerHTML = `
            <div style="font-size:12px;color:#94a3b8;font-style:italic;padding:12px 0;">
              Đây là trang chiếu cuối cùng.
            </div>
          `;
        }
      }
    };

    renderPresenterState();

    timerInterval = setInterval(() => {
      secondsElapsed++;
      if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
      if (clockEl) clockEl.textContent = getClockTime();
    }, 1000);

    const closePresenter = () => {
      if (timerInterval) clearInterval(timerInterval);
      document.removeEventListener("keydown", keyHandler);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    const nextSlide = () => {
      if (currentShowIdx < this.slides.length - 1) {
        currentShowIdx++;
        renderPresenterState();
      }
    };

    const prevSlide = () => {
      if (currentShowIdx > 0) {
        currentShowIdx--;
        renderPresenterState();
      }
    };

    overlay.querySelector("#vno-presenter-close")?.addEventListener("click", closePresenter);
    overlay.querySelector("#vno-presenter-next")?.addEventListener("click", nextSlide);
    overlay.querySelector("#vno-presenter-prev")?.addEventListener("click", prevSlide);

    overlay.querySelector("#vno-notes-font-inc")?.addEventListener("click", () => {
      if (notesFontSize < 28) {
        notesFontSize += 2;
        if (notesTextEl) notesTextEl.style.fontSize = `${notesFontSize}px`;
      }
    });

    overlay.querySelector("#vno-notes-font-dec")?.addEventListener("click", () => {
      if (notesFontSize > 12) {
        notesFontSize -= 2;
        if (notesTextEl) notesTextEl.style.fontSize = `${notesFontSize}px`;
      }
    });

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        closePresenter();
      } else if (e.key === " " || e.key === "ArrowRight" || e.key === "PageDown") {
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        prevSlide();
      }
    };

    document.addEventListener("keydown", keyHandler);
    return true;
  }
}
