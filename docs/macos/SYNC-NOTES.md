# Ghi chú đồng bộ cho team macOS

Cập nhật: 05/10/2026 · `main` ở mốc `f606f0d1` (98 commit mới so với mốc 03/10 mà `platform/macos` đang giữ).

Cách đọc: mục A là **mã dùng chung** (mac kéo xuống và phải kiểm), mục B là **chỗ chỉ dành cho Windows** (mac làm bản riêng), mục C là việc mac cần làm ngay. Quy tắc phối hợp: `docs/SPEC-PLATFORMS-AND-BRANCHES.md`. Chi tiết tăng tốc: `docs/macos/PERF-PORTABILITY.md`.

## A. Dùng chung — thay đổi từ 03/10 đến 05/10
| Chủ đề | Tóm tắt | Cờ hoàn tác |
|---|---|---|
| Tăng tốc mở Sheet | P1/P1b (Python, song song `spawn`), P2 (JS) | `VNO_OPEN_LEGACY=1` |
| Mở Doc nặng | sửa regex bậc hai khi ngắt mục | — |
| Cửa sổ trắng khi khởi động | máy chủ tĩnh nội bộ backlog 128 | — |
| Xem trước khi in cả 3 app | dùng worker LibreOffice đang chạy, đếm trang PDF trực tiếp | `VNO_PRINT_LEGACY=1` |
| Lưu file rất lớn | chuyển nội dung theo từng đoạn qua `begin_content_stage` | — |
| Xem nhanh Sheet (view-first) | nay **bật mặc định** cho xlsx > 5 MiB | `VNO_OPEN_VIEWFIRST=0` |
| Chiều cao dòng Sheet | bảng số đo font dựng sẵn thay vì gọi GDI | `VNO_FONT_TABLE_LEGACY=1` |
| Bản quyền phía máy khách | `adapters/license/`, hộp Tệp ▸ Tài khoản và bản quyền | — |
| Doc: hộp thoại Đoạn văn | `apps/writer/paragraph-dialog.js`, lệnh `writer.format.paragraphDialog` | — |
| Hướng dẫn tiếng Việt | thêm bài cho nhiều lệnh còn thiếu | — |
| Máy chủ thương mại | `server/3t-api` (chưa triển khai) | — |

Test dùng chung: `node tests/run-tests.js` (2762 PASS), hồi quy desktop 27 ca, các bài CDP trong `tests/live/cdp/`. Bộ đo bằng PowerShell/WMI và CDP trên WebView2 là của Windows.

## B. Chỉ dành cho Windows (đừng sao chép sang mac)
- `main.py`: `taskkill` (nhánh `os.name == "nt"`), tiền tố đường dẫn dài `\\?\`, `GetLocaleInfoEx`, `MessageBoxW`, `SetCurrentProcessExplicitAppUserModelID`.
- `adapters/updater/apply-helper.ps1` (áp dụng cập nhật); mac cần `apply-helper.sh` riêng trong `ports/macos`.
- Đường dự phòng GDI trong `_gdi_font_descent` (sau bảng số đo).
- Bộ cài NSIS, launcher `Doc.exe/Sheet.exe/Slide.exe`, `scripts/build-pilot.ps1`, `scripts/build-installer.ps1`.

## C. Việc mac cần làm ngay
1. `git merge main` vào `platform/macos` rồi chạy `node tests/run-tests.js` (phải 2762 PASS).
2. Kiểm kết nối UNO qua `pipe,name=` ở `adapters/libreoffice/common/soffice_uno_worker.py` (dòng 43 và 420) trên macOS; nếu LibreOffice mac không chấp nhận thì dùng `socket,host=localhost` theo `docs/SPEC-MACOS-PORT.md`.
3. Tạo hồ sơ LibreOffice seed riêng cho macOS (`scripts/release/build-seed-profiles.py` là mã chung, dữ liệu theo nền tảng).
4. Đo lại 28 file LAN: payload mở Sheet phải giống Windows; ghi kết quả vào `docs/macos/`.
5. Cần sửa gì ở mã dùng chung thì sửa ở `main` trước, rồi kéo xuống.
