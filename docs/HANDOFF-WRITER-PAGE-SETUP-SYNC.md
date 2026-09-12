# Agent Handoff

TASK: Writer page setup sync on DOCX import
AGENT/ROLE: Codex / Writer owner
BRANCH: fix/writer-floating-frames-fidelity
WORKTREE: E:\VNOffice-codex-writer-frames
OBJECTIVE: Giữ đúng khổ giấy và lề của DOCX khi mở rồi lưu/xuất, kể cả khổ tùy chỉnh.
FINDINGS: `open()` cập nhật `pageSetup` nhưng để `sectionPageSetups.section-1` ở A4 mặc định; parser CSS cũng không biểu diễn khổ ngoài A4/Letter/Legal.
IMPLEMENTATION SUMMARY: Đồng bộ setup nhập vào section đang hoạt động; thêm model `custom` với `widthMm`/`heightMm`; dùng chung kích thước đó cho canvas, CSS global/section, print dimensions và FODT; hộp Thiết lập trang hiển thị `Tùy chỉnh`; bổ sung Help tiếng Việt và test hồi quy.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; platform/help/entries-writer.js; tests/unit/writer-sectionbreaks-pagecolor.test.js; docs/HANDOFF-WRITER-PAGE-SETUP-SYNC.md
COMMANDS RUN: `python -c "import main; print(main.find_soffice())"`; chuyển hai DOCX thật sang HTML bằng `main._run_soffice_convert(..., 'html', ..., 'writer')`; `node scripts/check-syntax.js`; targeted unit test; `node tests/run-tests.js`; `python -m unittest discover -s tests -p "test_*.py"`.
BUILD RESULT: PASS — `node scripts/check-syntax.js`: 92/92.
TEST RESULTS: PASS — `node tests/run-tests.js`: 1708/1708. FAIL (hạ tầng LibreOffice, không thuộc source đổi) — Python unittest: lần 1 có 9 lỗi Writer + 1 Sheet do `_run_soffice_convert` trả lỗi rỗng; chạy lại còn 1 Writer + 1 Sheet fail và 1 Sheet error, cùng lỗi chuyển đổi LibreOffice. Targeted Writer page setup unit: 7/7 PASS. Hai DOCX thật chuyển HTML thành công trước khi suite tranh chấp soffice.
KNOWN FAILURES: Python suite không xanh do LibreOffice headless chuyển đổi không ổn định trong môi trường đang có tác vụ song song; không kill tiến trình theo brief. Không traceback nào chạm code page setup.
RISKS: Sai số nhận dạng khổ chuẩn giữ ngưỡng hiện hữu 8 mm; kích thước tùy chỉnh được làm tròn 0,1 mm theo brief.
DEPENDENCIES/BLOCKERS: Không có. Tái sử dụng LibreOffice bridge hiện hữu, không sửa Core.
CORE PATCH ID (if any): N/A
NEXT ACTION: Tiếp tục brief Writer floating frames trong commit riêng.

## Bằng chứng DOCX thật

- MYTIME trước: `@page { size: 21.59cm 27.94cm; margin-left: 2.54cm; margin-right: 2.49cm; margin-top: 1.28cm; margin-bottom: 0.87cm }`
- MYTIME sau: `@page { size: 216mm 279mm; margin: 13mm 25mm 9mm 25mm; }`; section: `@page vno-section-1 { size:216mm 279mm; margin:13mm 25mm 9mm 25mm; }`
- Aquara trước: `@page { size: 14.65cm 21.3cm; margin-left: 2.54cm; margin-right: 2.54cm; margin-top: 2.54cm; margin-bottom: 1.27cm }`
- Aquara sau: `@page { size: 146.5mm 213mm; margin: 25mm 25mm 13mm 25mm; }`; section: `@page vno-section-1 { size:146.5mm 213mm; margin:25mm 25mm 13mm 25mm; }`

## Bằng chứng DOCX thật

LibreOffice executable: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`.

MYTIME:

- Trước: `@page { size: 21.59cm 27.94cm; margin-left: 2.54cm; margin-right: 2.49cm; margin-top: 1.28cm; margin-bottom: 0.87cm }`
- Sau: `@page { size: 216mm 279mm; margin: 13mm 25mm 9mm 25mm; }`
- Section: `@page vno-section-1 { size:216mm 279mm; margin:13mm 25mm 9mm 25mm; }`

Aquara:

- Trước: `@page { size: 14.65cm 21.3cm; margin-left: 2.54cm; margin-right: 2.54cm; margin-top: 2.54cm; margin-bottom: 1.27cm }`
- Sau: `@page { size: 146.5mm 213mm; margin: 25mm 25mm 13mm 25mm; }`
- Section: `@page vno-section-1 { size:146.5mm 213mm; margin:25mm 25mm 13mm 25mm; }`

## Hướng dẫn sử dụng

Mở DOCX bằng **Tệp > Mở**. VN Writer tự đọc khổ giấy và lề gốc. Để kiểm tra, vào **Bố cục > Thiết lập trang > Khổ giấy**; tài liệu ngoài A4/Letter/Legal hiển thị **Tùy chỉnh (rộng × cao mm)**. Nhấn **Áp dụng** nếu thay đổi lề hoặc hướng giấy; khi lưu/xuất, kích thước nhập sẽ được giữ cho trang và section hiện tại.
