/**
 * 3T Office — Format Cells Dialog (Ctrl+1)
 * Hộp thoại Định dạng ô chuẩn phong cách Microsoft Excel & LibreOffice Calc
 */

import { NumberFormatter } from "./number-formatter.js";
import { t } from "../../platform/i18n/i18n.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

function trapFocus(element, event) {
  if (event.key !== "Tab" || !element) return;
  const focusables = Array.from(element.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    '[href], input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

  if (!focusables || focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !element.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !element.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

export class FormatCellsDialog {
  /**
   * Mở hộp thoại Format Cells
   * @param {Object} options
   * @param {Object} [options.currentConfig] Cấu hình định dạng hiện tại của ô
   * @param {any} [options.sampleValue] Giá trị mẫu của ô đang chọn
   * @param {Function} options.onApply Callback khi người dùng nhấn OK (config) => void
   * @param {Function} [options.onClose] Callback khi hộp thoại đóng () => void
   */
  static show({
    currentConfig = null,
    currentStyle = null,
    isMerged = false,
    sampleValue = 1234.5678,
    initialTab = "number",
    grid = null,
    onApply,
    onClose
  }) {
    if (typeof document === "undefined" || !document.body) return;

    const previousFocused = document.activeElement;

    // Đóng dialog cũ nếu có
    document.querySelectorAll(".vno-format-cells-overlay").forEach(el => el.remove());

    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-format-cells-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    // Xác định thẻ ban đầu
    const tabName = initialTab === "alignment" ? "alignment" : "number";

    // Trích xuất cấu hình căn chỉnh từ currentStyle hoặc từ ô đang chọn trên grid
    const activeCoordKey = grid?.selectedCoord ? `${grid.selectedCoord.c}${grid.selectedCoord.r}` : null;
    const gridItem = activeCoordKey && grid?.cellsData ? grid.cellsData.get(activeCoordKey) : null;
    const effectiveStyle = currentStyle || gridItem?.style || {};

    const curAlign = effectiveStyle.textAlign || "general";
    const curVertical = effectiveStyle.verticalAlign || "bottom";
    const curWs = effectiveStyle.whiteSpace;
    const curRot = effectiveStyle.textRotation !== undefined ? Number(effectiveStyle.textRotation) : 0;
    const paddingLeft = parseInt(effectiveStyle.paddingLeft, 10) || 8;
    let curIndent = 0;
    if (paddingLeft > 8) {
      curIndent = Math.min(4, Math.max(0, Math.round((paddingLeft - 8) / 12)));
    }
    const merged = Boolean(
      isMerged ||
      (grid?.getMergedRangeForCell && grid?.selectedCoord && grid.getMergedRangeForCell(grid.selectedCoord.c, grid.selectedCoord.r))
    );

    // Khởi tạo state cấu hình
    const state = {
      activeTab: tabName,
      category: currentConfig?.category || "general",
      decimals: currentConfig?.decimals !== undefined ? Number(currentConfig.decimals) : 2,
      useThousands: currentConfig?.useThousands !== undefined ? Boolean(currentConfig.useThousands) : true,
      negativeStyle: currentConfig?.negativeStyle !== undefined ? Number(currentConfig.negativeStyle) : 0,
      currencySymbol: currentConfig?.currencySymbol !== undefined ? currentConfig.currencySymbol : "₫",
      dateFormat: currentConfig?.dateFormat || "dd/mm/yyyy",
      customPattern: currentConfig?.customPattern || "0.00",
      // Căn chỉnh
      horizontal: curAlign,
      vertical: curVertical,
      indent: curIndent,
      wrapText: curWs === "normal",
      orientation: curRot,
      mergeCells: merged,
      alignmentModified: false
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
      <div class="vno-dialog-box vno-format-cells-box" role="dialog" aria-modal="true" aria-labelledby="vno-fc-dialog-title" style="width: 620px; max-width: 95vw; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
        <!-- Dialog Header -->
        <div class="vno-dialog-header" style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px;">
          <div style="display:flex; align-items:center; gap: 8px; font-weight: 600; font-size: 14px; color: var(--vno-text-primary);">
            <span style="display:flex; width:18px; height:18px; color: var(--vno-sheet-primary);" aria-hidden="true">${ICONS.formatCells || ICONS.appSheet || ""}</span>
            <span id="vno-fc-dialog-title">${t("sheetFormatCells.dialogTitle", "Định dạng ô (Format Cells)")}</span>
          </div>
          <button class="vno-btn vno-btn-icon-only vno-fc-close-btn" title="Đóng" aria-label="Đóng" style="font-size: 18px; line-height: 1; border:none; background:transparent; cursor:pointer; color:var(--vno-text-muted);">&times;</button>
        </div>

        <!-- Tabs Header -->
        <div class="vno-fc-tabs" role="tablist" aria-label="Các thẻ định dạng ô" style="display:flex; background: var(--vno-bg-muted); border-bottom: 1px solid var(--vno-border-default); padding: 0 8px; gap: 4px;">
          <button type="button" role="tab" id="vno-fc-tab-number" aria-selected="${state.activeTab === "number" ? "true" : "false"}" class="vno-fc-tab ${state.activeTab === "number" ? "is-active" : ""}">
            ${t("sheetFormatCells.tabNumber", "Số")}
          </button>
          <button type="button" role="tab" id="vno-fc-tab-alignment" aria-selected="${state.activeTab === "alignment" ? "true" : "false"}" class="vno-fc-tab ${state.activeTab === "alignment" ? "is-active" : ""}">
            ${t("sheetFormatCells.tabAlignment", "Căn chỉnh")}
          </button>
          <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabindex="-1" class="vno-fc-tab" title="Phông chữ">
            ${t("sheetFormatCells.tabFont", "Phông chữ")}
          </button>
          <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabindex="-1" class="vno-fc-tab" title="Đường viền">
            ${t("sheetFormatCells.tabBorder", "Đường viền")}
          </button>
          <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabindex="-1" class="vno-fc-tab" title="Tô màu">
            ${t("sheetFormatCells.tabFill", "Tô màu")}
          </button>
          <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabindex="-1" class="vno-fc-tab" title="Bảo vệ">
            ${t("sheetFormatCells.tabProtection", "Bảo vệ")}
          </button>
        </div>

        <!-- Dialog Body Container -->
        <div class="vno-dialog-body" id="vno-fc-body-container" style="padding: 16px; min-height: 330px; display: flex; flex-direction: column;">
          <!-- Will be rendered dynamically by switchTab() -->
        </div>

        <!-- Dialog Footer -->
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap: 8px; padding: 12px 16px;">
          <button type="button" class="vno-btn vno-fc-cancel-btn">
            ${t("common.cancel", "Hủy bỏ")}
          </button>
          <button type="button" class="vno-btn vno-btn-primary vno-fc-ok-btn">
            ${t("common.ok", "Đồng ý")}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const bodyContainer = overlay.querySelector("#vno-fc-body-container");
    const tabNumberBtn = overlay.querySelector("#vno-fc-tab-number");
    const tabAlignmentBtn = overlay.querySelector("#vno-fc-tab-alignment");

    // ==========================================
    // 1. RENDER THẺ SỐ (NUMBER FORMATTING TAB)
    // ==========================================
    const renderNumberTab = () => {
      bodyContainer.innerHTML = `
        <div style="display:flex; gap: 16px; width: 100%; flex: 1;">
          <!-- Left Column: Category List -->
          <div style="width: 170px; display:flex; flex-direction:column; gap: 6px;">
            <label id="vno-fc-cat-lbl" style="font-size: 12px; font-weight: 600; color: var(--vno-text-secondary);">
              ${t("sheetFormatCells.categoryLabel", "Thể loại:")}
            </label>
            <div class="vno-fc-category-list" role="listbox" aria-labelledby="vno-fc-cat-lbl" tabindex="0" style="border: 1px solid var(--vno-border-default); border-radius: 4px; overflow-y: auto; height: 280px; background: var(--vno-bg-surface); padding: 2px;">
              ${categories.map(cat => `
                <div class="vno-fc-cat-item ${cat.id === state.category ? "is-selected" : ""}" data-cat="${cat.id}"
                     role="option" aria-selected="${cat.id === state.category ? "true" : "false"}" tabindex="${cat.id === state.category ? "0" : "-1"}">
                  ${cat.label}
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Right Column: Sample Preview & Category Options -->
          <div style="flex: 1; display:flex; flex-direction:column; gap: 12px;">
            <!-- Sample Box -->
            <div style="display:flex; flex-direction:column; gap: 4px;">
              <label id="vno-fc-sample-lbl" style="font-size: 12px; font-weight: 600; color: var(--vno-text-secondary);">
                ${t("sheetFormatCells.sampleLabel", "Mẫu (Sample):")}
              </label>
              <div id="vno-fc-sample-box" aria-live="polite" aria-labelledby="vno-fc-sample-lbl" style="height: 38px; border: 1px solid var(--vno-border-default); border-radius: 4px; background: var(--vno-bg-surface); display:flex; align-items:center; padding: 0 12px; font-size: 13px; font-weight: 600; color: var(--vno-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <!-- Sample text updated dynamically -->
              </div>
            </div>

            <!-- Dynamic Options Panel -->
            <div id="vno-fc-options-panel" style="flex: 1; display:flex; flex-direction:column; gap: 10px;">
              <!-- Will be rendered by renderOptionsPanel() -->
            </div>
          </div>
        </div>
      `;

      const sampleBox = bodyContainer.querySelector("#vno-fc-sample-box");
      const optionsPanel = bodyContainer.querySelector("#vno-fc-options-panel");

      // Cập nhật Sample Box
      const updateSample = () => {
        if (!sampleBox) return;
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
            sampleInput = sampleInput / 100;
          }
        }

        const res = NumberFormatter.formatValue(sampleInput, state);
        sampleBox.textContent = res.text || "";
        sampleBox.style.color = res.isRed ? "#dc2626" : "var(--vno-text-primary)";
        sampleBox.style.textAlign = res.align || "left";
        sampleBox.style.justifyContent = res.align === "right" ? "flex-end" : "flex-start";
      };

      // Render panel tùy chọn theo Category
      const renderOptionsPanel = () => {
        if (!optionsPanel) return;
        optionsPanel.innerHTML = "";

        switch (state.category) {
          case "general": {
            optionsPanel.innerHTML = `
              <div style="font-size: 12px; color: var(--vno-text-muted); line-height: 1.6; padding-top: 8px;">
                ${t("sheetFormatCells.generalDesc", "Các ô định dạng Chung không có định dạng số cụ thể. Số và chữ sẽ được hiển thị như khi nhập.")}
              </div>
            `;
            break;
          }

          case "number": {
            optionsPanel.innerHTML = `
              <div style="display:flex; align-items:center; gap: 12px;">
                <label for="vno-fc-decimals" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
                </label>
                <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                       aria-label="${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}"
                       style="width: 70px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
              </div>

              <div style="display:flex; align-items:center; gap: 8px; margin-top: 4px;">
                <input type="checkbox" id="vno-fc-thousands" ${state.useThousands ? "checked" : ""} style="cursor: pointer;">
                <label for="vno-fc-thousands" style="font-size: 12px; color: var(--vno-text-secondary); cursor: pointer;">
                  ${t("sheetFormatCells.useThousands", "Sử dụng dấu phân cách hàng nghìn (1,000)")}
                </label>
              </div>

              <div style="display:flex; flex-direction:column; gap: 4px; margin-top: 6px;">
                <label id="vno-fc-neg-lbl" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.negativeNumbers", "Số âm:")}
                </label>
                <div id="vno-fc-negative-list" role="listbox" aria-labelledby="vno-fc-neg-lbl" tabindex="0" style="border: 1px solid var(--vno-border-default); border-radius: 4px; max-height: 120px; overflow-y: auto; background: var(--vno-bg-surface);">
                  <div class="vno-fc-neg-item ${state.negativeStyle === 0 ? "is-selected" : ""}" data-neg="0" role="option" aria-selected="${state.negativeStyle === 0 ? "true" : "false"}" tabindex="${state.negativeStyle === 0 ? "0" : "-1"}">-1234.10</div>
                  <div class="vno-fc-neg-item ${state.negativeStyle === 1 ? "is-selected" : ""}" data-neg="1" role="option" aria-selected="${state.negativeStyle === 1 ? "true" : "false"}" tabindex="${state.negativeStyle === 1 ? "0" : "-1"}" style="color: #dc2626;">1234.10</div>
                  <div class="vno-fc-neg-item ${state.negativeStyle === 2 ? "is-selected" : ""}" data-neg="2" role="option" aria-selected="${state.negativeStyle === 2 ? "true" : "false"}" tabindex="${state.negativeStyle === 2 ? "0" : "-1"}">(1234.10)</div>
                  <div class="vno-fc-neg-item ${state.negativeStyle === 3 ? "is-selected" : ""}" data-neg="3" role="option" aria-selected="${state.negativeStyle === 3 ? "true" : "false"}" tabindex="${state.negativeStyle === 3 ? "0" : "-1"}" style="color: #dc2626;">(1234.10)</div>
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
                negItems.forEach(i => {
                  i.classList.remove("is-selected");
                  i.setAttribute("aria-selected", "false");
                  i.setAttribute("tabindex", "-1");
                });
                item.classList.add("is-selected");
                item.setAttribute("aria-selected", "true");
                item.setAttribute("tabindex", "0");
                state.negativeStyle = Number(item.dataset.neg);
                updateSample();
              });
            });
            break;
          }

          case "currency": {
            optionsPanel.innerHTML = `
              <div style="display:flex; align-items:center; gap: 12px;">
                <label for="vno-fc-decimals" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
                </label>
                <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                       aria-label="${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}"
                       style="width: 70px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
              </div>

              <div style="display:flex; align-items:center; gap: 12px; margin-top: 4px;">
                <label for="vno-fc-symbol" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.currencySymbol", "Ký hiệu tiền tệ:")}
                </label>
                <select id="vno-fc-symbol" aria-label="${t("sheetFormatCells.currencySymbol", "Ký hiệu tiền tệ:")}" style="flex: 1; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
                  <option value="₫" ${state.currencySymbol === "₫" ? "selected" : ""}>₫ (VNĐ - Việt Nam)</option>
                  <option value="$" ${state.currencySymbol === "$" ? "selected" : ""}>$ ($ USD - Tiếng Anh Hoa Kỳ)</option>
                  <option value="€" ${state.currencySymbol === "€" ? "selected" : ""}>€ (€ EUR - Châu Âu)</option>
                  <option value="¥" ${state.currencySymbol === "¥" ? "selected" : ""}>¥ (¥ JPY/CNY - Nhật Bản/Trung Quốc)</option>
                  <option value="£" ${state.currencySymbol === "£" ? "selected" : ""}>£ (£ GBP - Vương quốc Anh)</option>
                  <option value="" ${state.currencySymbol === "" ? "selected" : ""}>${t("sheetFormatCells.noSymbol", "(Không có)")}</option>
                </select>
              </div>

              <div style="display:flex; flex-direction:column; gap: 4px; margin-top: 6px;">
                <label id="vno-fc-neg-curr-lbl" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.negativeNumbers", "Số âm:")}
                </label>
                <div id="vno-fc-negative-list" role="listbox" aria-labelledby="vno-fc-neg-curr-lbl" tabindex="0" style="border: 1px solid var(--vno-border-default); border-radius: 4px; max-height: 100px; overflow-y: auto; background: var(--vno-bg-surface);">
                  <div class="vno-fc-neg-item ${state.negativeStyle === 0 ? "is-selected" : ""}" data-neg="0" role="option" aria-selected="${state.negativeStyle === 0 ? "true" : "false"}" tabindex="${state.negativeStyle === 0 ? "0" : "-1"}">-1,234.10 ₫</div>
                  <div class="vno-fc-neg-item ${state.negativeStyle === 1 ? "is-selected" : ""}" data-neg="1" role="option" aria-selected="${state.negativeStyle === 1 ? "true" : "false"}" tabindex="${state.negativeStyle === 1 ? "0" : "-1"}" style="color: #dc2626;">1,234.10 ₫</div>
                  <div class="vno-fc-neg-item ${state.negativeStyle === 2 ? "is-selected" : ""}" data-neg="2" role="option" aria-selected="${state.negativeStyle === 2 ? "true" : "false"}" tabindex="${state.negativeStyle === 2 ? "0" : "-1"}">(1,234.10 ₫)</div>
                  <div class="vno-fc-neg-item ${state.negativeStyle === 3 ? "is-selected" : ""}" data-neg="3" role="option" aria-selected="${state.negativeStyle === 3 ? "true" : "false"}" tabindex="${state.negativeStyle === 3 ? "0" : "-1"}" style="color: #dc2626;">(1,234.10 ₫)</div>
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
                negItems.forEach(i => {
                  i.classList.remove("is-selected");
                  i.setAttribute("aria-selected", "false");
                  i.setAttribute("tabindex", "-1");
                });
                item.classList.add("is-selected");
                item.setAttribute("aria-selected", "true");
                item.setAttribute("tabindex", "0");
                state.negativeStyle = Number(item.dataset.neg);
                updateSample();
              });
            });
            break;
          }

          case "accounting": {
            optionsPanel.innerHTML = `
              <div style="display:flex; align-items:center; gap: 12px;">
                <label for="vno-fc-decimals" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
                </label>
                <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                       aria-label="${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}"
                       style="width: 70px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
              </div>

              <div style="display:flex; align-items:center; gap: 12px; margin-top: 4px;">
                <label for="vno-fc-symbol" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.currencySymbol", "Ký hiệu tiền tệ:")}
                </label>
                <select id="vno-fc-symbol" aria-label="${t("sheetFormatCells.currencySymbol", "Ký hiệu tiền tệ:")}" style="flex: 1; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
                  <option value="₫" ${state.currencySymbol === "₫" ? "selected" : ""}>₫ (VNĐ - Việt Nam)</option>
                  <option value="$" ${state.currencySymbol === "$" ? "selected" : ""}>$ ($ USD - Hoa Kỳ)</option>
                  <option value="€" ${state.currencySymbol === "€" ? "selected" : ""}>€ (€ EUR - Châu Âu)</option>
                  <option value="¥" ${state.currencySymbol === "¥" ? "selected" : ""}>¥ (¥ JPY/CNY)</option>
                  <option value="£" ${state.currencySymbol === "£" ? "selected" : ""}>£ (£ GBP)</option>
                  <option value="" ${state.currencySymbol === "" ? "selected" : ""}>${t("sheetFormatCells.noSymbol", "(Không có)")}</option>
                </select>
              </div>

              <div style="font-size: 12px; color: var(--vno-text-secondary); line-height: 1.6; padding: 10px; background: var(--vno-bg-muted); border: 1px solid var(--vno-border-default); border-radius: 4px; margin-top: 6px;">
                <strong style="color:var(--vno-text-primary);">${t("sheetFormatCells.accountingTitle", "Đặc điểm định dạng Kế toán:")}</strong><br>
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
                <label id="vno-fc-date-lbl" style="font-size: 12px; color: #334155; font-weight: 500;">
                  ${t("sheetFormatCells.dateType", "Kiểu hiển thị ngày tháng (Type):")}
                </label>
                <div id="vno-fc-date-list" role="listbox" aria-labelledby="vno-fc-date-lbl" tabindex="0" style="border: 1px solid #cbd5e1; border-radius: 4px; height: 160px; overflow-y: auto; background: #ffffff;">
                  ${dateFormats.map(df => `
                    <div class="vno-fc-date-item ${state.dateFormat === df.id ? "is-selected" : ""}" data-fmt="${df.id}"
                         role="option" aria-selected="${state.dateFormat === df.id ? "true" : "false"}" tabindex="${state.dateFormat === df.id ? "0" : "-1"}">
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
                  i.classList.remove("is-selected");
                  i.setAttribute("aria-selected", "false");
                  i.setAttribute("tabindex", "-1");
                });
                item.classList.add("is-selected");
                item.setAttribute("aria-selected", "true");
                item.setAttribute("tabindex", "0");
                state.dateFormat = item.dataset.fmt;
                updateSample();
              });
            });
            break;
          }

          case "percentage": {
            optionsPanel.innerHTML = `
              <div style="display:flex; align-items:center; gap: 12px;">
                <label for="vno-fc-decimals" style="font-size: 12px; color: #334155; font-weight: 500;">
                  ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
                </label>
                <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                       aria-label="${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}"
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
                ${t("sheetFormatCells.textDesc", "Các ô định dạng Văn bản được xử lý như chuỗi ký tự thô, ngay cả khi ô chứa số. Ô sẽ được căn lề trái tự nhiên và các hàm tính toán tổng số học như SUM sẽ bỏ qua ô này giống chuẩn bảng tính.")}
              </div>
            `;
            break;
          }

          case "scientific": {
            optionsPanel.innerHTML = `
              <div style="display:flex; align-items:center; gap: 12px;">
                <label for="vno-fc-decimals" style="font-size: 12px; color: #334155; font-weight: 500;">
                  ${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}
                </label>
                <input type="number" id="vno-fc-decimals" min="0" max="30" value="${state.decimals}" 
                       aria-label="${t("sheetFormatCells.decimalPlaces", "Số chữ số thập phân:")}"
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
              "General", "0", "0.00", "#,##0", "#,##0.00",
              '#,##0 "đ"', '#,##0.00 "đ"',
              '#,##0 ₫;(#,##0 ₫);"-" ₫', '#,##0.00 ₫;(#,##0.00 ₫);"-" ₫',
              '$#,##0;($#,##0);"-"', "0%", "0.00%",
              "dd/mm/yyyy", "dd-mm-yyyy", "yyyy-mm-dd", "@"
            ];

            optionsPanel.innerHTML = `
              <div style="display:flex; flex-direction:column; gap: 6px;">
                <label for="vno-fc-custom-pattern" style="font-size: 12px; color: #334155; font-weight: 500;">
                  ${t("sheetFormatCells.customType", "Mã định dạng (Type):")}
                </label>
                <input type="text" id="vno-fc-custom-pattern" value="${state.customPattern}" 
                       aria-label="${t("sheetFormatCells.customType", "Mã định dạng (Type):")}"
                       style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; font-family: monospace;">
                
                <div id="vno-fc-custom-list" role="listbox" aria-label="${t("sheetFormatCells.customType", "Mã định dạng (Type):")}" tabindex="0" style="border: 1px solid #cbd5e1; border-radius: 4px; height: 140px; overflow-y: auto; background: #ffffff; margin-top: 4px;">
                  ${customPatterns.map(p => `
                    <div class="vno-fc-pattern-item ${state.customPattern === p ? "is-selected" : ""}" data-pattern="${p}"
                         role="option" aria-selected="${state.customPattern === p ? "true" : "false"}" tabindex="${state.customPattern === p ? "0" : "-1"}">
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
                  i.classList.remove("is-selected");
                  i.setAttribute("aria-selected", "false");
                  i.setAttribute("tabindex", "-1");
                });
                item.classList.add("is-selected");
                item.setAttribute("aria-selected", "true");
                item.setAttribute("tabindex", "0");
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

      // Category click handler & keyboard navigation
      const catList = bodyContainer.querySelector(".vno-fc-category-list");
      const catItems = Array.from(bodyContainer.querySelectorAll(".vno-fc-cat-item"));
      const selectCategory = (index) => {
        if (index < 0 || index >= catItems.length) return;
        catItems.forEach((i, idx) => {
          const isMatch = idx === index;
          i.classList.toggle("is-selected", isMatch);
          i.setAttribute("aria-selected", isMatch ? "true" : "false");
          i.setAttribute("tabindex", isMatch ? "0" : "-1");
        });
        state.category = catItems[index].dataset.cat;
        catItems[index].focus();
        renderOptionsPanel();
      };

      catItems.forEach((item, index) => {
        item.addEventListener("click", () => {
          selectCategory(index);
        });
      });

      if (catList) {
        catList.addEventListener("keydown", (e) => {
          const curIdx = catItems.findIndex(i => i.dataset.cat === state.category);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            selectCategory(Math.min(catItems.length - 1, (curIdx >= 0 ? curIdx : 0) + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectCategory(Math.max(0, (curIdx >= 0 ? curIdx : 0) - 1));
          } else if (e.key === "Home") {
            e.preventDefault();
            selectCategory(0);
          } else if (e.key === "End") {
            e.preventDefault();
            selectCategory(catItems.length - 1);
          }
        });
      }

      renderOptionsPanel();
    };

    // ==========================================
    // 2. RENDER THẺ CĂN CHỈNH (ALIGNMENT TAB)
    // ==========================================
    const renderAlignmentTab = () => {
      bodyContainer.innerHTML = `
        <div class="vno-fc-alignment-panel" style="display:flex; gap: 20px; width: 100%; flex: 1;">
          <!-- Left Column: Text alignment & Text control & Direction -->
          <div style="flex: 1.25; display:flex; flex-direction:column; gap: 12px;">
            
            <!-- Group 1: Text alignment -->
            <fieldset style="border: 1px solid var(--vno-border-default); border-radius: 6px; padding: 10px 14px; margin: 0;">
              <legend style="font-size: 12px; font-weight: 600; color: var(--vno-text-primary); padding: 0 4px;">
                ${t("sheetFormatCells.textAlignment", "Căn chỉnh văn bản")}
              </legend>
              <div style="display:flex; flex-direction:column; gap: 10px; margin-top: 4px;">
                <!-- Horizontal -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap: 8px;">
                  <label for="vno-fc-align-h" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                    ${t("sheetFormatCells.horizontal", "Chiều ngang:")}
                  </label>
                  <select id="vno-fc-align-h" style="width: 175px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
                    <option value="general" ${state.horizontal === "general" ? "selected" : ""}>${t("sheetFormatCells.alignGeneral", "Chung (General)")}</option>
                    <option value="left" ${state.horizontal === "left" ? "selected" : ""}>${t("sheetFormatCells.alignLeft", "Căn trái (Thụt lề)")}</option>
                    <option value="center" ${state.horizontal === "center" ? "selected" : ""}>${t("sheetFormatCells.alignCenter", "Căn giữa (Center)")}</option>
                    <option value="right" ${state.horizontal === "right" ? "selected" : ""}>${t("sheetFormatCells.alignRight", "Căn phải (Thụt lề)")}</option>
                    <option value="justify" ${state.horizontal === "justify" ? "selected" : ""}>${t("sheetFormatCells.alignJustify", "Căn đều (Justify)")}</option>
                    <option value="fill" disabled>${t("sheetFormatCells.alignFillGap", "Lấp đầy / Fill (GAP)")}</option>
                    <option value="centerContinuous" disabled>${t("sheetFormatCells.alignCenterContinuousGap", "Giữa qua vùng chọn (GAP)")}</option>
                    <option value="distributed" disabled>${t("sheetFormatCells.alignDistributedGap", "Phân phối đều / Distributed (GAP)")}</option>
                  </select>
                </div>
                <!-- Indent -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap: 8px;">
                  <label for="vno-fc-align-indent" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                    ${t("sheetFormatCells.indent", "Thụt lề (Indent):")}
                  </label>
                  <input type="number" id="vno-fc-align-indent" min="0" max="4" value="${state.indent}" 
                         style="width: 70px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
                </div>
                <!-- Vertical -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap: 8px;">
                  <label for="vno-fc-align-v" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                    ${t("sheetFormatCells.vertical", "Chiều dọc:")}
                  </label>
                  <select id="vno-fc-align-v" style="width: 175px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px;">
                    <option value="top" ${state.vertical === "top" ? "selected" : ""}>${t("sheetFormatCells.alignTop", "Căn trên (Top)")}</option>
                    <option value="middle" ${state.vertical === "middle" ? "selected" : ""}>${t("sheetFormatCells.alignMiddle", "Căn giữa (Center)")}</option>
                    <option value="bottom" ${state.vertical === "bottom" ? "selected" : ""}>${t("sheetFormatCells.alignBottom", "Căn dưới (Bottom)")}</option>
                    <option value="justify" disabled>${t("sheetFormatCells.alignJustifyVGap", "Căn đều dọc / Justify (GAP)")}</option>
                    <option value="distributed" disabled>${t("sheetFormatCells.alignDistributedVGap", "Phân phối đều / Distributed (GAP)")}</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <!-- Group 2: Text control -->
            <fieldset style="border: 1px solid var(--vno-border-default); border-radius: 6px; padding: 10px 14px; margin: 0;">
              <legend style="font-size: 12px; font-weight: 600; color: var(--vno-text-primary); padding: 0 4px;">
                ${t("sheetFormatCells.textControl", "Điều khiển văn bản")}
              </legend>
              <div style="display:flex; flex-direction:column; gap: 8px; margin-top: 4px;">
                <label style="display:flex; align-items:center; gap: 8px; font-size: 12px; color: var(--vno-text-primary); cursor: pointer;">
                  <input type="checkbox" id="vno-fc-wrap" ${state.wrapText ? "checked" : ""} style="cursor: pointer;">
                  <span>${t("sheetFormatCells.wrapText", "Ngắt dòng tự động (Wrap text)")}</span>
                </label>
                <label style="display:flex; align-items:center; gap: 8px; font-size: 12px; color: var(--vno-text-muted); opacity: 0.65; cursor: not-allowed;" title="${t("sheetFormatCells.gapNotSupported", "Tính năng chưa được hỗ trợ (GAP)")}">
                  <input type="checkbox" id="vno-fc-shrink" disabled style="cursor: not-allowed;">
                  <span>${t("sheetFormatCells.shrinkToFit", "Thu nhỏ vừa ô (Shrink to fit)")} <em>(GAP)</em></span>
                </label>
                <label style="display:flex; align-items:center; gap: 8px; font-size: 12px; color: var(--vno-text-primary); cursor: pointer;">
                  <input type="checkbox" id="vno-fc-merge" ${state.mergeCells ? "checked" : ""} style="cursor: pointer;">
                  <span>${t("sheetFormatCells.mergeCells", "Hợp nhất ô (Merge cells)")}</span>
                </label>
              </div>
            </fieldset>

            <!-- Group 3: Text direction (Right-to-left) -->
            <fieldset style="border: 1px solid var(--vno-border-default); border-radius: 6px; padding: 8px 14px; margin: 0; opacity: 0.8;">
              <legend style="font-size: 12px; font-weight: 600; color: var(--vno-text-secondary); padding: 0 4px;">
                ${t("sheetFormatCells.rightToLeft", "Hướng văn bản (Right-to-left)")}
              </legend>
              <div style="display:flex; align-items:center; justify-content:space-between; gap: 8px; margin-top: 2px;">
                <label for="vno-fc-text-dir" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.textDirection", "Hướng văn bản:")}
                </label>
                <select id="vno-fc-text-dir" disabled style="width: 175px; padding: 4px 8px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-muted); color: var(--vno-text-muted); border-radius: 4px; font-size: 12px; cursor: not-allowed;" title="${t("sheetFormatCells.gapNotSupported", "Tính năng chưa được hỗ trợ (GAP)")}">
                  <option value="context">${t("sheetFormatCells.directionContext", "Theo ngữ cảnh (Context) - GAP")}</option>
                  <option value="ltr">${t("sheetFormatCells.directionLtr", "Trái sang phải (Left-to-Right)")}</option>
                  <option value="rtl">${t("sheetFormatCells.directionRtl", "Phải sang trái (Right-to-Left)")}</option>
                </select>
              </div>
            </fieldset>
          </div>

          <!-- Right Column: Orientation -->
          <div style="flex: 0.95; display:flex; flex-direction:column;">
            <fieldset style="border: 1px solid var(--vno-border-default); border-radius: 6px; padding: 10px 14px; margin: 0; height: 100%; display:flex; flex-direction:column; gap: 10px;">
              <legend style="font-size: 12px; font-weight: 600; color: var(--vno-text-primary); padding: 0 4px;">
                ${t("sheetFormatCells.orientation", "Hướng xoay (Orientation)")}
              </legend>
              
              <div style="display:flex; align-items:center; justify-content:space-between; gap: 8px;">
                <label for="vno-fc-orient-deg" style="font-size: 12px; color: var(--vno-text-secondary); font-weight: 500;">
                  ${t("sheetFormatCells.orientationDegrees", "Độ xoay:")}
                </label>
                <div style="display:flex; align-items:center; gap: 4px;">
                  <input type="number" id="vno-fc-orient-deg" min="-90" max="90" step="15" value="${state.orientation === 255 ? 0 : state.orientation}"
                         style="width: 60px; padding: 4px 6px; border: 1px solid var(--vno-border-default); background: var(--vno-bg-surface); color: var(--vno-text-primary); border-radius: 4px; font-size: 12px; text-align: right;">
                  <span style="font-size: 12px; color: var(--vno-text-secondary);">°</span>
                </div>
              </div>

              <!-- Quick preset buttons -->
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;" id="vno-fc-orient-presets">
                <button type="button" class="vno-btn vno-fc-orient-btn ${state.orientation === 0 ? "vno-btn-primary" : ""}" data-angle="0" style="font-size: 11px; padding: 4px 6px;">0° (Ngang)</button>
                <button type="button" class="vno-btn vno-fc-orient-btn ${state.orientation === 45 ? "vno-btn-primary" : ""}" data-angle="45" style="font-size: 11px; padding: 4px 6px;">45°</button>
                <button type="button" class="vno-btn vno-fc-orient-btn ${state.orientation === -45 ? "vno-btn-primary" : ""}" data-angle="-45" style="font-size: 11px; padding: 4px 6px;">-45°</button>
                <button type="button" class="vno-btn vno-fc-orient-btn ${state.orientation === 90 ? "vno-btn-primary" : ""}" data-angle="90" style="font-size: 11px; padding: 4px 6px;">90° (Lên)</button>
                <button type="button" class="vno-btn vno-fc-orient-btn ${state.orientation === -90 ? "vno-btn-primary" : ""}" data-angle="-90" style="font-size: 11px; padding: 4px 6px;">-90° (Xuống)</button>
                <button type="button" class="vno-btn vno-fc-orient-btn ${state.orientation === 255 ? "vno-btn-primary" : ""}" data-angle="255" style="font-size: 11px; padding: 4px 6px;">Xếp dọc (255)</button>
              </div>

              <!-- Visual Preview Box -->
              <div style="flex: 1; min-height: 110px; border: 1px dashed var(--vno-border-default); border-radius: 4px; background: var(--vno-bg-muted); display:flex; align-items:center; justify-content:center; overflow:hidden; margin-top: 4px;">
                <div id="vno-fc-orient-preview" style="font-size: 13px; font-weight: 600; color: var(--vno-text-primary); transition: transform 0.2s ease, writing-mode 0.2s ease;">
                  Văn bản mẫu
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      `;

      // Handlers cho controls thẻ Căn chỉnh
      const alignHSelect = bodyContainer.querySelector("#vno-fc-align-h");
      const indentInput = bodyContainer.querySelector("#vno-fc-align-indent");
      const alignVSelect = bodyContainer.querySelector("#vno-fc-align-v");
      const wrapCheck = bodyContainer.querySelector("#vno-fc-wrap");
      const mergeCheck = bodyContainer.querySelector("#vno-fc-merge");
      const degInput = bodyContainer.querySelector("#vno-fc-orient-deg");
      const orientPreview = bodyContainer.querySelector("#vno-fc-orient-preview");
      const orientBtns = bodyContainer.querySelectorAll(".vno-fc-orient-btn");

      const updateOrientVisual = () => {
        if (!orientPreview) return;
        if (state.orientation === 255) {
          orientPreview.style.transform = "none";
          orientPreview.style.writingMode = "vertical-rl";
          orientPreview.style.textOrientation = "upright";
        } else {
          orientPreview.style.writingMode = "horizontal-tb";
          orientPreview.style.textOrientation = "mixed";
          orientPreview.style.transform = `rotate(${-state.orientation}deg)`;
        }

        orientBtns.forEach(btn => {
          const btnAngle = Number(btn.dataset.angle);
          btn.classList.toggle("vno-btn-primary", btnAngle === state.orientation);
        });
      };

      updateOrientVisual();

      alignHSelect.addEventListener("change", (e) => {
        state.horizontal = e.target.value;
        state.alignmentModified = true;
      });

      indentInput.addEventListener("input", (e) => {
        state.indent = Math.max(0, Math.min(4, parseInt(e.target.value, 10) || 0));
        state.alignmentModified = true;
      });

      alignVSelect.addEventListener("change", (e) => {
        state.vertical = e.target.value;
        state.alignmentModified = true;
      });

      wrapCheck.addEventListener("change", (e) => {
        state.wrapText = e.target.checked;
        state.alignmentModified = true;
      });

      mergeCheck.addEventListener("change", (e) => {
        state.mergeCells = e.target.checked;
        state.alignmentModified = true;
      });

      degInput.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          state.orientation = Math.max(-90, Math.min(90, val));
          state.alignmentModified = true;
          updateOrientVisual();
        }
      });

      orientBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const angle = Number(btn.dataset.angle);
          state.orientation = angle;
          state.alignmentModified = true;
          if (degInput) {
            degInput.value = angle === 255 ? 0 : angle;
          }
          updateOrientVisual();
        });
      });
    };

    // ==========================================
    // 3. TAB SWITCHING LOGIC
    // ==========================================
    const switchTab = (tabId) => {
      state.activeTab = tabId;
      tabNumberBtn.classList.toggle("is-active", tabId === "number");
      tabNumberBtn.setAttribute("aria-selected", tabId === "number" ? "true" : "false");
      tabAlignmentBtn.classList.toggle("is-active", tabId === "alignment");
      tabAlignmentBtn.setAttribute("aria-selected", tabId === "alignment" ? "true" : "false");

      if (tabId === "number") {
        renderNumberTab();
      } else if (tabId === "alignment") {
        renderAlignmentTab();
      }
    };

    tabNumberBtn.addEventListener("click", () => switchTab("number"));
    tabAlignmentBtn.addEventListener("click", () => switchTab("alignment"));

    // Hỗ trợ phím mũi tên chuyển đổi giữa các tab
    [tabNumberBtn, tabAlignmentBtn].forEach(tabEl => {
      tabEl.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const target = state.activeTab === "number" ? "alignment" : "number";
          switchTab(target);
          if (target === "number") tabNumberBtn.focus();
          else tabAlignmentBtn.focus();
        }
      });
    });

    // Mở đúng tab ban đầu
    switchTab(state.activeTab);

    // Close logic
    const closeDialog = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        try { previousFocused.focus(); } catch (_) {}
      }
      if (typeof onClose === "function") onClose();
    };

    const applyDialog = () => {
      // Áp dụng trực tiếp vào grid nếu được truyền vào
      if (grid) {
        if (state.activeTab === "alignment" || state.alignmentModified) {
          // 1. Căn ngang
          if (state.horizontal !== undefined) {
            grid.setStyle("textAlign", state.horizontal === "general" ? "" : state.horizontal);
          }
          // 2. Căn dọc
          if (state.vertical !== undefined) {
            grid.setStyle("verticalAlign", state.vertical);
          }
          // 3. Thụt lề
          if (state.indent !== undefined) {
            const paddingPx = state.indent > 0 ? `${8 + state.indent * 12}px` : "8px";
            grid.setStyle("paddingLeft", paddingPx);
          }
          // 4. Ngắt dòng tự động
          if (state.wrapText !== undefined) {
            const coordKey = `${grid.selectedCoord.c}${grid.selectedCoord.r}`;
            const curWsState = grid.cellsData?.get?.(coordKey)?.style?.whiteSpace;
            const targetWsState = state.wrapText ? "normal" : "nowrap";
            if (curWsState !== targetWsState && typeof grid.toggleWrapText === "function") {
              grid.toggleWrapText();
            }
          }
          // 5. Xoay hướng chữ
          if (state.orientation !== undefined && typeof grid.setCellOrientation === "function") {
            grid.setCellOrientation(state.orientation);
          }
          // 6. Gộp / tách ô
          if (state.mergeCells !== undefined) {
            const currentlyMerged = Boolean(
              grid.getMergedRangeForCell && grid.getMergedRangeForCell(grid.selectedCoord.c, grid.selectedCoord.r)
            );
            if (state.mergeCells && !currentlyMerged && typeof grid.mergeCells === "function") {
              grid.mergeCells("mergeCells");
            } else if (!state.mergeCells && currentlyMerged && typeof grid.unmergeCells === "function") {
              grid.unmergeCells();
            }
          }
        }
      }

      // Gọi callback onApply
      if (typeof onApply === "function") {
        onApply({ ...state, alignment: state.alignmentModified ? { ...state } : null });
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
      if (e.key === "Tab") {
        trapFocus(overlay.querySelector(".vno-dialog-box"), e);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey) {
        if (document.activeElement && (document.activeElement.classList.contains("vno-fc-cancel-btn") || document.activeElement.classList.contains("vno-fc-close-btn"))) {
          return;
        }
        e.preventDefault();
        applyDialog();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    overlay.querySelector(".vno-fc-ok-btn").focus();
  }
}