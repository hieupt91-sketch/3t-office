/**
 * VN Sheet — Ribbon Structure Definition
 * Tuân thủ quy định 04-apps/sheet/STANDARD.md & 03-ui-ux/UI-UX-STANDARD.md
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
                  { type: "button", commandId: "sheet.cell.bold" },
                  { type: "button", commandId: "sheet.cell.italic" },
                  { type: "button", commandId: "sheet.cell.underline" }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Căn chỉnh",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.alignLeft" },
                  { type: "button", commandId: "sheet.cell.alignCenter" },
                  { type: "button", commandId: "sheet.cell.alignRight" }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.merge" },
                  { type: "button", commandId: "sheet.cell.wrapText" }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Số & Tiền tệ",
        items: [
          { type: "button", commandId: "sheet.format.currencyVND", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.format.percent" },
              { type: "button", commandId: "sheet.format.comma" }
            ]
          }
        ]
      },
      {
        label: "Tính toán nhanh",
        items: [
          { type: "button", commandId: "sheet.formula.sum", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "formulas",
    label: "Công thức",
    groups: [
      {
        label: "Hàm thường dùng",
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
          { type: "button", commandId: "sheet.data.filter", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    groups: [
      {
        label: "Hàng & Cột",
        items: [
          { type: "button", commandId: "sheet.row.insert", isLarge: true },
          { type: "button", commandId: "sheet.col.insert", isLarge: true }
        ]
      },
      {
        label: "Đồ thị",
        items: [
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
