# Sheet: bảng đối chiếu từng nút ribbon với Excel (11/10/2026)

Nguồn nút: `docs/ribbon-scan-sheet-1011.json`. Chỉ đánh dấu **KHỚP EXCEL** khi thao tác UI và Excel COM đọc lại XLSX đã có bằng chứng; phản ứng DOM không đủ.
- **KHỚP EXCEL**: thao tác tương đương và thuộc tính/giá trị từ XLSX được Excel đọc lại khớp.
- **KHÁC CÓ CHỦ Ý**: khác biệt được thiết kế có chủ ý và có giải thích.
- **LỆCH ĐÃ BIẾT**: sai khác đã được tái hiện và còn tồn tại.
- **CHƯA ĐỐI CHIẾU**: chưa có đối chiếu Excel đủ chứng cứ.
Tổng 138 nút — KHỚP EXCEL: 42 · CHƯA ĐỐI CHIẾU: 96.

Các nút nguy hiểm/ngoại tuyến hoặc nút AI không được chạy trong lượt này sẽ giữ **CHƯA ĐỐI CHIẾU** cho tới khi có phép thử an toàn và xác định rõ luồng dữ liệu.

| Tab | Lệnh | Nút | Trạng thái | Ghi chú / chứng cứ | Phản ứng scan |
|---|---|---|---|---|---|
| Trang đầu | `common.edit.paste` | Dán (Ctrl+V) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:126 |
| Trang đầu | `common.edit.cut` | Cắt (Ctrl+X) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Trang đầu | `common.edit.copy` | Sao chép (Ctrl+C) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:2 |
| Trang đầu | `sheet.edit.pasteSpecial` | Dán đặc biệt (Ctrl+Alt+V) | KHỚP EXCEL | FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace | dialog |
| Trang đầu | `sheet.edit.formatPainter` | Sao chép định dạng | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:13 |
| Trang đầu | `sheet.font.family` | Phông chữ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | control(select/input) |
| Trang đầu | `sheet.font.size` | Cỡ chữ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | control(select/input) |
| Trang đầu | `sheet.font.grow` | Tăng cỡ chữ | KHỚP EXCEL | FIX-S12 Trang đầu: CDP click Tăng cỡ chữ; Excel COM ReadOnly xác nhận B2=12 pt | dom:15 |
| Trang đầu | `sheet.font.shrink` | Giảm cỡ chữ | KHỚP EXCEL | FIX-S12 Trang đầu: sửa làm tròn điểm cỡ chữ; CDP click Giảm cỡ chữ; Excel COM ReadOnly xác nhận B2=10 pt | dom:15 |
| Trang đầu | `sheet.cell.bold` | Đậm (Ctrl+B) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:20 |
| Trang đầu | `sheet.cell.italic` | Nghiêng (Ctrl+I) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:20 |
| Trang đầu | `sheet.cell.underline` | Gạch chân (Ctrl+U) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:20 |
| Trang đầu | `sheet.cell.borders` | Viền ô | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:15 |
| Trang đầu | `sheet.cell.fillColor` | Màu nền | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:15 |
| Trang đầu | `sheet.cell.textColor` | Màu chữ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:15 |
| Trang đầu | `sheet.cell.alignTop` | Căn trên | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:21 |
| Trang đầu | `sheet.cell.alignMiddle` | Căn giữa dọc | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Trang đầu | `sheet.cell.alignBottom` | Căn dưới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Trang đầu | `sheet.cell.wrapText` | Ngắt dòng tự động | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:19 |
| Trang đầu | `sheet.cell.alignLeft` | Căn trái | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Trang đầu | `sheet.cell.alignCenter` | Căn giữa | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click căn giữa; Excel COM ReadOnly HAl=-4108 tại B2 (app_alignCenter.xlsx) | dom:1 |
| Trang đầu | `sheet.cell.alignRight` | Căn phải | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click căn phải; Excel COM ReadOnly HAl=-4152 tại B2 (app_alignRight.xlsx) | dom:1 |
| Trang đầu | `sheet.cell.indentDecrease` | Giảm thụt lề | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Trang đầu | `sheet.cell.indentIncrease` | Tăng thụt lề | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dialog,toast:A1 |
| Trang đầu | `sheet.cell.mergeCenter` | Trộn & căn giữa | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:1 |
| Trang đầu | `sheet.cell.mergeAcross` | Trộn theo hàng | KHỚP EXCEL | FIX-S12 Trang đầu: CDP chọn A8:B8 và bấm lệnh; Excel COM ReadOnly xác nhận A8.MergeCells=True | dialog,toast:A1 |
| Trang đầu | `sheet.cell.mergeCells` | Trộn ô | KHỚP EXCEL | FIX-S12 Trang đầu: CDP chọn A8:B8 và bấm lệnh; Excel COM ReadOnly xác nhận A8.MergeCells=True | dialog,toast:A1 |
| Trang đầu | `sheet.cell.unmerge` | Tách ô | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Trang đầu | `sheet.format.quickCategory` | Định dạng số | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | control(select/input) |
| Trang đầu | `sheet.format.currencyVND` | Tiền tệ VNĐ (Ctrl+Shift+4) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Trang đầu | `sheet.format.percent` | Phần trăm (Ctrl+Shift+5) | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click Phần trăm; Excel COM ReadOnly D2=0.075, NumberFormat=0% (app_percentBtn.xlsx) | dialog,toast:A1 |
| Trang đầu | `sheet.format.standard` | Phân cách hàng nghìn (Ctrl+Shift+1) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dialog,toast:A1 |
| Trang đầu | `sheet.format.increaseDecimal` | Tăng số thập phân | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click Tăng số thập phân; Excel COM ReadOnly C2=1234.5, NumberFormat=0.00 (app_decInc.xlsx) | dom:1 |
| Trang đầu | `sheet.format.decreaseDecimal` | Giảm số thập phân | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Trang đầu | `sheet.format.cellsDialog` | Định dạng ô... (Ctrl+1) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Trang đầu | `sheet.format.conditional` | Định dạng có điều kiện | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dom:1 |
| Trang đầu | `sheet.style.formatAsTable` | Định dạng bảng | KHỚP EXCEL | FIX-S11: CDP + Excel COM read-only xác nhận ListObjects, tên/vùng/style/filter và XLSX round-trip | dom:1 |
| Trang đầu | `sheet.style.cellStyles` | Kiểu ô | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dom:1 |
| Trang đầu | `sheet.row.insert` | Chèn hàng (Ctrl+Shift+=) | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dom:1 |
| Trang đầu | `sheet.col.insert` | Chèn cột | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dom:1 |
| Trang đầu | `sheet.row.delete` | Xóa hàng | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dom:1 |
| Trang đầu | `sheet.col.delete` | Xóa cột | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dom:1 |
| Trang đầu | `sheet.formula.sum` | AutoSum (Alt+=) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:1 |
| Trang đầu | `sheet.data.sortAsc` | Sắp xếp A-Z | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:1 |
| Trang đầu | `sheet.data.sortDesc` | Sắp xếp Z-A | KHỚP EXCEL | FIX-S12 tab Dữ liệu: CDP click Z-A; Excel COM ReadOnly xác nhận B2:B6 giảm dần: Trần, Phạm, Nguyễn, Lê, Hoàng (app_sortDesc.xlsx) | dom:1 |
| Trang đầu | `sheet.data.filter` | Bộ lọc (Ctrl+Shift+L) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:1 |
| Trang đầu | `common.edit.find` | Tìm kiếm (Ctrl+F) | KHỚP EXCEL | FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace | dom:1 |
| Trang đầu | `common.edit.replace` | Thay thế (Ctrl+H) | KHỚP EXCEL | FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace | dom:1 |
| Chèn | `sheet.data.pivotTable` | Bảng tổng hợp | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Chèn | `sheet.insert.image` | Chèn ảnh | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Chèn | `sheet.chart.insert` | Biểu đồ | KHỚP EXCEL | FIX-S9: Excel COM read-only xác nhận loại biểu đồ, tiêu đề, series và trục | dialog |
| Chèn | `sheet.chart.pivotChart` | Biểu đồ Pivot | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Chèn | `sheet.insert.sparklineLine` | Đường | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:14 |
| Chèn | `sheet.insert.sparklineColumn` | Cột | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:14 |
| Chèn | `sheet.insert.hyperlink` | Liên kết | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Chèn | `sheet.insert.textbox` | Hộp văn bản | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Chèn | `sheet.page.headerFooter` | Tiêu đề Đầu/Cuối trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Bố trí trang | `sheet.page.margins` | Căn lề | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dialog,toast:A1 |
| Bố trí trang | `sheet.page.orientation` | Hướng giấy | KHỚP EXCEL | FIX-S8/FIX-S7: CDP và Excel COM read-only xác nhận name, rotation, dimensions, visibility, print area/orientation | dialog,toast:A1 |
| Bố trí trang | `sheet.page.size` | Khổ giấy | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Bố trí trang | `sheet.page.setPrintArea` | Đặt vùng in | KHỚP EXCEL | FIX-S8/FIX-S7: CDP và Excel COM read-only xác nhận name, rotation, dimensions, visibility, print area/orientation | dom:120 |
| Bố trí trang | `sheet.page.clearPrintArea` | Xóa vùng in | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:120 |
| Bố trí trang | `sheet.page.insertPageBreak` | Chèn ngắt trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:120 |
| Bố trí trang | `sheet.page.removePageBreak` | Xóa ngắt trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:120 |
| Bố trí trang | `sheet.page.printTitles` | Tiêu đề in | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Bố trí trang | `sheet.page.scale` | Tỷ lệ vừa trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Bố trí trang | `sheet.view.gridlines` | Đường lưới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:23 |
| Bố trí trang | `sheet.view.headings` | Tiêu đề | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:23 |
| Công thức | `sheet.formula.insertFunction` | Chèn hàm (Shift+F3) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.sum` | AutoSum (Alt+=) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:16 |
| Công thức | `sheet.formula.average` | Trung bình | KHỚP EXCEL | FIX-S12 tab Công thức: CDP click Trung bình; Excel COM ReadOnly xác nhận =AVERAGE(C2:C6), Value2=4123.02 (app_S12fix_averageBtn.xlsx) | dom:16 |
| Công thức | `sheet.formula.countNumbers` | Đếm số | KHỚP EXCEL | FIX-S12 tab Công thức: CDP click Đếm số; Excel COM ReadOnly xác nhận =COUNT(C2:C6), Value2=5 (app_countNumbersBtn.xlsx) | dom:16 |
| Công thức | `sheet.formula.categoryFinancial` | Tài chính | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.categoryLogical` | Logic | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.categoryText` | Văn bản | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.categoryDateTime` | Ngày & Giờ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.categoryLookup` | Tra cứu & Tham chiếu | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.categoryMath` | Toán & Lượng giác | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.categoryMore` | Thêm hàm | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.max` | Lớn nhất | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:16 |
| Công thức | `sheet.formula.min` | Nhỏ nhất | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:16 |
| Công thức | `sheet.formula.nameManager` | Quản lý tên | KHỚP EXCEL | FIX-S8/FIX-S7: CDP và Excel COM read-only xác nhận name, rotation, dimensions, visibility, print area/orientation | dialog,toast:A1 |
| Công thức | `sheet.formula.defineName` | Đặt tên vùng | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.useInFormula` | Dùng trong công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.createFromSelection` | Tạo từ vùng chọn (Ctrl+Shift+F3) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.tracePrecedents` | Tìm ô tiền lệ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Công thức | `sheet.formula.traceDependents` | Tìm ô phụ thuộc | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Công thức | `sheet.formula.removeArrows` | Xóa mũi tên | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Công thức | `sheet.formula.showFormulas` | Hiện công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:113 |
| Công thức | `sheet.formula.errorChecking` | Kiểm tra lỗi | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.formula.evaluateFormula` | Ước lượng công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.watchWindow` | Cửa sổ theo dõi | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Công thức | `sheet.calc.calculationOptions` | Tùy chọn tính toán | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | control(select/input) |
| Công thức | `sheet.formula.recalculate` | Tính lại toàn bộ (F9) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:125 |
| Công thức | `sheet.calc.calculateSheet` | Tính trang hiện tại (Shift+F9) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:123 |
| Dữ liệu | `sheet.data.sortAsc` | Sắp xếp A-Z | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:130 |
| Dữ liệu | `sheet.data.sortDesc` | Sắp xếp Z-A | KHỚP EXCEL | FIX-S12 tab Dữ liệu: CDP click Z-A; Excel COM ReadOnly xác nhận B2:B6 giảm dần: Trần, Phạm, Nguyễn, Lê, Hoàng (app_sortDesc.xlsx) | dom:130 |
| Dữ liệu | `sheet.data.filter` | Bộ lọc (Ctrl+Shift+L) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:161 |
| Dữ liệu | `sheet.data.customSort` | Sắp xếp tùy chỉnh | KHỚP EXCEL | FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace | dialog,toast:A1 |
| Dữ liệu | `sheet.data.textToColumns` | Tách văn bản | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Dữ liệu | `sheet.data.flashFill` | Điền nhanh | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Dữ liệu | `sheet.data.removeDuplicates` | Xóa trùng lặp | KHỚP EXCEL | FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace | dialog,toast:A1 |
| Dữ liệu | `sheet.data.validation` | Kiểm tra dữ liệu | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dialog,toast:A1 |
| Dữ liệu | `sheet.data.consolidate` | Hợp nhất dữ liệu | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Dữ liệu | `sheet.data.group` | Nhóm | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Dữ liệu | `sheet.data.ungroup` | Bỏ nhóm | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Dữ liệu | `sheet.data.subtotal` | Tổng phụ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Dữ liệu | `sheet.data.pivotTable` | Bảng tổng hợp | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Dữ liệu | `sheet.data.pivotRefresh` | Làm mới Pivot | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Xem xét | `sheet.review.spellCheck` | Chính tả | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Xem xét | `sheet.review.toggleSpellCheck` | Kiểm tra chính tả | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:9 |
| Xem xét | `sheet.review.commentInsert` | Ghi chú mới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Xem xét | `sheet.review.commentDelete` | Xóa nhận xét | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Xem xét | `sheet.review.commentResolve` | Đã xử lý | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Xem xét | `sheet.review.commentPrevious` | Nhận xét trước | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Xem xét | `sheet.review.commentNext` | Nhận xét sau | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1 |
| Xem xét | `sheet.sheet.protect` | Bảo vệ trang tính... | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Xem xét | `sheet.workbook.protect` | Bảo vệ workbook... | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Chế độ xem | `sheet.view.normal` | Bình thường | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:142 |
| Chế độ xem | `sheet.view.pageBreakPreview` | Xem ngắt trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:145 |
| Chế độ xem | `sheet.view.pageLayout` | Bố trí trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:147 |
| Chế độ xem | `sheet.file.printPreview` | Xem trước khi in (Ctrl+F2) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Chế độ xem | `sheet.view.gridlines` | Đường lưới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:47 |
| Chế độ xem | `sheet.view.formulaBar` | Thanh công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:48 |
| Chế độ xem | `sheet.view.headings` | Tiêu đề | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:47 |
| Chế độ xem | `sheet.view.zoomIn` | Phóng to | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Chế độ xem | `sheet.view.zoomReset` | 100% | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Chế độ xem | `sheet.view.zoomToSelection` | Thu phóng vùng chọn | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1779 |
| Chế độ xem | `sheet.view.zoomOut` | Thu nhỏ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:6 |
| Chế độ xem | `sheet.view.newWindow` | Cửa sổ mới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Chế độ xem | `common.macro.recordToggle` | Ghi Macro (Ctrl+Shift+R) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:16 |
| Chế độ xem | `common.macro.manager` | Xem Macro (Alt+F8) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Trợ giúp | `sheet.help.open` | Trợ giúp (F1) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:13 |
| Trợ giúp | `common.help.about` | Giới thiệu | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `ai.assistant.toggle` | Trợ lý 3T AI (Alt+J) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `ai.assistant.summarize` | Tóm tắt nhanh | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `sheet.ai.explainFormula` | Giải thích công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `sheet.ai.formulaFromDescription` | Tạo công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
