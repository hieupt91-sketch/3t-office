/**
 * VN Slides — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

export const SLIDES_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    groups: [
      {
        label: "Trang chiếu",
        items: [
          { type: "button", commandId: "slides.slide.new", isLarge: true },
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
        items: [
          { type: "button", commandId: "slides.text.insert", isLarge: true },
          { type: "button", commandId: "slides.shape.insert", isLarge: true },
          { type: "button", commandId: "slides.image.insert", isLarge: true },
          { type: "button", commandId: "slides.animation.apply", isLarge: true }
        ]
      },
      {
        label: "Trình chiếu",
        items: [
          { type: "button", commandId: "slides.show.startFromBegin", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    groups: [
      {
        label: "Hình ảnh & Đối tượng",
        items: [
          { type: "button", commandId: "slides.image.insert", isLarge: true },
          { type: "button", commandId: "slides.shape.insert", isLarge: true },
          { type: "button", commandId: "slides.text.insert", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "design",
    label: "Thiết kế",
    groups: [
      {
        label: "Mẫu chủ đạo",
        items: [
          { type: "button", commandId: "slides.master.apply", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "transitions",
    label: "Chuyển tiếp",
    groups: [
      {
        label: "Hiệu ứng chuyển trang",
        items: [
          { type: "button", commandId: "slides.transition.apply", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "animations",
    label: "Hoạt hình",
    groups: [
      {
        label: "Hiệu ứng đối tượng",
        items: [
          { type: "button", commandId: "slides.animation.apply", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "slideshow",
    label: "Trình chiếu",
    groups: [
      {
        label: "Khởi động chiếu",
        items: [
          { type: "button", commandId: "slides.show.startFromBegin", isLarge: true },
          { type: "button", commandId: "slides.show.startFromCurrent", isLarge: true },
          { type: "button", commandId: "slides.show.presenterMode", isLarge: true }
        ]
      },
      {
        label: "Người thuyết trình",
        items: [
          { type: "button", commandId: "slides.notes.toggle", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    groups: [
      {
        label: "Tạo nội dung thuyết trình",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true }
        ]
      }
    ]
  }
];
