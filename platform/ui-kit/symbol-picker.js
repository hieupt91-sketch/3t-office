/**
 * 3T Office UI Kit — Shared Symbol Picker
 * Hộp thoại chọn ký tự đặc biệt dùng chung Writer và Slides.
 */

import { t, getLocale } from "../i18n/i18n.js";

export const SYMBOL_CATEGORIES = [
  {
    id: "common",
    nameVi: "Thường dùng",
    nameEn: "Common",
    items: [
      { char: "©", nameVi: "Bản quyền", nameEn: "Copyright" },
      { char: "®", nameVi: "Đăng ký", nameEn: "Registered" },
      { char: "™", nameVi: "Nhãn hiệu", nameEn: "Trademark" },
      { char: "°", nameVi: "Độ", nameEn: "Degree" },
      { char: "±", nameVi: "Cộng trừ", nameEn: "Plus-minus" },
      { char: "§", nameVi: "Mục", nameEn: "Section" },
      { char: "¶", nameVi: "Đoạn văn", nameEn: "Pilcrow" },
      { char: "•", nameVi: "Chấm tròn", nameEn: "Bullet" },
      { char: "…", nameVi: "Ba chấm", nameEn: "Ellipsis" },
      { char: "–", nameVi: "Gạch ngang", nameEn: "En dash" },
      { char: "—", nameVi: "Gạch dài", nameEn: "Em dash" },
      { char: "€", nameVi: "Euro", nameEn: "Euro" },
      { char: "£", nameVi: "Bảng Anh", nameEn: "Pound" },
      { char: "¥", nameVi: "Yên", nameEn: "Yen" },
      { char: "₫", nameVi: "Đồng Việt Nam", nameEn: "Dong" }
    ]
  },
  {
    id: "math",
    nameVi: "Toán học",
    nameEn: "Math",
    items: [
      { char: "×", nameVi: "Nhân", nameEn: "Multiply" },
      { char: "÷", nameVi: "Chia", nameEn: "Divide" },
      { char: "≈", nameVi: "Xấp xỉ", nameEn: "Approximately" },
      { char: "≠", nameVi: "Khác", nameEn: "Not equal" },
      { char: "≤", nameVi: "Nhỏ hơn hoặc bằng", nameEn: "Less or equal" },
      { char: "≥", nameVi: "Lớn hơn hoặc bằng", nameEn: "Greater or equal" },
      { char: "∞", nameVi: "Vô cực", nameEn: "Infinity" },
      { char: "√", nameVi: "Căn bậc hai", nameEn: "Square root" },
      { char: "∑", nameVi: "Tổng", nameEn: "Sum" },
      { char: "∏", nameVi: "Tích", nameEn: "Product" },
      { char: "∫", nameVi: "Tích phân", nameEn: "Integral" },
      { char: "∂", nameVi: "Đạo hàm riêng", nameEn: "Partial" },
      { char: "∆", nameVi: "Delta", nameEn: "Delta" },
      { char: "π", nameVi: "Pi", nameEn: "Pi" },
      { char: "µ", nameVi: "Mu", nameEn: "Mu" }
    ]
  },
  {
    id: "arrows",
    nameVi: "Mũi tên",
    nameEn: "Arrows",
    items: [
      { char: "←", nameVi: "Trái", nameEn: "Left" },
      { char: "→", nameVi: "Phải", nameEn: "Right" },
      { char: "↑", nameVi: "Lên", nameEn: "Up" },
      { char: "↓", nameVi: "Xuống", nameEn: "Down" },
      { char: "↔", nameVi: "Hai chiều", nameEn: "Left-right" },
      { char: "⇒", nameVi: "Suy ra", nameEn: "Implies" },
      { char: "⇐", nameVi: "Suy từ", nameEn: "Implied by" },
      { char: "⇔", nameVi: "Tương đương", nameEn: "Iff" }
    ]
  }
];

export function listAllSymbols() {
  return SYMBOL_CATEGORIES.flatMap(category => category.items.map(item => ({
    ...item,
    categoryId: category.id
  })));
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]), input:not([disabled]):not([type="hidden"]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * @returns {Promise<string|null>} ký tự đã chọn, hoặc null nếu hủy
 */
export function showSymbolPicker() {
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "symbol-picker";

    const title = isEn ? "Symbol" : "Ký hiệu";
    const hint = isEn
      ? "Choose a special character to insert at the cursor."
      : "Chọn ký tự đặc biệt để chèn tại vị trí con trỏ.";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-symbol-picker" style="width: 520px;" role="dialog" aria-modal="true" aria-labelledby="vno-symbol-picker-title">
        <div class="vno-dialog-header">
          <span id="vno-symbol-picker-title">${title}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <p style="margin:0;font-size:13px;color:#64748b;">${hint}</p>
          ${SYMBOL_CATEGORIES.map(category => `
            <div class="vno-symbol-category">
              <strong style="display:block;font-size:12px;color:#334155;margin-bottom:6px;">${isEn ? category.nameEn : category.nameVi}</strong>
              <div class="vno-symbol-grid" role="list">
                ${category.items.map(item => `
                  <button type="button" class="vno-symbol-cell" role="listitem"
                    data-symbol-char="${item.char}"
                    title="${isEn ? item.nameEn : item.nameVi}"
                    aria-label="${isEn ? item.nameEn : item.nameVi}: ${item.char}">${item.char}</button>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    overlay.querySelectorAll(".vno-symbol-cell").forEach(btn => {
      btn.addEventListener("click", () => cleanup(btn.getAttribute("data-symbol-char")));
    });
    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    overlay.querySelector(".vno-symbol-cell")?.focus();
  });
}
