# Kế hoạch CODEX-PIVOTSLICER — Slicer PivotTable và Dòng thời gian

## Mục tiêu

Hoàn thiện giai đoạn 2 của bộ lọc trực quan trong VN Sheet: bộ lọc gắn với Bảng tổng hợp và Dòng thời gian cho trường ngày; thao tác lọc phải tính lại hàng/cột/tổng, hỗ trợ nhiều bộ lọc giao nhau, đa chọn, xóa lọc, hình học/tùy chọn hiển thị, undo/redo, bàn phím và trạng thái lỗi. Tệp `.xlsx` phải được đọc/ghi bảo toàn bằng OOXML native để ứng dụng bảng tính đối chiếu nhận đúng cache, hình và lựa chọn; tệp do ứng dụng đối chiếu tạo không được mất đối tượng khi mở rồi lưu lại.

## Năng lực hiện có và quyết định tái sử dụng

- `apps/sheet/pivot-table.js` đã sở hữu model/cơ chế tính lại Bảng tổng hợp, đổi nguồn, nhóm ngày/số và trường tính toán. Mở rộng model lọc tại đây, không tạo engine Pivot thứ hai.
- `apps/sheet/table-slicer.js` đã có panel nổi, hình học, số cột, đa chọn Ctrl/Shift, xóa lọc, trạng thái mục, kéo/đổi cỡ và undo/redo cho bộ lọc của Bảng. Tách/tái sử dụng primitive UI và chuẩn hóa model thay vì sao chép module.
- `apps/sheet/sheet-grid.js` đã có vòng đời theo sheet, history, render overlay và cơ chế tải lười Pivot/Slicer. Nối controller mới qua các hook này.
- Adapter Sheet đã serialize metadata VN qua FODS; bộ hậu xử lý OOXML đã đọc/ghi slicer Table. Mở rộng cùng đường adapter cho `pivotCacheDefinition`, `slicerCaches`, `xl/slicers`, timeline parts, relationships, content types và drawing anchors; không sửa LibreOffice Core.
- Ribbon/command/help/i18n hiện có nhóm Bảng tổng hợp và Thiết kế Bảng. Thêm lệnh vào ngữ cảnh Phân tích Bảng tổng hợp; Help dùng cơ chế Trợ giúp/F1 hiện hữu.

## Đo hành vi chuẩn trước triển khai

1. Viết oracle PowerShell riêng theo mẫu retry của `scripts/audit-0610/cf_excel_oracle.ps1`; mọi COM collection/object (`Range`, `PivotTables`, `SlicerCaches`, `Slicers`, `TimelineState`, `PivotFilters`) được lấy và dùng tại chỗ với retry, không truyền object COM qua giá trị trả về helper.
2. Đo `SlicerCaches.Add2(pivotTable, field)`, Caption/Left/Top/Width/Height, mục chọn, nhiều cache giao theo VÀ, Ctrl/Shift tương đương tập mục chọn, ClearManualFilter, Report Connections và Timeline theo Ngày/Tháng/Quý/Năm cùng khoảng chọn.
3. Lưu fixture native, giải nén và ghi lại sơ đồ part/relationship/namespace/selection thực tế để làm golden cấu trúc và ReadOnly oracle. Chỉ dừng PID ứng dụng đối chiếu do script tạo.

## Tệp/module dự kiến

- App Sheet: `apps/sheet/table-slicer.js`, `apps/sheet/pivot-table.js`, `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`.
- Adapter/OOXML: `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`.
- Command/Help/i18n: `platform/commands/command-definitions.js`, `platform/help/entries-sheet.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`.
- Kiểm thử: unit runner/coverage, unit Pivot Slicer/Timeline, pytest OOXML, desktop CDP, COM oracle/ReadOnly và fixture/golden cần thiết.
- Tài liệu: `docs/AUDIT-PIVOTSLICER-1610.md`, backlog/checklist liên quan và handoff chuẩn trong `09-templates/AGENT-HANDOFF.md`.

Danh sách sẽ được thu hẹp theo kết quả đo; không sửa vùng ngoài phạm vi nếu không có dependency/handoff rõ ràng.

## Phụ thuộc và ranh giới

- Không thêm dependency, không đổi framework/build, không gọi LibreOffice implementation từ UI, không sửa Core/upstream.
- App vẫn chạy offline; Node server chỉ được dùng bởi test Playwright/CDP theo hạ tầng hiện hữu.
- Dữ liệu tài liệu không rời máy. Test desktop chỉ điều khiển qua CDP, không dùng SendKeys.
- Report Connections tối thiểu phải có thông báo rõ nếu chưa thể nối nhiều Bảng tổng hợp; ưu tiên triển khai thật khi model/cache chung cho phép.

## Rủi ro và biện pháp

- LibreOffice có thể bỏ part mở rộng khi dirty-save: lưu carrier metadata trong FODS và tái dựng/ghép OOXML sau xuất; kiểm bằng batch LAN bắt buộc và tệp native mở-lưu lại.
- Slicer Pivot và Table dùng schema/cache khác nhau: model phải có `sourceType`; writer không được biến cache Pivot thành table slicer.
- Timeline có namespace/version extension nhạy thứ tự: dựa trên fixture đo thật, kiểm content types, relationships và XML schema/order bằng pytest/ReadOnly.
- Lọc có thể làm sai tổng/nhóm/calculated fields: filter được áp trước aggregate trong engine hiện hữu; unit phủ hàng/cột, tổng, grouping và nhiều filter giao nhau.
- Hồi quy hiệu năng/render: chỉ tính lại Pivot liên kết khi lựa chọn đổi, giữ overlay theo sheet và không nhân bản listener.
- Help/i18n có cổng cấm tên thương mại: chỉ dùng tên VN Sheet/Bảng tổng hợp/Dòng thời gian trong nội dung người dùng.

## Kế hoạch kiểm thử và tiêu chí nghiệm thu

1. Focused unit cho model, phép giao lọc, Ctrl/Shift, clear, timeline granularity/range, layout/options, undo/redo và thông báo Report Connections.
2. Pytest round-trip cho native parts/relationships/cache selection và bảo toàn tệp do ứng dụng đối chiếu tạo.
3. Desktop CDP kiểm ribbon Phân tích, dialog, keyboard, states/error, lọc thật, lưu/mở lại; COM ReadOnly kiểm cache/object/lựa chọn/timeline.
4. `npm test` 100%; cập nhật đúng số lệnh Sheet trong `tests/unit/help-coverage.test.js` theo kết quả thực.
5. `structural-cases-1..15` 100%; công thức `lan28 >= 98,18%`, `lan04 = lan01 = 100%`.
6. Batch dirty-save bắt buộc trên 10 tệp: `VNO_AUDIT_MARK_DIRTY=1 python scripts/layout-audit/batch_document_audit.py xlsx E:\VNOffice-codex-pivotslicer lan01 lan02 lan04 lan06 lan09 lan11 lan22 lan26 lan13 lan19 .xlsx`; yêu cầu `diffs=0` và ReadOnly đúng.
7. `git diff --check`, syntax, i18n parity và quét UTF-8 không BOM cho tệp thay đổi.

Mọi kết quả ghi PASS/FAIL/NOT RUN/BLOCKED đúng theo lệnh đã chạy; không sửa expected/golden chỉ để làm xanh.

## Rollback

- Các thay đổi được chia theo commit đo/oracle, model+UI, OOXML, Help/tests/docs để có thể revert độc lập.
- Nếu native timeline không thể bảo toàn an toàn, giữ phần Pivot Slicer đã xanh trong commit riêng, báo BLOCKED cho Timeline và không phát hành writer tạo part dở dang.
- Không dùng reset/checkout phá hủy; rollback bằng revert commit được duyệt hoặc bỏ các hunk chưa commit trong đúng tệp do task tạo.
