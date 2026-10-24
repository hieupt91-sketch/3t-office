# VN Office Mobile/iPadOS — Test Specification

## Mục tiêu

Xác nhận người dùng có thể làm việc bằng iPhone và iPad như một người dùng văn phòng thực tế. Không coi việc app mở được hoặc gõ được một dòng là đạt. Mỗi chức năng chỉ PASS sau khi thao tác, quan sát kết quả, Undo/Redo (nếu áp dụng), và kiểm tra trạng thái sau khi rời màn hình hoặc lưu lại.

## Phạm vi

- VN Writer: soạn thảo, chọn, định dạng, ribbon, tìm kiếm, đối tượng, undo/redo, mở/lưu/xuất.
- VN Sheet: ô/range, số/ngày, công thức, fill, hàng/cột, sheet, sort/filter, undo/redo, mở/lưu/xuất.
- VN Slides: slide, textbox, hình/shape, bố cục, căn chỉnh, thứ tự lớp, trình chiếu, mở/lưu/xuất.
- Mobile UX: touch target, bàn phím ảo, xoay màn hình, cuộn ngang ribbon, trạng thái lỗi, không chồng lớp.
- Offline: khởi động và thao tác cốt lõi không cần mạng.

## Môi trường bắt buộc

| Môi trường | Mục đích |
|---|---|
| iPhone dọc | workflow touch + bàn phím ảo |
| iPhone ngang | ribbon và vùng làm việc hẹp |
| iPad dọc/ngang | hai vùng làm việc, ribbon đầy đủ |
| thiết bị thật | bộ nhớ, thời gian mở/lưu, file picker |

Mỗi lần chạy phải ghi model, OS, build/commit, ngày giờ và trạng thái mạng.

## Quy tắc kết luận

- PASS: thao tác thật và kết quả đúng, không mất dữ liệu, không chồng UI.
- FAIL: đã thao tác nhưng kết quả sai, crash, mất dữ liệu hoặc thông báo lỗi ngoài dự kiến.
- BLOCKED: không thể chạy do thiếu thiết bị/quyền/native bridge; ghi nguyên nhân cụ thể.
- NOT RUN: chưa chạy, không được suy diễn từ code hoặc screenshot.

## Luồng kiểm thử chung cho mọi app

1. Mở app khi offline; chờ UI mount; chụp trạng thái ban đầu.
2. Chạm từng tab ribbon và nhóm lệnh; kiểm tra không chồng topbar/ribbon/editor/status.
3. Thực hiện thao tác bằng touch và bàn phím ảo; kiểm tra focus, caret và bàn phím.
4. Thử thao tác ngược, thao tác lặp, tap nhanh, selection rỗng, dữ liệu Unicode/tiếng Việt/emoji.
5. Undo từng bước, Redo từng bước; tạo hành động mới sau Undo để kiểm tra nhánh lịch sử.
6. Save/Save As/Close/Reopen; nếu native bridge chưa có thì đánh FAIL, không bỏ qua.
7. Export/import định dạng được tuyên bố hỗ trợ; mở lại và so sánh nội dung/định dạng.
8. Xoay dọc/ngang, mở lại keyboard, cuộn ribbon, mở menu Tệp và đóng bằng Quay lại/Escape.

## Writer checklist

- [ ] nhập tiếng Việt, Unicode, emoji, đoạn dài
- [ ] chọn ký tự/từ/đoạn/Ctrl+A; Backspace/Delete/Enter/Tab
- [ ] Bold/Italic/Underline/Strike, font, size, màu, highlight
- [ ] căn lề, line spacing, indent, bullets/numbering, heading/style
- [ ] bảng, ảnh, shape, hyperlink, page break, header/footer/page number (nếu có)
- [ ] Find/Replace/Replace All, có dấu và không dấu
- [ ] copy/paste plain/rich/table/image; undo/redo sau paste
- [ ] Save → Close → Reopen; export PDF/DOCX và kiểm tra lại

## Sheet checklist

- [ ] nhập text, số âm, thập phân, phần trăm, tiền tệ, ngày/giờ
- [ ] chọn cell/range/hàng/cột; copy/paste/fill/autofill
- [ ] thêm/xóa/resize/ẩn-hiện hàng cột; merge/unmerge; freeze
- [ ] thêm/đổi tên/nhân bản/xóa sheet
- [ ] `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `IF`, `AND`, `OR`, `ROUND`
- [ ] `SUMIF/SUMIFS`, `COUNTIF/COUNTIFS`, lookup tương ứng nếu tuyên bố hỗ trợ
- [ ] relative/absolute reference (`A1`, `$A$1`, `A$1`, `$A1`), fill công thức
- [ ] chia 0, ô trống, sheet khác, xóa ô tham chiếu, circular reference
- [ ] sort/filter, dữ liệu lớn, Save → Reopen → kiểm tra kết quả công thức

## Slides checklist

- [ ] tạo/nhân bản/xóa/đổi thứ tự slide; layout
- [ ] textbox, ảnh, shape; resize/move/rotate
- [ ] căn chỉnh, group/ungroup, layer/order nếu có
- [ ] copy/paste object, undo/redo
- [ ] slideshow/presentation, điều hướng bằng touch và bàn phím
- [ ] Save → Close → Reopen; export PDF/PPTX và kiểm tra font/ảnh/vị trí/layer

## Bàn phím và touch

- [ ] Ctrl/Cmd+N/O/S/Shift+S/P/Z/Y/X/C/V/A/F/B/I/U
- [ ] phím mũi tên, Home/End, Page Up/Down, Shift/Command selection
- [ ] tap, double tap, long press, right click/secondary click nếu iPad hỗ trợ
- [ ] drag selection, drag/drop, resize handle, scroll ngang/dọc
- [ ] touch target tối thiểu 44pt; không có nút bị che hoặc tap nhầm vùng khác

## Báo lỗi bắt buộc

Mỗi lỗi ghi: ID, module, device/orientation, build/commit, severity, precondition, steps, expected, actual, reproducibility, screenshot/video, workaround và regression risk.

## Exit criteria

Không phát hành bản mobile/iPadOS khi còn lỗi CRITICAL/BLOCKER ở Save/Open, file corruption, công thức, chuyển app hoặc UI chồng chéo. Các mục BLOCKED phải có owner và điều kiện mở khóa rõ ràng.
