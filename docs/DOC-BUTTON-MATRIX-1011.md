# Doc: bảng đối chiếu từng nút ribbon với Word (11/10/2026)

Nguồn: `claude-ribbon-scan` (nút nào có phản ứng) + `docs/AUDIT-DOC-WORD-PARALLEL-1011.md` (đối chiếu Word COM). Trạng thái:
- **KHỚP WORD (đã so Word COM)**: đã chạy thao tác tương đương trong app và trong Word, so thuộc tính và khớp.
- **KHÁC CÓ CHỦ Ý**: khác Word có chủ ý (ghi ở cột ghi chú).
- **LỆCH ĐÃ BIẾT**: còn lệch đã đo.
- **CHƯA ĐỐI CHIẾU**: nút có phản ứng (không phải nút câm) nhưng **chưa** so với Word thật — cần làm tiếp.

Tổng kết: KHỚP WORD (đã so Word COM): 108, KHÁC CÓ CHỦ Ý: 6, CHƯA ĐỐI CHIẾU: 5, LỆCH ĐÃ BIẾT: 1 (tổng 120 nút, không kể Trợ lý AI).

| Tab | Lệnh | Nút | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Trang đầu | `common.edit.paste` | Dán (Ctrl+V) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `common.edit.cut` | Cắt (Ctrl+X) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `common.edit.copy` | Sao chép (Ctrl+C) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `common.edit.formatPainter` | Sao chép định dạng (Ctrl+Shift+C) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.edit.pasteSpecial` | Dán đặc biệt (Ctrl+Alt+V) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.font.family` | Phông chữ | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.font.size` | Cỡ chữ | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.font.grow` | Tăng cỡ chữ (Ctrl+Shift+>) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.font.shrink` | Giảm cỡ chữ (Ctrl+Shift+<) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.text.bold` | Đậm (Ctrl+B) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.italic` | Nghiêng (Ctrl+I) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.underline` | Gạch chân (Ctrl+U) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.strike` | Gạch ngang | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.subscript` | Chỉ số dưới (Ctrl+=) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.superscript` | Chỉ số trên (Ctrl+Shift++) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.changeCase` | Đổi chữ hoa/thường (Shift+F3) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.text.clearFormat` | Xóa định dạng (Ctrl+Space) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.color.highlight` | Màu nền chữ (Ctrl+Alt+H) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.color.text` | Màu chữ | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.list.bullet` | Dấu đầu dòng (Ctrl+Shift+L) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.list.numbered` | Đánh số | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.para.indentDec` | Giảm thụt lề (Ctrl+Shift+M) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.para.indentInc` | Thụt lề (Ctrl+M) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.para.sort` | Sắp xếp | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.para.showFormattingMarks` | Hiện/ẩn ký tự định dạng (Ctrl+*) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.para.alignLeft` | Căn trái (Ctrl+L) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.para.alignCenter` | Căn giữa (Ctrl+E) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.para.alignRight` | Căn phải (Ctrl+R) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.para.justify` | Căn đều (Ctrl+J) | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Trang đầu | `writer.para.shading` | Tô nền đoạn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.para.borders` | Viền đoạn văn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần |
| Trang đầu | `writer.style.gallery` | Thư viện kiểu | KHÁC CÓ CHỦ Ý | Normal/Title/Quote đã áp dụng; preset VN cố ý khác định dạng Word; Heading 1–3 khớp |
| Trang đầu | `common.edit.find` | Tìm kiếm (Ctrl+F) | KHỚP WORD (đã so Word COM) | phân biệt hoa/thường, toàn từ, Tìm trước, thay một |
| Trang đầu | `common.edit.replace` | Thay thế (Ctrl+H) | KHỚP WORD (đã so Word COM) | phân biệt hoa/thường, toàn từ, Tìm trước, thay một |
| Chèn | `writer.page.blank` | Trang trắng | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.page.break` | Ngắt trang (Ctrl+Enter) | KHỚP WORD (đã so Word COM) | ngắt trang/mục NextPage-Continuous-Even-Odd |
| Chèn | `writer.table.insert` | Bảng biểu | KHỚP WORD (đã so Word COM) | bảng: chèn/thêm-xóa hàng cột/gộp-tách/căn/nền/viền/AutoFit/kích thước |
| Chèn | `writer.table.fromText` | Văn bản thành bảng | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.image.insert` | Hình ảnh | KHỚP WORD (đã so Word COM) | PNG: kích thước, wrap, vị trí |
| Chèn | `writer.shape.insert` | Hình khối | KHỚP WORD (đã so Word COM) | hình chữ nhật: loại, kích thước, vị trí, màu/viền |
| Chèn | `writer.diagram.insert` | Sơ đồ | KHỚP WORD (đã so Word COM) | FIX-T12: Word COM đọc được một biểu đồ native chỉnh sửa được kèm workbook nhúng; sơ đồ là nhóm DrawingML chỉnh sửa được gồm 4 hình |
| Chèn | `writer.chart.insert` | Biểu đồ | KHỚP WORD (đã so Word COM) | FIX-T12: Word COM đọc được một biểu đồ native chỉnh sửa được kèm workbook nhúng; sơ đồ là nhóm DrawingML chỉnh sửa được gồm 4 hình |
| Chèn | `common.edit.hyperlink` | Liên kết (Ctrl+K) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.insert.bookmark` | Đánh dấu | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.insert.crossReference` | Tham chiếu chéo | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Chèn | `writer.comment.insert` | Thêm ghi chú (Ctrl+Alt+M) | KHỚP WORD (đã so Word COM) | ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10) |
| Chèn | `writer.header.insert` | Đầu trang | KHỚP WORD (đã so Word COM) | đầu/chân trang, trang đầu khác, chẵn/lẻ, số trang |
| Chèn | `writer.footer.insert` | Chân trang | KHỚP WORD (đã so Word COM) | đầu/chân trang, trang đầu khác, chẵn/lẻ, số trang |
| Chèn | `writer.insert.textbox` | Hộp văn bản | KHỚP WORD (đã so Word COM) | kích thước/lề/AutoSize sau lưu |
| Chèn | `writer.insert.wordart` | Chữ nghệ thuật | CHƯA ĐỐI CHIẾU | Chưa so kết quả với Word COM: chưa có bằng chứng về đối tượng WordArt native có thể chỉnh sửa; cần kiểm tra kiểu dáng và cấu trúc DOCX riêng |
| Chèn | `writer.format.dropCap` | Chữ đầu đoạn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.insert.dateTime` | Ngày & Giờ | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.insert.equation` | Phương trình (Alt+=) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX |
| Chèn | `writer.insert.symbol` | Ký hiệu | KHỚP WORD (đã so Word COM) | ©, ₫, ∑, → |
| Thiết kế | `writer.design.themeGallery` | Chủ đề văn bản | KHỚP WORD (đã so Word COM) | FIX-T12: DOCX có bảng màu Modern/phông Be Vietnam Pro; Word COM đọc watermark PowerPlusWaterMarkObject1 trong header; line numbering Active=-1, CountBy=1, RestartMode=0 |
| Thiết kế | `writer.page.watermark` | Hình mờ | KHỚP WORD (đã so Word COM) | FIX-T12: DOCX có bảng màu Modern/phông Be Vietnam Pro; Word COM đọc watermark PowerPlusWaterMarkObject1 trong header; line numbering Active=-1, CountBy=1, RestartMode=0 |
| Thiết kế | `writer.page.color` | Màu trang | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 3: Word COM xác nhận màu trang #dbeafe, viền 3 pt nét đứt #dc2626 và thụt đầu dòng 14.15 pt khớp |
| Thiết kế | `writer.page.border` | Viền trang | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 3: Word COM xác nhận màu trang #dbeafe, viền 3 pt nét đứt #dc2626 và thụt đầu dòng 14.15 pt khớp |
| Bố cục | `writer.page.margins` | Căn lề | KHỚP WORD (đã so Word COM) | lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng |
| Bố cục | `writer.page.orientation` | Hướng giấy | KHỚP WORD (đã so Word COM) | lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng |
| Bố cục | `writer.page.size` | Khổ giấy | KHỚP WORD (đã so Word COM) | lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng |
| Bố cục | `writer.page.columns` | Cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.page.columns1` | 1 cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.page.columns2` | 2 cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.page.columns3` | 3 cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.layout.lineNumbers` | Danh số dòng | KHỚP WORD (đã so Word COM) | FIX-T12: DOCX có bảng màu Modern/phông Be Vietnam Pro; Word COM đọc watermark PowerPlusWaterMarkObject1 trong header; line numbering Active=-1, CountBy=1, RestartMode=0 |
| Bố cục | `writer.para.firstLineIndent` | Thụt đầu dòng | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 3: Word COM xác nhận màu trang #dbeafe, viền 3 pt nét đứt #dc2626 và thụt đầu dòng 14.15 pt khớp |
| Bố cục | `writer.para.spacingBefore` | Khoảng trước đoạn | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Bố cục | `writer.para.spacingAfter` | Khoảng sau đoạn | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Bố cục | `common.file.print` | In tài liệu (Ctrl+P) | CHƯA ĐỐI CHIẾU | Chưa chạy in đối chứng: chưa chọn đích in (máy in hoặc PDF); thao tác in có thể tạo đầu ra ngoài workspace |
| Bố cục | `writer.file.printPreview` | Xem trước khi in (Ctrl+F2) | CHƯA ĐỐI CHIẾU | FIX-T14 CDP: hộp thoại In dựng 1 trang A4 210×297 mm, ảnh xem trước 794×1123 px; chưa so trang/PDF với Word COM |
| Tham chiếu | `writer.reference.tocInsert` | Mục lục tự động | KHỚP WORD (đã so Word COM) | mục lục + Heading |
| Tham chiếu | `writer.reference.tocUpdate` | Cập nhật mục lục | KHỚP WORD (đã so Word COM) | mục lục + Heading |
| Tham chiếu | `writer.reference.footnoteInsert` | Chú thích trang (Ctrl+Alt+F) | KHỚP WORD (đã so Word COM) | chú thích trang/cuối |
| Tham chiếu | `writer.reference.endnoteInsert` | Chú thích cuối (Ctrl+Alt+D) | KHỚP WORD (đã so Word COM) | chú thích trang/cuối |
| Tham chiếu | `writer.reference.citationInsert` | Chèn trích dẫn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 4: CDP tạo nguồn, chọn MLA, chèn trích dẫn và Works Cited; Word COM xác nhận citation, tiêu đề, nhà xuất bản và năm |
| Tham chiếu | `writer.reference.sourcesManage` | Quản lý nguồn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 4: CDP tạo nguồn, chọn MLA, chèn trích dẫn và Works Cited; Word COM xác nhận citation, tiêu đề, nhà xuất bản và năm |
| Tham chiếu | `writer.reference.citationStyle` | Kiểu trích dẫn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 4: CDP tạo nguồn, chọn MLA, chèn trích dẫn và Works Cited; Word COM xác nhận citation, tiêu đề, nhà xuất bản và năm |
| Tham chiếu | `writer.reference.bibliographyInsert` | Thư mục tài liệu | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 4: CDP tạo nguồn, chọn MLA, chèn trích dẫn và Works Cited; Word COM xác nhận citation, tiêu đề, nhà xuất bản và năm |
| Tham chiếu | `writer.reference.captionInsert` | Chèn chú thích ảnh | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Tham chiếu | `writer.reference.tofInsert` | Danh mục hình ảnh | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Tham chiếu | `writer.reference.tofUpdate` | Cập nhật danh mục | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Trộn thư | `writer.mailings.envelopes` | Phong bì | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailings.labels` | Nhãn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.open` | Nguồn dữ liệu | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.insertField` | Chèn trường | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.ifRule` | Quy tắc | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.preview` | Xem trước kết quả | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.prevRecord` | Bản ghi trước | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.nextRecord` | Bản ghi sau | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Trộn thư | `writer.mailMerge.finish` | Hoàn tất & Trộn | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn |
| Đánh giá | `writer.review.toggleSpellCheck` | Kiểm tra chính tả | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Đánh giá | `writer.review.wordCount` | Đếm từ | LỆCH ĐÃ BIẾT | FIX-T13: ký tự đạt ngưỡng ≤0,2% trên 6/7 (d01 0,043%; d02/d06/d07/d13/d20 khớp); số từ còn lệch d01 -16, d02 +2, d07 +2, d13 -3, d20 -1; d24 Word COM -2, tài liệu mới 0/0, desktop crash khi mở d24 |
| Đánh giá | `writer.review.commentDelete` | Xóa nhận xét | KHỚP WORD (đã so Word COM) | ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10) |
| Đánh giá | `writer.review.commentResolve` | Đã xử lý | KHỚP WORD (đã so Word COM) | ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10) |
| Đánh giá | `writer.review.commentPrevious` | Nhận xét trước | KHỚP WORD (đã so Word COM) | ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10) |
| Đánh giá | `writer.review.commentNext` | Nhận xét sau | KHỚP WORD (đã so Word COM) | ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10) |
| Đánh giá | `writer.trackChanges.toggle` | Theo dõi thay đổi (Ctrl+Shift+E) | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Đánh giá | `writer.trackChanges.acceptOne` | Chấp nhận một | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Đánh giá | `writer.trackChanges.acceptAll` | Chấp nhận thay đổi | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Đánh giá | `writer.trackChanges.rejectOne` | Từ chối một | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Đánh giá | `writer.trackChanges.rejectAll` | Từ chối thay đổi | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Đánh giá | `writer.trackChanges.previous` | Thay đổi trước | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Đánh giá | `writer.trackChanges.next` | Thay đổi sau | KHỚP WORD (đã so Word COM) | chèn+xóa, điều hướng, chấp nhận/từ chối |
| Chế độ xem | `writer.view.readMode` | Chế độ đọc | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.printLayout` | Bố trí in | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.webLayout` | Bố trí Web | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.navigationPane` | Ngăn dẫn hướng (Ctrl+Alt+N) | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.ruler` | Thước | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.gridlines` | Đường lưới | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.zoomIn` | Phóng to | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.zoom100` | 100% | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.zoomOut` | Thu nhỏ | KHỚP WORD (đã so Word COM) | FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS |
| Chế độ xem | `writer.view.pageWidth` | Chiều rộng trang | CHƯA ĐỐI CHIẾU | FIX-T14 CDP: trang A4 rộng 1286 px trong vùng xem 1329 px ở zoom 162%; nút giữ chế độ vừa chiều rộng để tự căn lại khi đổi kích thước cửa sổ; chưa so Zoom.PageFit của Word COM |
| Chế độ xem | `writer.view.zoomReset` | Đặt lại | CHƯA ĐỐI CHIẾU | FIX-T14 CDP: sau khi tăng zoom và vừa chiều rộng, nút Đặt lại đưa zoom về 100%; chưa so Percentage của Word COM |
| Chế độ xem | `writer.view.newWindow` | Cửa sổ mới | KHÁC CÓ CHỦ Ý | FIX-T14 CDP: tạo WebView desktop thứ hai với tài liệu Writer trắng; nội dung cửa sổ gốc không đồng bộ. Đây là thiết kế có chủ ý để mở tài liệu độc lập; Help ghi rõ khác với việc nhân bản cùng tài liệu của Word. |
| Chế độ xem | `common.macro.recordToggle` | Ghi Macro (Ctrl+Shift+R) | KHÁC CÓ CHỦ Ý | FIX-T13: VN Office ghi/phát lại command ID qua Command Bus và lưu macro cục bộ; không đọc/chạy VBA Project như Word, đây là mô hình macro riêng có chủ ý |
| Chế độ xem | `common.macro.manager` | Xem Macro (Alt+F8) | KHÁC CÓ CHỦ Ý | FIX-T13: VN Office ghi/phát lại command ID qua Command Bus và lưu macro cục bộ; không đọc/chạy VBA Project như Word, đây là mô hình macro riêng có chủ ý |
| Trợ giúp | `writer.help.open` | Trợ giúp (F1) | KHÁC CÓ CHỦ Ý | F1 mở Help catalog cục bộ trong app, dùng được offline; khác luồng trợ giúp bên ngoài của Word có chủ ý |
| Trợ giúp | `common.help.about` | Giới thiệu | KHÁC CÓ CHỦ Ý | About hiển thị phiên bản, bản quyền và giấy phép của 3T Office; nội dung nhận diện sản phẩm khác Word có chủ ý |
