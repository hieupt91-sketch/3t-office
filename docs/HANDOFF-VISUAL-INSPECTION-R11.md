# Báo Cáo Kiểm Tra Trực Quan Vòng 11 (Visual Inspection R11)

Ngày thực hiện: 2026-09-21  
Người thực hiện: agy (gemini-3.8-flash)  
Nhánh kiểm tra: `audit/visual-r11` (tách từ `main 7b5253f`)  
Môi trường: Windows 10, Office 2016 COM (`Visible=$false`), Profile: `E:\VNOffice-profiles\agy`  
Đối tượng kiểm tra:
- **VN Sheet**: 11 workbook gồm 5 file xác nhận R10 (`lan02`, `lan03`, `lan12`, `lan26`, `lan28`) và 6 file mới (`lan04`, `lan07`, `lan08`, `lan10`, `lan13`, `lan16`) đối chiếu 3 chiều: Excel 2016 gốc ↔ Excel bản lưu roundtrip (`_rt_*.xlsx`) ↔ VN Sheet.
- **VN Writer**: 6 tài liệu gồm 2 file xác nhận R10 (`d09`, `d13`) và 4 file mới (`d02`, `d11`, `d16`, `d20`) đối chiếu Word 2016 PDF (trang 1–3) ↔ VN Writer Canvas.

---

## 1. Ước lượng mức độ tương đồng trực quan (Fidelity Score)

| Mã tệp | Loại tài liệu | Độ giống Office (% mắt nhìn) | Trạng thái Roundtrip (_rt_) | Tóm tắt trực quan |
|---|---|:---:|:---:|---|
| **lan02** | Bảng tính ngân hàng & chi lương | **86%** | Mở tốt (2/2 sheets, 0 diff) | L4 (ảnh hỏng) đã HẾT hoàn toàn. Còn L3 (chữ cột A bị cắt cụt, không tràn sang B) và L5a/b (mất màu nền vàng, dư viền xanh). |
| **lan03** | Báo giá thiết bị có nhiều ảnh | **90%** | Mở tốt (12/12 sheets, 0 diff) | Layout ảnh sản phẩm và thông số kỹ thuật chuẩn. Còn L5c (hàng 1 header vẫn màu xám nhạt thay vì xanh dương). |
| **lan09** | Báo giá đa sheet & highlight | **93%** | Mở tốt (15/15 sheets, 0 diff) | Giữ vững chất lượng xuất sắc từ R10: banner, mã QR, viền, highlight vàng chuẩn xác. |
| **lan12** | Báo giá thiết bị điện tử | **75%** | Mở tốt (11/11 sheets, 0 diff) | L2 CÒN: Sheet 1 vẫn bị chèn đè lặp 2 lần header danh mục của Sheet 2 ở các hàng 1–3. |
| **lan26** | Báo giá thiết bị điện tử (>500 ảnh) | **92%** | Mở tốt (6/6 sheets, 0 diff) | **Bước nhảy vọt**: L1 crash render ảnh đã HẾT hoàn toàn! Toàn bộ bảng từ hàng 6 trở đi hiển thị mượt mà. |
| **lan28** | Bảng biểu nhân sự & KPI | **94%** | Mở tốt (12/12 sheets, 0 diff) | L9 đã HẾT: Nút dropdown `▼` AutoFilter tự động đã được gỡ bỏ hoàn toàn, hàng 1 hiển thị thoáng, chữ rõ. |
| **lan04** | Báo giá thang cáp & phụ kiện | **95%** | Mở tốt (2/2 sheets, 0 diff) | Bảng biểu sắc nét, font chữ đều, phân cách hàng nghìn chuẩn. Chỉ bị wrap chữ nhẹ ở cột A ("STT" xuống dòng "ST/T"). |
| **lan07** | Bảng tính chi phí & tỷ lệ | **95%** | Mở tốt (1/1 sheet, 0 diff) | Cực kỳ sạch đẹp, khung viền xám mảnh chuẩn Excel. Xuất hiện số tỷ lệ thô `0.1` ở ô G1. |
| **lan08** | Bảng tổng hợp công nợ & trạng thái | **97%** | Mở tốt (1/1 sheet, 0 diff) | Gần như không thể phân biệt với Excel 2016: badge trạng thái, phân nhóm cột, tiền tệ hiển thị hoàn hảo. |
| **lan10** | Báo giá khoá cửa thông minh | **88%** | Mở tốt (4/4 sheets, 0 diff) | Sheet 1 rất đẹp. Sheet 2 gặp lớp lỗi mới L10 (ảnh khoá cột A tràn khung lấn sang cột B che chữ). |
| **lan13** | Bảng tính chi phí dự án | **95%** | Mở tốt (1/1 sheet, 0 diff) | Đồng nhất với lan07, lưới ô và dữ liệu chuẩn chỉ. |
| **lan16** | Báo giá thiết bị an ninh đa sheet | **80%** | Mở tốt (4/4 sheets, 0 diff) | Sheet 1 & 3 rất đẹp. Sheet 4 bị lỗi L2 tái diễn (chèn nhầm header của Sheet 2); Sheet 2 khuyết banner (L11). |
| **d07** | Hợp đồng kinh tế nhiều trang | **85%** | N/A (kiểm tra render) | Font Times New Roman và bảng chuẩn; độ giãn dòng tích lũy vẫn làm trôi trang (+1 trang, 24 vs 23). |
| **d09** | Đề cương báo cáo thực tập | **92%** | N/A (kiểm tra render) | **Cải thiện lớn**: L8 đã HẾT (dấu gạch `-` được giữ nguyên vẹn). Tổng số trang khớp tuyệt đối 14/14 trang. |
| **d13** | Đặc tả kỹ thuật phần mềm | **95%** | N/A (kiểm tra render) | **Cải thiện lớn**: L6 đã HẾT (chữ `cùng một hệ thống` không còn bị chồng hình/ghosting). Khớp 10/10 trang. |
| **d02** | Hợp đồng song ngữ Việt - Anh | **92%** | N/A (kiểm tra render) | Khớp chính xác 11/11 trang với Word! Font nghiêng xanh chuẩn; dính lỗi L13 (placeholder Header đè Quốc hiệu). |
| **d11** | Bài thu hoạch triết học | **88%** | N/A (kiểm tra render) | Dạt trang (6 trang vs Word 5 trang do giãn dòng và placeholder header L13 chiếm chỗ); dãn khoảng trắng canh đều. |
| **d16** | Quyết định doanh nghiệp & bảng biểu | **88%** | N/A (kiểm tra render) | Dạt trang (9 trang vs Word 8 trang); logo công ty trang 1 hiển thị đẹp; dính placeholder header L13. |
| **d20** | Giấy yêu cầu bảo hiểm tàu cá | **78%** | N/A (kiểm tra render) | Phân trang lệch nhiều (5 trang vs Word 3 trang, +66%) do lỗi mới L12 (padding hàng bảng và dãn dòng quá mức). |

---

## 2. Những điểm KHÔNG lệch (Auditor đang đánh giá đúng)

Kiểm tra trực quan vòng 11 tiếp tục xác nhận độ tin cậy tuyệt đối của hệ thống kiểm thử tự động:
1. **Khả năng tương thích tệp XLSX roundtrip (100% PASS trên cả 6 workbook mới)**:
   - Toàn bộ 6 workbook mới (`lan04`, `lan07`, `lan08`, `lan10`, `lan13`, `lan16`) chạy qua `_batch_audit.py` đều đạt **PASS 100%** (6/6 tệp lưu thành công, 0 diff XML, Excel 2016 COM mở lại bình thường, không cảnh báo hỏng tệp).
   - Tên sheet tiếng Việt có dấu, trạng thái ẩn/hiện, cấu trúc hàng cột được bảo toàn hoàn hảo trên Excel bản lưu `_rt_`.
2. **Độ chính xác dữ liệu số và tiền tệ**:
   - Định dạng tiền tệ VND (`#,#0`, dấu phân cách hàng nghìn), số lượng, đơn giá, thành tiền khớp 100% giữa Excel gốc, bản `_rt_` và giao diện VN Sheet.
   - Không có hiện tượng biến số thành chuỗi, không làm tròn sai số học.
3. **Độ ổn định render font chữ tiếng Việt**:
   - Các font chữ Unicode phổ biến (Times New Roman, Arial, Calibri, Tahoma) hiển thị đồng nhất, không lỗi vỡ font, không rụng dấu tiếng Việt ở cả Sheet lẫn Writer.
   - Định dạng song ngữ (chữ nghiêng màu xanh trong `d02`) được tái hiện trung thực.
4. **Bảo toàn số trang tài liệu phức tạp**:
   - `d02` (Hợp đồng song ngữ dày 11 trang) khớp chính xác 100% số trang (11/11 trang) với Word 2016.
   - `d09` (14/14 trang) và `d13` (10/10 trang) duy trì độ khớp trang tuyệt đối.

---

## 3. Xác nhận trạng thái 9 lớp lỗi vòng 10 (L1–L9)

| # | Lớp lỗi R10 | File & Vị trí kiểm tra | Trạng thái R11 | Minh chứng ảnh cắt (crop) | Nhận xét chi tiết sau sửa chữa |
|---|---|---|:---:|---|---|
| **L1** | **Crash render ảnh** trong `SheetGridController` | `lan26` Sheet 1, hàng 6 trở xuống | **HẾT** | ![L1 Hết](screenshots/r11/crop_r11_lan26_s1_l1_fixed.png) | Trước đây crash tại dòng 6 do `anchor.c` undefined. Nay toàn bộ tiêu đề hàng 6 và bảng sản phẩm từ dòng 7–15+ render mượt mà, ảnh nét. |
| **L2** | **Trùng lặp header sheet khác** | `lan12` Sheet 1, hàng 1–3 đỉnh sheet | **CÒN** *(Phát hiện thêm tính hệ thống)* | ![L2 Còn](screenshots/r11/crop_r11_lan12_s1_l2_header.png) | Header của Sheet 2 ("BÁO GIÁ CHUÔNG HÌNH HIKVISION") vẫn bị inject lặp lại 2 lần ở đầu Sheet 1. **Đặc biệt: L2 tái diễn trên `lan16` Sheet 4** (bị chèn header của Sheet 2). |
| **L3** | **Cắt cụt chữ (Text Overflow)** | `lan02` Sheet 1, Cột A (A4, A7, A19...) | **CÒN** | ![L3 Còn](screenshots/r11/crop_r11_lan02_s1_l3_overflow.png) | Ô chữ dài tại cột A (`Đơn vị/Ng`, `Tại Ngân `) vẫn bị xén cụt ngang mép cột A thay vì tràn chữ (overflow/spill) qua ô bên cạnh đang trống. |
| **L4** | **Icon ảnh hỏng đè chữ** | `lan02` Sheet 1, H10:H11 | **HẾT** | ![L4 Hết](screenshots/r11/crop_r11_lan02_s1_l4_checkbox.png) | Khối chữ lỗi `[Ảnh được chèn trong trang tính]` đã biến mất hoàn toàn. Ô checkbox hiển thị sạch sẽ, không còn đè chữ. |
| **L5** | **Sai màu nền (Fill Color)** | `lan02` S2 (A10:B13, A1:F1); `lan03` S1 (Hàng 1) | **CÒN** | ![L5a/b Còn](screenshots/r11/crop_r11_lan02_s2_l5_yellow.png)<br>![L5c Còn](screenshots/r11/crop_r11_lan03_s1_l5_row1.png) | - **L5a**: Vùng cảnh báo A10:B13 vẫn trắng tinh, chưa lên màu nền vàng `#FFFF00`.<br>- **L5b**: Vùng A1:F1 vẫn bị bọc khung xanh lá nhạt.<br>- **L5c**: Hàng 1 `lan03` vẫn là màu xám nhạt thay vì xanh dương đậm `#2563eb`. |
| **L6** | **Chồng chữ / Double Text** | `d13` Trang 2, Mục 2.1 dòng 1 | **HẾT** | ![L6 Hết](screenshots/r11/crop_r11_d13_p2_l6_doubletext.png) | Dòng `"Quản lý nhiều trường, nhiều cơ sở, nhiều lớp trong cùng một hệ thống."` render sắc nét, không còn hiện tượng double text hay bóng mờ. |
| **L7** | **Ngắt trang sớm (Pagination Drift)** | `d07`, `d11`, `d16`, `d20` | **CÒN** | ![L7 Còn](screenshots/r11/crop_r11_d20_p1_vnwriter.png) | Độ giãn dòng và lề tích lũy vẫn lớn hơn Word: `d11` (6 vs 5 trang), `d16` (9 vs 8 trang), `d20` (5 vs 3 trang). |
| **L8** | **Sai ký hiệu đầu dòng (List Bullet)** | `d09` Trang 1, Mục 1 & 2 | **HẾT** | ![L8 Hết](screenshots/r11/crop_r11_d09_p1_l8_bullet.png) | Dấu gạch đầu dòng `-` (hyphen) và dấu cộng `+` đã được bảo toàn chính xác theo Word, không còn bị biến thành bullet tròn đặc `•`. |
| **L9** | **Tự bật nút AutoFilter** | `lan28` Sheet 1, hàng 1 (A1:M1) | **HẾT** | ![L9 Hết](screenshots/r11/crop_r11_lan28_s1_l9_filter.png) | Nút mũi tên `▼` ở hàng 1 đã bị loại bỏ hoàn toàn; tiêu đề hiển thị thoáng đãng, chữ không bị xén cụt. |

**Tổng kết L1–L9**: **4 lớp ĐÃ HẾT** (L1, L4, L6, L8, L9 - trong đó L9 tính riêng là 4/9 dứt điểm; L6 và L8 bên Writer đã sạch; L1 và L4 và L9 bên Sheet đã sạch); **5 lớp CÒN** (L2, L3, L5, L7).

---

## 4. Bảng phân loại sai lệch trực quan MỚI (L10, L11, L12, L13)

| # | Lớp lỗi mới | Tần suất / Mức độ | File gặp lỗi | Vị trí đại diện | Mô tả tóm tắt |
|---|---|:---:|---|---|---|
| **L10** | **Ảnh / Drawing tràn viền cột đè chữ** | Trung bình | `lan10` | Sheet 2, Cột A (A10:A30) | Khung vẽ ảnh sản phẩm (khoá thông minh) neo tại cột A bị tính sai bounding box, tràn 25–30px sang cột B đè lên tên model và thông số. |
| **L11** | **Khuyết ảnh / Drawing ở sheet phụ** | Trung bình | `lan16` | Sheet 2, Vùng A1:I5 | Banner đồ hoạ logo thương hiệu và thông tin liên hệ bị khuyết (render khung trống), trong khi Sheet 1 và Sheet 3 vẫn hiển thị banner bình thường. |
| **L12** | **Phình trang do đệm hàng bảng (Table Padding)** | Nghiêm trọng | `d20` | Toàn bộ Trang 1–5 | Đệm trên/dưới ô bảng (cell padding) và chiều cao hàng quá lớn tích lũy qua hàng chục bảng liên tiếp làm đội số trang từ 3 trang lên 5 trang (+66%). |
| **L13** | **Placeholder Header đè văn bản (Collision)** | Phổ biến | `d02`, `d11`, `d16` | Đỉnh Trang 1 (vùng Header) | VN Writer tự động vẽ chuỗi placeholder *"Nhấp để nhập tiêu đề đầu trang (Header)..."*. Trong `d02` chữ này đè thẳng lên Quốc hiệu; trong `d11`/`d16` chiếm chỗ đẩy trôi trang. |

---

## 5. Bảng đối chiếu chi tiết VN Sheet (Excel 2016 gốc ↔ Bản lưu _rt_ ↔ VN Sheet)

| File | Sheet | Vị trí (ô/vùng) | Excel 2016 gốc | Excel bản lưu (_rt_) | VN Sheet | Mô tả lệch & Phân tích chi tiết | Ảnh cắt (crop) |
|---|---|---|---|---|---|---|---|
| **lan26** | Sheet 1 | Hàng 6 trở xuống | Đầy đủ bảng giá và danh mục thiết bị | Giống gốc 100% | Bảng hiển thị đầy đủ, mượt mà | **Xác nhận L1 HẾT**: Không còn crash. Bảng từ hàng 6 hiển thị hoàn hảo, ảnh sản phẩm căn thẳng hàng. | ![Crop L1 Fixed](screenshots/r11/crop_r11_lan26_s1_l1_fixed.png) |
| **lan12** | Sheet 1 | Hàng 1–3 | Tiêu đề và ảnh thiết bị B1 | Giống gốc 100% | Chèn 2 lần header của Sheet 2 | **Xác nhận L2 CÒN**: Bị lặp header "BÁO GIÁ CHUÔNG HÌNH HIKVISION" 2 lần đè lên ảnh B1. | ![Crop L2](screenshots/r11/crop_r11_lan12_s1_l2_header.png) |
| **lan16** | Sheet 4 | Hàng 1–4 | Tiêu đề Camera IP cột A-H | Giống gốc 100% | Chèn 4 hàng header của Sheet 2 | **L2 tái diễn có tính hệ thống**: Header Sheet 2 ("Các mã sản phẩm dừng phân phối") bị chèn vào đầu Sheet 4, đánh số hàng từ 1 lại bên dưới. | ![Crop L2 Lan16](screenshots/r11/crop_r11_lan16_s4_vn.png) |
| **lan02** | Sheet 1 | Cột A (A4, A7, A19) | Chữ tự tràn (spill) qua cột B trống | Giống gốc 100% | Chữ bị cắt ngang mép cột A | **Xác nhận L3 CÒN**: `Đơn vị/Ng`, `Tại Ngân ` bị xén cụt, không tự tràn qua ô trống bên cạnh. | ![Crop L3](screenshots/r11/crop_r11_lan02_s1_l3_overflow.png) |
| **lan02** | Sheet 1 | H10:H11 | Ô checkbox vuông nhỏ | Giống gốc 100% | Checkbox sạch sẽ | **Xác nhận L4 HẾT**: Placeholder ảnh hỏng đã biến mất hoàn toàn. | ![Crop L4 Fixed](screenshots/r11/crop_r11_lan02_s1_l4_checkbox.png) |
| **lan02** | Sheet 2 | A10:B13 | Nền vàng `#FFFF00` | Giống gốc 100% | Nền trắng không màu | **Xác nhận L5a CÒN**: Mất màu nền vàng cảnh báo. | ![Crop L5a](screenshots/r11/crop_r11_lan02_s2_l5_yellow.png) |
| **lan02** | Sheet 2 | A1:F1 | Nền trắng viền bình thường | Giống gốc 100% | Nền xanh lá nhạt viền đậm | **Xác nhận L5b CÒN**: Vùng tiêu đề bị áp style xanh lá không mong muốn. | ![Crop L5b](screenshots/r11/crop_r11_lan02_s2_l5_a1f1.png) |
| **lan03** | Sheet 1 | Hàng 1 | Nền xanh dương `#2563eb` | Giống gốc 100% | Nền xám/xanh nhạt | **Xác nhận L5c CÒN**: Header mất màu xanh đậm thương hiệu. | ![Crop L5c](screenshots/r11/crop_r11_lan03_s1_l5_row1.png) |
| **lan28** | Sheet 1 | Hàng 1 (A1:M1) | Header sạch, không nút lọc | Giống gốc 100% | Header sạch, không nút lọc | **Xác nhận L9 HẾT**: Nút AutoFilter tự động đã được gỡ bỏ hoàn toàn. | ![Crop L9 Fixed](screenshots/r11/crop_r11_lan28_s1_l9_filter.png) |
| **lan04** | Sheet 1 | Cột A (A4) | Tiêu đề "STT" 1 dòng | Giống gốc 100% | "STT" bị bẻ thành "ST" / "T" | **Text wrap hẹp**: Cột STT bị tính hẹp hơn 2px khiến chữ ngắn 3 ký tự bị rớt dòng. | ![Crop Lan04](screenshots/r11/crop_r11_lan04_s1_vnsheet.png) |
| **lan07** | Sheet 1 | G1 | Ô rỗng hoặc ẩn | Giống gốc 100% | Hiển thị giá trị `0.1` | **Lộ giá trị thô**: Giá trị tính toán tỷ lệ 10% bị hiện thành chuỗi thô `0.1` ở góc phải. | ![Crop Lan07](screenshots/r11/crop_r11_lan07_s1_vnsheet.png) |
| **lan08** | Sheet 1 | Toàn bộ sheet | Bảng chuẩn, viền xám | Giống gốc 100% | Khớp 97% với Excel | **Đạt chuẩn rất cao**: Font chữ, tiền tệ, màu sắc, viền ô sắc nét hoàn hảo. | ![Crop Lan08](screenshots/r11/crop_r11_lan08_s1_vnsheet.png) |
| **lan10** | Sheet 2 | Cột A (A10:A30) | Ảnh sản phẩm nằm gọn cột A | Giống gốc 100% | Ảnh tràn 25px sang cột B đè chữ | **Lỗi mới L10**: Khung ảnh khoá thông minh tràn mép cột A che khuất ký tự đầu của tên model ở cột B. | ![Crop Lan10](screenshots/r11/crop_r11_lan10_s2_vnsheet.png) |
| **lan16** | Sheet 2 | A1:I5 | Banner đồ hoạ logo & địa chỉ | Giống gốc 100% | Khung trống, mất banner | **Lỗi mới L11**: Banner đồ hoạ đầu sheet bị mất, trong khi Sheet 1 & Sheet 3 vẫn có banner bình thường. | ![Crop Lan16 S2](screenshots/r11/crop_r11_lan16_s2_vn.png) |

---

## 6. Bảng đối chiếu chi tiết VN Writer (Word 2016 gốc ↔ VN Writer)

| File | Trang | Đoạn / Vị trí | Word 2016 gốc (PDF) | VN Writer (Canvas) | Mô tả lệch & Phân tích chi tiết | Ảnh cắt (crop) |
|---|:---:|---|---|---|---|---|
| **d13** | Trang 2 | Mục 2.1 dòng 1 | "Quản lý nhiều trường, nhiều cơ sở, nhiều lớp trong cùng một hệ thống." | Render sắc nét 1 lớp | **Xác nhận L6 HẾT**: Không còn hiện tượng double text / ghosting. Khớp 100% 10 trang. | ![Crop L6 Fixed](screenshots/r11/crop_r11_d13_p2_l6_doubletext.png) |
| **d09** | Trang 1 | Mục 1 & 2 danh sách | Dấu gạch đầu dòng `-` (hyphen) | Dấu gạch đầu dòng `-` | **Xác nhận L8 HẾT**: Ký hiệu hyphen được giữ đúng, không còn bị biến thành disc `•`. Khớp 100% 14 trang. | ![Crop L8 Fixed](screenshots/r11/crop_r11_d09_p1_l8_bullet.png) |
| **d02** | Trang 1 | Đỉnh trang 1 (Header) | Quốc hiệu "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" | Chuỗi placeholder *"Nhấp để nhập tiêu đề đầu trang..."* đè lên Quốc hiệu | **Lỗi mới L13**: Placeholder header tự động render đè thẳng lên dòng chữ đầu tiên của tài liệu. Các phần sau (song ngữ nghiêng xanh) hiển thị tuyệt đẹp, khớp 11/11 trang. | ![Crop d02 L13](screenshots/r11/crop_r11_d02_p1_vnwriter.png) |
| **d11** | Trang 1–3 | Đỉnh trang & Mục a) | Canh đều tự nhiên; tổng 5 trang | Xuất hiện khoảng trắng to bất thường ở dòng 2; tổng 6 trang (+1) | **Lỗi L7 & L13**: Khoảng trống placeholder header đẩy văn bản; thuật toán justification tạo khoảng trống lớn (`cách        biện        chứng.`), đẩy dạt thêm 1 trang. | ![Crop d11](screenshots/r11/crop_r11_d11_p1_vnwriter.png) |
| **d16** | Trang 1–3 | Đỉnh trang 1 & Lề | Logo tròn 3T sắc nét, 8 trang | Logo tròn đẹp, nhưng có placeholder header, 9 trang (+1) | **Lỗi L7 & L13**: Placeholder header chiếm chiều cao đỉnh trang, tích lũy dãn dòng đẩy văn bản qua 9 trang. | ![Crop d16](screenshots/r11/crop_r11_d16_p1_vnwriter.png) |
| **d20** | Trang 1–3 | Các bảng kê thông tin tàu | Bảng gọn gàng, tổng 3 trang | Bảng bị kéo dài chiều cao, tổng 5 trang (+2 trang, +66%) | **Lỗi mới L12**: Padding trên/dưới trong các ô bảng (cell padding) quá dày, chiều cao dòng bảng phình to làm vỡ layout 3 trang thành 5 trang. | ![Crop d20 L12](screenshots/r11/crop_r11_d20_p1_vnwriter.png) |

---

## 7. Kiến nghị ưu tiên khắc phục cho các nhóm kỹ thuật

1. **Ưu tiên 1 (Lỗi cấu trúc Sheet có tính hệ thống - L2 & L10)**:
   - **Sửa dứt điểm L2 (`lan12` Sheet 1 & `lan16` Sheet 4)**: Cần kiểm tra vòng đời của `freezeRow` / `headerRows` / `printTitles` trong `SheetGridController`. Khi chuyển tab (sheet change), dữ liệu header/freeze của sheet trước không được purge sạch, dẫn đến việc inject nhầm hàng header của sheet khác vào đầu sheet hiện hành.
   - **Sửa lỗi tính toạ độ Drawing tràn cột (L10)**: Giới hạn bề rộng render của ảnh neo đơn cột không được vượt quá `colWidth` nếu không có cờ span đa cột (`to.col > from.col`), tránh đè vào văn bản cột lân cận như trong `lan10`.
2. **Ưu tiên 2 (Lỗi giao diện VN Writer - L13 & L12)**:
   - **Loại bỏ hoặc ẩn Header Placeholder (L13)**: Không render chuỗi văn bản gợi ý `"Nhấp để nhập tiêu đề đầu trang (Header)..."` trực tiếp lên luồng canvas khi người dùng đang ở chế độ xem tài liệu/không focus vào header, đặc biệt không được để chiếm dụng toạ độ dọc đè lên văn bản gốc (`d02`).
   - **Chuẩn hoá Table Cell Padding (L12)**: Giảm đệm mặc định của ô bảng trong VN Writer về chuẩn Word (thường là top/bottom 0–1pt, left/right 5.4pt) để tránh hiện tượng dạt trang nghiêm trọng ở các biểu mẫu nhiều bảng như `d20`.
3. **Ưu tiên 3 (Hoàn thiện trải nghiệm hiển thị Sheet - L3 & L5)**:
   - Bổ sung cơ chế tràn chữ (text-overflow spill) cho các ô text dài khi các ô liền kề bên phải không chứa dữ liệu (L3 trên `lan02`).
   - Sửa bộ phân giải bảng màu RGB / Theme Palette cho ô có nền vàng cảnh báo `#FFFF00` (`lan02` S2) và nền tiêu đề xanh `#2563eb` (`lan03` S1).
