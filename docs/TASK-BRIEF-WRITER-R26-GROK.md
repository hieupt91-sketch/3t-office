# TASK BRIEF — Writer R26 (Grok): d10 "file hỏng" — chẩn đoán thật, không chỉ ghi nhận

Worktree: `E:\VNOffice-grok-writer-r26` (nhánh `fix/writer-r26-grok`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge. Đọc `docs/HANDOFF-WRITER-R25.md`, `docs/HANDOFF-WRITER-R24.md` để biết bối cảnh (không cần thử lại các giả thuyết đã bị loại ở đó — mảng d09/d15/d16/d01/d07 tạm dừng, lợi ích cận biên thấp qua 2 vòng liên tiếp).

## Vấn đề
Suốt 5 vòng R20–R25, mọi ma trận đều ghi "d10.docx | Word COM: FAIL The file appears to be corrupted." và dừng ở đó — CHƯA từng có ai kiểm tra: (a) file gốc thật sự hỏng (không phần mềm nào mở được), hay (b) chỉ Word COM automation từ chối nhưng file vẫn hợp lệ theo chuẩn OOXML, hay (c) VN Writer TỰ nó cũng có lỗi khi mở/xử lý file này mà chưa ai kiểm tra riêng.

## Việc cần làm

### 1. Kiểm tra cấu trúc file thật (không qua Word COM)
```
python -c "import zipfile; z = zipfile.ZipFile(r'file test\landocx\d10.docx'); print(z.testzip()); print(z.namelist())"
```
Nếu `testzip()` trả về khác `None`, hoặc thiếu `word/document.xml`/`[Content_Types].xml`, đó là hỏng ZIP thật (không sửa được, ghi nhận dứt điểm và bỏ file này khỏi mọi phép đo tương lai với ghi chú rõ ràng). Nếu ZIP hợp lệ, đọc `word/document.xml` bằng `xml.etree.ElementTree` xem có parse được không — nếu XML tự nó hỏng (ví dụ bị cắt giữa chừng, encoding sai), cũng ghi nhận là hỏng thật.

### 2. Nếu file có vẻ hợp lệ (ZIP + XML đọc được) — thử Word COM lại với cách khác
`_word_para_metrics.ps1`/`_word_oracle3.ps1` hiện dùng cách nào để mở (`Documents.Open` với tham số gì)? Có thể Word từ chối vì một tính năng cụ thể (macro, DRM, phiên bản tương thích cũ) mà `Open` không xử lý mặc định — thử `Documents.Open(path, ConfirmConversions:=False, ReadOnly:=True, AddToRecentFiles:=False)` hoặc mở qua `Word.Application` với `Visible=True` một lần để xem thông báo lỗi thật của Word (không phải thông báo chung của script) là gì.

### 3. Thử mở bằng chính VN Writer
Mở `file test\landocx\d10.docx` bằng `python main.py "file test\landocx\d10.docx"` (hoặc cơ chế tương đương trong `main.py`) — VN Writer có mở được không? Nếu VN Writer mở được nhưng Word không (hoặc ngược lại), đó là thông tin quan trọng cần ghi lại chính xác, không suy diễn.

### 4. Kết luận và hành động
- Nếu file hỏng thật (không ai mở được, kể cả LibreOffice/soffice thử `soffice --convert-to pdf`): xác nhận trong handoff, đề xuất loại d10 khỏi mẫu đo tương lai (không xóa file, chỉ ghi chú trong `docs/QUY-UOC-DOI-CHIEU.md` hoặc handoff mới nhất để các vòng sau không tốn công đo lại nó).
- Nếu VN Writer có lỗi thật khi mở mà Word/LibreOffice gốc không có (hoặc ngược lại) — đây là bug thật, mô tả chính xác nguyên nhân (không cần sửa ngay nếu phức tạp, chỉ cần chẩn đoán chính xác và đề xuất hướng sửa cho vòng sau).

## Luật cứng
Không commit/copy tài liệu thật (`file test/` đã gitignore). Không đụng code Sheet. Không đổi định nghĩa lớp lỗi của bộ đo. `node tests/run-tests.js` + `python -m unittest discover -s tests -p "test_*.py"` phải chạy được trước commit nếu có sửa code (nếu chỉ chẩn đoán, không bắt buộc). Commit tiền tố `fix(writer): …` hoặc `docs: …` tùy có sửa code hay không. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-R26.md`: kết luận chẩn đoán d10 rõ ràng (hỏng thật hay không, ai mở được ai không), bằng chứng cụ thể (output lệnh thật), khuyến nghị. Nếu có bug thật và sửa được trong phạm vi hợp lý, sửa và đo lại toàn bộ 23 file để xác nhận không hồi quy.
