# Brief W26 (agy, sau W25) — Đoạn rỗng cao theo cỡ DẤU ĐOẠN (`w:pPr/w:rPr/w:sz`), không theo cỡ mặc định (553 đoạn / 23 file)

Đọc: `docs/HANDOFF-WRITER-R15.md` (opencode đo, Word COM), `docs/QUY-UOC-DOI-CHIEU.md` W12a/W12e (ánh xạ THỨ TỰ
`w:p` ↔ `<p>`/`<hN>`; `_ooxmlBodyParagraphSource`, `_htmlParagraphSkipRanges`), W23c, W25 (vừa làm).

## Số đo (R15 + Word COM)

Word: đoạn rỗng cao = cỡ chữ của dấu đoạn (`pPr/rPr/sz` → style chain → docDefaults) × giãn dòng của đoạn. LibreOffice
HTML xuất đoạn rỗng thành `<p style="…"><br></p>` KHÔNG mang cỡ dấu đoạn → canvas dùng cỡ mặc định tài liệu.

| File | Đoạn rỗng thân có cỡ ≠ mặc định | Ví dụ Word | Canvas |
|---|---|---|---|
| d07 | 125 / 125 | dấu đoạn 13pt, pitch 22,5–23,25pt = 30–31px | h 20px (11pt mặc định) → −10px/đoạn → >1 trang trôi trên 23 trang |
| d01 | 149 / 149 | 13pt | canvas gộp 3 khối rỗng? (R15: canvas chỉ 3 khối rỗng — kiểm tra vì sao: W4 `<br><br>` gộp? đoạn rỗng trong bảng?) |
| d09 | 95 / 95 | 13pt, pitch 17,25pt = 23px | h 21px |
| d15 | 76 / 76 | 13–15pt, pitch 15–17,25pt | h 24px (14pt mặc định, lớn hơn Word) |
| d21 | 19 | 11,5pt | (R15 ghi h 630px — đoạn rỗng chứa ảnh neo, không phải rỗng thật: loại trừ đoạn có `w:drawing`/`w:pict`) |

Header/footer d15: đoạn rỗng có `pPr/rPr/sz=20` (10pt) trong footer1.xml; adapter chưa nhận header/footer XML.

## Việc

**W26a — thân:** trong `_normalizeImportedHtml` (sau W12e, dùng cùng ánh xạ thứ tự `w:p` ↔ `<p>/<hN>`), với `w:p` KHÔNG
có `w:t` và không có `w:drawing`/`w:pict`/`w:tab`/`w:br` (rỗng thật): cỡ dấu đoạn = `pPr/rPr/sz` → style chain
(`pStyle` → basedOn) → docDefaults `w:sz`; nếu khác cỡ mà `<p>` sẽ nhận (không có `font-size` inline / class) → thêm
`font-size: <sz/2>pt` vào `<p>` (giữ `<br>`). Không đụng đoạn có chữ. Đo: d07/d09/d01/d15 `drift:empty-para` và
`page` giảm; d21 không tăng.

**W26b — header/footer:** `main.py` (đường mở DOCX, chỗ trả `ooxmlDocumentXml/StylesXml/NumberingXml`) trả thêm
`ooxmlHeaderXml`/`ooxmlFooterXml` (nối các part `word/header*.xml`, `word/footer*.xml` theo thứ tự rels của sectPr
đầu: default trước, first/even sau); `_normalizeImportedHeaderFooterHtml(html, zone, …)` nhận XML của zone và áp cùng quy
tắc W26a cho đoạn rỗng của zone (ánh xạ thứ tự trong zone). Đo: d15 footer canvas 111px → ≈ Word 98,5px; d09 header/
footer không đổi.

Unit test cho W26a (JS) và W26b (JS + Python `tests/test_writer_*.py` cho main.py), quy ước W26a/b vào QUY-UOC, commit
riêng. Gate như W25. Ma trận 24 file trước/sau: `drift:empty-para`, `page` giảm; không lớp nào tăng. Không commit
`file test`/`_out`, không tên tài liệu thật, không bịa số.
