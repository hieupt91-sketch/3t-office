# Agent Handoff

**TASK:** Rà soát độ phủ Hướng dẫn sử dụng (Help) cho MỌI lệnh Writer + Sheet  
**AGENT/ROLE:** agy (Antigravity Assistant)  
**BRANCH:** `docs/help-coverage-agy`  
**WORKTREE:** `E:\VNOffice-agy-help-coverage`  
**BASE BRANCH:** `design/sheet-extlink-bar-agy`  
**DATE:** 2026-09-29  

---

## 1. Mục tiêu & Bối cảnh

- Tuân thủ nghiêm ngặt **AGENTS.md mục 10**: mọi tính năng của VN Office phải có hướng dẫn sử dụng tiếng Việt thực tế trong app, và cần một đợt rà soát bổ sung cho toàn bộ tính năng hiện có.
- Trước đợt rà soát:
  - VN Writer có 131 lệnh trên Ribbon nhưng chỉ 118 lệnh được phủ bài Help (90.1%), còn 13 lệnh thiếu.
  - VN Sheet có 152 lệnh trên Ribbon nhưng chỉ 144 lệnh được phủ bài Help (94.7%), còn 8 lệnh thiếu.
- Mục tiêu:
  1. Viết công cụ quét tự động `scripts/help-coverage.mjs` đối chiếu ribbon, command definitions và help entries.
  2. Bổ sung bài viết tiếng Việt chi tiết cho 100% lệnh có handler còn thiếu, khớp sát UI thật (tên tab, nhóm, nút, phím tắt).
  3. Bổ sung test tự động `tests/unit/help-coverage.test.js` (Regression Guard) và đăng ký vào `tests/run-tests.js`.
  4. Lập báo cáo `docs/HELP-COVERAGE.md` ghi nhận số liệu trước và sau.

---

## 2. Kết quả trước & sau rà soát

| Ứng dụng | Tổng lệnh Ribbon | Lệnh có Handler | Có bài Help (Trước) | Có bài Help (Sau) | Chưa phủ (Sau) | Nút chết | Tỉ lệ phủ đạt được |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **VN Writer** | 131 | 131 | 118 (90.1%) | **131 (100.0%)** | **0** | 0 | **100.0%** |
| **VN Sheet** | 152 | 152 | 144 (94.7%) | **152 (100.0%)** | **0** | 0 | **100.0%** |
| **Tổng cộng** | **283** | **283** | **262 (92.6%)** | **283 (100.0%)** | **0** | **0** | **100.0%** |

- **Nút chết:** 0. Toàn bộ 283 lệnh xuất hiện trên Ribbon của cả Writer và Sheet đều có handler thực tế được gắn trong adapter, view controller hoặc app shell.
- **Tổng số bài Help sau cập nhật:**
  - VN Writer: 51 bài → **57 bài** (+6 bài viết mới).
  - VN Sheet: 57 bài → **61 bài** (+4 bài viết mới).

---

## 3. Danh mục các bài Help mới bổ sung

### 3.1. VN Writer (`platform/help/entries-writer.js`)

1. **`writer.clipboard.cutCopyPaste`**
   - Ribbon: Tab **Trang đầu**, nhóm **Bảng nhớ tạm**
   - Command IDs: `common.edit.cut` (Ctrl+X), `common.edit.copy` (Ctrl+C), `common.edit.paste` (Ctrl+V), `common.edit.formatPainter` (Ctrl+Shift+C)
   - Nội dung: Hướng dẫn cắt/sao chép/dán văn bản và quét sao chép định dạng kiểu chữ.

2. **`writer.edit.findReplaceSelect`**
   - Ribbon: Tab **Trang đầu**, nhóm **Chỉnh sửa**
   - Command IDs: `common.edit.find` (Ctrl+F), `common.edit.replace` (Ctrl+H), `common.edit.selectAll` (Ctrl+A)
   - Nội dung: Tìm kiếm từ khóa, thay thế đơn lẻ/hàng loạt và chọn nhanh toàn bộ tài liệu.

3. **`writer.insert.hyperlink`**
   - Ribbon: Tab **Chèn**, nhóm **Liên kết**
   - Command IDs: `common.edit.hyperlink` (Ctrl+K)
   - Nội dung: Gán liên kết web hoặc email vào đoạn văn bản đã bôi đen.

4. **`writer.review.spellCheck`**
   - Ribbon: Tab **Đánh giá**, nhóm **Chính tả & Ngữ pháp**
   - Command IDs: `ai.assistant.grammarCheck` (F7)
   - Nội dung: Soát lỗi dấu câu, hỏi/ngã, phụ âm đầu tiếng Việt theo chuẩn Nghị định 30.

5. **`writer.help.guide`**
   - Ribbon: Tab **Trợ giúp**, nhóm **Trợ giúp**
   - Command IDs: `writer.help.open` (F1)
   - Nội dung: Tra cứu hướng dẫn sử dụng tiếng Việt theo tên và từ khóa bỏ dấu ngay trong ứng dụng.

6. **`writer.ai.core`**
   - Ribbon: Tab **Trợ lý VN AI**, nhóm **Tính năng AI thuần Việt**
   - Command IDs: `ai.assistant.toggle` (Alt+J), `ai.assistant.summarize`, `ai.assistant.rewrite`
   - Nội dung: Mở bảng AI, tóm tắt ý chính và trau chuốt văn phong văn bản hành chính.

### 3.2. VN Sheet (`platform/help/entries-sheet.js`)

1. **`sheet.clipboard.cutCopyPaste`**
   - Ribbon: Tab **Trang đầu**, nhóm **Bảng nhớ tạm**
   - Command IDs: `common.edit.cut` (Ctrl+X), `common.edit.copy` (Ctrl+C), `common.edit.paste` (Ctrl+V)
   - Nội dung: Cắt/sao chép và dán giá trị/công thức ô trên bảng tính.

2. **`sheet.page.orientationAndSize`**
   - Ribbon: Tab **Bố trí trang**, nhóm **Thiết lập trang**
   - Command IDs: `sheet.page.orientation`, `sheet.page.size`
   - Nội dung: Thiết lập giấy đứng/ngang và khổ giấy chuẩn A4/Letter/A3 trước khi in hoặc xuất PDF.

3. **`sheet.help.guide`**
   - Ribbon: Tab **Trợ giúp**, nhóm **Trợ giúp**
   - Command IDs: `sheet.help.open` (F1)
   - Nội dung: Mở bảng trợ giúp F1, tra cứu danh mục hàm và thao tác bảng tính.

4. **`sheet.ai.analysis`**
   - Ribbon: Tab **Trợ lý VN AI**, nhóm **Phân tích dữ liệu AI**
   - Command IDs: `ai.assistant.toggle` (Alt+J), `ai.assistant.summarize`
   - Nội dung: Mở bảng AI và tóm tắt phân tích xu hướng/chỉ số của vùng dữ liệu bảng tính.

---

## 4. Tệp đã tạo / sửa đổi

1. `scripts/help-coverage.mjs` (Mới): Công cụ quét động Ribbon và Help entries, phân tích tỉ lệ phủ, phát hiện nút chết và xuất báo cáo markdown.
2. `docs/HELP-COVERAGE.md` (Mới): Báo cáo chi tiết hiện trạng, thống kê trước/sau, phân loại theo tab/nhóm.
3. `platform/help/entries-writer.js`: Bổ sung 6 bài Help cho Writer.
4. `platform/help/entries-sheet.js`: Bổ sung 4 bài Help cho Sheet.
5. `tests/unit/help-coverage.test.js` (Mới): Test bảo vệ độ phủ, chặn lỗi thêm nút mà quên viết Help.
6. `tests/run-tests.js`: Đăng ký test suite `95b. Regression Guard — Help Coverage`.
7. `docs/HANDOFF-HELP-COVERAGE-AGY.md` (Mới): Tài liệu handoff chuẩn này.

---

## 5. Kết quả kiểm thử (Test Truthfulness)

### 5.1. Bộ kiểm thử Hướng dẫn sử dụng (Help Suites)
- `tests/unit/writer-help.test.js`: **PASS** (9/9 tests pass).
- `tests/unit/sheet-help.test.js`: **PASS** (11/11 tests pass).
- `tests/unit/slides-help.test.js`: **PASS** (9/9 tests pass).
- `tests/unit/help-coverage.test.js` (Mới): **PASS** (5/5 tests pass).
  - Khẳng định 100% lệnh ribbon Writer có handler đều có Help.
  - Khẳng định 100% lệnh ribbon Sheet có handler đều có Help.
  - Khẳng định 0 nút chết.
  - Khẳng định toàn bộ bài viết đạt chuẩn (không placeholder, >= 3 steps).
  - Khẳng định tìm kiếm tiếng Việt (có dấu, không dấu) tra cứu ra chính xác bài mới.

### 5.2. Bộ kiểm thử toàn diện (`node tests/run-tests.js`)
- Kết quả: **1883/1887 PASS | 4 FAIL**
- Chi tiết 4 FAIL: Thuộc các test vòng đời LibreOffice soffice headless (FODS save roundtrip, Pivot table ODF, variable row height, cell text rotation). Như đã nêu rõ trong file `TASK-BRIEF-HELP-COVERAGE-AGY.md`, các test này bị timeout do máy chậm khởi động LibreOffice headless từ môi trường.
- Đánh giá: **BLOCKED do môi trường máy chậm** (Tuân thủ luật cứng: KHÔNG sửa test, KHÔNG tăng timeout). Toàn bộ 1883 unit & integration tests logic đều **PASS** 100%.

---

## 6. Kế hoạch tiếp theo cho task sau
- Áp dụng cơ chế tương tự cho **VN Slides** khi hoàn thiện ribbon Slides.
- Giữ nguyên bộ test `95b` để đảm bảo bất kỳ lệnh nào thêm mới vào Ribbon trong tương lai đều buộc phải có bài Help tiếng Việt đi kèm trước khi vượt qua CI/CD.
