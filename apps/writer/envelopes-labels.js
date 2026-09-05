/**
 * VN Writer — Phong bì (Envelopes) & Nhãn (Labels)
 * Mailings > Create. Tái sử dụng nguồn Mail Merge (CSV) khi có; không SDK ngoài.
 */

import { ICONS } from "../../platform/ui-kit/icons.js";
import { t } from "../../platform/i18n/i18n.js";

/** Khổ phong bì phổ biến — w × h theo hướng dùng khi gửi thư (ngang). */
export const ENVELOPE_SIZES = {
  dl: { id: "dl", label: "DL (220 × 110 mm)", w: 220, h: 110 },
  c5: { id: "c5", label: "C5 (229 × 162 mm)", w: 229, h: 162 },
  number10: { id: "number10", label: "Number 10 / Danh thiếp (241,3 × 104,8 mm)", w: 241.3, h: 104.8 }
};

/** Lưới nhãn A4. Avery L7160 = 63.5 × 38.1 mm, 3×7; 3×8 vừa khổ A4 với ô ~66×34 mm. */
export const LABEL_LAYOUTS = {
  "avery-l7160": {
    id: "avery-l7160",
    label: "Avery L7160 — 3 cột × 7 hàng (63,5 × 38,1 mm, A4)",
    cols: 3,
    rows: 7,
    cellW: 63.5,
    cellH: 38.1,
    pageW: 210,
    pageH: 297,
    pageSize: "a4",
    hGap: 2.5,
    vGap: 0
  },
  "avery-3x8": {
    id: "avery-3x8",
    label: "3 cột × 8 hàng (~66 × 34 mm, A4)",
    cols: 3,
    rows: 8,
    cellW: 66,
    cellH: 34,
    pageW: 210,
    pageH: 297,
    pageSize: "a4",
    hGap: 2.5,
    vGap: 2
  }
};

export function escapeMailingsHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Ghép một bản ghi Mail Merge thành địa chỉ nhiều dòng (giá trị không rỗng, theo thứ tự cột).
 * @param {Record<string, string>} record
 * @param {string[]} [fields]
 */
export function formatRecordAsAddress(record, fields) {
  if (!record || typeof record !== "object") return "";
  const keys = Array.isArray(fields) && fields.length ? fields : Object.keys(record);
  return keys
    .map((key) => String(record[key] ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function getEnvelopeSizeMm(sizeId) {
  const size = ENVELOPE_SIZES[sizeId] || ENVELOPE_SIZES.dl;
  return { w: size.w, h: size.h, id: size.id, label: size.label };
}

/**
 * HTML một trang phong bì. Địa chỉ người gửi góc trên-trái; người nhận giữa-dưới.
 * @param {{ sizeId?: string, deliveryAddress?: string, returnAddress?: string, omitReturn?: boolean, pageBreak?: boolean }} options
 */
export function buildEnvelopeHtml(options = {}) {
  const size = ENVELOPE_SIZES[options.sizeId] || ENVELOPE_SIZES.dl;
  const delivery = String(options.deliveryAddress || "").trim();
  const returnAddr = options.omitReturn ? "" : String(options.returnAddress || "").trim();
  const pageBreakCss = options.pageBreak ? "page-break-before:always;break-before:page;" : "";
  const returnHtml = returnAddr
    ? `<div class="vno-envelope-return" data-vno-envelope-role="return" style="position:absolute;top:10mm;left:12mm;max-width:85mm;font-size:11pt;line-height:1.35;white-space:pre-wrap;color:#1e293b;">${escapeMailingsHtml(returnAddr)}</div>`
    : "";
  return (
    `<div class="vno-envelope-page" data-vno-envelope="true" data-vno-envelope-size="${size.id}" ` +
    `style="${pageBreakCss}position:relative;width:${size.w}mm;height:${size.h}mm;box-sizing:border-box;overflow:hidden;">` +
    returnHtml +
    `<div class="vno-envelope-delivery" data-vno-envelope-role="delivery" ` +
    `style="position:absolute;top:52%;left:42%;max-width:100mm;font-size:13pt;line-height:1.4;font-weight:500;white-space:pre-wrap;color:#0f172a;">` +
    `${escapeMailingsHtml(delivery)}</div></div>`
  );
}

export function paginateLabelContents(contents, layout) {
  const spec = typeof layout === "string" ? LABEL_LAYOUTS[layout] : layout;
  if (!spec) return [];
  const perPage = spec.cols * spec.rows;
  const list = Array.isArray(contents) ? contents : [];
  if (!list.length || perPage < 1) return [];
  const pages = [];
  for (let i = 0; i < list.length; i += perPage) {
    pages.push(list.slice(i, i + perPage));
  }
  return pages;
}

/**
 * HTML một tờ nhãn (bảng lưới). `contents[i]` là ô thứ i; thiếu thì để trống.
 * @param {{ layout?: string|object, contents?: string[], pageBreak?: boolean }} options
 */
export function buildLabelSheetHtml(options = {}) {
  const layout = (typeof options.layout === "string" ? LABEL_LAYOUTS[options.layout] : options.layout) || LABEL_LAYOUTS["avery-l7160"];
  const contents = Array.isArray(options.contents) ? options.contents : [];
  const pageBreakCss = options.pageBreak ? "page-break-before:always;break-before:page;" : "";
  let rowsHtml = "";
  for (let r = 0; r < layout.rows; r++) {
    let cells = "";
    for (let c = 0; c < layout.cols; c++) {
      const index = r * layout.cols + c;
      const text = contents[index] != null ? String(contents[index]) : "";
      cells +=
        `<td class="vno-label-cell" data-vno-label-index="${index}" ` +
        `style="width:${layout.cellW}mm;height:${layout.cellH}mm;min-width:${layout.cellW}mm;min-height:${layout.cellH}mm;` +
        `border:1px solid #cbd5e1;vertical-align:top;padding:2mm;font-size:10pt;line-height:1.3;white-space:pre-wrap;color:#0f172a;">` +
        `${escapeMailingsHtml(text)}</td>`;
    }
    rowsHtml += `<tr>${cells}</tr>`;
  }
  return (
    `<div class="vno-label-sheet" data-vno-labels="true" data-vno-label-layout="${layout.id}" ` +
    `style="${pageBreakCss}width:${layout.pageW}mm;box-sizing:border-box;">` +
    `<table class="vno-label-grid" data-vno-label-grid="true" ` +
    `style="width:100%;border-collapse:separate;border-spacing:${layout.hGap}mm ${layout.vGap}mm;">` +
    `${rowsHtml}</table></div>`
  );
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
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

function dialogT(key, fallback) {
  const value = typeof t === "function" ? t(key) : key;
  return value && value !== key ? value : fallback;
}

/**
 * @param {{ mailMergeCount?: number, defaults?: object }} options
 * @returns {Promise<object|null>}
 */
export function showEnvelopeDialog(options = {}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return Promise.resolve(null);
  }
  const mailMergeCount = Number(options.mailMergeCount) || 0;
  const defaults = options.defaults || {};

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const sizeOptions = Object.values(ENVELOPE_SIZES).map((size) => {
      const selected = (defaults.size || "dl") === size.id ? "checked" : "";
      return `<label class="vno-envelope-size-option" style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--vno-border-default);border-radius:6px;cursor:pointer;">
        <input type="radio" name="vno-envelope-size" value="${size.id}" ${selected} style="margin-top:3px;">
        <span style="font-size:13px;line-height:1.35;">${escapeMailingsHtml(size.label)}</span>
      </label>`;
    }).join("");
    const mergeBlock = mailMergeCount > 0
      ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--vno-text-primary);">
          <input type="checkbox" id="vno-envelope-use-merge" ${defaults.useMailMerge ? "checked" : ""}>
          ${dialogT("writerDialogs.envelopes.useMailMerge", "Dùng nguồn Trộn thư hiện có")} (${mailMergeCount} ${dialogT("writerDialogs.envelopes.records", "bản ghi")})
        </label>`
      : "";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-envelope-dialog" style="width:560px;max-width:calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-envelope-title">
        <div class="vno-dialog-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:flex;color:#0f4c81;" aria-hidden="true">${ICONS.envelope || ""}</span>
            <span id="vno-envelope-title">${dialogT("writerDialogs.envelopes.title", "Phong bì")}</span>
          </div>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${dialogT("common.close", "Đóng")}" aria-label="${dialogT("common.close", "Đóng")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <p style="margin:0;font-size:13px;color:var(--vno-text-secondary);line-height:1.45;">${dialogT("writerDialogs.envelopes.hint", "Nhập địa chỉ người nhận và (tuỳ chọn) người gửi, chọn khổ phong bì, rồi thêm một trang riêng vào tài liệu.")}</p>
          ${mergeBlock}
          <label for="vno-envelope-delivery" style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">${dialogT("writerDialogs.envelopes.delivery", "Địa chỉ người nhận")}</label>
          <textarea id="vno-envelope-delivery" class="vno-dialog-input" rows="4" style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;line-height:1.4;resize:vertical;" placeholder="Nguyễn Văn A&#10;Số 1, Phố Huế&#10;Hoàn Kiếm, Hà Nội">${escapeMailingsHtml(defaults.deliveryAddress || "")}</textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <label for="vno-envelope-return" style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">${dialogT("writerDialogs.envelopes.returnAddr", "Địa chỉ người gửi")}</label>
            <label style="display:flex;gap:6px;align-items:center;font-size:12px;font-weight:400;">
              <input type="checkbox" id="vno-envelope-omit-return" ${defaults.omitReturn ? "checked" : ""}>
              ${dialogT("writerDialogs.envelopes.omitReturn", "Ẩn địa chỉ người gửi")}
            </label>
          </div>
          <textarea id="vno-envelope-return" class="vno-dialog-input" rows="3" style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;line-height:1.4;resize:vertical;" placeholder="Ủy ban nhân dân phường&#10;12 Lý Thái Tổ, Hà Nội">${escapeMailingsHtml(defaults.returnAddress || "")}</textarea>
          <div style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">${dialogT("writerDialogs.envelopes.size", "Khổ phong bì")}</div>
          <div class="vno-envelope-size-list" role="radiogroup" aria-label="${dialogT("writerDialogs.envelopes.size", "Khổ phong bì")}" style="display:flex;flex-direction:column;gap:6px;">
            ${sizeOptions}
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">${dialogT("writerDialogs.envelopes.position", "Vị trí trang")}</div>
          <div style="display:flex;gap:16px;font-size:13px;">
            <label><input type="radio" name="vno-envelope-position" value="start" ${(defaults.position || "end") === "start" ? "checked" : ""}> ${dialogT("writerDialogs.envelopes.positionStart", "Đầu tài liệu")}</label>
            <label><input type="radio" name="vno-envelope-position" value="end" ${(defaults.position || "end") !== "start" ? "checked" : ""}> ${dialogT("writerDialogs.envelopes.positionEnd", "Cuối tài liệu")}</label>
          </div>
          <div id="vno-envelope-error" style="display:none;font-size:12px;color:#dc2626;" role="alert"></div>
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${dialogT("common.cancel", "Hủy")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-add-btn" data-action="add">${dialogT("writerDialogs.envelopes.addToDocument", "Thêm vào tài liệu")}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const deliveryEl = overlay.querySelector("#vno-envelope-delivery");
    const returnEl = overlay.querySelector("#vno-envelope-return");
    const omitEl = overlay.querySelector("#vno-envelope-omit-return");
    const mergeEl = overlay.querySelector("#vno-envelope-use-merge");
    const errorEl = overlay.querySelector("#vno-envelope-error");

    const syncOmit = () => {
      const omit = Boolean(omitEl?.checked);
      if (returnEl) {
        returnEl.disabled = omit;
        returnEl.style.opacity = omit ? "0.55" : "1";
      }
    };
    const syncMerge = () => {
      const useMerge = Boolean(mergeEl?.checked);
      if (deliveryEl) {
        deliveryEl.disabled = useMerge;
        deliveryEl.style.opacity = useMerge ? "0.55" : "1";
      }
    };
    omitEl?.addEventListener("change", syncOmit);
    mergeEl?.addEventListener("change", syncMerge);
    syncOmit();
    syncMerge();

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    const finishAdd = () => {
      const useMailMerge = Boolean(mergeEl?.checked);
      const deliveryAddress = String(deliveryEl?.value || "").trim();
      if (!useMailMerge && !deliveryAddress) {
        if (errorEl) {
          errorEl.style.display = "block";
          errorEl.textContent = dialogT("writerDialogs.envelopes.deliveryRequired", "Hãy nhập địa chỉ người nhận, hoặc bật nguồn Trộn thư.");
        }
        deliveryEl?.focus();
        return;
      }
      const sizeInput = overlay.querySelector('input[name="vno-envelope-size"]:checked');
      const positionInput = overlay.querySelector('input[name="vno-envelope-position"]:checked');
      cleanup({
        size: sizeInput?.value || "dl",
        deliveryAddress,
        returnAddress: String(returnEl?.value || "").trim(),
        omitReturn: Boolean(omitEl?.checked),
        position: positionInput?.value === "start" ? "start" : "end",
        useMailMerge
      });
    };

    overlay.querySelector(".vno-dialog-add-btn")?.addEventListener("click", finishAdd);
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
    (mergeEl?.checked ? overlay.querySelector(".vno-dialog-add-btn") : deliveryEl)?.focus();
  });
}

/**
 * @param {{ mailMergeCount?: number, defaults?: object }} options
 * @returns {Promise<object|null>}
 */
export function showLabelsDialog(options = {}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return Promise.resolve(null);
  }
  const mailMergeCount = Number(options.mailMergeCount) || 0;
  const defaults = options.defaults || {};

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const layoutOptions = Object.values(LABEL_LAYOUTS).map((layout) => {
      const selected = (defaults.layout || "avery-l7160") === layout.id ? "selected" : "";
      return `<option value="${layout.id}" ${selected}>${escapeMailingsHtml(layout.label)}</option>`;
    }).join("");
    const mergeBlock = mailMergeCount > 0
      ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--vno-text-primary);">
          <input type="checkbox" id="vno-labels-use-merge" ${defaults.useMailMerge ? "checked" : ""}>
          ${dialogT("writerDialogs.labels.useMailMerge", "Điền hàng loạt từ nguồn Trộn thư")} (${mailMergeCount} ${dialogT("writerDialogs.labels.records", "bản ghi")})
        </label>`
      : "";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-labels-dialog" style="width:540px;max-width:calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-labels-title">
        <div class="vno-dialog-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:flex;color:#0f4c81;" aria-hidden="true">${ICONS.labels || ""}</span>
            <span id="vno-labels-title">${dialogT("writerDialogs.labels.title", "Nhãn")}</span>
          </div>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${dialogT("common.close", "Đóng")}" aria-label="${dialogT("common.close", "Đóng")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <p style="margin:0;font-size:13px;color:var(--vno-text-secondary);line-height:1.45;">${dialogT("writerDialogs.labels.hint", "Nhập nội dung một nhãn (mọi ô giống nhau) hoặc dùng nguồn Trộn thư để mỗi ô một bản ghi. Nhiều hơn một tờ thì tự thêm trang.")}</p>
          ${mergeBlock}
          <label for="vno-labels-content" style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">${dialogT("writerDialogs.labels.content", "Nội dung nhãn")}</label>
          <textarea id="vno-labels-content" class="vno-dialog-input" rows="5" style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;line-height:1.4;resize:vertical;" placeholder="Công ty TNHH ABC&#10;Tầng 5, 25 Láng Hạ&#10;Đống Đa, Hà Nội">${escapeMailingsHtml(defaults.content || "")}</textarea>
          <label for="vno-labels-layout" style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">${dialogT("writerDialogs.labels.layout", "Kiểu lưới nhãn")}</label>
          <select id="vno-labels-layout" class="vno-dialog-input" style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:13px;">
            ${layoutOptions}
          </select>
          <div id="vno-labels-error" style="display:none;font-size:12px;color:#dc2626;" role="alert"></div>
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${dialogT("common.cancel", "Hủy")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-add-btn" data-action="create">${dialogT("writerDialogs.labels.createPage", "Tạo trang nhãn mới")}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const contentEl = overlay.querySelector("#vno-labels-content");
    const layoutEl = overlay.querySelector("#vno-labels-layout");
    const mergeEl = overlay.querySelector("#vno-labels-use-merge");
    const errorEl = overlay.querySelector("#vno-labels-error");

    const syncMerge = () => {
      const useMerge = Boolean(mergeEl?.checked);
      if (contentEl) {
        contentEl.disabled = useMerge;
        contentEl.style.opacity = useMerge ? "0.55" : "1";
      }
    };
    mergeEl?.addEventListener("change", syncMerge);
    syncMerge();

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(value);
    };

    const finishCreate = () => {
      const useMailMerge = Boolean(mergeEl?.checked);
      const content = String(contentEl?.value || "").trim();
      if (!useMailMerge && !content) {
        if (errorEl) {
          errorEl.style.display = "block";
          errorEl.textContent = dialogT("writerDialogs.labels.contentRequired", "Hãy nhập nội dung nhãn, hoặc bật nguồn Trộn thư.");
        }
        contentEl?.focus();
        return;
      }
      cleanup({
        layout: layoutEl?.value || "avery-l7160",
        content,
        useMailMerge
      });
    };

    overlay.querySelector(".vno-dialog-add-btn")?.addEventListener("click", finishCreate);
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
    (mergeEl?.checked ? overlay.querySelector(".vno-dialog-add-btn") : contentEl)?.focus();
  });
}
