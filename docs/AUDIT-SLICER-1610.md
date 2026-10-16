# Audit Slicer cho Bảng — 16/10/2026

## 1. Mục tiêu và kế hoạch

- Mục tiêu: thêm Slicer giai đoạn 1 cho Bảng trong VN Sheet, có thao tác lọc thật, hoàn tác/làm lại và lưu/mở XLSX chuẩn để Excel 2016 nhận diện.
- Năng lực có sẵn được tái sử dụng: mô hình Table, `activeFilters`/`hiddenRows`, `rowVisibilityResolver`, `SUBTOTAL`, lịch sử Sheet, FODS bridge và hậu xử lý OOXML.
- Lớp triển khai: UI gọi `TableSlicerController`; controller dùng API Sheet; adapter ánh xạ FODS; hậu xử lý OOXML tạo/đọc các part chuẩn. UI không gọi LibreOffice implementation trực tiếp và không sửa Core.
- Phụ thuộc: chỉ API nội bộ hiện có và thư viện chuẩn Python; không thêm package, không đổi build system, không đổi security boundary.
- Rủi ro chính: mất part Slicer khi LibreOffice chuyển đổi, trùng relationship/cache name, xóa nhầm drawing khác, lựa chọn hiện trên panel nhưng không lọc lại sau mở tệp.
- Kiểm thử: unit hành vi; pytest ZIP/OOXML; desktop CDP bằng chuột/phím; Excel COM Visible + ReadOnly; structural 1–12; công thức LAN; dirty-save batch 10 tệp; `npm test` đầy đủ.
- Rollback: hoàn nguyên commit tính năng `345ed62e`; không có migration dữ liệu, dependency hay Core patch cần gỡ.

## 2. Đo Excel 2016 trước khi triển khai

Oracle `tests/live/sheet-slicer-excel2016-oracle.ps1` tạo một `ListObject`, hai `SlicerCache` bằng `Add2`, hai Slicer và đo trực tiếp Excel 16.0:

| Phép đo | Kết quả |
|---|---|
| Thuộc tính Slicer | Name/Caption; Left=260, Top=20, Width=180, Height=160; NumberOfColumns=2 |
| Chọn `North` | Chỉ còn hai hàng North |
| Chọn nhiều `North` + `East` | Còn ba hàng tương ứng |
| Xóa bộ lọc | Khôi phục đủ năm hàng |
| Hai Slicer `South` + `Paper` | Giao theo VÀ, còn đúng một hàng |
| AutoFilter `Amount=40` + Slicer `South` | Giao theo VÀ, còn đúng một hàng |
| Trạng thái không có dữ liệu | East/North có `HasData=false` dưới giao bộ lọc |

Định dạng gói đo được: một `xl/slicers/slicerN.xml` cho danh sách Slicer trên sheet; một `xl/slicerCaches/slicerCacheN.xml` cho mỗi cache; workbook ext `{46BE...}` và relationship `slicerCache`; worksheet ext `{3A4C...}` và relationship `slicer`; drawing `AlternateContent` dùng URI `drawing/2010/slicer`; lựa chọn nằm trong `table/autoFilter`.

## 3. Triển khai

- `apps/sheet/table-slicer.js`: model/controller theo sheet; tạo/xóa/xóa lọc; chọn đơn, Ctrl, Shift và chế độ chọn nhiều; trạng thái selected/unselected/no-data; kéo, đổi cỡ và panel có keyboard focus.
- `apps/sheet/sheet-grid.js`: kết hợp Slicer với AutoFilter theo VÀ, cập nhật `hiddenRows`, dùng chung visibility cho `SUBTOTAL`, snapshot và undo/redo; đồng bộ khi đổi tên/xóa Table hoặc cột.
- `apps/sheet/sheet-ribbon.js`: lệnh **Thiết kế Bảng > Bộ lọc > Chèn Slicer** và hộp chọn một hay nhiều cột.
- `sheet-adapter.js`: lưu model portable vào FODS và khôi phục sau mở; áp lại lựa chọn sau khi sheet/table đã được cài đặt.
- `ooxml_zip_patch.py`: đọc và tạo slicer/cache/relationship/ext/content-type/drawing/table filter chuẩn; xóa đúng anchor Slicer nhưng giữ drawing khác; tên cache duy nhất toàn workbook.
- Help tiếng Việt mô tả vị trí, thao tác cơ bản, Ctrl/Shift, nút chọn nhiều, xóa lọc, kéo/đổi cỡ và xóa Slicer. Chuỗi VI/EN và command coverage được cập nhật đồng bộ.

## 4. Nghiệm thu đã chạy

| Cổng | Kết quả |
|---|---|
| `npm test` | PASS 3526/3526 |
| Unit Slicer | PASS 6/6 |
| Pytest OOXML Slicer | PASS 3/3 |
| Desktop CDP tạo/lọc/đa chọn/kéo/resize/xóa/undo/lưu/mở | PASS |
| Excel 2016 COM ReadOnly trên XLSX do app lưu | PASS; ReadOnly=true, 1 cache, 1 Slicer, mục 3/4/5 selected |
| Structural cases 1–12 | PASS 156/156 kịch bản, 1567/1567 ô |
| `lan28` formula cache | PASS 271/275 = 98,55% |
| `lan04` formula cache | PASS 49/49 = 100% |
| Dirty-save LAN 10 tệp | PASS 10/10; saved=yes, diffs=0, lint=clean, Excel=PASS |
| `git diff --check` và syntax | PASS |

Báo cáo batch: `E:\VNOffice-profiles\codex-slicer-batch\output\batch_document_audit_report.md`. Tệp desktop cuối: `E:\VNOffice-profiles\codex-slicer-cdp-final\sheet-slicer-roundtrip.xlsx`.

## 5. Giới hạn giai đoạn 1

- Phạm vi chỉ là Slicer của Table. Slicer cho PivotTable và Timeline chưa nằm trong phiếu này.
- `multiSelect` là trạng thái tương tác của panel; lựa chọn thực tế được lưu chuẩn qua `autoFilter`. Excel 2016 và VN Sheet đều khôi phục đúng tập giá trị đã chọn.
- Hình học trong app dùng CSS pixel; Excel COM báo point nên số đo đọc lại bằng 0,75 lần, nhưng vị trí/kích thước tương ứng được giữ trong drawing anchor.
- Không có Core patch (`VN-CORE-PATCH`: không áp dụng).
