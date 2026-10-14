import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { WriterNavigationPane } from "./writer-nav-pane.js";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

export class WriterViewController {
  constructor({ container, viewport, page, ruler, verticalRuler = null, shell }) {
    this.container = container;
    this.viewport = viewport;
    this.page = page;
    this.body = this.page?.querySelector?.(".vno-writer-body") || null;
    this.ruler = ruler;
    this.verticalRuler = verticalRuler;
    this.shell = shell;
    this.adapter = null;
    this.mode = "printLayout";
    this.zoomLevel = 1;
    this.rulerVisible = true;
    this.gridlinesVisible = false;
    this._outlineLevelFilter = "all";
    this._headingObserver = null;
    this._headingClickHandler = null;
    this._escapeHandler = event => {
      if (event.key === "Escape" && (this.mode === "readMode" || this.mode === "outline")) {
        this.setMode("printLayout");
      }
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
    globalCommandBus.bindHandler("writer.view.printLayout", () => this.setMode("printLayout"));
    globalCommandBus.bindHandler("writer.view.webLayout", () => this.setMode("webLayout"));
    globalCommandBus.bindHandler("writer.view.readMode", () => this.setMode("readMode"));
    globalCommandBus.bindHandler("writer.view.outline", () => this.setMode("outline"));
    globalCommandBus.bindHandler("writer.view.draft", () => this.setMode("draft"));
    globalCommandBus.bindHandler("writer.outline.promote", () => this.promoteHeading());
    globalCommandBus.bindHandler("writer.outline.demote", () => this.demoteHeading());
    globalCommandBus.bindHandler("writer.outline.moveUp", () => this.moveUpHeading());
    globalCommandBus.bindHandler("writer.outline.moveDown", () => this.moveDownHeading());
    globalCommandBus.bindHandler("writer.outline.expand", () => this.expandHeading());
    globalCommandBus.bindHandler("writer.outline.collapse", () => this.collapseHeading());
    globalCommandBus.bindHandler("writer.outline.showLevel", (level) => this.showLevel(level));
    globalCommandBus.bindHandler("writer.outline.close", () => this.setMode("printLayout"));
    globalCommandBus.bindHandler("writer.view.toggleHeadingCollapse", () => this.toggleHeadingCollapse());
    globalCommandBus.bindHandler("writer.view.ruler", () => this.toggleRuler());
    globalCommandBus.bindHandler("writer.view.gridlines", () => this.toggleGridlines());
    globalCommandBus.bindHandler("writer.view.navigationPane", () => this.navigationPane?.toggle());
    globalCommandBus.bindHandler("writer.view.zoomIn", () => this.zoomIn());
    globalCommandBus.bindHandler("writer.view.zoomOut", () => this.zoomOut());
    globalCommandBus.bindHandler("writer.view.zoomReset", () => this.zoomReset());
    globalCommandBus.bindHandler("writer.view.zoom100", () => this.zoomReset());
    globalCommandBus.bindHandler("writer.view.pageWidth", () => this.pageWidth());
    globalCommandBus.bindHandler("writer.view.newWindow", () => {
      const run = () => this.newWindow();
      const result = run();
      const show = (value) => {
        if (value === false) {
          const msg = "Không mở được cửa sổ mới trong ứng dụng desktop. Hãy mở lại tệp từ Tệp > Mở để xem ở cửa sổ khác.";
          this.shell?.setStatus?.(msg);
          if (this.shell?.showNotification) this.shell.showNotification({ type: "info", message: msg });
        }
        return value;
      };
      return typeof result?.then === "function" ? result.then(show) : show(result);
    });
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
    this._setupHeadingCollapse();
    this._applyViewState();
    this._syncCommandStates();
    return this;
  }

  destroy() {
    this.navigationPane?.destroy();
    this.navigationPane = null;
    this._headingObserver?.disconnect?.();
    this.page?.removeEventListener?.("click", this._headingClickHandler);
    this.container?.querySelector?.(".vno-writer-outline-toolbar")?.remove?.();
    this.container?.querySelector?.(".vno-writer-read-toolbar")?.remove?.();
    if (typeof document !== "undefined") document.removeEventListener?.("keydown", this._escapeHandler);
    if (typeof window !== "undefined") window.removeEventListener?.("resize", this._resizeHandler);
    this.viewport?.removeEventListener?.("scroll", this._scrollHandler);
    this.viewport?.removeEventListener?.("wheel", this._wheelHandler);
    this._zoomUnsubscribe?.();
    this._zoomUnsubscribe = null;
  }

  setMode(mode) {
    if (!["printLayout", "webLayout", "readMode", "outline", "draft"].includes(mode)) return false;
    this.mode = mode;
    if (this.adapter) this.adapter._lastViewMode = mode;
    this.container?.classList.toggle("vno-writer-web-layout", mode === "webLayout");
    this.shell?.rootEl?.classList.toggle("vno-writer-read-mode", mode === "readMode");
    this.container?.classList.toggle("vno-writer-read-layout", mode === "readMode");
    this.container?.classList.toggle("vno-writer-outline-layout", mode === "outline");
    this.container?.classList.toggle("vno-writer-draft-layout", mode === "draft");

    if (mode === "readMode") this._ensureReadToolbar();
    else this.container?.querySelector?.(".vno-writer-read-toolbar")?.remove?.();

    if (mode === "outline") this._ensureOutlineToolbar();
    else {
      this.container?.querySelector?.(".vno-writer-outline-toolbar")?.remove?.();
      if (this._outlineLevelFilter !== "all") this.showLevel("all");
    }

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

  _ensureOutlineToolbar() {
    if (typeof document === "undefined" || this.container?.querySelector?.(".vno-writer-outline-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "vno-writer-outline-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Thanh công cụ Dàn bài");
    toolbar.innerHTML = [
      '<span style="font-weight:600;margin-right:4px;">Dàn bài:</span>',
      '<button type="button" class="vno-outline-btn-promote" title="Nâng cấp tiêu đề (Alt+Shift+Trái)">⬆ Nâng cấp</button>',
      '<button type="button" class="vno-outline-btn-demote" title="Hạ cấp tiêu đề (Alt+Shift+Phải)">⬇ Hạ cấp</button>',
      '<button type="button" class="vno-outline-btn-moveup" title="Di chuyển lên (Alt+Shift+Lên)">▲ Lên</button>',
      '<button type="button" class="vno-outline-btn-movedown" title="Di chuyển xuống (Alt+Shift+Xuống)">▼ Xuống</button>',
      '<button type="button" class="vno-outline-btn-expand" title="Mở rộng (+)">➕ Mở rộng</button>',
      '<button type="button" class="vno-outline-btn-collapse" title="Thu gọn (-)">➖ Thu gọn</button>',
      '<label style="margin-left:8px;display:inline-flex;align-items:center;gap:4px;">',
      '<span>Hiển thị:</span>',
      '<select class="vno-outline-level-select">',
      '<option value="all">Tất cả các cấp</option>',
      '<option value="1">Cấp 1</option>',
      '<option value="2">Cấp 2</option>',
      '<option value="3">Cấp 3</option>',
      '<option value="4">Cấp 4</option>',
      '<option value="5">Cấp 5</option>',
      '<option value="6">Cấp 6</option>',
      '</select>',
      '</label>',
      '<button type="button" class="vno-outline-btn-close" style="margin-left:auto;background:var(--vno-btn-primary-bg,#0f4c81);color:#fff;border-color:transparent;" title="Đóng chế độ Dàn bài">✖ Đóng Dàn bài</button>'
    ].join("");
    toolbar.querySelector(".vno-outline-btn-promote")?.addEventListener("click", () => this.promoteHeading());
    toolbar.querySelector(".vno-outline-btn-demote")?.addEventListener("click", () => this.demoteHeading());
    toolbar.querySelector(".vno-outline-btn-moveup")?.addEventListener("click", () => this.moveUpHeading());
    toolbar.querySelector(".vno-outline-btn-movedown")?.addEventListener("click", () => this.moveDownHeading());
    toolbar.querySelector(".vno-outline-btn-expand")?.addEventListener("click", () => this.expandHeading());
    toolbar.querySelector(".vno-outline-btn-collapse")?.addEventListener("click", () => this.collapseHeading());
    toolbar.querySelector(".vno-outline-level-select")?.addEventListener("change", (e) => this.showLevel(e.target.value));
    toolbar.querySelector(".vno-outline-btn-close")?.addEventListener("click", () => this.setMode("printLayout"));
    this.container.prepend(toolbar);
  }

  _getBody() {
    return this.body || this.page?.querySelector?.(".vno-writer-body") || this.page || null;
  }

  _getHeadingLevel(el) {
    if (!el || (el.nodeType && el.nodeType !== 1)) return 0;
    const outline = Number(el.dataset?.vnoOutline ?? el.getAttribute?.("data-vno-outline"));
    if (Number.isFinite(outline) && outline >= 1 && outline <= 9) return Math.round(outline);
    const match = String(el.tagName || "").match(/^H([1-6])$/i);
    return match ? Number(match[1]) : 0;
  }

  _getCurrentHeadingOrBlock() {
    const body = this._getBody();
    if (!body) return null;
    let node = null;
    if (typeof window !== "undefined" && window.getSelection) {
      try {
        const sel = window.getSelection();
        if (sel && sel.anchorNode) node = sel.anchorNode;
      } catch (_) {}
    }
    while (node && node !== body) {
      if (node.parentNode === body) return node;
      node = node.parentNode;
    }
    return body.querySelector("h1, h2, h3, h4, h5, h6, [data-vno-outline]") || body.firstElementChild || null;
  }

  _getSectionNodes(headingEl) {
    const body = this._getBody();
    if (!body || !headingEl) return [];
    const level = this._getHeadingLevel(headingEl);
    if (!level) return [headingEl];
    const nodes = [headingEl];
    let next = headingEl.nextElementSibling;
    while (next) {
      const nextLevel = this._getHeadingLevel(next);
      if (nextLevel > 0 && nextLevel <= level) break;
      nodes.push(next);
      next = next.nextElementSibling;
    }
    return nodes;
  }

  _replaceTag(el, newTagName) {
    if (!el || !el.parentNode || el.tagName.toLowerCase() === newTagName.toLowerCase()) return el;
    const doc = el.ownerDocument || document;
    const newEl = doc.createElement(newTagName);
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      newEl.setAttribute(attr.name, attr.value);
    }
    while (el.firstChild) {
      newEl.appendChild(el.firstChild);
    }
    el.parentNode.replaceChild(newEl, el);
    return newEl;
  }

  promoteHeading(target = null) {
    const el = target || this._getCurrentHeadingOrBlock();
    if (!el) {
      this.shell?.setStatus?.("Không tìm thấy đoạn văn hoặc tiêu đề để nâng cấp.");
      return false;
    }
    const currentLevel = this._getHeadingLevel(el);
    if (currentLevel === 1) {
      this.shell?.setStatus?.("Tiêu đề đã ở cấp cao nhất (Cấp 1).");
      return false;
    }
    let newEl = el;
    let newLevel = 1;
    if (currentLevel > 1) {
      newLevel = currentLevel - 1;
      newEl = this._replaceTag(el, `h${newLevel}`);
      if (newEl.hasAttribute("data-vno-outline")) newEl.setAttribute("data-vno-outline", String(newLevel));
    } else {
      newLevel = 1;
      newEl = this._replaceTag(el, "h1");
      newEl.setAttribute("data-vno-outline", "1");
    }
    this._ensureHeadingCollapseButtons();
    this.adapter?.recordSnapshot?.("Nâng cấp tiêu đề");
    if (this.adapter) this.adapter.isDirty = true;
    this.shell?.setStatus?.(`Đã nâng lên Cấp ${newLevel}.`);
    return true;
  }

  demoteHeading(target = null) {
    const el = target || this._getCurrentHeadingOrBlock();
    if (!el) {
      this.shell?.setStatus?.("Không tìm thấy đoạn văn hoặc tiêu đề để hạ cấp.");
      return false;
    }
    const currentLevel = this._getHeadingLevel(el);
    if (currentLevel === 0) {
      this.shell?.setStatus?.("Đoạn văn đã ở mức văn bản nội dung.");
      return false;
    }
    let newEl = el;
    if (currentLevel >= 6) {
      newEl = this._replaceTag(el, "p");
      newEl.removeAttribute("data-vno-outline");
      this.shell?.setStatus?.("Đã hạ xuống văn bản nội dung.");
    } else {
      const newLevel = currentLevel + 1;
      newEl = this._replaceTag(el, `h${newLevel}`);
      if (newEl.hasAttribute("data-vno-outline")) newEl.setAttribute("data-vno-outline", String(newLevel));
      this.shell?.setStatus?.(`Đã hạ xuống Cấp ${newLevel}.`);
    }
    this._ensureHeadingCollapseButtons();
    this.adapter?.recordSnapshot?.("Hạ cấp tiêu đề");
    if (this.adapter) this.adapter.isDirty = true;
    return true;
  }

  moveUpHeading(target = null) {
    const body = this._getBody();
    const heading = target || this._getCurrentHeadingOrBlock();
    if (!body || !heading) {
      this.shell?.setStatus?.("Không tìm thấy phần tiêu đề để di chuyển.");
      return false;
    }
    const nodes = this._getSectionNodes(heading);
    const prev = heading.previousElementSibling;
    if (!prev) {
      this.shell?.setStatus?.("Đã ở vị trí đầu tiên trong tài liệu.");
      return false;
    }
    const currentLevel = this._getHeadingLevel(heading);
    let prevSectionStart = prev;
    let cur = prev;
    while (cur) {
      const curLevel = this._getHeadingLevel(cur);
      if (curLevel > 0 && curLevel <= currentLevel) {
        prevSectionStart = cur;
        break;
      }
      if (!cur.previousElementSibling) {
        prevSectionStart = cur;
        break;
      }
      cur = cur.previousElementSibling;
    }
    for (const node of nodes) {
      body.insertBefore(node, prevSectionStart);
    }
    heading.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    this.adapter?.recordSnapshot?.("Di chuyển tiêu đề lên");
    if (this.adapter) this.adapter.isDirty = true;
    this.shell?.setStatus?.("Đã di chuyển tiêu đề lên trên.");
    return true;
  }

  moveDownHeading(target = null) {
    const body = this._getBody();
    const heading = target || this._getCurrentHeadingOrBlock();
    if (!body || !heading) {
      this.shell?.setStatus?.("Không tìm thấy phần tiêu đề để di chuyển.");
      return false;
    }
    const nodes = this._getSectionNodes(heading);
    const lastNode = nodes[nodes.length - 1];
    const nextSectionStart = lastNode?.nextElementSibling;
    if (!nextSectionStart) {
      this.shell?.setStatus?.("Đã ở vị trí cuối cùng trong tài liệu.");
      return false;
    }
    const nextNodes = this._getSectionNodes(nextSectionStart);
    const targetAfter = nextNodes[nextNodes.length - 1];
    const ref = targetAfter ? targetAfter.nextElementSibling : null;
    for (const node of nodes) {
      if (ref) body.insertBefore(node, ref);
      else body.appendChild(node);
    }
    heading.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    this.adapter?.recordSnapshot?.("Di chuyển tiêu đề xuống");
    if (this.adapter) this.adapter.isDirty = true;
    this.shell?.setStatus?.("Đã di chuyển tiêu đề xuống dưới.");
    return true;
  }

  collapseHeading(target = null) {
    const heading = target || this._getCurrentHeadingOrBlock();
    if (!heading) {
      this.shell?.setStatus?.("Không tìm thấy tiêu đề để thu gọn.");
      return false;
    }
    const nodes = this._getSectionNodes(heading);
    for (let i = 1; i < nodes.length; i++) {
      nodes[i].classList.add("vno-heading-collapsed-body");
    }
    heading.classList.add("vno-heading-collapsed");
    heading.setAttribute("data-vno-collapsed", "true");
    this._syncHeadingCollapseUi(heading);
    this.shell?.setStatus?.("Đã thu gọn nội dung tiêu đề.");
    return true;
  }

  expandHeading(target = null) {
    const heading = target || this._getCurrentHeadingOrBlock();
    if (!heading) {
      this.shell?.setStatus?.("Không tìm thấy tiêu đề để mở rộng.");
      return false;
    }
    const nodes = this._getSectionNodes(heading);
    for (let i = 1; i < nodes.length; i++) {
      nodes[i].classList.remove("vno-heading-collapsed-body");
    }
    heading.classList.remove("vno-heading-collapsed");
    heading.removeAttribute("data-vno-collapsed");
    this._syncHeadingCollapseUi(heading);
    this.shell?.setStatus?.("Đã mở rộng nội dung tiêu đề.");
    return true;
  }

  toggleHeadingCollapse(target = null) {
    const heading = target || this._getCurrentHeadingOrBlock();
    if (!heading || !this._getHeadingLevel(heading)) {
      this.shell?.setStatus?.("Hãy đặt con trỏ vào tiêu đề để ẩn hoặc hiện nội dung.");
      return false;
    }
    if (heading.classList.contains("vno-heading-collapsed")) {
      return this.expandHeading(heading);
    }
    return this.collapseHeading(heading);
  }

  showLevel(level) {
    const body = this._getBody();
    if (!body) return false;
    this._outlineLevelFilter = level;
    const maxLevel = level === "all" ? 0 : Number(level);
    const elements = Array.from(body.children || []);
    if (!maxLevel || maxLevel <= 0) {
      elements.forEach(el => {
        el.classList.remove("vno-heading-collapsed-body");
        el.classList.remove("vno-heading-collapsed");
        el.removeAttribute("data-vno-collapsed");
        this._syncHeadingCollapseUi(el);
      });
      const select = this.container?.querySelector?.(".vno-outline-level-select");
      if (select) select.value = "all";
      this.shell?.setStatus?.("Đã hiển thị tất cả các cấp.");
      return true;
    }
    elements.forEach(el => {
      const lvl = this._getHeadingLevel(el);
      if (lvl > 0) {
        if (lvl <= maxLevel) {
          el.classList.remove("vno-heading-collapsed-body");
        } else {
          el.classList.add("vno-heading-collapsed-body");
        }
      } else {
        el.classList.add("vno-heading-collapsed-body");
      }
      this._syncHeadingCollapseUi(el);
    });
    const select = this.container?.querySelector?.(".vno-outline-level-select");
    if (select) select.value = String(maxLevel);
    this.shell?.setStatus?.(`Đã hiển thị đến Cấp ${maxLevel}.`);
    return true;
  }

  _setupHeadingCollapse() {
    this._headingClickHandler = (e) => {
      const btn = e.target.closest?.(".vno-heading-collapse-btn");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const heading = btn.closest("h1, h2, h3, h4, h5, h6, [data-vno-outline]");
        if (heading) this.toggleHeadingCollapse(heading);
        return;
      }
    };
    this.page?.addEventListener?.("click", this._headingClickHandler);
    this._ensureHeadingCollapseButtons();
    const body = this._getBody();
    if (body && typeof MutationObserver !== "undefined" && typeof body.querySelectorAll === "function" && typeof body.addEventListener === "function") {
      try {
        this._headingObserver = new MutationObserver(() => {
          this._ensureHeadingCollapseButtons();
        });
        this._headingObserver.observe(body, { childList: true, subtree: true });
      } catch (_) {}
    }
  }

  _ensureHeadingCollapseButtons() {
    const body = this._getBody();
    if (!body || typeof document === "undefined" || typeof body.querySelectorAll !== "function") return;
    const headings = body.querySelectorAll("h1, h2, h3, h4, h5, h6, [data-vno-outline]");
    headings.forEach((h) => {
      if (!h.querySelector?.(".vno-heading-collapse-btn")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vno-heading-collapse-btn";
        btn.setAttribute("contenteditable", "false");
        btn.setAttribute("tabindex", "-1");
        btn.setAttribute("aria-label", "Ẩn hoặc hiện nội dung dưới tiêu đề");
        const collapsed = h.classList?.contains?.("vno-heading-collapsed");
        btn.title = collapsed ? "Mở rộng nội dung" : "Thu gọn nội dung";
        btn.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M4.5 6l3.5 3.5L11.5 6z"/></svg>';
        h.prepend?.(btn);
      }
    });
  }

  _syncHeadingCollapseUi(heading) {
    const btn = heading.querySelector?.(".vno-heading-collapse-btn");
    if (btn) {
      const collapsed = heading.classList.contains("vno-heading-collapsed");
      btn.title = collapsed ? "Mở rộng nội dung" : "Thu gọn nội dung";
      btn.classList.toggle("vno-heading-collapsed-btn-rotated", collapsed);
    }
  }

  toggleRuler() {
    this.rulerVisible = !this.rulerVisible;
    this._applyViewState();
    this._syncCommandStates();
    this.shell?.setStatus?.(this.rulerVisible ? "Đã hiện thước đo." : "Đã ẩn thước đo.");
    return true;
  }

  toggleGridlines() {
    this.gridlinesVisible = !this.gridlinesVisible;
    this._applyViewState();
    this._syncCommandStates();
    this.shell?.setStatus?.(this.gridlinesVisible ? "Đã hiện đường lưới." : "Đã ẩn đường lưới.");
    return true;
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
    // AppShell echoes the new percentage through onZoomChange. That callback
    // updates the local zoom with pageWidth=false, so restore the fit marker
    // after the synchronous echo; the resize listener uses it to refit later.
    if (pageWidth) this.container?.classList.toggle("vno-writer-page-width", true);
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
    if (this.ruler) this.ruler.hidden = !this.rulerVisible || this.mode === "readMode" || this.mode === "outline";
    if (this.verticalRuler) this.verticalRuler.hidden = !this.rulerVisible || this.mode === "readMode" || this.mode === "draft" || this.mode === "outline";
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
    for (const mode of ["printLayout", "webLayout", "readMode", "outline", "draft"]) {
      globalCommandBus.updateState("writer.view." + mode, { checked: this.mode === mode });
    }
    globalCommandBus.updateState("writer.view.ruler", { checked: this.rulerVisible });
    globalCommandBus.updateState("writer.view.gridlines", { checked: this.gridlinesVisible });
  }
}
