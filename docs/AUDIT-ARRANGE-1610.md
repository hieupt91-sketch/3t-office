# Báo cáo đối chiếu: Sắp xếp đối tượng VN Sheet khớp Excel 2016 (Z-Order, Align, Distribute, Group, Rotate/Flip, Selection Pane)

**Ngày thực hiện:** 16/10/2026  
**Thực hiện bởi:** agy  
**Worktree:** `E:\VNOffice-agy-arrange` (nhánh `feat/sheet-arrange-agy`)  
**Công cụ đối chiếu:** `scripts/audit-0610/structural_oracle.mjs` + `structural_oracle.ps1` (Microsoft Excel 2016 COM thật).

---

## 1. Tổng quan công việc

Đã triển khai trọn vẹn 5 nhóm tính năng sắp xếp đối tượng đồ họa (ảnh, hình vẽ, hộp văn bản) của VN Sheet trên thanh công cụ Ribbon tab **Bố trí trang** (Page Layout) khớp chuẩn Microsoft Excel 2016:

1. **Thứ tự lớp Z-Order (`bringToFront`, `bringForward`, `sendBackward`, `sendToBack`)**:
   - Chuyển `imageLayer` và `textBoxLayer` sang `z-index: auto` để chia sẻ chung stacking context cha, cho phép ảnh và hộp văn bản xếp lớp đè chéo nhau chuẩn xác theo `drawingOrderBySheet`.
   - Cài đặt 4 thao tác lớp: đưa lên đỉnh (front), tiến 1 lớp (forward), lùi 1 lớp (backward), xuống đáy (back).
   - Lưu trữ và phục hồi thứ tự z-order qua thuộc tính mở rộng `vno:drawing-order` trong FODS và drawing XML trong OOXML (`ooxml_zip_patch.py`).

2. **Căn chỉnh nhiều đối tượng (Align) và Phân bố đều (Distribute)**:
   - Căn lề: Căn trái (`alignLeft`), Căn giữa ngang (`alignCenter`), Căn phải (`alignRight`), Căn trên (`alignTop`), Căn giữa dọc (`alignMiddle`), Căn dưới (`alignBottom`) theo bounding box tổng thể của các đối tượng được chọn.
   - Phân bố đều: Phân bố đều ngang (`distributeHorizontal`) và Phân bố đều dọc (`distributeVertical`) với khoảng cách giữa các mép hình được chia đều nhau tự động: `gap = (totalSpan - sumMiddleSize) / (N - 1)`.
   - Tọa độ sau căn chỉnh khớp chuẩn Excel với sai số $\le 0.5$ pt (thực tế đạt sai số $0.00$ pt đối với các tọa độ chuẩn hóa).

3. **Nhóm và Bỏ nhóm (Group & Ungroup)**:
   - Nhóm nhiều đối tượng thành một khối duy nhất (`groupObjects`), gán `groupId` cho các thành viên và quản lý qua `groupsBySheet`.
   - Di chuyển khối, ẩn hiện khối, đổi cỡ và xóa như một đối tượng thống nhất.
   - Tách nhóm (`ungroupObjects`), khôi phục từng đối tượng con về đúng vị trí z-order ban đầu không để lại phần tử rác.
   - Bảo toàn nhóm qua thẻ `vno:groups` trong FODS và thẻ `<xdr:grpSp>` trong bản vẽ OOXML.

4. **Xoay 90° và Lật đối xứng (Rotate & Flip)**:
   - Xoay 90° sang phải (`rotateRight90`), xoay 90° sang trái (`rotateLeft90`).
   - Lật ngang (`flipHorizontal`) và Lật dọc (`flipVertical`) qua CSS transform `scaleX(-1)` / `scaleY(-1)` và thuộc tính `flipH` / `flipV`.
   - Bảo toàn góc xoay `rot` (đơn vị $1/60000$ độ trong drawingML) và cờ lật `flipH`/`flipV` khi lưu và mở lại.

5. **Ngăn chọn trực quan (Selection Pane)**:
   - Thanh công cụ trượt bên phải hiển thị danh sách đối tượng theo thứ tự lớp từ trên xuống dưới (đỉnh ở trên, đáy ở dưới).
   - Chọn đơn hoặc chọn đa đối tượng (giữ Ctrl/Shift).
   - Nút bật/tắt hiển thị nhanh (biểu tượng con mắt) cho từng hình, nút "Hiện tất cả" và "Ẩn tất cả".
   - Cho phép nhấp đúp để đổi tên trực tiếp đối tượng (`renameObject`).
   - Nút Đưa lên / Hạ xuống ở đầu thanh ngăn chọn giúp sắp đặt nhanh thứ tự lớp.

6. **Tài liệu Hướng dẫn sử dụng & Giao diện chuẩn mực**:
   - Viết bài Trợ giúp tiếng Việt chi tiết `sheet.arrange.help` trong `platform/help/entries-sheet.js`, không chứa tên thương mại cấm, nâng độ phủ Help Sheet lên 189/189 lệnh (100%).
   - Đầy đủ chuỗi song ngữ i18n VI/EN trong `strings-vi.js` và `strings-en.js`.
   - Thiết kế giao diện CSS đạt 100% tỷ lệ tương phản WCAG AA (màu hover `#b91c1c` đạt 6.4:1 trên nền trắng).

---

## 2. Bảng đối chiếu kịch bản `structural-cases-10.json` (Excel 2016 COM)

| STT | Tên kịch bản | Thao tác kiểm tra | Excel 2016 (COM thật) | VN Sheet trước | VN Sheet sau | Kết quả |
|---|---|---|---|---|---|---|
| 1 | `arrange zorder bring send` | Đưa Box1 lên trên cùng (`bringToFront`), sau đó lùi 1 lớp (`sendBackward`) | Box3 ở đỉnh (z=3), Box1 ở giữa (z=2), Box2 ở đáy (z=1) | Không có drawing order, textBox luôn đè ảnh | Box3 z=3, Box1 z=2, Box2 z=1 | **PASS** (3/3 shapes) |
| 2 | `arrange align multi shapes` | Chọn 3 hình S1, S2, S3 căn lề trái (`alignLeft`) và căn trên (`alignTop`) | Cả 3 hình có Left = 30 pt, Top = 30 pt | Không có tính năng căn lề đối tượng | Cả 3 hình Left = 30 pt, Top = 30 pt (sai số 0 pt) | **PASS** (3/3 shapes) |
| 3 | `arrange distribute horizontal and vertical` | Phân bố đều ngang và dọc cho 3 hình D1, D2, D3 | D1(30, 30), D2(90, 75), D3(150, 120); khoảng cách giữa các mép chia đều chuẩn xác | Không có tính năng phân bố đều | D1(30, 30), D2(90, 75), D3(150, 120); sai số $\le 0.00$ pt | **PASS** (3/3 shapes) |
| 4 | `arrange group and ungroup` | Nhóm G1, G2 thành GroupA, sau đó rã nhóm (`ungroup`) | GroupA giải phóng, trả lại 2 hình G1 và G2 độc lập | Không có cơ chế nhóm/bỏ nhóm | G1 và G2 độc lập, đúng vị trí và thứ tự z-order | **PASS** (2/2 shapes) |
| 5 | `arrange rotate and flip` | Xoay R1 90°, lật ngang và lật dọc R2 (`flipHorizontal`, `flipVertical`) | R1 Rotation = 90°; R2 FlipH = True, FlipV = True | Chưa hỗ trợ xoay lật ảnh/textbox | R1 Rotation = 90°; R2 FlipH = True, FlipV = True | **PASS** (2/2 shapes) |
| 6 | `arrange selection visibility and rename` | Ẩn V1 qua Selection Pane; đổi tên V2 thành RenamedV2 | V1 Visible = False; V2 đổi tên thành RenamedV2 | Chưa có Selection Pane, không ẩn/đổi tên được | V1 Visible = False; RenamedV2 tồn tại | **PASS** (2/2 shapes) |

**Tổng số ô & thuộc tính đối chiếu:** 21/21 điểm đối chiếu khớp tuyệt đối (6/6 kịch bản PASS 100%).

---

## 3. Những phần không so được trực tiếp trong sổ tạm (Limitations & Assumptions)

1. **Hiển thị giao diện trực quan của Ngăn chọn (Selection Pane DOM)**:
   - Excel 2016 COM thông qua `Worksheet.Shapes` không cung cấp API giao diện để đọc trạng thái mở/đóng của panel Selection Pane bên cạnh trang tính.
   - Giải pháp: Trạng thái mở/đóng (`isSelectionPaneOpen`), cấu trúc DOM của thanh ngăn chọn (danh sách `<ul><li>`, nút con mắt ẩn/hiện, ô sửa tên inline `input`) được kiểm thử tự động chuyên sâu thông qua unit test DOM và CSS audit (`tests/unit/sheet-arrange.test.js`).

2. **Quy đổi hệ tọa độ điểm (Point) sang Pixel (Px)**:
   - Excel COM làm việc bằng đơn vị Point (1 pt = 1/72 inch).
   - VN Sheet DOM hiển thị bằng đơn vị Pixel với tỷ lệ chuẩn hóa màn hình $96\text{ DPI}$: $1\text{ pt} = 4/3\text{ px}$ (hay $1\text{ px} = 0.75\text{ pt}$).
   - Trong oracle script, các giá trị tọa độ được chuyển đổi tương hỗ với độ chính xác làm tròn 2 chữ số thập phân, đảm bảo sai số đo đạc luôn nhỏ hơn ngưỡng cho phép $\le 0.5\text{ pt}$.

3. **Cơ chế lưu nhóm hình vẽ trong OOXML**:
   - Khi lưu tệp `.xlsx`, nhóm hình vẽ được đóng gói dưới dạng `<xdr:grpSp>` chứa các hình vẽ con.
   - Để tránh phá vỡ định dạng khi người dùng không sửa đổi hình vẽ, hệ thống áp dụng cơ chế bảo toàn nguyên vẹn drawing gốc (`_restore_untouched_drawings_step`), và chỉ can thiệp patch các thuộc tính `rot`, `flipH`, `flipV`, `hidden`, `name` khi có thao tác chỉnh sửa thật từ người dùng.

---

## 4. Tổng kết nghiệm thu

- **Đối chiếu Excel 2016 COM thật (`scripts/audit-0610/structural_oracle.mjs`)**:
  - `tests/functions/structural-cases-10.json`: **6/6 PASS** (21/21 điểm đối chiếu khớp tuyệt đối).
  - `tests/functions/structural-cases-8.json`: **26/26 PASS** (189/189 ô khớp).
  - `tests/functions/structural-cases-7.json`: **14/14 PASS** (47/47 ô khớp).
- **Bộ kiểm thử toàn hệ thống (`npm test`)**:
  - **3423/3423 PASS** (100%, 0 FAIL, suite 266 `Sheet Arrange` đạt 7/7 ca kiểm thử).
- **Kiểm toán công thức (`sheet_formulas_vs_cache.mjs`)**:
  - `lan04.xlsx`: **100.00%** (49/49 công thức khớp tuyệt đối).
  - `lan28.xlsx`: **98.55%** (271/275 công thức khớp, vượt mốc chuẩn 98.18%).
- **Kiểm tra lưu mở 10 tệp LAN batch (`batch_document_audit.py`)**:
  - 10 tệp `lan01`, `lan02`, `lan04`, `lan06`, `lan09`, `lan11`, `lan22`, `lan26`, `lan13`, `lan19` đều đạt: `saved=yes`, `diffs=0`, `lint=clean`, `excel=PASS`.
- **Kiểm tra quy chuẩn kiến trúc**:
  - Không vi phạm tỷ lệ tương phản màu WCAG AA (0 lỗi).
  - 100% lệnh ribbon Sheet có định nghĩa trong `COMMAND_DEFINITIONS` và có handler trong `sheetAdapter`.
  - Không chứa bất kỳ tên thương mại độc quyền cấm ("Word", "Excel", "PowerPoint") trong mã nguồn, chuỗi đa ngữ, hoặc nội dung Help.
