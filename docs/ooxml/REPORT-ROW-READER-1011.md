# Báo cáo — SheetRowReader: đọc sheet theo cửa sổ hàng (10/11/2026)

Thuộc kế hoạch tốc độ #18 (bước P3: mở nhanh đến người dùng) và roadmap #14.

## Vấn đề đo được trên vn-main `e4aa5433`
XLSX tổng hợp 9,7 MB (104.501 hàng, 627.006 ô), Linux x86, bản release, mỗi chế độ một tiến trình riêng:

| Chế độ | Thời gian | RAM đỉnh |
|---|---|---|
| Mở lười (`workbook-lazymodel`) | 0,15 s | 72 MB |
| Mở + chạm ô đầu tiên của sheet (`sheet-lazy`, đường DOM) | 4,0–4,3 s | 533 MB |
| Mở + sửa 1 ô + lưu (`save-lazy`) | 9,6 s | 853 MB |
| Mở + sửa 1 ô + lưu truyền phát (`save-stream`) | 6,0 s | 558 MB |

Mở gói đã nhanh; nghẽn nằm ở việc dựng cây XML cho cả sheet lớn ngay lần chạm ô đầu tiên.

## Thay đổi
- `SheetRowReader` (mới): quét byte thô của `sheetN.xml` một lượt để lập chỉ mục vị trí từng `<row>`, rồi chỉ parse các hàng được hỏi bằng chính bộ parser hiện có. Giải mã ô dùng chung `Worksheet.decodeCell` (tách từ `makeCell`, hành vi không đổi), nên hai đường luôn cho cùng kết quả. Công thức chia sẻ: ô chủ nằm ngoài cửa sổ được tìm bằng quét byte, chỉ parse các hàng chứa ô chủ.
- `Workbook.rowReader(forSheetAt:)`, `rowReader(forSheetNamed:)`.
- Bridge: lệnh mới `sheet.readRows`; `open` nhận thêm `lazy: true`. Mặc định của `open` và `sheet.read` không đổi.
- `ooxml-bench`: thêm chế độ `rows-window`, `rows-all`.

## Kết quả đo (cùng máy, cùng tệp, 3 lần chạy)
| Việc | Đường DOM | SheetRowReader |
|---|---|---|
| 9,7 MB: mở + hiện 100 hàng đầu | 4,0–4,3 s, 533 MB | **0,30–0,46 s, 78 MB** |
| 1,0 MB: mở + hiện 100 hàng đầu | 0,29–0,43 s, 75 MB | **0,04 s, 27 MB** |
| 9,7 MB: đọc hết mọi hàng (lô 1.000) | khoảng 2,1 s sau khi mở, 533 MB | 4,7–5,2 s, **78 MB** |

Đọc hết cả sheet bằng bộ đọc mới chậm hơn đường DOM về thời gian (đổi lại RAM thấp hơn khoảng 7 lần). Bộ đọc nhắm tới màn hình đầu và cuộn, không nhắm thay đường DOM cho việc quét toàn bộ.

## Kiểm thử
- `SheetRowReaderTests` (7 bài): so khớp từng ô với `Worksheet.cells` trên 12 fixture XLSX (gồm tiền tố `x:`, tham chiếu ngầm, Strict, công thức chia sẻ, tệp LibreOffice), cửa sổ và vùng, hàng không tăng dần, `>` trong giá trị thuộc tính, `sheetData` rỗng, ảnh chụp thấy sửa đổi chưa lưu.
- `OOXMLBridgeTests.testSheetReadRowsMatchesSheetReadAndTracksEdits`.
- `swift test -c release`: 624/624, 0 lỗi (build sạch, Linux Swift 6.0.3). macOS/iOS: do CI chạy.

## Giới hạn
- Chỉ đọc. Sửa và lưu vẫn đi đường DOM, nên RAM lúc lưu sheet lớn chưa giảm (558–853 MB ở bảng trên). Đây là việc tiếp theo.
- Giả định: `<row>` là con trực tiếp của `<sheetData>`, cùng tiền tố namespace với phần tử gốc; chuỗi `<row` không nằm trong CDATA hay chú thích bên trong `sheetData`.
- Số đo là mốc Linux x86, không phải số thiết bị iPhone/iPad.
- Giao diện chưa gọi `sheet.readRows`; phần nối vào UI thuộc bước P1/P3 của #18.
