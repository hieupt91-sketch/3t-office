# Plan KEYS-1 — Bàn phím, Ctrl+nhấp, KeyTips/F1 trên macOS (24/10/2026)

Phiếu: `lead/parity-2410:docs/lead/KEYS-1-AGY.md` (gộp MAC-4, MAC-5, MAC-10, MAC-14). Agent: Claude.
Nhánh `mac/keys-cl-2410`, worktree `/Volumes/Data/Worktrees/mac-keys-cl-2410`, gốc `origin/vn-main` `cf557c86`.

## Objective
Trên macOS, Doc/Sheet/Slide dùng bàn phím và chuột theo quy ước người dùng Mac: Command là phím chính,
Control giữ cho các tổ hợp mà quy ước Mac dùng Control, không chiếm phím của hệ thống, Ctrl+nhấp/chạm hai
ngón mở menu ngữ cảnh, Option+kéo = sao chép, KeyTips/F1/thanh truy nhanh dùng được bằng bàn phím.
Hành vi Windows/Linux giữ nguyên 100 %.

## Current capability (đã kiểm trên vn-main cf557c86)
- `ShortcutManager` ghép `ctrlKey || metaKey` thành `CTRL+` → trên Mac cả Cmd lẫn Control đều chạy lệnh Ctrl;
  `Cmd+H/Cmd+M/Cmd+Space/Cmd+\`` bị lệnh app nuốt nếu tới được webview, Control+nhấp không mở menu riêng.
- Thả Option đơn bật KeyTips (xung đột nhập ký tự Option trên Mac). F1 là phím phương tiện mặc định trên Mac.
- `apps/sheet/sheet-grid.js`: chọn bổ sung / nhóm trang tính bằng `ctrlKey`, kéo sao chép bằng `ctrlKey||metaKey`.
  `apps/writer/writer-app.js`: kéo-thả chữ sao chép bằng `ctrlKey`.
- Commit `ca8e6280` (mac/keymap-1910) đã có `keymap-macos.js` 7 dòng + Help + unit + CDP: **cherry-pick sạch**.
- `525884d2` (chặn KeyTips khi nhả Option) và `652fc182` (phím chính ở lưới Sheet) nằm trên lịch sử cũ:
  không merge, áp lại bằng tay qua cờ capability (không dùng `isDarwin` rải rác).

## Thiết kế
1. `platform/commands/keymap-macos.js` (điểm khác biệt DUY NHẤT theo nền tảng):
   - `MACOS_KEYMAP`: một dòng cho MỌI tổ hợp đang khai báo trong `platform/commands/` (command-definitions +
     tổ hợp mặc định của ShortcutManager + alias), gồm `commandId, scope, windows, macos[]` (rỗng = Mac không
     gán phím, dùng ribbon), `task` (tên tiếng Việt cho Trợ giúp) và `source` (chỉ dùng cho tài liệu).
   - `MACOS_RESERVED_SHORTCUTS`: tổ hợp hệ thống macOS mà app không bao giờ chặn.
   - Cờ capability `getKeyboardCapabilities()` (`primaryModifier`, `controlClickIsSecondary`,
     `copyDragModifier`, `soloAltShowsKeyTips`, `keyTipsKey`, `helpAlternates`, `functionKeysNeedFn`) và hàm
     dùng chung `isPrimaryModifier`, `isAdditiveSelect`, `isCopyDrag`, `isCopyDragKey`, `isSecondaryClick`,
     `matchesShortcut`, `displayShortcut`. App gọi các hàm này, không tự kiểm tra hệ điều hành.
   - Nền tảng phát hiện một lần từ `navigator` của cửa sổ khi `ShortcutManager.attach()`; test truyền tay.
2. `shortcut-manager.js`: trên Mac dịch tổ hợp sự kiện → tổ hợp Windows qua bảng (theo scope), bỏ qua tổ hợp
   hệ thống, F10 bật KeyTips (mọi nền tảng, giống Office Windows), Option đơn không bật KeyTips trên Mac,
   `Cmd+?` mở Trợ giúp ngoài F1 (Fn+F1).
3. `platform/ui-kit/context-menu.js`: bộ chuẩn hóa nhấp phụ — trên Mac Control+nhấp trái được chuyển thành
   nhấp phải (chặn mousedown/pointerdown/click trái, phát lại bản nhấp phải) nên không chọn/nhóm nhầm; chạm
   hai ngón vốn là nhấp phải. Gắn một lần trong `platform/shell/app-shell.js`. Nhãn phím trong menu dùng
   `displayShortcut`.
4. `platform/shell/quick-access.js`: tooltip phím theo nền tảng; Shift+F10/phím Menu trên nút thanh truy nhanh.
5. `apps/sheet/sheet-grid.js`, `apps/writer/writer-app.js`: thay kiểm tra modifier cứng bằng hàm platform
   (Cmd+nhấp chọn bổ sung/nhóm trang tính, Cmd+mũi tên/Home/End, Option+kéo sao chép, Shift+kéo chèn giữ nguyên).
6. Trợ giúp: `platform/help/entries-macos-shortcuts.js` sinh bảng đầy đủ từ `MACOS_KEYMAP` theo Doc/Sheet/Slide
   (tác vụ → Mac → Windows) + mục Ctrl+nhấp/kéo-thả + mục KeyTips/F1/Fn; sửa `entries-retro-platform.js`
   (KeyTips) và `entries-sheet.js` (Cmd). i18n VI/EN cho chuỗi giao diện mới.
7. Tài liệu `docs/macos/KEYMAP-MACOS-2410.md`: bảng có cột nguồn.

## Nguồn cho cột "nguồn"
Tự động hóa Office for Mac đang BLOCKED (-1712) → không dùng osascript. Thứ tự: (a) chuỗi trong gói ứng dụng
Office for Mac đọc được trên đĩa (grep chỉ đọc, `plutil -convert xml1`), (b) Apple HIG / tài liệu phím tắt Mac
của Apple, (c) "chờ xác minh bằng Office for Mac". Không bịa nguồn.

## Files/modules
`platform/commands/keymap-macos.js`, `platform/commands/shortcut-manager.js`, `platform/ui-kit/context-menu.js`,
`platform/shell/quick-access.js`, `platform/shell/app-shell.js`, `platform/help/entries-macos-shortcuts.js`,
`platform/help/entries-retro-platform.js`, `platform/help/entries-sheet.js`, `platform/i18n/strings-{vi,en}.js`,
`apps/sheet/sheet-grid.js`, `apps/writer/writer-app.js`, `tests/unit/macos-keymap.test.js`,
`tests/live/cdp/macos-shortcuts.desktop.mjs`, `docs/macos/*`.

## Dependency
Không thêm phụ thuộc. Không sửa `adapters/**`, `main.py`, LibreOffice, build system, định dạng tệp.

## Risk
- Hồi quy Windows nếu dịch phím chạy nhầm khi không phải Mac → mặc định nền tảng `windows` khi không phát hiện được;
  toàn bộ test Windows hiện có phải giữ nguyên.
- Phát lại sự kiện nhấp phải (isTrusted=false) có thể khác thật ở vài handler → chỉ áp dụng khi nút trái + Control
  và không có Command; test đơn vị + CDP.
- Nguồn Office for Mac phần lớn chưa xác minh được (automation BLOCKED) → ghi rõ "chờ xác minh".
- 8 GB RAM: chạy CDP/pytest qua `heavy-lock.sh claude-keys`.

## Test plan
1. Mốc `npm test` trước khi sửa: **3776/3781 PASS, 5 FAIL** (xltx save, 2 probe Python Slides, FODS snapshot, overlay XLSX).
2. Unit `tests/unit/macos-keymap.test.js`: mỗi dòng bảng chạy đúng lệnh khi phát sự kiện Mac; không dòng nào trùng
   tổ hợp hệ thống; mọi tổ hợp khai báo đều có dòng; Windows không đổi; Ctrl+nhấp → nhấp phải; Option+kéo; KeyTips/F1.
3. `npm test` sau sửa ≥ mốc, không lỗi mới; `node scripts/audit-0610/i18n_parity.mjs` thiếu 0/lệch 0.
4. CDP macOS (`tests/live/cdp/macos-shortcuts.desktop.mjs`) qua khóa nặng; nếu không chạy được ghi NOT RUN/BLOCKED kèm lỗi thật.

## Rollback
Revert các commit KEYS-1 trên `mac/keys-cl-2410`; không có dữ liệu/định dạng cần di chuyển.
