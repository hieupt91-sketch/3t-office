# Agent Handoff

TASK: S1 — Ma trận gap VN Sheet vs Excel ban đầu, rà soát tĩnh + tổng hợp CDP hiện có
AGENT/ROLE: Codex / Documentation audit
BRANCH: `docs/sheet-gap-matrix-codex`
WORKTREE: `E:\VNOffice-codex-s1`
OBJECTIVE: Tạo ma trận >=120 dòng có mức quan trọng, trạng thái, bằng chứng cụ thể, ước lượng đóng gap và 25 mục ưu tiên; không sửa mã sản phẩm.
FINDINGS: Capability văn phòng cốt lõi của Sheet đã rộng và nhiều mục P1 có CDP + Excel COM. Khoảng cách chính là acceptance/fidelity: 28 XLSX chưa đủ 28 roundtrip đầy đủ, corpus 20 XLS chưa chạy, input tiền tố VND chưa được CDP lại trên nhánh này, và một số công thức/format/Pivot mới có unit test.
IMPLEMENTATION SUMMARY: Thêm tài liệu ma trận, dùng bằng chứng `file:dòng` từ source/test/audit; ghi rõ `NOT RUN` khi không có phép chạy; không chạy CDP mới và không sửa sản phẩm.
FILES CHANGED: `docs/GAP-SHEET-VS-EXCEL-0710.md`; `docs/AGENT-HANDOFF-S1.md`
COMMANDS RUN: Đọc `TASK-S1.md`, mẫu `docs/GAP-DOC-VS-WORD-0610.md`, các audit Sheet được giao, handoff Sheet liên quan và các source/test được dẫn chứng; chạy trực tiếp 7 tệp test tập trung bằng Node; chạy PowerShell validator cho số hàng, bằng chứng, citation, 25 ưu tiên và thứ tự điểm; `git diff --check`.
BUILD RESULT: NOT RUN — task chỉ thay đổi Markdown, không sửa mã/build.
TEST RESULTS: PASS — validator: 182 dòng ma trận, 25/25 ưu tiên, 210 citation đều tồn tại/không vượt số dòng, 182/182 dòng có bằng chứng hoặc `NOT RUN`, điểm ưu tiên giảm dần; `git diff --check` PASS. Bảy lệnh Node tập trung (`formula-engine`, lookup/conditional, data-tools, paste-special, print-preview, pivot-table, find-replace) đều exit 0; riêng find/replace in 9/9 PASS, các tệp còn lại không in bộ đếm khi gọi trực tiếp nên chỉ ghi exit 0, không suy diễn số test.
KNOWN FAILURES: Corpus 20 XLS NOT RUN; 28 XLSX chỉ có 26 file roundtrip đầy đủ trong kết quả gần nhất, lan06/lan14 chỉ đo pipeline; không chạy CDP mới trong S1.
RISKS: Audit/handoff lịch sử phản ánh các nhánh/thời điểm khác nhau; trạng thái `ĐẦY ĐỦ` chỉ áp dụng capability được dẫn chứng, không đồng nghĩa tương thích toàn bộ Excel.
DEPENDENCIES/BLOCKERS: Cần corpus ngoài repo tại `E:\VN OFice\file test` để đóng các cổng 28 XLSX + 20 XLS; cần tích hợp nhánh currency input trước khi CDP lại tiền tố VND.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Chủ sở hữu phân công 25 mục ưu tiên; chạy trước cổng 28 XLSX/20 XLS và CDP input VND/F4/formula nhiều điều kiện.
