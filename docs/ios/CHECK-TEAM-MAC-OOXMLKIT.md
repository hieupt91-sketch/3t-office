# Phiếu kiểm cho team macOS — thư viện OOXMLKit (iOS/iPadOS)

Gửi team có máy Mac + Xcode. Mục tiêu: xác nhận trên **máy thật của team** những gì CI/agent đã làm, và chạy nốt phần CI không làm được (thiết bị thật, Microsoft Office thật). Ghi kết quả vào **bảng ở mục 4** rồi commit lại; theo AGENTS.md §8 (PASS/FAIL/NOT RUN/BLOCKED kèm số liệu thật) và §9 (handoff).

- Mã: nhánh **`claude/ooxml-offline-ios-library-fqqyj0`**, thư mục **`ports/ios/OOXMLKit/`**.
- Nền: Swift 6.x, Xcode 15+/16, iOS/iPadOS 15+.
- Tài liệu nền: `docs/ios/BAO-CAO-OOXMLKIT-2310.md` (trạng thái), `docs/ios/SPEC-MOBILE-BRIDGE.md` (cầu nối Phase 7), `ports/ios/OOXMLKit/AGENTS.md` (quy ước).

## 1. Lấy mã
```bash
git fetch origin && git checkout claude/ooxml-offline-ios-library-fqqyj0
cd ports/ios/OOXMLKit
```

## 2. Kiểm nhanh bằng dòng lệnh (bắt buộc)
```bash
swift test                                   # kỳ vọng: 111 tests, 0 failures
swift test -c release -Xswiftc -enable-testing   # kỳ vọng: 111 tests, 0 failures
```
Nếu có Python + openpyxl/python-docx/python-pptx thì chạy thêm kiểm chéo:
```bash
scripts/run-tests.sh
```

## 3. Kiểm trên Xcode + thiết bị (phần CI không làm được)
1. `open Package.swift` bằng Xcode → chọn scheme **OOXMLKit-Package** → **Product ▸ Test** trên:
   - Giả lập iPhone, giả lập iPad (kỳ vọng 111 PASS — xác nhận lại CI).
   - **iPhone/iPad THẬT** (đây là phần mới): chạy test, và nếu được thì đo **thời gian mở/lưu + bộ nhớ đỉnh** với tệp ~1 MB / ~10 MB (dùng Instruments).
2. **Mở tệp do OOXMLKit lưu ra bằng Microsoft Office / iWork thật** để xác nhận KHÔNG có hộp thoại "repair":
   - Lấy tệp mẫu: chạy `OOXMLKIT_ARTIFACTS=/tmp/art swift test` → thư mục `/tmp/art` có các tệp `.xlsx/.docx/.pptx` do thư viện lưu ra. Mở vài tệp bằng Excel/Word/PowerPoint (hoặc Numbers/Pages/Keynote).
   - Nếu có **file Office nội dung giả** của team, mở bằng OOXMLKit (qua test/đầu dò) rồi mở lại bản lưu ra bằng Office — ghi kết quả.

## 4. BẢNG KẾT QUẢ — team điền rồi commit
| Hạng mục | Kết quả (PASS/FAIL/NOT RUN/BLOCKED) | Số liệu / ghi chú | Máy + phiên bản (macOS, Xcode, Swift, thiết bị) |
|---|---|---|---|
| `swift test` (macOS) | PASS | 111/111, 0 failures | Mac Apple Silicon · macOS 15.8.1 · Xcode 26.3 toolchain · Swift 6.2.4 |
| `swift test -c release` | PASS | 111/111, 0 failures; thời gian test 1.90 s | Mac Apple Silicon · macOS 15.8.1 · Xcode 26.3 toolchain · Swift 6.2.4 |
| Xcode test — giả lập iPhone | PASS | 111/111, 0 failures | iPhone 17 · iOS 26.3.1 · Xcode 26.3 |
| Xcode test — giả lập iPad | PASS | 111/111, 0 failures | iPad (A16) · iOS 26.3.1 · Xcode 26.3 |
| Xcode test — iPhone THẬT | BLOCKED | `xcrun devicectl list devices`: không tìm thấy thiết bị; chưa đo thời gian/bộ nhớ | Mac Apple Silicon · macOS 15.8.1 · Xcode 26.3 |
| Xcode test — iPad THẬT | BLOCKED | `xcrun devicectl list devices`: không tìm thấy thiết bị; chưa đo thời gian/bộ nhớ | Mac Apple Silicon · macOS 15.8.1 · Xcode 26.3 |
| Mở tệp OOXMLKit lưu ra bằng Office thật (xlsx/docx/pptx) | PASS (3 mẫu) | Excel mở `real-edit-sample-sheet-charts.xlsx` (A1:C5), Word mở `docx-edit.docx` (454 ký tự), PowerPoint mở `pptx-edit.pptx` (3 slide); không thấy hộp thoại/cảnh báo repair. Đây là fixture của repo (mẫu LibreOffice/tổng hợp), chưa phải nguồn Microsoft Office thật. | Microsoft Excel, Word, PowerPoint trên Mac; macOS 15.8.1 |
| Kiểm chéo `scripts/run-tests.sh` + `verify_artifacts.py` | FAIL (có giới hạn oracle đã biết) | 78/78 gói PASS ZIP + CRC + expat; 76/78 PASS cả openpyxl/python-docx/python-pptx. openpyxl 3.1.5 từ chối `office-quirks-noop.xlsx` và `office-quirks-edited.xlsx` do `family val="34"` vượt validator của openpyxl (max 14). Excel thật mở cả hai, không repair. | Mac Apple Silicon · macOS 15.8.1 · Swift 6.2.4 · Microsoft Excel |

### Kết quả thực hiện ngày 24/10/2026

- `swift test` ban đầu gọi Swift của Command Line Tools và dừng khi biên dịch test vì môi trường đó không tìm thấy `XCTest`. Chạy lại bằng toolchain đầy đủ trong `/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin` thì PASS 111/111. Đây là lỗi chọn toolchain của môi trường, không phải lỗi mã nguồn.
- Release chạy bằng toolchain Xcode: PASS 111/111. `scripts/run-tests.sh` tạo 78 artifact; ZIP, CRC và XML PASS 78/78. Chạy tiếp `verify_artifacts.py` trong venv tạm với openpyxl 3.1.5, python-docx và python-pptx: PASS 76/78, FAIL 2 tệp `office-quirks-*`. Traceback openpyxl báo `ValueError: Max value is 14` khi đọc `<family val="34"/>`; fixture này cố ý mô phỏng giá trị Office lạ để xác nhận OOXMLKit giữ nguyên. Excel thật đã mở cả bản no-op lẫn bản edited mà không hiện repair. Đây là giới hạn validator openpyxl với fixture, chưa phải bằng chứng Excel repair hay lỗi OOXMLKit.
- Xcode scheme `OOXMLKit-Package`: simulator iPhone 17 PASS 111/111; simulator iPad (A16) PASS 111/111; cả hai chạy iOS 26.3.1 trên Xcode 26.3.
- Mở bằng Office macOS qua thao tác UI: Excel hiện workbook `real-edit-sample-sheet-charts.xlsx`, sheet `DoanhThu`, vùng A1:C5; Word hiện `docx-edit.docx` (454 ký tự); PowerPoint hiện deck `pptx-edit.pptx` (3 slide). Excel cũng mở `office-quirks-noop.xlsx` và `office-quirks-edited.xlsx` (sheet `Dữ liệu`, A1:B1) mà không xuất hiện hộp thoại repair. Đây là artifact từ fixture repo; fixture office-quirks được sinh tổng hợp để mô phỏng style lạ, không phải bằng chứng nguồn Microsoft Office thật.
- Thiết bị thật: BLOCKED vì `devicectl` báo không có thiết bị. Chưa đo thời gian/bộ nhớ trên iPhone/iPad thật; không suy rộng số liệu simulator thành thiết bị thật.

## 5. Báo cáo lại thế nào
- Điền bảng mục 4 (ngay trong file này), **commit vào nhánh trên** với thông điệp rõ ràng (vd `docs(ios): team Mac điền kết quả kiểm OOXMLKit`).
- Nếu phát hiện lỗi: mô tả lỗi + cách tái hiện; **đừng sửa expected để cho xanh** (AGENTS.md §8). Mở issue hoặc ghi vào `docs/ios/BAO-CAO-OOXMLKIT-2310.md` mục mới.
- Nếu có tệp Office **nội dung giả** để làm fixture: bỏ vào `ports/ios/OOXMLKit/Tests/OOXMLTestSupport/Fixtures/real-msoffice/` rồi commit (KHÔNG commit tài liệu thật của khách).
- Không đụng tới LibreOffice/mã desktop (quyết định thay LibreOffice đang chờ duyệt — `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md`).

## 6. Lưu ý
- Thư viện là **Swift thuần, chỉ Foundation**, chạy **offline**; không cần mạng, LibreOffice hay Python để build/test (Python chỉ để kiểm chéo tùy chọn).
- Nếu `swift test` chậm ở phần ZIP/Deflate khi chạy **debug**, dùng bản **release** (nhanh hơn nhiều) — đã ghi trong `AGENTS.md`.
