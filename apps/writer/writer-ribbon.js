/**
 * VN Writer — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
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
              { type: "button", commandId: "common.edit.copy" },
              { type: "button", commandId: "common.edit.formatPainter" }
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
                      { value: "1", label: "10 pt" },
                      { value: "2", label: "12 pt" },
                      { value: "3", label: "14 pt (NĐ 30)" },
                      { value: "4", label: "16 pt" },
                      { value: "5", label: "18 pt" },
                      { value: "6", label: "24 pt" }
                    ]
                  }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.text.bold", iconOnly: true },
                  { type: "button", commandId: "writer.text.italic", iconOnly: true },
                  { type: "button", commandId: "writer.text.underline", iconOnly: true },
                  { type: "button", commandId: "writer.text.strike", iconOnly: true },
                  { type: "button", commandId: "writer.text.clearFormat", iconOnly: true },
                  { type: "button", commandId: "writer.color.text", iconOnly: true },
                  { type: "button", commandId: "writer.color.highlight", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Kiểu dáng",
        items: [
          {
            type: "column",
            items: [
              {
                type: "select",
                commandId: "writer.style.apply",
                defaultValue: "p",
                options: [
                  { value: "p", label: "Văn bản thường (Normal)" },
                  { value: "h1", label: "Tiêu đề 1 (Heading 1)" },
                  { value: "h2", label: "Tiêu đề 2 (Heading 2)" },
                  { value: "h3", label: "Tiêu đề 3 (Heading 3)" }
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
                  { type: "button", commandId: "writer.list.bullet", iconOnly: true },
                  { type: "button", commandId: "writer.list.numbered", iconOnly: true },
                  { type: "button", commandId: "writer.para.indentDec", iconOnly: true },
                  { type: "button", commandId: "writer.para.indentInc", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.para.alignLeft", iconOnly: true },
                  { type: "button", commandId: "writer.para.alignCenter", iconOnly: true },
                  { type: "button", commandId: "writer.para.alignRight", iconOnly: true },
                  { type: "button", commandId: "writer.para.justify", iconOnly: true }
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
          { type: "button", commandId: "writer.image.insert", isLarge: true },
          { type: "button", commandId: "writer.page.break", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    groups: [
      {
        label: "Trang văn bản",
        items: [
          { type: "button", commandId: "writer.page.break", isLarge: true }
        ]
      },
      {
        label: "Bảng biểu & Hình",
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
      },
      {
        label: "Mục lục & Chú thích",
        items: [
          { type: "button", commandId: "writer.reference.tocInsert", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.reference.footnoteInsert" },
              { type: "button", commandId: "writer.reference.endnoteInsert" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "layout",
    label: "Bố cục",
    groups: [
      {
        label: "Thiết lập trang",
        items: [
          { type: "button", commandId: "writer.page.margins", isLarge: true },
          { type: "button", commandId: "writer.page.orientation", isLarge: true },
          { type: "button", commandId: "writer.page.size", isLarge: true }
        ]
      },
      {
        label: "In ấn",
        items: [
          { type: "button", commandId: "common.file.print", isLarge: true },
          { type: "button", commandId: "writer.file.printPreview", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "references",
    label: "Tham chiếu",
    groups: [
      {
        label: "Mục lục",
        items: [
          { type: "button", commandId: "writer.reference.tocInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.tocUpdate", isLarge: true }
        ]
      },
      {
        label: "Chú thích",
        items: [
          { type: "button", commandId: "writer.reference.footnoteInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.endnoteInsert", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "mailings",
    label: "Trộn thư",
    groups: [
      {
        label: "Bắt đầu trộn",
        items: [
          { type: "button", commandId: "writer.mailMerge.open", isLarge: true }
        ]
      },
      {
        label: "Viết & Chèn trường",
        items: [
          { type: "button", commandId: "writer.mailMerge.insertField", isLarge: true }
        ]
      },
      {
        label: "Xem trước kết quả",
        items: [
          { type: "button", commandId: "writer.mailMerge.preview", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.mailMerge.prevRecord" },
              { type: "button", commandId: "writer.mailMerge.nextRecord" }
            ]
          }
        ]
      },
      {
        label: "Hoàn tất",
        items: [
          { type: "button", commandId: "writer.mailMerge.finish", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "review",
    label: "Đánh giá",
    groups: [
      {
        label: "Chính tả & Ngữ pháp",
        items: [
          { type: "button", commandId: "ai.assistant.grammarCheck", isLarge: true }
        ]
      },
      {
        label: "Ghi chú",
        items: [
          { type: "button", commandId: "writer.comment.insert", isLarge: true }
        ]
      },
      {
        label: "Theo dõi thay đổi",
        items: [
          { type: "button", commandId: "writer.trackChanges.toggle", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.trackChanges.acceptAll" },
              { type: "button", commandId: "writer.trackChanges.rejectAll" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    groups: [
      {
        label: "Tính năng AI thuần Việt",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true },
          { type: "button", commandId: "ai.assistant.rewrite", isLarge: true }
        ]
      }
    ]
  }
];
