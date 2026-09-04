/**
 * VN Slides — Enterprise Canvas Controller & Presentation Engine
 */

import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { t } from "../../platform/i18n/i18n.js";

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

export const SLIDE_LAYOUT_TYPES = [
  {
    id: "title-only",
    name: "Tiêu đề",
    nameEn: "Title Slide",
    description: "Chỉ hiển thị tiêu đề lớn ở trung tâm trang chiếu",
    badge: "Độc lập",
    previewSvg: `<svg viewBox="0 0 120 68" width="100%" height="56" fill="none">
      <rect width="120" height="68" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="20" y="24" width="80" height="12" rx="2" fill="#B53818"/>
      <rect x="35" y="40" width="50" height="6" rx="1" fill="#94A3B8"/>
    </svg>`
  },
  {
    id: "title-content",
    name: "Tiêu đề + Nội dung",
    nameEn: "Title and Content",
    description: "Tiêu đề ở trên và một vùng nội dung chính bên dưới",
    badge: "Mặc định",
    previewSvg: `<svg viewBox="0 0 120 68" width="100%" height="56" fill="none">
      <rect width="120" height="68" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="12" y="10" width="60" height="8" rx="1.5" fill="#B53818"/>
      <rect x="12" y="24" width="96" height="34" rx="2" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1"/>
      <line x1="18" y1="32" x2="90" y2="32" stroke="#3B82F6" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="18" y1="38" x2="80" y2="38" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="18" y1="44" x2="65" y2="44" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "two-content",
    name: "Hai nội dung",
    nameEn: "Two Content",
    description: "Tiêu đề ở trên và hai cột nội dung song song cạnh nhau",
    badge: "2 cột",
    previewSvg: `<svg viewBox="0 0 120 68" width="100%" height="56" fill="none">
      <rect width="120" height="68" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="12" y="10" width="60" height="8" rx="1.5" fill="#B53818"/>
      <rect x="12" y="24" width="45" height="34" rx="2" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1"/>
      <line x1="16" y1="32" x2="48" y2="32" stroke="#3B82F6" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="16" y1="38" x2="42" y2="38" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="16" y1="44" x2="45" y2="44" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="63" y="24" width="45" height="34" rx="2" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1"/>
      <line x1="67" y1="32" x2="99" y2="32" stroke="#3B82F6" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="67" y1="38" x2="93" y2="38" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="67" y1="44" x2="96" y2="44" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "blank",
    name: "Trống",
    nameEn: "Blank",
    description: "Trang chiếu trắng hoàn toàn, tự do chèn hình khối và hình ảnh",
    badge: "Tự do",
    previewSvg: `<svg viewBox="0 0 120 68" width="100%" height="56" fill="none">
      <rect width="120" height="68" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="25" y="18" width="70" height="32" rx="2" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3 3"/>
    </svg>`
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
        layoutType: "title-content",
        shapes: [],
        comments: [],
        notes: "Giới thiệu tổng quan về bộ ứng dụng VN Office, nhấn mạnh tính độc lập công nghệ và bảo mật dữ liệu theo tiêu chuẩn quốc gia.",
        titleAnimation: { type: "fadeIn", duration: 600, delay: 100 },
        bodyAnimation: { type: "flyIn", duration: 700, delay: 300 }
      },
      {
        id: 2,
        title: "KIẾN TRÚC HỆ THỐNG PHÂN TẦNG",
        body: "1. VN App UI (Writer, Sheet, Slides đồng bộ phát triển)\n2. VN Shared Platform & Global Command Bus\n3. VN LibreOffice Adapter Layer (UNO Bridge & PyUNO)\n4. LibreOffice Core Engine C++",
        layoutType: "title-content",
        shapes: [],
        comments: [],
        notes: "Làm rõ vai trò của UNO Bridge kết nối giữa tầng giao diện web và tầng lõi LibreOffice C++ headless mà không phát sinh chi phí bản quyền.",
        titleAnimation: { type: "fadeIn", duration: 500, delay: 0 }
      },
      {
        id: 3,
        title: "KẾ HOẠCH TRIỂN KHAI & TIÊU CHUẨN KỸ THUẬT",
        body: "• Hỗ trợ toàn diện định dạng văn bản hành chính theo Nghị định 30/2020/NĐ-CP\n• Tương thích 100% hai chiều với hệ sinh thái OOXML (DOCX, XLSX, PPTX)\n• Tích hợp trợ lý AI bảo mật cục bộ, bảo vệ quyền riêng tư tuyệt đối",
        layoutType: "title-content",
        shapes: [],
        comments: [],
        notes: "Nhấn mạnh khả năng tương thích định dạng DOCX/XLSX/PPTX và tuân thủ Nghị định 30/2020/NĐ-CP về thể thức văn bản hành chính.",
        titleAnimation: { type: "zoomIn", duration: 600, delay: 200 }
      }
    ];
    this.currentSlideIndex = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.slideSorterOverlay = null;
    this._slideSorterKeyHandler = null;
    this._activeShowCleanup = null;
    this._activePresenterCleanup = null;
    this.navEl = null;
    this.canvasEl = null;
    this.titleEl = null;
    this.bodyRowEl = null;
    this.bodyEl = null;
    this.body2El = null;
    this.selectedTarget = null; // "title" | "body" | "body2" | shapeId
    this.commentButtonEl = null;
    this.commentPanelEl = null;

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

    this.bodyRowEl = document.createElement("div");
    this.bodyRowEl.className = "vno-slide-body-row";

    this.bodyEl = document.createElement("div");
    this.bodyEl.className = "vno-slide-body";
    this.bodyEl.contentEditable = "true";
    this.bodyEl.spellcheck = false;

    this.body2El = document.createElement("div");
    this.body2El.className = "vno-slide-body vno-slide-body-col2 vno-slide-body-col-2";
    this.body2El.contentEditable = "true";
    this.body2El.spellcheck = false;
    this.body2El.style.display = "none";

    this.bodyRowEl.appendChild(this.bodyEl);
    this.bodyRowEl.appendChild(this.body2El);

    this.titleEl.addEventListener("input", () => {
      this.slides[this.currentSlideIndex].title = this.titleEl.innerText;
      this._renderThumbnails();
    });

    this.bodyEl.addEventListener("input", () => {
      this.slides[this.currentSlideIndex].body = this.bodyEl.innerText;
      this._renderThumbnails();
    });

    this.body2El.addEventListener("input", () => {
      this.slides[this.currentSlideIndex].body2 = this.body2El.innerText;
      this._renderThumbnails();
    });

    this.titleEl.addEventListener("focus", () => this.setSelectedTarget("title"));
    this.titleEl.addEventListener("click", () => this.setSelectedTarget("title"));
    this.bodyEl.addEventListener("focus", () => this.setSelectedTarget("body"));
    this.bodyEl.addEventListener("click", () => this.setSelectedTarget("body"));
    this.body2El.addEventListener("focus", () => this.setSelectedTarget("body2"));
    this.body2El.addEventListener("click", () => this.setSelectedTarget("body2"));

    this.canvasEl.appendChild(this.titleEl);
    this.canvasEl.appendChild(this.bodyRowEl);
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

    this.commentButtonEl = document.createElement("button");
    this.commentButtonEl.type = "button";
    this.commentButtonEl.className = "vno-slide-comment-indicator";
    this.commentButtonEl.title = "Mở nhận xét của trang chiếu";
    this.commentButtonEl.setAttribute("aria-label", "Mở nhận xét của trang chiếu");
    this.commentButtonEl.innerHTML = `<span aria-hidden="true">◰</span><strong>0</strong>`;
    this.commentButtonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openCommentsPanel(false);
    });
    this.canvasEl.appendChild(this.commentButtonEl);

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

    this._createCommentsPanel(stage);

    this.selectSlide(0);
    this.applySlideMaster(this.masterTheme);
    this._syncUndoRedoState();
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
    if (this.body2El) {
      if (target === "body2") this.body2El.classList.add("is-selected");
      else this.body2El.classList.remove("is-selected");
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
   * @param {"title"|"body"|"body2"|number|string} target
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
    } else if (target === "body2") {
      slide.body2Animation = cfg;
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
    } else if (target === "body2") {
      return slide.body2Animation || { type: "none", duration: 500, delay: 0 };
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

  /** Chèn một sơ đồ gồm nhiều shape nhưng chỉ tạo một bước Undo/Redo. */
  insertDiagram(diagramType = "process", nodeCount = 4) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return false;
    slide.shapes ||= [];
    const count = Math.max(3, Math.min(6, parseInt(nodeCount, 10) || 4));
    const type = ["process", "cycle", "hierarchy", "list"].includes(diagramType) ? diagramType : "process";
    const groupId = `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const palette = ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];
    const nodes = [];

    const addNode = (x, y, w, h, text, level = 0) => {
      const node = {
        id: `${groupId}-node-${nodes.length + 1}`, type: "rect", x, y, w, h,
        color: palette[nodes.length % palette.length], text, diagramGroupId: groupId,
        diagramRole: "node", diagramLevel: level,
        animation: { type: "none", duration: 500, delay: 0 }
      };
      nodes.push(node);
      return node;
    };

    if (type === "process") {
      const w = count === 6 ? 112 : 128;
      const gap = count === 6 ? 28 : 36;
      const total = count * w + (count - 1) * gap;
      const startX = (960 - total) / 2;
      for (let i = 0; i < count; i++) addNode(startX + i * (w + gap), 225, w, 72, t("slidesDialogs.diagramStep", { number: i + 1 }));
    } else if (type === "cycle") {
      const radiusX = 245, radiusY = 145, w = 126, h = 62;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
        addNode(480 + Math.cos(angle) * radiusX - w / 2, 280 + Math.sin(angle) * radiusY - h / 2, w, h, t("slidesDialogs.diagramStep", { number: i + 1 }));
      }
    } else if (type === "hierarchy") {
      addNode(390, 125, 180, 72, t("slidesDialogs.diagramRoot"), 0);
      const childCount = count - 1, w = Math.min(150, 720 / childCount - 20), gap = 24;
      const total = childCount * w + (childCount - 1) * gap;
      const startX = (960 - total) / 2;
      for (let i = 0; i < childCount; i++) addNode(startX + i * (w + gap), 330, w, 68, t("slidesDialogs.diagramChild", { number: i + 1 }), 1);
    } else {
      for (let i = 0; i < count; i++) addNode(245 + (i % 3) * 42, 92 + i * 72, 390 - (i % 3) * 42, 54, t("slidesDialogs.diagramItem", { number: i + 1 }), i % 3);
    }

    const connectors = [];
    const connect = (from, to, arrow = true) => {
      const x1 = from.x + from.w / 2, y1 = from.y + from.h / 2;
      const x2 = to.x + to.w / 2, y2 = to.y + to.h / 2;
      connectors.push({
        id: `${groupId}-connector-${connectors.length + 1}`, type: "connector",
        x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(1, Math.abs(x2 - x1)), h: Math.max(1, Math.abs(y2 - y1)),
        x1, y1, x2, y2, color: "#475569", arrowEnd: arrow,
        diagramGroupId: groupId, diagramRole: "connector"
      });
    };
    if (type === "process" || type === "list") {
      for (let i = 0; i < nodes.length - 1; i++) connect(nodes[i], nodes[i + 1], type === "process");
    } else if (type === "cycle") {
      for (let i = 0; i < nodes.length; i++) connect(nodes[i], nodes[(i + 1) % nodes.length], true);
    } else {
      for (let i = 1; i < nodes.length; i++) connect(nodes[0], nodes[i], false);
    }

    const insertedShapes = [...connectors, ...nodes];
    slide.shapes.push(...insertedShapes);
    this.undoStack.push({ type: "diagram-insert", slideIndex: this.currentSlideIndex, shapes: this._cloneShapes(insertedShapes), diagramGroupId: groupId });
    this.redoStack = [];
    this._syncUndoRedoState();
    this.setSelectedTarget(nodes[0]?.id || null);
    this._renderShapesLayer();
    return { diagramGroupId: groupId, shapes: insertedShapes };
  }

  _cloneShapes(shapes) {
    return JSON.parse(JSON.stringify(shapes || []));
  }

  _escapeShapeText(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  _shapePresentationHtml(shape) {
    if (shape.type === "connector") {
      const marker = shape.arrowEnd ? "marker-end='url(#vno-show-arrow)'" : "";
      return `<svg class="vno-show-connector" style="position:absolute;inset:0;width:960px;height:540px;overflow:visible" viewBox="0 0 960 540"><defs><marker id="vno-show-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="${shape.color || "#475569"}"/></marker></defs><line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.color || "#475569"}" stroke-width="3" ${marker}/></svg>`;
    }
    const pos = `position:absolute;left:${shape.x}px;top:${shape.y}px;width:${shape.w}px;height:${shape.h}px;`;
    let animStyle = "";
    if (shape.animation?.type && shape.animation.type !== "none") {
      animStyle = `opacity:0;animation:${this._getKeyframeName(shape.animation.type)} ${shape.animation.duration || 500}ms ease-out ${shape.animation.delay || 0}ms forwards;`;
    }
    if (shape.type === "image" && shape.src) return `<img src="${shape.src}" style="${pos}${animStyle}object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,.15)" />`;
    if (shape.type === "video" && shape.src) return `<video src="${shape.src}" controls style="${pos}${animStyle}box-shadow:0 2px 8px rgba(0,0,0,.15)"></video>`;
    if (shape.type === "audio" && shape.src) return `<audio src="${shape.src}" controls style="${pos}${animStyle}"></audio>`;
    const radius = shape.type === "ellipse" ? "50%" : "6px";
    const text = shape.text !== undefined ? `<span class="vno-show-shape-text">${this._escapeShapeText(shape.text)}</span>` : "";
    return `<div class="vno-show-shape" style="${pos}${animStyle}background:${shape.color || "#3b82f6"};opacity:.9;border-radius:${radius}">${text}</div>`;
  }

  _shapeSorterHtml(shape) {
    if (shape.type === "connector") {
      return `<svg class="vno-sorter-shape" viewBox="0 0 960 540" preserveAspectRatio="none"><line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.color || "#475569"}" stroke-width="8"/></svg>`;
    }
    if (shape.type !== "rect" && shape.type !== "ellipse") return "";
    const style = `left:${shape.x / 9.6}%;top:${shape.y / 5.4}%;width:${shape.w / 9.6}%;height:${shape.h / 5.4}%;background:${shape.color || "#3b82f6"};border-radius:${shape.type === "ellipse" ? "50%" : "4px"}`;
    return `<div class="vno-sorter-shape-node" style="${style}">${this._escapeShapeText(shape.text || "")}</div>`;
  }

  updateShapeText(shapeId, text) {
    const shape = this.slides[this.currentSlideIndex]?.shapes?.find(item => String(item.id) === String(shapeId));
    if (!shape || shape.type === "connector") return false;
    shape.text = String(text || "").replace(/\r?\n/g, " ");
    this._renderThumbnails();
    if (this.slideSorterOverlay) this._renderSlideSorterGrid();
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

  /**
   * Chèn video/audio THẬT (đã đọc thành Data URL từ tệp người dùng chọn) vào slide hiện tại.
   * Giới hạn kích thước hợp lý: cảnh báo (không chặn) nếu tệp > MAX_MEDIA_SIZE_MB, vì Data URL
   * nhúng trực tiếp vào bộ nhớ/FODP sẽ phình to theo kích thước tệp gốc (base64 ~+33%).
   * @param {"video"|"audio"} mediaType
   * @param {string} dataUrl
   * @param {number} [sizeBytes]
   */
  insertMedia(mediaType, dataUrl, sizeBytes = 0) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !dataUrl || (mediaType !== "video" && mediaType !== "audio")) return false;
    if (!Array.isArray(slide.shapes)) slide.shapes = [];

    const MAX_MEDIA_SIZE_MB = 10;
    if (sizeBytes > MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      console.warn(`[VN Slides] Tệp media ${(sizeBytes / 1024 / 1024).toFixed(1)}MB vượt ngưỡng khuyến nghị ${MAX_MEDIA_SIZE_MB}MB — có thể làm chậm lưu/mở tệp vì được nhúng dạng Data URL.`);
    }

    const offset = slide.shapes.length * 24;
    const newShape = {
      id: Date.now(),
      type: mediaType,
      x: 100 + offset,
      y: 100 + offset,
      w: mediaType === "video" ? 320 : 260,
      h: mediaType === "video" ? 200 : 40,
      src: dataUrl,
      animation: { type: "none", duration: 500, delay: 0 }
    };
    slide.shapes.push(newShape);
    this._recordShapeHistory("shape-add", newShape);

    this.setSelectedTarget(newShape.id);
    this._renderShapesLayer();
    return true;
  }

  insertVideo(dataUrl, sizeBytes) {
    return this.insertMedia("video", dataUrl, sizeBytes);
  }

  insertAudio(dataUrl, sizeBytes) {
    return this.insertMedia("audio", dataUrl, sizeBytes);
  }

  /**
   * Xóa một shape/media thật khỏi slide hiện tại theo id, có Undo/Redo qua stack Slides hiện có.
   * @param {string|number} [shapeId] Mặc định = shape đang được chọn (selectedTarget)
   */
  deleteShape(shapeId = this.selectedTarget) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !Array.isArray(slide.shapes) || shapeId == null) return false;
    const index = slide.shapes.findIndex((sh) => String(sh.id) === String(shapeId));
    if (index < 0) return false;
    const [removed] = slide.shapes.splice(index, 1);
    this._recordShapeHistory("shape-delete", removed);
    if (String(this.selectedTarget) === String(shapeId)) this.setSelectedTarget(null);
    this._renderShapesLayer();
    return true;
  }

  _recordShapeHistory(type, shape) {
    this.undoStack.push({ type, slideIndex: this.currentSlideIndex, shape: { ...shape } });
    this.redoStack = [];
    this._syncUndoRedoState();
  }

  /**
   * Đồng bộ trạng thái enabled của common.edit.undo/redo trên Command Bus với stack thật.
   * Bắt buộc phải gọi sau MỌI thay đổi undoStack/redoStack — commandId này dùng chung toàn Suite
   * (Writer/Sheet cũng ghi vào cùng state), nên nếu Slides không tự đồng bộ, nút Undo/Redo và
   * phím tắt Ctrl+Z/Ctrl+Y sẽ bị kẹt ở trạng thái do app khác để lại lúc khởi động trang.
   */
  _syncUndoRedoState() {
    if (typeof globalCommandBus === "undefined" || !globalCommandBus?.updateState) return;
    globalCommandBus.updateState("common.edit.undo", { enabled: this.undoStack.length > 0 });
    globalCommandBus.updateState("common.edit.redo", { enabled: this.redoStack.length > 0 });
  }

  _renderShapesLayer() {
    if (!this.shapesLayer) return;
    this.shapesLayer.innerHTML = "";
    const slide = this.slides[this.currentSlideIndex];
    const shapes = (slide && slide.shapes) || [];

    shapes.forEach((shape) => {
      const el = document.createElement("div");
      const isSel = String(this.selectedTarget) === String(shape.id);
      const isConnector = shape.type === "connector";
      el.className = `vno-slide-shape-item ${isConnector ? "is-connector" : ""} ${shape.diagramRole === "node" ? "is-diagram-node" : ""} ${isSel ? "is-selected" : ""}`;
      el.dataset.shapeId = String(shape.id);
      el.style.cssText = `position:absolute; left:${shape.x}px; top:${shape.y}px; width:${shape.w}px; height:${shape.h}px; pointer-events:${isConnector ? "none" : "auto"}; cursor:${shape.diagramRole === "node" ? "move" : "pointer"};z-index:${isConnector ? 0 : 1};`;

      if (isConnector) {
        const pad = 8;
        const leftToRight = shape.x2 >= shape.x1;
        const topToBottom = shape.y2 >= shape.y1;
        const sx = (leftToRight ? 0 : shape.w) + pad;
        const sy = (topToBottom ? 0 : shape.h) + pad;
        const ex = (leftToRight ? shape.w : 0) + pad;
        const ey = (topToBottom ? shape.h : 0) + pad;
        const markerId = `arrow-${String(shape.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
        el.style.left = `${shape.x - pad}px`; el.style.top = `${shape.y - pad}px`;
        el.style.width = `${shape.w + pad * 2}px`; el.style.height = `${shape.h + pad * 2}px`;
        el.innerHTML = `<svg viewBox="0 0 ${shape.w + pad * 2} ${shape.h + pad * 2}" width="100%" height="100%" overflow="visible"><defs><marker id="${markerId}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="${shape.color || "#475569"}"/></marker></defs><line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${shape.color || "#475569"}" stroke-width="3" ${shape.arrowEnd ? `marker-end="url(#${markerId})"` : ""}/></svg>`;
      } else if (shape.type === "image" && shape.src) {
        const img = document.createElement("img");
        img.src = shape.src;
        img.style.cssText = "width:100%;height:100%;object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,0.15);pointer-events:none;";
        el.appendChild(img);
      } else if (shape.type === "video" && shape.src) {
        const video = document.createElement("video");
        video.src = shape.src;
        video.controls = true;
        video.style.cssText = "width:100%;height:100%;box-shadow:0 2px 8px rgba(0,0,0,0.15);";
        el.appendChild(video);
      } else if (shape.type === "audio" && shape.src) {
        const audio = document.createElement("audio");
        audio.src = shape.src;
        audio.controls = true;
        audio.style.cssText = "width:100%;height:100%;";
        el.appendChild(audio);
      } else {
        el.style.backgroundColor = shape.color || "#3b82f6";
        el.style.opacity = "0.85";
        el.style.borderRadius = shape.type === "ellipse" ? "50%" : "6px";
        if (shape.text !== undefined) {
          const textEl = document.createElement("div");
          textEl.className = "vno-diagram-node-text";
          textEl.textContent = shape.text || "";
          textEl.contentEditable = "false";
          textEl.setAttribute("role", "textbox");
          textEl.setAttribute("aria-label", shape.text || t("slidesDialogs.diagramItem", { number: 1 }));
          const startEditing = (initialText) => {
            if (textEl.contentEditable !== "true") textEl.dataset.originalText = shape.text || "";
            textEl.contentEditable = "true";
            textEl.focus();
            if (initialText !== undefined) textEl.textContent = initialText;
          };
          textEl.addEventListener("input", () => this.updateShapeText(shape.id, textEl.textContent));
          textEl.addEventListener("blur", () => {
            textEl.contentEditable = "false";
            const before = textEl.dataset.originalText ?? "";
            const after = shape.text || "";
            if (before !== after) {
              this.undoStack.push({ type: "shape-text-edit", slideIndex: this.currentSlideIndex, shapeId: shape.id, before, after });
              this.redoStack = [];
              this._syncUndoRedoState();
            }
          });
          textEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter") { event.preventDefault(); textEl.blur(); }
            event.stopPropagation();
          });
          el.addEventListener("dblclick", (event) => { event.stopPropagation(); startEditing(); });
          el.tabIndex = 0;
          el.addEventListener("keydown", (event) => {
            if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
              event.preventDefault(); event.stopPropagation(); startEditing(event.key);
              this.updateShapeText(shape.id, event.key);
            }
          });
          el.appendChild(textEl);
        }
      }

      if (isSel) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "vno-shape-delete-btn";
        delBtn.title = "Xóa đối tượng này";
        delBtn.textContent = "×";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteShape(shape.id);
        });
        el.appendChild(delBtn);
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
        el.focus?.();
      });

      if (shape.diagramRole === "node") this._attachDiagramNodeDrag(el, shape);

      this.shapesLayer.appendChild(el);
    });

    this._renderThumbnails();
  }

  _attachDiagramNodeDrag(el, shape) {
    el.addEventListener("pointerdown", (event) => {
      if (event.target?.classList?.contains("vno-diagram-node-text") && event.target.contentEditable === "true") return;
      const startX = event.clientX, startY = event.clientY, originX = shape.x, originY = shape.y;
      let moved = false;
      const move = (moveEvent) => {
        const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) < 3) return;
        moved = true;
        shape.x = Math.max(0, Math.min(960 - shape.w, originX + dx));
        shape.y = Math.max(0, Math.min(540 - shape.h, originY + dy));
        el.style.left = `${shape.x}px`; el.style.top = `${shape.y}px`;
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (moved) {
          this.undoStack.push({ type: "diagram-node-move", slideIndex: this.currentSlideIndex, shapeId: shape.id, from: { x: originX, y: originY }, to: { x: shape.x, y: shape.y } });
          this.redoStack = [];
          this._syncUndoRedoState();
          this._renderThumbnails();
          if (this.slideSorterOverlay) this._renderSlideSorterGrid();
        }
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  }

  _applyLayoutToDom(layoutType) {
    layoutType = layoutType || "title-content";
    if (this.canvasEl) {
      this.canvasEl.dataset.layout = layoutType;
    }

    if (layoutType === "blank") {
      if (this.titleEl) this.titleEl.style.display = "none";
      if (this.bodyRowEl) this.bodyRowEl.style.display = "none";
    } else if (layoutType === "title-only") {
      if (this.titleEl) {
        this.titleEl.style.display = "block";
        this.titleEl.classList.add("is-title-only");
      }
      if (this.bodyRowEl) this.bodyRowEl.style.display = "none";
    } else if (layoutType === "two-content") {
      if (this.titleEl) {
        this.titleEl.style.display = "block";
        this.titleEl.classList.remove("is-title-only");
      }
      if (this.bodyRowEl) {
        this.bodyRowEl.style.display = "flex";
      }
      if (this.bodyEl) this.bodyEl.style.display = "block";
      if (this.body2El) this.body2El.style.display = "block";
    } else {
      // "title-content" (default)
      if (this.titleEl) {
        this.titleEl.style.display = "block";
        this.titleEl.classList.remove("is-title-only");
      }
      if (this.bodyRowEl) {
        this.bodyRowEl.style.display = "flex";
      }
      if (this.bodyEl) this.bodyEl.style.display = "block";
      if (this.body2El) this.body2El.style.display = "none";
    }
  }

  _renderThumbnails() {
    if (!this.slideListContainer) return;
    this.slideListContainer.innerHTML = "";
    const theme = this.masterTheme || {};
    this.slides.forEach((slide, idx) => {
      const item = document.createElement("div");
      item.className = `vno-slide-thumb-item ${idx === this.currentSlideIndex ? "is-active" : ""}`;
      const layout = slide.layoutType || "title-content";

      let cardInner = "";
      if (layout === "blank") {
        cardInner = `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-style:italic;font-size:9px;">
            Trang trống
          </div>
        `;
      } else if (layout === "title-only") {
        cardInner = `
          <div style="height:2px;background:${theme.accentColor || "#b53818"};margin-bottom:3px;"></div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:bold;font-size:8px;color:${theme.titleColor || "#0f172a"};padding:2px;">
            ${(slide.title || "Tiêu đề").substring(0, 32)}
          </div>
        `;
      } else if (layout === "two-content") {
        cardInner = `
          <div style="height:2px;background:${theme.accentColor || "#b53818"};margin-bottom:3px;"></div>
          <div style="font-weight:bold;color:${theme.titleColor || "#0f172a"};margin-bottom:2px;">${(slide.title || "").substring(0, 22)}...</div>
          <div style="display:flex;gap:4px;flex:1;font-size:6px;color:${theme.bodyColor || "#64748b"};line-height:1.1;">
            <div style="flex:1;overflow:hidden;">${(slide.body || "").substring(0, 20)}...</div>
            <div style="flex:1;overflow:hidden;border-left:1px dashed #cbd5e1;padding-left:2px;">${(slide.body2 || "").substring(0, 20)}...</div>
          </div>
        `;
      } else {
        // title-content
        cardInner = `
          <div style="height:2px;background:${theme.accentColor || "#b53818"};margin-bottom:3px;"></div>
          <div style="font-weight:bold;color:${theme.titleColor || "#0f172a"};margin-bottom:4px;">${(slide.title || "").substring(0, 24)}...</div>
          <div style="color:${theme.bodyColor || "#64748b"};">${(slide.body || "").substring(0, 36)}...</div>
        `;
      }

      item.innerHTML = `
        <span class="vno-slide-thumb-num">${idx + 1}</span>
        <div class="vno-slide-thumb-card" style="background:${theme.bgColor || "#ffffff"};font-family:${theme.fontFamily || "sans-serif"};">
          ${cardInner}
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
    const layout = s.layoutType || "title-content";

    this._applyLayoutToDom(layout);

    if (this.titleEl) this.titleEl.innerText = s.title || "";
    if (this.bodyEl) this.bodyEl.innerText = s.body || "";
    if (this.body2El) this.body2El.innerText = s.body2 || "";

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
    this._renderCommentsUi();

    if (this.options.onChange) {
      this.options.onChange(this.currentSlideIndex + 1, this.slides.length);
    }
  }

  applySlideLayout(layoutType, recordUndo = true) {
    const s = this.slides[this.currentSlideIndex];
    if (!s) return false;
    const valid = SLIDE_LAYOUT_TYPES.some(l => l.id === layoutType);
    if (!valid) return false;

    const oldLayout = s.layoutType || "title-content";
    if (recordUndo && oldLayout !== layoutType) {
      this.undoStack.push({
        type: "layout",
        index: this.currentSlideIndex,
        oldLayout,
        newLayout: layoutType
      });
      this.redoStack = [];
      this._syncUndoRedoState();
    }

    s.layoutType = layoutType;
    if (layoutType === "two-content" && s.body2 === undefined) {
      s.body2 = "• Nhập nội dung cột 2 tại đây...\n• Điểm bổ sung";
    }

    this._applyLayoutToDom(layoutType);
    if (this.body2El && s.body2 !== undefined) {
      this.body2El.innerText = s.body2;
    }
    this._renderThumbnails();
    return true;
  }

  getSlideLayout() {
    const s = this.slides[this.currentSlideIndex];
    return (s && s.layoutType) || "title-content";
  }

  addNewSlide(recordUndo = true, layoutType = "title-content") {
    const newSlide = {
      id: Date.now(),
      title: layoutType === "blank" ? "" : "Tiêu đề trang chiếu mới",
      body: layoutType === "blank" ? "" : "• Nhập nội dung chính tại đây...\n• Trình bày các điểm nổi bật",
      body2: layoutType === "two-content" ? "• Nhập nội dung cột 2 tại đây...\n• Điểm thứ hai" : undefined,
      layoutType,
      shapes: [],
      notes: "",
      comments: []
    };
    this.slides.push(newSlide);
    const newIdx = this.slides.length - 1;
    if (recordUndo) {
      this.undoStack.push({ type: "add", index: newIdx, slide: newSlide });
      this.redoStack = [];
      this._syncUndoRedoState();
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
      body2: cur.body2,
      layoutType: cur.layoutType || "title-content",
      shapes: (cur.shapes || []).map(s => ({ ...s, animation: s.animation ? { ...s.animation } : undefined })),
      notes: cur.notes || "",
      titleAnimation: cur.titleAnimation ? { ...cur.titleAnimation } : undefined,
      bodyAnimation: cur.bodyAnimation ? { ...cur.bodyAnimation } : undefined,
      body2Animation: cur.body2Animation ? { ...cur.body2Animation } : undefined,
      transition: cur.transition ? { ...cur.transition } : undefined,
      comments: (cur.comments || []).map(comment => ({ ...comment, id: `${comment.id}-copy-${Date.now()}` }))
    };
    const targetIdx = this.currentSlideIndex + 1;
    this.slides.splice(targetIdx, 0, dup);
    if (recordUndo) {
      this.undoStack.push({ type: "add", index: targetIdx, slide: dup });
      this.redoStack = [];
      this._syncUndoRedoState();
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
      this._syncUndoRedoState();
    }
    const nextIdx = Math.max(0, delIdx - 1);
    this.selectSlide(nextIdx);
    return true;
  }

  /**
   * Di chuyển một slide trong mảng dữ liệu thật và ghi lịch sử hoàn tác.
   */
  moveSlide(fromIndex, toIndex, recordUndo = true) {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
        fromIndex < 0 || fromIndex >= this.slides.length ||
        toIndex < 0 || toIndex >= this.slides.length || fromIndex === toIndex) return false;

    const selectedSlide = this.slides[this.currentSlideIndex];
    const [movedSlide] = this.slides.splice(fromIndex, 1);
    this.slides.splice(toIndex, 0, movedSlide);
    if (recordUndo) {
      this.undoStack.push({ type: "move", fromIndex, toIndex });
      this.redoStack = [];
      this._syncUndoRedoState();
    }
    this.currentSlideIndex = Math.max(0, this.slides.indexOf(selectedSlide));
    this.selectSlide(this.currentSlideIndex);
    this._renderSlideSorterGrid();
    return true;
  }

  openSlideSorter() {
    if (this.slideSorterOverlay || typeof document === "undefined") return false;
    const overlay = document.createElement("div");
    overlay.className = "vno-slide-sorter-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Bộ sắp xếp trang chiếu");
    overlay.innerHTML = `
      <header class="vno-slide-sorter-header">
        <div><strong>Bộ sắp xếp trang chiếu</strong><span>Kéo và thả để thay đổi thứ tự</span></div>
        <button type="button" class="vno-slide-sorter-close" aria-label="Đóng bộ sắp xếp" title="Đóng (Esc)">×</button>
      </header>
      <main class="vno-slide-sorter-grid" aria-live="polite"></main>
    `;
    overlay.querySelector(".vno-slide-sorter-close")?.addEventListener("click", () => this.closeSlideSorter());
    this._slideSorterKeyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeSlideSorter();
      }
    };
    document.addEventListener("keydown", this._slideSorterKeyHandler);
    document.body.appendChild(overlay);
    this.slideSorterOverlay = overlay;
    this._renderSlideSorterGrid();
    overlay.querySelector(".vno-slide-sorter-close")?.focus();
    return true;
  }

  closeSlideSorter() {
    if (!this.slideSorterOverlay) return false;
    if (this._slideSorterKeyHandler && typeof document !== "undefined") {
      document.removeEventListener("keydown", this._slideSorterKeyHandler);
    }
    this.slideSorterOverlay.remove();
    this.slideSorterOverlay = null;
    this._slideSorterKeyHandler = null;
    return true;
  }

  _renderSlideSorterGrid() {
    const grid = this.slideSorterOverlay?.querySelector(".vno-slide-sorter-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const theme = this.masterTheme || {};
    const escapeHtml = (value) => String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
    this.slides.forEach((slide, index) => {
      const item = document.createElement("article");
      item.className = `vno-slide-sorter-item ${index === this.currentSlideIndex ? "is-current" : ""}`;
      item.draggable = true;
      item.dataset.slideIndex = String(index);
      item.tabIndex = 0;
      item.setAttribute("aria-label", `Trang chiếu ${index + 1}: ${slide.title || "Không có tiêu đề"}`);
      const timingLabel = typeof slide.rehearsedDuration === "number"
        ? `<div class="vno-slide-sorter-timing" title="Thời gian tập dượt đã lưu">⏱ ${Math.round(slide.rehearsedDuration)}s</div>`
        : "";
      const commentBadge = (slide.comments || []).length > 0
        ? `<div class="vno-slide-sorter-comments" title="${slide.comments.length} nhận xét">💬 ${slide.comments.length}</div>`
        : "";
      item.innerHTML = `
        <div class="vno-slide-sorter-number">${index + 1}</div>
        ${timingLabel}
        ${commentBadge}
        <div class="vno-slide-sorter-preview" style="background:${theme.bgColor || "#fff"};font-family:${theme.fontFamily || "sans-serif"}">
          <div class="vno-slide-sorter-accent" style="background:${theme.accentColor || "#b53818"}"></div>
          <div class="vno-slide-sorter-title" style="color:${theme.titleColor || "#0f172a"}">${escapeHtml(slide.title || "Trang chiếu trống")}</div>
          <div class="vno-slide-sorter-body" style="color:${theme.bodyColor || "#475569"}">${escapeHtml(slide.body)}</div>
          ${(slide.shapes || []).map(shape => this._shapeSorterHtml(shape)).join("")}
        </div>
        <div class="vno-slide-sorter-actions">
          <button type="button" data-action="duplicate" title="Nhân đôi trang chiếu ${index + 1}">Nhân đôi</button>
          <button type="button" data-action="delete" title="Xóa trang chiếu ${index + 1}" ${this.slides.length <= 1 ? "disabled" : ""}>Xóa</button>
        </div>`;

      item.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", String(index));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        item.classList.add("is-dragging");
      });
      item.addEventListener("dragend", () => item.classList.remove("is-dragging"));
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        const fromIndex = Number(event.dataTransfer?.getData("text/plain"));
        this.moveSlide(fromIndex, index);
      });
      item.addEventListener("dblclick", () => {
        this.selectSlide(index);
        this.closeSlideSorter();
      });
      item.querySelector('[data-action="duplicate"]')?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.selectSlide(index);
        this.duplicateCurrentSlide();
        this._renderSlideSorterGrid();
      });
      item.querySelector('[data-action="delete"]')?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.selectSlide(index);
        this.deleteCurrentSlide();
        this._renderSlideSorterGrid();
      });
      grid.appendChild(item);
    });
  }

  undo() {
    const result = this._undoImpl();
    this._syncUndoRedoState();
    return result;
  }

  _undoImpl() {
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
    } else if (action.type === "layout") {
      const s = this.slides[action.index];
      if (s) {
        s.layoutType = action.oldLayout;
        this.redoStack.push({
          type: "layout",
          index: action.index,
          oldLayout: action.oldLayout,
          newLayout: action.newLayout
        });
        this.selectSlide(action.index);
        return true;
      }
    } else if (action.type === "move") {
      this.moveSlide(action.toIndex, action.fromIndex, false);
      this.redoStack.push(action);
      return true;
    } else if (action.type === "comment-add" || action.type === "comment-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      slide.comments ||= [];
      if (action.type === "comment-add") {
        const idx = slide.comments.findIndex(comment => comment.id === action.comment.id);
        if (idx >= 0) slide.comments.splice(idx, 1);
      } else {
        slide.comments.splice(Math.min(action.commentIndex, slide.comments.length), 0, { ...action.comment });
      }
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderCommentsUi();
      return true;
    } else if (action.type === "diagram-insert") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      const ids = new Set(action.shapes.map(shape => String(shape.id)));
      slide.shapes = (slide.shapes || []).filter(shape => !ids.has(String(shape.id)));
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shape-text-edit") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.text = action.before;
      this.redoStack.push(action); this.selectSlide(action.slideIndex); this._renderShapesLayer(); return true;
    } else if (action.type === "diagram-node-move") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.x = action.from.x; shape.y = action.from.y;
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shape-add" || action.type === "shape-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      if (action.type === "shape-add") {
        const idx = slide.shapes.findIndex((sh) => String(sh.id) === String(action.shape.id));
        if (idx >= 0) slide.shapes.splice(idx, 1);
      } else {
        slide.shapes.push({ ...action.shape });
      }
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    }
    return false;
  }

  redo() {
    const result = this._redoImpl();
    this._syncUndoRedoState();
    return result;
  }

  _redoImpl() {
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
    } else if (action.type === "layout") {
      const s = this.slides[action.index];
      if (s) {
        s.layoutType = action.newLayout;
        this.undoStack.push({
          type: "layout",
          index: action.index,
          oldLayout: action.oldLayout,
          newLayout: action.newLayout
        });
        this.selectSlide(action.index);
        return true;
      }
    } else if (action.type === "move") {
      this.moveSlide(action.fromIndex, action.toIndex, false);
      this.undoStack.push(action);
      return true;
    } else if (action.type === "comment-add" || action.type === "comment-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      slide.comments ||= [];
      if (action.type === "comment-add") {
        slide.comments.splice(Math.min(action.commentIndex, slide.comments.length), 0, { ...action.comment });
      } else {
        const idx = slide.comments.findIndex(comment => comment.id === action.comment.id);
        if (idx >= 0) slide.comments.splice(idx, 1);
      }
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderCommentsUi();
      return true;
    } else if (action.type === "diagram-insert") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      const existing = new Set((slide.shapes || []).map(shape => String(shape.id)));
      slide.shapes ||= [];
      slide.shapes.push(...this._cloneShapes(action.shapes.filter(shape => !existing.has(String(shape.id)))));
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shape-text-edit") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.text = action.after;
      this.undoStack.push(action); this.selectSlide(action.slideIndex); this._renderShapesLayer(); return true;
    } else if (action.type === "diagram-node-move") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.x = action.to.x; shape.y = action.to.y;
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shape-add" || action.type === "shape-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      if (action.type === "shape-add") {
        slide.shapes.push({ ...action.shape });
      } else {
        const idx = slide.shapes.findIndex((sh) => String(sh.id) === String(action.shape.id));
        if (idx >= 0) slide.shapes.splice(idx, 1);
      }
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    }
    return false;
  }

  _createCommentsPanel(stage) {
    const panel = document.createElement("aside");
    panel.className = "vno-slide-comments-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", t("slidesDialogs.commentsLabel"));
    panel.innerHTML = `
      <header><strong>${t("slidesDialogs.commentsLabel")}</strong><button type="button" data-comment-close aria-label="${t("slidesDialogs.close")}">×</button></header>
      <div class="vno-slide-comments-list" aria-live="polite"></div>
      <label class="vno-slide-comment-compose">${t("slidesDialogs.newComment")}
        <textarea rows="3" placeholder="${t("slidesDialogs.commentPlaceholder")}"></textarea>
      </label>
      <button type="button" class="vno-slide-comment-add">${t("slidesDialogs.addComment")}</button>`;
    panel.querySelector("[data-comment-close]")?.addEventListener("click", () => this.closeCommentsPanel());
    panel.querySelector(".vno-slide-comment-add")?.addEventListener("click", () => {
      const input = panel.querySelector("textarea");
      if (this.addComment(input?.value || "")) input.value = "";
    });
    panel.querySelector("textarea")?.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        panel.querySelector(".vno-slide-comment-add")?.click();
      }
    });
    stage.appendChild(panel);
    this.commentPanelEl = panel;
  }

  openCommentsPanel(focusInput = true) {
    if (!this.commentPanelEl) return false;
    this.commentPanelEl.hidden = false;
    this._renderCommentsUi();
    if (focusInput) this.commentPanelEl.querySelector("textarea")?.focus();
    return true;
  }

  closeCommentsPanel() {
    if (!this.commentPanelEl) return false;
    this.commentPanelEl.hidden = true;
    return true;
  }

  addComment(text, author = "Người dùng") {
    const cleanText = String(text || "").trim();
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !cleanText) return false;
    slide.comments ||= [];
    const comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: cleanText,
      author: String(author || "Người dùng"),
      timestamp: new Date().toISOString()
    };
    const commentIndex = slide.comments.length;
    slide.comments.push(comment);
    this.undoStack.push({ type: "comment-add", slideIndex: this.currentSlideIndex, comment: { ...comment }, commentIndex });
    this.redoStack = [];
    this._syncUndoRedoState();
    this._renderCommentsUi();
    return comment;
  }

  deleteComment(commentId) {
    const slide = this.slides[this.currentSlideIndex];
    const commentIndex = (slide?.comments || []).findIndex(comment => comment.id === commentId);
    if (!slide || commentIndex < 0) return false;
    const [comment] = slide.comments.splice(commentIndex, 1);
    this.undoStack.push({ type: "comment-delete", slideIndex: this.currentSlideIndex, comment: { ...comment }, commentIndex });
    this.redoStack = [];
    this._syncUndoRedoState();
    this._renderCommentsUi();
    return true;
  }

  _renderCommentsUi() {
    const comments = this.slides[this.currentSlideIndex]?.comments || [];
    if (this.commentButtonEl) {
      this.commentButtonEl.hidden = comments.length === 0;
      const count = this.commentButtonEl.querySelector("strong");
      if (count) count.textContent = String(comments.length);
    }
    const list = this.commentPanelEl?.querySelector(".vno-slide-comments-list");
    if (list) {
      list.innerHTML = "";
      if (!comments.length) {
        const empty = document.createElement("p");
        empty.className = "vno-slide-comments-empty";
        empty.textContent = "Trang chiếu này chưa có nhận xét.";
        list.appendChild(empty);
      }
      comments.forEach(comment => {
        const item = document.createElement("article");
        item.className = "vno-slide-comment-item";
        const meta = document.createElement("div");
        meta.className = "vno-slide-comment-meta";
        const identity = document.createElement("span");
        identity.textContent = `${comment.author} · ${new Date(comment.timestamp).toLocaleString("vi-VN")}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Xóa";
        remove.setAttribute("aria-label", `Xóa nhận xét của ${comment.author}`);
        remove.addEventListener("click", () => this.deleteComment(comment.id));
        meta.append(identity, remove);
        const body = document.createElement("p");
        body.textContent = comment.text;
        item.append(meta, body);
        list.appendChild(item);
      });
    }
    this._renderThumbnails();
    this._renderSlideSorterGrid();
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
    if (this.body2El) {
      this.body2El.style.color = this.masterTheme.bodyColor || "#334155";
      this.body2El.style.fontFamily = this.masterTheme.fontFamily;
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
        <span>${this.masterTheme?.footerText || "VN Office Slides"}</span>
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
            <span>${t("slidesDialogs.masterTitle")}</span>
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
            <button class="vno-btn" id="vno-master-cancel">${t("slidesDialogs.cancel")}</button>
            <button class="vno-btn vno-btn-primary" id="vno-master-apply">${t("slidesDialogs.applyMaster")}</button>
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

  showDiagramDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay vno-diagram-dialog";
      const types = [
        ["process", "diagramProcess", "1 → 2 → 3"],
        ["cycle", "diagramCycle", "↻"],
        ["hierarchy", "diagramHierarchy", "1\n└ 2  3"],
        ["list", "diagramList", "1\n  2\n    3"]
      ];
      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width:620px" role="dialog" aria-modal="true" aria-labelledby="vno-diagram-title">
          <div class="vno-dialog-header"><span id="vno-diagram-title">${t("slidesDialogs.diagramTitle")}</span><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}">&times;</button></div>
          <div class="vno-dialog-body">
            <p class="vno-diagram-hint">${t("slidesDialogs.diagramHint")}</p>
            <div class="vno-diagram-type-grid">${types.map(([id, key, preview], index) => `<button type="button" class="vno-diagram-type ${index === 0 ? "is-selected" : ""}" data-diagram-type="${id}" aria-pressed="${index === 0}"><span class="vno-diagram-type-preview">${preview.replace(/\n/g, "<br>")}</span><strong>${t(`slidesDialogs.${key}`)}</strong></button>`).join("")}</div>
            <label class="vno-diagram-count">${t("slidesDialogs.diagramNodeCount")}<input id="vno-diagram-count" type="number" min="3" max="6" value="4" /></label>
          </div>
          <div class="vno-dialog-footer"><button type="button" class="vno-btn" id="vno-diagram-cancel">${t("slidesDialogs.cancel")}</button><button type="button" class="vno-btn vno-btn-primary" id="vno-diagram-insert">${t("slidesDialogs.diagramInsert")}</button></div>
        </div>`;
      document.body.appendChild(overlay);
      let selectedType = "process";
      const cards = overlay.querySelectorAll(".vno-diagram-type");
      cards.forEach(card => card.addEventListener("click", () => {
        cards.forEach(item => { item.classList.remove("is-selected"); item.setAttribute("aria-pressed", "false"); });
        card.classList.add("is-selected"); card.setAttribute("aria-pressed", "true"); selectedType = card.dataset.diagramType;
      }));
      const close = (value) => { overlay.remove(); resolve(value); };
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => close(false));
      overlay.querySelector("#vno-diagram-cancel")?.addEventListener("click", () => close(false));
      overlay.querySelector("#vno-diagram-insert")?.addEventListener("click", () => {
        const count = overlay.querySelector("#vno-diagram-count")?.value || 4;
        close(!!this.insertDiagram(selectedType, count));
      });
      overlay.querySelector(".vno-diagram-type")?.focus();
    });
  }

  showLayoutDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return Promise.resolve(false);

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      let selectedId = slide.layoutType || "title-content";

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 560px;" role="dialog" aria-modal="true">
          <div class="vno-dialog-header">
            <span>${t("slidesDialogs.layoutTitle")}</span>
            <button class="vno-btn vno-dialog-close-btn" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;">
            <p style="font-size:12px;color:#64748b;margin:0;">
              Chọn một bố cục chuẩn để định hình lại cấu trúc nội dung trang chiếu hiện tại:
            </p>
            <div class="vno-layouts-grid" id="vno-layouts-grid">
              ${SLIDE_LAYOUT_TYPES.map(layout => `
                <div class="vno-layout-card ${layout.id === selectedId ? "is-selected" : ""}" data-layout-id="${layout.id}">
                  <div class="vno-layout-card-preview">
                    ${layout.previewSvg}
                  </div>
                  <div class="vno-layout-card-header">
                    <span class="vno-layout-card-name">${layout.name}</span>
                    <span class="vno-layout-card-badge">${layout.badge}</span>
                  </div>
                  <div class="vno-layout-card-desc">${layout.description}</div>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
            <button class="vno-btn" id="vno-layout-cancel">${t("slidesDialogs.cancel")}</button>
            <div style="display:flex;gap:8px;">
              <button class="vno-btn" id="vno-layout-apply-all">${t("slidesDialogs.applyLayout")}</button>
              <button class="vno-btn vno-btn-primary" id="vno-layout-apply-current">${t("slidesDialogs.applyLayout")}</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const cards = overlay.querySelectorAll(".vno-layout-card");
      cards.forEach((card) => {
        card.addEventListener("click", () => {
          cards.forEach(c => c.classList.remove("is-selected"));
          card.classList.add("is-selected");
          selectedId = card.dataset.layoutId;
        });
        card.addEventListener("dblclick", () => {
          selectedId = card.dataset.layoutId;
          this.applySlideLayout(selectedId, true);
          close();
          resolve(true);
        });
      });

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };

      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => {
        close();
        resolve(false);
      });
      overlay.querySelector("#vno-layout-cancel")?.addEventListener("click", () => {
        close();
        resolve(false);
      });

      overlay.querySelector("#vno-layout-apply-current")?.addEventListener("click", () => {
        this.applySlideLayout(selectedId, true);
        close();
        resolve(true);
      });

      overlay.querySelector("#vno-layout-apply-all")?.addEventListener("click", () => {
        this.slides.forEach((s) => {
          s.layoutType = selectedId;
          if (selectedId === "two-content" && s.body2 === undefined) {
            s.body2 = "• Nhập nội dung cột 2 tại đây...\n• Điểm bổ sung";
          }
        });
        this.selectSlide(this.currentSlideIndex);
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
            <span>${t("slidesDialogs.transitionTitle")}</span>
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
              <button class="vno-btn" id="vno-trans-cancel">${t("slidesDialogs.cancel")}</button>
            <div style="display:flex;gap:6px;">
              <button class="vno-btn" id="vno-trans-apply-current">${t("slidesDialogs.applyTransition")}</button>
              <button class="vno-btn vno-btn-primary" id="vno-trans-apply-all">${t("slidesDialogs.applyTransition")}</button>
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

      const targetOptions = [];
      const layout = slide.layoutType || "title-content";
      if (layout !== "blank") {
        targetOptions.push({ id: "title", label: `Tiêu đề ("${(slide.title || "").substring(0, 20)}...")` });
      }
      if (layout !== "blank" && layout !== "title-only") {
        targetOptions.push({ id: "body", label: layout === "two-content" ? `Nội dung cột 1 ("${(slide.body || "").substring(0, 20)}...")` : `Nội dung ("${(slide.body || "").substring(0, 20)}...")` });
      }
      if (layout === "two-content") {
        targetOptions.push({ id: "body2", label: `Nội dung cột 2 ("${(slide.body2 || "").substring(0, 20)}...")` });
      }
      (slide.shapes || []).forEach((sh, idx) => {
        const typeName = sh.type === "image" ? "Hình ảnh" : (sh.type === "ellipse" ? "Hình elip" : "Hình chữ nhật");
        targetOptions.push({ id: String(sh.id), label: `${typeName} #${idx + 1}` });
      });
      if (targetOptions.length === 0) {
        targetOptions.push({ id: "title", label: "Tiêu đề" });
      }

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
            <span>${t("slidesDialogs.animationTitle")}</span>
            <button class="vno-btn vno-dialog-close-btn" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationTarget")}</label>
              <select class="vno-select" id="vno-anim-target-select">
                ${targetOptions.map(t => `<option value="${t.id}" ${t.id === initialTarget ? "selected" : ""}>${t.label}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationType")}</label>
              <select class="vno-select" id="vno-anim-type-select">
                <option value="none" ${currentAnim.type === "none" ? "selected" : ""}>${t("slidesDialogs.noAnimation")}</option>
                <option value="fadeIn" ${currentAnim.type === "fadeIn" || currentAnim.type === "fade" ? "selected" : ""}>Mờ dần xuất hiện (Fade In)</option>
                <option value="flyIn" ${currentAnim.type === "flyIn" || currentAnim.type === "fly" ? "selected" : ""}>Bay từ dưới lên (Fly In)</option>
                <option value="zoomIn" ${currentAnim.type === "zoomIn" || currentAnim.type === "zoom" ? "selected" : ""}>Thu phóng xuất hiện (Zoom In)</option>
                <option value="bounceIn" ${currentAnim.type === "bounceIn" || currentAnim.type === "bounce" ? "selected" : ""}>Nảy nhẹ xuất hiện (Bounce In)</option>
                <option value="slideLeft" ${currentAnim.type === "slideLeft" || currentAnim.type === "slide" ? "selected" : ""}>Trượt từ trái sang (Slide Left)</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationDuration")}</label>
                <select class="vno-select" id="vno-anim-duration-select">
                  <option value="300" ${currentAnim.duration === 300 ? "selected" : ""}>Rất nhanh (0.3s)</option>
                  <option value="500" ${currentAnim.duration === 500 ? "selected" : ""}>Tiêu chuẩn (0.5s)</option>
                  <option value="800" ${currentAnim.duration === 800 ? "selected" : ""}>Chậm (0.8s)</option>
                  <option value="1000" ${currentAnim.duration === 1000 ? "selected" : ""}>1.0 giây</option>
                </select>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationDelay")}</label>
                <select class="vno-select" id="vno-anim-delay-select">
                  <option value="0" ${currentAnim.delay === 0 ? "selected" : ""}>${t("slidesDialogs.immediate")}</option>
                  <option value="200" ${currentAnim.delay === 200 ? "selected" : ""}>Sau 0.2s</option>
                  <option value="500" ${currentAnim.delay === 500 ? "selected" : ""}>Sau 0.5s</option>
                  <option value="1000" ${currentAnim.delay === 1000 ? "selected" : ""}>Sau 1.0s</option>
                </select>
              </div>
            </div>
            <div style="padding:16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;text-align:center;overflow:hidden;">
              <div id="vno-anim-preview-box" style="font-size:15px;font-weight:bold;color:#2563eb;padding:12px;background:#ffffff;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:inline-block;min-width:180px;">
                ${t("slidesDialogs.previewObject")}
              </div>
              <div>
                <button class="vno-btn" id="vno-anim-preview-btn" style="margin-top:10px;font-size:11px;">${t("slidesDialogs.previewAnimation")}</button>
              </div>
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
            <button class="vno-btn" id="vno-anim-cancel">${t("slidesDialogs.cancel")}</button>
            <div style="display:flex;gap:6px;">
              <button class="vno-btn" id="vno-anim-clear" style="color:#ef4444;">${t("slidesDialogs.removeAnimation")}</button>
              <button class="vno-btn vno-btn-primary" id="vno-anim-apply">${t("slidesDialogs.applyAnimation")}</button>
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

  startSlideShow(startIndex, options = {}) {
    if (typeof document === "undefined" || !document.createElement) return false;
    options = options || {};
    const rehearsing = !!options.rehearsal;
    const idx = startIndex !== undefined ? startIndex : this.currentSlideIndex;
    let currentShowIdx = idx;

    const overlay = document.createElement("div");
    overlay.className = "vno-slideshow-overlay";

    const content = document.createElement("div");
    content.className = "vno-slideshow-content";

    const theme = this.masterTheme || {};

    // === Rehearse Timings: đồng hồ thật + ghi thời gian thật đã dừng ở mỗi slide ===
    let rehearseTimerBox = null;
    let rehearseInterval = null;
    let rehearseTotalStart = 0;
    let rehearseSlideStart = 0;
    const rehearseTimings = [];

    const formatSeconds = (secs) => {
      const m = String(Math.floor(secs / 60)).padStart(2, "0");
      const s = String(Math.floor(secs % 60)).padStart(2, "0");
      return `${m}:${s}`;
    };

    const updateRehearseClock = () => {
      if (!rehearseTimerBox) return;
      const totalElapsed = (performance.now() - rehearseTotalStart) / 1000;
      const slideElapsed = (performance.now() - rehearseSlideStart) / 1000;
      rehearseTimerBox.innerHTML = `<span>Trang: ${formatSeconds(slideElapsed)}</span> <span style="opacity:0.7;margin-left:10px;">Tổng: ${formatSeconds(totalElapsed)}</span>`;
    };

    const captureSlideTiming = () => {
      const elapsed = Math.max(0, (performance.now() - rehearseSlideStart) / 1000);
      rehearseTimings[currentShowIdx] = (rehearseTimings[currentShowIdx] || 0) + elapsed;
    };

    if (rehearsing) {
      rehearseTimerBox = document.createElement("div");
      rehearseTimerBox.className = "vno-rehearse-timer-box";
      overlay.appendChild(rehearseTimerBox);
      rehearseTotalStart = performance.now();
      rehearseSlideStart = performance.now();
      rehearseInterval = setInterval(updateRehearseClock, 250);
    }

    const finishRehearsal = () => {
      captureSlideTiming();
      if (rehearseInterval) clearInterval(rehearseInterval);
      const totalSeconds = Math.round((performance.now() - rehearseTotalStart) / 1000);
      const shouldSave = typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm(t("slidesDialogs.rehearsalConfirm", { time: formatSeconds(totalSeconds) }))
        : true;
      if (shouldSave) {
        this.slideTimings = rehearseTimings.map((v) => Math.round(v * 10) / 10);
        this.slides.forEach((slide, i) => {
          if (rehearseTimings[i] !== undefined) slide.rehearsedDuration = Math.round(rehearseTimings[i] * 10) / 10;
        });
        if (typeof this._renderSlideSorterGrid === "function") this._renderSlideSorterGrid();
      }
      return shouldSave;
    };

    const renderShow = () => {
      const s = this.slides[currentShowIdx];
      const shapesHtml = (s.shapes || []).map(shape => this._shapePresentationHtml(shape)).join("");

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

      let body2AnimStyle = "";
      if (s.body2Animation && s.body2Animation.type && s.body2Animation.type !== "none") {
        const kf = this._getKeyframeName(s.body2Animation.type);
        const dur = s.body2Animation.duration || 500;
        const del = s.body2Animation.delay || 0;
        body2AnimStyle = `opacity:0;animation:${kf} ${dur}ms ease-out ${del}ms forwards;`;
      }

      content.style.fontFamily = theme.fontFamily || "sans-serif";
      content.style.backgroundColor = theme.bgColor || "#ffffff";

      const layout = s.layoutType || "title-content";
      let layoutHtml = "";

      if (layout === "blank") {
        layoutHtml = `
          <div style="position:relative;flex:1;padding-top:20px;">
            ${shapesHtml}
          </div>
        `;
      } else if (layout === "title-only") {
        layoutHtml = `
          <div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;text-align:center;">
            <h1 style="font-size:52px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin:0;${titleAnimStyle}">${s.title}</h1>
            ${shapesHtml}
          </div>
        `;
      } else if (layout === "two-content") {
        layoutHtml = `
          <div style="position:relative;flex:1;display:flex;flex-direction:column;padding-top:20px;">
            <h1 style="font-size:44px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:28px;${titleAnimStyle}">${s.title}</h1>
            <div style="display:flex;gap:40px;flex:1;">
              <div style="flex:1;font-size:24px;line-height:1.7;color:${theme.bodyColor || "#334155"};white-space:pre-line;${bodyAnimStyle}">${s.body}</div>
              <div style="flex:1;font-size:24px;line-height:1.7;color:${theme.bodyColor || "#334155"};white-space:pre-line;${body2AnimStyle}">${s.body2 || ""}</div>
            </div>
            ${shapesHtml}
          </div>
        `;
      } else {
        // title-content (default)
        layoutHtml = `
          <div style="position:relative;flex:1;padding-top:20px;">
            <h1 style="font-size:44px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:36px;${titleAnimStyle}">${s.title}</h1>
            <div style="font-size:26px;line-height:1.7;color:${theme.bodyColor || "#334155"};white-space:pre-line;${bodyAnimStyle}">${s.body}</div>
            ${shapesHtml}
          </div>
        `;
      }

      content.innerHTML = `
        <div class="vno-slide-master-accent" style="background:${theme.accentColor || "#b53818"};"></div>
        <div class="vno-slide-master-logo" style="color:${theme.accentColor || "#b53818"};">${theme.logoText || "VN OFFICE"}</div>
        ${layoutHtml}
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

    const goToSlide = (nextIdx) => {
      if (rehearsing) {
        captureSlideTiming();
        rehearseSlideStart = performance.now();
      }
      currentShowIdx = nextIdx;
      renderShow();
    };

    const closeShow = (discardRehearsal = false) => {
      let saved;
      if (rehearsing && discardRehearsal) {
        if (rehearseInterval) clearInterval(rehearseInterval);
      } else {
        saved = rehearsing ? finishRehearsal() : undefined;
      }
      document.removeEventListener("keydown", keyHandler);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (this._activeShowCleanup === cleanupShow) this._activeShowCleanup = null;
      return saved;
    };
    const cleanupShow = () => closeShow(true);

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        closeShow();
      } else if (e.key === " " || e.key === "ArrowRight" || e.key === "PageDown") {
        if (currentShowIdx < this.slides.length - 1) {
          goToSlide(currentShowIdx + 1);
        } else {
          closeShow();
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (currentShowIdx > 0) {
          goToSlide(currentShowIdx - 1);
        }
      }
    };

    document.addEventListener("keydown", keyHandler);
    this._activeShowCleanup?.();
    this._activeShowCleanup = cleanupShow;
    overlay.addEventListener("click", (e) => {
      if (e.target && e.target.closest && e.target.closest("video, audio, .vno-rehearse-timer-box")) return;
      if (currentShowIdx < this.slides.length - 1) {
        goToSlide(currentShowIdx + 1);
      } else {
        closeShow();
      }
    });

    return rehearsing ? {
      close: closeShow,
      next: () => { if (currentShowIdx < this.slides.length - 1) goToSlide(currentShowIdx + 1); },
      prev: () => { if (currentShowIdx > 0) goToSlide(currentShowIdx - 1); },
      getTimings: () => rehearseTimings.slice()
    } : true;
  }

  /**
   * Bắt đầu Tập dượt hẹn giờ (PowerPoint Rehearse Timings) — trình chiếu toàn màn hình thật
   * với đồng hồ đếm thời gian thật (performance.now()), ghi thời gian thật đã dừng ở mỗi
   * slide, và hỏi lưu/hủy khi kết thúc (Esc hoặc slide cuối).
   */
  startRehearseTimings(startIndex) {
    return this.startSlideShow(startIndex, { rehearsal: true });
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

      const layout = s.layoutType || "title-content";
      let cardBodyHtml = "";
      if (layout === "blank") {
        cardBodyHtml = `
          <div style="position:relative;flex:1;min-height:120px;">${shapesHtml}</div>
        `;
      } else if (layout === "title-only") {
        cardBodyHtml = `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;">
            <h2 style="font-size:26px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin:0;">${s.title}</h2>
          </div>
          <div style="position:relative;min-height:40px;">${shapesHtml}</div>
        `;
      } else if (layout === "two-content") {
        cardBodyHtml = `
          <h2 style="font-size:22px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:12px;">${s.title}</h2>
          <div style="display:flex;gap:14px;flex:1;font-size:12px;line-height:1.5;color:${theme.bodyColor || "#334155"};">
            <div style="flex:1;white-space:pre-line;">${s.body}</div>
            <div style="flex:1;white-space:pre-line;border-left:1px dashed #cbd5e1;padding-left:8px;">${s.body2 || ""}</div>
          </div>
          <div style="position:relative;min-height:40px;">${shapesHtml}</div>
        `;
      } else {
        // title-content
        cardBodyHtml = `
          <h2 style="font-size:24px;font-weight:800;color:${theme.titleColor || "#0f172a"};margin-bottom:14px;">${s.title}</h2>
          <div style="font-size:14px;line-height:1.6;color:${theme.bodyColor || "#334155"};white-space:pre-line;">${s.body}</div>
          <div style="position:relative;flex:1;min-height:120px;">${shapesHtml}</div>
        `;
      }

      if (slideViewEl) {
        slideViewEl.innerHTML = `
          <div class="vno-presenter-slide-card" style="font-family:${theme.fontFamily || "sans-serif"};background:${theme.bgColor || "#ffffff"};display:flex;flex-direction:column;">
            <div class="vno-slide-master-accent" style="background:${theme.accentColor || "#b53818"};"></div>
            <div style="font-size:10px;font-weight:700;color:${theme.accentColor || "#b53818"};margin-bottom:8px;">${theme.logoText || "VN OFFICE"}</div>
            ${cardBodyHtml}
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
      if (this._activePresenterCleanup === closePresenter) this._activePresenterCleanup = null;
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
    this._activePresenterCleanup?.();
    this._activePresenterCleanup = closePresenter;
    return true;
  }

  destroy() {
    this.closeSlideSorter();
    this._activeShowCleanup?.();
    this._activePresenterCleanup?.();
    this._activeShowCleanup = null;
    this._activePresenterCleanup = null;
  }
}
