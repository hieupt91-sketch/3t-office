# Handoff Writer R24 — không giữ sửa: mọi ứng viên làm lệch canvas = Word hoặc tăng lớp `page`

Worktree `E:\VNOffice-grok-writer-r24`, nhánh `fix/writer-r24-grok`. Code giữ nguyên `main` sau W56 (cây làm việc trùng commit đã đo `_writer_out_r23_final`). Canvas đo bằng `scripts/layout-audit` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Word COM cache là `_writer_out_w12a\*.word.jsonl`, cộng một lần đo COM trực tiếp cho d07 và d09 (bên dưới). Không đổi định nghĩa lớp lỗi. Không đụng Sheet. Không commit tài liệu.

Không có quy ước W57 được ghi vào `docs/QUY-UOC-DOI-CHIEU.md`. Ba hướng sửa đều bị bỏ sau khi đo, vì mỗi hướng làm ít nhất một file đã khớp số trang canvas lệch Word, hoặc kéo lớp `page` đã giảm ở R23 tăng trở lại.

## Số Word COM đo trong vòng này

### d07 — hộp dòng không cao hơn Word

Đoạn «- Trong thời gian hiệu lực hợp đồng…» (bản thứ hai, đoạn Word i=206), `w:spacing w:before="20" w:after="20" w:line="312" w:lineRule="auto"`, TNR 12pt, Scaling 100, Spacing 0:

| | Word COM | canvas R23 |
|---|---|---|
| Trang / dòng | trang 8, 6 dòng, y đầu = 665,25pt | trang 9, 6 dòng, h = 143px |
| Pitch dòng | **18pt đúng** (437,25→455,25… và 665,25→683,25) = **24px** | lh = **23,92px** |
| Khoảng đoạn | SpaceBefore = SpaceAfter = **1pt** = 1,333px | mt/mb các đoạn cùng trang = **1,51px** (LibreOffice ghi 0,04cm) |

`LineSpacing` COM = 15,6pt là bội 1,3 của 12pt, không phải pitch vẽ. 15,6 × 96/72 = 20,8px — đó là con số «~20,8» trong brief, không phải khoảng cách dòng Word. Pitch thật 18pt và canvas 23,92px lệch **0,08px/dòng** (canvas hơi thấp hơn). Sáu dòng: Word 108pt = 144px, canvas h = 143px.

Trên trang 8, đỉnh canvas trôi dần **+3px** so với Word tới đoạn ngay trước câu hợp đồng (offsetTop làm tròn). 1,51 − 1,333 = 0,18px mỗi ranh giới. Đoạn 6 dòng vì vậy không vừa vùng chữ canvas dù cao gần bằng Word.

### d09 — năm cặp wrap không cùng một nguyên nhân

Cột chữ Letter, lề 72pt, textW = 468pt = 624px. numId 4 / ilvl 0: bullet «-», `w:left="990"` `w:hanging="360"`.

| Đoạn | Word | canvas R23 | Ghi chú COM |
|---|---|---|---|
| «Tháng 02/2022…» | 10 dòng | 9 dòng, h=206, lh=22,92 | jc=both, leftInd=49,5pt, firstInd=−18pt, pitch 17,25pt = 23px. R22 là 10=10. W56 làm mất 1 dòng |
| «Hình thức offline…» | 3 dòng | 2 dòng, h=46 | leftInd=49,5pt, firstInd=0, align trái. R22 là 3=3 |
| ROA | 2 dòng | đếm 4, h=59 | `w:vertAlign superscript` trên năm. 59/22,92 ≈ 2,6 dòng bố cục |
| ROS | 4 dòng | đếm 6, h=93 | superscript + 5 tab. 93/19,93 ≈ 4,7 dòng bố cục. Có từ R22 |
| ROE | 2 dòng | đếm 4, h=53 | superscript. 53/19,93 ≈ 2,7. Có từ R22 |

Ba cặp ROA/ROS/ROE: chiều cao khối gần số dòng Word; bộ đo đếm thêm vì đỉnh rect của chữ mũ lệch hơn 3px so với dòng thường. Không sửa bộ đo (cấm đổi định nghĩa lớp).

## Thí nghiệm đã đo rồi bỏ

### 1. Khoảng đoạn = mọi twips × 96/1440, và letter-spacing đo bản nowrap

Thư mục `_writer_out_r24_w57`.

| File | Word | canvas trước → sau | lớp đổi |
|---|---:|---|---|
| d01 | 19 | 19 → **20** | page 32→16 |
| d07 | 23 | 23 → **22** | page 27→91, thêm drift:table 1 |
| d09 | 14 | 14 → 14 | wrap 5, page 8, không đổi (h vẫn 206/46/59/93/53) |
| d15 | 10 | 10 → 10 | wrap 3, page 1, không đổi |
| d13 | 10 | 10 → 10 | page 14→15 |
| d17 | 5 | 5 → 5 | page 2, không đổi |

d01 tăng số trang canvas. Bỏ.

### 2. Chỉ đo advance nowrap (bỏ qua căn đều)

Thư mục `_writer_out_r24_w58only`. d01 canvas **20** (Word 19). d07 vẫn 23, `page` 27. d09 wrap vẫn 5, cùng chiều cao khối như R23. Bỏ.

### 3. Không áp advance GDI lên đoạn có margin-left / text-indent / `<li>`

Thư mục `_writer_out_r24_w57b`. Số trang canvas của năm file đo không tăng.

| File | canvas | lớp trước → sau |
|---|---:|---|
| d01 | 19 = Word | page 32, không đổi |
| d07 | 23 = Word | page 27, không đổi |
| d09 | 14 = Word | wrap 5→**3**, page 8→**17**, spacing 5→6, drift:unknown 10→9 |
| d15 | 10 = Word | wrap 3→**1**, page 1→**0**, drift:unknown 3→1 |
| d16 | 8 = Word | wrap 0→**3**, page 0→**3** |

Hai đoạn d09 mất dòng vì W56 và hai đoạn d15 (không phải «Căn cứ Bộ luật…», cặp đó đã 3→2 từ R22) trở lại số dòng Word. d16 mất đúng phần W56 đã chữa (ba đoạn TNR 13pt). d09 `page` trở lại 17 như trước W56. Bỏ.

### 4. Chỉ `w:before/after="20"` → `margin: 1.333px`

Thư mục `_writer_out_r24_w57c`. d07 có 66 lần `w:before="20"`. d01 và d09 không có giá trị này.

| File | canvas | lớp |
|---|---|---|
| d07 | 23 → **22** | page 27→**91** |
| d01 | 19 = Word | page 32, không đổi |
| d09 | 14 = Word | wrap 5, page 8, không đổi |
| d16 | 8 = Word | page 0, wrap 0, không đổi |

Đoạn hợp đồng bản hai lên đúng canvas trang 8, mt=1,333px. Lệch trang đầu tiên dời từ đoạn đó sang «HỢP ĐỒNG LAO ĐỘNG» (Word trang 17 / canvas trang 16). Trang Word 23 (5 đoạn, y 72→246,75) không còn trang canvas riêng. Bỏ.

## Ma trận giữ lại

Không có diff code so với R23. Ma trận 23 file vẫn là `_writer_out_r23_final` (không đo lại cả 23 file trên cây không đổi). Không file nào tăng số trang canvas so với bảng này, vì không có sửa nào được giữ.

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

## Việc còn lại

- d09 wrap 5: hai đoạn thật (10→9, 3→2) là tác dụng phụ W56 trên đoạn có thụt/danh sách. Tắt advance ở đó trả lại số dòng nhưng `page` 8→17 và d16 wrap/page 0→3. Ba đoạn ROA/ROS/ROE là chữ mũ, chiều cao không phải 4/6/4 dòng.
- d07 `page` 27: pitch đã khớp (24px vs 23,92px). Lệch là 0,18px/ranh giới của `before/after=20`. Ép 1,333px đưa đoạn hợp đồng về trang 8 nhưng canvas 23→22 và `page` 91.
- d01 `page` 32: bảng ngành nghề ngắn hơn Word, chưa đụng. Mọi thí nghiệm đụng advance ngang đều kéo canvas d01 lên 20.
- d15: tắt advance trên đoạn thụt hạ wrap 3→1 và `page` 1→0, nhưng không tách được khỏi hồi quy d16.
- d13 drift:table 4 và d17 `page` 2 chưa có sửa riêng. Trong thí nghiệm 1, d13 `page` 14→15, canvas vẫn 10; d17 không đổi.
- d10 Word COM: file hỏng.

## Test

Code không đổi so với R23.

- `node tests/run-tests.js` — **1833/1834**. Một fail: «FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility» (`soffice --convert-to xlsx` trả lỗi rỗng). Chạy lại đúng suite đó với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`: **11/11 PASS**. Không sửa code Sheet.
- `python -m unittest discover -s tests -p "test_*.py"` — **346 tests OK**, exit 0. Luồng đọc stdout vẫn có `UnicodeDecodeError` (byte 0xe1) như R22/R23.
