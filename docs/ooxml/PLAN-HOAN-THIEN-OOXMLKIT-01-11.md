# Kế hoạch hoàn thiện OOXMLKit — 01/11/2026

## 1. Mục tiêu và phạm vi

Hoàn thiện OOXMLKit thành lõi đọc, sửa và ghi DOCX/XLSX/PPTX theo lộ trình W0–W6 đã chốt ở mức kiến trúc: xử lý trực tiếp gói OOXML, giữ nguyên byte mọi phần không sửa, xác minh lại sau lưu, và thay dần đường I/O qua LibreOffice sau khi từng cổng parity đạt. Kế hoạch này giao việc cho Muse (thư viện Swift), Codex Windows (tích hợp app và kiểm chứng Windows), và Mac (tích hợp riêng nền tảng); không sửa mã trong phiếu lập kế hoạch này.

Thứ tự giá trị sản phẩm: xử lý lỗi schema/an toàn đang mở trước; sau đó ưu tiên lớp lưu XLSX W3; tiếp đến công thức XLSX G2 và lưu DOCX/PPTX; rồi lớp mở W5, parity đầy đủ, hiệu năng và quyết định W6. Chưa gỡ LibreOffice khỏi đường mặc định trước khi các cổng tương ứng đạt.

## 2. Hiện trạng theo bằng chứng

### 2.1. Kiến trúc và tích hợp hiện có

| Khả năng | Mã hiện có / điểm kiểm tra | Trạng thái và giới hạn |
|---|---|---|
| ZIP/OPC, XML, giữ nguyên part không đổi | `ports/ios/OOXMLKit/Sources/OOXMLZip/ZipArchive.swift`; `OOXMLPackage/OPCPackage.swift:43-57,331-360`; `OOXMLPackage/XML.swift`; `OOXMLPackage/Relationships.swift` | Có đọc/ghi package, validation trì hoãn tùy chọn, ZIP passthrough cho entry không sửa, traversal/DTD guard. `ZipLimits` mặc định vẫn cho phép 1 GiB mỗi entry và 4 GiB tổng giải nén (`ZipArchive.swift:44-57`), cần quyết định ngưỡng portable và chứng minh giới hạn đi xuyên toàn API. |
| XLSX: đọc/sửa/lưu model | `OOXMLSpreadsheet/Workbook.swift`; `Worksheet.swift`; `RowOperations.swift`; `ColumnOperations.swift`; `Styles.swift`; `SharedStrings.swift`; `OOXMLBridge/OOXMLBridge.swift:80-110,470-610` | Có workbook/worksheet, cell value/formula, style, merge, hàng/cột, sheet, freeze panes, tab color và print area. Có fixture thật cho công thức, validation, pivot, chart, ẩn/lọc, nhưng fixture presence không chứng minh API sửa các tính năng đó. Chart/pivot/conditional formatting/data validation/hyperlink/theme và print settings còn thiếu API sửa tương ứng theo mapping. |
| XLSX: công thức | `OOXMLSpreadsheet/Formula/*`; `FormulaRewriter.swift`; `FormulaWorkbookBridge.swift` | Có tokenizer/parser/evaluator, dependency/recalc và các hàm cơ bản. Chưa đạt parity công thức G2: array/dynamic array, SUMPRODUCT, XLOOKUP, LET, tham số rỗng, tham chiếu toàn cột `A:A`, nhóm hàm TEXT/ngày theo locale và tương đương xử lý Excel. Không được nhầm tính được công thức với đọc/ghi file. |
| DOCX: đọc/sửa/lưu model | `OOXMLWord/WordDocument.swift`; `WordDocumentModel.swift`; `WordText.swift`; `Revisions.swift`; `OOXMLBridge/OOXMLBridge.swift` | Có sửa/đọc văn bản, đoạn, style/runs, revisions và bridge delta-save. Có fixture thật cho header/footer, footnotes, comments, image, tables, track changes. Còn thiếu hoặc chưa đủ API chỉnh sửa numbering đa cấp, field (TOC/TOF/PAGE/SEQ), section properties và link-to-previous, core properties, text effects/run spacing, tạo/sửa footnote/comment/revision/watermark. Giữ nguyên part cũ không đồng nghĩa người dùng có thể sửa các đối tượng đó. |
| PPTX: đọc/sửa/lưu model | `OOXMLPresentation/Presentation.swift`; `Slide.swift`; `DrawingText.swift`; `OOXMLBridge/OOXMLBridge.swift:112-115,399` | Có slide/text, di chuyển/xóa, ghi chú, sections/theme override và passthrough nội dung chưa sửa. Còn thiếu API chỉnh sửa transition/animation/media-loop, theme color/font, show settings đúng schema, embedded fonts và một số drawing/connector. |
| Bridge/engine | `OOXMLBridge/OOXMLBridge.swift`; `Sources/ooxml-engine/main.swift`; `docs/ooxml/ENGINE-PROTOCOL.md` | JSON Lines và open/info/close/save/export cùng nhóm thao tác app đã có. Protocol chưa khớp toàn bộ operation hiện có; cần kiểm từng `case` của bridge, không suy ra contract từ tên API. |
| Desktop Windows | `docs/PLAN-OOXMLKIT-WINDOWS.md`; `docs/ooxml/PLAN-W3-XLSX-SAVE-LAYER.md` | W1 chưa có bằng chứng build/test Windows thật. W3 còn là kế hoạch: đường lưu hiện vẫn qua FODS → `soffice` → `ooxml_zip_patch.py`; cờ engine chưa phải tính năng được tích hợp. `main.py` phải tự khởi chạy/quản lý engine trong app offline. |
| Thay thế LibreOffice tổng thể | `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md`; `docs/PLAN-OOXMLKIT-WINDOWS.md` | OOXMLKit là lớp I/O, không phải layout/render/PDF hay bộ chuyển đổi định dạng cũ. W6 cần giữ quyết định rõ ràng về PDF và DOC/XLS/PPT/ODF; chưa thể coi hoàn tất thư viện là đã thay toàn bộ LibreOffice. |

### 2.2. Số liệu test đã chạy trong worktree này

- Lệnh: `powershell -NoProfile -File E:\VNOffice-briefs\run-swift-wsl.ps1 E:\VNOffice-codex-libplan`.
- Kết quả thực tế: **204 test, 0 failures**, 43.763 giây, WSL Ubuntu; exit code 0. Suite có `OfflineGuaranteeTests` theo danh mục nguồn, nhưng runner chỉ in các dòng `Executed`, `error`, `failed`, `Test Suite`; không xuất riêng số test OfflineGuarantee.
- Compiler warnings: **NOT RUN / không kết luận được** — runner lọc output nên không thể xác nhận không có warning.
- Đối chiếu snapshot khác: `docs/REVIEW-CODEX-OOXMLKIT-31-10.md` ghi `origin/vn-main` 4c7da4c8 = 204/204; nhánh Muse `muse/ooxmlkit-numbering-2510` 1354d7ec = 232/232; review hai commit nhánh đó cho thấy 4 rủi ro dưới đây. Worktree hiện tại là `main` tại 11b736bf, không phải snapshot 1354d7ec. Không gộp các số test khác snapshot thành một con số.

### 2.3. Trạng thái nhánh Muse và độ tin cậy của báo cáo

Đã chạy `git fetch origin`. Có `origin/muse/ooxmlkit-numbering-2510` tại `1354d7ec` và `origin/muse/ooxmlkit-bridge-2510` tại `85930ee2`; không có ref local/remote `muse/ooxmlkit-directive-3110` trong lần kiểm tra này. Vì vậy số **244/244, HEAD 9f9f061** được nhắc trong yêu cầu được ghi là **báo cáo được chuyển tiếp, chưa xác minh**; không dùng làm baseline nghiệm thu. Trước khi giao nhánh sửa, Muse cần cung cấp ref/commit truy cập được và đầu ra lệnh test tương ứng. Nhánh numbering đã chứa bridge, nên chỉ tích hợp một lần theo ancestry sau review.

### 2.4. Vấn đề sai lệch trong mapping phải sửa trước khi dùng làm bộ đếm

`docs/ooxml/PATCH-TO-OOXMLKIT-MAPPING.md` mô tả 217 hàm lớn. Bảng overview ghi “37” hàm cần API mới nhưng ghi tổng ở cột kế là 47; phân bổ chi tiết là Sheet 21 + Writer 18 + Slides 8 = **47 hàm**. Bảng hàng chi tiết cũng có 47 hàng “Cần API mới”, trong khi một số hàng cùng yêu cầu một API (ví dụ các bước khôi phục TOC/TOF/PAGE/SEQ cùng quy về field API). Do đó 37 hiện chỉ có thể được coi là số nhóm API/capability dự kiến, không phải số hàng đã kiểm chứng: mapping cần thêm cột `patch function count`, `distinct API capability`, `owner`, `status`, `test evidence`, rồi reconcile đến tổng 217 trước khi dùng để đóng việc. Tỷ lệ đúng theo số hàng hiện có là 169/217 hết cần, 47/217 cần API mới, 1/217 còn cần tạm thời cho xuất `.doc` cũ.

### 2.5. Findings review 31/10 cần xử lý có trạng thái chính xác

| Mức xác nhận | Finding và bằng chứng | Hành động |
|---|---|---|
| CONFIRMED | `Presentation.swift:46-84` ghi `p:presentationPr`/`p:showSettings` vào `ppt/presentation.xml`; schema yêu cầu part `presProps.xml`, root `presentationPr`, child `showPr`. Test `PresentationRoundTripTests.swift:9-24` khẳng định chính XML sai nên không bắt được. | Sửa part/relationship theo schema; test độc lập đọc ZIP/XML, kiểm đúng part, QName, thứ tự schema và consumer độc lập. |
| PLAUSIBLE | `WordDocumentModel.swift:388-409`: ngắt link-to-previous chỉ tìm section liền trước; có thể sao chép rỗng khi section liền trước cũng kế thừa. | Tái hiện 3 section, trong đó section 0 có header, section 1 kế thừa, section 2 ngắt link; kiểm nội dung sau save/reopen. |
| PLAUSIBLE | `WordDocumentModel.swift:296-323`: numbering nhận level 0…8 nhưng định nghĩa `singleLevel`, chỉ tạo một `w:lvl`, placeholder luôn `%1`. | Tái hiện level 2/đa cấp bằng consumer XML độc lập; hỗ trợ multilevel đúng hoặc giới hạn/định nghĩa rõ API trước khi phát hành. |
| PLAUSIBLE / security review | `WordDocument.swift:233-256`: field instruction chỉ trim/không rỗng; XML escaping không ngăn DDE/INCLUDETEXT/LINK. | Allowlist field an toàn; chặn lệnh nguy hiểm không phân biệt hoa thường và cách viết có whitespace/switch; lỗi trước khi đổi DOM; không tự cập nhật field khi mở. |
| CẦN XÁC MINH | `ZipLimits` mặc định 1 GiB/entry, 4 GiB tổng uncompressed; kiểm tra hiện tại cho thấy limit truyền qua các initializer OPC, nhưng cần xác minh từng loader DOCX/XLSX/PPTX, overflow và từ chối trước inflate. | Lập ma trận mọi constructor/đường mở, ZIP bomb tổng hợp; chọn ngưỡng portable dựa trên corpus fixture và đo RAM, không áp ngưỡng tùy tiện. |

Không gộp finding PLAUSIBLE thành lỗi đã xác nhận cho đến khi test tái hiện FAIL ở baseline và PASS sau sửa. Với baseline 1354d7ec, review cho biết `showSettings` bị test hiện hữu bỏ lọt; các ca section, numbering và field cần thêm test tái hiện cụ thể.

## 3. Khoảng trống theo mục tiêu sản phẩm

### 3.1. XLSX và công thức

1. **Ghi lại XLSX nguồn không mất dữ liệu (W3):** delta UI → protocol → OOXMLBridge → package mutation → staging output; chỉ bật cho XLSX nguồn hợp lệ và thao tác nằm trong allowlist. Thay đổi không sửa phải byte-identical toàn gói; khi sửa chỉ parts trong allowlist đổi. Cần fallback có đo đếm cho tài liệu mới, mật khẩu, op chưa hỗ trợ, timeout và lỗi reopen. Cờ mặc định tắt đến khi cổng parity đạt.
2. **API workbook còn thiếu theo mapping:** calculation options; print area cục bộ/toàn cục; tab color nếu chưa có bridge parity; conditional formatting; autofilter và filter criteria; validation; column width/row-column hidden; sheet view state; print/page setup; core properties; theme đọc/đổi; hyperlink; legacy CONCAT rewrite. Một phần API đã có trong model/bridge — mỗi capability phải được xác minh từ implementation hiện thời trước khi tạo việc trùng.
3. **Các đối tượng phức tạp:** chart, pivot table/cache, slicer, drawing/textbox và embedded media hiện chủ yếu phải passthrough. Chưa cho engine lưu nếu người dùng sửa đối tượng đó cho đến khi có API hoặc phát hiện out-of-scope đáng tin cậy và fallback.
4. **G2 công thức:** array/dynamic array; SUMPRODUCT; XLOOKUP; LET; omitted/blank argument; `A:A`/range toàn hàng; nhóm `TEXT` và locale/date; lỗi công thức/cycle/calc chain; cached values và dependency/recalc lớn. Chốt từng hàm theo corpus tổng hợp có expected từ oracle độc lập được duyệt, không tự sửa expected để xanh.

### 3.2. DOCX

- API sửa numbering đa cấp/indent/bullet; field an toàn (TOC/TOF/PAGE/SEQ và các field được duyệt); section properties (page size/margins/columns/header/footer refs); kế thừa/ngắt link-to-previous; header/footer; tables/images đang có cần ma trận sửa và round-trip chứ không chỉ giữ nguyên; footnotes/endnotes/comments/revisions/merge fields/watermark; core properties; line spacing và hiệu ứng chữ `w14`.
- Track changes hiện có API đọc/model; cần xác nhận riêng sửa/chấp nhận/từ chối revisions và byte allowlist. Không hứa hỗ trợ thao tác chỉnh sửa chỉ vì phần chưa đụng được passthrough.
- Field phải chặn DDE, DDEAUTO, INCLUDETEXT, INCLUDEPICTURE, LINK, DATABASE mặc định; không kích hoạt cập nhật field khi mở; lỗi không được làm thay đổi DOM.

### 3.3. PPTX

- Show settings theo `presProps.xml`/`showPr`; theme color/font read/write; transition; animation timing/effects/media loops; sections; embedded fonts; connectors/drawings/crop; notes/comments và shape text.
- Tạo/sửa tính năng cần sửa đúng relationships/content types và chỉ parts được phép thay. Các đối tượng chưa có editor phải được giữ nguyên byte, đồng thời không nhận thao tác giả thành công.

### 3.4. Nền tảng, chất lượng và bảo mật

- W1 build `ooxml-engine.exe` và chạy test trên Windows thật, ghi kích thước package/toolchain/warnings; WSL Swift chỉ là test thư viện, không thay thế W1.
- G1 đo lazy open/save, peak RSS và latency trên corpus tổng hợp; số đo Linux không được mô tả là số đo iOS/Windows.
- Zip bomb: entry count, compressed/uncompressed sizes, integer overflow, path traversal, encrypted/unsupported ZIP, malformed archive; XXE/DTD; tài liệu lỗi nguồn. Giới hạn phải từ chối trước inflate/cấp phát vượt hạn mức.
- Mở tài liệu Office 2016 và giữ nguyên cấu trúc phần không sửa là cổng parity, không phải tuyên bố hỗ trợ đầy đủ mọi đặc tính Office. Excel COM đang bị chặn: ghi BLOCKED và dùng LibreOffice/kiểm XML chỉ như oracle tạm; không đổi nhãn đó thành Office PASS.

## 4. Các gói việc giao tiếp

Mỗi gói là một phiếu/mục tiêu riêng, branch + worktree riêng theo owner, merge `main`/`origin/vn-main` trước khi code, commit riêng cho mỗi bước hoàn thành. Các bài hồi quy phải được viết/chạy FAIL trước khi sửa và PASS sau sửa trên cùng assertion; nếu baseline đã pass thì ghi “không tái hiện”, không tạo FAIL giả. Các test cấu trúc phải parse ZIP/XML độc lập với OOXMLKit; kiểm byte-identical các part ngoài allowlist. Không thêm dependency nếu chưa qua quyết định kiến trúc.

### L1 — Chặn lỗi schema và an toàn trước khi phát hành API

- **Chủ sở hữu:** Muse — `ports/ios/OOXMLKit/Sources/OOXMLPresentation/**`, `OOXMLWord/**`, `OOXMLZip/**`, tests tương ứng; Codex Windows kiểm lại tích hợp sau handoff.
- **Mục tiêu/API:** sửa `Presentation.setShowSettings` để ghi `presProps.xml`/`showPr`; xử lý section link inheritance; numbering đa cấp; field allowlist; hoàn tất audit truyền `ZipLimits` và chốt default/configurable policy bằng dữ liệu corpus.
- **Test bắt buộc:** trước/sau cho schema showPr, 3-section header, numbering level 2 và field blocklist; package độc lập xác nhận XML/relationship/content type; document không đổi khi op bị từ chối; ZIP bomb tổng hợp entry/aggregate/count/overflow từ chối trước inflate; RoundTrip chỉ cho parts cho phép đổi; OfflineGuaranteeTests.
- **Nghiệm thu:** không có XML show-settings sai schema; các test regression mới chứng minh bug hoặc ghi rõ finding không tái hiện; field nguy hiểm không thể tạo qua API mặc định; `ZipLimits` được áp dụng ở mọi loader; `swift test` tối thiểu đạt baseline tích hợp và warnings được xác nhận từ output đầy đủ.
- **Phụ thuộc/thứ tự:** đầu tiên; sau đó mới tích hợp một lần nhánh numbering (đã gồm bridge). Findings PLAUSIBLE chỉ được đóng bằng kết quả đo.

### L2 — Hoàn tất protocol/changelog và kiểm soát contract bridge

- **Chủ sở hữu:** Muse cập nhật protocol/changelog cùng commit API; Codex rà soát consumer Windows; Mac kiểm consumer macOS sau khi có snapshot ổn định.
- **Tệp/module:** `OOXMLBridge.swift`, bridge tests, `docs/ooxml/ENGINE-PROTOCOL.md`, `docs/sync/LIBRARY-CHANGELOG.md`.
- **API/op:** liệt kê chính xác switch hiện có, gồm các nhóm `doc.setSpacing`, `doc.setRunEffect`, numbering, fields, section/link, `slide.showSettings`/`slide.setShowSettings`, `slide.theme`, `sheet.rewriteLegacyConcat` và cấu hình sheet; cho mỗi op ghi tham số bắt buộc/tùy chọn/default, result, error code ổn định, ví dụ JSON Lines, save/reopen.
- **Test bắt buộc:** contract tests cho args thiếu/sai kiểu, op không hỗ trợ, path, reopen và trường hợp lỗi; kiểm operation docs so với switch source tự động hoặc checklist có bằng chứng. Giữ framing `{id,op,args}`/`{id,ok,result}` tương thích.
- **Nghiệm thu:** không còn tuyên bố “kiểm chứng 100%” nếu chưa có snapshot/lệnh/commit; không thiếu op public trong protocol; changelog ghi đúng commit, API semantics, lỗi, platform/toolchain, số test và warning.
- **Phụ thuộc/thứ tự:** sau khi API L1 ổn định; có thể làm song song phần kiểm kê protocol, nhưng entry cuối phải theo commit thực.

### L3 — W3: tích hợp lưu XLSX nguồn qua engine sau cờ (giá trị sớm nhất)

- **Chủ sở hữu:** Codex Windows tích hợp `main.py`, `platform/ooxml/**`, SheetAdapter/bridge theo ownership; Muse chỉ bổ sung API thư viện bị xác nhận thiếu. Không giao Muse sửa `main.py`/app.
- **Tệp/module:** `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/uno-bridge.js`, `main.py`, engine client/protocol, tests Windows/Sheet, bổ sung adapter layer đúng kiến trúc. UI không gọi OOXMLKit trực tiếp.
- **Ops:** delta allowlist cho value/formula/clear/format/merge/row-column/sheet/freeze/tab color/print area và những op L1 đã nghiệm thu; out-of-scope detection; open/edit/save/reopen; atomic replace; fallback/error reporting. Không cho phép chart/pivot/slicer/complex CF sửa đi qua engine khi chưa hỗ trợ.
- **Test bắt buộc:** trước/sau theo từng op; 27 workbook LAN và corpus OOXML tổng hợp; 28/28 fixture round-trip theo parity harness nơi dùng; no-op byte-identical; edit chỉ part allowlist đổi; đọc XML độc lập; reopen verification; forced timeout/engine failure/fallback; target gốc còn nguyên nếu verify lỗi; CDP app thật + screenshot và xem ảnh cho mọi màn hình/hộp thoại test. Excel COM **BLOCKED**, so sánh LibreOffice/OOXML độc lập được báo đúng oracle.
- **Nghiệm thu:** 27/27 workbook của cổng XLSX không mất dữ liệu theo định nghĩa test; mọi ca ngoài phạm vi đi fallback; không silent success; latency save đo cùng harness trước/sau; engine flag mặc định OFF cho đến khi owner duyệt cổng.
- **Phụ thuộc/thứ tự:** L1 và contract L2; đây là integration W3 đầu tiên sau khi API cốt lõi ổn định.

### L4 — G2: đóng khoảng trống công thức XLSX

- **Chủ sở hữu:** Muse cho evaluator Swift; Windows/Codex cho consumer bridge/cached-value parity; không sửa engine JS hiện hữu ngoài phiếu riêng.
- **Tệp/module:** `OOXMLSpreadsheet/Formula/**`, `FormulaRewriter.swift`, formula tests, protocol chỉ nếu op/response đổi.
- **API/op:** thêm từng cụm hàm (SUMPRODUCT; XLOOKUP; LET; array/dynamic array theo mức hỗ trợ chốt; omitted args; full column/row refs; TEXT/date/locale). Ghi rõ semantics/error/value cache; không tuyên bố tương thích Excel cho nhánh chưa kiểm.
- **Test bắt buộc:** mỗi cụm có test tái hiện, parser/evaluator tests, formula references/cycles/errors, round-trip XLSX, cached values/reopen, differential corpus với oracle được chỉ định. So sánh Office thật chỉ khi môi trường được phép; Excel COM hiện BLOCKED.
- **Nghiệm thu:** ma trận công thức có số pass/fail cụ thể và không có expected thay đổi để xanh; công thức không hỗ trợ trả lỗi ổn định hoặc giữ nguyên an toàn, không thành giá trị sai im lặng.
- **Phụ thuộc/thứ tự:** sau W3 op/value contract; có thể phát triển độc lập trong nhánh Muse nhưng chưa đưa vào đường lưu nếu W3 chưa hiểu op.

### L5 — DOCX: API chỉnh sửa tính năng còn thiếu

- **Chủ sở hữu:** Muse, `OOXMLWord/**` và tests; Codex Windows sở hữu tích hợp UI/bridge sau khi API ổn định.
- **API/op mới:** numbering danh sách đa cấp; field allowlist L1 mở rộng TOC/TOF/PAGE/SEQ; section props, headers/footers và link-to-previous; core properties; run effects/line spacing; footnotes/endnotes/comments/revisions/merge fields/watermark theo thứ tự ưu tiên; xác định rõ tính năng chỉ bảo toàn hay cho phép sửa.
- **Test bắt buộc:** fixture DOCX tổng hợp cùng XML; Word open/readback qua oracle nếu được, nếu chưa thì NOT RUN/BLOCKED; test độc lập `document.xml`, `styles.xml`, `numbering.xml`, `settings.xml`, relationships/content types; byte-identical ngoài allowlist; reopen; test lỗi không đổi document.
- **Nghiệm thu:** API phân biệt unsupported với success rỗng; đa cấp và kế thừa section đúng; field an toàn; feature matrix mô tả rõ read/edit/write/preserve từng mục; không báo tính năng “đầy đủ” nếu chỉ passthrough.
- **Phụ thuộc/thứ tự:** L1 trước; sau W3/G2 để ưu tiên Sheet theo yêu cầu sản phẩm.

### L6 — PPTX: API sửa slide nâng cao

- **Chủ sở hữu:** Muse, `OOXMLPresentation/**` và tests; Mac owner kiểm parity app riêng.
- **API/op mới:** show settings schema-correct (L1); theme colors/fonts; transitions; animation/effects/media loops; embedded fonts; connector/drawing edits; section và notes/comments parity.
- **Test bắt buộc:** fixtures tổng hợp; kiểm độc lập ZIP/XML/schema và rels/content types; save/reopen; chỉ part allowlist đổi; kiểm preservation cho animation/theme/fonts trên tài liệu không sửa; PowerPoint thật nếu môi trường Windows hỗ trợ, nếu không ghi NOT RUN/BLOCKED.
- **Nghiệm thu:** không làm rơi animation/transition/theme/font khi sửa text/slide; mọi op chưa hỗ trợ trả unsupported/fallback; PPTX corpus parity đạt ngưỡng đã chốt trước khi W4 bật.
- **Phụ thuộc/thứ tự:** L1/L2; hoàn thành sau DOCX theo ưu tiên ba ứng dụng.

### L7 — W4: đưa lớp lưu DOCX/PPTX vào thử nghiệm có cờ

- **Chủ sở hữu:** Codex Windows integration; Muse API; Mac owner tích hợp độc lập cho macOS.
- **Tệp/module:** desktop engine integration, Writer/Slides adapters, `main.py`, parity harnesses, tests.
- **Ops:** Writer text/paragraph/format/field/section/numbering đã hỗ trợ; Slides text/notes/section/theme/transition chỉ khi API hoàn tất; mỗi app có allowlist và fallback riêng.
- **Test bắt buộc:** corpus DOCX/PPTX hiện có + files tổng hợp; no-op byte-identical; edit/reopen; compare XML independently; Word/PowerPoint COM chạy ẩn khi có môi trường; Excel COM policy không áp dụng. CDP screenshot/view theo quy tắc chung nếu kiểm app UI.
- **Nghiệm thu:** từng tệp có trạng thái rõ; target không đổi nếu reopen fail; W4 chỉ bật sau W2 parity và test security; thiếu Office oracle là NOT RUN/BLOCKED.
- **Phụ thuộc/thứ tự:** L5/L6 và L3 làm mẫu; phải có cùng cơ chế atomic staging/fallback.

### L8 — W1, G1 và hardening portable

- **Chủ sở hữu:** Codex Windows phụ trách W1 executable/runtime packaging; Muse phụ trách library performance/ZIP; Mac phụ trách engine macOS riêng.
- **Tệp/module:** package/build scripts và `ooxml-engine` theo owner; `OPCPackage.swift`, `ZipArchive.swift`, `LazyOpenTests`, performance harness.
- **Việc:** Swift for Windows build/test thật; đo binary/runtime footprint; chứng minh `main.py` quản lý engine offline; G1 lazy open/save và peak memory; chọn ZIP limits từ fixture, test overflow, max entry, aggregate, count, compression ratio. Không đưa điều kiện nền tảng rải rác trong thư viện; caller cấu hình limits qua API chung.
- **Test bắt buộc:** WSL `swift test`; Windows build + engine JSONL smoke + tests; offline startup không Node server; memory/time/corpus; ZIP bomb tổng hợp; OfflineGuarantee; warnings lấy từ output đầy đủ.
- **Nghiệm thu:** W1 PASS chỉ khi build/test trên Windows thật; nếu toolchain vẫn chặn thì BLOCKED kèm lỗi cụ thể/phương án. Không suy rộng benchmark Linux thành hiệu năng thiết bị.
- **Phụ thuộc/thứ tự:** có thể chạy song song L2/L4; W3 không bật production trước W1 và hardening fallback.

### L9 — W2 parity tổng, W5 open layer, W6 quyết định thu hẹp LibreOffice

- **Chủ sở hữu:** Codex Windows điều phối corpus/parity; Muse xử lý lỗi library; Mac kiểm oracle/macOS riêng; owner sản phẩm duyệt W6.
- **Tệp/module:** parity harness và `tests/functions/*golden*.json` (không sửa expected), corpus fixtures, OOXMLKit/engine open adapter, quyết định kiến trúc W6.
- **Việc:** chạy DOCX/XLSX/PPTX qua open/edit/save/reopen; mở OOXML trực tiếp dựng UI model (XLSX trước) và nạp cache công thức; đo mở/save; xác định PDF/in và định dạng cũ. Office COM chỉ Word/PowerPoint theo quyền hiện có; Excel COM BLOCKED. Dùng LibreOffice làm so sánh tạm, không tuyên bố tương đương Office.
- **Test bắt buộc:** toàn bộ corpus; byte identity no-op; XML part diff allowlist; compare Office thật khi khả dụng; CDP app thật/screenshot khi luồng UI thay; offline package/engine start.
- **Nghiệm thu:** W2 bảng PASS/FAIL theo từng fixture (không một nhãn tổng che lỗi); W5 không mất workbook values/formulas; W6 chỉ đề xuất sau khi W2–W5 đạt và có quyết định riêng về PDF/định dạng cũ. Không xóa LibreOffice trong các gói này.
- **Phụ thuộc/thứ tự:** sau L3–L8; W6 cuối cùng.

## 5. Cuộc giao việc tiếp theo

### 5.1. Việc giao cho Muse

1. Cung cấp branch/ref và commit thật cho báo cáo 244/244 (hoặc xác nhận báo cáo cũ/không tồn tại); không dùng 9f9f061 nếu không truy cập được.
2. Tách phiếu L1 thành các commit có test tái hiện riêng: showPr schema; section inheritance; numbering level; field allowlist; ZipLimits propagation/default. Chạy trước/sau trên cùng test; không gộp warning check vào runner lọc dòng.
3. Reconcile mapping 217 dòng, 37 API groups, 47 patch-function rows; cập nhật danh sách API gap theo mã hiện tại, đánh dấu rõ hỗ trợ read/edit/write/preserve và bằng chứng test.
4. Cập nhật `ENGINE-PROTOCOL.md` và `LIBRARY-CHANGELOG.md` cùng commit API ổn định; ghi số test, toolchain, warning output và phần chưa chạy.
5. Sau L1, thực hiện L4 công thức; L5 DOCX; L6 PPTX theo ưu tiên. Không nhận việc tích hợp Windows `main.py`/app thuộc owner khác.

### 5.2. Phiếu Windows/Codex đề xuất kế tiếp

- **Q-LIBPLAN-01 — tích hợp XLSX W3 sau cờ:** chỉ bắt đầu khi L1/L2 có ref ổn định; owner Windows/Codex; giữ cờ OFF; test 27 workbook, XML independent, byte-identical, fallback/reopen và screenshot CDP. Phiếu kế tiếp chỉ mở sau khi commit/handoff của phiếu hiện tại được ghi.
- **Q-LIBPLAN-02 — G2 parity công thức:** consumer bridge/cache, corpus và oracle; Excel COM ghi BLOCKED; tách theo cụm công thức, không gom tất cả một lần.
- **Q-LIBPLAN-03 — W1 Windows engine:** Swift for Windows build/runtime/offline launch/package size; chỉ báo PASS trên Windows thật.
- **Q-LIBPLAN-04 — DOCX/PPTX W4 parity integration:** sau khi Muse hoàn tất API L5/L6; Word/PowerPoint COM nếu được, không thay bằng giả lập.
- **Q-LIBPLAN-05 — W2/W5/W6 gate:** parity tổng và open direct; W6 cần quyết định người phụ trách về PDF/định dạng cũ trước mọi lần thu hẹp LO.

### 5.3. Handoff cho Mac

Mac nhận API/protocol đã ổn định để làm adapter và oracle trên macOS trong branch/worktree riêng; không cherry-pick mã platform-specific vào thư viện chung. Đối chiếu OOXML bằng tool độc lập, CDP cho UI, không AppleScript/COM. Báo cáo test/toolchain/corpus cùng trạng thái từng tệp; phản hồi API thiếu qua handoff, không sửa vùng Muse/Windows.

## 6. Rủi ro, cổng quyết định và rollback

| Rủi ro/điểm cần chốt | Tác động | Cách xử lý / cổng |
|---|---|---|
| Bộ đếm mapping mâu thuẫn 37/47 | Bỏ sót API hoặc giao trùng việc | Chuẩn hóa mapping trước khi coi toàn bộ gap đã đóng; báo cả số nhóm API và số hàm vá. |
| Nhánh Muse 244 test không có ref sau fetch | Không tái lập được số liệu/gói việc | Chờ commit truy cập được; dùng 204 local và 232 snapshot review theo đúng nguồn, không suy diễn. |
| Show settings sai schema nhưng test xanh | File có thể bỏ qua thay đổi khi mở ở consumer chuẩn | Block tích hợp nhánh numbering cho đến khi test XML độc lập PASS. |
| API thêm quá rộng trước khi biết UI delta | Tăng bề mặt compatibility và không dùng được | Ưu tiên capability có op thực tế; mọi op có contract, error, UI owner, help/i18n nếu thành tính năng app. |
| OOXMLKit giữ part nhưng app chưa thể sửa | Nhầm “preserve” với “feature parity” | Ma trận riêng read/edit/write/preserve; unsupported op fallback, không báo thành công giả. |
| ZIP limits quá lớn hoặc hạ quá thấp | DoS/OOM hoặc từ chối file hợp lệ | Đo corpus tổng hợp, memory, limits; configurable qua API chung; chủ duyệt default portable. |
| Formula khác Excel/locale | Sai dữ liệu và cache khi lưu | Differential corpus; unsupported/error rõ; Excel COM BLOCKED đến khi môi trường thay đổi. |
| Cờ engine chọn sai đường/fallback hỏng | Hỏng file hoặc không lưu được | cờ mặc định OFF; staging và reopen trước replace; giữ target nguyên khi thất bại; cắt cờ ngay nếu parity regression. |
| Swift for Windows/runtime packaging | App desktop offline không khởi chạy | W1 build thật và kích thước gói trước khi bật tính năng Windows. |
| W6 bị hiểu nhầm là “xóa LO” | Mất PDF, render, file cũ | W6 là quyết định riêng sau W2–W5; ghi phương án PDF/import legacy và xin duyệt trước khi đổi. |

Mỗi phiếu integration rollback bằng tắt cờ OOXML engine và quay về đường hiện tại; không xóa source hay fallback LibreOffice trước quyết định W6. Với thư viện, mỗi API additive có commit nhỏ và release note; nếu consumer parity fail, giữ API sau cờ hoặc hoàn nguyên commit riêng, không sửa expected golden để giữ xanh.

## 7. Tiêu chí hoàn thành toàn bộ thư viện

- Mapping 217/217 có phân loại đúng và evidence; số API nhóm riêng biệt reconcile với số hàm vá.
- XLSX/DOCX/PPTX có capability matrix độc lập cho open/read/edit/write/preserve/bridge/test; không tính passthrough là edit support.
- Mọi API/op mới có test FAIL-before/PASS-after khi bug có thể tái hiện, XML/ZIP inspection độc lập, save/reopen, byte-identical outside allowlist, offline guarantee.
- `swift test` đạt hoặc vượt baseline snapshot được chọn và ghi rõ SHA; báo riêng `OfflineGuaranteeTests`, toolchain, duration, compiler warnings từ log đầy đủ.
- W1 Windows build thật; W2 parity theo từng fixture; W3 XLSX save; W4 DOCX/PPTX save; W5 open; W6 có quyết định owner. Office COM, đặc biệt Excel COM, ghi theo trạng thái thực tế; BLOCKED không được thay bằng PASS.
- Không có dependency/network call mới, không gỡ fallback hoặc đổi document semantics ngoài gate; app vẫn hoạt động offline và main.py tự quản lý engine.

## 8. Test/verify đã chạy cho tài liệu này

- **PASS:** `git merge main` — Already up to date; HEAD/main `11b736bf`.
- **PASS:** `git fetch origin`; ref `origin/muse/ooxmlkit-numbering-2510` tại `1354d7ec` xác nhận; ref `muse/ooxmlkit-directive-3110` không tồn tại sau fetch.
- **PASS:** `powershell -NoProfile -File E:\VNOffice-briefs\run-swift-wsl.ps1 E:\VNOffice-codex-libplan` — 204 test, 0 failures, 43.763s, exit 0.
- **NOT RUN:** compiler-warning audit đầy đủ; runner lọc output.
- **NOT RUN:** Excel/Word/PowerPoint COM, W1 Windows build, CDP UI; đây là phiếu kế hoạch thư viện, không sửa/chạy UI.\n