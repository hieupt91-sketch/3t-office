/**
 * VN Slides Application Entrypoint
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SLIDES_RIBBON_TABS } from "./slides-ribbon.js";
import { SlidesCanvasController } from "./slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export class SlidesApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.canvasController = null;
    this.adapter = null;
  }

  async init() {
    registerAllStandardCommands(globalCommandBus);
    await globalUnoBridge.init();

    this.shell = new AppShell({
      appName: "slides",
      appTitle: "VN Slides",
      documentName: "Bản trình chiếu giới thiệu.pptx"
    });
    this.shell.mount(this.mountElement);

    this.shell.ribbonHost.setStructure(SLIDES_RIBBON_TABS, "home");

    const studioWrap = document.createElement("div");
    studioWrap.style.width = "100%";
    studioWrap.style.height = "100%";

    this.canvasController = new SlidesCanvasController(studioWrap, {
      onChange: (current, total) => {
        this.shell.setStatus(`Trang chiếu ${current} / ${total}  |  Bố cục: Tiêu đề & Nội dung  |  Sẵn sàng`);
      }
    });
    this.canvasController.mount();

    this.shell.setEditorCanvas(studioWrap);

    this.adapter = new SlidesAdapter(this.canvasController);
    this.adapter.attach();

    this.shell.setStatus("Trang chiếu 1 / 2  |  Bố cục: Tiêu đề & Nội dung  |  Sẵn sàng");
    console.log("[SlidesApp] Khởi tạo VN Slides hoàn tất thành công.");
  }
}
