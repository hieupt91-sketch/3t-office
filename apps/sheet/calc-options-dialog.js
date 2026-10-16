/**
 * VN Office — Hộp thoại Tùy chọn công thức và tính toán cho VN Sheet.
 * Cung cấp các thiết lập:
 *  - Chế độ tính toán: Tự động, Tự động ngoại trừ bảng dữ liệu, Thủ công.
 *  - Tính toán lại sổ làm việc trước khi lưu.
 *  - Tính toán lặp (Iterative calculation): Bật/Tắt, Số lần lặp tối đa, Độ lệch tối đa.
 *  - Kiểu tham chiếu R1C1.
 *  - Độ chính xác như hiển thị (Precision as displayed).
 *  - Hệ thống ngày 1904 (1904 date system).
 */

import { t } from "../../platform/i18n/i18n.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[char]);

export class CalcOptionsDialog {
  static show(grid) {
    if (!grid || typeof document === "undefined" || !document.body) return false;

    // Đóng hộp thoại cũ nếu đang mở
    document.querySelectorAll(".vno-calc-options-dialog").forEach(node => node.remove());

    const overlay = document.createElement("div");
    overlay.className = "vno-calc-options-overlay vno-dialog-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `;

    const dialog = document.createElement("div");
    dialog.className = "vno-calc-options-dialog vno-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", t("sheetDialogs.calcOptions.title", "Tùy chọn công thức và tính toán"));
    dialog.style.cssText = `
      background: #ffffff; border-radius: 8px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      width: 520px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px; color: #1e293b; overflow: hidden;
    `;

    const currentMode = grid.calculationMode || "automatic";
    const currentCalcOnSave = grid.calculateBeforeSave !== false;
    const currentIteration = Boolean(grid.iteration);
    const currentMaxIter = grid.maxIterations || 100;
    const currentMaxChange = grid.maxChange ?? 0.001;
    const currentR1C1 = grid.referenceStyle === "R1C1";
    const currentPrecision = Boolean(grid.precisionAsDisplayed);
    const currentDate1904 = Boolean(grid.date1904);

    dialog.innerHTML = `
      <div class="vno-dialog-header" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${t("sheetDialogs.calcOptions.title", "Tùy chọn công thức và tính toán")}</h3>
        <button type="button" class="vno-dialog-close-btn" style="background: none; border: none; font-size: 18px; line-height: 1; cursor: pointer; color: #64748b;" aria-label="${t("common.close", "Đóng")}">×</button>
      </div>

      <div class="vno-dialog-body" style="padding: 16px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
        <!-- Nhóm 1: Tùy chọn tính toán -->
        <fieldset style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin: 0;">
          <legend style="font-weight: 600; color: #0f172a; padding: 0 4px;">${t("sheetDialogs.calcOptions.calcGroup", "Tính toán sổ làm việc")}</legend>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="vno-calc-mode" value="automatic" ${currentMode === "automatic" ? "checked" : ""}>
              <span>${t("sheetDialogs.calcOptions.modeAuto", "Tự động")}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="vno-calc-mode" value="autoNoTable" ${currentMode === "autoNoTable" ? "checked" : ""}>
              <span>${t("sheetDialogs.calcOptions.modeAutoNoTable", "Tự động ngoại trừ bảng dữ liệu")}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="vno-calc-mode" value="manual" ${currentMode === "manual" ? "checked" : ""}>
              <span>${t("sheetDialogs.calcOptions.modeManual", "Thủ công")}</span>
            </label>
            <div style="margin-left: 24px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; ${currentMode === "manual" ? "" : "color: #94a3b8;"}">
                <input type="checkbox" id="vno-calc-on-save" ${currentCalcOnSave ? "checked" : ""} ${currentMode === "manual" ? "" : "disabled"}>
                <span>${t("sheetDialogs.calcOptions.recalcBeforeSave", "Tính toán lại sổ làm việc trước khi lưu")}</span>
              </label>
            </div>
          </div>
        </fieldset>

        <!-- Nhóm 2: Tính toán lặp -->
        <fieldset style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin: 0;">
          <legend style="font-weight: 600; color: #0f172a; padding: 0 4px;">${t("sheetDialogs.calcOptions.iterGroup", "Tính toán lặp")}</legend>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="vno-calc-iteration" ${currentIteration ? "checked" : ""}>
              <span>${t("sheetDialogs.calcOptions.enableIteration", "Bật tính toán lặp (giải quyết tham chiếu vòng)")}</span>
            </label>
            <div id="vno-calc-iteration-details" style="display: grid; grid-template-columns: 180px 1fr; gap: 8px 12px; align-items: center; margin-left: 24px; opacity: ${currentIteration ? "1" : "0.5"}; pointer-events: ${currentIteration ? "auto" : "none"};">
              <label for="vno-calc-max-iter">${t("sheetDialogs.calcOptions.maxIterations", "Số lần lặp tối đa:")}</label>
              <input type="number" id="vno-calc-max-iter" min="1" max="32767" step="1" value="${esc(currentMaxIter)}" style="width: 110px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
              <label for="vno-calc-max-change">${t("sheetDialogs.calcOptions.maxChange", "Độ lệch tối đa:")}</label>
              <input type="number" id="vno-calc-max-change" min="0" step="0.0001" value="${esc(currentMaxChange)}" style="width: 110px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
            </div>
          </div>
        </fieldset>

        <!-- Nhóm 3: Làm việc với công thức -->
        <fieldset style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin: 0;">
          <legend style="font-weight: 600; color: #0f172a; padding: 0 4px;">${t("sheetDialogs.calcOptions.formulaGroup", "Làm việc với công thức")}</legend>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="vno-calc-r1c1" ${currentR1C1 ? "checked" : ""}>
              <span>${t("sheetDialogs.calcOptions.r1c1Style", "Kiểu tham chiếu R1C1 (hàng và cột đều hiển thị số)")}</span>
            </label>
          </div>
        </fieldset>

        <!-- Nhóm 4: Tùy chọn khi tính toán sổ làm việc này -->
        <fieldset style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin: 0;">
          <legend style="font-weight: 600; color: #0f172a; padding: 0 4px;">${t("sheetDialogs.calcOptions.workbookGroup", "Tùy chọn cho sổ làm việc này")}</legend>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="vno-calc-precision" ${currentPrecision ? "checked" : ""} style="margin-top: 2px;">
              <span>
                <strong>${t("sheetDialogs.calcOptions.precisionAsDisplayed", "Đặt độ chính xác như hiển thị")}</strong><br>
                <small style="color: #64748b;">${t("sheetDialogs.calcOptions.precisionDesc", "Làm tròn vĩnh viễn các giá trị số và kết quả công thức theo định dạng hiển thị của ô.")}</small>
              </span>
            </label>
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="vno-calc-date1904" ${currentDate1904 ? "checked" : ""} style="margin-top: 2px;">
              <span>
                <strong>${t("sheetDialogs.calcOptions.date1904", "Sử dụng hệ thống ngày 1904")}</strong><br>
                <small style="color: #64748b;">${t("sheetDialogs.calcOptions.date1904Desc", "Bắt đầu tính số sê-ri ngày từ ngày 01/01/1904 thay vì 01/01/1900.")}</small>
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <div class="vno-dialog-footer" style="padding: 12px 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc;">
        <button type="button" id="vno-calc-cancel-btn" style="padding: 6px 16px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; cursor: pointer; font-weight: 500;">${t("common.cancel", "Hủy")}</button>
        <button type="button" id="vno-calc-ok-btn" style="padding: 6px 16px; border: none; background: #0f6d38; color: #ffffff; border-radius: 4px; cursor: pointer; font-weight: 500;">${t("common.ok", "Đồng ý")}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Event binding
    const closeDialog = () => {
      overlay.remove();
      grid.focusGrid?.();
    };

    dialog.querySelector(".vno-dialog-close-btn")?.addEventListener("click", closeDialog);
    dialog.querySelector("#vno-calc-cancel-btn")?.addEventListener("click", closeDialog);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    const modeRadios = dialog.querySelectorAll('input[name="vno-calc-mode"]');
    const calcOnSaveBox = dialog.querySelector("#vno-calc-on-save");
    modeRadios.forEach(radio => {
      radio.addEventListener("change", () => {
        const isManual = radio.value === "manual";
        if (calcOnSaveBox) {
          calcOnSaveBox.disabled = !isManual;
          const parentLabel = calcOnSaveBox.closest("label");
          if (parentLabel) {
            parentLabel.style.color = isManual ? "" : "#94a3b8";
          }
        }
      });
    });

    const iterationBox = dialog.querySelector("#vno-calc-iteration");
    const iterationDetails = dialog.querySelector("#vno-calc-iteration-details");
    iterationBox?.addEventListener("change", () => {
      const enabled = iterationBox.checked;
      if (iterationDetails) {
        iterationDetails.style.opacity = enabled ? "1" : "0.5";
        iterationDetails.style.pointerEvents = enabled ? "auto" : "none";
      }
    });

    const precisionBox = dialog.querySelector("#vno-calc-precision");
    precisionBox?.addEventListener("change", () => {
      if (precisionBox.checked && !currentPrecision) {
        const confirmMsg = t(
          "sheetDialogs.calcOptions.precisionWarning",
          "Dữ liệu số sẽ bị mất độ chính xác vĩnh viễn theo định dạng ô hiển thị. Bạn có chắc chắn muốn tiếp tục?"
        );
        if (typeof window !== "undefined" && typeof window.confirm === "function") {
          const ok = window.confirm(confirmMsg);
          if (!ok) precisionBox.checked = false;
        }
      }
    });

    dialog.querySelector("#vno-calc-ok-btn")?.addEventListener("click", () => {
      const selectedRadio = dialog.querySelector('input[name="vno-calc-mode"]:checked');
      const nextMode = selectedRadio ? selectedRadio.value : "automatic";
      const nextCalcOnSave = calcOnSaveBox ? calcOnSaveBox.checked : true;

      const nextIteration = iterationBox ? iterationBox.checked : false;
      const nextMaxIter = Number(dialog.querySelector("#vno-calc-max-iter")?.value) || 100;
      const nextMaxChange = Number(dialog.querySelector("#vno-calc-max-change")?.value) ?? 0.001;

      const nextR1C1 = dialog.querySelector("#vno-calc-r1c1")?.checked ? "R1C1" : "A1";
      const nextPrecision = precisionBox ? precisionBox.checked : false;
      const nextDate1904 = dialog.querySelector("#vno-calc-date1904")?.checked ?? false;

      // Áp dụng các thay đổi
      grid.setCalculationMode(nextMode, nextCalcOnSave);
      grid.setIterativeCalculation(nextIteration, nextMaxIter, nextMaxChange);
      if (nextPrecision !== currentPrecision) {
        grid.setPrecisionAsDisplayed(nextPrecision);
      }
      if (nextDate1904 !== currentDate1904) {
        grid.setDate1904(nextDate1904);
      }
      if (nextR1C1 !== grid.referenceStyle) {
        grid.setReferenceStyle(nextR1C1);
      }

      closeDialog();
    });

    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key === "Enter" && !e.target.matches("textarea, button")) {
        e.preventDefault();
        dialog.querySelector("#vno-calc-ok-btn")?.click();
      }
    });

    // Auto-focus OK button or first element
    setTimeout(() => {
      dialog.querySelector("#vno-calc-ok-btn")?.focus();
    }, 50);

    return true;
  }
}
