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