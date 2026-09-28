# TASK BRIEF — Rà soát thiết kế trực quan tab "Tệp" (Backstage) — Writer và Sheet (agy)

Worktree: `E:\VNOffice-agy-file-tab` (nhánh `design/writer-sheet-file-tab-agy`, tách từ `main`). Chỉ làm trong worktree này. Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` nếu cần mở app.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic mở/lưu/in/xuất file. Đọc các handoff trước (`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `HANDOFF-HOME-TAB-DESIGN.md`, `HANDOFF-INSERT-TAB-DESIGN.md`, `HANDOFF-REVIEW-TAB-DESIGN.md`, `HANDOFF-FORMULAS-TAB-DESIGN.md`, `HANDOFF-DATA-TAB-DESIGN.md`, `HANDOFF-VIEW-TAB-DESIGN-AGY.md`, `HANDOFF-REFERENCES-TAB-DESIGN-AGY.md`, `HANDOFF-MAILINGS-TAB-DESIGN-AGY.md`, `HANDOFF-DESIGN-TAB-DESIGN-AGY.md`, và `HANDOFF-BACKSTAGE-PRINT-THUMBNAIL.md`) để nắm phương pháp và các lỗi thường gặp (raw command-id, icon fallback chấm tròn, tràn ngang, focus bàn phím trong dialog, WCAG AA sáng + Tối, nút chết, Help sai tên).

**Bài học vòng Thiết kế (bắt buộc kiểm tra):** trong mọi danh sách chọn bằng phím mũi tên (ô màu, gallery, danh sách mẫu, danh sách tệp gần đây), Enter/Space phải áp dụng ĐÚNG mục đang focus, không phải mục chọn trước đó. Viết test Playwright bấm phím thật cho từng danh sách.

## Việc — Tab Tệp (Backstage) của VN Writer và VN Sheet (`platform/shell/app-shell.js`, `platform/shell/shell.css`)

### Office 2016 Backstage (Word/Excel)
Info (thông tin tệp, Protect, Inspect, Versions), New (mẫu trống + mẫu), Open (Recent / This PC / Browse; danh sách tệp gần đây có ghim), Save / Save As (chọn thư mục, định dạng), Print (máy in, thiết lập trang, xem trước bên phải, số bản, phạm vi trang), Share, Export (PDF, đổi loại tệp), Close, Account, Options, Feedback. Phím: Alt+F mở, Esc hoặc nút mũi tên quay lại đóng Backstage và trả focus về tài liệu; Ctrl+O/Ctrl+S/Ctrl+P/F12.

Ghi lại đúng những gì VN Writer/Sheet ĐÃ CÓ (không giả định, không tự thêm tính năng mới; mục chưa có ghi vào handoff "Khoảng trống so với Office"). Không thêm gì cần mạng (app chạy offline là ưu tiên số 1; phần Cloud/tài khoản đã được người phụ trách tạm gác — không động vào).

### Rà soát
- Điều hướng bàn phím toàn Backstage: Tab/mũi tên giữa các mục bên trái, Enter mở, Esc đóng và trả focus; focus luôn nhìn thấy được.
- Trạng thái: danh sách gần đây rỗng, tệp gần đây không còn tồn tại (thông báo tiếng Việt rõ, cho phép gỡ khỏi danh sách), đang lưu/đang in (loading), lỗi lưu/in.
- Xem trước in: cập nhật khi đổi thiết lập, không nhảy bố cục.
- Chế độ Tối: mọi chữ/nút/viền đạt WCAG AA; xem trước trang in giữ nền trắng của tài liệu.
- Help tiếng Việt khớp đúng tên mục trong Backstage của từng app (AGENTS.md mục 10).
- Mọi nút có handler thật.

## Test / xác nhận trước khi bàn giao
- `node tests/run-tests.js` foreground (xem số hiện tại trên `main`; nếu 4 test soffice Sheet FODS/Pivot/height-width/textRotation FAIL vì soffice khởi động chậm thì so với `main` và ghi BLOCKED môi trường — không sửa test, không tăng timeout).
- Viết `tests/live/file-tab-backstage.playwright.mjs` cho `?app=writer` và `?app=sheet`: Alt+F mở / Esc đóng + trả focus, điều hướng mũi tên + Enter mở đúng mục, không raw command-id, không icon fallback, không tràn ngang 1440/1024px, tương phản chế độ Tối, 0 pageerror.
- **KHÔNG commit ảnh chụp màn hình (.png).**

## Luật cứng
Không đụng logic. Không đụng file agent khác đang sửa song song: `adapters/**`, `main.py`, `scripts/layout-audit/*`, `apps/sheet/sheet-grid.js`. Không commit/copy tài liệu Office thật. Commit tiền tố `design(ui): …`, commit sau mỗi bước nhỏ. Không rebase/force. KHÔNG chạy tác vụ ở nền rồi ngồi chờ — mọi lệnh foreground. Không merge vào `main`.

## Bàn giao
`docs/HANDOFF-FILE-TAB-DESIGN-AGY.md`: cùng cấu trúc các handoff trước, PASS/FAIL/NOT RUN/BLOCKED trung thực.
