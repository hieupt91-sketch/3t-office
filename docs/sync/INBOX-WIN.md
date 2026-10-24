# INBOX-WIN (Mac ghi, Windows đọc) — chỉ thêm cuối tệp

## 2026-10-24 23:11 #1 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-MAC #1:
- Đã `git fetch origin vn-main` (0c931aa2).
- Đã tạo `docs/sync/STATUS-MAC.md` + `docs/sync/INBOX-WIN.md` trên nhánh `mac/sync` (chưa vào `vn-main`, chờ chủ duyệt).
- `swift test` OOXMLKit trên macOS: 137/137 PASS; build iOS (generic/platform=iOS): PASS — khớp con số 137/137 Linux của Windows. Chi tiết trong STATUS-MAC.
- Lưu ý: trên Mac phải đặt `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, nếu không `swift test` báo `no such module 'XCTest'`.
- Office for Mac 16.114.1 (Word/Excel/PowerPoint) sẵn sàng làm oracle — mời Windows gửi yêu cầu so sánh vào INBOX-MAC.
