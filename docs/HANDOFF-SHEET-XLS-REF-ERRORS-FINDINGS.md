# Báo cáo phát hiện lỗi: Sheet lưu .xls làm công thức `#REF!` thành `#N/A` và mất ô chuỗi rỗng

- **Worktree**: `E:\VNOffice-agy-xls-refs`
- **Branch**: `fix/sheet-xls-ref-errors-agy`
- **Tệp kiểm chứng**: `legacy06.xls` (từ `E:\VN OFice\file test\lan-legacy\legacy06.xls`)
- **Profile test**: `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"`

---

## 1. Kết quả đo ban đầu (Baseline)

Chạy:
```powershell
$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"
python scripts\layout-audit\_batch_xls_roundtrip.py . "E:\VN OFice\file test\lan-legacy" _out_xls legacy06.xls
```
- **Kết quả**: `cells: 185`, **`diff: 10`**
- **Chi tiết 10 ô lệch trên sheet "Nhà dân"**:
  - 9 ô công thức chứa tham chiếu hỏng `#REF!`:
    - `(19,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(21,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(23,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(25,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(28,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(29,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(30,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(31,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    - `(32,9)`: `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826246|=#N/A]`
    *(Ghi chú: `-2146826265` là mã lỗi Excel CVErr của `#REF!` [0x800A07E7]; `-2146826246` là mã lỗi Excel CVErr của `#N/A` [0x800A07FA])*.
  - 1 ô chuỗi rỗng:
    - `(22,3)`: `src=[|] saved=[]`

---

## 2. Truy vết chi tiết từng bước qua pipeline

### Bước 1: soffice .xls → FODS lúc mở (Import)
Chuyển đổi trực tiếp `legacy06.xls` thành `legacy06_direct.fods` bằng LibreOffice headless (`--convert-to fods`):
- **Tại các ô công thức cột 9 (hàng 19, 21, 23, 25, 28, 29, 30, 31, 32)**:
  LibreOffice Calc trích xuất công thức thành:
  ```xml
  <table:table-cell table:style-name="ce32"
                     table:formula="of:=[#REF!]-([#REF!]*[#REF!])"
                     office:value-type="string"
                     office:string-value=""
                     calcext:value-type="error">
    <text:p>#REF!</text:p>
  </table:table-cell>
  ```
  Nhận xét: LibreOffice Calc nhận diện đúng cú pháp ODF của tham chiếu hỏng là `[#REF!]`, gán `calcext:value-type="error"` và hiển thị `#REF!`.
- **Tại ô (22,3)**:
  Tệp gốc `legacy06.xls` chứa ô chuỗi rỗng có tiền tố `'` (`PrefixCharacter = "'"` trong Excel COM, `Value2 = ""`).
  LibreOffice Calc nhập ô này thành:
  ```xml
  <table:table-cell table:style-name="ce20">
    <draw:custom-shape ...>...</draw:custom-shape>
    <!-- 12 custom-shapes chứa hình vẽ ô checkbox -->
  </table:table-cell>
  ```
  Nhận xét: LibreOffice Calc nhập ô này như một ô rỗng có style và chứa các shape vẽ, **không** đặt `office:value-type="string"` hay `<text:p></text:p>`.

### Bước 2: VN Sheet nạp và xuất FODS khi Lưu (FODS app gửi)
Kiểm tra tệp `_rt_legacy06.xls.sent.fods` mà ứng dụng tạo ra khi gọi `Save As`:
- **Tại các ô cột 9**:
  ```xml
  <table:table-cell office:value-type="string"
                     table:formula="of:=#REF!-(#REF!*#REF!)"
                     vno:formula="=#REF!-(#REF!*#REF!)">
    <text:p>#REF!</text:p>
  </table:table-cell>
  ```
  - Trong `sheet-adapter.js`: hàm `_formulaFromOdf` chuyển `[#REF!]` thành `#REF!`. Nhưng khi chuyển ngược lại ở `_formulaToOdf`, regex tham chiếu `(\$?[A-Z]+\$?\d+)` không khớp `#REF!`, dẫn đến công thức xuất ra là `of:=#REF!-(#REF!*#REF!)` (thiếu dấu ngoặc vuông `[...]` của ODF).
  - Thuộc tính `calcext:value-type="error"` bị bỏ qua khi app serialize cell.
  - Ngoài ra, thẻ gốc `<office:document>` trong `sheet-adapter.js` thiếu khai báo `xmlns:loext`, làm cho một số trình phân tích XML chuẩn gặp lỗi `unbound prefix: loext` khi style có `loext:blank-width-char`.
- **Tại ô (22,3)**:
  App xuất ra:
  ```xml
  <table:table-cell table:style-name="vno_vs_10" />
  ```
  Do FODS lúc mở không có `value-type` hay text, app coi đây là ô trống chỉ có style.

### Bước 3: soffice FODS → .xls lúc xuất (Export)
Đã thử nghiệm hai trường hợp:
1. **Dùng `legacy06_direct.fods`** (FODS do chính LibreOffice xuất ra từ tệp gốc, có đầy đủ `of:=[#REF!]-([#REF!]*[#REF!])` và `calcext:value-type="error"`) chuyển đổi sang `.xls`:
   - Kết quả so sánh với `legacy06.xls`: **vẫn lệch đúng 10 ô y hệt**!
   - 9 ô `#REF!` đều bị LibreOffice biến thành `=#N/A` (giá trị `-2146826246`).
2. **Thử nghiệm các biến thể công thức trong FODS xuất ra .xls**:
   - `of:=#REF!` → Excel hiển thị `=#N/A`
   - `of:=[#REF!]` → Excel hiển thị `=#N/A`
   - `of:=[#REF!]-([#REF!]*[#REF!])` → Excel hiển thị `=#N/A`
   - Ô chỉ có giá trị text `#REF!` (không có formula): Excel hiển thị `#REF!` nhưng kiểu là `String`, không phải công thức.
   - Ô có `office:value-type="string"><text:p></text:p>`: Excel mở ra có `Value2 = ""` (chuỗi rỗng), khắc phục được mất ô chuỗi rỗng.

**Kết luận nguyên nhân gốc**:
Bộ lọc xuất nhị phân BIFF8 (`MS Excel 97`) của LibreOffice Calc khi gặp token `#REF!` hoặc `[#REF!]` trong biểu thức công thức không thể compile thành token `ptgRefErr` (0x2A) của BIFF8. LibreOffice Calc gặp lỗi biên dịch công thức và tự động hạ cấp toàn bộ công thức thành `=#N/A`.

### Bước 4: Kiểm tra khi Lưu thành .xlsx (OOXML)
Đã chuyển đổi cả `legacy06_direct.fods` và `_rt_legacy06.xls.sent.fods` sang `.xlsx` bằng filter `Calc MS Excel 2007 XML`:
- So sánh `legacy06_direct.xlsx` với `legacy06.xls` bằng Excel COM:
  - **Lệch duy nhất 1 ô**: `Nhà dân!22,3 src=[|] saved=[]`!
  - **Tất cả 9 ô công thức `#REF!` đều được giữ nguyên 100%**:
    `src=[-2146826265|=#REF!-(#REF!*#REF!)] saved=[-2146826265|=#REF!-(#REF!*#REF!)]`.
- So sánh `_rt_legacy06.xls.sent.xlsx` với `legacy06.xls`:
  - **Cũng chỉ lệch duy nhất 1 ô** `(22,3)`. Cả 9 ô `#REF!` đều giữ đúng công thức và giá trị.

**Khẳng định**: Lỗi `#REF!` biến thành `#N/A` **CHỈ xảy ra với định dạng .xls (BIFF8)** qua bộ lọc `MS Excel 97` của LibreOffice. Định dạng .xlsx hoàn toàn không bị lỗi này.
