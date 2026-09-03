/**
 * VN Writer — Ribbon Structure Definition
 * Tuân thủ quy định 04-apps/writer/STANDARD.md & 03-ui-ux/UI-UX-STANDARD.md
 */

export const WRITER_RIBBON_TABS = [
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
                  {
                    type: "select",
                    commandId: "writer.font.family",
                    defaultValue: "Times New Roman",
                    options: [
                      { value: "Times New Roman", label: "Times New Roman" },
                      { value: "Be Vietnam Pro", label: "Be Vietnam Pro" },
                      { value: "Arial", label: "Arial" },
                      { value: "Calibri", label: "Calibri" },
                      { value: "Roboto", label: "Roboto" }
                    ]
                  },
                  {
                    type: "select",
                    commandId: "writer.font.size",
                    defaultValue: "3",
                    options: [
                      { value: "1", label: "10" },
                      { value: "2", label: "12" },
                      { value: "3", label: "14 (Chuẩn NĐ 30)" },
                      { value: "4", label: "16" },
                      { value: "5", label: "18" },
                      { value: "6", label: "24" }
                    ]
                  }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.text.bold" },
                  { type: "button", commandId: "writer.text.italic" },
                  { type: "button", commandId: "writer.text.underline" },
                  { type: "button", commandId: "writer.text.strike" },
                  { type: "button", commandId: "writer.text.clearFormat" }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Đoạn văn",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.list.bullet" },
                  { type: "button", commandId: "writer.list.numbered" },
                  { type: "button", commandId: "writer.para.indentDec" },
                  { type: "button", commandId: "writer.para.indentInc" }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.para.alignLeft" },
                  { type: "button", commandId: "writer.para.alignCenter" },
                  { type: "button", commandId: "writer.para.alignRight" },
                  { type: "button", commandId: "writer.para.justify" }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Chèn nhanh",
        items: [
          { type: "button", commandId: "writer.table.insert", isLarge: true },
          { type: "button", commandId: "writer.image.insert", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    groups: [
      {
        label: "Trang",
        items: [
          { type: "button", commandId: "writer.page.break", isLarge: true }
        ]
      },
      {
        label: "Bảng & Hình",
        items: [
          { type: "button", commandId: "writer.table.insert", isLarge: true },
          { type: "button", commandId: "writer.image.insert", isLarge: true }
        ]
      },
      {
        label: "Đầu trang / Chân trang",
        items: [
          { type: "button", commandId: "writer.header.insert", isLarge: true },
          { type: "button", commandId: "writer.footer.insert", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "layout",
    label: "Bố trí",
    groups: [
      {
        label: "Thiết lập trang",
        items: [
          { type: "button", commandId: "writer.page.margins", isLarge: true },
          { type: "button", commandId: "writer.page.orientation", isLarge: true },
          { type: "button", commandId: "writer.page.size", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "review",
    label: "Đánh giá",
    groups: [
      {
        label: "Tiếng Việt & Ngữ pháp",
        items: [
          { type: "button", commandId: "ai.assistant.grammarCheck", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    groups: [
      {
        label: "Tính năng AI",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true },
          { type: "button", commandId: "ai.assistant.rewrite", isLarge: true }
        ]
      }
    ]
  }
];
