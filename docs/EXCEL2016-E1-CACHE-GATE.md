# E1 — Cổng đối chiếu cache công thức 28 XLSX

Ngày chạy: 13/10/2026. VN Sheet desktop được điều khiển bằng CDP; các workbook nguồn được giữ nguyên. Excel 2016 được dùng làm chuẩn COM ReadOnly, mỗi lần một workbook.

## Kết quả

| Mốc | Tỷ lệ tổng | Số ô khớp / đã kiểm |
|---|---:|---:|
| Tag `win-v0.9.9` (`d520d04c`) | 50,96% | Theo báo cáo gắn tag |
| E1 hiện tại | 0,55% | 400 / 72.837 |

**Cổng 0.9.9: FAIL** — E1 thấp hơn baseline tag; 16 trong 27 workbook có dữ liệu baseline cũng giảm theo từng tệp. Baseline tag ghi `lan28.xlsx` 97,09%; con số 97,45% được nêu trong kickoff không khớp báo cáo gắn tag. E1 đạt 7,64% ở tệp này.

## Chẩn đoán và giới hạn

- `docs/tickets-0710/FIX-P1b.md` ghi nhận trước E1 hồi quy P1: `lan01.xlsx` giảm từ 100% ở commit ngay trước P1 xuống 24,28% sau P1. E1 đo lại 24,28%; đây là vấn đề nền có trước các commit E1.
- Lượt 28 workbook cho thấy sai lệch tập trung ở công thức phụ thuộc sheet khác và kết quả phụ thuộc đang thành 0 hoặc `#REF!`. Không sửa test, expected, fixture hoặc dữ liệu cache nguồn để tăng điểm.
- Báo cáo chi tiết chứa ví dụ công thức/ô từ workbook doanh nghiệp được giữ cục bộ, không commit; tài liệu này chỉ ghi số liệu tổng hợp.

## Kiểm tra bổ sung

- Batch XLSX: 8/8 PASS (`lan01`, `lan02`, `lan04`, `lan06`, `lan09`, `lan11`, `lan22`, `lan26`); saved=yes, diffs=0, lint sạch, Excel PASS.
- Không thay đổi test/expected/cache nguồn để đạt kết quả.
