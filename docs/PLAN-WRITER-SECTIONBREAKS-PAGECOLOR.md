# Plan: Writer Section Breaks và Page Color

## Objective

Thêm Page Color dạng màu đặc và Section Breaks vào VN Writer, trong đó mỗi section thực sự giữ Page Setup riêng (khổ giấy, hướng giấy, lề), có Undo/Redo, UI song ngữ, Help tiếng Việt và kiểm thử browser/LibreOffice đo được.

## Current capability

- Writer hiện chỉ có `pageSetup` duy nhất trên `WriterAdapter`; `_applyPageSetup()` áp kích thước/lề lên một canvas và `_getPageSetupCss()` tạo một `@page` duy nhất.
- Page Break hiện chỉ là một `div` có `page-break-before:always`; không có section model hoặc section-specific Page Setup.
- Columns là định dạng nhiều cột cho toàn `bodyDom`, không có Column Break riêng để tái sử dụng.
- Watermark/Page Border đã có model, snapshot và UI; chưa có Page Color.

## Files/modules

- `apps/writer/**`: ribbon, CSS và picker Page Color/Section Break UI nếu cần.
- `adapters/libreoffice/writer/writer-adapter.js`: model section/page color, áp dụng canvas, export, Undo/Redo.
- `platform/commands/command-definitions.js`: chỉ thêm command `writer.*` mới.
- `platform/i18n/*`, `platform/ui-kit/icons.js`, `platform/help/entries-writer.js`: chuỗi, icon, Help entry mới.
- `tests/unit/**`, `tests/live/**`, `tests/run-tests.js`: unit, live Playwright và probe LibreOffice.
- `docs/HANDOFF-WRITER-SECTIONBREAKS-PAGECOLOR.md`: handoff cuối.

## Design/dependency

- Marker section nằm trong nội dung và mang ID/loại; `sectionPageSetups` ánh xạ ID sang Page Setup. Section đầu dùng ID ổn định và setup mặc định.
- `setPageSetup()` cập nhật section tại caret; khi không xác định được caret thì dùng active section/section đầu, giữ tương thích API hiện có.
- Export chia nội dung theo marker, tạo named `@page` CSS và wrapper tương ứng. Next/Even/Odd ép sang trang mới; Continuous giữ marker/model và đổi page style từ trang kế tiếp theo giới hạn của paged-media/LibreOffice.
- Page Color dùng palette nội bộ Writer, không import Sheet. Màu được lưu model/snapshot, áp nền canvas/preview và đưa vào `@page` CSS. Không thêm dependency hoặc sửa LibreOffice Core.

## Risks

- LibreOffice HTML importer có thể không giữ named `@page` hoặc background; sẽ chạy probe soffice thật và ghi đúng mức hỗ trợ, không claim nếu importer làm mất thuộc tính.
- Một canvas contenteditable không thể đồng thời hiển thị nhiều khổ giấy như layout engine; canvas phản ánh Page Setup của section đang hoạt động, còn model/export giữ cấu hình mọi section.
- Continuous section không thể đổi kích thước giữa một trang vật lý; khi export, page style mới có hiệu lực ở lần phân trang phù hợp tiếp theo.

## Test plan

- Unit: command/ribbon/i18n/icon/help; Page Color đổi model/CSS/export và Undo/Redo; chèn Next Page, đổi section sau sang landscape, xác nhận section trước vẫn portrait và snapshot phục hồi.
- LibreOffice: tạo tài liệu qua export path, convert bằng soffice thật nếu binary khả dụng, giải nén/đọc XML hoặc PDF để đo background/page orientation thực tế.
- Live Playwright: click ribbon thật, chọn màu và Section Break, đổi Page Setup qua UI, kiểm tra DOM/model/computed CSS; không SendKeys.
- Chạy `node tests/run-tests.js`, yêu cầu 100% PASS dưới 90 giây; `node --check`/`git diff --check`.

## Rollback

Mỗi tính năng là một commit riêng để có thể revert độc lập; không merge vào `main`, không destructive Git.
