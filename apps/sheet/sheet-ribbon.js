/**
 * VN Sheet — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

export const SHEET_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    labelKey: "sheetRibbon.tab.home",
    groups: [
      {
        label: "Bảng nhớ tạm",
        labelKey: "sheetRibbon.group.clipboard",
        items: [
          { type: "button", commandId: "common.edit.paste", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.cut" },
              { type: "button", commandId: "common.edit.copy" }
            ]
          }
        ]
      },
      {
        label: "Phông chữ",
        labelKey: "sheetRibbon.group.font",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.bold", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.italic", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.underline", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.borders", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.fillColor", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.textColor", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Căn chỉnh & Trộn ô",
        labelKey: "sheetRibbon.group.alignment",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.alignLeft", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignCenter", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignRight", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.merge" }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Định dạng số",
        labelKey: "sheetRibbon.group.number",
        launcherCommandId: "sheet.format.cellsDialog",
        launcherTooltip: "Định dạng ô (Ctrl+1)",
        items: [
          { type: "button", commandId: "sheet.format.currencyVND", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.format.percent" },
              { type: "button", commandId: "sheet.format.cellsDialog" }
            ]
          }
        ]
      },
      {
        label: "Kiểu ô",
        labelKey: "sheetRibbon.group.styles",
        items: [
          { type: "button", commandId: "sheet.format.conditional", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.style.formatAsTable" },
              { type: "button", commandId: "sheet.style.cellStyles" }
            ]
          }
        ]
      },
      {
        label: "Ô",
        labelKey: "sheetRibbon.group.cells",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.row.insert" },
              { type: "button", commandId: "sheet.col.insert" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.row.delete" },
              { type: "button", commandId: "sheet.col.delete" }
            ]
          }
        ]
      },
      {
        label: "Chỉnh sửa",
        labelKey: "sheetRibbon.group.editing",
        items: [
          { type: "button", commandId: "sheet.formula.sum", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.edit.fillDown" },
              { type: "button", commandId: "sheet.edit.fillRight" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.edit.clearAll" },
              { type: "button", commandId: "sheet.edit.clearFormats" },
              { type: "button", commandId: "sheet.edit.clearContents" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.data.sortAsc" },
              { type: "button", commandId: "sheet.data.sortDesc" },
              { type: "button", commandId: "sheet.data.filter" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.find" },
              { type: "button", commandId: "common.edit.replace" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "formulas",
    label: "Công thức",
    labelKey: "sheetRibbon.tab.formulas",
    groups: [
      {
        label: "Hàm tính toán",
        labelKey: "sheetRibbon.group.functionLibrary",
        items: [
          { type: "button", commandId: "sheet.formula.sum", isLarge: true },
          { type: "button", commandId: "sheet.formula.average", isLarge: true }
        ]
      },
      {
        label: "Tên đã xác định",
        labelKey: "sheetRibbon.group.definedNames",
        items: [{ type: "button", commandId: "sheet.formula.nameManager", isLarge: true }]
      }
    ]
  },
  {
    id: "data",
    label: "Dữ liệu",
    labelKey: "sheetRibbon.tab.data",
    groups: [
      {
        label: "Sắp xếp & Lọc",
        labelKey: "sheetRibbon.group.sortFilter",
        items: [
          { type: "button", commandId: "sheet.data.sortAsc", isLarge: true },
          { type: "button", commandId: "sheet.data.sortDesc", isLarge: true },
          { type: "button", commandId: "sheet.data.filter", isLarge: true }
        ]
      },
      {
        label: "Công cụ dữ liệu",
        labelKey: "sheetRibbon.group.dataTools",
        items: [{ type: "button", commandId: "sheet.data.validation", isLarge: true }]
      },
      {
        label: "Bảng tổng hợp",
        labelKey: "sheetRibbon.group.pivotTable",
        items: [
          { type: "button", commandId: "sheet.data.pivotTable", isLarge: true },
          { type: "button", commandId: "sheet.data.pivotRefresh", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    labelKey: "sheetRibbon.tab.insert",
    groups: [
      {
        label: "Minh họa",
        labelKey: "sheetRibbon.group.illustrations",
        items: [{ type: "button", commandId: "sheet.insert.image", isLarge: true }]
      },
      {
        label: "Biểu đồ",
        labelKey: "sheetRibbon.group.charts",
        items: [{ type: "button", commandId: "sheet.chart.insert", isLarge: true }]
      }
    ]
  },
  {
    id: "pageLayout",
    label: "Bố trí trang",
    labelKey: "sheetRibbon.tab.pageLayout",
    groups: [
      {
        label: "Vùng in",
        labelKey: "sheetRibbon.group.printArea",
        items: [
          { type: "button", commandId: "sheet.page.setPrintArea", isLarge: true },
          { type: "button", commandId: "sheet.page.clearPrintArea" }
        ]
      },
      {
        label: "Ngắt trang",
        labelKey: "sheetRibbon.group.pageBreaks",
        items: [
          { type: "button", commandId: "sheet.page.insertPageBreak", isLarge: true },
          { type: "button", commandId: "sheet.page.removePageBreak" }
        ]
      }
    ]
  },
  {
    id: "review",
    label: "Xem xét",
    labelKey: "sheetRibbon.tab.review",
    groups: [{ label: "Ghi chú", labelKey: "sheetRibbon.group.comments", items: [{ type: "button", commandId: "sheet.review.commentInsert", isLarge: true }] }]
  },
  {
    id: "view",
    label: "Chế độ xem",
    labelKey: "sheetRibbon.tab.view",
    groups: [
      {
        label: "Hiển thị",
        labelKey: "sheetRibbon.group.show",
        items: [
          { type: "button", commandId: "sheet.view.gridlines", isLarge: true },
          { type: "button", commandId: "sheet.view.headings", isLarge: true }
        ]
      },
      {
        label: "Thu phóng",
        labelKey: "sheetRibbon.group.zoom",
        items: [
          { type: "button", commandId: "sheet.view.zoomIn", isLarge: true },
          { type: "button", commandId: "sheet.view.zoomOut" },
          { type: "button", commandId: "sheet.view.zoomReset" }
        ]
      },
      {
        label: "Cửa sổ",
        labelKey: "sheetRibbon.group.window",
        items: [{ type: "button", commandId: "sheet.view.freezePanes", isLarge: true }]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    labelKey: "sheetRibbon.tab.ai",
    groups: [
      {
        label: "Phân tích dữ liệu AI",
        labelKey: "sheetRibbon.group.aiAnalysis",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true }
        ]
      }
    ]
  }
];
