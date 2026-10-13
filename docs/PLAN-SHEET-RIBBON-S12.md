# Kế hoạch FIX-S12 — đối chiếu ribbon Sheet với Excel

## Mục tiêu
Lập ma trận đủ 138 nút từ `docs/ribbon-scan-sheet-1011.json`; xác nhận trạng thái chỉ khi có chứng cứ app UI và Excel COM chỉ đọc; rà tuần tự các nút chưa đối chiếu; sửa sai lệch tái hiện kèm Help tiếng Việt và i18n VI/EN.

## Năng lực hiện hữu
FIX-S7 đến FIX-S11 đã có harness CDP, XLSX fixture, Excel COM chỉ đọc, và kết quả đối chiếu cho một số nhóm ribbon. Dùng lại bằng chứng theo command ID cụ thể; không suy rộng kết quả một nhóm sang nút khác.

## File / module dự kiến
- `scripts/audit-0610/gen_sheet_button_matrix.py`: sinh ma trận từ JSON scan và map chứng cứ có nguồn.
- `docs/SHEET-BUTTON-MATRIX-1011.md`: trạng thái, ghi chú và nguồn đối chiếu của cả 138 nút.
- `scripts/audit-0610/`: bổ sung probe/evidence nếu harness hiện có chưa bao phủ một nút.
- `docs/tickets-0710/FIX-S12-RESULTS.md`, `docs/tickets-0710/evidence/`, `docs/AGENT-HANDOFF-FIX-S12-CODEX.md`: kết quả, ảnh và handoff.
- Sửa `apps/sheet/**`, `platform/help/**`, `platform/i18n/**` chỉ khi thao tác UI và Excel tái hiện sai khác.

## Phụ thuộc
WebView2/CDP; Excel desktop qua COM read-only; fixture XLSX hiện có; không thêm dependency và không sửa LibreOffice Core.

## Rủi ro
Nút thao tác với dữ liệu/trang cần fixture riêng; lệnh nguy hiểm hoặc cần kết nối ngoài chỉ giữ CHƯA ĐỐI CHIẾU nếu không thể chạy an toàn trên fixture. Không đánh dấu KHỚP khi chỉ có phản ứng DOM hoặc kiểm tra model trong ứng dụng.

## Kế hoạch kiểm chứng
Thao tác chuột/phím qua CDP, chụp ảnh và lưu XLSX từ app; mở mỗi đầu ra riêng bằng Excel COM ReadOnly để so giá trị/formula/format tương ứng; Excel tự tính lại formula. Chạy `npm test`, `python -m unittest discover -s tests`, batch XLSX lan01,02,04,06,09,11,22,26, và quét mã hóa theo phiếu.

## Rollback
Mỗi nhóm có commit riêng theo phiếu. Nếu sửa sản phẩm gây hồi quy, revert commit nhóm tương ứng; không reset/force và không sửa test để làm xanh.
