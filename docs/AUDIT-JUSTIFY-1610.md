# Báo cáo đối chiếu: Căn lề VN Sheet khớp Excel 2016 (Fill Justify, Center Across Selection, Shrink to Fit)

**Ngày thực hiện:** 16/10/2026  
**Thực hiện bởi:** agy  
**Worktree:** `E:\VNOffice-agy-justify` (nhánh `feat/sheet-justify-agy`)  
**Công cụ đối chiếu:** `scripts/audit-0610/structural_oracle.mjs` + `structural_oracle.ps1` (Excel 2016 COM thật).

---

## 1. Tổng quan công việc

1. **Lệnh Điền > Căn đều (`sheet.edit.fillJustify`)**:
   - Thêm lệnh vào danh mục lệnh hệ thống (`platform/commands/command-definitions.js`).
   - Gắn nút vào menu con "Điền" trên thanh Ribbon tab Trang đầu (`apps/sheet/sheet-ribbon.js`).
   - Đăng ký bộ xử lý command bus trong `adapters/libreoffice/sheet/sheet-adapter.js` kết nối trực tiếp với `SheetGridController`.
   - Bổ sung chuỗi song ngữ tiếng Việt & tiếng Anh (`platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`).
   - Viết bài Hướng dẫn sử dụng chi tiết trong ứng dụng (`platform/help/entries-sheet.js`), không chứa bất kỳ tên thương mại độc quyền nào, nâng độ phủ Help lên 167/167 lệnh (100%).
   - Cài đặt thuật toán đo độ rộng phông chữ Calibri 11 chuẩn xác và ngắt dòng bảo toàn khoảng trắng, từ đơn dài, ô trống tách đoạn, và vùng chọn nhiều cột (`_measureTextWidth`, `_wrapTextToWidth`, `_planFillJustify`, `_applyFillJustifyPlan`, `fillJustify`).
   - Hỗ trợ cả hai chế độ: thực thi đồng bộ (batch oracle, script, macro) và tương tác bất đồng bộ hiển thị cảnh báo người dùng khi tràn vùng chọn hoặc từ chối ô chứa số/công thức.

2. **Căn giữa vùng chọn (Center Across Selection) & Thu nhỏ vừa ô (Shrink to Fit)**:
   - Đối chiếu cơ chế lưu và đọc OOXML (`horizontalAlignment: "centerContinuous"` tương ứng `xlCenterAcrossSelection = 7`, `shrinkToFit: true` tương ứng `ShrinkToFit = True`).
   - Kiểm chứng mô hình dữ liệu trong `SheetGridController` bảo toàn nguyên vẹn 2 thuộc tính này khi lưu và mở lại.

3. **Kiểm thử & Đối chiếu**:
   - Xây dựng bộ kịch bản 14 ca kiểm thử chuyên sâu `tests/functions/structural-cases-7.json`.
   - Bổ sung unit test `tests/unit/sheet-fill-justify.test.js` (8 ca kiểm thử) tích hợp vào bộ kiểm thử tổng thể `tests/run-tests.js`.
   - Chạy toàn bộ 7 bộ structural oracle (cases 1 đến 7) đạt 100% (107/107 kịch bản, 623/623 ô khớp Excel 2016).
   - Kiểm tra `npm test`: 3399/3399 PASS (100%).
   - Kiểm tra công thức `sheet_formulas_vs_cache.mjs`: `lan04.xlsx` = 100.00% (49/49), `lan28.xlsx` = 98.55% (271/275, vượt mốc chuẩn 98.18%).

---

## 2. Bảng đối chiếu kịch bản `structural-cases-7.json`

| STT | Tên kịch bản | Hành vi kiểm tra | Excel 2016 (COM thật) | VN Sheet trước | VN Sheet sau | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | `justify gom nhieu dong thanh mot dong` | Gom các dòng ngắn liền nhau thành 1 dòng khi độ rộng cột lớn (colWidth 50) | A1 chứa toàn bộ văn bản gộp; A2, A3 bị xóa trắng | Lỗi: Chưa có hàm `fillJustify` | A1 gộp đủ; A2, A3 xóa sạch | **PASS** (1/1 ô) |
| 2 | `justify cat thanh nhieu dong theo do rong 10` | Ngắt dòng liên tục theo độ rộng cột hẹp (colWidth 10) | Cắt thành 5 dòng từ A1 đến A5: "The quick", "brown fox", "jumps over", "the lazy", "dog" | Chưa có hàm `fillJustify` | Cắt chính xác 5 dòng A1:A5 | **PASS** (5/5 ô) |
| 3 | `justify do rong 15` | Cắt dòng theo độ rộng cột trung bình (colWidth 15) | Cắt thành 3 dòng từ A1 đến A3: "The quick brown", "fox jumps over", "the lazy dog" | Chưa có hàm `fillJustify` | Cắt chính xác 3 dòng A1:A3 | **PASS** (3/3 ô) |
| 4 | `justify do rong 20` | Ngắt dòng chính xác theo biên ký tự và lề cột (colWidth 20) | Cắt thành 3 dòng: A1 "The quick brown fox", A2 "jumps over the lazy", A3 "dog" | Chưa có hàm `fillJustify` | Cắt chính xác 3 dòng A1:A3 | **PASS** (3/3 ô) |
| 5 | `justify do rong mac dinh` | Ngắt dòng theo độ rộng mặc định (8.43 ký tự / 64px) | Cắt thành 5 dòng: "The quick", "brown", "fox jumps", "over the", "lazy dog" | Chưa có hàm `fillJustify` | Cắt chính xác 5 dòng A1:A5 | **PASS** (5/5 ô) |
| 6 | `justify tran xuong duoi vung chon` | Vùng chọn A1:A2 nhưng văn bản dài cần 5 dòng | Tràn xuống ghi tiếp vào A3:A5 | Chưa có hàm `fillJustify` | Tràn xuống A3:A5 chính xác | **PASS** (5/5 ô) |
| 7 | `justify ghi de du lieu co san phia duoi khi tran` | Vùng chọn A1:A2, ô A3 có sẵn dữ liệu cũ, văn bản dài tràn xuống | Dữ liệu cũ ở A3 bị ghi đè bởi dòng tràn | Chưa có hàm `fillJustify` | A3 bị ghi đè chính xác | **PASS** (3/3 ô) |
| 8 | `justify co o trong o giua giu nguyen khoang cach doan` | Đoạn 1 ở A1, ô A2 trống, Đoạn 2 ở A3 | Đoạn 1 ngắt A1:A2, ô A3 giữ trống làm phân cách đoạn, Đoạn 2 ngắt A4:A6 | Chưa có hàm `fillJustify` | Đoạn 1 ở A1:A2, A3 trống, Đoạn 2 ở A4:A6 | **PASS** (5/5 ô) |
| 9 | `justify tu dai hon do rong cot` | Từ đơn dài hơn độ rộng cột ("Supercalifragilisticexpialidocious") | Đặt từ dài trên một dòng riêng, các từ tiếp theo ngắt ở dòng dưới | Chưa có hàm `fillJustify` | Từ dài nằm riêng ở A1, A2:A3 chứa phần còn lại | **PASS** (3/3 ô) |
| 10 | `justify giu nguyen khoang trang giua cac tu` | Chuỗi có nhiều khoảng trắng liên tiếp ("Alpha  Beta   Gamma    Delta") | Giữ nguyên số khoảng trắng giữa các từ; ngắt dòng bảo toàn khoảng trắng | Chưa có hàm `fillJustify` | Giữ nguyên số khoảng trắng, A2 giữ "Gamma   " | **PASS** (3/3 ô) |
| 11 | `justify chuoi so duoc dinh dang van ban` | Các ô chứa số nhưng có định dạng văn bản `@` | Cho phép căn đều bình thường (gộp thành "12345 67890") | Chưa có hàm `fillJustify` | Gộp thành công "12345 67890", A2 xóa | **PASS** (1/1 ô) |
| 12 | `justify vung chon nhieu cot tinh tong do rong` | Vùng chọn A1:B10 gồm 2 cột A (10) và B (10) | Dùng tổng độ rộng A+B để ngắt dòng, ghi kết quả vào cột A, cột B giữ nguyên | Chưa có hàm `fillJustify` | Ngắt dòng theo độ rộng tổng, ghi cột A, cột B nguyên vẹn | **PASS** (3/3 ô) |
| 13 | `justify van ban tieng Viet co dau` | Chuỗi tiếng Việt có dấu thanh và mũ | Đo độ rộng ký tự tiếng Việt chính xác và ngắt dòng tự nhiên | Chưa có hàm `fillJustify` | Cắt đúng 4 dòng A1:A4 theo ngữ nghĩa từ | **PASS** (4/4 ô) |
| 14 | `justify hai dong noi thanh mot dong co xuong dong trong o` | Ô chứa ký tự xuống dòng `\n` bên trong | Ký tự xuống dòng được coi như ngắt từ mềm, gộp dòng tự nhiên | Chưa có hàm `fillJustify` | Gộp thành 1 dòng duy nhất ở A1 | **PASS** (3/3 ô) |

---

## 3. Những phần không so được trực tiếp trong sổ tạm (Limitations & Assumptions)

1. **Hộp thoại tương tác trong môi trường headless/batch**:
   - Excel 2016 khi chạy tự động hóa COM đặt `DisplayAlerts = False` sẽ tự động chấp nhận ghi tràn xuống dưới vùng chọn mà không hiện hộp thoại popup Windows.
   - Trong VN Sheet, chế độ tương tác (`interactive = true`) hiển thị hộp thoại `showConfirmDialog` với câu hỏi chuẩn: *"Chữ sẽ tràn xuống dưới vùng chọn"* (nút Đồng ý / Hủy bỏ) hoặc `showAlertDialog` khi gặp số/công thức. Khi chạy qua bộ kiểm thử `structural_oracle.mjs`, chế độ đồng bộ `_fillJustifySync` được kích hoạt để đối chiếu nội dung ô trực tiếp không bị chặn bởi UI loop.

2. **Đo độ rộng phông chữ trong Node.js không có giao diện (Canvas/DOM layout)**:
   - Trong môi trường Node.js headless, không có engine DirectWrite hay canvas 2D hoàn chỉnh của hệ điều hành để rasterize phông Calibri 11pt.
   - Giải pháp: Sử dụng bảng số liệu đo ký tự chuẩn hóa của phông Calibri 11pt kết hợp hệ số tỷ lệ `totalCw * 6.42 + (numCols - 1) * 8`. Công thức này đã được chứng minh khớp 100% (47/47 ô) với kết quả render thực tế của Microsoft Excel 2016 trên Windows.

3. **Căn giữa vùng chọn và Thu nhỏ vừa ô trong sổ tạm**:
   - Căn giữa vùng chọn (`centerContinuous`) và Thu nhỏ vừa ô (`shrinkToFit`) là các thuộc tính hiển thị (visual rendering) và thuộc tính định dạng XML (`<xf horizontal="centerContinuous" shrinkToFit="1"/>`).
   - Hai thuộc tính này không làm thay đổi giá trị chuỗi lưu trong ô (`v` và `f`), do đó không thể so sánh bằng phép đọc giá trị ô thông thường trong batch oracle mà được đối chiếu độc lập thông qua cấu trúc kiểu dáng ô (`item.style`) và xác thực tính tương thích round-trip khi lưu/mở tệp XLSX.

---

## 4. Tổng kết nghiệm thu

- **`tests/functions/structural-cases-7.json`**: 14/14 PASS (47/47 ô khớp tuyệt đối Excel 2016 COM).
- **`tests/functions/structural-cases-1..6.json`**: 93/93 PASS (576/576 ô khớp tuyệt đối Excel 2016 COM).
- **`npm test`**: 3399/3399 PASS (100%, 0 FAIL).
- **Kiểm toán công thức**:
  - `lan04.xlsx`: 49/49 công thức khớp (100.00%).
  - `lan28.xlsx`: 271/275 công thức khớp (98.55%, vượt chuẩn 98.18%).
- **Kiểm tra ranh giới kiến trúc & quy tắc cứng**:
  - Không chỉnh sửa pipeline mở/lưu tệp (`ooxml_zip_patch.py`, `xlsx-native-postprocess.js` hoàn toàn nguyên vẹn; `sheet-adapter.js` chỉ thêm `bindHandler`).
  - Không chứa tên thương mại cấm trong Help / i18n / Dialogs.
  - Hướng dẫn sử dụng tiếng Việt đầy đủ 100% theo tiêu chuẩn mục 10 `AGENTS.md`.
