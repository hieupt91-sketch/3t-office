# Thông tin cho team macOS — thay đổi từ 0.9.11 đến 17/10/2026 và danh sách việc giao

Đọc cùng `docs/BAN-GIAO-MAC.md` (mốc 0.9.10), `docs/THONG-TIN-TEAM-MAC-0.9.11.md` (13/10) và `docs/SPEC-MACOS-PORT.md`. Tài liệu này chỉ nói **thay đổi sau 13/10** (khoảng 180 commit trên `main`) và **việc team Mac cần làm**. Số liệu đo ngày 17/10/2026 trên máy Windows của người phụ trách.

## 0. Việc đầu tiên: lấy mã mới
- Bản chụp công khai cho Mac hiện dừng ở mốc 0.9.10/0.9.11. Phần dưới đây **chưa nằm trong bản chụp** cho đến khi người phụ trách phát hành 0.9.12 và chạy `scripts/release/sync-public-snapshot.ps1` (cần người phụ trách duyệt phát hành; agent không tự đẩy). Khi có bản chụp mới: `git fetch && git merge origin/main` vào `platform/macos`.
- Mốc kiểm thử cần đạt sau khi gộp: `npm test` **3546/3546** (Node, không phụ thuộc hệ điều hành). Python: chạy `python -m unittest discover -s tests`, ghi lại số bài và bài nào lỗi vì môi trường macOS (đừng sửa bài để cho xanh).

## 1. Thay đổi dùng chung đã vào `main` (Mac nhận qua merge, không viết lại)
**Sheet (đối chiếu Excel 2016 thật trên Windows):**
- Bảng (ListObject): thêm/xóa hàng-cột, hàng tổng, đổi kích thước, tham chiếu có cấu trúc `[Cột]`, `[@Cột]`; Slicer cho Bảng (`apps/sheet/table-slicer.js`); kiểu bảng "sống" với 7 tùy chọn kiểu và 21 kiểu (đang gộp).
- Điền: Bộ lọc nâng cao, nhóm trang tính + Điền trên các trang, Điền > Căn đều, chốt điền (nhấp đúp, nút Tùy chọn Tự điền), kéo-thả viền ô (di chuyển / sao chép / chèn).
- Tùy chọn tính toán (tính lặp, độ chính xác như hiển thị, hệ ngày 1904, kiểu tham chiếu R1C1, chế độ tính tay/tự động); liên kết ngoài giữa các sổ + hộp thoại Chỉnh sửa liên kết; PivotTable: đổi nguồn, nhóm số/ngày, trường tính toán.
- Sắp xếp đối tượng (đưa lên/xuống, căn, phân bố, nhóm, xoay/lật, Ngăn chọn); menu chuột phải cho hình / ảnh / hộp văn bản / biểu đồ.
- Định dạng có điều kiện và xác thực dữ liệu khớp Excel (bộ chuẩn `tests/functions/cf-golden-1.json`, `dv-golden-1.json`).
- **Lỗi engine nghiêm trọng đã sửa:** `=ROW()` / `=COLUMN()` không đối số luôn trả 1; hằng mảng `{1,2,3}` trước đây hỏng (`SUM({1,2,3})` ra 2). Hằng mảng nay chạy qua "trang tính ảo" nội bộ (`formula-engine.js`: `_materializeArrayConstants`).
- Lưu thành mẫu **`.xltx`** (`main.py`: `FORMAT_FILTERS`, `_convert_xlsx_to_template`).
**Nền tảng dùng chung:**
- **Thanh công cụ truy nhanh tùy biến** (`platform/shell/quick-access.js`): chuột phải nút trên ribbon → "Thêm vào Thanh công cụ truy nhanh"; lưu theo từng app trong `localStorage` (khóa `vno.quickAccess.v1.<app>`).
- Ma trận Hoàn tác / Làm lại cho 229 lệnh Writer (`tests/live/cdp/writer-undo-matrix-full.desktop.mjs`); sửa 3 lỗi hành chính Writer (cỡ chữ 13 pt, danh sách Điều/Khoản/Điểm, ngắt section).
- Ô trống tính là 0 trong định dạng có điều kiện; so sánh chữ không phân biệt hoa thường (khớp Excel).
- Script `scripts/audit-0610/i18n_parity.mjs`: kiểm khóa VI/EN đủ và cùng tập placeholder (đang VI = EN = 2.655 khóa, 0 thiếu). **Chạy trước mỗi lần gộp.**

## 2. Việc giao cho team Mac (làm theo thứ tự; mỗi việc có tiêu chí XONG)
| Mã | Việc | Tệp liên quan | XONG khi |
|---|---|---|---|
| MAC-1 | Gộp bản chụp mới vào `platform/macos`, chạy `npm test` + Python, ghi số bài và bài lỗi do macOS | — | `npm test` 3546/3546; danh sách bài Python lỗi kèm nguyên nhân |
| MAC-2 | `reveal_path` trong `platform/os_services/macos.py` (`open -R`) + test theo mẫu `tests/test_os_services_reveal.py` (nợ từ 13/10) | `platform/os_services/` | test xanh trên macOS |
| MAC-3 | Hộp thoại Lưu/Mở của pywebview trên macOS với bộ lọc tệp mới: thêm `.xltx/.xlt` (Mở) và "Mẫu bảng tính (*.xltx)" (Lưu); kiểm lưu `.xltx` rồi mở lại; đăng ký kiểu tệp (UTI) cho `.xltx/.xlt` trong Info.plist | `main.py` (`SAVE_FILE_TYPES`, `OPEN_FILE_TYPES`, `FILE_APP_KINDS`) | lưu mẫu và mở lại đúng trên macOS |
| MAC-4 | Phím tắt: ánh xạ Ctrl→Cmd theo quy ước macOS cho phím mới: Shift+F10 / phím Menu (menu ngữ cảnh), Ctrl+Alt+F5 (làm mới liên kết), Ctrl+nhấp tab (nhóm trang tính), Ctrl+Alt+V (dán đặc biệt); kéo-thả: **Option+kéo = sao chép** thay Ctrl+kéo, Shift+kéo = chèn | `platform/commands/shortcut-manager.js`, `apps/sheet/sheet-grid.js` | bảng phím macOS được ghi trong Trợ giúp; test CDP trên macOS |
| MAC-5 | Chuột phải trên macOS: Ctrl+nhấp và chạm hai ngón phải sinh sự kiện `contextmenu`; kiểm menu ô, hình/ảnh/hộp văn bản, thanh truy nhanh | `platform/ui-kit/context-menu.js`, `platform/shell/quick-access.js` | CDP macOS tương đương `quick-access.desktop.mjs`, `sheet-context-menu-objects.desktop.mjs` |
| MAC-6 | **Chạy kiểm thử giao diện tự động trên macOS:** `tests/live/cdp/session.mjs` hiện chỉ có đường WebView2 (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`). Viết nhánh macOS (Chromium/Qt WebEngine cổng gỡ lỗi, SPEC mục 9) rồi chạy: `quick-access.desktop.mjs {sheet,writer,slides}` (mong đợi 15/15 mỗi app), `writer-undo-matrix-full.desktop.mjs` (127 PASS / 0 FAIL), `doc_admin_30.mjs` (29 PASS, 1 BLOCKED in hai mặt) | `tests/live/cdp/session.mjs` | ba bộ trên chạy được trên macOS với kết quả ghi lại |
| MAC-7 | Đường in: trên Windows dùng Office COM khi có, nếu không thì LibreOffice. macOS không có COM: xác nhận `platform/print/print_pipeline.py` rơi đúng về LibreOffice + hộp thoại in của macOS; kiểm bản xem trước in và số trang trên 5 tệp mẫu `tests/fixtures/` | `platform/print/print_pipeline.py` | số trang khớp bản PDF LibreOffice; không lỗi |
| MAC-8 | Bộ áp dụng bản vá cập nhật bằng Python thuần (thay `apply-helper.ps1`) + đóng gói `.app/.dmg` (SPEC mục 2–3) | `adapters/updater/` | nâng cấp 0.9.x → bản mới chạy được trên macOS; bản vá ký đúng |
| MAC-9 | Phông chữ: nhiều mẫu dùng Times New Roman, Calibri, Arial; xác định bản thay thế khi máy Mac thiếu phông và kiểm số trang/bố cục không vỡ trên `d01, d03, d06, d07, d13` | `adapters/libreoffice/` | báo cáo so sánh số trang với Windows (19, 1, 3, 23, 10) và danh sách phông thay thế |
| MAC-10 | Kiểm Trợ giúp F1 / thanh truy nhanh / KeyTips hoạt động bằng bàn phím trên macOS (focus, thứ tự Tab) | `platform/ribbon/keytips.js` | bảng kiểm tay có ảnh chụp |

**Không làm trên Mac:** bộ đối chiếu Excel/Word thật (`*.ps1`, `structural_oracle`, `function_oracle`, `batch_document_audit.py`) — cần COM, chỉ chạy được trên máy Windows của người phụ trách. Mac dùng các bộ chuẩn đã lưu: `tests/functions/golden-*.json` (15 tệp, **1.470 ca** từ Excel thật), `cf-golden-1.json`, `dv-golden-1.json`. Đừng sửa giá trị trong các tệp này để cho xanh.

## 3. Quy tắc làm việc cho agent của team Mac (nhắc lại và bổ sung)
- Mã dùng chung sửa ở `main` trước. Mã riêng hệ điều hành chỉ ở `platform/os_services/macos.py` và `ports/macos/`. Không rải điều kiện theo hệ điều hành vào `apps/` hay `platform/*.js`.
- Mỗi agent một nhánh `mac/<chủ-đề>` và một worktree riêng; không hai agent trong một working tree.
- Không báo PASS khi chưa chạy: dùng PASS / FAIL / NOT RUN / BLOCKED kèm số liệu thật; không vô hiệu hóa test, không đổi giá trị mong đợi để cho xanh.
- Kiểm giao diện chỉ qua CDP (chuột/phím thật trong trang), **không** dùng AppleScript/`cliclick`/điều khiển hệ điều hành để gõ phím.
- Không kill tiến trình theo tên; chỉ theo PID do chính bạn tạo.
- Không commit tài liệu thật, khóa ký, mật khẩu, token.
- Tính năng mới kèm Trợ giúp tiếng Việt + chuỗi i18n VI/EN; không dùng tên sản phẩm của hãng khác trong Trợ giúp/i18n/hộp thoại (có test chặn). Chạy `node scripts/audit-0610/i18n_parity.mjs` trước khi gộp.
- Báo cáo: 3–5 dòng, số liệu thật, nêu tệp đã đổi và việc cần người phụ trách kiểm.

## 4. Quyết định cần người phụ trách (agent Mac không tự chọn)
Giấy phép Qt/PySide6 (LGPL); tài khoản Apple Developer, ký và notarize; mọi dependency lớn; mọi dữ liệu gửi AI/cloud; thời điểm phát hành 0.9.12 và đẩy bản chụp công khai.
