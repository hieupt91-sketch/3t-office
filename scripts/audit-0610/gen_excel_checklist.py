# -*- coding: utf-8 -*-
"""Sinh docs/EXCEL2016-FEATURE-CHECKLIST.md: danh sách tính năng Excel 2016 và trạng thái trong VN Sheet.

Chạy: python scripts/audit-0610/gen_excel_checklist.py
Trạng thái:
  V = Có, ĐÃ đối chiếu với Excel 2016 thật (đọc lại bằng COM chỉ-đọc / test CDP trên app desktop)
  A = Có trong app, CHƯA đối chiếu với Excel 2016
  P = Có một phần (ghi rõ thiếu gì)
  N = Chưa có
  X = Ngoài phạm vi (cần dịch vụ đám mây Microsoft / không áp dụng cho bản chạy offline)
Ưu tiên của mục thiếu: 1 = người dùng văn phòng dùng thường xuyên, 2 = dùng khá thường, 3 = hiếm.
Mỗi dòng: Tab|Nhóm|Lệnh Excel 2016|Trạng thái|Ưu tiên|Ghi chú (lệnh/đường dẫn trong VN Sheet hoặc phần thiếu)
Nguồn trạng thái: quét ribbon Sheet (docs/ribbon-scan-sheet-1011.json), ma trận E1/E3/E4, đọc mã (grep), kiểm thực tế 13/10/2026.
"""
import collections
import re
import pathlib

DATA = """
Tệp (Backstage)|Tệp|Mới (Ctrl+N)|A|-|common.file.new
Tệp (Backstage)|Tệp|Mở (Ctrl+O): XLSX, XLS, ODS, CSV|V|-|Mở 28 tệp thật của công ty đạt 99,98% ô công thức khớp (tests/unit/sheet-file-io.test.js:1-30; common.file.open)
Tệp (Backstage)|Tệp|Mở gần đây (danh sách tệp)|A|-|Danh sách tệp gần đây trong Backstage menu (platform/shell/app-shell.js:960-985)
Tệp (Backstage)|Tệp|Lưu (Ctrl+S)|V|-|Lưu XLSX rồi Excel 2016 mở lại đúng (bộ 8 tệp bắt buộc 0 chênh lệch, docs/SHEET-BUTTON-MATRIX-1011.md:18-20; common.file.save)
Tệp (Backstage)|Tệp|Lưu thành (F12): XLSX, XLS 97-2003, ODS, CSV|A|-|common.file.saveAs; XLS 97-2003 đã sửa lỗi 0.9.10
Tệp (Backstage)|Tệp|Xuất PDF|A|-|common.file.exportPdf
Tệp (Backstage)|Tệp|Xuất / Chuyển đổi định dạng (mục riêng, giữ bố cục)|A|-|Đã có trong main (Backstage > Xuất và Chuyển đổi, common.file.exportConvert, CDP 21/21 do agy báo); chưa đối chiếu với Excel vì đây là tính năng của VN Office, không có trong Excel 2016
Tệp (Backstage)|Tệp|Lưu bản sao / Lưu thành mẫu (XLTX)|P|3|16/10: lưu .xltx qua đường lưu xlsx đầy đủ, Excel mở đúng là mẫu, LAN 10/10; mở .xltx đi đường mở chung (chưa có đường mở xlsx riêng)
Tệp (Backstage)|Tệp|In (Ctrl+P) + xem trước|V|-|Thiết lập trang/in đã đọc lại bằng Excel 2016 (tests/unit/sheet-print-preview.test.js:1-35; common.file.print)
Tệp (Backstage)|Tệp|Đóng (Ctrl+W)|A|-|common.file.close
Tệp (Backstage)|Thông tin|Bảo vệ sổ làm việc bằng mật khẩu mở file (mã hóa)|N|1|Chưa có mã hóa file; chỉ có bảo vệ cấu trúc
Tệp (Backstage)|Thông tin|Kiểm tra tài liệu (Inspect) / Đánh dấu là cuối cùng|P|3|15/10 (agy): Đánh dấu là cuối cùng (Mark as Final) xong, CDP 40/40; chưa có Kiểm tra tài liệu (Inspect)
Tệp (Backstage)|Thông tin|Quản lý phiên bản / khôi phục tự động (AutoRecover)|A|-|Có cơ chế tự động khôi phục AutoRecover (platform/help/entries-autorecover.js:28-34)
Tệp (Backstage)|Thông tin|Thuộc tính tệp (tác giả, tiêu đề...)|A|3|15/10 (agy): Thuộc tính tệp tác giả tiêu đề (apps/sheet/document-properties.js:105-125; sheet.file.properties); CDP 40/40; chưa đối chiếu Excel
Tệp (Backstage)|Tùy chọn|Hộp thoại Tùy chọn Excel (chung, công thức, lưu, nâng cao...)|P|2|Có một số tùy chọn rời; chưa có hộp thoại gộp
Tệp (Backstage)|Tùy chọn|Tùy biến ribbon / Thanh công cụ truy nhanh|P|2|16/10: Thanh công cụ truy nhanh tùy biến xong (chuột phải ribbon, mũi tên, đặt lại; CDP 15/15 trên Doc/Sheet/Slide); chưa tùy biến ribbon (thêm tab/nhóm)
Tệp (Backstage)|Chia sẻ|Chia sẻ/OneDrive/Email đính kèm|X|-|Cần dịch vụ đám mây
Trang đầu|Bảng nhớ tạm|Dán (Ctrl+V)|A|-|common.edit.paste
Trang đầu|Bảng nhớ tạm|Tùy chọn dán: giá trị / công thức / định dạng / chuyển vị|V|-|Dán đặc biệt đã đọc lại bằng Excel 2016 (tests/functions/structural-cases-4.json:1-10; tests/unit/sheet-paste-special.test.js:1-25; sheet.edit.pasteSpecial)
Trang đầu|Bảng nhớ tạm|Dán đặc biệt... (Ctrl+Alt+V) đủ lựa chọn (Validation, Column widths, Operation, Skip blanks)|P|2|Có giá trị/công thức/định dạng/chuyển vị; thiếu Operation, Skip blanks, Column widths (cần kiểm)
Trang đầu|Bảng nhớ tạm|Dán liên kết / Dán dạng hình / Sao chép dạng hình|N|3|
Trang đầu|Bảng nhớ tạm|Cắt (Ctrl+X) / Sao chép (Ctrl+C) kèm viền chạy (marching ants)|A|-|Cắt và sao chép có viền chạy (docs/SHEET-BUTTON-MATRIX-1011.md:15-16; common.edit.cut, common.edit.copy)
Trang đầu|Bảng nhớ tạm|Sao chép định dạng (Format Painter, nhấp đúp khóa)|A|-|sheet.edit.formatPainter
Trang đầu|Bảng nhớ tạm|Ngăn Clipboard (nhiều mục)|N|3|
Trang đầu|Phông chữ|Tên phông / Cỡ chữ / Tăng-giảm cỡ|A|-|Chọn phông, cỡ chữ và tăng giảm cỡ (docs/SHEET-BUTTON-MATRIX-1011.md:19-22; sheet.font.family, sheet.font.size, sheet.font.grow, sheet.font.shrink)
Trang đầu|Phông chữ|Đậm / Nghiêng / Gạch chân (Ctrl+B/I/U)|V|-|Hộp thoại Định dạng ô đã đọc lại bằng Excel 2016 (docs/SHEET-BUTTON-MATRIX-1011.md:23-25; sheet.cell.bold, sheet.cell.italic, sheet.cell.underline)
Trang đầu|Phông chữ|Gạch chân đôi / Gạch ngang / Chỉ số trên-dưới|A|-|sheet.format.cellsDialog tab Phông chữ; lưu XLSX giữ gạch chân đôi u=double, gạch ngang strike, chỉ số trên vertAlign=superscript, chỉ số dưới vertAlign=subscript đọc từ XML; chưa đối chiếu Excel thật vì Excel COM chưa dùng được (tests/live/cdp/sheet-font-effects.desktop.mjs)
Trang đầu|Phông chữ|Viền ô (thư viện + vẽ viền, kiểu đường, màu đường)|P|2|Có thư viện viền; chưa có Draw Border/Erase Border
Trang đầu|Phông chữ|Màu nền / Màu chữ (bảng màu + màu tùy chỉnh)|A|-|Màu nền và màu chữ (docs/SHEET-BUTTON-MATRIX-1011.md:27-28; sheet.cell.fillColor, sheet.cell.textColor)
Trang đầu|Phông chữ|Hộp thoại Định dạng ô (Ctrl+1)|V|-|Tab Số/Căn lề/Phông/Viền/Tô đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:48; tests/unit/sheet-format-cells.test.js:1-25; sheet.format.cellsDialog)
Trang đầu|Căn chỉnh|Căn trên/giữa/dưới; trái/giữa/phải|A|-|Căn trên, giữa, dưới, trái, phải (docs/SHEET-BUTTON-MATRIX-1011.md:29-35; sheet.cell.alignTop, sheet.cell.alignMiddle, sheet.cell.alignBottom, sheet.cell.alignLeft, sheet.cell.alignCenter, sheet.cell.alignRight)
Trang đầu|Căn chỉnh|Hướng chữ (xoay)|V|-|Xoay 90° đã đọc lại bằng Excel 2016 (docs/SHEET-BUTTON-MATRIX-1011.md:72; tests/unit/sheet-cell-orientation.test.js:1-25; sheet.format.alignmentDialog)
Trang đầu|Căn chỉnh|Ngắt dòng tự động (Wrap Text)|V|-|Ngắt dòng tự động Wrap Text đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:32; tests/unit/sheet-style-export-wrap-border-align.test.js:1-25; sheet.cell.wrapText)
Trang đầu|Căn chỉnh|Giảm/Tăng thụt lề|A|-|Giảm và tăng thụt lề ô (docs/SHEET-BUTTON-MATRIX-1011.md:36-37; sheet.cell.indentDecrease, sheet.cell.indentIncrease)
Trang đầu|Căn chỉnh|Trộn & căn giữa / Trộn theo hàng / Trộn ô / Tách ô|V|-|17/10 (AGY-DATATOOLS): Merge & Center, Merge Across, UnMerge đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.cell.merge; apps/sheet/sheet-grid.js:15503-15565
Trang đầu|Căn chỉnh|Căn đều, Distributed, Fill, Center across selection, Shrink to fit|V|-|16/10 (AGY-JUSTIFY): Center Across Selection và Shrink to Fit lưu/mở lại đúng, đối chiếu Excel 2016 (cases-7; tests/functions/structural-cases-7.json:1-15; tests/unit/sheet-cell-text-fit.test.js:1-25)
Trang đầu|Số|Danh sách định dạng số (Chung, Số, Tiền tệ, Kế toán, Ngày, Giờ, %, Khoa học, Văn bản)|V|-|Số/ngày/giờ/% đã đối chiếu (E3; docs/SHEET-BUTTON-MATRIX-1011.md:42; tests/unit/sheet-format-cells.test.js:1-30; sheet.format.quickCategory)
Trang đầu|Số|Định dạng số dạng Phân số (Fraction) và Đặc biệt (Special)|V|-|17/10 (AGY-NOTES): Phân số 9 mẫu và Đặc biệt 4 mẫu đối chiếu Excel 2016 COM 13/13 mẫu (cases-18; tests/functions/structural-cases-18.json:1-30; tests/unit/sheet-format-cells.test.js:1-40; sheet.format.quickCategory, sheet.format.cellsDialog)
Trang đầu|Số|Mã định dạng tùy chỉnh (Custom)|P|2|Giữ mã gốc khi lưu; chưa có giao diện soạn mã đầy đủ
Trang đầu|Số|Kế toán / % / Dấu phẩy / Tăng-giảm số lẻ|A|-|Định dạng kế toán, phần trăm, phân cách, tăng giảm số thập phân (docs/SHEET-BUTTON-MATRIX-1011.md:43-47; sheet.format.currencyVND, sheet.format.percent, sheet.format.standard, sheet.format.increaseDecimal, sheet.format.decreaseDecimal)
Trang đầu|Kiểu|Định dạng có điều kiện: Tô sáng ô — Lớn hơn / Nhỏ hơn|V|-|Quy tắc >2000 đã đọc lại bằng Excel 2016 (tests/functions/cf-golden-1.json:1-20; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Tô sáng ô — Giữa / Bằng / Chứa văn bản / Ngày xảy ra / Trùng lặp|V|-|G1 13/10: Excel 2016 đọc đúng luật gốc (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Quy tắc Trên/Dưới (Top-Bottom 10, Trên/Dưới trung bình)|V|-|G1: Quy tắc Trên/Dưới Excel 2016 đọc đúng (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Thanh dữ liệu (Data Bars)|V|-|G1: Data Bars Excel 2016 đọc Type=Databar (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Thang màu (Color Scales)|V|-|G1: Color Scales 2 và 3 màu, Excel 2016 đọc đúng (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Bộ biểu tượng (Icon Sets)|V|-|G1: Icon Sets Excel 2016 đọc IconSet.ID (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Quy tắc mới theo công thức|V|-|G1: Quy tắc mới công thức Excel 2016 đọc Type=Expression (tests/functions/cf-golden-1.json:1-25; tests/unit/sheet-cf-golden.test.js:1-30; sheet.format.conditional)
Trang đầu|Kiểu|Quản lý quy tắc (xem, xóa, sửa, thứ tự ưu tiên, Stop If True)|P|2|G1: có xem, sửa, đổi thứ tự, xóa; thiếu Stop If True
Trang đầu|Kiểu|Xóa quy tắc (vùng chọn / cả trang)|P|2|Xóa từng quy tắc trong quản lý
Trang đầu|Kiểu|Định dạng dưới dạng Bảng (gallery kiểu)|P|2|17/10 (AGY-TABLESTYLE): 21 kiểu Light/Medium/Dark đo màu từ Excel (cases-14 49/49 ô); Excel có 60 kiểu, chưa có Tùy chỉnh kiểu bảng
Trang đầu|Kiểu|Kiểu ô (Cell Styles) có sẵn + tạo kiểu mới|A|-|sheet.style.cellStyles
Trang đầu|Ô|Chèn ô/hàng/cột/trang tính|V|-|Hộp thoại Chèn ô, chèn trang tính (docs/SHEET-BUTTON-MATRIX-1011.md:52-53; tests/unit/sheet-row-col-insert.test.js:1-25; sheet.row.insert, sheet.col.insert)
Trang đầu|Ô|Xóa ô/hàng/cột/trang tính|V|-|Xóa ô, xóa hàng, xóa cột (docs/SHEET-BUTTON-MATRIX-1011.md:54-55; tests/unit/sheet-row-col-insert.test.js:1-25; sheet.row.delete, sheet.col.delete)
Trang đầu|Ô|Định dạng: chiều cao hàng, độ rộng cột, tự vừa khít|V|-|Mô hình chiều cao hàng và độ rộng cột (tests/unit/sheet-virtual-scroll-row-heights.test.js:1-30; tests/unit/sheet-overlap-autofit-status.test.js:1-25; sheet.row.height, sheet.col.width)
Trang đầu|Ô|Ẩn/Hiện hàng, cột, trang tính|A|-|Ẩn và hiện hàng, cột (apps/sheet/sheet-grid.js:1-30; sheet.row.hide, sheet.row.unhide, sheet.col.hide, sheet.col.unhide)
Trang đầu|Ô|Đổi tên, Di chuyển/Sao chép, Màu tab, Bảo vệ trang tính|A|-|Quản lý trang tính: đổi tên, di chuyển, màu tab, bảo vệ (tests/unit/sheet-rename-move-protect.test.js:1-25; sheet.sheet.protect)
Trang đầu|Ô|Khóa ô (Lock Cell) khi bảo vệ|A|-|sheet.sheet.protect; ô mở khóa sửa được, ô khóa bị chặn, xóa vùng có ô khóa bị chặn toàn bộ; lưu XLSX giữ sheetProtection và protection locked=0 (tests/live/cdp/sheet-lock-cells.desktop.mjs, scripts/audit-0610/sheet_lock_xml.py); chưa đối chiếu Excel thật vì Excel COM chưa dùng được
Trang đầu|Chỉnh sửa|Tổng tự động (Sum, Average, Count, Max, Min) và Thêm hàm|A|-|sheet.formula.sum + dropdown
Trang đầu|Chỉnh sửa|Điền: xuống / sang phải / Flash Fill|V|-|17/10 (AGY-DATATOOLS): Flash Fill và Điền đối chiếu Excel 2016 (cases-17 6/6 kịch bản; tests/functions/structural-cases-17.json:1-30; apps/sheet/data-tools.js:339-370; sheet.data.flashFill)
Trang đầu|Chỉnh sửa|Điền: lên / sang trái / Chuỗi (Series) / Căn đều / Trên các trang|V|-|16/10: Căn đều (sheet.edit.fillJustify, cases-7 47/47 ô, tests/functions/structural-cases-7.json:1-20) và Chuỗi Series (tests/unit/sheet-series.test.js:1-25)
Trang đầu|Chỉnh sửa|Xóa: tất cả / định dạng / nội dung|V|-|17/10 (AGY-DATATOOLS): Clear all, formats, contents đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.edit.clearAll; apps/sheet/sheet-grid.js:14842-15010
Trang đầu|Chỉnh sửa|Xóa ghi chú / Xóa siêu liên kết (trong menu Xóa)|V|-|17/10 (AGY-NOTES): Xóa ghi chú và siêu liên kết đối chiếu Excel 2016 (docs/excel-oracle-1710.json:2-31; tests/unit/sheet-clear-notes-links.test.js:1-55; tests/live/cdp/sheet-clear-notes-links.desktop.mjs:1-85; sheet.edit.clearComments, sheet.edit.clearHyperlinks)
Trang đầu|Chỉnh sửa|Sắp xếp A-Z / Z-A / Tùy chỉnh nhiều cấp|V|-|Sắp xếp hai cấp đã đọc lại bằng Excel 2016 (docs/SHEET-BUTTON-MATRIX-1011.md:57-58; tests/unit/sheet-data-tools.test.js:1-30; sheet.data.sortAsc, sheet.data.sortDesc)
Trang đầu|Chỉnh sửa|Sắp xếp theo màu ô/màu chữ/biểu tượng|P|3|G2: có sắp xếp theo màu ô/chữ; chưa có theo biểu tượng
Trang đầu|Chỉnh sửa|Bộ lọc (AutoFilter) bật/tắt|V|-|AutoFilterMode đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:59; tests/unit/sheet-data-tools.test.js:1-30; sheet.data.filter)
Trang đầu|Chỉnh sửa|Lọc theo màu / theo văn bản-số-ngày (text/number/date filters)|V|-|G2: lọc văn bản/số/ngày/màu; lưu giữ hàng ẩn đúng (tests/unit/sheet-data-tools.test.js:1-35; sheet.data.filter)
Trang đầu|Chỉnh sửa|Xóa bộ lọc / Áp dụng lại|A|-|Xóa bộ lọc và áp dụng lại (apps/sheet/sheet-grid.js:1-30; sheet.data.clearFilter, sheet.data.reapplyFilter)
Trang đầu|Chỉnh sửa|Tìm (Ctrl+F) / Thay thế (Ctrl+H), tùy chọn phân biệt hoa-thường, trong công thức|V|-|Thay thế trên hai trang đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:60-61; tests/unit/sheet-data-tools.test.js:1-25; common.edit.find, common.edit.replace)
Trang đầu|Chỉnh sửa|Đến (Go To, F5/Ctrl+G) / Đến đặc biệt (Go To Special)|A|-|Chuyển đến ô và đến đặc biệt Go To (apps/sheet/sheet-goto.js:1-40; tests/unit/sheet-keyboard-audit.test.js:1-30)
Trang đầu|Chỉnh sửa|Chọn khung chọn / Chọn đối tượng|P|3|17/10: có Ngăn chọn (AGY-ARRANGE) và chọn nhiều đối tượng; chưa có nút Chọn đối tượng riêng
Chèn|Bảng|PivotTable (tạo, kéo thả trường, làm mới)|V|-|PivotTables.Count đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:62; tests/unit/sheet-pivot-table.test.js:1-30; sheet.data.pivotTable)
Chèn|Bảng|PivotTable được đề xuất|N|3|
Chèn|Bảng|Bảng (Table, Ctrl+T)|V|-|ListObject, kiểu TableStyleMedium2 đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:50; tests/functions/structural-cases-8.json:1-20; tests/unit/sheet-table.test.js:1-30; sheet.style.formatAsTable)
Chèn|Minh họa|Hình ảnh từ tệp|A|-|sheet.insert.image; ảnh trong ô giữ nguyên khi lưu
Chèn|Minh họa|Hình ảnh trực tuyến / Ảnh chụp màn hình|X|-|Cần dịch vụ trực tuyến / chụp màn hình
Chèn|Minh họa|Hình dạng (Shapes)|P|2|Có hình dạng cơ bản; chưa kiểm đủ thư viện
Chèn|Minh họa|SmartArt|N|3|
Chèn|Add-in|Cửa hàng / Add-in của tôi|X|-|Cần cửa hàng Microsoft
Chèn|Biểu đồ|Cột nhóm / Đường / Tròn / Vùng|V|-|4 loại biểu đồ đã đọc lại bằng Excel 2016 loại 51/4/5/1 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert)
Chèn|Biểu đồ|Cột chồng / Cột 100% / Thanh ngang|V|-|G3: Cột chồng và thanh ngang Excel 2016 đọc đúng 52/53/57 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert)
Chèn|Biểu đồ|Cột 3-D|N|3|
Chèn|Biểu đồ|Phân tán (Scatter) / Bong bóng|V|-|G3: Scatter phân tán Excel 2016 đọc -4169/15 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert)
Chèn|Biểu đồ|Radar / Kết hợp (Combo)|V|-|G3: Radar kết hợp Combo Excel 2016 đọc -4151/-4111 (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-35; sheet.chart.insert)
Chèn|Biểu đồ|Chứng khoán / Bề mặt|N|3|
Chèn|Biểu đồ|Biểu đồ mới 2016: Waterfall / Histogram / Pareto / Box / Treemap / Sunburst|N|3|
Chèn|Biểu đồ|Biểu đồ được đề xuất / hộp thoại Tất cả biểu đồ|N|3|
Chèn|Biểu đồ|PivotChart|A|-|sheet.chart.pivotChart
Chèn|Biểu đồ|Bản đồ 3-D (3D Map)|N|3|
Chèn|Sparkline|Đường / Cột|V|-|SparklineGroups đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:66-67; sheet.insert.sparklineLine, sheet.insert.sparklineColumn)
Chèn|Sparkline|Thắng-thua (Win/Loss)|N|3|
Chèn|Bộ lọc|Slicer cho Bảng|V|-|Thiết kế Bảng > Chèn Slicer; Excel 2016 đọc lại cache, panel và lựa chọn (tests/unit/sheet-slicer.test.js:1-30; sheet.style.formatAsTable)
Chèn|Bộ lọc|Timeline|N|2|
Chèn|Liên kết|Siêu liên kết (Ctrl+K), Mở, Xóa, Sửa|A|-|Siêu liên kết chèn, mở, sửa, xóa (docs/SHEET-BUTTON-MATRIX-1011.md:68; sheet.insert.hyperlink)
Chèn|Liên kết|Liên kết tới ô khác / trang khác / email trong cùng sổ|A|-|sheet.insert.hyperlink: hộp Ctrl+K có mục Vị trí trong sổ làm việc này (trang tính + ô); lưu XLSX thành location=Trang!Ô, mở lại giữ, bấm đi tới đúng ô (tests/live/cdp/sheet-internal-link.desktop.mjs); chưa đối chiếu Excel thật vì Excel COM chưa dùng được
Chèn|Văn bản|Hộp văn bản|A|-|sheet.insert.textbox; hộp văn bản nhập từ XLSX giữ khi lưu
Chèn|Văn bản|Đầu trang & Chân trang|V|-|Header phải đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:70; sheet.page.headerFooter)
Chèn|Văn bản|WordArt / Dòng chữ ký / Đối tượng nhúng|N|3|
Chèn|Ký hiệu|Công thức (Equation)|N|3|
Chèn|Ký hiệu|Ký hiệu (Symbol)|A|-|Chèn ký hiệu đặc biệt Symbol (apps/sheet/sheet-grid.js:12779-12785; sheet.insert.symbol)
Bố trí trang|Giao diện|Chủ đề (Themes) / Màu / Phông / Hiệu ứng|V|-|Chủ đề Themes, Màu Colors, Phông Fonts đã đối chiếu Excel 2016 COM thật 19/19 trường hợp (tests/functions/structural-cases-19.json:1-35; tests/unit/sheet-themes.test.js:1-40; tests/live/cdp/sheet-themes.desktop.mjs:1-45; sheet.page.themes sheet.page.themeColors sheet.page.themeFonts)
Bố trí trang|Thiết lập trang|Lề (Margins) / Hướng giấy / Khổ giấy|V|-|sheet.page.margins sheet.page.orientation sheet.page.size: Landscape, Legal đã đọc lại bằng Excel 2016; danh sách chọn nhanh Thường/Rộng/Hẹp, Dọc/Ngang, A3/A4... Excel 2016 đọc đúng lề, Landscape, A3 (docs/AUDIT-SHEET-PAGE-GALLERY-1710.md:6)
Bố trí trang|Thiết lập trang|Vùng in / Xóa vùng in|V|-|Print area đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:74-75; tests/unit/sheet-comments-printarea.test.js:1-25; sheet.page.setPrintArea, sheet.page.clearPrintArea)
Bố trí trang|Thiết lập trang|Ngắt trang (chèn, xóa, đặt lại)|V|-|HBreaks/VBreaks đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:76-77; sheet.page.insertPageBreak, sheet.page.removePageBreak)
Bố trí trang|Thiết lập trang|Hình nền (Background)|N|3|
Bố trí trang|Thiết lập trang|In tiêu đề (Print Titles)|V|-|TitlesRows đã đối chiếu Print Titles (docs/SHEET-BUTTON-MATRIX-1011.md:78; tests/unit/sheet-print-titles-real-file-import.test.js:1-30; sheet.page.printTitles)
Bố trí trang|Thiết lập trang|Hộp thoại Page Setup đủ tab Trang/Lề/Đầu-Chân/Trang tính|A|-|tab Trang tính đã có in lưới, tiêu đề hàng cột, đen trắng, bản nháp, ghi chú, thứ tự trang, vùng in và tiêu đề lặp; lưu XLSX ghi đúng printOptions gridLines headings, pageSetup pageOrder overThenDown blackAndWhite cellComments atEnd đọc từ XML; chưa đối chiếu Excel thật vì Excel COM chưa dùng được ({{L:apps/sheet/page-setup-dialog.js|export class PageSetupDialog}} Page Setup, tests/live/cdp/sheet-page-setup-print-options.desktop.mjs)
Bố trí trang|Vừa trang|Chiều rộng / Chiều cao (Fit to pages) / Tỷ lệ %|V|-|sheet.page.fitWidth sheet.page.fitHeight sheet.page.scale: danh sách Chiều rộng/Chiều cao (Tự động, 1-5 trang) lưu rồi Excel 2016 đọc FitToPagesWide=1, FitToPagesTall=Tự động, Zoom=False (docs/AUDIT-SHEET-PAGE-GALLERY-1710.md:18)
Bố trí trang|Tùy chọn trang tính|Hiện/In đường lưới và tiêu đề|P|2|Hiện có; hộp xem trước in có tùy chọn in đường lưới; in tiêu đề hàng/cột cần kiểm
Bố trí trang|Sắp xếp|Đưa lên trên / Xuống dưới / Ngăn chọn / Căn / Nhóm / Xoay đối tượng|V|-|16/10 (AGY-ARRANGE): lớp, căn, phân bố, nhóm, xoay/lật, Ngăn chọn (tests/unit/sheet-arrange.test.js:54-60; sheet.arrange.group)
Công thức|Thư viện hàm|Chèn hàm (Shift+F3) + hộp thoại đối số|A|-|sheet.formula.insertFunction
Công thức|Thư viện hàm|Tổng tự động; Dùng gần đây; Tài chính / Logic / Văn bản / Ngày giờ / Tra cứu / Toán|A|-|Thư viện hàm trên ribbon (docs/SHEET-BUTTON-MATRIX-1011.md:86-92; sheet.formula.categoryFinancial, sheet.formula.categoryLogical, sheet.formula.categoryText)
Công thức|Thư viện hàm|Độ phủ hàm Excel 2016 (462 hàm)|P|1|18/10: engine nhận 394 trong 421 hàm đánh dấu Excel 2016 trong danh mục (đo bằng gọi rỗng từng hàm), gồm cả MMULT; vừa thêm T.TEST, F.TEST, CHISQ.TEST, GAMMA, CELL, INFO và tên cũ TTEST, FTEST, CHITEST đối chiếu LibreOffice tới 1e-9 vì Excel COM chưa dùng được (BLOCKED, chưa vào bộ vàng Excel). Còn thiếu: BAHTTEXT, DBCS, PHONETIC, RTD, GETPIVOTDATA, ODDFPRICE, ODDFYIELD, FORECAST.ETS và 3 hàm con, 7 hàm CUBE; danh mục còn đánh dấu nhầm vài hàm sau 2016 như GROUPBY, REGEX*, TRANSLATE (tests/unit/formula-hypothesis-tests.test.js:48)
Công thức|Thư viện hàm|Công thức mảng (CSE, Ctrl+Shift+Enter)|V|-|17/10 (CODEX-ARRAYS): CSE một/nhiều ô, MMULT/TRANSPOSE khớp Excel (tests/unit/sheet-array-formulas.test.js:63-79)
Công thức|Thư viện hàm|Tham chiếu có cấu trúc (Table1[Cột])|V|-|17/10: Tham chiếu có cấu trúc Table1[Cột] khớp Excel 2016 (tests/unit/structured-references.test.js:1-30; tests/functions/structural-cases-8.json:1-25)
Công thức|Thư viện hàm|Tham chiếu 3-D giữa các trang (Sheet1:Sheet3!A1)|V|-|Tham chiếu 3-D giữa các trang khớp Excel 2016 (tests/functions/golden-batch10-3d.json:1-20; tests/unit/sheet-formula-odf.test.js:1-30)
Công thức|Tên đã xác định|Trình quản lý tên / Xác định tên / Tạo từ vùng chọn / Dùng trong công thức|V|-|Quản lý tên và xác định tên SampleNames đã đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:95-98; tests/unit/sheet-named-ranges-text-date.test.js:1-25; sheet.formula.nameManager, sheet.formula.defineName)
Công thức|Kiểm tra công thức|Tìm ô tiền lệ / phụ thuộc / Xóa mũi tên|A|-|Tìm ô tiền lệ, phụ thuộc và xóa mũi tên (docs/SHEET-BUTTON-MATRIX-1011.md:99-101; sheet.formula.tracePrecedents, sheet.formula.traceDependents, sheet.formula.removeArrows)
Công thức|Kiểm tra công thức|Hiện công thức (Ctrl+`) / Kiểm tra lỗi / Ước lượng công thức|A|-|Hiện công thức, kiểm tra lỗi và ước lượng (docs/SHEET-BUTTON-MATRIX-1011.md:102-104; sheet.formula.showFormulas, sheet.formula.errorChecking, sheet.formula.evaluateFormula)
Công thức|Kiểm tra công thức|Cửa sổ theo dõi (Watch Window)|A|-|Cửa sổ theo dõi Watch Window (docs/SHEET-BUTTON-MATRIX-1011.md:105; tests/unit/sheet-watch-window.test.js:1-25; sheet.formula.watchWindow)
Công thức|Tính toán|Tự động / Thủ công; Tính lại (F9); Tính trang (Shift+F9)|A|-|Tùy chọn tính toán tự động, thủ công, tính lại F9 (docs/SHEET-BUTTON-MATRIX-1011.md:106-108; sheet.calc.calculationOptions, sheet.formula.recalculate, sheet.calc.calculateSheet)
Công thức|Tính toán|Tính lặp (Iterative) / Độ chính xác như hiển thị / Hệ ngày 1904|V|-|16/10 (AGY-CALC): tính lặp Iterative, 1904, độ chính xác như hiển thị (tests/functions/structural-cases-9.json:1-25; tests/unit/sheet-calc-options.test.js:1-30)
Công thức|Tính toán|Kiểu tham chiếu R1C1|V|-|17/10 (AGY-CALC): Kiểu tham chiếu R1C1 khớp Excel 2016 (tests/functions/structural-cases-9.json:50-60)
Dữ liệu|Lấy dữ liệu|Từ văn bản/CSV, Web, Access, Cơ sở dữ liệu, Power Query|P|2|Mở CSV có; chưa có Power Query/kết nối ngoài
Dữ liệu|Kết nối|Làm mới tất cả / Kết nối / Thuộc tính / Liên kết ngoài (Edit Links)|P|2|17/10 (AGY-LINKS): Chỉnh sửa liên kết, cập nhật/đổi nguồn/ngắt liên kết khớp Excel (cases-11 6/6 ô, LAN 10/10); chưa có kết nối dữ liệu ngoài (Power Query/ODBC)
Dữ liệu|Sắp xếp & Lọc|Sắp xếp A-Z, Z-A, Sắp xếp tùy chỉnh|V|-|Sắp xếp A-Z, Z-A và tùy chỉnh (docs/SHEET-BUTTON-MATRIX-1011.md:57-58; docs/SHEET-BUTTON-MATRIX-1011.md:112; sheet.data.sortAsc, sheet.data.sortDesc, sheet.data.customSort)
Dữ liệu|Sắp xếp & Lọc|Bộ lọc nâng cao (Advanced Filter, vùng tiêu chí)|V|-|Bộ lọc nâng cao Advanced Filter (cases-6; tests/functions/structural-cases-6.json:1-25; tests/unit/sheet-data-tools.test.js:1-30; sheet.data.advancedFilter)
Dữ liệu|Công cụ dữ liệu|Tách văn bản thành cột|V|-|17/10 (AGY-DATATOOLS): TextToColumns dấu phẩy/tab/khoảng trắng/ngoặc kép/bỏ qua cột đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.data.textToColumns; apps/sheet/data-tools.js:300-335
Dữ liệu|Công cụ dữ liệu|Flash Fill|V|-|17/10 (AGY-DATATOOLS): Flash Fill tách họ-tên/ghép/mã đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.data.flashFill; apps/sheet/data-tools.js:339-370
Dữ liệu|Công cụ dữ liệu|Xóa trùng lặp|V|-|17/10 (AGY-DATATOOLS): RemoveDuplicates 1/nhiều cột, header, không phân biệt hoa thường đối chiếu Excel 2016 (cases-17 6/6 kịch bản); sheet.data.removeDuplicates; apps/sheet/data-tools.js:25-75
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Danh sách|V|-|Validation.Type=3 danh sách đã đối chiếu (tests/functions/dv-golden-1.json:1-20; tests/unit/sheet-dv-golden.test.js:1-25; sheet.data.validation)
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Số nguyên / Số thập phân|V|-|G2: Kiểm tra dữ liệu Số nguyên / Thập phân Excel 2016 đọc Type 1/2 (tests/functions/dv-golden-1.json:1-20; tests/unit/sheet-dv-golden.test.js:1-25; sheet.data.validation)
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Ngày / Giờ / Độ dài văn bản / Tùy chỉnh (công thức)|V|-|G2: Kiểm tra dữ liệu Ngày/Giờ/Độ dài/Tùy chỉnh Excel 2016 đọc Type 4/5/6/7 (tests/functions/dv-golden-1.json:1-20; tests/unit/sheet-dv-golden.test.js:1-25; sheet.data.validation)
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Thông báo nhập, Cảnh báo lỗi (Stop/Warning/Info), Khoanh vòng dữ liệu sai|P|3|G2: thông báo nhập + 3 mức cảnh báo Excel 2016 đọc đúng; khoanh vòng chưa so hình
Dữ liệu|Công cụ dữ liệu|Hợp nhất dữ liệu (Consolidate)|V|-|17/10 (AGY-DATATOOLS): Consolidate hợp nhất dữ liệu đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; tests/unit/sheet-consolidate.test.js:1-30; apps/sheet/consolidate.js:1-30; sheet.data.consolidate)
Dữ liệu|Công cụ dữ liệu|Quan hệ giữa bảng / Mô hình dữ liệu (Power Pivot)|N|3|
Dữ liệu|Dự báo|Phân tích What-If: Trình quản lý kịch bản|V|-|17/10 (AGY-DATATOOLS): Trình quản lý kịch bản Scenario Manager đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; tests/unit/sheet-what-if-analysis.test.js:1-35; apps/sheet/sheet-grid.js:20784-20800; sheet.data.scenarioManager)
Dữ liệu|Dự báo|What-If: Goal Seek / Bảng dữ liệu (Data Table)|V|-|17/10 (AGY-DATATOOLS): Goal Seek và Table đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; tests/unit/sheet-goal-seek.test.js:1-30; apps/sheet/sheet-grid.js:20373-20390; sheet.data.goalSeek)
Dữ liệu|Dự báo|Trang dự báo (Forecast Sheet)|N|3|
Dữ liệu|Dàn bài|Nhóm / Bỏ nhóm / Tổng phụ|V|-|17/10 (AGY-DATATOOLS): Group/Ungroup hàng-cột và Subtotal/RemoveSubtotal đối chiếu Excel 2016 (cases-17 12/12 kịch bản); sheet.data.subtotal; apps/sheet/data-tools.js:77-185
Dữ liệu|Dàn bài|Hiện/Ẩn chi tiết và nút cấp 1-2-3|V|-|17/10 (AGY-DATATOOLS): ShowOutlineLevels mức 1/2 ẩn/hiện chi tiết đối chiếu Excel 2016 (tests/functions/structural-cases-17.json:1-30; {{L:apps/sheet/sheet-grid.js|this._outlineGroups().forEach(g => {}}; sheet.data.group)
Dữ liệu|Phân tích|Solver|N|3|Bổ sung của Excel
Xem xét|Soát lỗi|Chính tả (F7)|A|-|sheet.review.spellCheck
Xem xét|Soát lỗi|Từ đồng nghĩa (Thesaurus) / Thống kê sổ làm việc|N|3|
Xem xét|Trợ năng|Kiểm tra trợ năng|N|3|
Xem xét|Thông tin chi tiết|Smart Lookup|X|-|Cần dịch vụ Bing
Xem xét|Ngôn ngữ|Dịch|P|3|Tính năng 3T AI (cần mạng, xin phép riêng)
Xem xét|Ghi chú|Ghi chú mới / Sửa / Xóa|V|-|Ghi chú mới, sửa, xóa đã kiểm (docs/SHEET-BUTTON-MATRIX-1011.md:125-126; tests/functions/structural-cases-16.json:1-20; tests/unit/sheet-notes-fidelity.test.js:1-25; sheet.review.commentInsert, sheet.review.commentDelete)
Xem xét|Ghi chú|Trước / Sau / Hiện-Ẩn tất cả ghi chú|A|-|sheet.review.commentShowAll bật tắt hiện tất cả ghi chú ghim trên lưới (2 ghi chú hiện rồi ẩn đúng), lưu XLSX giữ ghi chú đúng ô và nội dung đọc từ XML; chưa đối chiếu Excel thật vì Excel COM chưa dùng được (tests/live/cdp/sheet-notes-show-all.desktop.mjs)
Xem xét|Ghi chú|Nhận xét có luồng (threaded comments)|N|3|Excel 2016 chỉ có ghi chú cổ điển
Xem xét|Thay đổi|Bảo vệ trang tính (mật khẩu, tùy chọn cho phép)|A|-|sheet.sheet.protect
Xem xét|Thay đổi|Bảo vệ sổ làm việc (cấu trúc)|A|-|sheet.workbook.protect
Xem xét|Thay đổi|Cho phép người dùng sửa vùng (Allow Users to Edit Ranges)|N|3|
Xem xét|Thay đổi|Chia sẻ sổ làm việc / Theo dõi thay đổi (cũ)|N|3|
Chế độ xem|Chế độ xem sổ|Bình thường / Xem ngắt trang / Bố trí trang|A|-|Chế độ xem sổ: Bình thường, Ngắt trang, Bố trí trang (docs/SHEET-BUTTON-MATRIX-1011.md:132-134; sheet.view.normal, sheet.view.pageBreakPreview, sheet.view.pageLayout)
Chế độ xem|Chế độ xem sổ|Chế độ xem tùy chỉnh (Custom Views)|N|3|
Chế độ xem|Chế độ xem sổ|Toàn màn hình (F11)|A|-|common.view.fullScreen
Chế độ xem|Hiển thị|Thước / Đường lưới / Thanh công thức / Tiêu đề|A|-|Hiển thị đường lưới, thanh công thức, tiêu đề (docs/SHEET-BUTTON-MATRIX-1011.md:80-81; docs/SHEET-BUTTON-MATRIX-1011.md:137; sheet.view.gridlines, sheet.view.formulaBar, sheet.view.headings)
Chế độ xem|Thu phóng|Thu phóng (hộp thoại) / 100% / Phóng vùng chọn|A|-|Thu phóng 100% và phóng vùng chọn (docs/SHEET-BUTTON-MATRIX-1011.md:139-142; sheet.view.zoomIn, sheet.view.zoomReset, sheet.view.zoomToSelection, sheet.view.zoomOut)
Chế độ xem|Cửa sổ|Cửa sổ mới|A|-|sheet.view.newWindow
Chế độ xem|Cửa sổ|Cố định ngăn (hàng đầu / cột đầu / tại ô)|V|-|Cố định ngăn SplitRow/SplitColumn đã đối chiếu (tests/unit/sheet-freeze-panes-real.test.js:1-30; sheet.view.freezeTopRow, sheet.view.freezeFirstColumn)
Chế độ xem|Cửa sổ|Chia (Split)|V|-|Chia khung Split lưu và mở lại đã đối chiếu (tests/unit/sheet-freeze-panes-real.test.js:1-30; apps/sheet/sheet-grid.js:1-40)
Chế độ xem|Cửa sổ|Sắp xếp tất cả / Ẩn-Hiện cửa sổ / Xem song song / Cuộn đồng bộ / Đặt lại vị trí|N|3|
Chế độ xem|Cửa sổ|Chuyển cửa sổ (Switch Windows)|P|3|Mở nhiều cửa sổ có; menu chuyển cần kiểm
Chế độ xem|Macro|Xem macro / Ghi macro|A|-|Xem và ghi macro (docs/SHEET-BUTTON-MATRIX-1011.md:144-145; common.macro.recordToggle, common.macro.manager)
Chế độ xem|Macro|Tham chiếu tương đối khi ghi|N|3|
Nhà phát triển|Mã|Visual Basic / chạy VBA|N|3|Không hỗ trợ VBA (ngoài phạm vi giấy phép/thiết kế); macro riêng của 3T
Nhà phát triển|Điều khiển|Form controls (nút, checkbox, combo...) / Chế độ thiết kế|N|2|
Nhà phát triển|XML|Nhập/Xuất XML, Bản đồ XML|N|3|
Trợ giúp|Trợ giúp|Trợ giúp (F1) + tìm theo tên tính năng|A|-|sheet.help.open; có hướng dẫn tiếng Việt
Trợ giúp|Trợ giúp|Cho tôi biết bạn muốn làm gì (Alt+Q)|A|-|Ô tìm kiếm tính năng Tell Me trên thanh tiêu đề (platform/shell/app-shell.js:1-40; platform/commands/command-definitions.js:1-30)
Công cụ Bảng|Thiết kế|Đổi tên bảng|A|-|Đổi tên bảng Table (tests/functions/structural-cases-8.json:1-25; tests/unit/sheet-table.test.js:1-30; sheet.style.formatAsTable)
Công cụ Bảng|Thiết kế|Dòng tổng (Total Row)|V|-|Mới 13/10, Excel 2016 đọc ShowTotals Total Row đúng (tests/unit/sheet-table.test.js:127-140; sheet.table.toggleTotalRow)
Công cụ Bảng|Thiết kế|Chuyển thành phạm vi|A|-|Chuyển bảng thành phạm vi thường (tests/unit/sheet-table.test.js:164-175; sheet.table.convertToRange)
Công cụ Bảng|Thiết kế|Chèn/Xóa cột-hàng bảng|A|-|Chèn và xóa cột, hàng trong bảng (apps/sheet/sheet-grid.js:4500-4560; sheet.row.insert, sheet.col.insert)
Công cụ Bảng|Thiết kế|Đổi kích thước bảng (Resize Table)|V|-|16/10 (AGY-TABLE): Resize Table cases-8 26/26 kịch bản, 189/189 ô khớp Excel 2016 (tests/functions/structural-cases-8.json:1-30; tests/unit/sheet-table.test.js:1-30)
Công cụ Bảng|Thiết kế|Tùy chọn kiểu: Hàng tiêu đề, Cột đầu/cuối, Hàng/Cột sọc, Nút lọc|V|-|17/10 (AGY-TABLESTYLE): đủ 7 hộp kiểm kiểu bảng sống, cases-14 49/49 ô khớp Excel (tests/functions/structural-cases-14.json:1-30; tests/unit/sheet-tablestyle.test.js:1-30; sheet.table.toggleHeaderRow)
Công cụ Bảng|Thiết kế|Chèn Slicer|V|-|Giai đoạn 1 hoàn thành 16/10: panel nổi, đa chọn, lọc kết hợp Slicer (tests/unit/sheet-slicer.test.js:1-30; sheet.style.formatAsTable)
Công cụ Bảng|Thiết kế|Xuất bảng|N|2|
Công cụ Biểu đồ|Thiết kế|Thêm thành phần: tiêu đề trục|V|-|Tiêu đề trục biểu đồ Excel 2016 đọc đúng (tests/unit/sheet-charts.test.js:1-30; docs/SHEET-BUTTON-MATRIX-1011.md:64; sheet.chart.insert)
Công cụ Biểu đồ|Thiết kế|Thêm thành phần: tiêu đề biểu đồ, chú giải, nhãn dữ liệu, đường xu hướng|V|-|G3: Tiêu đề biểu đồ chú giải đường xu hướng Excel 2016 đọc HasDataLabels/Trendlines (tests/unit/sheet-charts.test.js:1-30; docs/SHEET-BUTTON-MATRIX-1011.md:64; sheet.chart.insert)
Công cụ Biểu đồ|Thiết kế|Thêm thành phần: lưới, thanh sai số|N|3|
Công cụ Biểu đồ|Thiết kế|Bố cục nhanh / Đổi màu / Kiểu biểu đồ|N|2|
Công cụ Biểu đồ|Thiết kế|Chọn dữ liệu / Đổi loại / Di chuyển biểu đồ|A|-|Chọn dữ liệu, đổi loại và di chuyển biểu đồ (docs/SHEET-BUTTON-MATRIX-1011.md:64; tests/unit/sheet-charts.test.js:1-30; sheet.chart.insert)
Công cụ Biểu đồ|Thiết kế|Chuyển hàng/cột (Switch Row/Column)|V|-|G3: Chuyển hàng/cột Switch Row/Column PlotBy đọc đúng (tests/unit/sheet-charts.test.js:1-30; docs/SHEET-BUTTON-MATRIX-1011.md:64; sheet.chart.insert)
Công cụ Biểu đồ|Định dạng|Màu/viền/hiệu ứng thành phần, kích thước, vị trí|N|2|
Công cụ PivotTable|Phân tích|Làm mới / Đổi nguồn / Danh sách trường|V|-|17/10 (AGY-PIVOT): đổi nguồn dữ liệu khớp Excel 2016 (cases-15 88/88 ô; tests/functions/structural-cases-15.json:1-30; tests/unit/sheet-pivot-table.test.js:1-30; sheet.data.pivotRefresh)
Công cụ PivotTable|Phân tích|Nhóm (ngày/số) / Trường tính toán / Slicer|P|2|17/10: nhóm số/ngày và trường tính toán khớp Excel (cases-15); Slicer cho PivotTable chưa làm (giữ cho phiếu riêng)
Công cụ PivotTable|Thiết kế|Bố cục báo cáo / Tổng phụ / Kiểu PivotTable|N|2|
Công cụ Hình ảnh|Định dạng|Cắt (Crop) / Kích thước / Xoay / Kiểu hình / Viền|N|2|
Công cụ Vẽ|Định dạng|Màu tô / Viền / Hiệu ứng hình|N|2|
Công cụ Sparkline|Thiết kế|Sửa dữ liệu / Đổi loại / Điểm đánh dấu / Màu / Trục / Nhóm|N|3|
Không thuộc ribbon|Hộp tên và thanh công thức|Hộp tên (Name Box) nhảy tới ô/tên|A|-|Hộp tên Name Box điều hướng ô và vùng tên (docs/EXCEL2016-INPUT-MATRIX.md:21; apps/sheet/sheet-formula-bar.js:1-40)
Không thuộc ribbon|Hộp tên và thanh công thức|Mở rộng thanh công thức; Ctrl+Shift+U|A|-|sheet.view.expandFormulaBar: nút ▾ cuối thanh, Ctrl+Shift+U (lưới và thanh công thức), nút ruy-băng; mở rộng cao 5–12 dòng, thu gọn về một dòng, không đổi nội dung ô (tests/live/cdp/sheet-expand-formula-bar.desktop.mjs 8/8); thao tác hiển thị, không có đối chiếu Excel thật
Không thuộc ribbon|Thanh trạng thái|Tổng/Trung bình/Đếm vùng chọn; nút chế độ xem; thanh thu phóng|A|-|Thanh trạng thái tính tổng, trung bình, đếm (tests/unit/sheet-status-bar-sum.test.js:1-30; apps/sheet/sheet-grid.js:1-30)
Không thuộc ribbon|Thanh trạng thái|Menu tùy chỉnh thanh trạng thái|N|3|
Không thuộc ribbon|Tab trang tính|Cuộn tab, thêm trang, kéo đổi thứ tự|A|-|sheet.sheet.moveOrCopy; kéo tab bằng chuột thật đổi thứ tự có vạch báo, Esc hủy, Hoàn tác trả lại, lưu XLSX mở lại giữ thứ tự (tests/live/cdp/sheet-tab-drag.desktop.mjs); chưa đối chiếu Excel thật vì Excel COM chưa dùng được
Không thuộc ribbon|Tab trang tính|Menu chuột phải tab (Chèn, Xóa, Đổi tên, Di chuyển, Bảo vệ, Màu, Ẩn, Hiện)|V|-|Menu chuột phải tab trang tính đúng thứ tự Excel (tests/unit/sheet-rename-move-protect.test.js:1-30; sheet.sheet.protect)
Không thuộc ribbon|Tab trang tính|Chọn nhiều trang cùng lúc (nhóm trang) / Chọn tất cả trang|V|-|F2: Nhóm nhiều trang tính cùng lúc khớp Excel COM ({{L:apps/sheet/sheet-grid.js|Chọn tất cả các trang tính}})
Không thuộc ribbon|Chuột phải|Menu ô (Cắt/Sao chép/Dán/Chèn/Xóa/Lọc/Sắp xếp/Ghi chú/Định dạng/Tên/Liên kết)|V|-|Menu ngữ cảnh chuột phải trên ô đối chiếu CommandBars Excel 2016 (docs/EXCEL2016-INPUT-MATRIX.md:39; tests/unit/sheet-keyboard-audit.test.js:1-30; common.edit.cut, common.edit.copy, common.edit.paste)
Không thuộc ribbon|Chuột phải|Menu tiêu đề hàng/cột|V|-|Menu tiêu đề hàng cột chuột phải (docs/EXCEL2016-INPUT-MATRIX.md:34; tests/unit/sheet-row-col-insert.test.js:1-25; sheet.row.insert, sheet.col.insert)
Không thuộc ribbon|Chuột phải|Menu trong bảng (Chèn/Xóa/Chọn/Bảng)|V|-|Menu chuột phải trong bảng đối chiếu (tests/unit/sheet-table.test.js:1-30; tests/functions/structural-cases-8.json:1-25; sheet.style.formatAsTable)
Không thuộc ribbon|Chuột phải|Menu biểu đồ|A|-|Menu chuột phải trên đối tượng biểu đồ (tests/unit/sheet-object-menu.test.js:1-30; tests/unit/sheet-charts.test.js:1-30; sheet.chart.insert)
Không thuộc ribbon|Chuột phải|Menu hình / ảnh / hộp văn bản|V|-|17/10 (AGY-CTXMENU): Menu hình ảnh hộp văn bản đo bằng CommandBars (tests/unit/sheet-context-menu-objects.test.js:102-130; sheet.insert.image)
Không thuộc ribbon|Chuột phải|Phân tích nhanh (Quick Analysis) / Chọn từ danh sách thả xuống|N|2|
Không thuộc ribbon|Chuột|Kéo chốt điền (Fill Handle), nhấp đúp điền xuống, tùy chọn tự điền|V|-|17/10 (AGY-AUTOFILL): Kéo chốt điền Fill Handle nhấp đúp khớp Excel 2016 (docs/EXCEL2016-INPUT-MATRIX.md:31-32; tests/functions/structural-cases-13.json:1-30; tests/unit/sheet-mouse-shortcuts.test.js:1-30)
Không thuộc ribbon|Chuột|Kéo đổi độ rộng cột/chiều cao hàng, nhấp đúp tự vừa|A|-|Kéo đường biên đổi độ rộng cột, chiều cao hàng tự vừa (docs/EXCEL2016-INPUT-MATRIX.md:34-35; tests/unit/sheet-mouse-shortcuts.test.js:1-30; sheet.row.autoFit, sheet.col.autoFit)
Không thuộc ribbon|Chuột|Kéo-thả di chuyển ô, Ctrl+kéo sao chép, Shift+kéo chèn|V|-|17/10 (AGY-AUTOFILL): Kéo thả viền ô di chuyển, sao chép khớp Excel 2016 (docs/EXCEL2016-INPUT-MATRIX.md:33; tests/functions/structural-cases-13.json:1-30; tests/unit/sheet-mouse-shortcuts.test.js:1-30)
Không thuộc ribbon|Chuột|Chọn: ô, hàng, cột, vùng, Ctrl+nhiều vùng, góc chọn tất cả|V|-|Bộ phím chuột chọn ô hàng cột vùng góc chọn tất cả (docs/EXCEL2016-INPUT-MATRIX.md:19-20; docs/EXCEL2016-INPUT-MATRIX.md:33; tests/unit/sheet-mouse-shortcuts.test.js:1-30)
Không thuộc ribbon|Chuột|Cuộn bánh xe, Ctrl+cuộn thu phóng|A|-|Cuộn bánh xe chuột và Ctrl cuộn thu phóng (apps/sheet/sheet-grid.js:815-825; sheet.view.zoomIn, sheet.view.zoomOut)
Không thuộc ribbon|Bàn phím|Điều hướng (mũi tên, Ctrl+mũi tên, Home/End, Ctrl+Home/End, PgUp/PgDn, Tab/Enter)|V|-|Điều hướng mũi tên, Home, End, PgUp, PgDn, Tab, Enter đối chiếu E3 (docs/EXCEL2016-INPUT-MATRIX.md:9-18; tests/unit/sheet-keyboard-audit.test.js:1-30)
Không thuộc ribbon|Bàn phím|Nhập liệu (F2, Enter, Alt+Enter, Ctrl+Enter, Ctrl+;, Ctrl+Shift+;, F4)|V|-|Nhập liệu F2, Enter, Alt+Enter, Ctrl+Enter, Ctrl+;, F4 đối chiếu E3/E3b (docs/EXCEL2016-INPUT-MATRIX.md:22-28; tests/unit/sheet-keyboard-audit.test.js:1-30)
Không thuộc ribbon|Bàn phím|Phím tắt định dạng và lệnh (Ctrl+1, Ctrl+Shift+4/5/1, Ctrl+B/I/U, Ctrl+K, Ctrl+D/R, Ctrl+Z/Y)|V|-|Phím tắt định dạng Ctrl+1, Ctrl+B, Ctrl+K, Ctrl+D, Ctrl+Z đối chiếu E3 (docs/EXCEL2016-INPUT-MATRIX.md:29-38; tests/unit/sheet-keyboard-audit.test.js:1-30; sheet.format.cellsDialog)
Không thuộc ribbon|Bàn phím|Phím tắt Alt (KeyTips: Alt rồi chữ của tab, rồi chữ của nút)|A|2|Phím tắt Alt KeyTips hiện chữ của tab và nút (platform/ribbon/keytips.js:1-50; tests/unit/sheet-keyboard-audit.test.js:1-30)
Không thuộc ribbon|Hộp thoại|Đủ hộp thoại: Định dạng ô, Dán đặc biệt, Tìm/Thay, Sắp xếp, Tên, Chèn/Xóa ô, Chiều cao/Độ rộng|V|-|Đủ hộp thoại Định dạng ô, Dán đặc biệt, Tìm Thay, Sắp xếp đối chiếu (docs/SHEET-BUTTON-MATRIX-1011.md:48; tests/unit/sheet-format-cells.test.js:1-30; sheet.format.cellsDialog, sheet.edit.pasteSpecial)
Không thuộc ribbon|Tính tương thích|Mở/Lưu XLS, XLSX, ODS, CSV đúng bố cục|V|-|Mở/Lưu XLS, XLSX, ODS, CSV đúng bố cục bộ 8 tệp 0 chênh lệch (tests/unit/sheet-file-io.test.js:1-35; common.file.open, common.file.save)
Không thuộc ribbon|Tính tương thích|Giữ ảnh, hộp văn bản, bảng, định dạng số, ghi chú, split khi lưu|V|-|Giữ ảnh, hộp văn bản, bảng, định dạng số, ghi chú khi lưu (tests/unit/sheet-notes-fidelity.test.js:90-100; sheet.insert.image)
Không thuộc ribbon|Hiệu năng|Mở tệp lớn nhanh, gõ không trễ (ở mức Excel/LibreOffice)|V|-|Hiệu năng mở tệp lớn nhanh gõ không trễ ở mức Excel/LibreOffice (docs/PERF-SHEET-OPEN-1012.md:1-30; tests/unit/sheet-virtual-scroll-row-heights.test.js:1-30)
"""

ORDER = ["V", "A", "P", "N", "X"]
LABEL = {"V": "Đã đối chiếu Excel 2016", "A": "Có, chưa đối chiếu", "P": "Có một phần", "N": "Chưa có", "X": "Ngoài phạm vi"}
ICON = {"V": "✅", "A": "🟢", "P": "🟡", "N": "🔴", "X": "⚪"}


def parse():
    rows = []
    def _resolve_refs(text):
        root = pathlib.Path(__file__).resolve().parents[2]

        def one(match):
            rel, needle = match.group(1), match.group(2)
            for number, content in enumerate((root / rel).read_text(encoding="utf-8").splitlines(), 1):
                if needle in content:
                    return f"{rel}:{number}"
            raise SystemExit(f"Không thấy '{needle}' trong {rel} (trích dẫn {{{{L:...}}}})")
        return re.sub(r"\{\{L:([^|}]+)\|([^}]+)\}\}", one, text)

    for line in _resolve_refs(DATA).strip().splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 5:
            raise SystemExit(f"Dòng sai định dạng: {line}")
        parts += [""] * (6 - len(parts))
        rows.append(parts[:6])
    return rows


def pct(n, d):
    return f"{(100.0 * n / d):.0f}%" if d else "-"


def main():
    rows = parse()
    by_tab = collections.OrderedDict()
    for row in rows:
        by_tab.setdefault(row[0], []).append(row)
    total = collections.Counter(r[3] for r in rows)
    applicable = len(rows) - total["X"]
    coverage = (total["V"] + total["A"] + 0.5 * total["P"]) / applicable * 100
    verified = total["V"] / applicable * 100
    out = []
    out.append("# Danh sách tính năng Excel 2016 và trạng thái trong VN Sheet\n")
    out.append("Chuẩn: Excel 2016 (16.0.4266) cài trên máy, đọc chỉ-đọc qua COM. Lập 13/10/2026 từ quét ribbon thật, ma trận E1/E3/E4, đọc mã và kiểm thực tế. "
               "Sinh bằng `scripts/audit-0610/gen_excel_checklist.py` (sửa dữ liệu trong script rồi chạy lại).\n")
    out.append("## Cách đọc\n")
    for key in ORDER:
        out.append(f"- {ICON[key]} **{LABEL[key]}**")
    out.append("\nƯu tiên của mục thiếu/một phần: **1** = người dùng văn phòng dùng thường xuyên; **2** = khá thường; **3** = hiếm.\n")
    out.append("## Tổng hợp\n")
    out.append("| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |\n|---|---|---|")
    for key in ORDER:
        out.append(f"| {ICON[key]} {LABEL[key]} | {total[key]} | {pct(total[key], applicable) if key != 'X' else '-'} |")
    out.append(f"| **Tổng** | **{len(rows)}** (áp dụng: {applicable}) | |\n")
    out.append(f"- **Độ phủ so với Excel 2016 (có hoặc có một phần, một phần tính 0,5): {coverage:.0f}%**")
    out.append(f"- **Đã xác minh bằng đối chiếu Excel 2016 thật: {verified:.0f}%** các mục áp dụng\n")
    out.append("Lưu ý: số mục chia đều cho mỗi dòng nên một dòng lớn (ví dụ 462 hàm) chỉ tính một mục; mức phủ hàm nằm ở dòng riêng và ở `EXCEL2016-FUNCTIONS-MATRIX.md`.\n")
    out.append("## Theo tab\n")
    out.append("| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |\n|---|---|---|---|---|---|---|---|")
    for tab, items in by_tab.items():
        c = collections.Counter(i[3] for i in items)
        app = len(items) - c["X"]
        cov = (c["V"] + c["A"] + 0.5 * c["P"]) / app * 100 if app else 0
        out.append(f"| {tab} | {len(items)} | {c['V']} | {c['A']} | {c['P']} | {c['N']} | {c['X']} | {cov:.0f}% |")
    out.append("")
    out.append("## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1)\n")
    gaps1 = [r for r in rows if r[3] in ("N", "P") and r[4] == "1"]
    out.append("| Tab | Nhóm | Tính năng | Trạng thái | Ghi chú |\n|---|---|---|---|---|")
    for r in gaps1:
        out.append(f"| {r[0]} | {r[1]} | {r[2]} | {ICON[r[3]]} | {r[5]} |")
    out.append(f"\nTổng: {len(gaps1)} mục ưu tiên 1.\n")
    out.append("## Chi tiết từng tab\n")
    for tab, items in by_tab.items():
        out.append(f"### {tab}\n")
        out.append("| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |\n|---|---|---|---|---|")
        for r in items:
            out.append(f"| {r[1]} | {r[2]} | {ICON[r[3]]} | {r[4]} | {r[5]} |")
        out.append("")
    path = pathlib.Path(__file__).resolve().parents[2] / "docs" / "EXCEL2016-FEATURE-CHECKLIST.md"
    path.write_text("\n".join(out), encoding="utf-8")
    print(f"mục={len(rows)} áp dụng={applicable} V={total['V']} A={total['A']} P={total['P']} N={total['N']} X={total['X']}")
    print(f"độ phủ={coverage:.1f}% đã xác minh={verified:.1f}% ưu tiên-1 thiếu={len(gaps1)}")
    print(path)


if __name__ == "__main__":
    main()
