# TASK BRIEF — Writer R22 (Grok): d01/d16/d21 còn thừa 1 trang, d09 `page` 24, d07 `page` 32

Worktree: `E:\VNOffice-grok-writer-r22` (nhánh `fix/writer-r22-grok`, tách từ `main` @ 7943de1 = đã gộp W47–W51 của R20/R21).
Chỉ làm trong worktree này. Claude kiểm chứng độc lập bằng Word COM rồi merge. Chỉ ghi số đã đo thật.
Đọc trước `docs/HANDOFF-WRITER-R21.md` (mục "Việc còn lại" là điểm bắt đầu — đã có tọa độ đoạn lệch đầu tiên của từng file),
`docs/HANDOFF-WRITER-R20.md`, `docs/QUY-UOC-DOI-CHIEU.md` (W01…W51).

## Hiện trạng (ma trận `_writer_out_r21_all`, canvas = Word 20/23)
| File | Word | canvas | `page` | điểm lệch đầu (R21) |
|---|---:|---:|---:|---|
| d01 | 19 | **20** | 20 | «Địa chỉ liên lạc…» Word trang 7 y=57 (2 dòng 13pt), canvas trang 6 top=6201; chữ ký CENTER h=538 sang trang 20 (Word trang 19). `wrap` 6 |
| d16 | 8 | **9** | 12 | trang 3 khớp đỉnh tới «4.3…»; đoạn 3 dòng kế h=65 không vừa 62,7px còn lại (Word y=673, đáy 720pt) — Word cho vừa: xem widow/orphan, khoảng cách đoạn cuối trang, làm tròn dòng |
| d21 | 9 | **10** | 0 | ảnh cuối 429px (extent 428,7) + lề đoạn ~2px vượt usable 864 — Word vừa. Xem cách Word đặt ảnh inline trong đoạn (chiều cao dòng = ảnh, không cộng lề đoạn?) |
| d09 | 14 | 14 | **24** | bảng ngành nghề 64 hàng canvas 2404px; đoạn «QUÁ TRÌNH HÌNH THÀNH…» canvas trang 4 / Word trang 5 (y=211). W44b cộng 1px viền mỗi hàng — đo lại chiều cao HÀNG thật của Word (`_word_row_pitch`/COM `Rows.Height`, `Range.Information`) so với canvas theo từng hàng |
| d07 | 23 | 23 | 32 | chưa phân tích |

Mục tiêu: canvas = Word ở d01/d16/d21 (23/23 trừ d10 hỏng) và `page` d09 ≤ 17, d07 giảm, không tăng lớp nào ở file khác.
Cách làm theo LỚP như R20/R21: đoạn lệch đầu tiên → đo px Word vs canvas → quy về quy tắc chung của Word → sửa một chỗ → đo lại 23 file.

## Công cụ (từ gốc worktree; `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước)
```
$out = "E:\VNOffice-opencode-lan-audit\_writer_out_r22_<tag>"; New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item "E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl" $out -Force
python scripts/layout-audit/_writer_layout_audit.py . "file test\landocx" $out d01.docx d16.docx d21.docx d09.docx d07.docx
python scripts/layout-audit/_page_divergence.py $out d16 --drift
```
Word COM đo thêm: `_word_para_metrics.ps1`, `_word_oracle3.ps1`, và các probe hàng bảng trong `scripts/layout-audit/` (`_word_row_pitch`, `_word_table_pages`
nếu có; không có thì viết probe COM mới trong `scripts/layout-audit/word-probes/` và commit).
Test bắt buộc: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground; không chạy chồng với phiên đo webview).

## Luật cứng (như R20/R21)
Không commit/copy tài liệu thật; docs chỉ mã dNN. Không đổi định nghĩa lớp lỗi của bộ đo. Không đụng code Sheet. Không chạy `_excel_open_test.ps1`.
Mỗi quy tắc mới: số đo Word chứng minh + test đơn vị + dòng quy ước (W52, W53…). Commit `fix(writer): W52 …` kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-R22.md` như R21 (nguyên nhân từng file, chỗ sửa, bảng trước/sau 5 file + ma trận 23 file, quy ước, việc còn lại).
