/**
 * VN Office Platform — Ribbon Host Framework
 * Quản lý kết cấu Ribbon động theo app context
 */

import { createCommandButton, createSelect, createDropdownButton, closeActiveDropdown } from "../ui-kit/components.js";
import { t } from "../i18n/i18n.js";
import { ICONS } from "../ui-kit/icons.js";
import { globalCommandBus } from "../commands/command-bus.js";

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
  }

  setStructure(tabs, defaultActiveId) {
    this.tabs = tabs;
    this.activeTabId = defaultActiveId || (tabs[0] ? tabs[0].id : null);
    this.render();
  }

  selectTab(tabId) {
    closeActiveDropdown();
    if (this.activeTabId === tabId) return;
    this.activeTabId = tabId;
    this.render();
  }

  render() {
    closeActiveDropdown();
    this.container.innerHTML = "";
    this.container.className = "vno-ribbon";

    // 1. Render Tabs Bar
    const tabsBar = document.createElement("div");
    tabsBar.className = "vno-ribbon-tabs";
    tabsBar.setAttribute("role", "tablist");
    tabsBar.setAttribute("aria-label", "Các thanh công cụ");

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
    tabsBar.appendChild(fileBtn);

    // Các tabs chức năng
    this.tabs.forEach((tab, index) => {
      const tabBtn = document.createElement("button");
      const isActive = tab.id === this.activeTabId;
      tabBtn.className = `vno-ribbon-tab ${isActive ? "is-active" : ""}`;
      tabBtn.type = "button";
      tabBtn.textContent = tab.label;
      tabBtn.setAttribute("role", "tab");
      tabBtn.setAttribute("aria-selected", String(isActive));
      tabBtn.setAttribute("aria-controls", `vno-ribbon-tabpanel-${tab.id}`);
      tabBtn.id = `vno-ribbon-tab-${tab.id}`;
      tabBtn.tabIndex = isActive ? 0 : -1;

      tabBtn.addEventListener("click", () => this.selectTab(tab.id));

      // Hỗ trợ phím mũi tên điều hướng giữa các tab chuẩn WAI-ARIA
      tabBtn.addEventListener("keydown", (e) => {
        const tabButtons = Array.from(tabsBar.querySelectorAll(".vno-ribbon-tab"));
        const currentIndex = tabButtons.indexOf(tabBtn);
        let targetIndex = -1;

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          targetIndex = (currentIndex + 1) % tabButtons.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          targetIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        } else if (e.key === "Home") {
          e.preventDefault();
          targetIndex = 0;
        } else if (e.key === "End") {
          e.preventDefault();
          targetIndex = tabButtons.length - 1;
        }

        if (targetIndex !== -1 && this.tabs[targetIndex]) {
          this.selectTab(this.tabs[targetIndex].id);
          const updatedButtons = tabsBar.querySelectorAll(".vno-ribbon-tab");
          if (updatedButtons[targetIndex]) updatedButtons[targetIndex].focus();
        }
      });

      tabsBar.appendChild(tabBtn);
    });

    this.container.appendChild(tabsBar);

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
      if (group.id) groupEl.dataset.groupId = group.id;
      groupEl.setAttribute("role", "group");
      groupEl.setAttribute("aria-label", group.label);

      const itemsEl = document.createElement("div");
      itemsEl.className = "vno-ribbon-group-items";
      itemsEl.setAttribute("role", "toolbar");
      itemsEl.setAttribute("aria-label", group.label);

      // Render items trong group
      group.items.forEach(item => {
        if (item.type === "button") {
          itemsEl.appendChild(createCommandButton({
            commandId: item.commandId,
            isLarge: item.isLarge,
            iconOnly: item.iconOnly,
            customLabel: item.label,
            customIcon: item.icon
          }));
        } else if (item.type === "dropdown") {
          itemsEl.appendChild(createDropdownButton({
            id: item.id,
            label: item.labelKey ? t(item.labelKey, item.label) : item.label,
            labelKey: item.labelKey,
            icon: item.icon,
            isLarge: item.isLarge,
            items: item.items
          }));
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
                    items: rowItem.items
                  }));
                } else {
                  rowEl.appendChild(createCommandButton({
                    commandId: rowItem.commandId,
                    isLarge: rowItem.isLarge,
                    iconOnly: rowItem.iconOnly,
                    customLabel: rowItem.label,
                    customIcon: rowItem.icon
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
                customIcon: subItem.icon
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

      contentPanel.appendChild(groupEl);
    });

    this.container.appendChild(contentPanel);
  }
}
