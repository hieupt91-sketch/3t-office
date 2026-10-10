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



## Nhóm 2 — Chèn

| Nút | Ngữ cảnh | Kỳ vọng PowerPoint | Thực tế | PASS/FAIL | Phím tắt | Ghi chú |
|---|---|---|---|---|---|---|
| Hộp văn bản | Chèn trên slide đầu, click canvas, nhập `RB-L2 text object` | Thêm textbox tại vị trí chọn, giữ chữ sau lưu/mở lại | Model tăng 1 đối tượng; chữ có trong model và sau khi adapter.save() + mở lại PPTX | PASS | NOT RUN | Đã xác nhận `sourceFilePath` khớp và nạp đủ 10 slide trước khi kiểm tra lại. |
| Hình khối | Chèn > Hình khối, click canvas | Thêm hình vào slide tại vị trí chọn | Model tăng 1 đối tượng `rect` sau click | PASS | NOT RUN | Tọa độ canvas được đo; loại và số shape đọc từ model. |
| Bảng | Chèn > Bảng, giữ mặc định 3×3, bấm Chèn | Thêm bảng có 3 hàng và 3 cột | Model có thêm `table`; giữ sau lưu và mở lại; slide XML có `graphicFrame` | PASS | NOT RUN | File đầu ra là bản sao trong profile audit. |
| Biểu đồ | Chèn > Biểu đồ, mặc định Cột, bấm Chèn | Đóng hộp thoại và thêm biểu đồ vào slide | Tái hiện ban đầu: exception `ReferenceError: numeric is not defined`, model không tăng và PPTX thiếu chart part. Sau sửa, model có `chart`, PPTX có `ppt/charts/chart1.xml`, mở lại giữ biểu đồ | PASS (sau sửa) | NOT RUN | Lỗi và sửa ở `apps/slides/slides-chart.js`; CDP cổng 56225, profile riêng. `slides-charts.playwright.mjs` NOT RUN: thiếu gói Playwright tại đường dẫn cấu hình. |
| Hình ảnh | Chèn > Hình ảnh | Chọn ảnh cục bộ và thêm vào slide | NOT RUN | BLOCKED | NOT RUN | Nút gọi hộp thoại native; CDP không điều khiển hộp thoại hệ điều hành, không dùng SendKeys/OS input. |


## Nhóm 3 — Thiết kế

| Nút | Ngữ cảnh | Kỳ vọng PowerPoint | Thực tế | PASS/FAIL | Phím tắt | Ghi chú |
|---|---|---|---|---|---|---|
| Chủ đề | Thiết kế > Chủ đề, mở gallery và chọn Terracotta Ấm Áp | Áp dụng palette/font của theme cho bài chiếu | `themeId` đổi từ `modern-blue` sang `corporate-red` trong model | PASS | NOT RUN | Gallery là hộp thoại; mục thiếu carousel trực tiếp đã có ở backlog U-L11. Chưa kiểm lưu/mở lại riêng theme gallery. |
| Định dạng nền | Thiết kế > Định dạng nền, chọn Gradient và Áp dụng trang này | Đổi nền slide đang chọn và giữ sau khi lưu/mở lại | Model chuyển `solid #ffffff` sang gradient; sau lưu/mở lại `background.type=gradient` | PASS | NOT RUN | Đã đọc model sau khi adapter.save() và sau khi app nạp lại đúng file. |
| Mẫu Slide Master | Thiết kế > Mẫu Slide Master; chọn Than Chì Hiện Đại và Áp dụng mẫu | Áp dụng theme/master và giữ đúng trạng thái sau PPTX roundtrip | Dialog mở, chọn được theme; trước lưu `themeId=minimal-dark`. Sau mở lại, background gradient/logo còn trong model nhưng `themeId=modern-blue` | FAIL | NOT RUN | Đã mở lại đúng `sourceFilePath`. Ghi lỗi U-L31; XML theme không có metadata `minimal-dark`. |

