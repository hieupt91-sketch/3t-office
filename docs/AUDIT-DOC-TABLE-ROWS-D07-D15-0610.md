# Chẩn đoán chiều cao hàng bảng d07/d15 (07/10/2026)

## Kết luận ngắn

- **d07, T6R1:** không có merge và `w:trHeight` không phải nút thắt. Word bẻ riêng đoạn đầu ô 2 (`CỘNG HOÀ...`) thành **2 dòng**, còn Chromium giữ **1 dòng**: app thiếu đúng một line box, **18,1 pt**. Độ rộng chữ app là 250,35 pt trong vùng 251,25 pt (chỉ dư 0,90 pt), nên đây là sai khác advance/wrapping Word–Chromium ở Times New Roman 12 pt bold, không phải khoảng cách đoạn hay padding chung của ô.
- **d15, T2R1–R2:** không có `gridSpan`/`vMerge`. Hai lỗi độc lập là app không khôi phục `w:trHeight` tối thiểu và dùng `--vno-lh:1.15` cho các đoạn OOXML có giãn dòng `single`. Thử nhân quả qua CDP cho kết quả 34,15/144,84 pt, khớp ràng buộc Word 34,15/144,85 pt khi áp dụng đồng thời hai yếu tố.
- Số cũ “Word 90,0/122,3 pt” của d15 **không phải chiều cao hàng**: `word_table_rows.ps1` lấy chênh tọa độ ký tự đầu ở ô 1; cả hai hàng đều `w:vAlign="center"`, nên phép trừ lẫn khoảng canh giữa của hàng kế tiếp. `Word.Row.Height`, OOXML và thử nhân quả bên dưới là bằng chứng sửa lại phép đo này.

## Phạm vi và cách đo

Chỉ chẩn đoán; không sửa mã sản phẩm. Nguồn là `E:\VN OFice\file test\landocx\d07.docx` và `d15.docx`.

- OOXML: `scripts/audit-0610/inspect_ooxml_table_rows.ps1`, đọc thẳng `word/document.xml`.
- Word thật: `scripts/audit-0610/word_table_row_details.ps1`, Word COM read-only, `Saved=true`, `Quit`, chỉ dừng đúng PID Word do script mở.
- App thật: `scripts/audit-0610/app_table_row_details.mjs`, khởi động `main.py` bằng CDP và `VNO_CDP_LOCALAPPDATA` riêng; không SendKeys, không OS input, không `pywebview.evaluate_js`.
- Dữ liệu JSON thô nằm tại `E:\VNOffice-profiles\d29\` và không commit.

Quy đổi: 20 twip = 1 pt; 1 CSS px = 0,75 pt.

## Bảng số liệu tổng hợp

| Tệp / hàng | `w:trHeight` gốc | Word COM | Số Word cũ (proxy tọa độ) | App thực đo | Sai lệch có nghĩa |
|---|---:|---:|---:|---:|---:|
| d07 T6R1 | 2320 twip = **116,00 pt**, mặc định `atLeast` | `Height=116`, `HeightRule=atLeast`; nội dung thực chiếm **153,8 pt** do thêm 1 dòng | 153,8 pt; dùng được vì hai hàng liên quan canh trên | **135,63 pt** | **−18,1 pt**, đúng 1 dòng app |
| d15 T2R1 | 683 twip = **34,15 pt**, `atLeast` | `Height=34,15`, `HeightRule=atLeast`, mọi ô canh giữa | 90,0 pt — **không hợp lệ** | **30,16 pt** | **−3,99 pt** so với minimum |
| d15 T2R2 | 2897 twip = **144,85 pt**, `atLeast` | `Height=144,85`, `HeightRule=atLeast`, mọi ô canh giữa | 122,3 pt — **không hợp lệ** | **156,75 pt** | **+11,90 pt** so với minimum |

### Cấu trúc OOXML từng hàng

| Tệp / hàng | `tblGrid` / `tcW` (twip) | Merge | Số đoạn theo ô | Cỡ chữ và spacing |
|---|---|---|---|---|
| d07 T6R1 | grid 3660, 5220; ô 3660, 5220 (= 183/261 pt) | không `gridSpan`, không `vMerge` | 1 / 5 | mọi đoạn TNR 12 pt; before/after 120 twip = 6/6 pt; line 312 auto = 130%; `tcMar` bốn cạnh 100 twip = 5 pt |
| d15 T2R1 | grid/tcW 534, 1734, 4140, 3330 (= 26,7/86,7/207/166,5 pt) | không `gridSpan`, không `vMerge`; 4 ô `vAlign=center` | 1 / 1 / 1 / 1 | TNR 13 pt; before/after 6/6 pt; không có `w:line` ⇒ Word single; không có `tcMar` trực tiếp |
| d15 T2R2 | như T2R1 | không `gridSpan`, không `vMerge`; 4 ô `vAlign=center` | 1 / 1 / 6 / 5; đoạn cuối ô 4 rỗng | TNR 13 pt; before/after 6/6 pt; không có `w:line`; các `numPr` ở ô 3/4 được HTML giữ thành `<ul><li>` |

## d07 T6R1: thiếu đúng một dòng wrap

### HTML/CSS app

- `<tr valign="top">` không có style; ô 1 có `height="141"` do HTML LibreOffice, không phải `w:trHeight=2320`.
- Hai ô app rộng đúng 183/261 pt; padding computed 5/5 pt trên-dưới và vùng nội dung ô 2 rộng 251,25 pt.
- Ô 2 giữ đủ 5 `<p>`. Mỗi đoạn có `margin-top/bottom: 0.212cm` (~6 pt), font 12 pt, `--vno-lh:1.3`, line-height computed 23,92 px = **17,94 pt**. Không có đoạn rỗng hay `<br>` cuối ô.
- Đoạn `CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM` chỉ có 1 line rect, rộng **250,35 pt** trên client width **251,25 pt**.

### Bằng chứng Word và nguyên nhân

Word COM cho tọa độ đầu năm đoạn ô 2 lần lượt 83,25; 125,25; 149,25; 173,25; 197,25 pt. Các bước bình thường là 24 pt, riêng P1→P2 là 42 pt, lớn hơn **18 pt**: P1 có thêm một dòng. App có 5 line box, Word có 6; chênh hàng đo được 153,8 − 135,63 = **18,17 pt**.

OOXML không có indent, break hay merge; font, line-height, margin và cell padding app đều khớp thuộc tính nguồn. Thành phần còn lại là wrap sát ngưỡng: Chromium đo chuỗi chỉ thấp hơn vùng chứa 0,90 pt, còn Word/GDI bẻ dòng. Điều này cũng giải thích vì sao chỉnh lề phải chung không phải sửa đúng phạm vi: cần hiệu chỉnh advance đúng font/weight/size, không cộng padding cho mọi bảng.

## d15 T2R1–R2: `trHeight` bị mất và single trở thành 115%

### HTML/CSS app

- Cả hai `<tr>` không có `height`/`min-height`. LibreOffice chỉ để `height="31"` trên ô đầu hàng 1 và `height="179"` trên ô đầu hàng 2, tương ứng 23,25/134,25 pt — thấp hơn minimum OOXML; pipeline chỉ khôi phục cột (`_applyOoxmlTableColumnGeometry`) chứ không khôi phục hàng.
- Font app là TNR 13 pt; đoạn giữ margin 6/6 pt và đúng số lượng 1/1/6/5. Danh sách ô 3/4 được giữ; `<ul>` computed margin 0 và padding-left 0, nên không phải margin UA của danh sách.
- Mỗi đoạn nhận `--vno-lh:1.15` và `--vno-font-ratio:1.15`, tạo line-height computed **22,923 px = 17,19 pt**. OOXML không có `w:line`; Word COM báo `LineSpacingRule=single`.
- App T2R1 cao 30,16 pt. T2R2 cao 156,75 pt; ô 4 quyết định chiều cao với 5 đoạn, trong đó P1 và P3 wrap hai dòng và P5 rỗng.

### Thử nhân quả qua CDP

| Biến thể runtime (không sửa source) | T2R1 | T2R2 | Line-height 13 pt |
|---|---:|---:|---:|
| Baseline | 30,16 | 156,75 | 22,923 px = 17,19 pt |
| Chỉ đặt CSS row height = minimum OOXML | **34,15** | 156,75 | 22,923 px |
| Chỉ đặt `--vno-lh:1` | 27,93 | **141,08** | 19,933 px = 14,95 pt |
| Minimum OOXML + `--vno-lh:1` | **34,15** | **144,84** | 19,933 px |

Kết quả tách được hai nguyên nhân: T2R1 thiếu minimum vì `w:trHeight` không được phục hồi; T2R2 bị nội dung 115% đẩy quá minimum. Khi trả đúng single, nội dung xuống 141,08 pt và minimum 144,85 pt trở lại là yếu tố quyết định.

### Vì sao số 90,0/122,3 pt cũ sai

`word_table_rows.ps1` lấy `y(first character of row N+1) - y(first character of row N)`. Ở d15, ô 1 của mọi hàng canh giữa: ký tự `1` của hàng 2 nằm ở y=539,25 trong một hàng minimum 144,85 pt, không nằm ở mép trên hàng. Vì vậy 539,25 − 449,25 = 90 chỉ là khoảng hai baseline đã canh giữa, không phải chiều cao T2R1. Cùng lỗi lan sang proxy 122,3 của T2R2.

## Vị trí sửa đề xuất (ticket sau)

1. `adapters/libreoffice/writer/writer-adapter.js::_normalizeImportedHtml`: sau `_applyOoxmlTableColumnGeometry`, ghép top-level `w:tbl/w:tr` với HTML và phục hồi `w:trHeight` (rule mặc định/`atLeast` dùng CSS `height` như minimum); đồng thời để `_parseDocStylesFromImportedHtml` ưu tiên effective OOXML `w:spacing/w:line` thay vì 115% do HTML LibreOffice tự thêm.
2. `adapters/libreoffice/writer/writer-adapter.js::_applyGdiDeviceFontPixels`: mở hiệu chỉnh advance Word/GDI theo font + weight + size cho TNR 12 pt bold; ca d07 cần tăng tổng advance ít nhất ~0,90 pt để wrap, không dùng padding chung cho mọi `td`.

Không đề xuất sửa Core/LibreOffice: cả hai trường hợp có đủ OOXML gốc và sửa đúng ở VN Adapter.

## Agent handoff

TASK: D29 — chẩn đoán hàng bảng d07/d15, không sửa mã sản phẩm

AGENT/ROLE: Codex / audit Writer layout

BRANCH: `audit/doc-table-rows-d07-d15-codex`

WORKTREE: `E:\VNOffice-codex-d29`

OBJECTIVE: Xác định thành phần OOXML/HTML/CSS gây ba chênh lệch và chỉ đúng file/hàm cho ticket sửa.

FINDINGS: d07 sai wrap sát ngưỡng (+1 dòng ở Word); d15 mất row minimum và áp 115% thay vì single; proxy Word cũ của d15 không phải row height.

IMPLEMENTATION SUMMARY: Chỉ thêm báo cáo và ba script audit đọc OOXML, Word COM và app CDP. Không đổi sản phẩm.

FILES CHANGED: `docs/AUDIT-DOC-TABLE-ROWS-D07-D15-0610.md`; `scripts/audit-0610/inspect_ooxml_table_rows.ps1`; `scripts/audit-0610/word_table_row_details.ps1`; `scripts/audit-0610/app_table_row_details.mjs`.

COMMANDS RUN: ba script audit mới; `compare_table_rows.ps1 d07/d15`; `node --check`; PowerShell AST parse; `git diff --cached --check`.

BUILD RESULT: NOT RUN — không đổi mã sản phẩm/build.

TEST RESULTS: PASS — hai DOCX được trích OOXML; Word COM đo 3 hàng; app desktop mở/đo qua CDP; thử nhân quả d15 cho 34,15/144,84 pt.

KNOWN FAILURES: d07 vẫn lệch 18,17 pt và d15 baseline vẫn 30,16/156,75 pt vì ticket này không được sửa sản phẩm.

RISKS: hiệu chỉnh advance d07 phải regression toàn corpus; phục hồi `trHeight exact` cần semantics riêng, không được coi như `atLeast`.

DEPENDENCIES/BLOCKERS: Không.

CORE PATCH ID (if any): Không có.

NEXT ACTION: Ticket sửa tại Writer adapter theo hai dòng đề xuất, thêm unit test ánh xạ top-level row và live regression d07/d15.
