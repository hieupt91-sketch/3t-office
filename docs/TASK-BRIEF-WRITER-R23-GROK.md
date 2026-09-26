# TASK BRIEF — Writer R23 (Grok): d01 cột chữ hẹp (wrap 6), d09 spacing/drift, d16 page 3, d07 page 27

Worktree: `E:\VNOffice-grok-writer-r23` (nhánh `fix/writer-r23-grok`, tách từ `main` @ 8ed4e29 = đã gộp W47–W55 + S29 perf Sheet).
Chỉ làm trong worktree này. Claude kiểm chứng độc lập bằng Word 2016 COM rồi merge. Chỉ ghi số đã đo thật.
Đọc trước `docs/HANDOFF-WRITER-R22.md` (mục "Việc còn lại" — điểm bắt đầu chính xác cho từng file) và `docs/QUY-UOC-DOI-CHIEU.md` (W01…W55).

## Hiện trạng (ma trận `_writer_out_r22_final2`, canvas = Word 21/23)
| File | Word | canvas | `page` | Ghi chú R22 |
|---|---:|---:|---:|---|
| d01 | 19 | **20** | 20 | wrap 6: 6 đoạn TNR 13pt (không `w:ind`, `w:w`=100) tự nhiên gãy thêm 1 dòng. Một dòng đo được: GDI/Chromium 646px, cột chữ canvas 642,8px, Word sectPr 9639 twips = 642,6px — TẤT CẢ đều ~642-646px nhưng Word vẫn giữ 1 dòng còn canvas gãy 2. Nghi ngờ: bề rộng thật của Word không tính đúng bằng `sectPr`/lề đơn giản (kiểm tra `w:cols`, thụt lề ẩn, hay Word đo chữ khác GDI ở đúng ppem này) |
| d09 | 14 | 14 | **17** (đúng ngưỡng ≤17, còn dư địa) | spacing 6, drift:unknown 9, drift:empty-para 1, wrap 3, drift:table 1 — lệch đầu dời tới «Phòng dự án…» canvas trang 10 / Word trang 9 |
| d16 | 8 | 8 | **3** | «During warranty time…» canvas 4 dòng, Word 3 dòng — lệch ngắt dòng, không phải lệch trang nữa |
| d07 | 23 | 23 | **27** | canvas = Word đã đúng; `page` là lớp nội bộ còn lại (không ảnh hưởng số trang) — ưu tiên thấp hơn 3 file trên |

Mục tiêu: canvas = Word ở d01 (còn file duy nhất lệch canvas trong 23 file, trừ d10 hỏng). Giảm `page`/`wrap` d09, d16, d07 theo lớp, không tăng ở 22 file còn lại.

## Cách làm
Theo đúng phương pháp R20–R22 (đọc `docs/HANDOFF-WRITER-R20.md` nếu chưa quen công cụ): đoạn/dòng lệch đầu tiên → đo px thật của Word (COM) vs canvas → quy nguyên nhân về MỘT quy tắc chung của Word → sửa một chỗ → đo lại toàn bộ 23 file.

Gợi ý cho d01 (khó nhất, đã thử ở R22 không ra): so `w:pgSz`/`w:pgMar`/`w:cols` thật của d01 (không phải giả định sectPr đơn lề-trái-phải); kiểm tra Word có `w:kern` bật auto mà `docStyles.kerning` (W45) chưa bắt đúng cho đúng đoạn này không; hoặc `mirrorMargins`/`gutter` làm cột chữ thực tế khác phép tính đơn giản. Đo bằng Word COM `Sections(1).PageSetup` (TextColumns, PageWidth, LeftMargin, RightMargin, Gutter) trên chính d01, đừng suy diễn từ số đã có.

## Công cụ (từ gốc worktree; `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước khi chạy app/soffice/python)
```
$out = "E:\VNOffice-opencode-lan-audit\_writer_out_r23_<tag>"; New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item "E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl" $out -Force
python scripts/layout-audit/_writer_layout_audit.py . "file test\landocx" $out d01.docx d09.docx d16.docx d07.docx
python scripts/layout-audit/_page_divergence.py $out d01 --drift
```
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground, không chạy chồng phiên đo webview).

## Luật cứng
Không commit/copy tài liệu thật; docs chỉ mã dNN. Không đổi định nghĩa lớp lỗi của bộ đo (`_writer_layout_audit.py`, `_page_divergence.py`). Không đụng code Sheet (`adapters/libreoffice/sheet/*`, phần S8–S32 trong `ooxml_zip_patch.py`) — Codex đang làm perf Sheet song song trong worktree khác. Không chạy `_excel_open_test.ps1`/`_batch_audit.py`. Mỗi quy tắc mới: số đo Word chứng minh + test đơn vị + dòng quy ước mới (W56, W57…) trong `docs/QUY-UOC-DOI-CHIEU.md`. Commit `fix(writer): W56 …` kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-R23.md`: nguyên nhân từng file (đoạn/px), chỗ sửa, bảng số trước/sau (canvas + page cho 4 file + ma trận 23 file), quy ước đề xuất, việc còn lại. Nếu sau ~2 giờ chưa xong hết, bàn giao phần đã đo được kèm phân tích — vẫn là kết quả có ích.
