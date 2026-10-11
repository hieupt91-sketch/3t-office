# Audit soạn thảo VN Writer — D15b

**Nhánh:** `test/doc-editing-codex`  
**Lệnh:** `node --experimental-websocket scripts/audit-0610/doc_editing_check.mjs`  
**Kết quả chạy:** FAIL (13 PASS, 4 FAIL, 2 BLOCKED, 1 NOT RUN). Đây là phiên chạy cuối; không tính là PASS tổng thể.

## Kết quả

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Gõ nhiều dòng, Enter tạo đoạn mới | PASS | DOM tạo block `<p>`/`<div>`, nội dung có cả hai dòng. |
| Backspace đầu đoạn gộp đoạn | PASS | `Alpha` + `Beta` thành một đoạn `AlphaBeta`. |
| Delete cuối đoạn | PASS | `Alpha` + `Beta` thành một đoạn `AlphaBeta`. |
| Shift+Mũi tên chọn ký tự | PASS | Selection `bc`. |
| Ctrl+Shift+Mũi tên chọn từ | PASS | Selection `Mot ` (từ thứ nhất và khoảng trắng). |
| Home/End | PASS | Con trỏ về offset 0 và offset 6. |
| Ctrl+A rồi gõ thay thế | PASS | Văn bản còn `Văn bản mới`. |
| Tab trong đoạn | PASS | DOM giữ `trái`, tab, `phải`. |
| Shift+Enter tạo xuống dòng mềm | FAIL | Sau phím, nội dung vẫn `một hai`, DOM `<p>một hai</p>`, không có `<br>`. DOCX `w:br` do đó chưa được xác nhận. |
| Ctrl+C/V trong cùng tài liệu | BLOCKED | Đã thử phím thật; không chèn bản sao. Clipboard trình duyệt/CDP không truy cập được trong phiên này, nên không kết luận lỗi sản phẩm. DOM cuối có `copy phrase` và phần dán dang dở `copy `. |
| Kéo thả văn bản | FAIL | Kéo vùng chọn bằng CDP mouse không cho nội dung đích như mong đợi; DOM thành ` chu dekeon day`. Phép thử chọn điểm kéo có thể nhạy với hình học caret, cần tái hiện trực quan trước khi quy lỗi sản phẩm. |
| Ctrl+F và tìm tiếng Việt, hoa/thường | FAIL | Ctrl+F mở đúng panel, nhưng gõ `đường` không làm selection tìm kiếm thay đổi (`selected: ""`, văn bản có ba biến thể). Chưa chứng minh được tìm nguyên từ/không phân biệt hoa thường. |
| Ctrl+H và thay một/thay tất cả | BLOCKED | Ctrl+H mở panel với hai ô và đúng các nút Tìm tiếp/Thay thế/Thay thế tất cả; script chưa thao tác qua panel do chưa định vị chuẩn nút/checkbox. Chưa có kết luận chức năng. |
| Nhập dấu tiếng Việt | PASS | `Việt Nam có dấu` còn nguyên trong text và HTML DOM. |
| Ctrl+Z/Ctrl+Y sau chuỗi gõ | FAIL | Sau gõ `chuỗi gõ liền`, Ctrl+Z chỉ bỏ chữ cuối (`chuỗi gõ liề`); Ctrl+Y phục hồi chuỗi. Hoàn tác chưa gom thành một thao tác hữu ích. |
| Tự sửa dấu cách kép | NOT RUN | Đã gõ `hai  khoang`, nhưng chưa gửi ranh giới xác nhận Space/dấu câu. DOM giữ hai dấu cách; chưa đủ điều kiện đánh giá auto-correct. |
| Lưu DOCX và đối chiếu DOM | PASS | Lưu trả `status: ok`; text các đoạn trong `word/document.xml` khớp chính xác DOM: `Lưu DOCX: Đường phố Việt Nam`, `Kiểm tra dấu tiếng Việt`. |

## Lỗi sản phẩm cần điều tra

Hai kết quả có bằng chứng trực tiếp: Shift+Enter không chèn line break, và Ctrl+Z chỉ hoàn tác ký tự cuối sau chuỗi nhập. Trước khi sửa cần tách khả năng thao tác CDP khỏi hành vi sản phẩm bằng cách kiểm tra `keydown`/`beforeinput` và undo snapshots trong phiên Writer.

1. Mở VN Writer, đặt con trỏ giữa một đoạn, gõ `một hai`, nhấn Shift+Enter; xem DOM có `<br>` và DOCX có `w:br` không.
2. Tạo đoạn trống, gõ liên tục `chuỗi gõ liền`, nhấn Ctrl+Z; ghi nhận còn cả chuỗi hay chỉ mất ký tự cuối, sau đó Ctrl+Y.
3. Nếu tái hiện, lần theo trình xử lý phím nhập trong Writer và cơ chế snapshot/undo của adapter; phạm vi nghi ngờ ban đầu là luồng nhập văn bản Writer và ghi lịch sử undo, chưa xác định hàm cụ thể.

Không sửa sản phẩm: các ca FAIL hiện cần xác nhận thêm để phân định sai phép thử và lỗi ứng dụng; các kiểm tra khác cũng cho thấy bài kiểm chưa thao tác UI đúng cho Replace và cần cải thiện fixture kéo thả. Không thay expected, không tắt test.

## Handoff

TASK: D15b — kiểm chứng soạn thảo bằng phím thật  
AGENT/ROLE: Codex / QA audit  
BRANCH: `test/doc-editing-codex`  
WORKTREE: `E:\VNOffice-codex-d15b`  
OBJECTIVE: Tạo script audit CDP và báo cáo có trạng thái/bằng chứng từng hạng mục.  
FINDINGS: 13 PASS, 4 FAIL, 2 BLOCKED, 1 NOT RUN.  
IMPLEMENTATION SUMMARY: Thêm script audit và báo cáo; không sửa mã sản phẩm.  
FILES CHANGED: `scripts/audit-0610/doc_editing_check.mjs`, `docs/AUDIT-DOC-EDITING-0610.md`.  
COMMANDS RUN: `node --experimental-websocket scripts/audit-0610/doc_editing_check.mjs` (exit 1 do các ca FAIL).  
BUILD RESULT: NOT RUN.  
TEST RESULTS: Audit đã chạy; tổng thể FAIL.  
KNOWN FAILURES: Shift+Enter, kéo thả, Ctrl+F tìm tiếng Việt, Ctrl+Z grouping; xem bảng.  
RISKS: Kéo thả và tìm kiếm có khả năng sai setup/assertion; chưa xác nhận trực tiếp bằng UI.  
DEPENDENCIES/BLOCKERS: Clipboard CDP không khả dụng; test Replace cần thao tác chuẩn qua dialog.  
CORE PATCH ID: Không áp dụng.  
NEXT ACTION: Tái hiện 2 ca có bằng chứng trực tiếp; hoàn thiện đo Replace, clipboard và drag trước khi sửa tính năng.
