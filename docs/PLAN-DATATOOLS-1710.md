# Kế hoạch Kỹ thuật: Đối chiếu & Hoàn thiện Công cụ Dữ liệu / Chỉnh sửa (Excel 2016 Parity)

## 1. Mục tiêu (Objective)
Biến tất cả các mục "Có, chưa đối chiếu" (🟢) thuộc nhóm Dữ liệu và Chỉnh sửa trong `docs/EXCEL2016-FEATURE-CHECKLIST.md` thành "Đã đối chiếu Excel 2016" (✅), bao gồm 10 tính năng:
1. **Xóa trùng lặp** (`Range.RemoveDuplicates`): nhiều cột, có/không tiêu đề, không phân biệt hoa-thường theo Excel, ô trống, số vs chữ.
2. **Tách văn bản thành cột** (`Range.TextToColumns`): dấu phân cách Tab/Chấm phẩy/Phẩy/Khoảng trắng/Khác, chuỗi dấu liên tiếp, dấu ngoặc kép qualifier, độ rộng cố định, bỏ qua cột (`xlSkipColumn`), đích (`Destination`).
3. **Tổng phụ** (`Range.Subtotal`): hàm Sum/Count/Average/Max/Min, công thức `=SUBTOTAL(func, range)`, nhãn `<Tên> Total` / `Grand Total`, xóa tổng phụ (`RemoveSubtotal`).
4. **Hợp nhất dữ liệu** (`Range.Consolidate`): theo vị trí và theo nhãn hàng đầu / cột trái, hàm SUM/COUNT/AVERAGE/MAX/MIN.
5. **Goal Seek & Bảng dữ liệu** (`Range.GoalSeek`, `Range.Table`): giải nghiệm hội tụ số, bảng dữ liệu 1 biến (hàng/cột) và 2 biến.
6. **Trình quản lý kịch bản** (`Scenarios.Add/Show/CreateSummary`): nạp giá trị kịch bản, hiển thị lên lưới, bảng tóm tắt kịch bản chuẩn Excel.
7. **Xóa** (`Range.Clear` / `ClearContents` / `ClearFormats` / `ClearComments` / `ClearHyperlinks` / `ClearNotes`): xóa từng kiểu, xóa trên ô gộp, ô có công thức tham chiếu, bảng.
8. **Trộn ô** (`Range.Merge(across)`, `Range.UnMerge`): MergeCenter, MergeAcross, giữ dữ liệu ô trên-trái, lan ô lân cận, định dạng, tham chiếu công thức.
9. **Điền Flash Fill** (`Range.FlashFill`): tách họ tên, ghép chuỗi, ngày, số điện thoại; đối chiếu trực tiếp qua Excel COM.
10. **Nhóm / Bỏ nhóm / Dàn bài** (`Range.Group`/`Ungroup`, `Outline.ShowLevels`): trạng thái ẩn/hiện hàng theo cấp dàn bài.

## 2. Năng lực hiện tại (Current Capability)
- `apps/sheet/data-tools.js`: đã có `removeDuplicates`, `subtotal`, `textToColumns`, `flashFill`. Tuy nhiên:
  - `removeDuplicates`: hiện đang phân biệt hoa-thường bằng `JSON.stringify`, chưa chuyển dịch phạm vi con đúng chuẩn Excel (chỉ dời ô trong vùng chọn).
  - `textToColumns`: chưa hỗ trợ text qualifier (ngoặc kép), bỏ qua cột, destination khác cột nguồn, nhiều ký tự phân cách liên tiếp.
  - `subtotal`: đang dùng công thức `=SUM(...)` thay vì công thức chuẩn `=SUBTOTAL(9, ...)`, nhãn và nhóm dàn bài chưa đồng bộ.
  - `flashFill`: đã có heuristic cơ bản nhưng cần mở rộng hỗ trợ tách họ-tên phức tạp và kiểm tra khớp Excel COM.
- `apps/sheet/consolidate.js` & `sheet-grid.js`: đã có `applyConsolidate`, hỗ trợ gộp theo vị trí và theo nhãn.
- `apps/sheet/sheet-grid.js`: đã có `findGoalSeekSolution`, `calculateDataTable`, `saveScenario`, `applyScenario`, `generateScenarioSummary`, `clearAll`, `clearContents`, `clearFormats`, `clearComments`, `clearHyperlinks`, `mergeCells`, `unmergeCells`, `groupSelection`, `ungroupSelection`, `toggleOutlineGroup`.
- `scripts/audit-0610/structural_oracle.ps1` & `.mjs`: đã hỗ trợ các lệnh hàng-cột, fill, sort, filter, tables, shapes, calc. Cần bổ sung các `op` mới cho 10 tính năng dữ liệu.

## 3. Các tệp và mô-đun thay đổi (Files & Modules)
- `scripts/audit-0610/structural_oracle.ps1`: bổ sung các switch case `op`:
  - `removeDuplicates`
  - `textToColumns`
  - `subtotal`, `removeSubtotal`
  - `consolidate`
  - `goalSeek`
  - `dataTable`
  - `addScenario`, `showScenario`, `scenarioSummary`
  - `clear`, `clearContents`, `clearFormats`, `clearComments`, `clearHyperlinks`
  - `mergeCells`, `unmergeCells`
  - `flashFill`
  - `groupRows`, `groupCols`, `ungroupRows`, `ungroupCols`, `showOutlineLevels`
  - Sử dụng `[System.IO.File]::WriteAllText` UTF-8 không BOM để ghi `OutputJson`.
- `scripts/audit-0610/structural_oracle.mjs`: bổ sung các switch case `op` tương ứng trên VN Sheet grid, cập nhật gom `got` bao gồm `_isRowSkipped(r)` cho outline.
- `apps/sheet/data-tools.js`:
  - Hoàn thiện `removeDuplicates`: so sánh không phân biệt hoa thường (`String(val).toLowerCase()`), chỉ dịch chuyển nội dung trong phạm vi range khi range không phải toàn hàng.
  - Hoàn thiện `textToColumns`: hỗ trợ `consecutiveDelimiter`, `textQualifier`, `destination`, `fieldInfo` (bỏ qua cột).
  - Hoàn thiện `subtotal`: sử dụng mã hàm `SUBTOTAL(funcCode, range)` chuẩn Excel (`9` cho SUM, `2`/`3` cho COUNT, `1` cho AVERAGE, `4` cho MAX, `5` cho MIN), tạo Outline group.
- `apps/sheet/sheet-grid.js`:
  - Bổ sung helper `showOutlineLevels(rowLevel, colLevel)` để điều khiển mức dàn bài hiển thị/thu gọn tương đương Excel `Outline.ShowLevels`.
  - Đảm bảo `clearFormats`, `clearAll`, `mergeCells` xử lý đồng bộ và chính xác.
- `tests/functions/structural-cases-17.json` (và `-18.json` nếu >60 kịch bản): bộ kịch bản đối chiếu cho cả 10 tính năng (mỗi tính năng ≥ 4-6 kịch bản, bao gồm ca biên).
- `scripts/audit-0610/gen_excel_checklist.py`: cập nhật bằng chứng file:dòng cho các dòng tính năng đã đối chiếu.
- `docs/EXCEL2016-FEATURE-CHECKLIST.md`: cập nhật lại sau khi chạy `gen_excel_checklist.py`.
- `tests/unit/sheet-datatools-oracle.test.js`: test suite chạy trong `npm test` để kiểm tra các kịch bản đối chiếu.
- `docs/AUDIT-DATATOOLS-1710.md`: tài liệu báo cáo kiểm toán đầy đủ bảng đo đạc.

## 4. Phụ thuộc & Giới hạn (Dependencies & Boundaries)
- Không gọi LibreOffice internal implementation từ UI.
- Tuân thủ ranh giới layer: sửa trong `apps/sheet/**` hoặc `scripts/audit-0610/**`.
- Không SendKeys, không kill theo tên tiến trình (chỉ PID), không tắt `Excel.Visible` nếu không đúng quy định.
- Không sửa golden/kỳ vọng test để xanh giả mạo.

## 5. Rủi ro & Giải pháp phòng ngừa (Risks & Mitigations)
- **Rủi ro**: `Range.RemoveDuplicates` trên Excel COM có thể bật hộp thoại cảnh báo nếu có ô merge hoặc phạm vi đặc biệt.
  - *Giải pháp*: `Retry { $x.DisplayAlerts = $false }` đã được cấu hình trong `structural_oracle.ps1`.
- **Rủi ro**: `Range.Subtotal` tạo ra các hàng mới làm thay đổi số hàng của trang tính và thêm hàng Grand Total.
  - *Giải pháp*: Xây dựng logic chèn hàng và công thức `SUBTOTAL` chính xác theo thứ tự nhóm của Excel, tính toán lại toàn bộ sau khi chèn.
- **Rủi ro**: UTF-8 BOM gây lỗi JSON parser trong Node.js.
  - *Giải pháp*: PowerShell ghi tệp bằng `[System.IO.File]::WriteAllText($OutputJson, $json, (New-Object System.Text.UTF8Encoding($false)))`.

## 6. Kế hoạch kiểm thử (Test Plan)
1. Chạy `powershell -ExecutionPolicy Bypass -File scripts/audit-0610/structural_oracle.ps1 tests/functions/structural-cases-17.json tests/functions/golden-structural-17.json` -> sinh kết quả từ Excel 2016 COM thật.
2. Chạy `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-17.json tests/functions/golden-structural-17.json` -> đối chiếu từng ô 100% PASS.
3. Chạy hồi quy các bộ structural-cases cũ: `cases-1..8` đảm bảo 100% PASS.
4. Chạy `npm test` đảm bảo 100% PASS (3563+ bài kiểm tra).
5. Chạy `python scripts/audit-0610/verify_checklist_evidence.py docs/EXCEL2016-FEATURE-CHECKLIST.md`.

## 7. Rollback
Nếu có vấn đề không tương thích, có thể `git checkout` các tệp sửa đổi trên nhánh `feat/sheet-datatools-agy` vì mọi thay đổi đều được kiểm tra trong worktree riêng biệt.
