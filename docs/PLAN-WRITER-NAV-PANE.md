# PLAN — Ngăn dẫn hướng (Navigation Pane) cho VN Writer

**Ngày:** 07/10/2026 · **Trạng thái:** đã được chủ dự án duyệt hướng làm (07/10) · **Người làm đề nghị:** Codex (UI + logic Writer); Claude kiểm lại độc lập.

## Mục tiêu
Một ngăn bên trái liệt kê các tiêu đề của tài liệu (Heading 1–6 và đoạn có cấp đại cương), bấm để nhảy tới đó, có ô lọc theo chữ. Người dùng tài liệu hành chính dài (50+ trang) điều hướng nhanh như Word.

## Hiện trạng
- Chưa có lệnh nào: tìm "ngăn dẫn hướng/bản đồ tài liệu" trong `apps/writer`, `platform/commands` không có kết quả; Trợ giúp có nhắc "Ngăn Dẫn hướng" chỉ như tính năng của phần mềm khác khi mở DOCX.
- Có sẵn để dùng lại: tiêu đề `h1..h6`, `Mức đại cương` ở hộp thoại Đoạn (outline level), mục lục tự động (`writer.reference.tocInsert`) đã quét tiêu đề, ngăn bên (AI sidebar) làm mẫu cho khung dock, phân trang trực tiếp (`.vno-page-auto-gap`) để ước lượng số trang.

## Hành vi (người dùng thấy gì)
1. Tab **Xem** có nút **Ngăn dẫn hướng** (bật/tắt, có trạng thái đã chọn). Mở ra ngăn rộng ~260 px bên trái, không đè lên trang; trang tự dịch/thu theo bố cục, KHÔNG làm đổi số trang hay vị trí ngắt trang.
2. Danh sách tiêu đề thụt theo cấp; mỗi dòng: chữ tiêu đề (cắt dài, đủ tooltip), số trang ước lượng bên phải.
3. Bấm một dòng → cuộn tới tiêu đề, đặt con trỏ ở đầu tiêu đề, tô sáng ngắn.
4. Tiêu đề hiện tại (theo con trỏ) được tô sáng trong danh sách.
5. Ô "Tìm trong tài liệu": lọc danh sách theo chữ (không dấu/có dấu đều khớp).
6. Thu/mở nhánh (mũi tên) theo cấp; nút "Thu gọn tất cả / Mở rộng tất cả".
7. Bàn phím: mở bằng nút (và phím tắt `Ctrl+Alt+N` nếu không trùng); trong ngăn dùng ↑/↓/Home/End/Enter/Esc (Esc trả focus về tài liệu); `role="tree"`, `aria-level`, `aria-expanded`.
8. Trạng thái: tài liệu không có tiêu đề → thông báo "Tài liệu chưa có tiêu đề. Đặt kiểu Tiêu đề 1–6 để hiện ở đây." (tiếng Việt thật); lọc không ra kết quả → "Không có tiêu đề khớp."
9. Tối/sáng theo giao diện; song ngữ VI/EN.

## Phạm vi file (dự kiến, ≤ 8 file)
- `apps/writer/writer-nav-pane.js` (mới): dựng ngăn, quét tiêu đề (debounce theo kích thước tài liệu, quét tăng dần), điều hướng, lọc, bàn phím.
- `apps/writer/writer.css`: kiểu ngăn (token màu có sẵn; tối/sáng).
- `platform/commands/command-definitions.js`: lệnh `writer.view.navigationPane` (isToggle).
- `apps/writer/writer-ribbon.js`: nút trong nhóm Hiển thị của tab Xem (đặt cạnh Thước/Đường lưới).
- `apps/writer/writer-view-controller.js` hoặc nơi bind lệnh Xem: gắn lệnh; lưu trạng thái bật/tắt trong cài đặt người dùng.
- `platform/help/entries-writer.js`: mục hướng dẫn tiếng Việt thật (làm gì, ở đâu, các bước).
- `platform/i18n/strings-vi.js`, `strings-en.js`: chuỗi mới.
- `tests/unit/writer-nav-pane.test.js` (mới) + `scripts/audit-0610/doc_nav_pane_check.mjs` (CDP app desktop).

## Phụ thuộc / ranh giới lớp
Chỉ trong lớp app Writer + khai báo lệnh dùng chung; KHÔNG sửa LibreOffice/adapter; không thêm gói; không gọi bên ngoài; không gửi nội dung tài liệu đi đâu.

## Rủi ro và cách giảm
- **Hiệu năng tài liệu dài (160–200 trang):** quét tiêu đề chỉ khi có thay đổi, debounce ≥ 300 ms và scale theo số khối; đo độ trễ gõ phím bằng `doc_typing_latency.mjs` (yêu cầu 0 sự kiện > 100 ms như hiện nay).
- **Đổi bố cục làm lệch phân trang:** ngăn nằm ngoài vùng trang; chạy `doc_live_pages_vs_word.mjs` (43/43 khớp) trước và sau.
- **Trùng phím tắt:** kiểm tra `platform/commands/shortcut-manager.js` và bảng phím tắt Writer trước khi gán.
- **Truy cập (a11y):** test bàn phím + vai trò ARIA; tương phản chế độ tối ≥ 4,5:1.

## Kế hoạch kiểm thử
- Unit: quét đúng cấp, tiêu đề rỗng bị bỏ, lọc không dấu, thu/mở nhánh, ước lượng trang không ném lỗi khi chưa phân trang.
- CDP app desktop (không web): bật/tắt nút, bấm nhảy đúng vị trí, tô sáng theo con trỏ, lọc, bàn phím, tối/sáng, tài liệu 160 trang không giật (độ trễ gõ), số trang không đổi (43/43).
- `node tests/run-tests.js` không FAIL mới; test hướng dẫn/độ phủ Trợ giúp phải PASS (mục Help mới thuộc danh mục đã đếm).

## Rollback
Gỡ lệnh + nút + tệp mới; trạng thái mặc định ẩn nên không ảnh hưởng người dùng cũ. Không đụng định dạng tệp.

## Tiêu chí xong
Cả 9 hành vi trên đạt trong app desktop, test mới + test cũ đạt, Trợ giúp có hướng dẫn tiếng Việt, cập nhật `docs/GAP-DOC-VS-WORD-0610.md` (mục Ngăn dẫn hướng: ĐẦY ĐỦ).