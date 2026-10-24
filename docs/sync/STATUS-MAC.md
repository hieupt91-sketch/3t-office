# STATUS-MAC (cập nhật: 24/10/2026 23:33, Claude Mac)
## Môi trường Mac
- macOS 15.8.1 (24H32), arm64; Xcode 26.3 (17C529), Swift 6.2.4 khi dùng `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.
- Lưu ý: `xcode-select -p` đang trỏ Command Line Tools (Swift 6.1.2) → `swift test` trơn báo `no such module 'XCTest'`; phải đặt `DEVELOPER_DIR`.
- Microsoft Office for Mac đã cài: Word, Excel, PowerPoint 16.114.1 (build 16.114.26102031) — dùng được làm "oracle" so sánh độ trung thực.
## Kiểm thử OOXMLKit trên macOS (`vn-main` 0c931aa2)
- `swift test`: PASS — Executed 137 tests, with 0 failures (0 unexpected); 137/137 XCTest, 0 swift-testing, 0 skip, ~40 giây gồm build.
- 1 cảnh báo: `Sources/OOXMLBridge/OOXMLBridge.swift:559` biến `index` không dùng.
- Build iOS (`xcodebuild -scheme OOXMLKit-Package -destination 'generic/platform=iOS'`, SDK iPhoneOS 26.2, đích arm64-apple-ios15.0): PASS (BUILD SUCCEEDED) → API mới không phá biên dịch iOS.
- iPadOS/thiết bị thật, test UI iOS: NOT RUN.
## Đang làm
- Nhánh `platform/macos` có thay đổi chưa commit: luồng Xcode Run phát triển cho launcher macOS (scheme `VNOffice-Development`), pipeline in, chuẩn hóa gõ tiếng Việt/IME, slides canvas, vá zip OOXML — chưa gộp, chưa đủ kiểm thử để báo PASS.
- Theme động (gradient động, preset modern) đã commit trên `platform/macos`.
## Đã gộp gần đây (trên `platform/macos`, chưa vào `vn-main`)
- `e19cbd5f` feat(theme): add modern animated preset
- `c6ef38f7` fix(theme): scope gradient animation to dynamic presets
- `07bab785` feat(macos): add animated gradient themes
- `86d8a9f0` fix(macos): paint image theme across ribbon body
- `ac3a5670` fix(macos): widen theme options for full preset labels
- `c4adfe3a` docs(macos): document full ribbon image coverage
- `6e28d9ae` feat(macos): add Windows-compatible themes and ribbon image
## Đang chạy đêm 24/10 (ưu tiên macOS trước, iOS/iPadOS sau — theo chủ)
- GATE-1 (`mac/gate-cl-2410`): gộp `vn-main` vào ứng viên macOS `mac/native-qa-2310` + chạy mọi cổng (npm test, pytest, i18n, mã hóa, in), phân loại lỗi. Kết quả: NOT RUN (đang chạy).
- ORACLE-1 (`mac/oracle-cl-2410`): bộ lấy chuẩn từ Office for Mac 16.114.1; 1.470 ca hàm Sheet, số trang Doc, số slide Slide so với 3T. Kết quả: NOT RUN (đang chạy).
## Oracle Mac (yêu cầu INBOX-MAC #2)
- Đã nhận; xếp hàng sau ORACLE-1 (dùng chung Word/Excel/PowerPoint, máy 8 GB RAM). Kế hoạch: dựng `ooxml-engine` macOS, round-trip corpus tổng hợp `claude/ooxml-g0-corpus-parity`, mở bằng Office for Mac, đếm tệp bị báo cần sửa chữa. Kết quả: NOT RUN.
## BLOCKED / chờ chủ
- Ký Developer ID + notarize gói PKG: chờ chứng chỉ.
- Gộp `mac/sync` vào `vn-main`: chờ chủ duyệt.
## Cần Windows giúp
- (1) Khi đổi API OOXMLKit hãy ghi LIBRARY-CHANGELOG kèm commit để Mac chạy lại.
- (2) Gửi danh sách tệp mẫu (không chứa dữ liệu thật) mà Windows muốn Mac so với Office for Mac 16.114.1.
- (3) Sửa cảnh báo `OOXMLBridge.swift:559` khi tiện.
## Mac có thể hỗ trợ thư viện
- Chạy `swift test` + build iOS sau mỗi thay đổi OOXMLKit.
- So sánh kết quả lưu xlsx/docx/pptx của `ooxml-engine` bằng cách mở trong Word/Excel/PowerPoint for Mac (báo tệp bị Office báo "cần sửa chữa").
- Dựng `ooxml-engine` bản macOS universal để thay dần LibreOffice trên Mac, cùng lộ trình với Windows.
## Nhịp đồng bộ
- Mac kiểm INBOX-MAC mỗi 20–25 phút.

## Bổ sung từ phiên điều phối iOS/mobile (agent Linux cloud) — 2026-10-24 23:20
- Xác nhận ĐỘC LẬP trên nền thứ ba: `swift test -c release` OOXMLKit trên **Linux (Ubuntu 24.04, Swift 6.0.3 chính thức), vn-main `0c931aa2`** → **137/137 PASS, 0 failures** (~4.2s phần test, chưa gồm build). Trùng macOS (Hieu) và Linux/WSL (Windows) → bộ test xanh trên cả 3 nền.
- Cảnh báo `OOXMLBridge.swift:559` (biến `index` không dùng) cũng xuất hiện trên Linux — xác nhận lại "Cần Windows giúp (3)".
- Nhánh iOS `claude/ooxml-offline-ios-library-fqqyj0`: đã đồng bộ lớp XLSX P0/P1 + `ooxml-engine` + `PackageTools.setProperties` + `.gitattributes` (LF) từ vn-main (commit `2612d305`), thuần thêm, **0 xung đột** với bản bridge/iOS.
- 2 phiên worker song song (base vn-main, không PR, mỗi phiên chỉ thêm file trong vùng riêng):
  - `claude/ooxml-g0-corpus-parity`: ✅ corpus synthetic + khung parity (chạy qua `ooxml-engine`). Round-trip engine thật, Office oracle, visual diff, perf thiết bị = BLOCKED (cần Swift/Office/thiết bị).
  - `claude/ooxml-g2-formula-engine`: 🟡 engine công thức (slice 1) đang chạy.
