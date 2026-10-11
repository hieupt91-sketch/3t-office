# Agent Handoff
TASK: Doc (Writer) so với Word thật — đợt 9
AGENT/ROLE: Codex / Writer audit + adapter
BRANCH: audit/doc-t9-codex
WORKTREE: E:\VNOffice-codex-ft9
OBJECTIVE: Đối chiếu các nhóm DOCX còn NOT RUN bằng Word COM và thao tác desktop qua CDP; sửa sai lệch tái hiện, ghi Help/i18n và handoff.
FINDINGS: Ảnh float/wrap/position trước đây bị mất khi lưu; image anchor đã sửa. Cờ DifferentFirst/Even và page restart khớp COM nhưng app chưa biên tập được header/footer riêng theo loại trang. TOC có heading/page sau Word Update; footnote/endnote, Track Changes, hình khối lúc tạo, Find/Replace đã đo. Reply comment, Subtitle/List Paragraph, semantic Title, xoay shape, soft line break/column break có gap; UI parity multilevel chưa xác minh.
IMPLEMENTATION SUMMARY: Adapter hậu xử lý DOCX giữ anchor, wrap, relative position và offset cho ảnh người dùng chỉnh; thêm unit test, Help tiếng Việt và i18n VI/EN. Sửa vị trí ribbon trong Help cho Chèn ảnh và tab Định dạng ảnh. Thêm harness COM/CDP cho ảnh, chẵn/lẻ và line/column break; cập nhật audit/backlog. Không sửa LibreOffice Core.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; apps/writer/writer-arrange.js; platform/help/entries-writer.js; platform/i18n/strings-en.js; platform/i18n/strings-vi.js; tests/test_writer_created_image_layout.py; scripts/audit-0610/word_parallel/*-t9*; docs/AUDIT-DOC-WORD-PARALLEL-1011.md; docs/RIBBON-BACKLOG.md.
COMMANDS RUN: CDP desktop harness + Word COM cho header/footer, ảnh, find/replace, hình khối, ngắt dòng/cột; COM readback cho TOC/notes/comments/track changes/styles; `npm test`; `python -m unittest discover -s tests`; batch DOCX audit d01/d07/d13/d20/d24; `node tests/live/writer-multilevel-list-real-conversion.mjs`.
BUILD RESULT: NOT RUN (không yêu cầu build).
TEST RESULTS: npm 3066/3066 PASS; unittest 861 OK; batch 5/5 PASS, edit PASS, page delta 0; image-layout unit test 3/3 PASS; multilevel serializer live test PASS.
KNOWN FAILURES: Writer line/column CDP+COM sai lệch: app không roundtrip Shift+Enter thành soft break và DOCX bỏ `Next column`. Multilevel UI/Word COM parity NOT RUN vì harness tạo đầu vào không ổn định. Help Ribbon consistency lần chạy đầu fail do vị trí bài Help bị gán nhầm; đã sửa và npm chạy lại PASS.
RISKS: Các gap Writer ở FINDINGS chưa được triển khai; image offset đo với A4 section; không kết luận các header/footer riêng theo trang có thể sửa nội dung.
DEPENDENCIES/BLOCKERS: Không có dependency mới. Batch profile/log và ảnh nằm ngoài repo tại E:\VNOffice-profiles\codex-ft9.
CORE PATCH ID (if any): N/A
NEXT ACTION: Xử lý từng gap ở `docs/RIBBON-BACKLOG.md` theo owner; ưu tiên soft break/column break và bổ sung lựa chọn vùng Header/Footer Default/First/Even.
