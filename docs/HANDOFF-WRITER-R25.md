# Handoff Writer R25 — `w:numPr` tách được d16, nhưng bỏ advance trên `<li>` kéo d09 `page` 8→17 nên không giữ

Worktree `E:\VNOffice-grok-writer-r25`, nhánh `fix/writer-r25-grok`. Code đã thử rồi hoàn tác: cây làm việc không có diff so với HEAD trước handoff này (W56 giữ nguyên). Không ghi W57 vào `docs/QUY-UOC-DOI-CHIEU.md`. Không đụng Sheet. Không đổi định nghĩa lớp lỗi. Không commit tài liệu.

Canvas đo bằng `scripts/layout-audit` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Thư mục đo: `E:\VNOffice-opencode-lan-audit\_writer_out_r25_w57`. Word COM cache copy từ `_writer_out_w12a\*.word.jsonl` (không đo lại Word), trừ d10 không có cache. DOCX nằm ở `E:\VN OFice\file test\landocx` (worktree này không có `file test\landocx`).

## Kiểm tra `w:numPr` trên `word/document.xml` (trước khi sửa)

`styles.xml` của d09, d15, d16: **0** `<w:numPr>`. Mọi numPr dưới đây là trực tiếp trên `w:pPr`. Đếm cả file: d09 **87**, d15 **95**, d16 **5**; không có `w:numId="0"`.

HTML LibreOffice (cùng đường convert của app, profile grok) của đúng các đoạn wrap:

| Đoạn | `w:numPr` | `w:ind` trực tiếp | HTML |
|---|---|---|---|
| d09 «Tháng 02/2022…» | numId **4** / ilvl 0, style ListParagraph | không có (style ListParagraph có `w:left="720"`, không numPr) | `<li>` … `font-size: 13pt` |
| d09 «Hình thức offline…» | **không** | `w:left="990"` | `<p style="margin-left: 1.75cm">`, không nằm trong `<li>` |
| d15 «Bên B có trách nhiệm kiểm tra hàng hóa…» | numId **13** / ilvl 0 | `w:left="714" w:hanging="357"` | `<li>` |
| d15 «Trong quá trình thực hiện hợp đồng…» | numId **22** / ilvl 0 | `w:left="714" w:hanging="357"` | `<li>` |
| d16 «During warranty time…» | **không** | `w:firstLine="720"` | `<p style="text-indent: 1.27cm">` |
| d16 «Prepare construction methods…» | **không** | `w:firstLine="720"` | `<p style="text-indent: 1.27cm">` |
| d16 «In the course of construction…» | **không** | `w:firstLine="720"` | `<p style="text-indent: 1.27cm">` |

Số `<li>` trong HTML trùng số `<w:numPr>`: d09 87, d15 95, d16 5. Code không có thuộc tính `data-vno-num-id`. Cờ danh sách đang có là `<li>` mà W21b/W33 ghép với `_ooxmlListParagraphs` (numId khác 0).

Giả thuyết hẹp **đúng** cho việc tách d16: ba đoạn TNR 13pt của d16 không có `w:numPr`. Chúng có `w:firstLine="720"` (text-indent 1,27cm), nên điều kiện R24 «margin-left / text-indent / `<li>`» bắt nhầm chúng. «Hình thức offline» **cũng không có** `w:numPr` — giả thuyết này không áp dụng cho đoạn đó.

«Căn cứ Bộ luật…» (d15, wrap 3→2 từ R22, R24 #3 không chữa được): không numPr, `w:firstLine="720"`, HTML `<p text-indent: 1.27cm>`.

## Sửa đã đo rồi bỏ

Trong lúc đo, `_applyGdiDeviceFontPixels` không gắn `--vno-gdi-advance` cho `font-size: 13pt` nằm trong `<li>` (kể cả `<li>` lồng). `_applyCharacterScale` đặt `gdiScale = 1` khi phần tử `closest("li")`. Đoạn `<p>` chỉ có margin-left / text-indent vẫn được advance. Không thêm cờ mới. Sau khi thấy d09 `page` 8→17, hai file code và test được hoàn tác.

## Số dòng đã đo (canvas)

Word dòng lấy từ cặp R23 (`_writer_out_r23_final`). Canvas R25 là `_writer_out_r25_w57`.

| Đoạn | Word dòng | canvas R23 → R25 | trang canvas |
|---|---:|---|---|
| d09 «Tháng 02/2022…» | 10 | 9 → **10**, h 206 → 229 | 6 → 6 |
| d09 «Hình thức offline…» | 3 | 2 → **2**, h 46 | 10 → **11** (Word trang 10) |
| d09 ROA / ROS / ROE | 2 / 4 / 2 | 4 / 6 / 4, h 59 / 93 / 53, không đổi số dòng | ROA trang 11→12; ROS/ROE trang 12 |
| d15 «Bên B có trách nhiệm kiểm tra…» | 4 | 3 → **4**, h 72 → 96 | 4 → 4 |
| d15 «Trong quá trình…» | 6 | 5 → **6**, h 120 → 143 | 7 → 7 |
| d15 «Căn cứ Bộ luật…» | 3 | 2 → 2, h 60 | 2 → 2 |
| d16 ba đoạn TNR 13pt | 3 / 1 / 2 | 3 / 1 / 2, h 65 / 22 / 43, không đổi | 4 / 6 / 7 |

## Ma trận thí nghiệm so với `_writer_out_r23_final`

Số trang canvas: **không file nào tăng**. 22 file vẫn bằng Word. Chỉ d09 và d15 đổi lớp lỗi.

| File | Word | canvas | lớp R23 → đo R25 |
|---|---:|---:|---|
| d09 | 14 | 14 | `page` 8→**17**, wrap 5→**4**, spacing 5→**6**. line-height 1, drift:unknown 10, empty-para 1, table 1 không đổi |
| d15 | 10 | 10 | wrap 3→**1**, `page` 1→**0**, drift:unknown 3→**1**. font-name 1 không đổi |
| d16 | 8 | 8 | `page` 0, wrap 0, spacing 1, empty-para 1 — không đổi |
| d01 | 19 | 19 | `page` 32, wrap 0 — không đổi |
| d07 | 23 | 23 | `page` 27, wrap 0 — không đổi |

Các file còn lại (d02–d06, d08, d11–d14, d17–d24) trùng từng lớp với ma trận R23. d10 Word COM lần này: `The file appears to be corrupted.`

Ma trận đầy đủ của lần đo (code thí nghiệm, **không** phải cây đã commit):

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
| d09 | 14 | 14 | 17 | 4 | 1 | 10 | spacing 6, drift:empty-para 1, drift:table 1 |
| d10 | — | — | Word COM: file hỏng | | | | |
| d11 | 5 | 5 | 4 | 1 | 6 | 1 | drift:empty-para 1 |
| d12 | 3 | 3 | 0 | 1 | 0 | 0 | drift:empty-para 1 |
| d13 | 10 | 10 | 14 | 1 | 2 | 2 | drift:table 4 |
| d14 | 3 | 3 | 0 | 0 | 0 | 0 | |
| d15 | 10 | 10 | 0 | 1 | 0 | 1 | font-name 1 |
| d16 | 8 | 8 | 0 | 0 | 0 | 0 | spacing 1, drift:empty-para 1 |
| d17 | 5 | 5 | 2 | 1 | 0 | 1 | |
| d18 | 2 | 2 | 0 | 0 | 0 | 0 | |
| d19 | 2 | 2 | 0 | 1 | 3 | 2 | drift:empty-para 1 |
| d20 | 3 | 3 | 1 | 0 | 0 | 0 | |
| d21 | 9 | 9 | 0 | 3 | 0 | 0 | |
| d22 | 5 | 5 | 2 | 1 | 0 | 1 | |
| d23 | 1 | 1 | 0 | 0 | 0 | 0 | |
| d24 | 16 | 16 | 0 | 0 | 0 | 0 | matched 0 |

Tổng lớp so với R23: `page` 95→103, wrap 22→19, drift:unknown 25→23, spacing 6→7. Các lớp khác không đổi.

Không giữ sửa. d15 được lợi (hai đoạn danh sách về đúng số dòng Word, `page` 1→0) và d16 không hồi quy, nhưng d09 `page` trở lại 17 như trước W56 — đúng kết quả R24 đã bỏ ở thí nghiệm #3 — trong khi wrap d09 chỉ 5→4 vì «Hình thức offline» không có numPr. Lợi d15 và hại d09 đi cùng một điều kiện `<li>`. Ma trận giữ lại vẫn là `_writer_out_r23_final`.

## Việc còn lại

- d09 wrap còn 4: «Hình thức offline» vẫn 2 dòng (Word 3), không có `w:numPr`, chỉ `w:left="990"`. Ba đoạn ROA/ROS/ROE vẫn đếm 4/6/4 vì chữ mũ; chiều cao khối không đổi (59/93/53).
- Bỏ advance mọi `<li>` 13pt đưa «Tháng 02/2022» về 10 dòng nhưng `page` d09 8→17 và «Hình thức offline» lệch sang trang canvas 11 (Word 10).
- d16: ba đoạn cần advance là `<p>` firstLine, không phải danh sách. d16 còn 5 đoạn `<li>` / numPr; lần đo này không làm chúng đổi wrap hay số trang.
- d07 `page` 27 và d01 `page` 32 không đổi trong lần đo này.
- d10 Word COM: file hỏng.

## Test

Chạy trên code thí nghiệm (có hai test W57), trước khi hoàn tác:

- `node tests/run-tests.js` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok` — **1836/1836 PASS**, exit 0.
- `python -m unittest discover -s tests -p "test_*.py"` — **346 tests OK**, exit 0. Luồng đọc stdout vẫn có `UnicodeDecodeError` (byte 0xe1) như R22/R23.

Sau hoàn tác không chạy lại suite: `writer-adapter.js` và file test trùng HEAD.
