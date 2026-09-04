# Handoff — VN Sheet Comments, Print Area & Page Breaks

## Kết quả

- Branch/worktree: `feature/sheet-printarea-comments` tại `E:\VNOffice-codex-sheet-printarea`.
- Comments: tab **Xem xét**, command `sheet.review.commentInsert`, mở được bằng ribbon hoặc chuột phải; thêm/sửa/xóa state theo sheet, marker tam giác đỏ, popup hover, undo/redo.
- Print layout: tab **Bố trí trang** có đặt/xóa vùng in và chèn/xóa ngắt trang; state cô lập theo sheet, viền/đường đứt nét DOM thật, undo/redo và snapshot khi xóa/khôi phục sheet.
- Command mới dùng `bindHandler()`, mọi handler chuẩn hóa `args = args || {}`; có UNO mapping và SVG riêng trong UI kit.

## Kiểm thử

- PASS: `node tests/run-tests.js` — **299/299**, 27 suite (baseline trước thay đổi: 291/291, 26 suite).
- PASS browser thật: serve `index.html` bằng `python -m http.server 8137 --bind 127.0.0.1`, chạy Microsoft Edge qua Playwright và thao tác click/hover/nhập phím thật.
- DOM quan sát được: ô B2 có `has-comment`, pseudo-element tam giác `rgb(220, 38, 38)`; popup hiển thị `Codex Live: Live ghi chú B2`; vùng B2:D4 có cạnh xanh đậm `3px` (`box-shadow inset rgb(7, 89, 133)` và `border-left: 3px`); ngắt tại D4 có cả `has-page-break-row`, `has-page-break-col`, computed border `dashed`; nút xóa làm `has-comment` biến mất; `pageerror=[]`.

## Giới hạn / review

- CSV không có comment/print metadata; luồng trung gian CSV hiện không bảo toàn chúng khi lưu/xuất XLSX/ODS.
- Chưa tích hợp vùng in/ngắt trang với Print Preview, `window.print()` hay engine in LibreOffice; task này chỉ lưu state phiên làm việc và hiển thị bố cục.
- Chưa merge vào `main`; chờ Claude review.
