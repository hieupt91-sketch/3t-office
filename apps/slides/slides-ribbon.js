/**
 * VN Slides — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

export const SLIDES_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    labelKey: "slidesRibbon.tab.home",
    groups: [
      {
        label: "Trang chiếu",
        labelKey: "slidesRibbon.group.slides",
        items: [
          { type: "button", commandId: "slides.slide.new", isLarge: true },
          { type: "button", commandId: "slides.layout.apply", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "slides.slide.duplicate" },
              { type: "button", commandId: "slides.slide.delete" }
            ]
          }
        ]
      },
      {
        label: "Bảng nhớ tạm",
        labelKey: "slidesRibbon.group.clipboard",
        items: [
          { type: "button", commandId: "common.edit.paste", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.cut" },
              { type: "button", commandId: "common.edit.copy" },
              { type: "button", commandId: "slides.edit.formatPainter" }
            ]
          }
        ]
      },
      {
        id: "font",
        label: "Phông chữ",
        labelKey: "slidesRibbon.group.font",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  {
                    type: "select",
                    commandId: "slides.font.family",
                    defaultValue: "Calibri",
                    options: [
                      { value: "Calibri", label: "Calibri" },
                      { value: "Arial", label: "Arial" },
                      { value: "Times New Roman", label: "Times New Roman" },
                      { value: "Be Vietnam Pro", label: "Be Vietnam Pro" },
                      { value: "Roboto", label: "Roboto" }
                    ]
                  },
                  {
                    type: "select",
                    commandId: "slides.font.size",
                    defaultValue: "5",
                    options: [
                      { value: "1", label: "10" },
                      { value: "2", label: "13" },
                      { value: "3", label: "16" },
                      { value: "4", label: "18" },
                      { value: "5", label: "24" },
                      { value: "6", label: "32" },
                      { value: "7", label: "48" }
                    ]
                  },
                  { type: "button", commandId: "slides.font.grow", iconOnly: true },
                  { type: "button", commandId: "slides.font.shrink", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "slides.text.bold", iconOnly: true },
                  { type: "button", commandId: "slides.text.italic", iconOnly: true },
                  { type: "button", commandId: "slides.text.underline", iconOnly: true },
                  { type: "button", commandId: "slides.text.strike", iconOnly: true },
                  { type: "button", commandId: "slides.text.clearFormat", iconOnly: true },
                  { type: "button", commandId: "slides.color.text", iconOnly: true },
                  { type: "button", commandId: "slides.color.highlight", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "paragraph",
        label: "Đoạn văn",
        labelKey: "slidesRibbon.group.paragraph",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "slides.list.bullet", iconOnly: true },
                  { type: "button", commandId: "slides.list.numbered", iconOnly: true },
                  { type: "button", commandId: "slides.para.indentDec", iconOnly: true },
                  { type: "button", commandId: "slides.para.indentInc", iconOnly: true },
                  {
                    type: "select",
                    commandId: "slides.para.lineSpacing",
                    defaultValue: "1.0",
                    ariaLabel: "Giãn dòng",
                    options: [
                      { value: "1.0", label: "1.0" },
                      { value: "1.5", label: "1.5" },
                      { value: "2.0", label: "2.0" }
                    ]
                  }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "slides.para.alignLeft", iconOnly: true },
                  { type: "button", commandId: "slides.para.alignCenter", iconOnly: true },
                  { type: "button", commandId: "slides.para.alignRight", iconOnly: true },
                  { type: "button", commandId: "slides.para.justify", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        label: "Đối tượng vẽ",
        labelKey: "slidesRibbon.group.drawing",
        items: [
          { type: "button", commandId: "slides.text.insert", isLarge: true },
          { type: "button", commandId: "slides.shape.insert", isLarge: true },
          { type: "button", commandId: "slides.image.insert", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    labelKey: "slidesRibbon.tab.insert",
    groups: [
      {
        id: "tables",
        label: "Bảng",
        labelKey: "slidesRibbon.group.tables",
        items: [
          { type: "button", commandId: "slides.insert.table", isLarge: true }
        ]
      },
      {
        id: "images",
        label: "Hình ảnh",
        labelKey: "slidesRibbon.group.images",
        items: [
          { type: "button", commandId: "slides.image.insert", isLarge: true }
        ]
      },
      {
        id: "illustrations",
        label: "Minh họa",
        labelKey: "slidesRibbon.group.illustrations",
        items: [
          { type: "button", commandId: "slides.shape.insert", isLarge: true },
          { type: "button", commandId: "slides.diagram.insert", isLarge: true },
          { type: "button", commandId: "slides.insert.chart", label: "Biểu đồ", icon: "chart", isLarge: true }
        ]
      },
      {
        id: "comments",
        label: "Nhận xét",
        labelKey: "slidesRibbon.group.comments",
        items: [
          { type: "button", commandId: "slides.review.commentInsert", isLarge: true },
          { type: "button", commandId: "slides.review.commentPrevious" },
          { type: "button", commandId: "slides.review.commentNext" },
          { type: "button", commandId: "slides.review.commentDelete" },
          { type: "button", commandId: "slides.review.commentResolve" }
        ]
      },
      {
        id: "text",
        label: "Văn bản",
        labelKey: "slidesRibbon.group.text",
        items: [
          { type: "button", commandId: "slides.text.insert", isLarge: true },
          { type: "button", commandId: "slides.insert.wordart", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "slides.insert.headerFooter" },
              { type: "button", commandId: "slides.insert.dateTime" },
              { type: "button", commandId: "slides.insert.slideNumber" }
            ]
          }
        ]
      },
      {
        id: "symbols",
        label: "Ký hiệu",
        labelKey: "slidesRibbon.group.symbols",
        items: [
          { type: "button", commandId: "slides.insert.symbol", isLarge: true }
        ]
      },
      {
        label: "Đa phương tiện",
        labelKey: "slidesRibbon.group.media",
        items: [
          { type: "button", commandId: "slides.media.insertVideo", isLarge: true },
          { type: "button", commandId: "slides.media.insertAudio", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "design",
    label: "Thiết kế",
    labelKey: "slidesRibbon.tab.design",
    groups: [
      {
        label: "Chủ đề",
        labelKey: "slidesRibbon.group.themes",
        items: [
          { type: "button", commandId: "slides.design.themeGallery", isLarge: true }
        ]
      },
      {
        label: "Mẫu chủ đạo",
        labelKey: "slidesRibbon.group.master",
        items: [
          { type: "button", commandId: "slides.master.apply", isLarge: true }
        ]
      },
      {
        label: "Tùy chỉnh",
        labelKey: "slidesRibbon.group.customize",
        items: [
          { type: "button", commandId: "slides.design.slideSize", isLarge: true },
          { type: "button", commandId: "slides.design.formatBackground", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "transitions",
    label: "Chuyển tiếp",
    labelKey: "slidesRibbon.tab.transitions",
    groups: [
      {
        label: "Hiệu ứng chuyển trang",
        labelKey: "slidesRibbon.group.transitions",
        items: [
          { type: "button", commandId: "slides.transition.apply", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "animations",
    label: "Hoạt hình",
    labelKey: "slidesRibbon.tab.animations",
    groups: [
      {
        label: "Hiệu ứng đối tượng",
        labelKey: "slidesRibbon.group.animations",
        items: [
          { type: "button", commandId: "slides.animation.apply", isLarge: true },
          { type: "button", commandId: "slides.animation.pane", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "slideshow",
    label: "Trình chiếu",
    labelKey: "slidesRibbon.tab.slideshow",
    groups: [
      {
        label: "Khởi động chiếu",
        labelKey: "slidesRibbon.group.startSlideshow",
        items: [
          { type: "button", commandId: "slides.show.startFromBegin", isLarge: true },
          { type: "button", commandId: "slides.show.startFromCurrent", isLarge: true },
          { type: "button", commandId: "slides.show.presenterMode", isLarge: true }
        ]
      },
      {
        label: "Người thuyết trình",
        labelKey: "slidesRibbon.group.presenter",
        items: [
          { type: "button", commandId: "slides.notes.toggle", isLarge: true },
          { type: "button", commandId: "slides.show.rehearseTimings", isLarge: true }
        ]
      },
      {
        label: "Thiết lập",
        labelKey: "slidesRibbon.group.setup",
        items: [
          { type: "button", commandId: "slides.show.setupShow", isLarge: true },
          { type: "button", commandId: "slides.slide.toggleHidden", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "review",
    label: "Đánh giá",
    labelKey: "slidesRibbon.tab.review",
    groups: [
      {
        id: "proofing",
        label: "Chứng minh",
        labelKey: "slidesRibbon.group.proofing",
        items: [{ type: "button", commandId: "slides.review.spellCheck", isLarge: true }]
      },
      {
        label: "Nhận xét",
        labelKey: "slidesRibbon.group.comments",
        items: [
          { type: "button", commandId: "slides.review.commentInsert", isLarge: true },
          { type: "button", commandId: "slides.review.commentPrevious" },
          { type: "button", commandId: "slides.review.commentNext" },
          { type: "button", commandId: "slides.review.commentDelete" },
          { type: "button", commandId: "slides.review.commentResolve" }
        ]
      }
    ]
  },
  {
    id: "view",
    label: "Chế độ xem",
    labelKey: "slidesRibbon.tab.view",
    groups: [
      {
        id: "presentationViews",
        label: "Dạng xem bản trình chiếu",
        labelKey: "slidesRibbon.group.presentationViews",
        items: [
          { type: "button", commandId: "slides.view.normal", isLarge: true },
          { type: "button", commandId: "slides.view.slideSorter", isLarge: true },
          { type: "button", commandId: "slides.notes.toggle", isLarge: true },
          { type: "button", commandId: "slides.view.reading", isLarge: true }
        ]
      },
      {
        id: "show",
        label: "Hiển thị",
        labelKey: "slidesRibbon.group.show",
        items: [
          { type: "button", commandId: "slides.view.ruler" },
          { type: "button", commandId: "slides.view.gridlines" },
          { type: "button", commandId: "slides.view.guides" }
        ]
      },
      {
        id: "zoom",
        label: "Thu phóng",
        labelKey: "slidesRibbon.group.zoom",
        items: [
          { type: "button", commandId: "slides.view.zoomIn", isLarge: true },
          { type: "button", commandId: "slides.view.zoomOut" },
          { type: "button", commandId: "slides.view.zoomReset" },
          { type: "button", commandId: "slides.view.fitToWindow" }
        ]
      },
      {
        id: "window",
        label: "Cửa sổ",
        labelKey: "slidesRibbon.group.window",
        items: [
          { type: "button", commandId: "slides.view.newWindow", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "help",
    label: "Trợ giúp",
    labelKey: "slidesRibbon.tab.help",
    groups: [
      {
        label: "Trợ giúp",
        labelKey: "slidesRibbon.group.help",
        items: [
          { type: "button", commandId: "slides.help.open", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    labelKey: "slidesRibbon.tab.ai",
    groups: [
      {
        label: "Tạo nội dung thuyết trình",
        labelKey: "slidesRibbon.group.aiContent",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true }
        ]
      }
    ]
  }
];
