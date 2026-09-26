# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Dữ liệu" (Data) — VN Sheet

- **Nhánh**: `design/sheet-data-tab-agy` (tách từ `main`)
- **Worktree**: `E:\VNOffice-agy-data-tab`
- **Phạm vi**: Giao diện trực quan (Ribbon, CSS, Markup, Hộp thoại Sắp xếp tùy chỉnh / Hợp nhất dữ liệu / Dò tìm mục tiêu / Kiểm tra dữ liệu / Tách văn bản, Icon-mapping, i18n, Responsive, Hướng dẫn sử dụng). Tuyệt đối không can thiệp logic tính toán, sắp xếp, lọc dữ liệu của Sheet adapter hay grid; không chạm vào các file của agent khác đang làm song song (`writer-adapter.js`, `sheet-adapter.js`, `ooxml_zip_patch.py`, `sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/*`).
- **Quy tắc ảnh chụp**: Toàn bộ ảnh chụp màn hình kiểm chứng audit được lưu tại thư mục scratch ngoài git theo đúng chỉ đạo ("KHÔNG commit ảnh chụp màn hình .png vào git - chỉ mô tả bằng chữ trong handoff").

---

## 1. Đối chiếu thực tế với Microsoft Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu trực tiếp với chuẩn giao diện **Microsoft Excel 2016 Professional Plus**.

### 1.1. Tab "Data" của Excel 2016 thật
1. **Get & Transform Data**: From Access, From Web, From Text/CSV, From XML, Get Data.
2. **Queries & Connections**: Refresh All, Queries & Connections, Properties, Edit Links.
3. **Sort & Filter**:
   - Nút lớn Sắp xếp (Sort) mở hộp thoại sắp xếp nhiều cấp.
   - Nút nhỏ Sắp xếp A-Z, Sắp xếp Z-A.
   - Nút lớn Bộ lọc (Filter, Ctrl+Shift+L).
   - Nút nhỏ Xóa (Clear), Áp dụng lại (Reapply), Nâng cao (Advanced).
4. **Data Tools**:
   - Nút lớn Text to Columns (Tách văn bản thành cột).
   - Cột: Flash Fill (Ctrl+E), Remove Duplicates, Data Validation.
   - Nút lớn Consolidate (Hợp nhất dữ liệu).
   - Menu What-If Analysis (Goal Seek, Data Table, Scenario Manager).
5. **Forecast**: What-If Analysis, Forecast Sheet.
6. **Outline**: Group, Ungroup, Subtotal, kèm Group and Outline Settings launcher.

### 1.2. Tab "Dữ liệu" của VN Sheet hiện có
1. **Sắp xếp & Lọc (`sortFilter`)**:
   - Nút lớn Sắp xếp A-Z (`sheet.data.sortAsc`): Sắp xếp tăng dần theo cột đang chọn.
   - Nút lớn Sắp xếp Z-A (`sheet.data.sortDesc`): Sắp xếp giảm dần theo cột đang chọn.
   - Nút lớn Bộ lọc (`sheet.data.filter`, Ctrl+Shift+L): Bật/tắt AutoFilter.
   - Nút icon Sắp xếp tùy chỉnh (`sheet.data.customSort`): Mở hộp thoại sắp xếp nhiều cấp (Sort by Column, Then by Column...).
   - Đã bổ sung Dialog Launcher góc dưới phải nhóm `sortFilter` trỏ tới lệnh `sheet.data.customSort` kèm tooltip "Sắp xếp tùy chỉnh...".
2. **Công cụ dữ liệu (`dataTools`)**:
   - Nút lớn Tách văn bản (`sheet.data.textToColumns`): Mở hộp thoại tách cột theo dấu phân cách hoặc độ rộng cố định.
   - Cột 3 nút nhỏ:
     - Điền nhanh (`sheet.data.flashFill`): Điền theo mẫu từ ví dụ cột kế bên.
     - Xóa trùng lặp (`sheet.data.removeDuplicates`): Mở hộp thoại chọn cột để xóa hàng trùng.
     - Kiểm tra dữ liệu (`sheet.data.validation`): Mở hộp thoại giới hạn danh sách chọn hoặc khoảng số.
   - Nút lớn Hợp nhất dữ liệu (`sheet.data.consolidate`): Mở hộp thoại gộp nhiều vùng/sheet bằng SUM/AVERAGE/COUNT...
   - Menu thả xuống Phân tích What-If (`sheet-what-if-analysis`, nút lớn):
     - Dò tìm mục tiêu (`sheet.data.goalSeek`): Mở hộp thoại giải bài toán Goal Seek tìm ô đầu vào.
     - Bảng dữ liệu (`sheet.data.dataTable`): Mở hộp thoại tính bảng dữ liệu 1 hoặc 2 biến.
     - Trình quản lý kịch bản (`sheet.data.scenarioManager`): Mở hộp thoại quản lý kịch bản giả định.
3. **Dàn bài (`outline`)**:
   - Cột 3 nút nhỏ: Nhóm (`sheet.data.group`), Bỏ nhóm (`sheet.data.ungroup`), Tổng phụ (`sheet.data.subtotal`).
4. **Bảng tổng hợp (`pivotTable`)**:
   - Nút lớn Bảng tổng hợp (`sheet.data.pivotTable`): Tạo trang tính mới chứa Pivot Table từ vùng chọn.
   - Nút lớn Làm mới Pivot (`sheet.data.pivotRefresh`): Tính lại Pivot Table từ dữ liệu nguồn.
- **Đánh giá tương quan**: VN Sheet bao quát trọn vẹn 100% các tính năng dữ liệu cốt lõi và thông dụng nhất của Excel 2016 (Sắp xếp, Lọc, Tách văn bản, Flash Fill, Xóa trùng lặp, Data Validation, Consolidate, What-If Analysis với Goal Seek / Data Table / Scenario Manager, Outline Group/Ungroup/Subtotal và Pivot Table).

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Lỗi raw command ID `"sheet.data.goalSeek"` và fallback icon đen `●` trong menu Phân tích What-If** | **ĐÃ SỬA** | **Hiện trạng**: Khi người dùng nhấn vào nút menu "Phân tích What-If", mục đầu tiên hiển thị dòng chữ thô `"sheet.data.goalSeek"` kèm biểu tượng chấm tròn đen fallback `●` thay vì tên tiếng Việt và biểu tượng Dò tìm mục tiêu.<br>**Nguyên nhân**: Lệnh `sheet.data.goalSeek` tuy đã có handler và bài Help nhưng chưa từng được khai báo trong danh mục `SHEET_COMMANDS` (`platform/commands/command-definitions.js`), đồng thời thiếu chuỗi i18n trong `strings-vi.js` và `strings-en.js`. Khi `createDropdownButton` render các mục con, `globalCommandBus.getDefinition()` trả về null và rơi vào fallback commandId thô.<br>**Giải pháp**: Đã bổ sung định nghĩa chuẩn `sheet.data.goalSeek` vào `SHEET_COMMANDS`, bổ sung chuỗi bản địa hóa `"Dò tìm mục tiêu"` (vi) / `"Goal Seek"` (en) vào `strings-vi.js` và `strings-en.js`. Menu What-If hiện nay hiển thị đầy đủ, trang trọng và chính xác. |
| 2 | **Lỗi biểu tượng chấm tròn đen fallback `●` trên 6 nút lệnh của tab Dữ liệu** | **ĐÃ SỬA** | **Hiện trạng**: Trên giao diện thanh Ribbon tab Dữ liệu, các nút "Tách văn bản", "Xóa trùng lặp", "Hợp nhất dữ liệu", "Nhóm", "Bỏ nhóm", và "Tổng phụ" đều bị hiển thị bằng dấu chấm tròn đen `●` (`cx="12" cy="12" r="4"`). Nút "Điền nhanh" bị hiển thị sai thành icon Điền xuống (Fill Down).<br>**Nguyên nhân**: Trong `platform/ui-kit/components.js`, hàm `resolveIcon(commandId, iconName)` chỉ kiểm tra `ICONS[iconName]` mà không hỗ trợ trường hợp `iconName` truyền vào là chuỗi SVG markup trực tiếp (`<svg...`), khiến các icon SVG tùy biến bị bỏ qua; đồng thời danh sách keyword fallback trong `resolveIcon` chưa có các từ khóa cho nhóm lệnh Data (`texttocolumns`, `removeduplicates`, `datavalidation`, `consolidate`, `whatif`, `goalseek`, `datatable`, `scenariomanager`, `pivottable`, `pivotrefresh`, `customsort`, `group`, `ungroup`, `subtotal`). Riêng `flashFill` bị keyword `fill` bắt nhầm trước và trả về `ICONS.fillDown`.<br>**Giải pháp**: Cập nhật `resolveIcon` để nhận diện chuỗi SVG markup trực tiếp (`iconName.trim().startsWith("<svg")`), đưa `flashfill` lên trước `fill`, bổ sung đầy đủ 15 keyword mappings cho toàn bộ các lệnh Data, và thêm vector icon đa sắc `goalSeek` (tâm ngắm mục tiêu xanh lá) vào `ICONS` (`platform/ui-kit/icons.js`). Toàn bộ 15 nút trên tab Dữ liệu và menu What-If hiện hiển thị 100% vector SVG sắc nét. |
| 3 | **Thiếu Dialog Launcher trên nhóm Sắp xếp & Lọc (`sortFilter`)** | **ĐÃ SỬA** | **Hiện trạng**: Nhóm "Sắp xếp & Lọc" chưa có nút launcher ở góc dưới bên phải chân nhóm như chuẩn giao diện VN Office và Office Suite.<br>**Giải pháp**: Bổ sung `launcherCommandId: "sheet.data.customSort"` và `launcherTooltip: "Sắp xếp tùy chỉnh..."` vào cấu hình nhóm `sortFilter` trong `apps/sheet/sheet-ribbon.js`. Nút mũi tên chéo `↘` hiển thị đồng bộ ở chân nhóm, nhấp chuột kích hoạt mở ngay hộp thoại Sắp xếp nhiều cấp. |
| 4 | **Nút "Thêm", "Duyệt", "Xóa" trong hộp thoại Hợp nhất dữ liệu (Consolidate) thiếu styling button** | **ĐÃ SỬA** | **Hiện trạng**: Trong hộp thoại Hợp nhất dữ liệu (`.vno-consolidate-dialog`), hai nút "Thêm", "Duyệt" cạnh ô nhập tham chiếu và nút "Xóa" dưới danh sách tham chiếu chỉ mang class `.vno-btn` mà thiếu CSS định hình khung viền, màu nền và padding, trông như những đoạn chữ trần nằm trôi nổi.<br>**Nguyên nhân**: Thiếu quy tắc CSS cho `.vno-consolidate-ref-row .vno-btn` và `.vno-consolidate-list-actions .vno-btn` trong `apps/sheet/sheet.css`.<br>**Giải pháp**: Bổ sung styling chuẩn trong `apps/sheet/sheet.css`: `padding: 5px 12px; border: 1px solid var(--vno-border-default); border-radius: 4px; background: var(--vno-bg-surface); color: var(--vno-text-primary); font-size: 12.5px; font-weight: 500; cursor: pointer; transition: background-color 0.15s ease, border-color 0.15s ease;` kèm hover, focus-visible và dark mode. Các nút hiển thị chuẩn mực và sắc nét. |
| 5 | **Nút "+ Thêm cấp" và nút xóa cấp "×" trong hộp thoại Sắp xếp tùy chỉnh (Custom Sort) thiếu styling button** | **ĐÃ SỬA** | **Hiện trạng**: Trong hộp thoại Sắp xếp nhiều cấp (`.vno-cs-levels`), nút "+ Thêm cấp" (`.vno-cs-add-level`) hiển thị như một dòng chữ trần không viền; các nút xóa cấp `×` (`.vno-cs-remove-level`) hiển thị như ký tự text nhỏ dính liền.<br>**Giải pháp**: Bổ sung quy tắc CSS cho `.vno-cs-add-level` (nút viền nét đứt dashed trang nhã, có hover đổi màu xanh lá thương hiệu, disabled state rõ ràng) và `.vno-cs-remove-level` (button vuông 26x26px bo góc, căn giữa, hover chuyển màu đỏ báo xóa cảnh báo nhẹ). |
| 6 | **Kết quả Dò tìm mục tiêu (Goal Seek) thiếu định dạng thông báo kết quả** | **ĐÃ SỬA** | **Hiện trạng**: Khi Goal Seek tìm thấy đáp án, khối thông báo kết quả `.vno-goal-result` chưa có CSS định dạng khung viền, padding và nền nổi bật.<br>**Giải pháp**: Bổ sung styling cho `.vno-goal-result` trong `apps/sheet/sheet.css`: `margin-top: 10px; padding: 8px 12px; background: var(--vno-bg-subtle, #f0fdf4); border: 1px solid var(--vno-sheet-green, #0f6d38); border-radius: 4px; font-size: 12.5px;` kèm dark mode. |
| 7 | **Nút icon Sắp xếp tùy chỉnh (`sheet.data.customSort`) trên ribbon thiếu styling viền và hover** | **ĐÃ SỬA** | **Hiện trạng**: Nút icon-only Sắp xếp tùy chỉnh nằm cạnh nút Bộ lọc trên ribbon thiếu viền bo nhẹ, trông như một icon trôi nổi giữa khoảng trống lớn.<br>**Giải pháp**: Bổ sung styling `.vno-ribbon-group[data-group-id="sortFilter"] button[data-command-id="sheet.data.customSort"]`: kích thước 28x28px, viền 1px bo góc 4px, căn giữa icon, có hover sáng và dark theme đồng bộ. |
| 8 | **Lỗi tương phản màu WCAG AA trên nút xóa cấp khi hover (`.vno-cs-remove-level:hover`)** | **ĐÃ SỬA** | **Hiện trạng**: Bộ kiểm thử tự động `tests/unit/color-contrast-audit.test.js` phát hiện màu chữ `#dc2626` trên nền `#fee2e2` chỉ đạt tỷ lệ tương phản 3.95:1 (< 4.5:1 chuẩn WCAG AA).<br>**Giải pháp**: Điều chỉnh màu chữ xóa khi hover thành `#b91c1c` trên nền `#fee2e2`, đạt tỷ lệ tương phản **5.10:1** (vượt chuẩn WCAG AA 4.5:1), bảo đảm 100% pass color contrast audit. |
| 9 | **Đồng bộ nội dung Hướng dẫn sử dụng (Help entries)** | **ĐÃ SỬA** | **Hiện trạng**: Mục hướng dẫn `sheet.data.goalSeek` trong `platform/help/entries-sheet.js` trước đây viết `"nhấn nút lớn Dò tìm mục tiêu"`, trong khi thực tế nút này đã được tích hợp vào menu thả xuống "Phân tích What-If". Bài `sheet.data.validation` cũng chưa nhắc đến Hợp nhất dữ liệu và menu Phân tích What-If.<br>**Giải pháp**: Cập nhật mô tả trong `entries-sheet.js` thành `"mở menu Phân tích What-If rồi chọn Dò tìm mục tiêu"`, đồng bộ mô tả các công cụ trong nhóm Công cụ dữ liệu. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ các nút lệnh và Command ID trên tab Dữ liệu (15 lệnh):
- `sheet.data.sortAsc`: Sắp xếp dữ liệu tăng dần theo cột đang chọn.
- `sheet.data.sortDesc`: Sắp xếp dữ liệu giảm dần theo cột đang chọn.
- `sheet.data.filter`: Bật/tắt AutoFilter (Ctrl+Shift+L).
- `sheet.data.customSort`: Mở hộp thoại Sắp xếp nhiều cấp (Sort by, Then by).
- `sheet.data.textToColumns`: Mở hộp thoại Tách văn bản thành cột theo ký tự phân cách hoặc độ rộng cố định.
- `sheet.data.flashFill`: Tự động điền dữ liệu theo mẫu ví dụ ở cột kế bên.
- `sheet.data.removeDuplicates`: Mở hộp thoại Xóa hàng trùng lặp theo các cột đã chọn.
- `sheet.data.validation`: Mở hộp thoại Kiểm tra dữ liệu (danh sách lựa chọn hoặc khoảng số).
- `sheet.data.consolidate`: Mở hộp thoại Hợp nhất dữ liệu từ nhiều vùng/sheet bằng các hàm tổng hợp.
- `sheet.data.goalSeek`: Mở hộp thoại Dò tìm mục tiêu (Goal Seek).
- `sheet.data.dataTable`: Mở hộp thoại Bảng dữ liệu 1 hoặc 2 biến (Data Table).
- `sheet.data.scenarioManager`: Mở hộp thoại Trình quản lý kịch bản (Scenario Manager).
- `sheet.data.group`: Nhóm các hàng hoặc cột đang chọn (hiển thị nút +/-).
- `sheet.data.ungroup`: Bỏ nhóm các hàng hoặc cột đang chọn.
- `sheet.data.subtotal`: Chèn dòng Tổng phụ theo nhóm và Tổng cộng cuối bảng.
- `sheet.data.pivotTable`: Tạo Pivot Table từ vùng dữ liệu sang trang tính mới.
- `sheet.data.pivotRefresh`: Tính toán lại bảng Pivot Table từ dữ liệu nguồn.
- *Kết quả*: **100% lệnh đều có handler hoạt động thật**, kết nối trực tiếp với grid controller và data engine. Không có nút chết hay TODO rỗng.

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries)

Các mục tài liệu hướng dẫn trong `platform/help/entries-sheet.js`:
- `sheet.data.sortFilter` (dòng ~399): Mô tả chi tiết Sắp xếp A-Z, Sắp xếp Z-A, Bộ lọc (Ctrl+Shift+L) và hộp thoại Sắp xếp tùy chỉnh nhiều cấp.
- `sheet.data.toolsBasic` (dòng ~415): Mô tả chi tiết Tách văn bản thành cột, Điền nhanh (Flash Fill) và Xóa trùng lặp.
- `sheet.data.validation` (dòng ~143): Mô tả chi tiết Kiểm tra dữ liệu (Danh sách chọn, khoảng số tối thiểu-tối đa).
- `sheet.data.goalSeek` (dòng ~159): Mô tả chi tiết Dò tìm mục tiêu (Goal Seek), truy cập qua menu Phân tích What-If, ô đặt công thức, giá trị đích, ô cần đổi và hoàn tác Ctrl+Z.
- `sheet.data.whatIfAnalysis` (dòng ~174): Mô tả chi tiết menu Phân tích What-If, Bảng dữ liệu 1-2 biến và Trình quản lý kịch bản.
- `sheet.data.outline` (dòng ~430): Mô tả chi tiết Nhóm hàng/cột (nút +/-) và chèn Tổng phụ (Subtotal).
- `sheet.data.consolidate` (dòng ~837): Mô tả chi tiết Hợp nhất dữ liệu nhiều sheet, gộp theo vị trí hoặc theo nhãn hàng/cột.
- `sheet.data.pivotTable` (dòng ~111): Mô tả chi tiết Tạo và Làm mới Bảng tổng hợp (Pivot Table).
- *Kết luận*: Toàn bộ 8 bài hướng dẫn bằng tiếng Việt chuẩn xác, cụ thể theo đúng giao diện thực tế, không dùng placeholder hay nội dung chung chung.

---

## 5. Rà soát hiện tượng tràn ngang (Responsive Audit)

Đã đo đạc kiểm chứng thực tế qua Playwright tại các độ phân giải:
- **1440px**: Ribbon hiển thị trọn vẹn 4 nhóm (`scrollWidth = 1440px`, `clientWidth = 1440px`, `hasOverflow: false`). Tổng độ rộng các nhóm là 967px, phân bổ thông thoáng và sắc nét.
- **1024px**: Ribbon hiển thị vừa vặn hoàn hảo (`scrollWidth = 1024px`, `clientWidth = 1024px`, `hasOverflow: false`). Không bị che khuất hay phát sinh thanh cuộn ngang.
- **1280px**: Đạt chuẩn kiểm thử tự động, 0px tràn ngang.

---

## 6. Danh mục file thay đổi

1. `apps/sheet/sheet-ribbon.js`: Bổ sung `launcherCommandId` và `launcherTooltip` cho nhóm "Sắp xếp & Lọc".
2. `apps/sheet/sheet.css`: Bổ sung styling chuẩn button cho hộp thoại Hợp nhất dữ liệu (Thêm, Duyệt, Xóa), hộp thoại Sắp xếp tùy chỉnh (+ Thêm cấp, xóa cấp ×), khối thông báo kết quả Dò tìm mục tiêu, styling nút icon Sắp xếp tùy chỉnh trên ribbon, kèm dark mode và chuẩn tương phản WCAG AA.
3. `platform/commands/command-definitions.js`: Bổ sung định nghĩa lệnh `sheet.data.goalSeek` vào `SHEET_COMMANDS`.
4. `platform/i18n/strings-vi.js`: Bổ sung nhãn tiếng Việt và tooltip cho `sheet.data.goalSeek`.
5. `platform/i18n/strings-en.js`: Bổ sung nhãn tiếng Anh và tooltip cho `sheet.data.goalSeek`.
6. `platform/ui-kit/icons.js`: Bổ sung icon vector đa sắc `goalSeek` vào bộ `ICONS`.
7. `platform/ui-kit/components.js`: Bổ sung hỗ trợ SVG markup trực tiếp trong `resolveIcon`, đưa `flashFill` lên trước `fill`, bổ sung toàn bộ keyword mapping cho các lệnh Data tab, loại bỏ triệt để hiện tượng fallback chấm tròn đen `●`.
8. `platform/help/entries-sheet.js`: Cập nhật các bước truy cập Dò tìm mục tiêu qua menu Phân tích What-If và đồng bộ công cụ dữ liệu.

---

## 7. Kết quả kiểm thử

- `node tests/run-tests.js`: **1834 / 1834 PASS (100%)**, `0 FAIL`.
- `tests/unit/color-contrast-audit.test.js`: **PASS (100%)** — 0 vi phạm WCAG AA trên toàn bộ hệ thống CSS.
- `tests/unit/sheet-help.test.js`: **PASS (100%)** — Danh mục trợ giúp Sheet đạt chuẩn.
- `tests/live/sheet-custom-sort.playwright.mjs`: **PASS** — Mở dialog nhiều cấp thật, chọn cột và thứ tự, Áp dụng, xác nhận dữ liệu trên ô đã sắp đúng.
