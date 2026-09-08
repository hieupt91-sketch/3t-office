/**
 * VN Slides Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SLIDES_RIBBON_TABS } from "./slides-ribbon.js";
import { SlidesCanvasController } from "./slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { bootstrapPlatform } from "../../platform/bootstrap.js";
import { applyLocaleToTabs } from "../../platform/i18n/i18n.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { HelpPanel } from "../../platform/help/index.js";
import "../../platform/help/entries-slides.js";

export class SlidesApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.canvasController = null;
    this.adapter = null;
    this.helpPanel = null;
    this._lifecycleObserver = null;
  }

  async init(options = {}) {
    await bootstrapPlatform();
    globalShortcutManager.setActiveScope("slides");

    const isBlank = options.templateId === "blank";
    this.shell = new AppShell({
      appName: "slides",
      appTitle: "VN Slides",
      documentName: options.documentName || (isBlank ? "Bản trình chiếu 1.pptx" : "Báo cáo đề án phát triển VN Office 2026.pptx")
    });
    this.shell.mount(this.mountElement);
    this._watchLifecycle();
    this.shell.ribbonHost.setStructure(applyLocaleToTabs(SLIDES_RIBBON_TABS), "home");

    const workspace = document.createElement("div");
    workspace.className = "vno-slides-workspace";
    workspace.setAttribute("role", "application");
    workspace.setAttribute("aria-label", "Trình soạn thảo trang chiếu");

    const studioWrap = document.createElement("div");
    studioWrap.style.flex = "1 1 auto";
    studioWrap.style.minWidth = "0";
    studioWrap.style.minHeight = "0";
    studioWrap.style.height = "100%";
    workspace.appendChild(studioWrap);

    this.canvasController = new SlidesCanvasController(studioWrap, {
      onChange: (current, total) => {
        this.shell.setStatus(`Trang chiếu ${current} / ${total}  |  Tỷ lệ 16:9 HD  |  Tiếng Việt`);
      }
    });
    this.canvasController.mount();

    if (isBlank) {
      this.canvasController.slides = [
        { id: 1, title: "Tiêu đề trang chiếu", body: "• Nhập nội dung chính tại đây", layoutType: "title-content", shapes: [] }
      ];
      this.canvasController.selectSlide(0);
      const tabEl = this.shell.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = "Bản trình chiếu 1.pptx";
    }

    this.helpPanel = new HelpPanel({ app: "slides" });
    this.helpPanel.mount(workspace);
    globalCommandBus.bindHandler("slides.help.open", (args) => {
      if (args?.entryId || args?.query != null) return this.helpPanel.open(args);
      return this.helpPanel.toggle();
    });

    this.shell.setEditorCanvas(workspace);

    this.adapter = new SlidesAdapter(this.canvasController);
    this.adapter.setShell(this.shell);
    this.adapter.attach();

    this.shell.setStatus("Trang chiếu 1 / 3  |  Tỷ lệ 16:9 HD  |  Tiếng Việt  |  Sẵn sàng");
    console.log("[SlidesApp] Đã khởi tạo VN Slides chuẩn hóa cao cấp.");
  }

  _watchLifecycle() {
    this._lifecycleObserver?.disconnect();
    if (typeof MutationObserver === "undefined") return;
    this._lifecycleObserver = new MutationObserver(() => {
      if (this.mountElement.getAttribute("data-app") !== "slides") this.destroy();
    });
    this._lifecycleObserver.observe(this.mountElement, { attributes: true, attributeFilter: ["data-app"] });
  }

  destroy() {
    this._lifecycleObserver?.disconnect();
    this._lifecycleObserver = null;
    this.helpPanel?.destroy();
    this.helpPanel = null;
    this.canvasController?.destroy?.();
  }
}
