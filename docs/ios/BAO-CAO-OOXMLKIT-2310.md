# Báo cáo OOXMLKit — thư viện OOXML ngoại tuyến cho iOS/iPadOS (23/10/2026)

Nhánh: `claude/ooxml-offline-ios-library-fqqyj0` · Mã: `ports/ios/OOXMLKit/` · Hướng dẫn dùng: `ports/ios/OOXMLKit/README.md`

## 1. Kết luận

| Giai đoạn | Kết quả | Test | Kiểm chéo độc lập |
|---|---|---|---|
| 1. Lõi ZIP (DEFLATE, CRC, ZIP64) | **PASS** | 20/20 | 3/3 tệp (zipfile + zlib, gồm gói 70.000 mục ZIP64) |
| 1b. XML + gói OPC | **PASS** | 17/17 | 20/20 tệp (19 tệp thật lưu không sửa — **mọi phần trùng byte nén** — + 1 tệp thêm phần/quan hệ) |
| 2. XLSX | **PASS** | 20/20 | 13/13 tệp (openpyxl đọc lại đúng giá trị/style/tên sheet) |
| 3. DOCX | **PASS** | 11/11 | 11/11 tệp (python-docx đọc lại đúng chữ/bảng/ảnh/định dạng) |
| 4. PPTX | **PASS** | 11/11 | 13/13 tệp (python-pptx đọc lại đúng slide/tiêu đề/ghi chú/bảng) |
| **Tổng** | **PASS** | **79/79** (debug) · **79/79** (release) | **60/60** tệp |
| Biên dịch/chạy trên iOS (Xcode, simulator, máy thật) | **PASS** build + simulator (xem §8.2) · máy thật **NOT RUN** | 91/91 iPhone · 91/91 iPad | CI GitHub Actions macOS |
| Tích hợp UI / WKWebView | **NOT RUN** (cố ý) | — | Theo yêu cầu: chỉ tích hợp sau khi duyệt báo cáo này |

Môi trường chạy: Ubuntu 24.04 x86_64, Swift 6.0.3 (chế độ ngôn ngữ Swift 5, `swift-tools-version:5.9`), Python 3.13 + openpyxl, python-docx, python-pptx (chỉ để kiểm chéo, không phải phụ thuộc của thư viện).
Lệnh: `cd ports/ios/OOXMLKit && scripts/run-tests.sh` (và `CONFIG=release scripts/run-tests.sh`).

## 2. Cách kiểm "mở – sửa – lưu – đóng – mở lại"

Mỗi ca test sửa tài liệu đều qua `RoundTrip.verify` (`Tests/OOXMLTestSupport/RoundTrip.swift`):
1. Ghi kết quả ra **tệp thật** trên đĩa, đọc lại byte, mở lại bằng đối tượng mới (đối tượng cũ đã giải phóng).
2. `PackageValidator`: mọi phần có kiểu nội dung, mọi XML phân tích được, mọi quan hệ nội bộ trỏ tới phần có thật, không Id trùng, không Override mồ côi. Chỉ lỗi **mới** so với bản gốc mới tính là hỏng.
3. `PackageDiff` so với bản gốc: chỉ những phần được liệt kê trước mới được đổi/thêm/xóa; **mọi phần còn lại phải trùng byte nén** (chứng minh chép nguyên trạng, không nén lại).
4. Kiểm nội dung sửa đúng **và** chuỗi XML của phần đã sửa vẫn còn các tính năng không đụng tới (extLst, mc:AlternateContent, x14ac, bình luận, bookmark, trường…).
5. Xuất tệp ra `OOXMLKIT_ARTIFACTS` → `scripts/verify_artifacts.py` kiểm bằng bộ đọc độc lập: `zipfile.testzip()` (zlib + CRC-32 → xác nhận bộ nén DEFLATE Swift đúng chuẩn), expat cho mọi XML, rồi openpyxl / python-docx / python-pptx.

## 3. Fixture

| Thư mục | Nguồn | Nội dung |
|---|---|---|
| `zip/`, `deflate/` | `scripts/fixtures/make_zip_fixtures.py` | stored, deflate, data descriptor, ZIP64 (local extra), tên UTF-8/CP437, chú thích, gói 3,3 MB, CRC sai, cờ mã hóa, `../` traversal, tên trùng, phương thức nén lạ (12), cắt cụt; 30 luồng DEFLATE do zlib sinh với 6 chiến lược |
| `xlsx/rich-excel.xlsx` | `make_xlsx_fixtures.py` (XML viết tay theo mẫu Excel 365) | rich text, numFmt/dxf, gộp ô, CF + x14 dataBar extLst, xác thực, liên kết ngoài + trong, comments + VML, ảnh, table, tên định nghĩa, công thức chia sẻ + mảng, calcChain, sheet ẩn, freeze pane, sheetProtection, printerSettings nhị phân, customXml, custom.xml |
| `xlsx/prefixed-x`, `implicit-refs`, `strict` | như trên | tiền tố `x:` (OpenXML SDK), hàng/ô không có `r`, namespace ISO Strict |
| `docx/rich-word.docx` | `make_docx_fixtures.py` (mẫu Word 365) | style, đánh số, bookmark, hyperlink, trường PAGE phức + fldSimple, ins/del, comments + commentsExtended + people, footnote, ảnh inline, hộp văn bản mc:AlternateContent + VML fallback, bảng gridSpan/vMerge, sdt, header có ảnh, footer có trường, w14:paraId, customXml; chữ bị chia qua run khác định dạng |
| `pptx/rich-deck.pptx` | `make_pptx_fixtures.py` (mẫu PowerPoint 365) | master/2 layout/2 theme, run tách nhỏ, hlinkClick, ảnh, nhóm, bảng, biểu đồ + workbook nhúng, comments cũ + authors, ghi chú + notes master, p14:sectionLst, custShow, chuyển cảnh p14 + Fallback, đường nối |
| `real/` (19 tệp) | chép từ `tests/fixtures/real-office-samples`, `ton-kho-3t.xlsx`, `slides-roundtrip/` | do **LibreOffice** tạo (không phải Microsoft Office): biểu đồ, pivot, autofilter ẩn, xác thực, header/footer, footnote, track changes, comments, bảng, ảnh, SmartArt, ghi chú |

Script sinh fixture tất định (chạy lại cho byte giống hệt; đã kiểm). **Chưa có** tệp do Microsoft Office thật tạo ra trong bộ test — xem mục 6.

## 4. Chi tiết theo giai đoạn

### 4.1 Lõi ZIP — PASS 20/20
- Inflate giải đúng 30/30 luồng zlib (stored, fixed, dynamic, Huffman-only, RLE, best). Deflate tự viết: vòng nén–giải nén đúng trên 9 loại dữ liệu × 3 mức; tệp 3,3 MB XML nén **300.347 byte so với zlib -9 là 300.231** (kém 0,04 %).
- Tốc độ (release, x86): giải nén 3,3 MB 14 ms; nén 90 ms.
- Lưu không sửa: **mọi mục giữ nguyên byte nén, CRC, phương thức, thời gian, thuộc tính**; data descriptor được bỏ khi ghi lại (đã biết kích thước).
- ZIP64: ghi/đọc gói 70.000 mục (EOCD ZIP64), Python `zipfile` đọc lại được.
- An toàn: từ chối gói không phải ZIP, cắt cụt, `../`, tên trùng; CRC sai và mục mã hóa báo lỗi khi đọc; giới hạn số mục / kích thước mục / tổng dung lượng (chống ZIP bomb); 500 + 300 lần làm hỏng ngẫu nhiên → chỉ báo lỗi, **không sập**.
- Mục dùng phương thức nén chưa hỗ trợ: không đọc được nội dung nhưng **vẫn chép nguyên** khi lưu.

### 4.2 XML + OPC — PASS 17/17
- XML: giữ thứ tự thuộc tính, tiền tố, comment, PI, CDATA, khoảng trắng; chặn DTD/ENTITY (XXE); hỗ trợ UTF-16; thuộc tính có xuống dòng giữ được qua vòng lưu; ký tự điều khiển không hợp lệ bị bỏ khi ghi.
- Mọi phần XML của 19 tệp thật: phân tích → ghi → phân tích cho cây giống hệt.
- 19 tệp thật lưu không sửa: 0 phần đổi, 0 phần bị nén lại.
- Thêm phần/quan hệ/kiểu nội dung, Id mới không trùng; dọn phần không còn đạt được; `save(to:)` từ chối ghi đè khi gói hỏng (tệp đích giữ nguyên).

### 4.3 XLSX — PASS 20/20
- Đọc đúng mọi kiểu ô, rich text, ngày (46318 → 23/10/2026), công thức chia sẻ của ô phụ thuộc (`E5` → `C5*D5`).
- Sửa giá trị / chuỗi có khoảng trắng đầu-cuối / bool / ô ngoài dimension / xóa ô → chỉ đổi `sheet1.xml`, `sharedStrings.xml`, `workbook.xml` (fullCalcOnLoad); 22 phần khác trùng byte. Trong sheet vẫn còn x14 CF, dataValidations, legacyDrawing, tableParts, sheetProtection, mc:Ignorable, x14ac:dyDescent, freeze pane, ô gộp, công thức mảng.
- Ghi công thức → `calcChain.xml` bị xóa (kèm quan hệ + Override), Excel tự dựng lại.
- Sửa ô chủ công thức chia sẻ → cả nhóm thành công thức thường đã dịch, giữ giá trị đệm. Sửa ô con của công thức mảng → báo lỗi rõ ràng.
- Style: tạo xf/font/fill mới từ style gốc (giữ viền, `protection`, extLst), dùng lại khi trùng; định dạng số tùy biến; tách `<col min=3 max=5>`.
- Đổi tên sheet cập nhật: công thức (kể cả `COUNTIF('Dữ liệu'!B:B, …)`), tên định nghĩa, liên kết nội bộ, **biểu đồ** (`c:f`), **nguồn pivot cache**, `docProps/app.xml`.
- Thêm sheet + 9.000 ô (3.000 hàng): chuỗi trùng dùng lại, app.xml cập nhật.
- 7/7 tệp thật: sửa 1 ô → mọi ô khác của mọi sheet giống hệt, mọi phần khác trùng byte.
- Hiệu năng (release, x86): tạo sheet 300.000 ô 3,3 s (tệp 1,7 MB); mở + phân tích 1,6 s; sửa 1 ô ở sheet nhỏ rồi lưu **6 ms** (sheet lớn chép nguyên); sửa sheet lớn rồi lưu 0,9 s.

### 4.4 DOCX — PASS 11/11
- Chữ đọc giống Word hiển thị: gồm `w:ins`, kết quả trường; không gồm `w:del`, mã trường, chữ trong hộp văn bản.
- Sửa tiêu đề, đoạn có phạm vi bình luận, đoạn có tham chiếu footnote, chèn đoạn Heading2, thêm đoạn cuối (trước `sectPr`), sửa ô bảng → **chỉ `word/document.xml` đổi**; vẫn còn commentRange/commentReference, footnoteReference, bookmark, ins/del, instrText, hộp văn bản + Fallback, ảnh, gridSpan/vMerge, sdt, w14:paraId, numPr, headerReference.
- Thay "Công ty TNHH 3T" (chia qua 3 run khác định dạng) → 6 chỗ ở thân, footer, footnote, comment; header viết HOA không bị thay; khớp được chữ Việt dạng tổ hợp (NFD); không khớp xuyên tab.
- Định dạng run theo đúng thứ tự lược đồ rPr; chèn ảnh: tên media không đè ảnh header, `docPr id` duy nhất toàn tài liệu, mô tả có ký tự đặc biệt được thoát.
- 7/7 tệp thật: thêm đoạn → nội dung mọi story khác giữ nguyên, chỉ `document.xml` đổi.

### 4.5 PPTX — PASS 11/11
- Đọc hình (kể cả nhóm), placeholder, ảnh, bảng, biểu đồ, ghi chú, phân đoạn.
- Sửa tiêu đề, ghi chú, danh sách nhiều cấp, ô bảng → chỉ 3 phần đổi; còn chuyển cảnh p14 + Fallback, hlinkClick, cấp thụt lề.
- Thay chữ qua run đậm/thường, trong nhóm, trong ghi chú.
- Nhân bản slide có biểu đồ: biểu đồ + workbook nhúng **sao chép riêng** (chart2.xml, …Worksheet1.xlsx), layout/ảnh dùng chung, phân đoạn cập nhật, app.xml `<Slides>4`; SmartArt (tệp thật) sao chép riêng data/layout/…
- Xóa slide: xóa luôn ghi chú và ảnh chỉ slide đó dùng; giữ layout/notes master/theme/biểu đồ của slide khác; cập nhật phân đoạn và custShow.
- Đổi thứ tự slide giữ phân đoạn liền mạch; tạo ghi chú mới từ notes master.
- 5/5 tệp thật sửa chữ + 3 tệp thật nhân bản/xóa: hợp lệ, python-pptx mở được.

## 5. Lỗi phát hiện và đã sửa trong quá trình làm (đều có test chặn tái phát)
1. **Inflate chậm bậc hai** (sao chép mảng mỗi tham chiếu ngược: 13 s cho 3,3 MB) → bộ đệm con trỏ: 14 ms.
2. **Worksheet giữ `unowned` workbook** → sập khi người gọi chỉ giữ worksheet. Đổi thành tham chiếu mạnh + cache yếu (không rò rỉ vòng).
3. **Phần tử mới tạo trên bản sao tách rời** (font, xf) nhận tiền tố `x:` chưa khai báo → đậm không có tác dụng. Gắn vào cây trước khi sửa.
4. **Tên phần không phải ASCII** (ví dụ `ảnh mới.png`) ghi thẳng UTF-8 vào ZIP → python-docx không mở được. Theo ECMA-376 phần 2 phụ lục A, nay ghi dạng mã hóa phần trăm; vẫn đọc được gói cũ ghi UTF-8 thô.
5. Phần sửa rồi trả về đúng nội dung cũ vẫn bị nén lại → nay giữ byte gốc.
6. Phát hiện **fixture có sẵn của repo bị lỗi**: `tests/fixtures/real-office-samples/sample-slides-smartart.pptx` có quan hệ `rId3` trỏ tới `/ppt/slideLayouts/slideLayout2.xml` không tồn tại. Thư viện giữ nguyên lỗi này (không tự sửa tệp người dùng), test ghi nhận là lỗi có sẵn. Người phụ trách Slides nên sửa script đóng gói `tests/scripts/pack-slides-smartart-pptx.mjs`.

## 6. Rủi ro, giới hạn, việc tiếp theo
- **BLOCKED — chưa build trên Xcode/iOS**: mã chỉ dùng Foundation có trên iOS 15+ (không dùng FoundationXML, Compression, zlib hệ thống), nhưng phải chạy `swift test` trên Mac (Xcode 15+) và chạy test trên simulator + iPhone/iPad thật trước khi tích hợp. Cần đo bộ nhớ/tốc độ trên thiết bị (mô hình DOM nạp cả phần XML).
- **Chưa có tệp do Microsoft Office tạo** trong bộ test (fixture tổng hợp viết tay theo mẫu Office 365 + tệp LibreOffice). Đề xuất: team Windows xuất một bộ tệp Office thật **không chứa dữ liệu cá nhân** cho cả 3 định dạng, và kiểm "mở bằng Word/Excel/PowerPoint không báo sửa chữa" cho các tệp kết quả trong `OOXMLKIT_ARTIFACTS` (bước này chưa chạy: NOT RUN).
- Giới hạn chức năng (giữ nguyên khi lưu nhưng chưa có API sửa): xem README mục "Chưa làm" — quan trọng nhất: **XLSX không tính công thức** (cần nối với bộ máy công thức JS `apps/sheet/formula-engine.js` qua WKWebView để có giá trị đệm), **DOCX sửa không ghi thành theo dõi thay đổi**, chưa chèn/xóa hàng–cột, chưa thêm slide từ layout.
- Bước tích hợp UI (sau khi duyệt): cầu nối JSON `WKScriptMessageHandlerWithReply` ↔ `Workbook`/`WordDocument`/`Presentation`, lưu tự động định kỳ, mở qua `UIDocumentPickerViewController`/security-scoped URL, Hướng dẫn sử dụng tiếng Việt cho từng thao tác (AGENTS.md §10).

## 7. Quyết định ghi nhận
SPEC-MOBILE §4 đề xuất giai đoạn 1 dùng máy chủ (phương án A). Ngày 23/10/2026 Người phụ trách yêu cầu team mobile làm **thư viện ngoại tuyến đầy đủ bằng Swift** (phương án C, không phụ thuộc LibreOffice/Python/máy chủ), theo thứ tự ZIP → XLSX → DOCX → PPTX, mỗi phần có fixture + test và báo cáo PASS/FAIL trước khi tích hợp UI. Báo cáo này là kết quả của yêu cầu đó.

## 8. Cập nhật tối 23/10/2026 (20:45 – 22:00): Phase 5, kiểm offline, CI iPhone/iPad

### 8.1 Kết quả
| Hạng mục | Kết quả | Số liệu |
|---|---|---|
| Toàn bộ test trên Linux (debug + release) | **PASS** | 91/91 + 91/91 (79 cũ + 12 mới) |
| Kiểm chéo độc lập toàn bộ tệp kết quả | **PASS** | 70/70 tệp (60 cũ + 10 tệp Phase 5) |
| Bảo đảm ngoại tuyến (`OfflineGuaranteeTests`) | **PASS** | 3/3: không API mạng/tiến trình ngoài, chỉ `import Foundation` + module nội bộ, không gói phụ thuộc |
| Phase 5 — xóa sheet | **PASS** | 3/3 test |
| Phase 5 — chèn/xóa hàng | **PASS** | 4/4 test (gồm 7 tệp thật: chèn rồi xóa → mọi ô về như cũ) |
| Phase 5 — thêm slide từ layout | **PASS** | 2/2 test (rich-deck + 5 tệp thật) |
| CI macOS `swift test` | **PASS** | 91/91 |
| CI build thiết bị iOS/iPadOS arm64 | **PASS** | Xcode 16.4 |
| CI test simulator iPhone / iPad | **PASS** | 91/91 / 91/91 |
| Thiết bị thật, Microsoft Office thật | **NOT RUN** | cần người có máy |

### 8.2 CI trên macOS thật (GitHub Actions `macos-15`, workflow `.github/workflows/ios-ooxmlkit.yml`)
Lần chạy 2 (commit `5b65d58`, run 39964966256), Xcode 16.4, Swift 6.1.2, macOS 15.7.9 arm64 — đã đọc log, có `pipefail`:

| Bước | Kết quả | Số liệu từ log |
|---|---|---|
| `swift test` trên macOS | **PASS** | 91/91 |
| Build thiết bị iOS/iPadOS arm64 (`generic/platform=iOS`, không ký) | **PASS** | biên dịch toàn bộ module cho thiết bị thật |
| Test trên **simulator iPhone** | **PASS** | 91/91 (Package 20, Presentation 13, Spreadsheet 27, Word 11, Zip 20) |
| Test trên **simulator iPad** | **PASS** | 91/91 (cùng phân bổ) |

→ Trạng thái "BLOCKED — chưa build trên Xcode/iOS" ở mục 6 **đã gỡ** cho build + simulator. Còn NOT RUN: iPhone/iPad **thật** (đo bộ nhớ/tốc độ) và mở tệp kết quả bằng Microsoft Office thật.
Lưu ý chi phí: runner macOS tính phút gấp 10 lần Linux (≈3,5 phút/lần chạy); workflow chỉ chạy khi `ports/ios/**` đổi.

### 8.3 Lỗi phát hiện trong phiên tối
1. **Trùng tên với Foundation trên macOS**: Foundation của macOS có sẵn `XMLElement`/`XMLDocument` (NSXML) → module khác không biên dịch được trên Mac. iOS/iPadOS không có NSXML nên build iOS không bị. Đã đổi tên kiểu nội bộ thành `XElement`, `XDocument`, `XNode`, `XAttribute`, `XParser`, `XWriter`.
2. **CI lần 1 báo xanh sai**: bước `swift test` trên macOS thực ra lỗi biên dịch nhưng `| tail` che mã lỗi (shell macOS không bật `pipefail`). Đã bật `bash -eo pipefail`, bỏ cắt log, in đủ kết quả từng bộ test. Kết quả CI lần 1 **không được tính** là PASS.
3. Test xóa sheet ban đầu chưa tính liên kết nội bộ `'Tổng hợp'!A1` ở sheet khác → thư viện đã đổi đúng thành `#REF!A1` như Excel; sửa kỳ vọng của test cho đúng hành vi Excel (không phải đổi để "cho xanh": kiểm tra thêm giá trị `#REF!A1`).

### 8.4 Phase 5 làm gì
- `Workbook.deleteSheet(named:)`: gỡ sheet, xóa phần chỉ sheet đó dùng (drawing, ảnh, bình luận + VML, bảng, printerSettings), tham chiếu tới sheet trong công thức, tên định nghĩa, biểu đồ, liên kết → `#REF!`, bỏ tên cục bộ và dịch `localSheetId`, sửa tab đang chọn, cập nhật `docProps/app.xml`; không cho xóa sheet hiển thị cuối cùng.
- `Worksheet.insertRows(at:count:)` / `deleteRows(at:count:)`: dịch hàng/ô; cập nhật công thức mọi sheet (cả tham chiếu tuyệt đối, vùng nới rộng/co lại, ô bị xóa → `#REF!`), công thức chia sẻ được mở rộng trước, công thức mảng, tên định nghĩa, biểu đồ, bảng (table + autoFilter), gộp ô, định dạng có điều kiện (cả x14), xác thực, liên kết, dimension, vùng chọn/pane, ảnh neo theo ô (xdr:from/to), bình luận (comments + VML `x:Row`).
- `Presentation.layouts` + `addSlide(layout:at:)`: tạo slide theo layout (sao chép placeholder, bỏ ngày/chân trang/số trang như PowerPoint), chèn đúng vị trí, vào phân đoạn của slide đứng trước, cập nhật app.xml.
