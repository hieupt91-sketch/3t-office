# Kế hoạch FIX-T13 — Word Count và matrix nút Writer

## Mục tiêu
Điều tra bằng Word COM trên tài liệu điều khiển để xác định quy tắc thống kê ký tự/từ, sửa `writer.review.wordCount` theo bằng chứng, đạt sai số ký tự có khoảng trắng ≤0,2% trên ít nhất 6/7 DOCX (không nới ngưỡng), xác nhận d24 là artifact nếu Word COM thực sự trả -2 cho tài liệu rỗng, và tái sinh `docs/DOC-BUTTON-MATRIX-1011.md` từ generator với trạng thái/ghi chú T11/T12 cùng các nút được yêu cầu.

## Khả năng hiện có
- `apps/writer/word-count.js` đếm innerText, phục hồi `<br>` trong đoạn có chữ, thêm marker danh sách và loại nội dung hình nổi.
- T11/T12 có bộ chạy desktop CDP corpus và Word COM batch; giữ nguyên, tái dùng làm đường cơ sở.
- `scripts/audit-0610/gen_doc_button_matrix.py` định nghĩa STATUS/NOTE và sinh matrix từ ribbon scan.

## Files/modules dự kiến
- Thêm probe chẩn đoán điều khiển Word COM và desktop CDP trong `scripts/audit-0610/word_parallel/` để cô lập khoảng trắng, danh sách, bảng, text frame, ngắt dòng, tab và field.
- Sửa phần tính ký tự/từ trong `apps/writer/word-count.js` nếu kết quả probe chỉ ra quy tắc tổng quát.
- Cập nhật kiểm thử unit hiện hữu trong `tests/unit/writer-word-count.test.js` chỉ để thể hiện quy tắc đã xác minh, không đổi expected nhằm che lỗi.
- Cập nhật mapping trong `scripts/audit-0610/gen_doc_button_matrix.py`, tái sinh `docs/DOC-BUTTON-MATRIX-1011.md` từ ribbon scan hiện có.
- Ghi kết quả/handoff trong `docs/AGENT-HANDOFF-FIX-T13-CODEX.md`.

## Phụ thuộc
Word desktop COM, app desktop qua CDP (`VNO_APP_ROOT` trỏ worktree này, profile riêng `E:\VNOffice-profiles\codex-ft13`), corpus `file test/landocx`, ribbon scan writer hiện có. Không cần dependency mới hay thay đổi Core.

## Rủi ro
Khác biệt giữa text DOM và Word stories (danh sách, bảng, text frame, field), trạng thái Word background/process cũ, và biến thể COM của tài liệu rỗng. Chỉ kill process do PID của app được launcher tạo; không dùng SendKeys/OS input. Mọi kết luận matrix cần bằng chứng từ kiểm tra trước đó hoặc phải ghi rõ khác có chủ ý/chưa đối chiếu kèm lý do.

## Kế hoạch kiểm tra
Chạy tài liệu điều khiển trên Word COM và desktop CDP; so 7 DOCX qua desktop app với Word COM, yêu cầu ít nhất 6/7 trong ngưỡng 0,2%; kiểm tra trạng thái d24 bằng tài liệu Word rỗng do Word tạo; chạy `npm test`, `python -m unittest discover -s tests`, batch DOCX bảy tệp, rà soát UTF-8 không BOM và `git diff --check` theo phiếu.

## Rollback
Các thay đổi mã được giới hạn trong word count Writer, unit test tương ứng và script sinh audit; hoàn tác theo commit riêng của từng bước FIX-T13. Không sửa fixtures hay nới kỳ vọng/ngưỡng để làm xanh.