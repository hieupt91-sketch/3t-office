# Agent Handoff

TASK: Q75 — mở tài liệu khi máy in mạng mặc định ngoại tuyến  
AGENT/ROLE: Codex / LibreOffice Adapter  
BRANCH: `codex/q75`  
WORKTREE: `E:\VNOffice-codex-q75`  
OBJECTIVE: Giảm thời gian mở tài liệu khi hàng đợi máy in mặc định của Windows không truy cập được, không đổi cấu hình máy và giữ nguyên trang tài liệu.

FINDINGS: LibreOffice VCL có hỗ trợ `SAL_DISABLE_DEFAULTPRINTER` và `SAL_DISABLE_PRINTERLIST`; phép đo CLI với hồ sơ mới giảm d03 DOCX từ timeout >135 giây xuống 16,783 giây. Hồ sơ người dùng riêng theo ứng dụng đã có sẵn.  
IMPLEMENTATION SUMMARY: Tạo môi trường con riêng cho worker UNO và các chuyển đổi CLI, thêm hai biến chỉ trong tiến trình LibreOffice; không sửa môi trường app, registry, spooler hoặc Core. Xem số đo/ảnh tại `docs/Q75-ENVIRONMENT-MEASUREMENT.md`.  
FILES CHANGED: `main.py`; `tests/test_soffice_printer_environment.py`; `docs/Q75-ENVIRONMENT-MEASUREMENT.md`; `docs/AGENT-HANDOFF-Q75-CODEX.md`.

COMMANDS RUN: `git merge main`; contract trước/sau; d03/làn05/sample-3 qua app CDP với `VNO_CDP_LOCALAPPDATA` riêng; DOCX batch audit 8 tệp; xem trước in CDP; `node tests/run-tests.js`; i18n parity; checklist no-fix; pytest print/worker liên quan.

BUILD RESULT: NOT RUN — không đổi build system hoặc artifacts đóng gói.  
TEST RESULTS: PASS — CDP mở lạnh d03 20,298 ms, XLSX 20,817 ms, PPTX 28,677 ms; DOCX 8/8 giữ nguyên trang; xem trước d03 1/1; Node 3886/3886; i18n missing=0; checklist 0 dòng hạ; pytest 27 passed. Contract test trước sửa FAIL như mong đợi, sau sửa PASS.  
KNOWN FAILURES: In vật lý NOT RUN/BLOCKED do máy in mạng hiện tại ngoại tuyến; không đổi cấu hình máy in. In PDF/đích vật lý chưa được kiểm chứng trên một hàng đợi đang hoạt động.  
RISKS: Tiến trình xử lý LibreOffice không tự liệt kê hoặc chọn máy in mặc định. Hộp thoại VN đọc danh sách từ Windows khi người dùng yêu cầu; xem trước dùng worker đã kiểm tra, còn gửi lệnh tới máy in thật cần xác minh trên máy có hàng đợi truy cập được.  
DEPENDENCIES/BLOCKERS: Không có dependency mới; xác minh in vật lý cần máy in online.  
CORE PATCH ID (if any): None.  
NEXT ACTION: Review/merge commit riêng của Q75; khi có máy in online, xác nhận gửi một lệnh in vật lý.
