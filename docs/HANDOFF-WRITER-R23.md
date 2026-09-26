# Handoff Writer R23 — d01 canvas 19 = Word, d16 `page` 0, d09 `page` 8

Worktree `E:\VNOffice-grok-writer-r23`, nhánh `fix/writer-r23-grok`. Canvas đo bằng `scripts/layout-audit` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Word COM lấy từ cache `_writer_out_w12a\*.word.jsonl` (không đo lại Word). Ma trận sau sửa: `_writer_out_r23_final`. Mọi số dưới đây là số đã đo. d10 Word COM vẫn báo file hỏng.

Thử nghiệm `font-size: 13pt → 17px` (hộp dòng cũng thấp): `_writer_out_r23_w56` — d01 canvas 19 = Word nhưng d07 canvas 23 → **22**. Bỏ. Cách giữ 13pt + letter-spacing: `_writer_out_r23_w56b` rồi `_writer_out_r23_final`.

## Nguyên nhân đã khóa bằng số đo

### d01 — canvas 20 → 19 = Word

Word COM `Sections(1).PageSetup` trên chính d01:

| | pt | twips | px @96dpi |
|---|---:|---:|---:|
| PageWidth | 595,35 | 11907 | 793,8 |
| LeftMargin / RightMargin | 56,7 | 1134 | 75,6 |
| Gutter | 0 | 0 | 0 |
| TextColumns.Count | 1 | | |
| TextColumns.Width | 481,95 | 9639 | **642,6** |

`w:cols` chỉ có `w:space="720"` (một cột). `mirrorMargins` không có. `w:kern` không có trên sáu đoạn wrap. Font.Spacing=0, Kerning=0, Scaling=100. Cột chữ Word **đúng** `pgSz − left − right` = 9639 twips. Không phải gutter / cột / lề ẩn.

Sáu đoạn wrap (TNR 13pt, `w:w`=100, không `w:ind`, `jc=both`). Dòng đầu Word giữ được, ví dụ «( Nội dung và hình thức… Hội đồng thành »:

| Cách đo | px | vừa cột 642,6? |
|---|---:|---|
| GDI `CreateFontW(-17)` | 621 | có; +«viên» = 649 không |
| Chromium `13pt` (=17,333px) | **650** | không |
| Chromium `17px` | **638** | có |

Số dòng cùng đoạn, cột 642,6px: Chromium 13pt = 3/4/3/3/8/4; Chromium 17px = Word **2/3/2/2/7/3**.

Word 2016 GDI ở 96dpi: `CreateFontW(-round(13×96/72))` = −17. CSS `13pt` = 17,333px nên cùng chuỗi TNR rộng hơn ~2%.

Đổi hẳn `font-size` sang 17px khớp wrap nhưng **hạ hộp dòng** — đo `_writer_out_r23_w56`: d07 canvas 23 → 22. Giữ `font-size: 13pt`, gắn `--vno-gdi-advance: 17/17,333` rồi `letter-spacing` như W46. Chỉ Times New Roman (Arial 13pt d07 «Tiền thưởng…» Word 2 dòng; scale GDI thành 1 dòng).

Sau W56: wrap 6 → **0**, canvas **19 = Word 19**. Lệch đầu vẫn «Địa chỉ liên lạc…» canvas trang 6 / Word trang 7 (bảng ngành nghề ngắn hơn Word — có từ R21). Vì wrap không còn bù 1 trang ở cuối, lớp `page` 20 → 32 (mỗi đoạn sau bảng lệch đúng 1 trang).

### d16 — `page` 3 → 0

Ba đoạn wrap TNR 13pt («During warranty time…» 4→3 dòng, và hai đoạn khác) hết. `page` **3 → 0**. Canvas 8 = Word 8. Còn spacing 1, drift:empty-para 1.

### d09 — `page` 17 → 8

`page` **17 → 8** (dưới ngưỡng 17). spacing 6 → 5. wrap 3 → 5: hai đoạn mới canvas **ít** dòng hơn Word (9 vs 10, 2 vs 3) vì scale GDI hơi chặt trên đoạn có thụt; ba đoạn ROA/ROS/ROE vẫn canvas nhiều dòng hơn Word như R22. Canvas 14 = Word 14.

### d07 — `page` 27, canvas 23 = Word 23

Không giảm `page`. Wrap 0 (Arial 13pt không scale). Lệch đầu vẫn đoạn 6 dòng «- Trong thời gian hiệu lực hợp đồng…» canvas trang 9 / Word trang 8 (cùng số dòng, hộp dòng canvas cao hơn).

## Chỗ sửa

- `adapters/libreoffice/writer/writer-adapter.js` — W56 `_applyGdiDeviceFontPixels`, `_gdiAdvanceScaleForPt`, `_applyCharacterScale` nhân `--vno-gdi-advance` (chỉ TNR), xuất `_stripCharacterScaleForExport`.
- `tests/unit/writer-doc-font-spacing.test.js` — khóa W56.
- `docs/QUY-UOC-DOI-CHIEU.md` — W56.

Không đụng Sheet, không đổi định nghĩa lớp lỗi của bộ đo, không commit tài liệu.

## Số trước / sau

Trước = ma trận R22 (`_writer_out_r22_final2`). Sau = `_writer_out_r23_final`.

| File | Word | canvas trước → sau | `page` trước → sau | lớp khác đổi |
|---|---:|---|---|---|
| d01 | 19 | 20 → **19** | 20 → **32** | wrap 6→0; drift:unknown 7→1; line-height 1 |
| d16 | 8 | 8 → **8** | 3 → **0** | wrap 3→0; drift:unknown 3→0; spacing 1, drift:empty-para 1 |
| d09 | 14 | 14 → **14** | 17 → **8** | wrap 3→5; spacing 6→5; drift:unknown 9→10; line-height 1, empty-para 1, table 1 |
| d07 | 23 | 23 → **23** | 27 → **27** | wrap 0 |
| d15 | 10 | 10 → **10** | 0 → **1** | wrap 1→3; drift:unknown 1→3; font-name 1 |

Ma trận 23 file. Số trang canvas của mọi file đã khớp Word ở R22 vẫn khớp. d01 là file duy nhất lệch canvas ở R22 thì khớp. Không file nào tăng số trang canvas.

| file | Word | canvas | page | wrap | line-height | drift:unknown | khác |
|---|---:|---:|---:|---:|---:|---:|---|
| d01 | 19 | 19 | 32 | 0 | 1 | 1 | |
| d02 | 11 | 11 | 3 | 2 | 2 | 3 | font-size 1 |
| d03 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d04 | 5 | 5 | 0 | 0 | 0 | 0 | |
| d05 | 2 | 2 | 0 | 2 | 2 | 1 | |
| d06 | 3 | 3 | 1 | 1 | 0 | 0 | drift:float 3 |
| d07 | 23 | 23 | 27 | 0 | 0 | 0 | |
| d08 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d09 | 14 | 14 | 8 | 5 | 1 | 10 | spacing 5, drift:empty-para 1, drift:table 1 |
| d10 | — | — | Word COM: file hỏng | | | | |
| d11 | 5 | 5 | 4 | 1 | 6 | 1 | drift:empty-para 1 |
| d12 | 3 | 3 | 0 | 1 | 0 | 0 | drift:empty-para 1 |
| d13 | 10 | 10 | 14 | 1 | 2 | 2 | drift:table 4 |
| d14 | 3 | 3 | 0 | 0 | 0 | 0 | |
| d15 | 10 | 10 | 1 | 3 | 0 | 3 | font-name 1 |
| d16 | 8 | 8 | 0 | 0 | 0 | 0 | spacing 1, drift:empty-para 1 |
| d17 | 5 | 5 | 2 | 1 | 0 | 1 | |
| d18 | 2 | 2 | 0 | 0 | 0 | 0 | |
| d19 | 2 | 2 | 0 | 1 | 3 | 2 | drift:empty-para 1 |
| d20 | 3 | 3 | 1 | 0 | 0 | 0 | |
| d21 | 9 | 9 | 0 | 3 | 0 | 0 | |
| d22 | 5 | 5 | 2 | 1 | 0 | 1 | |
| d23 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d24 | 16 | 16 | 0 | 0 | 0 | 0 | matched 0 |

## Quy ước

Đã ghi `docs/QUY-UOC-DOI-CHIEU.md`: W56.

## Việc còn lại

- d01 lớp `page` 32: bảng ngành nghề vẫn ngắn hơn Word; «Địa chỉ liên lạc…» canvas trang 6 / Word trang 7. Tổng trang đã khớp.
- d07 `page` 27. Hộp dòng 12pt/TNR canvas cao hơn Word (lh 23,9 vs ~20,8px) đẩy đoạn cuối trang.
- d09 wrap 5 (hai đoạn canvas ít dòng hơn Word), spacing 5, drift:unknown 10.
- d15 wrap 1→3, `page` 0→1 (TNR 13pt scale GDI làm canvas ít dòng hơn Word trên đoạn đã khớp). Canvas vẫn 10 = Word 10.
- d10 Word COM: file hỏng.

## Test

- `node tests/run-tests.js` — **1834/1834 PASS** (R22 là 1833; thêm 1 test W56).
- `python -m unittest discover -s tests -p "test_*.py"` — **346 tests OK**. Luồng đọc stdout vẫn có `UnicodeDecodeError` (byte 0xe1) như R22; exit code 0, không test nào fail.
