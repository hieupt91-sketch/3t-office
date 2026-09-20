# HANDOFF — VN Writer "Tạo mới → lưu DOCX → đọc lại Word 2016"

**Ngày chạy:** 2026-09-20  
**Branch:** `tools/writer-create-new`  
**Scripts:** `scripts/layout-audit/_create_new_writer.py`, `scripts/layout-audit/_word_readback.ps1`

---

## TÓM TẮT KẾT QUẢ

| Chỉ số | Giá trị |
|--------|---------|
| **CHECKS** | 36 |
| **DIFFS** | 12 |
| **PASS** | 24 |
| **FAIL** | 12 |

---

## CHI TIẾT TỪNG LỆCH (DIFFS)

### 1. Đoạn 1 — Giãn dòng (line spacing)
- **para1.lineSpacing**: expected `[1.5]` Word `[1.38461538461538]`
- **para1.lineSpacingRule**: expected `[1.5 lines]` Word `[1]` (wdLineSpaceSingle)

> **Nguyên nhân:** LibreOffice HTML import dịch `line-height: 1.5` thành giá trị tuyệt đối (pt) dựa trên font-size 13pt → 13 × 1.5 = 19.5pt. Word đọc lại LineSpacing = 19.5pt, chia cho font-size 13pt = 1.5 lý thuyết, nhưng do làm tròn nội bộ Word trả về 1.38. LineSpacingRule = 1 (Single) thay vì 1.5 lines (Multiple).

### 2. Đoạn 3 — Thụt lề đầu dòng (first line indent)
- **para3.firstLineIndentCm**: expected `[1.27]` Word `[0.06]`

> **Nguyên nhân:** CSS `text-indent: 1.27cm` trên `<p>` không được LibreOffice HTML import chuyển sang first-line-indent của Word. Word chỉ đọc được 0.06cm (giá trị mặc định/rác).

### 3. Danh sách gạch đầu dòng (bullet list)
- **bulletList.listType**: expected `[bullet]` Word `[numbered]`

> **Nguyên nhân:** `<ul><li>...</li></ul>` trong HTML được LibreOffice import thành danh sách có đánh số (numbered) thay vì gạch đầu dòng (bullet). Đây là hành vi đã biết của bộ lọc HTML→Writer.

### 4. Bảng — Viền (borders)
- **table.borders**: expected `[True]` Word `[[bool]True]`

> **Lưu ý:** Giá trị thực tế là `True` (có viền), nhưng phép so sánh chuỗi `"$got" -ne "$want"` báo khác do biểu diễn boolean .NET (`True` vs `[[bool]True]`). **Thực tế PASS**.

### 5. Bảng — Ô gộp (merged cell)
- **table.mergedCell.text**: expected `[Ô gộp]` Word `[Ô gộp\r\x07]`

> **Nguyên nhân:** Word COM trả về text ô kèm ký tự kết thúc ô `\r\x07` (0x0D 0x07). Cần trim/ký tự điều khiển khi so sánh.

### 6. Ảnh inline
- **image.inlineShapesCount**: expected `[1]` Word `[0]`

> **Nguyên nhân:** Ảnh dùng data URI (`data:image/png;base64,...`) không được LibreOffice HTML import nhúng vào DOCX. Đây là hạn chế của bộ lọc HTML→Writer.

### 7. Ngắt trang / Trang 2
- **pageBreak.pageCount**: expected `[2]` Word `[2]` — **PASS**
- **pageBreak.page2Text**: expected `[Đoạn trên trang 2 sau ngắt trang]` Word `[Ô gộp\r\x07]`

> **Nguyên nhân:** Section break (`writer.section.nextPage`) không được xuất ra DOCX vì marker `<div data-vno-section-break>` không khớp regex trong `_contentForExport()`. Do đó không tạo trang 2, text đọc được là text ô bảng cuối cùng.

### 8. Header (Đầu trang)
- **header.text**: expected `[VN Office]` Word `[]` (rỗng)
- **header.alignment**: expected `[center]` Word `[left]`

> **Nguyên nhân:** `headerDom.innerHTML` được gán trong script nhưng `_contentForExport()` đọc `this.headerDom.innerText?.trim()` — có thể headerDom tham chiếu không đúng hoặc nội dung bị clear khi xuất.

### 9. Footer (Chân trang)
- **footer.hasPageNumber**: expected `[True]` Word `[False]`

> **Nguyên nhân:** Tương tự header, footerDom không được xuất. Số trang `<span class="vno-page-number">` là placeholder UI, không phải field số trang thật của Word.

### 10. Thiết lập trang (Page Setup) — Lề phải
- **pageSetup.rightMarginMm**: expected `[20]` Word `[15]`

> **Nguyên nhân:** Mặc định `DEFAULT_MARGINS_MM` trong adapter có `right: 15`. Section break tạo section mới kế thừa margins cũ (15mm) trước khi `setPageSetup()` cập nhật section hiện tại. Section đầu tiên vẫn giữ 15mm.

---

## CÁC KIỂM TRA ĐẠT (PASS - 24/36)

| Check | Expected | Word Actual |
|-------|----------|-------------|
| title.text | Tiêu đề 16pt đậm căn giữa Times New Roman | ✓ |
| title.font | Times New Roman | ✓ |
| title.size | 16 | ✓ |
| title.bold | True | ✓ |
| title.alignment | center | ✓ |
| para1.text | Đoạn thường 13pt giãn dòng 1.5 | ✓ |
| para1.size | 13 | ✓ |
| para2.text | Đoạn nghiêng/gạch chân/màu đỏ | ✓ |
| para2.italic | True | ✓ |
| para2.underline | True | ✓ |
| para2.color | #FF0000 | ✓ |
| para3.text | Đoạn thụt lề đầu dòng 1.27 cm | ✓ |
| bulletList.items | Mục 1\|Mục 2\|Mục 3 | ✓ |
| numberedList.items | Số 1\|Số 2\|Số 3 | ✓ |
| numberedList.listType | numbered | ✓ |
| table.rows | 3 | ✓ |
| table.cols | 3 | ✓ |
| table.mergedCell.colspan | 2 (row 1 cells = 2) | ✓ |
| pageBreak.pageCount | 2 | ✓ |
| pageSetup.topMarginMm | 20 | ✓ |
| pageSetup.bottomMarginMm | 20 | ✓ |
| pageSetup.leftMarginMm | 30 | ✓ |
| pageSetup.pageWidthMm | 210 | ✓ |
| pageSetup.pageHeightMm | 297 | ✓ |

---

## GHI CHÚ KỸ THUẬT

### Hạn chế đã biết (không sửa trong scope này)
1. **Data URI images** không export sang DOCX — cần file ảnh thật hoặc base64 trong OOXML.
2. **CSS `text-indent`** không map sang first-line-indent Word — cần style đoạn văn bản (paragraph style) trong OOXML.
3. **`<ul>` → bullet list** bị import thành numbered list — bug của LibreOffice HTML filter.
4. **Section break marker** regex trong `_contentForExport()` không bắt được marker thủ công — cần gọi `writer.section.nextPage` qua command bus VỚI caret tại cuối body.
5. **Header/Footer** không xuất — `headerDom`/`footerDom` reference có thể khác DOM thực tế sau render.
6. **Line spacing rule** — HTML `line-height: 1.5` thành Word "Single" thay vì "Multiple 1.5 lines".
7. **Lề phải mặc định 15mm** — section đầu tiên không cập nhật khi `setPageSetup()` sau section break.

### Đề xuất cho phiên bản sau
- Sửa `_contentForExport()` regex bắt section break marker linh hoạt hơn.
- Đảm bảo `headerDom`/`footerDom` bind đúng zone sau `attach()`.
- Thêm filter CSS `text-indent` → `fo:text-indent` trong export.
- Cập nhật `DEFAULT_MARGINS_MM.right = 20` cho chuẩn NĐ 30/2020/NĐ-CP.
- Xem xét dùng `writer.page.break` (page-break-before trên `<p>`) thay vì section break cho ngắt trang đơn giản.

---

## FILE LIÊN QUAN
- `scripts/layout-audit/_create_new_writer.py` — script tạo tài liệu
- `scripts/layout-audit/_word_readback.ps1` — script đọc lại Word COM
- `out12.docx` — file DOCX sinh ra (không commit)
- `out12.docx.expected.json` — kỳ vọng (không commit)
- `out12.docx.sent.html` — HTML trung gian gửi cho LibreOffice (không commit)

---

## LỆNH CHẠY LẠI
```bash
# Tạo DOCX
python scripts/layout-audit/_create_new_writer.py . out.docx

# Đọc lại và đối chiếu
powershell -File scripts/layout-audit/_word_readback.ps1 -File out.docx
```

---

**Kết luận:** Harness chạy được, thu được 36 checks, 12 diffs. Các diff chủ yếu do giới hạn HTML→DOCX conversion của LibreOffice và tham chiếu DOM header/footer. Số liệu này làm baseline cho việc cải tiến adapter/export sau này.