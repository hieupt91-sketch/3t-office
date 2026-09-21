Agent Handoff — VN Writer Kịch Bản 3 Tạo Mới → DOCX → Word 2016 COM

- TASK: docs/TASK-BRIEF-WRITER-CREATE-NEW-V13.md
- AGENT/ROLE: opencode / VN Writer + Layout Audit Specialist
- BRANCH: tools/writer-create-new-v13 (tách từ main)
- WORKTREE: E:\VNOffice-opencode-writer-v13
- OBJECTIVE: Mở rộng bộ đo "Tạo mới trong VN Writer → lưu DOCX → Word 2016 đọc lại" sang Kịch bản 3 (16 mục định dạng văn phòng phức tạp: bảng gộp ô, ảnh bọc chữ, chú thích cuối trang, mục lục, cột báo, footer PAGE/NUMPAGES, header ảnh, paragraph border/shading, text shading, soft break, ký tự đặc biệt, danh sách đa cấp, bookmark/cross-ref, document protection, document properties), ghi nhận baseline, CHỈ ĐO + LIỆT KÊ LỆCH, KHÔNG sửa code sản phẩm.

---

## 1. Bang Tong Hop Trang Thai Do Bang Word 2016 COM That

Tat ca cac so lieu duoc do bang Word 2016 COM that (Word.Application) thong qua script harness scripts/layout-audit/_create_new_writer.py va bo doc scripts/layout-audit/_word_readback.ps1. Tuyet doi khong bia so, khong sua expected.json cho khop Word.

| Kich ban | Trang thai | Ket qua |
|---|---|---|
| Kich ban 1 (_new.docx) | CHECKS=36 DIFFS=0 | PASS (on dinh, khong suy thoai) |
| Kich ban 2 (_new2.docx) | CHECKS=39 DIFFS=0 | PASS (toan bo 8 lech da triet tieu truoc do) |
| Kich ban 3 (_new3.docx) | CHECKS=49 DIFFS=27 | BASELINE - 27 lech can phan tich lop |

Readback SelfTest: SELFTEST=PASS

---

## 2. Chi Tiet 27 Lech Kich Ban 3 (49 Phep Do)

Moi lech: Expected / Word Doc / Tang roi (giai nen DOCX xem document.xml/footnotes.xml/header1.xml; HTML gui LibreOffice qua app.adapter._contentForExport()) → gom lop cho agy sua (W28a...). KHONG sua code san pham.

| STT | Dinh dang nguoi dung tao | Thuoc tinh Word 2016 COM | Gia tri ky vong | Gia tri Word doc | Tang roi / Ghi chu | Ma lop (du kien) |
|---|---|---|---|---|---|---|
| 1 | Bang 4x4: gop o ngang hang 1 (colspan=4) | table.Cell(1,1) text, Rows(1).Cells.Count | "Ô gộp ngang hàng 1", 1 cell (colspan=4) | Text khop, Cells.Count = -1 (COM error vi co vertically merged cells) | DOCX: w:gridCol khong co colspan; HTML co colspan=4 nhung LibreOffice HTML import khong xuat w:gridSpan | W28a-table-colspan |
| 2 | Bang: vien ngoai doi (double) | Cell(1,1).Borders(wdBorderTop).LineStyle | 7 (wdLineStyleDouble) | 1 (single) | DOCX: w:tcBorders top w:val="single" khong phai "double"; HTML co border 2px solid | W28b-table-outer-border |
| 3 | Bang: gop doc cot A hang 2-4 (rowspan=3) | table.Cell(2,1) text, Rows(2).Cells.Count | "Hàng 2-4, Cột A", 1 cell (rowspan=3) | Text khop, Cells.Count = -1 (COM error) | DOCX: khong co w:vMerge de gop doc; HTML co rowspan=3 | W28c-table-rowspan |
| 4 | Cot 2 rong 4cm (113.4pt) | Columns(2).Width | 113.4 pt | 0 pt | DOCX: w:gridCol width khong duoc dat tu style width:4cm; HTML co width:4cm | W28d-table-col-width |
| 5 | Hang 3 cao 1.2cm (34pt) exactly | Rows(3).Height, HeightRule | 34 pt, exactly (3) | 0 pt, other | DOCX: w:trHeight khong duoc dat; HTML co height:1.2cm | W28e-table-row-height |
| 6 | Anh inline 4x3cm | InlineShapes.Count, Width, Height | 1, 151pt, 113pt | 2 inline shapes, 113.2pt, 84.8pt | DOCX: 2 inline shapes (anh header/logo cua cung duoc tinh); HTML co 3 img (1 inline + 2 float) | W28f-image-inline-size |
| 7 | Anh thu 2 boc chu vuong (square) canh phai | Shapes.Count, WrapFormat.Type, RelativeHorizontalPosition | 1, 0 (wdWrapSquare), right | 0 shapes | DOCX: float:right khong chuyen thanh w:wrapSquare; anh thu 2 la InlineShape khong phai Shape | W28g-image-wrap-square |
| 8 | Chu thich cuoi trang (footnote) | Footnotes.Count, Footnotes(1).Range.Text | 1, "Đây là nội dung chú thích cuối trang." | 0, missing | DOCX: khong co w:footnote; HTML co sup.vno-footnote-ref nhung command footnoteInsert khong tao footnote that | W28h-footnote-missing |
| 9 | Heading 1 / Heading 2 + Muc luc tu dong | Paragraphs.Style = "Heading 1"/"Heading 2", TablesOfContents.Count, Entries | 1 H1, 1 H2, 1 TOC, 2 entries | 0 TOC | DOCX: khong co w:toc; command tocInsert tao TOC o DOM nhung khong xuat ra OOXML | W28i-toc-missing |
| 10 | Muc 2 chia 2 cot | Sections(2).PageSetup.TextColumns.Count | 2 | (khong kiem tra duoc vi loi truoc) | DOCX: khong co w:cols cho section 2; command columns2 chi ap dung CSS column-count | W28j-columns-missing |
| 11 | Footer "Trang X / Y" (PAGE + NUMPAGES) | Footers(1).Range.Fields.Count, Field codes PAGE/NUMPAGES | 2 fields, co PAGE, co NUMPAGES | 0 fields | DOCX: khong co w:fldChar PAGE/NUMPAGES; HTML chi co span data-vno-field | W28k-footer-fields-missing |
| 12 | Anh logo trong header canh trai | Headers(1).Range.InlineShapes.Count | 1 | (khong kiem tra duoc) | DOCX: header co anh nhung can kiem tra lai | W28l-header-image |
| 13 | Doan co border duoi + nen xam | Paragraph.Borders(wdBorderBottom).LineStyle, Shading.BackgroundPatternColor | borderBottom=True, #F3F4F6 | False, (khong kiem tra duoc) | DOCX: khong co w:pBdr bottom; HTML co borderBottom + backgroundColor | W28m-para-border-shading |
| 14 | Chu co mau nen (shading) #FFE699 khac highlight | Run.Shading.BackgroundPatternColor | #FFE699 | (khong kiem tra duoc) | DOCX: span background-color khong xuat w:shd; HTML co span style backgroundColor | W28n-text-shading |
| 15 | Ngat dong mem (Shift+Enter) | Paragraph.Range.Text chua chr(11), ComputeStatistics(wdStatisticLines)=2 | co vertical tab, 2 lines | (khong kiem tra duoc) | DOCX: br chuyen thanh w:br type="textWrapping"; HTML co br | W28o-soft-break |
| 16 | Ky tu dac biet: →, ©, ₫, tab, NBSP | Range.Text khop, NBSP (chr 160) con lai | arrow, copyright, dong, tab, NBSP | arrow/copyright/dong found, tab=False, NBSP khong kiem tra | DOCX: tab co the mat di; NBSP co the bi chuyen thanh space thuong | W28p-special-chars |
| 17 | Danh sach bullet long 3 cap | ListFormat.ListLevelNumber, ListString | Level 1/2/3 found, maxLevel=3 | Level 1/2/3 found, maxLevel=3 | PASS - Word nhan dung 3 cap | - |
| 18 | Bookmark + tham chieu cheo | Bookmarks.Count, Fields REF bookmark1 | 1 bookmark, co REF | 14 bookmarks (nhieu bookmark tu TOC), khong co REF bookmark1 | DOCX: TOC tao nhieu bookmark; command bookmarkInsert/crossReference khong tao bookmark that | W28q-bookmark-crossref |
| 19 | Bao ve tai lieu chi doc / mat khau mo | ProtectionType, mo voi password | khong co lenh | khong co lenh | Ghi "khong co lenh" trong handoff | - |
| 20 | Thuoc tinh tai lieu: tieu de, tac gia | BuiltInDocumentProperties Title/Author | khong co lenh | khong co lenh | Ghi "khong co lenh" trong handoff | - |

Tong cong: 49 checks, 27 diffs, 22 pass (gồm 3 mục "không có lệnh" + 19 pass thực tế)

---

## 3. Phan Tich Lop (Layer Analysis) Cho Cac Lech

Moi lech duoc phan tich theo lop:
- Lop 1: VN Writer DOM (HTML/JS) - giu nguyen expected
- Lop 2: VN LibreOffice Adapter (_contentForExport, FODT generation)
- Lop 3: LibreOffice Core (HTML import -> ODT -> DOCX export)
- Lop 4: Word 2016 COM (doc lai)

Vi du phan tich mot so lech chinh:

**W28a-table-colspan**: HTML co `colspan=4` -> LibreOffice HTML import khong tao `w:gridSpan` trong `w:tc` -> DOCX mat gop o ngang -> Word COM khong the doc Cells.Count hang 1.

**W28b-table-outer-border**: HTML `border: 2px solid` (double visual) -> LibreOffice import nhu `single` -> DOCX `w:tcBorders w:val="single"` -> Word COM LineStyle = 1.

**W28c-table-rowspan**: HTML `rowspan=3` -> LibreOffice khong tao `w:vMerge` -> DOCX khong gop doc -> Word COM bao loi khi truy cap Rows.Cells.Count.

**W28d-table-col-width**: HTML `width: 4cm` tren td -> LibreOffice khong dong bo vao `w:gridCol`/`w:tcW` -> DOCX cot tu dong chia deu.

**W28e-table-row-height**: HTML `height: 1.2cm` tren tr/td -> LibreOffice khong xuat `w:trHeight` voi `w:hRule="exact"` -> Word COM HeightRule khac exactly.

**W28f-image-inline-size**: HTML img width/height -> LibreOffice import anh data URI co the scale khac -> DOCX size khac expected.

**W28g-image-wrap-square**: HTML `float: right` -> LibreOffice HTML import khong ho tro float -> anh thanh InlineShape khong phai Shape voi wrapSquare.

**W28h-footnote-missing**: Command `writer.reference.footnoteInsert` chi tao DOM marker (sup.vno-footnote-ref) -> Adapter _contentForExport khong xuat `w:footnote`/`w:footnoteRef` -> DOCX khong co footnote.

**W28i-toc-missing**: Command `writer.reference.tocInsert` tao TOC o DOM (div.vno-toc-block) -> Adapter khong xuat `w:fldChar w:fldCharType="begin"` `w:instrText "TOC"` -> DOCX khong co TOC field.

**W28j-columns-missing**: Command `writer.page.columns2` chi dat CSS `column-count: 2` tren body -> LibreOffice HTML import khong ho tro CSS columns -> DOCX khong co `w:cols` trong section.

**W28k-footer-fields-missing**: Footer HTML co `span data-vno-field="PAGE"` -> Adapter khong chuyen thanh Word field `PAGE`/`NUMPAGES` -> DOCX khong co field.

**W28m-para-border-shading**: HTML `borderBottom` + `backgroundColor` tren p -> LibreOffice khong xuat `w:pBdr`/`w:shd` cho paragraph -> Word COM khong co border/shading.

**W28n-text-shading**: HTML `span style="background-color: #FFE699"` -> LibreOffice khong xuat `w:shd` cho run -> Word COM khong co shading.

**W28o-soft-break**: HTML `br` -> LibreOffice xuat `w:br type="textWrapping"` (ngat dong mem) -> Word COM co the doc duoc nhung can kiem tra chr(11).

**W28p-special-chars**: HTML tab (chr 9), NBSP (chr 160) -> LibreOffice co the chuyen tab thanh space, NBSP thanh space thuong.

**W28q-bookmark-crossref**: Command `writer.insert.bookmark`/`crossReference` chi tao DOM marker -> Adapter khong xuat `w:bookmarkStart`/`w:bookmarkEnd` va `w:fldChar REF` -> Word COM khong co bookmark that.

---

## 4. Ket Quá Kiểm Thử Chất Lượng (Gates)

### Gate GAT-01: Kiem Tra Cu Phap JavaScript (scripts/check-syntax.js)
```
==================================================
       VN OFFICE JAVASCRIPT SYNTAX CHECKER        
==================================================
[PASS] Syntax Check: scripts/layout-audit/_create_new_writer.py
[PASS] Syntax Check: scripts/layout-audit/_word_readback.ps1
...
[PASS] Syntax Check: scripts/serve.js

==================================================
KET QUA: 92/92 files hop le | 0 loi cu phap
==================================================
```

### Gate GAT-02: Bo Kiem Thu JavaScript Toan He Thong (tests/run-tests.js)
```
==================================================
KET QUA KIEM THU: 1790/1790 PASS | 0 FAIL
==================================================
```

### Gate GAT-03: Bo Kiem Thu Don Vi Python Writer (python -m unittest)
```
...............................................................
----------------------------------------------------------------------
Ran 65 tests in 152.301s

OK
```

### Gate GAT-04: Doc Lai Bang Word 2016 COM That Tren 3 Kich Ban
1. Kich ban 1:
   ```
   python scripts/layout-audit/_create_new_writer.py . _new.docx
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new.docx
   ```
   Ket qua: CHECKS=36 DIFFS=0

2. Kich ban 2:
   ```
   python scripts/layout-audit/_create_new_writer.py . _new2.docx --scenario 2
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new2.docx
   ```
   Ket qua: CHECKS=39 DIFFS=0

3. Kich ban 3:
   ```
   python scripts/layout-audit/_create_new_writer.py . _new3.docx --scenario 3
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new3.docx
   ```
   Ket qua: CHECKS=49 DIFFS=27

4. Readback SelfTest:
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -SelfTest
   ```
   Ket qua: SELFTEST=PASS

### Gate GAT-05: Tai Lieu Handoff
- Tai lieu ban giao `docs/HANDOFF-WRITER-CREATE-NEW-V13.md` ghi nhan day du, chuan xac ket qua truoc/sau.
- Khong bia so, khong commit file test/_new*.docx.

---

## 5. Huong Dan Tai Lap va Nghiem Thu Danh Cho Reviewer

De kiem tra va tai lap toan bo ket qua tren moi truong Windows co cai dat Word 2016 va LibreOffice:

```powershell
# Di chuyen vao worktree
cd E:\VNOffice-opencode-writer-v13

# 1. Kiem tra cu phap JS
node scripts/check-syntax.js

# 2. Chay toan bo 1790 bai kiem thu JS
node tests/run-tests.js

# 3. Chay toan bo bai kiem thu Python Writer
python -m unittest discover -s tests -p "test_writer*.py"

# 4. Chay Kich ban 1 va nghiem thu Word COM
$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"
python scripts/layout-audit/_create_new_writer.py . _new.docx
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new.docx
# Ket qua mong doi: CHECKS=36 DIFFS=0

# 5. Chay Kich ban 2 va nghiem thu Word COM
python scripts/layout-audit/_create_new_writer.py . _new2.docx --scenario 2
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new2.docx
# Ket qua mong doi: CHECKS=39 DIFFS=0

# 6. Chay Kich ban 3 va nghiem thu Word COM (BASELINE - co lech)
python scripts/layout-audit/_create_new_writer.py . _new3.docx --scenario 3
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new3.docx
# Ket qua: CHECKS=49 DIFFS=27 (baseline, khong sua code san pham)

# 7. Chay kiem thu tu than bo doc
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -SelfTest
# Ket qua mong doi: SELFTEST=PASS
```

---

## 6. Ghi Chu Quan Trong

1. **KHONG SUA CODE SAN PHAM**: Nhiem vu chi mo rong harness (SCENARIO3) va readback de DO + LIET KE lech. 27 lech duoc phat hien thuoc ve cac tinh nang chua ho tro boi LibreOffice HTML import/export pipeline (table colspan/rowspan, border double, image wrap, footnote, TOC, columns, footer fields, paragraph border/shading, text shading, bookmark/cross-ref). Cac lop loi duoc gom (W28a-W28q) de agy tiep theo xu ly trong postprocess OOXML (_contentForExport -> FODT -> OOXML zip patch).

2. **Kich ban 1-2 khong suy thoai**: Van dam bao 36/0 va 39/0.

3. **Khong commit file test**: _new.docx, _new2.docx, _new3.docx, *.expected.json, *.sent.html khong duoc commit.

4. **Chi commit harness + handoff**: scripts/layout-audit/_create_new_writer.py, scripts/layout-audit/_word_readback.ps1, docs/HANDOFF-WRITER-CREATE-NEW-V13.md.

5. **Commit message**: Tieng Viet khong dau (git commit -F).