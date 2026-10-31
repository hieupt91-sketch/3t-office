# Review độc lập OOXMLKit — 31/10/2026

## Phạm vi và cách làm

- **Mục tiêu:** đối chiếu các nhánh OOXMLKit/UNO/Mac/Claude được nêu trong brief với `origin/vn-main`, chạy các bộ Swift/Python liên quan trên Windows + WSL, và đề xuất thứ tự tích hợp.
- **Checkout nguồn:** `E:\VNOffice-codex-review`, detached tại `1354d7ec`; `git fetch origin` đã chạy. Hai commit đầu nhánh numbering: `85930ee2` và `1354d7ec`.
- **Worktree ghi báo cáo:** `E:\VNOffice-codex-review-out`, branch `codex/review-lib` từ `origin/vn-main` (`4c7da4c8`). Không sửa source trên các nhánh được review.
- **Hiện trạng capability:** `vn-main` đã có OOXMLKit, bridge JSON-lines, delta-save, các API tài liệu và offline tests. Các nhánh Muse thêm bridge/model API hoặc sửa UNO; Claude G1/G2 đã được tổ tiên của `vn-main`; corpus G0 và nhánh adapter iOS offline còn chênh lịch sử.
- **Files/modules review:** `ports/ios/OOXMLKit/{Sources,Tests}`, `docs/ooxml/ENGINE-PROTOCOL.md`, `docs/sync/LIBRARY-CHANGELOG.md`, `main.py`, `adapters/libreoffice/common/soffice_uno_worker.py`, các test startup UNO và ba nhánh Mac có HEAD ngày 31/10.
- **Phụ thuộc:** không thêm dependency; OOXMLKit dùng Foundation và module nội bộ. OfflineGuaranteeTests trong suite kiểm tra import/dependency và API mạng.
- **Rủi ro chính:** ghi `p:showSettings`/`p:presentationPr` vào sai vị trí, kế thừa header/footer khi ngắt liên kết, numbering cấp lồng, field instruction tùy ý, giới hạn ZIP lớn trên thiết bị di động; xung đột tích hợp tại `main.py` giữa UNO và MAC-3.
- **Test plan đã chạy:** Swift suite qua `run-swift-wsl.ps1` trên đúng snapshot từng nhánh; pytest startup UNO lấy source từ `uno-mac-bootstrap-2510`. Không chạy test UI/CDP vì đây là thư viện/model API, không mở app.
- **Rollback:** chỉ cần revert commit báo cáo `codex/review-lib`; không có thay đổi source hoặc migration.

## Kết luận

1. **Chưa nên coi 6 API mới trên nhánh numbering là đạt chuẩn OOXML.** Test Swift chạy xanh nhưng `slide.setShowSettings` tạo phần tử không tồn tại trong schema PresentationML và đặt `presentationPr` vào `ppt/presentation.xml` thay vì part `presProps.xml`. Microsoft Open XML mô tả `presProps.xml` là part riêng có root `presentationPr` ([cấu trúc PresentationML](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)) và phần tử settings là `showPr` ([ShowProperties](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.showproperties?view=openxml-3.0.1)). Test hiện tại còn assert chính phần tử sai.
2. **Dữ liệu gói không sửa được bảo toàn khá tốt:** `OPCPackage.save()` chỉ ghi lại part đã đổi; các ZIP entry không đổi được giữ nguyên qua passthrough. Có chặn tên ZIP không an toàn và DTD/XXE. Mặc định giới hạn giải nén 1 GiB mỗi entry / 4 GiB tổng vẫn quá cao cho thiết bị di động.
3. **UNO giữ tương thích Windows có điều kiện tốt:** `python.exe` vẫn được chọn trước các tên Unix; Windows pytest liên quan đạt 3/3. Cần thêm kiểm tra cụ thể cho `_python_path()` trong `main.py`; test startup hiện không phủ nhánh tìm interpreter.
4. **Protocol JSON-lines không đổi cấu trúc**, nhưng `ENGINE-PROTOCOL.md` thiếu nhiều operation vừa thêm và cần sửa mô tả schema của show settings. `LIBRARY-CHANGELOG.md` trên `vn-main` cũng chưa ghi hai commit Muse này.

## Bảng nhánh → tác giả → phạm vi → trạng thái trong `vn-main`

| Nhánh | Tác giả HEAD | Phạm vi HEAD / số commit riêng | Trạng thái so với `origin/vn-main` |
|---|---|---|---|
| `muse/ooxmlkit-bridge-2510` | VN Office Lead Agent | Bridge operations, spacing, run effects; 1 commit | Chưa có (1 commit ahead) |
| `muse/ooxmlkit-numbering-2510` | Phạm Trung Hiếu | numbering, field, section links, show settings, theme, legacy CONCAT; 2 commit, gồm bridge | Chưa có (2 ahead); bridge là tổ tiên trực tiếp |
| `muse/uno-python-path-2510` | VN Office Lead Agent | Tìm `python.exe` trước `python`/`python3`; 1 commit | Chưa có |
| `muse/uno-mac-layout-2510` | Phạm Trung Hiếu | Framework Python và `Resources` của bundle macOS; 2 commit | Chưa có; chứa `uno-python-path` |
| `muse/uno-mac-bootstrap-2510` | Phạm Trung Hiếu | Chỉ đặt `URE_BOOTSTRAP` khi có `fundamental.ini`, thêm test; 3 commit | Chưa có; chứa hai nhánh UNO trước |
| `claude/ooxml-g0-corpus-parity` | Claude | Corpus/harness parity; 4 commit riêng | Chưa có. Lịch sử phân kỳ: main có 149 commit riêng, nhánh 4; tree của nhánh cũ hơn đáng kể |
| `claude/ooxml-g1-lazy-perf` | Claude | `deferValidation`, benchmark, kiểm tra byte parity | Đã là tổ tiên của `vn-main` |
| `claude/ooxml-g2-formula-engine` | Claude | Formula engine slice-1 | Đã là tổ tiên của `vn-main` |
| `claude/ooxml-g2-formula-slice2` | Claude | Hàm tra cứu/văn bản/ngày/điều kiện slice-2 | Đã là tổ tiên của `vn-main` |
| `claude/ooxml-offline-ios-library-fqqyj0` | Phạm Trung Hiếu | Commit đầu `e8861c28`: mobile document adapter + `ContentView.swift`; 2 file | Không có merge-base với main; không merge cả lịch sử 61 commit. Commit đầu không sửa OOXMLKit |
| `mac/filedialog-cl-2610` | Phạm Trung Hiếu | MAC-3 native open/save, OS service, Help, tests; 3 commit | Chưa có (3 ahead); `main.py` chồng vùng với các nhánh UNO |
| `mac/slides2-cl-3110` | Phạm Trung Hiếu | Slides-2, adapter/canvas/CSS, CDP portability, Help; 3 commit | Chưa có (3 ahead); 22 file |
| `mac/sync` | Phạm Trung Hiếu | Đồng bộ status/inbox Mac; 7 commit, chỉ 2 file cuối khác tree | Chưa có (7 ahead); tài liệu có tuyên bố đã gộp hai nhánh nhưng refs hiện tại vẫn ahead |

Ba nhánh Mac ở cuối bảng có HEAD ngày 31/10. Các nhánh `mac/*` có HEAD cũ hơn không nằm trong nhóm 31/10 đang rà soát.

## Kết quả test

| Snapshot | Kết quả thực tế |
|---|---|
| `origin/vn-main` 4c7da4c8 | **PASS** — Swift 204/204, 0 lỗi, WSL Ubuntu |
| `muse/ooxmlkit-bridge-2510` 85930ee2 | **PASS** — Swift 220/220, 0 lỗi, WSL Ubuntu |
| `muse/ooxmlkit-numbering-2510` 1354d7ec | **PASS** — Swift 232/232, 0 lỗi, WSL Ubuntu |
| `claude/ooxml-g0-corpus-parity` ba00f7ab | **PASS** — Swift 140/140, 0 lỗi, WSL Ubuntu. Snapshot cũ; không đại diện suite 204 test của main |
| `claude/ooxml-offline-ios-library-fqqyj0` e8861c28 | **PASS** — Swift 121/121, 0 lỗi, WSL Ubuntu. Snapshot cũ; commit mobile adapter không đổi package này |
| `claude/ooxml-g1-lazy-perf`, `g2-formula-engine`, `g2-formula-slice2` | **NOT RUN RIÊNG** — cả ba ref là tổ tiên của `vn-main`; suite 204/204 trên main đã chạy |
| `uno-mac-bootstrap-2510` | **PASS** — `python -m pytest ...test_soffice_uno_worker_startup.py -q`: 3 passed / 0. Test chạy trên Windows, source module + test được trích đúng từ ref vào thư mục tạm |
| Cảnh báo compiler | **NOT RUN/NOT KẾT LUẬN** — runner Swift chỉ lọc dòng `Executed`, `error` và `Test Suite`; output đó không đủ để xác nhận không có warning |

Số suite trên `vn-main` ở môi trường này là 204, khác số 201/204 tham chiếu trong brief; các con số trong bảng là output của từng lần chạy thực tế.

## Review hai commit OOXMLKit mới

### CONFIRMED — `slide.setShowSettings` ghi sai cấu trúc PresentationML

- `ports/ios/OOXMLKit/Sources/OOXMLPresentation/Presentation.swift:46-84`: đọc/ghi `p:presentationPr` và `p:showSettings` như con của main document `p:presentation`, rồi đánh dấu `mainPart` modified. Schema đặt `presentationPr` làm root của Presentation Properties part `presProps.xml`; child chứa các thuộc tính trình chiếu tên là `p:showPr`, không phải `p:showSettings`.
- `ports/ios/OOXMLKit/Tests/OOXMLPresentationTests/PresentationRoundTripTests.swift:9-24`: `testShowSettingsRoundTrip` khẳng định `ppt/presentation.xml` có `<p:showSettings>` và `p:presentationPr`. Test đóng vòng bằng parser của chính thư viện nên chấp nhận XML không chuẩn; nhánh numbering chạy 232/232 nhưng không có kiểm schema.
- Kịch bản: mở PPTX hợp lệ → đổi loop/narration/timings → lưu → consumer theo schema đọc `presProps.xml`/`showPr`; cập nhật không được nhận diện. Cần chuyển model tới part qua relationship `presProps`, ghi đúng `showPr`, rồi thay test để xác nhận package part và tên element chuẩn.

### PLAUSIBLE — bỏ liên kết header/footer có thể làm rỗng nội dung kế thừa

- `ports/ios/OOXMLKit/Sources/OOXMLWord/WordDocumentModel.swift:388-409`: khi ngắt liên kết, code chỉ lấy reference của section ngay trước. Nếu section trước cũng đang link tới section cũ (không có reference riêng), tạo part mới rỗng thay vì sao chép reference hiệu lực gần nhất.
- Tái hiện cần 3 section: section 0 có header; section 1 liên kết tới section 0; gọi `setLinkedToPrevious(false, kind: .header)` cho section 2. Nội dung header ở section 2 có thể mất/khác sau save-reopen. Test hiện có chỉ dùng section 1 liên kết trực tiếp section 0.
- Khắc phục: tìm ngược section trước gần nhất có reference cho đúng `kind` + `type`, rồi duplicate part và relationship; thêm round-trip case cho chuỗi liên kết 3 section.

### PLAUSIBLE — numbering cấp 1…8 tạo định nghĩa mức không khớp

- `ports/ios/OOXMLKit/Sources/OOXMLWord/WordDocumentModel.swift:296-323`: API chấp nhận `level` 0…8, nhưng mỗi định nghĩa tạo `multiLevelType=singleLevel`, chỉ một `w:lvl ilvl=level`, và `lvlText` luôn `%1.`/`%1)` (bullet là `•`). Từ level 1 trở lên, placeholder vẫn trỏ cấp 1; chưa có test ngoài level 0.
- Kịch bản: gọi `setNumbering(.decimal, level: 2)`, lưu rồi mở bằng consumer OOXML; danh sách cấp 3 có thể hiện sai số/cấu trúc. Cần xác nhận bằng fixture đa cấp trước khi gộp, hoặc giới hạn API hiện tại ở level 0 cho tới khi sinh abstract numbering đa cấp đúng.

### PLAUSIBLE — field instruction cho phép tạo field có hành vi ngoài ý muốn

- `ports/ios/OOXMLKit/Sources/OOXMLWord/WordDocument.swift:233-256`: `appendField` chỉ trim và chặn chuỗi rỗng; mọi instruction được ghi vào `w:instrText`. Serializer XML escape `<`, `&`, dấu nháy nên không thấy đường XML injection ở đây, nhưng escape không vô hiệu hóa lệnh field.
- Kịch bản: nội dung do bên ngoài cung cấp chứa field như `DDE`/`INCLUDETEXT`; tài liệu mở trong ứng dụng khác có thể yêu cầu lấy nội dung/liên kết ngoài. Tác động phụ thuộc chính sách cập nhật field của consumer. Cần allowlist field an toàn hoặc ghi rõ API chỉ nhận instruction tin cậy và không tự cập nhật field khi mở.

## Bảo toàn dữ liệu, tương thích, bảo mật

- `OPCPackage.save()` (`ports/ios/OOXMLKit/Sources/OOXMLPackage/OPCPackage.swift:331-360`) chỉ serialize part được đánh dấu đổi; entry không đổi giữ byte ZIP nén gốc. Đây là thiết kế phù hợp cam kết “phần không sửa byte-identical”. Tests `RoundTrip.verify` kiểm tra changed parts theo allowlist. Riêng API show-settings hiện làm sai chính part bị sửa.
- `ZipArchive.isSafeName` (`ports/ios/OOXMLKit/Sources/OOXMLZip/ZipArchive.swift:514-521`) chặn tên tuyệt đối, backslash, NUL, drive prefix và segment `..`; thư viện không bung entry tùy ý ra filesystem. `XML.swift` có `dtdNotAllowed` và thông báo chặn XXE. Chưa thấy đường ZIP-slip/XXE trong phần đã review.
- `ZipLimits` mặc định (`ZipArchive.swift:50-57`) cho phép 1 GiB/entry và 4 GiB tổng uncompressed. Có giới hạn, nhưng mức này vẫn có thể gây cạn RAM/DoS trên iOS nếu app không truyền limit thấp hơn; đề xuất profile giới hạn riêng cho app di động và test archive vượt ngưỡng.
- `OfflineGuaranteeTests.swift` quét API mạng/tiến trình ngoài và dependency ngoài; suite main chạy 204/204. Không thấy dependency mới hoặc network call trong hai commit.
- API public mới mang tính additive (không thấy đổi signature API cũ). Rủi ro tương thích chủ yếu là XML không được consumer khác nhận; `showSettings` là lỗi chức năng/schema, không phải source compatibility.
- `ENGINE-PROTOCOL.md` giữ framing `{id, op, args}` / `{id, ok, result}` hoặc lỗi và các delta-save contracts cũ. Tài liệu chưa liệt kê các operation bridge mới gồm `doc.setSpacing`, `doc.setRunEffect`, numbering/field/section, `slide.showSettings`/`slide.setShowSettings`, `slide.theme`, `sheet.rewriteLegacyConcat` và các cấu hình sheet được thêm. Bổ sung tham số, error codes và ví dụ round-trip sau khi API được ổn định; đặc biệt không ghi schema show-settings hiện tại là đúng.

## UNO/macOS và tương thích Windows

- `main.py` trên `uno-python-path-2510` thử lần lượt `python.exe`, `python`, `python3`; Windows giữ ưu tiên cũ `python.exe`. `uno-mac-layout` thêm `LibreOfficePython.framework/.../bin/python3` chỉ khi `sys.platform == "darwin"`; thay đổi không tạo nhánh điều kiện rải trong app UI.
- `soffice_uno_worker.py` thêm `Resources` vào `sys.path` trên macOS và `_ure_bootstrap_value()` chỉ trả giá trị khi có `fundamental.ini`. Nếu file thiếu nhưng tiến trình có sẵn `URE_BOOTSTRAP` trỏ tới bundle khác, worker vẫn giữ biến môi trường cũ; đây là rủi ro cấu hình plausible, cần test env có stale value.
- Trên Windows, startup pytest 3/3 xác nhận `_ure_bootstrap_value` với/không `fundamental.ini` và các test startup cũ. **NOT RUN:** test trực tiếp `_python_path()`/mock Windows paths; suite hiện không có case này. Không chạy LibreOffice COM.

## Đối chiếu changelog và protocol

- `docs/sync/LIBRARY-CHANGELOG.md` trên `origin/vn-main` dừng ở các mục Q63, không có entry cho `85930ee2`/`1354d7ec`; cần ghi hai commit cùng số test Linux thực tế trước khi nhánh Mac/iOS đồng bộ API.
- `docs/ooxml/ENGINE-PROTOCOL.md` mô tả giao thức gốc và delta-save, nhưng danh mục operation chưa theo bridge mới. Cấu trúc transport tương thích; ma lỗi của bridge vẫn dùng nhóm `args`, `op`, `path`, `unsupported`, `internal` và map `PresentationError.noNotesMaster` thành `unsupported`. Không thấy đổi framing trong hai commit.
- `docs/sync/STATUS-MAC.md` trong `mac/sync` nói MAC-3/SLIDES-2 đã vào `vn-main 4c7da4c8`, nhưng refs `origin/mac/filedialog-cl-2610` và `origin/mac/slides2-cl-3110` hiện lần lượt còn 3/3 commit ahead so với chính `origin/vn-main` 4c7da4c8. Hãy kiểm tra lại remote refs/merge record; trạng thái văn bản không khớp ancestry Git đã fetch.

## Thứ tự tích hợp đề xuất

1. **OOXMLKit:** chờ sửa và kiểm schema cho `showPr` + section/numbering cases; sau đó merge `muse/ooxmlkit-numbering-2510` một lần (nó đã chứa `ooxmlkit-bridge-2510`), cập nhật `ENGINE-PROTOCOL.md` và `LIBRARY-CHANGELOG.md`, chạy lại 232+ test trên commit tích hợp. Không merge riêng bridge rồi lại merge numbering.
2. **UNO:** merge tuần tự `uno-python-path-2510` → `uno-mac-layout-2510` → `uno-mac-bootstrap-2510` vì refs là chuỗi tổ tiên. Sau đó merge `mac/filedialog-cl-2610`; hai nhánh cùng sửa `main.py`, cần resolve/review vùng startup và chạy test Windows + CDP Mac.
3. **Slides-2 Mac:** merge `mac/slides2-cl-3110` sau khi xác nhận các dependency/commit Slides trước đã nằm trong `vn-main`; nhánh sửa app chung và có CDP/unit tests. Chạy lại hai bài CDP theo INBOX-WIN #30 trên Windows trước khi chấp nhận.
4. **Corpus G0:** không checkout/fast-forward snapshot cũ làm nền. Cherry-pick/merge có kiểm soát 4 commit corpus/harness vào main mới nhất; tránh mang theo tree 140-test cũ. Chạy parity harness cùng Swift suite hiện hành.
5. **Adapter iOS offline:** không merge lịch sử phân kỳ `ooxml-offline-ios-library-fqqyj0`; xem riêng commit `e8861c28` (hai file mobile adapter) trên branch mới từ main, theo owner mobile, rồi chạy test adapter tương ứng.
6. **Mac sync docs:** đồng bộ `mac/sync` cuối cùng, sau khi các code commit đã được ghi nhận và sửa các dòng trạng thái/commit ID không khớp.

Xung đột dự kiến: `main.py` giữa UNO và MAC-3; danh mục/entry Help và tests nếu cùng thay đổi; Slides adapter/canvas/CSS nếu có cherry-pick thêm fix Slides trước; protocol/changelog cần cập nhật riêng cho bridge. Các nhánh `g1`, `g2`, `g2-formula-slice2` không cần merge lại vì đã là tổ tiên của `vn-main`.

## Handoff

- **Đã làm:** fetch refs, kiểm tra ancestry/diff, chạy Swift/Python theo bảng, rà soát source/protocol/changelog, lập đề xuất tích hợp.
- **Kết quả:** xác nhận một lỗi schema show-settings; ghi ba rủi ro plausible; không sửa nhánh nguồn.
- **Tệp được giao:** `docs/REVIEW-CODEX-OOXMLKIT-31-10.md`.
- **Tiếp theo:** sửa độc lập `showPr`/presProps XML và thêm test consumer/schema; sau đó kiểm lại findings section/numbering/field trước merge.
- **Rollback:** revert commit duy nhất `codex/review-lib` nếu cần xóa báo cáo.
