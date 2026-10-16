/**
 * 3T Sheet — Enterprise Ribbon Structure
 * Cấu hình đầy đủ Icon Vector chuẩn Office Suite
 * Parity Round 1: Home, Insert, Page Layout, Formulas
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
        launcherCommandId: "sheet.format.cellsDialog",
        launcherTooltip: "Định dạng ô (Ctrl+1)",
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
        launcherCommandId: "sheet.format.alignmentDialog",
        launcherTooltip: "Căn chỉnh ô (Ctrl+1)",
        items: [
          {
            type: "column",
            items: [
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.alignTop", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignMiddle", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignBottom", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.wrapText", iconOnly: true },
                  {
                    type: "dropdown",
                    id: "sheet.cell.orientation",
                    label: "Hướng chữ",
                    labelKey: "sheetRibbon.alignment.orientation",
                    icon: "textOrientation",
                    items: [
                      { commandId: "sheet.cell.orientation", label: "0°", args: 0 },
                      { commandId: "sheet.cell.orientation", label: "45°", args: 45 },
                      { commandId: "sheet.cell.orientation", label: "-45°", args: -45 },
                      { commandId: "sheet.cell.orientation", label: "90°", args: 90 },
                      { commandId: "sheet.cell.orientation", label: "-90°", args: -90 },
                      { commandId: "sheet.cell.orientation", label: "Dọc từ dưới lên", args: 255 }
                    ]
                  }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.alignLeft", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignCenter", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.alignRight", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.indentDecrease", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.indentIncrease", iconOnly: true }
                ]
              },
              {
                type: "row",
                items: [
                  { type: "button", commandId: "sheet.cell.mergeCenter", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.mergeAcross", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.mergeCells", iconOnly: true },
                  { type: "button", commandId: "sheet.cell.unmerge", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "number",
        label: "Số",
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
                  { type: "button", commandId: "sheet.format.standard", iconOnly: true },
                  { type: "button", commandId: "sheet.format.increaseDecimal", iconOnly: true },
                  { type: "button", commandId: "sheet.format.decreaseDecimal", iconOnly: true },
                  { type: "button", commandId: "sheet.format.cellsDialog", iconOnly: true }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "styles",
        label: "Kiểu",
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
          },
          {
            type: "dropdown",
            id: "sheet.cells.format",
            label: "Định dạng",
            labelKey: "sheetRibbon.cells.format",
            icon: "sheetFormat",
            isLarge: true,
            items: [
              { commandId: "sheet.row.height" },
              { commandId: "sheet.row.autoFit" },
              { commandId: "sheet.col.width" },
              { commandId: "sheet.col.autoFit" },
              { commandId: "sheet.row.hide" },
              { commandId: "sheet.row.unhide" },
              { commandId: "sheet.col.hide" },
              { commandId: "sheet.col.unhide" },
              { commandId: "sheet.sheet.rename" },
              { commandId: "sheet.sheet.moveOrCopy" },
              { commandId: "sheet.sheet.hide" },
              { commandId: "sheet.sheet.unhide" },
              { commandId: "sheet.sheet.protect" }
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
            type: "column",
            items: [
              {
                type: "dropdown",
                id: "sheet.edit.fill",
                label: "Điền",
                labelKey: "sheetRibbon.editing.fill",
                icon: "fillDown",
                items: [
                  { commandId: "sheet.edit.fillDown" },
                  { commandId: "sheet.edit.fillRight" },
                  { commandId: "sheet.edit.fillUp" },
                  { commandId: "sheet.edit.fillLeft" },
                  { commandId: "sheet.edit.fillSeries" },
                  { commandId: "sheet.edit.fillAcrossSheets" },
                  { commandId: "sheet.edit.fillJustify" }
                ]
              },
              {
                type: "dropdown",
                id: "sheet.edit.clear",
                label: "Xóa",
                labelKey: "sheetRibbon.editing.clear",
                icon: "clearAll",
                items: [
                  { commandId: "sheet.edit.clearAll" },
                  { commandId: "sheet.edit.clearFormats" },
                  { commandId: "sheet.edit.clearContents" },
                  { commandId: "sheet.edit.clearComments" },
                  { commandId: "sheet.edit.clearHyperlinks" }
                ]
              }
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
              { type: "button", commandId: "common.edit.replace", iconOnly: true },
              { type: "button", commandId: "sheet.edit.goTo", iconOnly: true }
            ]
          }
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
        id: "tables",
        label: "Bảng",
        labelKey: "sheetRibbon.group.tables",
        items: [
          { type: "button", commandId: "sheet.data.pivotTable", isLarge: true }
        ]
      },
      {
        id: "illustrations",
        label: "Minh họa",
        labelKey: "sheetRibbon.group.illustrations",
        items: [{ type: "button", commandId: "sheet.insert.image", isLarge: true }]
      },
      {
        id: "charts",
        label: "Biểu đồ",
        labelKey: "sheetRibbon.group.charts",
        launcherCommandId: "sheet.chart.insert",
        launcherTooltip: "Chèn biểu đồ",
        items: [
          { type: "button", commandId: "sheet.chart.insert", isLarge: true },
          { type: "button", commandId: "sheet.chart.pivotChart", isLarge: true }
        ]
      },
      {
        id: "sparklines",
        label: "Biểu đồ thu nhỏ",
        labelKey: "sheetRibbon.group.sparklines",
        items: [
          { type: "button", commandId: "sheet.insert.sparklineLine", isLarge: true },
          { type: "button", commandId: "sheet.insert.sparklineColumn", isLarge: true }
        ]
      },
      {
        id: "links",
        label: "Liên kết",
        labelKey: "sheetRibbon.group.links",
        items: [{ type: "button", commandId: "sheet.insert.hyperlink", isLarge: true }]
      },
      {
        id: "text",
        label: "Văn bản",
        labelKey: "sheetRibbon.group.text",
        items: [
          { type: "button", commandId: "sheet.insert.textbox", isLarge: true },
          { type: "button", commandId: "sheet.page.headerFooter", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "pageLayout",
    label: "Bố trí trang",
    labelKey: "sheetRibbon.tab.pageLayout",
    groups: [
      {
        id: "pageSetup",
        label: "Thiết lập trang",
        labelKey: "sheetRibbon.group.pageSetup",
        items: [
          { type: "button", commandId: "sheet.page.margins", isLarge: true },
          { type: "button", commandId: "sheet.page.orientation", isLarge: true },
          { type: "button", commandId: "sheet.page.size", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.page.setPrintArea" },
              { type: "button", commandId: "sheet.page.clearPrintArea" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.page.insertPageBreak" },
              { type: "button", commandId: "sheet.page.removePageBreak" }
            ]
          },
          { type: "button", commandId: "sheet.page.printTitles", isLarge: true }
        ]
      },
      {
        id: "scaleToFit",
        label: "Vừa trang",
        labelKey: "sheetRibbon.group.scaleToFit",
        items: [
          { type: "button", commandId: "sheet.page.scale", isLarge: true }
        ]
      },
      {
        id: "sheetOptions",
        label: "Tùy chọn trang tính",
        labelKey: "sheetRibbon.group.sheetOptions",
        items: [
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.view.gridlines" },
              { type: "button", commandId: "sheet.view.headings" }
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
        id: "functionLibrary",
        label: "Hàm tính toán",
        labelKey: "sheetRibbon.group.functionLibrary",
        launcherCommandId: "sheet.formula.insertFunction",
        launcherTooltip: "Chèn hàm (Shift+F3)",
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
        id: "definedNames",
        label: "Tên đã xác định",
        labelKey: "sheetRibbon.group.definedNames",
        launcherCommandId: "sheet.formula.nameManager",
        launcherTooltip: "Trình quản lý tên (Ctrl+F3)",
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
        id: "formulaAuditing",
        label: "Kiểm tra công thức",
        labelKey: "sheetRibbon.group.formulaAuditing",
        launcherCommandId: "sheet.formula.errorChecking",
        launcherTooltip: "Kiểm tra lỗi công thức",
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
              { type: "button", commandId: "sheet.formula.errorChecking" },
              { type: "button", commandId: "sheet.formula.evaluateFormula" }
            ]
          },
          { type: "button", commandId: "sheet.formula.watchWindow", isLarge: true }
        ]
      },
      {
        id: "calculation",
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
        id: "sortFilter",
        label: "Sắp xếp & Lọc",
        labelKey: "sheetRibbon.group.sortFilter",
        launcherCommandId: "sheet.data.customSort",
        launcherTooltip: "Sắp xếp tùy chỉnh...",
        items: [
          { type: "button", commandId: "sheet.data.sortAsc", isLarge: true },
          { type: "button", commandId: "sheet.data.sortDesc", isLarge: true },
          { type: "button", commandId: "sheet.data.filter", isLarge: true },
          { type: "column", items: [
            { type: "button", commandId: "sheet.data.customSort" },
            { type: "button", commandId: "sheet.data.clearFilter" },
            { type: "button", commandId: "sheet.data.reapplyFilter" },
            { type: "button", commandId: "sheet.data.advancedFilter" }
          ] }
        ]
      },
      {
        id: "dataTools",
        label: "Công cụ dữ liệu",
        labelKey: "sheetRibbon.group.dataTools",
        items: [
          { type: "button", commandId: "sheet.data.textToColumns", isLarge: true, icon: `<svg viewBox="0 0 32 32" fill="none"><rect x="3" y="5" width="12" height="22" rx="2" fill="#DCFCE7" stroke="#0F6D38"/><path d="M9 9v14M19 7v18M27 7v18M15 16h14M12 13l4 3-4 3" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
          { type: "column", items: [
            { type: "button", commandId: "sheet.data.flashFill", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.3"/></svg>` },
            { type: "button", commandId: "sheet.data.removeDuplicates", icon: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="14" height="14" rx="2" fill="#DCFCE7" stroke="#0F6D38"/><circle cx="17" cy="17" r="5" fill="#DC2626"/><path d="m15 15 4 4m0-4-4 4" stroke="white" stroke-width="1.6"/></svg>` },
            { type: "button", commandId: "sheet.data.validation" }
          ] },
          { type: "button", commandId: "sheet.data.consolidate", isLarge: true, icon: `<svg viewBox="0 0 32 32" fill="none"><rect x="3" y="5" width="11" height="9" rx="1.5" fill="#DCFCE7" stroke="#0F6D38"/><rect x="3" y="16" width="11" height="9" rx="1.5" fill="#DCFCE7" stroke="#0F6D38"/><rect x="18" y="8" width="11" height="16" rx="1.5" fill="#F0FDF4" stroke="#0F6D38"/><path d="M14 9.5h3M14 20.5h3M17 9.5v11" stroke="#0F6D38" stroke-width="1.6" stroke-linecap="round"/><path d="M21 13h5M21 16h5M21 19h5" stroke="#0F6D38" stroke-width="1.4" stroke-linecap="round"/></svg>` },
          { type: "dropdown", id: "sheet-what-if-analysis", label: "Phân tích What-If", labelKey: "sheetRibbon.whatIfAnalysis", icon: "whatIfAnalysis", isLarge: true, items: [
            { commandId: "sheet.data.goalSeek" },
            { commandId: "sheet.data.dataTable" },
            { commandId: "sheet.data.scenarioManager" }
          ] }
        ]
      },
      {
        id: "outline",
        label: "Dàn bài",
        labelKey: "sheetRibbon.group.outline",
        items: [{ type: "column", items: [
          { type: "button", commandId: "sheet.data.group", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 4v16M5 8h4M5 16h4" stroke="#0F6D38" stroke-width="2"/><rect x="10" y="5" width="11" height="14" rx="2" fill="#DCFCE7" stroke="#0F6D38"/><path d="M13 12h5" stroke="#0F6D38" stroke-width="2"/></svg>` },
          { type: "button", commandId: "sheet.data.ungroup", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 4v16" stroke="#64748B" stroke-width="2" stroke-dasharray="2 2"/><rect x="10" y="5" width="11" height="14" rx="2" stroke="#64748B"/><path d="M13 12h5M15.5 9.5v5" stroke="#0F6D38" stroke-width="1.8"/></svg>` },
          { type: "button", commandId: "sheet.data.subtotal", icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16M4 9h10M4 14h10M4 20h16" stroke="#334155" stroke-width="1.6"/><path d="M17 9v6m-3-3h6" stroke="#0F6D38" stroke-width="2"/></svg>` }
        ] }]
      },
      {
        id: "pivotTable",
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
    id: "review",
    label: "Xem xét",
    labelKey: "sheetRibbon.tab.review",
    groups: [
      {
        id: "proofing",
        label: "Kiểm lỗi",
        labelKey: "sheetRibbon.group.proofing",
        items: [
          { type: "button", commandId: "sheet.review.spellCheck", isLarge: true },
          { type: "button", commandId: "sheet.review.toggleSpellCheck", isLarge: true }
        ]
      },
      {
        id: "comments",
        label: "Ghi chú",
        labelKey: "sheetRibbon.group.comments",
        items: [
          { type: "button", commandId: "sheet.review.commentInsert", isLarge: true },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.review.commentDelete" },
              { type: "button", commandId: "sheet.review.commentResolve" }
            ]
          },
          {
            type: "column",
            items: [
              { type: "button", commandId: "sheet.review.commentPrevious" },
              { type: "button", commandId: "sheet.review.commentNext" }
            ]
          }
        ]
      },
      {
        id: "protection",
        label: "Bảo vệ",
        labelKey: "sheetRibbon.group.protection",
        items: [
          { type: "button", commandId: "sheet.sheet.protect", isLarge: true },
          { type: "button", commandId: "sheet.workbook.protect", isLarge: true }
        ]
      }
    ]
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
          { type: "button", commandId: "sheet.view.pageLayout", isLarge: true },
          { type: "button", commandId: "sheet.file.printPreview", isLarge: true }
        ]
      },
      {
        id: "show",
        label: "Hiển thị",
        labelKey: "sheetRibbon.group.show",
        items: [
          { type: "button", commandId: "sheet.view.gridlines" },
          { type: "button", commandId: "sheet.view.formulaBar" },
          { type: "button", commandId: "sheet.view.headings" }
        ]
      },
      {
        id: "zoom",
        label: "Thu phóng",
        labelKey: "sheetRibbon.group.zoom",
        items: [
          { type: "button", commandId: "sheet.view.zoomIn", isLarge: true },
          { type: "button", commandId: "sheet.view.zoomReset", isLarge: true },
          { type: "button", commandId: "sheet.view.zoomToSelection", isLarge: true },
          { type: "button", commandId: "sheet.view.zoomOut", isLarge: true }
        ]
      },
      {
        id: "window",
        label: "Cửa sổ",
        labelKey: "sheetRibbon.group.window",
        items: [
          { type: "button", commandId: "sheet.view.newWindow", isLarge: true },
          {
            type: "dropdown",
            id: "sheet.view.freezePanesMenu",
            label: "Cố định ô",
            labelKey: "sheetRibbon.window.freezePanes",
            icon: "freezePanes",
            isLarge: true,
            items: [
              { commandId: "sheet.view.freezePanes" },
              { commandId: "sheet.view.freezeTopRow" },
              { commandId: "sheet.view.freezeFirstColumn" }
            ]
          },
          { type: "button", commandId: "sheet.view.split", isLarge: true }
        ]
      },
      {
        id: "macro",
        label: "Macro",
        labelKey: "sheetRibbon.group.macro",
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
    labelKey: "sheetRibbon.tab.help",
    groups: [
      {
        label: "Trợ giúp",
        labelKey: "sheetRibbon.group.help",
        items: [
          { type: "button", commandId: "sheet.help.open", isLarge: true },
          { type: "about-button", isLarge: true, label: "Giới thiệu" }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "Trợ lý 3T AI",
    labelKey: "sheetRibbon.tab.ai",
    groups: [
      {
        label: "Phân tích dữ liệu AI",
        labelKey: "sheetRibbon.group.aiAnalysis",
        items: [
          { type: "button", commandId: "ai.assistant.toggle", isLarge: true },
          { type: "button", commandId: "ai.assistant.summarize", isLarge: true },
          { type: "button", commandId: "sheet.ai.explainFormula", isLarge: true },
          { type: "button", commandId: "sheet.ai.formulaFromDescription", isLarge: true }
        ]
      }
    ]
  },
  {
    id: "tableDesign",
    label: "Thiết kế Bảng",
    labelKey: "sheetRibbon.tab.tableDesign",
    contextual: true,
    groups: [
      {
        id: "properties",
        label: "Thuộc tính bảng",
        labelKey: "sheetRibbon.group.properties",
        items: [
          { type: "button", commandId: "sheet.table.resize", isLarge: true }
        ]
      },
      {
        id: "tableStyleOptions",
        label: "Tùy chọn kiểu bảng",
        labelKey: "sheetRibbon.group.tableStyleOptions",
        items: [
          { type: "button", commandId: "sheet.table.toggleTotalRow" }
        ]
      },
      {
        id: "tools",
        label: "Công cụ",
        labelKey: "sheetRibbon.group.tools",
        items: [
          { type: "button", commandId: "sheet.table.convertToRange", isLarge: true }
        ]
      }
    ]
  }
];
