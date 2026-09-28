# HANDOFF — Writer Shape Import Defect B, vòng 4 findings

TASK: Xác định chính xác đường đi gây xuất trùng shape DrawingML khi lưu DOCX
AGENT/ROLE: Codex / Writer adapter
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Ghi nhận nguyên nhân hồi quy vòng 2 trước khi thay đổi mã.

## FINDINGS

- `open()` gọi `_normalizeImportedHtml(...)`; trong đó `_ooxmlImportedBasicShapes(ooxmlDocumentXml, page)` đọc từng `wps:wsp` hỗ trợ được (rectangle/line) từ `wp:anchor` và trả về model shape có `imported: true`.
- `open()` gán toàn bộ kết quả vào `this.shapes`, rồi `_renderShapes()` dựng chúng lên canvas. Vì vậy danh sách này vừa là projection hiển thị của DrawingML đầu vào, vừa bị coi như danh sách shape do ứng dụng quản lý.
- Khi serialize HTML lưu, `_contentForExport()` xuất `shapesHtml` từ **mọi** phần tử `this.shapes` thành SVG/textbox HTML tuyệt đối. HTML đi qua LibreOffice HTML→DOCX và trở thành anchor/DrawingML mới.
- `main.py::_apply_native_export_postprocess()` sau đó gọi `postprocess_writer_docx(..., source_docx=...)`. Trong adapter này `_passthrough_writer_anchors()` khôi phục anchor DrawingML nguồn vào DOCX chuyển đổi; `_relocate_passthrough_anchors()` đặt chúng theo paragraph nguồn. Dạng catalogue pristine có short-circuit trả nguyên gói nguồn khi marker/điều kiện phù hợp, nhưng không bao quát đường save tạo số liệu hồi quy b3. Vì vậy hai đường gây bản trùng là: imported shape → `this.shapes` → HTML/SVG → anchor mới; đồng thời source DOCX → passthrough anchor → anchor DrawingML gốc.
- Căn nguyên nằm ở ranh giới adapter/postprocess: danh sách imported projection được xuất như nội dung mới trong khi postprocess vẫn phục hồi anchor nguồn. Lọc shape khỏi HTML xử lý save không đổi; move/edit/delete cần truyền trạng thái shape qua biên HTML→Python để postprocess không phục hồi anchor gốc tương ứng (hoặc cập nhật đúng anchor đó), và chỉ xuất một đại diện.
- Bằng chứng được cung cấp cho vòng này: d06 gốc 91 `wps:wsp`/37 `wps:txbx`/60 `wp:anchor`/74 `w:txbxContent`/59 `AlternateContent`; bản main 79/34/47; bản b3 170/125/139/233/108. d09 gốc 30/15/30, main 30/15/45/—, b3 45/30/60/—. Các số b3 phù hợp với hai đường xuất; số anchor khác nhau một phần do cấu trúc tương thích/fallback và không thể quy toàn bộ chênh lệch chỉ cho shape đếm được.
- d09 có thêm 15 `pic:pic` theo dữ liệu được giao; đó là lỗi đã có trên main và không thuộc sửa chữa bắt buộc vòng này. Nguyên nhân riêng của chúng chưa được xác định.

## PLAN BEFORE CODE

- Objective: Giữ 37 Rectangle + 54 Connector trên canvas d06; không sửa thì loại projection imported khỏi serialize, sửa/di chuyển thì chỉ xuất đại diện mới một lần, xóa thì không khôi phục shape cũ.
- Current capability: DrawingML parser, `this.shapes`, renderer, HTML/SVG export và luồng LibreOffice save đã tồn tại; ưu tiên sửa trạng thái trong Writer adapter.
- Files/modules dự kiến: `adapters/libreoffice/writer/writer-adapter.js`; `adapters/libreoffice/common/ooxml_zip_patch.py` và/hoặc `main.py` nếu cần truyền trạng thái sang postprocess; test adapter Python/JS hiện hữu; hai handoff vòng 4. Không đổi Platform/Core.
- Dependency: Không thêm.
- Risk: Phân biệt thao tác người dùng với render/import; không làm rơi shape khi undo/redo, move, delete; tránh hồi quy shape native. GIF d09 chỉ ghi nhận.
- Test plan: Unit không sửa/có sửa/di chuyển/xóa; app thật với `LOCALAPPDATA=E:\VNOffice-profiles\codex`; batch d01–d24 bỏ d10 và đối chiếu 4 bộ đếm + media với source/main; Word COM d06/d09, số Shapes so với gốc và trang bằng `_word_oracle3.ps1`; `node tests/run-tests.js` foreground; `git diff --check`.
- Rollback: Revert commit triển khai vòng 4 trên nhánh này; giữ commit findings làm hồ sơ chẩn đoán.

## COMMANDS RUN

- Đọc đường import `_normalizeImportedHtml` → `_ooxmlImportedBasicShapes` → `open()` → `_renderShapes`; đường serialize `this.shapes` → `shapesHtml` → LibreOffice HTML→DOCX; đường postprocess `main.py` → `postprocess_writer_docx` → `_passthrough_writer_anchors`/`_relocate_passthrough_anchors`.
- Chưa chạy app hoặc test ở bước findings.

## TEST RESULTS

- Nguyên nhân đường đi: xác nhận bằng code inspection.
- Số liệu DOCX: do người giao việc cung cấp; chưa tự tái đo ở bước này.
- Tests/build: NOT RUN (chưa sửa mã).

## NEXT ACTION

Findings cập nhật sau khi lần đầy đủ tuyến passthrough: commit `07f139c` mới ghi nhận inspection phía JS nên chưa đủ; tạo commit bổ sung chính xác trước khi sửa code.
