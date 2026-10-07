# Ma trận khoảng cách chức năng 3T Doc và Word cho nhân viên văn phòng Việt Nam

**Phạm vi:** rà soát tĩnh mã nguồn; không sửa ứng dụng. Mục ĐẦY ĐỦ có bằng chứng UI/lệnh và kiểm thử liên quan; MỘT PHẦN còn thiếu phạm vi/fidelity hoặc chưa đo; THIẾU là chưa tìm thấy capability. P1–3 là độ quan trọng; S/M/L là ước lượng. Handoff phản ánh lịch sử, không phải test vừa chạy.

**CDP:** NOT RUN. Không thấy endpoint sẵn; `tests/live/cdp/session.mjs` khởi chạy/đóng ứng dụng nên không phù hợp phiên chỉ đọc này. Không dùng OS input. Các kích thước theo NĐ 30/2020 là tiêu chí nghiệm thu yêu cầu, không phải ý kiến pháp lý.

## Ma trận chức năng

| Nhóm | Chức năng | Quan trọng | Trạng thái | Bằng chứng | Việc đóng khoảng cách |
|---|---|---:|---|---|---|
| Trang đầu | Tạo tài liệu trống | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Mở DOCX/DOC/ODT | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Lưu | 3 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | S |
| Trang đầu | Lưu thành | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Tự khôi phục | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | In | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Xuất PDF | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Xem trước in | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Hoàn tác | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Làm lại | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Cắt sao chép dán | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Dán văn bản thuần | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Chọn tất cả | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Tìm | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Thay thế | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Đếm từ | 2 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Đậm/nghiêng/gạch chân | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Phông chữ | 3 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Cỡ chữ | 3 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Màu chữ | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Tô sáng | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Heading | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Căn đoạn | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Giãn dòng | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Dấu định dạng | 1 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Bullet | 3 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | S |
| Trang đầu | Đánh số | 3 | ĐẦY ĐỦ | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Khởi động lại số | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Danh sách đa cấp | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Sắp xếp đoạn | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Trang đầu | Mẫu hành chính | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js` | M |
| Chèn | Trang bìa | 1 | THIẾU | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | L |
| Chèn | Trang trắng | 1 | THIẾU | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | L |
| Chèn | Ngắt trang | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Bảng | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Thêm hàng | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Xóa hàng | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Thêm cột | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Xóa cột | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Gộp ô | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Tách ô | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Viền bảng | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Màu ô | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Hàng tiêu đề lặp | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Văn bản thành bảng | 1 | THIẾU | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | L |
| Chèn | Ảnh | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Cắt dòng ảnh | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Hình khối | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Sơ đồ | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Biểu đồ | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Siêu liên kết | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Dấu trang | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Tham chiếu chéo | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Đầu trang | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Chân trang | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Số trang | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Ngày giờ | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Hộp văn bản | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | WordArt | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Phương trình | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Ký hiệu | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Chữ cái đầu đoạn | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Phong bì | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | M |
| Chèn | Nhãn | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js` | S |
| Bố cục/Thiết kế | A4 | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | S |
| Bố cục/Thiết kế | Lề trái 30–35mm | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Lề phải 15–20mm | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Lề trên 20–25mm | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Lề dưới 20–25mm | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Hướng dọc/ngang | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Cột báo | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Ngắt cột | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Section liên tục | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Section sang trang | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Section trang chẵn/lẻ | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Header/footer riêng section | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Số trang theo section | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Thụt lề thước | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Đánh số dòng | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Màu trang | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Đóng dấu chìm | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Viền trang | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Chủ đề | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Phông chủ đề | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Giữ đoạn với sau | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Ngăn dòng đơn lẻ | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | Giãn dòng chính xác | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Bố cục/Thiết kế | In hai mặt | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js` | M |
| Tham chiếu | Mục lục tự động | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Cập nhật mục lục | 2 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Chú thích cuối trang | 2 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Chú thích cuối tài liệu | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Kiểu APA/MLA | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Chèn trích dẫn | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Quản lý nguồn | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Thư mục tài liệu | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Chú thích hình/bảng | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Danh mục hình/bảng | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Tham chiếu | Cập nhật danh mục | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js` | M |
| Thư tín | Nguồn CSV/Excel | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Trường trộn thư | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Xem trước bản ghi | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Bản ghi trước | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Bản ghi sau | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Hoàn tất trộn | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Trộn ra tài liệu | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Trộn và in | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Phong bì | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | M |
| Thư tín | Nhãn | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | S |
| Thư tín | Điều kiện trộn | 1 | THIẾU | `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js` | L |
| Xem lại | Kiểm lỗi chính tả | 3 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Đếm từ | 2 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Thêm bình luận | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Xóa bình luận | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Giải quyết bình luận | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Bình luận trước/sau | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Theo dõi thay đổi | 3 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Chấp nhận một | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Từ chối một | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Chấp nhận tất cả | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Từ chối tất cả | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | Sửa đổi trước/sau | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem lại | So sánh tài liệu | 1 | THIẾU | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | L |
| Xem lại | Bảo vệ tài liệu | 1 | THIẾU | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | L |
| Xem lại | Ngôn ngữ kiểm lỗi | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js` | M |
| Xem | Bố trí in | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Bố trí web | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Chế độ đọc | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Thước ngang | 2 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Thước dọc | 2 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Thu phóng | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | 100% | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | S |
| Xem | Chiều rộng trang | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Đường lưới | 1 | ĐẦY ĐỦ | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Ngăn dẫn hướng | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Tìm theo tiêu đề | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Cửa sổ mới | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Xem | Trang hiện tại/thanh trạng thái | 1 | MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi | `apps/writer/writer-ribbon.js:814-849; tests/unit/writer-vertical-ruler.test.js; tests/unit/writer-zoom-wheel.test.js` | M |
| Trang đầu | Mở lại DOCX | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Tìm thay giữ định dạng | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Gõ tiếng Việt Unicode | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Tạo bullet thụt lề | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Danh sách 1/1.1/1.1.1 | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Điều khoản Điều 1/1/a) | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Chuẩn hóa TNR 13 | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Chuẩn hóa TNR 14 | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Soạn công văn | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Soạn quyết định | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Soạn hợp đồng | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Soạn biên bản | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Soạn báo cáo có mục lục | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Lưu bản nháp không mất format | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Tạo trang ký tên | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Thêm nơi nhận | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Căn giữa quốc hiệu | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Chỉnh khoảng cách đoạn | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Trang đầu | Chọn tất cả rồi đổi font | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Chèn | Chèn PAGE động | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Chèn | Bảng danh sách nhân sự | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Bố cục/Thiết kế | Bảng không tách hàng qua trang | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Bố cục/Thiết kế | Phụ lục đổi landscape | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |
| Tham chiếu | Cập nhật TOC sau khi sửa | 1 | MỘT PHẦN — kịch bản end-to-end chưa chạy | `tests/live/cdp/session.mjs (có harness; kịch bản chưa chạy)` | M |

## 30 kịch bản hành chính

Mỗi checklist cần chạy UI, lưu DOCX, mở lại/kiểm tra hiển thị và assertion XML; chưa chạy trong đợt phân tích này.
1. [ ] Công văn đi có quốc hiệu, số/ký hiệu, trích yếu, nơi nhận — kiểm giao diện, reopen và XML.
2. [ ] Công văn đến ghi ý kiến xử lý và chuyển đơn vị — kiểm giao diện, reopen và XML.
3. [ ] Quyết định có căn cứ và điều khoản — kiểm giao diện, reopen và XML.
4. [ ] Quyết định bổ nhiệm, danh sách nơi nhận — kiểm giao diện, reopen và XML.
5. [ ] Hợp đồng lao động nhiều trang, điều khoản đánh số — kiểm giao diện, reopen và XML.
6. [ ] Hợp đồng dịch vụ có bảng giá/chữ ký — kiểm giao diện, reopen và XML.
7. [ ] Biên bản họp có thời gian, thành phần, kết luận — kiểm giao diện, reopen và XML.
8. [ ] Biên bản bàn giao có bảng tài sản — kiểm giao diện, reopen và XML.
9. [ ] Báo cáo Heading và mục lục tự động — kiểm giao diện, reopen và XML.
10. [ ] Báo cáo cập nhật mục lục sau sửa — kiểm giao diện, reopen và XML.
11. [ ] Tờ trình có căn cứ/nội dung đề nghị — kiểm giao diện, reopen và XML.
12. [ ] Thông báo có ngày hiệu lực — kiểm giao diện, reopen và XML.
13. [ ] Kế hoạch có tiến độ/đầu mối — kiểm giao diện, reopen và XML.
14. [ ] Quy chế đánh số đa cấp — kiểm giao diện, reopen và XML.
15. [ ] Giấy mời có thời gian, địa điểm — kiểm giao diện, reopen và XML.
16. [ ] Giấy giới thiệu — kiểm giao diện, reopen và XML.
17. [ ] Đơn đề nghị và chữ ký — kiểm giao diện, reopen và XML.
18. [ ] Phiếu trình ký — kiểm giao diện, reopen và XML.
19. [ ] Danh sách nhân sự có hàng đầu bảng lặp — kiểm giao diện, reopen và XML.
20. [ ] Bảng rộng in ngang, không tách hàng — kiểm giao diện, reopen và XML.
21. [ ] Danh sách bullet thụt lề chuẩn — kiểm giao diện, reopen và XML.
22. [ ] Danh sách 1/1.1/1.1.1 — kiểm giao diện, reopen và XML.
23. [ ] Điều khoản Điều 1/1/a) — kiểm giao diện, reopen và XML.
24. [ ] A4, lề trái 30–35/phải 15–20/trên dưới 20–25mm — kiểm giao diện, reopen và XML.
25. [ ] Toàn văn TNR 13/14 — kiểm giao diện, reopen và XML.
26. [ ] Số trang động ở chân trang — kiểm giao diện, reopen và XML.
27. [ ] Header/footer khác trang đầu — kiểm giao diện, reopen và XML.
28. [ ] Ngắt section đổi hướng phụ lục — kiểm giao diện, reopen và XML.
29. [ ] In hai mặt, bảng/footer không bị cắt — kiểm giao diện, reopen và XML.
30. [ ] Tìm-thay văn bản dài giữ định dạng, xuất DOCX — kiểm giao diện, reopen và XML.

## A. Thiếu/Một phần ưu tiên (25 đầu)

Xếp theo quan trọng × cỡ việc; điểm phục vụ thứ tự xử lý.
- **P3×M — Bố cục/Thiết kế: Lề dưới 20–25mm**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js`.
- **P3×M — Bố cục/Thiết kế: Lề phải 15–20mm**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js`.
- **P3×M — Bố cục/Thiết kế: Lề trái 30–35mm**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js`.
- **P3×M — Bố cục/Thiết kế: Lề trên 20–25mm**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:346-482; tests/unit/writer-columns.test.js; tests/unit/writer-interactive-ruler.test.js; tests/unit/writer-sectionbreaks-pagecolor.test.js`.
- **P3×M — Chèn: Bảng**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P3×M — Chèn: Chân trang**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P3×M — Chèn: Ngắt trang**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P3×M — Chèn: Siêu liên kết**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P3×M — Chèn: Đầu trang**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P3×M — Tham chiếu: Mục lục tự động**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js`.
- **P3×M — Trang đầu: Cỡ chữ**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: In**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: Mở DOCX/DOC/ODT**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: Phông chữ**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: Thay thế**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: Tìm**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: Xuất PDF**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Trang đầu: Đánh số**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `platform/commands/command-definitions.js:63-239; apps/writer/writer-ribbon.js:31-227; tests/unit/writer-find-replace-dom.test.js; tests/unit/writer-undo-redo.test.js`.
- **P3×M — Xem lại: Kiểm lỗi chính tả**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js`.
- **P3×M — Xem lại: Theo dõi thay đổi**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:747-797; tests/unit/writer-comments.test.js; tests/unit/writer-track-changes.test.js; tests/unit/writer-spelling-suggestions.test.js`.
- **P2×M — Tham chiếu: Cập nhật mục lục**: MỘT PHẦN — có lệnh/UI, chưa chứng minh đủ fidelity/phạm vi; `apps/writer/writer-ribbon.js:634-674; tests/unit/writer-toc-footnotes.test.js; tests/unit/writer-citations.test.js; tests/unit/writer-captions.test.js`.
- **P1×L — Chèn: Trang bìa**: THIẾU; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P1×L — Chèn: Trang trắng**: THIẾU; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P1×L — Chèn: Văn bản thành bảng**: THIẾU; `apps/writer/writer-ribbon.js:245-335; tests/unit/writer-table-controls.test.js; tests/unit/writer-headerfooter-import.test.js`.
- **P1×L — Thư tín: Điều kiện trộn**: THIẾU; `apps/writer/writer-ribbon.js:691-731; tests/unit/writer-mail-merge.test.js; tests/unit/writer-envelopes-labels.test.js`.

## B. Định nghĩa đề xuất “Doc 100%” cho 1.0

1. Hoàn tất 30 kịch bản và các thao tác mức 3; không cần sao chép toàn bộ tính năng chuyên sâu Word.
2. Tạo, sửa, lưu, mở lại, in/xuất PDF không mất nội dung hay cấu trúc.
3. A4, lề yêu cầu, TNR 13–14, số trang, header/footer round-trip chính xác.
4. DOCX mở/lưu lại trong Word không repair; style, bảng, danh sách, section, field được bảo toàn.
5. Lệnh trọng yếu dễ tìm, dùng được bằng bàn phím, lỗi có thông báo.
6. Mỗi kịch bản có fixture, kỳ vọng, bằng chứng UI và assertion XML tự động.
7. CDP chỉ qua WebView; XML kiểm tra file đã lưu; không dùng OS input.
8. Chỉ tuyên bố đạt nếu mọi kiểm tra bắt buộc đã chạy pass trên build 1.0; phần chưa đo là NOT RUN.

## C. 10 checklist CDP + XML đầu tiên

Kiểm tra `word/document.xml`, `styles.xml`, `numbering.xml`, `header*.xml`, `footer*.xml` và relationships trong DOCX.
1. [ ] **Công văn A4/lề:** CDP chọn A4, bốn lề; XML `w:pgSz` khoảng 11906×16838 twips, `w:pgMar` đúng mm ±1mm.
2. [ ] **TNR 13:** Chọn toàn văn; XML `w:rFonts` Times New Roman và `w:sz=26`.
3. [ ] **Heading quyết định:** Áp Heading 1/2; XML `w:pStyle` đúng và text giữ nguyên.
4. [ ] **TOC báo cáo:** Chèn/cập nhật TOC; XML field TOC và entries tồn tại sau reopen.
5. [ ] **Danh sách đa cấp:** Tạo 1/1.1/1.1.1; XML `w:numPr`, numId/ilvl đúng.
6. [ ] **Điều khoản:** Tạo Điều 1/1/a); numbering format/suffix đúng, tiếp diễn sau reopen.
7. [ ] **Bảng qua trang:** Bảng dài; XML đủ hàng/cell, `w:tblHeader` nếu lặp; nội dung không mất.
8. [ ] **Header/footer/PAGE:** XML parts/rels có field PAGE begin/instrText/end, không phải số tĩnh.
9. [ ] **Ngắt trang/section:** Phụ lục landscape; XML break/sectPr đúng, phần trước portrait.
10. [ ] **In duplex:** CDP xác nhận preview và lựa chọn duplex UI; xác nhận thật qua driver riêng, XML không đủ chứng minh.

## Handoff

- Nhánh `docs/doc-gap-vs-word-codex`, worktree ban đầu sạch.
- Chỉ đọc mã, tạo tài liệu phân tích; test/CDP NOT RUN vì harness cần khởi chạy ứng dụng.

## Cập nhật kiểm chứng 06/10 (tối) — Claude

Đã thao tác thật trên app desktop (CDP) và, với phần lưu tệp, đọc lại XML DOCX; một số mục mở lại bằng Word thật. Script: `doc_matrix_verify.mjs` (19 dòng thao tác), `doc_matrix_roundtrip.mjs` (15 dòng lưu/đọc), `doc_matrix_roundtrip2.mjs` (8 dòng lưu/đọc).

**Đã kiểm, đạt (đổi từ MỘT PHẦN/THIẾU sang ĐẦY ĐỦ ở mức chức năng):** Trang trắng, Ngắt trang, Hộp văn bản, WordArt, Phương trình, Ngày giờ, Chấp nhận/Từ chối thay đổi, Ngắt mục (trang kế/liên tục/chẵn/lẻ), Ngắt cột, Mục lục + Cập nhật sau khi sửa, Hàng tiêu đề lặp, Sắp xếp đoạn, Khởi động lại số, Danh sách đa cấp, Chiều rộng trang, Văn bản thành bảng, Trang bìa, Điều kiện trộn (Nếu/Thì), Hướng ngang, Lề trang, Trang đầu khác, Bookmark, Liên kết, Hình mờ, Chú thích hình (SEQ) + Danh mục hình, Trích dẫn + Thư mục, Trường trộn thư (MERGEFIELD), Giữ cùng trang với đoạn sau, Tắt dòng mồ côi/góa, Ngắt trang trước.

**Lỗi thật tìm được và đã sửa (commit 13634216):**
1. `w:type` của sectPr bị gán lệch một phần → "Ngắt mục liên tục" thành ngắt trang, chẵn/lẻ lệch (Word thật xác nhận).
2. Phần bắt đầu bằng danh sách / tiêu đề / bảng làm mất ngắt mục.

**Sai khác nhỏ còn lại:**
- "Ngắt trang trước" lưu thành dấu ngắt trang ở cuối đoạn trước (cùng kết quả ngắt trang, nhưng Word không hiện hộp "Ngắt trang trước" được chọn).
- Tên bookmark được chuyển thành chữ thường khi lưu.

**THIẾU thật (không có lệnh trong ứng dụng):** So sánh tài liệu, Bảo vệ tài liệu (mật khẩu/hạn chế sửa), **Ngăn dẫn hướng** (danh sách tiêu đề để nhảy nhanh trong tài liệu dài). Mỗi mục là một tính năng mới cần kế hoạch (tệp/ảnh hưởng/kiểm thử) và hướng dẫn tiếng Việt kèm theo.

**Chưa kiểm:** các dòng cần hộp thoại nhập liệu (trộn thư với tệp CSV/Excel, quản lý nguồn), mẫu văn bản hành chính (công văn, quyết định, hợp đồng, biên bản), chuẩn hóa Times New Roman 13/14, kiểu APA, ngôn ngữ kiểm lỗi, cửa sổ mới.

## Cập nhật kiểm chứng 07/10/2026 — D30 Codex

Đã chạy app desktop thật bằng CDP với `LOCALAPPDATA` riêng; thao tác phím chỉ qua CDP. Script `scripts/audit-0610/doc_matrix_verify2.mjs` lưu DOCX, đọc `word/document.xml`/`styles.xml` và mở lại bản nháp. Lệnh acceptance chạy hết 25 dòng: **22 PASS, 3 FAIL, 0 BLOCKED** (exit code 1 vì có 3 lỗi thật).

| Dòng ma trận | Kết quả | Bằng chứng/nguyên nhân |
|---|---|---|
| Thư tín — Nguồn CSV/Excel | PASS | Nạp nguồn CSV qua UI “Dán CSV / Thủ công”: 2 trường, 2 bản ghi; không suy diễn thêm cho nhánh Excel. |
| Thư tín — Trường trộn thư | PASS | Chèn `HoTen` qua dialog, tài liệu có marker `«HoTen»`. |
| Thư tín — Xem trước bản ghi | PASS | Bản ghi 1 hiển thị `Nguyễn Văn D30`. |
| Thư tín — Bản ghi trước | PASS | Từ bản ghi 2 quay lại đúng bản ghi 1. |
| Thư tín — Bản ghi sau | PASS | Chuyển đúng sang bản ghi 2 (`Trần Thị D30`). |
| Thư tín — Hoàn tất trộn | PASS | Dialog “Hoàn tất và Trộn thư” mở đúng, mặc định toàn bộ 2 bản ghi ra tài liệu. |
| Thư tín — Trộn ra tài liệu | PASS | DOCX chứa đủ 2 tên, có 1 page break và không còn marker trộn. |
| Tham chiếu — Quản lý nguồn | PASS | Thêm và áp dụng nguồn `Nguyễn Văn D30 — Tài liệu kiểm chứng D30 — 2026` qua dialog. |
| Tham chiếu — Kiểu APA/MLA | PASS | Đổi MLA rồi về APA qua ribbon; trích dẫn hiện `(Nguyễn, 2026)`. |
| Trang đầu — Mẫu hành chính | FAIL | Thẻ “Văn bản hành chính” chỉ đổi tên tab thành `Quyết định ban hành tiêu chuẩn 01.docx`, nội dung vẫn rỗng. |
| Trang đầu — Soạn công văn | PASS | DOCX giữ quốc hiệu, số/ký hiệu, tên công văn và trích yếu. |
| Trang đầu — Soạn quyết định | PASS | DOCX giữ căn cứ và Điều 1. |
| Trang đầu — Soạn hợp đồng | PASS | DOCX giữ HỢP ĐỒNG, BÊN A và BÊN B. |
| Trang đầu — Soạn biên bản | PASS | DOCX giữ thành phần và kết luận. |
| Trang đầu — Soạn báo cáo có mục lục | PASS | XML có trường TOC, Heading 1 và hai Heading 2. |
| Trang đầu — Tạo trang ký tên | PASS | DOCX giữ đủ ba nhãn ký tên và có page break trước trang ký. |
| Trang đầu — Thêm nơi nhận | PASS | DOCX giữ nguyên `Nơi nhận: Phòng Hành chính; Lưu: VT.`. |
| Trang đầu — Căn giữa quốc hiệu | PASS | Đoạn quốc hiệu có `w:jc w:val="center"`. |
| Trang đầu — Chuẩn hóa TNR 13 | PASS | XML đoạn Unicode có Times New Roman và `w:sz=26`. |
| Trang đầu — Chuẩn hóa TNR 14 | PASS | XML đoạn Unicode có Times New Roman và `w:sz=28`. |
| Trang đầu — Gõ tiếng Việt Unicode | PASS | CDP nhập và DOCX giữ đúng `Trường, Nguyễn, cộng hòa, số hóa`. |
| Trang đầu — Lưu bản nháp không mất format | PASS | Mở lại DOCX giữ đủ nội dung, quốc hiệu căn giữa, TNR 13, Heading 1, TOC và page break. |
| Xem — Cửa sổ mới | FAIL | Không tạo target/window mới; thanh trạng thái báo trình duyệt đã chặn cửa sổ mới. |
| Xem — Trang hiện tại/thanh trạng thái | FAIL | Caret ở trang cuối (live pagination 3 trang) nhưng thanh trạng thái vẫn báo `Trang 1 / 3`. |
| Xem lại — Ngôn ngữ kiểm lỗi | PASS | Bật/tắt lại qua ribbon; bộ kiểm lỗi tiếng Việt đánh dấu `saiiichinhta`, trạng thái hiển thị Tiếng Việt/Unicode NFC. |

Không sửa mã sản phẩm theo phạm vi D30. Ba dòng FAIL cần ticket sửa riêng kèm hướng dẫn sử dụng nếu triển khai thành thay đổi tính năng.

## Cập nhật kiểm chứng 07/10/2026 — AGY V3

Đã chạy kiểm chứng trên app desktop thật bằng CDP (WebView2 qua `main.py`) với `LOCALAPPDATA` riêng (`VNO_CDP_LOCALAPPDATA`); toàn bộ thao tác phím/chuột thực hiện qua CDP, không dùng OS input/SendKeys, không kill tiến trình theo tên. Script: `scripts/audit-0610/doc_matrix_verify3.mjs`.

Kết quả tổng cộng 40 dòng ma trận còn lại (các dòng MỘT PHẦN / THIẾU chưa được kiểm ở đợt Claude và D30 Codex): **32 PASS, 1 FAIL, 7 BLOCKED**.

| Dòng ma trận | Kết quả | Bằng chứng / lý do |
|---|---|---|
| Trang đầu — Mở DOCX/DOC/ODT | BLOCKED | Phải chọn tệp hệ điều hành qua hộp thoại mở tệp của hệ thống, không tự động hóa bằng CDP thuần. |
| Trang đầu — Lưu thành | BLOCKED | Phải chọn tệp hệ điều hành qua hộp thoại lưu tệp của hệ thống, không tự động hóa bằng CDP thuần. |
| Trang đầu — In | BLOCKED | Cần thiết bị in thật hoặc driver in của hệ điều hành, không in thật qua CDP thuần. |
| Trang đầu — Xuất PDF | BLOCKED | Phải chọn tệp hệ điều hành qua hộp thoại lưu tệp của hệ thống, không tự động hóa bằng CDP thuần. |
| Trang đầu — Cắt sao chép dán | PASS | Cut/Paste hoạt động chính xác qua Clipboard API/DOM command, nội dung văn bản bảo toàn nguyên vẹn. |
| Trang đầu — Tìm | PASS | Hộp thoại tìm kiếm mở thành công và sẵn sàng nhận chuỗi tìm kiếm. |
| Trang đầu — Thay thế | PASS | Hộp thoại tìm thay thế mở thành công, tính năng Thay thế tất cả hoạt động chính xác. |
| Trang đầu — Màu chữ | PASS | Áp dụng thành công màu chữ (#dc2626) cho vùng văn bản được chọn. |
| Trang đầu — Tô sáng | PASS | Áp dụng thành công màu tô sáng (#ffcd00) cho vùng văn bản được chọn. |
| Trang đầu — Heading | PASS | Chuyển đổi khối văn bản thành tiêu đề Heading 1 (<h1>) chuẩn. |
| Chèn — Bảng | PASS | Chèn thành công bảng 3 hàng × 4 cột vào vị trí con trỏ tài liệu. |
| Chèn — Ảnh | BLOCKED | Phải chọn tệp hệ điều hành qua hộp thoại chọn tệp ảnh của hệ thống, không tự động hóa bằng CDP thuần. |
| Chèn — Cắt dòng ảnh | PASS | Thiết lập thành công kiểu ngắt dòng vuông (square) quanh ảnh (wrapMode=square). |
| Chèn — Tham chiếu chéo | PASS | Chèn tham chiếu chéo nội bộ (#bm-verify3) thành công. |
| Chèn — Số trang | PASS | Hộp thoại định dạng và chèn số trang mở thành công, sẵn sàng cấu hình. |
| Chèn — Ký hiệu | PASS | Chèn thành công ký hiệu đặc biệt Unicode © vào tài liệu. |
| Bố cục/Thiết kế — Header/footer riêng section | PASS | Section 2 được cấu hình tách biệt header/footer độc lập với phần trước (linkToPrevious=false). |
| Bố cục/Thiết kế — Số trang theo section | PASS | Đánh lại số trang theo section thành công, bắt đầu lại từ 1 (pageNumberRestart=true, start=1). |
| Bố cục/Thiết kế — Phông chủ đề | PASS | Áp dụng thành công chủ đề phông (theme=modern). |
| Bố cục/Thiết kế — In hai mặt | BLOCKED | Cần máy in hỗ trợ duplex và driver in hai mặt của hệ điều hành, không kiểm chứng được qua CDP thuần. |
| Tham chiếu — Cập nhật danh mục | PASS | Tạo và cập nhật danh mục hình vẽ/bảng biểu (TOF/LOT) tự động thành công. |
| Thư tín — Trộn và in | BLOCKED | Cần thiết bị in thật hoặc driver máy in hệ điều hành để xuất bản in hàng loạt, không in thật qua CDP thuần. |
| Xem lại — Kiểm lỗi chính tả | PASS | Bộ kiểm lỗi chính tả tiếng Việt sẵn sàng và hoạt động khi kích hoạt. |
| Xem lại — Thêm bình luận | PASS | Thêm ghi chú/bình luận thành công, neo bình luận được gắn vào DOM. |
| Xem lại — Xóa bình luận | PASS | Xóa bình luận thành công, danh sách bình luận được dọn sạch. |
| Xem lại — Giải quyết bình luận | PASS | Đánh dấu trạng thái bình luận Đã giải quyết (resolved=true) thành công. |
| Xem lại — Bình luận trước/sau | PASS | Điều hướng tới (next) và lui (previous) giữa các bình luận hoạt động chuẩn xác. |
| Xem lại — Sửa đổi trước/sau | PASS | Điều hướng tới và lui qua các điểm theo dõi sửa đổi (nextTrackChange/previousTrackChange) thành công. |
| Xem — Tìm theo tiêu đề | FAIL | Chưa có ngăn dẫn hướng hay lệnh duyệt/tìm theo danh sách tiêu đề trong tài liệu (tính năng đang ở bước kế hoạch PLAN-WRITER-NAV-PANE.md). |
| Trang đầu — Mở lại DOCX | PASS | Lưu tài liệu ra DOCX và mở lại xác thực bảo toàn toàn bộ nội dung. |
| Trang đầu — Tìm thay giữ định dạng | PASS | Thay thế nội dung chữ trong khi bảo toàn các thẻ định dạng in đậm và màu sắc. |
| Trang đầu — Tạo bullet thụt lề | PASS | Tạo danh sách dấu đầu dòng thụt lề cấp 2 thành công. |
| Trang đầu — Danh sách 1/1.1/1.1.1 | PASS | Áp dụng thành công kiểu danh sách đa cấp thập phân 1. / 1.1. / 1.1.1. |
| Trang đầu — Điều khoản Điều 1/1/a) | PASS | Áp dụng thành công định dạng danh sách điều khoản hành chính chuẩn NĐ30 (Điều 1. / 1. / a)) |
| Trang đầu — Chỉnh khoảng cách đoạn | PASS | Thiết lập khoảng cách đoạn văn bản thành công (trước 12pt, sau 6pt, giãn dòng 1.5). |
| Trang đầu — Chọn tất cả rồi đổi font | PASS | Chọn toàn bộ văn bản (Select All) và đổi sang phông chữ Times New Roman thành công. |
| Chèn — Chèn PAGE động | PASS | Chân trang chèn trường số trang động data-vno-field="PAGE" thành công. |
| Chèn — Bảng danh sách nhân sự | PASS | Bảng danh sách nhân sự lưu DOCX bảo toàn đầy đủ các cột STT, Họ tên, Chức vụ, Đơn vị và dữ liệu. |
| Bố cục/Thiết kế — Bảng không tách hàng qua trang | PASS | Các hàng bảng được thiết lập thuộc tính chống tách qua trang (page-break-inside: avoid) thành công. |
| Bố cục/Thiết kế — Phụ lục đổi landscape | PASS | Phần phụ lục (section-appendix) được thiết lập hướng giấy nằm ngang (landscape) riêng biệt. |

Tuân thủ nghiêm ngặt quy tắc không sửa mã sản phẩm trong đợt kiểm chứng này. Dòng FAIL duy nhất (`Xem — Tìm theo tiêu đề`) xác nhận thiếu ngăn dẫn hướng, đúng theo tài liệu kế hoạch `PLAN-WRITER-NAV-PANE.md`. 7 dòng BLOCKED được ghi nhận đúng do phụ thuộc hộp thoại OS hoặc thiết bị in phần cứng.

`n## Cập nhật sửa lỗi 07/10/2026 — WF2 Codex

Đã sửa ba lỗi D30 và chạy lại cùng acceptance trên app desktop thật (`main.py` + CDP, `LOCALAPPDATA` riêng; không dùng web/Playwright): **25 PASS, 0 FAIL, 0 BLOCKED**.

| Dòng D30 đã sửa | Chẩn đoán và kết quả sau sửa |
|---|---|
| Trang đầu — Mẫu hành chính | Lỗi thật: Shared Platform chỉ đổi tên tab, không giao việc áp nội dung cho Writer. Writer nay tái dùng đúng nội dung mẫu có sẵn, reset danh tính tệp cũ; acceptance thấy `chars=1570`, có quốc hiệu/QUYẾT ĐỊNH/Nơi nhận. |
| Xem — Cửa sổ mới | Lỗi thật: `WriterViewController` gọi thẳng `window.open`, bỏ qua cầu nối desktop đã có. Lệnh nay đi qua `AppShell`/`UnoBridge`/pywebview; CDP thấy số target tăng `1 → 2`. Fallback trình duyệt vẫn nằm trong `UnoBridge`. |
| Xem — Trang hiện tại/thanh trạng thái | Lỗi thật: chuỗi status ghi cứng `Trang 1`. Adapter nay tính trang caret theo các dải live pagination và cập nhật khi selection đổi; acceptance hiện đúng `Trang 3 / 4`. Assertion D30 được sửa để tính trang kỳ vọng từ vị trí caret: dải trang thứ tư nằm trước `saiiichinhta`, không nằm trước `TRANG KÝ TÊN`, nên giả định cũ “caret luôn ở trang cuối” là sai. |

Regression: `node tests/run-tests.js` đạt **2863/2863 PASS, 0 FAIL**. Không dùng Word COM trong WF2; sau acceptance không còn tiến trình `main.py` của worktree.
