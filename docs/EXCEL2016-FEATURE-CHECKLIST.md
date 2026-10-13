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
| ✅ Đã đối chiếu Excel 2016 | 59 | 28% |
| 🟢 Có, chưa đối chiếu | 61 | 29% |
| 🟡 Có một phần | 29 | 14% |
| 🔴 Chưa có | 63 | 30% |
| ⚪ Ngoài phạm vi | 4 | - |
| **Tổng** | **216** (áp dụng: 212) | |

- **Độ phủ so với Excel 2016 (có hoặc có một phần, một phần tính 0,5): 63%**
- **Đã xác minh bằng đối chiếu Excel 2016 thật: 28%** các mục áp dụng

Lưu ý: số mục chia đều cho mỗi dòng nên một dòng lớn (ví dụ 462 hàm) chỉ tính một mục; mức phủ hàm nằm ở dòng riêng và ở `EXCEL2016-FUNCTIONS-MATRIX.md`.

## Theo tab

| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |
|---|---|---|---|---|---|---|---|
| Tệp (Backstage) | 17 | 3 | 6 | 1 | 6 | 1 | 59% |
| Trang đầu | 53 | 20 | 17 | 9 | 7 | 0 | 78% |
| Chèn | 29 | 8 | 5 | 2 | 12 | 2 | 52% |
| Bố trí trang | 10 | 4 | 0 | 3 | 3 | 0 | 55% |
| Công thức | 13 | 1 | 6 | 2 | 4 | 0 | 62% |
| Dữ liệu | 19 | 4 | 7 | 3 | 5 | 0 | 66% |
| Xem xét | 12 | 1 | 3 | 2 | 5 | 1 | 45% |
| Chế độ xem | 12 | 2 | 6 | 1 | 3 | 0 | 71% |
| Nhà phát triển | 3 | 0 | 0 | 0 | 3 | 0 | 0% |
| Trợ giúp | 2 | 0 | 2 | 0 | 0 | 0 | 100% |
| Công cụ Bảng | 7 | 1 | 3 | 1 | 2 | 0 | 64% |
| Công cụ Biểu đồ | 7 | 3 | 1 | 0 | 3 | 0 | 57% |
| Công cụ PivotTable | 3 | 0 | 0 | 1 | 2 | 0 | 17% |
| Công cụ Hình ảnh | 1 | 0 | 0 | 0 | 1 | 0 | 0% |
| Công cụ Vẽ | 1 | 0 | 0 | 0 | 1 | 0 | 0% |
| Công cụ Sparkline | 1 | 0 | 0 | 0 | 1 | 0 | 0% |
| Không thuộc ribbon | 26 | 12 | 5 | 4 | 5 | 0 | 73% |

## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1)

| Tab | Nhóm | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Tệp (Backstage) | Tệp | Xuất / Chuyển đổi định dạng (mục riêng, giữ bố cục) | 🔴 | Đang giao agy (feat/export-convert-agy) |
| Tệp (Backstage) | Thông tin | Bảo vệ sổ làm việc bằng mật khẩu mở file (mã hóa) | 🔴 | Chưa có mã hóa file; chỉ có bảo vệ cấu trúc |
| Chèn | Bộ lọc | Slicer | 🔴 | Chưa có |
| Bố trí trang | Thiết lập trang | Hộp thoại Page Setup đủ tab Trang/Lề/Đầu-Chân/Trang tính | 🟡 | Thiếu một số tùy chọn tab Trang tính (in lưới, tiêu đề, thứ tự trang) |
| Bố trí trang | Vừa trang | Chiều rộng / Chiều cao (Fit to pages) / Tỷ lệ % | 🟡 | Có Tỷ lệ; chưa có Fit to W x H tách riêng |
| Công thức | Thư viện hàm | Độ phủ hàm Excel 2016 (462 hàm) | 🟡 | Đã đối chiếu 137 hàm, 118 khớp; ~337 hàm chưa kiểm (xem EXCEL2016-FUNCTIONS-MATRIX.md) |
| Công thức | Thư viện hàm | Công thức mảng (CSE, Ctrl+Shift+Enter) | 🟡 | Có hỗ trợ mảng; chưa đối chiếu đủ |
| Công thức | Thư viện hàm | Tham chiếu có cấu trúc (Table1[Cột]) | 🔴 | Chưa có |
| Không thuộc ribbon | Chuột phải | Menu hình / ảnh / hộp văn bản | 🔴 | Chưa có |
| Không thuộc ribbon | Chuột | Kéo chốt điền (Fill Handle), nhấp đúp điền xuống, tùy chọn tự điền | 🟡 | Điền chuỗi có; nhấp đúp và Auto Fill Options cần kiểm |

Tổng: 10 mục ưu tiên 1.

## Chi tiết từng tab

### Tệp (Backstage)

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Tệp | Mới (Ctrl+N) | 🟢 | - | common.file.new |
| Tệp | Mở (Ctrl+O): XLSX, XLS, ODS, CSV | ✅ | - | Mở 28 tệp thật của công ty đạt 99,98% ô công thức khớp |
| Tệp | Mở gần đây (danh sách tệp) | 🟢 | - | Danh sách tệp gần đây trong Backstage |
| Tệp | Lưu (Ctrl+S) | ✅ | - | Lưu XLSX rồi Excel 2016 mở lại đúng (bộ 8 tệp bắt buộc 0 chênh lệch) |
| Tệp | Lưu thành (F12): XLSX, XLS 97-2003, ODS, CSV | 🟢 | - | common.file.saveAs; XLS 97-2003 đã sửa lỗi 0.9.10 |
| Tệp | Xuất PDF | 🟢 | - | common.file.exportPdf |
| Tệp | Xuất / Chuyển đổi định dạng (mục riêng, giữ bố cục) | 🔴 | 1 | Đang giao agy (feat/export-convert-agy) |
| Tệp | Lưu bản sao / Lưu thành mẫu (XLTX) | 🔴 | 3 |  |
| Tệp | In (Ctrl+P) + xem trước | ✅ | - | Thiết lập trang/in đã đọc lại bằng Excel 2016 |
| Tệp | Đóng (Ctrl+W) | 🟢 | - | common.file.close |
| Thông tin | Bảo vệ sổ làm việc bằng mật khẩu mở file (mã hóa) | 🔴 | 1 | Chưa có mã hóa file; chỉ có bảo vệ cấu trúc |
| Thông tin | Kiểm tra tài liệu (Inspect) / Đánh dấu là cuối cùng | 🔴 | 3 |  |
| Thông tin | Quản lý phiên bản / khôi phục tự động (AutoRecover) | 🟢 | - | Có cơ chế autorecover |
| Thông tin | Thuộc tính tệp (tác giả, tiêu đề...) | 🔴 | 3 |  |
| Tùy chọn | Hộp thoại Tùy chọn Excel (chung, công thức, lưu, nâng cao...) | 🟡 | 2 | Có một số tùy chọn rời; chưa có hộp thoại gộp |
| Tùy chọn | Tùy biến ribbon / Thanh công cụ truy nhanh | 🔴 | 2 |  |
| Chia sẻ | Chia sẻ/OneDrive/Email đính kèm | ⚪ | - | Cần dịch vụ đám mây |

### Trang đầu

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Bảng nhớ tạm | Dán (Ctrl+V) | 🟢 | - | common.edit.paste |
| Bảng nhớ tạm | Tùy chọn dán: giá trị / công thức / định dạng / chuyển vị | ✅ | - | Dán đặc biệt đã đọc lại bằng Excel 2016 |
| Bảng nhớ tạm | Dán đặc biệt... (Ctrl+Alt+V) đủ lựa chọn (Validation, Column widths, Operation, Skip blanks) | 🟡 | 2 | Có giá trị/công thức/định dạng/chuyển vị; thiếu Operation, Skip blanks, Column widths (cần kiểm) |
| Bảng nhớ tạm | Dán liên kết / Dán dạng hình / Sao chép dạng hình | 🔴 | 3 |  |
| Bảng nhớ tạm | Cắt (Ctrl+X) / Sao chép (Ctrl+C) kèm viền chạy (marching ants) | 🟢 | - | common.edit.cut/copy |
| Bảng nhớ tạm | Sao chép định dạng (Format Painter, nhấp đúp khóa) | 🟢 | - | sheet.edit.formatPainter |
| Bảng nhớ tạm | Ngăn Clipboard (nhiều mục) | 🔴 | 3 |  |
| Phông chữ | Tên phông / Cỡ chữ / Tăng-giảm cỡ | 🟢 | - | sheet.font.family/size/grow/shrink |
| Phông chữ | Đậm / Nghiêng / Gạch chân (Ctrl+B/I/U) | ✅ | - | Hộp thoại Định dạng ô đã đọc lại bằng Excel 2016 |
| Phông chữ | Gạch chân đôi / Gạch ngang / Chỉ số trên-dưới | 🟡 | 2 | Qua Định dạng ô > Phông chữ (cần kiểm đủ) |
| Phông chữ | Viền ô (thư viện + vẽ viền, kiểu đường, màu đường) | 🟡 | 2 | Có thư viện viền; chưa có Draw Border/Erase Border |
| Phông chữ | Màu nền / Màu chữ (bảng màu + màu tùy chỉnh) | 🟢 | - | sheet.cell.fillColor/textColor |
| Phông chữ | Hộp thoại Định dạng ô (Ctrl+1) | ✅ | - | Tab Số/Căn lề/Phông/Viền/Tô đã đối chiếu |
| Căn chỉnh | Căn trên/giữa/dưới; trái/giữa/phải | 🟢 | - | sheet.cell.align* |
| Căn chỉnh | Hướng chữ (xoay) | ✅ | - | Xoay 90° đã đọc lại bằng Excel 2016 |
| Căn chỉnh | Ngắt dòng tự động (Wrap Text) | ✅ | - |  |
| Căn chỉnh | Giảm/Tăng thụt lề | 🟢 | - |  |
| Căn chỉnh | Trộn & căn giữa / Trộn theo hàng / Trộn ô / Tách ô | 🟢 | - | sheet.cell.merge* |
| Căn chỉnh | Căn đều, Distributed, Fill, Center across selection, Shrink to fit | 🔴 | 3 |  |
| Số | Danh sách định dạng số (Chung, Số, Tiền tệ, Kế toán, Ngày, Giờ, %, Khoa học, Văn bản) | ✅ | - | Số/ngày/giờ/% đã đối chiếu (E3) |
| Số | Định dạng số dạng Phân số (Fraction) và Đặc biệt (Special) | 🔴 | 3 |  |
| Số | Mã định dạng tùy chỉnh (Custom) | 🟡 | 2 | Giữ mã gốc khi lưu; chưa có giao diện soạn mã đầy đủ |
| Số | Kế toán / % / Dấu phẩy / Tăng-giảm số lẻ | 🟢 | - | sheet.format.* |
| Kiểu | Định dạng có điều kiện: Tô sáng ô — Lớn hơn / Nhỏ hơn | ✅ | - | Quy tắc >2000 đã đọc lại bằng Excel 2016 |
| Kiểu | Tô sáng ô — Giữa / Bằng / Chứa văn bản / Ngày xảy ra / Trùng lặp | ✅ | - | G1 13/10: Excel 2016 đọc đúng luật gốcHộp thoại chỉ có Lớn hơn, Nhỏ hơn, Ô trống; mã có xử lý luật duplicate nhưng chưa có trong hộp thoại (opencode xác nhận) |
| Kiểu | Quy tắc Trên/Dưới (Top-Bottom 10, Trên/Dưới trung bình) | ✅ | - | G1: Excel 2016 đọc đúng |
| Kiểu | Thanh dữ liệu (Data Bars) | ✅ | - | G1: Excel 2016 đọc Type=Databar |
| Kiểu | Thang màu (Color Scales) | ✅ | - | G1: 2 và 3 màu, Excel 2016 đọc đúng |
| Kiểu | Bộ biểu tượng (Icon Sets) | ✅ | - | G1: Excel 2016 đọc IconSet.ID |
| Kiểu | Quy tắc mới theo công thức | ✅ | - | G1: Excel 2016 đọc Type=Expression |
| Kiểu | Quản lý quy tắc (xem, xóa, sửa, thứ tự ưu tiên, Stop If True) | 🟡 | 2 | G1: có xem, sửa, đổi thứ tự, xóa; thiếu Stop If True |
| Kiểu | Xóa quy tắc (vùng chọn / cả trang) | 🟡 | 2 | Xóa từng quy tắc trong quản lý |
| Kiểu | Định dạng dưới dạng Bảng (gallery kiểu) | 🟡 | 2 | Có hộp thoại; chỉ vài kiểu bảng, Excel có 60 |
| Kiểu | Kiểu ô (Cell Styles) có sẵn + tạo kiểu mới | 🟢 | - | sheet.style.cellStyles |
| Ô | Chèn ô/hàng/cột/trang tính | ✅ | - | Hộp thoại Chèn ô, chèn trang tính (menu chuột phải đã kiểm) |
| Ô | Xóa ô/hàng/cột/trang tính | ✅ | - |  |
| Ô | Định dạng: chiều cao hàng, độ rộng cột, tự vừa khít | ✅ | - | Mô hình chiều cao hàng đo 0/6887 lệch |
| Ô | Ẩn/Hiện hàng, cột, trang tính | 🟢 | - |  |
| Ô | Đổi tên, Di chuyển/Sao chép, Màu tab, Bảo vệ trang tính | 🟢 | - |  |
| Ô | Khóa ô (Lock Cell) khi bảo vệ | 🟡 | 2 | Bảo vệ trang tính có; mức khóa từng ô cần kiểm |
| Chỉnh sửa | Tổng tự động (Sum, Average, Count, Max, Min) và Thêm hàm | 🟢 | - | sheet.formula.sum + dropdown |
| Chỉnh sửa | Điền: xuống / sang phải / Flash Fill | 🟢 | - | sheet.edit.fillDown/Right; Flash Fill có |
| Chỉnh sửa | Điền: lên / sang trái / Chuỗi (Series) / Căn đều / Trên các trang | 🔴 | 2 | Chưa thấy lệnh trong ribbon |
| Chỉnh sửa | Xóa: tất cả / định dạng / nội dung | 🟢 | - |  |
| Chỉnh sửa | Xóa ghi chú / Xóa siêu liên kết (trong menu Xóa) | 🔴 | 2 |  |
| Chỉnh sửa | Sắp xếp A-Z / Z-A / Tùy chỉnh nhiều cấp | ✅ | - | Sắp xếp hai cấp đã đọc lại bằng Excel 2016 |
| Chỉnh sửa | Sắp xếp theo màu ô/màu chữ/biểu tượng | 🟡 | 3 | G2: có sắp xếp theo màu ô/chữ; chưa có theo biểu tượng |
| Chỉnh sửa | Bộ lọc (AutoFilter) bật/tắt | ✅ | - | AutoFilterMode đã đối chiếu |
| Chỉnh sửa | Lọc theo màu / theo văn bản-số-ngày (text/number/date filters) | ✅ | - | G2: lọc văn bản/số/ngày/màu; lưu giữ hàng ẩn đúng |
| Chỉnh sửa | Xóa bộ lọc / Áp dụng lại | 🟢 | - | Thêm vào menu chuột phải 13/10 |
| Chỉnh sửa | Tìm (Ctrl+F) / Thay thế (Ctrl+H), tùy chọn phân biệt hoa-thường, trong công thức | ✅ | - | Thay thế trên hai trang đã đối chiếu |
| Chỉnh sửa | Đến (Go To, F5/Ctrl+G) / Đến đặc biệt (Go To Special) | 🟢 | - | Mới 13/10: sheet-goto.js, test desktop 11/11; chưa đối chiếu với Excel |
| Chỉnh sửa | Chọn khung chọn / Chọn đối tượng | 🔴 | 3 |  |

### Chèn

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Bảng | PivotTable (tạo, kéo thả trường, làm mới) | ✅ | - | PivotTables.Count đã đối chiếu |
| Bảng | PivotTable được đề xuất | 🔴 | 3 |  |
| Bảng | Bảng (Table, Ctrl+T) | ✅ | - | ListObject, kiểu TableStyleMedium2 đã đối chiếu |
| Minh họa | Hình ảnh từ tệp | 🟢 | - | sheet.insert.image; ảnh trong ô giữ nguyên khi lưu |
| Minh họa | Hình ảnh trực tuyến / Ảnh chụp màn hình | ⚪ | - | Cần dịch vụ trực tuyến / chụp màn hình |
| Minh họa | Hình dạng (Shapes) | 🟡 | 2 | Có hình dạng cơ bản; chưa kiểm đủ thư viện |
| Minh họa | SmartArt | 🔴 | 3 |  |
| Add-in | Cửa hàng / Add-in của tôi | ⚪ | - | Cần cửa hàng Microsoft |
| Biểu đồ | Cột nhóm / Đường / Tròn / Vùng | ✅ | - | 4 loại biểu đồ đã đọc lại bằng Excel 2016 (loại 51/4/5/1) |
| Biểu đồ | Cột chồng / Cột 100% / Thanh ngang | ✅ | - | G3: Excel 2016 đọc đúng (52/53/57) |
| Biểu đồ | Cột 3-D | 🔴 | 3 |  |
| Biểu đồ | Phân tán (Scatter) / Bong bóng | ✅ | - | G3: Excel 2016 đọc -4169 / 15 |
| Biểu đồ | Radar / Kết hợp (Combo) | ✅ | - | G3: Excel 2016 đọc -4151 / -4111 |
| Biểu đồ | Chứng khoán / Bề mặt | 🔴 | 3 |  |
| Biểu đồ | Biểu đồ mới 2016: Waterfall / Histogram / Pareto / Box / Treemap / Sunburst | 🔴 | 3 |  |
| Biểu đồ | Biểu đồ được đề xuất / hộp thoại Tất cả biểu đồ | 🔴 | 3 |  |
| Biểu đồ | PivotChart | 🟢 | - | sheet.chart.pivotChart |
| Biểu đồ | Bản đồ 3-D (3D Map) | 🔴 | 3 |  |
| Sparkline | Đường / Cột | ✅ | - | SparklineGroups đã đối chiếu |
| Sparkline | Thắng-thua (Win/Loss) | 🔴 | 3 |  |
| Bộ lọc | Slicer | 🔴 | 1 | Chưa có |
| Bộ lọc | Timeline | 🔴 | 2 |  |
| Liên kết | Siêu liên kết (Ctrl+K), Mở, Xóa, Sửa | 🟢 | - | Thêm Mở/Xóa trong menu chuột phải 13/10 |
| Liên kết | Liên kết tới ô khác / trang khác / email trong cùng sổ | 🟡 | 2 | Chỉ http(s) và mailto |
| Văn bản | Hộp văn bản | 🟢 | - | sheet.insert.textbox; hộp văn bản nhập từ XLSX giữ khi lưu |
| Văn bản | Đầu trang & Chân trang | ✅ | - | Header phải đã đối chiếu |
| Văn bản | WordArt / Dòng chữ ký / Đối tượng nhúng | 🔴 | 3 |  |
| Ký hiệu | Công thức (Equation) | 🔴 | 3 |  |
| Ký hiệu | Ký hiệu (Symbol) | 🟢 | - | insertSymbol |

### Bố trí trang

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Giao diện | Chủ đề (Themes) / Màu / Phông / Hiệu ứng | 🔴 | 2 |  |
| Thiết lập trang | Lề (Margins) / Hướng giấy / Khổ giấy | ✅ | - | Landscape, Legal đã đọc lại bằng Excel 2016 |
| Thiết lập trang | Vùng in / Xóa vùng in | ✅ | - | Print area đã đối chiếu |
| Thiết lập trang | Ngắt trang (chèn, xóa, đặt lại) | ✅ | - | HBreaks/VBreaks đã đối chiếu |
| Thiết lập trang | Hình nền (Background) | 🔴 | 3 |  |
| Thiết lập trang | In tiêu đề (Print Titles) | ✅ | - | TitlesRows đã đối chiếu |
| Thiết lập trang | Hộp thoại Page Setup đủ tab Trang/Lề/Đầu-Chân/Trang tính | 🟡 | 1 | Thiếu một số tùy chọn tab Trang tính (in lưới, tiêu đề, thứ tự trang) |
| Vừa trang | Chiều rộng / Chiều cao (Fit to pages) / Tỷ lệ % | 🟡 | 1 | Có Tỷ lệ; chưa có Fit to W x H tách riêng |
| Tùy chọn trang tính | Hiện/In đường lưới và tiêu đề | 🟡 | 2 | Hiện có; hộp xem trước in có tùy chọn in đường lưới; in tiêu đề hàng/cột cần kiểm |
| Sắp xếp | Đưa lên trên / Xuống dưới / Ngăn chọn / Căn / Nhóm / Xoay đối tượng | 🔴 | 2 |  |

### Công thức

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thư viện hàm | Chèn hàm (Shift+F3) + hộp thoại đối số | 🟢 | - | sheet.formula.insertFunction |
| Thư viện hàm | Tổng tự động; Dùng gần đây; Tài chính / Logic / Văn bản / Ngày giờ / Tra cứu / Toán | 🟢 | - | Các nhóm hàm trong ribbon |
| Thư viện hàm | Độ phủ hàm Excel 2016 (462 hàm) | 🟡 | 1 | Đã đối chiếu 137 hàm, 118 khớp; ~337 hàm chưa kiểm (xem EXCEL2016-FUNCTIONS-MATRIX.md) |
| Thư viện hàm | Công thức mảng (CSE, Ctrl+Shift+Enter) | 🟡 | 1 | Có hỗ trợ mảng; chưa đối chiếu đủ |
| Thư viện hàm | Tham chiếu có cấu trúc (Table1[Cột]) | 🔴 | 1 | Chưa có |
| Thư viện hàm | Tham chiếu 3-D giữa các trang (Sheet1:Sheet3!A1) | 🔴 | 2 |  |
| Tên đã xác định | Trình quản lý tên / Xác định tên / Tạo từ vùng chọn / Dùng trong công thức | ✅ | - | Tên SampleNames đã đối chiếu |
| Kiểm tra công thức | Tìm ô tiền lệ / phụ thuộc / Xóa mũi tên | 🟢 | - |  |
| Kiểm tra công thức | Hiện công thức (Ctrl+`) / Kiểm tra lỗi / Ước lượng công thức | 🟢 | - |  |
| Kiểm tra công thức | Cửa sổ theo dõi (Watch Window) | 🟢 | - |  |
| Tính toán | Tự động / Thủ công; Tính lại (F9); Tính trang (Shift+F9) | 🟢 | - |  |
| Tính toán | Tính lặp (Iterative) / Độ chính xác như hiển thị / Hệ ngày 1904 | 🔴 | 2 |  |
| Tính toán | Kiểu tham chiếu R1C1 | 🔴 | 3 |  |

### Dữ liệu

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Lấy dữ liệu | Từ văn bản/CSV, Web, Access, Cơ sở dữ liệu, Power Query | 🟡 | 2 | Mở CSV có; chưa có Power Query/kết nối ngoài |
| Kết nối | Làm mới tất cả / Kết nối / Thuộc tính / Liên kết ngoài (Edit Links) | 🔴 | 2 |  |
| Sắp xếp & Lọc | Sắp xếp A-Z, Z-A, Sắp xếp tùy chỉnh | ✅ | - |  |
| Sắp xếp & Lọc | Bộ lọc nâng cao (Advanced Filter, vùng tiêu chí) | 🔴 | 2 |  |
| Công cụ dữ liệu | Tách văn bản thành cột | 🟢 | - | sheet.data.textToColumns |
| Công cụ dữ liệu | Flash Fill | 🟢 | - |  |
| Công cụ dữ liệu | Xóa trùng lặp | 🟢 | - |  |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Danh sách | ✅ | - | Validation.Type=3 đã đối chiếu |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Số nguyên / Số thập phân | ✅ | - | G2: Excel 2016 đọc Type 1/2 + toán tử |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Ngày / Giờ / Độ dài văn bản / Tùy chỉnh (công thức) | ✅ | - | G2: Excel 2016 đọc Type 4/5/6/7 |
| Công cụ dữ liệu | Kiểm tra dữ liệu: Thông báo nhập, Cảnh báo lỗi (Stop/Warning/Info), Khoanh vòng dữ liệu sai | 🟡 | 3 | G2: thông báo nhập + 3 mức cảnh báo Excel 2016 đọc đúng; khoanh vòng chưa so hình |
| Công cụ dữ liệu | Hợp nhất dữ liệu (Consolidate) | 🟢 | - |  |
| Công cụ dữ liệu | Quan hệ giữa bảng / Mô hình dữ liệu (Power Pivot) | 🔴 | 3 |  |
| Dự báo | Phân tích What-If: Trình quản lý kịch bản | 🟢 | - | sheet.data.scenarioManager |
| Dự báo | What-If: Goal Seek / Bảng dữ liệu (Data Table) | 🟢 | - |  |
| Dự báo | Trang dự báo (Forecast Sheet) | 🔴 | 3 |  |
| Dàn bài | Nhóm / Bỏ nhóm / Tổng phụ | 🟢 | - |  |
| Dàn bài | Hiện/Ẩn chi tiết và nút cấp 1-2-3 | 🟡 | 2 | Cần kiểm |
| Phân tích | Solver | 🔴 | 3 | Bổ sung của Excel |

### Xem xét

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Soát lỗi | Chính tả (F7) | 🟢 | - | sheet.review.spellCheck |
| Soát lỗi | Từ đồng nghĩa (Thesaurus) / Thống kê sổ làm việc | 🔴 | 3 |  |
| Trợ năng | Kiểm tra trợ năng | 🔴 | 3 |  |
| Thông tin chi tiết | Smart Lookup | ⚪ | - | Cần dịch vụ Bing |
| Ngôn ngữ | Dịch | 🟡 | 3 | Tính năng 3T AI (cần mạng, xin phép riêng) |
| Ghi chú | Ghi chú mới / Sửa / Xóa | ✅ | - | Menu chuột phải đã kiểm 13/10 |
| Ghi chú | Trước / Sau / Hiện-Ẩn tất cả ghi chú | 🟡 | 2 | Có Trước/Sau; thiếu Hiện/Ẩn tất cả |
| Ghi chú | Nhận xét có luồng (threaded comments) | 🔴 | 3 | Excel 2016 chỉ có ghi chú cổ điển |
| Thay đổi | Bảo vệ trang tính (mật khẩu, tùy chọn cho phép) | 🟢 | - | sheet.sheet.protect |
| Thay đổi | Bảo vệ sổ làm việc (cấu trúc) | 🟢 | - | sheet.workbook.protect |
| Thay đổi | Cho phép người dùng sửa vùng (Allow Users to Edit Ranges) | 🔴 | 3 |  |
| Thay đổi | Chia sẻ sổ làm việc / Theo dõi thay đổi (cũ) | 🔴 | 3 |  |

### Chế độ xem

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Chế độ xem sổ | Bình thường / Xem ngắt trang / Bố trí trang | 🟢 | - |  |
| Chế độ xem sổ | Chế độ xem tùy chỉnh (Custom Views) | 🔴 | 3 |  |
| Chế độ xem sổ | Toàn màn hình (F11) | 🟢 | - | common.view.fullScreen |
| Hiển thị | Thước / Đường lưới / Thanh công thức / Tiêu đề | 🟢 | - | Thước chỉ ở bố trí trang |
| Thu phóng | Thu phóng (hộp thoại) / 100% / Phóng vùng chọn | 🟢 | - | sheet.view.zoom* |
| Cửa sổ | Cửa sổ mới | 🟢 | - | sheet.view.newWindow |
| Cửa sổ | Cố định ngăn (hàng đầu / cột đầu / tại ô) | ✅ | - | SplitRow/SplitColumn đã đối chiếu |
| Cửa sổ | Chia (Split) | ✅ | - | Mới 13/10, lưu và mở lại đã đối chiếu |
| Cửa sổ | Sắp xếp tất cả / Ẩn-Hiện cửa sổ / Xem song song / Cuộn đồng bộ / Đặt lại vị trí | 🔴 | 3 |  |
| Cửa sổ | Chuyển cửa sổ (Switch Windows) | 🟡 | 3 | Mở nhiều cửa sổ có; menu chuyển cần kiểm |
| Macro | Xem macro / Ghi macro | 🟢 | - | common.macro.* |
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
| Trợ giúp | Cho tôi biết bạn muốn làm gì (Alt+Q) | 🟢 | - | Ô tìm kiếm tính năng trên thanh tiêu đề |

### Công cụ Bảng

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thiết kế | Đổi tên bảng | 🟢 | - | renameTable |
| Thiết kế | Dòng tổng (Total Row) | ✅ | - | Mới 13/10, Excel 2016 đọc ShowTotals đúng |
| Thiết kế | Chuyển thành phạm vi | 🟢 | - | Menu chuột phải bảng 13/10 |
| Thiết kế | Chèn/Xóa cột-hàng bảng | 🟢 | - | Menu chuột phải bảng 13/10; mở lại giữ vùng bảng |
| Thiết kế | Đổi kích thước bảng (Resize Table) | 🔴 | 2 |  |
| Thiết kế | Tùy chọn kiểu: Hàng tiêu đề, Cột đầu/cuối, Hàng/Cột sọc, Nút lọc | 🟡 | 2 | Có sọc hàng và nút lọc; thiếu cột đầu/cuối, sọc cột |
| Thiết kế | Chèn Slicer / Xuất bảng | 🔴 | 2 |  |

### Công cụ Biểu đồ

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Thiết kế | Thêm thành phần: tiêu đề trục | ✅ | - | Mới 13/10, Excel 2016 đọc đúng |
| Thiết kế | Thêm thành phần: tiêu đề biểu đồ, chú giải, nhãn dữ liệu, đường xu hướng | ✅ | - | G3: Excel 2016 đọc HasDataLabels/Trendlines |
| Thiết kế | Thêm thành phần: lưới, thanh sai số | 🔴 | 3 |  |
| Thiết kế | Bố cục nhanh / Đổi màu / Kiểu biểu đồ | 🔴 | 2 |  |
| Thiết kế | Chọn dữ liệu / Đổi loại / Di chuyển biểu đồ | 🟢 | - | Menu chuột phải biểu đồ 13/10 |
| Thiết kế | Chuyển hàng/cột (Switch Row/Column) | ✅ | - | G3: PlotBy đọc đúng |
| Định dạng | Màu/viền/hiệu ứng thành phần, kích thước, vị trí | 🔴 | 2 |  |

### Công cụ PivotTable

| Nhóm | Tính năng Excel 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Sheet |
|---|---|---|---|---|
| Phân tích | Làm mới / Đổi nguồn / Danh sách trường | 🟡 | 2 | Có làm mới; thiếu đổi nguồn |
| Phân tích | Nhóm (ngày/số) / Trường tính toán / Slicer | 🔴 | 2 |  |
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
| Hộp tên và thanh công thức | Hộp tên (Name Box) nhảy tới ô/tên | 🟢 | - |  |
| Hộp tên và thanh công thức | Mở rộng thanh công thức; Ctrl+Shift+U | 🟡 | 3 |  |
| Thanh trạng thái | Tổng/Trung bình/Đếm vùng chọn; nút chế độ xem; thanh thu phóng | 🟢 | - |  |
| Thanh trạng thái | Menu tùy chỉnh thanh trạng thái | 🔴 | 3 |  |
| Tab trang tính | Cuộn tab, thêm trang, kéo đổi thứ tự | 🟡 | 2 | Kéo đổi thứ tự cần kiểm |
| Tab trang tính | Menu chuột phải tab (Chèn, Xóa, Đổi tên, Di chuyển, Bảo vệ, Màu, Ẩn, Hiện) | ✅ | - | Đúng thứ tự Excel, test desktop 13/10 |
| Tab trang tính | Chọn nhiều trang cùng lúc (nhóm trang) / Chọn tất cả trang | 🔴 | 2 |  |
| Chuột phải | Menu ô (Cắt/Sao chép/Dán/Chèn/Xóa/Lọc/Sắp xếp/Ghi chú/Định dạng/Tên/Liên kết) | ✅ | - | Đối chiếu CommandBars Excel 2016, test desktop 13/10 |
| Chuột phải | Menu tiêu đề hàng/cột | ✅ | - |  |
| Chuột phải | Menu trong bảng (Chèn/Xóa/Chọn/Bảng) | ✅ | - |  |
| Chuột phải | Menu biểu đồ | 🟢 | - | Chưa đối chiếu từng mục với Excel |
| Chuột phải | Menu hình / ảnh / hộp văn bản | 🔴 | 1 | Chưa có |
| Chuột phải | Phân tích nhanh (Quick Analysis) / Chọn từ danh sách thả xuống | 🔴 | 2 |  |
| Chuột | Kéo chốt điền (Fill Handle), nhấp đúp điền xuống, tùy chọn tự điền | 🟡 | 1 | Điền chuỗi có; nhấp đúp và Auto Fill Options cần kiểm |
| Chuột | Kéo đổi độ rộng cột/chiều cao hàng, nhấp đúp tự vừa | 🟢 | - |  |
| Chuột | Kéo-thả di chuyển ô, Ctrl+kéo sao chép, Shift+kéo chèn | 🟡 | 2 | Cần kiểm đủ |
| Chuột | Chọn: ô, hàng, cột, vùng, Ctrl+nhiều vùng, góc chọn tất cả | ✅ | - | Bộ phím/chuột E3: 62/62 |
| Chuột | Cuộn bánh xe, Ctrl+cuộn thu phóng | 🟢 | - |  |
| Bàn phím | Điều hướng (mũi tên, Ctrl+mũi tên, Home/End, Ctrl+Home/End, PgUp/PgDn, Tab/Enter) | ✅ | - | E3 đã đối chiếu |
| Bàn phím | Nhập liệu (F2, Enter, Alt+Enter, Ctrl+Enter, Ctrl+;, Ctrl+Shift+;, F4) | ✅ | - | E3, E3b đã đối chiếu |
| Bàn phím | Phím tắt định dạng và lệnh (Ctrl+1, Ctrl+Shift+4/5/1, Ctrl+B/I/U, Ctrl+K, Ctrl+D/R, Ctrl+Z/Y) | ✅ | - | E3 |
| Bàn phím | Phím tắt Alt (KeyTips: Alt rồi H, N, ...) | 🔴 | 2 | Chưa có chế độ KeyTips đầy đủ như Excel |
| Hộp thoại | Đủ hộp thoại: Định dạng ô, Dán đặc biệt, Tìm/Thay, Sắp xếp, Tên, Chèn/Xóa ô, Chiều cao/Độ rộng | ✅ | - |  |
| Tính tương thích | Mở/Lưu XLS, XLSX, ODS, CSV đúng bố cục | ✅ | - | Bộ 8 tệp 0 chênh lệch; còn sai khác kiểu bảng ở lan25 |
| Tính tương thích | Giữ ảnh, hộp văn bản, bảng, định dạng số, ghi chú, split khi lưu | ✅ | - | Đã sửa hồi quy ảnh 13/10 |
| Hiệu năng | Mở tệp lớn nhanh, gõ không trễ (ở mức Excel/LibreOffice) | ✅ | - | Dữ liệu hiện ~2s; gõ 46 ms |
