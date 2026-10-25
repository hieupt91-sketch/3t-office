# STATUS-MAC (cập nhật: 25/10/2026 14:04, Claude Mac)
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
## Đêm 24/10 — macOS trước, iOS/iPadOS sau (theo chủ); nhánh chưa đẩy, đẩy ~8h 25/10
- GATE-1 `mac/gate-cl-2410` (`aecf9ac5`): gộp vn-main 0c931aa2 vào ứng viên macOS `mac/native-qa-2310` — 0 xung đột. npm test 3771/3781 (đủ biến môi trường); i18n 3200/3200 PASS; tests/macos 10/10 PASS; mã hóa 8/8 PASS; in 47/47 PASS; pytest cả bộ 1140 qua / 9 lỗi / 1 error (mọi lỗi pytest đều có sẵn trên vn-main hoặc chỉ-Windows).
- FIX-MAC-1 `mac/fix1-cl-2410` (`688200dd`): sửa nhãn nhóm Giao diện (EN), lệnh đổi theme vào AppShell, backend `platform/os_services/macos.py` (Hiện trong Finder, hộp thoại lỗi gốc), tiến trình zombie, 4 test Node gọi `python`. Mac tự chạy lại: npm test **3797/3798** (1 FAIL = snapshot FODS có sẵn trên vn-main), pytest macOS/os_services/process 38 qua 1 skip, i18n 3203/3203 PASS.
- ORACLE-1 `mac/oracle-cl-2410` (`4e4d7fec`): bộ lấy chuẩn Office Mac + so sánh; 3T khớp golden Excel 2016 Windows **1.500/1.500**. Phần Office: **BLOCKED** — Word/Excel/PowerPoint không trả lời AppleEvent (-1712, chờ chủ cấp quyền Automation).
- G2 engine công thức (`4a62801b`) trên macOS: swift test 166/166 PASS, build iOS PASS.
- KEYS-1 `mac/keys-cl-2410` (`2c04c8a3`): bảng phím macOS 141 dòng (37 có nguồn, 104 "chờ xác minh bằng Office for Mac" — cần quyền Automation), Ctrl+nhấp = chuột phải, KeyTips F10/không bật bởi Option đơn, F1/Cmd+? Trợ giúp. Mac tự chạy lại npm test 3798/3803 (5 FAIL đều đã biết: 4 test gọi `python` — đã sửa ở FIX-MAC-1 — và snapshot FODS). CDP macOS 14/14 PASS (theo agent), unit 18/18. Lưu ý chung: F10 giờ cũng bật KeyTips trên Windows.
- MAC-9 `mac/fonts-cl-2410` (`501f7835`): LibreOffice headless trên Mac trước chỉ thấy phông tự mang → phông thiếu rơi về LinuxLibertineG (có chân). Nay dùng fontconfig: thấy phông macOS + bảng thay thế (Calibri→Carlito, Cambria→Caladea, Segoe UI/Aptos→Helvetica Neue, NSimSun/SimSun→Heiti SC…). 11 tệp mẫu thật giữ nguyên số trang. Mac tự kiểm trực quan trang PDF trước/sau: đúng kiểu chữ, dấu tiếng Việt đủ. pytest tests/macos 35 qua 1 skip. Không dùng phông của bộ Office.
- ENGINE-MAC `mac/engine-cl-2410` (`f1e605fe`): ooxml-engine macOS arm64 + universal PASS; G0 24/28 (giống Linux); kiểm cấu trúc 75/75 PASS; phát hiện lỗi notesSlide trùng (INBOX-WIN #9). Phần Office: BLOCKED (chờ Automation).
- Ứng viên `mac/candidate-cl-2510` (`382065e3`): gộp vn-main 83160242 + FIX-MAC-1 + MAC-9 + KEYS-1 + ORACLE-1 + ENGINE-MAC. Mac tự kiểm log: npm test 3821/3822 (1 FAIL = snapshot FODS, nguyên nhân CRLF — INBOX-WIN #10), i18n 3203/3203, checklist 0 dòng hạ (Word/Excel/PowerPoint), tests/macos 52 PASS, pytest cả bộ 1186 qua / 8 lỗi đã biết / 1 error (thiếu pypdf), CDP macOS 14/14, Xcode universal BUILD SUCCEEDED.
- Q62 trên macOS (vn-main 6bb39661): swift test 140/140 PASS, build iOS PASS, 0 cảnh báo; G0 25/28; lỗi notesSlide trùng đã hết.
- MAC-12-RUNTIME `mac/runtime-deps-cl-2510` (`6b9cface`): khóa phiên bản + hash (cryptography 44.0.2 universal2, cffi 2.1.1, pycparser 3.12, pypdf 6.21.2 — trong khoảng requirements.txt), trình cài offline từ wheel cache, validator FAIL nếu thiếu (pilot hiện tại FAIL đúng; môi trường thử PASS). pytest cả bộ 1194 qua / 8 lỗi chỉ-Windows / 0 error. Dựng lại runtime thật: NOT RUN (bước của chủ). Lưu ý: Windows dùng cryptography 50.0.2 — cùng khoảng, khác bản; THIRD-PARTY-NOTICES cần chủ cập nhật nếu muốn ghi cả bản macOS.
- G0 sau Q62 + sửa harness (`ba00f7ab`) trên macOS: **28/28 PASS**, selftest PASS (INBOX-WIN #12).
- 25/10 09:10: đã đẩy 8 nhánh mac/*-cl-* lên origin (chưa vào vn-main). Candidate2 `mac/candidate2-cl-2510` (đã đẩy) gộp lên vn-main 082221cb: đã lên vn-main 34ceeed1 (Q64): npm test **3826/3826 PASS** trên macOS, pytest 1197 qua / 1 lỗi (test LOCALAPPDATA, INBOX-WIN #17) / 25 skip, CDP 14/14 — chờ chủ duyệt PR. Đang chạy: VN-FONTS-1 dựng phông riêng từ OFL (`mac/vnfonts-cl-2510`).
## Oracle Mac (yêu cầu INBOX-MAC #2)
- Đã nhận; xếp hàng sau ORACLE-1 (dùng chung Word/Excel/PowerPoint, máy 8 GB RAM). Kế hoạch: dựng `ooxml-engine` macOS, round-trip corpus tổng hợp `claude/ooxml-g0-corpus-parity`, mở bằng Office for Mac, đếm tệp bị báo cần sửa chữa. Kết quả: BLOCKED (Office chưa nhận AppleEvent, -1712; chờ chủ cấp quyền Automation).
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

## 25/10 — đã vào vn-main
- Chủ chốt, Windows gộp `mac/candidate2-cl-2510` + G1 + G2 vào vn-main (`ea2ad16b`). Cổng macOS trên vn-main `75f271ed`: npm 3826/3826, swift test 201/201, build iOS PASS, CDP 14/14, Xcode PASS, pytest 1197/1 lỗi đã biết (Q65).
- vn-main e04925b9 (Q63+Q65) trên macOS: pytest 1199/0 lỗi, npm 3826/3826, swift test 204/204, iOS PASS, G0 28/28.
- Đang làm: VN-FONTS-1 (`mac/vnfonts-cl-2510`), MAC-6/13/15 (`mac/userflow-cl-2510`). Gián đoạn do giới hạn phiên 07–09h và 12–14h.
