# Handoff — Sheet + Slides UI Audit Round 2 (04/09/2026)

TASK: Rà soát và sửa các tab Công thức/Dữ liệu/Chèn của Sheet và Chuyển tiếp/Hoạt hình/Trình chiếu/Chèn của Slides bằng thao tác trình duyệt thật.  
AGENT/ROLE: Codex — implementation + QA  
BRANCH: `fix/sheet-slides-ui-audit-round2`  
WORKTREE: `E:\VNOffice-codex-sheetslides-round2`  
OBJECTIVE: Đối chiếu command → adapter dispatch → controller method, sửa nút/hành vi chết và xác minh click/keydown thật ở `vi-VN` và `en-US`.

## Danh mục command audit tĩnh

- Sheet `sheet.formula.*` (4): `sheet.formula.sum`, `sheet.formula.average`, `sheet.formula.nameManager`, `sheet.formula.arrayEnter`.
- Sheet `sheet.data.*` (6): `sheet.data.sortAsc`, `sheet.data.sortDesc`, `sheet.data.filter`, `sheet.data.validation`, `sheet.data.pivotTable`, `sheet.data.pivotRefresh`.
- Sheet `sheet.insert.*` (1): `sheet.insert.date`. Tab Chèn còn dùng `sheet.row.insert`, `sheet.col.insert`, `sheet.chart.insert`.
- Slides `slides.transition.*` (1): `slides.transition.apply`.
- Slides `slides.animation.*` (1): `slides.animation.apply`.
- Slides `slides.show.*` (4): `slides.show.startFromBegin`, `slides.show.startFromCurrent`, `slides.show.presenterMode`, `slides.show.rehearseTimings`.
- Slides `slides.insert.*`: không có command theo prefix này. Tab Chèn dùng `slides.text.insert`, `slides.shape.insert`, `slides.diagram.insert`, `slides.image.insert`, `slides.media.insertVideo`, `slides.media.insertAudio`.

Tất cả command hiện hữu ở trên có đường dispatch thật qua `handleDispatch()` hoặc `bindHandler()`. Các method đích tương ứng đều tồn tại trong `SheetGridController`/`SlidesCanvasController`; không phát hiện case gọi method không tồn tại. Không có `globalCommandBus.setState()` trong phạm vi audit; code dùng `updateState()`.

## Findings và fixes

| STT | Command ID | App | Loại lỗi | Đã sửa | Cách xác minh |
|---:|---|---|---|---|---|
| 1 | `sheet.data.sortAsc`, `sheet.data.sortDesc` | Sheet | Dispatch đã nối đúng nhưng `SheetGridController.sort()` hard-code chỉ xét hàng `r >= 4`; vùng dữ liệu bắt đầu ở hàng 1/2 không được sắp xếp | Có — ưu tiên chính xác hàng trong vùng chọn; khi chọn một ô thì dùng các hàng có dữ liệu, không tạo dữ liệu giả | Playwright VI/EN nhập `3,1,2` tại M1:M3, Shift-click chọn vùng, click Sort A-Z thật; state thành `1,2,3`. `node tests/run-tests.js` PASS |
| 2 | Các dialog dùng `_createSheetDialog`: `sheet.formula.nameManager`, `sheet.data.validation`, `sheet.data.pivotTable` (cùng helper với comment/conditional formatting) | Sheet | Nút Apply/Delete gọi `overlay.remove()` trực tiếp nên listener `document.keydown` không được tháo; helper còn đăng ký keydown trùng trên overlay và document | Có — một `closeDialog()` duy nhất luôn tháo listener; bỏ listener overlay trùng | Playwright tạo Named Range thật, tạo Pivot thật, áp dụng Validation thật; mở lại và bấm Escape thật từ document ở VI/EN. Suite PASS |
| 3 | `sheet.chart.insert` | Sheet | Chart modal chỉ bắt Escape trên modal thay vì document; không có đường cleanup listener chuẩn | Có — listener chuyển lên document và được remove trong `close()` | Playwright click Chart thật, blur focus khỏi control dialog, bấm Escape và xác nhận modal biến mất ở VI/EN |
| 4 | `sheet.formula.sum`, `sheet.formula.average` | Sheet | Không phát hiện lỗi dispatch/controller | Không cần sửa | Click AutoSum thật và bấm `Alt+=` thật; kiểm tra formula input/history. Hàm AVERAGE đã có dispatch `insertFormula("AVERAGE")` và suite adapter PASS |
| 5 | VLOOKUP/HLOOKUP/INDEX/MATCH/COUNTIF/SUMIF | Sheet | Đây là hàm của formula engine, không phải command ribbon riêng; không phát hiện lỗi | Không cần sửa | Nhập từng công thức qua formula bar thật ở VI/EN và kiểm tra kết quả `Chi Anh`, `Binh`, `25`, `3`, `2`, `25` |
| 6 | `sheet.formula.arrayEnter` | Sheet | Không phát hiện lỗi | Không cần sửa | Chọn K1:L1 bằng click + Shift-click, nhập công thức qua formula bar, bấm `Ctrl+Shift+Enter` thật; metadata `isArrayFormula` được tạo ở VI/EN |
| 7 | `sheet.data.filter` | Sheet | Không phát hiện lỗi | Không cần sửa | Bấm `Ctrl+Shift+L` thật, xác nhận `isFilterActive=true` ở VI/EN |
| 8 | `sheet.data.validation` | Sheet | Không phát hiện lỗi chức năng ngoài lifecycle dialog ở #2 | Lifecycle đã sửa | Click ribbon, nhập danh sách `Có,Không`, Apply thật; validation được lưu |
| 9 | `sheet.data.pivotTable`, `sheet.data.pivotRefresh` | Sheet | Không phát hiện lỗi chức năng ngoài lifecycle dialog ở #2 | Lifecycle đã sửa | Chọn A1:C3, chọn Rows/Values và tạo worksheet Pivot thật; unit suite xác minh Refresh tính lại nguồn |
| 10 | `sheet.row.insert`, `sheet.col.insert`, `sheet.chart.insert` | Sheet | Không phát hiện lỗi ngoài Escape chart ở #3 | Escape đã sửa | Click ba nút thật; row/column count tăng và chart preview mở |
| 11 | `slides.transition.apply` | Slides | Không phát hiện lỗi | Không cần sửa | Click ribbon, chọn Zoom, Preview thật, Apply Current; mở lại chọn Flip, Apply All; kiểm tra mọi slide có transition; Escape thật đóng dialog ở VI/EN |
| 12 | `slides.animation.apply` | Slides | Không phát hiện lỗi | Không cần sửa | Click ribbon, thêm Fade In, Preview, Apply; mở lại Remove Animation; kiểm tra model `fadeIn → none`; Escape thật đóng dialog |
| 13 | `slides.show.startFromBegin`, `slides.show.startFromCurrent`, `slides.show.presenterMode` | Slides | Không phát hiện lỗi | Không cần sửa | Click From Beginning thật; bấm `Shift+F5` và `Alt+F5` thật; xác nhận slideshow/presenter overlay rồi Escape đóng |
| 14 | `slides.show.rehearseTimings` | Slides | Không phát hiện lỗi | Không cần sửa | Click ribbon thật, xác nhận timer thật xuất hiện; Escape kết thúc rehearsal |
| 15 | `slides.image.insert`, `slides.media.insertVideo`, `slides.media.insertAudio`, `slides.shape.insert` | Slides | Không phát hiện lỗi | Không cần sửa | Click từng nút thật; Playwright xử lý browser file chooser bằng file PNG/WebM/WAV thật; model chứa image/video/audio/rect |
| 16 | `slides.diagram.insert` | Slides | Không phát hiện lỗi | Không cần sửa | Click ribbon, chọn Cycle, nhập 3 node, click Insert; model chứa node và connector thật |

## Capability không hiện hữu trong UI hiện tại

- Sheet tab Chèn không có nút/command chèn Bảng hoặc Hình ảnh; chỉ có Chèn hàng, Chèn cột và Biểu đồ. Không claim PASS cho Bảng/Hình ảnh.
- Sheet không có command/UI Text to Columns hoặc Remove Duplicates. Không claim PASS.
- Pivot Table hiện nằm ở tab Dữ liệu, không nằm ở tab Chèn.
- Các nhãn phụ trong Name Manager, Transition/Animation và Presenter vẫn còn một phần hard-code tiếng Việt/Anh lẫn nhau; chức năng đã được test ở cả locale nhưng độ phủ i18n phụ chưa phải 100%. Đây là giới hạn có sẵn, không mở rộng refactor ngoài scope audit nút/dispatch.

IMPLEMENTATION SUMMARY: Sửa phạm vi Sort theo selection, chuẩn hóa lifecycle dialog Sheet, bổ sung live Playwright audit 24/24 cho hai locale. Không sửa LibreOffice Core, Writer, command bus hay shortcut manager.  
FILES CHANGED: `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-chart.js`, `tests/live/sheet-slides-ui-audit-round2.playwright.mjs`, tài liệu này.  
COMMANDS RUN: `python -m http.server 8765 --bind 127.0.0.1`; `node --check` các file sửa; `node tests/run-tests.js`; `node tests/live/sheet-slides-ui-audit-round2.playwright.mjs` với Edge/Playwright.  
BUILD RESULT: Không có build step; syntax check nằm trong suite và PASS.  
TEST RESULTS: PASS — master suite `411/411` trong khoảng 11,3 giây; live Playwright `24/24` (12 luồng × 2 locale) trong khoảng 22 giây.  
KNOWN FAILURES: Không có failure trong capability hiện hữu đã audit; xem danh sách capability không hiện hữu ở trên.  
RISKS: Live test cần Edge hệ thống và `playwright-core` cài tạm ngoài repo; không chạy tự động trong master runner. Test media xác minh file chooser/Data URL/model, không kiểm tra codec playback trong headless Edge.  
DEPENDENCIES/BLOCKERS: Không thêm dependency; không blocker.  
CORE PATCH ID (if any): Không áp dụng.  
NEXT ACTION: Claude review các commit trên branch; không tự merge vào `main`.
