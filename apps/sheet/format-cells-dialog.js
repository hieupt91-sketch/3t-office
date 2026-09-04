/**
 * VN Office — Format Cells Dialog (Ctrl+1)
 * Hộp thoại Định dạng ô chuẩn phong cách Microsoft Excel & LibreOffice Calc
 */

import { NumberFormatter } from "./number-formatter.js";
import { t } from "../../platform/i18n/i18n.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

export class FormatCellsDialog {
  /**
   * Mở hộp thoại Format Cells
   * @param {Object} options
   * @param {Object} [options.currentConfig] Cấu hình định dạng hiện tại của ô
   * @param {any} [options.sampleValue] Giá trị mẫu của ô đang chọn
   * @param {Function} options.onApply Callback khi người dùng nhấn OK (config) => void
   * @param {Function} [options.onClose] Callback khi hộp thoại đóng () => void
   */
  static show({ currentConfig = null, sampleValue = 1234.5678, onApply, onClose }) {
    if (typeof document === "undefined" || !document.body) return;

    // Đóng dialog cũ nếu có
    document.querySelectorAll(".vno-format-cells-overlay").forEach(el => el.remove());

    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-format-cells-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    // Khởi tạo state cấu hình
    const state = {
      category: currentConfig?.category || "general",
      decimals: currentConfig?.decimals !== undefined ? Number(currentConfig.decimals) : 2,
      useThousands: currentConfig?.useThousands !== undefined ? Boolean(currentConfig.useThousands) : true,
      negativeStyle: currentConfig?.negativeStyle !== undefined ? Number(currentConfig.negativeStyle) : 0,
      currencySymbol: currentConfig?.currencySymbol !== undefined ? currentConfig.currencySymbol : "₫",
      dateFormat: currentConfig?.dateFormat || "dd/mm/yyyy",
      customPattern: currentConfig?.customPattern || "0.00"
    };

    // Nếu sampleValue là rỗng hoặc không có, dùng giá trị mẫu đại diện
    let activeSampleVal = (sampleValue !== null && sampleValue !== undefined && sampleValue !== "") 
      ? sampleValue 
      : 1234.5678;

    const categories = [
      { id: "general", label: t("sheetFormatCells.catGeneral", "Chung (General)") },
      { id: "number", label: t("sheetFormatCells.catNumber", "Số (Number)") },
      { id: "currency", label: t("sheetFormatCells.catCurrency", "Tiền tệ (Currency)") },
      { id: "accounting", label: t("sheetFormatCells.catAccounting", "Kế toán (Accounting)") },
      { id: "date", label: t("sheetFormatCells.catDate", "Ngày tháng (Date)") },
      { id: "percentage", label: t("sheetFormatCells.catPercentage", "Phần trăm (Percentage)") },
      { id: "scientific", label: t("sheetFormatCells.catScientific", "Khoa học (Scientific)") },
      { id: "text", label: t("sheetFormatCells.catText", "Văn bản (Text)") },
      { id: "custom", label: t("sheetFormatCells.catCustom", "Tùy chỉnh (Custom)") }
    ];

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-format-cells-box" style="width: 600px; max-width: 95vw; background: #ffffff; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
        <!-- Dialog Header -->
        <div class="vno-dialog-header" style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <div style="display:flex; align-items:center; gap: 8px; font-weight: 600; font-size: 14px; color: #0f172a;">
            <span style="display:flex; width:18px; height:18px; color: #0f6d38;">${ICONS.formatCells || ICONS.appSheet || ""}</span>
            <span>${t("sheetFormatCells.dialogTitle", "Định dạng ô (Format Cells)")}</span>
          </div>
          <button class="vno-btn vno-btn-icon-only vno-fc-close-btn" title="Đóng" style="font-size: 18px; line-height: 1; border:none; background:transparent; cursor:pointer; color:#64748b;">&times;</button>
        </div>

        <!-- Tabs Header (Number is active) -->
        <div class="vno-fc-tabs" style="display:flex; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 0 8px; gap: 4px;">
          <button type="button" class="vno-fc-tab is-active" style="padding: 8px 14px; font-size: 12px; font-weight: 600; color: #0f6d38; background: #ffffff; border: 1px solid #cbd5e1; border-bottom-color: #ffffff; margin-bottom: -1px; border-radius: 4px 4px 0 0; cursor: pointer;">
            ${t("sheetFormatCells.tabNumber", "Số")}
          </button>
          <button type="button" class="vno-fc-tab" style="padding: 8px 14px; font-size: 12px; font-weight: 500; color: #64748b; background: transparent; border: none; cursor: not-allowed;" title="Định dạng số được ưu tiên">
            ${t("sheetFormatCells.tabAlignment", "Căn chỉnh")}
          </button>
          <button type="button" class="vno-fc-tab" style="padding: 8px 14px; font-size: 12px; font-weight: 500; color: #64748b; background: transparent; border: none; cursor: not-allowed;">
            ${t("sheetFormatCells.tabFont", "Phông chữ")}
          </button>
          <button type="button" class="vno-fc-tab" style="padding: 8px 14px; font-size: 12px; font-weight: 500; color: #64748b; background: transparent; border: none; cursor: not-allowed;">
            ${t("sheetFormatCells.tabBorder", "Đường viền")}
          </button>
          <button type="button" class="vno-fc-tab" style="padding: 8px 14px; font-size: 12px; font-weight: 500; color: #64748b; background: transparent; border: none; cursor: not-allowed;">
            ${t("sheetFormatCells.tabFill", "Tô màu")}
          </button>
          <button type="button" class="vno-fc-tab" style="padding: 8px 14px; font-size: 12px; font-weight: 500; color: #64748b; background: transparent; border: none; cursor: not-allowed;">
            ${t("sheetFormatCells.tabProtection", "Bảo vệ")}
          </button>
        </div>

        <!-- Dialog Body -->
        <div class="vno-dialog-body" style="display:flex; gap: 16px; padding: 16px; min-height: 320px;">
          <!-- Left Column: Category List -->
          <div style="width: 170px; display:flex; flex-direction:column; gap: 6px;">
            <label style="font-size: 12px; font-weight: 600; color: #334155;">
              ${t("sheetFormatCells.categoryLabel", "Thể loại:")}
            </label>
            <div class="vno-fc-category-list" style="border: 1px solid #cbd5e1; border-radius: 4px; overflow-y: auto; height: 280px; background: #ffffff; padding: 2px;">
              ${categories.map(cat => `
                <div class="vno-fc-cat-item ${cat.id === state.category ? 'is-selected' : ''}" data-cat="${cat.id}"
                     style="padding: 5px 10px; font-size: 12px; cursor: pointer; border-radius: 3px; user-select: none; ${cat.id === state.category ? 'background:#e7f4ec; color:#0f6d38; font-weight:600;' : 'color:#1e293b;'}">
                  ${cat.label}
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Right Column: Sample Preview & Category Options -->
          <div style="flex: 1; display:flex; flex-direction:column; gap: 12px;">
            <!-- Sample Box -->
            <div style="display:flex; flex-direction:column; gap: 4px;">
              <label style="font-size: 12px; font-weight: 600; color: #334155;">
                ${t("sheetFormatCells.sampleLabel", "Mẫu (Sample):")}
              </label>
              <div id="vno-fc-sample-box" style="height: 38px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; display:flex; align-items:center; padding: 0 12px; font-size: 13px; font-weight: 600; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <!-- Sample text updated dynamically -->
              </div>
            </div>

            <!-- Dynamic Options Panel -->
            <div id="vno-fc-options-panel" style="flex: 1; display:flex; flex-direction:column; gap: 10px;">
              <!-- Will be rendered by renderOptionsPanel() -->
            </div>
          </div>
        </div>

        <!-- Dialog Footer -->
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap: 8px; padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
          <button type="button" class="vno-btn vno-fc-cancel-btn" style="padding: 6px 16px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; color: #334155; cursor: pointer;">
            ${t("common.cancel", "Hủy bỏ")}
          </button>
          <button type="button" class="vno-btn vno-btn-primary vno-fc-ok-btn" style="padding: 6px 20px; font-size: 13px; font-weight: 600; border: none; border-radius: 4px; background: #0f6d38; color: #ffffff; cursor: pointer;">
            ${t("common.ok", "Đồng ý")}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const sampleBox = overlay.querySelector("#vno-fc-sample-box");
    const optionsPanel = overlay.querySelector("#vno-fc-options-panel");

    // Cập nhật Sample Box
    const updateSample = () => {
      let sampleInput = activeSampleVal;
      if (state.category === "date") {
        if (typeof sampleInput === "number" && sampleInput < 100000) {
          sampleInput = new Date();
        } else if (!(sampleInput instanceof Date) && isNaN(Date.parse(sampleInput))) {
          sampleInput = new Date();
        }
      } else if (state.category === "percentage") {
        if (typeof sampleInput !== "number" || isNaN(sampleInput)) {
          sampleInput = 0.5;
        } else if (sampleInput > 1 && sampleInput <= 100) {
          // nếu sampleVal là 50 thì giữ 0.5
          sampleInput = sampleInput / 100;
        }
      }

      const res = NumberFormatter.formatValue(sampleInput, state);
      sampleBox.textContent = res.text || "";
      sampleBox.style.color = res.isRed ? "#dc2626" : "#0f172a";
      sampleBox.style.textAlign = res.align || "left";
      sampleBox.style.justifyContent = res.align === "right" ? "flex-end" : "flex-start";
    };

    // Render panel tùy chọn theo Category
    const renderOptionsPanel = () => {
      optionsPanel.innerHTML = "";

      switch (state.category) {
        case "general": {
          optionsPanel.innerHTML = `
            <div style="font-size: 12px; color: #475569; line-height: 1.6; padding-top: 8px;">
              ${t("sheetFormatCells.generalDesc", "Các ô định dạng Chung không có định dạng số cụ thể. Số và chữ sẽ được hiển thị như khi nhập.")}
            </div>
          `;
          break;
        }

        case "number": {
          optionsPanel.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
              </label>
              <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                     style="width: 70px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
            </div>

            <div style="display:flex; align-items:center; gap: 8px; margin-top: 4px;">
              <input type="checkbox" id="vno-fc-thousands" ${state.useThousands ? "checked" : ""} style="cursor: pointer;">
              <label for="vno-fc-thousands" style="font-size: 12px; color: #334155; cursor: pointer;">
                ${t("sheetFormatCells.useThousands", "Sử dụng dấu phân cách hàng nghìn (1,000)")}
              </label>
            </div>

            <div style="display:flex; flex-direction:column; gap: 4px; margin-top: 6px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.negativeNumbers", "Số âm:")}
              </label>
              <div id="vno-fc-negative-list" style="border: 1px solid #cbd5e1; border-radius: 4px; max-height: 120px; overflow-y: auto; background: #ffffff;">
                <div class="vno-fc-neg-item ${state.negativeStyle === 0 ? 'is-selected' : ''}" data-neg="0" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #0f172a; ${state.negativeStyle === 0 ? 'background:#e2e8f0;' : ''}">-1234.10</div>
                <div class="vno-fc-neg-item ${state.negativeStyle === 1 ? 'is-selected' : ''}" data-neg="1" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #dc2626; ${state.negativeStyle === 1 ? 'background:#e2e8f0;' : ''}">1234.10</div>
                <div class="vno-fc-neg-item ${state.negativeStyle === 2 ? 'is-selected' : ''}" data-neg="2" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #0f172a; ${state.negativeStyle === 2 ? 'background:#e2e8f0;' : ''}">(1234.10)</div>
                <div class="vno-fc-neg-item ${state.negativeStyle === 3 ? 'is-selected' : ''}" data-neg="3" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #dc2626; ${state.negativeStyle === 3 ? 'background:#e2e8f0;' : ''}">(1234.10)</div>
              </div>
            </div>
          `;

          const decInput = optionsPanel.querySelector("#vno-fc-decimals");
          decInput.addEventListener("input", (e) => {
            state.decimals = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0));
            updateSample();
          });

          const thCheck = optionsPanel.querySelector("#vno-fc-thousands");
          thCheck.addEventListener("change", (e) => {
            state.useThousands = e.target.checked;
            updateSample();
          });

          const negItems = optionsPanel.querySelectorAll(".vno-fc-neg-item");
          negItems.forEach(item => {
            item.addEventListener("click", () => {
              negItems.forEach(i => i.style.background = "transparent");
              item.style.background = "#e2e8f0";
              state.negativeStyle = Number(item.dataset.neg);
              updateSample();
            });
          });
          break;
        }

        case "currency": {
          optionsPanel.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
              </label>
              <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                     style="width: 70px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
            </div>

            <div style="display:flex; align-items:center; gap: 12px; margin-top: 4px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.currencySymbol", "Ký hiệu tiền tệ:")}
              </label>
              <select id="vno-fc-symbol" style="flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; background: #ffffff;">
                <option value="₫" ${state.currencySymbol === "₫" ? "selected" : ""}>₫ (VNĐ - Việt Nam)</option>
                <option value="$" ${state.currencySymbol === "$" ? "selected" : ""}>$ ($ USD - Tiếng Anh Hoa Kỳ)</option>
                <option value="€" ${state.currencySymbol === "€" ? "selected" : ""}>€ (€ EUR - Châu Âu)</option>
                <option value="¥" ${state.currencySymbol === "¥" ? "selected" : ""}>¥ (¥ JPY/CNY - Nhật Bản/Trung Quốc)</option>
                <option value="£" ${state.currencySymbol === "£" ? "selected" : ""}>£ (£ GBP - Vương quốc Anh)</option>
                <option value="" ${state.currencySymbol === "" ? "selected" : ""}>${t("sheetFormatCells.noSymbol", "(Không có)")}</option>
              </select>
            </div>

            <div style="display:flex; flex-direction:column; gap: 4px; margin-top: 6px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.negativeNumbers", "Số âm:")}
              </label>
              <div id="vno-fc-negative-list" style="border: 1px solid #cbd5e1; border-radius: 4px; max-height: 100px; overflow-y: auto; background: #ffffff;">
                <div class="vno-fc-neg-item ${state.negativeStyle === 0 ? 'is-selected' : ''}" data-neg="0" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #0f172a; ${state.negativeStyle === 0 ? 'background:#e2e8f0;' : ''}">-1,234.10 ₫</div>
                <div class="vno-fc-neg-item ${state.negativeStyle === 1 ? 'is-selected' : ''}" data-neg="1" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #dc2626; ${state.negativeStyle === 1 ? 'background:#e2e8f0;' : ''}">1,234.10 ₫</div>
                <div class="vno-fc-neg-item ${state.negativeStyle === 2 ? 'is-selected' : ''}" data-neg="2" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #0f172a; ${state.negativeStyle === 2 ? 'background:#e2e8f0;' : ''}">(1,234.10 ₫)</div>
                <div class="vno-fc-neg-item ${state.negativeStyle === 3 ? 'is-selected' : ''}" data-neg="3" style="padding: 4px 8px; font-size: 12px; cursor: pointer; color: #dc2626; ${state.negativeStyle === 3 ? 'background:#e2e8f0;' : ''}">(1,234.10 ₫)</div>
              </div>
            </div>
          `;

          const decInput = optionsPanel.querySelector("#vno-fc-decimals");
          decInput.addEventListener("input", (e) => {
            state.decimals = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0));
            updateSample();
          });

          const symSelect = optionsPanel.querySelector("#vno-fc-symbol");
          symSelect.addEventListener("change", (e) => {
            state.currencySymbol = e.target.value;
            updateSample();
          });

          const negItems = optionsPanel.querySelectorAll(".vno-fc-neg-item");
          negItems.forEach(item => {
            item.addEventListener("click", () => {
              negItems.forEach(i => i.style.background = "transparent");
              item.style.background = "#e2e8f0";
              state.negativeStyle = Number(item.dataset.neg);
              updateSample();
            });
          });
          break;
        }

        case "accounting": {
          optionsPanel.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
              </label>
              <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                     style="width: 70px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
            </div>

            <div style="display:flex; align-items:center; gap: 12px; margin-top: 4px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.currencySymbol", "Ký hiệu tiền tệ:")}
              </label>
              <select id="vno-fc-symbol" style="flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; background: #ffffff;">
                <option value="₫" ${state.currencySymbol === "₫" ? "selected" : ""}>₫ (VNĐ - Việt Nam)</option>
                <option value="$" ${state.currencySymbol === "$" ? "selected" : ""}>$ ($ USD - Hoa Kỳ)</option>
                <option value="€" ${state.currencySymbol === "€" ? "selected" : ""}>€ (€ EUR - Châu Âu)</option>
                <option value="¥" ${state.currencySymbol === "¥" ? "selected" : ""}>¥ (¥ JPY/CNY)</option>
                <option value="£" ${state.currencySymbol === "£" ? "selected" : ""}>£ (£ GBP)</option>
                <option value="" ${state.currencySymbol === "" ? "selected" : ""}>${t("sheetFormatCells.noSymbol", "(Không có)")}</option>
              </select>
            </div>

            <div style="font-size: 12px; color: #475569; line-height: 1.6; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-top: 6px;">
              <strong>${t("sheetFormatCells.accountingTitle", "Đặc điểm định dạng Kế toán:")}</strong><br>
              • ${t("sheetFormatCells.accountingRule1", "Ký hiệu tiền tệ luôn căn sát lề trái ô tính.")}<br>
              • ${t("sheetFormatCells.accountingRule2", "Giá trị số luôn căn sát lề phải để thẳng hàng dấu thập phân.")}<br>
              • ${t("sheetFormatCells.accountingRule3", "Số 0 hiển thị thành dấu gạch ngang (-).")}<br>
              • ${t("sheetFormatCells.accountingRule4", "Số âm không dùng dấu trừ mà đặt trong dấu ngoặc đơn: (1,234.00).")}
            </div>
          `;

          const decInput = optionsPanel.querySelector("#vno-fc-decimals");
          decInput.addEventListener("input", (e) => {
            state.decimals = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0));
            updateSample();
          });

          const symSelect = optionsPanel.querySelector("#vno-fc-symbol");
          symSelect.addEventListener("change", (e) => {
            state.currencySymbol = e.target.value;
            updateSample();
          });
          break;
        }

        case "date": {
          const dateFormats = [
            { id: "dd/mm/yyyy", label: "14/03/2024 (dd/mm/yyyy - Chuẩn VN)" },
            { id: "dd-mm-yyyy", label: "14-03-2024 (dd-mm-yyyy)" },
            { id: '"ngày" dd "tháng" mm "năm" yyyy', label: "ngày 14 tháng 03 năm 2024 (Văn bản hành chính)" },
            { id: "yyyy-mm-dd", label: "2024-03-14 (yyyy-mm-dd - Quốc tế ISO)" },
            { id: "d/m/yyyy", label: "14/3/2024 (d/m/yyyy)" },
            { id: "dd/mm/yyyy hh:mm", label: "14/03/2024 13:30 (dd/mm/yyyy hh:mm)" },
            { id: "d mmmm yyyy", label: "14 tháng 3, 2024 (d mmmm, yyyy)" },
            { id: "dd-mm-yy", label: "14-03-24 (dd-mm-yy)" }
          ];

          optionsPanel.innerHTML = `
            <div style="display:flex; flex-direction:column; gap: 4px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.dateType", "Kiểu hiển thị ngày tháng (Type):")}
              </label>
              <div id="vno-fc-date-list" style="border: 1px solid #cbd5e1; border-radius: 4px; height: 160px; overflow-y: auto; background: #ffffff;">
                ${dateFormats.map(df => `
                  <div class="vno-fc-date-item ${state.dateFormat === df.id ? 'is-selected' : ''}" data-fmt="${df.id}"
                       style="padding: 6px 10px; font-size: 12px; cursor: pointer; ${state.dateFormat === df.id ? 'background:#e7f4ec; color:#0f6d38; font-weight:600;' : 'color:#1e293b;'}">
                    ${df.label}
                  </div>
                `).join("")}
              </div>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              ${t("sheetFormatCells.dateLocale", "Vùng/Ngôn ngữ: Tiếng Việt (Việt Nam)")}
            </div>
          `;

          const dateItems = optionsPanel.querySelectorAll(".vno-fc-date-item");
          dateItems.forEach(item => {
            item.addEventListener("click", () => {
              dateItems.forEach(i => {
                i.style.background = "transparent";
                i.style.color = "#1e293b";
                i.style.fontWeight = "normal";
              });
              item.style.background = "#e7f4ec";
              item.style.color = "#0f6d38";
              item.style.fontWeight = "600";
              state.dateFormat = item.dataset.fmt;
              updateSample();
            });
          });
          break;
        }

        case "percentage": {
          optionsPanel.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
              </label>
              <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                     style="width: 70px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
            </div>

            <div style="font-size: 12px; color: #475569; line-height: 1.6; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-top: 10px;">
              ${t("sheetFormatCells.percentageDesc", "Định dạng Phần trăm nhân giá trị ô với 100 và hiển thị kết quả kèm ký hiệu %. Giá trị lưu trữ gốc không đổi (ví dụ: 0.5 hiển thị là 50%). Khi gõ số mới vào ô đã định dạng %, số đó tự động chia cho 100.")}
            </div>
          `;

          const decInput = optionsPanel.querySelector("#vno-fc-decimals");
          decInput.addEventListener("input", (e) => {
            state.decimals = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0));
            updateSample();
          });
          break;
        }

        case "text": {
          optionsPanel.innerHTML = `
            <div style="font-size: 12px; color: #475569; line-height: 1.6; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
              ${t("sheetFormatCells.textDesc", "Các ô định dạng Văn bản được xử lý như chuỗi ký tự thô, ngay cả khi ô chứa số. Ô sẽ được căn lề trái tự nhiên và các hàm tính toán tổng số học như SUM sẽ bỏ qua ô này giống chuẩn Excel.")}
            </div>
          `;
          break;
        }

        case "scientific": {
          optionsPanel.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
              </label>
              <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                     style="width: 70px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
            </div>
          `;
          const decInput = optionsPanel.querySelector("#vno-fc-decimals");
          decInput.addEventListener("input", (e) => {
            state.decimals = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0));
            updateSample();
          });
          break;
        }

        case "custom": {
          const customPatterns = [
            "General",
            "0",
            "0.00",
            "#,##0",
            "#,##0.00",
            '#,##0 "đ"',
            '#,##0.00 "đ"',
            '#,##0 ₫;(#,##0 ₫);"-" ₫',
            '#,##0.00 ₫;(#,##0.00 ₫);"-" ₫',
            '$#,##0;($#,##0);"-"',
            "0%",
            "0.00%",
            "dd/mm/yyyy",
            "dd-mm-yyyy",
            "yyyy-mm-dd",
            "@"
          ];

          optionsPanel.innerHTML = `
            <div style="display:flex; flex-direction:column; gap: 6px;">
              <label style="font-size: 12px; color: #334155; font-weight: 500;">
                ${t("sheetFormatCells.customType", "Mã định dạng (Type):")}
              </label>
              <input type="text" id="vno-fc-custom-pattern" value="${state.customPattern}" 
                     style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; font-family: monospace;">
              
              <div id="vno-fc-custom-list" style="border: 1px solid #cbd5e1; border-radius: 4px; height: 140px; overflow-y: auto; background: #ffffff; margin-top: 4px;">
                ${customPatterns.map(p => `
                  <div class="vno-fc-pattern-item ${state.customPattern === p ? 'is-selected' : ''}" data-pattern="${p}"
                       style="padding: 4px 8px; font-size: 12px; font-family: monospace; cursor: pointer; ${state.customPattern === p ? 'background:#e7f4ec; color:#0f6d38;' : 'color:#1e293b;'}">
                    ${p}
                  </div>
                `).join("")}
              </div>
            </div>
          `;

          const patternInput = optionsPanel.querySelector("#vno-fc-custom-pattern");
          patternInput.addEventListener("input", (e) => {
            state.customPattern = e.target.value;
            updateSample();
          });

          const patternItems = optionsPanel.querySelectorAll(".vno-fc-pattern-item");
          patternItems.forEach(item => {
            item.addEventListener("click", () => {
              patternItems.forEach(i => {
                i.style.background = "transparent";
                i.style.color = "#1e293b";
              });
              item.style.background = "#e7f4ec";
              item.style.color = "#0f6d38";
              patternInput.value = item.dataset.pattern;
              state.customPattern = item.dataset.pattern;
              updateSample();
            });
          });
          break;
        }
      }

      updateSample();
    };

    // Category click handler
    const catItems = overlay.querySelectorAll(".vno-fc-cat-item");
    catItems.forEach(item => {
      item.addEventListener("click", () => {
        catItems.forEach(i => {
          i.classList.remove("is-selected");
          i.style.background = "transparent";
          i.style.color = "#1e293b";
          i.style.fontWeight = "normal";
        });
        item.classList.add("is-selected");
        item.style.background = "#e7f4ec";
        item.style.color = "#0f6d38";
        item.style.fontWeight = "600";
        state.category = item.dataset.cat;
        renderOptionsPanel();
      });
    });

    renderOptionsPanel();

    // Close logic
    const closeDialog = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === "function") onClose();
    };

    const applyDialog = () => {
      if (typeof onApply === "function") {
        onApply({ ...state });
      }
      closeDialog();
    };

    overlay.querySelector(".vno-fc-ok-btn").addEventListener("click", applyDialog);
    overlay.querySelector(".vno-fc-cancel-btn").addEventListener("click", closeDialog);
    overlay.querySelector(".vno-fc-close-btn").addEventListener("click", closeDialog);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey) {
        // Chỉ submit Enter nếu không ở textarea/multiline
        e.preventDefault();
        applyDialog();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    overlay.querySelector(".vno-fc-ok-btn").focus();
  }
}