# D20 — Tái chạy corpus VN Writer trên nhánh hiện tại

- Phạm vi: 44 tài liệu `.doc`/`.docx`; P0/P1/P2 và chênh ký tự do LibreOffice; roundtrip/lưu Writer qua CDP tuần tự. Nguồn corpus chỉ đọc.
- Mốc trước: `docs/AUDIT-DOC-CORPUS-0610.md` — 42 PASS, 1 FAIL, 1 BLOCKED (mốc D18).
- Mốc sau D20: 42 PASS, 1 FAIL, 1 BLOCKED; chạy lại đủ 44/44 tài liệu tuần tự. `legacy13.doc` tái hiện FAIL cũ; `d10.docx` BLOCKED vì thực chất là PDF.
- Bộ đếm ký tự dùng `txt:Text (encoded):UTF8`; P0/P1/P2 vẫn đếm trang từ PDF LibreOffice. Tùy chọn `--report` lưu báo cáo tại đích riêng, không ghi đè báo cáo D7.

## Đối chiếu trước/sau từng tài liệu

| Tài liệu | Trước P0/P1/P2 | Trước kết quả | Sau P0/P1/P2 | Sau kết quả | Chênh ký tự sau |
|---|---|---|---|---|---:|
| legacy01.doc | 5/5/5 | PASS | 5/5/5 | PASS | 0.000% |
| legacy02.doc | 4/4/4 | PASS | 4/4/4 | PASS | 0.000% |
| legacy03.doc | 4/4/4 | PASS | 4/4/4 | PASS | 0.000% |
| legacy04.doc | 11/11/11 | PASS | 11/11/11 | PASS | 0.000% |
| legacy05.doc | 7/7/7 | PASS | 7/7/7 | PASS | 0.000% |
| legacy06.doc | 3/3/3 | PASS | 3/3/3 | PASS | 0.000% |
| legacy07.doc | 4/4/4 | PASS | 4/4/4 | PASS | 0.000% |
| legacy08.doc | 7/7/7 | PASS | 7/7/7 | PASS | 0.000% |
| legacy09.doc | 1/1/1 | PASS | 1/1/1 | PASS | 0.000% |
| legacy10.doc | 2/2/2 | PASS | 2/2/2 | PASS | 0.000% |
| legacy11.doc | 1/1/1 | PASS | 1/1/1 | PASS | 0.000% |
| legacy12.doc | 4/4/4 | PASS | 4/4/4 | PASS | 0.000% |
| legacy13.doc | 1/2/2 | FAIL — P1 khác P0 | 1/2/2 | FAIL — P1 khác P0 | 0.000% |
| legacy14.doc | 15/15/15 | PASS | 15/15/15 | PASS | 0.000% |
| legacy15.doc | 2/2/2 | PASS | 2/2/2 | PASS | 0.000% |
| legacy16.doc | 4/4/4 | PASS | 4/4/4 | PASS | 0.000% |
| legacy17.doc | 3/3/2 | PASS | 3/3/2 | PASS | 0.000% |
| legacy18.doc | 3/3/2 | PASS | 3/3/2 | PASS | 0.000% |
| legacy19.doc | 3/3/3 | PASS | 3/3/3 | PASS | 0.000% |
| legacy20.doc | 1/1/1 | PASS | 1/1/1 | PASS | 0.000% |
| d01.docx | 20/20/20 | PASS | 20/20/20 | PASS | 0.000% |
| d02.docx | 11/11/11 | PASS | 11/11/11 | PASS | 0.000% |
| d03.docx | 1/1/1 | PASS | 1/1/1 | PASS | 0.000% |
| d04.docx | 5/5/5 | PASS | 5/5/5 | PASS | 0.000% |
| d05.docx | 2/2/2 | PASS | 2/2/2 | PASS | 0.000% |
| d06.docx | 3/3/3 | PASS | 3/3/3 | PASS | 0.000% |
| d07.docx | 23/23/23 | PASS | 23/23/23 | PASS | 0.000% |
| d08.docx | 1/1/1 | PASS | 1/1/1 | PASS | 0.000% |
| d09.docx | 14/14/14 | PASS | 14/14/14 | PASS | 0.000% |
| d10.docx | 1/—/— | BLOCKED — RuntimeError: LibreOffice convert-to txt:Text rc=1: Could not find platform independent libraries <prefix> Error: Please verify input parameters... (SfxBaseModel::impl_store <file:///C:/Users/3TCOMP~1/AppData/Local/Temp/vno-corpus-audit-nrmllkni/text-original/d10.txt> failed: 0xc10(Error Area:Io Class:Write Code:16)) | 1/—/— | BLOCKED — Nguồn là PDF (header %PDF-), không phải DOC/DOCX; không thể roundtrip qua Writer. | — |
| d11.docx | 5/5/5 | PASS | 5/5/5 | PASS | 0.000% |
| d12.docx | 3/3/3 | PASS | 3/3/3 | PASS | 0.000% |
| d13.docx | 10/10/10 | PASS | 10/10/10 | PASS | 0.000% |
| d14.docx | 3/3/3 | PASS | 3/3/3 | PASS | 0.000% |
| d15.docx | 10/10/10 | PASS | 10/10/10 | PASS | 0.000% |
| d16.docx | 8/8/8 | PASS | 8/8/8 | PASS | 0.000% |
| d17.docx | 5/5/5 | PASS | 5/5/5 | PASS | 0.000% |
| d18.docx | 2/2/2 | PASS | 2/2/2 | PASS | 0.000% |
| d19.docx | 2/2/2 | PASS | 2/2/2 | PASS | 0.000% |
| d20.docx | 4/4/4 | PASS | 4/4/4 | PASS | 0.000% |
| d21.docx | 9/9/9 | PASS | 9/9/9 | PASS | 0.000% |
| d22.docx | 5/5/5 | PASS | 5/5/5 | PASS | 0.000% |
| d23.docx | 1/1/1 | PASS | 1/1/1 | PASS | 0.000% |
| d24.docx | 16/16/16 | PASS | 16/16/16 | PASS | 0.000% |

## legacy13.doc — chẩn đoán trang dư

- LibreOffice: tài liệu gốc P0=1 trang; DOCX Writer lưu P1=2, P2=2. Chênh ký tự sau đo lại: 0,000% (báo cáo trước: 0,044%).
- DOM khi mở `.doc`: 31 đoạn; ảnh nằm trong đoạn đầu, HTML kích thước 101×78 px. DOCX Writer lưu ảnh thành `wp:anchor` + `wrapSquare`, extent 958215×745490 EMU.
- DOCX được LibreOffice chuyển trực tiếp từ `.doc` cũng có một anchor `wrapSquare`, đúng extent ảnh và cùng trang A4 (11906×16838 twips); spacing đoạn và font Times New Roman cũng tương ứng. Không thấy bằng chứng ảnh bị co, đổi wrap, fallback font hoặc đổi khổ giấy gây thêm trang.
- Khác biệt cấu trúc nổi bật: đoạn đầu của DOCX chuyển trực tiếp là style Normal, 10 pt (`w:sz=20`); DOM Writer và DOCX Writer lưu là 12 pt (`w:sz=24`, style BodyText). Đây là nguyên nhân khả dĩ gây tràn sang trang hai. Chưa sửa: ép 10 pt sẽ thay đổi định dạng văn bản và cần xử lý đúng quy tắc import `.doc`, không an toàn để vá riêng trong đợt audit.

## d10.docx — xử lý BLOCKED

- Xác nhận header `%PDF-1.7`; tệp 823958 byte thực chất là PDF 1 trang, không phải DOCX. LibreOffice `convert-to pdf` đếm được P0=1.
- TXT export vẫn lỗi ghi file kể cả khi chỉ định UTF-8; script nay nhận diện chữ ký PDF sau khi lấy P0 và dừng trước roundtrip Writer, ghi BLOCKED với đúng nguyên nhân định dạng. Vì vậy không còn coi lỗi ghi TXT của LibreOffice là nguyên nhân chính.
- Kiểm tra riêng sau sửa: `python scripts/audit-0610/corpus_pages_lo.py --only d10.docx --report <temp>` — BLOCKED P0=1 trong 14,2 giây; không gọi Writer với PDF giả đuôi DOCX.

## Kiểm tra

- PASS: `python -m py_compile scripts/audit-0610/corpus_pages_lo.py`.
- PASS: full corpus batch 44/44 đã chạy tuần tự với LibreOffice và CDP; không thay expected hoặc bỏ test.
- PASS: kiểm tra riêng d10 sau thay đổi nhánh nhận diện PDF.
- NOT RUN: build ứng dụng (không sửa ứng dụng).
- Nhánh làm việc: `test/doc-corpus-regress-codex`; HEAD ban đầu thiếu một commit tiến độ tài liệu so với `main`, không thiếu thay đổi mã Writer.


## Đối chiếu nội dung OOXML D20

### Đối chiếu cấu trúc OOXML sau lưu VN Writer — D20

Nguồn: 24 DOCX trong corpus; mở và lưu qua VN Writer bằng CDP tuần tự.
Đếm phần tử trong các XML thuộc `word/`; bookmark `w:name` bắt đầu `vno-` được loại.
`Chênh lệch = sau lưu − gốc`; mục tiêu không mất cấu trúc (chênh lệch ≥ 0).

| Tệp | w:tbl | w:drawing | w:footnoteReference | w:hyperlink | w:sectPr | w:bookmarkStart (bỏ vno-) | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---|
| d01.docx | 7→7 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d02.docx | 2→2 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d03.docx | 3→3 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 3→3 (+0) | 0→0 (+0) | PASS — không mất |
| d04.docx | 1→1 (+0) | 6→6 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d05.docx | 1→1 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d06.docx | 0→0 (+0) | 60→60 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d07.docx | 9→9 (+0) | 1→1 (+0) | 0→0 (+0) | 3→3 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d08.docx | 1→1 (+0) | 1→1 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d09.docx | 2→2 (+0) | 30→30 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d10.docx | — | — | — | — | — | — | BLOCKED: nguồn không phải gói DOCX ZIP (PDF giả đuôi .docx) |
| d11.docx | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 8→8 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d12.docx | 1→1 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d13.docx | 7→7 (+0) | 1→1 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 0→0 (+0) | PASS — không mất |
| d14.docx | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d15.docx | 2→2 (+0) | 2→2 (+0) | 0→0 (+0) | 2→2 (+0) | 1→1 (+0) | 1→0 (-1) | FAIL — mất cấu trúc |
| d16.docx | 2→2 (+0) | 1→1 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d17.docx | 2→2 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d18.docx | 1→1 (+0) | 2→2 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d19.docx | 0→0 (+0) | 2→2 (+0) | 0→0 (+0) | 12→12 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d20.docx | 7→7 (+0) | 3→3 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 4→4 (+0) | PASS — không mất |
| d21.docx | 0→0 (+0) | 11→11 (+0) | 0→0 (+0) | 3→3 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d22.docx | 2→2 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 1→1 (+0) | 1→1 (+0) | PASS — không mất |
| d23.docx | 3→3 (+0) | 0→0 (+0) | 0→0 (+0) | 0→0 (+0) | 3→3 (+0) | 0→0 (+0) | PASS — không mất |
| d24.docx | 0→0 (+0) | 16→16 (+0) | 0→0 (+0) | 0→0 (+0) | 3→3 (+0) | 1→1 (+0) | PASS — không mất |

Tổng: 22/24 file không giảm số lượng cấu trúc; BLOCKED 1.


## legacy13.doc — điều tra trang dư

- Tái chạy CDP: P0=1, P1=2, P2=2; đúng baseline D18, không phải regression mới.
- Xuất HTML gốc `.doc` và DOCX Writer đã lưu bằng LibreOffice: mỗi bản có 31 đoạn, 6 đoạn trống, 0 bảng, 1 ảnh; cùng nội dung văn bản, cùng khổ A4/lề 2,54 cm; không có `page-break-before/after` hoặc ngắt trang tường minh. Trang thứ hai không xuất hiện do đoạn/bảng/trang trắng mới được thêm vào.
- HTML cho thấy ảnh 101×78 px và dòng đầu “CÔNG TY…” có chữ 12 pt ở cả hai bản; các đoạn sau dùng cỡ 10 pt. TXT xuất từ cả hai bản có cùng 2.751 ký tự, phần cuối chỉ còn các dòng trống hiện hữu. Kết quả tương hợp với giả thuyết baseline về khác biệt diễn giải định dạng/layout của đoạn đầu khi nhập `.doc`; phép xuất HTML không chỉ ra thay đổi kích thước ảnh hay nội dung. Không đủ bằng chứng để quy cho một hàm cụ thể hôm nay.
- Không sửa: chưa có bản vá đơn giản, an toàn trong ≤2 file mà không thay đổi ngữ nghĩa nhập `.doc`.
- Tái hiện (3 bước): (1) mở `E:\VN OFice\file test\lan-legacy\legacy13.doc` trong VN Writer; (2) lưu thành DOCX qua CDP; (3) đếm trang bằng LibreOffice `convert-to pdf`: nguồn 1 trang, DOCX đã lưu 2 trang; so HTML thấy 31 đoạn/6 đoạn trống/0 bảng/1 ảnh ở cả hai.

## Kết quả lượt chạy D20

- Phân trang corpus: **42 PASS / 1 FAIL / 1 BLOCKED**, khớp baseline `AUDIT-DOC-CORPUS-REGRESS-0610.md`; FAIL là `legacy13.doc`, BLOCKED là `d10.docx` (PDF mang đuôi DOCX). Không có FAIL mới.
- Đếm cấu trúc OOXML: xem [bảng cấu trúc OOXML](#đối-chiếu-nội-dung-ooxml-d20); 22/23 DOCX hợp lệ không giảm số lượng; `d15.docx` giảm một bookmark tự động `_GoBack`, được ghi nhận và không bị bỏ qua.
- Kiểm thử ứng dụng/build: không chạy; không sửa mã ứng dụng.
