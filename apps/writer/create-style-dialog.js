import { t } from "../../platform/i18n/i18n.js";

const tr = (key, fallback) => { const value = t(key); return value && value !== key ? value : fallback; };

export function showCreateParagraphStyleDialog({ existingStyles = [], initial = {}, onCreate, onClose } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "vno-create-style-overlay";
  overlay.setAttribute("role", "presentation");
  const title = tr("writerStyles.createTitle", "Tạo kiểu mới từ vùng chọn");
  overlay.innerHTML = `<section class="vno-create-style-dialog" role="dialog" aria-modal="true" aria-label="${title}">
    <header><strong>${title}</strong><button type="button" data-close aria-label="${tr("common.close", "Đóng")}">×</button></header>
    <form>
      <label>${tr("writerStyles.name", "Tên") }<input name="name" required maxlength="80" autocomplete="off"></label>
      <label>${tr("writerStyles.basedOn", "Dựa trên") }<select name="basedOn"></select></label>
      <label>${tr("writerStyles.next", "Kiểu đoạn kế tiếp") }<select name="next"></select></label>
      <div class="vno-create-style-grid">
        <label>${tr("writerStyles.font", "Phông") }<input name="font" value="Arial" required maxlength="80"></label>
        <label>${tr("writerStyles.size", "Cỡ") }<input name="size" type="number" min="1" max="200" step="0.5" value="13" required></label>
      </div>
      <div class="vno-create-style-grid">
        <label class="vno-create-style-check"><input name="bold" type="checkbox">${tr("writerStyles.bold", "Đậm")}</label>
        <label class="vno-create-style-check"><input name="italic" type="checkbox">${tr("writerStyles.italic", "Nghiêng")}</label>
        <label>${tr("writerStyles.color", "Màu") }<input name="color" type="color" value="#1f2937"></label>
        <label>${tr("writerStyles.alignment", "Căn lề") }<select name="alignment"><option value="left">${tr("writerStyles.left", "Trái")}</option><option value="center">${tr("writerStyles.center", "Giữa")}</option><option value="right">${tr("writerStyles.right", "Phải")}</option><option value="justify">${tr("writerStyles.justify", "Đều")}</option></select></label>
      </div>
      <div class="vno-create-style-grid">
        <label>${tr("writerStyles.spaceAfter", "Sau đoạn (pt)")}<input name="spaceAfter" type="number" min="0" max="200" step="0.5" value="12"></label>
        <label>${tr("writerStyles.lineSpacing", "Giãn dòng") }<select name="lineSpacing"><option value="1">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2">2.0</option></select></label>
      </div>
      <div class="vno-create-style-grid">
        <label>${tr("writerStyles.leftIndent", "Thụt lề trái (pt)")}<input name="leftIndent" type="number" min="0" max="500" step="0.5" value="0"></label>
        <label>${tr("writerStyles.firstLineIndent", "Thụt dòng đầu (pt)")}<input name="firstLineIndent" type="number" min="-500" max="500" step="0.5" value="0"></label>
      </div>
      <p class="vno-create-style-error" role="alert" hidden></p>
      <footer><button type="button" data-cancel>${tr("common.cancel", "Hủy")}</button><button type="submit">${tr("writerStyles.createApply", "Tạo và áp dụng")}</button></footer>
    </form></section>`;
  const form = overlay.querySelector("form");
  const baseSelect = form.elements.basedOn;
  const nextSelect = form.elements.next;
  const styles = [{ id: "Normal", name: tr("writerStyles.normal", "Thường") }, ...existingStyles.filter((style) => style.id !== "Normal")];
  for (const select of [baseSelect, nextSelect]) {
    for (const style of styles) {
      const option = document.createElement("option"); option.value = style.id; option.textContent = style.name; select.appendChild(option);
    }
  }
  baseSelect.value = "Normal";
  nextSelect.value = "Normal";
  for (const key of ["font", "size", "alignment", "spaceAfter", "leftIndent", "firstLineIndent"]) {
    if (initial[key] !== undefined && initial[key] !== "" && form.elements[key]) form.elements[key].value = initial[key];
  }
  form.elements.bold.checked = Boolean(initial.bold);
  form.elements.italic.checked = Boolean(initial.italic);
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); onClose?.(); };
  overlay.querySelector("[data-close]").addEventListener("click", close);
  overlay.querySelector("[data-cancel]").addEventListener("click", close);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  overlay.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); close(); } });
  form.elements.name.focus();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    values.bold = form.elements.bold.checked;
    values.italic = form.elements.italic.checked;
    values.size = Number(values.size);
    values.spaceAfter = Number(values.spaceAfter);
    values.lineSpacing = Number(values.lineSpacing);
    values.leftIndent = Number(values.leftIndent);
    values.firstLineIndent = Number(values.firstLineIndent);
    if (existingStyles.some((style) => style.name.toLocaleLowerCase() === values.name.trim().toLocaleLowerCase())) {
      const error = overlay.querySelector(".vno-create-style-error");
      error.textContent = tr("writerStyles.duplicate", "Đã có kiểu cùng tên. Hãy chọn tên khác.");
      error.hidden = false;
      form.elements.name.focus();
      return;
    }
    onCreate?.(values);
    close();
  });
  return overlay;
}
