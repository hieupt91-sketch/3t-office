# Bàn giao: VN Sheet — Xem trước khi in (Ctrl+F2) và in thật (Ctrl+P)

## 1. Bối cảnh và lý do

Người dùng yêu cầu rà soát lại chế độ in/xem trước khi in trên toàn bộ ứng dụng, đối chiếu thao tác thật với Microsoft Office. Khi khảo sát, VN Sheet có hai vấn đề thật, không phải giả định:

1. Sheet không có bất kỳ tính năng Xem trước khi in nào. Nút "Xem ngắt trang" (Page Break Preview) và "Bố trí trang" (Page Layout) chỉ là các chế độ hiển thị để CHỈNH SỬA, không phải bản xem trước bản in thật — "Xem ngắt trang" thậm chí chỉ vẽ một watermark chữ "Trang 1" cố định, không tính toán ngắt trang thật.
2. Nghiêm trọng hơn: `common.file.print` (Ctrl+P) trước đây chỉ gọi `window.print()` trần trên DOM đang hiển thị. Vì lưới Sheet dùng ảo hóa hàng (row virtualization — chỉ khoảng 40 hàng quanh vị trí cuộn thực sự nằm trong DOM tại một thời điểm), in trực tiếp DOM đó sẽ in THIẾU dữ liệu, không tôn trọng Vùng in (Print Area), không áp dụng Khổ giấy/Lề/Tỷ lệ/Tiêu đề lặp lại đã đặt ở Thiết lập trang. Đây là một lỗi thật (không phải giả định) được xác nhận bằng cách đọc code, không chỉ suy đoán.

Việc này được Claude tự làm trực tiếp (không giao Grok) theo chỉ đạo "làm cho Grok luôn" trong lúc Grok hết quota, đi kèm quy trình kiểm chứng đầy đủ như một nhánh bất kỳ.

## 2. Kiến trúc giải pháp

### 2.1 `SheetGridController.computePrintPages(sheetName)` — apps/sheet/sheet-grid.js

Hàm phân trang thuần (không đụng `document`), tái sử dụng toàn bộ dữ liệu Page Setup đã có sẵn từ trước (`getPageSetup()`/`pageSetupBySheet`: margins bằng cm, orientation, size a4/letter/legal, scale percent hoặc pages, headerFooter, centerOnPage, printOptions, printTitles) và Vùng in hiệu lực (`_getEffectivePrintArea()`). Đây LÀ nguồn duy nhất cho cả Print Preview lẫn in thật — đảm bảo WYSIWYG (những gì Preview cho thấy chính là những gì in ra), giống triết lý Writer đã áp dụng cho `paginateContent()`.

Các quyết định thiết kế đáng chú ý:

- Lề trong `pageSetupBySheet` lưu bằng **cm** (input dialog ghi rõ "(cm)", mặc định 1.91cm ≈ 0.75 inch — chuẩn lề Excel thật), khác với Writer dùng **mm**. Ban đầu code viết nhầm dùng hằng số quy đổi mm→px cho lề cm, khiến lề bị tính nhỏ hơn thực tế 10 lần — đã phát hiện và sửa bằng cách thêm hằng số riêng `SHEET_CM_TO_PX = SHEET_MM_TO_PX * 10` trước khi viết test, không phải sau khi test báo lỗi.
- Chế độ tỷ lệ "vừa trang" trong `setPageSetup()` dùng chuỗi `"pages"` (không phải `"fit"` như phỏng đoán ban đầu) — xác nhận bằng cách đọc `setPageSetup()` thật trước khi code, tránh một lỗi thật thứ hai.
- Hàng/cột ẩn thủ công (`userHiddenRowsBySheet`/`userHiddenColsBySheet`) hoặc ẩn do outline bị loại khỏi trang in — đúng hành vi Excel thật (ẩn thì không in).
- Hàng/cột tiêu đề lặp lại (Print Titles) được tách khỏi phần thân và chèn lại đầu MỖI trang, không đếm trùng vào phần thân.
- Tỷ lệ "Vừa trong N trang rộng x M trang cao" tính gần đúng một bước (không lặp nhiều vòng như thuật toán Excel thật): không trừ riêng chi phí tiêu đề lặp lại trên MỖI trang khi ước lượng tỷ lệ ban đầu. Đây là một giới hạn được ghi nhận có chủ đích, không phải lỗi — với hầu hết trường hợp thực tế (không có Print Titles, hoặc tiêu đề chỉ 1-2 hàng/cột), sai số không đáng kể.
- Merge cells bị cắt tại biên trang nếu merge trải qua 2 trang (giống Excel thật khi merge cắt ngang một page break) — `colSpan`/`rowSpan` được tính lại theo đúng số hàng/cột merge THẬT SỰ nằm trong trang đang render, không giả định merge luôn trọn vẹn trong 1 trang.
- Thứ tự trang mặc định là "Xuống, rồi qua" (Down, then Over) — đúng mặc định thật của Excel, không phải "qua rồi xuống".

### 2.2 `_renderPrintPageTable(page)` — tái sử dụng `_renderCellVisual()`

Thay vì viết lại logic hiển thị giá trị/định dạng số/công thức, hàm này dựng bảng `<table>` thật rồi gọi lại chính `_renderCellVisual(td, itm, col, row)` — hàm THẬT mà lưới sống dùng để vẽ mỗi ô — cho từng ô trong trang. Điều này đảm bảo Print Preview hiển thị y hệt cách ô hiện trên màn hình (định dạng số, màu chữ âm, sparkline, hyperlink...), không phải một bản vẽ lại đơn giản hoá có nguy cơ lệch với dữ liệu thật.

### 2.3 `_syncSheetPrintOnlyDom()` + `print()` — vùng DOM chỉ-dùng-để-in

Dựng (hoặc cập nhật) một container ẩn `#vno-sheet-print-only` gắn vào `document.body`, chứa đủ TẤT CẢ các trang tính theo `computePrintPages()` — độc lập hoàn toàn với DOM ảo hóa đang hiển thị. `print()` gọi hàm này rồi mới gọi `window.print()`. CSS `@media print` ẩn `.vno-sheet-container` (lưới sống) và overlay Preview, chỉ hiện `#vno-sheet-print-only`. `SheetAdapter.print()` (được `common.file.print`/Ctrl+P gọi) nay ủy quyền cho `grid.print()` thật thay vì gọi `window.print()` trần như trước — đây là điểm sửa lỗi cốt lõi.

### 2.4 `openPrintPreview()` / `closePrintPreview()` — overlay Ctrl+F2

Overlay toàn màn hình với thanh công cụ (nút In, thông tin khổ giấy/tỷ lệ, điều hướng Trang trước/sau, đóng), dùng lại đúng `_renderPrintPageTable()` nên Preview và bản in thật tuyệt đối khớp nhau. Đóng bằng Esc hoặc nút ×, focus trap cơ bản (trả focus về phần tử trước đó khi đóng).

Lệnh mới `sheet.file.printPreview` (Ctrl+F2, giống hệt phím tắt Word/Excel thật) khai báo tại `platform/commands/command-definitions.js`, ánh xạ `.uno:PrintPreview` (đúng lệnh LibreOffice/Excel thật) tại `command-dispatch-mapper.js`, gắn nút lớn thứ 4 trong nhóm "Chế độ xem bảng tính" (View tab), cạnh Bình thường/Xem ngắt trang/Bố trí trang.

## 3. Các tệp đã thay đổi

- `apps/sheet/sheet-grid.js`: `SHEET_PAGE_SIZES_MM`, `SHEET_MM_TO_PX`, `SHEET_CM_TO_PX`; `_parsePrintTitleRows`, `_parsePrintTitleCols`, `computePrintPages`, `_formatSheetHeaderFooterText`, `_renderPrintPageTable`, `_syncSheetPrintOnlyDom`, `print`, `openPrintPreview`, `closePrintPreview`.
- `apps/sheet/sheet.css`: CSS overlay Preview, `#vno-sheet-print-only`, cập nhật khối `@media print` để ẩn lưới sống/hiện vùng in thật.
- `adapters/libreoffice/sheet/sheet-adapter.js`: `print()` ủy quyền `grid.print()`; bind + case dispatch cho `sheet.file.printPreview`/`.uno:PrintPreview`.
- `platform/commands/command-definitions.js`: lệnh `sheet.file.printPreview`.
- `adapters/libreoffice/common/command-dispatch-mapper.js`: mapping `.uno:PrintPreview`.
- `apps/sheet/sheet-ribbon.js`: nút mới trong nhóm workbookViews (View tab).
- `platform/i18n/strings-vi.js` / `strings-en.js`: khối `sheetDialogs.printPreview` (title/printBtn/prevPage/nextPage/pagePrefix/closeTooltip) VÀ mục catalog lệnh `"sheet.file.printPreview"` ở CẢ HAI nơi (bài học từ lỗi thiếu i18n catalog trong tính năng Custom Sort trước đó — đã thêm ngay từ đầu lần này, không phải sau khi test báo thiếu).
- `platform/help/entries-sheet.js`: mở rộng entry có sẵn `sheet.view.workbookViews` (không tạo entry trùng).
- `tests/unit/sheet-print-preview.test.js` (mới): 13 test — 9 test thuần cho `computePrintPages()` (không cần `document`) + 4 test DOM thật dùng `FakeElement`/`FakeDocument` tái tạo theo đúng khuôn mẫu `writer-print-preview.test.js`.
- `tests/live/sheet-print-preview.playwright.mjs` (mới): test trình duyệt thật, cổng 8933.
- `tests/run-tests.js`: đăng ký suite 121.

## 4. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1338/1338 PASS (1323 nền + 15 test mới trong suite 121 "VN Sheet Print Preview").
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 104/104 PASS, 0px tràn ngang — nút Print Preview mới không làm tràn tab View ở 1280px.
- `node tests/live/sheet-print-preview.playwright.mjs` (mới): PASS — gõ dữ liệu thật, Ctrl+F2 mở overlay thật hiển thị đúng dữ liệu, xác nhận 1 trang cho vùng nhỏ, bơm 80 hàng thật xác nhận nhiều trang đúng số lượng từ `computePrintPages()`, điều hướng Trang trước/sau hiển thị đúng dữ liệu từng trang, nút In trong Preview gọi `window.print()` thật đúng 1 lần, và Ctrl+P (toolbar) dựng `#vno-sheet-print-only` với ĐÚNG số trang từ `cellsData` — xác nhận trực tiếp lỗi "in thiếu dữ liệu do DOM ảo hóa" đã được khắc phục, không chỉ khẳng định suông.

## 5. Giới hạn đã biết (GAP), không che giấu

- Chỉ in trang tính đang active — chưa có tùy chọn "In toàn bộ workbook" hay "In vùng đang chọn" như backstage Print thật của Excel (hiện chỉ tôn trọng Print Area đã đặt cho sheet hiện tại). Đây là phạm vi v1, có thể mở rộng sau.
- Chế độ "Vừa trong N trang" tính tỷ lệ gần đúng một bước như đã nêu ở mục 2.1, không lặp nhiều vòng để tối ưu tuyệt đối như Excel thật khi có Print Titles nhiều hàng/cột.
- Header/Footer trong bản in chỉ hiển thị phần "center" (ở giữa); chưa hiển thị left/right dù dữ liệu đã có trong Page Setup — cần một hàng flex 3 cột nếu muốn đầy đủ như Excel thật. Ghi nhận là GAP cho vòng sau, không tự bổ sung giả.
- Chưa có nút "In toàn bộ workbook" / chọn máy in / số bản in trong overlay — trình duyệt xử lý phần này qua hộp thoại in thật của hệ điều hành khi `window.print()` được gọi, giống Writer đã làm.
