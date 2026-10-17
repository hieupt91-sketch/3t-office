/**
 * 3T Doc — Hộp thoại Thuộc tính bảng (Table Properties Dialog) chuẩn văn phòng.
 * Hỗ trợ các tab: Bảng (căn lề, thụt lề, độ rộng), Hàng (chiều cao), Ô & Lề (lề trên/dưới/trái/phải, khoảng cách ô).
 */

import { t } from "../../platform/i18n/i18n.js";

function trapFocus(box, event) {
  if (event.key !== "Tab") return;
  const items = Array.from(box.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])"));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Hiển thị hộp thoại Thuộc tính bảng.
 * @param {Object} current Các giá trị hiện tại của bảng
 * @returns {Promise<Object|null>}
 */
export async function showTablePropertiesDialog(current = {}) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise(resolve => {
    const previous = document.activeElement;
    const cur = {
      align: "left",
      indentPt: 0,
      width: "",
      widthUnit: "%",
      rowHeightPt: 0,
      hasRowHeight: false,
      hasWidth: false,
      marginTopPt: 5.65,
      marginBottomPt: 5.65,
      marginLeftPt: 8.5,
      marginRightPt: 8.5,
      cellSpacingPt: 0,
      hasSpacing: false,
      columnWidthCm: "",
      hasColumnWidth: false,
      verticalAlign: "top",
      marginScope: "table",
      ...current
    };
    const ptToCm = value => (Number(value || 0) / 28.3464567).toFixed(2);

    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    const tabStyle = "padding:6px 16px; border:1px solid #cbd5e1; border-bottom:none; background:#f1f5f9; border-radius:4px 4px 0 0; cursor:pointer; font-size:13px; font-weight:500; color:#475569;";
    const activeTabStyle = "padding:6px 16px; border:1px solid #cbd5e1; border-bottom:2px solid #2563eb; background:#ffffff; border-radius:4px 4px 0 0; cursor:pointer; font-size:13px; font-weight:600; color:#1e293b;";
    const fieldStyle = "font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#334155;";
    const inputStyle = "width:100%; box-sizing:border-box; font-size:13px; padding:6px 10px; border:1px solid #cbd5e1; border-radius:4px;";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-table-props-dialog" style="width: 520px;" role="dialog" aria-modal="true" aria-labelledby="vno-tblprops-title">
        <div class="vno-dialog-header">
          <span id="vno-tblprops-title">Thuộc tính bảng</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:12px;">
          <div role="tablist" aria-label="Các phần thuộc tính bảng" style="display:flex; gap:4px; border-bottom:1px solid #cbd5e1;">
            <button type="button" role="tab" id="vno-tblprops-tab-table" aria-selected="true" aria-controls="vno-tblprops-panel-table" style="${activeTabStyle}">${t("writerTableProperties.table")}</button>
            <button type="button" role="tab" id="vno-tblprops-tab-row" aria-selected="false" aria-controls="vno-tblprops-panel-row" tabindex="-1" style="${tabStyle}">${t("writerTableProperties.row")}</button>
            <button type="button" role="tab" id="vno-tblprops-tab-column" aria-selected="false" aria-controls="vno-tblprops-panel-column" tabindex="-1" style="${tabStyle}">${t("writerTableProperties.column")}</button>
            <button type="button" role="tab" id="vno-tblprops-tab-cell" aria-selected="false" aria-controls="vno-tblprops-panel-cell" tabindex="-1" style="${tabStyle}">${t("writerTableProperties.cell")}</button>
          </div>

          <!-- TAB BẢNG -->
          <div id="vno-tblprops-panel-table" role="tabpanel" aria-labelledby="vno-tblprops-tab-table" style="display:flex; flex-direction:column; gap:14px;">
            <fieldset style="border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin:0;">
              <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 6px;">Căn lề bảng</legend>
              <div style="display:flex; gap:20px; align-items:center; margin-top:4px;">
                <label style="font-size:13px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="vno-tbl-align" value="left" ${cur.align === "left" ? "checked" : ""}> Trái
                </label>
                <label style="font-size:13px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="vno-tbl-align" value="center" ${cur.align === "center" ? "checked" : ""}> Giữa
                </label>
                <label style="font-size:13px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="vno-tbl-align" value="right" ${cur.align === "right" ? "checked" : ""}> Phải
                </label>
              </div>
            </fieldset>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label for="vno-tbl-indent" style="${fieldStyle}">Thụt lề trái (cm):</label>
                <input type="number" id="vno-tbl-indent" class="vno-dialog-input" min="0" max="25.4" step="0.01" value="${ptToCm(cur.indentPt)}" style="${inputStyle}">
              </div>
              <div>
                <label for="vno-tbl-width" style="${fieldStyle}">
                  <input type="checkbox" id="vno-tbl-width-enable" ${cur.hasWidth ? "checked" : ""}> Chiều rộng chỉ định:
                </label>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="vno-tbl-width" class="vno-dialog-input" min="1" max="1000" step="1" value="${cur.width || ""}" style="${inputStyle}" ${cur.hasWidth ? "" : "disabled"}>
                  <select id="vno-tbl-width-unit" class="vno-dialog-input" style="width:75px; padding:6px; font-size:13px; border:1px solid #cbd5e1; border-radius:4px;" ${cur.hasWidth ? "" : "disabled"}>
                    <option value="%" ${cur.widthUnit === "%" ? "selected" : ""}>%</option>
                    <option value="cm" ${cur.widthUnit === "cm" ? "selected" : ""}>cm</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB HÀNG -->
          <div id="vno-tblprops-panel-row" role="tabpanel" aria-labelledby="vno-tblprops-tab-row" hidden style="display:none; flex-direction:column; gap:14px;">
            <fieldset style="border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin:0;">
              <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 6px;">Kích thước hàng</legend>
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
                <label style="font-size:13px; display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" id="vno-tbl-rowheight-enable" ${cur.hasRowHeight ? "checked" : ""}> Chỉ định chiều cao:
                </label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="number" id="vno-tbl-rowheight" class="vno-dialog-input" min="0.01" max="55.8" step="0.01" value="${cur.rowHeightPt ? ptToCm(cur.rowHeightPt) : ""}" style="${inputStyle}; width:160px;" ${cur.hasRowHeight ? "" : "disabled"}>
                  <span style="font-size:13px; color:#475569;">cm</span>
                </div>
              </div>
            </fieldset>
          </div>

          <div id="vno-tblprops-panel-column" role="tabpanel" aria-labelledby="vno-tblprops-tab-column" hidden style="display:none; flex-direction:column; gap:14px;">
            <fieldset style="border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin:0;">
              <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 6px;">${t("writerTableProperties.columnWidth")}</legend>
              <label style="font-size:13px; display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="vno-tbl-colwidth-enable" ${cur.hasColumnWidth ? "checked" : ""}> ${t("writerTableProperties.setColumnWidth")}
              </label>
              <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                <input type="number" id="vno-tbl-colwidth" class="vno-dialog-input" min="0.1" max="55.8" step="0.01" value="${cur.columnWidthCm || ""}" style="${inputStyle}; width:180px;" ${cur.hasColumnWidth ? "" : "disabled"}>
                <span style="font-size:13px; color:#475569;">${t("writerTableProperties.cm")}</span>
              </div>
            </fieldset>
          </div>

          <!-- TAB Ô -->
          <div id="vno-tblprops-panel-cell" role="tabpanel" aria-labelledby="vno-tblprops-tab-cell" hidden style="display:none; flex-direction:column; gap:14px;">
            <fieldset style="border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin:0;">
              <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 6px;">${t("writerTableProperties.verticalAlign")}</legend>
              <select id="vno-tbl-valign" class="vno-dialog-input" style="${inputStyle}">
                <option value="top" ${cur.verticalAlign === "top" ? "selected" : ""}>${t("writerTableProperties.top")}</option>
                <option value="center" ${cur.verticalAlign === "center" ? "selected" : ""}>${t("writerTableProperties.center")}</option>
                <option value="bottom" ${cur.verticalAlign === "bottom" ? "selected" : ""}>${t("writerTableProperties.bottom")}</option>
              </select>
            </fieldset>
            <label style="font-size:13px; display:flex; align-items:center; gap:8px;">
              <span>${t("writerTableProperties.marginScope")}</span>
              <select id="vno-tbl-margin-scope" class="vno-dialog-input" style="${inputStyle}; width:auto;">
                <option value="table" ${cur.marginScope === "table" ? "selected" : ""}>${t("writerTableProperties.wholeTable")}</option>
                <option value="selection" ${cur.marginScope === "selection" ? "selected" : ""}>${t("writerTableProperties.selectedCells")}</option>
              </select>
            </label>
            <fieldset style="border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin:0;">
              <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 6px;">Lề mặc định của ô (Padding)</legend>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:4px;">
                <div>
                  <label for="vno-tbl-mar-top" style="${fieldStyle}">${t("writerTableProperties.marginTop")}</label>
                  <input type="number" id="vno-tbl-mar-top" class="vno-dialog-input" min="0" max="5.08" step="0.01" value="${ptToCm(cur.marginTopPt)}" style="${inputStyle}">
                </div>
                <div>
                  <label for="vno-tbl-mar-bottom" style="${fieldStyle}">${t("writerTableProperties.marginBottom")}</label>
                  <input type="number" id="vno-tbl-mar-bottom" class="vno-dialog-input" min="0" max="5.08" step="0.01" value="${ptToCm(cur.marginBottomPt)}" style="${inputStyle}">
                </div>
                <div>
                  <label for="vno-tbl-mar-left" style="${fieldStyle}">${t("writerTableProperties.marginLeft")}</label>
                  <input type="number" id="vno-tbl-mar-left" class="vno-dialog-input" min="0" max="5.08" step="0.01" value="${ptToCm(cur.marginLeftPt)}" style="${inputStyle}">
                </div>
                <div>
                  <label for="vno-tbl-mar-right" style="${fieldStyle}">${t("writerTableProperties.marginRight")}</label>
                  <input type="number" id="vno-tbl-mar-right" class="vno-dialog-input" min="0" max="5.08" step="0.01" value="${ptToCm(cur.marginRightPt)}" style="${inputStyle}">
                </div>
              </div>
            </fieldset>

            <fieldset style="border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin:0;">
              <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 6px;">Khoảng cách giữa các ô (Cell Spacing)</legend>
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
                <label style="font-size:13px; display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" id="vno-tbl-spacing-enable" ${cur.hasSpacing || cur.cellSpacingPt > 0 ? "checked" : ""}> Cho phép dãn cách giữa các ô:
                </label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="number" id="vno-tbl-spacing" class="vno-dialog-input" min="0" max="72" step="0.5" value="${cur.cellSpacingPt || ""}" style="${inputStyle}; width:160px;" ${cur.hasSpacing || cur.cellSpacingPt > 0 ? "" : "disabled"}>
                  <span style="font-size:13px; color:#475569;">pt</span>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px; padding-top:12px; border-top:1px solid #e2e8f0;">
          <button type="button" id="vno-tblprops-ok" class="vno-btn vno-btn-primary" style="padding:6px 18px; font-weight:600;">Đồng ý</button>
          <button type="button" id="vno-tblprops-cancel" class="vno-btn vno-btn-secondary" style="padding:6px 14px;">Hủy</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");
    const cancelBtn = overlay.querySelector("#vno-tblprops-cancel");
    const okBtn = overlay.querySelector("#vno-tblprops-ok");

    // Tab switching
    const tabTable = overlay.querySelector("#vno-tblprops-tab-table");
    const tabRow = overlay.querySelector("#vno-tblprops-tab-row");
    const tabCell = overlay.querySelector("#vno-tblprops-tab-cell");
    const tabColumn = overlay.querySelector("#vno-tblprops-tab-column");
    const panelTable = overlay.querySelector("#vno-tblprops-panel-table");
    const panelRow = overlay.querySelector("#vno-tblprops-panel-row");
    const panelCell = overlay.querySelector("#vno-tblprops-panel-cell");
    const panelColumn = overlay.querySelector("#vno-tblprops-panel-column");

    function switchTab(target) {
      const tabs = [tabTable, tabRow, tabColumn, tabCell];
      const panels = [panelTable, panelRow, panelColumn, panelCell];
      tabs.forEach((t, i) => {
        const isMatch = (t === target);
        t.setAttribute("aria-selected", isMatch ? "true" : "false");
        t.tabIndex = isMatch ? 0 : -1;
        t.style.cssText = isMatch ? activeTabStyle : tabStyle;
        panels[i].hidden = !isMatch;
        panels[i].style.display = isMatch ? "flex" : "none";
      });
    }

    tabTable.addEventListener("click", () => switchTab(tabTable));
    tabRow.addEventListener("click", () => switchTab(tabRow));
    tabCell.addEventListener("click", () => switchTab(tabCell));
    tabColumn.addEventListener("click", () => switchTab(tabColumn));

    const columnWidthEnable = overlay.querySelector("#vno-tbl-colwidth-enable");
    const columnWidthInput = overlay.querySelector("#vno-tbl-colwidth");
    columnWidthEnable.addEventListener("change", () => {
      columnWidthInput.disabled = !columnWidthEnable.checked;
      if (columnWidthEnable.checked && !columnWidthInput.value) columnWidthInput.value = "2.5";
    });

    // Width checkbox toggle
    const widthEnable = overlay.querySelector("#vno-tbl-width-enable");
    const widthInput = overlay.querySelector("#vno-tbl-width");
    const widthUnit = overlay.querySelector("#vno-tbl-width-unit");
    widthEnable.addEventListener("change", () => {
      widthInput.disabled = !widthEnable.checked;
      widthUnit.disabled = !widthEnable.checked;
      if (widthEnable.checked && !widthInput.value) widthInput.value = "100";
    });

    // Row height checkbox toggle
    const rowHeightEnable = overlay.querySelector("#vno-tbl-rowheight-enable");
    const rowHeightInput = overlay.querySelector("#vno-tbl-rowheight");
    rowHeightEnable.addEventListener("change", () => {
      rowHeightInput.disabled = !rowHeightEnable.checked;
      if (rowHeightEnable.checked && !rowHeightInput.value) rowHeightInput.value = "20";
    });

    // Cell spacing checkbox toggle
    const spacingEnable = overlay.querySelector("#vno-tbl-spacing-enable");
    const spacingInput = overlay.querySelector("#vno-tbl-spacing");
    spacingEnable.addEventListener("change", () => {
      spacingInput.disabled = !spacingEnable.checked;
      if (spacingEnable.checked && !spacingInput.value) spacingInput.value = "2.8";
    });

    function closeDialog(result) {
      overlay.remove();
      if (previous && typeof previous.focus === "function") previous.focus();
      resolve(result);
    }

    function submit() {
      const selectedAlign = overlay.querySelector('input[name="vno-tbl-align"]:checked')?.value || "left";
      const indentPt = Math.max(0, parseFloat(overlay.querySelector("#vno-tbl-indent")?.value || 0) * 28.3464567 || 0);

      let width = null;
      if (widthEnable.checked) {
        const wVal = parseFloat(widthInput.value) || 0;
        if (wVal > 0) {
          width = `${widthUnit.value === "cm" ? wVal * 28.3464567 : wVal}${widthUnit.value === "cm" ? "pt" : widthUnit.value}`;
        }
      }

      let rowHeightPt = null;
      if (rowHeightEnable.checked) {
        const hVal = parseFloat(rowHeightInput.value) || 0;
        if (hVal > 0) rowHeightPt = hVal * 28.3464567;
      }

      const marginTopPt = Math.max(0, parseFloat(overlay.querySelector("#vno-tbl-mar-top")?.value || 0) * 28.3464567 || 0);
      const marginBottomPt = Math.max(0, parseFloat(overlay.querySelector("#vno-tbl-mar-bottom")?.value || 0) * 28.3464567 || 0);
      const marginLeftPt = Math.max(0, parseFloat(overlay.querySelector("#vno-tbl-mar-left")?.value || 0) * 28.3464567 || 0);
      const marginRightPt = Math.max(0, parseFloat(overlay.querySelector("#vno-tbl-mar-right")?.value || 0) * 28.3464567 || 0);

      let cellSpacingPt = 0;
      if (spacingEnable.checked) {
        cellSpacingPt = Math.max(0, parseFloat(spacingInput.value || 0) || 0);
      }

      closeDialog({
        align: selectedAlign,
        indentPt,
        width,
        rowHeightPt,
        marginTopPt,
        marginBottomPt,
        marginLeftPt,
        marginRightPt,
        cellSpacingPt,
        columnWidthCm: overlay.querySelector("#vno-tbl-colwidth-enable")?.checked ? parseFloat(overlay.querySelector("#vno-tbl-colwidth")?.value || "0") : null,
        verticalAlign: overlay.querySelector("#vno-tbl-valign")?.value || "top",
        marginScope: overlay.querySelector("#vno-tbl-margin-scope")?.value || "table"
      });
    }

    closeBtn.addEventListener("click", () => closeDialog(null));
    cancelBtn.addEventListener("click", () => closeDialog(null));
    okBtn.addEventListener("click", submit);

    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog(null);
      } else if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "BUTTON") {
        e.preventDefault();
        submit();
      } else {
        trapFocus(dialogBox, e);
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog(null);
    });

    okBtn.focus();
  });
}
