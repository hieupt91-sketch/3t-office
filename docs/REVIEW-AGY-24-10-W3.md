# REVIEW-AGY-24-10-W3 — Rà soát độc lập mã Swift OOXMLKit W3a/W3b (XLSX API)

- **Phiếu việc:** `E:\VNOffice-briefs\BRIEF-AGY-REVIEW-2.md` (AGY-REVIEW-2)
- **Worktree:** `E:\VNOffice-agy-mapping` (nhánh `docs/patch-mapping-agy`, đã merge `main` tại commit `5679ce1a`).
- **Phạm vi rà soát:** Rà soát diff mã nguồn Swift của module `ports/ios/OOXMLKit` trong 7 commit XLSX API W3a/W3b:
  1. `d1eaf5bd` — *feat(ooxmlkit): add XLSX P0 worksheet APIs*
  2. `3b64bf49` — *feat(ooxmlkit): add XLSX conditional formatting and validation*
  3. `99b1f123` — *feat(ooxmlkit): add XLSX calculation and protection APIs*
  4. `9ca41ae6` — *feat(ooxmlkit): add XLSX hyperlinks and concat rewrite*
  5. `a94c71da` — *feat(ooxmlkit): add XLSX view and print options*
  6. `b65eb9a6` — *feat(ooxmlkit): add XLSX metadata and theme APIs*
  7. `7e69d196` — *feat(ooxmlkit): support XLSX visual conditional rules*
- **Quy tắc tuân thủ:** Chỉ đọc mã nguồn Swift (không sửa mã nguồn `ports/ios/OOXMLKit`), kiểm chứng qua chuẩn ECMA-376 / ISO/IEC 29500 / MS-OFFCRYPTO và script đối chiếu logic. Mức phân loại lỗi: `PLAUSIBLE` (do môi trường Windows/WSL hiện tại chưa cài công cụ biên dịch `swift`).

---

## 1. Tổng quan phạm vi thay đổi

Tổng cộng 7 commit bổ sung khoảng 1.250 dòng mã nguồn Swift và các bài kiểm thử unit test:
- `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift`: +649 dòng (Freeze panes, AutoFilter, TabColor, Column/Row width/height/hidden, PageSetup, PrintOptions, ViewOptions, ConditionalFormatting, DataValidation, SheetProtection, Hyperlinks).
- `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Workbook.swift`: +164 dòng (SheetState, CalculationOptions, Theme preset, WorkbookProtection, PrintArea).
- `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/FormulaRewriter.swift`: +100 dòng (`rewriteScalarConcat`, `splitArguments`, `matchingParen`, `containsRangeOperator`).
- `ports/ios/OOXMLKit/Sources/OOXMLPackage/PackageTools.swift`: +38 dòng (`setProperties` metadata cốt lõi Dublin Core & OPC).
- `ports/ios/OOXMLKit/Tests/OOXMLSpreadsheetTests/`: +288 dòng (`P0WorksheetAPITests.swift`, `P1WorksheetFeatureTests.swift`).

---

## 2. Bảng tổng hợp các phát hiện theo 6 nhóm yêu cầu

| STT | Mã lỗi | Nhóm lỗi theo Brief | Tệp : Dòng thực tế | Mức độ | Tóm tắt kịch bản sai |
|---|---|---|---|---|---|
| 1 | **BUG-W3-01** | Cú pháp công thức / Tokenizer | `FormulaRewriter.swift:20-37` | **PLAUSIBLE** | `_xlfn.CONCAT(A1, B1)` bị viết lại thành chuỗi lỗi `_xlfn.(A1)&(B1)`. |
| 2 | **BUG-W3-02** | Tokenizer / Phân tách đối số | `FormulaRewriter.swift:62-94` | **PLAUSIBLE** | Bỏ qua nháy đơn `'...'` trong tên sheet (vd: `'Smith, John'!A1`), dấu phẩy làm tách vụn đối số. |
| 3 | **BUG-W3-03** | Tokenizer / Độ ưu tiên toán tử | `FormulaRewriter.swift:32` | **PLAUSIBLE** | Thiếu cặp ngoặc tròn bao quanh toàn bộ biểu thức nối: `CONCAT(A1, B1) * 2` biến thành `(A1)&(B1)*2`. |
| 4 | **BUG-W3-04** | Tokenizer / Mảng hằng số | `FormulaRewriter.swift:77-94` | **PLAUSIBLE** | Dấu phẩy trong mảng hằng số `{...}` (vd: `{"a", "b"}`) bị tách nhầm làm dấu phẩy hàm. |
| 5 | **BUG-W3-05** | Logic Data Validation | `Worksheet.swift:640-644` | **PLAUSIBLE** | Guard ép buộc `formula2 != nil` khiến mọi toán tử 1 ngôi (`greaterThan`, `lessThan`, `equal`...) bị văng ngoại lệ `invalidSetting`. |
| 6 | **BUG-W3-06** | Thuật toán băm mật khẩu | `Worksheet.swift:621-633`<br>`Workbook.swift:195-207` | **PLAUSIBLE** | Thuật toán băm 16-bit ngược chiều và thừa lần quay bit; mật khẩu `"demo"` sinh `CA4D` (Excel chuẩn là `CA8B`), người dùng không thể mở khóa file trong Excel. |
| 7 | **BUG-W3-07** | rels / Namespace XML | `Worksheet.swift:346-355` | **PLAUSIBLE** | Thêm hyperlink ngoài trên sheet mới tạo gán `r:id` nhưng không khai báo namespace `xmlns:r`, XML bị lỗi unbound prefix. |
| 8 | **BUG-W3-08** | Mất phần tử lạ khi ghi | `Worksheet.swift:686` | **PLAUSIBLE** | `setTabColor(rgbHex: "")` kiểm tra `properties.elements.isEmpty`, xóa sổ toàn bộ thẻ `<sheetPr>` chứa thuộc tính quan trọng (`codeName`, `filterMode`). |
| 9 | **BUG-W3-09** | Mất phần tử lạ khi ghi | `Worksheet.swift:585-591` | **PLAUSIBLE** | `clearConditionalFormatting(range:)` xóa luôn toàn bộ node `<conditionalFormatting>` đa vùng (`sqref="B2:B10 D2:D10"`), làm mất định dạng của `D2:D10`. |
| 10 | **BUG-W3-10** | Chuỗi định dạng / XML | `Worksheet.swift:555-558` | **PLAUSIBLE** | Mã màu hex 6 ký tự viết thường (`35a7ff`) không được gọi `.uppercased()`, sinh mã lai `FF35a7ff`. |
| 11 | **BUG-W3-11** | Schema ECMA-376 Theme | `Workbook.swift:133` | **PLAUSIBLE** | Ghi sai chính tả thứ tự schema `extraClrSchemeList` thay vì `extraClrSchemeLst` (DrawingML). |
| 12 | **BUG-W3-12** | Tràn số (Integer Overflow) | `Worksheet.swift:630`<br>`Workbook.swift:204` | **PLAUSIBLE** | `UInt16(password.utf16.count)` kích hoạt Fatal Runtime Trap nếu độ dài mật khẩu vượt quá 65.535 ký tự. |
| 13 | **BUG-W3-13** | Schema ECMA-376 SheetView | `Worksheet.swift:434` | **PLAUSIBLE** | `removeFreezePanes()` xóa sạch các thẻ `<selection>`, khiến `<sheetView>` không còn vùng chọn / ô hoạt động nào. |
| 14 | **BUG-W3-14** | Mất tính toàn vẹn Shared Formula | `Worksheet.swift:1054-1058` | **PLAUSIBLE** | Sửa/xóa ô slave của công thức chia sẻ không kích hoạt `expandSharedFormula`, làm hỏng thuộc tính `ref` của ô chủ. |
| 15 | **BUG-W3-15** | Chỉ số / Cú pháp vùng in | `Workbook.swift:229-231` | **PLAUSIBLE** | Vùng in 1 ô tạo công thức đơn ô `'Sheet1'!$A$1` thay vì dạng dải ô chuẩn `'Sheet1'!$A$1:$A$1`. |

---

## 3. Chi tiết từng phát hiện

### BUG-W3-01: `FormulaRewriter.rewriteScalarConcat` làm hỏng cú pháp khi gặp tiền tố chuẩn `_xlfn.CONCAT`
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/FormulaRewriter.swift:20-37`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Trong OpenXML (từ Excel 2016 trở đi), hàm `CONCAT` được lưu trữ trong XML công thức với tiền tố không gian tên mở rộng `_xlfn.CONCAT(A1, B1)`.
  Tại dòng 48:
  ```swift
  private static func isIdentifierPart(_ c: Character) -> Bool { c.isASCII && (c.isLetter || c.isNumber || c == "_") }
  ```
  Hàm `isIdentifierPart` không chấp nhận dấu chấm `.`. Khi duyệt chuỗi `_xlfn.CONCAT(A1, B1)`:
  1. Token đầu tiên nhận diện được là `_xlfn`.
  2. Ký tự tiếp theo là dấu chấm `.`.
  3. Ký tự tiếp theo nhận diện được là `CONCAT` và dấu mở ngoặc `(`.
  4. Code thay thế `CONCAT(A1, B1)` thành `(A1)&(B1)`, nhưng giữ nguyên `_xlfn.` ở phía trước!
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: `_xlfn.CONCAT(A1, B1)` (dạng chuẩn của Excel 2016+).
  - Đầu ra thực tế của hàm: `_xlfn.(A1)&(B1)`.
  - Hậu quả: Công thức bị sai cú pháp nghiêm trọng, Microsoft Excel báo lỗi `#NAME?` hoặc thông báo lỗi công thức khi mở tệp.
- **Đề xuất khắc phục:** Nhận diện cả tiền tố `_xlfn.` đi liền trước tên hàm hoặc đưa `.` vào tập ký tự hợp lệ khi quét định danh hàm có tiền tố `_xlfn.`.

---

### BUG-W3-02: `FormulaRewriter` tách nhầm đối số khi tên sheet trong nháy đơn `'...'` chứa dấu phẩy hoặc ngoặc đơn
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/FormulaRewriter.swift:62-94`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Trong công thức Excel, tên trang tính có chứa dấu cách, dấu phẩy, dấu ngoặc hoặc ký tự đặc biệt bắt buộc phải được bao trong cặp nháy đơn `'...'` (ví dụ: `'Doanh thu, 2024'!A1` hoặc `'Báo cáo (Quý 1)'!A1`).
  Cả hai hàm `matchingParen` và `splitArguments` chỉ xét trường hợp chuỗi văn bản dấu nháy kép `"` qua `stringEnd`, hoàn toàn không bỏ qua dấu nháy đơn `'`:
  ```swift
  while i < chars.count {
      if chars[i] == "\"" { i = stringEnd(in: chars, from: i); continue }
      if chars[i] == "(" { depth += 1 }
      else if chars[i] == ")" { depth -= 1 }
      else if chars[i] == "," && depth == 0 {
          parts.append(String(chars[start..<i]))
          start = i + 1
      }
      i += 1
  }
  ```
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: `CONCAT('Doanh thu, 2024'!A1, B1)`
  - Diễn biến: Tại vị trí dấu phẩy giữa `"Doanh thu"` và `" 2024"`, biến `depth == 0`. Hàm cắt đôi tên sheet làm hai đối số riêng biệt: `'Doanh thu` và ` 2024'!A1`.
  - Đầu ra thực tế: `('Doanh thu')&( 2024'!A1)&(B1)`.
  - Hậu quả: Cắt vụn tham chiếu ô của sheet, phá hỏng công thức. Tương tự, nếu tên sheet có ngoặc đơn `'Báo cáo (Q1)'!A1`, biến `depth` bị thay đổi sai lệch, làm `matchingParen` tìm sai dấu đóng ngoặc của hàm `CONCAT`.
- **Đề xuất khắc phục:** Thêm cơ chế quét và nhảy qua khối nháy đơn `'...'` tương tự như nháy kép `"` trong `FormulaRewriter`.

---

### BUG-W3-03: Thiếu cặp ngoặc tròn bao quanh toàn bộ biểu thức nối chuỗi làm sai độ ưu tiên toán tử
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/FormulaRewriter.swift:32`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Dòng 32 tạo chuỗi nối:
  ```swift
  output += arguments.map { "(\(rewriteScalarConcat($0.trimmingCharacters(in: .whitespacesAndNewlines))))" }.joined(separator: "&")
  ```
  Biểu thức sau khi viết lại là `(arg1)&(arg2)&(arg3)` mà không có cặp ngoặc tròn bao ngoài `((arg1)&(arg2)&(arg3))`.
  Trong hệ thống thứ tự ưu tiên toán tử của Microsoft Excel:
  Toán tử nối chuỗi `&` có độ ưu tiên thấp hơn các toán tử số học: lũy thừa `^`, nhân chia `*` `/`, cộng trừ `+` `-`.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: `=CONCAT(A1, B1) * 2`
  - Đầu ra thực tế: `=(A1)&(B1)*2`
  - Phân tích sai lệch: Trong biểu thức gốc, hàm `CONCAT(A1, B1)` được tính trước, sau đó toàn bộ chuỗi được nhân với 2 (ép kiểu số). Nhưng trong biểu thức viết lại `(A1)&(B1)*2`, phép nhân `(B1)*2` có độ ưu tiên cao hơn `&` nên được tính trước, rồi chuỗi `A1` mới được nối với kết quả đó!
  - Trường hợp `=CONCAT(A1, B1) ^ 2` cũng bị sai tương tự: biến thành `(A1)&(B1)^2`.
- **Đề xuất khắc phục:** Bao toàn bộ chuỗi nối bằng cặp ngoặc: `"(\(" + joined + "))"`.

---

### BUG-W3-04: Mảng hằng số `{...}` chứa dấu phẩy bị cắt vụn đối số trong `splitArguments`
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/FormulaRewriter.swift:77-94`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Excel hỗ trợ mảng hằng số nằm trong cặp ngoặc nhọn `{...}`, các phần tử ngăn cách bởi dấu phẩy (cột) hoặc chấm phẩy (hàng), ví dụ: `{"a", "b"}`.
  Hàm `splitArguments` chỉ đếm độ sâu của ngoặc đơn `(` và `)`, bỏ qua ngoặc nhọn `{` và `}`.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: `CONCAT({"a", "b"}, C1)`
  - Diễn biến: Dấu phẩy trong `{"a", "b"}` có `depth == 0`, bị coi là dấu phẩy phân tách đối số của `CONCAT`.
  - Đầu ra thực tế: `({"a"})&("b"})&(C1)`.
  - Hậu quả: Mảng hằng số bị xé rách ngoặc nhọn, gây lỗi cú pháp.

---

### BUG-W3-05: `DataValidationRule` bắt buộc `formula2 != nil` khiến mọi toán tử so sánh 1 ngôi bị từ chối
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:640-644`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Dòng 640-644 viết:
  ```swift
  guard types.contains(validation.type), validation.operator.map({ operators.contains($0) }) ?? true,
        validation.type != "list" || validation.formula1 != nil,
        validation.operator == nil || (validation.formula1 != nil && validation.formula2 != nil) else {
      throw SpreadsheetError.invalidSetting("quy tắc kiểm tra dữ liệu không hợp lệ")
  }
  ```
  Dòng 642 quy định: `validation.operator == nil || (validation.formula1 != nil && validation.formula2 != nil)`.
  Điều kiện này có nghĩa: nếu có `operator`, BẮT BUỘC cả `formula1` và `formula2` đều phải khác `nil`!
  Tuy nhiên, theo đặc tả ECMA-376 Part 1 §18.3.1.32 (`ST_DataValidationOperator`):
  - Các toán tử khoảng `between`, `notBetween`: cần 2 công thức (`formula1` và `formula2`).
  - Các toán tử 1 ngôi `equal`, `notEqual`, `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`: CHỈ CẦN 1 công thức (`formula1`), `formula2` luôn là `nil`.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: Người dùng thiết lập kiểm tra dữ liệu: số nguyên lớn hơn 100:
    ```swift
    DataValidationRule(type: "whole", formula1: "100", operator: "greaterThan")
    ```
  - Kết quả thực tế: Ném ngoại lệ `SpreadsheetError.invalidSetting("quy tắc kiểm tra dữ liệu không hợp lệ")`.
  - Hậu quả: Không thể tạo bất kỳ quy tắc xác thực dữ liệu nào dùng toán tử so sánh thông thường (`greaterThan`, `lessThan`, `equal`...). Chỉ có thể tạo quy tắc không có toán tử hoặc quy tắc `between`/`notBetween`.
- **Đề xuất khắc phục:** Sửa điều kiện guard:
  ```swift
  let needsTwoFormulas = validation.operator == "between" || validation.operator == "notBetween"
  guard ... validation.operator == nil || (needsTwoFormulas ? (validation.formula1 != nil && validation.formula2 != nil) : validation.formula1 != nil)
  ```

---

### BUG-W3-06: Thuật toán băm mật khẩu `legacyPasswordHash` sai lệch hoàn toàn chuẩn MS-OFFCRYPTO / Excel
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:621-633` và `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Workbook.swift:195-207`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Hàm tính hash mật khẩu legacy SpreadsheetML được viết:
  ```swift
  private static func legacyPasswordHash(_ password: String) -> String {
      var hash: UInt16 = 0
      for byte in password.utf16 {
          let rotate = (hash & 0x4000) != 0
          hash = (hash << 1) & 0x7fff
          if rotate { hash |= 1 }
          hash ^= byte
      }
      hash = ((hash & 0x4000) != 0 ? ((hash << 1) & 0x7fff) | 1 : (hash << 1) & 0x7fff)
      hash ^= UInt16(password.utf16.count)
      hash ^= 0xCE4B
      return String(format: "%04X", hash)
  }
  ```
  Theo chuẩn Microsoft Office Crypto (MS-OFFCRYPTO §2.3.7.1) và triển khai chuẩn trong LibreOffice / OpenOffice / openpyxl:
  1. Duyệt ký tự: Vòng lặp phải duyệt từ ký tự CUỐI CÙNG về ký tự ĐẦU TIÊN (right-to-left), hoặc mỗi ký tự ở vị trí 1-based `idx` phải được dịch trái `idx` bit (`ord(char) << idx`).
  2. Dòng 629 trong Swift thực hiện một phép quay bit 15-bit dư thừa sau khi kết thúc duyệt ký tự (`hash = ((hash & 0x4000) != 0 ...)`). Chuẩn MS-OFFCRYPTO không hề có bước quay bit sau vòng lặp ký tự.
- **Kịch bản đầu vào -> Kết quả sai (Đối chiếu thực nghiệm với openpyxl / Excel):**
  - Mật khẩu `"demo"`: Chuẩn Excel sinh ra hash `CA8B`. OOXMLKit sinh ra `CA4D`.
  - Mật khẩu `"test"`: Chuẩn Excel sinh ra hash `CBEB`. OOXMLKit sinh ra `CB03`.
  - Mật khẩu `"password"`: Chuẩn Excel sinh ra hash `83AF`. OOXMLKit sinh ra `996B`.
  - Hậu quả: Khi file được bảo vệ bằng OOXMLKit mở trên Microsoft Excel thật, người dùng nhập đúng mật khẩu `"demo"`, Excel sẽ băm thành `CA8B` và so sánh với giá trị `password="CA4D"` trong XML. Do không khớp, Excel sẽ từ chối mở khóa và thông báo "The password you supplied is not correct". Tài liệu bị khóa cứng.
- **Đề xuất khắc phục:** Viết lại theo thuật toán chuẩn của MS-OFFCRYPTO §2.3.7.1 (hoặc tham khảo hàm `hash_password` chuẩn của openpyxl/LibreOffice).

---

### BUG-W3-07: Thêm hyperlink ngoài trên sheet mới gán attribute `r:id` mà thiếu khai báo namespace `xmlns:r`
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:346-355`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Trong hàm `setHyperlink`:
  ```swift
  let element = XElement(name: q("hyperlink"), attributes: [XAttribute(name: "ref", value: reference.a1)])
  if isExternal {
      let rels = try workbook.package.relationships(of: part)
      let rid = rels.addExternal(.hyperlink, target: target)
      element.setAttribute("r:id", rid)
  }
  ```
  Code gán cứng tên thuộc tính là `"r:id"`.
  Nếu trang tính được tạo mới bằng `Workbook.addWorksheet(named:)` hoặc mở từ một tệp XLSX ban đầu không có bất kỳ quan hệ nào (không có sẵn khai báo `xmlns:r="..."` trên phần tử gốc `<worksheet>`), thuộc tính `r:id` sẽ được ghi ra tệp XML mà không có định nghĩa tiền tố `r:`.
  Trong khi đó, ở `Workbook.swift:311-312`, tác giả đã có kinh nghiệm xử lý vấn đề này:
  ```swift
  let (rName, needsDecl) = sheets.qualifiedName("id", in: NS.r)
  if needsDecl { document.root.setAttribute("xmlns:r", NS.r.primaryURI) }
  ```
  Nhưng ở `Worksheet.swift`, cơ chế này hoàn toàn bị bỏ quên.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: Gọi `setHyperlink(at: "A1", target: "https://example.com")` trên một sheet chưa có khai báo `xmlns:r`.
  - Kết quả trong XML: `<hyperlink ref="A1" r:id="rId1"/>` nằm trong `<worksheet xmlns="...">`.
  - Hậu quả: Trình phân tích XML tuân thủ chuẩn (như Apple NSXMLParser, libxml2, hay trình đọc của Excel) sẽ báo lỗi cú pháp: `The prefix "r" for attribute "r:id" associated with an element type "hyperlink" is not bound`.

---

### BUG-W3-08: Xóa màu tab bằng `setTabColor(rgbHex: "")` phá hủy toàn bộ thẻ `<sheetPr>`
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:675-686`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  if color.isEmpty {
      properties.firstChild(NS.s, "tabColor")?.removeFromParent()
  } else { ... }
  if properties.elements.isEmpty { properties.removeFromParent() }
  ```
  Trong OpenXML SpreadsheetML, phần tử `<sheetPr>` (Sheet Properties) có thể chứa nhiều thuộc tính rất quan trọng mà bản thân nó không có phần tử con nào, ví dụ:
  `<sheetPr codeName="Sheet1" filterMode="1" enableFormatConditionsCalculation="1"/>`.
  Khi người dùng gọi `setTabColor(rgbHex: "")` để bỏ màu thẻ tab:
  Code xóa thẻ `<tabColor>`. Sau đó kiểm tra `if properties.elements.isEmpty`.
  Vì `properties` chỉ chứa các thuộc tính (`codeName`, `filterMode`) mà không có phần tử con nào, `properties.elements.isEmpty` trả về `true`.
  Dòng 686 thực thi: `properties.removeFromParent()`, xóa sạch toàn bộ node `<sheetPr>`.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: Một trang tính có mã VBA đính kèm (`<sheetPr codeName="Sheet1"/>`). Người dùng gọi `ws.setTabColor(rgbHex: "")`.
  - Đầu ra: Thẻ `<sheetPr>` bị xóa hoàn toàn khỏi `sheet1.xml`.
  - Hậu quả: Mất thuộc tính `codeName` làm hỏng liên kết giữa mã VBA/Macro với trang tính; mất thuộc tính `filterMode` làm sai trạng thái lọc nâng cao.
- **Đề xuất khắc phục:** Chỉ xóa `properties` khi không có phần tử con VÀ không có thuộc tính nào khác:
  `if properties.elements.isEmpty && properties.attributes.isEmpty { properties.removeFromParent() }`.

---

### BUG-W3-09: `clearConditionalFormatting(range:)` xóa nhầm toàn bộ khối định dạng áp dụng cho nhiều vùng
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:585-591`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  let matches = document.root.children(NS.s, "conditionalFormatting").filter { element in
      guard let range else { return true }
      return element.attribute("sqref")?.split(whereSeparator: { $0.isWhitespace }).contains { String($0) == range.description } == true
  }
  guard !matches.isEmpty else { return }
  for element in matches { element.removeFromParent() }
  ```
  Trong Excel, thuộc tính `sqref` của thẻ `<conditionalFormatting>` có thể chứa một danh sách nhiều vùng ô ngăn cách bởi dấu cách, ví dụ: `sqref="B2:B10 D2:D10 F2:F10"`.
  Khi người dùng yêu cầu xóa định dạng có điều kiện trên vùng `B2:B10`:
  Code tìm thấy `"B2:B10"` nằm trong danh sách `sqref`.
  Thay vì loại bỏ `"B2:B10"` khỏi chuỗi `sqref` (thành `sqref="D2:D10 F2:F10"`), mã lại xóa toàn bộ phần tử `element` (`element.removeFromParent()`)!
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: File Excel có `<conditionalFormatting sqref="B2:B10 D2:D10">... quy tắc tô màu ...</conditionalFormatting>`. Người dùng gọi `ws.clearConditionalFormatting(range: CellRange("B2:B10")!)`.
  - Đầu ra: Toàn bộ node `<conditionalFormatting>` bị xóa sạch.
  - Hậu quả: Vùng `D2:D10` (vốn không được yêu cầu xóa) cũng bị mất sạch định dạng có điều kiện.

---

### BUG-W3-10: Chuỗi mã màu hex 6 ký tự viết thường bị xuất ra XML ở dạng lai hoa-thường
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:555-558`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  func colorElement(_ text: String) -> XElement {
      let hex = text.count == 6 ? "FF" + text : text.uppercased()
      return XElement(name: q("color"), attributes: [XAttribute(name: "rgb", value: hex)])
  }
  ```
  Nếu chuỗi `text` đầu vào có 6 ký tự và viết thường (ví dụ: `"63be7b"` hoặc `"ff0000"`):
  Nhánh `text.count == 6` thực hiện `"FF" + text`, sinh ra chuỗi `"FF63be7b"` mà KHÔNG hề gọi `.uppercased()`.
  Ngược lại, nếu chuỗi có 8 ký tự, code lại gọi `.uppercased()`.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: Thiết lập DataBar với màu `"63be7b"`.
  - Đầu ra trong XML: `<color rgb="FF63be7b"/>`.
  - Hậu quả: Vi phạm quy ước chuẩn của SpreadsheetML (màu ARGB viết hoa toàn bộ).

---

### BUG-W3-11: Lỗi chính tả trong danh sách thứ tự phần tử theme DrawingML (`extraClrSchemeList` thay vì `extraClrSchemeLst`)
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Workbook.swift:133`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  theme.root.insertChild(element, schemaOrder: ["themeElements", "objectDefaults", "extraClrSchemeList"])
  ```
  Theo chuẩn ECMA-376 Part 1 §20.1.6.9 (`CT_OfficeStyleSheet`), các phần tử con của `<a:theme>` có thứ tự lược đồ là:
  `<a:themeElements>`, `<a:objectDefaults>`, `<a:extraClrSchemeLst>` (chú ý hậu tố là `Lst`, không phải `List`).
  Việc ghi nhầm thành `"extraClrSchemeList"` khiến thuật toán `insertChild` không tìm thấy vị trí của phần tử này nếu tệp theme ban đầu đã có sẵn `<a:extraClrSchemeLst>`.

---

### BUG-W3-12: Tiềm ẩn lỗi Fatal Runtime Trap (Tràn số) trong `legacyPasswordHash`
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:630` và `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Workbook.swift:204`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  Dòng mã:
  ```swift
  hash ^= UInt16(password.utf16.count)
  ```
  Trong ngôn ngữ Swift, hàm khởi tạo kiểu số nguyên `UInt16(Int)` là phép chuyển đổi có kiểm tra tràn số chặt chẽ (checked conversion). Nếu độ dài `password.utf16.count` vượt quá giá trị cực đại của 16 bit (`65535`), Swift sẽ kích hoạt lỗi `Fatal error: Not enough bits to represent the passed value` làm dừng đột ngột (crash) toàn bộ tiến trình ứng dụng.
- **Kịch bản đầu vào -> Kết quả sai:**
  - Đầu vào: Chuỗi mật khẩu vượt quá 65.535 ký tự UTF-16 (ví dụ dữ liệu fuzzing hoặc test đầu vào ngẫu nhiên).
  - Hậu quả: Ứng dụng bị crash đột ngột thay vì báo lỗi hoặc ném ngoại lệ kiểm soát được.
- **Đề xuất khắc phục:** Dùng `UInt16(truncatingIfNeeded: password.utf16.count)`.

---

### BUG-W3-13: `removeFreezePanes()` xóa sạch toàn bộ các thẻ `<selection>`, khiến `<sheetView>` mất con trỏ
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:434`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  public func removeFreezePanes() throws {
      guard let view = document.root.firstChild(NS.s, "sheetViews")?.firstChild(NS.s, "sheetView"),
            !view.children(NS.s, "pane").isEmpty else { return }
      for element in view.children(NS.s, "pane") { element.removeFromParent() }
      for element in view.children(NS.s, "selection") { element.removeFromParent() }
      workbook.package.markModified(part)
  }
  ```
  Khi bỏ trạng thái cố định hàng/cột, hàm này xóa toàn bộ các phần tử `selection` bên trong `sheetView`.
  Tuy nhiên, sau khi xóa, hàm không tạo lại phần tử `selection` thông thường cho trang tính (`<selection activeCell="A1" sqref="A1"/>`).
  Trong chuẩn SpreadsheetML, thẻ `sheetView` luôn chứa ít nhất một thẻ `selection` xác định ô đang được chọn và con trỏ chuột. Khi thiếu thẻ này, Excel không biết ô nào đang active, có thể gây lỗi hiển thị hoặc tự động nhảy con trỏ về trạng thái không mong muốn.

---

### BUG-W3-14: Sửa ô phụ thuộc (slave cell) của công thức mảng chia sẻ (shared formula) làm hỏng phạm vi của ô chủ
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:1054-1058`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  if let f = cellElements[ref]?.firstChild(NS.s, "f"), f.attribute("t") == "shared",
     f.attribute("ref") != nil, let si = f.attribute("si") {
      expandSharedFormula(si)
  }
  ```
  Trong cấu trúc OpenXML SpreadsheetML, một nhóm công thức chia sẻ bao gồm:
  - 1 ô chủ (master): có thẻ `<f t="shared" ref="A1:A10" si="0">SUM(B1:C1)</f>`.
  - Các ô phụ thuộc (slave, từ A2 đến A10): chỉ có thẻ `<f t="shared" si="0"/>` (KHÔNG có thuộc tính `ref`).
  Điều kiện `f.attribute("ref") != nil` chỉ đúng khi người dùng sửa chính ô chủ `A1`.
  Nếu người dùng gọi `ws.setValue(100, at: "A2")` hoặc `ws.clear("A2")`:
  Ô `A2` có `f.attribute("ref") == nil`, nên `expandSharedFormula` BỊ BỎ QUA.
  Sau đó hàm `write` xóa thẻ `<f>` của ô `A2`.
  Hậu quả: Ô chủ `A1` vẫn giữ nguyên khai báo dải ô `ref="A1:A10"`, nhưng ô `A2` bên trong dải ô đó đã bị xóa mất thẻ `<f t="shared" si="0"/>`! Cấu trúc shared formula bị đứt đoạn, khiến Microsoft Excel báo lỗi "Excel found a problem with one or more formula references in this worksheet".

---

### BUG-W3-15: Cú pháp vùng in đơn ô (single cell) tạo công thức không chuẩn phạm vi
- **Tệp : Dòng:** `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Workbook.swift:229-231`
- **Mức độ:** `PLAUSIBLE`
- **Mô tả chi tiết:**
  ```swift
  let first = absolute(range.start)
  let last = range.start == range.end ? "" : ":\(absolute(range.end))"
  let formula = "'\(sheetName)'!\(first)\(last)"
  ```
  Khi người dùng đặt vùng in chỉ gồm 1 ô duy nhất (ví dụ: `A1`), điều kiện `range.start == range.end` là `true`, làm biến `last` thành chuỗi rỗng `""`. Công thức vùng in sinh ra là: `'Sheet1'!$A$1`.
  Trong đặc tả của Excel đối với tên định nghĩa hệ thống `_xlnm.Print_Area`, vùng in luôn được kỳ vọng ở định dạng dải ô 2 chiều (ví dụ: `'Sheet1'!$A$1:$A$1`). Việc chỉ có một tọa độ ô đơn có thể khiến các trình in ấn hoặc render PDF hiểu nhầm đây là một ô tham chiếu giá trị thay vì một vùng in chữ nhật hợp lệ.

---

## 4. Kết luận và kiến nghị

1. **Chất lượng bộ mã W3a/W3b:** Các tính năng cốt lõi (P0/P1 XLSX APIs) đã bao phủ nhiều năng lực bảng tính quan trọng. Tuy nhiên, việc rà soát đã chỉ ra các lỗi logic tiềm ẩn khá nghiêm trọng, đặc biệt là:
   - **Lỗi băm mật khẩu (BUG-W3-06):** Làm cho chức năng bảo vệ bảng tính hoàn toàn không thể mở khóa được trên Excel thật.
   - **Lỗi DataValidation (BUG-W3-05):** Chặn đứng các toán tử so sánh 1 ngôi hợp lệ.
   - **Lỗi Tokenizer (BUG-W3-01, BUG-W3-02, BUG-W3-03):** Làm hỏng công thức khi viết lại `CONCAT`.
   - **Lỗi Namespace (BUG-W3-07):** Có thể làm sinh ra tệp XML không hợp lệ do thiếu tiền tố `xmlns:r`.
2. **Khuyến nghị cho nhóm lập trình Swift W3:**
   - Cần bổ sung các ca kiểm thử mở rộng với dữ liệu thực tế (thay vì chỉ dùng duy nhất fixture `rich-excel.xlsx` vốn đã có sẵn đầy đủ namespace và cấu trúc).
   - Kiểm thử giải mã mật khẩu bằng cách mở tệp đã lưu trong Microsoft Excel thật hoặc đối chiếu hàm hash với `openpyxl`.
   - Khắc phục các điểm lỗi từ BUG-W3-01 đến BUG-W3-15 trước khi tiến hành đóng gói phiên bản chính thức.
