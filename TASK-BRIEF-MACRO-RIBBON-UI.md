# Nhiệm vụ: Đặt tính năng Macro (đã có sẵn engine) vào Ribbon + hoàn thiện UI

## Bối cảnh

Đã xây xong TOÀN BỘ tầng engine cho Macro cơ bản (ghi & phát lại thao
tác) — đọc kỹ `docs/HANDOFF-MACRO-ENGINE-BASIC.md` TRƯỚC KHI LÀM, đây
là tài liệu bàn giao đầy đủ, không cần đọc lại toàn bộ code từ đầu.

Tóm tắt đã có sẵn (KHÔNG cần code lại):
- 2 lệnh đã đăng ký: `common.macro.recordToggle` (Ctrl+Shift+R, toggle
  bắt đầu/dừng ghi) và `common.macro.manager` (Alt+F8, mở dialog quản
  lý).
- Handler đầy đủ trong `platform/shell/app-shell.js` — bắt đầu ghi
  ngay, dừng ghi thì hỏi tên qua `showPromptDialog`, macro rỗng thì
  báo không lưu.
- `platform/ui-kit/dialogs.js` có sẵn `showMacroManagerDialog()` —
  dialog liệt kê/chạy/đổi tên/xóa ĐÃ HOẠT ĐỘNG ĐẦY ĐỦ, đã test qua
  Playwright thật (xem handoff).
- 4 icon SVG có sẵn trong `platform/ui-kit/icons.js`: `macroRecordStart`,
  `macroRecordStop`, `macroRun`, `macroManager`.
- `node tests/run-tests.js` hiện tại: **1521/1521 PASS** (baseline
  trước khi bạn bắt đầu — chạy trước để xác nhận).

**Việc CỦA BẠN — thuần UI, không đụng logic đã có:**

## 1. Đặt 2 nút vào Ribbon tab "Xem" (View) — cả 3 app

Đúng vị trí Word/Excel/PowerPoint thật đặt nhóm "Macros" (cuối tab
View). Thêm nhóm mới `{ id: "macro", label: "Macro", items: [...] }`
vào cuối mảng `groups` của tab `view` trong CẢ 3 file:
- `apps/writer/writer-ribbon.js` (tab `id: "view"`, dòng ~648)
- `apps/sheet/sheet-ribbon.js` (tìm tab `id: "view"` tương tự)
- `apps/slides/slides-ribbon.js` (tìm tab `id: "view"` tương tự)

Nhóm gồm 2 nút: `{ type: "button", commandId: "common.macro.recordToggle", isLarge: true }`
và `{ type: "button", commandId: "common.macro.manager", isLarge: true }`
(tham khảo cú pháp các nút `isLarge` khác đã có trong cùng tab để đúng
định dạng).

## 2. Icon/label đổi động khi đang ghi (nút Record Toggle)

Hiện label/icon của `common.macro.recordToggle` cố định
("Ghi Macro" / `macroRecordStart`). Khi đang ghi (state.checked ===
true), cần đổi:
- Icon sang `macroRecordStop` (đã có sẵn, hình vuông đỏ = nút Stop).
- Label sang "Dừng ghi" (hoặc tương tự).

Tìm cơ chế UI đã dùng cho các nút toggle khác đổi hiển thị theo
`checked` (ví dụ `writer.trackChanges.toggle` hoặc tương tự — grep
`isToggle.*true` rồi xem nút đó cập nhật icon/label ở đâu khi state
đổi) và áp dụng tương tự cho macro. KHÔNG tự chế cơ chế mới nếu đã có
pattern sẵn.

## 3. Chỉ báo trực quan đang ghi (nổi bật hơn text status bar)

Hiện tại chỉ có `this.setStatus?.("Đang ghi Macro...")` cập nhật dòng
chữ ở thanh trạng thái — dễ bị bỏ qua. Thêm 1 chỉ báo thị giác rõ ràng
hơn khi đang ghi, ví dụ: chấm đỏ nhấp nháy (CSS animation) cạnh nút
Ghi Macro trên Ribbon, hoặc badge nhỏ trên tab đang active. Tự quyết
định cách làm đẹp/rõ nhất, miễn: (a) chỉ hiện khi đang ghi thật (dựa
vào `state.checked` hoặc `globalMacroManager.isRecording()`), (b) tự
tắt khi dừng ghi, (c) không phá layout ribbon ở 1280px (chạy lại
`ribbon-audit-1280.playwright.mjs` để xác nhận).

## 4. Kiểm tra Accessibility cho dialog mới

`showMacroManagerDialog` dùng lại `trapFocus` có sẵn (đã fix bởi bạn
ở nhiệm vụ trước, xem `docs/HANDOFF-ACCESSIBILITY-KEYBOARD-NAV.md`) —
NHIỀU KHẢ NĂNG đã hoạt động đúng vì tái dùng code cũ, nhưng PHẢI xác
nhận THẬT bằng Playwright (mở dialog, Tab qua các nút Chạy/Đổi
tên/Xóa của từng dòng, Esc đóng, focus quay lại đúng chỗ) — không
được giả định "chắc là ổn vì dùng code cũ". Nếu phát hiện lỗi, sửa
theo đúng pattern đã dùng trước đó.

## Kiểm thử bắt buộc

- `node scripts/check-syntax.js`: 90/90 PASS.
- `node tests/run-tests.js`: không giảm so với hiện tại (1521).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS (đặc
  biệt chú ý chỉ báo nhấp nháy không được làm tràn ngang ribbon).
- Viết 1 test Playwright mới (`tests/live/macro-ribbon-ui.playwright.mjs`
  hoặc tên tương tự): click nút Ghi Macro thật trên ribbon → icon/label
  đổi đúng → thực hiện 1-2 lệnh thật (ví dụ đổi màu chữ) → click Dừng
  → điền tên trong dialog thật → xác nhận macro xuất hiện trong dialog
  Quản lý Macro (mở qua Alt+F8 hoặc click nút) → chạy thử → xóa.
- Thêm bài Hướng dẫn sử dụng tiếng Việt vào `platform/help/entries-writer.js`/
  `entries-sheet.js`/`entries-slides.js` (theo AGENTS.md §10) — giải
  thích tính năng Macro là gì, cách ghi/chạy, VÀ NÊU RÕ giới hạn (không
  ghi được gõ chữ tự do — xem mục "Giới hạn trung thực" trong
  `docs/HANDOFF-MACRO-ENGINE-BASIC.md` để viết đúng, không hứa quá).
- Viết `docs/HANDOFF-MACRO-RIBBON-UI.md`.
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo.

## Ranh giới an toàn

- KHÔNG sửa `platform/commands/command-bus.js`,
  `platform/commands/macro-manager.js`, hay logic bên trong
  `showMacroManagerDialog()` trong `dialogs.js` (phần NỘI DUNG/LOGIC
  dialog) — CHỈ thêm CSS/hiệu ứng thị giác nếu cần, không đổi hành vi.
  Nếu phát hiện lỗi logic thật trong các file này, CHỈ báo cáo, không
  tự sửa.
- KHÔNG đổi phím tắt `Ctrl+Shift+R`/`Alt+F8` đã chọn (đã xác nhận
  không trùng lệnh nào khác).
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
