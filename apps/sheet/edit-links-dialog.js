/**
 * VN Office — Hộp thoại Chỉnh sửa liên kết (Edit Links Dialog) cho VN Sheet.
 * Cung cấp giao diện quản lý liên kết ngoài tới các sổ làm việc khác:
 *  - Liệt kê danh sách các tệp nguồn, loại, chế độ cập nhật, trạng thái.
 *  - Cập nhật giá trị (Update Values): cập nhật giá trị cache từ tệp nguồn.
 *  - Đổi nguồn (Change Source): thay thế đường dẫn tệp nguồn trong các công thức.
 *  - Mở nguồn (Open Source): mở tệp nguồn để xem hoặc chỉnh sửa.
 *  - Ngắt liên kết (Break Link): chuyển đổi công thức tham chiếu ngoài thành giá trị hiện tại.
 *  - Kiểm tra trạng thái (Check Status): kiểm tra tính khả dụng của tệp nguồn.
 *  - Lời nhắc khởi động (Startup Prompt): thông báo tùy chọn khi mở sổ làm việc.
 */

import { t } from "../../platform/i18n/i18n.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[char]);

export class EditLinksDialog {
  static show(grid) {
    if (!grid || typeof document === "undefined" || !document.body) return false;

    // Đóng hộp thoại cũ nếu đang mở
    document.querySelectorAll(".vno-edit-links-dialog, .vno-edit-links-overlay").forEach(node => node.remove());

    const overlay = document.createElement("div");
    overlay.className = "vno-edit-links-overlay vno-dialog-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `;

    const dialog = document.createElement("div");
    dialog.className = "vno-edit-links-dialog vno-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", t("sheetDialogs.editLinks.title", "Chỉnh sửa liên kết"));
    dialog.style.cssText = `
      background: #ffffff; border-radius: 8px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      width: 680px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px; color: #1e293b; overflow: hidden;
    `;

    let linkSources = grid.getLinkSources ? grid.getLinkSources() : [];
    let selectedIndex = linkSources.length > 0 ? 0 : -1;

    dialog.innerHTML = `
      <div class="vno-dialog-header" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${t("sheetDialogs.editLinks.title", "Chỉnh sửa liên kết")}</h3>
        <button type="button" class="vno-dialog-close-btn" style="background: none; border: none; font-size: 18px; line-height: 1; cursor: pointer; color: #64748b;" aria-label="${t("common.close", "Đóng")}">×</button>
      </div>

      <div class="vno-dialog-body" style="padding: 16px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; gap: 14px; min-height: 220px;">
          <!-- Bảng danh sách liên kết bên trái -->
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; background: #fff;">
            <div style="display: grid; grid-template-columns: 2.2fr 1fr 0.8fr 1.2fr; background: #f8fafc; border-bottom: 1px solid #cbd5e1; font-weight: 600; padding: 6px 10px; font-size: 12px; color: #475569;">
              <div>${t("sheetDialogs.editLinks.colSource", "Nguồn")}</div>
              <div>${t("sheetDialogs.editLinks.colType", "Loại")}</div>
              <div>${t("sheetDialogs.editLinks.colUpdate", "Cập nhật")}</div>
              <div>${t("sheetDialogs.editLinks.colStatus", "Trạng thái")}</div>
            </div>
            <div id="vno-links-list" style="flex: 1; overflow-y: auto; max-height: 200px;" tabindex="0">
              <!-- Sẽ render động -->
            </div>
          </div>

          <!-- Nhóm nút hành động bên phải -->
          <div style="width: 170px; display: flex; flex-direction: column; gap: 8px;">
            <button type="button" id="vno-link-btn-update" class="vno-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: #0f172a; cursor: pointer; text-align: left;">
              ${t("sheetDialogs.editLinks.updateValues", "Cập nhật giá trị")}
            </button>
            <button type="button" id="vno-link-btn-change" class="vno-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: #0f172a; cursor: pointer; text-align: left;">
              ${t("sheetDialogs.editLinks.changeSource", "Đổi nguồn...")}
            </button>
            <button type="button" id="vno-link-btn-open" class="vno-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: #0f172a; cursor: pointer; text-align: left;">
              ${t("sheetDialogs.editLinks.openSource", "Mở nguồn")}
            </button>
            <button type="button" id="vno-link-btn-break" class="vno-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid #f87171; border-radius: 4px; background: #fef2f2; color: #b91c1c; cursor: pointer; text-align: left;">
              ${t("sheetDialogs.editLinks.breakLink", "Ngắt liên kết")}
            </button>
            <button type="button" id="vno-link-btn-check" class="vno-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: #0f172a; cursor: pointer; text-align: left;">
              ${t("sheetDialogs.editLinks.checkStatus", "Kiểm tra trạng thái")}
            </button>
            <div style="flex: 1;"></div>
            <button type="button" id="vno-link-btn-prompt" class="vno-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: #0f172a; cursor: pointer; text-align: left;">
              ${t("sheetDialogs.editLinks.startupPrompt", "Lời nhắc khởi động...")}
            </button>
          </div>
        </div>

        <!-- Chi tiết vị trí và kiểu cập nhật -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px; align-items: baseline;">
            <span style="font-weight: 600; color: #475569; width: 60px;">${t("sheetDialogs.editLinks.location", "Vị trí:")}</span>
            <span id="vno-link-location" style="flex: 1; word-break: break-all; color: #0f172a; font-family: monospace; font-size: 12px;"></span>
          </div>
          <div style="display: flex; gap: 24px; align-items: center; margin-left: 68px;">
            <span style="font-weight: 600; color: #475569;">${t("sheetDialogs.editLinks.updateLabel", "Cập nhật:")}</span>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="radio" name="vno-link-update-mode" value="A" checked>
              <span>${t("sheetDialogs.editLinks.modeAuto", "Tự động")}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="radio" name="vno-link-update-mode" value="M" disabled>
              <span style="color: #94a3b8;">${t("sheetDialogs.editLinks.modeManual", "Thủ công")}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="vno-dialog-footer" style="padding: 12px 18px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="vno-dialog-close-btn vno-btn-primary" style="padding: 6px 18px; font-size: 13px; font-weight: 500; border-radius: 4px; border: 1px solid #cbd5e1; background: #0f6d38; color: #ffffff; cursor: pointer;">
          ${t("common.close", "Đóng")}
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const listEl = dialog.querySelector("#vno-links-list");
    const locationEl = dialog.querySelector("#vno-link-location");
    const btnUpdate = dialog.querySelector("#vno-link-btn-update");
    const btnChange = dialog.querySelector("#vno-link-btn-change");
    const btnOpen = dialog.querySelector("#vno-link-btn-open");
    const btnBreak = dialog.querySelector("#vno-link-btn-break");
    const btnCheck = dialog.querySelector("#vno-link-btn-check");
    const btnPrompt = dialog.querySelector("#vno-link-btn-prompt");

    function renderList() {
      linkSources = grid.getLinkSources ? grid.getLinkSources() : [];
      if (selectedIndex >= linkSources.length) {
        selectedIndex = linkSources.length - 1;
      }
      if (selectedIndex < 0 && linkSources.length > 0) {
        selectedIndex = 0;
      }

      listEl.innerHTML = "";

      if (linkSources.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 24px; text-align: center; color: #94a3b8;">
            ${t("sheetDialogs.editLinks.empty", "Sổ làm việc này không chứa liên kết nào tới các sổ làm việc khác.")}
          </div>
        `;
        locationEl.textContent = t("sheetDialogs.editLinks.noSelection", "Không có liên kết");
        btnUpdate.disabled = true;
        btnChange.disabled = true;
        btnOpen.disabled = true;
        btnBreak.disabled = true;
        btnCheck.disabled = true;
        [btnUpdate, btnChange, btnOpen, btnBreak, btnCheck].forEach(b => {
          b.style.opacity = "0.5";
          b.style.cursor = "not-allowed";
        });
        return;
      }

      btnUpdate.disabled = false;
      btnChange.disabled = false;
      btnOpen.disabled = false;
      btnBreak.disabled = false;
      btnCheck.disabled = false;
      [btnUpdate, btnChange, btnOpen, btnBreak, btnCheck].forEach(b => {
        b.style.opacity = "1";
        b.style.cursor = "pointer";
      });

      linkSources.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "vno-link-item";
        row.dataset.index = String(index);
        const isSelected = index === selectedIndex;
        row.style.cssText = `
          display: grid; grid-template-columns: 2.2fr 1fr 0.8fr 1.2fr;
          padding: 6px 10px; cursor: pointer; font-size: 12px; align-items: center;
          background: ${isSelected ? "#e0f2fe" : index % 2 === 0 ? "#ffffff" : "#f8fafc"};
          color: ${isSelected ? "#0369a1" : "#1e293b"};
          border-left: 3px solid ${isSelected ? "#0284c7" : "transparent"};
        `;

        const displaySource = item.displayName || item.fileName || item.source;
        const displayType = item.type || t("sheetDialogs.editLinks.typeWorksheet", "Bảng tính");
        const displayUpdate = item.update || "A";
        let displayStatus = item.status || t("sheetDialogs.editLinks.statusUnknown", "Chưa xác định");
        if (displayStatus === "OK") displayStatus = t("sheetDialogs.editLinks.statusOk", "Khả dụng");
        else if (displayStatus === "Source open") displayStatus = t("sheetDialogs.editLinks.statusOpen", "Nguồn đang mở");
        else if (displayStatus === "Error: Source not found") displayStatus = t("sheetDialogs.editLinks.statusNotFound", "Lỗi: Không tìm thấy nguồn");

        row.innerHTML = `
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${isSelected ? "600" : "normal"};" title="${esc(item.source)}">${esc(displaySource)}</div>
          <div>${esc(displayType)}</div>
          <div>${esc(displayUpdate)}</div>
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${esc(displayStatus)}">${esc(displayStatus)}</div>
        `;

        row.addEventListener("click", () => {
          selectedIndex = index;
          renderList();
        });

        listEl.appendChild(row);
      });

      const selected = linkSources[selectedIndex];
      if (selected) {
        locationEl.textContent = selected.source;
      } else {
        locationEl.textContent = "";
      }
    }

    renderList();

    // Xử lý các nút hành động
    btnUpdate.addEventListener("click", () => {
      if (selectedIndex < 0 || !linkSources[selectedIndex]) return;
      const target = linkSources[selectedIndex];
      if (grid.updateLinkValues) {
        grid.updateLinkValues(target.source);
      }
      renderList();
      grid.options?.shell?.setStatus?.(t("sheetDialogs.editLinks.updatedMsg", "Đã cập nhật giá trị cho liên kết: {source}", { source: target.source }));
    });

    btnChange.addEventListener("click", () => {
      if (selectedIndex < 0 || !linkSources[selectedIndex]) return;
      const target = linkSources[selectedIndex];
      const newSource = window.prompt?.(
        t("sheetDialogs.editLinks.promptNewSource", "Nhập đường dẫn hoặc tên tệp nguồn mới:"),
        target.source
      );
      if (newSource && newSource.trim() && newSource.trim() !== target.source) {
        if (grid.changeLink) {
          grid.changeLink(target.source, newSource.trim());
        }
        renderList();
      }
    });

    btnOpen.addEventListener("click", () => {
      if (selectedIndex < 0 || !linkSources[selectedIndex]) return;
      const target = linkSources[selectedIndex];
      if (grid.openLinkSource) {
        grid.openLinkSource(target.source);
      } else {
        window.alert?.(t("sheetDialogs.editLinks.openNotice", "Đang mở tệp nguồn: {source}", { source: target.source }));
      }
    });

    btnBreak.addEventListener("click", () => {
      if (selectedIndex < 0 || !linkSources[selectedIndex]) return;
      const target = linkSources[selectedIndex];
      const confirmMsg = t(
        "sheetDialogs.editLinks.breakConfirm",
        "Ngắt liên kết sẽ chuyển đổi vĩnh viễn các công thức tham chiếu nguồn này thành giá trị hiện tại của chúng. Bạn có muốn tiếp tục ngắt liên kết không?"
      );
      const confirmed = window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) {
        if (grid.breakLink) {
          grid.breakLink(target.source);
        }
        renderList();
      }
    });

    btnCheck.addEventListener("click", () => {
      if (selectedIndex < 0 || !linkSources[selectedIndex]) return;
      const target = linkSources[selectedIndex];
      if (grid.checkLinkStatus) {
        const newStatus = grid.checkLinkStatus(target.source);
        target.status = newStatus;
      }
      renderList();
    });

    btnPrompt.addEventListener("click", () => {
      window.alert?.(
        t("sheetDialogs.editLinks.startupNotice", "Tùy chọn lời nhắc khi mở sổ làm việc: Mặc định VN Office không tự động cập nhật liên kết ngoài để đảm bảo an toàn bảo mật ngoại tuyến.")
      );
    });

    function closeDialog() {
      overlay.remove();
    }

    dialog.querySelectorAll(".vno-dialog-close-btn").forEach(btn => {
      btn.addEventListener("click", closeDialog);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        window.removeEventListener("keydown", handleKeyDown);
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return true;
  }
}
