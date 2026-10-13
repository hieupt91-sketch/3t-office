# Rà soát từng nút ribbon VN Writer (13/10)

Công cụ: `tests/live/cdp/writer-ribbon-runtime-audit.desktop.mjs` (chạy mọi lệnh ribbon trong app desktop, so sánh DOM và thông báo) và `writer-ribbon-state-probe.desktop.mjs` (so sánh trạng thái tài liệu chi tiết). `scripts/audit-0610/ribbon_command_audit.mjs writer` kiểm tra tĩnh lệnh nào chưa có handler.

Kết quả: 176 lệnh ribbon duy nhất; 0 lệnh thiếu handler; 5 lệnh bỏ qua có chủ đích (in/thoát/macro); 10 lệnh bị vô hiệu hóa có chủ đích (chưa có người nhận trộn thư / chưa có thay đổi theo dõi); 0 lệnh ném ngoại lệ (THREW = 0); 0 nút im lặng còn lại.

## Các nút đã được sửa để không còn im lặng (trả false phải có thông báo lý do)

| Nhóm chức năng / Lệnh | Trước | Sau |
|---|---|---|
| Thao tác Bảng (chèn/xóa hàng cột, gộp/tách ô, tự khớp, căn lề, viền, hàng tiêu đề/so le) | im lặng khi không có ô bảng active | thông báo lý do đặt con trỏ vào bảng |
| Nhận xét (Xóa, Giải quyết, Trả lời, Trước, Sau) | im lặng khi tài liệu chưa có nhận xét | thông báo lý do: Tài liệu chưa có nhận xét |
| Đổi chữ hoa / chữ thường (`writer.text.changeCase`) | im lặng khi chưa chọn chữ | thông báo lý do: Hãy chọn đoạn văn bản cần đổi chữ hoa / chữ thường |
| Xóa trang bìa (`writer.insert.removeCoverPage`) | im lặng khi tài liệu không có trang bìa | thông báo lý do: Tài liệu hiện tại không có trang bìa để xóa |
| Chữ hoa đầu dòng (`writer.format.dropCap`) | im lặng khi đoạn không có ký tự hợp lệ | thông báo lý do: Hãy đặt con trỏ vào đoạn văn có chữ |
| Đánh số lại từ 1 / Tiếp tục đánh số | im lặng ngoài danh sách có thứ tự | thông báo lý do: Hãy đặt con trỏ vào danh sách có thứ tự |
| Xóa ngắt phần (`writer.section.delete`) | im lặng khi không có ngắt phần | thông báo lý do: Không có dấu ngắt phần ở vị trí hiện tại |
| Danh sách nhiều cấp (`writer.para.multilevelList`) | trả false khi bấm không đối số | tự động áp dụng kiểu số mặc định (1. / 1.1. / 1.1.1.) |
| Định dạng gạch chân / nghiêng / đậm / gạch ngang / chỉ số | trả false khi bỏ định dạng | trả true thành công, cập nhật trạng thái UI |
| Bật/tắt kiểm tra chính tả | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Thước đo / Đường lưới | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Cửa sổ mới (`writer.view.newWindow`) | không có thông báo khi bị chặn | thông báo lý do khi không mở được trong app desktop |

## Còn thiếu thật (cần làm tiếp, không phải chỉ thông báo)
- **Cửa sổ mới (View > New Window)**: App desktop cần API mở cửa sổ thứ hai cùng xem một tệp tài liệu đang mở (multi-window sync view) — đã ghi vào `docs/RIBBON-BACKLOG.md`.

## Danh sách toàn bộ 176 lệnh ribbon

| Tab | Nhóm | Lệnh | Kết quả |
|---|---|---|---|
| home | clipboard | common.edit.paste | OK |
| home | clipboard | common.edit.cut | OK |
| home | clipboard | common.edit.copy | OK |
| home | clipboard | common.edit.formatPainter | OK |
| home | clipboard | writer.edit.pasteSpecial | OK |
| home | font | writer.font.family | OK |
| home | font | writer.font.size | OK |
| home | font | writer.font.grow | OK |
| home | font | writer.font.shrink | OK |
| home | font | writer.text.bold | OK |
| home | font | writer.text.italic | OK |
| home | font | writer.text.underline | OK |
| home | font | writer.text.strike | OK |
| home | font | writer.text.subscript | OK |
| home | font | writer.text.superscript | OK |
| home | font | writer.text.changeCase | chỉ thông báo |
| home | font | writer.text.clearFormat | OK |
| home | font | writer.color.highlight | OK |
| home | font | writer.color.text | OK |
| home | paragraph | writer.format.paragraphDialog | OK |
| home | paragraph | writer.list.bullet | OK |
| home | paragraph | writer.list.numbered | OK |
| home | paragraph | writer.para.multilevelList | OK |
| home | paragraph | writer.para.indentDec | OK |
| home | paragraph | writer.para.indentInc | OK |
| home | paragraph | writer.para.sort | chỉ thông báo |
| home | paragraph | writer.para.showFormattingMarks | OK |
| home | paragraph | writer.list.restartNumbering | OK |
| home | paragraph | writer.list.continueNumbering | OK |
| home | paragraph | writer.para.alignLeft | OK |
| home | paragraph | writer.para.alignCenter | OK |
| home | paragraph | writer.para.alignRight | OK |
| home | paragraph | writer.para.justify | OK |
| home | paragraph | writer.para.spacing1 | OK |
| home | paragraph | writer.para.spacing15 | OK |
| home | paragraph | writer.para.spacing2 | OK |
| home | paragraph | writer.para.lineSpacing | OK |
| home | paragraph | writer.para.shading | OK |
| home | paragraph | writer.para.borders | OK |
| home | undefined | writer.style.gallery | OK |
| home | editing | common.edit.find | OK |
| home | editing | common.edit.replace | OK |
| home | editing | common.edit.selectAll | OK |
| insert | pages | writer.insert.coverPage | OK |
| insert | pages | writer.insert.removeCoverPage | chỉ thông báo |
| insert | pages | writer.page.blank | OK |
| insert | pages | writer.page.break | OK |
| insert | tables | writer.table.insert | OK |
| insert | tables | writer.table.fromText | chỉ thông báo |
| insert | illustrations | writer.image.insert | OK |
| insert | illustrations | writer.shape.insert | OK |
| insert | illustrations | writer.diagram.insert | OK |
| insert | illustrations | writer.chart.insert | OK |
| insert | links | common.edit.hyperlink | OK |
| insert | links | writer.insert.bookmark | OK |
| insert | links | writer.insert.crossReference | OK |
| insert | comments | writer.comment.insert | OK |
| insert | headerFooter | writer.header.insert | OK |
| insert | headerFooter | writer.footer.insert | OK |
| insert | text | writer.insert.textbox | OK |
| insert | text | writer.insert.wordart | OK |
| insert | text | writer.format.dropCap | chỉ thông báo |
| insert | text | writer.insert.dateTime | OK |
| insert | symbols | writer.insert.equation | OK |
| insert | symbols | writer.insert.symbol | OK |
| design | documentFormatting | writer.design.themeGallery | OK |
| design | pageBackground | writer.page.watermark | OK |
| design | pageBackground | writer.page.color | OK |
| design | pageBackground | writer.page.border | OK |
| layout | pageSetup | writer.page.setupDialog | OK |
| layout | pageSetup | writer.page.margins | OK |
| layout | pageSetup | writer.page.orientation | OK |
| layout | pageSetup | writer.page.size | OK |
| layout | pageSetup | writer.page.columns | OK |
| layout | pageSetup | writer.page.columns1 | OK |
| layout | pageSetup | writer.page.columns2 | OK |
| layout | pageSetup | writer.page.columns3 | OK |
| layout | pageSetup | writer.break.column | OK |
| layout | pageSetup | writer.section.nextPage | OK |
| layout | pageSetup | writer.section.continuous | OK |
| layout | pageSetup | writer.section.evenPage | OK |
| layout | pageSetup | writer.section.oddPage | OK |
| layout | pageSetup | writer.layout.lineNumbers | OK |
| layout | pageSetup | writer.section.options | OK |
| layout | pageSetup | writer.pageNumber.format | OK |
| layout | pageSetup | writer.section.delete | OK |
| layout | paragraph | writer.para.firstLineIndent | OK |
| layout | paragraph | writer.para.spacingBefore | OK |
| layout | paragraph | writer.para.spacingAfter | OK |
| layout | print | common.file.print | SKIPPED |
| layout | print | writer.file.printPreview | SKIPPED |
| tableDesign | tableStyleOptions | writer.table.toggleHeaderRow | OK |
| tableDesign | tableStyleOptions | writer.table.toggleBandedRows | OK |
| tableDesign | tableBordersShading | writer.table.cellBg | OK |
| tableDesign | tableBordersShading | writer.table.bordersAll | OK |
| tableDesign | tableBordersShading | writer.table.bordersOutside | OK |
| tableDesign | tableBordersShading | writer.table.bordersInside | OK |
| tableDesign | tableBordersShading | writer.table.bordersNone | OK |
| tableLayout | tableSelectGroup | writer.table.selectCell | OK |
| tableLayout | tableSelectGroup | writer.table.selectRow | OK |
| tableLayout | tableSelectGroup | writer.table.selectCol | OK |
| tableLayout | tableSelectGroup | writer.table.selectTable | OK |
| tableLayout | tableSelectGroup | writer.table.deleteTable | OK |
| tableLayout | tableRowsColsGroup | writer.table.insertRowAbove | chỉ thông báo |
| tableLayout | tableRowsColsGroup | writer.table.insertRowBelow | chỉ thông báo |
| tableLayout | tableRowsColsGroup | writer.table.deleteRow | chỉ thông báo |
| tableLayout | tableRowsColsGroup | writer.table.insertColLeft | chỉ thông báo |
| tableLayout | tableRowsColsGroup | writer.table.insertColRight | chỉ thông báo |
| tableLayout | tableRowsColsGroup | writer.table.deleteCol | chỉ thông báo |
| tableLayout | tableMergeGroup | writer.table.mergeCells | chỉ thông báo |
| tableLayout | tableMergeGroup | writer.table.splitCells | chỉ thông báo |
| tableLayout | tableSizeGroup | writer.table.autoFitContents | chỉ thông báo |
| tableLayout | tableSizeGroup | writer.table.autoFitWindow | chỉ thông báo |
| tableLayout | tableSizeGroup | writer.table.distributeRows | chỉ thông báo |
| tableLayout | tableSizeGroup | writer.table.distributeCols | chỉ thông báo |
| tableLayout | tableAlignGroup | writer.table.alignTop | chỉ thông báo |
| tableLayout | tableAlignGroup | writer.table.alignMiddle | chỉ thông báo |
| tableLayout | tableAlignGroup | writer.table.alignBottom | chỉ thông báo |
| references | tableOfContents | writer.reference.tocInsert | OK |
| references | tableOfContents | writer.reference.tocUpdate | OK |
| references | footnotes | writer.reference.footnoteInsert | OK |
| references | footnotes | writer.reference.endnoteInsert | OK |
| references | citationsBibliography | writer.reference.citationInsert | OK |
| references | citationsBibliography | writer.reference.sourcesManage | OK |
| references | citationsBibliography | writer.reference.citationStyle | OK |
| references | citationsBibliography | writer.reference.bibliographyInsert | chỉ thông báo |
| references | captions | writer.reference.captionInsert | OK |
| references | captions | writer.reference.tofInsert | OK |
| references | captions | writer.reference.tofUpdate | OK |
| mailings | createMailings | writer.mailings.envelopes | OK |
| mailings | createMailings | writer.mailings.labels | OK |
| mailings | startMerge | writer.mailMerge.open | OK |
| mailings | writeInsert | writer.mailMerge.insertField | OK |
| mailings | writeInsert | writer.mailMerge.ifRule | OK |
| mailings | previewResults | writer.mailMerge.preview | DISABLED |
| mailings | previewResults | writer.mailMerge.prevRecord | DISABLED |
| mailings | previewResults | writer.mailMerge.nextRecord | DISABLED |
| mailings | finishMerge | writer.mailMerge.finish | DISABLED |
| review | proofread | ai.assistant.grammarCheck | OK |
| review | proofread | writer.review.toggleSpellCheck | OK |
| review | proofread | writer.review.wordCount | OK |
| review | comments | writer.review.commentDelete | chỉ thông báo |
| review | comments | writer.review.commentResolve | chỉ thông báo |
| review | comments | writer.review.commentReply | chỉ thông báo |
| review | comments | writer.review.commentPrevious | chỉ thông báo |
| review | comments | writer.review.commentNext | chỉ thông báo |
| review | tracking | writer.trackChanges.toggle | OK |
| review | tracking | writer.trackChanges.acceptOne | DISABLED |
| review | tracking | writer.trackChanges.acceptAll | DISABLED |
| review | tracking | writer.trackChanges.rejectOne | DISABLED |
| review | tracking | writer.trackChanges.rejectAll | DISABLED |
| review | tracking | writer.trackChanges.previous | DISABLED |
| review | tracking | writer.trackChanges.next | DISABLED |
| view | views | writer.view.readMode | OK |
| view | views | writer.view.printLayout | SKIPPED |
| view | views | writer.view.webLayout | OK |
| view | show | writer.view.navigationPane | OK |
| view | show | writer.view.ruler | OK |
| view | show | writer.view.gridlines | OK |
| view | zoom | writer.view.zoomIn | OK |
| view | zoom | writer.view.zoom100 | OK |
| view | zoom | writer.view.zoomOut | OK |
| view | zoom | writer.view.pageWidth | OK |
| view | zoom | writer.view.zoomReset | OK |
| view | window | writer.view.newWindow | OK |
| view | macro | common.macro.recordToggle | SKIPPED |
| view | macro | common.macro.manager | SKIPPED |
| help | undefined | writer.help.open | OK |
| ai | undefined | ai.assistant.toggle | OK |
| ai | undefined | ai.assistant.summarize | OK |
| ai | undefined | ai.assistant.rewrite | OK |
| ai | undefined | ai.voice.input | OK |
| ai | undefined | ai.assistant.summarizeMeeting | OK |
| ai | undefined | ai.assistant.smartSearch | OK |
| ai | undefined | ai.assistant.translate | OK |
| ai | undefined | ai.assistant.draftDocument | OK |
