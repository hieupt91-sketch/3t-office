# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Công thức" (Formulas) — Sheet

- **Nhánh**: `design/sheet-formulas-tab-agy` (tách từ `main`)
- **Worktree**: `E:\VNOffice-agy-formulas-tab`
- **Phạm vi**: Giao diện trực quan (Ribbon, CSS, Markup, Hộp thoại Name Manager / Insert Function / Watch Window / Error Checking / Evaluate Formula, Icon-mapping, i18n, Responsive, Hướng dẫn sử dụng). Tuyệt đối không can thiệp logic đo lường, phân trang hay công thức tính toán của Sheet adapter; không chạm vào các file của agent khác đang làm song song (`writer-adapter.js`, `sheet-adapter.js`, `ooxml_zip_patch.py`, `sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/*`).

---

## 1. Đối chiếu thực tế với Microsoft Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu trực tiếp với chuẩn giao diện **Microsoft Excel 2016 Professional Plus**. Ảnh chụp thực tế Ribbon và các hộp thoại của VN Sheet được lưu giữ tại thư mục audit (`docs/formulas-tab-audit-screenshots/`).

### 1.1. Tab "Formulas" của Excel 2016 thật
1. **Function Library**:
   - Nút lớn Insert Function ($f_x$).
   - AutoSum (hỗ trợ Sum, Average, Count Numbers, Max, Min).
   - Recently Used, Financial, Logical, Text, Date & Time, Lookup & Reference, Math & Trig, More Functions.
2. **Defined Names**:
   - Nút lớn Name Manager (Ctrl+F3) kèm dialog launcher ở góc dưới nhóm.
   - Define Name, Use in Formula, Create from Selection (Ctrl+Shift+F3).
3. **Formula Auditing**:
   - Trace Precedents, Trace Dependents, Remove Arrows.
   - Show Formulas (Ctrl+`), Error Checking, Evaluate Formula.
   - Nút lớn Watch Window.
4. **Calculation**:
   - Calculation Options (Automatic / Manual).
   - Calculate Now (F9), Calculate Sheet (Shift+F9).

### 1.2. Tab "Công thức" của VN Sheet hiện có
1. **Hàm tính toán (`functionLibrary`)**:
   - Nút lớn Chèn hàm ($f_x$, Shift+F3) mở hộp thoại catalog 96 hàm thật.
   - Cột 1: AutoSum (Alt+=), Trung bình, Đếm số.
   - Cột 2: Tài chính, Logic, Văn bản.
   - Cột 3: Ngày & Giờ, Tra cứu & Tham chiếu, Toán & Lượng giác.
   - Cột 4: Thêm hàm, Lớn nhất, Nhỏ nhất.
   - Đã bổ sung Dialog Launcher góc dưới phải mở hộp thoại Chèn hàm ($f_x$).
2. **Tên đã xác định (`definedNames`)**:
   - Nút lớn Quản lý tên (mở Trình quản lý tên).
   - Cột: Đặt tên vùng, Dùng trong công thức, Tạo từ vùng chọn (Ctrl+Shift+F3).
   - Đã bổ sung Dialog Launcher góc dưới phải mở Trình quản lý tên.
3. **Kiểm tra công thức (`formulaAuditing`)**:
   - Cột 1: Tìm ô tiền lệ (vẽ mũi tên xanh dương #2563EB), Tìm ô phụ thuộc (vẽ mũi tên xanh lá #0F6D38), Xóa mũi tên.
   - Cột 2: Hiện công thức (Ctrl+`), Kiểm tra lỗi (quét lỗi #DIV/0!, #REF!...), Ước lượng công thức (mở hộp thoại tính từng bước).
   - Nút lớn Cửa sổ theo dõi (mở Watch Window neo góc phải dưới màn hình).
   - Đã bổ sung Dialog Launcher góc dưới phải mở Kiểm tra lỗi.
4. **Tính toán (`calculation`)**:
   - Hộp chọn chế độ: Tự động (Automatic) / Thủ công (Manual).
   - Cột: Tính lại toàn bộ (F9), Tính trang hiện tại (Shift+F9).
- **Đánh giá tương quan**: VN Sheet bao quát đầy đủ 100% các nhóm chức năng cốt lõi của Excel 2016 Formulas tab. Tất cả lệnh đều kết nối trực tiếp với engine tính toán và grid controller thật.

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Tràn ngang Ribbon trên màn hình 1024px (`hasOverflow: true`, chiều rộng 1109px > 1024px)** | **ĐÃ SỬA** | **Hiện trạng**: Tại độ phân giải 1024px (laptop nhỏ, tablet, máy chiếu), tab Công thức có độ rộng nội dung lên tới 1109px khiến nhóm "Tính toán" bị đẩy tràn ra ngoài khung nhìn, dropdown "Tự động (Automatic)" bị cắt cụt thành "Tự động (A...", nút "Tính trang hiện tại" bị che khuất.<br>**Nguyên nhân**: 4 cột nút nhỏ của nhóm Hàm tính toán mang nhãn dài ("Tra cứu & Tham chiếu", "Toán & Lượng giác") cộng với nhãn đầy đủ của nhóm Kiểm tra công thức và Tính toán chiếm quá nhiều không gian ngang.<br>**Giải pháp**: Bổ sung quy tắc responsive trong `platform/shell/shell.css` tại breakpoint `@media (max-width: 1150px)`: tự động thu gọn nhãn của 5 nút toán cơ bản (AutoSum, Trung bình, Đếm số, Lớn nhất, Nhỏ nhất), 3 nút kiểm tra công thức (Hiện công thức, Kiểm tra lỗi, Ước lượng công thức), nút Dùng trong công thức, và 2 nút tính lại thành icon buttons gọn gàng; thu gọn select Tính toán về `max-width: 95px`. Chiều rộng nội dung tab Công thức giảm từ 1109px xuống đúng **1024px (vừa khít 100%, `hasOverflow: false`)**, bảo tồn nguyên vẹn 100% DOM, tooltip title, commandId và accessibility. |
| 2 | **Thiếu thuộc tính `id` tường minh cho cả 4 nhóm Ribbon trong `sheet-ribbon.js`** | **ĐÃ SỬA** | **Hiện trạng**: 4 nhóm trên tab formulas chỉ khai báo `label` và `labelKey` mà thiếu trường `id`, khác biệt so với tất cả các tab khác (`home`, `insert`, `pageLayout`, `data`, `review`, `view`).<br>**Nguyên nhân**: Cấu hình tab formulas ban đầu chưa đồng nhất.<br>**Giải pháp**: Bổ sung đầy đủ `id: "functionLibrary"`, `id: "definedNames"`, `id: "formulaAuditing"`, `id: "calculation"` vào `apps/sheet/sheet-ribbon.js`. |
| 3 | **Thiếu Dialog Launcher trên các nhóm Ribbon của tab Công thức** | **ĐÃ SỬA** | **Hiện trạng**: Nhóm "Tên đã xác định", "Hàm tính toán" và "Kiểm tra công thức" chưa có nút launcher ở góc dưới bên phải như chuẩn Excel 2016.<br>**Giải pháp**: Bổ sung `launcherCommandId` và `launcherTooltip` tương ứng trong `sheet-ribbon.js`: `sheet.formula.insertFunction` ("Chèn hàm (Shift+F3)"), `sheet.formula.nameManager` ("Trình quản lý tên (Ctrl+F3)"), và `sheet.formula.errorChecking` ("Kiểm tra lỗi công thức"). Icon launcher vector sắc nét hiển thị đồng bộ ở chân mỗi nhóm. |
| 4 | **Nút "Thêm mới", "Sửa", "Xóa" trong hộp thoại Trình quản lý tên thiếu styling button** | **ĐÃ SỬA** | **Hiện trạng**: Trong hộp thoại Quản lý tên (`.vno-name-manager`), 3 nút trong `.vno-name-actions` mang class `.vno-btn` nhưng thiếu CSS định hình đường viền, màu nền và padding, trông như 3 đoạn text trần nằm liền kề nhau.<br>**Nguyên nhân**: Thiếu quy tắc CSS cho `.vno-name-actions .vno-btn` trong `apps/sheet/sheet.css`.<br>**Giải pháp**: Bổ sung styling chuẩn trong `apps/sheet/sheet.css`: `padding: 6px 14px; border: 1px solid var(--vno-border-default); border-radius: 4px; background: var(--vno-bg-surface); font-size: 13px; font-weight: 500; cursor: pointer; transition: background-color 0.15s ease, border-color 0.15s ease;` kèm hover và focus-visible. Cả 3 nút hiển thị rõ ràng, sắc nét và trang nhã. |
| 5 | **Bổ sung từ khóa ánh xạ Icon trong `components.js` (`resolveIcon`)** | **ĐÃ SỬA** | **Hiện trạng**: Nếu một nút command của Formulas tab được tạo mà không truyền trực tiếp tên icon, `resolveIcon` chưa có các từ khóa fallback cho các lệnh formulas, dẫn đến nguy cơ rơi vào fallback dot circle `●`.<br>**Giải pháp**: Đã bổ sung toàn bộ ánh xạ từ khóa trong `resolveIcon` (`platform/ui-kit/components.js`) cho: `insertfunction`, `countnumbers`, `maxfunction`, `minfunction`, `namemanager`, `definename`, `useinformula`, `createfromselection`, `traceprecedents`, `tracedependents`, `removearrows`, `showformulas`, `errorchecking`, `watchwindow`, `evaluateformula`, `calculatesheet`, `calculationoptions`, `formula.recalculate`, và 7 danh mục `category*`. |
| 6 | **Đồng bộ nội dung Hướng dẫn sử dụng (Help entries)** | **ĐÃ SỬA** | **Hiện trạng**: Mục hướng dẫn Kiểm tra công thức trong `platform/help/entries-sheet.js` liệt kê cột giữa chỉ gồm "Hiện công thức / Kiểm tra lỗi", chưa nhắc đến "Ước lượng công thức" đang hiện diện trên Ribbon.<br>**Giải pháp**: Cập nhật mô tả trong `entries-sheet.js` thành "cột Hiện công thức / Kiểm tra lỗi / Ước lượng công thức", đảm bảo nội dung trợ giúp mô tả chính xác 100% giao diện thực tế. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ các nút lệnh và Command ID trên tab Công thức (25 lệnh):
- `sheet.formula.insertFunction`: Mở hộp thoại catalog 96 hàm (Shift+F3).
- `sheet.formula.sum`: Chèn công thức SUM tự động (Alt+=).
- `sheet.formula.average`, `countNumbers`, `max`, `min`: Chèn công thức hàm tương ứng vào ô đang chọn.
- `sheet.formula.categoryFinancial`, `categoryLogical`, `categoryText`, `categoryDateTime`, `categoryLookup`, `categoryMath`, `categoryMore`: Mở hộp thoại Chèn hàm fx đã lọc sẵn danh mục tương ứng.
- `sheet.formula.nameManager`: Mở hộp thoại Trình quản lý tên.
- `sheet.formula.defineName`: Mở hộp thoại Đặt tên vùng (Define Name).
- `sheet.formula.useInFormula`: Mở hộp thoại chèn tên vùng vào thanh công thức (hoặc mở Trình quản lý tên nếu chưa có tên).
- `sheet.formula.createFromSelection`: Tự động tạo named ranges từ tiêu đề hàng trên cùng (Ctrl+Shift+F3).
- `sheet.formula.tracePrecedents`: Vẽ mũi tên xanh dương (#2563EB) chỉ từ các ô tiền lệ tới ô công thức.
- `sheet.formula.traceDependents`: Vẽ mũi tên xanh lá (#0F6D38) chỉ tới các ô phụ thuộc.
- `sheet.formula.removeArrows`: Xóa sạch mũi tên truy vết trên lưới.
- `sheet.formula.showFormulas`: Bật/tắt chế độ hiển thị chuỗi công thức thay vì kết quả (Ctrl+`).
- `sheet.formula.errorChecking`: Quét toàn bộ bảng tính và mở hộp thoại thông báo ô lỗi hoặc xác nhận không có lỗi.
- `sheet.formula.evaluateFormula`: Mở hộp thoại ước lượng từng bước công thức đang chọn.
- `sheet.formula.watchWindow`: Mở cửa sổ floating theo dõi giá trị ô quan trọng khi cuộn.
- `sheet.calc.calculationOptions`: Chọn chế độ tính Tự động (Automatic) hoặc Thủ công (Manual).
- `sheet.formula.recalculate`: Tính lại toàn bộ công thức trên sổ làm việc (F9).
- `sheet.calc.calculateSheet`: Tính lại toàn bộ công thức trên sheet hiện tại (Shift+F9).
- *Kết quả*: **100% lệnh đều có handler thật**, kết nối chặt chẽ với grid controller và calculation engine. Không có nút chết hay TODO rỗng.

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries)

- `platform/help/entries-sheet.js`:
  - `sheet.formula.functionCategories` (dòng ~567): Mô tả chi tiết 7 danh mục hàm và nút Chèn hàm (Shift+F3), giải thích rõ các hàm trọng điểm trong 96 hàm catalog.
  - `sheet.formula.namedRanges` (dòng ~590): Mô tả chi tiết Quản lý tên, Đặt tên vùng, Dùng trong công thức và Tạo từ vùng chọn (Ctrl+Shift+F3).
  - `sheet.formula.auditing` (dòng ~610): Mô tả chi tiết Tìm ô tiền lệ (xanh dương), Tìm ô phụ thuộc (xanh lá), Xóa mũi tên, Hiện công thức (Ctrl+`), Kiểm tra lỗi, và Cửa sổ theo dõi.
  - `sheet.formula.calculation` (dòng ~632): Mô tả chi tiết chế độ Tự động / Thủ công, phím F9, Shift+F9 và Ctrl+Shift+Enter (công thức mảng).
  - `sheet.formula.evaluateFormula` (dòng ~822): Mô tả chi tiết từng bước tính toán, gạch chân/in nghiêng phần sắp tính, nút Bước vào / Bước ra / Khởi động lại.
- *Kết luận*: Toàn bộ 5 bài hướng dẫn bằng tiếng Việt chuẩn xác, cụ thể, không placeholder hay lorem ipsum.

---

## 5. Danh mục file thay đổi

1. `apps/sheet/sheet-ribbon.js`: Bổ sung `id` và `launcherCommandId`/`launcherTooltip` cho các nhóm trong tab Công thức.
2. `apps/sheet/sheet.css`: Thêm styling chuẩn nút bấm cho `.vno-name-actions .vno-btn` trong hộp thoại Trình quản lý tên.
3. `platform/shell/shell.css`: Bổ sung quy tắc responsive breakpoint `<= 1150px` cho tab Công thức để loại bỏ hoàn toàn tràn ngang ở 1024px.
4. `platform/ui-kit/components.js`: Bổ sung từ khóa fallback cho toàn bộ các lệnh Formulas trong hàm `resolveIcon`.
5. `platform/help/entries-sheet.js`: Đồng bộ mô tả cột nút nhóm Kiểm tra công thức gồm Ước lượng công thức.
6. `docs/formulas-tab-audit-screenshots/`: Lưu giữ đầy đủ ảnh chụp thực tế ribbon và 8 hộp thoại chức năng ở 1440px và 1024px.

---

## 6. Kết quả kiểm thử

- `node tests/run-tests.js`: **1834 / 1834 PASS (100%)**, `0 FAIL`.
- Kiểm tra Playwright thực tế trên Microsoft Edge:
  - Màn hình rộng (1440px): Ribbon hiển thị trọn vẹn 4 nhóm, icon vector sắc nét, không cuộn ngang (`contentScrollWidth: 1440`, `hasOverflow: false`).
  - Màn hình hẹp (1024px): Các nút phụ thu gọn nhịp nhàng thành icon buttons, nhóm Tính toán và dropdown hiển thị nguyên vẹn, vừa vặn 100% (`contentScrollWidth: 1024`, `hasOverflow: false`).
  - Hộp thoại: Chèn hàm, Trình quản lý tên, Đặt tên vùng, Cửa sổ theo dõi, Kiểm tra lỗi, Ước lượng công thức mở/đóng mượt mà, form controls và các nút bấm chuẩn kích thước.
