/**
 * VN Office — VN Writer Page Decorations (Hình mờ & Viền trang)
 * Hộp thoại và tiện ích cấu hình Watermark & Page Border chuẩn Word
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

export const WATERMARK_SUGGESTIONS = [
  "DỰ THẢO",
  "MẬT",
  "TUYỆT MẬT",
  "KHẨN",
  "BẢN SAO"
];

export const WATERMARK_COLORS = [
  { label: "Đỏ nhạt", value: "#dc2626" },
  { label: "Xám tiêu chuẩn", value: "#94a3b8" },
  { label: "Xanh dương", value: "#2563eb" },
  { label: "Vàng hổ phách", value: "#d97706" }
];

export const PAGE_BORDER_STYLES = [
  { value: "solid", label: "Đường nét liền (Solid)" },
  { value: "dashed", label: "Đường nét đứt (Dashed)" },
  { value: "double", label: "Đường nét đôi (Double)" },
  { value: "none", label: "Không có viền (None)" }
];

export const PAGE_BORDER_WIDTHS = [
  { value: 1, label: "1 pt (Mỏng)" },
  { value: 1.5, label: "1.5 pt" },
  { value: 2, label: "2 pt (Tiêu chuẩn)" },
  { value: 3, label: "3 pt (Đậm)" },
  { value: 4.5, label: "4.5 pt" },
  { value: 6, label: "6 pt (Rất đậm)" }
];

export const PAGE_BORDER_COLORS = [
  { label: "Xanh VN Office", value: "#0f4c81" },
  { label: "Đen than", value: "#1e293b" },
  { label: "Xám trung tính", value: "#64748b" },
  { label: "Đỏ hành chính", value: "#dc2626" },
  { label: "Xanh lá cây", value: "#15803d" }
];

export const PAGE_COLOR_PALETTE = [
  "transparent", "#ffffff", "#f8fafc", "#e2e8f0", "#dbeafe", "#dcfce7",
  "#fef3c7", "#fee2e2", "#ede9fe", "#cffafe", "#1e293b", "#0f4c81"
];

export async function showPageColorDialog(currentColor = "transparent") {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.innerHTML = `<div class="vno-dialog-box vno-page-color-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-page-color-title" style="width:420px;max-width:calc(100vw - 32px);">
      <div class="vno-dialog-header"><span id="vno-page-color-title" style="font-weight:700;">${t("writerDialogs.pageColor.title")}</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close") || "Close"}" aria-label="${t("common.close") || "Close"}">×</button></div>
      <div class="vno-dialog-body"><p style="margin:0 0 12px;font-size:13px;color:var(--vno-text-secondary);line-height:1.45;">${t("writerDialogs.pageColor.hint")}</p><div class="vno-page-color-grid" role="listbox" aria-label="${t("writerDialogs.pageColor.palette")}" style="display:grid;grid-template-columns:repeat(6,44px);gap:10px">
      ${PAGE_COLOR_PALETTE.map((color) => `<button type="button" role="option" data-page-color="${color}" aria-label="${color === "transparent" ? t("writerDialogs.pageColor.noColor") : color}" aria-selected="${color === currentColor}" style="width:40px;height:40px;border:2px solid ${color === currentColor ? "var(--vno-border-focus, #2563eb)" : "var(--vno-border-default, #94a3b8)"};border-radius:6px;cursor:pointer;background:${color === "transparent" ? "linear-gradient(135deg,#fff 45%,#dc2626 46%,#dc2626 54%,#fff 55%)" : color}"></button>`).join("")}
      </div><label style="display:flex;gap:10px;align-items:center;margin-top:16px;font-size:13px;color:var(--vno-text-primary);cursor:pointer;">${t("writerDialogs.pageColor.custom")} <input type="color" value="${currentColor === "transparent" ? "#ffffff" : currentColor}" style="width:40px;height:32px;padding:0;border:1px solid var(--vno-border-default);border-radius:4px;background:var(--vno-bg-surface);cursor:pointer;"></label></div>
      <div class="vno-dialog-footer"><button type="button" class="vno-btn" data-action="cancel">${t("writerDialogs.pageColor.cancel")}</button><button type="button" class="vno-btn vno-btn-primary" data-action="apply">${t("writerDialogs.pageColor.apply")}</button></div></div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    let selected = currentColor;
    const finish = (value) => { document.removeEventListener("keydown", onKey); overlay.remove(); previousFocused?.focus?.(); resolve(value); };
    overlay.querySelectorAll("[data-page-color]").forEach((button) => button.addEventListener("click", () => {
      selected = button.dataset.pageColor;
      overlay.querySelectorAll("[data-page-color]").forEach((item) => item.setAttribute("aria-selected", String(item === button)));
    }));
    overlay.querySelector('input[type="color"]').addEventListener("input", (event) => { selected = event.target.value; });
    overlay.querySelector('[data-action="apply"]').addEventListener("click", () => finish(selected));
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => finish(null));
    overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => finish(null));
    const onKey = (event) => { if (event.key === "Escape") finish(null); else if (event.key === "Enter") finish(selected); else trapFocus(box, event); };
    document.addEventListener("keydown", onKey);
    overlay.querySelector("[data-page-color]")?.focus();
  });
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
 * Hiển thị Hộp thoại Cấu hình Hình mờ (Watermark)
 * @param {Object} [currentWatermark]
 * @returns {Promise<{text:string, color:string, opacity:number, angle:number, fontSize:number}|string|null>}
 */
export async function showWatermarkDialog(currentWatermark = null) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    const activeText = currentWatermark?.text || "DỰ THẢO";
    const activeColor = currentWatermark?.color || "#dc2626";
    const activeOpacity = currentWatermark?.opacity ?? 0.2;
    const activeAngle = currentWatermark?.angle ?? 45;
    const hasWatermark = Boolean(currentWatermark && currentWatermark.text);

    const isEn = getLocale() === "en";
    const suggestions = isEn
      ? ["DRAFT", "CONFIDENTIAL", "TOP SECRET", "URGENT", "COPY"]
      : WATERMARK_SUGGESTIONS;

    const colorLabelMap = {
      "#dc2626": isEn ? "Light Red" : "Đỏ nhạt",
      "#94a3b8": isEn ? "Standard Gray" : "Xám tiêu chuẩn",
      "#2563eb": isEn ? "Blue" : "Xanh dương",
      "#d97706": isEn ? "Amber" : "Vàng hổ phách"
    };

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-watermark-dialog" style="width: 440px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-wm-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-wm-dialog-title">${t("writerDialogs.watermark.title")}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--vno-text-secondary); display:block; margin-bottom:4px;">
              ${t("writerDialogs.watermark.suggestionsTitle")}
            </label>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${suggestions.map(s => `
                <button type="button" class="vno-btn vno-watermark-chip" data-text="${s}" aria-label="${s}" style="font-size:11px; padding:3px 8px;">
                  ${s}
                </button>
              `).join("")}
            </div>
          </div>

          <div>
            <label for="vno-wm-text" style="font-size:13px; font-weight:600; display:block; margin-bottom:4px;">
              ${t("writerDialogs.watermark.textLabel")}
            </label>
            <input type="text" id="vno-wm-text" class="vno-dialog-input" value="${activeText}" placeholder="${t("writerDialogs.watermark.placeholder")}" style="width:100%; box-sizing:border-box; font-size:14px; font-weight:bold; padding:8px 10px;" />
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div>
              <label for="vno-wm-color" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">${t("writerDialogs.watermark.colorLabel")}</label>
              <select id="vno-wm-color" class="vno-select" style="width:100%;">
                ${WATERMARK_COLORS.map(c => `
                  <option value="${c.value}" ${c.value === activeColor ? "selected" : ""}>${colorLabelMap[c.value] || c.label}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="vno-wm-angle" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">${t("writerDialogs.watermark.angleLabel")}</label>
              <select id="vno-wm-angle" class="vno-select" style="width:100%;">
                <option value="45" ${activeAngle === 45 ? "selected" : ""}>${t("writerDialogs.watermark.angleDiagonal")}</option>
                <option value="-45" ${activeAngle === -45 ? "selected" : ""}>${t("writerDialogs.watermark.angleDiagonalNeg")}</option>
                <option value="0" ${activeAngle === 0 ? "selected" : ""}>${t("writerDialogs.watermark.angleHorizontal")}</option>
              </select>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label for="vno-wm-opacity" style="font-size:12px; font-weight:600;">${t("writerDialogs.watermark.opacityLabel")}</label>
              <span id="vno-wm-opacity-val" style="font-size:12px; font-weight:bold; color:var(--vno-app-current-fg, #0f4c81);">${Math.round(activeOpacity * 100)}%</span>
            </div>
            <input type="range" id="vno-wm-opacity" min="0.05" max="0.6" step="0.05" value="${activeOpacity}" aria-label="${t("writerDialogs.watermark.opacityLabel")}" aria-valuemin="5" aria-valuemax="60" aria-valuenow="${Math.round(activeOpacity * 100)}" style="width:100%;" />
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${hasWatermark ? `<button type="button" class="vno-btn vno-btn-danger vno-wm-btn-remove" style="color:var(--vno-brand-red, #dc2626); border-color:#fca5a5;">${t("writerDialogs.watermark.removeWatermark")}</button>` : `<span></span>`}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
            <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${t("writerDialogs.watermark.apply")}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const txtInput = overlay.querySelector("#vno-wm-text");
    const opacityInput = overlay.querySelector("#vno-wm-opacity");
    const opacityLabel = overlay.querySelector("#vno-wm-opacity-val");
    const btnRemove = overlay.querySelector(".vno-wm-btn-remove");

    txtInput?.focus?.();

    // Chip click
    overlay.querySelectorAll(".vno-watermark-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const t = chip.getAttribute("data-text");
        if (txtInput && t) {
          txtInput.value = t;
          txtInput.focus();
        }
      });
    });

    opacityInput?.addEventListener("input", () => {
      const pct = Math.round(Number(opacityInput.value) * 100);
      if (opacityLabel) opacityLabel.textContent = `${pct}%`;
      opacityInput.setAttribute("aria-valuenow", String(pct));
    });

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      const text = (txtInput?.value || "").trim();
      if (!text) {
        cleanup("");
        return;
      }
      cleanup({
        text,
        color: overlay.querySelector("#vno-wm-color")?.value || "#dc2626",
        opacity: Number(opacityInput?.value) || 0.2,
        angle: Number(overlay.querySelector("#vno-wm-angle")?.value) || 45,
        fontSize: 72
      });
    });

    if (btnRemove) {
      btnRemove.addEventListener("click", () => cleanup(""));
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
      } else if (e.key === "Enter") {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

/**
 * Hiển thị Hộp thoại Cấu hình Viền trang (Page Border)
 * @param {Object} [currentBorder]
 * @returns {Promise<{enabled:boolean, style:string, width:number, color:string}|null>}
 */
export async function showPageBorderDialog(currentBorder = null) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    const isEnabled = Boolean(currentBorder && currentBorder.enabled);
    const activeStyle = currentBorder?.style || "solid";
    const activeWidth = currentBorder?.width ?? 2;
    const activeColor = currentBorder?.color || "#0f4c81";

    const isEn = getLocale() === "en";
    const styleLabelMap = {
      solid: isEn ? "Solid" : "Đường nét liền (Solid)",
      dashed: isEn ? "Dashed" : "Đường nét đứt (Dashed)",
      double: isEn ? "Double" : "Đường nét đôi (Double)",
      none: isEn ? "None" : "Không có viền (None)"
    };
    const widthLabelMap = {
      1: isEn ? "1 pt (Thin)" : "1 pt (Mỏng)",
      1.5: "1.5 pt",
      2: isEn ? "2 pt (Standard)" : "2 pt (Tiêu chuẩn)",
      3: isEn ? "3 pt (Thick)" : "3 pt (Đậm)",
      4.5: "4.5 pt",
      6: isEn ? "6 pt (Extra Thick)" : "6 pt (Rất đậm)"
    };
    const colorLabelMap = {
      "#0f4c81": isEn ? "VN Office Blue" : "Xanh VN Office",
      "#1e293b": isEn ? "Charcoal" : "Đen than",
      "#64748b": isEn ? "Neutral Gray" : "Xám trung tính",
      "#dc2626": isEn ? "Official Red" : "Đỏ hành chính",
      "#15803d": isEn ? "Green" : "Xanh lá cây"
    };

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-page-border-dialog" style="width: 460px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-pb-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-pb-dialog-title">${t("writerDialogs.pageBorder.title")}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div>
                <label for="vno-border-style" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">${t("writerDialogs.pageBorder.styleLabel")}</label>
                <select id="vno-border-style" class="vno-select" style="width:100%;">
                  ${PAGE_BORDER_STYLES.map(s => `
                    <option value="${s.value}" ${s.value === activeStyle ? "selected" : ""}>${styleLabelMap[s.value] || s.label}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label for="vno-border-width" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">${t("writerDialogs.pageBorder.widthLabel")}</label>
                <select id="vno-border-width" class="vno-select" style="width:100%;">
                  ${PAGE_BORDER_WIDTHS.map(w => `
                    <option value="${w.value}" ${Number(w.value) === Number(activeWidth) ? "selected" : ""}>${widthLabelMap[w.value] || w.label}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label for="vno-border-color" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">${t("writerDialogs.pageBorder.colorLabel")}</label>
                <select id="vno-border-color" class="vno-select" style="width:100%;">
                  ${PAGE_BORDER_COLORS.map(c => `
                    <option value="${c.value}" ${c.value === activeColor ? "selected" : ""}>${colorLabelMap[c.value] || c.label}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <!-- Khung xem trước trực quan (Live Preview) -->
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;" aria-hidden="true">
              <span style="font-size:11px; color:var(--vno-text-secondary); margin-bottom:6px; font-weight:600;">${t("writerDialogs.pageBorder.previewTitle")}</span>
              <div id="vno-border-preview-sheet" style="width:110px; height:140px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.15); border-radius:2px; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; box-sizing:border-box;">
                <div id="vno-border-preview-inner" style="position:absolute; inset:6px; pointer-events:none; border: 2px solid #0f4c81; box-sizing:border-box;"></div>
                <div style="font-size:8px; color:#94a3b8; line-height:1.4; text-align:center;">
                  ${t("writerDialogs.pageBorder.sampleText")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${isEnabled ? `<button type="button" class="vno-btn vno-btn-danger vno-border-btn-remove" style="color:var(--vno-brand-red, #dc2626); border-color:#fca5a5;">${t("writerDialogs.pageBorder.removeBorder")}</button>` : `<span></span>`}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
            <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${t("writerDialogs.pageBorder.apply")}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const styleSelect = overlay.querySelector("#vno-border-style");
    const widthSelect = overlay.querySelector("#vno-border-width");
    const colorSelect = overlay.querySelector("#vno-border-color");
    const previewInner = overlay.querySelector("#vno-border-preview-inner");
    const btnRemove = overlay.querySelector(".vno-border-btn-remove");

    const updatePreview = () => {
      if (!previewInner) return;
      const st = styleSelect?.value || "solid";
      const w = widthSelect?.value || "2";
      const c = colorSelect?.value || "#0f4c81";
      if (st === "none") {
        previewInner.style.border = "none";
      } else {
        previewInner.style.border = `${Math.min(4, Math.max(1, Number(w)))}px ${st} ${c}`;
      }
    };

    styleSelect?.addEventListener("change", updatePreview);
    widthSelect?.addEventListener("change", updatePreview);
    colorSelect?.addEventListener("change", updatePreview);
    updatePreview();

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      const st = styleSelect?.value || "solid";
      if (st === "none") {
        cleanup({ enabled: false, style: "none" });
        return;
      }
      cleanup({
        enabled: true,
        style: st,
        width: Number(widthSelect?.value) || 2,
        color: colorSelect?.value || "#0f4c81"
      });
    });

    if (btnRemove) {
      btnRemove.addEventListener("click", () => cleanup({ enabled: false }));
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
      } else if (e.key === "Enter") {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
