# Kế hoạch triển khai OOXMLKit theo phase — iOS/iPadOS ngoại tuyến

Cập nhật: 23/10/2026 21:10 · Nhánh: `claude/ooxml-offline-ios-library-fqqyj0` (kho `hieupt91-sketch/3t-office`) · Mã: `ports/ios/OOXMLKit/`
Báo cáo kết quả: `docs/ios/BAO-CAO-OOXMLKIT-2310.md`

## 0. Ràng buộc chung (áp dụng cho MỌI phase)
| # | Ràng buộc | Cách kiểm |
|---|---|---|
| R1 | **Chạy ngoại tuyến 100 % trên iPhone (iOS) và iPad (iPadOS)**: không mạng, không máy chủ, không LibreOffice/Python | `OfflineGuaranteeTests`: quét mã nguồn cấm API mạng/tiến trình ngoài, chỉ cho `import Foundation` + module nội bộ, `Package.swift` không có gói phụ thuộc |
| R2 | Swift thuần, iOS 15+/iPadOS 15+ | CI `.github/workflows/ios-ooxmlkit.yml`: build cho thiết bị `generic/platform=iOS` (arm64) + test trên simulator iPhone và iPad |
| R3 | Không mất dữ liệu khi round-trip | `RoundTrip.verify`: phần không sửa phải trùng **byte nén**; chỉ phần khai báo trước được đổi; gói hợp lệ; không phát sinh lỗi mới |
| R4 | Mỗi phase có fixture + test mở–sửa–lưu–đóng–mở lại + báo cáo PASS/FAIL/NOT RUN/BLOCKED | `scripts/run-tests.sh` + `scripts/verify_artifacts.py` (bộ đọc độc lập) |
| R5 | Chưa tích hợp UI khi chưa duyệt báo cáo | Phase 7 chỉ bắt đầu sau khi Người phụ trách duyệt |

Trạng thái: ✅ xong (đã chạy, PASS) · 🟡 đang làm · ⏳ chưa làm · ⛔ BLOCKED

## Phase 1 — Lõi ZIP ✅
- **Mục tiêu**: đọc/ghi gói ZIP mà không cần zlib hệ thống; chép nguyên byte mục không sửa.
- **Phạm vi**: CRC-32; Inflate/Deflate (stored/fixed/dynamic, LZ77 + lazy); ZIP64; data descriptor; tên UTF-8/CP437; chú thích; mục phương thức lạ giữ nguyên; giới hạn chống ZIP bomb; từ chối `../`, tên trùng; ghi nguyên tử.
- **Nghiệm thu**: giải đúng mọi luồng zlib 6 chiến lược; tỉ lệ nén ≤ zlib-9 × 1,35; lưu không sửa giữ nguyên byte; làm hỏng ngẫu nhiên không sập; gói 70.000 mục đọc được bằng Python.
- **Đối chiếu**: kế hoạch 100 % · thực tế 20/20 test PASS; nén 300.347 B vs zlib-9 300.231 B (+0,04 %).

## Phase 1b — XML không mất dữ liệu + gói OPC ✅
- **Phạm vi**: parser/serializer XML giữ thứ tự thuộc tính, tiền tố, comment, PI, CDATA; chặn DTD/XXE; UTF-16. OPC: content types, quan hệ, tên phần (mã hóa % theo ECMA-376), thêm/xóa/nhân bản phần, dọn phần mồ côi, kiểm tra hợp lệ trước khi ghi đè.
- **Nghiệm thu**: 19 tệp thật lưu không sửa → 0 phần đổi; XML phân tích–ghi–phân tích ổn định; `save(to:)` từ chối khi gói hỏng.
- **Đối chiếu**: 20/20 test PASS (17 chức năng + 3 offline).

## Phase 2 — XLSX ✅ (mở rộng ở Phase 5)
- **Phạm vi**: đọc/ghi ô (số, chuỗi, bool, lỗi, công thức), chuỗi chia sẻ (chỉ thêm, giữ rich text), style (sao chép xf/font/fill), công thức chia sẻ/mảng, calcChain, fullCalcOnLoad, gộp ô, cột/hàng, thêm sheet, đổi tên sheet cập nhật mọi tham chiếu (công thức, tên, biểu đồ, pivot, liên kết, app.xml), tiền tố `x:`, ô không có `r`, Strict.
- **Nghiệm thu**: sửa ô chỉ đổi đúng 2–3 phần; mọi tính năng không đụng (CF x14, xác thực, ảnh, comments, table, pivot, biểu đồ…) còn nguyên; 7/7 tệp thật mọi ô khác giống hệt; openpyxl đọc đúng.
- **Đối chiếu**: 20/20 test PASS · 13/13 tệp kiểm chéo.

## Phase 3 — DOCX ✅
- **Phạm vi**: chữ đoạn/run như Word hiển thị; mọi story (thân, header, footer, footnote, endnote, comment); đặt chữ giữ bookmark/chú thích/ảnh; thay chữ xuyên run; chèn/xóa đoạn; style, căn lề, định dạng run; bảng (gridSpan/vMerge); chèn ảnh.
- **Nghiệm thu**: sửa nội dung chỉ đổi `document.xml`; còn nguyên ins/del, trường, hộp văn bản, sdt, w14; python-docx đọc đúng.
- **Đối chiếu**: 11/11 test PASS · 11/11 tệp kiểm chéo.

## Phase 4 — PPTX ✅ (mở rộng ở Phase 5)
- **Phạm vi**: slide/hình/nhóm/placeholder/bảng/biểu đồ/ghi chú/phân đoạn; đặt & thay chữ; sửa ô bảng; tạo ghi chú; nhân bản (sao chép riêng biểu đồ, SmartArt, workbook nhúng), xóa (dọn phần chỉ slide đó dùng), đổi thứ tự slide.
- **Nghiệm thu**: chuyển cảnh p14, liên kết, cấp thụt lề giữ nguyên; phân đoạn/custShow/app.xml cập nhật đúng; python-pptx đọc đúng.
- **Đối chiếu**: 11/11 test PASS · 13/13 tệp kiểm chéo.

## Phase 5 — Bổ sung thao tác còn thiếu ✅ (7/7 hạng mục xong, 20 test)
| Hạng mục | Ưu tiên | Trạng thái |
|---|---|---|
| XLSX xóa sheet (dọn quan hệ, tên định nghĩa cục bộ, app.xml, tham chiếu → #REF!) | Cao | ✅ 3 test |
| PPTX thêm slide mới từ layout | Cao | ✅ 2 test (rich-deck + 5 tệp thật) |
| XLSX chèn/xóa hàng (dịch ô, công thức mọi sheet, gộp ô, CF, xác thực, dimension, tên, biểu đồ, bảng, ảnh neo, bình luận + VML) | Cao | ✅ 4 test (gồm 7 tệp thật chèn rồi xóa về như cũ) |
| XLSX chèn/xóa cột (chặn an toàn khi cắt ngang bảng/bộ lọc đang lọc) | Trung bình | ✅ 5 test (gồm 7 tệp thật) |
| XLSX ngắt trang `rowBreaks`/`colBreaks` theo hàng/cột | Thấp | ✅ 1 test |
| DOCX sửa dưới dạng theo dõi thay đổi (w:ins/w:del có tác giả) + chấp nhận/từ chối tất cả | Trung bình | ✅ 3 test |
| PPTX thay ảnh (không ghi đè ảnh dùng chung) | Thấp | ✅ 2 test |
- **Nghiệm thu**: như R3; mỗi hạng mục có test mở–sửa–lưu–đóng–mở lại + kiểm chéo bằng openpyxl/python-pptx.

## Phase 6 — Kiểm trên thiết bị Apple 🟡 (6a xong)
- **6a** CI macOS (GitHub Actions `macos-15`): `swift test`, build thiết bị iOS/iPadOS arm64, test simulator iPhone + iPad — ✅ **PASS**: macOS 91/91, build arm64 OK, simulator iPhone 91/91, iPad 91/91 (Xcode 16.4).
- **6b** iPhone/iPad thật (Xcode, người có máy): chạy test, đo thời gian mở/lưu và bộ nhớ đỉnh với tệp 1 MB / 10 MB / 50 MB — ⛔ cần người có Mac + thiết bị.
- **6c** Mở tệp kết quả bằng Microsoft Word/Excel/PowerPoint thật: không có hộp thoại "sửa chữa" — ⛔ cần máy có Office.
- **6d** Bộ tệp Office thật (không dữ liệu cá nhân) đưa vào fixture — ⏳ cần team cung cấp.

## Phase 7 — Tích hợp ứng dụng (chỉ sau khi duyệt) ⏳
- Cầu nối JSON `WKScriptMessageHandlerWithReply` ↔ `Workbook`/`WordDocument`/`Presentation`, chạy cục bộ trong ứng dụng (không mạng).
- Mở/lưu qua `UIDocumentPickerViewController`, security-scoped URL, `UIDocument`/`NSFileCoordinator` (iCloud Drive/Files), lưu tự động khi vào nền.
- Bố cục cảm ứng iPhone (một cột) và iPad (Split View, Stage Manager, bàn phím rời, Apple Pencil).
- Hướng dẫn sử dụng tiếng Việt cho từng thao tác (AGENTS.md §10).
- Tính lại công thức: dùng bộ máy JS `apps/sheet/formula-engine.js` trong WKWebView để ghi giá trị đệm.

## Bảng đối chiếu: desktop (Windows, LibreOffice + lớp vá) ↔ iOS/iPadOS (OOXMLKit)
| Khả năng | Desktop | iOS/iPadOS OOXMLKit |
|---|---|---|
| Chạy không mạng | Có | **Có** (R1, có test) |
| Động cơ | LibreOffice headless + Python | Swift thuần, trong tiến trình ứng dụng |
| Giữ phần không sửa | Lớp vá OOXML (chuyển đổi qua ODF rồi vá lại) | **Chép nguyên byte** — không đi qua định dạng trung gian |
| Tính công thức | Có (LibreOffice + JS) | Chưa (giữ giá trị đệm, Excel tính lại khi mở) — Phase 7 |
| Xuất PDF / in | Có | Chưa (dùng dịch vụ in iOS ở Phase 7) |
| DOC/XLS/PPT nhị phân, ODF | Có | Không (ngoài phạm vi) |
| Tệp có mật khẩu | Có | Không |

## Bảng đối chiếu kế hoạch ↔ thực tế (23/10/2026)
| Phase | Kế hoạch | Thực tế | Test | Kiểm chéo độc lập | iPhone sim | iPad sim |
|---|---|---|---|---|---|---|
| 1 ZIP | đủ phạm vi | ✅ đủ | 20 | ✅ | ✅ | ✅ |
| 1b XML + OPC + offline | đủ phạm vi | ✅ đủ + tên phần mã hóa % + giữ namespace khi tách phần tử | 21 | ✅ | ✅ | ✅ |
| 2 XLSX | đủ phạm vi | ✅ đủ | 20 | ✅ | ✅ | ✅ |
| 3 DOCX | đủ phạm vi | ✅ đủ | 11 | ✅ | ✅ | ✅ |
| 4 PPTX | đủ phạm vi | ✅ đủ | 11 | ✅ | ✅ | ✅ |
| 5 Bổ sung | 7 hạng mục | ✅ 7/7 | 20 | ✅ | xem báo cáo §8.2 | xem báo cáo §8.2 |
| 6 Thiết bị Apple | 4 bước | ✅ 6a (CI); ⛔ 6b–6d cần người/máy | — | — | — | — |
| 7 Tích hợp app | chờ duyệt | ⏳ chưa bắt đầu (đúng yêu cầu) | — | — | — | — |
