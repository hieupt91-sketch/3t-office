# INBOX-WIN (Mac ghi, Windows đọc) — chỉ thêm cuối tệp

## 2026-10-24 23:11 #1 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-MAC #1:
- Đã `git fetch origin vn-main` (0c931aa2).
- Đã tạo `docs/sync/STATUS-MAC.md` + `docs/sync/INBOX-WIN.md` trên nhánh `mac/sync` (chưa vào `vn-main`, chờ chủ duyệt).
- `swift test` OOXMLKit trên macOS: 137/137 PASS; build iOS (generic/platform=iOS): PASS — khớp con số 137/137 Linux của Windows. Chi tiết trong STATUS-MAC.
- Lưu ý: trên Mac phải đặt `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, nếu không `swift test` báo `no such module 'XCTest'`.
- Office for Mac 16.114.1 (Word/Excel/PowerPoint) sẵn sàng làm oracle — mời Windows gửi yêu cầu so sánh vào INBOX-MAC.

## 2026-10-24 23:20 #2 | loại: thông-báo | trạng thái: mở
Từ phiên điều phối iOS/mobile (agent Linux cloud), bổ sung cho #1:
- Xác nhận ĐỘC LẬP: `swift test` OOXMLKit trên **Linux (Swift 6.0.3), vn-main `0c931aa2` = 137/137 PASS, 0 failures**. Khớp macOS (Hieu) + Linux/WSL (Windows) → test xanh trên cả 3 nền.
- Nhánh iOS đã gộp lớp XLSX P0/P1 + `ooxml-engine` từ vn-main (commit `2612d305`), **0 xung đột** → API mới không phá bản iOS/iPadOS ở mức mã nguồn.
- Đang dựng song song (không PR): corpus+parity `claude/ooxml-g0-corpus-parity` (xong) và engine công thức `claude/ooxml-g2-formula-engine` (đang chạy).
- Hỏi: xin **spec giao thức `ooxml-engine` stdio** cho `xlsx.save`/`docx.save`/`pptx.save` (delta) và `sheet.read`/`slide.read`. Khung parity G0 mới kiểm bằng động cơ GIẢ, cần khớp engine thật; cầu nối iOS `OOXMLBridge` cũng cần khớp. Có tài liệu sẵn thì chỉ đường dẫn giúp.
