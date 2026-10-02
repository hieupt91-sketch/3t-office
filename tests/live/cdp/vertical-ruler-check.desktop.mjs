import { launchApp } from "./session.mjs";

async function run() {
  console.log("=== KIỂM TRA TRÊN DESKTOP VIA CDP: VERTICAL RULER (AFTER) ===");
  const session = await launchApp("writer", { root: process.cwd() });
  try {
    const cdp = session.cdp;

    const afterState = await cdp.evaluate(`(() => {
      const horizontalRuler = document.querySelector(".vno-writer-ruler");
      const verticalRuler = document.querySelector(".vno-writer-ruler-vertical");
      const track = verticalRuler ? verticalRuler.querySelector(".vno-ruler-vertical-track") : null;
      const markerTop = verticalRuler ? verticalRuler.querySelector(".vno-ruler-marker-top") : null;
      const markerBottom = verticalRuler ? verticalRuler.querySelector(".vno-ruler-marker-bottom") : null;

      const initial = {
        hasHorizontalRuler: !!horizontalRuler,
        hasVerticalRuler: !!verticalRuler,
        verticalRulerWidth: verticalRuler ? verticalRuler.offsetWidth : 0,
        hasTrack: !!track,
        hasMarkerTop: !!markerTop,
        hasMarkerBottom: !!markerBottom,
        initialHidden: verticalRuler ? verticalRuler.hidden : null
      };

      // 1. Chuyển sang tab Chế độ xem và kiểm tra ẩn hiện khi nhấn nút Thước
      const viewTab = Array.from(document.querySelectorAll(".vno-ribbon-tab")).find(t => t.textContent.includes("Chế độ xem"));
      if (viewTab) viewTab.click();

      const rulerBtn = document.querySelector("[data-command='writer.view.ruler'], [data-id='writer.view.ruler'], [data-command-id='writer.view.ruler']");
      if (rulerBtn) rulerBtn.click();
      const afterHide = {
        horizontalHidden: horizontalRuler ? horizontalRuler.hidden : null,
        verticalHidden: verticalRuler ? verticalRuler.hidden : null
      };

      // Bật lại thước
      if (rulerBtn) rulerBtn.click();
      const afterShow = {
        horizontalHidden: horizontalRuler ? horizontalRuler.hidden : null,
        verticalHidden: verticalRuler ? verticalRuler.hidden : null
      };

      // 2. Kiểm tra cuộn trang và đồng bộ translateY của vertical ruler track
      const viewport = document.querySelector(".vno-writer-viewport");
      if (viewport) {
        viewport.scrollTop = 150;
        viewport.dispatchEvent(new Event("scroll"));
      }
      const transformAfterScroll = track ? track.style.transform : null;

      return {
        initial,
        afterHide,
        afterShow,
        transformAfterScroll
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
