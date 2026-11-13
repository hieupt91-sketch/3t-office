# M2b — Kế hoạch cổng (plan gate): mô hình lười cho sheet + sharedStrings

Ngày: 06/11/2026 · Nhánh: `muse/m2b-0611` (từ `vn-main` `ac38df8c`) · Trạng thái: **A2 xong (09/11, nối `LazySharedStrings` vào `Workbook` theo đường opt-in `lazyModel`, giữ eager mặc định)** — A1 + A2 đã đo (xem báo cáo giờ #14, 09/11): mở lười 0,135 s / 66,4 MB (release, fixture 100k); lưu `save(to:)` 722 MB (đường cũ 795 MB). **B1 xong (09/11, lát đầu giai đoạn B): `RowOffsetIndex` — quét 1 lượt byte thô dựng chỉ mục offset từng `<row>` + biên `<sheetData>`, chưa nối vào `Worksheet`.** Đo release trên fixture 100k thật: quét 0,135 s, đỉnh tiến trình 77,0 MB (so với mở lazymodel 0,135 s / 66,4 MB); test `LazyModelTests` 16/16, toàn suite 300/300 PASS (debug). Rủi ro còn mở (§4.1, đã đo): `index(for:)` chuỗi mới quét tuyến tính 300.000 mục (~+3,2 s release) — sửa hàng loạt chuỗi mới chậm hơn M2, chờ quyết phương án trước khi làm tiếp B (cửa sổ hàng + serializer theo lát). Giai đoạn B còn lại (cửa sổ hàng) chưa làm.
Nguồn chỉ đạo: INBOX-MAC #15 (M2b DUYỆT), #16 (thứ tự M7 → M2b → Q77B; Mac chỉ bật lưu khi Q77B + M2b), #17 (thứ tự M7), issue #10 (comment Windows 05/11).
Cổng plan (AGENTS.md §6): thay đổi document model + đường mở/lưu → phải có kế hoạch trước khi code.

## 1. Mục tiêu (đã duyệt, không tự nới)

Mở + truy cập + sửa + lưu fixture XLSX 100.000 dòng, **đỉnh RAM < 300 MB**, **không chậm hơn M2 quá 10%**,
toàn bộ test cũ xanh + test lossless, **API công khai không đổi** (chỉ thêm đường opt-in).
Gốc tiêu chí: INBOX-MAC #15 — "mở + truy cập + sửa + lưu fixture 100k dòng, đỉnh < 300 MB,
không chậm hơn M2 quá 10%, toàn bộ test cũ xanh + test lossless".

## 2. Hiện trạng đã đo (nguồn: `docs/sync/LIBRARY-CHANGELOG.md` mục L8/L9, INBOX-WIN #38)

Fixture chuẩn (đo lại được bằng `ooxml-bench gen`): XLSX 100.000 dòng × 6 cột, 3,4 MB,
300.000 ô chuỗi + 300.000 ô số.

| Đo (release, VM x86, Swift 6.0.3 Linux) | Số |
|---|---|
| Mở lazy (chưa chạm sheet) | 2,4 s / 188 MB |
| Mở eager (chưa chạm sheet) | 4,5 s / 358 MB |
| Mở lazy + sửa 1 ô + lưu đường cũ (L8) | 11,7 s / đỉnh ~805 MB |
| L9 `saveStreaming`: đỉnh | **538 MB** (đường cũ 793–805 MB) |
| L9: pha lưu cộng thêm | **~25 MB** (đường cũ ~290 MB) |
| L9: thời gian sửa+lưu | **5,0–5,3 s** (đường cũ 8,7–19,8 s) |
| **Sàn mô hình DOM khi mở + truy cập sheet** | **513 MB (sheet ≈ 330 MB, sharedStrings ≈ 160 MB)** |
| Suite hiện tại | **284/284 PASS, 0 cảnh báo** (L9) |

**Kết luận bắt buộc:** đường lưu đã tối ưu xong (L9). Đích "< 300 MB tổng" **không đạt được bằng đường lưu nữa**;
phải hạ sàn mô hình 513 MB xuống ≤ ~270 MB (để cộng pha lưu ~25 MB vẫn < 300 MB). Cần cắt ít nhất ~245 MB khỏi sàn DOM.

## 3. Nguyên nhân gốc (đã đọc mã tại `vn-main` `ac38df8c`)

- `Worksheet.init` (`ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Worksheet.swift:275-285`) parse **toàn bộ**
  sheet part thành DOM qua `package.xml(part)` (`OPCPackage.swift:136`, cache trong `xmlCache`), rồi
  `buildIndex()` (`Worksheet.swift:287-335`) duyệt **mọi** `<row>` và **mọi** `<c>`, dựng
  `rows: [Int: XElement]` (`:251`) + `cellElements: [CellReference: XElement]` (`:252`).
- `SharedStrings.init` (`SharedStrings.swift:14-26`) parse **toàn bộ** `<sst>` thành DOM +
  `texts: [String]` (`:10`) + `richFlags: [Bool]` (`:11`) + `plainIndex: [String: Int]` (`:12`).
- `Workbook.init(package:)` (`Workbook.swift:63-77`) parse sharedStrings + styles ngay lúc mở.
- `ZipArchive` **đã lười sẵn**: chỉ giữ `source: Data` (mmap/COW, 3,4 MB với fixture) + central directory
  (`ZipArchive.swift:112-140`); `contents(of:)` (`:148-153`) giải nén theo yêu cầu, **không cache** dữ liệu
  đã giải nén. → ZIP không phải điểm nghẽn; không sửa `OOXMLZip`.
- `saveStreaming` (`OPCPackage.swift:421`) đã xong, nhưng `flushChanges()` vẫn serialize toàn bộ DOM của part
  đã sửa — với sheet DOM 330 MB thì serialize tạo thêm bản sao chuỗi XML lớn. Đường lưu mới phải tránh
  serialize toàn bộ sheet DOM (xem §4.3).

## 4. Thiết kế (2 giai đoạn, mỗi giai đoạn đo riêng, gộp riêng)

### 4.1 Giai đoạn A — sharedStrings lập chỉ mục theo offset (làm trước, rủi ro thấp)

- Không parse DOM `<sst>` lúc mở. Quét **1 lượt byte thô** của part (qua `archive.contents(of:)`) để dựng
  bảng `[Int: (offset: UInt32, length: UInt32, rich: Bool)]` + `count`/`uniqueCount` từ thuộc tính gốc.
  Ước tính: 300.000 mục × ~12 byte ≈ **3,6 MB** (thay cho ~160 MB).
- Chỉ giải mã chuỗi khi được truy cập (`subscript`, `SharedStrings.text(of:)`), cache LRU có trần (đề xuất 1.024 mục).
- `index(for:)` giữ ngữ nghĩa hiện tại (dùng lại nếu đã có, thêm mới ở cuối). Chuỗi mới thêm vào **đuôi chờ**,
  không chèn vào DOM gốc. Lúc lưu, ghi `<sst>` bằng cách: giữ nguyên byte thô gốc + nối các `<si>` mới,
  chỉ sửa 2 thuộc tính `count`/`uniqueCount` trên thẻ mở (thay đoạn đầu tới `>` đầu tiên).
- **Điểm thiết kế phải đo, không đoán:** `plainIndex: [String: Int]` hiện tại giữ toàn bộ chuỗi trong RAM —
  giữ lại nó là giữ lại ~160 MB cần cắt, nên **không giữ bảng băm toàn bộ chuỗi**. Phương án mặc định:
  chỉ lập chỉ mục cho chuỗi đã từng truy cập + chuỗi mới thêm; tra cứu chuỗi chưa từng gặp thì quét tuyến tính
  toàn bộ `<sst>` (chấp nhận được khi số lần thêm ít, vd sửa 1 ô; tệ khi nhập hàng loạt).
  Đo trên bench: nếu quét tuyến tính làm sửa hàng loạt chậm hơn M2 quá 10% thì ghi lại thành **rủi ro còn mở**
  và đề xuất phương án khác (vd lập chỉ mục băm trên đĩa tạm) — không tự chọn phương án tốn RAM để cho nhanh.
- Rich text: cờ `rich` từ lúc quét; khi truy cập, cắt đoạn `<si>...</si>` theo offset rồi parse đoạn
  (bọc tối thiểu, xem §4.3) và dùng lại `SharedStrings.text(of:)`; `_xHHHH_`, `xml:space`, `<rPh>` giữ nguyên
  hành vi hiện tại.

### 4.2 Giai đoạn B — sheet cửa sổ hàng lười (row-window)

- Không parse DOM toàn bộ sheet part lúc mở. Quét **1 lượt byte thô** để dựng chỉ mục offset từng `<row>`
  (`row number → (offset, length)`) + vị trí các phần tử anh em của `<sheetData>` (`dimension`, `cols`,
  `mergeCells`, …) để giữ nguyên khi lưu. Ước tính: 100.000 hàng × ~16 byte ≈ **1,6 MB** (thay cho ~330 MB).
- `Worksheet` chỉ materialize **một cửa sổ hàng** (đề xuất 1.000 hàng, đo rồi chốt) thành DOM khi truy cập
  (`value`/`cell`/`setValue`/…); `rows`/`cellElements` thành phạm vi cửa sổ; truy cập ngoài cửa sổ → đổi cửa sổ
  (serialize hàng bẩn trước khi evict cửa sổ cũ).
- Hàng bẩn (dirty): giữ DOM của hàng trong cửa sổ + cờ bẩn.
- Các API đọc toàn sheet phải đi qua cửa sổ một cách trong suốt (duyệt cửa sổ-tuần-tự thay vì DOM toàn cục):
  `cells`, `usedRange`, `rewriteLegacyConcat`, `rewriteFormulas` (đổi tên sheet), `deleteSheet` (chỉ khi cần),
  và **formula engine M7** đọc vùng (`SUM(A:A)`, `SUMPRODUCT((C1:C4>1)*B1:B4)`…), `arrayFormulas`/`sharedMasters`
  (hiện dựng trong `buildIndex()` — chuyển sang quét trên byte thô hoặc duyệt cửa sổ, đo rồi chọn).
- Parse một đoạn `<row>...</row>` thành `XElement`: ưu tiên **bọc tối thiểu**
  (`<worksheet><sheetData>…hàng…</sheetData></worksheet>` rồi `XDocument(data:)`) — không đụng `XParser`.
  Chỉ thêm API parse-fragment vào `XML.swift` nếu đo thấy bọc tối thiểu quá chậm.

### 4.3 Lưu (dùng chung cho A + B)

- Tái dùng `saveStreaming` + `validateLight` (`PackageTools.swift:68`, `domParseLimit` 4 MiB —
  phần XML > 4 MiB không bị parse DOM khi kiểm chứng, nhưng vẫn giải nén + kiểm CRC mọi phần).
- Serializer mới cho sheet part: **phát byte thô gốc theo lát**, thay các hàng bẩn bằng serialization từ DOM,
  giữ nguyên mọi phần khác (byte-identical cho vùng không sửa — nguyên tắc passthrough của
  `OPCPackage.writeEntry`). Không serialize toàn bộ sheet DOM.
- Hợp đồng an toàn giữ nguyên: tệp tạm → kiểm chứng → thay nguyên tử; kiểm chứng hỏng thì tệp gốc nguyên vẹn.

### 4.4 API công khai (opt-in, không đổi mặc định)

- Thêm đường opt-in, tên đã chốt khi code A2 (09/11): `Workbook(contentsOf:deferValidation:lazyModel:)` (+ `init(data:deferValidation:lazyModel:)`, `init(package:lazyModel:)`); `Workbook.isLazyModel` cho biết chế độ; mặc định eager giữ nguyên; đường eager không bị đụng.
- Rollback: xóa đường mới là xong; mỗi giai đoạn commit + snapshot riêng; giai đoạn A có thể gộp trước B.

## 5. Tệp / module

| Phạm vi | Tệp |
|---|---|
| Mới | `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/LazySharedStrings.swift` (hoặc mở rộng `SharedStrings.swift` — quyết khi code), `RowOffsetIndex` / cửa sổ hàng (mới, trong `OOXMLSpreadsheet`), `ports/ios/OOXMLKit/Tests/OOXMLSpreadsheetTests/LazyModelTests.swift`, chế độ bench mới `workbook-lazy-window` + `save-lazy-window` trong `Sources/ooxml-bench/main.swift` |
| Sửa | `SharedStrings.swift`, `Worksheet.swift`, `Workbook.swift` (init opt-in + chuyển tiếp), `OPCPackage.swift` (chỉ nếu cần API truy cập byte thô — hiện `archive.contents(of:)` đã đủ; nếu cần thêm `rawContents(of:)` thì ghi rõ khi code), `XML.swift` (chỉ nếu cần parse-fragment) |
| Không sửa | `OOXMLZip`, `OOXMLWord`, `OOXMLPresentation`, `OOXMLBridge`, đường lưu eager, `validateLight` |

## 6. Phụ thuộc

Không dependency mới. Chỉ `Foundation` + module nội bộ (OOXMLKit `AGENTS.md` §0/§3.5: ngoại tuyến tuyệt đối,
không thư viện ngoài, kể cả zlib).

## 7. Rủi ro + giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Đổi cửa sổ liên tục (thrashing) khi truy cập ngẫu nhiên / công thức quét cả cột | Cửa sổ 1.000 hàng + đo `SUM(A:A)` trên fixture; nếu thrashing thì tăng cửa sổ hoặc giữ 2 cửa sổ kề nhau; ghi số đo, không đoán |
| `plainIndex` bỏ đi làm `index(for:)` chậm khi thêm nhiều chuỗi mới | Đo (§4.1); nếu chậm thì báo rủi ro còn mở, không lặng lẽ giữ lại bảng băm toàn bộ chuỗi |
| Công thức mảng / shared formula / array formula vượt biên cửa sổ | `arrayFormulas`/`sharedMasters` dựng bằng quét byte thô hoặc duyệt cửa sổ; test khóa hành vi bằng test M7 hiện có |
| `count`/`uniqueCount` sai sau khi thêm chuỗi | Test khóa: thêm chuỗi mới + trùng, đọc lại bằng Excel/LibreOffice phía Windows (Q77B) |
| Rich text / `_xHHHH_` / `xml:space` / `<rPh>` | Giữ nguyên hàm `text(of:)`/`unescape`/`escape`; test khóa từng trường hợp |
| Byte-identity vùng không sửa bị vỡ | Serializer theo lát + test lossless (RoundTrip.verify); so byte trừ phần đã sửa |
| `validateLight` bỏ parse DOM phần > 4 MiB | Đã là hành vi L9; kiểm chứng sau lưu vẫn giải nén + CRC mọi phần |
| Sendable / thread-safety của cache LRU + cửa sổ | Giữ mô hình hiện tại (class, không chia sẻ giữa luồng); ghi rõ nếu API mới cần `Sendable` |
| Đo debug chậm hơn release nhiều | Báo số **release** (`swift test -c release -Xswiftc -enable-testing`) làm chuẩn; số debug chỉ tham khảo (INBOX-MAC #16) |

## 8. Kế hoạch test (cổng trước khi mở PR)

- `LazyModelTests` mới: mở fixture 100k (gen như L8/L9); đọc rải rác + tuần tự qua biên cửa sổ; sửa 1 ô +
  lưu; `RoundTrip.verify`; byte-identical trừ ô sửa; sharedStrings: đọc chuỗi đầu/giữa/cuối, thêm chuỗi mới/trùng,
  rich text; cửa sổ: sửa ở 2 cửa sổ, đổi cửa sổ nhiều lần.
- Bench mới `workbook-lazy-window` / `save-lazy-window` trên **cùng fixture L8/L9**. Tiêu chí đạt:
  đỉnh **< 300 MB** (release), sửa+lưu **≤ 5,8 s** (5,3 s của M2 × 1,1), mở không chậm hơn lazy hiện tại (2,4 s) quá 10%.
- Toàn suite cũ **284/284+ PASS, 0 cảnh báo** (debug + release, chạy cô lập tuần tự, không chạy 2 suite song song).
- Cổng M1 (#11): tỷ lệ golden **không giảm** (399/1345 đúng); M2b không đổi giá trị tính toán.
- NOT RUN phía Muse: Q77B (Windows, COM), iPhone/iPad thật, DOCX 8/8 (không liên quan — chỉ XLSX).
- Hướng dẫn tiếng Việt trong app: không áp dụng (thư viện, không tính năng UI mới).

## 9. Trình tự

1. Giai đoạn A (sharedStrings) → đo → snapshot + báo cáo.
2. Giai đoạn B (sheet window) → đo → snapshot + báo cáo.
3. Bench + toàn suite → PR vào `vn-main` (tham chiếu #10, #14) → **Windows kiểm** (Q77B + COM + số release trên WSL)
   → Windows gộp; Muse **không tự gộp**.

## 10. Câu hỏi mở (không chặn kế hoạch; chốt trước hoặc khi code)

1. Tên API opt-in chính thức (§4.4) — đề xuất `Workbook(contentsOf:deferValidation:lazyModel:)`; Lead chốt hoặc
   Muse chốt khi code vì chỉ là API cộng thêm opt-in.
2. Kích thước cửa sổ mặc định (đề xuất 1.000 hàng; đo rồi chốt).
3. Chuẩn đo đỉnh RAM: release build trên VM x86 (như L8/L9) + Windows đo lại trên WSL release; số trên iPhone thật
   do Lead đo khi có thiết bị.
4. Ngoài phạm vi M2b, không đụng trong gói này: SUM trên mảng động có chuỗi/bool → `#VALUE!`
   (đã hỏi trong báo cáo giờ 21:54 05/11, chưa có trả lời); lỗi golden (#17 mục 4: chuyển số sang chuỗi 15 chữ số,
   so sánh 15 chữ số, lũy thừa, `TEXT()`, tìm nhị phân của `MATCH`/`VLOOKUP`) — làm sau M2b theo thứ tự #17.
