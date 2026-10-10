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
| Ctrl+B / In đậm | Hộp tiêu đề nhập từ PPTX, bôi chọn từ `ROAD ` | Bật đậm cho phần chữ được chọn | HTML model có `<b>ROAD </b>` sau Ctrl+B | PASS | Ctrl+B | CDP bàn phím desktop; thao tác trong vùng contenteditable. |
| Ctrl+I / In nghiêng | Hộp tiêu đề nhập từ PPTX, bôi chọn từ `ROAD ` | Bật nghiêng cho phần chữ được chọn | HTML model có `<i>ROAD </i>` sau Ctrl+I | PASS | Ctrl+I | Phiên độc lập từ fixture gốc. |
| Ctrl+U / Gạch chân | Hộp tiêu đề nhập từ PPTX, bôi chọn từ `ROAD ` | Gạch chân phần chữ được chọn | HTML model có `<u>ROAD </u>` sau Ctrl+U | PASS | Ctrl+U | Phiên độc lập từ fixture gốc. |
| Cỡ chữ, màu chữ/nền, căn lề, danh sách, giãn dòng | Chưa kiểm hiệu quả trên vùng văn bản được chọn | Cập nhật định dạng trong model và lưu PPTX | NOT RUN | NOT RUN | Chưa đo đủ | Chỉ xác nhận nút tồn tại không được tính là kết quả. |


