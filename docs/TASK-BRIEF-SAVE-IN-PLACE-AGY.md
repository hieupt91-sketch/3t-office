# TASK BRIEF — Writer + Sheet: Ctrl+S lưu thẳng vào tệp đang mở như Word/Excel; tôn trọng định dạng .doc/.xls (agy, CODE — có Plan gate)

Worktree: `E:\VNOffice-agy-save-in-place` (nhánh `fix/save-in-place-agy`, tách từ `main`). Chỉ làm trong worktree này. Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước mọi lần chạy app/soffice.

## Vì sao (số đo Claude 28/9)
1. `adapters/libreoffice/writer/writer-adapter.js` `save()` (tương tự `sheet-adapter.js`): "V1: luôn mở hộp thoại chọn nơi lưu". Word/Excel: **Ctrl+S lưu thẳng vào tệp đang mở**, chỉ hiện hộp thoại khi tài liệu mới chưa có đường dẫn (hoặc F12 / Lưu thành). Người dùng chuyển từ Office sang sẽ thấy phiền mỗi lần lưu.
2. Người dùng tự gõ đuôi `.doc` trong hộp thoại Lưu → `main.py` `save_document_dialog` vẫn convert sang DOCX (`target_format` do JS truyền = `docx`) và ghi byte DOCX (`PK`) dưới đuôi `.doc`. Đo thật: 8/8 bản lưu `.doc` bắt đầu bằng `50 4B 03 04` trong khi file gốc `D0 CF 11 E0`. Tương tự rủi ro với `.xls`.
3. Ổ LAN công ty: 41% tài liệu là `.doc`/`.xls` (76 + 200 file) — đường lưu định dạng cũ phải đúng.

## Hành vi mục tiêu (theo Word/Excel 2016)
- **Ctrl+S / nút Lưu** trên tài liệu đã có đường dẫn gốc định dạng hiện đại (`.docx`/`.xlsx`/`.odt`/`.ods`): lưu thẳng vào đường dẫn đó, không hỏi. Thông báo nhẹ trên thanh trạng thái ("Đã lưu"), không hộp thoại OK phải bấm.
- **Tài liệu mới** (chưa có đường dẫn): hiện hộp thoại Lưu thành.
- **Lưu thành** (F12 / Tệp → Lưu thành): luôn hiện hộp thoại; loại tệp theo đuôi người dùng chọn: `.docx`→`MS Word 2007 XML`, `.doc`→`MS Word 97`, `.odt`, `.rtf`; `.xlsx`→`Calc MS Excel 2007 XML`, `.xls`→`MS Excel 97`, `.ods`, `.csv`. Đuôi và byte nội dung PHẢI khớp.
- **Tài liệu gốc `.doc`/`.xls`**: như Word/Excel "Chế độ tương thích" — Ctrl+S lưu lại đúng định dạng cũ vào tệp đó (byte `D0 CF 11 E0`), KHÔNG âm thầm đổi thành DOCX. (Nếu thấy lý do chính đáng để hỏi người dùng "Giữ định dạng cũ / Chuyển sang .docx" như Excel, ghi đề xuất vào handoff nhưng mặc định vẫn giữ định dạng cũ.)
- **An toàn dữ liệu khi ghi đè**: ghi ra tệp tạm cùng thư mục rồi thay thế nguyên tử (`os.replace`); nếu convert/ghi lỗi thì tệp gốc KHÔNG bị hỏng, hiện lỗi tiếng Việt rõ ràng. Tệp đang bị khoá/chỉ đọc → báo lỗi và mời Lưu thành.
- Đổi tên tab/tiêu đề cửa sổ đúng tệp đã lưu; `isDirty` về false.

## Plan gate (AGENTS.md mục 6 — thay đổi import/export + nhiều file)
BƯỚC ĐẦU: commit `docs/PLAN-SAVE-IN-PLACE.md` (objective, current capability, files/modules, dependency, risk, test plan, rollback) TRƯỚC khi sửa code. Rà cả Writer, Sheet (Slides chỉ ghi nhận, không bắt buộc sửa). Giữ nguyên postprocess độ trung thực hiện có (`_apply_native_export_postprocess`, `source_path`) — đường lưu tại chỗ phải đi qua đúng postprocess như Lưu thành. Không phá luồng `_batch_writer.py`/`_batch_audit.py` (chúng gán `create_file_dialog`); nếu Ctrl+S không còn mở hộp thoại, cập nhật các script đo cho khớp (chỉ phần gọi lưu), ghi rõ vào handoff.

## Kiểm chứng bắt buộc
- Unit test (Python) cho: map đuôi → filter; ghi tạm + replace; lỗi convert không làm hỏng tệp gốc; tệp chỉ đọc.
- Live (app thật): mở `.docx` → sửa → Ctrl+S → không có hộp thoại, tệp cập nhật, Word COM mở được, nội dung sửa có mặt. Mở `.doc` (dùng bản CHÉP trong thư mục tạm của `file test\lan-legacy\legacy02.doc`, KHÔNG ghi đè bản gốc trong `file test`) → sửa → Ctrl+S → byte đầu `D0 CF 11 E0`, Word mở được, nội dung sửa có mặt. Tương tự `.xlsx` và `.xls` (tự tạo file .xls mẫu bằng LibreOffice từ `file test\lan\lan11.xlsx` vào thư mục tạm). Lưu thành `.doc`/`.xls` từ tài liệu mới: đuôi khớp byte.
- Không hồi quy độ trung thực: `python scripts\layout-audit\_batch_writer.py` trên 23 docx `E:\VN OFice\file test\landocx` (bỏ d10) — số trang bản lưu = Word 23/23 như `main`; `_batch_audit.py` 26 file `file test\lan` (bỏ lan06, lan14) TỔNG lệch 0. (Chép các thư mục `file test` cần thiết từ `E:\VN OFice` nếu worktree thiếu — gitignored, KHÔNG commit.)
- `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground.
- Hướng dẫn tiếng Việt (AGENTS.md mục 10): cập nhật bài Help Lưu/Lưu thành cho Writer và Sheet (Ctrl+S, F12, định dạng cũ).

## Luật cứng
Chỉ sửa phần lưu: `main.py` (save), `adapters/libreoffice/{writer,sheet}/*-adapter.js` hàm save, `adapters/libreoffice/common/uno-bridge.js`, `platform/shell/*` nếu cần lệnh Lưu thành/F12, help, i18n, test. Không đụng logic chuyển đổi/postprocess độ trung thực của Writer (Grok đang sửa `ooxml_zip_patch.py` phần shape). Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sau mỗi bước, tiền tố `fix(save): …`. Không rebase/force, không merge vào `main`.

## Bàn giao
`docs/HANDOFF-SAVE-IN-PLACE.md` theo mẫu `09-templates/AGENT-HANDOFF.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.
