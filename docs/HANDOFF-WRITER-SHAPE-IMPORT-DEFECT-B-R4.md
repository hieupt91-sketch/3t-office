# Agent Handoff

TASK: Writer shape import defect B vòng 4 — hết nhân đôi DrawingML khi lưu; sửa/di chuyển/xóa shape imported phản ánh đúng
AGENT/ROLE: Grok / Writer adapter (nhận lại worktree Codex hết hạn mức 26/10)
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Canvas d06 vẫn 37 Rectangle + 54 Connector. Bản lưu d01–d24 (bỏ d10) có `wps:wsp`, `wps:txbx`, `wp:anchor`, `w:txbxContent` ≤ gốc và ≥ bản lưu main. Sửa/di chuyển/xóa imported không mất, không nhân đôi.

FINDINGS:

- Vòng 2 đưa `wps:wsp` rect/line vào `this.shapes` (`imported: true`) để canvas vẽ. `_contentForExport()` xuất mọi `this.shapes` thành SVG. LibreOffice HTML→DOCX tạo anchor mới, đồng thời `_passthrough_writer_anchors` khôi phục DrawingML gốc → bản lưu nhân đôi (d06 b3 170/125/139 so với gốc 91/37/60 và main 79/34/47).
- Commit `ab589f6` (WIP Codex) đúng hướng: `_shapesForExport` loại imported khỏi HTML; marker `VNO_SHAPE_MUTATION_` đưa edit/delete sang Python; postprocess áp lên anchor gốc sau passthrough.
- Sửa trên WIP, không làm lại: (1) shape đơn d06 đứng trên `wp:posOffset` (`a:off` = 0,0) — move dịch `posOffset`, group child vẫn dịch `a:off`; (2) marker là `<p><a name="vno-shape-mutation"></a>VNO_SHAPE_MUTATION_hex</p>` thay vì `display:none`; (3) bỏ `shape_only_edit`→`pristine_document` vì tài liệu >25 đoạn sẽ đi nhánh relocate conservative; (4) mutation theo outer `wp:anchor`, dọn `w:drawing` rỗng; (5) ghép mọi `w:t` trong đoạn khi decode hex.

IMPLEMENTATION SUMMARY:

Imported projection chỉ còn trên canvas. Lưu không sửa thì passthrough DrawingML gốc một lần. Di chuyển/xóa ghi marker hex; Python khôi phục anchor gốc rồi dịch `posOffset`/`a:off` hoặc gỡ `wps:wsp`. Undo/redo giữ danh sách đã xóa.

FILES CHANGED:

- `adapters/libreoffice/writer/writer-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/unit/writer-floating-image-import.test.js`
- `tests/test_writer_section_headerfooter_postprocess.py`
- `docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R4.md`

COMMANDS RUN:

- `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok` trước mọi app/soffice.
- `python -m unittest` UnitPostprocessWriterDocxTests + `test_writer_anchor_passthrough` + `test_writer_save_roundtrip`: 57/57 PASS.
- `node tests/run-tests.js` foreground: 1839/1839 PASS.
- `git diff --check`: PASS.
- Batch `_batch_writer.py` d01–d24 bỏ d10 → `E:\VNOffice-profiles\grok\writer-shape-import-b4-batch` (23/23 loaded+saved; canvas pages = Word pages).
- So 4 bộ đếm với gốc và `E:\VNOffice-profiles\codex\writer-shape-import-r4-main-batch` (khớp `writer-d06-main-baseline` và `claude\d09-main-baseline`).
- Canvas d06: 37 rectangle + 54 line, 1 PNG, Trang 1/3.
- Word COM mở được bản lưu d06/d09. `_word_oracle3.ps1`: d06 saved 3 trang, d09 saved 14 trang.

BUILD RESULT: NOT RUN — không có build riêng.

TEST RESULTS:

| File | src wsp/txbx/anc/txc | main | nhánh | media s/m/b | 4 đếm |
|---|---|---|---|---|---|
| d01–d05, d08, d11–d24 | như gốc | = main | = main | không tăng | PASS |
| d06 | 91/37/60/74 | 79/34/47/51 | 79/34/48/51 | 1/0/1 | PASS (anchor 48 = main 47 + Picture 4 vòng 3; ≤60 ≥47) |
| d07 | 1/0/1/0 | 0/0/0/0 | 0/0/0/0 | 0/0/0 | PASS (≥ main, ≤ gốc; connector đơn vẫn mất như main) |
| d09 | 30/15/30/30 | 30/15/45/30 | 30/15/45/30 | 0/11/11 | wsp/txbx/txc PASS; 45 anchor = main, > gốc vì 15 Frame+15 pic GIF — VIEC 2 |
| d19 | 1/0/0/0 | 0/0/0/0 | 0/0/0/0 | 1/1/1 | PASS |

- Canvas d06: PASS 37 Rectangle + 54 Connector.
- Unit không sửa / di chuyển / xóa: PASS (`test_untouched_imported_shape_is_passthrough_once`, `test_moved_imported_shape_updates_native_anchor_once` gồm `a:off` và `wp:posOffset`, `test_deleted_imported_shape_is_not_restored`).
- Word COM d06: source Shapes=60, saved Shapes=48 ≤ 60, InlineShapes=0, có Picture 4. PASS.
- Word COM d09: source Shapes=30, saved Shapes=45 (= main, > gốc). Khớp lỗi GIF có sẵn; không phải nhân đôi vòng 2 (b3 là 60).
- `node tests/run-tests.js`: PASS 1839/1839.

KNOWN FAILURES:

- d09 15 `pic:pic` / 11 GIF / 45 `wp:anchor` — lỗi có sẵn trên main, VIEC 2.
- d07 mất 1 connector không textbox — có sẵn trên main, ngoài scope.
- 4 test soffice (Sheet FODS save CF/validation, Sheet Pivot save, FODS that height/width, textRotation): BLOCKED môi trường — FAIL cả trên main vì soffice tạo profile mới ~77s (Print Spooler treo). Không sửa test, không tăng timeout. Không nằm trong `node tests/run-tests.js` lần này (1839/1839 PASS).

RISKS:

- Marker hex dài có thể bị LibreOffice cắt nhiều `w:t` — đã ghép text đoạn.
- Passthrough không khớp thì delete/move không tìm `docPr` gốc.
- Resize imported ghi `dw/dh` vào `a:ext`/`wp:extent`; chưa có unit resize riêng.

DEPENDENCIES/BLOCKERS: Không.

CORE PATCH ID (if any): None.

NEXT ACTION: VIEC 2 — gỡ 15 pic GIF thừa d09: ghép raster `ShapeN` theo chỉ số/kích thước với anchor gốc; textbox Frame passthrough thì bỏ pic tương ứng. Commit riêng `fix(writer): W-d09-gif`. Không merge main.
