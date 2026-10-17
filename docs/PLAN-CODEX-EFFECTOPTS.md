# Kế hoạch BRIEF-CODEX-EFFECTOPTS

## Mục tiêu

Hoàn thiện bốn capability cho VN Slides: hướng hiệu ứng hoạt hình, hướng chuyển tiếp, Dán đặc biệt và Tác vụ khi nhấp; giữ round-trip PPTX, hướng dẫn VI, i18n VI/EN và cập nhật checklist sinh tự động.

## Năng lực hiện tại

- Model hoạt hình có `type`, `duration`, `delay`, `start`, `order`; PPTX serializer đã ghi preset và có logic `presetSubtype`, còn model/UI chưa có hướng.
- Adapter ánh xạ chuyển tiếp sang ODF; khi người dùng chưa sửa, metadata `vno:src-transition` dùng để giữ nguyên khối PPTX gốc.
- Slides có clipboard nội bộ/bridge và thao tác dán thường; chưa xác nhận Dán đặc biệt theo các định dạng yêu cầu.
- OOXML patcher đã có đường chèn liên kết văn bản; cần xác định round-trip shape action và điều hướng lúc trình chiếu.
- Help Slides có các mục cho hoạt hình, chuyển tiếp và hyperlink; cần kiểm tra độ phủ command trước khi thêm mục.

## Phạm vi và module dự kiến

1. Hoạt hình: `apps/slides/slide-animation-classes.js`, `apps/slides/slides-canvas.js`, `apps/slides/slides-ribbon.js`, `adapters/libreoffice/slides/slides-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`; test JS/Python liên quan.
2. Chuyển tiếp: Slides model/ribbon/adapter và `ooxml_zip_patch.py`; kiểm tra bảo toàn custom transition chưa bị chỉnh.
3. Dán đặc biệt: Slides command/ribbon/adapter/canvas, dùng clipboard bridge hiện có; không thêm dịch vụ hay dependency ngoài.
4. Tác vụ khi nhấp: Slides Insert UI/model/adapter, PPTX OOXML shape action/hyperlink relationships và trình chiếu; test Python/desktop.
5. Hướng dẫn/i18n/checklist: `platform/help/entries-slides.js`, chuỗi VI/EN, `scripts/audit-0610/gen_ppt_checklist.py` và handoff.

## Phụ thuộc

Các bước phụ thuộc theo thứ tự: model hướng hoạt hình trước serializer; hướng chuyển tiếp trước OOXML; Dán đặc biệt phụ thuộc clipboard Slides hiện có; Tác vụ phụ thuộc shape ID/relationship và hành vi slideshow. Cập nhật checklist sau khi có bằng chứng kiểm thử thực tế.

## Rủi ro

- ODF có thể không giữ nguyên hướng cho mọi preset; PPTX patch phải ghi subtype tương ứng và khi mở phải đọc lại.
- Đường chuyển tiếp hiện có phân biệt hiệu ứng custom gốc với hiệu ứng do app quản lý; không thay custom nếu chưa có chỉnh sửa rõ ràng.
- Dán dưới dạng ảnh cần raster hóa nội dung clipboard cục bộ; nếu clipboard không có dữ liệu phù hợp phải báo lỗi rõ, không gửi dữ liệu ra ngoài.
- Action hyperlink nội bộ/đích web cần relationship và target mode đúng; cần kiểm chứng chạy trong slideshow và round-trip tệp PowerPoint.
- Office COM ẩn có thể bị môi trường từ chối khởi chạy/ẩn; ghi BLOCKED nếu vậy, không bật Visible.

## Kế hoạch kiểm tra

- Node: `node tests/run-tests.js` sau khi đồng bộ main (ở thời điểm lập kế hoạch, main và nhánh cùng commit).
- Python: các bài Slides animation/transition hiện có cùng test mới cho hướng, custom transition, dán/action round-trip.
- CDP desktop: animation tab, transition tab, transition timing và kịch bản tương tác mới bằng chuột/bàn phím thật qua CDP.
- i18n parity, help coverage, checklist generator/verifier; rich-deck dirty-save read-only theo brief.
- PowerPoint COM chỉ chạy ẩn, chỉ đọc và với PID do lượt này tạo; không dùng SendKeys hay điều khiển hệ điều hành.

## Rollback

Mỗi capability sẽ có commit riêng. Nếu kiểm tra một bước thất bại, giữ commit và ghi FAIL/BLOCKED cùng bằng chứng; sửa trong commit kế tiếp hoặc revert riêng commit feature đó. Không thay đổi golden data hay tắt test.
