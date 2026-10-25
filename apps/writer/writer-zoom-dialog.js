import { bindNumericDialogValidation } from "../../platform/ui-kit/numeric-dialog-validation.js";
import { t } from "../../platform/i18n/i18n.js";

/** Writer zoom controls for exact percentages and page fitting. */
export async function showWriterZoomDialog(currentZoom = 100) {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise(resolve => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width:420px" role="dialog" aria-modal="true" aria-labelledby="vno-writer-zoom-title">
        <div class="vno-dialog-header"><span id="vno-writer-zoom-title">Thu phóng</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" aria-label="Đóng">×</button></div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px">
          <label for="vno-writer-zoom-value" style="font-weight:600">Phần trăm (10–500%)</label>
          <div style="display:flex;gap:8px;align-items:center"><input id="vno-writer-zoom-value" type="number" min="10" max="500" step="1" value="${Math.min(500, Math.max(10, Math.round(Number(currentZoom) || 100)))}" style="width:120px;padding:7px;border:1px solid #cbd5e1;border-radius:4px"><span>%</span>
            <button type="button" class="vno-btn" data-zoom="200">200%</button><button type="button" class="vno-btn" data-zoom="100">100%</button><button type="button" class="vno-btn" data-zoom="75">75%</button></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="vno-btn" data-fit="width">Vừa chiều rộng trang</button><button type="button" class="vno-btn" data-fit="page">Vừa cả trang</button><button type="button" class="vno-btn" data-fit="multiple">Nhiều trang</button></div>
          <div id="vno-writer-zoom-error" role="alert" aria-live="polite" style="min-height:18px;color:#b91c1c"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="vno-btn vno-dialog-close-footer-btn">Hủy</button><button type="button" class="vno-btn vno-btn-primary" id="vno-writer-zoom-apply">Áp dụng</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#vno-writer-zoom-value");
    const error = overlay.querySelector("#vno-writer-zoom-error");
    const applyButton = overlay.querySelector("#vno-writer-zoom-apply");
    const validate = bindNumericDialogValidation({
      inputs: input,
      button: applyButton,
      error,
      min: 10,
      max: 500,
      integer: true,
      message: () => t("writerDialogs.zoom.invalid", { min: 10, max: 500 })
    });
    let settled = false;
    const close = value => {
      if (settled) return;
      settled = true;
      overlay.remove();
      previous?.focus?.();
      resolve(value);
    };
    overlay.querySelectorAll("[data-zoom]").forEach(button => button.addEventListener("click", () => { input.value = button.dataset.zoom; input.focus(); }));
    overlay.querySelectorAll("[data-fit]").forEach(button => button.addEventListener("click", () => close({ fit: button.dataset.fit })));
    applyButton.addEventListener("click", () => {
      const value = Number(input.value);
      if (!validate()) { input.focus(); return; }
      close({ zoom: value });
    });
    overlay.querySelectorAll(".vno-dialog-close-btn,.vno-dialog-close-footer-btn").forEach(button => button.addEventListener("click", () => close(null)));
    overlay.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); close(null); } });
    input.focus(); input.select();
  });
}
