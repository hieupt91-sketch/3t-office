# Nhiệm vụ: Visual QA cho 2 tính năng vừa xây xong (chỉ UI, KHÔNG sửa logic engine)

## Phạm vi

Bạn CHỈ kiểm tra và sửa vấn đề THỊ GIÁC/TƯƠNG TÁC (CSS, vị trí pixel,
cursor, animation, độ tương phản, responsive). KHÔNG được sửa logic
parse/serialize FODT/FODP hay công thức toán học xoay hình (đã được
kiểm chứng kỹ ở phiên trước). Nếu nghi ngờ có bug LOGIC (không phải
UI), DỪNG LẠI và ghi rõ vào báo cáo thay vì tự sửa.

## Tính năng 1: Xoay hình khối trong Slides (Slides shape rotation)

File liên quan: `apps/slides/slides-canvas.js` (tìm `_attachRotateHandle`,
`_ensureShapeSelectionHandles`, `cursorForHandle`, `resetShapeRotation`).

Việc cần làm:
1. Mở app Slides thật (dev server), tạo vài hình khối (rect, ellipse,
   textbox), xoay bằng tay cầm xoay (rotate handle).
2. Kiểm tra ở NHIỀU độ zoom/kích thước cửa sổ khác nhau (1280px,
   1600px, và thu nhỏ cửa sổ ~ 1024px) xem:
   - Tay cầm xoay (rotate handle) có bị lệch vị trí, đè lên hình, hoặc
     biến mất không.
   - Các tay cầm resize (8 hướng) sau khi xoay có nằm đúng vị trí góc/
     cạnh hình đã xoay không (không phải vị trí hình chưa xoay).
   - Con trỏ chuột (cursor) khi hover từng tay cầm resize có đổi hướng
     hợp lý theo góc xoay không (đã có logic `cursorForHandle`, chỉ
     kiểm tra HIỂN THỊ đúng, không sửa công thức).
   - Nút xóa (delete button) có bị xoay theo hình (nhìn ngược/xiên) hay
     đã đứng thẳng đúng như thiết kế (counter-rotation).
   - Giữ Shift khi xoay có snap về bội số 15 độ mượt mà, có phản hồi
     thị giác rõ ràng không (ví dụ đường viền/số độ hiện ra) — nếu
     THIẾU phản hồi thị giác (không hiện số độ đang xoay), hãy THÊM
     một tooltip nhỏ hiện số độ hiện tại cạnh tay cầm khi đang kéo
     (giống Google Slides/PowerPoint) — đây là việc UI được phép làm.
3. Test cả trong chế độ trình chiếu (slideshow) xem hình xoay hiển thị
   đúng không (không có tay cầm/UI thừa hiện ra khi trình chiếu).

## Tính năng 2: Kéo-thả ảnh trong Sheet có Freeze Panes (Sheet image drag + freeze pane)

File liên quan: `apps/sheet/sheet-grid.js` (tìm `_attachImageDrag`,
`_getAnchorFromPixel`, `renderImages`, `_updateFrozenImages`).

Việc cần làm:
1. Mở app Sheet thật, chèn 1-2 ảnh, đặt Freeze Panes (đóng băng dòng/
   cột), cuộn ngang/dọc.
2. Kiểm tra ảnh nằm trong vùng đóng băng có "dính" đúng vị trí khi
   cuộn không bị giật/lệch pixel không (offset đã đồng bộ 24px/44px ở
   phiên trước, chỉ xác nhận THỊ GIÁC mượt, không có hiện tượng
   nhấp nháy/nhảy khung khi cuộn nhanh).
3. Kéo-thả ảnh (cả trong vùng đóng băng và vùng thường) — xác nhận vị
   trí thả có khớp đúng ô như kỳ vọng, có phản hồi thị giác khi kéo
   (ví dụ viền highlight ô đích) hay chỉ có ảnh di chuyển trơn — nếu
   thiếu, có thể thêm hiệu ứng highlight ô đích khi đang kéo gần đó
   (việc UI được phép làm).
4. Test ở vài kích thước cửa sổ khác nhau.

## Công cụ kiểm thử

Có sẵn Playwright trong `tests/live/`. Có thể viết 1 test Playwright
mới để chụp ảnh màn hình các trạng thái trên (trước/sau khi sửa nếu
có sửa) làm bằng chứng, đặt tên
`tests/live/slides-rotation-visual-qa.playwright.mjs` và
`tests/live/sheet-image-drag-freeze-visual-qa.playwright.mjs`.

## Bắt buộc trước khi báo cáo xong

- `node scripts/check-syntax.js` phải 89/89 PASS (số file sẽ tăng nếu
  bạn thêm file mới — không sao, miễn PASS 100%).
- `node tests/run-tests.js` KHÔNG được giảm số PASS so với hiện tại.
- Nếu có sửa CSS/JS UI, chạy lại
  `node tests/live/ribbon-audit-1280.playwright.mjs` để chắc chắn
  không phá vỡ ribbon.
- Viết `docs/HANDOFF-VISUAL-QA-ROTATION-AND-IMAGE-DRAG.md` liệt kê rõ:
  đã kiểm tra gì, tìm thấy vấn đề gì (nếu có), đã sửa gì, ảnh chụp màn
  hình bằng chứng (đường dẫn file .png nếu Playwright lưu lại).
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo. Nếu không có
  gì để sửa (mọi thứ đã ổn), vẫn phải có ít nhất commit thêm 2 file
  test Playwright QA + file HANDOFF ghi lại kết quả kiểm tra (bằng
  chứng đã thực sự kiểm tra, không phải chỉ đọc code).

## Ranh giới an toàn

- KHÔNG sửa file trong `adapters/libreoffice/**` (đó là logic
  parse/serialize, không phải UI).
- KHÔNG sửa công thức toán học xoay/resize trong
  `_attachResizeHandle`/`_attachRotateHandle` (đã kiểm chứng kỹ).
- KHÔNG đụng Writer.
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
