# Báo Cáo Kiểm Tra Trực Quan Vòng 10 (Visual Inspection R10)

Ngày thực hiện: 2026-09-20  
Đối tượng kiểm tra:
- **VN Sheet**: 6 workbook (`lan02.xlsx`, `lan03.xlsx`, `lan09.xlsx`, `lan12.xlsx`, `lan26.xlsx`, `lan28.xlsx`) đối chiếu với MS Excel 2016 COM (bản gốc và bản lưu roundtrip `_rt_*.xlsx`).
- **VN Writer**: 3 tài liệu (`d07.docx`, `d09.docx`, `d13.docx`) đối chiếu với MS Word 2016 COM (PDF export trang 1–3).

---

## 1. Ước lượng mức độ tương đồng trực quan (Fidelity Score)

| Mã tệp | Loại tài liệu | Độ giống Office (% mắt nhìn) | Trạng thái Roundtrip (_rt_) | Tóm tắt trực quan |
|---|---|:---:|:---:|---|
| **lan02** | Bảng tính ngân hàng & chi lương | **85%** | Mở tốt (2/2 sheets, 0 diff) | Dữ liệu bảng tính, viền, font chữ tốt. Còn lỗi tràn chữ (overflow) bị cắt ở cột hẹp, checkbox biến thành ảnh lỗi, mất màu nền vàng hàng 10-13 sheet 2. |
| **lan03** | Báo giá thiết bị có nhiều hình ảnh | **90%** | Mở tốt (12/12 sheets, 0 diff) | Layout ảnh sản phẩm và thông số kỹ thuật chuẩn. Sheet ẩn được ẩn đúng. Hàng tiêu đề 1 bị sai màu nền (xám thay vì xanh dương). |
| **lan09** | Báo giá nhiều sheet & định dạng màu | **92%** | Mở tốt (15/15 sheets, 0 diff) | Rất ấn tượng: Banner ảnh, mã QR, màu tab, khối highlight vàng và hyperlink hiển thị sắc nét, gần như không phân biệt được với Excel 2016. |
| **lan12** | Báo giá thiết bị điện tử | **75%** | Mở tốt (11/11 sheets, 0 diff) | Sheet 1 bị chèn trùng lặp header của Sheet 2 do lỗi freeze row / print title. Dữ liệu bên dưới vẫn hiển thị. |
| **lan26** | Báo giá thiết bị điện tử (>500 ảnh) | **60%** | Mở tốt (6/6 sheets, 0 diff) | Sheet 1 bị crash trong `SheetGridController.renderImages` (`TypeError: Cannot read properties of undefined (reading 'c')`) khiến toàn bộ bảng từ dòng 6 trở đi không render. Các sheet sau mở được. |
| **lan28** | Bảng biểu nhân sự & KPI | **88%** | Mở tốt (12/12 sheets, 0 diff) | Hiển thị bảng số liệu rõ ràng. Tự động bật AutoFilter nút `▼` ở hàng 1 làm hẹp cột tiêu đề và cắt cụt chữ `Đơn giá(VNĐ)`. |
| **d07** | Văn bản hợp đồng nhiều trang | **82%** | N/A (kiểm tra render) | Trang 1–3 hiển thị rõ ràng, font Times New Roman chuẩn. Tuy nhiên giãn cách đoạn/dòng tích lũy lớn hơn Word khiến Điều 1 và Điều 2 bị đẩy sang trang 2 sớm (24 trang vs Word 23 trang). |
| **d09** | Đề cương báo cáo thực tập | **88%** | N/A (kiểm tra render) | Khớp chính xác 14/14 trang với Word. Đầu trang 1 dấu gạch đầu dòng `-` bị biến thành chấm tròn `•`, mục 3 bị đẩy qua trang 2 do lề danh sách. |
| **d13** | Tài liệu đặc tả kỹ thuật dự án | **90%** | N/A (kiểm tra render) | Khớp chính xác 10/10 trang với Word. Bìa trang 1 giống 98%. Trang 2 có lỗi chồng chữ đè lên nhau ở mục 2.1 dòng 1 và sơ đồ ASCII mục 3 bị dồn sang trang 3. |

---

## 2. Những điểm KHÔNG lệch (Auditor đang đánh giá đúng)

Kiểm tra trực quan xác nhận bộ đo tự động (`_batch_audit.py`, `audit-sheet-import.mjs`) đang phản ánh chính xác các khía cạnh sau:
1. **Khả năng tương thích tệp XLSX roundtrip (100% PASS)**:
   - Tất cả 6 workbook (`lan02`, `lan03`, `lan09`, `lan12`, `lan26`, `lan28`) sau khi mở và lưu qua app thật đều được Excel 2016 mở lại hoàn toàn bình thường, không gặp bất kỳ thông báo lỗi repair hay corrupted XML nào.
   - Số lượng worksheet, tên worksheet (kể cả tiếng Việt có dấu), và trạng thái ẩn/hiện (`hidden`/`visible`) được bảo toàn tuyệt đối.
2. **Định dạng số và công thức**:
   - Các định dạng tiền tệ (VND `#,#0`, phân cách hàng nghìn dấu chấm/phẩy), số thập phân, phần trăm hiển thị đồng nhất giữa Excel và VN Sheet.
   - Các công thức tính toán và ô lỗi (ví dụ `#NAME?` khi thiếu hàm add-in) được giữ nguyên giá trị verbatim.
3. **Ảnh Drawing cơ bản**:
   - Các ảnh sản phẩm trong `lan03`, banner đồ họa trong `lan09`, logo nhãn hiệu trong `lan26` được căn đúng vị trí cột, giữ đúng tỉ lệ khung hình (aspect ratio).
4. **Văn bản và Phông chữ tiếng Việt trong Writer**:
   - Hệ thống font Unicode tiếng Việt (Times New Roman, Arial, Calibri) không bị lỗi vỡ font hay mất dấu tổ hợp/dựng sẵn.
   - Kích thước chữ, kiểu in đậm (Bold), in nghiêng (Italic), căn giữa (Center) của các tiêu đề hoàn toàn khớp với bản in PDF của Word 2016.
   - Tổng số trang của `d09` (14 trang) và `d13` (10 trang) trùng khớp 100% với Word 2016.

---

## 3. Bảng phân loại sai lệch trực quan (Xếp theo tần suất & mức độ nghiêm trọng)

| # | Lớp lỗi | Tần suất / Mức độ | File gặp lỗi | Vị trí đại diện | Mô tả tóm tắt |
|---|---|:---:|---|---|---|
| **L1** | **Crash render ảnh** | Nghiêm trọng | `lan26` | Sheet 1, từ hàng 6 trở xuống | `TypeError: Cannot read properties of undefined (reading 'c')` trong `SheetGridController.renderImages` làm crash render toàn bộ bảng dưới hàng 5. |
| **L2** | **Trùng lặp header sheet khác** | Nghiêm trọng | `lan12` | Sheet 1, hàng 1–3 đỉnh sheet | Inject lặp lại 2 lần header danh mục của Sheet 2 đè lên đầu Sheet 1, lặp row index `1, 2, 3` và che ảnh sản phẩm B1. |
| **L3** | **Cắt cụt chữ (Text Overflow)** | Rất phổ biến | `lan02`, `lan28` | `lan02` S1 (A4, A7, A19, A20); `lan28` S1 (F1) | Ô chữ dài không tự tràn (spill) qua ô trống liền kề bên phải, bị xén cụt ngang mép cột A/F (`Đơn vị/Ng`, `Tại Ngân `, `Đơn giá(VNĐ`). |
| **L4** | **Icon ảnh hỏng đè chữ** | Trung bình | `lan02` | Sheet 1, H10:H11 | Checkbox vuông bị render thành placeholder ảnh hỏng `[Ảnh được chèn trong trang tính]` đè lên nhãn chữ. |
| **L5** | **Sai màu nền (Fill Color)** | Phổ biến | `lan02`, `lan03` | `lan02` S2 (A10:B13, A1:F1); `lan03` S1 (Row 1) | Mất màu nền vàng cảnh báo `#FFFF00` (thành trắng); thêm màu nền xanh lá nhạt không mong muốn; hàng tiêu đề chuyển từ xanh dương sang xám nhạt. |
| **L6** | **Chồng chữ / Double Text** | Trung bình | `d13` | Trang 2, Mục 2.1 dòng 1 | Chữ `cùng một hệ thống` bị vẽ đè lên văn bản hiện hữu tạo bóng kép nhòe chữ. |
| **L7** | **Ngắt trang sớm (Pagination Drift)** | Phổ biến | `d07`, `d09`, `d13` | `d07` đáy Trang 1; `d09` đáy Trang 1; `d13` đáy Trang 2 | Giãn cách đoạn/dòng tích lũy lớn hơn Word khiến các đoạn cuối trang bị đẩy sang trang tiếp theo sớm hơn 5–10 dòng (d07 thành 24 trang vs Word 23 trang). |
| **L8** | **Sai ký hiệu đầu dòng (List Bullet)** | Thấp | `d09` | Trang 1, Mục 1 & 2 | Ký hiệu gạch đầu dòng `-` (hyphen) bị chuyển thành bullet tròn đặc `•` (disc). |
| **L9** | **Tự bật nút AutoFilter** | Thấp | `lan28` | Sheet 1, hàng 1 (A1:M1) | Hàng header tự động hiển thị dropdown mũi tên `▼` trên mọi cột dù file gốc không bật AutoFilter, làm hẹp diện tích chữ. |

---

## 4. Bảng đối chiếu chi tiết VN Sheet (Excel 2016 gốc ↔ Bản lưu _rt_ ↔ VN Sheet)

| File | Sheet | Vị trí (ô/vùng) | Excel gốc | Excel bản lưu (_rt_) | VN Sheet | Mô tả lệch (font, màu, viền, ảnh, chữ cụt...) | Ảnh cắt (crop) |
|---|---|---|---|---|---|---|---|
| **lan26** | Sheet 1 | Từ hàng 6 trở xuống | Bảng danh mục thiết bị, ảnh và giá đầy đủ | Giống gốc | Trống hoàn toàn dưới hàng 5 | **Crash render**: Ngoại lệ `TypeError: Cannot read properties of undefined (reading 'c')` tại `SheetGridController.renderImages` do image anchor thiếu `c`. | ![Crop L1](screenshots/crop_lan26_s1_uncaught_error_crash.png) |
| **lan12** | Sheet 1 | Hàng 1–3 đỉnh sheet | Tiêu đề sản phẩm dòng 1, header danh mục dòng 2–3 | Giống gốc | Chèn 2 khối header từ Sheet 2 | **Lặp header**: Header danh mục của Sheet 2 bị chèn đè lên đầu Sheet 1 lặp lại `1, 2, 3, 1, 2, 3`, che phủ ảnh sản phẩm B1. | ![Crop L2](screenshots/crop_lan12_s1_repeated_header_rows.png) |
| **lan02** | Sheet 1 | Cột A (A4, A7, A19, A20) | Chữ dài tự tràn (spill) qua các ô trống bên phải | Giống gốc | Chữ bị xén cụt ngang mép cột A | **Cắt cụt chữ**: Cột A hẹp, chữ không tràn sang cột B: `Đơn vị/Ng`, `Tại Ngân `, `PHẦN D`, `Ngày giờ l`. | ![Crop L3a](screenshots/crop_lan02_s1_truncated_text.png) |
| **lan28** | Sheet 1 | Ô F1 | `Đơn giá(VNĐ)` hiển thị trọn vẹn | Giống gốc | Chữ bị cắt cụt thành `Đơn giá(VNĐ` | **Cắt cụt chữ**: Dropdown AutoFilter chiếm không gian làm mất dấu ngoặc đơn đóng. | ![Crop L3b](screenshots/crop_lan28_s1_autofilter_arrows_truncation.png) |
| **lan02** | Sheet 1 | Ô H10:H11 | Checkbox vuông nhỏ cạnh nhãn chữ | Giống gốc | Icon ảnh hỏng đè chữ | **Ảnh hỏng**: Biểu tượng checkbox bị thay bằng placeholder `[Ảnh được chèn trong trang tính]` đè lên chữ. | ![Crop L4](screenshots/crop_lan02_s1_broken_image_alt.png) |
| **lan02** | Sheet 2 | Ô A10:B13 | Nền vàng `#FFFF00` cảnh báo | Giống gốc | Nền trắng không màu | **Mất màu nền**: Màu nền vàng cảnh báo nhân viên bị mất hoàn toàn. | ![Crop L5a](screenshots/crop_lan02_s2_missing_yellow_fill.png) |
| **lan02** | Sheet 2 | Vùng A1:F1 | Nền trắng tự nhiên, viền chuẩn | Giống gốc | Nền xanh lá nhạt viền đậm | **Sai màu nền**: Tiêu đề Quốc hiệu bị bọc khung xanh lá nhạt không mong muốn. | ![Crop L5b](screenshots/crop_lan02_s2_a1f1_green_fill.png) |
| **lan03** | Sheet 1 | Hàng 1 (A1:N1) | Header nền xanh dương `#2563eb`, chữ trắng | Giống gốc | Nền xám nhạt | **Sai màu nền**: Tiêu đề chính mất màu xanh thương hiệu, chuyển thành xám nhạt. | ![Crop L5c](screenshots/crop_lan03_s1_row1_blue_vs_gray.png) |
| **lan28** | Sheet 1 | Hàng 1 (A1:M1) | Hàng header chuẩn, không có nút lọc | Giống gốc | Xuất hiện dropdown `▼` mọi cột | **Tự bật AutoFilter**: Bật filter dropdown làm hẹp tiêu đề và cắt chữ. | ![Crop L9](screenshots/crop_lan28_s1_autofilter_arrows_truncation.png) |

---

## 5. Bảng đối chiếu chi tiết VN Writer (Word 2016 gốc ↔ VN Writer)

| File | Trang | Đoạn / Vị trí | Word 2016 | VN Writer | Mô tả lệch (ngắt trang, khoảng cách, font, bullet, số trang) | Ảnh cắt (crop) |
|---|:---:|---|---|---|---|---|
| **d13** | Trang 2 | Mục 2.1 dòng 1 | "Quản lý nhiều trường, nhiều cơ sở, nhiều lớp trong cùng một hệ thống." | Chữ `cùng một hệ thống` in đè lên text tạo bóng kép | **Chồng chữ (Double Text)**: Lỗi render trùng lặp (double paint) làm nhòe chữ và khó đọc. | ![Crop L6](screenshots/crop_d13_p2_text_overlap.png) |
| **d07** | Trang 1–3 | Đáy Trang 1 & Trang 2 | Trang 1 chứa trọn vẹn Điều 1 và Điều 2; tổng 23 trang | Điều 1 bị cắt dở, Điều 2 bị đẩy sang trang 2; tổng 24 trang | **Ngắt trang sớm**: Giãn dòng và margin tích lũy lớn hơn Word khiến văn bản bị đẩy sang trang kế tiếp sớm hơn 10 dòng, tăng 1 trang tổng thể. | ![Crop L7a](screenshots/crop_d07_p1_premature_pagebreak.png) |
| **d09** | Trang 1–3 | Đáy Trang 1 | Trang 1 chứa trọn vẹn Mục 1, 2 và 3 | Mục 3 bị đẩy sang trang 2 | **Dạt trang do lề danh sách**: List item margin làm đội chiều cao trang 1, dù tổng số trang vẫn khớp 14 trang. | ![Crop L7b](screenshots/crop_d09_p1_hyphen_bullets_spacing.png) |
| **d09** | Trang 1 | Mục 1 & 2 danh sách | Ký hiệu gạch đầu dòng `-` (hyphen) | Chấm tròn đen `•` (disc bullet) | **Sai ký hiệu đầu dòng**: Toàn bộ bullet cấp 2 của Word bị đổi thành dấu chấm tròn đặc. | ![Crop L8](screenshots/crop_d09_p1_hyphen_bullets_spacing.png) |

---

## 6. Kiến nghị ưu tiên khắc phục cho các nhóm kỹ thuật

1. **Ưu tiên 1 (Sửa Crash nghiêm trọng)**:
   - Thêm kiểm tra an toàn `image.anchor?.c != null` trong `SheetGridController.renderImages` (`apps/sheet/sheet-grid.js:4775`) để tránh crash khi nạp tài liệu nhiều hình ảnh như `lan26`.
2. **Ưu tiên 2 (Khắc phục lỗi hiển thị Sheet)**:
   - Sửa lỗi lặp header hàng và chèn nhầm freeze rows giữa các sheet trong `lan12`.
   - Bổ sung cơ chế text-overflow cho các ô không có ô bên cạnh chứa dữ liệu (tự tràn chữ thay vì clip cụt).
   - Kiểm tra lại cơ chế mapping theme color / fill color cho tiêu đề xanh `lan03` và màu nền vàng cảnh báo `lan02`.
   - Không tự động bật AutoFilter dropdown khi file gốc không định nghĩa vùng lọc hoạt động.
3. **Ưu tiên 3 (Khắc phục lỗi bố cục Writer)**:
   - Khắc phục hiện tượng render đè chữ (double text collision) ở `d13`.
   - Chuẩn hóa khoảng cách lề danh sách (list item margins) và quy tắc ngắt trang mềm để triệt tiêu độ lệch +1 trang ở `d07`.
   - Bảo toàn ký hiệu gạch đầu dòng `-` thay vì tự động ép thành bullet tròn đặc.
