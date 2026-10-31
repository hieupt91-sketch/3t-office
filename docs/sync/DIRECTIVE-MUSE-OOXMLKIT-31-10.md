# Chỉ đạo Muse: sửa OOXMLKit trước khi tích hợp

**Ngày:** 31/10/2026

**Đối tượng:** tác giả các nhánh `muse/ooxmlkit-*` và `muse/uno-*`

**Căn cứ:** `docs/REVIEW-CODEX-OOXMLKIT-31-10.md`, `docs/ooxml/ENGINE-PROTOCOL.md`, `docs/sync/LIBRARY-CHANGELOG.md`, `AGENTS.md` §§3–4, 6, 12 và `ports/ios/OOXMLKit/AGENTS.md`.

Tài liệu này là yêu cầu thực hiện và tiêu chí nghiệm thu. Hãy làm theo từng mục; nếu kết quả khác dự đoán, ghi dữ kiện và cách tái hiện vào INBOX thay vì tự đổi tiêu chí.

## 1. Phạm vi, quyền sở hữu và nguyên tắc

- Làm trên nhánh `muse/*` được giao, trong worktree riêng của nhánh đó. Trước khi sửa, cập nhật từ `main` (hoặc `origin/vn-main` nếu checkout không có `main`) theo quy tắc worktree/nhánh đã giao. Không dùng worktree của Windows hay Mac.
- Muse chỉ sửa `ports/ios/OOXMLKit/**`, tài liệu OOXML liên quan (`docs/ooxml/**`, `docs/sync/LIBRARY-CHANGELOG.md`, và khi cần `docs/ooxml/ENGINE-PROTOCOL.md`) cùng test/fixture thuộc OOXMLKit. Không sửa `main.py`, `apps/**`, `platform/**`, `adapters/**`, mã Mac hay LibreOffice Core; đó là vùng Windows/Mac hoặc upstream. Nếu thấy cần sửa vùng ấy, mô tả dependency trong INBOX để chủ vùng nhận.
- Không đẩy trực tiếp vào `vn-main`, không dùng `--force`, không xóa nhánh/worktree của người khác. Hoàn tất thay đổi và báo vào `docs/sync/INBOX-WIN.md` bằng mục mới có số **trước khi** đề nghị tích hợp. Không tự gộp nhánh.
- Giữ thứ tự quyết định của AGENTS.md: dùng năng lực hiện hữu trước, giữ ranh giới App → Platform → Adapter → Core. OOXMLKit là thư viện Swift độc lập; không thêm dependency, không gọi mạng/tiến trình ngoài, không kéo UI/desktop vào thư viện.
- Bảo toàn dữ liệu: mọi part/ZIP entry ngoài danh sách thay đổi phải giữ byte-identical. Part được sửa phải giữ extension/markup không liên quan và thứ tự phần tử theo schema. Không sửa nội dung fixture tài liệu thật; ca mới dùng gói tổng hợp nhỏ do test tạo.
- Không xem test đóng vòng bằng parser của chính thư viện là bằng chứng schema. `OfflineGuaranteeTests` phải tiếp tục chạy xanh; không disable test, bỏ assertion, nuốt lỗi hoặc nới kỳ vọng để làm xanh.
- Ghi rõ trong INBOX branch, commit SHA, tệp đã đổi, API thêm/đổi, test trước/sau và số liệu thật, cảnh báo compiler mới (nếu có), cùng test/đối chiếu còn thiếu. Không báo PASS cho việc chưa chạy.

## 2. Yêu cầu sửa theo từng phát hiện

### 2.1 CONFIRMED — `slide.setShowSettings` phải ghi đúng Presentation Properties part

**Hiện trạng đã xác nhận ở `muse/ooxmlkit-numbering-2510` `1354d7ec`:** `Presentation.swift` ghi `p:presentationPr/p:showSettings` vào `ppt/presentation.xml`. Đây không phải cấu trúc PresentationML hợp lệ. Part riêng `ppt/presProps.xml` có root `p:presentationPr`; cấu hình trình chiếu nằm trong `p:showPr`. Bài `PresentationRoundTripTests.testShowSettingsRoundTrip` hiện xác nhận lại cấu trúc sai nên cần thay assertion, không giữ test đó như oracle.

**Cấu trúc đích tối thiểu (namespace được khai báo đầy đủ):**

`ppt/presProps.xml`:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:showPr loop="1" showAnimation="1" showNarration="0" useTimings="0"/>
</p:presentationPr>
```

Trong `ppt/_rels/presentation.xml.rels`, thêm một relationship duy nhất tới part tương đối:

```xml
<Relationship xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
  Id="rIdPresProps"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps"
  Target="presProps.xml"/>
```

Trong `[Content_Types].xml`, thêm override nếu chưa có:

```xml
<Override PartName="/ppt/presProps.xml"
  ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
```

Tạo/cập nhật part qua OPC relationship và content-type APIs, không hard-code giả định rằng part luôn tồn tại hoặc luôn mang tên trên. Khi mở gói có `presProps` sẵn, theo relationship đó. Nếu chưa có, tạo part và đăng ký relationship + content type. Tuân thủ thứ tự con theo schema, giữ `extLst`/thuộc tính chưa biết. `showPr` có thể vắng mặt; getter phải trả mặc định đã công bố. Đừng tạo `presentationPr` dưới `p:presentation`.

**Thiết kế và ca biên:** kiểm gói có sẵn `presProps.xml` với `showPr` và thuộc tính mở rộng; gói có `presProps` nhưng chưa có `showPr`; gói không có presProps; thứ tự `extLst`; relationship ID đã dùng; getter mặc định; gọi setter nhiều lần không tạo part/relationship trùng. Chỉ part liên quan và metadata package được phép đổi.

**Test bắt buộc:** tạo PPTX tổng hợp nhỏ trong test (không dùng fixture thật làm oracle), mở bằng thư viện, gọi setter, giải nén ZIP độc lập và tìm part qua relationship từ `ppt/presentation.xml` — không chỉ đoán đường dẫn. Xác nhận target tồn tại, relationship type/target đúng, content type đúng, root là `{…presentationml/2006/main}presentationPr`, con là `showPr` với các thuộc tính yêu cầu, không có `showSettings`, và thứ tự schema hợp lệ. So sánh bytes ZIP entry không sửa trước/sau. Có ca setter lặp và `presProps` đã có. Round-trip getter vẫn là test bổ sung, không thay kiểm XML độc lập.

### 2.2 PLAUSIBLE — bỏ liên kết header/footer phải lấy reference hiệu lực gần nhất

**Hiện trạng cần tái hiện:** `WordDocumentModel.swift` chỉ xem reference ở section ngay trước khi `setLinkedToPrevious(false, kind:type:)`. Nếu section đó cũng kế thừa, header/footer có thể bị tạo rỗng dù section xa hơn có reference hiệu lực. Review thấy test trực tiếp hiện tại không phủ chuỗi ba section. Hãy chạy test tái hiện trước khi sửa; ghi rõ nếu không tái hiện được.

**Cách hiểu OOXML:** `w:headerReference`/`w:footerReference` nằm trong `w:sectPr`; `w:type` chọn `default`, `first` hoặc `even`, còn `r:id` trỏ qua relationship trong `word/_rels/document.xml.rels` tới part tương ứng. Khi một section không có reference cho đúng kind + type, nó kế thừa liên kết trước đó. Cấu trúc tham khảo:

```xml
<w:sectPr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:headerReference w:type="default" r:id="rIdHeaderA"/>
  <w:footerReference w:type="default" r:id="rIdFooterA"/>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
```

Reference `rIdHeaderA`/`rIdFooterA` phải có relationship với type `…/header`/`…/footer`, target tương đối như `header1.xml`/`footer1.xml`, và part phải có content type header/footer đúng. Thứ tự các con của `sectPr` phải theo CT_SectPr; các reference đứng trước `pgSz`/`pgMar` và các phần tử section sau đó theo schema.

**Thiết kế:** khi bỏ link cho section N, tìm ngược reference gần nhất của đúng `kind` **và** `type`; nếu thấy, duplicate part và các quan hệ/phụ thuộc cần thiết, rồi thêm relationship mới và reference riêng vào N. Không sửa section nguồn hay trỏ tới cùng part nếu thao tác chỉnh header/footer độc lập có thể làm thay đổi cả section cũ. Nếu không có reference hiệu lực trước đó, tạo part rỗng đúng root (`w:hdr` hoặc `w:ftr`) như hành vi đã định nghĩa. Giữ nguyên các type khác. `first` phải xét cùng trạng thái `w:titlePg`; `even` phải giữ phân biệt với `default`, dù bật/tắt even/odd headers do setting tài liệu điều khiển hiệu lực hiển thị.

**Ca biên:** section 0 có default header; section 1 kế thừa; section 2 kế thừa; ngắt link ở section 2 phải sao chép nội dung hiệu lực của section 0. Lặp tương tự footer; test riêng `first` và `even`; section trước có reference tường minh rỗng; không có reference trước; section 0; relationship target có ảnh/part phụ; source section vẫn giữ nguyên; kiểm đúng quan hệ khi tạo ID mới.

**Test bắt buộc:** fixture DOCX tổng hợp có ít nhất ba section và relationship/part thật; gọi API, lưu, đóng và mở lại. Dùng XML/ZIP reader độc lập để lần theo `sectPr` → `r:id` → document relationship → part, xác nhận bytes/nội dung/relationship của source part không đổi và part mới có bytes/nội dung tương đương trước chỉnh sửa. `RoundTrip.verify` chỉ định chính xác allowlist. Thêm assertion không thay đổi section khác.

### 2.3 PLAUSIBLE — numbering nhiều cấp phải sinh cấu trúc nhất quán hoặc từ chối level chưa hỗ trợ

**Hiện trạng cần tái hiện:** ở snapshot review, API nhận `level` 0…8 nhưng tạo `w:multiLevelType` là `singleLevel`, chỉ một `w:lvl ilvl=<level>`, và `w:lvlText` luôn tham chiếu `%1`. Từ level 1 trở lên, cấu trúc/placeholder có thể không khớp. Chạy ca level 1 và level 2 trước khi sửa, ghi kết quả thật.

**Cấu trúc tham khảo của numbering đa cấp:** part `/word/numbering.xml`, content type `application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml`, relationship kiểu `…/numbering` từ `word/document.xml`. Root `w:numbering`; `w:abstractNum` đứng trước các `w:num`; một `w:num` trỏ bằng `w:abstractNumId` tới định nghĩa. Mỗi `w:lvl` có `w:ilvl` 0…8 và con theo thứ tự schema (`start`, `numFmt`, …, `lvlText`, …, `pPr`, `rPr`). Ví dụ rút gọn, trong đó mỗi cấp định nghĩa định dạng/placeholders riêng:

```xml
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="7">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="12"><w:abstractNumId w:val="7"/></w:num>
</w:numbering>
```

Đây là ví dụ cấu trúc rút gọn cho các phần tử liên quan; khi serializer ghi part, giữ mọi phần tử bắt buộc/đã có và thứ tự toàn phần theo ECMA-376. Paragraph dùng numbering phải trỏ đúng `numId` và `ilvl` trong `w:pPr/w:numPr`. Nếu API chỉ hứa format một cấp độc lập, ghi rõ semantics và giới hạn level được nhận; không trả thành công cho dữ liệu sai hoặc không hỗ trợ.

**Thiết kế lựa chọn:** ưu tiên sinh abstract numbering nhiều cấp hợp lệ, bao gồm định nghĩa từng `ilvl`, `multiLevelType`, placeholder/format đúng và cấu trúc paragraph áp dụng. Nếu chưa thể hỗ trợ đúng, giới hạn level về 0 bằng lỗi `WordError` ổn định, có tài liệu API; không âm thầm chấp nhận 1…8. Không gán tên placeholder của cấp khác theo phỏng đoán.

**Ca biên:** level 0, 1, 2 và 8; level âm/9; decimal, bullet và các format công bố; nhiều paragraph cùng `numId`; hai danh sách độc lập; numbering part đã tồn tại với ID cao/khoảng trống; numbering part chưa tồn tại; `abstractNum` có nhiều level/override; `lvlText` phân cấp; numbering lạ không bị phá.

**Test bắt buộc:** tạo DOCX tổng hợp có numbering part vắng mặt và có sẵn; đặt numbering nhiều paragraph/cấp; kiểm độc lập XML namespace, đúng quan hệ/content type, ID duy nhất, đúng số lượng và thứ tự `w:lvl`, `ilvl`, `numFmt`, `lvlText`, paragraph `numPr`; lưu/mở lại; xác nhận các ZIP entry ngoài allowlist byte-identical. Không chỉ gọi API rồi đọc lại bằng `numberingFormat()` của thư viện.

### 2.4 PLAUSIBLE — `appendField` phải từ chối lệnh field có thể truy cập nội dung/nguồn ngoài theo mặc định

**Hiện trạng cần tái hiện:** `WordDocument.appendField(instruction:result:)` ở snapshot chỉ trim và chặn chuỗi rỗng, sau đó ghi instruction vào `w:instrText`. XML escaping ngăn injection vào markup nhưng không ngăn consumer thực thi field. API hiện nói ứng dụng khác có thể cập nhật field khi mở. Tái hiện an toàn bằng fixture tổng hợp và kiểm XML; không mở field nguy hiểm bằng ứng dụng có quyền truy cập nguồn thật.

**Cấu trúc field phức hợp hợp lệ tối thiểu:** các run `w:fldChar begin` → `w:instrText` → `w:fldChar separate` → result (nếu có) → `w:fldChar end`, nằm trong `w:p` của `word/document.xml` (hoặc story được API hỗ trợ). Ví dụ field PAGE:

```xml
<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:r><w:fldChar w:fldCharType="begin"/></w:r>
  <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
  <w:r><w:fldChar w:fldCharType="separate"/></w:r>
  <w:r><w:t>1</w:t></w:r>
  <w:r><w:fldChar w:fldCharType="end"/></w:r>
</w:p>
```

**Thiết kế:** mặc định parse cú pháp field và allowlist rõ các field nội bộ/không lấy nội dung ngoài (ví dụ `PAGE`, `NUMPAGES`, `SECTION`, `SECTIONPAGES`, `DATE`, `TIME`, `AUTHOR`, `TITLE`, `SUBJECT`, `FILENAME` theo cú pháp mà implementation thật sự hỗ trợ). Từ chối field/đối số/switch không nhận diện. Đặc biệt chặn mặc định `DDE`, `DDEAUTO`, `INCLUDETEXT`, `INCLUDEPICTURE`, `LINK`, `DATABASE` và mọi cách né bằng hoa/thường, khoảng trắng, switch hoặc chuỗi ghép. Không chỉ dò substring. Nếu cần hỗ trợ instruction tùy ý cho use case tin cậy, thiết kế API riêng có tên/đánh dấu `trusted` rõ ràng, document rủi ro và không dùng mặc định từ dữ liệu tài liệu/người dùng; đừng biến `trusted=true` thành đường đi UI âm thầm. Không bật cập nhật field toàn cục khi mở tài liệu.

**Ca biên:** các field allowlist; chuỗi rỗng; từ khóa không biết; từ khóa nguy hiểm không phân biệt hoa thường; khoảng trắng/tab/newline; switch; `INCLUDETEXT`/`DDE`/`LINK` có đối số; từ khóa nguy hiểm sau prefix hợp lệ; XML escaping; result rỗng/có chữ; lỗi phải xảy ra trước khi cây XML bị sửa. Thông điệp lỗi không được lộ nội dung tài liệu.

**Test bắt buộc:** unit test parser allowlist/blocklist; thử lỗi xác nhận document chưa đổi; DOCX tổng hợp xác nhận cấu trúc `fldChar`/`instrText`, không có cờ buộc cập nhật field khi mở; kiểm độc lập XML và byte-identical ngoài part sửa; round-trip cho field cho phép. Không thực thi field nguy hiểm.

### 2.5 PLAUSIBLE — hạ giới hạn giải nén mặc định cho thiết bị di động và giữ khả năng cấu hình

**Hiện trạng:** `ZipLimits` mặc định trong `ZipArchive.swift` là 50.000 entry, 1 GiB mỗi entry và 4 GiB tổng uncompressed; mức 1/4 GiB có nguy cơ cấp phát quá lớn trên thiết bị di động. Chỉ hạ giới hạn sau khi kiểm tra đường mở package truyền `ZipLimits` xuyên suốt; không để API cấp cao bỏ qua nó.

**Đề xuất mặc định portable ban đầu cho OOXMLKit (an toàn cả trên thiết bị di động):** tối đa **20.000 entries, 256 MiB mỗi entry, 512 MiB tổng uncompressed**. Đây là giá trị cần đo/ghi nhận, không phải ngưỡng chuẩn OOXML. Giữ `ZipLimits`/tham số tương đương để caller có use case hợp lệ điều chỉnh tường minh trên nền tảng của mình; không thêm nhánh điều kiện hệ điều hành trong thư viện và không tự nâng ngưỡng khi gặp file lớn. Trước khi chốt, kiểm kê size của fixture tổng hợp/corpus được phép dùng, xác định kiểm tra integer overflow, và ghi lý do nếu đề nghị giá trị khác. Không dùng nội dung tài liệu riêng tư để lập corpus.

**Ca biên:** ngay dưới/đúng/trên giới hạn entry; tổng nhiều entry ngay dưới/trên; entry count; số unsigned/ZIP64 vượt Int; tổng cộng bị overflow; gói nén cực mạnh nhỏ nhưng uncompressed lớn; archive malformed. Từ chối trước khi giải nén/cấp phát vượt ngưỡng, trả lỗi ổn định, không crash/OOM. Kiểm tra thao tác với `ZipLimits` tường minh và mọi default constructor của `OPCPackage`, DOCX/XLSX/PPTX.

**Test bắt buộc:** sinh ZIP bomb tổng hợp rất nhỏ bằng test helper (không lưu blob lớn), khai báo kích thước uncompressed vượt ngưỡng; khẳng định initializer từ chối trước khi inflate và không cấp phát theo kích thước khai báo. Kiểm tra riêng max entry, tổng và số lượng; kiểm cấu hình custom; chạy `OfflineGuaranteeTests`. Ghi cụ thể ngưỡng, memory/time quan sát được và số test.

## 3. Protocol, changelog và các khoảng trống

- Với mọi public API mới/đổi, thêm entry cuối `docs/sync/LIBRARY-CHANGELOG.md`: ngày, nhánh/commit, tên API, semantics và lỗi có thể trả về. Ghi số test thật, nền tảng/toolchain, cảnh báo compiler. Không ghi các thay đổi chưa có trong commit như đã hoàn thành.
- Cập nhật `docs/ooxml/ENGINE-PROTOCOL.md` cho đúng các operation bridge đã được implementation hỗ trợ, gồm tối thiểu nhóm `doc.setSpacing`, `doc.setRunEffect`, numbering, field, section, `slide.showSettings`/`slide.setShowSettings`, `slide.theme`, `sheet.rewriteLegacyConcat` và các cấu hình sheet có thật ở snapshot. Với mỗi operation: `op`, args/type/requiredness/default, kết quả, error code/message ổn định, một request/response cụ thể và hành vi save/reopen. Không suy đoán API từ tên; đối chiếu switch trong `OOXMLBridge.handle` và model API. Mô tả show-settings theo `presProps.xml` + `showPr` chuẩn sau khi sửa; xóa mọi ví dụ/schema sai.
- Giữ nguyên JSON Lines framing `{id, op, args}` và `{id, ok, result}`/`{id, ok:false, error}` nếu không có quyết định tương thích riêng. Cập nhật bảng lỗi (`args`, `op`, `path`, `unsupported`, `internal`, các mã mới) cùng test contract. Không đổi mã lỗi hiện hữu âm thầm.
- Protocol hiện tự tuyên bố “được kiểm chứng 100% bằng thực thi lệnh thật”, nhưng review nhận thấy danh mục operation/changelog đã trễ so với bridge. Rà soát và sửa mức tuyên bố/ghi ngày + commit kiểm chứng để không khiến tài liệu cũ trông như snapshot hiện tại.
- Chạy tìm kiếm có mục tiêu trên `OOXMLBridge.swift`, `ENGINE-PROTOCOL.md`, test bridge và changelog để phát hiện operation/API công khai còn thiếu. Liệt kê phần không thuộc phạm vi hoặc chưa được kiểm chứng trong INBOX.

## 4. Thứ tự thực hiện và tích hợp đề xuất

### Thứ tự sửa

1. Chạy bài tái hiện trước cho cả năm mục ở §2 trên nhánh Muse chính xác (`1354d7ec` làm mốc đánh giá), lưu số liệu/đầu ra và chỉ thêm test cần thiết để chứng minh lỗi/ca biên.
2. Sửa show settings và bài kiểm cấu trúc độc lập trước; không tích hợp nhánh numbering khi lỗi schema còn mở.
3. Tái hiện rồi sửa section inheritance, numbering levels và field safety; không nâng finding PLAUSIBLE thành confirmed nếu chưa có bằng chứng. Thêm bài kiểm độc lập tương ứng.
4. Hạ giới hạn ZIP sau khi quyết định và ghi con số có căn cứ; kiểm đường truyền limit toàn package.
5. Cập nhật protocol/changelog sau khi APIs và mã lỗi ổn định; chạy toàn suite cuối.

### Thứ tự gộp tham khảo

1. Gộp chuỗi `muse/uno-python-path-2510` → `muse/uno-mac-layout-2510` → `muse/uno-mac-bootstrap-2510` theo ancestry, sau khi từng nhánh có INBOX/đánh giá riêng. Windows phải kiểm trực tiếp `_python_path()`; Mac kiểm bootstrap/resource. Không để thay đổi `main.py`/worker kéo vào worktree Muse OOXMLKit.
2. Tích hợp `mac/filedialog-cl-2610` sau chuỗi UNO, phối hợp owner vì cùng vùng `main.py`; resolve theo owner, chạy kiểm Windows + CDP Mac.
3. Tích hợp `mac/slides2-cl-3110` sau khi xác nhận dependency/commit nền của Slides đã có và chạy kiểm CDP Windows/Mac tương ứng.
4. Sau khi §2.1–2.5 được xử lý và kiểm, tích hợp `muse/ooxmlkit-numbering-2510` **một lần** vì nhánh này đã chứa `muse/ooxmlkit-bridge-2510`; không gộp bridge riêng rồi gộp lại nhánh con. Cập nhật docs cùng thay đổi API. Nếu chọn tách commit, ghi rõ phụ thuộc và không làm mất sửa bridge.
5. Kiểm trạng thái branch/ref và mọi xung đột tài liệu trước từng lần tích hợp. Không lấy snapshot cũ của nhánh khác để thay cây hiện tại. Main/Mac owner quyết định merge; đây là đề xuất thứ tự, không phải quyền tự gộp.

## 5. Phối hợp Windows/Mac và điều kiện nghiệm thu

- Muse báo kết quả vào mục mới trong `docs/sync/INBOX-WIN.md` trước khi xin tích hợp; nêu rõ những mục `CONFIRMED` đã sửa và `PLAUSIBLE` được tái hiện/không tái hiện. Với mọi thay đổi đụng vùng khác, dừng tại handoff, không tự sửa.
- Muse không chạy Office COM trên máy mình trừ khi được giao môi trường/quyền đó. Có thể kiểm consumer độc lập bằng Python `zipfile`/`xml.etree` hoặc harness hiện hữu; ghi lệnh và kết quả. Nếu có thể kiểm Office thật trên Windows, ghi lệnh/đầu ra PowerPoint hoặc Word COM chạy ẩn để Windows owner thực hiện; **Excel COM đang bị chặn**. Nếu chưa chạy, ghi NOT RUN/BLOCKED rõ, không xem đó là PASS.
- Trước mỗi sửa lỗi: test tái hiện phải FAIL trên commit gốc/parent được ghi rõ; sau sửa PASS trên cùng ca và cùng assertion. Nếu không thể tạo bài fail trước hoặc bài trước đã pass, báo lý do và không tuyên bố đã chứng minh lỗi.
- Mỗi test feature mới cần fixture tổng hợp, kiểm cấu trúc XML độc lập với thư viện, round-trip save/reopen, kiểm byte-identical phần ngoài allowlist, và không có dependency ngoài. Không dùng fixture thực để thay expected XML.
- Chạy cuối tại `ports/ios/OOXMLKit`:

  - Windows: `E:\VNOffice-briefs\run-swift-wsl.ps1` (ghi toolchain, code/exit, số XCTest thực tế và warning mới).
  - macOS/Linux: `swift test` (ghi phiên bản Swift, nền tảng, số XCTest thực tế và warning mới).
  - Nếu có thể: `scripts/run-tests.sh` và/hoặc `scripts/verify_artifacts.py` trên artifact tổng hợp; liệt kê kiểm tra và số kết quả.
  - `OfflineGuaranteeTests` nằm trong suite và phải xanh. Không thêm dependency.

- Tiêu chí chấp nhận: từng finding đã có bằng chứng trước/sau; năm nhóm yêu cầu có bài test phù hợp; mọi API/protocol/changelog khớp source; `swift test` có số test **ít nhất bằng 232** của snapshot gốc `1354d7ec` (nếu số nền tăng do main mới, ghi cả baseline và kết quả thực tế); không có cảnh báo compiler mới; phần không sửa byte-identical; `OfflineGuaranteeTests` xanh. Thiếu kiểm Office thật được ghi NOT RUN, không được đổi thành PASS.

## 6. Mẫu nội dung báo INBOX-WIN khi xong

Tạo mục tiếp theo đúng số và format trong `docs/sync/INBOX-WIN.md`, tối thiểu:

```text
## YYYY-MM-DD #N | loại: báo-cáo | trạng thái: chờ-kiểm
- Nhánh/commit/base: muse/... / <SHA> / <SHA>
- Phạm vi và files: <liệt kê>; không sửa main.py/apps/platform/adapters/Core
- Finding: showPr/presProps PASS|FAIL|NOT RUN; section ...; numbering ...; fields ...; ZIP limits ...
- Test trước → sau: <tên lệnh/bài + số fail trước + số pass sau>; swift test <x/y>; OfflineGuaranteeTests <x/y>
- Kiểm độc lập XML/ZIP và byte-identical: <lệnh + số liệu>; Office thật Windows: PASS/FAIL/NOT RUN/BLOCKED + lý do
- API/error code mới hoặc đổi: <danh sách>; protocol/changelog: <đã cập nhật/không áp dụng>
- Compiler warnings: <0 mới hoặc danh sách>; dependency mới: 0
- Files changed: <danh sách>; commit: <SHA>; bước tích hợp đề nghị: <nhánh/commit>
```

Ghi một trạng thái cho từng kiểm tra; không dùng một nhãn PASS chung để che việc chưa chạy. Chỉ sau khi mục INBOX-WIN được thêm mới đề nghị người phụ trách tích hợp.

## 7. Ưu tiên phát hiện khác khi đọc code

Ghi thêm vào INBOX nếu xác minh được; không mở rộng sửa ngoài §2 khi chưa được giao:

1. **P1 — Tính đúng giao thức:** operation bridge mới thiếu trong `ENGINE-PROTOCOL.md`; bảng mã lỗi/ví dụ có thể cũ. Đối chiếu switch thật, đánh dấu operation/args/error nào thiếu.
2. **P1 — Tính đúng schema/compatibility:** test OOXML tự đọc lại có thể cùng parser chấp nhận XML không chuẩn (đã thấy ở show settings). Tìm các test feature mới khác chỉ assert chuỗi/round-trip nội bộ và đề xuất kiểm độc lập.
3. **P1 — Giới hạn bộ nhớ:** `ZipLimits` 1 GiB/4 GiB trên thiết bị di động; chứng minh các initializer dùng chung limit và xử lý overflow trước inflate.
4. **P2 — Chất lượng build/test:** xác nhận warning compiler bằng output build đầy đủ, không suy luận từ runner chỉ lọc dòng `Executed`/`error`/`Test Suite`. Liệt kê lệnh, nền tảng và warning mới/đã có.
5. **P2 — An toàn field:** xác định tất cả điểm tạo/đọc/cập nhật field và cờ `updateFields`; không thử thực thi nội dung ngoài.
6. **P2 — Tài liệu trạng thái:** sửa các tuyên bố “đã kiểm chứng” không còn đúng snapshot; không đồng bộ hoặc sửa docs Mac/Windows thuộc owner khác nếu chưa có yêu cầu.

Với mỗi phát hiện mới: ưu tiên, file/dòng ở commit kiểm tra, bằng chứng/tái hiện, tác động, test đề xuất, owner. Không lẫn giả thuyết với lỗi đã xác nhận.

## 8. Handoff Codex

- **Mục tiêu:** cung cấp chỉ dẫn đủ chi tiết để Muse sửa và kiểm OOXMLKit mà không cần hỏi lại.
- **Đã đối chiếu:** review 31/10, snapshot `1354d7ec`, protocol/changelog và mã OOXMLKit liên quan.
- **Tệp giao:** `docs/sync/DIRECTIVE-MUSE-OOXMLKIT-31-10.md`.
- **Phạm vi Codex:** viết hướng dẫn và đối chiếu mã; không sửa source OOXMLKit, không chạy test/build Swift trên worktree nhánh Muse, không push.
- **Tiếp theo:** Muse thực hiện §2 trên nhánh `muse/*`, báo INBOX-WIN theo §6; chủ vùng Windows/Mac kiểm tra theo §5 và quyết định tích hợp.
