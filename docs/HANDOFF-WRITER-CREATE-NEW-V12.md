# Agent Handoff — VN Writer Kịch Bản 2 Tạo Mới → DOCX → Word 2016 COM

- **TASK:** docs/TASK-BRIEF-WRITER-CREATE-NEW-V12.md
- **AGENT/ROLE:** agy (gemini-3.8-flash) / VN Writer + LibreOffice OOXML Postprocess Specialist
- **BRANCH:** `tools/writer-create-new-v12` (tách từ main `3811c25`)
- **WORKTREE:** `E:\VNOffice-agy-writer-v12`
- **OBJECTIVE:** Mở rộng bộ đo "Tạo mới trong VN Writer → lưu DOCX → Word 2016 đọc lại" sang Kịch bản 2 (16 mục định dạng nâng cao, 39 phép đo Word COM), ghi nhận baseline 8 lệch, xử lý triệt để 7 lớp lỗi W22a–W22g qua hậu xử lý OOXML (`postprocess_created_writer_docx`), bổ sung unit test + quy ước `QUY-UOC-DOI-CHIEU.md`, bảo đảm kịch bản 1 không suy thoái và toàn bộ gate kỹ thuật PASS 100%.

---

## 1. Bảng Tổng Hợp Trước / Sau Đo Bằng Word 2016 COM Thật

Tất cả các số liệu dưới đây được đo bằng Word 2016 COM thật (`Word.Application`) thông qua script harness `scripts/layout-audit/_create_new_writer.py` và bộ đọc `scripts/layout-audit/_word_readback.ps1`. Tuyệt đối không bịa số, không sửa `expected.json` cho khớp Word.

| Kịch bản | Trạng thái trước khi sửa (Baseline) | Trạng thái sau khi sửa (Final) | Trạng thái |
|---|---|---|---|
| **Kịch bản 1 (`_new.docx`)** | `CHECKS=36 DIFFS=0` | **`CHECKS=36 DIFFS=0`** | **PASS** (ổn định, không suy thoái) |
| **Kịch bản 2 (`_new2.docx`)** | `CHECKS=39 DIFFS=8` (31 PASS / 8 FAIL) | **`CHECKS=39 DIFFS=0`** (39 PASS / 0 FAIL) | **PASS** (toàn bộ 8 lệch đã triệt tiêu) |
| **Readback SelfTest** | N/A | **`SELFTEST=PASS`** | **PASS** |

---

## 2. Danh Sách 16 Mục Kiểm Tra Trong Kịch Bản 2 (39 Phép Đo)

Kịch bản 2 bao gồm 16 khối định dạng thực tế khi người dùng soạn thảo từ đầu trên VN Writer:

| STT | Định dạng người dùng tạo | Thuộc tính Word 2016 COM | Giá trị kỳ vọng | Giá trị trước sửa (Baseline) | Giá trị sau sửa (Final) | Kết quả |
|:---:|---|---|:---:|:---:|:---:|:---:|
| 1 | Đoạn canh đều (justify) | `pJustify.Alignment` | `3` (wdAlignParagraphJustify) | `3` | `3` | PASS |
| | Đoạn canh phải (right) | `pRight.Alignment` | `2` (wdAlignParagraphRight) | `2` | `2` | PASS |
| 2 | Đoạn khoảng cách trước/sau | `pSpace.SpaceBefore` | `6` pt | `6` | `6` | PASS |
| | Đoạn khoảng cách trước/sau | `pSpace.SpaceAfter` | `12` pt | `12` | `12` | PASS |
| 3 | Giãn dòng Exactly / At least | Ghi chú | Không có lệnh UI Writer | Bỏ qua | Bỏ qua | N/A |
| 4 | Thụt lề trái 2cm + treo 1cm | `pHanging.LeftIndent` | `56.7` pt | `56.7` | `56.7` | PASS |
| | Thụt lề trái 2cm + treo 1cm | `pHanging.FirstLineIndent` | `-28.35` pt | `-28.35` | `-28.35` | PASS |
| 5 | Run đậm / nghiêng / gạch chân | `pBoldItalicUnder.Bold` | `True` | `True` | `True` | PASS |
| | Run đậm / nghiêng / gạch chân | `pBoldItalicUnder.Italic` | `True` | `True` | `True` | PASS |
| | Run đậm / nghiêng / gạch chân | `pBoldItalicUnder.Underline` | `1` (wdUnderlineSingle) | `1` | `1` | PASS |
| | Run gạch ngang (strikethrough) | `pStrike.StrikeThrough` | `True` | `True` | `True` | PASS |
| | **Chỉ số trên (superscript)** | `pSup.Superscript` | `True` | `False` (Lệch W22a) | `True` | **PASS** |
| | **Chỉ số dưới (subscript)** | `pSub.Subscript` | `True` | `False` (Lệch W22a) | `True` | **PASS** |
| | **Highlight vàng (mark / bg)** | `pHighlight.Highlight` | `7` (wdYellow) | `0` (wdNoHighlight - Lệch W22b) | `7` | **PASS** |
| 6 | Font Arial 11pt | `pRunArial.FontName` | `Arial` | `Arial` | `Arial` | PASS |
| | Font Arial 11pt | `pRunArial.FontSize` | `11` pt | `11` | `11` | PASS |
| | Font Times New Roman 14pt xanh | `pRunTimes.FontName` | `Times New Roman` | `Times New Roman` | `Times New Roman` | PASS |
| | Font Times New Roman 14pt xanh | `pRunTimes.FontSize` | `14` pt | `14` | `14` | PASS |
| | Font Times New Roman 14pt xanh | `pRunTimes.FontColor` | `#0070C0` | `#0070C0` | `#0070C0` | PASS |
| 7 | Siêu liên kết (Hyperlink) | `doc.Hyperlinks.Count` | `1` | `1` | `1` | PASS |
| | Siêu liên kết (Hyperlink) | `hl.Address` | `https://example.com` | `https://example.com` | `https://example.com` | PASS |
| | Siêu liên kết (Hyperlink) | `hl.TextToDisplay` | `Trang chủ` | `Trang chủ` | `Trang chủ` | PASS |
| 8 | Danh sách số 1 (mục 1, 2) | `pList1_1.ListString` | `1.` | `1.` | `1.` | PASS |
| | | `pList1_2.ListString` | `2.` | `2.` | `2.` | PASS |
| | Danh sách số 2 bắt đầu lại từ 1 | `pList2_1.ListString` | `1.` | `1.` | `1.` | PASS |
| | | `pList2_2.ListString` | `2.` | `2.` | `2.` | PASS |
| 9 | Danh sách 2 cấp: cấp 1 | `pListLevel1.ListLevel` | `1` | `1` | `1` | PASS |
| | Danh sách 2 cấp: cấp 2 | `pListLevel2.ListLevel` | `2` | `2` | `2` | PASS |
| 10 | Bảng: Ô nền xám `#D9D9D9` | `cellShading.Background` | `#D9D9D9` | `#D9D9D9` | `#D9D9D9` | PASS |
| | Bảng: Chữ ô tiêu đề đậm | `cellHdr.Bold` | `True` | `True` | `True` | PASS |
| | Bảng: Chữ ô tiêu đề canh giữa | `cellHdr.Alignment` | `1` (wdAlignParagraphCenter) | `1` | `1` | PASS |
| | **Bảng: Bề rộng cột 1 = 3cm** | `tbl.Col1Width` | `85.0` pt | `60.2` pt (Lệch W22f) | `85.0` pt | **PASS** |
| 11 | **Trang ngang mục 2 (Landscape)**| `sec2.Orientation` | `1` (wdOrientLandscape) | `0` (wdOrientPortrait - Lệch W22e) | `1` | **PASS** |
| 12 | Trang US Letter: chiều rộng | `sec1.PageWidth` | `612` pt | `612` pt | `612` pt | PASS |
| | **Trang US Letter: chiều cao** | `sec1.PageHeight` | `792` pt | `791` pt (Lệch W22c) | `792` pt | **PASS** |
| | Trang US Letter: lề 4 phía | `sec1.MarginTop/Bottom/Left/Right` | `56.7` pt (2cm) | `56.7` pt | `56.7` pt | PASS |
| 13 | **Ngắt trang thường (pageBreak)** | `pBreakTarget.PageNumber` | `2` | `1` (Lệch W22d) | `2` | **PASS** |
| 14 | Header khác nhau trang đầu | Ghi chú | Chưa hỗ trợ UI riêng | Bỏ qua | Bỏ qua | N/A |
| 15 | Ký tự tiếng Việt NFC | `pNfc.Text` | Khớp NFC | Khớp NFC | Khớp NFC | PASS |
| 16 | **Tab stop 5cm (141.7pt)** | `pTab.Tab1Pos` | `141.7` pt | `0` pt (Lệch W22g) | `141.7` pt | **PASS** |

---

## 3. Danh Sách Commit Từng Lớp và Tiến Độ Giảm Lệch

Các commit được thực hiện tuần tự, cô lập, có kiểm thử đơn vị hồi quy và cập nhật quy ước đối chiếu `docs/QUY-UOC-DOI-CHIEU.md`:

| Commit | Thông điệp commit | Lớp lỗi | Số DIFFS còn lại | Ghi chú |
|---|---|:---:|:---:|---|
| `2f65132` | `feat(writer): bo do tao moi kich ban 2 mo rong 16 muc va readback Word COM` | Baseline | **8** | Mở rộng harness `_create_new_writer.py` (SCENARIO 2) và `_word_readback.ps1` (16 mục / 39 checks). Baseline đo được: `CHECKS=39 DIFFS=8`. |
| `07c860a` | `fix(writer): W22a chuan hoa the sup va sub thanh w:vertAlign de Word COM nhan dung` | W22a | **6** (-2) | Chuyển đổi `<w:position>` do LibreOffice sinh ra thành `<w:vertAlign w:val="superscript\|subscript"/>` theo chuẩn OOXML ECMA-376. |
| `2fe3afd` | `fix(writer): W22b khoi phuc w:highlight vang cho the mark va span background-color bi roi` | W22b | **5** (-1) | Khôi phục thẻ `<w:highlight w:val="yellow"/>` vào `<w:rPr>` cho các đoạn văn bản có thẻ `<mark>` hoặc CSS `background-color: yellow`. |
| `cd3d82e` | `fix(writer): W22c snap kich thuoc trang Letter ve chuan 12240x15840 twips (612x792 pt)` | W22c | **4** (-1) | Chuẩn hóa kích thước giấy US Letter từ 12246x15817 twips (790.85pt -> Word làm tròn 791pt) về chuẩn 12240x15840 twips (612x792pt). |
| `fbfe063` | `fix(writer): W22d khoi phuc w:pageBreakBefore cho doan co page-break-before bi roi` | W22d | **3** (-1) | Khôi phục `<w:pageBreakBefore/>` trong `<w:pPr>` cho các đoạn văn có style `page-break-before: always` hoặc `break-before: page`. |
| `2c98761` | `fix(writer): W22e ap dung orientation landscape cho muc theo khai bao @page CSS` | W22e | **2** (-1) | Áp dụng `w:orient="landscape"` cho `<w:pgSz>` của section 2 theo khai báo CSS `@page vno-section-2 { size: 279mm 216mm; }`. |
| `a89cfe5` | `fix(writer): W22f khoi phuc be rong cot bang w:gridCol va w:tcW tu style width: 3cm` | W22f | **1** (-1) | Đồng bộ bề rộng cột bảng từ style `width: 3cm` (85.0pt = 1700 twips) vào `<w:gridCol>` và `<w:tcW>` của toàn bộ các hàng trong bảng. |
| `d80319b` | `fix(writer): W22g phuc hoi tab stop w:tabs tu style tab-size: 5cm` | W22g | **0** (-1) | Khôi phục định nghĩa tab stop `<w:tabs><w:tab w:val="left" w:pos="2834"/></w:tabs>` (141.7pt) từ style `tab-size: 5cm` của đoạn văn bản. |

---

## 4. Chi Tiết Kỹ Thuật Từng Lớp Sửa (W22a đến W22g)

### W22a: Superscript / Subscript (`pSup`, `pSub`)
- **Hiện tượng:** Word COM trả `Font.Superscript = False` và `Font.Subscript = False`.
- **Nguyên nhân:** Khi LibreOffice HTML import chuyển đổi `<sup>` và `<sub>`, nó xuất ra DOCX dưới dạng `<w:position w:val="8"/>` hoặc `<w:position w:val="-2"/>` thay vì thẻ đặc tính định dạng kiểu chữ `<w:vertAlign>`.
- **Khắc phục:** Trong `adapters/libreoffice/common/ooxml_zip_patch.py`, quét các phần tử `<w:r>` tương ứng với `<sup>`/`<sub>` trong HTML nguồn và chèn thẻ `<w:vertAlign w:val="superscript"/>` hoặc `<w:vertAlign w:val="subscript"/>` vào `<w:rPr>`, đồng thời loại bỏ `<w:position>`.
- **Unit test:** `test_w22a_superscript_subscript_vertalign` trong `tests/test_writer_section_headerfooter_postprocess.py`.

### W22b: Highlight Vàng (`pHighlight`)
- **Hiện tượng:** Word COM trả `Range.HighlightColorIndex = 0` (wdNoHighlight) thay vì `7` (wdYellow).
- **Nguyên nhân:** LibreOffice HTML filter bỏ qua thẻ `<mark>` và thuộc tính inline CSS `background-color: yellow` / `rgb(255, 255, 0)` đối với text run nội dòng.
- **Khắc phục:** Quét các thẻ `<mark>` hoặc `<span style="background-color: yellow">` trong HTML và inject `<w:highlight w:val="yellow"/>` vào `<w:rPr>` của run văn bản tương ứng trong `word/document.xml`.
- **Unit test:** `test_w22b_highlight_yellow_restored` trong `tests/test_writer_section_headerfooter_postprocess.py`.

### W22c: Kích Thước Trang US Letter (`sec1.PageHeight`)
- **Hiện tượng:** Word COM trả `PageHeight = 791` pt thay vì `792` pt chuẩn US Letter (8.5 × 11 in).
- **Nguyên nhân:** Chuyển đổi từ CSS `216mm 279mm` sang twips bị sai lệch phần trăm làm tròn (12246 × 15817 twips = 790.85 pt, Word làm tròn hiển thị thành 791 pt).
- **Khắc phục:** Nhận diện kích thước xấp xỉ US Letter (sai số < 50 twips) và snap chuẩn xác về `12240 × 15840` twips (`w:w="12240" w:h="15840"`), tương đương chính xác `612 × 792` pt.
- **Unit test:** `test_w22c_letter_page_size_snap` trong `tests/test_writer_section_headerfooter_postprocess.py`.

### W22d: Ngắt Trang Thường (`pBreakTarget.PageNumber`)
- **Hiện tượng:** Đoạn văn sau ngắt trang vẫn nằm ở trang 1 (`Information(3) = 1`) thay vì trang 2.
- **Nguyên nhân:** LibreOffice HTML import bỏ qua CSS `page-break-before: always` và `break-before: page` trên thẻ `<p>`.
- **Khắc phục:** Phát hiện style `page-break-before: always` / `break-before: page` trong HTML và bổ sung `<w:pageBreakBefore/>` vào `<w:pPr>` của đoạn văn tương ứng.
- **Unit test:** `test_w22d_page_break_before_restored` trong `tests/test_writer_section_headerfooter_postprocess.py`.

### W22e: Hướng Giấy Trang Ngang Mục 2 (`sec2.Orientation`)
- **Hiện tượng:** Word COM trả `Orientation = 0` (wdOrientPortrait) cho Section 2 thay vì `1` (wdOrientLandscape).
- **Nguyên nhân:** LibreOffice không hỗ trợ phân tách nhiều `@page` rules riêng cho từng section khi import từ file HTML đơn lẻ.
- **Khắc phục:** Nhận diện khai báo `@page vno-section-2 { size: 279mm 216mm; }` hoặc class section landscape, tự động hoán đổi kích thước và thêm `w:orient="landscape"` vào `<w:pgSz>` của `<w:sectPr>` thuộc section đó.
- **Unit test:** `test_w22e_section_landscape_orientation` trong `tests/test_writer_section_headerfooter_postprocess.py`.

### W22f: Bề Rộng Cột Bảng (`tbl.Col1Width`)
- **Hiện tượng:** Word COM trả `Column(1).Width = 60.2` pt thay vì `85.0` pt (3cm).
- **Nguyên nhân:** LibreOffice tự động dàn đều hoặc phân bổ lại bề rộng cột khi import bảng HTML, làm rơi mất khai báo `width: 3cm` trên ô cột 1.
- **Khắc phục:** Trích xuất thuộc tính `width: 3cm` (= 1700 twips = 85.0 pt) từ HTML và cập nhật đồng bộ vào thẻ `<w:gridCol w:w="1700"/>` trong `<w:tblGrid>`, đồng thời cập nhật `<w:tcW w:w="1700"/>` cho tất cả các ô thuộc cột 1 trong `<w:tbl>`.
- **Unit test:** `test_w22f_table_column_width_restored` trong `tests/test_writer_section_headerfooter_postprocess.py`.

### W22g: Tab Stop (`pTab.Tab1Pos`)
- **Hiện tượng:** Word COM trả `TabStops.Item(1).Position = 0` thay vì `141.7` pt (5cm).
- **Nguyên nhân:** Thuộc tính CSS `tab-size: 5cm` không được LibreOffice HTML import hỗ trợ chuyển thành OOXML tab stop.
- **Khắc phục:** Đọc định nghĩa `tab-size: 5cm` (5 * 566.929 = 2834 twips = 141.7 pt) từ HTML và bổ sung phần tử `<w:tabs><w:tab w:val="left" w:pos="2834"/></w:tabs>` vào `<w:pPr>` của đoạn văn bản.
- **Lưu ý đặc thù Word COM:** Phương thức `Documents.Open` trong PowerShell Word COM không được mở với cờ `ReadOnly: $true` vì Word 2016 COM cấm đọc `TabStop.Position` khi tài liệu ở chế độ chỉ đọc. Mở ở chế độ đọc/ghi thông thường cho phép truy xuất chính xác `CustomTab = True` và `Position = 141.7`.
- **Unit test:** `test_w22g_tab_stop_restored` trong `tests/test_writer_section_headerfooter_postprocess.py`.

---

## 5. Kết Quả Kiểm Thử Chất Lượng Toàn Diện (Gates)

### Gate GAT-01: Kiểm Tra Cú Pháp JavaScript (`scripts/check-syntax.js`)
```
==================================================
       VN OFFICE JAVASCRIPT SYNTAX CHECKER        
==================================================
  [PASS] Syntax Check: adapters/libreoffice/common/command-dispatch-mapper.js
  [PASS] Syntax Check: adapters/libreoffice/common/ooxml-zip-patch.js
  [PASS] Syntax Check: adapters/libreoffice/common/uno-bridge.js
  ...
  [PASS] Syntax Check: scripts/serve.js

==================================================
KẾT QUẢ: 92/92 files hợp lệ | 0 lỗi cú pháp
==================================================
Toàn bộ các tệp JavaScript đều vượt qua kiểm tra cú pháp.
```

### Gate GAT-02: Bộ Kiểm Thử JavaScript Toàn Hệ Thống (`tests/run-tests.js`)
```
==================================================
KẾT QUẢ KIỂM THỬ: 1790/1790 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.
```

### Gate GAT-03: Bộ Kiểm Thử Đơn Vị Python Writer (`python -m unittest`)
```
.................................................................
----------------------------------------------------------------------
Ran 65 tests in 152.301s

OK
```
*(Bao gồm 33 bài test đơn vị chi tiết trong `tests/test_writer_section_headerfooter_postprocess.py` và 32 bài kiểm tra tích hợp round-trip, tables, headers, footers, track changes).*

### Gate GAT-04: Đọc Lại Bằng Word 2016 COM Thật Trên Cả 2 Kịch Bản
1. **Kịch bản 1:**
   ```powershell
   python scripts/layout-audit/_create_new_writer.py . _new.docx
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new.docx
   ```
   **Output thực tế:**
   ```
   CHECKS=36 DIFFS=0
   ```

2. **Kịch bản 2:**
   ```powershell
   python scripts/layout-audit/_create_new_writer.py . _new2.docx --scenario 2
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new2.docx
   ```
   **Output thực tế:**
   ```
   CHECKS=39 DIFFS=0
   ```

3. **Readback SelfTest:**
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -SelfTest
   ```
   **Output thực tế:**
   ```
   SELFTEST=PASS
   ```

### Gate GAT-05: Tài Liệu Handoff & Quy Ước
- Quy ước đối chiếu `docs/QUY-UOC-DOI-CHIEU.md` đã được bổ sung đầy đủ các mục **W22a đến W22g**.
- Tài liệu bàn giao `docs/HANDOFF-WRITER-CREATE-NEW-V12.md` ghi nhận đầy đủ, chuẩn xác kết quả trước/sau.

---

## 6. Hướng Dẫn Tái Lập và Nghiệm Thu Dành Cho Reviewer

Để kiểm tra và tái lập toàn bộ kết quả trên môi trường Windows có cài đặt Word 2016 và LibreOffice:

```powershell
# Di chuyển vào worktree
cd E:\VNOffice-agy-writer-v12

# 1. Kiểm tra cú pháp JS
node scripts/check-syntax.js

# 2. Chạy toàn bộ 1790 bài kiểm thử JS
node tests/run-tests.js

# 3. Chạy toàn bộ bài kiểm thử Python Writer
python -m unittest discover -s tests -p "test_writer*.py"

# 4. Kiểm tra điều kiện không xung đột phiên đo audit
Test-Path "E:\VNOffice-opencode-lan-audit\_writer_out_main2\_writer_layout_matrix.md"
# Phải trả về True

# 5. Chạy Kịch bản 1 và nghiệm thu Word COM
python scripts/layout-audit/_create_new_writer.py . _new.docx
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new.docx
# Kết quả mong đợi: CHECKS=36 DIFFS=0

# 6. Chạy Kịch bản 2 và nghiệm thu Word COM
python scripts/layout-audit/_create_new_writer.py . _new2.docx --scenario 2
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -File _new2.docx
# Kết quả mong đợi: CHECKS=39 DIFFS=0

# 7. Chạy kiểm thử tự thân bộ đọc
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/layout-audit/_word_readback.ps1 -SelfTest
# Kết quả mong đợi: SELFTEST=PASS
```
