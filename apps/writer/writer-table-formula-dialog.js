/**
 * VN Writer — Table Formula Dialog
 * Hộp thoại và cơ chế tính toán công thức trong bảng (=SUM(ABOVE), =SUM(LEFT)...) chuẩn Word 2016.
 */

import { t } from "../../platform/i18n/i18n.js";

export function detectDefaultTableFormula(table, cell) {
  if (!table || !cell) return "=SUM(ABOVE)";
  const row = cell.parentElement;
  if (!row) return "=SUM(ABOVE)";
  const rIdx = row.rowIndex;
  const cIdx = cell.cellIndex;

  // Check if there are numeric values above
  let hasNumbersAbove = false;
  for (let r = rIdx - 1; r >= 0; r--) {
    const checkRow = table.rows[r];
    const checkCell = checkRow?.cells?.[cIdx];
    if (checkCell) {
      const text = checkCell.textContent?.trim() || "";
      const num = parseFloat(text.replace(/[^0-9.-]/g, ""));
      if (!isNaN(num) && text.length > 0) {
        hasNumbersAbove = true;
        break;
      }
    }
  }
  if (hasNumbersAbove) return "=SUM(ABOVE)";

  // Check if there are numeric values to the left
  let hasNumbersLeft = false;
  for (let c = cIdx - 1; c >= 0; c--) {
    const checkCell = row.cells?.[c];
    if (checkCell) {
      const text = checkCell.textContent?.trim() || "";
      const num = parseFloat(text.replace(/[^0-9.-]/g, ""));
      if (!isNaN(num) && text.length > 0) {
        hasNumbersLeft = true;
        break;
      }
    }
  }
  if (hasNumbersLeft) return "=SUM(LEFT)";

  return "=SUM(ABOVE)";
}

export function parseNumberFromText(str) {
  if (!str) return NaN;
  const cleaned = String(str).trim().replace(/,/g, "").replace(/₫|\$|€|£/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? NaN : val;
}

export function formatFormulaNumber(val, formatStr = "#,##0") {
  if (isNaN(val)) return "0";
  const fmt = String(formatStr || "").trim();

  if (fmt.includes("%")) {
    const pct = val * 100;
    if (fmt.includes(".00")) return `${pct.toFixed(2)}%`;
    return `${Math.round(pct)}%`;
  }

  if (fmt.includes(".00")) {
    const parts = val.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  // Default integer with comma separators
  const rounded = Math.round(val);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function evaluateTableFormula(table, cell, formulaStr) {
  if (!table || !cell || !formulaStr) return 0;
  const formula = String(formulaStr).trim().toUpperCase();
  const match = formula.match(/^=([A-Z]+)\(([^)]*)\)$/);
  if (!match) return 0;

  const fnName = match[1];
  const arg = match[2].trim();

  const row = cell.parentElement;
  const rIdx = row ? row.rowIndex : 0;
  const cIdx = cell.cellIndex;

  const values = [];

  if (arg === "ABOVE") {
    for (let r = rIdx - 1; r >= 0; r--) {
      const checkRow = table.rows[r];
      const checkCell = checkRow?.cells?.[cIdx];
      if (checkCell) {
        const val = parseNumberFromText(checkCell.textContent);
        if (!isNaN(val)) {
          values.push(val);
        } else if (values.length > 0) {
          break; // Stop at first non-number once numbers started
        }
      }
    }
  } else if (arg === "LEFT") {
    for (let c = cIdx - 1; c >= 0; c--) {
      const checkCell = row?.cells?.[c];
      if (checkCell) {
        const val = parseNumberFromText(checkCell.textContent);
        if (!isNaN(val)) {
          values.push(val);
        } else if (values.length > 0) {
          break;
        }
      }
    }
  } else if (arg === "BELOW") {
    for (let r = rIdx + 1; r < table.rows.length; r++) {
      const checkRow = table.rows[r];
      const checkCell = checkRow?.cells?.[cIdx];
      if (checkCell) {
        const val = parseNumberFromText(checkCell.textContent);
        if (!isNaN(val)) {
          values.push(val);
        } else if (values.length > 0) {
          break;
        }
      }
    }
  } else if (arg === "RIGHT") {
    for (let c = cIdx + 1; c < (row?.cells?.length || 0); c++) {
      const checkCell = row?.cells?.[c];
      if (checkCell) {
        const val = parseNumberFromText(checkCell.textContent);
        if (!isNaN(val)) {
          values.push(val);
        } else if (values.length > 0) {
          break;
        }
      }
    }
  }

  if (!values.length) return 0;

  switch (fnName) {
    case "SUM":
      return values.reduce((a, b) => a + b, 0);
    case "AVERAGE":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "COUNT":
      return values.length;
    case "MAX":
      return Math.max(...values);
    case "MIN":
      return Math.min(...values);
    case "PRODUCT":
      return values.reduce((a, b) => a * b, 1);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export function showTableFormulaDialog(table, cell, adapter = null) {
  if (typeof document === "undefined" || !table || !cell) return;

  const defaultFormula = detectDefaultTableFormula(table, cell);

  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  overlay.id = "vno-table-formula-overlay";

  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width: 420px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-formula-dialog-title">
      <div class="vno-dialog-header">
        <span id="vno-formula-dialog-title">${t("writerDialogs.tableFormula.title", "Công thức")}</span>
        <button type="button" class="vno-dialog-close" aria-label="${t("common.dialog.close", "Đóng")}">&times;</button>
      </div>
      <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:12px;">
        <label style="display:flex; flex-direction:column; gap:4px; font-size:13px; font-weight:500;">
          ${t("writerDialogs.tableFormula.formulaLabel", "Công thức:")}
          <input type="text" id="vno-table-formula-input" value="${defaultFormula}" class="vno-dialog-input" style="font-family:monospace; font-size:14px; padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; gap:4px; font-size:13px; font-weight:500;">
          ${t("writerDialogs.tableFormula.numberFormatLabel", "Định dạng số:")}
          <select id="vno-table-formula-numfmt" class="vno-dialog-select" style="padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px;">
            <option value="#,##0" selected>#,##0</option>
            <option value="#,##0.00">#,##0.00</option>
            <option value="0">0</option>
            <option value="0%">0%</option>
            <option value="0.00%">0.00%</option>
          </select>
        </label>
        <label style="display:flex; flex-direction:column; gap:4px; font-size:13px; font-weight:500;">
          ${t("writerDialogs.tableFormula.pasteFunctionLabel", "Dán hàm:")}
          <select id="vno-table-formula-fn-select" class="vno-dialog-select" style="padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px;">
            <option value="" disabled selected>-- Chọn hàm --</option>
            <option value="SUM">SUM</option>
            <option value="AVERAGE">AVERAGE</option>
            <option value="COUNT">COUNT</option>
            <option value="MAX">MAX</option>
            <option value="MIN">MIN</option>
            <option value="PRODUCT">PRODUCT</option>
          </select>
        </label>
        <div style="font-size:12px; color:#64748b; line-height:1.4;">
          Ví dụ: <code>=SUM(ABOVE)</code> tính tổng các ô phía trên, <code>=SUM(LEFT)</code> tính tổng các ô bên trái.
        </div>
      </div>
      <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button type="button" class="vno-btn vno-btn-secondary" id="vno-formula-cancel-btn">${t("writerDialogs.tableFormula.cancel", "Hủy")}</button>
        <button type="button" class="vno-btn vno-btn-primary" id="vno-formula-ok-btn">${t("writerDialogs.tableFormula.ok", "Đồng ý")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const formulaInput = overlay.querySelector("#vno-table-formula-input");
  const numFmtSelect = overlay.querySelector("#vno-table-formula-numfmt");
  const fnSelect = overlay.querySelector("#vno-table-formula-fn-select");
  const okBtn = overlay.querySelector("#vno-formula-ok-btn");
  const cancelBtn = overlay.querySelector("#vno-formula-cancel-btn");
  const closeBtn = overlay.querySelector(".vno-dialog-close");

  fnSelect.addEventListener("change", () => {
    if (fnSelect.value) {
      const cur = formulaInput.value.trim();
      if (!cur || cur === "=") {
        formulaInput.value = `=${fnSelect.value}()`;
      } else if (cur.startsWith("=")) {
        formulaInput.value = `=${fnSelect.value}(${cur.slice(cur.indexOf("(") + 1)}`;
      } else {
        formulaInput.value = `=${fnSelect.value}()`;
      }
    }
  });

  const closeDialog = () => {
    overlay.remove();
  };

  const commit = () => {
    const formulaVal = formulaInput.value.trim();
    const numFmtVal = numFmtSelect.value || "#,##0";
    if (!formulaVal.startsWith("=")) {
      alert(t("writerDialogs.tableFormula.invalidFormula", "Công thức phải bắt đầu bằng dấu bằng (=)."));
      return;
    }

    const calculated = evaluateTableFormula(table, cell, formulaVal);
    const formatted = formatFormulaNumber(calculated, numFmtVal);

    // Insert field span into cell
    cell.innerHTML = `<span class="vno-table-formula-field" data-vno-field="formula" data-vno-formula="${formulaVal}" data-vno-numfmt="${numFmtVal}" title="${formulaVal}">${formatted}</span>`;

    if (adapter) {
      adapter.isDirty = true;
      adapter._recordTableUndo?.("table-formula", table);
      adapter.recordSnapshot?.("writer.table.formula");
    }

    closeDialog();
  };

  okBtn.addEventListener("click", commit);
  cancelBtn.addEventListener("click", closeDialog);
  closeBtn.addEventListener("click", closeDialog);

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      closeDialog();
    }
  });

  formulaInput.focus();
  formulaInput.select();
}
