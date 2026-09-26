/**
 * VN Office UI Kit — Precision Component Factory
 * Đảm bảo 100% nút Ribbon đều có Icon Vector sắc nét
 */

import { ICONS } from "./icons.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { t } from "../i18n/i18n.js";

/**
 * Tự động tìm kiếm Icon phù hợp theo Command ID
 */
function resolveIcon(commandId, iconName) {
  if (iconName && ICONS[iconName]) return ICONS[iconName];

  // Auto fallback theo từ khóa trong commandId
  const idLower = (commandId || "").toLowerCase();
  if (idLower.includes("bold")) return ICONS.bold;
  if (idLower.includes("italic")) return ICONS.italic;
  if (idLower.includes("underline")) return ICONS.underline;
  if (idLower.includes("strike")) return ICONS.strike;
  if (idLower.includes("clearformat")) return ICONS.clearFormat;
  if (idLower.includes("clearall")) return ICONS.clearAll;
  if (idLower.includes("clearcontents")) return ICONS.clearContents;
  if (idLower.includes("clear")) return ICONS.clearAll || ICONS.clearFormat;
  if (idLower.includes("filldown")) return ICONS.fillDown;
  if (idLower.includes("fillright")) return ICONS.fillRight;
  if (idLower.includes("fill")) return ICONS.fillDown;
  if (idLower.includes("cut")) return ICONS.cut;
  if (idLower.includes("copy")) return ICONS.copy;
  if (idLower.includes("paste")) return ICONS.paste;
  if (idLower.includes("formatpainter")) return ICONS.formatPainter;
  if (idLower.includes("alignleft")) return ICONS.alignLeft;
  if (idLower.includes("aligncenter")) return ICONS.alignCenter;
  if (idLower.includes("alignright")) return ICONS.alignRight;
  if (idLower.includes("justify")) return ICONS.alignJustify;
  if (idLower.includes("bullet")) return ICONS.listBullet;
  if (idLower.includes("multilevel")) return ICONS.listMultilevel;
  if (idLower.includes("numbered") || idLower.includes("number")) return ICONS.listNumber;
  if (idLower.includes("indentinc")) return ICONS.indentInc;
  if (idLower.includes("indentdec")) return ICONS.indentDec;
  if (idLower.includes("table")) return ICONS.table;
  if (idLower.includes("image")) return ICONS.image;
  if (idLower.includes("page.break")) return ICONS.pageBreak;
  if (idLower.includes("header") && idLower.includes("footer")) return ICONS.headerFooter;
  if (idLower.includes("header")) return ICONS.header || ICONS.headerFooter;
  if (idLower.includes("footer")) return ICONS.footer || ICONS.headerFooter;
  if (idLower.includes("margins")) return ICONS.margins;
  if (idLower.includes("orientation")) return ICONS.orientation;
  if (idLower.includes("page.size") || idLower.includes("pagesize")) return ICONS.pageSize;
  if (idLower.includes("merge")) return ICONS.mergeCells;
  if (idLower.includes("currency")) return ICONS.currencyVND;
  if (idLower.includes("sum")) return ICONS.autoSum;
  if (idLower.includes("average")) return ICONS.average || ICONS.autoSum;
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
  if (idLower.includes("macrorecordstop")) return ICONS.macroRecordStop;
  if (idLower.includes("macro.record") || idLower.includes("macrorecordstart")) return ICONS.macroRecordStart;
  if (idLower.includes("comment.insert") || idLower.includes("commentinsert")) return ICONS.comment;
  if (idLower.includes("commentdelete")) return ICONS.commentDelete;
  if (idLower.includes("commentresolve")) return ICONS.commentResolve;
  if (idLower.includes("commentprevious") || idLower.includes("commentprev")) return ICONS.commentPrevious;
  if (idLower.includes("commentnext")) return ICONS.commentNext;
  if (idLower.includes("comment")) return ICONS.comment;
  if (idLower.includes("wordcount")) return ICONS.wordCount;
  if (idLower.includes("spellcheck")) return ICONS.sheetSpellCheck || ICONS.aiGrammar;
  if (idLower.includes("grammarcheck")) return ICONS.aiGrammar;
  if (idLower.includes("trackchangeacceptall")) return ICONS.trackChangeAcceptAll;
  if (idLower.includes("trackchangeaccept")) return ICONS.trackChangeAccept;
  if (idLower.includes("trackchangerejectall")) return ICONS.trackChangeRejectAll;
  if (idLower.includes("trackchangereject")) return ICONS.trackChangeReject;
  if (idLower.includes("trackchangeprev")) return ICONS.trackChangePrev;
  if (idLower.includes("trackchangenext")) return ICONS.trackChangeNext;
  if (idLower.includes("trackchange")) return ICONS.trackChanges;
  if (idLower.includes("protectsheet") || idLower.includes("sheet.protect")) return ICONS.protectSheet;
  if (idLower.includes("protectworkbook") || idLower.includes("workbook.protect")) return ICONS.protectWorkbook;
  if (idLower.includes("insertfunction")) return ICONS.insertFunction;
  if (idLower.includes("countnumbers")) return ICONS.countNumbers;
  if (idLower.includes("maxfunction") || idLower.includes("formula.max")) return ICONS.maxFunction;
  if (idLower.includes("minfunction") || idLower.includes("formula.min")) return ICONS.minFunction;
  if (idLower.includes("namemanager")) return ICONS.nameManager;
  if (idLower.includes("definename")) return ICONS.defineName;
  if (idLower.includes("useinformula")) return ICONS.useInFormula;
  if (idLower.includes("createfromselection")) return ICONS.createFromSelection;
  if (idLower.includes("traceprecedents")) return ICONS.tracePrecedents;
  if (idLower.includes("tracedependents")) return ICONS.traceDependents;
  if (idLower.includes("removearrows")) return ICONS.removeArrows;
  if (idLower.includes("showformulas")) return ICONS.showFormulas;
  if (idLower.includes("errorchecking")) return ICONS.errorChecking;
  if (idLower.includes("watchwindow")) return ICONS.watchWindow;
  if (idLower.includes("evaluateformula")) return ICONS.evaluateFormula;
  if (idLower.includes("calculatesheet")) return ICONS.calculateSheet;
  if (idLower.includes("calculationoptions") || idLower.includes("calc.mode")) return ICONS.calculationOptions;
  if (idLower.includes("formula.recalculate")) return ICONS.refreshTable;
  if (idLower.includes("categoryfinancial")) return ICONS.categoryFinancial;
  if (idLower.includes("categorylogical")) return ICONS.categoryLogical;
  if (idLower.includes("categorytext")) return ICONS.categoryText;
  if (idLower.includes("categorydatetime")) return ICONS.categoryDateTime;
  if (idLower.includes("categorylookup")) return ICONS.categoryLookup;
  if (idLower.includes("categorymath")) return ICONS.categoryMath;
  if (idLower.includes("categorymore")) return ICONS.categoryMore;

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
  if (def && def.isToggle && !btn.hasAttribute("aria-pressed")) {
    btn.setAttribute("aria-pressed", state && state.checked ? "true" : "false");
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
      if (newState.icon) {
        const iconSpan = btn.querySelector(".vno-btn-icon");
        if (iconSpan) iconSpan.innerHTML = resolveIcon(commandId, newState.icon);
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

/**
 * Quản lý dropdown đang mở (chỉ cho phép 1 dropdown hiển thị tại 1 thời điểm)
 */
let activeRibbonDropdown = null;

export function closeActiveDropdown() {
  if (activeRibbonDropdown) {
    activeRibbonDropdown.close();
    activeRibbonDropdown = null;
  }
}

/**
 * Tạo nút Ribbon Dropdown (hỗ trợ các nhóm lệnh như Fill, Clear)
 * @param {Object} options
 * @param {string} [options.id]
 * @param {string} options.label
 * @param {string} [options.labelKey]
 * @param {string} [options.icon]
 * @param {boolean} [options.isLarge=false]
 * @param {Array<{commandId: string, label?: string, icon?: string}>} options.items
 * @param {string} [options.ariaLabel]
 * @returns {HTMLElement}
 */
export function createDropdownButton({
  id,
  label,
  labelKey,
  icon,
  isLarge = false,
  iconOnly = false,
  items = [],
  ariaLabel
}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return { id, label, items };
  }

  const btn = document.createElement("button");
  btn.setAttribute("type", "button");
  if (id) {
    btn.setAttribute("data-dropdown-id", id);
    btn.setAttribute("data-dropdown-toggle", id);
  }

  const displayLabel = labelKey ? t(labelKey, label) : (label || id || "Tùy chọn");
  const iconKey = icon || (items[0] ? items[0].commandId : "");
  const iconSvg = resolveIcon(id || iconKey, iconKey);
  const accessibleName = ariaLabel || displayLabel;

  btn.setAttribute("aria-label", accessibleName);
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");

  const arrowSvg = `<span class="vno-btn-arrow" aria-hidden="true" data-dropdown-arrow="true">${ICONS.chevronDown || `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`}</span>`;

  if (isLarge) {
    btn.className = "vno-btn vno-ribbon-btn-large vno-ribbon-btn-dropdown";
    btn.innerHTML = `
      <span class="vno-btn-icon" aria-hidden="true">${iconSvg}</span>
      <span class="vno-btn-label">
        <span class="vno-btn-text">${displayLabel}</span>
        ${arrowSvg}
      </span>
    `;
  } else if (iconOnly) {
    btn.className = "vno-btn vno-ribbon-btn-small vno-btn-icon-only vno-ribbon-btn-dropdown";
    btn.innerHTML = `
      <span class="vno-btn-icon" aria-hidden="true">${iconSvg}</span>
      ${arrowSvg}
    `;
  } else {
    btn.className = "vno-btn vno-ribbon-btn-small vno-ribbon-btn-dropdown";
    btn.innerHTML = `
      <span class="vno-btn-icon" aria-hidden="true">${iconSvg}</span>
      <span class="vno-btn-label">${displayLabel}</span>
      ${arrowSvg}
    `;
  }

  btn.title = accessibleName;

  let menuEl = null;
  let focusedIndex = -1;

  const closeMenu = () => {
    if (menuEl) {
      if (typeof menuEl._cleanup === "function") menuEl._cleanup();
      if (menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
      menuEl = null;
    }
    btn.setAttribute("aria-expanded", "false");
    btn.classList.remove("is-active");
    if (activeRibbonDropdown && activeRibbonDropdown.button === btn) {
      activeRibbonDropdown = null;
    }
    focusedIndex = -1;
  };

  const setFocusedIndex = (idx) => {
    focusedIndex = idx;
    if (!menuEl) return;
    const itemEls = menuEl.querySelectorAll(".vno-ribbon-dropdown-item");
    itemEls.forEach((el, i) => {
      if (i === idx) {
        el.classList.add("is-focused");
        el.focus();
      } else {
        el.classList.remove("is-focused");
      }
    });
  };

  const openMenu = () => {
    closeActiveDropdown();

    menuEl = document.createElement("div");
    menuEl.className = "vno-ribbon-dropdown-menu";
    menuEl.setAttribute("role", "menu");
    menuEl.setAttribute("aria-label", accessibleName);
    if (id) menuEl.id = `vno-dropdown-menu-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    btn.setAttribute("aria-controls", menuEl.id);

    items.forEach((subItem, idx) => {
      const def = globalCommandBus.getDefinition(subItem.commandId);
      const state = globalCommandBus.getState(subItem.commandId);
      const subLabel = subItem.label || (state ? state.label : (def ? def.label : subItem.commandId));
      const subIconKey = subItem.icon || (state && state.icon ? state.icon : (def && def.icon ? def.icon : ""));
      const subIconSvg = resolveIcon(subItem.commandId, subIconKey);
      const shortcut = state ? state.shortcut : (def ? def.shortcut : "");

      const itemEl = document.createElement("div");
      itemEl.className = "vno-ribbon-dropdown-item";
      itemEl.setAttribute("role", "menuitem");
      itemEl.setAttribute("tabindex", "-1");
      itemEl.setAttribute("data-command-id", subItem.commandId);
      itemEl.setAttribute("aria-label", shortcut ? `${subLabel} (${shortcut})` : subLabel);

      itemEl.innerHTML = `
        <span class="vno-menu-item-icon" aria-hidden="true">${subIconSvg}</span>
        <span class="vno-menu-item-label">${subLabel}</span>
        ${shortcut ? `<span class="vno-menu-item-shortcut">${shortcut}</span>` : ""}
      `;

      if (state && !state.enabled) {
        itemEl.classList.add("is-disabled");
        itemEl.setAttribute("aria-disabled", "true");
      }

      if (def && def.isToggle) {
        itemEl.setAttribute("role", "menuitemcheckbox");
        const isChecked = Boolean(state && state.checked);
        itemEl.setAttribute("aria-checked", String(isChecked));
        if (isChecked) itemEl.classList.add("is-checked");
      }

      itemEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      itemEl.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        globalCommandBus.execute(subItem.commandId, subItem.args);
      });

      itemEl.addEventListener("mouseenter", () => {
        setFocusedIndex(idx);
      });

      menuEl.appendChild(itemEl);
    });

    document.body.appendChild(menuEl);

    // Position menu directly beneath button
    const rect = btn.getBoundingClientRect();
    const menuWidth = menuEl.offsetWidth || 180;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - menuWidth - 10);
    }
    menuEl.style.top = `${rect.bottom + 2}px`;
    menuEl.style.left = `${left}px`;

    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-active");

    const onDocMouseDown = (e) => {
      if (!menuEl.contains(e.target) && !btn.contains(e.target)) {
        closeMenu();
      }
    };

    const onDocKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        btn.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(nextIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
        setFocusedIndex(prevIdx);
      } else if (e.key === "Enter" || e.key === " ") {
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          e.preventDefault();
          const itemEls = menuEl.querySelectorAll(".vno-ribbon-dropdown-item");
          if (itemEls[focusedIndex]) itemEls[focusedIndex].click();
        }
      } else if (e.key === "Tab") {
        closeMenu();
      }
    };

    menuEl._cleanup = () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };

    document.addEventListener("keydown", onDocKeyDown);
    setTimeout(() => {
      document.addEventListener("mousedown", onDocMouseDown);
    }, 10);

    activeRibbonDropdown = {
      button: btn,
      menu: menuEl,
      close: closeMenu
    };
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuEl) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      if (!menuEl) {
        e.preventDefault();
        openMenu();
        setFocusedIndex(0);
      }
    }
  });

  return btn;
}
