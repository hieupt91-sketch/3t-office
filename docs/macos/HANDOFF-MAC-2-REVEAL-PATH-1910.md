# Bàn giao MAC-2 — `reveal_path` trên macOS

- Nhánh/worktree: `mac/reveal-path-1910` tại `/Users/hieupc/.codex/worktrees/mac-reveal-path-1910/3t-office`.
- Đã thêm `MacOSLauncher.reveal_path`: kiểm tra tệp tồn tại, gọi Finder bằng argv `['open', '-R', <đường dẫn tuyệt đối>]` không qua shell, timeout 15 giây và trả lỗi tiếng Việt cho quyền, timeout, lỗi hệ thống/mã thoát.
- Darwin giờ chọn backend `macos`; các hành vi khác vẫn kế thừa portable nên không đổi thư mục dữ liệu hay tìm engine. Không thêm dependency, không sửa Core/UI/định dạng tệp.
- PASS: `python3 -m unittest tests.test_os_services_contract tests.test_os_services_reveal -v` — 18/18; native Finder probe trên chính macOS — `is_ok=True`; i18n parity — VI=EN=3091, thiếu 0, lệch placeholder 0; `git diff --check` — PASS.
- FAIL ngoài phạm vi: `npm test` — 3730/3749, 19 lỗi (các probe Python/LibreOffice và baseline hiện hữu); pytest và `tests.test_os_services_p2` BLOCKED vì Python hệ thống thiếu lần lượt `pytest` và `webview`. Build/GUI CDP NOT RUN vì task chỉ đổi dịch vụ Finder, không đổi UI/build.
