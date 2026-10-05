# Audit roundtrip tài liệu: đối chiếu LibreOffice

Ticket D7 — phép đo thay thế vì Word COM bị hộp thoại ‘Word không phải chương trình mặc định’ chặn. Số trang Word thật chưa được đo; P0 là LibreOffice headless làm chuẩn đối chiếu. Corpus chỉ đọc; đầu ra trung gian được tạo trong thư mục tạm và xóa sau mỗi tài liệu.

- Tài liệu được chọn: 44; LibreOffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`.
- P0: số trang bản gốc; P1: số trang sau mở và lưu qua VN Writer; P2: số trang lượt mở, sửa qua CDP rồi lưu. Chênh ký tự = trị tuyệt đối phần trăm ký tự không phải khoảng trắng (bản gốc so với P1). PASS yêu cầu P1 = P0 và chênh ≤ 0,5%; P2 chỉ báo cáo.
- Tổng: PASS 42 / FAIL 1 / BLOCKED 1.

| Tên | P0 | P1 | P2 | Chênh trang (P1−P0) | Chênh ký tự % | Giây | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---|
| legacy01.doc | 5 | 5 | 5 | 0 | 0.000% | 150.5 | PASS |
| legacy02.doc | 4 | 4 | 4 | 0 | 0.036% | 158.6 | PASS |
| legacy03.doc | 4 | 4 | 4 | 0 | 0.000% | 147.9 | PASS |
| legacy04.doc | 11 | 11 | 11 | 0 | 0.000% | 163.5 | PASS |
| legacy05.doc | 7 | 7 | 7 | 0 | 0.000% | 178.7 | PASS |
| legacy06.doc | 3 | 3 | 3 | 0 | 0.000% | 147.5 | PASS |
| legacy07.doc | 4 | 4 | 4 | 0 | 0.000% | 165.1 | PASS |
| legacy08.doc | 7 | 7 | 7 | 0 | 0.000% | 166.9 | PASS |
| legacy09.doc | 1 | 1 | 1 | 0 | 0.000% | 151.9 | PASS |
| legacy10.doc | 2 | 2 | 2 | 0 | 0.000% | 143.0 | PASS |
| legacy11.doc | 1 | 1 | 1 | 0 | 0.000% | 145.7 | PASS |
| legacy12.doc | 4 | 4 | 4 | 0 | 0.000% | 144.0 | PASS |
| legacy13.doc | 1 | 2 | 2 | 1 | 0.044% | 144.9 | FAIL — P1 khác P0 |
| legacy14.doc | 15 | 15 | 15 | 0 | 0.000% | 166.9 | PASS |
| legacy15.doc | 2 | 2 | 2 | 0 | 0.000% | 147.3 | PASS |
| legacy16.doc | 4 | 4 | 4 | 0 | 0.000% | 151.1 | PASS |
| legacy17.doc | 3 | 3 | 2 | 0 | 0.000% | 148.0 | PASS |
| legacy18.doc | 3 | 3 | 2 | 0 | 0.000% | 146.7 | PASS |
| legacy19.doc | 3 | 3 | 3 | 0 | 0.000% | 163.5 | PASS |
| legacy20.doc | 1 | 1 | 1 | 0 | 0.000% | 170.4 | PASS |
| d01.docx | 20 | 20 | 20 | 0 | 0.000% | 150.6 | PASS |
| d02.docx | 11 | 11 | 11 | 0 | 0.000% | 147.5 | PASS |
| d03.docx | 1 | 1 | 1 | 0 | 0.000% | 141.3 | PASS |
| d04.docx | 5 | 5 | 5 | 0 | 0.000% | 156.2 | PASS |
| d05.docx | 2 | 2 | 2 | 0 | 0.000% | 135.5 | PASS |
| d06.docx | 3 | 3 | 3 | 0 | 0.000% | 147.2 | PASS |
| d07.docx | 23 | 23 | 23 | 0 | 0.000% | 138.6 | PASS |
| d08.docx | 1 | 1 | 1 | 0 | 0.000% | 131.5 | PASS |
| d09.docx | 14 | 14 | 14 | 0 | 0.000% | 153.1 | PASS |
| d10.docx | 1 | — | — | — | — | 28.4 | BLOCKED — RuntimeError: LibreOffice convert-to txt:Text rc=1: Could not find platform independent libraries <prefix> Error: Please verify input parameters... (SfxBaseModel::impl_store <file:///C:/Users/3TCOMP~1/AppData/Local/Temp/vno-corpus-audit-nrmllkni/text-original/d10.txt> failed: 0xc10(Error Area:Io Class:Write Code:16))  |
| d11.docx | 5 | 5 | 5 | 0 | 0.000% | 133.2 | PASS |
| d12.docx | 3 | 3 | 3 | 0 | 0.000% | 131.5 | PASS |
| d13.docx | 10 | 10 | 10 | 0 | 0.000% | 135.2 | PASS |
| d14.docx | 3 | 3 | 3 | 0 | 0.000% | 133.1 | PASS |
| d15.docx | 10 | 10 | 10 | 0 | 0.000% | 134.7 | PASS |
| d16.docx | 8 | 8 | 8 | 0 | 0.000% | 134.6 | PASS |
| d17.docx | 5 | 5 | 5 | 0 | 0.000% | 131.2 | PASS |
| d18.docx | 2 | 2 | 2 | 0 | 0.000% | 131.6 | PASS |
| d19.docx | 2 | 2 | 2 | 0 | 0.000% | 130.5 | PASS |
| d20.docx | 4 | 4 | 4 | 0 | 0.000% | 147.7 | PASS |
| d21.docx | 9 | 9 | 9 | 0 | 0.000% | 136.0 | PASS |
| d22.docx | 5 | 5 | 5 | 0 | 0.000% | 133.3 | PASS |
| d23.docx | 1 | 1 | 1 | 0 | 0.000% | 134.3 | PASS |
| d24.docx | 16 | 16 | 16 | 0 | 0.000% | 180.9 | PASS |

## Tài liệu FAIL cần xem lại (không sửa)

- `legacy13.doc`: P1 khác P0; nghi ngờ sai khác phân trang hoặc nội dung cần kiểm tra thủ công.

## BLOCKED

- `d10.docx`: RuntimeError: LibreOffice convert-to txt:Text rc=1: Could not find platform independent libraries <prefix> Error: Please verify input parameters... (SfxBaseModel::impl_store <file:///C:/Users/3TCOMP~1/AppData/Local/Temp/vno-corpus-audit-nrmllkni/text-original/d10.txt> failed: 0xc10(Error Area:Io Class:Write Code:16)) 
