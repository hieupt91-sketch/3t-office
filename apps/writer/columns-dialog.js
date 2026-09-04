/**
 * VN Office — VN Writer Columns Dialog (Chia cột văn bản)
 * Hộp thoại cấu hình Multi-column Layout chuẩn Microsoft Word Layout > Columns
 */

import { t } from "../../platform/i18n/i18n.js";

export const COLUMN_PRESETS = [
  { id: "one", count: 1, gap: 0, rule: false, label: "Một cột", labelKey: "writerDialogs.columns.presetOne", iconSvg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect x="6" y="4" width="28" height="32" rx="2" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/><line x1="10" y1="10" x2="30" y2="10" stroke="#0f4c81" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="15" x2="30" y2="15" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="20" x2="30" y2="20" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="25" x2="26" y2="25" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "two", count: 2, gap: 10, rule: false, label: "Hai cột", labelKey: "writerDialogs.columns.presetTwo", iconSvg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect x="6" y="4" width="28" height="32" rx="2" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/><line x1="10" y1="10" x2="18" y2="10" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="15" x2="18" y2="15" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="20" x2="18" y2="20" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="25" x2="16" y2="25" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="22" y1="10" x2="30" y2="10" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="15" x2="30" y2="15" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="22" y1="20" x2="30" y2="20" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><line x1="22" y1="25" x2="28" y2="25" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "three", count: 3, gap: 10, rule: false, label: "Ba cột", labelKey: "writerDialogs.columns.presetThree", iconSvg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect x="6" y="4" width="28" height="32" rx="2" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/><line x1="9" y1="10" x2="14" y2="10" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="15" x2="14" y2="15" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="9" y1="20" x2="14" y2="20" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="9" y1="25" x2="13" y2="25" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="17.5" y1="10" x2="22.5" y2="10" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/><line x1="17.5" y1="15" x2="22.5" y2="15" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="17.5" y1="20" x2="22.5" y2="20" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="17.5" y1="25" x2="21.5" y2="25" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="26" y1="10" x2="31" y2="10" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/><line x1="26" y1="15" x2="31" y2="15" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="26" y1="20" x2="31" y2="20" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/><line x1="26" y1="25" x2="30" y2="25" stroke="#64748b" stroke-width="1.4" stroke-linecap="round"/></svg>` }
];

/**
 * Hiển thị Hộp thoại Cấu hình Chia cột văn bản (Columns)
 * @param {Object} [currentColumns]
 * @returns {Promise<{count:number, gap:number, rule:boolean}|null>}
 */
export async function showColumnsDialog(currentColumns = null) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", t("writerDialogs.columns.title"));

    const cur = currentColumns || {};
    let initialCount = Math.max(1, Math.min(4, Number(cur.count) || 1));
    let initialGap = typeof cur.gap === "number" ? cur.gap : 10;
    let initialRule = Boolean(cur.rule);
    const isMulti = initialCount > 1;

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-columns-dialog" style="width: 480px;">
        <div class="vno-dialog-header">
          <span>${t("writerDialogs.columns.title")}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:16px;">
          <!-- Khối chọn nhanh Presets -->
          <div>
            <label style="font-size:12px; font-weight:600; color:#334155; display:block; margin-bottom:8px;">
              ${t("writerDialogs.columns.presetsTitle")}
            </label>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
              ${COLUMN_PRESETS.map(p => {
                const label = p.labelKey ? (t(p.labelKey) !== p.labelKey ? t(p.labelKey) : p.label) : p.label;
                return `
                <button type="button" class="vno-btn vno-col-preset-btn ${p.count === initialCount ? 'is-active' : ''}" data-count="${p.count}" data-gap="${p.gap}" style="display:flex; flex-direction:column; align-items:center; padding:8px; border:2px solid ${p.count === initialCount ? '#0f4c81' : '#cbd5e1'}; border-radius:6px; background:${p.count === initialCount ? '#eff6ff' : '#ffffff'}; cursor:pointer; gap:4px;">
                  <div style="pointer-events:none;">${p.iconSvg}</div>
                  <span style="font-size:12px; font-weight:600; color:#1e293b; pointer-events:none;">${label}</span>
                </button>
              `}).join("")}
            </div>
          </div>

          <!-- Chi tiết tùy chỉnh & Khung xem trước trực quan -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:16px; align-items:center; border-top:1px solid #e2e8f0; padding-top:14px;">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div>
                <label for="vno-col-count-input" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">
                  ${t("writerDialogs.columns.colCount")}
                </label>
                <input type="number" id="vno-col-count-input" class="vno-dialog-input" min="1" max="4" value="${initialCount}" style="width:100%; box-sizing:border-box; font-size:13px; font-weight:bold; padding:6px 10px;" />
              </div>

              <div>
                <label for="vno-col-gap-input" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">
                  ${t("writerDialogs.columns.colGap")}
                </label>
                <input type="number" id="vno-col-gap-input" class="vno-dialog-input" min="0" max="50" step="1" value="${initialGap}" style="width:100%; box-sizing:border-box; font-size:13px; padding:6px 10px;" />
              </div>

              <div style="margin-top:2px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:#334155; cursor:pointer;">
                  <input type="checkbox" id="vno-col-rule-input" ${initialRule ? 'checked' : ''} style="cursor:pointer;" />
                  <span>${t("writerDialogs.columns.colRule")}</span>
                </label>
              </div>
            </div>

            <!-- Khung xem trước trực quan (Live Preview) -->
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <span style="font-size:11px; color:#64748b; margin-bottom:6px; font-weight:600;">${t("writerDialogs.columns.preview")}</span>
              <div id="vno-col-preview-sheet" style="width:110px; height:130px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.15); border-radius:2px; border:1px solid #cbd5e1; position:relative; display:flex; gap:6px; padding:8px; box-sizing:border-box;">
                <!-- Cột preview sẽ được render động ở đây -->
              </div>
            </div>
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${isMulti ? `<button type="button" class="vno-btn vno-btn-danger vno-col-btn-remove" style="color:#dc2626; border-color:#fca5a5;">${t("writerDialogs.columns.removeColumns")}</button>` : `<span></span>`}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
            <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${t("writerDialogs.columns.apply")}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const countInput = overlay.querySelector("#vno-col-count-input");
    const gapInput = overlay.querySelector("#vno-col-gap-input");
    const ruleInput = overlay.querySelector("#vno-col-rule-input");
    const previewSheet = overlay.querySelector("#vno-col-preview-sheet");
    const presetButtons = overlay.querySelectorAll(".vno-col-preset-btn");
    const btnRemove = overlay.querySelector(".vno-col-btn-remove");

    const updatePreview = () => {
      if (!previewSheet) return;
      const count = Math.max(1, Math.min(4, Number(countInput?.value) || 1));
      const gapMm = Math.max(0, Number(gapInput?.value) || 0);
      const hasRule = Boolean(ruleInput?.checked);

      // Quy đổi gap mm thành px trong preview (tỉ lệ thu nhỏ khoảng 1mm ~ 0.8px)
      const previewGapPx = Math.max(2, Math.min(16, Math.round(gapMm * 0.6)));

      previewSheet.style.gap = `${previewGapPx}px`;
      previewSheet.innerHTML = "";

      for (let i = 0; i < count; i++) {
        const colEl = document.createElement("div");
        colEl.style.flex = "1";
        colEl.style.display = "flex";
        colEl.style.flexDirection = "column";
        colEl.style.gap = "4px";

        if (hasRule && i > 0) {
          // Thêm vạch kẻ phân cách trước cột này
          const ruleEl = document.createElement("div");
          ruleEl.style.width = "1px";
          ruleEl.style.backgroundColor = "#94a3b8";
          ruleEl.style.height = "100%";
          ruleEl.style.margin = "0 1px";
          previewSheet.appendChild(ruleEl);
        }

        colEl.innerHTML = `
          <div style="height:3px; background:#2563eb; border-radius:1px; width:70%;"></div>
          <div style="height:2px; background:#94a3b8; border-radius:1px; width:100%;"></div>
          <div style="height:2px; background:#94a3b8; border-radius:1px; width:90%;"></div>
          <div style="height:2px; background:#94a3b8; border-radius:1px; width:100%;"></div>
          <div style="height:2px; background:#94a3b8; border-radius:1px; width:60%;"></div>
        `;
        previewSheet.appendChild(colEl);
      }

      // Cập nhật viền nút preset
      presetButtons.forEach(btn => {
        const btnCount = Number(btn.getAttribute("data-count"));
        if (btnCount === count) {
          btn.style.borderColor = "#0f4c81";
          btn.style.backgroundColor = "#eff6ff";
          btn.classList.add("is-active");
        } else {
          btn.style.borderColor = "#cbd5e1";
          btn.style.backgroundColor = "#ffffff";
          btn.classList.remove("is-active");
        }
      });
    };

    // Event listeners
    countInput?.addEventListener("input", updatePreview);
    gapInput?.addEventListener("input", updatePreview);
    ruleInput?.addEventListener("change", updatePreview);

    presetButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const c = Number(btn.getAttribute("data-count")) || 1;
        const g = Number(btn.getAttribute("data-gap")) || (c > 1 ? 10 : 0);
        if (countInput) countInput.value = String(c);
        if (gapInput) gapInput.value = String(g);
        updatePreview();
      });
    });

    updatePreview();
    countInput?.focus?.();

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(result);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      const count = Math.max(1, Math.min(4, Number(countInput?.value) || 1));
      const gap = Math.max(0, Number(gapInput?.value) || 0);
      const rule = Boolean(ruleInput?.checked);
      cleanup({ count, gap, rule });
    });

    if (btnRemove) {
      btnRemove.addEventListener("click", () => cleanup({ count: 1, gap: 0, rule: false }));
    }

    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === "Enter" && (e.target === countInput || e.target === gapInput)) {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
