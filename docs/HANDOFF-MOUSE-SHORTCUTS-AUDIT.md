# BÁO CÁO TOÀN DIỆN AUDIT THAO TÁC CHUỘT VÀ PHÍM TẮT VN OFFICE (WORD / EXCEL / POWERPOINT PARITY)

**Worktree**: `E:\VNOffice-agy-mouse-shortcuts-audit`  
**Branch**: `fix/mouse-shortcuts-office-parity`  
**Tác giả**: Antigravity (Google DeepMind)  
**Thời gian**: 04/09/2026  
**Tiêu chuẩn đối chiếu**: Microsoft Office 365 / Desktop Suite (Word, Excel, PowerPoint)

---

## 1. Bảng đối chiếu A: Thao tác chuột (Mouse Interactions)

### 1.1. VN Sheet (so sánh với Microsoft Excel)

| # | Thao tác chuột | Trạng thái hiện tại trong VN Office | Đánh giá so Office thật | Kế hoạch xử lý |
|---|---|---|---|---|
| 1 | **Kéo-thả ô để di chuyển dữ liệu** (Drag cell border to move) | Chưa có. Rìa ô chưa có con trỏ move hay handler bắt sự kiện kéo thả để di chuyển ô | **Thiếu** | Thêm border hover/hit-test hoặc vùng rìa ô để click-giữ-kéo di chuyển nội dung và style sang ô đích |
| 2 | **Autofill handle** (Chấm vuông góc dưới-phải ô để kéo điền chuỗi) | Đã render phần tử `.vno-cell-autofill-handle` nhưng hoàn toàn không có event listener kéo thả | **Thiếu logic** | Thêm mousedown/mousemove/mouseup trên handle: kéo xuống tự động tăng dần chuỗi số (1, 2, 3...) hoặc copy công thức có tịnh tiến tham chiếu |
| 3 | **Double-click viền cột/hàng để tự động vừa khít** (Auto-fit width/height) | Thẻ header cột `th.vno-col-header` và hàng `th.vno-row-header` chưa có vùng viền resizer hay dblclick auto-fit | **Thiếu** | Thêm vùng mép phải cột và mép dưới hàng cho phép double-click để auto-fit theo độ dài ký tự thực tế |
| 4 | **Double-click ô để vào chế độ sửa** (Edit mode) | Đang gọi `_focusFormulaInputAtEnd()` chuyển con trỏ lên thanh công thức ở đầu trang | **Chưa tối ưu** | Tích hợp chế độ chỉnh sửa trực quan ngay tại ô (inline cell editor) hoặc đồng bộ con trỏ chuẩn xác |
| 5 | **Click-giữ-kéo chọn nhiều ô** (Range selection) & **Auto-scroll** khi kéo tới rìa | Chỉ có click đơn lẻ (`selectCell`), không có mousedown + mousemove để bôi đen vùng chọn chuột | **Thiếu** | Bổ sung drag-selection trên grid table: mousedown trên ô bắt đầu, mousemove bôi đen vùng chữ nhật, tự cuộn viewport khi rê sát biên |
| 6 | **Click phải mở Context Menu theo ngữ cảnh** (Right-click context menu) | Đang ép mở `showCommentDialog` (hộp thoại Ghi chú mới) cho mọi cú right-click | **Sai nghiêm trọng** | Xây dựng Context Menu chuẩn Excel: Cắt (Cut), Sao chép (Copy), Dán (Paste), Chèn hàng/cột, Xóa hàng/cột, Xóa nội dung, Định dạng ô, Thêm ghi chú |
| 7 | **Ctrl+kéo / Kéo chuột phải để có popup mở rộng** | Chưa hỗ trợ | **Giới hạn** | Ghi rõ giới hạn nâng cao; tập trung hoàn thiện kéo chuột trái chuẩn trước |

---

### 1.2. VN Writer (so sánh với Microsoft Word)

| # | Thao tác chuột | Trạng thái hiện tại trong VN Office | Đánh giá so Office thật | Kế hoạch xử lý |
|---|---|---|---|---|
| 1 | **Double-click chọn từ, Triple-click chọn cả đoạn văn** | Double-click trình duyệt tự xử lý chọn từ; triple-click chưa chuẩn hóa luôn chọn trọn vẹn đoạn paragraph `<p>` | **Chưa hoàn thiện** | Bắt sự kiện triple-click (`e.detail === 3`) để chọn toàn bộ đoạn văn bản `<p>` chứa con trỏ |
| 2 | **Kéo-thả văn bản đã bôi đen sang vị trí khác** (Drag-and-drop text move) | Kéo văn bản bôi đen trong contenteditable chưa có xử lý di chuyển kèm ghi nhận lịch sử Undo/Redo | **Thiếu** | Bắt sự kiện dragstart/drop trên `.vno-writer-body` để di chuyển văn bản đến vị trí thả chuột và lưu Undo |
| 3 | **Click-giữ-Alt kéo để chọn theo khối chữ nhật** (Column/box selection) | Chưa hỗ trợ (tính năng đặc thù sâu của layout engine Word) | **Giới hạn** | Ghi rõ giới hạn kỹ thuật của Web ContentEditable |
| 4 | **Double-click viền bảng để tự fit cột** (Table column auto-fit) | Chưa có bộ resizer trên viền cột bảng biểu trong Writer | **Thiếu** | Hỗ trợ bắt sự kiện double-click trên đường phân cách cột bảng để tự giãn độ rộng |
| 5 | **Con trỏ chuột đổi hình dạng đúng ngữ cảnh** (Contextual mouse cursor) | Thiếu khai báo `cursor: text` cho vùng soạn thảo, thiếu `cursor: pointer` trên liên kết `<a>`, thiếu `col-resize` trên bảng | **Thiếu** | Bổ sung đầy đủ CSS rules cho con trỏ chuột trong `writer.css` |

---

### 1.3. VN Slides (so sánh với Microsoft PowerPoint)

| # | Thao tác chuột | Trạng thái hiện tại trong VN Office | Đánh giá so Office thật | Kế hoạch xử lý |
|---|---|---|---|---|
| 1 | **Kéo-thả di chuyển đối tượng mượt mà** + **Đường gióng (Smart guides/snap lines)** | Chỉ có diagram node có kéo thả, các hình khối thường (rect, circle, arrow...) KHÔNG KÉO ĐƯỢC | **Thiếu** | Cài đặt drag di chuyển cho toàn bộ đối tượng trên canvas; hiển thị đường gióng snap lines khi canh giữa hoặc mép |
| 2 | **Kéo góc/cạnh để resize, giữ Shift giữ tỷ lệ** (Object resize handles) | Đối tượng chỉ có nút '×' để xóa, KHÔNG CÓ tay cầm resize (resize handles) | **Thiếu hoàn toàn** | Thêm 8 tay cầm resize (nw, ne, se, sw, n, s, e, w) cho đối tượng được chọn; Shift+kéo giữ tỷ lệ w/h |
| 3 | **Double-click shape để vào chế độ nhập chữ** | Đã có `startEditing()`, nhưng cần đảm bảo áp dụng nhất quán cho mọi loại shape | **Đúng một phần** | Hoàn thiện trải nghiệm inline text input cho mọi hình khối |
| 4 | **Click-giữ-kéo trong vùng trống để chọn nhiều đối tượng** (Rubber-band / Marquee selection) | Chưa có, chỉ click chọn đơn lẻ 1 shape | **Thiếu** | Thêm marquee selection box khi click-kéo trên nền canvas trống |
| 5 | **Kéo-thả slide trong Filmstrip bên trái để sắp xếp lại** (Reorder slides in filmstrip) | Filmstrip bên trái chỉ có `click`, không có HTML5 drag-and-drop (dù Slide Sorter đã có) | **Thiếu** | Thêm `draggable="true"`, `dragstart`, `dragover`, `drop` vào các item filmstrip bên trái gọi `moveSlide` |

---

## 2. Bảng đối chiếu B: Phím tắt (Keyboard Shortcuts)

### 2.1. Phím tắt Chung (Platform & Multi-App)

| Phím tắt | Lệnh Office chuẩn | Trạng thái hiện tại | Đánh giá | Kế hoạch |
|---|---|---|---|---|
| **F4** | Lặp lại thao tác cuối (Repeat / Redo) | Chưa có (chỉ có Ctrl+Y) | **Thiếu** | Đăng ký F4 cho `common.edit.redo` / Repeat |
| **Ctrl+Home** | Về đầu tài liệu / Về ô A1 / Về slide đầu | Chưa có trong ShortcutManager | **Thiếu** | Tích hợp điều hướng Ctrl+Home cho cả 3 app |
| **Ctrl+End** | Về cuối tài liệu / Về ô cuối dữ liệu / Về slide cuối | Chưa có trong ShortcutManager | **Thiếu** | Tích hợp điều hướng Ctrl+End cho cả 3 app |
| **Ctrl+PageUp** | Chuyển sheet trước (Excel) / Chuyển slide trước | Chưa có | **Thiếu** | Thêm phím chuyển tab sheet / slide trước |
| **Ctrl+PageDown** | Chuyển sheet sau (Excel) / Chuyển slide sau | Chưa có | **Thiếu** | Thêm phím chuyển tab sheet / slide sau |

### 2.2. VN Sheet (so sánh Microsoft Excel)

| Phím tắt | Lệnh Excel chuẩn | Trạng thái hiện tại | Đánh giá | Kế hoạch |
|---|---|---|---|---|
| **Ctrl+\`** | Bật/tắt hiện công thức thay vì kết quả (Show formulas) | Chưa có | **Thiếu** | Đăng ký lệnh `sheet.view.toggleFormulas` |
| **Ctrl+Space** | Chọn toàn bộ cột hiện tại (Select column) | Đang gán cho Writer Clear Format; Sheet chưa có | **Thiếu** | Gán `sheet.select.column` trong scope `sheet` |
| **Shift+Space** | Chọn toàn bộ hàng hiện tại (Select row) | Chưa có | **Thiếu** | Gán `sheet.select.row` trong scope `sheet` |
| **Ctrl+Mũi tên** | Nhảy tới ô biên dữ liệu liên tục (Jump to edge) | Đang chỉ di chuyển 1 ô thông thường | **Thiếu** | Thêm xử lý `e.ctrlKey && Arrow` tìm ô biên có dữ liệu |
| **Alt+Enter** | Xuống dòng trong 1 ô (Line break in cell) | Enter luôn commit và nhảy hàng dưới | **Thiếu** | Thêm `\n` vào ô khi ấn Alt+Enter trong formula/inline edit |
| **F2** | Vào chế độ chỉnh sửa ô (Edit mode) | Đã có (`sheet.cell.edit`) | **Đúng** | Giữ vững, tối ưu vị trí con trỏ |
| **Ctrl+;** | Chèn ngày hiện tại (Insert date) | Đã có (`sheet.insert.date`) | **Đúng** | Giữ vững |
| **Ctrl+Shift+;** / **Ctrl+:** | Chèn giờ hiện tại (Insert time) | Chưa có | **Thiếu** | Bổ sung lệnh `sheet.insert.time` (Ctrl+Shift+;) |
| **F9** | Tính lại toàn bộ công thức (Recalculate all) | Chưa có | **Thiếu** | Bổ sung lệnh `sheet.formula.recalculate` (F9) |

### 2.3. VN Writer (so sánh Microsoft Word)

| Phím tắt | Lệnh Word chuẩn | Trạng thái hiện tại | Đánh giá | Kế hoạch |
|---|---|---|---|---|
| **Ctrl+Shift+N** | Áp dụng kiểu văn bản Normal (Normal Style) | Chưa có | **Thiếu** | Đăng ký `writer.style.normal` (Ctrl+Shift+N) |
| **Ctrl+1** | Giãn dòng 1.0 (Single line spacing) | Đã có (`writer.para.spacing1`) | **Đúng** | Giữ vững |
| **Ctrl+2** | Giãn dòng 2.0 (Double line spacing) | Đã có (`writer.para.spacing2`) | **Đúng** | Giữ vững |
| **Ctrl+5** | Giãn dòng 1.5 (1.5 line spacing) | Đã có (`writer.para.spacing15`) | **Đúng** | Giữ vững |
| **Ctrl+E/L/R/J** | Căn giữa/trái/phải/đều | Đã có đầy đủ | **Đúng** | Giữ vững |
| **F7** | Soát lỗi chính tả & ngữ pháp | Đã có (`ai.assistant.grammarCheck`) | **Đúng** | Giữ vững |
| **Shift+F3** | Đổi chữ hoa/thường (Change case toggle) | Chưa có | **Thiếu** | Thêm lệnh `writer.text.changeCase` (Shift+F3) |

### 2.4. VN Slides (so sánh Microsoft PowerPoint)

| Phím tắt | Lệnh PowerPoint chuẩn | Trạng thái hiện tại | Đánh giá | Kế hoạch |
|---|---|---|---|---|
| **Ctrl+G** | Nhóm các đối tượng đang chọn (Group) | Chưa có | **Thiếu** | Thêm lệnh `slides.shape.group` (Ctrl+G) |
| **Ctrl+Shift+G** | Bỏ nhóm đối tượng (Ungroup) | Chưa có | **Thiếu** | Thêm lệnh `slides.shape.ungroup` (Ctrl+Shift+G) |
| **Mũi tên** | Di chuyển đối tượng 1px (Nudge 1px) | Canvas chưa bắt phím mũi tên cho shape | **Thiếu** | Bắt phím Arrow di chuyển shape 1px |
| **Shift+Mũi tên** | Di chuyển đối tượng 10px (Nudge 10px) | Canvas chưa bắt phím Shift+Arrow | **Thiếu** | Bắt phím Shift+Arrow di chuyển shape 10px |
| **Tab / Shift+Tab** | Chuyển đổi chọn đối tượng trên slide | Chưa có | **Thiếu** | Bắt phím Tab / Shift+Tab chuyển chọn shape kế tiếp |

---

## 3. Thứ tự triển khai ưu tiên (Implementation Roadmap)

1. **Giai đoạn 1 — VN Sheet**:
   - Autofill handle: drag kéo số tăng dần và copy công thức.
   - Click-giữ-kéo chọn range mượt mà + auto-scroll rìa.
   - Context menu chuột phải chuẩn Office (Cut, Copy, Paste, Insert, Delete, Clear, Format Cells, Comment).
   - Double-click viền cột/hàng tự fit.
   - Kéo-thả border ô để move dữ liệu.
   - Phím tắt: Ctrl+Space (chọn cột), Shift+Space (chọn hàng), Ctrl+Arrow (nhảy biên), Ctrl+\` (hiện công thức), Ctrl+Shift+; (chèn giờ), F9 (tính lại), Alt+Enter (xuống dòng trong ô).
   - Viết test Playwright + Unit test và commit riêng cho Sheet.

2. **Giai đoạn 2 — VN Writer**:
   - Triple-click chọn trọn vẹn paragraph `<p>`.
   - Kéo-thả văn bản đã bôi đen (drag text move) có Undo.
   - Double-click viền phân cột bảng tự fit độ rộng.
   - CSS cursor đúng ngữ cảnh (`text`, `pointer`, `col-resize`).
   - Phím tắt: Ctrl+Shift+N (Normal style), Shift+F3 (Đổi hoa/thường).
   - Viết test Playwright + Unit test và commit riêng cho Writer.

3. **Giai đoạn 3 — VN Slides**:
   - Kéo-thả di chuyển shape thông thường + hiển thị đường gióng Smart Guides khi canh lề/tâm.
   - Tay cầm Resize 8 hướng (handles) co giãn kích thước, Shift giữ tỷ lệ khung hình.
   - Kéo-thả sắp xếp thứ tự slide trên Filmstrip bên trái.
   - Marquee / Rubber-band selection kéo chọn nhiều hình.
   - Phím tắt: Arrow nudge (1px / Shift: 10px), Tab / Shift+Tab chuyển chọn đối tượng, Ctrl+G / Ctrl+Shift+G (Group/Ungroup).
   - Viết test Playwright + Unit test và commit riêng cho Slides.

4. **Giai đoạn 4 — Phím tắt Chung & Tổng duyệt**:
   - F4 (Lặp lại / Redo), Ctrl+Home / Ctrl+End, Ctrl+PageUp / Ctrl+PageDown.
   - Kiểm tra `tests/unit/shortcut-scope.test.js`, chạy toàn bộ `node tests/run-tests.js` < 60s, 100% PASS.
   - Hoàn thiện tài liệu bàn giao.
