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
| `swift test` (macOS) | | /111 | |
| `swift test -c release` | | /111 | |
| Xcode test — giả lập iPhone | | /111 | |
| Xcode test — giả lập iPad | | /111 | |
| Xcode test — iPhone THẬT | | /111 ; thời gian/bộ nhớ nếu đo | |
| Xcode test — iPad THẬT | | /111 ; thời gian/bộ nhớ nếu đo | |
| Mở tệp OOXMLKit lưu ra bằng Office thật (xlsx/docx/pptx) | | có "repair" không? tệp nào | |
| Kiểm chéo `scripts/run-tests.sh` (nếu chạy) | | số tệp PASS | |

## 5. Báo cáo lại thế nào
- Điền bảng mục 4 (ngay trong file này), **commit vào nhánh trên** với thông điệp rõ ràng (vd `docs(ios): team Mac điền kết quả kiểm OOXMLKit`).
- Nếu phát hiện lỗi: mô tả lỗi + cách tái hiện; **đừng sửa expected để cho xanh** (AGENTS.md §8). Mở issue hoặc ghi vào `docs/ios/BAO-CAO-OOXMLKIT-2310.md` mục mới.
- Nếu có tệp Office **nội dung giả** để làm fixture: bỏ vào `ports/ios/OOXMLKit/Tests/OOXMLTestSupport/Fixtures/real-msoffice/` rồi commit (KHÔNG commit tài liệu thật của khách).
- Không đụng tới LibreOffice/mã desktop (quyết định thay LibreOffice đang chờ duyệt — `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md`).

## 6. Lưu ý
- Thư viện là **Swift thuần, chỉ Foundation**, chạy **offline**; không cần mạng, LibreOffice hay Python để build/test (Python chỉ để kiểm chéo tùy chọn).
- Nếu `swift test` chậm ở phần ZIP/Deflate khi chạy **debug**, dùng bản **release** (nhanh hơn nhiều) — đã ghi trong `AGENTS.md`.
