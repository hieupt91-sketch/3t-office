import { t } from "../../platform/i18n/i18n.js";

export function inspectSlidesDocument(adapter) {
  const slides = adapter?.canvas?.slides || [];
  const properties = adapter?.documentProperties || {};
  const categories = {
    personalInfo: Object.values(properties).filter(Boolean).length,
    comments: slides.reduce((sum, slide) => sum + (slide.comments?.length || 0), 0),
    speakerNotes: slides.filter((slide) => String(slide.notes || slide.notesText || "").trim()).length,
    hiddenSlides: slides.filter((slide) => slide.hidden).length,
    externalContent: slides.reduce((sum, slide) => sum + (slide.shapes || []).filter((shape) => /^https?:\/\//i.test(String(shape.src || shape.href || ""))).length, 0)
  };
  return Object.fromEntries(Object.entries(categories).map(([id, count]) => [id, { count, found: count > 0 }]));
}

export function removeSlidesDocumentCategory(adapter, id) {
  const slides = adapter?.canvas?.slides || [];
  if (id === "personalInfo") {
    let count = 0;
    for (const key of Object.keys(adapter.documentProperties || {})) {
      if (adapter.documentProperties[key]) { adapter.documentProperties[key] = ""; count++; }
    }
    adapter.isFinal = false;
    if (count) adapter.isDirty = true;
    return count;
  }
  if (id === "comments") {
    let count = 0;
    for (const slide of slides) { count += slide.comments?.length || 0; slide.comments = []; }
    if (count) adapter.isDirty = true;
    return count;
  }
  if (id === "speakerNotes") {
    let count = 0;
    for (const slide of slides) {
      if (String(slide.notes || slide.notesText || "").trim()) count++;
      slide.notes = ""; slide.notesText = ""; slide.notesHtml = "";
    }
    if (count) adapter.isDirty = true;
    return count;
  }
  if (id === "hiddenSlides") {
    const hidden = slides.filter((slide) => slide.hidden);
    for (const slide of hidden) slide.hidden = false;
    if (hidden.length) adapter.isDirty = true;
    return hidden.length;
  }
  if (id === "externalContent") {
    let count = 0;
    for (const slide of slides) {
      const before = slide.shapes || [];
      slide.shapes = before.filter((shape) => {
        const external = /^https?:\/\//i.test(String(shape.src || shape.href || ""));
        if (external) count++;
        return !external;
      });
    }
    if (count) adapter.isDirty = true;
    return count;
  }
  return 0;
}

const CATEGORIES = [
  ["personalInfo", "slidesInspector.personalInfo", "Thông tin tài liệu (tác giả, công ty và thuộc tính)"],
  ["comments", "slidesInspector.comments", "Nhận xét trên các trang chiếu"],
  ["speakerNotes", "slidesInspector.speakerNotes", "Ghi chú người thuyết trình"],
  ["hiddenSlides", "slidesInspector.hiddenSlides", "Trang chiếu đang ẩn"],
  ["externalContent", "slidesInspector.externalContent", "Nội dung có liên kết ngoài"],
];

export function showSlidesDocumentInspectorDialog({ adapter } = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  document.getElementById("vno-slides-inspector-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  overlay.id = "vno-slides-inspector-overlay";
  const results = inspectSlidesDocument(adapter);
  overlay.innerHTML = `<section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-slides-inspector-title" style="width:min(560px,calc(100vw - 32px));max-height:85vh;display:flex;flex-direction:column"><header class="vno-dialog-header"><strong id="vno-slides-inspector-title">${t("slidesInspector.title", "Kiểm tra bản trình bày")}</strong><button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="${t("common.close", "Đóng")}">×</button></header><div class="vno-dialog-body" style="overflow:auto;display:grid;gap:10px"><p>${t("slidesInspector.description", "Tìm thông tin cần xem lại trước khi chia sẻ. Chọn mục rồi xóa riêng từng loại.")}</p>${CATEGORIES.map(([id,key,fallback]) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid var(--vno-border-subtle);padding:8px 0"><div><strong>${t(key,fallback)}</strong><div data-count="${id}">${results[id].count} ${t("slidesInspector.items", "mục")}</div></div><button type="button" class="vno-btn" data-remove="${id}" ${results[id].count ? "" : "disabled"}>${t("slidesInspector.remove", "Xóa mục")}</button></div>`).join("")}</div><footer class="vno-dialog-footer"><button type="button" class="vno-btn" data-close>${t("common.close", "Đóng")}</button></footer></section>`;
  document.body.appendChild(overlay);
  const close = () => { document.removeEventListener("keydown", onKeyDown, true); overlay.remove(); };
  const onKeyDown = (event) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
  document.addEventListener("keydown", onKeyDown, true);
  overlay.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  overlay.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.remove;
    removeSlidesDocumentCategory(adapter, id);
    const count = inspectSlidesDocument(adapter)[id].count;
    overlay.querySelector(`[data-count="${id}"]`).textContent = `${count} ${t("slidesInspector.items", "mục")}`;
    button.disabled = count === 0;
  }));
  overlay.querySelector("[data-close]")?.focus();
  return true;
}
