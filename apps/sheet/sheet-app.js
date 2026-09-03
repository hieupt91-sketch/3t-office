/**
 * VN Sheet Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SHEET_RIBBON_TABS } from "./sheet-ribbon.js";
import { SheetGridController } from "./sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export class SheetApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.grid = null;
    this.adapter = null;
  }

  async init() {
    registerAllStandardCommands(globalCommandBus);
    await globalUnoBridge.init();

    this.shell = new AppShell({
      appName: "sheet",
      appTitle: "VN Sheet",
      documentName: "Dự toán kinh phí VN Office 2026.xlsx"
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

    this.shell.setEditorCanvas(gridWrap);

    this.adapter = new SheetAdapter(this.grid);
    this.adapter.attach();

    this.shell.setStatus("SẴN SÀNG  |  Ô: A1  |  ĐẾM: 28  |  TỔNG CỘNG: 120.000.000 ₫");
    console.log("[SheetApp] Đã khởi tạo VN Sheet chuẩn hóa cao cấp.");
  }
}
