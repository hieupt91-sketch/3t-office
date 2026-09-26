# TASK BRIEF — Writer nhập: khôi phục Rectangle/Connector bị mất hoàn toàn ở LO DOCX→HTML (lỗi B, R12)

Worktree: `E:\VNOffice-codex-writer-shape-import-b` (nhánh `fix/writer-shape-import-defectb-codex`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge.

## Bối cảnh — ĐỌC TRƯỚC
`docs/HANDOFF-WRITER-SAVEBACK-R12.md` và `docs/HANDOFF-WRITER-SAVEBACK-R13.md` (đã có sẵn trong worktree) đã chẩn đoán: file d06 có 37 Rectangle + 54 Straight Connector trong DOCX gốc, nhưng **mất hoàn toàn ngay từ tầng 1** (LibreOffice DOCX→HTML khi nhập) — Stage1 (LO import) đã là 0 Rectangle/0 Connector, không phải lỗi ở đường lưu. Một audit sâu hơn trước đó (`audit/writer-r13`, xem `git log --grep=Rectangle`) xác nhận thêm: **bộ lọc HTML của LibreOffice CHỈ xuất `pic:pic` (ảnh) thành `<img>`** — shape/VML/textbox không có đại diện nào trong HTML trung gian. Nghĩa là: không thể phục hồi Rectangle/Connector từ HTML trung gian (nó chưa từng có ở đó) — phải đọc trực tiếp DrawingML gốc (`wps:wsp`/`wp:anchor` chứa Rectangle, `<w:pict>`/VML connector) từ file DOCX nguồn và tự dựng lại, KHÔNG đi qua đường HTML.

Đây là lỗi CHIỀU NHẬP, thuộc `apps/writer` + `adapters/libreoffice/writer/writer-adapter.js`, KHÔNG phải lỗi lưu — R13 (Grok, vừa merge) đã cố tình bỏ qua lỗi này vì ngoài phạm vi save-back.

## Vị trí bắt đầu
`adapters/libreoffice/writer/writer-adapter.js` có sẵn pattern "W5 mở rộng" cho các trường hợp tương tự (LO HTML bỏ mất phần tử, phải đọc lại DOCX gốc và chèn bù) — xem các hàm liên quan tới `_normalizeImportedHtml`, các fix cho shape khác đã làm trước (triangle/diamond, floating frames, common shape types — tìm bằng `git log --grep="shape\|Shape" -i` để xem code mẫu). Tái dùng đúng pattern đó cho Rectangle (`wps:wsp` với `prstGeom prst="rect"`) và Straight Connector (`wps:cxnSp` hoặc `<w:pict><v:line>`/`<v:shape>` VML tuỳ phiên bản DOCX).

## Cách làm
1. Đo lại thật trên d06 (file test thật, `file test\landocx`) bằng công cụ đã có (`_import_drawing_loss.py` hoặc script tương đương nếu còn, hoặc viết script đo mới dùng `python-docx`/zipfile đọc trực tiếp `word/document.xml` + `word/drawings/*` để đếm Rectangle/Connector gốc) để xác nhận số lượng và vị trí (anchor, offset, size, z-order) thật của 37 Rectangle + 54 Connector.
2. Trong `writer-adapter.js`, khi nhập DOCX: đọc trực tiếp `wps:wsp`/`wp:anchor` (và VML tương đương nếu có) từ DOCX gốc cho các shape mà HTML trung gian không có đại diện, dựng lại dưới dạng phần tử canvas hiện có của app (SVG/absolute-positioned div — xem cách các shape khác như triangle/diamond đã render để tái dùng đúng cơ chế vẽ, không phát minh cơ chế mới).
3. Giữ đúng `wp:docPr name=` gốc (để round-trip nhận diện lại đúng shape khi lưu — không phá lỗi lưu vừa mới sạch ở R13).
4. Đo lại d06: số Rectangle/Connector trong canvas app phải khớp gốc (vị trí/kích thước lệch trong ngưỡng chấp nhận theo quy ước hiện có, không suy đoán — nếu chưa có ngưỡng, dùng cùng chuẩn "vị trí px, dung sai 1-2px" đã áp cho shape khác).
5. Chạy lại **toàn bộ 23 file .docx hợp lệ** để xác nhận không hồi quy (mốc canvas = Word 22/22 hoặc 23/23 hiện tại KHÔNG được giảm, các shape khác đã đúng KHÔNG được vỡ).

## Ràng buộc
- Không sửa `apps/sheet/*`, `platform/ribbon/*`, `platform/commands/*`, `platform/i18n/*`, `platform/help/*` (agy có thể đang dùng UI song song).
- Không đổi kết quả các quy tắc W-series đã khoá trong `docs/QUY-UOC-DOI-CHIEU.md`.
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước khi chạy app/soffice/Word COM.
- Không commit tài liệu thật, không đổi tên file trong `file test\`.
- Test bắt buộc trước mỗi commit: `node tests/run-tests.js` (foreground). Nếu lưu DOCX cần kiểm tra không vỡ, chạy thêm batch save-back 23 file như R13 đã làm.
- Commit tiền tố `fix(writer): W-shapeimport-b ...`. Không rebase/force.
- Nếu phát hiện việc này lớn hơn dự kiến (ví dụ cần refactor sâu cơ chế render canvas, hoặc DOCX có nhiều biến thể VML/DrawingML khác nhau ngoài dự kiến), dừng và ghi rõ vào handoff — đừng cố ép xong trong 1 vòng nếu không chắc đúng.

## Bàn giao
`docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B.md`: đo trước/sau trên d06 (số lượng + vị trí Rectangle/Connector), đo lại 23 file (không hồi quy), kết luận trung thực (nếu chỉ giải quyết được một phần — ví dụ Rectangle nhưng chưa Connector, hoặc ngược lại — nói rõ, đừng ép kết luận tích cực).
