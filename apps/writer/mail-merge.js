/**
 * VN Writer — Mail Merge (Trộn thư) Engine & UI Dialogs
 * Xử lý phân tích CSV thuần JS, chèn trường trộn, xem trước và hợp nhất tài liệu.
 * Tuân thủ 03-ui-ux/UI-KIT-RULES.md & AGENTS.md (không SDK ngoài, bản quyền sạch)
 */

import { ICONS } from "../../platform/ui-kit/icons.js";
import { t } from "../../platform/i18n/i18n.js";

/**
 * Phân tích cú pháp CSV thuần JavaScript
 * Hỗ trợ: dấu ngoặc kép bọc chuỗi chứa dấu phẩy, dấu nháy kép thoát "", xuống dòng \r\n hoặc \n, tự động cắt khoảng trắng.
 * Dòng đầu tiên là danh sách tên cột.
 * 
 * @param {string} text
 * @returns {{ fields: string[], records: Array<Record<string, string>> }}
 */
export function parseCsv(text) {
  if (!text || typeof text !== "string") {
    return { fields: [], records: [] };
  }

  const rows = [];
  let currentRow = [];
  let currentVal = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Thoát dấu nháy kép ("")
          currentVal += '"';
          i += 2;
          continue;
        } else {
          // Đóng dấu nháy kép
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentVal += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = "";
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else {
        currentVal += char;
        i++;
        continue;
      }
    }
  }

  // Giá trị cuối cùng nếu còn sót
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  // Lọc các dòng trống hoàn toàn
  const nonEmptyRows = rows.filter(row => row.some(cell => cell.trim().length > 0));
  if (nonEmptyRows.length === 0) {
    return { fields: [], records: [] };
  }

  // Dòng 1 là tiêu đề các cột
  const fields = nonEmptyRows[0].map(h => h.trim()).filter(Boolean);
  const records = [];

  // Các dòng tiếp theo là dữ liệu bản ghi
  for (let r = 1; r < nonEmptyRows.length; r++) {
    const row = nonEmptyRows[r];
    const record = {};
    for (let c = 0; c < fields.length; c++) {
      record[fields[c]] = (row[c] !== undefined ? row[c] : "").trim();
    }
    records.push(record);
  }

  return { fields, records };
}

/**
 * Thay thế tất cả trường trộn thư trong chuỗi HTML bằng dữ liệu của bản ghi thật
 * @param {string} html
 * @param {Record<string, string>} record
 * @returns {string}
 */
export function replaceMergeFields(html, record) {
  if (!html || typeof html !== "string") return "";
  return html.replace(
    /<span\b[^>]*\bdata-field=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi,
    (match, fieldName) => {
      if (record && record[fieldName] !== undefined) {
        return record[fieldName];
      }
      return "";
    }
  );
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Hiển thị Hộp thoại Nhập nguồn dữ liệu trộn thư (dán CSV)
 * @param {Object} options
 * @param {string} [options.currentCsv=""]
 * @param {Function} [options.onSave]
 * @param {Function} [options.onCancel]
 */
export function showMailMergeDataSourceDialog({
  currentCsv = "",
  onSave,
  onCancel
}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    if (onCancel) onCancel();
    return;
  }

  const previousFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";

  const defaultSample = [
    "HoTen,ChucVu,DonVi,NgayKy",
    "Nguyễn Văn A,Trưởng phòng,Sở Thông tin và Truyền thông,04/09/2026",
    "Trần Thị B,Phó Giám đốc,Sở Kế hoạch và Đầu tư,05/09/2026",
    "Lê Văn C,Chuyên viên chính,Ủy ban Nhân dân Thành phố,06/09/2026"
  ].join("\n");

  const initialVal = currentCsv && currentCsv.trim() ? currentCsv : "";

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 580px;" role="dialog" aria-modal="true" aria-labelledby="vno-merge-ds-title">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:#0f4c81;" aria-hidden="true">${ICONS.mailMerge || ""}</span>
          <span id="vno-merge-ds-title">${t("writerDialogs.mailMerge.dataSourceTitle")}</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
        <label for="vno-merge-csv-input" style="font-size:13px;color:var(--vno-text-primary);line-height:1.5;">
          ${t("writerDialogs.mailMerge.pastePrompt")}
        </label>
        <textarea id="vno-merge-csv-input" class="vno-merge-csv-textarea" aria-label="${t("writerDialogs.mailMerge.pastePrompt")}" style="width:100%;height:160px;box-sizing:border-box;padding:10px;font-family:monospace;font-size:12.5px;line-height:1.4;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);resize:vertical;outline:none;" placeholder="${defaultSample.replace(/"/g, '&quot;')}">${initialVal}</textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <button type="button" class="vno-btn vno-btn-secondary vno-merge-sample-btn" style="font-size:12px;padding:4px 8px;">${t("writerDialogs.mailMerge.pasteSampleBtn")}</button>
          <div class="vno-merge-status-badge" style="font-size:12px;color:#64748b;font-weight:500;" aria-live="polite">${t("writerDialogs.mailMerge.noData")}</div>
        </div>
      </div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
        <button class="vno-btn vno-btn-primary vno-dialog-save-btn">${t("writerDialogs.mailMerge.saveDataSource")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const dialogBox = overlay.querySelector(".vno-dialog-box");

  const textarea = overlay.querySelector(".vno-merge-csv-textarea");
  const statusBadge = overlay.querySelector(".vno-merge-status-badge");
  const sampleBtn = overlay.querySelector(".vno-merge-sample-btn");
  const saveBtn = overlay.querySelector(".vno-dialog-save-btn");
  const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

  const updateStatus = () => {
    const text = textarea.value.trim();
    if (!text) {
      statusBadge.textContent = t("writerDialogs.mailMerge.noData");
      statusBadge.style.color = "#64748b";
      return;
    }
    const { fields, records } = parseCsv(text);
    if (fields.length === 0) {
      statusBadge.textContent = t("writerDialogs.mailMerge.invalidCsv");
      statusBadge.style.color = "#dc2626";
    } else {
      statusBadge.textContent = t("writerDialogs.mailMerge.foundData", { count: fields.length, records: records.length });
      statusBadge.style.color = "#16a34a";
    }
  };

  textarea.addEventListener("input", updateStatus);
  updateStatus();

  sampleBtn.addEventListener("click", () => {
    textarea.value = defaultSample;
    updateStatus();
    textarea.focus();
  });

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (previousFocused && typeof previousFocused.focus === "function") {
      previousFocused.focus();
    }
  };

  const finishSave = () => {
    const csvVal = textarea.value.trim();
    cleanup();
    if (onSave) onSave(csvVal);
  };

  const finishCancel = () => {
    cleanup();
    if (onCancel) onCancel();
  };

  saveBtn.addEventListener("click", finishSave);
  cancelBtn.addEventListener("click", finishCancel);
  closeBtn.addEventListener("click", finishCancel);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) finishCancel();
  });

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finishCancel();
    } else if (e.key === "Tab") {
      trapFocus(dialogBox, e);
    }
  };
  document.addEventListener("keydown", onKeyDown);

  textarea.focus();
}

/**
 * Hiển thị Hộp thoại chọn trường trộn thư để chèn
 * @param {Object} options
 * @param {string[]} options.fields
 * @param {Function} [options.onInsert]
 * @param {Function} [options.onCancel]
 */
export function showInsertMergeFieldDialog({
  fields = [],
  onInsert,
  onCancel
}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    if (onCancel) onCancel();
    return;
  }

  const previousFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";

  const optionsHtml = fields.map((f) => `<option value="${f}">${f}</option>`).join("\n");

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 440px;" role="dialog" aria-modal="true" aria-labelledby="vno-merge-field-title">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:#0f4c81;" aria-hidden="true">${ICONS.mergeInsertField || ""}</span>
          <span id="vno-merge-field-title">${t("writerDialogs.mailMerge.insertFieldTitle")}</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
        <label for="vno-merge-field-select" style="font-size:13px;font-weight:500;color:var(--vno-text-primary);">
          ${t("writerDialogs.mailMerge.selectFieldPrompt")}
        </label>
        <select id="vno-merge-field-select" aria-label="${t("writerDialogs.mailMerge.selectFieldPrompt")}" class="vno-dialog-input vno-merge-field-select" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;outline:none;">
          ${optionsHtml}
        </select>
      </div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
        <button class="vno-btn vno-btn-primary vno-dialog-insert-btn">${t("writerDialogs.mailMerge.insertBtn")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const dialogBox = overlay.querySelector(".vno-dialog-box");

  const select = overlay.querySelector(".vno-merge-field-select");
  const insertBtn = overlay.querySelector(".vno-dialog-insert-btn");
  const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (previousFocused && typeof previousFocused.focus === "function") {
      previousFocused.focus();
    }
  };

  const finishInsert = () => {
    const val = select ? select.value : "";
    cleanup();
    if (onInsert) onInsert(val);
  };

  const finishCancel = () => {
    cleanup();
    if (onCancel) onCancel();
  };

  insertBtn.addEventListener("click", finishInsert);
  cancelBtn.addEventListener("click", finishCancel);
  closeBtn.addEventListener("click", finishCancel);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) finishCancel();
  });

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finishCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      finishInsert();
    } else if (e.key === "Tab") {
      trapFocus(dialogBox, e);
    }
  };
  document.addEventListener("keydown", onKeyDown);

  select.focus();
}
