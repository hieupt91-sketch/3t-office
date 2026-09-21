# Handoff Sheet S29 — hiệu năng ba overlay Python lúc mở

Worktree `E:\VNOffice-grok-sheet-s29`, nhánh `perf/sheet-s29-grok`. Mọi số dưới đây là số đã đo trên máy này (22/9), trừ khi ghi rõ là số của brief (Claude, 22/9 00:30, không profile). Chưa sửa code ở commit phần này.

## Nguyên nhân

Ba overlay `_overlay_sheet_number_formats_from_xlsx`, `_overlay_sheet_original_strings_from_xlsx`, `_overlay_sheet_xf_indices_from_xlsx` (và `reoverlay_sheet_xf_indices`, cùng hàm xf) chậm vì **mỗi ô** gọi regex/unescape, và với hàng rộng thì `_flat_xml_blocks` là O(số ô trong hàng × độ dài hàng). Chỉ mục ô XLSX không phải phần hàng trăm giây: trên lan06 (3,5 triệu ô ở một sheet) ba hàm dựng chỉ mục, đo riêng, không qua FODS:

| Hàm | Thời gian | Số ô giữ lại |
|---|---:|---:|
| `_xlsx_cells_with_number_formats` | 25,30 s | 2.467.786 |
| `_xlsx_cells_with_original_strings` | 22,40 s | 1.583 |
| `_xlsx_cells_with_xf_indices` | 25,59 s | 3.526.847 |

### 1. `_unescape_xml` biên dịch regex trên mọi thuộc tính

`_xml_attrs` (regex `([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2`) gọi `_unescape_xml` cho **từng** giá trị. `_unescape_xml` luôn chạy hai `re.sub` (`&#x…;` và `&#…;`). `re.sub` gọi `re._compile` mỗi lần. Ô FODS chỉ cần `table:number-columns-repeated` để biết bề rộng, nhưng vòng lặp hàng vẫn parse mọi thuộc tính của mọi ô.

cProfile lan14, **có** overhead của profiler (wall không phải thời gian mở thật; brief đo không profile: number formats 49 s, original strings 60 s, xf 72 s, reoverlay 77 s):

| Giai đoạn (cProfile) | wall | `_xml_attrs` | `_unescape_xml` | `re.sub` | `re._compile` | `_flat_xml_blocks` |
|---|---:|---:|---:|---:|---:|---:|
| number formats | 129,29 s | 2.946.167 | 8.455.479 | 17.452.945 | 23.599.327 | 1.459.961 |
| original strings | 159,74 s | 3.045.115 | 8.973.063 | 19.690.780 | 28.511.965 | 1.581.837 |
| xf indices | 176,51 s | 3.045.199 | 9.713.362 | 22.529.907 | 30.140.098 | 1.581.927 |
| reoverlay xf | 181,12 s | 3.108.400 | 9.902.525 | 22.900.754 | 30.637.347 | 1.645.128 |

`_overlay_formats_in_row` / `_overlay_strings_in_row` / `_overlay_xf_indices_in_row` là nơi tích luỹ thời gian đó (cumtime profile 74,6 s / 95,1 s / 119,9 s). xf còn `_set_orig_xf_attr` 1.519.661 lần và `_set_repeat` 1.580.233 lần; strings `_set_original_string_attr` 844.136 lần. Cùng một chỉ mục XLSX được dựng lại từ đầu ở mỗi overlay (number formats cumtime profile 44,9 s, strings 56,0 s, xf 46,1 s, reoverlay xf 44,4 s).

lan14 FODS sau soffice: 257,2 MB, 16,06 s. Sheet lớn: 33.641 hàng, 1.392.739 ô, hàng rộng nhất **48** ô (7.788 byte). Với hàng hẹp, `_flat_xml_blocks` chỉ chiếm ~4,5–5,1 s tottime trong profile — không phải O(n²) của cả file.

### 2. `_flat_xml_blocks` quét tới hết hàng cho tên thẻ không có

```python
choices = [(xml.find(f"<{name}", cursor), name) for name in names]
```

Mỗi ô gọi `str.find` cho **mọi** tên (`table:table-cell` và `table:covered-table-cell`). Tên không có trong hàng thì `find` đọc từ cursor tới **cuối hàng**. Hàng N ô, không có covered-cell: khoảng N lần quét phần còn lại → O(N × độ dài hàng).

Đo hàm hiện tại, hàng dựng từ ô tự đóng 43 byte:

| Số ô | Thời gian `_flat_xml_blocks` | Bản quét một lần `<` (thử) |
|---:|---:|---:|
| 500 | 0,003 s | 0,0004 s |
| 1.000 | 0,008 s | 0,0008 s |
| 2.000 | 0,020 s | 0,0016 s |
| 4.000 | 0,065 s | 0,0030 s |
| 8.000 | 0,249 s | 0,0082 s |
| 16.384 | 0,975 s | — |

16× ô (500 → 8.000) mất 83× thời gian.

lan06, FODS soffice đo được 146,2 MB / 27,41 s. Sheet lớn: 377 hàng, **2.466.945** phần tử ô, hàng rộng nhất **11.472** ô / 675.119 byte. `_flat_xml_blocks` trên đúng hàng đó: **0,800 s**, 11.472 span. Vài trăm hàng cùng cỡ, nhân ba overlay, là phần trăm giây của brief (262 / 595 / 662 s) — chỉ mục XLSX phía trên chỉ ~25 s.

### Việc đo tiếp (chưa sửa)

Thời gian mở không profile (từng giai đoạn, lan11 / lan12 / lan14 / lan06) ghi ở lần đo trước và sau khi sửa. `optimize_fods_streaming` trên lan14 cũng nằm trong cùng profile: wall 108,63 s, 20.418.229 lần `re.search` và 21.469.834 lần `re._compile` (hàm nội bộ gọi `re.search` từng ô cho style / repeat / content, hai lượt trên bảng). Brief: optimize lan14 59 s, lan06 86 s. Không đổi quy tắc S30/S31.
