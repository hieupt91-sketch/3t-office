/**
 * 3T Doc — Enterprise Ribbon Structure
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
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.edit.pasteSpecial" }
            ]
          }
        ]
      },
      {
        id: "font",
        label: "Phông chữ",
        labelKey: "writerRibbon.group.font",
        launcherCommandId: "writer.format.fontDialog",
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
                    commandId: "writer.font.family",
                    defaultValue: "Times New Roman",
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
                    commandId: "writer.font.size",
                    defaultValue: "14",
                    // Giá trị là số pt thật (Word có 8–72 pt); 1–7 chỉ còn là chỉ số cũ của execCommand khi gọi trực tiếp.
                    options: [
                      { value: "8", label: "8 pt" },
                      { value: "9", label: "9 pt" },
                      { value: "10", label: "10 pt" },
                      { value: "10.5", label: "10,5 pt" },
                      { value: "11", label: "11 pt" },
                      { value: "12", label: "12 pt" },
                      { value: "13", label: "13 pt" },
                      { value: "13.5", label: "13,5 pt" },
                      { value: "14", label: "14 pt (NĐ 30)" },
                      { value: "16", label: "16 pt" },
                      { value: "18", label: "18 pt" },
                      { value: "20", label: "20 pt" },
                      { value: "22", label: "22 pt" },
                      { value: "24", label: "24 pt" },
                      { value: "26", label: "26 pt" },
                      { value: "28", label: "28 pt" },
                      { value: "36", label: "36 pt" },
                      { value: "48", label: "48 pt" },
                      { value: "72", label: "72 pt" }
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
                  { type: "button", commandId: "writer.text.strike", iconOnly: true },
                  { type: "button", commandId: "writer.text.subscript", iconOnly: true },
                  { type: "button", commandId: "writer.text.superscript", iconOnly: true },
                  { type: "button", commandId: "writer.text.changeCase", iconOnly: true },
                  { type: "button", commandId: "writer.format.textEffects", iconOnly: true },
                  { type: "button", commandId: "writer.text.clearFormat", iconOnly: true },
                  { type: "button", commandId: "writer.color.highlight", iconOnly: true },
                  { type: "button", commandId: "writer.color.text", iconOnly: true }
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
        launcherCommandId: "writer.format.paragraphDialog",
        launcherTooltip: "Đoạn văn…",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "writer.list.bullet", iconOnly: true },
                  { type: "button", commandId: "writer.list.numbered", iconOnly: true },
                  {
                    type: "dropdown",
                    id: "writer.para.multilevelList",
                    label: "Đa cấp",
                    icon: "listMultilevel",
                    iconOnly: true,
                    ariaLabel: "Danh sách đa cấp",
                    items: [
                      { commandId: "writer.para.multilevelList", args: "decimal", label: "1. / 1.1. / 1.1.1." },
                      { commandId: "writer.para.multilevelList", args: "letter", label: "1. / a. / i." },
                      { commandId: "writer.para.multilevelList", args: "nd30", label: "Điều 1. / 1. / a)" }
                    ]
                  },
                  { type: "button", commandId: "writer.para.indentDec", iconOnly: true },
                  { type: "button", commandId: "writer.para.indentInc", iconOnly: true },
                  { type: "button", commandId: "writer.para.sort", iconOnly: true },
                  { type: "button", commandId: "writer.para.showFormattingMarks", iconOnly: true },
                  {
                    type: "dropdown",
                    id: "writer.list.restartNumbering",
                    commandId: "writer.list.restartNumbering",
                    label: "Đánh số lại từ 1",
                    icon: "listNumber",
                    iconOnly: true,
                    ariaLabel: "Tùy chọn danh sách đánh số",
                    items: [
                      { commandId: "writer.list.restartNumbering", label: "Đánh số lại từ 1" },
                      { commandId: "writer.list.continueNumbering", label: "Tiếp tục đánh số" }
                    ]
                  }
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
                    iconOnly: true,
                    ariaLabel: "Khoảng cách dòng",
                    items: [
                      { commandId: "writer.para.spacing1" },
                      { commandId: "writer.para.spacing15" },
                      { commandId: "writer.para.spacing2" },
                      { commandId: "writer.para.lineSpacing", args: "1.15", label: "1,15" },
                      { commandId: "writer.para.lineSpacing", args: "2.5", label: "2,5" },
                      { commandId: "writer.para.lineSpacing", args: "3.0", label: "3,0" },
                      { commandId: "writer.para.lineSpacing", args: "exact", label: "Chính xác…" }
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
          { type: "button", commandId: "writer.style.gallery", isLarge: true },
          { type: "button", commandId: "writer.styles.pane", isLarge: false }
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
              { type: "button", commandId: "writer.edit.goTo" },
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
        id: "pages",
        label: "Trang văn bản",
        labelKey: "writerRibbon.group.pages",
        items: [
          {
            type: "dropdown",
            id: "writer.insert.coverPage",
            commandId: "writer.insert.coverPage",
            label: "Trang bìa",
            icon: "coverPage",
            isLarge: true,
            items: [
              { commandId: "writer.insert.coverPage", label: "Thư viện trang bìa…" },
              { commandId: "writer.insert.removeCoverPage", label: "Gỡ trang bìa" }
            ]
          },
          { type: "button", commandId: "writer.page.blank", isLarge: true },
          { type: "button", commandId: "writer.page.break", isLarge: true }
        ]
      },
      {
        id: "tables",
        label: "Bảng biểu",
        labelKey: "writerRibbon.group.tables",
        items: [
          { type: "button", commandId: "writer.table.insert", isLarge: true },
          { type: "button", commandId: "writer.table.quickTables", isLarge: true },
          { type: "button", commandId: "writer.table.fromText", isLarge: true }
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
        id: "headerFooter",
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
          { type: "button", commandId: "writer.insert.wordart", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.format.dropCap" },
              { type: "button", commandId: "writer.insert.dateTime" },
              { type: "button", commandId: "writer.insert.quickParts" }
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
        id: "pageBackground",
        label: "Nền & Viền trang",
        labelKey: "writerRibbon.group.pageBackground",
        items: [
          { type: "button", commandId: "writer.page.watermark", isLarge: true },
          { type: "button", commandId: "writer.page.color", isLarge: true },
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
        id: "pageSetup",
        label: "Thiết lập trang",
        labelKey: "writerRibbon.group.pageSetup",
        launcherCommandId: "writer.page.setupDialog",
        launcherTooltip: "Thiết lập trang…",
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
          },
          {
            type: "dropdown",
            id: "writer.layout.breaks",
            label: "Ngắt",
            labelKey: "writer.layout.breaks",
            icon: "sectionBreak",
            isLarge: true,
            items: [
              { commandId: "writer.page.break" },
              { commandId: "writer.break.column" },
              { commandId: "writer.section.nextPage" },
              { commandId: "writer.section.continuous" },
              { commandId: "writer.section.evenPage" },
              { commandId: "writer.section.oddPage" }
            ]
          },
          {
            type: "select",
            commandId: "writer.layout.lineNumbers",
            defaultValue: "none",
            ariaLabel: "Danh số dòng",
            options: [
              { value: "none", label: "Số dòng: Không có" },
              { value: "continuous", label: "Số dòng: Liên tục" },
              { value: "restartPage", label: "Số dòng: Mỗi trang" },
              { value: "restartSection", label: "Số dòng: Mỗi mục" }
            ]
          },
          {
            type: "select",
            commandId: "writer.layout.hyphenation",
            defaultValue: "none",
            ariaLabel: "Ngắt từ tự động",
            options: [
              { value: "none", label: "Ngắt từ: Không", labelKey: "writerRibbon.hyphenation.none" },
              { value: "auto", label: "Ngắt từ: Tự động", labelKey: "writerRibbon.hyphenation.auto" }
            ]
          },
          {
            type: "dropdown",
            id: "writer.layout.sectionOptions",
            label: "Tùy chọn mục",
            labelKey: "writer.layout.sectionOptions",
            icon: "sectionBreak",
            items: [
              { commandId: "writer.section.options" },
              { commandId: "writer.pageNumber.format" },
              { commandId: "writer.section.delete" }
            ]
          }
        ]
      },
      {
        id: "paragraph",
        label: "Đoạn văn",
        labelKey: "writerRibbon.group.paragraph",
        launcherCommandId: "writer.format.paragraphDialog",
        launcherTooltip: "Đoạn văn…",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.para.indentDec" },
              { type: "button", commandId: "writer.para.indentInc" }
            ]
          },
          {
            type: "dropdown",
            id: "writer.para.lineSpacingLayout",
            label: "Giãn dòng",
            icon: "lineSpacing",
            isLarge: true,
            items: [
              { commandId: "writer.para.spacing1" },
              { commandId: "writer.para.spacing15" },
              { commandId: "writer.para.spacing2" },
              { commandId: "writer.para.lineSpacing", args: "1.15", label: "1,15" },
              { commandId: "writer.para.lineSpacing", args: "exact", label: "Chính xác…" }
            ]
          },
          {
            type: "select",
            commandId: "writer.para.firstLineIndent",
            defaultValue: "0",
            ariaLabel: "Thụt đầu dòng",
            options: [
              { value: "0", label: "Đầu dòng: Không" },
              { value: "14.17", label: "Đầu dòng: 0,5 cm" },
              { value: "36", label: "Đầu dòng: 1,27 cm" }
            ]
          },
          {
            type: "column",
            items: [
              {
                type: "select",
                commandId: "writer.para.spacingBefore",
                defaultValue: "0",
                ariaLabel: "Khoảng trước đoạn",
                options: [
                  { value: "0", label: "Trước: 0 pt" },
                  { value: "6", label: "Trước: 6 pt" },
                  { value: "8", label: "Trước: 8 pt" },
                  { value: "12", label: "Trước: 12 pt" },
                  { value: "18", label: "Trước: 18 pt" }
                ]
              },
              {
                type: "select",
                commandId: "writer.para.spacingAfter",
                defaultValue: "0",
                ariaLabel: "Khoảng sau đoạn",
                options: [
                  { value: "0", label: "Sau: 0 pt" },
                  { value: "6", label: "Sau: 6 pt" },
                  { value: "8", label: "Sau: 8 pt" },
                  { value: "12", label: "Sau: 12 pt" },
                  { value: "18", label: "Sau: 18 pt" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "pageBackground",
        label: "Nền & Viền trang",
        labelKey: "writerRibbon.group.pageBackground",
        items: [
          { type: "button", commandId: "writer.page.watermark", isLarge: true },
          { type: "button", commandId: "writer.page.border", isLarge: true }
        ]
      },
      {
        id: "arrange",
        label: "Sắp xếp",
        labelKey: "writerRibbon.group.arrange",
        items: [
          { type: "button", commandId: "writer.view.selectionPane", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.arrange.group" },
              { type: "button", commandId: "writer.arrange.ungroup" }
            ]
          }
        ]
      },
      {
        id: "print",
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
    contextual: true,
    groups: []
  },
  {
    id: "tableDesign",
    label: "Thiết kế Bảng",
    labelKey: "writerRibbon.tab.tableDesign",
    contextual: true,
    groups: [
      {
        id: "tableStyleOptions",
        label: "Tùy chọn kiểu bảng",
        labelKey: "writerRibbon.group.tableStyleOptions",
        items: [
          { type: "button", commandId: "writer.table.toggleHeaderRow" },
          { type: "button", commandId: "writer.table.toggleBandedRows" }
        ]
      },
      {
        id: "tableStyles",
        label: "Kiểu bảng",
        labelKey: "writerRibbon.group.tableStyles",
        items: [
          { type: "button", commandId: "writer.table.stylesGallery", isLarge: true }
        ]
      },
      {
        id: "tableBordersShading",
        label: "Màu & Viền",
        labelKey: "writerRibbon.group.tableBordersShading",
        items: [
          { type: "button", commandId: "writer.table.cellBg", isLarge: true },
          {
            type: "dropdown",
            id: "writer.table.borders",
            label: "Đường viền bảng",
            labelKey: "writerRibbon.group.tableBordersButton",
            icon: "paragraphBorders",
            isLarge: true,
            items: [
              { commandId: "writer.table.bordersAll" },
              { commandId: "writer.table.bordersOutside" },
              { commandId: "writer.table.bordersInside" },
              { commandId: "writer.table.bordersNone" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "tableLayout",
    label: "Bố cục Bảng",
    labelKey: "writerRibbon.tab.tableLayout",
    contextual: true,
    groups: [
      {
        id: "tableSelectGroup",
        label: "Bảng",
        labelKey: "writerRibbon.group.tableSelectGroup",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.table.selectCell" },
              { type: "button", commandId: "writer.table.selectRow" },
              { type: "button", commandId: "writer.table.selectCol" },
              { type: "button", commandId: "writer.table.selectTable" }
            ]
          },
          { type: "button", commandId: "writer.table.viewGridlines", isLarge: true },
          { type: "button", commandId: "writer.table.properties", isLarge: true },
          { type: "button", commandId: "writer.table.deleteTable", isLarge: true }
        ]
      },
      {
        id: "tableRowsColsGroup",
        label: "Hàng & Cột",
        labelKey: "writerRibbon.group.tableRowsColsGroup",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.table.insertRowAbove" },
              { type: "button", commandId: "writer.table.insertRowBelow" },
              { type: "button", commandId: "writer.table.deleteRow" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.table.insertColLeft" },
              { type: "button", commandId: "writer.table.insertColRight" },
              { type: "button", commandId: "writer.table.deleteCol" }
            ]
          }
        ]
      },
      {
        id: "tableMergeGroup",
        label: "Hợp nhất",
        labelKey: "writerRibbon.group.tableMergeGroup",
        items: [
          { type: "button", commandId: "writer.table.mergeCells", isLarge: true },
          { type: "button", commandId: "writer.table.splitCells", isLarge: true },
          { type: "button", commandId: "writer.table.splitTable", isLarge: true }
        ]
      },
      {
        id: "tableSizeGroup",
        label: "Kích cỡ ô",
        labelKey: "writerRibbon.group.tableSizeGroup",
        items: [
          { type: "button", commandId: "writer.table.autoFitContents" },
          { type: "button", commandId: "writer.table.autoFitWindow" },
          { type: "button", commandId: "writer.table.distributeRows" },
          { type: "button", commandId: "writer.table.distributeCols" }
        ]
      },
      {
        id: "tableAlignGroup",
        label: "Căn lề ô",
        labelKey: "writerRibbon.group.tableAlignGroup",
        items: [
          { type: "button", commandId: "writer.table.alignTop" },
          { type: "button", commandId: "writer.table.alignMiddle" },
          { type: "button", commandId: "writer.table.alignBottom" },
          { type: "button", commandId: "writer.table.textDirection", isLarge: true }
        ]
      },
      {
        id: "tableDataGroup",
        label: "Dữ liệu",
        labelKey: "writerRibbon.group.tableDataGroup",
        items: [
          { type: "button", commandId: "writer.table.sort", isLarge: true },
          { type: "button", commandId: "writer.table.formula", isLarge: true },
          { type: "button", commandId: "writer.table.toText", isLarge: true }
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
        id: "tableOfContents",
        label: "Mục lục",
        labelKey: "writerRibbon.group.tableOfContents",
        items: [
          { type: "button", commandId: "writer.reference.tocInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.tocUpdate", isLarge: true }
        ]
      },
      {
        id: "footnotes",
        label: "Chú thích",
        labelKey: "writerRibbon.group.footnotes",
        items: [
          { type: "button", commandId: "writer.reference.footnoteInsert", isLarge: true },
          { type: "button", commandId: "writer.reference.endnoteInsert", isLarge: true }
        ]
      },
      {
        id: "citationsBibliography",
        label: "Trích dẫn & Thư mục tài liệu",
        labelKey: "writerRibbon.group.citationsBibliography",
        items: [
          { type: "button", commandId: "writer.reference.citationInsert", isLarge: true },
          {
            type: "column",
            items: [
              { type: "row", items: [{ type: "button", commandId: "writer.reference.sourcesManage" }] },
              { type: "row", items: [{ type: "select", commandId: "writer.reference.citationStyle", defaultValue: "apa", ariaLabel: "Kiểu trích dẫn", options: [{ value: "apa", label: "Kiểu: APA" }, { value: "mla", label: "Kiểu: MLA" }] }] }
            ]
          },
          { type: "button", commandId: "writer.reference.bibliographyInsert", isLarge: true }
        ]
      },
      {
        id: "captions",
        label: "Chú thích ảnh",
        labelKey: "writerRibbon.group.captions",
        items: [
          { type: "button", commandId: "writer.reference.captionInsert", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.reference.tofInsert" },
              { type: "button", commandId: "writer.reference.tofUpdate" },
              { type: "button", commandId: "writer.insert.crossReference" }
            ]
          }
        ]
      },
      {
        id: "index",
        label: "Chỉ mục",
        labelKey: "writerRibbon.group.index",
        items: [
          { type: "button", commandId: "writer.reference.indexMark", isLarge: true },
          { type: "button", commandId: "writer.reference.indexInsert", isLarge: true }
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
        id: "createMailings",
        label: "Tạo",
        labelKey: "writerRibbon.group.createMailings",
        items: [
          { type: "button", commandId: "writer.mailings.envelopes", isLarge: true },
          { type: "button", commandId: "writer.mailings.labels", isLarge: true }
        ]
      },
      {
        id: "startMerge",
        label: "Bắt đầu trộn",
        labelKey: "writerRibbon.group.startMerge",
        items: [
          { type: "button", commandId: "writer.mailMerge.open", isLarge: true }
        ]
      },
      {
        id: "writeInsert",
        label: "Viết & Chèn trường",
        labelKey: "writerRibbon.group.writeInsert",
        items: [
          { type: "button", commandId: "writer.mailMerge.insertField", isLarge: true },
          { type: "button", commandId: "writer.mailMerge.ifRule", isLarge: true }
        ]
      },
      {
        id: "previewResults",
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
        id: "finishMerge",
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
        id: "proofread",
        label: "Chính tả & Ngữ pháp",
        labelKey: "writerRibbon.group.proofread",
        items: [
          { type: "button", commandId: "ai.assistant.grammarCheck", isLarge: true },
          { type: "button", commandId: "writer.review.toggleSpellCheck", isLarge: true },
          { type: "button", commandId: "writer.review.wordCount", isLarge: true }
        ]
      },
      {
        id: "comments",
        label: "Ghi chú",
        labelKey: "writerRibbon.group.comments",
        items: [
          { type: "button", commandId: "writer.comment.insert", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.review.commentDelete" },
              { type: "button", commandId: "writer.review.commentResolve" },
              { type: "button", commandId: "writer.review.commentReply" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.review.commentPrevious" },
              { type: "button", commandId: "writer.review.commentNext" }
            ]
          }
        ]
      },
      {
        id: "tracking",
        label: "Theo dõi thay đổi",
        labelKey: "writerRibbon.group.tracking",
        items: [
          { type: "button", commandId: "writer.trackChanges.toggle", isLarge: true },
          {
            type: "column",
            items: [
              {
                type: "select",
                commandId: "writer.trackChanges.displayMode",
                defaultValue: "all",
                ariaLabel: "Chế độ hiển thị thay đổi",
                options: [
                  { value: "simple", label: "Đánh dấu đơn giản (Simple Markup)" },
                  { value: "all", label: "Tất cả đánh dấu (All Markup)" },
                  { value: "none", label: "Không đánh dấu (No Markup)" },
                  { value: "original", label: "Bản gốc (Original)" }
                ]
              },
              {
                type: "dropdown",
                id: "writer.trackChanges.showMarkup",
                commandId: "writer.trackChanges.showMarkup",
                label: "Hiển thị đánh dấu",
                labelKey: "writerTrackChanges.showMarkup",
                icon: "comment",
                items: [
                  {
                    id: "writer.trackChanges.balloons",
                    commandId: "writer.trackChanges.balloons",
                    label: "Bong bóng",
                    labelKey: "writerTrackChanges.balloons",
                    items: [
                      {
                        commandId: "writer.trackChanges.balloonsRevisions",
                        label: "Hiện bản sửa trong bong bóng",
                        labelKey: "writerTrackChanges.balloonsRevisions"
                      },
                      {
                        commandId: "writer.trackChanges.balloonsInline",
                        label: "Hiện tất cả bản sửa trong dòng",
                        labelKey: "writerTrackChanges.balloonsInline"
                      },
                      {
                        commandId: "writer.trackChanges.balloonsCommentsOnly",
                        label: "Chỉ hiện chú thích và định dạng trong bong bóng",
                        labelKey: "writerTrackChanges.balloonsCommentsOnly"
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.trackChanges.acceptOne" },
              { type: "button", commandId: "writer.trackChanges.acceptAll" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.trackChanges.rejectOne" },
              { type: "button", commandId: "writer.trackChanges.rejectAll" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.trackChanges.previous" },
              { type: "button", commandId: "writer.trackChanges.next" }
            ]
          }
        ]
      },
      {
        id: "documentReview",
        label: "So sánh & Bảo vệ",
        labelKey: "writerRibbon.group.documentReview",
        items: [
          { type: "button", commandId: "writer.review.compare", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.review.combine" },
              { type: "button", commandId: "writer.review.restrictEditing" }
            ]
          }
        ]
      },
      {
        id: "inspect",
        label: "Kiểm tra tài liệu",
        labelKey: "writerRibbon.group.inspect",
        items: [
          { type: "button", commandId: "writer.file.inspectDocument", isLarge: true }
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
        id: "views",
        label: "Dạng xem",
        labelKey: "writerRibbon.group.views",
        items: [
          { type: "button", commandId: "writer.view.readMode", isLarge: true },
          { type: "button", commandId: "writer.view.printLayout", isLarge: true },
          { type: "button", commandId: "writer.view.webLayout", isLarge: true },
          { type: "button", commandId: "writer.view.outline", isLarge: true },
          { type: "button", commandId: "writer.view.draft", isLarge: true }
        ]
      },
      {
        id: "outline",
        label: "Dàn bài",
        labelKey: "writerRibbon.group.outline",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.outline.promote" },
              { type: "button", commandId: "writer.outline.demote" },
              { type: "button", commandId: "writer.view.toggleHeadingCollapse" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.outline.moveUp" },
              { type: "button", commandId: "writer.outline.moveDown" },
              { type: "button", commandId: "writer.outline.close" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.outline.expand" },
              { type: "button", commandId: "writer.outline.collapse" }
            ]
          }
        ]
      },
      {
        id: "show",
        label: "Hiển thị",
        labelKey: "writerRibbon.group.show",
        items: [
          { type: "button", commandId: "writer.view.navigationPane" },
          { type: "button", commandId: "writer.view.ruler" },
          { type: "button", commandId: "writer.view.gridlines" },
          { type: "button", commandId: "writer.view.selectionPane" }
        ]
      },
      {
        id: "zoom",
        label: "Thu phóng",
        labelKey: "writerRibbon.group.zoom",
        items: [
          { type: "button", commandId: "writer.view.zoomIn", isLarge: true },
          { type: "button", commandId: "writer.view.zoom100", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "writer.view.zoomOut" },
              { type: "button", commandId: "writer.view.pageWidth" },
              { type: "button", commandId: "writer.view.zoomReset" }
            ]
          }
        ]
      },
      {
        id: "window",
        label: "Cửa sổ",
        labelKey: "writerRibbon.group.window",
        items: [
          { type: "button", commandId: "writer.view.newWindow", isLarge: true },
          { type: "button", commandId: "writer.view.split", isLarge: true }
        ]
      },
      {
        id: "macro",
        label: "Macro",
        labelKey: "writerRibbon.group.macro",
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
    labelKey: "writerRibbon.tab.help",
    groups: [
      {
        label: "Trợ giúp",
        labelKey: "writerRibbon.group.help",
        items: [
          { type: "button", commandId: "writer.help.open", isLarge: true },
          { type: "about-button", isLarge: true, label: "Giới thiệu" }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý 3T AI",
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
      },
      {
        label: "AI Thông minh",
        labelKey: "writerRibbon.group.aiSmart",
        items: [
          { type: "button", commandId: "ai.voice.input", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarizeMeeting", isLarge: true },
          { type: "button", commandId: "ai.assistant.smartSearch", isLarge: true },
          { type: "button", commandId: "ai.assistant.translate", isLarge: true },
          { type: "button", commandId: "ai.assistant.draftDocument", isLarge: true }
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
  const translateItems = (items = []) => {
    for (const item of items) {
      if (item.labelKey) {
        const translated = t(item.labelKey);
        if (translated && translated !== item.labelKey) item.label = translated;
      }
      for (const option of item.options || []) {
        if (!option.labelKey) continue;
        const translated = t(option.labelKey);
        if (translated && translated !== option.labelKey) option.label = translated;
      }
      if (Array.isArray(item.items)) translateItems(item.items);
    }
  };
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
        translateItems(group.items);
      }
    }
  }
  return tabs;
}
