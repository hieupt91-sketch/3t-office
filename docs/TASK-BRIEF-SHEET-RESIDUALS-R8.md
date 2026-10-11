# Brief S17 — Lớp lệch còn lại của Sheet sau vòng 8 (19/9/2026)

Trạng thái: batch LAN 26 file trên main `d78ba1c`: Excel mở 26/26, lint sạch, 17 file 0 lệch. Còn lại (đo bằng
`python scripts/layout-audit/_batch_audit.py . <file>` + đọc `_audit_<file>.txt`):

| File | Lệch | Lớp (đã đo) |
|---|---|---|
| lan12 | value 2 | ô D46/D47: chuỗi gốc bắt đầu bằng `\r\n` ("\r\nBộ điện thoại…"), bản lưu mất dòng trống đầu → "Bộ điện thoại…". Auditor đã coi `\r\n` ≡ `\n`; lệch thật là **xuống dòng ĐẦU chuỗi bị mất** (FODS `<text:p/>` rỗng đầu tiên bị bỏ ở đâu đó trong app hoặc LibreOffice) |
| lan12 | columnWidth 2 | so `_cols_probe`: cột có `<col width>` gốc nhưng bản lưu lệch > 1 px — đo lại xem là làm tròn `chars_for` (S11) hay LibreOffice đổi |
| lan12 | image 6 | sheet có ảnh app chưa đụng nhưng S16 không nhận "chưa sửa": in `vno:image-id` trong `_rt_lan12.xlsx.sent.fods` và anchor gốc (`_image_probe.py lan12`) xem lệch ở số lượng hay id (gợi ý: ảnh `oneCellAnchor`/`absoluteAnchor`, ảnh trong `xdr:grpSp`, ảnh liên kết ngoài `r:link` có được `_parse_xlsx_drawing_images` đếm không) |
| lan15 | value 2, formula 2, font/fill/border/alignment 2 | ô C2/C15 gốc `<f>NA()</f><v>#N/A</v>` (t="e") → bản lưu KHÔNG có ô. LibreOffice nhập `=NA()` thành lỗi; app bỏ ô lỗi có công thức? Xem `_cellFromFodsAttributes` với `office:value-type="string" calcext:value-type="error"` + `table:formula` |
| lan15 | visibility 2 | tên sheet gốc `Comercial (bNB)_x0009_` (chứa TAB mã hoá `_x0009_`): bản lưu không có sheet này (đổi tên?) → hai sheet lệch. Quy ước: tên sheet giải mã `_xHHHH_` khi nhập, mã hoá lại khi lưu, hoặc giữ nguyên chuỗi |
| lan28 | columnWidth 7, value 3 | `66.82421875 → 64.99` (chars_for làm tròn 2 chữ số trên px lẻ?) và 3 ô value (in chi tiết) |
| lan20 | autoFilter 1 | vùng gốc `A3:F348` mất; đã sửa mất-sheet-cuối (90ff339) nên đo lại trước, nếu còn thì tìm nguyên nhân khác |
| lan02 | merge 1 | Excel `centerContinuous` A4:F4 (căn giữa qua các ô, KHÔNG gộp) bị LibreOffice nhập thành ô gộp. Quy ước: giữ `alignment horizontal="centerContinuous"` gốc và không ghi `<mergeCell>` cho vùng chỉ có centerContinuous — cần overlay khi mở (đánh dấu vùng) và hậu xử lý khi lưu |
| lan23 | visibility 1 | in chi tiết; nếu là sheet ẩn/`veryHidden` thì kiểm tra `state=` gốc có được giữ |

## Yêu cầu

- Mỗi lớp = một hàm/một chỗ sửa + unit test (JS trong `tests/unit/*.test.js` đăng ký vào `tests/run-tests.js`, Python
  `tests/test_sheet_*.py`), ghi quy ước vào `docs/QUY-UOC-DOI-CHIEU.md` (bảng Sheet, chỉ số đo, không tên file thật).
- Mọi chỉ số style từ file gốc đi qua `_SourceXfCopier`; không `re.sub` từng ô trên toàn bộ sheet; ô tự đóng `<c/>`.
- KHÔNG chạy `test_sheet_save_roundtrip` hay batch Sheet song song với tiến trình khác đang dùng soffice/Excel.

## Nghiệm thu (tôi đo lại)

`python -m unittest discover -s tests -p "test_sheet*.py"` PASS; `node scripts/check-syntax.js`; `node tests/run-tests.js`
không hồi quy (1778/1778); `python scripts/layout-audit/_batch_audit.py . lan12.xlsx lan15.xlsx lan28.xlsx lan20.xlsx lan02.xlsx lan23.xlsx`
→ dán `_batch_audit_report.md`: tổng 6 file từ 40 về ≤ 5, Excel OK, lint clean. Không có số đo thật thì không nhận.
