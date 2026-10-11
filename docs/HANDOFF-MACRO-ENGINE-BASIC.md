# HANDOFF: Macro cơ bản (ghi & phát lại thao tác) — tầng Engine

## Bối cảnh

Mục 1 trong danh sách tính năng còn thiếu (`docs/FEATURE-PARITY-ROADMAP.md`,
Tier 3 "Macro/Script cơ bản") — người dùng đã duyệt làm trước, không
cần chờ hạ tầng/chi phí gì (thuần local).

## Phát hiện quan trọng trước khi code

`platform/commands/command-bus.js` đã có sẵn `this._history` ghi lại
MỌI lệnh thực thi qua `execute()` — nhưng đây là bộ đệm xoay vòng tối
đa 100 mục phục vụ Diagnostics, KHÔNG phù hợp làm nền tảng Macro (cần
bắt đầu/kết thúc rõ ràng, lưu vĩnh viễn, không bị cắt bớt). Đã xây cơ
chế ghi RIÊNG (`_macroSteps`) thay vì tái dùng `_history`.

## Kiến trúc

1. **`platform/commands/command-bus.js`** (mở rộng, không đổi hành vi
   cũ): thêm `startMacroRecording()`/`stopMacroRecording()`/
   `isRecordingMacro()`. Trong `execute()`, khi đang ghi, mỗi lệnh THẬT
   được đẩy vào `_macroSteps` — TRỪ chính các lệnh `common.macro.*`
   (tránh tự ghi đè lên chính nó, ví dụ bấm "Dừng ghi" không được lọt
   vào macro đang ghi).
2. **`platform/commands/macro-manager.js`** (mới): `class MacroManager`
   — lưu trữ (localStorage, key `vno_macros`, tối đa 50 macro/app),
   `startRecording`/`stopRecording`/`saveMacro`/`getMacros`/
   `renameMacro`/`deleteMacro`/`runMacro` (phát lại tuần tự qua
   `commandBus.execute()`, dừng ngay và ném lỗi rõ ràng nếu 1 bước
   lỗi). Export singleton `globalMacroManager`.
3. **`platform/ui-kit/dialogs.js`** (mở rộng): thêm
   `showMacroManagerDialog()` — danh sách macro của app hiện tại, mỗi
   dòng có nút Chạy/Đổi tên/Xóa, dùng lại `trapFocus`/`showPromptDialog`/
   `showConfirmDialog` đã có sẵn.
4. **`platform/commands/command-definitions.js`**: 2 lệnh mới trong
   `COMMON_COMMANDS` — `common.macro.recordToggle` (Ctrl+Shift+R,
   toggle) và `common.macro.manager` (Alt+F8 — ĐÚNG phím tắt "View
   Macros" của Word thật, không tự bịa). Đã xác nhận qua
   `node tests/run-tests.js` (suite kiểm tra xung đột phím tắt) rằng
   không trùng với bất kỳ lệnh nào — đặc biệt tránh
   `Ctrl+Shift+M` (đã bị `writer.para.indentDec` — Giảm thụt lề — dùng
   trước, thử ban đầu rồi phát hiện trùng, đã đổi sang Alt+F8).
5. **`platform/shell/app-shell.js`**: bind handler cho 2 lệnh trên —
   bắt đầu ghi ngay lập tức (không hỏi tên trước), khi dừng ghi mới
   hỏi tên (`showPromptDialog`), macro rỗng (0 bước) thì báo và không
   lưu.
6. **`platform/ui-kit/icons.js`**: 4 icon SVG mới (`macroRecordStart`,
   `macroRecordStop`, `macroRun`, `macroManager`).

## Giới hạn trung thực đã biết (theo đúng phạm vi "Macro CƠ BẢN")

- **CHỈ ghi được lệnh đi qua Command Bus** (định dạng, chèn bảng, sort,
  đổi Page Setup, style đoạn văn, chèn hàng/cột...). **KHÔNG ghi được
  nội dung gõ tự do** — gõ chữ trực tiếp vào vùng soạn thảo là input
  trình duyệt gốc, không phát lệnh nào qua Command Bus cả. Ví dụ macro
  thực tế: "tô nền vàng + căn giữa + sort tăng dần" ghi lại hoàn hảo;
  "gõ sẵn 1 đoạn văn mẫu" thì KHÔNG ghi được nội dung gõ (chỉ ghi được
  nếu chèn qua 1 lệnh có sẵn, ví dụ trường Mail Merge).
- **Nếu 1 bước trong macro tự mở hộp thoại** (ví dụ Format Cells) mà
  không tự đóng ngay, phát lại sẽ dừng khựng chờ người dùng thao tác —
  không tự động điền hộ nội dung dialog. Phù hợp nhất với lệnh THI
  HÀNH TRỰC TIẾP (sort, tô màu, chèn hàng...).
- **Macro lưu riêng theo từng app** (Writer/Sheet/Slides) — không chạy
  chéo app vì mã lệnh có namespace riêng.
- KHÔNG phải ngôn ngữ script (không VBA, không IDE, không sửa tay
  từng bước sau khi ghi).

## CHƯA LÀM — bàn giao cho agy (UI)

**2 lệnh mới CHƯA được đặt vào bất kỳ tab Ribbon nào** — hiện chỉ gọi
được qua phím tắt (Ctrl+Shift+R, Alt+F8) hoặc trực tiếp qua Command
Bus. Cần:
1. Thêm nhóm "Macro" vào tab **Xem** (View) cho cả 3 app (đúng vị trí
   Word/Excel/PowerPoint thật đặt nhóm Macros) — 2 nút: Ghi Macro
   (đổi icon/label theo trạng thái `checked` khi đang ghi — icon
   `macroRecordStart`/`macroRecordStop` đã có sẵn) và Xem Macro.
2. Chỉ báo trực quan đang ghi (ví dụ chấm đỏ nhấp nháy trên status bar
   hoặc tiêu đề tab) — hiện chỉ có `this.setStatus?.()` cập nhật text
   thanh trạng thái, chưa có hiệu ứng thị giác nổi bật.
3. Kiểm tra bàn phím/accessibility cho `showMacroManagerDialog` mới
   (theo đúng phương pháp đã dùng ở
   `docs/HANDOFF-ACCESSIBILITY-KEYBOARD-NAV.md` — dialog này dùng
   `trapFocus` có sẵn nên NHIỀU KHẢ NĂNG đã ổn, nhưng cần xác nhận
   thật bằng Playwright, không đoán).

## Kiểm thử đã chạy (tầng Engine)

- `node scripts/check-syntax.js`: 90/90 PASS.
- `node tests/run-tests.js`: 1521/1521 PASS (thêm 9 unit test mới,
  suite 137, cover: ghi không tự lẫn lệnh điều khiển, cô lập theo app,
  không lưu macro rỗng, đổi tên/xóa, phát lại đúng thứ tự+tham số,
  báo lỗi rõ khi macro không tồn tại, chặn ghi chồng, hủy ghi).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS
  (không đổi gì về ribbon nên không có gì để hồi quy).
- Kiểm tra thủ công đầu-cuối qua Playwright thật (script tạm, không
  commit): ghi 2 lệnh sort thật trên Sheet → dừng ghi → đặt tên → xác
  nhận lưu đúng 2 bước đúng thứ tự → chạy lại qua `runMacro()` → xác
  nhận cả 2 lệnh thực thi lại đúng → mở Dialog Quản lý Macro → xác
  nhận liệt kê đúng → xóa qua dialog → xác nhận danh sách rỗng lại.
  **9/9 bước PASS, 0 lỗi JS.**

## Lỗi thật tự phát hiện và tự sửa trong lúc code (không phải AI ảo tưởng)

Lần đầu viết xong, script kiểm tra đầu-cuối phát hiện macro ghi được
**3 bước thay vì 2** — điều kiện loại trừ tự ghi đè
(`!commandId.startsWith("macro.")`) SAI vì command ID thật là
`"common.macro.recordToggle"` (bắt đầu bằng `"common.macro."`, không
phải `"macro."`) — đã sửa thành `!commandId.startsWith("common.macro.")`
và xác nhận lại bằng đúng kịch bản test đã bắt được lỗi.
