# Kế hoạch FIX-T14 — Word Count và đối chiếu nút Writer

## Mục tiêu
Đưa số từ Writer sát Word COM trên bộ DOCX điều khiển/corpus; xác minh mở cửa sổ Writer thứ hai, WordArt, xem trước khi in, vừa chiều rộng trang và đặt lại zoom; ghi bằng chứng vào ma trận nút Writer.

## Khả năng hiện có
- `apps/writer/word-count.js` tạo luồng văn bản từ DOM và OOXML; T13 đã khớp ký tự nhưng còn lệch số từ ở d01/d02/d07/d13/d20.
- `apps/writer/writer-view-controller.js` có zoom và vừa chiều rộng; lệnh cửa sổ mới đã gọi `shell.requestNewDocumentWindow` khi khả dụng.
- Writer có preview tích hợp và WordArt HTML/Fontwork; cần đo hành vi/đầu ra thực tế trước khi phân loại ma trận.
- `scripts/audit-0610/gen_doc_button_matrix.py` sinh báo cáo từ ribbon scan.

## Phạm vi tệp/module dự kiến
- Chẩn đoán Word COM và CDP tại `scripts/audit-0610/word_parallel/`; sửa quy tắc từ tại `apps/writer/word-count.js` nếu có bằng chứng tổng quát.
- Kiểm tra/hàn gắn luồng cửa sổ mới trong `apps/writer/writer-view-controller.js`, app shell và cầu Python hiện có.
- Kiểm tra WordArt và xem trước/zoom; chỉ thay đổi DOCX/ODF serialization nếu cần biểu diễn WordArt native. Nếu thay đổi, giới hạn adapter hiện có và thêm kiểm tra round-trip.
- Cập nhật hướng dẫn Writer tiếng Việt trong app nếu có hành vi mới; cập nhật generator và `docs/DOC-BUTTON-MATRIX-1011.md` bằng trạng thái có chứng cứ.
- Ghi kết quả vào `docs/tickets-0710/HANDOFF-FIX-T14-CODEX.md`.

## Phụ thuộc
Microsoft Word desktop qua COM, app Writer desktop qua CDP với `VNO_APP_ROOT` trỏ worktree này và profile riêng `E:\VNOffice-profiles\codex-ft14`, các DOCX landocx đã có. Không thêm dependency.

## Rủi ro
Word đếm token có thể phụ thuộc từng loại trường/Unicode; UI CDP không được giả mạo bằng DOM-only thao tác; cửa sổ native phụ thuộc bridge Python; thay đổi WordArt serialization có thể ảnh hưởng DOCX round-trip. Không sửa fixture/expected để tạo kết quả đạt.

## Kế hoạch kiểm tra
Tạo tài liệu điều khiển bằng Word COM và so sánh COM với Word Count trong app; kiểm tra d01/d02/d06/d07/d13/d20/d24; thao tác app desktop qua CDP chuột/phím thật; đọc thuộc tính Word COM cho cửa sổ, WordArt, số trang/kích thước PDF và zoom. Cuối đợt chạy các lệnh test, batch DOCX, kiểm tra mã hóa/whitespace được nêu trong FIX-T14 và ghi chính xác PASS/FAIL/NOT RUN/BLOCKED.

## Rollback
Mỗi bước có commit riêng; rollback bằng revert commit tương ứng. Không dùng reset/rebase/force và không sửa dữ liệu mẫu.
