> Bản chụp đã lược dữ liệu riêng tư, ngày 05/11/2026. Là nghiên cứu, không phải kết quả đã kiểm; chỗ ghi CHƯA KIỂM vẫn chưa kiểm.

# 05 — Danh sách thư viện có thể rút ngắn thời gian phát triển VN Office

Ngày khảo sát: **05/11/2026**
Phạm vi: VN Writer / VN Sheet / VN Slides, chuẩn đối chiếu **Microsoft Office 2016**.
Ràng buộc cứng áp dụng cho mọi dòng trong tài liệu này:

1. **Không phụ thuộc trả phí / độc quyền** — kể cả "free tier có watermark", "open-core + add-on thương mại", hay bất cứ thứ gì cần licence key.
2. **Copyleft (GPL/AGPL/LGPL/EUPL) phải có chữ ký đồng ý của chủ sở hữu** và theo thông lệ dự án là bị từ chối. Ưu tiên MIT / BSD / Apache-2.0 / MPL-2.0 / ISC / CC0 / Unicode-3.0.
3. **Offline tuyệt đối** — không CDN, không gọi mạng lúc chạy. Mọi thư viện phải được vendor vào repo.
4. **Không bao giờ gửi nội dung tài liệu ra ngoài.**
5. Node.js **chỉ** dùng cho hạ tầng test. App thật = `main.py` (Python stdlib) + WebView2 + JS trong `apps/`, `platform/`.

> **Cách đọc cột "Giấy phép"**: mỗi giấy phép dưới đây đều ghi rõ *đã đọc từ đâu*. Nếu không đọc được chính file LICENSE trong repo, dòng đó ghi **CHƯA KIỂM** kèm nguồn thay thế. Giấy phép có thể đổi — không tin blog, không tin tóm tắt của npm.

---

## 0. Hiện trạng đã kiểm trong repo (cơ sở để đánh giá "tiết kiệm được bao nhiêu")

Đã kiểm trực tiếp trên `E:\VN OFice` ngày 05/11/2026:

| Vùng | Hiện trạng đo được | Hệ quả |
|---|---|---|
| Máy công thức VN Sheet | 15 file `apps/sheet/formula*.js`, **~9.620 dòng**, ~181 khoá hàm dạng chuỗi hoa; grep thấy có `VLOOKUP, XLOOKUP, SUMIFS, TEXTJOIN, IFERROR, INDIRECT, OFFSET, SUMPRODUCT, FILTER, SORT, UNIQUE, LET, LAMBDA, AGGREGATE, SUBTOTAL, GETPIVOTDATA, YIELD, XIRR, DATEDIF` | Máy công thức **đã chín**. Không thư viện nào đáng để thay. |
| Thiếu (grep không thấy token — *cần xác nhận lại bằng test, không kết luận chỉ từ grep*) | `SEQUENCE`, `XMATCH`, `RANDARRAY`, `TEXTSPLIT`, `NA` | Đây là khoảng trống nhỏ, tự viết nhanh hơn là nhập thư viện. |
| Bộ chuẩn (golden) | `tests/functions/` có 16 batch `golden-batch*.json` + `structural-cases-1..19` + `cf-golden-1`, `dv-golden-1` | Hạ tầng đối chiếu đã có; cái thiếu là **oracle thứ hai** và **sinh ca test tự động**. |
| Chính tả tiếng Việt | `platform/text/vi-spellchecker.js` (6,4 KB), `vi-syllable.js` (4,8 KB), `dictionaries/vi-dictionary.js` (33,8 KB). `LICENSES-vi.txt` xác nhận: nguồn từ **Mozilla Common Voice**, giấy phép **CC0-1.0**, chỉ **2.798 token** + quy tắc ghép vần tự biên soạn | Máy kiểm tra thì ổn; **vốn từ là điểm yếu thật** (2.798 từ là quá ít cho văn bản hành chính). |
| OOXML phía Python | `platform/ooxml/engine_client.py` (12,2 KB) duy nhất | Thiếu hẳn công cụ soi/so sánh OOXML — chỗ này thư viện giúp nhiều nhất. |
| LibreOffice | MPL-2.0, đã bundle, dò qua `platform/os_services/windows.py` | Đã là "động cơ" chính; mọi thư viện dưới đây chỉ là *kiểm định / đo lường / lấp lỗ*, không thay LO. |

**Kết luận sớm:** thời gian tiết kiệm được nằm ở **C (đo chữ & ngắt dòng)**, **D (so sánh độ trung thực)**, **F (vốn từ tiếng Việt)** và **B/G (công cụ audit)** — **không** nằm ở A (máy công thức) hay E (model tài liệu).

---

## A. Máy đánh giá công thức bảng tính

### A.1 HyperFormula — **LOẠI, hai lần**

| Hạng mục | Kết quả |
|---|---|
| Gói | `hyperformula` |
| Repo | https://github.com/handsontable/hyperformula |
| Giấy phép | **Đã đọc `LICENSE.txt` trong repo**: "This software is dual-licensed" — hoặc giấy phép **độc quyền** của HANDSONCODE/đại lý, hoặc **GNU GPL v3**. Và câu quyết định: *"The specific license under which you use the software is determined by the license key you apply."* |
| Phán quyết | **LOẠI**. Vi phạm ràng buộc (1) vì hành vi pháp lý bị *licence key* điều khiển, và vi phạm ràng buộc (2) vì nhánh miễn phí là GPLv3. Không xin sign-off, không dùng cả làm oracle — vì chỉ cần một file HyperFormula nằm trong repo là đã mở ra tranh luận GPL. |

### A.2 `@formulajs/formulajs` — oracle được, động cơ thì không

| Hạng mục | Kết quả |
|---|---|
| Gói / phiên bản | `@formulajs/formulajs` **4.6.1** |
| Repo | https://github.com/formulajs/formulajs |
| Giấy phép | **MIT** — đọc từ `LICENSE` trong repo (Sutoiku, Inc. 2014; kèm BESSEL\* của SheetJS 2013 và jStat 2013, cùng MIT) |
| Phát hành | **28/07/2026** (GitHub release 4.6.1) |
| Kích thước | `dist.unpackedSize` = **2.422.485 B (~2,4 MB)** |
| Phụ thuộc | `jstat`, `bessel` (2 gói, đều MIT) |
| Chạy trong WebView2 không cần Node? | **Được** — có bản UMD `lib/browser/formula.min.js` (trường `unpkg`/`jsdelivr`); vendor file này vào repo là xong, không cần CDN |
| Điểm chết người | README tự thừa nhận: hàm ngày tháng (`DATE`, `DATEVALUE`, `EDATE`, `NOW`, `TODAY`) **trả về `Date` của JS thay vì số serial Excel** → `DATE(2020,5,9)-DATE(2020,5,8)` cho `86400000` chứ không phải `1`. Đã **bỏ** `FIXED, TEXT, DOLLAR, VALUE, MDETERM, MINVERSE, MMULT, MUNIT`. Không có parser, không hiểu vùng ô (`A1:C3`), không có spill/array tự nhiên. |
| Phán quyết | **Dùng làm oracle thứ hai cho hàm vô hướng** (toán, thống kê, tài chính, engineering) trong CI. **Không bao giờ ship.** Mô hình ngày tháng sai lệch là lỗi chí tử với mục tiêu Excel-2016. |

### A.3 `fast-formula-parser` — parser permissive tốt nhất, nhưng ta đã có parser

| Hạng mục | Kết quả |
|---|---|
| Gói / phiên bản | `fast-formula-parser` **1.0.19** |
| Repo | https://github.com/LesterLyu/fast-formula-parser |
| Giấy phép | **MIT** — đọc từ `LICENSE` trong repo (Dishu "Lester" Lyu, 2019) |
| Commit cuối | **10/09/2025** → bảo trì cầm hơi |
| Kích thước | **615.501 B (~600 KB)**; bản min UMD ~291 KB (~81 KB gzip) |
| Phụ thuộc | `chevrotain`, `jstat`, `bessel`, `bahttext` |
| Chạy trong WebView2 không cần Node? | **Được** — có bản UMD dùng bằng `<script>` |
| Năng lực | **280 hàm**; parser thật, hiểu vùng ô (`SUM(A:C)`), có `DepParser` trả về danh sách ô/vùng mà công thức phụ thuộc, hỗ trợ một phần mảng (`MMULT({1,5;2,3},...)`). Không hỗ trợ tham chiếu workbook ngoài (`[...]`) và `SUM(Sheet2:Sheet3!A1:C3)` |
| Cảnh báo | README đẩy người dùng sang `@sheetxl/formulas` — **gói thương mại** (xem BLACKLIST). Đây là dấu hiệu dự án gốc đã bị bỏ. |
| Phán quyết | **Oracle thứ hai + tài liệu tham khảo cho đồ thị phụ thuộc.** Phần `DepParser` đáng đọc nếu VN Sheet cần cải thiện thứ tự tính lại. Không thay máy của ta (280 < những gì ta đã có và không có mô hình lỗi/serial Excel đầy đủ). |

### A.4 `@univerjs/engine-formula` — hợp pháp nhưng là nguyên một kiến trúc

| Hạng mục | Kết quả |
|---|---|
| Gói / phiên bản | `@univerjs/engine-formula` **1.3.1** |
| Repo | https://github.com/dream-num/univer |
| Giấy phép | **Apache-2.0** — đọc từ `LICENSE` ở gốc repo (toàn văn Apache 2.0, không có điều khoản thêm). Trường `license` của npm cũng là `Apache-2.0`. |
| Phát hành | **02/11/2026** (tag `v1.3.1`) → rất hoạt động |
| Kích thước | `dist.unpackedSize` = **40.732.060 B (~40,7 MB)** |
| Phụ thuộc | `@univerjs/core` 1.3.1, `@univerjs/rpc` 1.3.1, `decimal.js`, `@flatten-js/interval-tree`; peer `rxjs >= 7` |
| Bẫy mô hình kinh doanh | README Univer nói rõ: *"The open-source packages in this repository are licensed under Apache-2.0"*, nhưng **biểu đồ, hình khối, pivot table, SmartArt, chuyển đổi file XLSX, Slides, Boards, cộng tác thời gian thực, lịch sử phiên bản** là **module thương mại phát hành riêng**, và *"Freemium evaluation includes watermarks and feature limits"* |
| Phán quyết | Riêng gói `engine-formula` thì **hợp pháp** (Apache-2.0). Nhưng: 40,7 MB, kéo theo `@univerjs/core` + DI container + RxJS, tức là **nhập khẩu kiến trúc của người khác** vào `platform/` — phá vỡ ranh giới lớp trong AGENTS.md §4. Và hệ sinh thái xung quanh nó chính là "open-core + add-on thương mại có watermark" mà ta cấm. **Tối đa: oracle chạy ngoài app.** Khuyến nghị thực tế: **bỏ qua**. |

### A.5 `formula-parser` (Handsoncode) — đã bị thay thế

- Gói `formula-parser`, repo https://github.com/handsontable/formula-parser
- Giấy phép: **MIT** — đọc từ `LICENSE` trong repo (Handsoncode sp. z o.o.)
- Đây là tiền thân của HyperFormula; Handsoncode đã chuyển năng lực sang HyperFormula (dual-licence). Số hàm ít, không mô hình lỗi Excel đầy đủ.
- **Phán quyết: không.** Giấy phép sạch nhưng giá trị kỹ thuật thấp hơn `fast-formula-parser` ở mọi mặt.

### A.6 Phía Python

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Phán quyết |
|---|---|---|---|
| `formulas` (vinci1it2000) | **1.3.4**, 11/03/2026 | **EUPL-1.1+** — đọc từ `LICENSE.txt` trong repo; metadata PyPI: `EUPL 1.1+`, classifier OSI EUPL-1.1 | **LOẠI khỏi sản phẩm** (EUPL là copyleft mạnh, tương thích GPL). Nếu chỉ chạy làm oracle trong CI thì copyleft không lan sang sản phẩm, nhưng vẫn phải xin sign-off để đưa công cụ GPL-family vào repo. **Khuyến nghị: không nhập.** |
| `pycel` | **1.0b30**, 13/10/2021 | **GPL-3.0** — đọc từ `LICENSE.txt` trong repo (toàn văn GPLv3); classifier PyPI: GPLv3 | **LOẠI.** Copyleft + đã chết 5 năm. |
| `xlcalculator` (bradbase) | **0.5.0**, 06/02/2023 | **MIT** — `info.license = MIT`, classifier OSI MIT trên PyPI (*file LICENSE: **CHƯA KIỂM** trực tiếp*) | **Oracle Python permissive duy nhất.** Cũ (2023) nhưng MIT. Dùng làm oracle thứ hai trong CI, đặc biệt khi Excel COM bị chặn. |
| `koala2` | — | **CHƯA KIỂM** | Chưa khảo sát. Mức ưu tiên thấp vì đã có `xlcalculator`. |

### A.7 LibreOffice qua Adapter của ta

- Giấy phép **MPL-2.0** (đã bundle, đã dùng). Là **động cơ thứ hai hợp pháp duy nhất** mà ta có thể gọi trong app thật.
- Nhưng LO Calc lệch Excel ở một số chỗ (chính vì vậy mới có `tests/functions/*golden*.json`). Không dùng LO làm chuẩn, chỉ dùng Excel 2016 / COM làm chuẩn.

### A.8 So sánh tổng hợp mục A

| Tiêu chí | VN Sheet hiện tại | formulajs | fast-formula-parser | univer engine-formula | xlcalculator | HyperFormula |
|---|---|---|---|---|---|---|
| Số hàm | ~181 khoá (đo được) | nhiều, không công bố số | 280 | nhiều | trung bình | ~400 |
| Parser + vùng ô | Có | **Không** | Có | Có | Có | Có |
| Mô hình lỗi Excel (`#N/A, #REF!, #NAME?`) | Có (đã sửa lan lỗi) | Một phần | Một phần | Có | Một phần | Có |
| Mảng / spill | Một phần (FILTER/SORT/UNIQUE) | Không | Một phần | Có | Không | Có |
| Ngày = serial Excel | Có | **Sai (Date JS)** | Có | Có | Có | Có |
| Dùng được làm oracle | — | **Có** | **Có** | Có (nặng) | **Có** | Không (pháp lý) |
| Dùng được để ship | — | Không | Không cần | Không nên | Không | **Không** |

---

## B. Đọc/ghi OOXML (JS và Python) — đánh giá **như công cụ soi & so sánh**, không phải đường lưu file

LibreOffice đã làm phần nặng. Vì vậy mọi gói dưới đây chỉ được chấm điểm theo khả năng **mổ file, so sánh, sinh fixture** cho audit độ trung thực.

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Đọc | Ghi | Mất gì khi round-trip | Chạy trong WebView2? | Phán quyết |
|---|---|---|---|---|---|---|---|
| `xlsx` (SheetJS CE) | npm **0.18.5**; bản hiện hành **0.20.x** trên cdn.sheetjs.com | **Apache-2.0** — đã đọc **hai** file: `LICENSE` của `xlsx@0.18.5` (unpkg) và `xlsx-0.20.3/package/LICENSE` trên cdn.sheetjs.com. Cả hai: Apache 2.0, "Copyright (C) 2012-present SheetJS LLC" | **Rất rộng**: xlsx, **xls (BIFF)**, xlsb, ods, csv, dif, prn | Có nhưng rất lược | Gần như hết định dạng, chart, pivot, hình | Được (bản dist thuần JS) | **NHẬN — chỉ để đọc/soi.** Giá trị lớn nhất: đọc **.xls/.doc legacy = 41% kho LAN** mà ta chưa test. Lưu ý: SheetJS **không còn publish lên npm** → phải vendor từ CDN một lần rồi commit (phù hợp luật offline). "SheetJS Pro" là bản thương mại — **không chạm**. CE thì Apache-2.0 sạch. |
| `exceljs` | **4.4.0**, npm 19/10/2023; commit cuối **12/01/2024** | **MIT** — đọc từ `LICENSE` repo (Guyon Roche 2014-2019) | Có (style, number format) | Có | Chart, pivot, một số shape | Có `browser: dist/exceljs.min.js` nhưng 9 phụ thuộc gồm `archiver`, `unzipper`, `readable-stream` (Node) | **Loại trên thực tế.** Không release 2 năm, không commit ~2 năm, 21,8 MB. Chỉ dùng tạm để soi style/number-format trong CI nếu `openpyxl` không đủ. Không phụ thuộc dài hạn. |
| `docx` (dolanmiu) | **9.15.2**, **03/11/2026** | **MIT** — đọc từ `LICENSE` repo (Dolan, 2016) | **Không đọc được** | Có, chất lượng cao | — | Phụ thuộc `fflate`, `nanoid`; không có trường `browser` | **NHẬN cho sinh fixture.** Đây là cách **sinh .docx đối kháng** (bảng lồng, anchor, numbering, section break) **mà không cần Word COM**. Rất quan trọng khi COM bị chặn. 20,5 MB nhưng chỉ ở `tests/`. Bảo trì tốt nhất nhóm này. |
| `mammoth` (JS) | **1.13.0**, **26/09/2026** | **BSD-2-Clause** — đọc từ `LICENSE` repo (Michael Williamson 2013) | docx → HTML | Không | **Chủ ý bỏ gần hết trình bày** (chỉ giữ ngữ nghĩa) | Có bản browser | **NHẬN như "differ rẻ".** Trả lời nhanh câu "sau khi lưu, chữ và cấu trúc còn nguyên không?". Không bao giờ dùng để kết luận độ trung thực hình thức. |
| `mammoth` (Python) | **1.13.0**, **26/09/2026** | BSD-2-Clause (PyPI `info.license`) | như trên | — | — | — | Bản Python tiện cho runner audit viết bằng Python. |
| `pptxgenjs` | **4.0.1**, 26/06/2025 | **MIT** — đọc từ `LICENSE` repo (Brent Ely, 2015-2022) | Không | Có | — | Có dist browser; deps `jszip`, `image-size`, `https` | **NHẬN cho sinh fixture Slides.** 2,6 MB. |
| `python-docx` | **1.2.0**, **16/06/2025** | **MIT** — đọc từ `LICENSE` repo (Steve Canny 2013) | Có | Có | Giữ nguyên XML nó không mô hình hoá (vì sửa trực tiếp cây part) → **round-trip an toàn hơn openpyxl** | Python, trong tiến trình app được, nhưng **chỉ dùng cho audit** | **NHẬN — công cụ soi OOXML tốt nhất cho Writer.** Truy cập được `document.element` / `_element` để so sánh XML thô. Thay thế việc tự viết parser `w:*`. |
| `python-pptx` | **1.0.2**, 07/08/2024 | **MIT** — đọc từ `LICENSE` repo (Steve Canny 2013) | Có | Có | Tương tự | Python | **NHẬN — vai trò tương đương cho Slides.** |
| `openpyxl` | **3.1.5**, 28/06/2024 | **MIT** — *theo metadata PyPI (`info.license = MIT`, classifier OSI MIT)*. **CHƯA KIỂM** từ chính `LICENCE.rst`: repo gốc ở foss.heptapod.net bị chặn sau tường chống bot "Anubis". **Phải xác minh lại trước khi merge.** | Có | Có | **Phá chart, hình ảnh, pivot, VBA** khi round-trip | Python | **NHẬN cho audit, TUYỆT ĐỐI không vào đường lưu file.** Giá trị: đọc style/number-format/conditional formatting/data validation để đối chiếu `cf-golden-1.json`, `dv-golden-1.json`. |
| `XlsxWriter` | **3.3.1** (ngày upload: CHƯA KIỂM — trang PyPI bị cắt; copyright trong LICENSE ghi 2013-**2026** → đang hoạt động) | **BSD-2-Clause** — đọc từ `LICENSE.txt` repo (John McNamara). PyPI `license_expression = BSD-2-Clause` | Không | Có, rất đầy đặn (chart, cond. format, data validation) | — | Python | **NHẬN cho sinh fixture Sheet.** Cặp bài trùng với `docx` ở phía Writer: sinh workbook đối kháng không cần Excel COM. |
| `pylightxl` | **1.61**, 01/01/2023 | **MIT** (PyPI `info.license = MIT`; file LICENSE: CHƯA KIỂM) | Có | Có (rất tối giản) | Hầu hết mọi thứ | Python, **0 phụ thuộc** | Biên. Chỉ hữu ích nếu cần đọc giá trị ô mà không muốn thêm phụ thuộc nào. `openpyxl` tốt hơn. |

**Tóm mục B:** bộ ba **`python-docx` + `python-pptx` + `openpyxl`** (soi) cộng bộ ba **`docx` + `XlsxWriter` + `pptxgenjs`** (sinh fixture) là phần "ăn ngay" rõ nhất của toàn báo cáo này: nó cho ta vòng lặp audit độ trung thực **không cần Office COM**, đúng lúc Excel COM đang bị chặn.

---

## C. Tạo hình chữ (shaping), font và ngắt dòng

Đây là nơi thư viện tiết kiệm **nhiều tuần nhất**, vì ta đang cố khớp cách Word ngắt dòng mà lại tự đo chữ bằng tay.

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Kích thước | Phụ thuộc | Chạy trong WebView2 không Node? | Phán quyết |
|---|---|---|---|---|---|---|
| **`harfbuzzjs`** | **1.6.4** (npm **22/10/2026**; commit repo **27/10/2026**, Khaled Hosny) | **MIT** — đọc từ `LICENSE` repo harfbuzzjs ("The harfbuzzjs project authors", 2019-2026). Lõi HarfBuzz: đọc từ `COPYING` của harfbuzz/harfbuzz → giấy phép **"Old MIT"**, permissive, **không có điều khoản copyleft**, chỉ yêu cầu giữ thông báo bản quyền + 2 đoạn miễn trách | **1.321.408 B (~1,3 MB)** | **0 phụ thuộc runtime** | **Được.** `exports` có mục `./dist/*.wasm` → nạp WASM từ file local, không cần CDN, không cần Node | **NHẬN — thư viện giá trị cao nhất trong toàn báo cáo.** Cho ta advance chính xác từng glyph + cluster → (a) **xếp dấu thanh/dấu phụ tiếng Việt** đúng kể cả khi font dùng GSUB/GPOS cho dấu chồng, (b) **đo chữ đúng** — vốn là nguyên nhân gốc của lệch ngắt dòng so với Word. Không có cách tự viết nào rẻ hơn. |
| `opentype.js` | **2.0.0**, **06/05/2026** | **MIT** — đọc từ `LICENSE` repo (Frederik De Bleser, 2020) | **3.642.174 B (~3,6 MB)** | **0 phụ thuộc runtime** | Được (JS thuần) | **NHẬN nhưng vai trò hẹp**: đọc metric font (`unitsPerEm`, ascent/descent, hhea/OS/2), kerning cơ bản, kiểm tra font nhúng. Shaping của nó **yếu hơn** HarfBuzz với dấu phụ phức tạp. Dùng cùng HarfBuzz, không thay. |
| `fontkit` | **2.0.4**, 09/08/2024 | **MIT** — đọc từ `LICENSE` repo (Devon Govett, 2014-nay). **Không** có điều khoản phi thương mại hay dual-licence | **5.610.637 B (~5,6 MB)** | 9 gói (`brotli`, `unicode-trie`, `restructure`, `dfa`, `unicode-properties`, …) | Có trường `browser: dist/browser.cjs` | **Phương án dự phòng.** Có làm GSUB/GPOS thật (khác `opentype.js`), nhưng đã 15 tháng không release và kéo 9 phụ thuộc. Nếu nạp WASM trong WebView2 gặp trở ngại thì đây là lưới an toàn; ngược lại chọn HarfBuzz. |
| **`linebreak`** | **2.0.0**, npm **03/11/2026** (rất mới) | **MIT** — đọc từ `LICENSE` repo foliojs/linebreak (Devon Govett) | **37.361 B (~37 KB)** | 1 gói (`unicode-trie`, MIT) | Được | **NHẬN — rẻ nhất, chắc nhất.** Cài đặt **UAX#14** chuẩn, trả về tập **vị trí được phép ngắt**. Word còn thêm luật riêng lên trên, nhưng khởi điểm từ tập UAX#14 đúng sẽ xoá sạch một lớp bug ngắt dòng. 37 KB. |
| `icu4x` | — | **Unicode-3.0** — đọc từ `LICENSE` repo unicode-org/icu4x ("UNICODE LICENSE V3", permissive, không copyleft; lưu ý phần dẫn xuất ICU4C/ICU4J của IBM 1995-2016) | lớn | — | **Không** — là Rust; muốn dùng phải thêm toolchain Rust + build WASM | **KHÔNG, ở thời điểm này.** Giấy phép sạch nhưng thêm Rust vào build system = phải "Stop and ask" theo AGENTS.md §11. `linebreak` + HarfBuzz đã phủ nhu cầu. Chỉ xét lại nếu cần collation/segmentation ICU đầy đủ. |
| `uharfbuzz` (Python) | **0.57.0** (ngày: CHƯA KIỂM — trang PyPI 2,8 MB bị cắt; bánh xe `win_amd64` có ở các bản cũ, cần xác minh cho 0.57.0) | **Apache-2.0** — đọc từ `LICENSE` repo harfbuzz/uharfbuzz; PyPI `info.license = Apache License 2.0` | wheel theo nền tảng | — | Python (không phải pure-Python wheel) | **NHẬN cho runner audit Python.** Cùng một HarfBuzz, dùng được headless trong CI để đo chữ mà không cần mở WebView2. |
| `fontTools` | 4.x | **MIT** — đọc từ `LICENSE` repo fonttools/fonttools (Just van Rossum, 2017) | — | Python thuần | Python | **NHẬN.** Soi bảng font: trả lời "subset font nhúng còn đủ glyph tiếng Việt không?" — câu hỏi ta sẽ phải trả lời khi audit PDF/DOCX. |
| `uniseg` (Python) | **0.10.1**, **09/01/2026** | **MIT** theo classifier PyPI (`info.license` để trống; có file LICENSE trong gói). **CHƯA KIỂM** từ file | nhỏ | Python thuần | Python | **NHẬN.** UAX#14 + UAX#29 phía Python, cặp với `linebreak` phía JS để hai bên cùng một luật. |

### C.1 Riêng về tiếng Việt

- Vấn đề thật không phải "có font hay không" mà là **thứ tự và vị trí dấu**: `ò` có thể là U+00F2 (dựng sẵn) hoặc `o` + U+0300 (dấu tổ hợp); văn bản thật trộn cả hai. Cộng thêm dấu nguyên âm + dấu thanh chồng (`ế`, `ộ`, `ữ`) = dấu chồng hai tầng.
- **HarfBuzz giải quyết phần hiển thị/đo** (nó áp dụng `ccmp/GSUB/GPOS/mark/mkmk` của font).
- **NFC hoá đầu vào** ta đã có (`platform/keyboard/input-normalizer.js`, `platform/text/vi-syllable.js`). Giữ nguyên.
- Tranh luận chính tả "hoà/hòa" (vị trí dấu thanh trên `oa/oe/uy`) là vấn đề **chuẩn mực**, không phải thư viện — phải là tuỳ chọn trong app, không copy từ bất kỳ thư viện nào.

---

## D. So sánh (diff) và kiểm chứng độ trung thực

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Kích thước / phụ thuộc | Node bắt buộc? | Phán quyết |
|---|---|---|---|---|---|
| **`xmldiff`** (Python) | **3.0**, **11/06/2026** | **MIT** — PyPI `info.license = MIT`; repo Shoobx/xmldiff `LICENSE.txt` đã đọc: MIT, "Xmldiff Contributors 2018" | nhỏ; phụ thuộc `lxml` (**BSD-3-Clause, CHƯA KIỂM từ file**) | Không (Python) | **NHẬN.** Diff **theo cây**, sinh "edit script" (node bị *di chuyển* vs bị *đổi*). Thay thế việc ta đang so sánh XML OOXML bằng text/regex — vốn báo động giả rất nhiều vì OOXML cho phép đổi thứ tự thuộc tính. Đặc biệt khớp với bài học "anchor paragraph position" trong memory. |
| **`pixelmatch`** | **8.0.0** | **ISC** — đọc từ `LICENSE` repo mapbox/pixelmatch (Mapbox, 2025) | **36.795 B (~36 KB)**; 1 phụ thuộc (`pngjs`) | Có thể chạy trong browser trên `ImageData` → **không cần Node** | **NHẬN.** So ảnh trang, có chống răng cưa. Nhỏ, dễ kiểm toán. |
| **`odiff` / `odiff-bin`** | `odiff-bin` **4.5.0**, **23/07/2026** | **MIT** *theo README repo dmtrKovalenko/odiff* ("licensed under the terms of MIT license"). **CHƯA KIỂM** — không tìm thấy `LICENSE`/`LICENSE.md` ở nhánh `main` (404). **Phải xác minh trước khi merge.** | binary tự chạy theo nền tảng | **Không** — là **binary độc lập**; gói npm chỉ là wrapper | **NHẬN cho batch lớn.** Nhanh hơn `pixelmatch` nhiều bậc → đúng cho lô LAN 696 file. Gọi binary từ Python bằng `subprocess` (không cần Node). |
| `resemblejs` | **5.0.0**, 06/06/2023 | **MIT** — đọc từ `LICENSE` repo rsmbl/Resemble.js (Huddle, 2013) | nhỏ | Browser/canvas | **Tuỳ chọn.** Phân tích phong phú hơn (bỏ qua antialias/màu), nhưng đã 3 năm không release. `pixelmatch` + `odiff` đủ. |
| `pdf.js` / `pdfjs-dist` | — (bản mới ra liên tục) | **Apache-2.0** — đọc từ `LICENSE` repo mozilla/pdf.js | lớn | **Không** — chạy trong WebView2 | **NHẬN.** Render **cùng một engine** cho PDF do LO xuất và PDF do Word xuất → rồi `pixelmatch`. Loại bỏ nhiễu "hai bộ rasteriser khác nhau". |
| `pypdfium2` | **5.14.0** (ngày: CHƯA KIỂM — trang PyPI 1,5 MB bị cắt) | **Apache-2.0 HOẶC BSD-3-Clause** cho phần binding; **PDFium** = giấy phép kiểu BSD; tài liệu/ví dụ **CC-BY-4.0**. Đọc từ trang repo pypdfium2-team + `LICENSES/Apache-2.0.txt` (đã xác nhận là toàn văn Apache 2.0) | wheel theo nền tảng (**không** pure-Python; nếu không có wheel thì phải build PDFium → cần compiler) | Không (Python) | **NHẬN cho runner audit Python**, nhưng kèm **nghĩa vụ**: bản phân phối nhị phân **phải kèm thư mục `BUILD_LICENSES/`**; một số bản còn link `libgcc` → phải kiểm. Nếu chỉ dùng trong CI (không ship), nghĩa vụ này nhẹ. **Không ship vào installer** cho đến khi rà xong giấy phép phụ thuộc. |
| Word/Excel/PowerPoint qua COM | — | Giấy phép của Microsoft, chỉ dùng trên máy đã có Office | — | — | **Vẫn là chuẩn vàng duy nhất.** Mọi thư viện ở trên chỉ **giảm số lần cần COM**, không thay COM. Hiện Excel COM đang bị chặn → đó chính là lý do mục B/D đáng làm ngay. |

---

## E. Model tài liệu / rich-text — **ngưỡng để thay thế là rất cao, và không gói nào vượt được**

Nói thẳng trước: **VN Writer đã có editor chạy được, đã có độ trung thực đo được, đã có bộ golden**. Thay model tài liệu bằng bất kỳ framework nào dưới đây là **viết lại nhiều tháng** với **chắc chắn mất độ trung thực đã đạt** — vi phạm trực tiếp nguyên tắc "không bao giờ mất kết quả đã đạt" trong memory (03/10). Dưới đây chỉ là khảo sát để **loại**, cộng một ngoại lệ hẹp.

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Phán quyết |
|---|---|---|---|
| `prosemirror-model` | **1.25.12**, 21/09/2026 | **MIT** — đọc từ `LICENSE` repo ProseMirror/prosemirror-model (Marijn Haverbeke và cộng sự, 2015-2017) | **Không thay.** Schema của ProseMirror rất tốt nhưng là schema *của ProseMirror*, không phải của OOXML. Chuyển đổi hai chiều OOXML↔PM lại là một tầng mất mát mới. |
| `lexical` | **0.53.0**, 28/10/2026 | **MIT** — đọc từ `LICENSE` repo facebook/lexical (Meta Platforms) | **Không thay.** Hoạt động mạnh nhất nhóm này, nhưng vẫn là model DOM-centric, không có khái niệm section/numbering/anchor của Word. |
| `slate` | — | **MIT** — đọc từ `License.md` repo ianstormtaylor/slate (2016-2023) | **Không thay.** |
| `quill` | — | **BSD-3-Clause** — đọc từ `LICENSE` repo slab/quill (Slab 2017-2024, Jason Chen 2014, salesforce.com 2013) | **Không thay.** Delta model quá phẳng cho Word. |
| **`yjs`** | **13.6.33**, 23/09/2026 | **MIT** — đọc từ `LICENSE` repo yjs/yjs (Kevin Jahns; Chair of CS 5, RWTH Aachen) | **Giữ trên kệ cho tính năng cộng tác tương lai — và CHỈ thế.** Y.js là CRDT *bổ sung* (thêm `Y.XmlFragment`/`Y.Text` cạnh model hiện có), không bắt ta đổi model. Là lựa chọn đúng nếu/khi ta làm đồng biên tập. Không chạm vào trước khi Writer/Sheet đạt chuẩn. |
| `@automerge/automerge` | — | **MIT** — đọc từ `LICENSE` repo automerge/automerge ("The Automerge contributors", 2019-2021) | **Không.** Lõi Rust/WASM, nặng hơn Y.js, hệ sinh thái nhỏ hơn cho văn bản. |
| `chainpad` | **5.3.2**; trường `license` npm = **LGPL-2.1**; bản **≤ 5.2.7 là AGPL-3.0** | npm metadata (repo `xwiki-contrib/chainpad`). **CHƯA KIỂM** từ file LICENSE (không tìm được ở `cryptpad/chainpad@main`) | **LOẠI.** LGPL = copyleft cần sign-off; lịch sử AGPL làm rủi ro pháp lý cao; và nó là **giao thức đồng bộ**, không phải model tài liệu → không giải quyết vấn đề nào ta có. Nếu cộng tác: dùng Y.js (MIT). |

---

## F. Chính tả / ngữ pháp tiếng Việt

### F.1 Máy kiểm tra — **đã sạch về pháp lý, ngạc nhiên thú vị**

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Phán quyết |
|---|---|---|---|
| **`hunspell`** (lõi C++) | **v1.7.6** (trang releases ghi 26/10; **năm: CHƯA KIỂM**) | **Tri-licence** — đã đọc **cả ba** file ở gốc repo hunspell/hunspell: `COPYING` = **GPL-2.0**, `COPYING.LESSER` = LGPL-2.1, `COPYING.MPL` = **Mozilla Public License Version 1.1** (xác nhận là MPL **1.1**, không phải 2.0). README: *"licensed under LGPL/GPL/MPL tri-license"* | **ĐƯỢC DÙNG — nhận theo nhánh MPL-1.1.** Đây là phát hiện quan trọng: `package.json` của ta đã là **MPL-2.0**, nên nhánh MPL của Hunspell **tương thích và KHÔNG cần sign-off copyleft**. Phải ghi rõ trong NOTICE là ta nhận theo nhánh MPL-1.1. |
| `hunspell-asm` | **4.0.2** | **MIT** — npm `license: MIT`, repo kwonoj/hunspell-asm (*file LICENSE: CHƯA KIỂM*) | **Ứng viên mạnh cho WebView2.** 4.901.138 B (~4,9 MB), bản bind WASM. Chạy trong browser, không Node. Lưu ý: wrapper MIT nhưng **lõi Hunspell bên trong vẫn là tri-licence** → vẫn phải khai nhánh MPL-1.1. |
| **`spylls`** | **0.1.7**, 23/01/2022 | **MPL-2.0** — đọc từ `LICENSE` repo zverok/spylls (toàn văn MPL 2.0, Mozilla Foundation là license steward). PyPI `info.license` để trống nhưng description nói MPL 2.0 | **Ứng viên mạnh cho tiến trình Python.** Cài đặt **đầy đủ** `.aff`/`.dic` của Hunspell **bằng Python thuần** → không cần build native, chạy offline trong `main.py`, MPL-2.0 **khớp đúng giấy phép dự án**. Nhược: không cập nhật từ 2022 (nhưng định dạng Hunspell cũng đã đóng băng). |
| `nuspell` | — | **Mâu thuẫn nội bộ**: `COPYING` ở repo nuspell/nuspell là **GPL-3.0** (đã đọc), còn README ghi *"Licensed under GNU LGPL v3 or later"* | **LOẠI.** Dù hiểu theo cách nào cũng là copyleft, lại còn tự mâu thuẫn → rủi ro pháp lý không cần thiết. Dùng Hunspell (MPL-1.1) hoặc spylls (MPL-2.0). |
| `nspell` | **2.1.5**, 17/01/2021 | **MIT** — đọc từ `license` repo wooorm/nspell (Titus Wormer, 2016) | **Phương án JS thuần, nhỏ.** Tương thích Hunspell, không WASM, chạy mọi nơi. Cũ (2021) nhưng phạm vi hẹp nên ổn. Dự phòng nếu không muốn ship 4,9 MB WASM. |
| LanguageTool (ngữ pháp) | — | LGPL-2.1 (CHƯA KIỂM từ file) | **LOẠI.** Copyleft **và** hỗ trợ tiếng Việt gần như không có. Không có lựa chọn permissive nào cho **ngữ pháp** tiếng Việt — đây là khoảng trống thật, phải tự làm theo luật, không mua được bằng thư viện. |

### F.2 Dữ liệu từ điển — **đây mới là vấn đề thật**

Hiện tại ta có **2.798 token** (CC0, từ Mozilla Common Voice) + quy tắc ghép vần tự viết. Quá ít.

| Nguồn | Số mục | Giấy phép (nguồn đã kiểm) | Phán quyết |
|---|---|---|---|
| **`undertheseanlp/UVD-1`** (Hugging Face) | **72.547** dòng (split `train`), ~984 KB | **Apache-2.0** — trang dataset nói rõ *"The dataset is released under Apache 2.0"*, metadata cũng `apache-2.0`. Tiền nhiệm `UTS_Dictionary` (nay đã đổi tên) cũng apache-2.0 | **ỨNG VIÊN SỐ 1 — nhưng phải audit nguồn gốc trước khi merge.** Nếu đúng Apache-2.0 và không phái sinh từ dữ liệu copyleft, nó đưa ta từ 2.798 → ~72.000 mục trong một bước. **Bắt buộc:** truy xuất nguồn (nếu scrape từ Wiktionary = CC-BY-SA, hoặc từ danh sách Hồ Ngọc Đức = GPL, thì nhãn Apache-2.0 **không chữa được**). Giao cho người phụ trách pháp lý xác nhận, không tự quyết. |
| Mozilla Common Voice (vi) — **tiếp tục khai thác** | snapshot 2022 của ta: 5.711 câu → 2.798 token. Kho hiện tại **lớn hơn nhiều** | **CC0-1.0** — đã ghi trong `platform/text/dictionaries/LICENSES-vi.txt` của ta, trỏ tới file LICENSE của `server/data` | **LÀM NGAY, rủi ro bằng 0.** Chỉ cần chạy lại đúng script sinh từ snapshot mới: cùng giấy phép CC0, cùng quy trình tái lập, vốn từ tăng miễn phí. Rẻ nhất trong toàn báo cáo. |
| `dictionary-vi` (wooorm) | — | **GPL-2.0** — theo bảng trong README repo wooorm/dictionaries; repo bọc là MIT nhưng README nói rõ *"each index.dic and index.aff file still has its original license!"*. (**CHƯA KIỂM** từ file giấy phép của chính từ điển) | **LOẠI / cần sign-off.** |
| Danh sách Hồ Ngọc Đức (tổ tiên của gần như mọi từ điển vi_VN) | ~47k–75k tuỳ bản | **GPL** — `README_vi_VN.txt` (bản mirror của Chromium) ghi: *"Copyright Terms: GPL (see the file Copyright for the exact terms)"*. Tác giả còn yêu cầu gửi lại các sửa đổi | **LOẠI.** Đây cũng chính là nguồn của từ điển vi_VN trong **LibreOffice**, **Chromium**, add-on Firefox, `duyet/vietnamese-wordlist` (GPL-2.0), `hunspell-vi` (các bản đóng gói ghi GPL+/GPLv2/GPL3 — không nhất quán). **Kiểm tra bổ sung đề nghị:** rà xem bản LibreOffice ta bundle có kèm `vi.dic/vi.aff` không — nếu có thì ta **đang phân phối dữ liệu GPL** cùng sản phẩm MPL-2.0 và đó là việc phải báo người phụ trách. (Lần kiểm này không tìm thấy LibreOffice ở đường dẫn mặc định trên máy nên **CHƯA KIỂM**.) |
| Wiktionary tiếng Việt (dump) | rất lớn | CC-BY-SA 4.0 | **LOẠI.** Share-alike lan sang cơ sở dữ liệu phái sinh. |
| Norsk–vietnamesisk ordbok (Thư viện QG Na Uy) | — | **CC-BY-NC-ND** | **LOẠI tuyệt đối.** Phi thương mại **và** không cho phái sinh. |
| `vwr` (R package, 47.966 từ) | 47.966 | CHƯA KIỂM | Chỉ xét nếu UVD-1 thất bại phần audit nguồn gốc. |

---

## G. Hạ tầng test / tự động hoá (rút ngắn vòng lặp audit)

| Gói | Phiên bản / ngày | Giấy phép (nguồn đã kiểm) | Node? | Phán quyết |
|---|---|---|---|---|
| `playwright` | (phiên bản: CHƯA KIỂM) | **Apache-2.0** — đọc từ `LICENSE` repo microsoft/playwright (Microsoft Corporation; phần của Google Inc. 2017) | **Có, Node-only** | **Giữ ở `tests/` đúng như luật hiện hành.** Ta đã dùng CDP; Playwright chỉ bổ trợ, không được rò vào app thật. |
| **`fast-check`** | (phiên bản: CHƯA KIỂM) | **MIT** — đọc từ `LICENSE` repo dubzzz/fast-check (Nicolas Dubien, 2017) | Có (test) | **NHẬN — đòn đáng giá nhất của mục G.** Property-based testing: **sinh ngẫu nhiên AST công thức** rồi đối chiếu máy của ta vs Excel COM / `xlcalculator`. Thay cho việc viết ca test bằng tay từng batch. Cũng là cách đúng để tìm lại họ lỗi "làm tròn phá giá trị" trong memory 05/09. |
| **`hypothesis`** | (phiên bản: CHƯA KIỂM) | **MPL-2.0** — repo HypothesisWorks/hypothesis `LICENSE.txt` đã đọc: *"released under the Mozilla Public License v 2.0"* (một phần code bên thứ ba giữ giấy phép riêng) | Không (Python) | **NHẬN.** Vai trò tương đương phía Python, và MPL-2.0 **khớp giấy phép dự án**. Dùng để fuzz: parser OOXML, mô hình chiều cao dòng Excel, đường lưu file. |
| `xmldiff`, `pixelmatch`, `odiff`, `pypdfium2` | xem mục D | xem mục D | — | Cùng thuộc bộ "rút ngắn vòng lặp audit". |
| So sánh Office headless | — | — | — | **Không tồn tại hợp pháp & permissive.** Mọi "headless Office" đều là (a) COM trên máy có Office, (b) LibreOffice, hoặc (c) sản phẩm trả phí. Không có đường tắt. |

---

## TOP 8 THEO THỜI GIAN TIẾT KIỆM ĐƯỢC

Ước lượng tính theo đơn vị **tuần-người**, dựa trên khối lượng mã hiện có trong repo (xem mục 0) và giả định một agent làm việc toàn thời gian.

| # | Thư viện | Thay thế / tăng tốc việc gì | Tuần tiết kiệm (ước lượng) | Phán quyết giấy phép | Rủi ro tích hợp |
|---|---|---|---|---|---|
| 1 | **`harfbuzzjs` 1.6.4** (+ `uharfbuzz` cho Python) | Tự viết đo chữ & xếp dấu tiếng Việt; nguyên nhân gốc lệch ngắt dòng vs Word | **6–10** | **MIT** (wrapper) + **"Old MIT"** (lõi HarfBuzz), đã đọc file, **không copyleft** → nhận ngay, không cần sign-off | **Trung bình** — phải nạp `.wasm` từ file local trong WebView2 (CSP, đường dẫn `file:`/scheme tuỳ biến); 1,3 MB vendor; cần một lớp adapter trong `platform/fonts/` để UI không gọi trực tiếp |
| 2 | **`undertheseanlp/UVD-1`** (dữ liệu) | Tự xây danh sách ~70k từ tiếng Việt bằng tay | **4–8** | **Apache-2.0** theo trang dataset — **nhưng phải audit nguồn gốc** trước khi merge | **Trung bình-cao** — rủi ro **pháp lý**, không phải kỹ thuật: nếu phái sinh từ GPL/CC-BY-SA thì nhãn Apache-2.0 vô hiệu. Dừng và hỏi người phụ trách |
| 3 | **`python-docx` + `python-pptx` + `openpyxl`** | Tự viết parser OOXML để audit; vòng lặp kiểm độ trung thực khi **không có Office COM** | **3–5** | **MIT** cả ba. `python-docx`/`python-pptx` đã đọc file LICENSE. `openpyxl`: **CHƯA KIỂM** từ `LICENCE.rst` (repo sau tường chống bot) → xác minh trước merge | **Thấp** — chỉ ở `tests/`/`scripts/audit-*`; tuyệt đối không vào đường lưu file (openpyxl phá chart/hình khi round-trip) |
| 4 | **`docx` (dolanmiu) + `XlsxWriter` + `pptxgenjs`** | Sinh fixture đối kháng mà **không cần Word/Excel COM** (Excel COM đang bị chặn) | **2–4** | **MIT / BSD-2-Clause / MIT**, đã đọc cả ba file LICENSE | **Thấp** — chỉ test; `docx` và `pptxgenjs` là Node → đúng luật "Node chỉ cho test"; `XlsxWriter` là Python nên chạy được cả trong runner audit |
| 5 | **`xmldiff` 3.0** | Tự viết so sánh XML OOXML bằng text/regex (nhiều báo động giả) | **2–3** | **MIT**, đã đọc `LICENSE.txt`. Phụ thuộc `lxml` BSD-3-Clause (**CHƯA KIỂM** từ file) | **Thấp** — thêm `lxml` (có wheel sẵn cho Windows); chỉ dùng trong CI |
| 6 | **`linebreak` 2.0.0** (+ `uniseg` cho Python) | Tự cài UAX#14 | **2–4** | **MIT**, đã đọc file. `uniseg`: MIT theo classifier, **CHƯA KIỂM** từ file | **Rất thấp** — 37 KB, 1 phụ thuộc, JS thuần, chạy thẳng trong WebView2 |
| 7 | **`odiff` + `pypdfium2` + `pixelmatch`** | So ảnh trang ở quy mô kho LAN (696 file) | **2–3** | `pixelmatch` **ISC** (đã đọc). `odiff` **MIT** *theo README* — **CHƯA KIỂM** từ file. `pypdfium2` **Apache-2.0/BSD-3** (đã đọc Apache-2.0 trong `LICENSES/`), PDFium kiểu BSD | **Trung bình** — `pypdfium2` là wheel nhị phân và **bản phân phối nhị phân phải kèm `BUILD_LICENSES/`**; nếu chỉ ở CI thì nhẹ. Chưa ship vào installer |
| 8 | **`fast-check` + `hypothesis`** | Viết tay từng batch ca test công thức | **2–3** | **MIT** (đã đọc) và **MPL-2.0** (đã đọc) — MPL khớp giấy phép dự án | **Thấp** — chỉ test; cần một oracle (COM hoặc `xlcalculator`) để so, nên phụ thuộc vào việc mở lại Excel COM |

**Đề cử bổ sung (ngoài top 8, vẫn nên làm):**
- **`spylls` (MPL-2.0) hoặc `hunspell-asm` (MIT + nhánh MPL-1.1 của Hunspell)** — nâng máy chính tả lên chuẩn `.aff/.dic` thật, ~2 tuần, rủi ro thấp. Pháp lý đã sạch (nhánh MPL), nghẽn duy nhất là **dữ liệu** (xem #2).
- **Chạy lại script CC0 Common Voice với snapshot mới** — gần như 0 rủi ro, 0 vấn đề pháp lý, tăng vốn từ ngay; nên làm **song song** với #2 để không bị chặn bởi audit pháp lý.
- **SheetJS CE (`xlsx`, Apache-2.0)** chỉ-đọc — mở được **41% kho LAN là .xls/.doc legacy** mà ta chưa test. Khoảng 1–2 tuần, nhưng phải vendor từ cdn.sheetjs.com (không còn trên npm).

**Tổng ước lượng nếu làm hết top 8: ~23–40 tuần-người**, phần lớn tập trung ở #1 và #2.

---

## BLACKLIST — trông hấp dẫn nhưng bị loại

| Thư viện / nguồn | Lý do cụ thể | Nguồn đã kiểm |
|---|---|---|
| **HyperFormula** | Dual-licence **GPLv3 / độc quyền**, và `LICENSE.txt` nói rõ *"The specific license under which you use the software is determined by the license key you apply."* → vi phạm **cả hai** ràng buộc (copyleft + licence key). Không dùng kể cả làm oracle. | Đã đọc `LICENSE.txt` của handsontable/hyperformula |
| **`@sheetxl/formulas` 0.7.27** | Trường `license` = `"SEE LICENSE IN <LICENSE>"`, homepage `sheetxl.com` → **sản phẩm thương mại**. Nguy hiểm vì README của `fast-formula-parser` chủ động đẩy người đọc sang đây. | npm `@sheetxl/formulas/latest` |
| **`pycel` 1.0b30** | **GPL-3.0** (toàn văn GPLv3 trong `LICENSE.txt`, classifier PyPI GPLv3) + chết từ 13/10/2021 | Đã đọc `LICENSE.txt` của dgorissen/pycel |
| **`formulas` (Python) 1.3.4** | **EUPL-1.1+** — copyleft mạnh, tương thích GPL. Cần sign-off; không đáng vì đã có `xlcalculator` (MIT) | Đã đọc `LICENSE.txt` repo; PyPI `info.license = "EUPL 1.1+"` |
| **Univer (toàn bộ suite)** | Lõi Apache-2.0 nhưng **biểu đồ, hình khối, pivot, SmartArt, chuyển đổi XLSX, Slides, Boards, cộng tác, lịch sử phiên bản** là module **thương mại riêng**, và README ghi *"Freemium evaluation includes watermarks and feature limits"* → đúng mô hình "open-core + add-on thương mại / free tier có watermark" mà ta cấm. Riêng `engine-formula` hợp pháp nhưng **40,7 MB** + kéo DI/RxJS → phá ranh giới lớp | Đã đọc `LICENSE` (Apache-2.0) + README của dream-num/univer |
| **`nuspell`** | `COPYING` = **GPL-3.0** nhưng README ghi *"LGPL v3 or later"* → **tự mâu thuẫn**; cả hai cách hiểu đều copyleft | Đã đọc `COPYING` + README repo nuspell/nuspell |
| **`dictionary-vi` (wooorm) 3.0.0** | Dữ liệu từ điển là **GPL-2.0** (repo bọc MIT không cứu được: *"each index.dic and index.aff file still has its original license!"*) | Bảng trong README repo wooorm/dictionaries |
| **Danh sách Hồ Ngọc Đức / `hunspell-vi` / `duyet/vietnamese-wordlist` / từ điển vi_VN của LibreOffice & Chromium / add-on Firefox** | **GPL** (README_vi_VN.txt: *"Copyright Terms: GPL"*); các bản đóng gói ghi GPL+/GPLv2/GPL3 **không nhất quán** → rủi ro kép. Tác giả còn yêu cầu gửi lại sửa đổi | `README_vi_VN.txt` trên mirror Chromium; trang gói của các distro |
| **Dump Wiktionary tiếng Việt** | **CC-BY-SA 4.0** → share-alike lan sang CSDL phái sinh của ta | Điều khoản Wikimedia |
| **Norsk–vietnamesisk ordbok (NB.no)** | **CC-BY-NC-ND** — phi thương mại **và** không cho phái sinh | Trang nb.no |
| **`chainpad`** | Trường `license` npm = **LGPL-2.1**; bản **≤ 5.2.7 là AGPL-3.0**. Copyleft + lịch sử AGPL + giải quyết sai vấn đề (là giao thức đồng bộ, không phải model tài liệu) | npm `chainpad/latest`; thảo luận xwiki-devs |
| **`exceljs` 4.4.0** | **Không** phải vấn đề giấy phép (MIT sạch). Loại vì **thực tế**: npm 19/10/2023, commit cuối 12/01/2024, 21,8 MB, 9 phụ thuộc Node-stream (`archiver`, `unzipper`) → không sạch cho browser và đã bỏ hoang | Đã đọc `LICENSE`; npm date; commit API |
| **`icu4x`** | Giấy phép **Unicode-3.0 sạch**, nhưng là **Rust** → thêm toolchain vào build system = "Stop and ask" theo AGENTS.md §11. Lợi ích không vượt `linebreak` + HarfBuzz | Đã đọc `LICENSE` repo unicode-org/icu4x |
| **Aspose.Words / Aspose.Cells / Spire.Doc / Syncfusion / DevExpress / GrapeCity GcExcel** | Trả phí, có licence key, bản "free" đóng **watermark** / giới hạn số dòng | Mô hình sản phẩm công khai của các hãng |
| **ONLYOFFICE Document Server / Collabora Online** | **AGPL-3.0** — AGPL lan cả qua mạng; tuyệt đối không | Giấy phép công bố của hai dự án |
| **PyMuPDF / `fitz`** | **AGPL** — đã là luật thường trực của dự án (memory: 3T Reader). Dùng `pypdfium2` thay thế | Luật dự án hiện hành |
| **`formula-parser` (Handsoncode)** | Giấy phép MIT sạch, nhưng đã bị HyperFormula thay thế, ít hàm, không có mô hình lỗi Excel đầy đủ → giá trị kỹ thuật thấp hơn `fast-formula-parser` ở mọi mặt | Đã đọc `LICENSE` repo handsontable/formula-parser |
| **LanguageTool (ngữ pháp)** | LGPL-2.1 (copyleft) **và** hỗ trợ tiếng Việt gần như bằng 0 → trả giá pháp lý mà không được gì | Giấy phép công bố; trạng thái hỗ trợ ngôn ngữ |

---

## Việc cần người phụ trách quyết (không tự làm)

1. **Audit nguồn gốc `UVD-1`** trước khi nhập 72.547 mục. Nhãn Apache-2.0 chỉ có giá trị nếu dữ liệu không phái sinh từ GPL/CC-BY-SA. → quyết định pháp lý.
2. **Rà xem bản LibreOffice ta bundle có kèm từ điển `vi.dic`/`vi.aff` (GPL) hay không.** Nếu có, ta đang phân phối dữ liệu GPL trong một sản phẩm MPL-2.0. Lần kiểm này **CHƯA KIỂM** được (không tìm thấy LibreOffice ở đường dẫn mặc định của máy).
3. **Chấp thuận nhận Hunspell theo nhánh MPL-1.1** và ghi vào NOTICE (không cần sign-off copyleft, nhưng cần quyết định có chủ ý và văn bản hoá).
4. **`pypdfium2` chỉ ở CI hay ship vào installer?** Nếu ship thì phải kèm `BUILD_LICENSES/` và rà `libgcc`.
5. **Xác minh lại `openpyxl` và `odiff`** từ chính file giấy phép trước khi merge (cả hai hiện là **CHƯA KIỂM**).

## Danh sách CHƯA KIỂM (phải đóng trước khi merge)

- `openpyxl` — `LICENCE.rst` (repo foss.heptapod.net bị tường chống bot "Anubis"); hiện chỉ có metadata PyPI nói MIT.
- `odiff` — không tìm thấy `LICENSE`/`LICENSE.md` ở nhánh `main`; MIT chỉ theo README.
- `lxml` — chưa đọc file giấy phép (dự kiến BSD-3-Clause).
- `koala2` — chưa khảo sát.
- `hunspell-asm` — file LICENSE của wrapper chưa đọc (npm ghi MIT).
- `xlcalculator`, `pylightxl`, `uniseg`, `pyvi` — chỉ có metadata/classifier PyPI, chưa đọc file.
- Ngày phát hành: `playwright`, `fast-check`, `hypothesis`, `XlsxWriter` 3.3.1, `pypdfium2` 5.14.0, `uharfbuzz` 0.57.0 (trang PyPI JSON bị cắt), `hunspell` v1.7.6 (thiếu năm).
- `dictionary-vi` — GPL-2.0 chỉ theo bảng README của repo bọc, chưa đọc giấy phép của chính file từ điển.
- Bánh xe `win_amd64` cho `uharfbuzz` 0.57.0 và `pypdfium2` 5.14.0 — chưa xác nhận.
- Khoảng trống hàm VN Sheet (`SEQUENCE`, `XMATCH`, `RANDARRAY`, `TEXTSPLIT`, `NA`) — kết luận từ grep token, **chưa chạy test xác nhận**.
