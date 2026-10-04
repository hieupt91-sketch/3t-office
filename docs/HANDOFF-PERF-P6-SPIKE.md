# Agent Handoff

TASK: P6 spike đọc XLSX trực tiếp bằng ZIP + XML cho workbook đơn giản
AGENT/ROLE: Codex / Sheet performance spike
BRANCH: `perf/p6-direct-xlsx-spike-codex`
WORKTREE: `E:\VNOffice-codex-p6`
OBJECTIVE: Đánh giá khả thi đường đọc XLSX trực tiếp, không đổi hành vi app và không merge main.
FINDINGS: Prototype stdlib đọc được dữ liệu/style/hình học cơ bản và fallback bảo thủ. Payload runtime v2 thực tế vẫn là support FODS + row XML nén; tương đương phải được chốt ở mô hình semantic sau JS. Corpus `file test\lan` không tồn tại trong worktree, còn đường corpus được repo nhắc tới nằm ngoài ranh giới cho phép, nên đối chiếu 28 file là BLOCKED/NOT RUN.
IMPLEMENTATION SUMMARY: Thêm reader streaming, detector workbook phức tạp, schema semantic spike và 4 unittest. Không tích hợp `main.py`, không thêm dependency, không đổi cờ/runtime.
FILES CHANGED: `scripts/perf-proto/direct_xlsx_reader.py`; `tests/test_direct_xlsx_reader.py`; `docs/SPIKE-P6-DIRECT-XLSX.md`; `docs/HANDOFF-PERF-P6-SPIKE.md`.
COMMANDS RUN: `python -m unittest tests.test_direct_xlsx_reader -v`; `node tests/run-tests.js`; `git diff --check`.
BUILD RESULT: Không có build riêng; node suite dùng làm cổng repo.
TEST RESULTS: Unittest prototype PASS 4/4; `node tests/run-tests.js` PASS 2755/2755, 0 FAIL. Đối chiếu 28 file: BLOCKED/NOT RUN vì thiếu corpus trong phạm vi cho phép.
KNOWN FAILURES: Chưa có comparator hydrate payload cũ → semantic; chưa đo corpus LAN; schema spike chưa được JS/runtime tiêu thụ.
RISKS: Formula/date/precision/style inheritance/theme colors/styled-empty cell/used range là các điểm fidelity cao; detector false-positive có thể làm sai workbook nên phải giữ bảo thủ và fallback.
DEPENDENCIES/BLOCKERS: Cần đặt 28 file vào `E:\VNOffice-codex-p6\file test\lan` hoặc cho phép rõ việc đọc corpus hiện có; sau đó cần harness semantic dùng chính `buildSheetPayloadModel` làm oracle.
CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.
NEXT ACTION: Bổ sung corpus hợp lệ, chạy detector/benchmark 28 file, viết comparator semantic từng ô, chỉ sau 0 mismatch mới đề xuất tích hợp sau `VNO_OPEN_DIRECT=1` với LibreOffice fallback.
