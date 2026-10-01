/**
 * 3T Office Platform — Enterprise Ribbon KeyTips System (CH-8.2)
 * Bấm và thả Alt hiển thị huy hiệu phím tắt tiếng Việt trên ribbon tabs;
 * Bấm ký tự mở tab và hiển thị huy hiệu trên nút lệnh;
 * Esc quay lại từng cấp (buttons -> tabs -> close).
 */

export const TAB_KEYTIP_MAP = {
  // File
  file: "T",
  tệp: "T",
  // Common tabs
  home: "D",
  "trang đầu": "D",
  insert: "C",
  "chèn": "C",
  pageLayout: "B",
  layout: "B",
  "bố cục": "B",
  "bố trí trang": "B",
  design: "K",
  "thiết kế": "K",
  formulas: "M",
  "công thức": "M",
  data: "L",
  "dữ liệu": "L",
  references: "S",
  "tham chiếu": "S",
  mailings: "U",
  "gửi thư": "U",
  "trộn thư": "U",
  transitions: "P",
  "chuyển tiếp": "P",
  animations: "H",
  "hoạt hình": "H",
  slideshow: "S",
  "trình chiếu": "S",
  review: "X",
  "xem lại": "X",
  "xem xét": "X",
  "đánh giá": "X",
  view: "V",
  "xem": "V",
  "chế độ xem": "V",
  help: "G",
  "trợ giúp": "G",
  ai: "A",
  "3t ai": "A",
  "trợ lý 3t ai": "A"
};

export const BACKSTAGE_KEYTIP_MAP = [
  { selector: "#vno-backstage-nav-home", key: "N", label: "Mới / Trang chính" },
  { selector: '[data-backstage-cmd="common.file.new"]', key: "N", label: "Mới" },
  { selector: '[data-backstage-cmd="common.file.open"]', key: "O", label: "Mở" },
  { selector: '[data-backstage-cmd="common.file.save"]', key: "S", label: "Lưu" },
  { selector: '[data-backstage-cmd="common.file.saveAs"]', key: "A", label: "Lưu thành" },
  { selector: '#vno-backstage-nav-print, [data-backstage-tab="print"]', key: "P", label: "In" },
  { selector: '[data-backstage-cmd="common.file.exportPdf"]', key: "E", label: "Xuất PDF" },
  { selector: "#vno-backstage-close", key: "C", label: "Đóng" },
  { selector: "#vno-backstage-options", key: "T", label: "Tùy chọn" },
  { selector: "#vno-backstage-about", key: "G", label: "Giới thiệu" }
];

const BUTTON_KEYS_POOL = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
  "A", "S", "D", "F", "G", "H", "J", "K", "L",
  "Z", "X", "C", "V", "B", "N", "M"
];

export class KeyTipsManager {
  constructor() {
    this.isActive = false;
    this.level = 0; // 0 = off, 1 = tabs, 2 = buttons
    this.container = null;
    this.activeBadges = []; // Array<{ key: string, element: HTMLElement, target: HTMLElement }>
    this._onDocumentClick = (e) => this._handleOutsideClick(e);
  }

  toggle() {
    if (this.isActive) {
      this.hide();
    } else {
      this.showLevel1();
    }
  }

  showLevel1() {
    this._clearContainer();
    if (typeof document === "undefined" || !document.body) return;

    this.container = document.createElement("div");
    this.container.id = "vno-keytips-overlay";
    this.container.className = "vno-keytips-overlay";
    this.container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999999;";

    this.activeBadges = [];
    this.level = 1;
    this.isActive = true;

    // 1. Tab Tệp (File tab button)
    const fileBtn = document.querySelector(".vno-ribbon-tab-file");
    if (fileBtn && fileBtn.offsetWidth > 0) {
      this._createBadge(fileBtn, "T", 1);
    }

    // 2. Các Tab chức năng
    const tabButtons = Array.from(document.querySelectorAll(".vno-ribbon-tab"));
    const usedKeys = new Set(["T"]);

    tabButtons.forEach((tab, index) => {
      if (tab.offsetWidth <= 0 || tab.offsetHeight <= 0) return;
      const tabId = tab.id.replace("vno-ribbon-tab-", "");
      const tabText = tab.textContent.trim().toLowerCase();

      let assignedKey = TAB_KEYTIP_MAP[tabId] || TAB_KEYTIP_MAP[tabText];
      if (!assignedKey || usedKeys.has(assignedKey)) {
        // Fallback: tìm ký tự đầu tiên chưa bị trùng
        for (const ch of tabText.toUpperCase()) {
          if (/[A-Z0-9]/.test(ch) && !usedKeys.has(ch)) {
            assignedKey = ch;
            break;
          }
        }
      }
      if (!assignedKey || usedKeys.has(assignedKey)) {
        assignedKey = String(index + 1);
      }
      usedKeys.add(assignedKey);

      this._createBadge(tab, assignedKey, 1, () => {
        tab.click();
        this.showLevel2();
      });
    });

    document.body.appendChild(this.container);
    document.addEventListener("click", this._onDocumentClick, true);
  }

  showLevel2() {
    this._clearContainer();
    if (typeof document === "undefined" || !document.body) return;

    this.container = document.createElement("div");
    this.container.id = "vno-keytips-overlay";
    this.container.className = "vno-keytips-overlay";
    this.container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999999;";

    this.activeBadges = [];
    this.level = 2;
    this.isActive = true;

    // Check if Backstage is currently active
    const backstage = document.querySelector(".vno-backstage-modal");
    if (backstage && backstage.offsetWidth > 0) {
      this._renderBackstageKeyTips(backstage);
      document.body.appendChild(this.container);
      return;
    }

    // Interactive controls inside ribbon content
    const ribbonContent = document.querySelector(".vno-ribbon-content");
    if (!ribbonContent) {
      this.hide();
      return;
    }

    const controls = Array.from(ribbonContent.querySelectorAll(
      '.vno-btn, .vno-ribbon-btn, .vno-ribbon-checkbox, .vno-dropdown, .vno-ribbon-dialog-launcher, select.vno-select'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.closest(".is-hidden") && !el.disabled;
    });

    let poolIdx = 0;
    const usedKeys = new Set();

    controls.forEach((ctrl) => {
      const cmdId = ctrl.getAttribute("data-command-id") || ctrl.getAttribute("data-command") || "";
      let key = "";

      // Mnemonics ưu tiên cho các lệnh phổ biến
      if (cmdId.includes("bold")) key = "1";
      else if (cmdId.includes("italic")) key = "2";
      else if (cmdId.includes("underline")) key = "3";
      else if (cmdId.includes("paste")) key = "V";
      else if (cmdId.includes("copy")) key = "C";
      else if (cmdId.includes("cut")) key = "X";
      else if (cmdId.includes("undo")) key = "Z";
      else if (cmdId.includes("redo")) key = "Y";

      if (!key || usedKeys.has(key)) {
        while (poolIdx < BUTTON_KEYS_POOL.length && usedKeys.has(BUTTON_KEYS_POOL[poolIdx])) {
          poolIdx++;
        }
        key = poolIdx < BUTTON_KEYS_POOL.length ? BUTTON_KEYS_POOL[poolIdx++] : `B${poolIdx++}`;
      }

      usedKeys.add(key);
      this._createBadge(ctrl, key, 2, () => {
        ctrl.click();
        this.hide();
      });
    });

    document.body.appendChild(this.container);
  }

  _renderBackstageKeyTips(backstage) {
    BACKSTAGE_KEYTIP_MAP.forEach(item => {
      const target = backstage.querySelector(item.selector);
      if (target && target.offsetWidth > 0 && target.offsetHeight > 0) {
        this._createBadge(target, item.key, 2, () => {
          target.click();
          this.hide();
        });
      }
    });
  }

  _createBadge(targetEl, key, level, customAction) {
    const rect = targetEl.getBoundingClientRect();
    const badge = document.createElement("div");
    badge.className = "vno-keytip-badge";
    badge.setAttribute("data-keytip-key", key);
    badge.setAttribute("data-keytip-level", String(level));
    badge.textContent = key;

    badge.style.cssText = `
      position: absolute;
      left: ${Math.round(rect.left + rect.width / 2 - 9)}px;
      top: ${Math.round(rect.bottom - 6)}px;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      border: 1px solid #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      z-index: 1000000;
      line-height: 1.2;
      text-transform: uppercase;
    `;

    const triggerAction = () => {
      if (typeof customAction === "function") {
        customAction();
      } else {
        targetEl.click();
        if (level === 1) {
          this.showLevel2();
        } else {
          this.hide();
        }
      }
    };

    badge.addEventListener("click", triggerAction);
    this.container.appendChild(badge);
    this.activeBadges.push({ key: key.toUpperCase(), element: badge, target: targetEl, action: triggerAction });
  }

  handleKeyDown(e) {
    if (!this.isActive) return false;

    // Esc: lùi cấp (Level 2 -> Level 1, Level 1 -> Close)
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (this.level === 2) {
        // Nếu đang trong backstage, đóng backstage trước
        const backstage = document.querySelector(".vno-backstage-modal");
        if (backstage) {
          const closeBtn = backstage.querySelector("#vno-backstage-back");
          closeBtn?.click();
        }
        this.showLevel1();
      } else {
        this.hide();
      }
      return true;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) {
      return false;
    }

    const key = e.key.toUpperCase();
    const match = this.activeBadges.find(b => b.key === key);
    if (match) {
      e.preventDefault();
      e.stopPropagation();
      match.action();
      return true;
    }

    return false;
  }

  hide() {
    this._clearContainer();
    this.isActive = false;
    this.level = 0;
    this.activeBadges = [];
    if (typeof document !== "undefined") {
      document.removeEventListener("click", this._onDocumentClick, true);
    }
  }

  _clearContainer() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  _handleOutsideClick(e) {
    if (!this.isActive) return;
    if (e.target?.closest?.(".vno-keytip-badge")) return;
    this.hide();
  }
}

export const globalKeyTipsManager = new KeyTipsManager();
