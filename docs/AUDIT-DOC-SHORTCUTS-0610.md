# Audit phím tắt VN Writer — 06/10/2026

Phạm vi: các phím trong bảng VN Writer của `docs/SHORTCUT-COVERAGE.md` và các phím được ticket nêu thêm (Ctrl+G, Ctrl+Shift+L, Alt+Shift+Left/Right). Tổng cộng 42 tổ hợp, bao gồm Ctrl+Shift+S. Audit chạy desktop app qua CDP bằng `node --experimental-websocket scripts/audit-0610/doc_shortcuts.mjs`; sự kiện bàn phím dùng `Input.dispatchKeyEvent`.

| Kết quả | Số lượng |
|---|---:|
| Có hoạt động được chứng minh qua DOM/model | 9 |
| Sai theo trạng thái DOM quan sát được | 2 |
| Xung đột / chưa thực thi như mong đợi | 1 |
| Thiếu bằng chứng đủ tin cậy | 30 |
| **Tổng** | **42** |

## Bảng đối chiếu

| Phím | Kết quả | Bằng chứng quan sát |
|---|---|---|
| Ctrl+B | Sai | `document.queryCommandState('bold')` vẫn false sau phím |
| Ctrl+I | Có hoạt động | `queryCommandState('italic')` thành true |
| Ctrl+U | Sai | `document.queryCommandState('underline')` vẫn false sau phím |
| Ctrl+L | Có hoạt động | đoạn có `text-align: left` |
| Ctrl+E | Có hoạt động | đoạn có `text-align: center` |
| Ctrl+R | Có hoạt động | đoạn có `text-align: right` |
| Ctrl+J | Có hoạt động | đoạn có `text-align: justify` |
| Ctrl+1 | Có hoạt động | model đoạn có `--vno-lh: 1` |
| Ctrl+2 | Có hoạt động | model đoạn có `--vno-lh: 2` |
| Ctrl+5 | Có hoạt động | model đoạn có `--vno-lh: 1.5` |
| Ctrl+Z | Xung đột | sau chuỗi thay đổi định dạng, phím không đổi text đã lấy làm dấu kiểm |
| Ctrl+Y | Thiếu | chưa cô lập được một thao tác undo/redo để xác nhận chính xác |
| Ctrl+F | Thiếu | selector hộp thoại quá rộng, chứa overlay ngôn ngữ ẩn; không xác minh được panel Tìm |
| Ctrl+H | Thiếu | selector hộp thoại quá rộng, chứa overlay ngôn ngữ ẩn; không xác minh được panel Thay thế |
| Ctrl+G | Thiếu | chưa có đối tượng được chọn và kiểm tra nhóm đối tượng trong Writer |
| Ctrl+Enter | Có hoạt động | HTML/model tài liệu thay đổi; xuất hiện marker ngắt trang |
| Ctrl+Shift+L | Thiếu | chưa phân biệt được phím của Writer với binding Filter của Sheet |
| Alt+Shift+Left | Thiếu | chưa dựng hai đoạn có nội dung để xác minh đổi thứ tự |
| Alt+Shift+Right | Thiếu | chưa dựng hai đoạn có nội dung để xác minh đổi thứ tự |
| Alt+Shift+Up | Thiếu | chưa dựng hai đoạn có nội dung để xác minh đổi thứ tự |
| Alt+Shift+Down | Thiếu | chưa dựng hai đoạn có nội dung để xác minh đổi thứ tự |
| Ctrl+K | Thiếu | hộp thoại/command chưa được xác minh bằng selector đặc thù |
| F7 | Thiếu | hộp thoại/command chưa được xác minh bằng selector đặc thù |
| F12 | Thiếu | hộp thoại Lưu thành chưa được xác minh bằng selector đặc thù |
| Ctrl+Shift+S | Thiếu | hộp thoại Lưu thành chưa được xác minh bằng selector đặc thù |
| Ctrl+N | Thiếu | chưa kiểm tra trạng thái tài liệu mới sau khi prompt lưu được xử lý |
| Ctrl+O | Thiếu | chưa xác minh bộ chọn tệp và kết quả mở tệp |
| Ctrl+S | Thiếu | chưa kiểm tra file/model sau khi lưu |
| Ctrl+P | Thiếu | chưa xác minh preview/in |
| Ctrl+X | Thiếu | chưa cô lập vùng chọn và xác minh clipboard/model |
| Ctrl+C | Thiếu | chưa cô lập vùng chọn và xác minh clipboard |
| Ctrl+V | Thiếu | chưa cô lập clipboard và xác minh model |
| Ctrl+A | Thiếu | chưa kiểm tra chính xác vùng chọn toàn tài liệu |
| Ctrl+Shift+> | Thiếu | chưa đo cỡ chữ trước/sau |
| Ctrl+Shift+< | Thiếu | chưa đo cỡ chữ trước/sau |
| Ctrl+M | Thiếu | chưa đo thụt lề trước/sau |
| Ctrl+Shift+M | Thiếu | chưa đo thụt lề trước/sau |
| Shift+F3 | Thiếu | đã thấy chữ đổi hoa/thường, nhưng chưa xác minh các trạng thái chu kỳ theo vùng chọn |
| Ctrl+Home | Thiếu | chưa xác minh caret ở đầu model tài liệu |
| Ctrl+End | Thiếu | chưa xác minh caret ở cuối model tài liệu |
| Ctrl+] | Thiếu | chưa đo cỡ chữ trước/sau |
| Ctrl+[ | Thiếu | chưa đo cỡ chữ trước/sau |

## Chẩn đoán / việc còn lại

- Ctrl+B và Ctrl+U không đổi trạng thái inline mà audit đọc được. Cần lặp lại với vùng chọn văn bản (thay vì caret) và đọc trạng thái mark trong model Writer trước khi kết luận lỗi command.
- Ctrl+Z hiện chưa có precondition riêng cho mỗi phép đo; phép đo text không phát hiện undo định dạng. Đây là hạn chế của audit, chưa đủ căn cứ để sửa undo.
- Những dòng “Thiếu” là chưa có phép kiểm chứng đúng theo hành vi Office; không được hiểu là shortcut chắc chắn hỏng.
- Không sửa implementation vì các tín hiệu Ctrl+B/U chưa được tái hiện bằng phép thử có precondition đáng tin cậy. Không thêm tính năng nên không phát sinh nội dung Hướng dẫn trong app.

## Kiểm thử

- Audit CDP: chạy được với `node --experimental-websocket scripts/audit-0610/doc_shortcuts.mjs`; kết quả như bảng trên.
- `node tests/run-tests.js`: NOT RUN (lệnh khởi chạy trong terminal nhưng chưa kết thúc tại thời điểm lập báo cáo).
