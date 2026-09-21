# Handoff Writer R20 — hồi quy d09 (mở) và d20 (lưu) sau e451972

Worktree `E:\VNOffice-grok-writer-r20`, nhánh `fix/writer-r20-grok`. Đo bằng `scripts/layout-audit` với `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Cache Word COM lấy từ `_writer_out_r20_base\*.word.jsonl` (không đo lại Word). Mọi số dưới đây là số đã đo.

## Nguyên nhân gốc

### d09 mở — lớp `page` 17 → 54

Điểm lệch trang đầu tiên không đổi vị trí: sau bảng ngành nghề (64 hàng, `tcBorders` bottom `sz=6` = 0,75pt = 1px). Word đặt đoạn «QUÁ TRÌNH HÌNH THÀNH…» ở **trang 5**; canvas ở **trang 4**. Bộ `_page_divergence.py --drift`: first divergence index 28, khối giữa là `TABLE p2`.

Chiều cao bảng ngành nghề (canvas `TABLE h`):

| Lần | file canvas | h (px) | `page` |
|---|---|---:|---:|
| w43 (trước e451972) | `d09.canvas.w43i.jsonl` | **2340** | 17 |
| w46 (sau e451972) | `_writer_out_r20_base\d09.canvas.jsonl` | **2139** | 54 |
| W47 (sau sửa) | `_writer_out_r20_w47\d09.canvas.jsonl` | **2404** | 23 |

HTML nhập (LibreOffice) của hàng dữ liệu dùng **longhand**: `padding-top: 0cm; padding-bottom: 0.11cm` (0,11cm = 4,157px) + `border-bottom: 1px solid`. W44 chuyển viền sang `box-shadow` (không chiếm chỗ). W44b đọc `data-vno-border-px` từ `sz=6` (= 1px) rồi **chỉ tìm** khai báo `padding:` (shorthand). Không thấy thì coi padding = `0px` và ghi `padding: 0px 0px 1px 0px` — **đè** `padding-bottom: 0.11cm`. 63 hàng dữ liệu mất ~3,16px/hàng → bảng ngắn **201px** (2340 − 2139). Nội dung sau bảng trượt lên, lớp `page` 17 → 54.

Hàng đầu bảng dùng shorthand `padding: 0cm 0.08cm 0.08cm 0cm` nên không bị đè — đúng với chỗ W44b cũ còn đọc được.

### d20 lưu — 4 trang thay vì 3

So `word/document.xml` của `_rt_d20.w43.docx` và `_rt_d20.w46.docx`: **chỉ khác 2 chỗ**, cùng một `w:tblCellMar` của bảng 1 hàng đầu tài liệu:

- w43: `w:top/bottom w:w="28"`
- w46: `w:top/bottom w:w="30"`

Mọi part khác (styles, settings, numbering, header, theme) giống nhau. W44b cộng `borderPx` (sz=4 → 0,667px) vào padding ô rồi gửi nguyên cho LibreOffice khi xuất (`_restoreTableBordersForExport` trả viền nhưng **giữ** padding đã cộng). LibreOffice đổi 28 → 30 twips.

Bảng này **1 hàng**: chênh 2 twips × 2 cạnh = 0,2pt — không đủ một trang. `_writer_out_w43\_batch_writer_report.md` **đã ghi** d20 lưu 4 trang (cùng 329/330 đoạn, pbb 0/1). Đo lại Word PDF `/Count` lúc này:

| File | PDF `/Count` | ComputeStatistics (không dùng) |
|---|---:|---:|
| nguồn d20 | **3** | 5 |
| `_rt_d20.w43.docx` | **4** | 6 |
| `_rt_d20.w46.docx` | **4** | 6 |
| `_rt_d20.docx` sau W47 | **4** | 6 |

w47 `document.xml` **trùng md5** với w43 (`76ab50f9095f`); PDF 611747 bytes = w43 (w46 = 611746). Trang lưu 4 sau W47 **bằng** w43 đã đo, không phải hồi quy 3→4 còn tái hiện được trên máy này. Phần còn lại so với nguồn (3 trang): đoạn +1 (ZZ của batch) và `pageBreakBefore` +1 trên đoạn đã có `w:br type=page` — có sẵn từ w43, W36 không khớp bảng đầu vì chữ đầu thành `ZZ…`.

## Chỗ sửa (W47)

`adapters/libreoffice/writer/writer-adapter.js`:

1. `_applyPaintOnlyTableBorders` — cộng `borderPx` vào padding **đã có** (shorthand và longhand `padding-top/right/bottom/left`); cạnh không cộng thì giữ nguyên đơn vị gốc (không đổi cm→px). Gốc giữ ở `data-vno-lo-padding`.
2. `_restoreTableBordersForExport` — trả padding gốc, bỏ phần cộng viền trước khi gửi LibreOffice.

Khoá: `tests/unit/writer-table-paint-borders.test.js` (3 test, suite 138b).

Không đụng Sheet, không đổi định nghĩa lớp lỗi của bộ đo.

## Số trước / sau

Ma trận mở (cùng cache Word, canvas đo lại):

| File | lớp | w43 | w46 (e451972) | W47 | Word / canvas |
|---|---|---:|---:|---:|---|
| d09 | `page` | 17 | **54** | **23** | 14 / 14 |
| d01 | `page` | 21 | 21 | **21** | 19 / 20 |
| d13 | `page` | 16 | 16 | **16** | 10 / 10 |
| d16 | `page` | 14 | 14 | **14** | 8 / 9 |
| d21 | `page` | 0 | 0 | **0** | 9 / 10 |
| d21 | wrap | 3 | 3 | **3** | |

d09 lớp khác sau W47 (so w46i): wrap 4, spacing 5, drift:unknown 9, line-height 2, drift:table 1 — không tăng so với w46. d01 wrap 9 / drift:unknown 9 / line-height 1 giữ nguyên.

Lưu d20:

| | w43 | w46 | W47 |
|---|---|---|---|
| `tblCellMar` top/bottom | 28 | 30 | **28** (= w43, md5 document.xml trùng) |
| Word PDF pages (đo lại) | 4 | 4 | **4** |
| batch `saved pages` | 4 (`_writer_out_w43`) | 4 | 4 |

## Quy ước đề xuất (W47)

W44b cộng bề dày viền OOXML (`sz`/8 pt) vào **padding hiện có của ô** (cả `padding:` lẫn `padding-top/bottom/…`). Không được ghi shorthand từ 0 khi ô chỉ có longhand — đo d09: `padding-bottom: 0.11cm` bị đè → bảng 64 hàng ngắn 201px, `page` 17→54. Phần cộng viền chỉ cho canvas; khi xuất trả padding LibreOffice ghi lúc nhập (`data-vno-lo-padding`), giống W30c với `width` — đo d20: `tblCellMar` 30→28 twips.

## Việc còn lại

- d09 `page` 23 (hết 54) vẫn cao hơn w43 (17): bảng ngành nghề 2404px vs 2340px (+64px = 1px × 64 hàng). W44b cộng đúng sz=6 (1px) sau khi bỏ viền CSS collapsed (chiếm chỗ < 1px/hàng). Đoạn sau bảng vẫn trang 4 vs Word trang 5 — lớp hàng/nội dung ô, không phải padding bị đè.
- d20 bản lưu 4 trang vs nguồn 3 (giống w43). Không đo được bước 3→4 chỉ do 28 vs 30 twips trên bảng 1 hàng. Còn: pbb thừa trên đoạn đã có `w:br type=page`, W36 trượt vì ZZ đầu bảng.
- Không chạy lại đủ 23 file mở/lưu; chỉ d09+d20 và đối chứng d01/d13/d16/d21.

## Test

- `node tests/run-tests.js` — **1825/1825 PASS**
- `python -m unittest discover -s tests -p "test_*.py"` — **336 tests OK**
