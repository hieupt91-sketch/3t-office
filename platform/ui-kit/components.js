/**
 * VN Office UI Kit — Precision Component Factory
 * Đảm bảo 100% nút Ribbon đều có Icon Vector sắc nét
 */

import { ICONS } from "./icons.js";
import { globalCommandBus } from "../commands/command-bus.js";

/**
 * Tự động tìm kiếm Icon phù hợp theo Command ID
 */
function resolveIcon(commandId, iconName) {
  if (iconName && ICONS[iconName]) return ICONS[iconName];

  // Auto fallback theo từ khóa trong commandId
  const idLower = commandId.toLowerCase();
  if (idLower.includes("bold")) return ICONS.bold;
  if (idLower.includes("italic")) return ICONS.italic;
  if (idLower.includes("underline")) return ICONS.underline;
  if (idLower.includes("strike")) return ICONS.strike;
  if (idLower.includes("clearformat")) return ICONS.clearFormat;
  if (idLower.includes("cut")) return ICONS.cut;
  if (idLower.includes("copy")) return ICONS.copy;
  if (idLower.includes("paste")) return ICONS.paste;
  if (idLower.includes("formatpainter")) return ICONS.formatPainter;
  if (idLower.includes("alignleft")) return ICONS.alignLeft;
  if (idLower.includes("aligncenter")) return ICONS.alignCenter;
  if (idLower.includes("alignright")) return ICONS.alignRight;
  if (idLower.includes("justify")) return ICONS.alignJustify;
  if (idLower.includes("bullet")) return ICONS.listBullet;
  if (idLower.includes("numbered") || idLower.includes("number")) return ICONS.listNumber;
  if (idLower.includes("indentinc")) return ICONS.indentInc;
  if (idLower.includes("indentdec")) return ICONS.indentDec;
  if (idLower.includes("table")) return ICONS.table;
  if (idLower.includes("image")) return ICONS.image;
  if (idLower.includes("page.break")) return ICONS.pageBreak;
  if (idLower.includes("header") || idLower.includes("footer")) return ICONS.headerFooter;
  if (idLower.includes("margins")) return ICONS.margins;
  if (idLower.includes("orientation")) return ICONS.orientation;
  if (idLower.includes("merge")) return ICONS.mergeCells;
  if (idLower.includes("currency")) return ICONS.currencyVND;
  if (idLower.includes("sum")) return ICONS.autoSum;
  if (idLower.includes("average")) return ICONS.autoSum;
  if (idLower.includes("sortasc")) return ICONS.sortAsc;
  if (idLower.includes("sortdesc")) return ICONS.sortDesc;
  if (idLower.includes("filter")) return ICONS.filter;
  if (idLower.includes("slidenew") || idLower.includes("slide.new")) return ICONS.slideNew;
  if (idLower.includes("slideshow") || idLower.includes("show.start")) return ICONS.slidePlay;
  if (idLower.includes("shape")) return ICONS.shape;
  if (idLower.includes("text.insert")) return ICONS.textBox;
  if (idLower.includes("color.text")) return ICONS.colorText;
  if (idLower.includes("color.highlight") || idLower.includes("fillcolor")) return ICONS.colorHighlight;
  if (idLower.includes("save")) return ICONS.fileSave;
  if (idLower.includes("open")) return ICONS.fileOpen;
  if (idLower.includes("new")) return ICONS.fileNew;
  if (idLower.includes("print")) return ICONS.filePrint;
  if (idLower.includes("ai")) return ICONS.aiSparkle;

  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>`;
}

/**
 * Tạo nút Ribbon Button với Icon chuẩn hóa
 */
export function createCommandButton({ commandId, isLarge = false, iconOnly = false, customIcon, customLabel }) {
  const btn = document.createElement("button");
  btn.setAttribute("type", "button");

  const def = globalCommandBus.getDefinition(commandId);
  const state = globalCommandBus.getState(commandId);

  const label = customLabel || (state ? state.label : (def ? def.label : commandId));
  const iconKey = customIcon || (state && state.icon ? state.icon : (def && def.icon ? def.icon : ""));
  const iconSvg = resolveIcon(commandId, iconKey);
  const shortcut = state ? state.shortcut : (def ? def.shortcut : "");

  // Thiết lập class & nội dung theo kích cỡ
  if (isLarge) {
    btn.className = "vno-btn vno-ribbon-btn-large";
    btn.innerHTML = `
      <span class="vno-btn-icon">${iconSvg}</span>
      <span class="vno-btn-label">${label}</span>
    `;
  } else if (iconOnly) {
    btn.className = "vno-btn vno-ribbon-btn-small vno-btn-icon-only";
    btn.innerHTML = `<span class="vno-btn-icon">${iconSvg}</span>`;
  } else {
    btn.className = "vno-btn vno-ribbon-btn-small";
    btn.innerHTML = `
      <span class="vno-btn-icon">${iconSvg}</span>
      <span class="vno-btn-label">${label}</span>
    `;
  }

  // Tooltip phong phú
  btn.title = shortcut ? `${label} (${shortcut})` : label;

  if (state) {
    if (!state.enabled) btn.disabled = true;
    if (state.checked) btn.classList.add("is-checked");
  }

  // Click handler
  btn.addEventListener("click", () => {
    globalCommandBus.execute(commandId);
  });

  // Lắng nghe thay đổi trạng thái
  globalCommandBus.subscribe((updatedId, newState) => {
    if (updatedId === commandId) {
      btn.disabled = !newState.enabled;
      if (newState.checked) {
        btn.classList.add("is-checked");
      } else {
        btn.classList.remove("is-checked");
      }
      if (newState.label && !iconOnly) {
        const labelSpan = btn.querySelector(".vno-btn-label");
        if (labelSpan) labelSpan.textContent = newState.label;
      }
    }
  });

  return btn;
}

export function createSelect({ commandId, options, defaultValue, onChange }) {
  const select = document.createElement("select");
  select.className = "vno-select";

  options.forEach(opt => {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === defaultValue) el.selected = true;
    select.appendChild(el);
  });

  select.addEventListener("change", (e) => {
    const val = e.target.value;
    if (commandId) globalCommandBus.execute(commandId, val);
    if (onChange) onChange(val);
  });

  return select;
}

/**
 * Tạo component Trạng thái rỗng (EmptyState) chuẩn UI Kit Rules (03-ui-ux/UI-KIT-RULES.md)
 */
export function createEmptyState({
  icon = "📄",
  title = "Chưa có dữ liệu",
  description = "Không có mục nào để hiển thị vào lúc này.",
  actionText = null,
  onAction = null
}) {
  const container = document.createElement("div");
  container.className = "vno-empty-state";
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 20px;
    text-align: center;
    background: #fafafa;
    border: 1px dashed var(--vno-border-default);
    border-radius: var(--vno-radius-md);
  `;

  container.innerHTML = `
    <div style="font-size: 36px; margin-bottom: 12px; color: var(--vno-text-muted);">${icon}</div>
    <div style="font-size: 14px; font-weight: 700; color: var(--vno-text-primary); margin-bottom: 6px;">${title}</div>
    <div style="font-size: 12px; color: var(--vno-text-muted); max-width: 340px; line-height: 1.5; margin-bottom: ${actionText ? "16px" : "0"};">${description}</div>
    ${actionText ? `<button class="vno-btn vno-btn-primary vno-empty-action-btn" style="font-size: 12px; padding: 6px 14px;">${actionText}</button>` : ""}
  `;

  if (actionText && onAction) {
    container.querySelector(".vno-empty-action-btn").addEventListener("click", onAction);
  }

  return container;
}

