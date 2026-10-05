/**
 * 3T Office — VN Writer Page Setup Dialog (Hộp thoại Thiết lập trang)
 * Cấu hình Lề giấy (mm), Hướng giấy (Dọc/Ngang), Khổ giấy (A4/Letter/Legal)
 * Chuẩn Nghị định 30/2020/NĐ-CP về trình bày văn bản hành chính.
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

const MARGIN_PRESETS = [
  { id: "nd30", label: "Chuẩn NĐ 30/2020", top: 20, bottom: 20, left: 30, right: 15 },
  { id: "normal", label: "Tiêu chuẩn (2cm)", top: 20, bottom: 20, left: 20, right: 20 },
  { id: "narrow", label: "Hẹp (1.27cm)", top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  { id: "wide", label: "Rộng (2.54cm / 5cm)", top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 },
];

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
 * Hiển thị Hộp thoại Thiết lập trang (Page Setup)
 * @param {Object} [currentSetup] { margins: {top, bottom, left, right}, orientation: "portrait"|"landscape", paperSize: "A4"|"Letter"|"Legal" }
 * @returns {Promise<Object|null>}
 */
export async function showPageSetupDialog(currentSetup = null) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    const curMargins = currentSetup?.margins || { top: 20, bottom: 20, left: 30, right: 15 };
    const curOrientation = currentSetup?.orientation || "portrait";
    const curPaperSize = currentSetup?.paperSize || "A4";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-pagesetup-dialog" style="width: 520px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-ps-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-ps-dialog-title">Thiết lập trang</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:16px;">
          
          <!-- Presets Lề Nhanh -->
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--vno-text-secondary); display:block; margin-bottom:6px;">
              Mẫu lề giấy sẵn có
            </label>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
              ${MARGIN_PRESETS.map(p => `
                <button type="button" class="vno-btn vno-ps-preset-btn" data-preset="${p.id}" data-top="${p.top}" data-bottom="${p.bottom}" data-left="${p.left}" data-right="${p.right}" style="font-size:11px; padding:4px 6px; text-align:center;">
                  ${p.label}
                </button>
              `).join("")}
            </div>
          </div>

          <!-- Nhập Lề Giấy -->
          <div style="border-top:1px solid var(--vno-border-default, #e2e8f0); padding-top:12px;">
            <span style="font-size:13px; font-weight:700; color:var(--vno-text-primary); display:block; margin-bottom:8px;">Lề giấy (milimét)</span>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label for="vno-ps-margin-top" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Lề trên</label>
                <input type="number" id="vno-ps-margin-top" class="vno-dialog-input" min="5" max="100" step="1" value="${curMargins.top}" style="width:100%; box-sizing:border-box; font-size:13px; padding:6px 8px;" />
              </div>
              <div>
                <label for="vno-ps-margin-bottom" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Lề dưới</label>
                <input type="number" id="vno-ps-margin-bottom" class="vno-dialog-input" min="5" max="100" step="1" value="${curMargins.bottom}" style="width:100%; box-sizing:border-box; font-size:13px; padding:6px 8px;" />
              </div>
              <div>
                <label for="vno-ps-margin-left" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Lề trái</label>
                <input type="number" id="vno-ps-margin-left" class="vno-dialog-input" min="5" max="100" step="1" value="${curMargins.left}" style="width:100%; box-sizing:border-box; font-size:13px; padding:6px 8px;" />
              </div>
              <div>
                <label for="vno-ps-margin-right" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Lề phải</label>
                <input type="number" id="vno-ps-margin-right" class="vno-dialog-input" min="5" max="100" step="1" value="${curMargins.right}" style="width:100%; box-sizing:border-box; font-size:13px; padding:6px 8px;" />
              </div>
            </div>
          </div>

          <!-- Hướng & Khổ giấy -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border-top:1px solid var(--vno-border-default, #e2e8f0); padding-top:12px;">
            <div>
              <label for="vno-ps-orientation" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Hướng in</label>
              <select id="vno-ps-orientation" class="vno-select" style="width:100%; box-sizing:border-box; padding:6px;">
                <option value="portrait" ${curOrientation === "portrait" ? "selected" : ""}>Chiều dọc</option>
                <option value="landscape" ${curOrientation === "landscape" ? "selected" : ""}>Chiều ngang</option>
              </select>
            </div>
            <div>
              <label for="vno-ps-size" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Khổ giấy</label>
              <select id="vno-ps-size" class="vno-select" style="width:100%; box-sizing:border-box; padding:6px;">
                <option value="A4" ${curPaperSize === "A4" ? "selected" : ""}>A4 (210 x 297 mm)</option>
                <option value="Letter" ${curPaperSize === "Letter" ? "selected" : ""}>Letter (216 x 279 mm)</option>
                <option value="Legal" ${curPaperSize === "Legal" ? "selected" : ""}>Legal (216 x 356 mm)</option>
                <option value="A3" ${curPaperSize === "A3" ? "selected" : ""}>A3 (297 x 420 mm)</option>
                <option value="A5" ${curPaperSize === "A5" ? "selected" : ""}>A5 (148 x 210 mm)</option>
              </select>
            </div>
          </div>

          <!-- Thông báo lỗi nhập liệu -->
          <div id="vno-ps-error" role="alert" style="color:#b91c1c; font-size:12px; font-weight:600; min-height:16px;"></div>

        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Đồng ý</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const topInput = overlay.querySelector("#vno-ps-margin-top");
    const bottomInput = overlay.querySelector("#vno-ps-margin-bottom");
    const leftInput = overlay.querySelector("#vno-ps-margin-left");
    const rightInput = overlay.querySelector("#vno-ps-margin-right");
    const orientationSelect = overlay.querySelector("#vno-ps-orientation");
    const sizeSelect = overlay.querySelector("#vno-ps-size");
    const errorBox = overlay.querySelector("#vno-ps-error");

    topInput?.focus?.();

    // Preset click
    overlay.querySelectorAll(".vno-ps-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (topInput) topInput.value = btn.getAttribute("data-top");
        if (bottomInput) bottomInput.value = btn.getAttribute("data-bottom");
        if (leftInput) leftInput.value = btn.getAttribute("data-left");
        if (rightInput) rightInput.value = btn.getAttribute("data-right");
        validate();
      });
    });

    function validate() {
      const top = Number(topInput?.value);
      const bottom = Number(bottomInput?.value);
      const left = Number(leftInput?.value);
      const right = Number(rightInput?.value);

      if (isNaN(top) || isNaN(bottom) || isNaN(left) || isNaN(right)) {
        errorBox.textContent = "Vui lòng nhập đầy đủ số liệu lề giấy.";
        return false;
      }
      if (top < 5 || bottom < 5 || left < 5 || right < 5) {
        errorBox.textContent = "Lề giấy tối thiểu là 5mm để tránh mất nội dung khi in.";
        return false;
      }
      if (top > 100 || bottom > 100 || left > 100 || right > 100) {
        errorBox.textContent = "Lề giấy quá lớn (tối đa 100mm). Hãy điều chỉnh lại.";
        return false;
      }
      errorBox.textContent = "";
      return true;
    }

    [topInput, bottomInput, leftInput, rightInput].forEach(inp => {
      inp?.addEventListener("input", validate);
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
      if (!validate()) return;
      cleanup({
        margins: {
          top: Number(topInput.value),
          bottom: Number(bottomInput.value),
          left: Number(leftInput.value),
          right: Number(rightInput.value),
        },
        orientation: orientationSelect.value,
        paperSize: sizeSelect.value,
      });
    });

    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === "Enter" && e.target?.tagName === "INPUT") {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
