# PLAN — FIX-SHEET-S18

## Objective

Hoàn tất hai mục của `docs/tickets-0710/FIX-S18.md`:
1. Khi lưu PivotChart của Sheet sang XLSX, tạo liên kết OOXML tới PivotTable/PivotCache hiện hữu để Excel đọc được `Chart.PivotLayout.PivotTable` và biểu đồ theo dữ liệu Pivot; giữ nguyên kết quả lưu đối với workbook không có PivotChart.
2. Đối chiếu `sheet.formula.createFromSelection` với Excel dựa trên bằng chứng Names.Count=3 và RefersTo; chuyển ma trận sang KHỚP chỉ khi tất cả tên/phạm vi tương ứng chính xác.

## Current capability and reuse

- Sheet đã giữ chart với `kind: "pivot"`, `pivotId` và `pivotSheet`; biểu đồ hiển thị dữ liệu Pivot đã tổng hợp.
- Đường lưu XLSX của Sheet đã gọi postprocess Python tại `adapters/libreoffice/common/ooxml_zip_patch.py`. LibreOffice có thể xuất PivotTable và PivotCache trong cùng XLSX, nhưng chart đang được lưu như chart thường và thiếu `c:pivotSource`/`c:pivotFmts`.
- Tái sử dụng PivotTable/PivotCache và chart XLSX do LibreOffice xuất; mở rộng postprocess hiện hữu để ghép chart với đúng PivotTable/Cache. `c:pivotSource/c:name` phải theo dạng `[tên-tệp.xlsx]TênSheet!TênPivotTable`; Excel bỏ liên kết nếu thiếu tên workbook/sheet. Không thêm dependency và không sửa LibreOffice Core.
- `gen_sheet_button_matrix.py` hiện đánh dấu `createFromSelection` là CHƯA ĐỐI CHIẾU dù đã có bằng chứng Excel COM về ba Names; cần đọc đúng `RefersTo` cho cả ba tên trước khi chuyển status.
- PivotChart đã có Help tiếng Việt trong `platform/help/entries-sheet.js`; sẽ cập nhật chỉ dẫn cụ thể cho liên kết và làm mới sau khi xác minh đúng khả năng UI/lưu trữ.

## Files/modules dự kiến

- `adapters/libreoffice/common/ooxml_zip_patch.py`: nhận diện chart Pivot từ FODS và ánh xạ nó tới PivotTable/PivotCache trong XLSX; chỉ chỉnh gói khi có PivotChart hợp lệ.
- `main.py`: truyền tên file XLSX đích hiện có vào postprocess để tạo `c:pivotSource/c:name` chính xác; không đổi cơ chế lưu tệp.
- `adapters/libreoffice/sheet/sheet-adapter.js` và/hoặc `apps/sheet/sheet-grid.js`: chỉ nếu payload FODS hiện tại không đủ để ánh xạ chart, truyền metadata cần thiết qua đường lưu hiện có.
- `tests/test_sheet_pivot_chart_xlsx.py` và/hoặc `tests/unit/sheet-pivot-chart.test.js`: package tests cho liên kết chart/cache, nhiều PivotTable, và workbook không có PivotChart; không sửa fixture/expected để né lỗi.
- `platform/help/entries-sheet.js`: hướng dẫn tiếng Việt về vị trí Chèn > Biểu đồ Pivot và làm mới Pivot.
- `scripts/audit-0610/gen_sheet_button_matrix.py`, `docs/SHEET-BUTTON-MATRIX-1011.md`: cập nhật bằng generator; chỉ đổi createFromSelection sau khi bằng chứng Excel xác nhận đúng RefersTo của ba tên.
- `docs/AGENT-HANDOFF-FIX-S18.md`: handoff theo quy ước docs hiện có (template nêu trong yêu cầu không có ở root; template repo nằm trong thư mục bộ tiêu chuẩn nếu tồn tại).

## Dependencies and risks

- Không thêm dependency. Mọi xử lý XLSX đặt trong adapter postprocess hiện hữu.
- OOXML PivotChart cần cấu trúc và relationship hợp lệ giữa chart, pivotSource, pivotFormats, PivotTable và cache. Nếu package LibreOffice không cung cấp enough IDs/parts để liên kết an toàn, dừng mở rộng trong phạm vi này và ghi rõ chặn/khoảng trống; không phát sinh cấu trúc suy đoán làm Excel repair file.
- Ghép sai PivotTable khi có nhiều PivotTable có thể tạo chart nhìn đúng trong app nhưng Excel COM không nhận diện hoặc refresh sai. Cần kiểm tra theo pivotId/sheet/range và test nhiều pivot nếu đường xuất hỗ trợ.
- Workbook không có PivotChart phải giữ bytes/entries có nghĩa như cũ; test so sánh kết quả package.
- Tên định nghĩa tạo từ nhãn tiếng Việt có thể được chuẩn hóa; KHỚP chỉ khi cả ba `RefersTo` đúng theo Excel và ứng dụng hiện tại.

## Test and verification plan

- Unit/package: PivotChart được lưu có `c:pivotSource`, `c:pivotFmts` và relationship/cache hợp lệ; workbook chỉ có chart thường không bị đổi; workbook nhiều PivotTable liên kết đúng bảng; mở lại không rơi chart.
- UI: dùng app desktop qua CDP thật (chuột/phím), `VNO_APP_ROOT=E:\VNOffice-codex-fs18`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs18`; lưu/reopen PivotChart. Không dùng Playwright/web làm bằng chứng UI, SendKeys hay OS input.
- Excel: COM ReadOnly xác nhận `Chart.PivotLayout.PivotTable.Name`, PivotFields, số PivotTable/chart; thử refresh từ thay đổi Pivot qua UI nếu có thể.
- createFromSelection: app desktop CDP chọn vùng tiêu đề, tạo names; Excel COM ReadOnly kiểm tra Names.Count và ba RefersTo; chỉ sau đó chạy generator cập nhật ma trận.
- Theo ticket: chạy `npm test`, `python -m unittest discover -s tests` (nếu lỗi Writer/helper chập chờn, chạy lại riêng để xác nhận), UTF-8/BOM scan, và batch XLSX lan01,02,04,06,09,11,22,26 với `VNO_AUDIT_MARK_DIRTY=1`. Ghi kết quả đúng PASS/FAIL/NOT RUN/BLOCKED; không sửa tests/fixtures/expected để xanh.

## Rollback

Commit PLAN trước code. Commit ngay sau mỗi milestone độc lập. Nếu Excel repair workbook hoặc workbook thường bị thay đổi, revert riêng commit triển khai tương ứng; không dùng lệnh Git phá hủy thay đổi ngoài task.

## Milestones

1. Commit kế hoạch này trước mọi thay đổi lưu XLSX.
2. Tìm payload/package và triển khai liên kết PivotChart trong adapter, cùng package tests; commit ngay khi phần triển khai hoàn chỉnh.
3. CDP + Excel COM xác minh; Excel COM phải đọc được `Chart.PivotLayout.PivotTable.Name`; sửa tiếp theo bằng commit nhỏ, chạy lại bước liên quan.
4. Cập nhật hướng dẫn và ma trận sau bằng chứng; commit mỗi phần.
5. Chạy bộ xác minh theo ticket, ghi rõ mọi lỗi có sẵn và hoàn tất handoff S18.
