# Agent Handoff
TASK: Kiểm tra (và sửa) độ trung thực khi VN Office mở file Office thật — round 2: ảnh nhúng DOCX, công thức VLOOKUP/IF/$A$1, Conditional Formatting và Data Validation XLSX. Không đụng Slides.
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/real-office-file-import-fidelity-round2`
WORKTREE: `E:\VNOffice-grok-real-office-fidelity-2`
OBJECTIVE: Tạo fixture OOXML độc lập với serializer VN Office (Flat ODF viết tay → soffice --convert-to), mở qua `common.file.open` / `adapter.open()`, xác nhận ảnh nhúng / VLOOKUP / IF lồng / tham chiếu tuyệt đối / CF / data validation, sửa adapter nếu lệch thật.

---

## Plan gate

Thay đổi import Writer HTML (ảnh) và Sheet FODS (công thức phức tạp, CF, validation) trên 2 adapter + test. Không đụng Core, không đổi build system, không gửi nội dung tài liệu ra cloud, không đụng Slides, không merge main.

- **Objective:** chứng minh VN Office mở được DOCX/XLSX thật với ảnh nhúng, công thức không bị flatten, và nhận dạng CF/validation đặt sẵn.
- **Current capability trước task:** round 1 đã sửa Heading 1 / numberFormat cột / FODP thumbnail. `parseFods` đọc SUM và currency nhưng **không** đọc `calcext:conditional-formats` hay `table:content-validations`. Writer HTML giữ `<img>` nhưng `main.py` chỉ trả chuỗi HTML.
- **Files/modules:** Writer/Sheet adapters, fixtures round 2, unit + live Playwright, helper soffice/zip.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`.
- **Risk:** parser CF/validation mới trên FODS không có các khối đó phải để mảng rỗng — unit file-io/metadata vẫn PASS.
- **Test plan:** unit (không soffice, <60s) + live Playwright (soffice reverse-convert + File → Mở). Chạy lại live round 1.
- **Rollback:** revert branch; fixture OOXML độc lập với serializer.

---

## FINDINGS — cơ chế Mở file hiện tại

Không đổi so với round 1:

```
UI common.file.open
  → Adapter.open()
    → globalUnoBridge.openRealFile(appKind)
      → main.py open_document_dialog
      → soffice --convert-to html|fods|fodp
      → trả { status, content, fileName }
    → Writer: HTML vào .vno-writer-body
    → Sheet: loadFromFods()
```

Playwright không điều khiển hộp thoại native (SendKeys cấm). Live test chạy đúng lệnh soffice như `main.py`, stub `openRealFile`.

### Ảnh nhúng (DOCX)

LibreOffice HTML (StarWriter) **không** nhúng data URI. Nó ghi sidecar `sample-writer-image_html_*.png` và `<img src="….png" width="192" height="96">`.

`main.py` đọc mỗi file HTML rồi xóa `TemporaryDirectory` → **sidecar mất** trên đường đi Desktop App thật. Đây là giới hạn `main.py` (ngoài ownership adapter). Live test inline sidecar thành data URI *sau* soffice, trước khi stub — cùng bytes ảnh soffice xuất, không giả nội dung.

Flat ODF `xlink:href="Pictures/…"` bị soffice biến thành **external link** (`r:link`, không `r:embed`) dù có `office:binary-data`. Fixture round 2 pack PNG vào ODT zip trước rồi `odt→docx` để DOCX chứa `word/media/image1.png` (126 bytes, đúng PNG gốc).

### Công thức (XLSX)

Sau hop soffice, FODS **giữ** `table:formula`, không flatten:

| Ô | Công thức Excel sau import | Giá trị |
|---|---|---|
| C2 | `=VLOOKUP(B2,'Danh mục'!A2:C4,2,0)` | Vở |
| D2 | `=VLOOKUP(B2,'Danh mục'!A2:C4,3,0)` | 12000 |
| F2 | `=$A$2*E2` | 88 |
| F3 | `=$A$2*E3` | 132 |
| G2 | `=IF(E2>=100,"Cao",IF(E2>=50,"Trung bình","Thấp"))` | Trung bình |
| G3 | cùng IF lồng | Cao |

Lưu ý fixture: hệ số nằm ở **A2** (`$A$2`), không phải A1 (A1 là tiêu đề "Hệ số" — nhân chuỗi sẽ ra `#VALUE!`). Parser `_formulaFromOdf` đã hiểu `[.$A$2]` và `[$'Danh mục'.A2:.C4]`.

### Conditional Formatting / Data Validation

LibreOffice **FODS→XLSX làm rơi** `calcext:conditional-formats` viết tay và `cell-content-is-between` nếu không đi qua OOXML Excel-native. Generate script (độc lập VN Office) inject vào XLSX:

- `conditionalFormatting sqref="A2:A4"`: `>80` / `<50` / blanks + dxf `#c6efce` / `#ffc7ce` / `#fff2cc`
- `dataValidation type="whole" operator="between"` 0–10 trên C2:C4
- List `"Đạt,Không đạt,Đang xử lý"` trên B2:B4 **đã sống sót** từ FODS gốc, không cần inject

XLSX→FODS mang chúng về `calcext:condition` (`>80`, `<50`, `formula-is(LEN(TRIM([.A2]))=0)`) và `table:content-validations`. Adapter trước đây **không parse** các khối này — đó là lỗi thật, đã sửa.

---

## IMPLEMENTATION SUMMARY

1. Fixture viết tay: `src/sample-writer-image.fodt` (+ PNG 80×40 đỏ/xanh), `src/sample-sheet-formulas.fods`, `src/sample-sheet-validation.fods`.
2. Convert: `node tests/scripts/generate-real-office-fixtures.mjs` (ODT pack ảnh, soffice OOXML, vá CF/validation Excel-native).
3. Writer adapter: gỡ `</img>` / `<br clear="left">` từ HTML StarWriter; giữ data URI + width/height.
4. Sheet adapter: parse `calcext:conditional-formats` + `table:content-validations`, `loadFromFods()` gán `conditionalFormattingBySheet` / `dataValidationsBySheet` rồi refresh visual.
5. Helper `inlineHtmlImages()` cho live test.

Không sửa LibreOffice Core. Không serialize fixture bằng VN Office.

---

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — dọn HTML ảnh StarWriter
- `adapters/libreoffice/sheet/sheet-adapter.js` — parse/load CF + data validation từ FODS soffice
- `tests/fixtures/real-office-samples/**` — ODF nguồn + OOXML round 2 (không đụng file round 1)
- `tests/helpers/soffice-convert.mjs` — `inlineHtmlImages`
- `tests/helpers/zip-package.mjs` — zip tối thiểu để pack ODT / vá XLSX
- `tests/scripts/generate-real-office-fixtures.mjs`
- `tests/unit/real-office-import-fidelity.test.js` — +4 case round 2
- `tests/live/real-office-file-import-fidelity-round2.playwright.mjs`
- `docs/HANDOFF-REAL-OFFICE-FILE-IMPORT-FIDELITY-ROUND2.md`

## COMMANDS RUN

```
node tests/scripts/generate-real-office-fixtures.mjs
node tests/run-tests.js
node tests/live/real-office-file-import-fidelity-round2.playwright.mjs
node tests/live/real-office-file-import-fidelity.playwright.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **700/700 PASS, 16.8s** (< 60s) |
| Live Playwright round 2 | `node tests/live/real-office-file-import-fidelity-round2.playwright.mjs` | **24/24 PASS, ~35s** |
| Live Playwright round 1 (regression) | `node tests/live/real-office-file-import-fidelity.playwright.mjs` | **16/16 PASS, ~33s** |

### Live Writer (ảnh)

- `h1` “Logo đơn vị nhúng trong văn bản” (CSS Heading 1 viết hoa khi hiển thị).
- `<img name="LogoDonVi" width="192" height="96">` = 5,08 cm × 2,54 cm @ 96 dpi.
- Data URI PNG IHDR **80×40**, bytes khớp PNG nguồn (`iVBORw0KGgo…`).
- soffice HTML thô vẫn `src="sample-writer-image_html_*.png"` (sidecar).

### Live Sheet (công thức)

- Tabs `Danh mục` + `Công thức`.
- VLOOKUP còn công thức, ra Vở / 12000.
- `$A$2*E2` = 88, `$A$2*E3` = 132 (không flatten, không `#VALUE!`).
- IF lồng còn công thức: 80 → Trung bình, 120 → Cao.

### Live Sheet (CF / validation)

- CF A2:A4: 95 → `#c6efce`, 45 → `#ffc7ce`, trống → `#fff2cc`.
- List B2:B4: Đạt / Không đạt / Đang xử lý; “Sai giá trị” → `is-validation-invalid`.
- Number C2:C4: 0–10; 8 hợp lệ, 15 → cảnh báo DOM.
- **Giới hạn chỉnh sửa lại quy tắc:** UI dialog CF/validation hiện có vẫn tạo rule mới; import chỉ **nhận dạng và hiển thị** (màu + cảnh báo + dropdown list). Không hứa editor round-trip từng thuộc tính ODF (`error-message` title, `display-list`, v.v.).

## KNOWN FAILURES / LIMITATIONS

1. **Hộp thoại Mở file native** vẫn chỉ Desktop App. Playwright stub sau soffice — cùng pipeline `main.py`.
2. **`main.py` không inline sidecar ảnh.** File → Mở trên pywebview sẽ nhận HTML với `src` trỏ file temp đã xóa → ảnh gãy trên đường đi production. Sửa đúng chỗ là `open_document_dialog` (đọc sidecar / EmbedImages rồi trả data URI). **Ngoài scope** `adapters/**` + `tests/**`. Adapter + live test đã chứng minh: khi HTML có data URI thì ảnh đúng vị trí, kích thước, bytes.
3. LibreOffice FODS viết tay **không** tự sống sót CF/`between` qua hop XLSX; generate script vá OOXML Excel-native (cách độc lập VN Office). File Excel người dùng tạo sẵn CF/validation thì hop XLSX→FODS **có** calcext — adapter giờ đọc được.
4. Import CF chỉ map `greaterThan` / `lessThan` / `blank` (đúng mô hình lưới hiện tại). Color scale, data bar, icon set, công thức tùy ý khác: **không parse**, ghi nhận là giới hạn.
5. Không serialize CF/validation khi Lưu FODS (ngoài scope import). Round-trip Lưu sẽ mất rule — follow-up nếu cần.
6. Slides không đụng round 2.

## RISKS

Thấp. Parser CF/validation chỉ *thêm* field trên workbook; FODS không có các khối đó → mảng rỗng. 700 unit PASS, live round 1 không regress.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không thư viện trả phí. Không SendKeys.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/real-office-file-import-fidelity-round2`.

Follow-up (ngoài task): `main.py` inline sidecar HTML khi mở Writer; serialize CF/validation ra FODS khi Lưu.
