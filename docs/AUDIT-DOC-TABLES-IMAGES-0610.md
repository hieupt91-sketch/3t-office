# Audit VN Writer: bảng và hình ảnh — 06/10/2026

Phương pháp: chạy Writer qua `tests/live/cdp/session.mjs`, thao tác qua CDP/command bus, lưu DOCX bằng `globalUnoBridge.saveRealFileInPlace`, đọc `word/document.xml` bằng Python `zipfile` + ElementTree, sau đó mở lại đúng tệp DOCX qua `launchApp('writer', { filePath })`. Không dùng SendKeys/input hệ điều hành, không dùng Word COM.

Tổng: PASS 18 / FAIL 0 / BLOCKED 4.

| Hạng mục | Trạng thái | Bằng chứng đo được |
|---|---|---|
| Chen bang 3x4 | PASS | {"rows":3,"cols":4} |
| Nhap chu vao o | PASS | "Bang dauTiêu đề\tTiêu đề\tTiêu đề\tTiêu đề\nDữ liệu\tDữ liệu\tDữ liệu\tDữ liệu\nDữ liệu\tDữ liệu\tDữ liệu\tDữ liệu" |
| Lenh writer.table.insertRowBelow | PASS | 4 |
| Lenh writer.table.deleteRow | PASS | 3 |
| Lenh writer.table.insertColRight | PASS | 5 |
| Lenh writer.table.deleteCol | PASS | 4 |
| Lenh writer.table.mergeCells -> span | PASS | {"colSpan":2,"cells":3} |
| Lenh writer.table.splitCells | PASS | {"cells":3,"colSpan":1} |
| Giu o da gop de xac minh DOCX | PASS | 2 |
| writer.table.cellBg | PASS | "rgb(18, 171, 52)" |
| writer.table.borders | PASS | "1px solid rgb(148, 163, 184)" |
| Can le doc trong o | PASS | "middle" |
| Rong cot | PASS | ["180px","90px","90px","90px"] |
| Hang tieu de lap | PASS | "vno-table-header-row" |
| Chen PNG qua writer.image.insert | BLOCKED | {"image":null,"inputCaptured":true,"fileInputConnected":true,"fileInputNodeFound":false,"reason":"CDP khong lay duoc DOM node cua input file do lenh mo native picker; khong the cap file bang DOM.setFileInputFiles de tiep tuc."} |
| Doi kich thuoc anh | BLOCKED | "BLOCKED phu thuoc ket qua chen anh bi chan boi native picker." |
| Hoan tac thay doi kich thuoc | BLOCKED | "BLOCKED phu thuoc thao tac resize anh." |
| Luu DOCX | PASS | {"result":"ok","bytes":5901} |
| DOCX bang: w:tbl/tr/tc va w:gridSpan/w:vMerge | PASS | {"tables":1,"rows":3,"cells":11,"gridSpan":1,"vMerge":0,"logicalCells":12} |
| DOCX bang: w:shd, w:tcBorders, w:vAlign, w:tblHeader | PASS | {"shd":4,"tcBorders":11,"vAlign":10,"tblHeader":1} |
| DOCX anh drawing va kich thuoc EMU (+-2%) | BLOCKED | {"drawings":0,"inline":0,"anchor":0,"extent":[],"reason":"BLOCKED do khong chen duoc PNG qua native picker trong CDP."} |
| Mo lai DOCX bang luong mo tep that | PASS | {"tables":1,"rows":3,"cells":4,"images":0,"text":true,"source":"C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-table-image-OJF6l5\\writer-tables-images.docx"} |

Tệp DOCX tạm dùng để kiểm tra nằm trong thư mục tạm của hệ điều hành; xóa cùng vòng đời môi trường.

## Agent handoff

- **TASK / AGENT / BRANCH / WORKTREE:** D15a; Codex; `test/doc-tables-images-codex`; `E:\VNOffice-codex-d15a`.
- **OBJECTIVE:** Xác minh chức năng bảng/ảnh Writer và khả năng lưu/mở lại DOCX.
- **FINDINGS:** Lượt audit đạt PASS 18, FAIL 0, BLOCKED 4. Bằng chứng XML gồm 1 `w:tbl`, 3 `w:tr`, 11 `w:tc` + 1 `w:gridSpan` (12 ô logic), `w:shd` 4, `w:tcBorders` 11, `w:vAlign` 10, `w:tblHeader` 1; tệp mở lại có 1 bảng và đúng văn bản. `w:vMerge` đo được 0.
- **IMPLEMENTATION SUMMARY / FILES CHANGED:** Thêm script audit CDP và báo cáo này; không sửa mã sản phẩm. Ảnh bị BLOCKED vì CDP không lấy được DOM node của file input do lệnh `writer.image.insert` tạo ra, nên các kiểm tra resize/undo và OOXML drawing phụ thuộc ảnh cũng BLOCKED; chưa có bằng chứng để kết luận lỗi sản phẩm.
- **COMMANDS RUN:** `node --experimental-websocket scripts/audit-0610/doc_tables_images_check.mjs`.
- **BUILD RESULT:** NOT RUN (không đổi mã ứng dụng).
- **TEST RESULTS:** PASS 18 / FAIL 0 / BLOCKED 4; báo cáo chi tiết ở bảng phía trên.
- **KNOWN FAILURES / RISKS:** Chưa xác minh được luồng nạp ảnh từ hộp chọn tệp gốc bằng CDP; cần expose file input qua DOM hoặc cung cấp seam kiểm thử CDP để tiếp tục mà không dùng input hệ điều hành.
- **DEPENDENCIES/BLOCKERS:** CDP `DOM.setFileInputFiles` cần node ID truy cập được cho input file.
- **CORE PATCH ID:** Không áp dụng.
- **NEXT ACTION:** Bổ sung cách kiểm thử ảnh qua CDP; sau đó chạy lại các mục ảnh và kiểm tra XML drawing/EMU.
