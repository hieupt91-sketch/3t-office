# Danh sách tính năng Excel 2016 và trạng thái trong VN Sheet

Chuẩn: Excel 2016 (16.0.4266) cài trên máy, đọc chỉ-đọc qua COM. Lập 13/10/2026 từ quét ribbon thật, ma trận E1/E3/E4, đọc mã và kiểm thực tế. Sinh bằng `scripts/audit-0610/gen_excel_checklist.py` (sửa dữ liệu trong script rồi chạy lại).

## Cách đọc

- ✅ **Đã đối chiếu Excel 2016**
- 🟢 **Có, chưa đối chiếu**
- 🟡 **Có một phần**
- 🔴 **Chưa có**
- ⚪ **Ngoài phạm vi**

Ưu tiên của mục thiếu/một phần: **1** = người dùng văn phòng dùng thường xuyên; **2** = khá thường; **3** = hiếm.

## Tổng hợp

| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |
|---|---|---|
| ✅ Đã đối chiếu Excel 2016 | 94 | 44% |
| 🟢 Có, chưa đối chiếu | 66 | 31% |
| 🟡 Có một phần | 14 | 7% |
| 🔴 Chưa có | 39 | 18% |
| ⚪ Ngoài phạm vi | 4 | - |
| **Tổng** | **217** (áp dụng: 213) | |

- **Độ phủ so với Excel 2016 (có hoặc có một phần, một phần tính 0,5): 78%**
- **Đã xác minh bằng đối chiếu Excel 2016 thật: 44%** các mục áp dụng

Lưu ý: số mục chia đều cho mỗi dòng nên một dòng lớn (ví dụ 462 hàm) chỉ tính một mục; mức phủ hàm nằm ở dòng riêng và ở `EXCEL2016-FUNCTIONS-MATRIX.md`.

## Theo tab

| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |
|---|---|---|---|---|---|---|---|
| Tệp (Backstage) | 17 | 3 | 8 | 4 | 1 | 1 | 81% |
| Trang đầu | 53 | 28 | 19 | 4 | 2 | 0 | 92% |
| Chèn | 29 | 9 | 7 | 0 | 11 | 2 | 59% |
| Bố trí trang | 10 | 8 | 1 | 0 | 1 | 0 | 90% |
| Công thức | 13 | 6 | 6 | 1 | 0 | 0 | 96% |
| Dữ liệu | 19 | 13 | 1 | 2 | 3 | 0 | 79% |
| Xem xét | 12 | 1 | 4 | 1 | 5 | 1 | 50% |
| Chế độ xem | 12 | 2 | 6 | 1 | 3 | 0 | 71% |
| Nhà phát triển | 3 | 0 | 0 | 0 | 3 | 0 | 0% |
| Trợ giúp | 2 | 0 | 2 | 0 | 0 | 0 | 100% |
| Công cụ Bảng | 8 | 4 | 3 | 0 | 1 | 0 | 88% |
| Công cụ Biểu đồ | 7 | 3 | 1 | 0 | 3 | 0 | 57% |
| Công cụ PivotTable | 3 | 1 | 0 | 1 | 1 | 0 | 50% |
| Công cụ Hình ảnh | 1 | 0 | 0 | 0 | 1 | 0 | 0% |
| Công cụ Vẽ | 1 | 0 | 0 | 0 | 1 | 0 | 0% |
| Công cụ Sparkline | 1 | 0 | 0 | 0 | 1 | 0 | 0% |
| Không thuộc ribbon | 26 | 16 | 8 | 0 | 2 | 0 | 92% |

## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1)

| Tab | Nhóm | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Tệp (Backstage) | Thông tin | Bảo vệ sổ làm việc bằng mật khẩu mở file (mã hóa) | 🔴 | Chưa có mã hóa file; chỉ có bảo vệ cấu trúc |
| Công thức | Thư viện hàm | Độ phủ hàm Excel 2016 (462 hàm) | 🟡 | 18/10: engine nhận 395 trong 421 hàm đánh dấu Excel 2016 trong danh mục (đo bằng gọi rỗng từng hàm), gồm cả MMULT và GETPIVOTDATA (đọc bảng PivotTable phẳng của VN Sheet; tests/live/cdp/sheet-getpivotdata.desktop.mjs 7/7, chưa đối chiếu Excel thật); vừa thêm T.TEST, F.TEST, CHISQ.TEST, GAMMA, CELL, INFO và tên cũ TTEST, FTEST, CHITEST đối chiếu LibreOffice tới 1e-9 vì Excel COM chưa dùng được (BLOCKED, chưa vào bộ vàng Excel). Còn thiếu: BAHTTEXT, DBCS, PHONETIC, RTD, ODDFPRICE, ODDFYIELD, FORECAST.ETS và 3 hàm con, 7 hàm CUBE; danh mục còn đánh dấu nhầm vài hàm sau 2016 như GROUPBY, REGEX*, TRANSLATE (tests/unit/formula-hypothesis-tests.test.js:48) |

Tổng: 2 mục ưu tiên 1.

## Chi tiết từng tab

### Tệp (Backstage)

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Tệp | Mới (Ctrl+N) | 🟢 | - | common.file.new |
| Tệp | Mở (Ctrl+O): XLSX, XLS, ODS, CSV | ✅ | - | Mở 28 tệp thật của công ty đạt 99,98% ô công thức khớp (tests/unit/sheet-file-io.test.js:1-30; common.file.open) |
| Tệp | Mở gần đây (danh sách tệp) | 🟢 | - | Danh sách tệp gần đây trong Backstage menu (platform/shell/app-shell.js:960-985) |
| Tệp | Lưu (Ctrl+S) | ✅ | - | Lưu XLSX rồi Excel 2016 mở lại đúng (bộ 8 tệp bắt buộc 0 chênh lệch, docs/SHEET-BUTTON-MATRIX-1011.md:18-20; common.file.save) |
| Tệp | Lưu thành (F12): XLSX, XLS 97-2003, ODS, CSV | 🟢 | - | common.file.saveAs; XLS 97-2003 đã sửa lỗi 0.9.10 |
| Tệp | Xuất PDF | 🟢 | - | common.file.exportPdf |
| Tệp | Xuất / Chuyển đổi định dạng (mục riêng, giữ bố cục) | 🟢 | - | Đã có trong main (Backstage > Xuất và Chuyển đổi, common.file.exportConvert, CDP 21/21 do agy báo); chưa đối chiếu với Excel vì đây là tính năng của VN Office, không có trong Excel 2016 |
| Tệp | Lưu bản sao / Lưu thành mẫu (XLTX) | 🟡 | 3 | 16/10: lưu .xltx qua đường lưu xlsx đầy đủ, Excel mở đúng là mẫu, LAN 10/10; mở .xltx đi đường mở chung (chưa có đường mở xlsx riêng) |
| Tệp | In (Ctrl+P) + xem trước | ✅ | - | Thiết lập trang/in đã đọc lại bằng Excel 2016 (tests/unit/sheet-print-preview.test.js:1-35; common.file.print) |
| Tệp | Đóng (Ctrl+W) | 🟢 | - | common.file.close |
| Thông tin | Bảo vệ sổ làm việc bằng mật khẩu mở file (mã hóa) | 🔴 | 1 | Chưa có mã hóa file; chỉ có bảo vệ cấu trúc |
| Thông tin | Kiểm tra tài liệu (Inspect) / Đánh dấu là cuối cùng | 🟡 | 3 | 15/10 (agy): Đánh dấu là cuối cùng (Mark as Final) xong, CDP 40/40; chưa có Kiểm tra tài liệu (Inspect) |
| Thông tin | Quản lý phiên bản / khôi phục tự động (AutoRecover) | 🟢 | - | Có cơ chế tự động khôi phục AutoRecover (platform/help/entries-autorecover.js:28-34) |
| Thông tin | Thuộc tính tệp (tác giả, tiêu đề...) | 🟢 | 3 | 15/10 (agy): Thuộc tính tệp tác giả tiêu đề (apps/sheet/document-properties.js:105-125; sheet.file.properties); CDP 40/40; chưa đối chiếu Excel |
| Tùy chọn | Hộp thoại Tùy chọn Excel (chung, công thức, lưu, nâng cao...) | 🟡 | 2 | Có một số tùy chọn rời; chưa có hộp thoại gộp |
| Tùy chọn | Tùy biến ribbon / Thanh công cụ truy nhanh | 🟡 | 2 | 16/10: Thanh công cụ truy nhanh tùy biến xong (chuột phải ribbon, mũi tên, đặt lại; CDP 15/15 trên Doc/Sheet/Slide); chưa tùy biến ribbon (thêm tab/nhóm) |
| Chia sẻ | Chia sẻ/OneDrive/Email đính kèm | ⚪ | - | Cần dịch vụ đám mây |

### Trang đầu

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Bảng nhớ tạm | Dán (Ctrl+V) | 🟢 | - | common.edit.paste |
| Bảng nhớ tạm | Tùy chọn dán: giá trị / công thức / định dạng / chuyển vị | ✅ | - | Dán đặc biệt đã đọc lại bằng Excel 2016 (tests/functions/structural-cases-4.json:1-10; tests/unit/sheet-paste-special.test.js:1-25; sheet.edit.pasteSpecial) |
| Bảng nhớ tạm | Dán đặc biệt... (Ctrl+Alt+V) đủ lựa chọn (Validation, Column widths, Operation, Skip blanks) | 🟢 | - | sheet.edit.pasteSpecial: Tất cả, Giá trị, Công thức, Định dạng, Ghi chú, Trừ đường viền, Chuyển vị, Quy tắc nhập liệu, Độ rộng cột, phép Cộng/Trừ/Nhân/Chia, Bỏ qua ô trống; chế độ Quy tắc nhập liệu và Độ rộng cột đo qua hộp thoại thật + hoàn tác (tests/live/cdp/sheet-paste-special-modes.desktop.mjs 7/7); chưa có Giá trị+định dạng số và Giữ độ rộng cột nguồn; chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Bảng nhớ tạm | Dán liên kết / Dán dạng hình / Sao chép dạng hình | 🔴 | 3 |  |
| Bảng nhớ tạm | Cắt (Ctrl+X) / Sao chép (Ctrl+C) kèm viền chạy (marching ants) | 🟢 | - | Cắt và sao chép có viền chạy (docs/SHEET-BUTTON-MATRIX-1011.md:15-16; common.edit.cut, common.edit.copy) |
| Bảng nhớ tạm | Sao chép định dạng (Format Painter, nhấp đúp khóa) | 🟢 | - | sheet.edit.formatPainter |
| Bảng nhớ tạm | Ngăn Clipboard (nhiều mục) | 🔴 | 3 |  |
| Phông chữ | Tên phông / Cỡ chữ / Tăng-giảm cỡ | 🟢 | - | Chọn phông, cỡ chữ và tăng giảm cỡ (docs/SHEET-BUTTON-MATRIX-1011.md:19-22; sheet.font.family, sheet.font.size, sheet.font.grow, sheet.font.shrink) |
| Phông chữ | Đậm / Nghiêng / Gạch chân (Ctrl+B/I/U) | ✅ | - | Hộp thoại Định dạng ô đã đọc lại bằng Excel 2016 (docs/SHEET-BUTTON-MATRIX-1011.md:23-25; sheet.cell.bold, sheet.cell.italic, sheet.cell.underline) |
| Phông chữ | Gạch chân đôi / Gạch ngang / Chỉ số trên-dưới | 🟢 | - | sheet.format.cellsDialog tab Phông chữ; lưu XLSX giữ gạch chân đôi u=double, gạch ngang strike, chỉ số trên vertAlign=superscript, chỉ số dưới vertAlign=subscript đọc từ XML; chưa đối chiếu Excel thật vì Excel COM chưa dùng được (tests/live/cdp/sheet-font-effects.desktop.mjs) |
| Phông chữ | Viền ô (thư viện + vẽ viền, kiểu đường, màu đường) | 🟡 | 2 | Có thư viện viền; chưa có Draw Border/Erase Border |
| Phông chữ | Màu nền / Màu chữ (bảng màu + màu tùy chỉnh) | 🟢 | - | Màu nền và màu chữ (docs/SHEET-BUTTON-MATRIX-1011.md:27-28; sheet.cell.fillColor, sheet.cell.textColor) |
| Phông chữ | Hộp thoại Định dạng ô (Ctrl+1) | ✅ | - | Tab Số/Căn lề/Phông/Viền/Tô đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:48; tests/unit/sheet-format-cells.test.js:1-25; sheet.format.cellsDialog) |
| Căn chỉnh | Căn trên/giữa/dưới; trái/giữa/phải | 🟢 | - | Căn trên, giữa, dưới, trái, phải (docs/SHEET-BUTTON-MATRIX-1011.md:29-35; sheet.cell.alignTop, sheet.cell.alignMiddle, sheet.cell.alignBottom, sheet.cell.alignLeft, sheet.cell.alignCenter, sheet.cell.alignRight) |
| Căn chỉnh | Hướng chữ (xoay) | ✅ | - | Xoay 90° đã đọc lại bằng Excel 2016 (docs/SHEET-BUTTON-MATRIX-1011.md:72; tests/unit/sheet-cell-orientation.test.js:1-25; sheet.format.alignmentDialog) |
| Căn chỉnh | Ngắt dòng tự động (Wrap Text) | ✅ | - | Ngắt dòng tự động Wrap Text đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:32; tests/unit/sheet-style-export-wrap-border-align.test.js:1-25; sheet.cell.wrapText) |
| Căn chỉnh | Giảm/Tăng thụt lề | 🟢 | - | Giảm và tăng thụt lề ô (docs/SHEET-BUTTON-MATRIX-1011.md:36-37; sheet.cell.indentDecrease, sheet.cell.indentIncrease) |
| Căn chỉnh | Trộn & căn giữa / Trộn theo hàng / Trộn ô / Tách ô | ✅ | - | 17/10 (AGY-DATATOOLS): Merge & Center, Merge Across, UnMerge đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.cell.merge; platform/i18n/strings-vi.js:822, apps/sheet/sheet-grid.js:15753 |
| Căn chỉnh | Căn đều, Distributed, Fill, Center across selection, Shrink to fit | ✅ | - | 16/10 (AGY-JUSTIFY): Center Across Selection và Shrink to Fit lưu/mở lại đúng, đối chiếu Excel 2016 (cases-7; tests/functions/structural-cases-7.json:1-15; tests/unit/sheet-cell-text-fit.test.js:1-25) |
| Số | Danh sách định dạng số (Chung, Số, Tiền tệ, Kế toán, Ngày, Giờ, %, Khoa học, Văn bản) | ✅ | - | Số/ngày/giờ/% đã đối chiếu (E3; docs/SHEET-BUTTON-MATRIX-1011.md:42; tests/unit/sheet-format-cells.test.js:1-30; sheet.format.quickCategory) |
| Số | Định dạng số dạng Phân số (Fraction) và Đặc biệt (Special) | ✅ | - | 17/10 (AGY-NOTES): Phân số 9 mẫu và Đặc biệt 4 mẫu đối chiếu Excel 2016 COM 13/13 mẫu (cases-18; tests/functions/structural-cases-18.json:1-30; tests/unit/sheet-format-cells.test.js:1-40; sheet.format.quickCategory, sheet.format.cellsDialog) |
| Số | Mã định dạng tùy chỉnh (Custom) | ✅ | - | Định dạng ô > Số > Tùy chỉnh: ô nhập mã, danh sách mã đã dùng, xóa mã; lưu XLSX rồi Excel 2016 COM đọc lại mã `0.000 "kg"`, chọn mã trong danh sách và xóa mã cho kết quả General (FC-N21..N23: tests/live/cdp/sheet-format-cells-controls.desktop.mjs:186; apps/sheet/format-cells-dialog.js:101) |
| Số | Kế toán / % / Dấu phẩy / Tăng-giảm số lẻ | 🟢 | - | Định dạng kế toán, phần trăm, phân cách, tăng giảm số thập phân (docs/SHEET-BUTTON-MATRIX-1011.md:43-47; sheet.format.currencyVND, sheet.format.percent, sheet.format.standard, sheet.format.increaseDecimal, sheet.format.decreaseDecimal) |
| Kiểu | Định dạng có điều kiện: Tô sáng ô — Lớn hơn / Nhỏ hơn | ✅ | - | Quy tắc >2000 đã đọc lại bằng Excel 2016 (tests/functions/cf-golden-1.json:1-20; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Tô sáng ô — Giữa / Bằng / Chứa văn bản / Ngày xảy ra / Trùng lặp | ✅ | - | G1 13/10: Excel 2016 đọc đúng luật gốc (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Quy tắc Trên/Dưới (Top-Bottom 10, Trên/Dưới trung bình) | ✅ | - | G1: Quy tắc Trên/Dưới Excel 2016 đọc đúng (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Thanh dữ liệu (Data Bars) | ✅ | - | G1: Data Bars Excel 2016 đọc Type=Databar (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Thang màu (Color Scales) | ✅ | - | G1: Color Scales 2 và 3 màu, Excel 2016 đọc đúng (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Bộ biểu tượng (Icon Sets) | ✅ | - | G1: Icon Sets Excel 2016 đọc IconSet.ID (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Quy tắc mới theo công thức | ✅ | - | G1: Quy tắc mới công thức Excel 2016 đọc Type=Expression (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional) |
| Kiểu | Quản lý quy tắc (xem, xóa, sửa, thứ tự ưu tiên, Stop If True) | 🟡 | 2 | G1: có xem, sửa, đổi thứ tự, xóa; thiếu Stop If True |
| Kiểu | Xóa quy tắc (vùng chọn / cả trang) | 🟢 | - | sheet.format.clearRulesSelection, sheet.format.clearRulesSheet: xóa phần giao với vùng chọn (quy tắc tách thành vùng còn lại) hoặc cả trang; hoàn tác; lưu XLSX mở lại giữ đúng 4 vùng còn lại (tests/live/cdp/sheet-clear-rules.desktop.mjs 8/8); chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Kiểu | Định dạng dưới dạng Bảng (gallery kiểu) | 🟡 | 2 | 17/10 (AGY-TABLESTYLE): 21 kiểu Light/Medium/Dark đo màu từ Excel (cases-14 49/49 ô); Excel có 60 kiểu, chưa có Tùy chỉnh kiểu bảng |
| Kiểu | Kiểu ô (Cell Styles) có sẵn + tạo kiểu mới | 🟢 | - | sheet.style.cellStyles |
| Ô | Chèn ô/hàng/cột/trang tính | ✅ | - | Hộp thoại Chèn ô, chèn trang tính (docs/SHEET-BUTTON-MATRIX-1011.md:52-53; tests/unit/sheet-row-col-insert.test.js:1-25; sheet.row.insert, sheet.col.insert) |
| Ô | Xóa ô/hàng/cột/trang tính | ✅ | - | Xóa ô, xóa hàng, xóa cột (docs/SHEET-BUTTON-MATRIX-1011.md:54-55; tests/unit/sheet-row-col-insert.test.js:1-25; sheet.row.delete, sheet.col.delete) |
| Ô | Định dạng: chiều cao hàng, độ rộng cột, tự vừa khít | ✅ | - | Mô hình chiều cao hàng và độ rộng cột (tests/unit/sheet-virtual-scroll-row-heights.test.js:1-30; tests/unit/sheet-overlap-autofit-status.test.js:1-25; sheet.row.height, sheet.col.width) |
| Ô | Ẩn/Hiện hàng, cột, trang tính | 🟢 | - | Ẩn và hiện hàng, cột (apps/sheet/sheet-grid.js:1-30; sheet.row.hide, sheet.row.unhide, sheet.col.hide, sheet.col.unhide) |
| Ô | Đổi tên, Di chuyển/Sao chép, Màu tab, Bảo vệ trang tính | 🟢 | - | Quản lý trang tính: đổi tên, di chuyển, màu tab, bảo vệ (tests/unit/sheet-rename-move-protect.test.js:1-25; sheet.sheet.protect) |
| Ô | Khóa ô (Lock Cell) khi bảo vệ | 🟢 | - | sheet.sheet.protect; ô mở khóa sửa được, ô khóa bị chặn, xóa vùng có ô khóa bị chặn toàn bộ; lưu XLSX giữ sheetProtection và protection locked=0 (tests/live/cdp/sheet-lock-cells.desktop.mjs, scripts/audit-0610/sheet_lock_xml.py); chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Chỉnh sửa | Tổng tự động (Sum, Average, Count, Max, Min) và Thêm hàm | 🟢 | - | sheet.formula.sum + dropdown |
| Chỉnh sửa | Điền: xuống / sang phải / Flash Fill | ✅ | - | 17/10 (AGY-DATATOOLS): Flash Fill và Điền đối chiếu Excel 2016 (cases-17 6/6 kịch bản; tests/functions/structural-cases-17.json:1-30; apps/sheet/data-tools.js:339-370; sheet.data.flashFill) |
| Chỉnh sửa | Điền: lên / sang trái / Chuỗi (Series) / Căn đều / Trên các trang | ✅ | - | 16/10: Căn đều (sheet.edit.fillJustify, cases-7 47/47 ô, tests/functions/structural-cases-7.json:1-20) và Chuỗi Series (tests/unit/sheet-series.test.js:1-25) |
| Chỉnh sửa | Xóa: tất cả / định dạng / nội dung | ✅ | - | 17/10 (AGY-DATATOOLS): Clear all, formats, contents đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.edit.clearAll; apps/sheet/sheet-grid.js:14842-15010 |
| Chỉnh sửa | Xóa ghi chú / Xóa siêu liên kết (trong menu Xóa) | ✅ | - | 17/10 (AGY-NOTES): Xóa ghi chú và siêu liên kết đối chiếu Excel 2016 (docs/excel-oracle-1710.json:2-31; tests/unit/sheet-clear-notes-links.test.js:1-55; tests/live/cdp/sheet-clear-notes-links.desktop.mjs:1-85; sheet.edit.clearComments, sheet.edit.clearHyperlinks) |
| Chỉnh sửa | Sắp xếp A-Z / Z-A / Tùy chỉnh nhiều cấp | ✅ | - | Sắp xếp hai cấp đã đọc lại bằng Excel 2016 (docs/SHEET-BUTTON-MATRIX-1011.md:57-58; tests/unit/sheet-data-tools.test.js:1-30; sheet.data.sortAsc, sheet.data.sortDesc) |
| Chỉnh sửa | Sắp xếp theo màu ô/màu chữ/biểu tượng | 🟢 | - | sheet.data.filter: nút ở tiêu đề cột; sắp theo màu ô/màu chữ (G2) và theo biểu tượng của bộ biểu tượng (đèn giao thông, mũi tên…), đưa nhóm chọn lên đầu, hoàn tác (tests/live/cdp/sheet-sort-by-icon.desktop.mjs 6/6); chưa có lựa chọn Xuống cuối / lọc theo biểu tượng; chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Chỉnh sửa | Bộ lọc (AutoFilter) bật/tắt | ✅ | - | AutoFilterMode đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:59; tests/unit/sheet-data-tools.test.js:1-30; sheet.data.filter) |
| Chỉnh sửa | Lọc theo màu / theo văn bản-số-ngày (text/number/date filters) | ✅ | - | G2: lọc văn bản/số/ngày/màu; lưu giữ hàng ẩn đúng (tests/unit/sheet-data-tools.test.js:1-35; sheet.data.filter) |
| Chỉnh sửa | Xóa bộ lọc / Áp dụng lại | 🟢 | - | Xóa bộ lọc và áp dụng lại (apps/sheet/sheet-grid.js:1-30; sheet.data.clearFilter, sheet.data.reapplyFilter) |
| Chỉnh sửa | Tìm (Ctrl+F) / Thay thế (Ctrl+H), tùy chọn phân biệt hoa-thường, trong công thức | ✅ | - | Thay thế trên hai trang đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:60-61; tests/unit/sheet-data-tools.test.js:1-25; common.edit.find, common.edit.replace) |
| Chỉnh sửa | Đến (Go To, F5/Ctrl+G) / Đến đặc biệt (Go To Special) | 🟢 | - | Chuyển đến ô và đến đặc biệt Go To (apps/sheet/sheet-goto.js:1-40; tests/unit/sheet-keyboard-audit.test.js:1-30) |
| Chỉnh sửa | Chọn khung chọn / Chọn đối tượng | 🟡 | 3 | 17/10: có Ngăn chọn (AGY-ARRANGE) và chọn nhiều đối tượng; chưa có nút Chọn đối tượng riêng |

### Chèn

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Bảng | PivotTable (tạo, kéo thả trường, làm mới) | ✅ | - | PivotTables.Count đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:62; tests/unit/sheet-pivot-table.test.js:1-30; sheet.data.pivotTable) |
| Bảng | PivotTable được đề xuất | 🔴 | 3 |  |
| Bảng | Bảng (Table, Ctrl+T) | ✅ | - | ListObject, kiểu TableStyleMedium2 đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:50; tests/functions/structural-cases-8.json:1-20; tests/unit/sheet-table.test.js:1-30; sheet.style.formatAsTable) |
| Minh họa | Hình ảnh từ tệp | 🟢 | - | sheet.insert.image; ảnh trong ô giữ nguyên khi lưu |
| Minh họa | Hình ảnh trực tuyến / Ảnh chụp màn hình | ⚪ | - | Cần dịch vụ trực tuyến / chụp màn hình |
| Minh họa | Hình dạng (Shapes) | 🟢 | - | sheet.insert.shapes: hộp thư viện 18 hình (chữ nhật, elip + 16 hình dựng sẵn dùng chung với Slides/Writer), chèn tại ô chọn, hoàn tác; lưu XLSX thành xdr:sp prstGeom có màu nền/viền/chữ, mở lại giữ loại, màu, vị trí; LibreOffice độc lập đọc đủ 3 hình đúng loại (tests/live/cdp/sheet-insert-shapes.desktop.mjs 8/8, tests/test_sheet_shapes_drawing.py, scripts/audit-0610/sheet_shapes_xml.py); chỉ nạp lại hình do VN Sheet ghi (có dấu nhận diện), hình do ứng dụng khác vẽ chưa nạp; chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Minh họa | SmartArt | 🔴 | 3 |  |
| Add-in | Cửa hàng / Add-in của tôi | ⚪ | - | Cần cửa hàng Microsoft |
| Biểu đồ | Cột nhóm / Đường / Tròn / Vùng | ✅ | - | 4 loại biểu đồ đã đọc lại bằng Excel 2016 loại 51/4/5/1 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert) |
| Biểu đồ | Cột chồng / Cột 100% / Thanh ngang | ✅ | - | G3: Cột chồng và thanh ngang Excel 2016 đọc đúng 52/53/57 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert) |
| Biểu đồ | Cột 3-D | 🔴 | 3 |  |
| Biểu đồ | Phân tán (Scatter) / Bong bóng | ✅ | - | G3: Scatter phân tán Excel 2016 đọc -4169/15 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert) |
| Biểu đồ | Radar / Kết hợp (Combo) | ✅ | - | G3: Radar kết hợp Combo Excel 2016 đọc -4151/-4111 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert) |
| Biểu đồ | Chứng khoán / Bề mặt | 🔴 | 3 |  |
| Biểu đồ | Biểu đồ mới 2016: Waterfall / Histogram / Pareto / Box / Treemap / Sunburst | 🔴 | 3 |  |
| Biểu đồ | Biểu đồ được đề xuất / hộp thoại Tất cả biểu đồ | 🔴 | 3 |  |
| Biểu đồ | PivotChart | 🟢 | - | sheet.chart.pivotChart |
| Biểu đồ | Bản đồ 3-D (3D Map) | 🔴 | 3 |  |
| Sparkline | Đường / Cột | ✅ | - | SparklineGroups đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:66-67; sheet.insert.sparklineLine, sheet.insert.sparklineColumn) |
| Sparkline | Thắng-thua (Win/Loss) | 🔴 | 3 |  |
| Bộ lọc | Slicer cho Bảng | ✅ | - | Thiết kế Bảng > Chèn Slicer; Excel 2016 đọc lại cache, panel và lựa chọn (tests/unit/sheet-slicer.test.js:1-30; sheet.style.formatAsTable) |
| Bộ lọc | Timeline | 🔴 | 2 |  |
| Liên kết | Siêu liên kết (Ctrl+K), Mở, Xóa, Sửa | 🟢 | - | Siêu liên kết chèn, mở, sửa, xóa (docs/SHEET-BUTTON-MATRIX-1011.md:68; sheet.insert.hyperlink) |
| Liên kết | Liên kết tới ô khác / trang khác / email trong cùng sổ | 🟢 | - | sheet.insert.hyperlink: hộp Ctrl+K có mục Vị trí trong sổ làm việc này (trang tính + ô); lưu XLSX thành location=Trang!Ô, mở lại giữ, bấm đi tới đúng ô (tests/live/cdp/sheet-internal-link.desktop.mjs); chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Văn bản | Hộp văn bản | 🟢 | - | sheet.insert.textbox; hộp văn bản nhập từ XLSX giữ khi lưu |
| Văn bản | Đầu trang & Chân trang | ✅ | - | Header phải đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:70; sheet.page.headerFooter) |
| Văn bản | WordArt / Dòng chữ ký / Đối tượng nhúng | 🔴 | 3 |  |
| Ký hiệu | Công thức (Equation) | 🔴 | 3 |  |
| Ký hiệu | Ký hiệu (Symbol) | 🟢 | - | Chèn ký hiệu đặc biệt Symbol (apps/sheet/sheet-grid.js:12779-12785; sheet.insert.symbol) |

### Bố trí trang

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Giao diện | Chủ đề (Themes) / Màu / Phông / Hiệu ứng | ✅ | - | Chủ đề Themes, Màu Colors, Phông Fonts đã đối chiếu Excel 2016 COM thật 19/19 trường hợp (tests/functions/structural-cases-19.json:1-35; tests/unit/sheet-themes.test.js:1-40; tests/live/cdp/sheet-themes.desktop.mjs:1-45; sheet.page.themes sheet.page.themeColors sheet.page.themeFonts) |
| Thiết lập trang | Lề (Margins) / Hướng giấy / Khổ giấy | ✅ | - | sheet.page.margins sheet.page.orientation sheet.page.size: Landscape, Legal đã đọc lại bằng Excel 2016; danh sách chọn nhanh Thường/Rộng/Hẹp, Dọc/Ngang, A3/A4... Excel 2016 đọc đúng lề, Landscape, A3 (docs/AUDIT-SHEET-PAGE-GALLERY-1710.md:6) |
| Thiết lập trang | Vùng in / Xóa vùng in | ✅ | - | Print area đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:74-75; tests/unit/sheet-comments-printarea.test.js:1-25; sheet.page.setPrintArea, sheet.page.clearPrintArea) |
| Thiết lập trang | Ngắt trang (chèn, xóa, đặt lại) | ✅ | - | HBreaks/VBreaks đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:76-77; sheet.page.insertPageBreak, sheet.page.removePageBreak) |
| Thiết lập trang | Hình nền (Background) | 🔴 | 3 |  |
| Thiết lập trang | In tiêu đề (Print Titles) | ✅ | - | TitlesRows đã đối chiếu Print Titles (docs/SHEET-BUTTON-MATRIX-1011.md:78; tests/unit/sheet-print-titles-real-file-import.test.js:1-30; sheet.page.printTitles) |
| Thiết lập trang | Hộp thoại Page Setup đủ tab Trang/Lề/Đầu-Chân/Trang tính | 🟢 | - | tab Trang tính đã có in lưới, tiêu đề hàng cột, đen trắng, bản nháp, ghi chú, thứ tự trang, vùng in và tiêu đề lặp; lưu XLSX ghi đúng printOptions gridLines headings, pageSetup pageOrder overThenDown blackAndWhite cellComments atEnd đọc từ XML; chưa đối chiếu Excel thật vì Excel COM chưa dùng được (apps/sheet/page-setup-dialog.js:53 Page Setup, tests/live/cdp/sheet-page-setup-print-options.desktop.mjs) |
| Vừa trang | Chiều rộng / Chiều cao (Fit to pages) / Tỷ lệ % | ✅ | - | sheet.page.fitWidth sheet.page.fitHeight sheet.page.scale: danh sách Chiều rộng/Chiều cao (Tự động, 1-5 trang) lưu rồi Excel 2016 đọc FitToPagesWide=1, FitToPagesTall=Tự động, Zoom=False (docs/AUDIT-SHEET-PAGE-GALLERY-1710.md:18) |
| Tùy chọn trang tính | Hiện/In đường lưới và tiêu đề | ✅ | - | sheet.page.printTitles + hộp Thiết lập trang; lưu XLSX rồi Excel 2016 COM đọc PrintTitleRows=1:2, PrintTitleColumns=A:B, PrintGridlines và PrintHeadings đúng (platform/i18n/strings-vi.js:581, tests/live/cdp/sheet-page-setup-controls.desktop.mjs:150) |
| Sắp xếp | Đưa lên trên / Xuống dưới / Ngăn chọn / Căn / Nhóm / Xoay đối tượng | ✅ | - | 16/10 (AGY-ARRANGE): lớp, căn, phân bố, nhóm, xoay/lật, Ngăn chọn (tests/unit/sheet-arrange.test.js:54-60; sheet.arrange.group) |

### Công thức

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thư viện hàm | Chèn hàm (Shift+F3) + hộp thoại đối số | 🟢 | - | sheet.formula.insertFunction |
| Thư viện hàm | Tổng tự động; Dùng gần đây; Tài chính / Logic / Văn bản / Ngày giờ / Tra cứu / Toán | 🟢 | - | Thư viện hàm trên ribbon (docs/SHEET-BUTTON-MATRIX-1011.md:86-92; sheet.formula.categoryFinancial, sheet.formula.categoryLogical, sheet.formula.categoryText) |
| Thư viện hàm | Độ phủ hàm Excel 2016 (462 hàm) | 🟡 | 1 | 18/10: engine nhận 395 trong 421 hàm đánh dấu Excel 2016 trong danh mục (đo bằng gọi rỗng từng hàm), gồm cả MMULT và GETPIVOTDATA (đọc bảng PivotTable phẳng của VN Sheet; tests/live/cdp/sheet-getpivotdata.desktop.mjs 7/7, chưa đối chiếu Excel thật); vừa thêm T.TEST, F.TEST, CHISQ.TEST, GAMMA, CELL, INFO và tên cũ TTEST, FTEST, CHITEST đối chiếu LibreOffice tới 1e-9 vì Excel COM chưa dùng được (BLOCKED, chưa vào bộ vàng Excel). Còn thiếu: BAHTTEXT, DBCS, PHONETIC, RTD, ODDFPRICE, ODDFYIELD, FORECAST.ETS và 3 hàm con, 7 hàm CUBE; danh mục còn đánh dấu nhầm vài hàm sau 2016 như GROUPBY, REGEX*, TRANSLATE (tests/unit/formula-hypothesis-tests.test.js:48) |
| Thư viện hàm | Công thức mảng (CSE, Ctrl+Shift+Enter) | ✅ | - | 17/10 (CODEX-ARRAYS): CSE một/nhiều ô, MMULT/TRANSPOSE khớp Excel (tests/unit/sheet-array-formulas.test.js:63-79) |
| Thư viện hàm | Tham chiếu có cấu trúc (Table1[Cột]) | ✅ | - | 17/10: Tham chiếu có cấu trúc Table1[Cột] khớp Excel 2016 (tests/unit/structured-references.test.js:1-30; tests/functions/structural-cases-8.json:1-25) |
| Thư viện hàm | Tham chiếu 3-D giữa các trang (Sheet1:Sheet3!A1) | ✅ | - | Tham chiếu 3-D giữa các trang khớp Excel 2016 (tests/functions/golden-batch10-3d.json:1-20; tests/unit/sheet-formula-odf.test.js:1-30) |
| Tên đã xác định | Trình quản lý tên / Xác định tên / Tạo từ vùng chọn / Dùng trong công thức | ✅ | - | Quản lý tên và xác định tên SampleNames đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:95-98; tests/unit/sheet-named-ranges-text-date.test.js:1-25; sheet.formula.nameManager, sheet.formula.defineName) |
| Kiểm tra công thức | Tìm ô tiền lệ / phụ thuộc / Xóa mũi tên | 🟢 | - | Tìm ô tiền lệ, phụ thuộc và xóa mũi tên (docs/SHEET-BUTTON-MATRIX-1011.md:99-101; sheet.formula.tracePrecedents, sheet.formula.traceDependents, sheet.formula.removeArrows) |
| Kiểm tra công thức | Hiện công thức (Ctrl+`) / Kiểm tra lỗi / Ước lượng công thức | 🟢 | - | Hiện công thức, kiểm tra lỗi và ước lượng (docs/SHEET-BUTTON-MATRIX-1011.md:102-104; sheet.formula.showFormulas, sheet.formula.errorChecking, sheet.formula.evaluateFormula) |
| Kiểm tra công thức | Cửa sổ theo dõi (Watch Window) | 🟢 | - | Cửa sổ theo dõi Watch Window (docs/SHEET-BUTTON-MATRIX-1011.md:105; tests/unit/sheet-watch-window.test.js:1-25; sheet.formula.watchWindow) |
| Tính toán | Tự động / Thủ công; Tính lại (F9); Tính trang (Shift+F9) | 🟢 | - | Tùy chọn tính toán tự động, thủ công, tính lại F9 (docs/SHEET-BUTTON-MATRIX-1011.md:106-108; sheet.calc.calculationOptions, sheet.formula.recalculate, sheet.calc.calculateSheet) |
| Tính toán | Tính lặp (Iterative) / Độ chính xác như hiển thị / Hệ ngày 1904 | ✅ | - | 16/10 (AGY-CALC): tính lặp Iterative, 1904, độ chính xác như hiển thị (tests/functions/structural-cases-9.json:1-25; tests/unit/sheet-calc-options.test.js:1-30) |
| Tính toán | Kiểu tham chiếu R1C1 | ✅ | - | 17/10 (AGY-CALC): Kiểu tham chiếu R1C1 khớp Excel 2016 (tests/functions/structural-cases-9.json:50-60) |

### Dữ liệu

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Lấy dữ liệu | Từ văn bản/CSV, Web, Access, Cơ sở dữ liệu, Power Query | 🟡 | 2 | Mở CSV có; chưa có Power Query/kết nối ngoài |
| Kết nối | Làm mới tất cả / Kết nối / Thuộc tính / Liên kết ngoài (Edit Links) | 🟡 | 2 | 17/10 (AGY-LINKS): Chỉnh sửa liên kết, cập nhật/đổi nguồn/ngắt liên kết khớp Excel (cases-11 6/6 ô, LAN 10/10); chưa có kết nối dữ liệu ngoài (Power Query/ODBC) |
| Sắp xếp & Lọc | Sắp xếp A-Z, Z-A, Sắp xếp tùy chỉnh | ✅ | - | Sắp xếp A-Z, Z-A và tùy chỉnh (docs/SHEET-BUTTON-MATRIX-1011.md:57-58; docs/SHEET-BUTTON-MATRIX-1011.md:112; sheet.data.sortAsc, sheet.data.sortDesc, sheet.data.customSort) |
| Sắp xếp & Lọc | Bộ lọc nâng cao (Advanced Filter, vùng tiêu chí) | ✅ | - | Bộ lọc nâng cao Advanced Filter (cases-6; tests/functions/structural-cases-6.json:1-25; tests/unit/sheet-data-tools.test.js:1-30; sheet.data.advancedFilter) |
| Công cụ dữ liệu | Tách văn bản thành cột | ✅ | - | 17/10 (AGY-DATATOOLS): TextToColumns dấu phẩy/tab/khoảng trắng/ngoặc kép/bỏ qua cột đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.data.textToColumns; apps/sheet/data-tools.js:300-335 |
| Công cụ dữ liệu | Flash Fill | ✅ | - | 17/10 (AGY-DATATOOLS): Flash Fill tách họ-tên/ghép/mã đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.data.flashFill; apps/sheet/data-tools.js:339-370 |
| Công cụ dữ liệu | Xóa trùng lặp | ✅ | - | 17/10 (AGY-DATATOOLS): RemoveDuplicates 1/nhiều cột, header, không phân biệt hoa thường đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.data.removeDuplicates; apps/sheet/data-tools.js:25-75 |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Danh sách | ✅ | - | Validation.Type=3 danh sách đã đối chiếu (tests/functions/dv-golden-1.json:1-20; tests/unit/sheet-dv-golden.test.js:1-25; sheet.data.validation) |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Số nguyên / Số thập phân | ✅ | - | G2: Kiểm tra dữ liệu Số nguyên / Thập phân Excel 2016 đọc Type 1/2 (tests/functions/dv-golden-1.json:1-20; tests/unit/sheet-dv-golden.test.js:1-25; sheet.data.validation) |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Ngày / Giờ / Độ dài văn bản / Tùy chỉnh (công thức) | ✅ | - | G2: Kiểm tra dữ liệu Ngày/Giờ/Độ dài/Tùy chỉnh Excel 2016 đọc Type 4/5/6/7 (tests/functions/dv-golden-1.json:1-20; tests/unit/sheet-dv-golden.test.js:1-25; sheet.data.validation) |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Thông báo nhập, Cảnh báo lỗi (Stop/Warning/Info), Khoanh vòng dữ liệu sai | 🟢 | - | sheet.data.validation: thông báo nhập + 3 mức cảnh báo Excel 2016 đọc đúng (G2); nút Khoanh vòng dữ liệu sai đánh dấu đúng các ô vi phạm, bỏ đánh dấu khi sửa đúng hoặc tắt (tests/live/cdp/sheet-circle-invalid.desktop.mjs 6/6); dấu là khung đỏ trong ô, không phải vòng elip như Excel, chưa so hình với Excel thật |
| Công cụ dữ liệu | Hợp nhất dữ liệu (Consolidate) | ✅ | - | 17/10 (AGY-DATATOOLS): Consolidate hợp nhất dữ liệu đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; tests/unit/sheet-consolidate.test.js:1-30; apps/sheet/consolidate.js:1-30; sheet.data.consolidate) |
| Công cụ dữ liệu | Quan hệ giữa bảng / Mô hình dữ liệu (Power Pivot) | 🔴 | 3 |  |
| Dự báo | Phân tích What-If: Trình quản lý kịch bản | ✅ | - | 17/10 (AGY-DATATOOLS): Trình quản lý kịch bản Scenario Manager đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; tests/unit/sheet-what-if-analysis.test.js:1-35; apps/sheet/sheet-grid.js:20784-20800; sheet.data.scenarioManager) |
| Dự báo | What-If: Goal Seek / Bảng dữ liệu (Data Table) | ✅ | - | 17/10 (AGY-DATATOOLS): Goal Seek và Table đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; tests/unit/sheet-goal-seek.test.js:1-30; apps/sheet/sheet-grid.js:20373-20390; sheet.data.goalSeek) |
| Dự báo | Trang dự báo (Forecast Sheet) | 🔴 | 3 |  |
| Dàn bài | Nhóm / Bỏ nhóm / Tổng phụ | ✅ | - | 17/10 (AGY-DATATOOLS): Group/Ungroup hàng-cột và Subtotal/RemoveSubtotal đối chiếu Excel 2016 (cases-17 12/12 kịch bản); sheet.data.subtotal; apps/sheet/data-tools.js:77-185 |
| Dàn bài | Hiện/Ẩn chi tiết và nút cấp 1-2-3 | ✅ | - | 17/10 (AGY-DATATOOLS): ShowOutlineLevels mức 1/2 ẩn/hiện chi tiết đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; apps/sheet/sheet-grid.js:20367; sheet.data.group) |
| Phân tích | Solver | 🔴 | 3 | Bổ sung của Excel |

### Xem xét

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Soát lỗi | Chính tả (F7) | 🟢 | - | sheet.review.spellCheck |
| Soát lỗi | Từ đồng nghĩa (Thesaurus) / Thống kê sổ làm việc | 🔴 | 3 |  |
| Trợ năng | Kiểm tra trợ năng | 🔴 | 3 |  |
| Thông tin chi tiết | Smart Lookup | ⚪ | - | Cần dịch vụ Bing |
| Ngôn ngữ | Dịch | 🟡 | 3 | Tính năng 3T AI (cần mạng, xin phép riêng) |
| Ghi chú | Ghi chú mới / Sửa / Xóa | ✅ | - | Ghi chú mới, sửa, xóa đã kiểm (docs/SHEET-BUTTON-MATRIX-1011.md:125-126; tests/functions/structural-cases-16.json:1-20; tests/unit/sheet-notes-fidelity.test.js:1-25; sheet.review.commentInsert, sheet.review.commentDelete) |
| Ghi chú | Trước / Sau / Hiện-Ẩn tất cả ghi chú | 🟢 | - | sheet.review.commentShowAll bật tắt hiện tất cả ghi chú ghim trên lưới (2 ghi chú hiện rồi ẩn đúng), lưu XLSX giữ ghi chú đúng ô và nội dung đọc từ XML; chưa đối chiếu Excel thật vì Excel COM chưa dùng được (tests/live/cdp/sheet-notes-show-all.desktop.mjs) |
| Ghi chú | Nhận xét có luồng (threaded comments) | 🔴 | 3 | Excel 2016 chỉ có ghi chú cổ điển |
| Thay đổi | Bảo vệ trang tính (mật khẩu, tùy chọn cho phép) | 🟢 | - | sheet.sheet.protect |
| Thay đổi | Bảo vệ sổ làm việc (cấu trúc) | 🟢 | - | sheet.workbook.protect |
| Thay đổi | Cho phép người dùng sửa vùng (Allow Users to Edit Ranges) | 🔴 | 3 |  |
| Thay đổi | Chia sẻ sổ làm việc / Theo dõi thay đổi (cũ) | 🔴 | 3 |  |

### Chế độ xem

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Chế độ xem sổ | Bình thường / Xem ngắt trang / Bố trí trang | 🟢 | - | Chế độ xem sổ: Bình thường, Ngắt trang, Bố trí trang (docs/SHEET-BUTTON-MATRIX-1011.md:132-134; sheet.view.normal, sheet.view.pageBreakPreview, sheet.view.pageLayout) |
| Chế độ xem sổ | Chế độ xem tùy chỉnh (Custom Views) | 🔴 | 3 |  |
| Chế độ xem sổ | Toàn màn hình (F11) | 🟢 | - | common.view.fullScreen |
| Hiển thị | Thước / Đường lưới / Thanh công thức / Tiêu đề | 🟢 | - | Hiển thị đường lưới, thanh công thức, tiêu đề (docs/SHEET-BUTTON-MATRIX-1011.md:80-81; docs/SHEET-BUTTON-MATRIX-1011.md:137; sheet.view.gridlines, sheet.view.formulaBar, sheet.view.headings) |
| Thu phóng | Thu phóng (hộp thoại) / 100% / Phóng vùng chọn | 🟢 | - | Thu phóng 100% và phóng vùng chọn (docs/SHEET-BUTTON-MATRIX-1011.md:139-142; sheet.view.zoomIn, sheet.view.zoomReset, sheet.view.zoomToSelection, sheet.view.zoomOut) |
| Cửa sổ | Cửa sổ mới | 🟢 | - | sheet.view.newWindow |
| Cửa sổ | Cố định ngăn (hàng đầu / cột đầu / tại ô) | ✅ | - | Cố định ngăn SplitRow/SplitColumn đã đối chiếu (tests/unit/sheet-freeze-panes-real.test.js:1-30; sheet.view.freezeTopRow, sheet.view.freezeFirstColumn) |
| Cửa sổ | Chia (Split) | ✅ | - | Chia khung Split lưu và mở lại đã đối chiếu (tests/unit/sheet-freeze-panes-real.test.js:1-30; apps/sheet/sheet-grid.js:1-40) |
| Cửa sổ | Sắp xếp tất cả / Ẩn-Hiện cửa sổ / Xem song song / Cuộn đồng bộ / Đặt lại vị trí | 🔴 | 3 |  |
| Cửa sổ | Chuyển cửa sổ (Switch Windows) | 🟡 | 3 | Mở nhiều cửa sổ có; menu chuyển cần kiểm |
| Macro | Xem macro / Ghi macro | 🟢 | - | Xem và ghi macro (docs/SHEET-BUTTON-MATRIX-1011.md:144-145; common.macro.recordToggle, common.macro.manager) |
| Macro | Tham chiếu tương đối khi ghi | 🔴 | 3 |  |

### Nhà phát triển

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Mã | Visual Basic / chạy VBA | 🔴 | 3 | Không hỗ trợ VBA (ngoài phạm vi giấy phép/thiết kế); macro riêng của 3T |
| Điều khiển | Form controls (nút, checkbox, combo...) / Chế độ thiết kế | 🔴 | 2 |  |
| XML | Nhập/Xuất XML, Bản đồ XML | 🔴 | 3 |  |

### Trợ giúp

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Trợ giúp | Trợ giúp (F1) + tìm theo tên tính năng | 🟢 | - | sheet.help.open; có hướng dẫn tiếng Việt |
| Trợ giúp | Cho tôi biết bạn muốn làm gì (Alt+Q) | 🟢 | - | Ô tìm kiếm tính năng Tell Me trên thanh tiêu đề (platform/shell/app-shell.js:1-40; platform/commands/command-definitions.js:1-30) |

### Công cụ Bảng

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thiết kế | Đổi tên bảng | 🟢 | - | Đổi tên bảng Table (tests/functions/structural-cases-8.json:1-25; tests/unit/sheet-table.test.js:1-30; sheet.style.formatAsTable) |
| Thiết kế | Dòng tổng (Total Row) | ✅ | - | Mới 13/10, Excel 2016 đọc ShowTotals Total Row đúng (tests/unit/sheet-table.test.js:127-140; sheet.table.toggleTotalRow) |
| Thiết kế | Chuyển thành phạm vi | 🟢 | - | Chuyển bảng thành phạm vi thường (tests/unit/sheet-table.test.js:164-175; sheet.table.convertToRange) |
| Thiết kế | Chèn/Xóa cột-hàng bảng | 🟢 | - | Chèn và xóa cột, hàng trong bảng (apps/sheet/sheet-grid.js:4500-4560; sheet.row.insert, sheet.col.insert) |
| Thiết kế | Đổi kích thước bảng (Resize Table) | ✅ | - | 16/10 (AGY-TABLE): Resize Table cases-8 26/26 kịch bản, 189/189 ô khớp Excel 2016 (tests/functions/structural-cases-8.json:1-30; tests/unit/sheet-table.test.js:1-30) |
| Thiết kế | Tùy chọn kiểu: Hàng tiêu đề, Cột đầu/cuối, Hàng/Cột sọc, Nút lọc | ✅ | - | 17/10 (AGY-TABLESTYLE): đủ 7 hộp kiểm kiểu bảng sống, cases-14 49/49 ô khớp Excel (tests/functions/structural-cases-14.json:1-30; tests/unit/sheet-tablestyle.test.js:1-30; sheet.table.toggleHeaderRow) |
| Thiết kế | Chèn Slicer | ✅ | - | Giai đoạn 1 hoàn thành 16/10: panel nổi, đa chọn, lọc kết hợp Slicer (tests/unit/sheet-slicer.test.js:1-30; sheet.style.formatAsTable) |
| Thiết kế | Xuất bảng | 🔴 | 2 |  |

### Công cụ Biểu đồ

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thiết kế | Thêm thành phần: tiêu đề trục | ✅ | - | Tiêu đề trục biểu đồ Excel 2016 đọc đúng (tests/unit/sheet-charts.test.js:1-30; docs/SHEET-BUTTON-MATRIX-1011.md:64; sheet.chart.insert) |
| Thiết kế | Thêm thành phần: tiêu đề biểu đồ, chú giải, nhãn dữ liệu, đường xu hướng | ✅ | - | G3: Tiêu đề biểu đồ chú giải đường xu hướng Excel 2016 đọc HasDataLabels/Trendlines (tests/unit/sheet-charts.test.js:1-30; docs/SHEET-BUTTON-MATRIX-1011.md:64; sheet.chart.insert) |
| Thiết kế | Thêm thành phần: lưới, thanh sai số | 🔴 | 3 |  |
| Thiết kế | Bố cục nhanh / Đổi màu / Kiểu biểu đồ | 🔴 | 2 |  |
| Thiết kế | Chọn dữ liệu / Đổi loại / Di chuyển biểu đồ | 🟢 | - | Chọn dữ liệu, đổi loại và di chuyển biểu đồ (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-30; sheet.chart.insert) |
| Thiết kế | Chuyển hàng/cột (Switch Row/Column) | ✅ | - | G3: Chuyển hàng/cột Switch Row/Column PlotBy đọc đúng (tests/unit/sheet-charts.test.js:1-30; docs/SHEET-BUTTON-MATRIX-1011.md:64; sheet.chart.insert) |
| Định dạng | Màu/viền/hiệu ứng thành phần, kích thước, vị trí | 🔴 | 2 |  |

### Công cụ PivotTable

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Phân tích | Làm mới / Đổi nguồn / Danh sách trường | ✅ | - | 17/10 (AGY-PIVOT): đổi nguồn dữ liệu khớp Excel 2016 (cases-15 88/88 ô; tests/functions/structural-cases-15.json:1-30; tests/unit/sheet-pivot-table.test.js:1-30; sheet.data.pivotRefresh) |
| Phân tích | Nhóm (ngày/số) / Trường tính toán / Slicer | 🟡 | 2 | 17/10: nhóm số/ngày và trường tính toán khớp Excel (cases-15); Slicer cho PivotTable chưa làm (giữ cho phiếu riêng) |
| Thiết kế | Bố cục báo cáo / Tổng phụ / Kiểu PivotTable | 🔴 | 2 |  |

### Công cụ Hình ảnh

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Định dạng | Cắt (Crop) / Kích thước / Xoay / Kiểu hình / Viền | 🔴 | 2 |  |

### Công cụ Vẽ

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Định dạng | Màu tô / Viền / Hiệu ứng hình | 🔴 | 2 |  |

### Công cụ Sparkline

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thiết kế | Sửa dữ liệu / Đổi loại / Điểm đánh dấu / Màu / Trục / Nhóm | 🔴 | 3 |  |

### Không thuộc ribbon

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Hộp tên và thanh công thức | Hộp tên (Name Box) nhảy tới ô/tên | 🟢 | - | Hộp tên Name Box điều hướng ô và vùng tên (docs/EXCEL2016-INPUT-MATRIX.md:21; apps/sheet/sheet-formula-bar.js:1-40) |
| Hộp tên và thanh công thức | Mở rộng thanh công thức; Ctrl+Shift+U | 🟢 | - | sheet.view.expandFormulaBar: nút ▾ cuối thanh, Ctrl+Shift+U (lưới và thanh công thức), nút ruy-băng; mở rộng cao 5–12 dòng, thu gọn về một dòng, không đổi nội dung ô (tests/live/cdp/sheet-expand-formula-bar.desktop.mjs 8/8); thao tác hiển thị, không có đối chiếu Excel thật |
| Thanh trạng thái | Tổng/Trung bình/Đếm vùng chọn; nút chế độ xem; thanh thu phóng | 🟢 | - | Thanh trạng thái tính tổng, trung bình, đếm (tests/unit/sheet-status-bar-sum.test.js:1-30; apps/sheet/sheet-grid.js:1-30) |
| Thanh trạng thái | Menu tùy chỉnh thanh trạng thái | 🔴 | 3 |  |
| Tab trang tính | Cuộn tab, thêm trang, kéo đổi thứ tự | 🟢 | - | sheet.sheet.moveOrCopy; kéo tab bằng chuột thật đổi thứ tự có vạch báo, Esc hủy, Hoàn tác trả lại, lưu XLSX mở lại giữ thứ tự (tests/live/cdp/sheet-tab-drag.desktop.mjs); chưa đối chiếu Excel thật vì Excel COM chưa dùng được |
| Tab trang tính | Menu chuột phải tab (Chèn, Xóa, Đổi tên, Di chuyển, Bảo vệ, Màu, Ẩn, Hiện) | ✅ | - | Menu chuột phải tab trang tính đúng thứ tự Excel (tests/unit/sheet-rename-move-protect.test.js:1-30; sheet.sheet.protect) |
| Tab trang tính | Chọn nhiều trang cùng lúc (nhóm trang) / Chọn tất cả trang | ✅ | - | F2: Nhóm nhiều trang tính cùng lúc khớp Excel COM (apps/sheet/sheet-grid.js:5730) |
| Chuột phải | Menu ô (Cắt/Sao chép/Dán/Chèn/Xóa/Lọc/Sắp xếp/Ghi chú/Định dạng/Tên/Liên kết) | ✅ | - | Menu ngữ cảnh chuột phải trên ô đối chiếu CommandBars Excel 2016 (docs/EXCEL2016-INPUT-MATRIX.md:39; tests/unit/sheet-keyboard-audit.test.js:1-30; common.edit.cut, common.edit.copy, common.edit.paste) |
| Chuột phải | Menu tiêu đề hàng/cột | ✅ | - | Menu tiêu đề hàng cột chuột phải (docs/EXCEL2016-INPUT-MATRIX.md:34; tests/unit/sheet-row-col-insert.test.js:1-25; sheet.row.insert, sheet.col.insert) |
| Chuột phải | Menu trong bảng (Chèn/Xóa/Chọn/Bảng) | ✅ | - | Menu chuột phải trong bảng đối chiếu (tests/unit/sheet-table.test.js:1-30; tests/functions/structural-cases-8.json:1-25; sheet.style.formatAsTable) |
| Chuột phải | Menu biểu đồ | 🟢 | - | Menu chuột phải trên đối tượng biểu đồ (tests/unit/sheet-object-menu.test.js:1-30; tests/unit/sheet-charts.test.js:1-30; sheet.chart.insert) |
| Chuột phải | Menu hình / ảnh / hộp văn bản | ✅ | - | 17/10 (AGY-CTXMENU): Menu hình ảnh hộp văn bản đo bằng CommandBars (tests/unit/sheet-context-menu-objects.test.js:102-130; sheet.insert.image) |
| Chuột phải | Phân tích nhanh (Quick Analysis) / Chọn từ danh sách thả xuống | 🔴 | 2 |  |
| Chuột | Kéo chốt điền (Fill Handle), nhấp đúp điền xuống, tùy chọn tự điền | ✅ | - | 17/10 (AGY-AUTOFILL): Kéo chốt điền Fill Handle nhấp đúp khớp Excel 2016 (docs/EXCEL2016-INPUT-MATRIX.md:31-32; tests/functions/structural-cases-13.json:1-30; tests/unit/sheet-mouse-shortcuts.test.js:1-30) |
| Chuột | Kéo đổi độ rộng cột/chiều cao hàng, nhấp đúp tự vừa | 🟢 | - | Kéo đường biên đổi độ rộng cột, chiều cao hàng tự vừa (docs/EXCEL2016-INPUT-MATRIX.md:34-35; tests/unit/sheet-mouse-shortcuts.test.js:1-30; sheet.row.autoFit, sheet.col.autoFit) |
| Chuột | Kéo-thả di chuyển ô, Ctrl+kéo sao chép, Shift+kéo chèn | ✅ | - | 17/10 (AGY-AUTOFILL): Kéo thả viền ô di chuyển, sao chép khớp Excel 2016 (docs/EXCEL2016-INPUT-MATRIX.md:33; tests/functions/structural-cases-13.json:1-30; tests/unit/sheet-mouse-shortcuts.test.js:1-30) |
| Chuột | Chọn: ô, hàng, cột, vùng, Ctrl+nhiều vùng, góc chọn tất cả | ✅ | - | Bộ phím chuột chọn ô hàng cột vùng góc chọn tất cả (docs/EXCEL2016-INPUT-MATRIX.md:19-20; docs/EXCEL2016-INPUT-MATRIX.md:33; tests/unit/sheet-mouse-shortcuts.test.js:1-30) |
| Chuột | Cuộn bánh xe, Ctrl+cuộn thu phóng | 🟢 | - | Cuộn bánh xe chuột và Ctrl cuộn thu phóng (apps/sheet/sheet-grid.js:815-825; sheet.view.zoomIn, sheet.view.zoomOut) |
| Bàn phím | Điều hướng (mũi tên, Ctrl+mũi tên, Home/End, Ctrl+Home/End, PgUp/PgDn, Tab/Enter) | ✅ | - | Điều hướng mũi tên, Home, End, PgUp, PgDn, Tab, Enter đối chiếu E3 (docs/EXCEL2016-INPUT-MATRIX.md:9-18; tests/unit/sheet-keyboard-audit.test.js:1-30) |
| Bàn phím | Nhập liệu (F2, Enter, Alt+Enter, Ctrl+Enter, Ctrl+;, Ctrl+Shift+;, F4) | ✅ | - | Nhập liệu F2, Enter, Alt+Enter, Ctrl+Enter, Ctrl+;, F4 đối chiếu E3/E3b (docs/EXCEL2016-INPUT-MATRIX.md:22-28; tests/unit/sheet-keyboard-audit.test.js:1-30) |
| Bàn phím | Phím tắt định dạng và lệnh (Ctrl+1, Ctrl+Shift+4/5/1, Ctrl+B/I/U, Ctrl+K, Ctrl+D/R, Ctrl+Z/Y) | ✅ | - | Phím tắt định dạng Ctrl+1, Ctrl+B, Ctrl+K, Ctrl+D, Ctrl+Z đối chiếu E3 (docs/EXCEL2016-INPUT-MATRIX.md:29-38; tests/unit/sheet-keyboard-audit.test.js:1-30; sheet.format.cellsDialog) |
| Bàn phím | Phím tắt Alt (KeyTips: Alt rồi chữ của tab, rồi chữ của nút) | 🟢 | 2 | Phím tắt Alt KeyTips hiện chữ của tab và nút (platform/ribbon/keytips.js:1-50; tests/unit/sheet-keyboard-audit.test.js:1-30) |
| Hộp thoại | Đủ hộp thoại: Định dạng ô, Dán đặc biệt, Tìm/Thay, Sắp xếp, Tên, Chèn/Xóa ô, Chiều cao/Độ rộng | ✅ | - | Đủ hộp thoại Định dạng ô, Dán đặc biệt, Tìm Thay, Sắp xếp đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:48; tests/unit/sheet-format-cells.test.js:1-30; sheet.format.cellsDialog, sheet.edit.pasteSpecial) |
| Tính tương thích | Mở/Lưu XLS, XLSX, ODS, CSV đúng bố cục | ✅ | - | Mở/Lưu XLS, XLSX, ODS, CSV đúng bố cục bộ 8 tệp 0 chênh lệch (tests/unit/sheet-file-io.test.js:1-35; common.file.open, common.file.save) |
| Tính tương thích | Giữ ảnh, hộp văn bản, bảng, định dạng số, ghi chú, split khi lưu | ✅ | - | Giữ ảnh, hộp văn bản, bảng, định dạng số, ghi chú khi lưu (tests/unit/sheet-notes-fidelity.test.js:90-100; sheet.insert.image) |
| Hiệu năng | Mở tệp lớn nhanh, gõ không trễ (ở mức Excel/LibreOffice) | ✅ | - | Hiệu năng mở tệp lớn nhanh gõ không trễ ở mức Excel/LibreOffice (docs/PERF-SHEET-OPEN-1012.md:1-30; tests/unit/sheet-virtual-scroll-row-heights.test.js:1-30) |
