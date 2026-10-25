# Agent Handoff

TASK: MAC-3 — bộ lọc mẫu bảng tính và UTI macOS  
AGENT/ROLE: Codex / macOS file registration  
BRANCH: `mac/filetypes-1910`  
WORKTREE: `/Users/hieupc/.codex/worktrees/mac-filetypes-1910/3t-office`  
OBJECTIVE: Đăng ký `.xltx/.xlt` cho Sheet trên macOS, tái sử dụng đường mở/lưu hiện hữu và kiểm lưu/mở lại `.xltx` mà không đổi semantics định dạng.  
FINDINGS: `vn-main` đã có `.xltx/.xlt` trong `FILE_APP_KINDS`, `OPEN_FILE_TYPES`, bộ lọc lưu `.xltx`, đường tạo mẫu và Help tiếng Việt. Repo chưa có `ports/macos/` hay Info.plist. Runtime Python 3.12 trên máy thiếu `pywebview` và `cryptography`; API app lưu được `.xltx`, nhưng bước mở lại trong chính API bị chặn khi kiểm chữ ký mã hóa vì thiếu dependency của MAC-12. LibreOffice macOS mở lại chính tệp đó thành FODS thành công.  
IMPLEMENTATION SUMMARY: Thêm Info.plist Sheet dành cho bundle macOS với imported UTI `.xltx/.xlt`, role Editor và rank Alternate để không tự chiếm mặc định; thêm test plist, hợp đồng dùng chung và content type XLTX. Không sửa `main.py`, không thêm dependency, không thay đổi định dạng tệp.  
FILES CHANGED: `ports/macos/Sheet-Info.plist`; `tests/macos/test_sheet_file_types.py`; `docs/macos/PLAN-MAC-3-FILE-TYPES-2010.md`; `docs/macos/HANDOFF-MAC-3-FILE-TYPES-2010.md`; `09-templates/AGENT-HANDOFF.md`.  
COMMANDS RUN: Python 3.12 focused unittest; `plutil -lint`; app API `_save_document_in_place_impl` với fixture FODS; LibreOffice macOS headless mở lại XLTX sang FODS; i18n parity; `npm test`; `git diff --check`.  
BUILD RESULT: NOT RUN — repo `vn-main` chưa có quy trình/bundle macOS để đóng gói Info.plist này; MAC-11 sở hữu build `.app/.dmg`.  
TEST RESULTS: PASS — focused Python 3/3; plist lint PASS; native save trả `status=ok`, tạo XLTX 6.764 byte; LibreOffice macOS mở lại thành FODS 44.773 byte; i18n VI=EN=3091, thiếu 0, lệch placeholder 0. Full Node suite FAIL 3729/3749 (20 FAIL baseline trên checkout; thấy lỗi Chrome Slides smoke và Python overlay kích thước XLSX, không do các tệp MAC-3).  
KNOWN FAILURES: Mở lại qua chính `VnOfficeApi` BLOCKED trước chuyển đổi do Python runtime thiếu `cryptography` (MAC-12); test parser pywebview hiện hữu BLOCKED vì runtime không có `pywebview`. Node test `sheet-template-save` gọi lệnh `python` và FAIL trong môi trường mặc định vì máy chỉ có `python3`; khi trỏ Python 3.12 thì tiếp tục BLOCKED bởi thiếu `pywebview`.  
RISKS: Template plist chưa được ghép vào `.app` vì chưa có pipeline bundle trên `vn-main`. `main.py` chỉ chạy overlay OOXML Sheet đặc thù khi hậu tố là `.xlsx`, không phải `.xltx`; tệp tạo bởi app vẫn mở được qua LibreOffice, nhưng parity overlay đầy đủ khi nhập mẫu cần một phiếu sửa dùng chung trên `vn-main` trước, không nên sửa riêng trong nhánh Mac.  
DEPENDENCIES/BLOCKERS: MAC-11 cần lấy plist vào bundle Sheet; MAC-12 cần đóng gói `cryptography`; shared-owner cần quyết định mở rộng đường overlay `.xlsx` cho `.xltx` trên `vn-main`.  
CORE PATCH ID (if any): None.  
NEXT ACTION: Review plist/test; sau khi MAC-12 có runtime đầy đủ, chạy app đóng gói qua hộp thoại native, lưu `.xltx`, đóng, mở lại và kiểm dữ liệu/định dạng bằng CDP.
