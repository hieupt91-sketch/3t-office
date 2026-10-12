# PLAN — FIX-L12: Hoàn tất đối chiếu các nút Slides với PowerPoint

## Mục tiêu
Cập nhật ma trận nút Slides từ bằng chứng mới; sửa ánh xạ transition Zoom nếu phép thử PowerPoint COM xác định được enum chính xác; xác nhận sơ đồ được chọn/di chuyển như một nhóm và ghi rõ giới hạn SmartArt native. Đối chiếu các nút còn chưa xác minh bằng thao tác desktop CDP và PowerPoint COM khi thuộc tính tồn tại trên tệp; ghi `KHÁC CÓ CHỦ Ý` cho tiện ích giao diện có bằng chứng hành vi.

## Năng lực hiện tại
- Ma trận `docs/SLIDES-BUTTON-MATRIX-1011.md` có 88 hàng, nhưng các trạng thái Lệch/Chưa đối chiếu chưa phản ánh một số kết quả FIX-L9/FIX-L11.
- FIX-L11 đã thêm serializer `draw:g` cho nhóm shape và cơ chế hậu xử lý OOXML cho transition. Cần kiểm tra code và xác nhận bằng COM/CDP trước khi kết luận.
- Gallery transition Slides có Zoom; L6/L11 ghi nhận enum `BoxOut=3073`, chưa xác định nhãn Zoom trên PowerPoint.
- UI/Help hiện có trong `apps/slides` và `platform/help/entries-slides.js`; cập nhật hướng dẫn tiếng Việt cụ thể nếu hành vi được sửa.

## Phạm vi dự kiến
- Đọc/ghi: `apps/slides/slides-canvas.js`, `adapters/libreoffice/slides/slides-adapter.js` hoặc module OOXML hiện hữu chỉ khi cần sửa enum lưu/mở transition.
- Bằng chứng và trạng thái: `docs/SLIDES-BUTTON-MATRIX-1011.md`, `docs/tickets-0710/FIX-L12-RESULTS.md`, `docs/tickets-0710/HANDOFF-FIX-L12-CODEX.md`, evidence riêng dưới `docs/tickets-0710/evidence/fix-l12/`.
- Trợ giúp tiếng Việt/i18n nếu thao tác được thay đổi: `platform/help/entries-slides.js` và nguồn chuỗi tương ứng.
- Không sửa test, fixture hay expected output để làm suite xanh; không sửa LibreOffice Core; không thêm dependency.

## Phụ thuộc và ranh giới
Tái sử dụng LibreOffice Impress, serializer Slides và công cụ COM/CDP đã có. PowerPoint desktop đã kích hoạt và các harness CDP/batch hoạt động là điều kiện để xác nhận tương ứng; nếu không, ghi BLOCKED/NOT RUN kèm nguyên nhân và tiếp tục các phần độc lập. Không sửa semantics layout/theme/SmartArt native ngoài yêu cầu này.

## Rủi ro
- Enum transition có thể không được PowerPoint chấp nhận hoặc nhãn Office có thể khác với tên enum; thử nghiệm qua COM phải đặt hiệu ứng trên bản sao và đọc lại enum lẫn tên trước khi đổi serializer.
- Thay đổi transition ảnh hưởng PPTX đã lưu; cần round-trip và regression checks.
- Group shape, SmartArt native và tiện ích view có thể không có thuộc tính tương đương trực tiếp; ma trận chỉ kết luận theo bằng chứng phù hợp, không suy rộng.
- Nhiều nút chưa đối chiếu có thể cần fixture và tương tác UI dài; giữ nguyên tài liệu mẫu mặc định.

## Kế hoạch kiểm chứng
1. Kiểm tra kết quả FIX-L9/FIX-L11 và chạy COM probe các enum transition trên PowerPoint.
2. Dùng CDP app desktop (chuột/phím thật, không SendKeys/OS input) để xác nhận grouping, transition, playback/view và các hành vi nút; dùng profile `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl12` và `VNO_APP_ROOT` trỏ worktree.
3. Dùng PowerPoint COM readback trên tệp app đã lưu; không dùng Excel automation hay thay fixture mẫu.
4. Tập trung sửa transition mapping/Help nếu chứng cứ chỉ ra sai lệch; cập nhật matrix bằng `scripts/audit-0610/gen_slides_button_matrix.py` và đính evidence.
5. Chạy theo yêu cầu phiếu: `npm test`, `python -m unittest discover -s tests`, encoding scan, cùng ba suite desktop Slides. Ghi chính xác PASS/FAIL/BLOCKED/NOT RUN.

## Commit và rollback
Commit plan trước code. Sau đó commit ngay từng bước audit hoặc lát sửa hoàn chỉnh; kiểm `git diff --check` trước commit. Rollback bằng `git revert <commit>`; không reset/rebase/xóa dữ liệu.
