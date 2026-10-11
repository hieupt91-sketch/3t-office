# Sheet: bảng đối chiếu từng nút ribbon với Excel (11/10/2026)

Nguồn nút: `docs/ribbon-scan-sheet-1011.json`. Chỉ đánh dấu **KHỚP EXCEL** khi thao tác UI và Excel COM đọc lại XLSX đã có bằng chứng; phản ứng DOM không đủ.
- **KHỚP EXCEL**: thao tác tương đương và thuộc tính/giá trị từ XLSX được Excel đọc lại khớp.
- **KHÁC CÓ CHỦ Ý**: khác biệt được thiết kế có chủ ý và có giải thích.
- **LỆCH ĐÃ BIẾT**: sai khác đã được tái hiện và còn tồn tại.
- **CHƯA ĐỐI CHIẾU**: chưa có đối chiếu Excel đủ chứng cứ.
Tổng 138 nút — KHỚP EXCEL: 72 · CHƯA ĐỐI CHIẾU: 66.

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
| Trang đầu | `sheet.cell.borders` | Viền ô | KHỚP EXCEL | FIX-S12 Trang đầu: CDP bấm màu nền/màu chữ/viền; Excel COM ReadOnly xác nhận Fill=65535, Font.Color=255 và bốn Border.LineStyle=1 | dom:15 |
| Trang đầu | `sheet.cell.fillColor` | Màu nền | KHỚP EXCEL | FIX-S12 Trang đầu: CDP bấm màu nền/màu chữ/viền; Excel COM ReadOnly xác nhận Fill=65535, Font.Color=255 và bốn Border.LineStyle=1 | dom:15 |
| Trang đầu | `sheet.cell.textColor` | Màu chữ | KHỚP EXCEL | FIX-S12 Trang đầu: CDP bấm màu nền/màu chữ/viền; Excel COM ReadOnly xác nhận Fill=65535, Font.Color=255 và bốn Border.LineStyle=1 | dom:15 |
| Trang đầu | `sheet.cell.alignTop` | Căn trên | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:21 |
| Trang đầu | `sheet.cell.alignMiddle` | Căn giữa dọc | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Trang đầu | `sheet.cell.alignBottom` | Căn dưới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Trang đầu | `sheet.cell.wrapText` | Ngắt dòng tự động | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:19 |
| Trang đầu | `sheet.cell.alignLeft` | Căn trái | KHỚP EXCEL | FIX-S12 Trang dau: CDP click Can trai; Excel COM ReadOnly xac nhan B2 HorizontalAlignment=-4131 (app_S12_alignLeft.xlsx) | dom:1 |
| Trang đầu | `sheet.cell.alignCenter` | Căn giữa | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click căn giữa; Excel COM ReadOnly HAl=-4108 tại B2 (app_alignCenter.xlsx) | dom:1 |
| Trang đầu | `sheet.cell.alignRight` | Căn phải | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click căn phải; Excel COM ReadOnly HAl=-4152 tại B2 (app_alignRight.xlsx) | dom:1 |
| Trang đầu | `sheet.cell.indentDecrease` | Giảm thụt lề | KHỚP EXCEL | FIX-S13: CDP giảm thụt lề về 0; Excel COM ReadOnly xác nhận Indent=0 (app_s13_indentDecrease.xlsx) | dialog,toast:A1 |
| Trang đầu | `sheet.cell.indentIncrease` | Tăng thụt lề | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dialog,toast:A1 |
| Trang đầu | `sheet.cell.mergeCenter` | Trộn & căn giữa | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dom:1 |
| Trang đầu | `sheet.cell.mergeAcross` | Trộn theo hàng | KHỚP EXCEL | FIX-S12 Trang đầu: CDP chọn A8:B8 và bấm lệnh; Excel COM ReadOnly xác nhận A8.MergeCells=True | dialog,toast:A1 |
| Trang đầu | `sheet.cell.mergeCells` | Trộn ô | KHỚP EXCEL | FIX-S12 Trang đầu: CDP chọn A8:B8 và bấm lệnh; Excel COM ReadOnly xác nhận A8.MergeCells=True | dialog,toast:A1 |
| Trang đầu | `sheet.cell.unmerge` | Tách ô | KHỚP EXCEL | FIX-S12: CDP mở XLSX đã merge A8:B8 rồi bấm Tách ô; Excel COM ReadOnly xác nhận A8.MergeCells=False | dialog,toast:A1 |
| Trang đầu | `sheet.format.quickCategory` | Định dạng số | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | control(select/input) |
| Trang đầu | `sheet.format.currencyVND` | Tiền tệ VNĐ (Ctrl+Shift+4) | KHỚP EXCEL | FIX-S12 Trang dau: CDP click Tien te VNĐ; Excel COM ReadOnly doc lai C2=1234.5, NumberFormat=#,##0 [$₫], hien thi 1,235 ₫ (app_S12_currencyBtn.xlsx) | dialog,toast:A1 |
| Trang đầu | `sheet.format.percent` | Phần trăm (Ctrl+Shift+5) | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click Phần trăm; Excel COM ReadOnly D2=0.075, NumberFormat=0% (app_percentBtn.xlsx) | dialog,toast:A1 |
| Trang đầu | `sheet.format.standard` | Phân cách hàng nghìn (Ctrl+Shift+1) | KHỚP EXCEL | FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter | dialog,toast:A1 |
| Trang đầu | `sheet.format.increaseDecimal` | Tăng số thập phân | KHỚP EXCEL | FIX-S12 nhóm Trang đầu: CDP click Tăng số thập phân; Excel COM ReadOnly C2=1234.5, NumberFormat=0.00 (app_decInc.xlsx) | dom:1 |
| Trang đầu | `sheet.format.decreaseDecimal` | Giảm số thập phân | KHỚP EXCEL | FIX-S12 Trang đầu: CDP click Giảm số thập phân; Excel COM ReadOnly xác nhận C2=1234.5, NumberFormat=0, hiển thị 1235 | dom:1 |
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
| Chèn | `sheet.data.pivotTable` | Bảng tổng hợp | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon A1:C6, tao Pivot theo Ho ten va SUM So tien; Excel COM ReadOnly xac nhan Sheet1 (2) PivotTables.Count=1, cot nhan va gia tri (app_S12_pivotTable.xlsx) | dialog,toast:A1 |
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
| Bố trí trang | `sheet.page.clearPrintArea` | Xóa vùng in | KHỚP EXCEL | FIX-S13: CDP xóa vùng in; Excel COM ReadOnly xác nhận PageSetup.PrintArea rỗng (app_s13_clearArea.xlsx) | dom:120 |
| Bố trí trang | `sheet.page.insertPageBreak` | Chèn ngắt trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:120 |
| Bố trí trang | `sheet.page.removePageBreak` | Xóa ngắt trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:120 |
| Bố trí trang | `sheet.page.printTitles` | Tiêu đề in | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Bố trí trang | `sheet.page.scale` | Tỷ lệ vừa trang | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Bố trí trang | `sheet.view.gridlines` | Đường lưới | KHỚP EXCEL | FIX-S13: CDP ẩn đường lưới và tiêu đề; Excel COM ReadOnly xác nhận DisplayGridlines=0 và DisplayHeadings=0 (app_s13_gridlines.xlsx, app_s13_headings.xlsx) | dom:23 |
| Bố trí trang | `sheet.view.headings` | Tiêu đề | KHỚP EXCEL | FIX-S13: CDP ẩn đường lưới và tiêu đề; Excel COM ReadOnly xác nhận DisplayGridlines=0 và DisplayHeadings=0 (app_s13_gridlines.xlsx, app_s13_headings.xlsx) | dom:23 |
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
| Công thức | `sheet.formula.max` | Lớn nhất | KHỚP EXCEL | FIX-S12 Công thức: CDP bấm MAX/MIN; Excel COM ReadOnly xác nhận =MAX(C2:C6)=9876.5 và =MIN(C2:C6)=1234.5 | dom:16 |
| Công thức | `sheet.formula.min` | Nhỏ nhất | KHỚP EXCEL | FIX-S12 Công thức: CDP bấm MAX/MIN; Excel COM ReadOnly xác nhận =MAX(C2:C6)=9876.5 và =MIN(C2:C6)=1234.5 | dom:16 |
| Công thức | `sheet.formula.nameManager` | Quản lý tên | KHỚP EXCEL | FIX-S8/FIX-S7: CDP và Excel COM read-only xác nhận name, rotation, dimensions, visibility, print area/orientation | dialog,toast:A1 |
| Công thức | `sheet.formula.defineName` | Đặt tên vùng | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.useInFormula` | Dùng trong công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.createFromSelection` | Tạo từ vùng chọn (Ctrl+Shift+F3) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog,toast:A1 |
| Công thức | `sheet.formula.tracePrecedents` | Tìm ô tiền lệ | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Công thức | `sheet.formula.traceDependents` | Tìm ô phụ thuộc | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Công thức | `sheet.formula.removeArrows` | Xóa mũi tên | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:3 |
| Công thức | `sheet.formula.showFormulas` | Hiện công thức | KHỚP EXCEL | FIX-S13: CDP nhấn Ctrl+` thật; Excel COM ReadOnly xác nhận ActiveWindow.DisplayFormulas=1 (app_s13_showFormulas.xlsx) | dom:113 |
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
| Dữ liệu | `sheet.data.textToColumns` | Tách văn bản | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon B2:B6, Tách văn bản bằng dấu cách; Excel COM ReadOnly xác nhận B2:D6 lần lượt Nguyễn\|Văn\|A ... Hoàng\|Văn\|E (app_S12_textToColumns.xlsx) | dialog,toast:A1 |
| Dữ liệu | `sheet.data.flashFill` | Điền nhanh | KHỚP EXCEL | FIX-S12 Du lieu: CDP nhap mau A/B, chay Dien nhanh tren K2:K6; Excel COM ReadOnly doc K2:K6=A/B/C/D/E tu ten nguon J2:J6 (app_S12_flashFill.xlsx) | dialog,toast:A1 |
| Dữ liệu | `sheet.data.removeDuplicates` | Xóa trùng lặp | KHỚP EXCEL | FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace | dialog,toast:A1 |
| Dữ liệu | `sheet.data.validation` | Kiểm tra dữ liệu | KHỚP EXCEL | FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style | dialog,toast:A1 |
| Dữ liệu | `sheet.data.consolidate` | Hợp nhất dữ liệu | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon M1, SUM hai vung cung kich thuoc A2:C3/A4:C5; Excel COM ReadOnly xac nhan M1:O2=4\|0\|3702.5 va 6\|0\|7036.1 (app_S12_consolidate.xlsx) | dialog,toast:A1 |
| Dữ liệu | `sheet.data.group` | Nhóm | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon hang 2:6 va bam Nhom/Bỏ nhóm tren tung XLSX; Excel COM ReadOnly OutlineLevel=2 sau Nhom va =1 sau Bỏ nhóm (app_S12_groupRows.xlsx, app_S12_ungroupRows.xlsx) | dom:1 |
| Dữ liệu | `sheet.data.ungroup` | Bỏ nhóm | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon hang 2:6 va bam Nhom/Bỏ nhóm tren tung XLSX; Excel COM ReadOnly OutlineLevel=2 sau Nhom va =1 sau Bỏ nhóm (app_S12_groupRows.xlsx, app_S12_ungroupRows.xlsx) | dom:1 |
| Dữ liệu | `sheet.data.subtotal` | Tổng phụ | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon A1:C6, tao hai ten trung lien nhau, tong phu theo Ho ten/SUM So tien; Excel COM ReadOnly xac nhan Nguyen Van A=6913.4 va Grand Total=20615.1 (app_S12_subtotal.xlsx) | dialog,toast:A1 |
| Dữ liệu | `sheet.data.pivotTable` | Bảng tổng hợp | KHỚP EXCEL | FIX-S12 Du lieu: CDP chon A1:C6, tao Pivot theo Ho ten va SUM So tien; Excel COM ReadOnly xac nhan Sheet1 (2) PivotTables.Count=1, cot nhan va gia tri (app_S12_pivotTable.xlsx) | dialog,toast:A1 |
| Dữ liệu | `sheet.data.pivotRefresh` | Làm mới Pivot | KHỚP EXCEL | FIX-S13: CDP sửa nguồn C2=2222 rồi làm mới; Excel COM ReadOnly xác nhận PivotTables.Count=1, tổng 2222 và không lặp hàng (app_s13_pivotRefresh.xlsx) | dom:1 |
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
| Chế độ xem | `sheet.view.pageBreakPreview` | Xem ngắt trang | KHỚP EXCEL | FIX-S13: CDP chọn Xem ngắt trang; Excel COM ReadOnly xác nhận ActiveWindow.View=2 (app_s13_pageBreakPreview.xlsx) | dom:145 |
| Chế độ xem | `sheet.view.pageLayout` | Bố trí trang | KHỚP EXCEL | FIX-S13: CDP chọn Bố trí trang; Excel COM ReadOnly xác nhận ActiveWindow.View=3 (app_s13_pageLayoutView.xlsx) | dom:147 |
| Chế độ xem | `sheet.file.printPreview` | Xem trước khi in (Ctrl+F2) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Chế độ xem | `sheet.view.gridlines` | Đường lưới | KHỚP EXCEL | FIX-S13: CDP ẩn đường lưới và tiêu đề; Excel COM ReadOnly xác nhận DisplayGridlines=0 và DisplayHeadings=0 (app_s13_gridlines.xlsx, app_s13_headings.xlsx) | dom:47 |
| Chế độ xem | `sheet.view.formulaBar` | Thanh công thức | KHỚP EXCEL | FIX-S13: CDP ẩn thanh công thức; Excel COM ReadOnly xác nhận ActiveWindow.DisplayFormulaBar=0 (app_s13_formulaBar.xlsx) | dom:48 |
| Chế độ xem | `sheet.view.headings` | Tiêu đề | KHỚP EXCEL | FIX-S13: CDP ẩn đường lưới và tiêu đề; Excel COM ReadOnly xác nhận DisplayGridlines=0 và DisplayHeadings=0 (app_s13_gridlines.xlsx, app_s13_headings.xlsx) | dom:47 |
| Chế độ xem | `sheet.view.zoomIn` | Phóng to | KHỚP EXCEL | FIX-S13: CDP tăng zoom; Excel COM ReadOnly xác nhận ActiveWindow.Zoom=110 (app_s13_zoomIn.xlsx) | dom:7 |
| Chế độ xem | `sheet.view.zoomReset` | 100% | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:7 |
| Chế độ xem | `sheet.view.zoomToSelection` | Thu phóng vùng chọn | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:1779 |
| Chế độ xem | `sheet.view.zoomOut` | Thu nhỏ | KHỚP EXCEL | FIX-S13: CDP giảm zoom; Excel COM ReadOnly xác nhận ActiveWindow.Zoom=90 (app_s13_zoomOut.xlsx) | dom:6 |
| Chế độ xem | `sheet.view.newWindow` | Cửa sổ mới | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Chế độ xem | `common.macro.recordToggle` | Ghi Macro (Ctrl+Shift+R) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:16 |
| Chế độ xem | `common.macro.manager` | Xem Macro (Alt+F8) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dialog |
| Trợ giúp | `sheet.help.open` | Trợ giúp (F1) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | dom:13 |
| Trợ giúp | `common.help.about` | Giới thiệu | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `ai.assistant.toggle` | Trợ lý 3T AI (Alt+J) | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `ai.assistant.summarize` | Tóm tắt nhanh | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `sheet.ai.explainFormula` | Giải thích công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
| Trợ lý 3T AI | `sheet.ai.formulaFromDescription` | Tạo công thức | CHƯA ĐỐI CHIẾU | Chưa có chứng cứ Excel COM gắn với command ID này. | skipped(dangerous) |
