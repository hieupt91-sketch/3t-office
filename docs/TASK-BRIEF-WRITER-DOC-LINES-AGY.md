# TASK BRIEF — Writer: đường kẻ (Line) bị MẤT khi lưu .doc (agy, CODE — chẩn đoán trước)

Worktree: `E:\VNOffice-agy-doc-lines` (nhánh `fix/writer-doc-lines-agy`, tách từ `main` — đã có đường xuất .doc qua DOCX + làm phẳng AlternateContent/VML của bạn). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước mọi lần chạy app/soffice.

## Vì sao (Claude đo Word 29/9 07:20)
`scripts\layout-audit\_word_shape_pages.ps1 -Source <gốc .doc> -Saved <bản lưu .doc>` trên `E:\VN OFice\file test\lan-legacy\` (gitignored, KHÔNG commit):
- legacy06.doc: gốc 1 hình `Line 13` (trang 1) → bản lưu 0 hình.
- legacy17.doc, legacy18.doc: gốc `Line 115` → bản lưu 0.
Mất trên CẢ đường xuất trực tiếp HTML→Word 97 lẫn đường qua DOCX. Đường kẻ trong văn bản hành chính VN thường là gạch dưới quốc hiệu/tiêu ngữ, chỗ ký tên — mất là mất dữ liệu nhìn thấy được.
Ngoài ra: legacy13 `Picture 3` và legacy20 `Line 3`/`Text Box 2` có trong bản lưu nhưng bị đổi tên (ghi nhận, ưu tiên thấp).

## Việc
1. Commit sớm `docs/HANDOFF-WRITER-DOC-LINES-FINDINGS.md`: đường kẻ mất ở bước nào (mở .doc → DOCX trung gian → HTML → canvas → xuất DOCX → hậu xử lý → .doc). Kiểm tra cả khi LƯU .docx từ các .doc này (có mất không).
2. Sửa nguyên nhân gốc (dùng lại cơ chế khôi phục hình đã có: `_restore_missing_writer_drawings`, passthrough anchor… trong `adapters/libreoffice/common/ooxml_zip_patch.py`); không vá kiểu chép byte gốc.
3. Test hồi quy.

## Kiểm chứng
- 20 .doc (`legacy01`–`legacy20`): `_batch_writer.py` — Word mở được 20/20, số trang không tệ hơn `main` ở bất kỳ tệp nào (main: lệch legacy13 1→2, legacy18 3→2); `_word_shape_pages.ps1` từng tệp: số hình bản lưu ≥ gốc, không trang nào lệch so với `main`.
- 23 docx `E:\VN OFice\file test\landocx` (bỏ d10) 23/23; `_writer_shape_counts.py` 0 vượt gốc/0 docPr trùng; `_word_shape_pages.ps1` d04/d06/d07/d09/d24 = 0 lệch.
- `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground.
- BÁO CÁO TRUNG THỰC tệp nào tệ đi (vòng trước bạn ghi "không tệp nào kém hơn" nhưng legacy13 kém đi 1→2 — Claude đã phát hiện khi đo lại).

## Luật cứng
Không đụng Sheet. Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. KHÔNG tăng timeout test. Tắt WINWORD ẩn do chính bạn mở trước mỗi lần đo (không tắt Word có cửa sổ). Commit sau mỗi bước, tiền tố `fix(writer): W-doclines`. Không merge vào `main`. Handoff `docs/HANDOFF-WRITER-DOC-LINES.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.