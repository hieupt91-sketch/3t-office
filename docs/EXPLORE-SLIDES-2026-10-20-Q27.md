# Q27 — Soạn thử báo cáo quý trong Slides (20/10/2026)

## Môi trường và đầu ra

- Worktree `E:\VNOffice-codex-queue`, nhánh `codex/queue-19-10`; `git merge main` đã đồng bộ.
- CDP mở Slides, lưu PPTX qua `save_document_in_place`, đóng ứng dụng rồi mở lại PPTX trong tiến trình mới. Mỗi tiến trình có `VNO_CDP_LOCALAPPDATA` riêng.
- PPTX: `E:\VNOffice-profiles\q27-slides-run-03\q27-bao-cao-quy.pptx` (6 trang, một trang ẩn). PNG bìa: `q27-logo.png` trong cùng thư mục.
- PowerPoint COM mở ẩn/chỉ đọc bằng `tests/live/cdp/slides-q27-com-readonly.ps1`.
- Nhật ký CDP cuối: **27 PASS, 2 NOT SUPPORTED, 1 FAIL, 30 kiểm tra**; bảng dưới ghi 31 thao tác/đối chiếu chi tiết. Kết quả lượt CDP sau khi mở lại ghi nguyên nhân mất kết nối connector.

## Nhật ký thao tác và đối chiếu

| # | Thao tác | Kết quả |
|---:|---|---|
| 1 | Tạo trang bìa “Báo cáo quý” và phụ đề | PASS |
| 2 | Thêm trang “Doanh thu theo quý” | PASS |
| 3 | Thêm trang “Chỉ số vận hành” | PASS |
| 4 | Thêm trang “Quy trình triển khai” | PASS |
| 5 | Thêm trang “Ưu tiên quý tới” | PASS |
| 6 | Nhân đôi trang rồi đổi thành “Quyết định và bước tiếp theo”; tổng 6 trang | PASS |
| 7 | Dùng hai bố cục nội dung trong model | PASS — sau mở lại COM thấy `VNOTitleContent` và `VNOTwoContent` |
| 8 | Áp dụng Slide Master với bảng màu và logo chữ | PASS — chữ logo có trong metadata master |
| 9 | Đặt ảnh PNG làm logo trực tiếp trên Slide Master | NOT SUPPORTED — master hiện có `logoText`, không có trường ảnh/logo PNG |
| 10 | Chèn PNG vào trang bìa | PASS — COM thấy hình ảnh trên trang 1 |
| 11 | Chèn biểu đồ cột từ bốn cặp quý/giá trị | PASS — COM thấy biểu đồ thật, `HasTitle=true`, một series |
| 12 | Sửa dữ liệu Q4 từ 210 thành 225 | PASS — dữ liệu giữ nguyên sau mở lại |
| 13 | Biểu đồ nhiều series và đổi màu series | NOT SUPPORTED — schema hiện chỉ có `labels` và một mảng `data`; không có `SeriesCollection` tùy chỉnh hoặc màu series |
| 14 | Kiểm tra chú giải và nhãn dữ liệu biểu đồ | PASS — COM `HasLegend=true`, series đầu `HasDataLabels=true` |
| 15 | Chèn bảng 5×4 | PASS — COM `Rows=5`, `Columns=4` |
| 16 | Điền bốn chỉ tiêu và trạng thái | PASS — văn bản còn sau mở lại |
| 17 | Tô nền xanh hàng tiêu đề | PASS — model giữ `cellFills` |
| 18 | Gộp bốn ô hàng đầu | PASS — model giữ merge 1×4 |
| 19 | Tạo sơ đồ quy trình 4 nút, 3 connector | PASS — model có `sourceId`/`targetId` và 3 connector |
| 20 | Di chuyển cả sơ đồ 18×12 px | PASS — trong phiên hiện tại ID đầu nối vẫn tham chiếu đúng shape |
| 21 | Lưu/mở lại và kiểm tra đầu nối | FAIL — connector trở thành hình thường; PowerPoint COM thấy ba “Đường kết nối” là AutoShape trong nhóm, không có `ConnectorFormat.BeginConnected`/`EndConnected`; model sau mở lại cũng mất `sourceId`/`targetId` |
| 22 | Nhóm hình chữ nhật và hình elip | PASS — COM `GroupItems.Count=2` |
| 23 | Phóng to/di chuyển hai hình trong nhóm | PASS trong phiên CDP; kích thước mới được áp dụng cho cả hai shape |
| 24 | Bật số trang và chân trang áp dụng cho mọi slide | PASS trong model; metadata hiển thị sau mở lại |
| 25 | Bật ngày và định dạng ngày | PASS trong model; metadata hiển thị sau mở lại |
| 26 | Ẩn trang thứ sáu | PASS — PowerPoint COM báo `Hidden=true`, tổng slide vẫn là 6 |
| 27 | Thêm ghi chú thuyết trình 108 ký tự | PASS — COM đọc lại đúng nội dung |
| 28 | Đặt chuyển trang Quét | PASS — COM `EntryEffect=2817` |
| 29 | Đặt hai hoạt ảnh theo thứ tự trên trang ưu tiên | FAIL — CDP nhận hai lệnh; COM chỉ thấy một mục trong `MainSequence`, nên thứ tự/đủ hai hiệu ứng chưa đạt |
| 30 | Tạo Section “Kế hoạch quý tới” | PASS trong CDP; COM đọc được tên section nhưng thấy 4 section thay vì 2 (hai `Default Section` và hai section cùng tên), cần sửa đồng bộ section khi lưu/mở |
| 31 | Kéo trang trong khung thu nhỏ bên trái | PASS — đổi thứ tự “Chỉ số vận hành” và “Ưu tiên quý tới”; vẫn còn đủ 6 trang |

## Đối chiếu PowerPoint COM (ẩn, chỉ đọc)

- **PASS:** 6 trang; khổ 960×540; bố cục đọc được (`VNOTitleContent`, `VNOTwoContent`); biểu đồ thật có tiêu đề, chú giải, nhãn dữ liệu, 1 series; bảng 5×4; nhóm thường 2 mục và nhóm sơ đồ 7 mục; trang 6 ẩn; ghi chú; chuyển trang.
- **FAIL:** 0 connector có `BeginConnected`/`EndConnected`; một trang có một hiệu ứng trong timeline dù đã đặt hai; `SlideMaster.HeadersFooters` trả `SlideNumber=false`, `DateAndTime=false`, `Footer=false` và footer rỗng; COM trả 4 section, trong đó hai section tên “Kế hoạch quý tới”.
- Header/Footer/ngày/số trang vẫn xuất hiện trong model của app, nhưng chưa được lưu thành cờ HeadersFooters mà COM đọc được. Không kết luận rằng nội dung placeholder có/không hiển thị trong mọi trình xem từ các cờ master này.
- Không sửa mã sản phẩm trong Q27; các FAIL được giữ nguyên trong bài CDP, không nới expected. Vì vậy chưa có cặp CDP FAIL-trước/PASS-sau cho các lỗi trên.

## Tệp và quyết định tiếp theo

- CDP: `tests/live/cdp/slides-q27-quarter-report.desktop.mjs`.
- COM readback: `tests/live/cdp/slides-q27-com-readonly.ps1`.
- Không thêm Help/i18n hoặc command mới: lượt này chỉ kiểm thử hành vi đã có; hai yêu cầu chưa hỗ trợ và ba lỗi round-trip được giao lại để xử lý ở phiếu sửa riêng.
- Các lệnh gate của Q27 và handoff nằm ở phần Q27 trong `09-templates/AGENT-HANDOFF.md`.
