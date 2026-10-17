import { STYLE_PRESETS } from "./style-gallery.js";
import { t } from "../../platform/i18n/i18n.js";

let activePane = null;
let activeEscapeHandler = null;

const text = (key, fallback) => {
  const value = t(key);
  return value && value !== key ? value : fallback;
};

export function closeWriterStylesPane() {
  if (activeEscapeHandler) document.removeEventListener("keydown", activeEscapeHandler, true);
  activeEscapeHandler = null;
  activePane?.remove();
  activePane = null;
}

export function toggleWriterStylesPane(options = {}) {
  if (activePane?.isConnected) {
    closeWriterStylesPane();
    return null;
  }
  closeWriterStylesPane();
  const pane = document.createElement("aside");
  activePane = pane;
  pane.className = "vno-writer-styles-pane";
  pane.setAttribute("role", "complementary");
  pane.setAttribute("aria-label", text("writerStyles.paneTitle", "Kiểu"));
  pane.innerHTML = `<header><strong>${text("writerStyles.paneTitle", "Kiểu")}</strong><button type="button" data-close aria-label="${text("common.close", "Đóng")}" title="${text("common.close", "Đóng")}">×</button></header>
    <p>${text("writerStyles.paneHint", "Chọn một kiểu để áp dụng cho đoạn hiện tại.")}</p>
    <button type="button" class="vno-writer-style-create" data-create>${text("writerStyles.create", "Tạo kiểu mới…")}</button>
    <div class="vno-writer-styles-list" role="listbox" tabindex="0"></div>`;
  const list = pane.querySelector(".vno-writer-styles-list");
  const close = () => { closeWriterStylesPane(); options.onClose?.(); };
  pane.querySelector("[data-close]").addEventListener("click", close);
  pane.querySelector("[data-create]").addEventListener("click", () => options.onCreate?.());
  pane.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const rows = [...list.querySelectorAll("[role=option]")];
    const index = rows.indexOf(document.activeElement);
    const next = rows[Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))];
    if (next) { event.preventDefault(); next.focus(); }
  });
  const workspace = options.workspace || document.querySelector(".vno-writer-workspace") || document.body;
  workspace.appendChild(pane);
  activeEscapeHandler = (event) => {
    if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  };
  document.addEventListener("keydown", activeEscapeHandler, true);
  pane.refresh = (items, currentId) => {
    list.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "vno-writer-styles-empty";
      empty.textContent = text("writerStyles.empty", "Tài liệu chưa có kiểu đoạn văn.");
      list.appendChild(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "vno-writer-style-row";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(String(item.id) === String(currentId)));
      row.dataset.styleId = String(item.id);
      row.textContent = item.name;
      row.title = item.description || item.name;
      row.addEventListener("click", () => options.onApply?.(item.id));
      list.appendChild(row);
    }
  };
  pane.refresh(options.items || STYLE_PRESETS.map((style) => ({ id: style.id, name: style.label, description: style.description })), options.currentId);
  pane.focus = () => list.querySelector('[aria-selected="true"]')?.focus() || list.querySelector("[role=option]")?.focus();
  pane.focus();
  return pane;
}
