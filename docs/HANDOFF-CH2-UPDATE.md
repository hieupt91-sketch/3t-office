# Handoff CH-2 — cập nhật một chạm

## Objective

Khi người dùng chọn **Khởi động lại ngay**, VN Office lưu/ hỏi lưu tài liệu, đóng các cửa sổ, áp bản vá đã ký, kiểm tra khởi động và mở lại đúng tài liệu. Lỗi giữa chừng phải khôi phục phiên bản cũ; mọi bước ghi vào `%LOCALAPPDATA%\VNOffice\updates\update-log.txt`.

## Đã sửa

- Helper PowerShell được chép từ blob của chính bản vá đã xác minh chữ ký, nên bản 0.9.5 có thể chạy helper mới khi áp 0.9.6.
- Launcher ghi log trước và sau `Popen`, dùng PowerShell `-ExecutionPolicy Bypass`, `-NoProfile`, `-NonInteractive`, `-WindowStyle Hidden` và chỉ `CREATE_NO_WINDOW`; đường dẫn có khoảng trắng được truyền như đối số riêng.
- Helper nhận diện đúng `python/pythonw.exe`, bundled `soffice.exe/.bin` và worker UNO theo profile `lo-profile-<app>`, chỉ dừng soffice thuộc bản cài này sau timeout; không dừng profile khác.
- Helper backup, áp file nguyên tử, kiểm tra hash/kích thước/`VERSION.txt`, chờ health marker sau relaunch, rollback và mở lại bản cũ khi health thất bại.
- Update worker bắt đầu sau paint/bridge sẵn sàng, chạy nền ngay lần đầu (không chờ chu kỳ 4 giờ), nên banner mục tiêu ≤2 phút.

## Test truthfulness

- PASS — `python -m unittest tests.test_updater.UpdaterTests.test_power_shell_helper_applies_relaunches_and_rolls_back_failed_health -v` (Windows PowerShell): apply 0.9.5→0.9.6, health, relaunch, rollback và tampered manifest.
- PASS — fixture desktop/CDP scratch ngoài repo: banner/update task, helper chạy từ path có khoảng trắng, `0.9.6`, health và relaunch; log ghi đầy đủ.
- NOT RUN — live LAN share `\\192.168.1.252` và production package ~1.6 GB.
- NOT RUN — full gates trong phiên tiếp tục này; phải chạy một lần cuối: `node tests/run-tests.js`, `python -m unittest discover -s tests`, `git diff --check`.
- BUILD — NOT RUN production build; fake-runtime/package smoke đã PASS trong handoff updater trước đó.

## Bootstrap máy đang ở 0.9.5

Máy 0.9.5 chưa có updater nên không thể nhận patch một cách an toàn. Phát hành một lần `Setup-0.9.6.exe` (hoặc bản bootstrap mới hơn) chứa updater và public key này; từ đó các bản sau chỉ cần patch. Không tự động ghi đè cài đặt hiện hữu ngoài installer được người phụ trách phê duyệt. Bản vá 0.9.6 phải chứa `app/adapters/updater/apply-helper.ps1`; app cũ dùng helper đã stage để cập nhật chính nó.

## Rollback / security

Không commit private signing key. Nếu release hỏng, helper giữ bản backup và relaunch phiên bản cũ; có `rollback-report.json`, `update-failure.json` và thông báo tiếng Việt. Không gửi nội dung tài liệu ra ngoài.

CORE PATCH ID: None — không sửa LibreOffice Core.
