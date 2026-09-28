# Agent Handoff

TASK: Writer shape import defect B vòng 4 — hết nhân đôi DrawingML khi lưu; sửa/di chuyển/xóa shape imported phản ánh đúng
AGENT/ROLE: Grok / Writer adapter (nhận lại worktree Codex hết hạn mức 26/10)
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Canvas d06 vẫn 37 Rectangle + 54 Connector. Bản lưu d01–d24 (bỏ d10) có `wps:wsp`, `wps:txbx`, `wp:anchor`, `w:txbxContent` ≤ gốc và ≥ bản lưu main. Sửa/di chuyển/xóa imported không mất, không nhân đôi.

FINDINGS:

- Vòng 2 đưa `wps:wsp` rect/line vào `this.shapes` (`imported: true`) để canvas vẽ. `_contentForExport()` xuất **mọi** `this.shapes` thành SVG. LibreOffice HTML→DOCX tạo anchor mới, đồng thời `_passthrough_writer_anchors` khôi phục DrawingML gốc → bản lưu nhân đôi (d06 b3 170/125/139 so với gốc 91/37/60 và main 79/34/47).
- Commit `ab589f6` (WIP Codex, chưa kiểm chứng) đúng hướng: `_shapesForExport` loại shape imported khỏi HTML; marker `VNO_SHAPE_MUTATION_` đưa edit/delete sang Python; postprocess áp lên anchor gốc sau passthrough. Undo/redo giữ `_deletedImportedShapeNames`.
- Phần giữ: lọc imported khỏi serialize; cầu marker hex JSON; xóa `wps:wsp` theo `cNvPr`; snapshot/open reset; unit JS khung không-sửa/di-chuyển/xóa.
- Phần sai/thiếu trong WIP:
  1. `_apply_writer_imported_shape_mutation` luôn cộng `dx/dy` vào `a:off`. d06 shape đơn có `a:off="0,0"` và vị trí thật ở `wp:posOffset` (Rectangle 44, Straight Connector 41). Move phải dịch `wp:posOffset` khi không nằm trong `wpg:wgp`.
  2. Marker bọc `display:none` — LibreOffice HTML import dễ bỏ. Đổi thành `<p><a name="vno-shape-mutation"></a>VNO_SHAPE_MUTATION_…</p>` (cùng kiểu `vno-untouched` / `vno-pristine-document`).
  3. `shape_only_edit` gán `pristine_document=True` khi chỉ sửa shape. Với tài liệu >25 đoạn, `_relocate_passthrough_anchors` chuyển sang nhánh conservative và đổi hành vi d06. Bỏ cờ này: không sửa text thì không có `vno-pristine-document` nên short-circuit nguồn không kích hoạt; `vno-untouched-` vẫn đủ cho passthrough.
  4. Áp mutation bằng `_WRITER_ANCHOR_RE` (non-greedy) thay vì outer `wp:anchor`. Đổi sang `_xml_element_ranges` / outer blocks; dọn `w:drawing` rỗng sau khi xóa.
  5. Strip marker chỉ tìm một `w:t` liền. Ghép mọi `w:t` trong đoạn body rồi mới decode hex.
- GIF d09 (15 pic thừa) là lỗi có sẵn trên main, không thuộc vòng 4. Làm VIEC 2 sau khi commit `fix(writer): W-shapeimport-b4`.

IMPLEMENTATION SUMMARY:

Đang sửa trên nền `ab589f6`, không làm lại từ đầu. Handoff này ghi nhận đánh giá WIP trước khi code ổn định.

FILES CHANGED:

- `docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R4.md` (tài liệu này)

COMMANDS RUN:

- Đọc R2/R3/R4-FINDINGS, HANDOFF d09 GIF, `git show ab589f6`, parser `_ooxmlImportedBasicShapes`, `_passthrough_writer_anchors`, `_contentForExport`.
- `git status` / `git log`: nhánh `fix/writer-shape-import-defectb-codex-r2` @ `ab589f6`, working tree sạch.
- Đo d06 gốc: 91 `wps:wsp`, 37 `wps:txbx`, 60 `wp:anchor`, 74 `w:txbxContent`, 1 `pic:pic`, 3 `wpg:wgp`. Anchor 0/2 là shape đơn `a:off 0,0` + `wp:posOffset`; anchor 1 là group 10 wsp.

BUILD RESULT: NOT RUN

TEST RESULTS:

- Unit Python/JS của `ab589f6`: NOT RUN tại thời điểm handoff sớm này.
- Batch 23 file / Word COM / `node tests/run-tests.js`: NOT RUN.

KNOWN FAILURES:

- `ab589f6` chưa kiểm chứng; move top-level sẽ lệch nếu giữ nguyên cộng `a:off`.
- 4 test soffice (Sheet FODS CF/validation, Pivot save, FODS height/width, textRotation) FAIL cả trên main vì profile mới ~77s (Print Spooler). Báo BLOCKED môi trường; không sửa test, không tăng timeout.

RISKS:

- Marker hex dài có thể bị LibreOffice cắt thành nhiều `w:t` — đã dự phòng ghép text đoạn.
- Passthrough không khớp thì delete/move không tìm được `docPr` gốc; shape raster LibreOffice có thể còn.
- Không merge `main`, không rebase/force, không commit tài liệu thật.

DEPENDENCIES/BLOCKERS: Không. Worktree không còn agent khác dùng.

CORE PATCH ID (if any): None.

NEXT ACTION: Sửa Python/JS theo đánh giá trên; unit không-sửa/di-chuyển/xóa; batch 23 file; Word COM d06/d09; commit `fix(writer): W-shapeimport-b4`; rồi VIEC 2 GIF d09.
