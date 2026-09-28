# HANDOFF — Writer Shape Import Defect B, vòng 4 findings

TASK: Xác định chính xác đường đi gây xuất trùng shape DrawingML khi lưu DOCX
AGENT/ROLE: Codex / Writer adapter
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Ghi nhận nguyên nhân hồi quy vòng 2 trước khi thay đổi mã.

## FINDINGS

- `open()` gọi `_normalizeImportedHtml(...)`; trong đó `_ooxmlImportedBasicShapes(ooxmlDocumentXml, page)` đọc từng `wps:wsp` hỗ trợ được (rectangle/line) từ `wp:anchor` và trả về model shape có `imported: true`.
- `open()` gán toàn bộ kết quả vào `this.shapes`, rồi `_renderShapes()` dựng chúng lên canvas. Vì vậy danh sách này vừa là projection hiển thị của DrawingML đầu vào, vừa bị coi như danh sách shape do ứng dụng quản lý.
- Khi serialize HTML lưu, `_build...` xuất `shapesHtml` từ **mọi** phần tử `this.shapes` thành SVG/textbox HTML tuyệt đối (đoạn quanh `_isOpenedDocumentPristine()` và `fullHtml`). HTML đó đi qua luồng LibreOffice HTML→DOCX. DrawingML shape được LibreOffice giữ qua đường nhập/lưu tài liệu gốc; SVG/textbox do VN Writer dựng từ model lại được LibreOffice chuyển thành DrawingML mới. Hai đường cùng ghi vào tài liệu nên shape nhập hiện diện hai lần.
- Lỗi nằm ở việc serialize danh sách `this.shapes` không phân biệt imported projection chưa sửa với shape native/đã sửa. Không cần thiết kế sao chép byte từ file nguồn; cần quản lý trạng thái nguồn shape và chỉnh sửa/xóa ở cùng một model để chỉ một đại diện được xuất.
- Bằng chứng được cung cấp cho vòng này: d06 gốc 91 `wps:wsp`/37 `wps:txbx`/60 `wp:anchor`/74 `w:txbxContent`/59 `AlternateContent`; bản main 79/34/47; bản b3 170/125/139/233/108. d09 gốc 30/15/30, main 30/15/45/—, b3 45/30/60/—. Các số b3 phù hợp với hai đường xuất; số anchor khác nhau một phần do cấu trúc tương thích/fallback và không thể quy toàn bộ chênh lệch chỉ cho shape đếm được.
- d09 có thêm 15 `pic:pic` theo dữ liệu được giao; đó là lỗi đã có trên main và không thuộc sửa chữa bắt buộc vòng này. Nguyên nhân riêng của chúng chưa được xác định.

## PLAN BEFORE CODE

- Objective: Giữ 37 Rectangle + 54 Connector trên canvas d06; không sửa thì loại projection imported khỏi serialize, sửa/di chuyển thì chỉ xuất đại diện mới một lần, xóa thì không khôi phục shape cũ.
- Current capability: DrawingML parser, `this.shapes`, renderer, HTML/SVG export và luồng LibreOffice save đã tồn tại; ưu tiên sửa trạng thái trong Writer adapter.
- Files/modules dự kiến: `adapters/libreoffice/writer/writer-adapter.js`; test unit Writer liên quan shape/import/export; có thể thêm test live/harness nếu có đường test hiện hữu; hai handoff vòng 4. Không đổi Platform/Core.
- Dependency: Không thêm.
- Risk: Phân biệt thao tác người dùng với render/import; không làm rơi shape khi undo/redo, move, delete; tránh hồi quy shape native. GIF d09 chỉ ghi nhận.
- Test plan: Unit không sửa/có sửa/di chuyển/xóa; app thật với `LOCALAPPDATA=E:\VNOffice-profiles\codex`; batch d01–d24 bỏ d10 và đối chiếu 4 bộ đếm + media với source/main; Word COM d06/d09, số Shapes so với gốc và trang bằng `_word_oracle3.ps1`; `node tests/run-tests.js` foreground; `git diff --check`.
- Rollback: Revert commit triển khai vòng 4 trên nhánh này; giữ commit findings làm hồ sơ chẩn đoán.

## COMMANDS RUN

- Đọc đường import `_normalizeImportedHtml` → `_ooxmlImportedBasicShapes` → `open()` → `_renderShapes` và đường serialize `this.shapes` → `shapesHtml` → LibreOffice HTML→DOCX.
- Chưa chạy app hoặc test ở bước findings.

## TEST RESULTS

- Nguyên nhân đường đi: xác nhận bằng code inspection.
- Số liệu DOCX: do người giao việc cung cấp; chưa tự tái đo ở bước này.
- Tests/build: NOT RUN (chưa sửa mã).

## NEXT ACTION

Commit findings riêng trước khi sửa code; sau đó triển khai model/serialize có trạng thái imported và regression tests.
