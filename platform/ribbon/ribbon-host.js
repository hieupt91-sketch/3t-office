/**
 * VN Office Platform — Ribbon Host Framework
 * Quản lý kết cấu Ribbon động theo app context
 */

import { createCommandButton, createSelect } from "../ui-kit/components.js";
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
    if (this.activeTabId === tabId) return;
    this.activeTabId = tabId;
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    this.container.className = "vno-ribbon";

    // 1. Render Tabs Bar
    const tabsBar = document.createElement("div");
    tabsBar.className = "vno-ribbon-tabs";

    // Nút "Tệp" đặc biệt
    const fileBtn = document.createElement("button");
    fileBtn.className = "vno-btn vno-ribbon-tab-file";
    fileBtn.type = "button";
    fileBtn.textContent = t("common.fileMenu");
    fileBtn.addEventListener("click", () => {
      if (this.options.onFileMenuClick) this.options.onFileMenuClick();
    });
    tabsBar.appendChild(fileBtn);

    // Các tabs chức năng
    this.tabs.forEach(tab => {
      const tabBtn = document.createElement("button");
      tabBtn.className = `vno-ribbon-tab ${tab.id === this.activeTabId ? "is-active" : ""}`;
      tabBtn.type = "button";
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener("click", () => this.selectTab(tab.id));
      tabsBar.appendChild(tabBtn);
    });

    this.container.appendChild(tabsBar);

    // 2. Render Active Tab Content
    const currentTab = this.tabs.find(t => t.id === this.activeTabId);
    if (!currentTab || this.isCollapsed) return;

    const contentPanel = document.createElement("div");
    contentPanel.className = "vno-ribbon-content";

    currentTab.groups.forEach(group => {
      const groupEl = document.createElement("div");
      groupEl.className = "vno-ribbon-group";

      const itemsEl = document.createElement("div");
      itemsEl.className = "vno-ribbon-group-items";

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
        launcherBtn.className = "vno-ribbon-dialog-launcher";
        launcherBtn.title = group.launcherTooltip || "Định dạng ô (Ctrl+1)";
        launcherBtn.setAttribute("data-command", group.launcherCommandId);
        launcherBtn.style.cssText = "position:absolute; right:0; bottom:0; width:14px; height:14px; padding:0; display:flex; align-items:center; justify-content:center; border:none; background:transparent; cursor:pointer; color:var(--vno-text-muted); opacity:0.75;";
        launcherBtn.innerHTML = ICONS.dialogLauncher || "";
        launcherBtn.addEventListener("click", () => {
          globalCommandBus?.dispatch(group.launcherCommandId);
        });
        launcherBtn.addEventListener("mouseenter", () => { launcherBtn.style.opacity = "1"; });
        launcherBtn.addEventListener("mouseleave", () => { launcherBtn.style.opacity = "0.75"; });
        labelRowEl.appendChild(launcherBtn);
      }

      groupEl.appendChild(labelRowEl);

      contentPanel.appendChild(groupEl);
    });

    this.container.appendChild(contentPanel);
  }
}
