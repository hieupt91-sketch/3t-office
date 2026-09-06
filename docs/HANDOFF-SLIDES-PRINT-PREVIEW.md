# Bàn giao: VN Slides — Xem trước khi in (Ctrl+F2) và in thật (Ctrl+P)

## 1. Bối cảnh

Sau khi khắc phục Sheet (xem docs/HANDOFF-SHEET-PRINT-PREVIEW.md), Slides được xác nhận có đúng lớp lỗi tương tự khi đọc code:

1. Không có tính năng Xem trước khi in nào cả.
2. `common.file.print` (Ctrl+P) chỉ gọi `window.print()` trần. Canvas sống của Slides tại một thời điểm chỉ có ĐÚNG MỘT trang chiếu đang active tồn tại thật trong DOM (`.vno-slide-canvas` render slide hiện tại; các trang khác chỉ có mặt dưới dạng dữ liệu trong `this.slides[]` và thumbnail thu nhỏ ở dải điều hướng). In trực tiếp DOM sống chỉ in được ĐÚNG MỘT trang chiếu đang xem — không phải toàn bộ bản trình chiếu — dù tài liệu có bao nhiêu trang.

Việc này Claude tự làm trực tiếp (không giao Grok) theo chỉ đạo "làm cho Grok luôn" trong lúc Grok hết quota, ngay sau khi hoàn thành phần tương ứng cho Sheet, dùng đúng kiến trúc và quy trình kiểm chứng.

## 2. Kiến trúc giải pháp

### 2.1 `SlidesCanvasController.computePrintPages()`

Đơn giản hơn Sheet nhiều vì PowerPoint thật in theo kiểu mặc định "Full Page Slides": MỖI trang chiếu là MỘT trang in. Hàm trả về danh sách các trang chiếu KHÔNG bị ẩn (`slide.hidden !== true`), giữ nguyên `index` gốc của từng slide (không phải index liên tục sau khi lọc) để `_computeSlideFooterTexts()` vẫn tính đúng "Trang X / N" theo vị trí thật trong toàn bộ deck. Trang chiếu đang Ẩn (Hide Slide, tính năng đã có sẵn) không được in mặc định — đúng hành vi PowerPoint thật (tùy chọn "Print Hidden Slides" bật riêng chưa được triển khai, xem GAP).

### 2.2 Tái sử dụng hạ tầng Slide Sorter thay vì vẽ lại từ đầu

`_renderSlidePrintPage(slide, index)` dựng từng trang in bằng cách gọi lại **đúng những hàm mà Slide Sorter (Bộ sắp xếp trang) đã dùng để vẽ thumbnail của các trang KHÔNG active**: `_slideSurfaceInlineStyle(slide)` (nền/màu theo theme) và `_shapeSorterHtml(shape)` (vẽ từng hình khối: rect/ellipse/connector/wordart/chart). Đây là lựa chọn có chủ đích: Slide Sorter đã là nơi DUY NHẤT trong app từng phải giải quyết chính xác bài toán "vẽ một trang chiếu KHÔNG phải trang đang active" — tái dùng nó đảm bảo Print Preview nhất quán với những gì Slide Sorter đã hiển thị, thay vì viết một bộ vẽ lại thứ hai có nguy cơ lệch nhau.

Giới hạn kế thừa trực tiếp từ Slide Sorter (không phải lỗi mới do Print Preview gây ra): `_shapeSorterHtml()` chỉ vẽ rect/ellipse/connector/wordart/chart — KHÔNG vẽ shape kiểu "image" hay "table". Ảnh và bảng trong slide sẽ không xuất hiện trong Print Preview/bản in, giống hệt việc chúng cũng không xuất hiện trong Slide Sorter hiện tại. Ghi nhận là GAP thật, không che giấu.

Chân trang mỗi trang in dùng lại chính xác công thức &P/&N/ngày của `_renderHeaderFooter()` (hàm gốc chỉ render cho slide đang active), tách thành `_computeSlideFooterTexts(slide, index)` để áp dụng cho MỘT slide bất kỳ theo index thật của nó — không phải một bản sao logic khác có thể lệch kết quả.

### 2.3 `_syncSlidesPrintOnlyDom()` + `print()`

Giống Sheet: dựng container ẩn `#vno-slides-print-only`, chứa MỌI trang chiếu không ẩn (không chỉ trang đang active), trước khi gọi `window.print()`. `SlidesAdapter.print()` ủy quyền cho `canvas.print()` thật thay vì gọi `window.print()` trần như trước — đây là điểm sửa lỗi cốt lõi. CSS `@media print` ẩn `.vno-slide-canvas` (canvas sống chỉ có 1 slide) và overlay Preview, chỉ hiện `#vno-slides-print-only`.

Một rủi ro thật đã phát hiện và tự sửa trước khi viết test: CSS mới định nghĩa `.vno-sorter-shape-node` (dùng lại tên class của Slide Sorter để tái dùng logic vẽ shape) SUÝT ghi đè `font-size: 6px` → `10px` của chính Slide Sorter đang hiển thị (do cùng tên class, thứ tự CSS sau đè trước). Đã sửa bằng cách thu hẹp selector thành `.vno-slides-print-shapes .vno-sorter-shape-node` để chỉ áp dụng trong ngữ cảnh in, không rò rỉ sang giao diện Slide Sorter sống.

### 2.4 `openPrintPreview()` / `closePrintPreview()` — overlay Ctrl+F2

Kiến trúc giống hệt Sheet: overlay toàn màn hình, điều hướng Trang trước/sau, nút In gọi `print()` thật, dùng chung `_renderSlidePrintPage()` với bản in thật nên Preview và in luôn khớp nhau. Lệnh mới `slides.file.printPreview` (Ctrl+F2, cùng phím tắt Word/Excel/PowerPoint thật), ánh xạ `.uno:PrintPreview`, đặt làm nút nhỏ (không phải nút lớn) trong nhóm "Dạng xem bản trình chiếu" (View tab) để không đẩy tab vượt 1280px — nhóm này đã có 4 nút lớn (Bình thường/Bộ sắp xếp/Ghi chú/Đọc).

## 3. Các tệp đã thay đổi

- `apps/slides/slides-canvas.js`: `computePrintPages`, `_computeSlideFooterTexts`, `_renderSlidePrintPage`, `_syncSlidesPrintOnlyDom`, `print`, `openPrintPreview`, `closePrintPreview`.
- `apps/slides/slides.css`: CSS overlay Preview, `#vno-slides-print-only`, cập nhật `@media print`, và selector thu hẹp `.vno-slides-print-shapes .vno-sorter-shape-node` (tránh rò rỉ sang Slide Sorter sống).
- `adapters/libreoffice/slides/slides-adapter.js`: `print()` ủy quyền `canvas.print()`; bind + case dispatch cho `slides.file.printPreview`/`.uno:PrintPreview`.
- `platform/commands/command-definitions.js`: lệnh `slides.file.printPreview`.
- `adapters/libreoffice/common/command-dispatch-mapper.js`: mapping `.uno:PrintPreview`.
- `apps/slides/slides-ribbon.js`: nút mới (nhỏ) trong nhóm presentationViews (View tab).
- `platform/i18n/strings-vi.js` / `strings-en.js`: khối `slidesDialogs.printPreview` VÀ mục catalog lệnh `"slides.file.printPreview"` ở CẢ HAI nơi (thêm ngay từ đầu, tránh lặp lại lỗi thiếu i18n catalog đã gặp ở tính năng Custom Sort của Sheet trước đó).
- `platform/help/entries-slides.js`: entry mới `slides.file.printPreview`.
- `tests/unit/slides-print-preview.test.js` (mới): 11 test — 5 test thuần (`computePrintPages`/`_computeSlideFooterTexts`, không cần `document`) + 6 test DOM thật dùng `FakeElement`/`FakeDocument` theo đúng khuôn mẫu đã dùng cho Sheet.
- `tests/live/slides-print-preview.playwright.mjs` (mới): test trình duyệt thật, cổng 8934.
- `tests/run-tests.js`: đăng ký suite 122.

## 4. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1349/1349 PASS (1338 nền + 11 test mới trong suite 122).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 104/104 PASS, 0px tràn ngang.
- `node tests/live/slides-print-preview.playwright.mjs` (mới): PASS — dựng deck thật 3 trang (1 trang Ẩn), Ctrl+F2 mở overlay thật xác nhận ĐÚNG 2 trang (loại trang Ẩn), điều hướng Trang sau hiển thị đúng nội dung trang kế (không phải trang Ẩn), nút In gọi `window.print()` đúng 1 lần, và Ctrl+P (toolbar) dựng `#vno-slides-print-only` với đúng 2 trang từ TOÀN BỘ deck thật — xác nhận trực tiếp lỗi "chỉ in 1 trang đang active" đã được khắc phục.

## 5. Giới hạn đã biết (GAP), không che giấu

- Kế thừa từ Slide Sorter: ảnh (`image`) và bảng (`table`) trong slide KHÔNG xuất hiện trong Print Preview/bản in, vì `_shapeSorterHtml()` (hàm được tái sử dụng) chưa vẽ hai loại shape này ở bất cứ đâu trong app, kể cả Slide Sorter hiện tại.
- Chưa có tùy chọn "In trang chiếu Ẩn" (Print Hidden Slides) như PowerPoint thật — hiện luôn loại bỏ, không có cách bật lại qua UI.
- Chưa hỗ trợ layout "Notes Pages" hay "Handouts" (nhiều trang chiếu/trang giấy) — chỉ có "Full Page Slides" (1 trang chiếu/trang giấy), đây là layout mặc định và phổ biến nhất của PowerPoint thật nên được ưu tiên làm trước.
- Trang in cố định khổ giấy xấp xỉ A4 dọc (190mm), không đọc Page Setup riêng của Slides (Slides vốn không có khái niệm Page Setup như Writer/Sheet, chỉ có Kích thước trang chiếu 16:9/4:3).
