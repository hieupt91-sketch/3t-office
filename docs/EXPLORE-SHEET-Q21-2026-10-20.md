# Nhật ký rà soát VN Sheet Q21 — 20/10/2026

## Phạm vi và cách chạy

Fixture bán hàng có 40 bản ghi × 8 cột (ngày, vùng, nhân viên, sản phẩm, số lượng, đơn giá, thành tiền, mã). Các thao tác giao diện được gửi bằng CDP qua chuột/bàn phím, mỗi phiên dùng `VNO_CDP_LOCALAPPDATA` riêng; kết quả XLSX được đọc bằng OOXML và mở lại trong phiên mới. Excel COM chỉ chạy ẩn ở chế độ ReadOnly. `CODEX-COMMON-RULES.md` không có trong worktree; `git merge main` báo đã cập nhật.

## Nhật ký thao tác

| # | Cụm | Thao tác và bằng chứng | Kết quả |
|---:|---|---|---|
| 1 | Pivot | Chọn nguồn 40×8 bằng chuột trong hộp Tạo Bảng tổng hợp | PASS — CDP |
| 2 | Pivot | Nạp tên trường từ hàng tiêu đề | PASS — CDP |
| 3 | Pivot | Đưa Vùng vào Hàng | PASS — CDP |
| 4 | Pivot | Đưa Sản phẩm vào Cột | PASS — CDP |
| 5 | Pivot | Đưa Thành tiền vào Giá trị với phép SUM | PASS — CDP |
| 6 | Pivot | Đưa Nhân viên vào Bộ lọc | PASS — CDP |
| 7 | Pivot | Chọn chỉ NV1 bằng checkbox | PASS — CDP |
| 8 | Pivot | Tạo Pivot bằng nút trong dialog | PASS — CDP |
| 9 | Pivot | Kiểm tra tổng theo vùng/sản phẩm sau lọc | PASS — CDP 10/10 |
| 10 | Pivot | Sửa dữ liệu nguồn bằng thao tác UI | PASS — CDP |
| 11 | Pivot | Làm mới Pivot và xác nhận tổng thay đổi thành 185000 | PASS — CDP |
| 12 | Pivot | Lưu XLSX và xác nhận bảng Pivot trong gói OOXML | PASS — CDP/OOXML |
| 13 | Pivot | Mở lại ở phiên desktop mới, xác nhận NV1 còn được chọn | PASS — CDP |
| 14 | Pivot | Mở XLSX bằng Excel COM ReadOnly, đọc B2=185000 | PASS — COM ẩn |
| 15 | Xác thực | Tạo danh sách thả xuống và kiểm tra danh sách giá trị | PASS — CDP sheet-excel-g2 |
| 16 | Xác thực | Tạo ràng buộc số nguyên 1–100 | PASS — CDP sheet-excel-g2 |
| 17 | Xác thực | Tạo ràng buộc ngày | PASS — CDP sheet-excel-g2 |
| 18 | Xác thực | Kiểm tra cảnh báo lỗi và quy tắc lưu/mở lại | PASS — CDP/OOXML 7 loại, 8 toán tử |
| 19 | Tìm/thay | Tìm “Hà Nội” trong vùng dữ liệu | PASS — CDP |
| 20 | Tìm/thay | Thay bằng “Đà Nẵng” | PASS — CDP |
| 21 | Tìm/thay | Hoàn tác thay thế bằng một lần Undo | PASS — CDP |
| 22 | Table | Tạo Table từ vùng chọn bằng ribbon | PASS — CDP chuột/bàn phím |
| 23 | Table | Đặt tên Table bằng bàn phím | PASS — CDP |
| 24 | Table | Nhập dòng kề bảng, xác nhận phạm vi tự mở rộng tới A1:G7 | PASS — CDP |
| 25 | Table | Đổi tên Table rồi chuyển về vùng thường | PASS — CDP |
| 26 | Table | Lưu/mở lại Table nhập từ XLSX | PASS — CDP round-trip |
| 27 | In | Đặt hướng giấy, lề và tỷ lệ trang | PASS — CDP 43/43 |
| 28 | In | Đặt vùng in và hàng/cột lặp lại | PASS — CDP 43/43 |
| 29 | In | Kiểm tra ngắt trang và các điều khiển thiết lập trang | PASS — CDP 43/43 |
| 30 | In | Mở xem trước, kiểm tra trang kết xuất | PASS — CDP 1 trang |
| 31 | In | Gọi xuất PDF | BLOCKED — hộp thoại lưu tệp native không điều khiển được bằng CDP |
| 32 | Hàm tra cứu | Kiểm tra VLOOKUP và lưu/mở lại công thức | PASS — Q15 round-trip |
| 33 | Hàm tra cứu | Kiểm tra XLOOKUP nếu có trong engine | NOT RUN — chưa có kiểm chứng giao diện riêng trong lượt Q21 |
| 34 | Hàm tra cứu | Kiểm tra INDEX+MATCH | NOT RUN — chưa có kiểm chứng giao diện riêng trong lượt Q21 |
| 35 | Công thức | Kiểm tra SUMIFS/COUNTIFS và IFERROR | NOT RUN — chưa có kiểm chứng giao diện riêng trong lượt Q21 |
| 36 | Công thức | Kiểm tra TEXT/DATE và mảng động | NOT RUN — chưa có kiểm chứng giao diện riêng trong lượt Q21 |
| 37 | Dán đặc biệt | Dán chỉ giá trị qua bàn phím và mở lại | PASS — Q15 CDP |
| 38 | Text to Columns | Đối chiếu hỗ trợ phân tách trong bộ kiểm thử Sheet | PASS — unit coverage; chưa thao tác UI trong lượt Q21 |
| 39 | Xóa trùng lặp | Đối chiếu hành vi trong bộ kiểm thử Sheet | PASS — unit coverage; chưa thao tác UI trong lượt Q21 |
| 40 | Name Manager | Đối chiếu vùng đặt tên và round-trip | PASS — `tests/test_sheet_defined_names_roundtrip.py`; chưa thao tác UI trong lượt Q21 |
| 41 | Bảo vệ | Đối chiếu khóa/mở khóa ô và bảo vệ trang | PASS — test bảo vệ Sheet hiện có; chưa thao tác UI trong lượt Q21 |

## Lỗi Pivot được tái hiện và sửa

- Trước sửa: unit Pivot FAIL 1/14, bản ghi không thuộc bộ lọc vẫn xuất hiện; CDP xác nhận `filterFields=0`, FAIL 0/1.
- Sau sửa: unit Pivot PASS 14/14; Python OOXML helper PASS 1/1; CDP lọc/làm mới/lưu/mở lại PASS 10/10, Excel COM ReadOnly đọc được dữ liệu đã lọc.
- Help `platform/help/entries-sheet.js` đã hướng dẫn cụ thể bố trí Hàng/Cột/Giá trị/Bộ lọc, chọn giá trị và làm mới; khóa i18n mới có VI/EN. Không thêm command mới nên số lệnh Help coverage không đổi.
- Giới hạn tương thích: Pivot `pageFields` do LibreOffice sinh khiến Excel COM không mở tệp. Bản xuất bỏ page orientation đó để Excel COM mở được; VN Sheet giữ lựa chọn qua metadata `vno:filters` và tính kết quả đã lọc. Vì vậy lựa chọn chưa phải bộ lọc Pivot native ở ứng dụng bảng tính ngoài VN Office.

## Gate, trạng thái và bằng chứng

- `git merge main`: PASS — Already up to date. `CODEX-COMMON-RULES.md`: không tồn tại ở gốc worktree.
- `node tests/run-tests.js`: PASS — 3773/3773.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS — VI=3117, EN=3117, thiếu 0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS — 0 dòng bị hạ trên 3 checklist.
- `python -m pytest tests -q -k "sheet or xlsx or ooxml"`: PASS — 362 passed, 742 deselected (249.35 s).
- Batch LAN 5 tệp: BLOCKED — `file test/lan` không có trong worktree; `E:\VNOffice-temp` chỉ có 4 probe lan01/lan09, không phải 5 fixture yêu cầu. Không dùng batch Q15 cũ thay cho lượt sau sửa adapter.
- PDF: BLOCKED vì hộp thoại native Save; xem trước đã PASS. Không dùng SendKeys/điều khiển OS.
