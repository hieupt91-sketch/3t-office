# Agent Handoff

TASK: W20 — Writer tạo mới → lưu DOCX → Word 2016
AGENT/ROLE: Codex / Writer + LibreOffice adapter
BRANCH: fix/writer-create-new-defects
WORKTREE: E:\VNOffice-codex-writer-w20
OBJECTIVE: Sửa bộ đo trước, xử lý các lệch W20a–g, khóa unit test/quy ước và nghiệm thu bằng Word COM + soffice tuần tự.

FINDINGS:
- Harness gốc dừng tại ảnh do biến Python `PNG_1X1_RED` không tồn tại trong JavaScript browser. Khi sửa harness, ảnh/header/footer/lề phải vốn đã PASS.
- Word COM enum `LineSpacingRule=1` là 1,5 dòng; `FirstLineIndent` trả point; `ListType=4` dùng chung cho bullet/numbered và phải nhìn `ListString`.
- `ComputeStatistics` báo 3 trang trong khi Word PDF oracle báo đúng 2; readback đã chuyển sang print-layout PDF.
- Harness cuối: `CHECKS=36 DIFFS=0` trên `_new_final5.docx` sau khi dùng page-count oracle.
- Audit 24 file không tái lập baseline W12d do người phụ trách cung cấp: wrap 78 → 88, page 613 → 618. Không thay định nghĩa/ngưỡng `kind`; `_writer_layout_audit.py` không sửa.
- d10 vẫn `WORD FAIL The file appears to be corrupted.`
- `_batch_writer.py` hoàn tất d01–d09 rồi kẹt ở d10; đã dừng thủ công. Kết quả d01–d09 (word/canvas/saved): d01 19/17/22, d02 11/11/13, d03 1/2/2, d04 5/3/5, d05 2/2/2, d06 3/3/3, d07 23/24/22, d08 1/1/1, d09 14/14/12.

IMPLEMENTATION SUMMARY:
- Chuẩn hóa readback boolean, ký tự cuối ô, enum giãn dòng/danh sách, đơn vị indent, vị trí trang và page count PDF.
- Sửa harness để scenario ảnh thực sự chạy hết.
- Tài liệu tạo mới hậu xử lý DOCX cục bộ: first-line indent, bullet abstract numbering riêng, lề `w:pgMar`, section break đúng carrier paragraph.
- Ghi W20a–g vào `docs/QUY-UOC-DOI-CHIEU.md`; W20d/W20f ghi rõ là PASS sau khi sửa harness, không sửa sản phẩm giả.

FILES CHANGED:
- `scripts/layout-audit/_word_readback.ps1`
- `scripts/layout-audit/_create_new_writer.py`
- `main.py`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/test_writer_create_new_readback.py`
- `tests/test_writer_section_headerfooter_postprocess.py`
- `tests/unit/writer-sectionbreaks-pagecolor.test.js`
- `docs/QUY-UOC-DOI-CHIEU.md`

COMMANDS RUN:
- `python scripts/layout-audit/_create_new_writer.py . _new_final5.docx`
- `powershell -File scripts/layout-audit/_word_readback.ps1 -File _new_final5.docx`
- `powershell -File scripts/layout-audit/_word_oracle3.ps1 -File <absolute _new_final5.docx>`
- `python scripts/layout-audit/_writer_layout_audit.py . "file test/landocx" _out`
- `python scripts/layout-audit/_batch_writer.py . "file test/landocx" _out`
- `node scripts/check-syntax.js`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests -p "test_writer*.py"`

BUILD RESULT: NOT RUN — không có build gate riêng trong brief.

TEST RESULTS:
- PASS — create-new harness: `CHECKS=36 DIFFS=0`.
- PASS — Word PDF oracle: `OK pages=2`.
- PASS — `node scripts/check-syntax.js`: `92/92`, 0 lỗi.
- PASS — `node tests/run-tests.js`: `1785/1785 PASS | 0 FAIL`.
- PASS — Writer Python: `Ran 58 tests ... OK`.
- FAIL — audit regression gate so với baseline được cung cấp: wrap 78 → 88; page 613 → 618.
- BLOCKED — `_batch_writer.py` kẹt ở d10 corrupt sau d01–d09.

BẢNG TỔNG KIND 24 FILE:

| kind | trước (baseline được cung cấp/khả dụng) | sau | files sau |
|---|---:|---:|---:|
| page | 613 | 618 | 15 |
| wrap | 78 | 88 | 15 |
| drift:unknown | không có snapshot trong worktree | 60 | 15 |
| font-size | không có snapshot trong worktree | 36 | 4 |
| line-height | không có snapshot trong worktree | 28 | 11 |
| spacing | không có snapshot trong worktree | 21 | 4 |
| drift:empty-para | không có snapshot trong worktree | 20 | 8 |
| font-name | không có snapshot trong worktree | 5 | 2 |
| drift:float | không có snapshot trong worktree | 4 | 1 |
| drift:table | không có snapshot trong worktree | 4 | 3 |

KNOWN FAILURES:
- Không thể claim nghiệm thu PASS vì bảng kind tăng so với baseline do người phụ trách cung cấp.
- Không có ma trận “trước” đầy đủ trong worktree; chỉ có hai tổng baseline page/wrap được nêu trực tiếp.

RISKS:
- Postprocess tạo mới khớp paragraph theo text; văn bản trùng nhau ở ranh section cần test mở rộng nếu triển khai nhiều section phức tạp.
- Audit canvas chạy mới có dao động so với baseline W12d dù mã `kind` không đổi.

DEPENDENCIES/BLOCKERS:
- Cần người phụ trách xác nhận snapshot/cache canvas tạo ra baseline 78/613 hoặc cho phép điều tra riêng sai lệch audit.
- Cần cách skip/timeout d10 trong `_batch_writer.py` để chạy tiếp d11–d24 mà không đổi bộ đo ngoài scope.

CORE PATCH ID (if any): Không có.
NEXT ACTION: Tái lập đúng môi trường/cache W12d để audit 24 file; sau đó chạy batch d11–d24 hoặc thêm cơ chế skip d10 trong một task bộ đo riêng được phê duyệt.
