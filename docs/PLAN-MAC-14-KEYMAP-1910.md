# Plan MAC-14 — phím tắt macOS (19/10/2026)

## Objective

Ánh xạ và kiểm chứng các phím mới trên macOS bằng `Cmd` thay cho `Ctrl`, giữ nguyên hành vi Windows và bổ sung bảng phím macOS trong Trợ giúp: Tiêu đề 1/2/3, danh sách đầu dòng/bộ lọc, Ngăn chọn và Theo dõi thay đổi.

## Current capability

`ShortcutManager` đã chuẩn hóa `metaKey` cùng nhóm với `ctrlKey`, nên nhiều phím `Cmd` chạy được nhưng chưa có bảng keymap macOS chính thức, API hiển thị tổ hợp theo nền tảng hoặc test đầy đủ theo scope. MAC-4 cũng dùng cơ chế này cho một số phím; phần kéo-thả và lệnh Sheet riêng không thuộc phạm vi thay đổi của task này.

## Files/modules

- `platform/commands/keymap-macos.js`: bảng phím macOS và hàm hiển thị `Ctrl` → `Cmd`.
- `platform/commands/shortcut-manager.js`: tái dùng bảng để xác định modifier chính, không đổi command ID hay scope.
- `platform/help/`: Help chung bằng tiếng Việt, mô tả rõ phím theo từng ứng dụng.
- `platform/i18n/strings-{vi,en}.js`: nhãn/tooltip phím tắt macOS đối xứng VI/EN.
- `tests/unit/`: kiểm mapping, scope, Windows compatibility và Help.

## Dependencies

Không thêm dependency. Không sửa LibreOffice Core, build system, định dạng tệp hoặc security boundary.

## Risks

- `Ctrl` và `Cmd` có thể bị trộn làm phím hệ thống macOS bị chặn.
- Tổ hợp trùng giữa Writer và Sheet (`Cmd+Shift+L`) có thể chạy sai app nếu scope không được giữ.
- Thay chuẩn hóa phím có thể làm hồi quy Windows.

## Test plan

1. Unit: sự kiện `metaKey` gọi đúng command theo scope Writer/Sheet/Slides.
2. Unit: sự kiện `ctrlKey` Windows vẫn gọi đúng command.
3. Unit: bảng macOS/Help chứa đủ tổ hợp và không ánh xạ `Alt+F10` sai thành Cmd.
4. Chạy focused runner, i18n parity và `npm test`.
5. CDP macOS nếu runtime CDP đang sẵn sàng; không dùng AppleScript/`cliclick`.

## Rollback

Revert commit MAC-14; không có migration dữ liệu hoặc thay đổi định dạng cần hoàn tác.
