# Agent Handoff

TASK: Writer legacy `.doc` layout wave 2 (Codex)
AGENT/ROLE: Codex / Writer integration and layout
BRANCH: `fix/writer-legacy-doc2-codex`
WORKTREE: `E:\VNOffice-codex-writer-legacy-doc2`
OBJECTIVE: Diagnose and reduce Word/canvas/save page-count differences for legacy DOCs while preserving existing OOXML shapes and avoiding LibreOffice Core changes.

FINDINGS:

- `legacy13.doc`: an anchored `wrapSquare` image can be reinterpreted by the legacy DOC filter after edits elsewhere in the document. Comparing only the image paragraph misses that save case.
- `legacy18.doc`: the DOCX import has a trailing chain of empty paragraphs with direct `w:keepNext`. Browser pixel rounding left the chain just inside the live pagination threshold; Word moves it to page 3.
- `legacy20.doc`: the Word page-count oracle encountered a modal error dialog and timed out.

IMPLEMENTATION SUMMARY:

- Added source-aware DOC export preparation. It compares body text and changes square wrapping to `wrapNone` only for anchored-image documents whose body text was edited.
- Imported direct and inherited OOXML `keepNext` onto normalized Writer paragraphs, removed the internal marker on export, and honored keep-next groups in print pagination. Live pagination applies a 2px rounding tolerance to trailing empty keep-next chains; non-empty heading groups use normal block pagination to avoid false extra pages.
- No LibreOffice Core changes, new dependencies, Sheet changes, or external data flows.

FILES CHANGED:

- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/writer/writer-adapter.js`
- `main.py`
- `tests/test_writer_legacy_doc_save.py`
- `tests/unit/writer-legacy-keep-next.test.js`
- `tests/run-tests.js`
- `docs/HANDOFF-WRITER-LEGACY-DOC2.md`

COMMANDS RUN:

- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_writer_legacy_doc_save -v`
- Targeted Writer legacy keep-next unit tests
- `_batch_writer.py` for the 20 legacy DOC corpus, then re-runs for `legacy13.doc` and `legacy18.doc`
- `_batch_writer.py` for DOCX `d01`–`d09`, `d11`–`d24` (excluded `d10`)
- `_writer_shape_counts.py` for both DOCX batch output directories
- Foreground Word COM anchor-page comparison for `d04`, `d06`, `d07`, `d09`, and `d24`
- `_canvas_para_metrics.py` targeted rechecks for `legacy18.docx`, `d01.docx`, `d13.docx`, and `d19.docx`
- `git diff --check`

BUILD RESULT: NOT RUN — this task changes Writer import/export and pagination; automated test suites and document round-trips were run.

TEST RESULTS:

- PASS — Node suite: 1855/1855.
- PASS — Python suite: 381/381.
- PASS — legacy DOC save unit tests: 3/3.
- PASS — keep-next unit tests: 4/4.
- PASS — DOCX corpus `d01`–`d09`, `d11`–`d24`: Word/save page counts matched. Live canvas rechecks confirmed corrected page counts for `d01` (19), `d13` (10), and `d19` (2); other batch entries matched Word. `ZZ` was present in saved files.
- PASS — shape counts: zero excess `wsp`/`txbx`/`txc`/media and zero duplicate `wp:docPr` IDs across the 23 DOCX files.
- PASS — Word anchor-page checks: `d04`, `d06`, `d07`, `d09`, and `d24` had zero missing/page-mismatched shapes.
- PASS — legacy DOC `legacy01`–`legacy17` and `legacy19`: Word, canvas, and saved page counts matched. `legacy13.doc` recheck after the fix: 1/1/1.
- FAIL — `legacy18.doc`: Word 3 / canvas 3 / saved DOC 2. Live canvas and print pagination are corrected; save-to-DOC still loses enough body flow to remain one page short.
- BLOCKED — `legacy20.doc`: Word oracle timed out on a modal dialog; no reliable saved-page count.

KNOWN FAILURES:

- The task is not fully green until `legacy18.doc` saves as 3 pages. The current output retains its trailing keepNext properties, but the DOC round-trip produces fewer body paragraphs than the source conversion.
- `legacy20.doc` requires a non-modal Word oracle run or dismissal of its document error dialog before its saved-page count can be verified.
- The 20-file DOC batch was interrupted at `legacy20` after the Word oracle stalled; all `legacy01`–`legacy19` rows were recorded. `legacy20` is reported as BLOCKED based on the reproduced oracle timeout.

RISKS:

- The DOC compatibility shim changes wrapping for edited legacy documents with square-wrapped floating anchors. Unedited documents and unrelated wrapping types are left alone.
- Live pagination handles the observed trailing blank keep-next chain; broader heading pagination remains governed by existing block behavior to avoid adding false pages.

DEPENDENCIES/BLOCKERS: Word COM modal behavior for `legacy20`; unresolved body-flow loss on saved `legacy18.doc`.

CORE PATCH ID (if any): None.

NEXT ACTION:

1. Compare source and saved `legacy18.doc` body paragraph sequence around the trailing keepNext chain and preserve the missing flow paragraphs in the source-aware DOC export path.
2. Re-run the `legacy18.doc` Word/canvas/saved oracle and the full 20-file DOC batch.
3. Resolve or bypass the `legacy20.doc` Word modal with an approved foreground measurement path.

COMMITS:

- `ffc3c97` — findings committed before code changes.
- `5d28a0a` — root-cause findings addendum.
- `cfa97e5` — Writer DOC export and keep-next changes.

## Vòng 2 — W-legacydoc2b (2026-09-29)

Kết quả vòng này thay thế các kết luận tương ứng của Vòng 1 bên trên.

WRAP CỦA ẢNH `legacy13.doc`:

- Đo Word COM read-only qua `Shapes(i).WrapFormat.Type`, không dùng SendKeys. Word nguồn cho `0` (`wdWrapSquare`). Bản DOC lưu thử không shim cho `4` (`wdWrapTopBottom`); bản thử shim `wrapNone` cho `3` (`wdWrapNone`). Như vậy `wrapNone` đã thực sự lọt vào DOC và vẫn không giữ nguyên kiểu wrap nguồn.
- Không tìm được cách sạch trong bộ lọc DOC để giữ `Square`; đã gỡ shim và chấp nhận sai lệch trang. Lượt DOC mới: Word nguồn 1 trang / canvas 1 / DOC lưu 2 trang. Đây là FAIL về page count, được giữ nguyên trung thực.

PHÂN TRANG VÀ DUNG SAI 2 PX:

- Đo `_batch_writer.py` hai lượt liên tiếp dưới `LOCALAPPDATA=E:\VNOffice-profiles\codex`. Cả hai lượt đều có kết quả: `d01` 19/19/19, `d13` 10/10/10, `d19` 2/2/2 (Word nguồn/canvas/Word file lưu); `loaded=yes`, `saved=yes`.
- 2 px chỉ được trừ khỏi ngưỡng khi cả nhóm `keepNext` ở cuối tài liệu đều rỗng. Lý do đo thực tế: trên d21, khối ảnh 428.7 px được `offsetHeight` làm tròn thành 429 px; các khối cuối trang cộng dồn xấp xỉ 1 px, trong khi Word còn khoảng 2 px vùng chữ. Dung sai xử lý sai khác làm tròn sát ngưỡng đó; không áp dụng cho nhóm tiêu đề có chữ.

CORPUS DOC:

- Batch mới ghi đủ `legacy01`–`legacy19`: 16 PASS (`legacy02`–`legacy12`, `legacy14`–`legacy17`, `legacy19`); `legacy01` FAIL vì không tạo file lưu (Word/canvas 5/5); `legacy13` FAIL (1/1/2); `legacy18` FAIL (3/3/2).
- `legacy18` vẫn mất trang khi lưu. So sánh DOCX chuẩn hóa (74 đoạn) với bản lưu (71 đoạn) cho thấy tám đoạn trống/khoảng trắng ở giữa tài liệu không còn; phía cuối có thêm năm đoạn trống. Chưa xác định bước chính xác gây mất đoạn, nên không thêm sửa đoán mò.
- `legacy20` BLOCKED. COM OpenAndRepair không trả về Document (PowerShell báo NullReferenceException). Word đang có modal “The last time you opened 'd10.docx', it caused a serious error”; `_word_oracle3.ps1` khi timeout sẽ dừng mọi WINWORD, nên đã dừng đúng tiến trình batch của lượt này để giữ nguyên các Word process đã tồn tại. Không có page count mới cho `legacy20`.

CORPUS DOCX VÀ KIỂM TRA SHAPE:

- Báo cáo batch round-trip có sẵn cho 23 DOCX `d01`–`d09`, `d11`–`d24`: cả 23 file lưu được và Word page count của file lưu khớp file nguồn. Báo cáo đó cho canvas thừa một trang ở `d01`, `d13`, `d19`; hai lượt kiểm tra liên tiếp mới ở trên đều khớp. Full 23-file `_batch_writer.py` không chạy lại trong Vòng 2 (NOT RUN): Word modal hiện hữu khiến oracle timeout handler có thể đóng tất cả WINWORD; đã dùng báo cáo full cũ, hai lần recheck mục tiêu và shape/anchor checks mới.
- `_writer_shape_counts.py`: 23/23 không tăng số `wsp`/`txbx`/`txc`/media và không có ID `wp:docPr` trùng. Lưu ý `txc` giảm 17 ở d06 và 15 ở d09; bộ kiểm tra không xem giảm số lượng là “excess”.
- `_word_shape_pages.ps1`: d04, d06, d07, d09, d24 đều không thiếu shape và không đổi trang neo.

TEST RESULTS:

- PASS — `node tests/run-tests.js`: 1855/1855 (chạy lại với `LOCALAPPDATA` đã đặt).
- PASS — `python -m unittest discover -s tests`: 379/379 với `LOCALAPPDATA` đã đặt. Lượt chạy trước đó có 1 lỗi ở `test_paragraph_spacing_inline_margin_survives_roundtrip`; test riêng và lượt suite đầy đủ sau đó đều pass.
- PASS — `python -m unittest tests.test_writer_legacy_doc_save -v`: 1/1.
- BUILD — NOT RUN.

FILES/COMMITS:

- Gỡ `prepare_writer_legacy_doc_export` và chỗ gọi để không đổi `wrapSquare` sang `wrapNone`; test xác nhận DOCX trung gian còn `wrapSquare`.
- `bd0daec` — `fix(writer): W-legacydoc2b preserve square wrap on DOC export`.
- Chưa merge vào main.

KNOWN FAILURES/BLOCKERS:

- `legacy01`: không có file lưu ở batch mới.
- `legacy13`: DOC lưu hai trang thay vì một; ảnh giữ `wdWrapTopBottom` thay vì `wdWrapSquare` do bộ lọc DOC.
- `legacy18`: DOC lưu hai trang thay vì ba; tám đoạn trắng/khoảng trắng không còn trong thân tài liệu.
- `legacy20`: BLOCKED bởi modal Word/COM; OpenAndRepair không trả về Document.
