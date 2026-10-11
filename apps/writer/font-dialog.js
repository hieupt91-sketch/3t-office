/** Hộp thoại Phông chữ kiểu Writer, dùng được với chuột và bàn phím. */

const FONT_FAMILIES = ["Times New Roman", "Arial", "Calibri", "Be Vietnam Pro", "Roboto", "Georgia"];

export function showFontDialog({
  initialSize = 14,
  initialFamily = "Times New Roman",
  initialColor = "#000000",
  initialBold = false,
  initialItalic = false,
  initialUnderline = false,
  onApply = () => {}
} = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  document.getElementById("vno-font-dialog-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  overlay.id = "vno-font-dialog-overlay";
  overlay.innerHTML = `
    <section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-font-dialog-title" style="width:min(480px, calc(100vw - 32px))">
      <header class="vno-dialog-header"><strong id="vno-font-dialog-title">Phông chữ</strong><button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="Đóng">×</button></header>
      <div class="vno-dialog-body" style="display:grid;grid-template-columns:1fr 110px;gap:14px">
        <label>Phông chữ<select data-family class="vno-dialog-input" style="display:block;width:100%;margin-top:5px">${FONT_FAMILIES.map(font => `<option${font === initialFamily ? " selected" : ""}>${font}</option>`).join("")}</select></label>
        <label>Cỡ chữ (pt)<input data-size class="vno-dialog-input" type="number" min="1" max="400" step="0.5" value="${Number(initialSize) || 14}" style="display:block;width:100%;margin-top:5px"></label>
        <label style="grid-column:1/-1">Màu chữ<input data-color type="color" value="${initialColor}" style="display:block;margin-top:5px;width:64px;height:32px"></label>
        <fieldset style="grid-column:1/-1;border:1px solid var(--vno-border-default);border-radius:6px;padding:10px;display:flex;gap:18px"><legend>Kiểu chữ</legend>
          <label><input data-bold type="checkbox"${initialBold ? " checked" : ""}> Đậm</label><label><input data-italic type="checkbox"${initialItalic ? " checked" : ""}> Nghiêng</label><label><input data-underline type="checkbox"${initialUnderline ? " checked" : ""}> Gạch chân</label>
        </fieldset>
      </div>
      <footer class="vno-dialog-footer"><button type="button" class="vno-btn" data-close>Hủy</button><button type="button" class="vno-btn vno-btn-primary" data-apply>Áp dụng</button></footer>
    </section>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", close));
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); close(); } });
  const family = overlay.querySelector("[data-family]");
  const applyButton = overlay.querySelector("[data-apply]");
  applyButton.addEventListener("click", () => {
    const size = Number(overlay.querySelector("[data-size]").value);
    if (!Number.isFinite(size) || size < 1 || size > 400) {
      overlay.querySelector("[data-size]").focus();
      return;
    }
    onApply({
      fontFamily: family.value,
      fontSize: size,
      color: overlay.querySelector("[data-color]").value,
      bold: overlay.querySelector("[data-bold]").checked,
      italic: overlay.querySelector("[data-italic]").checked,
      underline: overlay.querySelector("[data-underline]").checked
    });
    close();
  });
  family.focus();
  return true;
}
