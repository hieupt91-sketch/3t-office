# Kế hoạch FIX-T15 — Đối chiếu Writer với Word

## Objective
Hoàn tất các chênh lệch số từ còn lại theo Word COM; tạo bộ tài liệu điều khiển nhỏ để xác định cách Word tách token; xác định nguyên nhân d24 lỗi khi mở trên app desktop; đo và cập nhật trạng thái 5 nút còn chưa đối chiếu trong `docs/DOC-BUTTON-MATRIX-1011.md`.

## Current capability
- `apps/writer/word-count.js` đếm theo khoảng trắng, bổ sung token CJK và dùng metadata OOXML nguồn cho tài liệu chưa chỉnh sửa.
- Word COM đo corpus T13 cho thấy còn lệch d01 −16, d02 +2, d07 +2, d13 −3, d20 −1; d06 khớp.
- T14 đã tạo WordArt DrawingML DOCX và đo một số trạng thái zoom/xem trước; chưa đọc đối chứng Word COM.
- d24 từng làm WebView desktop ngắt kết nối khi mở; lần kiểm tra trước ghi nhận Word COM trả số đếm bất thường cho fixture.
- Matrix hiện còn 5 hàng CHƯA ĐỐI CHIẾU: Chữ nghệ thuật, In tài liệu, Xem trước khi in, Chiều rộng trang, Đặt lại zoom.

## Files/modules
- `apps/writer/word-count.js`: chỉ sửa quy tắc token khi corpus điều khiển chứng minh được quy tắc Word.
- `tests/unit/writer-word-count.test.js`: thêm regression cases tương ứng nếu quy tắc sản phẩm đổi.
- `scripts/audit-0610/word_parallel/`: tạo/điều chỉnh Word COM control và desktop CDP probes; dùng profile riêng và chỉ dừng tiến trình do task khởi chạy.
- `scripts/audit-0610/gen_doc_button_matrix.py`, `docs/DOC-BUTTON-MATRIX-1011.md`: chỉ cập nhật sau khi có phép đo Word COM và desktop CDP.
- `docs/tickets-0710/HANDOFF-FIX-T15-CODEX.md`: ghi handoff cuối theo template chuẩn.

## Dependencies
Dùng Microsoft Word COM cục bộ và app desktop qua CDP. Không thêm dependency; không gửi tài liệu lên dịch vụ ngoài. Tài liệu điều khiển được tạo trong profile riêng `VNO_CDP_LOCALAPPDATA` đã chỉ định.

## Risks
- Word COM có thể bị chặn bởi phiên WINWORD cũ; trước khi dùng phải liệt kê tiến trình và chỉ đóng tiến trình ẩn cũ không thuộc người dùng/task theo phiếu.
- d24 có thể gây crash ở adapter/LibreOffice import hoặc lỗi dữ liệu đầu vào; cần lấy log/trace để khoanh vùng trước khi sửa.
- Các nút In và WordArt có thể ghi/xuất tài liệu. Không thay đổi đường lưu/export hay file-format semantics nếu đối chiếu chỉ cần đo; mọi phát hiện đòi sửa semantics sẽ được cô lập trong scope hiện tại trước khi triển khai.

## Test plan
- Word COM: tài liệu mới nhỏ cho token có gạch nối, dấu câu/số, email, URL, số thứ tự đầu dòng, ký hiệu, ngoặc, dấu nháy, viết tắt, tab, NBSP, ngắt dòng, field số trang; đo từng trường hợp.
- Word COM + app desktop CDP: corpus DOCX d01, d02, d06, d07, d13, d20, d24; mục tiêu sai số từ 0 hoặc tối đa 0,05% mỗi file.
- App desktop CDP: đo hành vi 5 nút bằng chuột/phím qua CDP; Word COM đọc `Shape.Type`/`TextEffect`, `ActiveWindow.View.Zoom.PageFit`/`Percentage`, số trang và kích thước PDF.
- Khi kết thúc: `npm test`, `python -m unittest discover -s tests`, quét mã hóa UTF-8/no-BOM và các batch Slides nêu trong phiếu nếu scripts/assets có sẵn; ghi đúng PASS/FAIL/NOT RUN/BLOCKED.

## Rollback
Từng thay đổi được commit riêng để có thể revert commit của bước đó. Không reset/rebase/clean hoặc xóa tài liệu/fixture. Dừng sửa sản phẩm nếu không tái hiện được nguyên nhân d24 hay nếu cần thay semantics lưu/xuất ngoài phạm vi đã nêu.
