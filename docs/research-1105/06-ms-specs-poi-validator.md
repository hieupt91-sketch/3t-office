> Bản chụp đã lược dữ liệu riêng tư, ngày 05/11/2026. Là nghiên cứu, không phải kết quả đã kiểm; chỗ ghi CHƯA KIỂM vẫn chưa kiểm.

# 06 — Đặc tả Microsoft, Apache POI, cổng kiểm schema OOXML

Ngày làm: 05/11/2026. Mọi số "PoC" dưới đây là số tôi chạy thật trên máy này hôm nay; script và kết quả nằm ở `E:\VNOffice-briefs\research-1105\06-poc\`. Chỗ chưa xác minh ghi **CHƯA KIỂM**. Đây không phải tư vấn pháp lý.

## 0. Kết luận trước — và ba điều phải đính chính

| # | Điều đã nói trước đó | Kết quả kiểm | Trạng thái |
|---|---|---|---|
| 1 | `[MS-OI29500]` có thể thay hàng tháng đo Word thủ công (`00-KHUNG-CHIEN-LUOC.md` mục 3 và bảng hành động) | **Không đúng với đo bố cục.** Trên 38 hành vi Office đã đo trong `docs/QUY-UOC-DOI-CHIEU.md`: 3 có trong tài liệu (8%), 4 có một phần (11%), **31 không có (82%)**. Tài liệu không nói gì về chiều cao dòng, gộp khoảng cách đoạn, phân trang, chiều cao hàng Excel | **Cần báo lại owner** — xem mục 1.4 |
| 2 | "41% tệp cũ, chưa test cái nào" | **Đã lỗi thời.** Q51 (24/10) đã kiểm 20 `.xls` + 20 `.doc`, Q53 đào sâu 9 `.doc`. Mẫu 40 tệp = 14,5% của 276 tệp cũ trên LAN (200 `.xls` + 76 `.doc`). Hồ sơ LAN **không ghi nhận `.ppt` nào**. Lỗ hổng thật còn lại: 236 tệp chưa lấy mẫu, và các thuộc tính `.xls` mà Q51 ghi NOT RUN vì Excel COM bị chặn | Sửa lại cách nói |
| 3 | NPOI "Apache-2.0" | Tệp LICENSE đúng là Apache-2.0, **nhưng bản nhị phân từ 2.8.0 kèm EULA đòi phí bảo trì hằng tháng** với tổ chức có doanh thu. README cũng không nhắc `.doc`/`.ppt` | **Loại** theo luật không trả phí |

**Tin tốt lớn nhất:** cổng schema đáng làm thật. PoC chỉ một buổi đã tìm ra **5 lớp vi phạm schema do chính đường lưu của mình sinh ra, ở 6/8 tệp DOCX** (tệp nguồn sạch), mà bộ đếm trang 8/8 không thấy. Hai lớp đã truy được tới dòng code hoặc cấu trúc cụ thể (mục 3.3).

**Lời hứa bằng sáng chế:** `[MS-DOC]`, `[MS-XLS]`, `[MS-PPT]` **có** tên trong danh sách Open Specification Promise (trích nguyên văn ở mục 1.2), kèm giới hạn cần owner đọc.

---

## 1. Đặc tả mở của Microsoft

### 1.1 Danh mục đã xác minh

Trang, ngày và bản đều đọc từ chính PDF đã tải về. URL theo mẫu `https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/<MÃ>/%5b<MÃ>%5d.pdf`, trừ `[MS-CFB]`.

| Tài liệu | Nội dung | Bản | Ngày | Trang |
|---|---|---|---|---:|
| [`[MS-DOC]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-DOC/%5bMS-DOC%5d.pdf) | Word nhị phân | 12.5 | 17/02/2026 | 580 |
| [`[MS-XLS]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-XLS/%5bMS-XLS%5d.pdf) | Excel nhị phân | 12.2 | 19/08/2025 | 1.126 |
| [`[MS-PPT]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-PPT/%5bMS-PPT%5d.pdf) | PowerPoint nhị phân | 10.1 | 12/11/2024 | 647 |
| [`[MS-XLSB]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-XLSB/%5bMS-XLSB%5d.pdf) | Excel `.xlsb` | 22.0 | 16/10/2026 | 1.131 |
| [`[MS-OI29500]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-OI29500/%5bMS-OI29500%5d.pdf) | Chỗ Office khác ISO/IEC 29500 | 25.0 | 18/08/2026 | 936 |
| [`[MS-OE376]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-OE376/%5bMS-OE376%5d.pdf) | Như trên, cho ECMA-376 | 4.1 | 16/08/2022 | 1.027 |
| [`[MS-ODRAWXML]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-ODRAWXML/%5bMS-ODRAWXML%5d.pdf) | Mở rộng DrawingML | 35.0 | 06/10/2026 | 423 |
| [`[MS-OSHARED]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-OSHARED/%5bMS-OSHARED%5d.pdf) | Kiểu dữ liệu dùng chung | 11.1 | 13/11/2025 | 199 |
| [`[MS-CFB]`](https://winprotocoldocs-bhdugrdyduf5h2e4.b02.azurefd.net/MS-CFB/%5bMS-CFB%5d.pdf) | Vỏ chứa nhị phân | 13.0 | 26/10/2026 | 46 |
| [`[MS-OFFCRYPTO]`](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/MS-OFFCRYPTO/%5bMS-OFFCRYPTO%5d.pdf) | Mã hóa tài liệu | 14.0 | 17/02/2026 | 119 |
| [`[MS-OFFSTANDLP]`](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-offstandlp/d5784a8b-7070-466b-befa-b7bf3724c6f0) | **Chỉ là trang mục lục**, không có PDF riêng | — | trang cập nhật 11/07/2025 | — |

Tải cả bộ: [gói Standards Support](https://officeprotocoldocs-f5hpbjgea6b8gneq.b02.azurefd.net/files/Zip_Files/MSOFFSTAND.zip).

Bổ sung ngoài danh sách được giao, nên đọc khi cần: `[MS-ODRAW]` (hình vẽ trong tệp nhị phân cũ), `[MS-DOCX]`, `[MS-XLSX]`, `[MS-PPTX]` (phần mở rộng `w14`, `x14`...).

### 1.2 Giấy phép và bằng sáng chế

**Thông báo sở hữu trí tuệ, trích nguyên văn** (giống nhau trên [`[MS-OI29500]`](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/1fd4a662-8623-49c0-82f0-18fa91b413b8) và [`[MS-CFB]`](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/53989ce4-7b05-4f8d-829b-d08d6148375b); bìa PDF `[MS-DOC]`, `[MS-XLS]`, `[MS-PPT]` có cùng đoạn Copyrights):

> **Copyrights.** This documentation is covered by Microsoft copyrights. Regardless of any other terms that are contained in the terms of use for the Microsoft website that hosts this documentation, you can make copies of it in order to develop implementations of the technologies that are described in this documentation and can distribute portions of it in your implementations that use these technologies or in your documentation as necessary to properly document the implementation. You can also distribute in your implementation, with or without modification, any schemas, IDLs, or code samples that are included in the documentation. This permission also applies to any documents that are referenced in the Open Specifications documentation.

> **No Trade Secrets.** Microsoft does not claim any trade secret rights in this documentation.

> **Patents.** Microsoft has patents that might cover your implementations of the technologies described in the Open Specifications documentation. Neither this notice nor Microsoft's delivery of this documentation grants any licenses under those patents or any other Microsoft patents. However, a given Open Specifications document might be covered by the Microsoft Open Specifications Promise or the Microsoft Community Promise. [...]

> **Trademarks.** The names of companies and products contained in this documentation might be covered by trademarks or similar intellectual property rights. This notice does not grant any licenses under those rights.

**Về bản quyền:** được sao chép để phát triển phần cài đặt; không có điều khoản buộc mở mã nguồn. Sản phẩm đóng được phép cài đặt theo tài liệu. Không được hiểu thành quyền dùng tên "Microsoft/Word/Excel" làm thương hiệu.

**Về bằng sáng chế — xác nhận cho câu hỏi của điều phối:** [trang Open Specification Promise](https://learn.microsoft.com/en-us/openspecs/dev_center/ms-devcentlp/1c24c7c8-28b0-4ce1-a47d-95fe1ff504bc) (sửa lần cuối 24/02/2023), mục "Office Binary File Formats ... First Published June 30, 2008", liệt kê nguyên văn:

> [MS-DOC]: Word Binary File Format (.doc) Structure Specification
> [MS-OFFCRYPTO]: Office Document Cryptography Structure Specification
> [MS-OSHARED]: Office Common Data Types and Objects Structure Specification
> [MS-PPT]: PowerPoint Binary File Format (.ppt) Structure Specification
> [MS-XLS]: Excel Binary File Format (.xls) Structure Specification
> [MS-XLSB]: Excel Binary File Format (.xlsb) Structure Specification

Cùng trang còn liệt kê `[MS-ODRAW]`, `[MS-ODRAWXML]`, `[MS-DOCX]`, `[MS-XLSX]`, `[MS-PPTX]`, `[MS-CFB]`, và ở nhóm Implementer Notes là `[MS-OE376]`, `[MS-OI29500]`. **`[MS-OFFSTANDLP]` không có** — nó là mục lục, không phải đặc tả.

Nội dung lời hứa:

> Microsoft irrevocably promises not to assert any Microsoft Necessary Claims against you for making, using, selling, offering for sale, importing or distributing any implementation to the extent it conforms to a Covered Specification ("Covered Implementation"), subject to the following.

[FAQ của Microsoft](https://learn.microsoft.com/en-us/openspecs/dev_center/ms-devcentlp/03347966-f8ff-4d53-a05e-63419d4132e2) xác nhận: áp dụng cho phần mềm thương mại lẫn nguồn mở, không phải ký gì, cài đặt một phần vẫn được, khách hàng và nhà phân phối hưởng trực tiếp.

**Giới hạn owner phải đọc:**

1. **Chỉ phần "conforms".** Nguyên văn FAQ: *"The OSP does not apply to any work that you do beyond the scope of the covered specifications."*
2. **Hành vi tự đo bằng COM nằm ngoài đặc tả.** Đây là suy luận của tôi, không phải câu của Microsoft: các quy tắc W1, W2, S31... không có trong tài liệu nào (mục 1.4), nên khó nói chúng được lời hứa che. Ngược lại, ghi chú trong `[MS-OI29500]` được che riêng theo định nghĩa ở nhóm Implementer Notes.
3. **Chỉ phần "described in detail and not merely referenced".** Công nghệ được dẫn chiếu (ví dụ thuật toán ngoài) không được che.
4. **Phiên bản.** Trang ghi: *"This promise applies to the identified version of the following specifications. New versions of previously covered specifications will be separately considered for addition to the list."* FAQ lại viết: *"applies to all existing versions ... unless otherwise noted"*. Nhóm Open XML có cam kết rõ cho bản tương lai; **nhóm nhị phân không có câu đó**. Ý nghĩa với các bản sửa đổi 2026 của `[MS-DOC]`: **CHƯA KIỂM được**, cần luật sư nếu owner muốn chắc.
5. **Điều khoản phòng thủ.** Kiện Microsoft về bằng sáng chế liên quan đặc tả đó thì mất lời hứa với đặc tả đó.
6. **Không che bên thứ ba.** Nguyên văn: không bảo đảm *"that a Covered Implementation would not infringe patents or other intellectual property rights of any third party"*.
7. **[Patent and Program Map](https://learn.microsoft.com/en-us/openspecs/dev_center/ms-devcentlp/13571077-e344-4e6f-a477-369894979798):** công cụ tương tác, không đọc được bằng công cụ của tôi. Số bằng sáng chế cụ thể cho từng tài liệu: **CHƯA KIỂM**.

**Cần owner quyết (tôi không quyết thay):** có dùng lời hứa này làm căn cứ khi cài đặt trực tiếp từ `[MS-DOC]/[MS-XLS]` không, hay chỉ dùng cho kiểm thử; có cần luật sư đọc điểm 2 và 4 trước khi bán rộng không.

### 1.3 `[MS-OI29500]` — thực chất có gì

Áp dụng cho Word, Excel, PowerPoint 2010 đến LTSC 2024 (**gồm 2016**). Một số ghi chú chỉ áp dụng cho bản cụ thể, ví dụ `dateCompatibility` chỉ Office 2010, nên phải lọc.

Tôi tách toàn văn PDF: **1.895 mục, khoảng 3.868 ghi chú** (đếm bằng regex, xấp xỉ).

| Vùng trong tài liệu | Trang | Số mục | Số ghi chú |
|---|---:|---:|---:|
| WordprocessingML (§17) | 61–236 | 529 | 785 |
| SpreadsheetML (§18), gồm 203 hàm công thức | 237–460 | 534 | 1.595 |
| PresentationML (§19) | 460–494 | 100 | 206 |
| DrawingML (§20–21) | 494–600 | 444 | 583 |
| Math, thư mục, thuộc tính (§22) | 600–628 | 106 | 139 |
| Phần 4 — tính năng chuyển tiếp, VML | 629–693 | 141 | 438 |
| Phụ lục — thanh công cụ, lược đồ thêm | 694–916 | — | không phải sai lệch |

Phân loại ghi chú, theo regex nên chỉ là ước lượng:

| Loại | Số | Tỉ lệ |
|---|---:|---:|
| Giới hạn giá trị, kiểu dữ liệu ("Word restricts...") | 1.230 | 32% |
| Bỏ qua, không hỗ trợ | 377 | 10% |
| Giá trị mặc định khác hoặc chuẩn không nêu | 279 | 7% |
| Từ chối, không mở tệp | 27 | <1% |
| Còn lại (làm rõ ngữ nghĩa, công thức, thuật toán chọn font...) | 1.955 | 51% |

**15 sai lệch cụ thể có tác động người dùng thấy** (số trang là trang PDF):

| # | Mục (trang) | Chuẩn nói | Office làm | Tác động |
|---|---|---|---|---|
| 1 | §17.4.80 `trHeight` (94) | Thiếu `hRule` = auto | **atLeast** | Chiều cao hàng |
| 2 | §17.4.80 `trHeight` (94) | `exact` là đúng số đó | Số đó **+ đệm dưới lớn nhất trong hàng** | Hàng cao hơn, trôi trang |
| 3 | §17.3.1.44 `widowControl` (67) | Áp mọi đoạn | **Bỏ qua trong bảng** | Ngắt trang trong bảng |
| 4 | §17.4.63, §17.4.71 `tblW`/`tcW` (89, 92) | `w=0` là rộng 0 | Hiểu là **auto** | Bề rộng bảng |
| 5 | §17.4.57 `tblpPr` (88) | Mặc định neo `page` | `vertAnchor=margin`, `horzAnchor=text` | Vị trí bảng nổi |
| 6 | §17.9.10 `lvlRestart` (123) | Đặt lại khi cấp đó dùng | **Hoặc bất kỳ cấp cao hơn**; bỏ qua trong override | Đánh số |
| 7 | §17.9.25 `start` (125) | Được phép trong override `lvl` | **Bỏ qua** | Đánh số |
| 8 | §17.9.11 `lvlText` (124) | `%n` vượt cấp thì bỏ phần đó | **Bỏ cả lvlText** | Đánh số |
| 9 | §17.7.2 thứ tự style (104) | Numbering trước paragraph style | **Paragraph style trước numbering** | Thụt lề danh sách |
| 10 | §17.7.3 thuộc tính bật/tắt (105) | Có giá trị tài liệu mặc định thì true | Tính theo **số cấp chẵn/lẻ** trong chuỗi style | Đậm/nghiêng sai |
| 11 | §17.3.2.26 `rFonts` (72) | Không nói cách chọn | **Bảng đầy đủ theo dải Unicode** | Font tiếng Việt, xem mục 4 |
| 12 | §17.8.3.1, §17.8.3.10 (120, 122) | `altName` là danh sách phẩy; tên font tự do | Không tách phẩy; tên 1–31 ký tự, không phân biệt hoa thường | Thay font |
| 13 | §18.8.30 `numFmt` (299) | ID 14 = `mm-dd-yy`, 37 = `#,##0 ;(#,##0)` | ID 14 = `m/d/yyyy`, 37 = `#,##0_);(#,##0)`; kèm văn phạm ABNF đầy đủ | Hiển thị số/ngày |
| 14 | §18.17.7 `MATCH`, `SUMIFS`, `VLOOKUP` (430, 448, 451) | `MATCH` không thấy trả `#NUM!`; `SUMIFS` khác cỡ được; `VLOOKUP` luôn cần sắp xếp | `#N/A`; **phải cùng cỡ**; chỉ cần sắp khi `TRUE`/bỏ trống | Kết quả công thức |
| 15 | §21.1.2.3.9, §21.1.2.2.7, §19.3.1.36 (544, 540, 468) | Không mô tả đủ kế thừa | **Thứ tự kế thừa** lstStyle → theme → slide master; `sz` mặc định 1800; mặc định không kerning | Toàn bộ chữ trên slide |

### 1.4 Thực sự thay được bao nhiêu việc đo Word — phép thử có số

Tôi lấy các hành vi **của Office** trong `docs/QUY-UOC-DOI-CHIEU.md` (bỏ lỗi riêng của LibreOffice và HTML), rồi tra toàn văn. Việc phân loại có phần chủ quan nhưng từ khóa tra được đều bằng 0 ở phần lớn dòng:

| Trạng thái | Word (23) | Excel (15) | Ví dụ |
|---|---:|---:|---|
| **Có** | 2 | 1 | W33 đánh số, W10b thứ tự thụt lề, S6 căn mặc định |
| **Một phần** | 2 | 2 | W30 bảng, W32 chuỗi style, S8b mã số dựng sẵn, S24a công thức cột |
| **Không có** | 19 | 12 | W1, W2, W3, W12a, W12b, W12c, W24c, W45, W46, W54, W56; S31a–i, S30c, S32 |

Từ khóa có **0 lần xuất hiện** trong trang 49–917: `lineRule`, `contextualSpacing`, `compatibilityMode`, `keepNext`, `customHeight`, `defaultRowHeight`, `wrapSquare`, `behindDoc`, `DirectWrite`, `GDI`, `autoSpaceDE`.

**Câu trả lời thẳng cho owner:**

- **Không thay được** phần đo tốn công nhất: mô hình dòng, phân trang, độ rộng ký tự, chiều cao hàng Excel, bọc chữ quanh hình. Tài liệu ghi về **ý nghĩa thẻ XML**, không ghi **thuật toán dàn trang**. Vẫn phải đo bằng COM.
- **Thay được một nhóm hẹp hơn:** đánh số, chuỗi style, chọn font theo ký tự, giá trị mặc định, giới hạn giá trị, ngữ nghĩa hàm, mã số dựng sẵn, kế thừa slide. Đọc mục đó thay vì đoán rồi đo.
- **Lợi ích mới mà trước đây không có:** khoảng 1.230 ghi chú về giới hạn giá trị. SDK đã có một số (ví dụ `pgSz`) nhưng PoC mục 3.2 cho thấy nó bỏ sót ít nhất 3 giới hạn thử; mức sót tổng thể chưa đo. Đây là nguồn quy tắc kiểm tệp.
- **"Hàng tháng" chưa chứng minh được và tôi không đề nghị dùng con số đó.** Ước lượng của tôi: đọc có chọn lọc khoảng 2–3 ngày-người cho §17.3–17.9, §18.8, §18.17 (chỉ các hàm LAN dùng), §21.1. Tiết kiệm thực tế: chưa đo được.

**Bằng chứng tài liệu có ích ngay:** đọc đối chiếu đã thấy hai chỗ nghi lệch trong `adapters/libreoffice/writer/writer-adapter.js` (đọc tĩnh, **chưa chạy thử**):

- Dòng 6285 dùng `over.lvlRestart`, trong khi §17.9.10(b) nói Word **bỏ qua** `lvlRestart` trong override.
- Dòng 6283 dùng `over.start`, trong khi §17.9.25(b) nói Word **bỏ qua** `start` trong override.

Cần dựng tệp thử và đo bằng Word COM trước khi sửa. Tài liệu Microsoft cũng có thể không khớp bản 2016.

**`[MS-OE376]`:** dành cho ECMA-376 bản đầu, cập nhật cuối 2022. Giá trị thấp, chỉ tra khi gặp tệp Office 2007.

### 1.5 `[MS-OFFCRYPTO]` và `[MS-CFB]`

**`[MS-OFFCRYPTO]`:**

- Bao phủ: Standard, Agile, Extensible Encryption (§2.3.4), RC4 CryptoAPI (§2.3.5), RC4 (§2.3.6), XOR (§2.3.7), bảo vệ ghi (§2.4), IRM (§2.2).
- Mật khẩu Agile, Standard: *"Limitations on the length of the password... are implementation-dependent"*. Mặc định chung: *"the maximum password length MUST be 255 Unicode characters"*.
- XOR: mật khẩu **cắt còn 15 ký tự** và tài liệu ghi "not recommended". §4.1.3.4 nêu nhiều mật khẩu có thể ra cùng khóa.
- Liên hệ dự án: `platform/security/office_encryption.py` chỉ có `encrypt_package`/`decrypt_package`, không thấy RC4/XOR. Vậy **`.doc`/`.xls` có mật khẩu đi đường nào, có hỗ trợ không: CHƯA KIỂM** trong đợt này; đáng thêm một ca thử vì 41% tệp là định dạng cũ.
- Ghi nhớ "COM từ chối mật khẩu ≥16 ký tự": không tìm thấy câu tương ứng cho Agile trong tài liệu. Tài liệu nói độ dài tùy cài đặt, nên đây vẫn là hành vi đo được, không phải đặc tả.

**`[MS-CFB]`:** 46 trang, ngắn nhất và ổn định. Bản 3 có sector 512 byte, bản 4 có 4.096 byte; ngưỡng mini stream 4.096 byte. Dùng khi cần tự kiểm cấu trúc vỏ, ví dụ phân biệt `.doc` với OOXML mã hóa (lỗi Q51). Không cần tự viết bộ đọc CFB cho sản phẩm: LibreOffice đã có.

---

## 2. Apache POI

### 2.1 Giấy phép và phiên bản

- [`legal/LICENSE`](https://raw.githubusercontent.com/apache/poi/trunk/legal/LICENSE): **Apache License 2.0**. Có các mục bổ sung: schema Office Open XML (`poi-ooxml-full`), `ReplacingInputStream` (MIT), ExceptionUtils, Gradle Wrapper.
- Bản mới nhất **6.0.0 (22/10/2026), đòi JDK 17** ([changes](https://poi.apache.org/changes.html)). Tài liệu khung ghi 5.5.0 đã cũ. Máy này có Java 8 và **không có `javac`**, nên PoC dùng 5.5.1 (bản 5.x mới nhất trên Maven; tải qua Maven Central, hai jar POI đã đối chiếu SHA-1).

### 2.2 Độ trưởng thành

| Thành phần | Jar | POI tự nói gì | PoC của tôi |
|---|---|---|---|
| HSSF `.xls` | `poi` | Thành phần lõi | 20/20 mẫu LAN đọc được; 110/120 fixture |
| HWPF `.doc` | `poi-scratchpad` | *"HWPF is an orphan child waiting to be adopted"*; *"no committer who is really familiar with the Word format"*; *"early stages of development"* | 20/20 mẫu LAN; 87/120 fixture |
| HSLF `.ppt` | `poi-scratchpad` | Đọc/ghi được; không nêu mức trưởng thành | 54/72 fixture (bộ trích thô `QuickButCruddy`) |
| XSSF, XWPF, XSLF | `poi-ooxml` | XWPF: *"none of the committers are actively adding new features"*; XSLF: *"still in early development"* | Không chạy |
| Công thức | `poi` | Trang dev guide: 202 hàm *"As of release 5.2.0"* (có thể đã cũ) | Không chạy |

([tổng quan](https://poi.apache.org/components/index.html), [Word](https://poi.apache.org/components/document/index.html), [PowerPoint](https://poi.apache.org/components/slideshow/index.html))

Trên trang đã đọc, tôi **không tìm thấy** câu "usable, but less full-featured" mà tài liệu khung trích. Lời POI nói về HWPF còn nặng hơn thế.

**Đọc tỉ lệ fixture cho đúng:** đó là bộ test hồi quy của LibreOffice trong `core-master`, lấy ngẫu nhiên 120/343 với `.doc` và `.xls`, gồm thư mục `pass`/`fail` chứa tệp hỏng cố ý. Chúng đo **độ bền trên tệp khó**, không phải tỉ lệ lỗi trên tệp thường. Lỗi HWPF nhiều nhất: `IllegalArgumentException` (17), `ArrayIndexOutOfBounds` (5). Số lỗi mở trên [Bugzilla POI](https://bz.apache.org/bugzilla/): **CHƯA KIỂM** (trang này nay đòi đăng nhập). Có lỗi trích text đang mở: [66467](https://bz.apache.org/bugzilla/show_bug.cgi?id=66467) (biết qua kết quả tìm kiếm, chưa đọc lại được).

### 2.3 Đề xuất "POI làm ý kiến thứ hai" — PoC thật

So từ (chỉ tổng hợp số, không in nội dung) giữa POI và `soffice --convert-to` (LibreOffice 26.2.6.3) trên `<kho tệp thử nội bộ>-legacy`, 20 `.doc` + 20 `.xls`:

| Bộ | Khớp hoàn toàn | Có lệch | Tệp lệch |
|---|---:|---:|---|
| `.xls` (sau khi loại nhiễu log, xem dưới) | 17/20 | 3/20 | legacy08, 13, 18 |
| `.doc` | 14/20 | 6/20 | legacy03, 07, 12, 14, 17, 20 |

- **Tốc độ:** khoảng 0,5 giây/tệp.
- **Bẫy đã gặp:** POI in một dòng lỗi log4j vào stdout, tạo đúng 9 từ thừa ở **mọi** tệp `.xls`. Nếu không soi sẽ tưởng 20/20 lệch. Cách khắc phục: thêm log4j-core hoặc tắt log.
- **So với lỗi đã biết của Q51:**
  - `.xls`: bắt được 3/4 tệp Q51 báo sai (08, 13, 18; thiếu 06). Lưu ý Q51 đo vòng lưu, còn đây đo lúc đọc, nên trùng tên chưa chứng minh cùng nguyên nhân.
  - `.doc`: chỉ 4/9 tệp có lỗi (07, 14, 17, 20), mà 17 và 20 lệch rất ít. **Bỏ sót 06, 10, 13, 15, 18.**
- **Vì sao bỏ sót:** lỗi `.doc` nằm ở shape, lề, font, số đoạn, hoặc **sau bộ lọc** (đường `.doc`→`.docx`→HTML). PoC này so POI với **LibreOffice thuần**, không chạm đường của app.
- `legacy07` thừa 59 từ, `legacy14` thừa 135 từ phía POI, không phải mã trường. Giả thuyết chữ ẩn: **CHƯA KIỂM**.

**Bắt được:** mất hoặc sai chữ ngay ở bộ lọc LibreOffice; với HSSF còn có thể so công thức, giá trị.

**Bỏ sót:** bố cục, số trang, shape, font; lỗi ở lớp app; mọi thứ POI không đọc được. Khi hai bên cùng sai thì không thấy. POI không phải chuẩn: lệch chỉ là tín hiệu để soi.

**Giá trị thật nằm ở chỗ khác:** Q51 ghi `NumberFormat`, tên vùng, biểu đồ, ẩn/hiện của `.xls` là **NOT RUN vì Excel COM bị chặn**. HSSF có API đọc phần lớn các thuộc tính này, nên có thể lấp đúng lỗ đó (khả năng cụ thể với từng thuộc tính: **CHƯA KIỂM**). Với `.doc`, Word COM vẫn mạnh hơn hẳn; POI chỉ là phụ. Với `.ppt`, LAN không có tệp nào, nên **không đáng đầu tư**.

**Công ước lượng:**

| Việc | Ngày-người |
|---|---:|
| Bộ so text `.doc`/`.xls`, xử lý log, tích hợp `batch_document_audit` | 1 |
| Trích cấu trúc HSSF (định dạng số, tên, ẩn/hiện, gộp ô), cần một lớp Java và JDK ở máy dựng | 2–3 |
| Chạy trên toàn bộ 276 tệp cũ, phân loại lệch | 1–2 |

Java chỉ trong harness, không vào bản phát hành. Máy Mac và CI cần Java riêng.

**Phương án không cần Java cho `.xls`:** [`xlrd`](https://raw.githubusercontent.com/python-excel/xlrd/master/LICENSE) — LICENSE kiểu BSD, có điều khoản ghi công trong tài liệu quảng cáo của phần David Giffin (chỉ harness nên ít vướng). Khả năng đọc định dạng: **CHƯA KIỂM**.

### 2.4 Thay thế

| Dự án | Giấy phép (từ tệp gốc) | Đánh giá |
|---|---|---|
| [`nissl-lab/npoi`](https://github.com/nissl-lab/npoi) | LICENSE Apache-2.0, **nhưng `OSMFEULA.txt`**: *"an EULA on binary releases is added to the repo and nuget packages since 2.8.0 that requires payment of the maintenance fee"* cho tổ chức có doanh thu | **Loại.** README chỉ nêu `xls, xlsx, docx`. Tự dựng từ nguồn có thể tránh EULA: **CHƯA KIỂM**, không đáng thử |
| [`plutext/docx4j`](https://github.com/plutext/docx4j) | [`legals/LICENSE`](https://raw.githubusercontent.com/plutext/docx4j/master/legals/LICENSE) Apache-2.0 | Chỉ OOXML. README không nêu kiểm schema. Không giải bài toán định dạng cũ |

---

## 3. Cổng kiểm schema OOXML

### 3.1 Công cụ

| Công cụ | Giấy phép | Trạng thái |
|---|---|---|
| [`dotnet/Open-XML-SDK`](https://github.com/dotnet/Open-XML-SDK) | [LICENSE](https://raw.githubusercontent.com/dotnet/Open-XML-SDK/main/LICENSE) MIT, © .NET Foundation | [3.4.1, 06/01/2026](https://raw.githubusercontent.com/dotnet/Open-XML-SDK/main/CHANGELOG.md). Có `OpenXmlValidator`, [phiên bản](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.fileformatversions) Office2007 → 2021, Microsoft365. Thư mục [`data/`](https://github.com/dotnet/Open-XML-SDK/tree/main/data) có `schemas`, `parts`, `typed`, `schematrons.json`, sinh tự động, **không phải XSD** — lấy ra dùng từ Python được về lý thuyết nhưng phải tự viết bộ chạy, không đáng |
| [`mikeebowen/OOXML-Validator`](https://github.com/mikeebowen/ooxml-validator) | [LICENSE](https://raw.githubusercontent.com/mikeebowen/OOXML-Validator/main/LICENSE) MIT, © Michael Bowen | v2.1.6, 12/12/2024 (gần 2 năm chưa có bản mới); `win-x64.zip` 43,6 MB. **Chạy được trên máy không có .NET.** Xuất JSON. 25 sao |
| [`openxml-audit`](https://pypi.org/project/openxml-audit/) | [LICENSE](https://raw.githubusercontent.com/bramalkema/openxml-audit/main/LICENSE) MIT, © 2026 Bram Alkema | 0.8.0 (02/09/2026), Beta, một người giữ. Quảng cáo "SDK Parity 100%" — **PoC cho thấy không đúng** |
| lxml + XSD ECMA-376 | [lxml](https://pypi.org/project/lxml/) BSD-3 (metadata và tệp giấy phép trong gói) | Tốt nhất làm lớp nền, xem dưới |

Có sẵn trong LibreOffice: `configure.ac` có `--with-export-validation`, dùng `officeotron`, chỉ cho bản dựng từ nguồn. Không hợp với cách mình dùng bản đóng gói. [Bài năm 2014](https://lists.freedesktop.org/archives/libreoffice/2014-March/059859.html) cho biết ngay LibreOffice cũng còn lỗi khi bật ngoài Calc. Giấy phép officeotron: **CHƯA KIỂM**.

**Nguồn XSD và giấy phép:**

- [ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/) bản 5 tải miễn phí. **Đã mở zip xác minh:** Transitional nằm trong `ECMA-376-4_5th_edition_december_2016.zip` (`OfficeOpenXML-XMLSchema-Transitional.zip`, 26 XSD); Strict trong Part 1 (21 XSD); có cả RELAX NG.
- Tiền lệ: LICENSE của POI ghi các schema này thuộc ECMA-376, dẫn điều 9.4 bylaws của Ecma (*"All documents when approved shall be made available to all interested parties without restriction"*) và ghi *"both Microsoft and Adobe have granted patent licenses to this work"*.
- **Điểm chưa chắc:** [chính sách bản quyền văn bản của Ecma](https://www.ecma-international.org/policies/by-ipr/ecma-text-copyright-policy) có câu *"the content of this document itself may not be modified in any way"*. Trang đó không nói riêng về schema; tôi không tìm được thông báo bản quyền trong 40 trang đầu PDF Part 4. Thông báo áp dụng đúng cho XSD của ECMA-376: **CHƯA KIỂM**.
- **Cách làm an toàn:** không commit XSD đã sửa. Script tải từ Ecma lúc dựng harness, kiểm SHA-256, giữ ngoài repo; miếng vá `xml:space` đặt trong tệp wrapper riêng. Không đưa vào sản phẩm.

### 3.2 PoC so ba công cụ trên 12 tệp DOCX tổng hợp có lỗi cài sẵn

Tôi chỉ chạy hai công cụ bên thứ ba trên **tệp tổng hợp, không có dữ liệu thật**. ✔ = bắt được.

| Lỗi cài | XSD + lxml | SDK (OOXML-Validator, Office2016) | openxml-audit |
|---|:--:|:--:|:--:|
| Tệp đúng, phải không báo | ✔ im lặng | ✔ im lặng | im lặng, sau khi lọc 3 báo "thiếu relationship" tự nó thêm |
| Sai thứ tự con của `pPr` | ✔ | ✔ | ✔ |
| Sai thứ tự `settings.xml` | ✔ | ✔ | ✔ |
| `w:num` trước `abstractNum` | ✔ | ✔ | ✔ |
| `w:ind firstLine` số lẻ | ✔ | ✔ | ✘ |
| Trang rộng 99999 (giới hạn Office) | ✘ | ✔ | ✔ |
| `r:id` trỏ vào chỗ không có | ✘ | ✔ | ✔ |
| Trùng `docPr id` | ✘ | ✔ | ✘ |
| `numId` không tồn tại | ✘ | ✘ | ✔ |
| `ilvl=9` (Word từ chối, §17.9.6) | ✘ | ✘ | ✘ |
| 64 ô trong hàng (Word coi là hỏng, §17.4.37) | ✘ | ✘ | ✘ |
| Hàng `exact` cao 0 (§17.4.80) | ✘ | ✘ | ✘ |

**Kết luận:** không công cụ nào đủ một mình. Ba lỗi cuối **chỉ `[MS-OI29500]` mới nói** — đây là chỗ tài liệu đó tạo giá trị cụ thể nhất.

### 3.3 PoC trên tệp thật: lxml + XSD Transitional

Lấy bản lưu của đường hiện tại (`logs\Q75-work\docx-audit`, 02/11/2026) và đối chiếu với nguồn:

| Nhóm | Tệp | Sạch | Lỗi | Thời gian |
|---|---:|---:|---:|---:|
| Word tự tạo (`landocx`, đối chứng) | 23 đọc được (1 không phải ZIP) | 22 | 16, cùng từ d13 | 1,7 s |
| **Bản lưu DOCX** | 8 | **1** | 83 | 0,8 s |
| Excel tự tạo (đối chứng) | 28 | 28 | 0 | 48,6 s |
| Bản lưu XLSX (LibreOffice ghi, khác tệp nguồn) | 28 | 28 | 0 | 21,0 s |
| Bản lưu PPTX | 5 | 0 | 70 — **báo nhầm**, xem dưới | 0,1 s |

**Lỗi do mình sinh ra (nguồn không có):**

| Lớp | Tệp | Lỗi | Nguyên nhân |
|---|---|---|---|
| Thứ tự `settings.xml` | d01, d02 | `evenAndOddHeaders` sau `compat` | `ooxml_zip_patch.py:26685` và `:27594` nối `<w:evenAndOddHeaders/>` ngay trước `</w:settings>` (đã đọc code; chưa xác định dòng nào chạy cho hai tệp này) |
| Thứ tự `numbering.xml` | d20 | Thứ tự thực tế: 91 `abstractNum`, 16 `num`, `numIdMacAtCleanup`, rồi 127 `num` | Khớp với việc gộp W35b nối `num` sau cùng (suy luận, chưa đọc đoạn code) |
| Giá trị âm | d02, d20 | `w:firstLine` âm (ví dụ -709), kiểu không dấu | **CHƯA KIỂM** nguồn gốc |
| Thuộc tính sai chỗ | d03 | `w:spacing w:val` trong `pPr` (`val` là của `rPr`) | **CHƯA KIỂM** nguồn gốc |
| `wps`/`wpg` trần | d06 (59), d07 (1) | Nguồn bọc trong `mc:AlternateContent`; bản lưu thì không | Nghi Word 2016 chấp nhận, ứng dụng cũ thì không: **CHƯA KIỂM** |

**Mức nghiêm trọng, nói cho đúng:** báo cáo Q75 và các gate trước ghi 8/8 tệp này khớp trang với Word, nên Word dung thứ. **Đợt này tôi không mở lại bằng Word COM**, và chưa thử trên ứng dụng khác. Rủi ro thật là với ứng dụng nghiêm hơn và bản Word khác. Đây đúng là lớp lỗi "trông đúng mà tệp sai" mà tài liệu khung lo. Cũng lưu ý tài liệu khung mô tả "Word báo hỏng"; **PoC chưa chứng minh trường hợp này**, nhưng `docs/QUY-UOC-DOI-CHIEU.md` (W40b, S27a) ghi hai lần tệp từng thực sự hỏng do lỗi cùng họ.

**Báo nhầm phải xử lý — lý do không thể dùng XSD trần:**

| Báo nhầm | Số lượng | Bằng chứng | Xử lý |
|---|---:|---|---|
| `xml:space` trong SpreadsheetML | 42.460 bản lưu, 17.624 đối chứng, trước khi lọc | ECMA không khai báo; §18.3.1.40(i) xác nhận Excel dùng | Bỏ thuộc tính trước khi kiểm |
| `wml.xsd` không biên dịch | toàn bộ DOCX | Thiếu import namespace `xml` | Wrapper |
| `buSzPct val="45000"` | 70 | XSD chỉ nhận dạng `45%`, nhưng **25 fixture do PowerPoint tạo đều viết số thập phân** | Danh sách miễn |
| Nội dung `mc:Ignorable`, `AlternateContent` | — | Word nào cũng dùng | Tiền xử lý MCE (đã có trong PoC) |
| `w:shd`, `w:zoom` ở d13 | 16 | Có sẵn từ nguồn; §17.15.1.94(a) xác nhận `zoom` không luôn cần `percent` | **So chênh lệch với nguồn** |

Chưa kiểm: `docProps/core.xml`, `[Content_Types].xml`, `.rels`, VML, các part mở rộng `w14`/`x14`, Strict.

### 3.4 Đề xuất cụ thể, có giá

Luật gate: **lưu không được sinh thêm lỗi so với nguồn; tài liệu tạo mới phải 0 lỗi** (sau danh sách miễn có lý do ghi rõ).

| Lớp | Nội dung | Vị trí đề xuất | Công | Chạy khi nào |
|---|---|---|---:|---|
| **L1** | lxml + XSD ECMA, MCE, danh sách miễn, so với nguồn; thêm `docPr` trùng và `r:id` treo (đã có trong PoC) | `scripts/layout-audit/`, gọi từ `batch_document_audit.py`; test trong `tests/` | **1,5** | Mọi thay đổi lưu/OOXML |
| **L2** | Bộ quy tắc `[MS-OI29500]`: `ilvl` 0–8, tối đa 63 ô, `exact` ≠ 0, `abstractNumId` không âm, `pgSz`/`pgMar` ≤ 31680, tên font ≤ 31, `numId` tồn tại, `row@r` tăng dần, `col` ≤ 16384... khoảng 30 quy tắc đầu | Cùng script | **1–2** | Như L1 |
| **L3** | OOXML-Validator CLI làm ý kiến thứ hai | Tùy chọn, hằng đêm | **0,5** | Trước phát hành |
| **Sửa** | 5 lớp lỗi mục 3.3 | `ooxml_zip_patch.py` — phải chạy batch + `npm test` theo quy tắc | **2** | Một lần |
| **Mở rộng** | Áp cho đầu ra OOXMLKit trên Mac; Python chạy được trên Mac, cần đội Mac xác nhận | `ports/ios/` | **0,5–1** | Khi Mac lưu |

**Tổng khoảng 5,5–7 ngày-người**, không thêm gì vào bản phát hành. Phụ thuộc mới chỉ ở test: `lxml` (BSD-3), tùy chọn CLI 43,6 MB.

- **Rủi ro:** chặn nhầm do báo nhầm → bắt đầu ở chế độ cảnh báo trên 1 tuần, rồi mới chặn.
- **Hoàn tác:** tắt bước gọi trong batch.
- **Kiểm thử cổng:** dùng lại 12 tệp tổng hợp trong `06-poc\synth.py` làm test âm.
- **Theo `AGENTS.md` mục 6:** đây là thay đổi >3 tệp và thêm phụ thuộc, cần plan riêng trước khi code.

---

## 4. Cốt lõi để tự xây

Phạm vi: **không** viết lại LibreOffice. "Tự xây" chỉ áp dụng cho phần mình đã tự giữ: canvas và overlay JS, hậu xử lý `ooxml_zip_patch.py`, `apps/sheet/formula-engine.js`, OOXMLKit trên Mac. Thứ tự theo tác động người dùng thấy, dùng tần suất LAN (`lan-usage-profile`) và ưu tiên Word + Excel trước. Xếp hạng là **đánh giá của tôi**. Mọi quy tắc phải **đo lại bằng COM trên bản 2016 trước khi khóa**, vì ghi nhớ dự án đã nhiều lần cho thấy mô tả có thể sai và tài liệu áp cho nhiều phiên bản.

| Hạng | Quy tắc | Nguồn | Vì sao | Tình trạng hiện tại |
|---:|---|---|---|---|
| 1 | **Định dạng số Excel:** bảng ID dựng sẵn, văn phạm mã định dạng, 3 phần = dương/âm/không, `%` áp mọi số, tối đa 255 ký tự | §18.8.30–31 (299–310) | Hiển thị ở mọi ô; lỗi nhìn thấy ngay | S7, S8, S8b giữ mã gốc; đối chiếu đủ bảng: CHƯA KIỂM |
| 2 | **Hàm LAN thật dùng:** `VLOOKUP` (91% công thức), `SUMIFS`, `SUM`, `IF`, `MID`; thêm `MATCH`, `INDEX`, biểu thức >32.767 ký tự = `#VALUE!` | §18.17.7, §18.17.2 (391–451) | Sai kết quả là lỗi nặng nhất của bảng tính. `SUMIF`, `TRIM`, `OR`, `TEXT`, `COUNTIF` **không có ghi chú** nên vẫn phải dựa bộ chuẩn | Có engine và bộ golden; từng ghi chú: CHƯA KIỂM |
| 3 | **Đánh số danh sách:** `lvlRestart`, `start` trong override, `lvlText`, `isLgl`, bullet dùng chữ nguyên văn, `lvlJc` | §17.9 (123–125) | Danh sách ở 53/115 DOCX | W33 có; **2 chỗ nghi lệch ở `writer-adapter.js:6283, 6285`** |
| 4 | **Bảng Word:** thiếu `hRule` = atLeast; `exact` + đệm dưới; `w=0` = auto; `widowControl` bỏ trong bảng; giải xung đột viền; hai bảng liền kề | §17.4, §17.3.1.44 (67, 81–95) | Bảng ở 86/115 DOCX; ảnh hưởng số trang | `:7242` đã mặc định `atLeast`; phần "+ đệm dưới" và viền: CHƯA KIỂM |
| 5 | **Chọn font theo ký tự:** Basic Latin → `ascii`; `00A0–00FF`, `0100–017F`, `0180–024F`, `1E00–1EFF` → `hAnsi`, trừ ngoại lệ gắn hint `eastAsia`; `cs`/`rtl` → `cs` | §17.3.2.26(b) (72) | Chữ Việt rơi vào `hAnsi` còn ASCII vào `ascii`; tệp khai báo hai font khác nhau sẽ lộ ngay. Tần suất thật: chưa đo | `hAnsi` chỉ thấy trong `ooxml_zip_patch.py`, **không có trong `writer-adapter.js`**; canvas xử lý thế nào: CHƯA KIỂM |
| 6 | **Chuỗi style:** paragraph style trước numbering; thuộc tính bật/tắt tính chẵn/lẻ; `jc` mặc định trái | §17.7.2–3, §17.3.1.13 (63, 104–105) | Đậm/nghiêng và thụt lề sai trên nhiều tệp | W10b khớp §17.7.2; bật/tắt: CHƯA KIỂM |
| 7 | **Đọc XLSX từ nguồn khác:** `c@r` thiếu thì suy từ ô trước; `row@r` ≤ 1048576; `col` ≤ 16384, `width` ≤ 255; căn mặc định general/bottom | §18.3.1.4, .13, .73, §18.8.1 (251–295) | Tệp từ phần mềm khác; lỗi kiểu lan23 | S6, S32 có phần; `c@r`: CHƯA KIỂM |
| 8 | **Kế thừa thuộc tính slide:** lstStyle → theme → master; placeholder theo `idx`; `sz` 1800; không kerning; `spAutoFit` đổi cỡ **hình** chứ không co chữ | §21.1.2, §19.3.1.36 (468, 536–544) | Quyết định toàn bộ chữ trên slide; xếp sau vì owner ưu tiên Word + Excel | OOXMLKit có `lstStyle`; đủ thứ tự: CHƯA KIỂM |
| 9 | **Giới hạn giá trị khi ghi** (bộ L2 mục 3.4) | Rải rác | Tránh Word từ chối tệp; ít khi gặp nhưng hậu quả nặng | Chưa có |
| 10 | **Mật khẩu tệp cũ:** RC4 CryptoAPI, RC4, XOR (15 ký tự) | `[MS-OFFCRYPTO]` §2.3.5–7 | Tệp cũ có mật khẩu; cần đo xem LibreOffice đã xử lý đến đâu **trước khi** viết gì | CHƯA KIỂM |

**Không nên tự xây:** bộ đọc `.doc/.xls/.ppt` hoặc CFB (LibreOffice đã có, đúng luật REUSE); `.xlsb`; các phần còn lại của 3.868 ghi chú. Đọc theo tần suất LAN, không đọc tuần tự.

**Vẫn phải đo bằng COM (không có tài liệu):** chiều cao dòng, gộp khoảng cách đoạn, ngắt trang, chiều cao hàng và độ rộng ký tự Excel, bọc chữ quanh hình.

---

## 5. Bảng kết luận

| Đối tượng | Giấy phép | Kết luận |
|---|---|---|
| `[MS-OI29500]` | IPR notice; có trong OSP | **Dùng, có chọn lọc.** Tốt cho ngữ nghĩa XML, giới hạn, hàm. **Không** thay đo bố cục |
| `[MS-DOC]`, `[MS-XLS]`, `[MS-PPT]` | IPR notice; **có trong OSP**, có giới hạn | Tra cứu khi điều tra lỗi. Không viết bộ đọc mới |
| `[MS-OFFCRYPTO]`, `[MS-CFB]` | IPR notice; có trong OSP | Tra khi làm tệp mật khẩu, nhận dạng vỏ |
| `[MS-OE376]`, `[MS-OSHARED]`, `[MS-XLSB]`, `[MS-ODRAWXML]` | IPR notice; có trong OSP | Chỉ tra khi cần |
| `[MS-OFFSTANDLP]` | — | Mục lục, không phải đặc tả |
| Apache POI 5.5.1 | Apache-2.0 | **Làm có giới hạn:** ưu tiên HSSF lấp lỗ Excel COM; text `.doc` chỉ phụ; bỏ `.ppt` |
| NPOI | Apache-2.0 + **EULA thu phí** | **Loại** |
| docx4j | Apache-2.0 | Không cần |
| XSD ECMA + lxml | Tiền lệ POI tốt; thông báo cụ thể CHƯA KIỂM; lxml BSD-3 | **Làm ngay**, tải lúc dựng, không commit bản sửa |
| Open XML SDK / OOXML-Validator | MIT / MIT | **Ý kiến thứ hai** trước phát hành |
| openxml-audit | MIT, Beta | Không dựa vào; bắt được `numId` nhưng sót 2 lỗi SDK bắt được |

## 6. Danh sách việc, xếp hạng và có giá

| Hạng | Việc | Công (ngày-người) | Lợi ích | Cần owner? |
|---:|---|---:|---|---|
| 1 | Cổng L1 + sửa 5 lớp lỗi DOCX | 3,5 | Đã có lỗi thật để sửa; chặn lớp lỗi hiện mù | Duyệt plan |
| 2 | Báo lại owner về `[MS-OI29500]`, sửa tài liệu khung (mục 0) | 0,1 | Tránh quyết định dựa trên số sai | **Có** |
| 3 | Đo Word COM 2 chỗ nghi ở `writer-adapter.js:6283, 6285` | 0,5 | Có thể là lỗi đánh số thật | Không |
| 4 | Bộ quy tắc L2 từ `[MS-OI29500]` | 1–2 | Bắt lỗi cả SDK lẫn XSD bỏ sót | Không |
| 5 | Đọc chọn lọc `[MS-OI29500]` theo hạng 1–7 mục 4, ghi vào `QUY-UOC-DOI-CHIEU.md` sau khi đo lại | 2–3 | Giảm đoán sai | Không |
| 6 | Trích cấu trúc HSSF cho toàn bộ `.xls` LAN | 3–5 | Lấp NOT RUN của Q51 khi Excel COM bị chặn | Duyệt thêm Java vào harness |
| 7 | Mở rộng mẫu tệp cũ: 40 → 276 bằng các bộ kiểm hiện có | 1–2 máy, 1 phân loại | Con số 14,5% lên 100% | Không |
| 8 | L3 OOXML-Validator trước phát hành | 0,5 | Bắt `docPr`, giới hạn... | Không |
| 9 | Ca thử `.doc/.xls` có mật khẩu | 0,5 | Biết tình trạng thật | Không |
| 10 | Đọc thông báo bản quyền XSD ECMA, Patent Map | 0,2 | Khép các mục CHƯA KIỂM | Có thể cần luật sư |

Công là ước lượng của tôi, chưa qua thực tế dự án.

**Owner cần quyết:** (a) mức dựa vào lời hứa bằng sáng chế (mục 1.2); (b) có cho Java vào harness không; (c) cổng L1 có chặn merge sau tuần cảnh báo không.

## 7. Giới hạn đợt làm này và dọn dẹp

- **Tệp LAN:** chỉ đọc cục bộ, chỉ báo số tổng hợp, không có nội dung nào trong báo cáo. Công cụ bên thứ ba không phải Apache chỉ chạy trên tệp tổng hợp. Thư mục văn bản POI/LibreOffice trích ra đã xóa khỏi scratchpad.
- **Tác dụng phụ đã xử lý:** glob `*.doc` trúng hai tệp khóa ẩn `~$gacy07.doc`, `~$gacy10.doc` có sẵn từ 24/10 (tôi không đụng), làm LibreOffice của tôi tạo `.~lock.~$gacy07.doc#` trong `<kho tệp thử nội bộ>-legacy`. Đã xóa đúng tệp đó. Hai tệp `~$` cũ vẫn còn và sẽ làm nhiễu các glob khác.
- **Không sửa repo:** không có thay đổi nào trong `E:\VN OFice` ngoài xóa tệp khóa trên; không commit.
- **Không chạy:** Word/Excel COM, `npm test`, app thật. PASS/FAIL ở đây chỉ nói về PoC.
- **Bản lưu XLSX** lấy từ `_batch_document_audit` (18/10), cũ hơn mã hiện tại; DOCX từ Q75 (02/11). PPTX từ `docs/audit-results-0610`, cũ hơn nữa. Nên chạy lại khi cổng xong.
- **Phân loại ghi chú** dùng regex; **bảng 38 hành vi** có phán đoán của tôi. Cả hai để định hướng, không phải số đo chính xác.
- **Đã đọc chọn lọc,** không đọc hết 936 trang; `[MS-DOC]`, `[MS-XLS]`, `[MS-PPT]`, `[MS-XLSB]`, `[MS-ODRAWXML]`, `[MS-OSHARED]`, `[MS-OE376]` chỉ kiểm phiên bản và số trang.

## Nguồn chính

- Open Specification Promise: https://learn.microsoft.com/en-us/openspecs/dev_center/ms-devcentlp/1c24c7c8-28b0-4ce1-a47d-95fe1ff504bc
- FAQ: https://learn.microsoft.com/en-us/openspecs/dev_center/ms-devcentlp/03347966-f8ff-4d53-a05e-63419d4132e2
- Office File Formats: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-offfflp/6ae2fd93-51fc-4e75-a54a-1b175c627b51
- Standards Support: https://learn.microsoft.com/en-us/openspecs/office_standards/ms-offstandlp/d5784a8b-7070-466b-befa-b7bf3724c6f0
- ECMA-376: https://ecma-international.org/publications-and-standards/standards/ecma-376/
- POI LICENSE: https://raw.githubusercontent.com/apache/poi/trunk/legal/LICENSE
- Open XML SDK LICENSE: https://raw.githubusercontent.com/dotnet/Open-XML-SDK/main/LICENSE
- OOXML-Validator LICENSE: https://raw.githubusercontent.com/mikeebowen/OOXML-Validator/main/LICENSE
- NPOI: https://github.com/nissl-lab/npoi
