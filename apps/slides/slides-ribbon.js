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
              { type: "button", commandId: "common.edit.copy" }
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
          { type: "button", commandId: "slides.diagram.insert", isLarge: true }
        ]
      },
      {
        id: "comments",
        label: "Nhận xét",
        labelKey: "slidesRibbon.group.comments",
        items: [
          { type: "button", commandId: "slides.review.commentInsert", isLarge: true }
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
          { type: "button", commandId: "slides.design.slideSize", isLarge: true }
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
          { type: "button", commandId: "slides.animation.apply", isLarge: true }
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
      }
    ]
  },
  {
    id: "review",
    label: "Đánh giá",
    labelKey: "slidesRibbon.tab.review",
    groups: [
      {
        label: "Nhận xét",
        labelKey: "slidesRibbon.group.comments",
        items: [{ type: "button", commandId: "slides.review.commentInsert", isLarge: true }]
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
