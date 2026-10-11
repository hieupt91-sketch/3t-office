# Brief W10 — Lớp `wrap` của Writer: đoạn 1–2 dòng ở Word bị canvas gãy thành 4–10 dòng (86 đoạn / 15 file)

## Số đo (baseline 19/9/2026 trên main af92908, `_out/*.pairs.jsonl` của bộ đo `_writer_layout_audit.py`)

Không phải lệch nhỏ 1 dòng: phần lớn là đoạn NGẮN (< 80 ký tự) Word xếp 1–2 dòng, canvas xếp 4–10 dòng — tức bề
rộng cột chữ trên canvas chỉ bằng 1/4–1/7 của Word. Mẫu lặp (font Word / dòng Word → dòng canvas / cao canvas px):

| File | Số đoạn | Mẫu | Ghi chú |
|---|---|---|---|
| d09 | 17 | Times New Roman 13: 1L→3L (h 95), 2L→7L (h 226), 5L→10L, 7L→33L (h 835) | đoạn kiểu "Nhãn: giá trị" (báo cáo công ty) — nghi nằm trong BẢNG 2 cột, cột giá trị trên canvas quá hẹp |
| d13 | 12 | Arial 10: 1L→4…10L (18–19 px/dòng) | các gạch đầu dòng (list) — nghi thụt lề `w:ind`/list `w:tab` bị đổi đơn vị sai (twips → px/cm) hoặc bảng |
| d15 | 20 | Times New Roman 13: 3L→2L | chiều ngược lại: canvas RỘNG hơn Word (Word 3 dòng, canvas 2) |
| d01 9, d07 7, d11 4, d19 4, d05 3, d16 3 | | | |

Word `sb/sa` khớp, cỡ chữ canvas = Word × 4/3 (đúng), nên lệch chỉ do BỀ RỘNG cột chữ.

## Việc — gom lớp trước, sửa sau

1. Bổ sung bộ đo: `_word_para_metrics.ps1` thêm `Range.Information(wdHorizontalPositionRelativeToPage)` /
   `wdHorizontalPositionRelativeToTextBoundary`, `ParagraphFormat.LeftIndent/RightIndent/FirstLineIndent`, và nếu
   đoạn trong bảng: `Range.Cells(1).Width`; `_canvas_para_metrics.py` thêm `getBoundingClientRect().left/width` của
   `<p>` và của ô bảng cha (`closest('td')`). `_writer_layout_audit.py` ghi thêm `width_word` / `width_canvas` vào pairs.
2. Chạy trên d09 d13 d15 d01 d07: bảng (bề rộng Word, bề rộng canvas, tỉ số) cho các cặp `wrap`. Gom theo nguyên
   nhân: (a) ô bảng hẹp — `w:gridCol`/`w:tcW` (dxa, pct, auto) đổi sai; (b) thụt lề list/`w:ind` sai đơn vị; (c) cột
   chữ rộng hơn Word (d15) — lề trang/`w:pgMar` hoặc `w:ind` bị bỏ.
3. Mỗi nguyên nhân = MỘT quy ước W10a/b/c + sửa một chỗ trong `adapters/libreoffice/writer/writer-adapter.js`
   (hoặc `apps/writer/writer.css`) + unit test (`tests/unit/writer-*.test.js`). Không hằng số không có số đo.
4. Đo lại cả 24 file: `wrap` 86 → ≤ 20, không lớp nào tăng, số trang canvas không xa Word hơn. Dán ma trận trước/sau.

## Ràng buộc

- Mẫu docx ở `file test/landocx` (ngoài git; không ghi tên tài liệu thật, chỉ d01..d24).
- Bộ đo cần Word 2016 COM + app thật (profile soffice Writer): chạy tuần tự, KHÔNG song song với tiến trình Writer khác.
- Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_writer*.py"`.
- Commit `git commit -F` tiếng Việt không dấu; báo cáo phải có bảng số đo thật, không có thì không nhận.
