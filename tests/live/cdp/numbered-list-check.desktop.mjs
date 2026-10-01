import { launchApp } from "./session.mjs";

async function run() {
  console.log("=== KIỂM TRA TRÊN DESKTOP VIA CDP: NUMBERED LIST RESTART / CONTINUE ===");
  const session = await launchApp("writer", { root: process.cwd() });
  try {
    const cdp = session.cdp;

    const afterState = await cdp.evaluate(`(() => {
      const hasRestartHandler = !!window.vnoCommandBus?.getHandler?.("writer.list.restartNumbering");
      const hasContinueHandler = !!window.vnoCommandBus?.getHandler?.("writer.list.continueNumbering");

      // Chèn 2 danh sách số cách nhau bởi một đoạn văn
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<ol id="list1"><li>Mục 1</li><li>Mục 2</li></ol><p id="p-mid">Đoạn văn chèn giữa hai danh sách</p><ol id="list2"><li id="li-target">Mục danh sách thứ hai</li></ol>';

      const liTarget = document.querySelector("#li-target");
      const list2 = document.querySelector("#list2");

      // 1. Thử phát sự kiện contextmenu vào li-target
      const contextEv = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 200, clientY: 200 });
      liTarget.dispatchEvent(contextEv);

      const menu = document.querySelector(".vno-list-context-menu");
      const hasContextMenu = !!menu;
      const menuItems = menu ? Array.from(menu.querySelectorAll(".vno-context-menu-item")).map(el => el.textContent.trim()) : [];

      // 2. Click "Tiếp tục đánh số"
      const continueBtn = Array.from(menu ? menu.querySelectorAll("button") : []).find(b => b.textContent.includes("Tiếp tục"));
      if (continueBtn) continueBtn.click();
      const list2StartAfterContinue = list2.getAttribute("start");

      // 3. Mở lại menu chuột phải và click "Đánh số lại từ 1"
      liTarget.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
      const menu2 = document.querySelector(".vno-list-context-menu");
      const restartBtn = Array.from(menu2 ? menu2.querySelectorAll("button") : []).find(b => b.textContent.includes("Đánh số lại"));
      if (restartBtn) restartBtn.click();
      const list2StartAfterRestart = list2.getAttribute("start");

      // 4. Kiểm tra nút/dropdown trên ribbon
      const ribbonDropdown = !!document.querySelector("[data-dropdown-id='writer.list.restartNumbering'], [data-dropdown-toggle='writer.list.restartNumbering']");

      return {
        hasContextMenu,
        menuItems,
        list2StartAfterContinue,
        list2StartAfterRestart,
        ribbonDropdown
      };
    })()`);

    console.log("KẾT QUẢ KIỂM TRA DESKTOP (AFTER):", JSON.stringify(afterState, null, 2));
  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error("LỖI KIỂM TRA DESKTOP CDP:", err);
  process.exit(1);
});
