/**
 * VN Slides — Enterprise Canvas Controller & Presentation Engine
 */

import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { t, getLocale } from "../../platform/i18n/i18n.js";
import { formatDateTime, showDateTimeDialog } from "../../platform/ui-kit/datetime-picker.js";
import { showSymbolPicker } from "../../platform/ui-kit/symbol-picker.js";
import { VietnameseSpellChecker } from "../../platform/text/vi-spellchecker.js";
import { SpellcheckDomController } from "../../platform/text/spellcheck-dom-controller.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";
import { showSlideTableDialog, showHeaderFooterDialog } from "./insert-dialogs.js";

export function trapFocus(dialogBox, event) {
  if (!dialogBox || event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains?.(document.activeElement)) {
      event.preventDefault();
      last?.focus?.();
    }
  } else {
    if (document.activeElement === last || !dialogBox.contains?.(document.activeElement)) {
      event.preventDefault();
      first?.focus?.();
    }
  }
}

export const SLIDE_MASTER_THEMES = [
  {
    id: "modern-blue",
    name: "Xanh Doanh Nghiệp",
    nameKey: "slidesDialogs.themeCorporateBlue",
    fontFamily: "Inter, 'Segoe UI', sans-serif",
    titleColor: "#1e3a8a",
    bodyColor: "#334155",
    accentColor: "#2563eb",
    bgColor: "#f8fafc",
    logoText: "VN OFFICE • DOANH NGHIỆP"
  },
  {
    id: "corporate-red",
    name: "Terracotta Ấm Áp",
    nameKey: "slidesDialogs.themeWarmTerracotta",
    fontFamily: "'Times New Roman', serif",
    titleColor: "#991b1b",
    bodyColor: "#1f2937",
    accentColor: "#b53818",
    bgColor: "#fffdfa",
    logoText: "VN OFFICE • SÁNG TẠO"
  },
  {
    id: "emerald-green",
    name: "Xanh Lá Thiên Nhiên",
    nameKey: "slidesDialogs.themeNaturalGreen",
    fontFamily: "'Segoe UI', sans-serif",
    titleColor: "#064e3b",
    bodyColor: "#334155",
    accentColor: "#059669",
    bgColor: "#f0fdf4",
    logoText: "VN OFFICE • BỀN VỮNG"
  },
  {
    id: "minimal-dark",
    name: "Than Chì Hiện Đại",
    nameKey: "slidesDialogs.themeModernCharcoal",
    fontFamily: "system-ui, sans-serif",
    titleColor: "#f8fafc",
    bodyColor: "#cbd5e1",
    accentColor: "#38bdf8",
    bgColor: "#0f172a",
    logoText: "VN OFFICE • HIỆN ĐẠI"
  },
  {
    id: "minimal-monochrome",
    name: "Đơn Sắc Tối Giản",
    nameKey: "slidesDialogs.themeMinimalMonochrome",
    fontFamily: "Arial, sans-serif",
    titleColor: "#111827",
    bodyColor: "#4b5563",
    accentColor: "#9ca3af",
    bgColor: "#ffffff",
    logoText: "VN OFFICE • TỐI GIẢN"
  },
  {
    id: "energetic-orange",
    name: "Cam Năng Động",
    nameKey: "slidesDialogs.themeEnergeticOrange",
    fontFamily: "Verdana, sans-serif",
    titleColor: "#9a3412",
    bodyColor: "#431407",
    accentColor: "#f97316",
    bgColor: "#fff7ed",
    logoText: "VN OFFICE • NĂNG ĐỘNG"
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
    descEn: "Title slide with centered text",
    badge: "Độc lập",
    badgeEn: "Stand-alone",
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
    descEn: "Title on top and a main content area below",
    badge: "Mặc định",
    badgeEn: "Default",
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
    descEn: "Title on top and two side-by-side content columns",
    badge: "2 cột",
    badgeEn: "2 Columns",
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
    descEn: "Blank slide for freely inserting shapes and images",
    badge: "Tự do",
    badgeEn: "Freeform",
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
    this.selectedShapeIds = new Set();
    this.diagramGroupSelectionId = null;
    this.diagramGroupBoundsEl = null;
    this.smartGuidesLayer = null;
    this._windowKeyHandler = null;
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
    this.slideSize = { preset: "wide", width: 960, height: 540 };
    this.headerFooter = {
      showDate: false,
      showSlideNumber: true,
      showFooter: true,
      footerText: this.masterTheme.footerText,
      dateFormat: "dd/MM/yyyy",
      applyToAll: true
    };

    // Transitions (Hiệu ứng chuyển slide thật)
    this.transitionConfig = {
      type: "fade", // "fade" | "slide" | "zoom" | "flip"
      duration: 500 // ms
    };

    // View Tab State (Chế độ xem, Thước kẻ, Lưới, Đường gióng, Thu phóng)
    this.presentationView = "normal"; // "normal" | "slideSorter" | "reading"
    this.isReadingView = false;
    this.readingOverlay = null;
    this._readingKeyHandler = null;
    this.zoomLevel = 1.0;
    this.rulerVisible = false;
    this.gridlinesVisible = false;
    this.guidesVisible = false;
    this.guideCoords = { x: 480, y: 270 };
    this.stageEl = null;
    this.workspaceEl = null;
    this.canvasViewport = null;
    this.rulerCornerEl = null;
    this.rulerHEl = null;
    this.rulerVEl = null;
    this.gridlinesLayer = null;
    this.guidesLayer = null;
    this.spellcheckChecker = null;
    this.spellcheckController = null;
    this._onSpellcheckMenuClick = null;
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
    this.stageEl = stage;

    this.workspaceEl = document.createElement("div");
    this.workspaceEl.className = "vno-slide-workspace";

    this.rulerCornerEl = document.createElement("div");
    this.rulerCornerEl.className = "vno-slide-ruler-corner";
    this.rulerCornerEl.style.display = "none";

    this.rulerHEl = document.createElement("div");
    this.rulerHEl.className = "vno-slide-ruler-h";
    this.rulerHEl.style.display = "none";

    this.rulerVEl = document.createElement("div");
    this.rulerVEl.className = "vno-slide-ruler-v";
    this.rulerVEl.style.display = "none";

    this.canvasViewport = document.createElement("div");
    this.canvasViewport.className = "vno-slide-canvas-viewport";

    this.canvasEl = document.createElement("div");
    this.canvasEl.className = "vno-slide-canvas";
    this._applySlideSizeToDom();

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

    this.smartGuidesLayer = document.createElement("div");
    this.smartGuidesLayer.className = "vno-slide-smart-guides-layer";
    this.smartGuidesLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9990;";
    this.canvasEl.appendChild(this.smartGuidesLayer);

    this.commentButtonEl = document.createElement("button");
    this.commentButtonEl.type = "button";
    this.commentButtonEl.className = "vno-slide-comment-indicator";
    this.commentButtonEl.title = "Mở nhận xét của trang chiếu";
    this.commentButtonEl.setAttribute?.("aria-label", "Mở nhận xét của trang chiếu");
    this.commentButtonEl.innerHTML = `<span aria-hidden="true">◰</span><strong>0</strong>`;
    this.commentButtonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openCommentsPanel(false);
    });
    this.canvasEl.appendChild(this.commentButtonEl);

    // Gridlines overlay
    this.gridlinesLayer = document.createElement("div");
    this.gridlinesLayer.className = "vno-slide-gridlines-overlay";
    this.gridlinesLayer.style.display = "none";
    this.canvasEl.appendChild(this.gridlinesLayer);

    // Guides layer
    this.guidesLayer = document.createElement("div");
    this.guidesLayer.className = "vno-slide-guides-layer";
    this.guidesLayer.style.display = "none";
    this.canvasEl.appendChild(this.guidesLayer);
    this._renderGuidesLayer();

    this.canvasViewport.appendChild(this.canvasEl);
    this.workspaceEl.appendChild(this.rulerCornerEl);
    this.workspaceEl.appendChild(this.rulerHEl);
    this.workspaceEl.appendChild(this.rulerVEl);
    this.workspaceEl.appendChild(this.canvasViewport);
    stage.appendChild(this.workspaceEl);

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
    this._setupCanvasEvents();
    this._setupVietnameseSpellcheck();
    this._applyViewState();
    this._syncCommandStates();
  }

  _spellcheckRoots() {
    const fixedRoots = [this.titleEl, this.bodyEl, this.body2El];
    const shapeRoots = this.shapesLayer?.querySelectorAll?.("[contenteditable]") || [];
    return [...fixedRoots, ...shapeRoots].filter(root => root?.isConnected);
  }

  _refreshSpellcheckRoots() {
    if (!this.spellcheckChecker) return;
    this.spellcheckController?.destroy();
    this.spellcheckController = new SpellcheckDomController({
      roots: this._spellcheckRoots(),
      checker: this.spellcheckChecker,
      debounceMs: 400
    }).attach();
  }

  _setupVietnameseSpellcheck() {
    if (!this.canvasEl || typeof document === "undefined") return;
    this.canvasEl.dataset.spellcheckStatus = "loading";
    try {
      this.spellcheckChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      this._refreshSpellcheckRoots();
      this._onSpellcheckMenuClick = event => {
        if (!event.target.closest?.(".vno-spellcheck-menu")) return;
        queueMicrotask(() => this._syncVisibleSpellcheckText());
      };
      document.addEventListener("click", this._onSpellcheckMenuClick);
      this.canvasEl.dataset.spellcheckStatus = "ready";
    } catch (error) {
      this.canvasEl.dataset.spellcheckStatus = "error";
      this.canvasEl.title = "Không thể khởi tạo bộ kiểm tra chính tả tiếng Việt.";
      console.warn("[SlidesCanvasController] Không thể khởi tạo kiểm tra chính tả tiếng Việt:", error);
    }
  }

  _syncVisibleSpellcheckText() {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return;
    slide.title = this.titleEl?.innerText || "";
    slide.body = this.bodyEl?.innerText || "";
    slide.body2 = this.body2El?.innerText || "";
    for (const root of this.shapesLayer?.querySelectorAll?.("[data-shape-text-id]") || []) {
      const shape = slide.shapes?.find(item => String(item.id) === root.dataset.shapeTextId);
      if (shape) shape.text = root.textContent || "";
    }
    this._renderThumbnails();
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
    this._syncCommandStates();
    return this.isNotesVisible;
  }

  /**
   * Đặt đối tượng đang được chọn trên canvas (title, body, hoặc shape ID).
   */
  setSelectedTarget(target, extraTargets = []) {
    this.selectedTarget = target;
    if (!this.selectedShapeIds) this.selectedShapeIds = new Set();
    this.diagramGroupSelectionId = null;
    if (target === "title" || target === "body" || target === "body2" || target == null) {
      this.selectedShapeIds.clear();
    } else {
      this.selectedShapeIds = new Set([String(target), ...(extraTargets || []).map(String)]);
    }
    this._updateSelectionUi();
  }

  /**
   * Đặt danh sách các shape ID đang được chọn cùng lúc.
   * @param {Array<string|number>} shapeIds
   */
  setSelectedShapes(shapeIds = []) {
    if (!this.selectedShapeIds) this.selectedShapeIds = new Set();
    this.selectedShapeIds = new Set((shapeIds || []).map(String));
    this.selectedTarget = (shapeIds && shapeIds.length > 0) ? shapeIds[0] : null;
    this.diagramGroupSelectionId = null;
    this._updateSelectionUi();
  }

  _getDiagramGroupShapes(groupId) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !groupId) return [];
    return (slide.shapes || []).filter(shape => shape.diagramGroupId && shape.diagramGroupId === groupId);
  }

  getDiagramGroupBounds(groupId) {
    const shapes = this._getDiagramGroupShapes(groupId);
    if (!shapes.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const shape of shapes) {
      const x = Number.isFinite(shape.x) ? shape.x : 0;
      const y = Number.isFinite(shape.y) ? shape.y : 0;
      const w = Number.isFinite(shape.w) ? shape.w : 0;
      const h = Number.isFinite(shape.h) ? shape.h : 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  /**
   * Chọn toàn bộ sơ đồ cùng diagramGroupId (node + connector) như một đối tượng.
   * @param {string} groupId
   * @param {string|number} [primaryShapeId]
   */
  selectDiagramGroup(groupId, primaryShapeId = null) {
    const shapes = this._getDiagramGroupShapes(groupId);
    if (!shapes.length) return false;
    const ids = shapes.map(shape => String(shape.id));
    this.diagramGroupSelectionId = groupId;
    this.selectedShapeIds = new Set(ids);
    const primary = primaryShapeId && ids.includes(String(primaryShapeId))
      ? String(primaryShapeId)
      : (shapes.find(shape => shape.diagramRole === "node" || shape.type !== "connector")?.id || ids[0]);
    this.selectedTarget = primary;
    this._updateSelectionUi();
    return true;
  }

  /**
   * Click thường trên shape có diagramGroupId → chọn cả nhóm.
   * Ctrl/Shift+Click → chọn lẻ một shape trong nhóm (chỉnh vị trí từng node).
   */
  selectShapeFromUserClick(shape, event = {}) {
    if (!shape || shape.type === "connector") return false;
    if ((event.ctrlKey || event.metaKey) && shape.diagramGroupId) {
      this.diagramGroupSelectionId = null;
      this.selectedShapeIds = new Set([String(shape.id)]);
      this.selectedTarget = String(shape.id);
      this._updateSelectionUi();
      return true;
    }
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      this.diagramGroupSelectionId = null;
      const id = String(shape.id);
      const set = new Set(this.selectedShapeIds || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      this.selectedShapeIds = set;
      this.selectedTarget = Array.from(set)[0] || null;
      this._updateSelectionUi();
      return true;
    }
    if (shape.diagramGroupId) {
      return this.selectDiagramGroup(shape.diagramGroupId, shape.id);
    }
    this.setSelectedTarget(shape.id);
    return true;
  }

  _captureShapeGeometry(shape) {
    const geo = { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    if (Number.isFinite(shape.x1)) {
      geo.x1 = shape.x1;
      geo.y1 = shape.y1;
      geo.x2 = shape.x2;
      geo.y2 = shape.y2;
    }
    return geo;
  }

  _applyShapeGeometry(shape, geo) {
    if (!shape || !geo) return;
    for (const key of ["x", "y", "w", "h", "x1", "y1", "x2", "y2"]) {
      if (Number.isFinite(geo[key])) shape[key] = geo[key];
    }
  }

  _clampGroupDelta(movable, startGeometries, dx, dy) {
    let adjX = dx;
    let adjY = dy;
    let minX = Infinity;
    let minY = Infinity;
    let maxR = -Infinity;
    let maxB = -Infinity;
    for (const shape of movable) {
      const start = startGeometries.get(String(shape.id));
      if (!start) continue;
      const w = Number.isFinite(shape.w) ? shape.w : 0;
      const h = Number.isFinite(shape.h) ? shape.h : 0;
      minX = Math.min(minX, start.x + dx);
      minY = Math.min(minY, start.y + dy);
      maxR = Math.max(maxR, start.x + w + dx);
      maxB = Math.max(maxB, start.y + h + dy);
    }
    if (minX < 0) adjX += -minX;
    else if (maxR > this.slideSize.width) adjX += this.slideSize.width - maxR;
    if (minY < 0) adjY += -minY;
    else if (maxB > this.slideSize.height) adjY += this.slideSize.height - maxB;
    return { dx: adjX, dy: adjY };
  }

  _applyDiagramGroupDelta(groupId, startGeometries, dx, dy) {
    const shapes = this._getDiagramGroupShapes(groupId);
    if (!shapes.length) return { dx: 0, dy: 0 };
    const movable = shapes.filter(shape => shape.type !== "connector");
    const clamped = this._clampGroupDelta(movable, startGeometries, dx, dy);
    for (const shape of shapes) {
      const start = startGeometries.get(String(shape.id));
      if (!start) continue;
      if (shape.type === "connector" && shape.sourceId && shape.targetId) continue;
      shape.x = start.x + clamped.dx;
      shape.y = start.y + clamped.dy;
      if (Number.isFinite(start.x1)) {
        shape.x1 = start.x1 + clamped.dx;
        shape.y1 = start.y1 + clamped.dy;
        shape.x2 = start.x2 + clamped.dx;
        shape.y2 = start.y2 + clamped.dy;
        shape.x = Math.min(shape.x1, shape.x2);
        shape.y = Math.min(shape.y1, shape.y2);
        shape.w = Math.max(1, Math.abs(shape.x2 - shape.x1));
        shape.h = Math.max(1, Math.abs(shape.y2 - shape.y1));
      }
    }
    for (const shape of movable) {
      if (shape.diagramRole === "node" || shape.diagramGroupId) {
        this._updateDiagramConnectorsForNode(shape);
      }
    }
    return clamped;
  }

  _syncDiagramGroupDom(groupId) {
    if (!this.shapesLayer) return;
    const shapes = this._getDiagramGroupShapes(groupId);
    for (const shape of shapes) {
      const el = this.shapesLayer.querySelector?.(`[data-shape-id="${shape.id}"]`)
        || Array.from(this.shapesLayer.children || []).find(item => item.dataset?.shapeId === String(shape.id));
      if (!el) continue;
      if (shape.type === "connector") this._renderDiagramConnectorElement(el, shape);
      else {
        el.style.left = `${shape.x}px`;
        el.style.top = `${shape.y}px`;
      }
    }
    this._updateDiagramGroupBoundsUi();
  }

  /**
   * Di chuyển cả nhóm sơ đồ một offset, một bước Undo/Redo.
   */
  moveDiagramGroupBy(groupId, dx, dy) {
    const shapes = this._getDiagramGroupShapes(groupId);
    if (!shapes.length) return false;
    const startGeometries = new Map(shapes.map(shape => [String(shape.id), this._captureShapeGeometry(shape)]));
    const applied = this._applyDiagramGroupDelta(groupId, startGeometries, dx, dy);
    if (!applied || (applied.dx === 0 && applied.dy === 0)) return false;
    this.undoStack.push({
      type: "diagram-group-move",
      slideIndex: this.currentSlideIndex,
      diagramGroupId: groupId,
      shapes: shapes.map(shape => ({
        id: shape.id,
        from: startGeometries.get(String(shape.id)),
        to: this._captureShapeGeometry(shape)
      }))
    });
    this.redoStack = [];
    this._syncUndoRedoState();
    this._syncDiagramGroupDom(groupId);
    this._renderThumbnails();
    return true;
  }

  deleteDiagramGroup(groupId) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !groupId) return false;
    const removed = (slide.shapes || [])
      .map((shape, index) => ({ shape, index }))
      .filter(item => item.shape.diagramGroupId === groupId);
    if (!removed.length) return false;
    const ids = new Set(removed.map(item => String(item.shape.id)));
    slide.shapes = slide.shapes.filter(shape => !ids.has(String(shape.id)));
    this.undoStack.push({
      type: "diagram-group-delete",
      slideIndex: this.currentSlideIndex,
      diagramGroupId: groupId,
      shapes: this._cloneShapes(removed)
    });
    this.redoStack = [];
    this._syncUndoRedoState();
    this.diagramGroupSelectionId = null;
    this.selectedShapeIds = new Set();
    this.selectedTarget = null;
    this._removeDiagramGroupBounds();
    this._renderShapesLayer();
    return true;
  }

  deleteSelectedShapes() {
    if (this.diagramGroupSelectionId) {
      return this.deleteDiagramGroup(this.diagramGroupSelectionId);
    }
    if (!this.selectedShapeIds || this.selectedShapeIds.size === 0) return false;
    if (this.selectedShapeIds.size === 1) {
      return this.deleteShape(Array.from(this.selectedShapeIds)[0]);
    }
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return false;
    const selectedIds = new Set(this.selectedShapeIds);
    const extraConnectorIds = new Set();
    for (const shape of slide.shapes || []) {
      if (shape.diagramRole === "connector" && (
        selectedIds.has(String(shape.sourceId)) || selectedIds.has(String(shape.targetId))
      )) extraConnectorIds.add(String(shape.id));
    }
    const toRemove = new Set([...selectedIds, ...extraConnectorIds]);
    const removed = (slide.shapes || []).filter(shape => toRemove.has(String(shape.id)));
    if (!removed.length) return false;
    slide.shapes = slide.shapes.filter(shape => !toRemove.has(String(shape.id)));
    this.undoStack.push({
      type: "shapes-delete",
      slideIndex: this.currentSlideIndex,
      shapes: this._cloneShapes(removed)
    });
    this.redoStack = [];
    this._syncUndoRedoState();
    this.selectedShapeIds = new Set();
    this.selectedTarget = null;
    this._renderShapesLayer();
    return true;
  }

  _removeDiagramGroupBounds() {
    const el = this.diagramGroupBoundsEl;
    if (el?.parentNode) el.parentNode.removeChild(el);
    this.diagramGroupBoundsEl = null;
    const host = this.canvasEl || this.shapesLayer;
    if (host?.querySelectorAll) {
      host.querySelectorAll(".vno-diagram-group-bounds").forEach(node => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    }
  }

  _updateDiagramGroupBoundsUi() {
    this._removeDiagramGroupBounds();
    if (!this.diagramGroupSelectionId) return;
    const host = this.canvasEl || this.shapesLayer;
    if (!host || typeof document === "undefined" || !document.createElement) return;
    const bounds = this.getDiagramGroupBounds(this.diagramGroupSelectionId);
    if (!bounds) return;
    const pad = 8;
    const box = document.createElement("div");
    box.className = "vno-diagram-group-bounds";
    box.dataset.diagramGroupId = String(this.diagramGroupSelectionId);
    box.setAttribute?.("aria-label", "Nhóm sơ đồ đang chọn");
    box.style.cssText = `position:absolute;left:${bounds.x - pad}px;top:${bounds.y - pad}px;width:${bounds.w + pad * 2}px;height:${bounds.h + pad * 2}px;border:2px dashed #16a34a;background:rgba(22,163,74,0.06);pointer-events:none;z-index:24;box-sizing:border-box;border-radius:6px;`;
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "vno-shape-delete-btn vno-diagram-group-delete-btn";
    delBtn.title = "Xóa cả nhóm sơ đồ";
    delBtn.setAttribute?.("aria-label", "Xóa cả nhóm sơ đồ");
    delBtn.textContent = "×";
    delBtn.style.cssText = "pointer-events:auto;left:-10px;top:-10px;";
    delBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.deleteDiagramGroup(this.diagramGroupSelectionId);
    });
    box.appendChild(delBtn);
    host.appendChild(box);
    this.diagramGroupBoundsEl = box;
  }

  _updateSelectionUi() {
    if (this.titleEl) {
      if (this.selectedTarget === "title") this.titleEl.classList.add("is-selected");
      else this.titleEl.classList.remove("is-selected");
    }
    if (this.bodyEl) {
      if (this.selectedTarget === "body") this.bodyEl.classList.add("is-selected");
      else this.bodyEl.classList.remove("is-selected");
    }
    if (this.body2El) {
      if (this.selectedTarget === "body2") this.body2El.classList.add("is-selected");
      else this.body2El.classList.remove("is-selected");
    }
    if (this.shapesLayer) {
      const items = this.shapesLayer.querySelectorAll?.(".vno-slide-shape-item") || [];
      const slide = this.slides[this.currentSlideIndex];
      const shapes = (slide && slide.shapes) || [];
      const groupSelected = !!this.diagramGroupSelectionId;
      items.forEach((item, idx) => {
        const sh = shapes[idx];
        const isSel = sh && (this.selectedShapeIds?.has(String(sh.id)) || String(this.selectedTarget) === String(sh.id));
        if (isSel) {
          item.classList.add("is-selected");
          if (groupSelected && sh.diagramGroupId === this.diagramGroupSelectionId) {
            item.classList.add("is-diagram-group-member");
            this._removeShapeSelectionHandles(item);
          } else {
            item.classList.remove("is-diagram-group-member");
            this._ensureShapeSelectionHandles(item, sh);
          }
        } else {
          item.classList.remove("is-selected");
          item.classList.remove("is-diagram-group-member");
          this._removeShapeSelectionHandles(item);
        }
      });
    }
    this._updateDiagramGroupBoundsUi();
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
    const isEllipse = shapeType === "ellipse" || shapeType === "circle";
    const isArrow = shapeType === "arrow";
    const isTextbox = shapeType === "textbox";
    const normalizedType = isEllipse ? "ellipse" : isArrow ? "arrow" : isTextbox ? "textbox" : "rect";

    const newShape = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: normalizedType,
      x: 80 + offset,
      y: 80 + offset,
      w: isTextbox ? 240 : isArrow ? 200 : isEllipse ? 160 : 200,
      h: isTextbox ? 60 : isArrow ? 80 : isEllipse ? 160 : 120,
      color: isTextbox ? "transparent" : "#3b82f6",
      text: "",
      animation: { type: "none", duration: 500, delay: 0 }
    };
    slide.shapes.push(newShape);

    this.undoStack.push({ type: "shape-add", slideIndex: this.currentSlideIndex, shape: { ...newShape } });
    this.redoStack = [];
    this._syncUndoRedoState();

    this.setSelectedTarget(newShape.id);
    this._renderShapesLayer();
    return true;
  }

  async insertTable(options = null) {
    options = options || {};
    let rows = Number(options.rows);
    let cols = Number(options.cols);
    if (!rows || !cols) {
      const picked = await showSlideTableDialog({ rows: 3, cols: 3 });
      if (!picked) return false;
      rows = picked.rows;
      cols = picked.cols;
    }
    rows = Math.max(1, Math.min(12, rows));
    cols = Math.max(1, Math.min(12, cols));
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return false;
    if (!Array.isArray(slide.shapes)) slide.shapes = [];
    const cells = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (r === 0 ? `Cột ${c + 1}` : ""))
    );
    const offset = slide.shapes.length * 16;
    const newShape = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: "table",
      x: 80 + offset,
      y: 160 + offset,
      w: Math.min(720, cols * 140),
      h: Math.min(280, rows * 36 + 12),
      rows,
      cols,
      cells,
      color: "transparent",
      animation: { type: "none", duration: 500, delay: 0 }
    };
    slide.shapes.push(newShape);
    this.undoStack.push({ type: "shape-add", slideIndex: this.currentSlideIndex, shape: { ...newShape, cells: JSON.parse(JSON.stringify(cells)) } });
    this.redoStack = [];
    this._syncUndoRedoState();
    this.setSelectedTarget(newShape.id);
    this._renderShapesLayer();
    return newShape;
  }

  _renderHeaderFooter() {
    if (!this.masterFooterEl) return;
    const slide = this.slides[this.currentSlideIndex];
    const hf = slide?.headerFooter || this.headerFooter || {};
    const dateText = hf.showDate ? formatDateTime(new Date(), hf.dateFormat || "dd/MM/yyyy") : "";
    const footerText = hf.showFooter !== false
      ? (hf.footerText ?? this.masterTheme?.footerText ?? "")
      : "";
    const pageText = hf.showSlideNumber !== false
      ? `Trang ${this.currentSlideIndex + 1} / ${this.slides.length}`
      : "";
    this.masterFooterEl.innerHTML = `
      <span class="vno-slide-hf-date" data-slide-placeholder="date">${dateText}</span>
      <span class="vno-slide-hf-footer" data-slide-placeholder="footer">${footerText}</span>
      <span class="vno-slide-hf-number" data-slide-placeholder="number">${pageText}</span>
    `;
  }

  applyHeaderFooter(config = {}, options = {}) {
    const next = {
      showDate: false,
      showSlideNumber: true,
      showFooter: true,
      footerText: this.masterTheme?.footerText || "",
      dateFormat: "dd/MM/yyyy",
      applyToAll: true,
      ...(this.headerFooter || {}),
      ...config
    };
    const applyToAll = options.applyToAll !== undefined ? options.applyToAll : next.applyToAll !== false;
    next.applyToAll = applyToAll;
    if (applyToAll) {
      this.headerFooter = next;
      this.slides.forEach(slide => {
        slide.headerFooter = { ...next };
      });
    } else {
      const slide = this.slides[this.currentSlideIndex];
      if (!slide) return false;
      slide.headerFooter = { ...next, applyToAll: false };
    }
    this._renderHeaderFooter();
    this._renderThumbnails?.();
    return true;
  }

  async openHeaderFooterDialog(options = null) {
    options = options || {};
    const current = this.slides[this.currentSlideIndex]?.headerFooter || this.headerFooter || {};
    const hasExplicit = options.showDate !== undefined || options.showSlideNumber !== undefined || options.showFooter !== undefined;
    const picked = hasExplicit ? { ...current, ...options } : await showHeaderFooterDialog(current);
    if (!picked) return false;
    return this.applyHeaderFooter(picked, { applyToAll: picked.applyToAll });
  }

  async insertDateTime(options = null) {
    options = options || {};
    let format = options.format;
    if (!format) {
      const picked = await showDateTimeDialog({ defaultFormat: this.headerFooter?.dateFormat || "dd/MM/yyyy" });
      if (!picked) return false;
      format = picked.format;
    }
    return this.applyHeaderFooter(
      { showDate: true, dateFormat: format },
      { applyToAll: options.applyToAll !== false }
    );
  }

  insertSlideNumber(options = null) {
    options = options || {};
    return this.applyHeaderFooter(
      { showSlideNumber: true },
      { applyToAll: options.applyToAll !== false }
    );
  }

  async insertSymbol(options = null) {
    options = options || {};
    let ch = options.char || options.symbol;
    if (!ch) {
      ch = await showSymbolPicker();
      if (!ch) return false;
    }
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return false;
    const shape = (slide.shapes || []).find(item => String(item.id) === String(this.selectedTarget));
    if (shape && shape.text !== undefined) {
      shape.text = (shape.text || "") + ch;
      this._renderShapesLayer();
      return true;
    }
    if (this.selectedTarget === "title" && this.titleEl) {
      this.titleEl.innerText = (this.titleEl.innerText || "") + ch;
      slide.title = this.titleEl.innerText;
      this._renderThumbnails?.();
      return true;
    }
    if (this.bodyEl) {
      this.bodyEl.innerText = (this.bodyEl.innerText || "") + ch;
      slide.body = this.bodyEl.innerText;
      this._renderThumbnails?.();
      return true;
    }
    return false;
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
        diagramGroupId: groupId, diagramRole: "connector", sourceId: from.id, targetId: to.id
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
    if (this.slideSize.width !== 960 || this.slideSize.height !== 540) {
      const scaleX = this.slideSize.width / 960, scaleY = this.slideSize.height / 540;
      for (const shape of insertedShapes) {
        for (const key of ["x", "w", "x1", "x2"]) if (Number.isFinite(shape[key])) shape[key] *= scaleX;
        for (const key of ["y", "h", "y1", "y2"]) if (Number.isFinite(shape[key])) shape[key] *= scaleY;
      }
    }
    slide.shapes.push(...insertedShapes);
    this.undoStack.push({ type: "diagram-insert", slideIndex: this.currentSlideIndex, shapes: this._cloneShapes(insertedShapes), diagramGroupId: groupId });
    this.redoStack = [];
    this._syncUndoRedoState();
    this.diagramGroupSelectionId = groupId;
    this.selectedShapeIds = new Set(insertedShapes.map(shape => String(shape.id)));
    this.selectedTarget = nodes[0]?.id || null;
    this._renderShapesLayer();
    return { diagramGroupId: groupId, shapes: insertedShapes };
  }

  _cloneShapes(shapes) {
    return JSON.parse(JSON.stringify(shapes || []));
  }

  _escapeShapeText(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  _shapePresentationHtml(shape, options = {}) {
    const shapeId = this._escapeShapeText(String(shape.id ?? ""));
    const morphAttrs = ` data-vno-shape-id="${shapeId}" data-vno-shape-type="${this._escapeShapeText(shape.type || "rect")}"`;
    if (shape.type === "connector") {
      const marker = shape.arrowEnd ? "marker-end='url(#vno-show-arrow)'" : "";
      return `<svg class="vno-show-connector"${morphAttrs} style="position:absolute;inset:0;width:${this.slideSize.width}px;height:${this.slideSize.height}px;overflow:visible" viewBox="0 0 ${this.slideSize.width} ${this.slideSize.height}"><defs><marker id="vno-show-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="${shape.color || "#475569"}"/></marker></defs><line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.color || "#475569"}" stroke-width="3" ${marker}/></svg>`;
    }
    const pos = `position:absolute;left:${shape.x}px;top:${shape.y}px;width:${shape.w}px;height:${shape.h}px;`;
    let animStyle = "";
    if (!options.suppressAnimation && shape.animation?.type && shape.animation.type !== "none") {
      animStyle = `opacity:0;animation:${this._getKeyframeName(shape.animation.type)} ${shape.animation.duration || 500}ms ease-out ${shape.animation.delay || 0}ms forwards;`;
    }
    if (shape.type === "image" && shape.src) return `<img src="${shape.src}"${morphAttrs} style="${pos}${animStyle}object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,.15)" />`;
    if (shape.type === "video" && shape.src) return `<video src="${shape.src}"${morphAttrs} controls style="${pos}${animStyle}box-shadow:0 2px 8px rgba(0,0,0,.15)"></video>`;
    if (shape.type === "audio" && shape.src) return `<audio src="${shape.src}"${morphAttrs} controls style="${pos}${animStyle}"></audio>`;
    const radius = shape.type === "ellipse" ? "50%" : "6px";
    const text = shape.text !== undefined ? `<span class="vno-show-shape-text">${this._escapeShapeText(shape.text)}</span>` : "";
    return `<div class="vno-show-shape"${morphAttrs} style="${pos}${animStyle}background:${shape.color || "#3b82f6"};opacity:.9;border-radius:${radius}">${text}</div>`;
  }

  _getMorphMatches(fromSlide, toSlide) {
    const fromById = new Map((fromSlide?.shapes || []).map(shape => [String(shape.id), shape]));
    return (toSlide?.shapes || []).flatMap((toShape) => {
      const fromShape = fromById.get(String(toShape.id));
      if (!fromShape || fromShape.type === "connector" || toShape.type === "connector" || fromShape.type !== toShape.type) return [];
      const geometry = [fromShape.x, fromShape.y, fromShape.w, fromShape.h, toShape.x, toShape.y, toShape.w, toShape.h];
      return geometry.every(Number.isFinite) ? [{ id: String(toShape.id), from: fromShape, to: toShape }] : [];
    });
  }

  _applyMorphTransition(content, fromSlide, toSlide, duration) {
    const matches = this._getMorphMatches(fromSlide, toSlide);
    if (!matches.length) return false;
    const nodes = [...(content.querySelectorAll?.("[data-vno-shape-id]") || [])];
    const nodeById = new Map(nodes.map(node => [String(node.dataset?.vnoShapeId || ""), node]));
    const matchedIds = new Set(matches.map(match => match.id));
    const ms = Math.max(1, Number(duration) || 500);

    for (const match of matches) {
      const node = nodeById.get(match.id);
      if (!node) continue;
      const scaleX = match.to.w ? match.from.w / match.to.w : 1;
      const scaleY = match.to.h ? match.from.h / match.to.h : 1;
      node.classList?.add("vno-morph-shape");
      node.dataset.vnoMorphState = "from";
      node.style.transition = `transform ${ms}ms ease-in-out, background-color ${ms}ms ease-in-out, opacity ${ms}ms ease-in-out`;
      node.style.transformOrigin = "top left";
      node.style.transform = `translate(${match.from.x - match.to.x}px, ${match.from.y - match.to.y}px) scale(${scaleX}, ${scaleY})`;
      node.style.backgroundColor = match.from.color || "#3b82f6";
      node.style.opacity = "0.9";
    }
    for (const node of nodes) {
      if (!matchedIds.has(String(node.dataset?.vnoShapeId || ""))) node.classList?.add("vno-morph-enter");
    }

    // Commit the FLIP start state before moving to the target state; this is required for a real CSS transition.
    for (const match of matches) void nodeById.get(match.id)?.offsetWidth;

    const start = () => {
      for (const match of matches) {
        const node = nodeById.get(match.id);
        if (!node) continue;
        node.dataset.vnoMorphState = "running";
        node.style.transform = "translate(0px, 0px) scale(1, 1)";
        node.style.backgroundColor = match.to.color || "#3b82f6";
        node.style.opacity = "0.9";
      }
    };
    setTimeout(start, 32);
    return true;
  }

  _shapeSorterHtml(shape) {
    if (shape.type === "connector") {
      return `<svg class="vno-sorter-shape" viewBox="0 0 ${this.slideSize.width} ${this.slideSize.height}" preserveAspectRatio="none"><line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.color || "#475569"}" stroke-width="8"/></svg>`;
    }
    if (shape.type !== "rect" && shape.type !== "ellipse") return "";
    const style = `left:${shape.x / this.slideSize.width * 100}%;top:${shape.y / this.slideSize.height * 100}%;width:${shape.w / this.slideSize.width * 100}%;height:${shape.h / this.slideSize.height * 100}%;background:${shape.color || "#3b82f6"};border-radius:${shape.type === "ellipse" ? "50%" : "4px"}`;
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
    const shape = slide.shapes[index];
    if (shape.diagramRole === "node" && shape.diagramGroupId) {
      const removed = slide.shapes
        .map((item, itemIndex) => ({ shape: item, index: itemIndex }))
        .filter(item => String(item.shape.id) === String(shapeId) || (
          item.shape.diagramRole === "connector" &&
          item.shape.diagramGroupId === shape.diagramGroupId &&
          (String(item.shape.sourceId) === String(shapeId) || String(item.shape.targetId) === String(shapeId))
        ));
      const removedIds = new Set(removed.map(item => String(item.shape.id)));
      slide.shapes = slide.shapes.filter(item => !removedIds.has(String(item.id)));
      this.undoStack.push({ type: "diagram-node-delete", slideIndex: this.currentSlideIndex, shapes: this._cloneShapes(removed) });
      this.redoStack = [];
      this._syncUndoRedoState();
    } else {
      const [removed] = slide.shapes.splice(index, 1);
      this._recordShapeHistory("shape-delete", removed);
    }
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
      const isConnector = shape.type === "connector";
      const isSel = this.selectedShapeIds?.has(String(shape.id)) || String(this.selectedTarget) === String(shape.id);
      el.className = `vno-slide-shape-item ${isConnector ? "is-connector" : ""} ${shape.diagramRole === "node" ? "is-diagram-node" : ""} ${isSel ? "is-selected" : ""}`;
      el.dataset.shapeId = String(shape.id);
      el.style.cssText = `position:absolute; left:${shape.x}px; top:${shape.y}px; width:${shape.w}px; height:${shape.h}px; pointer-events:${isConnector ? "none" : "auto"}; cursor:${isConnector ? "default" : "move"};z-index:${isConnector ? 0 : 1};`;

      if (isConnector) {
        this._renderDiagramConnectorElement(el, shape);
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
      } else if (shape.type === "table") {
        el.style.backgroundColor = "#ffffff";
        el.style.opacity = "1";
        el.style.borderRadius = "2px";
        el.classList.add("vno-slide-table-shape");
        const table = document.createElement("table");
        table.className = "vno-slide-table";
        table.style.cssText = "width:100%;height:100%;border-collapse:collapse;background:#fff;table-layout:fixed;";
        (shape.cells || []).forEach((row, r) => {
          const tr = document.createElement("tr");
          (row || []).forEach((cell, c) => {
            const td = document.createElement(r === 0 ? "th" : "td");
            td.contentEditable = "true";
            td.textContent = cell || "";
            td.style.cssText = "border:1px solid #94a3b8;padding:6px 8px;font-size:13px;background:#fff;font-weight:" + (r === 0 ? "700" : "400") + ";";
            td.addEventListener("mousedown", (event) => event.stopPropagation());
            td.addEventListener("input", () => {
              if (!shape.cells[r]) shape.cells[r] = [];
              shape.cells[r][c] = td.textContent || "";
            });
            tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        el.appendChild(table);
      } else {
        el.style.backgroundColor = shape.color || "#3b82f6";
        el.style.opacity = "0.85";
        el.style.borderRadius = shape.type === "ellipse" ? "50%" : "6px";
        if (shape.text !== undefined) {
          const textEl = document.createElement("div");
          textEl.className = "vno-diagram-node-text";
          textEl.dataset.shapeTextId = String(shape.id);
          textEl.textContent = shape.text || "";
          textEl.contentEditable = "false";
          textEl.setAttribute("role", "textbox");
          textEl.setAttribute("aria-label", shape.text || t("slidesDialogs.diagramItem", { number: 1 }));
          const startEditing = (initialText) => {
            if (textEl.contentEditable !== "true") textEl.dataset.originalText = shape.text || "";
            textEl.contentEditable = "true";
            if (initialText !== undefined) textEl.textContent = initialText;
            textEl.focus();
            if (initialText !== undefined) {
              // Replacing textContent after focus resets the caret to the start in Chromium.
              // Put it after the seed character so click-then-type preserves keyboard order.
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(textEl);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
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

      if (shape.animation && shape.animation.type && shape.animation.type !== "none") {
        const badge = document.createElement("span");
        badge.className = "vno-anim-badge";
        badge.textContent = `★ ${shape.animation.type}`;
        badge.title = `Hiệu ứng: ${shape.animation.type} (${shape.animation.duration}ms)`;
        el.appendChild(badge);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!isConnector) this.selectShapeFromUserClick(shape, e);
        el.focus?.();
      });

      if (!isConnector) this._attachShapeDrag(el, shape);

      this.shapesLayer.appendChild(el);
    });

    this._updateSelectionUi();
    this._renderThumbnails();
    this._refreshSpellcheckRoots();
  }

  _ensureShapeSelectionHandles(el, shape) {
    if (!el || shape.type === "connector") return;
    if (!el.querySelector(".vno-shape-delete-btn")) {
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

    if (!el.querySelector(".vno-shape-resize-handle")) {
      const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
      handles.forEach(dir => {
        const h = document.createElement("div");
        h.className = `vno-shape-resize-handle vno-handle-${dir}`;
        h.dataset.handleDir = dir;
        this._attachResizeHandle(h, el, shape, dir);
        el.appendChild(h);
      });
    }
  }

  _removeShapeSelectionHandles(el) {
    if (!el) return;
    const delBtn = el.querySelector(".vno-shape-delete-btn");
    if (delBtn) delBtn.remove();
    el.querySelectorAll(".vno-shape-resize-handle").forEach(h => h.remove());
  }

  _attachResizeHandle(handleEl, shapeEl, shape, dir) {
    handleEl.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      event.preventDefault();

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const origX = shape.x;
      const origY = shape.y;
      const origW = shape.w;
      const origH = shape.h;
      const aspect = (origW && origH) ? origW / origH : 1;
      let resized = false;

      const move = (moveEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;
        if (!resized && Math.abs(dx) + Math.abs(dy) < 2) return;
        resized = true;

        let newX = origX;
        let newY = origY;
        let newW = origW;
        let newH = origH;

        const isCorner = ["nw", "ne", "se", "sw"].includes(dir);
        const keepAspect = isCorner && moveEvent.shiftKey;

        if (dir.includes("e")) {
          newW = Math.max(20, origW + dx);
        }
        if (dir.includes("s")) {
          newH = Math.max(20, origH + dy);
        }
        if (dir.includes("w")) {
          newW = Math.max(20, origW - dx);
          newX = origX + (origW - newW);
        }
        if (dir.includes("n")) {
          newH = Math.max(20, origH - dy);
          newY = origY + (origH - newH);
        }

        if (keepAspect) {
          if (dir === "se" || dir === "nw") {
            newH = Math.max(20, Math.round(newW / aspect));
            if (dir === "nw") newY = origY + (origH - newH);
          } else if (dir === "ne" || dir === "sw") {
            newH = Math.max(20, Math.round(newW / aspect));
            if (dir === "sw") newY = origY + (origH - newH);
          }
        }

        newX = Math.max(0, Math.min(this.slideSize.width - 20, newX));
        newY = Math.max(0, Math.min(this.slideSize.height - 20, newY));
        newW = Math.min(this.slideSize.width - newX, newW);
        newH = Math.min(this.slideSize.height - newY, newH);

        shape.x = newX;
        shape.y = newY;
        shape.w = newW;
        shape.h = newH;

        shapeEl.style.left = `${newX}px`;
        shapeEl.style.top = `${newY}px`;
        shapeEl.style.width = `${newW}px`;
        shapeEl.style.height = `${newH}px`;

        if (shape.diagramRole === "node") {
          this._updateDiagramConnectorsForNode(shape);
        }
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (resized) {
          this.undoStack.push({
            type: "shape-resize",
            slideIndex: this.currentSlideIndex,
            shapeId: shape.id,
            from: { x: origX, y: origY, w: origW, h: origH },
            to: { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
          });
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

  _clearSmartGuides() {
    if (this.smartGuidesLayer) this.smartGuidesLayer.innerHTML = "";
  }

  _renderSmartGuides(guideV, guideH) {
    if (!this.smartGuidesLayer) return;
    this.smartGuidesLayer.innerHTML = "";
    if (guideV !== null) {
      const v = document.createElement("div");
      v.className = "vno-smart-guide vno-smart-guide-v";
      v.style.cssText = `position:absolute;top:0;height:100%;left:${guideV}px;width:1px;border-left:1.5px dashed #ef4444;pointer-events:none;z-index:9999;box-sizing:border-box;`;
      this.smartGuidesLayer.appendChild(v);
    }
    if (guideH !== null) {
      const h = document.createElement("div");
      h.className = "vno-smart-guide vno-smart-guide-h";
      h.style.cssText = `position:absolute;left:0;width:100%;top:${guideH}px;height:1px;border-top:1.5px dashed #ef4444;pointer-events:none;z-index:9999;box-sizing:border-box;`;
      this.smartGuidesLayer.appendChild(h);
    }
  }

  _attachShapeDrag(el, shape) {
    el.addEventListener("pointerdown", (event) => {
      if (event.target?.classList?.contains("vno-shape-resize-handle")) return;
      if (event.target?.classList?.contains("vno-shape-delete-btn")) return;
      if (event.target?.classList?.contains("vno-diagram-node-text") && event.target.contentEditable === "true") return;

      if (el.setPointerCapture && event.pointerId != null) {
        try { el.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
      }

      const startX = event.clientX;
      const startY = event.clientY;

      if (!this.selectedShapeIds) this.selectedShapeIds = new Set();
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        if (shape.diagramGroupId) {
          if (this.diagramGroupSelectionId !== shape.diagramGroupId) {
            this.selectDiagramGroup(shape.diagramGroupId, shape.id);
          }
        } else if (!this.selectedShapeIds.has(String(shape.id))) {
          this.setSelectedTarget(shape.id);
        }
      }

      const slide = this.slides[this.currentSlideIndex];
      const allShapes = (slide && slide.shapes) || [];
      const isDiagramGroupMove = !!(this.diagramGroupSelectionId && shape.diagramGroupId === this.diagramGroupSelectionId);

      const activeGroupIds = new Set();
      this.selectedShapeIds.forEach(id => {
        const s = allShapes.find(item => String(item.id) === id);
        if (s?.groupId) activeGroupIds.add(s.groupId);
      });

      const shapesToMove = isDiagramGroupMove
        ? allShapes.filter(s => s.diagramGroupId === this.diagramGroupSelectionId && s.type !== "connector")
        : allShapes.filter(s => {
          if (s.type === "connector") return false;
          if (this.selectedShapeIds.has(String(s.id))) return true;
          if (s.groupId && activeGroupIds.has(s.groupId)) return true;
          if (String(s.id) === String(shape.id)) return true;
          return false;
        });

      const movingEntries = shapesToMove.map(s => {
        const shapeEl = this.shapesLayer?.querySelector(`[data-shape-id="${s.id}"]`);
        return { shape: s, startX: s.x, startY: s.y, el: shapeEl };
      });

      const groupIdForMove = isDiagramGroupMove ? this.diagramGroupSelectionId : null;
      const groupStartGeometries = isDiagramGroupMove
        ? new Map(this._getDiagramGroupShapes(groupIdForMove).map(s => [String(s.id), this._captureShapeGeometry(s)]))
        : null;

      const otherShapes = allShapes.filter(s => !shapesToMove.includes(s) && s.type !== "connector");

      let moved = false;

      const move = (moveEvent) => {
        let dx = moveEvent.clientX - startX;
        let dy = moveEvent.clientY - startY;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        moved = true;

        let candX = shape.x;
        let candY = shape.y;
        const targetOrigin = movingEntries.find(m => m.shape === shape) || movingEntries[0];
        if (targetOrigin) {
          candX = targetOrigin.startX + dx;
          candY = targetOrigin.startY + dy;
        }

        const snapThreshold = 5;
        let guideV = null;
        let guideH = null;

        const candLeft = candX;
        const candCenterX = candX + shape.w / 2;
        const candRight = candX + shape.w;

        const candTop = candY;
        const candCenterY = candY + shape.h / 2;
        const candBottom = candY + shape.h;

        const refLinesX = [
          { val: this.slideSize.width / 2 }
        ];
        otherShapes.forEach(o => {
          refLinesX.push({ val: o.x });
          refLinesX.push({ val: o.x + o.w / 2 });
          refLinesX.push({ val: o.x + o.w });
        });

        for (const ref of refLinesX) {
          if (Math.abs(candLeft - ref.val) <= snapThreshold) {
            dx += (ref.val - candLeft);
            guideV = ref.val;
            break;
          } else if (Math.abs(candCenterX - ref.val) <= snapThreshold) {
            dx += (ref.val - candCenterX);
            guideV = ref.val;
            break;
          } else if (Math.abs(candRight - ref.val) <= snapThreshold) {
            dx += (ref.val - candRight);
            guideV = ref.val;
            break;
          }
        }

        const refLinesY = [
          { val: this.slideSize.height / 2 }
        ];
        otherShapes.forEach(o => {
          refLinesY.push({ val: o.y });
          refLinesY.push({ val: o.y + o.h / 2 });
          refLinesY.push({ val: o.y + o.h });
        });

        for (const ref of refLinesY) {
          if (Math.abs(candTop - ref.val) <= snapThreshold) {
            dy += (ref.val - candTop);
            guideH = ref.val;
            break;
          } else if (Math.abs(candCenterY - ref.val) <= snapThreshold) {
            dy += (ref.val - candCenterY);
            guideH = ref.val;
            break;
          } else if (Math.abs(candBottom - ref.val) <= snapThreshold) {
            dy += (ref.val - candBottom);
            guideH = ref.val;
            break;
          }
        }

        this._renderSmartGuides(guideV, guideH);

        if (isDiagramGroupMove && groupStartGeometries && groupIdForMove) {
          this._applyDiagramGroupDelta(groupIdForMove, groupStartGeometries, dx, dy);
          this._syncDiagramGroupDom(groupIdForMove);
          return;
        }

        movingEntries.forEach(m => {
          m.shape.x = Math.max(0, Math.min(this.slideSize.width - m.shape.w, m.startX + dx));
          m.shape.y = Math.max(0, Math.min(this.slideSize.height - m.shape.h, m.startY + dy));
          if (m.el) {
            m.el.style.left = `${m.shape.x}px`;
            m.el.style.top = `${m.shape.y}px`;
          }
          if (m.shape.diagramRole === "node") {
            this._updateDiagramConnectorsForNode(m.shape);
          }
        });
      };

      const up = () => {
        this._clearSmartGuides();
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (moved) {
          if (isDiagramGroupMove && groupStartGeometries && groupStartGeometries.size) {
            const slideShapes = this.slides[this.currentSlideIndex]?.shapes || [];
            this.undoStack.push({
              type: "diagram-group-move",
              slideIndex: this.currentSlideIndex,
              diagramGroupId: groupIdForMove,
              shapes: [...groupStartGeometries.keys()].map(id => {
                const s = slideShapes.find(item => String(item.id) === id);
                return {
                  id: s ? s.id : id,
                  from: groupStartGeometries.get(id),
                  to: s ? this._captureShapeGeometry(s) : groupStartGeometries.get(id)
                };
              })
            });
          } else if (movingEntries.length === 1) {
            this.undoStack.push({
              type: "shape-move",
              slideIndex: this.currentSlideIndex,
              shapeId: movingEntries[0].shape.id,
              from: { x: movingEntries[0].startX, y: movingEntries[0].startY },
              to: { x: movingEntries[0].shape.x, y: movingEntries[0].shape.y }
            });
          } else {
            this.undoStack.push({
              type: "shapes-move",
              slideIndex: this.currentSlideIndex,
              moves: movingEntries.map(m => ({
                shapeId: m.shape.id,
                from: { x: m.startX, y: m.startY },
                to: { x: m.shape.x, y: m.shape.y }
              }))
            });
          }
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

  _attachDiagramNodeDrag(el, shape) {
    return this._attachShapeDrag(el, shape);
  }

  _setupCanvasEvents() {
    if (!this.canvasEl) return;

    // Marquee / Rubber-band Selection
    this.canvasEl.addEventListener("pointerdown", (event) => {
      if (event.target !== this.canvasEl && event.target !== this.shapesLayer) {
        return;
      }
      if (event.target.closest?.(".vno-slide-shape-item") ||
          event.target.closest?.(".vno-slide-comment-indicator") ||
          event.target.closest?.(".vno-slide-title") ||
          event.target.closest?.(".vno-slide-body")) {
        return;
      }

      const rect = this.canvasEl.getBoundingClientRect();
      const startX = event.clientX - rect.left;
      const startY = event.clientY - rect.top;

      if (!event.shiftKey && !event.ctrlKey) {
        this.setSelectedTarget(null);
      }

      const marqueeEl = document.createElement("div");
      marqueeEl.className = "vno-marquee-selection";
      marqueeEl.style.cssText = `position:absolute;left:${startX}px;top:${startY}px;width:0px;height:0px;border:1.5px dashed #2563eb;background:rgba(37,99,235,0.12);pointer-events:none;z-index:9998;box-sizing:border-box;`;
      this.canvasEl.appendChild(marqueeEl);

      let moved = false;
      const initialSelected = new Set(this.selectedShapeIds || []);

      const move = (moveEvent) => {
        const curX = moveEvent.clientX - rect.left;
        const curY = moveEvent.clientY - rect.top;
        const minX = Math.max(0, Math.min(startX, curX));
        const minY = Math.max(0, Math.min(startY, curY));
        const width = Math.abs(curX - startX);
        const height = Math.abs(curY - startY);

        if (!moved && width + height < 3) return;
        moved = true;

        marqueeEl.style.left = `${minX}px`;
        marqueeEl.style.top = `${minY}px`;
        marqueeEl.style.width = `${width}px`;
        marqueeEl.style.height = `${height}px`;

        const slide = this.slides[this.currentSlideIndex];
        const shapes = (slide && slide.shapes) || [];
        const currentSelected = new Set(initialSelected);

        shapes.forEach(sh => {
          if (sh.type === "connector") return;
          const shLeft = sh.x;
          const shTop = sh.y;
          const shRight = sh.x + sh.w;
          const shBottom = sh.y + sh.h;
          const mRight = minX + width;
          const mBottom = minY + height;

          const intersects = !(shRight < minX || shLeft > mRight || shBottom < minY || shTop > mBottom);
          if (intersects) {
            currentSelected.add(String(sh.id));
          }
        });

        this.selectedShapeIds = currentSelected;
        this.selectedTarget = Array.from(currentSelected)[0] || null;
        this._updateSelectionUi();
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (marqueeEl.parentNode) {
          marqueeEl.parentNode.removeChild(marqueeEl);
        }
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });

    // Keyboard navigation & manipulation
    this._windowKeyHandler = (e) => {
      const activeEl = typeof document !== "undefined" ? document.activeElement : null;
      if (activeEl && (activeEl.isContentEditable || activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      if (e.key === "Tab") {
        if (this.canvasEl && (document.activeElement === document.body || this.container?.contains(activeEl))) {
          e.preventDefault();
          this.selectNextObject(e.shiftKey);
          return;
        }
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (this.selectedShapeIds && this.selectedShapeIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          this.nudgeSelected(dx, dy);
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (this.selectedShapeIds && this.selectedShapeIds.size > 0) {
          e.preventDefault();
          this.deleteSelectedShapes();
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this._windowKeyHandler);
    }
  }

  groupSelectedShapes() {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !this.selectedShapeIds || this.selectedShapeIds.size < 2) return false;
    const selectedList = slide.shapes?.filter(s => this.selectedShapeIds.has(String(s.id)) && s.type !== "connector") || [];
    if (selectedList.length < 2) return false;

    const newGroupId = `group-${Date.now()}`;
    const previousGroups = selectedList.map(s => ({ shapeId: s.id, groupId: s.groupId || null }));
    selectedList.forEach(s => { s.groupId = newGroupId; });

    this.undoStack.push({
      type: "shapes-group",
      slideIndex: this.currentSlideIndex,
      groupId: newGroupId,
      previousGroups
    });
    this.redoStack = [];
    this._syncUndoRedoState();
    this._renderShapesLayer();
    return true;
  }

  ungroupSelectedShapes() {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !this.selectedShapeIds || this.selectedShapeIds.size === 0) return false;
    const allShapes = slide.shapes || [];
    const selected = allShapes.filter(s => this.selectedShapeIds.has(String(s.id)));
    const targetGroup = selected.find(s => s.groupId)?.groupId;
    if (!targetGroup) return false;

    const groupShapes = allShapes.filter(s => s.groupId === targetGroup);
    groupShapes.forEach(s => { s.groupId = null; });

    this.undoStack.push({
      type: "shapes-ungroup",
      slideIndex: this.currentSlideIndex,
      groupId: targetGroup,
      shapeIds: groupShapes.map(s => s.id)
    });
    this.redoStack = [];
    this._syncUndoRedoState();
    this._renderShapesLayer();
    return true;
  }

  nudgeSelected(dx, dy) {
    if (this.diagramGroupSelectionId) {
      return this.moveDiagramGroupBy(this.diagramGroupSelectionId, dx, dy);
    }
    const slide = this.slides[this.currentSlideIndex];
    if (!slide || !this.selectedShapeIds || this.selectedShapeIds.size === 0) return false;
    const allShapes = slide.shapes || [];

    const activeGroupIds = new Set();
    this.selectedShapeIds.forEach(id => {
      const s = allShapes.find(item => String(item.id) === id);
      if (s?.groupId) activeGroupIds.add(s.groupId);
    });

    const shapesToMove = allShapes.filter(s => {
      if (s.type === "connector") return false;
      if (this.selectedShapeIds.has(String(s.id))) return true;
      if (s.groupId && activeGroupIds.has(s.groupId)) return true;
      return false;
    });

    if (shapesToMove.length === 0) return false;

    const moves = shapesToMove.map(s => {
      const from = { x: s.x, y: s.y };
      s.x = Math.max(0, Math.min(this.slideSize.width - s.w, s.x + dx));
      s.y = Math.max(0, Math.min(this.slideSize.height - s.h, s.y + dy));
      const shapeEl = this.shapesLayer?.querySelector(`[data-shape-id="${s.id}"]`);
      if (shapeEl) {
        shapeEl.style.left = `${s.x}px`;
        shapeEl.style.top = `${s.y}px`;
      }
      if (s.diagramRole === "node") this._updateDiagramConnectorsForNode(s);
      return { shapeId: s.id, from, to: { x: s.x, y: s.y } };
    });

    if (moves.length === 1) {
      this.undoStack.push({
        type: "shape-move",
        slideIndex: this.currentSlideIndex,
        shapeId: moves[0].shapeId,
        from: moves[0].from,
        to: moves[0].to
      });
    } else {
      this.undoStack.push({
        type: "shapes-move",
        slideIndex: this.currentSlideIndex,
        moves
      });
    }
    this.redoStack = [];
    this._syncUndoRedoState();
    this._renderThumbnails();
    return true;
  }

  selectNextObject(backward = false) {
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return;
    const targets = [];
    const layout = slide.layoutType || "title-content";
    if (layout !== "blank") {
      targets.push("title");
      if (layout !== "title-only") {
        targets.push("body");
        if (layout === "two-content") targets.push("body2");
      }
    }
    (slide.shapes || []).forEach(s => {
      if (s.type !== "connector") targets.push(s.id);
    });

    if (targets.length === 0) return;

    let curIdx = -1;
    if (this.selectedTarget) {
      curIdx = targets.findIndex(t => String(t) === String(this.selectedTarget));
    }

    let nextIdx;
    if (curIdx === -1) {
      nextIdx = backward ? targets.length - 1 : 0;
    } else {
      nextIdx = backward ? (curIdx - 1 + targets.length) % targets.length : (curIdx + 1) % targets.length;
    }

    const nextTarget = targets[nextIdx];
    this.setSelectedTarget(nextTarget);

    if (nextTarget === "title") this.titleEl?.focus();
    else if (nextTarget === "body") this.bodyEl?.focus();
    else if (nextTarget === "body2") this.body2El?.focus();
    else {
      const shEl = this.shapesLayer?.querySelector(`[data-shape-id="${nextTarget}"]`);
      shEl?.focus();
    }
  }



  _renderDiagramConnectorElement(el, shape) {
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
  }

  _updateDiagramConnectorsForNode(node) {
    const shapes = this.slides[this.currentSlideIndex]?.shapes || [];
    const nodesById = new Map(shapes.filter(item => item.diagramRole === "node").map(item => [String(item.id), item]));
    for (const connector of shapes) {
      if (connector.diagramRole !== "connector" || connector.diagramGroupId !== node.diagramGroupId) continue;
      if (String(connector.sourceId) !== String(node.id) && String(connector.targetId) !== String(node.id)) continue;
      const source = nodesById.get(String(connector.sourceId));
      const target = nodesById.get(String(connector.targetId));
      if (!source || !target) continue;
      connector.x1 = source.x + source.w / 2; connector.y1 = source.y + source.h / 2;
      connector.x2 = target.x + target.w / 2; connector.y2 = target.y + target.h / 2;
      connector.x = Math.min(connector.x1, connector.x2); connector.y = Math.min(connector.y1, connector.y2);
      connector.w = Math.max(1, Math.abs(connector.x2 - connector.x1)); connector.h = Math.max(1, Math.abs(connector.y2 - connector.y1));
      const connectorEl = Array.from(this.shapesLayer?.children || []).find(item => item.dataset?.shapeId === String(connector.id));
      if (connectorEl) this._renderDiagramConnectorElement(connectorEl, connector);
    }
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

      item.setAttribute("draggable", "true");
      item.dataset.slideIndex = String(idx);
      item.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", String(idx));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        item.classList.add("is-dragging");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("is-dragging");
        this.slideListContainer?.querySelectorAll(".is-drag-over").forEach(el => el.classList.remove("is-drag-over"));
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        item.classList.add("is-drag-over");
      });
      item.addEventListener("dragleave", () => {
        item.classList.remove("is-drag-over");
      });
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        item.classList.remove("is-drag-over");
        const fromIndex = Number(event.dataTransfer?.getData("text/plain"));
        if (!Number.isNaN(fromIndex) && fromIndex !== idx) {
          this.moveSlide(fromIndex, idx);
        }
      });

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

    this._renderHeaderFooter();

    this._renderShapesLayer();
    this._refreshSpellcheckRoots();
    this._renderCommentsUi();

    if (this.isReadingView) {
      this._renderReadingSlide();
    }

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
      comments: [],
      headerFooter: this.headerFooter?.applyToAll !== false ? { ...(this.headerFooter || {}) } : undefined
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
    if (!this.slideSorterOverlay && this.selectedShapeIds && this.selectedShapeIds.size > 0) {
      return this.deleteSelectedShapes();
    }
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
    this._slideSorterPreviousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-slide-sorter-overlay";
    overlay.setAttribute?.("role", "dialog");
    overlay.setAttribute?.("aria-modal", "true");
    overlay.setAttribute?.("aria-label", "Bộ sắp xếp trang chiếu");
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
      } else if (event.key === "Tab") {
        trapFocus(overlay, event);
      }
    };
    document.addEventListener("keydown", this._slideSorterKeyHandler);
    document.body.appendChild(overlay);
    this.slideSorterOverlay = overlay;
    this.presentationView = "slideSorter";
    this._syncCommandStates();
    this._renderSlideSorterGrid();
    overlay.querySelector(".vno-slide-sorter-close")?.focus?.();
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
    this.presentationView = "normal";
    this._syncCommandStates();
    if (this._slideSorterPreviousFocused && typeof this._slideSorterPreviousFocused.focus === "function") {
      try { this._slideSorterPreviousFocused.focus(); } catch (_) {}
      this._slideSorterPreviousFocused = null;
    }
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
      item.setAttribute?.("aria-label", `Trang chiếu ${index + 1}: ${slide.title || "Không có tiêu đề"}`);
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
          <button type="button" data-action="duplicate" title="Nhân đôi trang chiếu ${index + 1}" aria-label="Nhân đôi trang chiếu ${index + 1}">Nhân đôi</button>
          <button type="button" data-action="delete" title="Xóa trang chiếu ${index + 1}" aria-label="Xóa trang chiếu ${index + 1}" ${this.slides.length <= 1 ? "disabled" : ""}>Xóa</button>
        </div>`;

      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.selectSlide(index);
          this.closeSlideSorter();
        }
      });
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
      this.currentSlideIndex = action.slideIndex;
      this._updateDiagramConnectorsForNode(shape);
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "diagram-node-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      slide.shapes ||= [];
      for (const item of [...action.shapes].sort((a, b) => a.index - b.index)) {
        slide.shapes.splice(Math.min(item.index, slide.shapes.length), 0, this._cloneShapes([item.shape])[0]);
      }
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "diagram-group-move") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      for (const item of action.shapes || []) {
        const shape = slide.shapes?.find(s => String(s.id) === String(item.id));
        if (shape) this._applyShapeGeometry(shape, item.from);
      }
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this.selectDiagramGroup(action.diagramGroupId);
      return true;
    } else if (action.type === "diagram-group-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      slide.shapes ||= [];
      for (const item of [...action.shapes].sort((a, b) => a.index - b.index)) {
        slide.shapes.splice(Math.min(item.index, slide.shapes.length), 0, this._cloneShapes([item.shape])[0]);
      }
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this.selectDiagramGroup(action.diagramGroupId);
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
    } else if (action.type === "master-theme") {
      this.applySlideMaster(action.before, false);
      this.redoStack.push(action);
      return true;
    } else if (action.type === "shape-move") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.x = action.from.x; shape.y = action.from.y;
      this.currentSlideIndex = action.slideIndex;
      if (shape.diagramRole === "node") this._updateDiagramConnectorsForNode(shape);
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-move") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      action.moves.forEach(m => {
        const s = slide.shapes?.find(item => String(item.id) === String(m.shapeId));
        if (s) {
          s.x = m.from.x; s.y = m.from.y;
          if (s.diagramRole === "node") this._updateDiagramConnectorsForNode(s);
        }
      });
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shape-resize") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.x = action.from.x; shape.y = action.from.y; shape.w = action.from.w; shape.h = action.from.h;
      this.currentSlideIndex = action.slideIndex;
      if (shape.diagramRole === "node") this._updateDiagramConnectorsForNode(shape);
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      slide.shapes ||= [];
      slide.shapes.push(...this._cloneShapes(action.shapes));
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-group") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      action.previousGroups.forEach(pg => {
        const s = slide.shapes?.find(item => String(item.id) === String(pg.shapeId));
        if (s) s.groupId = pg.groupId;
      });
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-ungroup") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      action.shapeIds.forEach(id => {
        const s = slide.shapes?.find(item => String(item.id) === String(id));
        if (s) s.groupId = action.groupId;
      });
      this.redoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "slide-size") {
      this._restoreSlideSize(action.before);
      this.redoStack.push(action);
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
      this.currentSlideIndex = action.slideIndex;
      this._updateDiagramConnectorsForNode(shape);
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "diagram-node-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      const ids = new Set(action.shapes.map(item => String(item.shape.id)));
      slide.shapes = (slide.shapes || []).filter(item => !ids.has(String(item.id)));
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "diagram-group-move") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      for (const item of action.shapes || []) {
        const shape = slide.shapes?.find(s => String(s.id) === String(item.id));
        if (shape) this._applyShapeGeometry(shape, item.to);
      }
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this.selectDiagramGroup(action.diagramGroupId);
      return true;
    } else if (action.type === "diagram-group-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      const ids = new Set(action.shapes.map(item => String(item.shape.id)));
      slide.shapes = (slide.shapes || []).filter(item => !ids.has(String(item.id)));
      this.undoStack.push(action);
      this.diagramGroupSelectionId = null;
      this.selectedShapeIds = new Set();
      this.selectedTarget = null;
      this.selectSlide(action.slideIndex);
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
    } else if (action.type === "master-theme") {
      this.applySlideMaster(action.after, false);
      this.undoStack.push(action);
      return true;
    } else if (action.type === "shape-move") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.x = action.to.x; shape.y = action.to.y;
      this.currentSlideIndex = action.slideIndex;
      if (shape.diagramRole === "node") this._updateDiagramConnectorsForNode(shape);
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-move") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      action.moves.forEach(m => {
        const s = slide.shapes?.find(item => String(item.id) === String(m.shapeId));
        if (s) {
          s.x = m.to.x; s.y = m.to.y;
          if (s.diagramRole === "node") this._updateDiagramConnectorsForNode(s);
        }
      });
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shape-resize") {
      const shape = this.slides[action.slideIndex]?.shapes?.find(item => String(item.id) === String(action.shapeId));
      if (!shape) return false;
      shape.x = action.to.x; shape.y = action.to.y; shape.w = action.to.w; shape.h = action.to.h;
      this.currentSlideIndex = action.slideIndex;
      if (shape.diagramRole === "node") this._updateDiagramConnectorsForNode(shape);
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-delete") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      const ids = new Set(action.shapes.map(s => String(s.id)));
      slide.shapes = (slide.shapes || []).filter(s => !ids.has(String(s.id)));
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-group") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      action.previousGroups.forEach(pg => {
        const s = slide.shapes?.find(item => String(item.id) === String(pg.shapeId));
        if (s) s.groupId = action.groupId;
      });
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "shapes-ungroup") {
      const slide = this.slides[action.slideIndex];
      if (!slide) return false;
      action.shapeIds.forEach(id => {
        const s = slide.shapes?.find(item => String(item.id) === String(id));
        if (s) s.groupId = null;
      });
      this.undoStack.push(action);
      this.selectSlide(action.slideIndex);
      this._renderShapesLayer();
      return true;
    } else if (action.type === "slide-size") {
      this._restoreSlideSize(action.after);
      this.undoStack.push(action);
      return true;
    }
    return false;
  }

  _createCommentsPanel(stage) {
    const panel = document.createElement("aside");
    panel.className = "vno-slide-comments-panel";
    panel.hidden = true;
    panel.setAttribute?.("role", "region");
    panel.setAttribute?.("aria-label", t("slidesDialogs.commentsLabel"));
    panel.innerHTML = `
      <header><strong>${t("slidesDialogs.commentsLabel")}</strong><button type="button" data-comment-close aria-label="${t("slidesDialogs.close")}">×</button></header>
      <div class="vno-slide-comments-list" aria-live="polite"></div>
      <label class="vno-slide-comment-compose">${t("slidesDialogs.newComment")}
        <textarea rows="3" placeholder="${t("slidesDialogs.commentPlaceholder")}" aria-label="${t("slidesDialogs.newComment")}"></textarea>
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
    this._commentsPreviousFocused = document.activeElement;
    this.commentPanelEl.hidden = false;
    this._renderCommentsUi();
    if (focusInput) this.commentPanelEl.querySelector("textarea")?.focus?.();
    if (!this._commentsEscapeHandler && typeof document !== "undefined") {
      this._commentsEscapeHandler = (event) => {
        if (event.key === "Escape" && this.commentPanelEl && !this.commentPanelEl.hidden) {
          event.preventDefault();
          this.closeCommentsPanel();
        }
      };
      document.addEventListener("keydown", this._commentsEscapeHandler);
    }
    return true;
  }

  closeCommentsPanel() {
    if (!this.commentPanelEl) return false;
    this.commentPanelEl.hidden = true;
    if (this._commentsEscapeHandler && typeof document !== "undefined") {
      document.removeEventListener("keydown", this._commentsEscapeHandler);
      this._commentsEscapeHandler = null;
    }
    if (this._commentsPreviousFocused && typeof this._commentsPreviousFocused.focus === "function") {
      try { this._commentsPreviousFocused.focus(); } catch (_) {}
      this._commentsPreviousFocused = null;
    }
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
        remove.setAttribute?.("aria-label", `Xóa nhận xét của ${comment.author}`);
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

  applySlideMaster(themeConfig, recordHistory = false) {
    if (!themeConfig) return false;
    if (typeof themeConfig === "string") {
      const found = SLIDE_MASTER_THEMES.find(t => t.id === themeConfig);
      if (found) themeConfig = found;
      else return false;
    }

    const previousTheme = { ...this.masterTheme };
    this.masterTheme = { ...this.masterTheme, ...themeConfig };
    if (recordHistory && JSON.stringify(previousTheme) !== JSON.stringify(this.masterTheme)) {
      this.undoStack.push({ type: "master-theme", before: previousTheme, after: { ...this.masterTheme } });
      this.redoStack = [];
      this._syncUndoRedoState();
    }

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
      this.masterFooterEl.style.color = this.masterTheme.bodyColor || "#64748b";
    }
    this._renderHeaderFooter();

    this._renderThumbnails();
    this._renderSlideSorterGrid();
    return true;
  }

  _applySlideSizeToDom() {
    if (!this.canvasEl) return;
    this.canvasEl.style.width = `${this.slideSize.width}px`;
    this.canvasEl.style.height = `${this.slideSize.height}px`;
    this.canvasEl.dataset.slideSize = this.slideSize.preset;
    this.container?.style?.setProperty?.("--vno-slide-aspect", `${this.slideSize.width} / ${this.slideSize.height}`);
    if (this.notesPanelEl) this.notesPanelEl.style.width = `${this.slideSize.width}px`;
    if (this.rulerVisible) {
      this._renderRulerH?.();
      this._renderRulerV?.();
    }
  }

  _captureSlideGeometry() {
    return this.slides.map(slide => (slide.shapes || []).map(shape => ({
      id: shape.id, x: shape.x, y: shape.y, w: shape.w, h: shape.h,
      x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2
    })));
  }

  _restoreSlideSize(snapshot) {
    this.slideSize = { ...snapshot.size };
    snapshot.geometry.forEach((geometry, slideIndex) => geometry.forEach(saved => {
      const shape = this.slides[slideIndex]?.shapes?.find(item => String(item.id) === String(saved.id));
      if (!shape) return;
      for (const key of ["x", "y", "w", "h", "x1", "y1", "x2", "y2"]) if (Number.isFinite(saved[key])) shape[key] = saved[key];
    }));
    this._applySlideSizeToDom();
    this.selectSlide(this.currentSlideIndex);
    this._renderThumbnails();
    this._renderSlideSorterGrid();
    return true;
  }

  setSlideSize(options, recordHistory = true) {
    options = options || {};
    const presets = { wide: { preset: "wide", width: 960, height: 540 }, standard: { preset: "standard", width: 720, height: 540 } };
    const next = presets[options.preset || options] || null;
    if (!next || next.preset === this.slideSize.preset) return false;
    const before = { size: { ...this.slideSize }, geometry: this._captureSlideGeometry() };
    const scaleX = next.width / this.slideSize.width;
    const scaleY = next.height / this.slideSize.height;
    for (const slide of this.slides) for (const shape of slide.shapes || []) {
      for (const key of ["x", "w", "x1", "x2"]) if (Number.isFinite(shape[key])) shape[key] = Math.round(shape[key] * scaleX * 100) / 100;
      for (const key of ["y", "h", "y1", "y2"]) if (Number.isFinite(shape[key])) shape[key] = Math.round(shape[key] * scaleY * 100) / 100;
    }
    this.slideSize = { ...next };
    this._applySlideSizeToDom();
    this.selectSlide(this.currentSlideIndex);
    this._renderThumbnails();
    this._renderSlideSorterGrid();
    if (recordHistory) {
      this.undoStack.push({ type: "slide-size", before, after: { size: { ...this.slideSize }, geometry: this._captureSlideGeometry() } });
      this.redoStack = [];
      this._syncUndoRedoState();
    }
    return true;
  }

  showSlideSizeDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise(resolve => {
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay vno-slide-size-dialog";
      overlay.innerHTML = `<div class="vno-dialog-box" style="width:480px" role="dialog" aria-modal="true" aria-labelledby="vno-slide-size-title">
        <div class="vno-dialog-header"><span id="vno-slide-size-title">${t("slidesDialogs.slideSizeTitle")}</span><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}">&times;</button></div>
        <div class="vno-dialog-body"><p style="font-size:12px;color:#475569">${t("slidesDialogs.slideSizeHint")}</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" role="radiogroup" aria-labelledby="vno-slide-size-title">
          <button type="button" role="radio" class="vno-theme-card" data-slide-size="wide" aria-checked="${this.slideSize.preset === "wide"}" aria-pressed="${this.slideSize.preset === "wide"}"><span style="display:block;aspect-ratio:16/9;background:#dbeafe;border:2px solid #2563eb" aria-hidden="true"></span><strong>${t("slidesDialogs.slideSizeWide")}</strong><small>16:9 · 960 × 540</small></button>
          <button type="button" role="radio" class="vno-theme-card" data-slide-size="standard" aria-checked="${this.slideSize.preset === "standard"}" aria-pressed="${this.slideSize.preset === "standard"}"><span style="display:block;aspect-ratio:4/3;background:#ffedd5;border:2px solid #f97316" aria-hidden="true"></span><strong>${t("slidesDialogs.slideSizeStandard")}</strong><small>4:3 · 720 × 540</small></button>
        </div></div></div>`;
      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");
      let closed = false;
      const close = value => {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        overlay.remove();
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
        resolve(value);
      };
      const onKey = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
        } else if (event.key === "Tab") {
          trapFocus(dialogBox, event);
        }
      };
      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => close(false));
      overlay.querySelectorAll("[data-slide-size]").forEach(button => button.addEventListener("click", () => close(this.setSlideSize({ preset: button.dataset.slideSize }))));
      const activeBtn = overlay.querySelector('[data-slide-size][aria-checked="true"]') || overlay.querySelector("[data-slide-size]");
      activeBtn?.focus?.();
    });
  }

  showThemeGalleryDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise((resolve) => {
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay vno-theme-gallery-dialog";
      const selectedId = this.masterTheme.themeId || "modern-blue";
      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width:720px;max-width:calc(100vw - 32px)" role="dialog" aria-modal="true" aria-labelledby="vno-theme-gallery-title">
          <div class="vno-dialog-header"><span id="vno-theme-gallery-title">${t("slidesDialogs.themeGalleryTitle")}</span><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}">&times;</button></div>
          <div class="vno-dialog-body">
            <p style="font-size:12px;color:#475569;margin:0 0 12px">${t("slidesDialogs.themeGalleryHint")}</p>
            <div class="vno-theme-gallery-grid" role="radiogroup" aria-labelledby="vno-theme-gallery-title" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
              ${SLIDE_MASTER_THEMES.map(theme => `
                <button type="button" role="radio" class="vno-theme-card ${theme.id === selectedId ? "is-selected" : ""}" data-theme-id="${theme.id}" aria-checked="${theme.id === selectedId}" aria-pressed="${theme.id === selectedId}" style="background:${theme.bgColor};text-align:left;min-height:112px">
                  <span style="display:block;height:7px;background:${theme.accentColor};border-radius:3px" aria-hidden="true"></span>
                  <strong style="display:block;margin:11px 0 6px;color:${theme.titleColor};font-family:${theme.fontFamily}">${t(theme.nameKey)}</strong>
                  <span style="display:block;color:${theme.bodyColor};font:11px ${theme.fontFamily}">${t("slidesDialogs.themePreviewTitle")}</span>
                  <span style="display:block;margin-top:13px;color:${theme.accentColor};font:9px ${theme.fontFamily}">${theme.logoText}</span>
                </button>`).join("")}
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");
      let closed = false;
      const close = (value) => {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        overlay.remove();
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
        resolve(value);
      };
      const onKey = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
        } else if (event.key === "Tab") {
          trapFocus(dialogBox, event);
        }
      };
      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => close(false));
      overlay.querySelectorAll("[data-theme-id]").forEach(card => card.addEventListener("click", () => {
        const theme = SLIDE_MASTER_THEMES.find(item => item.id === card.dataset.themeId);
        if (!theme) return;
        this.applySlideMaster({ ...theme, themeId: theme.id }, true);
        close(true);
      }));
      const activeCard = overlay.querySelector(".vno-theme-card.is-selected") || overlay.querySelector("[data-theme-id]");
      activeCard?.focus?.();
    });
  }

  showSlideMasterDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise((resolve) => {
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      let selectedId = this.masterTheme.themeId || "modern-blue";

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 540px;" role="dialog" aria-modal="true" aria-labelledby="vno-master-dialog-title">
          <div class="vno-dialog-header">
            <span id="vno-master-dialog-title">${t("slidesDialogs.masterTitle")}</span>
            <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <p style="font-size:12px;color:#475569;margin:0;">${t("slidesDialogs.masterHint", "Chọn một mẫu phong cách để đồng bộ màu sắc, phông chữ và logo cho tất cả các trang chiếu:")}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" id="vno-master-themes-grid" role="radiogroup" aria-labelledby="vno-master-dialog-title">
              ${SLIDE_MASTER_THEMES.map(theme => `
                <button type="button" role="radio" class="vno-theme-card ${theme.id === selectedId ? "is-selected" : ""}" data-theme-id="${theme.id}" aria-checked="${theme.id === selectedId}" aria-pressed="${theme.id === selectedId}" style="background:${theme.bgColor};text-align:left;border:2px solid ${theme.id === selectedId ? "#b53818" : "#cbd5e1"};border-radius:6px;padding:8px;cursor:pointer;">
                  <div style="height:4px;background:${theme.accentColor};border-radius:2px;" aria-hidden="true"></div>
                  <div style="font-weight:bold;font-size:12px;color:${theme.titleColor};font-family:${theme.fontFamily};margin-top:6px;">${t(theme.nameKey, theme.name)}</div>
                  <div style="font-size:10px;color:${theme.bodyColor};opacity:0.85;">Logo: ${theme.logoText}</div>
                </button>
              `).join("")}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
              <label for="vno-master-logo-input" style="font-size:11px;font-weight:600;color:#334155;">${t("slidesDialogs.masterLogoLabel", "Tên đơn vị / Logo chữ góc trang:")}</label>
              <input type="text" class="vno-input" id="vno-master-logo-input" value="${this.masterTheme.logoText || "VN OFFICE"}" aria-label="${t("slidesDialogs.masterLogoAria", "Tên đơn vị hoặc logo chữ góc trang")}" style="padding:4px 8px;font-size:12px;" />
            </div>
          </div>
          <div class="vno-dialog-footer">
            <button type="button" class="vno-btn" id="vno-master-cancel">${t("slidesDialogs.cancel")}</button>
            <button type="button" class="vno-btn vno-btn-primary" id="vno-master-apply">${t("slidesDialogs.applyMaster")}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");

      const cards = overlay.querySelectorAll(".vno-theme-card");
      cards.forEach(c => {
        c.addEventListener("click", () => {
          cards.forEach(x => {
            x.classList.remove("is-selected");
            x.setAttribute("aria-checked", "false");
            x.setAttribute("aria-pressed", "false");
            x.style.borderColor = "#cbd5e1";
          });
          c.classList.add("is-selected");
          c.setAttribute("aria-checked", "true");
          c.setAttribute("aria-pressed", "true");
          c.style.borderColor = "#b53818";
          selectedId = c.dataset.themeId;
          const found = SLIDE_MASTER_THEMES.find(t => t.id === selectedId);
          if (found) {
            const logoInp = overlay.querySelector("#vno-master-logo-input");
            if (logoInp) logoInp.value = found.logoText;
          }
        });
      });

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          resolve(false);
        } else if (e.key === "Tab") {
          trapFocus(dialogBox, e);
        }
      };
      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", e => { if (e.target === overlay) { close(); resolve(false); } });
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

      const activeCard = overlay.querySelector(".vno-theme-card.is-selected") || overlay.querySelector(".vno-theme-card");
      activeCard?.focus?.();
    });
  }

  showDiagramDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    return new Promise((resolve) => {
      const previousFocused = document.activeElement;
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
            <p class="vno-diagram-hint" style="color:#475569;">${t("slidesDialogs.diagramHint")}</p>
            <div class="vno-diagram-type-grid" role="radiogroup" aria-labelledby="vno-diagram-title">${types.map(([id, key, preview], index) => `<button type="button" role="radio" class="vno-diagram-type ${index === 0 ? "is-selected" : ""}" data-diagram-type="${id}" aria-checked="${index === 0}" aria-pressed="${index === 0}"><span class="vno-diagram-type-preview" aria-hidden="true">${preview.replace(/\n/g, "<br>")}</span><strong>${t(`slidesDialogs.${key}`)}</strong></button>`).join("")}</div>
            <label class="vno-diagram-count" for="vno-diagram-count">${t("slidesDialogs.diagramNodeCount")}<input id="vno-diagram-count" aria-label="${t("slidesDialogs.diagramNodeCount")}" type="number" min="3" max="6" value="4" /></label>
          </div>
          <div class="vno-dialog-footer"><button type="button" class="vno-btn" id="vno-diagram-cancel">${t("slidesDialogs.cancel")}</button><button type="button" class="vno-btn vno-btn-primary" id="vno-diagram-insert">${t("slidesDialogs.diagramInsert")}</button></div>
        </div>`;
      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");
      let selectedType = "process";
      const cards = overlay.querySelectorAll(".vno-diagram-type");
      cards.forEach(card => card.addEventListener("click", () => {
        cards.forEach(item => { item.classList.remove("is-selected"); item.setAttribute("aria-checked", "false"); item.setAttribute("aria-pressed", "false"); });
        card.classList.add("is-selected"); card.setAttribute("aria-checked", "true"); card.setAttribute("aria-pressed", "true"); selectedType = card.dataset.diagramType;
      }));
      let closed = false;
      const close = (value) => {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        overlay.remove();
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close(false);
        } else if (e.key === "Tab") {
          trapFocus(dialogBox, e);
        }
      };
      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
      overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => close(false));
      overlay.querySelector("#vno-diagram-cancel")?.addEventListener("click", () => close(false));
      overlay.querySelector("#vno-diagram-insert")?.addEventListener("click", () => {
        const count = overlay.querySelector("#vno-diagram-count")?.value || 4;
        close(!!this.insertDiagram(selectedType, count));
      });
      const activeCard = overlay.querySelector(".vno-diagram-type.is-selected") || overlay.querySelector(".vno-diagram-type");
      activeCard?.focus?.();
    });
  }

  showLayoutDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return Promise.resolve(false);

    return new Promise((resolve) => {
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      let selectedId = slide.layoutType || "title-content";

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 560px;" role="dialog" aria-modal="true" aria-labelledby="vno-layout-dialog-title">
          <div class="vno-dialog-header">
            <span id="vno-layout-dialog-title">${t("slidesDialogs.layoutTitle")}</span>
            <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;">
            <p style="font-size:12px;color:#475569;margin:0;">
              ${t("slidesDialogs.layoutHint", "Chọn một bố cục chuẩn để định hình lại cấu trúc nội dung trang chiếu hiện tại:")}
            </p>
            <div class="vno-layouts-grid" id="vno-layouts-grid" role="radiogroup" aria-labelledby="vno-layout-dialog-title">
              ${SLIDE_LAYOUT_TYPES.map(layout => `
                <button type="button" role="radio" aria-checked="${layout.id === selectedId}" aria-pressed="${layout.id === selectedId}" class="vno-layout-card ${layout.id === selectedId ? "is-selected" : ""}" data-layout-id="${layout.id}" style="text-align:left;">
                  <div class="vno-layout-card-preview" aria-hidden="true">
                    ${layout.previewSvg}
                  </div>
                  <div class="vno-layout-card-header">
                    <span class="vno-layout-card-name">${getLocale() === "en" ? (layout.nameEn || layout.name) : layout.name}</span>
                    <span class="vno-layout-card-badge">${getLocale() === "en" ? (layout.badgeEn || layout.badge) : layout.badge}</span>
                  </div>
                  <div class="vno-layout-card-desc">${getLocale() === "en" ? (layout.descEn || layout.description) : layout.description}</div>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
            <button type="button" class="vno-btn" id="vno-layout-cancel">${t("slidesDialogs.cancel")}</button>
            <div style="display:flex;gap:8px;">
              <button type="button" class="vno-btn" id="vno-layout-apply-all">${t("slidesDialogs.applyLayoutAll", "Áp dụng cho tất cả")}</button>
              <button type="button" class="vno-btn vno-btn-primary" id="vno-layout-apply-current">${t("slidesDialogs.applyLayoutCurrent", "Áp dụng")}</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");

      const cards = overlay.querySelectorAll(".vno-layout-card");
      cards.forEach((card) => {
        card.addEventListener("click", () => {
          cards.forEach(c => {
            c.classList.remove("is-selected");
            c.setAttribute("aria-checked", "false");
            c.setAttribute("aria-pressed", "false");
          });
          card.classList.add("is-selected");
          card.setAttribute("aria-checked", "true");
          card.setAttribute("aria-pressed", "true");
          selectedId = card.dataset.layoutId;
        });
        card.addEventListener("dblclick", () => {
          selectedId = card.dataset.layoutId;
          this.applySlideLayout(selectedId, true);
          close();
          resolve(true);
        });
      });

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          resolve(false);
        } else if (e.key === "Tab") {
          trapFocus(dialogBox, e);
        }
      };
      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", e => { if (e.target === overlay) { close(); resolve(false); } });

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

      const activeLayout = overlay.querySelector(".vno-layout-card.is-selected") || overlay.querySelector(".vno-layout-card");
      activeLayout?.focus?.();
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
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      const currentType = this.transitionConfig.type || "fade";
      const currentDuration = this.transitionConfig.duration || 500;

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 460px;" role="dialog" aria-modal="true" aria-labelledby="vno-trans-dialog-title">
          <div class="vno-dialog-header">
            <span id="vno-trans-dialog-title">${t("slidesDialogs.transitionTitle")}</span>
            <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="vno-trans-type-select" style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.transitionTypeLabel", "Kiểu chuyển trang:")}</label>
              <select class="vno-select" id="vno-trans-type-select" aria-label="${t("slidesDialogs.transitionTypeLabel", "Kiểu chuyển trang:")}">
                <option value="fade" ${currentType === "fade" ? "selected" : ""}>${t("slidesDialogs.transFade", "Mờ dần (Fade)")}</option>
                <option value="slide" ${currentType === "slide" ? "selected" : ""}>${t("slidesDialogs.transSlide", "Trượt ngang (Slide)")}</option>
                <option value="zoom" ${currentType === "zoom" ? "selected" : ""}>${t("slidesDialogs.transZoom", "Thu phóng (Zoom)")}</option>
                <option value="flip" ${currentType === "flip" ? "selected" : ""}>${t("slidesDialogs.transFlip", "Lật trang 3D (Flip)")}</option>
                <option value="morph" ${currentType === "morph" ? "selected" : ""}>Morph</option>
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="vno-trans-duration-select" style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationDuration", "Thời gian hiệu ứng:")}</label>
              <select class="vno-select" id="vno-trans-duration-select" aria-label="${t("slidesDialogs.animationDuration", "Thời gian hiệu ứng:")}">
                <option value="300" ${currentDuration === 300 ? "selected" : ""}>${t("slidesDialogs.durationFast", "Nhanh (0.3 giây)")}</option>
                <option value="500" ${currentDuration === 500 ? "selected" : ""}>${t("slidesDialogs.durationNormal", "Tiêu chuẩn (0.5 giây)")}</option>
                <option value="800" ${currentDuration === 800 ? "selected" : ""}>${t("slidesDialogs.durationSlow", "Chậm (0.8 giây)")}</option>
                <option value="1000" ${currentDuration === 1000 ? "selected" : ""}>${t("slidesDialogs.durationVerySlow", "Rất chậm (1.0 giây)")}</option>
              </select>
            </div>
            <div style="padding:16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;text-align:center;overflow:hidden;">
              <div id="vno-trans-preview-box" style="font-size:16px;font-weight:bold;color:#b53818;padding:12px;background:#ffffff;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                ${t("slidesDialogs.sampleSlide", "Trang Chiếu Mẫu")}
              </div>
              <button type="button" class="vno-btn" id="vno-trans-preview-btn" style="margin-top:8px;font-size:11px;">${t("slidesDialogs.previewTransition", "▶ Xem thử hiệu ứng")}</button>
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
              <button type="button" class="vno-btn" id="vno-trans-cancel">${t("slidesDialogs.cancel")}</button>
            <div style="display:flex;gap:6px;">
              <button type="button" class="vno-btn" id="vno-trans-apply-current">${t("slidesDialogs.applyTransitionCurrent", "Áp dụng")}</button>
              <button type="button" class="vno-btn vno-btn-primary" id="vno-trans-apply-all">${t("slidesDialogs.applyTransitionAll", "Áp dụng cho tất cả")}</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");

      const previewBox = overlay.querySelector("#vno-trans-preview-box");
      const typeSelect = overlay.querySelector("#vno-trans-type-select");
      const durationSelect = overlay.querySelector("#vno-trans-duration-select");

      const runPreview = () => {
        if (!previewBox || !typeSelect || !durationSelect) return;
        const type = typeSelect.value;
        const dur = durationSelect.value;
        // Dialog preview has no adjacent-slide shape pair, so Morph previews its documented crossfade fallback.
        const previewType = type === "morph" ? "fade" : type;
        const animName = `vnoTransition${previewType.charAt(0).toUpperCase() + previewType.slice(1)}`;
        previewBox.style.animation = "none";
        void previewBox.offsetWidth;
        previewBox.style.animation = `${animName} ${dur}ms ease-out forwards`;
      };

      overlay.querySelector("#vno-trans-preview-btn")?.addEventListener("click", runPreview);
      typeSelect?.addEventListener("change", runPreview);

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener("keydown", onKeyDown);
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
      };
      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          resolve(false);
        } else if (e.key === "Tab") {
          trapFocus(dialogBox, e);
        }
      };
      document.addEventListener("keydown", onKeyDown);
      overlay.addEventListener("click", e => { if (e.target === overlay) { close(); resolve(false); } });
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

      typeSelect?.focus?.();
    });
  }

  showAnimationDialog() {
    if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return Promise.resolve(false);

    return new Promise((resolve) => {
      const previousFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";

      const targetOptions = [];
      const layout = slide.layoutType || "title-content";
      if (layout !== "blank") {
        targetOptions.push({ id: "title", label: `${t("slidesDialogs.targetTitle", "Tiêu đề")} ("${(slide.title || "").substring(0, 20)}...")` });
      }
      if (layout !== "blank" && layout !== "title-only") {
        targetOptions.push({ id: "body", label: layout === "two-content" ? `${t("slidesDialogs.targetCol1", "Nội dung cột 1")} ("${(slide.body || "").substring(0, 20)}...")` : `${t("slidesDialogs.targetBody", "Nội dung")} ("${(slide.body || "").substring(0, 20)}...")` });
      }
      if (layout === "two-content") {
        targetOptions.push({ id: "body2", label: `${t("slidesDialogs.targetCol2", "Nội dung cột 2")} ("${(slide.body2 || "").substring(0, 20)}...")` });
      }
      (slide.shapes || []).forEach((sh, idx) => {
        const typeName = sh.type === "image" ? t("slidesDialogs.shapeImage", "Hình ảnh") : (sh.type === "ellipse" ? t("slidesDialogs.shapeEllipse", "Hình elip") : t("slidesDialogs.shapeRectangle", "Hình chữ nhật"));
        targetOptions.push({ id: String(sh.id), label: `${typeName} #${idx + 1}` });
      });
      if (targetOptions.length === 0) {
        targetOptions.push({ id: "title", label: t("slidesDialogs.targetTitle", "Tiêu đề") });
      }

      let initialTarget = "title";
      if (this.selectedTarget) {
        if (targetOptions.some(t => t.id === String(this.selectedTarget))) {
          initialTarget = String(this.selectedTarget);
        }
      }
      let currentAnim = this.getObjectAnimation(initialTarget);

      overlay.innerHTML = `
        <div class="vno-dialog-box" style="width: 500px;" role="dialog" aria-modal="true" aria-labelledby="vno-anim-dialog-title">
          <div class="vno-dialog-header">
            <span id="vno-anim-dialog-title">${t("slidesDialogs.animationTitle")}</span>
            <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("slidesDialogs.close")}" style="font-size:16px;">&times;</button>
          </div>
          <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="vno-anim-target-select" style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationTarget")}</label>
              <select class="vno-select" id="vno-anim-target-select" aria-label="${t("slidesDialogs.animationTarget")}">
                ${targetOptions.map(t => `<option value="${t.id}" ${t.id === initialTarget ? "selected" : ""}>${t.label}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="vno-anim-type-select" style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationType")}</label>
              <select class="vno-select" id="vno-anim-type-select" aria-label="${t("slidesDialogs.animationType")}">
                <option value="none" ${currentAnim.type === "none" ? "selected" : ""}>${t("slidesDialogs.noAnimation")}</option>
                <option value="fadeIn" ${currentAnim.type === "fadeIn" || currentAnim.type === "fade" ? "selected" : ""}>${t("slidesDialogs.animFadeIn", "Mờ dần xuất hiện (Fade In)")}</option>
                <option value="flyIn" ${currentAnim.type === "flyIn" || currentAnim.type === "fly" ? "selected" : ""}>${t("slidesDialogs.animFlyIn", "Bay từ dưới lên (Fly In)")}</option>
                <option value="zoomIn" ${currentAnim.type === "zoomIn" || currentAnim.type === "zoom" ? "selected" : ""}>${t("slidesDialogs.animZoomIn", "Thu phóng xuất hiện (Zoom In)")}</option>
                <option value="bounceIn" ${currentAnim.type === "bounceIn" || currentAnim.type === "bounce" ? "selected" : ""}>${t("slidesDialogs.animBounceIn", "Nảy nhẹ xuất hiện (Bounce In)")}</option>
                <option value="slideLeft" ${currentAnim.type === "slideLeft" || currentAnim.type === "slide" ? "selected" : ""}>${t("slidesDialogs.animSlideLeft", "Trượt từ trái sang (Slide Left)")}</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="display:flex;flex-direction:column;gap:4px;">
                <label for="vno-anim-duration-select" style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationDuration")}</label>
                <select class="vno-select" id="vno-anim-duration-select" aria-label="${t("slidesDialogs.animationDuration")}">
                  <option value="300" ${currentAnim.duration === 300 ? "selected" : ""}>${t("slidesDialogs.durationVeryFast", "Rất nhanh (0.3s)")}</option>
                  <option value="500" ${currentAnim.duration === 500 ? "selected" : ""}>${t("slidesDialogs.durationNormal", "Tiêu chuẩn (0.5s)")}</option>
                  <option value="800" ${currentAnim.duration === 800 ? "selected" : ""}>${t("slidesDialogs.durationSlow", "Chậm (0.8s)")}</option>
                  <option value="1000" ${currentAnim.duration === 1000 ? "selected" : ""}>${t("slidesDialogs.duration1s", "1.0 giây")}</option>
                </select>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                <label for="vno-anim-delay-select" style="font-size:12px;font-weight:600;color:#334155;">${t("slidesDialogs.animationDelay")}</label>
                <select class="vno-select" id="vno-anim-delay-select" aria-label="${t("slidesDialogs.animationDelay")}">
                  <option value="0" ${currentAnim.delay === 0 ? "selected" : ""}>${t("slidesDialogs.immediate")}</option>
                  <option value="200" ${currentAnim.delay === 200 ? "selected" : ""}>${t("slidesDialogs.delay200", "Sau 0.2s")}</option>
                  <option value="500" ${currentAnim.delay === 500 ? "selected" : ""}>${t("slidesDialogs.delay500", "Sau 0.5s")}</option>
                  <option value="1000" ${currentAnim.delay === 1000 ? "selected" : ""}>${t("slidesDialogs.delay1000", "Sau 1.0s")}</option>
                </select>
              </div>
            </div>
            <div style="padding:16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;text-align:center;overflow:hidden;">
              <div id="vno-anim-preview-box" style="font-size:15px;font-weight:bold;color:#2563eb;padding:12px;background:#ffffff;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:inline-block;min-width:180px;">
                ${t("slidesDialogs.previewObject")}
              </div>
              <div>
                <button type="button" class="vno-btn" id="vno-anim-preview-btn" style="margin-top:10px;font-size:11px;">${t("slidesDialogs.previewAnimation")}</button>
              </div>
            </div>
          </div>
          <div class="vno-dialog-footer" style="display:flex;justify-content:space-between;">
            <button type="button" class="vno-btn" id="vno-anim-cancel">${t("slidesDialogs.cancel")}</button>
            <div style="display:flex;gap:6px;">
              <button type="button" class="vno-btn" id="vno-anim-clear" style="color:#ef4444;">${t("slidesDialogs.removeAnimation")}</button>
              <button type="button" class="vno-btn vno-btn-primary" id="vno-anim-apply">${t("slidesDialogs.applyAnimation")}</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const dialogBox = overlay.querySelector(".vno-dialog-box");

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

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener("keydown", onKeyDown);
        if (previousFocused && typeof previousFocused.focus === "function") {
          try { previousFocused.focus(); } catch (_) {}
        }
      };
      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          resolve(false);
        } else if (e.key === "Tab") {
          trapFocus(dialogBox, e);
        }
      };
      document.addEventListener("keydown", onKeyDown);
      overlay.addEventListener("click", e => { if (e.target === overlay) { close(); resolve(false); } });
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

      targetSelect?.focus?.();
    });
  }

  startSlideShow(startIndex, options = {}) {
    if (typeof document === "undefined" || !document.createElement) return false;
    options = options || {};
    const previousFocused = document.activeElement;
    const rehearsing = !!options.rehearsal;
    const idx = startIndex !== undefined ? startIndex : this.currentSlideIndex;
    let currentShowIdx = idx;

    const overlay = document.createElement("div");
    overlay.className = "vno-slideshow-overlay";
    overlay.setAttribute?.("role", "dialog");
    overlay.setAttribute?.("aria-modal", "true");
    overlay.setAttribute?.("aria-label", rehearsing ? t("slidesDialogs.rehearseTitle", "Tập dượt thời gian trình chiếu") : t("slidesDialogs.slideshowTitle", "Trình chiếu trang chiếu"));
    overlay.setAttribute?.("tabindex", "-1");

    const content = document.createElement("div");
    content.className = "vno-slideshow-content";
    content.style.height = `${this.slideSize.height / this.slideSize.width * 100}vw`;
    content.style.maxWidth = `${this.slideSize.width / this.slideSize.height * 100}vh`;

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
      rehearseTimerBox.innerHTML = `<span>${t("slidesDialogs.slideElapsed", "Trang")}: ${formatSeconds(slideElapsed)}</span> <span style="opacity:0.7;margin-left:10px;">${t("slidesDialogs.totalElapsed", "Tổng")}: ${formatSeconds(totalElapsed)}</span>`;
    };

    const captureSlideTiming = () => {
      const elapsed = Math.max(0, (performance.now() - rehearseSlideStart) / 1000);
      rehearseTimings[currentShowIdx] = (rehearseTimings[currentShowIdx] || 0) + elapsed;
    };

    if (rehearsing) {
      rehearseTimerBox = document.createElement("div");
      rehearseTimerBox.className = "vno-rehearse-timer-box";
      rehearseTimerBox.setAttribute?.("role", "timer");
      rehearseTimerBox.setAttribute?.("aria-live", "off");
      rehearseTimerBox.setAttribute?.("aria-label", t("slidesDialogs.rehearseClockAria", "Đồng hồ tập dượt thời gian"));
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

    const renderShow = (previousSlide = null) => {
      const s = this.slides[currentShowIdx];
      const transition = s.transition || this.transitionConfig || { type: "fade", duration: 500 };
      const isMorph = transition.type === "morph";
      const shapesHtml = (s.shapes || []).map(shape => this._shapePresentationHtml(shape, { suppressAnimation: isMorph })).join("");

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
        <div class="vno-slide-master-footer" style="color:${theme.bodyColor || "#475569"};">
          <span>${theme.footerText || t("slidesDialogs.footerDoc", "Tài liệu thuyết trình VN Office")}</span>
          <span>${t("slidesDialogs.slideCounter", { current: currentShowIdx + 1, total: this.slides.length })}</span>
          <span>${t("slidesDialogs.slideshowHint")}</span>
        </div>
      `;

      // Áp dụng Transition Animation thật
      content.style.animation = "none";
      void content.offsetWidth;
      if (transition.type === "morph" && this._applyMorphTransition(content, previousSlide, s, transition.duration)) {
        if (content.dataset) content.dataset.vnoTransition = "morph";
        else content.setAttribute?.("data-vno-transition", "morph");
      } else {
        // Safe Morph fallback: without a clear same-id shape match, crossfade instead of freezing or failing.
        const fallbackType = transition.type === "morph" ? "fade" : transition.type;
        const animName = `vnoTransition${fallbackType.charAt(0).toUpperCase() + fallbackType.slice(1)}`;
        const transitionState = transition.type === "morph" ? "morph-fallback-fade" : fallbackType;
        if (content.dataset) content.dataset.vnoTransition = transitionState;
        else content.setAttribute?.("data-vno-transition", transitionState);
        content.style.animation = `${animName} ${transition.duration}ms ease-out forwards`;
      }
    };

    renderShow();
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const goToSlide = (nextIdx) => {
      if (rehearsing) {
        captureSlideTiming();
        rehearseSlideStart = performance.now();
      }
      const previousSlide = this.slides[currentShowIdx];
      currentShowIdx = nextIdx;
      renderShow(previousSlide);
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
      if (previousFocused && typeof previousFocused.focus === "function") {
        try { previousFocused.focus(); } catch (_) {}
      }
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
      } else if (e.key === "Tab") {
        trapFocus(overlay, e);
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

    overlay.focus?.();

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
    const previousFocused = document.activeElement;
    const idx = startIndex !== undefined ? startIndex : this.currentSlideIndex;
    let currentShowIdx = idx;
    let secondsElapsed = 0;
    let timerInterval = null;

    const overlay = document.createElement("div");
    overlay.className = "vno-presenter-overlay";
    overlay.setAttribute?.("role", "dialog");
    overlay.setAttribute?.("aria-modal", "true");
    overlay.setAttribute?.("aria-label", t("slidesDialogs.presenterTitle", "Chế độ người thuyết trình"));
    overlay.setAttribute?.("tabindex", "-1");

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
          <strong>${t("slidesDialogs.presenterHeader", "CHẾ ĐỘ NGƯỜI THUYẾT TRÌNH (PRESENTER VIEW)")}</strong>
          <span style="font-size:11px;opacity:0.7;margin-left:8px;">• VN Slides</span>
        </div>
        <div class="vno-presenter-clocks">
          <div class="vno-presenter-timer-box" title="${t("slidesDialogs.elapsedTime", "Thời gian thuyết trình")}" role="timer" aria-label="${t("slidesDialogs.elapsedTime", "Thời gian thuyết trình")}">
            <span style="font-size:11px;opacity:0.7;">${t("slidesDialogs.elapsedLabel", "ĐÃ THUYẾT TRÌNH:")}</span>
            <strong id="vno-presenter-timer">00:00:00</strong>
          </div>
          <div class="vno-presenter-clock-box" title="${t("slidesDialogs.actualClock", "Đồng hồ thực tế")}" role="timer" aria-label="${t("slidesDialogs.actualClock", "Đồng hồ thực tế")}">
            <span style="font-size:11px;opacity:0.7;">${t("slidesDialogs.clockLabel", "ĐỒNG HỒ:")}</span>
            <strong id="vno-presenter-clock">${getClockTime()}</strong>
          </div>
        </div>
        <button type="button" class="vno-btn vno-btn-sm vno-presenter-exit-btn" id="vno-presenter-close" aria-label="${t("slidesDialogs.exitPresenterAria", "Thoát chế độ người thuyết trình (Esc)")}">${t("slidesDialogs.presenterExit", "✕ Thoát (Esc)")}</button>
      </div>

      <div class="vno-presenter-body">
        <!-- Cột trái: Slide hiện tại & Điều hướng -->
        <div class="vno-presenter-left-col">
          <div class="vno-presenter-slide-viewport" id="vno-presenter-slide-view"></div>
          <div class="vno-presenter-nav-bar">
            <button type="button" class="vno-btn" id="vno-presenter-prev" title="${t("slidesDialogs.prevSlideTitle", "Trang trước (←)")}" aria-label="${t("slidesDialogs.prevSlideTitle", "Trang trước (←)")}">${t("slidesDialogs.prevSlide", "◄ Trang trước")}</button>
            <span class="vno-presenter-counter" id="vno-presenter-counter">${t("slidesDialogs.slideCounter", { current: currentShowIdx + 1, total: this.slides.length })}</span>
            <button type="button" class="vno-btn vno-btn-primary" id="vno-presenter-next" title="${t("slidesDialogs.nextSlideTitle", "Trang tiếp (Space hoặc →)")}" aria-label="${t("slidesDialogs.nextSlideTitle", "Trang tiếp (Space hoặc →)")}">${t("slidesDialogs.nextSlide", "Trang tiếp ►")}</button>
          </div>
        </div>

        <!-- Cột phải: Ghi chú thuyết trình & Trang kế tiếp -->
        <div class="vno-presenter-right-col">
          <!-- Ghi chú -->
          <div class="vno-presenter-notes-box">
            <div class="vno-presenter-box-header">
              <span>${t("slidesDialogs.speakerNotesTitle", "📝 Ghi chú người thuyết trình")}</span>
              <div class="vno-presenter-font-controls">
                <button type="button" class="vno-btn vno-btn-sm" id="vno-notes-font-dec" title="${t("slidesDialogs.notesFontDecTitle", "Thu nhỏ chữ")}" aria-label="${t("slidesDialogs.notesFontDec", "Thu nhỏ cỡ chữ ghi chú")}">A-</button>
                <button type="button" class="vno-btn vno-btn-sm" id="vno-notes-font-inc" title="${t("slidesDialogs.notesFontIncTitle", "Phóng to chữ")}" aria-label="${t("slidesDialogs.notesFontInc", "Phóng to cỡ chữ ghi chú")}">A+</button>
              </div>
            </div>
            <div class="vno-presenter-notes-text" id="vno-presenter-notes-text"></div>
          </div>

          <!-- Trang kế tiếp -->
          <div class="vno-presenter-next-box">
            <div class="vno-presenter-box-header">
              <span>${t("slidesDialogs.nextSlideTitle", "⏭ Trang tiếp theo")}</span>
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
            <div style="font-size:9px;color:${theme.bodyColor || "#475569"};display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;margin-top:auto;">
              <span>${theme.footerText || t("slidesDialogs.footerDoc", "Tài liệu thuyết trình")}</span>
              <span>${t("slidesDialogs.slideCounter", { current: currentShowIdx + 1, total: this.slides.length })}</span>
            </div>
          </div>
        `;
      }

      if (counterEl) {
        counterEl.textContent = t("slidesDialogs.slideCounter", { current: currentShowIdx + 1, total: this.slides.length });
      }

      if (notesTextEl) {
        if (s.notes && s.notes.trim()) {
          notesTextEl.textContent = s.notes;
          notesTextEl.style.fontStyle = "normal";
          notesTextEl.style.color = "#f1f5f9";
        } else {
          notesTextEl.textContent = t("slidesDialogs.noNotes", "(Chưa có ghi chú cho trang chiếu này. Bạn có thể nhập ghi chú ở bảng Ghi chú dưới canvas khi biên tập).");
          notesTextEl.style.fontStyle = "italic";
          notesTextEl.style.color = "#94a3b8";
        }
        notesTextEl.style.fontSize = `${notesFontSize}px`;
      }

      if (nextPreviewEl) {
        if (currentShowIdx < this.slides.length - 1) {
          const nextSlide = this.slides[currentShowIdx + 1];
          nextPreviewEl.innerHTML = `
            <div style="font-weight:700;font-size:13px;color:#38bdf8;margin-bottom:4px;">${t("slidesDialogs.slideElapsed", "Trang")} ${currentShowIdx + 2}: ${nextSlide.title}</div>
            <div style="font-size:11px;color:#cbd5e1;line-height:1.4;white-space:pre-line;">${(nextSlide.body || "").substring(0, 120)}...</div>
          `;
        } else {
          nextPreviewEl.innerHTML = `
            <div style="font-size:12px;color:#94a3b8;font-style:italic;padding:12px 0;">
              ${t("slidesDialogs.endOfShow", "Đây là trang chiếu cuối cùng.")}
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
      if (previousFocused && typeof previousFocused.focus === "function") {
        try { previousFocused.focus(); } catch (_) {}
      }
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
      } else if (e.key === "Tab") {
        trapFocus(overlay, e);
      }
    };

    document.addEventListener("keydown", keyHandler);
    this._activePresenterCleanup?.();
    this._activePresenterCleanup = closePresenter;
    overlay.querySelector("#vno-presenter-next")?.focus?.();
    return true;
  }

  destroy() {
    this.closeSlideSorter();
    this._activeShowCleanup?.();
    this._activePresenterCleanup?.();
    this._activeShowCleanup = null;
    this._activePresenterCleanup = null;
    if (typeof window !== "undefined" && this._windowKeyHandler) {
      window.removeEventListener("keydown", this._windowKeyHandler);
      this._windowKeyHandler = null;
    }
  }

  /**
   * Đặt lại bản trình chiếu về trạng thái trang trắng ban đầu (1 slide duy nhất).
   * @param {string} [defaultTitle]
   */
  resetToBlank(defaultTitle = "BẢN TRÌNH CHIẾU MỚI") {
    this.closeSlideSorter();
    this._activeShowCleanup?.();
    this._activePresenterCleanup?.();
    this._activeShowCleanup = null;
    this._activePresenterCleanup = null;

    this.slides = [
      {
        id: 1,
        title: defaultTitle,
        body: "Nhấn vào đây để thêm nội dung trình chiếu...",
        layoutType: "title-content",
        shapes: [],
        comments: [],
        notes: "",
        titleAnimation: { type: "none", duration: 500, delay: 0 }
      }
    ];
    this.currentSlideIndex = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.selectedTarget = null;
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
    this.slideSize = { preset: "wide", width: 960, height: 540 };
    this.headerFooter = {
      showDate: false,
      showSlideNumber: true,
      showFooter: true,
      footerText: this.masterTheme.footerText,
      dateFormat: "dd/MM/yyyy",
      applyToAll: true
    };
    this.transitionConfig = {
      type: "fade",
      duration: 500
    };

    if (this.canvasEl) {
      this._applySlideSizeToDom();
      this.selectSlide(0);
      this._renderThumbnails();
      this.applySlideMaster(this.masterTheme);
      this._syncUndoRedoState();
      this._applyViewState();
      this._syncCommandStates();
    }
  }

  // =========================================================================
  // VIEW TAB METHODS (Chế độ xem, Hiển thị, Thu phóng, Cửa sổ mới)
  // =========================================================================

  _escapeHtml(value) {
    if (value === undefined || value === null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  _syncCommandStates() {
    if (typeof globalCommandBus === "undefined" || !globalCommandBus?.updateState) return;
    this._syncUndoRedoState();
    globalCommandBus.updateState("slides.view.normal", { checked: this.presentationView === "normal" });
    globalCommandBus.updateState("slides.view.slideSorter", { checked: this.presentationView === "slideSorter" });
    globalCommandBus.updateState("slides.view.reading", { checked: this.presentationView === "reading" });
    globalCommandBus.updateState("slides.notes.toggle", { checked: !!this.isNotesVisible });
    globalCommandBus.updateState("slides.view.ruler", { checked: !!this.rulerVisible });
    globalCommandBus.updateState("slides.view.gridlines", { checked: !!this.gridlinesVisible });
    globalCommandBus.updateState("slides.view.guides", { checked: !!this.guidesVisible });
  }

  _applyViewState() {
    if (this.canvasEl?.style) {
      this.canvasEl.style.transform = `scale(${this.zoomLevel})`;
      this.canvasEl.style.transformOrigin = "center center";
      if (this.canvasEl.dataset) {
        this.canvasEl.dataset.zoom = String(this.zoomLevel);
      }
    }
    if (this.rulerCornerEl?.style) {
      this.rulerCornerEl.style.display = this.rulerVisible ? "block" : "none";
    }
    if (this.rulerHEl?.style) {
      this.rulerHEl.style.display = this.rulerVisible ? "block" : "none";
      if (this.rulerVisible) this._renderRulerH();
    }
    if (this.rulerVEl?.style) {
      this.rulerVEl.style.display = this.rulerVisible ? "block" : "none";
      if (this.rulerVisible) this._renderRulerV();
    }
    if (this.gridlinesLayer?.style) {
      this.gridlinesLayer.style.display = this.gridlinesVisible ? "block" : "none";
    }
    if (this.guidesLayer?.style) {
      this.guidesLayer.style.display = this.guidesVisible ? "block" : "none";
      if (this.guidesVisible) this._renderGuidesLayer();
    }
    if (this.container?.classList?.toggle) {
      this.container.classList.toggle("vno-slides-ruler-visible", !!this.rulerVisible);
      this.container.classList.toggle("vno-slides-gridlines-visible", !!this.gridlinesVisible);
      this.container.classList.toggle("vno-slides-guides-visible", !!this.guidesVisible);
    }
  }

  _renderRulerH() {
    if (!this.rulerHEl || typeof document === "undefined") return;
    const w = this.slideSize?.width || 960;
    let ticks = "";
    for (let x = 0; x <= w; x += 10) {
      if (x % 100 === 0) {
        ticks += `<line x1="${x}" y1="8" x2="${x}" y2="20" stroke="#94a3b8" stroke-width="1"/>`;
        ticks += `<text x="${x + 2}" y="7" font-size="8" fill="#475569" font-family="monospace">${x}</text>`;
      } else if (x % 50 === 0) {
        ticks += `<line x1="${x}" y1="12" x2="${x}" y2="20" stroke="#cbd5e1" stroke-width="1"/>`;
      } else {
        ticks += `<line x1="${x}" y1="16" x2="${x}" y2="20" stroke="#e2e8f0" stroke-width="1"/>`;
      }
    }
    this.rulerHEl.innerHTML = `
      <svg width="${w}" height="20" viewBox="0 0 ${w} 20" style="display:block;">
        <rect width="${w}" height="20" fill="#f8fafc"/>
        ${ticks}
      </svg>
    `;
  }

  _renderRulerV() {
    if (!this.rulerVEl || typeof document === "undefined") return;
    const h = this.slideSize?.height || 540;
    let ticks = "";
    for (let y = 0; y <= h; y += 10) {
      if (y % 100 === 0) {
        ticks += `<line x1="8" y1="${y}" x2="20" y2="${y}" stroke="#94a3b8" stroke-width="1"/>`;
        ticks += `<text x="2" y="${y + 8}" font-size="8" fill="#475569" font-family="monospace">${y}</text>`;
      } else if (y % 50 === 0) {
        ticks += `<line x1="12" y1="${y}" x2="20" y2="${y}" stroke="#cbd5e1" stroke-width="1"/>`;
      } else {
        ticks += `<line x1="16" y1="${y}" x2="20" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
      }
    }
    this.rulerVEl.innerHTML = `
      <svg width="20" height="${h}" viewBox="0 0 20 ${h}" style="display:block;">
        <rect width="20" height="${h}" fill="#f8fafc"/>
        ${ticks}
      </svg>
    `;
  }

  toggleRuler() {
    this.rulerVisible = !this.rulerVisible;
    this._applyViewState();
    this._syncCommandStates();
    return this.rulerVisible;
  }

  toggleGridlines() {
    this.gridlinesVisible = !this.gridlinesVisible;
    this._applyViewState();
    this._syncCommandStates();
    return this.gridlinesVisible;
  }

  _renderGuidesLayer() {
    if (!this.guidesLayer || typeof document === "undefined") return;
    this.guidesLayer.innerHTML = `
      <div class="vno-slide-guide vno-slide-guide-v" style="left: ${this.guideCoords.x}px;">
        <div class="vno-slide-guide-handle" title="Kéo để chỉnh đường gióng dọc"></div>
        <div class="vno-slide-guide-tooltip">X: ${this.guideCoords.x}px</div>
      </div>
      <div class="vno-slide-guide vno-slide-guide-h" style="top: ${this.guideCoords.y}px;">
        <div class="vno-slide-guide-handle" title="Kéo để chỉnh đường gióng ngang"></div>
        <div class="vno-slide-guide-tooltip">Y: ${this.guideCoords.y}px</div>
      </div>
    `;
    this._setupGuidesDrag();
  }

  _setupGuidesDrag() {
    if (!this.guidesLayer || typeof document === "undefined") return;
    const vGuide = this.guidesLayer.querySelector(".vno-slide-guide-v");
    const hGuide = this.guidesLayer.querySelector(".vno-slide-guide-h");
    const vTooltip = vGuide?.querySelector(".vno-slide-guide-tooltip");
    const hTooltip = hGuide?.querySelector(".vno-slide-guide-tooltip");

    if (vGuide) {
      const onMousedownV = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (vTooltip) vTooltip.style.display = "block";
        const onMousemoveV = (moveEvt) => {
          if (!this.canvasEl) return;
          const rect = this.canvasEl.getBoundingClientRect?.() || { left: 0, width: 960 };
          const scale = this.zoomLevel || 1.0;
          let newX = Math.round((moveEvt.clientX - (rect.left || 0)) / scale);
          const maxW = this.slideSize?.width || 960;
          newX = Math.max(0, Math.min(newX, maxW));
          this.guideCoords.x = newX;
          vGuide.style.left = `${newX}px`;
          if (vTooltip) vTooltip.textContent = `X: ${newX}px`;
        };
        const onMouseupV = () => {
          if (vTooltip) vTooltip.style.display = "none";
          window.removeEventListener("mousemove", onMousemoveV);
          window.removeEventListener("mouseup", onMouseupV);
        };
        window.addEventListener("mousemove", onMousemoveV);
        window.addEventListener("mouseup", onMouseupV);
      };
      vGuide.addEventListener("mousedown", onMousedownV);
    }

    if (hGuide) {
      const onMousedownH = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hTooltip) hTooltip.style.display = "block";
        const onMousemoveH = (moveEvt) => {
          if (!this.canvasEl) return;
          const rect = this.canvasEl.getBoundingClientRect?.() || { top: 0, height: 540 };
          const scale = this.zoomLevel || 1.0;
          let newY = Math.round((moveEvt.clientY - (rect.top || 0)) / scale);
          const maxH = this.slideSize?.height || 540;
          newY = Math.max(0, Math.min(newY, maxH));
          this.guideCoords.y = newY;
          hGuide.style.top = `${newY}px`;
          if (hTooltip) hTooltip.textContent = `Y: ${newY}px`;
        };
        const onMouseupH = () => {
          if (hTooltip) hTooltip.style.display = "none";
          window.removeEventListener("mousemove", onMousemoveH);
          window.removeEventListener("mouseup", onMouseupH);
        };
        window.addEventListener("mousemove", onMousemoveH);
        window.addEventListener("mouseup", onMouseupH);
      };
      hGuide.addEventListener("mousedown", onMousedownH);
    }
  }

  toggleGuides() {
    this.guidesVisible = !this.guidesVisible;
    this._applyViewState();
    this._syncCommandStates();
    return this.guidesVisible;
  }

  setNormalView() {
    if (this.slideSorterOverlay) {
      this.closeSlideSorter();
    }
    if (this.isReadingView) {
      this.exitReadingView();
    }
    this.presentationView = "normal";
    this._applyViewState();
    this._syncCommandStates();
    return "normal";
  }

  enterReadingView() {
    if (this.isReadingView || typeof document === "undefined" || typeof document.createElement !== "function") return false;
    if (this.slideSorterOverlay) {
      this.closeSlideSorter();
    }
    this.isReadingView = true;
    this.presentationView = "reading";

    const overlay = document.createElement("div");
    overlay.className = "vno-slides-reading-mode";
    overlay.setAttribute?.("role", "dialog");
    overlay.setAttribute?.("aria-modal", "true");
    overlay.setAttribute?.("aria-label", t("slidesDialogs.readingViewTitle", "Dạng xem Đọc (Reading View)"));

    overlay.innerHTML = `
      <div class="vno-slides-reading-stage">
        <div class="vno-slides-reading-slide-container" id="vno-reading-slide-host"></div>
      </div>
      <div class="vno-slides-reading-bar" role="toolbar" aria-label="${t("slidesDialogs.readingToolbar", "Thanh điều hướng Đọc")}">
        <button type="button" class="vno-slides-reading-btn" id="vno-reading-prev" aria-label="${t("slidesDialogs.prevSlideShort", "Trang trước")}" title="${t("slidesDialogs.prevSlideReadingTitle", "Trang trước (Mũi tên trái)")}">‹</button>
        <span class="vno-slides-reading-counter" id="vno-reading-counter">${t("slidesDialogs.slideCounter", { current: this.currentSlideIndex + 1, total: this.slides.length })}</span>
        <button type="button" class="vno-slides-reading-btn" id="vno-reading-next" aria-label="${t("slidesDialogs.nextSlideShort", "Trang tiếp")}" title="${t("slidesDialogs.nextSlideReadingTitle", "Trang tiếp (Mũi tên phải)")}">›</button>
        <div style="flex:1;"></div>
        <button type="button" class="vno-slides-reading-close-btn" id="vno-reading-close" aria-label="${t("slidesDialogs.readingClose", "Thoát chế độ đọc")}" title="${t("slidesDialogs.exitReadingTitle", "Thoát chế độ đọc (Esc)")}">✕ ${t("slidesDialogs.close", "Thoát")}</button>
      </div>
    `;

    document.body?.appendChild?.(overlay);
    this.readingOverlay = overlay;

    this._renderReadingSlide();

    overlay.querySelector("#vno-reading-prev")?.addEventListener("click", () => {
      if (this.currentSlideIndex > 0) {
        this.selectSlide(this.currentSlideIndex - 1);
        this._renderReadingSlide();
      }
    });
    overlay.querySelector("#vno-reading-next")?.addEventListener("click", () => {
      if (this.currentSlideIndex < this.slides.length - 1) {
        this.selectSlide(this.currentSlideIndex + 1);
        this._renderReadingSlide();
      }
    });
    overlay.querySelector("#vno-reading-close")?.addEventListener("click", () => {
      this.exitReadingView();
    });

    this._readingKeyHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.exitReadingView();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (this.currentSlideIndex > 0) {
          this.selectSlide(this.currentSlideIndex - 1);
          this._renderReadingSlide();
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        if (this.currentSlideIndex < this.slides.length - 1) {
          this.selectSlide(this.currentSlideIndex + 1);
          this._renderReadingSlide();
        }
      }
    };
    document.addEventListener("keydown", this._readingKeyHandler);

    this._applyViewState();
    this._syncCommandStates();
    return true;
  }

  exitReadingView() {
    if (!this.isReadingView) return false;
    this.isReadingView = false;
    this.presentationView = "normal";
    if (this._readingKeyHandler && typeof document !== "undefined") {
      document.removeEventListener("keydown", this._readingKeyHandler);
      this._readingKeyHandler = null;
    }
    if (this.readingOverlay) {
      this.readingOverlay.remove?.();
      this.readingOverlay = null;
    }
    this._applyViewState();
    this._syncCommandStates();
    return true;
  }

  toggleReadingView() {
    return this.isReadingView ? this.exitReadingView() : this.enterReadingView();
  }

  _renderReadingSlide() {
    if (!this.readingOverlay || typeof document === "undefined") return;
    const host = this.readingOverlay.querySelector("#vno-reading-slide-host");
    const counter = this.readingOverlay.querySelector("#vno-reading-counter");
    if (counter) {
      counter.textContent = t("slidesDialogs.slideCounter", { current: this.currentSlideIndex + 1, total: this.slides.length });
    }
    if (!host) return;
    const slide = this.slides[this.currentSlideIndex];
    if (!slide) return;

    const slideW = this.slideSize?.width || 960;
    const slideH = this.slideSize?.height || 540;
    const theme = this.masterTheme || {};
    host.innerHTML = `
      <div class="vno-slides-reading-card" style="
        width: ${slideW}px;
        height: ${slideH}px;
        background-color: ${theme.bgColor || "#ffffff"};
        color: ${theme.bodyColor || "#334155"};
        font-family: ${theme.fontFamily || "sans-serif"};
      ">
        <h2 style="color:${theme.titleColor || "#1e3a8a"};margin-bottom:20px;font-size:26px;">${this._escapeHtml(slide.title)}</h2>
        <div style="font-size:16px;white-space:pre-wrap;line-height:1.6;">${this._escapeHtml(slide.body)}</div>
      </div>
    `;
  }

  setZoom(level) {
    const next = Math.min(2.5, Math.max(0.2, Math.round(Number(level) * 10) / 10));
    if (!Number.isFinite(next)) return false;
    this.zoomLevel = next;
    this._applyViewState();
    this._syncCommandStates();
    return this.zoomLevel;
  }

  zoomIn() { return this.setZoom(this.zoomLevel + 0.1); }
  zoomOut() { return this.setZoom(this.zoomLevel - 0.1); }
  zoomReset() { return this.setZoom(1.0); }

  fitToWindow() {
    if (!this.stageEl || !this.canvasEl) return this.setZoom(1.0);
    const stageW = (this.stageEl.clientWidth || 960) - 64;
    const stageH = (this.stageEl.clientHeight || 600) - (this.isNotesVisible ? 200 : 80);
    const canvasW = this.slideSize?.width || 960;
    const canvasH = this.slideSize?.height || 540;
    if (stageW <= 0 || stageH <= 0) return this.setZoom(1.0);
    const scale = Math.min(2.0, Math.max(0.3, Math.floor(Math.min(stageW / canvasW, stageH / canvasH) * 10) / 10));
    return this.setZoom(scale);
  }

  newWindow() {
    if (typeof window === "undefined") return false;
    const opened = window.open?.(window.location.href, "_blank");
    if (!opened) {
      this.options?.shell?.setStatus?.("Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho VN Office.");
      return false;
    }
    try { opened.opener = null; } catch (_) {}
    return true;
  }

  destroy() {
    if (this.isReadingView) {
      this.exitReadingView();
    }
    if (this.slideSorterOverlay) {
      this.closeSlideSorter();
    }
    this._activeShowCleanup?.();
    this._activePresenterCleanup?.();
    this._activeShowCleanup = null;
    this._activePresenterCleanup = null;
    if (typeof window !== "undefined" && this._windowKeyHandler) {
      window.removeEventListener("keydown", this._windowKeyHandler);
      this._windowKeyHandler = null;
    }
    this.spellcheckController?.destroy();
    this.spellcheckController = null;
    this.spellcheckChecker = null;
    if (typeof document !== "undefined" && this._onSpellcheckMenuClick) {
      document.removeEventListener("click", this._onSpellcheckMenuClick);
      this._onSpellcheckMenuClick = null;
    }
  }
}
