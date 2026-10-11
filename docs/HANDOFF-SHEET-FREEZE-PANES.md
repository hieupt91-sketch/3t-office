# Bàn giao: VN Sheet — Freeze Panes (Cố định ô) thật, đúng hành vi Excel/Calc

## 1. Bối cảnh & lỗi thật

Trước đợt này, "Cố định hàng/cột" trong VN Sheet là một nút bật/tắt đơn giản, LUÔN cố định cứng hàng 1 và cột A qua CSS `:empty`-style hardcoded selector (`.vno-freeze-panes th.vno-col-header[data-col="A"]`, `tr[data-row="1"]`), bất kể người dùng đang chọn ô nào. Real Excel/Calc's Freeze Panes luôn cố định các HÀNG PHÍA TRÊN và CỘT BÊN TRÁI của Ô đang chọn — một hành vi hoàn toàn khác.

Đào sâu hơn còn phát hiện lỗi THỨ HAI, nghiêm trọng hơn: lưới Sheet dùng ẢO HÓA HÀNG (row virtualization, chỉ dựng `[startRow, endRow]` quanh vị trí cuộn hiện tại, buffer mặc định chỉ 8 hàng). Vì hàng "cố định" trước đây chỉ dựa vào CSS `position: sticky` mà không có cơ chế đảm bảo hàng đó LUÔN nằm trong DOM, nên khi người dùng cuộn đủ xa (chỉ cần qua ~30-40 hàng), hàng cố định bị ảo hóa loại khỏi DOM và **biến mất khỏi màn hình dù `isFrozenPanes` vẫn `true`** — một lỗi hiển thị thật, dễ tái hiện, ảnh hưởng mọi sheet có trên ~40 hàng.

## 2. Kiến trúc giải pháp

### 2.1 Dữ liệu: `frozenRows`/`frozenCols` thay cho boolean `isFrozenPanes`

Giữ nguyên `isFrozenPanes` (được tính lại là `frozenRows>0||frozenCols>0`) để không phá vỡ toàn bộ ~20 điểm code hiện có đang đọc thuộc tính này (snapshot sheet, undo/redo lịch sử, sheetStates theo từng sheet...). Thêm `frozenRows`/`frozenCols` làm nguồn sự thật thật sự, theo dõi **riêng theo từng sheet** qua `sheetStates[sheetName].frozenRows/frozenCols` — y hệt cách `isFilterActive`/`hiddenRows` đã theo dõi riêng theo sheet từ trước.

### 2.2 `SheetGridController` (`apps/sheet/sheet-grid.js`)

- `toggleFreezePanes()`: nếu ĐANG có freeze (bất kỳ dạng nào) → bỏ cố định (đúng hành vi nút đơn của Excel thật: khi đang freeze, nút luôn hiện "Unfreeze Panes"). Nếu chưa freeze → tính `rows = selectedCoord.r - 1`, `cols = columnNumber(selectedCoord.c) - 1` rồi cố định đúng vị trí đó.
- `freezeTopRow()` / `freezeFirstColumn()`: 2 lệnh mới, khớp đúng 2 mục còn lại trong dropdown Freeze Panes thật của Excel — mỗi lệnh tự bật/tắt đúng cấu hình riêng của nó (1,0) / (0,1).
- `_setFreezePanes(rows, cols, recordUndo)`: nguồn sự thật duy nhất, ghi undo dạng `{type:"freeze", prevRows, prevCols, nextRows, nextCols}` (thay hoàn toàn undo boolean cũ), gọi `_renderVirtualRows()` để áp lại toàn bộ layout.
- `_buildRowTr(r)`: TÁCH RIÊNG toàn bộ logic dựng 1 hàng (trước đây nằm trực tiếp trong vòng lặp `_renderVirtualRows`), dùng lại được cho cả hàng ảo hóa bình thường VÀ hàng cố định.
- `_renderVirtualRows(startRow, endRow)` (đã viết lại): hàng `1..frozenRows` LUÔN được dựng riêng (một `documentFragment` chèn trước `topSpacer`), **độc lập với cửa sổ ảo hóa cuộn hiện tại** — đây là bản sửa chính cho lỗi ảo hóa. `topSpacer`'s chiều cao được tính lại trừ đi phần đã được hàng cố định "gánh": `skippedAbove = max(0, startRow - 1 - frozenRows)`. Vòng lặp ảo hóa chính bỏ qua `r <= frozenRows` để tránh dựng trùng khi cuộn gần đỉnh. Khi `frozenRows=0` (mặc định), toàn bộ logic thu về chính xác hành vi cũ — không rủi ro hồi quy cho trường hợp phổ biến không dùng Freeze Panes.
- `_applyFreezeVisuals()` (mới): tính offset pixel tích lũy CHO TỪNG hàng/cột cố định (dùng `getRowHeight()`/`getColumnWidth()` thật, không giả định đồng nhất), gán `position:sticky` + `top`/`left` bằng inline style — thay hoàn toàn cách cũ hardcode `top:24px`/`left:44px` cho đúng 1 hàng/1 cột. Cũng áp dụng sticky-left cho header cột (`this.theadRow`, mới lưu tham chiếu) khi có cột cố định.
- CSS (`apps/sheet/sheet.css`): thay toàn bộ selector tĩnh `[data-col="A"]`/`[data-row="1"]` bằng class động (`.is-frozen-row-cell`, `.is-frozen-col-cell`, `.is-frozen-row-last`, `.is-frozen-col-last`) — chỉ còn phụ trách màu nền/viền, vị trí sticky do JS tính động.

### 2.3 Ribbon: dropdown "Cố định ô" (View > Cửa sổ), đúng bố cục thật của Excel

Chuyển nút đơn cũ thành dropdown 3 mục (`sheet.view.freezePanes`, `sheet.view.freezeTopRow`, `sheet.view.freezeFirstColumn`) — đúng 3 mục thật trong Excel's View > Freeze Panes. 2 icon SVG mới (`freezeTopRow`, `freezeFirstColumn`).

### 2.4 UNO thật

`.uno:FreezePanes` (đã có từ trước), `.uno:FreezePanesRow`, `.uno:FreezePanesColumn` — tên lệnh UNO thật của LibreOffice Calc.

### 2.5 Persist qua file thật — một giới hạn khác của soffice, cùng lớp với Slide Size

**Xác nhận qua vòng chuyển đổi soffice THẬT** (không đoán mò): dựng một XLSX chuẩn OOXML có `<pane xSplit ySplit state="frozen">` thật, chuyển qua `soffice --convert-to fods` — kết quả FODS **HOÀN TOÀN KHÔNG** chứa bất kỳ `HorizontalSplitMode`/`VerticalSplitMode`/`Tables` view-settings map nào tương ứng. Chiều ngược lại (FODS có `config:config-item-map-named "Tables"` tự viết tay theo đúng chuẩn ODF → `soffice --convert-to xlsx`) cũng cho kết quả tương tự: `<pane>` không xuất hiện trong XLSX. Kết luận: **soffice không khôi phục Freeze Panes qua ODF `office:settings` ở CẢ HAI CHIỀU khi chuyển đổi headless** — một giới hạn thật của chính soffice, không phải lỗi cú pháp phía VN Office (đã thử với cấu trúc XLSX hợp lệ 100% theo ECMA-376).

Áp dụng đúng kiến trúc post-process/open-overlay đã dùng cho Slide Size, Master Logo, Sections, Show Properties:

- **Export** (`postprocess_sheet_xlsx()` trong `ooxml_zip_patch.py`, JS twin trong `xlsx-native-postprocess.js`): đọc `vno:frozen-rows`/`vno:frozen-cols` VN Office tự ghi trên `<table:table>` trong FODS nguồn (`_serializeSheet` trong `sheet-adapter.js` — chỉ ghi khi rows>0 hoặc cols>0, không ghi thừa cho sheet không freeze), phân giải TÊN SHEET → đúng file `xl/worksheets/sheetN.xml` (qua `xl/workbook.xml` + `xl/_rels/workbook.xml.rels`, hỗ trợ NHIỀU sheet cùng lúc), ghi `<pane>` chuẩn OOXML trực tiếp vào XLSX thật SAU KHI soffice xuất ra.
- **Mở file** (`overlay_sheet_xlsx_fods()`, đã mở rộng — trước đây chỉ xử lý lockStructure): đọc `<pane>` thật từ MỖI `worksheetN.xml` của XLSX gốc, ghi `vno:frozen-rows`/`vno:frozen-cols` vào đúng `<table:table>` trong FODS TRƯỚC KHI `SheetAdapter.parseFods()` chạy.
- `adapters/libreoffice/sheet/xlsx-freeze-panes.js` (JS, browser-safe, không phụ thuộc Node): các hàm string-only thuần túy (`parseFreezePanesFromFods`, `applyFreezePanesToFods`, `parseFreezePaneFromSheetXml`, `applyFreezePaneToSheetXml`, `columnLabelFromIndex`, `resolveSheetRidMap`, `resolveRidTargetMap`) — Python twin song song trong `ooxml_zip_patch.py`.
- **`main.py`**: gỡ bỏ cổng chặn early-return (`if not patcher.fods_has_structure_protection(fods): return`) khiến `postprocess_sheet_xlsx()` trước đây CHỈ được gọi khi có khóa cấu trúc workbook — trường hợp HIẾM, khiến Freeze Panes (trường hợp PHỔ BIẾN hơn nhiều) không bao giờ được patch trong thực tế. Giống hệt bug đã sửa cho Slides Slide Size.

## 3. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS (thêm file mới `xlsx-freeze-panes.js`).
- `node tests/run-tests.js`: **1419/1419 PASS** (1404 nền + 15 test mới suite 129 "VN Sheet Freeze Panes thật"): khai báo lệnh + UNO, cố định đúng theo Ô đang chọn (không hardcode), bấm lại bỏ cố định, freeze tại A1 không tạo gì (đúng Excel), freezeTopRow/freezeFirstColumn, Undo/Redo đúng frozenRows/frozenCols, freeze theo từng sheet không rò rỉ, `_renderVirtualRows()` LUÔN dựng hàng cố định dù cuộn xa (test trực tiếp lỗi ảo hóa đã sửa), round-trip FODS qua `vno:frozen-rows/cols`, và toàn bộ hàm `xlsx-freeze-panes.js`.
- `python -m unittest` (18 module, từ thư mục gốc dự án): **93/93 PASS** (81 nền + 12 test mới `tests/test_sheet_freeze_panes.py`: column label, parse/apply FODS, parse/apply `<pane>` XLSX, postprocess ghi đúng sheet theo tên, overlay đọc đúng `<pane>` thật).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- `node tests/live/sheet-freeze-panes.playwright.mjs` (mới — trình duyệt thật): chọn D5, mở dropdown Cố định ô thật, xác nhận cố định ĐÚNG 4 hàng/3 cột (không phải 1/A), cuộn RẤT XA (scrollTop=3000) xác nhận hàng cố định 1-4 **VẪN CÒN TRONG DOM** (lỗi ảo hóa đã sửa), bấm lại bỏ cố định, Freeze Top Row hoạt động đúng.
- `node tests/live/sheet-fods-freeze-panes-real-conversion.mjs` (mới — vòng chuyển đổi soffice THẬT, không phải self-round-trip): dựng FODS thật với freeze tại D5 (4 hàng, 3 cột), chuyển qua `soffice --convert-to xlsx` — xác nhận probe soffice thật BỎ QUA `<pane>` hoàn toàn; `postProcessSheetXlsx()` (JS) VÀ Python CLI đều ghi đúng `xSplit="3" ySplit="4"`; chuyển ngược PPTX đã vá → FODS thật qua soffice; `overlaySheetXlsxFods()` đọc lại đúng `<pane>` từ XLSX gốc, khôi phục đúng `vno:frozen-rows="4" vno:frozen-cols="3"`; nạp lại qua `SheetAdapter.loadFromFods()` cho kết quả `frozenRows=4, frozenCols=3` chính xác — xác nhận round-trip đầy đủ qua VN Office.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQAtxPSqMH9cVDTLUuckNw
