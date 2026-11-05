> Bản chụp đã lược dữ liệu riêng tư, ngày 05/11/2026. Là nghiên cứu, không phải kết quả đã kiểm; chỗ ghi CHƯA KIỂM vẫn chưa kiểm.

# 07 — LỢI THẾ TIẾNG VIỆT: những việc Microsoft Office sẽ không bao giờ làm

**Ngày:** 05/11/2026 · **Người soạn:** Claude (agent nghiên cứu) · **Phạm vi:** VN Writer / VN Sheet / VN Slides
**Mục đích:** xác định và đặc tả cụ thể các tính năng CHỈ có ý nghĩa với người Việt, mà Word/Excel/PowerPoint thật không làm (hoặc làm sai), để biến thành ticket thật.

> **Quy ước nguồn:** mọi con số pháp lý trong tài liệu này được trích từ **văn bản gốc** (PDF Phụ lục Nghị định 30/2020/NĐ-CP), không lấy từ blog. Chỗ nào chưa xác minh được ghi rõ **CHƯA KIỂM**.

---

## 0. TÓM TẮT ĐIỀU HÀNH

Có **2 tính năng "sát thủ"** (không đối thủ nào có, nhu cầu thật, không vướng bản quyền) và **4 tính năng bổ trợ**:

| # | Tính năng | Vì sao Office không làm | Bằng chứng mạnh nhất |
|---|---|---|---|
| **VN-1** | **Chuẩn văn bản hành chính NĐ 30/2020** — bộ định dạng 1 nút + bộ kiểm tra vi phạm + 12 mẫu chính thức | Microsoft không nhúng luật của một nước vào Word | Đã trích đủ toàn bộ Phụ lục I từ PDF gốc; VN Office đã có sẵn 2 mảnh ghép (preset lề + danh sách Điều/Khoản/Điểm) |
| **VN-2** | **Đọc được bộ mã cũ TCVN3/VNI/VISCII/VPS** (tự nhận dạng khi mở + chuyển hàng loạt) | LibreOffice **chỉ** có Windows-1258 (xác minh trong `core-master`); Word cũng vậy | **Đã chứng minh bằng file thật của chủ dự án**: `<tệp TCVN3 thật phía Windows>` chứa `<mẫu TCVN3>` (= "<cụm mẫu>" mã TCVN3) + font `.VnTime/.VnTimeH/.VnArial` |
| **VN-3** | **Sắp xếp tiếng Việt theo âm tiết** (đúng thứ tự từ điển) | ICU/CLDR `vi` **sai** với từ nhiều âm tiết; Excel dùng chính ICU/NLS | Đã đo trong Node: `Intl.Collator('vi')` xếp `cà phê` **trước** `ca sĩ`, `hòa bình` **trước** `hoa hồng`, `án mạng` **trước** `an toàn` — cả 3 đều sai thứ tự từ điển |
| **VN-4** | **Hàm đọc số thành chữ** (`DOCSO`/`BANGCHU`) sẵn trong Sheet | Excel chỉ có `BAHTTEXT` (tiếng Thái); tiếng Việt phải tự viết VBA | Nhu cầu kế toán phổ quát; hóa đơn/chứng từ bắt buộc có "số tiền bằng chữ" |
| **VN-5** | **Dấu thanh kiểu cũ ⇄ kiểu mới** (hoà ⇄ hòa) + chính tả + autocorrect lỗi gõ VN | Word không biết "hoà" và "hòa" là cùng một từ | Đã đo: `Intl.Collator('vi')` coi `hòa` ≠ `hoà` (trả về 1) |
| **VN-6** | Âm lịch, định dạng số/tiền/ngày VN, mẫu bảng lương/BHXH/TNCN | Không phải thị trường của Microsoft | Rủi ro pháp lý: thuế TNCN **vừa đổi** 2026 (biểu 5 bậc, giảm trừ 15,5tr) → không được hard-code |

**Khuyến nghị thứ tự làm:** VN-2 → VN-1 → VN-4 → VN-3 → VN-5 → VN-6.
VN-2 đứng đầu vì: rẻ nhất, không ai có, và chạm trực tiếp vào 41% corpus `.doc/.xls` cũ mà hiện ta mở ra là chữ rác.

---

## 1. VN-1 — CHUẨN VĂN BẢN HÀNH CHÍNH VN (Nghị định 30/2020/NĐ-CP)

### 1.1. Tính năng là gì

Ba phần, nằm trong một nhóm ribbon mới của VN Writer (đề xuất tab **"Hành chính VN"**, hoặc nhóm "Chuẩn NĐ 30" trong tab Bố trí trang):

1. **"Áp dụng chuẩn NĐ 30" (1 nút)** — đặt khổ giấy, lề, phông, cỡ chữ, giãn dòng, giãn đoạn, số trang, và các style đặt tên theo đúng thành phần thể thức (`VN30_QuocHieu`, `VN30_TieuNgu`, `VN30_TenCoQuan`, `VN30_SoKyHieu`, `VN30_DiaDanhNgay`, `VN30_TenLoai`, `VN30_TrichYeu`, `VN30_CanCu`, `VN30_NoiDung`, `VN30_Dieu`, `VN30_Khoan`, `VN30_Diem`, `VN30_ChucVu`, `VN30_HoTen`, `VN30_NoiNhan`, `VN30_NoiNhanList`, `VN30_PhuLuc`…).
2. **"Kiểm tra thể thức" (checker)** — panel bên phải liệt kê từng vi phạm, **có trích dẫn chính xác điều/mục/khoản của Phụ lục I**, nút "Sửa ngay" cho từng dòng. Đây là phần không ai có.
3. **Thư viện 12 mẫu chính thức** (Phụ lục III) trong backstage "Mới" → "Mẫu hành chính VN".

### 1.2. Ai cần

Cơ quan nhà nước, doanh nghiệp nhà nước (đối tượng áp dụng bắt buộc theo Điều 2), trường học, bệnh viện, UBND xã/phường, và mọi tổ chức chính trị – xã hội "căn cứ quy định của Nghị định này… để áp dụng cho phù hợp" (Điều 2 khoản 2). Đây chính là tập khách hàng lớn nhất của một bộ Office Việt Nam.

### 1.3. Vì sao Word không làm

Microsoft không nhúng quy định hành chính của từng quốc gia vào sản phẩm. Trên thực tế người Việt đang xoay bằng: file `.dot/.docx` mẫu truyền tay, hoặc tự nhớ "Times New Roman 14, lề 3-2-2". **Không có bất kỳ công cụ nào kiểm tra lại văn bản và chỉ ra vi phạm.** Đó là chỗ trống.

### 1.4. ĐẶC TẢ CHÍNH XÁC (trích nguyên văn Phụ lục I)

**Nguồn gốc (đã tải và trích text bằng pypdf, không qua blog):**
- Phụ lục I–VI: `https://vanban.vcci.com.vn/hm_content/uploads/van-ban/ND_30-2020-ND-CP_Phu_luc.pdf` (62 trang)
- Thân Nghị định: `https://hcmyu.hpu2.edu.vn/public/fileupload/source/TAI%20LIEU/Ngh%E1%BB%8B%20%C4%91%E1%BB%8Bnh%2030.pdf` (20 trang)
- Bản trích text lưu tại scratchpad phiên này (`pl_all_vcci.txt`, `nd30.txt`).

#### A. Quy định chung (Mục I Phần I Phụ lục I)

| Hạng mục | Quy định nguyên văn |
|---|---|
| Khổ giấy | **A4 (210 mm x 297 mm)** |
| Kiểu trình bày | Theo chiều dài khổ A4 (dọc). Nếu có bảng/biểu không làm phụ lục riêng thì **có thể trình bày theo chiều rộng** (ngang) |
| Định lề trang | **mép trên và mép dưới 20 – 25 mm; mép trái 30 – 35 mm; mép phải 15 – 20 mm** |
| Phông chữ | **Times New Roman**, bộ mã Unicode theo **TCVN 6909:2001**, **màu đen** |
| Cỡ/kiểu chữ | Theo quy định cụ thể cho từng yếu tố thể thức (bảng B) |
| Số trang | Đánh **từ số 1**, **chữ số Ả Rập**, **cỡ chữ 13 đến 14**, **kiểu đứng**, **canh giữa theo chiều ngang trong phần LỀ TRÊN**, **không hiển thị số trang thứ nhất** |

> ⚠️ Lưu ý kỹ thuật quan trọng: số trang nằm **trong phần lề trên**, tức là **header**, canh giữa — không phải footer. Checker phải bắt đúng chỗ này.

#### B. Cỡ chữ / kiểu chữ từng thành phần (Mục II + Mục V Phần I)

| Ô số | Thành phần | Loại chữ | Cỡ chữ | Kiểu chữ | Căn lề / vị trí |
|---|---|---|---|---|---|
| 1 | **Quốc hiệu** "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" | In hoa | **12 – 13** | Đứng, **đậm** | Trên cùng, **bên phải** trang đầu |
| 1 | **Tiêu ngữ** "Độc lập - Tự do - Hạnh phúc" | In thường | **13 – 14** | Đứng, **đậm** | Canh giữa dưới Quốc hiệu; cách Quốc hiệu **dòng đơn**; chữ cái đầu mỗi cụm viết hoa; giữa các cụm có gạch nối (-) **có cách chữ**; **dưới có đường kẻ ngang nét liền dài bằng dòng chữ** |
| 2 | Tên cơ quan **chủ quản trực tiếp** | In hoa | **12 – 13** | Đứng | Canh giữa |
| 2 | Tên cơ quan **ban hành văn bản** | In hoa | **12 – 13** | Đứng, **đậm** | Canh giữa dưới chủ quản, cách **dòng đơn**; **đường kẻ ngang nét liền dài 1/3 – 1/2 độ dài dòng chữ**, đặt cân đối |
| 3 | **Số, ký hiệu** — từ "Số" | In thường | **13** | Đứng | Canh giữa dưới tên cơ quan ban hành; sau "Số" có dấu hai chấm (:); **số nhỏ hơn 10 phải thêm số 0 phía trước** |
| 3 | Số, ký hiệu — phần ký hiệu | In hoa | **13** | Đứng | Giữa số và ký hiệu có dấu gạch chéo (/); giữa các nhóm viết tắt có gạch nối (-); **không cách chữ** |
| 4 | **Địa danh và thời gian ban hành** | In thường | **13 – 14** | **Nghiêng** | Cùng dòng với số/ký hiệu; canh giữa so với Quốc hiệu & Tiêu ngữ; chữ cái đầu địa danh viết hoa; sau địa danh có dấu phẩy (,); **ngày nhỏ hơn 10 và tháng 1, 2 phải thêm số 0** |
| 5a | **Tên loại văn bản** | In hoa | **13 – 14** | Đứng, **đậm** | Canh giữa theo chiều ngang |
| 5a | **Trích yếu nội dung** | In thường | **13 – 14** | Đứng, **đậm** | Ngay dưới tên loại; **đường kẻ ngang nét liền 1/3 – 1/2 độ dài dòng chữ**, cân đối |
| 5b | Trích yếu **công văn** (sau "V/v") | In thường | **12 – 13** | Đứng | Canh giữa dưới số và ký hiệu, **cách dòng 6pt** với số và ký hiệu |
| 6 | **Căn cứ ban hành** | In thường | **13 – 14** | **Nghiêng** | Dưới tên loại/trích yếu; mỗi căn cứ xuống dòng, cuối dòng dấu chấm phẩy (;), **dòng cuối cùng dấu chấm (.)** |
| 6 | **Nội dung văn bản** | In thường | **13 – 14** | Đứng | **Canh đều hai lề (justify)**; **thụt đầu dòng 1 cm hoặc 1,27 cm**; **khoảng cách giữa các đoạn tối thiểu 6pt**; **khoảng cách giữa các dòng tối thiểu dòng đơn, tối đa 1,5 lines** |
| 6 | "Phần", "Chương" + số thứ tự | In thường | 13 – 14 | Đứng, đậm | Dòng riêng, canh giữa; **số La Mã** |
| 6 | Tiêu đề phần/chương | In hoa | 13 – 14 | Đứng, đậm | Ngay dưới, canh giữa |
| 6 | "Mục", "Tiểu mục" + số thứ tự | In thường | 13 – 14 | Đứng, đậm | Dòng riêng, canh giữa; **số Ả Rập** |
| 6 | Tiêu đề mục/tiểu mục | In hoa | 13 – 14 | Đứng, đậm | Ngay dưới, canh giữa |
| 6 | **"Điều"** + số + tiêu đề | In thường | = cỡ lời văn | Đứng, **đậm** | **Lùi đầu dòng 1 cm hoặc 1,27 cm**; số Ả Rập, sau số có dấu chấm (.) |
| 6 | **Khoản** | In thường | = cỡ lời văn | Đứng (đậm nếu khoản có tiêu đề, trên dòng riêng) | Số Ả Rập + dấu chấm (.) |
| 6 | **Điểm** | In thường | = cỡ lời văn | Đứng | **Chữ cái tiếng Việt theo thứ tự bảng chữ cái tiếng Việt** + dấu đóng ngoặc đơn `a)` |
| 7a | Quyền hạn + chức vụ người ký (`TM.` `Q.` `KT.` `TL.` `TUQ.`) | In hoa | **13 – 14** | Đứng, **đậm** | |
| 7b | **Họ tên người ký** | In thường | **13 – 14** | Đứng, **đậm** | Canh giữa quyền hạn/chức vụ. **Không ghi học hàm, học vị, danh hiệu trước họ tên** |
| 7c | Chữ ký (ảnh chữ ký số) | — | — | — | **Màu xanh, định dạng .png nền trong suốt**, đặt canh giữa chức vụ và họ tên |
| 8 | Dấu / chữ ký số cơ quan | — | — | — | Ảnh dấu **màu đỏ, kích thước bằng kích thước thực tế**, `.png` nền trong suốt, **trùm lên khoảng 1/3 hình ảnh chữ ký số của người có thẩm quyền về bên trái** |
| 8 | Thông tin ký số (số/ký hiệu, thời gian ISO 8601) | In thường | **10** | Đứng | Times New Roman, màu đen; góc trên bên phải trang đầu văn bản kèm theo |
| 9a | "Kính gửi" + tên nơi nhận | In thường | **13 – 14** | Đứng | Sau "Kính gửi" có dấu hai chấm. Một nơi → cùng dòng. ≥ hai nơi → xuống dòng, mỗi nơi một dòng, **đầu dòng gạch đầu dòng (-) thẳng hàng dưới dấu hai chấm**, cuối dòng dấu chấm phẩy (;), dòng cuối dấu chấm (.) |
| 9b | Từ **"Nơi nhận"** | In thường | **12** | **Nghiêng, đậm** | Dòng riêng, **ngang hàng với dòng "quyền hạn, chức vụ của người ký"**, **sát lề trái**, sau có dấu hai chấm (:) |
| 9b | Danh sách nơi nhận | In thường | **11** | Đứng | Mỗi nơi một dòng, gạch đầu dòng (-) **sát lề trái**, cuối dòng dấu chấm phẩy (;); **dòng cuối: `Lưu:` + `VT`, dấu phẩy, viết tắt đơn vị soạn thảo + số lượng bản lưu, cuối cùng dấu chấm** (ví dụ `- Lưu: VT, NVĐP.`) |
| 10a | Dấu chỉ độ mật (TUYỆT MẬT / TỐI MẬT / MẬT) | — | — | — | Con dấu khắc sẵn theo pháp luật bảo vệ bí mật nhà nước |
| 10b | Dấu mức độ khẩn | In hoa | **13 – 14** | Đứng, đậm | Khung chữ nhật viền đơn: **HỎA TỐC 30 mm x 8 mm**, **THƯỢNG KHẨN 40 mm x 8 mm**, **KHẨN 20 mm x 8 mm**; mực **đỏ tươi** |
| 11 | Chỉ dẫn phạm vi lưu hành ("XEM XONG TRẢ LẠI", "LƯU HÀNH NỘI BỘ") | In hoa | **13 – 14** | Đứng, đậm | Cân đối trong khung chữ nhật viền đơn |
| 12 | Ký hiệu người soạn thảo + số lượng bản phát hành | In hoa (ký hiệu) / Ả Rập (số) | **11** | Đứng | Ví dụ `PL.(300)` |
| 13 | Địa chỉ, thư điện tử, trang TTĐT, điện thoại, Fax | In thường | **11 – 12** | Đứng | **Chỉ ở trang thứ nhất**, dưới một đường kẻ nét liền **kéo dài hết chiều ngang vùng trình bày** |
| 14 | Chữ ký số cơ quan cho bản sao định dạng điện tử | — | — | — | Góc trên bên phải trang đầu |
| — | **Phụ lục**: từ "Phụ lục" + số La Mã | In thường | **14** | Đứng, **đậm** | Dòng riêng, canh giữa |
| — | Tên phụ lục | In hoa | **13 – 14** | Đứng, đậm | Canh giữa |
| — | Thông tin chỉ dẫn kèm theo (`Kèm theo văn bản số.../...-... ngày.... tháng.... năm....`) | In thường | **13 – 14** | **Nghiêng** | Canh giữa dưới tên phụ lục, cùng phông, màu đen. **Văn bản điện tử: không phải điền thông tin này**. **Số trang của Phụ lục đánh riêng theo từng Phụ lục** |

#### C. Quy tắc "nhất quán cỡ chữ" — luật kiểm tra giá trị nhất

Chú thích 1 của bảng Mục V Phần I Phụ lục I, nguyên văn:

> *"Cỡ chữ trong cùng một văn bản tăng, giảm phải thống nhất, ví dụ: Quốc hiệu cỡ chữ 13, Tiêu ngữ cỡ chữ 14, địa danh và ngày, tháng, năm văn bản cỡ chữ 14 hoặc Quốc hiệu cỡ chữ 12, Tiêu ngữ cỡ chữ 13, địa danh và ngày, tháng, năm văn bản cỡ chữ 13."*

→ Checker phải hỗ trợ **2 bộ cỡ chữ hợp lệ** và cấm trộn lẫn:
- **Bộ "nhỏ"**: Quốc hiệu 12 · Tiêu ngữ 13 · Địa danh/ngày 13 · Tên cơ quan 12 · Nội dung 13 · Tên loại 13 · Trích yếu công văn 12
- **Bộ "lớn"**: Quốc hiệu 13 · Tiêu ngữ 14 · Địa danh/ngày 14 · Tên cơ quan 13 · Nội dung 14 · Tên loại 14 · Trích yếu công văn 13
- Cố định không theo bộ: Số/ký hiệu **13**, "Nơi nhận" **12**, danh sách nơi nhận **11**, ký hiệu người soạn thảo **11**, địa chỉ/liên hệ **11–12**, thông tin ký số **10**, "Phụ lục" **14**.

#### D. Sơ đồ bố trí (Mục IV Phần I) — bảng số ô

Bản trích text chỉ lấy được **bảng chú giải số ô**, còn **hình vẽ sơ đồ ở trang 12 là ảnh bitmap** nên pypdf không đọc được toạ độ. **CHƯA KIỂM: toạ độ mm chính xác của từng ô trong sơ đồ.** Khi làm ticket cần mở trang 12 của PDF gốc dưới dạng ảnh để lấy toạ độ.

Bảng chú giải (nguyên văn):

```
1          : Quốc hiệu và Tiêu ngữ
2          : Tên cơ quan, tổ chức ban hành văn bản
3          : Số, ký hiệu của văn bản
4          : Địa danh và thời gian ban hành văn bản
5a         : Tên loại và trích yếu nội dung văn bản
5b         : Trích yếu nội dung công văn
6          : Nội dung văn bản
7a, 7b, 7c : Chức vụ, họ tên và chữ ký của người có thẩm quyền
8          : Dấu, Chữ ký số của cơ quan, tổ chức
9a, 9b     : Nơi nhận
10a        : Dấu chỉ độ mật
10b        : Dấu chỉ mức độ khẩn
11         : Chỉ dẫn về phạm vi lưu hành
12         : Ký hiệu người soạn thảo văn bản và số lượng bản phát hành
13         : Địa chỉ cơ quan, tổ chức; thư điện tử; trang thông tin điện tử;
             số điện thoại; số Fax
14         : Chữ ký số của cơ quan, tổ chức cho bản sao văn bản sang
             định dạng điện tử
```

Sơ đồ bản sao sang định dạng giấy (Mục II.3 Phần II): ô 1 hình thức sao · 2 tên cơ quan sao · 3 số ký hiệu bản sao · 4 địa danh/ngày sao · 5a,5b,5c chức vụ, họ tên, chữ ký · 6 dấu cơ quan · 7 nơi nhận.

#### E. Danh mục loại văn bản bắt buộc (Điều 7 + Phụ lục III Mục I)

Điều 7 liệt kê **29 loại** văn bản hành chính: Nghị quyết (cá biệt), quyết định (cá biệt), chỉ thị, quy chế, quy định, thông cáo, thông báo, hướng dẫn, chương trình, kế hoạch, phương án, đề án, dự án, báo cáo, biên bản, tờ trình, hợp đồng, công văn, công điện, bản ghi nhớ, bản thỏa thuận, giấy uỷ quyền, giấy mời, giấy giới thiệu, giấy nghỉ phép, phiếu gửi, phiếu chuyển, phiếu báo, thư công.

Bảng chữ viết tắt (Phụ lục III Mục I) — dùng để **sinh và kiểm tra ký hiệu văn bản tự động**:

| | | | | | |
|---|---|---|---|---|---|
| Nghị quyết (cá biệt) **NQ** | Quyết định (cá biệt) **QĐ** | Chỉ thị **CT** | Quy chế **QC** | Quy định **QyĐ** | Thông cáo **TC** |
| Thông báo **TB** | Hướng dẫn **HD** | Chương trình **CTr** | Kế hoạch **KH** | Phương án **PA** | Đề án **ĐA** |
| Dự án **DA** | Báo cáo **BC** | Biên bản **BB** | Tờ trình **TTr** | Hợp đồng **HĐ** | Công điện **CĐ** |
| Bản ghi nhớ **BGN** | Bản thỏa thuận **BTT** | Giấy ủy quyền **GUQ** | Giấy mời **GM** | Giấy giới thiệu **GGT** | Giấy nghỉ phép **GNP** |
| Phiếu gửi **PG** | Phiếu chuyển **PC** | Phiếu báo **PB** | Bản sao y **SY** | Bản trích sao **TrS** | Bản sao lục **SL** |

*(Công văn và thư công không có chữ viết tắt tên loại: ký hiệu công văn = viết tắt tên cơ quan + viết tắt đơn vị soạn thảo, ví dụ `Số: 05/BNV-VP`.)*

#### F. 14 mẫu trình bày chính thức (Phụ lục III Mục II) — đúng tên gọi

| Mẫu | Nội dung |
|---|---|
| 1.1 | Nghị quyết (cá biệt) |
| 1.2 | Quyết định (cá biệt) quy định trực tiếp |
| 1.3 | Quyết định (cá biệt) quy định gián tiếp |
| 1.4 | Văn bản có tên loại *(dùng cho: chỉ thị, quy chế, quy định, thông cáo, thông báo, hướng dẫn, chương trình, kế hoạch, phương án, đề án, dự án, báo cáo, tờ trình, giấy ủy quyền, phiếu gửi, phiếu chuyển, phiếu báo)* |
| 1.5 | Công văn |
| 1.6 | Công điện |
| 1.7 | Giấy mời |
| 1.8 | Giấy giới thiệu |
| 1.9 | Biên bản |
| 1.10 | Giấy nghỉ phép |
| 2.1 | Phụ lục văn bản hành chính giấy |
| 2.2 | Phụ lục văn bản hành chính điện tử |
| 3.1 | Bản sao sang định dạng giấy |
| 3.2 | Bản sao sang định dạng điện tử |

Tiêu chuẩn số hoá cho bản sao điện tử (Phần II Mục I.2): **PDF phiên bản 1.4 trở lên**, **ảnh màu**, **độ phân giải tối thiểu 200 dpi**, **tỷ lệ số hoá 100%**.

Phụ lục II của Nghị định quy định **viết hoa trong văn bản hành chính** (viết hoa vì phép đặt câu, tên người, tên địa lý, tên cơ quan, chức vụ…) — đây là nguồn cho một bộ **autocorrect/kiểm tra viết hoa** riêng (xem VN-5).

### 1.5. Hiện trạng trong VN Office (đã rà source)

| Mảnh ghép | Trạng thái | Nơi |
|---|---|---|
| Preset lề "Chuẩn NĐ 30/2020" (top 20, bottom 20, left 30, right 15 mm) | **ĐÃ CÓ** và đúng ngưỡng Nghị định | `apps/writer/page-setup-dialog.js:10` |
| Cỡ chữ 13 pt trong dropdown ribbon (`w:sz="26"`) | **ĐÃ CÓ** (bổ sung 16/10/2026) | `apps/writer/writer-ribbon.js`; báo cáo `docs/AUDIT-DOCADMIN-FIX-1610.md` |
| Danh sách đa cấp "Điều 1. / 1. / a)" | **ĐÃ CÓ** preset `nd30` | `adapters/libreoffice/writer/writer-adapter.js:250`, `apps/writer/writer.css:1110-1118`, `adapters/libreoffice/common/ooxml_zip_patch.py:24639` |
| Bộ audit 30 kịch bản hành chính | **ĐÃ CÓ** (29 PASS / 1 BLOCKED) | `scripts/audit-0610/doc_admin_30.mjs`, `docs/AUDIT-DOC-ADMIN-11-30.md` |
| **Nút "Áp dụng chuẩn NĐ 30" một phát** | **CHƯA CÓ** | — |
| **Checker vi phạm có trích dẫn** | **CHƯA CÓ** | — |
| **14 mẫu Phụ lục III** | **CHƯA CÓ** | — |
| Cơ chế Trợ giúp để gắn hướng dẫn | **ĐÃ CÓ** | `platform/help/help-catalog.js`, `help-panel.js`, `entries-*.js` |

### 1.6. Dữ liệu / giấy phép

**Không có vướng mắc.** Văn bản quy phạm pháp luật Việt Nam không thuộc đối tượng bảo hộ quyền tác giả (Luật Sở hữu trí tuệ, Điều 15 — *CHƯA KIỂM số điều chính xác, cần xác nhận trước khi ghi vào tài liệu pháp lý của sản phẩm*). Nội dung mẫu và bảng cỡ chữ là quy định công khai. Không cần phụ thuộc bên thứ ba, không cần mạng.

Rủi ro duy nhất: **phải trích dẫn chính xác**. Nếu checker báo sai điều khoản thì mất uy tín nặng. Vì vậy mỗi luật kiểm tra trong code **bắt buộc kèm trường `clause`** trỏ đúng Mục/khoản/điểm của Phụ lục I, và một test so khớp với bản trích PDF gốc.

### 1.7. Tình trạng hiệu lực (2026)

- Nghị định 30/2020/NĐ-CP ngày 05/3/2020, căn cứ Luật Tổ chức Chính phủ 2015, thay thế Nghị định 110/2004/NĐ-CP và 09/2010/NĐ-CP.
- **Vẫn được viện dẫn là căn cứ trong các kế hoạch công tác văn thư năm 2026** của nhiều cơ quan (ví dụ Sở Tư pháp Bắc Ninh, các trường ở Ninh Bình), song song với Luật Lưu trữ 2024 và Nghị định 113/2025/NĐ-CP (quy định chi tiết Luật Lưu trữ — về **lưu trữ**, không thay thế phần **văn thư**).
- **CHƯA KIỂM:** có văn bản nào sửa đổi/bổ sung trực tiếp Nghị định 30/2020 hay Phụ lục I hay không. Phải tra trên `vbpl.vn` (CSDL quốc gia về văn bản pháp luật) trước khi chốt ticket. Không được kết luận từ blog.

### 1.8. Đặc tả checker — danh sách luật kiểm tra khởi điểm (26 luật)

Mỗi luật: `id`, `severity` (lỗi / cảnh báo), `clause`, `message` (tiếng Việt), `autofix`.

| ID | Kiểm tra | Mức | Trích dẫn |
|---|---|---|---|
| ND30-G01 | Khổ giấy phải A4 210×297 mm | Lỗi | Mục I.1 Phần I PL I |
| ND30-G02 | Lề trên/dưới trong 20–25 mm | Lỗi | Mục I.3 |
| ND30-G03 | Lề trái trong 30–35 mm | Lỗi | Mục I.3 |
| ND30-G04 | Lề phải trong 15–20 mm | Lỗi | Mục I.3 |
| ND30-G05 | Toàn văn bản dùng Times New Roman | Lỗi | Mục I.4 |
| ND30-G06 | Màu chữ đen (trừ chữ ký/dấu) | Cảnh báo | Mục I.4 |
| ND30-G07 | Chuỗi phải ở Unicode NFC (TCVN 6909:2001), không phải TCVN3/VNI | Lỗi | Mục I.4 — *nối sang VN-2* |
| ND30-G08 | Số trang: canh giữa trong **lề trên**, cỡ 13–14, đứng, bắt đầu từ 1, **ẩn trang 1** | Lỗi | Mục I.7 |
| ND30-C01 | Quốc hiệu: in hoa, 12–13, đứng đậm, trên cùng bên phải | Lỗi | Mục II.1.a |
| ND30-C02 | Tiêu ngữ: in thường, 13–14, đứng đậm, canh giữa dưới Quốc hiệu, có đường kẻ ngang dài bằng dòng chữ | Lỗi | Mục II.1.b |
| ND30-C03 | Quốc hiệu & Tiêu ngữ cách nhau **dòng đơn** | Cảnh báo | Mục II.1.c |
| ND30-C04 | Tên cơ quan ban hành: in hoa 12–13 đứng đậm + đường kẻ 1/3–1/2 dòng chữ | Lỗi | Mục II.2.b |
| ND30-C05 | "Số:" cỡ 13 đứng; số < 10 có số 0 phía trước; ký hiệu in hoa 13 | Lỗi | Mục II.3.c |
| ND30-C06 | Ký hiệu loại văn bản khớp bảng viết tắt Phụ lục III | Cảnh báo | PL III Mục I |
| ND30-C07 | Địa danh + ngày: in thường 13–14 **nghiêng**; ngày < 10 và tháng 1,2 có số 0 | Lỗi | Mục II.4.b/c |
| ND30-C08 | Tên loại: in hoa 13–14 đứng đậm, canh giữa | Lỗi | Mục II.5.b |
| ND30-C09 | Trích yếu: in thường 13–14 đứng đậm + đường kẻ 1/3–1/2 | Lỗi | Mục II.5.b |
| ND30-C10 | Công văn: trích yếu sau "V/v", 12–13 đứng, cách dòng 6pt với số/ký hiệu | Lỗi | Mục II.5.b |
| ND30-C11 | Căn cứ ban hành: **nghiêng** 13–14; mỗi căn cứ cuối dòng `;`, dòng cuối `.` | Lỗi | Mục II.6.a |
| ND30-C12 | Nội dung: **justify**, đứng, 13–14 | Lỗi | Mục II.6.e |
| ND30-C13 | Thụt đầu dòng = **1 cm hoặc 1,27 cm** | Lỗi | Mục II.6.e |
| ND30-C14 | Giãn đoạn ≥ **6pt** | Lỗi | Mục II.6.e |
| ND30-C15 | Giãn dòng ≥ dòng đơn và ≤ **1,5 lines** | Lỗi | Mục II.6.e |
| ND30-C16 | Điều/Khoản/Điểm đúng kiểu (Điều lùi 1/1,27 cm, đứng đậm; Khoản số Ả Rập + `.`; Điểm chữ cái + `)`) | Cảnh báo | Mục II.6.đ |
| ND30-C17 | Quyền hạn/chức vụ: in hoa 13–14 đứng đậm; tiền tố thuộc {TM., Q., KT., TL., TUQ.} | Lỗi | Mục II.7.đ |
| ND30-C18 | Họ tên người ký: in thường 13–14 đứng đậm, canh giữa; **không có học hàm/học vị phía trước** | Lỗi | Mục II.7.c/đ |
| ND30-C19 | "Nơi nhận": cỡ **12 nghiêng đậm**, sát lề trái, ngang hàng dòng chức vụ | Lỗi | Mục II.9.d |
| ND30-C20 | Danh sách nơi nhận: cỡ **11 đứng**, gạch đầu dòng sát lề trái, `;` cuối dòng | Lỗi | Mục II.9.d |
| ND30-C21 | Dòng cuối nơi nhận có `Lưu: VT, <đơn vị><số bản>.` | Cảnh báo | Mục II.9.d |
| ND30-C22 | Ký hiệu người soạn thảo + số bản: cỡ **11** đứng | Cảnh báo | Mục III.3 |
| ND30-C23 | Địa chỉ/ĐT/Fax/Email/Website: cỡ **11–12** đứng, chỉ trang 1, dưới đường kẻ hết chiều ngang | Cảnh báo | Mục III.4 |
| ND30-C24 | Phụ lục: "Phụ lục" cỡ **14** đứng đậm; tên in hoa 13–14; chỉ dẫn kèm theo **nghiêng** 13–14; **số trang đánh riêng từng phụ lục** | Lỗi | Mục III.1.b/c/đ |
| ND30-X01 | **Nhất quán cỡ chữ**: toàn văn bản phải khớp bộ "nhỏ" hoặc bộ "lớn", không trộn | Lỗi | Chú thích 1 bảng Mục V |
| ND30-X02 | Viết hoa đúng Phụ lục II (tên cơ quan, tên địa lý, chức vụ) | Cảnh báo | PL II |

### 1.9. Công sức & ưu tiên

- **Nút áp dụng chuẩn + 20 style**: ~3 ngày-agent (đã có preset lề và numbering).
- **Checker 26 luật + panel + autofix**: ~6 ngày-agent (phần nặng là đọc được đúng thuộc tính đoạn/run từ model Writer, và "Sửa ngay" không được phá layout).
- **14 mẫu Phụ lục III**: ~4 ngày-agent (mỗi mẫu phải round-trip DOCX đúng, kiểm bằng `batch_document_audit.py`).
- **Hướng dẫn tiếng Việt trong app** (bắt buộc theo AGENTS.md §10): ~1 ngày.
- **Lấy toạ độ sơ đồ ô từ ảnh trang 12**: ~0,5 ngày.

**Tổng ≈ 14,5 ngày-agent. Điểm ưu tiên: 92/100.**

---

## 2. VN-2 — ĐỌC ĐƯỢC BỘ MÃ TIẾNG VIỆT CŨ (TCVN3 / VNI / VISCII / VPS / BK HCM)

> **Đây là tính năng có khả năng tạo khác biệt lớn nhất với chi phí thấp nhất.**

### 2.1. Bằng chứng

Lead đã thấy một tệp `.doc` thật dùng font họ `.Vn*` và chữ mã TCVN3 trong kho nội bộ. Tệp và nội dung không đưa lên kho mã; Lead tự kiểm phía Windows.

### 2.2. Office và LibreOffice hiện làm gì

| Sản phẩm | Hỗ trợ |
|---|---|
| **LibreOffice** (bản ta bundle) | **CHỈ Windows-1258.** Xác minh trong repo: `core-master/core-master/include/rtl/textenc.h:81` chỉ có `RTL_TEXTENCODING_MS_1258` cho tiếng Việt; `sal/textenc/tcvteas1.tab` chỉ có bảng "Windows Standard CharSet for Vietnamease". **Không có TCVN3, VNI, VISCII, VPS, BK HCM.** |
| **Word 2016** | Hộp thoại "Encoded Text" chỉ có "Vietnamese (Windows)" = CP1258. **CHƯA KIỂM bằng Word thật** (Excel/Word COM đang bị chặn trên máy này) nhưng danh mục code page của Windows không chứa TCVN3/VNI nên kết luận gần như chắc. |
| Cả hai | Với `.doc` TCVN3, text được lưu như ký tự CP1252 + font `.VnTime`. Word/LibreOffice mở ra **nguyên văn chữ rác** `<mẫu TCVN3>` vì chúng tôn trọng byte và font, và **không có bộ chuyển mã nào**. |

Hệ quả: mọi người Việt có kho tài liệu trước ~2003 đều phải tải một tiện ích rời (Unikey có chức năng chuyển mã bảng chọn, hoặc UnicodeConverter) và chuyển **từng file bằng tay qua clipboard**, mất hết định dạng.

### 2.3. Tính năng đề xuất

1. **Tự nhận dạng khi mở file** — khi phát hiện tài liệu dùng bộ mã cũ, hiện thanh thông báo (infobar) ngay trên vùng soạn thảo:
   > *"Tài liệu này dùng bảng mã cũ **TCVN3 (ABC)** nên hiển thị sai dấu. **[Chuyển sang Unicode]** · [Giữ nguyên] · [Tìm hiểu]"*
   Không tự sửa ngầm — người dùng quyết định (đúng nguyên tắc không làm thay người dùng dữ liệu của họ).
2. **Chuyển mã tại chỗ** — chuyển ký tự **theo từng run**, chỉ những run có font thuộc họ cũ; sau khi chuyển thì **đổi font run đó sang Times New Roman** (hoặc font Unicode tương ứng: `.VnArial → Arial`), giữ nguyên cỡ chữ, đậm/nghiêng, màu, bảng, ảnh, lề. Toàn bộ hành động là **1 bước Undo**.
3. **Bộ chuyển hàng loạt** — hộp thoại "Chuyển mã tài liệu cũ": chọn thư mục (có đệ quy), xem trước mẫu 200 ký tự cho từng file, chọn bộ mã (hoặc "Tự nhận dạng"), chạy, xuất báo cáo CSV (file / bộ mã nhận dạng / độ tin cậy / số ký tự đã đổi / kết quả). Ghi ra **thư mục đích mới**, không ghi đè bản gốc (nguyên tắc tài liệu lưu trữ).
4. **Chuyển mã vùng chọn** — nút trong nhóm ribbon "Hành chính VN": bôi đen đoạn chữ rác → chuyển. Hữu ích khi người dùng dán từ hệ thống cũ.
5. Cùng cơ chế cho **VN Sheet** (`.xls` cũ) và **VN Slides**.

### 2.4. Cách hoạt động của từng bộ mã (quyết định thiết kế)

| Bộ mã | Kiểu | Đặc điểm | Font phụ thuộc |
|---|---|---|---|
| **TCVN3 (ABC)** = VN3 của TCVN 5712:1993 | 1 byte, nửa dưới là ASCII | 134 chữ Việt không nhét nổi vào 128 ô ⇒ **chữ hoa có dấu nằm ở FONT RIÊNG** (`.VnTimeH`, `.VnArialH`): cùng byte `0xB5` hiển thị `à` ở `.VnTime` và `À` ở `.VnTimeH`. **Đây là cái bẫy chí tử**: không đọc tên font thì không biết hoa/thường. | `.VnTime`, `.VnTimeH`, `.VnArial`, `.VnArialH`, `.VnBook`, `.Vn3DH`… (tiền tố `.Vn`) |
| **VNI-Windows** | 1–2 byte, **tổ hợp** | Chữ có dấu = chữ gốc + 1 byte dấu, ví dụ `à` = `61 F8`, `Â` = `41 C2`. Vì vậy mỗi ký tự có dấu chiếm **2 byte** ⇒ đếm ký tự, tìm kiếm, ngắt dòng đều lệch. | `VNI-Times`, `VNI-Helve`, `VNI-Aptima`, `VNI-Book`… (tiền tố `VNI-`) |
| **VISCII** | 1 byte, dựng sẵn | Chuẩn hoá trong **RFC 1456** (IETF, 5/1993), dùng cả 0x02/0x05/0x14/0x19/0x1E/0x25 (6 vị trí điều khiển) để nhét đủ 134 chữ ⇒ **không font-dependent**, nhưng vỡ khi đi qua kênh 7-bit | Font Unicode bình thường cũng không hiển thị đúng; cần bảng |
| **VPS** | 1 byte | Dùng trong cộng đồng người Việt ở nước ngoài (Vietnamese Professionals Society) | `VPS Times`, `VPS Helve` |
| **VIQR** | ASCII thuần | `a'` = á, `a` + `` ` `` = à, `dd` = đ — cũng trong RFC 1456. Phổ biến trên email/Usenet cũ | Không |
| **BK HCM1 / BK HCM2** | 1 byte / tổ hợp | Bộ mã của ĐH Bách khoa TP.HCM; **BK HCM1 dựng sẵn 1 byte, BK HCM2 tổ hợp**. Rất ít gặp ngoài tài liệu học thuật miền Nam thập niên 1990. **CHƯA KIỂM: bảng mã chi tiết** — chưa tìm được nguồn bảng mã có giấy phép rõ ràng. Đề xuất **xếp vào giai đoạn 2**, không làm trong ticket đầu. | `BKHCM1-Times`, `BKHCM2-Times` |
| **Vietware-F / Vietware-X** | 1 byte / 2 byte | Tương tự, gặp rất ít. Giai đoạn 2. |

### 2.5. Thuật toán TỰ NHẬN DẠNG — đề xuất riêng của ta, tận dụng code đã có

Đây là chỗ sáng tạo quan trọng: **VN Office đã có `platform/text/vi-syllable.js` với hàm `isValidVietnameseSyllable()`** (quy tắc ghép vần tiếng Việt tự biên soạn, CC0-1.0). Dùng nó làm **hàm chấm điểm**:

```
nhanDang(bytesHoacChuoi, tenFont):
  1. Gợi ý theo FONT (tin cậy cao nhất):
       tên font khớp /^\.Vn/i          → TCVN3   (+ cờ HOA nếu font kết thúc bằng H)
       tên font khớp /^VNI-/i          → VNI-Windows
       tên font khớp /^VPS/i           → VPS
       tên font khớp /^BKHCM1/i        → BK HCM1   (giai đoạn 2)
  2. Nếu không có gợi ý font, hoặc để xác nhận:
       với mỗi bộ mã ứng viên C:
         t = giaiMa(chuoi, C)
         diem[C] = (số âm tiết hợp lệ theo isValidVietnameseSyllable) / (tổng số âm tiết)
                   - phần trăm ký tự ngoài bảng mã × 2
  3. Chọn C có điểm cao nhất.
     Nếu điểm cao nhất < 0,75  → KHÔNG kết luận, không hiện infobar (tránh báo động giả
                                 trên tài liệu tiếng Anh/Pháp có nhiều ký tự nhấn).
     Nếu khoảng cách giữa hạng 1 và hạng 2 < 0,05 → hỏi người dùng chọn.
  4. Trước khi đổi: chuỗi gốc đã là tiếng Việt Unicode hợp lệ (≥ 0,9 âm tiết hợp lệ)
     → KHÔNG đổi (bảo vệ khỏi "chuyển hai lần" làm hỏng file).
```

Ưu điểm: không cần model thống kê, không cần dữ liệu bên ngoài, chạy hoàn toàn offline, và **có thể kiểm thử tự động** bằng chính file `<tệp TCVN3 thật phía Windows>` làm golden fixture.

### 2.6. Bảng mã: nguồn và GIẤY PHÉP (phần quan trọng nhất)

| Nguồn | Nội dung | Giấy phép | Dùng được? |
|---|---|---|---|
| **RFC 1456** (IETF, 5/1993, `rfc-editor.org/rfc/rfc1456`) | Bảng VISCII 8-bit v1.1 + VIQR | Tài liệu IETF — được phép triển khai tự do; RFC "specifies no level of standard" (informational) | ✅ **Dùng được** cho VISCII + VIQR |
| **TCVN 5712:1993** (tiêu chuẩn quốc gia VN) | Định nghĩa VN1/VN2/VN3 (TCVN3) | Tiêu chuẩn quốc gia; **CHƯA KIỂM điều kiện sao chép bảng mã** (tiêu chuẩn TCVN thường bán qua Tổng cục TCĐLCL) | ⚠️ Trích **dẫn chiếu** được; **không** sao chép nguyên văn tài liệu tiêu chuẩn |
| **vietunicode.sourceforge.net/charset/** | Bảng đối chiếu Unicode ↔ VNI/VPS/VISCII/TCVN3/VIQR | **Trang không ghi bất kỳ giấy phép nào** | ❌ **Không sao chép**. Chỉ dùng để **đối chiếu kiểm tra** bảng ta tự lập. Trang còn tự cảnh báo giá trị chữ HOA của TCVN3 trong bảng là sai |
| **UnicodeConverter** (vietunicode/SourceForge, Java) | Chuyển ISC/TCVN3/VISCII/VNI/VPS → UTF-8 | **GPL-2.0** | ❌ Copyleft, cần chủ dự án ký duyệt riêng; **không đáng** vì ta tự lập bảng được |
| **py-unicode-convert** (github.com/vuthaihoc) | 8 bộ mã | **KHÔNG CÓ FILE LICENSE** ⇒ mặc định bảo lưu toàn bộ quyền | ❌ **Tuyệt đối không dùng** |
| **vietnameseConverter** (CRAN, R) | TCVN3/VISCII/VPS | Bảng mã "adapted from vietunicode.sourceforge.net" | ❌ Dẫn xuất từ nguồn không rõ giấy phép |
| **libiconv** `lib/viscii.h` | VISCII | LGPL (libiconv) | ❌ Không cần, RFC 1456 là nguồn gốc sạch hơn |

**→ Khuyến nghị dứt khoát: VN Office TỰ LẬP bảng mã của mình, phát hành CC0-1.0**, giống y cách đã làm với từ điển chính tả (`platform/text/dictionaries/LICENSES-vi.txt` — corpus Common Voice + supplement tự biên, CC0-1.0). Cách lập:

1. VISCII + VIQR: lấy từ **RFC 1456** (nguồn gốc, được phép triển khai).
2. TCVN3 và VNI-Windows: **suy ra theo quy tắc, không copy bảng**. Cả hai đều có cấu trúc đều: 14 chữ nền (`Ă Â Ê Ô Ơ Ư Đ` hoa + thường) ở `0xA1–0xAE`, rồi các nhóm 5 thanh `[huyền, hỏi, ngã, sắc, nặng]` liên tiếp cho từng nguyên âm. Đã **xác minh được quy luật nhóm 5 thanh** từ 3 điểm dữ liệu độc lập: `0xB5 à`, `0xB6 ả`, `0xB7 ã`, `0xB8 á`, `0xB9 ạ`. Ta dựng bảng theo quy luật rồi **xác thực bằng file thật** (`<tệp TCVN3 thật phía Windows>` cho ta các cặp byte↔chữ ground-truth) và bằng `isValidVietnameseSyllable()`.
3. **Cổng chấp nhận bắt buộc**: 100% âm tiết của file `<tệp TCVN3 thật phía Windows>` sau khi chuyển phải hợp lệ theo `vi-syllable.js`, và các cụm biết trước (`<cụm mẫu>`, `<cụm mẫu>`) phải khớp đúng từng ký tự.
4. **CHƯA KIỂM**: toàn bộ 134 giá trị byte của TCVN3 và 134 cặp của VNI chưa được xác minh từng ô. Ticket phải có bước "dựng bảng + đối chiếu chéo 3 nguồn độc lập + xác thực trên corpus thật" trước khi ghi PASS.

### 2.7. Nhu cầu thật ở Việt Nam năm 2026

- Unicode chỉ phổ biến ở VN từ khoảng 2001–2003 (sau TCVN 6909:2001, và chính Nghị định 30/2020 mới bắt buộc Unicode). **Mọi tài liệu hành chính, hồ sơ, luận văn, sổ sách trước 2003 gần như chắc chắn là TCVN3 hoặc VNI.**
- Theo Luật Lưu trữ, hồ sơ nhiều loại có thời hạn lưu **vĩnh viễn** hoặc 20–70 năm ⇒ các kho này **vẫn phải mở được** hôm nay.
- Nhu cầu không giảm theo thời gian mà **tăng**, vì các cơ quan đang số hoá kho giấy và kho file cũ.
- Đây cũng là nhóm khách hàng sẵn sàng trả tiền: cơ quan nhà nước có kho lưu trữ.

### 2.8. Công sức & ưu tiên

- Bảng mã TCVN3 + VNI + VISCII + VPS + VIQR, tự lập, CC0, có test: **~3 ngày-agent**
- Nhận dạng + chấm điểm bằng `vi-syllable.js` + unit test: **~2 ngày**
- Chuyển mã theo run (giữ định dạng) trong Writer + Sheet + Slides, 1 bước Undo: **~4 ngày**
- Infobar + hộp thoại chuyển hàng loạt + báo cáo CSV: **~3 ngày**
- Hướng dẫn tiếng Việt trong app: **~0,5 ngày**
- Quét `<kho LAN nội bộ>` để đo nhu cầu thật (chỉ đọc): **~0,5 ngày**

**Tổng ≈ 13 ngày-agent. Điểm ưu tiên: 95/100.**

---

## 3. VN-3 — SẮP XẾP TIẾNG VIỆT ĐÚNG THỨ TỰ TỪ ĐIỂN

### 3.1. ICU/CLDR `vi` SAI — đã đo được

Chạy trên Node (cùng ICU mà Chromium/WebView2 dùng):

```js
const c = new Intl.Collator('vi');
c.compare('ca sĩ', 'cà phê')      // → cà phê đứng trước  ❌ SAI
c.compare('hoa hồng', 'hòa bình') // → hòa bình đứng trước ❌ SAI
c.compare('an toàn', 'án mạng')   // → án mạng đứng trước  ❌ SAI
```

**Nguyên nhân:** UCA so sánh **toàn chuỗi** ở cấp 1 (chữ cái) trước, rồi mới xét cấp 2 (dấu thanh) cho **cả chuỗi**. Từ điển tiếng Việt thì so **từng âm tiết trọn vẹn**: hết chữ cái **và** thanh của âm tiết 1 mới sang âm tiết 2.
- `ca sĩ` vs `cà phê`: cấp 1 = `casi` vs `caphe`, `p < s` ⇒ ICU cho `cà phê` thắng. Từ điển: âm tiết 1 `ca` < `cà` ⇒ `ca sĩ` thắng.

Đây **chính là lỗi** Richard Wordingham báo lên danh sách `cldr-users` tháng 1/2018 ("Vietnamese Collation Wrong for Polysyllables", ticket CLDR **10867** thứ tự dấu thanh và **10868** dấu thanh có nên là khác biệt cấp 1). **CHƯA KIỂM: kết quả xử lý 2 ticket đó.**

### 3.2. Phần ICU LÀM ĐÚNG (không được phá)

```js
['ba','bà','bá','bả','bã','bạ'].sort(new Intl.Collator('vi').compare)
// → ba bà bả bã bá bạ   ✅ ĐÚNG thứ tự thanh từ điển: ngang, huyền, hỏi, ngã, sắc, nặng
['an','ăn','âm','da','dê','đa','on','ôn','ơn','ung','ưng'].sort(c.compare)
// → an ăn âm da dê đa on ôn ơn ung ưng   ✅ ĐÚNG: ă/â sau a, đ sau d, ô/ơ sau o, ư sau u
```

⇒ Giải pháp **không phải** viết lại collation từ đầu, mà **bọc** ICU bằng một lớp so sánh theo âm tiết.

### 3.3. Excel 2016 làm gì

**CHƯA KIỂM** — Excel COM đang bị chặn trên máy này (ghi nhận từ 18/10). Nhưng Excel sort dùng NLS/ICU của Windows với cùng UCA ⇒ **gần như chắc chắn mắc đúng lỗi này**. Ticket phải có bước đo thật trên Excel 2016 (một bảng 30 cặp từ) trước khi tuyên bố "Excel sai".

### 3.4. Hiện trạng VN Office

Sheet **đã** truyền locale đúng, nhưng vẫn kế thừa lỗi ICU:
- `apps/sheet/sheet-grid.js:17253-17254` — `String(vA).localeCompare(String(vB), "vi-VN")`
- `apps/sheet/data-tools.js:204-205` — như trên
- `apps/sheet/formula-engine.js:1172,1190,1249` — dùng **`undefined` locale** (locale của máy!) cho so sánh công thức ⇒ **một lỗi riêng cần xem lại**: so sánh chuỗi trong công thức Excel vốn theo thứ tự mã ký tự/locale của workbook; ép `vi` có thể lệch Excel. Cần quyết định có chủ ý, không sửa bừa.

### 3.5. Đặc tả tính năng VN Sheet

**Tên:** "Sắp xếp theo thứ tự từ điển tiếng Việt" — một tuỳ chọn trong hộp thoại Sắp xếp (Data → Sort → Tùy chọn), 3 chế độ:

| Chế độ | Hành vi |
|---|---|
| **Giống Excel** (mặc định cho file nhập từ Excel) | Y hệt hôm nay (`localeCompare('vi-VN')`), bảo toàn tương thích |
| **Từ điển tiếng Việt** | So theo âm tiết (thuật toán dưới) |
| **Tên người Việt** | Tách và so **theo tên gọi trước, rồi họ, rồi tên đệm** — cách danh bạ/bảng điểm Việt Nam thực sự xếp ("Nguyễn Văn **An**" trước "Trần Thị **Bích**"). Word/Excel không có. |

Thuật toán "Từ điển tiếng Việt":
```
khoa(chuoi):
  âmTiết = chuỗi tách theo khoảng trắng và dấu nối
  với mỗi âm tiết: sinh (khoáCấp1 = chữ cái đã bỏ thanh theo thứ tự abc tiếng Việt,
                         khoáThanh = chỉ số thanh 0..5 [ngang,huyền,hỏi,ngã,sắc,nặng],
                         khoáHoaThường)
  khoá = nối tuần tự theo từng âm tiết: [cấp1₁, thanh₁, cấp1₂, thanh₂, ...]
so(a,b) = so sánh khoá(a) với khoá(b) theo thứ tự từ vị
```
Bảng chữ cái tiếng Việt dùng cho `cấp1`: `a ă â b c d đ e ê g h i k l m n o ô ơ p q r s t u ư v x y` (29 chữ, có cả `f j w z` xếp cuối cho từ ngoại lai). Dữ liệu này là **kiến thức phổ thông, ta tự lập, CC0** — **không có vướng mắc giấy phép** (và không cần tải CLDR: `Intl.Collator('vi')` đã có sẵn trong WebView2, offline, không phí bản quyền — `Intl.Collator.supportedLocalesOf(['vi'])` trả về `['vi']`, đã kiểm).

Áp dụng tới: Sort, AutoFilter (thứ tự danh sách lọc), SORT/SORTBY, RANK trên text, Pivot (thứ tự nhãn hàng/cột), và **Writer**: sắp xếp bảng, sắp xếp danh sách, Mục lục/Index.

### 3.6. Công sức & ưu tiên

- Lớp so sánh theo âm tiết + 60 test case (lấy từ thứ tự Từ điển tiếng Việt): **~2 ngày**
- Đấu nối vào Sort / AutoFilter / SORT / Pivot / bảng Writer: **~3 ngày**
- Chế độ "Tên người Việt": **~1,5 ngày**
- Đo thật Excel 2016 để chứng minh Excel sai: **~0,5 ngày**
- Hướng dẫn tiếng Việt: **~0,5 ngày**

**Tổng ≈ 7,5 ngày-agent. Điểm ưu tiên: 74/100.**

---

## 4. VN-4 — HÀM ĐỌC SỐ THÀNH CHỮ TIẾNG VIỆT

### 4.1. Tên hàm đề xuất

| Hàm | Chữ ký | Mục đích |
|---|---|---|
| `DOCSO(số; [tuỳ_chọn])` | Trả chuỗi tiếng Việt | Đọc số thuần, không đơn vị |
| `BANGCHU(số; [đơn_vị]; [tuỳ_chọn])` | Trả chuỗi có hậu tố tiền | Dùng cho hoá đơn/chứng từ: `BANGCHU(1234000)` → `Một triệu hai trăm ba mươi tư nghìn đồng` |

`tuỳ_chọn` là chuỗi cờ, mặc định `""`:
- `"L"` dùng **lẻ** thay **linh**; `"N"` dùng **ngàn** thay **nghìn** (phương ngữ Nam)
- `"U"` viết hoa chữ cái đầu (mặc định bật), `"A"` viết hoa toàn bộ
- `"C"` thêm `"./."` ở cuối (thói quen chứng từ kế toán)
- `"X"` đọc phần thập phân thành `phẩy …` thay vì làm tròn

Giữ tương thích: cũng đăng ký alias `VND(…)` và `DOCSOTHANHCHU(…)` để người dùng gõ theo quán tính các add-in cũ. Phải **đặt vào nhóm hàm "VN" riêng** trong trình chèn hàm và **không đụng** tới namespace hàm Excel chuẩn.

### 4.2. QUY TẮC CHÍNH XÁC (đặc tả để viết test trước)

**Phân nhóm:** chia số thành các nhóm 3 chữ số từ phải sang, hậu tố theo lớp: `nghìn` (10³), `triệu` (10⁶), `tỷ` (10⁹), `nghìn tỷ` (10¹²), `triệu tỷ` (10¹⁵), `tỷ tỷ` (10¹⁸). *(Tiếng Việt không có từ riêng cho 10¹²; dùng lặp `nghìn tỷ`/`triệu tỷ` là cách đọc phổ thông.)*

**Chữ số:** `không một hai ba bốn năm sáu bảy tám chín`

**Quy tắc biến âm — đây là phần mọi macro VBA làm sai:**

| Mã | Quy tắc | Đúng | Sai |
|---|---|---|---|
| R1 | Hàng chục = 1 → đọc **"mười"** | 15 → mười **lăm** | mười năm |
| R2 | Hàng chục ≥ 2 → đọc **"mươi"** | 25 → hai **mươi** lăm | hai mười năm |
| R3 | Hàng đơn vị = 5, đứng sau hàng chục ≥ 1 → **"lăm"** | 15 → mười **lăm**; 25 → hai mươi **lăm** | mười năm |
| R4 | Hàng đơn vị = 5, **không** có hàng chục → **"năm"** | 5 → **năm**; 105 → một trăm linh **năm** | một trăm linh lăm |
| R5 | Hàng đơn vị = 1, đứng sau hàng chục ≥ 2 → **"mốt"** | 21 → hai mươi **mốt**; 31 → ba mươi **mốt** | hai mươi một |
| R6 | Hàng đơn vị = 1, hàng chục = 1 → **"một"** | 11 → mười **một** | mười mốt |
| R7 | Hàng đơn vị = 4, đứng sau hàng chục ≥ 2 → **"tư"** | 24 → hai mươi **tư**; 1234000 → … ba mươi **tư** nghìn | hai mươi bốn |
| R8 | Hàng đơn vị = 4, hàng chục = 1 hoặc 0 → **"bốn"** | 14 → mười **bốn**; 104 → một trăm linh **bốn** | mười tư |
| R9 | Hàng chục = 0 mà có hàng trăm và hàng đơn vị ≠ 0 → chèn **"linh"** (hoặc "lẻ" với cờ `L`) | 105 → một trăm **linh** năm | một trăm năm |
| R10 | Hàng chục = 0, hàng đơn vị = 0 → không đọc gì | 100 → một trăm | một trăm linh không |
| R11 | Nhóm giữa bị khuyết hàng trăm nhưng **có** nhóm cao hơn → đọc **"không trăm"** | 1.000.045 → một triệu **không trăm** bốn mươi lăm | một triệu bốn mươi lăm |
| R12 | Nhóm = 000 → **bỏ hẳn** cả nhóm và hậu tố | 1.000.000 → một triệu | một triệu không nghìn |
| R13 | Nhóm đầu tiên (cao nhất) không đọc "không trăm" | 45.000 → bốn mươi lăm nghìn | không trăm bốn mươi lăm nghìn |

**Các ca biên bắt buộc có test:**

| Đầu vào | Kết quả mong đợi (`BANGCHU`) |
|---|---|
| `0` | `Không đồng` |
| `1` | `Một đồng` |
| `4` | `Bốn đồng` |
| `5` | `Năm đồng` |
| `10` | `Mười đồng` |
| `11` | `Mười một đồng` |
| `14` | `Mười bốn đồng` |
| `15` | `Mười lăm đồng` |
| `21` | `Hai mươi mốt đồng` |
| `24` | `Hai mươi tư đồng` |
| `25` | `Hai mươi lăm đồng` |
| `100` | `Một trăm đồng` |
| `105` | `Một trăm linh năm đồng` |
| `1000` | `Một nghìn đồng` |
| `1005` | `Một nghìn không trăm linh năm đồng` |
| `1234000` | `Một triệu hai trăm ba mươi tư nghìn đồng` |
| `1000045` | `Một triệu không trăm bốn mươi lăm đồng` |
| `1000000000` | `Một tỷ đồng` |
| `1000000000000` | `Một nghìn tỷ đồng` |
| `-5000` | `Âm năm nghìn đồng` |
| `1234.56` (mặc định) | `Một nghìn hai trăm ba mươi bốn đồng` *(bỏ phần lẻ — đúng thông lệ VND)* |
| `1234.56` + cờ `X` | `Một nghìn hai trăm ba mươi bốn phẩy năm sáu đồng` |
| `1234.5` + `BANGCHU(…;"USD";"X")` | `Một nghìn hai trăm ba mươi bốn phẩy năm USD` |
| rỗng / text | `#VALUE!` (như Excel) |

**Giới hạn độ chính xác:** `Number` của JS chỉ an toàn tới 2⁵³ ≈ 9,007×10¹⁵. Với số lớn hơn **phải nhận chuỗi** và xử lý bằng chữ số (như nhiều macro VBA tốt đã làm). Ghi rõ trong hướng dẫn. **Ghi nhớ bài học cũ của dự án**: lỗi "formula precision" từng do làm tròn phá dữ liệu — hàm này **không được** làm tròn số gốc trong ô, chỉ sinh chuỗi.

### 4.3. Phương ngữ

| Biến thể | Bắc | Nam |
|---|---|---|
| 10³ | **nghìn** | **ngàn** |
| 0 ở hàng chục | **linh** | **lẻ** |
| 10⁹ | tỷ | tỉ *(chính tả)* |

⇒ Một **cài đặt cấp ứng dụng** "Cách đọc số": `Bắc (nghìn / linh)` · `Nam (ngàn / lẻ)`, và cờ hàm ghi đè cài đặt. Mặc định **Bắc** (khớp văn bản hành chính).

### 4.4. Vì sao Excel không làm

Excel có `BAHTTEXT` (tiếng Thái) nhưng **không có bản tiếng Việt**. Người Việt phải: (a) cài add-in bên thứ ba (vnTools, AccHelper…), hoặc (b) dán macro VBA vào từng workbook. Hệ quả thực tế mà kế toán Việt Nam gặp hằng ngày:
- Workbook `.xlsx` **không lưu được macro** ⇒ phải đổi sang `.xlsm` ⇒ gửi đi bị cảnh báo bảo mật ⇒ nhiều nơi chặn hẳn macro.
- Mở trên máy khác không có add-in → `#NAME?`.
- Mở trên Excel Online / điện thoại → `#NAME?`.

**VN Sheet có hàm sẵn trong engine ⇒ file mở ở đâu cũng đúng, không macro, không cảnh báo bảo mật.** Đây là lợi thế rất dễ truyền thông.

### 4.5. Căn cứ nhu cầu pháp lý

Nghị định 123/2020/NĐ-CP (hoá đơn, chứng từ) quy định nội dung hoá đơn, trong đó có tiêu thức tổng số tiền thanh toán; Điều 10 đã được sửa đổi bởi khoản 8 Điều 1 **Nghị định 70/2025/NĐ-CP** (hiệu lực 01/06/2025). **CHƯA KIỂM: điểm/khoản chính xác quy định "tổng số tiền thanh toán bằng chữ" trong bản hợp nhất mới nhất** — phải tra văn bản hợp nhất Điều 10 trên `vbpl.vn` trước khi dùng làm căn cứ marketing. Dù vậy, nhu cầu nghiệp vụ (phiếu thu/chi, uỷ nhiệm chi, hợp đồng, biên bản) là không bàn cãi.

### 4.6. Giấy phép

**Tự viết 100%.** Các macro VBA lưu hành trên diễn đàn (giaiphapexcel, hocexcel.online, gitiho…) và các add-in (vnTools…) đều **không có giấy phép rõ** hoặc là phần mềm thương mại ⇒ **không được đọc rồi copy**. Quy tắc biến âm ở §4.2 là **kiến thức ngôn ngữ phổ thông**, ta tự đặc tả — không chép code. Phát hành theo giấy phép của VN Office.

### 4.7. Công sức & ưu tiên

- Engine đọc số + 60 unit test theo bảng ca biên: **~2 ngày**
- Đăng ký hàm vào formula engine + trình chèn hàm + nhóm "VN" + tooltip: **~1 ngày**
- Xuất/nhập XLSX: hàm riêng của ta không có trong Excel ⇒ **phải lưu kèm giá trị đã tính (cached value)** và khi mở lại trong Excel hiện giá trị đúng (không `#NAME?`), có cảnh báo khi Lưu dưới dạng `.xlsx` rằng công thức sẽ không tính lại được ở Excel: **~1,5 ngày** *(phần này cần cẩn trọng — chạm vào save pipeline, phải chạy batch LAN trước khi gộp)*
- Cài đặt phương ngữ + hướng dẫn tiếng Việt: **~1 ngày**

**Tổng ≈ 5,5 ngày-agent. Điểm ưu tiên: 85/100.**

---

## 5. VN-5 — CHÍNH TẢ, DẤU THANH VÀ GÕ TIẾNG VIỆT

### 5.1. Từ điển chính tả — ĐÃ GIẢI QUYẾT SẠCH, không cần làm lại

Hiện trạng trong repo (`platform/text/dictionaries/LICENSES-vi.txt`):
- Nguồn: **Mozilla Common Voice** `server/data/vi/sentence-collector.txt`, snapshot `154dda17…`, SHA-256 ghi rõ ⇒ 2.798 token.
- **Giấy phép dữ liệu: CC0-1.0.** Ghi rõ *"No LibreOffice, Hunspell, Ho Ngoc Duc, Wiktionary, OpenSubtitles… data is included"*.
- Phần bổ sung `vi-dictionary-supplement.js`: tự biên, CC0-1.0.
- `platform/text/vi-syllable.js`: quy tắc ghép vần tự biên soạn, CC0-1.0 — chấp nhận **mọi âm tiết hợp lệ** nên bao phủ rộng hơn danh sách từ.

**Đối chiếu: Hunspell `vi_VN` là GPL-family** (upstream `1ec5/hunspell-vi` ghi GPLv3; wooorm/dictionaries và Fedora ghi GPL-2.0; CERN ghi GPL+). Mozilla đã **loại** từ điển tiếng Việt khỏi repo của họ với lý do *"dictionaries released under GPL are not suitable"*. Từ điển Aspell tiếng Việt: GPL (một nguồn nói LGPL — mâu thuẫn, **CHƯA KIỂM**). Từ gốc được nêu là *"Vietnamese Dictionary list from Professor Hồ Ngọc Đức"* — **không rõ giấy phép của danh sách gốc**.

⇒ **Kết luận: KHÔNG được nhập Hunspell vi_VN.** Lựa chọn hiện tại (corpus CC0 + quy tắc ghép vần tự viết) là đúng và nên giữ. Hướng mở rộng sạch: thêm corpus **CC0/CC-BY** khác (Common Voice bản mới, dữ liệu mở của Bộ TT&TT, VNTC nếu giấy phép cho phép — **CHƯA KIỂM**) và mở rộng `vi-dictionary-supplement.js` tự biên.

### 5.2. "hoà" vs "hòa" — chuyển đổi kiểu đặt dấu thanh

**Bản chất vấn đề:** với các vần `oa, oe, uy` **không có âm cuối**, có hai cách đặt dấu:
- **Kiểu cũ** (thẩm mỹ, dấu ở giữa chữ): h**ò**a, h**ỏ**e, th**ú**y → `hòa` = `h` + `U+00F2` + `a`
- **Kiểu mới** (ngữ âm, dấu trên âm chính): ho**à**, ho**è**, thu**ý** → `hoà` = `h` + `o` + `U+00E0`

Theo Wikipedia tiếng Việt ("Quy tắc đặt dấu thanh của chữ Quốc ngữ"), đến 2022 **sách giáo khoa ở Việt Nam đặt dấu theo kiểu mới**; cả hai đều được chấp nhận trong thực tế miễn là dùng thống nhất trong một văn bản. **CHƯA KIỂM: có văn bản quy phạm nào bắt buộc một kiểu hay không** — không tìm được Quyết định 240/1984 hay quy định tương đương từ nguồn gốc; **không được viện dẫn blog**.

**Hậu quả kỹ thuật, đo được:**
```js
new Intl.Collator('vi').compare('hòa','hoà')                    // → 1   (coi là hai từ khác nhau)
new Intl.Collator('vi',{sensitivity:'base'}).compare('hòa','hoà') // → 0
```
⇒ Trong Word/Excel: **tìm kiếm `hòa` không ra `hoà`**, sắp xếp tách thành hai nhóm, đếm từ sai, VLOOKUP tra không khớp (và VLOOKUP là **91% công thức** trên share LAN!). Microsoft hoàn toàn không xử lý.

**Tính năng đề xuất (3 phần):**
1. **Chuẩn hoá khi tra cứu** — một tầng "Dấu thanh linh hoạt" bật trong: Tìm/Thay thế (Writer + Sheet + Slides), VLOOKUP/MATCH/XLOOKUP/COUNTIF (tuỳ chọn, mặc định **tắt** để giữ tương thích Excel), AutoFilter, sắp xếp. Cài đặt: "Coi *hoà* và *hòa* là một".
2. **Bộ chuyển kiểu dấu** — nút "Chuyển kiểu đặt dấu thanh": `Kiểu cũ → Kiểu mới` / `Kiểu mới → Kiểu cũ`, áp dụng cho vùng chọn hoặc toàn tài liệu, 1 bước Undo. Chỉ ảnh hưởng **đúng 3 vần `oa/oe/uy` không có âm cuối** — danh sách ký tự bị ảnh hưởng là hữu hạn và nhỏ (`oà oá oả oã oạ oè oé oẻ oẽ oẹ uỳ uý uỷ uỹ uỵ` ↔ `òa óa ỏa õa ọa è̀e…`), rất dễ test cạn.
3. **Kiểm tra nhất quán** — cảnh báo "Tài liệu này dùng lẫn cả hai kiểu đặt dấu (12 chỗ kiểu cũ, 48 chỗ kiểu mới). [Thống nhất theo kiểu mới]".

**Giấy phép: không vướng gì.** Danh sách vần là kiến thức ngôn ngữ, tự lập.
**Công sức ≈ 3 ngày-agent. Điểm ưu tiên: 70/100.**

### 5.3. Gõ Telex / VNI / VIQR — đã làm rất tốt, chỉ còn 2 khoảng trống

Hiện trạng (`docs/HANDOFF-VIETNAMESE-TYPING.md`, tính năng CH-4.7): `platform/keyboard/input-normalizer.js` đã giải quyết 4 lỗi kinh điển và được kiểm thử **1082/1082 PASS** qua CDP trên desktop thật, trên 77 cụm từ × 3 app:

| Lỗi kinh điển khi gõ tiếng Việt trong editor web | Cách VN Office đã xử lý |
|---|---|
| Nhảy con trỏ khi bộ gõ backspace-rồi-chèn | `GlobalImeTracker` + cửa sổ burst 60ms |
| Mất/nhân đôi dấu | Hoàn nguyên chuỗi phím đúng hành vi Unikey/EVKey |
| Ctrl+Z xoá sạch cả câu thay vì 1 từ | Hoàn tác cấp từ nguyên tử, stack 50 bước |
| Kiểm tra chính tả / gợi ý công thức nhảy vào giữa chuỗi IME | Hoãn khi cờ burst bật; `formula-autocomplete` ẩn popup khi gặp ký tự ngoài ASCII |
| NFD lọt vào model | `normalizeInputNfc()` / `normalizeContentEditableNfc()` khi ghi model |

**Hai khoảng trống còn lại:**
- **VIQR chưa có test** — bộ gõ VIQR (`a'`, `` a` ``, `dd`) vẫn dùng trong email và một số hệ thống cũ. Nên bổ sung vào `tests/live/cdp/vietnamese-typing.desktop.mjs`. **~0,5 ngày.**
- **Gõ bằng bàn phím Unicode tổ hợp (macOS Vietnamese IME)** — trên macOS bộ gõ hệ thống sinh NFD nhiều hơn. Đã có `normalizeInputNfc` nhưng chưa có kịch bản riêng cho cổng macOS. **~1 ngày** (thuộc nhánh `platform/macos`).

### 5.4. Autocorrect lỗi gõ tiếng Việt phổ biến — khoảng trống rõ

Word có AutoCorrect tiếng Anh (`teh → the`). **Không có bộ nào cho tiếng Việt.** VN Office đã có `apps/writer/auto-correct-options.js` ⇒ chỉ cần nạp bộ quy tắc Việt:

| Nhóm | Ví dụ | Ghi chú |
|---|---|---|
| Thiếu dấu do gõ nhanh | `nam` → gợi ý `năm` (chỉ **gợi ý**, không tự sửa — nghĩa phụ thuộc ngữ cảnh) | Phải là **gợi ý** chứ không autocorrect, nếu không sẽ phá văn bản |
| Lẫn `i / y` | `kỹ thuật` ↔ `kĩ thuật`, `quí` ↔ `quý`, `lí do` ↔ `lý do` | **Cả hai đều hợp lệ** ⇒ chỉ kiểm tra **nhất quán** trong một văn bản |
| Lẫn `d / gi / r`, `ch / tr`, `s / x`, `n / l` (phương ngữ) | `dành` vs `giành`, `sử lý` → `xử lý`, `chuẩn đoán` → `chẩn đoán` | Danh sách cặp dễ lẫn cố định, có thể autocorrect an toàn với các từ chỉ-có-một-cách-đúng |
| Thanh hỏi/ngã | `sử dụng` ✓ vs `sữ dụng` ✗; `chia sẻ` ✓ vs `chia sẽ` ✗ | Rất phổ biến; danh sách ~500 từ hỏi/ngã dễ sai |
| Viết hoa theo Phụ lục II NĐ 30 | `ủy ban nhân dân` → `Ủy ban nhân dân`; `hà nội` → `Hà Nội` | Nối với VN-1; chỉ bật khi tài liệu ở chế độ "Chuẩn NĐ 30" |
| Khoảng trắng quanh dấu câu | `xin chào , bạn` → `xin chào, bạn` | An toàn, autocorrect được |
| Dấu nháy/gạch ngang VN | `"..."` → `“…”`, `- ` đầu dòng giữ nguyên (**không** biến thành bullet trong văn bản hành chính vì NĐ 30 yêu cầu gạch đầu dòng là ký tự thật) | Đã có hạ tầng AutoCorrect |

**Giấy phép:** danh sách cặp từ dễ lẫn phải **tự biên soạn** (CC0), không copy từ từ điển chính tả có bản quyền. **Công sức ≈ 3 ngày-agent** (2 ngày soạn + kiểm bộ quy tắc, 1 ngày đấu nối + hướng dẫn). **Điểm ưu tiên: 66/100.**

---

## 6. VN-6 — CÁC Ý KHÁC, ĐÃ SÀNG LỌC THEO NHU CẦU VÀ RỦI RO

| Ý | Nhu cầu thật | Office làm được? | Rủi ro / giấy phép | Phán quyết |
|---|---|---|---|---|
| **Âm lịch Việt Nam** — hàm `AMLICH(ngày)`, `NGAYDUONG(ngày_âm)`, `CANCHI(năm)`, `TIETKHI(ngày)`; hiển thị ngày âm trong ô ngày và trong lịch | Cao: cưới hỏi, giỗ chạp, khai trương, lịch Tết, lịch sản xuất. Excel **hoàn toàn không có** (chỉ có lịch Hồi giáo/Do Thái/Nhật) | ❌ Không | Thuật toán phổ biến nhất là `amlich.js` của **Hồ Ngọc Đức (2004/2006)** — **không tìm được giấy phép công bố** ⇒ coi như bảo lưu toàn quyền, **KHÔNG copy**. Thư viện dẫn xuất ghi MIT nhưng đó là giấy phép **code của họ**, không phải thuật toán gốc. **Giải pháp sạch: tự cài đặt từ thuật toán thiên văn công bố (Jean Meeus, *Astronomical Algorithms* — công thức là dữ kiện khoa học) + múi giờ UTC+7**, rồi **xác thực bằng lịch in** của ≥2 năm. Đây đúng là cách tác giả gốc đã làm. | **LÀM** — nhưng tự cài đặt. ~4 ngày-agent (2 ngày thuật toán + 1 ngày xác thực đối chiếu + 1 ngày hàm/UI/hướng dẫn). **Ưu tiên 62/100** |
| **Định dạng số/tiền kiểu Việt** — dấu phân cách nghìn `.` và thập phân `,`; `1.234.567,89 ₫`; định dạng `#.##0 "đồng"`; đọc đúng khi nhập `1.234,56` | Cao. Đã có một phần: `tests/unit/sheet-locale-input.test.js`, `tests/live/cdp/q66-sheet-locale.desktop.mjs` | Có, nhưng phụ thuộc cài đặt Windows của từng máy ⇒ file truyền tay bị lệch | Không vướng | **ĐÃ CÓ PHẦN LỚN** — việc còn lại: đưa thành **thuộc tính của workbook** (lưu trong file) chứ không theo locale máy, để file mở ở máy khác không lệch. ~2 ngày. **Ưu tiên 58/100** |
| **Định dạng ngày VN** — `dd/mm/yyyy` mặc định, `"ngày" dd "tháng" mm "năm" yyyy` (đúng văn phong NĐ 30, gồm quy tắc thêm `0` cho ngày < 10 và tháng 1, 2), thứ tiếng Việt `Thứ Hai…Chủ Nhật` | Cao | Có định dạng tuỳ chỉnh, nhưng tên thứ/tháng theo locale máy | Không vướng | **LÀM**, gộp vào VN-1 (văn bản hành chính cần đúng kiểu `ngày 05 tháng 01 năm 2020`). ~1 ngày. **Ưu tiên 60/100** |
| **Mẫu hoá đơn / chứng từ kế toán** | Cao nhưng… | — | ⚠️ **Rủi ro pháp lý cao.** Hoá đơn điện tử ở VN là **dữ liệu XML có ký số, gửi cơ quan thuế**, không phải tài liệu Office. Nghị định 123/2020 đã bị sửa 2 lần (2022, 2024) và Điều 10 sửa bởi **NĐ 70/2025** từ 01/06/2025. Làm "mẫu hoá đơn" trong Writer dễ bị hiểu là hoá đơn hợp pháp. | **KHÔNG LÀM hoá đơn.** Chỉ làm **phiếu thu/phiếu chi/biên bản** (là văn bản hành chính, thuộc VN-1) và hàm `BANGCHU` (VN-4). **Ưu tiên 20/100** |
| **Mẫu bảng lương / BHXH** | Trung bình–cao | Người dùng tự làm | ⚠️ Tỷ lệ trích BHXH/BHYT/BHTN và mức lương cơ sở **thay đổi gần như hằng năm** | **LÀM dạng mẫu có BẢNG THAM SỐ tách riêng** (sheet "Tham số" chứa tỷ lệ, người dùng tự cập nhật), **tuyệt đối không hard-code tỷ lệ vào công thức**, kèm dòng chữ "Tham số cập nhật đến <ngày>; người dùng tự kiểm tra". ~2 ngày. **Ưu tiên 45/100** |
| **Hàm tính thuế TNCN** | Trung bình | Người dùng tự làm bằng nhiều `IF` | ⚠️⚠️ **Rủi ro cao nhất trong toàn bộ tài liệu này.** Biểu thuế **vừa đổi năm 2026**: từ **7 bậc xuống 5 bậc** (5/10/20/30/35%), bậc 35% áp từ thu nhập tính thuế **trên 100 triệu/tháng** (trước là 80 triệu); giảm trừ gia cảnh lên **15,5 triệu/tháng** cho người nộp thuế và **6,2 triệu/tháng** cho mỗi người phụ thuộc (trước 11 / 4,4 triệu). Căn cứ được nêu: **Nghị quyết 110/2025/UBTVQH15** và **Luật số 109/2025/QH15**. **CHƯA KIỂM: ngày hiệu lực** — các nguồn mâu thuẫn giữa **01/01/2026** và **01/07/2026**; phải tra văn bản gốc trên `vbpl.vn`. | **KHÔNG làm hàm `THUETNCN()` cố định.** Thay vào đó: **mẫu "Bảng tính thuế TNCN"** với biểu thuế nằm trong một **bảng tham số nhìn thấy được**, công thức dùng `SUMPRODUCT`/`VLOOKUP` tra bảng đó, và **ô ghi rõ ngày hiệu lực của biểu thuế**. Tuyệt đối không nhúng số vào engine — số sai = sai thuế = trách nhiệm pháp lý. ~2 ngày. **Ưu tiên 35/100** |
| **Viết hoa theo Phụ lục II NĐ 30** | Cao (gộp VN-1/VN-5) | Không | Không vướng | Gộp vào VN-5 autocorrect |
| **Sắp xếp tên người Việt theo tên gọi** | Cao (danh bạ, bảng điểm, danh sách CBCNV) | Không | Không vướng | Gộp vào VN-3 chế độ 3 |
| **Chuyển Việt → không dấu (slug)** `KHONGDAU()` | Trung bình (đặt tên file, mã khách hàng, URL) | Không có hàm sẵn | Không vướng | **LÀM**, rẻ. ~0,5 ngày. **Ưu tiên 50/100** |
| **Đếm từ tiếng Việt đúng** (âm tiết vs từ ghép) | Thấp–trung bình | Word đếm theo khoảng trắng ⇒ "Việt Nam" = 2 từ | Không vướng | Đã có probe `scripts/audit-0610/doc_wordcount_*`. Chỉ cần **bổ sung chỉ số "số âm tiết"** bên cạnh "số từ". ~1 ngày. **Ưu tiên 40/100** |

---

## 7. BẢNG XẾP HẠNG CUỐI — SẴN SÀNG THÀNH TICKET

Điểm ưu tiên = trung bình có trọng số: **Nhu cầu** (×0,35) + **Office không làm được** (×0,30) + **An toàn giấy phép/pháp lý** (×0,20) + **Rẻ để làm** (×0,15), thang 0–100.

| Hạng | Mã | Tính năng | App | Nhu cầu | Office thiếu | An toàn GP | Rẻ | **Điểm** | Công sức | Rào cản |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|---|---|
| 1 | **VN-2** | Tự nhận dạng + chuyển bộ mã cũ TCVN3/VNI/VISCII/VPS (+ chuyển hàng loạt) | Doc, Sheet, Slide | 95 | 100 | 95 | 80 | **95** | 13 ng | Phải TỰ LẬP bảng mã (CC0), không copy GPL/no-licence |
| 2 | **VN-1** | Chuẩn văn bản hành chính NĐ 30/2020: formatter 1 nút + checker 26 luật có trích dẫn + 14 mẫu | Doc | 100 | 100 | 85 | 60 | **92** | 14,5 ng | Cần xác nhận hiệu lực NĐ trên `vbpl.vn`; cần toạ độ sơ đồ từ ảnh trang 12 |
| 3 | **VN-4** | `DOCSO` / `BANGCHU` — đọc số thành chữ tiếng Việt | Sheet (+ Doc qua field) | 95 | 95 | 100 | 75 | **85** | 5,5 ng | Chạm save pipeline (cached value cho XLSX) ⇒ **phải chạy batch LAN trước khi gộp** |
| 4 | **VN-3** | Sắp xếp theo thứ tự từ điển tiếng Việt (theo âm tiết) + chế độ tên người | Sheet, Doc | 80 | 85 | 100 | 65 | **74** | 7,5 ng | Phải đo Excel 2016 thật trước khi tuyên bố Excel sai; **không** đổi hành vi so sánh trong công thức mà không có quyết định riêng |
| 5 | **VN-5a** | Chuyển kiểu đặt dấu thanh (hoà ⇄ hòa) + tìm kiếm/tra cứu không phân biệt kiểu dấu | Doc, Sheet, Slide | 75 | 100 | 100 | 75 | **70** | 3 ng | Bật "dấu thanh linh hoạt" cho VLOOKUP phải **mặc định tắt** (tương thích Excel) |
| 6 | **VN-5b** | AutoCorrect + kiểm tra chính tả tiếng Việt (hỏi/ngã, d/gi/r, s/x, i/y, viết hoa PL II) | Doc, Sheet, Slide | 85 | 90 | 90 | 50 | **66** | 3 ng | Danh sách phải tự biên; chỉ **gợi ý** với từ nhập nhằng, không tự sửa |
| 7 | **VN-6a** | Âm lịch: `AMLICH`, `NGAYDUONG`, `CANCHI`, `TIETKHI` + ngày âm trong lịch | Sheet, Doc | 70 | 100 | 70 | 55 | **62** | 4 ng | **Không copy `amlich.js`**; tự cài từ thuật toán thiên văn công bố, xác thực đối chiếu lịch in |
| 8 | **VN-6b** | Định dạng ngày VN (`ngày dd tháng mm năm yyyy`, thứ tiếng Việt) | Doc, Sheet | 80 | 55 | 100 | 85 | **60** | 1 ng | Gộp ticket với VN-1 |
| 9 | **VN-6c** | Định dạng số/tiền VN lưu theo workbook (không theo locale máy) | Sheet | 85 | 50 | 100 | 70 | **58** | 2 ng | Đã có phần lớn; phần còn lại chạm định dạng file |
| 10 | **VN-6d** | `KHONGDAU()` — bỏ dấu tiếng Việt | Sheet, Doc | 55 | 85 | 100 | 95 | **50** | 0,5 ng | — |
| 11 | **VN-6e** | Mẫu bảng lương / BHXH với bảng tham số tách riêng | Sheet | 70 | 40 | 60 | 70 | **45** | 2 ng | **Không hard-code tỷ lệ**; phải ghi ngày cập nhật tham số |
| 12 | **VN-6f** | Đếm âm tiết tiếng Việt bên cạnh đếm từ | Doc | 45 | 70 | 100 | 85 | **40** | 1 ng | — |
| 13 | **VN-6g** | Mẫu bảng tính thuế TNCN (biểu thuế trong bảng tham số) | Sheet | 65 | 35 | 25 | 70 | **35** | 2 ng | ⚠️ Biểu thuế **vừa đổi 2026**; **CHƯA KIỂM ngày hiệu lực 01/01 hay 01/07/2026**. Cần chủ dự án duyệt trước khi làm |
| 14 | **VN-6h** | Mẫu hoá đơn điện tử | — | 80 | 20 | 10 | 30 | **20** | — | ❌ **Khuyến nghị KHÔNG LÀM** — hoá đơn ĐT là XML ký số gửi thuế, không phải tài liệu Office; rủi ro pháp lý |

**Tổng công sức 6 hạng đầu ≈ 46 ngày-agent.**

---

## 8. ĐIỀU KIỆN HOÀN THÀNH DÙNG CHUNG CHO MỌI TICKET Ở TRÊN

Theo `AGENTS.md`:

1. **Hướng dẫn sử dụng tiếng Việt trong app là bắt buộc** (§10): mỗi tính năng phải có mục mới trong `platform/help/entries-*.js` (tạo **file mới**, đăng ký vào `platform/help/help-catalog.js` — không sửa file help cũ), nêu rõ: tính năng làm gì, vào bằng tab/nhóm ribbon nào, các bước cơ bản. Không placeholder.
2. **Hoàn toàn offline** (§2): không gọi mạng, không tải từ điển/bảng mã lúc chạy. Mọi dữ liệu nhúng trong bản đóng gói; `main.py` tự quản mọi dịch vụ.
3. **Biên giới tầng** (§4): dữ liệu ngôn ngữ và bảng mã nằm ở `platform/text/`; lệnh ở `platform/commands/`; chỉ UI của app ở `apps/<app>/`. **Không copy-paste** sang 3 app.
4. **Giấy phép** (bộ nhớ dự án): **mọi** tệp dữ liệu/từ điển/bảng mã mới phải có mục trong file `LICENSES-*.txt` tương ứng, ghi nguồn + SHA-256 + SPDX. **Copyleft phải được chủ dự án ký duyệt riêng** — khuyến nghị của tài liệu này là **tránh hẳn copyleft** cho cả 6 tính năng đầu bằng cách tự lập dữ liệu.
5. **Trung thực kiểm thử** (§8): PASS chỉ khi đã chạy. Với VN-2 và VN-4 (chạm luồng mở/lưu): **bắt buộc chạy batch LAN 26–28 file + `npm test` đầy đủ trước khi gộp**.
6. **Trích dẫn pháp lý** (riêng VN-1): mỗi luật kiểm tra trong code mang trường `clause` trỏ đúng Mục/khoản/điểm Phụ lục I, và có test so khớp với bản trích PDF gốc. Không trích từ blog.
7. **Kiểm giao diện bằng ảnh** (bộ nhớ dự án 20/10): chụp mọi màn hình mới ở 1366×768 kiểm tra cắt chữ/chồng lấp/thiếu dịch.

---

## 9. VIỆC CẦN XÁC MINH TRƯỚC KHI MỞ TICKET (danh sách CHƯA KIỂM)

| # | Nội dung chưa kiểm | Cách kiểm | Chặn ticket nào |
|---|---|---|---|
| 1 | Nghị định 30/2020/NĐ-CP có bị sửa đổi/bổ sung hay thay thế (toàn phần hoặc Phụ lục I) tính đến 11/2026? | Tra `vbpl.vn` (CSDL quốc gia về văn bản pháp luật), xem mục "Văn bản liên quan / Hiệu lực". Không dùng blog | VN-1 (chặn) |
| 2 | Toạ độ mm của từng ô trong **Sơ đồ** (Mục IV Phần I, trang 12 PDF) — là ảnh bitmap, pypdf không đọc được | Mở trang 12 của PDF gốc dưới dạng ảnh, đo | VN-1 (chặn một phần) |
| 3 | Điều kiện sao chép bảng mã của **TCVN 5712:1993** | Hỏi Tổng cục Tiêu chuẩn Đo lường Chất lượng, hoặc **tránh hẳn**: tự lập bảng theo quy luật + xác thực trên corpus thật (khuyến nghị) | VN-2 (không chặn nếu đi đường tự lập) |
| 4 | Toàn bộ 134 giá trị byte TCVN3 và 134 cặp byte VNI-Windows | Dựng theo quy luật nhóm 5 thanh, đối chiếu chéo ≥3 nguồn độc lập, xác thực 100% âm tiết trên `<tệp TCVN3 thật phía Windows>` qua `isValidVietnameseSyllable()` | VN-2 (chặn) |
| 5 | Bảng mã **BK HCM1 / BK HCM2** và **Vietware-F/X** | Chưa tìm được nguồn có giấy phép rõ ⇒ **hoãn sang giai đoạn 2** | VN-2 (đã khoanh ra khỏi phạm vi) |
| 6 | Tỷ lệ file dùng bộ mã cũ trên **toàn bộ 672 file** của `<kho LAN nội bộ>` | Chạy script quét tên font ở §2.1 ở chế độ **chỉ đọc**; không copy, không commit, không upload | VN-2 (chỉ ảnh hưởng ước lượng ROI) |
| 7 | Word 2016 và Excel 2016 **thật** làm gì với: (a) file TCVN3, (b) sắp xếp `ca sĩ`/`cà phê` | Chạy khi Office COM mở lại được (đang bị chặn từ 18/10) | VN-2, VN-3 (chỉ ảnh hưởng câu khẳng định "Office sai") |
| 8 | Kết quả 2 ticket CLDR **10867** / **10868** về collation tiếng Việt | Tra `unicode-org/cldr` issue tracker | VN-3 (không chặn) |
| 9 | Có văn bản quy phạm nào quy định vị trí dấu thanh (kiểu cũ/mới)? | Tra `vbpl.vn` + văn bản của Bộ GD&ĐT. Nếu không có → ghi rõ "cả hai đều được dùng" trong hướng dẫn, **không** khẳng định kiểu nào "đúng" | VN-5a (ảnh hưởng nội dung hướng dẫn) |
| 10 | Điểm/khoản chính xác quy định "tổng số tiền thanh toán bằng chữ" trong bản **hợp nhất** Điều 10 NĐ 123/2020 (đã sửa bởi NĐ 70/2025) | Tra văn bản hợp nhất Điều 10 trên `vbpl.vn` | VN-4 (chỉ ảnh hưởng câu căn cứ marketing) |
| 11 | Ngày hiệu lực biểu thuế TNCN 5 bậc & giảm trừ 15,5/6,2 triệu: **01/01/2026** hay **01/07/2026**? Số hiệu chính thức (NQ 110/2025/UBTVQH15, Luật 109/2025/QH15) | Tra `vbpl.vn` / Công báo | VN-6g (chặn) |
| 12 | Giấy phép của **Luật Sở hữu trí tuệ** với văn bản quy phạm pháp luật (điều khoản chính xác loại VBQPPL khỏi đối tượng bảo hộ) | Tra văn bản gốc Luật SHTT hợp nhất | VN-1 (chỉ ảnh hưởng ghi chú pháp lý nội bộ) |
| 13 | Giấy phép danh sách từ gốc của **Hồ Ngọc Đức** (nguồn của hunspell-vi) và của `amlich.js` | Tra trang gốc `informatik.uni-leipzig.de/~duc/` | VN-5 / VN-6a — **nhưng khuyến nghị là không dùng cả hai**, nên không chặn |

---

## 10. NGUỒN

**Văn bản pháp luật gốc (đã tải và trích text, không qua blog):**
- Nghị định 30/2020/NĐ-CP — Phụ lục I–VI (62 trang): https://vanban.vcci.com.vn/hm_content/uploads/van-ban/ND_30-2020-ND-CP_Phu_luc.pdf
- Nghị định 30/2020/NĐ-CP — thân nghị định (20 trang): https://hcmyu.hpu2.edu.vn/public/fileupload/source/TAI%20LIEU/Ngh%E1%BB%8B%20%C4%91%E1%BB%8Bnh%2030.pdf
- Bản trích Phụ lục I khác (16 trang, để đối chiếu): https://hcmyu.hpu2.edu.vn/public/fileupload/source/TAI%20LIEU/Phuluc1.pdf
- Phụ lục I (bản đăng lại): https://cdn.thuvienphapluat.vn/phap-luat/2022-2/THN/pl-nghi-dinh-30.doc
- Nghị định 30/2020/NĐ-CP (toàn văn, để tra hiệu lực): https://thuvienphapluat.vn/van-ban/bo-may-hanh-chinh/decree-30-2020-nd-cp-records-management-472077.aspx

**Bộ mã tiếng Việt:**
- RFC 1456 — Conventions for Encoding the Vietnamese Language (VISCII + VIQR, IETF, 5/1993): https://www.rfc-editor.org/rfc/rfc1456 · https://datatracker.ietf.org/doc/rfc1456/
- Bảng đối chiếu bộ mã (chỉ để kiểm tra chéo, **không có giấy phép**): https://vietunicode.sourceforge.net/charset/
- UnicodeConverter (GPL-2.0, **không dùng**): https://unicodeconvert.sourceforge.net/ · https://vietunicode.sourceforge.net/download/unicodeconverter/readme.html
- py-unicode-convert (**không có LICENSE, không dùng**): https://github.com/vuthaihoc/py-unicode-convert
- vietnameseConverter (R, bảng dẫn xuất từ vietunicode): https://cran.r-project.org/web/packages/vietnameseConverter/vietnameseConverter.pdf
- VSCII / VISCII (bối cảnh): https://en.wikipedia.org/wiki/VSCII
- libiconv `viscii.h` (LGPL, không dùng): https://skia.googlesource.com/third_party/libiconv/+/v1.7/lib/viscii.h

**Sắp xếp:**
- CLDR — bảng thứ tự `vi`: https://www.unicode.org/cldr/cldr-aux/charts/29/collation/vi.html
- "Vietnamese Collation Wrong for Polysyllables", `cldr-users` 1/2018 (ticket 10867, 10868): https://corp.unicode.org/pipermail/cldr-users/2018-January/000713.html · https://corp.unicode.org/pipermail/cldr-users/2018-January/000711.html · https://corp.unicode.org/pipermail/cldr-users/2018-January/000718.html

**Chính tả / dấu thanh:**
- Hunspell vi — giấy phép GPL: https://github.com/wooorm/dictionaries/blob/main/dictionaries/vi/license · https://packages.fedoraproject.org/pkgs/hunspell-vi/hunspell-vi/index.html · https://www.freshports.org/vietnamese/hunspell
- Mozilla loại từ điển GPL: https://wiki.mozilla.org/L10n:Dictionaries
- Vietnamese SpellChecker (nguồn danh sách từ Hồ Ngọc Đức): https://extensions.openoffice.org/en/project/vietnamese-spellchecker.html
- Quy tắc đặt dấu thanh (kiểu cũ / kiểu mới): https://vi.wikipedia.org/wiki/Quy_t%E1%BA%AFc_%C4%91%E1%BA%B7t_d%E1%BA%A5u_thanh_c%E1%BB%A7a_ch%E1%BB%AF_Qu%E1%BB%91c_ng%E1%BB%AF
- Thống nhất vị trí dấu thanh (ngonngu.net): https://ngonngu.net/cv_datdau_ptl0/86

**Âm lịch:**
- Thư viện dẫn xuất từ thuật toán Hồ Ngọc Đức (MIT cho code của họ): https://github.com/baolanlequang/VietnameseLunar-android · https://github.com/NghiaCaNgao/LunarDate

**Hoá đơn / thuế:**
- Nghị định 123/2020/NĐ-CP, Điều 10 (đã sửa bởi NĐ 70/2025 từ 01/06/2025): https://caselaw.vn/van-ban-phap-luat/373273-nghi-dinh-so-123-2020-nd-cp-ngay-19-10-2020-cua-chinh-phu-quy-dinh-ve-hoa-don-chung-tu
- Thuế TNCN 2026, biểu 5 bậc + giảm trừ 15,5/6,2 triệu (NQ 110/2025/UBTVQH15, Luật 109/2025/QH15): https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/cap-nhat-muc-giam-tru-gia-canh-2026-theo-quy-dinh-moi-nhat-18952.html · https://thuvienphapluat.vn/phap-luat/ho-tro-phap-luat/ap-dung-giam-tru-gia-canh-tu-01012026-hay-0172026-muc-giam-tru-gia-canh-2026-nhu-the-nao-245956.html

**Bằng chứng trong repo (đường dẫn tuyệt đối):**
- `E:\VN OFice\core-master\core-master\include\rtl\textenc.h` (dòng 81, 236) — LibreOffice chỉ có `RTL_TEXTENCODING_MS_1258` cho tiếng Việt
- `E:\VN OFice\core-master\core-master\sal\textenc\tcvteas1.tab` (dòng 193, 248) — chỉ có bảng Windows-1258
- `<tệp TCVN3 thật phía Windows>` — **file TCVN3 thật**, chứa `<mẫu TCVN3>` và font `.VnTime/.VnTimeH/.VnArial`
- `E:\VN OFice\platform\text\dictionaries\LICENSES-vi.txt` — từ điển chính tả hiện tại: Common Voice snapshot, **CC0-1.0**, không chứa dữ liệu Hunspell/Hồ Ngọc Đức
- `E:\VN OFice\platform\text\vi-syllable.js` — `isValidVietnameseSyllable()`, quy tắc ghép vần tự biên, CC0-1.0 → **dùng làm hàm chấm điểm cho VN-2**
- `E:\VN OFice\apps\sheet\page-setup-dialog.js` → thực tế là `E:\VN OFice\apps\writer\page-setup-dialog.js` dòng 10 — preset lề `"Chuẩn NĐ 30/2020"` (20/20/30/15 mm)
- `E:\VN OFice\adapters\libreoffice\writer\writer-adapter.js` dòng 250 — preset danh sách `nd30`
- `E:\VN OFice\adapters\libreoffice\common\ooxml_zip_patch.py` dòng 24639 — `nd30` → `[("decimal","Điều %1."),("decimal","%2."),("lowerLetter","%3)")]`
- `E:\VN OFice\apps\sheet\sheet-grid.js` dòng 17253–17254, `E:\VN OFice\apps\sheet\data-tools.js` dòng 204–205 — sắp xếp đã dùng `localeCompare(..., "vi-VN")`
- `E:\VN OFice\apps\sheet\formula-engine.js` dòng 1172, 1190, 1249 — so sánh chuỗi trong công thức dùng **locale `undefined`** (của máy) → cần quyết định riêng
- `E:\VN OFice\docs\HANDOFF-VIETNAMESE-TYPING.md` — CH-4.7, 1082/1082 PASS qua CDP
- `E:\VN OFice\docs\AUDIT-DOCADMIN-FIX-1610.md`, `E:\VN OFice\scripts\audit-0610\doc_admin_30.mjs`, `E:\VN OFice\docs\AUDIT-DOC-ADMIN-11-30.md` — bộ audit 30 kịch bản hành chính (29 PASS / 1 BLOCKED)
- `E:\VN OFice\platform\help\help-catalog.js`, `help-panel.js` — cơ chế Trợ giúp để gắn hướng dẫn mới
