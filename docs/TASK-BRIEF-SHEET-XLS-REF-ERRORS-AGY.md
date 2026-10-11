# TASK BRIEF — Sheet: lưu .xls làm công thức `#REF!` thành `#N/A` (agy, CODE nhỏ — đo trước)

Worktree: `E:\VNOffice-agy-xls-refs` (nhánh `fix/sheet-xls-ref-errors-agy`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước mọi lần chạy app/soffice.

## Vì sao (số đo Claude 28/9)
`python scripts\layout-audit\_batch_xls_roundtrip.py <worktree> "E:\VN OFice\file test\lan-legacy" <out> legacy06.xls` (tệp thật, gitignored, KHÔNG commit): mở bằng app → Lưu thành .xls → Excel COM so từng ô: 185 ô, **lệch 10**: sheet "Nhà dân" các ô như (19,9), (21,9), (30,9)… gốc `=#REF!-(#REF!*#REF!)` (giá trị lỗi #REF!) → bản lưu `=#N/A` (lỗi #N/A); và ô (22,3) gốc là chuỗi rỗng → bản lưu mất. Công thức gốc đã hỏng sẵn (tham chiếu tới vùng bị xoá), nhưng Excel vẫn hiển thị #REF!, bản lưu phải giữ đúng như vậy.

## Việc
1. Commit sớm `docs/HANDOFF-SHEET-XLS-REF-ERRORS-FINDINGS.md`: đi theo từng bước (soffice .xls→FODS lúc mở, FODS app gửi khi lưu, soffice FODS→.xls) xem `#REF!` bị đổi thành `#N/A` ở đâu; ô chuỗi rỗng mất ở đâu. Kiểm tra cả khi Lưu thành .xlsx (có bị cùng lỗi không).
2. Sửa nguyên nhân gốc ở adapter/Python (thứ tự AGENTS.md mục 3; không sửa LibreOffice Core). Nếu LibreOffice không thể xuất `=#REF!…` sang .xls, ghi rõ giới hạn và chọn phương án ít mất dữ liệu nhất (ví dụ giữ giá trị lỗi #REF!), không bịa giá trị.
3. Test hồi quy (Python hoặc JS) tái hiện đúng dạng công thức `#REF!` này.

## Kiểm chứng
- `legacy06.xls` lệch 0 (hoặc ghi trung thực phần còn lại + lý do); 13 tệp .xls khác Excel mở được (`legacy01-04,07,08,10-13,15,16,19,20`) vẫn lệch 0 như `main` (legacy13 lệch 1 là công thức VND bị bỏ khi lưu .xls — đã biết, giữ nguyên).
- `python scripts\layout-audit\_batch_audit.py <worktree> lanNN.xlsx` 26 tệp (bỏ lan06, lan14) TỔNG lệch 0 (chép `file test\lan` từ `E:\VN OFice` nếu thiếu).
- `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground (không tăng timeout).

## Luật cứng
Không đụng Writer. Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. KHÔNG tăng timeout test. Commit sau mỗi bước, tiền tố `fix(sheet): …`. Không merge vào `main`. Handoff `docs/HANDOFF-SHEET-XLS-REF-ERRORS.md`, PASS/FAIL/NOT RUN trung thực.