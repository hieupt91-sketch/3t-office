# Agent Handoff

TASK: KIEM TRA AN TOAN KHI XEM NHANH SHEET DA BAT MAC DINH (28 tep lan01.xlsx den lan28.xlsx)
AGENT/ROLE: agy — Sheet ViewFirst Safety Verification
BRANCH: `docs/viewfirst-28-agy`
WORKTREE: `E:\VNOffice-agy-vf28`
OBJECTIVE: Đo và báo cáo tính an toàn của việc bật Xem Nhanh (`view-first`) mặc định cho tệp `.xlsx` > 5 MiB trên 28 tệp mẫu `lan01.xlsx` – `lan28.xlsx`. So sánh đối chiếu số sheet, ô A1 và ô đầu tiên của mọi sheet giữa 2 chế độ (mặc định vs `VNO_OPEN_VIEWFIRST=0`) trên 3 tệp lớn nhất và 3 tệp nhỏ nhất. KHÔNG sửa mã nguồn sản phẩm.

## FINDINGS

- Tất cả **28/28 tệp mẫu** mở thành công 100%, không phát sinh bất kỳ lỗi crash hay console/output error nào.
- Quy tắc xem nhanh theo dung lượng (> 5 MiB) hoạt động chuẩn xác 100%: 10 tệp lớn (> 5 MiB) đều hiển thị màn hình Xem Nhanh (`window.__vnoSheetQuickViewShownAt` là số), 18 tệp nhỏ (≤ 5 MiB) KHÔNG hiển thị Xem Nhanh (`window.__vnoSheetQuickViewShownAt` undefined).
- Đối chiếu dữ liệu (Parity check) trên 3 tệp lớn nhất (`lan16.xlsx` 16.16 MiB, `lan26.xlsx` 14.85 MiB, `lan09.xlsx` 12.68 MiB) và 3 tệp nhỏ nhất (`lan25.xlsx` 0.03 MiB, `lan20.xlsx` 0.03 MiB, `lan07.xlsx` 0.04 MiB) giữa chế độ mặc định và `VNO_OPEN_VIEWFIRST=0`:
  - **Sheet Count Match**: 100% TRUE
  - **Grid A1 Match**: 100% TRUE
  - **All Sheets First Cell Match**: 100% TRUE
- Kết luận: Không có tệp nào bị lỗi. Việc bật Xem Nhanh mặc định tuyệt đối an toàn để giữ nguyên cho bản chính thức.
- Bảng dữ liệu chi tiết 28 tệp đã được viết tại [viewfirst-default-28.md](/E:/VNOffice-agy-vf28/docs/perf-measure/viewfirst-default-28.md).

IMPLEMENTATION SUMMARY: Đo đạc và lập báo cáo. Không sửa mã nguồn sản phẩm.
FILES CHANGED: `docs/perf-measure/viewfirst-default-28.md`, `docs/HANDOFF-SHEET-VIEWFIRST-DEFAULT-VERIFY.md`.
COMMANDS RUN: Khởi chạy bộ đo CDP tự động `node --experimental-websocket scratch/run_all_measurements.mjs` chạy 28 tệp mặc định + 6 tệp đối chiếu `VNO_OPEN_VIEWFIRST=0` qua `tests/live/cdp/session.mjs launchApp`.
BUILD RESULT: PASS (Tất cả 28 lượt nạp và 6 lượt đối chiếu đều PASS).
TEST RESULTS: PASS (CDP test suite: 28/28 default runs PASS, 6/6 parity runs PASS).
KNOWN FAILURES: Không có.
RISKS: Không có risk phát sinh đối với mã nguồn sản phẩm (không sửa mã nguồn).
NEXT ACTION: Sẵn sàng hợp nhất báo cáo vào tài liệu dự án.
