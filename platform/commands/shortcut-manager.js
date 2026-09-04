/**
 * VN Office Platform — Enterprise Shortcut & KeyTips Manager
 * Tương thích 100% hệ thống phím tắt Microsoft Office & LibreOffice
 * Tuân thủ quy định 01-architecture/COMMAND-ARCHITECTURE.md & 03-ui-ux/ACCESSIBILITY.md
 */

import { globalCommandBus } from "./command-bus.js";

export class ShortcutManager {
  constructor() {
    /** @type {Map<string, string>} Chuỗi phím chuẩn hóa -> Command ID */
    this._shortcuts = new Map();
    this._keytipsActive = false;
    this._keytipsContainer = null;
    this._attachedWindow = null;
  }

  /**
   * Đăng ký một phím tắt cho một lệnh
   * @param {string} keyCombo Chuỗi phím (vd: "Ctrl+S", "Ctrl+Shift+L", "F5", "Alt+=")
   * @param {string} commandId
   */
  bind(keyCombo, commandId) {
    const normalized = this._normalizeCombo(keyCombo);
    this._shortcuts.set(normalized, commandId);
  }

  _normalizeCombo(combo) {
    const parts = combo.split("+").map(p => p.trim());
    let ctrl = false, alt = false, shift = false, meta = false;
    let key = "";

    for (const p of parts) {
      const pLower = p.toLowerCase();
      if (pLower === "ctrl" || pLower === "control") ctrl = true;
      else if (pLower === "alt") alt = true;
      else if (pLower === "shift") shift = true;
      else if (pLower === "meta" || pLower === "cmd" || pLower === "win") meta = true;
      else key = p.toUpperCase();
    }

    return `${ctrl ? "CTRL+" : ""}${alt ? "ALT+" : ""}${shift ? "SHIFT+" : ""}${meta ? "META+" : ""}${key}`;
  }

  /**
   * Gắn bộ lắng nghe sự kiện bàn phím toàn cục
   */
  attach(windowObj = window) {
    // BẮT BUỘC idempotent: mỗi AppShell (Writer/Sheet/Slides) tự new AppShell() và gọi
    // attach() lại mỗi lần chuyển app — nếu không chặn trùng, mỗi lần chuyển app sẽ cộng
    // dồn thêm 1 cặp listener keydown/keyup trên window, khiến MỌI phím tắt (Ctrl+Z, Ctrl+S,
    // Ctrl+B, F5...) bị thực thi lặp lại nhiều lần sau khi người dùng đổi app dù chỉ 1 lần.
    // Lỗi thật đã phát hiện: Ctrl+Z gọi undo() 2 lần liên tiếp, hoàn tác luôn cả bước trước đó.
    if (this._attachedWindow === windowObj) return;
    this._attachedWindow = windowObj;
    windowObj.addEventListener("keydown", (e) => this._handleKeyDown(e), true);
    windowObj.addEventListener("keyup", (e) => this._handleKeyUp(e), true);
  }

  _handleKeyDown(e) {
    // 1. Xử lý phím Alt độc lập để bật/tắt KeyTips (Chuẩn Office)
    if (e.key === "Alt" && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      // Để keyup xử lý toggle keytips
      return;
    }

    // Nếu KeyTips đang bật và người dùng bấm phím chữ
    if (this._keytipsActive && !e.ctrlKey && !e.metaKey) {
      const letter = e.key.toUpperCase();
      if (this._handleKeyTipLetter(letter)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // 2. Kiểm tra phím tắt thông thường
    let keyName = e.key.toUpperCase();
    if (e.key === " ") keyName = "SPACE";
    if (e.key === "=") keyName = "=";
    if (e.key === "+") keyName = "+";
    if (e.key === "-") keyName = "-";
    if (e.key === ";") keyName = ";";
    if (e.key === ":") keyName = ":";
    if (e.key === "[") keyName = "[";
    if (e.key === "]") keyName = "]";

    // Tạo chuỗi tổ hợp phím
    const combo = `${e.ctrlKey || e.metaKey ? "CTRL+" : ""}${e.altKey ? "ALT+" : ""}${e.shiftKey ? "SHIFT+" : ""}${keyName}`;

    if (this._shortcuts.has(combo)) {
      const cmdId = this._shortcuts.get(combo);
      e.preventDefault();
      e.stopPropagation();
      globalCommandBus.execute(cmdId);
      return;
    }

    // Một số phím đơn không có Ctrl/Alt: F1..F12, Escape, Delete
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      if (this._shortcuts.has(keyName)) {
        const cmdId = this._shortcuts.get(keyName);
        e.preventDefault();
        e.stopPropagation();
        globalCommandBus.execute(cmdId);
      }
    }
  }

  _handleKeyUp(e) {
    if (e.key === "Alt" && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      this.toggleKeyTips();
    } else if (e.key === "Escape" && this._keytipsActive) {
      this.toggleKeyTips(false);
    }
  }

  toggleKeyTips(forceState) {
    this._keytipsActive = forceState !== undefined ? forceState : !this._keytipsActive;
    
    if (this._keytipsActive) {
      this._showKeyTips();
    } else {
      this._hideKeyTips();
    }
  }

  _showKeyTips() {
    this._hideKeyTips();
    this._keytipsContainer = document.createElement("div");
    this._keytipsContainer.id = "vno-keytips-overlay";
    this._keytipsContainer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;";

    // Thêm keytips cho các Tab Ribbon
    const tabs = document.querySelectorAll(".vno-ribbon-tab, .vno-ribbon-tab-file");
    const tabKeys = ["F", "H", "N", "P", "M", "A", "T", "S", "R", "W", "J"];

    tabs.forEach((tab, idx) => {
      const rect = tab.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const badge = document.createElement("div");
        const keyChar = tabKeys[idx] || `${idx + 1}`;
        badge.className = "vno-keytip-badge";
        badge.textContent = keyChar;
        badge.style.cssText = `position:absolute;left:${rect.left + rect.width / 2 - 8}px;top:${rect.bottom - 8}px;background:#1e293b;color:#ffffff;font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;box-shadow:0 2px 5px rgba(0,0,0,0.3);border:1px solid #ffffff;font-family:sans-serif;pointer-events:auto;cursor:pointer;`;
        badge.dataset.targetTab = tab.textContent.trim();
        badge.addEventListener("click", () => tab.click());
        this._keytipsContainer.appendChild(badge);
      }
    });

    document.body.appendChild(this._keytipsContainer);
  }

  _hideKeyTips() {
    if (this._keytipsContainer && this._keytipsContainer.parentNode) {
      this._keytipsContainer.parentNode.removeChild(this._keytipsContainer);
    }
    this._keytipsContainer = null;
    this._keytipsActive = false;
  }

  _handleKeyTipLetter(letter) {
    const badge = this._keytipsContainer?.querySelector(`.vno-keytip-badge`);
    const tabs = Array.from(document.querySelectorAll(".vno-ribbon-tab, .vno-ribbon-tab-file"));
    const tabKeys = ["F", "H", "N", "P", "M", "A", "T", "S", "R", "W", "J"];
    const idx = tabKeys.indexOf(letter);

    if (idx !== -1 && tabs[idx]) {
      tabs[idx].click();
      this.toggleKeyTips(false);
      return true;
    }
    return false;
  }
}

export const globalShortcutManager = new ShortcutManager();
