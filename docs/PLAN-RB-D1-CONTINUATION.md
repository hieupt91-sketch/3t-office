# Plan — tiếp quản RB-D1: kiểm chứng chức năng Ribbon Trang đầu của VN Writer

## Mục tiêu

Hoàn tất RB-D1 từ baseline `ace3271c`: kiểm chứng hiệu quả thực tế của toàn bộ 53 control/mục con trên tab **Trang đầu** của VN Writer, chạy lặp hai lần, đối chiếu Microsoft Word qua COM khi có thể, và lập báo cáo bằng chứng. Chỉ sửa lỗi được audit tái hiện; không merge hoặc push.

## Khả năng hiện có

- `scripts/audit-0610/ribbon_functional.mjs` đã khởi động app desktop bằng CDP, thao tác chuột thật, chụp ảnh trước/sau và kiểm chứng XML DOCX.
- `scripts/audit-0610/word_home_oracle.ps1` là oracle Word COM riêng tiến trình.
- `tests/live/ribbon-specs/doc-home.json` mô tả 53 mục của tab Trang đầu.
- Baseline đã có hai sửa lỗi đã commit: giữ highlight khi xuất DOCX và đồng bộ trạng thái underline với vùng chọn.

## Phạm vi tệp/module

- Audit harness/spec: `scripts/audit-0610/ribbon_functional.mjs`, `scripts/audit-0610/word_home_oracle.ps1`, `tests/live/ribbon-specs/doc-home.json`.
- Chỉ khi audit chứng minh lỗi: `apps/writer/**`, `adapters/libreoffice/writer/**` hoặc `adapters/libreoffice/common/ooxml_zip_patch.py`, kèm test hồi quy đúng tầng.
- Kết quả: `docs/AUDIT-DOC-RIBBON-HOME-0810.md` và handoff chuẩn sau khi hoàn tất.

## Phụ thuộc và ranh giới

- UI chỉ được thao tác qua VN command/app; việc lưu/đọc DOCX đi qua adapter/UNO hiện có. Không gọi LibreOffice implementation trực tiếp từ UI và không sửa LibreOffice Core.
- Word COM là oracle cục bộ, chạy ẩn và dừng theo PID. Mục UI/hộp thoại không có ánh xạ COM một-một sẽ ghi **CHẶN** kèm lý do, không suy diễn PASS.
- Không thêm dependency, không thay build system, không dùng `scripts/serve.js` cho production.

## Rủi ro

- CDP/clipboard, LibreOffice và Word COM có thể không ổn định hoặc bị tiến trình ẩn chặn; phân loại trung thực PASS/FAIL/CHẶN.
- Lưu DOCX trong mỗi ca có thể bộc lộ lỗi serialization không nhìn thấy trên canvas.
- Sửa hành vi rich-text có thể ảnh hưởng định dạng lân cận, nên mọi fix phải có test đơn vị/harness và chạy lại toàn tab hai lượt.

## Kế hoạch kiểm thử

1. Kiểm tra cú pháp và chạy harness RB-D1 hai lượt trên app desktop thật.
2. Chạy Word COM oracle cùng đặc tả; giữ artifact ảnh và XML ngoài Git theo ticket.
3. Với mỗi FAIL tái hiện được, thêm regression test ở module sở hữu, sửa tối thiểu, rồi chạy lại toàn harness hai lượt.
4. Chạy `node tests/run-tests.js`, test Python có liên quan, `git diff --check`.

## Rollback

Mỗi sửa lỗi tách commit trên nhánh này; có thể `git revert` từng commit mà không đổi worktree/nhánh nguồn và không dùng reset/destructive Git.
