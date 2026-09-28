# HANDOFF — Writer Shape Import Defect B, vòng 3 findings

TASK: Xác định lỗi mất ảnh d06 khi lưu bằng VN Writer
AGENT/ROLE: Codex / Writer adapter
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Đo baseline main bằng app thật trước khi sửa code, để phân loại lỗi mất ảnh d06.

## FINDINGS

- Baseline chạy trên `main` tại commit `ce28fac` trong worktree detached tạm `E:\VNOffice-codex-d06-baseline`; worktree đã được gỡ sau phép đo.
- Đặt `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex'` trước khi chạy ứng dụng.
- Nguồn `E:\VN OFice\file test\landocx\d06.docx`: 1 part `word/media`, 60 `wp:anchor`, 3 trang theo Word PDF oracle.
- Bản app lưu `E:\VNOffice-profiles\codex\writer-d06-main-baseline\_rt_d06.docx`: 0 part `word/media`, 47 `wp:anchor`, 3 trang theo Word PDF oracle. Bản lưu không còn `a:blip r:embed`/ảnh DrawingML; công cụ đếm XML xác nhận 0.
- `_batch_writer.py` báo `loaded=True`, saved=yes, canvas 3 trang; do đó bản lưu này là phép đo app thật trên main.
- Kết luận: mất ảnh là lỗi có sẵn trên main (đã tái hiện trước code vòng 3), không phải hồi quy vòng 2. Đây vẫn là lỗi mất dữ liệu phải sửa.

## COMMANDS RUN

- `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex'`
- `git worktree add ..\VNOffice-codex-d06-baseline main --detach`
- `python scripts\layout-audit\_batch_writer.py 'E:\VNOffice-codex-d06-baseline' 'E:\VN OFice\file test\landocx' 'E:\VNOffice-profiles\codex\writer-d06-main-baseline' d06.docx`
- Đếm parts trong `word/media/`, anchor, inline và `a:blip r:embed` ở source/saved DOCX.
- `git worktree remove E:\VNOffice-codex-d06-baseline`

## TEST RESULTS

- Baseline desktop open/save: PASS (loaded=True, file saved).
- Baseline preservation of source media: FAIL (1 → 0 trên main).
- Kiểm tra Word COM open và số trang bằng `ExportAsFixedFormat`: NOT RUN ở bước findings; sẽ thực hiện sau khi có bản sửa vòng 3.

## NEXT ACTION

Sửa nguyên nhân gốc trong Writer adapter/app, giữ media và quan hệ `r:embed` hợp lệ cùng anchor picture; sau đó kiểm tra Word COM và chạy ma trận + unit tests.
