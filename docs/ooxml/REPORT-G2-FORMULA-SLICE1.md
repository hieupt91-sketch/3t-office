# G2 — Engine tính công thức, slice 1 (nền móng)

Nhánh: `claude/ooxml-g2-formula-engine` (base `vn-main`). Không mở PR.

## Đã build (thuần thêm, 0 file sẵn có bị sửa)
`ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Formula/`
- `FormulaTokenizer.swift` — số (kể cả `1.5E2`, `.5`), chuỗi (`""` thoát), boolean, hằng lỗi, `A1`/`$A$1`, `'Tên sheet'!`/`Sheet!`, tên, hàm, `+ - * / ^ & = <> < > <= >=`, `%`, ngoặc, dấu phẩy, `:`.
- `FormulaParser.swift` — AST `FormulaExpr`; độ ưu tiên đúng Excel (so sánh < `&` < `+ -` < `* /` < `^` trái-kết-hợp < dấu âm đơn ngôi < `%`; `-2^2 = 4`). Vùng `A1:B2`, tham chiếu chéo sheet.
- `FormulaEvaluator.swift` — bộ tính; ép kiểu số/logic/chuỗi, so sánh kiểu Excel (số < chuỗi < logic, chuỗi không phân biệt hoa thường), `ROUND` nửa-ra-xa-số-0 trên biểu diễn 15 chữ số (2.675 → 2.68).
- `FormulaEngine.swift` — mô hình ô trong bộ nhớ, đồ thị phụ thuộc (ô công thức nằm trong vùng được tham chiếu), tính lại theo thứ tự topo (Kahn), phát hiện vòng lặp (`circularCells`).
- `FormulaWorkbookBridge.swift` — `FormulaEngine(workbook:)`: nạp chỉ-đọc từ `Workbook` qua API công khai sẵn có (không cần accessor mới).

## Hàm hỗ trợ
SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, IF (tính lười), AND, OR, NOT, ROUND, ABS, CONCATENATE, NA, và toán tử `&`. Lỗi: `#DIV/0!`, `#VALUE!`, `#REF!`, `#NAME?`, `#N/A`, `#NUM!` — lan truyền qua toán tử, hàm, chuỗi phụ thuộc.

Quy ước (ghi để G0/parity đối chiếu Excel sau): cú pháp sai và hàm/tên chưa biết → `#NAME?`; sheet không tồn tại → `#REF!`; ô thuộc hoặc phụ thuộc vòng lặp → `#REF!` (Excel thật trả 0 + cảnh báo); sai số đối số → `#VALUE!`; vùng nhiều ô ở ngữ cảnh đơn → `#VALUE!` (chưa có giao ngầm/mảng).

## Test (thật)
Môi trường có Swift 6.0.3 (Linux x86_64). `cd ports/ios/OOXMLKit && swift test`:
**166/166 PASS, 0 failures** (trước đó 138; thêm 28 test mới trong `Tests/OOXMLSpreadsheetTests/Formula{Syntax,Evaluator,Recalc}Tests.swift`: tokenizer 4, parser 4, evaluator 12 — mỗi hàm có test đường đúng + từng đường lỗi, recalc/vòng lặp/chéo sheet/nạp Workbook 11... tổng 28). `OfflineGuaranteeTests` vẫn chạy và PASS. Chưa chạy macOS/iOS/CI.
Lưu ý trung thực: lần chạy đầu có 2 assert fail do lỗi trong test (quên truyền dữ liệu mẫu) — đã sửa dữ liệu truyền vào test, KHÔNG đổi giá trị kỳ vọng.

## Giới hạn còn lại (chưa làm)
Array/dynamic array, named range (tên → `#NAME?`), hàm nâng cao (VLOOKUP/INDEX/MATCH/text/date/IFERROR/SUMIF…), pivot, tham chiếu cả cột/hàng (`B:B`, `2:3`), tham chiếu 3D, sổ ngoài, INDIRECT/OFFSET, tính lại tăng dần (hiện luôn tính toàn bộ), ghi kết quả ngược vào XLSX (chỉ đọc), định dạng số chuỗi `&` mới ở mức General 15 chữ số. Chưa đối chiếu Excel thật (việc G0/parity).
