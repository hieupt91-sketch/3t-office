# Handoff Sheet S29 — hiệu năng ba overlay Python lúc mở

Worktree `E:\VNOffice-grok-sheet-s29`, nhánh `perf/sheet-s29-grok`. Số đo trên máy này (22/9). Số brief (Claude, 22/9 00:30, không profile) được ghi rõ khi dùng làm mốc trước cho lan14/lan06 — hai file đó không đo lại nguyên pipeline trước khi sửa.

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

`optimize_fods_streaming` trên lan14 cũng nằm trong cùng profile: wall 108,63 s, 20.418.229 lần `re.search` và 21.469.834 lần `re._compile` (hàm nội bộ gọi `re.search` từng ô cho style / repeat / content, hai lượt trên bảng). Brief: optimize lan14 59 s, lan06 86 s.

## Chỗ sửa

`adapters/libreoffice/common/ooxml_zip_patch.py` — cùng kết quả, ít việc hơn trên mỗi ô:

- `_unescape_xml`: không có `&` thì trả về ngay; regex thực thể số biên dịch một lần.
- `_xml_attrs`: quét thuộc tính bằng `str.find`, chỉ unescape khi giá trị có `&`.
- `_flat_xml_blocks`: một lần tìm `<`, không `find` từng tên thẻ tới cuối hàng.
- Ba vòng overlay đọc `table:number-columns-repeated` / `number-rows-repeated` bằng `_repeat_count`, không dựng dict thuộc tính cho mọi ô.
- `_set_repeat`, `_set_orig_xf_attr`, `_set_number_format_attr`, `_set_original_string_attr`: chèn thuộc tính bằng cắt chuỗi; regex chỉ khi thẻ không phải dạng thường.
- `optimize_fods_streaming`: style / repeat / content / tách ô bằng `str.find` và `_flat_xml_blocks`, không `re.search` từng ô và không `row_full_re` trên cả bảng.
- Chỉ mục XLSX (number format, chuỗi gốc, xf) nhớ một file gần nhất để `reoverlay_sheet_xf_indices` không parse lại.

Không đổi quy tắc S30/S31. Không đụng Writer.

## Bằng chứng đầu ra không đổi

- FODS dựng tay (lặp hàng/cột, covered cell, chuỗi có `&` / xuống dòng / tab, hai sheet): `overlay_sheet_xlsx_fods` + `optimize_fods_streaming` + `reoverlay_sheet_xf_indices` trùng byte với trước khi sửa. Khoá: `tests/test_sheet_s29_overlay_speed.py`.
- lan11, cùng FODS soffice: ba bước đó trùng byte với code trước sửa (module cũ trỏ `excel_row_heights.json` / `excel_char_widths.json` của repo).
- lan06 sau sửa: optimize 334,36 MB → 4,15 MB, reoverlay 4,44 MB — cùng cỡ brief (334 → 4,4 MB).

## Số trước / sau

Đo bằng `scripts/layout-audit/_time_sheet_open_stages.py`, `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok2`. lan11 và lan12 đo trước và sau trên máy này. lan14 và lan06: cột trước là số brief (Claude, 22/9 00:30, không profile); cột sau là đo trên máy này sau khi sửa. soffice lan14 16 s brief / 15,66 s sau, lan06 15 s / 14,52 s — cùng cỡ máy.

| Giai đoạn | lan11 trước | lan11 sau | lan12 trước | lan12 sau |
|---|---:|---:|---:|---:|
| soffice | 6,15 s | 6,11 s | 8,06 s | 8,23 s |
| layout S30/S31 | 0,32 s | 0,31 s | 0,48 s | 0,53 s |
| number formats | 1,47 s | 0,66 s | 0,88 s | 0,50 s |
| original strings | 0,75 s | 0,34 s | 0,79 s | 0,30 s |
| xf indices | 1,72 s | 0,61 s | 1,00 s | 0,33 s |
| optimize | 2,57 s | 1,13 s | 2,04 s | 0,90 s |
| reoverlay xf | 2,47 s | 0,87 s | 1,83 s | 0,87 s |
| **Tổng Python** | **16,38 s** | **10,83 s** | **16,47 s** | **12,90 s** |

| Giai đoạn | lan14 brief | lan14 sau | lan06 brief | lan06 sau |
|---|---:|---:|---:|---:|
| soffice | 16 s | 15,66 s | 15 s | 14,52 s |
| layout S30/S31 | 3 s | 2,62 s | ~15 s | 14,27 s |
| number formats | 49 s | 16,87 s | 262 s | 33,16 s |
| original strings | 60 s | 19,84 s | 595 s | 21,28 s |
| xf indices | 72 s | 23,07 s | 662 s | 37,69 s |
| optimize | 59 s | 25,03 s | 86 s | 32,23 s |
| reoverlay xf | 77 s | 19,91 s | 27 s | 0,69 s |
| **Tổng Python** | **346 s** | **132,38 s** | **1721 s** | **155,67 s** |

## Việc còn lại

- Chưa ≤ 60 s (Python + JS). Python sau sửa: lan14 **132,38 s**, lan06 **155,67 s**. Chưa đo JS (`performance.now()` trong `sheet-adapter.js` / `sheet-grid.js`).
- Ba overlay vẫn là ba lượt trên FODS chưa tối ưu. lan14 sau optimize vẫn ~311 MB nên reoverlay xf thêm 19,91 s. lan06 optimize còn 32,23 s để gộp 334 MB → 4,1 MB.
- Chưa chạy bộ hình học `_sheet_geometry_audit.py` (Excel COM — Claude). Không chạy `_excel_open_test.ps1` / `_batch_audit.py`.

## Test

- `node tests/run-tests.js` — **1829/1829 PASS**
- `python -m unittest discover -s tests -p "test_*.py"` — **346 tests OK**
