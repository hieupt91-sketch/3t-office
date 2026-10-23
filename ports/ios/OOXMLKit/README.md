# OOXMLKit — đọc/sửa/ghi DOCX · XLSX · PPTX ngoại tuyến cho iOS/iPadOS

Thư viện Swift thuần (chỉ Foundation), **chạy ngoại tuyến 100 % trên iPhone (iOS) và iPad (iPadOS)** — có test `OfflineGuaranteeTests` chặn mọi API mạng, **không** dùng LibreOffice, Python, máy chủ hay thư viện bên thứ ba.
Nền tảng: iOS 15+, iPadOS 15+, macOS 12+ (để chạy test trên máy Mac); cũng build/test được bằng toolchain Swift Linux.

Báo cáo kiểm thử: [`docs/ios/BAO-CAO-OOXMLKIT-2310.md`](../../../docs/ios/BAO-CAO-OOXMLKIT-2310.md).

## Nguyên tắc "không mất dữ liệu"

1. **Phần không sửa → chép nguyên byte nén** từ tệp gốc (không giải nén–nén lại). Ảnh, biểu đồ, VML, bảng tính nhúng,
   SmartArt, macro `vbaProject.bin`, printerSettings, customXml… đi qua nguyên vẹn.
2. **Phần có sửa → sửa trên DOM** giữ nguyên phần tử/thuộc tính lạ (`extLst`, `mc:AlternateContent`, `x14ac:*`, `w14:*`…),
   thứ tự thuộc tính, tiền tố namespace gốc. Phần tử mới được chèn **đúng thứ tự lược đồ** (xs:sequence).
3. Nếu nội dung sau khi ghi lại trùng bản gốc, giữ luôn byte nén gốc.
4. `save(to:)` ghi tệp tạm → **mở lại và kiểm tra hợp lệ** (`PackageValidator`) → mới thay tệp đích (nguyên tử).
   Kiểm tra thất bại thì tệp gốc không bị đụng tới.
5. Không âm thầm "sửa" lỗi có sẵn trong tệp nguồn; chỉ lỗi **mới** so với bản gốc mới bị coi là hỏng.

## Kiến trúc

| Module | Nội dung |
|---|---|
| `OOXMLZip` | CRC-32, DEFLATE nén + giải nén (RFC 1951), ZIP đọc/ghi: ZIP64, data descriptor, tên UTF-8/CP437, chú thích, giữ mục có phương thức nén lạ, chống ZIP bomb / path traversal / tên trùng |
| `OOXMLPackage` | Bộ phân tích/ghi XML không mất dữ liệu (chặn DTD/XXE), gói OPC: `[Content_Types].xml`, quan hệ, tên phần (mã hóa % theo chuẩn), nhân bản phần + phụ thuộc, dọn phần mồ côi, `PackageValidator`, `PackageDiff` |
| `OOXMLSpreadsheet` | `Workbook`, `Worksheet`, `SharedStrings`, `StyleSheet`, `FormulaRewriter`, `CellReference` |
| `OOXMLWord` | `WordDocument`, `WordStory` (thân/header/footer/footnote/endnote/comment), `Paragraph`, `Run`, `Table` |
| `OOXMLPresentation` | `Presentation`, `Slide`, `Shape` |
| `OOXMLKit` | Gom tất cả (`import OOXMLKit`) |

## Ví dụ

```swift
import OOXMLKit

// XLSX
let wb = try Workbook(contentsOf: url)
let ws = try wb.worksheet(named: "Dữ liệu")
try ws.setValue(200, at: "C3")
try ws.setValue("Bút bi (hộp 20)", at: "B3")
try ws.setFormula("SUM(C2:C6)", at: "C7", cachedValue: .number(953))
try ws.applyFormat(CellFormatChange(numberFormat: "#,##0 ₫", bold: true), at: "C7")
try wb.renameSheet("Dữ liệu", to: "Kho hàng")   // cập nhật công thức, tên định nghĩa, biểu đồ, pivot, liên kết
try wb.save(to: url)

// DOCX
let doc = try WordDocument(contentsOf: url)
doc.replaceText("Công ty TNHH 3T", with: "3T Group")      // xuyên run, ở mọi story
doc.paragraphs[0].setText("BÁO CÁO (SỬA ĐỔI)")
try doc.insertImage(pngData, after: doc.paragraphs[0])
try doc.save(to: url)

// PPTX
let deck = try Presentation(contentsOf: url)
try deck.slides[0].titleShape?.setText("Kế hoạch 2027")
try deck.slides[0].setNotesText("Ghi chú cho người trình bày")
try deck.duplicateSlide(at: 1)
try deck.deleteSlide(at: 3)
try deck.save(to: url)
```

## Khả năng hiện có

**XLSX** — đọc giá trị (số, chuỗi chia sẻ/rich text/inline, bool, lỗi, chuỗi công thức), công thức (mở rộng công thức chia sẻ cho ô phụ thuộc),
style (định dạng số, nhận diện ngày, hệ 1900/1904), ô gộp, liên kết, độ rộng cột/chiều cao hàng, tên định nghĩa, sheet ẩn;
ghi giá trị/công thức/xóa ô (giữ style), áp định dạng (đậm, nghiêng, gạch chân, màu, cỡ, nền, căn lề, xuống dòng, định dạng số — luôn tạo xf mới,
không sửa xf đang dùng), gộp/bỏ gộp, độ rộng cột (tách vùng `<col>`), chiều cao hàng, thêm sheet, đổi tên sheet, **xóa sheet** (tham chiếu → `#REF!`, dọn phần chỉ sheet đó dùng), **chèn/xóa hàng và cột** (đồng bộ công thức mọi sheet, tên định nghĩa, biểu đồ, bảng, gộp ô, định dạng có điều kiện, xác thực, liên kết, ảnh neo theo ô, bình luận + VML);
xử lý đúng công thức chia sẻ (sửa ô chủ → mở rộng cả nhóm), công thức mảng (chặn sửa ô con), `calcChain` (xóa khi công thức đổi),
`fullCalcOnLoad`, tệp dùng tiền tố `x:`, hàng/ô không có thuộc tính `r`, namespace Strict.

**DOCX** — đọc chữ như Word hiển thị (gồm chữ chèn theo dõi, kết quả trường; bỏ chữ đã xóa, mã trường, hộp văn bản), bảng (gridSpan/vMerge),
content control, header/footer/footnote/endnote/comment, style; đặt chữ đoạn (giữ pPr, run đầu, bookmark, phạm vi chú thích, ảnh, tham chiếu footnote/comment),
thay chữ xuyên run (khớp cả tiếng Việt dựng sẵn/tổ hợp), chèn/xóa đoạn, đổi style/căn lề, định dạng run, đặt chữ ô bảng, chèn ảnh PNG/JPEG/GIF.

**PPTX** — slide theo thứ tự, phân đoạn (p14), hình (kể cả trong nhóm và `mc:AlternateContent`), placeholder, vị trí, ảnh, bảng, biểu đồ, ghi chú;
đặt chữ hình (giữ định dạng/cấp thụt lề), thay chữ xuyên run (slide + ghi chú), sửa ô bảng, đặt/tạo ghi chú, nhân bản slide (sao chép riêng biểu đồ/SmartArt/workbook nhúng),
xóa slide (dọn ghi chú, bình luận, ảnh/biểu đồ chỉ slide đó dùng; cập nhật phân đoạn, trình chiếu tùy chỉnh), đổi thứ tự slide, **thêm slide mới từ layout** (`layouts`, `addSlide(layout:at:)`).

## Chưa làm (giữ nguyên khi lưu, nhưng chưa có API sửa)

- XLSX: **không tính công thức** (ghi `cachedValue` nếu có, đặt `fullCalcOnLoad` để Excel tính lại); chèn/xóa cột cắt ngang bảng (bị từ chối an toàn); ngắt trang `rowBreaks` khi chèn hàng;
  sửa định dạng có điều kiện, xác thực dữ liệu, bình luận, bảng (table), pivot, biểu đồ. Sheet/part mới trong tệp Strict dùng namespace Transitional.
- DOCX: theo dõi thay đổi có ở `setText(_:revision:)`, `appendParagraph(_:revision:)` (+ chấp nhận/từ chối tất cả), các thao tác khác (thay chữ, định dạng, chèn ảnh) chưa ghi thành theo dõi; `setText` bỏ liên kết/trường trong đoạn đó;
  chưa tạo bảng/danh sách/section/bình luận mới.
- PPTX: nhân bản không chép ghi chú/bình luận. (Thay ảnh: `Shape.replaceImage`.)
- Không hỗ trợ tệp có mật khẩu (thực chất là OLE/CFB, không phải ZIP), DOC/XLS/PPT nhị phân.
- Mô hình DOM nạp cả phần XML vào bộ nhớ: sheet 300.000 ô mở ~1,6 s (Linux x86, release) — cần đo trên iPhone thật.

## Chạy test

```bash
cd ports/ios/OOXMLKit
swift test                        # hoặc mở Package.swift bằng Xcode → Product › Test (scheme OOXMLKit-Package)
scripts/run-tests.sh              # test + kiểm chéo tệp kết quả bằng zlib/expat/openpyxl/python-docx/python-pptx
scripts/fixtures/make_all.sh      # tái tạo fixture tổng hợp (tất định)
```

Fixture: `Tests/OOXMLTestSupport/Fixtures/` — `zip/`, `deflate/`, `xlsx/`, `docx/`, `pptx/` sinh bằng script trong `scripts/fixtures/`
(XML viết tay theo mẫu đầu ra Office 365); `real/` chép từ `tests/fixtures/real-office-samples` (do LibreOffice tạo) + `ton-kho-3t.xlsx`,
`slides-saved-roundtrip.pptx`. **Không** commit tài liệu thật của người dùng.

## Tích hợp ứng dụng

Thêm gói cục bộ trong Xcode (File › Add Package Dependencies… › Add Local… › chọn `ports/ios/OOXMLKit`), link sản phẩm `OOXMLKit`.
Tầng cầu nối WKWebView (JSON ↔ `Workbook`/`WordDocument`/`Presentation`) và giao diện **chưa làm** — theo yêu cầu, chỉ tích hợp UI sau khi báo cáo PASS/FAIL được duyệt.
