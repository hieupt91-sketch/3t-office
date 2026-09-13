# Agent Handoff

TASK: Writer paragraph spacing/alignment fidelity and Aquara cover duplicate text boxes
AGENT/ROLE: Codex / Writer integration
BRANCH: fix/writer-spacing-align-cover
WORKTREE: E:\VNOffice-codex-writer-spacing
OBJECTIVE: Preserve untouched DOCX paragraph layout through the real desktop save path and suppress LibreOffice text boxes already represented by preserved WPG groups.
FINDINGS: LibreOffice HTML import assigns Body Text, left alignment, and atLeast line spacing. MYTIME also receives 43 synthetic page-break carrier paragraphs. Restoring body-flow paragraph formatting while excluding textbox/table paragraphs preserves Word 2016 pagination at 88 pages; the remaining 43 spacing/alignment audit entries are the synthetic break carriers required for pagination. Aquara generated 135 editable Frame anchors whose text was already contained in original WPG groups; their paragraph anchors incorrectly landed on the cover.
IMPLEMENTATION SUMMARY: Untouched imported paragraphs receive stable export bookmarks, including nested paragraphs. Pristine round trips restore paragraph style, spacing, indentation, alignment, numbering, and run formatting using document-flow LCS matching. Duplicate LibreOffice textbox anchors are removed only for pristine/untouched content when normalized textbox text is contained in an original WPG group. Existing group/picture passthrough remains the source of rendered content.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/unit/writer-docx-audit.test.js; tests/test_writer_section_headerfooter_postprocess.py; docs/HANDOFF-WRITER-SPACING-ALIGN-COVER.md
COMMANDS RUN: node --check adapters/libreoffice/writer/writer-adapter.js; python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py; node tests/run-tests.js; python -m unittest discover -s tests -p "test_writer*.py"; real desktop round trips with main.py; scripts/audit-writer-docx.mjs; Microsoft Word 2016 COM page/oracle and shape inspection.
BUILD RESULT: PASS - JavaScript and Python syntax checks passed.
TEST RESULTS: PASS - 1721/1721 JavaScript tests and 40/40 Writer Python tests. Real Word 2016: MYTIME 88 pages, Aquara 17 pages. MYTIME audit spacing/alignment 43/43, all residual entries correspond to the 43 synthetic page-break carriers; ordinary matched paragraphs are restored. Aquara Text remains 114 and does not increase; standalone cover labels are absent after save.
KNOWN FAILURES: The auditor still reports the synthetic page-break carriers as 43 spacing and 43 alignment differences because the original has natural pagination while the HTML bridge uses explicit zero-height breaks.
RISKS: Duplicate removal intentionally requires exact normalized containment in an original WPG group plus pristine/untouched ownership; edited text boxes are retained.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None; no LibreOffice Core modification.
NEXT ACTION: Continue reducing the pre-existing Text differences from LibreOffice paragraph splitting/merging in a separate scoped task.

## Hướng dẫn sử dụng

Đây là sửa lỗi tương thích, không thêm thao tác mới. Trong VN Writer, mở tệp DOCX rồi chọn **Tệp > Lưu** như bình thường. Khi tài liệu chưa được chỉnh sửa, Writer tự giữ khoảng cách đoạn, giãn dòng và căn lề gốc; các hộp chữ nằm trong nhóm hình của tài liệu cũng không bị nhân đôi lên trang bìa. Nếu đã sửa nội dung hoặc định dạng một đoạn, Writer giữ thay đổi của người dùng thay vì khôi phục định dạng gốc cho đoạn đó.
