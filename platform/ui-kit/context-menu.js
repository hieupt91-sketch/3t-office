/**
 * 3T Office UI Kit — Shared Context Menu Component with Submenus
 * Tuân thủ quy định AGENTS.md:
 * - Dùng chung giữa các ứng dụng Doc, Sheet, Slide (platform/ui-kit).
 * - Hỗ trợ đầy đủ menu cấp 2 (submenu): mũi tên, mở khi rê chuột hoặc ArrowRight, đóng bằng Esc/ArrowLeft.
 * - Điều hướng bàn phím chuẩn WAI-ARIA: role="menu", role="menuitem", aria-haspopup="true", aria-expanded.
 * - Tự động đảo hướng (boundary flipping) chống tràn màn hình.
 * - Không dùng tên thương hiệu Microsoft trong giao diện.
 */

import { globalCommandBus } from "../commands/command-bus.js";

let activeContextMenuInstance = null;

export class ContextMenu {
  constructor(options = {}) {
    this.options = options;
    this.items = options.items || [];
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.ariaLabel = options.ariaLabel || "Menu ngữ cảnh";
    this.className = options.className || "";
    this.previousFocus = options.previousFocus || (typeof document !== "undefined" ? document.activeElement : null);
    this.onClose = options.onClose || null;

    this.rootMenuEl = null;
    this.activeSubmenu = null; // { menuEl, parentBtn, instance, timer }
    this.parentMenu = options.parentMenu || null;
    this.parentBtn = options.parentBtn || null;
    this.isSubmenu = Boolean(options.isSubmenu);

    this._onDocumentClick = this._onDocumentClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._hoverOpenTimer = null;
    this._hoverCloseTimer = null;
  }

  show() {
    if (typeof document === "undefined" || !document.body) return this;

    // Nếu là root menu và có instance khác đang mở thì đóng trước
    if (!this.isSubmenu) {
      if (activeContextMenuInstance && activeContextMenuInstance !== this) {
        activeContextMenuInstance.close();
      }
      activeContextMenuInstance = this;
    }

    const menuEl = document.createElement("div");
    menuEl.className = `vno-context-menu ${this.className} ${this.isSubmenu ? "vno-context-submenu" : ""}`.trim();
    menuEl.setAttribute("role", "menu");
    menuEl.setAttribute("aria-label", this.ariaLabel);
    menuEl.setAttribute("tabindex", "-1");

    this._renderItems(menuEl, this.items);

    document.body.appendChild(menuEl);
    this.rootMenuEl = menuEl;

    this._positionMenu(menuEl);

    // Sự kiện bàn phím và outside click
    menuEl.addEventListener("keydown", this._onKeyDown);

    if (!this.isSubmenu) {
      // Tránh bắt chính sự kiện click/mousedown kích hoạt mở menu
      setTimeout(() => {
        if (!this.rootMenuEl) return;
        document.addEventListener("mousedown", this._onDocumentClick, true);
        document.addEventListener("contextmenu", this._onDocumentClick, true);
      }, 10);
    }

    // Tự động focus vào item hợp lệ đầu tiên
    this.focusFirstItem();

    return this;
  }

  _renderItems(container, items) {
    container.innerHTML = "";
    for (const item of items) {
      if (item.sep) {
        const sep = document.createElement("div");
        sep.className = "vno-context-menu-sep";
        sep.setAttribute("role", "separator");
        container.appendChild(sep);
        continue;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      const hasSubmenu = Array.isArray(item.items) && item.items.length > 0;
      const isDisabled = Boolean(item.disabled);

      // Thêm class tương thích cho cả Doc và Sheet (.vno-context-menu-item, .vno-sheet-context-item)
      btn.className = [
        "vno-context-menu-item",
        this.className.includes("vno-sheet") ? "vno-sheet-context-item" : "",
        hasSubmenu ? "vno-has-submenu" : "",
        isDisabled ? "vno-disabled" : "",
        item.className || ""
      ].filter(Boolean).join(" ");

      btn.setAttribute("role", "menuitem");
      btn.setAttribute("tabindex", "-1");
      if (isDisabled) {
        btn.setAttribute("aria-disabled", "true");
        btn.disabled = true;
      }
      if (hasSubmenu) {
        btn.setAttribute("aria-haspopup", "true");
        btn.setAttribute("aria-expanded", "false");
      }
      if (item.title) {
        btn.title = item.title;
      }

      // Icon (nếu có)
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "vno-context-menu-icon";
        iconSpan.innerHTML = item.icon;
        btn.appendChild(iconSpan);
      }

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.className = "vno-context-menu-label";
      labelSpan.textContent = item.label || "";
      btn.appendChild(labelSpan);

      // Shortcut
      if (item.shortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "vno-context-menu-shortcut";
        shortcutSpan.textContent = item.shortcut;
        btn.appendChild(shortcutSpan);
      }

      // Mũi tên submenu
      if (hasSubmenu) {
        const arrowSpan = document.createElement("span");
        arrowSpan.className = "vno-context-menu-arrow";
        arrowSpan.setAttribute("aria-hidden", "true");
        arrowSpan.innerHTML = `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M6 3.5l4.5 4.5-4.5 4.5-.7-.7 3.8-3.8-3.8-3.8z"/></svg>`;
        btn.appendChild(arrowSpan);
      }

      // Xử lý sự kiện chuột hover mở submenu
      if (hasSubmenu) {
        btn.addEventListener("mouseenter", () => {
          this._clearHoverTimers();
          this._hoverOpenTimer = setTimeout(() => {
            this._openSubmenu(btn, item);
          }, 120);
        });
        btn.addEventListener("mouseleave", (e) => {
          this._clearHoverTimers();
          // Kiểm tra xem chuột có di chuyển vào submenu đang mở không
          const subEl = this.activeSubmenu?.menuEl;
          const related = e.relatedTarget;
          if (subEl && (subEl === related || subEl.contains(related))) {
            return;
          }
          this._hoverCloseTimer = setTimeout(() => {
            if (this.activeSubmenu && this.activeSubmenu.parentBtn === btn) {
              this._closeSubmenu();
            }
          }, 200);
        });
      } else {
        btn.addEventListener("mouseenter", () => {
          this._clearHoverTimers();
          // Hover vào item thường -> đóng submenu anh em sau chút ít
          if (this.activeSubmenu) {
            this._hoverCloseTimer = setTimeout(() => {
              this._closeSubmenu();
            }, 100);
          }
        });
      }

      // Click
      btn.addEventListener("click", (event) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (hasSubmenu) {
          event.preventDefault();
          event.stopPropagation();
          if (this.activeSubmenu && this.activeSubmenu.parentBtn === btn) {
            this._closeSubmenu();
          } else {
            this._openSubmenu(btn, item, true);
          }
          return;
        }

        // Action bình thường: thực thi và đóng toàn bộ menu
        this._executeItem(item, event);
      });

      container.appendChild(btn);
    }
  }

  _clearHoverTimers() {
    if (this._hoverOpenTimer) {
      clearTimeout(this._hoverOpenTimer);
      this._hoverOpenTimer = null;
    }
    if (this._hoverCloseTimer) {
      clearTimeout(this._hoverCloseTimer);
      this._hoverCloseTimer = null;
    }
  }

  _openSubmenu(btn, item, focusFirst = false) {
    if (this.activeSubmenu) {
      if (this.activeSubmenu.parentBtn === btn) {
        if (focusFirst) this.activeSubmenu.instance.focusFirstItem();
        return;
      }
      this._closeSubmenu();
    }

    btn.classList.add("vno-submenu-open");
    btn.setAttribute("aria-expanded", "true");

    const parentRect = btn.getBoundingClientRect();
    const subInstance = new ContextMenu({
      items: item.items,
      x: parentRect.right + 2,
      y: parentRect.top - 4,
      ariaLabel: item.label,
      className: this.className,
      isSubmenu: true,
      parentMenu: this,
      parentBtn: btn,
      previousFocus: btn
    });

    subInstance.show();

    // Lắng nghe hover trên submenu container để giữ submenu không bị đóng
    subInstance.rootMenuEl.addEventListener("mouseenter", () => {
      this._clearHoverTimers();
      if (this.parentMenu) this.parentMenu._clearHoverTimers();
    });
    subInstance.rootMenuEl.addEventListener("mouseleave", (e) => {
      const related = e.relatedTarget;
      if (btn === related || btn.contains(related)) return;
      this._hoverCloseTimer = setTimeout(() => {
        this._closeSubmenu();
      }, 200);
    });

    this.activeSubmenu = {
      menuEl: subInstance.rootMenuEl,
      parentBtn: btn,
      instance: subInstance
    };

    if (focusFirst) {
      subInstance.focusFirstItem();
    }
  }

  _closeSubmenu() {
    this._clearHoverTimers();
    if (!this.activeSubmenu) return;
    const { menuEl, parentBtn, instance } = this.activeSubmenu;
    if (parentBtn) {
      parentBtn.classList.remove("vno-submenu-open");
      parentBtn.setAttribute("aria-expanded", "false");
    }
    instance.close();
    this.activeSubmenu = null;
  }

  _positionMenu(menuEl) {
    menuEl.style.position = "fixed";
    menuEl.style.left = "0px";
    menuEl.style.top = "0px";
    menuEl.style.visibility = "hidden";

    // Đo kích thước sau khi append vào DOM
    const rect = menuEl.getBoundingClientRect();
    const winW = (typeof window !== "undefined" && window.innerWidth) || 1200;
    const winH = (typeof window !== "undefined" && window.innerHeight) || 800;

    let targetX = this.x;
    let targetY = this.y;

    if (this.isSubmenu && this.parentBtn) {
      const parentRect = this.parentBtn.getBoundingClientRect();
      // Mặc định bên phải
      targetX = parentRect.right + 2;
      targetY = parentRect.top - 4;

      // Nếu tràn mép phải -> lật sang trái
      if (targetX + rect.width > winW - 8) {
        targetX = parentRect.left - rect.width - 2;
      }
    } else {
      // Root menu: nếu tràn mép phải -> lùi lại hoặc lật sang trái con trỏ chuột
      if (targetX + rect.width > winW - 8) {
        if (targetX - rect.width >= 8) {
          targetX = targetX - rect.width;
        } else {
          targetX = Math.max(8, winW - rect.width - 8);
        }
      }
    }

    // Kiểm tra mép dưới
    if (targetY + rect.height > winH - 8) {
      targetY = Math.max(8, winH - rect.height - 8);
    }

    // Đảm bảo không âm (ngoài màn hình bên trái / trên)
    targetX = Math.max(8, targetX);
    targetY = Math.max(8, targetY);

    menuEl.style.left = `${Math.round(targetX)}px`;
    menuEl.style.top = `${Math.round(targetY)}px`;
    menuEl.style.visibility = "visible";
  }

  _executeItem(item, event) {
    // Đóng toàn bộ chuỗi menu
    this.closeAll();

    try {
      if (typeof item.action === "function") {
        item.action(item, event);
      } else if (item.command) {
        globalCommandBus.execute(item.command, item.args);
      }
    } catch (err) {
      console.error("[ContextMenu] Lỗi thực thi mục menu:", err);
    }
  }

  _onKeyDown(e) {
    const actionItems = this.getNavigableItems();
    if (!actionItems.length) return;

    const currentIdx = actionItems.indexOf(document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      const nextIdx = currentIdx < actionItems.length - 1 ? currentIdx + 1 : 0;
      actionItems[nextIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : actionItems.length - 1;
      actionItems[prevIdx]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      actionItems[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      actionItems[actionItems.length - 1]?.focus();
    } else if (e.key === "ArrowRight") {
      // Nếu item hiện tại có submenu -> mở submenu và focus item con
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains("vno-has-submenu")) {
        e.preventDefault();
        e.stopPropagation();
        activeEl.click();
      }
    } else if (e.key === "ArrowLeft") {
      // Nếu là submenu -> đóng submenu hiện tại và quay về item cha
      if (this.isSubmenu && this.parentMenu) {
        e.preventDefault();
        e.stopPropagation();
        const parentBtn = this.parentBtn;
        this.parentMenu._closeSubmenu();
        parentBtn?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (this.isSubmenu && this.parentMenu) {
        const parentBtn = this.parentBtn;
        this.parentMenu._closeSubmenu();
        parentBtn?.focus();
      } else {
        this.closeAll();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains("vno-context-menu-item")) {
        e.preventDefault();
        e.stopPropagation();
        activeEl.click();
      }
    }
  }

  _onDocumentClick(e) {
    if (!this.rootMenuEl) return;
    // Kiểm tra xem click có nằm trong root menu hoặc bất kỳ submenu nào không
    let el = this;
    while (el) {
      if (el.rootMenuEl && el.rootMenuEl.contains(e.target)) return;
      el = el.activeSubmenu?.instance || null;
    }
    this.closeAll();
  }

  getNavigableItems() {
    if (!this.rootMenuEl) return [];
    return Array.from(this.rootMenuEl.querySelectorAll(".vno-context-menu-item:not([disabled]):not(.vno-disabled)"));
  }

  focusFirstItem() {
    const items = this.getNavigableItems();
    if (items.length > 0) {
      items[0].focus();
    } else if (this.rootMenuEl) {
      this.rootMenuEl.focus();
    }
  }

  close() {
    this._clearHoverTimers();
    if (this.activeSubmenu) {
      this.activeSubmenu.instance.close();
      this.activeSubmenu = null;
    }

    if (this.rootMenuEl) {
      this.rootMenuEl.removeEventListener("keydown", this._onKeyDown);
      this.rootMenuEl.remove();
      this.rootMenuEl = null;
    }

    if (!this.isSubmenu) {
      document.removeEventListener("mousedown", this._onDocumentClick, true);
      document.removeEventListener("contextmenu", this._onDocumentClick, true);

      if (activeContextMenuInstance === this) {
        activeContextMenuInstance = null;
      }

      if (this.previousFocus && typeof this.previousFocus.focus === "function") {
        try {
          this.previousFocus.focus();
        } catch (_) {}
      }

      if (typeof this.onClose === "function") {
        try { this.onClose(); } catch (_) {}
      }
    }
  }

  closeAll() {
    let top = this;
    while (top.parentMenu) {
      top = top.parentMenu;
    }
    top.close();
  }
}

/**
 * Hàm tiện ích mở Context Menu dùng chung
 */
export function showContextMenu(options = {}) {
  const menu = new ContextMenu(options);
  menu.show();
  return menu;
}

export function closeActiveContextMenu() {
  if (activeContextMenuInstance) {
    activeContextMenuInstance.closeAll();
  }
}
