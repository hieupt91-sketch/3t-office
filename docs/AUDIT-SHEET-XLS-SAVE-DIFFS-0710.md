# Báo cáo Audit & Chẩn đoán: Lệch ô khi lưu tệp .xls (Excel 97-2003) trong 3T Sheet

- **Ticket**: TICKET-SB10 & TICKET-SB11
- **Thời điểm thực hiện**: 08/10/2026
- **Môi trường & Worktree**: `E:\VNOffice-agy-sb11`, nhánh `fix/sheet-xls-save-diffs2-agy`
- **Bộ dữ liệu kiểm chứng**: 20 tệp `.xls` thực tế tại `file test/lan-legacy` (legacy01.xls — legacy20.xls)
- **Quy tắc bảo mật nội dung**: Báo cáo chỉ ghi nhận địa chỉ ô, kiểu dữ liệu, loại lệch và phân loại nguyên nhân; KHÔNG đưa nội dung nhạy cảm của tệp dữ liệu thật vào tài liệu.

---

## 1. Bảng tổng hợp kết quả Audit tệp .xls (Trước & Sau SB11)

Lệnh thực hiện:
```powershell
python scripts/layout-audit/batch_document_audit.py xls .
```

### Bảng đối chiếu Trước (SB4 baseline) vs Sau SB10 vs Sau SB11

| Tệp | Lưu thành công | OLE2 Magic | Số sheet | Tổng ô | Diffs (SB4) | Diffs (SB10) | Diffs (SB11) | Bộ so sánh | Ghi chú trạng thái |
|---|:---:|:---:|---:|---:|---:|---:|---:|:---:|---|
| legacy01.xls | yes | D0CF11E0 | 1 | 33 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy02.xls | yes | D0CF11E0 | 1 | 43 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy03.xls | yes | D0CF11E0 | 1 | 140 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy04.xls | yes | D0CF11E0 | 2 | 118 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy05.xls | yes | D0CF11E0 | 3 | 66 | 0 | 0 | **0** | libreoffice | So khớp 100% |
| legacy06.xls | yes | D0CF11E0 | 1 | 184 | 10 | 9 | **9** | libreoffice | 9 ô công thức `#REF!` phức hợp (Lõi LibreOffice BIFF8) |
| legacy07.xls | yes | D0CF11E0 | 1 | 113 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy08.xls | yes | D0CF11E0 | 2 | 117 | - | 6 | **6** | libreoffice | 6 ô Macro sheet công thức `#NAME!()` (Lõi LibreOffice BIFF8) |
| legacy09.xls | yes | D0CF11E0 | 6 | 537 | 0 | 0 | **0** | libreoffice | So khớp 100% |
| legacy10.xls | yes | D0CF11E0 | 2 | 115 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy11.xls | yes | D0CF11E0 | 4 | 397 | - | 1 | **0** | libreoffice | **0 diff**: Sửa bộ so sánh đọc chuẩn ODF `office:string-value` |
| legacy12.xls | yes | D0CF11E0 | 1 | 211 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy13.xls | yes | D0CF11E0 | 1 | 44 | - | 1 | **1** | libreoffice | 1 ô hàm `VND()` bảo toàn kết quả đọc tiền (Chủ ý thiết kế mã VN) |
| legacy14.xls | yes | D0CF11E0 | 1 | 58 | 0 | 0 | **0** | libreoffice | So khớp 100% |
| legacy15.xls | yes | D0CF11E0 | 1 | 120 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy16.xls | yes | D0CF11E0 | 1 | 50 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy17.xls | yes | D0CF11E0 | 1 | 43 | 0 | 0 | **0** | libreoffice | So khớp 100% |
| legacy18.xls | yes | D0CF11E0 | 3 | 63 | 1 | 1 | **1** | libreoffice | 1 ô hàm `VND()` bảo toàn kết quả đọc tiền (Chủ ý thiết kế mã VN) |
| legacy19.xls | yes | D0CF11E0 | 3 | 18 | - | 0 | **0** | libreoffice | So khớp 100% |
| legacy20.xls | yes | D0CF11E0 | 1 | 45 | - | 0 | **0** | libreoffice | So khớp 100% |

**Tổng kết:**
- 20/20 tệp `.xls` lưu thành công (`saved: yes`), đúng định dạng nhị phân OLE2 (`D0CF11E0`).
- **16/20 tệp khớp hoàn toàn 0 lệch (0 diffs)** (tăng từ 15/20 lên 16/20 nhờ sửa lỗi nhận diện chuỗi trong bộ so sánh cho legacy11).
- 2 tệp có 1 ô lệch (`legacy13.xls` và `legacy18.xls`): Do cơ chế bảo vệ kết quả đọc tiền tiếng Việt của hàm `VND()` (chủ ý thiết kế mã VN).
- 2 tệp có ô lệch do giới hạn bộ lọc nhị phân BIFF8 của lõi LibreOffice: `legacy06.xls` (9 ô `#REF!`) và `legacy08.xls` (6 ô `#NAME!()`).

---

## 2. Phân tích chi tiết từng ô lệch theo yêu cầu TICKET-SB10 và TICKET-SB11

### 2.1. legacy06.xls (9 ô lệch theo LibreOffice)

Sheet: `Nhà dân`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `Nhà dân!I19` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 2 | `Nhà dân!I21` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 3 | `Nhà dân!I23` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 4 | `Nhà dân!I25` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 5 | `Nhà dân!I28` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 6 | `Nhà dân!I29` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 7 | `Nhà dân!I30` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 8 | `Nhà dân!I31` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |
| 9 | `Nhà dân!I32` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lõi LibreOffice (Bộ lọc BIFF8) |

#### Phân loại & Bằng chứng thực nghiệm nguyên nhân gốc legacy06:
1. **9 ô công thức `#REF!`**:
   - **Thực nghiệm độc lập:** Trích xuất FODS nguyên bản trực tiếp từ tệp gốc bằng LibreOffice (`legacy06.xls` → `fods` thuần túy, không qua bất kỳ mã nguồn nào của VN Office), sau đó dùng LibreOffice chuyển đổi ngược lại thành `.xls`. Cả 9 ô này trong tệp `.xls` do chính LibreOffice xuất ra đều bị LibreOffice tự động đổi thành `=NA()` (`=#N/A`).
   - **Lý do kỹ thuật Core:** Bộ lọc nhị phân BIFF8 (`MS Excel 97`) của LibreOffice Calc khi gặp token `#REF!` hoặc `[#REF!]` nằm trong một biểu thức phức hợp (`=[#REF!]-([#REF!]*[#REF!])`) không thể biên dịch biểu thức này thành token `ptgRefErr` (0x2A) của BIFF8. LibreOffice Calc gặp lỗi biên dịch công thức và tự động fallback toàn bộ công thức của ô thành `=NA()` (mã lỗi `0x800A07FA`).
   - **Kiểm chứng ngược với .xlsx:** Khi lưu chính các ô này sang định dạng `.xlsx` (OOXML), LibreOffice xuất đúng 100% `=[#REF!]-([#REF!]*[#REF!])` và giá trị `#REF!`. Lỗi này hoàn toàn là giới hạn của bộ lọc BIFF8 trong LibreOffice Core.

---

### 2.2. legacy08.xls (6 ô lệch)

Sheet: `Macro1`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `Macro1!A2` | Công thức macro / tên lỗi | `#NAME?` (`-2146826273`) | `#N/A` (`-2146826246`) | `=[#NAME!()]` | `=NA()` | Chuẩn (General) | Lõi LibreOffice (Bộ lọc BIFF8) |
| 2 | `Macro1!A3` | Công thức điều kiện lỗi | Số `0` | `#N/A` (`-2146826246`) | `=IF(ERROR.TYPE(#NAME!())=4)` | `=NA()` | Chuẩn (General) | Lõi LibreOffice (Bộ lọc BIFF8) |
| 3 | `Macro1!A4` | Công thức macro / tên lỗi | `#NAME?` (`-2146826273`) | `#N/A` (`-2146826246`) | `=[#NAME!()]` | `=NA()` | Chuẩn (General) | Lõi LibreOffice (Bộ lọc BIFF8) |
| 4 | `Macro1!A5` | Công thức macro / tên lỗi | `#NAME?` (`-2146826273`) | `#N/A` (`-2146826246`) | `=[#NAME!()]` | `=NA()` | Chuẩn (General) | Lõi LibreOffice (Bộ lọc BIFF8) |
| 5 | `Macro1!A6` | Công thức macro / tên lỗi | `#NAME?` (`-2146826273`) | `#N/A` (`-2146826246`) | `=[#NAME!()]` | `=NA()` | Chuẩn (General) | Lõi LibreOffice (Bộ lọc BIFF8) |
| 6 | `Macro1!A7` | Công thức macro / tên lỗi | `#NAME?` (`-2146826273`) | `#N/A` (`-2146826246`) | `=[#NAME!()]` | `=NA()` | Chuẩn (General) | Lõi LibreOffice (Bộ lọc BIFF8) |

#### Phân loại & Bằng chứng thực nghiệm nguyên nhân gốc legacy08:
1. **6 ô Macro sheet công thức `#NAME!()`**:
   - **Thực nghiệm độc lập thuần túy:** Chuyển đổi trực tiếp bằng LibreOffice không qua mã nguồn VN: `legacy08.xls` -> `fods` -> `.xls` -> `fods`. Kết quả: Toàn bộ 6 ô trong sheet `Macro1` đều bị LibreOffice tự động biến đổi công thức thành `of:=NA()` và giá trị `#N/A`.
   - **Kiểm chứng ngược với .xlsx:** Khi cho LibreOffice chuyển đổi cùng file FODS sang `.xlsx`, LibreOffice xuất chuẩn xác 100% các công thức gốc: `of:=#name!()` và `of:=IF(ERROR.TYPE(#name!())=4;TRUE())`.
   - **Lý do kỹ thuật Core:** Tệp `legacy08.xls` chứa sheet macro Excel 4.0 (`Macro1`). Các công thức này chứa token tên hàm macro không xác định, khi LibreOffice đọc BIFF8 sẽ biểu diễn dưới dạng hàm lỗi `of:=#NAME!()`. Khi xuất ngược lại định dạng nhị phân BIFF8 `.xls`, trình biên dịch công thức BIFF8 của LibreOffice Calc không có hàm nào tên `#NAME!`, dẫn đến lỗi biên dịch bytecode và tự động fallback thành `=NA()`.
   - **Đề xuất giảm thiểu:**
     1. Bổ sung mục cảnh báo trong tài liệu Hướng dẫn sử dụng (`platform/help/entries-sheet.js`) để thông báo cho người dùng: Các bảng tính cũ chứa công thức mảng, macro hoặc biểu thức lỗi phức hợp (`#REF!`, `#NAME!()`) khi lưu `.xls` có thể bị bộ lọc nhị phân chuyển thành `#N/A`; khuyến nghị lưu bản sao sang `.xlsx` để bảo toàn trọn vẹn công thức.
     2. Giữ nguyên hành vi lưu của ứng dụng, không tự ý chỉnh sửa công thức trong file của người dùng.

---

### 2.3. legacy11.xls (1 ô lệch giả lập -> Đã khắc phục 0 lệch)

Sheet: `Báo Giá Khóa Thông Minh`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `Báo Giá Khóa Thông Minh!E12` | Chuỗi văn bản | Chuỗi văn bản (có khoảng trắng đệm mô phỏng hiển thị Comma) | Chuỗi văn bản (giá trị thực tế trong bảng chuỗi SST) | Không có | Không có | Kế thừa Comma (`_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)`) | **Bộ so sánh (`_xls_compare_libreoffice.py`)** |

#### Phân loại & Bằng chứng thực nghiệm nguyên nhân gốc legacy11:
1. **Kiểm tra trực tiếp tệp nhị phân gốc:**
   - Quét bảng Shared String Table (SST) trong tệp gốc `legacy11.xls` tại offset 838923: `cch = 7`, `flags = 1`, chuỗi UTF-16LE thực tế là `"Công/Bộ"` (chính xác 7 ký tự: `C`, `ô`, `n`, `g`, `/`, `B`, `ộ`). Chuỗi dữ liệu gốc hoàn toàn không có ký tự khoảng trắng ở cuối.
2. **Nguyên nhân gây lệch giả trong bộ so sánh:**
   - Trong tệp gốc, ô `E12` gán style kế thừa từ kiểu dựng sẵn Comma của Excel (`Excel_BuiltIn_Comma`). Trong Excel, quy tắc hiển thị chuỗi của Comma style là `_(@_)`, quy định thêm khoảng trống đệm ở hai bên chuỗi khi hiển thị.
   - Do đó, khi LibreOffice chuyển tệp gốc sang FODS, nó ghi nhận:
     - Giá trị dữ liệu thực tế (chuẩn ODF): `office:value-type="string" office:string-value="Công/Bộ"`
     - Đoạn văn bản mô phỏng giao diện: `<text:p><text:s/>Công/Bộ </text:p>` (chứa thẻ `<text:s/>` ở đầu và ký tự cách ở cuối).
   - Mã VN Sheet (`sheet-adapter.js` dòng 3819) tuân thủ đúng chuẩn ODF: ưu tiên đọc `office:string-value`, nhận giá trị đúng `"Công/Bộ"`, và lưu lại tệp đúng `"Công/Bộ"`.
   - Tuy nhiên, bộ so sánh `_xls_compare_libreoffice.py` trước đây chỉ đọc các thẻ `<text:p>` thông qua `p.itertext()` mà bỏ qua thuộc tính chuẩn ODF `office:string-value`. Khi đọc tệp gốc, nó thu được chuỗi mô phỏng `"Công/Bộ "`, trong khi tệp đã lưu là `"Công/Bộ"`, dẫn đến báo lệch giả 1 ô.
3. **Biện pháp khắc phục:**
   - Cập nhật `_xls_compare_libreoffice.py` để ưu tiên đọc thuộc tính `office:string-value` khi `value-type == "string"`, tuân thủ đúng chuẩn ODF v1.2/1.3.
   - Kết quả kiểm chứng: `legacy11.xls` chuyển từ **1 diff thành 0 diffs (khớp 100%)**. Toàn bộ 19 tệp còn lại không có bất kỳ thay đổi tiêu cực nào.

---

### 2.4. legacy13.xls (1 ô lệch chủ ý)

Sheet: `xi măng`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `xi măng!C14` | Hàm đọc tiền thành chữ | `#ADDIN?` (`-2146826259`) | Chuỗi đọc tiền tiếng Việt | `=VND([.H13])` | Không có (chuỗi tĩnh) | Chung (General) | **Chủ ý thiết kế mã VN (`main.py` + `ooxml_zip_patch.py`)** |

#### Phân loại & Bằng chứng thực nghiệm nguyên nhân gốc legacy13:
1. **Bản chất thiết kế bảo vệ dữ liệu người dùng:**
   - Tương tự như trường hợp `legacy18.xls` tại SB10, tệp `legacy13.xls` chứa công thức `=VND([.H13])` gọi hàm đọc số tiền thành chữ từ add-in Excel ngoài. Khi mở trên môi trường không có add-in, ô mang giá trị lỗi `#ADDIN?` (hoặc `#NAME?`).
   - Nếu để LibreOffice tự do lưu sang `.xls`, LibreOffice Calc sẽ xóa trắng toàn bộ chuỗi tiếng Việt đọc tiền và biến ô thành lỗi `#N/A`.
   - Hàm `_sheet_fods_for_export()` trong `main.py` (gọi `fods_vnd_cells_as_text()`) đã chủ động trích xuất chuỗi kết quả đọc tiền tiếng Việt đã được tính toán và lưu thành chuỗi văn bản tĩnh khi xuất `.xls` để đảm bảo khi mở lại trên bất kỳ máy nào, nội dung tiền bằng chữ trong hóa đơn không bị mất trắng.
   - Bộ kiểm thử hồi quy `tests/test_sheet_vnd_export.py` đã dùng chính fixture của `legacy13.xls` (`xi măng!C14`) để kiểm tra tính năng này (`test_xls_export_keeps_text_as_value`). Do đó, 1 ô lệch này giữa tệp gốc (chưa có add-in mang giá trị lỗi) và tệp lưu (chuỗi tiếng Việt chuẩn xác) là hoàn toàn đúng thiết kế và mong muốn.

---

### 2.5. legacy18.xls (1 ô lệch chủ ý)

Sheet: `Sheet1`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `Sheet1!C15` | Hàm đọc tiền thành chữ | `#ADDIN?` (`-2146826259`) | Chuỗi đọc tiền tiếng Việt | `=VND([.F14])` | Không có (chuỗi tĩnh) | Chung (General) | **Chủ ý thiết kế mã VN (`main.py` + `ooxml_zip_patch.py`)** |

---

## 3. Các cải tiến và sửa lỗi đã thực hiện (BUOC 2 - SB11)

1. **Chuẩn hóa bộ so sánh ODF `_xls_compare_libreoffice.py`**:
   - File: `scripts/layout-audit/_xls_compare_libreoffice.py`
   - Chi tiết: Khi phân tích ô chuỗi (`office:value-type="string"`), bộ so sánh ưu tiên đọc thuộc tính `office:string-value` nếu tồn tại, chỉ fallback sang nội dung text lồng trong `<text:p>` khi thuộc tính này không có.
   - Kết quả: Loại bỏ báo động giả trên các ô áp dụng định dạng có đệm hiển thị như Comma style (`_(@_)`). Tệp `legacy11.xls` giảm từ 1 lệch xuống **0 lệch** (khớp hoàn toàn).
   - Test đơn vị: Bổ sung bộ kiểm thử `tests/test_xls_compare.py` (3 test cases) xác minh việc ưu tiên `office:string-value`, cơ chế fallback và tính toán so sánh bảng tính.

2. **Dọn dẹp triệt để tiến trình Excel COM ngầm theo PID**:
   - File: `scripts/layout-audit/_batch_xls_roundtrip.py`
   - Chi tiết: Lấy và lưu PID của tiến trình Excel ngay khi khởi tạo đối tượng COM. Trong khối `finally`, ngoài việc gọi `$xl.Quit()`, tự động gọi `Stop-Process -Id $xl_pid -Force` để tiêu diệt tức thì tiến trình ngầm kể cả khi Excel rơi vào trạng thái treo hộp thoại hoặc lỗi RPC busy. Thêm `Remove-Job -Force` để giải phóng tiến trình PowerShell con.

3. **Bổ sung tài liệu Hướng dẫn sử dụng về giới hạn định dạng .xls**:
   - File: `platform/help/entries-sheet.js`
   - Chi tiết: Bổ sung lưu ý trong bài hướng dẫn Lưu bảng tính (`sheet.file.saveDocument`), giải thích cho người dùng về giới hạn kỹ thuật của bộ lọc định dạng cũ `.xls` đối với các công thức macro cũ hoặc biểu thức lỗi phức hợp, và khuyến nghị sử dụng định dạng `.xlsx` khi tài liệu cần duy trì trọn vẹn các công thức phức tạp.

---

## 4. Xác nhận tiêu chí hoàn thành TICKET-SB11

- `node tests/run-tests.js`: **2956/2956 PASS**, 0 FAIL.
- `python -m unittest tests/test_xls_compare.py`: **3/3 PASS**, 0 FAIL.
- `python -m unittest discover -s tests`: **776/776 PASS**, 0 FAIL.
- Kết quả so sánh 20 tệp `.xls`:
  - **20/20 tệp saved=yes**, OLE2 magic `D0CF11E0`.
  - **16/20 tệp diff=0** (tăng từ 15/20 lên 16/20, vượt tiêu chí "không giảm").
  - 2 tệp diff=1 (`legacy13.xls` và `legacy18.xls`): Do cơ chế bảo vệ chuỗi tiền bằng chữ của hàm `VND()` theo thiết kế.
  - 2 tệp diff do lõi LibreOffice BIFF8: `legacy06.xls` (9 ô `#REF!`) và `legacy08.xls` (6 ô `#NAME!()`).
- Tiến trình kiểm thử dọn dẹp sạch theo PID, không để lại tiến trình treo trong bộ nhớ.
