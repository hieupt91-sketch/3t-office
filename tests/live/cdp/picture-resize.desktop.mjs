import { launchApp } from "./session.mjs";
import { click, mouseClick } from "./actions.mjs";

async function run() {
  console.log("=== BẮT ĐẦU KIỂM TRA DESKTOP CDP: PICTURE RESIZE & WRAP TEXT ===");
  const session = await launchApp("writer", { root: process.cwd() });
  try {
    const cdp = session.cdp;

    // 1. Chèn ảnh mẫu vào trang văn bản
    await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p>Đoạn văn mở đầu tài liệu.</p><img id="desktop-test-img" src="data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'100\\'><rect width=\\'200\\' height=\\'100\\' fill=\\'teal\\'/></svg>" style="width:200px; height:100px; display:inline;" /><p>Đoạn văn tiếp theo để kiểm tra ngắt dòng chữ xung quanh ảnh.</p>';
    })()`);

    // 2. Click chọn ảnh
    console.log("-> Click chọn hình ảnh...");
    await click(cdp, "#desktop-test-img");

    // 3. Kiểm tra overlay và 8 tay cầm
    const overlayState = await cdp.evaluate(`(() => {
      const img = document.querySelector("#desktop-test-img");
      const overlay = document.querySelector("#vno-image-resize-overlay");
      const handles = overlay ? [...overlay.querySelectorAll(".vno-image-resize-handle")].map(h => h.dataset.handle) : [];
      const quickWrap = !!overlay?.querySelector(".vno-image-quick-wrap-btn");
      const isSelected = img?.classList.contains("is-vno-image-selected");
      const activeTab = document.querySelector(".vno-ribbon-tab.is-active")?.textContent?.trim();
      return { isSelected, hasOverlay: !!overlay, handleCount: handles.length, handles, quickWrap, activeTab };
    })()`);
    console.log("Trạng thái overlay sau khi chọn ảnh:", JSON.stringify(overlayState, null, 2));

    // 4. Kiểm tra ribbon Sắp xếp & Kích thước
    const ribbonState = await cdp.evaluate(`(() => {
      const panel = document.querySelector("#vno-ribbon-tabpanel-pictureFormat");
      const wInput = panel?.querySelector("[data-arrange='width']");
      const hInput = panel?.querySelector("[data-arrange='height']");
      const wrapSel = panel?.querySelector("[data-arrange='wrap']");
      return {
        hasPanel: !!panel,
        widthVal: wInput ? wInput.value : null,
        heightVal: hInput ? hInput.value : null,
        wrapVal: wrapSel ? wrapSel.value : null
      };
    })()`);
    console.log("Trạng thái ribbon Định dạng Hình ảnh:", JSON.stringify(ribbonState, null, 2));

    // 5. Thử nghiệm kéo tay cầm góc SE (giữ tỷ lệ khung hình)
    console.log("-> Thử nghiệm kéo tay cầm góc se...");
    const sePoint = await cdp.evaluate(`(() => {
      const se = document.querySelector("#vno-image-resize-overlay [data-handle='se']");
      if (!se) return null;
      const rect = se.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    if (sePoint) {
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: sePoint.x, y: sePoint.y, button: "left", buttons: 1, clickCount: 1 });
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: sePoint.x + 60, y: sePoint.y + 30, button: "left", buttons: 1 });
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: sePoint.x + 60, y: sePoint.y + 30, button: "left", buttons: 0, clickCount: 1 });
    }

    const afterDrag = await cdp.evaluate(`(() => {
      const img = document.querySelector("#desktop-test-img");
      return { width: img.style.width, height: img.style.height };
    })()`);
    console.log("Kích thước sau khi kéo tay cầm góc SE:", JSON.stringify(afterDrag, null, 2));

    // 6. Thử nghiệm nút Ngắt dòng nhanh và chọn kiểu Square
    console.log("-> Thử nghiệm mở menu ngắt dòng nhanh...");
    await click(cdp, ".vno-image-quick-wrap-btn");
    const menuState = await cdp.evaluate(`(() => {
      const menu = document.querySelector(".vno-image-wrap-popup");
      const options = menu ? [...menu.querySelectorAll(".vno-image-wrap-option")].map(o => o.dataset.wrapMode) : [];
      return { hasMenu: !!menu, optionCount: options.length, options };
    })()`);
    console.log("Menu ngắt dòng nhanh:", JSON.stringify(menuState, null, 2));

    // Nhấp chọn tùy chọn 'square'
    console.log("-> Chọn kiểu ngắt dòng square...");
    await click(cdp, ".vno-image-wrap-option[data-wrap-mode='square']");
    const afterWrap = await cdp.evaluate(`(() => {
      const img = document.querySelector("#desktop-test-img");
      return { vnoWrap: img.dataset.vnoWrap, float: img.style.float, display: img.style.display };
    })()`);
    console.log("Kiểu ngắt dòng sau khi chọn square:", JSON.stringify(afterWrap, null, 2));

    // 7. Nhập trực tiếp số đo trên Ribbon
    console.log("-> Nhập trực tiếp kích thước mới trên ribbon (Cao 180, Rộng 360)...");
    await cdp.evaluate(`(() => {
      const panel = document.querySelector("#vno-ribbon-tabpanel-pictureFormat");
      const wInput = panel.querySelector("[data-arrange='width']");
      const hInput = panel.querySelector("[data-arrange='height']");
      wInput.value = "360";
      hInput.value = "180";
      wInput.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    const afterDirectSize = await cdp.evaluate(`(() => {
      const img = document.querySelector("#desktop-test-img");
      return { width: img.style.width, height: img.style.height };
    })()`);
    console.log("Kích thước sau khi nhập trực tiếp:", JSON.stringify(afterDirectSize, null, 2));

    console.log("=== HOÀN TẤT KIỂM TRA DESKTOP CDP THÀNH CÔNG ===");
  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error("LỖI KIỂM TRA DESKTOP CDP:", err);
  process.exit(1);
});
