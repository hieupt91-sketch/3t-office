# Audit DOC Ribbon: Danh giá + Chế độ xem — 10/10

## Phạm vi và kết quả chạy

- Phạm vi lần này: hai tab **Danh giá** và **Chế độ xem**; Trợ giúp, AI và tab ngữ cảnh để sau.
- `doc_tab_effect_probe.mjs review/view`: **BLOCKED**. Khi kiểm tra môi trường đã có Writer PID `9184`, LibreOffice worker PID `16716` và `1236`, Word COM PID `14132`; mở thêm app sẽ vi phạm giới hạn một app + một Word. Không gửi thao tác vào app đang chạy, không đóng tiến trình của người dùng.
- DOM thực tế, `aria-pressed`/`aria-checked`, XML DOCX sau thao tác và Word COM cho lần audit này: **NOT RUN**. Vì vậy không có nút nào được xác nhận PASS/DUNG hoặc FAIL/SAI. Không chụp ảnh.
- Không có sửa source; không có thao tác lưu tệp tài liệu. Yêu cầu lưu DOCX nhập từ DOCX + đọc XML + mở lại Word COM vẫn cần thực hiện cho từng nút làm thay đổi tài liệu khi chạy lại live.

## Inventory khai báo trong source

Source khai báo 15 mục ở tab `review` (gồm `ai.assistant.grammarCheck`, ngoài phần kiểm tra ưu tiên của ticket) và 14 mục ở tab `view` (gồm hai lệnh Macro). Ticket ghi 14 và 13. Đây là lệch inventory tĩnh; cần đo DOM để xác nhận mục nào thực sự hiển thị. Dưới đây liệt kê tất cả mục khai báo ở hai tab để không bỏ sót.

| commandId | Nhãn | Ngữ cảnh cần kiểm | Hiệu quả app | Hiệu quả Word / DOCX | Kết luận | Phím tắt khai báo |
|---|---|---|---|---|---|---|
| `ai.assistant.grammarCheck` | Kiểm tra ngữ pháp AI | Chọn văn bản, không chọn; d07 | BLOCKED: không đo DOM/handler | BLOCKED: không gửi nội dung, không lưu | BLOCKED | — |
| `writer.review.toggleSpellCheck` | Kiểm tra chính tả | Đầu/giữa/cuối d07; bật/tắt | BLOCKED: toggle/state chưa đo | Không ghi DOCX; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.review.wordCount` | Đếm từ | Không chọn và vùng chọn | BLOCKED: hộp thoại/số liệu chưa đo | Không ghi DOCX; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.comment.insert` | Thêm ghi chú | Vùng chọn trong d07 | BLOCKED: chưa thêm ghi chú | Cần kiểm `word/comments.xml`, `w:comment`, tác giả/ngày và Word COM | BLOCKED | Ctrl+Alt+M (chưa bấm) |
| `writer.review.commentDelete` | Xóa nhận xét | Nhận xét được chọn/không có nhận xét | BLOCKED | Cần kiểm comment bị xóa trong DOCX + Word COM | BLOCKED | — |
| `writer.review.commentResolve` | Đã xử lý | Nhận xét đang mở/đã xử lý | BLOCKED | Cần kiểm trạng thái resolved sau lưu + Word COM | BLOCKED | — |
| `writer.review.commentPrevious` | Nhận xét trước | Tài liệu có nhiều nhận xét | BLOCKED | Không dự kiến sửa nội dung; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.review.commentNext` | Nhận xét sau | Tài liệu có nhiều nhận xét | BLOCKED | Không dự kiến sửa nội dung; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.trackChanges.toggle` | Theo dõi thay đổi | Đầu/giữa/cuối; bật/tắt, sửa rồi hoàn tác | BLOCKED: trạng thái và DOM chưa đo | Cần kiểm `w:trackRevisions`, `w:ins`, `w:del`, tác giả/ngày và Word COM | BLOCKED | Ctrl+Shift+E (chưa bấm) |
| `writer.trackChanges.acceptOne` | Chấp nhận một | Con trỏ trên một thay đổi | BLOCKED | Cần kiểm `w:ins`/`w:del` được chấp nhận trong DOCX + Word COM | BLOCKED | — |
| `writer.trackChanges.acceptAll` | Chấp nhận thay đổi | Tài liệu có nhiều thay đổi | BLOCKED | Cần kiểm toàn bộ revision trong DOCX + Word COM | BLOCKED | — |
| `writer.trackChanges.rejectOne` | Từ chối một | Con trỏ trên một thay đổi | BLOCKED | Cần kiểm `w:ins`/`w:del` bị từ chối trong DOCX + Word COM | BLOCKED | — |
| `writer.trackChanges.rejectAll` | Từ chối thay đổi | Tài liệu có nhiều thay đổi | BLOCKED | Cần kiểm toàn bộ revision trong DOCX + Word COM | BLOCKED | — |
| `writer.trackChanges.previous` | Thay đổi trước | Tài liệu có nhiều thay đổi | BLOCKED: vị trí con trỏ chưa đo | Không dự kiến sửa DOCX; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.trackChanges.next` | Thay đổi sau | Tài liệu có nhiều thay đổi | BLOCKED: vị trí con trỏ chưa đo | Không dự kiến sửa DOCX; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.readMode` | Chế độ đọc | Tài liệu dài; bật/thoát Esc | BLOCKED: DOM/layout chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.printLayout` | Bố trí in | Đầu/giữa/cuối d07 | BLOCKED: trang/cuộn chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.webLayout` | Bố trí Web | Đầu/giữa/cuối d07 | BLOCKED: chiều rộng/cuộn chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.navigationPane` | Ngăn dẫn hướng | Tài liệu có heading; mở/tắt, nhảy heading | BLOCKED: pane/state chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | Ctrl+Alt+N (chưa bấm) |
| `writer.view.ruler` | Thước | Bật/tắt; nhiều vị trí cuộn | BLOCKED: DOM/state chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.gridlines` | Đường lưới | Bật/tắt | BLOCKED: DOM/state chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.zoomIn` | Phóng to | Tỉ lệ nhỏ/100%/trần | BLOCKED: tỉ lệ và kích thước/cuộn chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.zoomOut` | Thu nhỏ | Tỉ lệ lớn/100%/sàn | BLOCKED: tỉ lệ và kích thước/cuộn chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.zoom100` | 100% | Từ mức khác về 100% | BLOCKED: trạng thái chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.zoomReset` | Đặt lại | Từ mức khác về 100% | BLOCKED: trạng thái chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.pageWidth` | Chiều rộng trang | Viewport hiện tại | BLOCKED: zoom/chiều rộng/cuộn chưa đo | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `writer.view.newWindow` | Cửa sổ mới | Desktop và tài liệu đang mở | BLOCKED: chưa mở cửa sổ | Chỉ hiển thị; Word COM chưa đối chiếu | BLOCKED | — |
| `common.macro.recordToggle` | Bắt đầu/dừng ghi Macro | Trước/sau khi ghi | BLOCKED: ngoài trọng tâm view; chưa đo | Không dự kiến sửa DOCX; Word COM chưa đối chiếu | BLOCKED | — |
| `common.macro.manager` | Macro | Mở trình quản lý | BLOCKED: ngoài trọng tâm view; chưa đo | Không dự kiến sửa DOCX; Word COM chưa đối chiếu | BLOCKED | — |

## Phím tắt và mục thiếu

- Source khai báo shortcut cho các nút thuộc phạm vi: Thêm ghi chú `Ctrl+Alt+M`, Theo dõi thay đổi `Ctrl+Shift+E`, Ngăn dẫn hướng `Ctrl+Alt+N`. Cả ba: **chưa kiểm bằng CDP**.
- Các nút còn lại không khai báo shortcut trong command definitions. Theo quy tắc ticket, không bổ sung phím tắt trong đợt này.
- Danh sách nút/phím tắt thiếu so với Word: **NOT RUN** (chưa đối chiếu Word COM và UI thật).
- Hai tên tab dự kiến sau: Trợ giúp, AI và tab ngữ cảnh; không thuộc report này.

## Bước tiếp theo

Khi Writer và Word COM hiện tại đã đóng hợp lệ, chạy riêng từng tab trên bản d07 kiểm thử bằng CDP; thu DOM/trạng thái toggle; với ghi chú/theo dõi/chấp nhận/từ chối phải lưu DOCX nhập từ DOCX, đọc XML và mở lại bằng Word COM trước khi kết luận. Sau đó chạy lại toàn tab hai lần theo quy tắc audit. Không chạy bộ 28 XLSX.
