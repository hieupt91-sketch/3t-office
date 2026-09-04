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
  if (commandId) btn.setAttribute("data-command-id", commandId);

  const def = globalCommandBus.getDefinition(commandId);
  const state = globalCommandBus.getState(commandId);

  const label = customLabel || (state ? state.label : (def ? def.label : commandId));
  const iconKey = customIcon || (state && state.icon ? state.icon : (def && def.icon ? def.icon : ""));
  const iconSvg = resolveIcon(commandId, iconKey);
  const shortcut = state ? state.shortcut : (def ? def.shortcut : "");
  const accessibleName = shortcut ? `${label} (${shortcut})` : label;

  btn.setAttribute("aria-label", accessibleName);

  // Thiết lập class & nội dung theo kích cỡ
  if (isLarge) {
    btn.className = "vno-btn vno-ribbon-btn-large";
    btn.innerHTML = `
      <span class="vno-btn-icon" aria-hidden="true">${iconSvg}</span>
      <span class="vno-btn-label">${label}</span>
    `;
  } else if (iconOnly) {
    btn.className = "vno-btn vno-ribbon-btn-small vno-btn-icon-only";
    btn.innerHTML = `<span class="vno-btn-icon" aria-hidden="true">${iconSvg}</span>`;
  } else {
    btn.className = "vno-btn vno-ribbon-btn-small";
    btn.innerHTML = `
      <span class="vno-btn-icon" aria-hidden="true">${iconSvg}</span>
      <span class="vno-btn-label">${label}</span>
    `;
  }

  // Tooltip phong phú
  btn.title = accessibleName;

  if (state) {
    if (!state.enabled) btn.disabled = true;
    if (state.checked) {
      btn.classList.add("is-checked");
      btn.setAttribute("aria-pressed", "true");
    } else if (typeof state.checked === "boolean") {
      btn.setAttribute("aria-pressed", "false");
    }
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
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("is-checked");
        if (typeof newState.checked === "boolean") {
          btn.setAttribute("aria-pressed", "false");
        }
      }
      const currentShortcut = newState.shortcut || shortcut;
      const currentLabel = newState.label || label;
      const newAccName = currentShortcut ? `${currentLabel} (${currentShortcut})` : currentLabel;
      btn.setAttribute("aria-label", newAccName);
      btn.title = newAccName;
      if (newState.label && !iconOnly) {
        const labelSpan = btn.querySelector(".vno-btn-label");
        if (labelSpan) labelSpan.textContent = newState.label;
      }
    }
  });

  return btn;
}

export function createSelect({ commandId, options, defaultValue, onChange, ariaLabel }) {
  const select = document.createElement("select");
  select.className = "vno-select";
  if (commandId) select.setAttribute("data-command-id", commandId);

  const def = commandId ? globalCommandBus.getDefinition(commandId) : null;
  const selectLabel = ariaLabel || (def ? def.label : commandId) || "Tùy chọn";
  select.setAttribute("aria-label", selectLabel);

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
    <div style="font-size: 36px; margin-bottom: 12px; color: var(--vno-text-muted);" aria-hidden="true">${icon}</div>
    <div style="font-size: 14px; font-weight: 700; color: var(--vno-text-primary); margin-bottom: 6px;">${title}</div>
    <div style="font-size: 12px; color: var(--vno-text-muted); max-width: 340px; line-height: 1.5; margin-bottom: ${actionText ? "16px" : "0"};">${description}</div>
    ${actionText ? `<button class="vno-btn vno-btn-primary vno-empty-action-btn" style="font-size: 12px; padding: 6px 14px;">${actionText}</button>` : ""}
  `;

  if (actionText && onAction) {
    container.querySelector(".vno-empty-action-btn").addEventListener("click", onAction);
  }

  return container;
}

/**
 * Tạo Popup Gợi ý Tự động Hoàn thành Công thức (Formula Autocomplete Popup)
 * @param {Object} [options]
 * @param {Function} [options.onSelect] (item) => void
 */
export function createAutocompletePopup({ onSelect } = {}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return {
      element: null,
      show: () => {},
      hide: () => {},
      reposition: () => {},
      setActiveIndex: () => {},
      getActiveIndex: () => -1,
      getActiveItem: () => null,
      isVisible: () => false,
      destroy: () => {}
    };
  }

  const el = document.createElement("div");
  el.className = "vno-autocomplete-popup";
  el.setAttribute("role", "listbox");
  el.setAttribute("aria-label", "Gợi ý công thức");
  el.style.display = "none";
  document.body.appendChild(el);

  let currentItems = [];
  let currentIndex = 0;
  let visible = false;

  const updateActiveHighlight = () => {
    const rows = el.querySelectorAll(".vno-autocomplete-item");
    rows.forEach((row, idx) => {
      const isActive = idx === currentIndex;
      row.setAttribute("aria-selected", String(isActive));
      if (isActive) {
        row.classList.add("is-active");
        if (typeof row.scrollIntoView === "function") {
          row.scrollIntoView({ block: "nearest" });
        }
      } else {
        row.classList.remove("is-active");
      }
    });
  };

  const render = () => {
    el.innerHTML = "";
    if (currentItems.length === 0) {
      el.style.display = "none";
      visible = false;
      return;
    }

    currentItems.forEach((item, idx) => {
      const row = document.createElement("div");
      const isActive = idx === currentIndex;
      row.className = `vno-autocomplete-item ${isActive ? "is-active" : ""}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(isActive));
      row.id = `vno-ac-item-${idx}`;
      row.innerHTML = `
        <div class="vno-ac-left">
          <span class="vno-ac-fx" aria-hidden="true">fx</span>
          <span class="vno-ac-name">${item.name}</span>
        </div>
        <span class="vno-ac-cat">${item.category || ""}</span>
      `;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        currentIndex = idx;
        if (onSelect) onSelect(item);
      });
      row.addEventListener("mouseenter", () => {
        currentIndex = idx;
        updateActiveHighlight();
      });
      el.appendChild(row);
    });
  };

  const positionAt = (targetEl) => {
    if (!targetEl || typeof targetEl.getBoundingClientRect !== "function") return;
    const rect = targetEl.getBoundingClientRect();
    const popupHeight = el.offsetHeight || 180;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top = rect.bottom + 2;
    if (spaceBelow < popupHeight && rect.top > popupHeight) {
      top = rect.top - popupHeight - 2;
    }

    let left = rect.left;
    if (left + 260 > window.innerWidth) {
      left = Math.max(10, window.innerWidth - 270);
    }

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.minWidth = `${Math.max(220, rect.width)}px`;
  };

  return {
    element: el,
    show({ items, targetEl, activeIndex = 0 }) {
      currentItems = items || [];
      currentIndex = Math.max(0, Math.min(activeIndex, currentItems.length - 1));
      if (currentItems.length === 0) {
        this.hide();
        return;
      }
      el.style.display = "block";
      visible = true;
      render();
      positionAt(targetEl);
    },
    hide() {
      el.style.display = "none";
      visible = false;
    },
    reposition(targetEl) {
      if (visible && targetEl) positionAt(targetEl);
    },
    setActiveIndex(idx) {
      if (currentItems.length === 0) return;
      if (idx < 0) currentIndex = currentItems.length - 1;
      else if (idx >= currentItems.length) currentIndex = 0;
      else currentIndex = idx;
      updateActiveHighlight();
    },
    getActiveIndex() {
      return currentIndex;
    },
    getActiveItem() {
      return currentItems[currentIndex] || null;
    },
    isVisible() {
      return visible;
    },
    destroy() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}

/**
 * Tạo Tooltip Hướng dẫn Cú pháp Tham số Hàm (Formula Syntax Tooltip)
 */
export function createSyntaxTooltip() {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return {
      element: null,
      show: () => {},
      hide: () => {},
      update: () => {},
      reposition: () => {},
      isVisible: () => false,
      destroy: () => {}
    };
  }

  const el = document.createElement("div");
  el.className = "vno-syntax-tooltip";
  el.setAttribute("role", "tooltip");
  el.setAttribute("aria-live", "polite");
  el.style.display = "none";
  document.body.appendChild(el);

  let visible = false;

  const positionAt = (targetEl) => {
    if (!targetEl || typeof targetEl.getBoundingClientRect !== "function") return;
    const rect = targetEl.getBoundingClientRect();
    const tooltipHeight = el.offsetHeight || 40;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top = rect.bottom + 2;
    if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
      top = rect.top - tooltipHeight - 2;
    }

    let left = rect.left;
    if (left + 360 > window.innerWidth) {
      left = Math.max(10, window.innerWidth - 370);
    }

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  };

  return {
    element: el,
    show({ html, desc, targetEl }) {
      this.update({ html, desc });
      el.style.display = "block";
      visible = true;
      positionAt(targetEl);
    },
    update({ html, desc, targetEl }) {
      let content = `<div class="vno-syntax-content">${html}</div>`;
      if (desc) {
        content += `<div class="vno-syntax-desc">${desc}</div>`;
      }
      el.innerHTML = content;
      if (targetEl) positionAt(targetEl);
    },
    hide() {
      el.style.display = "none";
      visible = false;
    },
    reposition(targetEl) {
      if (visible && targetEl) positionAt(targetEl);
    },
    isVisible() {
      return visible;
    },
    destroy() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}


