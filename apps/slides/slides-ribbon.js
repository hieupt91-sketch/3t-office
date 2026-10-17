/**
 * 3T Slide — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

export const SLIDES_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    labelKey: "slidesRibbon.tab.home",
    groups: [
      {
        id: "clipboard",
        label: "Bảng nhớ tạm",
        labelKey: "slidesRibbon.group.clipboard",
        items: [
          { type: "button", commandId: "common.edit.paste", isLarge: true },
          { type: "button", commandId: "slides.edit.pasteSpecial" },
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
        id: "slides",
        label: "Trang chiếu",
        labelKey: "slidesRibbon.group.slides",
        items: [
          { type: "button", commandId: "slides.slide.new", isLarge: true },
          { type: "button", commandId: "slides.layout.apply", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "slides.slide.duplicate" },
              { type: "button", commandId: "slides.slide.delete" },
              { type: "button", commandId: "slides.layout.reset" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.section.menu",
            label: "Phần",
            labelKey: "slidesRibbon.section",
            icon: "slideSection",
            items: [
              { commandId: "slides.section.add" },
              { commandId: "slides.section.rename" },
              { commandId: "slides.section.remove" },
              { commandId: "slides.section.moveUp" },
              { commandId: "slides.section.moveDown" }
            ]
          }
        ]
      },
      {
        id: "font",
        label: "Phông chữ",
        labelKey: "slidesRibbon.group.font",
        launcherCommandId: "slides.font.dialog",
        launcherTooltip: "Phông chữ…",
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
                      { value: "Times New Roman", label: "Times New Roman" },
                      { value: "Calibri", label: "Calibri" },
                      { value: "Arial", label: "Arial" },
                      { value: "Be Vietnam Pro", label: "Be Vietnam Pro" },
                      { value: "Roboto", label: "Roboto" },
                      { value: "Book Antiqua", label: "Book Antiqua" },
                      { value: "Cambria", label: "Cambria" },
                      { value: "Candara", label: "Candara" },
                      { value: "Century Gothic", label: "Century Gothic" },
                      { value: "Comic Sans MS", label: "Comic Sans MS" },
                      { value: "Consolas", label: "Consolas" },
                      { value: "Constantia", label: "Constantia" },
                      { value: "Corbel", label: "Corbel" },
                      { value: "Courier New", label: "Courier New" },
                      { value: "Franklin Gothic Medium", label: "Franklin Gothic Medium" },
                      { value: "Garamond", label: "Garamond" },
                      { value: "Georgia", label: "Georgia" },
                      { value: "Impact", label: "Impact" },
                      { value: "Lucida Console", label: "Lucida Console" },
                      { value: "Palatino Linotype", label: "Palatino Linotype" },
                      { value: "Segoe UI", label: "Segoe UI" },
                      { value: "Tahoma", label: "Tahoma" },
                      { value: "Trebuchet MS", label: "Trebuchet MS" },
                      { value: "Verdana", label: "Verdana" }
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
                  { type: "button", commandId: "slides.text.shadow", iconOnly: true },
                  { type: "button", commandId: "slides.text.clearFormat", iconOnly: true },
                  {
                    type: "dropdown",
                    id: "slides.font.spacing",
                    label: "Khoảng cách ký tự",
                    icon: "charSpacing",
                    iconOnly: true,
                    items: [
                      { commandId: "slides.font.setSpacing", args: "-3", label: "Rất sát" },
                      { commandId: "slides.font.setSpacing", args: "-1.5", label: "Sát" },
                      { commandId: "slides.font.setSpacing", args: "0", label: "Bình thường" },
                      { commandId: "slides.font.setSpacing", args: "3", label: "Thưa" },
                      { commandId: "slides.font.setSpacing", args: "6", label: "Rất thưa" }
                    ]
                  },
                  {
                    type: "dropdown",
                    id: "slides.text.changeCase",
                    label: "Đổi chữ hoa/thường",
                    icon: "changeCase",
                    iconOnly: true,
                    items: [
                      { commandId: "slides.text.changeCaseMode", args: "sentence", label: "Chữ hoa đầu câu" },
                      { commandId: "slides.text.changeCaseMode", args: "lowercase", label: "chữ thường" },
                      { commandId: "slides.text.changeCaseMode", args: "uppercase", label: "CHỮ HOA" },
                      { commandId: "slides.text.changeCaseMode", args: "capitalize", label: "Viết Hoa Mỗi Từ" },
                      { commandId: "slides.text.changeCaseMode", args: "toggle", label: "đẢO hOA tHƯỜNG" }
                    ]
                  },
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
                  { type: "button", commandId: "slides.para.justify", iconOnly: true },
                  {
                    type: "dropdown",
                    id: "slides.text.vAlign",
                    label: "Căn lề văn bản",
                    labelKey: "slidesRibbon.paragraph.vAlign",
                    icon: "textVAlignMiddle",
                    iconOnly: true,
                    items: [
                      { commandId: "slides.text.vAlignTop" },
                      { commandId: "slides.text.vAlignMiddle" },
                      { commandId: "slides.text.vAlignBottom" }
                    ]
                  },
                  {
                    type: "dropdown",
                    id: "slides.text.columns",
                    label: "Cột",
                    labelKey: "slidesRibbon.paragraph.columns",
                    icon: "pageColumns",
                    iconOnly: true,
                    items: [
                      { commandId: "slides.text.columnsOne" },
                      { commandId: "slides.text.columnsTwo" },
                      { commandId: "slides.text.columnsThree" }
                    ]
                  },
                  {
                    type: "dropdown",
                    id: "slides.text.direction",
                    label: "Hướng văn bản",
                    labelKey: "slidesRibbon.paragraph.direction",
                    icon: "textDirectionHorizontal",
                    iconOnly: true,
                    items: [
                      { commandId: "slides.text.directionHorizontal" },
                      { commandId: "slides.text.directionVertical" },
                      { commandId: "slides.text.directionVertical270" },
                      { commandId: "slides.text.directionStacked" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "drawing",
        label: "Vẽ",
        labelKey: "slidesRibbon.group.drawing",
        items: [
          { type: "button", commandId: "slides.text.insert", isLarge: true },
          {
            type: "dropdown",
            id: "slides.shape.gallery",
            label: "Hình",
            icon: "shape",
            isLarge: true,
            items: [
                { commandId: "slides.shape.insert", label: "Hình chữ nhật" },
                { commandId: "slides.shape.insertPreset", args: "ellipse", label: "Hình elip" },
                { commandId: "slides.shape.insertPreset", args: "roundRect", label: "Hình chữ nhật bo góc" },
                { commandId: "slides.shape.insertPreset", args: "triangle", label: "Tam giác cân" },
                { commandId: "slides.shape.insertPreset", args: "rtTriangle", label: "Tam giác vuông" },
                { commandId: "slides.shape.insertPreset", args: "diamond", label: "Hình thoi" },
                { commandId: "slides.shape.insertPreset", args: "parallelogram", label: "Hình bình hành" },
                { commandId: "slides.shape.insertPreset", args: "trapezoid", label: "Hình thang" },
                { commandId: "slides.shape.insertPreset", args: "pentagon", label: "Ngũ giác" },
                { commandId: "slides.shape.insertPreset", args: "hexagon", label: "Lục giác" },
                { commandId: "slides.shape.insertPreset", args: "star5", label: "Sao 5 cánh" },
                { commandId: "slides.shape.insertPreset", args: "plus", label: "Dấu cộng" },
                { commandId: "slides.shape.insertPreset", args: "rightArrow", label: "Mũi tên phải" },
                { commandId: "slides.shape.insertPreset", args: "leftArrow", label: "Mũi tên trái" },
                { commandId: "slides.shape.insertPreset", args: "upArrow", label: "Mũi tên lên" },
                { commandId: "slides.shape.insertPreset", args: "downArrow", label: "Mũi tên xuống" },
                { commandId: "slides.shape.insertPreset", args: "heart", label: "Hình trái tim" },
                { commandId: "slides.shape.insertPreset", args: "wedgeRectCallout", label: "Chú thích chữ nhật" }
            ]
          },
          { type: "button", commandId: "slides.image.insert", isLarge: true },
          {
            type: "dropdown",
            id: "slides.drawing.arrange",
            label: "Sắp xếp",
            labelKey: "slidesRibbon.drawing.arrange",
            icon: "shape",
            isLarge: true,
            items: [
              { commandId: "slides.arrange.bringToFront" },
              { commandId: "slides.arrange.bringForward" },
              { commandId: "slides.arrange.sendBackward" },
              { commandId: "slides.arrange.sendToBack" },
              { commandId: "slides.arrange.alignLeft" },
              { commandId: "slides.arrange.alignCenter" },
              { commandId: "slides.arrange.alignRight" },
              { commandId: "slides.arrange.alignTop" },
              { commandId: "slides.arrange.alignMiddle" },
              { commandId: "slides.arrange.alignBottom" },
              { commandId: "slides.arrange.distributeHorizontal" },
              { commandId: "slides.arrange.distributeVertical" },
              { commandId: "slides.arrange.alignToSlide" },
              { commandId: "slides.shape.group" },
              { commandId: "slides.shape.ungroup" }
            ]
          }
        ]
      },
      {
        id: "editing",
        label: "Chỉnh sửa",
        labelKey: "slidesRibbon.group.editing",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.find" },
              { type: "button", commandId: "common.edit.replace" },
              {
                type: "dropdown",
                id: "slides.edit.select",
                label: "Chọn",
                labelKey: "slidesRibbon.editing.select",
                icon: "selectAll",
                items: [
                  { commandId: "slides.edit.selectAll" },
                  { commandId: "slides.edit.selectObjects" },
                  { commandId: "slides.edit.selectionPane" }
                ]
              }
            ]
          }
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
          {
            type: "dropdown",
            id: "slides.shape.galleryInsert",
            label: "Hình",
            icon: "shape",
            isLarge: true,
            items: [
              { commandId: "slides.shape.insert", label: "Hình chữ nhật" },
              { commandId: "slides.shape.insertPreset", args: "ellipse", label: "Hình elip" },
              { commandId: "slides.shape.insertPreset", args: "roundRect", label: "Hình chữ nhật bo góc" },
              { commandId: "slides.shape.insertPreset", args: "triangle", label: "Tam giác cân" },
              { commandId: "slides.shape.insertPreset", args: "rtTriangle", label: "Tam giác vuông" },
              { commandId: "slides.shape.insertPreset", args: "diamond", label: "Hình thoi" },
              { commandId: "slides.shape.insertPreset", args: "parallelogram", label: "Hình bình hành" },
              { commandId: "slides.shape.insertPreset", args: "trapezoid", label: "Hình thang" },
              { commandId: "slides.shape.insertPreset", args: "pentagon", label: "Ngũ giác" },
              { commandId: "slides.shape.insertPreset", args: "hexagon", label: "Lục giác" },
              { commandId: "slides.shape.insertPreset", args: "star5", label: "Sao 5 cánh" },
              { commandId: "slides.shape.insertPreset", args: "plus", label: "Dấu cộng" },
              { commandId: "slides.shape.insertPreset", args: "rightArrow", label: "Mũi tên phải" },
              { commandId: "slides.shape.insertPreset", args: "leftArrow", label: "Mũi tên trái" },
              { commandId: "slides.shape.insertPreset", args: "upArrow", label: "Mũi tên lên" },
              { commandId: "slides.shape.insertPreset", args: "downArrow", label: "Mũi tên xuống" },
              { commandId: "slides.shape.insertPreset", args: "heart", label: "Hình trái tim" },
              { commandId: "slides.shape.insertPreset", args: "wedgeRectCallout", label: "Chú thích chữ nhật" }
            ]
          },
          { type: "button", commandId: "slides.diagram.insert", isLarge: true },
          { type: "button", commandId: "slides.insert.chart", label: "Biểu đồ", icon: "chart", isLarge: true }
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
          { type: "button", commandId: "slides.insert.action", label: "Tác vụ", labelKey: "slidesRibbon.action" },
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
        id: "media",
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
        id: "themes",
        label: "Chủ đề",
        labelKey: "slidesRibbon.group.themes",
        items: [
          { type: "button", commandId: "slides.design.themeGallery", isLarge: true }
        ]
      },
      {
        id: "designVariants",
        label: "Biến thể",
        labelKey: "slidesRibbon.group.designVariants",
        items: [
          {
            type: "dropdown",
            id: "slides.design.themeColors",
            label: "Màu chủ đề",
            icon: "formatBackground",
            isLarge: true,
            items: [
              { commandId: "slides.design.setThemeColors", args: "blue", label: "Xanh dương" },
              { commandId: "slides.design.setThemeColors", args: "green", label: "Xanh lá" },
              { commandId: "slides.design.setThemeColors", args: "orange", label: "Cam" },
              { commandId: "slides.design.setThemeColors", args: "purple", label: "Tím" },
              { commandId: "slides.design.setThemeColors", args: "red", label: "Đỏ" },
              { commandId: "slides.design.setThemeColors", args: "slate", label: "Xám xanh" },
              { commandId: "slides.design.setThemeColors", args: "dark", label: "Nền tối" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.design.themeFonts",
            label: "Phông chủ đề",
            icon: "formatBackground",
            isLarge: true,
            items: [
              { commandId: "slides.design.setThemeFonts", args: "segoe", label: "Segoe UI" },
              { commandId: "slides.design.setThemeFonts", args: "arial", label: "Arial" },
              { commandId: "slides.design.setThemeFonts", args: "times", label: "Times New Roman" },
              { commandId: "slides.design.setThemeFonts", args: "georgia", label: "Georgia" },
              { commandId: "slides.design.setThemeFonts", args: "verdana", label: "Verdana" },
              { commandId: "slides.design.setThemeFonts", args: "tahoma", label: "Tahoma" }
            ]
          }
        ]
      },
      {
        id: "master",
        label: "Mẫu chủ đạo",
        labelKey: "slidesRibbon.group.master",
        items: [
          { type: "button", commandId: "slides.master.apply", isLarge: true }
        ]
      },
      {
        id: "customize",
        label: "Tùy chỉnh",
        labelKey: "slidesRibbon.group.customize",
        items: [
          { type: "button", commandId: "slides.design.slideSize", isLarge: true },
          { type: "button", commandId: "slides.design.formatBackground", isLarge: true },
          { type: "button", commandId: "slides.design.hideBackground" }
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
        id: "transitions",
        label: "Hiệu ứng chuyển trang",
        labelKey: "slidesRibbon.group.transitions",
        items: [
          { type: "button", commandId: "slides.transition.apply", isLarge: true }
        ]
      },
      {
        id: "transitionGallery",
        label: "Chuyển đến trang này",
        labelKey: "slidesRibbon.group.transitionGallery",
        items: [
          {
            type: "dropdown",
            id: "slides.transition.gallery",
            label: "Hiệu ứng",
            icon: "slideTransition",
            isLarge: true,
            items: [
              { commandId: "slides.transition.set", args: "none", label: "Không" },
              { commandId: "slides.transition.set", args: "fade", label: "Mờ dần" },
              { commandId: "slides.transition.set", args: "slide", label: "Trượt ngang" },
              { commandId: "slides.transition.set", args: "zoom", label: "Thu phóng" },
              { commandId: "slides.transition.set", args: "flip", label: "Lật 3D" },
              { commandId: "slides.transition.set", args: "morph", label: "Morph" }
            ]
          },
          { type: "button", commandId: "slides.transition.preview", isLarge: true }
        ]
      },
      {
        id: "transitionTiming",
        label: "Thời gian",
        labelKey: "slidesRibbon.group.transitionTiming",
        items: [
          {
            type: "dropdown",
            id: "slides.transition.durationMenu",
            label: "Thời lượng",
            icon: "slideTransition",
            items: [
              { commandId: "slides.transition.duration", args: "300", label: "0,3 giây" },
              { commandId: "slides.transition.duration", args: "500", label: "0,5 giây" },
              { commandId: "slides.transition.duration", args: "800", label: "0,8 giây" },
              { commandId: "slides.transition.duration", args: "1000", label: "1 giây" },
              { commandId: "slides.transition.duration", args: "2000", label: "2 giây" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.transition.advanceMenu",
            label: "Chuyển trang",
            icon: "slideTransition",
            items: [
              { commandId: "slides.transition.advanceClick", args: "on", label: "Khi nhấp chuột: bật" },
              { commandId: "slides.transition.advanceClick", args: "off", label: "Khi nhấp chuột: tắt" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.transition.afterMenu",
            label: "Tự động sau",
            icon: "slideTransition",
            items: [
              { commandId: "slides.transition.advanceAfter", args: "off", label: "Không tự chuyển" },
              { commandId: "slides.transition.advanceAfter", args: "3", label: "3 giây" },
              { commandId: "slides.transition.advanceAfter", args: "5", label: "5 giây" },
              { commandId: "slides.transition.advanceAfter", args: "10", label: "10 giây" },
              { commandId: "slides.transition.advanceAfter", args: "30", label: "30 giây" }
            ]
          },
          { type: "button", commandId: "slides.transition.applyAll" }
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
        id: "animations",
        label: "Hiệu ứng đối tượng",
        labelKey: "slidesRibbon.group.animations",
        items: [
          {
            type: "dropdown",
            id: "slides.animation.gallery",
            label: "Hiệu ứng",
            icon: "slideTransition",
            isLarge: true,
            items: [
              { commandId: "slides.animation.setType", args: "none", label: "Không có" },
              { commandId: "slides.animation.setType", args: "fadeIn", label: "Mờ dần (vào)" },
              { commandId: "slides.animation.setType", args: "flyIn", label: "Bay vào" },
              { commandId: "slides.animation.setType", args: "zoomIn", label: "Thu phóng vào" },
              { commandId: "slides.animation.setType", args: "bounceIn", label: "Nảy vào" },
              { commandId: "slides.animation.setType", args: "slideLeft", label: "Trượt từ trái" },
              { commandId: "slides.animation.setType", args: "spin", label: "Xoay tròn (nhấn mạnh)" },
              { commandId: "slides.animation.setType", args: "growShrink", label: "Phóng to / thu nhỏ (nhấn mạnh)" },
              { commandId: "slides.animation.setType", args: "fadeOut", label: "Mờ dần ra (thoát)" },
              { commandId: "slides.animation.setType", args: "flyOut", label: "Bay ra (thoát)" },
              { commandId: "slides.animation.setType", args: "zoomOut", label: "Thu nhỏ ra (thoát)" },
              { commandId: "slides.animation.setType", args: "disappear", label: "Biến mất (thoát)" }
            ]
          },
          { type: "button", commandId: "slides.animation.apply", isLarge: true },
          { type: "button", commandId: "slides.animation.effectOptions", label: "Tùy chọn hiệu ứng", labelKey: "slidesRibbon.animationOptions" },
          { type: "button", commandId: "slides.animation.pane", isLarge: true },
          { type: "button", commandId: "slides.animation.painter" }
        ]
      },
      {
        id: "animPreview",
        label: "Xem trước",
        labelKey: "slidesRibbon.group.animPreview",
        items: [
          { type: "button", commandId: "slides.animation.preview", isLarge: true }
        ]
      },
      {
        id: "animTiming",
        label: "Thời gian",
        labelKey: "slidesRibbon.group.animTiming",
        items: [
          {
            type: "dropdown",
            id: "slides.animation.startMenu",
            label: "Bắt đầu",
            icon: "slideTransition",
            items: [
              { commandId: "slides.animation.setStart", args: "onClick", label: "Khi nhấp chuột" },
              { commandId: "slides.animation.setStart", args: "withPrevious", label: "Cùng lúc với hiệu ứng trước" },
              { commandId: "slides.animation.setStart", args: "afterPrevious", label: "Sau hiệu ứng trước" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.animation.durationMenu",
            label: "Thời lượng",
            icon: "slideTransition",
            items: [
              { commandId: "slides.animation.setDuration", args: "300", label: "0,3 giây" },
              { commandId: "slides.animation.setDuration", args: "500", label: "0,5 giây" },
              { commandId: "slides.animation.setDuration", args: "1000", label: "1 giây" },
              { commandId: "slides.animation.setDuration", args: "2000", label: "2 giây" },
              { commandId: "slides.animation.setDuration", args: "3000", label: "3 giây" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.animation.delayMenu",
            label: "Trễ",
            icon: "slideTransition",
            items: [
              { commandId: "slides.animation.setDelay", args: "0", label: "Không trễ" },
              { commandId: "slides.animation.setDelay", args: "500", label: "0,5 giây" },
              { commandId: "slides.animation.setDelay", args: "1000", label: "1 giây" },
              { commandId: "slides.animation.setDelay", args: "2000", label: "2 giây" }
            ]
          }
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
        id: "startSlideshow",
        label: "Khởi động chiếu",
        labelKey: "slidesRibbon.group.startSlideshow",
        items: [
          { type: "button", commandId: "slides.show.startFromBegin", isLarge: true },
          { type: "button", commandId: "slides.show.startFromCurrent", isLarge: true },
          { type: "button", commandId: "slides.show.presenterMode", isLarge: true }
        ]
      },
      {
        id: "setup",
        label: "Thiết lập",
        labelKey: "slidesRibbon.group.setup",
        items: [
          { type: "button", commandId: "slides.show.setupShow", isLarge: true },
          { type: "button", commandId: "slides.slide.toggleHidden", isLarge: true },
          { type: "button", commandId: "slides.show.rehearseTimings", isLarge: true }
        ]
      },
      {
        id: "presenter",
        label: "Người thuyết trình",
        labelKey: "slidesRibbon.group.presenter",
        items: [
          { type: "button", commandId: "slides.notes.toggle", isLarge: true }
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
        items: [
          { type: "button", commandId: "slides.review.spellCheck", isLarge: true },
          { type: "button", commandId: "slides.review.toggleSpellCheck", isLarge: true }
        ]
      },
      {
        id: "comments",
        label: "Nhận xét",
        labelKey: "slidesRibbon.group.comments",
        items: [
          { type: "button", commandId: "slides.review.commentInsert", isLarge: true },
          { type: "button", commandId: "slides.review.commentDelete" },
          { type: "button", commandId: "slides.review.commentPrevious" },
          { type: "button", commandId: "slides.review.commentNext" },
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
          { type: "button", commandId: "slides.view.outline", isLarge: true },
          { type: "button", commandId: "slides.view.notesPage", isLarge: true },
          { type: "button", commandId: "slides.view.slideSorter", isLarge: true },
          { type: "button", commandId: "slides.notes.toggle", isLarge: true },
          { type: "button", commandId: "slides.view.reading", isLarge: true },
          { type: "button", commandId: "slides.file.printPreview" }
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
          { type: "button", commandId: "slides.view.fitToWindow", isLarge: true }
        ]
      },
      {
        id: "window",
        label: "Cửa sổ",
        labelKey: "slidesRibbon.group.window",
        items: [
          { type: "button", commandId: "slides.view.newWindow", isLarge: true }
        ]
      },
      {
        id: "macro",
        label: "Macro",
        labelKey: "slidesRibbon.group.macro",
        items: [
          { type: "button", commandId: "common.macro.recordToggle", isLarge: true },
          { type: "button", commandId: "common.macro.manager", isLarge: true }
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
          { type: "button", commandId: "slides.help.open", isLarge: true },
          { type: "about-button", isLarge: true, label: "Giới thiệu" }
        ]
      }
    ]
  },
  {
    id: "tableLayout",
    label: "Bố cục bảng",
    labelKey: "slidesRibbon.tab.tableLayout",
    contextual: true,
    groups: [
      {
        id: "tableRowsCols",
        label: "Hàng và cột",
        labelKey: "slidesRibbon.group.tableRowsCols",
        items: [
          { type: "button", commandId: "slides.table.insertRowAbove" },
          { type: "button", commandId: "slides.table.insertRowBelow" },
          { type: "button", commandId: "slides.table.insertColLeft" },
          { type: "button", commandId: "slides.table.insertColRight" },
          { type: "button", commandId: "slides.table.deleteRow" },
          { type: "button", commandId: "slides.table.deleteCol" },
          { type: "button", commandId: "slides.table.deleteTable" }
        ]
      },
      {
        id: "tableMerge",
        label: "Gộp",
        labelKey: "slidesRibbon.group.tableMerge",
        items: [
          { type: "button", commandId: "slides.table.mergeCells", isLarge: true },
          { type: "button", commandId: "slides.table.splitCell", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "shapeFormat",
    label: "Định dạng hình",
    labelKey: "slidesRibbon.tab.shapeFormat",
    contextual: true,
    groups: [
      {
        id: "shapeStyles",
        label: "Kiểu hình",
        labelKey: "slidesRibbon.group.shapeStyles",
        items: [
          {
            type: "dropdown",
            id: "slides.shape.fill",
            label: "Tô màu hình",
            icon: "shapeFill",
            isLarge: true,
            items: [
                      { commandId: "slides.shape.fillColor", args: "#C00000", swatch: "#C00000", label: "Đỏ sẫm" },
                      { commandId: "slides.shape.fillColor", args: "#FF0000", swatch: "#FF0000", label: "Đỏ" },
                      { commandId: "slides.shape.fillColor", args: "#FFC000", swatch: "#FFC000", label: "Cam" },
                      { commandId: "slides.shape.fillColor", args: "#FFFF00", swatch: "#FFFF00", label: "Vàng" },
                      { commandId: "slides.shape.fillColor", args: "#92D050", swatch: "#92D050", label: "Xanh lá nhạt" },
                      { commandId: "slides.shape.fillColor", args: "#00B050", swatch: "#00B050", label: "Xanh lá" },
                      { commandId: "slides.shape.fillColor", args: "#00B0F0", swatch: "#00B0F0", label: "Xanh da trời" },
                      { commandId: "slides.shape.fillColor", args: "#0070C0", swatch: "#0070C0", label: "Xanh dương" },
                      { commandId: "slides.shape.fillColor", args: "#002060", swatch: "#002060", label: "Xanh dương đậm" },
                      { commandId: "slides.shape.fillColor", args: "#7030A0", swatch: "#7030A0", label: "Tím" },
                      { commandId: "slides.shape.fillColor", args: "#FFFFFF", swatch: "#FFFFFF", label: "Trắng" },
                      { commandId: "slides.shape.fillColor", args: "#D9D9D9", swatch: "#D9D9D9", label: "Xám nhạt" },
                      { commandId: "slides.shape.fillColor", args: "#7F7F7F", swatch: "#7F7F7F", label: "Xám" },
                      { commandId: "slides.shape.fillColor", args: "#404040", swatch: "#404040", label: "Xám đậm" },
                      { commandId: "slides.shape.fillColor", args: "#000000", swatch: "#000000", label: "Đen" },
                      { commandId: "slides.shape.fillColor", args: "none", label: "Không tô màu" },
                      { commandId: "slides.shape.fillColor", args: "custom", label: "Màu khác…" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.shape.outline",
            label: "Viền hình",
            icon: "shapeOutline",
            isLarge: true,
            items: [
                      { commandId: "slides.shape.outlineColor", args: "#C00000", swatch: "#C00000", label: "Đỏ sẫm" },
                      { commandId: "slides.shape.outlineColor", args: "#FF0000", swatch: "#FF0000", label: "Đỏ" },
                      { commandId: "slides.shape.outlineColor", args: "#FFC000", swatch: "#FFC000", label: "Cam" },
                      { commandId: "slides.shape.outlineColor", args: "#FFFF00", swatch: "#FFFF00", label: "Vàng" },
                      { commandId: "slides.shape.outlineColor", args: "#92D050", swatch: "#92D050", label: "Xanh lá nhạt" },
                      { commandId: "slides.shape.outlineColor", args: "#00B050", swatch: "#00B050", label: "Xanh lá" },
                      { commandId: "slides.shape.outlineColor", args: "#00B0F0", swatch: "#00B0F0", label: "Xanh da trời" },
                      { commandId: "slides.shape.outlineColor", args: "#0070C0", swatch: "#0070C0", label: "Xanh dương" },
                      { commandId: "slides.shape.outlineColor", args: "#002060", swatch: "#002060", label: "Xanh dương đậm" },
                      { commandId: "slides.shape.outlineColor", args: "#7030A0", swatch: "#7030A0", label: "Tím" },
                      { commandId: "slides.shape.outlineColor", args: "#FFFFFF", swatch: "#FFFFFF", label: "Trắng" },
                      { commandId: "slides.shape.outlineColor", args: "#D9D9D9", swatch: "#D9D9D9", label: "Xám nhạt" },
                      { commandId: "slides.shape.outlineColor", args: "#7F7F7F", swatch: "#7F7F7F", label: "Xám" },
                      { commandId: "slides.shape.outlineColor", args: "#404040", swatch: "#404040", label: "Xám đậm" },
                      { commandId: "slides.shape.outlineColor", args: "#000000", swatch: "#000000", label: "Đen" },
                      { commandId: "slides.shape.outlineColor", args: "none", label: "Không viền" },
                      { commandId: "slides.shape.outlineColor", args: "custom", label: "Màu khác…" },
                      {
                        id: "slides.shape.outlineWeight.menu",
                        label: "Độ dày",
                        icon: "shapeOutline",
                        items: [
                          { commandId: "slides.shape.outlineWeight", args: "0.5", label: "½ pt" },
                          { commandId: "slides.shape.outlineWeight", args: "1", label: "1 pt" },
                          { commandId: "slides.shape.outlineWeight", args: "1.5", label: "1½ pt" },
                          { commandId: "slides.shape.outlineWeight", args: "2.25", label: "2¼ pt" },
                          { commandId: "slides.shape.outlineWeight", args: "3", label: "3 pt" },
                          { commandId: "slides.shape.outlineWeight", args: "4.5", label: "4½ pt" },
                          { commandId: "slides.shape.outlineWeight", args: "6", label: "6 pt" }
                        ]
                      },
                      {
                        id: "slides.shape.outlineDash.menu",
                        label: "Nét đứt",
                        icon: "shapeOutline",
                        items: [
                          { commandId: "slides.shape.outlineDash", args: "solid", label: "Nét liền" },
                          { commandId: "slides.shape.outlineDash", args: "dash", label: "Gạch" },
                          { commandId: "slides.shape.outlineDash", args: "dot", label: "Chấm" },
                          { commandId: "slides.shape.outlineDash", args: "dashDot", label: "Gạch chấm" }
                        ]
                      }
            ]
          },
          {
            type: "dropdown",
            id: "slides.shape.effects",
            label: "Hiệu ứng hình",
            icon: "shapeEffects",
            isLarge: true,
            items: [
              { commandId: "slides.shape.shadow", args: "none", label: "Không đổ bóng" },
              { commandId: "slides.shape.shadow", args: "bottomRight", label: "Bóng phía dưới bên phải" },
              { commandId: "slides.shape.shadow", args: "bottomLeft", label: "Bóng phía dưới bên trái" },
              { commandId: "slides.shape.shadow", args: "topRight", label: "Bóng phía trên bên phải" },
              { commandId: "slides.shape.shadow", args: "topLeft", label: "Bóng phía trên bên trái" }
            ]
          }
        ]
      },
      {
        id: "shapeArrange",
        label: "Sắp xếp",
        labelKey: "slidesRibbon.group.shapeArrange",
        items: [
          {
            type: "dropdown",
            id: "slides.shape.changeType",
            label: "Đổi hình dạng",
            icon: "shape",
            isLarge: true,
            items: [
              { commandId: "slides.shape.setType", args: "rect", label: "Hình chữ nhật" },
              { commandId: "slides.shape.setType", args: "ellipse", label: "Hình elip" },
              { commandId: "slides.shape.setType", args: "roundRect", label: "Hình chữ nhật bo góc" },
              { commandId: "slides.shape.setType", args: "triangle", label: "Tam giác cân" },
              { commandId: "slides.shape.setType", args: "rtTriangle", label: "Tam giác vuông" },
              { commandId: "slides.shape.setType", args: "diamond", label: "Hình thoi" },
              { commandId: "slides.shape.setType", args: "parallelogram", label: "Hình bình hành" },
              { commandId: "slides.shape.setType", args: "trapezoid", label: "Hình thang" },
              { commandId: "slides.shape.setType", args: "pentagon", label: "Ngũ giác" },
              { commandId: "slides.shape.setType", args: "hexagon", label: "Lục giác" },
              { commandId: "slides.shape.setType", args: "star5", label: "Sao 5 cánh" },
              { commandId: "slides.shape.setType", args: "plus", label: "Dấu cộng" },
              { commandId: "slides.shape.setType", args: "rightArrow", label: "Mũi tên phải" },
              { commandId: "slides.shape.setType", args: "leftArrow", label: "Mũi tên trái" },
              { commandId: "slides.shape.setType", args: "upArrow", label: "Mũi tên lên" },
              { commandId: "slides.shape.setType", args: "downArrow", label: "Mũi tên xuống" },
              { commandId: "slides.shape.setType", args: "heart", label: "Hình trái tim" },
              { commandId: "slides.shape.setType", args: "wedgeRectCallout", label: "Chú thích chữ nhật" }
            ]
          },
          {
            type: "dropdown",
            id: "slides.arrange.rotate",
            label: "Xoay",
            icon: "rotateRight90",
            isLarge: true,
            items: [
              { commandId: "slides.arrange.rotateRight90" },
              { commandId: "slides.arrange.rotateLeft90" },
              { commandId: "slides.arrange.flipVertical" },
              { commandId: "slides.arrange.flipHorizontal" }
            ]
          },
          { type: "button", commandId: "slides.arrange.bringForward" },
          { type: "button", commandId: "slides.arrange.sendBackward" }
        ]
      },
      {
        id: "shapeSize",
        label: "Kích thước",
        labelKey: "slidesRibbon.group.shapeSize",
        items: [
          { type: "button", commandId: "slides.shape.sizeDialog", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "pictureFormat",
    label: "Định dạng ảnh",
    labelKey: "slidesRibbon.tab.pictureFormat",
    contextual: true,
    groups: [
      {
        id: "pictureSize",
        label: "Kích thước",
        labelKey: "slidesRibbon.group.pictureSize",
        items: [
          {
            type: "dropdown",
            id: "slides.picture.crop",
            label: "Cắt",
            icon: "selectObjects",
            isLarge: true,
            items: [
              { commandId: "slides.picture.cropRatio", args: "1:1", label: "Vuông 1:1" },
              { commandId: "slides.picture.cropRatio", args: "4:3", label: "Ngang 4:3" },
              { commandId: "slides.picture.cropRatio", args: "16:9", label: "Ngang 16:9" },
              { commandId: "slides.picture.cropRatio", args: "3:2", label: "Ngang 3:2" },
              { commandId: "slides.picture.cropRatio", args: "3:4", label: "Dọc 3:4" },
              { commandId: "slides.picture.cropRatio", args: "9:16", label: "Dọc 9:16" },
              { commandId: "slides.picture.cropRatio", args: "reset", label: "Đặt lại cắt xén" },
              { commandId: "slides.picture.cropDialog" }
            ]
          }
        ]
      },
      {
        id: "pictureArrange",
        label: "Sắp xếp",
        labelKey: "slidesRibbon.group.pictureArrange",
        items: [
          { type: "button", commandId: "slides.arrange.rotateRight90" },
          { type: "button", commandId: "slides.arrange.rotateLeft90" },
          { type: "button", commandId: "slides.arrange.flipHorizontal" },
          { type: "button", commandId: "slides.arrange.bringForward" },
          { type: "button", commandId: "slides.arrange.sendBackward" }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý 3T AI",
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
