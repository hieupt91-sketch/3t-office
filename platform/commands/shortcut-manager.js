/**
 * 3T Office Platform — Enterprise Shortcut & KeyTips Manager
 * Tương thích 100% hệ thống phím tắt Microsoft Office & LibreOffice
 * Tuân thủ quy định 01-architecture/COMMAND-ARCHITECTURE.md & 03-ui-ux/ACCESSIBILITY.md
 */

import { globalCommandBus } from "./command-bus.js";

export class ShortcutManager {
  constructor() {
    /** @type {Map<string, string>} Chuỗi phím chuẩn hóa -> Command ID */
    this._shortcuts = new Map();
    /** @type {Map<string, Map<string, string>>} Scope -> (phím -> Command ID) */
    this._scopedShortcuts = new Map([["common", new Map()]]);
    this._activeScope = null;
    this._keytipsActive = false;
    this._keytipsContainer = null;
    this._attachedWindow = null;
  }

  /**
   * Đăng ký một phím tắt cho một lệnh
   * @param {string} keyCombo Chuỗi phím (vd: "Ctrl+S", "Ctrl+Shift+L", "F5", "Alt+=")
   * @param {string} commandId
   */
  bind(keyCombo, commandId, scope = "common") {
    const normalized = this._normalizeCombo(keyCombo);
    if (!this._scopedShortcuts.has(scope)) this._scopedShortcuts.set(scope, new Map());
    this._scopedShortcuts.get(scope).set(normalized, commandId);
    this._rebuildActiveShortcuts();
  }

  /**
   * Chỉ kích hoạt shortcut của ứng dụng đang hiển thị. Các command app có chủ ý
   * dùng chung tổ hợp (ví dụ Ctrl+B và Ctrl+M) không được ghi đè âm thầm nhau.
   */
  setActiveScope(scope) {
    this._activeScope = scope || null;
    this._rebuildActiveShortcuts();
  }

  /** Scope đang kích hoạt (để một chế độ toàn màn hình tạm tắt phím tắt app rồi trả lại). */
  getActiveScope() {
    return this._activeScope;
  }

  _rebuildActiveShortcuts() {
    this._shortcuts.clear();
    const common = this._scopedShortcuts.get("common");
    if (common) for (const [combo, commandId] of common) this._shortcuts.set(combo, commandId);
    const active = this._activeScope && this._scopedShortcuts.get(this._activeScope);
    if (active) for (const [combo, commandId] of active) this._shortcuts.set(combo, commandId);
  }

  _normalizeCombo(combo) {
    // `split("+")` không phân biệt được dấu '+' dùng làm DẤU PHÂN TÁCH modifier với
    // dấu '+' là CHÍNH PHÍM thật (vd "Ctrl+Shift++" cho Chỉ số trên — LibreOffice/Word
    // đều dùng tổ hợp này). Chuỗi đó split ra phần tử rỗng cuối cùng ("", sau dấu '+'
    // cuối) — nếu bỏ qua phần tử rỗng như trước, phím thật ('+') bị mất, khiến tổ hợp
    // chuẩn hóa thành "CTRL+SHIFT+" (thiếu phím) và không bao giờ khớp với phím bấm
    // thật. Phần tử rỗng Ở VỊ TRÍ CUỐI nghĩa là phím thật chính là '+'.
    const parts = combo.split("+").map(p => p.trim());
    let ctrl = false, alt = false, shift = false, meta = false;
    let key = "";

    parts.forEach((p, i) => {
      if (p === "" && i === parts.length - 1) {
        key = "+";
        return;
      }
      const pLower = p.toLowerCase();
      if (pLower === "ctrl" || pLower === "control") ctrl = true;
      else if (pLower === "alt") alt = true;
      else if (pLower === "shift") shift = true;
      else if (pLower === "meta" || pLower === "cmd" || pLower === "win") meta = true;
      else {
        let k = p.toUpperCase();
        if (k === "ARROWUP") k = "UP";
        else if (k === "ARROWDOWN") k = "DOWN";
        else if (k === "ARROWLEFT") k = "LEFT";
        else if (k === "ARROWRIGHT") k = "RIGHT";
        key = k;
      }
    });

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
    if (e.key === "`") keyName = "`";
    if (e.key === "~") keyName = "~";
    if (e.key === "ArrowUp") keyName = "UP";
    if (e.key === "ArrowDown") keyName = "DOWN";
    if (e.key === "ArrowLeft") keyName = "LEFT";
    if (e.key === "ArrowRight") keyName = "RIGHT";

    // Tạo chuỗi tổ hợp phím
    const combo = `${e.ctrlKey || e.metaKey ? "CTRL+" : ""}${e.altKey ? "ALT+" : ""}${e.shiftKey ? "SHIFT+" : ""}${keyName}`;

    // Guard: single keys without modifier in text inputs or contenteditable must type/delete naturally
    const target = e.target;
    const isInput = target && (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    if (isInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
      return;
    }
    // Guard: Animation Pane handles its own Delete and Alt+Shift reorder
    if (target?.closest?.(".vno-animation-pane")) {
      if (keyName === "DELETE" || (e.altKey && e.shiftKey)) {
        return;
      }
    }

    let cmdId = this._shortcuts.get(combo);
    if (!cmdId && (e.shiftKey || keyName === ":")) {
      cmdId = this._shortcuts.get(combo.replace(":", ";"));
    }
    if (!cmdId && (e.shiftKey || keyName === "~")) {
      cmdId = this._shortcuts.get(combo.replace("~", "`"));
    }

    if (cmdId) {
      e.preventDefault();
      e.stopPropagation();
      globalCommandBus.execute(cmdId);
      return;
    }

    // Một số phím đơn không có Ctrl/Alt: F1..F12, Escape, Delete
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      if (this._shortcuts.has(keyName)) {
        const singleCmdId = this._shortcuts.get(keyName);
        e.preventDefault();
        e.stopPropagation();
        globalCommandBus.execute(singleCmdId);
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
