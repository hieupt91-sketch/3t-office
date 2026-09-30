# Kế hoạch G7 — Khởi động trống và thao tác tệp như Office

## Mục tiêu

Khi chạy VN Writer, VN Sheet hoặc VN Slides không kèm tệp, người dùng nhận được tài liệu trống, chưa chỉnh sửa, đúng tên và điểm bắt đầu của ứng dụng tương ứng. New/Open/Save/Save As/Print và trạng thái gần đây phải giữ đúng dữ liệu, định dạng, tên tệp và trạng thái chưa lưu theo tiêu chí G7.

## Năng lực hiện có

- Cả ba app đã có nhánh khởi tạo trống theo `templateId === "blank"`, nhưng khởi chạy thường vẫn chọn tài liệu mẫu.
- Sheet khởi tạo ba trang tính mẫu; Slides khởi tạo bộ trình chiếu demo và nhánh trống hiện vẫn điền chữ mẫu thật vào slide đầu.
- Các adapter đã có xử lý New, Open, Save, Save As, PDF và in; Sheet/Slides giữ nguồn tệp cho lưu lại. Cần kiểm tra hành vi hộp thoại, lỗi, dirty state và nội dung đã lưu trên desktop.
- AppShell hiện ghi tên tài liệu vào Recent ngay khi mount, kể cả tài liệu chưa từng lưu.
- Các bài kiểm thử Sheet hiện hành có nhiều trường hợp dựa vào tên ba trang tính mẫu; phải chuyển các trường hợp đó sang tạo sheet fixture rõ ràng, giữ nguyên độ phủ.
- Mẫu handoff có tại `VN-Office-AI-Engineering-Standard-V2/VN-Office-AI-Engineering-Standard-V2/09-templates/AGENT-HANDOFF.md`; hoàn tất `docs/HANDOFF-FILE-BASICS.md` theo đúng các trường trong mẫu.

## Phạm vi file/module dự kiến

- `apps/writer/writer-app.js`, `apps/sheet/sheet-app.js`, `apps/sheet/sheet-grid.js`, `apps/slides/slides-app.js`, `apps/slides/slides-canvas.js`: trạng thái trống, tên mặc định và con trỏ/placeholder.
- `adapters/libreoffice/{writer,sheet,slides}/*-adapter.js`, `platform/shell/app-shell.js`, `platform/recent/recent-manager.js`, `main.py`: luồng New/Open/Save/Save As/đóng cửa sổ, tên cửa sổ/tài liệu và danh sách Recent; chỉ sửa những điểm hụt đã xác nhận.
- `tests/unit/**`, các kiểm thử hiện có liên quan và harness desktop mới trong `scripts/`: kiểm định trạng thái trống, lifecycle và round-trip Office qua pywebview/evaluate_js/COM.
- `docs/HANDOFF-FILE-BASICS.md`: bàn giao kết quả G7 và trạng thái từng cổng.

## Phụ thuộc và ranh giới

- Tái sử dụng adapter LibreOffice, API dialog native, LibreOffice headless, pywebview và harness Word/Excel COM hiện có.
- Không thêm dependency, không sửa LibreOffice Core, không thay framework/build system, không thay ngữ nghĩa định dạng tệp.
- Tài liệu kiểm tra lấy từ `E:\VN OFice\file test` và chỉ đọc; không đưa vào Git.

## Rủi ro

- Test cũ có thể phụ thuộc workbook mẫu ngầm; phải tạo fixture sheet tường minh thay vì bỏ assertion.
- Thay đổi lifecycle/dirty state có thể làm mất nội dung nếu Save bị hủy hoặc lỗi; mọi nhánh phải giữ nguyên editor hiện tại cho tới khi thao tác được xác nhận thành công.
- Print/PDF và COM cần máy Windows có pywebview, LibreOffice, Microsoft Word/Excel và máy in PDF; thiếu công cụ sẽ được báo `NOT RUN`/`BLOCKED`, không giả lập thành PASS.
- G7 yêu cầu nhiều app và vài chục test; trước các lượt nặng phải kiểm tra RAM trống, chờ nếu dưới 5 GB.

## Kế hoạch kiểm tra

1. Cập nhật unit/live test để xác nhận khởi động trống, tên, dirty state, New/Open/Save/Save As và dữ liệu thực; giữ nguyên test coverage.
2. Thêm harness pywebview dùng `evaluate_js`, API dialog có thể mock bằng đường dẫn fixture, và Word/Excel COM để kiểm tra round-trip; không dùng SendKeys.
3. Chạy kiểm tra G7 cho Writer/Sheet/Slides, gồm print preview/PDF khi driver `Microsoft Print to PDF` sẵn sàng.
4. Chạy `node tests/run-tests.js`.
5. Chạy `python -m unittest discover -s tests`; nếu test soffice flaky, chạy lại riêng và ghi cả hai kết quả.
6. Kiểm tra `git diff`, không thêm tài liệu mẫu/secret; commit theo nhóm logic trên branch hiện tại, không merge vào main.

## Rollback

Revert riêng từng commit G7 theo thứ tự ngược trên branch này. Không xóa tệp, reset hoặc thay đổi branch dùng chung. Tệp fixture là dữ liệu ngoài Git và không bị sửa.
