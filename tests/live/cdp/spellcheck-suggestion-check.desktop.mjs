import { launchApp } from "./session.mjs";

async function run() {
  console.log("=== KIỂM TRA TRÊN DESKTOP VIA CDP: SPELLCHECK SUGGESTIONS (AFTER) ===");
  const session = await launchApp("writer", { root: process.cwd() });
  try {
    const cdp = session.cdp;

    // Chờ spellcheck tải xong
    await new Promise(r => setTimeout(r, 1000));

    const afterState = await cdp.evaluate(`(async () => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p>quyết đinh</p>';
      body.dispatchEvent(new Event("input", { bubbles: true }));

      // Chờ bộ kiểm tra chính tả quét
      await new Promise(r => setTimeout(r, 600));

      const marker = document.querySelector(".vno-spelling-uncertain");
      const hasMarker = !!marker;
      const markerText = marker ? marker.textContent : null;

      if (marker) {
        marker.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 250, clientY: 250 }));
      }

      const menu = document.querySelector(".vno-spellcheck-menu");
      const hasMenu = !!menu;
      const suggestions = menu ? [...menu.querySelectorAll(".vno-spellcheck-suggestion")].map(b => b.textContent) : [];
      const hasDinh = suggestions.includes("định");

      // Click chọn từ gợi ý "định"
      const dinhBtn = menu ? [...menu.querySelectorAll(".vno-spellcheck-suggestion")].find(b => b.textContent.trim() === "định") : null;
      if (dinhBtn) dinhBtn.click();

      // Chờ cập nhật
      await new Promise(r => setTimeout(r, 100));
      const bodyTextAfter = body.textContent.trim();
      const menuOpenAfter = !!document.querySelector(".vno-spellcheck-menu");

      return {
        hasMarker,
        markerText,
        hasMenu,
        suggestions,
        hasDinh,
        dinhRank: suggestions.indexOf("định"),
        bodyTextAfter,
        menuOpenAfter
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
