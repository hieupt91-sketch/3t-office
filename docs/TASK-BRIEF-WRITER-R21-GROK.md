# TASK BRIEF — Writer R21 (Grok): 4 file canvas thừa 1 trang so với Word (d01, d14, d16, d21) + d09 `page` 23

Worktree: `E:\VNOffice-grok-writer-r21` (nhánh `fix/writer-r21-grok`, tách từ `main` @ e34ebc0 = đã gộp W47 của R20 + S31 Sheet).
Chỉ làm trong worktree này. Claude kiểm chứng độc lập bằng Word 2016 COM rồi merge. Chỉ ghi số đã đo thật. Đọc trước
`docs/HANDOFF-WRITER-R20.md` (cách làm đã dùng, các cạm bẫy) và `docs/QUY-UOC-DOI-CHIEU.md` (W01…W47).

## Hiện trạng (ma trận mở `_writer_out_w46i`, 23 file, canvas = Word ở 19/23)
| File | Word | canvas | `page` | `wrap` | ghi chú |
|---|---:|---:|---:|---:|---|
| d01 | 19 | **20** | 21 | 9 | W24c hàng bảng tràn trang ±1 hàng (bảng 10022px); 430 run `w:kern` chưa map từng run (W45 chỉ bật khi Normal/docDefaults có kern) |
| d14 | 3 | **4** | 1 | 1 | |
| d16 | 8 | **9** | 14 | 3 | line-height 5, empty-para 2 |
| d21 | 9 | **10** | 0 | 3 | wrap 3 — chỉ 19 đoạn khớp: tài liệu chủ yếu bảng/ảnh |
| d09 | 14 | 14 | **23** (sau W47; w43 là 17) | 4 | bảng ngành nghề 64 hàng: canvas 2404px, đoạn sau bảng ở trang 4, Word trang 5 (xem HANDOFF R20 mục "Việc còn lại") |

Mục tiêu: **canvas = Word về số trang ở cả 4 file** mà không làm tăng lớp nào ở 19 file còn lại; d09 `page` giảm về ≤ 17.
Làm theo LỚP: tìm đoạn/bảng đầu tiên lệch trang (`_page_divergence.py --drift`), đo px thật (Word COM từng đoạn đã có trong
`*.word.jsonl`: top/height/page của mỗi đoạn; canvas trong `*.canvas.jsonl`), quy nguyên nhân về một quy tắc chung của Word
(chiều cao hàng bảng, khoảng cách đoạn, widow/orphan, keepNext, line-height của font thay thế…), sửa MỘT chỗ, đo lại cả 5 file
+ toàn bộ 23 file trước khi bàn giao.

## Công cụ (từ gốc worktree; luôn `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước)
```
$out = "E:\VNOffice-opencode-lan-audit\_writer_out_r21_<tag>"; New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item "E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl" $out -Force        # cache Word (không đo lại)
python scripts/layout-audit/_writer_layout_audit.py . "file test\landocx" $out d01.docx d14.docx d16.docx d21.docx d09.docx
python scripts/layout-audit/_page_divergence.py $out d14 --drift
```
Đo Word trực tiếp khi cần số mới (một tài liệu một lần, Word COM): `scripts/layout-audit/_word_para_metrics.ps1 -File <docx> -Out <jsonl>`,
`_word_oracle3.ps1 -File <docx>` (số trang). Toàn bộ 23 file: bỏ tên file khỏi lệnh trên (mất ~40 phút, chạy foreground và chờ).
Test bắt buộc trước khi commit: `node tests/run-tests.js` và `python -m unittest discover -s tests -p "test_*.py"`.

## Luật cứng (như R20)
- Không commit/copy tài liệu thật; docs chỉ ghi mã dNN. Không đổi định nghĩa lớp lỗi của bộ đo. Không đụng code Sheet
  (`adapters/libreoffice/sheet/*`, phần S30/S31/S32 và `excel_*` trong `ooxml_zip_patch.py`). Không chạy `_excel_open_test.ps1`.
- Mỗi quy tắc mới phải có: số đo Word (px/pt) chứng minh, test đơn vị khoá, dòng đề xuất cho `docs/QUY-UOC-DOI-CHIEU.md` (mã W48, W49…).
- Commit tiền tố `fix(writer): W48 …` kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-R21.md`: nguyên nhân gốc từng file (đoạn lệch đầu tiên, px Word vs canvas), chỗ sửa, bảng số trước/sau
cho 5 file + ma trận 23 file, quy ước đề xuất, việc còn lại. Nếu sau ~2 giờ chưa xong hết, bàn giao phần đã đo được.
