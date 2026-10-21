/**
 * 3T Office Platform — Ribbon Host Framework
 * Quản lý kết cấu Ribbon động theo app context và cơ chế tự co giãn (adaptive scaling) chuẩn Office
 */

import { createCommandButton, createSelect, createDropdownButton, closeActiveDropdown } from "../ui-kit/components.js";
import { t } from "../i18n/i18n.js";
import { ICONS } from "../ui-kit/icons.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { showAboutDialog } from "../about/about-dialog.js";

function resolveGroupIcon(groupId, label) {
  const gid = (groupId || "").toLowerCase();
  const lbl = (label || "").toLowerCase();
  if (gid.includes("clipboard") || lbl.includes("bảng nhớ") || lbl.includes("nhớ tạm")) return ICONS.paste;
  if (gid.includes("font") || lbl.includes("phông")) return ICONS.bold;
  if (gid.includes("para") || lbl.includes("đoạn")) return ICONS.alignLeft;
  if (gid.includes("style") || lbl.includes("kiểu")) return ICONS.themeGallery || ICONS.styleGallery;
  if (gid.includes("edit") || lbl.includes("chỉnh sửa")) return ICONS.search;
  if (gid.includes("align") || lbl.includes("căn chỉnh")) return ICONS.alignCenter;
  if (gid.includes("number") || lbl.includes("số")) return ICONS.currencyVND;
  if (gid.includes("cell") || lbl.includes("ô")) return ICONS.sheetFormat || ICONS.table;
  if (gid.includes("slide") || lbl.includes("trang chiếu")) return ICONS.slideNew;
  if (gid.includes("draw") || lbl.includes("vẽ")) return ICONS.shape;
  if (gid.includes("table") || lbl.includes("bảng")) return ICONS.table;
  if (gid.includes("illustrat") || gid.includes("image") || lbl.includes("ảnh") || lbl.includes("minh họa")) return ICONS.image;
  if (gid.includes("link") || lbl.includes("liên kết")) return ICONS.hyperlink;
  if (gid.includes("comment") || lbl.includes("ghi chú") || lbl.includes("nhận xét")) return ICONS.comment;
  if (gid.includes("header") || lbl.includes("đầu trang")) return ICONS.headerFooter;
  if (gid.includes("text") || lbl.includes("văn bản")) return ICONS.textBox;
  if (gid.includes("symbol") || lbl.includes("ký hiệu")) return ICONS.symbol || ICONS.equation;
  if (gid.includes("page") || lbl.includes("trang")) return ICONS.margins || ICONS.pageBreak;
  if (gid.includes("print") || lbl.includes("in")) return ICONS.filePrint;
  if (gid.includes("function") || lbl.includes("hàm")) return ICONS.insertFunction || ICONS.autoSum;
  if (gid.includes("audit") || lbl.includes("kiểm tra")) return ICONS.tracePrecedents;
  if (gid.includes("name") || lbl.includes("tên")) return ICONS.nameManager;
  if (gid.includes("calc") || lbl.includes("tính toán")) return ICONS.calculateSheet || ICONS.autoSum;
  if (gid.includes("data") || gid.includes("sort") || gid.includes("filter") || lbl.includes("dữ liệu") || lbl.includes("lọc")) return ICONS.filter;
  if (gid.includes("proof") || gid.includes("spell") || lbl.includes("soát lỗi") || lbl.includes("chính tả")) return ICONS.sheetSpellCheck || ICONS.aiGrammar;
  if (gid.includes("protect") || lbl.includes("bảo vệ")) return ICONS.protectSheet;
  if (gid.includes("view") || lbl.includes("xem")) return ICONS.sheetNormalView || ICONS.writerPrintLayout;
  if (gid.includes("show") || lbl.includes("hiển thị")) return ICONS.gridlines;
  if (gid.includes("zoom") || lbl.includes("thu phóng")) return ICONS.zoomReset || ICONS.zoomIn;
  if (gid.includes("window") || lbl.includes("cửa sổ")) return ICONS.newWindow;
  if (gid.includes("macro")) return ICONS.macroManager;
  if (gid.includes("transit") || lbl.includes("chuyển tiếp")) return ICONS.slidePlay;
  if (gid.includes("animat") || lbl.includes("hoạt hình")) return ICONS.shape;
  if (gid.includes("ai") || lbl.includes("ai")) return ICONS.aiSparkle;
  if (gid.includes("help") || lbl.includes("trợ giúp")) return ICONS.help;

  return ICONS.chevronDown || `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>`;
}

export class RibbonHost {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Function} [options.onFileMenuClick]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.tabs = [];
    this.activeTabId = null;
    this.isCollapsed = false;
    this._activePopover = null;

    if (typeof window !== "undefined") {
      this._resizeHandler = () => this.updateAdaptiveLayout();
      window.addEventListener("resize", this._resizeHandler);
      if (typeof ResizeObserver !== "undefined" && this.container) {
        this._resizeObserver = new ResizeObserver(() => this.updateAdaptiveLayout());
        this._resizeObserver.observe(this.container);
      }
    }
  }

  setStructure(tabs, defaultActiveId) {
    this.tabs = tabs;
    this.activeTabId = defaultActiveId || (tabs[0] ? tabs[0].id : null);
    this.render();
  }

  selectTab(tabId) {
    closeActiveDropdown();
    this._closeGroupPopover();
    if (this.activeTabId === tabId) {
      this.updateAdaptiveLayout();
      return;
    }
    this.activeTabId = tabId;
    this.render();
  }

  render() {
    closeActiveDropdown();
    this._closeGroupPopover();
    const activeElement = typeof document !== "undefined" ? document.activeElement : null;
    const focusedTabId = activeElement && this.container?.contains?.(activeElement) ? activeElement.dataset?.tabId : null;
    // Tab ngữ cảnh (Thiết kế/Bố cục Bảng, Định dạng Hình ảnh) chỉ hiện khi app bật; dựng lại ribbon không được làm chúng hiện ra.
    const previousHidden = new Map(Array.from(this.container.querySelectorAll(".vno-ribbon-tab[id]"), (btn) => [btn.id, btn.hidden]));
    this.container.innerHTML = "";
    this.container.className = "vno-ribbon";

    // 1. Render Tabs Bar
    const tabsBar = document.createElement("div");
    tabsBar.className = "vno-ribbon-tabs";
    tabsBar.setAttribute("role", "tablist");
    tabsBar.setAttribute("aria-label", "Các thanh công cụ");

    const tabStrip = document.createElement("div");
    tabStrip.className = "vno-ribbon-tab-strip";
    const createTabScrollButton = (direction, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `vno-ribbon-tab-scroll-btn is-${direction}`;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.textContent = direction === "left" ? "‹" : "›";
      button.addEventListener("click", () => {
        tabsBar.scrollBy({ left: (direction === "left" ? -1 : 1) * Math.max(140, tabsBar.clientWidth * 0.7), behavior: "smooth" });
        requestAnimationFrame(() => this._updateTabScrollControls());
      });
      return button;
    };
    const scrollLeftBtn = createTabScrollButton("left", "Cuộn thanh tab sang trái");
    const scrollRightBtn = createTabScrollButton("right", "Cuộn thanh tab sang phải");
    tabStrip.append(scrollLeftBtn, tabsBar, scrollRightBtn);
    tabsBar.addEventListener("scroll", () => this._updateTabScrollControls(), { passive: true });
    this._tabVisibilityObserver?.disconnect?.();
    if (typeof MutationObserver !== "undefined") {
      this._tabVisibilityObserver = new MutationObserver(() => requestAnimationFrame(() => this._updateTabScrollControls()));
      this._tabVisibilityObserver.observe(tabsBar, { attributes: true, attributeFilter: ["hidden"], subtree: true });
    }

    // Nút "Tệp" đặc biệt
    const fileBtn = document.createElement("button");
    fileBtn.className = "vno-btn vno-ribbon-tab-file";
    fileBtn.type = "button";
    fileBtn.textContent = t("common.fileMenu");
    fileBtn.setAttribute("aria-haspopup", "dialog");
    fileBtn.setAttribute("aria-label", `${t("common.fileMenu")} (Mở menu tệp)`);
    fileBtn.addEventListener("click", () => {
      if (this.options.onFileMenuClick) this.options.onFileMenuClick();
    });
    fileBtn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const activeTabBtn = this.container.querySelector(`.vno-ribbon-tab.is-active`)
          || this.container.querySelector(`.vno-ribbon-tab`);
        activeTabBtn?.focus();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const tabButtons = Array.from(this.container.querySelectorAll(".vno-ribbon-tab"));
        const lastTab = tabButtons[tabButtons.length - 1];
        lastTab?.focus();
      }
    });
    tabsBar.appendChild(fileBtn);

    // Các tabs chức năng
    this.tabs.forEach((tab) => {
      const tabBtn = document.createElement("button");
      const isActive = tab.id === this.activeTabId;
      tabBtn.className = `vno-ribbon-tab ${isActive ? "is-active" : ""}`;
      tabBtn.type = "button";
      tabBtn.textContent = tab.label;
      tabBtn.setAttribute("role", "tab");
      tabBtn.setAttribute("aria-selected", String(isActive));
      tabBtn.setAttribute("aria-controls", `vno-ribbon-tabpanel-${tab.id}`);
      tabBtn.id = `vno-ribbon-tab-${tab.id}`;
      tabBtn.dataset.tabId = tab.id;
      tabBtn.tabIndex = isActive ? 0 : -1;
      if (tab.contextual && !isActive) {
        tabBtn.hidden = previousHidden.has(tabBtn.id) ? previousHidden.get(tabBtn.id) : true;
        tabBtn.setAttribute("aria-hidden", String(tabBtn.hidden));
      }

      tabBtn.addEventListener("click", () => {
        this.selectTab(tab.id);
        const focusSelectedTab = () => {
          const currentTab = this.container.querySelector(`#vno-ribbon-tab-${tab.id}`);
          currentTab?.focus?.();
          currentTab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        };
        focusSelectedTab();
        requestAnimationFrame(focusSelectedTab);
        // The browser's default click action can still target the removed button after render().
        // Restore focus in the next task as well so keyboard navigation starts from the new tab.
        setTimeout(focusSelectedTab, 0);
      });
      // Nhấp đúp vào tab (giống Word/Excel thật) thu gọn/mở rộng Ribbon
      tabBtn.addEventListener("dblclick", (e) => {
        e.preventDefault();
        globalCommandBus.execute("common.view.ribbonToggle");
      });

      // Hỗ trợ phím mũi tên điều hướng giữa các tab chuẩn WAI-ARIA
      tabBtn.addEventListener("keydown", (e) => {
        const tabButtons = Array.from(tabsBar.querySelectorAll(".vno-ribbon-tab")).filter(button => !button.hidden);
        const currentIndex = tabButtons.indexOf(tabBtn);
        let targetIndex = -1;

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          if (currentIndex === tabButtons.length - 1) {
            const fb = this.container.querySelector(".vno-ribbon-tab-file");
            fb?.focus();
            return;
          }
          targetIndex = (currentIndex + 1) % tabButtons.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          if (currentIndex === 0) {
            const fb = this.container.querySelector(".vno-ribbon-tab-file");
            fb?.focus();
            return;
          }
          targetIndex = currentIndex - 1;
        } else if (e.key === "Home") {
          e.preventDefault();
          const fb = this.container.querySelector(".vno-ribbon-tab-file");
          fb?.focus();
          return;
        } else if (e.key === "End") {
          e.preventDefault();
          targetIndex = tabButtons.length - 1;
        }

        if (targetIndex !== -1 && tabButtons[targetIndex]) {
          const targetTabId = tabButtons[targetIndex].dataset.tabId;
          this.selectTab(targetTabId);
          const newTabBtn = this.container.querySelector?.(`#vno-ribbon-tab-${targetTabId}`)
            || this.container.querySelectorAll?.(".vno-ribbon-tab")?.[targetIndex];
          newTabBtn?.focus?.();
          newTabBtn?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        }
      });

      tabsBar.appendChild(tabBtn);
    });

    // Nút thu gọn/mở rộng Ribbon rõ ràng
    const collapseBtn = createCommandButton({ commandId: "common.view.ribbonToggle", iconOnly: true });
    collapseBtn.classList.add("vno-ribbon-collapse-btn");
    collapseBtn.setAttribute("aria-expanded", String(!this.isCollapsed));
    tabStrip.appendChild(collapseBtn);

    this.container.appendChild(tabStrip);
    this._updateTabScrollControls();
    requestAnimationFrame(() => this._updateTabScrollControls());
    if (focusedTabId) {
      const restoredTab = this.container.querySelector(`#vno-ribbon-tab-${focusedTabId}`);
      restoredTab?.focus?.();
      restoredTab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }

    // 2. Render Active Tab Content
    const currentTab = this.tabs.find(t => t.id === this.activeTabId);
    if (!currentTab || this.isCollapsed) return;

    const contentPanel = document.createElement("div");
    contentPanel.className = "vno-ribbon-content";
    contentPanel.setAttribute("role", "tabpanel");
    contentPanel.id = `vno-ribbon-tabpanel-${currentTab.id}`;
    contentPanel.setAttribute("aria-labelledby", `vno-ribbon-tab-${currentTab.id}`);

    currentTab.groups.forEach(group => {
      const groupEl = document.createElement("div");
      groupEl.className = "vno-ribbon-group";
      const groupId = group.id || (group.labelKey ? group.labelKey.split('.').pop() : "");
      if (groupId) groupEl.dataset.groupId = groupId;
      groupEl.dataset.groupLabel = group.label;
      groupEl.setAttribute("role", "group");
      groupEl.setAttribute("aria-label", group.label);

      const itemsEl = document.createElement("div");
      itemsEl.className = "vno-ribbon-group-items";
      itemsEl.setAttribute("role", "toolbar");
      itemsEl.setAttribute("aria-label", group.label);

      const isShowGroup = groupId === "show";

      // Render items trong group
      group.items.forEach(item => {
        if (item.type === "about-button" || item.action === "about") {
          const btn = createCommandButton({
            commandId: "common.help.about",
            isLarge: item.isLarge ?? true,
            iconOnly: item.iconOnly,
            customLabel: item.label || t("common.help.about") || "Giới thiệu 3T Office",
            customIcon: "help"
          });
          btn.addEventListener("click", () => showAboutDialog());
          itemsEl.appendChild(btn);
        } else if (item.type === "button" || item.type === "checkbox") {
          itemsEl.appendChild(createCommandButton({
            commandId: item.commandId,
            isLarge: item.isLarge,
            iconOnly: item.iconOnly,
            customLabel: item.label,
            customIcon: item.icon,
            customAriaLabel: item.ariaLabelKey ? t(item.ariaLabelKey) : item.ariaLabel,
            isCheckbox: item.isCheckbox || item.type === "checkbox" || isShowGroup
          }));
        } else if (item.type === "dropdown") {
          itemsEl.appendChild(createDropdownButton({
            id: item.id,
            label: item.labelKey ? t(item.labelKey, item.label) : item.label,
            labelKey: item.labelKey,
            icon: item.icon,
            isLarge: item.isLarge,
            iconOnly: item.iconOnly,
            ariaLabel: item.ariaLabel,
            items: item.items
          }));
        } else if (item.type === "select") {
          itemsEl.appendChild(createSelect(item));
        } else if (item.type === "column") {
          const colEl = document.createElement("div");
          colEl.className = "vno-ribbon-group-column";
          item.items.forEach(subItem => {
            if (subItem.type === "row") {
              const rowEl = document.createElement("div");
              rowEl.className = "vno-ribbon-group-row";
              subItem.items.forEach(rowItem => {
                if (rowItem.type === "select") {
                  rowEl.appendChild(createSelect(rowItem));
                } else if (rowItem.type === "dropdown") {
                  rowEl.appendChild(createDropdownButton({
                    id: rowItem.id,
                    label: rowItem.labelKey ? t(rowItem.labelKey, rowItem.label) : rowItem.label,
                    labelKey: rowItem.labelKey,
                    icon: rowItem.icon,
                    isLarge: rowItem.isLarge,
                    iconOnly: rowItem.iconOnly,
                    ariaLabel: rowItem.ariaLabel,
                    items: rowItem.items
                  }));
                } else {
                  rowEl.appendChild(createCommandButton({
                    commandId: rowItem.commandId,
                    isLarge: rowItem.isLarge,
                    iconOnly: rowItem.iconOnly,
                    customLabel: rowItem.label,
                    customIcon: rowItem.icon,
                    isCheckbox: rowItem.isCheckbox || rowItem.type === "checkbox" || isShowGroup
                  }));
                }
              });
              colEl.appendChild(rowEl);
            } else if (subItem.type === "dropdown") {
              colEl.appendChild(createDropdownButton({
                id: subItem.id,
                label: subItem.labelKey ? t(subItem.labelKey, subItem.label) : subItem.label,
                labelKey: subItem.labelKey,
                icon: subItem.icon,
                isLarge: subItem.isLarge,
                iconOnly: subItem.iconOnly,
                ariaLabel: subItem.ariaLabel,
                items: subItem.items
              }));
            } else if (subItem.type === "select") {
              colEl.appendChild(createSelect(subItem));
            } else {
              colEl.appendChild(createCommandButton({
                commandId: subItem.commandId,
                isLarge: subItem.isLarge,
                iconOnly: subItem.iconOnly,
                customLabel: subItem.label,
                customIcon: subItem.icon,
                isCheckbox: subItem.isCheckbox || subItem.type === "checkbox" || isShowGroup
              }));
            }
          });
          itemsEl.appendChild(colEl);
        }
      });

      groupEl.appendChild(itemsEl);

      const labelRowEl = document.createElement("div");
      labelRowEl.className = "vno-ribbon-group-footer";
      labelRowEl.style.cssText = "display:flex; align-items:center; justify-content:center; position:relative; padding-top:2px;";

      const labelEl = document.createElement("div");
      labelEl.className = "vno-ribbon-group-label";
      labelEl.textContent = group.label;
      labelRowEl.appendChild(labelEl);

      if (group.launcherCommandId) {
        const launcherBtn = document.createElement("button");
        launcherBtn.type = "button";
        launcherBtn.className = "vno-ribbon-dialog-launcher";
        const tooltip = group.launcherTooltip || "Định dạng ô (Ctrl+1)";
        launcherBtn.title = tooltip;
        launcherBtn.setAttribute("aria-label", tooltip);
        launcherBtn.setAttribute("data-command", group.launcherCommandId);
        launcherBtn.innerHTML = ICONS.dialogLauncher || "";
        launcherBtn.addEventListener("click", () => {
          globalCommandBus?.execute?.(group.launcherCommandId);
        });
        labelRowEl.appendChild(launcherBtn);
      }

      groupEl.appendChild(labelRowEl);

      // Collapsed group trigger button (hiển thị khi nhóm ở Stage 3 co gọn)
      const collapsedBtn = document.createElement("button");
      collapsedBtn.type = "button";
      collapsedBtn.className = "vno-btn vno-ribbon-btn-large vno-ribbon-group-collapsed-btn";
      collapsedBtn.setAttribute("aria-haspopup", "dialog");
      collapsedBtn.setAttribute("aria-expanded", "false");
      const grpIconSvg = resolveGroupIcon(groupId, group.label);
      collapsedBtn.innerHTML = `
        <span class="vno-btn-icon" aria-hidden="true">${grpIconSvg}</span>
        <span class="vno-btn-label">
          <span class="vno-btn-text">${group.label}</span>
          <span class="vno-btn-arrow">${ICONS.chevronDown || `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`}</span>
        </span>
      `;
      collapsedBtn.title = `${group.label} (Mở rộng nhóm)`;
      collapsedBtn.setAttribute("aria-label", `${group.label} (Mở rộng nhóm)`);
      collapsedBtn.addEventListener("click", () => {
        this._toggleGroupPopover(groupEl, group, itemsEl, labelRowEl);
      });
      groupEl.appendChild(collapsedBtn);

      contentPanel.appendChild(groupEl);
    });

    this.container.appendChild(contentPanel);

    // Kích hoạt co giãn thông minh sau khi render
    this.updateAdaptiveLayout();
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => this.updateAdaptiveLayout());
    }
  }

  /**
   * Bộ điều phối co giãn thích ứng (Adaptive / Responsive Scaling Engine) chuẩn Office:
   * Khi không đủ không gian (scrollWidth > clientWidth), các nhóm tự động thu gọn theo thứ tự:
   * 1. Nút lớn -> nút nhỏ / gọn (vno-group-compact)
   * 2. Nút nhỏ có nhãn -> nút nhỏ chỉ icon + tooltip (vno-group-icon-only)
   * 3. Toàn bộ nhóm thu thành 1 nút thả xuống mở popup đầy đủ (vno-group-collapsed)
   * Đảm bảo KHÔNG BAO GIỜ cuộn ngang ở chiều rộng >= 1024px.
   */
  updateAdaptiveLayout() {
    this._applyAdaptiveLayout();
    // Lượt đo đầu có thể chạy khi font/icon/viewport chưa ổn định nên còn tràn vài px
    // (hiện thanh cuộn ngang và cắt nút); kiểm lại một lần sau khi layout lắng xuống.
    if (this._adaptiveRecheckTimer) clearTimeout(this._adaptiveRecheckTimer);
    this._adaptiveRecheckTimer = setTimeout(() => {
      this._adaptiveRecheckTimer = null;
      const panel = this.container?.querySelector?.(".vno-ribbon-content");
        const groups = panel ? Array.from(panel.querySelectorAll(".vno-ribbon-group")) : [];
        if (panel && !this.isCollapsed && this._hasAdaptiveOverflow(panel, groups)) {
        this._applyAdaptiveLayout();
      }
    }, 200);
  }

  _applyAdaptiveLayout() {
    this._updateTabScrollControls();
    if (this.isCollapsed) return;
    const contentPanel = this.container?.querySelector?.(".vno-ribbon-content");
    if (!contentPanel) return;

    this._closeGroupPopover();

    const groupEls = Array.from(contentPanel.querySelectorAll(".vno-ribbon-group"));
    if (groupEls.length === 0) return;
    const hasOverflow = () => this._hasAdaptiveOverflow(contentPanel, groupEls);

    // Reset về trạng thái đầy đủ (Stage 0)
    for (const g of groupEls) {
      g.classList.remove("vno-group-compact", "vno-group-icon-only", "vno-group-collapsed");
    }

    // Nếu đã vừa vặn thì không cần thu gọn
    if (!hasOverflow()) {
      return;
    }

    // Thứ tự ưu tiên thu nhỏ: từ phải qua trái, các nhóm ít dùng trước;
    // nhóm Phông chữ (font) và Bảng nhớ tạm (clipboard) giữ lâu nhất.
    const highPriority = ["font", "clipboard", "cells", "styles"];
    const groupsToShrink = [...groupEls].reverse().sort((a, b) => {
      const aHigh = highPriority.includes(a.dataset.groupId);
      const bHigh = highPriority.includes(b.dataset.groupId);
      if (aHigh && !bHigh) return 1;
      if (!aHigh && bHigh) return -1;
      return 0;
    });

    // Stage 1: Co gọn các nút lớn (compact)
    for (const g of groupsToShrink) {
      g.classList.add("vno-group-compact");
      if (!hasOverflow()) return;
    }

    // Stage 2: Nút nhỏ ẩn nhãn, chỉ hiển thị icon (icon-only + tooltip).
    // Nhóm keepLabels (Kiểu, Ô) bị bỏ qua ở đây để giữ nhãn chữ như Excel; chúng chỉ bị ẩn nhãn
    // sau cùng nếu các nhóm khác đã thu gọn mà vẫn tràn.
    const keepLabels = ["cells", "styles"];
    for (const g of groupsToShrink) {
      if (keepLabels.includes(g.dataset.groupId)) continue;
      g.classList.add("vno-group-icon-only");
      if (!hasOverflow()) return;
    }
    for (const g of groupsToShrink) {
      if (!keepLabels.includes(g.dataset.groupId)) continue;
      g.classList.add("vno-group-icon-only");
      if (!hasOverflow()) return;
    }

    // Stage 3: Thu cả nhóm thành 1 nút dropdown mở rộng
    for (const g of groupsToShrink) {
      if (g.dataset.groupId === "clipboard" && groupEls.length > 1) {
        continue;
      }
      g.classList.add("vno-group-collapsed");
      if (!hasOverflow()) return;
    }

    // Nếu vẫn chưa đủ (ở màn hình cực hẹp), thu nốt các nhóm còn lại
    for (const g of groupsToShrink) {
      if (!g.classList.contains("vno-group-collapsed")) {
        g.classList.add("vno-group-collapsed");
        if (!hasOverflow()) return;
      }
    }
  }

  _hasAdaptiveOverflow(contentPanel, groupEls) {
    if (contentPanel.scrollWidth > contentPanel.clientWidth + 1) return true;
    return groupEls.some((group) => {
      if (group.classList.contains("vno-group-collapsed")) return false;
      const items = group.querySelector(".vno-ribbon-group-items");
      return items && items.scrollWidth > items.clientWidth + 1;
    });
  }

  _updateTabScrollControls() {
    const tabsBar = this.container?.querySelector?.(".vno-ribbon-tabs");
    const left = this.container?.querySelector?.(".vno-ribbon-tab-scroll-btn.is-left");
    const right = this.container?.querySelector?.(".vno-ribbon-tab-scroll-btn.is-right");
    if (!tabsBar || !left || !right) return;
    const overflowing = tabsBar.scrollWidth > tabsBar.clientWidth + 1;
    left.hidden = !overflowing || tabsBar.scrollLeft <= 1;
    right.hidden = !overflowing || tabsBar.scrollLeft + tabsBar.clientWidth >= tabsBar.scrollWidth - 1;
  }

  _closeGroupPopover() {
    if (this._activePopover) {
      this._activePopover.cleanup();
      this._activePopover = null;
    }
  }

  _toggleGroupPopover(groupEl, group, itemsEl) {
    if (this._activePopover && this._activePopover.groupEl === groupEl) {
      this._closeGroupPopover();
      return;
    }
    this._closeGroupPopover();

    const btn = groupEl.querySelector(".vno-ribbon-group-collapsed-btn");
    if (!btn) return;

    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-active");

    const popover = document.createElement("div");
    popover.className = "vno-ribbon-group-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", group.label || "Nhóm mở rộng");

    const placeholder = document.createComment(`items-placeholder-${groupEl.dataset.groupId || "group"}`);
    itemsEl.parentNode.insertBefore(placeholder, itemsEl);

    const contentWrap = document.createElement("div");
    contentWrap.className = "vno-ribbon-popover-items";
    contentWrap.appendChild(itemsEl);
    popover.appendChild(contentWrap);

    const titleEl = document.createElement("div");
    titleEl.className = "vno-ribbon-popover-title";
    titleEl.textContent = group.label;
    popover.appendChild(titleEl);

    const rect = btn.getBoundingClientRect();
    popover.style.position = "fixed";
    popover.style.top = `${rect.bottom + 2}px`;
    const popoverLeft = Math.max(8, Math.min(rect.left, (window.innerWidth || 1024) - 340));
    popover.style.left = `${popoverLeft}px`;
    popover.style.zIndex = "10000";

    document.body.appendChild(popover);

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      btn.setAttribute("aria-expanded", "false");
      btn.classList.remove("is-active");
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(itemsEl, placeholder);
        placeholder.remove();
      }
      popover.remove();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      if (this._activePopover?.groupEl === groupEl) {
        this._activePopover = null;
      }
    };

    const onPointerDown = (e) => {
      if (!popover.contains(e.target) && !btn.contains(e.target)) {
        cleanup();
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cleanup();
        btn.focus();
      }
    };

    popover.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("button.vno-btn:not(.vno-ribbon-btn-dropdown):not(.vno-ribbon-checkbox)");
      if (actionBtn) {
        setTimeout(cleanup, 120);
      }
    });

    setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);
    }, 0);

    this._activePopover = { groupEl, cleanup };
  }
}
