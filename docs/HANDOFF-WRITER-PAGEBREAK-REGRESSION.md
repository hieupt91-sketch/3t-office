# Agent Handoff

TASK: Writer page-break regression và media passthrough trùng lặp
AGENT/ROLE: Codex / Writer integration
BRANCH: fix/writer-anchor-passthrough
WORKTREE: E:\VNOffice-codex-writer-anchors
OBJECTIVE: Khôi phục phân trang MYTIME, giữ Aquara trong 16 ±1 trang, và loại raster LibreOffice dư khi thay anchor native.
FINDINGS: `f209d8f` đã xóa cả page-break thật của carrier ảnh thường. Với Aquara, 9 break nguồn nằm trên carrier grouped drawing; đổi carrier đó thành `<p>` làm LibreOffice nâng 7 break bố cục thành break bổ sung và tăng 17 → 20 trang. Hai break nội dung độc lập là đủ khi native group được passthrough. MYTIME không có native group carrier và cần giữ `<p>` để 43 break section/trang được xuất. Media tăng gấp đôi vì relationship và raster của anchor LibreOffice bị thay vẫn còn trong package.
IMPLEMENTATION SUMMARY: Chỉ loại `min-height`/`position` khi xuất, giữ metadata break. Gắn metadata source-group và dùng carrier `<div>` theo cấp tài liệu khi có WPG native; tài liệu ảnh thường tiếp tục dùng `<p>`. Khi passthrough thay anchor, thu các rId cũ, chỉ xóa relationship không còn được document.xml tham chiếu, và chỉ bỏ media target khi không còn relationship nào dùng chung.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/unit/writer-floating-image-import.test.js; tests/test_writer_anchor_passthrough.py; docs/HANDOFF-WRITER-PAGEBREAK-REGRESSION.md
COMMANDS RUN: python -m unittest tests.test_writer_anchor_passthrough tests.test_writer_section_headerfooter_postprocess; node scripts/check-syntax.js; node tests/run-tests.js; python _roundtrip_save_writer_app.py <worktree> <docx> <out> cho cả hai file; .\_word_oracle_claude.ps1 -File <docx>; python _docx_pagebreaks.py <docx>.
BUILD RESULT: PASS - node scripts/check-syntax.js (92/92).
TEST RESULTS: PASS - focused Python (11/11); full suite (1718/1718); app thật + Word 2016 theo bảng dưới.
KNOWN FAILURES: None.
RISKS: Quyết định carrier group áp dụng theo cấp tài liệu vì thứ tự span HTML và anchor OOXML không ổn định; tài liệu hỗn hợp group và ảnh thường sẽ ưu tiên tránh nhân đôi break carrier.
DEPENDENCIES/BLOCKERS: Microsoft Word 2016, LibreOffice và pywebview có sẵn tại máy kiểm chứng.
CORE PATCH ID (if any): None; chỉ Adapter và OOXML package postprocessor.
NEXT ACTION: Review commit và giữ các file kiểm chứng sinh ra ngoài Git.

## Kiểm chứng app thật và Word 2016

| Tài liệu | Gốc | Output | Chênh lệch | Trang Word | `w:br type="page"` |
|---|---:|---:|---:|---:|---:|
| Aquara | 23,771,853 B | 11,175,921 B | -53.0% | 17 | 2 |
| MYTIME | 31,888,330 B | 34,515,921 B | +8.2% | 88 | 43 |

Aquara giữ 2 break nội dung độc lập; 7 break còn lại của file gốc nằm trên đoạn chỉ mang grouped drawing và đã được native anchor passthrough đảm nhiệm phân trang. Giữ chúng dưới dạng `<p>` tạo break kép và cho kết quả sai 20 trang.
