/**
 * VN Office UI Kit — Component Factory
 * Tự động đồng bộ 2 chiều với Command Bus
 */

import { ICONS } from "./icons.js";
import { globalCommandBus } from "../commands/command-bus.js";

/**
 * Tạo một Ribbon Button tự động gắn với Command Bus
 * @param {Object} options
 * @param {string} options.commandId
 * @param {boolean} [options.isLarge=false]
 * @param {string} [options.customIcon]
 * @param {string} [options.customLabel]
 * @returns {HTMLButtonElement}
 */
export function createCommandButton({ commandId, isLarge = false, customIcon, customLabel }) {
  const btn = document.createElement("button");
  btn.className = `vno-btn ${isLarge ? "vno-ribbon-btn-large" : "vno-ribbon-btn-small"}`;
  btn.setAttribute("type", "button");

  const def = globalCommandBus.getDefinition(commandId);
  const state = globalCommandBus.getState(commandId);

  const label = customLabel || (state ? state.label : (def ? def.label : commandId));
  const iconHtml = customIcon || (state && state.icon ? ICONS[state.icon] : (def && def.icon ? ICONS[def.icon] : ""));
  const shortcut = state ? state.shortcut : (def ? def.shortcut : "");

  btn.innerHTML = `${iconHtml ? `<span class="vno-btn-icon">${iconHtml}</span>` : ""}
                   <span class="vno-btn-label">${label}</span>`;

  if (shortcut) {
    btn.title = `${label} (${shortcut})`;
  } else {
    btn.title = label;
  }

  if (state) {
    if (!state.enabled) btn.disabled = true;
    if (state.checked) btn.classList.add("is-checked");
  }

  // Click handler: thực thi lệnh qua Command Bus
  btn.addEventListener("click", () => {
    globalCommandBus.execute(commandId);
  });

  // Tự động lắng nghe thay đổi trạng thái từ Command Bus
  globalCommandBus.subscribe((updatedId, newState) => {
    if (updatedId === commandId) {
      btn.disabled = !newState.enabled;
      if (newState.checked) {
        btn.classList.add("is-checked");
      } else {
        btn.classList.remove("is-checked");
      }
      if (newState.label) {
        const labelSpan = btn.querySelector(".vno-btn-label");
        if (labelSpan) labelSpan.textContent = newState.label;
      }
    }
  });

  return btn;
}

/**
 * Tạo một Dropdown Select gắn với Command Bus
 */
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
    if (commandId) {
      globalCommandBus.execute(commandId, val);
    }
    if (onChange) onChange(val);
  });

  return select;
}

/**
 * Hiển thị Hộp thoại chuẩn hóa VN Office Dialog
 */
export function showDialog({ title, content, onConfirm, confirmText = "Đồng ý", cancelText = "Hủy bỏ" }) {
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";

  overlay.innerHTML = `
    <div class="vno-dialog-box" role="dialog" aria-modal="true">
      <div class="vno-dialog-header">
        <span>${title}</span>
        <button class="vno-btn vno-dialog-close" aria-label="Đóng">&times;</button>
      </div>
      <div class="vno-dialog-body">${content}</div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-dialog-cancel">${cancelText}</button>
        <button class="vno-btn vno-btn-primary vno-dialog-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  overlay.querySelector(".vno-dialog-close").addEventListener("click", close);
  overlay.querySelector(".vno-dialog-cancel").addEventListener("click", close);
  overlay.querySelector(".vno-dialog-confirm").addEventListener("click", () => {
    if (onConfirm) onConfirm();
    close();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}
