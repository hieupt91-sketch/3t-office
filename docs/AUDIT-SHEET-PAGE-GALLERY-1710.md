# AUDIT — Sheet: thư viện nhanh Bố trí trang (Căn lề / Hướng giấy / Khổ giấy / Chiều rộng / Chiều cao) — 17/10

Chuẩn: Excel 2016 (COM, đọc `Worksheet.PageSetup` sau khi mở tệp VN Sheet đã lưu). Đọc lại bằng `scripts/audit-0610/excel_pagesetup_readback.ps1`.

## Phát hiện
- Nhóm Thiết lập trang chỉ có nút mở hộp thoại; Excel có danh sách chọn nhanh. Đã thêm danh sách Căn lề (Thường/Rộng/Hẹp/Tùy chỉnh), Hướng giấy (Dọc/Ngang), Khổ giấy (Letter/Legal/A3/A4/A5/Thêm…), và nhóm Vừa trang có Chiều rộng, Chiều cao (Tự động, 1–5 trang, Thêm trang…).
- Giá trị lề đặt sẵn theo Excel: Thường 1,91/1,91/1,78/1,78 cm (đầu/cuối trang 0,76); Rộng 2,54 cm mọi cạnh (1,27); Hẹp 1,91/1,91/0,64/0,64 (0,76). Bản cũ trong mã chết của hộp thoại cũ dùng giá trị kiểu Word (Rộng 5,08 cm trái/phải) nên không dùng lại.
- Excel: đặt cả Chiều rộng và Chiều cao về Tự động thì quay về thu phóng %; VN làm đúng như vậy.

## Đối chiếu Excel 2016 thật (tệp lưu từ ứng dụng: Hẹp + Ngang + A3 + Chiều rộng 1 trang)
| Thuộc tính | Excel 2016 đọc được | Mong đợi | Kết luận |
|---|---|---|---|
| Lề trên/dưới | 1,91 / 1,91 cm | 1,91 | ✅ |
| Lề trái/phải | 0,64 / 0,64 cm | 0,64 | ✅ |
| Đầu/cuối trang | 0,76 / 0,76 cm | 0,76 | ✅ |
| Orientation | 2 (xlLandscape) | Ngang | ✅ |
| PaperSize | 8 (xlPaperA3) | A3 | ✅ |
| Zoom / FitToPagesWide / FitToPagesTall | False / 1 / False (tự động) | 1 × tự động | ✅ |

## Kiểm chứng đã chạy
- `npm test`: 3612/3612 PASS.
- CDP desktop `tests/live/cdp/sheet-page-gallery.desktop.mjs`: 17/17 PASS (chuột thật chọn từng mục, hoàn tác, mở hộp thoại tùy chỉnh, lưu XLSX).
- Giá trị lề Thường/Rộng/Hẹp lấy từ số liệu công bố của Excel 2016 (không đo được qua COM vì `ExecuteMso` không chạy được trên Excel ẩn); phần lưu/đọc lại đã đối chiếu bằng Excel thật như bảng trên.