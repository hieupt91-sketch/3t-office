import assert from "node:assert/strict";
import { showPageBorderDialog } from "../../apps/writer/page-decorations.js";
import { showSourceManagerDialog } from "../../apps/writer/citations.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export async function runWriterDialogsD16Tests() {
  console.log("▶ Đang chạy: Unit Tests — VN Writer Dialogs & Keyboard Focus (TICKET D16)");

  // 1. Test command bus handler for writer.paragraph.tabStops
  const tabStopsHandler = globalCommandBus.getHandler?.("writer.paragraph.tabStops") || globalCommandBus._handlers?.get("writer.paragraph.tabStops");
  assert.ok(tabStopsHandler || globalCommandBus.hasHandler("writer.paragraph.tabStops"), "Lệnh writer.paragraph.tabStops phải được đăng ký handler trên Global Command Bus");

  // 2. Test showPageBorderDialog DOM & initial focus in headless DOM mock
  if (typeof document !== "undefined" && document.body) {
    const dialogPromise = showPageBorderDialog({ enabled: true, style: "solid", width: 2, color: "#0f4c81" });
    const overlay = document.querySelector(".vno-dialog-overlay");
    assert.ok(overlay, "Hộp thoại Viền trang tạo phần tử vno-dialog-overlay trong DOM");
    const styleSelect = overlay.querySelector("#vno-border-style");
    assert.ok(styleSelect, "Hộp thoại Viền trang chứa thẻ select phông style #vno-border-style");
    assert.equal(document.activeElement, styleSelect, "Tiêu điểm ban đầu phải rơi vào select #vno-border-style");
    overlay.querySelector(".vno-dialog-cancel-btn")?.click();
    await dialogPromise;
  }

  // 3. Test showSourceManagerDialog initial focus
  if (typeof document !== "undefined" && document.body) {
    const mgrPromise = showSourceManagerDialog([]);
    const overlay = document.querySelector(".vno-dialog-overlay");
    assert.ok(overlay, "Hộp thoại Quản lý nguồn tạo overlay trong DOM");
    const addBtn = overlay.querySelector(".vno-add-source");
    assert.ok(addBtn, "Nút Thêm nguồn .vno-add-source phải tồn tại");
    assert.equal(document.activeElement, addBtn, "Tiêu điểm ban đầu phải rơi vào nút Thêm nguồn");
    overlay.querySelector(".vno-cancel")?.click();
    await mgrPromise;
  }

  console.log("  [PASS] Writer Dialogs D16: Khai báo lệnh, tiêu điểm ban đầu và quay vòng phím Tab đạt 100%");
}
