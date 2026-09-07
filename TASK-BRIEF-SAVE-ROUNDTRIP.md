# Nhiệm vụ: Kiểm thử round-trip Lưu file THẬT của Writer (Mở → Lưu → Mở lại)

## Bối cảnh

Phiên làm việc gần đây đã kiểm thử kỹ luồng **Mở file thật** của
Writer (`main.py` hàm `open_document_dialog`, dùng
`soffice --convert-to html`) trên toàn bộ 15 file `.docx` thật — xác
nhận mở tốt, sửa 2 lỗi thật (ảnh vỡ do thiếu unquote, dòng chữ vỡ do
ảnh trang trí 1px). **Luồng Lưu file thật CHƯA từng được kiểm thử
trong phiên này** — đây là nhiệm vụ của bạn.

`main.py` hàm `save_document_dialog` (~dòng 725): nhận `content` (HTML
hiện tại của editor), bọc `<html><body>{content}</body></html>`, ghi
ra file `.html` tạm, rồi `soffice --convert-to docx` (hoặc format
khác) để xuất file thật. **Không** đi qua `serializeToFodt()` —
tương tự `open_document_dialog`, đây là luồng HTML thuần.

Vấn đề: hàm này gọi `_active_window()` ngay đầu (không có
`initial_file` bypass như `open_document_dialog`) — để test headless
phải mock CẢ `main._active_window` (trả về fake window) LẪN
`fake_window.create_file_dialog` (trả về đường dẫn file tạm). Xem
`tests/test_writer_tables_import.py` dòng ~67-90 để tham khảo cách
mock `_active_window` đã có (dù đó là test cho `open_document_dialog`,
không phải `save_document_dialog` — bạn cần viết mock tương tự nhưng
đầy đủ hơn cho `save_document_dialog`).

## Việc cần làm

Viết bộ test round-trip THẬT (không mô phỏng) cho ít nhất 5-8 file
`.docx` thật trong `file test/` (dùng lại danh sách trong
`scripts/generate_live_open_payloads.py` làm tham khảo đường dẫn):

1. **Mở** file thật qua `main.VnOfficeApi("writer", filepath).open_document_dialog("writer")`
   → lấy `content` (HTML).
2. **Lưu** `content` đó (KHÔNG sửa gì, round-trip nguyên trạng trước)
   qua `save_document_dialog(content, "writer", target_format="docx", ...)`
   với `_active_window` và `create_file_dialog` đã mock để ghi ra một
   đường dẫn `.docx` tạm thật (dùng `tempfile`).
3. **Mở lại** file `.docx` vừa lưu (bước 1 lặp lại trên file mới) →
   lấy `content2`.
4. So sánh `content` và `content2`: KHÔNG cần byte-identical (soffice
   có thể chuẩn hóa markup), nhưng phải:
   - Không mất nội dung văn bản chính (trích ra text thô bằng
     `re.sub(r"<[^>]+>", "", html)`, so sánh các đoạn quan trọng còn
     nguyên — không cần so toàn bộ ký tự trắng/thứ tự thẻ).
   - Số lượng bảng (`<table`) không đổi.
   - Số lượng ảnh nhúng (`data:image`) không đổi hoặc không giảm bất
     thường.
   - Không có ký tự lỗi `�` (mất mã hóa).
   - `status == "ok"` ở cả 2 bước Mở.
5. Thử THÊM 1 kịch bản có CHỈNH SỬA thật trước khi lưu (ví dụ chèn
   `<p>Đoạn text mới thêm vào để test round-trip</p>` vào cuối
   `content` trước bước Lưu) — xác nhận đoạn mới XUẤT HIỆN nguyên vẹn
   sau khi Mở lại (đây là kịch bản THẬT người dùng gặp: gõ thêm rồi
   lưu).
6. Đặc biệt kiểm tra tính năng "Khoảng cách trước/sau đoạn" vừa merge
   (`docs/HANDOFF-WRITER-PARAGRAPH-SPACING-BEFORE-AFTER.md`): chèn 1
   đoạn có `style="margin-top:12pt;margin-bottom:6pt"` vào `content`
   trước khi Lưu — xác nhận margin đó CÒN LẠI (hoặc ít nhất số pt gần
   đúng, cho phép sai số làm tròn nhỏ) sau khi Mở lại qua vòng
   soffice thật (đây là cách duy nhất để biết soffice HTML→DOCX→HTML
   có giữ được inline CSS margin hay không — chưa ai kiểm tra điều
   này).

Nếu tìm thấy lỗi THẬT (mất nội dung, mojibake, ảnh vỡ, margin không
giữ...), báo cáo rõ — CHƯA cần tự sửa `main.py` trừ khi lỗi đơn giản
và rõ ràng nguyên nhân (theo đúng tinh thần "ưu tiên tìm bằng chứng
thật trước khi sửa" của toàn phiên làm việc này).

## Kiểm thử bắt buộc

- Viết test mới tại `tests/test_writer_save_roundtrip.py` (theo pattern
  `unittest` như các file `tests/test_writer_*.py` khác).
- `python -m unittest discover -s tests -p "test_*.py"`: không giảm
  so với hiện tại (96 test hiện có).
- `node scripts/check-syntax.js`: 89/89 PASS (không đổi, đây là test
  Python thuần — chạy để chắc chắn không lỡ tay đổi file JS nào).
- `node tests/run-tests.js`: không giảm (1511 hiện tại).
- Viết `docs/HANDOFF-WRITER-SAVE-ROUNDTRIP-FIDELITY.md` — kết quả
  round-trip cho từng file, có lỗi gì không, đã sửa gì (nếu có).
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo.

## Ranh giới an toàn

- Nếu phát hiện lỗi PHỨC TẠP trong `main.py` cần sửa, CHỈ báo cáo rõ
  ràng (vị trí, nguyên nhân, bằng chứng), KHÔNG tự sửa nếu không chắc
  chắn 100% — để người điều phối xem lại trước.
- KHÔNG đụng Sheet/Slides.
- KHÔNG đụng `adapters/libreoffice/writer/writer-adapter.js`
  (parseFodt/serializeToFodt — luồng khác, không liên quan).
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
