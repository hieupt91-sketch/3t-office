# Đối chiếu kích thước trang chiếu tùy chỉnh (VN Slides) với PowerPoint 2016 — 17/10/2026

Kịch bản: Thiết kế > Cỡ trang chiếu > mục Tùy chỉnh, nhập 29,7 × 21 cm (A4 ngang). Kiểm giao diện bằng bàn phím và chuột thật qua CDP (`tests/live/cdp/slides-slide-size.desktop.mjs` 10/10 PASS), lưu thành PPTX, mở bằng PowerPoint 2016 qua COM chỉ-đọc (`scripts/audit-0610/ppt_pagesetup_readback.ps1`), rồi mở lại qua LibreOffice → FODP → bộ đọc của VN Slides. Logic thuần: `tests/unit/slide-size.test.js`.

| Hạng mục | Kết quả |
|---|---|
| Nhập hợp lệ (dấu phẩy hoặc dấu chấm thập phân) | 29,7 × 21 cm áp dụng thành 842 × 595 px (1 px = 1 pt với tài liệu mới); khung trang chiếu đổi theo; hộp thoại đóng. |
| Nhập sai (chữ) và ngoài khoảng 2,54–142,24 cm | Hộp thoại báo lỗi bằng tiếng Việt ngay, không đổi kích thước (CDP). |
| Hoàn tác / làm lại | Một bước, trả về 960 × 540 rồi 842 × 595 (CDP). |
| PowerPoint 2016 đọc tệp đã lưu | `SlideWidth` = 842 pt, `SlideHeight` = 595 pt (29,7 × 20,99 cm); `SlideSize` = 7 (`ppSlideSizeCustom`), khớp. |
| Mở lại trong VN Slides | Đọc đúng 29,71 × 20,98 cm (sai số làm tròn px). |

Hạn chế đã biết: sau khi mở lại, nhãn cỡ được suy ra là "Màn hình rộng" (kích thước px vẫn chính xác); chưa có chế độ "Vừa khít / Giữ tỷ lệ" khi đổi cỡ như hộp thoại gốc, các hình luôn được co theo khung mới.