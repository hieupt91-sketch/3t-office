# Báo cáo đối chiếu: Chốt điền (AutoFill Handle), Tùy chọn Tự điền và Kéo-thả ô VN Sheet khớp Excel 2016

**Ngày thực hiện:** 16/10/2026  
**Thực hiện bởi:** agy  
**Worktree:** `E:\VNOffice-agy-autofill` (nhánh `feat/sheet-autofill-agy`)  
**Công cụ đối chiếu:** `scripts/audit-0610/structural_oracle.mjs` + `structural_oracle.ps1` (Microsoft Excel 2016 COM thật).

---

## 1. Tổng quan công việc

1. **Nhấp đúp chốt điền (AutoFill Handle Double-Click)**:
   - Cài đặt thuật toán xác định biên giới hạn điền `_getAdjacentFillEndRow(src)` chuẩn xác theo Excel 2016:
     - **Ưu tiên cột bên trái**: Nếu cột bên trái có dữ liệu liền kề (ngay tại dòng `src.end.r + 1`), quét vùng liên tục và dừng ở ô trống liền kề đầu tiên.
     - **Cột bên phải**: Nếu cột bên trái trống, tự động chuyển sang xét cột liền kề bên phải theo cùng quy tắc dừng ô trống.
     - **Bảng dữ liệu (Excel Table)**: Nếu vùng chọn nằm trong bảng dữ liệu, tự động điền xuống đến hết hàng dữ liệu cuối cùng của bảng (`table.ref`), bỏ qua hàng tổng (Totals row) nếu có.
   - Gắn sự kiện `dblclick` trên phần tử chốt điền `.vno-cell-autofill-handle` gọi trực tiếp `_autofillDownToAdjacentData()`.
   - Toàn bộ quá trình điền được ghi nhận lịch sử hoàn tác Undo đúng một bước (1-step Ctrl+Z).

2. **Nút và Menu Tùy chọn Tự điền (Auto Fill Options)**:
   - Sau khi hoàn thành thao tác kéo hoặc nhấp đúp chốt điền, nút nổi `.vno-autofill-options-btn` xuất hiện cố định tại góc dưới bên phải vùng đích vừa điền.
   - **Thao tác phím & chuột**:
     - Nhấp chuột trái vào nút hoặc nhấn phím `Ctrl` (khi phím tắt `Ctrl` được nhấn sau điền) sẽ mở bảng menu `.vno-autofill-options-menu`.
     - Phím mũi tên Lên/Xuống điều hướng qua lại giữa các tùy chọn radio.
     - Phím `Enter` áp dụng tùy chọn được chọn; phím `Esc` đóng menu.
     - Tự động đóng và dọn dẹp khi người dùng chọn ô khác (`selectCell`), chuyển trang tính (`switchSheet`), bắt đầu thao tác di chuyển hoặc cuộn trang.
   - **Các chế độ điền chuẩn Excel**:
     - *Sao chép ô* (`copy` / `xlFillCopy`): Sao chép nguyên vẹn giá trị và công thức từ vùng nguồn.
     - *Điền chuỗi* (`series` / `xlFillSeries`): Tiếp nối dãy số, chuỗi ký tự có đuôi số hoặc công thức hồi quy.
     - *Chỉ điền định dạng* (`formats` / `xlFillFormats`): Chỉ sao chép kiểu dáng (phông, viền, màu nền), khôi phục và giữ nguyên toàn bộ giá trị ban đầu của ô đích.
     - *Điền không định dạng* (`withoutFormats` / `xlFillWithoutFormats`): Điền giá trị/công thức nhưng giữ nguyên định dạng ban đầu của ô đích. Đối với số đơn lẻ, bảo toàn hành vi sao chép không định dạng như Excel.
     - *Điền ngày* (`days` / `xlFillDays`): Tăng dần từng ngày theo lịch chuẩn.
     - *Điền ngày làm việc* (`weekdays` / `xlFillWeekdays`): Tăng dần ngày làm việc, tự động bỏ qua Thứ Bảy và Chủ Nhật (ví dụ Thứ Sáu 16/10 nhảy sang Thứ Hai 19/10).
     - *Điền tháng* (`months` / `xlFillMonths`): Tăng dần theo tháng, tự động xử lý ngày cuối tháng (31/01 -> 28/02 -> 31/03 -> 30/04).
     - *Điền năm* (`years` / `xlFillYears`): Tăng dần theo năm, tự động điều chỉnh năm nhuận (29/02/2024 -> 28/02/2025).
     - *Điền nhanh* (`flash` / `xlFlashFill`): Kích hoạt Flash Fill dựa trên quy luật mẫu đã có của bảng tính.

3. **Giữ Ctrl khi kéo chốt điền (Đảo chiều Sao chép <-> Điền chuỗi)**:
   - Tự động nhận diện phím `Ctrl` (hoặc `Meta` trên macOS) trong suốt quá trình kéo chốt điền:
     - Số đơn lẻ: Bình thường sao chép (10 -> 10, 10); giữ Ctrl chuyển thành điền chuỗi (10 -> 11, 12, 13).
     - Chuỗi số (2 số trở lên): Bình thường điền chuỗi (1, 2 -> 3, 4); giữ Ctrl chuyển thành sao chép lặp lại (1, 2 -> 1, 2).
     - Chữ có số đuôi: Bình thường tăng số ("Mục 1" -> "Mục 2"); giữ Ctrl chuyển thành sao chép ("Mục 1" -> "Mục 1").
     - Ngày tháng: Bình thường tăng ngày; giữ Ctrl sao chép giữ nguyên ngày.
   - Con trỏ chuột cập nhật trạng thái visual `copy` kèm dấu cộng nhỏ khi giữ Ctrl.

4. **Kéo-thả viền vùng chọn (Cell Drag-Drop Move, Copy, Insert)**:
   - Gắn tay cầm di chuyển `.vno-cell-move-handle` cho toàn bộ 4 cạnh (trên, dưới, trái, phải) của vùng chọn hoặc ô đơn.
   - **Di chuyển ô (Move)**:
     - Kéo viền đến vị trí mới và thả chuột: Dữ liệu ô nguồn được chuyển sang đích.
     - Toàn bộ công thức tham chiếu trong sổ làm việc trỏ tới vùng nguồn được tự động cập nhật chính xác sang vùng đích thông qua `_updateReferencesForMove` (tương tự thao tác Cắt - Dán).
     - Các công thức tương đối bên trong khối di chuyển được giữ nguyên quan hệ nội bộ.
   - **Sao chép ô (Ctrl + Kéo viền)**:
     - Giữ Ctrl khi kéo viền: Ô nguồn được bảo toàn nguyên vẹn; ô đích nhận bản sao với công thức được tịnh tiến tương đối theo độ lệch hàng/cột (`_offsetFormula`).
   - **Chèn ô (Shift + Kéo viền)**:
     - Giữ Shift khi kéo viền: Hiển thị thanh chỉ thị chèn `.is-insert-preview-top` hoặc `.is-insert-preview-left`.
     - Khi thả chuột, các ô dữ liệu lân cận được đẩy xuống dưới (Shift Cells Down) hoặc đẩy sang phải (Shift Cells Right) thay vì ghi đè lên dữ liệu cũ.
   - **Chuyển tab trang tính (Alt + Kéo viền)**:
     - Giữ Alt và rê chuột qua thanh tab trang tính (`.vno-sheet-tab-item`) để tự động chuyển trang tính đích trước khi thả chuột.
   - Mọi thao tác di chuyển, sao chép và chèn ô đều được ghi nhận vào lịch sử hoàn tác `_recordHistory` dạng `batch-cells` với đúng 1 bước Undo/Redo.

5. **CDP & Con trỏ chuột (Cursors)**:
   - Toàn bộ tương tác chạy hoàn toàn thông qua DOM/CDP, không sử dụng SendKeys hay tương tác bàn phím OS cấp thấp.
   - CSS `.vno-cell-autofill-handle` hiển thị con trỏ `crosshair` chuẩn xác.
   - CSS `.vno-cell-move-handle` hiển thị con trỏ `move` 4 hướng.
   - Class `.is-ctrl-copy` chuyển con trỏ sang dạng `copy` kèm biểu tượng dấu cộng.

6. **Tài liệu Hướng dẫn sử dụng & i18n**:
   - Thêm 2 bài Hướng dẫn sử dụng chi tiết bằng tiếng Việt trong `platform/help/entries-sheet.js`:
     - *Chốt điền và Tùy chọn Tự điền* (`sheet.edit.autofill`)
     - *Kéo-thả ô* (`sheet.edit.dragDrop`)
     - Tuyệt đối không dùng tên thương hiệu độc quyền bị cấm theo Điều 10 `AGENTS.md`.
   - Bổ sung chuỗi song ngữ tiếng Việt & tiếng Anh trong `platform/i18n/strings-vi.js` và `platform/i18n/strings-en.js`.

---

## 2. Bảng đối chiếu kịch bản `structural-cases-13.json`

| STT | Tên kịch bản | Hành vi kiểm tra | Excel 2016 (COM thật) | VN Sheet trước | VN Sheet sau | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | `autofill_copy_numbers` | AutoFill 1 số đơn với `fillType: "copy"` | A1: 10 -> A2: 10, A3: 10, A4: 10 | Chưa hỗ trợ `fillType` trong autoFill | A1: 10, A2: 10, A3: 10, A4: 10 | **PASS** (4/4 ô) |
| 2 | `autofill_without_formats_single_num` | AutoFill 1 số đơn với `withoutFormats` | A1: 10 -> A2: 10, A3: 10 | Điền thành series (11, 12) | Giữ nguyên bản sao giá trị 10, 10 | **PASS** (3/3 ô) |
| 3 | `autofill_without_formats_series` | AutoFill chuỗi 2 số với `withoutFormats` | A1: 1, A2: 2 -> A3: 3, A4: 4 | Không giữ được định dạng đích | Tăng chuỗi 3, 4 không đổi style | **PASS** (4/4 ô) |
| 4 | `autofill_series_step` | AutoFill chuỗi số cách bậc với `fillType: "series"` | A1: 2, A2: 5 -> A3: 8, A4: 11, A5: 14 | Chưa hỗ trợ `fillType` | A3: 8, A4: 11, A5: 14 | **PASS** (5/5 ô) |
| 5 | `autofill_series_single` | AutoFill số đơn thành chuỗi tăng dần | A1: 10 -> A2: 11, A3: 12, A4: 13 | Chỉ sao chép 10 | Tăng chuỗi 11, 12, 13 | **PASS** (4/4 ô) |
| 6 | `autofill_copy_text_numbered` | Sao chép chuỗi chữ đuôi số | A1: "Item 1" -> A2: "Item 1", A3: "Item 1", A4: "Item 1" | Tự động tăng số Item 2 | Sao chép nguyên "Item 1" | **PASS** (4/4 ô) |
| 7 | `autofill_series_text_numbered` | Điền chuỗi chữ đuôi số | A1: "Item 1" -> A2: "Item 2", A3: "Item 3", A4: "Item 4" | Tăng chuỗi | Tăng chuỗi "Item 2", "Item 3", "Item 4" | **PASS** (4/4 ô) |
| 8 | `autofill_right_series` | Điền chuỗi ngang sang phải (Fill Right) | A1: 1, B1: 2 -> C1: 3, D1: 4, E1: 5 | Chưa hỗ trợ điền ngang linh hoạt | C1: 3, D1: 4, E1: 5 | **PASS** (5/5 ô) |
| 9 | `autofill_right_copy` | Sao chép ngang sang phải với `fillType: "copy"` | A1: 1, B1: 2 -> C1: 1, D1: 2 | Tăng số | Lặp lại chu kỳ 1, 2 | **PASS** (4/4 ô) |
| 10 | `autofill_move_cells_with_formula` | Di chuyển ô có công thức ngoài tham chiếu vào | B1 ban đầu `=A1+A2`. Sau khi chuyển A1:A2 sang D1, B1 thành `=D1+D2` = 30 | B1 giữ nguyên tham chiếu cũ làm hỏng dữ liệu | B1 tự cập nhật thành `=D1+D2`, giá trị 30 | **PASS** (4/4 ô) |
| 11 | `autofill_move_2d_block` | Di chuyển khối 2D (A1:B2) sang D3:E4 | C1 ban đầu `=A1+B1`. Sau khi chuyển, C1 thành `=D3+E3` = 30 | Bị mất liên kết công thức | C1 tự cập nhật thành `=D3+E3`, giá trị 30 | **PASS** (5/5 ô) |
| 12 | `autofill_copy_cells_with_formula` | Sao chép ô chứa công thức tương đối | B1: `=A1*2`. Sao chép sang B2: `=A2*2` = 40 | Chưa có op copyCells | B2 nhận `=A2*2`, tính đúng 40 | **PASS** (3/3 ô) |

---

## 3. Những phần không so được trực tiếp trong sổ tạm (Limitations & Assumptions)

1. **Hiển thị Menu và Nút nổi trong môi trường headless/batch**:
   - Khi chạy qua bộ đối chiếu `structural_oracle.ps1` (Excel COM chạy ẩn/batch), Excel tự động thực thi các hàm API như `Range.AutoFill(dest, fillType)` mà không kích hoạt cửa sổ popup Windows của giao diện Office thật.
   - Trong VN Sheet, logic được phân tách rõ ràng:
     - Lớp lõi xử lý dữ liệu `_executeAutofill` và `_executeCellMove` thực thi toàn bộ thuật toán khớp 100% với các mã hằng số Excel (`xlFillCopy`, `xlFillSeries`, `xlFillFormats`, `xlFillWithoutFormats`, v.v.).
     - Lớp giao diện DOM (`_showAutofillOptionsButton`, `_toggleAutofillOptionsMenu`, các sự kiện bàn phím/chuột) được kiểm thử tự động toàn diện thông qua bài kiểm thử hành vi chuyên biệt `tests/unit/sheet-autofill-drag.test.js`.

2. **Chụp trạng thái con trỏ chuột hệ điều hành (OS Cursors)**:
   - Các thuộc tính CSS như `cursor: crosshair`, `cursor: move`, `cursor: copy` được quản lý trực tiếp trên các lớp CSS và DOM event listeners của ứng dụng. Môi trường batch oracle COM của Excel không cung cấp API truy vấn con trỏ chuột hệ điều hành theo thời gian thực.
   - Tiêu chí này được kiểm chứng qua cấu trúc CSS trong `apps/sheet/sheet.css` và bài kiểm thử con trỏ trong Suite 269.

3. **Chuyển tab trang tính bằng phím Alt (Alt + Drag)**:
   - Thao tác kéo rê chuột qua thanh tab trang tính khi đang giữ phím Alt là một tính năng tương tác UI trực tiếp của người dùng. Trong môi trường kiểm thử batch, thao tác này được kiểm chứng qua sự kiện kích hoạt `switchSheet(targetSheet)` khi tọa độ chuột chạm vào phần tử tab.

---

## 4. Tổng kết nghiệm thu

- **`tests/functions/structural-cases-13.json`**: 12/12 PASS (49/49 ô khớp tuyệt đối Excel 2016 COM).
- **`tests/functions/structural-cases-1..8.json`**: 123/123 PASS (816/816 ô khớp tuyệt đối Excel 2016 COM, không có bất kỳ suy thoái nào).
- **Bộ kiểm thử toàn Suite (`npm test`)**: 3499/3499 PASS (100%, 0 FAIL). Đã bổ sung Suite 269: `tests/unit/sheet-autofill-drag.test.js` (14/14 test cases PASS).
- **Kiểm toán công thức thực tế**:
  - `lan04.xlsx`: 49/49 công thức khớp (100.00%).
  - `lan28.xlsx`: 271/275 công thức khớp (98.55%, vượt mốc chuẩn bắt buộc 98.18%).
- **Trợ giúp & i18n**:
  - Đầy đủ 2 bài hướng dẫn tiếng Việt chi tiết trong `platform/help/entries-sheet.js`, không chứa bất kỳ từ ngữ hay thương hiệu độc quyền nào.
  - Đầy đủ chuỗi song ngữ VI/EN trong `platform/i18n/strings-vi.js` và `platform/i18n/strings-en.js`.
  - Kiểm tra `tests/unit/help-coverage.test.js` và `tests/unit/ai-features-batch2.test.js` đạt 100% PASS.
- **Tuân thủ quy tắc kiến trúc**:
  - Không vi phạm boundary monorepo; không dùng SendKeys hay process kill theo tên.
  - Toàn bộ thay đổi bảo đảm tính toàn vẹn dữ liệu, hoàn tác Undo đúng 1 bước chuẩn xác.
