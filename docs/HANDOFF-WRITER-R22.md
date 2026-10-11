# Handoff Writer R22 — d16/d21 hết trang thừa, d09 `page` 17, d07 `page` 27

Worktree `E:\VNOffice-grok-writer-r22`, nhánh `fix/writer-r22-grok`. Canvas đo lại bằng `scripts/layout-audit` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Word COM lấy từ cache `_writer_out_w12a\*.word.jsonl` (không đo lại Word). Ma trận sau sửa: `_writer_out_r22_final2`. Mọi số dưới đây là số đã đo. d10 Word COM vẫn báo file hỏng.

## Nguyên nhân đã khóa bằng số đo

### d16 — canvas 9 → 8 = Word

Preset Letter là 216×279 mm. Canvas đo được `min-height` 1054,5px; phân trang dùng `Math.round` → usable **862px**. Word Letter 12240×15840 twips, lề 1440: usable **864px**.

Đoạn «Sau khi hoàn thành công việc dịch vụ…» 3 dòng, `getBoundingClientRect` **64,55px** (lh 21,53, font 17,33). Word y=672,8, đáy vùng chữ 720pt, còn 47,2pt = **62,9px**. 64,55 không vừa 862. Hai việc cùng lúc mới vừa:

- W52 đưa usable lên 864.
- W54 không tính nửa leading dưới dòng cuối `(21,53−17,33)/2 = 2,1px`. 64,55−2,1 = 62,45 ≤ 62,9.

`page` 12 → 3. Lệch còn lại là ngắt dòng (wrap 3, không đổi so với R21): «During warranty time…» Word 3 dòng, canvas 4 dòng, drift +22px tại «Điều 7…».

### d21 — canvas 10 → 9 = Word

Cùng usable 862. Trang 9 đo được: ảnh 362 + đoạn rỗng 19 + chữ rh 52,88 + ảnh cuối 429 = **862,88px**. Vượt 862, vừa 864. Sau W52 canvas **9** trang, `page` vẫn 0, wrap 3.

### d09 — `page` 24 → 17

Bảng ngành nghề 64 hàng, probe DOM: hàng một dòng **rh 25,08**, padding-top **0**, padding-bottom **5,16** (0,11cm của LibreOffice + viền W44b). Word pitch cùng kiểu **28px** (21pt). OOXML `w:tcMar` top/bottom = 60 twips = **4px**.

W53 ghi padding ô theo `w:tcMar`. `page` **24 → 17** (đúng ngưỡng ≤ 17). Canvas vẫn 14 = Word 14. Lệch đầu dời từ «QUÁ TRÌNH HÌNH THÀNH…» (trang 4/5) tới «Phòng dự án…» (canvas trang 10 / Word trang 9).

Ba lớp trên chính d09 tăng 1: spacing 5→6, drift:unknown 8→9, drift:empty-para 0→1. line-height 2→1.

### d07 — `page` 32 → 27

Hai lớp:

- Bảng logo: canvas hàng **77px**, Word y=78 đến y=145,5 = 67,5pt = **90px**. `w:tcMar` 100 twips mỗi phía = 6,67px × 2. W53 đưa hàng lên 90px.
- Bốn đoạn chỉ có một dấu cách (`w:t` preserve, không `w:br`) cao **44px**; đoạn chữ cùng style «Mẫu hợp đồng thử việc số 2:» cao **23px**. LibreOffice ghi khoảng trắng kèm `<br>` nên thành hai dòng. Drift tại «Mẫu hợp đồng…» **+84px** = 4×21px. W55 gộp về một `<br>`.

Canvas vẫn 23 = Word 23. `page` 32 → 27. Không phát sinh lớp khác.

Ô có `beforeAutospacing`/`afterAutospacing` không nhận `w:tcMar`. d18 (46 ô, 75 twips, autospacing): cộng tcMar làm bảng 713 → 1039px và canvas 2 → 3 trang; bỏ qua autospacing thì canvas **2 = Word 2**.

### d01 — canvas vẫn 20 (Word 19)

Không đổi so với R21: canvas 20, `page` 20, wrap 6, line-height 1, drift:unknown 7. Lệch đầu vẫn «Địa chỉ liên lạc…» canvas trang 6 / Word trang 7.

Sáu đoạn wrap thêm đúng một dòng (TNR 13pt, không `w:ind`, run `w:w` = 100). Đo một dòng Word giữ được, «( Nội dung và hình thức… Hội đồng thành»: GDI ở cỡ 100× và Chromium cùng **646px**; cột chữ canvas **642,8px** (Word theo sectPr 9639 twips = 642,6px). Chưa có quy tắc an toàn để nới cột mà không đổi ngắt dòng của file khác.

## Chỗ sửa

- `adapters/libreoffice/writer/writer-adapter.js` — W52 `PAGE_SIZES_MM.letter`; W53 `_applyOoxmlTableCellMargins`; W54 `_paginationTrailingLeading`; W55 khoảng trắng + `<br>` trong `_collapseFloatOnlyParagraphBreaks`.
- `platform/help/entries-writer.js` — nhãn Letter 215,9×279,4 mm.
- Test: `writer-page-hairline.test.js`, `writer-table-paint-borders.test.js`, `writer-doc-font-spacing.test.js`, `writer-print-preview.test.js`, `writer-sectionbreaks-pagecolor.test.js`, `writer-fodt-phase-c.test.js`.

Không đụng Sheet, không đổi định nghĩa lớp lỗi của bộ đo, không commit tài liệu.

## Số trước / sau

Trước = ma trận R21 (`_writer_out_r21_all`). Sau = `_writer_out_r22_final2`.

| File | Word | canvas trước → sau | `page` trước → sau | lớp khác đổi |
|---|---:|---|---|---|
| d01 | 19 | 20 → **20** | 20 → **20** | wrap 6, line-height 1, drift:unknown 7 |
| d16 | 8 | 9 → **8** | 12 → **3** | drift:unknown 2→3; wrap 3, spacing 1, drift:empty-para 1 |
| d21 | 9 | 10 → **9** | 0 → **0** | wrap 3 |
| d09 | 14 | 14 → **14** | 24 → **17** | line-height 2→1; spacing 5→6; drift:unknown 8→9; drift:empty-para 0→1; wrap 3, drift:table 1 |
| d07 | 23 | 23 → **23** | 32 → **27** | không lớp khác |

Ma trận 23 file. Số trang canvas của mọi file đã khớp Word ở R21 vẫn khớp, kể cả d18 (2 = 2). d12 `page` 1→0; d13 16→14; d17 5→2; d19 `page` 1→0 (drift:unknown 1→2, drift:empty-para 3→1); d22 5→2. Không file nào tăng số trang canvas.

| file | Word | canvas | page | wrap | line-height | drift:unknown | khác |
|---|---:|---:|---:|---:|---:|---:|---|
| d01 | 19 | 20 | 20 | 6 | 1 | 7 | |
| d02 | 11 | 11 | 3 | 2 | 2 | 3 | font-size 1 |
| d03 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d04 | 5 | 5 | 0 | 0 | 0 | 0 | |
| d05 | 2 | 2 | 0 | 2 | 2 | 1 | |
| d06 | 3 | 3 | 1 | 1 | 0 | 0 | drift:float 3 |
| d07 | 23 | 23 | 27 | 0 | 0 | 0 | |
| d08 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d09 | 14 | 14 | 17 | 3 | 1 | 9 | spacing 6, drift:empty-para 1, drift:table 1 |
| d10 | — | — | Word COM: file hỏng | | | | |
| d11 | 5 | 5 | 4 | 1 | 6 | 1 | drift:empty-para 1 |
| d12 | 3 | 3 | 0 | 1 | 0 | 0 | drift:empty-para 1 |
| d13 | 10 | 10 | 14 | 1 | 2 | 2 | drift:table 4 |
| d14 | 3 | 3 | 0 | 0 | 0 | 0 | |
| d15 | 10 | 10 | 0 | 1 | 0 | 1 | font-name 1 |
| d16 | 8 | 8 | 3 | 3 | 0 | 3 | spacing 1, drift:empty-para 1 |
| d17 | 5 | 5 | 2 | 1 | 0 | 1 | |
| d18 | 2 | 2 | 0 | 0 | 0 | 0 | |
| d19 | 2 | 2 | 0 | 1 | 3 | 2 | drift:empty-para 1 |
| d20 | 3 | 3 | 1 | 0 | 0 | 0 | |
| d21 | 9 | 9 | 0 | 3 | 0 | 0 | |
| d22 | 5 | 5 | 2 | 1 | 0 | 1 | |
| d23 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d24 | 16 | 16 | 0 | 0 | 0 | 0 | matched 0 |

## Quy ước

Đã ghi `docs/QUY-UOC-DOI-CHIEU.md`: W52, W53, W54, W55.

## Việc còn lại

- d01 canvas 20 (Word 19). Wrap 6: dòng GDI/Chromium 646px không vừa cột 642,8px trong khi Word vẫn ít hơn một dòng. Chưa sửa.
- d16 `page` 3. «During warranty time…» canvas 4 dòng, Word 3 dòng.
- d09 `page` 17 (đúng ngưỡng). spacing 6, drift:unknown 9, drift:empty-para 1.
- d07 `page` 27. Canvas 23 = Word 23.

## Test

- `node tests/run-tests.js` — **1833/1833 PASS** (R21 là 1829; thêm 4 test W52–W55).
- `python -m unittest discover -s tests -p "test_*.py"` — **341 tests OK**. Luồng đọc stdout vẫn có `UnicodeDecodeError` (byte 0xe1) như R21; exit code 0, không test nào fail.
