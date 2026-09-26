# TASK BRIEF — Writer R24 (Grok): giảm lớp `page`/`wrap`/`drift` nội bộ còn lại (canvas đã = Word ở mọi file hợp lệ)

Worktree: `E:\VNOffice-grok-writer-r24` (nhánh `fix/writer-r24-grok`, tách từ `main` @ 209a0fa = đã gộp W47–W56 + S29 + UI layout-tab).
Chỉ làm trong worktree này. Claude kiểm chứng độc lập bằng Word 2016 COM rồi merge. Chỉ ghi số đã đo thật.
Đọc trước `docs/HANDOFF-WRITER-R23.md` (mục "Việc còn lại" — điểm bắt đầu chính xác) và `docs/QUY-UOC-DOI-CHIEU.md` (W01…W56).

## Bối cảnh quan trọng
Từ R23: **22/22 file .docx hợp lệ trong mẫu (trừ d10 hỏng gốc) đã có canvas = đúng số trang Word 2016 thật.** Đây là lớp lớn nhất và đã xong. Nhiệm vụ vòng này là các lớp NHỎ HƠN còn sót — không được làm tăng số trang canvas ở bất kỳ file nào (đó là hồi quy nghiêm trọng nhất có thể xảy ra, luôn kiểm tra lại tất cả 23 file sau mỗi thay đổi).

## Hiện trạng (ma trận `_writer_out_r23_final`)
| File | Lớp còn lại | Chi tiết R23 |
|---|---|---|
| d01 | `page` 32 | Bảng ngành nghề (64 hàng) canvas vẫn ngắn hơn Word (từ R21); «Địa chỉ liên lạc…» canvas trang 6 / Word trang 7 |
| d07 | `page` 27 | Hộp dòng Arial/TNR 12pt canvas cao hơn Word (đo lh 23,9px vs Word ~20,8px) — đoạn 6 dòng «Trong thời gian hiệu lực…» đẩy sang trang sau |
| d09 | wrap 5, spacing 5, drift:unknown 10 | Hai đoạn canvas ÍT dòng hơn Word (ngược hướng thường gặp — nghi ngờ scale GDI W56 hơi chặt trên đoạn có thụt lề); ba đoạn ROA/ROS/ROE canvas nhiều dòng hơn Word (từ R22) |
| d13 | drift:table 4 | Chưa phân tích trong các vòng trước |
| d15 | wrap 3, `page` 1 | Đoạn TNR 13pt scale GDI (W56) làm canvas ÍT dòng hơn Word trên đoạn đã khớp — có thể là tác dụng phụ của W56, kiểm tra kỹ trước khi sửa thêm |
| d17 | `page` 2 | Chưa phân tích |

## Cách làm (giữ nguyên phương pháp đã dùng R20–R23)
Đoạn/dòng lệch đầu tiên → đo px thật Word (COM) vs canvas → quy nguyên nhân về MỘT quy tắc chung của Word → sửa một chỗ → đo lại TOÀN BỘ 23 file để chắc không có file nào từ canvas=Word chuyển thành lệch.

Gợi ý ưu tiên:
1. **d09 wrap 5** trước — nghi ngờ liên quan trực tiếp W56 (GDI advance letter-spacing chỉ áp cho TNR, có thể áp sai hướng trên đoạn có `w:ind`/thụt lề). Đây có thể là cách sửa rẻ nhất vì đã có nguyên nhân nghi ngờ cụ thể.
2. **d07 hộp dòng Arial/TNR 12pt cao hơn Word** — đo `line spacing` thật của Word ở đúng font/cỡ này (Word COM `Font.Name`, `ParagraphFormat.LineSpacingRule`, đo `Range.Information(wdVerticalPositionRelativeToTextBoundary)` trước/sau đoạn) so với `line-height` CSS hiện tại.
3. d01, d13, d17 nếu còn thời gian.

## Công cụ (từ gốc worktree; `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước khi chạy app/soffice/python)
```
$out = "E:\VNOffice-opencode-lan-audit\_writer_out_r24_<tag>"; New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item "E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl" $out -Force
python scripts/layout-audit/_writer_layout_audit.py . "file test\landocx" $out
python scripts/layout-audit/_page_divergence.py $out d09 --drift
```
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground).

## Luật cứng
- **TUYỆT ĐỐI KHÔNG** làm tăng canvas ở bất kỳ file nào trong 22 file hiện đã khớp Word — đo lại toàn bộ 23 file sau MỖI thay đổi nhỏ, không chỉ file đang sửa.
- Không commit/copy tài liệu thật; docs chỉ mã dNN. Không đổi định nghĩa lớp lỗi của bộ đo. Không đụng code Sheet.
- Không chạy `_excel_open_test.ps1`/`_batch_audit.py`. Mỗi quy tắc mới: số đo Word chứng minh + test đơn vị + dòng quy ước mới (W57, W58…). Commit `fix(writer): W57 …` kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-R24.md`: nguyên nhân từng file, chỗ sửa, bảng số trước/sau + ma trận 23 file đầy đủ (xác nhận không file nào tăng canvas), quy ước đề xuất, việc còn lại.
