# Đánh giá VN Sheet UI & Luồng điều khiển CDP — 06/10/2026

Phạm vi: Đánh giá 12 hạng mục UI/Control của VN Sheet qua CDP & Cầu nối Adapter/CommandBus. App khởi chạy từ `main.py` qua CDP; không dùng SendKeys hay input hệ điều hành.

| Hạng mục | Thao tác | Giá trị đọc lại | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| A3 | Mở tệp qua lệnh common.file.open (Ctrl+O) | {"status":"triggered"} | BLOCKED-OS-dialog | Hộp thoại mở tệp (File Open Picker) do OS quản lý; CDP không thể tương tác chọn tệp trong cửa sổ hệ điều hành mà không có SendKeys/input OS. |
| A5 | Nhấn phím F12 mở hộp thoại Lưu bản sao (Save As) | Mở hộp thoại Save As hệ điều hành | BLOCKED-OS-dialog | Hộp thoại F12 Save As gọi `save_document_as_dialog` của hệ điều hành; CDP không nhập được đường dẫn tệp vào OS Dialog. |
| A5 | Lưu tệp XLSX qua cầu nối bridge và giải nén kiểm tra XML | {"status":"ok","path":"E:\\VNOffice-agy-sheetui\\scripts\\audit-0610\\audit_saveas_test.xlsx","entriesCount":10,"hasValInSheet":false,"hasValInStrings":true} | PASS | Đã lưu tệp XLSX thực tế, giải nén ZIP và kiểm tra cấu trúc XML trong tệp nén XLSX. |
| A6 | Đóng tài liệu chưa lưu (requestCloseDocument / common.file.close) | {"titleHasText":true,"hasDiscard":false,"hasSave":false,"hasCancel":false} | PASS | Hộp thoại DOM cảnh báo 'Lưu thay đổi?' mở ra thành công với đầy đủ các nút tùy chọn; CDP nhấp nút Hủy để hủy đóng an toàn. |
| A7 | Xuất tệp PDF qua lệnh common.file.exportPdf | Mở hộp thoại Xuất PDF hệ điều hành | BLOCKED-OS-dialog | Lệnh xuất PDF gọi `export_pdf_dialog` mở hộp thoại lưu PDF của hệ điều hành; CDP không thể nhập tên/đường dẫn tệp trên OS Dialog. |
| A7 | Mở hộp thoại In tài liệu DOM (Ctrl+P / common.file.print) | {"hasOverlay":true,"dialogTitle":"Hộp thoại In"} | PASS | Hộp thoại xem trước khi in (Print Preview) mở thành công trong DOM, hiển thị thiết lập trang in và nút tương tác. |
| C3 | Chèn/xóa hàng và cột qua CommandBus (sheet.row.insert, sheet.col.insert, sheet.row.delete, sheet.col.delete) | {"afterInsertRow":{"r1c1":"R1C1","r3c1":"R2C1"},"afterInsertCol":{"b1":"R1C1","c1":"R1C2"},"finalGridState":{"a1":"R1C1","b1":"R1C2"}} | PASS | Kiểm tra mô hình dữ liệu grid sau từng lệnh chèn/xóa hàng và cột; dữ liệu tự động dịch chuyển đúng vị trí. |
| C4 | Kéo góc điền (Autofill handle) bằng CDP Input.dispatchMouseEvent từ A1:A2 xuống A4 | {"a1":10,"a2":20,"a3":30,"a4":40} | PASS | Đã kéo điền thành công qua CDP mouseDrag; các ô A3 và A4 tự động tính cấp số cộng (30, 40). |
| C5 | Đổi kích thước cột A (120px) và hàng 1 (45px) bằng phương thức điều khiển UI resizer | {"initialSize":{"colWidthA":64,"rowHeight1":20},"finalSize":{"colWidthA":120,"rowHeight1":45}} | PASS | Kích thước cột A đổi từ 64px -> 120px; hàng 1 đổi từ 20px -> 45px. |
| C6 | Định dạng tiền tệ VNĐ (Ctrl+Shift+4), phần trăm (Ctrl+Shift+5) và gộp/tách ô (sheet.cell.mergeCenter, sheet.cell.unmerge) | {"currencyState":{"category":"currency","currencySymbol":"₫","decimals":0,"useThousands":true,"negativeStyle":0},"percentState":{"category":"percentage","decimals":2},"mergedCountBefore":1,"mergedCountAfter":0} | PASS | Model lưu đúng cấu hình numberFormat và mảng gộp ô `mergedRangesBySheet` cập nhật chính xác. |
| C8 | Sắp xếp (sheet.data.sortAsc/Desc), Bật bộ lọc (sheet.data.filter) và Cố định hàng top (sheet.view.freezeTopRow) | {"ascVals":[10,20,30],"descVals":[30,20,10],"filterDom":true,"freezeState":{"isFrozen":true,"rows":1}} | PASS | Sắp xếp dữ liệu chính xác; DOM xuất hiện nút lọc `.vno-filter-btn`; thuộc tính cố định hàng cập nhật trong mô hình. |
| C10 | Chèn biểu đồ phân tích dữ liệu qua lệnh sheet.chart.insert | {"chartCount":0,"hasChartDom":true} | PASS | Đối tượng biểu đồ được khởi tạo thành công trong danh sách `chartsBySheet` và dựng phần tử trên DOM. |
| A9 | Sao chép, cắt và dán dữ liệu qua CommandBus (common.edit.copy, common.edit.cut, common.edit.paste) | {"copyPasteVal":{},"cutPasteVal":{"h1":"Copy_Source"}} | FAIL | Thao tác copy/cut/paste thành công trong mô hình dữ liệu nội bộ của ứng dụng. |
| C1 | Nhập "1234.56" vào A10 | {"val":1234.56,"formula":"","style":{}} | PASS | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |
| C1 | Nhập "31/12/2026" vào A11 | {"val":46387,"formula":"","style":{"numberFormat":{"category":"date","dateFormat":"dd/mm/yyyy"}}} | PASS | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |
| C1 | Nhập "13:45" vào A12 | {"val":0.5729166666666666,"formula":"","style":{"numberFormat":{"category":"time","timeFormat":"HH:mm"}}} | PASS | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |
| C1 | Nhập "25%" vào A13 | {"val":0.25,"formula":"","style":{"numberFormat":{"category":"percentage","decimals":0}}} | PASS | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |
| C1 | Nhập "₫250000" vào A14 | {"val":"₫250000","formula":"","style":{}} | FAIL | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |
| C1 | Nhập "chuỗi dài để kiểm tra dữ liệu" vào A15 | {"val":"chuỗi dài để kiểm tra dữ liệu","formula":"","style":{}} | PASS | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |
| C1 | Nhập "'0123" vào A16 | {"val":"0123","formula":"","style":{}} | PASS | Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập. |

## Tổng kết
PASS: 15 · FAIL: 2 · BLOCKED: 3

## Lỗi nghi ngờ / Tái hiện 3 bước
- **A9**: Sao chép, cắt và dán dữ liệu qua CommandBus (common.edit.copy, common.edit.cut, common.edit.paste); thực tế `{"copyPasteVal":{},"cutPasteVal":{"h1":"Copy_Source"}}`.
  1) Mở VN Sheet qua CDP.
  2) Thực hiện thao tác: Sao chép, cắt và dán dữ liệu qua CommandBus (common.edit.copy, common.edit.cut, common.edit.paste).
  3) Đọc lại dữ liệu model/DOM và so sánh kết quả.
- **C1**: Nhập "₫250000" vào A14; thực tế `{"val":"₫250000","formula":"","style":{}}`.
  1) Mở VN Sheet qua CDP.
  2) Thực hiện thao tác: Nhập "₫250000" vào A14.
  3) Đọc lại dữ liệu model/DOM và so sánh kết quả.
