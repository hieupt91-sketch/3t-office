# AUDIT-SLIDES-FUNCTIONAL-1010 — RB-L2

Nhánh `audit/slides-functional-codex`; fixture gốc `E:\VN OFice\file test\sample-3.pptx` được copy thành `E:\VNOffice-profiles\codex-rl2\fixtures\rb-l2-sample-copy.pptx`. App được mở bằng harness desktop qua CDP, profile `E:\VNOffice-profiles\codex-rl2`; mỗi phiên dùng cổng CDP tự cấp riêng. Kết luận thao tác chỉ ghi sau khi `adapter.sourceFilePath` khớp fixture và model đủ 10 slide. Các tệp đầu ra nằm ngoài repo.

## Nhóm 1 — Trang đầu: thao tác slide và bố cục

| Nút | Ngữ cảnh | Kỳ vọng PowerPoint | Thực tế | PASS/FAIL | Phím tắt | Ghi chú |
|---|---|---|---|---|---|---|
| Trang mới | Trang đầu, slide 1/10 được chọn | Thêm slide sau slide hiện tại, tăng số slide một | Click ribbon: 10 → 11, current index 0 → 1 | PASS | Ctrl+M cũng 10 → 11, index → 1 | Đo `canvas.slides.length` và `currentSlideIndex` trên desktop. |
| Nhân đôi | Trang đầu, slide mới đang chọn | Nhân bản slide và chọn bản mới | Click ribbon: 11 → 12, index 1 → 2 | PASS | Ctrl+D: 10 → 11 | Đo model trước/sau; kiểm phím tắt trên slide được chọn trong filmstrip. |
| Xóa trang | Trang đầu, slide mới đang chọn | Xóa slide đang chọn | Click ribbon: 12 → 11 | PASS | NOT RUN | Chưa kiểm hộp xác nhận với slide cuối cùng. |
| Bố cục | Trang đầu, slide 3 | Hiện gallery bố cục; áp dụng bố cục đã chọn cho slide | Hộp “Chọn Bố Cục Trang Chiếu” mở; chọn `title-only`, Áp dụng; số slide giữ 12 | PASS | NOT RUN | Đo số slide trước/sau. Chưa kiểm toàn bộ layout và ảnh hưởng nội dung. |
| Sắp xếp | Filmstrip, 12 slide | Kéo thumbnail đổi thứ tự, nội dung đi theo slide | Kéo thumbnail đầu xuống vị trí thứ hai; thứ tự title đổi từ `WEST COAST…` lên sau slide trống | PASS | NOT RUN | CDP mouse drag thật, đo mảng `canvas.slides`. |
| Font, cỡ chữ, B/I/U, màu, căn lề, danh sách, giãn dòng | Chưa kiểm từng định dạng trên văn bản được chọn | Định dạng văn bản được chọn và lưu lại đúng | NOT RUN | NOT RUN | Ctrl+B/I/U chưa kiểm | Sẽ tiếp tục ở nhóm Trang đầu; không suy ra PASS từ việc nút xuất hiện trên ribbon. |

