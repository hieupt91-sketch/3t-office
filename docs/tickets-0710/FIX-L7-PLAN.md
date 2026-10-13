# FIX-L7 — Kế hoạch rà soát 88 nút VN Slides / PowerPoint

## Objective

Đối chiếu từng nút trong `docs/ribbon-scan-slides-1011.json` với thao tác tương ứng trong PowerPoint, ghi trạng thái có dẫn chứng vào `docs/SLIDES-BUTTON-MATRIX-1011.md`, lần lượt xử lý các nút chưa đối chiếu theo thứ tự ưu tiên của phiếu. Chỉ sửa lệch tái hiện được; mỗi sửa đổi sản phẩm phải kèm Help tiếng Việt và i18n.

## Current capability / evidence

- FIX-L4/L5/L6 và handoff liên quan đã đo một số thao tác font, định dạng hình, chèn nội dung, animation, transition, notes, hide-slide, layout/reset và theme. Kết quả khác nhau theo từng thuộc tính; không suy rộng từ một phép đo sang toàn bộ nhóm.
- FIX-L6 ghi nhận lệch native layout (`Slide.Layout=1`, fixture PowerPoint Two-Column Text=`3`), native theme chưa được xác nhận, SmartArt là các shape riêng, và loại transition Zoom chưa kết luận. Không thay đổi semantics PPTX/native layout/theme nếu chưa có quyết định theo AGENTS.md §11.
- Harness có sẵn ở `scripts/audit-0610/office_parallel/slides/`, CDP ở `tests/live/cdp/`, và thao tác được thực hiện qua CDP chuột/phím. PowerPoint COM chỉ mở lại PPTX đã lưu và đọc thuộc tính.

## Files / modules

- Tạo `scripts/audit-0610/gen_slides_button_matrix.py` theo cấu trúc generator của Writer, với 4 trạng thái rõ ràng và ghi nguồn bằng chứng theo đúng từng ID.
- Tạo `docs/SLIDES-BUTTON-MATRIX-1011.md` cho đủ 88 dòng scan (không tính AI), kèm trạng thái, ghi chú/phép đo và link nguồn.
- Bổ sung harness/evidence trong `tests/live/cdp/`, `scripts/audit-0610/office_parallel/slides/` và `docs/tickets-0710/evidence/fix-l7/` chỉ khi cần để đo các nút chưa đối chiếu.
- Sửa module Slides/Adapter/Help/i18n/test chỉ khi CDP và PowerPoint cùng tái hiện lệch; tránh refactor ngoài phạm vi.
- Kết thúc bằng `docs/tickets-0710/FIX-L7-RESULTS.md` và handoff theo mẫu `docs/AGENT-HANDOFF-FIX-L6-CODEX.md` vì mẫu `/09-templates/AGENT-HANDOFF.md` không có trong worktree này.

## Dependencies and risks

- Cần Microsoft PowerPoint COM hoạt động trên máy; lỗi activation/COM phải được retry và mọi cleanup chỉ được nhắm tới PID do lượt đo tạo.
- Nguồn scan có 88 dòng, trong đó có ID trùng ở nhiều tab và các nút trạng thái nguy hiểm/disabled. Mỗi nút cần gắn với phép đo tương ứng; nút disabled hoặc hành động phá huỷ không được kích hoạt mù.
- Thay đổi semantics PPTX, layout hoặc theme nằm trong plan gate của AGENTS.md §11; dừng trước khi sửa và ghi rõ dữ liệu để chủ sở hữu duyệt.
- Không dùng SendKeys hoặc OS input. File sửa phải UTF-8 không BOM.

## Test / verification plan

1. Tái sinh ma trận từ scan và kiểm tra đủ ID, không trùng ngoài dự kiến, encoding UTF-8 không BOM.
2. Thực hiện CDP trên app từ `VNO_APP_ROOT=E:\VNOffice-codex-fl7`, profile `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl7`; lưu ảnh UI và PPTX đầu ra.
3. Mở lại PPTX bằng PowerPoint COM, đọc đúng thuộc tính của thao tác vừa thực hiện; ghi trạng thái `KHỚP POWERPOINT` chỉ khi có cả bằng chứng app và COM.
4. Với mỗi lỗi được sửa: chạy kiểm tra focused, đúng kịch bản CDP/COM, thêm Help tiếng Việt và i18n; commit riêng ngay sau khi nhóm hoàn tất.
5. Cuối lượt chạy các lệnh phiếu yêu cầu: `npm test`, `python -m unittest discover -s tests`, ba Slides CDP suite (claude roundtrip 8/8, L2 20/20, L3 13/13), cùng quét encoding và `git diff --check`. Báo nguyên trạng PASS/FAIL/NOT RUN/BLOCKED.

## Rollback

Mỗi nhóm audit hoặc fix được commit độc lập. Chỉ revert commit của nhóm gây regression; không dùng reset/clean hay thao tác Git phá huỷ.
