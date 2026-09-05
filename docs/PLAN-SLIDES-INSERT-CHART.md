# Plan: Slides Insert Chart

## Objective

Thêm lệnh `slides.insert.chart` trên tab Chèn để tạo shape `type: "chart"` từ tiêu đề, nhãn và giá trị; render bốn loại cột/đường/tròn/miền trên canvas, F5 và Slide Sorter; dùng lại lịch sử shape hiện có; lưu/đọc FODP có căn cứ đo LibreOffice thật.

## Current capability

- `SheetChartBuilder.generateSvg()` đã có renderer SVG không phụ thuộc DOM cho bốn loại chart, nhưng module tổng thể phụ thuộc i18n và UX/model Sheet. Slides sẽ không import source Sheet; sẽ dùng renderer Slides riêng theo cùng thuật toán để giữ boundary app.
- Slides lưu đối tượng trong `slide.shapes[]`; `shape-add`/`shape-delete`, selection, drag, undo/redo và ba đường render đều đã tồn tại.
- `slides.diagram.insert` cho pattern dialog accessible và dispatch qua `SlidesAdapter`.
- `SlidesAdapter` serialize các shape vào FODP và parse frame trở lại, nhưng chưa có chart.

## Files/modules

- `apps/slides/slides-chart.js`: chuẩn hóa dữ liệu, sinh SVG, dialog nhập dữ liệu.
- `apps/slides/slides-canvas.js`: insert/update chart và tích hợp renderer shape vào canvas/F5/thumbnail.
- `apps/slides/slides-ribbon.js`: nút `slides.insert.chart` với metadata cục bộ (không sửa Platform ngoài scope).
- `apps/slides/slides.css`: states/dialog/layout chart.
- `adapters/libreoffice/slides/slides-adapter.js`: dispatch và FODP round-trip.
- `tests/unit/slides-charts.test.js`, `tests/live/slides-charts.playwright.mjs`, probe/fixture liên quan nếu cần.
- `docs/HANDOFF-SLIDES-INSERT-CHART.md`: handoff và số đo FODP/PPTX thật.

## Dependencies

Không thêm dependency và không sửa LibreOffice Core. Chỉ đọc `apps/sheet/sheet-chart.js`; renderer Slides là app-specific. Command dùng Command Bus hiện hữu và adapter làm boundary.

## Risks

- ODF chart chuẩn cần data table/range và packaging khác nhau giữa flat ODF và PPTX; phải probe bằng soffice trước khi chốt serialization.
- SVG nhúng có thể bị LibreOffice/PPTX flatten hoặc mất metadata; parser cần fallback có kiểm soát.
- Regex parser frame hiện hữu có thể không đọc nested `chart:chart` an toàn nếu cấu trúc sai.
- Metadata command Platform nằm ngoài scope; ribbon phải cung cấp label/icon cục bộ mà không sửa registry chung.

## Test plan

- Unit: SVG của đủ bốn loại; insert cột dữ liệu mẫu; update dữ liệu; delete; Undo/Redo; FODP serialize/parse.
- Real-office probe: FODP → PPTX → FODP bằng LibreOffice, kiểm tra chart/content/giới hạn thực tế.
- Live Playwright (không SendKeys): thao tác dialog, xác nhận SVG trên canvas, F5 và Slide Sorter.
- Full suite: `node tests/run-tests.js`, bắt buộc hoàn tất dưới 60 giây và 100% PASS.

## Rollback

Revert các commit riêng của feature trên branch `feature/slides-insert-chart`; không có migration, dependency hay Core patch. Không merge vào `main`.
