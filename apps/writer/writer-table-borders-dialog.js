/**
 * 3T Doc — Hộp thoại «Kiểu viền…» của bảng: chọn kiểu nét (liền, đứt, chấm, đôi), độ dày (pt), màu và vùng áp dụng.
 * Trả về { type, style, widthPt, color } hoặc null khi hủy.
 */

export const TABLE_BORDER_STYLES = [
  { id: "solid", label: "Nét liền" },
  { id: "dashed", label: "Nét đứt" },
  { id: "dotted", label: "Nét chấm" },
  { id: "double", label: "Nét đôi" }
];

export const TABLE_BORDER_WIDTHS_PT = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6];

export const TABLE_BORDER_TYPES = [
  { id: "all", label: "Tất cả đường viền" },
  { id: "outside", label: "Viền ngoài" },
  { id: "inside", label: "Viền trong" },
  { id: "none", label: "Không viền" }
];

/** Kiểu CSS cho một đường viền; nét đôi cần ít nhất 1,5 pt để thấy hai nét. */
export function tableBorderCss({ style = "solid", widthPt = 0.75, color = "#94a3b8" } = {}) {
  const safeStyle = TABLE_BORDER_STYLES.some(item => item.id === style) ? style : "solid";
  const width = Math.max(safeStyle === "double" ? 1.5 : 0.25, Number(widthPt) || 0.75);
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(String(color)) ? color : "#94a3b8";
  return `${Math.round((width / 0.75) * 100) / 100}px ${safeStyle} ${safeColor}`;
}

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

export function showTableBordersDialog(current = {}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  return new Promise(resolve => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const fieldStyle = "font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#334155;";
    const inputStyle = "width:100%; box-sizing:border-box; font-size:13px; padding:6px 10px; border:1px solid #cbd5e1; border-radius:4px;";
    const style = current.style || "solid";
    const width = Number(current.widthPt) || 0.75;
    const color = /^#[0-9a-fA-F]{6}$/.test(String(current.color)) ? current.color : "#94a3b8";
    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width:440px;max-width:calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-tblb-title">
        <div class="vno-dialog-header">
          <span id="vno-tblb-title">Kiểu viền bảng</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:grid;gap:12px;">
          <div>
            <label for="vno-tblb-type" style="${fieldStyle}">Áp dụng cho</label>
            <select id="vno-tblb-type" class="vno-dialog-input" style="${inputStyle}">
              ${TABLE_BORDER_TYPES.map(item => `<option value="${item.id}" ${item.id === (current.type || "all") ? "selected" : ""}>${item.label}</option>`).join("")}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:10px;">
            <div>
              <label for="vno-tblb-style" style="${fieldStyle}">Kiểu nét</label>
              <select id="vno-tblb-style" class="vno-dialog-input" style="${inputStyle}">
                ${TABLE_BORDER_STYLES.map(item => `<option value="${item.id}" ${item.id === style ? "selected" : ""}>${item.label}</option>`).join("")}
              </select>
            </div>
            <div>
              <label for="vno-tblb-width" style="${fieldStyle}">Độ dày (pt)</label>
              <select id="vno-tblb-width" class="vno-dialog-input" style="${inputStyle}">
                ${TABLE_BORDER_WIDTHS_PT.map(item => `<option value="${item}" ${item === width ? "selected" : ""}>${String(item).replace(".", ",")}</option>`).join("")}
              </select>
            </div>
            <div>
              <label for="vno-tblb-color" style="${fieldStyle}">Màu</label>
              <input id="vno-tblb-color" type="color" value="${color}" style="width:100%;height:34px;padding:2px;border:1px solid #cbd5e1;border-radius:4px;" />
            </div>
          </div>
          <div id="vno-tblb-preview" aria-hidden="true" style="height:34px;background:#fff;border-radius:2px;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const field = id => overlay.querySelector(id);
    const read = () => ({
      type: field("#vno-tblb-type").value,
      style: field("#vno-tblb-style").value,
      widthPt: Number(field("#vno-tblb-width").value),
      color: field("#vno-tblb-color").value
    });
    const paintPreview = () => { field("#vno-tblb-preview").style.border = tableBorderCss(read()); };
    ["#vno-tblb-style", "#vno-tblb-width", "#vno-tblb-color"].forEach(id => {
      field(id).addEventListener("input", paintPreview);
      field(id).addEventListener("change", paintPreview);
    });
    paintPreview();
    const cleanup = result => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Enter" && event.target?.tagName !== "BUTTON") { event.preventDefault(); cleanup(read()); }
      else if (event.key === "Tab") trapFocus(box, event);
    };
    document.addEventListener("keydown", onKeyDown);
    field(".vno-dialog-ok-btn").addEventListener("click", () => cleanup(read()));
    field(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    field(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(null); });
    field("#vno-tblb-style").focus();
  });
}
