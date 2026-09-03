/**
 * VN Sheet Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SHEET_RIBBON_TABS } from "./sheet-ribbon.js";
import { SheetGridController } from "./sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { bootstrapPlatform } from "../../platform/bootstrap.js";

export class SheetApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.grid = null;
    this.adapter = null;
  }

  async init(options = {}) {
    await bootstrapPlatform();

    this.shell = new AppShell({
      appName: "sheet",
      appTitle: "VN Sheet",
      documentName: options.documentName || "Dự toán kinh phí VN Office 2026.xlsx"
    });
    this.shell.mount(this.mountElement);
    this.shell.ribbonHost.setStructure(SHEET_RIBBON_TABS, "home");

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
}
