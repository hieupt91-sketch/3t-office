# Báo cáo E-3 (13/11): mở rộng bộ đối chiếu `TEXT` và sửa các lỗ hổng lộ ra

## Việc đã làm
Thêm 35 ca `TEXT` vào `scripts/formula-oracle/cases.txt` (tổng 569 công thức): nhiều phần `dương;âm;không`, chữ trong ngoặc kép, tiền tệ, phần trăm, dấu phẩy chia nghìn ở cuối, ký hiệu khoa học, phân số, giờ/ngày nhiều dạng, giờ tích lũy `[h]`, `General`, làm tròn sát biên.

## Lỗ hổng thật của engine (trước khi sửa 12 ca lệch/lỗi)
| Mẫu | Engine cũ | Đúng |
|---|---|---|
| `TEXT(1234567,"#,##0,")` | `1,234,567` | `1,235` (dấu phẩy cuối chia 1000) |
| `TEXT(12345.6789,"0.00E+00")` | `#VALUE!` | `1.23E+04` |
| `TEXT(0.5,"# ?/?")`, `TEXT(1.25,"# ?/4")` | `#VALUE!` | ` 1/2`, `1 1/4` |
| `TEXT(1.5,"[h]:mm")` | `[12]:00` | `36:00` |

## Đã sửa (`FormulaTextSupport.swift`)
Dấu phẩy cuối chia 1000 (mỗi dấu một lần), ký hiệu khoa học `E+`/`E-` (kể cả làm tròn đẩy định trị lên 10), phân số mẫu số cố định hoặc tối đa theo số `?`, giờ/phút/giây tích lũy `[h] [m] [s]`. Mẫu như `1E+0` (không có chỗ chứa chữ số) vẫn trả `#VALUE!`.

## Khác biệt đã biết giữa LibreOffice và Excel (ghi vào bảng của `run_oracle.py`, KHÔNG phải lỗi engine)
`TEXT(-0.0001,"0.00")` Excel giữ `-0.00`; `TEXT(0,"#.##")` Excel in `.`; `TEXT(TRUE,"0")` Excel trả `TRUE`. Ba ca này dựa trên hiểu biết hành vi Excel, **chưa kiểm trên Excel thật** (cần #11).

## Kết quả
`run_oracle.py --strict`: 569 công thức; so được 510; khớp 510; lệch 0; LibreOffice không hỗ trợ 15; khác biệt đã biết 43; chưa kiểm với Excel 1 (`LOG(10,1)`). `swift test -c release` từ build sạch trên `vn-main`: 644/644 (có thêm `testTextAdvancedNumberFormats`).

Giới hạn: oracle là LibreOffice 24.2, không phải Excel; ngôn ngữ `[$-...]` chỉ en/vi; phân số chưa hỗ trợ mẫu hai nhóm `?/?` kèm literal giữa.
