# Handoff Writer R21 — canvas thừa 1 trang (d01, d14, d16, d21) và d09 `page`

Worktree `E:\VNOffice-grok-writer-r21`, nhánh `fix/writer-r21-grok`. Đo bằng `scripts/layout-audit` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Cache Word COM lấy từ `_writer_out_w12a\*.word.jsonl` (không đo lại Word). Canvas đo lại ở `_writer_out_r21_all`. Mọi số dưới đây là số đã đo. d10 Word COM vẫn báo file hỏng (như w46i).

## Nguyên nhân đã khóa bằng số đo

### d14 — canvas 4 → 3 = Word (xong)

Đoạn lệch đầu tiên (và duy nhất), `_page_divergence.py --drift` trên `_writer_out_w46i`: cặp 48/49, «Mở nắp sau hộp pin…» Word trang 3 y=622pt (3 dòng), canvas trang 4 h=124px.

Drift trang 3 nhảy +32px tại «IV. Cài khóa tự động…», không có khối nằm giữa. Đoạn ngay trước, «III. Mở cửa từ bên ngoài bằng thẻ: Đặt thẻ từ lên điểm đọc thẻ từ» (65 ký tự, Times New Roman 18pt, không kern, không `w:w`): Word 1 dòng, canvas 2 dòng (h=63, lh=31,7).

GDI `GetTextExtentPoint32W` chuỗi đó = **624px**. Bề rộng dòng Word = (12240−1440−1440) twips × 96/1440 = **624px**. `.vno-writer-page` là `box-sizing: border-box`, `width` = khổ giấy, `border: 1px` mỗi bên → cột chữ 816−96−96−2 = **622px**. 624 không vừa 622, gãy thêm một dòng, đoạn cuối tràn sang trang 4.

Sau khi hairline chuyển sang `box-shadow` (không chiếm chỗ), probe DOM: `contentW=624`, `borderWidth=0`. Canvas 3 trang, ma trận không còn lớp lỗi.

### d16 — dòng .VnTimeH (chưa hết trang thừa)

Trước sửa, lệch đầu ở trang 2: «After negotiation…» Word y=666 vẫn trang 2, canvas trang 3. `line-height` 5: Word ~21px/dòng, canvas đoạn cao 24px. Probe DOM đoạn «SERVICE CONTRACT»: `<p>` có `--vno-font-ratio: 1.15`, line-height 21,53px, nhưng `<font face=".VnTimeH, sans-serif" style="--vno-font-ratio: 1.27">` bọc ngoài (face không cài, trình duyệt đo font thay thế) kéo line-height lên **23,77px**, `offsetHeight` 24.

Sau W49, lớp `line-height` 5 → 0, `page` 14 → 12. Lệch đầu dời tới trang 3: «Sau khi hoàn thành công việc dịch vụ…» Word trang 3 y=673 (3 dòng), canvas trang 4 h=65. Drift các cặp cùng trang 3 = 0 (đỉnh khớp Word). Khoảng còn lại của Word từ y=673 tới đáy vùng chữ 720pt = 47pt = 62,7px; đoạn canvas cao 65px nên không vừa. Canvas vẫn **9** trang (Word 8).

### d21 — descent dưới ảnh (chưa hết trang thừa)

19 đoạn khớp đều cùng số trang (lớp `page` = 0) cả trước và sau. Trang thừa là ảnh cuối. `wp:extent` ảnh cuối 428,7×96/96 dpi = **428,7px**; đoạn chứa ảnh trước sửa cao **434px** (cộng ~5px descent vì ảnh inline ngồi trên baseline). Các ảnh khác cùng kiểu: 625,1→630, 361,6→367.

`vertical-align: bottom` đưa đoạn ảnh cuối **434 → 429px** (extent 428,7) và ảnh trang 9 **367 → 362**. Trang 9 sau đó: ảnh 362 + đoạn rỗng 19 + chữ 53, rồi ảnh 429 không vừa usable Letter 864px (cộng lề đoạn ~2px). Canvas vẫn **10** trang (Word 9). W51 (chiều cao phân số thay `offsetHeight`) đo lại 5 file không đổi số trang.

### d01 — cột chữ hết hẹp, vẫn thừa 1 trang

Lệch đầu không đổi: «Địa chỉ liên lạc…» Word trang 7 y=57 (2 dòng, 13pt, line 276 auto), canvas trang 6 top=6201 h=46. Khối chữ ký «CHỮ KÝ THÀNH VIÊN…» (CENTER h=538) vẫn sang trang 20; Word để bảng chữ ký trên trang 19. `wrap` 9 → 6, `page` 21 → 20, `drift:unknown` 9 → 7. Canvas vẫn **20** (Word 19).

### d09 — `page` không giảm

Bảng ngành nghề canvas vẫn **h=2404** (đo W47 là 2404; w43 là 2340). «QUÁ TRÌNH HÌNH THÀNH…» vẫn canvas trang 4 / Word trang 5 (y=211). Lớp `page` **23 → 24** sau khi nới cột chữ (W48); các lớp khác không tăng so với ma trận W47 (wrap 4→3, drift:unknown 9→8, line-height giữ 2). Canvas vẫn 14 = Word 14. Chưa về ≤ 17.

## Chỗ sửa

- `apps/writer/writer.css` — W48 hairline bằng box-shadow; W50 `img { vertical-align: bottom }` trên tài liệu nhập. In thật (`@media print`) và bố cục web vẫn dùng border vì chiều rộng khi in/web không phải cột đo.
- `adapters/libreoffice/writer/writer-adapter.js` — W49 `_ratioForFontFace` / `_fontFaceInstalled`; W51 `heightOf` trong `_recomputeLivePagination`.
- `tests/unit/writer-page-hairline.test.js` — khóa W48–W51.

Không đụng Sheet, không đổi định nghĩa lớp lỗi của bộ đo, không commit tài liệu.

## Số trước / sau

Năm file (Word = cache COM; trước = w46i, riêng d09 `page` lấy W47 vì w46i còn 54 do padding longhand):

| File | Word | canvas trước → sau | `page` trước → sau | lớp khác đổi |
|---|---:|---|---|---|
| d01 | 19 | 20 → **20** | 21 → **20** | wrap 9→6, drift:unknown 9→7, line-height 1 |
| d14 | 3 | 4 → **3** | 1 → **0** | wrap 1→0, drift:unknown 1→0 |
| d16 | 8 | 9 → **9** | 14 → **12** | line-height 5→0, drift:empty-para 2→1; wrap 3, spacing 1, drift:unknown 2 |
| d21 | 9 | 10 → **10** | 0 → **0** | wrap 3; đoạn ảnh cuối 434→429px |
| d09 | 14 | 14 → **14** | 23 → **24** | wrap 4→3, drift:unknown 9→8, line-height 2, spacing 5, drift:table 1 |

Ma trận 23 file sau sửa (`_writer_out_r21_all`). Số trang canvas của 19 file đã khớp Word giữ nguyên. Lớp giảm thêm so với w46i: d02 `page` 26→3 (line-height 4→2, hết spacing và drift:empty-para); d07 `page` 34→32, hết wrap và drift:unknown. Không file nào tăng số trang canvas. d09 là lớp `page` tăng (23→24).

| file | Word | canvas | page | wrap | line-height | drift:unknown | khác |
|---|---:|---:|---:|---:|---:|---:|---|
| d01 | 19 | 20 | 20 | 6 | 1 | 7 | |
| d02 | 11 | 11 | 3 | 2 | 2 | 3 | font-size 1 |
| d03 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d04 | 5 | 5 | 0 | 0 | 0 | 0 | |
| d05 | 2 | 2 | 0 | 2 | 2 | 1 | |
| d06 | 3 | 3 | 1 | 1 | 0 | 0 | drift:float 3 |
| d07 | 23 | 23 | 32 | 0 | 0 | 0 | |
| d08 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d09 | 14 | 14 | 24 | 3 | 2 | 8 | spacing 5, drift:table 1 |
| d10 | — | — | Word COM: file hỏng | | | | |
| d11 | 5 | 5 | 4 | 1 | 6 | 1 | drift:empty-para 1 |
| d12 | 3 | 3 | 1 | 1 | 0 | 0 | drift:empty-para 1 |
| d13 | 10 | 10 | 16 | 1 | 2 | 2 | drift:table 4 |
| d14 | 3 | 3 | 0 | 0 | 0 | 0 | |
| d15 | 10 | 10 | 0 | 1 | 0 | 1 | font-name 1 |
| d16 | 8 | 9 | 12 | 3 | 0 | 2 | spacing 1, drift:empty-para 1 |
| d17 | 5 | 5 | 5 | 1 | 0 | 1 | |
| d18 | 2 | 2 | 0 | 0 | 0 | 0 | |
| d19 | 2 | 2 | 1 | 1 | 3 | 1 | drift:empty-para 3 |
| d20 | 3 | 3 | 1 | 0 | 0 | 0 | |
| d21 | 9 | 10 | 0 | 3 | 0 | 0 | |
| d22 | 5 | 5 | 5 | 1 | 0 | 1 | |
| d23 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d24 | 16 | 16 | 0 | 0 | 0 | 0 | matched 0 |

## Quy ước đề xuất

Đã ghi vào `docs/QUY-UOC-DOI-CHIEU.md`: W48 (hairline không chiếm cột chữ), W49 (face không cài không lấy line-height font thay thế), W50 (ảnh nhập `vertical-align: bottom`), W51 (phân trang dùng chiều cao phân số).

## Việc còn lại

- d01 canvas 20 (Word 19). Lệch đầu vẫn «Địa chỉ liên lạc» trang 6/7; chữ ký sang trang 20. `wrap` còn 6.
- d16 canvas 9 (Word 8). Trang 3 khớp đỉnh Word tới «4.3…»; đoạn 3 dòng kế (h=65) không vừa 62,7px còn lại.
- d21 canvas 10 (Word 9). Ảnh cuối 429px so với extent 428,7px; còn ~2px so với usable 864.
- d09 `page` 24 (mục tiêu ≤ 17). Bảng ngành nghề 2404px; đoạn sau bảng vẫn trang 4 so với Word trang 5.

## Test

- `node tests/run-tests.js` — **1829/1829 PASS** (trước vòng này 1825; thêm 4 test W48–W51).
- `python -m unittest discover -s tests -p "test_*.py"` — **341 tests OK**. Một lần chạy chồng webview đo layout thì LibreOffice báo lỗi chuyển đổi `sample-writer-comments.docx`; chạy lại khi không đo thì đủ 341 OK. Luồng đọc stdout của unittest có `UnicodeDecodeError` (byte 0xe1) nhưng không làm fail test nào.
