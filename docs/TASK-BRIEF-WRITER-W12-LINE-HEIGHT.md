# Brief W12 (v2, 19/9/2026 tối) — `line-height` 71 đoạn + `spacing` 55 đoạn của Writer, đã gom lớp bằng số đo

## Bộ đo đã sửa (main, `scripts/layout-audit/_writer_layout_audit.py`)

- Word COM `NoSpaceBetweenParagraphsOfSameStyle` trả False dù style có `<w:contextualSpacing/>` → đọc thẳng OOXML
  (`contextual_spacing_from_docx`). 43 cặp d09 trước bị gán nhầm `line-height` nay thành `spacing`.
- Chiều cao đoạn canvas = `h` của khối (không phải pitch − lề, vì lề nằm ở `li`/`p` con trong `ol`).
- `pairs.jsonl` có thêm `w_para_px`, `c_para_px`, `w_line_px`, `c_line_px`. Gom lớp: `python … _lh_class.py _out`
  (xem `docs/QUY-UOC-DOI-CHIEU.md` mục bộ đo). Cache `_out/*.word.jsonl|canvas.jsonl` dùng lại được; chỉ xoá cache
  của file cần đo lại sau khi sửa.

## Bốn lớp đã đo (baseline main af92908 + bộ đo mới, 24 file)

| Lớp | Đoạn | Số đo | Nguyên nhân (đã đọc OOXML/HTML) | Quy ước đề xuất |
|---|---|---|---|---|
| W12a `spacing` — contextualSpacing | 55 (d09 43, d11, d07…) | d09 List Paragraph: Word pitch 23 px = đúng 1 dòng (space-after 10pt bị bỏ), canvas pitch 37 px | Style `ListParagraph` có `<w:contextualSpacing/>` (kế thừa qua basedOn hoặc trong pPr): Word bỏ MAX(sa, sb) giữa hai đoạn KẾ TIẾP cùng style | Khi nhập: đoạn có contextualSpacing (pPr hoặc style chain) và đoạn kế cùng `pStyle` → lề giữa hai đoạn = 0 (`margin-bottom:0` cho đoạn trước, `margin-top:0` cho đoạn sau, hoặc class `vno-ctx`+CSS sibling). Cần ánh xạ `w:p` ↔ `<p>` HTML theo thứ tự/chữ như `_applyOoxmlTableParagraphSpacing` (W11) đã làm |
| W12b `line-height` — font run bị thay bằng font theme | 23 (d07 16+4+3, d02, d16) | d07 Word TNR 12 ×1.3 → 24 px/dòng; canvas 25–26 px với font **Calibri Light** 16 px (`canvas.font`), ratio 1.221 thay vì TNR 1.149 | Run có `w:rFonts ascii=TNR` nhưng canvas vẽ font theme (W9 `p.western` mặc định) → run mất font trong HTML LibreOffice hoặc `_normalizeImportedFontMetrics` lấy font `<p>` thay vì run | Đo HTML LibreOffice của d07 đoạn "Cộng Hoà Xã Hội…" xem `<font face>` có không; nếu LO không ghi (font trùng style đoạn?) thì lấy từ OOXML `pPr/rPr` + run `rPr` (đã có `ooxmlStylesXml`, document.xml qua `_collapseFloatOnlyParagraphBreaks(html, ooxml)`) |
| W12c `line-height` — đoạn neo ảnh cao 0–1 px | 15 (d06) | Word Calibri 12 atLeast: 19–20 px/dòng; canvas `h` 0–1 px | W4 gộp `<br><br>` → đoạn chỉ chứa `<img>` float không còn dòng nào → cao 0; Word vẫn giữ 1 dòng (đoạn có dấu đoạn) | Đoạn chỉ chứa đối tượng neo giữ đúng 1 dòng: `min-height: 1lh` (=`--vno-lh × ratio × font-size`) hoặc giữ một `<br>` — đo lại d06 (15 đoạn) và MYTIME (W4) không hồi quy |
| W12d `line-height` — strut `<p>` cao hơn run | 24 (d11 TNR 8) | Word 12–13 px/dòng (8pt TNR × 1.149 = 12.3 ✓); canvas 18 px = strut 12pt của `<p>` | W8 (`_normalizeImportedFontMetrics`) chưa phủ trường hợp này: kiểm tra `<p class=… style="font-size:12pt">` với `<font size=1>`/`<span style="font-size:8pt">` con — có thể run nằm trong `<b>`/`<span>` lồng hoặc `font-size` bằng `%`/`px` | Mở rộng W8: strut = cỡ NHỎ NHẤT/cỡ run đầu của mọi run text trong đoạn, kể cả lồng nhau; test suite 153 |

## Yêu cầu

1. Làm theo thứ tự a → d; mỗi lớp: sửa MỘT chỗ trong `adapters/libreoffice/writer/writer-adapter.js` (+ CSS nếu cần),
   unit test trong `tests/unit/writer-doc-font-spacing.test.js` (suite 153) hoặc file mới đăng ký trong
   `tests/run-tests.js`, ghi quy ước W12a–d vào `docs/QUY-UOC-DOI-CHIEU.md` (chỉ số đo).
2. Sau mỗi lớp: xoá `_out/<file>.canvas.jsonl` của các file liên quan, chạy
   `python scripts/layout-audit/_writer_layout_audit.py . "file test/landocx" _out` (24 file; Word cache giữ) và dán
   dòng tổng `kind` trước/sau. Mục tiêu: `spacing` 55 → ≤ 10, `line-height` 71 → ≤ 25, không lớp nào tăng, cột `page`
   không xấu đi.
3. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js` (1779/1779), `python -m unittest discover -s tests -p "test_writer*.py"`.
4. Mẫu ở `file test/landocx` (ngoài git, không ghi tên tài liệu thật). Bộ đo dùng Word COM + app (profile soffice
   Writer): chạy tuần tự. Commit `git commit -F` tiếng Việt không dấu, kèm bảng số đo thật — không có số thì không nhận.
   KHÔNG đổi mặc định `--vno-doc-line-height` toàn cục nếu không có số đo chứng minh (bản opencode 8327706 đổi 1.4 → 1.0
   mà ma trận trước/sau y hệt nhau → đã loại).
