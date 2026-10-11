# Brief R11 (opencode) — Đo chiều "mở DOCX thật → sửa → lưu → Word 2016 mở lại" cho 23 file, gom lớp lệch. CHỈ ĐO, KHÔNG SỬA CODE SẢN PHẨM

Đọc trước: `docs/QUY-UOC-DOI-CHIEU.md` (mục Bộ đo chuẩn, W7), `scripts/layout-audit/_batch_writer.py`,
`scripts/layout-audit/_word_oracle3.ps1`, `docs/TASK-QUEUE.md` (trạng thái 21/9).

Chiều nhập (24 docx) và chiều tạo mới đã có số. Chiều **lưu lại tài liệu đã mở** (người dùng mở hợp đồng, sửa vài chữ,
lưu, gửi đối tác mở bằng Word) chưa có số trên main hiện tại. Việc của bạn là đo và báo cáo trung thực.

## Bước 1 — Chạy bộ đo

- Worktree của bạn: `E:\VNOffice-opencode-writer-r11` (branch `audit/writer-saveback-r11`, tách từ main).
- **Trước khi chạy app**: `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"` (tạo thư mục nếu chưa có) trong CÙNG
  phiên PowerShell chạy python — để soffice/WebView2 dùng profile riêng, không tranh với agent khác. Không chạy 2 phiên
  `_batch_writer.py` song song.
- Lệnh: `python scripts/layout-audit/_batch_writer.py . "E:\VN OFice\file test\landocx" _saveback` (mẫu nằm ở main,
  ngoài git; worktree của bạn không có thư mục này) với danh sách tên
  `d01.docx … d24.docx` **trừ d10.docx** (Word báo file hỏng, bộ đo treo). Chạy theo từng nhóm 4–5 file để nếu treo thì
  biết file nào; ghi log từng lần chạy.
- Kết quả: `_saveback/_batch_writer_report.md` (Word gốc / canvas / bản lưu: số trang; ZZ có mặt; paras/sect/br/anchors/tables).

## Bước 2 — Gom lớp (bảng trong `docs/HANDOFF-WRITER-SAVEBACK-R11.md`)

Với mỗi file: (a) bản lưu mở được trong Word? (b) số trang bản lưu so với Word gốc (lệch bao nhiêu); (c) chữ "ZZ" còn?
(d) paras/sect/br/anchors/tables của bản lưu so với gốc (giải nén DOCX gốc và bản lưu, so `word/document.xml`).
Gom theo LỚP nguyên nhân, ví dụ: mất ngắt mục (`sect` giảm), mất ngắt trang (`br` giảm), mất ảnh neo (`anchors`
giảm), bảng mất/đổi (`tables`), header/footer mất (`word/header*.xml` thiếu), font run đổi (đếm `w:rFonts` khác
gốc), numbering đổi (`numbering.xml` khác). Mỗi lớp: số file bị, ví dụ 1–2 file (chỉ ghi d01..d24), bằng chứng là số
đếm thật từ XML — không suy đoán.

## Ràng buộc

- KHÔNG sửa code sản phẩm; chỉ được sửa `_batch_writer.py` nếu nó treo/sai và phải nói rõ sửa gì.
- Mọi con số trong handoff là output thật (dán bảng `_batch_writer_report.md` nguyên văn). Không bịa. Nếu file nào
  không chạy được, ghi "không đo được + lý do".
- Không commit `file test`, không commit `_saveback/` (thêm vào .gitignore nếu cần), không ghi tên tài liệu thật.
- Kết thúc: commit `docs/HANDOFF-WRITER-SAVEBACK-R11.md` (`git commit -F`, tiếng Việt không dấu).
