# Agent Handoff

TASK: P6 spike đọc XLSX trực tiếp bằng ZIP + XML cho workbook đơn giản
AGENT/ROLE: Codex / Sheet performance spike
BRANCH: `perf/p6-direct-xlsx-spike-codex`
WORKTREE: `E:\VNOffice-codex-p6`
OBJECTIVE: Đánh giá khả thi đường đọc XLSX trực tiếp, không đổi hành vi app và không merge main.
FINDINGS: Đã đọc corpus được cấp quyền tại `E:\VN OFice\file test\lan`: detector chỉ nhận 2/28 file (7,14%). `lan21` đọc direct 0,021 s, `lan27` 0,077 s; comparator với mô hình thật sau `buildSheetPayloadModel` cho 254 và 707 ô khác biệt, đều là record ô rỗng tường minh mà đường cũ không materialize. Trên ô cùng tồn tại, giá trị/công thức/kiểu/numberFormat khớp; merge, kích thước, hidden và used range cũng khớp. Benchmark đủ pha đường cũ: lan03 13,344 s; lan14 94,247 s; lan26 16,130 s. P6 chưa nên tích hợp vì mức phủ thấp và lan14 khó nhất vẫn fallback.
IMPLEMENTATION SUMMARY: Giữ nguyên reader/schema spike và runtime app. Bổ sung bằng chứng 28 detector, đối chiếu semantic hai file đơn giản qua LibreOffice→payload→WebView2, benchmark tách pha bắt buộc và kết luận khả thi. Không thêm dependency, không đổi cờ/runtime, không ghi corpus.
FILES CHANGED: `scripts/perf-proto/direct_xlsx_reader.py`; `tests/test_direct_xlsx_reader.py`; `docs/SPIKE-P6-DIRECT-XLSX.md`; `docs/HANDOFF-PERF-P6-SPIKE.md`.
COMMANDS RUN: CLI `direct_xlsx_reader.py` trên 28 file; pipeline LibreOffice/FODS/Python trên lan03/14/21/26/27; `webview_payload_probe.py` trên cùng payload; comparator ngoài repo cho lan21/27; `python -m unittest tests.test_direct_xlsx_reader -v`; `git diff --check`.
BUILD RESULT: Không áp dụng build riêng vì lượt tiếp tục chỉ cập nhật bằng chứng/tài liệu và không đổi mã runtime; node suite 2755/2755 đã PASS ở commit spike trước.
TEST RESULTS: Detector/read corpus PASS về khả năng chạy 28/28 (2 simple, 26 fallback có lý do); semantic comparison FAIL tuyệt đối do 254/707 record ô rỗng khác biểu diễn, nhưng 0 mismatch trên giá trị/công thức/kiểu/numberFormat của ô chung và 0 mismatch ở merge/layout/hidden/name/used range. Benchmark PASS đã chạy lan03/14/26; lan14 FAIL mục tiêu 35 s (94,247 s). Unittest prototype PASS 4/4; `git diff --check` PASS.
KNOWN FAILURES: Direct giữ explicit/styled empty cell trong khi model cũ lược bỏ; schema direct chưa được JS/runtime tiêu thụ; 26/28 file fallback, trong đó lan14 vẫn không được tăng tốc direct.
RISKS: Formula shared/array, external reference, rich string, drawing, conditional formatting, date/precision và style inheritance là các vùng fidelity cao; detector false-positive có thể mất dữ liệu nên phải giữ bảo thủ và fallback nguyên tử.
DEPENDENCIES/BLOCKERS: Không còn blocker để kết thúc spike. Việc tích hợp production cần quyết định riêng về semantics ô rỗng và ROI của mức phủ 7,14%; ước lượng 7–10 ngày cho subset hiện tại, thêm 15–25+ ngày để tăng phủ đáng kể.
CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.
NEXT ACTION: Không bật `VNO_OPEN_DIRECT`. Nếu tiếp tục P6, trước hết chốt có bỏ hay giữ explicit empty cell, rồi spike formula shared/array và rich string để đo mức phủ mới; chỉ đề xuất tích hợp khi đạt 0 mismatch semantic và end-to-end dưới 35 s với fallback LibreOffice.
