# Kế hoạch FIX-L14 — đối chiếu Slides với PowerPoint

## Mục tiêu
Đối chiếu 20 lệnh đang ghi CHƯA ĐỐI CHIẾU trong `docs/SLIDES-BUTTON-MATRIX-1011.md` với PowerPoint đang chạy, đo riêng hiệu ứng Zoom và WordArt qua COM/XML, cập nhật bằng chứng và ma trận. Không đóng hay kết thúc phiên POWERPNT của chủ sở hữu.

## Năng lực hiện có
FIX-L13 đã chạy tương tác desktop qua CDP và ghi bằng chứng nhưng PowerPoint lúc đó trả `RPC_E_CALL_REJECTED`. `FIX-L14.md` xác nhận hiện có cửa sổ PowerPoint và `ActiveWindow.ViewType=9`, `View.Zoom=50`; thao tác COM phải gắn vào phiên hiện hữu. Mã VN Slides đã có điều khiển view/show/comments/proofing/transition/WordArt và đường lưu PPTX hiện hành. Cần kiểm tra serializer hiện tại trước khi xác định có thiếu biểu diễn native hay không.

## Files/modules dự kiến
- `scripts/audit-0610/gen_slides_button_matrix.py`, `docs/SLIDES-BUTTON-MATRIX-1011.md`.
- `docs/tickets-0710/FIX-L14-RESULTS.md`, `docs/tickets-0710/evidence/fix-l14/**`, handoff FIX-L14.
- Desktop CDP/COM audit harness mới hoặc hiện có trong `tests/live/cdp/**` và `scripts/audit-0610/office_parallel/slides/**`.
- Chỉ nếu phép đo chứng minh lỗi định dạng: Slides serializer thuộc `apps/slides/**` hoặc adapter sở hữu xuất PPTX; mọi sửa file-format semantics phải mô tả chính xác trong kết quả.

## Phụ thuộc
PowerPoint desktop đã mở; CDP desktop VN Office qua `main.py`; `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl14`; junction `file test` đã có. COM chỉ dùng `GetActiveObject`/`New-Object -ComObject` để gắn vào ứng dụng đang chạy, đọc/đổi trạng thái có thể phục hồi, mở bản sao do audit tạo, đóng riêng presentation audit. Không gọi `Application.Quit`, `Stop-Process` hoặc SendKeys.

## Rủi ro và biện pháp
- COM có thể bị từ chối hoặc UI đổi state: chụp baseline và khôi phục thuộc tính view đã đổi; nếu không an toàn thì ghi chưa đo, không đổi trạng thái ma trận.
- Slideshow có thể chiếm màn hình: chỉ bật/thoát bằng CDP như phiếu yêu cầu, xác nhận kết thúc trước khi tiếp tục.
- Thay đổi serializer ảnh hưởng PPTX: không sửa trước khi có readback COM/XML chứng minh; nếu cần sửa, giới hạn phạm vi và kiểm tra tương thích roundtrip.
- Không chạm/tắt các tài liệu, cửa sổ, trình chiếu hay process PowerPoint của chủ sở hữu.

## Kế hoạch kiểm tra
1. Audit COM gắn phiên đang chạy; kiểm tra đủ 20 nút theo thuộc tính được phiếu liệt kê và ghi hành vi khác biệt có chủ ý.
2. Tạo mẫu Zoom và WordArt trong PowerPoint bằng presentation audit riêng, đọc COM + OOXML; so sánh thao tác VN Slides qua CDP và PPTX app xuất.
3. Chạy `npm test`, `python -m unittest discover -s tests` với profile riêng; chạy desktop Slides roundtrip 8/8, FIX-L2 20/20, FIX-L3 13/13; matrix generator; rà UTF-8/no BOM và `git diff --check`. Không tuyên bố PASS nếu chưa chạy.

## Rollback
Mỗi bước được commit riêng theo yêu cầu. Nếu một thay đổi mã làm hỏng xuất PPTX, revert commit mã tương ứng sau khi lưu bằng chứng lỗi; giữ lại plan/evidence/results. Không chạy lệnh Git phá hủy lịch sử hoặc xóa dữ liệu.
