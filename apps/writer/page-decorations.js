/**
 * VN Office — VN Writer Page Decorations (Hình mờ & Viền trang)
 * Hộp thoại và tiện ích cấu hình Watermark & Page Border chuẩn Word
 */

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

/**
 * Hiển thị Hộp thoại Cấu hình Hình mờ (Watermark)
 * @param {Object} [currentWatermark]
 * @returns {Promise<{text:string, color:string, opacity:number, angle:number, fontSize:number}|string|null>}
 */
export async function showWatermarkDialog(currentWatermark = null) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const activeText = currentWatermark?.text || "DỰ THẢO";
    const activeColor = currentWatermark?.color || "#dc2626";
    const activeOpacity = currentWatermark?.opacity ?? 0.2;
    const activeAngle = currentWatermark?.angle ?? 45;
    const hasWatermark = Boolean(currentWatermark && currentWatermark.text);

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-watermark-dialog" style="width: 440px;">
        <div class="vno-dialog-header">
          <span>Hình mờ (Watermark)</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:#334155; display:block; margin-bottom:4px;">
              Gợi ý văn bản hành chính Việt Nam:
            </label>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${WATERMARK_SUGGESTIONS.map(s => `
                <button type="button" class="vno-btn vno-watermark-chip" data-text="${s}" style="font-size:11px; padding:3px 8px;">
                  ${s}
                </button>
              `).join("")}
            </div>
          </div>

          <div>
            <label for="vno-wm-text" style="font-size:13px; font-weight:600; display:block; margin-bottom:4px;">
              Nội dung hình mờ:
            </label>
            <input type="text" id="vno-wm-text" class="vno-dialog-input" value="${activeText}" placeholder="Nhập chữ hình mờ (VD: DỰ THẢO, MẬT)..." style="width:100%; box-sizing:border-box; font-size:14px; font-weight:bold; padding:8px 10px;" />
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div>
              <label for="vno-wm-color" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Màu sắc:</label>
              <select id="vno-wm-color" class="vno-select" style="width:100%;">
                ${WATERMARK_COLORS.map(c => `
                  <option value="${c.value}" ${c.value === activeColor ? "selected" : ""}>${c.label}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="vno-wm-angle" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Góc xoay:</label>
              <select id="vno-wm-angle" class="vno-select" style="width:100%;">
                <option value="45" ${activeAngle === 45 ? "selected" : ""}>Chéo 45° (Chuẩn)</option>
                <option value="-45" ${activeAngle === -45 ? "selected" : ""}>Chéo −45°</option>
                <option value="0" ${activeAngle === 0 ? "selected" : ""}>Nằm ngang 0°</option>
              </select>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label for="vno-wm-opacity" style="font-size:12px; font-weight:600;">Độ mờ (Opacity):</label>
              <span id="vno-wm-opacity-val" style="font-size:12px; font-weight:bold; color:#0f4c81;">${Math.round(activeOpacity * 100)}%</span>
            </div>
            <input type="range" id="vno-wm-opacity" min="0.05" max="0.6" step="0.05" value="${activeOpacity}" style="width:100%;" />
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${hasWatermark ? `<button type="button" class="vno-btn vno-btn-danger vno-wm-btn-remove" style="color:#dc2626; border-color:#fca5a5;">Xóa hình mờ</button>` : `<span></span>`}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy bỏ</button>
            <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

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
      if (opacityLabel) opacityLabel.textContent = `${Math.round(Number(opacityInput.value) * 100)}%`;
    });

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
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
      } else if (e.key === "Enter" && e.target === txtInput) {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
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
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const isEnabled = Boolean(currentBorder && currentBorder.enabled);
    const activeStyle = currentBorder?.style || "solid";
    const activeWidth = currentBorder?.width ?? 2;
    const activeColor = currentBorder?.color || "#0f4c81";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-page-border-dialog" style="width: 460px;">
        <div class="vno-dialog-header">
          <span>Viền trang (Page Border)</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div>
                <label for="vno-border-style" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Kiểu đường viền:</label>
                <select id="vno-border-style" class="vno-select" style="width:100%;">
                  ${PAGE_BORDER_STYLES.map(s => `
                    <option value="${s.value}" ${s.value === activeStyle ? "selected" : ""}>${s.label}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label for="vno-border-width" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Độ dày viền:</label>
                <select id="vno-border-width" class="vno-select" style="width:100%;">
                  ${PAGE_BORDER_WIDTHS.map(w => `
                    <option value="${w.value}" ${Number(w.value) === Number(activeWidth) ? "selected" : ""}>${w.label}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label for="vno-border-color" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Màu sắc viền:</label>
                <select id="vno-border-color" class="vno-select" style="width:100%;">
                  ${PAGE_BORDER_COLORS.map(c => `
                    <option value="${c.value}" ${c.value === activeColor ? "selected" : ""}>${c.label}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <!-- Khung xem trước trực quan (Live Preview) -->
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <span style="font-size:11px; color:#64748b; margin-bottom:6px; font-weight:600;">Xem trước viền trang</span>
              <div id="vno-border-preview-sheet" style="width:110px; height:140px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.15); border-radius:2px; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; box-sizing:border-box;">
                <div id="vno-border-preview-inner" style="position:absolute; inset:6px; pointer-events:none; border: 2px solid #0f4c81; box-sizing:border-box;"></div>
                <div style="font-size:8px; color:#94a3b8; line-height:1.4; text-align:center;">
                  Nội dung<br>văn bản<br>mẫu
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${isEnabled ? `<button type="button" class="vno-btn vno-btn-danger vno-border-btn-remove" style="color:#dc2626; border-color:#fca5a5;">Xóa viền trang</button>` : `<span></span>`}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy bỏ</button>
            <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

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
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
