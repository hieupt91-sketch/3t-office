# HANDOFF — Writer Shape Import Defect B, vòng 2

TASK: Khôi phục DrawingML Rectangle và Straight Connector khi nhập DOCX vào Writer
AGENT/ROLE: Codex / Writer adapter
BRANCH: `fix/writer-shape-import-defectb-codex-r2`
WORKTREE: `E:\VNOffice-codex-writer-shape-import-b2`
OBJECTIVE: Chọn DrawingML Choice thay cho VML Fallback, phục hồi shape vào canvas bằng renderer Writer có sẵn, giữ tên OOXML khi lưu.

## FINDINGS

- d06 có 59 `mc:AlternateContent`: 56 choice `Requires="wps"` và 3 choice `Requires="wpg"` chứa group. Parser bỏ qua toàn bộ `mc:Fallback`, vì 54 VML line là bản tương thích của DrawingML line, không phải shape bổ sung.
- 3 group `Requires="wpg"` cần đọc `wps:wsp` con để khôi phục tổng 37 Rectangle + 54 Connector. Đây là ngoại lệ có phạm vi hẹp so với quy tắc chỉ `Requires="wps"`; bỏ chúng làm thiếu shape.
- Có một `a:prstGeom prst="rect"` trong `pic:spPr` của `Picture 4`, nằm trong anchor ngoài AlternateContent. Đây là khung hình học của ảnh, không phải `wps:wsp` Rectangle. LibreOffice HTML đã mang ảnh vào canvas; không tạo thêm rectangle chồng lên ảnh.
- Handoff vòng 1 ghi chưa có implementation, do đó không có phép đo canvas “before” sau khi mở file thật.

## IMPLEMENTATION SUMMARY

`writer-adapter.js` chọn choice DrawingML, bỏ VML fallback, đọc `wps:wsp` rect/line trực tiếp và chuyển về model `this.shapes`. Group geometry áp dụng `chOff/chExt`; tọa độ neo ghép với đoạn văn canvas tương ứng. Tên `wp:docPr` được giữ trong metadata shape và ưu tiên làm tên shape; các phần tử con group còn dùng tên `wps:cNvPr` riêng. `_renderShapes` và `renderShapeSvg` hiện có được tái dùng; line nhập từ DOCX vẽ theo đường chéo để thể hiện extents/flip.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/writer-illustrations.js`
- `docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R2.md`

## COMMANDS RUN

- Đọc brief vòng 2 và handoff vòng 1.
- `$env:LOCALAPPDATA = 'E:\VNOffice-profiles\codex'`; giải nén và kiểm tra `word/document.xml` của d06.
- Mở d06 qua app thật, đo canvas: 37 `rectangle`, 54 `line`; status canvas = 3 trang.
- Chạy `scripts/layout-audit/_batch_writer.py` với d01–d24, bỏ d10 hỏng: 23/23 file mở, lưu bản thử nghiệm thành công; Word oracle và canvas khớp trang 23/23. Các bản lưu ở `E:\VNOffice-profiles\codex\writer-shape-import-defect-b-r2`.
- Chạy `node tests/run-tests.js` foreground: 1835/1835 PASS sau mọi chỉnh sửa cuối cùng.
- Chạy `git diff --check`: PASS.

## BUILD RESULT

NOT RUN — không có build riêng được yêu cầu hoặc cần thiết cho thay đổi adapter JS.

## TEST RESULTS

- DOCX thật d06: canvas hiển thị 37 Rectangle và 54 Connector; canvas 3 trang, Word oracle batch 3 trang.
- Bộ 23 DOCX hợp lệ: 23/23 canvas pages = Word pages; mọi file tải và lưu bản thử nghiệm được. d10 bị loại theo quy ước bộ mẫu.
- `node tests/run-tests.js`: 1835/1835 PASS, lần chạy cuối sau chỉnh sửa.
- Kiểm tra Word COM độc lập dùng `ComputeStatistics` trả d06 = 5 trang, khác oracle của harness (3). Handoff dùng oracle batch sẵn có của dự án; nguyên nhân sai khác COM chưa xác định.

## KNOWN FAILURES

- Batch save thử nghiệm cho d06 ghi nhận media `1/0` (nguồn/bản lưu); chưa xác định nguyên nhân và không kiểm chứng đây là hồi quy. Việc sửa tập trung vào chiều nhập và canvas.
- Không có phép so sánh pixel trực tiếp vị trí mọi shape với Word; vị trí được dựng từ OOXML anchor/group và kiểm tra d06 trên app thật.
- Geometry rect của `Picture 4` không tạo shape Rectangle độc lập để tránh vẽ shape thứ hai lên ảnh; vì vậy canvas count là 37 Rectangle + 54 Connector, không phải 38 Rectangle độc lập.

## RISKS

- Các choice `Requires="wpg"` được hỗ trợ do ba group thật của d06 cần thiết để đạt 37/54; choice có Requires khác vẫn bị bỏ qua.
- Group được trải thành các shape canvas riêng; nhóm gốc không còn là một đối tượng nhóm tương tác.
- Kết quả vị trí/kích thước group cần kiểm chứng thị giác sâu hơn nếu có báo cáo lệch ở file khác.

## DEPENDENCIES/BLOCKERS

Không có blocker cho parser, renderer hoặc ma trận 23 file. Suite foreground cuối đã PASS.

## CORE PATCH ID (if any)

None.

## NEXT ACTION

Rà `git diff --check` và commit với tiền tố `fix(writer): W-shapeimport-b2`.
