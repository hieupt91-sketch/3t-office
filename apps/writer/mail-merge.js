/**
 * 3T Doc — Mail Merge (Trộn thư) Engine & UI Dialogs
 * Xử lý phân tích dữ liệu nguồn: Excel (.xlsx, .xls, .ods qua FODS), CSV, TSV.
 * Hỗ trợ chọn trang tính, dòng đầu là tên trường, xem trước từng bản ghi,
 * lọc / bỏ chọn người nhận, chèn trường trộn, hoàn tất ra tài liệu mới hoặc in.
 * Tuân thủ 03-ui-ux/UI-KIT-RULES.md & AGENTS.md (không SDK ngoài, bản quyền sạch)
 */

import { ICONS } from "../../platform/ui-kit/icons.js";
import { t } from "../../platform/i18n/i18n.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

export { parseCsv, parseDelimitedText, parseFodsData, replaceMergeFields } from "./mail-merge-data.js";
import { parseCsv, parseDelimitedText, parseFodsData } from "./mail-merge-data.js";

let closeActiveMailMergeIfDialog = null;

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
 * Hiển thị Hộp thoại chọn danh sách người nhận trộn thư (Mail Merge Recipients) chuẩn Word:
 * - Chọn tệp Excel (.xlsx, .xls) hoặc CSV/TSV
 * - Chọn trang tính (Sheet selector) nếu tệp có nhiều sheet
 * - Checkbox dòng đầu là tên trường
 * - Xem trước danh sách người nhận trong bảng
 * - Lọc / tìm kiếm và chọn / bỏ chọn từng người nhận
 * 
 * @param {Object} options
 * @param {string} [options.currentCsv=""]
 * @param {string} [options.rawFods=""]
 * @param {Array} [options.sheets=[]]
 * @param {string} [options.activeSheetName=""]
 * @param {Function} [options.onSave]
 * @param {Function} [options.onCancel]
 */
export function showMailMergeDataSourceDialog({
  currentCsv = "",
  rawFods = "",
  sheets = [],
  activeSheetName = "",
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
    "HoTen,ChucVu,DonVi,NgayKy,LuongThuong",
    "Nguyễn Văn A,Trưởng phòng,Sở Thông tin và Truyền thông,04/09/2026,1.500.000",
    "Trần Thị B,Phó Giám đốc,Sở Kế hoạch và Đầu tư,05/09/2026,2.200.000",
    "Lê Văn C,Chuyên viên chính,Ủy ban Nhân dân Thành phố,06/09/2026,1.800.000"
  ].join("\n");

  let currentSourceFileName = "";
  let loadedRawFods = rawFods || "";
  let loadedRawCsv = currentCsv || "";
  let currentSheets = Array.isArray(sheets) && sheets.length > 0 ? [...sheets] : [];
  let currentSheetIndex = 0;
  let hasHeadersState = true;
  let searchQuery = "";
  let sortField = null;
  let sortDirection = 1;
  const escapeCell = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Khởi tạo sheet ban đầu nếu có dữ liệu truyền vào
  if (currentSheets.length === 0) {
    if (loadedRawFods) {
      const parsed = parseFodsData(loadedRawFods, { hasHeaders: hasHeadersState });
      currentSheets = parsed.sheets;
    } else if (loadedRawCsv.trim()) {
      const parsed = parseDelimitedText(loadedRawCsv, { hasHeaders: hasHeadersState });
      currentSheets = [{ name: "Trang tính 1", fields: parsed.fields, records: parsed.records }];
    }
  }

  if (activeSheetName && currentSheets.length > 0) {
    const foundIdx = currentSheets.findIndex(s => s.name === activeSheetName);
    if (foundIdx >= 0) currentSheetIndex = foundIdx;
  }

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 760px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;" role="dialog" aria-modal="true" aria-labelledby="vno-merge-ds-title">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:var(--vno-app-current-fg, #0f4c81);" aria-hidden="true">${ICONS.mailMerge || ""}</span>
          <span id="vno-merge-ds-title" style="font-weight:600;font-size:15px;">${t("writerDialogs.mailMerge.dataSourceTitle", "Chọn danh sách người nhận (Trộn thư)")}</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close", "Đóng")}" aria-label="${t("common.close", "Đóng")}">&times;</button>
      </div>

      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding:16px;">
        <!-- Thanh công cụ chọn tệp / nguồn dữ liệu -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--vno-border-subtle, #e2e8f0);">
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="vno-btn vno-btn-primary vno-merge-browse-btn" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:6px 14px;">
              <span aria-hidden="true">${ICONS.open || ""}</span>
              <span>Chọn tệp bảng tính / CSV...</span>
            </button>
            <input type="file" class="vno-merge-file-input" accept=".xlsx,.xls,.ods,.csv,.tsv,.txt,.fods" style="display:none;" />
            <button type="button" class="vno-btn vno-btn-secondary vno-merge-toggle-paste-btn" style="font-size:12.5px;padding:6px 12px;">Dán CSV / Thủ công</button>
            <button type="button" class="vno-btn vno-btn-secondary vno-merge-sample-btn" style="font-size:12.5px;padding:6px 12px;">Dán dữ liệu mẫu</button>
          </div>
          <div class="vno-merge-file-status" style="font-size:12.5px;color:var(--vno-text-secondary, #64748b);font-weight:500;">
            ${currentSourceFileName ? `Tệp: ${currentSourceFileName}` : (currentSheets.length > 0 ? "Đã có dữ liệu nguồn" : "Chưa chọn tệp")}
          </div>
        </div>

        <!-- Khung dán CSV thủ công (ẩn/hiện theo toggle) -->
        <div class="vno-merge-paste-container" style="display:none;flex-direction:column;gap:8px;padding:10px;background:var(--vno-bg-surface-secondary, #f8fafc);border:1px solid var(--vno-border-default, #cbd5e1);border-radius:var(--vno-radius-md, 6px);">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <label for="vno-merge-csv-input" style="font-size:12.5px;font-weight:600;color:var(--vno-text-primary);">
              Dán bảng dữ liệu (CSV / TSV / bảng tính sao chép):
            </label>
            <button type="button" class="vno-btn vno-btn-primary vno-merge-apply-paste-btn" style="font-size:12px;padding:3px 10px;">Áp dụng dữ liệu dán</button>
          </div>
          <textarea id="vno-merge-csv-input" class="vno-merge-csv-textarea" style="width:100%;height:100px;box-sizing:border-box;padding:8px;font-family:monospace;font-size:12px;line-height:1.4;border:1px solid var(--vno-border-default);border-radius:4px;resize:vertical;outline:none;" placeholder="${defaultSample.replace(/"/g, '&quot;')}">${loadedRawCsv}</textarea>
        </div>

        <!-- Tùy chọn cấu hình: Chọn trang tính & Dòng đầu là tên trường -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:var(--vno-bg-surface, #ffffff);padding:8px 12px;border:1px solid var(--vno-border-default, #e2e8f0);border-radius:var(--vno-radius-md, 6px);">
          <div class="vno-merge-sheet-wrapper" style="display:flex;align-items:center;gap:8px;">
            <label for="vno-merge-sheet-select" style="font-size:13px;font-weight:600;color:var(--vno-text-primary);">Trang tính:</label>
            <select id="vno-merge-sheet-select" class="vno-dialog-input vno-merge-sheet-select" style="padding:4px 10px;font-size:13px;border:1px solid var(--vno-border-default);border-radius:4px;min-width:180px;outline:none;">
              <option value="0">Trang tính 1</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--vno-text-primary);cursor:pointer;user-select:none;">
              <input type="checkbox" id="vno-merge-headers-check" class="vno-merge-headers-check" checked style="cursor:pointer;" />
              <span>Dòng đầu tiên là tên trường</span>
            </label>
          </div>
        </div>

        <!-- Thanh tìm kiếm & lọc người nhận -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;flex:1;max-width:360px;">
            <input type="text" class="vno-dialog-input vno-merge-search-input" placeholder="Tìm kiếm / lọc người nhận..." style="width:100%;padding:6px 10px;font-size:12.5px;border:1px solid var(--vno-border-default);border-radius:4px;outline:none;" />
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button type="button" class="vno-btn vno-btn-secondary vno-merge-select-all-btn" style="font-size:12px;padding:4px 8px;">Chọn tất cả</button>
            <button type="button" class="vno-btn vno-btn-secondary vno-merge-deselect-all-btn" style="font-size:12px;padding:4px 8px;">Bỏ chọn tất cả</button>
            <div class="vno-merge-count-badge" style="font-size:12.5px;font-weight:600;color:var(--vno-text-primary);background:var(--vno-bg-surface-secondary, #f1f5f9);padding:4px 10px;border-radius:12px;border:1px solid var(--vno-border-default, #cbd5e1);" aria-live="polite">
              Đã chọn: 0 / 0
            </div>
          </div>
        </div>

        <!-- Bảng danh sách người nhận & xem trước bản ghi -->
        <div class="vno-merge-table-container" style="max-height:260px;overflow:auto;border:1px solid var(--vno-border-default, #cbd5e1);border-radius:var(--vno-radius-md, 6px);background:var(--vno-bg-surface, #ffffff);">
          <table class="vno-merge-table" style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;">
            <thead style="position:sticky;top:0;background:var(--vno-bg-surface-secondary, #f8fafc);z-index:1;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
              <tr class="vno-merge-header-row">
                <th style="width:40px;padding:8px 10px;border-bottom:2px solid var(--vno-border-default);text-align:center;">
                  <input type="checkbox" class="vno-merge-th-checkbox" checked style="cursor:pointer;" title="Chọn/Bỏ chọn tất cả" />
                </th>
                <th style="padding:8px 10px;border-bottom:2px solid var(--vno-border-default);color:var(--vno-text-secondary);font-weight:600;">(Chưa có dữ liệu)</th>
              </tr>
            </thead>
            <tbody class="vno-merge-tbody">
              <tr>
                <td colspan="2" style="padding:24px;text-align:center;color:var(--vno-text-muted, #94a3b8);">
                  Chưa có dữ liệu người nhận. Hãy chọn tệp bảng tính (.xlsx/.xls) hoặc dán bảng CSV.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="vno-dialog-footer" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--vno-border-subtle, #e2e8f0);">
        <div class="vno-merge-status-badge" data-status="empty" aria-live="polite" style="font-size:12.5px;font-weight:500;">
          Chưa có dữ liệu
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="vno-btn vno-dialog-cancel-btn">${t("common.cancel", "Hủy")}</button>
          <button class="vno-btn vno-btn-primary vno-dialog-save-btn">${t("writerDialogs.mailMerge.saveDataSource", "Lưu nguồn dữ liệu")}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const dialogBox = overlay.querySelector(".vno-dialog-box");

  const browseBtn = overlay.querySelector(".vno-merge-browse-btn");
  const fileInput = overlay.querySelector(".vno-merge-file-input");
  const togglePasteBtn = overlay.querySelector(".vno-merge-toggle-paste-btn");
  const pasteContainer = overlay.querySelector(".vno-merge-paste-container");
  const textarea = overlay.querySelector(".vno-merge-csv-textarea");
  const applyPasteBtn = overlay.querySelector(".vno-merge-apply-paste-btn");
  const sampleBtn = overlay.querySelector(".vno-merge-sample-btn");
  const sheetSelect = overlay.querySelector(".vno-merge-sheet-select");
  const headersCheck = overlay.querySelector(".vno-merge-headers-check");
  const searchInput = overlay.querySelector(".vno-merge-search-input");
  const selectAllBtn = overlay.querySelector(".vno-merge-select-all-btn");
  const deselectAllBtn = overlay.querySelector(".vno-merge-deselect-all-btn");
  const countBadge = overlay.querySelector(".vno-merge-count-badge");
  const thCheckbox = overlay.querySelector(".vno-merge-th-checkbox");
  const theadRow = overlay.querySelector(".vno-merge-header-row");
  const tbody = overlay.querySelector(".vno-merge-tbody");
  const statusBadge = overlay.querySelector(".vno-merge-status-badge");
  const fileStatus = overlay.querySelector(".vno-merge-file-status");
  const saveBtn = overlay.querySelector(".vno-dialog-save-btn");
  const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

  const updateSheetOptions = () => {
    sheetSelect.innerHTML = "";
    if (currentSheets.length === 0) {
      const opt = document.createElement("option");
      opt.value = "0";
      opt.textContent = "Trang tính 1";
      sheetSelect.appendChild(opt);
      sheetSelect.disabled = true;
      return;
    }
    sheetSelect.disabled = currentSheets.length <= 1;
    currentSheets.forEach((s, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = `${s.name} (${s.records.length} bản ghi)`;
      if (idx === currentSheetIndex) opt.selected = true;
      sheetSelect.appendChild(opt);
    });
  };

  const renderTable = () => {
    const currentSheet = currentSheets[currentSheetIndex];
    if (!currentSheet || !currentSheet.records || currentSheet.records.length === 0) {
      theadRow.innerHTML = `
        <th style="width:40px;padding:8px 10px;border-bottom:2px solid var(--vno-border-default);text-align:center;">
          <input type="checkbox" disabled />
        </th>
        <th style="padding:8px 10px;border-bottom:2px solid var(--vno-border-default);color:var(--vno-text-secondary);font-weight:600;">(Chưa có dữ liệu)</th>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="2" style="padding:24px;text-align:center;color:var(--vno-text-muted, #94a3b8);">
            Chưa có dữ liệu người nhận. Hãy chọn tệp bảng tính (.xlsx/.xls) hoặc dán bảng CSV.
          </td>
        </tr>
      `;
      countBadge.textContent = "Đã chọn: 0 / 0";
      statusBadge.textContent = "Chưa có dữ liệu";
      statusBadge.setAttribute("data-status", "empty");
      return;
    }

    const fields = currentSheet.fields;
    const records = currentSheet.records;

    // Header columns
    theadRow.innerHTML = `
      <th style="width:40px;padding:8px 10px;border-bottom:2px solid var(--vno-border-default);text-align:center;">
        <input type="checkbox" class="vno-merge-th-checkbox" style="cursor:pointer;" title="Chọn/Bỏ chọn tất cả" />
      </th>
      ${fields.map(f => `<th class="vno-merge-sort-th" data-sort-field="${escapeCell(f)}" role="button" tabindex="0" aria-sort="${sortField === f ? (sortDirection === 1 ? "ascending" : "descending") : "none"}" title="Bấm để sắp xếp danh sách theo cột này" style="padding:8px 10px;border-bottom:2px solid var(--vno-border-default);color:var(--vno-text-primary);font-weight:600;white-space:nowrap;cursor:pointer;user-select:none;">${escapeCell(f)}${sortField === f ? (sortDirection === 1 ? " ▲" : " ▼") : ""}</th>`).join("")}
    `;
    // Sắp xếp theo cột: bấm lần 1 tăng dần, lần 2 giảm dần; thứ tự này cũng là thứ tự khi trộn.
    theadRow.querySelectorAll(".vno-merge-sort-th").forEach(th => {
      const sortBy = () => {
        const field = th.getAttribute("data-sort-field");
        sortDirection = sortField === field ? -sortDirection : 1;
        sortField = field;
        records.sort((a, b) => sortDirection * String(a[field] ?? "").localeCompare(String(b[field] ?? ""), "vi", { numeric: true, sensitivity: "base" }));
        renderTable();
      };
      th.addEventListener("click", sortBy);
      th.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortBy(); } });
    });

    const activeThCheck = theadRow.querySelector(".vno-merge-th-checkbox");
    if (activeThCheck) {
      activeThCheck.addEventListener("change", (e) => {
        const checked = e.target.checked;
        records.forEach(r => r._selected = checked);
        renderTable();
      });
    }

    // Rows
    const query = searchQuery.trim().toLowerCase();
    const rowsHtml = [];
    let visibleCount = 0;
    let selectedCount = 0;

    records.forEach((rec, idx) => {
      const isSelected = rec._selected !== false;
      if (isSelected) selectedCount++;

      // Kiểm tra filter tìm kiếm
      let matches = true;
      if (query) {
        matches = fields.some(f => String(rec[f] || "").toLowerCase().includes(query));
      }
      if (!matches) return;
      visibleCount++;

      const trStyle = isSelected
        ? "border-bottom:1px solid var(--vno-border-subtle, #e2e8f0);"
        : "border-bottom:1px solid var(--vno-border-subtle, #e2e8f0);opacity:0.5;background:var(--vno-bg-surface-secondary, #f8fafc);";

      const cells = fields.map(f => `<td style="padding:7px 10px;white-space:nowrap;">${escapeCell(rec[f])}</td>`).join("");

      rowsHtml.push(`
        <tr data-record-idx="${idx}" style="${trStyle}">
          <td style="width:40px;padding:7px 10px;text-align:center;">
            <input type="checkbox" class="vno-merge-row-checkbox" data-idx="${idx}" ${isSelected ? "checked" : ""} style="cursor:pointer;" />
          </td>
          ${cells}
        </tr>
      `);
    });

    tbody.innerHTML = rowsHtml.length > 0
      ? rowsHtml.join("")
      : `<tr><td colspan="${fields.length + 1}" style="padding:20px;text-align:center;color:var(--vno-text-muted);">Không tìm thấy người nhận nào phù hợp với bộ lọc.</td></tr>`;

    // Cập nhật sự kiện click checkbox từng dòng
    tbody.querySelectorAll(".vno-merge-row-checkbox").forEach(chk => {
      chk.addEventListener("change", (e) => {
        const rIdx = parseInt(e.target.getAttribute("data-idx"), 10);
        if (records[rIdx]) {
          records[rIdx]._selected = e.target.checked;
          renderTable();
        }
      });
    });

    // Cập nhật trạng thái checkbox tổng
    if (activeThCheck) {
      activeThCheck.checked = selectedCount === records.length && records.length > 0;
      activeThCheck.indeterminate = selectedCount > 0 && selectedCount < records.length;
    }

    countBadge.textContent = `Đã chọn: ${selectedCount} / ${records.length}`;
    statusBadge.textContent = `Đã nạp ${fields.length} trường, ${records.length} bản ghi`;
    statusBadge.setAttribute("data-status", "success");
  };

  const reparseCurrentSource = () => {
    if (loadedRawFods) {
      const parsed = parseFodsData(loadedRawFods, { hasHeaders: hasHeadersState });
      currentSheets = parsed.sheets;
      if (currentSheetIndex >= currentSheets.length) currentSheetIndex = 0;
      updateSheetOptions();
      renderTable();
    } else if (loadedRawCsv.trim()) {
      const parsed = parseDelimitedText(loadedRawCsv, { hasHeaders: hasHeadersState });
      currentSheets = [{ name: "Trang tính 1", fields: parsed.fields, records: parsed.records }];
      currentSheetIndex = 0;
      updateSheetOptions();
      renderTable();
    }
  };

  // Cấu hình ban đầu
  updateSheetOptions();
  renderTable();

  // Sự kiện chọn tệp
  const handleSelectedFile = async (file) => {
    if (!file) return;
    const name = file.name || "Dữ liệu";
    currentSourceFileName = name;
    fileStatus.textContent = `Tệp: ${name}`;

    const ext = name.split(".").pop().toLowerCase();
    if (ext === "fods") {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadedRawFods = e.target.result;
        loadedRawCsv = "";
        reparseCurrentSource();
      };
      reader.readAsText(file);
    } else if (ext === "csv" || ext === "tsv" || ext === "txt") {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadedRawCsv = e.target.result;
        loadedRawFods = "";
        reparseCurrentSource();
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls" || ext === "ods") {
      // Trường hợp trình duyệt web đơn thuần không có pywebview
      statusBadge.textContent = "Để chọn tệp .xlsx hoặc .xls, hãy mở Doc trên máy tính. Bạn cũng có thể dán bảng dữ liệu vào khung bên dưới.";
      statusBadge.setAttribute("data-status", "error");
    }
  };

  browseBtn.addEventListener("click", async () => {
    // 1. Thử gọi native desktop dialog qua pywebview bridge
    if (window.pywebview?.api?.open_mail_merge_data_dialog) {
      try {
        const res = await window.pywebview.api.open_mail_merge_data_dialog();
        if (res && res.status === "ok") {
          currentSourceFileName = res.fileName || "Tệp dữ liệu";
          fileStatus.textContent = `Tệp: ${currentSourceFileName}`;
          if (res.format === "fods") {
            loadedRawFods = res.content || "";
            loadedRawCsv = "";
          } else {
            loadedRawCsv = res.content || "";
            loadedRawFods = "";
          }
          reparseCurrentSource();
          return;
        }
        if (res && res.status === "cancelled") return;
      } catch (err) {
        console.warn("[MailMerge] Không mở được hộp thoại native, chuyển sang file input:", err);
      }
    }

    // 2. Fallback sang file input chuẩn HTML
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // Toggle dán CSV
  togglePasteBtn.addEventListener("click", () => {
    const isHidden = pasteContainer.style.display === "none";
    pasteContainer.style.display = isHidden ? "flex" : "none";
    if (isHidden) textarea.focus();
  });

  // Áp dụng dữ liệu dán
  applyPasteBtn.addEventListener("click", () => {
    const val = textarea.value.trim();
    if (val) {
      loadedRawCsv = val;
      loadedRawFods = "";
      currentSourceFileName = "Dữ liệu dán thủ công";
      fileStatus.textContent = currentSourceFileName;
      reparseCurrentSource();
      pasteContainer.style.display = "none";
    }
  });

  // Dán mẫu
  sampleBtn.addEventListener("click", () => {
    textarea.value = defaultSample;
    loadedRawCsv = defaultSample;
    loadedRawFods = "";
    currentSourceFileName = "Dữ liệu mẫu";
    fileStatus.textContent = currentSourceFileName;
    reparseCurrentSource();
  });

  // Đổi trang tính
  sheetSelect.addEventListener("change", (e) => {
    currentSheetIndex = parseInt(e.target.value, 10) || 0;
    renderTable();
  });

  // Đổi checkbox dòng đầu là tiêu đề
  headersCheck.addEventListener("change", (e) => {
    hasHeadersState = e.target.checked;
    reparseCurrentSource();
  });

  // Tìm kiếm
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTable();
  });

  // Chọn / bỏ chọn tất cả
  selectAllBtn.addEventListener("click", () => {
    const currentSheet = currentSheets[currentSheetIndex];
    if (currentSheet?.records) {
      currentSheet.records.forEach(r => r._selected = true);
      renderTable();
    }
  });

  deselectAllBtn.addEventListener("click", () => {
    const currentSheet = currentSheets[currentSheetIndex];
    if (currentSheet?.records) {
      currentSheet.records.forEach(r => r._selected = false);
      renderTable();
    }
  });

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (previousFocused && typeof previousFocused.focus === "function") {
      previousFocused.focus();
    }
  };

  const finishSave = () => {
    const currentSheet = currentSheets[currentSheetIndex] || { fields: [], records: [] };
    const selectedRecords = (currentSheet.records || []).filter(r => r._selected !== false);
    cleanup();
    if (onSave) {
      onSave({
        fields: currentSheet.fields || [],
        records: currentSheet.records || [],
        selectedRecords,
        sheets: currentSheets,
        activeSheetName: currentSheet.name || "Trang tính 1",
        rawFods: loadedRawFods,
        rawCsv: loadedRawCsv,
        hasHeaders: hasHeadersState,
        sourceFileName: currentSourceFileName
      });
    }
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

  browseBtn.focus();
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

  const escField = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const optionsHtml = fields.map((f) => `<option value="${escField(f)}">${escField(f)}</option>`).join("\n");

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 440px;" role="dialog" aria-modal="true" aria-labelledby="vno-merge-field-title">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:var(--vno-app-current-fg, #0f4c81);" aria-hidden="true">${ICONS.mergeInsertField || ""}</span>
          <span id="vno-merge-field-title">${t("writerDialogs.mailMerge.insertFieldTitle", "Chèn trường trộn thư")}</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close", "Đóng")}" aria-label="${t("common.close", "Đóng")}">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
        <label for="vno-merge-field-select" style="font-size:13px;font-weight:500;color:var(--vno-text-primary);">
          ${t("writerDialogs.mailMerge.selectFieldPrompt", "Chọn trường dữ liệu muốn chèn vào văn bản:")}
        </label>
        <select id="vno-merge-field-select" aria-label="${t("writerDialogs.mailMerge.selectFieldPrompt", "Chọn trường dữ liệu")}" class="vno-dialog-input vno-merge-field-select" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);font-size:13px;outline:none;">
          ${optionsHtml}
        </select>
      </div>
      <div class="vno-dialog-footer">
        <button class="vno-btn vno-dialog-cancel-btn">${t("common.cancel", "Hủy")}</button>
        <button class="vno-btn vno-btn-primary vno-dialog-insert-btn">${t("writerDialogs.mailMerge.insertBtn", "Chèn")}</button>
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

/**
 * Hộp thoại Khối địa chỉ / Lời chào cho Trộn thư.
 * mode "address": chọn các trường (mỗi trường một dòng, theo thứ tự đánh dấu); mode "greeting": chữ mở đầu + một trường + dấu cuối.
 * @returns {Promise<{mode:string, fields:string[], prefix:string, suffix:string}|null>}
 */
export function showAddressGreetingDialog({ mode = "address", fields = [] } = {}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) return Promise.resolve(null);
  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const isAddress = mode === "address";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const title = isAddress ? "Chèn khối địa chỉ" : "Chèn lời chào";
    const body = isAddress
      ? `<p style="margin:0;font-size:13px;">Đánh dấu các trường sẽ nằm trong khối địa chỉ. Mỗi trường được đặt trên một dòng, theo thứ tự trong danh sách.</p>
         <div class="vno-ab-fields" role="group" aria-label="Trường trong khối địa chỉ" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;">
           ${fields.map((f, i) => `<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" class="vno-ab-field" value="${esc(f)}"${i < 3 ? " checked" : ""}> <span>${esc(f)}</span></label>`).join("")}
         </div>`
      : `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">Chữ mở đầu<input class="vno-dialog-input vno-ab-prefix" value="Kính gửi " style="padding:7px;"></label>
         <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">Trường tên người nhận<select class="vno-dialog-input vno-ab-greet-field" style="padding:7px;">${fields.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("")}</select></label>
         <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">Dấu cuối<input class="vno-dialog-input vno-ab-suffix" value="," style="padding:7px;width:80px;"></label>`;
    overlay.innerHTML = `<div class="vno-dialog-box" style="width:440px;max-width:calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-ab-title">
      <div class="vno-dialog-header"><span id="vno-ab-title">${title}</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" aria-label="Đóng">&times;</button></div>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;padding:16px;">${body}
        <div class="vno-ab-error" role="alert" style="min-height:16px;color:#b91c1c;font-size:12px;font-weight:600;"></div></div>
      <div class="vno-dialog-footer"><button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button><button type="button" class="vno-btn vno-btn-primary vno-dialog-insert-btn">Chèn</button></div></div>`;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const error = overlay.querySelector(".vno-ab-error");
    const done = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      previousFocused?.focus?.();
      resolve(value);
    };
    const commit = () => {
      if (isAddress) {
        const picked = [...overlay.querySelectorAll(".vno-ab-field:checked")].map(i => i.value);
        if (!picked.length) { error.textContent = "Hãy đánh dấu ít nhất một trường."; return; }
        done({ mode, fields: picked, prefix: "", suffix: "" });
      } else {
        const field = overlay.querySelector(".vno-ab-greet-field")?.value || "";
        if (!field) { error.textContent = "Hãy chọn trường tên người nhận."; return; }
        done({ mode, fields: [field], prefix: overlay.querySelector(".vno-ab-prefix").value, suffix: overlay.querySelector(".vno-ab-suffix").value });
      }
    };
    overlay.querySelector(".vno-dialog-insert-btn").addEventListener("click", commit);
    overlay.querySelector(".vno-dialog-cancel-btn").addEventListener("click", () => done(null));
    overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => done(null));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) done(null); });
    const onKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); done(null); }
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); commit(); }
      else if (e.key === "Tab") trapFocus(dialogBox, e);
    };
    document.addEventListener("keydown", onKeyDown);
    (overlay.querySelector(".vno-ab-field, .vno-ab-prefix"))?.focus();
  });
}

/**
 * Hiển thị Hộp thoại Hoàn tất và Trộn thư (Finish & Merge)
 * Hỗ trợ các tùy chọn:
 * - Hợp nhất ra tài liệu mới (các trang nối tiếp phân tách bằng ngắt trang)
 * - In trực tiếp các tài liệu đã trộn
 * - Phạm vi: Toàn bộ bản ghi đã chọn, bản ghi hiện tại, hoặc từ bản ghi X đến Y
 * 
 * @param {Object} options
 * @param {number} [options.totalRecords=0]
 * @param {number} [options.currentIndex=0]
 * @param {Function} [options.onFinish]
 * @param {Function} [options.onCancel]
 */
export function showMailMergeIfDialog({ fields = [], onInsert, onCancel } = {}) {
  if (typeof document === "undefined" || !document.body) { onCancel?.(); return; }
  closeActiveMailMergeIfDialog?.(false);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const overlay = document.createElement("div"); overlay.className = "vno-dialog-overlay";
  const previousFocused = document.activeElement;
  overlay.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-merge-if-title"><div class="vno-dialog-header"><span id="vno-merge-if-title">${t("writerDialogs.mailMerge.ifTitle", "Quy tắc Nếu...Thì...Ngược lại")}</span><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${t("common.close", "Đóng")}">×</button></div><div class="vno-dialog-body" style="display:grid;gap:10px;padding:16px"><label>${t("writerDialogs.mailMerge.ifField", "Trường")}<select data-field aria-describedby="vno-merge-if-error">${fields.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join("")}</select></label><p id="vno-merge-if-error" class="vno-dialog-error" role="alert" hidden style="margin:0;color:var(--vno-color-error,#b91c1c);font-size:12px">${t("writerDialogs.mailMerge.ifFieldRequired", "Vui lòng chọn trường dữ liệu.")}</p><label>${t("writerDialogs.mailMerge.ifOperator", "Toán tử")}<select data-op><option value="equals">${t("writerDialogs.mailMerge.opEquals", "bằng")}</option><option value="notEquals">${t("writerDialogs.mailMerge.opNotEquals", "khác")}</option><option value="contains">${t("writerDialogs.mailMerge.opContains", "chứa")}</option><option value="greaterThan">${t("writerDialogs.mailMerge.opGreater", "lớn hơn")}</option><option value="lessThan">${t("writerDialogs.mailMerge.opLess", "nhỏ hơn")}</option><option value="empty">${t("writerDialogs.mailMerge.opEmpty", "rỗng")}</option><option value="notEmpty">${t("writerDialogs.mailMerge.opNotEmpty", "không rỗng")}</option></select></label><label>${t("writerDialogs.mailMerge.ifValue", "Giá trị")}<input data-value></label><label>${t("writerDialogs.mailMerge.ifThen", "Thì")}<input data-then></label><label>${t("writerDialogs.mailMerge.ifElse", "Ngược lại")}<input data-else></label><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" data-cancel>${t("common.cancel", "Hủy")}</button><button type="button" data-insert>${t("writerDialogs.mailMerge.insertBtn", "Chèn")}</button></div></div></div>`;
  const dialogBox = overlay.querySelector(".vno-dialog-box");
  const fieldSelect = overlay.querySelector("[data-field]");
  const fieldError = overlay.querySelector("#vno-merge-if-error");
  const close = (cancel=true) => {
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    if (closeActiveMailMergeIfDialog === close) closeActiveMailMergeIfDialog = null;
    previousFocused?.focus?.();
    if(cancel) onCancel?.();
  };
  overlay.querySelector("[data-cancel]").onclick=()=>close(true); overlay.querySelector(".vno-dialog-close-btn").onclick=()=>close(true);
  overlay.querySelector("[data-insert]").onclick=()=>{
    if (!String(fieldSelect?.value || "").trim()) {
      fieldSelect?.setAttribute("aria-invalid", "true");
      if (fieldError) fieldError.hidden = false;
      fieldSelect?.focus?.();
      return;
    }
    fieldSelect.removeAttribute("aria-invalid");
    onInsert?.({ field:fieldSelect.value, op:overlay.querySelector("[data-op]").value, value:overlay.querySelector("[data-value]").value, then:overlay.querySelector("[data-then]").value, otherwise:overlay.querySelector("[data-else]").value }); close(false);
  };
  overlay.addEventListener("click", event => { if (event.target === overlay) close(true); });
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      trapFocus(dialogBox, event);
    }
  };
  document.body.appendChild(overlay);
  document.addEventListener("keydown", onKeyDown);
  closeActiveMailMergeIfDialog = close;
  fieldSelect?.focus();
}

export function showFinishMailMergeDialog({
  totalRecords = 0,
  currentIndex = 0,
  onFinish,
  onCancel
}) {
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    if (onCancel) onCancel();
    return;
  }

  const previousFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 480px;" role="dialog" aria-modal="true" aria-labelledby="vno-merge-finish-title">
      <div class="vno-dialog-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:flex;color:var(--vno-app-current-fg, #0f4c81);" aria-hidden="true">${ICONS.mergeFinish || ""}</span>
          <span id="vno-merge-finish-title" style="font-weight:600;font-size:15px;">Hoàn tất và Trộn thư</span>
        </div>
        <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close", "Đóng")}" aria-label="${t("common.close", "Đóng")}">&times;</button>
      </div>

      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:16px;padding:16px;">
        <!-- Lựa chọn hình thức xuất kết quả -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-weight:600;font-size:13px;color:var(--vno-text-primary);">Hình thức xuất kết quả:</div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--vno-text-primary);cursor:pointer;">
            <input type="radio" name="vno-merge-mode" value="document" checked style="cursor:pointer;" />
            <span>Tạo tài liệu mới (Hợp nhất toàn bộ bản ghi nối tiếp nhau bằng ngắt trang)</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--vno-text-primary);cursor:pointer;">
            <input type="radio" name="vno-merge-mode" value="print" style="cursor:pointer;" />
            <span>In tài liệu trực tiếp (Mở hộp thoại In cho toàn bộ bản ghi)</span>
          </label>
        </div>

        <!-- Lựa chọn phạm vi bản ghi -->
        <div style="display:flex;flex-direction:column;gap:8px;padding-top:8px;border-top:1px solid var(--vno-border-subtle, #e2e8f0);">
          <div style="font-weight:600;font-size:13px;color:var(--vno-text-primary);">Phạm vi bản ghi:</div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--vno-text-primary);cursor:pointer;">
            <input type="radio" name="vno-merge-range" value="all" checked style="cursor:pointer;" />
            <span>Tất cả người nhận đã chọn (${totalRecords} bản ghi)</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--vno-text-primary);cursor:pointer;">
            <input type="radio" name="vno-merge-range" value="current" style="cursor:pointer;" />
            <span>Chỉ bản ghi đang xem trước (Bản ghi ${currentIndex + 1})</span>
          </label>
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--vno-text-primary);">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="radio" name="vno-merge-range" value="from_to" style="cursor:pointer;" />
              <span>Từ bản ghi:</span>
            </label>
            <input type="number" id="vno-merge-from" min="1" max="${totalRecords}" value="1" style="width:60px;padding:3px 6px;border:1px solid var(--vno-border-default);border-radius:4px;outline:none;" />
            <span>đến:</span>
            <input type="number" id="vno-merge-to" min="1" max="${totalRecords}" value="${totalRecords}" style="width:60px;padding:3px 6px;border:1px solid var(--vno-border-default);border-radius:4px;outline:none;" />
          </div>
        </div>
      </div>

      <div class="vno-dialog-footer" style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
        <button class="vno-btn vno-dialog-cancel-btn">${t("common.cancel", "Hủy")}</button>
        <button class="vno-btn vno-btn-primary vno-dialog-submit-btn">Hoàn tất và Trộn</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const dialogBox = overlay.querySelector(".vno-dialog-box");

  const submitBtn = overlay.querySelector(".vno-dialog-submit-btn");
  const cancelBtn = overlay.querySelector(".vno-dialog-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
  const fromInput = overlay.querySelector("#vno-merge-from");
  const toInput = overlay.querySelector("#vno-merge-to");

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (previousFocused && typeof previousFocused.focus === "function") {
      previousFocused.focus();
    }
  };

  const finishSubmit = () => {
    const modeEl = overlay.querySelector('input[name="vno-merge-mode"]:checked');
    const rangeEl = overlay.querySelector('input[name="vno-merge-range"]:checked');
    const mode = modeEl ? modeEl.value : "document";
    const range = rangeEl ? rangeEl.value : "all";
    const from = parseInt(fromInput?.value, 10) || 1;
    const to = parseInt(toInput?.value, 10) || totalRecords;

    cleanup();
    if (onFinish) {
      onFinish({ mode, range, from, to });
    }
  };

  const finishCancel = () => {
    cleanup();
    if (onCancel) onCancel();
  };

  submitBtn.addEventListener("click", finishSubmit);
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
      finishSubmit();
    } else if (e.key === "Tab") {
      trapFocus(dialogBox, e);
    }
  };
  document.addEventListener("keydown", onKeyDown);

  submitBtn.focus();
}
