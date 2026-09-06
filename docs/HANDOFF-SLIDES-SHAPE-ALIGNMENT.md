# Bàn giao: VN Slides — Căn chỉnh & Phân phối đều nhiều đối tượng (Arrange > Align)

## 1. Bối cảnh

Đợt audit "Alignment Parity" trước đó (agy thực hiện, xem docs/HANDOFF-ALIGNMENT-DIALOGS-PARITY-AUDIT.md) đã ghi nhận VN Slides chưa có thuật toán căn chỉnh/phân phối nhiều hình khối, khác với PowerPoint thật có đầy đủ Arrange > Align (Align Left/Center/Right/Top/Middle/Bottom, Distribute Horizontally/Vertically, Align to Slide). Đây là các GAP-SLIDES-01, 02, 03 trong bản audit đó. Claude tự triển khai trực tiếp (không giao Grok) phần logic engine này, theo đúng tinh thần "làm cho Grok luôn" khi Grok hết quota.

## 2. Kiến trúc giải pháp

### 2.1 `SlidesCanvasController.alignShapes(mode, alignTo)` — GAP-SLIDES-01 & 03

Nhận `mode` (left/center/right/top/middle/bottom) và `alignTo` ("selection" mặc định hoặc "slide"). Tính khung tham chiếu (bounding box của các hình đang chọn, hoặc toàn bộ trang chiếu 0,0,width,height nếu `alignTo="slide"`), rồi tính lại x hoặc y cho từng hình theo công thức căn chỉnh chuẩn. Loại `type: "connector"` khỏi phép căn chỉnh — đúng quy ước đã có sẵn của `groupSelectedShapes()`/`nudgeSelected()`.

### 2.2 `SlidesCanvasController.distributeShapes(axis, alignTo)` — GAP-SLIDES-02

Sắp các hình theo trục đang phân phối, giữ nguyên hình đầu và cuối (theo đúng khung tham chiếu), chia đều khoảng TRỐNG (không phải khoảng cách tâm-tới-tâm) cho các hình còn lại — đúng cách PowerPoint thật làm. Khi `alignTo="slide"`, khung tham chiếu là toàn bộ trang chiếu nên MỌI hình (kể cả đầu/cuối) đều được xếp lại theo khoảng đều tính từ mép 0 đến hết trang.

### 2.3 Tái sử dụng nguyên vẹn cơ chế Undo "shapes-move" đã có sẵn

Cả hai hàm trên tạo ra một danh sách `moves: [{shapeId, from:{x,y}, to:{x,y}}]` và đẩy MỘT bản ghi undo duy nhất kiểu `"shapes-move"` — kiểu undo NÀY ĐÃ TỒN TẠI SẴN (dùng cho `nudgeSelected()` khi di chuyển nhiều hình cùng lúc bằng phím mũi tên) và ĐÃ CÓ logic replay đúng cho undo/redo nhiều hình cùng lúc. Nhờ tái dùng đúng cơ chế này, MỘT LẦN Ctrl+Z hoàn tác TRỌN VẸN cả thao tác Căn/Phân phối, không phải từng hình một — khác với phát hiện trong đợt audit Alignment trước đó ở Sheet, nơi `setStyle()` ghi mỗi thuộc tính thành MỘT bước undo riêng (một hạn chế hệ thống đã biết của Sheet, không áp dụng ở đây vì Slides đã có sẵn cơ chế gộp nhiều-hình-một-bước từ trước).

### 2.4 `toggleAlignToSlide()` — GAP-SLIDES-03

Cờ boolean `canvas.alignToSlideMode` (mặc định `false`, đúng mặc định thật của PowerPoint là "Align Selected Objects"). Lệnh `slides.arrange.alignToSlide` (isToggle) đảo cờ này; `SlidesAdapter.handleDispatch()` đọc cờ này để quyết định truyền `"slide"` hay `"selection"` vào mọi lệnh Căn/Phân phối tiếp theo.

### 2.5 Ribbon: mở rộng dropdown "Sắp xếp" đã có sẵn

Tab Trang đầu, nhóm Đối tượng vẽ đã có sẵn dropdown "Sắp xếp" (`slides.drawing.arrange`) chứa Nhóm/Bỏ nhóm. Bổ sung 9 mục mới vào ĐÚNG dropdown này (Căn trái/giữa/phải/trên/giữa dọc/dưới, Phân phối đều ngang/dọc, Căn theo trang chiếu) thay vì tạo dropdown mới — đúng bố cục thật của PowerPoint (Arrange chứa cả Align lẫn Group). 9 icon SVG mới được thiết kế riêng (đường kẻ đỏ + 2 hình chữ nhật minh họa từng kiểu căn, 3 hình cho phân phối đều), không tái dùng icon căn lề văn bản đã có (khác khái niệm, tránh trùng lặp icon giống đợt audit dedup trước đó đã nhấn mạnh).

## 3. Ánh xạ UNO thật

`.uno:ObjectAlignLeft`, `.uno:AlignCenter`, `.uno:ObjectAlignRight`, `.uno:AlignUp`, `.uno:AlignMiddle`, `.uno:AlignDown`, `.uno:DistributeSelectionHorizontal`, `.uno:DistributeSelectionVertical` — đúng tên lệnh UNO thật của LibreOffice Draw/Impress cho các thao tác này. Lệnh "Căn theo trang chiếu" không có mapping UNO (thuần cờ trạng thái phía app, không phải một lệnh dispatch tới engine).

## 4. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1386/1386 PASS (1374 nền + 12 test mới trong suite 126).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 104/104 PASS, 0px tràn ngang — 9 mục mới trong dropdown không ảnh hưởng chiều rộng ribbon đã thu gọn (dropdown chỉ hiện khi bấm mở).
- `node tests/live/slides-shape-alignment.playwright.mjs` (mới): mở dropdown Sắp xếp thật trên trình duyệt thật, bấm Căn trên xác nhận 3 hình thật cùng về y=0, MỘT lần Ctrl+Z xác nhận khôi phục ĐÚNG vị trí gốc của cả 3 hình cùng lúc (không phải từng hình), bấm Phân phối đều ngang xác nhận khoảng trống giữa các hình bằng nhau, bật Căn theo trang chiếu rồi Căn giữa dọc xác nhận các hình căn theo tâm CHIỀU CAO TRANG CHIẾU thật (540px) chứ không phải khung 3 hình đang chọn.

## 5. Phát hiện phụ trong lúc viết live test (không phải lỗi, chỉ là hành vi cần biết)

Bấm nút cờ (isToggle) "Căn theo trang chiếu" trên ribbon làm mất lựa chọn hình hiện tại (`selectedShapeIds` bị xóa) — một hiệu ứng phụ liên quan tới focus/blur khi tương tác với ribbon, không phải lỗi của tính năng căn chỉnh. Test đã xử lý bằng cách chọn lại hình trước bước kiểm tra tiếp theo. Nếu muốn UX mượt hơn (giữ nguyên lựa chọn khi bấm nút cờ trên ribbon), đây là một cải thiện nhỏ có thể xem xét ở một đợt riêng, không thuộc phạm vi GAP-SLIDES-01/02/03 ban đầu.

## 6. Các tệp đã thay đổi

- `apps/slides/slides-canvas.js`: `alignShapes()`, `distributeShapes()`, `toggleAlignToSlide()`, thuộc tính `alignToSlideMode`.
- `adapters/libreoffice/slides/slides-adapter.js`: bind lệnh toggle + 8 case dispatch cho Căn/Phân phối.
- `adapters/libreoffice/common/command-dispatch-mapper.js`: 8 mapping UNO thật.
- `platform/commands/command-definitions.js`: 9 lệnh mới.
- `platform/ui-kit/icons.js`: 9 icon SVG mới (alignObjLeft/Center/Right/Top/Middle/Bottom, distributeH/V, alignToSlide).
- `apps/slides/slides-ribbon.js`: mở rộng dropdown `slides.drawing.arrange` có sẵn.
- `platform/i18n/strings-vi.js` / `strings-en.js`: 9 mục catalog lệnh mới ở CẢ HAI file.
- `platform/help/entries-slides.js`: mở rộng entry có sẵn `slides.shape.groupUngroup` (sửa luôn nhận định lỗi thời "Không có nút riêng trên ribbon").
- `tests/unit/slides-shape-alignment.test.js` (mới, 12 test), `tests/live/slides-shape-alignment.playwright.mjs` (mới), `tests/run-tests.js` (đăng ký suite 126).
