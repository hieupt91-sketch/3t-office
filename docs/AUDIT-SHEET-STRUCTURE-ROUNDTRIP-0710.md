# Báo cáo đối chiếu cấu trúc XLSX ngoài ô dữ liệu khi lưu lại (TICKET SB13)

- **Thời gian đo:** 2026-10-08 05:57:26
- **Phương pháp:** Mở + lưu tệp qua VN Sheet desktop trên đường lưu thật (`VNO_AUDIT_MARK_DIRTY=1`), đối chiếu trực tiếp XML giữa bản gốc và bản lưu lại.
- **Tự kiểm tra tệp lưu rỗng:** BẮT BUỘC tệp lưu ra không được trùng byte với tệp gốc (báo FAIL 'luu rong' nếu trùng) — Đạt chuẩn: 28/28 tệp lưu khác byte gốc.
- **Phạm vi:** 28 tệp XLSX thật (`lan01.xlsx` – `lan28.xlsx`). Không đưa bất kỳ nội dung ô thật nào của tài liệu vào báo cáo (chỉ số lượng, địa chỉ, loại).

---

## 1. Bảng so sánh tổng quan Trước vs Sau khi tối ưu (Before / After)

| Chỉ số đánh giá | TRƯỚC TỐI ƯU (Baseline) | SAU TỐI ƯU (Hiện tại) | Mức độ cải thiện |
|---|:---:|:---:|:---:|
| **Số tệp PASS toàn diện (100% phần tử)** | **10 / 28** (35.7%) | **23 / 28** (**82.1%**) | **+13 tệp (+46.4%)** |
| **Số tệp có sai lệch (LECH)** | **18 / 28** (64.3%) | **5 / 28** (**17.9%**) | **-13 tệp (-46.4%)** |
| **Số phần tử cấu trúc đạt tuyệt đối 28/28** | 8 / 15 | **13 / 15** | **+5 nhóm tính năng đạt 100%** |

### Đối chiếu tỷ lệ bảo toàn theo từng phần tử cấu trúc (15 phần tử):

| STT | Phần tử cấu trúc | Tỷ lệ TRƯỚC | Tỷ lệ SAU | Mức độ cải thiện & Bản chất xử lý |
|---:|---|:---:|:---:|---|
| 1 | Thứ tự/Trạng thái sheet | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 2 | Ô gộp (Merge cells) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 3 | AutoFilter & FilterCol | 24/28 (85.7%) | **28/28 (100.0%)** | **+4 tệp (+14.3%)** — Khôi phục thẻ filterColumn trong autoFilter |
| 4 | Định dạng có điều kiện (CF) | 24/28 (85.7%) | 24/28 (85.7%) | Giữ nguyên 85.7% (4 tệp hạn chế tách rule do LibreOffice Core) |
| 5 | Xác thực dữ liệu (DV) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 6 | Vùng đặt tên (Defined names) | 25/28 (89.3%) | **28/28 (100.0%)** | **+3 tệp (+10.7%)** — Khôi phục definedNames gốc bị LO bỏ qua |
| 7 | Cột (độ rộng & ẩn) | 27/28 (96.4%) | 27/28 (96.4%) | Giữ nguyên 96.4% (chỉ lan10 lệch vi mô độ rộng) |
| 8 | Hàng (chiều cao & ẩn) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 9 | Cố định dòng/cột (Freeze panes) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 10 | Tỷ lệ xem (Zoom scale) | 12/28 (42.9%) | **28/28 (100.0%)** | **+16 tệp (+57.1%)** — Khôi phục zoomScale trong sheetView |
| 11 | Thiết lập trang (PageSetup) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 12 | Bảng tổng hợp (PivotTable) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 13 | Hình vẽ & Biểu đồ (Drawings/Charts) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 14 | Bình luận (Comments) | 28/28 (100.0%) | 28/28 (100.0%) | Duy trì hoàn hảo (100%) |
| 15 | Siêu liên kết (Hyperlinks) | 25/28 (89.3%) | **28/28 (100.0%)** | **+3 tệp (+10.7%)** — Khôi phục hyperlinks, làm sạch xr:uid & namespace |

---

## 2. Bảng so sánh trạng thái chi tiết từng tệp (Trước vs Sau)

| Tệp | Trạng thái TRƯỚC | Các điểm lệch TRƯỚC | Trạng thái SAU | Các điểm lệch SAU | Kết quả cải thiện |
|---|:---:|---|:---:|---|:---:|
| lan01.xlsx | **LECH** | AutoFilter (FilterCol L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan02.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan03.xlsx | **LECH** | CF (L2), Zoom (L1) | **LECH** | CF (L2) | Đã khắc phục Zoom |
| lan04.xlsx | **LECH** | Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan05.xlsx | **LECH** | Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan06.xlsx | **LECH** | AutoFilter (L1), Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan07.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan08.xlsx | **LECH** | Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan09.xlsx | **LECH** | DefinedNames (L3), Zoom (L1), Hyperlinks (L2) | **PASS** | Khớp 100% | Đã khắc phục triệt để (3 lỗi) |
| lan10.xlsx | **LECH** | Cols (L1), Zoom (L1) | **LECH** | Cols (L1) | Đã khắc phục Zoom |
| lan11.xlsx | **LECH** | CF (L2), Zoom (L1), Hyperlinks (L2) | **LECH** | CF (L2) | Đã khắc phục Zoom & Hyperlinks |
| lan12.xlsx | **LECH** | DefinedNames (L3), Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan13.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan14.xlsx | **LECH** | AutoFilter (L1), CF (L2), Zoom (L1) | **LECH** | CF (L2) | Đã khắc phục AutoFilter & Zoom |
| lan15.xlsx | **LECH** | Zoom (L1), Hyperlinks (L2) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan16.xlsx | **LECH** | CF (L2), Zoom (L1) | **LECH** | CF (L2) | Đã khắc phục Zoom |
| lan17.xlsx | **LECH** | Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan18.xlsx | **LECH** | Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan19.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan20.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan21.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan22.xlsx | **LECH** | DefinedNames (L3), Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan23.xlsx | **LECH** | Zoom (L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |
| lan24.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan25.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan26.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan27.xlsx | **PASS** | Khớp 100% | **PASS** | Khớp 100% | Duy trì hoàn hảo |
| lan28.xlsx | **LECH** | AutoFilter (FilterCol L1) | **PASS** | Khớp 100% | Đã khắc phục triệt để |

---

## 3. Bảng ma trận chi tiết hiện tại: Tệp x 15 Phần tử cấu trúc

Ghi chú ký hiệu:
- `✓` = PASS (khớp hoàn toàn hoặc viết lại tương đương)
- `L1` = LECH_NHE (lệch nhẹ, ví dụ độ rộng cột vi mô)
- `L2` = LECH_TRUNG_BINH (lệch trung bình, ví dụ tách CF rule)
- `L3` = LECH_NANG (lệch nặng, mất hoàn toàn tính năng)

| Tệp | Trạng thái | Thứ tự/State | Merge | AutoFilter | CF | DV | DefinedNames | Cols | Rows | Freeze | Zoom | PageSetup | Pivot | Drawing/Chart | Comments | Hyperlinks |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| lan01.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan02.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan03.xlsx | **LECH** | ✓ | ✓ | ✓ | L2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan04.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan05.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan06.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan07.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan08.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan09.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan10.xlsx | **LECH** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | L1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan11.xlsx | **LECH** | ✓ | ✓ | ✓ | L2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan12.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan13.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan14.xlsx | **LECH** | ✓ | ✓ | ✓ | L2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan15.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan16.xlsx | **LECH** | ✓ | ✓ | ✓ | L2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan17.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan18.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan19.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan20.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan21.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan22.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan23.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan24.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan25.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan26.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan27.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| lan28.xlsx | **PASS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 4. Phân loại nguyên nhân sai lệch & Phân biệt tương đương vs Lệch thật

### A. Các phần tử viết lại nhưng tương đương (EQUIVALENT - Đạt PASS):
1. **Thứ tự thuộc tính XML**: Các thuộc tính XML như `r`, `s`, `t` trong ô và thẻ con có thể đổi thứ tự xuất ra nhưng ngữ nghĩa OOXML không đổi.
2. **Thứ tự danh sách mergeCell**: Danh sách các vùng `mergeCell` có thể sắp xếp lại thứ tự xuất hiện trong XML nhưng tập hợp tọa độ các vùng hợp nhất hoàn toàn trùng khớp 100%.
3. **Thẻ hình vẽ rỗng**: LibreOffice tạo tệp chứa `drawing1.xml` với thẻ `<xdr:wsDr/>` rỗng không chứa hình dạng (`0 shapes`), tương đương hoàn toàn với tệp gốc không chứa hình dạng.
4. **Chuẩn hóa công thức vùng đặt tên**: Tọa độ definedName chuẩn hóa giữa `$A$1` và `A1` không ảnh hưởng tới phạm vi tham chiếu.

### B. Các nhóm sửa lỗi lệch thật trong mã nguồn VN:
1. **Bảo toàn tỷ lệ phóng thu (Zoom Scale)**:
   - *Triệu chứng*: LibreOffice đưa zoom về 100% mặc định, làm mất cài đặt xem của người dùng.
   - *Khắc phục*: Trích xuất `zoomScale`, `zoomScaleNormal`, `zoomScalePageLayoutView` từ `sheetView` gốc và cấy ghép vào XML xuất ra.
   - *Commit*: `90a17217 fix(sheet): bao toan zoomScale cua sheet khi luu XLSX tren duong that (SB13)`
   - *Unit test*: `tests/test_sheet_zoom_roundtrip.py`
2. **Bảo toàn tiêu chí bộ lọc (FilterColumn trong AutoFilter)**:
   - *Triệu chứng*: LibreOffice giữ ref vùng autoFilter nhưng bỏ rơi các thẻ con `filterColumn` (các tiêu chí đang lọc).
   - *Khắc phục*: Tái lập các thẻ `filterColumn` vào khối `autoFilter` tương ứng theo thứ tự schema OOXML.
   - *Commit*: `73076a8a fix(sheet): bao toan the filterColumn trong autoFilter khi luu XLSX (SB13)`
   - *Unit test*: `tests/test_sheet_filter_columns_roundtrip.py`
3. **Bảo toàn vùng đặt tên (DefinedNames)**:
   - *Triệu chứng*: LibreOffice bỏ sót một số definedNames phạm vi workbook/sheet khi chuyển đổi.
   - *Khắc phục*: So khớp danh sách definedNames và phục hồi các name bị thiếu vào thẻ `definedNames` trong `workbook.xml`.
   - *Commit*: `82a8670b fix(sheet): bao toan definedNames goc bi LibreOffice bo qua khi luu XLSX (SB13)`
   - *Unit test*: `tests/test_sheet_defined_names_roundtrip.py`
4. **Bảo toàn siêu liên kết (Hyperlinks)**:
   - *Triệu chứng*: LibreOffice xuất thiếu thẻ `hyperlinks` trong một số worksheet. Khi tái lập, các thuộc tính mở rộng như `xr:uid` gây lỗi namespace OOXML nếu thiếu khai báo tiền tố.
   - *Khắc phục*: Khôi phục khối `hyperlinks` chuẩn OOXML, làm sạch các thuộc tính `xr:*`, đảm bảo namespace `xmlns:r` trên thẻ gốc `worksheet`.
   - *Commits*: `98fa65d1 fix(sheet): bao toan hyperlinks trong worksheet khi luu XLSX (SB13)` và `5df6bbed fix(sheet): loai bo thuoc tinh xr va dam bao namespace khi phuc hoi hyperlinks (SB13)`
   - *Unit test*: `tests/test_sheet_hyperlinks_roundtrip.py`

### C. Các hạn chế còn lại do LibreOffice Core:
- **Định dạng có điều kiện (CF) tại 4 tệp (lan03, lan11, lan14, lan16)**: LibreOffice phân rã các luật định dạng có điều kiện phức tạp (như color scale đa điểm hoặc biểu thức mảng) thành các tập luật riêng rẽ. Ngữ nghĩa hiển thị không bị mất nhưng cấu trúc XML tách khối. Ghi nhận là hạn chế LibreOffice Core theo quy định ticket.
- **Độ rộng cột tại 1 tệp (lan10)**: Lệch vi mô do làm tròn số học pixel giữa LibreOffice Calc và Excel.

---

## 5. Kết luận

- Hệ thống VN Sheet trên đường lưu thật (`VNO_AUDIT_MARK_DIRTY=1`) đạt độ bảo toàn cấu trúc xuất sắc với **13/15 nhóm tính năng đạt 100% tuyệt đối**.
- Tỷ lệ tệp đạt chuẩn toàn diện tăng từ **35.7% (10/28)** lên **82.1% (23/28)**.
- Đảm bảo 28/28 tệp kiểm tra lưu khác byte gốc (không lưu rỗng).
- Tuân thủ quy định bảo mật: Không đưa bất kỳ nội dung ô thật nào của người dùng vào báo cáo.
