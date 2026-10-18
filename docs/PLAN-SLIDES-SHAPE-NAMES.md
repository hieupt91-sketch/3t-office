# Kế hoạch: tên hình và Ngăn chọn đầy đủ trong VN Slides (đổi tên, ẩn/hiện)

Trạng thái: **kế hoạch, chờ chủ duyệt** (AGENTS.md mục 6: đường mở/lưu và mô hình tài liệu). Chưa viết mã.
Mục checklist: PowerPoint, "Chọn: Chọn đối tượng / Ngăn chọn (Selection Pane)" còn P vì thiếu đổi tên và ẩn/hiện từng đối tượng.

## 1. Hiện trạng (đã đọc mã)
- `adapters/libreoffice/slides/slides-adapter.js` `_shapeGeomAttrs` ghi `draw:name="${shape.id}"` — **tên hình trong tệp chính là mã định danh** của hình trong mô hình.
- Khi mở (`_restoreShapeId`) mã định danh được lấy lại từ `draw:name` (trừ tên bắt đầu `PlaceHolder`), nếu không có thì từ `draw:id` / `xml:id`.
- Hệ quả đã đo: (1) tên người dùng đặt không thể đi vào PPTX; (2) PowerPoint thấy tên hình là mã kiểu `ink-1792314159822-9xi4h` (đo bằng COM ngày 18/10); (3) tên hình thật của tệp PowerPoint mở vào ("Rectangle 5", "Content Placeholder 2") bị dùng làm mã định danh.
- Ngăn chọn dùng chung (`platform/ui-kit/selection-pane.js`) đã có chọn, đổi thứ tự lớp; mô hình hình đã có trường `name` (hiện chỉ dùng để hiển thị).

## 2. Đề xuất
1. **Tách hai khái niệm**: `shape.id` (mã nội bộ, ổn định) và `shape.name` (tên hiển thị người dùng sửa được).
2. Lưu: `draw:id` / `xml:id` = mã định danh đã sanitize (đã có), `draw:name` = `shape.name` (nếu trống thì dùng tên mặc định kiểu PowerPoint "Rectangle 3"). Thêm thuộc tính `vno:shape-id` để nhận lại mã khi mở tệp do VN Slides lưu (tránh phụ thuộc `draw:name`).
3. Mở: nếu có `vno:shape-id` thì dùng làm `id`, `draw:name` thành `name`; nếu tệp không có (do PowerPoint tạo) thì giữ cách cũ cho `id` (tương thích) và đặt `name = draw:name`.
4. Ẩn/hiện: trường `hidden` trên hình; render `display:none`, lưu thành thuộc tính ẩn của PPTX (cần đo LibreOffice có giữ không — nếu không thì vá trong `ooxml_zip_patch.py` thêm `hidden="1"` vào `p:cNvPr`, như đã làm cho `repeatCount` của media).
5. Giao diện Ngăn chọn: nhấp đúp tên hoặc F2 để đổi tên (ô nhập tại chỗ, Enter lưu, Esc hủy); nút con mắt ẩn/hiện; hoàn tác (`shape-format`).
6. Hướng dẫn sử dụng tiếng Việt + i18n VI/EN + cập nhật số lệnh trong `tests/unit/help-coverage.test.js` nếu thêm lệnh.

## 3. Rủi ro
- Hình cũ trong các tệp đã lưu bằng VN Slides có `draw:name` = mã; khi mở lại phải đọc đúng (không có `vno:shape-id`) và không hiện mã làm tên: nhận diện mã máy (có dạng `ink-…`, số dài) để đặt tên mặc định.
- Hoạt hình, kích hoạt (interactiveSeq), nhóm hình và morph đang tham chiếu hình qua `id`: không được đổi cách ghép nối; chạy lại toàn bộ bộ đo hoạt hình (COM) và bộ LAN Slides trước khi gộp.
- Khóa/hiện ẩn của hình trong nhóm: chỉ làm cho hình cấp ngoài ở bước đầu.

## 4. Kiểm thử bắt buộc
1. Đơn vị: khứ hồi FODP với tên có dấu, dấu nháy, thẻ HTML, trùng tên; tệp cũ không có `vno:shape-id`.
2. CDP trên app desktop: đổi tên bằng nhấp đúp và F2, ẩn/hiện bằng nút, hoàn tác, lưu PPTX, mở lại.
3. PowerPoint COM (ẩn, đúng PID): `Shape.Name` đúng tên đã đặt; `Shape.Visible` = 0 với hình ẩn; số hình không đổi.
4. Hồi quy: hoạt hình nhiều hiệu ứng, kích hoạt, nhóm, bảng, biểu đồ, bộ LAN Slides (số hình và tóm tắt trước/sau giống hệt), `npm test`, `pytest`, `i18n_parity`, `verify_checklist_evidence`.

## 5. Hoàn nguyên
Thay đổi nằm ở `slides-adapter.js` (xuất/nhập tên), một bản vá nhỏ trong `ooxml_zip_patch.py` và phần Ngăn chọn; có thể gỡ bằng cách bỏ `vno:shape-id` và trở lại ghi `draw:name = id`.

## 6. Câu hỏi cho chủ
1. Đồng ý tách `name` khỏi `id` trong đường lưu Slides (đổi `draw:name`)?
2. Ẩn/hiện chỉ áp cho hình cấp ngoài ở bước đầu, nhóm hình để sau — được không?
3. Thời điểm: làm ngay hay chờ Codex/agy quay lại (23–24/10) để làm theo phiếu nhỏ?
