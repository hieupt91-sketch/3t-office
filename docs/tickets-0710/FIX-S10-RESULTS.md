# FIX-S10 — Kết quả kiểm chứng tiếp FIX-S9

## Kế hoạch
- Mục tiêu: kiểm chứng lại các nhóm FIX-S9 còn được giao trên nhánh `fix/sheet-s10-codex`, qua thao tác chuột/phím CDP, lưu XLSX rồi đọc lại bằng Excel COM chỉ đọc.
- Năng lực hiện hữu: implementation và hướng dẫn VI/i18n cho các nhóm đã nằm trong `main` từ merge FIX-S9; chỉ sửa nếu audit tái hiện sai khác.
- Phạm vi file: `apps/sheet/**` chỉ khi có sai khác; `platform/find/**` cho bộ tìm kiếm dùng chung; `platform/help/**` và `platform/i18n/**` cho nội dung hướng dẫn; audit CDP/evidence trong `scripts/audit-0610/**` và `docs/tickets-0710/**`.
- Phụ thuộc: LibreOffice adapter, WebView2/CDP, Excel COM và fixture `tests/live/cdp/test_sheet_home.xlsx`; không thêm dependency.
- Rủi ro: kết quả hàm ngày có cache phụ thuộc ngày chạy; so sánh serial/công thức, không dựa vào định dạng hiển thị `########` ở cột hẹp.
- Test: từng nhóm qua UI CDP và Excel read-only; sau cùng `npm test` và batch `lan01,02,04,06,09,11,22,26` với `VNO_APP_ROOT` là worktree này.
- Rollback: revert commit audit/implementation riêng của nhóm cần quay lui; không dùng reset/force.

## Nhóm 1 — Công thức và Excel tính lại

**PASS.** Nhập 29 công thức bằng bàn phím CDP vào fixture, lưu XLSX, rồi mở bằng Excel COM `ReadOnly=true`. Excel giữ công thức và tính lại khớp giá trị Sheet cho SUMIF/SUMIFS, COUNTIF/COUNTIFS, IFERROR, ROUND, LEFT/MID/RIGHT, TEXT số/ngày, NA, HLOOKUP, MATCH, OFFSET, INDIRECT, SUMPRODUCT, DATE/YEAR/MONTH/DAY, EDATE/EOMONTH, WEEKDAY, NETWORKDAYS, WORKDAY, DAYS, TODAY và NOW. Đã đối chiếu `Value2`; ô `NA()` trả `#N/A`. CDP log và XLSX: `E:\VNOffice-profiles\codex-fs10\app_formulaPack.xlsx`; ảnh giao diện: `evidence/fix-s9-formulas.png`.

Sai khác tái hiện: không. Hướng dẫn VI và i18n cho nhóm hàm đã có trong Trợ giúp từ FIX-S9; không cần sửa nội dung.

## Nhóm 2 — Dán đặc biệt

**PASS.** Qua UI/CDP: dán `C2` vào `I2` ở chế độ chỉ giá trị, sao chép định dạng đậm `B1` sang `I3`, rồi dán công thức tương đối từ `F2` xuống `F3`. Excel COM chỉ đọc xác nhận `I2=1234.5` không có công thức, `I3.Bold=1` như `B1`, và `F3` giữ `=C3*D3`, giá trị `709.8625`. XLSX: `E:\VNOffice-profiles\codex-fs10\app_pasteSpecialPack.xlsx`; ảnh UI: `evidence/fix-s9-paste-special.png`.

Sai khác tái hiện: không. Trợ giúp tiếng Việt nêu đường dẫn Trang đầu → Bảng nhớ tạm → Dán đặc biệt/Ctrl+Alt+V và giải thích giá trị, công thức, định dạng, chuyển vị; nhãn i18n VI/EN đã có.

## Nhóm 3 — Tìm và Thay thế

**PASS sau sửa.** Audit UI ban đầu tái hiện thiếu tùy chọn “Khớp toàn bộ nội dung ô”. Đã thêm checkbox trong hộp thoại Sheet; matcher dùng chung nhận `matchCell`, còn tìm kiếm thường ở Writer/Slides giữ nguyên mặc định. Qua chuột/phím CDP, bật khớp toàn ô chỉ thay ô `Ghi chú A` (1 lần), không nhận chuỗi con; tìm trong Sổ làm việc và phân biệt hoa/thường cũng được kiểm tra. XLSX đọc lại bằng Excel COM chỉ đọc cho thấy ô đã đổi ở hai sheet. Ảnh UI: `evidence/fix-s9-find-replace.png`.

Hướng dẫn trong Trợ giúp → Tìm kiếm và Thay thế đã chỉ rõ Ctrl+F/Ctrl+H, phạm vi, thứ tự Hàng/Cột, Giá trị/Công thức và thao tác bật/tắt khớp toàn ô. Đã thêm chuỗi i18n VI/EN.

## Nhóm 4 — Sắp xếp nhiều cấp

**PASS.** Qua menu ngữ cảnh mở Sắp xếp tùy chỉnh, thiết lập tên tăng dần và số tiền giảm dần bằng phím; Excel COM chỉ đọc xác nhận thứ tự: Hoàng Văn E, Lê Văn C, Nguyễn Văn A (5678.9 rồi 1234.5), Phạm Thị D. XLSX: `E:\VNOffice-profiles\codex-fs10\app_customSort.xlsx`; ảnh: `evidence/fix-s9-multi-sort.png`.

Sai khác tái hiện: không. Hướng dẫn tiếng Việt hiện có trong tab Dữ liệu, nhóm Sắp xếp & Lọc, và i18n cho cấp sắp xếp.

## Nhóm 5 — Xóa trùng lặp

**PASS.** Bôi chọn A1:A6 bằng chuột, sửa hàng cuối thành mã `1` bằng bàn phím rồi chạy Dữ liệu → Xóa trùng lặp. Excel COM chỉ đọc xác nhận còn các mã `1 / 2 / 3 / 4` và hàng dữ liệu cuối đã trống, tức một hàng trùng được loại bỏ. XLSX: `E:\VNOffice-profiles\codex-fs10\app_removeDuplicates.xlsx`.

Sai khác tái hiện: không. Hướng dẫn VI hiện có dưới tab Dữ liệu, nhóm Công cụ dữ liệu; tùy chọn nhận diện hàng tiêu đề và cột so sánh có nhãn i18n VI/EN.

## Nhóm 6 — Đổi tên, xóa và di chuyển sheet

**PASS.** Dùng chuột phải trên thẻ và bàn phím trong hộp tên để đổi `Sheet2` thành `S9 Review`, di chuyển sheet về đầu thứ tự, thêm rồi xóa `Sheet3` qua menu xác nhận. Excel COM chỉ đọc xác nhận thứ tự lưu là `S9 Review / Sheet1`. XLSX: `E:\VNOffice-profiles\codex-fs10\app_sheetManagementPack.xlsx`; ảnh: `evidence/fix-s9-sheet-management.png`.

Sai khác tái hiện: không. Trợ giúp tiếng Việt có hướng dẫn riêng đổi tên, di chuyển/sao chép, xóa; nhãn menu và hộp thoại có i18n VI/EN.
