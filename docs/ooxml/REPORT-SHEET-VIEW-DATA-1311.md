# Báo cáo: dữ liệu hiển thị cho màn hình đầu (`sheet.layout`, `workbook.styles`) — 13/11

## Vì sao
Kế hoạch S3 của muse (`P1-S3-PLAN.md`) định đọc `styles.xml` và `sheetN.xml` bằng Python từ ZIP để lấy định dạng, ô gộp, độ rộng cột, freeze panes. Với sheet lớn (23 MB XML), đọc cả sheet bằng Python phá mục tiêu màn hình đầu nhanh; bridge lại chưa có lệnh nào trả các dữ liệu này (`sheet.readRows` chỉ có giá trị, `numberFormat`, chỉ số `style`).

## Thêm (không đổi lệnh cũ)
- `sheet.layout`: cột, ô gộp, freeze panes, vùng lọc, vùng dùng, mặc định, thuộc tính hàng trong cửa sổ. Chỉ đọc đầu và đuôi sheet.
- `workbook.styles`: phông, màu (giải theme+tint, indexed → RGB), nền, viền, căn lề, định dạng số theo chỉ số `style`.
- Giao thức: `ENGINE-PROTOCOL.md` §4.1d và §4.1e.

## Kiểm chứng
- `SheetLayoutTests` (5 test): bố cục khớp đường DOM (ô gộp, vùng lọc, dimension, độ rộng 40 cột đầu, chiều cao mọi hàng) trên 12 fixture; cửa sổ chỉ trả hàng trong cửa sổ và không nạp DOM sheet; freeze panes đọc lại đúng sau khi đặt; chi tiết định dạng khớp `StyleSheet.info` (số định dạng, đậm, nghiêng, nền) trên mọi xf của 12 fixture; màu theme/tint/indexed.
- Chạy thật qua `ooxml-engine`: XLSX 9,7 MB `sheet.layout` 129 ms (lần đầu), `workbook.styles` < 1 ms; fixture `rich-excel` trả đúng phông Calibri 11, theme 1 → 000000, hyperlink theme 10 → 0000EE, nền DDEBF7, ô gộp A8:C8, freeze 1 hàng.

## Giới hạn
- Làm tròn tint lệch Excel vài đơn vị mỗi kênh; chưa kiểm với Excel thật.
- Chưa có: định dạng có điều kiện, dữ liệu validation, hình/biểu đồ, độ rộng cột tự động theo nội dung (Excel lưu sẵn trong `width`), kiểu chữ theme (`scheme`), cellStyleXfs kế thừa khi `applyX=0` (hiếm).
- Chỉ đo Linux, tệp tổng hợp.
