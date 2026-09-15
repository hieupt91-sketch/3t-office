# HANDOFF — VN Writer canvas: nhóm hình neo trôi (wp:anchor + wpg:wgp) xuất thành `<img name="ShapeN">` trần

Nhánh `fix/writer-floating-group-rasters` (agy làm lõi, hết 45 phút vì chờ tác vụ nền; Claude sửa cách ghép anchor,
thêm test, đo lại và merge). Số đo bằng app thật + Word 2016 COM, 2026-09-15.

## Vấn đề đo được
d06.docx ("BV hoàn công SG"): DOCX có 0 `wp:inline`, 60 `wp:anchor` wrapNone, 3 nhóm `wpg:wgp` (18.8×2.8 / 19.0×2.8 /
19.2×5.1 cm). LibreOffice xuất 3 nhóm này thành `<img name="Shape2" align="left" hspace="1" vspace="1">` không có
`class="sd-abs-pos"`; `_preserveImportedFloatingFrames` coi MỌI `<img name="ShapeN">` là inline group
(`display:inline-block`) → carrier cao 111/131/216px trong dòng chảy. Canvas 5 trang, Word 3.

## Sửa (`adapters/libreoffice/writer/writer-adapter.js`, `_preserveImportedFloatingFrames`)
- Ảnh `ShapeN` thứ j chỉ là inline group khi có `wp:inline` thứ j (`_ooxmlInlineGroupMetadata`); ảnh dư ra ghép
  theo THỨ TỰ các anchor nhóm (`anchors.filter(a => a.sourceGroup)`) → span `data-vno-float="image"`
  `position:absolute` với left/top/width/height/relativeFrom/wrap/behindDoc của anchor, textbox con đi theo.
  (Bản đầu của agy ghép theo `anchors[shapeNum-1]` — số "ShapeN" là bộ đếm của LibreOffice, không phải chỉ số
  anchor; đã bỏ.)
- Test `writer-floating-image-import.test.js` "R3 (a2)": img trần + chỉ có wp:anchor group → float tuyệt đối,
  không `data-vno-inline-group`; case wp:inline cũ giữ nguyên.

## Kết quả
| Tài liệu | Word | canvas trước | canvas sau |
|---|---:|---:|---:|
| d06 | 3 | 5 | **3** |
| d06 lưu có sửa → Word | 3 | 3 | 3 (Word mở OK) |
| d14 | 3 | 5 | 5 (nguyên nhân khác, chưa đo) |
| MYTIME | 44 | 57 | 56 |
| aquara final | 16 | 16 | 16 |
Gate 1758/1758 + suite floats 39/39.

## Còn lại
d14 ("HDSD KAADAS S500-C") 5/3 và d07 26/23, d09 19/14: cần `_probe_paginate_trace.py` + `_word_para_pos.ps1` từng file.
