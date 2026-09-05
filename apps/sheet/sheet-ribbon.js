/**
 * VN Sheet — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 */

export const SHEET_RIBBON_TABS = [
  {
    id: "home",
    label: "Trang đầu",
    labelKey: "sheetRibbon.tab.home",
    groups: [
      {
        id: "clipboard",
        label: "Bảng nhớ tạm",
        labelKey: "sheetRibbon.group.clipboard",
        items: [
          { type: "button", commandId: "common.edit.paste", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.cut" },
              { type: "button", commandId: "common.edit.copy" },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.edit.pasteSpecial" },
                  { type: "button", commandId: "sheet.edit.formatPainter", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "font",
        label: "Phông chữ",
        labelKey: "sheetRibbon.group.font",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  {
                    type: "select",
                    commandId: "sheet.font.family",
                    defaultValue: "Calibri",
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
                    commandId: "sheet.font.size",
                    defaultValue: "11",
                    options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]
                      .map(size => ({ value: String(size), label: String(size) }))
                  },
                  { type: "button", commandId: "sheet.font.grow", iconOnly: true },
                  { type: "button", commandId: "sheet.font.shrink", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.bold", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.italic", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.underline", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.borders", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.fillColor", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.textColor", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "alignment",
        label: "Căn chỉnh",
        labelKey: "sheetRibbon.group.alignment",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.alignTop", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignMiddle", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignBottom", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.alignLeft", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignCenter", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignRight", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.wrapText", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.indentDecrease", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.indentIncrease", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.mergeCenter" },
                  { type: "button", commandId: "sheet.cell.mergeAcross" },
                  { type: "button", commandId: "sheet.cell.mergeCells" },
                  { type: "button", commandId: "sheet.cell.unmerge" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "number",
        label: "Định dạng số",
        labelKey: "sheetRibbon.group.number",
        launcherCommandId: "sheet.format.cellsDialog",
        launcherTooltip: "Định dạng ô (Ctrl+1)",
        items: [
          {
            type: "column",
            items: [
              {
                type: "select",
                commandId: "sheet.format.quickCategory",
                defaultValue: "general",
                options: [
                  { value: "general", label: "Chung" },
                  { value: "number", label: "Số" },
                  { value: "currency", label: "Tiền tệ" },
                  { value: "accounting", label: "Kế toán" },
                  { value: "date", label: "Ngày" },
                  { value: "percentage", label: "Phần trăm" },
                  { value: "scientific", label: "Khoa học" },
                  { value: "text", label: "Văn bản" }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.format.currencyVND", iconOnly: true },
                  { type: "button", commandId: "sheet.format.percent", iconOnly: true },
                  { type: "button", commandId: "sheet.format.increaseDecimal", iconOnly: true },
                  { type: "button", commandId: "sheet.format.decreaseDecimal", iconOnly: true }
                ]
              },
              { type: "button", commandId: "sheet.format.cellsDialog", iconOnly: true }
            ]
          }
        ]
      },
      {
        id: "styles",
        label: "Kiểu ô",
        labelKey: "sheetRibbon.group.styles",
        items: [
          { type: "button", commandId: "sheet.format.conditional", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.style.formatAsTable" },
              { type: "button", commandId: "sheet.style.cellStyles" }
            ]
          }
        ]
      },
      {
        id: "cells",
        label: "Ô",
        labelKey: "sheetRibbon.group.cells",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.row.insert" },
              { type: "button", commandId: "sheet.col.insert" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.row.delete" },
              { type: "button", commandId: "sheet.col.delete" }
            ]
          }
        ]
      },
      {
        id: "editing",
        label: "Chỉnh sửa",
        labelKey: "sheetRibbon.group.editing",
        items: [
          { type: "button", commandId: "sheet.formula.sum", isLarge: true },
          {
            type: "dropdown",
            id: "sheet.edit.fill",
            label: "Điền",
            labelKey: "sheetRibbon.editing.fill",
            icon: "fillDown",
            isLarge: true,
            items: [
              { commandId: "sheet.edit.fillDown" },
              { commandId: "sheet.edit.fillRight" }
            ]
          },
          {
            type: "dropdown",
            id: "sheet.edit.clear",
            label: "Xóa",
            labelKey: "sheetRibbon.editing.clear",
            icon: "clearAll",
            isLarge: true,
            items: [
              { commandId: "sheet.edit.clearAll" },
              { commandId: "sheet.edit.clearFormats" },
              { commandId: "sheet.edit.clearContents" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.data.sortAsc" },
              { type: "button", commandId: "sheet.data.sortDesc" },
              { type: "button", commandId: "sheet.data.filter" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "common.edit.find", iconOnly: true },
              { type: "button", commandId: "common.edit.replace", iconOnly: true }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "formulas",
    label: "Công thức",
    labelKey: "sheetRibbon.tab.formulas",
    groups: [
      {
        label: "Hàm tính toán",
        labelKey: "sheetRibbon.group.functionLibrary",
        items: [
          { type: "button", commandId: "sheet.formula.insertFunction", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.sum" },
              { type: "button", commandId: "sheet.formula.average" },
              { type: "button", commandId: "sheet.formula.countNumbers" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.categoryFinancial" },
              { type: "button", commandId: "sheet.formula.categoryLogical" },
              { type: "button", commandId: "sheet.formula.categoryText" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.categoryDateTime" },
              { type: "button", commandId: "sheet.formula.categoryLookup" },
              { type: "button", commandId: "sheet.formula.categoryMath" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.categoryMore" },
              { type: "button", commandId: "sheet.formula.max" },
              { type: "button", commandId: "sheet.formula.min" }
            ]
          }
        ]
      },
      {
        label: "Tên đã xác định",
        labelKey: "sheetRibbon.group.definedNames",
        items: [
          { type: "button", commandId: "sheet.formula.nameManager", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.defineName" },
              { type: "button", commandId: "sheet.formula.useInFormula" },
              { type: "button", commandId: "sheet.formula.createFromSelection" }
            ]
          }
        ]
      },
      {
        label: "Kiểm tra công thức",
        labelKey: "sheetRibbon.group.formulaAuditing",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.tracePrecedents" },
              { type: "button", commandId: "sheet.formula.traceDependents" },
              { type: "button", commandId: "sheet.formula.removeArrows" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.formula.showFormulas" },
              { type: "button", commandId: "sheet.formula.errorChecking" }
            ]
          },
          { type: "button", commandId: "sheet.formula.watchWindow", isLarge: true }
        ]
      },
      {
        label: "Tính toán",
        labelKey: "sheetRibbon.group.calculation",
        items: [
          {
            type: "column",
            items: [
              {
                type: "select",
                commandId: "sheet.calc.calculationOptions",
                defaultValue: "automatic",
                options: [
                  { value: "automatic", label: "Tự động (Automatic)" },
                  { value: "manual", label: "Thủ công (Manual)" }
                ]
              },
              { type: "button", commandId: "sheet.formula.recalculate" },
              { type: "button", commandId: "sheet.calc.calculateSheet" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "data",
    label: "Dữ liệu",
    labelKey: "sheetRibbon.tab.data",
    groups: [
      {
        label: "Sắp xếp & Lọc",
        labelKey: "sheetRibbon.group.sortFilter",
        items: [
          { type: "button", commandId: "sheet.data.sortAsc", isLarge: true },
          { type: "button", commandId: "sheet.data.sortDesc", isLarge: true },
          { type: "button", commandId: "sheet.data.filter", isLarge: true }
        ]
      },
      {
        label: "Công cụ dữ liệu",
        labelKey: "sheetRibbon.group.dataTools",
        items: [
          { type: "button", commandId: "sheet.data.textToColumns", isLarge: true, icon: `<svg viewBox="0 0 32 32" fill="none"><rect x="3" y="5" width="12" height="22" rx="2" fill="#DCFCE7" stroke="#0F6D38"/><path d="M9 9v14M19 7v18M27 7v18M15 16h14M12 13l4 3-4 3" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
          { type: "column", items: [
            { type: "button", commandId: "sheet.data.flashFill", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.3"/></svg>` },
            { type: "button", commandId: "sheet.data.removeDuplicates", icon: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="14" height="14" rx="2" fill="#DCFCE7" stroke="#0F6D38"/><circle cx="17" cy="17" r="5" fill="#DC2626"/><path d="m15 15 4 4m0-4-4 4" stroke="white" stroke-width="1.6"/></svg>` },
            { type: "button", commandId: "sheet.data.validation" }
          ] },
          {
            type: "button",
            commandId: "sheet.data.goalSeek",
            label: "Dò tìm mục tiêu",
            isLarge: true,
            icon: `<svg viewBox="0 0 32 32" fill="none"><circle cx="14" cy="14" r="10" fill="#DCFCE7" stroke="#0F6D38" stroke-width="2"/><circle cx="14" cy="14" r="5" stroke="#0F6D38" stroke-width="2"/><circle cx="14" cy="14" r="1.8" fill="#0F6D38"/><path d="M21.5 21.5 29 29M24 26h5v-5" stroke="#0F6D38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          }
        ]
      },
      {
        label: "Dàn bài",
        labelKey: "sheetRibbon.group.outline",
        items: [{ type: "column", items: [
          { type: "button", commandId: "sheet.data.group", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 4v16M5 8h4M5 16h4" stroke="#0F6D38" stroke-width="2"/><rect x="10" y="5" width="11" height="14" rx="2" fill="#DCFCE7" stroke="#0F6D38"/><path d="M13 12h5" stroke="#0F6D38" stroke-width="2"/></svg>` },
          { type: "button", commandId: "sheet.data.ungroup", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 4v16" stroke="#64748B" stroke-width="2" stroke-dasharray="2 2"/><rect x="10" y="5" width="11" height="14" rx="2" stroke="#64748B"/><path d="M13 12h5M15.5 9.5v5" stroke="#0F6D38" stroke-width="1.8"/></svg>` },
          { type: "button", commandId: "sheet.data.subtotal", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16M4 9h10M4 14h10M4 20h16" stroke="#334155" stroke-width="1.6"/><path d="M17 9v6m-3-3h6" stroke="#0F6D38" stroke-width="2"/></svg>` }
        ] }]
      },
      {
        label: "Bảng tổng hợp",
        labelKey: "sheetRibbon.group.pivotTable",
        items: [
          { type: "button", commandId: "sheet.data.pivotTable", isLarge: true },
          { type: "button", commandId: "sheet.data.pivotRefresh", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "insert",
    label: "Chèn",
    labelKey: "sheetRibbon.tab.insert",
    groups: [
      {
        label: "Minh họa",
        labelKey: "sheetRibbon.group.illustrations",
        items: [{ type: "button", commandId: "sheet.insert.image", isLarge: true }]
      },
      {
        label: "Biểu đồ",
        labelKey: "sheetRibbon.group.charts",
        items: [{ type: "button", commandId: "sheet.chart.insert", isLarge: true }]
      },
      {
        label: "Biểu đồ thu nhỏ",
        labelKey: "sheetRibbon.group.sparklines",
        items: [
          { type: "button", commandId: "sheet.insert.sparklineLine", isLarge: true },
          { type: "button", commandId: "sheet.insert.sparklineColumn", isLarge: true }
        ]
      },
      {
        label: "Liên kết",
        labelKey: "sheetRibbon.group.links",
        items: [{ type: "button", commandId: "sheet.insert.hyperlink", isLarge: true }]
      },
      {
        label: "Văn bản",
        labelKey: "sheetRibbon.group.text",
        items: [{ type: "button", commandId: "sheet.insert.textbox", isLarge: true }]
      }
    ]
  },
  {
    id: "pageLayout",
    label: "Bố trí trang",
    labelKey: "sheetRibbon.tab.pageLayout",
    groups: [
      {
        label: "Thiết lập trang",
        labelKey: "writerRibbon.group.pageSetup",
        items: [
          { type: "button", commandId: "sheet.page.margins", label: "Lề trang", isLarge: true },
          { type: "button", commandId: "sheet.page.orientation", label: "Hướng trang", isLarge: true },
          { type: "button", commandId: "sheet.page.size", label: "Khổ giấy", isLarge: true },
          { type: "button", commandId: "sheet.page.printTitles", label: "Tiêu đề in", isLarge: true }
        ]
      },
      {
        label: "Vùng in",
        labelKey: "sheetRibbon.group.printArea",
        items: [
          { type: "button", commandId: "sheet.page.setPrintArea", isLarge: true },
          { type: "button", commandId: "sheet.page.clearPrintArea" }
        ]
      },
      {
        label: "Ngắt trang",
        labelKey: "sheetRibbon.group.pageBreaks",
        items: [
          { type: "button", commandId: "sheet.page.insertPageBreak", isLarge: true },
          { type: "button", commandId: "sheet.page.removePageBreak" }
        ]
      }
    ]
  },
  {
    id: "review",
    label: "Xem xét",
    labelKey: "sheetRibbon.tab.review",
    groups: [{ label: "Ghi chú", labelKey: "sheetRibbon.group.comments", items: [{ type: "button", commandId: "sheet.review.commentInsert", isLarge: true }] }]
  },
  {
    id: "view",
    label: "Chế độ xem",
    labelKey: "sheetRibbon.tab.view",
    groups: [
      {
        id: "workbookViews",
        label: "Chế độ xem bảng tính",
        labelKey: "sheetRibbon.group.workbookViews",
        items: [
          { type: "button", commandId: "sheet.view.normal", isLarge: true },
          { type: "button", commandId: "sheet.view.pageBreakPreview", isLarge: true },
          { type: "button", commandId: "sheet.view.pageLayout", isLarge: true }
        ]
      },
      {
        id: "show",
        label: "Hiển thị",
        labelKey: "sheetRibbon.group.show",
        items: [
          { type: "button", commandId: "sheet.view.formulaBar" },
          { type: "button", commandId: "sheet.view.gridlines" },
          { type: "button", commandId: "sheet.view.headings" }
        ]
      },
      {
        id: "zoom",
        label: "Thu phóng",
        labelKey: "sheetRibbon.group.zoom",
        items: [
          { type: "button", commandId: "sheet.view.zoomIn", isLarge: true },
          { type: "button", commandId: "sheet.view.zoomOut" },
          { type: "button", commandId: "sheet.view.zoomReset" },
          { type: "button", commandId: "sheet.view.zoomToSelection" }
        ]
      },
      {
        id: "window",
        label: "Cửa sổ",
        labelKey: "sheetRibbon.group.window",
        items: [
          { type: "button", commandId: "sheet.view.newWindow", isLarge: true },
          { type: "button", commandId: "sheet.view.freezePanes", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý VN AI",
    labelKey: "sheetRibbon.tab.ai",
    groups: [
      {
        label: "Phân tích dữ liệu AI",
        labelKey: "sheetRibbon.group.aiAnalysis",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true }
        ]
      }
    ]
  }
];
