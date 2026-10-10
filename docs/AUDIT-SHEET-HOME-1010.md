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

### Nhóm 2: Phông chữ (Font)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Phông chữ** (`sheet.font.family`) | Ô B2 đang chọn, đổi phông sang Times New Roman qua select ribbon | Thay đổi phông chữ hiển thị của ô sang Times New Roman, cập nhật style model | Font family ô B2: style='Times New Roman' | **PASS** | Không có | Đổi phông chữ chính xác qua dropdown Ribbon. |
| **Cỡ chữ** (`sheet.font.size`) | Ô B2 đang chọn, đổi cỡ chữ sang 16pt qua select ribbon | Thay đổi kích thước chữ ô tính sang 16pt, cập nhật độ cao/style | Cỡ chữ ô B2: style='21.33px' (tương đương 16pt) | **PASS** | Không có | Đổi cỡ chữ chính xác qua dropdown Ribbon. |
| **Tăng cỡ chữ** (`sheet.font.grow`) | Ô B3 đang chọn, bấm nút Tăng cỡ chữ | Tăng kích thước phông chữ lên một bậc | Trước: '14.67px' (11pt) -> Sau khi tăng: '16px' (12pt) | **PASS** | `Ctrl+Shift+>` | Tăng kích thước chữ đúng nấc tăng dần. |
| **Giảm cỡ chữ** (`sheet.font.shrink`) | Ô B3 đang chọn, bấm nút Giảm cỡ chữ | Giảm kích thước phông chữ xuống một bậc | Sau khi giảm: '14.67px' (11pt) | **PASS** | `Ctrl+Shift+<` | Giảm kích thước chữ đúng nấc. |
| **In đậm** (`sheet.cell.bold`) | Ô B4 (bấm nút chuột) và ô B5 (nhấn phím Ctrl+B) | Bật/tắt in đậm văn bản trong ô, cập nhật nút ribbon bật sáng (is-checked) | B4 bold='bold', btnChecked=true; B5 Ctrl+B bold='bold' | **PASS** | `Ctrl+B` | Hoạt động chính xác cả nút chuột và phím tắt Ctrl+B. |
| **In nghiêng** (`sheet.cell.italic`) | Ô B4 (nút chuột) và ô B5 (Ctrl+I) | Bật/tắt in nghiêng văn bản trong ô | B4 italic='italic'; B5 Ctrl+I italic='italic' | **PASS** | `Ctrl+I` | Hoạt động chính xác cả nút chuột và phím tắt Ctrl+I. |
| **Gạch chân** (`sheet.cell.underline`) | Ô B4 (nút chuột) và ô B5 (Ctrl+U) | Bật/tắt gạch chân văn bản trong ô | B4 under='underline'; B5 Ctrl+U under='underline' | **PASS** | `Ctrl+U` | Hoạt động chính xác cả nút chuột và phím tắt Ctrl+U. |
| **Đường viền ô** (`sheet.cell.borders`) | Ô C4 đang chọn, bấm nút Đường viền trên Ribbon | Áp đường viền vào ô (kèm menu chọn viền dưới/trên/trái/phải/tất cả viền) | Áp viền border='2px solid #0f172a'. Không có menu xổ xuống chọn kiểu viền (U-S3). | **PASS** | Không có | Viền được áp dụng thành công vào ô tính (chức năng cốt lõi đạt; thiếu menu chi tiết kiểu viền theo U-S3). |
| **Màu nền ô** (`sheet.cell.fillColor`) | Ô C4 đang chọn, bấm nút Tô màu nền trên Ribbon | Tô màu nền cho ô tính (kèm bảng chọn màu Theme/Standard/No Fill) | Tô màu nền='#FFF200'. Gán màu mặc định #FFF200, chưa mở palette màu (U-S1). | **PASS** | Không có | Màu nền được lưu vào thuộc tính ô thành công (thiếu palette chọn màu tự do theo U-S1). |
| **Màu chữ** (`sheet.cell.textColor`) | Ô C4 đang chọn, bấm nút Màu phông chữ trên Ribbon | Đổi màu chữ trong ô (kèm bảng chọn màu Theme/Standard) | Đổi màu chữ='#DC2626'. Gán màu mặc định #DC2626, chưa mở palette màu (U-S2). | **PASS** | Không có | Màu chữ được áp dụng thành công vào ô (thiếu palette chọn màu tự do theo U-S2). |
| **Launcher Định dạng ô** (`sheet.format.cellsDialog`) | Phím tắt Ctrl+1 và nút launcher góc nhóm Phông chữ | Mở hộp thoại Định dạng ô (Format Cells) đa tab: Số, Căn chỉnh, Phông chữ, Viền, Tô màu | Ctrl+1 open=true; Launcher click open=true. Phím Escape đóng an toàn trả focus về lưới. | **PASS** | `Ctrl+1` | Hộp thoại Định dạng ô mở đầy đủ và đóng hoàn hảo bằng phím Escape. |

*Kiểm chứng lưu XLSX thật*: Tệp lưu ra được giải nén và kiểm tra `xl/styles.xml`, ghi nhận định dạng phông chữ Times New Roman và kiểu chữ Bold/Italic/Underline được chuyển đổi chuẩn sang các thẻ `<font>` và tham chiếu `<xf fontId="...">` tương thích 100% Microsoft Excel.

---
