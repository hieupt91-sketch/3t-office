# HANDOFF — VN Writer: batch 21 DOCX thật từ LAN (`file test/landocx`, d01–d21)

Công cụ: `_batch_writer.py <wt> <docdir> <outdir>` (scratchpad) — với mỗi file: số trang Word 2016 của bản gốc
(PDF export), mở trong app thật (số trang canvas từ thanh trạng thái), sửa (in đậm + "ZZ") và lưu, số trang Word
của bản lưu, kiểm tra ZZ, đếm đoạn/sectPr/br. Word oracle = `_word_oracle3.ps1` (đếm trang PDF).
Tệp thật KHÔNG commit (`/file test/` gitignored); bảng ánh xạ dNN → tên gốc ở `file test/landocx/_map.txt`.

## Vòng 2 (main sau b363abe + sửa lưu header/theme, 2026-09-15)

| file | Word | canvas | lưu → Word | ghi chú |
|---|---:|---:|---:|---|
| d01 | 19 | 20 | 21 | vòng 1: lưu hỏng ("corrupted") |
| d02 | 11 | 11 | 13 | vòng 1: lưu hỏng |
| d03 | 1 | 2 | 1 | 2 sectPr gốc → 0 khi lưu (mất section) |
| d04 | 5 | 3 | 5 | vòng 1: không tải được |
| d05 | 2 | 2 | 2 | vòng 1: lưu hỏng |
| d06 | 3 | 6 | 3 | canvas dư trang |
| d07 | 23 | 26 | 23 | vòng 1: lưu hỏng |
| d08 | 1 | 1 | 1 | |
| d09 | 14 | 19 | 16 | vòng 1: không tải được; đoạn 406 → 344 khi lưu |
| d10 | gốc hỏng | – | – | Word không mở được bản gốc |
| d11 | 5 | 4 | 6 | |
| d12 | 3 | 4 | 3 | |
| d13 | 10 | 12 | 10 | |
| d14 | 3 | 5 | 3 | canvas dư trang |
| d15 | 10 | 10 | 10 | |
| d16 | 8 | 9 | 11 | |
| d17 | 5 | 5 | 6 | |
| d18 | 2 | 2 | 2 | |
| d19 | 2 | 2 | 3 | |
| d20 | 3 | 5 | 7 | vòng 1: lưu hỏng — header1.xml.rels + ảnh logo không được chép theo (sửa dưới) |
| d21 | 9 | 10 | 10 | |

Tổng kết vòng 2 (20 file mở được): **lưu mở được trong Word 20/20** (vòng 1: 15/20); số trang bản lưu = Word
gốc **11/20** (vòng 1: 6/20); số trang canvas = Word **7/20** (vòng 1: 6/20), lệch ≤1 trang 14/20.

## Lỗi đã sửa từ batch này

1. `[Content_Types].xml` trùng Override footer/header → Word "corrupted" (bab6831): d01, d02, d05, d07.
2. Header/footer chép nguyên từ gốc nhưng thiếu `word/_rels/headerN.xml.rels` + media nó tham chiếu → d20
   "corrupted". `_collect_header_footer_dependencies` chép .rels + media (đổi tên `vnohf_…` để không đè ảnh thân),
   thêm Default content type. Test `tests/test_writer_headerfooter_dependencies.py`.
3. `word/theme/theme1.xml` do LibreOffice sinh (Arial/Arial) thay cho theme gốc (Calibri Light/Calibri) → các run
   "chưa sửa" giữ `w:asciiTheme="majorHAnsi"` đổi font → HDLD lưu 6 trang. Giữ theme gốc → 5 trang.
4. `<font face="Calibri Light, sans-serif">` → LibreOffice ghi `w:rFonts="Calibri Light;sans-serif"` (font không
   tồn tại). `_simplifyFontFamiliesForExport` chỉ gửi họ font đầu tiên.
5. Canvas: giãn dòng tỉ lệ theo font run, phân trang đo vị trí thật, gộp `<br>` đoạn neo ảnh
   (HANDOFF-WRITER-DOC-FONT-SPACING.md) — d04/d09 tải được, d13 16 → 12, d19 4 → 2, d20 6 → 5.

## Còn lại (đo được)

- Canvas dư trang: d06 3→6, d14 3→5, d07 23→26, d09 14→19. Cần đo từng file bằng `_probe_blocks_css.py` +
  `_word_para_pos.ps1` (nghi: bảng, tab stop, font thay thế).
- Bản lưu dư trang: d01 +2, d02 +2, d16 +3, d20 +4, d09 +2, d11/d17/d19 +1. d09 mất 62 đoạn khi lưu (406 → 344).
- d03: 2 sectPr trong thân gốc → 0 sau lưu (mid-document sections chưa khôi phục cho file này).
- Lưu ngày tháng trong Sheet thành chuỗi (VAT.xlsx: 642 ô) — ngoài phạm vi Writer, ghi để không quên.
