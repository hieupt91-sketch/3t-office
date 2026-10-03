# Spec — Đưa 3T Office lên macOS để chạy ĐÚNG như bản Windows

Ngày: 03/10/2026 · Nhánh: `platform/macos` (nhánh con `mac/<chủ-đề>`). Đọc trước: `docs/SPEC-PLATFORMS-AND-BRANCHES.md`.
Mục tiêu: người dùng macOS có Doc, Sheet, Slide **giống Windows về tính năng, hành vi soạn thảo và độ trung thực khi mở/lưu tài liệu**, chạy ngoại tuyến, cài đặt và cập nhật dễ như Windows. Đây là việc quan trọng: sai lệch nhỏ ở hành vi soạn thảo hoặc định dạng lưu sẽ làm mất tài liệu thật của khách.

## 1. Những điều đã chắc chắn / quyết định đề xuất

1. **Dùng chung gần như toàn bộ mã**: giao diện (`apps/`, `platform/*.js`), công thức, chính tả, cầu nối LibreOffice và lớp vá OOXML (Python thuần), máy chủ tĩnh nội bộ phục vụ giao diện (`localhost`), cập nhật có chữ ký, báo lỗi, bản quyền. LibreOffice có bản macOS (Intel + Apple Silicon).
2. **Engine hiển thị: khuyến nghị dùng Chromium trên macOS** (pywebview + Qt/QtWebEngine), **không dùng WKWebView của hệ thống**, vì:
   - Trình soạn thảo Doc dựa trên `contenteditable` + `execCommand` + `queryCommandState` + Selection API; WebKit và Chromium **khác nhau ở các chi tiết đó** (cách gói thẻ `<b>`, chuyển con trỏ qua phần tử, sự kiện nhập liệu composition cho gõ tiếng Việt, hành vi dán HTML). Toàn bộ 2.700 test và hàng trăm quyết định thiết kế hiện nay đã được kiểm bằng WebView2 (Chromium) — đổi sang WebKit tức là kiểm lại từ đầu và chắc chắn gặp lỗi mới.
   - Chromium trên macOS cho phép **kiểm thử tự động bằng CDP đúng như Windows** (cổng gỡ lỗi từ xa), nên tái dùng được toàn bộ bộ test giao diện hiện có (xem mục 9).
   - Đánh đổi: gói lớn hơn (~+150–250 MB), cần chấp thuận giấy phép **LGPL của Qt/PySide6** (quy tắc dự án: copyleft cần Người phụ trách ký duyệt — xem mục 11).
   - Phương án dự phòng (nếu không duyệt Qt): vỏ Chromium khác (CEF) hoặc WKWebView **kèm** chấp nhận chương trình kiểm lại hành vi soạn thảo — ước tính thêm 4–8 tuần.
3. **Cập nhật trên macOS KHÔNG sửa tệp trong `.app` đã ký.** Sửa bất kỳ tệp nào trong gói đã ký/công chứng làm hỏng chữ ký, và từ macOS 13 hệ điều hành còn chặn ứng dụng khác sửa gói ("App Management"). Kiến trúc đúng: `.app` ký sẵn chỉ gồm **vỏ + runtime Python + LibreOffice** (ít đổi), còn **mã ứng dụng (JS/Python của 3T) nằm trong `~/Library/Application Support/3T Office/app-<phiên bản>/`**; bản vá cập nhật thư mục này và vỏ chuyển trỏ sang phiên bản mới (đổi liên kết `current`). Cần phát hành bộ cài `.dmg` mới (chạy lại công chứng) chỉ khi đổi runtime/LibreOffice/vỏ.
4. **Khớp từng hành vi với Windows bằng chính các bộ kiểm chuẩn** (mục 8–9), không tự đánh giá "trông ổn".

## 2. Bảng chuyển đổi từng thành phần Windows → macOS

| # | Thành phần (Windows hiện tại, nơi trong mã) | Việc phải làm trên macOS | Ghi chú / rủi ro |
|---|---|---|---|
| 1 | Cửa sổ: `webview.create_window` + EdgeChromium (`main.py` ~4710) | pywebview với backend Qt (`gui="qt"`) hoặc vỏ Chromium; cùng `create_window`/`evaluate_js` | Kiểm tài khoản bàn phím, kéo-thả, đa cửa sổ (Tạo mới mở cửa sổ mới) |
| 2 | Phục vụ giao diện: `http.server` nội bộ cổng 8080 (`main.py` ~458) | Giữ nguyên | Chọn cổng tự do nếu 8080 bận; chỉ nghe `127.0.0.1` |
| 3 | Thư mục dữ liệu: `%LOCALAPPDATA%\VNOffice` (`_user_data_dir` đã có nhánh Darwin) | `~/Library/Application Support/VNOffice` (giữ tên thư mục để dùng chung mã), bản mã ứng dụng `app-<ver>` ở đó | Đường dẫn có dấu cách và Unicode: luôn dùng `pathlib`, không nối chuỗi |
| 4 | Engine: `soffice.exe`, hồ sơ UserInstallation, `soffice_uno_worker.py` (pipe UNO) | `LibreOffice.app/Contents/MacOS/soffice`; **Python của LibreOffice** (`Contents/Resources/python`) để `import uno`; kết nối UNO qua **socket `uno:socket,host=127.0.0.1,port=N`** (không dùng pipe tên Windows) | Mỗi ứng dụng một hồ sơ LibreOffice (đã có); dựng **hồ sơ làm sẵn riêng cho macOS** (mục 4 của SPEC cổng) vì cấu trúc khác |
| 5 | Khởi động engine song song, `NORMAL/ABOVE_NORMAL_PRIORITY_CLASS`, `CREATE_NO_WINDOW` | Dùng `subprocess` với `start_new_session=True`; ưu tiên bằng `os.nice`; không có cửa sổ console | Thay mọi hằng số `subprocess.CREATE_*` bằng hàm trong `os_services` |
| 6 | Theo dõi và dọn tiến trình: Job Object (`ctypes.windll`, `process_tracker.py`) | Nhóm tiến trình `os.setsid`/`killpg` + file PID; dọn khi thoát và khi khởi động lại sau sự cố; có thể dùng `psutil` (BSD) | **Không** kill theo tên (quy tắc dự án); chỉ kill PID mình tạo |
| 7 | Một phiên bản chạy (`single_instance.py`: khóa + JSON endpoint) | Socket miền Unix trong thư mục dữ liệu; sự kiện mở tệp của macOS (`QFileOpenEvent`/Apple Event `odoc`) chuyển vào phiên đang chạy | Mở nhiều tệp cùng lúc, mở tệp khi app đang khởi động |
| 8 | Biểu tượng/nhận dạng thanh tác vụ: `AppUserModelID`, `SHGetPropertyStoreForWindow`, launcher `.exe` | `.app` riêng cho **Doc.app, Sheet.app, Slide.app** (hoặc 1 bundle + 3 chế độ) với `CFBundleName`, `CFBundleIdentifier`, `.icns` riêng (đã có `.ico` — xuất `.icns`) | Dock hiển thị đúng tên/biểu tượng từng ứng dụng |
| 9 | Liên kết tệp, "Mở bằng": NSIS + registry (`install_migration.py`) | `Info.plist` khai `CFBundleDocumentTypes`/`UTType` cho docx, doc, odt, rtf, txt, xlsx, xls, ods, csv, pptx, ppt, odp; Launch Services; **không** chiếm mặc định nếu người dùng không chọn | Xuất/nhập UTI (`org.openxmlformats.wordprocessingml.document`…) |
| 10 | Bộ cài NSIS + `install-pilot.ps1` | `.dmg` (kéo vào Applications), ký **Developer ID**, **công chứng** (notarize), `stapler` | Cần tài khoản Apple Developer (xem mục 11); xây trên máy Mac |
| 11 | Áp dụng bản cập nhật: `apply-helper.ps1` (PowerShell), Job, hoàn tác khi lỗi | Hàm áp dụng bằng **Python thuần** (đã đủ trên Windows lẫn macOS): giải gói vào `app-<ver>.staging`, kiểm băm, đổi tên nguyên tử, thử khởi động sức khỏe, hoàn tác về bản trước nếu lỗi | Viết lại thành `apply_helper.py` dùng chung; PowerShell chỉ còn là vỏ gọi trên Windows |
| 12 | Nguồn cập nhật UNC (`\\192.168.1.252\…`) | Đường dẫn SMB đã gắn (`/Volumes/...`) hoặc HTTPS; thêm vào cấu hình nguồn | Nguồn Internet là chính trên macOS (`platform=macos`) |
| 13 | Phím tắt: `shortcut-manager.js` (đã coi `metaKey` như Ctrl khi ghép tổ hợp) | **Bảng phím theo nền tảng**: Cmd thay Ctrl cho Sao chép/Dán/Lưu…, giữ Ctrl cho các lệnh Office Mac vẫn dùng Ctrl (vd Thay thế `Ctrl+H`), tránh trùng phím hệ thống (`Cmd+H` Ẩn, `Cmd+M` Thu nhỏ, `Cmd+Q` Thoát, `Cmd+,` Tùy chọn) | Thêm mô-đun `platform/commands/keymap-macos.js` ở `main` (điểm mở rộng), có test từng tổ hợp |
| 14 | Menu: ribbon trong cửa sổ | Thêm **thanh menu hệ thống** tối thiểu (Giới thiệu, Tùy chọn, Ẩn, Thoát, Cửa sổ, Trợ giúp) vì macOS bắt buộc | Menu "Tệp/Sửa" của ribbon vẫn là giao diện chính |
| 15 | Gõ tiếng Việt: bộ gõ ngoài (Unikey/EVKey) với xử lý composition | Bộ gõ **có sẵn của macOS (Telex/VNI)** dùng IME gốc + sự kiện `compositionstart/update/end`; Unikey cho Mac cũng có | Kiểm thử gõ Telex/VNI trên Doc/Sheet/Slide; hoàn tác theo từ |
| 16 | Clipboard liên ứng dụng và dán từ Word/Excel/PowerPoint (`office-clipboard.js`) | Giữ mã web; thu thập **mẫu clipboard thật từ Office Mac** (HTML + RTF) làm fixture; so sánh với mẫu Windows | HTML của Office Mac khác chi tiết (thẻ `<o:p>`, đơn vị, `x:num`) |
| 17 | In: LibreOffice → PDF; in qua hộp thoại | In ra PDF bằng LibreOffice (đã dùng chung), in hệ thống qua CUPS (`lp`/hộp thoại in của Qt) | **Bỏ** đường "xuất PDF bằng Word/Excel COM" (`platform/print/office_com.py`) trên macOS — bật tính năng bằng cờ khả năng `officeComExport` |
| 18 | Phông chữ: Times New Roman, Calibri… trên Windows | macOS có Times New Roman, Arial, Cambria (nếu có Office); **đóng gói thêm** Carlito/Caladea (OFL, tương đương số đo Calibri/Cambria) và Be Vietnam Pro (đã có) | Số đo bố cục (xuống dòng/ngắt trang) phải khớp bản Windows ±0; có bài kiểm số trang |
| 19 | Dấu vân tay thiết bị (bản quyền) | Băm `IOPlatformUUID` (`ioreg -rd1 -c IOPlatformExpertDevice`) + tên máy | `platform=macos` trong `/license/activate` |
| 20 | Báo lỗi, tự khôi phục, hiệu năng (`platform_performance`) | Giữ; `ctypes.windll` trong `performance_log.py` → đo bằng `resource`/`psutil` | Đường dẫn log theo `~/Library/Logs/VNOffice` |
| 21 | Các script kiểm thử/kiểm định dùng Word/Excel COM, PowerShell, `taskkill` | Chạy **trên máy Windows** như hiện nay (kết quả chuẩn); trên macOS chỉ chạy bộ không phụ thuộc COM | Chuẩn so sánh luôn lấy từ Windows |

## 3. Kiến trúc đề xuất trên macOS
```
3T Office.dmg
 └─ 3T Office/ (thư mục cài)
     ├─ Doc.app     ┐ vỏ ký + công chứng, mỗi cái: launcher nhỏ + biểu tượng riêng
     ├─ Sheet.app   │  → gọi cùng một runtime
     ├─ Slide.app   ┘
     └─ Runtime/    Python (universal2 hoặc 2 bản arm64/x86_64) + PySide6/QtWebEngine + LibreOffice.app + phông
Dữ liệu người dùng: ~/Library/Application Support/VNOffice/app-<ver>/ (mã 3T, cập nhật được), hồ sơ LibreOffice, tài liệu khôi phục
```
Hợp đồng vỏ ↔ mã: vỏ chỉ biết đường tới `app-current/main.py`; mã 3T tự khởi động mọi dịch vụ trong tiến trình Python (nguyên tắc AGENTS.md).

## 4. Hồ sơ LibreOffice làm sẵn (seed) cho macOS
Cùng ý tưởng như Windows (`scripts/release/build-seed-profiles.py`): chạy một lần khi đóng gói để khởi tạo hồ sơ, sao chép vào lần chạy đầu. Hồ sơ macOS **tạo trên chính macOS** (đường dẫn, phông, phần mở rộng khác). Đo: mở lần đầu ≤ 4 giây trên máy chuẩn (mục tiêu như Windows).

## 5. Mốc triển khai và tiêu chí chấp nhận (làm tuần tự, mỗi mốc có cổng)

| Mốc | Nội dung | Cổng nghiệm thu |
|---|---|---|
| **M0** Chuẩn bị | Máy Mac (Apple Silicon + một máy Intel nếu cần), Xcode CLT, Python 3.12, Node, PySide6, LibreOffice macOS; tài khoản Apple Developer; kho `platform/macos`; tách `platform/os_services` trên `main` (xem SPEC-PLATFORMS) | Tách xong trên Windows không đổi hành vi: node + hồi quy CDP xanh |
| **M1** Chạy từ mã nguồn | `python main.py --app=writer/sheet/slides` mở cửa sổ; giao diện nạp; **test node chạy xanh y nguyên trên macOS** | 2.700+ test node xanh |
| **M2** Vỏ Chromium + CDP | Cổng gỡ lỗi từ xa bật qua biến môi trường; bài CDP khởi động/gõ phím/hồi quy chạy được | Bộ hồi quy 27 ca xanh (ca nào phụ thuộc Windows ghi N/A có lý do) |
| **M3** Engine | Worker UNO qua socket, mở/chuyển FODS/lưu; hồ sơ seed | Mở và lưu 3 tệp mẫu/ứng dụng; thời gian mở ≤ mục tiêu |
| **M4** Độ trung thực | Chạy bộ kiểm 28 file Excel + bộ Word + bộ PowerPoint **bằng đúng script hiện có** | Kết quả (số trang, số đoạn, giá trị ô, kiểu, hash nội dung các phần giữ nguyên) **trùng bản chuẩn Windows**; chênh lệch = lỗi phải giải thích hoặc sửa |
| **M5** Dịch vụ hệ điều hành | Dữ liệu, instance duy nhất, tiến trình, liên kết tệp, mở tệp từ Finder/Dock/kéo-thả, phím tắt Cmd, menu hệ thống, bộ gõ | Kịch bản tay + CDP; danh sách phím tắt ↔ lệnh được test |
| **M6** Cập nhật + báo lỗi + bản quyền | Kho `platform=macos`, áp dụng bản vá vào `app-<ver>`, hoàn tác khi lỗi, báo lỗi, kích hoạt key (`platform=macos`) | Đúng chuỗi: kiểm tra → tải → áp dụng → chạy lại; thử cố ý hỏng để thấy hoàn tác |
| **M7** Đóng gói | `.dmg`, ký Developer ID, công chứng, kiểm trên **máy Mac sạch** (không có môi trường dev) | Cài bằng kéo thả, mở không cảnh báo Gatekeeper, gỡ sạch |
| **M8** Rà soát trải nghiệm | Retina/độ phân giải cao, cuộn bằng trackpad, thu phóng cử chỉ, chế độ tối, phông, độ nhạy bộ gõ | Danh sách kiểm có ảnh chụp từng màn hình |

## 6. Mã cần đổi ở lõi dùng chung (làm ở `main`, có lợi cho cả Windows)
1. Tách `platform/os_services` (mục 3 của SPEC-PLATFORMS).
2. Bảng khả năng `capabilities` do vỏ cung cấp cho giao diện: `officeComExport`, `fileAssociations`, `systemMenuBar`, `dragOutFiles`… để giao diện ẩn/hiện tính năng, không rẽ nhánh theo tên hệ điều hành.
3. Bảng phím theo nền tảng (`keymap-<platform>.js`) thay vì sửa rải rác.
4. Mọi đường dẫn tệp trong mã: `pathlib`, không ghép `\`; mọi lệnh con: truyền danh sách tham số, không chuỗi shell; không giả định `.exe`.
5. `apply_helper.py` thay `apply-helper.ps1` (Windows vẫn gọi được).

## 7. Điểm dễ sai (cần kiểm riêng, đã biết từ kinh nghiệm Windows)
- **Cuộn/chọn ô, nút ribbon theo định dạng thật, đi qua ô gộp/hàng ẩn** — đã có bài CDP (`sheet-format-state`, `doc-format-state`…) → chạy lại trên macOS.
- **Lưu DOCX/XLSX/PPTX**: không mất đầu trang/chân trang, theo dõi thay đổi, ghi chú, danh sách `a)`/`i.`, mục lục, phương trình — bộ test round-trip có sẵn.
- **Dán từ Excel/Word thật** (phần trăm, ngày, giờ, bảng).
- **Đồng bộ clipboard giữa ba ứng dụng** và `Ctrl/Cmd+Z` một bước.
- **Mở file rất lớn** (lan14: 1,4 triệu ô): bộ nhớ macOS khác; chạy đo hiệu năng như Windows.
- **Đường dẫn Unicode/có dấu cách/tên tệp tiếng Việt chuẩn NFD của macOS** (macOS lưu tên tệp dạng phân rã — so sánh tên phải chuẩn hóa NFC).
- **Sandbox/quyền**: không bật App Sandbox; cần quyền "Files and Folders"; kiểm khi đọc từ ổ mạng/USB.
- **Hardened Runtime**: LibreOffice và Python gồm nhiều thư viện động — phải ký lại từng nhị phân và cấp quyền `com.apple.security.cs.allow-jit`/`allow-unsigned-executable-memory`/`disable-library-validation` đúng mức tối thiểu.

## 8. Bảng kiểm thử tương đương (mục tiêu: cùng bộ test, đổi lớp truyền lệnh)
| Bộ kiểm hiện có (Windows) | Macos |
|---|---|
| `node tests/run-tests.js` (đơn vị) | Chạy y nguyên |
| Python `tests/test_*.py` | Chạy nguyên (bỏ các ca chỉ Windows bằng `skipUnless`) |
| CDP trên WebView2: hồi quy 27 ca, dán chéo, giữ focus, thước, menu chuột phải, nút định dạng, gõ hàm, chuột | Chạy y nguyên qua CDP của Chromium/Qt (cổng `--remote-debugging-port` qua `QTWEBENGINE_REMOTE_DEBUGGING`) |
| Kiểm định độ trung thực (Excel 28 file, Word, PowerPoint) bằng Word/Excel COM làm "oracle" | **Dùng kết quả chuẩn đã tạo trên Windows** (lưu JSON chuẩn trong kho); macOS chỉ chạy phía 3T và so sánh với chuẩn |
| Kiểm cài đặt/cập nhật | Kịch bản riêng cho `.dmg`, `app-<ver>`, hoàn tác |

## 9. Kiểm thử giao diện tự động trên macOS (vì sao chọn Chromium)
Bài CDP dùng `Input.dispatchMouseEvent`/`dispatchKeyEvent` (sự kiện "đáng tin", không phải sự kiện giả bằng JS) và không gửi phím ở mức hệ điều hành (quy tắc dự án). Chỉ Chromium cung cấp điều này sẵn; WKWebView thì phải dùng Safari Web Inspector/`safaridriver` hoặc phím hệ thống (vi phạm quy tắc). Đây là lý do thứ hai (sau hành vi soạn thảo) để dùng Chromium trên macOS.

## 10. Phân công đề xuất
- **Claude (điều phối)**: viết/giữ spec, tách `os_services`, ma trận kiểm thử, kiểm kết quả từng mốc, quản lý nhánh `platform/macos`.
- **Codex**: M3–M4 (engine + độ trung thực) và `apply_helper.py` — việc cần suy luận sâu và đo số liệu.
- **agy**: M5 phím tắt/menu/giao diện, M8 rà soát giao diện, ảnh chụp; kiểm chứng kết quả thô.
- **opencode**: đo đạc và chạy bộ kiểm (chỉ đo, kèm tệp thô), không sửa mã.
- **Người phụ trách**: cung cấp máy Mac, tài khoản Apple Developer, duyệt giấy phép Qt.

## 11. Quyết định cần Người phụ trách (agy/Codex KHÔNG tự chọn)
1. **Engine hiển thị trên macOS**: Chromium qua Qt (đề xuất; cần duyệt giấy phép **LGPL** của PySide6/Qt) hay WKWebView (nhẹ hơn nhưng phải kiểm lại toàn bộ hành vi soạn thảo).
2. **Apple Developer Program** (khoảng 99 USD/năm) để ký và công chứng — không có thì người dùng nhận cảnh báo Gatekeeper và phải mở bằng tay.
3. **Phần cứng**: ít nhất 1 máy Mac Apple Silicon (xây dựng + chạy thử); máy Intel nếu muốn hỗ trợ; có thể thuê Mac trên đám mây để xây dựng/ký.
4. **Phạm vi bản macOS đầu**: bắt buộc đủ Doc, Sheet, Slide hay ra Doc + Sheet trước.
5. **Phân phối**: tải trực tiếp từ web 3T (đề xuất) hay thêm Mac App Store (khi đó bắt buộc App Sandbox + mua trong ứng dụng, thay đổi lớn kiến trúc).
