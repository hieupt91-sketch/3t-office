/**
 * VN Writer — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

import { t } from "../../platform/i18n/i18n.js";

export const WRITER_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    labelKey: "writerRibbon.tab.home",
    groups: [
      {
        label: "Bảng nhớ tạm",
        labelKey: "writerRibbon.group.clipboard",
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
        labelKey: "writerRibbon.group.font",
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
                  { type: "button", commandId: "writer.text.subscript", iconOnly: true },
                  { type: "button", commandId: "writer.text.superscript", iconOnly: true },
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
        label: "Đoạn văn",
        labelKey: "writerRibbon.group.paragraph",
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
        label: "Kiểu dáng",
        labelKey: "writerRibbon.group.styles",
        items: [
          { type: "button", commandId: "writer.style.gallery", isLarge: true },
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
                  { value: "h3", label: "Tiêu đề 3 (Heading 3)" },
                  { value: "quote", label: "Trích dẫn (Quote)" },
                  { value: "emphasis", label: "Nhấn mạnh (Emphasis)" }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Chèn nhanh",
        labelKey: "writerRibbon.group.quickInsert",
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
    labelKey: "writerRibbon.tab.insert",
    groups: [
      {
        label: "Trang văn bản",
        labelKey: "writerRibbon.group.pages",
        items: [
          { type: "button", commandId: "writer.page.break", isLarge: true }
        ]
      },
      {
        label: "Bảng biểu & Hình",
        labelKey: "writerRibbon.group.tablesIllustrations",
        items: [
          { type: "button", commandId: "writer.table.insert", isLarge: true },
          { type: "button", commandId: "writer.image.insert", isLarge: true }
        ]
      },
      {
        label: "Đầu trang / Chân trang",
        labelKey: "writerRibbon.group.headerFooter",
        items: [
          { type: "button", commandId: "writer.header.insert", isLarge: true },
          { type: "button", commandId: "writer.footer.insert", isLarge: true }
        ]
      },
      {
        label: "Mục lục & Chú thích",
        labelKey: "writerRibbon.group.tocNotes",
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
    id: "design",
    label: "Thiết kế",
    labelKey: "writerRibbon.tab.design",
    groups: [
      {
        label: "Nền & Viền trang",
        labelKey: "writerRibbon.group.pageBackground",
        items: [
          { type: "button", commandId: "writer.page.watermark", isLarge: true },
          { type: "button", commandId: "writer.page.border", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "layout",
    label: "Bố cục",
    labelKey: "writerRibbon.tab.layout",
    groups: [
      {
        label: "Thiết lập trang",
        labelKey: "writerRibbon.group.pageSetup",
        items: [
          { type: "button", commandId: "writer.page.margins", isLarge: true },
          { type: "button", commandId: "writer.page.orientation", isLarge: true },
          { type: "button", commandId: "writer.page.size", isLarge: true },
          { type: "button", commandId: "writer.page.columns", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.page.columns1" },
              { type: "button", commandId: "writer.page.columns2" },
              { type: "button", commandId: "writer.page.columns3" }
            ]
          }
        ]
      },
      {
        label: "Nền & Viền trang",
        labelKey: "writerRibbon.group.pageBackground",
        items: [
          { type: "button", commandId: "writer.page.watermark", isLarge: true },
          { type: "button", commandId: "writer.page.border", isLarge: true }
        ]
      },
      {
        label: "In ấn",
        labelKey: "writerRibbon.group.print",
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
    labelKey: "writerRibbon.tab.references",
    groups: [
      {
        label: "Mục lục",
        labelKey: "writerRibbon.group.tableOfContents",
        items: [
          { type: "button", commandId: "writer.reference.tocInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.tocUpdate", isLarge: true }
        ]
      },
      {
        label: "Chú thích",
        labelKey: "writerRibbon.group.footnotes",
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
    labelKey: "writerRibbon.tab.mailings",
    groups: [
      {
        label: "Bắt đầu trộn",
        labelKey: "writerRibbon.group.startMerge",
        items: [
          { type: "button", commandId: "writer.mailMerge.open", isLarge: true }
        ]
      },
      {
        label: "Viết & Chèn trường",
        labelKey: "writerRibbon.group.writeInsert",
        items: [
          { type: "button", commandId: "writer.mailMerge.insertField", isLarge: true }
        ]
      },
      {
        label: "Xem trước kết quả",
        labelKey: "writerRibbon.group.previewResults",
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
        labelKey: "writerRibbon.group.finishMerge",
        items: [
          { type: "button", commandId: "writer.mailMerge.finish", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "review",
    label: "Đánh giá",
    labelKey: "writerRibbon.tab.review",
    groups: [
      {
        label: "Chính tả & Ngữ pháp",
        labelKey: "writerRibbon.group.proofread",
        items: [
          { type: "button", commandId: "ai.assistant.grammarCheck", isLarge: true }
        ]
      },
      {
        label: "Ghi chú",
        labelKey: "writerRibbon.group.comments",
        items: [
          { type: "button", commandId: "writer.comment.insert", isLarge: true }
        ]
      },
      {
        label: "Theo dõi thay đổi",
        labelKey: "writerRibbon.group.tracking",
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
    labelKey: "writerRibbon.tab.ai",
    groups: [
      {
        label: "Tính năng AI thuần Việt",
        labelKey: "writerRibbon.group.aiFeatures",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true },
          { type: "button", commandId: "ai.assistant.rewrite", isLarge: true }
        ]
      }
    ]
  }
];

/**
 * Cập nhật nhãn của tab và group trong Writer Ribbon theo ngôn ngữ hiện hành (i18n)
 * @param {Array} tabs
 * @returns {Array}
 */
export function applyLocaleToWriterRibbon(tabs = WRITER_RIBBON_TABS) {
  for (const tab of tabs) {
    if (tab.labelKey) {
      const translated = t(tab.labelKey);
      if (translated && translated !== tab.labelKey) {
        tab.label = translated;
      }
    }
    if (Array.isArray(tab.groups)) {
      for (const group of tab.groups) {
        if (group.labelKey) {
          const translated = t(group.labelKey);
          if (translated && translated !== group.labelKey) {
            group.label = translated;
          }
        }
      }
    }
  }
  return tabs;
}
