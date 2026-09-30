/**
 * VN Office UI Kit — Notification Bar Component
 *
 * Thanh thông báo ngữ cảnh dùng chung (Office-style InfoBar / Security Warning Bar).
 * Vị trí: Dưới ribbon, phía trên không gian làm việc (lưới/trang).
 * Đạt chuẩn WCAG 2.1 AA cho cả theme Sáng (Light) và Tối (Dark).
 * Hỗ trợ bàn phím (Tab, Esc), ARIA live polite, responsive không tràn tại 1024px.
 */

import { ICONS } from "./icons.js";

const SECURITY_SHIELD_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

const INFO_CIRCLE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

export class NotificationBar {
  /**
   * @param {Object} options
   * @param {string} options.message - Nội dung thông báo
   * @param {"warning"|"info"|"success"|"error"} [options.type="warning"] - Loại thông báo
   * @param {string} [options.icon] - SVG icon tùy chọn
   * @param {{ label: string, onClick: (event: MouseEvent) => void, ariaLabel?: string }} [options.action] - Nút hành động tùy chọn
   * @param {Array<{ label: string, onClick: (event: MouseEvent) => void, ariaLabel?: string }>} [options.actions] - Nhiều hành động tùy chọn
   * @param {boolean} [options.dismissible=true] - Cho phép đóng thông báo
   * @param {() => void} [options.onDismiss] - Callback khi thanh bị đóng
   */
  constructor(options = {}) {
    this.options = {
      message: options.message || "",
      type: options.type || "warning",
      icon: options.icon || (options.type === "info" ? INFO_CIRCLE_ICON : SECURITY_SHIELD_ICON),
      action: options.action || null,
      actions: Array.isArray(options.actions) ? options.actions.filter((item) => item && item.label) : [],
      dismissible: options.dismissible !== false,
      onDismiss: options.onDismiss || null
    };

    this.element = null;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Khởi tạo DOM element của NotificationBar
   * @returns {HTMLElement}
   */
  render() {
    const bar = document.createElement("div");
    bar.className = `vno-notification-bar vno-notification-bar--${this.options.type}`;
    bar.setAttribute("role", "status");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("tabindex", "-1");

    // Phần nội dung (icon + thông điệp)
    const content = document.createElement("div");
    content.className = "vno-notification-bar-content";

    const iconSpan = document.createElement("span");
    iconSpan.className = "vno-notification-bar-icon";
    iconSpan.setAttribute("aria-hidden", "true");
    iconSpan.innerHTML = this.options.icon;
    content.appendChild(iconSpan);

    const messageSpan = document.createElement("span");
    messageSpan.className = "vno-notification-bar-message";
    messageSpan.textContent = this.options.message;
    content.appendChild(messageSpan);

    bar.appendChild(content);

    // Phần hành động (nút hành động + nút đóng)
    const actions = document.createElement("div");
    actions.className = "vno-notification-bar-actions";

    const actionItems = [
      ...(this.options.action && this.options.action.label ? [this.options.action] : []),
      ...this.options.actions
    ];
    for (const action of actionItems) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "vno-btn vno-notification-bar-action-btn";
      actionBtn.textContent = action.label;
      if (action.ariaLabel) {
        actionBtn.setAttribute("aria-label", action.ariaLabel);
      }
      actionBtn.addEventListener("click", (e) => {
        action.onClick?.(e);
      });
      actions.appendChild(actionBtn);
    }

    if (this.options.dismissible) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "vno-notification-bar-close-btn";
      closeBtn.setAttribute("aria-label", "Đóng thông báo");
      closeBtn.setAttribute("title", "Đóng");
      closeBtn.innerHTML = ICONS.close || "&times;";
      closeBtn.addEventListener("click", () => this.dismiss());
      actions.appendChild(closeBtn);
    }

    bar.appendChild(actions);

    // Phím Esc: khi focus nằm trong notification bar, Esc sẽ đóng thanh
    bar.addEventListener("keydown", this._handleKeyDown);

    this.element = bar;
    return bar;
  }

  _handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss();
    }
  }

  /**
   * Gắn thanh thông báo vào một container element
   * @param {HTMLElement} container
   */
  mount(container) {
    if (!container) return;
    if (!this.element) this.render();
    container.appendChild(this.element);
  }

  /**
   * Đóng và hủy thanh thông báo
   */
  dismiss() {
    if (!this.element) return;
    this.element.removeEventListener("keydown", this._handleKeyDown);
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    const onDismiss = this.options.onDismiss;
    this.element = null;
    if (typeof onDismiss === "function") {
      onDismiss();
    }
  }

  /**
   * Cập nhật thông điệp hiển thị trên thanh
   * @param {string} newMessage
   */
  setMessage(newMessage) {
    this.options.message = newMessage;
    if (this.element) {
      const msgEl = this.element.querySelector(".vno-notification-bar-message");
      if (msgEl) msgEl.textContent = newMessage;
    }
  }
}

/**
 * Hàm factory tiện ích để tạo nhanh NotificationBar
 * @param {Object} options
 * @returns {NotificationBar}
 */
export function createNotificationBar(options) {
  return new NotificationBar(options);
}
