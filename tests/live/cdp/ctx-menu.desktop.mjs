/**
 * Test Desktop CDP: Menu ngữ cảnh chuột phải và Submenu trong Doc và Sheet
 * TUÂN THỦ QUY TẮC:
 * - Chỉ dùng CDP thuần (Runtime.evaluate, Input.dispatchMouseEvent, Input.dispatchKeyEvent).
 * - CẤM SendKeys, SendInput, pyautogui.
 * - LOCALAPPDATA=E:\VNOffice-profiles\agy-ctx.
 * - Tắt đúng PID tạo ra (thông qua session.close()).
 * - Không fake PASS, không || true.
 */

import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";
import path from "node:path";
import fs from "node:fs/promises";

const LOCAL_PROFILES_DIR = "E:\\VNOffice-profiles\\agy-ctx";

async function run() {
  console.log("=== KIỂM TRA DESKTOP CDP: MENU CHUỘT PHẢI & SUBMENU (DOC & SHEET) ===");
  await fs.mkdir(LOCAL_PROFILES_DIR, { recursive: true });

  const steps = [];
  const logStep = (name, pass, detail = "") => {
    steps.push({ name, pass, detail });
    console.log(`  ${pass ? "[PASS]" : "[FAIL]"} ${name} ${detail ? `(${detail})` : ""}`);
  };

  // =========================================================================
  // PHẦN 1: VN WRITER (DOC)
  // =========================================================================
  console.log("\n▶ [1/2] Kiểm tra trên VN Writer (Doc)...");
  let writerSession = null;
  try {
    writerSession = await launchApp("writer", {
      root: process.cwd(),
      localAppData: path.join(LOCAL_PROFILES_DIR, "writer"),
      startTimeoutMilliseconds: 60000,
      readyTimeoutMilliseconds: 45000
    });
    const cdp = writerSession.cdp;

    // 1.1 Chuẩn bị đoạn văn bản và lấy tọa độ
    const initRes = await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      if (!body) return { error: "Không tìm thấy .vno-writer-body" };
      body.innerHTML = '<p id="test-ctx-p" style="padding: 10px; font-size: 16px;">Đoạn văn bản kiểm thử chuột phải giữa trang trong VN Writer.</p><ol id="test-ctx-ol"><li id="test-ctx-li">Mục danh sách số</li></ol>';
      const p = document.querySelector("#test-ctx-p");
      const rect = p.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };
    })()`);

    if (initRes.error) throw new Error(initRes.error);

    // 1.2 Gửi sự kiện chuột phải qua CDP vào giữa đoạn văn
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: initRes.x,
      y: initRes.y,
      button: "right",
      buttons: 2,
      clickCount: 1
    });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: initRes.x,
      y: initRes.y,
      button: "right",
      buttons: 0,
      clickCount: 1
    });

    // Phát sự kiện contextmenu tại tọa độ đó
    await cdp.evaluate(`(() => {
      const p = document.querySelector("#test-ctx-p");
      if (p) {
        const ev = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: ${initRes.x},
          clientY: ${initRes.y}
        });
        p.dispatchEvent(ev);
      }
    })()`);

    await sleep(400);

    // 1.3 Kiểm tra menu ngữ cảnh văn bản xuất hiện
    const writerMenuState = await cdp.evaluate(`(() => {
      const menu = document.querySelector(".vno-context-menu");
      if (!menu) return { exists: false };
      const items = Array.from(menu.querySelectorAll(".vno-context-menu-item")).map(el => el.textContent.trim());
      const hasCut = items.some(t => t.includes("Cắt"));
      const hasCopy = items.some(t => t.includes("Sao chép"));
      const hasPaste = items.some(t => t.includes("Dán"));
      const hasInsert = items.some(t => t.includes("Chèn"));
      const hasList = items.some(t => t.includes("Danh sách"));
      const hasFind = items.some(t => t.includes("Tìm kiếm"));

      const insertBtn = Array.from(menu.querySelectorAll(".vno-context-menu-item")).find(b => b.textContent.includes("Chèn"));
      const insertHasSubmenu = insertBtn?.classList.contains("vno-has-submenu") && insertBtn?.getAttribute("aria-haspopup") === "true";

      return {
        exists: true,
        items,
        hasCut,
        hasCopy,
        hasPaste,
        hasInsert,
        hasList,
        hasFind,
        insertHasSubmenu
      };
    })()`);

    logStep("Doc: Menu ngữ cảnh văn bản mở thành công", writerMenuState.exists);
    logStep("Doc: Đầy đủ các mục chính (Cắt, Sao chép, Dán, Chèn, Danh sách, Tìm kiếm)",
      writerMenuState.hasCut && writerMenuState.hasCopy && writerMenuState.hasPaste &&
      writerMenuState.hasInsert && writerMenuState.hasList && writerMenuState.hasFind);
    logStep("Doc: Mục Chèn có cờ Submenu và ARIA haspopup", writerMenuState.insertHasSubmenu);

    // 1.4 Mở submenu Chèn bằng click vào nút Chèn
    await cdp.evaluate(`(() => {
      const menu = document.querySelector(".vno-context-menu");
      const insertBtn = Array.from(menu?.querySelectorAll(".vno-context-menu-item") || []).find(b => b.textContent.includes("Chèn"));
      if (insertBtn) insertBtn.click();
    })()`);

    await sleep(300);

    const writerSubmenuState = await cdp.evaluate(`(() => {
      const sub = document.querySelector(".vno-context-submenu");
      if (!sub) return { exists: false };
      const subItems = Array.from(sub.querySelectorAll(".vno-context-menu-item")).map(el => el.textContent.trim());
      const hasTable = subItems.some(t => t.includes("Bảng"));
      const hasImage = subItems.some(t => t.includes("Hình ảnh"));
      const hasLink = subItems.some(t => t.includes("Liên kết"));
      const hasSymbol = subItems.some(t => t.includes("Ký hiệu"));
      return {
        exists: true,
        subItems,
        hasTable,
        hasImage,
        hasLink,
        hasSymbol
      };
    })()`);

    logStep("Doc: Submenu Chèn mở thành công", writerSubmenuState.exists);
    logStep("Doc: Submenu Chèn chứa đầy đủ Bảng, Hình ảnh, Liên kết, Ký hiệu",
      writerSubmenuState.hasTable && writerSubmenuState.hasImage && writerSubmenuState.hasLink && writerSubmenuState.hasSymbol);

    // 1.5 Đóng submenu bằng phím Escape lần 1
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(200);

    const isSubClosed = await cdp.evaluate(`!document.querySelector(".vno-context-submenu") && !!document.querySelector(".vno-context-menu")`);
    logStep("Doc: Phím Escape lần 1 đóng submenu và giữ root menu", isSubClosed);

    // 1.6 Đóng root menu bằng phím Escape lần 2
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(200);

    const isAllClosedAfterEsc = await cdp.evaluate(`!document.querySelector(".vno-context-menu")`);
    logStep("Doc: Phím Escape lần 2 đóng toàn bộ context menu", isAllClosedAfterEsc);

    // 1.7 Kiểm tra chuột phải trên <li> danh sách (tương thích ngược vno-list-context-menu)
    const listRes = await cdp.evaluate(`(() => {
      const li = document.querySelector("#test-ctx-li");
      if (!li) return { error: "Không tìm thấy li" };
      const rect = li.getBoundingClientRect();
      const ev = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: Math.round(rect.left + rect.width / 2),
        clientY: Math.round(rect.top + rect.height / 2)
      });
      li.dispatchEvent(ev);

      const menu = document.querySelector(".vno-list-context-menu");
      const hasListClass = !!menu;
      const items = Array.from(menu?.querySelectorAll(".vno-context-menu-item") || []).map(b => b.textContent.trim());
      const hasContinue = items.some(t => t.includes("Tiếp tục"));
      const hasRestart = items.some(t => t.includes("Đánh số lại"));

      return { hasListClass, hasContinue, hasRestart, items };
    })()`);

    logStep("Doc: Chuột phải li giữ nguyên class .vno-list-context-menu và các mục danh sách",
      listRes.hasListClass && listRes.hasContinue && listRes.hasRestart);

    // Đóng menu danh sách bằng Escape
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(200);

  } finally {
    if (writerSession) {
      await writerSession.close();
    }
  }

  // =========================================================================
  // PHẦN 2: VN SHEET
  // =========================================================================
  console.log("\n▶ [2/2] Kiểm tra trên VN Sheet...");
  let sheetSession = null;
  try {
    sheetSession = await launchApp("sheet", {
      root: process.cwd(),
      localAppData: path.join(LOCAL_PROFILES_DIR, "sheet"),
      startTimeoutMilliseconds: 60000,
      readyTimeoutMilliseconds: 45000
    });
    const cdp = sheetSession.cdp;

    // 2.1 Lấy ô B2 trong Sheet và vị trí
    const cellCoord = await cdp.evaluate(`(() => {
      const cell = document.querySelector('td[data-coord="B2"]') || document.querySelector('.vno-grid-cell');
      if (!cell) return null;
      const rect = cell.getBoundingClientRect();
      return {
        coord: cell.dataset.coord || "B2",
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };
    })()`);

    if (!cellCoord) throw new Error("Không tìm thấy ô lưới trong Sheet");

    // 2.2 Gửi sự kiện chuột phải qua CDP và phát contextmenu vào ô
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: cellCoord.x,
      y: cellCoord.y,
      button: "right",
      buttons: 2,
      clickCount: 1
    });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: cellCoord.x,
      y: cellCoord.y,
      button: "right",
      buttons: 0,
      clickCount: 1
    });

    await cdp.evaluate(`(() => {
      const cell = document.querySelector('td[data-coord="${cellCoord.coord}"]') || document.querySelector('.vno-grid-cell');
      if (cell) {
        const ev = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: ${cellCoord.x},
          clientY: ${cellCoord.y}
        });
        cell.dispatchEvent(ev);
      }
    })()`);

    await sleep(400);

    // 2.3 Kiểm tra menu ngữ cảnh ô xuất hiện
    const sheetMenuRes = await cdp.evaluate(`(() => {
      const menu = document.querySelector(".vno-sheet-context-menu");
      if (!menu) return { exists: false };

      const items = Array.from(menu.querySelectorAll(".vno-context-menu-item")).map(el => el.textContent.trim());
      const hasCut = items.some(t => t.includes("Cắt"));
      const hasCopy = items.some(t => t.includes("Sao chép"));
      const hasPaste = items.some(t => t.includes("Dán"));
      const hasPasteSpecial = items.some(t => t.includes("Dán đặc biệt"));
      const hasInsert = items.some(t => t.includes("Chèn"));
      const hasDelete = items.some(t => t.includes("Xóa"));
      const hasSort = items.some(t => t.includes("Sắp xếp"));
      const hasFilter = items.some(t => t.includes("Lọc"));

      return {
        exists: true,
        items,
        hasCut,
        hasCopy,
        hasPaste,
        hasPasteSpecial,
        hasInsert,
        hasDelete,
        hasSort,
        hasFilter
      };
    })()`);

    logStep("Sheet: Menu ngữ cảnh ô mở thành công", sheetMenuRes.exists);
    logStep("Sheet: Có đủ các nhóm submenu chính (Dán đặc biệt, Chèn, Xóa, Sắp xếp, Lọc)",
      sheetMenuRes.hasPasteSpecial && sheetMenuRes.hasInsert && sheetMenuRes.hasDelete && sheetMenuRes.hasSort && sheetMenuRes.hasFilter);

    // 2.4 Mở submenu Dán đặc biệt
    await cdp.evaluate(`(() => {
      const menu = document.querySelector(".vno-sheet-context-menu");
      const psBtn = Array.from(menu?.querySelectorAll(".vno-context-menu-item") || []).find(b => b.textContent.includes("Dán đặc biệt"));
      if (psBtn) psBtn.click();
    })()`);

    await sleep(300);

    const pasteSpecialSubRes = await cdp.evaluate(`(() => {
      const sub = document.querySelector(".vno-context-submenu");
      if (!sub) return { exists: false };
      const subItems = Array.from(sub.querySelectorAll(".vno-context-menu-item")).map(el => el.textContent.trim());
      const hasValues = subItems.some(t => t.includes("giá trị"));
      const hasFormulas = subItems.some(t => t.includes("công thức"));
      const hasFormats = subItems.some(t => t.includes("định dạng"));
      const hasTranspose = subItems.some(t => t.includes("Chuyển vị"));
      return {
        exists: true,
        subItems,
        hasValues,
        hasFormulas,
        hasFormats,
        hasTranspose
      };
    })()`);

    logStep("Sheet: Submenu Dán đặc biệt mở thành công", pasteSpecialSubRes.exists);
    logStep("Sheet: Submenu Dán đặc biệt có đủ giá trị, công thức, định dạng, chuyển vị",
      pasteSpecialSubRes.hasValues && pasteSpecialSubRes.hasFormulas && pasteSpecialSubRes.hasFormats && pasteSpecialSubRes.hasTranspose);

    // Đóng submenu Dán đặc biệt
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(200);

    // 2.5 Mở submenu Chèn trong Sheet
    await cdp.evaluate(`(() => {
      const menu = document.querySelector(".vno-sheet-context-menu");
      const insertBtn = Array.from(menu?.querySelectorAll(".vno-context-menu-item") || []).find(b => b.textContent.trim() === "Chèn");
      if (insertBtn) insertBtn.click();
    })()`);

    await sleep(300);

    const insertSubRes = await cdp.evaluate(`(() => {
      const sub = document.querySelector(".vno-context-submenu");
      if (!sub) return { exists: false };
      const subItems = Array.from(sub.querySelectorAll(".vno-context-menu-item")).map(el => el.textContent.trim());
      const hasRow = subItems.some(t => t.includes("hàng"));
      const hasCol = subItems.some(t => t.includes("cột"));
      const hasCell = subItems.some(t => t.includes("ô"));
      return { exists: true, subItems, hasRow, hasCol, hasCell };
    })()`);

    logStep("Sheet: Submenu Chèn chứa Chèn hàng, Chèn cột, Chèn ô",
      insertSubRes.exists && insertSubRes.hasRow && insertSubRes.hasCol && insertSubRes.hasCell);

    // 2.6 Đóng submenu Chèn bằng Escape lần 1
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(200);

    // 2.7 Đóng root menu bằng Escape lần 2
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(200);

    const sheetClosed = await cdp.evaluate(`!document.querySelector(".vno-sheet-context-menu")`);
    logStep("Sheet: Phím Escape đóng context menu thành công", sheetClosed);

  } finally {
    if (sheetSession) {
      await sheetSession.close();
    }
  }

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  const failedCount = steps.filter(s => !s.pass).length;
  console.log("\n==================================================");
  console.log(`KẾT QUẢ KIỂM THỬ DESKTOP CDP: ${steps.length - failedCount}/${steps.length} PASS | ${failedCount} FAIL`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("LỖI NGOẠI LỆ TRONG TEST DESKTOP CDP:", err);
  process.exit(1);
});
