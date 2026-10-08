# Audit RB-D1 — VN Writer, tab Trang đầu

Ngày kiểm tra: 08/10/2026  
Baseline: `ace3271c`; các fix tiếp quản: `68d017c2`, `e4b63e39`, `4f9a86c1`  
Đặc tả: `tests/live/ribbon-specs/doc-home.json` (53 control/mục con)  
Harness: `scripts/audit-0610/ribbon_functional.mjs`  
Bằng chứng ngoài Git: `E:\VNOffice-profiles\ribbon-shots\doc-home-rbd1-complete\`

## Phương pháp và kết quả tổng

Harness dùng CDP mouse click thật, không SendKeys/OS input; mỗi mục reset cùng tài liệu mẫu, chụp ảnh trước/sau, kiểm tra trạng thái DOM và lưu DOCX để đọc XML khi đặc tả có `xml`. Harness chạy **2 lượt liên tiếp**, cùng 53 mục:

- VN Writer: **53/53 ĐÚNG ở lượt 1, 53/53 ĐÚNG ở lượt 2**; kết quả ổn định (`stable=true`).
- Word COM oracle: **53/53 có kết luận**; các mục UI không có phép đo COM một-một được ghi **CHẶN**, không tính là PASS giả.
- Không có lỗi FAIL/BLOCKED trong lần chạy cuối. `audit-results.json` ghi thời điểm `2026-10-08T05:03:59.454Z`.
- `Tiếp tục đánh số` được chạy riêng thêm 5 lần để kiểm tra nhiễu timing: **5/5 PASS**.

Quy ước: `ĐÚNG` = hiệu quả app đúng; `XML` = bằng chứng DOCX (`PASS`/`N/A`); `Word` = `ĐÚNG` qua COM hoặc `CHẶN` với lý do rõ ràng. Tên ảnh trong bảng là ảnh `-truoc.png` và `-sau.png` cùng basename.

## Bảng kết quả từng mục

| # | commandId (args) | Nhãn | Hiệu quả app | XML DOCX | Word COM | Ảnh sau |
|---:|---|---|---|---|---|---|
| 1 | `common.edit.paste` | Dán | ĐÚNG — chèn nội dung vào vùng chọn | N/A | ĐÚNG | `common.edit.paste-sau.png` |
| 2 | `common.edit.cut` | Cắt | ĐÚNG — xóa vùng chọn | N/A | ĐÚNG | `common.edit.cut-sau.png` |
| 3 | `common.edit.copy` | Sao chép | ĐÚNG — bản sao xuất hiện đúng vị trí | N/A | ĐÚNG | `common.edit.copy-sau.png` |
| 4 | `common.edit.formatPainter` | Sao chép định dạng | ĐÚNG — định dạng đậm được áp dụng cho đích | N/A | ĐÚNG | `common.edit.formatPainter-sau.png` |
| 5 | `writer.edit.pasteSpecial` | Dán đặc biệt | ĐÚNG — mở hộp thoại và có các lựa chọn dán | N/A | CHẶN — hộp thoại UI không có phép COM tương đương | `writer.edit.pasteSpecial-sau.png` |
| 6 | `writer.font.family` | Phông chữ | ĐÚNG — Calibri | PASS — `w:rFonts` | ĐÚNG — Name=Calibri | `writer.font.family-sau.png` |
| 7 | `writer.font.size` | Cỡ chữ | ĐÚNG — 16 pt | PASS — `w:sz` | ĐÚNG — Size=16 | `writer.font.size-sau.png` |
| 8 | `writer.font.grow` | Tăng cỡ chữ | ĐÚNG — 14 → 15 pt | PASS — `w:sz` | ĐÚNG — 11 → 12 | `writer.font.grow-sau.png` |
| 9 | `writer.font.shrink` | Giảm cỡ chữ | ĐÚNG — 14 → 12 pt | PASS — `w:sz` | ĐÚNG — 18 → 16 | `writer.font.shrink-sau.png` |
| 10 | `writer.text.bold` | Đậm | ĐÚNG — `font-weight:700` | PASS — `w:b` | ĐÚNG — Bold=-1 | `writer.text.bold-sau.png` |
| 11 | `writer.text.italic` | Nghiêng | ĐÚNG — italic | PASS — `w:i` | ĐÚNG — Italic=-1 | `writer.text.italic-sau.png` |
| 12 | `writer.text.underline` | Gạch chân | ĐÚNG — bật/tắt đúng; `aria-pressed` tắt sau lần 2 | PASS — `w:u` | ĐÚNG — Underline=1 | `writer.text.underline-sau.png` |
| 13 | `writer.text.strike` | Gạch ngang | ĐÚNG — line-through | PASS — `w:strike` | ĐÚNG — Strike=-1 | `writer.text.strike-sau.png` |
| 14 | `writer.text.subscript` | Chỉ số dưới | ĐÚNG — subscript | PASS — `w:vertAlign` | ĐÚNG — Subscript=-1 | `writer.text.subscript-sau.png` |
| 15 | `writer.text.superscript` | Chỉ số trên | ĐÚNG — superscript | PASS — `w:vertAlign` | ĐÚNG — Superscript=-1 | `writer.text.superscript-sau.png` |
| 16 | `writer.text.changeCase` | Đổi chữ hoa/thường | ĐÚNG — beta → BETA | N/A | ĐÚNG — BETA | `writer.text.changeCase-sau.png` |
| 17 | `writer.text.clearFormat` | Xóa định dạng | ĐÚNG — bỏ định dạng inline | N/A | ĐÚNG — Bold=0, Name=Calibri | `writer.text.clearFormat-sau.png` |
| 18 | `writer.color.highlight` | Màu nền chữ | ĐÚNG — vàng `rgb(255,205,0)` | PASS — `w:highlight` | ĐÚNG — Highlight=7 | `writer.color.highlight-sau.png` |
| 19 | `writer.color.text` | Màu chữ | ĐÚNG — đổi sang `rgb(220,38,38)` | PASS — `w:color` | ĐÚNG — Color=255 | `writer.color.text-sau.png` |
| 20 | `writer.list.bullet` | Dấu đầu dòng | ĐÚNG — tạo `UL` | PASS — `w:numPr` | ĐÚNG — ListType=2 | `writer.list.bullet-sau.png` |
| 21 | `writer.list.numbered` | Đánh số | ĐÚNG — tạo `OL` | PASS — `w:numPr` | ĐÚNG — ListType=3 | `writer.list.numbered-sau.png` |
| 22 | `writer.para.multilevelList` | Đa cấp (nút cha) | ĐÚNG — mở menu | N/A | CHẶN — nút cha chỉ mở menu | `writer.para.multilevelList-sau.png` |
| 23 | `writer.para.multilevelList:decimal` | 1./1.1./1.1.1. | ĐÚNG — class `vno-ml-decimal` | PASS — `w:numPr` | ĐÚNG — Level=1 | `writer.para.multilevelList-decimal-sau.png` |
| 24 | `writer.para.multilevelList:letter` | 1./a./i. | ĐÚNG — class `vno-ml-letter` | PASS — `w:numPr` | ĐÚNG — Level=1 | `writer.para.multilevelList-letter-sau.png` |
| 25 | `writer.para.multilevelList:nd30` | Điều 1./1./a) | ĐÚNG — class `vno-ml-nd30` | PASS — `w:numPr` | CHẶN — Word COM không có mẫu NĐ30 tương đương | `writer.para.multilevelList-nd30-sau.png` |
| 26 | `writer.para.indentDec` | Giảm thụt lề | ĐÚNG — 36 → 0 | PASS — `w:ind` | ĐÚNG — LeftIndent=36→0 | `writer.para.indentDec-sau.png` |
| 27 | `writer.para.indentInc` | Tăng thụt lề | ĐÚNG — tạo blockquote 40 px | PASS — `w:ind` | ĐÚNG — LeftIndent=0→36 | `writer.para.indentInc-sau.png` |
| 28 | `writer.para.sort` | Sắp xếp | ĐÚNG — Alpha, beta, Zulu | N/A | ĐÚNG — thứ tự đúng | `writer.para.sort-sau.png` |
| 29 | `writer.para.showFormattingMarks` | Hiện/ẩn ký tự định dạng | ĐÚNG — bật marks và trạng thái nút | N/A | ĐÚNG — ShowAll=True | `writer.para.showFormattingMarks-sau.png` |
| 30 | `writer.list.restartNumbering` | Tùy chọn danh sách (nút cha) | ĐÚNG — mở menu | N/A | CHẶN — nút cha chỉ mở menu | `writer.list.restartNumbering-sau.png` |
| 31 | `writer.list.restartNumbering` | Đánh số lại từ 1 | ĐÚNG — `ol start="1"` | PASS — `w:numPr` | ĐÚNG — String=1. | `writer.list.restartNumbering-sau.png` |
| 32 | `writer.list.continueNumbering` | Tiếp tục đánh số | ĐÚNG — danh sách tiếp tục | PASS — `w:numPr` | ĐÚNG — String=2. | `writer.list.continueNumbering-sau.png` |
| 33 | `writer.para.alignLeft` | Căn trái | ĐÚNG — left | PASS — `w:jc` | ĐÚNG — Alignment=0 | `writer.para.alignLeft-sau.png` |
| 34 | `writer.para.alignCenter` | Căn giữa | ĐÚNG — center | PASS — `w:jc` | ĐÚNG — Alignment=1 | `writer.para.alignCenter-sau.png` |
| 35 | `writer.para.alignRight` | Căn phải | ĐÚNG — right | PASS — `w:jc` | ĐÚNG — Alignment=2 | `writer.para.alignRight-sau.png` |
| 36 | `writer.para.justify` | Căn đều | ĐÚNG — justify | PASS — `w:jc` | ĐÚNG — Alignment=3 | `writer.para.justify-sau.png` |
| 37 | `writer.para.lineSpacing` | Giãn dòng (nút cha) | ĐÚNG — mở menu | N/A | CHẶN — nút cha chỉ mở menu | `writer.para.lineSpacing-sau.png` |
| 38 | `writer.para.spacing1` | Giãn dòng 1,0 | ĐÚNG — `--vno-lh:1` | PASS — `w:spacing` | ĐÚNG — Rule=0 | `writer.para.spacing1-sau.png` |
| 39 | `writer.para.spacing15` | Giãn dòng 1,5 | ĐÚNG — `--vno-lh:1.5` | PASS — `w:spacing` | ĐÚNG — Rule=1 | `writer.para.spacing15-sau.png` |
| 40 | `writer.para.spacing2` | Giãn dòng 2,0 | ĐÚNG — `--vno-lh:2` | PASS — `w:spacing` | ĐÚNG — Rule=2 | `writer.para.spacing2-sau.png` |
| 41 | `writer.para.lineSpacing:1.15` | Giãn dòng 1,15 | ĐÚNG — `--vno-lh:1.15` | PASS — `w:spacing` | ĐÚNG — Rule=5 | `writer.para.lineSpacing-1.15-sau.png` |
| 42 | `writer.para.lineSpacing:exact` | Giãn dòng chính xác | ĐÚNG — mở hộp nhập pt | N/A | CHẶN — hộp nhập UI không có COM tương đương | `writer.para.lineSpacing-exact-sau.png` |
| 43 | `writer.para.shading` | Tô nền đoạn | ĐÚNG — nền `rgb(255,242,204)` | PASS — `w:shd` | ĐÚNG — Shading=10092543 | `writer.para.shading-sau.png` |
| 44 | `writer.para.borders` | Viền đoạn | ĐÚNG — border solid | PASS — `w:pBdr` | ĐÚNG — Borders=-1 | `writer.para.borders-sau.png` |
| 45 | `writer.format.paragraphDialog` | Mở rộng Đoạn văn | ĐÚNG — mở dialog và các tab | N/A | CHẶN — dialog UI không mở trong COM ẩn; thuộc tính con đã đối chiếu riêng | `writer.format.paragraphDialog-sau.png` |
| 46 | `writer.style.gallery` | Thư viện kiểu | ĐÚNG — mở gallery | N/A | CHẶN — gallery VN không ánh xạ một-một với Word | `writer.style.gallery-sau.png` |
| 47 | `writer.style.apply:title` | Kiểu nhanh Tiêu đề | ĐÚNG — class `vno-style-title` | PASS — `w:pStyle` | CHẶN — preset VN tùy biến | `writer.style.apply-title-sau.png` |
| 48 | `writer.style.apply:normal` | Kiểu nhanh Normal | ĐÚNG — trả về đoạn thường | N/A | CHẶN — Normal VN có mặc định NĐ30 riêng | `writer.style.apply-normal-sau.png` |
| 49 | `writer.style.apply:h1` | Kiểu nhanh Tiêu đề 1 | ĐÚNG — tạo `h1` | PASS — `w:pStyle` | CHẶN — preset VN tùy biến | `writer.style.apply-h1-sau.png` |
| 50 | `common.edit.find` | Tìm kiếm | ĐÚNG — panel mở và tìm thấy Beta | N/A | ĐÚNG — Found=True | `common.edit.find-sau.png` |
| 51 | `common.edit.replace` | Thay thế | ĐÚNG — thay Beta → BETA | N/A | ĐÚNG — nội dung thay đúng | `common.edit.replace-sau.png` |
| 52 | `writer.edit.select` | Chọn (nút cha) | ĐÚNG — mở menu | N/A | CHẶN — nút cha chỉ mở menu | `writer.edit.select-sau.png` |
| 53 | `common.edit.selectAll` | Chọn tất cả | ĐÚNG — chọn đủ tài liệu | N/A | ĐÚNG — SelectedLength=27 | `common.edit.selectAll-sau.png` |

## Sửa lỗi trong lượt audit

1. `68d017c2` sửa đồng bộ trạng thái Gạch chân theo định dạng vùng chọn thực tế thay vì chỉ tin `queryCommandState` của Chromium.
2. `e4b63e39` sửa `_readInlineCommandState`: marker chính tả `.vno-spelling-uncertain` có CSS underline riêng, không được coi là định dạng tài liệu; thêm regression test.
3. `4f9a86c1` sửa harness đo Gạch chân theo DOM thật để không báo FAIL giả khi Chromium giữ `queryCommandState` cũ; thêm kiểm thử 5× cho Tiếp tục đánh số.

## Đối chiếu phạm vi Word

Trong phạm vi tab Trang đầu Word desktop dùng cho oracle, mọi thao tác tương ứng trong 53 mục đều có kết luận; không có mục chức năng nào trong đặc tả bị thiếu. Các mục ghi CHẶN là nút cha mở menu hoặc UI/preset VN không có phép COM Word ẩn tương đương, không phải lỗi chức năng. Những tính năng Word hiện đại ngoài baseline Word COM (ví dụ Editor/Dictate) không được tính vào 53 mục của ticket này và cần ticket riêng nếu chủ sở hữu yêu cầu.

## Handoff

- Bằng chứng JSON: `E:\VNOffice-profiles\ribbon-shots\doc-home-rbd1-complete\audit-results.json`.
- Ảnh không commit theo quy định ticket; có đủ basename `-truoc.png`/`-sau.png` cho các mục trong bảng.
- Không sửa LibreOffice Core, không thêm dependency, không dùng server Node cho production.

## Regression sau audit

- `node tests/run-tests.js`: **2957/2957 PASS, 0 FAIL**.
- `python -m unittest discover -s tests`: **793 tests, OK, skipped=1, EXIT_CODE=0** (439.928s).
- `git diff --check`: PASS.
- Test unit riêng `writer-ribbon-breadth`: PASS.
