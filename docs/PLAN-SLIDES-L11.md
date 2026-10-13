# PLAN — FIX-L11: Độ trung thực nút Lệch của Slides với PowerPoint

## Mục tiêu
Sửa các điểm lệch đã nêu trong `docs/tickets-0710/FIX-L11.md` trên đường lưu/mở PPTX: lưu kiểu bố cục chiếu và liên kết slide với bố cục đúng; lưu/đọc lại theme; ánh xạ hiệu ứng chuyển tiếp sang enum OOXML đúng; xuất WordArt thành đối tượng có thể sửa; nhóm các hình sơ đồ để chọn/di chuyển như một khối. SmartArt native được ghi nhận là việc lớn và nằm ngoài phạm vi.

## Năng lực hiện tại
- VN Slides dựng mô hình chiếu và FODP qua `apps/slides/slides-canvas.js` và adapter Slides; kết quả PPTX qua LibreOffice có hậu xử lý OOXML trong `adapters/libreoffice`.
- Hiện bố cục FODP dùng thuộc tính `presentation:layout` không chuẩn thay vì tên presentation page layout của ODF, và dữ liệu tạo trang/layout cần được đối chiếu với cấu trúc `ppt/slideLayouts` do LO xuất.
- Gallery theme và hiệu ứng chuyển tiếp đã có ở UI/model; cần xác định dữ liệu đã serialize/read chưa, rồi mở rộng hậu xử lý gói PPTX có giới hạn cho theme và mã transition.
- WordArt hiện xuất dưới dạng textbox; sơ đồ đang tạo các hình rời. Reuse logic serializer/OOXML có sẵn trước khi thêm hậu xử lý mới.
- Help tiếng Việt cho Slides đã có registry tập trung ở `platform/help/entries-slides.js`; cập nhật mục hướng dẫn hiện có hoặc bổ sung mục cụ thể cho thao tác bị sửa.

## Phạm vi file/module dự kiến
- `adapters/libreoffice/slides/slides-adapter.js`, `apps/slides/slides-canvas.js` và/hoặc module OOXML Slides hiện có: serialize/read bố cục, theme, transition, WordArt và nhóm sơ đồ theo mô hình đang dùng.
- Module dùng chung `adapters/libreoffice/common/ooxml_zip_patch.py` chỉ khi cần; ưu tiên adapter Slides cụ thể để tránh tác động app khác.
- `tests/test_slides_pptx_*.py`, `tests/unit/slides-*.test.js` và/hoặc kiểm thử CDP chuyên biệt: hồi quy cho các thuộc tính OOXML cùng vòng mở lại; kiểm tra slide/shape count, tính sửa được và không làm biến đổi tài liệu nhập ngoài ý muốn.
- `platform/help/entries-slides.js`: hướng dẫn tiếng Việt theo đúng tên tab/nhóm/nút hiện có nếu hành vi hoặc thao tác liên quan thay đổi.
- `docs/tickets-0710/HANDOFF-FIX-L11-CODEX.md`: handoff hoàn tất theo mẫu repo.

Phạm vi cuối sẽ được chốt sau khi đọc code và có thể giảm số file bằng cách tái sử dụng serializer hiện hữu; không sửa LibreOffice Core.

## Phụ thuộc và ranh giới
Tái sử dụng LibreOffice Impress cho ODF→PPTX; không thêm dependency. Mọi chuyển đổi thuộc tính gói nằm trong Slides adapter/hậu xử lý, không gọi nội bộ LibreOffice từ UI. Chủ sở hữu: `apps/slides/**` (Slides), `adapters/**` (tích hợp), `platform/help/**` (hướng dẫn), `tests/**` (QA). Không thực hiện SmartArt native. Không thêm dữ liệu tài liệu ra mạng.

## Rủi ro và giảm thiểu
- Layout ID/name và quan hệ slide→layout có thể được LibreOffice sắp lại: xác thực quan hệ qua package/PowerPoint COM và giữ nguyên số slide/hình.
- OOXML theme có các part/relationship và scheme phụ thuộc nhau: thay đổi có giới hạn theo theme được chọn, bảo toàn các part không liên quan, mở lại để xác nhận cả màu/font và tên.
- Mã hiệu ứng transition là enum số có thể khác tên UI: lập bảng ánh xạ tường minh cho mọi hiệu ứng UI hiện có và kiểm tra bằng PowerPoint COM.
- WordArt OOXML cần giữ khả năng sửa; không đổi hình học/nội dung hoặc âm thầm rasterize. Kiểm tra loại shape và nội dung sau khi mở trong PowerPoint.
- Group shape có thể làm thay đổi số shape cấp cao nhất: xác nhận tổng số hình thành viên và hình học trước/sau, rồi xác nhận chọn/di chuyển cả nhóm trong UI.
- Tài liệu PPTX nhập không có thay đổi này phải giữ hành vi trước đây; so sánh batch trước/sau và không rewrite ngoài vùng có dữ liệu VN Slides tạo ra.

## Kế hoạch kiểm chứng
1. Thêm/chỉnh kiểm thử Python cấu trúc gói cho layout/name, theme part và relationship, transition enum, WordArt editable, group shape, idempotence, bảo toàn slide/shape và trường hợp không có metadata.
2. Chạy bộ unit Slides liên quan và chuyển đổi LibreOffice thật FODP→PPTX→mở lại.
3. Dùng CDP thật qua Playwright (chuột/phím, không SendKeys/OS input), với `VNO_APP_ROOT` trỏ worktree và profile riêng `VNO_CDP_LOCALAPPDATA`, kiểm tra theme/layout/WordArt/group sau lưu–mở.
4. Đối chiếu bằng PowerPoint COM các giá trị `Slide.Layout`, `Design.Name`, `SlideShowTransition.EntryEffect` và loại shape; rà soát tương tác nhóm trong UI.
5. Chạy batch PPTX và so sánh số slide/shape như yêu cầu phiếu. Cuối cùng chạy `npm test`, `python -m unittest discover -s tests`, quét mã hóa và các suite CDP hồi quy được nêu trong phiếu. Chỉ ghi PASS/FAIL sau khi chạy; ghi NOT RUN/BLOCKED đúng thực tế.

## Commit và rollback
Commit ngay theo từng mốc: (1) plan trước code; (2) mỗi lát chức năng đã hoàn chỉnh kèm unit test; (3) hướng dẫn/evidence; (4) handoff. Trước từng commit kiểm tra diff và `git diff --check`. Rollback bằng `git revert <commit>` của mốc cần gỡ; không reset/rebase/xóa dữ liệu. Không đưa tài liệu thật hoặc secret vào repo.
