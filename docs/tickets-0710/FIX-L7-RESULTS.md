# FIX-L7 — Kết quả rà soát ribbon VN Slides

## Kết quả theo nhóm

**Nhóm 1 — Ma trận 88 nút ribbon**
- Đã tạo `docs/SLIDES-BUTTON-MATRIX-1011.md` và script sinh lại từ `docs/ribbon-scan-slides-1011.json`.
- Trạng thái: 30 KHỚP POWERPOINT, 2 KHÁC CÓ CHỦ Ý, 4 LỆCH ĐÃ BIẾT, 52 CHƯA ĐỐI CHIẾU.
- Commit: `ef37077a`, `0c074a2f`; chưa tuyên bố parity toàn bộ.

**Nhóm 2 — CDP và PowerPoint COM**
- Đã thao tác UI bằng CDP, lưu PPTX, chụp ảnh và đọc thuộc tính qua PowerPoint COM; bằng chứng ở `evidence/fix-l7/`.
- CDP: `claude-slides-roundtrip` 8/8, `slides-fix-l2` 20/20, `slides-fix-l3` 13/13; kiểm tra COM cho deck round-trip đọc 11 slide và transition Fade 0,5 giây.
- Commit harness: `ebb17899`; commit bằng chứng: `0c074a2f`.

**Nhóm 3 — Sửa sai khác thụt lề**
- Tái hiện indent tăng không được ghi vào PPTX; adapter nay bảo toàn mức thụt qua FODP và OOXML.
- PowerPoint COM đọc `LeftIndent=36 pt`, `IndentLevel=2`; hướng dẫn tiếng Việt và i18n đã có trong UI hiện hành.
- Kiểm tra tập trung: Python 3/3 và Node Slides Font/Paragraph 12/12 PASS; commit `88b27923`.

## Sai khác còn lại và giới hạn

- `slides.layout.apply`: chọn “Hai nội dung” nhưng PowerPoint COM đọc `Slide.Layout=1`; layout native tương ứng trong fixture là 3. Ticket yêu cầu dừng trước khi đổi semantics PPTX; cần chủ sở hữu quyết định.
- `slides.design.themeGallery`: COM đọc `Design.Name=Office`, còn master mang ID `VNOfficeTheme:minimal-dark`; native theme chưa được xác nhận. Cần quyết định trước khi sửa semantics theme.
- `slides.transition.apply`: Fade round-trip được (`EntryEffect=3849`, 0,5 giây); Zoom ở lượt L6 đọc `3073` (BoxOut), nên mapping nhãn Zoom còn sai khác.
- Các mục còn lại chưa được đo qua cả thao tác app và COM vẫn ghi CHƯA ĐỐI CHIẾU; không suy rộng kết quả một preset/giá trị sang toàn tính năng.

## Kiểm thử

- `npm test`: PASS, 3079/3079.
- `python -m unittest discover -s tests`: FAIL, 874 tests, 1 error; `test_detached_helper_process_runs_from_a_path_with_spaces` hoàn tất assertion nhưng Windows `TemporaryDirectory` cleanup gặp `PermissionError [WinError 32]` do detached helper còn giữ đường dẫn tạm. Chạy riêng lại ngay sau đó: PASS, 1/1. Ghi nhận suite tổng thể là FAIL; không sửa test ngoài scope.
- CDP bắt buộc: roundtrip 8/8, L2 20/20, L3 13/13 PASS; kiểm tra nội bộ paragraph indent Python 3/3 và Node 12/12 PASS.
- Build: NOT RUN (ticket không yêu cầu build); encoding scan và `git diff --check` được chạy trước handoff.

## Commits

- `7d0d5076` — plan FIX-L7; `ef37077a` — matrix generator.
- `88b27923` — sửa bảo toàn thụt lề và regression tests.
- `ebb17899` — harness CDP/PowerPoint COM; `0c074a2f` — matrix và bằng chứng.

## Rủi ro / bước tiếp

- Chờ quyết định chủ sở hữu trước mọi thay đổi native layout hoặc theme; không có Core patch hay dependency mới.
- Tiếp tục rà soát 52 nút chưa đối chiếu theo thứ tự ưu tiên trong phiếu, mỗi phép đo cần thao tác app và đọc lại COM.
- `npm test` đã PASS; unittest tổng thể cần được chạy lại sau khi xử lý race cleanup của helper, nếu chủ sở hữu muốn suite tổng thể xanh.
