# Plan Q8 — Mở rộng hiệu ứng chuyển trang

## Objective
Bổ sung các hiệu ứng chuyển trang có thể lưu thành PPTX và được PowerPoint COM đọc lại đúng; cập nhật hướng dẫn tiếng Việt, VI/EN và checklist.

## Current capability
VN Slides hiện có gallery sáu mục và hộp thoại transition có thêm một số kiểu nội bộ. Bộ lưu PPTX dùng FODP cùng bước vá OOXML; một số kiểu gốc có thể được giữ qua sourceXml. Cần kiểm tra ánh xạ thực tế bằng COM.

## Files/modules
- pps/slides/slides-ribbon.js, pps/slides/slides-canvas.js: gallery/hộp thoại và lựa chọn hiệu ứng.
- Module transition trong dapters/libreoffice/slides/slides-adapter.js và/hoặc dapters/libreoffice/common/ooxml_zip_patch.py: lưu/mở PPTX nếu cần.
- Nguồn Help/i18n và 	ests/unit/help-coverage.test.js; 	ests/live/cdp/slides-transitions-more.desktop.mjs.
- scripts/audit-0610/gen_ppt_checklist.py và checklist PowerPoint.

## Dependencies
Tái sử dụng luồng LibreOffice/FODP/OOXML hiện có; không thêm dependency. PowerPoint 2016 COM dùng để xác nhận round-trip.

## Risks
Tên hiển thị có thể ánh xạ khác enum của PowerPoint; không giữ hiệu ứng nào nếu enum COM sau khi mở PPTX không khớp. Thay đổi giới hạn ở hiệu ứng chuyển trang và hướng dẫn/checklist liên quan.

## Test plan
Chạy CDP slides-transitions-more trước sửa để ghi FAIL, rồi sau sửa để ghi số lượng/nhãn đạt; lưu PPTX qua UI, đọc SlideShowTransition.EntryEffect bằng PowerPoint COM; chạy ba bộ sinh checklist, npm test, i18n parity, checklist evidence và pytest liên quan theo phiếu.

## Rollback
Hoàn tác commit riêng Q8; không chạm tài liệu và thay đổi đã có trước khi bắt đầu.
