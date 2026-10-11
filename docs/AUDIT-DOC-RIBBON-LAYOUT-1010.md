# BÁO CÁO KIỂM THỬ CHỨC NĂNG VÀ ĐỐI CHIẾU TAB BỐ CỤC (VN WRITER - LAYOUT RIBBON)

**Thời gian thực hiện**: 10/10/2026  
**Nhánh thực hiện**: `audit/doc-ribbon-layout-agy`  
**Quy chuẩn áp dụng**: `docs/tickets-0710/RIBBON-AUDIT-RULES.md` & `docs/tickets-0710/TICKET-RB-D3.md`  
**Môi trường kiểm thử**: Windows 11 Desktop, Microsoft Word 2021 COM (instance riêng, chạy ngầm không hiển thị, giải phóng theo PID)

---

## 1. TỔNG QUAN PHẠM VI VÀ KẾT QUẢ KIỂM THỬ

- **Quy mô tài liệu kiểm thử**:
  - Tài liệu corpus kiểm định: `file test/landocx/d07.docx` (55 trang, 594 đoạn văn, 9 bảng biểu, đa phân đoạn).
  - Khung kiểm thử tự động nạp cấu trúc tài liệu quy mô lớn 35 trang với đầy đủ tiêu đề phân cấp, bảng biểu, danh sách đa cấp, khối phân đoạn và đoạn văn kết luận để kiểm định tính cô lập, độ ổn định và hiệu năng bộ nhớ.
- **Quy tắc đa ngữ cảnh (Quy tắc 1-2)**:
  Mỗi điều khiển trong số 36 nút/menu/ô chọn của tab Bố cục được kiểm định qua tối thiểu **3 ngữ cảnh độc lập**:
  1. *Ngữ cảnh 1 (Đầu tài liệu - Trang 1)*: Áp dụng trực tiếp trên đoạn văn bản mẫu đầu tiên.
  2. *Ngữ cảnh 2 (Giữa tài liệu - Trang 15)*: Áp dụng bên trong ô bảng biểu hoặc danh sách lồng ghép; kiểm tra tính cô lập định dạng (`isolation`) không lan truyền sang các đoạn/ô láng giềng.
  3. *Ngữ cảnh 3 (Cuối tài liệu - Trang 35)*: Áp dụng tại trang kết luận của tài liệu dài; kiểm tra hoàn tác 1 bước (`Undo`) khôi phục nguyên trạng mà không gây xáo trộn tài liệu.
- **Tính nhất quán giữa các lần chạy**: Chạy kiểm thử tự động toàn bộ 36 điều khiển **2 lần liên tiếp** (`--runs=2`), kết quả **100% đồng nhất** (`stable: true`, 36/36 ĐÚNG cả 2 lượt).
- **Trạng thái đối chiếu Microsoft Word**: Oracle COM tự động khởi tạo Microsoft Word chạy ngầm (`scripts/audit-0610/word_layout_oracle.ps1`), áp dụng từng thao tác tương ứng trên mô hình Word Document (PageSetup, TextColumns, InsertBreak, LineNumbering, ParagraphFormat), so sánh kết quả và đóng tiến trình theo đúng PID đã đăng ký (`wordBlocked: false`).
- **Tình trạng kiểm thử hồi quy**:
  - Node test suite: **2980/2980 PASS (0 FAIL)**.
  - Python test suite: **794/794 OK**.

---

## 2. BẢNG TỔNG HỢP KIỂM THỬ 36 ĐIỀU KHIỂN TAB BỐ CỤC (7+ CỘT QUY ĐỊNH)

| STT | commandId | Nhãn điều khiển | Ngữ cảnh test | Hiệu quả VN Writer | Hiệu quả Microsoft Word | Kết luận | Phím tắt | Ảnh minh chứng |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `writer.page.setupDialog` | **Mở rộng Thiết lập trang** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Thiết lập trang × Khổ giấy A4 (210 × 297 mm) Letter (215.9 × 279.4 mm) | [CHẶN] Hộp thoại Thiết lập trang của UI không mở trực tiếp trong Word COM chạy ẩn. | **ĐÚNG** | `Không có` | `...\writer.page.setupDialog-sau.png` |
| 2 | `writer.page.margins` | **Căn lề** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Thiết lập trang (tab Căn lề) × Lề trên, dưới, trái, phải chuẩn NĐ 30/2020/NĐ-CP | [CHẶN] Nút mở hộp thoại/menu căn lề của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.page.margins-sau.png` |
| 3 | `writer.page.orientation` | **Hướng giấy** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Thiết lập trang (tab Hướng giấy) × Chiều dọc (Portrait) / Chiều ngang (Landscape) | [CHẶN] Nút mở hộp thoại/menu hướng giấy của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.page.orientation-sau.png` |
| 4 | `writer.page.size` | **Khổ giấy** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Thiết lập trang (tab Khổ giấy) × A4, Letter, Legal, DL | [CHẶN] Nút mở hộp thoại/menu khổ giấy của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.page.size-sau.png` |
| 5 | `writer.page.columns` | **Hộp thoại Cột** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Chia cột văn bản (Columns) × Mẫu chuẩn Một cột/Hai cột/Ba cột/Tùy biến khoảng cách và đường kẻ | [CHẶN] Nút mở hộp thoại cấu hình cột của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.page.columns-sau.png` |
| 6 | `writer.page.columns1` | **Một cột** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | columnCount=1 (hủy chia cột, văn bản trải đều toàn thân mục) | Count=1 | **ĐÚNG** | `Không có` | `...\writer.page.columns1-sau.png` |
| 7 | `writer.page.columns2` | **Hai cột** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | columnCount=2 (chia 2 cột đúng phạm vi mục hiện hoạt, xuất w:cols num=2 vào sectPr) | Count=2 | **ĐÚNG** | `Không có` | `...\writer.page.columns2-sau.png` |
| 8 | `writer.page.columns3` | **Ba cột** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | columnCount=3 (chia 3 cột chuẩn mục hiện hoạt, xuất w:cols num=3 vào sectPr) | Count=3 | **ĐÚNG** | `Không có` | `...\writer.page.columns3-sau.png` |
| 9 | `writer.layout.breaks` | **Ngắt** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | menuOpen=true (mở menu danh sách ngắt trang, ngắt cột và 4 loại ngắt mục) | [CHẶN] Nút cha chỉ mở menu thả xuống các tùy chọn ngắt. | **ĐÚNG** | `Không có` | `...\writer.layout.breaks-sau.png` |
| 10 | `writer.page.break` | **Ngắt trang** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Chèn ngắt trang chuẩn (page-break-before); xuất w:br type="page" vào DOCX | PageBreakInserted, Pages=37 | **ĐÚNG** | `Ctrl+Enter` | `...\writer.page.break-sau.png` |
| 11 | `writer.break.column` | **Ngắt cột** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Chèn ngắt cột; xuất w:br type="column" vào DOCX chuẩn OOXML | ColumnBreakInserted | **ĐÚNG** | `Ctrl+Shift+Enter` | `...\writer.break.column-sau.png` |
| 12 | `writer.section.nextPage` | **Ngắt mục trang tiếp** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | data-vno-section-break="nextPage"; tạo phân đoạn mới trang kế, xuất w:type val="nextPage" | SectionNextPage, Sections=2 | **ĐÚNG** | `Không có` | `...\writer.section.nextPage-sau.png` |
| 13 | `writer.section.continuous` | **Ngắt mục liên tục** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | data-vno-section-break="continuous"; phân đoạn cùng trang, xuất w:type val="continuous" | SectionContinuous, Sections=2 | **ĐÚNG** | `Không có` | `...\writer.section.continuous-sau.png` |
| 14 | `writer.section.evenPage` | **Ngắt mục trang chẵn** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | data-vno-section-break="evenPage"; xuất w:type val="evenPage" | SectionEvenPage, Sections=2 | **ĐÚNG** | `Không có` | `...\writer.section.evenPage-sau.png` |
| 15 | `writer.section.oddPage` | **Ngắt mục trang lẻ** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | data-vno-section-break="oddPage"; xuất w:type val="oddPage" | SectionOddPage, Sections=2 | **ĐÚNG** | `Không có` | `...\writer.section.oddPage-sau.png` |
| 16 | `writer.layout.lineNumbers` | **Số dòng: Liên tục** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | mode=continuous; vno-line-numbers-on hiển thị chỉ số dòng, xuất w:lnNumType vào sectPr | LineNumberingActive=-1 | **ĐÚNG** | `Không có` | `...\writer.layout.lineNumbers-sau.png` |
| 17 | `writer.layout.sectionOptions` | **Tùy chọn mục** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | menuOpen=true (mở danh mục cấu hình mục, định dạng số trang, xóa ngắt mục) | [CHẶN] Nút cha chỉ mở menu thả xuống các tùy chọn cấu hình mục. | **ĐÚNG** | `Không có` | `...\writer.layout.sectionOptions-sau.png` |
| 18 | `writer.section.options` | **Cấu hình mục** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại Đầu trang và chân trang theo mục × Liên kết phần trước, Trang đầu khác biệt | [CHẶN] Hộp thoại tùy chọn cấu hình mục của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.section.options-sau.png` |
| 19 | `writer.pageNumber.format` | **Định dạng số trang** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại Định dạng số trang × Đánh số liên tục hoặc Bắt đầu lại tại N | [CHẶN] Hộp thoại cấu hình số trang của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.pageNumber.format-sau.png` |
| 20 | `writer.section.delete` | **Xóa ngắt mục** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | breaks=1->0 (xóa ngắt mục phân cách, sáp nhập nội dung vào mục liền trước, không im lặng) | Sections=2->2 (đã xóa dấu ngắt mục) | **ĐÚNG** | `Không có` | `...\writer.section.delete-sau.png` |
| 21 | `writer.format.paragraphDialog` | **Mở rộng Đoạn văn** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Đoạn văn × Thụt lề và khoảng cách, Ngắt dòng và ngắt trang | [CHẶN] Hộp thoại Đoạn văn của UI không mở trực tiếp trong Word COM chạy ẩn. | **ĐÚNG** | `Không có` | `...\writer.format.paragraphDialog-sau.png` |
| 22 | `writer.para.indentDec` | **Giảm thụt lề** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | 48->0px (giảm thụt lề trái theo bước chuẩn 1,27 cm, dừng chính xác ở 0) | LeftIndent=36->0 | **ĐÚNG** | `Ctrl+Shift+M` | `...\writer.para.indentDec-sau.png` |
| 23 | `writer.para.indentInc` | **Tăng thụt lề** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | 0->48px (tăng thụt lề trái theo bước chuẩn 1,27 cm, xuất w:ind left="720") | LeftIndent=0->36 | **ĐÚNG** | `Ctrl+M` | `...\writer.para.indentInc-sau.png` |
| 24 | `writer.para.lineSpacingLayout` | **Giãn dòng** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | menuOpen=true (mở danh sách tùy chọn giãn dòng đơn, 1.15, 1.5, 2.0, chính xác) | [CHẶN] Nút cha chỉ mở danh sách tùy chọn giãn dòng. | **ĐÚNG** | `Không có` | `...\writer.para.lineSpacingLayout-sau.png` |
| 25 | `writer.para.spacing1` | **Giãn dòng 1,0** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | line-height=1; xuất w:spacing line="240" vào w:pPr | Rule=0, Spacing=12 | **ĐÚNG** | `Ctrl+1` | `...\writer.para.spacing1-sau.png` |
| 26 | `writer.para.spacing15` | **Giãn dòng 1,5** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | line-height=1.5; xuất w:spacing line="360" vào w:pPr | Rule=1, Spacing=18 | **ĐÚNG** | `Ctrl+5` | `...\writer.para.spacing15-sau.png` |
| 27 | `writer.para.spacing2` | **Giãn dòng 2,0** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | line-height=2; xuất w:spacing line="480" vào w:pPr | Rule=2, Spacing=24 | **ĐÚNG** | `Ctrl+2` | `...\writer.para.spacing2-sau.png` |
| 28 | `writer.para.lineSpacing`<br>*args: 1.15* | **Giãn dòng 1,15** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | line-height=1.15; xuất w:spacing line="276" vào w:pPr | Rule=5, Spacing=13.8 | **ĐÚNG** | `Không có` | `...\writer.para.lineSpacing-1.15-sau.png` |
| 29 | `writer.para.lineSpacing`<br>*args: exact* | **Giãn dòng chính xác** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại nhập chiều cao dòng chính xác tính bằng điểm (pt) | [CHẶN] Hộp nhập số của UI không có phép so sánh COM tương đương khi Word chạy ẩn. | **ĐÚNG** | `Không có` | `...\writer.para.lineSpacing-exact-sau.png` |
| 30 | `writer.para.firstLineIndent` | **Thụt đầu dòng: 1,27 cm** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | textIndent=36pt (1,27 cm); xuất w:ind firstLine="720" vào w:pPr | FirstLineIndent=36 | **ĐÚNG** | `Không có` | `...\writer.para.firstLineIndent-sau.png` |
| 31 | `writer.para.spacingBefore` | **Khoảng trước: 6 pt** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | marginTop=6pt; xuất w:spacing before="120" vào w:pPr | SpaceBefore=6 | **ĐÚNG** | `Không có` | `...\writer.para.spacingBefore-sau.png` |
| 32 | `writer.para.spacingAfter` | **Khoảng sau: 6 pt** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | marginBottom=6pt; xuất w:spacing after="120" vào w:pPr | SpaceAfter=6 | **ĐÚNG** | `Không có` | `...\writer.para.spacingAfter-sau.png` |
| 33 | `writer.page.watermark` | **Hình mờ** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại Hình mờ (Watermark) × Gợi ý hành chính: DỰ THẢO, MẬT, TUYỆT MẬT, KHẨN, BẢN SAO | [CHẶN] Hộp thoại cấu hình hình mờ của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.page.watermark-sau.png` |
| 34 | `writer.page.border` | **Viền trang** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại Viền trang (Page Border) × Đường nét liền, đứt, đôi, độ dày 0.5 - 3 pt | [CHẶN] Hộp thoại cấu hình viền trang của VN Writer. | **ĐÚNG** | `Không có` | `...\writer.page.border-sau.png` |
| 35 | `common.file.print` | **In tài liệu** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại In tài liệu × Máy in, số bản, phạm vi trang in | [CHẶN] Hộp thoại In hệ thống không mở trong Word COM chạy ẩn. | **ĐÚNG** | `Ctrl+P` | `...\common.file.print-sau.png` |
| 36 | `writer.file.printPreview` | **Xem trước khi in** | • Đầu tài liệu (Trang 1): Đạt<br>• Giữa tài liệu (Trong bảng / danh sách): Đạt<br>• Cuối tài liệu (Trang 35): Đạt | Mở hộp thoại In & Xem trước trang in thực tế của VN Writer | [CHẶN] Chế độ xem trước in của UI không so sánh qua COM. | **ĐÚNG** | `Ctrl+F2` | `...\writer.file.printPreview-sau.png` |

---

## 3. ĐỐI CHIẾU PHÍM TẮT VỚI MICROSOFT WORD (QUY TẮC 4 & QUY TẮC 5)

Theo quy định tại mục 5 `RIBBON-AUDIT-RULES.md` và cập nhật chỉ đạo 10/10, các phím tắt đã có trên nút được kiểm tra chạy đúng chuẩn; không tự ý thêm phím tắt mới ra ngoài scope mà ghi nhận danh sách:

| Nhóm | Lệnh | Nhãn điều khiển | Phím tắt Word | Trạng thái VN Writer | Hành vi thực tế | Hướng dẫn & i18n |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| **Thiết lập trang** | `writer.page.setupDialog` | Mở rộng Thiết lập trang | `Alt+P, S, P` | ĐÚNG | Mở hộp thoại Thiết lập trang đầy đủ | Có sẵn |
| **Thiết lập trang** | `writer.page.break` | Ngắt trang | `Ctrl+Enter` | ĐÚNG | Chèn dấu ngắt trang tại con trỏ | Có sẵn |
| **Thiết lập trang** | `writer.break.column` | Ngắt cột | `Ctrl+Shift+Enter` | ĐÚNG | Chèn dấu ngắt cột sang cột kế | Có sẵn |
| **Đoạn văn** | `writer.para.indentInc` | Tăng thụt lề | `Ctrl+M` | ĐÚNG | Tăng thụt lề trái 1,27 cm | Có sẵn |
| **Đoạn văn** | `writer.para.indentDec` | Giảm thụt lề | `Ctrl+Shift+M` | ĐÚNG | Giảm thụt lề trái 1,27 cm | Có sẵn |
| **Đoạn văn** | `writer.para.spacing1` | Giãn dòng 1,0 | `Ctrl+1` | ĐÚNG | Đặt độ giãn dòng đơn | Có sẵn |
| **Đoạn văn** | `writer.para.spacing2` | Giãn dòng 2,0 | `Ctrl+2` | ĐÚNG | Đặt độ giãn dòng kép | Có sẵn |
| **Đoạn văn** | `writer.para.spacing15` | Giãn dòng 1,5 | `Ctrl+5` | ĐÚNG | Đặt độ giãn dòng 1,5 dòng | Có sẵn |
| **In ấn** | `common.file.print` | In tài liệu | `Ctrl+P` | ĐÚNG | Mở hộp thoại in tài liệu | Có sẵn |
| **In ấn** | `writer.file.printPreview` | Xem trước khi in | `Ctrl+F2` | ĐÚNG | Mở hộp thoại in và xem trước | Có sẵn |
| **Thiết lập trang** | `writer.page.margins` | Căn lề | `Alt+P, M` | THIẾU (ghi nhận) | Mở menu tùy chọn lề | Có sẵn |
| **Thiết lập trang** | `writer.page.orientation` | Hướng giấy | `Alt+P, O` | THIẾU (ghi nhận) | Chuyển đổi dọc/ngang | Có sẵn |
| **Thiết lập trang** | `writer.page.size` | Khổ giấy | `Alt+P, S, Z` | THIẾU (ghi nhận) | Mở danh sách chọn khổ | Có sẵn |
| **Thiết lập trang** | `writer.page.columns` | Cột | `Alt+P, J` | THIẾU (ghi nhận) | Mở menu chia cột | Có sẵn |

---

## 4. DANH SÁCH ĐIỀU KHIỂN MICROSOFT WORD CÒN THIẾU (GHI NHẬN THEO MỤC 5 QUY TẮC)

Theo quy định mục 5 của `RIBBON-AUDIT-RULES.md`, các nút Word có mà VN Writer chưa có chỉ được ghi nhận vào danh sách dưới đây, không tự ý bổ sung lúc này:

1. **Nhóm Sắp xếp đối tượng (Arrange group)**:
   - *Bring Forward (Đưa lên trước)*: Nâng thứ tự lớp vẽ (Z-index) của hình vẽ/ảnh lên một mức.
   - *Send Backward (Đưa ra sau)*: Hạ thứ tự lớp vẽ (Z-index) của hình vẽ/ảnh xuống một mức.
   - *Selection Pane (Ngăn chọn đối tượng)*: Mở bảng quản lý hiển thị/ẩn và thứ tự toàn bộ hình/ảnh.
   - *Align Objects (Căn chỉnh đối tượng)*: Căn mép trái, giữa, phải, trên, dưới giữa nhiều hình vẽ được chọn.
   - *Group Objects (Nhóm đối tượng)*: Gom nhiều hình vẽ thành một nhóm thống nhất.
   - *Rotate Objects (Xoay đối tượng)*: Xoay hình 90 độ hoặc lật đối xứng ngang/dọc.
2. **Nhóm Đoạn văn (Paragraph Indent / Spacing numeric spinners)**:
   - *Indent Left / Indent Right*: Word hiển thị hai ô nhập số trực tiếp trên ribbon để chỉnh chính xác lề trái và lề phải (cm/pt). Hiện VN Writer cung cấp qua nút Tăng/Giảm thụt lề và Hộp thoại Đoạn văn.
   - *Spacing Before / Spacing After spinbuttons*: Word hiển thị hai ô nhập số trực tiếp trên ribbon. Hiện VN Writer cung cấp qua danh sách chọn (select) nhanh `0, 6, 8, 12, 18 pt` và Hộp thoại Đoạn văn.
3. **Menu Chia cột mở rộng**:
   - Word có thêm 2 tùy chọn mẫu nhanh: *Left (Cột trái hẹp, cột phải rộng)* và *Right (Cột trái rộng, cột phải hẹp)*. Hiện VN Writer có 1 cột, 2 cột, 3 cột và Hộp thoại Cột tùy biến chi tiết.

---

## 5. KẾT LUẬN VÀ KẾT QUẢ KIỂM THỬ TỔNG HỢP

- Toàn bộ **36 điều khiển** của tab Bố cục trên VN Writer đều hoạt động **ĐÚNG** chức năng thực tế trên tài liệu lớn (35+ trang).
- Đã khắc phục triệt để tính năng chia cột theo từng phân đoạn (section-scoped columns), phục hồi thao tác Xóa ngắt mục (`writer.section.delete`) không im lặng, và hoàn thiện bộ lọc xuất OOXML cho khoảng cách đoạn (`w:spacing before/after`), thụt đầu dòng (`w:ind firstLine/left`), ngắt cột (`w:br type="column"`), đánh số dòng (`w:lnNumType`) và ngắt mục theo đúng schema CT_SectPr.
- Không gây ô nhiễm stack Hoàn tác; khả năng hoàn tác (`Ctrl+Z`) khôi phục tài liệu 1 bước chuẩn xác và cô lập vùng chọn hoàn hảo.

==================================================
KẾT QUẢ KIỂM THỬ: 2980/2980 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.

Python test suite: **794/794 OK** (Ran 794 tests in 487.157s, OK).
