# Agent Handoff — VN Sheet VLOOKUP Recalculation Performance Optimization

| Mục | Nội dung |
|---|---|
| TASK | Tối ưu hóa tốc độ tính toán lại (recalculation) công thức VN Sheet trên các workbook thực tế có nhiều VLOOKUP (`lan28.xlsx`, `lan06.xlsx`, `lan14.xlsx`), bảo đảm 0 sai lệch so với baseline |
| AGENT/ROLE | Antigravity (agy) / Sheet Performance & Calculation Engine Optimization |
| BRANCH | `perf/sheet-vlookup-recalc-agy` |
| WORKTREE | `E:\VNOffice-agy-vlookup-perf` |
| OBJECTIVE | Loại bỏ nút thắt cổ chai tính toán trong `formula-engine.js` và `sheet-grid.js`, tăng tốc độ recalculateAll và setCellValue+recalc từ hàng phút xuống dưới 1 giây, giữ nguyên 100% tính đúng đắn |
| CURRENT CAPABILITY | Trước tối ưu: `lan06` mất ~149.3 giây (~2.5 phút) mỗi lần tính lại hoặc chỉnh sửa 1 ô do `_rangeMatrix` và `_maxUsedRow` bị gọi lặp lại 81,071 lần và `SUMIF` tái đánh giá biểu thức tiêu chí `VLOOKUP` trên từng dòng trong vòng lặp; DOM `querySelector` bị gọi quét toàn cây cho hơn 128,000 ô trong `lan14`. |
| IMPLEMENTATION SUMMARY | 1. Thêm bộ đệm có kiểm soát phiên bản sheet (`_rangeMatrixCache`, `_rangeValuesCache`, `_maxUsedRowCache`, `_lookupIndexCache`, `_parsedReferenceCache`) với cơ chế `bumpSheetVersion()` và `clearCache()`.<br>2. Tiền lập chỉ mục O(1) hash Map cho tra cứu chính xác (`exact match`) trong VLOOKUP/HLOOKUP với lớp fallback an toàn 100% về `_equals`.<br>3. Tiền giải quyết (`pre-resolve`) đối số tiêu chí một lần duy nhất trước vòng lặp trong `COUNTIF`, `SUMIF`, `COUNTIFS`, `SUMIFS`, triệt tiêu 375,000 lần gọi lồng đệ quy thừa.<br>4. Giới hạn truy vấn DOM trong `_recalculateAllFormulas()` theo viewport ảo (`currentStartRow` .. `currentEndRow`).<br>5. Bổ sung 11 unit test cho VLOOKUP (exact, approximate, numeric, case-insensitivity, cross-sheet, `#REF!`, `#N/A`, cache invalidation). |
| FILES CHANGED | `apps/sheet/formula-engine.js`<br>`apps/sheet/sheet-grid.js`<br>`tests/unit/formula-engine.test.js`<br>`docs/HANDOFF-SHEET-VLOOKUP-RECALC-FINDINGS.md`<br>`docs/HANDOFF-SHEET-VLOOKUP-RECALC.md` |
| DEPENDENCIES | Không thêm dependency ngoài. Sử dụng chuẩn JavaScript ES6 Map và built-in data structures. |
| RISKS | Rủi ro stale cache: Đã triệt tiêu hoàn toàn bằng cơ chế `bumpSheetVersion` khi cell thay đổi (`setCellValue`, `res !== itm.val`, array formula) và `clearCache` ở đầu mỗi đợt recalculateAll. |
| TEST PLAN | 1. So khớp cell-by-cell với baseline snapshot (`_snapshot_lan*.json`) trên 132,305 ô công thức.<br>2. Đo đạc benchmark trước/sau trên `lan28`, `lan06`, `lan14`.<br>3. Chạy toàn bộ test suite `node tests/run-tests.js`.<br>4. Chạy layout audit 26 file LAN thực tế bằng `_batch_audit.py`. |
| TEST RESULTS | PASS — `node tests/run-tests.js`: **1874/1874 PASS (0 FAIL)**.<br>Snapshot parity: **0 diffs** trên toàn bộ 132,305 ô công thức của `lan28`, `lan06`, `lan14`.<br>Batch audit: **TONG sai lech = 0** trên cả 26 file LAN, Excel mở OK, lint clean. |
| BUILD RESULT | PASS — toàn bộ cú pháp JS và Python kiểm tra hợp lệ, không có build step riêng. |
| CORE PATCH ID | Không có — không can thiệp LibreOffice Core. |
| BLOCKERS | Không có. |
| MERGE STATUS | Đã commit trên branch `perf/sheet-vlookup-recalc-agy`. Không merge vào `main` theo quy định. |

---

## 1. Kết Quả Đo Đạc Hiệu Năng (Trước và Sau Tối Ưu)

Tất cả các số liệu dưới đây được đo bằng cùng một harness benchmark chuẩn hóa trên cùng môi trường phần cứng:

| Workbook | Thông số Workbook | Thao tác | Trước Tối Ưu (Baseline) | Sau Tối Ưu (Post-Optimization) | Mức Độ Tăng Tốc |
|---|---|---|---|---|---|
| **`lan28.xlsx`** | 5,428 ô<br>739 công thức<br>142 VLOOKUP (19.2%) | `recalculateAll` Run 1<br>`recalculateAll` Run 2<br>`setCellValue + recalc` Run 1<br>`setCellValue + recalc` Run 2 | 0.026s<br>0.021s<br>0.028s<br>0.019s | **0.015s**<br>**0.008s**<br>**0.011s**<br>**0.008s** | **1.7x**<br>**2.6x**<br>**2.5x**<br>**2.4x** |
| | | Thời gian trong `_rangeMatrix` | 0.019s (67.0%) | **0.001s (9.0%)** | **19x nhanh hơn** |
| **`lan06.xlsx`** | 28,457 ô<br>2,905 công thức<br>963 VLOOKUP (33.1%) | `recalculateAll` Run 1<br>`recalculateAll` Run 2<br>`setCellValue + recalc` Run 1<br>`setCellValue + recalc` Run 2 | 152.891s<br>149.299s<br>159.816s<br>145.504s | **0.558s**<br>**0.282s**<br>**0.276s**<br>**0.279s** | **274x**<br>**529x**<br>**579x**<br>**521x** |
| | | Số lần gọi `_rangeMatrix`<br>Thời gian trong `_rangeMatrix` | 81,071 lần<br>126.590s (88.4%) | **963 lần**<br>**0.007s (2.3%)** | **Giảm 84 lần gọi thừa**<br>**18,000x nhanh hơn** |
| **`lan14.xlsx`** | 1,490,828 ô<br>128,661 công thức<br>67,144 VLOOKUP (52.2%) | `recalculateAll` Run 1<br>`recalculateAll` Run 2<br>`setCellValue + recalc` Run 1<br>`setCellValue + recalc` Run 2 | 3.762s<br>3.763s<br>3.776s<br>3.788s | **2.231s**<br>**2.205s**<br>**2.210s**<br>**2.216s** | **1.7x**<br>**1.7x**<br>**1.7x**<br>**1.7x** |
| | | Thời gian DOM querySelector | Quét 128,661 DOM queries | **0.000s (Viewport bounded)** | **Triệt tiêu quét DOM ngoài màn hình** |

> [!TIP]
> Điểm ấn tượng nhất là **`lan06.xlsx`** từ thời gian chờ tê liệt gần **2.5 phút (149 giây)** cho mỗi thao tác chỉnh sửa ô hoặc tính lại, nay hoàn tất chỉ trong **0.28 giây (280ms)** — **tăng tốc hơn 520 lần**!

---

## 2. Nguyên Nhân Gốc Rễ Đã Phát Hiện & Giải Pháp Kỹ Thuật

### Phát hiện 1: Lỗi tái đánh giá đối số tiêu chí (Criteria Re-evaluation) trong các hàm tổng hợp điều kiện
- **Hiện tượng:** Trong `lan06.xlsx`, sheet `Kho VAT` có 250 công thức dạng:
  `=SUMIF('VAT Nhập'!$B:$B, VLOOKUP('Kho VAT'!A4, 'VAT Nhập'!$B:$D, 1, FALSE()), 'VAT Nhập'!$D:$D)`
- **Nguyên nhân:** Mã nguồn cũ của `COUNTIF`, `SUMIF`, `COUNTIFS`, `SUMIFS` truyền trực tiếp `args[1]` vào hàm so khớp `this._matchesCriteria(value, args[1])`. Bên trong `_matchesCriteria`, dòng lệnh `const criteria = this._resolveSingleValue(rawCriteria)` được thực thi lại **ở mỗi phần tử của mảng** (1,500 dòng). Như vậy, 1 công thức SUMIF chạy 1,500 lần VLOOKUP, và 250 công thức tạo ra hơn **375,000 lần tính lại VLOOKUP và quét dải ô**!
- **Giải pháp:** Tiền giải quyết `const criteria = this._resolveSingleValue(args[1])` duy nhất **một lần trước vòng lặp reduce/filter**. Số lần gọi VLOOKUP giảm từ 375,000 xuống đúng 250 lần (tỷ lệ giảm 1,500 lần).

### Phát hiện 2: Thiếu bộ đệm dải ô (`_rangeMatrix` và `_rangeValues`)
- **Hiện tượng:** Cùng một vùng dữ liệu bảng tĩnh như `'Kho VAT'!A:D` hay `'VAT Nhập'!$B:$B` được phân tích cú pháp chuỗi, lấy từng ô qua `getCellValue`, và khởi tạo lại mảng 2D liên tục hàng chục nghìn lần.
- **Giải pháp:** Thêm `_rangeMatrixCache` và `_rangeValuesCache` theo khóa `${sheet}:${normalizedRef}:${sheetVersion}`. Các công thức VLOOKUP tham chiếu đến cùng một bảng tra cứu sẽ dùng chung ma trận đã tính sẵn trong bộ nhớ.

### Phát hiện 3: Nút thắt quét toàn bộ Map keys trong `_maxUsedRow`
- **Hiện tượng:** Khi một tham chiếu cột dạng `A:D` được gọi, `_maxUsedRow` duyệt qua toàn bộ khóa của Map dữ liệu ô (lên tới gần 30,000 ô trong `lan06`) bằng biểu thức chính quy `/\d+$/`. Thao tác này tiêu tốn ~1.5ms mỗi lần gọi và chiếm phần lớn thời gian CPU khi gọi lặp lại.
- **Giải pháp:** Thêm `_maxUsedRowCache` theo khóa `${sheet}:${sheetVersion}`. Trong một phiên recalculate hoặc khi sheet chưa sửa đổi, số hàng lớn nhất được trả về tức thì ở độ phức tạp O(1).

### Phát hiện 4: Tìm kiếm tuyến tính O(N) trong VLOOKUP Exact Match
- **Hiện tượng:** Mặc định `exact = true` (`FALSE` hoặc `0`), VLOOKUP duyệt mảng tuần tự từ trên xuống dưới bằng `candidates.find(item => this._equals(item.key, lookup))`.
- **Giải pháp:** Thêm `_lookupIndexCache` xây dựng bảng băm Map theo số và chuỗi chữ thường (`numMap` và `strMap`). Khi tìm kiếm, engine thử tra cứu O(1) qua Map trước; nếu tìm thấy và khớp qua `this._equals`, trả về ngay kết quả. Nếu không thấy, engine tự động fallback về `candidates.find(...)` tuyến tính để bảo đảm độ chính xác 100%.

### Phát hiện 5: Quét DOM vô điều kiện trong `_recalculateAllFormulas`
- **Hiện tượng:** Mã nguồn cũ gọi `container.querySelector(`.vno-grid-cell[data-coord="${k}"]`)` cho toàn bộ 128,661 ô công thức trong workbook, bất kể ô đó có đang hiển thị trong vùng nhìn thấy (`viewport`) hay không.
- **Giải pháp:** Chỉ thực hiện `querySelector` khi ô thuộc sheet đang kích hoạt VÀ nằm trong khoảng hàng hiển thị ảo `[currentStartRow || 1, currentEndRow || 40]`.

---

## 3. Kiểm Tra Toàn Vẹn & Không Sai Lệch (Zero-Regression Parity)

1. **Kiểm tra Snapshot (132,305 ô công thức):**
   - Script `_verify_snapshots.mjs` đối chiếu từng ô công thức sau recalculateAll với snapshot baseline đã lưu:
     - `lan28.xlsx`: 739 ô — **0 sai lệch**
     - `lan06.xlsx`: 2,905 ô — **0 sai lệch**
     - `lan14.xlsx`: 128,661 ô — **0 sai lệch**
   - Tổng cộng: **0 sai lệch trên toàn bộ 132,305 ô**.

2. **Kiểm tra Batch Layout Audit trên 26 file LAN thực tế:**
   - Chạy lệnh: `python scripts\layout-audit\_batch_audit.py E:\VNOffice-agy-vlookup-perf lanNN.xlsx` (cho 26 file từ `lan01` đến `lan28`, loại trừ `lan06` và `lan14`).
   - Kết quả: **26/26 file PASS**.
     - `lan01.xlsx`: total 0, excel OK, lint clean
     - `lan02.xlsx`: total 0, excel OK, lint clean
     - `lan03.xlsx`: total 0, excel OK, lint clean
     - `lan04.xlsx`: total 0, excel OK, lint clean
     - `lan05.xlsx`: total 0, excel OK, lint clean
     - `lan07.xlsx`: total 0, excel OK, lint clean
     - `lan08.xlsx`: total 0, excel OK, lint clean
     - `lan09.xlsx`: total 0, excel OK, lint clean
     - `lan10.xlsx`: total 0, excel OK, lint clean
     - `lan11.xlsx`: total 0, excel OK, lint clean
     - `lan12.xlsx`: total 0, excel OK, lint clean
     - `lan13.xlsx`: total 0, excel OK, lint clean
     - `lan15.xlsx`: total 0, excel OK, lint clean
     - `lan16.xlsx`: total 0, excel OK, lint clean
     - `lan17.xlsx`: total 0, excel OK, lint clean
     - `lan18.xlsx`: total 0, excel OK, lint clean
     - `lan19.xlsx`: total 0, excel OK, lint clean
     - `lan20.xlsx`: total 0, excel OK, lint clean
     - `lan21.xlsx`: total 0, excel OK, lint clean
     - `lan22.xlsx`: total 0, excel OK, lint clean
     - `lan23.xlsx`: total 0, excel OK, lint clean
     - `lan24.xlsx`: total 0, excel OK, lint clean
     - `lan25.xlsx`: total 0, excel OK, lint clean
     - `lan26.xlsx`: total 0, excel OK, lint clean
     - `lan27.xlsx`: total 0, excel OK, lint clean
     - `lan28.xlsx`: total 0, excel OK, lint clean
   - **TỔNG SAI LỆCH = 0 TRÊN TOÀN BỘ 26 FILE.**

3. **Kiểm tra Unit Test Suite:**
   - Chạy lệnh: `node tests/run-tests.js`
   - Kết quả: **1874/1874 PASS (0 FAIL)**.
   - Toàn bộ 11 bài test mới cho VLOOKUP và Cache Invalidation đều đạt PASS.
