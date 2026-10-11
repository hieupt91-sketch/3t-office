# Doc: bảng đối chiếu từng nút ribbon với Word (11/10/2026)

Nguồn: `claude-ribbon-scan` (nút nào có phản ứng) + `docs/AUDIT-DOC-WORD-PARALLEL-1011.md` (đối chiếu Word COM). Trạng thái:
- **KHỚP WORD (đã so Word COM)**: đã chạy thao tác tương đương trong app và trong Word, so thuộc tính và khớp.
- **KHÁC CÓ CHỦ Ý**: khác Word có chủ ý (ghi ở cột ghi chú).
- **LỆCH ĐÃ BIẾT**: còn lệch đã đo.
- **CHƯA ĐỐI CHIẾU**: nút có phản ứng (không phải nút câm) nhưng **chưa** so với Word thật — cần làm tiếp.

Tổng kết: KHỚP WORD (đã so Word COM): 70, CHƯA ĐỐI CHIẾU: 48, KHÁC CÓ CHỦ Ý: 1, LỆCH ĐÃ BIẾT: 1 (tổng 120 nút, không kể Trợ lý AI).

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
| Chèn | `writer.page.blank` | Trang trắng | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.page.break` | Ngắt trang (Ctrl+Enter) | KHỚP WORD (đã so Word COM) | ngắt trang/mục NextPage-Continuous-Even-Odd |
| Chèn | `writer.table.insert` | Bảng biểu | KHỚP WORD (đã so Word COM) | bảng: chèn/thêm-xóa hàng cột/gộp-tách/căn/nền/viền/AutoFit/kích thước |
| Chèn | `writer.table.fromText` | Văn bản thành bảng | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.image.insert` | Hình ảnh | KHỚP WORD (đã so Word COM) | PNG: kích thước, wrap, vị trí |
| Chèn | `writer.shape.insert` | Hình khối | KHỚP WORD (đã so Word COM) | hình chữ nhật: loại, kích thước, vị trí, màu/viền |
| Chèn | `writer.diagram.insert` | Sơ đồ | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.chart.insert` | Biểu đồ | CHƯA ĐỐI CHIẾU |  |
| Chèn | `common.edit.hyperlink` | Liên kết (Ctrl+K) | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.insert.bookmark` | Đánh dấu | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.insert.crossReference` | Tham chiếu chéo | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Chèn | `writer.comment.insert` | Thêm ghi chú (Ctrl+Alt+M) | KHỚP WORD (đã so Word COM) | ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10) |
| Chèn | `writer.header.insert` | Đầu trang | KHỚP WORD (đã so Word COM) | đầu/chân trang, trang đầu khác, chẵn/lẻ, số trang |
| Chèn | `writer.footer.insert` | Chân trang | KHỚP WORD (đã so Word COM) | đầu/chân trang, trang đầu khác, chẵn/lẻ, số trang |
| Chèn | `writer.insert.textbox` | Hộp văn bản | KHỚP WORD (đã so Word COM) | kích thước/lề/AutoSize sau lưu |
| Chèn | `writer.insert.wordart` | Chữ nghệ thuật | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.format.dropCap` | Chữ đầu đoạn | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.insert.dateTime` | Ngày & Giờ | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.insert.equation` | Phương trình (Alt+=) | CHƯA ĐỐI CHIẾU |  |
| Chèn | `writer.insert.symbol` | Ký hiệu | KHỚP WORD (đã so Word COM) | ©, ₫, ∑, → |
| Thiết kế | `writer.design.themeGallery` | Chủ đề văn bản | CHƯA ĐỐI CHIẾU |  |
| Thiết kế | `writer.page.watermark` | Hình mờ | CHƯA ĐỐI CHIẾU |  |
| Thiết kế | `writer.page.color` | Màu trang | CHƯA ĐỐI CHIẾU |  |
| Thiết kế | `writer.page.border` | Viền trang | CHƯA ĐỐI CHIẾU |  |
| Bố cục | `writer.page.margins` | Căn lề | KHỚP WORD (đã so Word COM) | lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng |
| Bố cục | `writer.page.orientation` | Hướng giấy | KHỚP WORD (đã so Word COM) | lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng |
| Bố cục | `writer.page.size` | Khổ giấy | KHỚP WORD (đã so Word COM) | lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng |
| Bố cục | `writer.page.columns` | Cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.page.columns1` | 1 cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.page.columns2` | 2 cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.page.columns3` | 3 cột | KHỚP WORD (đã so Word COM) | 3/3 |
| Bố cục | `writer.layout.lineNumbers` | Danh số dòng | CHƯA ĐỐI CHIẾU |  |
| Bố cục | `writer.para.firstLineIndent` | Thụt đầu dòng | CHƯA ĐỐI CHIẾU |  |
| Bố cục | `writer.para.spacingBefore` | Khoảng trước đoạn | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Bố cục | `writer.para.spacingAfter` | Khoảng sau đoạn | KHỚP WORD (đã so Word COM) | 20/20 phép thử định dạng |
| Bố cục | `common.file.print` | In tài liệu (Ctrl+P) | CHƯA ĐỐI CHIẾU |  |
| Bố cục | `writer.file.printPreview` | Xem trước khi in (Ctrl+F2) | CHƯA ĐỐI CHIẾU |  |
| Tham chiếu | `writer.reference.tocInsert` | Mục lục tự động | KHỚP WORD (đã so Word COM) | mục lục + Heading |
| Tham chiếu | `writer.reference.tocUpdate` | Cập nhật mục lục | KHỚP WORD (đã so Word COM) | mục lục + Heading |
| Tham chiếu | `writer.reference.footnoteInsert` | Chú thích trang (Ctrl+Alt+F) | KHỚP WORD (đã so Word COM) | chú thích trang/cuối |
| Tham chiếu | `writer.reference.endnoteInsert` | Chú thích cuối (Ctrl+Alt+D) | KHỚP WORD (đã so Word COM) | chú thích trang/cuối |
| Tham chiếu | `writer.reference.citationInsert` | Chèn trích dẫn | CHƯA ĐỐI CHIẾU |  |
| Tham chiếu | `writer.reference.sourcesManage` | Quản lý nguồn | CHƯA ĐỐI CHIẾU |  |
| Tham chiếu | `writer.reference.citationStyle` | Kiểu trích dẫn | CHƯA ĐỐI CHIẾU |  |
| Tham chiếu | `writer.reference.bibliographyInsert` | Thư mục tài liệu | CHƯA ĐỐI CHIẾU |  |
| Tham chiếu | `writer.reference.captionInsert` | Chèn chú thích ảnh | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Tham chiếu | `writer.reference.tofInsert` | Danh mục hình ảnh | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Tham chiếu | `writer.reference.tofUpdate` | Cập nhật danh mục | KHỚP WORD (đã so Word COM) | tham chiếu chéo, chú thích hình, danh mục hình |
| Trộn thư | `writer.mailings.envelopes` | Phong bì | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailings.labels` | Nhãn | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.open` | Nguồn dữ liệu | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.insertField` | Chèn trường | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.ifRule` | Quy tắc | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.preview` | Xem trước kết quả | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.prevRecord` | Bản ghi trước | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.nextRecord` | Bản ghi sau | CHƯA ĐỐI CHIẾU |  |
| Trộn thư | `writer.mailMerge.finish` | Hoàn tất & Trộn | CHƯA ĐỐI CHIẾU |  |
| Đánh giá | `writer.review.toggleSpellCheck` | Kiểm tra chính tả | CHƯA ĐỐI CHIẾU |  |
| Đánh giá | `writer.review.wordCount` | Đếm từ | LỆCH ĐÃ BIẾT | chữ khớp, 'ký tự có khoảng trắng' lệch 0.5–7% (tài liệu mẫu); đoạn/dòng gần khớp |
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
| Chế độ xem | `writer.view.readMode` | Chế độ đọc | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.printLayout` | Bố trí in | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.webLayout` | Bố trí Web | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.navigationPane` | Ngăn dẫn hướng (Ctrl+Alt+N) | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.ruler` | Thước | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.gridlines` | Đường lưới | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.zoomIn` | Phóng to | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.zoom100` | 100% | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.zoomOut` | Thu nhỏ | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.pageWidth` | Chiều rộng trang | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.zoomReset` | Đặt lại | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `writer.view.newWindow` | Cửa sổ mới | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `common.macro.recordToggle` | Ghi Macro (Ctrl+Shift+R) | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `common.macro.manager` | Xem Macro (Alt+F8) | CHƯA ĐỐI CHIẾU |  |
| Trợ giúp | `writer.help.open` | Trợ giúp (F1) | CHƯA ĐỐI CHIẾU |  |
| Trợ giúp | `common.help.about` | Giới thiệu | CHƯA ĐỐI CHIẾU |  |
