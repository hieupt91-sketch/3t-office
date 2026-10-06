# So vị trí ngắt trang từng đoạn: app và Word thật (06/10/2026)

**Phương pháp:** với 43 tài liệu mẫu (d10.docx loại vì Word không mở được), lấy trang bắt đầu của từng đoạn cấp cao nhất trong Word thật (COM) và trong app desktop (CDP), rồi so từng đoạn. Script: `scripts/audit-0610/doc_linebreak_vs_word.mjs` (Word: `word_paragraph_pages.ps1`). Dữ liệu thô: `E:\VNOffice-profiles\d26\doc-linebreak-vs-word.json` (không commit).

## Kết quả
- Tổng số trang: 43/43 khớp Word.
- Trang bắt đầu của từng đoạn: so 4327 đoạn, **4058 đoạn (93,8%) cùng trang với Word**, 269 đoạn (6,2%) lệch.
- Trong 269 đoạn lệch: **265 đoạn lệch đúng 1 trang** (177 đoạn app ở trang sau, 88 đoạn app ở trang trước); 4 đoạn lệch từ 2 trang trở lên (3 đoạn trống/ảnh neo của d24, 1 đoạn đầu hợp đồng của d07).
- 27/43 tài liệu có ít nhất một đoạn lệch. Nhiều nhất: d07 (65/523), d01 (31/254), d15 (30/173), legacy05 (25/290), legacy14 (25/382), d13 (22/198).

## Cách đọc
Các đoạn lệch tập trung thành từng cụm trên một ranh giới trang (ví dụ d07: 64 đoạn app trễ 1 trang, d01: 31 đoạn app sớm 1 trang, d15: 30 đoạn app trễ 1 trang). Nghĩa là mỗi tài liệu có khoảng một điểm ngắt khác Word (một dòng hoặc một khối vừa/không vừa trang), phần còn lại giữ nguyên. Tổng số trang vẫn khớp vì chỗ lệch được bù ở ranh giới kế tiếp.

## Chưa làm
- Chưa xác định nguyên nhân từng điểm lệch (chiều cao dòng, khoảng cách đoạn, bảng, ảnh nổi, chống góa/mồ côi). Các ca cần xem trước: d07 (đoạn đầu hợp đồng lệch 2 trang), d01 (ranh giới trang 6-7), d15.
## Chẩn đoán điểm lệch (Claude, 06/10 tối) — d01, d07, d15

Công cụ: `word_paragraph_ypos.ps1` + `app_paragraph_ypos.mjs` (toạ độ dọc từng đoạn), `word_table_rows.ps1` + `app_table_rows.mjs` + `compare_table_rows.ps1` (chiều cao từng hàng bảng, Word thật so với app).

**d01 (app sớm 1 trang từ trang 6):** bảng T1 (64 hàng) trải trang 1–5. Chiều cao khớp Word trong ±0,7 pt ở phần lớn hàng; sai lệch lớn nằm ở 3 hàng:
- Hàng 48 ("Tư vấn máy vi tính và quản trị hệ thống máy vi tính") và hàng 52 ("Hoạt động kiến trúc và tư vấn kỹ thuật có liên quan"): Word xuống 2 dòng (43,4 pt), app chỉ 1 dòng (26,4 pt) → app thiếu 17 pt mỗi hàng. Ô rộng 290,3 pt, chữ Times New Roman 13 pt; câu dài gần sát độ rộng ô nên Word (cộng dồn độ rộng ký tự theo số nguyên của GDI) xuống dòng còn trình duyệt thì chưa.
- Hàng 1 (tiêu đề bảng): Word 52,5 pt, app 78,2 pt (app cao hơn 25,7 pt).
- Hàng cao bị ngắt giữa trang: mô hình tràn hàng (W24c) khớp trong ~3 pt.
Tổng chênh lệch chiều cao các hàng cùng trang (app trừ Word) của d01 là -5,5 pt, nên hai hàng xuống dòng sai (-34 pt) bị bù một phần bởi hàng 1 (+25,7 pt). Chênh lệch ~127 pt giữa vị trí đoạn đầu trang 6 của app và Word (đo bằng toạ độ dọc) CHƯA giải thích được bằng các hàng cùng trang: phần còn lại nằm ở các hàng bị ngắt giữa trang (hàng 29, 43, 59) mà phép so này bỏ qua. Đây là điểm cần đo tiếp.

**d07 (app trễ 1 trang):** bảng T6 hàng 1 ("CÔNG TY / CỘNG HOÀ XÃ HỘI…"): Word 153,8 pt, app 135,6 pt (thiếu 18,2 pt, một dòng). Cùng họ nguyên nhân: Word xuống dòng nhiều hơn.

**d15:** bảng T2 hàng 1 Word 90,0 pt, app 30,2 pt; hàng 2 Word 122,3 pt, app 156,8 pt (hai hàng cộng lại app thấp hơn 25,3 pt). Cần xem riêng (nghi ô gộp hàng/ô nhiều dòng).

**Kết luận:** nguyên nhân chính là chênh lệch vị trí xuống dòng ở độ rộng sát giới hạn (Word dùng độ rộng ký tự nguyên theo GDI) và vài hàng tiêu đề bảng; mô hình phân trang bảng, khoảng cách đoạn và chiều cao dòng đã khớp. Việc kế tiếp (chưa làm): xác định hệ số độ rộng ký tự của Word cho Times New Roman 13 pt để app xuống dòng cùng chỗ (đã có biến `--vno-gdi-advance`, cần kiểm tra vì sao hai ô trên không được áp).
