# PLAN — FIX-L9: lưu Đầu/Chân trang, Ngày giờ và Số trang chiếu native trong PPTX

## Mục tiêu
Khi người dùng bật các trường trong tab **Chèn → Văn bản**, PPTX lưu ra phải để PowerPoint nhận đúng `HeadersFooters.DateAndTime.Visible/Format`, `SlideNumber.Visible`, và `Footer.Visible/Text` trên đúng các slide được áp dụng. Mở lại trong VN Slides phải giữ nguyên trạng thái; slide không được áp dụng không bị thêm hoặc bật placeholder. Không thay đổi slide/layout hoặc placeholder sẵn có của tài liệu nhập ngoài phạm vi này.

## Năng lực hiện tại
- Slides model đã lưu trạng thái `showDate`, `dateFormat`, `showSlideNumber`, `showFooter`, `footerText` riêng theo slide; giao diện và tiếng Việt đã có trong tab Chèn.
- Serializer `SlidesAdapter.serializeToFodp()` và luồng lưu trong `main.py` đã có; sau LibreOffice có bộ hậu xử lý OOXML `postprocess_slides_pptx()` trong `adapters/libreoffice/common/ooxml_zip_patch.py`.
- FIX-L8 đã chứng minh model đúng nhưng PPTX hiện xuất thiếu placeholder native để PowerPoint đặt các cờ `Visible`.
- Help trong ứng dụng đã có mục tiếng Việt `slides.insert.headerFooterHelp`; sẽ cập nhật nếu bước dùng cuối khác với mô tả hiện hành.

## Phạm vi file dự kiến
- `adapters/libreoffice/slides/slides-adapter.js`: tuần tự hóa các trường được bật thành placeholder ODF theo từng trang chiếu, không thêm cho slide tắt.
- `adapters/libreoffice/common/ooxml_zip_patch.py`: nếu phép thử LibreOffice cho thấy thiếu/chuyển sai placeholder, bổ sung hậu xử lý PPTX giới hạn vào slide tương ứng, với trường ngày/số trang/footer và text/format chính xác; giữ nguyên shape người dùng.
- `main.py`: chỉ nếu luồng hậu xử lý cần truyền dữ liệu/trạng thái bổ sung (ưu tiên tái sử dụng FODP hiện có).
- `tests/test_slides_pptx_header_footer.py` (mới): kiểm tra ODF→PPTX, placeholder/format/text, apply-per-slide, idempotence, giữ shape không liên quan và slide chưa áp dụng.
- `tests/live/cdp/slides-fix-l9-header-footer.desktop.mjs` (mới): tạo ba slide qua UI thật, áp dụng trường trên đúng một slide, lưu và mở lại trong app.
- `platform/help/entries-slides.js`: cập nhật hướng dẫn tiếng Việt cụ thể nếu UI/behavior cần phản ánh rõ hơn.
- `docs/tickets-0710/HANDOFF-FIX-L9-CODEX.md`: handoff kết quả, lệnh và trạng thái kiểm chứng.

## Phụ thuộc và ranh giới
Tái sử dụng LibreOffice Impress và các tiện ích ZIP/OOXML hiện có. Không sửa LibreOffice Core, không thêm dependency, không đổi format semantics ngoài việc ghi các cờ người dùng đã chọn. Xử lý chỉ diễn ra trong adapter/hậu xử lý xuất PPTX; UI không gọi LO trực tiếp. Đầu vào patch lấy từ FODP do chính VN Slides sinh và giới hạn theo slide/placeholder có bật.

## Rủi ro và giảm thiểu
- LibreOffice có thể biến ODF placeholder thành shape thường hoặc không sinh `p:ph`: kiểm tra gói PPTX thật; chỉ thêm hậu xử lý OOXML cho gap đã chứng minh.
- Ánh xạ nhầm thứ tự slide hoặc thay đổi placeholder có sẵn: ghép theo thứ tự trang FODP/PPTX đã kiểm tra; không tạo placeholder trên slide tắt; bảo toàn phần XML khác và xác nhận số slide/shape trước-sau.
- Ngày/giờ có format và text khác nhau giữa FODP, PowerPoint và COM: kiểm tra COM đọc đúng cờ, format và text; thêm ca định dạng ngày.
- Hiện hướng dẫn Help mô tả vị trí tab Chèn → Văn bản, nội dung thanh chân trang và thao tác áp dụng; cập nhật sau khi xác định kết quả cuối qua kiểm thử UI.

## Kế hoạch kiểm chứng
1. Unit Python: mapping ODF/PPTX, ba trường bật/tắt độc lập, format và footer text, chỉ slide áp dụng, package giữ nguyên khi không có cờ, chạy lại idempotent, shape/slide count không đổi.
2. Chuyển đổi LibreOffice thật FODP→PPTX để xác thực lựa chọn ODF placeholder và shape placeholder do LO sinh; kiểm tra readback PPTX.
3. PowerPoint COM: ít nhất ba slide gồm có/không áp dụng, đọc `SlideNumber.Visible`, `DateAndTime.Visible/Format`, `Footer.Visible/Text`; mở lại VN Office giữ nguyên model.
4. CDP desktop L9: tạo ba slide, áp dụng một slide, kiểm tra package/mở lại trong app; hồi quy theo phiếu: claude-slides-roundtrip 8/8, slides-fix-l2 20/20, slides-fix-l3 13/13.
5. Kiểm tra batch PPTX bằng `scripts/layout-audit/batch_document_audit.py pptx ...` so sánh số slide/shape; PowerPoint COM đọc thuộc tính từng slide.
6. Chạy các lệnh nghiệm thu trong phiếu: `npm test`, `python -m unittest discover -s tests`, các suite CDP chỉ định (claude-slides-roundtrip 8/8, slides-fix-l2 20/20, slides-fix-l3 13/13), quét mã hóa. Ghi đúng PASS/FAIL/NOT RUN/BLOCKED; không suy đoán.

## Commit và rollback
Commit riêng từng mốc hoàn chỉnh theo yêu cầu: plan trước code; sau đó implementation FODP/OOXML và unit test; tiếp theo help/evidence nếu có; cuối cùng handoff. Mỗi mốc được rà soát `git diff --check` và trạng thái worktree trước commit. Rollback bằng `git revert <commit>` của mốc cần gỡ; không reset/rebase hoặc xóa dữ liệu. Không đưa evidence chứa nội dung tài liệu thật vào repo.
