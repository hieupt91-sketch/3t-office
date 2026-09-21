# Brief R19 (opencode) — Bisect HTML để tìm vì sao LibreOffice nhân đôi bảng lồng của d09 khi lưu (W27b). CHỈ ĐO

R12/R13: d09 có bảng tài chính (35 ô, "Năm Tài Chính 2019 2020 2021…") nằm LỒNG trong `<td>` của bảng bố cục; tầng 2
(HTML `_contentForExport`) chỉ có 1 bản, tầng 3 (LibreOffice HTML→DOCX) có 2 bản y hệt ngay sau nhau. Cần biết thẻ/thuộc
tính nào của HTML gây nhân đôi để sửa đúng chỗ ở `_contentForExport`.

Worktree `E:\VNOffice-opencode-writer-r19` (branch `audit/writer-r19`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Mẫu `E:\VN OFice\file test\landocx\d09.docx`. Lấy `stage2_export.html` bằng `scripts/layout-audit/_saveback_stages.py`
(R12) hoặc mở app và `evaluate_js("window.__vnoAppInstance.adapter._contentForExport()")`.

## Bisect (script `scripts/layout-audit/_html_docx_bisect.py <wt> <html> <outdir>`)

Chuyển một HTML sang DOCX bằng đúng đường của app (`main._run_soffice_convert(html_path, "docx", tmp, app_kind="writer")`)
và đếm `<w:tbl>` (thẻ mở chính xác) trong `word/document.xml`. Bắt đầu từ `stage2_export.html` (mong đợi 3). Sau đó
cắt dần, mỗi bước 1 thay đổi, ghi (biến thể → số bảng):
1. Chỉ giữ bảng bố cục chứa bảng lồng (xoá mọi thứ khác trong `<body>`; giữ `<head>`).
2. Bỏ từng thuộc tính của `<table>` bố cục (`width`, `style`, `cellpadding`, `border`, `class`, `data-*`), rồi của `<td>`
   chứa bảng lồng, rồi của bảng lồng.
3. Thay bảng lồng bằng `<p>chữ</p>` (không còn nhân đôi?) và ngược lại bọc một bảng đơn giản 2×2 trong `<td>` của bảng
   2×1 tối giản (có nhân đôi không? — nếu CÓ thì là lỗi LibreOffice với mọi bảng lồng; nếu KHÔNG thì do thuộc tính).
4. Nếu do thuộc tính: biến thể tối thiểu gây nhân đôi (dán HTML ≤ 20 dòng) và biến thể tối thiểu KHÔNG gây (khác đúng
   1 thứ).
5. Thử thêm: cùng HTML nhưng LibreOffice xuất `odt` rồi `docx` (2 bước) có còn nhân đôi không.

Handoff `docs/HANDOFF-WRITER-R19.md`: bảng biến thể × số bảng, HTML tối thiểu gây/không gây, kết luận và đề xuất chỗ
sửa (thuộc tính nào cần bỏ/đổi trong `_contentForExport` hoặc cần hậu xử lý). Không sửa code sản phẩm, không bịa số,
không commit `file test`/output, không tên tài liệu thật. Commit script + handoff (`git commit -F`, tiếng Việt không dấu).
