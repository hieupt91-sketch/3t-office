# Báo cáo Đo Thao tác Chuột Thực tế (Mouse Operations Audit) VN Office

- **Ngày thực hiện**: 03/10/2026
- **Branch**: `feat/mouse-ops-parity-agy`
- **Worktree**: `E:\VNOffice-agy-mouse`
- **Người thực hiện**: agy
- **Hồ sơ chạy (Profile)**: `LOCALAPPDATA=E:\VNOffice-profiles\agy-mouse`
- **Lệnh thực thi thật**:
  ```powershell
  $env:LOCALAPPDATA="E:\VNOffice-profiles\agy-mouse"
  $env:VNO_AUDIT_OUTPUT="mouse_ops_audit.json"
  node --experimental-websocket tests/live/cdp/mouse-ops.desktop.mjs > mouse_ops_raw_output_post_fix3.txt 2>&1
  ```
- **Tệp thô & Bằng chứng**:
  - Kịch bản đo CDP: `tests/live/cdp/mouse-ops.desktop.mjs`
  - Log thô đo ban đầu (trước sửa): `mouse_ops_raw_output.txt` (28 PASS, 13 FAIL)
  - Log thô nghiệm thu (sau sửa): `mouse_ops_raw_output_post_fix3.txt` (**41 PASS, 0 FAIL**)
  - JSON kết quả nghiệm thu: `mouse_ops_audit.json`

---

## 1. Bảng Đo Nghiệm Thu Sau Khi Sửa (41/41 PASS - 100%)

| Ứng dụng | Mã thao tác | Tên thao tác chuột | Kết quả | Giá trị mong đợi | Giá trị thực tế đo được từ DOM/Model |
|---|---|---|:---:|---|---|
| **DOC** | `doc_dblclick_word` | Nhấp đúp chọn từ | **PASS** | Chứa từ dưới con trỏ | `"điện"` |
| **DOC** | `doc_tripleclick_para` | Nhấp ba chọn cả đoạn | **PASS** | Toàn bộ nội dung đoạn văn | `"Văn phòng điện tử 3T Office thông minh và hiện đại."` |
| **DOC** | `doc_drag_select_text` | Kéo chuột bôi đen chọn văn bản | **PASS** | Bôi đen văn bản > 5 ký tự | `"Đoạn văn bản thứ"` |
| **DOC** | `doc_drag_drop_move` | Kéo-thả văn bản di chuyển (Move) | **PASS** | Nguồn mất, đích có | Nguồn mất, đích nhận `[DIEMTHA]DULIEUKEO` |
| **DOC** | `doc_drag_drop_move_undo` | Hoàn tác di chuyển văn bản (Ctrl+Z) | **PASS** | Nguồn phục hồi lại chữ | Phục hồi lại `DULIEUKEO` (`true`) |
| **DOC** | `doc_drag_drop_copy` | Ctrl+kéo sao chép văn bản (Copy) | **PASS** | Cả nguồn và đích đều giữ chữ | Nguồn: `DULIEUKEO`, Đích: `[DIEMTHA] DULIEUKEO` |
| **DOC** | `doc_table_col_autofit` | Nhấp đôi viền cột bảng tự vừa khít | **PASS** | < 363px | `158px` |
| **DOC** | `doc_table_col_resize` | Kéo viền cột bảng đổi kích thước | **PASS** | >= 198px | `325px` |
| **DOC** | `doc_table_row_resize` | Kéo viền hàng bảng đổi kích thước | **PASS** | >= 70px | `95px` |
| **DOC** | `doc_click_image_handles` | Click hình hiện 8 tay cầm | **PASS** | 8 tay cầm + overlay | `8 tay cầm (overlay: true)` |
| **DOC** | `doc_cursor_contextual` | Con trỏ chuột đổi hình theo vùng | **PASS** | body: text, link: pointer | `body: text, link: pointer` |
| **DOC** | `doc_ctrl_wheel_zoom_in` | Ctrl+cuộn chuột phóng to | **PASS** | > 100% | `110%` |
| **DOC** | `doc_ctrl_wheel_zoom_out` | Ctrl+cuộn chuột thu nhỏ | **PASS** | <= 100% | `100%` |
| **DOC** | `doc_wheel_scroll` | Cuộn chuột thường dọc trang | **PASS** | Cuộn trang > 0 | `trước: 0, sau: 150` |
| **SHEET** | `sheet_dblclick_cell_edit` | Nhấp đôi ô vào chế độ sửa | **PASS** | Focus formula/inline editor | `true` |
| **SHEET** | `sheet_drag_select_range` | Kéo chuột chọn vùng (B2:D4) | **PASS** | Vùng `B2:D4` | `B2:D4` |
| **SHEET** | `sheet_shift_click_extend` | Shift+click mở rộng vùng (B2:E6) | **PASS** | Vùng `B2:E6` | `B2:E6` |
| **SHEET** | `sheet_ctrl_click_multiselect` | Ctrl+click chọn nhiều vùng | **PASS** | >= 2 vùng rời rạc | `2 vùng` |
| **SHEET** | `sheet_dblclick_col_autofit` | Nhấp đôi viền cột tự vừa độ rộng | **PASS** | > 150px | `500px` |
| **SHEET** | `sheet_drag_col_resize` | Kéo viền cột đổi độ rộng | **PASS** | >= 99px | `114px` (trước: 64px) |
| **SHEET** | `sheet_drag_row_resize` | Kéo viền hàng đổi chiều cao | **PASS** | >= 40px | `50px` (trước: 20px) |
| **SHEET** | `sheet_drag_autofill_numbers` | Kéo tay cầm điền chuỗi số (AutoFill 1..4) | **PASS** | Dãy số 1, 2, 3, 4 | `[1, 2, 3, 4]` |
| **SHEET** | `sheet_drag_autofill_formula` | Kéo tay cầm điền công thức tịnh tiến | **PASS** | C2==A2*10, C3==A3*10 | `C2==A2*10, C3==A3*10` |
| **SHEET** | `sheet_drag_cell_move` | Kéo viền ô di chuyển (Move) | **PASS** | Ô đích nhận dữ liệu | `F1 = 'CHUYEN_O'` |
| **SHEET** | `sheet_drag_cell_move_undo` | Hoàn tác di chuyển ô (Ctrl+Z) | **PASS** | D1 phục hồi lại giá trị | `D1 = 'CHUYEN_O'` |
| **SHEET** | `sheet_drag_cell_copy` | Ctrl+kéo viền ô sao chép (Copy) | **PASS** | Cả D1 và H1 đều có chữ | `{"d1":"CHUYEN_O","h1":"CHUYEN_O"}` |
| **SHEET** | `sheet_click_col_header` | Click tiêu đề cột chọn cả cột | **PASS** | Toàn bộ cột C | `C:C` |
| **SHEET** | `sheet_click_row_header` | Click tiêu đề hàng chọn cả hàng | **PASS** | Toàn bộ hàng 5 | `5:5` |
| **SHEET** | `sheet_drag_col_headers` | Kéo tiêu đề chọn nhiều cột | **PASS** | Dải cột D:F | `D:F` |
| **SHEET** | `sheet_right_click_context_menu` | Chuột phải mở Menu ngữ cảnh | **PASS** | Menu ngữ cảnh hiển thị | `true` |
| **SHEET** | `sheet_ctrl_wheel_zoom` | Ctrl+cuộn chuột thu phóng Sheet | **PASS** | > 100% | `110%` |
| **SHEET** | `sheet_composing_text_overflow` | Soạn ô tràn sang ô bên phải khi rỗng (Bước 3) | **PASS** | `overflow: visible; z-index: 20` | `{"overflow":"visible","zIndex":"20","hasCanOverflow":true}` |
| **SLIDE** | `slide_drag_move_object` | Kéo di chuyển shape trên canvas | **PASS** | Tọa độ dời theo khoảng kéo | `left: 160, top: 140` |
| **SLIDE** | `slide_drag_move_undo` | Hoàn tác di chuyển shape (Ctrl+Z) | **PASS** | Phục hồi tọa độ ban đầu | `80px` |
| **SLIDE** | `slide_drag_resize_handle` | Kéo tay cầm đổi kích thước | **PASS** | Kích thước > 230px | `260px × 160px` |
| **SLIDE** | `slide_dblclick_shape_text` | Nhấp đôi vào shape để nhập chữ | **PASS** | Vùng soạn thảo chữ active | `true` |
| **SLIDE** | `slide_drag_marquee_select` | Kéo khung bôi chọn nhiều shape | **PASS** | Chọn cả 2 shape trong khung | `2 đối tượng` |
| **SLIDE** | `slide_drag_reorder_filmstrip` | Kéo sắp xếp slide ở khung trái | **PASS** | Thứ tự đổi thành 2, 1, 3 | `["TRANG_HAI","TRANG_MOT","TRANG_BA"]` |
| **SLIDE** | `slide_drag_reorder_undo` | Hoàn tác sắp xếp slide (Ctrl+Z) | **PASS** | TRANG_MOT phục hồi vị trí 1 | `["TRANG_MOT","TRANG_HAI","TRANG_BA"]` |
| **SLIDE** | `slide_click_select_slide` | Click chọn slide ở khung trái | **PASS** | Chuyển sang slide 3 | `index 2` |
| **SLIDE** | `slide_ctrl_wheel_zoom` | Ctrl+cuộn chuột thu phóng Slide | **PASS** | > 100% | `110%` |

---

## 2. Thống kê Tiến trình
- **Đợt 1 (Đo ban đầu trước khi sửa)**: 28 PASS | 13 FAIL (tổng 41)
- **Đợt 2 (Sau đợt sửa ban đầu)**: 37 PASS | 4 FAIL (tổng 41)
- **Đợt 3 (Hoàn tất toàn diện mọi ca lỗi)**: **41 PASS | 0 FAIL** (100% đạt parity với Microsoft Office)

---

## 3. Các Cải tiến Chi tiết Đã Thực hiện
1. **VN Writer (Doc)**:
   - Thêm bộ xử lý `_handleDblClick` trên viền cột bảng (`writer-table.js`) để tính toán độ dài chuỗi dài nhất trong cột và tự động co giãn (`autoFitTableColumn`) có ghi nhận Undo snapshot.
   - Mở rộng hỗ trợ kéo đổi chiều cao hàng bảng (`_resizing === "row"`) và cải tiến hit-test vùng viền mép bảng.
   - Thêm cơ chế kéo-thả văn bản (`_setupTextDragDrop`) hỗ trợ Di chuyển (Move) và Sao chép khi giữ Ctrl (Copy), tích hợp lưu snapshot Undo và bắt phím Ctrl+Z trên document.
   - Thêm hỗ trợ nhấp 3 lần (`clickCount === 3`) bôi đen toàn bộ khối đoạn văn bản (`<p>`).

2. **VN Sheet**:
   - Khắc phục sự cố kéo viền cột và kéo viền hàng bằng các hàm lắng nghe mousedown/drag chuyên trách trên `.vno-col-resizer` và `.vno-row-resizer`, tránh ghi đè độ rộng khi chỉ nhấp đúp không kéo.
   - Sửa cơ chế sao chép ô khi giữ Ctrl trong lúc kéo viền ô (`_startCellMove` hỗ trợ cờ `isCopy`).
   - Sửa cơ chế click và kéo chọn tiêu đề cột / tiêu đề hàng, cho phép chọn toàn bộ dải cột/hàng mượt mà.
   - **Bước 3 (Tràn chữ khi soạn ô)**: Cập nhật CSS `.vno-inline-cell-editor[data-can-overflow="true"]` và logic `_startInlineEditing` để khi người dùng đang nhập nội dung dài (như công thức `=VLOOKUP(...)`), nội dung sẽ tràn ngang sang các ô trống bên phải với `overflow: visible; z-index: 20` thay vì bị che khuất.

3. **VN Slides**:
   - Thêm tính năng kéo khung bao (Marquee Multi-Selection) trên canvas khi bấm giữ chuột trái ở vùng trống.
   - Thêm cơ chế kéo-thả chuột sắp xếp lại thứ tự slide trong thanh filmstrip bên trái kèm khả năng hoàn tác bằng Ctrl+Z.

4. **Tài liệu Hướng dẫn Sử dụng (Trợ giúp)**:
   - Bổ sung 3 bài viết hướng dẫn thao tác chuột chi tiết bằng tiếng Việt vào `platform/help/entries-writer.js`, `entries-sheet.js`, `entries-slides.js`.
   - Tuân thủ nghiêm ngặt quy định không chứa tên thương hiệu độc quyền ("Word", "Excel", "PowerPoint"), các mã lệnh khớp 100% với command registry.

---

## 4. Bằng chứng Vượt qua Mọi Test Gates
- `node tests/run-tests.js`: **2714/2714 PASS | 0 FAIL** (Suite 237 bổ sung đầy đủ cho toàn bộ logic mới).
- `node --experimental-websocket tests/live/cdp/mouse-ops.desktop.mjs`: **41/41 PASS | 0 FAIL**.
- `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`: **27/27 PASS | 0 FAIL | 0 BLOCKED**.
- `ch4-6-keep-focus.desktop.mjs`: **60/60 PASS | 0 FAIL**.
- `ctx-menu.desktop.mjs`: **14/14 PASS | 0 FAIL**.
- `sheet-format-state.desktop.mjs`: **10/10 PASS | 0 FAIL**.
- `doc-format-state.desktop.mjs`: **12/12 PASS | 0 FAIL**.
- `formula-hints.desktop.mjs`: **10/10 PASS | 0 FAIL**.
- `ruler.desktop.mjs`: **11/11 PASS | 0 FAIL**.
