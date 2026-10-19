# Khám phá thao tác VN Sheet — 19/10/2026

## Phạm vi và môi trường

Tạo bảng doanh thu 6 dòng × 5 cột gồm Ngày, Sản phẩm, Số lượng, Đơn giá và Thành tiền; nhập công thức `=C2*D2` đến `=C7*D7`. Thao tác trên ứng dụng đang chạy qua CDP bằng `scripts/audit-0610/app_session_server.mjs`, với `VNO_CDP_LOCALAPPDATA` riêng. Không dùng SendKeys, AppleScript hay điều khiển hệ điều hành.

Tệp làm việc: `E:\VNOffice-profiles\q5-sheet-20261019\revenue.xlsx`. Mở lại trong phiên CDP mới để xác minh lưu trữ. Ảnh thao tác nằm trong [thư mục ảnh](assets/q5-sheet-2026-10-19/).

## Nhật ký thao tác

| # | Cách thao tác | Việc làm | Kỳ vọng | Thực tế |
|---|---|---|---|---|
| 1 | Bàn phím | Nhập tiêu đề và 6 dòng dữ liệu vào vùng A1:E7 | Đủ 5 cột, 6 bản ghi | PASS — vùng dữ liệu được nhập; ảnh [bảng](assets/q5-sheet-2026-10-19/q5-entered-table.png) |
| 2 | Bàn phím | Nhập công thức Thành tiền cho từng dòng | Giá trị bằng Số lượng × Đơn giá | PASS — E2:E7 lần lượt là 300000, 336000, 270000, 150000, 420000, 360000 |
| 3 | Chuột | Sắp xếp Thành tiền tăng dần | Sáu dòng xếp từ thấp đến cao | PASS — thứ tự giá trị được sắp tăng |
| 4 | Chuột | Sắp xếp Thành tiền giảm dần | Sáu dòng xếp từ cao đến thấp | PASS — thứ tự giá trị được sắp giảm |
| 5 | Chuột | Bật Tự động lọc cho hàng tiêu đề | Xuất hiện bộ lọc tại các cột | PASS — bộ lọc hoạt động trên vùng A1:E7 |
| 6 | Chuột | Lọc cột Thành tiền theo giá trị 420000 | Chỉ giữ dòng có giá trị khớp | PASS — còn 1 dòng kết quả |
| 7 | Chuột | Đổi điều kiện thành số lớn hơn 300000 | Chỉ giữ giá trị thỏa điều kiện | PASS — còn 3 dòng kết quả |
| 8 | Chuột | Xóa điều kiện lọc | Hiện lại toàn bộ dữ liệu | PASS — đủ 6 dòng trở lại |
| 9 | Chuột | Tạo định dạng có điều kiện cho E2:E7 khi nhỏ hơn 250000 | Ô thỏa điều kiện có tô màu | PASS — E7 được tô vàng; một quy tắc được lưu; ảnh [định dạng](assets/q5-sheet-2026-10-19/q5-conditional.png) |
| 10 | Chuột | Chèn biểu đồ cột từ dữ liệu doanh thu | Biểu đồ cột xuất hiện trên trang tính | PASS — tạo được một biểu đồ; ảnh [biểu đồ](assets/q5-sheet-2026-10-19/q5-column-chart.png) |
| 11 | Chuột | Cố định hàng trên cùng | Hàng tiêu đề được cố định khi cuộn | PASS — trạng thái lưu lại có `frozenRows=1`; ảnh [cố định hàng](assets/q5-sheet-2026-10-19/q5-freeze-menu.png) |
| 12 | Bàn phím | Định dạng Số lượng thành số có hai chữ số thập phân | Giá trị hiện dạng số, không đổi dữ liệu | PASS — áp dụng định dạng số qua Ctrl+Shift+1 |
| 13 | Bàn phím | Định dạng Đơn giá và Thành tiền thành tiền tệ | Số có ký hiệu tiền tệ | PASS — áp dụng qua Ctrl+Shift+4, hiện ký hiệu ₫ |
| 14 | Chuột | Định dạng cột Ngày theo ngày/tháng/năm | Ngày hiển thị đủ năm | PASS — sau khi tự căn độ rộng cột, ngày hiển thị đầy đủ |
| 15 | Chuột | Gộp A9:E9 và nhập “Revenue Summary” | Một ô gộp chứa nội dung | PASS — vùng `A9:E9` được lưu dưới dạng ô gộp |
| 16 | Chuột | Căn giữa vùng B2:B7 | Tất cả ô đã chọn được căn giữa | FAIL trước sửa — chỉ ô đang hoạt động B7 đổi căn lề; ảnh [trước sửa](assets/q5-sheet-2026-10-19/q5-alignment-before-fix.png) |
| 17 | Chuột | Lặp lại căn giữa B2:B7 sau sửa | Cả vùng được căn giữa | PASS sau sửa — B2:B7 đều căn giữa; ảnh [sau sửa](assets/q5-sheet-2026-10-19/q5-alignment-after-fix.png) |
| 18 | Chuột | Tự căn độ rộng cột Ngày | Nội dung ngày không bị cắt | FAIL ban đầu khi mở lại — chuỗi ngày bị cắt; sau tự căn, chiều rộng hiển thị 147.56 px và PASS; ảnh [sau tự căn](assets/q5-sheet-2026-10-19/q5-date-autofit.png) |
| 19 | Bàn phím | Lưu sổ tính bằng Ctrl+S | Tệp XLSX hiện tại được cập nhật | PASS — lưu tại đường dẫn làm việc; ảnh [trước vòng lưu](assets/q5-sheet-2026-10-19/q5-before-roundtrip.png) |
| 20 | CDP phiên mới | Mở lại XLSX đã lưu và kiểm tra dữ liệu | Công thức, định dạng, biểu đồ, cố định và ô gộp còn nguyên | PASS — E2 còn công thức; một biểu đồ; cố định hàng 1; một quy tắc định dạng; vùng gộp A9:E9; ảnh [mở lại](assets/q5-sheet-2026-10-19/q5-final-reopen-autofit.png) |
| 21 | CDP / bàn phím | Nhập tiêu đề “Ngày” bằng Unicode | Chuỗi tiếng Việt được giữ đúng | PASS — CDP trả codepoint `[78,103,224,121]`, đúng “Ngày”. Một lần thử trước đó gửi nhầm `Ng�y` do bộ tạo payload PowerShell; đó là lỗi dữ liệu đầu vào của lượt thử, không phải lỗi gõ của ứng dụng. |
| 22 | Chuột / CDP | Dùng Lưu thành trên sổ mới | Chọn đường dẫn qua hộp thoại lưu | BLOCKED — hộp thoại hệ điều hành nằm ngoài phạm vi điều khiển CDP được phép. Để tiếp tục kiểm thử an toàn, tạo sẵn một XLSX trống trong hồ sơ thử nghiệm, mở bằng ứng dụng rồi lưu đè bằng Ctrl+S. |

## Sửa lỗi nhỏ

Lỗi căn lề vùng chọn được tái hiện trước khi sửa: bài kiểm tra đơn vị mới thất bại với thông báo `B3 phải được căn giữa`. Sau sửa, bài kiểm tra vùng chọn đạt 22/22; kiểm tra CDP trực tiếp xác nhận cả B2:B7 có căn giữa. Thay đổi nằm ở [sheet-grid.js](../apps/sheet/sheet-grid.js), kiểm thử trong `tests/unit/sheet-editing-styles.test.js`; commit sửa chính `2d9ad885`, commit hiệu chỉnh vùng chọn đang hoạt động `01fd5baa`.

Số đo trước/sau: FAIL — ô đang hoạt động duy nhất nhận style; PASS — toàn bộ 6 ô được căn giữa. Độ rộng ngày sau tự căn được giữ qua lưu/mở lại.

## XLSX vòng lưu và bộ LAN

Sau khi lưu rồi mở lại tệp doanh thu, đọc cấu trúc XLSX bằng openpyxl xác nhận: công thức E2:E7, một biểu đồ, cố định tại A2, bộ lọc A1:E7, một quy tắc định dạng có điều kiện và vùng gộp A9:E9. Phiên CDP mới cũng xác nhận dữ liệu và căn lề.

Đã chạy bộ 5 tệp LAN được giao, không chạy lan14: `lan25.xlsx`, `lan20.xlsx`, `lan07.xlsx`, `lan13.xlsx`, `lan23.xlsx`. Báo cáo batch ghi 5/5 PASS, đã lưu, 0 sai khác và lint sạch. Lưu ý: sau khi chạy, kiểm tra mã nguồn phát hiện `batch_document_audit.py` tự gọi `_run_excel_open_test`, tức có nhánh COM ẩn. Báo cáo batch tự sinh ghi `office=PASS`; lần chạy này không tuân thủ quy tắc Excel COM bị chặn của phiếu. Vì vậy đối chiếu Excel COM được đánh dấu **BLOCKED theo quy tắc phiếu**, và kết quả COM trong báo cáo không được dùng làm bằng chứng. Kiểm tra cấu trúc XLSX và sai khác 0 vẫn được ghi nhận riêng.

## Kiểm tra cuối

- `node tests/run-tests.js` — PASS, 3769/3769.
- `node scripts/audit-0610/i18n_parity.mjs` — PASS, VI=3105, EN=3105, thiếu 0 khóa mỗi ngôn ngữ.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — PASS, 0 dòng bị hạ; Word 279, Excel 217, PowerPoint 269.
- `python -m pytest tests -q -k sheet` — PASS, 295 passed, 798 deselected.
- Kiểm tra Excel COM — BLOCKED theo quy tắc phiếu; lần chạy batch phía trên đã gọi nhánh COM ngoài ý muốn và được ghi rõ để giữ dấu vết kiểm toán.
- Hộp thoại “Lưu thành” native — BLOCKED; lưu Ctrl+S trên tệp XLSX đã mở được xác minh.
