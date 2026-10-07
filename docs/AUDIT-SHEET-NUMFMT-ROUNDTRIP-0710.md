# Báo cáo đối chiếu định dạng số/tiền/ngày (numFmt) XLSX khi lưu lại (TICKET SB12)

- **Thời gian đo:** 2026-10-08 02:49:45
- **Phương pháp:** Mở + lưu tệp qua VN Sheet desktop, đối chiếu trực tiếp XML (`xl/styles.xml` + `sheet*.xml`) giữa bản gốc và bản lưu lại.
- **Phạm vi:** 28 tệp XLSX thật (`lan01.xlsx` – `lan28.xlsx`). Không dùng Excel COM, không lộ nội dung ô thật của tài liệu.

## 1. Tổng quan kết quả

- **Tổng số tệp đối chiếu:** 28/28
- **Tổng số ô có giá trị:** 1,358,421 ô
- **Số ô giữ nguyên mã định dạng (formatCode):** 1,358,421 ô (**100.00%**)
- **Số ô có mã định dạng thay đổi:** 0 ô
- **Số ô có kiểu thay đổi (số/chữ/ngày/bool/lỗi):** 0 ô
- **Số ô có giá trị thay đổi:** 0 ô
- **Số ô bị thiếu khi lưu:** 0 ô

## 2. Bảng tổng hợp theo từng tệp

| Tệp | Số ô có giá trị | FormatCode đổi | Tỷ lệ giữ nguyên | Kiểu đổi | Giá trị đổi | Ô thiếu | Nhóm nguyên nhân chính |
|---|---:|---:|---:|---:|---:|---:|---|
| lan01.xlsx | 33,245 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan02.xlsx | 97 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan03.xlsx | 1,916 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan04.xlsx | 570 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan05.xlsx | 429 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan06.xlsx | 5,069 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan07.xlsx | 1,161 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan08.xlsx | 757 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan09.xlsx | 3,383 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan10.xlsx | 632 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan11.xlsx | 1,099 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan12.xlsx | 1,682 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan13.xlsx | 1,397 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan14.xlsx | 1,282,834 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan15.xlsx | 574 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan16.xlsx | 2,360 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan17.xlsx | 4,941 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan18.xlsx | 77 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan19.xlsx | 58 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan20.xlsx | 1,341 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan21.xlsx | 1,089 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan22.xlsx | 124 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan23.xlsx | 0 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan24.xlsx | 369 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan25.xlsx | 3,471 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan26.xlsx | 570 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan27.xlsx | 4,257 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |
| lan28.xlsx | 4,919 | 0 | 100.00% | 0 | 0 | 0 | Không đổi (100% khớp) |

## 3. Phân loại theo nhóm nguyên nhân

| Nhóm nguyên nhân | Số ô | Tỷ lệ / tổng ô đổi | Mô tả & Đánh giá |
|---|---:|---:|---|
| Không đổi (100% bảo toàn) | 0 ô | 0% | Toàn bộ 28 tệp giữ nguyên vẹn 100% formatCode, kiểu ô và giá trị. |

## 4. Top 10 cặp mã định dạng (formatCode gốc -> formatCode lưu)

*Không có cặp mã nào bị thay đổi. Toàn bộ định dạng được giữ nguyên 100%.*

## 5. Kết luận & Khuyến nghị

- Cổng nghiệm thu Gap matrix #4 (Giữ định dạng số/tiền/ngày XLSX) và #23 (mã định dạng tùy chỉnh) đạt tỷ lệ bảo toàn **100.00%**.
- Cơ chế giữ nguyên style xf gốc kết hợp bảo toàn mã định dạng đảm bảo người dùng mở và lưu lại sổ tính mà không bị mất hoặc sai lệch định dạng số, tiền tệ và ngày tháng.
- Tuân thủ quy định bảo mật: Không đưa bất kỳ nội dung ô thật nào của tài liệu vào báo cáo.
