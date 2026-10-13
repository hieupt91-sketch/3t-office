# Agent Handoff
TASK: EXCEL-G2 — kiểm tra dữ liệu đủ loại + lọc theo màu/văn bản/số/ngày + sắp xếp theo màu
AGENT/ROLE: Codex (khung) + Claude (kiểm chứng, gộp)
BRANCH: fix/excel-g2-codex
OBJECTIVE: Data Validation: Số nguyên, Thập phân, Danh sách, Ngày, Giờ, Độ dài văn bản, Tùy chỉnh (toán tử, thông báo nhập, cảnh báo Stop/Warning/Info, khoanh vòng dữ liệu sai, xóa tất cả); lọc văn bản/số/ngày/màu; sắp xếp theo màu; lưu/mở lại đúng.
FINDINGS: Excel 2016 (COM chỉ-đọc) đọc đúng cả 7 loại: Validation.Type 1..7, Operator, Formula1/2, AlertStyle, ErrorTitle/Message, InputTitle/Message, ShowInput/ShowError; AutoFilterMode bật. Phát hiện riêng (đã sửa trong main, commit 1b69030e): lọc lưu rồi mở lại không đánh dấu hàng bị lọc là hàng ẩn.
TEST RESULTS: PASS — npm 3174/3174; Python 20 OK; desktop sheet-excel-g2 (lọc văn bản/màu, sắp xếp màu, 7 validation, mở lại) PASS; sheet-filter-hidden-rows PASS; LAN batch 10/10 tệp 0 chênh lệch (lan25 8509 điểm lệch kiểu bảng có từ trước, không đổi); lan28 98,18%, lan01/lan04 100%.
KNOWN FAILURES: lan25 vẫn 8509 chênh lệch kiểu bảng (có từ trước). Khoanh vòng dữ liệu sai và nút Xóa tất cả chưa so hình ảnh với Excel. Loại kiểm tra "Số nguyên" mở lại hiện là numberRange (cùng ngữ nghĩa, Excel đọc Type=1).
NEXT ACTION: Gộp main; G3 biểu đồ.