import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { WriterNavigationPane } from "./writer-nav-pane.js";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

export class WriterViewController {
  constructor({ container, viewport, page, ruler, verticalRuler = null, shell }) {
    this.container = container;
    this.viewport = viewport;
    this.page = page;
    this.ruler = ruler;
    this.verticalRuler = verticalRuler;
    this.shell = shell;
    this.mode = "printLayout";
    this.zoomLevel = 1;
    this.rulerVisible = true;
    this.gridlinesVisible = false;
    this._escapeHandler = event => {
      if (event.key === "Escape" && this.mode === "readMode") this.setMode("printLayout");
    };
    this._resizeHandler = () => {
      if (this.container?.classList.contains("vno-writer-page-width")) this.pageWidth();
      this._syncVerticalRuler();
    };
    this._scrollHandler = () => {
      this._syncVerticalRuler();
    };
    this._wheelHandler = event => {
      if (!event.ctrlKey || !event.deltaY) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      if (this.shell?.setZoom) {
        const delta = event.deltaY < 0 ? 10 : -10;
        this.shell.setZoom(this.shell.zoomLevel + delta);
      } else {
        if (event.deltaY < 0) this.zoomIn();
        else this.zoomOut();
      }
    };
    this._zoomUnsubscribe = null;
    this.navigationPane = null;
  }

  attach() {
    const bind = (id, handler) => globalCommandBus.bindHandler(id, handler);
    bind("writer.view.printLayout", () => this.setMode("printLayout"));
    bind("writer.view.webLayout", () => this.setMode("webLayout"));
    bind("writer.view.readMode", () => this.setMode("readMode"));
    bind("writer.view.ruler", () => this.toggleRuler());
    bind("writer.view.gridlines", () => this.toggleGridlines());
    bind("writer.view.zoomIn", () => this.zoomIn());
    bind("writer.view.zoomOut", () => this.zoomOut());
    bind("writer.view.zoomReset", () => this.zoomReset());
    bind("writer.view.zoom100", () => this.zoomReset());
    bind("writer.view.pageWidth", () => this.pageWidth());
    bind("writer.view.newWindow", () => this.newWindow());
    if (typeof document !== "undefined") document.addEventListener?.("keydown", this._escapeHandler);
    if (typeof window !== "undefined") window.addEventListener?.("resize", this._resizeHandler);
    this.viewport?.addEventListener?.("scroll", this._scrollHandler, { passive: true });
    this.viewport?.addEventListener?.("wheel", this._wheelHandler, { passive: false });
    this._zoomUnsubscribe = this.shell?.subscribeZoom?.((level) => {
      this.zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(level) / 100));
      this._applyViewState();
    }) || null;
    this.navigationPane = new WriterNavigationPane({
      workspace: this.viewport?.parentElement,
      viewport: this.viewport,
      page: this.page,
      body: this.page?.querySelector?.(".vno-writer-body"),
      commandBus: globalCommandBus
    }).attach();
    this._applyViewState();
    this._syncCommandStates();
    return this;
  }

  destroy() {
    this.navigationPane?.destroy();
    this.navigationPane = null;
    if (typeof document !== "undefined") document.removeEventListener?.("keydown", this._escapeHandler);
    if (typeof window !== "undefined") window.removeEventListener?.("resize", this._resizeHandler);
    this.viewport?.removeEventListener?.("scroll", this._scrollHandler);
    this.viewport?.removeEventListener?.("wheel", this._wheelHandler);
    this._zoomUnsubscribe?.();
    this._zoomUnsubscribe = null;
  }

  setMode(mode) {
    if (!["printLayout", "webLayout", "readMode"].includes(mode)) return false;
    this.mode = mode;
    this.container?.classList.toggle("vno-writer-web-layout", mode === "webLayout");
    this.shell?.rootEl?.classList.toggle("vno-writer-read-mode", mode === "readMode");
    this.container?.classList.toggle("vno-writer-read-layout", mode === "readMode");
    if (mode === "readMode") this._ensureReadToolbar();
    else this.container?.querySelector?.(".vno-writer-read-toolbar")?.remove?.();
    if (mode === "webLayout") this.zoomReset();
    else this._applyViewState();
    this._syncCommandStates();
    return mode;
  }

  _ensureReadToolbar() {
    if (typeof document === "undefined" || this.container?.querySelector?.(".vno-writer-read-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "vno-writer-read-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Điều hướng chế độ đọc");
    toolbar.innerHTML = '<span>Chế độ đọc</span><button type="button" title="Thoát chế độ đọc (Esc)" aria-label="Thoát chế độ đọc">Thoát <kbd>Esc</kbd></button>';
    toolbar.querySelector("button")?.addEventListener("click", () => this.setMode("printLayout"));
    this.container.prepend(toolbar);
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

  setZoom(level, { pageWidth = false } = {}) {
    const numeric = Number(level);
    if (!Number.isFinite(numeric)) return false;
    this.zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(numeric * 100) / 100));
    this.container?.classList.toggle("vno-writer-page-width", pageWidth);
    this._applyViewState();
    const rounded = Math.round(this.zoomLevel * 100);
    this.shell?.setZoomLevel?.(rounded);
    this.shell?.setZoomDisplay?.(rounded);
    return this.zoomLevel;
  }

  zoomIn() { return this.setZoom(this.zoomLevel + 0.1); }
  zoomOut() { return this.setZoom(this.zoomLevel - 0.1); }
  zoomReset() { return this.setZoom(1); }

  pageWidth() {
    const available = Math.max(1, (this.viewport?.clientWidth || 0) - 40);
    const pageWidth = this.page?.offsetWidth || parseFloat(getComputedStyle(this.page).width) || 794;
    return this.setZoom(available / pageWidth, { pageWidth: true });
  }

  async newWindow() {
    // AppShell routes desktop builds through pywebview/Python and keeps the
    // browser fallback in UnoBridge. Calling window.open here bypassed that
    // boundary, so WebView2 treated the click as a blocked browser popup.
    if (this.shell?.requestNewDocumentWindow) {
      return await this.shell.requestNewDocumentWindow();
    }
    if (typeof window === "undefined") return false;
    const opened = window.open?.(window.location.href, "_blank");
    if (!opened) {
      this.shell?.setStatus?.("Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho 3T Office.");
      return false;
    }
    try { opened.opener = null; } catch (_) { /* Cross-origin window: noopener assignment is optional. */ }
    return true;
  }

  _applyViewState() {
    if (this.page?.style) {
      this.page.style.transform = "scale(" + this.zoomLevel + ")";
      this.page.style.transformOrigin = "top center";
      this.page.dataset.zoom = String(this.zoomLevel);
    }
    if (this.viewport?.style && this.page) {
      const height = this.page.scrollHeight || this.page.offsetHeight || 1123;
      this.viewport.style.setProperty("--vno-writer-scaled-height", Math.ceil(height * this.zoomLevel) + "px");
    }
    if (this.ruler) this.ruler.hidden = !this.rulerVisible || this.mode === "readMode";
    if (this.verticalRuler) this.verticalRuler.hidden = !this.rulerVisible || this.mode === "readMode";
    this.container?.classList.toggle("vno-writer-gridlines", this.gridlinesVisible);
    this._syncVerticalRuler();
  }

  _syncVerticalRuler() {
    if (!this.verticalRuler || !this.page || !this.viewport) return;
    const track = this.verticalRuler.querySelector?.(".vno-ruler-vertical-track") || this.verticalRuler.firstElementChild;
    if (!track) return;
    try {
      const pageRect = this.page.getBoundingClientRect?.();
      const viewportRect = this.viewport.getBoundingClientRect?.();
      if (pageRect && viewportRect) {
        const relativeTop = pageRect.top - viewportRect.top;
        const baseHeight = this.page.scrollHeight || this.page.offsetHeight || 1123;
        const scaledHeight = Math.ceil(baseHeight * this.zoomLevel);
        track.style.height = `${scaledHeight}px`;
        track.style.transform = `translateY(${relativeTop}px)`;
      }
    } catch (_) {
      // Fallback in mock environments
    }
  }

  _syncCommandStates() {
    for (const mode of ["printLayout", "webLayout", "readMode"]) {
      globalCommandBus.updateState("writer.view." + mode, { checked: this.mode === mode });
    }
    globalCommandBus.updateState("writer.view.ruler", { checked: this.rulerVisible });
    globalCommandBus.updateState("writer.view.gridlines", { checked: this.gridlinesVisible });
  }
}
