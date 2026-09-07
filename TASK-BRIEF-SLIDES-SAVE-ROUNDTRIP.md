# Nhiệm vụ: Kiểm tra thị giác round-trip Lưu file của Slides (đặc biệt tính năng Xoay hình vừa xây)

## Bối cảnh

Phiên làm việc gần đây xây dựng đầy đủ tính năng xoay hình khối trong
Slides (rotate handle, resize theo góc xoay, serialize FODT/FODP) —
đã kiểm thử kỹ qua unit test (round-trip FODT/FODP idempotent) VÀ qua
visual QA trên canvas (`docs/HANDOFF-VISUAL-QA-ROTATION-AND-IMAGE-DRAG.md`).
**Nhưng CHƯA từng kiểm thử qua vòng Lưu file THẬT** (FODP → soffice →
.pptx → soffice → FODP → canvas) — khác với unit test (chỉ
serializeToFodp()/parseFodp() nội bộ, không qua soffice thật). Không
có file `.pptx` thật nào trong `file test/` để test (đã xác nhận
trước đó), nên dùng nội dung TỰ TẠO trong app (giống cách agy tạo nội
dung cho các test QA trước).

## Việc cần làm

1. Mở app Slides, tạo vài hình khối (rect, ellipse, textbox) và XOAY
   chúng ở vài góc khác nhau (30°, 90°, 135°) bằng tay cầm xoay thật.
2. Kích hoạt luồng Lưu THẬT: dùng `main.py`
   `save_document_dialog(content, "slides", target_format="pptx", ...)`
   qua Python trực tiếp (giống cách
   `scripts/generate_live_open_payloads.py` gọi `open_document_dialog`
   — bạn cần viết script Python tương tự gọi CẢ save VÀ open lại, mock
   `_active_window`/`create_file_dialog` để chạy headless không cần
   dialog thật) — LẤY `content` (FODP) từ canvas Slides thật đang chạy
   (dùng Playwright lấy `slidesAdapter.serializeToFodp()` hoặc tương
   đương từ trang đang mở, rồi truyền sang script Python để Lưu/Mở lại
   qua soffice thật).
3. Mở lại file `.pptx` vừa lưu (qua đúng luồng `open_document_dialog`
   thật), TIÊM kết quả FODP đó vào canvas Slides (giống cách nhiệm vụ
   QA trước đã làm với Writer — xem
   `tests/live/writer-live-open-qa.playwright.mjs` để tham khảo cách
   nạp payload thật vào app đang chạy qua Playwright).
4. Chụp ảnh màn hình SO SÁNH: hình xoay trước Lưu và sau khi Mở lại có
   giữ ĐÚNG góc xoay không (bằng mắt, không lệch rõ rệt)? Vị trí/kích
   thước có giữ nguyên không? Tay cầm resize/xoay có hoạt động bình
   thường trên hình vừa mở lại (không bị "đông cứng"/mất tương tác)
   không?

## Kiểm thử bắt buộc

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: không giảm so với hiện tại (1511).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS nếu
  có sửa CSS.
- Viết `docs/HANDOFF-SLIDES-SAVE-ROUNDTRIP-VISUAL-QA.md` — mô tả
  phương pháp, ảnh chụp trước/sau, kết luận có lỗi hay không.
- Nếu tìm thấy lỗi UI/CSS thuần túy, sửa an toàn phạm vi hẹp. Nếu là
  lỗi logic serialize/parse FODP hay Python, CHỈ báo cáo rõ, KHÔNG tự
  sửa.
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo.

## Ranh giới an toàn

- KHÔNG sửa `main.py`.
- KHÔNG sửa `adapters/libreoffice/slides/slides-adapter.js`
  (serializeToFodp/parseFodp) trừ khi lỗi CHẮC CHẮN đơn giản.
- KHÔNG đụng Writer/Sheet.
- Nếu việc mô phỏng ở bước 2-3 (nối Python script với canvas Playwright)
  quá phức tạp sau khi đã cố gắng, DỪNG LẠI và báo cáo rõ đã thử gì,
  kẹt ở đâu — KHÔNG bịa kết quả.
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
