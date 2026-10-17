# Đối chiếu thao tác bảng trên trang chiếu (VN Slides) với PowerPoint 2016 — 17/10/2026

Bảng thử: 4×4, ô A1…D4. Đối chiếu: lưu thành PPTX từ app desktop (CDP), mở bằng PowerPoint 2016 qua COM chỉ-đọc (`scripts/audit-0610/ppt_table_readback.ps1`), đọc số hàng/cột, nội dung và hình học từng ô; mở lại bằng LibreOffice → FODP → bộ đọc của VN Slides.
Kiểm giao diện: `tests/live/cdp/slides-table-ops.desktop.mjs` 17/17 PASS bằng chuột thật (nhấp ô, Shift+nhấp); logic thuần: `tests/unit/slide-table-ops.test.js` 13/13 PASS.

| Lệnh | Kết quả |
|---|---|
| `slides.table.insertRowAbove` / `slides.table.insertRowBelow` | Chèn hàng trống trên/dưới hàng chứa con trỏ; hoàn tác/làm lại một bước (CDP 17/17); vùng gộp qua hàng chèn tự dài ra. |
| `slides.table.insertColLeft` / `slides.table.insertColRight` | Chèn cột trống trái/phải; hoàn tác/làm lại một bước; vùng gộp qua cột chèn tự dài ra. |
| `slides.table.deleteRow` / `slides.table.deleteCol` / `slides.table.deleteTable` | Xóa hàng/cột chứa con trỏ, xóa cả bảng; không xóa hàng/cột duy nhất (báo rõ); chữ ô neo không mất khi xóa hàng đầu của vùng gộp. |
| `slides.table.mergeCells` | Gộp ô: lưu PPTX rồi PowerPoint 2016 đọc đúng hai vùng gộp r1 c1–4 và r2–3 c2–3 (theo hình học ô); chữ các ô nối bằng ngắt đoạn vào ô trên-trái như PowerPoint; mở lại PPTX trong VN Slides đọc đúng merges. |
| `slides.table.splitCell` | Tách ô đã gộp, chữ ở lại ô trên-trái; hoàn tác một bước. |

Hạn chế đã biết: chưa chỉnh được chiều cao hàng / chiều rộng cột chính xác (mục riêng trong bảng điểm); thuộc tính `Cell.Merged` của PowerPoint COM luôn trả False nên vùng gộp được suy ra từ hình học ô.