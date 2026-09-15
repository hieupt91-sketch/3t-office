# HANDOFF — VN Writer canvas: font tài liệu, giãn dòng kiểu Word, khoảng cách đoạn

Nhánh `fix/writer-canvas-doc-font-spacing` (agy làm bước 1, Claude đo lại và sửa bước 2–5). Mọi số đo bằng
app thật (`_probe_blocks_css.py`) và Word 2016 COM (`_word_para_pos.ps1`: vị trí dọc từng đoạn trên trang).

## Kết luận đo được (2026-09-15)

| Điều | Word 2016 (COM) | Canvas trước | Canvas sau |
|---|---|---|---|
| Font mặc định HDLD.docx | Arial 12pt (head `p.western`) | Times New Roman 14pt (NĐ30) | Arial 12pt (`--vno-doc-font-*`, agy 5cff0ef) |
| Giãn dòng `w:line=312` (1.3 lines) | 19.1pt/dòng = 1.3 × 14.65pt (Calibri Light, font run) | 20.8px = 130% × font-size | 25.07px = 1.3 × (ratio font run) |
| Hai đoạn `sa=6pt` rồi `sb=6pt` | cách 6pt = **MAX**(sa, sb) | 6pt (gộp lề CSS) | 6pt (giữ nguyên gộp lề) |
| Đoạn chỉ chứa ảnh neo (MYTIME) | 1 dòng | 2 dòng (LO xuất `<br/><br/>`) | 1 dòng |
| Bảng trong tài liệu nhập | không có lề quanh bảng, rộng theo width LO ghi | `margin: 14pt 0; width: 100%` (mẫu NĐ30) | `.vno-doc-imported table { margin:0; width:auto }` |
| HDLD trang 1 kết thúc | đoạn 29 "Date of birth" | đoạn 34 "CMND số" | đoạn 31 "Degree" (còn lệch 2 đoạn — xem "Còn lại") |
| HDLD tổng trang | 5 | 5 (tình cờ) | 5 |
| QUYETDINH | 2 | 2 | 2 |
| MYTIME canvas | 44 | 44 (tình cờ: đếm theo `page-break-before`, bỏ qua lề) | 57 (đếm thật; xem "Còn lại") |
| MYTIME lưu có sửa | 44 | 51 | 48 |
| HDLD lưu có sửa | 5, `w:line=312` | 5 | 5, `w:line=312` giữ nguyên |

## Sai lầm của brief ban đầu (đã bác bỏ bằng số đo)

Brief giả định Word **cộng dồn** space-before + space-after (37.5px/đoạn) nên agy làm "không gộp lề"
(`display:inline-block` cho từng đoạn). Đo lại HDLD bằng Word COM: đoạn 30 (y=72pt) → đoạn 32 (y=116.2pt)
= 44.2pt = 2 dòng 18.8pt + **6pt** → Word 2013+ (compatibilityMode 15, "HTML paragraph auto spacing") lấy
MAX(sa, sb), đúng bằng margin collapsing của CSS. Ngoài ra `display:inline-block` làm Chromium **mất toàn bộ
đoạn sau khi nhấn Enter** (đo `_probe_edit_inlineblock.py`: 108 khối → 6 khối). Đã bỏ hoàn toàn.
Nguyên nhân thật của "canvas ngắn hơn Word" là giãn dòng tỉ lệ (dưới đây).

## Thay đổi

1. **Giãn dòng tỉ lệ = bội số chiều cao dòng tự nhiên của font** (`writer-adapter.js`
   `_encodeProportionalLineHeights` / `_restoreProportionalLineHeightsForExport` / `_fontLineRatio`, `writer.css`):
   khi nhập, `line-height: 130%` hoặc `1.5` (không đơn vị) → `--vno-lh: 1.3`; stylesheet tính
   `line-height: calc(var(--vno-lh) * var(--vno-font-ratio))`. `--vno-font-ratio` đo bằng trình duyệt thật
   (div `font-size:100px; line-height:normal` → offsetHeight/100; Arial/Times 1.149, Calibri (Light) 1.221)
   và gắn inline cho mọi `<font face>` / `font-family` vì Word lấy chiều cao dòng theo font của **từng run**
   (HDLD: đoạn Arial nhưng chữ Calibri Light → 19.1pt). Giãn dòng "exactly" (`line-height: 0.53cm`) giữ nguyên
   và phần tử inline bên trong `line-height: inherit`. Khi xuất: `--vno-lh: 1.3` → `line-height: 130%`,
   `--vno-font-ratio` bị gỡ → LibreOffice ghi lại `w:line=312` (đã so `_docx_cmp_runs.py`). Nút giãn dòng
   1.0/1.5/2.0 (`_setLineHeight`) cũng ghi `--vno-lh`.
2. **Phân trang đo bằng vị trí thật** (`_recomputeLivePagination`, `paginateContent`): trang bắt đầu tại
   `offsetTop` khối đầu (Word bỏ space-before của đoạn đầu trang sau ngắt trang tự động; sau ngắt thủ công/
   đầu tài liệu thì giữ), kết thúc tại đáy khối cuối (space-after tràn đáy trang bị cắt). Khoảng cách giữa
   các khối lấy từ layout (đã gộp lề = Word). Trước đây chỉ cộng `offsetHeight`, bỏ qua mọi lề.
   `.vno-page-auto-gap[data-vno-soft-break="true"] + *` và `:has(+ .vno-page-auto-gap)` triệt lề cạnh dải
   ngăn trang bằng stylesheet (không đụng `style` của đoạn → giữ dấu vân tay "chưa sửa").
3. **Đoạn chỉ chứa đối tượng neo** (`_collapseFloatOnlyParagraphBreaks`): LibreOffice xuất
   `<span sd-abs-pos>…</span><br/><br/>` → gộp còn một `<br>`; Word vẽ đoạn đó 1 dòng, và khi lưu LibreOffice
   không còn ghi thêm `w:br` (MYTIME lưu 51 → 48 trang).
4. **Lớp `.vno-doc-imported`** trên `.vno-writer-page` / overlay xem trước khi có `docStyles`: tắt lề bảng
   14pt, `width:100%` của bảng và căn đều mặc định (`p:not([align]) { text-align:start }`) của mẫu NĐ30.
5. Unit test `tests/unit/writer-doc-font-spacing.test.js` (suite 153): mã hoá/giải mã giãn dòng, tỉ số font
   theo run, gộp `<br>`, lớp imported. Gate 1756/1756, `test_writer*.py` OK.

## Còn lại (đo được, chưa sửa)

- **HDLD trang 1 dư 2 đoạn** (canvas tới "Degree", Word tới "Date of birth"): bảng đầu trang canvas 209px,
  Word 273px (Word: "HỢP ĐỒNG" ở y=288pt, canvas 243pt). Cần đo chiều cao ô/đoạn trong bảng (Word: hàng
  24.8pt = dòng 18.8 + 6; canvas ~21px/hàng).
- **MYTIME 57 thay vì 44**: mỗi trang Word đầy 99% (960/975px). Canvas dư 5–65px/trang do (a) font
  `CIDFont+F7` không có trong fontTable, Word thay font khác nên đoạn "- Tùy theo nhu cầu…" Word 3 dòng, canvas
  4 dòng (+19px); (b) đoạn mục lục có tab dài: Word 38 dòng, canvas 28 (canvas không dãn tab tới lề phải);
  (c) 8/44 section có `pgMar top=1440` nhưng canvas dùng một page setup cho cả tài liệu. Việc tiếp:
  chính sách thay font thiếu như Word + tab stop trên canvas + phân trang theo section.
- Khi lưu HDLD, run `<font face="Calibri Light, sans-serif">` thành `w:rFonts="Calibri Light;sans-serif"`
  (96 run) — lỗi có sẵn trên main, cần tách generic family trước khi gửi LibreOffice.
- Tuỳ chọn tương thích `doNotUseHTMLParagraphAutoSpacing` (tài liệu Word cũ cộng dồn sa+sb) chưa xét.

## Công cụ đo (scratchpad)

`_word_para_pos.ps1 -File -Out -From -To` (Word: trang, y(pt), sb/sa, quy tắc giãn dòng từng đoạn),
`_probe_blocks_css.py`, `_probe_blocks_nogap.py <wt> <docx> <from> <to>`, `_probe_segments.py` (chiều cao
từng section canvas), `_probe_edit_inlineblock.py` (Enter/gõ chữ có phá DOM không), `_docx_cmp_runs.py a b`
(so đếm `w:spacing`/`w:sz`/`w:rFonts`), `_lo_html_dbl_br.py`, `_docx_fonts.py`, `_docx_around_sect.py`.
