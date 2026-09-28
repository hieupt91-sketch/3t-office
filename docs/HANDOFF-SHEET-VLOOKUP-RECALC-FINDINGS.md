# HANDOFF — Sheet VLOOKUP Recalculate Performance Findings

## 1. Mục tiêu & Môi trường đo đạc
- **Mục tiêu:** Đo đạc chính xác thời gian tính toán lại công thức (`recalculateAll` và 1 lần sửa ô `setCellValue` kèm tự động tính lại) trên các tệp Excel thực tế trên mạng LAN có tỷ lệ VLOOKUP lớn (`lan28.xlsx`, `lan06.xlsx`, `lan14.xlsx`), đồng thời phân tích chi tiết thời gian (profile) nằm ở đâu trong pipeline.
- **Môi trường:**
  - Worktree: `E:\VNOffice-agy-vlookup-perf` (nhánh `perf/sheet-vlookup-recalc-agy`).
  - Runtime: Node.js v20.20.2 trên Windows.
  - Test harness: Khởi tạo `SheetGridController` + `FormulaEngine` + `SheetAdapter` chuẩn của VN Sheet, nạp trực tiếp FODS được xuất từ pipeline `_time_sheet_open_stages.py` (LibreOffice + python overlays chuẩn của VN Office).
  - Mock container DOM: Tương thích kiến trúc Virtual Scroll của `SheetGridController`.

---

## 2. Số liệu đo đạc Baseline (Trước tối ưu)

Mỗi phép đo được chạy ít nhất 2 lượt độc lập sau khi đã khởi động nóng (warm-up):

| Tệp kiểm thử | Tổng số ô | Tổng công thức | Số lượng VLOOKUP | Thời gian `recalculateAll` (Lượt 1 / Lượt 2) | Thời gian 1 lần sửa ô `setCellValue` (Lượt 1 / Lượt 2) | Tỷ trọng thời gian trong VLOOKUP | Tỷ trọng thời gian trong `_rangeMatrix` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **lan28** | 5.428 | 739 | 142 (19.2%) | **0.026s / 0.021s** | **0.028s / 0.019s** | **79.6%** | **66.3%** |
| **lan06** | 28.457 | 2.905 | 963 (33.1%) | **152.891s / 149.299s** (~2.5 phút) | **159.816s / 145.504s** (~2.5 phút) | **98.9%** | **88.4%** |
| **lan14** | 1.490.828 | 128.661 | 67.144 (52.2%) | **3.762s / 3.801s** | **3.765s / 3.834s** | **93.2%** | **93.0%** |

---

## 3. Phân tích chi tiết Bottleneck (Profiling Breakdown)

### 3.1. `lan06.xlsx`: Cơn ác mộng O(Formulas × Rows × Cols)
- Tổng thời gian `recalculateAll`: **146.464s**.
- Trong đó:
  - **`_rangeMatrix`** chiếm **129.441s (88.4% tổng thời gian)** với **81.071 lượt gọi**.
  - **VLOOKUP/HLOOKUP** chiếm **144.815s (98.9% tổng thời gian)**.
  - `evaluate` gọi **164.334 lần** (do các hàm lồng như `SUMIF(..., VLOOKUP(...), ...)` khiến VLOOKUP bị gọi lặp lại hàng chục ngàn lần).
- **Nguyên nhân cốt lõi:**
  1. Trong `apps/sheet/formula-engine.js`: hàm `_rangeMatrix(range)` mỗi lần được gọi đều phân tích lại chuỗi range (regex), tìm `_maxUsedRow` bằng cách lặp qua toàn bộ keys của sheet, và duyệt từng ô `(row, col)` để gọi `this.getCellValue()` tạo ma trận 2 chiều mới.
  2. Bảng tra cứu trong `lan06` như `'Kho VAT'!A:D` hoặc `'Kho VAT'!A:G` được lặp đi lặp lại 81.071 lần mà không hề có bất kỳ cơ chế cache nào!
  3. Cứ mỗi lần người dùng sửa 1 ô bất kỳ, `_recalculateAllFormulas` tính lại toàn bộ khiến giao diện bị "đơ" tới 2.5 phút!

### 3.2. `lan14.xlsx`: 67.137 External Links & 5 VLOOKUP nội bộ cực lớn
- Phân tích cấu trúc 67.144 VLOOKUP trong `lan14`:
  - **67.137 VLOOKUP** là liên kết ngoài trỏ tới file Excel khác (ví dụ: `'[1. DS ALL SV thoi học.xlsx]ds'!N$8:O$7760` và `'[4. DS ALL NEU-ELEARNING 03112021.xlsx]all'!AO$2:AP$8112`). Nhánh `apps/sheet/sheet-grid.js` dòng 3554 (`if (itm.externalLink && itm.externalLink.formula === itm.formula) continue;`) đã bảo vệ không đánh giá lại các ô này (giữ nguyên giá trị cache từ file).
  - **7 VLOOKUP nội bộ**: Tra cứu trên toàn bộ cột `P:AD`, `P:AG`, `P:AF` của `Sheet1` (bảng dữ liệu có hơn 30.000 hàng).
  - **61.519 công thức còn lại**: Là các công thức số học và chuỗi đơn giản (ví dụ: `=+TRIM(B13)`).
- **Profiling cho thấy:**
  - 61.519 công thức đơn giản chỉ mất ~0.2s để tính toán.
  - Nhưng chỉ riêng **5 lượt gọi VLOOKUP nội bộ** (tra cứu trên bảng 30.000 hàng × 15 cột = 450.000 ô) đã ngốn **3.630s (93.0% tổng thời gian)** vì `_rangeMatrix` phải duyệt và phân bổ mảng cho 450.000 ô!

### 3.3. `lan28.xlsx`: Bảng tính nhỏ nhưng VLOOKUP vẫn chiếm phần lớn
- 142 lượt gọi VLOOKUP chiếm **79.6%** thời gian tính toán, trong đó `_rangeMatrix` chiếm **66.3%**.

### 3.4. Thao tác DOM trong `_recalculateAllFormulas`
- Đoạn mã:
  ```javascript
  const dom = sheetName === activeSheet ? this.container.querySelector(`.vno-grid-cell[data-coord="${k}"]`) : null;
  ```
  Trong `lan14` với 128.661 công thức, vòng lặp này gọi `querySelector` hàng vạn lần dù Virtual Scroll chỉ hiển thị khoảng 40 hàng trên màn hình. Mặc dù trên Node mock tốn ít thời gian (~3ms), nhưng trên DOM thật của trình duyệt với hàng ngàn nodes, việc gọi `querySelector` 60.000+ lần sẽ gây nghẽn main thread nặng nề.

---

## 4. Kế hoạch Tối ưu hóa (Controlled Optimization Plan)

1. **Cache chỉ mục và Ma trận vùng tra cứu VLOOKUP / HLOOKUP / MATCH / INDEX:**
   - Tạo cache bảng tra cứu theo khóa: `sheetName + ":" + rangeAddress + ":" + sheetVersion`.
   - Lưu trữ ma trận đã trích xuất, danh sách `candidates` (khóa cột 0 cho VLOOKUP, hàng 0 cho HLOOKUP).
   - Với tra cứu chính xác (`exact = true` / `range_lookup = 0 / FALSE`): Xây dựng sẵn `Map<key, rowIndex>` (`O(1)` lookup thay vì `candidates.find` `O(N)`).
   - Cơ chế vô hiệu hóa cache: Tăng `sheetVersion` khi có bất kỳ ô nào trong sheet bị thay đổi (setCellValue, paste, fill, import...).
2. **Tối ưu `_maxUsedRow` và `_parseReference`:**
   - Không lặp toàn bộ `keys()` với regex mỗi khi gặp tham chiếu cột (như `A:G`).
   - Lưu `maxRow` trên sheet metadata hoặc tính 1 lần theo phiên bản sheet.
3. **Chỉ cập nhật DOM cho ô nằm trong viewport:**
   - Chỉ tìm kiếm và cập nhật DOM nếu ô công thức nằm trong phạm vi hàng hiển thị (`currentStartRow <= row <= currentEndRow` và thuộc `activeSheet`).
4. **Bảo toàn tính toàn vẹn 100% (Zero diff):**
   - Đã lưu snapshot toàn bộ giá trị công thức của `lan28`, `lan06`, `lan14` vào các file `_snapshot_*.json`.
   - Sau khi tối ưu, so khớp từng ô một đảm bảo độ lệch = 0.
   - Giữ nguyên chế độ tính toán thủ công (Manual calculation mode).
