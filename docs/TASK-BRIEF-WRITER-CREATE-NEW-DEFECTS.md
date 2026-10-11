# Brief W20 — Tài liệu TẠO MỚI trong VN Writer → lưu DOCX → mở Word 2016: 12 lệch / 36 kiểm tra (codex)

Bộ đo (đã có, opencode V11, main): `python scripts/layout-audit/_create_new_writer.py . _new.docx` rồi
`powershell -File scripts/layout-audit/_word_readback.ps1 -File _new.docx` → `CHECKS=36 DIFFS=12`. Chi tiết trong
`docs/HANDOFF-WRITER-CREATE-NEW-HARNESS.md`. Đây là chiều thương mại quan trọng nhất: người dùng soạn trong VN Writer,
gửi DOCX cho đối tác mở bằng Word.

| # | Lệch (Word đọc lại) | Nguyên nhân đã đo | Việc |
|---|---|---|---|
| 1 | Giãn dòng 1,5 → Word `LineSpacingRule=Single`, 1.38 | app gửi `line-height: 1.5` → LibreOffice HTML import đổi thành pt tuyệt đối | quy ước: giãn dòng "multiple" xuất ra HTML dạng `line-height: 150%` (LibreOffice giữ proportional) hoặc ghi thẳng `w:spacing w:line="360" w:lineRule="auto"` khi hậu xử lý DOCX; Word phải đọc `1.5 lines` |
| 2 | Thụt lề đầu dòng 1,27 cm → 0,06 | `text-indent` không qua được HTML import | hậu xử lý DOCX: `w:ind w:firstLine` từ marker; hoặc đổi cách xuất (fodt?) — đo trước |
| 3 | Danh sách gạch đầu dòng → Word "numbered" | `<ul>` → LibreOffice tạo numbering kiểu số | numbering.xml đúng `bullet` + `lvlText` "•" |
| 4 | Ảnh inline data-URI mất | LibreOffice HTML import không nhúng data: URI | ghi ảnh ra file tạm + `<img src="file://…">` hoặc chèn `word/media` ở hậu xử lý |
| 5 | Ngắt trang (section nextPage) không ra DOCX → trang 2 mất | marker `<div data-vno-section-break>` không khớp regex trong `_contentForExport()` | sửa regex/marker; Word phải có 2 trang |
| 6 | Header "VN Office" và footer số trang mất | `_contentForExport()` đọc `headerDom.innerText` nhưng không ra file | xuất header/footer thành `w:hdr`/`w:ftr` thật + field `PAGE` (W7 đã xử lý chiều nhập) |
| 7 | Lề phải PageSetup sai | xem handoff mục 10 | `w:pgMar` đúng 4 lề, A4 |
| 8 | 2 lệch giả của bộ đo (borders `[bool]True`, text ô gộp có `\r\x07`) | so sánh chuỗi trong `_word_readback.ps1` | sửa bộ đo (trim ký tự ô, ép bool) |

## Cách làm

1. Sửa bộ đo (mục 8) trước để số sạch. Mỗi lớp 1–7: xác định đúng tầng (JS `_contentForExport` / HTML gửi đi / hậu xử
   lý `postprocess_writer_docx` trong `ooxml_zip_patch.py`), sửa một chỗ, unit test (`tests/unit/writer-*.test.js`
   hoặc `tests/test_writer_*.py`), quy ước W20a–g vào QUY-UOC.
2. Nghiệm thu: harness → `DIFFS=0`; **24 file nhập không hồi quy**: `python scripts/layout-audit/_writer_layout_audit.py . "file test/landocx" _out`
   (cache Word chép từ `E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl`, không chép canvas cache) — bảng
   tổng kind không lớp nào tăng; `_batch_writer.py` (mở + sửa + lưu) số trang bản lưu không xa Word hơn.
3. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_writer*.py"`.
   Chạy tuần tự (Word COM + profile Writer). Không commit `file test`; không bịa số; hết hạn mức thì commit phần xong + ghi rõ.
