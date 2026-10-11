# TASK BRIEF — Sheet: xác nhận S29 vòng 1–4 (tối ưu Python) không hồi quy trên batch 26 file thật

Worktree: `E:\VNOffice-grok-sheet-s29-regression` (nhánh `audit/sheet-s29-regression-grok`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge/ghi nhận.

## Bối cảnh
S29 vòng 1–4 (đã merge vào `main`) tối ưu tốc độ mở file Sheet lớn ở phía Python (`ooxml_zip_patch.py`, gộp 3 lượt quét XLSX thành 1) — lan06 1721s→136s, lan14 346s→115s, đã xác nhận SHA-256 khớp trên 4 file mẫu FODS nhỏ (`sample-sheet*.fods`). **CHƯA từng chạy lại batch đầy đủ 26 file LAN thật (nhập→sửa→lưu→mở lại bằng Excel COM) sau các vòng tối ưu này** — đây là việc còn treo, ghi trong `docs/TASK-QUEUE.md` ("Việc kế tiếp của Claude"). Nhiệm vụ của bạn: chạy batch đó và BÁO CÁO SỐ ĐO THẬT — đây là việc ĐO/XÁC NHẬN, không phải sửa code. Nếu phát hiện hồi quy thật, DỪNG LẠI và ghi rõ vào handoff, KHÔNG tự sửa (báo lại để Claude quyết định hướng sửa).

## Cách làm
1. Dùng công cụ đã có: `scripts/layout-audit/_batch_audit.py` và/hoặc `scripts/layout-audit/_sheet_matrix.py` (đọc code các file này trước để hiểu tham số/cách chạy — đã dùng nhiều vòng trước, xem `docs/HANDOFF-SHEET-*.md` cũ để biết cách gọi đúng).
2. Chạy batch trên **26 file .xlsx thật** trong `file test\lan\` (bỏ lan06/lan14 nếu công cụ vốn tách riêng 2 file này do kích thước lớn — xem quy ước cũ; nếu công cụ đã hỗ trợ cả lan06/lan14 thì chạy đủ 28, không thì chạy 26 + báo riêng lan06/lan14 bằng `_time_sheet_open_stages.py` hoặc tương đương).
3. Với mỗi file: mở bằng VN Sheet (`main.py`), không sửa gì hoặc sửa tối thiểu (theo đúng cách batch cũ đã làm — không tự đổi cách đo), lưu lại, mở bằng Excel 2016 COM thật để đối chiếu — số lệch phải là **0** như batch trước S29 (26/26 0 lệch, Excel mở OK, lint sạch — xem `docs/TASK-QUEUE.md` mục "Trạng thái 22/9 01:00").
4. Nếu MỌI file vẫn 0 lệch: kết luận "không hồi quy", ghi số đo (thời gian mở mới, để có baseline hiệu năng thật trên máy hiện tại).
5. Nếu CÓ file lệch mới (so với batch trước S29): xác định đúng vòng S29 nào gây ra (bisect qua các commit S29 vòng 1/2/3/4 nếu cần bằng `git log` + `git stash`/checkout tạm trong worktree riêng — không đổi nhánh chính), ghi rõ triệu chứng + file + vòng nghi ngờ vào handoff, KHÔNG tự sửa.

## Ràng buộc
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước khi chạy app/soffice/Excel COM.
- KHÔNG chạy đồng thời với agent khác đang dùng Excel COM/soffice nếu tránh được — kiểm tra `Get-Process soffice,soffice.bin,EXCEL` trước khi bắt đầu, nếu bận thì chờ hoặc báo lại.
- Không sửa code trừ khi phát hiện hồi quy thật và Claude đồng ý hướng sửa (mặc định: chỉ đo, không sửa).
- Không commit tài liệu thật, không đổi tên file trong `file test\`.

## Bàn giao
`docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md`: bảng 26-28 file với kết quả lệch (phải 0 nếu không hồi quy) + thời gian mở, kết luận trung thực. Nếu 0 hồi quy: xác nhận rõ mốc "S29 vòng 1-4 an toàn để giữ trên main". Nếu có hồi quy: mô tả đủ để Claude/agent khác sửa tiếp mà không cần đo lại từ đầu.
