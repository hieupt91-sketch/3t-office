# Làm từng bước để đưa 3T Office lên macOS (tương đương bản Windows 0.9.10)

Đọc cùng: `docs/BAN-GIAO-MAC.md` (có gì / không có gì trong repo), `docs/SPEC-MACOS-PORT.md` (đặc tả, mốc M0–M8), `docs/PLAN-OS-SERVICES.md` (hợp đồng dịch vụ hệ điều hành), `AGENTS.md` (luật dự án).
Tài liệu này là **hướng dẫn thao tác**: lệnh cụ thể, tệp cụ thể, cách biết là đã xong.

## 0. Điều cần biết trước khi bắt đầu
1. **Mã giao diện/soạn thảo/công thức dùng chung 100%** — không viết lại. Chỉ viết phần "vỏ" hệ điều hành.
2. **Phần vỏ Windows đã bắt đầu được tách** vào `platform/os_services/` (hợp đồng 10 Protocol trong `base.py`; backend Windows `windows.py`; backend tạm cho Mac/Linux `portable.py`). Đã làm xong bước **P1 (hợp đồng)** và **P2 (thư mục dữ liệu, tìm engine, hộp lỗi khởi động)**. Các bước P3 trở đi (một phiên bản chạy, theo dõi tiến trình, nhận diện ứng dụng, liên kết tệp, worker LibreOffice, in) **chưa tách**: một số chỗ trong `main.py` vẫn gọi API Windows trực tiếp (bảng ở mục 3). Cách làm: team Mac viết `platform/os_services/macos.py` theo hợp đồng, và sửa nốt các chỗ gọi trực tiếp thành đi qua `os_services` (vào `main` trước, xem mục 6).
3. **Quyết định cần người phụ trách duyệt trước khi đóng gói:** dùng Qt/PySide6 (giấy phép LGPL) làm vỏ Chromium trên macOS; tài khoản Apple Developer để ký + notarize. Trong lúc chờ, **vẫn làm được M1–M5** bằng PySide6 chỉ trên máy dev (không phát hành).

## 1. M0 — Chuẩn bị máy (một lần)
```bash
xcode-select --install                      # công cụ dòng lệnh
brew install python@3.12 node git           # hoặc cài từ python.org / nodejs.org
# LibreOffice bản macOS (Apple Silicon hoặc Intel đúng máy): tải từ libreoffice.org, kéo vào /Applications
git clone -b platform/macos https://github.com/hieupt91-sketch/3t-office.git
cd 3t-office
python3.12 -m venv .venv && source .venv/bin/activate
pip install pywebview "PySide6" qtpy        # vỏ Chromium (QtWebEngine); chỉ cho dev, chờ duyệt giấy phép để phát hành
```
Kiểm tra: `python3 --version` (≥3.11), `node --version` (≥20), `ls /Applications/LibreOffice.app/Contents/MacOS/soffice`.
Biến môi trường dùng thường xuyên:
- `VNOFFICE_SOFFICE_PATH=/Applications/LibreOffice.app/Contents/MacOS/soffice`
- `VNO_CDP_DEBUG_PORT=9222` — mở cổng gỡ lỗi Chromium để test tự động (xem M2).
- `VNO_APP_ROOT=<thư mục repo>` — các script kiểm thử chạy app từ thư mục này.

## 2. M1 — Chạy từ mã nguồn
**Mục tiêu:** `python main.py --app=writer` (và `sheet`, `slides`) mở được cửa sổ, giao diện hiện đủ; `npm test` xanh.
1. Chạy test giao diện thuần (không cần cửa sổ): `node tests/run-tests.js` → phải ra `KẾT QUẢ KIỂM THỬ: 3064/3064 PASS` (số có thể tăng).
2. Chạy test Python: `python3 -m unittest discover -s tests` — bài nào dính Windows sẽ lỗi; **ghi danh sách vào một tệp** `docs/MAC-PYTHON-TEST-BASELINE.md` (tên bài, lý do Windows-only) thay vì sửa/vô hiệu hóa bài. Mục tiêu là các bài còn lại đều xanh.
3. Chạy app: `python main.py --app=writer`. `main.py` tự khởi động máy chủ tĩnh nội bộ trên `127.0.0.1:8080` (dòng ~498–540, tự đổi cổng nếu bận), sau đó mở cửa sổ qua `webview.create_window` (~5362) và `webview.start` (~5436). Trên macOS cần chọn backend Qt: truyền `gui="qt"` khi gọi `webview.start` (đặt sau cờ nền tảng trong `os_services`, **không** rải `if sys.platform` vào `apps/` hay `platform/*.js`).
4. Những chỗ sẽ lỗi ngay khi chạy trên Mac (sửa theo bảng mục 3): `ctypes.windll` (SetCurrentProcessExplicitAppUserModelID ~5400, GetLocaleInfoEx ~5034, MessageBox ~5342), `msvcrt.locking` (khóa tệp).
**Xong khi:** 3 ứng dụng mở được cửa sổ, gõ chữ được, và `node tests/run-tests.js` xanh.

## 3. Bảng "chỗ Windows → việc cần làm trên Mac" (có số dòng tham chiếu)
| Chỗ trong mã | Việc Windows đang làm | Cách làm trên macOS |
|---|---|---|
| `main.py` ~5400, `platform/os_services/windows.py` | `SetCurrentProcessExplicitAppUserModelID`: biểu tượng/nhóm thanh tác vụ | Mac: đặt tên ứng dụng và biểu tượng Dock qua `Info.plist` của `.app`; trong `macos.py` `AppIdentity` có thể là no-op |
| `main.py` ~5034 | `GetLocaleInfoEx` đọc ngôn ngữ | Dùng `locale`/`Foundation` hoặc biến `LANG`; trả về cùng định dạng |
| `main.py` ~5342, `windows.py:59` | `MessageBoxW` báo lỗi khởi động | `osascript -e 'display dialog ...'` hoặc hộp Qt |
| `main.py` ~3464 | `os.startfile(folder)` | `subprocess.run(["open", path])` |
| `platform/single_instance.py` ~42–59, `platform/autorecover/store.py` ~152, `platform/process_lifecycle/process_tracker.py` ~210, `platform/performance/performance_log.py` ~26 | `msvcrt.locking` | `fcntl.flock` (cùng ý nghĩa khóa tệp); **một hàm khóa dùng chung** thay vì 4 bản |
| `platform/single_instance.py` | Một phiên bản chạy: khóa + điểm cuối JSON | Socket miền Unix trong thư mục dữ liệu; sự kiện mở tệp từ Finder/Dock (`QFileOpenEvent`) chuyển vào phiên đang chạy |
| `main.py` ~883–901, `adapters/libreoffice/common/soffice_uno_worker.py` ~33–43, ~420 | Chạy `python.exe` cạnh `soffice`, nối UNO qua **pipe tên**, cờ `CREATE_NO_WINDOW`, `ABOVE_NORMAL_PRIORITY_CLASS` | Mac: dùng Python của LibreOffice (`/Applications/LibreOffice.app/Contents/Resources/python`), nối UNO qua **socket** `--accept=socket,host=127.0.0.1,port=N;urp;` và `uno:socket,host=127.0.0.1,port=N;urp;StarOffice.ComponentContext`; bỏ cờ cửa sổ, ưu tiên bằng `os.nice` |
| `main.py` ~1069, `soffice_uno_worker.py` ~371 | `taskkill /PID <pid> /T /F` dọn cây tiến trình | `os.killpg` với nhóm tiến trình (`start_new_session=True`) hoặc `psutil`; **chỉ kill PID mình tạo, không kill theo tên** |
| `platform/process_lifecycle/process_tracker.py` | Theo dõi và dọn tiến trình con | Ghi file PID, dọn khi thoát và khi khởi động lại sau sự cố |
| `adapters/license/device.py` ~81 | Dấu vân tay máy từ `MachineGuid` trong registry | Mac: `ioreg -rd1 -c IOPlatformExpertDevice` lấy `IOPlatformUUID` rồi băm; gửi `platform=macos` |
| `adapters/install_migration.py` | Registry, liên kết tệp, lối tắt | Mac: `CFBundleDocumentTypes` trong `Info.plist`; không chiếm mặc định nếu người dùng không chọn |
| `adapters/updater/updater.py`, `apply-helper.ps1` | Áp dụng bản vá bằng PowerShell | Viết `apply_helper.py` Python thuần (giải gói vào `app-<ver>.staging`, kiểm băm, đổi tên nguyên tử, kiểm sức khỏe, hoàn tác khi lỗi); mã app nằm ở `~/Library/Application Support/VNOffice/app-<ver>/` |
| `platform/print/office_com.py` | Xuất PDF bằng Word/Excel COM | **Tắt trên Mac** bằng cờ khả năng `officeComExport=false`; dùng đường LibreOffice → PDF |
| `scripts/installer/*`, NSIS | Bộ cài `.exe` | `.dmg` (xem M7) |

## 4. Các mốc còn lại: lệnh và cách nghiệm thu
**M2 — Cổng gỡ lỗi (CDP) để test tự động.** `VNO_CDP_DEBUG_PORT=9222 python main.py --app=sheet` rồi `curl http://127.0.0.1:9222/json` phải ra danh sách trang. Bộ kiểm thử giao diện `tests/live/cdp/*.mjs` dùng cổng này: gửi **chuột và phím thật bằng CDP** (không dùng điều khiển hệ điều hành/AppleScript bấm phím). Nghiệm thu: chạy `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs` (bộ hồi quy 27 ca trên Windows) phải xanh; ca nào phụ thuộc Windows ghi N/A kèm lý do. Biến cần đặt: `VNO_APP_ROOT=<thư mục repo>` và `VNO_PYTHON=<python trong .venv>` (đừng đặt `VNO_CDP_LOCALAPPDATA` cho bộ này).
**M3 — Engine LibreOffice.** Mở/lưu được 3 tệp mẫu mỗi ứng dụng (dùng `tests/fixtures/real-office-samples/`). Đo thời gian mở lần đầu bằng hồ sơ dựng sẵn (mục tiêu ≤ 4 giây trên máy chuẩn). Hồ sơ dựng sẵn tạo **trên Mac** bằng `scripts/release/build-seed-profiles.py`.
**M4 — Độ trung thực.** Chạy bộ kiểm hiện có: `scripts/layout-audit/batch_document_audit.py` (`xlsx|docx|pptx`), cho phép chỉ định thư mục tệp mẫu. **Kết quả (số trang, giá trị ô, kiểu, hash) phải trùng bản chuẩn Windows**; chênh lệch là lỗi phải giải thích hoặc sửa. Các script đối chiếu với Office thật (`scripts/audit-0610/word_parallel/*.ps1`, COM) chỉ chạy trên máy Windows của người phụ trách; trên Mac chỉ chạy phần không COM.
**M5 — Dịch vụ hệ điều hành.** Hiện thực đủ 10 Protocol trong `platform/os_services/base.py` tại `macos.py` (đăng ký bằng `register_backend("darwin", "macos")` trong `platform/os_services/__init__.py`), kèm bảng phím macOS `platform/commands/keymap-macos.js` (Cmd thay Ctrl cho Sao chép/Dán/Lưu…; **giữ Ctrl** cho các lệnh Office Mac vẫn dùng Ctrl; tránh trùng phím hệ thống `Cmd+H/M/Q/,`), menu hệ thống tối thiểu (Giới thiệu, Tùy chọn, Ẩn, Thoát, Cửa sổ, Trợ giúp), gõ tiếng Việt Telex/VNI bằng bộ gõ có sẵn của macOS (kiểm tra sự kiện `compositionstart/update/end`).
**M6 — Cập nhật, báo lỗi, bản quyền.** Kênh cập nhật `platform=macos`; áp dụng vào `app-<ver>`; thử cố ý làm hỏng gói để thấy hoàn tác chạy; kích hoạt bản quyền ghi `platform=macos`.
**M7 — Đóng gói.** `.app` ký Developer ID + notarize + `stapler`, `.dmg` kéo-thả; thử trên **máy Mac sạch** (không có môi trường dev): cài, mở không cảnh báo Gatekeeper, gỡ sạch. **Không sửa tệp bên trong `.app` đã ký** khi cập nhật (xem SPEC mục 1.3).
**M8 — Trải nghiệm.** Retina, trackpad cuộn/thu phóng, chế độ tối, phông (đóng gói Carlito/Caladea; số trang phải khớp bản Windows ±0), độ nhạy bộ gõ; mỗi màn hình có ảnh chụp.

## 5. Cổng chất lượng cho **mọi** thay đổi (bắt buộc)
1. `node tests/run-tests.js` xanh; `python3 -m unittest discover -s tests` xanh (trừ danh sách Windows-only đã ghi).
2. Giao diện thay đổi → kiểm bằng chuột + phím thật qua CDP, kèm ảnh chụp trong PR.
3. Mọi tính năng mới/sửa: có hướng dẫn tiếng Việt trong app và i18n VI/EN (`platform/help/`, `platform/i18n/`).
4. Không viết `if platform == ...` trong `apps/` hay `platform/*.js`; dùng bảng khả năng (`capabilities`) và `os_services`.
5. Không commit tài liệu thật, khóa, mật khẩu. Không dùng phần mềm trả phí/độc quyền, không thêm dependency lớn hoặc copyleft khi chưa được duyệt.
6. Báo cáo trung thực: PASS / FAIL / NOT RUN / BLOCKED, kèm lệnh đã chạy.

## 6. Quy trình Git
- Làm trên nhánh `mac/<chủ-đề>` tách từ `platform/macos`, tạo Pull Request vào `platform/macos`.
- Phần **dùng chung** (ví dụ chuyển lời gọi `taskkill`/`msvcrt` sang `os_services`, thêm bảng `capabilities`) làm ở nhánh tách từ `main`, tạo PR vào `main` — người phụ trách duyệt vì ảnh hưởng Windows. Sau khi vào `main`, merge `main` vào `platform/macos`.
- Cập nhật định kỳ: `git fetch origin && git checkout platform/macos && git merge origin/main`.

## 7. Thứ tự khuyến nghị cho tuần đầu
1. Ngày 1: M0 + chạy `node tests/run-tests.js` trên Mac; ghi lại kết quả.
2. Ngày 2–3: M1 (chạy `main.py` bằng Qt), lập `MAC-PYTHON-TEST-BASELINE.md`.
3. Ngày 4–5: M2 (CDP) và đo thử M3 (mở/lưu một tệp mẫu mỗi ứng dụng).
4. Cuối tuần: báo cáo ngắn cho người phụ trách: đã xanh gì, đang kẹt gì, ước lượng M4–M8.

## 8. Khi vướng
Ghi lại: lệnh đã chạy, thông báo lỗi nguyên văn, hệ điều hành/phiên bản/chip, ảnh chụp. Hỏi người phụ trách khi cần quyết định về giấy phép, ký/notarize, hoặc đổi kiến trúc.
