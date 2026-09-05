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
        id: "clipboard",
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
        id: "font",
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
                  },
                  { type: "button", commandId: "writer.font.grow", iconOnly: true },
                  { type: "button", commandId: "writer.font.shrink", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.text.bold", iconOnly: true },
                  { type: "button", commandId: "writer.text.italic", iconOnly: true },
                  { type: "button", commandId: "writer.text.underline", iconOnly: true },
                  { type: "button", commandId: "writer.text.subscript", iconOnly: true },
                  { type: "button", commandId: "writer.text.superscript", iconOnly: true },
                  { type: "button", commandId: "writer.text.strike", iconOnly: true },
                  { type: "button", commandId: "writer.text.changeCase", iconOnly: true },
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
        id: "paragraph",
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
                  { type: "button", commandId: "writer.para.sort", iconOnly: true },
                  { type: "button", commandId: "writer.para.showFormattingMarks", iconOnly: true },
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
                  { type: "button", commandId: "writer.para.justify", iconOnly: true },
                  {
                    type: "dropdown",
                    id: "writer.para.lineSpacing",
                    label: "Giãn dòng",
                    icon: "lineSpacing",
                    items: [
                      { commandId: "writer.para.spacing1" },
                      { commandId: "writer.para.spacing15" },
                      { commandId: "writer.para.spacing2" }
                    ]
                  },
                  { type: "button", commandId: "writer.para.shading", iconOnly: true },
                  {
                    type: "select",
                    commandId: "writer.para.borders",
                    defaultValue: "bottom",
                    ariaLabel: "Viền đoạn văn",
                    options: [
                      { value: "bottom", label: "Viền dưới" },
                      { value: "all", label: "Tất cả viền" },
                      { value: "none", label: "Không viền" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Kiểu dáng",
        labelKey: "writerRibbon.group.styles",
        // CHỈ MỘT cách hiển thị cho việc chọn kiểu đoạn văn (đúng chuẩn Word Home tab:
        // dải Quick Styles + nút mở thư viện đầy đủ). Trước đây có THÊM một dropdown
        // <select> writer.style.apply song song với dải thẻ Quick Style tự chèn bởi
        // `_mountStyleGalleryRibbonStrip()` — cùng 1 việc (chọn Normal/Heading 1/2/3)
        // bị hiển thị trùng lặp 2 kiểu khác nhau cạnh nhau (lỗi UI thật, người dùng
        // phát hiện 04/09/2026). `writer.style.apply` vẫn còn là command thật (dùng nội
        // bộ/lệnh gọi trực tiếp), chỉ không còn render dropdown thừa trên ribbon nữa.
        items: [
          { type: "button", commandId: "writer.style.gallery", isLarge: true }
        ]
      },
      {
        id: "editing",
        label: "Chỉnh sửa",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.find" },
              { type: "button", commandId: "common.edit.replace" },
              {
                type: "dropdown",
                id: "writer.edit.select",
                label: "Chọn",
                icon: "search",
                items: [
                  { commandId: "common.edit.selectAll" }
                ]
              }
            ]
          }
        ]
      }
      // Nhóm "Chèn nhanh" (Table/Image/Page Break) đã gỡ khỏi Home: cùng lệnh đã có
      // trên tab Chèn, vi phạm one-feature-one-display và làm Home thêm dày.
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
        label: "Bảng biểu",
        labelKey: "writerRibbon.group.tables",
        items: [
          { type: "button", commandId: "writer.table.insert", isLarge: true }
        ]
      },
      {
        id: "illustrations",
        label: "Minh họa",
        labelKey: "writerRibbon.group.illustrations",
        items: [
          { type: "button", commandId: "writer.image.insert", isLarge: true },
          { type: "button", commandId: "writer.shape.insert", isLarge: true },
          { type: "button", commandId: "writer.diagram.insert", isLarge: true },
          { type: "button", commandId: "writer.chart.insert", isLarge: true }
        ]
      },
      {
        id: "links",
        label: "Liên kết",
        labelKey: "writerRibbon.group.links",
        items: [
          { type: "button", commandId: "common.edit.hyperlink", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.insert.bookmark" },
              { type: "button", commandId: "writer.insert.crossReference" }
            ]
          }
        ]
      },
      {
        id: "comments",
        label: "Ghi chú",
        labelKey: "writerRibbon.group.comments",
        items: [
          { type: "button", commandId: "writer.comment.insert", isLarge: true }
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
        id: "text",
        label: "Văn bản",
        labelKey: "writerRibbon.group.text",
        items: [
          { type: "button", commandId: "writer.insert.textbox", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.format.dropCap" },
              { type: "button", commandId: "writer.insert.dateTime" }
            ]
          }
        ]
      },
      {
        id: "symbols",
        label: "Ký hiệu",
        labelKey: "writerRibbon.group.symbols",
        items: [
          { type: "button", commandId: "writer.insert.equation", isLarge: true },
          { type: "button", commandId: "writer.insert.symbol", isLarge: true }
        ]
      }
      // Mục lục / chú thích chỉ hiển thị trên tab Tham chiếu (canonical Word).
      // Trước đây nhóm này còn nằm trên tab Chèn, làm tràn ngang ở 1600px và
      // trùng lệnh với tab Tham chiếu (one-feature-one-display).
    ]
  },
  {
    id: "design",
    label: "Thiết kế",
    labelKey: "writerRibbon.tab.design",
    groups: [
      {
        id: "documentFormatting",
        label: "Định dạng tài liệu",
        labelKey: "writerRibbon.group.documentFormatting",
        items: [
          { type: "button", commandId: "writer.design.themeGallery", isLarge: true }
        ]
      },
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
    id: "pictureFormat",
    label: "Định dạng Hình ảnh",
    groups: []
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
      },
      {
        label: "Trích dẫn & Thư mục tài liệu",
        labelKey: "writerRibbon.group.citationsBibliography",
        items: [
          { type: "column", items: [
            { type: "row", items: [{ type: "select", commandId: "writer.reference.citationStyle", defaultValue: "apa", ariaLabel: "Kiểu trích dẫn", options: [{ value: "apa", label: "APA" }, { value: "mla", label: "MLA" }] }] },
            { type: "row", items: [{ type: "button", commandId: "writer.reference.sourcesManage" }] }
          ] },
          { type: "button", commandId: "writer.reference.citationInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.bibliographyInsert", isLarge: true }
        ]
      },
      {
        label: "Chú thích ảnh",
        labelKey: "writerRibbon.group.captions",
        items: [
          { type: "button", commandId: "writer.reference.captionInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.tofInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.tofUpdate", isLarge: true }
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
          { type: "button", commandId: "ai.assistant.grammarCheck", isLarge: true },
          { type: "button", commandId: "writer.review.wordCount", isLarge: true }
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
              { type: "button", commandId: "writer.trackChanges.previous" },
              { type: "button", commandId: "writer.trackChanges.next" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.trackChanges.acceptOne" },
              { type: "button", commandId: "writer.trackChanges.rejectOne" }
            ]
          },
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
    id: "view",
    label: "Chế độ xem",
    labelKey: "writerRibbon.tab.view",
    groups: [
      {
        label: "Dạng xem",
        labelKey: "writerRibbon.group.views",
        items: [
          { type: "button", commandId: "writer.view.readMode", isLarge: true },
          { type: "button", commandId: "writer.view.printLayout", isLarge: true },
          { type: "button", commandId: "writer.view.webLayout", isLarge: true }
        ]
      },
      {
        id: "show",
        label: "Hiển thị",
        labelKey: "writerRibbon.group.show",
        items: [
          { type: "button", commandId: "writer.view.ruler" },
          { type: "button", commandId: "writer.view.gridlines" }
        ]
      },
      {
        label: "Thu phóng",
        labelKey: "writerRibbon.group.zoom",
        items: [
          { type: "button", commandId: "writer.view.zoomIn", isLarge: true },
          { type: "column", items: [
            { type: "button", commandId: "writer.view.zoomOut" },
            { type: "button", commandId: "writer.view.zoomReset" }
          ] },
          { type: "column", items: [
            { type: "button", commandId: "writer.view.zoom100" },
            { type: "button", commandId: "writer.view.pageWidth" }
          ] }
        ]
      },
      {
        label: "Cửa sổ",
        labelKey: "writerRibbon.group.window",
        items: [{ type: "button", commandId: "writer.view.newWindow", isLarge: true }]
      }
    ]
  },
  {
    id: "help",
    label: "Trợ giúp",
    labelKey: "writerRibbon.tab.help",
    groups: [
      {
        label: "Trợ giúp",
        labelKey: "writerRibbon.group.help",
        items: [
          { type: "button", commandId: "writer.help.open", isLarge: true }
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
