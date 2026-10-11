# Hướng dẫn cho team macOS — 3T Office (VN Office)

Tài liệu này giúp team nắm dự án và đưa ứng dụng lên macOS mà **không ảnh hưởng bản Windows**.

## 1. Đọc theo thứ tự
1. `AGENTS.md` — luật làm việc của dự án (bắt buộc, đọc hết mục 2, 4, 11, 12).
2. `docs/SPEC-PLATFORMS-AND-BRANCHES.md` — chia nhánh Git, quy tắc đồng bộ giữa Windows / macOS / mobile.
3. `docs/SPEC-MACOS-PORT.md` — **đặc tả chính để đưa lên macOS**: bảng chuyển đổi 21 thành phần, kiến trúc `.app`, mốc nghiệm thu.
4. `docs/HANDOFF-*.md` — trạng thái từng tính năng đã làm.

## 2. Tổng quan kiến trúc (ngắn)
- Ứng dụng desktop: `main.py` (Python + pywebview) tự khởi động mọi dịch vụ, gồm máy chủ tĩnh nội bộ `127.0.0.1` phục vụ giao diện. Chạy **ngoại tuyến**.
- Giao diện web: `apps/writer`, `apps/sheet`, `apps/slides`, dùng chung `platform/`.
- Cầu nối LibreOffice: `adapters/libreoffice/` (UI không gọi trực tiếp LibreOffice).
- `scripts/serve.js` (Node) **chỉ dành cho test tự động**, không dùng để chạy app thật.
- Mã riêng hệ điều hành chỉ được đặt ở `platform/os_services/<nền-tảng>.py` và `ports/<nền-tảng>/`. **Không** rải điều kiện theo hệ điều hành vào `apps/` hay `platform/*.js`.

## 3. Quy trình Git để không ảnh hưởng Windows
- `main` = lõi dùng chung + Windows. **Không đẩy thẳng thay đổi macOS vào `main`.**
- Làm việc trên nhánh `platform/macos`; mỗi chủ đề một nhánh con `mac/<chủ-đề>`, tạo Pull Request vào `platform/macos`.
- Sửa lỗi dùng chung: sửa ở `main` trước (qua PR), rồi merge `main` vào `platform/macos` để đồng bộ.
- Mỗi người/agent một nhánh + worktree riêng; không hai người cùng sửa một working tree.
- Không commit tài liệu thật của khách, khóa bí mật, mật khẩu. Thư mục `file test/` và `scratch*` đã bị `.gitignore`.

## 4. Chạy thử trên máy Mac (đường tắt)
Yêu cầu: Python 3.11+, Node.js 20+ (chỉ để chạy test), LibreOffice bản macOS (Intel hoặc Apple Silicon).
```bash
git clone <url-repo> && cd <thư-mục>
git checkout platform/macos
python3 -m venv .venv && source .venv/bin/activate
pip install pywebview            # backend: xem mục 1–2 trong SPEC-MACOS-PORT.md (khuyến nghị Chromium/Qt)
python3 main.py
```
Kiểm thử đơn vị (không cần COM/Windows): `npm test` và `python3 -m unittest discover tests`.
Các bài đối chiếu với Word/Excel/PowerPoint thật dùng COM → chỉ chạy trên Windows; trên Mac chỉ chạy các bộ không phụ thuộc COM.

## 5. Việc cần làm đầu tiên cho macOS (theo SPEC-MACOS-PORT.md, mục 2 và 5)
1. Cửa sổ + engine hiển thị (khuyến nghị Chromium/Qt; WKWebView làm hỏng hành vi soạn thảo `contenteditable`).
2. Kết nối LibreOffice qua socket UNO (`soffice` trong `LibreOffice.app`).
3. `platform/os_services/macos.py`: thư mục dữ liệu, một phiên bản chạy, dọn tiến trình theo PID (không kill theo tên).
4. Bảng phím macOS (Cmd thay Ctrl) tại `platform/commands/keymap-macos.js`.
5. Đóng gói `.app`/`.dmg`, ký Developer ID + notarize (cần tài khoản Apple Developer — do người phụ trách quyết định).

## 6. Điều cần xin phép người phụ trách trước khi làm
Đổi framework UI/build system; thêm dependency lớn; dependency copyleft (Qt/PySide6 LGPL cần ký duyệt); nhận dữ liệu tài liệu bằng AI/cloud; thao tác Git phá hủy (force push, reset --hard).

## 7. Quy tắc chất lượng
- Mọi tính năng mới kèm Hướng dẫn sử dụng tiếng Việt trong app (AGENTS.md mục 10) và i18n VI/EN.
- Không báo PASS khi chưa chạy test; báo rõ PASS / FAIL / NOT RUN / BLOCKED.
- Không dùng phần mềm trả phí/độc quyền làm dependency.

## 8. Về lịch sử Git của repo này
Repo này được tạo từ một **bản chụp sạch (không kèm lịch sử cũ)** để không mang theo tài liệu nội bộ của công ty. Lịch sử đầy đủ được giữ riêng ở bản sao lưu của người phụ trách.
