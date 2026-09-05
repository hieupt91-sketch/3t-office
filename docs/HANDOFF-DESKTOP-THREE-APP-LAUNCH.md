# Agent Handoff

TASK: Desktop three-app launch, multi-process LibreOffice isolation, and Windows file associations

AGENT/ROLE: Codex / Desktop + Shared Platform

BRANCH: `feature/desktop-three-app-launch`

WORKTREE: `E:\VNOffice-codex-desktop-three-apps`

OBJECTIVE: Mở VN Writer, VN Sheet và VN Slides như ba ứng dụng desktop riêng; khóa chuyển app trong single-app mode; tự mở đúng app khi Explorer truyền đường dẫn tài liệu; giữ nguyên suite switcher trên web.

FINDINGS:

- Worktree được xác nhận sạch, đúng branch và cùng base commit `0bd859c` với `main` trước khi sửa.
- `_convert_lock` chỉ khóa trong một Python process. Profile LibreOffice cũ dùng chung nên Writer/Sheet ở hai process có thể tranh profile.
- Các adapter đã có luồng mở file thống nhất qua `common.file.open` → `globalUnoBridge.openRealFile()` → `VnOfficeApi.open_document_dialog()`. Initial file tái sử dụng luồng này, không sửa logic nghiệp vụ/file I/O adapter.
- Windows có thể giữ `UserChoice` hiện hữu cho một phần mở rộng. Script đăng ký ProgID/default/open command đầy đủ; installer thực phải hướng người dùng xác nhận Default Apps khi Windows bảo vệ lựa chọn cũ.

IMPLEMENTATION SUMMARY:

- `main.py` parse `--app=writer|sheet|slides` và một positional file path; suy luận app từ phần mở rộng; đặt URL/title theo app.
- Đường dẫn initial file được giữ trong Python API, URL chỉ mang `openFile=1`; sau khi app mount, frontend chạy lệnh mở file hiện hữu. API tiêu thụ đường dẫn đúng một lần, sau đó Ctrl+O trở lại hộp thoại native.
- LibreOffice dùng `lo-profile-writer`, `lo-profile-sheet`, `lo-profile-slides`, hoặc `lo-profile-shared` tùy launch context.
- `platform/bootstrap.js` quản lý launch context mặc định an toàn cho web suite.
- `AppShell` single-app không tạo `#vno-switcher-toggle`, `.vno-app-switcher-btn`, menu hoặc item chuyển app trong DOM. Mọi callback switch app đi qua `requestAppSwitch`; getter `onSwitchApp` cũng trả guarded callback, nên gọi trực tiếp không vượt khóa.
- Template và recent files trong single-app được giới hạn về app hiện tại. Web suite không tham số vẫn mở Writer và switcher hoạt động như trước.
- Registry script per-user đăng ký DOC/DOCX/ODT/RTF, XLS/XLSX/ODS/CSV, PPT/PPTX/ODP vào ba ProgID và command `"VNOffice.exe" "%1"`. Script không tự chạy trong dev.

FILES CHANGED:

- `main.py`
- `index.html`
- `platform/bootstrap.js`
- `platform/shell/app-shell.js`
- `scripts/register-file-associations.ps1`
- `scripts/verify-concurrent-soffice-profiles.py`
- `scripts/verify-desktop-multiprocess.ps1`
- `tests/test_desktop_launch.py`
- `tests/unit/desktop-launch-context.test.js`
- `tests/smoke/html-smoke.test.js`
- `tests/run-tests.js`
- `docs/HANDOFF-DESKTOP-THREE-APP-LAUNCH.md`

COMMANDS RUN:

```powershell
python -m unittest tests.test_desktop_launch -v
python -m py_compile main.py tests/test_desktop_launch.py
node scripts/check-syntax.js
node tests/run-tests.js
python scripts/verify-concurrent-soffice-profiles.py
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-desktop-multiprocess.ps1 -ObservationSeconds 8
```

BUILD RESULT: NOT RUN — repository không có bước build/package desktop; phase installer chưa tồn tại.

TEST RESULTS:

- PASS — Python desktop launch unit tests: 4/4.
- PASS — JavaScript syntax: 65/65 files.
- PASS — full suite: 707/707, 0 fail, 16.96 giây (dưới 60 giây).
- PASS — Edge headless DOM thật: web mode có switcher; `?app=sheet&singleApp=1` mount Sheet và không có switcher trong DOM.
- PASS — hai LibreOffice conversions thật chạy đồng thời trong hai Python process, tạo Writer PDF và Sheet PDF với profile riêng.
- PASS — pywebview Writer và Sheet chạy đồng thời trong hai Python process độc lập; cả hai còn sống sau 8 giây quan sát. Script tự đóng đúng hai process test, không dùng SendKeys.
- NOT RUN — registry association script không chạy trên máy dev để tránh thay đổi default application của người dùng.

MANUAL TEST ON WINDOWS:

1. Chạy local server trong terminal thứ nhất:

   ```powershell
   node scripts/serve.js
   ```

2. Chạy từng app hoặc hai app đồng thời trong terminal khác:

   ```powershell
   python main.py --app=writer
   python main.py --app=sheet
   python main.py --app=slides
   ```

   Xác nhận title Taskbar/Alt-Tab đúng app, switcher không tồn tại, và không thể đổi app qua callback shell.

3. Kiểm tra tự động đa process pywebview (không SendKeys):

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-desktop-multiprocess.ps1 -ObservationSeconds 8
   ```

4. Kiểm tra profile/conversion LibreOffice thật:

   ```powershell
   python scripts/verify-concurrent-soffice-profiles.py
   ```

   Kết quả phải tạo đồng thời hai PDF và in hai URI kết thúc bằng `lo-profile-writer` và `lo-profile-sheet`.

5. Sau khi phase packaging tạo `VNOffice.exe`, installer gọi một lần:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/register-file-associations.ps1 -ExecutablePath "C:\Program Files\VN Office\VNOffice.exe"
   ```

   Sau đó double-click một `.docx`, `.xlsx`, `.pptx` mẫu và xác nhận lần lượt mở VN Writer, VN Sheet, VN Slides cùng nội dung file. Lặp lại với ODT/ODS/ODP và legacy DOC/XLS/PPT nếu cần. Nếu Windows đã có `UserChoice`, chọn VN Office trong **Settings → Apps → Default apps** khi hệ điều hành yêu cầu xác nhận; không xóa cưỡng bức UserChoice.

KNOWN FAILURES: Không có test failure.

RISKS:

- Profile được tách theo app như yêu cầu; hai process cùng *một* app vẫn cùng profile. Nếu sản phẩm cần mở đồng thời nhiều process Writer (hoặc Sheet/Slides) và convert cùng lúc, cần bổ sung inter-process lock hoặc profile theo process/document trong phase hardening.
- Legacy `.doc/.xls/.ppt/.rtf` được định tuyến đúng app, nhưng mức fidelity vẫn phụ thuộc LibreOffice filters hiện hữu.
- Script registry dùng icon index 0 của executable. Ba icon shortcut riêng thuộc trách nhiệm phase packaging/installer.

DEPENDENCIES/BLOCKERS: Cần phase packaging tạo executable và ba Start Menu/Desktop shortcut truyền lần lượt `--app=writer`, `--app=sheet`, `--app=slides`; cần installer gọi registry script và xử lý UX Default Apps của Windows.

CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.

COMMITS:

- `fc5155c feat(desktop): add app-specific launch contexts`
- `dbdc50c feat(shell): enforce desktop single-app mode`
- `f9598bd feat(installer): register supported document associations`

NEXT ACTION: Review các commit độc lập; khi packaging sẵn sàng, tích hợp ba shortcut và gọi script registry. Không merge vào `main` trong task này.
