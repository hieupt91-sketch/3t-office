# Độ tương đương 3T ↔ Microsoft Office for Mac 16.114.1 — ORACLE-1 (24/10/2026)

Agent: Claude (`claude-oracle`) · Nhánh `mac/oracle-cl-2410` (từ `origin/vn-main` `0c931aa2`) · Máy: macOS 15.6 (Darwin 24.6.0), 8 GB RAM, Office for Mac 16.114.1, LibreOffice pilot 26.8.0.3.

## 0. Tóm tắt trạng thái

| Hạng mục | Trạng thái | Số liệu |
|---|---|---|
| Lấy chuẩn Excel Mac (1.500 ca, 16 lô) | **BLOCKED** | Excel không trả lời Apple Event: `execution error: Microsoft Excel gặp lỗi: AppleEvent hết thời gian chờ. (-1712)` — 0/1.500 ca đo được |
| Lấy chuẩn Word Mac (7 .docx) | **BLOCKED** | `Microsoft Word gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`; lần chạy `word_stats.py` hết 150 s |
| Lấy chuẩn PowerPoint Mac (4 .pptx) | **BLOCKED** | `execution error: Microsoft PowerPoint gặp lỗi: AppleEvent hết thời gian chờ. (-1712)` |
| 3T ↔ Excel 2016 Windows (tham chiếu chéo) | **PASS** | 1.500/1.500 khớp (dung sai tương đối 1e-9) |
| 3T số trang/slide qua LibreOffice pilot | **PASS** | 11/11 tệp chuyển PDF được, xem mục 3 |
| Kiểm phông | **PASS** | xem mục 4 |
| Unit test bộ oracle | **PASS** | pytest 16/16, `node --test` 7/7 |

Cột so với Excel/Word/PowerPoint for Mac **chưa có số liệu**. Không ghi số nào là "khớp Mac" khi chưa đo.

## 1. Vì sao phần Office bị BLOCKED (chi tiết)

1. Office for Mac (Word, Excel, PowerPoint) đã chạy sẵn từ trước (khoảng 16 giờ), không phải do agent này mở, nên agent **không thoát** chúng.
2. Thuộc tính đọc cục bộ trả lời ngay (`get version` → `16.114.1`, 0,05 s; AppleScript đọc thuộc tính này từ gói ứng dụng, không gửi sự kiện). Mọi sự kiện thật đều hết thời gian chờ:
   - `tell application "Microsoft Excel" to get name of every workbook` → `42:46: execution error: Microsoft Excel gặp lỗi: AppleEvent hết thời gian chờ. (-1712)` (2 phút 05 giây)
   - `get count of workbooks`, `evaluate name "=1+2"`, cả sau `activate` → cùng lỗi `-1712` (timeout 20–30 s)
   - `tell application "Microsoft Word" to get count of documents` → `Microsoft Word gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`
   - `tell application "Microsoft PowerPoint" to get count of presentations` → `Microsoft PowerPoint gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`
   - Chạy công cụ lúc 23:39–23:47: `excel_eval.py` (`1398:1415: execution error: Microsoft Excel gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`), `word_stats.py` (hết 150 s), `ppt_stats.py` (`166:185: execution error: Microsoft PowerPoint gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`).
3. Không có lỗi `-1743` (bị từ chối). Cả ba ứng dụng cùng không trả lời trong khi tiến trình nhàn rỗi (0% CPU) → nhiều khả năng macOS đang hiện hộp thoại xin quyền **Automation** (terminal điều khiển Word/Excel/PowerPoint) chờ người dùng bấm, hoặc mỗi ứng dụng đang mở một hộp thoại modal. Agent không được dùng System Events hay chụp màn hình để kiểm tra, nên dừng phần Office theo luật ở mục 6 của kế hoạch tổng.
4. Lối đặt bản sao trong container của Office (`~/Library/Containers/com.microsoft.Excel/Data/tmp/3t-oracle/`) như phiếu gợi ý cũng gây hộp thoại quyền: `mkdir -p …/com.microsoft.Excel/Data/tmp/3t-oracle` treo hơn 3 phút (macOS 15 bảo vệ "dữ liệu của ứng dụng khác") và agent đã dừng nó theo PID. Công cụ vì thế **không ghi vào container**:
   - Excel: dựng sổ tính mới ngay trong Excel (không mở tệp nào), nhập ô bằng AppleScript.
   - Word/PowerPoint: chép bản chỉ-đọc vào `~/Pictures/3t-oracle-staging/`. Office khai báo quyền `com.apple.security.assets.pictures.read-only` nên mở được mà không cần "Grant File Access"; ghi vào `~/Pictures` từ terminal không gây hộp thoại (đã thử: chép/xóa được ngay). Bản sao bị xóa sau mỗi tệp.

**Cần người phụ trách:** mở System Settings ▸ Privacy & Security ▸ Automation, cho terminal/agent điều khiển Microsoft Word, Microsoft Excel, Microsoft PowerPoint (hoặc đóng hộp thoại đang chờ trong ba ứng dụng), rồi chạy lại các lệnh ở mục 6. Lưu ý: sự kiện đã hết giờ phía gửi vẫn có thể được ứng dụng xử lý khi hết bị chặn → Excel có thể tự mở một sổ tính trống chưa lưu ("make new workbook" từ lần chạy `excel_eval.py`), Word có thể báo không tìm thấy bản sao `~/Pictures/3t-oracle-staging/…-sample-writer.docx` (đã xóa) — chỉ cần đóng, không lưu.

## 2. Sheet — công thức (1.500 ca; phiếu ghi 1.470, số thật trong `tests/functions/cases-*.json` là 1.500)

Dung sai: số thực so tương đối 1e-9 với sàn tuyệt đối 1e-9 (`|a−b| ≤ tol·max(1,|a|,|b|)`), `tol` riêng của ca (nếu có) được ưu tiên — y hệt `tests/unit/function-golden.test.js`. Chuỗi so bằng nhau tuyệt đối, lỗi so theo tên lỗi, mảng so từng phần tử.

3T được tính bằng **đúng cơ chế** của `tests/unit/function-golden.test.js` (FormulaEngine trên Map ô, `EN_LOCALE`, `evaluateArray` cho hàm mảng), không viết engine mới.

| Lô | Số ca | 3T=ExcelMac | 3T≠ExcelMac | ExcelMac≠ExcelWin | Không đo được (lý do) | 3T=ExcelWin | 3T≠ExcelWin |
|---|---:|---:|---:|---:|---|---:|---:|
| batch1-math | 84 | — | — | — | 84 (BLOCKED −1712) | 84 | 0 |
| batch2-stats | 148 | — | — | — | 148 (BLOCKED −1712) | 148 | 0 |
| batch3-text-format | 94 | — | — | — | 94 (BLOCKED −1712) | 94 | 0 |
| batch4-misc | 121 | — | — | — | 121 (BLOCKED −1712) | 121 | 0 |
| batch5-financial | 104 | — | — | — | 104 (BLOCKED −1712) | 104 | 0 |
| batch6-engineering | 180 | — | — | — | 180 (BLOCKED −1712) | 180 | 0 |
| batch7-securities | 96 | — | — | — | 96 (BLOCKED −1712) | 96 | 0 |
| batch8-database | 108 | — | — | — | 108 (BLOCKED −1712) | 108 | 0 |
| batch9-odd | 16 | — | — | — | 16 (BLOCKED −1712) | 16 | 0 |
| batch10-3d | 75 | — | — | — | 75 (BLOCKED −1712) | 75 | 0 |
| batch11-compound | 84 | — | — | — | 84 (BLOCKED −1712) | 84 | 0 |
| batch12-typical | 86 | — | — | — | 86 (BLOCKED −1712) | 86 | 0 |
| batch13-common | 171 | — | — | — | 171 (BLOCKED −1712) | 171 | 0 |
| batch14-numtext | 38 | — | — | — | 38 (BLOCKED −1712) | 38 | 0 |
| batch15-array-constants | 65 | — | — | — | 65 (BLOCKED −1712) | 65 | 0 |
| batch16-array-functions | 30 | — | — | — | 30 (BLOCKED −1712) | 30 | 0 |
| **Tổng** | **1.500** | **—** | **—** | **—** | **1.500** | **1.500** | **0** |

### Mọi ca 3T≠ExcelMac
Chưa có — không có `tests/macos/oracle/golden-mac/*.json` vì Excel Mac BLOCKED. Không có ca nào 3T≠ExcelWin (1.500/1.500 khớp), nên khi có số liệu Mac, mọi ca 3T≠ExcelMac sẽ đồng thời là ExcelMac≠ExcelWin (khác biệt Mac-Win), trừ khi Excel Mac trả kiểu khác (vd. lỗi `#CALC!`/`#SPILL!` của Excel 365 mà Excel 2016 không có).

Thời gian: phía 3T + so sánh 1.500 ca chạy 0,26 s. Thời gian mỗi ca phía Excel Mac: chưa đo (BLOCKED). Thiết kế: một lần gọi `osascript` cho mỗi lô (16–180 công thức), timeout mỗi `evaluate` 60 s, timeout cả lô 900 s; giữ khóa nặng theo lô.

## 3. Doc/Slide — số trang / số slide (`tests/fixtures/real-office-samples`)

3T: `lo_pages.py` chạy LibreOffice pilot với đúng cờ và bộ lọc mà `main.py` `_run_soffice_convert(..., "pdf", app_kind=…)` dùng (`writer_pdf_Export` / `impress_pdf_Export`), hồ sơ và PDF ở thư mục nháp ngoài repo; đếm trang bằng `fast_pdf_page_count` của `platform/print/print_pipeline.py` (chỉ đọc). 11/11 tệp đếm được bằng bộ đếm nhanh.

| Tệp | Trang Word Mac | Trang 3T | Slide PowerPoint Mac | Slide 3T (PDF / cấu trúc, ẩn) | Chênh lệch | Phông thiếu cho 3T | Phông thiếu cho Office |
|---|---|---:|---|---|---|---|---|
| sample-writer.docx | BLOCKED | 1 | | | chưa đo | Lucida Sans, NSimSun | DejaVu Sans |
| sample-writer-comments.docx | BLOCKED | 1 | | | chưa đo | Lucida Sans, NSimSun | DejaVu Sans |
| sample-writer-footnotes.docx | BLOCKED | 1 | | | chưa đo | Lucida Sans, NSimSun | DejaVu Sans |
| sample-writer-headerfooter.docx | BLOCKED | 1 | | | chưa đo | Lucida Sans, NSimSun | DejaVu Sans |
| sample-writer-image.docx | BLOCKED | 1 | | | chưa đo | Segoe UI | DejaVu Sans, Segoe UI |
| sample-writer-tables.docx | BLOCKED | 1 | | | chưa đo | Lucida Sans, NSimSun | DejaVu Sans |
| sample-writer-trackchanges.docx | BLOCKED | 1 | | | chưa đo | Lucida Sans, NSimSun | DejaVu Sans |
| sample-slides.pptx | | | BLOCKED | 2 / 2, 0 ẩn | chưa đo | — | DejaVu Sans |
| sample-slides-comments.pptx | | | BLOCKED | 2 / 2, 0 ẩn | chưa đo | — | DejaVu Sans |
| sample-slides-notes.pptx | | | BLOCKED | 3 / 3, 0 ẩn | chưa đo | — | DejaVu Sans |
| sample-slides-smartart.pptx | | | BLOCKED | 1 / 1, 0 ẩn | chưa đo | — | DejaVu Sans |

Thời gian chuyển PDF phía 3T: 0,72–2,32 s/tệp (lần đầu tạo hồ sơ 2,32 s), cả lô 11 tệp 10,9 s.

## 4. Phông (đầu vào cho MAC-9)

`font_audit.py` lấy tên phông khai báo trong gói (bảng `w:font` của fontTable, `w:rFonts`, `a:latin/a:ea/a:cs/a:sym`; bỏ phông chỗ giữ chủ đề `+mn-lt` và danh sách dự phòng theo chữ viết `a:font script=`), so với: phông hệ thống (`system_profiler SPFontsDataType`, 263 họ), phông Office tự mang (`…/Contents/Resources/DFonts` của Word/PowerPoint/Excel, 238 họ), phông LibreOffice pilot tự mang (47 họ).

- Thiếu cho 3T (LibreOffice không thấy): **Lucida Sans**, **NSimSun** (6 docx — hai phông này đến từ fontTable mặc định LibreOffice ghi khi tạo mẫu, không có trong macOS 15 cũng như pilot), **Segoe UI** (sample-writer-image.docx; cũng không có trong Office Mac).
- Thiếu cho Office Mac: **DejaVu Sans** (phông mặc định LibreOffice, chỉ có trong gói LibreOffice), **Segoe UI**.
- Rủi ro lớn hơn cho tài liệu thật tạo bằng Office (không có trong bộ mẫu này): Office Mac tự mang Calibri, Cambria, Aptos… trong DFonts — LibreOffice của 3T **không** dùng được thư mục này. Tài liệu dùng các phông đó sẽ bị thay phông ở 3T và dễ lệch số trang; cần đo lại bằng corpus tạo bằng Office Mac khi phần Office hết BLOCKED.

## 5. Công cụ (`tests/macos/oracle/`)

| Tệp | Vai trò |
|---|---|
| `oracle_common.py` | Phân tích kết quả `osascript -s s`, khôi phục số thực đủ 17 chữ số (AppleScript chỉ in 12 chữ số: trả `{hi, r−hi}`), bảng mã lỗi, chặn mọi kịch bản không nhắm Word/Excel/PowerPoint hoặc có `System Events`/`keystroke`, chép bản chỉ-đọc, chỉ thoát ứng dụng do chính lần chạy mở |
| `excel_eval.py` | Sổ tính mới trong Excel, nhập ô (`cells`, `sheets`), `evaluate` từng công thức trên Sheet1 + `ERROR.TYPE` để nhận đúng kiểu lỗi, đóng không lưu → `golden-mac/golden-*.json` cùng cấu trúc `tests/functions/golden-*.json` |
| `word_stats.py` / `ppt_stats.py` | Mở bản sao chỉ-đọc, số trang/đoạn/từ (Word, sau `repaginate`), số slide + slide ẩn (PowerPoint), tùy chọn xuất PDF, đóng không lưu |
| `lo_pages.py` | Phía 3T: soffice pilot → PDF ngoài repo → đếm trang; số slide cấu trúc của pptx |
| `font_audit.py` | Phông thiếu cho 3T / Office |
| `compare_functions.mjs` + `compare-lib.mjs` | So 3 chiều 3T ↔ Excel Mac ↔ Excel Win, xuất JSON + bảng Markdown |
| `test_oracle_tools.py`, `test_compare_functions.mjs` | Unit test không cần Office |

## 6. Lệnh chạy lại toàn bộ (từ gốc worktree)

```sh
PY=/Volumes/Data/Worktrees/_lead/venv-dev/bin/python
LOCK="/Volumes/Data/Worktrees/_lead/heavy-lock.sh claude-oracle --"
export VNOFFICE_SOFFICE_PATH=/Volumes/Data/Projects/3t-office/build/macos-offline-pilot-theme-20261022-v4/LibreOffice.app/Contents/MacOS/soffice
SCRATCH=$(mktemp -d)   # PDF và kết quả tạm, ngoài repo

# 0. Smoke (1 lô nhỏ, 1 docx) trước khi chạy hàng loạt
echo '{"cells":{"A1":1,"A2":2},"formulas":["=SUM(A1:A2)","=PI()","=1/0"]}' > $SCRATCH/cases-smoke.json
$LOCK $PY tests/macos/oracle/excel_eval.py $SCRATCH/cases-smoke.json --out-dir $SCRATCH/smoke --timeout 150
$LOCK $PY tests/macos/oracle/word_stats.py tests/fixtures/real-office-samples/sample-writer.docx --timeout 150

# 1. Excel Mac: mỗi lô một lần giữ khóa
for f in tests/functions/cases-*.json; do $LOCK $PY tests/macos/oracle/excel_eval.py "$f"; done

# 2. So sánh 3 chiều (không cần Office)
node tests/macos/oracle/compare_functions.mjs --out-json $SCRATCH/functions.json --out-md $SCRATCH/functions.md

# 3. Doc/Slide
$LOCK $PY tests/macos/oracle/word_stats.py tests/fixtures/real-office-samples/*.docx --out $SCRATCH/word.json
$LOCK $PY tests/macos/oracle/ppt_stats.py tests/fixtures/real-office-samples/*.pptx --out $SCRATCH/ppt.json
$LOCK $PY tests/macos/oracle/lo_pages.py tests/fixtures/real-office-samples/*.docx tests/fixtures/real-office-samples/*.pptx --work-dir $SCRATCH/lo --out $SCRATCH/lo.json
$PY tests/macos/oracle/font_audit.py tests/fixtures/real-office-samples/*.docx tests/fixtures/real-office-samples/*.pptx --out $SCRATCH/fonts.json

# 4. Unit test bộ oracle
$PY -m pytest tests/macos/oracle -q -p no:cacheprovider
node --test tests/macos/oracle/test_compare_functions.mjs
```
