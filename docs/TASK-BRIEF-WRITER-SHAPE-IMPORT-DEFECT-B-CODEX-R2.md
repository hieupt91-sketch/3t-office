# TASK BRIEF — Writer nhập lỗi B, vòng 2 (Codex): mơ hồ VML/DrawingML ĐÃ ĐƯỢC GIẢI ĐÁP, tiến hành sửa

Worktree: `E:\VNOffice-codex-writer-shape-import-b2` (nhánh `fix/writer-shape-import-defectb-codex-r2`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge.

## Bối cảnh
Vòng 1 (`docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B.md`, đã có trong worktree) dừng đúng lúc vì phát hiện d06 có CẢ DrawingML (`wps:wsp`/`a:prstGeom`) VÀ VML (`v:line`) cho cùng shape, lo ngại đếm trùng. **Claude đã xác minh trực tiếp bằng script Python và GIẢI ĐÁP xong mơ hồ này — không cần điều tra lại:**

- **100% các `<v:line>` (54 cái) đều nằm trong `<mc:Fallback>`**, đi kèm 1-1 với `<mc:Choice Requires="wps">` chứa DrawingML tương ứng. Đây là mẫu tương thích ngược CHUẨN của Word (ghi cả 2 dạng, reader mới đọc `mc:Choice`, reader cũ đọc `mc:Fallback`) — **KHÔNG PHẢI 2 shape khác nhau, chỉ là 1 shape ghi 2 cách**. Quy tắc: **CHỈ đọc `mc:Choice` (DrawingML), BỎ QUA HOÀN TOÀN mọi thứ trong `mc:Fallback` (VML)**.
- Đếm chính xác trong `mc:Choice`: **37 `a:prstGeom prst="rect"`** (khớp đúng "37 Rectangle" báo cáo gốc) và **54 `a:prstGeom prst="line"`** (khớp đúng "54 Connector"). Không cần xử lý group phức tạp cho 2 số này — đây là tổng đã đúng.
- Có đúng **1 `wp:anchor` nằm NGOÀI mọi `mc:AlternateContent`** (không có VML fallback đi kèm) — cũng chứa 1 `a:prstGeom prst="rect"`. Xử lý case này bằng quy tắc đơn giản: nếu không có `mc:AlternateContent` bọc ngoài, đọc thẳng anchor đó (không cần bỏ qua).
- Có 3 `wpg:wgp` (group) trong document — có thể lồng bên trong `mc:Choice` của một vài anchor; khi implement, đọc phần tử `wps:wsp` bên trong group bình thường (group chỉ là container vị trí tương đối, không đổi bản chất bộ đếm 37/54 đã xác nhận đúng ở trên).

## Cách làm
1. Trong `writer-adapter.js`, khi nhập DOCX: với mỗi `wp:anchor`, nếu có `mc:AlternateContent` bọc ngoài → chỉ lấy nội dung trong `mc:Choice[@Requires="wps"]`, bỏ hẳn `mc:Fallback`. Nếu không có `mc:AlternateContent` → lấy thẳng anchor.
2. Từ `wps:wsp`/`a:prstGeom`, phân loại `prst="rect"` → Rectangle, `prst="line"` → Straight Connector (dùng đúng cơ chế vẽ shape hiện có cho triangle/diamond/floating frame — tái dùng, không viết renderer mới).
3. Giữ `wp:docPr name=` gốc cho round-trip lưu (không phá lỗi lưu vừa sạch ở R13).
4. Đo lại d06 thật: canvas phải có đủ 37 Rectangle + 54 Connector (+ 1 rect ngoài AlternateContent = 38 rect tổng nếu tính cả, xác nhận rõ số cuối cùng trong handoff) ở đúng vị trí/kích thước (dung sai như các shape khác đã làm, ví dụ triangle/diamond).
5. Chạy lại toàn bộ 23 file .docx hợp lệ — canvas = Word không được giảm so với mốc hiện tại, các shape khác đã đúng không được vỡ.

## Ràng buộc
Giữ nguyên như vòng 1: không sửa `apps/sheet/*`, `platform/ribbon/*`, `platform/commands/*`, `platform/i18n/*`, `platform/help/*`. `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"`. `node tests/run-tests.js` foreground trước mỗi commit. Commit tiền tố `fix(writer): W-shapeimport-b2 ...`. Không rebase/force, không commit tài liệu thật.

Nếu trong lúc làm phát hiện thêm biến thể thật sự KHÔNG khớp với quy tắc đã xác minh trên (ví dụ mc:Choice có Requires khác "wps", hoặc group tạo ra vị trí/kích thước sai lệch không giải thích được) — ghi rõ vào handoff, có thể dừng phần đó riêng, nhưng KHÔNG dừng toàn bộ task vì quy tắc chính (mc:Choice vs mc:Fallback) đã chắc chắn đúng.

## Bàn giao
`docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B-R2.md`: số Rectangle/Connector khôi phục được trên d06 (trước/sau), đo 23 file không hồi quy, kết luận trung thực.
