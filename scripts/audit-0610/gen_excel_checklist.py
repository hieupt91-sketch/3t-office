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
import pathlib

DATA = """
Tệp (Backstage)|Tệp|Mới (Ctrl+N)|A|-|common.file.new
Tệp (Backstage)|Tệp|Mở (Ctrl+O): XLSX, XLS, ODS, CSV|V|-|Mở 28 tệp thật của công ty đạt 99,98% ô công thức khớp
Tệp (Backstage)|Tệp|Mở gần đây (danh sách tệp)|A|-|Danh sách tệp gần đây trong Backstage
Tệp (Backstage)|Tệp|Lưu (Ctrl+S)|V|-|Lưu XLSX rồi Excel 2016 mở lại đúng (bộ 8 tệp bắt buộc 0 chênh lệch)
Tệp (Backstage)|Tệp|Lưu thành (F12): XLSX, XLS 97-2003, ODS, CSV|A|-|common.file.saveAs; XLS 97-2003 đã sửa lỗi 0.9.10
Tệp (Backstage)|Tệp|Xuất PDF|A|-|common.file.exportPdf
Tệp (Backstage)|Tệp|Xuất / Chuyển đổi định dạng (mục riêng, giữ bố cục)|N|1|Đang giao agy (feat/export-convert-agy)
Tệp (Backstage)|Tệp|Lưu bản sao / Lưu thành mẫu (XLTX)|N|3|
Tệp (Backstage)|Tệp|In (Ctrl+P) + xem trước|V|-|Thiết lập trang/in đã đọc lại bằng Excel 2016
Tệp (Backstage)|Tệp|Đóng (Ctrl+W)|A|-|common.file.close
Tệp (Backstage)|Thông tin|Bảo vệ sổ làm việc bằng mật khẩu mở file (mã hóa)|N|1|Chưa có mã hóa file; chỉ có bảo vệ cấu trúc
Tệp (Backstage)|Thông tin|Kiểm tra tài liệu (Inspect) / Đánh dấu là cuối cùng|N|3|
Tệp (Backstage)|Thông tin|Quản lý phiên bản / khôi phục tự động (AutoRecover)|A|-|Có cơ chế autorecover
Tệp (Backstage)|Thông tin|Thuộc tính tệp (tác giả, tiêu đề...)|N|3|
Tệp (Backstage)|Tùy chọn|Hộp thoại Tùy chọn Excel (chung, công thức, lưu, nâng cao...)|P|2|Có một số tùy chọn rời; chưa có hộp thoại gộp
Tệp (Backstage)|Tùy chọn|Tùy biến ribbon / Thanh công cụ truy nhanh|N|2|
Tệp (Backstage)|Chia sẻ|Chia sẻ/OneDrive/Email đính kèm|X|-|Cần dịch vụ đám mây
Trang đầu|Bảng nhớ tạm|Dán (Ctrl+V)|A|-|common.edit.paste
Trang đầu|Bảng nhớ tạm|Tùy chọn dán: giá trị / công thức / định dạng / chuyển vị|V|-|Dán đặc biệt đã đọc lại bằng Excel 2016
Trang đầu|Bảng nhớ tạm|Dán đặc biệt... (Ctrl+Alt+V) đủ lựa chọn (Validation, Column widths, Operation, Skip blanks)|P|2|Có giá trị/công thức/định dạng/chuyển vị; thiếu Operation, Skip blanks, Column widths (cần kiểm)
Trang đầu|Bảng nhớ tạm|Dán liên kết / Dán dạng hình / Sao chép dạng hình|N|3|
Trang đầu|Bảng nhớ tạm|Cắt (Ctrl+X) / Sao chép (Ctrl+C) kèm viền chạy (marching ants)|A|-|common.edit.cut/copy
Trang đầu|Bảng nhớ tạm|Sao chép định dạng (Format Painter, nhấp đúp khóa)|A|-|sheet.edit.formatPainter
Trang đầu|Bảng nhớ tạm|Ngăn Clipboard (nhiều mục)|N|3|
Trang đầu|Phông chữ|Tên phông / Cỡ chữ / Tăng-giảm cỡ|A|-|sheet.font.family/size/grow/shrink
Trang đầu|Phông chữ|Đậm / Nghiêng / Gạch chân (Ctrl+B/I/U)|V|-|Hộp thoại Định dạng ô đã đọc lại bằng Excel 2016
Trang đầu|Phông chữ|Gạch chân đôi / Gạch ngang / Chỉ số trên-dưới|P|2|Qua Định dạng ô > Phông chữ (cần kiểm đủ)
Trang đầu|Phông chữ|Viền ô (thư viện + vẽ viền, kiểu đường, màu đường)|P|2|Có thư viện viền; chưa có Draw Border/Erase Border
Trang đầu|Phông chữ|Màu nền / Màu chữ (bảng màu + màu tùy chỉnh)|A|-|sheet.cell.fillColor/textColor
Trang đầu|Phông chữ|Hộp thoại Định dạng ô (Ctrl+1)|V|-|Tab Số/Căn lề/Phông/Viền/Tô đã đối chiếu
Trang đầu|Căn chỉnh|Căn trên/giữa/dưới; trái/giữa/phải|A|-|sheet.cell.align*
Trang đầu|Căn chỉnh|Hướng chữ (xoay)|V|-|Xoay 90° đã đọc lại bằng Excel 2016
Trang đầu|Căn chỉnh|Ngắt dòng tự động (Wrap Text)|V|-|
Trang đầu|Căn chỉnh|Giảm/Tăng thụt lề|A|-|
Trang đầu|Căn chỉnh|Trộn & căn giữa / Trộn theo hàng / Trộn ô / Tách ô|A|-|sheet.cell.merge*
Trang đầu|Căn chỉnh|Căn đều, Distributed, Fill, Center across selection, Shrink to fit|N|3|
Trang đầu|Số|Danh sách định dạng số (Chung, Số, Tiền tệ, Kế toán, Ngày, Giờ, %, Khoa học, Văn bản)|V|-|Số/ngày/giờ/% đã đối chiếu (E3)
Trang đầu|Số|Định dạng số dạng Phân số (Fraction) và Đặc biệt (Special)|N|3|
Trang đầu|Số|Mã định dạng tùy chỉnh (Custom)|P|2|Giữ mã gốc khi lưu; chưa có giao diện soạn mã đầy đủ
Trang đầu|Số|Kế toán / % / Dấu phẩy / Tăng-giảm số lẻ|A|-|sheet.format.*
Trang đầu|Kiểu|Định dạng có điều kiện: Tô sáng ô — Lớn hơn / Nhỏ hơn|V|-|Quy tắc >2000 đã đọc lại bằng Excel 2016
Trang đầu|Kiểu|Tô sáng ô — Giữa / Bằng / Chứa văn bản / Ngày xảy ra / Trùng lặp|N|1|Hiện chỉ có Lớn hơn, Nhỏ hơn, Ô trống
Trang đầu|Kiểu|Quy tắc Trên/Dưới (Top-Bottom 10, Trên/Dưới trung bình)|N|1|
Trang đầu|Kiểu|Thanh dữ liệu (Data Bars)|N|1|Chưa có
Trang đầu|Kiểu|Thang màu (Color Scales)|N|1|Chưa có
Trang đầu|Kiểu|Bộ biểu tượng (Icon Sets)|N|1|Chưa có
Trang đầu|Kiểu|Quy tắc mới theo công thức|N|1|
Trang đầu|Kiểu|Quản lý quy tắc (xem, xóa, thứ tự ưu tiên, Stop If True)|P|1|Xem + xóa; thiếu sửa, thứ tự ưu tiên
Trang đầu|Kiểu|Xóa quy tắc (vùng chọn / cả trang)|P|2|Xóa từng quy tắc trong quản lý
Trang đầu|Kiểu|Định dạng dưới dạng Bảng (gallery kiểu)|P|2|Có hộp thoại; chỉ vài kiểu bảng, Excel có 60
Trang đầu|Kiểu|Kiểu ô (Cell Styles) có sẵn + tạo kiểu mới|A|-|sheet.style.cellStyles
Trang đầu|Ô|Chèn ô/hàng/cột/trang tính|V|-|Hộp thoại Chèn ô, chèn trang tính (menu chuột phải đã kiểm)
Trang đầu|Ô|Xóa ô/hàng/cột/trang tính|V|-|
Trang đầu|Ô|Định dạng: chiều cao hàng, độ rộng cột, tự vừa khít|V|-|Mô hình chiều cao hàng đo 0/6887 lệch
Trang đầu|Ô|Ẩn/Hiện hàng, cột, trang tính|A|-|
Trang đầu|Ô|Đổi tên, Di chuyển/Sao chép, Màu tab, Bảo vệ trang tính|A|-|
Trang đầu|Ô|Khóa ô (Lock Cell) khi bảo vệ|P|2|Bảo vệ trang tính có; mức khóa từng ô cần kiểm
Trang đầu|Chỉnh sửa|Tổng tự động (Sum, Average, Count, Max, Min) và Thêm hàm|A|-|sheet.formula.sum + dropdown
Trang đầu|Chỉnh sửa|Điền: xuống / sang phải / Flash Fill|A|-|sheet.edit.fillDown/Right; Flash Fill có
Trang đầu|Chỉnh sửa|Điền: lên / sang trái / Chuỗi (Series) / Căn đều / Trên các trang|N|2|Chưa thấy lệnh trong ribbon
Trang đầu|Chỉnh sửa|Xóa: tất cả / định dạng / nội dung|A|-|
Trang đầu|Chỉnh sửa|Xóa ghi chú / Xóa siêu liên kết (trong menu Xóa)|N|2|
Trang đầu|Chỉnh sửa|Sắp xếp A-Z / Z-A / Tùy chỉnh nhiều cấp|V|-|Sắp xếp hai cấp đã đọc lại bằng Excel 2016
Trang đầu|Chỉnh sửa|Sắp xếp theo màu ô/màu chữ/biểu tượng|N|2|
Trang đầu|Chỉnh sửa|Bộ lọc (AutoFilter) bật/tắt|V|-|AutoFilterMode đã đối chiếu
Trang đầu|Chỉnh sửa|Lọc theo màu / theo văn bản-số-ngày (text/number/date filters)|N|1|Chỉ lọc theo danh sách giá trị
Trang đầu|Chỉnh sửa|Xóa bộ lọc / Áp dụng lại|A|-|Thêm vào menu chuột phải 13/10
Trang đầu|Chỉnh sửa|Tìm (Ctrl+F) / Thay thế (Ctrl+H), tùy chọn phân biệt hoa-thường, trong công thức|V|-|Thay thế trên hai trang đã đối chiếu
Trang đầu|Chỉnh sửa|Đến (Go To, F5) / Đến đặc biệt (Go To Special)|N|1|Chưa thấy lệnh
Trang đầu|Chỉnh sửa|Chọn khung chọn / Chọn đối tượng|N|3|
Chèn|Bảng|PivotTable (tạo, kéo thả trường, làm mới)|V|-|PivotTables.Count đã đối chiếu
Chèn|Bảng|PivotTable được đề xuất|N|3|
Chèn|Bảng|Bảng (Table, Ctrl+T)|V|-|ListObject, kiểu TableStyleMedium2 đã đối chiếu
Chèn|Minh họa|Hình ảnh từ tệp|A|-|sheet.insert.image; ảnh trong ô giữ nguyên khi lưu
Chèn|Minh họa|Hình ảnh trực tuyến / Ảnh chụp màn hình|X|-|Cần dịch vụ trực tuyến / chụp màn hình
Chèn|Minh họa|Hình dạng (Shapes)|P|2|Có hình dạng cơ bản; chưa kiểm đủ thư viện
Chèn|Minh họa|SmartArt|N|3|
Chèn|Add-in|Cửa hàng / Add-in của tôi|X|-|Cần cửa hàng Microsoft
Chèn|Biểu đồ|Cột nhóm / Đường / Tròn / Vùng|V|-|4 loại biểu đồ đã đọc lại bằng Excel 2016 (loại 51/4/5/1)
Chèn|Biểu đồ|Cột chồng / Cột 100% / Cột 3-D / Thanh ngang|N|1|Chỉ cột nhóm, chưa có chồng/ngang/3-D
Chèn|Biểu đồ|Phân tán (Scatter) / Bong bóng|N|1|
Chèn|Biểu đồ|Radar / Chứng khoán / Bề mặt / Kết hợp (Combo)|N|2|
Chèn|Biểu đồ|Biểu đồ mới 2016: Waterfall / Histogram / Pareto / Box / Treemap / Sunburst|N|3|
Chèn|Biểu đồ|Biểu đồ được đề xuất / hộp thoại Tất cả biểu đồ|N|3|
Chèn|Biểu đồ|PivotChart|A|-|sheet.chart.pivotChart
Chèn|Biểu đồ|Bản đồ 3-D (3D Map)|N|3|
Chèn|Sparkline|Đường / Cột|V|-|SparklineGroups đã đối chiếu
Chèn|Sparkline|Thắng-thua (Win/Loss)|N|3|
Chèn|Bộ lọc|Slicer|N|1|Chưa có
Chèn|Bộ lọc|Timeline|N|2|
Chèn|Liên kết|Siêu liên kết (Ctrl+K), Mở, Xóa, Sửa|A|-|Thêm Mở/Xóa trong menu chuột phải 13/10
Chèn|Liên kết|Liên kết tới ô khác / trang khác / email trong cùng sổ|P|2|Chỉ http(s) và mailto
Chèn|Văn bản|Hộp văn bản|A|-|sheet.insert.textbox; hộp văn bản nhập từ XLSX giữ khi lưu
Chèn|Văn bản|Đầu trang & Chân trang|V|-|Header phải đã đối chiếu
Chèn|Văn bản|WordArt / Dòng chữ ký / Đối tượng nhúng|N|3|
Chèn|Ký hiệu|Công thức (Equation)|N|3|
Chèn|Ký hiệu|Ký hiệu (Symbol)|A|-|insertSymbol
Bố trí trang|Giao diện|Chủ đề (Themes) / Màu / Phông / Hiệu ứng|N|2|
Bố trí trang|Thiết lập trang|Lề (Margins) / Hướng giấy / Khổ giấy|V|-|Landscape, Legal đã đọc lại bằng Excel 2016
Bố trí trang|Thiết lập trang|Vùng in / Xóa vùng in|V|-|Print area đã đối chiếu
Bố trí trang|Thiết lập trang|Ngắt trang (chèn, xóa, đặt lại)|V|-|HBreaks/VBreaks đã đối chiếu
Bố trí trang|Thiết lập trang|Hình nền (Background)|N|3|
Bố trí trang|Thiết lập trang|In tiêu đề (Print Titles)|V|-|TitlesRows đã đối chiếu
Bố trí trang|Thiết lập trang|Hộp thoại Page Setup đủ tab Trang/Lề/Đầu-Chân/Trang tính|P|1|Thiếu một số tùy chọn tab Trang tính (in lưới, tiêu đề, thứ tự trang)
Bố trí trang|Vừa trang|Chiều rộng / Chiều cao (Fit to pages) / Tỷ lệ %|P|1|Có Tỷ lệ; chưa có Fit to W x H tách riêng
Bố trí trang|Tùy chọn trang tính|Hiện/In đường lưới và tiêu đề|P|2|Hiện có; tùy chọn In cần kiểm
Bố trí trang|Sắp xếp|Đưa lên trên / Xuống dưới / Ngăn chọn / Căn / Nhóm / Xoay đối tượng|N|2|
Công thức|Thư viện hàm|Chèn hàm (Shift+F3) + hộp thoại đối số|A|-|sheet.formula.insertFunction
Công thức|Thư viện hàm|Tổng tự động; Dùng gần đây; Tài chính / Logic / Văn bản / Ngày giờ / Tra cứu / Toán|A|-|Các nhóm hàm trong ribbon
Công thức|Thư viện hàm|Độ phủ hàm Excel 2016 (462 hàm)|P|1|Đã đối chiếu 137 hàm, 118 khớp; ~337 hàm chưa kiểm (xem EXCEL2016-FUNCTIONS-MATRIX.md)
Công thức|Thư viện hàm|Công thức mảng (CSE, Ctrl+Shift+Enter)|P|1|Có hỗ trợ mảng; chưa đối chiếu đủ
Công thức|Thư viện hàm|Tham chiếu có cấu trúc (Table1[Cột])|N|1|Chưa có
Công thức|Thư viện hàm|Tham chiếu 3-D giữa các trang (Sheet1:Sheet3!A1)|N|2|
Công thức|Tên đã xác định|Trình quản lý tên / Xác định tên / Tạo từ vùng chọn / Dùng trong công thức|V|-|Tên SampleNames đã đối chiếu
Công thức|Kiểm tra công thức|Tìm ô tiền lệ / phụ thuộc / Xóa mũi tên|A|-|
Công thức|Kiểm tra công thức|Hiện công thức (Ctrl+`) / Kiểm tra lỗi / Ước lượng công thức|A|-|
Công thức|Kiểm tra công thức|Cửa sổ theo dõi (Watch Window)|A|-|
Công thức|Tính toán|Tự động / Thủ công; Tính lại (F9); Tính trang (Shift+F9)|A|-|
Công thức|Tính toán|Tính lặp (Iterative) / Độ chính xác như hiển thị / Hệ ngày 1904|N|2|
Công thức|Tính toán|Kiểu tham chiếu R1C1|N|3|
Dữ liệu|Lấy dữ liệu|Từ văn bản/CSV, Web, Access, Cơ sở dữ liệu, Power Query|P|2|Mở CSV có; chưa có Power Query/kết nối ngoài
Dữ liệu|Kết nối|Làm mới tất cả / Kết nối / Thuộc tính / Liên kết ngoài (Edit Links)|N|2|
Dữ liệu|Sắp xếp & Lọc|Sắp xếp A-Z, Z-A, Sắp xếp tùy chỉnh|V|-|
Dữ liệu|Sắp xếp & Lọc|Bộ lọc nâng cao (Advanced Filter, vùng tiêu chí)|N|2|
Dữ liệu|Công cụ dữ liệu|Tách văn bản thành cột|A|-|sheet.data.textToColumns
Dữ liệu|Công cụ dữ liệu|Flash Fill|A|-|
Dữ liệu|Công cụ dữ liệu|Xóa trùng lặp|A|-|
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Danh sách|V|-|Validation.Type=3 đã đối chiếu
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Số nguyên / Số thập phân|P|1|Chỉ có khoảng số; chưa tách nguyên/thập phân, chưa có toán tử (giữa, lớn hơn...)
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Ngày / Giờ / Độ dài văn bản / Tùy chỉnh (công thức)|N|1|Chưa có
Dữ liệu|Công cụ dữ liệu|Kiểm tra dữ liệu: Thông báo nhập, Cảnh báo lỗi (Stop/Warning/Info), Khoanh vòng dữ liệu sai|N|1|Chưa có
Dữ liệu|Công cụ dữ liệu|Hợp nhất dữ liệu (Consolidate)|A|-|
Dữ liệu|Công cụ dữ liệu|Quan hệ giữa bảng / Mô hình dữ liệu (Power Pivot)|N|3|
Dữ liệu|Dự báo|Phân tích What-If: Trình quản lý kịch bản|A|-|sheet.data.scenarioManager
Dữ liệu|Dự báo|What-If: Goal Seek / Bảng dữ liệu (Data Table)|A|-|
Dữ liệu|Dự báo|Trang dự báo (Forecast Sheet)|N|3|
Dữ liệu|Dàn bài|Nhóm / Bỏ nhóm / Tổng phụ|A|-|
Dữ liệu|Dàn bài|Hiện/Ẩn chi tiết và nút cấp 1-2-3|P|2|Cần kiểm
Dữ liệu|Phân tích|Solver|N|3|Bổ sung của Excel
Xem xét|Soát lỗi|Chính tả (F7)|A|-|sheet.review.spellCheck
Xem xét|Soát lỗi|Từ đồng nghĩa (Thesaurus) / Thống kê sổ làm việc|N|3|
Xem xét|Trợ năng|Kiểm tra trợ năng|N|3|
Xem xét|Thông tin chi tiết|Smart Lookup|X|-|Cần dịch vụ Bing
Xem xét|Ngôn ngữ|Dịch|P|3|Tính năng 3T AI (cần mạng, xin phép riêng)
Xem xét|Ghi chú|Ghi chú mới / Sửa / Xóa|V|-|Menu chuột phải đã kiểm 13/10
Xem xét|Ghi chú|Trước / Sau / Hiện-Ẩn tất cả ghi chú|P|2|Có Trước/Sau; thiếu Hiện/Ẩn tất cả
Xem xét|Ghi chú|Nhận xét có luồng (threaded comments)|N|3|Excel 2016 chỉ có ghi chú cổ điển
Xem xét|Thay đổi|Bảo vệ trang tính (mật khẩu, tùy chọn cho phép)|A|-|sheet.sheet.protect
Xem xét|Thay đổi|Bảo vệ sổ làm việc (cấu trúc)|A|-|sheet.workbook.protect
Xem xét|Thay đổi|Cho phép người dùng sửa vùng (Allow Users to Edit Ranges)|N|3|
Xem xét|Thay đổi|Chia sẻ sổ làm việc / Theo dõi thay đổi (cũ)|N|3|
Chế độ xem|Chế độ xem sổ|Bình thường / Xem ngắt trang / Bố trí trang|A|-|
Chế độ xem|Chế độ xem sổ|Chế độ xem tùy chỉnh (Custom Views) / Toàn màn hình|N|3|
Chế độ xem|Hiển thị|Thước / Đường lưới / Thanh công thức / Tiêu đề|A|-|Thước chỉ ở bố trí trang
Chế độ xem|Thu phóng|Thu phóng (hộp thoại) / 100% / Phóng vùng chọn|A|-|sheet.view.zoom*
Chế độ xem|Cửa sổ|Cửa sổ mới|A|-|sheet.view.newWindow
Chế độ xem|Cửa sổ|Cố định ngăn (hàng đầu / cột đầu / tại ô)|V|-|SplitRow/SplitColumn đã đối chiếu
Chế độ xem|Cửa sổ|Chia (Split)|V|-|Mới 13/10, lưu và mở lại đã đối chiếu
Chế độ xem|Cửa sổ|Sắp xếp tất cả / Ẩn-Hiện cửa sổ / Xem song song / Cuộn đồng bộ / Đặt lại vị trí|N|3|
Chế độ xem|Cửa sổ|Chuyển cửa sổ (Switch Windows)|P|3|Mở nhiều cửa sổ có; menu chuyển cần kiểm
Chế độ xem|Macro|Xem macro / Ghi macro|A|-|common.macro.*
Chế độ xem|Macro|Tham chiếu tương đối khi ghi|N|3|
Nhà phát triển|Mã|Visual Basic / chạy VBA|N|3|Không hỗ trợ VBA (ngoài phạm vi giấy phép/thiết kế); macro riêng của 3T
Nhà phát triển|Điều khiển|Form controls (nút, checkbox, combo...) / Chế độ thiết kế|N|2|
Nhà phát triển|XML|Nhập/Xuất XML, Bản đồ XML|N|3|
Trợ giúp|Trợ giúp|Trợ giúp (F1) + tìm theo tên tính năng|A|-|sheet.help.open; có hướng dẫn tiếng Việt
Trợ giúp|Trợ giúp|Cho tôi biết bạn muốn làm gì (Alt+Q)|A|-|Ô tìm kiếm tính năng trên thanh tiêu đề
Công cụ Bảng|Thiết kế|Đổi tên bảng|A|-|renameTable
Công cụ Bảng|Thiết kế|Dòng tổng (Total Row)|V|-|Mới 13/10, Excel 2016 đọc ShowTotals đúng
Công cụ Bảng|Thiết kế|Chuyển thành phạm vi|A|-|Menu chuột phải bảng 13/10
Công cụ Bảng|Thiết kế|Chèn/Xóa cột-hàng bảng|A|-|Menu chuột phải bảng 13/10; mở lại giữ vùng bảng
Công cụ Bảng|Thiết kế|Đổi kích thước bảng (Resize Table)|N|2|
Công cụ Bảng|Thiết kế|Tùy chọn kiểu: Hàng tiêu đề, Cột đầu/cuối, Hàng/Cột sọc, Nút lọc|P|2|Có sọc hàng và nút lọc; thiếu cột đầu/cuối, sọc cột
Công cụ Bảng|Thiết kế|Chèn Slicer / Xuất bảng|N|2|
Công cụ Biểu đồ|Thiết kế|Thêm thành phần: tiêu đề trục|V|-|Mới 13/10, Excel 2016 đọc đúng
Công cụ Biểu đồ|Thiết kế|Thêm thành phần: tiêu đề biểu đồ, chú giải, nhãn dữ liệu, lưới, đường xu hướng, thanh sai số|P|1|Có tiêu đề + chú giải; thiếu nhãn dữ liệu, đường xu hướng, thanh sai số
Công cụ Biểu đồ|Thiết kế|Bố cục nhanh / Đổi màu / Kiểu biểu đồ|N|2|
Công cụ Biểu đồ|Thiết kế|Chọn dữ liệu / Đổi loại / Di chuyển biểu đồ|A|-|Menu chuột phải biểu đồ 13/10
Công cụ Biểu đồ|Thiết kế|Chuyển hàng/cột (Switch Row/Column)|N|2|
Công cụ Biểu đồ|Định dạng|Màu/viền/hiệu ứng thành phần, kích thước, vị trí|N|2|
Công cụ PivotTable|Phân tích|Làm mới / Đổi nguồn / Danh sách trường|P|2|Có làm mới; thiếu đổi nguồn
Công cụ PivotTable|Phân tích|Nhóm (ngày/số) / Trường tính toán / Slicer|N|2|
Công cụ PivotTable|Thiết kế|Bố cục báo cáo / Tổng phụ / Kiểu PivotTable|N|2|
Công cụ Hình ảnh|Định dạng|Cắt (Crop) / Kích thước / Xoay / Kiểu hình / Viền|N|2|
Công cụ Vẽ|Định dạng|Màu tô / Viền / Hiệu ứng hình|N|2|
Công cụ Sparkline|Thiết kế|Sửa dữ liệu / Đổi loại / Điểm đánh dấu / Màu / Trục / Nhóm|N|3|
Không thuộc ribbon|Hộp tên và thanh công thức|Hộp tên (Name Box) nhảy tới ô/tên|A|-|
Không thuộc ribbon|Hộp tên và thanh công thức|Mở rộng thanh công thức; Ctrl+Shift+U|P|3|
Không thuộc ribbon|Thanh trạng thái|Tổng/Trung bình/Đếm vùng chọn; nút chế độ xem; thanh thu phóng|A|-|
Không thuộc ribbon|Thanh trạng thái|Menu tùy chỉnh thanh trạng thái|N|3|
Không thuộc ribbon|Tab trang tính|Cuộn tab, thêm trang, kéo đổi thứ tự|P|2|Kéo đổi thứ tự cần kiểm
Không thuộc ribbon|Tab trang tính|Menu chuột phải tab (Chèn, Xóa, Đổi tên, Di chuyển, Bảo vệ, Màu, Ẩn, Hiện)|V|-|Đúng thứ tự Excel, test desktop 13/10
Không thuộc ribbon|Tab trang tính|Chọn nhiều trang cùng lúc (nhóm trang) / Chọn tất cả trang|N|2|
Không thuộc ribbon|Chuột phải|Menu ô (Cắt/Sao chép/Dán/Chèn/Xóa/Lọc/Sắp xếp/Ghi chú/Định dạng/Tên/Liên kết)|V|-|Đối chiếu CommandBars Excel 2016, test desktop 13/10
Không thuộc ribbon|Chuột phải|Menu tiêu đề hàng/cột|V|-|
Không thuộc ribbon|Chuột phải|Menu trong bảng (Chèn/Xóa/Chọn/Bảng)|V|-|
Không thuộc ribbon|Chuột phải|Menu biểu đồ|A|-|Chưa đối chiếu từng mục với Excel
Không thuộc ribbon|Chuột phải|Menu hình / ảnh / hộp văn bản|N|1|Chưa có
Không thuộc ribbon|Chuột phải|Phân tích nhanh (Quick Analysis) / Chọn từ danh sách thả xuống|N|2|
Không thuộc ribbon|Chuột|Kéo chốt điền (Fill Handle), nhấp đúp điền xuống, tùy chọn tự điền|P|1|Điền chuỗi có; nhấp đúp và Auto Fill Options cần kiểm
Không thuộc ribbon|Chuột|Kéo đổi độ rộng cột/chiều cao hàng, nhấp đúp tự vừa|A|-|
Không thuộc ribbon|Chuột|Kéo-thả di chuyển ô, Ctrl+kéo sao chép, Shift+kéo chèn|P|2|Cần kiểm đủ
Không thuộc ribbon|Chuột|Chọn: ô, hàng, cột, vùng, Ctrl+nhiều vùng, góc chọn tất cả|V|-|Bộ phím/chuột E3: 62/62
Không thuộc ribbon|Chuột|Cuộn bánh xe, Ctrl+cuộn thu phóng|A|-|
Không thuộc ribbon|Bàn phím|Điều hướng (mũi tên, Ctrl+mũi tên, Home/End, Ctrl+Home/End, PgUp/PgDn, Tab/Enter)|V|-|E3 đã đối chiếu
Không thuộc ribbon|Bàn phím|Nhập liệu (F2, Enter, Alt+Enter, Ctrl+Enter, Ctrl+;, Ctrl+Shift+;, F4)|V|-|E3, E3b đã đối chiếu
Không thuộc ribbon|Bàn phím|Phím tắt định dạng và lệnh (Ctrl+1, Ctrl+Shift+4/5/1, Ctrl+B/I/U, Ctrl+K, Ctrl+D/R, Ctrl+Z/Y)|V|-|E3
Không thuộc ribbon|Bàn phím|Phím tắt Alt (KeyTips: Alt rồi H, N, ...)|N|2|Chưa có chế độ KeyTips đầy đủ như Excel
Không thuộc ribbon|Hộp thoại|Đủ hộp thoại: Định dạng ô, Dán đặc biệt, Tìm/Thay, Sắp xếp, Tên, Chèn/Xóa ô, Chiều cao/Độ rộng|V|-|
Không thuộc ribbon|Tính tương thích|Mở/Lưu XLS, XLSX, ODS, CSV đúng bố cục|V|-|Bộ 8 tệp 0 chênh lệch; còn sai khác kiểu bảng ở lan25
Không thuộc ribbon|Tính tương thích|Giữ ảnh, hộp văn bản, bảng, định dạng số, ghi chú, split khi lưu|V|-|Đã sửa hồi quy ảnh 13/10
Không thuộc ribbon|Hiệu năng|Mở tệp lớn nhanh, gõ không trễ (ở mức Excel/LibreOffice)|V|-|Dữ liệu hiện ~2s; gõ 46 ms
"""

ORDER = ["V", "A", "P", "N", "X"]
LABEL = {"V": "Đã đối chiếu Excel 2016", "A": "Có, chưa đối chiếu", "P": "Có một phần", "N": "Chưa có", "X": "Ngoài phạm vi"}
ICON = {"V": "✅", "A": "🟢", "P": "🟡", "N": "🔴", "X": "⚪"}


def parse():
    rows = []
    for line in DATA.strip().splitlines():
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
