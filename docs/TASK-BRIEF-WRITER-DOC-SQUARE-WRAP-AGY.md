# TASK BRIEF — Writer: giữ kiểu bao chữ "Square" của ảnh khi lưu .doc (agy, CODE — chẩn đoán trước)

Worktree: `E:\VNOffice-agy-doc-wrap` (nhánh `fix/writer-doc-square-wrap-agy`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"`.

## Vì sao
`E:\VN OFice\file test\lan-legacy\legacy13.doc` (gitignored, KHÔNG commit): Word gốc 1 trang, ảnh `Picture 3` bao chữ **Square** (Word COM `Shapes(i).WrapFormat.Type = 0`). Bản lưu .doc (đường xuất qua DOCX, đang bật) có ảnh bao chữ **TopBottom** (`= 4`) → đoạn văn bị đẩy xuống, tài liệu thành **2 trang**. Codex đã đo: bộ lọc `MS Word 97` của LibreOffice đổi `wrapSquare` thành top-and-bottom khi ảnh ở cùng đoạn với chữ đã sửa. Cách cấm: đổi sang `wrapNone` (chữ đè ảnh) — đã bị bác vì làm sai bố cục.

## Việc
1. Commit sớm `docs/HANDOFF-WRITER-DOC-SQUARE-WRAP-FINDINGS.md`: tái hiện bằng DOCX tối thiểu tự tạo (1 ảnh `wp:anchor` + `wp:wrapSquare` trong đoạn có chữ) → soffice `MS Word 97` → Word COM đo `WrapFormat.Type`. Thử các biến thể (anchor tách đoạn riêng, `wrapText="bothSides"`/`largest`, `behindDoc`, `layoutInCell`, `relativeFrom`, dạng VML `w10:wrap type="square"`…) để tìm dạng mà bộ lọc `MS Word 97` GIỮ Square.
2. Nếu tìm được: chuyển anchor sang dạng đó trong bước chuẩn bị DOCX trước khi xuất .doc (cạnh `prepare_writer_docx_for_legacy_doc_export`), KHÔNG đổi vị trí/kích thước/kiểu bao chữ. Nếu không có dạng nào giữ Square: ghi trung thực, không sửa.
3. Test hồi quy.

## Kiểm chứng
Word COM: legacy13 bản lưu `WrapFormat.Type` = 0 và 1 trang; 20 .doc (`legacy01`–`legacy20`) Word mở được 20/20, số trang không tệ hơn `main` (main: legacy13 1→2, legacy18 3→2), `scripts\layout-audit\_word_shape_pages.ps1` số hình ≥ gốc; 5 docx có hình (d04,d06,d07,d09,d24) 0 lệch; `node tests/run-tests.js` + `python -m unittest discover -s tests`. Báo trung thực tệp nào tệ đi.

## Luật cứng
Không đụng Sheet. Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Không tăng timeout. Tắt WINWORD ẩn do chính bạn mở trước mỗi lần đo. Commit tiền tố `fix(writer): W-docwrap`. Không merge vào `main`. Handoff `docs/HANDOFF-WRITER-DOC-SQUARE-WRAP.md`.