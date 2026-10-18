/**
 * Thư viện hình dạng của VN Sheet (Chèn > Minh họa > Hình dạng): lưới hình dựng sẵn dùng chung với Slides/Writer.
 * Trả về Promise<{ shapeType } | null>.
 */
import { SHAPE_PRESETS } from "../../platform/shapes/shape-presets.js";

const BASIC = [
  { id: "rectangle", label: "Hình chữ nhật", path: "M0 0 L100 0 L100 100 L0 100 Z" },
  { id: "ellipse", label: "Hình elip", path: "M50 0 C78 0 100 22 100 50 C100 78 78 100 50 100 C22 100 0 78 0 50 C0 22 22 0 50 0 Z" }
];

export function sheetShapeChoices() {
  return [...BASIC, ...SHAPE_PRESETS.map(item => ({ id: item.id, label: item.label, path: item.path || "M8 0 L92 0 Q100 0 100 8 L100 92 Q100 100 92 100 L8 100 Q0 100 0 92 L0 8 Q0 0 8 0 Z" }))];
}

export function showShapeGalleryDialog() {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "shape-gallery";
    const box = document.createElement("div");
    box.className = "vno-dialog-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "vno-shape-gallery-title");
    box.style.cssText = "width:460px;max-width:calc(100vw - 32px);";
    box.innerHTML = `
      <div class="vno-dialog-header"><span id="vno-shape-gallery-title">Chèn hình dạng</span>
        <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" aria-label="Đóng">&times;</button></div>
      <div class="vno-dialog-body" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;">
        <p style="margin:0;font-size:12px;color:var(--vno-text-secondary,#475569);">Chọn một hình rồi nhấn Chèn (hoặc nhấn đúp hình). Hình được đặt tại ô đang chọn; sau đó có thể kéo, đổi cỡ, tô màu bằng chuột phải.</p>
        <div class="vno-shape-gallery-grid" role="listbox" aria-label="Danh sách hình dạng" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;"></div>
        <div class="vno-shape-gallery-name" aria-live="polite" style="min-height:18px;font-size:12px;font-weight:600;"></div>
      </div>
      <div class="vno-dialog-footer"><button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button><button type="button" class="vno-btn vno-btn-primary vno-dialog-insert-btn">Chèn</button></div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const grid = box.querySelector(".vno-shape-gallery-grid");
    const nameEl = box.querySelector(".vno-shape-gallery-name");
    const choices = sheetShapeChoices();
    let selected = choices[0].id;
    const ns = "http://www.w3.org/2000/svg";
    const buttons = choices.map((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vno-btn vno-shape-gallery-item";
      button.setAttribute("role", "option");
      button.setAttribute("aria-label", choice.label);
      button.title = choice.label;
      button.dataset.shapeType = choice.id;
      button.style.cssText = "height:52px;display:flex;align-items:center;justify-content:center;padding:6px;";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "-4 -4 108 108");
      svg.setAttribute("width", "34");
      svg.setAttribute("height", "34");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", choice.path);
      path.setAttribute("fill", "#3b82f6");
      path.setAttribute("stroke", "#1d4ed8");
      path.setAttribute("stroke-width", "4");
      svg.appendChild(path);
      button.appendChild(svg);
      button.addEventListener("click", () => select(choice.id));
      button.addEventListener("dblclick", () => { select(choice.id); done({ shapeType: choice.id }); });
      grid.appendChild(button);
      return button;
    });
    const select = (id) => {
      selected = id;
      buttons.forEach((button) => {
        const on = button.dataset.shapeType === id;
        button.setAttribute("aria-selected", on ? "true" : "false");
        button.style.outline = on ? "2px solid #2563eb" : "";
        button.tabIndex = on ? 0 : -1;
      });
      nameEl.textContent = choices.find(item => item.id === id)?.label || "";
    };
    const done = (value) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      previous?.focus?.();
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); done(null); return; }
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key) && box.contains(document.activeElement) && document.activeElement.dataset?.shapeType) {
        event.preventDefault();
        const index = choices.findIndex(item => item.id === selected);
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 6 : -6;
        const next = choices[Math.max(0, Math.min(choices.length - 1, index + step))];
        select(next.id);
        buttons.find(button => button.dataset.shapeType === next.id)?.focus();
      } else if (event.key === "Enter" && !(document.activeElement instanceof HTMLButtonElement && !document.activeElement.dataset.shapeType)) {
        event.preventDefault();
        done({ shapeType: selected });
      }
    };
    document.addEventListener("keydown", onKey, true);
    box.querySelector(".vno-dialog-insert-btn").addEventListener("click", () => done({ shapeType: selected }));
    box.querySelector(".vno-dialog-cancel-btn").addEventListener("click", () => done(null));
    box.querySelector(".vno-dialog-close-btn").addEventListener("click", () => done(null));
    overlay.addEventListener("click", (event) => { if (event.target === overlay) done(null); });
    select(selected);
    buttons[0].focus();
  });
}
