# HANDOFF — Writer Shape Import Defect B, vòng 3

TASK: Sửa lỗi mất Picture 4 của d06 khi lưu DOCX trong VN Writer
AGENT/ROLE: Codex / Writer adapter
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Giữ ảnh DrawingML trong lần lưu DOCX với media/relationship/anchor hợp lệ, đồng thời không làm mất 37 Rectangle + 54 Connector.

## FINDINGS

- Baseline main ở commit `ce28fac` đã được đo trong worktree detached tạm. Nguồn d06 có 1 `word/media`; bản lưu từ main có 0. Vì vậy lỗi là lỗi có sẵn trên main, không phải hồi quy vòng 2. Phép đo đầy đủ nằm ở [HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R3-FINDINGS.md](HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R3-FINDINGS.md), commit `618f442`.
- Nguyên nhân gốc: `_collapseFloatOnlyParagraphBreaks` xử lý đoạn chỉ có inline `<img>` và hai `<br>` như khoảng trắng; trong tài liệu d06, nó thay toàn bộ đoạn cuối chứa Picture 4 thành `<p><br></p>`. Ảnh biến mất trước khi app tạo HTML xuất.
- Bản sửa giữ nguyên đoạn có `<img>` trong phép gộp đoạn trống.
- d06 trong app thật sau sửa: model có 91 shape (`rectangle`: 37, `line`: 54), DOM có 1 PNG nhập; thanh trạng thái báo 3 trang.
- Bản lưu d06: nguồn/lưu có 1/1 media; có 1 `pic:pic` trong `wp:anchor`; `a:blip r:embed="rId36"` phân giải tới `word/media/vno_passthrough_37.png`, part tồn tại và có 176,542 bytes như nguồn.

## IMPLEMENTATION SUMMARY

Thêm guard cho ảnh inline trước logic nhận diện paragraph rỗng ở `_collapseFloatOnlyParagraphBreaks`. Thêm unit regression test dùng HTML ảnh data URI và OOXML DrawingML picture anchor/relationship, xác nhận ảnh còn trong HTML nhập sau chuẩn hóa.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/unit/writer-floating-image-import.test.js`
- `docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R3.md`

## COMMANDS RUN

- Đặt `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex'` trước mỗi lần chạy app/harness.
- Baseline main: `git worktree add ..\VNOffice-codex-d06-baseline main --detach`; chạy `_batch_writer.py` cho d06; đếm ZIP parts/XML; sau đó `git worktree remove E:\VNOffice-codex-d06-baseline`. Baseline findings được commit riêng trước sửa code.
- d06 sau sửa: `_batch_writer.py` bằng worktree hiện tại; Word COM kiểm tra mở, đếm `InlineShapes`/`Shapes` và xuất PDF bằng `ExportAsFixedFormat`.
- Batch: `_batch_writer.py` cho d01–d24, bỏ d10; output tại `E:\VNOffice-profiles\codex\writer-shape-import-b3-batch`.
- `node --input-type=module -e ... runWriterFloatingImageImportTests()`; `node tests/run-tests.js` foreground; `git diff --check`.
- Không dùng `ComputeStatistics` để đo trang.

## BUILD RESULT

NOT RUN — thay đổi chỉ ở Writer adapter JavaScript, không có build riêng trong quy trình dự án.

## TEST RESULTS

- Unit Writer floating-image: PASS, gồm test mới giữ ảnh DrawingML inline qua chuẩn hóa; các test còn lại trong module cũng PASS.
- `node tests/run-tests.js`: PASS, `1836/1836`, `0 FAIL`.
- d06 desktop open/save: PASS (`loaded=True`); canvas 3 trang; 37 rectangle + 54 line; một PNG hiện trong DOM.
- d06 DOCX package: PASS — 1 media part; picture nằm trong anchor; `r:embed` có relationship hợp lệ tới media part tồn tại; bytes ảnh 176,542 bằng nguồn.
- Word COM: PASS — mở không lỗi; `InlineShapes=0`, `Shapes=139`; PDF qua `ExportAsFixedFormat` có 3 trang.
- Batch d01–d24 bỏ d10: PASS, 23/23 file mở và lưu; canvas pages khớp Word PDF oracle 23/23; media không file nào giảm. Cặp nguồn/lưu theo thứ tự d01…d09, d11…d24: `0/0, 0/0, 0/0, 2/2, 0/0, 1/1, 0/0, 1/1, 0/11, 0/0, 0/0, 1/1, 0/0, 2/2, 1/1, 0/0, 2/2, 1/1, 1/1, 11/11, 0/0, 0/0, 139/139`.
- `git diff --check`: PASS.

## KNOWN FAILURES

- d09 có 0 media nguồn và 11 media bản lưu. Không có media bị giảm; batch canvas/pages và save đều đạt. Phân tích riêng nguồn của 11 ảnh xuất thêm chưa nằm trong scope vòng này.
- d10 tiếp tục bị loại theo quy ước bộ mẫu.

## RISKS

- Guard giữ nguyên paragraph có ảnh trong khi xử lý hai `<br>`; khoảng ngắt dòng quanh inline image được giữ như HTML nhập.
- Không có patch LibreOffice Core, dependency mới hoặc chỉnh sửa định dạng nguồn.

## DEPENDENCIES/BLOCKERS

Không có.

## CORE PATCH ID (if any)

None.

## NEXT ACTION

Review commit trên nhánh này; không merge hoặc rebase trong task này.
