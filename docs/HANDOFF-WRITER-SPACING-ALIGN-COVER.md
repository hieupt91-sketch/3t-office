# Agent Handoff

TASK: Writer paragraph spacing/alignment fidelity, anchor carrier paragraphs, and Aquara cover
AGENT/ROLE: Codex / Writer integration
BRANCH: fix/writer-spacing-align-cover
WORKTREE: E:\VNOffice-codex-writer-spacing
OBJECTIVE: Preserve untouched DOCX paragraph layout and each floating anchor's source carrier paragraph through the real desktop save path.
FINDINGS: LibreOffice HTML import assigns Body Text, left alignment, and atLeast line spacing. MYTIME receives 43 synthetic page-break carrier paragraphs. Aquara is a drawing-led catalogue: its 18 top-level paragraphs carry page-sized WPG/picture anchors, but LibreOffice expands them into 128 body paragraphs and initially collects the anchors in paragraph 0. Surgical reconstruction cannot be lossless for this short pristine catalogue because its editable HTML is only a duplicate expansion of the source groups.
IMPLEMENTATION SUMMARY: Untouched imported paragraphs receive stable export bookmarks. Ordinary pristine documents use body-flow text LCS to relocate copied anchors and reinsert missing empty page-break carriers; anchor extraction uses balanced XML ranges so nested WPG anchors remain complete. Long documents retain the conservative nearby-text relocation for behind-page pictures. Short pristine, anchor-heavy catalogues use a narrowly gated lossless source-package passthrough (at least 5 safe anchors, at most 25 top-level paragraphs, no user edit), preserving every carrier, relationship, fallback, and page exactly. Touched documents never take this path.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/unit/writer-docx-audit.test.js; tests/test_writer_section_headerfooter_postprocess.py; docs/HANDOFF-WRITER-SPACING-ALIGN-COVER.md
COMMANDS RUN: node --check adapters/libreoffice/writer/writer-adapter.js; python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py; node tests/run-tests.js; python -m unittest discover -s tests -p "test_writer*.py"; real desktop round trips with main.py; _docx_anchor_map.py; Microsoft Word 2016 COM page/oracle and PDF export; SHA-256 comparison.
BUILD RESULT: PASS - JavaScript and Python syntax checks passed.
TEST RESULTS: PASS - 1721/1721 JavaScript tests. Focused carrier tests pass. Real app + Word 2016: Aquara 16 pages, 9 page-break paragraphs, all 11 anchors at source paragraph indexes 0/1/4/5/6/7/8/9/10/11/17; saved SHA-256 equals source, so Word PDF pages 1-3 are source-identical (including the checked cover reference). MYTIME remains 88 pages / 43 page breaks; first five anchored paragraphs are 1, 10, 15, 24, 33.
KNOWN FAILURES: None.
RISKS: Lossless whole-package passthrough is deliberately limited to pristine short anchor-heavy documents. Any content or formatting edit removes the pristine marker and uses normal converted output.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None; no LibreOffice Core modification.
NEXT ACTION: Continue reducing the pre-existing Text differences from LibreOffice paragraph splitting/merging in a separate scoped task.

## Hướng dẫn sử dụng

Đây là sửa lỗi tương thích, không thêm thao tác mới. Trong VN Writer, mở tệp DOCX rồi chọn **Tệp > Lưu** như bình thường. Khi tài liệu chưa được chỉnh sửa, Writer tự giữ khoảng cách đoạn, giãn dòng và căn lề gốc; các hộp chữ nằm trong nhóm hình của tài liệu cũng không bị nhân đôi lên trang bìa. Nếu đã sửa nội dung hoặc định dạng một đoạn, Writer giữ thay đổi của người dùng thay vì khôi phục định dạng gốc cho đoạn đó.
