# SPIKE P6 — đọc XLSX trực tiếp bằng ZIP + XML

Ngày: 04/10/2026

Nhánh: `perf/p6-direct-xlsx-spike-codex`

Trạng thái: **spike độc lập, chưa đổi hành vi ứng dụng**

## 1. Mục tiêu và phạm vi

Prototype `scripts/perf-proto/direct_xlsx_reader.py` dùng thuần Python stdlib (`zipfile`, `xml.etree.ElementTree.iterparse`) để đọc workbook XLSX đơn giản mà không đi qua LibreOffice/FODS. Hàm `read_simple_xlsx()` trả payload semantic; nếu detector thấy tính năng ngoài phạm vi thì trả `None`, để thiết kế tích hợp sau này tiếp tục dùng đường LibreOffice hiện có.

Không có mã runtime nào được sửa, chưa có cờ `VNO_OPEN_DIRECT`, và schema spike chưa được UI tiêu thụ.

## 2. Đường hiện tại và payload phải thay thế

Đường hiện tại là XLSX → LibreOffice FODS → native overlay → optimize FODS → `build_sheet_open_payload()` → `buildSheetPayloadModel()` → grid. Payload v2 hiện tại có **chính xác** các trường top-level sau:

| Trường | Ý nghĩa |
|---|---|
| `format` | Hằng `vno.sheet.payload.v2`. |
| `rowsEncoding` | Hằng `deflate-base64-jsonl-row-xml`. |
| `sourceBytes` | Số byte UTF-8 của FODS cuối. |
| `sheets` | Số sheet (1–4096). |
| `rows` | Số record dòng (1–2.000.000). |
| `supportXml` | FODS đã giữ metadata/style nhưng rút nội dung ô khỏi dòng. |
| `rawStyleXml` | Map tối đa ba khối nguyên bản: `office:styles`, `office:automatic-styles`, `office:font-face-decls`. |
| `rowsDeflateBase64` | JSONL nén deflate/base64; record là `["sheet", name]`, `["row-xml", xml]`, `["end-sheet"]`. |

Vì payload v2 vẫn mang FODS, đường trực tiếp không thể byte-identical với nó. Cổng tương đương đúng phải so mô hình semantic sau `buildSheetPayloadModel`. Mô hình hiện tại có các nhóm trường: `sheets`, `sheetsData`, `activeSheet`, `commentsBySheet`, `mergedRangesBySheet`, `namedRangesWorkbook`, `namedRangesBySheet`, `printAreaBySheet`, `pageSetupBySheet`, `validationHits`, `rowHeightsBySheet`, `colWidthsBySheet`, `userHiddenRowsBySheet`, `userHiddenColsBySheet`, `imagesAtOpenBySheet`, cùng metadata được attach sau parse (visibility, filter, freeze, protection, outline, chart/pivot…).

Với tập workbook đơn giản của spike, đường mới phải tạo đủ các dữ kiện sau:

- Workbook: `date1904`, số sheet, thứ tự sheet.
- Mỗi sheet: `name`, `state` (`visible`/`hidden`/`veryHidden`), part nguồn, `dimensionRef`, `usedRange` thực (`minRow`, `minCol`, `maxRow`, `maxCol`, `ref`).
- Hình học: `columns[]` gồm `min`, `max`, `width`, `hidden`, `bestFit`, `customWidth`, `style`; `rows[]` gồm `r`, `height`, `hidden`, `customHeight`, `style`.
- Gộp ô: `merges[]` dưới dạng vùng A1.
- Ô: `ref`, `value`, `rawValue`, `formula`, `type`, `styleIndex`, `numberFormat`.
- Bảng `styles[]` dùng chung (không nhân style vào từng ô): chỉ số XF/number format/font/fill/border; font name/size/bold/italic/underline/strike/color; fill pattern/màu; border từng cạnh; alignment; protection.

Đó cũng là schema `vno.sheet.direct-xlsx.spike.v1` mà prototype sinh ra. Các giá trị số giữ cả giá trị Python và chuỗi OOXML `rawValue` để không mất bằng chứng precision khi đối chiếu.

## 3. Định nghĩa workbook “đơn giản”

Được hỗ trợ:

- OOXML `.xlsx` chuẩn, nhiều sheet, sheet ẩn/veryHidden;
- shared string thường hoặc inline string, số, boolean, error, ISO date;
- công thức scalar bình thường và cached value;
- cell XF với number format, font, solid/pattern fill, border, alignment, protection cơ bản;
- merge, độ rộng cột, chiều cao dòng, ẩn dòng/cột, used range.

Detector loại khỏi đường trực tiếp nếu có drawing/hình, chart, pivot/pivot cache, table, conditional formatting, data validation, hyperlink, comment/threaded comment, control/OLE/embedding, external link/connections, macro, scenario, workbook extension/custom view, rich/phonetic shared string hoặc array/shared/data-table formula. Đây là chính sách bảo thủ: false negative chỉ làm chậm vì fallback; false positive có thể làm sai tài liệu.

## 4. Kết quả unittest

Lệnh:

```text
python -m unittest tests.test_direct_xlsx_reader -v
```

Kết quả: **PASS 4/4**. Các ca bao phủ giá trị Unicode, số/boolean, công thức cached, number format/style, merge, kích thước và ẩn hàng/cột/sheet; cùng ba nhánh fallback cho drawing, công thức array và rich shared string.

## 5. Đối chiếu corpus LAN

Đã được người phụ trách cho phép **chỉ đọc** 28 file `lan01.xlsx`…`lan28.xlsx` tại `E:\VN OFice\file test\lan`. Tất cả artifact FODS/payload/model/comparison được ghi ngoài repo vào `E:\VNOffice-profiles\codex-p6-1`; không ghi hoặc sửa corpus. Mỗi số “direct” dưới đây là một lần chạy CLI prototype; với file bị loại, đó là thời gian detector đi đến quyết định fallback. Đường cũ chỉ chạy cho hai file đơn giản và ba file benchmark bắt buộc.

| File | Đơn giản? | Direct/detector (s) | Đường cũ đủ pha (s) | Số ô khác | Lý do detector / loại khác biệt |
|---|---:|---:|---:|---:|---|
| lan01.xlsx | Không | 4,363 | — | — | formula non-scalar; rich string; workbook `extLst` |
| lan02.xlsx | Không | 0,004 | — | — | formula non-scalar; drawing; rich string |
| lan03.xlsx | Không | 0,029 | **13,344** | — | formula non-scalar; drawing; rich string; conditional formatting; `extLst` |
| lan04.xlsx | Không | 0,006 | — | — | formula non-scalar; drawing; rich string |
| lan05.xlsx | Không | 0,019 | — | — | formula non-scalar |
| lan06.xlsx | Không | 5,630 | — | — | formula non-scalar; `extLst` |
| lan07.xlsx | Không | 0,009 | — | — | formula non-scalar; `extLst` |
| lan08.xlsx | Không | 0,014 | — | — | formula non-scalar; drawing; rich string; conditional formatting; comment |
| lan09.xlsx | Không | 0,710 | — | — | drawing; rich string; hyperlink; external link; `extLst` |
| lan10.xlsx | Không | 0,013 | — | — | drawing; rich string; OLE/embedding |
| lan11.xlsx | Không | 0,084 | — | — | drawing; rich string; conditional formatting; hyperlink; `extLst` |
| lan12.xlsx | Không | 0,026 | — | — | drawing; rich string; `extLst` |
| lan13.xlsx | Không | 0,010 | — | — | formula non-scalar; `extLst` |
| lan14.xlsx | Không | 4,865 | **94,247** | — | formula non-scalar; drawing; rich string; conditional formatting; external link; `extLst` |
| lan15.xlsx | Không | 0,047 | — | — | drawing; rich string; hyperlink; `extLst` |
| lan16.xlsx | Không | 0,037 | — | — | formula non-scalar; drawing; rich string; conditional formatting |
| lan17.xlsx | Không | 0,029 | — | — | formula non-scalar; `extLst` |
| lan18.xlsx | Không | 0,004 | — | — | drawing; rich string; `extLst` |
| lan19.xlsx | Không | 0,005 | — | — | formula non-scalar; drawing; rich string; `extLst` |
| lan20.xlsx | Không | 0,010 | — | — | formula non-scalar; `extLst` |
| lan21.xlsx | **Có** | **0,021** | 3,718 | **254** | 254 ô rỗng tường minh bị đường cũ lược bỏ; các trường semantic còn lại khớp |
| lan22.xlsx | Không | 0,017 | — | — | external link; `extLst` |
| lan23.xlsx | Không | 0,014 | — | — | formula non-scalar |
| lan24.xlsx | Không | 0,005 | — | — | formula non-scalar; drawing |
| lan25.xlsx | Không | 0,013 | — | — | table part |
| lan26.xlsx | Không | 0,265 | **16,130** | — | formula non-scalar; drawing; rich string; person metadata; `extLst` |
| lan27.xlsx | **Có** | **0,077** | 17,343 | **707** | 707 ô rỗng tường minh bị đường cũ lược bỏ; các trường semantic còn lại khớp |
| lan28.xlsx | Không | 0,022 | — | — | formula non-scalar; `extLst` |

Tỷ lệ detector nhận “đơn giản” là **2/28 = 7,14%**. Comparator dùng mô hình thật sau `buildSheetPayloadModel` trong WebView2. Kết quả chi tiết:

- `lan21`: direct 1.089 cell record, đường cũ materialize 835; 254/1.089 ô khác biệt đều là ô rỗng tường minh. 18/18 tên và thứ tự sheet khớp.
- `lan27`: direct 5.136 cell record, đường cũ materialize 4.429; 707/5.136 ô khác biệt đều là ô rỗng tường minh.
- Trên các ô cùng tồn tại: **0 khác biệt** về giá trị, công thức, kiểu và `numberFormat`. `numberFormat` cũ là object giàu metadata nên được so bằng `excelCode` với mã OOXML của direct.
- Merge, độ rộng cột, chiều cao dòng (chuẩn hóa point → pixel theo công thức Excel hiện có), ẩn hàng/cột, tên sheet và used range đều khớp. Không ép 254/707 ô rỗng thành PASS: direct hiện bảo tồn record rỗng mà đường cũ chủ động không materialize chúng.

### Benchmark đường cũ

“Đủ pha” = LibreOffice→FODS + native overlay + optimize + tạo payload Python + bridge WebView2 + `JSON.parse`/`buildSheetPayloadModel`. Đây là benchmark pipeline, không cộng thời gian boot chrome/app shell.

| File | LO→FODS | Overlay | Optimize | Payload Python | Bridge | JS parse+model | Tổng | So mục tiêu 35 s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| lan03 | 6,532 | 1,991 | 0,742 | 1,711 | 1,245 | 1,124 | **13,344** | Đạt |
| lan14 | 17,975 | 22,255 | 13,927 | 17,686 | 1,111 | 21,293 | **94,247** | Không đạt; +59,247 s |
| lan26 | 5,556 | 3,029 | 1,824 | 2,948 | 1,244 | 1,529 | **16,130** | Đạt |

`lan14` sinh raw FODS 257.170.145 byte, final FODS 315.991.252 ký tự và mô hình 1.490.828 ô. Số mới thấp hơn mốc mở đầy đủ khoảng 106 s trước đó nhưng vẫn vượt xa mục tiêu 35 s. File này cũng bị detector direct loại sau 4,865 s, nên prototype hiện **không** giải quyết trường hợp khó nhất.

## 6. Kết luận khả thi

Đọc trực tiếp khả thi về tốc độ cho subset rất hẹp: hai file được nhận đều đọc dưới 0,1 s và thấp hơn 35 s rất xa. Tuy nhiên mức phủ **7,14%** chưa đủ để biện minh cho việc tích hợp production, và comparator còn cho thấy direct giữ styled/explicit empty cell khác với mô hình hiện tại. Kết luận P6 hiện tại là **không nên bật**, kể cả sau feature flag, trước khi định nghĩa rõ semantics của ô rỗng và tăng mức phủ hoặc chứng minh 7,14% đem lại giá trị thực tế đáng kể.

Các phần khó nhất còn lại:

1. Formula shared/array/data-table và external reference; đây là lý do loại phổ biến nhất trong corpus.
2. Rich shared string, drawing/image và conditional formatting; bỏ qua các phần này sẽ tạo false-positive mất dữ liệu.
3. Date/time và precision: serial 1900/1904, leap-year giả, số dài/scientific và locale.
4. Style đầy đủ: theme/tint/indexed colors, `cellStyleXfs`, number-format object, styled-empty cell và default row/column style.
5. Adapter JS nhận schema direct, fallback nguyên tử về LibreOffice khi parse/build lỗi, telemetry cục bộ và kiểm thử desktop offline.

Ước lượng còn lại cho **subset hiện tại**: 7–10 ngày kỹ sư (chốt semantics ô rỗng, adapter JS, feature flag, fallback, error states, test và hướng dẫn tiếng Việt). Để tăng mức phủ corpus một cách đáng kể cần thêm khoảng **15–25+ ngày kỹ sư**, chủ yếu cho formula/rich text/drawing/conditional formatting; con số này cần spike riêng trước khi cam kết vì các tính năng đó đang là vùng LibreOffice xử lý tốt hơn. Điều kiện vào production vẫn là: 0 khác biệt semantic đã cam kết, mở end-to-end dưới 35 s, và mọi lỗi tự fallback không mất dữ liệu.

## 7. Cách chạy lại

```text
python scripts/perf-proto/direct_xlsx_reader.py "E:/VN OFice/file test/lan/lan21.xlsx"
python -m unittest tests.test_direct_xlsx_reader -v
```

Đặt `LOCALAPPDATA` dưới `E:\VNOffice-profiles\codex-p6-N`; ghi artifact ngoài repo; không commit XLSX/FODS/payload/model tài liệu thật. Harness CDP chỉ điều khiển qua DevTools Protocol, không dùng SendKeys/SendInput/pyautogui.
