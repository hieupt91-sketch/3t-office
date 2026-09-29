# Agent Handoff

TASK: Thiết kế bộ icon ứng dụng (VN Writer, VN Sheet, VN Slides, VN Office), tạo SVG + ICO đa kích thước, tích hợp cửa sổ/taskbar/favicon và cập nhật script đóng gói pilot
AGENT/ROLE: agy / UI Designer & Platform Styling
BRANCH: `design/app-icons-agy`
WORKTREE: `E:\VNOffice-agy-icons`
OBJECTIVE:
- Thiết kế trọn bộ 3 icon ứng dụng (VN Writer, VN Sheet, VN Slides) và 1 icon bộ VN Office (suite) với phong cách trực quan thống nhất, hình khối riêng biệt (tuân thủ nghiêm ngặt AGENTS.md, không sao chép MS Office, LibreOffice, Google, WPS).
- Tối ưu nhận diện rõ ràng ở mọi kích thước nhỏ (16, 24, 32, 48, 64, 128, 256 px).
- Xuất SVG nguồn và tệp `.ico` chứa đầy đủ 7 kích thước chuẩn Windows vào `branding/icons/` bằng PowerShell System.Drawing (không thêm dependency mới, không dùng công cụ trả phí).
- Cập nhật `scripts/build-pilot.ps1` (ASCII only, PowerShell 5.1) để ưu tiên sao chép icon thật từ `branding/icons/`, giữ lại nhánh vẽ icon dự phòng.
- Đặt icon cửa sổ ứng dụng (thanh tiêu đề / taskbar) qua `pywebview.start(icon=...)` và Windows `SetCurrentProcessExplicitAppUserModelID` trong `main.py`, cùng favicon trong `index.html` cập nhật động theo app, đảm bảo 100% test pass.
- Xuất bộ ảnh bằng chứng thực tế tại thư mục ngoài repo: `C:\Users\3T Computer\AppData\Local\Temp\vno-icon-proof\`.

FINDINGS:
- Trong ứng dụng hiện tại (`platform/ui-kit/icons.js` và `platform/shell/app-shell.js`), thương hiệu VN Office sử dụng logo nền đỏ (`#C01E17`), chữ V vát góc vàng hoàng kim (`#F5B800`) và ngôi sao sáng trắng (`#FFFFFF`).
- Trước đây `scripts/build-pilot.ps1` chỉ tự vẽ icon tạm 64x64 dạng ô vuông màu + chữ cái đơn (W, S, P); thư mục `branding/` ban đầu trống.
- `pywebview` trên Windows (sử dụng WinForms backend qua Python.NET / WebView2) hỗ trợ nạp icon ứng dụng qua tham số `icon` của hàm `webview.start(icon=...)`. Khi truyền đường dẫn tệp `.ico`, WinForms gán `self.Icon = Icon(_state['icon'])`, tự động thiết lập cả icon trên thanh tiêu đề và nút ứng dụng trên Taskbar.
- Bổ sung `SetCurrentProcessExplicitAppUserModelID` qua Win32 Shell API giúp Windows 10/11 phân biệt rõ tiến trình từng ứng dụng (`VNOffice.Writer`, `VNOffice.Sheet`, `VNOffice.Slides`, `VNOffice.Suite`), không bị gom nhóm vào tiến trình Python chung và hiển thị đúng icon riêng biệt trên Taskbar.
- Định dạng `.ico` chuẩn chứa nhiều frame PNG 32-bpp ARGB ở các kích thước 16, 24, 32, 48, 64, 128, 256 px được Windows Vista/7/8/10/11 và thư viện GDI+ hỗ trợ trọn vẹn.

IMPLEMENTATION SUMMARY:
1. **Thiết kế ngôn ngữ thị giác & hình khối vector độc bản**:
   - **VN Office Suite (`vnoffice.svg`, `vnoffice.ico`)**: Nền Squircle bo góc màu đỏ sơn mài Việt Nam (Lacquer Red `#D32F2F` đến `#9A140F`), biểu tượng chữ "V" vát góc mạ vàng hoàng kim (`#FCD34D` - `#D97706`) và huy hiệu ngôi sao trắng tinh tế ở đỉnh trung tâm. Đồng bộ hoàn hảo với logo thương hiệu trên thanh tiêu đề ứng dụng.
   - **VN Writer (`writer.svg`, `writer.ico`)**: Nền Squircle xanh dương hoàng gia (`#1B6AB8` đến `#0B3C6E`), biểu tượng trang văn bản Folio trắng sắc nét với góc gập trên phải, 3 dải dòng đoạn văn bản phân cấp trực quan và ngòi bút vàng hoàng kim (`#F59E0B`) điểm nhấn ở chân trang.
   - **VN Sheet (`sheet.svg`, `sheet.ico`)**: Nền Squircle xanh lục bảo (`#16803D` đến `#0A5024`), thẻ bảng tính trắng sắc nét với hàng tiêu đề xanh lục, lưới phân chia cột/hàng, 3 cột biểu đồ phân tích tăng trưởng bậc thang và đường chỉ báo xu hướng vàng hoàng kim.
   - **VN Slides (`slides.svg`, `slides.ico`)**: Nền Squircle cam hoàng hôn rực rỡ (`#D9531E` đến `#8F260A`), màn chiếu thuyết trình tỉ lệ 16:9 sắc nét đặt trên chân giá đỡ, điểm nhấn tam giác trình chiếu / play beacon cam và các khối bố cục slide mẫu.
   - Cả 4 icon hoàn toàn tự thiết kế, không sao chép hay mô phỏng Microsoft Office, LibreOffice, Google Docs hay WPS Office.
2. **Bộ tạo icon tự động & đa kích thước (`branding/generate-icons.ps1`)**:
   - Sử dụng PowerShell 5.1 và `System.Drawing` thuần có sẵn trên Windows.
   - Render vector chất lượng cao (HighQuality AntiAlias, HighQualityBicubic, PixelOffsetMode) tại đúng 7 kích thước chuẩn: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256 px.
   - Tối ưu hóa đặc biệt ở kích thước siêu nhỏ (16x16, 24x24): căn chỉnh pixel integer, viền ngoài bo 2px, đường nét đậm rõ, loại bỏ bóng nhòe để hiển thị siêu sắc nét trên Taskbar và Detail View của Windows.
   - Đóng gói toàn bộ 7 frame PNG vào cấu trúc chuẩn ICONDIR / ICONDIRENTRY của Windows Icon format (.ico).
3. **Cập nhật script đóng gói (`scripts/build-pilot.ps1`)**:
   - Kiểm tra nếu `branding/icons/<app>.ico` (và `vnoffice.ico`) tồn tại thì sao chép trực tiếp vào thư mục `icons/` của gói phát hành.
   - Giữ nguyên nhánh vẽ icon dự phòng (fallback) nếu thiếu tệp thật.
   - Bảo toàn 100% ký tự ASCII để tương thích hoàn toàn với PowerShell 5.1 code page mặc định trên Windows.
4. **Tích hợp cửa sổ ứng dụng & Favicon**:
   - `main.py`: Bổ sung `".ico": "image/x-icon"` vào `_STATIC_MIME_OVERRIDES`.
   - `main.py`: Đặt `SetCurrentProcessExplicitAppUserModelID` cho Windows taskbar và truyền `icon=app_icon` vào `webview.start(...)`.
   - `index.html`: Bổ sung thẻ `<link rel="icon" id="vno-favicon" href="branding/icons/vnoffice.ico" type="image/x-icon">`, và trong hàm `switchApp(appType)` cập nhật favicon động tương ứng với ứng dụng đang mở (`branding/icons/${appType}.ico`).
5. **Bộ tạo ảnh chứng minh & kiểm thử (`branding/generate-proofs.ps1`)**:
   - Tạo shortcut thật Windows (`.lnk`) với `IconLocation` trỏ tới từng tệp `.ico`.
   - Xuất 4 tệp ảnh bằng chứng rõ nét ra thư mục tạm ngoài repo `C:\Users\3T Computer\AppData\Local\Temp\vno-icon-proof\`.

FILES CHANGED:
- `branding/icons/vnoffice.svg`: Tệp SVG nguồn icon bộ VN Office.
- `branding/icons/vnoffice.ico`: Tệp ICO đa kích thước (16, 24, 32, 48, 64, 128, 256 px).
- `branding/icons/writer.svg`: Tệp SVG nguồn icon VN Writer.
- `branding/icons/writer.ico`: Tệp ICO đa kích thước.
- `branding/icons/sheet.svg`: Tệp SVG nguồn icon VN Sheet.
- `branding/icons/sheet.ico`: Tệp ICO đa kích thước.
- `branding/icons/slides.svg`: Tệp SVG nguồn icon VN Slides.
- `branding/icons/slides.ico`: Tệp ICO đa kích thước.
- `branding/generate-icons.ps1`: Script PowerShell tạo toàn bộ SVG và ICO từ code vector thuần.
- `branding/generate-proofs.ps1`: Script PowerShell tạo shortcut Windows và xuất ảnh bằng chứng hiển thị icon.
- `scripts/build-pilot.ps1`: Cập nhật logic sao chép icon từ `branding/icons/` kèm nhánh fallback dự phòng (ASCII only).
- `main.py`: Bổ sung MIME type `.ico`, Windows AppUserModelID và nạp icon vào `webview.start`.
- `index.html`: Bổ sung thẻ favicon và cơ chế cập nhật favicon theo ứng dụng.
- `docs/HANDOFF-APP-ICONS.md`: Tài liệu handoff này.

PROOF SCREENSHOTS & ARTIFACTS:
Thư mục ngoài repo: `C:\Users\3T Computer\AppData\Local\Temp\vno-icon-proof\`
- `icon-resolutions-matrix.png` (49.2 KB): Bảng ma trận so sánh chi tiết cả 4 ứng dụng ở các kích thước 16x16, 24x24, 32x32, 48x48, 64x64 px trên nền tối Taskbar.
- `proof-taskbar-context.png` (9.9 KB): Mô phỏng thực tế thanh Taskbar Windows 11 hiển thị các nút ứng dụng VN Writer (trạng thái active), VN Sheet, VN Slides, VN Office ở kích thước 32x32 px.
- `proof-window-titlebar.png` (10.8 KB): Mô phỏng thực tế thanh tiêu đề cửa sổ ứng dụng Windows (Title bar) với icon góc trái 16x16 px sắc nét của từng ứng dụng.
- `proof-desktop-shortcuts.png` (13.4 KB): Mô phỏng thực tế các lối tắt màn hình chính (.lnk) ở kích thước 48x48 px kèm nhãn tên.
- `shortcuts/`: Thư mục chứa 4 shortcut Windows `.lnk` thật đã tạo và gán `IconLocation` thành công:
  - `VN Writer.lnk` -> `branding/icons/writer.ico`
  - `VN Sheet.lnk` -> `branding/icons/sheet.ico`
  - `VN Slides.lnk` -> `branding/icons/slides.ico`
  - `VN Office Suite.lnk` -> `branding/icons/vnoffice.ico`

COMMANDS RUN:
- `powershell -ExecutionPolicy Bypass -File branding\generate-icons.ps1`
- `powershell -ExecutionPolicy Bypass -File branding\generate-proofs.ps1`
- `python -m py_compile main.py`
- `python -m unittest tests.test_error_reporting -v`
- `node tests/run-tests.js`
- `git diff --check`

BUILD RESULT: PASS (Tạo icon, tệp SVG, tệp ICO đa kích thước và kiểm tra AST/ASCII script đóng gói thành công).
TEST RESULTS:
- PASS — `node tests/run-tests.js`:
  `==================================================`
  `KẾT QUẢ KIỂM THỬ: 2026/2026 PASS | 0 FAIL`
  `==================================================`
  `Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.`
- PASS — `python -m unittest tests.test_error_reporting -v`: `Ran 18 tests in 4.178s, OK`.
- PASS — `python -m py_compile main.py`: Biên dịch Python thành công không có lỗi.
- PASS — `git diff --check`: 0 lỗi cú pháp / whitespace / formatting.
- Không sử dụng Word/Excel COM trong toàn bộ quá trình thực hiện theo đúng yêu cầu đề bài.

KNOWN FAILURES: Không có. Toàn bộ 2026/2026 bài kiểm tra Node.js và unit tests Python đều đạt chuẩn.
RISKS: Không có rủi ro hồi quy. Nhánh fallback tạo icon tạm trong `scripts/build-pilot.ps1` vẫn được giữ nguyên đầy đủ để đảm bảo tính sẵn sàng cao.
DEPENDENCIES/BLOCKERS: Không thêm bất kỳ dependency npm/pip/Windows mới nào. Không dùng công cụ trả phí.
CORE PATCH ID (if any): Không có (không can thiệp LibreOffice Core).
NEXT ACTION: Handoff cho team phát hành để đóng gói thử nghiệm nội bộ (pilot). Giữ branch `design/app-icons-agy` không merge vào `main`.
