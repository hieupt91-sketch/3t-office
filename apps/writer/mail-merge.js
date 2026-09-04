/**
 * VN Writer — Mail Merge (Trộn thư) Engine & UI Dialogs
 * Xử lý phân tích CSV thuần JS, chèn trường trộn, xem trước và hợp nhất tài liệu.
 * Tuân thủ 03-ui-ux/UI-KIT-RULES.md & AGENTS.md (không SDK ngoài, bản quyền sạch)
 */

import { ICONS } from "../../platform/ui-kit/icons.js";

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
    <div class="vno-dialog-box" style="width: 580px;" role="dialog" aria-modal="true">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:#0f4c81;">${ICONS.mailMerge || ""}</span>
          <span>Trộn thư — Nguồn dữ liệu (CSV)</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:13px;color:var(--vno-text-primary);line-height:1.5;">
          Dán dữ liệu bảng tính dạng <strong>CSV</strong> vào khung bên dưới (dòng đầu tiên là tiêu đề các cột):
        </div>
        <textarea class="vno-merge-csv-textarea" style="width:100%;height:160px;box-sizing:border-box;padding:10px;font-family:monospace;font-size:12.5px;line-height:1.4;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);resize:vertical;outline:none;" placeholder="${defaultSample.replace(/"/g, '&quot;')}">${initialVal}</textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <button type="button" class="vno-btn vno-btn-secondary vno-merge-sample-btn" style="font-size:12px;padding:4px 8px;">📋 Dán dữ liệu mẫu</button>
          <div class="vno-merge-status-badge" style="font-size:12px;color:#64748b;font-weight:500;">Chưa có dữ liệu</div>
        </div>
      </div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-dialog-cancel-btn">Hủy bỏ</button>
        <button class="vno-btn vno-btn-primary vno-dialog-save-btn">Lưu nguồn dữ liệu</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const textarea = overlay.querySelector(".vno-merge-csv-textarea");
  const statusBadge = overlay.querySelector(".vno-merge-status-badge");
  const sampleBtn = overlay.querySelector(".vno-merge-sample-btn");
  const saveBtn = overlay.querySelector(".vno-dialog-save-btn");
  const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

  const updateStatus = () => {
    const text = textarea.value.trim();
    if (!text) {
      statusBadge.textContent = "Chưa có dữ liệu";
      statusBadge.style.color = "#64748b";
      return;
    }
    const { fields, records } = parseCsv(text);
    if (fields.length === 0) {
      statusBadge.textContent = "CSV chưa hợp lệ (thiếu tiêu đề cột)";
      statusBadge.style.color = "#dc2626";
    } else {
      statusBadge.textContent = `Đã tìm thấy: ${fields.length} cột (${fields.slice(0, 3).join(", ")}${fields.length > 3 ? "..." : ""}) | ${records.length} bản ghi`;
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

  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";

  const optionsHtml = fields.map((f) => `<option value="${f}">${f}</option>`).join("\n");

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 440px;" role="dialog" aria-modal="true">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:#0f4c81;">${ICONS.mergeInsertField || ""}</span>
          <span>Chèn trường trộn thư</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
        <label style="font-size:13px;font-weight:500;color:var(--vno-text-primary);">
          Chọn trường dữ liệu muốn chèn vào tài liệu:
        </label>
        <select class="vno-dialog-input vno-merge-field-select" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;outline:none;">
          ${optionsHtml}
        </select>
      </div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-dialog-cancel-btn">Hủy bỏ</button>
        <button class="vno-btn vno-btn-primary vno-dialog-insert-btn">Chèn trường</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const select = overlay.querySelector(".vno-merge-field-select");
  const insertBtn = overlay.querySelector(".vno-dialog-insert-btn");
  const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
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
    }
  };
  document.addEventListener("keydown", onKeyDown);

  select.focus();
}
