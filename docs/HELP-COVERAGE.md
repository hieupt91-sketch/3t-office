# BÁO CÁO ĐỘ PHỦ HƯỚNG DẪN SỬ DỤNG (HELP COVERAGE)

Ngày thực hiện: 2026-09-29  
Worktree: `E:\VNOffice-agy-help-coverage`  
Nhánh: `docs/help-coverage-agy`  
Quy chuẩn tuân thủ: [AGENTS.md](file:///E:/VNOffice-agy-help-coverage/AGENTS.md) Mục 10 (Hướng dẫn sử dụng trong ứng dụng bắt buộc).

---

## 1. Kết quả Trước và Sau đợt rà soát

| Ứng dụng | Trạng thái | Tổng lệnh Ribbon | Lệnh có Handler | Có bài Help | Chưa có Help | Tỉ lệ phủ | Tổng số bài Help |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **VN Writer** | **Trước** | 131 | 131 | 118 | 13 | 90.1% | 51 bài |
| | **Sau** | **131** | **131** | **131** | **0** | **100.0%** | **57 bài** (+6 bài) |
| **VN Sheet** | **Trước** | 152 | 152 | 144 | 8 | 94.7% | 57 bài |
| | **Sau** | **152** | **152** | **152** | **0** | **100.0%** | **61 bài** (+4 bài) |
| **Tổng cộng** | **Sau** | **283** | **283** | **283** | **0** | **100.0%** | **118 bài** |

---

## 2. Nút chết cần xử lý

_Kết quả rà soát: Không phát hiện nút chết nào trên thanh Ribbon của cả VN Writer và VN Sheet. 100% lệnh xuất hiện trên Ribbon đều đã có handler thực thi thực tế trong adapter, view controller hoặc app shell._

---

## 3. Chi tiết các bài Help bổ sung theo nhóm Ribbon

### 3.1. VN Writer (+6 bài viết mới)

1. **`writer.clipboard.cutCopyPaste`** — *Cắt, Sao chép, Dán và Sao chép định dạng*
   - Vị trí: Tab **Trang đầu**, nhóm **Bảng nhớ tạm**
   - Command IDs: `common.edit.cut` (Ctrl+X), `common.edit.copy` (Ctrl+C), `common.edit.paste` (Ctrl+V), `common.edit.formatPainter` (Ctrl+Shift+C)
   - Nội dung: Hướng dẫn cắt/sao chép/dán nội dung và sao chép định dạng văn bản sang đoạn khác.

2. **`writer.edit.findReplaceSelect`** — *Tìm kiếm, Thay thế và Chọn tất cả*
   - Vị trí: Tab **Trang đầu**, nhóm **Chỉnh sửa**
   - Command IDs: `common.edit.find` (Ctrl+F), `common.edit.replace` (Ctrl+H), `common.edit.selectAll` (Ctrl+A)
   - Nội dung: Hướng dẫn tìm kiếm từ khóa, thay thế hàng loạt và bôi đen toàn bộ nội dung.

3. **`writer.insert.hyperlink`** — *Chèn siêu liên kết (Hyperlink)*
   - Vị trí: Tab **Chèn**, nhóm **Liên kết**
   - Command IDs: `common.edit.hyperlink` (Ctrl+K)
   - Nội dung: Hướng dẫn gán liên kết web/email vào đoạn văn bản đã chọn.

4. **`writer.review.spellCheck`** — *Soát lỗi chính tả và ngữ pháp tiếng Việt*
   - Vị trí: Tab **Đánh giá**, nhóm **Chính tả & Ngữ pháp**
   - Command IDs: `ai.assistant.grammarCheck` (F7)
   - Nội dung: Hướng dẫn quét và sửa lỗi chính tả tiếng Việt theo chuẩn Nghị định 30.

5. **`writer.help.guide`** — *Tra cứu Trợ giúp và Hướng dẫn sử dụng*
   - Vị trí: Tab **Trợ giúp**, nhóm **Trợ giúp**
   - Command IDs: `writer.help.open` (F1)
   - Nội dung: Hướng dẫn mở bảng Help F1, tìm kiếm theo từ khóa có dấu/không dấu và xem các bước thao tác.

6. **`writer.ai.core`** — *Trợ lý VN AI: Tóm tắt nhanh và Viết lại văn phong*
   - Vị trí: Tab **Trợ lý VN AI**, nhóm **Tính năng AI thuần Việt**
   - Command IDs: `ai.assistant.toggle` (Alt+J), `ai.assistant.summarize`, `ai.assistant.rewrite`
   - Nội dung: Hướng dẫn bật/tắt bảng trợ lý AI, tóm tắt tài liệu và trau chuốt văn phong hành chính.

### 3.2. VN Sheet (+4 bài viết mới)

1. **`sheet.clipboard.cutCopyPaste`** — *Cắt, Sao chép và Dán ô dữ liệu*
   - Vị trí: Tab **Trang đầu**, nhóm **Bảng nhớ tạm**
   - Command IDs: `common.edit.cut` (Ctrl+X), `common.edit.copy` (Ctrl+C), `common.edit.paste` (Ctrl+V)
   - Nội dung: Hướng dẫn cắt/sao chép ô hoặc dải ô và dán dữ liệu vào vị trí đích trên bảng tính.

2. **`sheet.page.orientationAndSize`** — *Hướng giấy và Khổ giấy trang in*
   - Vị trí: Tab **Bố trí trang**, nhóm **Thiết lập trang**
   - Command IDs: `sheet.page.orientation`, `sheet.page.size`
   - Nội dung: Hướng dẫn chọn giấy đứng/ngang và chọn khổ A4/Letter/A3 trước khi in hoặc xuất PDF.

3. **`sheet.help.guide`** — *Tra cứu Trợ giúp và Hướng dẫn sử dụng VN Sheet*
   - Vị trí: Tab **Trợ giúp**, nhóm **Trợ giúp**
   - Command IDs: `sheet.help.open` (F1)
   - Nội dung: Hướng dẫn mở bảng Help F1 cho bảng tính, tra cứu hàm công thức và kỹ thuật xử lý dữ liệu.

4. **`sheet.ai.analysis`** — *Trợ lý VN AI: Bảng trợ lý và Tóm tắt dữ liệu bảng tính*
   - Vị trí: Tab **Trợ lý VN AI**, nhóm **Phân tích dữ liệu AI**
   - Command IDs: `ai.assistant.toggle` (Alt+J), `ai.assistant.summarize`
   - Nội dung: Hướng dẫn mở thanh AI bên phải và tóm tắt chỉ số, xu hướng của vùng dữ liệu bảng tính.

---

## 4. Kiểm thử tự động bảo vệ độ phủ (Regression Test Guard)

Đã bổ sung bộ kiểm thử `tests/unit/help-coverage.test.js` và đăng ký vào bộ chạy test toàn diện `tests/run-tests.js`:
- Quét động toàn bộ ribbon Writer và Sheet.
- Xác nhận 100% lệnh có handler đều có bài Help nhắc tới trong `commandIds`.
- Tự động phát hiện lỗi (FAIL test) nếu sau này bất kỳ agent nào thêm lệnh mới lên ribbon mà không viết bài Help tương ứng.
