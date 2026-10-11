# Kế hoạch Thực hiện: Đặt tính năng Macro vào Ribbon & Hoàn thiện UI

## 1. Mục tiêu (Objective)
Đưa tính năng Macro (đã hoàn thiện tầng engine ở `docs/HANDOFF-MACRO-ENGINE-BASIC.md`) lên giao diện người dùng (UI) chuẩn mực trên cả 3 ứng dụng VN Writer, VN Sheet, VN Slides:
1. **Đặt nhóm Macro vào tab "Xem" (View) trên Ribbon của cả 3 app**:
   - Thêm nhóm `{ id: "macro", label: "Macro", items: [...] }` ở cuối mảng `groups` của tab `view` trong `apps/writer/writer-ribbon.js`, `apps/sheet/sheet-ribbon.js`, và `apps/slides/slides-ribbon.js`.
   - Gồm 2 nút lớn (`isLarge: true`): `common.macro.recordToggle` ("Ghi Macro") và `common.macro.manager` ("Xem Macro").
2. **Icon & Label đổi động khi đang ghi (Record Toggle Button)**:
   - Khi bắt đầu ghi (`state.checked === true`): Nút đổi icon sang `macroRecordStop` (hình vuông đỏ Stop), đổi nhãn thành "Dừng ghi" (hoặc đa ngữ tiếng Anh "Stop Recording").
   - Khi dừng ghi (`state.checked === false`): Nút đổi về icon `macroRecordStart` và nhãn "Ghi Macro" ("Record Macro").
   - Tái dùng cơ chế `globalCommandBus.updateState` và mở rộng `subscribe` trong `createCommandButton` (`platform/ui-kit/components.js`) để cập nhật cả `iconSpan` khi `newState.icon` thay đổi.
3. **Chỉ báo trực quan khi đang ghi (Recording Visual Indicators)**:
   - Chấm đỏ nhấp nháy (CSS animation `@keyframes vno-macro-pulse`) ở góc trên phải nút Ghi Macro trên Ribbon khi đang ghi.
   - Thanh trạng thái hiển thị huy hiệu `vno-macro-status-indicator` với chấm đỏ nhấp nháy và text "Đang ghi Macro...".
   - Chỉ báo tinh tế trên tab Chế độ xem (`#vno-ribbon-tab-view`) khi người dùng đang ở tab khác trong lúc ghi.
   - Tất cả chỉ báo chỉ hiện khi đang ghi thật, tự tắt hoàn toàn khi dừng ghi, sử dụng `position: absolute` không làm dịch chuyển layout hay gây tràn ngang ở 1280px.
4. **Kiểm tra Accessibility cho Hộp thoại Quản lý Macro (`showMacroManagerDialog`)**:
   - Kiểm thử thực tế bằng Playwright: mở dialog, duyệt Tab qua các nút Chạy/Đổi tên/Xóa của từng dòng, Esc đóng, tiêu điểm khôi phục về phần tử kích hoạt ban đầu.
5. **Hướng dẫn sử dụng tiếng Việt (AGENTS.md §10)**:
   - Bổ sung bài hướng dẫn Macro vào `platform/help/entries-writer.js`, `entries-sheet.js`, `entries-slides.js`.
   - Nêu rõ các bước sử dụng và giới hạn trung thực (chỉ ghi thao tác qua Command Bus, không ghi gõ chữ tự do).
6. **Kiểm thử tự động hóa toàn diện**:
   - `scripts/check-syntax.js`: 90/90 PASS.
   - `tests/run-tests.js`: >= 1521 PASS.
   - `tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
   - Viết bài test mới `tests/live/macro-ribbon-ui.playwright.mjs` bao phủ toàn bộ luồng thao tác thật.

## 2. Hiện trạng & Tệp liên quan (Current State & Modules)
- Engine: `platform/commands/command-bus.js`, `platform/commands/macro-manager.js` (không sửa theo Safety Boundary).
- Handler: `platform/shell/app-shell.js` (cần cập nhật nhãn/icon và quản lý trạng thái hiển thị chỉ báo ghi).
- Component: `platform/ui-kit/components.js` (cần hỗ trợ cập nhật icon động trong `createCommandButton`).
- CSS: `platform/ui-kit/ui-kit.css` (thêm keyframes nhấp nháy và styles cho recording badge).
- Ribbon cấu hình: `apps/writer/writer-ribbon.js`, `apps/sheet/sheet-ribbon.js`, `apps/slides/slides-ribbon.js`.
- Ngôn ngữ: `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`.
- Trợ giúp: `platform/help/entries-writer.js`, `entries-sheet.js`, `entries-slides.js`.
- Bàn giao: `docs/HANDOFF-MACRO-RIBBON-UI.md`.

## 3. Rủi ro & Giải pháp (Risks & Mitigations)
- **Rủi ro tràn chiều ngang Ribbon ở 1280px**: Nhóm Macro chỉ gồm 2 nút lớn, đặt ở tab Xem (vốn là tab có ít nhóm nhất trên cả 3 ứng dụng). Ngoài ra các badge chỉ báo dùng `position: absolute`, không tăng kích thước hộp của Ribbon. Sẽ xác nhận lại 100% bằng `ribbon-audit-1280.playwright.mjs`.
- **Rủi ro xung đột phím tắt**: Giữ nguyên `Ctrl+Shift+R` và `Alt+F8` đã được kiểm chứng không xung đột.
- **Rủi ro rò rỉ trạng thái ghi**: Đảm bảo dọn dẹp trạng thái `vno-macro-is-recording` trong mọi trường hợp (kể cả khi người dùng bấm Hủy lưu macro hoặc macro rỗng).

## 4. Kế hoạch kiểm thử (Test Plan)
1. `node scripts/check-syntax.js`: Đạt 90/90 files PASS.
2. `node tests/run-tests.js`: Đạt tối thiểu 1521/1521 tests PASS.
3. `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS (cả 3 app ở 1280x800 và 1280x720, cả VI và EN).
4. `tests/live/macro-ribbon-ui.playwright.mjs`: Kiểm thử click Ribbon, đổi nhãn/icon, thao tác lệnh thật, lưu và chạy macro, bẫy tiêu điểm bàn phím và phím Esc.
