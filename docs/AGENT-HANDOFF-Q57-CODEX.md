# Handoff Q57 — sửa phân trang DOC

**Agent / vai trò:** Codex / VN Writer  
**Nhánh / worktree:** `codex/q57` / `E:\VNOffice-codex-q57`  
**Mục tiêu:** marker hyphenation ẩn không được làm lệch gốc tính trang trên canvas; giữ nguyên marker và tính năng ngắt từ.

## Phát hiện và thay đổi

CDP trên app desktop xác nhận trước sửa: `legacy06.doc` 4/3 trang, `legacy13.doc` 2/1, `legacy14.doc` 16/15, `legacy20.doc` 2/1. Mỗi tệp có một `.vno-hyphenation-marker` với `display:none`; phần đầu thân trang lần lượt ở y=322.7, 362, 284.9 và 356 px. Thay đổi lọc riêng marker đó khỏi các khối dùng để tính phân trang. Marker vẫn nằm trong tài liệu và đường tuần tự hóa.

Đã thêm unit W57 trong `tests/unit/writer-page-hairline.test.js` và bài CDP `tests/live/cdp/writer-hidden-hyphenation-pagination.desktop.mjs`.

## Kết quả kiểm tra

- W57 unit: **FAIL trước** (marker làm số trang thành 2 trong ca 1 trang); **PASS sau**.
- CDP canvas: **FAIL trước** 4/4 theo expected; **PASS sau** `legacy06/13/14/20 = 3/1/15/1`.
- Batch DOCX d01,d02,d03,d06,d07,d13,d20,d24: **7/8 PASS**. d20 báo Word=3, saved=4 cả trước sửa lẫn sau sửa (lỗi nền đã xác nhận trên adapter gốc).
- Bộ 24 DOCX baseline: **9/24 PASS** (d01–d09); **BLOCKED tại d10** vì Word COM ẩn không trả trong thời hạn. Phần sau sửa cho corpus 24: **NOT RUN** do baseline không hoàn tất.
- `node tests/run-tests.js`: **3797/3797 PASS**. `node scripts/audit-0610/i18n_parity.mjs`: 0 key thiếu (21 key rỗng/giống VI-EN được báo riêng). Checklist evidence: **0 dòng bị hạ**. `python -m pytest tests -q -k 'writer or pagination'`: **312 passed, 843 deselected**.
- Ảnh CDP light/dark 1366×768 đã chụp và xem trong `E:\VNOffice-profiles\q57-final-20261024-01\q57-screenshots\`, theo tên `legacy06-light-1366x768.png` … `legacy20-dark-1366x768.png`. Không thấy lỗi khung app cần sửa trong phạm vi này. Dark mode làm một số chữ đen trong nội dung tài liệu nhập chìm trên nền tối; ghi nhận là vấn đề tương phản nội dung ngoài phạm vi phân trang.

## Rủi ro và bàn giao

Không sửa LibreOffice Core, format tài liệu, UI, i18n hoặc Help. Không có dependency mới. Còn việc kiểm toán so sánh đủ 24 DOCX trước/sau; COM oracle bị dừng tại d10. Bài batch 8 tệp có lỗi d20 từ trước, cần giao việc riêng nếu muốn xử lý.

**Commit:** bổ sung sau khi commit Q57.
