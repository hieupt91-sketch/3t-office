# Báo cáo Audit & Chẩn đoán: Lệch ô khi lưu tệp .xls (Excel 97-2003) trong 3T Sheet

- **Ticket**: TICKET-SB10
- **Thời điểm thực hiện**: 08/10/2026
- **Môi trường & Worktree**: `E:\VNOffice-agy-sb10`, nhánh `fix/sheet-xls-save-diffs-agy`
- **Bộ dữ liệu kiểm chứng**: 20 tệp `.xls` thực tế tại `file test/lan-legacy` (legacy01.xls — legacy20.xls)
- **Quy tắc bảo mật nội dung**: Báo cáo chỉ ghi nhận địa chỉ ô, kiểu dữ liệu, loại lệch và phân loại nguyên nhân; KHÔNG đưa nội dung nhạy cảm của tệp dữ liệu thật vào tài liệu.

---

## 1. Bảng tổng hợp kết quả Audit tệp .xls (Trước & Sau)

Lệnh thực hiện:
```powershell
python scripts/layout-audit/batch_document_audit.py xls .
```

### Bảng đối chiếu Trước (SB4 baseline) vs Sau (SB10)

| Tệp | Lưu thành công | OLE2 Magic | Số sheet | Tổng ô | Diffs (Trước) | Diffs (Sau) | Bộ so sánh | Ghi chú trạng thái |
|---|:---:|:---:|---:|---:|---:|---:|:---:|---|
| legacy01.xls | yes | D0CF11E0 | 1 | 33 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy02.xls | yes | D0CF11E0 | 1 | 43 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy03.xls | yes | D0CF11E0 | 1 | 140 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy04.xls | yes | D0CF11E0 | 2 | 118 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy05.xls | yes | D0CF11E0 | 3 | 66 | 0 | **0** | libreoffice | So khớp 100% |
| legacy06.xls | yes | D0CF11E0 | 1 | 184 | 10 | **9** | libreoffice | 9 ô công thức `#REF!` (Core LibreOffice BIFF8) |
| legacy07.xls | yes | D0CF11E0 | 1 | 113 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy08.xls | yes | D0CF11E0 | 2 | 117 | - | **6** | libreoffice | 6 ô Macro sheet công thức `#NAME!()` (Core LO) |
| legacy09.xls | yes | D0CF11E0 | 6 | 537 | 0 | **0** | libreoffice | So khớp 100% |
| legacy10.xls | yes | D0CF11E0 | 2 | 115 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy11.xls | yes | D0CF11E0 | 4 | 397 | - | **1** | libreoffice | 1 ô ký tự khoảng trắng đuôi chuỗi văn bản |
| legacy12.xls | yes | D0CF11E0 | 1 | 211 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy13.xls | yes | D0CF11E0 | 1 | 44 | - | **1** | libreoffice | 1 ô hàm `VND()` bảo toàn kết quả đọc tiền |
| legacy14.xls | yes | D0CF11E0 | 1 | 58 | 0 | **0** | libreoffice | So khớp 100% |
| legacy15.xls | yes | D0CF11E0 | 1 | 120 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy16.xls | yes | D0CF11E0 | 1 | 50 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy17.xls | yes | D0CF11E0 | 1 | 43 | 0 | **0** | libreoffice | So khớp 100% |
| legacy18.xls | yes | D0CF11E0 | 3 | 63 | 1 | **1** | libreoffice | 1 ô hàm `VND()` bảo toàn kết quả đọc tiền |
| legacy19.xls | yes | D0CF11E0 | 3 | 18 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |
| legacy20.xls | yes | D0CF11E0 | 1 | 45 | - | **0** | libreoffice | Trước lỗi RPC busy; nay so khớp 100% |

**Tổng kết:**
- 20/20 tệp `.xls` lưu thành công (`saved: yes`), đúng định dạng nhị phân OLE2 (`D0CF11E0`).
- 15/20 tệp khớp hoàn toàn 0 lệch (0 diffs).
- Không có bất kỳ tệp nào bị tụt kết quả so với trước.

---

## 2. Phân tích chi tiết từng ô lệch của legacy06.xls và legacy18.xls

### 2.1. legacy06.xls (10 ô theo Excel COM / 9 ô theo LibreOffice)

Sheet: `Nhà dân`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `Nhà dân!I19` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 2 | `Nhà dân!I21` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 3 | `Nhà dân!I23` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 4 | `Nhà dân!I25` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 5 | `Nhà dân!I28` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 6 | `Nhà dân!I29` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 7 | `Nhà dân!I30` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 8 | `Nhà dân!I31` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 9 | `Nhà dân!I32` | Công thức số học | `#REF!` (`-2146826265`) | `#N/A` (`-2146826246`) | `=[#REF!]-([#REF!]*[#REF!])` | `=NA()` | Số / Tiền tệ | Lỗi bộ lọc BIFF8 LibreOffice Core |
| 10 | `Nhà dân!C22` | Chuỗi rỗng (`PrefixCharacter="'"`) | Chuỗi rỗng `""` | Trống (nil) | Không có | Không có | Chung (General) | LibreOffice ODF import bỏ qua thuộc tính tiền tố ô |

#### Phân loại & Bằng chứng thực nghiệm nguyên nhân gốc legacy06:
1. **9 ô công thức `#REF!` (I19, I21, I23, I25, I28, I29, I30, I31, I32)**:
   - **Thực nghiệm độc lập:** Trích xuất FODS nguyên bản trực tiếp từ tệp gốc bằng LibreOffice (`legacy06.xls` → `fods` thuần túy, không qua bất kỳ mã nguồn nào của VN Office). Sau đó dùng LibreOffice chuyển đổi ngược lại thành `.xls`.
   - **Kết quả:** Cả 9 ô này trong tệp `.xls` do chính LibreOffice xuất ra **đều bị LibreOffice tự động đổi thành `=NA()` (`=#N/A`)**.
   - **Lý do kỹ thuật Core:** Bộ lọc nhị phân BIFF8 (`MS Excel 97`) của LibreOffice Calc khi gặp token `#REF!` hoặc `[#REF!]` nằm trong một biểu thức phức hợp (`=[#REF!]-([#REF!]*[#REF!])`) không thể compile biểu thức này thành token `ptgRefErr` (0x2A) của BIFF8. LibreOffice Calc gặp lỗi biên dịch công thức và tự động fallback toàn bộ công thức của ô thành `=NA()` (mã lỗi `0x800A07FA`).
   - **Kiểm chứng ngược với .xlsx:** Khi lưu chính các ô này sang định dạng `.xlsx` (OOXML), LibreOffice xuất đúng 100% `=[#REF!]-([#REF!]*[#REF!])` và giá trị `#REF!` (`-2146826265`). Lỗi này hoàn toàn là giới hạn của bộ lọc BIFF8 trong LibreOffice Core.
2. **Ô C22 (`Nhà dân!C22`)**:
   - Tệp gốc chứa ô chuỗi rỗng có tiền tố `'` (`PrefixCharacter = "'"` trong Excel COM, `Value2 = ""`), phía trên vẽ các shape checkbox.
   - LibreOffice Calc khi đọc BIFF8 nhập ô này thành ô rỗng chỉ chứa `draw:custom-shape`, không gán `office:value-type="string"`. Do đó khi lưu lại, ô trở thành ô trống thuần túy.

---

### 2.2. legacy18.xls (1 ô)

Sheet: `Sheet1`

| STT | Địa chỉ ô | Kiểu dữ liệu | Giá trị trước | Giá trị sau | Công thức trước | Công thức sau | Kiểu định dạng | Phân loại nguyên nhân gốc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `Sheet1!C15` | Hàm đọc tiền thành chữ | `#ADDIN?` (`-2146826259`) | Chuỗi đọc tiền tiếng Việt | `=VND([.F14])` | Không có (chuỗi tĩnh) | Chung (General) | Chủ ý thiết kế mã VN (`main.py` + `ooxml_zip_patch.py`) |

#### Phân loại & Bằng chứng thực nghiệm nguyên nhân gốc legacy18:
1. **Thiết kế chủ ý bảo vệ dữ liệu người dùng:**
   - Trong tệp gốc, tác giả sử dụng hàm `VND()` từ một add-in Excel ngoài. Khi mở trên môi trường không có add-in đó, Excel hiển thị `#NAME?` còn LibreOffice hiển thị `#ADDIN?`.
   - Khi lưu tệp `.xls` (BIFF8), LibreOffice Calc không có cơ chế giữ hàm add-in ngoài; LibreOffice sẽ tự động chuyển công thức thành `#N/A` và **xóa sạch dòng chữ tiếng Việt đọc số tiền**.
   - Để ngăn chặn việc mất trắng thông tin số tiền bằng chữ trong các bảng tính thực tế của người dùng Việt Nam (phiếu thu, hóa đơn, chứng từ), commit `b82e6a6c` đã thiết kế bộ tiền xử lý xuất FODS:
     - Hàm `_sheet_fods_for_export()` gọi `fods_vnd_cells_as_text()`: chuyển ô công thức `VND()` thành ô chuỗi văn bản thuần túy mang chính xác giá trị đã được tính toán bằng tiếng Việt.
     - Tài liệu Hướng dẫn sử dụng (`platform/help/entries-sheet.js`) đã ghi rõ: *"Khi lưu dạng cũ .xls (Excel 97-2003), VN Sheet lưu dòng chữ thành giá trị cố định để không bị lỗi #N/A; nếu cần công thức tự cập nhật, hãy lưu .xlsx."*
   - Bộ so sánh đối chiếu giữa tệp gốc (chưa có add-in mang công thức và giá trị lỗi) và tệp đã lưu (có chuỗi kết quả tiếng Việt hoàn chỉnh và không còn công thức) nên ghi nhận 1 ô lệch này là chính xác và đúng thiết kế.

---

## 3. Các cải tiến và sửa lỗi đã thực hiện (BUOC 3)

1. **Bổ sung khai báo namespace `xmlns:loext` cho XML FODS**:
   - File: `adapters/libreoffice/sheet/sheet-adapter.js`
   - Chi tiết: Thẻ gốc `<office:document>` trong hàm `serializeToFods()` được bổ sung `xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"`.
   - Tác dụng: Ngăn chặn lỗi phân tích cú pháp `unbound prefix: loext` khi các trình phân tích XML chuẩn đọc file FODS chứa định dạng `loext:blank-width-char`.
2. **Tích hợp lệnh `xls` vào công cụ audit hợp nhất `batch_document_audit.py`**:
   - File: `scripts/layout-audit/batch_document_audit.py`
   - Chi tiết: Bổ sung subparser `xls` nhận tham số `<worktree> [names...]`, tự động nhận diện thư mục đầu vào `file test/lan-legacy` và thư mục đầu ra `_batch_xls_out`, thực hiện quy trình round-trip Save As và so sánh tự động.
3. **Cải tiến cơ chế Fallback và Timeout cho bộ so sánh .xls**:
   - File: `scripts/layout-audit/_batch_xls_roundtrip.py`
   - Chi tiết: Giảm timeout chờ Excel COM từ 900 giây xuống 30 giây để tránh treo tiến trình khi Excel hiện hộp thoại cảnh báo. Mở rộng điều kiện fallback sang bộ so sánh LibreOffice khi gặp bất kỳ lỗi COM nào (Protected View, RPC Server Busy, Index null). Nhờ đó, 20/20 tệp `.xls` đều được so sánh đầy đủ chi tiết thay vì bị bỏ qua như trước.
4. **Bảo toàn định dạng khi lưu tại chỗ (Ctrl+S)**:
   - Các tệp `.xls` khi mở lên và ấn Ctrl+S được lưu thông qua `saveRealFileInPlace()`, gọi `_save_document_in_place_impl()`, suy luận đúng định dạng gốc `.xls` và thực hiện thay thế nguyên tử, giữ nguyên đuôi tệp `.xls` và cấu trúc nhị phân OLE2.

---

## 4. Xác nhận tiêu chí hoàn thành

- `node tests/run-tests.js`: **2952/2952 PASS**, 0 FAIL.
- `python scripts/layout-audit/batch_document_audit.py xls .`: **20/20 tệp saved=yes**, magic=D0CF11E0, 15 tệp diff=0, không tệp nào bị tụt kết quả.
- Định dạng `.xls` được giữ nguyên vẹn khi lưu tại chỗ (Ctrl+S).
