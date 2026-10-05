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

**Thêm 05/10 chiều (dùng chung, mac cần kiểm):**
- `platform/process_lifecycle/process_tracker.py`: macOS không có `/proc`, nên nhận diện tiến trình và cây tiến trình con nay lấy từ `ps` (`ps -o lstart= -p PID`, `ps -axo pid=,ppid=`, `LC_ALL=C`). Có test phần phân tích; **chưa chạy trên máy mac thật** — hãy kiểm: dừng `soffice` có dừng luôn `soffice.bin` không.
- `ooxml_zip_patch.py`: worker của pool P1b tự thoát khi app cha chết (trên POSIX so `os.getppid()`); `prefetch_sheet_open_metadata` chạy trong luồng nền khi mở Sheet (cờ `VNO_OPEN_PREFETCH=0` tắt).
- `platform/os_services/` (P1, P2): `windows.py` và `portable.py`. **macOS hiện dùng `portable.py`** (đường dẫn `~/Library/Application Support/VNOffice`, tìm `/Applications/LibreOffice.app/...`); khi làm `macos.py`, sao chép từ `portable.py` rồi chỉnh. `VNO_OS_SERVICES_LEGACY=1` quay lại mã cũ.

- `adapters/license/device.py`: mã máy trên macOS lấy `IOPlatformUUID` qua `ioreg -rd1 -c IOPlatformExpertDevice` (Linux: `/etc/machine-id`), rơi về địa chỉ MAC như cũ nếu không đọc được. Có test phân tích; **chưa chạy trên máy mac thật** — hãy kiểm `device.machine_id()` trả `mac-uuid-…`.
- **06/10 (dùng chung):** `ooxml_zip_patch.py` + `sheet_open_payload.py` gộp bớt lượt xử lý khi mở Sheet lớn (khung bảng, nén deflate trong worker). Không có mã riêng hệ điều hành; `zlib`/`ProcessPoolExecutor spawn` chạy như nhau trên mac. Cờ hoàn tác `VNO_OVERLAY_SKELETON=0`, `VNO_PAYLOAD_STRIP_IN_WORKERS=0`. Mac cần chạy lại `tests/test_overlay_skeleton.py` và `tests/test_sheet_open_payload.py` (chi tiết `docs/SPEC-PERF-OPEN.md` mục 6.1f).
- Đọc `docs/SPEC-PERF-OPEN.md` mục 6.1d/6.1e để biết các cờ hoàn tác mới (`VNO_FODS_TABLE_REGEX`, `VNO_STRIP_XF_REGEX`, `VNO_OPEN_PREFETCH`, `VNO_WRITER_VERIFY`, `__VNO_OPEN_LEGACY` trong JS).

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
