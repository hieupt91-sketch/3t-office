# Báo cáo Kiểm tra Trực quan & Khắc phục Lỗi Hiển thị trên lan02 (UNC và Danh sách trả lương)

**Thời gian**: 17/09/2026  
**Agent thực hiện**: VN Office Lead Agent (agy)  
**Mục tiêu**: Thực hiện đúng nguyên tắc cốt lõi được giao: **"tự mở test kiểm tra trực quan, không kiểm tra qua code"**. Kiểm tra đối chiếu ảnh chụp hiển thị thật giữa Microsoft Excel 2016 và VN Sheet.

---

## 1. Phương pháp Kiểm tra Trực quan (Visual Inspection Pipeline)
- Không chỉ dựa vào các câu lệnh assert kiểm tra cú pháp hay thuộc tính OOXML.
- Mở file trực tiếp qua **Microsoft Excel 2016 COM** và xuất ảnh hiển thị độ phân giải thực.
- Mở file trực tiếp trên giao diện **VN Sheet (Playwright Edge Engine)** và chụp ảnh màn hình ứng dụng đang render.
- So sánh ảnh chụp cạnh nhau (Side-by-Side) trên từng Sheet:
  1. Sheet 1: `UNC`
  2. Sheet 2: `DANH SÁCH CHI LƯƠNG`

---

## 2. Các lỗi nghiêm trọng được phát hiện QUA KIỂM TRA MẮT (Visual Inspection)
Dù các unit test trước đó đều báo `PASS` và số lỗi giảm từ 16.370 xuống 8, khi mở ảnh render thực tế, Lead Agent đã phát hiện ngay 3 lỗi thị giác nghiêm trọng:

### Lỗi 1: Toàn bộ nền bảng tính Sheet 2 bị biến thành màu xám đậm (`#969696`)
- **Triệu chứng trực quan**: Trong ảnh Excel mở file Round-trip, toàn bộ nền các cột sau bảng (từ cột 9 đến 16384) bị phủ màu xám đen xì thay vì màu trắng tự nhiên.
- **Nguyên nhân cốt lõi**: Khi khôi phục các cột ẩn ngoài dải Z (S9), code cũ sao chép trực tiếp chỉ số `style="5"` từ XLSX gốc. Tuy nhiên trong file XLSX mới do LibreOffice tạo ra, chỉ số style `5` lại trỏ tới ô có `fillId="2"` (màu xám `#969696`). Khi Excel render HTML/màn hình, nó áp style xám này cho toàn bộ thẻ `body` của sheet.
- **Khắc phục**: Gán `style="0"` (style mặc định chuẩn không tô màu `fillId=0`) cho các dải cột ẩn khôi phục ngoài vùng dữ liệu. Nền trang tính đã trắng sạch, tinh khôi 100%.

### Lỗi 2: Mất ô gộp `G4:I4` trên sheet UNC
- **Triệu chứng trực quan**: Cụm chữ *"Bằng số (in figures):"* bị dồn lại một ô hẹp thay vì trải đều qua 3 cột G:I.
- **Nguyên nhân cốt lõi**: Hàm `optimize_fods_streaming` chỉ coi ô rỗng không có giá trị là "style-only" mà không kiểm tra thuộc tính cấu trúc `table:number-columns-spanned`. Khi thấy ô D4 rỗng, nó đã gộp và gắn `number-columns-repeated="3"`, làm lệch chỉ số cột khiến G4 bị tạo các merge chồng lấn xung đột (`D4:F4`, `E4:G4`, `F4:H4`, `G4:I4`). LibreOffice phát hiện xung đột đã tự động loại bỏ merge `G4:I4`.
- **Khắc phục**: Thêm điều kiện bảo vệ trong `_cell_has_content` và `_fods_cell_is_style_only` coi `number-columns-spanned`, `number-rows-spanned` và `covered-table-cell` là nội dung cấu trúc bất khả xâm phạm. Kết quả: `G4:I4` được khôi phục nguyên vẹn 100%.

### Lỗi 3: Cụm tiêu đề "PHẦN DÀNH CHO NGÂN HÀNG" (dòng 19) bị cắt cụt thành "PHẦN DÀ"
- **Triệu chứng trực quan**: Trên sheet UNC, dòng 19 trong file gốc có tiêu đề dài tràn tự nhiên qua các ô trống bên phải. Nhưng ở file round-trip, chữ bị cụt mất chỉ còn 8 ký tự đầu.
- **Nguyên nhân cốt lõi**: Ô A19 là rich text (có nhiều đoạn text định dạng khác nhau). Hàm `_normalizeRichTextCellFont` của `SheetAdapter` đã chuẩn hóa font weight về `"normal"` ở cấp ô nhưng không cập nhật lại `styleHashAtImport`. Khi lưu, cơ chế S8 thấy hash bị lệch nên tưởng người dùng đã sửa ô, từ đó không khôi phục `vno:xf="35"` gốc mà tạo style mới `s="29"` có viền/định dạng cản trở text overflow.
- **Khắc phục**: Cập nhật `item.style.styleHashAtImport = this._computeStyleHash(item.style)` ngay sau khi chuẩn hóa rich text. Kết quả: A19 giữ nguyên vẹn `s="110"` trùng khớp với các ô bên cạnh, dòng chữ *"PHẦN DÀNH CHO NGÂN HÀNG (For Bank use Only)"* hiển thị đầy đủ 100%.

---

## 3. Danh mục Ảnh chụp Kiểm tra Trực quan
Các ảnh đã được chụp và lưu trữ trong thư mục [docs/screenshots/](file:///E:/VN%20OFice/docs/screenshots/):
1. [visual_excel_orig_sheet1.png](file:///E:/VN%20OFice/docs/screenshots/visual_excel_orig_sheet1.png): Hiển thị gốc Sheet 1 (UNC) trên Microsoft Excel 2016.
2. [visual_excel_rt_sheet1.png](file:///E:/VN%20OFice/docs/screenshots/visual_excel_rt_sheet1.png): Hiển thị Round-trip Sheet 1 (UNC) trên Microsoft Excel 2016 sau khi fix.
3. [visual_excel_orig_sheet2.png](file:///E:/VN%20OFice/docs/screenshots/visual_excel_orig_sheet2.png): Hiển thị gốc Sheet 2 (DANH SÁCH CHI LƯƠNG) trên Microsoft Excel 2016.
4. [visual_excel_rt_sheet2.png](file:///E:/VN%20OFice/docs/screenshots/visual_excel_rt_sheet2.png): Hiển thị Round-trip Sheet 2 (DANH SÁCH CHI LƯƠNG) trên Microsoft Excel 2016 sau khi fix.
5. [visual_vnsheet_lan02_sheet1.png](file:///E:/VN%20OFice/docs/screenshots/visual_vnsheet_lan02_sheet1.png): Giao diện ứng dụng VN Sheet mở Sheet 1 (UNC).
6. [visual_vnsheet_lan02_sheet2.png](file:///E:/VN%20OFice/docs/screenshots/visual_vnsheet_lan02_sheet2.png): Giao diện ứng dụng VN Sheet mở Sheet 2 (DANH SÁCH CHI LƯƠNG).

---

## 4. Kết luận
Nguyên tắc **"kiểm tra trực quan bằng mắt, không dựa thuần vào code"** của bạn đã giúp cứu sống giao diện của ứng dụng và phát hiện được 3 lỗi chí mạng mà toàn bộ 129 test tự động trước đó không thể bắt được. Toàn bộ các bản sửa đã được kiểm chứng bằng mắt thực tế, chạy test toàn diện và merge sạch sẽ vào `main`.
