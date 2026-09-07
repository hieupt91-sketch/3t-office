# Nhiệm vụ: Kiểm tra thị giác luồng Lưu file THẬT của Writer (UI thao tác Lưu)

## Bối cảnh

Một nhiệm vụ song song (opencode, nhánh
`test/writer-save-roundtrip-fidelity`) đang kiểm thử round-trip Lưu
file ở TẦNG PYTHON (gọi thẳng `main.py`, không qua UI). Nhiệm vụ CỦA
BẠN khác: kiểm tra THAO TÁC LƯU THẬT qua giao diện người dùng (click
nút Lưu, xem phản hồi UI) — góc độ UI/UX, không phải góc độ dữ liệu.

## Việc cần làm

1. Mở app Writer thật (dev server qua Playwright), gõ hoặc dán một số
   nội dung thật (tiếng Việt, có bảng nếu tiện — dùng lệnh chèn bảng
   có sẵn trong ribbon).
2. Thử tính năng "Khoảng cách trước/sau đoạn" vừa xong
   (`writer.para.spacingBefore`/`spacingAfter` trong tab Bố cục) —
   chọn vài mức khác nhau cho vài đoạn khác nhau.
3. Kích hoạt lệnh Lưu (`common.file.save`/Ctrl+S hoặc nút Lưu trong
   Backstage) — vì môi trường Playwright không có hộp thoại native
   thật (pywebview), hãy kiểm tra:
   - Command có gọi đúng `globalUnoBridge`/API tương ứng không (dùng
     DevTools/network hoặc stub để xác nhận lệnh được phát đúng, đúng
     `content` hiện tại của editor được truyền đi).
   - Phản hồi UI khi API Lưu KHÔNG khả dụng (môi trường không có
     LibreOffice/desktop) — có thông báo lỗi rõ ràng, thân thiện cho
     người dùng không, hay bị treo/im lặng?
   - Trạng thái nút Lưu, biểu tượng "đã lưu/chưa lưu" (nếu có) có cập
     nhật đúng sau khi gọi Lưu (giả lập thành công) không?
4. Kiểm tra phím tắt Ctrl+S có hoạt động giống hệt nút Lưu trong
   Backstage không (cùng 1 command).
5. Nếu tìm thấy vấn đề UI/UX thuần túy (thiếu phản hồi, thông báo lỗi
   không rõ, nút không cập nhật trạng thái...), sửa an toàn trong
   phạm vi hẹp. Nếu là vấn đề logic Python/luồng dữ liệu, CHỈ báo cáo,
   không tự sửa (nhiệm vụ song song đang xử lý phần đó).

## Kiểm thử bắt buộc

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: không giảm so với hiện tại (1511).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS nếu
  có sửa CSS/UI.
- Viết 1 test Playwright mới (`tests/live/writer-save-flow-ui-qa.playwright.mjs`
  hoặc tên tương tự) xác nhận thao tác Lưu qua UI (Ctrl+S và nút
  Backstage) đều phát đúng lệnh, đúng nội dung.
- Viết `docs/HANDOFF-WRITER-SAVE-FLOW-UI-QA.md`.
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo.

## Ranh giới an toàn

- KHÔNG sửa `main.py`.
- KHÔNG đụng logic round-trip dữ liệu (nhiệm vụ song song đang làm) —
  chỉ tập trung UI/UX của thao tác Lưu.
- KHÔNG đụng Sheet/Slides.
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
