# FIX-L6 — Kế hoạch audit VN Slides với PowerPoint

## Objective
Đối chiếu các thao tác chưa kiểm trong FIX-L5 với PowerPoint thật qua COM. Thao tác VN Office thực hiện bằng CDP chuột/phím; không dùng SendKeys hoặc OS input. Lưu PPTX, mở lại bằng PowerPoint, chụp bằng chứng, sửa lệch tái hiện được, bổ sung Help tiếng Việt và i18n. Mỗi mục sửa có commit riêng.

## Current capability
FIX-L5 ghi nhận 16 thao tác cơ bản đã khớp. Slides đã có canvas, adapter PPTX/FODP, ribbon/dialog, layout/master, chart/animation và Help entries. FIX-L4 kiểm một phần ghi chú, transition, animation; các báo cáo cũ chỉ dùng làm điểm xuất phát.

## Files/modules and dependencies
- Reuse `apps/slides/slides-canvas.js`, `apps/slides/slides-ribbon.js`, `adapters/libreoffice/slides/slides-adapter.js` và Help/i18n hiện hữu.
- Office oracle: PowerPoint COM qua `scripts/audit-0610/office_parallel/slides/compare.ps1`.
- UI automation: `tests/live/cdp/session.mjs` và CDP actions; dùng `VNO_APP_ROOT=E:\VNOffice-codex-fl6`, profile `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl6`.
- Không thêm dependency, không sửa build, LibreOffice Core hoặc định dạng.

## Work items
1. Hình khối: fill, outline, kích thước, xoay.
2. Hộp chữ, bảng, ảnh, biểu đồ, sơ đồ cơ bản.
3. Transition, loại và thời gian; animation, loại/thứ tự.
4. Layout/Reset và Slide Master/theme.
5. Ghi chú diễn giả, bắt đầu trình chiếu từ trang hiện tại, bút/laser.
6. Save PPTX, mở trong PowerPoint COM và đọc đối tượng/thuộc tính.

## Risks and test plan
PowerPoint có thể chuẩn hóa OOXML. Chỉ đánh dấu khớp sau khi thao tác trên UI, lưu tệp, mở lại bằng COM và đối chiếu đúng thuộc tính. COM phải chụp PID trước/sau và chỉ đóng PID do lượt kiểm thử tạo. Chụp UI bằng CDP. Chạy focused tests cho sửa đổi, `npm test`, `python -m unittest`, `python -m unittest discover`, audit CDP/COM và `git diff --check`; ghi nguyên trạng mọi lỗi/giới hạn.

## Rollback
Mỗi mục sửa có commit độc lập; chỉ revert commit liên quan nếu regression test hoặc COM/CDP thất bại. Không dùng destructive Git.
