# ENGINE-MAC-2410 — `ooxml-engine` bản macOS + harness G0 trên Mac

Phiếu ENGINE-MAC (trả lời INBOX-MAC #2, phần không cần Office). Ngày chạy: 2026-10-25.
Nhánh `mac/engine-cl-2410` (gốc `origin/vn-main` 83160242). Corpus/harness: `origin/claude/ooxml-g0-corpus-parity` 49aef6bb
(worktree chỉ đọc; mọi đầu ra ghi ra thư mục tạm, không ghi vào cây corpus).
Trạng thái theo AGENTS.md §8: PASS / FAIL / NOT RUN / BLOCKED. **Không sửa mã nguồn OOXMLKit** — chỉ ghi phát hiện.

Mã OOXMLKit giống hệt nhau ở hai nhánh: `git diff 49aef6bb 83160242 -- ports/ios/OOXMLKit` rỗng → engine Mac và engine Linux
của điều phối iOS được dựng từ cùng một mã nguồn.

## 1. Dựng engine

Máy: Mac arm64, 8 GB RAM, macOS 15 (Darwin 24.6). Toolchain: Xcode, Apple Swift 6.2.4 (swiftlang-6.2.4.1.4), SDK 26.2.
Lệnh chạy qua khóa dùng chung `/Volumes/Data/Worktrees/_lead/heavy-lock.sh`.

| bản dựng | lệnh | kết quả | kích thước | `file` |
|---|---|---|---|---|
| arm64 | `swift build -c release --product ooxml-engine` | **PASS** (24,3 s) | 1.657.312 B (1,6 MB) | `Mach-O 64-bit executable arm64` |
| universal | `… --arch arm64 --arch x86_64` | **PASS** (34,6 s) | 3.492.416 B (3,3 MB) | `Mach-O universal binary with 2 architectures: [x86_64] [arm64]` |

- Đường dẫn: `.build/arm64-apple-macosx/release/ooxml-engine` (arm64), `.build/apple/Products/Release/ooxml-engine` (universal).
- `LC_BUILD_VERSION`: platform MACOS, **minos 12.0**, sdk 26.2. Ký: ad-hoc, linker-signed (chưa ký Developer ID / notarize).
- sha256 arm64: `48dc722525bf4e806022b153f1b7531cf0311f6577e6edd32f8a9f71c56849b3`.
- Cảnh báo biên dịch duy nhất: `OOXMLBridge.swift:559` biến `index` không dùng (Windows đã biết, INBOX-MAC #2).
- So với Linux (Swift 6.0.3, 4,8 MB): bản Mac nhỏ hơn vì liên kết động runtime Swift có sẵn trong `/usr/lib/swift`.

### Phụ thuộc (`otool -L`, cả hai lát arm64 và x86_64)
Chỉ thư viện hệ thống — **không có dylib ngoài hệ thống**:
`/usr/lib/libSystem.B.dylib`, `/usr/lib/libc++.1.dylib`, `/usr/lib/libobjc.A.dylib`, `/usr/lib/swift/libswift*.dylib`
(Core, Foundation, CoreFoundation, Darwin, Dispatch, ObjectiveC, os, OSLog, simd, XPC, IOKit, Metal, QuartzCore,
CoreImage, UniformTypeIdentifiers — phần lớn `weak`), `CoreFoundation.framework`, `Foundation.framework`,
**`WebKit.framework`**.

Ghi chú: `WebKit.framework` bị kéo vào tiến trình CLI vì `Sources/OOXMLBridge/OOXMLWebViewBridge.swift` (`#if canImport(WebKit)`)
nằm chung target `OOXMLBridge`. Khởi động tiến trình nạp 755 image (DYLD_PRINT_LIBRARIES), lần đầu 0,26 s, lần sau ~0,00 s.
Không chặn được việc gì nhưng là phụ thuộc thừa cho engine stdio (xem đề xuất #5).

### Smoke giao thức (ENGINE-PROTOCOL §2, §3, §9) — **PASS** trên cả arm64 và x86_64 (Rosetta)
Đầu vào: 12 dòng JSON qua stdin (fixture `Tests/OOXMLTestSupport/Fixtures/{xlsx,docx,pptx}/rich-*`). Đầu ra arm64 (rút gọn):

```text
open rich-excel.xlsx   → {"ok":true,"result":{"kind":"xlsx","handle":"h1","sheets":[Dữ liệu, Tổng hợp, Ẩn(hidden)]},"id":1}
info h1                → ok, cùng 3 sheet
open rich-word.docx    → {"ok":true,"result":{"tables":1,"handle":"h2","kind":"docx","paragraphs":21},"id":3}
open rich-deck.pptx    → {"ok":true,"result":{"handle":"h3","kind":"pptx","slides":3},"id":4}
sheet.read h2          → {"error":{"message":"tài liệu không phải bảng tính","code":"kind"},"id":5,"ok":false}
doc.setText idx 9999   → {"error":{"message":"đoạn 9999 ngoài phạm vi","code":"index"},"id":6,"ok":false}
nope.op                → {"error":{"message":"thao tác 'nope.op' không hỗ trợ","code":"op"},"id":7,"ok":false}
info h99               → {"error":{"message":"handle 'h99' không tồn tại","code":"handle"},"id":8,"ok":false}
open <tệp không phải OOXML> → code "open"
dòng "not json at all" → {"id":null,"ok":false,"error":{"code":"internal","message":"Error Domain=NSCocoaErrorDomain Code=3840 …"}}
close h1 → {"ok":true,"result":{}} ; info h1 sau close → code "handle"
```
`[1]` → `request`/"yêu cầu không phải JSON object"; `{"id":1}` → `request`/"thiếu 'op'". Tiến trình không crash, thoát 0 khi hết stdin.
Kết quả giống hệt các ví dụ "Chạy Thật" trong ENGINE-PROTOCOL.md (chỉ khác thứ tự khóa JSON — không có ý nghĩa).
**Lệch đặc tả:** dòng không phải JSON trả `internal` + thông điệp Cocoa thô, trong khi §9 mô tả `request` (đề xuất #4).

## 2. Harness G0 trên Mac

Lệnh ghi trong README (`scripts/parity/run_parity.sh --all`) **FAIL trên macOS**: dùng `mapfile` (bash ≥ 4), còn `/bin/bash` của macOS
là 3.2.57 → `mapfile: command not found` rồi `FILES[@]: unbound variable`. Đây là lỗi tooling, không phải lỗi engine.
Đã chạy `parity_runner.py` y hệt từng tệp bằng `tests/macos/oracle/run_g0_parity_mac.sh` (tương đương, an toàn bash 3.2,
`python3 -I -B`, `TMPDIR` và mọi đầu ra ở thư mục tạm). Python 3.9.6 hệ thống. Không có `soffice` trên PATH → plugin
`oracle_libreoffice` = BLOCKED; các plugin Office/visual/repair/perf = BLOCKED như thiết kế.

Đã chạy 3 lượt: arm64 gốc, lát x86_64 qua Rosetta (`arch -x86_64`), universal (lát arm64). **Cả 3 cho cùng kết quả từng chặng**,
và 75/75 tệp đầu ra arm64 vs x86_64 **byte-identical** (ghi tất định, không phụ thuộc kiến trúc).

### Tổng hợp Mac vs Linux

| chỉ số | Linux (REPORT-G0, Swift 6.0.3) | Mac arm64 / x86_64 / universal | khác biệt |
|---|---|---|---|
| tổng thể Open→Edit→Save→Reopen→Export | 24/28 | **24/28 PASS** (4 FAIL) | không |
| tệp FAIL | sample-slides, sample-slides-comments, sample-slides-smartart, slides-saved-roundtrip | **đúng 4 tệp đó** | không |
| `noop_roundtrip` (lưu không sửa, mọi phần byte-identical) | ghi "28/28" | **27/28** (smartart không lưu được) | xem ghi chú 1 |
| DOCX | ghi "10/10" | **9/9** | xem ghi chú 2 |
| XLSX | ghi "9/9" | **13/13** (gồm ton-kho-3t, strict, office-quirks) | xem ghi chú 2 |
| PPTX | 2/6 | **2/6** (rich-deck, sample-slides-notes) | không |
| `source_integrity` | 28/28 (1 lỗi nguồn đã khai) | 28/28 (smartart: lỗi nguồn đã khai) | không |

Ghi chú 1: REPORT-G0 vừa ghi "lossless 28/28" vừa ghi smartart FAIL ở chặng `noop_roundtrip` — hai điều này mâu thuẫn. Trên Mac,
chặng noop là 27/28; 27 tệp PASS đều có **mọi phần ZIP byte-identical** (0 phần chỉ-bằng-sau-chuẩn-hóa, 0 phần đổi). Rất có thể
Linux cũng là 27/28; con số 28/28 nên sửa thành "27/28 (+1 bị validator chặn lưu, không mất dữ liệu)".

Ghi chú 2: MANIFEST có 9 DOCX + 13 XLSX + 6 PPTX = 28. Tách "DOCX 10/10, XLSX 9/9, PPTX 2/6" (= 25 tệp) trong REPORT-G0 không
cộng ra 28; tổng 24/28 thì khớp. Không phải khác biệt Mac/Linux — là lỗi đếm trong báo cáo.

### 4 tệp FAIL — chi tiết (giống Linux; thêm nguyên nhân gốc)

| tệp | chặng | lỗi engine (nguyên văn) | ghi chú Mac |
|---|---|---|---|
| `real/sample-slides.pptx` | edit_save | `slide.setNotes: {'code': 'internal', 'message': 'Bản trình chiếu chưa có notes master — không tạo được ghi chú mới'}` | giống Linux |
| `real/sample-slides-comments.pptx` | edit_save | như trên | giống Linux |
| `real/sample-slides-smartart.pptx` | noop_roundtrip | `save: {'code': 'internal', 'message': 'Gói sau khi lưu không hợp lệ: /ppt/slideMasters/slideMaster1.xml: quan hệ rId3 trỏ tới phần không tồn tại /ppt/slideLayouts/slideLayout2.xml'}` | giống Linux |
| | edit_save | **cũng** FAIL `setNotes` "chưa có notes master" | REPORT-G0 chỉ ghi lỗi validator; tệp này dính cả 2 lỗi |
| `real/slides-saved-roundtrip.pptx` | edit_save | `sửa đổi không đọc lại được trong cùng phiên` | **nguyên nhân gốc tìm được trên Mac — xem dưới** |

**Nguyên nhân gốc `slides-saved-roundtrip.pptx` (lỗi ghi sai cấu trúc, nặng hơn "không đọc lại được"):**
`notesSlide1.xml` của tệp này (do LibreOffice tạo) chứa ghi chú trong một `p:sp` **txBox không có `<p:ph type="body"/>`**.
`Slide.notesShape()` (`Sources/OOXMLPresentation/Slide.swift:78-87`) chỉ nhận shape có `ph type="body"` → trả nil →
`setNotesText` (`Slide.swift:96-121`) coi như slide chưa có notes và **tạo thêm** `notesSlide4.xml` + thêm **quan hệ notesSlide thứ hai**
vào `slide1.xml.rels`; sau đó `notesShape()` vẫn đi theo quan hệ đầu tiên (notesSlide1) nên **chữ không được đặt**.
Vẫn trả `ok`. Đã tái hiện bằng 2 đường:
- `slide.setNotes` + `save` → `ok`; tệp lưu có `slide1.xml.rels`: `rId2 → notesSlide1.xml`, `rId3 → notesSlide4.xml`.
- **`pptx.save` delta** (đường lưu thật của desktop): `{"ok":true,"result":{"ok":true,"changedParts":["[Content_Types].xml","ppt/notesSlides/_rels/notesSlide4.xml.rels","ppt/notesSlides/notesSlide4.xml","ppt/slides/_rels/slide1.xml.rels"],"unsupported":[]}}`
  → bước "mở lại kiểm tra bắt buộc" (§8.2) **không bắt được**: báo thành công mà ghi chú không được lưu và slide có 2 quan hệ notesSlide
  (PresentationML chỉ cho 1). `ooxml_structural_check.py` bắt được: `ppt/slides/_rels/slide1.xml.rels: 2 relationships of single-valued type 'notesSlide'`.
  PowerPoint nhiều khả năng sẽ báo sửa chữa với tệp này — chưa xác nhận được vì Office Automation BLOCKED.

## 3. Kiểm cấu trúc đầu ra (không cần Office) — **PASS**

Công cụ: `tests/macos/oracle/ooxml_structural_check.py` (độc lập với OOXMLKit và với harness) + `xmllint --noout` đối chứng.
Đối tượng: mọi tệp engine đã ghi ở lượt arm64 = **75 tệp** (27 `noop-*`, 24 `edit-*`, 24 `export-*`).

| kiểm | kết quả |
|---|---|
| `unzip -t` | 75/75 OK |
| phần XML (.xml/.rels/.vml) parse bằng `xml.etree` | 1036/1036 OK (0 lỗi) |
| cùng 1036 phần qua `xmllint --noout` | 1036/1036 OK |
| `[Content_Types].xml` phủ mọi phần (Default theo đuôi hoặc Override) | 75/75 tệp phủ đủ; 0 Override trỏ phần không có |
| quan hệ nội bộ trỏ tới phần có thật | 792/792 (0 thiếu) |
| trùng rel Id / quan hệ đơn trị bị lặp / trùng mục ZIP | 0 |
| **tệp sạch hoàn toàn** | **75/75** |

Đối chứng âm (chứng minh bộ kiểm bắt được lỗi): 2 tệp tái hiện lỗi setNotes ở §2 → 2/2 bị báo lỗi, mã thoát 1.
Lưu ý: 4 tệp FAIL không có `edit-*` (engine từ chối lưu hoặc harness dừng trước khi lưu), nên lỗi cấu trúc của
`slides-saved-roundtrip` chỉ thấy qua tái hiện riêng, không nằm trong 75 tệp trên.

## 4. Oracle Microsoft Office for Mac — **BLOCKED**

Office for Mac 16.114.1 có trên máy (Word, Excel, PowerPoint đang chạy sẵn trong phiên người dùng), nhưng Automation (AppleEvents)
đang **BLOCKED** (-1712 timeout). Theo phiếu: **không chạy osascript**.

Đã chuẩn bị:
- Thư mục tạm `office-check/` (ngoài kho): **18 tệp** = `edit-*` + `noop-*` của 9 tệp **synthetic** (2 DOCX, 6 XLSX, 1 PPTX) + `SHA256SUMS`.
  Không có tài liệu thật, không có tệp LibreOffice tham chiếu của repo.
- Script `tests/macos/oracle/engine_office_check.sh`:
  - chỉ `tell application "Microsoft Word" | "Microsoft Excel" | "Microsoft PowerPoint"`; không phím giả, không điều khiển ứng dụng khác;
  - preflight: nếu ứng dụng đang chạy mà **có tài liệu mở** → dừng (không đụng tài liệu của người dùng);
  - mỗi tệp: mở (`with timeout`), ghi tên tài liệu + **số trang** (Word `compute statistics … statistic pages`) / **số sheet** (Excel) /
    **số slide** (PowerPoint), đóng `saving no`; trạng thái `OPENED_CLEAN | REPAIRED | HANG_OR_PROMPT | OPEN_ERROR`;
  - quá thời gian = gần như chắc chắn Office đang hiện hộp thoại sửa chữa → mặc định **dừng cả lượt** để người vận hành xem màn hình
    (`--kill-on-hang` chỉ dùng khi chắc chắn không có tài liệu người dùng);
  - ghi TSV `office-check-results.tsv`; tiêu chí INBOX-MAC #2: 0 tệp REPAIRED/HANG_OR_PROMPT.
- Kiểm cú pháp: `bash -n` **PASS**; `engine_office_check.sh --syntax-check` (osacompile 4 AppleScript với từ điển Word/Excel/PowerPoint 16.114.1)
  **PASS 4/4**. Không gửi AppleEvent nào, không mở tệp nào.

### Cách chạy khi đã cấp Automation
1. System Settings › Privacy & Security › Automation: cho Terminal (hoặc tiến trình agent) điều khiển Microsoft Word, Excel, PowerPoint.
2. Đóng mọi tài liệu đang mở trong 3 ứng dụng (script sẽ từ chối nếu còn).
3. Chạy:
   ```bash
   /Volumes/Data/Worktrees/_lead/heavy-lock.sh <agent> -- \
     tests/macos/oracle/engine_office_check.sh <thư-mục>/office-check --timeout 90
   ```
4. Ghi kết quả (đếm OPENED_CLEAN/REPAIRED/…, số trang/sheet/slide) vào `docs/sync/STATUS-MAC.md` mục "Oracle Mac".
   Nên thêm một tệp đối chứng âm (vd. bản `slides-saved-roundtrip` sau `setNotes` ở §2) — chỉ dùng tệp tổng hợp/tệp fixture của repo.

## 5. Đề xuất cải tiến thư viện (cho vn-main / chủ OOXMLKit — Mac KHÔNG sửa)

| # | ưu tiên | vị trí | bằng chứng | đề xuất |
|---|---|---|---|---|
| 1 | **Cao** | `OOXMLPresentation/Slide.swift:78-121` (`notesShape`, `setNotesText`); `OOXMLBridge.swift:102, 389` | §2: `slides-saved-roundtrip.pptx` + `setNotes` → 2 quan hệ notesSlide trên slide1, notesSlide4 rỗng, chữ mất; `pptx.save` trả `ok` | Khi slide **đã có** notesSlide: không bao giờ thêm quan hệ thứ hai. Nếu thiếu `ph type="body"` thì chèn placeholder body vào notesSlide hiện có (hoặc nhận txBox làm vùng ghi chú), nếu không được thì ném `unsupported`. Bổ sung `notesText` đọc txBox kiểu LibreOffice. |
| 2 | **Cao** | `pptxSaveDelta` (bước mở lại kiểm tra, §8.2 ENGINE-PROTOCOL) | như #1: mở lại không so ghi chú | Mở lại phải đối chiếu `notesText` của từng slide có `slide.setNotes`, và kiểm "≤1 quan hệ notesSlide/slide"; sai → xóa tệp đích, trả `reopen`. |
| 3 | Trung bình | `Presentation.swift:16` (`noNotesMaster`) → bridge trả `internal` | sample-slides, sample-slides-comments, sample-slides-smartart | Ngắn hạn: trả `unsupported` (để `EngineClient` chuyển LibreOffice theo §8.1) thay vì `internal`. Dài hạn (phiếu Q62): tạo notesMaster tối thiểu + theme. |
| 4 | Trung bình | `OOXMLBridge.swift:33-48` (`handle`) | smoke: dòng không phải JSON → `internal` + `NSCocoaErrorDomain Code=3840 …` | Bắt lỗi `JSONSerialization` → `BridgeError("request", "yêu cầu không phải JSON hợp lệ")` cho khớp §9; không lộ thông điệp Cocoa. |
| 5 | Trung bình | `PackageValidator` khi `save` | sample-slides-smartart: lưu không sửa cũng bị chặn vì lỗi **có sẵn** (rId3 → slideLayout2.xml) | Validator so với lỗi nền của tệp nguồn: chỉ chặn lỗi **mới phát sinh**; giữ nguyên lỗi nguồn (đúng nguyên tắc "không tự sửa lỗi nguồn"). |
| 6 | Thấp | `Package.swift` target `OOXMLBridge` chứa `OOXMLWebViewBridge.swift` | `otool -L`: CLI phụ thuộc `WebKit.framework`; 755 image lúc khởi động | Tách `OOXMLWebViewBridge` thành target riêng chỉ cho app iOS/macOS; `ooxml-engine` chỉ phụ thuộc Foundation. |
| 7 | Thấp | `OOXMLBridge.swift:559` | cảnh báo biên dịch Swift 6.2.4 | `for (_, operation) in …` hoặc bỏ `enumerated()` (đã xếp phiếu Windows). |

Đề xuất cho harness G0 (nhánh corpus, chủ: điều phối iOS): (a) `run_parity.sh` bỏ `mapfile` để chạy được bằng bash 3.2 macOS
(xem `run_g0_parity_mac.sh`); (b) gọi `python3 -I -B` để không ghi `__pycache__` vào cây; (c) `integrity()` thêm kiểm "quan hệ đơn trị
bị lặp" (lỗi #1 sẽ lọt nếu chỉ kiểm rels trỏ đúng); (d) sửa số liệu REPORT-G0 (ghi chú 1, 2 ở §2).

## 6. Tái lập
```bash
cd ports/ios/OOXMLKit
/Volumes/Data/Worktrees/_lead/heavy-lock.sh <agent> -- env DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  swift build -c release --product ooxml-engine [--arch arm64 --arch x86_64]
G0_TREE=<checkout claude/ooxml-g0-corpus-parity> tests/macos/oracle/run_g0_parity_mac.sh <ooxml-engine> <outdir>
python3 -I -B tests/macos/oracle/ooxml_structural_check.py <outdir>/artifacts
tests/macos/oracle/engine_office_check.sh --syntax-check
```
Không commit binary, `.build/` hay đầu ra corpus.
