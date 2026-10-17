# Kiểm toán công thức mảng CSE và hàm mảng — 16/10

## Phạm vi và kết quả triển khai

- Bổ sung `MMULT`, `MINVERSE`, `MUNIT`, `TRANSPOSE`, `FREQUENCY`, `LINEST` (kể cả `stats=TRUE`), `TREND`, `GROWTH`, `LOGEST` trên cùng `FormulaEngine`; kết quả ma trận dùng được trong công thức mảng nhiều ô hoặc được bọc bởi `INDEX`, `SUM`, `SUMPRODUCT`.
- Ctrl+Shift+Enter điền toàn bộ vùng chọn, hiển thị `{=…}` trên thanh công thức, hỗ trợ CSE một ô như `SUM(IF(...))`, chặn sửa/xóa riêng một phần khối, cho phép xóa cả khối và hoàn tác trong một bước.
- Đường lưu hiện hữu qua FODS/LibreOffice đã phát sinh OOXML chuẩn `<f t="array" ref="D1:E2">MMULT(A1:B2,A1:B2)</f>`; không cần sửa LibreOffice Core hoặc hậu xử lý OOXML. Mở lại giữ đúng vùng và công thức mảng.
- Trợ giúp tiếng Việt dùng lệnh thật `sheet.formula.arrayEnter`, vị trí thật tab **Công thức** / nhóm **Kiểm tra công thức**, có các bước nhập, sửa và xóa khối mảng. Chuỗi cảnh báo có đủ VI/EN.

## Bằng chứng kiểm thử

| Cổng | Kết quả |
|---|---|
| Oracle/golden batch 16 | PASS — 30/30 ca khớp Excel 2016 |
| Unit công thức mảng | PASS — 11/11 |
| Round-trip XLSX bằng LibreOffice thật | PASS — 1/1; XML có `t="array"`, `ref="D1:E2"` |
| Excel COM ReadOnly | PASS — `ReadOnly=true`, `HasArray=true`, `FormulaArray==MMULT(A1:B2,A1:B2)`, `CurrentArray=D1:E2` |
| Desktop CDP | PASS — 8/8 kiểm tra; không dùng SendKeys |
| `npm test` | PASS — 3550/3550 |
| Structural cases 1–13 và 15 | PASS — 172/172 kịch bản, 1019/1019 ô |
| Cache công thức | PASS — lan01 865/865 (100%); lan04 49/49 (100%); lan28 271/275 (98,55%) |
| Dirty-save LAN | PASS — 10/10 tệp; `saved=yes`, `diffs=0`, lint sạch, Excel PASS |
| `git diff --check` | PASS |

Lệnh desktop dùng profile riêng dưới `E:\VNOffice-profiles\codex-arrays-*`. Batch lưu thật nằm tại `E:\VNOffice-profiles\codex-arrays-batch\output`; báo cáo cache nằm tại `E:\VNOffice-profiles\codex-arrays-formula-cache\report.md`.

## Sai lệch đã biết và rủi ro

- lan28 còn bốn sai lệch cache đã biết ngoài phạm vi công thức mảng; tỷ lệ 98,55% vẫn vượt cổng 98,18%.
- Hồi quy tuyến tính dùng phép giải hệ số trong JavaScript và đối chiếu oracle với sai số số thực. Ma trận suy biến trả lỗi thay vì tạo giá trị không hữu hạn.
- `SEQUENCE` không được triển khai vì không thuộc bộ tương thích mục tiêu; `MDETERM` hiện hữu được giữ nguyên.
- Không thêm dependency, không sửa build system, không sửa LibreOffice Core và không thay đổi ngữ nghĩa XLSX ngoài biểu diễn array formula chuẩn.
