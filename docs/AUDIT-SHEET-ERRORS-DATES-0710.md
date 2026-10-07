# BÁO CÁO CHẨN ĐOÁN: MÔ HÌNH LỖI VÀ NGÀY THÁNG TRONG VN SHEET (07/10/2026)

> **Mã ticket:** SB2 — Chẩn đoán (không sửa mã sản phẩm)  
> **Tài liệu bàn giao:** `docs/AUDIT-SHEET-ERRORS-DATES-0710.md`  
> **Mục tiêu:** Hiểu rõ mô hình lưu giá trị, lỗi và ngày tháng trong Sheet; đề xuất phương án sửa nhỏ nhất kèm danh sách rủi ro và các bài kiểm tra cần cập nhật/bổ sung.

---

## 1. BẢNG SỐ LIỆU ĐỐI CHIẾU HIỆN TRẠNG (CDP / UNIT TEST vs EXCEL)

| # | Phép thử / Ngữ cảnh | Công thức & Dữ liệu | Giá trị lưu (`val`) | Kết quả VN Sheet | Kết quả Excel chuẩn | Trạng thái | Điểm nghẽn cốt lõi |
|---|----------------------|----------------------|---------------------|-------------------|----------------------|------------|---------------------|
| 1 | Lỗi chia 0 | A1: `=1/0` | `"#DIV/0!"` (chuỗi) | `"#DIV/0!"` | `"#DIV/0!"` | PASS | Tính toán trực tiếp sinh mã lỗi đúng |
| 2 | Phép cộng sau DIV0 | A2: `=A1+1` (A1=`#DIV/0!`) | `1` (số) | `1` | `"#DIV/0!"` | **FAIL** | `getCellValue()` biến `"#DIV/0!"` thành `0`; `_evaluateArithmetic()` ép số |
| 3 | SUM chứa ô lỗi | `=SUM(A1, 1)` (A1=`#DIV/0!`) | `1` (số) | `1` | `"#DIV/0!"` | **FAIL** | `collectNumericValues()` lọc bỏ/ép số lỗi thành `0` |
| 4 | NA() qua phép cộng | A2: `=A1+1` (A1=`=NA()`) | `1` (số) | `1` | `"#N/A"` | **FAIL** | `_evaluateArithmetic()` dùng `Number(val) \|\| 0` -> biến `"#N/A"` thành `0` |
| 5 | Chuỗi qua phép cộng | A2: `=A1+1` (A1=`="x"+1`) | `1` (số) | `1` | `"#VALUE!"` | **FAIL** | Chuỗi không hợp lệ bị fallback về `0` thay vì báo `#VALUE!` |
| 6 | IF bỏ qua nhánh lỗi | `=IF(TRUE, 42, A1)` (A1=`#DIV/0!`) | `42` (số) | `42` | `42` | PASS | Nhánh ngắn mạch không tính `A1` |
| 7 | IF chọn nhánh lỗi | `=IF(FALSE, 42, A1)` (A1=`#DIV/0!`) | `0` (số) | `0` | `"#DIV/0!"` | **FAIL** | `_resolveSingleValue("A1")` gọi `getCellValue()` -> trả về `0` |
| 8 | Hàm DATE thường | `=DATE(2026,12,31)` | `"31/12/2026"` (chuỗi) | `"31/12/2026"` | `46387` | **FAIL** | `DATE()` trả chuỗi thô dd/mm/yyyy thay vì số serial Excel |
| 9 | Cộng ngày từ DATE | `=A1+1` (A1=`=DATE(2026,12,31)`) | `1` (số) | `1` | `46388` | **FAIL** | Chuỗi ngày bị `_evaluateArithmetic()` coi là không số -> gán `0 + 1 = 1` |
| 10 | Ô nhập tay ngày | Gõ tay `"31/12/2026"` | `46387` (số) | `31/12/2026` | `46387` (hiển thị 31/12/2026) | PASS | `_normalizeCellInput()` chuyển thành số serial và gắn `numFmt` |
| 11 | Hàm YEAR trên serial | `=YEAR(A1)` (A1=nhập tay `46387`) | `2026` (ngẫu nhiên) | `2026` | `2026` | **NGẦM LỖI** | `YEAR()` cắt theo `"/"`. Nếu không có `"/"`, trả về `new Date().getFullYear()` (năm 2026 hiện tại) |
| 12 | Hàm MONTH trên serial | `=MONTH(A1)` (A1=nhập tay `46387`) | `"#VALUE!"` (chuỗi) | `"#VALUE!"` | `12` | **FAIL** | `_parseDate()` chỉ parse chuỗi regex `dd/mm/yyyy`, không nhận số serial |

---

## 2. CHẨN ĐOÁN KỸ THUẬT CHI TIẾT

### 2.1. Lỗi được biểu diễn thế nào và ở đâu bị ép thành số 0?

1. **Biểu diễn lỗi trong hệ thống:**
   - **Định dạng dữ liệu:** Lỗi được lưu dưới dạng chuỗi nguyên bản (raw string): `"#DIV/0!"`, `"#N/A"`, `"#VALUE!"`, `"#REF!"`, `"#NUM!"`, `"#NAME?"`, `"#NULL!"`, `"#LỖI!"`.
   - **Hàm kiểm tra:** `FormulaEngine._isError(val)` (`apps/sheet/formula-engine.js`, dòng 306-308):
     ```javascript
     _isError(value) {
       return typeof value === "string" && /^#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|LỖI!)/.test(value);
     }
     ```
   - **Trong `cellsData` (Map ô tính của SheetGridController):** Ô chứa công thức lỗi lưu dạng `{ val: "#DIV/0!", formula: "=1/0", style: {} }`. Nghĩa là bản thân ô lưu đúng chuỗi lỗi.

2. **Các vị trí lỗi bị ép thành số 0:**

   - **Điểm 1: `FormulaEngine.getCellValue(coord, sheetName)` (`apps/sheet/formula-engine.js`, dòng 254-258)**
     - Khi một ô tham chiếu chứa lỗi `"#DIV/0!"`:
       ```javascript
       // Xử lý chuỗi tiền tệ VNĐ (vd: "25.000.000 ₫" -> loại bỏ dấu chấm hàng nghìn -> 25000000)
       const cleaned = raw.toString().replace(/\./g, "").replace(/[^\d-]/g, "");
       if (cleaned && !isNaN(Number(cleaned))) {
         return Number(cleaned);
       }
       ```
     - Vì chuỗi `"#DIV/0!"` có chứa chữ số `'0'`, biểu thức `.replace(/[^\d-]/g, "")` lọc bỏ mọi ký tự và giữ lại `"0"`.
     - `Number("0")` là `0` (hợp lệ, không phải `NaN`).
     - **Hệ quả:** `getCellValue("A1")` trả về **số 0** (number) thay vì chuỗi `"#DIV/0!"`. Lỗi bị nuốt chửng ngay tại tầng đọc giá trị ô. Điều này giải thích vì sao `IF(FALSE, 42, A1)` trả về `0` (dòng 1260 gọi `_resolveSingleValue("A1")` -> gọi `getCellValue("A1")` -> nhận được `0`).

   - **Điểm 2: `FormulaEngine._evaluateArithmetic(expr)` (`apps/sheet/formula-engine.js`, dòng 2018-2025)**
     - Trong biểu thức số học (ví dụ `=A1+1`):
       ```javascript
       let referenceError = false;
       const resolved = expr.replace(/(?:'(?:[^']|'')+'|[A-Za-zÀ-ỹ_][^\s!+\-*/()]*)!\$?[A-Z]+\$?\d+|\$?[A-Z]+\$?\d+/gi, (token) => {
         const reference = this._parseReference(token);
         const val = reference.error || this.getCellValue(reference.ref, reference.sheet);
         if (val === "#REF!") referenceError = true;
         return typeof val === "number" ? val : (Number(val) || 0);
       });
       if (referenceError) return "#REF!";
       ```
     - Tại đây:
       - Với `#DIV/0!`: `getCellValue()` đã trả về `0` (kiểu số) -> trả về `0`.
       - Với `#N/A`, `#VALUE!`, `#NUM!`, `#NAME?`: `val` là chuỗi lỗi. Nhánh `(Number(val) || 0)` chạy: `Number("#N/A")` ra `NaN`, và `NaN || 0` cho ra `0`.
       - Với chuỗi chữ không hợp lệ (ví dụ `"x"` trong `="x"+1`): `Number("x") || 0` cũng thành `0`.
       - Chỉ duy nhất `#REF!` được kiểm tra (`if (val === "#REF!") referenceError = true;`).
     - Sau khi thay thế, chuỗi `resolved` trở thành `"0+1"`, và `Function("return (0+1)")()` trả về số `1`.

   - **Điểm 3: `FormulaEngine.collectNumericValues()` và hàm `SUM` (`apps/sheet/formula-engine.js`, dòng 408-413, 714-722)**
     - Trong `collectNumericValues()` (dùng cho `PRODUCT`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `MEDIAN`, `ROUND`, v.v.):
       ```javascript
       collectNumericValues(args) {
         return this.collectValues(args)
           .filter(v => !(v && v.isTextCell))
           .map(v => typeof v === "number" ? v : Number(v.toString().replace(/[^\d.-]/g, "")))
           .filter(v => !isNaN(v));
       }
       ```
       Mọi lỗi đều bị chuyển thành chuỗi rỗng `""` (`Number("") = 0`) hoặc `"#DIV/0!"` thành `"0"` (`Number("0") = 0`).
     - Trong hàm `SUM`:
       ```javascript
       const rawValues = this.collectValues(args);
       if (rawValues.includes("#REF!")) return "#REF!";
       const nums = rawValues
         .filter(v => !(v && v.isTextCell))
         .map(v => typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, "")))
         .filter(v => !isNaN(v));
       const sum = nums.reduce((acc, v) => acc + v, 0);
       return sum;
       ```
       Chỉ kiểm tra `#REF!`. Tất cả các lỗi `#DIV/0!`, `#N/A`, `#VALUE!`, `#NUM!` đều biến thành số `0` và được cộng dồn vào tổng.

---

### 2.2. Các hàm ngày đang trả kiểu gì, ô nhập tay lưu gì, xuất XLSX ghi thế nào?

1. **Kiểu trả về của các hàm ngày tháng (`FormulaEngine`):**
   - `DATE(y, m, d)` (dòng 1506-1509): Trả về **chuỗi** `"dd/mm/yyyy"` qua `this._formatDate(date)`.
   - `TODAY()` (dòng 1496-1499): Trả về **chuỗi** `"dd/mm/yyyy"`.
   - `NOW()` (dòng 1501-1504): Trả về **chuỗi** `"dd/mm/yyyy HH:MM"`.
   - `EDATE(start, months)` (dòng 1532-1540): Trả về **chuỗi** `"dd/mm/yyyy"`.
   - `EOMONTH(start, months)` (dòng 1582-1587): Trả về **chuỗi** `"dd/mm/yyyy"`.
   - `WORKDAY(start, days, holidays)` (dòng 1566-1580): Trả về **chuỗi** `"dd/mm/yyyy"`.
   - `YEAR(date)` (dòng 1596-1600):
     ```javascript
     const val = String(this._resolveSingleValue(args[0]) || "");
     const parts = val.split("/");
     return parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
     ```
     Cắt chuỗi thô theo dấu `"/"`. Nếu đầu vào là số serial Excel (ví dụ `46387`), `parts.length` bằng 1, hàm ngầm trả về `new Date().getFullYear()` (năm 2026 hiện tại).
   - `MONTH(date)`, `DAY(date)`, `WEEKDAY(date)`, `DATEDIF(start, end, unit)`, `DAYS(end, start)`, `NETWORKDAYS(...)`:
     Đều gọi qua `this._parseDate()` (dòng 1926-1938). Hàm này chỉ parse regex ISO `YYYY-MM-DD` hoặc `DD/MM/YYYY`. **Không nhận số serial Excel**. Khi gặp số serial, trả về `null` -> dẫn tới lỗi `#VALUE!` hoặc `#NUM!`.

2. **Ô nhập tay ngày lưu gì?**
   - Khi người dùng nhập tay `"31/12/2026"`, `SheetGridController.setCellValue()` (`apps/sheet/sheet-grid.js`, dòng 5248) gọi `_normalizeCellInput()` (dòng 5333).
   - `_normalizeCellInput()` phát hiện `NumberFormatter.isDateInput(value)` là `true`:
     - Gán style: `nextStyle.numberFormat = { category: "date", dateFormat: "dd/mm/yyyy" }`.
     - Chuyển đổi giá trị: `NumberFormatter.normalizeInputForFormat()` gọi `_dateInputToSerial("31/12/2026")`.
     - `_dateInputToSerial()` tính theo mốc `Date.UTC(1899, 11, 30)` và trả về **số serial `46387`** (kiểu `number`).
   - Hiển thị trên thanh công thức: `_formulaBarTextFor()` format ngược serial thành `"31/12/2026"` để người dùng chỉnh sửa trực quan.
   - **Kết luận:** Ô nhập tay lưu **SỐ SERIAL (number) + `style.numberFormat` category "date"**.

3. **Xuất XLSX ghi thế nào? (Cơ chế FODS -> LibreOffice -> XLSX):**
   - Tuyến xuất: UI `cellsData` -> `SheetAdapter.serializeToFods()` (`adapters/libreoffice/sheet/sheet-adapter.js`) -> LibreOffice headless chuyển đổi FODS sang XLSX.
   - Trong `serializeToFods()` (dòng 3483-3524):
     - Kiểm tra: `isDateType = (category === "date" || category === "time")`.
     - Nếu `typeof item.val === "number"` và `isDateType`:
       - Chuyển `item.val` sang chuỗi ISO thông qua `_excelSerialToIsoDate(item.val)` (dòng 3500) -> ví dụ `"2026-12-31"`.
       - Ghi thẻ ODF: `<table:table-cell office:value-type="date" office:date-value="2026-12-31" table:style-name="...">`.
       - Khi LibreOffice lưu sang XLSX, Calc đọc thẻ `office:value-type="date"` và ghi ra cell XLSX đúng chuẩn: số serial `46387` kèm định dạng ngày (`numFmtId`).
     - **Tuy nhiên, với ô chứa công thức `=DATE(2026,12,31)`:**
       - Do `FormulaEngine.evaluate()` trả về chuỗi `"31/12/2026"`, `item.val` là kiểu `string`.
       - Ô không tự động được gán `category: "date"` trong `numberFormat`.
       - `typeof item.val === "number"` trả về `false`.
       - Rơi vào nhánh chuỗi thô (dòng 3525, 3567): Ghi `<table:table-cell office:value-type="string" table:formula="of:=DATE(2026;12;31)"><text:p>31/12/2026</text:p></table:table-cell>`.
       - Khi mở trong Excel, ô công thức bị ghi cached value kiểu chuỗi text, hoặc khi tính toán tiếp bị sai lệch kiểu dữ liệu.

---

## 3. PHƯƠNG ÁN SỬA NHỎ NHẤT (MINIMAL FIX PROPOSAL)

Để giải quyết triệt để 2 vấn đề trên mà không gây hồi quy (regression) và giảm thiểu số lượng dòng code thay đổi, đề xuất phương án can thiệp đúng 2 file như sau:

### Phương án A: Sửa lỗi không lan truyền (Error Propagation)

* **Vị trí 1: `apps/sheet/formula-engine.js` — Hàm `getCellValue` (dòng 236)**
  - *Thay đổi:* Ngăn việc trích xuất số tiền tệ khi giá trị ô là mã lỗi.
  - *Dòng đề xuất:* Ngay sau `if (!item) return 0; const raw = item.val || "";`, thêm:
    ```javascript
    if (this._isError(raw)) return raw;
    ```
  - *Hiệu quả:* Ngay lập tức chặn đứng việc biến `"#DIV/0!"` thành `0` khi đọc giá trị ô. Sửa luôn `IF(FALSE, 42, A1)` trả về đúng `"#DIV/0!"`.

* **Vị trí 2: `apps/sheet/formula-engine.js` — Hàm `_evaluateArithmetic` (dòng 2018-2025)**
  - *Thay đổi:* Lan truyền bất kỳ mã lỗi nào gặp trong các tham chiếu toán hạng, đồng thời trả `#VALUE!` nếu gặp chuỗi văn bản không thể ép kiểu sang số.
  - *Code hiện tại:*
    ```javascript
    let referenceError = false;
    const resolved = expr.replace(..., (token) => {
      const reference = this._parseReference(token);
      const val = reference.error || this.getCellValue(reference.ref, reference.sheet);
      if (val === "#REF!") referenceError = true;
      return typeof val === "number" ? val : (Number(val) || 0);
    });
    if (referenceError) return "#REF!";
    ```
  - *Sửa đổi nhỏ nhất:*
    ```javascript
    let propagatedError = null;
    const resolved = expr.replace(..., (token) => {
      const reference = this._parseReference(token);
      const val = reference.error || this.getCellValue(reference.ref, reference.sheet);
      if (this._isError(val)) {
        if (!propagatedError || val === "#N/A") propagatedError = val;
        return 0;
      }
      if (typeof val === "string" && val.trim() !== "" && isNaN(Number(val))) {
        if (!propagatedError) propagatedError = "#VALUE!";
        return 0;
      }
      return typeof val === "number" ? val : (Number(val) || 0);
    });
    if (propagatedError) return propagatedError;
    ```
  - *Hiệu quả:* `=A1+1` trả về đúng `"#DIV/0!"` (nếu A1 là DIV0), `"#N/A"` (nếu A1 là NA), `"#VALUE!"` (nếu A1 là VALUE hoặc `"x"`).

* **Vị trí 3: `apps/sheet/formula-engine.js` — Hàm `case "SUM":` và `collectNumericValues` (dòng 714-722, 408-413)**
  - *Thay đổi:* Trong `case "SUM":`, kiểm tra mã lỗi trong `rawValues`:
    ```javascript
    const err = rawValues.find(v => this._isError(v));
    if (err) return err;
    ```
    (Thay thế cho dòng `if (rawValues.includes("#REF!")) return "#REF!";`).
  - Tương tự trong `collectNumericValues` hoặc các hàm `AVERAGE`, `MIN`, `MAX`, `PRODUCT`: Kiểm tra và trả về mã lỗi nếu mảng đối số chứa lỗi.

* **Vị trí 4: `apps/sheet/formula-engine.js` — Hàm `_evaluateCondition` và `case "IF":` (dòng 1868, 1254)**
  - *Thay đổi:* Nếu điều kiện `condResult` là mã lỗi (`this._isError(condResult)`), trả về chính mã lỗi đó.

---

### Phương án B: Sửa DATE trả số serial và đồng bộ định dạng

* **Vị trí 1: `apps/sheet/formula-engine.js` — Helper `_dateToSerial(date)` và `case "DATE":` (dòng 1506-1509)**
  - *Thêm helper:*
    ```javascript
    _dateToSerial(date) {
      const epoch = Date.UTC(1899, 11, 30);
      const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      return Math.round((utc - epoch) / 86400000);
    }
    ```
  - *Sửa `case "DATE":`:*
    ```javascript
    case "DATE": {
      const date = new Date(Number(this._resolveSingleValue(args[0])), Number(this._resolveSingleValue(args[1])) - 1, Number(this._resolveSingleValue(args[2])));
      return Number.isNaN(date.getTime()) ? "#VALUE!" : this._dateToSerial(date);
    }
    ```
  - *Đồng bộ các hàm liên quan:* `TODAY()` trả `this._dateToSerial(new Date())`; `EDATE`, `EOMONTH`, `WORKDAY` trả số serial tương ứng thay vì gọi `this._formatDate()`.

* **Vị trí 2: `apps/sheet/formula-engine.js` — Hàm `_parseDate(value)` và `case "YEAR":` (dòng 1926-1938, 1596-1600)**
  - *Sửa `_parseDate(value)`:* Bổ sung xử lý khi `value` là số serial:
    ```javascript
    if (typeof value === "number" && Number.isFinite(value)) {
      if (value > 0 && value < 200000) {
        const epoch = Date.UTC(1899, 11, 30);
        return new Date(epoch + Math.round(value * 86400000));
      }
    }
    ```
  - *Sửa `case "YEAR":`:* Dùng `const date = this._parseDate(this._resolveSingleValue(args[0])); return date ? date.getFullYear() : "#VALUE!";` (thay vì tách chuỗi theo `"/"`).

* **Vị trí 3: `apps/sheet/sheet-grid.js` — Tự động áp dụng định dạng Ngày khi nhập công thức ngày (dòng 5244-5251)**
  - *Thay đổi:* Trong `setCellValue()`, khi ô nhận công thức bắt đầu bằng hàm ngày (`=DATE(`, `=TODAY(`, `=EDATE(`, `=EOMONTH(`, `=WORKDAY(`) và ô chưa có định dạng riêng (`!item.style?.numberFormat || item.style?.numberFormat?.category === "general"`):
    Gán `item.style.numberFormat = { category: "date", dateFormat: "dd/mm/yyyy" };`.
  - *Hiệu quả:* Lưới hiển thị chuỗi ngày định dạng đẹp mắt cho người dùng (`31/12/2026`), nhưng giá trị nền tảng lưu trữ là số serial `46387`. Khi lưu ra FODS/XLSX, ô được xuất dưới dạng ngày chuẩn 100%.

---

## 4. PHÂN TÍCH RỦI RO ĐỐI VỚI TÍNH TOÀN VẸN (FIDELITY) XLSX (BỘ 28 XLSX + 20 XLS)

| Thành phần / Tệp kiểm tra | Khả năng ảnh hưởng | Đánh giá rủi ro | Biện pháp kiểm soát & Giảm thiểu |
|---------------------------|-------------------|-----------------|-----------------------------------|
| **28 tệp XLSX chuẩn (lan01–lan28)** | Tích cực / Tăng độ trung thực | **RẤT THẤP (Cải thiện)** | Các tệp XLSX thật (như `lan05`, `lan28`) lưu ô ngày dưới dạng số serial `44470` kèm `numFmt`. Hiện tại `YEAR(A1)` trên ô này bị trả về 2026 (sai), `MONTH(A1)` ra `#VALUE!`. Khi `_parseDate` hỗ trợ serial, các công thức ngày trong kho tệp thật sẽ tính toán chính xác lần đầu tiên. |
| **20 tệp XLS legacy (legacy01–legacy20)** | Ô ngày và công thức ngày | **RẤT THẤP (Cải thiện)** | Tương tự XLSX, các tệp XLS cổ chứa serial date sẽ được đọc và tính toán đồng nhất. |
| **Lan truyền lỗi trong bảng tính có sẵn** | Ô công thức phụ thuộc vào ô lỗi | **THẤP** | Trong Excel thật, các ô này vốn dĩ mang giá trị lỗi trong tệp gốc. Trước đây VN Sheet tự ý tính lại thành `1` hoặc `0` (làm biến dạng dữ liệu gốc). Sửa lan truyền lỗi giúp bảo toàn 100% giá trị lưu trữ và giá trị hiển thị tương đương Excel. |
| **FODS Serialization (`sheet-adapter.js`)** | Xuất ô ngày qua LibreOffice | **KHÔNG CÓ RỦI RO** | `sheet-adapter.js` (dòng 3498-3514) đã có sẵn nhánh xử lý: `if (typeof item.val === "number" && isDateType)` -> ghi thẻ `office:value-type="date"`. Khi DATE trả về serial và ô có `category: "date"`, adapter tự động đi vào nhánh này mà không cần sửa một dòng mã adapter nào. |
| **Hiển thị thô trên lưới nếu thiếu format** | Người dùng gõ `=DATE()` trong ô text/general | **TRUNG BÌNH** | Nếu không có bước tự động gán `numberFormat` ở `sheet-grid.js`, người dùng sẽ thấy số `46387` thay vì `31/12/2026`. Do đó, bước tự động gán `numberFormat` khi nhập công thức ngày là bắt buộc. |

---

## 5. DANH SÁCH CÁC BÀI KIỂM TRA (TESTS) CẦN SỬA HOẶC BỔ SUNG

### 5.1. Các bài kiểm tra hiện có cần cập nhật:
1. `tests/unit/sheet-named-ranges-text-date.test.js`:
   - Dòng 24: Test hiện tại đang kỳ vọng chuỗi:
     `assert(engine.evaluate("=DATE(2025,13,2)") === "02/01/2026", "DATE sai")`
     -> Cần cập nhật kỳ vọng sang số serial: `46024` (tương ứng với ngày 02/01/2026).
   - Dòng 31-32: Test `EDATE` đang kỳ vọng chuỗi:
     `assert(engine.evaluate('=EDATE("31/01/2024",1)') === "29/02/2024")`
     -> Cần cập nhật kỳ vọng sang số serial hoặc kiểm tra qua hàm format.

### 5.2. Các bài kiểm tra mới cần bổ sung (Thêm vào `tests/unit/formula-engine.test.js`):
1. **Kiểm tra lan truyền lỗi qua toán tử số học:**
   - `=A1 + 1` khi A1 là `"#DIV/0!"` -> trả về `"#DIV/0!"`.
   - `=A1 + 1` khi A1 là `"#N/A"` -> trả về `"#N/A"`.
   - `=A1 + 1` khi A1 là `"#VALUE!"` -> trả về `"#VALUE!"`.
   - `=A1 + 1` khi A1 là chuỗi `"x"` -> trả về `"#VALUE!"`.
2. **Kiểm tra lan truyền lỗi qua hàm tổng hợp:**
   - `=SUM(A1, 1)` khi A1 là `"#DIV/0!"` -> trả về `"#DIV/0!"`.
   - `=SUM(A1:A5)` chứa ít nhất 1 ô lỗi -> trả về mã lỗi đầu tiên.
   - `=AVERAGE(A1, 10)`, `=MIN(A1, 5)`, `=MAX(A1, 5)` chứa ô lỗi -> lan truyền lỗi.
3. **Kiểm tra hàm logic IF:**
   - `=IF(TRUE, 42, A1)` khi A1=`#DIV/0!` -> trả về `42` (ngắn mạch đúng).
   - `=IF(FALSE, 42, A1)` khi A1=`#DIV/0!` -> trả về `"#DIV/0!"`.
   - `=IF(A1, 42, 10)` khi A1=`#DIV/0!` -> trả về `"#DIV/0!"` (điều kiện lỗi phải báo lỗi).
4. **Kiểm tra hàm ngày tháng trả số serial và tính toán số học:**
   - `=DATE(2026, 12, 31)` -> `46387`.
   - `=DATE(2026, 12, 31) + 1` -> `46388`.
   - `=YEAR(46387)` -> `2026`.
   - `=MONTH(46387)` -> `12`.
   - `=DAY(46387)` -> `31`.
   - `=WEEKDAY(46387)` -> `5` (thứ Năm).
5. **Kiểm tra tích hợp lưới SheetGrid:**
   - Nhập `=DATE(2026, 12, 31)` vào ô trống -> ô hiển thị `"31/12/2026"`, lưu `val = 46387`, `style.numberFormat.category = "date"`.
   - Lưu ra FODS -> xuất thẻ `office:value-type="date"` với `office:date-value="2026-12-31"`.
