# Đối chiếu chia cột văn bản trong khung chữ (VN Slides) với PowerPoint 2016 — 17/10/2026

Kịch bản: chọn hộp văn bản, Trang đầu > Đoạn văn > Cột > Hai cột. Kiểm giao diện qua CDP (`tests/live/cdp/slides-text-columns.desktop.mjs` 9/9 PASS), lưu thành PPTX, mở bằng PowerPoint 2016 qua COM chỉ-đọc (`scripts/audit-0610/ppt_columns_readback.ps1`, đọc `TextFrame2.Column`), rồi mở lại qua LibreOffice → FODP → bộ đọc của VN Slides.

| Hạng mục | Kết quả |
|---|---|
| Chia một/hai/ba cột cho khung chữ đang chọn | Canvas vẽ cột bằng CSS (`column-count`, khoảng cách 18 px); đổi qua lại, hoàn tác và làm lại một bước (CDP). |
| Ghi FODP và PPTX | `<style:columns fo:column-count fo:column-gap>`; LibreOffice xuất `numCol` và `spcCol` sang PPTX (không cần hậu xử lý). |
| PowerPoint 2016 đọc tệp đã lưu | `TextFrame2.Column.Number` = 2, `Spacing` = 18 pt cho đúng hộp chữ; các khung khác = 1. |
| Mở lại trong VN Slides | Khung đọc lại với `textColumns` = 2, khoảng cách 24 px (= 18 pt); cột hiện lại trên canvas. |
| Test đơn vị | `tests/unit/slide-text-columns.test.js` 5/5 PASS (ghi, đọc, tệp có hàng `style:column` con, nhiều khung khác số cột, khung một cột giữ kiểu chung). |

Hạn chế đã biết: chỉ có 1–3 cột và khoảng cách cố định 18 px khi tạo mới (khoảng cách đọc từ tệp được giữ nguyên); chưa có hộp thoại chỉnh số cột/khoảng cách tùy ý như PowerPoint ("Tùy chọn cột khác").