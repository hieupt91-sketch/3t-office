# Agent Handoff

TASK: Writer shape import defect B vòng 4 (hết nhân đôi DrawingML khi lưu) + gỡ 15 pic GIF thừa d09
AGENT/ROLE: Grok / Writer adapter (nhận lại worktree Codex hết hạn mức 26/10)
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Canvas d06 37 Rectangle + 54 Connector. Bản lưu d01–d24 (bỏ d10) không nhân đôi DrawingML. d09 bản lưu 0 GIF / 0 pic thừa, 30 `wp:anchor`. Sửa/di chuyển/xóa imported phản ánh đúng.

FINDINGS:

- Vòng 2 xuất `this.shapes` imported thành SVG đồng thời passthrough DrawingML gốc → nhân đôi (d06 b3 170/125/139 vs gốc 91/37/60, main 79/34/47).
- `ab589f6` đúng hướng: lọc imported khỏi HTML; marker `VNO_SHAPE_MUTATION_` sang Python. Sửa: move shape đơn qua `wp:posOffset`; marker không `display:none`; bỏ `shape_only_edit`→pristine; mutation theo outer anchor; ghép `w:t` khi decode hex.
- GIF d09: StarWriter xuất mọi `wp:anchor` thành `img ShapeN`. Passthrough chỉ thay 15 pic đầu bằng connector; 15 pic sau (6 raster connector + 9 nền chữ nhật) còn lại. Frame là chữ tách khỏi hình chữ nhật.

IMPLEMENTATION SUMMARY:

VIEC 1 (`0df8e4c` `fix(writer): W-shapeimport-b4`): imported chỉ còn trên canvas. Không sửa thì passthrough gốc một lần. Di chuyển/xóa ghi marker; Python dịch `posOffset`/`a:off` hoặc gỡ `wps:wsp`.

VIEC 2 (`fix(writer): W-d09-gif`): ghép Frame untouched với textbox nguồn theo chữ (`_paragraph_match_key`); chặn paragraph-zip lệch vì `w:p` lồng trong txbx; xóa `pic` tên `ShapeN` (không có trong nguồn, embed `.gif`, `ShapeN` = anchor nguồn `N-1`) khi drawing gốc đã có hoặc là connector/group.

FILES CHANGED:

- `adapters/libreoffice/writer/writer-adapter.js` (VIEC 1)
- `adapters/libreoffice/common/ooxml_zip_patch.py` (VIEC 1+2)
- `tests/unit/writer-floating-image-import.test.js` (VIEC 1, trong WIP)
- `tests/test_writer_section_headerfooter_postprocess.py` (VIEC 1)
- `tests/test_writer_anchor_passthrough.py` (VIEC 2)
- `docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R4.md`

COMMANDS RUN:

- `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok` trước mọi app/soffice.
- `python -m unittest` UnitPostprocess + anchor passthrough + save_roundtrip: 60/60 PASS (sau VIEC 2).
- `node tests/run-tests.js` foreground: 1839/1839 PASS (cả hai việc).
- `git diff --check`: PASS.
- Batch `_batch_writer.py` 23 file: VIEC 1 `writer-shape-import-b4-batch`; VIEC 2 `writer-d09-gif-batch`. 23/23 loaded+saved; canvas pages = Word pages.
- Word COM + `_word_oracle3.ps1` (không `ComputeStatistics`).

BUILD RESULT: NOT RUN

TEST RESULTS:

VIEC 1 — canvas d06: PASS 37 rectangle + 54 line, 1 PNG, 3 trang.

VIEC 1+2 bảng 23 file (src / main / nhánh sau VIEC 2), 4 đếm + media:

| File | src wsp/txbx/anc/txc | main | sau VIEC 2 | media s/m/n | ghi chú |
|---|---|---|---|---|---|
| d01–d05, d08, d11–d24 | như gốc | = main | = main | không tăng | PASS |
| d06 | 91/37/60/74 | 79/34/47/51 | 79/34/48/51 | 1/0/1 | PASS; +1 anchor = Picture 4; 3 group wpg còn |
| d07 | 1/0/1/0 | 0/0/0/0 | 0/0/0/0 | 0/0/0 | PASS (≥ main); connector đơn vẫn mất như main |
| d09 | 30/15/30/30 | 30/15/45/30 | 30/15/30/30 | 0/11/0 | PASS 0 GIF, 0 pic, 30 anchor |
| d19 | 1/0/0/0 | 0/0/0/0 | 0/0/0/0 | 1/1/1 | PASS |

- Unit không sửa / di chuyển / xóa: PASS.
- Unit GIF: Frame untouched khôi phục textbox + xóa GIF; Frame edited giữ chữ; PNG `Picture 4` không bị xóa. PASS.
- Word COM d06: source Shapes=60, saved=48 ≤ 60, Picture 4 + 3 Group. PASS. Oracle 3 trang.
- Word COM d09: source Shapes=30, saved=30, tên Rectangle/Connector gốc. PASS. Oracle 14 trang.
- `node tests/run-tests.js`: PASS 1839/1839.

KNOWN FAILURES:

- d07 mất 1 connector không textbox — có sẵn trên main, ngoài scope.
- d06 còn 1 `Frame6` rỗng (trước VIEC 2 có 17 Frame). Không tăng đếm, không GIF.
- 4 test soffice (Sheet FODS CF/validation, Pivot save, FODS height/width, textRotation): BLOCKED môi trường — FAIL cả trên main vì soffice tạo profile mới ~77s (Print Spooler treo). Không sửa test, không tăng timeout. Không nằm trong `node tests/run-tests.js` (1839/1839 PASS).

RISKS:

- `ShapeN` = chỉ số anchor 1-based là quy ước StarWriter đã đo trên d09; chỉ xóa khi tên không có trong nguồn và embed là GIF.
- Frame đã sửa (`vno-edited`) không passthrough — giữ Frame + GIF nền để không mất chữ người dùng.
- Không merge `main`, không rebase/force.

DEPENDENCIES/BLOCKERS: Không.

CORE PATCH ID (if any): None.

NEXT ACTION: Review trên nhánh này. Không merge main từ worktree này.
