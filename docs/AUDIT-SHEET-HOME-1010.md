# BÁO CÁO KIỂM ĐỊNH CHỨC NĂNG TAB TRANG ĐẦU (SHEET HOME RIBBON)

**Thời gian thực hiện**: 10/10/2026  
**Nhánh Git**: `audit/sheet-home-functional-agy`  
**Phiên làm việc & Nhiệm vụ**: `docs/tickets-0710/TICKET-RB-S1.md`  
**Môi trường kiểm thử**: Windows 11 Desktop, WebView2 CDP trực tiếp (`node --experimental-websocket`), LibreOffice Core nền tảng.  
**Quy cách đối chiếu**: Đối chiếu theo chuẩn hành vi Microsoft Excel thực tế bằng tri thức đặc tả Excel + đo số thuộc tính ô (DOM computed style, cellsData model, number format) + lưu tệp XLSX thật và giải nén kiểm tra cấu trúc XML (`xl/worksheets/sheet1.xml`, `xl/styles.xml`, `xl/sharedStrings.xml`).

---

## 1. BẢNG TỔNG HỢP KIỂM ĐỊNH THEO 7 NHÓM CHỨC NĂNG (BẢNG 7 CỘT CHUẨN)

### Nhóm 1: Bảng nhớ tạm (Clipboard)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Sao chép** (`common.edit.copy`) | Ô văn bản B2 ("Nguyễn Văn A") và ô số C2 (1234.5) | Sao chép giá trị và định dạng ô vào clipboard; dán sang ô đích đúng nguyên bản | Ctrl+C/V: E10 nhận 'Nguyễn Văn A'; Nút chuột Ribbon: E11 nhận '1234.5' | **PASS** | `Ctrl+C` | Hoạt động chính xác cả phím tắt Ctrl+C và nút bấm chuột trên Ribbon. |
| **Cắt** (`common.edit.cut`) | Ô văn bản B3 ("Trần Thị B") và ô số C3 (5678.9) chuyển sang E12, E13 | Ô nguồn bị xóa trắng sau khi dán vào ô đích; ô đích nhận đầy đủ giá trị nguồn | B3 làm trống (rỗng) -> E12 nhận 'Trần Thị B'; C3 làm trống -> E13 nhận '5678.9' | **PASS** | `Ctrl+X` | Đúng chuẩn Excel: dữ liệu di chuyển sang ô đích và ô nguồn được giải phóng. |
| **Dán** (`common.edit.paste`) | Dán nội dung từ clipboard vào ô đơn và dải ô đích | Dán đầy đủ dữ liệu và định dạng vào ô đang chọn | Hoạt động đồng bộ qua phím tắt Ctrl+V và nút lớn Dán trên Ribbon | **PASS** | `Ctrl+V` | Nút Dán lớn (large) trên nhóm Bảng nhớ tạm hoạt động tốt. |
| **Dán đặc biệt** (`sheet.edit.pasteSpecial`) | Sao chép ô công thức F2, dán đặc biệt vào E14 | Mở hộp thoại Dán đặc biệt cho phép chọn: Tất cả, Công thức, Giá trị, Định dạng | Mở hộp thoại Dán đặc biệt (.vno-dialog-overlay) đầy đủ tùy chọn chế độ dán | **PASS** | `Ctrl+Alt+V` | Mở hộp thoại chuẩn cả khi bấm nút Ribbon và nhấn Ctrl+Alt+V. |
| **Sao chép định dạng** (`sheet.edit.formatPainter`) | Ô nguồn A1 (nền vàng, chữ đậm) quét sang ô đích E1 ("Ngày") | Ô đích E1 nhận định dạng nền vàng và chữ đậm, giữ nguyên giá trị text "Ngày" | Nút bật active (`is-checked`); E1 nhận font đậm 700 và màu nền áp dụng; text 'Ngày' giữ nguyên | **PASS** | Không có | Hoạt động đúng mô hình Format Painter của Office. |

*Kiểm chứng lưu XLSX thật*: Tệp `test_sheet_work.xlsx` được lưu thành công qua bridge; giải nén ZIP kiểm tra XML `xl/worksheets/sheet1.xml` và `xl/sharedStrings.xml` ghi nhận đầy đủ các ô được sao chép/cắt dán mới (E10, E11, E12, E13) mà không gây hỏng cấu trúc tệp.

---
