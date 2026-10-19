/** Hộp thoại Thu phóng của Slides: phần trăm chính xác (50–200%), nút nhanh và Vừa cửa sổ. */
export const SLIDES_ZOOM_MIN = 50;
export const SLIDES_ZOOM_MAX = 200;

export async function showSlidesZoomDialog(currentPercent = 100) {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const start = Math.min(SLIDES_ZOOM_MAX, Math.max(SLIDES_ZOOM_MIN, Math.round(Number(currentPercent) || 100)));
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width:420px" role="dialog" aria-modal="true" aria-labelledby="vno-slides-zoom-title">
        <div class="vno-dialog-header"><span id="vno-slides-zoom-title">Thu phóng</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" aria-label="Đóng">×</button></div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px">
          <label for="vno-slides-zoom-value" style="font-weight:600">Phần trăm (${SLIDES_ZOOM_MIN}–${SLIDES_ZOOM_MAX}%)</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input id="vno-slides-zoom-value" type="number" min="${SLIDES_ZOOM_MIN}" max="${SLIDES_ZOOM_MAX}" step="1" value="${start}" style="width:100px;padding:7px;border:1px solid #cbd5e1;border-radius:4px"><span>%</span>
            <button type="button" class="vno-btn" data-zoom="200">200%</button><button type="button" class="vno-btn" data-zoom="100">100%</button><button type="button" class="vno-btn" data-zoom="75">75%</button><button type="button" class="vno-btn" data-zoom="50">50%</button></div>
          <div><button type="button" class="vno-btn" data-fit="window">Vừa cửa sổ</button></div>
          <div id="vno-slides-zoom-error" role="alert" aria-live="polite" style="min-height:18px;color:#b91c1c"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="vno-btn vno-dialog-close-footer-btn">Hủy</button><button type="button" class="vno-btn vno-btn-primary" id="vno-slides-zoom-apply">Áp dụng</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#vno-slides-zoom-value");
    const error = overlay.querySelector("#vno-slides-zoom-error");
    let settled = false;
    const close = (value) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      previous?.focus?.();
      resolve(value);
    };
    const apply = () => {
      const value = Number(input.value);
      if (input.value.trim() === "" || !Number.isInteger(value) || value < SLIDES_ZOOM_MIN || value > SLIDES_ZOOM_MAX) {
        error.textContent = `Nhập số nguyên từ ${SLIDES_ZOOM_MIN} đến ${SLIDES_ZOOM_MAX}.`;
        input.focus();
        return;
      }
      close({ zoom: value });
    };
    overlay.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => { input.value = button.dataset.zoom; error.textContent = ""; input.focus(); }));
    overlay.querySelectorAll("[data-fit]").forEach((button) => button.addEventListener("click", () => close({ fit: button.dataset.fit })));
    overlay.querySelector("#vno-slides-zoom-apply").addEventListener("click", apply);
    overlay.querySelectorAll(".vno-dialog-close-btn,.vno-dialog-close-footer-btn").forEach((button) => button.addEventListener("click", () => close(null)));
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(null); }
      else if (event.key === "Enter" && event.target === input) { event.preventDefault(); apply(); }
    });
    input.focus();
    input.select();
  });
}