> Bản chụp đã lược dữ liệu riêng tư, ngày 05/11/2026. Là nghiên cứu, không phải kết quả đã kiểm; chỗ ghi CHƯA KIỂM vẫn chưa kiểm.

# Nghiên cứu: Univer (`dream-num/univer`) cho VN Office

- **Ngày**: 05/11/2026
- **Đối tượng**: `dream-num/univer`, license gốc **Apache-2.0**
- **Phương pháp**: clone thật (`git clone --depth 1 --filter=blob:none --sparse`) nhánh `dev`, đọc source thật; cài gói npm `@univerjs/engine-formula@1.3.1` để đo bundle; đọc README/pricing/compare trực tiếp.
- **Phiên bản khảo sát**: repo `dev` tại 05/11/2026; npm `@univerjs/engine-formula` = **1.3.1**; release mới nhất `v1.3.1` (02/11/2026).
- **Số liệu repo** (GitHub API): 22.899 stars, 1.923 forks, 155 open issues, license Apache-2.0, nhánh mặc định `dev`, tạo 29/09/2022, push cuối 05/11/2026, 353 watchers.

> **Cảnh báo quan trọng**: Phần "probe chạy thật" (thực thi Node trên gói npm vừa tải) bị **BLOCKED** bởi sandbox (không được phép chạy code bên thứ ba vừa tải về). Mọi kết luận về "chạy headless" dưới đây dựa trên **phân tích tĩnh** (grep bundle đã build, đọc test harness thật, đọc `package.json`), KHÔNG phải trên một lần chạy thành công. Chỗ nào chưa chạy được thì ghi rõ **NOT RUN / CHƯA KIỂM**.

---

## 1. Kiểm kê package (60 thư mục dưới `packages/`)

Số file thật mỗi package (đếm bằng `git ls-tree -r --name-only HEAD packages`):

| Package | File | Mục đích thật (đọc từ package.json/README/source) | License |
|---|---:|---|---|
| `engine-formula` | **1543** | Lexer + AST + Interpreter + 538 hàm + dependency graph + recalculation. Mô tả chính thức: "Formula parsing, function registration, dependency management, and calculation engine for Univer." | Apache-2.0 |
| `sheets-ui` | 490 | UI lưới bảng tính (React), selection, editor ô, clipboard | Apache-2.0 |
| `core` | 433 | "Core runtime, data models, command system, dependency injection, and Facade APIs" | Apache-2.0 |
| `sheets` | 424 | Mô hình workbook/worksheet, commands + mutations cho Sheet | Apache-2.0 |
| `docs-ui` | 382 | UI soạn thảo văn bản | Apache-2.0 |
| `engine-render` | 370 | "Canvas rendering engine for Univer documents, sheets, and slides" + **toàn bộ layout engine của Docs** | Apache-2.0 |
| `ui` | 305 | Khung UI React (ribbon/menu/sidebar/dialog) | Apache-2.0 |
| `design` | 210 | Design system / component library | Apache-2.0 |
| `sheets-formula-ui` | 156 | Autocomplete công thức, danh sách hàm, tooltip tham số | Apache-2.0 |
| `sheets-drawing-ui` | 128 | UI ảnh nổi trong Sheet | Apache-2.0 |
| `drawing-ui` | 115 | UI chung cho drawing | Apache-2.0 |
| `docs` | 113 | "Core document model and rich-text operations for Univer Docs" | Apache-2.0 |
| `docs-drawing-ui` | 103 | UI ảnh trong Docs | Apache-2.0 |
| `sheets-conditional-formatting-ui` | 99 | UI định dạng có điều kiện | Apache-2.0 |
| `sheets-table` | 98 | Bảng có cấu trúc (structured table / ListObject) | Apache-2.0 |
| `sheets-table-ui` | 95 | UI bảng | Apache-2.0 |
| `sheets-data-validation` | 90 | Data validation model | Apache-2.0 |
| `sheets-conditional-formatting` | 88 | Conditional formatting model | Apache-2.0 |
| `sheets-formula` | 87 | Nối engine-formula vào Sheet: dirty-range, auto-fill công thức, ref-range, array formula interceptor | Apache-2.0 |
| `sheets-hyper-link-ui` | 80 | UI hyperlink Sheet | Apache-2.0 |
| `sheets-numfmt-ui` | 77 | UI number format | Apache-2.0 |
| `sheets-filter-ui` | 71 | UI AutoFilter | Apache-2.0 |
| `docs-hyper-link-ui` | 65 | UI hyperlink Docs | Apache-2.0 |
| `sheets-thread-comment-ui` | 64 | UI comment ô | Apache-2.0 |
| `sheets-filter` | 61 | Model AutoFilter | Apache-2.0 |
| `find-replace` | 60 | Khung Tìm/Thay thế dùng chung | Apache-2.0 |
| `sheets-crosshair-highlight` | 57 | Highlight hàng/cột đang chọn | Apache-2.0 |
| `thread-comment-ui` | 56 | UI comment dùng chung | Apache-2.0 |
| `sheets-hyper-link` | 55 | Model hyperlink Sheet | Apache-2.0 |
| `docs-thread-comment-ui`, `sheets-sort-ui` | 51 | UI comment Docs / UI sắp xếp | Apache-2.0 |
| `data-validation`, `sheets-note-ui` | 46 | Khung validation dùng chung / UI ghi chú ô | Apache-2.0 |
| `action-recorder`, `docs-toc-ui` | 45 | Ghi lại hành động (test/macro) / UI mục lục | Apache-2.0 |
| `network`, `protocol`, `sheets-drawing` | 40 | HTTP/WebSocket client; định nghĩa protobuf/protocol; model ảnh Sheet | Apache-2.0 |
| `sheets-numfmt` | 39 | Engine number format | Apache-2.0 |
| `drawing` | 34 | Model drawing dùng chung | Apache-2.0 |
| `docs-drawing` | 29 | Model ảnh Docs | Apache-2.0 |
| `sheets-thread-comment` | 28 | Model comment ô | Apache-2.0 |
| `thread-comment` | 26 | Model comment dùng chung | Apache-2.0 |
| `sheets-note` | 25 | Ghi chú ô (legacy Excel note) | Apache-2.0 |
| `sheets-find-replace`, `sheets-sort` | 22-23 | Tìm/thay thế trong Sheet; sắp xếp | Apache-2.0 |
| `rpc` | 21 | RPC giữa main thread và Web Worker | Apache-2.0 |
| `docs-find-replace` | 20 | Tìm/thay thế trong Docs | Apache-2.0 |
| `watermark` | 16 | **Plugin watermark (chính repo OSS)** | Apache-2.0 |
| `docs-thread-comment` | 14 | Model comment Docs | Apache-2.0 |
| `docs-hyper-link`, `themes` | 10-12 | Model hyperlink Docs; theme tokens | Apache-2.0 |
| `docs-toc` | 10 | Model mục lục | Apache-2.0 |
| `rpc-node` | 9 | RPC cho môi trường **Node.js** | Apache-2.0 |
| `ui-adapter-vue3`, `ui-adapter-web-component` | 8 | Adapter Vue3 / Web Component cho UI service | Apache-2.0 |
| `telemetry` | 7 | Hook telemetry | Apache-2.0 |
| **`slides`** | **1** | **CHỈ có README.md. Nội dung: "This package has moved to `@univerjs-pro/slides`."** | ĐÃ RÚT → thương mại |
| **`slides-ui`** | **1** | **CHỈ có README.md: "This package has moved to `@univerjs-pro/slides-ui`."** | ĐÃ RÚT → thương mại |

**Không tồn tại trong repo OSS** (xác nhận bằng danh sách 60 thư mục): không có `chart`, `pivot`, `shape`, `smart-art`, `exchange`, `import`, `export`, `xlsx`, `docx`, `ooxml`, `collaboration`, `print` nào. Không có package `facade` riêng — Facade nằm trong `src/facade/` của từng package.

### Dependency bên thứ ba (runtime, toàn bộ 60 package)

```
@flatten-js/interval-tree 1.1.3   @floating-ui/dom ^1.8.0   @floating-ui/utils ^0.2.12
@wendellhu/redi 1.1.3             async-lock ^1.4.1         decimal.js ^10.6.0
fast-diff 1.3.0                   franc-min ^6.2.0          kdbush ^4.1.0
lodash-es ^4.18.1                 ot-json1 ^1.0.2           rbush ^4.0.1
```

Tất cả đều permissive (MIT/ISC/Apache-2.0). **Không có copyleft, không có SDK thương mại.** → Về mặt license, phần OSS **đạt** ràng buộc cứng của VN Office. (Lưu ý: license từng gói chưa được verify từng file `LICENSE` trong `node_modules` — **CHƯA KIỂM** chi tiết, nhưng đây đều là gói nổi tiếng permissive.)

---

## 2. Ranh giới OSS vs thương mại — câu hỏi quyết định

### Trích dẫn nguyên văn từ README (`dream-num/univer`, nhánh `dev`), mục "Scope and licensing":

> - **This repository:** Apache-2.0 packages that can be used in commercial applications under that license, including the open-source Headless content capabilities.
> - **Commercial extensions:** Commercial Web SDK plugins, Server SDK, and AI SDK capabilities beyond the open-source foundation are distributed and licensed separately. **Freemium** evaluation includes watermarks and feature limits.
> - **Reference applications:** Open-source applications such as Univer Workspace have their own source licenses.

### Bảng "Part" trong README (nguyên văn, cột mô tả):

> | **Commercial Web SDK plugins** | Follow the core's Plugin, dependency injection, Command/Mutation, and Facade extension patterns. **Add charts, shapes, pivot tables, SmartArt, and other features** for the corresponding content types. |
> | **Server SDK** | Extends the same content models and mutation conventions with real-time collaboration, revision history, and **Office file conversion**. |

> These types come from core and the respective product packages; **current Slides and Boards capabilities are separately distributed commercial products.**

> **Exchange** maps Office file structures to and from Univer content snapshots. For OOXML formats such as **XLSX, DOCX, and PPTX**, it parses the file into the corresponding Sheet, Doc, or Slide data and generates the file representation on export.
> → liên kết tới `docs.univer.ai/server/import-export/node`, tức **Server SDK**.

### Trích dẫn từ `univer.ai/pricing/`:

> - Freemium: **"$0"**, **"With watermarks and feature limits."**, **"Includes watermarks"**, **"Freemium is the SDK's Free Trial evaluation mode."**
> - Business: **"$99 / month"** hoặc **"Or from $1,000/year, billed annually."** — **"No watermark · unlimited imports and printing"**
> - Enterprise: **"Custom pricing"**
> - **"The separate localhost-only free license permits local use of the software and does not allow commercial use."**
> - Giới hạn bản open-source: **"Core Web SDK components and basic headless capabilities"**, **"Pro file conversion services are not included"**, **"Commercial collaboration services are not included"**
> - Freemium: **"Line, column, and bar charts only"**, **"One pivot table per workbook, across all worksheets"**, **"Unlimited imports and 10 exports per month"**

### Từ `univer.ai/compare/`:

> "The open-source edition includes only the frontend editors, not server components."
- Được gắn thẻ **"Supported (Open source)"**: công thức Sheets (lookup/aggregation/logic/text/date/array/LET/LAMBDA/dynamic array/SEQUENCE/financial/engineering/iterative), conditional formatting, data validation, soạn thảo Docs (format chữ, list, heading, page setup, header/footer, chèn/resize ảnh).
- **KHÔNG** gắn thẻ open-source: XLSX import/export, DOCX import/export, Charts, PivotTables, Shapes/text box/connector, SmartArt, toàn bộ Slides, **Print**.

### Kết luận mục 2 (dứt khoát)

| Câu hỏi | Trả lời có bằng chứng |
|---|---|
| Có bất kỳ xlsx/docx read-write open-source nào? | **KHÔNG. Zero.** Repo OSS không có package `exchange`/`import`/`export`/`ooxml`/`xlsx`/`docx` nào trong 60 thư mục. Chuyển đổi file OOXML nằm hoàn toàn ở **Server SDK** thương mại. |
| Charts, pivot tables, shapes, SmartArt có thương mại hết không? | **ĐÚNG, cả 4.** README liệt kê đúng 4 cái này là "Commercial Web SDK plugins". Không có package tương ứng trong repo. |
| Slides có thương mại không? | **ĐÚNG, tuyệt đối.** `packages/slides/README.md` và `packages/slides-ui/README.md` chỉ còn 1 dòng: *"This package has moved to `@univerjs-pro/slides`."* Code đã bị rút khỏi repo OSS. |
| "Freemium" watermark có thật không? | **CÓ THẬT.** Pricing nói rõ "With watermarks and feature limits" / "Includes watermarks"; Business tier mới "No watermark". Ngoài ra repo OSS còn có hẳn `packages/watermark` (16 file). |
| In ấn (Print)? | Không gắn thẻ open-source trên trang compare. Trong repo có code "print preparation" trong `docs`/`ui` (thấy ở CHANGELOG), nên **CHƯA KIỂM** ranh giới chính xác của Print. |

**→ Hệ quả cho VN Office**: Univer **KHÔNG thể thay thế LibreOffice** làm tầng xử lý tài liệu. Tất cả thứ VN Office cần nhất từ một "office SDK" (đọc/ghi .xlsx/.docx/.pptx, chart, shape, pivot, SmartArt, Slides) đều nằm sau cổng trả tiền + watermark → **bị loại thẳng** theo ràng buộc cứng (1). Giá trị duy nhất, nhưng rất lớn, là **`engine-formula`** (và thứ yếu là bài học kiến trúc + layout engine của Docs).

---

## 3. `packages/engine-formula` — mục tiêu giá trị cao nhất

### 3.1 Số lượng hàm (đếm thật)

Registry: `packages/engine-formula/src/functions/index.ts` → `ALL_IMPLEMENTED_FUNCTIONS`, ghép 16 file `function-map.ts`.

Đếm bằng regex `\[\s*\w+\s*,\s*FUNCTION_NAMES_\w+\.` trên từng `function-map.ts`:

| Nhóm | Số hàm đăng ký |
|---|---:|
| statistical | 113 |
| math | 82 (enum có 83 tên) |
| engineering | 57 |
| financial | 55 |
| text | 52 |
| compatibility | 38 |
| lookup | 38 |
| date | 27 |
| information | 25 |
| logical | 21 |
| database | 12 |
| cube | 7 |
| meta | 6 |
| web | 3 |
| array | 2 |
| univer | 0 (`export const functionUniver = []`) |
| **TỔNG ĐĂNG KÝ** | **538** |

**Trừ stub**: có `not-implemented-function.ts` với `NotImplementedFunction` luôn trả `#N/A`. **21 hàm** là stub:
`CUBEKPIMEMBER, CUBEMEMBER, CUBEMEMBERPROPERTY, CUBERANKEDMEMBER, CUBESET, CUBESETCOUNT, CUBEVALUE, AMORDEGRC, INFO, ISOMITTED, RTD, ISO.CEILING, FORECAST.ETS, FORECAST.ETS.CONFINT, FORECAST.ETS.SEASONALITY, FORECAST.ETS.STAT, CALL, EUROCONVERT, PHONETIC, REGISTER.ID, WEBSERVICE`

→ **~517 hàm có implementation thật.** (Excel 2016 có khoảng 470 hàm worksheet → coverage rất cao, vượt 2016 vì có thêm dynamic array hậu-2016 và vài hàm kiểu Google Sheets.)

### 3.2 Danh sách hàm theo nhóm (quan trọng cho VN Sheet)

**lookup (38)** — nhóm chiếm 91% công thức thực tế của ta:
`ADDRESS, ANCHORARRAY, AREAS, CHOOSE, CHOOSECOLS, CHOOSEROWS, COLUMN, COLUMNS, DROP, EXPAND, FILTER, FORMULATEXT, GETPIVOTDATA, HLOOKUP, HSTACK, HYPERLINK, IMAGE, INDEX, INDIRECT, LOOKUP, MATCH, OFFSET, ROW, ROWS, RTD*, SORT, SORTBY, TAKE, TOCOL, TOROW, TRANSPOSE, UNIQUE, VLOOKUP, VSTACK, WRAPCOLS, WRAPROWS, XLOOKUP, XMATCH` (*stub)

**statistical (113)**: `AVEDEV, AVERAGE, AVERAGE.WEIGHTED, AVERAGEA, AVERAGEIF, AVERAGEIFS, BETA.DIST, BETA.INV, BINOM.DIST, BINOM.DIST.RANGE, BINOM.INV, CHISQ.DIST, CHISQ.DIST.RT, CHISQ.INV, CHISQ.INV.RT, CHISQ.TEST, CONFIDENCE.NORM, CONFIDENCE.T, CORREL, COUNT, COUNTA, COUNTBLANK, COUNTIF, COUNTIFS, COVARIANCE.P, COVARIANCE.S, DEVSQ, EXPON.DIST, F.DIST, F.DIST.RT, F.INV, F.INV.RT, F.TEST, FISHER, FISHERINV, FORECAST, FORECAST.ETS*, FORECAST.ETS.CONFINT*, FORECAST.ETS.SEASONALITY*, FORECAST.ETS.STAT*, FORECAST.LINEAR, FREQUENCY, GAMMA, GAMMA.DIST, GAMMA.INV, GAMMALN, GAMMALN.PRECISE, GAUSS, GEOMEAN, GROWTH, HARMEAN, HYPGEOM.DIST, INTERCEPT, KURT, LARGE, LINEST, LOGEST, LOGNORM.DIST, LOGNORM.INV, MARGINOFERROR, MAX, MAXA, MAXIFS, MEDIAN, MIN, MINA, MINIFS, MODE.MULT, MODE.SNGL, NEGBINOM.DIST, NORM.DIST, NORM.INV, NORM.S.DIST, NORM.S.INV, PEARSON, PERCENTILE.EXC, PERCENTILE.INC, **PERCENTRANK.EXC, PERCENTRANK.INC**, PERMUT, PERMUTATIONA, PHI, POISSON.DIST, PROB, QUARTILE.EXC, QUARTILE.INC, RANK.AVG, RANK.EQ, RSQ, SKEW, SKEW.P, SLOPE, SMALL, STANDARDIZE, STDEV.P, STDEV.S, STDEVA, STDEVPA, STEYX, T.DIST, T.DIST.2T, T.DIST.RT, T.INV, T.INV.2T, T.TEST, TREND, TRIMMEAN, VAR.P, VAR.S, VARA, VARPA, WEIBULL.DIST, Z.TEST`

**compatibility (38)** — đúng bộ hàm "legacy" Excel mà VN Sheet phải có để mở file cũ: `BETADIST, BETAINV, BINOMDIST, CHIDIST, CHIINV, CHITEST, CONFIDENCE, COVAR, CRITBINOM, EXPONDIST, FDIST, FINV, FTEST, GAMMADIST, GAMMAINV, HYPGEOMDIST, LOGINV, LOGNORMDIST, MODE, NEGBINOMDIST, NORMDIST, NORMINV, NORMSDIST, NORMSINV, PERCENTILE, **PERCENTRANK**, POISSON, QUARTILE, RANK, STDEV, STDEVP, TDIST, TINV, TTEST, VAR, VARP, WEIBULL, ZTEST`

**logical (21)**: `AND, BYCOL, BYROW, FALSE, GROUPBY, IF, IFERROR, IFNA, IFS, LAMBDA, LET, MAKEARRAY, MAP, NOT, OR, PERCENTOF, REDUCE, SCAN, SWITCH, TRUE, XOR`

**information (25)**: `CELL, ERROR.TYPE, INFO*, ISBETWEEN, ISBLANK, ISDATE, ISEMAIL, ISEMPTY→(không có), ISERR, ISERROR, ISEVEN, ISFORMULA, ISLOGICAL, ISNA, ISNONTEXT, ISNUMBER, ISODD, ISOMITTED*, ISREF, ISTEXT, ISURL, N, **NA**, SHEET, SHEETS, TYPE`
→ **`NA()` CÓ MẶT.** Theo memory của ta, `NA()` là hàm duy nhất còn thiếu trong corpus LAN 672 file → đây là nguồn tham chiếu trực tiếp.

**text (52)**: `ASC, ARRAYTOTEXT, BAHTTEXT, CHAR, CLEAN, CODE, CONCAT, CONCATENATE, DBCS, DOLLAR, EXACT, FIND, FINDB, FIXED, LEFT, LEFTB, LEN, LENB, LOWER, MID, MIDB, NUMBERSTRING, NUMBERVALUE, PHONETIC*, PROPER, REGEXEXTRACT, REGEXMATCH, REGEXTEST, REGEXREPLACE, REPLACE, REPLACEB, REPT, RIGHT, RIGHTB, SEARCH, SEARCHB, SUBSTITUTE, T, TEXT, TEXTAFTER, TEXTBEFORE, TEXTJOIN, TEXTSPLIT, TRIM, UNICHAR, UNICODE, UPPER, VALUE, VALUETOTEXT, CALL*, EUROCONVERT*, REGISTER.ID*`

**math (83)**: `ABS, ACOS, ACOSH, ACOT, ACOTH, AGGREGATE, ARABIC, ASIN, ASINH, ATAN, ATAN2, ATANH, BASE, CEILING, CEILING.MATH, CEILING.PRECISE, COMBIN, COMBINA, COS, COSH, COT, COTH, CSC, CSCH, DECIMAL, DEGREES, EVEN, EXP, FACT, FACTDOUBLE, FLOOR, FLOOR.MATH, FLOOR.PRECISE, GCD, INT, ISO.CEILING*, LCM, LET, LN, LOG, LOG10, MDETERM, MINVERSE, MMULT, MOD, MROUND, MULTINOMIAL, MUNIT, ODD, PI, POWER, PRODUCT, QUOTIENT, RADIANS, RAND, RANDARRAY, RANDBETWEEN, ROMAN, ROUND, ROUNDBANK, ROUNDDOWN, ROUNDUP, SEC, SECH, SERIESSUM, SEQUENCE, SIGN, SIN, SINH, SQRT, SQRTPI, SUBTOTAL, SUM, SUMIF, SUMIFS, SUMPRODUCT, SUMSQ, SUMX2MY2, SUMX2PY2, SUMXMY2, TAN, TANH, TRUNC`

**date (27)**: `DATE, DATEDIF, DATEVALUE, DAY, DAYS, DAYS360, EDATE, EOMONTH, EPOCHTODATE, HOUR, ISOWEEKNUM, MINUTE, MONTH, NETWORKDAYS, NETWORKDAYS.INTL, NOW, SECOND, TIME, TIMEVALUE, TO_DATE, TODAY, WEEKDAY, WEEKNUM, WORKDAY, WORKDAY.INTL, YEAR, YEARFRAC`

**financial (55)**: `ACCRINT, ACCRINTM, AMORDEGRC*, AMORLINC, COUPDAYBS, COUPDAYS, COUPDAYSNC, COUPNCD, COUPNUM, COUPPCD, CUMIPMT, CUMPRINC, DB, DDB, DISC, DOLLARDE, DOLLARFR, DURATION, EFFECT, FV, FVSCHEDULE, INTRATE, IPMT, IRR, ISPMT, MDURATION, MIRR, NOMINAL, NPER, NPV, ODDFPRICE, ODDFYIELD, ODDLPRICE, ODDLYIELD, PDURATION, PMT, PPMT, PRICE, PRICEDISC, PRICEMAT, PV, RATE, RECEIVED, RRI, SLN, SYD, TBILLEQ, TBILLPRICE, TBILLYIELD, VDB, XIRR, XNPV, YIELD, YIELDDISC, YIELDMAT`

**engineering (57)**: trọn bộ `BESSEL*`, `BIN2*/DEC2*/HEX2*/OCT2*`, `BIT*`, `COMPLEX/IM*` (24 hàm số phức), `CONVERT, DELTA, ERF, ERF.PRECISE, ERFC, ERFC.PRECISE, GESTEP`

**database (12)**: `DAVERAGE, DCOUNT, DCOUNTA, DGET, DMAX, DMIN, DPRODUCT, DSTDEV, DSTDEVP, DSUM, DVAR, DVARP`

**meta (6+1)**: `COMPARE, DIVIDED, MINUS, MULTIPLY, PLUS, UNION, CUBE` — đây là các *toán tử* được mô hình hoá thành hàm nội bộ (ý tưởng kiến trúc hay: `A1+B1` cũng đi qua cùng đường dẫn như `SUM`).

**array (2)**: `ARRAY_CONSTRAIN, FLATTEN` (kiểu Google Sheets). **web (3)**: `ENCODEURL, FILTERXML, WEBSERVICE*`.

### 3.3 Dependency graph / recalculation

- `src/engine/dependency/`: `dependency-tree.ts` (516 dòng), **`formula-dependency.ts` (1314 dòng)**, `dependency-groups.ts`, `range-block-util.ts`.
- `FormulaDependencyTreeCalculator`: mỗi node có `children: Set<number>`, `parents: Set<number>`, `treeId`, `cycleGroup?`, và state machine `FDtreeStateType { DEFAULT, ADDED, SKIP }` — dùng để topo-sort + đánh dấu đã tính/bỏ qua.
- 3 loại tree: `FormulaDependencyTreeType { NORMAL_FORMULA, OTHER_FORMULA, FEATURE_FORMULA }` — "feature formula" là công thức của tính năng khác (conditional formatting, data validation) cũng tham gia cùng một graph. **Đây là ý tưởng rất đáng học**: VN Sheet hiện (giả định) tính CF/DV tách rời công thức ô.
- Tra cứu range dùng `@flatten-js/interval-tree` (interval tree) → dirty-range → dependents nhanh.
- Recalc tăng tiến qua `IFormulaDirtyData` (`dirtyRanges`, `dirtyNameMap`, `dirtyDefinedNameMap`, `dirtyUnitFeatureMap`, `dirtyUnitOtherFormulaMap`, `excludedCell`) + `forceCalculate`.
- Vòng lặp: có `ErrorType.CYCLE = '#CYCLE!'` và `cycleGroup` → hỗ trợ iterative calculation (trang compare cũng gắn thẻ "iterative calculation" là open-source).
- Có `services/global-computing-status.service.ts`, `runtime.service.ts`, và `worker.ts` + `packages/rpc` → có thể đẩy tính toán sang Web Worker.

### 3.4 Array / spill

- `ArrayValueObject` (`src/engine/value-object/array-value-object.ts`) là value object hạng nhất, tạo từ cú pháp literal Excel: `ArrayValueObject.create('{1, "First"; 2, "Second"}')`.
- `expandArrayValueObject(maxRow, maxCol, obj, fillWith)` — broadcasting kiểu Excel (scalar ↔ array), fill bằng `#N/A` khi thiếu. Thấy dùng trực tiếp trong `percentrank-inc/index.ts`.
- `ErrorType.SPILL = '#SPILL!'` có trong enum; `IFormulaCurrentConfigService` mang `arrayFormulaRange` + `arrayFormulaCellData`; `sheets-formula` có `array-formula-cell-interceptor.controller.ts`.
- Hàm `ANCHORARRAY` (toán tử `#` của Excel) có mặt → dynamic array là thật, không phải mô phỏng.
- Quy tắc trả về: nếu kết quả 1×1 thì **unwrap** về scalar (`if (maxRowLength === 1 && maxColumnLength === 1) return resultArray.get(0,0)`), ngược lại trả array → đúng semantics Excel.

### 3.5 Mô hình error value

`src/basics/error-type.ts` (nguyên văn enum):

```ts
export enum ErrorType {
    DIV_BY_ZERO = '#DIV/0!',
    NAME = '#NAME?',
    VALUE = '#VALUE!',
    NUM = '#NUM!',
    NA = '#N/A',
    CYCLE = '#CYCLE!',      // Cyclic dependency
    REF = '#REF!',
    SPILL = '#SPILL!',      // Array spill error
    CALC = '#CALC!',
    ERROR = '#ERROR!',
    CONNECT = '#GETTING_DATA',
    NULL = '#NULL!',        // In the case of SUM(B1 C1)
}
```

Error là **value object** (`ErrorValueObject.create(ErrorType.NA)`), lan truyền qua `isError()` ở từng hàm — không dùng exception. Có thêm `ISheetFormulaError { sheetName, row, column, formula, errorType }` để báo lỗi ra UI, và helper `checkVariantsErrorIsStringToNumber()` chuẩn hoá quy tắc coercion string→number theo Excel. Đủ cả 4 error ta quan tâm (`#REF!`, `#NAME?`, `#N/A`, và thêm `#SPILL!`).

### 3.6 Chiến lược độ chính xác số — RẤT ĐÁNG ĐỌC

`src/engine/utils/math-kit.ts` (195 dòng). Comment đầu file nguyên văn:

> *"Since Excel follows the IEEE 754 specification, it only handles precision issues when displaying cells. For example, =0.1+0.2, the stored value in XML is 0.30000000000000004, and the displayed value is 0.3. **The accuracy of the calculation process does not need to be considered. We only focus on the accuracy of the calculation results.** Any result is processed within 15 digits."*

Và bốn phép cơ bản là **IEEE 754 thuần, không bọc gì**:

```ts
export function plus(a: number, b: number): number { return a + b; }
export function minus(a: number, b: number): number { return a - b; }
export function multiply(a: number, b: number): number { return a * b; }
export function divide(a: number, b: number): number { return a / b; }
```

Việc "làm sạch" chỉ xảy ra ở **biên** (so sánh / xuất kết quả):

- `strip(num, precision = 15)` → `parseFloat(num.toPrecision(15))`, **nhưng bỏ qua** nếu phần nguyên đã ≥ 15 chữ số (`1212121212121212` không bị biến thành `1212121212121210`).
- `stripErrorMargin(num, precision = 12, tolerance = 1e-10)` → thử `strip(num, 12)`; chỉ nhận nếu sai khác < `1e-10`, ngược lại quay về `strip(num, 15)`. Comment giải thích: 12 là chọn theo kinh nghiệm để xử lý `0.0800000000000001`; `1e-10` vì `Number.EPSILON` quá nhỏ (ví dụ `=30.2-30` Excel hiện `0.2`).
- `equals/greaterThan/lessThan/...` đều so sánh qua `stripErrorMargin` → so sánh dung sai, không so sánh bit.
- `round/floor/ceil(base, precision)` dùng `factor = 10 ** trunc(precision)` + `baseEpsilon(base, factor) = Number.EPSILON * max(1, |base*factor|)` để bù lỗi nhân trước khi `Math.round/floor/ceil`. **`ceil` trừ epsilon, `round/floor` cộng epsilon** — chi tiết dễ sai nếu tự viết.
- `mod(base, divisor) = base - divisor * floor(base/divisor)` → đúng dấu kiểu Excel (khác `%` của JS).
- `decimal.js` chỉ dùng ở **một** file duy nhất: `src/basics/complex.ts` (số phức `IM*`). Tức là họ **không** dùng arbitrary precision cho số thực.

**→ Liên hệ trực tiếp bug precision ta đã sửa**: triết lý của Univer xác nhận hướng sửa của ta là đúng — **không được làm tròn trong quá trình tính**, chỉ chuẩn hoá ở biên hiển thị/so sánh. Bộ `strip` / `stripErrorMargin` / `baseEpsilon` là 4 hàm nhỏ, Apache-2.0, **có thể port nguyên vẹn** (kèm attribution) và là kiểu "antipattern-proof" cho chỗ khác trong VN Sheet.

### 3.7 Chạy headless trong Node, tách khỏi UI và document model? — CÓ (bằng chứng tĩnh)

Bằng chứng:

1. **Tuyên bố chính thức** (`DREAMNUM.md` dòng 3): *"The open-source, isomorphic office SDK for building embeddable spreadsheet and document experiences in browsers **and Node.js**."* Có hẳn package `rpc-node`. README nói "Browser, Node.js, and Web Worker integration paths".
2. **Không có phụ thuộc DOM trong `engine-formula`**: grep bundle đã build (`node_modules/@univerjs/engine-formula/lib/es/**/*.js`):

| Pattern | engine-formula | core |
|---|---:|---:|
| `document.` | 2 (chỉ trong chuỗi locale `fr-FR.js`) | 6 |
| `window.` | **0** | 3 |
| `navigator.` | **0** | 8 |
| `HTMLElement` | **0** | 0 |
| `requestAnimationFrame` | **0** | 2 |
| `localStorage` | **0** | 2 |

→ `engine-formula` **sạch DOM tuyệt đối**. `@univerjs/core` có vài tiện ích sniff trình duyệt (`navigator.platform`, `window.URL.createObjectURL`) nhưng nằm trong thân hàm, chỉ nổ khi gọi; `window.location` đã có guard `typeof window !== "undefined"`. **CHƯA KIỂM**: có hay không một `navigator.userAgent` ở top-level module của `core` (nếu có sẽ throw khi import trong Node thuần) — grep thấy `const sUserAgent = navigator.userAgent;` nhưng chưa xác nhận scope. Rủi ro thấp vì toàn bộ 4297 test của họ chạy bằng vitest.
3. **Test của họ chạy không cần browser**: `packages/engine-formula/vitest.config.ts` chỉ là `createConfig()` từ `@univerjs-infra/shared/vitest`; các test hàm chỉ `import { describe, expect, it } from 'vitest'` và gọi trực tiếp class hàm.

#### Mức 1 — Oracle "thuần hàm" (ĐƠN GIẢN NHẤT, không cần injector, không cần workbook)

Lấy từ `packages/engine-formula/src/functions/lookup/vlookup/__tests__/index.spec.ts` (source thật):

```ts
import { ArrayValueObject } from '@univerjs/engine-formula/engine/value-object/array-value-object';
import { NumberValueObject } from '@univerjs/engine-formula/engine/value-object/primitive-object';
import { Vlookup } from '@univerjs/engine-formula';          // hoặc .../functions/lookup/vlookup
import { FUNCTION_NAMES_LOOKUP } from '@univerjs/engine-formula';
import { getObjectValue } from '@univerjs/engine-formula/functions/util';

const table = ArrayValueObject.create(`{
    1, "First";
    2, "Second";
    3, "Third"
}`);

const fn = new Vlookup(FUNCTION_NAMES_LOOKUP.VLOOKUP);
const r = fn.calculate(
    NumberValueObject.create(2),
    table.clone(),                     // LƯU Ý: phải .clone(), engine có mutate/cache
    NumberValueObject.create(2),
    NumberValueObject.create(0)        // range_lookup = FALSE
);
console.log(getObjectValue(r));        // -> "Second"
```

Chữ ký: `BaseFunction.calculate(...variants: BaseValueObject[]): BaseValueObject`, cộng `minParams` / `maxParams`. Hoàn toàn thuần, **không có workbook, không có DI, không có UI**. Đây chính là dạng oracle VN Sheet cần: nạp giá trị ô → nhận kết quả.

#### Mức 2 — Oracle "chuỗi công thức đầy đủ" (có tham chiếu A1:B10, có sheet data)

Tìm được helper chính thức: `packages/sheets-formula/src/util/calculate.ts` (nguyên văn, bỏ header license):

```ts
export function calculateFormula(inject: Injector, formulaString: string, unitId: string, sheetData: ISheetData) {
    const formulaCurrentConfigService = inject.get(IFormulaCurrentConfigService);
    const lexer = inject.get(Lexer);
    const astTreeBuilder = inject.get(AstTreeBuilder);
    const interpreter = inject.get(Interpreter);
    formulaCurrentConfigService.load({
        formulaData: {}, arrayFormulaCellData: {}, arrayFormulaRange: {},
        forceCalculate: false, dirtyRanges: [], dirtyNameMap: {},
        dirtyDefinedNameMap: {}, dirtyUnitFeatureMap: {}, excludedCell: {},
        allUnitData: { [unitId]: sheetData },
        dirtyUnitOtherFormulaMap: {},
    });
    const lexerNode = lexer.treeBuilder(formulaString);
    const astNode = astTreeBuilder.parse(lexerNode as LexerNode);
    const result = interpreter.execute(generateExecuteAstNodeData(astNode as BaseAstNode));
    return getObjectValue(result);
}
```

Và cách wire thật (từ `packages/engine-formula/src/functions/compatibility/rank/__tests__/index.spec.ts`):

```ts
const testBed = createFunctionTestBed(getTestWorkbookData());   // IWorkbookData
const lexer = testBed.get(Lexer);
const astTreeBuilder = testBed.get(AstTreeBuilder);
const interpreter = testBed.get(Interpreter);
const functionService = testBed.get(IFunctionService);
const formulaCurrentConfigService = testBed.get(IFormulaCurrentConfigService);
const formulaRuntimeService = testBed.get(IFormulaRuntimeService);

formulaCurrentConfigService.load({ /* ...như trên... */
    allUnitData: { [testBed.unitId]: testBed.sheetData } });

const sheetItem = testBed.sheetData[testBed.sheetId];
formulaRuntimeService.setCurrent(0, 0, sheetItem.rowCount, sheetItem.columnCount,
                                 testBed.sheetId, testBed.unitId);  // ô "đang tính" = A1

functionService.registerExecutors(
    new Rank(FUNCTION_NAMES_COMPATIBILITY.RANK),
    new If(FUNCTION_NAMES_LOGICAL.IF),
);
// hoặc: functionService.registerExecutors(...ALL_IMPLEMENTED_FUNCTIONS.map(([C, n]) => new C(n)))

const calculate = (formula: string) => {
    const lexerNode = lexer.treeBuilder(formula);
    const astNode = astTreeBuilder.parse(lexerNode as LexerNode);
    return getObjectValue(interpreter.execute(generateExecuteAstNodeData(astNode as BaseAstNode)));
};

calculate('=VLOOKUP(2,A1:B8,2,FALSE)');
```

`sheetData` là `IWorkbookData.sheets[id]` với `cellData: { [row]: { [col]: { v, t: CellValueType } } }`, `rowCount`, `columnCount`, `rowData`, `columnData`. `CellValueType` ∈ `{ NUMBER, STRING, BOOLEAN, FORCE_STRING }`. Error value nạp vào như string: `{ v: ErrorType.NAME, t: CellValueType.STRING }`.

**Đánh giá cho mục đích oracle**: đây là hình dạng lý tưởng. Một script Node ~80 dòng có thể: đọc `tests/functions/*golden*.json` của VN Office → dựng `sheetData` → chạy `calculate(formula)` → so 3 chiều (VN Sheet vs Univer vs Excel COM). Chi phí: 1 dependency dev-only (không vào bản desktop) → **không vi phạm ràng buộc offline/no-paid**.
**Trạng thái**: thiết kế đã xác nhận bằng source thật; **NOT RUN** — chưa chạy được script probe do sandbox chặn thực thi code tải về. Cần owner cấp quyền hoặc chạy trong worktree có allowlist.

---

## 4. Bộ test công thức — nguồn test vector

**Đếm thật** (`packages/engine-formula`):

- Tổng: **569 file `*.spec.ts`**, **4.297 khối `it(...)`**, **7.600 lần `expect(...)`**.
- Riêng trong `src/functions/**` (test theo từng hàm): **475 file spec, 3.535 `it()`, 5.670 `expect()`**.

Phân bố test theo nhóm hàm:

| Nhóm | spec file | `it()` | `expect()` |
|---|---:|---:|---:|
| statistical | 107 | 792 | 1285 |
| math | 81 | 684 | 817 |
| engineering | 57 | 497 | 580 |
| financial | 54 | 461 | 803 |
| text | 47 | 254 | 538 |
| lookup | 35 | 310 | 552 |
| date | 27 | 194 | 360 |
| information | 23 | 105 | 141 |
| logical | 18 | 106 | 142 |
| database | 12 | 49 | 182 |
| compatibility | 7 | 55 | 107 |
| array | 2 | 5 | 11 |
| meta | 2 | 14 | 22 |
| web | 3 | 9 | 10 |
| cube | 0 | — | — (toàn stub) |

Vị trí: `packages/engine-formula/src/functions/<nhóm>/<tên-hàm>/__tests__/index.spec.ts`.
Ví dụ VLOOKUP: `.../lookup/vlookup/__tests__/index.spec.ts` — 385 dòng, 24 `it()`, 26 `expect()`, chia `describe('Exact match')` / approximate / array args / error cases, có cả bảng đã sắp xếp và bảng **chưa** sắp xếp (`arrayValueObject2`) để test hành vi approximate-match trên dữ liệu không sort — đúng cái bẫy mà corpus LAN của ta hay gặp.

**Tái sử dụng được không?** CÓ. Apache-2.0 cho phép dùng, sửa, phân phối, kể cả trong sản phẩm thương mại, **điều kiện: giữ copyright notice + bản copy license + ghi rõ thay đổi** (NOTICE). Mỗi file source đều có header license 15 dòng.
**Cách dùng đề xuất (an toàn nhất)**: viết script trích `it()` + `expect(...).toBe(...)`/`toStrictEqual(...)` từ các `index.spec.ts` thành JSON test-vector, **nhưng KHÔNG đưa vào `tests/functions/*golden*.json`**. Golden của ta là "sự thật Excel 2016" (COM oracle); vector Univer là "sự thật Univer" — chất lượng khác nhau. Để riêng, ví dụ `tests/functions/univer-vectors/*.json`, dùng làm *tầng phát hiện lệch*, rồi mỗi lệch mới xác thực lại bằng Excel COM trước khi ghi vào golden. Ước lượng: **~3.500 test case khả dụng**, trong đó ~310 case lookup và ~792 case statistical là giá trị cao nhất với ta.
**Rủi ro**: expectation của Univer không phải lúc nào cũng = Excel 2016 (chính CHANGELOG của họ có mục `fix(formula): align lookup, table, implicit-intersection, and PERCENTOF semantics with Excel` → tức trước đó họ sai). **Không bao giờ ghi đè golden của ta bằng số của Univer.**

---

## 5. `packages/engine-render`

**Quy mô**: 370 file, **106.398 dòng** `.ts`. Dependency: `@floating-ui/dom`, `@floating-ui/utils`, `franc-min` (nhận diện ngôn ngữ), `@univerjs/core`. Mô tả: "Canvas rendering engine for Univer documents, sheets, and slides."

### 5.1 Đo chữ (text measurement)

`src/components/docs/layout/shaping-engine/font-cache.ts` (428 dòng), class `FontCache`:

- Nguồn đo: `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D` → **bắt buộc có Canvas** (browser, hoặc `node-canvas`/`skia-canvas` trong Node — **CHƯA KIỂM** có path Node chính thức).
- Dùng **đầy đủ metric của `measureText`**: `fontBoundingBoxAscent/Descent` **và** `actualBoundingBoxAscent/Descent` + `width` (interface `IMeasureTextCache`). Đây là cách làm đúng — không chỉ lấy `width`.
- **Đọc trực tiếp bảng font nhị phân**: `IFontData` có `ascender, descender, typoAscender, typoDescender, strikeoutPosition, subscriptSizeRatio, subscriptOffset, superscriptSizeRatio, superscriptOffset, notDefWidth`, **`hdmxData?: number[]`** (kèm comment trỏ tới OpenType spec `recom#hdmx`) và `glyphHorizonMap: Map<number, { width, lsb, pixelsPerEm? }>`. Tức là họ dùng bảng `hdmx` (horizontal device metrics) để lấy advance width đã hinting theo ppem — đúng cách Word/Windows làm.
- 3 tầng cache: `_globalFontMeasureCache` (font→text→metrics), `_getTextHeightCache`, `_normalLineHeightCache`; key font được normalize bằng `getNormalFontKey()` (thay size thành `1000pt`) để cache height theo tỷ lệ. Có `invalidateDocumentFontMetrics(matches)` để xả cache khi font load xong (chống FOUT làm sai layout).
- Fallback baseline khi không có dữ liệu font: `{ sbr: 0.6, sbo: fontSize, spr: 0.6, spo: fontSize }` (sub/superscript ratio & offset).

**→ KHÔNG naive. Đây là mức ngang hoặc hơn những gì ta tự suy ra.** Đáng đọc kỹ.

### 5.2 Chiều cao hàng (row height) trong Sheet

`src/components/sheets/sheet.render-skeleton.ts` (1658 dòng):

- `calculateAutoHeightInRange(ranges, currentCellHeights?)` → `IRowAutoHeightInfo[]`; `calculateAutoHeightForCell(row, col)`; `_calculateRowAutoHeight(rowIndex)`.
- Có tối ưu tăng tiến: nếu `maxPrev < currentAutoHeight` thì chỉ `Math.max(currentAutoHeight, maxCurrent)`; nếu `maxCurrent >= currentAutoHeight` thì lấy `maxCurrent`; chỉ khi hàng có thể **co lại** mới quét lại toàn hàng bằng `_calculateRowAutoHeight`. (Tức là tránh quét cả hàng khi chỉ tăng.)
- Tính độ rộng khả dụng: `colWidth = columnData[col]?.w ?? defaultColumnWidth`, cộng dồn các cột nếu là merge main cell, rồi **trừ `sideGap`** = `fontRenderExtension.leftOffset + rightOffset` (chỗ dành cho icon CF/dropdown DV). Chi tiết này VN Sheet rất dễ bỏ sót.
- Với rich text / ô có `tr` (text rotation): dựng hẳn một `DocumentViewModel` + `DocumentSkeleton` cho **từng ô**, `updateDocumentDataPageSize(colWidth)` nếu `wrapStrategy === WRAP`, `calculate()`, rồi `getDocsSkeletonPageSize(skeleton, angle)`; sau đó **cộng margin đã quay**: `h += t*cos(|angle|) + ...`. Nghiêm túc nhưng **đắt** — tái dùng cả layout engine Docs cho mỗi ô.
- Cờ `_skipAutoHeightForMergedCells`, hook `cell.interceptorAutoHeight()` cho plugin ghi đè.
- Chiều cao hàng khi vẽ: `rowHeightAccumulation: number[]` (prefix-sum) trong `basics/tools.ts` → tra `startY/endY` O(1).

**So với mô hình row-height của ta (S31a–i / S32, 0/6887 hàng lệch)**: Univer **không** mô hình hoá các quirk Excel ta đã đo:
- không thấy xử lý "`ht` bị bỏ qua với hàng auto" (`customHeight` / `ia`),
- không thấy "ô ngầm theo style cột" (column-style implicit cells) tham gia auto-height,
- không thấy "padding khi bottom-align".
**→ Mô hình của ta chi tiết hơn về độ khớp Excel; mô hình của họ tốt hơn về kiến trúc (incremental + rich-text/rotation + sideGap + prefix-sum).** Không có lý do thay thế mô hình của ta; chỉ nên học phần tăng tiến và `sideGap`. (**CHƯA KIỂM** kỹ: chỉ grep + đọc ~120 dòng của `calculateAutoHeightForCell`, chưa đọc hết `_calculateRowAutoHeight`.)

### 5.3 Độ rộng cột

Không có "auto-fit column width" riêng biệt trong engine-render mà dựa trên `columnData[col].w` + `defaultColumnWidth`; auto-fit (double-click biên cột) nằm ở `sheets-ui`. **CHƯA KIỂM** chi tiết công thức auto-fit cột và việc có mô hình "ký tự số 0 của font Normal" như Excel hay không. (Có hằng `DEFAULT_MEASURE_TEXT = '0'` trong `font-cache.ts` → dấu hiệu họ cũng dùng ký tự `'0'` làm đơn vị, giống Excel.)

---

## 6. Facade API + Command system + Plugin architecture

### 6.1 Command system — **ý tưởng đáng copy nhất của toàn bộ nghiên cứu này**

`packages/core/src/services/command/command.service.ts`. Enum `CommandType` (nguyên văn JSDoc):

```ts
enum CommandType {
    /** Responsible for creating, orchestrating, and executing MUTATION or OPERATION according to
     *  specific business logic. For example, a delete row COMMAND will generate a delete row MUTATION,
     *  an insert row MUTATION for undo, and a set cell content MUTATION. */
    COMMAND = 0,
    /** OPERATION is the change made to data that is NOT saved to snapshot, without conflict resolution,
     *  such as modifying scroll position, modifying sidebar state, etc. */
    OPERATION = 1,
    /** MUTATION is the change made to the data saved to snapshot, such as inserting rows and columns,
     *  modifying cell content, modifying filter ranges, etc. */
    MUTATION = 2,
}
```

Ba tầng này giải quyết gọn một bài toán mà VN Office đang phải tự xử lý:

| Tầng | Vai trò | Vào snapshot? | Undo? | OT/collab? |
|---|---|---|---|---|
| COMMAND | logic nghiệp vụ, sinh ra N mutation (+ N mutation nghịch cho undo) | không | — | không |
| MUTATION | đơn vị thay đổi dữ liệu nguyên tử | **có** | có | **có** |
| OPERATION | trạng thái UI phù du (scroll, sidebar) | **không** | không | không |

Lợi ích: undo/redo "miễn phí" (COMMAND tự sinh mutation nghịch), collaboration "miễn phí" (chỉ cần serialize MUTATION), và không bao giờ undo nhầm vị trí scroll. README gọi đây là "Compose cross-feature edits and undo/redo".

**Khuyến nghị cho VN Office**: tầng `platform/` hiện có khái niệm command/service. Việc **tách rõ 3 loại** (và quy ước "chỉ MUTATION được ghi vào document model") là thay đổi kiến trúc nhỏ nhưng trả lãi lớn, đặc biệt cho undo đa-app và cho ranh giới "UI không gọi LibreOffice trực tiếp" của AGENTS.md: UI chỉ dispatch COMMAND; adapter LibreOffice chỉ nhận MUTATION. **Đây là plan-gate item** (đổi shared platform) → cần plan trước khi code.

### 6.2 Plugin architecture

`@wendellhu/redi` (DI container, MIT, do chính tác giả Univer viết). Mỗi package có `plugin.ts` khai báo plugin, `controllers/` đăng ký command + listener, `services/` là singleton inject-được, `facade/` là API ngoài. Mọi thứ nối bằng DI token (`ICommandService`, `IConfigService`, `IFunctionService`, `IDefinedNamesService`, ...). README: "Give custom features clear boundaries".

Tương đồng với layer boundary của VN Office (`UI → Platform/Command/Service → Adapter → Core`); khác ở chỗ Univer dùng DI container để cưỡng chế boundary, VN Office dựa vào quy ước thư mục.

### 6.3 Facade API

`packages/engine-formula/src/facade/{f-formula.ts, f-univer.ts, index.ts}`. `class FFormula extends FBase` với 7 service inject qua constructor (`ICommandService`, `Injector`, `LexerTreeBuilder`, `IConfigService`, `IFunctionService`, `IDefinedNamesService`, `ISuperTableService`). Mỗi method public có JSDoc kèm `@example` chạy được:

```ts
/**
 * @example
 * ```ts
 * const formulaEngine = univerAPI.getFormula();
 * const result = formulaEngine.moveFormulaRefOffset('=SUM(A1,B2)', 1, 1);
 * ```
 */
moveFormulaRefOffset(formulaString, refOffsetX, refOffsetY, ignoreAbsolute?): string
```

Facade là **façade mỏng, fluent, có chủ đích** (`univerAPI.getFormula()`, `FWorkbook`, `FWorksheet`, `FRange`) đứng trên command service — không phải nơi chứa logic. Có `@hideconstructor`, `@ignore` để sinh API reference tự động. Mô hình "mỗi package góp một mảnh Facade qua subpath `./facade`" là cách mở rộng API sạch, đáng học cho `platform/`.

---

## 7. `packages/docs` (word processing) — thực sự mạnh đến đâu?

`packages/docs` bản thân chỉ **113 file / 18.661 dòng** ("Core document model and rich-text operations"). **Toàn bộ layout engine nằm ở `engine-render/src/components/docs/`** — và nó rất nghiêm túc:

| File | Dòng | Nội dung |
|---|---:|---|
| `layout/doc-skeleton.ts` | **5.287** | Bộ dựng skeleton chính (model → page/line/glyph) |
| `layout/block/paragraph/layout-ruler.ts` | **3.036** | Quy tắc layout đoạn |
| `layout/tools.ts` | 2.072 | Tiện ích layout |
| `layout/block/paragraph/linebreaking.ts` | 1.475 | Ngắt dòng |
| `layout/block/table.ts` | 1.396 | **Bảng**, có `TableRowHeightRule.AT_LEAST / EXACT`, merge row heights |
| `layout/line-breaker/pairs.ts` | 1.182 | Bảng cặp **UAX #14** (Unicode line breaking) |
| `layout/model/page.ts` | 984 | **Mô hình trang** |
| `layout/block/paragraph/footnote-layout.ts` (+`endnote`, `note-numbering`) | 761+138+139 | **Footnote / endnote / số hoá ghi chú** |
| `layout/model/line.ts` / `glyph.ts` | 734 / 697 | Dòng / **glyph** |
| `layout/block/paragraph/shaping.ts` | 694 | Shaping |
| `layout/document-layout-page-patch.ts` | 707 | Patch layout theo trang (incremental relayout) |
| `layout/block/paragraph/line-adjustment.ts` | 397 | Justify / điều chỉnh dòng |
| `layout/block/column.ts` / `section.ts` | 299 / 180 | **Cột báo / section** |
| `layout/doc-no-wrap-measure.ts` | 299 | Đo không wrap |
| `layout/block/paragraph/bullet.ts` + `bullet-ruler.ts` | 255+147 | Bullet / numbering |
| `layout/hyphenation/**` | ~90 file pattern | **Nối gạch nối theo ~90 ngôn ngữ** (TeX patterns: en-us, de-1996, ru, fr, ...) |
| `layout/line-breaker/{unicode-trie,trie-data,tiny-inflate}.ts` | 129+181+315 | Unicode trie nén cho line breaking |
| `layout/block/paragraph/language-ruler.ts` | 155 | Quy tắc theo ngôn ngữ (CJK vs Latin) |
| `layout/header-footer-field.ts` | 51 | **Header/footer field** |

**Trả lời**: đây **KHÔNG phải flow editor**. Nó phân trang thật (page/section/column/footnote/header-footer/table-row-rule), ngắt dòng theo UAX #14, hyphenation đa ngôn ngữ, glyph-level. Và `core` có:

```ts
enum DocumentFlavor {
    UNSPECIFIED,
    TRADITIONAL,   // paginated, kiểu Word
    MODERN,        // flow, kiểu Google Docs
    DRAWINGML,     // text trong shape/slide
}
```

tức họ hỗ trợ **cả hai chế độ**, và `table.ts` có tham số `traditional` để bật nhánh tương thích Word (`getRowMinimumHeight(..., traditional)`).

**Đánh giá cho VN Writer**: VN Writer dùng LibreOffice để layout, nên **không cần** engine này. Nhưng nó là **tài liệu tham chiếu hạng A** cho đúng điểm yếu đã biết của ta (per memory: paragraph spacing = MAX(sa,sb), multiple line spacing = × chiều cao font tự nhiên theo run). Các file nên đọc khi gặp bug layout: `layout-ruler.ts`, `line-adjustment.ts`, `font-cache.ts`. Có cả `__tests__/fixtures` trong `layout/block/paragraph/__tests__/` → có test layout với fixture.

---

## 8. Độ chín & rủi ro

| Hạng mục | Số liệu / nhận định |
|---|---|
| Stars / forks / watchers | 22.899 / 1.923 / 353 — top-tier cho một office SDK |
| Open issues | 155 |
| Tuổi dự án | tạo 29/09/2022; 4 năm |
| Nhịp release | **Rất nhanh**: v1.0.0 (24/09/2026) → v1.0.1, v1.0.2 (24/09) → v1.0.3 (29/09) → v1.0.4 (10/10) → **v1.1.0 (17/10) → v1.2.0 (22/10) → v1.3.0 (29/10) → v1.3.1 (02/11)**. Minor mới ~mỗi tuần. Trước đó 0.22→0.25 trải dài 05–09/2026. |
| Breaking change | Cao. `docs/API_STABILITY.md` có 4 mức (Stable / Experimental / Internal / Deprecated) + quy trình `@deprecated` + log qua `ILogService`. **NHƯNG** chính file đó còn viết *"Univer is currently pre-1.0, so the project can still make breaking changes"* trong khi npm đã ở **1.3.1** → **tài liệu policy đã lỗi thời**, dấu hiệu governance lỏng. |
| CHANGELOG lỗi thời | `CHANGELOG.md` đầu file là **`1.0.0-beta.2` (22/08/2026)** trong khi release là `v1.3.1` (02/11/2026) → changelog không khớp release. Khó audit thay đổi. |
| Ai kiểm soát | **DreamNum Co., Ltd.** (Trung Quốc). Copyright header mọi file: "Copyright 2023-present DreamNum Co., Ltd.". Funding qua OpenCollective. `DREAMNUM.md` xác nhận có repo **private "Univer Pro"** và workflow `.github/workflows/dispatch-sync-univer-pro.yml` tự "sync-univer" sang đó sau mỗi lần merge vào `dev`. |
| Governance TQ — lưu ý | Đây là **open-core**, không phải community-governed: một công ty duy nhất quyết định cái gì OSS, cái gì rút sang Pro. **Tiền lệ đã xảy ra**: `packages/slides` và `packages/slides-ui` từng là OSS, nay chỉ còn 1 dòng README trỏ sang `@univerjs-pro/*`. → **Rủi ro cụ thể: `engine-formula` cũng có thể bị rút/giảm trong tương lai.** Giảm thiểu: **pin version và vendor/fork** bản Apache-2.0 hiện tại (1.3.1) vào repo ta nếu quyết dùng — Apache-2.0 là irrevocable cho bản đã phát hành. Ngoài ra: không có telemetry bắt buộc trong `engine-formula` (package `telemetry` riêng, 7 file, opt-in) — nhưng **CHƯA KIỂM** kỹ việc không có outbound call nào (lưu ý: có `WEBSERVICE` (stub), `IMAGE`, `HYPERLINK`, `network` package → nếu dùng, phải audit cho yêu cầu "không gửi nội dung tài liệu ra cloud âm thầm"). |
| Bundle size (đo thật, npm 1.3.1) | `engine-formula/lib/es/index.js` = **2,13 MB**; locale tách riêng 19 file (~0,32–0,37 MB mỗi ngôn ngữ, lazy). `core/lib/es/index.js` = **0,97 MB**. Cả thư mục `lib` của engine-formula (es+cjs+umd+types+locale) = 38,8 MB; core = 4,2 MB. → **Quá lớn để nhúng vào bản desktop chỉ để lấy công thức**, nhưng hoàn toàn ổn cho vai trò **dev-only test oracle**. |
| Giả định browser? | `engine-formula`: **KHÔNG** (0 hit `window/navigator/HTMLElement/rAF/localStorage` trong bundle; 2 hit `document.` chỉ là chuỗi locale tiếng Pháp). `core`: có một ít browser-sniff trong thân hàm. `engine-render`: **CÓ** — cần `CanvasRenderingContext2D`/`OffscreenCanvas`. `ui`/`*-ui`: cần **React** → không tương thích stack JS thuần của VN Office. |

---

## 9. Bảng phán quyết

| Package / thành phần | Phán quyết | Lý do |
|---|---|---|
| **`engine-formula`** (lexer, AST, interpreter, 517 hàm, dependency graph) | **TEST-ORACLE-ONLY** | Apache-2.0 sạch, deps permissive, **0 phụ thuộc DOM**, API thuần hàm (`new Vlookup(name).calculate(...)`) và API chuỗi công thức (`calculateFormula(injector, '=VLOOKUP(...)', unitId, sheetData)`) → oracle chéo lý tưởng cho VN Sheet + Excel COM. **KHÔNG** nên nhúng vào bản desktop: 2,13 MB + 0,97 MB core, trùng chức năng engine hiện có, rủi ro bị rút như Slides. Chỉ dùng dev-only, pin version, vendor nếu cần. |
| `engine-formula/src/engine/utils/math-kit.ts` (`strip`, `stripErrorMargin`, `baseEpsilon`, `round/floor/ceil`, `mod`) | **USE** (port có attribution) | 195 dòng, Apache-2.0, giải đúng bài toán precision mà ta đã từng bị bug. Triết lý "IEEE 754 thuần khi tính, chỉ chuẩn hoá ở biên" xác nhận hướng sửa của ta. Cần owner ký cho phần attribution/NOTICE. |
| `engine-formula/**/__tests__/*.spec.ts` (~3.500 case) | **TEST-ORACLE-ONLY** | Dùng được theo Apache-2.0 (giữ copyright + NOTICE). Đặt ở `tests/functions/univer-vectors/`, **KHÔNG** trộn vào `*golden*.json`; mọi lệch phải xác thực lại bằng Excel COM. Expectation của họ từng sai so với Excel (CHANGELOG tự thừa nhận). |
| `engine-formula/src/basics/error-type.ts` | **LEARN-ONLY** (có thể USE, 50 dòng) | Mô hình error-as-value-object đủ 12 loại kể cả `#SPILL!`, `#CALC!`, `#CYCLE!`, `#NULL!`. Checklist tốt để đối chiếu enum lỗi của VN Sheet. |
| `engine-formula/src/engine/dependency/**` | **LEARN-ONLY** | `FormulaDependencyTreeType.FEATURE_FORMULA` (CF/DV cùng graph với công thức ô) + interval-tree cho dirty-range là 2 ý tưởng nên áp dụng. Không port code (1.830 dòng, gắn chặt model Univer). |
| `core` — Command/Mutation/Operation | **LEARN-ONLY (ưu tiên cao)** | Tách 3 tầng là thay đổi kiến trúc đáng giá nhất cho `platform/` của VN Office (undo + ranh giới UI↔adapter). Là **plan-gate item**. Không port code (433 file, DI `redi`). |
| `core` — Facade pattern (`FBase`, `FWorkbook/FRange`, subpath `./facade`) | **LEARN-ONLY** | Cách mỗi package góp một mảnh API fluent, JSDoc `@example` chạy được. Áp dụng cho API script/automation tương lai của VN Office. |
| `engine-render` — `font-cache.ts` | **LEARN-ONLY (ưu tiên cao)** | Dùng `actualBoundingBox*` + đọc bảng `hdmx`/`glyphHorizonMap` của font + 3 tầng cache + invalidation khi font load. Chuẩn tham chiếu khi debug layout Writer. Không dùng trực tiếp (cần Canvas). |
| `engine-render` — `sheet.render-skeleton.ts` (auto row height) | **LEARN-ONLY** | Học: incremental (không quét lại hàng khi chỉ tăng), `sideGap` từ `fontRenderExtension`, `rowHeightAccumulation` prefix-sum. **Không** thay mô hình S31a–i/S32 của ta — của ta khớp Excel hơn (0/6887 lệch); của họ thiếu các quirk `ht`/implicit-cell/bottom-padding. |
| `engine-render` — `components/docs/layout/**` (page, section, column, table, footnote, UAX#14, hyphenation 90 ngôn ngữ) | **LEARN-ONLY** | Layout engine phân trang thật, `DocumentFlavor.TRADITIONAL` = chế độ tương thích Word. VN Writer đã có LibreOffice làm việc này. Giá trị: tài liệu tham chiếu khi gặp bug spacing/line-height. |
| `engine-render` (dùng làm renderer) | **IGNORE** | Cần Canvas + sẽ trùng/đụng với LibreOffice. Trái "reuse before rewrite" ở tầng ta đã có. |
| `ui`, `design`, `sheets-ui`, `docs-ui`, `*-ui`, `ui-adapter-*` | **IGNORE** | React-based; VN Office là JS thuần + WebView2. Nhúng React chỉ để lấy UI là thêm dependency lớn → **mục 11 AGENTS.md: stop and ask**. Không đáng. |
| `sheets`, `docs` (document model) | **IGNORE** | VN Office đã dùng document model của LibreOffice. Thêm model thứ hai vi phạm layer boundary. |
| `sheets-formula` | **LEARN-ONLY** | Chỉ lấy `src/util/calculate.ts` (31 dòng) làm khuôn cho script oracle; phần còn lại (dirty-range, auto-fill, ref-range) gắn chặt model Univer. |
| `sheets-numfmt` | **LEARN-ONLY** | 39 file engine number-format Apache-2.0 — đáng đọc nếu `TEXT()`/định dạng số của VN Sheet còn lệch. **CHƯA KIỂM** chất lượng. |
| `watermark` | **IGNORE** | Không liên quan (và là thứ ta muốn tránh). |
| `network`, `rpc`, `rpc-node`, `protocol`, `telemetry`, `action-recorder`, `themes` | **IGNORE** | Hạ tầng riêng của Univer, không khớp kiến trúc Python+WebView2 offline. |
| **`slides`, `slides-ui`** | **IGNORE (commercial)** | Code đã bị rút: README chỉ còn *"This package has moved to `@univerjs-pro/slides`."* |
| **XLSX / DOCX / PPTX import-export (Exchange / Server SDK)** | **IGNORE (commercial)** | Không tồn tại trong repo OSS. Thuộc Server SDK, cần license thương mại ($99/tháng hoặc từ $1.000/năm); Freemium có watermark + giới hạn 10 export/tháng. **Vi phạm ràng buộc cứng (1)**. |
| **Charts, Shapes, Pivot tables, SmartArt** | **IGNORE (commercial)** | README liệt kê đúng 4 cái này là "Commercial Web SDK plugins". Không có package OSS. |
| **Collaboration / revision history** | **IGNORE (commercial)** | Server SDK. (Và không phải ưu tiên của VN Office — desktop offline là ưu tiên 1.) |

---

## 10. Khuyến nghị hành động cho VN Office

1. **Không dùng Univer làm nền tảng xử lý tài liệu.** Mọi thứ VN Office cần từ một office SDK (OOXML read/write, chart, shape, pivot, SmartArt, Slides) đều thương mại + watermark → bị loại theo ràng buộc cứng. **Giữ LibreOffice.**
2. **Dùng `engine-formula` làm oracle thứ ba cho VN Sheet** (dev-only, không vào bản đóng gói). Giá trị cao nhất với nhóm `lookup` (VLOOKUP = 91% corpus LAN) và `statistical` (PERCENTRANK class). Pipeline: `tests/functions/*golden*.json` → sheetData → `calculate(formula)` → so VN Sheet / Univer / Excel COM. **Quy tắc bất di: Excel COM là sự thật duy nhất; Univer chỉ để *phát hiện* chỗ đáng kiểm tra.**
3. **Port `math-kit.ts`** (4 hàm: `strip`, `stripErrorMargin`, `baseEpsilon`, + `round/floor/ceil/mod`) kèm attribution, làm hàng rào chống tái diễn bug precision. **Cần owner ký** cho attribution Apache-2.0 trong NOTICE.
4. **Trích ~3.500 test vector** ra `tests/functions/univer-vectors/` (không trộn golden). Ưu tiên lookup (310 case) + statistical (792 case) + compatibility (55 case, hàm legacy cho file .xls cũ).
5. **Mở plan-gate cho Command/Mutation/Operation** ở `platform/` — thay đổi shared platform, đụng nhiều app → bắt buộc plan (objective / current capability / files / dependency / risk / test plan / rollback) theo mục 6 AGENTS.md.
6. **Pin + vendor** nếu quyết dùng: Univer là open-core do một công ty TQ kiểm soát, đã có tiền lệ rút package (Slides) khỏi OSS. Apache-2.0 không thu hồi được với bản đã phát hành → cách an toàn là đóng băng 1.3.1.
7. **Việc còn nợ (BLOCKED, cần quyền owner)**: chạy thật script probe Node để xác nhận `import @univerjs/engine-formula` và `calculateFormula` hoạt động trong Node thuần. Script đã viết tại
   `C:\Users\3TCOMP~1\AppData\Local\Temp\claude\d6b7e930ac1ce37a\a43656e9-bd73-4e02-842c-dd9db15498b4\scratchpad\probe-scripts\probe.mjs`,
   gói đã cài tại
   `C:\Users\3TCOMP~1\AppData\Local\Temp\claude\d6b7e930ac1ce37a\a43656e9-bd73-4e02-842c-dd9db15498b4\scratchpad\univer-headless\`.
   Sandbox từ chối thực thi code bên thứ ba vừa tải (lý do: "Code from External"). → trạng thái **NOT RUN**.

## 11. Danh mục "CHƯA KIỂM"

- Chưa chạy bất kỳ code Univer nào (sandbox chặn). Mọi khẳng định "chạy headless được" là **suy luận tĩnh**, không phải quan sát.
- Chưa chạy `npm test` / `vitest` của `engine-formula` → chưa xác nhận 4.297 test đều pass ở 1.3.1.
- Chưa so một case nào giữa Univer và Excel COM → chưa biết tỷ lệ khớp thực tế.
- Chưa xác nhận `navigator.userAgent` trong `@univerjs/core` ở top-level hay trong thân hàm (ảnh hưởng việc import được trong Node thuần).
- Chưa kiểm license từng file trong `node_modules` (12 dep bên thứ ba, đều là gói permissive nổi tiếng nhưng chưa đọc `LICENSE`).
- Chưa đọc hết `_calculateRowAutoHeight` và phần auto-fit độ rộng cột ở `sheets-ui`.
- Chưa đánh giá chất lượng `sheets-numfmt` (engine định dạng số) và `TEXT()`.
- Chưa audit outbound network của `engine-formula` ở mức runtime (`WEBSERVICE` là stub, nhưng `IMAGE`/`HYPERLINK`/`network` chưa kiểm) — bắt buộc phải audit trước nếu có ý định dùng ngoài phạm vi dev-only.
- Chưa xác định ranh giới OSS/thương mại chính xác của **Print**.
- `presets/` trong repo: `git ls-tree` không trả về file nào dưới `presets/packages` → **CHƯA KIỂM** có preset Node chính thức hay không.
