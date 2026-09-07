# HANDOFF: VN Sheet — Thanh trạng thái Sum/Average/Count tính sai (cộng cả sheet, xén dấu thập phân)

## Bối cảnh phát hiện

Ghi nhận từ `HANDOFF-FILE-OPEN-DOCUMENT-TAB-NAME.md` (phiên trước): mở file
thật "Sữa chữa UB quảng trạch.xlsx" (5 sheet dữ liệu thật), thanh trạng
thái hiện `TỔNG CỘNG: 226.479.494.916.838.460 đ` — một con số phi lý. Điều
tra lần này: copy file (bản gốc đang mở trong Excel thật, không đụng vào),
giải nén trực tiếp kiểm tra `xl/worksheets/sheet1.xml` — giá trị số lớn
nhất trong TOÀN BỘ sheet chỉ khoảng vài chục triệu (23.814.000,
28.793.880...). Không có ô nào >9 chữ số. Kết luận: con số thanh trạng
thái KHÔNG phản ánh dữ liệu thật — là lỗi tính toán, không phải dữ liệu
gốc bất thường.

## Nguyên nhân gốc (3 lỗi cộng dồn trong `_calculateStats()`)

`apps/sheet/sheet-grid.js` — hàm dựng dữ liệu cho thanh trạng thái
Sum/Average/Count (Excel thật gọi là "Status Bar" khi bôi đen vùng ô):

```js
_calculateStats() {
  let total = 0, count = 0;
  for (const [k, itm] of this.cellsData.entries()) {   // (1)
    if (itm.val && !itm.formula) {                       // (3)
      count++;
      const num = parseFloat(itm.val.toString()
        .replace(/\./g, "")                               // (2)
        .replace(/[^\d-]/g, ""));
      if (!isNaN(num)) total += num;
    }
  }
  ...
}
```

1. **Duyệt TOÀN BỘ `this.cellsData`** (mọi ô có dữ liệu trong cả sheet
   đang active), KHÔNG lọc theo vùng đang CHỌN (`this.selectionRange`).
   Excel thật CHỈ tính Sum/Average/Count trên vùng/ô đang bôi đen. Với
   một sheet có hàng trăm ô số (đơn giá, số lượng, thành tiền, VAT...),
   cộng dồn TẤT CẢ chúng lại — kể cả những ô không liên quan gì tới nhau
   về mặt ngữ nghĩa — cho ra một tổng vô nghĩa nhưng vẫn "hợp lý về độ
   lớn" (hàng trăm triệu tới hàng tỷ), CHƯA giải thích hết được mức 226
   triệu tỷ.
2. **Xén dấu chấm vô điều kiện** — `itm.val.toString().replace(/\./g, "")`
   áp dụng cho MỌI giá trị, kể cả khi `itm.val` đã là **số thực JS**
   (`typeof itm.val === "number"`, xác nhận qua cách `_renderCellVisual`
   dùng chính điều kiện này để format hiển thị). Nếu một ô có phần thập
   phân thật (ví dụ đơn giá `23814000.5`), `.toString()` cho
   `"23814000.5"`, xén hết dấu chấm cho `"238140005"` — **sai gấp ~10
   lần**, và nếu giá trị có NHIỀU chữ số thập phân hoặc giá trị vốn đã
   được`.toString()` ra dạng có nhiều cụm số (ví dụ số cực nhỏ dạng mũ
   `1.23e-7`), phép xén-chuỗi này khuếch đại lỗi theo cấp số nhân khi
   CỘNG DỒN hàng trăm ô như vậy (lỗi 1 và lỗi 2 cộng hưởng) — khớp với
   độ lớn 10^17 quan sát được. Đây là **CÙNG LỚP LỖI** đã ghi nhận và sửa
   trước đó ở formula engine (`project_formula_precision_bug_fixed`
   trong bộ nhớ dự án) — bằng chứng cho thấy lỗi đã lặp lại đúng như cảnh
   báo "watch for the same antipattern duplicated elsewhere".
3. **Loại bỏ hẳn ô có công thức** (`!itm.formula`) — trong khi `itm.val`
   của ô công thức LUÔN được cập nhật thành kết quả tính mới nhất sau mỗi
   lần `_recalculateAllFormulas()`/`switchSheet()` (xác nhận qua
   `itm.val = res` ở dòng ~559). Excel thật VẪN cộng ô công thức vào
   Sum/Average của vùng chọn — bỏ qua chúng là một lỗ hổng fidelity riêng
   biệt (không trực tiếp gây ra con số 226 triệu tỷ, nhưng làm Sum/Average
   thiếu chính xác bất cứ khi nào vùng chọn có cả ô công thức lẫn ô số).

## Giải pháp

Viết lại `_calculateStats()`:
- Dùng `this._normalizeRange()` (hàm có sẵn, đã dùng cho
  `getSelectedRangeLabel()`) để lấy đúng vùng đang chọn, chỉ duyệt các ô
  TRONG vùng đó.
- Kiểm tra `typeof itm.val === "number"` TRƯỚC — nếu đúng, dùng thẳng giá
  trị, KHÔNG qua bất kỳ bước xử lý chuỗi nào. Chỉ khi `itm.val` là chuỗi
  (trường hợp hiếm, dữ liệu số dạng text) mới áp dụng xử lý định dạng số
  Việt Nam (xén dấu chấm ngăn cách nghìn, đổi dấu phẩy thập phân).
- Bỏ điều kiện loại trừ ô công thức — mọi ô có `val` là số hợp lệ (dù từ
  công thức hay nhập tay) đều được tính vào Sum/Average/Count.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1450/1450 PASS (suite mới "132. VN Sheet
  thanh trạng thái Sum/Average/Count", 6/6 PASS — bao gồm: chỉ tính vùng
  chọn (tái tạo chính xác cơ chế lỗi thật với 250 ô rải rác ngoài vùng
  chọn 1 ô), số thực có thập phân không bị xén sai, ô công thức được
  cộng, 1 ô đơn lẻ, ô chữ bị bỏ qua đúng cách).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- Đối chiếu trực tiếp file thật (copy an toàn, không đụng bản đang mở
  trong Excel thật): xác nhận giá trị lớn nhất thực tế trong sheet chỉ
  ~28 triệu, phù hợp với việc lỗi cũ là lỗi TÍNH TOÁN chứ không phải dữ
  liệu gốc bất thường.
