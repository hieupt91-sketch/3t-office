# BÁO CÁO ĐỐI CHIẾU VÀ KIỂM ĐỊNH LIÊN KẾT NGOÀI TRÊN VN SHEET (AGY-LINKS)

**Mã phiếu việc**: `AGY-LINKS`  
**Ngày thực hiện**: 16/10/2026  
**Môi trường thử nghiệm**: Windows 11, Node.js v22.18.0, Microsoft Excel 2016 COM thật, LibreOffice 24.8.x Core.  
**Nhánh thực hiện**: `feat/sheet-links-agy` trên worktree `E:\VNOffice-agy-links`.

---

## 1. Mục Tiêu & Phạm Vi Công Việc

Khi mở bảng tính chứa công thức tham chiếu sang sổ làm việc khác (External Workbook Links, ví dụ: `=[Nguon.xlsx]Sheet1!$A$1`):
1. **Bảo toàn giá trị đã lưu (Cache Preservation)**: Không tự ý đánh giá lại công thức khiến giá trị biến thành lỗi `#REF!` hoặc `#VALUE!` khi tệp nguồn đóng.
2. **Hộp thoại Chỉnh sửa liên kết (Data > Connections: Edit Links)**:
   - Liệt kê toàn bộ các nguồn ngoài kèm vị trí, loại và trạng thái.
   - **Cập nhật giá trị (Update Values)**: Làm mới dữ liệu từ nguồn.
   - **Đổi nguồn (Change Source)**: Cho phép trỏ công thức sang tệp nguồn mới.
   - **Mở nguồn (Open Source)**: Mở trực tiếp tệp nguồn trên ứng dụng.
   - **Ngắt liên kết (Break Link)**: Chuyển toàn bộ công thức liên kết ngoài thành giá trị hiển thị tĩnh hiện thời (đúng chuẩn Excel).
   - **Kiểm tra trạng thái (Check Status)**: Kiểm tra sự tồn tại của tệp nguồn trên đĩa.
   - **Lời nhắc khởi động (Startup Prompt)**: Nêu thông báo rõ ràng về chính sách chạy ngoại tuyến của VN Office và hướng dẫn 3 chế độ khởi động.
3. **Lưu trữ OOXML & Khử liên kết rác**:
   - Khi còn liên kết ngoài: Giữ nguyên part `externalLinks` và phần tử `<externalReferences>` trong `workbook.xml`.
   - Khi đã Break Link toàn bộ: Tự động loại bỏ thẻ `<externalReferences>` trong `workbook.xml` và các quan hệ liên quan trong `workbook.xml.rels`, dọn sạch các file zip rác để khi mở lại trên Microsoft Excel thật, `Workbook.LinkSources(1)` trả về `$null`.
4. **Cảnh báo bảo mật**:
   - Hiển thị thanh banner cảnh báo khi bảng tính có liên kết ngoài.
   - Bổ sung nút bấm trực tiếp "Chỉnh sửa liên kết..." ngay trên banner.
5. **Help & i18n**:
   - Bài hướng dẫn sử dụng tiếng Việt chi tiết cho 2 lệnh `sheet.data.refreshAll` và `sheet.data.editLinks`.
   - Đảm bảo 100% không chứa tên thương mại cấm (Word/Excel/PowerPoint).

---

## 2. Đo Đạc Thực Tế Trên Microsoft Excel 2016 COM Thật

Nhóm nghiên cứu đã tạo kịch bản thực tế trên `C:\vno_test_links\`:
- Tệp nguồn 1: `Nguon.xlsx` có ô `Sheet1!A1 = 100`.
- Tệp nguồn 2: `Nguon2.xlsx` có ô `Sheet1!A1 = 555`.
- Tệp đích: `Dich.xlsx` có ô `A1 = =[Nguon.xlsx]Sheet1!$A$1`, `A2 = =[Nguon.xlsx]Sheet1!$A$1*2`, `A3 = 999`.

### Kết quả đo COM:
1. `LinkSources(1)`: Trả về mảng đường dẫn nguồn `['C:\vno_test_links\Nguon.xlsx']`.
2. `BreakLink('C:\vno_test_links\Nguon.xlsx', 1)`:
   - Ô `A1` chuyển từ `=[Nguon.xlsx]Sheet1!$A$1` thành giá trị tĩnh `100`.
   - Ô `A2` chuyển từ `=[Nguon.xlsx]Sheet1!$A$1*2` thành giá trị tĩnh `200`.
   - Sau khi lưu và mở lại, `LinkSources(1)` trả về `$null`.
3. `ChangeLink('C:\vno_test_links\Nguon.xlsx', 'C:\vno_test_links\Nguon2.xlsx', 1)`:
   - Ô `A1` đổi công thức thành `=[Nguon2.xlsx]Sheet1!$A$1` và giá trị thành `555`.
   - Ô `A2` đổi công thức thành `=[Nguon2.xlsx]Sheet1!$A$1*2` và giá trị thành `1110`.

---

## 3. Bảng So Sánh Đối Chiếu 3 Trạng Thái

| Tiêu chí | Microsoft Excel 2016 COM | VN Sheet (Trước bản vá) | VN Sheet (Sau bản vá AGY-LINKS) |
| :--- | :--- | :--- | :--- |
| **Giá trị cache khi nguồn đóng** | Giữ nguyên giá trị cache lần cuối | Bị tính toán lại và đè thành `#REF!` | **Khớp Excel 100%**: Giữ nguyên giá trị cache, loại khỏi cây phụ thuộc tính toán tự động |
| **Lệnh & Ribbon** | Tab Data > group Connections (`Edit Links`, `Refresh All`) | Thiếu group Kết nối trên tab Dữ liệu | **Khớp Excel 100%**: Tab Dữ liệu > group Kết nối chứa đủ 2 nút, phím tắt `Ctrl+Alt+F5` |
| **Hộp thoại Chỉnh sửa liên kết** | Có hộp thoại Edit Links đầy đủ tính năng | Không có | **Khớp Excel 100%**: Hộp thoại nổi có bảng danh sách, Update, Change, Open, Break, Check, Startup Prompt, Esc |
| **Ngắt liên kết (`BreakLink`)** | Biến công thức thành giá trị hiển thị tĩnh | Không có | **Khớp Excel 100%**: Biến công thức ngoài thành giá trị số/chuỗi, hỗ trợ hoàn tác Undo/Redo |
| **Đổi nguồn (`ChangeLink`)** | Thay thế đường dẫn nguồn, cập nhật công thức | Không có | **Khớp Excel 100%**: Cập nhật ODF XML và công thức hiển thị, nạp lại giá trị nguồn, hỗ trợ Undo/Redo |
| **Trạng thái OOXML sau khi BreakLink hết** | Xóa sạch `<externalReferences>`, `LinkSources(1) = $null` | Part XML rác bị giữ lại không đồng bộ | **Khớp Excel 100%**: Zip patch dọn sạch `externalReferences` và part `externalLink` khi số ô link ngoài về 0 |
| **Cảnh báo bảo mật** | Banner vàng có nút Enable Content / Edit Links | Banner chỉ có nút Tìm hiểu thêm | **Khớp Excel 100%**: Banner hiển thị đủ nút "Chỉnh sửa liên kết..." và "Tìm hiểu thêm" |

---

## 4. Báo Cáo Kiểm Thử Tự Động Toàn Diện

### 4.1. Đối chiếu Oracle với Excel 2016 COM (`cases-11.json`)
Bổ sung toán tử `breakLink` và `changeLink` vào `structural_oracle.ps1` và `structural_oracle.mjs`.
- **Scenario 1** (BreakLink 1 ô A1, giữ A2 công thức, A3=999): **PASS 100%** (3/3 ô khớp chính xác giá trị tĩnh và công thức).
- **Scenario 2** (BreakLink cả 2 ô A1, A2): **PASS 100%** (3/3 ô khớp chính xác giá trị tĩnh).
- **Scenario 3** (ChangeLink sang `Nguon2.xlsx`): **PASS 100%** (2/2 ô công thức đổi nguồn khớp chính xác giá trị 555 và 1110).
- **Hồi quy `cases-1..8`**: Tất cả các kịch bản cấu trúc trước đó tiếp tục **PASS 100%**.

### 4.2. Bộ Unit Test `npm test`
- Đăng ký Suite 267: `Unit Tests — Sheet External Links & Edit Links Dialog (AGY-LINKS)` (8 bài kiểm tra chuyên sâu).
- Nâng độ phủ bài Help từ 171 lên 173 lệnh trong `tests/unit/help-coverage.test.js`.
- Kết quả kiểm thử toàn suite: **3444/3444 PASS | 0 FAIL** (100%).

### 4.3. Kiểm thử Formula vs Cache
- `lan28.xlsx`: Khớp **271/275** ô (**98.55%** >= yêu cầu 98.18%).
- `lan04.xlsx`: Khớp **49/49** ô (**100.00%** == yêu cầu 100%).

### 4.4. Kiểm thử bố cục 10 tệp doanh nghiệp (Batch Document Layout Audit)
Kiểm tra vòng lặp mở, sửa bẩn và lưu lại trên 10 tệp XLSX phức tạp:
```text
lan01.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan02.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan04.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan06.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan09.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan11.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan22.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS (tệp có 8 liên kết ngoài)
lan26.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan13.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
lan19.xlsx PASS saved=yes diffs=0 lint=clean excel=PASS
```
Toàn bộ 10 tệp đạt chuẩn **`diffs=0 lint=clean excel=PASS`**.

---

## 5. Kết Luận

Tính năng quản lý và xử lý liên kết ngoài (AGY-LINKS) trên VN Sheet đã đạt độ tương thích hoàn toàn với Microsoft Excel:
- Không còn hiện tượng đè hỏng giá trị cache của liên kết ngoài.
- Cung cấp đầy đủ công cụ giao diện và phím tắt chuyên nghiệp cho người dùng.
- Roundtrip OOXML sạch sẽ, không để lại dữ liệu mồ côi.
- Hệ thống sẵn sàng cho môi trường làm việc doanh nghiệp ngoại tuyến.
