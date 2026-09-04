# Handoff — Sheet + Slides UI Audit (04/09/2026)

TASK: Rà soát và sửa toolbar/ribbon, shortcut và icon của VN Sheet, VN Slides
AGENT/ROLE: agy (implementation) — bị cắt bởi giới hạn print-timeout của wrapper CLI trước khi kịp tự viết báo cáo; Claude review, xác minh thật, merge.
BRANCH: `fix/sheet-slides-ui-audit-deep` (đã merge vào `main`), tiếp nối `fix/sheet-slides-ui-audit` (lifecycle cleanup, đã merge trước đó).

## Findings và fixes

| STT | Command ID | App | Loại lỗi | Đã sửa | Cách xác minh |
|---:|---|---|---|---|---|
| 1 | `common.file.new` / `common.file.close` | Sheet | Không có `handleDispatch` case, không `bindHandler` — bấm không tác dụng | Đã sửa (`SheetAdapter.newDocument()` gọi `SheetGridController.resetToBlank()`, xóa sạch dữ liệu/sheet/comment/pivot/CF/DV/print area) | Playwright: gõ dữ liệu thật vào ô, bấm File > Mới thật, dữ liệu bị xóa |
| 2 | `common.file.new` / `common.file.close` | Slides | Tương tự #1 | Đã sửa (`SlidesAdapter.newDocument()` gọi `SlidesCanvasController.resetToBlank()`) | Đọc code xác nhận reset đầy đủ state (slides, undo stack, theme, transition) |
| 3 | `sheet.view.zoomIn/zoomOut/zoomReset`, `sheet.view.gridlines/headings`, `sheet.review.commentInsert`, `sheet.page.setPrintArea/clearPrintArea/insertPageBreak/removePageBreak`, `sheet.formula.nameManager` | Sheet | Các method thật ĐÃ TỒN TẠI sẵn trong `SheetGridController` (từ các đợt việc trước) nhưng KHÔNG có `handleDispatch` case nối ribbon → method — nút chết dù tính năng đã code xong | Đã sửa (nối dispatch) | Playwright: bấm tab Chế độ xem thật, bấm Zoom In thật, xác nhận `transform: scale(1.1)` áp dụng đúng vào bảng |
| 4 | `sheet.cell.fillColor` / `sheet.cell.textColor` | Sheet | Chỉ hoạt động khi có `args` cụ thể truyền vào, bấm trực tiếp trên ribbon (không qua bảng chọn màu) không có tác dụng | Đã sửa (giá trị mặc định khi không có args) | Đọc code, cùng loại lỗi vừa sửa cho Writer `writer.color.text` |
| 5 | `slides.text.insert` | Slides | Cập nhật `bodyEl.innerText` trực tiếp nhưng KHÔNG ghi lại vào `slide.body` (data model) — nội dung thêm mất khi chuyển slide hoặc lưu | Đã sửa | Đọc code, xác nhận `currentSlide.body` được đồng bộ |
| 6 | Dialog Slide Master, Diagram chooser, Insert Media, Transitions, Animations (5 dialog) | Slides | Phím Escape để đóng dialog không hoạt động — listener gắn vào `overlay` thay vì `document`, không nhận phím nếu focus không nằm trên overlay | Đã sửa (chuyển sang `document.addEventListener`, dọn dẹp đúng khi đóng) | Đọc code, đây là lỗi lặp lại nhất quán ở cả 5 dialog, sửa đồng bộ |
| 7 | `common.edit.selectAll` / `common.edit.pastePlain` | Sheet, Slides | Thiếu handler/case ở một số nơi | Đã sửa | Đọc code |

## Ghi chú

- agy dừng giữa chừng do wrapper CLI đạt `--print-timeout 25m` (không phải lỗi hết hạn mức sử dụng, không phải crash code) — xác nhận qua `git log`/mtime file, không dựa vào exit code.
- Một vài `case` trùng lặp trong `sheet-adapter.js` (`sheet.format.conditional`, `sheet.data.validation`, `sheet.data.pivotTable`, `sheet.data.pivotRefresh`) đã ĐƯỢC bind trực tiếp qua `bindHandler()` ở đầu `attach()` từ trước — các `case` thêm trong `handleDispatch()` cho các lệnh này thực chất không bao giờ được gọi tới (dead code vô hại, không gây lỗi). Không gỡ bỏ vì không ảnh hưởng chức năng và việc gỡ không thuộc phạm vi ưu tiên hiện tại.
- Trước khi merge, Claude đã tự đọc toàn bộ diff, xác nhận các method được gọi (`zoomIn`, `toggleGridlines`, `showCommentDialog`, `setPrintArea`, v.v.) đều đã có implementation thật trong `SheetGridController` (không phải gọi tới hàm không tồn tại), chạy `node tests/run-tests.js` (411/411 PASS) và live-test Playwright cho File > Mới (Sheet) và Zoom In (Sheet, sau khi sửa 1 lỗi trong chính script test của Claude — dùng sai class CSS `.vno-grid-table` thay vì `.vno-sheet-container`).
- Chưa live-test trực quan cho Slides (Escape key fix, comment insert, File New) — đã xác nhận qua đọc code kỹ, khuyến nghị làm thêm nếu có thời gian.

FILES CHANGED: `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/slides/slides-adapter.js`, `apps/sheet/sheet-grid.js`, `apps/slides/slides-canvas.js`.
TEST RESULTS: PASS — `411/411`; Playwright live PASS cho File > Mới (Sheet) và Zoom In (Sheet).
KNOWN FAILURES: Không.
NEXT ACTION: Live-test trực quan các fix Slides (Escape key, comment insert) nếu cần độ tin cậy cao hơn trước khi coi là hoàn tất 100%.
