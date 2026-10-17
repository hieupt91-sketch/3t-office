# Kế hoạch: VN Slides – Thông tin tài liệu trong Backstage

## Mục tiêu
Bổ sung cho VN Slides các mục Thuộc tính, Đánh dấu là cuối cùng và Kiểm tra bản trình bày trong Tệp > Thông tin; bảo toàn và lưu/đọc đúng metadata PPTX. Dùng chung hộp thoại properties ở Shared Platform để Writer, Sheet và Slides gọi cùng một triển khai. Không thay đổi hành vi hiện tại của Writer/Sheet.

## Hiện trạng
- `platform/shell/app-shell.js` đã có panel Thông tin và thao tác properties/final/inspector, nhưng chỉ cho Writer và Sheet.
- Sheet có hộp thoại metadata cùng hàm chuẩn hóa/đánh dấu trong `apps/sheet/document-properties.js`; Writer có một triển khai khác. Slides chưa có các adapter API và hộp thoại riêng.
- `adapters/libreoffice/common/ooxml_zip_patch.py` đã xử lý core properties cho XLSX và Writer. Luồng PPTX đã có các hook postprocess/overlay cần mở rộng có mục tiêu để ghi và nạp `docProps/core.xml`.
- Hướng dẫn Slides và chuỗi VI/EN có hệ thống hiện hữu tại `platform/help/entries-slides.js` và `platform/i18n/`.

## Tệp/module dự kiến
- Thêm `platform/dialogs/document-properties.js` làm triển khai dùng chung; chuyển Sheet/Writer sang import/re-export tương thích, không để Slides phụ thuộc nội bộ app khác.
- Cập nhật `platform/shell/app-shell.js` để hiển thị Thông tin cho Slides, với nhãn/strings hiện có hoặc bổ sung tương ứng.
- Cập nhật adapter Slides để expose `documentProperties`, `openDocumentPropertiesDialog`, `markAsFinal`, `isFinal` và `openDocumentInspectorDialog`; thêm inspector đặc thù Slides ở `apps/slides/`.
- Mở rộng `adapters/libreoffice/common/ooxml_zip_patch.py` để ghi/đọc core properties PPTX, gồm title, creator/author, subject, keywords, description/comments và contentStatus.
- Bổ sung chuỗi VI/EN, hướng dẫn cụ thể trong `platform/help/entries-slides.js`, help coverage và test unit/Python/CDP cần thiết.
- Dùng `09-templates/AGENT-HANDOFF.md` để hoàn tất handoff.

## Phụ thuộc
Tái sử dụng adapter LibreOffice, luồng PPTX hiện hữu và Shared Platform dialogs/i18n/help. Không thêm dependency, không sửa LibreOffice Core, không gọi implementation LibreOffice từ UI. Metadata phải đi qua adapter và hậu xử lý OOXML hiện hữu.

## Rủi ro và kiểm soát
- Nguy cơ hồi quy Writer/Sheet khi chuyển hộp thoại dùng chung: giữ API/export tương thích và chạy bộ test toàn phần.
- PPTX có thể bị mất metadata gốc khi người dùng không sửa: khi đọc file phải giữ author/company cùng các trường hiện có; khi ghi không được xóa trường không được quản lý hoặc metadata không đổi.
- Các thành phần inspector khác nhau theo ứng dụng: giữ việc phát hiện/xóa nội dung trình chiếu trong `apps/slides/`, không trộn vào Platform.
- Không thay đổi semantics định dạng hoặc Core; chỉ sửa các phần OOXML cần thiết cho thuộc tính yêu cầu.

## Kế hoạch kiểm thử
- Unit tests cho dialog dùng chung, adapter/Backstage Slides, inspector và bảo toàn metadata PPTX.
- `python -m pytest -q tests/test_slides_source_transition.py tests/test_writer_run_effects.py` cùng test mới liên quan.
- `node tests/run-tests.js` sau khi cập nhật từ `main`; kiểm tra i18n parity và help coverage.
- Desktop CDP qua app thật, chuột/bàn phím, với kịch bản phù hợp `tests/live/cdp/`; xác nhận Sheet/Writer Thông tin còn hoạt động.
- Nếu PowerPoint 2016 COM khả dụng: chạy ẩn với PID do phiên này tạo, xác nhận round-trip metadata và Content status. Không dùng SendKeys và không làm Office Visible.
- Báo PASS/FAIL/NOT RUN/BLOCKED kèm số liệu; không suy diễn PASS cho kiểm tra chưa chạy.

## Rollback
Mỗi giai đoạn được commit riêng. Nếu có hồi quy, revert commit tính năng theo thứ tự ngược; commit kế hoạch vẫn lưu lịch sử. Không dùng reset/clean hoặc lệnh Git phá hủy dữ liệu.
