/**
 * VN Writer — Table Styles Gallery
 * Thư viện hơn 30 kiểu dáng bảng biểu (Table Styles) chuẩn Word 2016.
 * Hỗ trợ áp dụng màu sắc, viền, hàng tiêu đề, hàng sọc xen kẽ và xuất OOXML w:tblStyle.
 */

import { t } from "../../platform/i18n/i18n.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export const TABLE_STYLE_PRESETS = [
  // 1. Plain Tables (Bảng thường)
  { id: "TableGrid", name: "Bảng Lưới (Table Grid)", category: "plain", headerBg: "#ffffff", headerColor: "#0f172a", headerBold: true, bandedBg: "#ffffff", borderColor: "#000000", borderWidth: "1px", borderStyle: "solid" },
  { id: "PlainTable1", name: "Bảng Thường 1 (Không viền)", category: "plain", headerBg: "#ffffff", headerColor: "#0f172a", headerBold: true, bandedBg: "#ffffff", borderColor: "transparent", borderWidth: "0px", borderStyle: "none" },
  { id: "PlainTable2", name: "Bảng Thường 2 (Gạch chân tiêu đề)", category: "plain", headerBg: "#ffffff", headerColor: "#0f172a", headerBold: true, bandedBg: "#ffffff", borderColor: "#cbd5e1", borderWidth: "1px", borderStyle: "solid", headerBorderBottom: "2px solid #0f172a" },
  { id: "PlainTable3", name: "Bảng Thường 3 (Khung ngoài)", category: "plain", headerBg: "#ffffff", headerColor: "#0f172a", headerBold: true, bandedBg: "#ffffff", borderColor: "#94a3b8", borderWidth: "1px", borderStyle: "solid" },
  { id: "PlainTable4", name: "Bảng Thường 4 (Viền hàng)", category: "plain", headerBg: "#f8fafc", headerColor: "#0f172a", headerBold: true, bandedBg: "#ffffff", borderColor: "#cbd5e1", borderWidth: "1px", borderStyle: "solid" },
  { id: "PlainTable5", name: "Bảng Thường 5 (Đường lưới mờ)", category: "plain", headerBg: "#f1f5f9", headerColor: "#0f172a", headerBold: true, bandedBg: "#ffffff", borderColor: "#e2e8f0", borderWidth: "1px", borderStyle: "solid" },

  // 2. Grid Tables - Light (Bảng dạng lưới - Nhẹ)
  { id: "GridTable1Light-Accent1", name: "Lưới 1 Nhẹ - Xanh dương", category: "grid", headerBg: "#3b82f6", headerColor: "#ffffff", headerBold: true, bandedBg: "#eff6ff", borderColor: "#bfdbfe", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable1Light-Accent2", name: "Lưới 1 Nhẹ - Cam", category: "grid", headerBg: "#f97316", headerColor: "#ffffff", headerBold: true, bandedBg: "#fff7ed", borderColor: "#fed7aa", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable1Light-Accent3", name: "Lưới 1 Nhẹ - Xám", category: "grid", headerBg: "#64748b", headerColor: "#ffffff", headerBold: true, bandedBg: "#f8fafc", borderColor: "#cbd5e1", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable1Light-Accent4", name: "Lưới 1 Nhẹ - Vàng", category: "grid", headerBg: "#eab308", headerColor: "#ffffff", headerBold: true, bandedBg: "#fefce8", borderColor: "#fef08a", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable1Light-Accent5", name: "Lưới 1 Nhẹ - Xanh lá", category: "grid", headerBg: "#22c55e", headerColor: "#ffffff", headerBold: true, bandedBg: "#f0fdf4", borderColor: "#bbf7d0", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable1Light-Accent6", name: "Lưới 1 Nhẹ - Tím", category: "grid", headerBg: "#a855f7", headerColor: "#ffffff", headerBold: true, bandedBg: "#faf5ff", borderColor: "#e9d5ff", borderWidth: "1px", borderStyle: "solid" },

  { id: "GridTable2Light-Accent1", name: "Lưới 2 Nhẹ - Xanh dương", category: "grid", headerBg: "#dbeafe", headerColor: "#1e40af", headerBold: true, bandedBg: "#eff6ff", borderColor: "#93c5fd", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable2Light-Accent2", name: "Lưới 2 Nhẹ - Cam", category: "grid", headerBg: "#ffedd5", headerColor: "#9a3412", headerBold: true, bandedBg: "#fff7ed", borderColor: "#fdba74", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable2Light-Accent5", name: "Lưới 2 Nhẹ - Xanh lá", category: "grid", headerBg: "#dcfce7", headerColor: "#166534", headerBold: true, bandedBg: "#f0fdf4", borderColor: "#86efac", borderWidth: "1px", borderStyle: "solid" },

  // 3. Grid Tables - Medium (Bảng dạng lưới - Vừa)
  { id: "GridTable4-Accent1", name: "Lưới 4 Vừa - Xanh dương", category: "grid", headerBg: "#1d4ed8", headerColor: "#ffffff", headerBold: true, bandedBg: "#dbeafe", borderColor: "#60a5fa", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable4-Accent2", name: "Lưới 4 Vừa - Cam", category: "grid", headerBg: "#c2410c", headerColor: "#ffffff", headerBold: true, bandedBg: "#ffedd5", borderColor: "#fb923c", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable4-Accent3", name: "Lưới 4 Vừa - Xám", category: "grid", headerBg: "#334155", headerColor: "#ffffff", headerBold: true, bandedBg: "#e2e8f0", borderColor: "#94a3b8", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable4-Accent4", name: "Lưới 4 Vừa - Vàng", category: "grid", headerBg: "#a16207", headerColor: "#ffffff", headerBold: true, bandedBg: "#fef9c3", borderColor: "#facc15", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable4-Accent5", name: "Lưới 4 Vừa - Xanh lá", category: "grid", headerBg: "#15803d", headerColor: "#ffffff", headerBold: true, bandedBg: "#dcfce7", borderColor: "#4ade80", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable4-Accent6", name: "Lưới 4 Vừa - Tím", category: "grid", headerBg: "#7e22ce", headerColor: "#ffffff", headerBold: true, bandedBg: "#f3e8ff", borderColor: "#c084fc", borderWidth: "1px", borderStyle: "solid" },

  { id: "GridTable5Dark-Accent1", name: "Lưới 5 Tối - Xanh dương", category: "grid", headerBg: "#1e3a8a", headerColor: "#ffffff", headerBold: true, bandedBg: "#bfdbfe", borderColor: "#3b82f6", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable5Dark-Accent2", name: "Lưới 5 Tối - Đỏ cam", category: "grid", headerBg: "#7c2d12", headerColor: "#ffffff", headerBold: true, bandedBg: "#fed7aa", borderColor: "#ea580c", borderWidth: "1px", borderStyle: "solid" },
  { id: "GridTable5Dark-Accent5", name: "Lưới 5 Tối - Xanh thẫm", category: "grid", headerBg: "#14532d", headerColor: "#ffffff", headerBold: true, bandedBg: "#bbf7d0", borderColor: "#16a34a", borderWidth: "1px", borderStyle: "solid" },

  // 4. List Tables (Bảng danh sách)
  { id: "ListTable1Light-Accent1", name: "Danh sách 1 Nhẹ - Xanh", category: "list", headerBg: "#2563eb", headerColor: "#ffffff", headerBold: true, bandedBg: "#eff6ff", borderColor: "transparent", borderWidth: "0px", borderStyle: "none", headerBorderBottom: "2px solid #1d4ed8" },
  { id: "ListTable1Light-Accent2", name: "Danh sách 1 Nhẹ - Cam", category: "list", headerBg: "#ea580c", headerColor: "#ffffff", headerBold: true, bandedBg: "#fff7ed", borderColor: "transparent", borderWidth: "0px", borderStyle: "none", headerBorderBottom: "2px solid #c2410c" },
  { id: "ListTable1Light-Accent5", name: "Danh sách 1 Nhẹ - Xanh lá", category: "list", headerBg: "#16a34a", headerColor: "#ffffff", headerBold: true, bandedBg: "#f0fdf4", borderColor: "transparent", borderWidth: "0px", borderStyle: "none", headerBorderBottom: "2px solid #15803d" },

  { id: "ListTable3Medium-Accent1", name: "Danh sách 3 Vừa - Xanh", category: "list", headerBg: "#1e40af", headerColor: "#ffffff", headerBold: true, bandedBg: "#dbeafe", borderColor: "#bfdbfe", borderWidth: "1px", borderStyle: "solid" },
  { id: "ListTable3Medium-Accent2", name: "Danh sách 3 Vừa - Cam", category: "list", headerBg: "#9a3412", headerColor: "#ffffff", headerBold: true, bandedBg: "#ffedd5", borderColor: "#fed7aa", borderWidth: "1px", borderStyle: "solid" },
  { id: "ListTable3Medium-Accent5", name: "Danh sách 3 Vừa - Xanh lá", category: "list", headerBg: "#166534", headerColor: "#ffffff", headerBold: true, bandedBg: "#dcfce7", borderColor: "#bbf7d0", borderWidth: "1px", borderStyle: "solid" },

  { id: "ListTable6Dark-Accent1", name: "Danh sách 6 Tối - Xanh", category: "list", headerBg: "#0f172a", headerColor: "#ffffff", headerBold: true, bandedBg: "#f1f5f9", borderColor: "#334155", borderWidth: "1px", borderStyle: "solid" },
  { id: "ListTable6Dark-Accent2", name: "Danh sách 6 Tối - Nâu đỏ", category: "list", headerBg: "#451a03", headerColor: "#ffffff", headerBold: true, bandedBg: "#fef3c7", borderColor: "#78350f", borderWidth: "1px", borderStyle: "solid" },
  { id: "ListTable6Dark-Accent5", name: "Danh sách 6 Tối - Xanh rêu", category: "list", headerBg: "#064e3b", headerColor: "#ffffff", headerBold: true, bandedBg: "#ecfdf5", borderColor: "#065f46", borderWidth: "1px", borderStyle: "solid" }
];

export const TABLE_STYLES = TABLE_STYLE_PRESETS;

export function findTableStyle(styleId) {
  if (!styleId) return TABLE_STYLE_PRESETS[0];
  const normalized = String(styleId).toLowerCase().replace(/[^a-z0-9]/g, "");
  return TABLE_STYLE_PRESETS.find(p => p.id.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized) || TABLE_STYLE_PRESETS[0];
}

export function applyTableStyle(table, styleId, options = {}) {
  if (!table) return false;
  const preset = findTableStyle(styleId);

  table.dataset.vnoTableStyle = preset.id;
  table.classList.add("vno-table-styled");

  const headerRow = options.headerRow !== undefined ? !!options.headerRow : (table.dataset.vnoHeaderRow !== "false");
  const bandedRows = options.bandedRows !== undefined ? !!options.bandedRows : (table.dataset.vnoBandedRows !== "false");
  const firstCol = !!options.firstCol;
  const lastCol = !!options.lastCol;

  table.dataset.vnoHeaderRow = String(headerRow);
  table.dataset.vnoBandedRows = String(bandedRows);

  // Set table border styles
  table.style.borderCollapse = "collapse";
  table.style.borderColor = preset.borderColor;
  table.style.borderWidth = preset.borderWidth;
  table.style.borderStyle = preset.borderStyle;

  const rows = Array.from(table.rows || []);
  rows.forEach((tr, rIdx) => {
    const isFirstRow = rIdx === 0;
    const cells = Array.from(tr.cells || []);

    cells.forEach((cell, cIdx) => {
      // Cell borders
      cell.style.borderColor = preset.borderColor;
      cell.style.borderWidth = preset.borderWidth;
      cell.style.borderStyle = preset.borderStyle;

      if (isFirstRow && headerRow) {
        cell.style.backgroundColor = preset.headerBg;
        cell.style.color = preset.headerColor;
        cell.style.fontWeight = preset.headerBold ? "bold" : "normal";
        if (preset.headerBorderBottom) {
          cell.style.borderBottom = preset.headerBorderBottom;
        }
      } else {
        const isBanded = bandedRows && (rIdx % 2 === 1);
        if (isBanded) {
          cell.style.backgroundColor = preset.bandedBg;
        } else {
          cell.style.backgroundColor = "#ffffff";
        }
        cell.style.color = "#0f172a";
        cell.style.fontWeight = (firstCol && cIdx === 0) || (lastCol && cIdx === cells.length - 1) ? "bold" : "normal";
      }
    });
  });

  return true;
}

export function showTableStylesGallery(anchorElement, targetTable, adapter = null) {
  if (typeof document === "undefined") return;

  // Remove existing gallery popup if open
  const existing = document.querySelector("#vno-table-styles-gallery-popup");
  if (existing) {
    existing.remove();
    return;
  }

  const popup = document.createElement("div");
  popup.id = "vno-table-styles-gallery-popup";
  popup.className = "vno-table-styles-gallery-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", t("writerDialogs.tableStyles.title", "Thư viện kiểu bảng"));

  // Categories
  const categories = [
    { key: "plain", label: t("writerDialogs.tableStyles.plainTables", "Bảng thường") },
    { key: "grid", label: t("writerDialogs.tableStyles.gridTables", "Bảng dạng lưới") },
    { key: "list", label: t("writerDialogs.tableStyles.listTables", "Bảng danh sách") }
  ];

  for (const cat of categories) {
    const group = document.createElement("div");
    group.className = "vno-table-style-category";

    const catTitle = document.createElement("h4");
    catTitle.textContent = cat.label;
    group.appendChild(catTitle);

    const grid = document.createElement("div");
    grid.className = "vno-table-style-grid";

    const presets = TABLE_STYLE_PRESETS.filter(p => p.category === cat.key);
    for (const preset of presets) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "vno-table-style-card";
      card.dataset.styleId = preset.id;
      card.title = preset.name;

      // Render mini-preview table
      const preview = document.createElement("div");
      preview.className = "vno-table-style-preview";
      preview.innerHTML = `
        <div style="background:${preset.headerBg}; height:8px; border-bottom:1px solid ${preset.borderColor};"></div>
        <div style="background:#ffffff; height:6px;"></div>
        <div style="background:${preset.bandedBg}; height:6px;"></div>
      `;
      card.appendChild(preview);

      const label = document.createElement("span");
      label.className = "vno-table-style-label";
      label.textContent = preset.name.split("(")[0].trim();
      card.appendChild(label);

      card.addEventListener("click", () => {
        if (targetTable) {
          applyTableStyle(targetTable, preset.id);
          if (adapter) {
            adapter.isDirty = true;
            adapter._recordTableUndo?.("table-style", targetTable);
            adapter.recordSnapshot?.("writer.table.stylesGallery");
          }
        }
        popup.remove();
      });

      grid.appendChild(card);
    }

    group.appendChild(grid);
    popup.appendChild(group);
  }

  // Positioning relative to anchor or center
  if (anchorElement && anchorElement.getBoundingClientRect) {
    const rect = anchorElement.getBoundingClientRect();
    popup.style.position = "absolute";
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popup.style.left = `${Math.max(10, rect.left + window.scrollX - 100)}px`;
    popup.style.zIndex = "1000";
  }

  document.body.appendChild(popup);

  // Close when clicking outside or pressing Escape
  const dismiss = (e) => {
    if (!popup.contains(e.target) && e.target !== anchorElement) {
      popup.remove();
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", onKey);
    }
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      popup.remove();
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", onKey);
    }
  };
  setTimeout(() => {
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", onKey);
  }, 10);
}
