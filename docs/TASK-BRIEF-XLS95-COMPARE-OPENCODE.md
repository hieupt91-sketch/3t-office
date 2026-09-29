# TASK BRIEF — Công cụ so sánh .xls khi Excel không mở được (opencode)

Worktree: `E:\VNOffice-opencode-xls95-compare` (nhánh `audit/xls95-compare-opencode`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"` trước mọi lần chạy app/soffice.

## Vì sao
`scripts/layout-audit/_batch_xls_roundtrip.py` mở tệp .xls bằng VN Sheet, Lưu thành .xls, rồi dùng Excel 2016 COM so từng ô. Nhưng 5/20 tệp .xls thật (`E:\VN OFice\file test\lan-legacy\legacy05.xls`, `legacy09.xls`, `legacy14.xls`, `legacy17.xls`, `legacy18.xls` — gitignored, KHÔNG commit, KHÔNG sao chép vào repo) là định dạng cũ mà CHÍNH Excel 2016 từ chối mở ("Office has detected a problem with this file"), nên không so được.

## Việc (CHỈ công cụ đo, KHÔNG sửa code sản phẩm)
1. Viết `scripts/layout-audit/_xls_compare_libreoffice.py <a.xls> <b.xls>`: dùng LibreOffice headless (`main._run_soffice_convert`, profile riêng) chuyển CẢ HAI tệp sang FODS rồi đọc bằng thư viện chuẩn Python, so TỪNG Ô của TỪNG sheet: giá trị (số so với sai số 1e-9, chuỗi so chính xác), công thức (nếu có), kiểu giá trị. In `RESULT {"sheets":N,"cells":M,"diff":K,"examples":[...]}` giống định dạng dòng RESULT của `_compare_xls.ps1` trong `_batch_xls_roundtrip.py`.
2. Sửa `_batch_xls_roundtrip.py`: nếu Excel COM trả lỗi mở tệp GỐC, tự chuyển sang `_xls_compare_libreoffice.py` và ghi rõ cột "comparator: excel|libreoffice" trong báo cáo.
3. Chứng minh công cụ đúng: (a) so một tệp với CHÍNH NÓ → diff 0; (b) so `legacy01.xls` với `legacy02.xls` (khác nhau) → diff > 0; (c) trên một tệp Excel mở được (ví dụ `legacy03.xls` và bản lưu của nó), kết quả LibreOffice-comparator phải cùng kết luận với Excel-comparator.
4. Chạy `_batch_xls_roundtrip.py` cho 5 tệp trên với worktree này, ghi bảng kết quả.

## Kiểm chứng + bàn giao
Ghi `docs/HANDOFF-XLS95-COMPARE.md`: lệnh đã chạy, KẾT QUẢ THẬT (dán nguyên dòng RESULT), PASS/FAIL/NOT RUN trung thực. Claude sẽ tự chạy lại mọi lệnh bạn ghi — số liệu không khớp sẽ bị coi là bịa. `node tests/run-tests.js` foreground phải PASS. Commit từng bước, tiền tố `chore(audit): …`. Không merge vào `main`. Không chạy tác vụ ở nền rồi ngồi chờ.