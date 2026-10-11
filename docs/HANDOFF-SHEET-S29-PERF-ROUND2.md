# Sheet S29 performance — vòng 2

Worktree `E:\VNOffice-codex-sheet-s29`, branch `perf/sheet-s29-codex`.

## Thay đổi

Trước đây, mỗi overlay number format / original string / XF tự đọc `sheetN.xml` riêng và tự duyệt các hàng FODS. Luồng sau thay đổi dựng chung một chỉ mục tọa độ `(row, col)` trong một lượt đọc cell XLSX, rồi áp cả ba metadata trong một lượt duyệt cell FODS. Thứ tự format → promote covered formula error → original string → XF được giữ cho từng cell; bước promote toàn tài liệu vẫn chạy sau overlay để giữ hành vi với cell không có metadata đích. Tối ưu FODS và lượt reoverlay XF sau tối ưu vẫn là các bước riêng.

```text
TRƯỚC
XLSX sheet XML ──> chỉ mục format ──┐
XLSX sheet XML ──> chỉ mục string ──┼─> FODS pass format -> promote -> FODS pass string -> FODS pass XF
XLSX sheet XML ──> chỉ mục XF ─────┘                                      │
                                           optimize FODS -> reoverlay XF ──┘

SAU
XLSX sheet XML ──> một chỉ mục format + string + XF theo (row, col)
                                      │
FODS ──> một pass format -> promote cell cần thiết -> string -> XF
                                      │
                    promote covered errors còn lại -> optimize FODS -> reoverlay XF
```

`_compare_sheet_s29_metadata.py` dựng một FODS bằng LibreOffice cho mỗi file, chạy chuỗi overlay cũ và overlay hợp nhất trên đúng cùng bytes, rồi so toàn bộ chuỗi đầu ra và SHA-256. `lan05`, `lan08`, `lan11`, `lan12`, `lan06`, `lan14`: cả sáu đều PASS; không có khác biệt byte. Các digest cuối lần chạy gần nhất:

| File | SHA-256 đầu ra |
|---|---|
| lan05 | `c4acd848b019f5df9bddd45743c75d3feb62761d930839672f653ba4b647c918` |
| lan08 | `7a7394b45a1f023bf50bf4f152898e41fdda9803798aad2ee94ec4fb1ebbe3f3` |
| lan11 | `333bcb53d41a7314574cf4819fadf404c0352a6083f40dbc60e000f83fa0a93e` |
| lan12 | `bdd9ed48c6f334b208ef60613fcea956556c85af712457b0ae190427e86c4a25` |
| lan06 | `1b8b4512c27358a6a0e06f9d3b30a2f1e0cb36c7837dab0d40751e093ca4dfea` |
| lan14 | `fd08c6a8923aedf75e707ea83cd22ccc35f700f3d11ce47392ef3cf248cbe309` |

`_compare_sheet_s29_geometry.py` so sánh `vno:xlsx-layout` hiện tại với cache đo Excel, chuẩn hóa trường hợp cột lưu content-width hoặc có gutter 2 px: rows 0/6.887 mismatch; columns 0/973 mismatch.

## Đo thời gian

Các mốc trước lan14 dưới đây đo foreground trên worktree/máy hiện tại trước khi sửa. Mốc trước lan06/lan11/lan12 là số ở handoff vòng 1 (máy Grok/Claude), ghi rõ để không coi là benchmark cùng máy.

| File | Python trước | Python sau, một chỉ mục XLSX + một FODS pass | JS trước | JS sau: parse / render / load / layout |
|---|---:|---:|---:|---|
| lan14 | 130,73 s | 115,48 s | NOT MEASURED | NOT MEASURED; app launch không đến hook sau >3 phút trong hai lần thử. |
| lan06 | 155,67 s (vòng 1) | 136,45 s | NOT MEASURED | 1.522,6 / 1.669,2 / 2.084,7 / 2.106,3 ms |
| lan11 | 16,38 s (vòng 1) | 12,40 s | NOT MEASURED | 1.839,7 / 1.898,5 / 2.212,5 / 2.364,3 ms |
| lan12 | 16,47 s (vòng 1) | 12,88 s | NOT MEASURED | 1.811,4 / 1.856,3 / 2.440,3 / 2.529,7 ms |

Trong phép đo sau trên máy hiện tại, `soffice / layout / metadata / optimize / reoverlay` lần lượt là lan14 `16,36 / 2,73 / 29,94 / 26,62 / 30,07 s`; lan06 `16,38 / 16,37 / 49,91 / 32,82 / 18,95 s`. Tổng Python vẫn vượt mục tiêu 60 giây: lan14 115,48 s; lan06 136,45 s.

Hook JS `performance.now()` chỉ bật khi đặt `VNO_PERF_DEBUG=1`; cờ mặc định tắt. Các số JS sau được đo bằng `main.py` và in từ bridge của app thật. Tên cột viết tắt theo thứ tự parseFods / first grid render / loadFromFods / first layout. Chưa có số JS trước cho bất kỳ file nào vì brief vòng 1 không gắn hook. Mở lan14 bằng app thật đã thử hai lần nhưng chưa thu được event JS; ở lần thử cuối, tiến trình foreground vẫn chưa đến event JS sau hơn 3 phút và được dừng. Không suy ra số JS lan14 từ file khác hoặc từ Python.

## Kiểm thử

- `node tests/run-tests.js`: PASS, 1834/1834.
- `python -m unittest discover -s tests -p "test_*.py"`: PASS, 346 tests trong 326,29 s sau phần chỉ mục dùng chung.
- Không chạy Excel COM script. Geometry dùng JSON cache sẵn.

## Phạm vi còn lại

Mục tiêu ≤60 giây chưa đạt: ngay Python đã mất 115–136 giây trên hai file lớn. Phần Python còn nặng nhất là layout lan06, optimize FODS và reoverlay XF; phần JS hai file lớn chưa đo được. Cần profiling tiếp trên pipeline thực tế trước khi chọn tối ưu kế tiếp. Không sửa Writer, không thay đổi các quy tắc S8–S32.
