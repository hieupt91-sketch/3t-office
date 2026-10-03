# CH-1 — Mở bảng tính lớn không khóa giao diện

## Objective

Đưa `lan14.xlsx` từ baseline trung bình 247,97 giây về dưới 60 giây, WebView2 dưới 1,5 GB và không có long task quá 2 giây, đồng thời giữ nguyên dữ liệu, công thức cache và đường lưu.

## Current capability

LibreOffice đã chuyển XLSX sang FODS offline. Repo đã có compact payload mặc định tắt, parser bất đồng bộ, fallback FODS riêng phiên và test save/round-trip; lần đo cũ với payload vẫn mất 156–158 giây vì dựng đủ 10 sheet và chưa chủ động nhường main thread.

## Phases and files

1. Pha 1: `main.py`, `sheet-payload-parser.js`, `sheet-adapter.js`: tự chọn compact payload khi FODS lớn hơn 20 MB, thêm stage timing, parse theo lát 128 hàng và hiển thị phần trăm. File nhỏ giữ đường cũ.
2. Pha 2: tách payload theo sheet, dựng sheet hiện hoạt trước; sheet còn lại giữ trong phiên cục bộ và nạp theo yêu cầu. Mọi API toàn-workbook phải ép nạp hoặc dùng cache nguồn, không được trả kết quả sai im lặng.
3. Pha 3: loại các bản sao FODS/payload đồng thời và giới hạn cache sheet để đạt RAM mục tiêu.

Không sửa LibreOffice Core, không thêm dependency, không đổi build system. UI tiếp tục đi qua Adapter/Platform.

## Risks and controls

- Công thức/tìm kiếm/named range/conditional formatting/Ctrl+End: Pha 2 chỉ được bật sau khi có cơ chế load-on-demand và test rõ từng consumer.
- Lưu: compact payload hiện vẫn commit đủ model rồi serialize FODS; fallback đầy đủ được giữ đến khi Pha 2 chứng minh round-trip sheet chưa nạp.
- File nhỏ: threshold 20 MB giữ nguyên parser FODS hiện tại; cờ môi trường vẫn cho phép test compact payload chủ động.
- Rollback Pha 1: bỏ `_should_use_sheet_open_payload`, đường FODS cũ vẫn còn nguyên.

## Test plan

Test hẹp Python/JS cho threshold, payload, fallback và save; cuối mỗi pha chạy đúng một lần Node full, desktop 27 ca, audit legacy lan01–03; chỉ chạy probe lan14 khi RAM trống trên 6 GB. Báo PASS/FAIL/NOT RUN theo kết quả thật.
