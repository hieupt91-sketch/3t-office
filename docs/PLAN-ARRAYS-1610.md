# Kế hoạch CODEX-ARRAYS — công thức mảng nhiều ô và hàm mảng

## Mục tiêu

- Hoàn thiện công thức mảng kiểu CSE của VN Sheet: chọn vùng, nhập bằng Ctrl+Shift+Enter, tính mảng một ô/nhiều ô, hiển thị `{=…}`, khóa sửa riêng một phần mảng, xóa cả khối và hoàn tác một bước.
- Bổ sung các hàm mảng tương thích bộ hành vi mục tiêu: `MMULT`, `MINVERSE`, `MUNIT`, `TRANSPOSE`, `FREQUENCY`, `LINEST` (gồm `stats=TRUE`), `TREND`, `GROWTH`, `LOGEST`; hỗ trợ kết quả nhiều ô và kết quả được bọc trong `INDEX`, `SUM`, `SUMPRODUCT`.
- Giữ đúng công thức mảng khi lưu/mở XLSX qua biểu diễn OOXML chuẩn `<f t="array" ref="…">`; không đổi ngữ nghĩa định dạng tệp ngoài chuẩn này.
- Thêm hướng dẫn sử dụng tiếng Việt, i18n VI/EN, kiểm thử đơn vị/live/CDP và hồ sơ kiểm toán.

## Năng lực hiện có và quyết định tái sử dụng

- `FormulaEngine` đã có `MatrixValue`, `evaluateArrayExpression`, hằng mảng qua vùng ảo và `evaluateArray`; `SUMPRODUCT` đã dùng ngữ cảnh mảng. Sẽ mở rộng các đường này, không tạo engine thứ hai.
- `SheetGridController` đã có lệnh `sheet.formula.arrayEnter`, metadata `isArrayFormula`/`arrayRange`, điền vùng, tính lại, xóa cả vùng và lịch sử một bước. Sẽ siết kiểm tra kích thước, quyền sửa và biểu diễn thanh công thức trên cùng model.
- `SheetAdapter` đã tuần tự hóa công thức ma trận sang FODS bằng `table:number-matrix-*-spanned` và khôi phục metadata khi đọc FODS. Pipeline XLSX hiện đi qua LibreOffice và `ooxml_zip_patch.py`; sẽ kiểm tra/tăng cường đúng điểm hậu xử lý OOXML thay vì cho UI gọi implementation LibreOffice.
- `scripts/audit-0610/function_oracle.mjs/.ps1` đã dùng `Application.Evaluate`, retry COM và nhận `System.Array`; sẽ bổ sung bộ ca batch 16 và chỉ chỉnh oracle nếu hình dạng/kiểu mảng chưa được bảo toàn đủ cho đối chiếu.
- Help Sheet đã có tab Trợ giúp/F1 và bài tính toán chứa CSE; sẽ mở rộng bài hiện hữu hoặc thêm bài chuyên biệt, dùng command ID thật `sheet.formula.arrayEnter` và vị trí ribbon thật.

## Tệp/module dự kiến

- Engine/app Sheet: `apps/sheet/formula-engine.js`, `apps/sheet/formula-expression.js` (chỉ nếu cần truyền `MatrixValue` lồng hàm), `apps/sheet/sheet-grid.js`, và module toán ma trận/thống kê riêng trong `apps/sheet/` nếu khối triển khai đủ lớn.
- Adapter/lưu tệp: `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py` chỉ khi kiểm tra cho thấy pipeline chưa giữ `<f t="array" ref>`.
- Help/i18n: `platform/help/entries-sheet.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`; không thêm thương hiệu sản phẩm khác vào nội dung người dùng.
- Oracle/golden: `scripts/audit-0610/function_oracle.mjs`, `scripts/audit-0610/function_oracle.ps1` (nếu cần), `tests/functions/cases-batch16-array-functions.json`, `tests/functions/golden-batch16-array-functions.json`, `tests/unit/function-golden.test.js`.
- Kiểm thử: mở rộng `tests/unit/sheet-array-formulas.test.js`, thêm test OOXML/Python và live CDP khi cần, đăng ký test mới trong `tests/run-tests.js`; cập nhật `docs/AUDIT-ARRAYS-1610.md` và handoff chuẩn.

## Phụ thuộc và ranh giới

- UI chỉ gọi command/grid/app service; không gọi LibreOffice trực tiếp.
- LibreOffice tiếp tục là cầu chuyển FODS/XLSX. Patch ZIP chỉ bảo toàn/khôi phục markup OOXML chuẩn sau chuyển đổi; không sửa Core/upstream và không thêm dependency.
- Desktop/live test chỉ điều khiển qua CDP; không dùng SendKeys. COM chỉ dùng oracle/read-only verification, theo retry hiện hữu và không đặt `Visible=$false`.
- Không triển khai `SEQUENCE` vì không thuộc tập tương thích mục tiêu. `MDETERM` hiện có được dùng làm đối chứng/hồi quy.

## Rủi ro và giảm thiểu

- Sai hướng hàng/cột hoặc thứ tự flatten: giữ ma trận 2 chiều nội bộ tới sát biên grid/golden; test ma trận không vuông và từng phần tử.
- Hồi quy scalar/implicit intersection: phân biệt rõ `evaluate()` và `evaluateArray()`; test công thức thường, CSE một ô và CSE nhiều ô.
- Sai thống kê hồi quy hoặc số học suy biến: dùng giải hệ/least-squares có kiểm tra hạng, chuẩn hóa lỗi `#VALUE!`, `#N/A`, `#NUM!`; đối chiếu số thực với tolerance từ oracle.
- Sửa một ô làm vỡ model mảng: chặn mọi đường ghi đè/cắt/dán trên một phần vùng, cho phép thao tác khi vùng đích bao trọn đúng khối; test thông báo và undo.
- LibreOffice làm mất `ref`/công thức anchor khi chuyển đổi: test ZIP trực tiếp, mở lại model, và xác minh Excel COM read-only (`HasArray`, `FormulaArray`, `CurrentArray.Address`).
- Dataset layout audit tốn thời gian: chạy test hẹp trước, full suite và 10 tệp LAN ở nghiệm thu; ghi trung thực PASS/FAIL/BLOCKED/NOT RUN.

## Kế hoạch kiểm thử

1. Đo Excel oracle cho từng hàm, gồm ma trận thường, hằng mảng, kích thước sai, dữ liệu lỗi, `LINEST/LOGEST stats=TRUE`, và wrapper `INDEX/SUM/SUMPRODUCT`; sinh golden batch 16.
2. Unit engine: kết quả/hình dạng mảng, tolerance số, lỗi chuẩn, scalar wrapper và `SUM(IF(...))` trong CSE.
3. Unit grid: nhập CSE một/nhiều ô, TRANSPOSE/hàm mới, `{=…}` trên thanh công thức, chặn sửa một phần, xóa cả khối, undo/redo một bước và recalc.
4. Round-trip: FODS hiện hữu và XLSX ZIP có đúng một anchor `<f t="array" ref="…">`; đọc lại giữ metadata/giá trị.
5. Excel COM read-only: `HasArray`, `FormulaArray`, `CurrentArray.Address`; đóng workbook không lưu và chỉ kết thúc PID do test tạo nếu cần.
6. Help/i18n/ribbon-location và đăng ký `tests/run-tests.js`.
7. Chạy test hẹp, `npm test`, structural 1–15 theo hạ tầng sẵn có, các audit lan28/lan04/lan01 và batch fidelity 10 XLSX; ghi kết quả thực tế vào audit/handoff.

## Hoàn tác

- Mỗi thay đổi giới hạn theo module và commit trên `feat/sheet-arrays-codex`; có thể revert commit tính năng mà không đụng Core/upstream hay build system.
- Nếu hậu xử lý OOXML gây hồi quy, bỏ riêng nhánh patch array trong `ooxml_zip_patch.py`; dữ liệu FODS/mô hình hiện hữu vẫn giữ đường cũ.
- Không migration phá hủy: metadata mảng là thuộc tính bổ sung trên cell; tài liệu không có công thức mảng đi qua đường cũ.
