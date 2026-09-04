/**
 * VN Office UI Kit — Date & Time format helper + dialog
 * Writer chèn chuỗi tại con trỏ; Slides dùng cùng định dạng cho placeholder tự cập nhật.
 */

import { t, getLocale } from "../i18n/i18n.js";

const VI_MONTHS = [
  "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
  "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DATE_TIME_PRESETS = [
  { id: "date-vn", format: "dd/MM/yyyy" },
  { id: "datetime-vn", format: "dd/MM/yyyy HH:mm" },
  { id: "long-vi", format: "d MMMM yyyy" },
  { id: "iso", format: "yyyy-MM-dd" },
  { id: "time", format: "HH:mm" }
];

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDateTime(date = new Date(), format = "dd/MM/yyyy") {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const dd = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const isEn = getLocale() === "en";
  switch (format) {
    case "dd/MM/yyyy HH:mm":
      return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
    case "d MMMM yyyy":
      return isEn
        ? `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${yyyy}`
        : `${d.getDate()} ${VI_MONTHS[d.getMonth()]} năm ${yyyy}`;
    case "yyyy-MM-dd":
      return `${yyyy}-${MM}-${dd}`;
    case "HH:mm":
      return `${HH}:${mm}`;
    case "dd/MM/yyyy":
    default:
      return `${dd}/${MM}/${yyyy}`;
  }
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
 * @param {Object} [options]
 * @param {string} [options.title]
 * @param {string} [options.defaultFormat]
 * @param {Date} [options.now]
 * @returns {Promise<{format:string, text:string}|null>}
 */
export function showDateTimeDialog(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const defaultFormat = options.defaultFormat || "dd/MM/yyyy";

  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return Promise.resolve({ format: defaultFormat, text: formatDateTime(now, defaultFormat) });
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.dataset.vnoDialog = "datetime-picker";
    const title = options.title || (isEn ? "Date and Time" : "Ngày & Giờ");
    let selectedFormat = defaultFormat;

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 420px;" role="dialog" aria-modal="true" aria-labelledby="vno-datetime-title">
        <div class="vno-dialog-header">
          <span id="vno-datetime-title">${title}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px;">
          <p style="margin:0;font-size:13px;color:#64748b;">${isEn ? "Choose a format. The value updates to the current date and time." : "Chọn định dạng. Giá trị lấy ngày giờ hiện tại."}</p>
          <div class="vno-datetime-presets" role="radiogroup" aria-labelledby="vno-datetime-title">
            ${DATE_TIME_PRESETS.map(preset => {
              const sample = formatDateTime(now, preset.format);
              const checked = preset.format === selectedFormat;
              return `<button type="button" role="radio" class="vno-datetime-preset ${checked ? "is-selected" : ""}"
                data-datetime-format="${preset.format}" aria-checked="${checked}">
                <strong>${sample}</strong>
                <span style="display:block;font-size:11px;color:#64748b;">${preset.format}</span>
              </button>`;
            }).join("")}
          </div>
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert" : "Chèn"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const refreshSelection = () => {
      overlay.querySelectorAll(".vno-datetime-preset").forEach(btn => {
        const isSel = btn.getAttribute("data-datetime-format") === selectedFormat;
        btn.classList.toggle("is-selected", isSel);
        btn.setAttribute("aria-checked", String(isSel));
      });
    };

    overlay.querySelectorAll(".vno-datetime-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedFormat = btn.getAttribute("data-datetime-format");
        refreshSelection();
      });
    });

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      cleanup({ format: selectedFormat, text: formatDateTime(now, selectedFormat) });
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
      } else if (event.key === "Enter") {
        event.preventDefault();
        cleanup({ format: selectedFormat, text: formatDateTime(now, selectedFormat) });
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    overlay.querySelector(".vno-dialog-ok-btn")?.focus();
  });
}
