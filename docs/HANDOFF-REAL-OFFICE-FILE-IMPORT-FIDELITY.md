# Agent Handoff
TASK: Kiểm tra (và sửa) độ trung thực khi VN Office **mở file Office thật** do người khác tạo — không phải vòng lặp tự lưu FODS/FODP rồi tự mở lại.
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/real-office-file-import-fidelity`
WORKTREE: `E:\VNOffice-grok-file-fidelity`
OBJECTIVE: Tạo fixture OOXML bằng đường đi LibreOffice headless (ODF viết tay → `soffice --convert-to docx/xlsx/pptx`), mở chúng qua `common.file.open` / `adapter.open()`, xác nhận nội dung Heading 1 / bold-italic / bảng / list / 2 sheet / SUM / currency / 2 slide / shape, sửa adapter nếu lệch thật.

---

## Plan gate

Thay đổi import (Writer HTML, Sheet FODS, Slides FODP) trên 3 adapter + test. Không đụng Core, không đổi build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** chứng minh VN Office mở được file OOXML không đi qua serializer VN Office.
- **Current capability trước task:** `open()` gọi `globalUnoBridge.openRealFile()` → chỉ chạy trong Desktop App (pywebview). `main.py` `open_document_dialog` convert soffice: Writer `docx→html`, Sheet `xlsx→fods`, Slides `pptx→fodp`. **Không có fallback browser.** Playwright không điều khiển được hộp thoại native (SendKeys cấm).
- **Files/modules:** adapters Writer/Sheet/Slides, fixtures, unit + live Playwright, helper soffice.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`.
- **Risk:** parseFodp regex mới có thể phá FODP do VN Office tự serialize — đã giữ nhánh `presentation:layout` cũ; 632 unit PASS.
- **Test plan:** unit (không soffice, <60s) + live Playwright (soffice reverse-convert + File → Mở).
- **Rollback:** revert branch; fixture OOXML độc lập với serializer.

---

## FINDINGS — cơ chế Mở file hiện tại

```
UI common.file.open
  → Adapter.open()  (writer / sheet / slides)
    → globalUnoBridge.openRealFile(appKind)
      → yêu cầu window.pywebview.api + engine_status.available
      → main.py open_document_dialog: hộp thoại native
      → soffice --convert-to html|fods|fodp (đúng FORMAT_FILTERS)
      → trả { status, content, fileName }
    → Writer: gán HTML vào .vno-writer-body
    → Sheet: loadFromFods()
    → Slides: loadFromFodp()
```

Trong Playwright/Edge (không pywebview): `openRealFile` trả lỗi “chỉ khả dụng trong Desktop App”. **Không có nhánh đọc file trực tiếp.** Live test **không** giả convert: chạy đúng lệnh soffice như `main.py`, chỉ stub hộp thoại native (không SendKeys).

## IMPLEMENTATION SUMMARY

### 1. Fixture ngoài VN Office
Hand-written Flat ODF (không gọi `serializeToFods` / `serializeToFodp` / HTML save):

- `tests/fixtures/real-office-samples/src/sample-writer.fodt` — Heading 1, đoạn bold/italic, bảng 3×3, bullet list, A4.
- `src/sample-sheet.fods` — 2 sheet, `table:formula="of:=SUM([.B2:.B4])"`, currency VND.
- `src/sample-slides.fodp` — 2 slide, title+subtitle, `draw:rect` + text.

Convert: `soffice --headless --convert-to docx/xlsx/pptx` → `sample-writer.docx` (6579 B), `sample-sheet.xlsx` (6932 B), `sample-slides.pptx` (10766 B). Tái tạo: `node tests/scripts/generate-real-office-fixtures.mjs`.

### 2. Lỗi thật khi mở file soffice (sửa adapter, không sửa fixture)

| App | Hiện tượng trên file thật | Sửa |
|---|---|---|
| Writer | Filter `HTML (StarWriter)` bọc Heading 1 thành `<ol><li><h1>` và dump cả `<html><head>` vào body | `_normalizeImportedHtml()`: lấy `<body>`, gỡ `ol/ul>li>h1`, đọc `@page` A4 |
| Slides | Regex `/<draw:page[^>]*>/` khớp `draw:page-thumbnail` → slide 1 title thành `"<number>"`, nuốt master placeholders | `/<draw:page(?![-a-zA-Z])/`; ưu tiên `presentation:class` title/subtitle/outline |
| Slides | `shapes: []` luôn; text trong `draw:custom-shape` bị lấy làm title slide 2 | Parse `custom-shape`/`rect`/`ellipse` → `slide.shapes` (px tương đối, fill-color) |
| Sheet | Ô chữ nhận `numberFormat` từ `table:default-cell-style-name` của cột | Chỉ áp dụng number style khi `office:value-type` là float/currency/percentage/date/time |

Sheet **không** mất 2 sheet, SUM, hay currency — `parseFods` đã đọc đúng `of:=SUM([.B2:.B4])` = 450 và `N136` ₫. Không phải giới hạn convert.

### 3. Live Playwright
`tests/live/real-office-file-import-fidelity.playwright.mjs`: soffice reverse-convert → stub `openRealFile` → click File → Mở (`common.file.open`) trên Writer, Sheet, Slides.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — normalize HTML import + `@page`
- `adapters/libreoffice/slides/slides-adapter.js` — parseFodp pages/shapes/placeholders
- `adapters/libreoffice/sheet/sheet-adapter.js` — đừng gán number format cho ô string
- `tests/fixtures/real-office-samples/**` — ODF nguồn + OOXML
- `tests/helpers/soffice-convert.mjs` — filter trùng `main.py`
- `tests/scripts/generate-real-office-fixtures.mjs`
- `tests/unit/real-office-import-fidelity.test.js` — suite 55
- `tests/live/real-office-file-import-fidelity.playwright.mjs`
- `tests/run-tests.js`
- `docs/HANDOFF-REAL-OFFICE-FILE-IMPORT-FIDELITY.md`

## COMMANDS RUN

```
node tests/scripts/generate-real-office-fixtures.mjs
node tests/run-tests.js
node tests/live/real-office-file-import-fidelity.playwright.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **632/632 PASS, 12.1s** (< 60s) |
| Live Playwright + soffice | `node tests/live/real-office-file-import-fidelity.playwright.mjs` | **16/16 PASS, ~32s** |

Live Writer: `h1` “Báo cáo tổng hợp…” (CSS Heading 1 của Writer `text-transform:uppercase` khi hiển thị — không mất dữ liệu), không bọc list, `<b>đảm bảo</b>` / `<i>hoàn thành</i>`, bảng 3×3, 3 bullet, khổ A4 ~793.7px.

Live Sheet: tabs `Doanh thu` + `Chi phí`, B2=120, `=SUM(B2:B4)` → 450, B2 Chi phí = 1250000, `numberFormat.category=currency`, symbol `₫`.

Live Slides: 2 slide; slide 1 title+subtitle; slide 2 body “Kiến trúc nền tảng LibreOffice”; shape rect “Khối kiến trúc” at 76×170, 302×151, `#4472c4`, vẽ trên canvas.

## KNOWN FAILURES / LIMITATIONS

1. **Hộp thoại Mở file native** vẫn chỉ có trong Desktop App (pywebview). Playwright stub `openRealFile` sau khi đã convert soffice — cùng pipeline `main.py`, không giả nội dung. Mở file từ browser thuần vẫn báo “chỉ khả dụng trong Desktop App” (đúng, không bịa fallback).
2. **ActiveTable** vẫn mất qua hop XLSX headless (đã ghi ở HANDOFF FODS multi-sheet). Fixture này không phụ thuộc tab đang active.
3. **`serializeToFodp()` vẫn không ghi `slide.shapes`.** Mở PPTX thật thì shape vào canvas; Lưu lại bằng serializer VN Office sẽ **mất shape**. Ngoài scope import; follow-up nếu cần round-trip shape.
4. Slide 2 fixture không có placeholder `presentation:class="title"` → title rỗng, body + shape giữ đúng. Không ép fixture.
5. Writer Heading 1 hiển thị HOA vì CSS `.vno-writer-page h1 { text-transform: uppercase }` — HTML gốc vẫn casing thường.

## RISKS

Thấp. Parser FODP đổi từ DOMParser sang chuỗi thống nhất; unit slides layouts/notes/file-io vẫn PASS.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không cần Office GUI, không SendKeys.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/real-office-file-import-fidelity`. Follow-up tùy chọn: serialize shapes ra FODP khi Lưu.
