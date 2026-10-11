# Sheet Open Phase 2 — findings

Ngày: 29/09/2026  
Worktree/branch: `E:\VNOffice-codex-sheet-open-phase2` / `perf/sheet-open-phase2-codex`

## Phạm vi

Chỉ tạo nguyên mẫu trong `scripts/perf-proto/` và tài liệu kết quả. Không sửa `main.py`, `adapters/**`, `apps/**`, `platform/**`; không thêm dependency; không đưa workbook, FODS hoặc payload sinh ra vào Git. Mọi phép đo chạy foreground. Không chạy nhánh phase 1 của Claude và không merge.

## Inventory từ `SheetAdapter.parseFods` và `loadFromFods`

`parseFods` trả model gồm `sheets`, `activeSheet`, `sheetsData`, các cell sparse trong `Map` (giá trị, công thức, style/number format, rich text và external link khi có), comments, merged ranges, named ranges workbook/theo sheet, print area, page setup, row/column widths, hidden rows/columns, `autoRowsAtImportBySheet`, images, tab colors, conditional formatting, data validation, pivot, chart, page breaks, workbook/sheet protection, freeze panes, visibility, autofilter và outline groups. `validationHits` chỉ là dữ liệu trung gian; `_attachImportedRules` tạo `dataValidationsBySheet` rồi xóa field này. Sparkline được gắn vào cell dưới thuộc tính `sparkline`; workbook không có `sparklinesBySheet`.

`loadFromFods` chuyển các trường này sang state của Sheet grid. Phần model loader scratch tái sử dụng helper của `SheetAdapter` để tạo model, nhưng không gọi `loadFromFods`, không thay code sản phẩm và không thay ranh giới UI/LibreOffice.

## Nguyên mẫu

- `fods_to_sheet_payload.py`: dùng thư viện Python chuẩn `ElementTree.iterparse` để streaming từng sheet/row/cell; giữ metadata/style/features trong support XML đã bỏ cell, giữ nguyên block style cần thiết bằng Expat, và nén NDJSON row stream bằng deflate rồi base64 trong JSON.
- `sheet-payload-loader.mjs`: dựng lại workbook object mà không dùng `DOMParser`; tái sử dụng helper hiện có trong `SheetAdapter` cho style, cell, validation, pivot, chart, protection, layout và các feature import khác.
- `webview_payload_probe.py` / `.mjs`: đo Python-to-WebView2 bridge, `JSON.parse`, build model, và so sánh model trong Edge/WebView2 với `parseFods`.
- `compare_parsefods_models.mjs`: mở rộng để nhận FODS hoặc payload và so sánh qua `toPlain`.

## Kết quả hai lượt benchmark

Kích thước dùng MB thập phân (byte/1.000.000). Mỗi nhóm WebView ghi `bridge / JSON.parse / build model`, đơn vị ms. Từng cặp là hai lượt độc lập foreground.

| FODS | Input MB | Python payload (giây) | Payload MB (giảm so với FODS) | WebView lượt 1 (ms) | WebView lượt 2 (ms) |
|---|---:|---:|---:|---:|---:|
| LAN11 | 17.65 | 1.185 / 1.120 | 15.26 (13.6%) | 651 / 22 / 553 | 686 / 20 / 521 |
| LAN12 | 24.26 | 1.538 / 1.361 | 18.36 (24.3%) | 826 / 26 / 913 | 814 / 26 / 873 |
| LAN28 | 2.20 | 0.270 / 0.233 | 1.08 (51.0%) | 76 / 2 / 262 | 69 / 2 / 253 |
| LAN06 | 4.50 | 0.488 / 0.407 | 2.21 (50.7%) | 103 / 5 / 422 | 109 / 5 / 423 |
| LAN14 | 322.64 | 43.842 / 43.875 | 18.11 (94.4%) | 971 / 28 / 20,782 | 984 / 27 / 20,970 |

LAN11/12/28 được tạo FODS cuối từ XLSX bằng `scripts/layout-audit/_time_sheet_open_stages.py` trước khi benchmark; pipeline đến FODS mất lần lượt 16.25 s, 12.38 s và 6.27 s. Đó là thời gian riêng, chưa cộng vào cột Python payload. LAN06 và LAN14 không có XLSX nguồn trong corpus làm việc: dùng các FODS hiện có, chỉ đọc (`E:\VNOffice-profiles\codex\perf\lan06-final.fods` và `E:\VNOffice-profiles\claude2\perf\lan14.fods`). Tái tạo FODS từ XLSX cho hai file này: **NOT RUN / BLOCKED — thiếu XLSX nguồn**. Kích thước LAN14 khớp FODS baseline 322,640,518 byte trong kế hoạch gốc.

## Đối chiếu model

So sánh trong WebView2/Edge giữa `toPlain(parseFods(FODS))` và `toPlain(loadSheetPayload(payload))` cho toàn bộ model, gồm collection đã chuẩn hóa. Kết quả: **PASS — MODEL IDENTICAL** trên:

- bốn fixture được yêu cầu: `sample-sheet.fods`, `sample-sheet-validation.fods`, `sample-sheet-pivot.fods`, `sample-sheet-formulas.fods`;
- fixture bổ sung: `sample-sheet-charts.fods`;
- LAN11, LAN12, LAN28, LAN06, LAN14.

`parsererror=false` trong phép so sánh LAN14 cuối; thời gian baseline `parseFods` của chính lượt đó là 87,850 ms. Loader đã lọc built-in name `_xlnm.Print_Area` khỏi `namedRangesBySheet` để khớp kết quả DOM scanner hiện tại của `parseFods`; giá trị print area vẫn có trong `printAreaBySheet`. Đây là tương đương với kết quả baseline của adapter hiện tại, không phải khẳng định chuẩn hóa semantics của built-in name.

Node CLI comparator có thể chọn nhánh parser regex khi thiếu DOMParser và đã cho sai khác trên fixture formulas. Vì vậy parity PASS ở trên dựa vào WebView2/Edge thật, không lấy Node fallback làm chuẩn. Harness và limitation này được ghi thêm trong kế hoạch phase 2.

## Giới hạn kết luận

- Các model đối chiếu đều IDENTICAL trên corpus đã có; chưa chứng minh mọi biến thể FODS/OOXML, mọi workbook LAN, thao tác sửa/hiển thị, hoặc save/round-trip.
- Đo bridge, JSON parse và model build riêng trong WebView2; chưa tích hợp pipeline vào `main.py` và chưa đo first visible grid hay tổng thời gian mở app.
- LAN06/LAN14 được dùng từ FODS sẵn có; stage tạo FODS từ XLSX cho hai file đó chưa chạy.
- Không chạy test suite hoặc build sản phẩm vì không sửa code sản phẩm.
- Artifact benchmark nằm ngoài worktree trong `E:\tmp` và profile người dùng; không được commit.

## Trạng thái ban đầu so với hiện tại

Trước task chưa có model payload đầy đủ hoặc parity/benchmark tương đương. Nay prototype đã sinh model payload, đạt parity trên 10 FODS và có đủ hai lượt converter/bridge/parse/build cho năm workbook LAN. Phép đo này chứng minh model/parsing pathway trong scratch scope; không chứng minh mục tiêu mở LAN14 dưới 60 giây.
