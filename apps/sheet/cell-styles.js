/**
 * VN Sheet — Cell Styles & Table Styles Gallery
 * Bộ kiểu ô chuẩn Microsoft Excel / LibreOffice Calc
 */

import { t } from "../../platform/i18n/i18n.js";

function trapFocus(element, event) {
  if (event.key !== "Tab") return;
  const focusables = element.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables || focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

export const CELL_STYLE_PRESETS = [
  {
    id: "normal",
    nameKey: "sheetStyles.normal",
    defaultName: "Bình thường (Normal)",
    style: {
      backgroundColor: "",
      color: "#0f172a",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      border: "",
      borderTop: "",
      borderBottom: "",
      fontSize: "13px"
    },
    previewText: "Normal (Mặc định)",
    description: "Định dạng ô mặc định, xóa mọi màu và hiệu ứng"
  },
  {
    id: "good",
    nameKey: "sheetStyles.good",
    defaultName: "Tốt (Good)",
    style: {
      backgroundColor: "#c6efce",
      color: "#006100",
      fontWeight: "normal",
      border: "1px solid #86efac"
    },
    previewText: "Tốt / Đạt (100%)",
    description: "Nền xanh lá nhạt, chữ xanh lá đậm — dùng cho chỉ số tốt"
  },
  {
    id: "bad",
    nameKey: "sheetStyles.bad",
    defaultName: "Kém / Xấu (Bad)",
    style: {
      backgroundColor: "#ffc7ce",
      color: "#9c0006",
      fontWeight: "normal",
      border: "1px solid #fca5a5"
    },
    previewText: "Cảnh báo / Kém",
    description: "Nền đỏ nhạt, chữ đỏ sẫm — dùng cho số liệu cảnh báo, sụt giảm"
  },
  {
    id: "neutral",
    nameKey: "sheetStyles.neutral",
    defaultName: "Trung tính (Neutral)",
    style: {
      backgroundColor: "#ffeb9c",
      color: "#9c6500",
      fontWeight: "normal",
      border: "1px solid #fde047"
    },
    previewText: "Chờ xử lý / Đang xem xét",
    description: "Nền vàng kem nhạt, chữ nâu vàng đậm — dùng cho số liệu trung tính"
  },
  {
    id: "heading1",
    nameKey: "sheetStyles.heading1",
    defaultName: "Tiêu đề 1 (Heading 1)",
    style: {
      color: "#1e3a8a",
      fontWeight: "bold",
      fontSize: "16px",
      borderBottom: "2px solid #1e3a8a",
      backgroundColor: ""
    },
    previewText: "Tiêu đề lớn cấp 1",
    description: "Chữ lớn 16px in đậm màu xanh đậm, có gạch chân dày"
  },
  {
    id: "heading2",
    nameKey: "sheetStyles.heading2",
    defaultName: "Tiêu đề 2 (Heading 2)",
    style: {
      color: "#1e3a8a",
      fontWeight: "bold",
      fontSize: "14px",
      borderBottom: "1px solid #1e3a8a",
      backgroundColor: ""
    },
    previewText: "Tiêu đề mục cấp 2",
    description: "Chữ vừa 14px in đậm có viền dưới"
  },
  {
    id: "input",
    nameKey: "sheetStyles.input",
    defaultName: "Ô nhập liệu (Input)",
    style: {
      backgroundColor: "#fff2cc",
      color: "#3f3f76",
      fontWeight: "normal",
      border: "1px solid #94a3b8"
    },
    previewText: "Nhập dữ liệu vào đây",
    description: "Nền vàng kem viền xám mỏng — đánh dấu ô để người dùng nhập"
  },
  {
    id: "currency",
    nameKey: "sheetStyles.currency",
    defaultName: "Tiền tệ (Currency)",
    style: {
      fontWeight: "normal",
      textAlign: "right",
      backgroundColor: "#f8fafc"
    },
    numberFormat: {
      category: "currency",
      decimals: 0,
      currencySymbol: "₫",
      symbolPosition: "after"
    },
    previewText: "1.250.000 ₫",
    description: "Định dạng số tiền chuẩn VNĐ kèm nền nhẹ"
  },
  {
    id: "total",
    nameKey: "sheetStyles.total",
    defaultName: "Tổng cộng (Total)",
    style: {
      fontWeight: "bold",
      color: "#0f172a",
      borderTop: "1px solid #0f172a",
      borderBottom: "3px double #0f172a",
      backgroundColor: ""
    },
    previewText: "Tổng cộng: 15.800.000",
    description: "Chữ đậm, viền trên nét đơn, viền dưới nét đôi kế toán"
  },
  {
    id: "accent",
    nameKey: "sheetStyles.accent",
    defaultName: "Điểm nhấn (Accent)",
    style: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
      fontWeight: "bold",
      border: "1px solid #93c5fd"
    },
    previewText: "Nổi bật quan trọng",
    description: "Nền xanh lam nhạt, chữ xanh dương đậm nổi bật"
  }
];

export const TABLE_STYLE_PRESETS = [
  {
    id: "tableBlue",
    nameKey: "sheetTableStyles.blue",
    defaultName: "Bảng Xanh Lam (Blue)",
    primaryColor: "#2563eb",
    headerStyle: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #1d4ed8"
    },
    evenRowStyle: {
      backgroundColor: "#f0f7ff",
      color: "#0f172a",
      border: "1px solid #cbd5e1"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #cbd5e1"
    }
  },
  {
    id: "tableGreen",
    nameKey: "sheetTableStyles.green",
    defaultName: "Bảng Xanh Lá (Green)",
    primaryColor: "#16a34a",
    headerStyle: {
      backgroundColor: "#16a34a",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #15803d"
    },
    evenRowStyle: {
      backgroundColor: "#f0fdf4",
      color: "#0f172a",
      border: "1px solid #bbf7d0"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #bbf7d0"
    }
  },
  {
    id: "tableDark",
    nameKey: "sheetTableStyles.dark",
    defaultName: "Bảng Xám Đậm (Dark Slate)",
    primaryColor: "#334155",
    headerStyle: {
      backgroundColor: "#334155",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #1e293b"
    },
    evenRowStyle: {
      backgroundColor: "#f8fafc",
      color: "#0f172a",
      border: "1px solid #e2e8f0"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #e2e8f0"
    }
  },
  {
    id: "tableOrange",
    nameKey: "sheetTableStyles.orange",
    defaultName: "Bảng Cam Ấm (Warm Orange)",
    primaryColor: "#ea580c",
    headerStyle: {
      backgroundColor: "#ea580c",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #c2410c"
    },
    evenRowStyle: {
      backgroundColor: "#fff7ed",
      color: "#0f172a",
      border: "1px solid #fed7aa"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #fed7aa"
    }
  },
  {
    id: "tablePurple",
    nameKey: "sheetTableStyles.purple",
    defaultName: "Bảng Tím Hiện Đại (Purple)",
    primaryColor: "#7c3aed",
    headerStyle: {
      backgroundColor: "#7c3aed",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #6d28d9"
    },
    evenRowStyle: {
      backgroundColor: "#f5f3ff",
      color: "#0f172a",
      border: "1px solid #ddd6fe"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #ddd6fe"
    }
  }
];

export function showCellStylesDialog(gridController) {
  if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);

  return new Promise(resolve => {
    const previousActive = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-cell-styles-dialog";

    const titleText = (typeof t === "function" && t("sheetDialogs.cellStylesTitle") !== "sheetDialogs.cellStylesTitle")
      ? t("sheetDialogs.cellStylesTitle")
      : "Thư viện kiểu ô (Cell Styles)";
    const hintText = (typeof t === "function" && t("sheetDialogs.cellStylesHint") !== "sheetDialogs.cellStylesHint")
      ? t("sheetDialogs.cellStylesHint")
      : "Chọn một kiểu để áp dụng ngay lập tức cho các ô đang chọn:";

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 720px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-cell-styles-title">
        <div class="vno-dialog-header">
          <span id="vno-cell-styles-title" style="font-weight: 600; font-size: 15px; color: #0f172a;">${titleText}</span>
          <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="padding: 16px; max-height: 70vh; overflow-y: auto;">
          <p style="font-size: 13px; color: #64748b; margin: 0 0 14px;">${hintText}</p>
          <div class="vno-cell-styles-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
            ${CELL_STYLE_PRESETS.map(preset => {
              const name = (typeof t === "function" && t(preset.nameKey) !== preset.nameKey) ? t(preset.nameKey) : preset.defaultName;
              const s = preset.style || {};
              const cssInline = [
                s.backgroundColor ? `background-color:${s.backgroundColor}` : "background-color:#ffffff",
                s.color ? `color:${s.color}` : "color:#0f172a",
                s.fontWeight ? `font-weight:${s.fontWeight}` : "",
                s.fontSize ? `font-size:${s.fontSize}` : "font-size:13px",
                s.border ? `border:${s.border}` : "border:1px solid #e2e8f0",
                s.borderTop ? `border-top:${s.borderTop}` : "",
                s.borderBottom ? `border-bottom:${s.borderBottom}` : ""
              ].filter(Boolean).join("; ");

              return `
                <button type="button" class="vno-cell-style-card" data-style-id="${preset.id}">
                  <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">${name}</div>
                  <div style="padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; ${cssInline}">
                    ${preset.previewText}
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; line-height: 1.3;">${preset.description}</div>
                </button>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let closed = false;
    const close = (result = false) => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (previousActive && typeof previousActive.focus === "function") {
        previousActive.focus();
      } else if (gridController?.container?.focus) {
        gridController.container.focus();
      }
      resolve(result);
    };

    const onKey = event => {
      if (event.key === "Escape") close(false);
      trapFocus(overlay, event);
    };
    document.addEventListener("keydown", onKey);

    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => close(false));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(false);
    });

    overlay.querySelectorAll("[data-style-id]").forEach(card => {
      card.addEventListener("click", () => {
        const styleId = card.dataset.styleId;
        const preset = CELL_STYLE_PRESETS.find(p => p.id === styleId);
        if (preset && gridController?.applyCellStyle) {
          gridController.applyCellStyle(preset);
        }
        close(true);
      });
    });

    const firstCard = overlay.querySelector("[data-style-id]");
    firstCard?.focus();
  });
}

export function showFormatAsTableDialog(gridController) {
  if (typeof document === "undefined" || !document.createElement) return Promise.resolve(false);

  return new Promise(resolve => {
    const previousActive = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-format-table-dialog";

    const titleText = (typeof t === "function" && t("sheetDialogs.formatAsTableTitle") !== "sheetDialogs.formatAsTableTitle")
      ? t("sheetDialogs.formatAsTableTitle")
      : "Định dạng theo bảng (Format as Table)";
    const hintText = (typeof t === "function" && t("sheetDialogs.formatAsTableHint") !== "sheetDialogs.formatAsTableHint")
      ? t("sheetDialogs.formatAsTableHint")
      : "Chọn kiểu bảng để áp dụng màu tiêu đề và hàng xen kẽ (banded rows):";

    const rangeLabel = gridController?.getSelectedRangeLabel ? gridController.getSelectedRangeLabel() : "A1:D10";

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 650px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-table-style-title">
        <div class="vno-dialog-header">
          <span id="vno-table-style-title" style="font-weight: 600; font-size: 15px; color: #0f172a;">${titleText}</span>
          <button type="button" class="vno-btn vno-dialog-close-btn" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="padding: 16px; max-height: 70vh; overflow-y: auto;">
          <div style="font-size: 12px; color: #475569; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            Vùng áp dụng bảng: <strong>${rangeLabel}</strong>
          </div>
          <p style="font-size: 13px; color: #64748b; margin: 0 0 14px;">${hintText}</p>
          <div class="vno-table-styles-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
            ${TABLE_STYLE_PRESETS.map(preset => {
              const name = (typeof t === "function" && t(preset.nameKey) !== preset.nameKey) ? t(preset.nameKey) : preset.defaultName;
              return `
                <button type="button" class="vno-table-style-card" data-table-id="${preset.id}">
                  <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">${name}</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <thead>
                      <tr style="background: ${preset.headerStyle.backgroundColor}; color: ${preset.headerStyle.color}; font-weight: bold;">
                        <th style="padding: 4px 6px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Cột 1</th>
                        <th style="padding: 4px 6px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Cột 2</th>
                        <th style="padding: 4px 6px; border: 1px solid rgba(255,255,255,0.3); text-align: right;">Cột 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="background: ${preset.evenRowStyle.backgroundColor}; color: ${preset.evenRowStyle.color};">
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1;">Dữ liệu A</td>
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1;">Mục 1</td>
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: right;">100</td>
                      </tr>
                      <tr style="background: ${preset.oddRowStyle.backgroundColor}; color: ${preset.oddRowStyle.color};">
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1;">Dữ liệu B</td>
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1;">Mục 2</td>
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: right;">250</td>
                      </tr>
                      <tr style="background: ${preset.evenRowStyle.backgroundColor}; color: ${preset.evenRowStyle.color};">
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1;">Dữ liệu C</td>
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1;">Mục 3</td>
                        <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: right;">400</td>
                      </tr>
                    </tbody>
                  </table>
                </button>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let closed = false;
    const close = (result = false) => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (previousActive && typeof previousActive.focus === "function") {
        previousActive.focus();
      } else if (gridController?.container?.focus) {
        gridController.container.focus();
      }
      resolve(result);
    };

    const onKey = event => {
      if (event.key === "Escape") close(false);
      trapFocus(overlay, event);
    };
    document.addEventListener("keydown", onKey);

    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => close(false));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(false);
    });

    overlay.querySelectorAll("[data-table-id]").forEach(card => {
      card.addEventListener("click", () => {
        const tableId = card.dataset.tableId;
        const preset = TABLE_STYLE_PRESETS.find(p => p.id === tableId);
        if (preset && gridController?.formatAsTable) {
          gridController.formatAsTable(preset);
        }
        close(true);
      });
    });

    const firstCard = overlay.querySelector("[data-table-id]");
    firstCard?.focus();
  });
}
