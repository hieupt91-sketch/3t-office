# TICKET FIX-T8 — Doc: doi chieu song song voi WORD THAT cho cac nhom con lai (Codex)  [Word lam chuan; chu so huu 11/10]
Khung: scripts/audit-0610/word_parallel/ (make-template.ps1, app-ops.desktop.mjs, word-compare.ps1; docs/AUDIT-DOC-WORD-PARALLEL-1011.md da co nhom Trang dau + cot trang). Word COM sua + doc day du. Lam TUNG NHOM (moi nhom: template do Word tao co noi dung phu hop -> app ap thao tac bang chuot/phim tat that -> luu DOCX that -> Word COM ap CUNG thao tac -> doc thuoc tinh -> bang KHOP/LECH trong docs/AUDIT-DOC-WORD-PARALLEL-1011.md; LECH that -> sua nho nhat + test; kiem DOCX d01,d07,d13,d20,d24 khong doi; VNO_APP_ROOT=<worktree>):
 1. BANG: chen bang NxM, them/xoa hang/cot, gop/tach o, can le o (tren/giua/duoi x trai/giua/phai), to nen o, vien (tat ca/ngoai/trong), dong tieu de lap lai, tu dong vua noi dung/cua so, do cao hang/rong cot (Word: Table.Rows(i).Height, Columns(j).Width, Cell.Shading, Borders). 
 2. BO CUC TRANG: le (Normal/Narrow/Moderate/Wide), huong, kho giay (A4/Letter/A5), cot, ngat trang, ngat muc (trang ke/lien tuc), tieu de/chan trang, trang dau khac, so trang (PageSetup.*; Sections).
 3. KIEU (Heading 1-3, Normal, Title, Quote): Style cua Paragraph (Word: Paragraph.Style.NameLocal, Font, SpaceBefore/After, OutlineLevel), muc luc tu dong (TablesOfContents.Count, Range text), chu thich trang/cuoi (Footnotes.Count, Text, Reference), tham chieu cheo, danh muc hinh (Captions).
 4. Ghi chu (Comments: Author, Scope, Text, Done), Theo doi thay doi (Revisions: Type, Author, Range.Text), Tim/Thay the (Find.Execute ket qua), Ky hieu/Chen ky tu dac biet (Range.Text ky tu), Hop van ban/Hinh khoi/Hinh anh (Shapes: Type, Width, Height, WrapFormat).
Quy trinh/CAM/TIET KIEM TOKEN: nhu TICKET-FIX-T1.md; COMMIT SAU MOI NHOM; Word COM chi instance cua ban, ket thuc theo PID; KHONG gui noi dung tai lieu ra AI/cloud. Worktree E:\VNOffice-codex-ft8 nhanh audit/doc-office-parity-2-codex tu main. npm test + python unittest + batch docx. Bao cao 3 dong.

## Kết quả theo nhóm (đang tiếp tục lần lượt)

### Nhóm 3 — Heading 1–3 — 11/10/2026
1. App desktop: tài liệu mới, thao tác gõ/chọn/áp kiểu bằng CDP chuột và bàn phím; lưu DOCX và chụp ảnh tại `E:\VNOffice-profiles\codex-ft8\heading-run-09\heading-t8-before.png`.
2. Word COM: sau mở lại, cả hai DOCX khớp Calibri Light, 16/13/12 pt, không đậm, màu theme, spacing 12/2/2–0 pt, outline 1/2/3 và căn trái.
3. Sửa chỉ áp cho tài liệu mới; DOCX nhập không đổi. Hướng dẫn F1 + tooltip VI/EN cập nhật; test Python 4/4 và heading/help 4/4 PASS. Commit riêng nhóm 3.

### Nhóm 4 — Hộp văn bản — 11/10/2026
1. App desktop: Chèn > Văn bản > Hộp văn bản, gõ bằng CDP keyboard thật, lưu DOCX; ảnh `E:\VNOffice-profiles\codex-ft8\textbox-run-05\textbox-t8-before.png`.
2. Word COM: cùng shape type 17; sau lưu cả hai DOCX có 53.6×19.5 pt, AutoSize=0, lề 7.2/3.6 pt và OOXML extent/bodyPr khớp.
3. Đổi khung mặc định 220×80 thành 125.47×45.6 CSS px, kích thước phân số xuất theo pt, lề Word khớp. Help/i18n VI/EN cập nhật; test Python 6/6, JS 2/2 PASS. Commit riêng nhóm 4.

### Nhóm 5 — Kiểu và tham chiếu
1. CDP áp dụng Normal/Title/Quote, sửa và cập nhật TOC, thêm footnote/endnote, cross-reference và danh mục hình; ảnh `references-run-07`/`captions-run-08`.
2. Word COM đọc TOC đã cập nhật, note content, 1 REF/bookmark và ToF với 2 SEQ caption; cấu trúc references khớp.
3. Sửa caption thành native Word SEQ/Caption và ToF; regression Python 4/4 PASS. Gallery Normal/Title/Quote giữ format đặc thù VN; Help/i18n hiện có.

### Nhóm 6 — Ghi chú
1. CDP tạo 2 comment, điều hướng, resolve Alpha và xóa Beta; ảnh `comments-run-01/comments-t8-before.png`.
2. Word COM thao tác tương đương; cả hai DOCX sau lưu có một comment, cùng Author/Scope/Text và `Done=True`.
3. Điều hướng, resolve, delete **KHỚP**; Help F1/i18n đã có. Chỉnh sửa comment chưa được kiểm tra vì hiện chưa có thao tác UI.

### Nhóm 7 — Theo dõi thay đổi
1. CDP bật theo dõi, thêm/xóa text, Next, Accept One, Reject All; ảnh `track-run-02/track-changes-t8-before.png`.
2. Word COM đọc hai revision tương đương: delete `beta` Type 2, insert ` added` Type 1, Author `3T Office`.
3. Count và thao tác chấp nhận/từ chối khớp. Help/i18n hiện có; chế độ hiển thị và tác giả tùy chỉnh chưa kiểm tra.

### Nhóm 8 — Tìm/Thay thế
1. CDP thử Match Case/Whole Word, Find Previous và Replace One; ảnh `find-run-04/find-replace-t8-before.png`.
2. Word COM cho kết quả cùng và Replace One `hoang`→`Hoang`; DOCX mở lại có nội dung khớp.
3. Sửa reset state khi thay option và Previous wrap-around trong cùng đoạn; Help F1/i18n hiện có.

### Nhóm 9 — Ký hiệu
1. CDP chọn ©, ₫, ∑, → từ các nhóm ký hiệu; ảnh `symbols-run-10/symbols-t8-before.png`.
2. Word COM lưu cùng chuỗi; nội dung hai DOCX mở lại đều là `Audit symbols:©₫∑→`.
3. Vị trí/ký tự **KHỚP**; hướng dẫn F1 tiếng Việt và i18n đã có.
