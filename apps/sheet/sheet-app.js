/**
 * VN Sheet Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SHEET_RIBBON_TABS } from "./sheet-ribbon.js";
import { SheetGridController } from "./sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { bootstrapPlatform } from "../../platform/bootstrap.js";
import { applyLocaleToTabs } from "../../platform/i18n/i18n.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

export class SheetApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.grid = null;
    this.adapter = null;
    this._lifecycleObserver = null;
  }

  async init(options = {}) {
    await bootstrapPlatform();
    globalShortcutManager.setActiveScope("sheet");

    this.shell = new AppShell({
      appName: "sheet",
      appTitle: "VN Sheet",
      documentName: options.documentName || "Dự toán kinh phí VN Office 2026.xlsx"
    });
    this.shell.mount(this.mountElement);
    this._watchLifecycle();
    this.shell.ribbonHost.setStructure(applyLocaleToTabs(SHEET_RIBBON_TABS), "home");

    const gridWrap = document.createElement("div");
    gridWrap.style.width = "100%";
    gridWrap.style.height = "100%";

    this.grid = new SheetGridController(gridWrap, {
      onSelect: (coord, data, stats) => {
        this.shell.setStatus(`SẴN SÀNG  |  Ô: ${coord}  |  ĐẾM: ${stats.count}  |  TRUNG BÌNH: ${stats.avg}  |  TỔNG CỘNG: ${stats.sum}`);
      }
    });
    this.grid.mount();

    if (options.templateId === "blank") {
      this.grid.cellsData.clear();
      this.grid.container.querySelectorAll(".vno-grid-cell").forEach(td => td.textContent = "");
      this.shell.documentName = "Bảng tính 1.xlsx";
      const tabEl = this.shell.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = "Bảng tính 1.xlsx";
    }

    this.shell.setEditorCanvas(gridWrap);

    this.adapter = new SheetAdapter(this.grid);
    this.adapter.attach();

    this.grid.updateStatus();
    console.log("[SheetApp] Đã khởi tạo VN Sheet chuẩn hóa cao cấp.");
  }

  _watchLifecycle() {
    this._lifecycleObserver?.disconnect();
    if (typeof MutationObserver === "undefined") return;
    this._lifecycleObserver = new MutationObserver(() => {
      if (this.mountElement.getAttribute("data-app") !== "sheet") this.destroy();
    });
    this._lifecycleObserver.observe(this.mountElement, { attributes: true, attributeFilter: ["data-app"] });
  }

  destroy() {
    this._lifecycleObserver?.disconnect();
    this._lifecycleObserver = null;
    this.grid?.destroy?.();
  }
}
