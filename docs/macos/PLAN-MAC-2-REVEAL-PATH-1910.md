# Kế hoạch MAC-2 — Mở vị trí tệp trong Finder

## Objective

Thêm backend macOS cho hợp đồng `Launcher.reveal_path(path)` để lệnh “Mở thư mục chứa tệp” chọn đúng tệp trong Finder bằng `open -R <đường dẫn>`, đồng thời giữ Linux ở backend portable hiện tại.

## Current capability

- Hợp đồng dùng chung `Launcher.reveal_path` đã có trong `platform/os_services/base.py`.
- Windows đã gọi Explorer bằng danh sách đối số; portable trả `not_supported`.
- Bộ chọn backend hiện ánh xạ Darwin sang portable nên macOS chưa thực hiện được thao tác này.
- Nhánh macOS cũ có implementation đã kiểm chứng cho `open -R`; sẽ tái sử dụng hành vi phù hợp và đối chiếu lại với hợp đồng trên `vn-main`, không cherry-pick do lịch sử đã lệch xa.

## Files/modules

- `platform/os_services/macos.py`: backend riêng macOS kế thừa hành vi portable và override `reveal_path`.
- `platform/os_services/__init__.py`: ánh xạ Darwin sang backend macOS.
- `tests/test_os_services_reveal.py`: kiểm tệp thiếu, Unicode/khoảng trắng, argv không shell, lỗi quyền, timeout, mã thoát và lựa chọn backend.
- `docs/macos/HANDOFF-MAC-2-REVEAL-PATH-1910.md` và `09-templates/AGENT-HANDOFF.md`: bằng chứng bàn giao.

## Dependencies

Chỉ dùng thư viện chuẩn Python (`pathlib`, `subprocess`) và lệnh hệ thống `/usr/bin/open` được macOS cung cấp; không thêm dependency, không gọi LibreOffice Core, không đổi UI hoặc định dạng tài liệu.

## Risks

- Đường dẫn có khoảng trắng/Unicode có thể bị tách hoặc chèn lệnh nếu dùng shell string: truyền argv list và không bật `shell`.
- Finder có thể treo, bị chặn quyền hoặc trả mã lỗi: đặt timeout và ánh xạ sang `ServiceResult` tiếng Việt.
- Đổi selector Darwin có thể vô tình mất hành vi tìm LibreOffice/dữ liệu hiện tại: `MacOSLauncher` kế thừa `PortableLauncher`, `build_services` giữ `PortableDataDirs`.

## Test plan

1. Chạy `python -m pytest tests/test_os_services_reveal.py -q` trên macOS.
2. Chạy nhóm test OS services liên quan để bắt hồi quy selector/hợp đồng.
3. Chạy `node scripts/audit-0610/i18n_parity.mjs` và `npm test` theo cổng trước gộp; ghi đúng PASS/FAIL với số liệu thực.
4. Chạy `git diff --check`.

## Rollback

Hoàn tác commit MAC-2 sẽ xóa `macos.py`, trả selector Darwin về `portable` và khôi phục test/handoff; không có migration dữ liệu hoặc thay đổi định dạng cần hoàn tác.
