# Plan FIX-L13 — Đối chiếu Slides với PowerPoint

## Mục tiêu
Đóng 2 độ lệch đã biết (Zoom transition và WordArt native) nếu tái sử dụng được luồng LibreOffice + hậu xử lý OOXML hiện có; đo lại 20 hàng CHƯA ĐỐI CHIẾU bằng desktop CDP và PowerPoint COM có cửa sổ tương tác; cập nhật ma trận, hướng dẫn tiếng Việt và handoff theo bằng chứng. Không tuyên bố parity từ unit test hay giá trị mặc định COM.

## Năng lực hiện có
- `slides-canvas.js` đã có lệnh transition, slideshow, presenter, nhận xét và trạng thái xem.
- `slides-adapter.js` + luồng ODF/LibreOffice lưu PPTX; `main.py` và `adapters/libreoffice/slides/pptx-native-postprocess.js` có hậu xử lý OOXML sau LibreOffice.
- `tests/test_slides_pptx_wordart.py` kiểm tra WordArt native; FIX-L10 có CDP cho view/help/macro; FIX-L12 có harness Office nhưng chưa mở PowerPoint hiện hữu.
- Sơ đồ hiện là nhóm shape chỉnh sửa được; đường xuất LibreOffice chưa có mô hình SmartArt native.

## Tệp/modules dự kiến
- Đo/đối chiếu: `tests/live/cdp/slides-fix-l13-*.desktop.mjs`, `scripts/audit-0610/office_parallel/slides/fix-l13-*.ps1`, cùng bằng chứng `docs/tickets-0710/evidence/fix-l13/`.
- Nếu cần sửa tính năng: `apps/slides/slides-canvas.js` (chỉ khi hành vi UI sai), `adapters/libreoffice/slides/*` và/hoặc `main.py` (chỉ cho metadata PPTX đã được LibreOffice xuất).
- Kết quả/hướng dẫn: `docs/tickets-0710/FIX-L13-RESULTS.md`, `docs/SLIDES-BUTTON-MATRIX-1011.md`, `scripts/audit-0610/gen_slides_button_matrix.py` khi nguồn chứng cứ yêu cầu, `platform/help/entries-slides.js`, `docs/tickets-0710/HANDOFF-FIX-L13-CODEX.md`.
- Không sửa test/fixture/expected để ép xanh; chỉ bổ sung harness kiểm chứng nếu harness hiện có không đủ.

## Phụ thuộc
PowerPoint desktop được kích hoạt và COM đọc được `ActiveWindow`; fixture PPTX sẵn có; LibreOffice/serializer hiện tại; CDP desktop khởi động từ worktree này với `VNO_APP_ROOT=E:\VNOffice-codex-fl13` và `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl13`.

## Rủi ro
- Sửa transition/WordArt làm thay đổi OOXML trong PPTX; file nhập không có trường VN không được thay đổi. Áp dụng hậu xử lý hẹp theo marker FODP của VN, giữ tính lặp an toàn, PowerPoint phải mở và đọc lại kết quả.
- Office có thể hiện hộp thoại kích hoạt; chỉ xử lý/đóng qua COM, tuyệt đối không SendKeys. Chỉ được kết thúc tiến trình POWERPNT do phiên kiểm chứng này tạo, xác minh bằng PID.
- Trạng thái view/Presenter/spellcheck có thể chỉ tồn tại trong phiên; phải thoát slideshow trong `finally`, không kết luận từ giao diện app một phía.
- Không sửa LibreOffice Core; SmartArt dừng ở nhóm shape nếu không có capability ODF phù hợp.

## Kế hoạch kiểm tra
1. Chụp baseline tiến trình Office và kiểm tra môi trường, dùng CDP chuột/phím thật cho trạng thái app.
2. Dùng PowerPoint COM hiện cửa sổ để đo view, comments, slideshow/Presenter/timing; tạo mẫu Zoom/WordArt trực tiếp trong PowerPoint, lưu rồi đọc package XML và thuộc tính COM.
3. Nếu sửa serializer, kiểm tra PPTX xuất bằng PowerPoint COM và XML, kiểm tra file nhập không đổi; chạy test/batch theo ticket: `npm test`, `python -m unittest discover -s tests`, Slides roundtrip 8/8, FIX-L2 20/20, FIX-L3 13/13; quét mã hóa và `git diff --check`.
4. Cập nhật generator/matrix chỉ bằng kết quả có bằng chứng; mọi mục chưa đo được phải giữ CHƯA ĐỐI CHIẾU.

## Rollback
Mỗi bước được commit riêng theo yêu cầu; nếu hậu xử lý làm hỏng PPTX hoặc thay đổi ngoài marker VN, revert commit riêng của phần serializer và giữ lại plan/bằng chứng kiểm chứng. Không reset/clean hoặc xóa dữ liệu Git.
