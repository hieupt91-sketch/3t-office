# W-shapeloss — shape nào mất, mất ở bước nào

Nhánh `fix/writer-shape-loss-grok` tại `fea2816` (đã gồm vòng 4 + d09 GIF). Đếm Claude trên `E:\VNOffice-profiles\grok\writer-d09-gif-batch` khớp lại bằng parse OOXML: không file nào nhân đôi `wps:wsp`. Ba file vẫn mất shape so với gốc. Bản lưu main (cùng commit) mất đúng các shape này.

Sổ shape: mọi part `*.xml`, thẻ đếm bằng chuỗi `<wps:wsp` / `<wps:txbx` / `<wp:anchor` / `<w:txbxContent`. Danh tính từng shape lấy bằng ElementTree (docPr, prstGeom, textbox, group, anchor/inline, header/footer/bảng/textbox lồng). Không shape mất nào nằm trong header, footer, bảng, hay textbox lồng.

## Sổ mất

| File | Gốc wsp/txbx/anchor/txbxContent | Bản lưu batch | Mất thực |
|---|---|---|---|
| d06 | 91 / 37 / 60 / 74 | 79 / 34 / 48 / 51 | 13 anchor gốc biến mất, thêm 1 `Frame6` rỗng → lệch ròng −12 wsp, −3 txbx, −12 anchor |
| d07 | 1 / 0 / 1 / 0 | 0 / 0 / 0 / 0 | 1 connector |
| d19 | 1 / 0 / 0 / 0 (1 `wp:inline`, 1 `wpg:wgp`) | 0 / 0 / 0 / 0 (còn 1 `wp:inline` + 1 `pic:pic`) | 1 group inline |

`w:txbxContent` d06 74→51 gồm cả hộp VML trong fallback, không chỉ `wps:txbx`.

### d06 — 13 anchor `Requires="wps"`, không nằm trong `wpg:wgp`

Tất cả trong `word/document.xml`, `wp:anchor` (không inline), `wrapNone`, `posH` theo cột, `posV` theo đoạn.

| docPr | prstGeom | nv | Textbox | Đoạn | Ghi chú |
|---|---|---|---|---|---|
| Rectangle 44 | rect | cNvSpPr | có, chữ rỗng | p20, đoạn rỗng | extent 2178658×4969123 EMU, behindDoc=1. Bản lưu còn `Frame6` rỗng 2190750×5114925 — LibreOffice đổi tên cùng một khung |
| Straight Connector 2 | line | cNvCnPr | không | p49, chữ `23F6 23F5…` | 50800×107950 |
| Straight Connector 1 | line | cNvCnPr | không | p49 | extent ngang = 0 |
| Straight Connector 69, 91, 111, 131, 151, 171, 191 | line | cNvCnPr | không | p54, đoạn rỗng | 7 đường dọc ~3018 EMU (~1px) × ~811000 EMU, flipH=1 |
| Rectangle 14 | rect | cNvSpPr | `Camera ống khói nghiền liệu` | p56 | callout riêng, không phải con của group |
| Rectangle 129 | rect | cNvSpPr | `Camera ống khói nghiền than` | p56 | cùng kiểu |
| Rectangle 149 | rect | cNvSpPr | `Camera ống khói nghiền xi` | p56 | cùng kiểu |

Ba nhãn camera cũng nằm trong group đã được passthrough (Group 368 / 412 / 370). Bản lưu còn đúng một lần mỗi câu, bên trong group. Hình chữ nhật callout riêng thì mất. Các callout khác trên cùng đoạn (`Camera trạm điện ss04/ss06/ss08`, `Camera ống khói nghiền làm nguội`) không trùng chữ trong group nên còn.

35 `wps:wsp` trong 3 group và 44 anchor không-group còn lại (kể cả Picture 4) vẫn có trong bản lưu.

### d07

`Straight Connector 1`, line, `cNvCnPr`, không textbox, không group, `wp:anchor` trong `mc:AlternateContent` Requires=`wps`, đoạn p2 rỗng, extent 2256155×0 (đường ngang). Fallback VML `v:line`.

### d19

`Group 1893`, `wp:inline` (không có `wp:anchor`), Requires=`wpg`, một `wps:wsp` tên `Shape 2327`, `a:custGeom` (không phải rect/line), không textbox, không bảng. Extent 5943600×15241 EMU (~2px cao). `Picture 157` là inline thứ hai, còn sau khi lưu.

## Mất ở bước nào

Đo `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`, soffice qua `main._run_soffice_convert`, thư mục `E:\VNOffice-profiles\grok\writer-shape-loss-stages` (không đưa vào git).

1. **StarWriter HTML** (`docx→html`) không còn docPr gốc.
   - d06: 59 `<img name="ShapeN">` GIF (Shape1 = Rectangle 44 229×522px … Shape59 = Rectangle 189) cộng khung `textbox`/`Frame`. Chữ camera còn trong HTML (mỗi câu 2 lần). Shape46–52 là GIF 1×85px (7 connector dọc). Shape37 là 5×11px (Connector 2). Không có Shape60 — Picture 4 giữ tên riêng.
   - d07: một GIF `Shape1` 237×1.
   - d19: `Picture 157` PNG 16×16 và GIF `Shape1` 624×2. Không còn `wpg:wgp`.

2. **`main.py` `_inline_html_images` / `_is_decorative_hairline_image`** bỏ GIF có một chiều ≤2px và chiều kia ≥10px trước khi vào canvas. Đúng các connector 1px của d06 (Shape46–52), connector d07, và group d19. Ảnh không vào HTML xuất ra, nên HTML→DOCX của app không có carrier ShapeN cho chúng. Canvas vẫn dựng rect/line từ OOXML (`_ooxmlImportedBasicShapes`) nhưng `_shapesForExport` bỏ mọi shape `imported`. custGeom inline của d19 không được importer đó đọc (chỉ rect/line trong `wp:anchor`).

3. **HTML→DOCX thô** (không qua app, không hậu xử lý): d06 còn 60 `pic:pic` + 37 `wps:txbx` khung, 0 `wpg:wgp`, 0 docPr gốc. d07 còn 1 pic `Shape1`. d19 còn 2 inline pic (`Picture 157` + `Shape1`). Tên gốc vẫn chưa về.

4. **Hậu xử lý** (`postprocess_writer_docx` trên DOCX thô, chưa sửa ZZ):
   - `_remove_duplicate_writer_textbox_anchors` xóa mọi khung chưa sửa có chữ nằm trong `wpg:wgp`. Trên d06 có hai khung cùng khóa `cameraốngkhóinghiềnliệu` (`textbox4` và `Frame24`), tương tự than/xi. Cả khung mở rộng từ group lẫn callout riêng bị xóa, nên passthrough theo chữ không còn chỗ để thay bằng Rectangle 14/129/149.
   - Rectangle 44 chữ rỗng (khóa dài 0) không ghép được; còn lại thành Frame rỗng.
   - `_drop_starwriter_duplicate_pics` xóa GIF `ShapeN` khi anchor nguồn không có textbox, kể cả khi tên gốc chưa được chép lại (`native_present or not has_txbx`). Connector không có carrier sau bước hairline, hoặc có GIF nhưng không ghép được, đều mất hẳn.
   - Passthrough chỉ quét `wp:anchor`. `wp:inline` của d19 không bao giờ được chép. Sau hậu xử lý thô: Group 1893 = 0, pic vẫn 2.

Không cần sửa LibreOffice Core. DrawingML gốc còn nguyên trong file nguồn; Adapter/hậu xử lý có thể chép lại từng anchor/inline (cùng cách vòng 4), không chép cả gói ZIP.

## Hướng sửa (chưa làm ở commit này)

- Khung trùng group: chỉ xóa phần dư sau khi đã chừa đủ khung cho textbox nguồn đứng riêng (cùng khóa chữ).
- Hộp chữ rỗng: ghép 1-1 khi số khung rỗng bằng số textbox nguồn rỗng (Rectangle 44 ↔ Frame).
- Connector / group / picture chưa có mặt theo docPr: chèn lại DrawingML gốc vào đoạn nguồn (LCS chữ). Không chèn nếu người dùng đã xóa (marker mutation) hoặc khung đã sửa còn chứa chữ đó.
- `wp:inline` có `wpg`/`wps` xử lý như anchor (d19).
- Chỉ xóa GIF `ShapeN` khi tên gốc đã có trong file, để không xóa nốt raster cuối khi passthrough chưa ghép.
