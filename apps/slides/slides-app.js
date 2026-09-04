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

export class SlidesApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.canvasController = null;
    this.adapter = null;
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
    this.shell.ribbonHost.setStructure(applyLocaleToTabs(SLIDES_RIBBON_TABS), "home");

    const studioWrap = document.createElement("div");
    studioWrap.style.width = "100%";
    studioWrap.style.height = "100%";

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

    this.shell.setEditorCanvas(studioWrap);

    this.adapter = new SlidesAdapter(this.canvasController);
    this.adapter.attach();

    this.shell.setStatus("Trang chiếu 1 / 3  |  Tỷ lệ 16:9 HD  |  Tiếng Việt  |  Sẵn sàng");
    console.log("[SlidesApp] Đã khởi tạo VN Slides chuẩn hóa cao cấp.");
  }
}
