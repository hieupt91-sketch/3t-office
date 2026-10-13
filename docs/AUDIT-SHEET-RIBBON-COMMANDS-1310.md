# Rà soát từng nút ribbon VN Sheet (13/10)

Công cụ: 	ests/live/cdp/sheet-ribbon-runtime-audit.desktop.mjs (chạy mọi lệnh ribbon trong app desktop, so sánh DOM) và sheet-ribbon-state-probe.desktop.mjs (so sánh toàn bộ trạng thái lưới, ghi giá trị trả về và thông báo). scripts/audit-0610/ribbon_command_audit.mjs kiểm tra tĩnh lệnh nào chưa có handler.

Kết quả: 157 lệnh ribbon duy nhất; 0 lệnh thiếu handler; 4 lệnh bỏ qua có chủ đích (mở/lưu/in/thoát). Đã phát hiện **nút bấm im lặng** (trả false không thông báo) và đã sửa ở nhánh ix/sheet-silent-false-notices:

| Lệnh | Trước | Sau |
|---|---|---|
| Bỏ gộp ô | im lặng khi không có ô gộp | thông báo lý do |
| Tùy chọn tính toán | trả false khi bấm không đối số | chuyển tự động/thủ công + thông báo |
| Nhóm | im lặng nếu chọn vùng ô (không phải cả hàng/cột) | nhóm theo hàng (≥2 hàng) hoặc cột; thông báo nếu không hợp lệ |
| Bỏ nhóm | im lặng | thông báo |
| Làm mới Pivot | im lặng ngoài trang Pivot | thông báo |
| Ghi chú: Xóa / Giải quyết / Trước / Sau | im lặng khi không có ghi chú | thông báo |
| Cửa sổ mới | im lặng trong app desktop | thông báo (chưa có chức năng thật) |

## Còn thiếu thật (cần làm tiếp, không phải chỉ thông báo)
- **Cửa sổ mới (View > New Window)**: app desktop chưa mở được cửa sổ thứ hai của cùng tệp (cần API main.py mở tiến trình/cửa sổ mới).
- **Nhóm trên vùng ô**: Excel hỏi Hàng/Cột bằng hộp thoại; hiện chọn tự động theo vùng.
- Các mục còn lại của bảng kiểm 216 mục (docs/EXCEL2016-FEATURE-CHECKLIST.md) vẫn áp dụng.

## Danh sách 157 lệnh (kết quả vòng 1, so sánh DOM)

| Tab | Nhóm | Lệnh | Vòng 1 |
|---|---|---|---|
| home | clipboard | common.edit.paste | OK |
| home | clipboard | common.edit.cut | OK |
| home | clipboard | common.edit.copy | OK |
| home | clipboard | sheet.edit.pasteSpecial | OK |
| home | clipboard | sheet.edit.formatPainter | OK |
| home | font | sheet.format.cellsDialog | OK |
| home | font | sheet.font.family | OK |
| home | font | sheet.font.size | OK |
| home | font | sheet.font.grow | OK |
| home | font | sheet.font.shrink | OK |
| home | font | sheet.cell.bold | OK |
| home | font | sheet.cell.italic | OK |
| home | font | sheet.cell.underline | OK |
| home | font | sheet.cell.borders | OK |
| home | font | sheet.cell.fillColor | OK |
| home | font | sheet.cell.textColor | OK |
| home | alignment | sheet.format.alignmentDialog | OK |
| home | alignment | sheet.cell.alignTop | OK |
| home | alignment | sheet.cell.alignMiddle | OK |
| home | alignment | sheet.cell.alignBottom | OK |
| home | alignment | sheet.cell.wrapText | OK |
| home | alignment | sheet.cell.orientation | OK |
| home | alignment | sheet.cell.alignLeft | OK |
| home | alignment | sheet.cell.alignCenter | OK |
| home | alignment | sheet.cell.alignRight | OK |
| home | alignment | sheet.cell.indentDecrease | OK |
| home | alignment | sheet.cell.indentIncrease | OK |
| home | alignment | sheet.cell.mergeCenter | NO_VISIBLE_EFFECT |
| home | alignment | sheet.cell.mergeAcross | NO_VISIBLE_EFFECT |
| home | alignment | sheet.cell.mergeCells | NO_VISIBLE_EFFECT |
| home | alignment | sheet.cell.unmerge | NO_VISIBLE_EFFECT |
| home | number | sheet.format.quickCategory | NO_VISIBLE_EFFECT |
| home | number | sheet.format.currencyVND | NO_VISIBLE_EFFECT |
| home | number | sheet.format.percent | NO_VISIBLE_EFFECT |
| home | number | sheet.format.standard | NO_VISIBLE_EFFECT |
| home | number | sheet.format.increaseDecimal | NO_VISIBLE_EFFECT |
| home | number | sheet.format.decreaseDecimal | NO_VISIBLE_EFFECT |
| home | styles | sheet.format.conditional | OK |
| home | styles | sheet.style.formatAsTable | OK |
| home | styles | sheet.style.cellStyles | OK |
| home | cells | sheet.row.insert | OK |
| home | cells | sheet.col.insert | NO_VISIBLE_EFFECT |
| home | cells | sheet.row.delete | NO_VISIBLE_EFFECT |
| home | cells | sheet.col.delete | OK |
| home | cells | sheet.row.height | OK |
| home | cells | sheet.row.autoFit | OK |
| home | cells | sheet.col.width | OK |
| home | cells | sheet.col.autoFit | NO_VISIBLE_EFFECT |
| home | cells | sheet.row.hide | OK |
| home | cells | sheet.row.unhide | OK |
| home | cells | sheet.col.hide | OK |
| home | cells | sheet.col.unhide | OK |
| home | cells | sheet.sheet.rename | OK |
| home | cells | sheet.sheet.moveOrCopy | OK |
| home | cells | sheet.sheet.hide | OK |
| home | cells | sheet.sheet.unhide | OK |
| home | cells | sheet.sheet.protect | OK |
| home | editing | sheet.formula.sum | OK |
| home | editing | sheet.edit.fillDown | OK |
| home | editing | sheet.edit.fillRight | NO_VISIBLE_EFFECT |
| home | editing | sheet.edit.clearAll | OK |
| home | editing | sheet.edit.clearFormats | NO_VISIBLE_EFFECT |
| home | editing | sheet.edit.clearContents | OK |
| home | editing | sheet.data.sortAsc | OK |
| home | editing | sheet.data.sortDesc | OK |
| home | editing | sheet.data.filter | OK |
| home | editing | common.edit.find | OK |
| home | editing | common.edit.replace | OK |
| home | editing | sheet.edit.goTo | OK |
| insert | tables | sheet.data.pivotTable | OK |
| insert | illustrations | sheet.insert.image | OK |
| insert | charts | sheet.chart.insert | OK |
| insert | charts | sheet.chart.pivotChart | OK |
| insert | sparklines | sheet.insert.sparklineLine | OK |
| insert | sparklines | sheet.insert.sparklineColumn | OK |
| insert | links | sheet.insert.hyperlink | OK |
| insert | text | sheet.insert.textbox | OK |
| insert | text | sheet.page.headerFooter | OK |
| pageLayout | pageSetup | sheet.page.margins | OK |
| pageLayout | pageSetup | sheet.page.orientation | OK |
| pageLayout | pageSetup | sheet.page.size | OK |
| pageLayout | pageSetup | sheet.page.setPrintArea | OK |
| pageLayout | pageSetup | sheet.page.clearPrintArea | OK |
| pageLayout | pageSetup | sheet.page.insertPageBreak | OK |
| pageLayout | pageSetup | sheet.page.removePageBreak | OK |
| pageLayout | pageSetup | sheet.page.printTitles | SKIPPED |
| pageLayout | scaleToFit | sheet.page.scale | OK |
| pageLayout | sheetOptions | sheet.view.gridlines | OK |
| pageLayout | sheetOptions | sheet.view.headings | OK |
| formulas | functionLibrary | sheet.formula.insertFunction | OK |
| formulas | functionLibrary | sheet.formula.average | NO_VISIBLE_EFFECT |
| formulas | functionLibrary | sheet.formula.countNumbers | NO_VISIBLE_EFFECT |
| formulas | functionLibrary | sheet.formula.categoryFinancial | OK |
| formulas | functionLibrary | sheet.formula.categoryLogical | OK |
| formulas | functionLibrary | sheet.formula.categoryText | OK |
| formulas | functionLibrary | sheet.formula.categoryDateTime | OK |
| formulas | functionLibrary | sheet.formula.categoryLookup | OK |
| formulas | functionLibrary | sheet.formula.categoryMath | OK |
| formulas | functionLibrary | sheet.formula.categoryMore | OK |
| formulas | functionLibrary | sheet.formula.max | NO_VISIBLE_EFFECT |
| formulas | functionLibrary | sheet.formula.min | NO_VISIBLE_EFFECT |
| formulas | definedNames | sheet.formula.nameManager | OK |
| formulas | definedNames | sheet.formula.defineName | OK |
| formulas | definedNames | sheet.formula.useInFormula | OK |
| formulas | definedNames | sheet.formula.createFromSelection | OK |
| formulas | formulaAuditing | sheet.formula.errorChecking | OK |
| formulas | formulaAuditing | sheet.formula.tracePrecedents | NO_VISIBLE_EFFECT |
| formulas | formulaAuditing | sheet.formula.traceDependents | OK |
| formulas | formulaAuditing | sheet.formula.removeArrows | OK |
| formulas | formulaAuditing | sheet.formula.showFormulas | OK |
| formulas | formulaAuditing | sheet.formula.evaluateFormula | OK |
| formulas | formulaAuditing | sheet.formula.watchWindow | OK |
| formulas | calculation | sheet.calc.calculationOptions | NO_VISIBLE_EFFECT |
| formulas | calculation | sheet.formula.recalculate | OK |
| formulas | calculation | sheet.calc.calculateSheet | OK |
| data | sortFilter | sheet.data.customSort | OK |
| data | dataTools | sheet.data.textToColumns | OK |
| data | dataTools | sheet.data.flashFill | OK |
| data | dataTools | sheet.data.removeDuplicates | OK |
| data | dataTools | sheet.data.validation | OK |
| data | dataTools | sheet.data.consolidate | OK |
| data | dataTools | sheet.data.goalSeek | OK |
| data | dataTools | sheet.data.dataTable | OK |
| data | dataTools | sheet.data.scenarioManager | OK |
| data | outline | sheet.data.group | NO_VISIBLE_EFFECT |
| data | outline | sheet.data.ungroup | NO_VISIBLE_EFFECT |
| data | outline | sheet.data.subtotal | OK |
| data | pivotTable | sheet.data.pivotRefresh | NO_VISIBLE_EFFECT |
| review | proofing | sheet.review.spellCheck | OK |
| review | proofing | sheet.review.toggleSpellCheck | OK |
| review | comments | sheet.review.commentInsert | OK |
| review | comments | sheet.review.commentDelete | NO_VISIBLE_EFFECT |
| review | comments | sheet.review.commentResolve | NO_VISIBLE_EFFECT |
| review | comments | sheet.review.commentPrevious | NO_VISIBLE_EFFECT |
| review | comments | sheet.review.commentNext | NO_VISIBLE_EFFECT |
| review | protection | sheet.workbook.protect | OK |
| view | workbookViews | sheet.view.normal | NO_VISIBLE_EFFECT |
| view | workbookViews | sheet.view.pageBreakPreview | OK |
| view | workbookViews | sheet.view.pageLayout | OK |
| view | workbookViews | sheet.file.printPreview | SKIPPED |
| view | show | sheet.view.formulaBar | OK |
| view | zoom | sheet.view.zoomIn | OK |
| view | zoom | sheet.view.zoomReset | OK |
| view | zoom | sheet.view.zoomToSelection | OK |
| view | zoom | sheet.view.zoomOut | OK |
| view | window | sheet.view.newWindow | NO_VISIBLE_EFFECT |
| view | window | sheet.view.freezePanes | OK |
| view | window | sheet.view.freezeTopRow | OK |
| view | window | sheet.view.freezeFirstColumn | OK |
| view | window | sheet.view.split | OK |
| view | macro | common.macro.recordToggle | SKIPPED |
| view | macro | common.macro.manager | SKIPPED |
| help |  | sheet.help.open | OK |
| ai |  | ai.assistant.toggle | OK |
| ai |  | ai.assistant.summarize | OK |
| ai |  | sheet.ai.explainFormula | OK |
| ai |  | sheet.ai.formulaFromDescription | OK |
