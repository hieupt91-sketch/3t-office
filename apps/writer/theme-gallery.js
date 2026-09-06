/**
 * VN Office — VN Writer Theme Gallery (Thư viện Kiểu & Chủ đề tài liệu)
 * Cấp độ tài liệu: Đổi font-family toàn văn bản + màu heading + khoảng cách đoạn
 * Chuẩn hóa Microsoft Word Document Formatting / Themes
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

export const DOCUMENT_THEMES = [
  {
    id: "office",
    nameVi: "Tiêu chuẩn (Office)",
    nameEn: "Office Standard",
    fontFamily: "'Times New Roman', Times, serif",
    bodyColor: "#1e293b",
    h1Color: "#0f4c81",
    h2Color: "#1d4ed8",
    h3Color: "#2563eb",
    paraSpacing: "8pt",
    lineHeight: "1.5",
    accentColor: "#0f4c81",
    previewSample: "Tài liệu Doanh nghiệp",
    description: "Phông chữ Times New Roman, tiêu đề xanh Office, dãn dòng 1.5 cân đối"
  },
  {
    id: "administrative",
    nameVi: "Hành chính Việt Nam (NĐ 30)",
    nameEn: "Administrative (Decree 30)",
    fontFamily: "'Times New Roman', Times, serif",
    bodyColor: "#000000",
    h1Color: "#000000",
    h2Color: "#000000",
    h3Color: "#000000",
    paraSpacing: "6pt",
    lineHeight: "1.5",
    accentColor: "#c01e17",
    previewSample: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    description: "Quy chuẩn thể thức văn bản hành chính Việt Nam, chữ đen sắc nét 14pt"
  },
  {
    id: "modern",
    nameVi: "Hiện đại (Modern)",
    nameEn: "Modern Tech",
    fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif",
    bodyColor: "#334155",
    h1Color: "#0284c7",
    h2Color: "#0369a1",
    h3Color: "#075985",
    paraSpacing: "12pt",
    lineHeight: "1.6",
    accentColor: "#0284c7",
    previewSample: "Báo cáo Kỹ thuật & Công nghệ",
    description: "Phông Be Vietnam Pro không chân thời thượng, tiêu đề xanh biển dịu mắt"
  },
  {
    id: "elegant",
    nameVi: "Trang nhã (Elegant)",
    nameEn: "Elegant Amber",
    fontFamily: "Georgia, 'Times New Roman', serif",
    bodyColor: "#27272a",
    h1Color: "#854d0e",
    h2Color: "#a16207",
    h3Color: "#ca8a04",
    paraSpacing: "12pt",
    lineHeight: "1.65",
    accentColor: "#854d0e",
    previewSample: "Ấn bản Nghiên cứu & Học thuật",
    description: "Phông Georgia cổ điển, tiêu đề nâu hổ phách sang trọng, dãn dòng thoáng"
  },
  {
    id: "minimal",
    nameVi: "Tối giản (Minimalist)",
    nameEn: "Minimalist Slate",
    fontFamily: "Arial, Helvetica, sans-serif",
    bodyColor: "#18181b",
    h1Color: "#3f3f46",
    h2Color: "#52525b",
    h3Color: "#71717a",
    paraSpacing: "8pt",
    lineHeight: "1.45",
    accentColor: "#3f3f46",
    previewSample: "Bản ghi nhớ Tối giản",
    description: "Phông Arial trong sáng, tiêu đề xám than trung tính, tập trung nội dung"
  },
  {
    id: "emerald",
    nameVi: "Sáng tạo (Emerald)",
    nameEn: "Creative Emerald",
    fontFamily: "Calibri, Candara, sans-serif",
    bodyColor: "#1e293b",
    h1Color: "#0f766e",
    h2Color: "#0d9488",
    h3Color: "#14b8a6",
    paraSpacing: "10pt",
    lineHeight: "1.55",
    accentColor: "#0f766e",
    previewSample: "Đề xuất Dự án Xanh",
    description: "Phông Calibri hiện đại, tiêu đề xanh ngọc lục bảo tươi sáng"
  }
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
 * Hiển thị Hộp thoại Thư viện Chủ đề Tài liệu (Document Themes & Formatting)
 * @param {string} [currentThemeId]
 * @returns {Promise<string|null>} Trả về theme.id nếu chọn, null nếu hủy
 */
export async function showThemeGalleryDialog(currentThemeId = "office") {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    let selectedThemeId = currentThemeId || "office";

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 680px; max-height: 85vh; display: flex; flex-direction: column;" role="dialog" aria-modal="true" aria-labelledby="vno-theme-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-theme-dialog-title">${isEn ? "Document Themes & Formatting" : "Thư viện Kiểu & Chủ đề tài liệu"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="overflow-y:auto; display:flex; flex-direction:column; gap:14px; padding:16px;">
          <p style="margin:0; font-size:13px; color:var(--vno-text-muted);">
            ${isEn
              ? "Choose a document formatting style set (updates font family, heading palette, and spacing across the entire document):"
              : "Chọn bộ kiểu định dạng tài liệu (thay đổi đồng bộ phông chữ, bảng màu tiêu đề và dãn dòng trên toàn bộ tài liệu):"}
          </p>

          <div class="vno-theme-grid" role="radiogroup" aria-labelledby="vno-theme-dialog-title" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
            ${DOCUMENT_THEMES.map(theme => {
              const isSel = theme.id === selectedThemeId;
              const name = isEn ? theme.nameEn : theme.nameVi;
              return `
                <button type="button" role="radio" aria-checked="${isSel}" aria-label="${name}" class="vno-theme-card ${isSel ? "is-selected" : ""}" data-theme-id="${theme.id}">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:13px; color:${theme.h1Color}; font-family:${theme.fontFamily};">${name}</strong>
                    <div style="display:flex; gap:3px;" aria-hidden="true">
                      <span style="width:10px; height:10px; border-radius:50%; background:${theme.h1Color};"></span>
                      <span style="width:10px; height:10px; border-radius:50%; background:${theme.h2Color};"></span>
                      <span style="width:10px; height:10px; border-radius:50%; background:${theme.h3Color};"></span>
                    </div>
                  </div>
                  <div style="font-size:11px; font-style:italic; color:var(--vno-text-muted); font-family:${theme.fontFamily};">${theme.previewSample}</div>
                  <p style="margin:0; font-size:11px; color:var(--vno-text-secondary); line-height:1.4;">${theme.description}</p>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px; padding:12px 16px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Apply Theme" : "Áp dụng kiểu"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const cards = overlay.querySelectorAll(".vno-theme-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        cards.forEach(c => {
          c.classList.remove("is-selected");
          c.setAttribute("aria-checked", "false");
        });
        card.classList.add("is-selected");
        card.setAttribute("aria-checked", "true");
        selectedThemeId = card.getAttribute("data-theme-id");
      });
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
      cleanup(selectedThemeId);
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
      } else if (e.key === "Enter") {
        e.preventDefault();
        cleanup(selectedThemeId);
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
