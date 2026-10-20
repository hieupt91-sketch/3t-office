# Plan MAC-6/CDP macOS — 20/10/2026

## Objective

Cho phép bộ kiểm desktop hiện hữu khởi động VN Writer/Sheet/Slides trên macOS qua
CDP của QtWebEngine, đồng thời giữ nguyên đường chạy WebView2 trên Windows. Đây là
nền để chạy MAC-13 và phiên soạn thử MAC-15; Node chỉ điều khiển test, không tham
gia luồng chạy production/offline của `main.py`.

## Current capability

- `main.py` đã nhận `VNO_CDP_DEBUG_PORT` và chuyển vào thiết lập remote debugging
  của pywebview.
- `tests/live/cdp/session.mjs` đã tự chọn cổng, khởi động đúng PID, nối CDP và đóng
  cửa sổ qua bridge, nhưng mới truyền cờ WebView2 và mặc định gọi `python`.
- `scripts/audit-0610/app_session_server.mjs` tái sử dụng session nhưng đang cố
  định hồ sơ và ảnh tại `E:\\VNOffice-profiles`, nên không chạy được đúng trên Mac.
- Nhánh cũ `codex/mac-cdp-primary` có xử lý phím macOS; nhánh `mac/m1-qt-cdp` có
  cô lập hồ sơ. Chỉ dùng làm tham khảo vì lệch lịch sử, không cherry-pick.

## Files/modules

- `tests/live/cdp/session.mjs`: cấu hình môi trường remote debugging và Python theo
  nền tảng; giữ quyền sở hữu và cleanup theo PID đã spawn.
- `main.py`: chỉ khi phiên test đặt đồng thời cổng CDP và backend test hợp lệ, truyền
  backend đó cho pywebview; production không đặt biến nên giữ backend mặc định.
- `scripts/audit-0610/app_session_server.mjs`: đường dẫn hồ sơ/ảnh đa nền tảng,
  vẫn gọi `launchApp` dùng chung.
- Test tập trung cho hợp đồng cấu hình/đường dẫn nếu khả thi.
- `docs/HANDOFF-MAC-CDP-1910.md` và mẫu handoff chuẩn.

## Dependencies

- Python + pywebview và Qt/QtWebEngine đã có sẵn trên máy Mac. Không cài thêm và
  không tự quyết giấy phép Qt. Nếu thiếu runtime, test native được ghi BLOCKED.
- Không dùng AppleScript, `cliclick`, COM hoặc điều khiển bàn phím cấp hệ điều hành.

## Risks

- QtWebEngine có thể không mở endpoint nếu backend thực tế không phải Qt hoặc biến
  môi trường khác phiên bản Qt.
- Cô lập `HOME` có thể làm thay đổi nơi lưu trạng thái người dùng; chỉ áp dụng cho
  profile test tạm.
- Ép đóng sai có thể ảnh hưởng app người dùng; cleanup chỉ tác động `child.pid` do
  chính session tạo, sau khi yêu cầu đóng mềm và chờ.

## Test plan

1. Unit/static contract cho cấu hình platform và đường dẫn.
2. Smoke native Writer/Sheet/Slides qua `session.mjs`, gồm gõ/click/chụp ảnh nếu
   runtime Qt sẵn sàng.
3. Quick-access CDP theo tài liệu MAC-6.
4. Chạy bảy bài MAC-13; ghi PASS/FAIL/BLOCKED từng bài và nguyên nhân thực tế.
5. `node scripts/audit-0610/i18n_parity.mjs`, `npm test` nếu thay đổi đủ ổn định.

## Execution status (20/10/2026)

- Plan gate completed before implementation. Existing reference branches were read
  for comparison; no cherry-pick was used.
- Focused session contract: PASS — 4/4 tests.
- Syntax checks: PASS — `node --check` for both changed `.mjs` modules and
  `python3 -m py_compile main.py`.
- Native startup: BLOCKED — `launchApp("writer")` exited at `main.py:127` because
  `/usr/bin/python3` has no `webview` module. No Qt/PySide package was installed.
- MAC-6 live acceptance and all seven MAC-13 desktop scenarios: BLOCKED / NOT RUN
  due to that missing runtime; no UI result is claimed.
- `npm test` and i18n parity: NOT RUN (not required for this focused infrastructure
  handoff).

## Rollback

Hoàn tác các commit của nhánh `mac/cdp-1910`. Thay đổi chỉ nằm trong hạ tầng test
và tài liệu, không đổi định dạng tệp, dữ liệu người dùng hoặc runtime production.
