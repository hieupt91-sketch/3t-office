/**
 * VN Sheet — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

export const SHEET_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    groups: [
      {
        label: "Bảng nhớ tạm",
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
        items: [
          { type: "button", commandId: "sheet.format.currencyVND", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.format.percent" }
            ]
          }
        ]
      },
      {
        label: "Tính toán & Dữ liệu",
        items: [
          { type: "button", commandId: "sheet.formula.sum", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.data.sortAsc" },
              { type: "button", commandId: "sheet.data.sortDesc" },
              { type: "button", commandId: "sheet.data.filter" },
              { type: "button", commandId: "sheet.format.conditional" },
              { type: "button", commandId: "sheet.data.validation" },
              { type: "button", commandId: "sheet.view.freezePanes" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "formulas",
    label: "Công thức",
    groups: [
      {
        label: "Hàm tính toán",
        items: [
          { type: "button", commandId: "sheet.formula.sum", isLarge: true },
          { type: "button", commandId: "sheet.formula.average", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "data",
    label: "Dữ liệu",
    groups: [
      {
        label: "Sắp xếp & Lọc",
        items: [
          { type: "button", commandId: "sheet.data.sortAsc", isLarge: true },
          { type: "button", commandId: "sheet.data.sortDesc", isLarge: true },
          { type: "button", commandId: "sheet.data.filter", isLarge: true },
          { type: "button", commandId: "sheet.data.validation", isLarge: true },
          { type: "button", commandId: "sheet.data.pivotTable", isLarge: true },
          { type: "button", commandId: "sheet.data.pivotRefresh", isLarge: true },
          { type: "button", commandId: "sheet.format.conditional", isLarge: true },
          { type: "button", commandId: "sheet.view.freezePanes", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    groups: [
      {
        label: "Hàng, Cột & Đồ thị",
        items: [
          { type: "button", commandId: "sheet.row.insert", isLarge: true },
          { type: "button", commandId: "sheet.col.insert", isLarge: true },
          { type: "button", commandId: "sheet.chart.insert", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    groups: [
      {
        label: "Phân tích dữ liệu AI",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true }
        ]
      }
    ]
  }
];
