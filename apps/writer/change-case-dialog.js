/**
 * Hộp thoại Đổi chữ hoa / thường (Change Case) kiểu Writer.
 * Hỗ trợ 5 kiểu chuẩn:
 * - Sentence case (Chữ hoa đầu câu)
 * - lowercase (chữ thường)
 * - UPPERCASE (CHỮ HOA)
 * - Capitalize Each Word (Viết Hoa Mỗi Từ)
 * - tOGGLE cASE (bẬT/tẮT hOA tHƯỜNG)
 * Tương thích trọn vẹn chữ có dấu tiếng Việt.
 */

export const CHANGE_CASE_OPTIONS = [
  { id: "sentence", label: "Chữ hoa đầu câu (Sentence case.)", value: "sentence" },
  { id: "lowercase", label: "chữ thường (lowercase)", value: "lowercase" },
  { id: "uppercase", label: "CHỮ HOA (UPPERCASE)", value: "uppercase" },
  { id: "capitalize", label: "Viết Hoa Mỗi Từ (Title case)", value: "capitalize" },
  { id: "toggle", label: "bẬT/tẮT hOA tHƯỜNG (tOGGLE cASE)", value: "toggle" }
];

export function showChangeCaseDialog({
  initialCase = "sentence",
  onApply = () => {}
} = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  document.getElementById("vno-change-case-dialog-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-change-case-dialog";
  overlay.id = "vno-change-case-dialog-overlay";
  overlay.innerHTML = `
    <section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-change-case-title" style="width:min(440px, calc(100vw - 32px))">
      <header class="vno-dialog-header">
        <strong id="vno-change-case-title">Đổi chữ hoa / thường</strong>
        <button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="Đóng">×</button>
      </header>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px;padding:16px 20px">
        <fieldset style="border:1px solid var(--vno-border-default, #cbd5e1);border-radius:6px;padding:12px 16px;display:flex;flex-direction:column;gap:10px;margin:0">
          <legend style="padding:0 6px;font-size:12px;font-weight:600;color:var(--vno-text-muted, #64748b)">Chọn kiểu đổi chữ</legend>
          ${CHANGE_CASE_OPTIONS.map(opt => `
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:var(--vno-text-main, #1e293b)">
              <input type="radio" name="vno-change-case-mode" value="${opt.value}" ${opt.value === initialCase ? "checked" : ""} style="cursor:pointer;margin:0">
              <span>${opt.label}</span>
            </label>
          `).join("")}
        </fieldset>
      </div>
      <footer class="vno-dialog-footer">
        <button type="button" class="vno-btn" data-close>Hủy</button>
        <button type="button" class="vno-btn vno-btn-primary" data-apply>Áp dụng</button>
      </footer>
    </section>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", close));
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
  });

  const apply = () => {
    const checked = overlay.querySelector('input[name="vno-change-case-mode"]:checked');
    const selectedMode = checked ? checked.value : "sentence";
    onApply(selectedMode);
    close();
  };

  const applyButton = overlay.querySelector("[data-apply]");
  applyButton.addEventListener("click", apply);

  const checkedInput = overlay.querySelector('input[name="vno-change-case-mode"]:checked');
  if (checkedInput) {
    checkedInput.focus();
  } else {
    overlay.querySelector("input")?.focus();
  }

  return true;
}
