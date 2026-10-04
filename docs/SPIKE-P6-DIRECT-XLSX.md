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

Corpus yêu cầu không có trong worktree: `E:\VNOffice-codex-p6\file test\lan` không tồn tại. Repo chỉ dẫn tới corpus khác ở `E:\VN OFice\file test\lan`, nhưng ranh giới nhiệm vụ chỉ cho phép đọc/ghi trong worktree và `E:\VNOffice-profiles\codex-p6-*`; vì vậy spike không đọc đường ngoài phạm vi đó. Không có file nào được tự nhận PASS và không có số đo giả.

| File | Đơn giản? | Thời gian mới vs cũ | Số ô khác biệt | Loại khác biệt |
|---|---:|---:|---:|---|
| lan01.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan02.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan03.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan04.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan05.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan06.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan07.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan08.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan09.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan10.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan11.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan12.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan13.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan14.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan15.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan16.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan17.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan18.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan19.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan20.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan21.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan22.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan23.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan24.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan25.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan26.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan27.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |
| lan28.xlsx | BLOCKED | NOT RUN / NOT RUN | NOT RUN | thiếu corpus trong worktree |

Tỷ lệ file đơn giản, thời gian so với mục tiêu 35 giây và số ô lệch đều **chưa thể kết luận** khi chưa chạy corpus thật.

## 6. Kết luận khả thi

Kết luận tạm thời: đọc trực tiếp là khả thi về mặt cơ chế cho subset bảo thủ; prototype chứng minh có thể stream worksheet và dựng đầy đủ dữ kiện cơ bản mà không thêm dependency. Tuy nhiên chưa đủ bằng chứng để bật trong app, kể cả sau cờ, vì cổng 28 file đang BLOCKED và schema chưa nối vào `buildSheetPayloadModel`.

Các phần khó nhất còn lại:

1. Chuẩn hóa formula Excel ↔ mô hình VN Sheet, gồm shared/array formula, external reference và cached error/string.
2. Date/time và precision: serial 1900/1904, leap-year giả của Excel, số dài, scientific notation và format locale.
3. Style: theme/tint/indexed colors, inheritance qua `cellStyleXfs`, custom number format, styled-empty cell và default row/column style.
4. Used range/hình học: dimension sai hoặc phình, row/column range lặp, hidden/filter/outline, covered cell của merge.
5. Tạo đúng mô hình JS hiện tại mà không dựng FODS trung gian, đồng thời detector không false-positive.

Ước lượng sau khi corpus hợp lệ: 8–13 ngày kỹ sư cho comparator semantic tự động, hoàn thiện parser subset, adapter JS nhận schema direct, cờ `VNO_OPEN_DIRECT=1`, fallback LibreOffice, telemetry lỗi, test/hướng dẫn tiếng Việt và đo desktop. Chỉ nên bắt đầu tích hợp sau khi: (a) mọi file detector nhận “đơn giản” có 0 khác biệt ở trường đã cam kết; (b) mở end-to-end dưới 35 giây; (c) mọi lỗi parse tự động fallback mà không mất dữ liệu.

## 7. Cách chạy lại khi corpus nằm trong phạm vi cho phép

```text
python scripts/perf-proto/direct_xlsx_reader.py "file test/lan/lan01.xlsx" --detect-only
python scripts/perf-proto/direct_xlsx_reader.py "file test/lan/lan01.xlsx" --output "E:/VNOffice-profiles/codex-p6-direct/lan01.direct.json"
```

Đối chiếu đầy đủ vẫn cần harness chạy đường LibreOffice hiện tại, hydrate payload v2 qua parser JS rồi so semantic theo từng ô. Không được dùng payload direct làm oracle cho chính nó.
