> Bản chụp đã lược dữ liệu riêng tư, ngày 05/11/2026. Là nghiên cứu, không phải kết quả đã kiểm; chỗ ghi CHƯA KIỂM vẫn chưa kiểm.

# 07 — LỢI THẾ TIẾNG VIỆT: những việc Microsoft Office sẽ không bao giờ làm

**Ngày:** 05/11/2026 · **Người soạn:** Claude (agent nghiên cứu) · **Phạm vi:** VN Writer / VN Sheet / VN Slides
**Mục đích:** xác định và đặc tả cụ thể các tính năng CHỈ có ý nghĩa với người Việt, mà Word/Excel/PowerPoint thật không làm (hoặc làm sai), để biến thành ticket thật.

> **Quy ước nguồn:** số liệu về thể thức lấy từ **bản đăng lại toàn văn Phụ lục NĐ 30/2020** (VCCI, đối chiếu với bản HPU2 ở các điều khoản chính), không lấy từ blog. **Chưa đối chiếu với Công báo** — phải làm trước khi đưa trích dẫn vào sản phẩm. Điểm số ưu tiên là **đánh giá chủ quan**, không phải số đo. Chỗ chưa xác minh ghi **CHƯA KIỂM**.

---

## ĐÍNH CHÍNH (bản sửa 05/11/2026, sau khi tự kiểm chứng)

Bản đầu của tài liệu này có **các sai sót nghiêm trọng**, đã sửa trong bản này:

| # | Bản đầu viết | Thực tế | Hệ quả |
|---|---|---|---|
| 1 | VN-2 là "sát thủ", xếp hạng 1, 95 điểm; "đã chứng minh bằng file thật" | Đoạn chữ làm bằng chứng lấy từ quét byte thô của cả file; chữ ký TCVN3 có mặt trong **luồng siêu dữ liệu** của file. Phần thân chủ yếu là **Unicode**; chỉ khoảng 4,6% ký tự dùng `.VnTime` | **VN-2 xuống 66 điểm**, phải đo trước khi đầu tư |
| 2 | "1/4 file nhị phân là TCVN3 → 25%", ngoại suy "hàng chục tới hàng trăm file" | **0/4 file** chủ yếu là mã cũ; cả 4 tạo năm 2020–2022. "Khai báo font" không phải "văn bản viết bằng font đó" | Bỏ ngoại suy. `.doc/.xls` **không đồng nghĩa** mã cũ |
| 3 | Thống kê tần suất byte (`®` 140 lần…) là "tài liệu TCVN3 nguyên bản, không phải nhiễu" | Quét trên toàn bộ byte nhị phân; các số gần đều nhau, **rất có thể là nhiễu** | Đã xoá |
| 4 | Word mở ra "nguyên văn chữ rác" | **Chỉ đúng khi thiếu font.** Có font thì hiển thị đúng (xem kiểm chứng a) | Đổi thông điệp sản phẩm |
| 5 | Dựng bảng TCVN3/VNI "theo quy luật nhóm 5 thanh", "cả hai đều có cấu trúc đều" | **Sai.** Bảng đối chiếu cho `è=CC`, `é=D0` (cách 4, nhóm `a` cách 3): TCVN3 không đều. VNI là kiểu tổ hợp 2 byte, không cùng cấu trúc | Bỏ phương án suy ra theo quy luật |
| 6 | "Excel dùng chính ICU/NLS" | Đã đo: Excel xếp thanh và chữ **khác ICU** | Đã sửa VN-3 |
| 7 | "Excel COM đang bị chặn" | Excel 2016 chạy được qua COM trong phiên này | Đã đo VN-3, VN-5a |
| 8 | "26 luật", "12 mẫu" | Bảng có **34 luật**; Phụ lục III có **14 mẫu** | Đã sửa |
| 9 | Điểm ưu tiên "theo công thức" | Hầu hết **không khớp** công thức đã nêu | Đã tính lại, bảng xếp hạng đổi |
| 10 | Có tên file và một dòng siêu dữ liệu của tài liệu nội bộ | Không được đưa nội dung tài liệu vào báo cáo | **Đã xoá**; dùng mã ẩn danh |
| 11 | "NĐ 30/2020 mới bắt buộc Unicode", "mọi tài liệu trước 2003 gần như chắc chắn…", "kho lưu 20–70 năm", "khách sẵn sàng trả tiền" | Khẳng định không có nguồn | Đã xoá hoặc ghi CHƯA KIỂM |

---

## KIỂM CHỨNG 5 GIẢ ĐỊNH ĐÃ BÁO VỚI CHỦ DỰ ÁN

**(a) "Word 2016 hiển thị chữ rác với tài liệu TCVN3/VNI" — BÁC BỎ như đã phát biểu; chỉ đúng khi thiếu font.**
Đã chạy trên Word 16.0.4266 qua COM, chữ tổng hợp (cụm "Cộng hòa xã hội chủ nghĩa Việt Nam" theo mã TCVN3, cụm ngắn theo mã VNI), lưu cả `.docx` và `.doc`:

| Trường hợp | Font Word dùng khi xuất PDF | Hiển thị | Tìm chữ Việt Unicode thật |
|---|---|---|---|
| Không có font | Thay bằng Times New Roman | **Chữ rác** | Không thấy |
| Có font trùng tên `.VnTime`, `VNI-Times` | `.VnTime`, `VNI-Times` được nhúng | **Đúng tiếng Việt** | **Vẫn không thấy** |

Giới hạn: font thử là **font tổng hợp do tôi dựng** (dựng từ VNSans, ánh xạ mã Latin-1 sang chữ Việt) theo cơ chế của font cũ, không phải `.VnTime` thật; dấu mũ VNI lệch vị trí là do font thử. **CHƯA KIỂM với font thật.** Nguồn thực hành khớp với kết quả: [topthuthuat](https://topthuthuat.com/sua-loi-font-chu-trong-word/), [vnit](https://vnit.com.vn/bai-viet/loi-font-tieng-viet-trong-word-excel-cach-sua). Danh mục [MsoEncoding](https://learn.microsoft.com/en-us/office/vba/api/office.msoencoding) chỉ có `msoEncodingVietnamese` (1258), không có TCVN3/VNI/VISCII/VPS (đây là danh mục mã cho trình duyệt, không phải hộp thoại chuyển đổi).
Kết luận: điểm yếu thật của Word **không phải "không đọc được"**, mà là phụ thuộc font và chữ vẫn không phải Unicode (không tìm, sắp xếp, tra cứu đúng được).

**(b) "Đa số tài liệu thời .doc dùng các bộ mã đó" — BÁC BỎ trên mẫu cục bộ; CHƯA KIỂM ở phạm vi Việt Nam.**
Đo chỉ đọc trên `<kho tệp thử nội bộ>`, chỉ lấy số đếm. 83 file Office, gộp trùng theo SHA-256 còn **54 file; đọc được 53** (1 `.docx` không phải zip hợp lệ).

| Loại | File | Có khai báo font cũ | Mã cũ ≥ 5% chữ | Phần chữ nằm trong font cũ |
|---|---|---|---|---|
| `.doc` | 2 | 2 | **0** | #1: 0 theo Word; #2: 430/9.357 ký tự (4,6%) theo Word |
| `.xls` | 2 | 0 | **0** | 0/791 ô nhãn; 0 chữ ký TCVN3 trong bảng chuỗi |
| `.docx` | 20 đọc được | 5 | **0** | 136/236.684 ký tự (0,06%) |
| `.xlsx` | 28 | 4 | **0** | 0 (cả ô lẫn rich text) |
| `.pptx` | 1 | 0 | **0** | 0 |

Cả 4 file nhị phân có năm tạo **2020–2022** theo siêu dữ liệu, và bảng chuỗi `.xls` có 5.365 chữ Việt Unicode. Hai phương pháp độc lập (tự phân tích định dạng và đếm qua Word) cho kết quả gần nhau: `.doc` #2 là 447 và 430 ký tự, nhưng lệch ở phần ngoài ASCII (5 và 23), và `.doc` #1 lệch (0–20 ký tự, đều rất nhỏ).
Giới hạn: **mẫu quá nhỏ và không đại diện**: chỉ 4 file nhị phân (7%, trong khi share LAN có 41%), và không phải kho lưu trữ cũ. Vì vậy số này **không** chứng minh kho tài liệu trước 2003 ở Việt Nam không dùng mã cũ. **Không tìm thấy số liệu toàn quốc nào.** Chưa quét 672 file trên LAN.

**(c) "Luật SHTT Điều 15 loại trừ nghị định và văn bản hành chính khỏi bảo hộ quyền tác giả" — XÁC NHẬN, kèm lưu ý.**
[Văn bản hợp nhất 67/VBHN-VPQH](https://luatvietnam.vn/so-huu-tri-tue/van-ban-hop-nhat-67-vbhn-vpqh-2026-luat-so-huu-tri-tue-431761-d5.html) (xác thực 23/03/2026, hợp nhất đến Luật 131/2025/QH15, hiệu lực 01/04/2026), Điều 15 khoản 2, nguyên văn: *"Văn bản quy phạm pháp luật, văn bản hành chính, văn bản khác thuộc lĩnh vực tư pháp và bản dịch chính thức của văn bản đó."* Khoản 4 mới thêm (ý tưởng, khẩu hiệu, tên tác phẩm) không đổi khoản 2.
Điều 15 **không nêu từ "nghị định"**; nghị định được loại trừ vì là văn bản quy phạm pháp luật ([Luật 64/2025/QH15 Điều 4 khoản 5](https://hethongphapluat.com/luat-ban-hanh-van-ban-quy-pham-phap-luat-2025/dieu-4): *"Nghị định, nghị quyết của Chính phủ…"*).
Lưu ý: đọc qua bản đăng trên LuatVietnam, chưa đối chiếu Công báo. **CHƯA KIỂM:** có bản hợp nhất nào mới hơn không; câu chữ Điều 4 sau Luật 87/2025/QH15. Khoản 2 không bao gồm bài bình luận hay bản biên tập của bên thứ ba. Cần luật sư xác nhận trước khi dùng làm ý kiến pháp lý.

**(d) "NĐ 30/2020 còn hiệu lực năm 2026, kể cả các sửa đổi" — XÁC NHẬN đang được áp dụng tới 6/2026; tình trạng chính thức và việc có sửa đổi hay không: CHƯA KIỂM.**
- Bằng chứng mới nhất đọc được: [thông báo của Sở Nội vụ Bắc Ninh](https://bacninh.gov.vn/documents/207614/124310906/tb_ket_luan_ubnd_thuan_thanh_2026__10062026172505_signed.pdf) (6/2026, ký số 10/06/2026) yêu cầu soạn thảo *"đảm bảo đúng thể thức, kỹ thuật trình bày theo quy định tại Nghị định số 30/2020/NĐ-CP"*.
- **Không tìm thấy** văn bản sửa đổi hay thay thế. Đây chỉ là "không tìm thấy", không phải bằng chứng là không có.
- [NĐ 128/2025/NĐ-CP](https://www.saovietlaw.com/nghi-dinh/nghi-dinh-128-2025-nd-cp-quy-dinh-ve-phan-quyen-phan-cap-trong-quan-ly-nha-nuoc-linh-vuc-noi-vu/) có Điều 14 về phân cấp quản lý văn thư, lưu trữ, nhưng phần đọc được (100.000/122.765 ký tự) không nhắc NĐ 30/2020.
- Không đọc được tình trạng chính thức: vbpl.vn không trả nội dung, Thư viện Pháp luật trả 403, [hethongphapluat](https://hethongphapluat.com/nghi-dinh-30-2020-nd-cp-ve-cong-tac-van-thu.html) chỉ ghi "Kiểm tra". Từ 7/2026 đến nay chưa có bằng chứng.

**(e) "NĐ 30/2020 bắt buộc Times New Roman theo đúng tên" — XÁC NHẬN.** Không phải chỉ quy định "phông Unicode".
Phụ lục I, Phần I, Mục I, khoản 4, nguyên văn: *"Phông chữ: Phông chữ tiếng Việt Times New Roman, bộ mã ký tự Unicode theo Tiêu chuẩn Việt Nam TCVN 6909:2001, màu đen."* Khớp ở 2 bản độc lập ([VCCI](https://vanban.vcci.com.vn/hm_content/uploads/van-ban/ND_30-2020-ND-CP_Phu_luc.pdf), [HPU2](https://hcmyu.hpu2.edu.vn/public/fileupload/source/TAI%20LIEU/Phuluc1.pdf)); chưa đối chiếu Công báo.
Phạm vi: theo Điều 2, áp dụng cho cơ quan, tổ chức nhà nước và doanh nghiệp nhà nước; tổ chức chính trị, xã hội "căn cứ… để áp dụng cho phù hợp". **Doanh nghiệp tư nhân không nằm trong đối tượng nêu tại Điều 2**, và đây là quy định cho **văn bản hành chính**, nên công cụ kiểm tra phải là tuỳ chọn, không được báo lỗi mặc định với mọi tài liệu.

---

## 0. TÓM TẮT ĐIỀU HÀNH

| Hạng | Mã | Tính năng | Bằng chứng đã có | Điểm |
|---|---|---|---|:-:|
| 1 | **VN-4** | Hàm đọc số thành chữ (`DOCSO`/`BANGCHU`) | Excel chỉ có `BAHTTEXT`; các nguồn thực hành cho thấy phải dùng VBA hoặc add-in | **93** |
| 2 | **VN-1** | Chuẩn NĐ 30/2020: định dạng 1 nút + kiểm tra có trích dẫn + 14 mẫu | Đã trích đủ Phụ lục I; đã có sẵn preset lề và danh sách Điều/Khoản/Điểm | **91** |
| 3 | **VN-5a** | Dấu thanh `hoà` ⇄ `hòa` | **Đã đo:** Excel `EXACT` sai, `MATCH` không khớp, Word Find không tìm thấy | **88** |
| 4 | **VN-3** | Sắp xếp theo âm tiết | **Đã đo:** cả Excel 2016 và ICU xếp `cà phê` trước `ca sĩ` | **83** |
| 5 | **VN-5b** | AutoCorrect và kiểm tra lỗi gõ tiếng Việt | Có sẵn hạ tầng AutoCorrect; chưa khảo sát nhu cầu | **82** |
| … | **VN-2** | Chuyển bộ mã cũ | **Nhu cầu chưa đo được;** mẫu cục bộ không ủng hộ. Word hiển thị được khi có font | **66** |

**Khuyến nghị:** làm VN-4 và VN-1 trước (chênh 2 điểm là nằm trong sai số đánh giá; VN-1 giá trị chiến lược lớn hơn, VN-4 rẻ hơn nhiều). **Với VN-2, chỉ làm một bước trước: quét chỉ đọc 672 file LAN (khoảng 0,5 ngày), rồi mới quyết định.** Chưa có căn cứ để truyền thông VN-2 là tính năng "sát thủ".

## 1. VN-1 — CHUẨN VĂN BẢN HÀNH CHÍNH VN (Nghị định 30/2020/NĐ-CP)

### 1.1. Tính năng là gì

Ba phần, nằm trong một nhóm ribbon mới của VN Writer (đề xuất tab **"Hành chính VN"**, hoặc nhóm "Chuẩn NĐ 30" trong tab Bố trí trang):

1. **"Áp dụng chuẩn NĐ 30" (1 nút)** — đặt khổ giấy, lề, phông, cỡ chữ, giãn dòng, giãn đoạn, số trang, và các style đặt tên theo đúng thành phần thể thức (`VN30_QuocHieu`, `VN30_TieuNgu`, `VN30_TenCoQuan`, `VN30_SoKyHieu`, `VN30_DiaDanhNgay`, `VN30_TenLoai`, `VN30_TrichYeu`, `VN30_CanCu`, `VN30_NoiDung`, `VN30_Dieu`, `VN30_Khoan`, `VN30_Diem`, `VN30_ChucVu`, `VN30_HoTen`, `VN30_NoiNhan`, `VN30_NoiNhanList`, `VN30_PhuLuc`…).
2. **"Kiểm tra thể thức" (checker)** — panel bên phải liệt kê từng vi phạm, **có trích dẫn chính xác điều/mục/khoản của Phụ lục I**, nút "Sửa ngay" cho từng dòng. Đây là phần không ai có.
3. **Thư viện 14 mẫu chính thức** (Phụ lục III) trong backstage "Mới" → "Mẫu hành chính VN".

### 1.2. Ai cần

Cơ quan nhà nước, doanh nghiệp nhà nước (đối tượng áp dụng bắt buộc theo Điều 2), trường học, bệnh viện, UBND xã/phường, và mọi tổ chức chính trị – xã hội "căn cứ quy định của Nghị định này… để áp dụng cho phù hợp" (Điều 2 khoản 2). Đây chính là tập khách hàng lớn nhất của một bộ Office Việt Nam.

### 1.3. Vì sao Word không làm

Microsoft không nhúng quy định hành chính của từng quốc gia vào sản phẩm. Trên thực tế người Việt đang xoay bằng: file `.dot/.docx` mẫu truyền tay, hoặc tự nhớ "Times New Roman 14, lề 3-2-2". Tôi **chưa tìm thấy** công cụ kiểm tra lại văn bản và chỉ ra vi phạm, nhưng **chưa khảo sát thị trường** (WPS, add-in, phần mềm quản lý văn bản): CHƯA KIỂM.

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

→ Chú thích chỉ nêu ví dụ cho **Quốc hiệu, Tiêu ngữ, địa danh/ngày**. Các dòng còn lại dưới đây là **suy luận của tôi**, nên phần ngoài ví dụ chỉ được báo **cảnh báo**, không báo lỗi:
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

Rủi ro bản quyền với nội dung Nghị định và mẫu kèm theo là thấp: xem **kiểm chứng (c)** (Luật SHTT Điều 15 khoản 2). Không cần phụ thuộc bên thứ ba, không cần mạng.

Rủi ro chính là **trích dẫn sai**. Vì vậy mỗi luật kiểm tra **bắt buộc có trường `clause`** trỏ đúng Mục/khoản/điểm của Phụ lục I, kèm test so khớp với bản đã đối chiếu Công báo.

### 1.7. Tình trạng hiệu lực (2026)

Xem **kiểm chứng (d)**. Nghị định có hiệu lực từ ngày ký (Điều 37), thay NĐ 110/2004 và 09/2010. Có căn cứ áp dụng tới 6/2026. **Phải tra tình trạng chính thức trước khi mở ticket** vì mỗi luật kiểm tra phụ thuộc vào điều này.

Phạm vi: chỉ cho **văn bản hành chính** theo Điều 2. Văn bản quy phạm pháp luật có quy định thể thức riêng (kết quả tìm kiếm nhắc NĐ 78/2025/NĐ-CP: **CHƯA KIỂM**), nên không được áp bộ kiểm tra này cho loại đó.

### 1.8. Đặc tả checker — danh sách luật kiểm tra khởi điểm (34 luật)

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
| ND30-X01 | **Nhất quán cỡ chữ**: Quốc hiệu, Tiêu ngữ, địa danh/ngày khớp một trong hai ví dụ; phần còn lại chỉ cảnh báo | Cảnh báo | Chú thích 1 bảng Mục V |
| ND30-X02 | Viết hoa đúng Phụ lục II (tên cơ quan, tên địa lý, chức vụ) | Cảnh báo | PL II |

### 1.9. Công sức & ưu tiên

- **Nút áp dụng chuẩn + 20 style**: ~3 ngày-agent (đã có preset lề và numbering).
- **Checker 34 luật + panel + autofix**: ~6 ngày-agent (phần nặng là đọc được đúng thuộc tính đoạn/run từ model Writer, và "Sửa ngay" không được phá layout).
- **14 mẫu Phụ lục III**: ~4 ngày-agent (mỗi mẫu phải round-trip DOCX đúng, kiểm bằng `batch_document_audit.py`).
- **Hướng dẫn tiếng Việt trong app** (bắt buộc theo AGENTS.md §10): ~1 ngày.
- **Lấy toạ độ sơ đồ ô từ ảnh trang 12**: ~0,5 ngày.

**Tổng ≈ 14,5 ngày-agent (ước lượng, chưa kiểm chứng). Điểm ưu tiên: 91/100.**

---

## 2. VN-2 — CHUYỂN BỘ MÃ TIẾNG VIỆT CŨ (TCVN3 / VNI / VISCII / VPS)

> **Trạng thái: phải đo nhu cầu trước khi làm.** Xem Đính chính 1–5 và kiểm chứng (a), (b).

### 2.1. Điều đã biết và chưa biết

| Câu hỏi | Trả lời |
|---|---|
| Word có hiển thị được không? | **Có, nếu có font** (đã thử với font tổng hợp). Không có font thì ra chữ rác |
| LibreOffice có bộ mã này không? | **Không.** `core-master/.../include/rtl/textenc.h:81` chỉ có `RTL_TEXTENCODING_MS_1258` cho tiếng Việt; `sal/textenc` chỉ có bảng Windows-1258 (đã rà trong repo). Hành vi mở file thực tế của bản đóng gói: **CHƯA KIỂM** |
| Có công cụ chuyển sẵn không? | **Có:** Unikey Toolkit được các hướng dẫn thực hành nêu ([topthuthuat](https://topthuthuat.com/sua-loi-font-chu-trong-word/)); UnicodeConverter (GPL-2.0). Khoảng trống của ta là **tích hợp và giữ định dạng**, không phải "không ai làm được" |
| Nhu cầu ở Việt Nam 2026? | **Chưa có số liệu.** Lập luận "kho lưu trữ cũ" là hợp lý nhưng chưa được kiểm chứng |
| Trên mẫu cục bộ? | 0/53 file có ≥ 5% chữ trong font cũ; 11/53 có **khai báo** font cũ nhưng gần như không dùng |

### 2.2. Bước đầu tiên (gate): đo trên 672 file LAN

Chạy census chỉ đọc (`scan_corpus.py`, `scan_binary.py` trong scratchpad phiên này; cần đưa vào `scripts/audit-*` nếu dùng lại) trên `<kho LAN nội bộ>`, chỉ xuất số đếm, không sao chép nội dung, không commit. Ghi lại năm tạo file để tách theo thời kỳ.

Ngưỡng đề xuất, **chủ dự án nên chốt**:
- ≥ 5% file có ≥ 20% chữ trong font cũ: làm bản đầy đủ.
- 1–5%: chỉ làm bản tối thiểu ở §2.3.
- < 1%: bỏ hoặc hoãn, đưa vào hướng dẫn cách dùng công cụ ngoài.

Lưu ý: share này là của một công ty, nên kết quả vẫn không đại diện cho toàn quốc.

### 2.3. Bản tối thiểu (khoảng 5 ngày-agent, nếu qua gate)

Bôi đen vùng chữ, chọn "Chuyển mã" (TCVN3/VNI sang Unicode), đổi font của vùng đó sang font Unicode, gộp thành 1 bước Undo. Có nhận dạng theo run và thanh thông báo nếu vùng chữ dùng font cũ đủ nhiều. Không tự sửa khi chưa hỏi.

### 2.4. Bản đầy đủ (khoảng 13 ngày-agent)

Thêm: chuyển theo run trong cả 3 app, chuyển hàng loạt ghi ra thư mục mới (không ghi đè bản gốc), báo cáo CSV, thêm VISCII/VPS/VIQR.

### 2.5. Bài học thiết kế từ phép đo

- **Không được kích hoạt theo bảng font của file.** 11/53 file khai báo font cũ mà gần như không dùng: dựa vào đó sẽ báo động giả khoảng 1/5 số file. Phải đếm **theo run có chữ thật**.
- `.doc` cần xét đúng thuộc tính font cho ký tự ngoài ASCII (`sprmCRgFtc2`) và kế thừa style; chỉ đọc font ASCII sẽ sai.
- **Không dò chuỗi trên byte thô của cả file:** chính lỗi này đã làm bản đầu kết luận sai.
- Chữ mã cũ nằm trong font Unicode (đã bị đổi font) là ca khó riêng; có thể chấm điểm bằng `isValidVietnameseSyllable()` trong `platform/text/vi-syllable.js`. **Đây là đề xuất, chưa thử nghiệm**, chưa có số đo độ chính xác và tỷ lệ báo nhầm; không đặt ngưỡng cố định khi chưa đo.

### 2.6. Đặc điểm bộ mã

| Bộ mã | Đặc điểm | Mức tin cậy |
|---|---|---|
| TCVN3 (ABC) | 1 byte, nửa dưới ASCII, font `.Vn*`; bảng **không đều** (`è=CC`, `é=D0`) | Theo bảng vietunicode, khớp với phép thử hiển thị 6 mã. Toàn bộ bảng: **CHƯA KIỂM** |
| TCVN3 chữ hoa | Font riêng `.Vn*H`; chính bảng vietunicode cảnh báo giá trị chữ hoa của nó sai; UnicodeConverter cũng nêu lỗi chữ hoa | Cơ chế chính xác: **CHƯA KIỂM**, phải thử bằng font thật |
| VNI-Windows | 1–2 byte; chữ có dấu thường là chữ gốc + byte dấu (`à` = `61 F8`), một số 1 byte (`ì` = `EC`) | Theo bảng vietunicode |
| VISCII, VIQR | Định nghĩa trong RFC 1456 | Bảng RFC có; chưa đối chiếu từng ô |
| VPS | 1 byte | Theo bảng vietunicode |
| BK HCM1/2, Vietware | Chưa có nguồn bảng mã | **CHƯA KIỂM**, ngoài phạm vi ban đầu |

### 2.7. Nguồn bảng mã và giấy phép

| Nguồn | Giấy phép | Kết luận |
|---|---|---|
| RFC 1456 (VISCII, VIQR) | Tài liệu IETF; điều khoản sử dụng cho mã nguồn: CHƯA KIỂM | Nguồn ưu tiên |
| vietunicode.sourceforge.net/charset | **Trang không ghi giấy phép** | Chỉ để đối chiếu |
| TCVN 5712:1993 | CHƯA KIỂM | Chỉ dẫn chiếu |
| UnicodeConverter | **GPL-2.0** | Không dùng nếu chưa được duyệt |
| py-unicode-convert | **Không có LICENSE** | Không dùng |
| vietnameseConverter (R) | Bảng phỏng theo vietunicode; giấy phép: CHƯA KIỂM | Không dùng |

**Vấn đề mở:** nên tự lập bảng và ghi nguồn rõ ràng. Tuy nhiên ánh xạ TCVN3/VNI **không còn đường suy ra theo quy luật**, và tôi **chưa tìm được nguồn có giấy phép rõ** cho hai bảng này. Có thể đo ánh xạ từ font thật (nếu font được phép dùng) hoặc nhờ tư vấn về khả năng dùng dữ kiện kỹ thuật. **Cần chủ dự án quyết định** trước khi code. Không đóng gói font `.Vn*`/`VNI-*` khi chưa rõ giấy phép.

### 2.8. Kiểm thử

Dùng **tệp mẫu tự tạo** (không dùng tài liệu nội bộ làm fixture trong repo). Với file thật: chỉ chạy cục bộ, chỉ báo số đếm. Phải thử cả với font thật trước khi kết luận về chữ hoa.

**Điểm ưu tiên: 66/100, sẽ chấm lại sau gate. Ước lượng công sức chưa kiểm chứng.**

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

### 3.3. Excel 2016 làm gì (ĐÃ ĐO)

Excel 16.0.4266 qua COM, dữ liệu tổng hợp, `Range.Sort` tăng dần:

| Phép thử | Kết quả Excel | So sánh |
|---|---|---|
| `ca sĩ` / `cà phê` | `cà phê` trước | Cùng kết quả với ICU; trái thứ tự theo âm tiết |
| `hoa hồng` / `hòa bình` | `hòa bình` trước | như trên |
| `an toàn` / `án mạng` | `án mạng` trước | như trên |
| `ba lô` / `bà con` | `bà con` trước | như trên |
| Thứ tự thanh | `ba bá bà bã bả bạ` | **Khác ICU** (`ba bà bả bã bá bạ`) |
| Thứ tự chữ | `a â ă d đ e ê o ô ơ u ư` | **`â` trước `ă`**, trái bảng chữ cái tiếng Việt |

Giới hạn: máy đo dùng locale Windows **`en-GB`**; chưa thử với `vi-VN`, nên thứ tự thanh và chữ có thể đổi theo locale. Vì vậy chưa kết luận "Excel xếp sai" cho người dùng đặt vùng Việt Nam. Excel 2019/365: CHƯA KIỂM. **"Thứ tự đúng" hiện dựa trên thread cldr-users**; phải đối chiếu một từ điển in trước khi viết bộ test.

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
- Đo thêm Excel 2016 với locale `vi-VN` và đối chiếu từ điển in: **~0,5 ngày**
- Hướng dẫn tiếng Việt: **~0,5 ngày**

**Tổng ≈ 7,5 ngày-agent. Điểm ưu tiên: 83/100.**

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

**Tổng ≈ 5,5 ngày-agent. Điểm ưu tiên: 93/100.**

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
**Đã đo trên Office 2016 (dữ liệu tổng hợp):** Word Find tìm `hòa` trong văn bản `hoà` trả về **False**; Excel `EXACT` = FALSE, `A1=B1` = FALSE, `MATCH(...,0)` **không khớp**. VLOOKUP chính xác chưa đo riêng, dự kiến giống MATCH (VLOOKUP chiếm 91% công thức trên share LAN theo ghi nhận trước).

**Tính năng đề xuất (3 phần):**
1. **Chuẩn hoá khi tra cứu** — một tầng "Dấu thanh linh hoạt" bật trong: Tìm/Thay thế (Writer + Sheet + Slides), VLOOKUP/MATCH/XLOOKUP/COUNTIF (tuỳ chọn, mặc định **tắt** để giữ tương thích Excel), AutoFilter, sắp xếp. Cài đặt: "Coi *hoà* và *hòa* là một".
2. **Bộ chuyển kiểu dấu** — nút "Chuyển kiểu đặt dấu thanh": `Kiểu cũ → Kiểu mới` / `Kiểu mới → Kiểu cũ`, áp dụng cho vùng chọn hoặc toàn tài liệu, 1 bước Undo. Chỉ ảnh hưởng **đúng 3 vần `oa/oe/uy` không có âm cuối** — danh sách ký tự bị ảnh hưởng là hữu hạn và nhỏ (`oà oá oả oã oạ oè oé oẻ oẽ oẹ uỳ uý uỷ uỹ uỵ` ↔ `òa óa ỏa õa ọa òe óe ỏe õe ọe ùy úy ủy ũy ụy`), rất dễ test cạn.
3. **Kiểm tra nhất quán** — cảnh báo "Tài liệu này dùng lẫn cả hai kiểu đặt dấu (12 chỗ kiểu cũ, 48 chỗ kiểu mới). [Thống nhất theo kiểu mới]".

**Giấy phép: không vướng gì.** Danh sách vần là kiến thức ngôn ngữ, tự lập.
**Công sức ≈ 3 ngày-agent. Điểm ưu tiên: 88/100.**

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

**Giấy phép:** danh sách cặp từ dễ lẫn phải **tự biên soạn** (CC0), không copy từ từ điển chính tả có bản quyền. **Công sức ≈ 3 ngày-agent** (2 ngày soạn + kiểm bộ quy tắc, 1 ngày đấu nối + hướng dẫn). **Điểm ưu tiên: 82/100.**

---

## 6. VN-6 — CÁC Ý KHÁC, ĐÃ SÀNG LỌC THEO NHU CẦU VÀ RỦI RO

| Ý | Nhu cầu thật | Office làm được? | Rủi ro / giấy phép | Phán quyết |
|---|---|---|---|---|
| **Âm lịch Việt Nam** — hàm `AMLICH(ngày)`, `NGAYDUONG(ngày_âm)`, `CANCHI(năm)`, `TIETKHI(ngày)`; hiển thị ngày âm trong ô ngày và trong lịch | Cao: cưới hỏi, giỗ chạp, khai trương, lịch Tết, lịch sản xuất. Excel **hoàn toàn không có** (chỉ có lịch Hồi giáo/Do Thái/Nhật) | ❌ Không | Thuật toán phổ biến nhất là `amlich.js` của **Hồ Ngọc Đức (2004/2006)** — **không tìm được giấy phép công bố** ⇒ coi như bảo lưu toàn quyền, **KHÔNG copy**. Thư viện dẫn xuất ghi MIT nhưng đó là giấy phép **code của họ**, không phải thuật toán gốc. **Giải pháp sạch: tự cài đặt từ thuật toán thiên văn công bố (Jean Meeus, *Astronomical Algorithms* — công thức là dữ kiện khoa học) + múi giờ UTC+7**, rồi **xác thực bằng lịch in** của ≥2 năm. Đây đúng là cách tác giả gốc đã làm. | **LÀM** — nhưng tự cài đặt. ~4 ngày-agent (2 ngày thuật toán + 1 ngày xác thực đối chiếu + 1 ngày hàm/UI/hướng dẫn). **Ưu tiên 77/100** |
| **Định dạng số/tiền kiểu Việt** — dấu phân cách nghìn `.` và thập phân `,`; `1.234.567,89 ₫`; định dạng `#.##0 "đồng"`; đọc đúng khi nhập `1.234,56` | Cao. Đã có một phần: `tests/unit/sheet-locale-input.test.js`, `tests/live/cdp/q66-sheet-locale.desktop.mjs` | Có, nhưng phụ thuộc cài đặt Windows của từng máy ⇒ file truyền tay bị lệch | Không vướng | **ĐÃ CÓ PHẦN LỚN** — việc còn lại: đưa thành **thuộc tính của workbook** (lưu trong file) chứ không theo locale máy, để file mở ở máy khác không lệch. ~2 ngày. **Ưu tiên 75/100** |
| **Định dạng ngày VN** — `dd/mm/yyyy` mặc định, `"ngày" dd "tháng" mm "năm" yyyy` (đúng văn phong NĐ 30, gồm quy tắc thêm `0` cho ngày < 10 và tháng 1, 2), thứ tiếng Việt `Thứ Hai…Chủ Nhật` | Cao | Có định dạng tuỳ chỉnh, nhưng tên thứ/tháng theo locale máy | Không vướng | **LÀM**, gộp vào VN-1 (văn bản hành chính cần đúng kiểu `ngày 05 tháng 01 năm 2020`). ~1 ngày. **Ưu tiên 77/100** |
| **Mẫu hoá đơn / chứng từ kế toán** | Cao nhưng… | — | ⚠️ **Rủi ro pháp lý cao.** Hoá đơn điện tử ở VN là **dữ liệu XML có ký số, gửi cơ quan thuế**, không phải tài liệu Office. Nghị định 123/2020 đã bị sửa 2 lần (2022, 2024) và Điều 10 sửa bởi **NĐ 70/2025** từ 01/06/2025. Làm "mẫu hoá đơn" trong Writer dễ bị hiểu là hoá đơn hợp pháp. | **KHÔNG LÀM hoá đơn.** Chỉ làm **phiếu thu/phiếu chi/biên bản** (là văn bản hành chính, thuộc VN-1) và hàm `BANGCHU` (VN-4). **Ưu tiên 41/100** |
| **Mẫu bảng lương / BHXH** | Trung bình–cao | Người dùng tự làm | ⚠️ Tỷ lệ trích BHXH/BHYT/BHTN và mức lương cơ sở **thay đổi gần như hằng năm** | **LÀM dạng mẫu có BẢNG THAM SỐ tách riêng** (sheet "Tham số" chứa tỷ lệ, người dùng tự cập nhật), **tuyệt đối không hard-code tỷ lệ vào công thức**, kèm dòng chữ "Tham số cập nhật đến <ngày>; người dùng tự kiểm tra". ~2 ngày. **Ưu tiên 59/100** |
| **Hàm tính thuế TNCN** | Trung bình | Người dùng tự làm bằng nhiều `IF` | ⚠️⚠️ **Rủi ro cao nhất trong toàn bộ tài liệu này.** Biểu thuế **vừa đổi năm 2026**: từ **7 bậc xuống 5 bậc** (5/10/20/30/35%), bậc 35% áp từ thu nhập tính thuế **trên 100 triệu/tháng** (trước là 80 triệu); giảm trừ gia cảnh lên **15,5 triệu/tháng** cho người nộp thuế và **6,2 triệu/tháng** cho mỗi người phụ thuộc (trước 11 / 4,4 triệu). Căn cứ được nêu: **Nghị quyết 110/2025/UBTVQH15** và **Luật số 109/2025/QH15**. **CHƯA KIỂM: ngày hiệu lực** — các nguồn mâu thuẫn giữa **01/01/2026** và **01/07/2026**; phải tra văn bản gốc trên `vbpl.vn`. | **KHÔNG làm hàm `THUETNCN()` cố định.** Thay vào đó: **mẫu "Bảng tính thuế TNCN"** với biểu thuế nằm trong một **bảng tham số nhìn thấy được**, công thức dùng `SUMPRODUCT`/`VLOOKUP` tra bảng đó, và **ô ghi rõ ngày hiệu lực của biểu thuế**. Tuyệt đối không nhúng số vào engine — số sai = sai thuế = trách nhiệm pháp lý. ~2 ngày. **Ưu tiên 49/100** |
| **Viết hoa theo Phụ lục II NĐ 30** | Cao (gộp VN-1/VN-5) | Không | Không vướng | Gộp vào VN-5 autocorrect |
| **Sắp xếp tên người Việt theo tên gọi** | Cao (danh bạ, bảng điểm, danh sách CBCNV) | Không | Không vướng | Gộp vào VN-3 chế độ 3 |
| **Chuyển Việt → không dấu (slug)** `KHONGDAU()` | Trung bình (đặt tên file, mã khách hàng, URL) | Không có hàm sẵn | Không vướng | **LÀM**, rẻ. ~0,5 ngày. **Ưu tiên 79/100** |
| **Đếm từ tiếng Việt đúng** (âm tiết vs từ ghép) | Thấp–trung bình | Word đếm theo khoảng trắng ⇒ "Việt Nam" = 2 từ | Không vướng | Đã có probe `scripts/audit-0610/doc_wordcount_*`. Chỉ cần **bổ sung chỉ số "số âm tiết"** bên cạnh "số từ". ~1 ngày. **Ưu tiên 70/100** |

---

## 7. BẢNG XẾP HẠNG CUỐI — SẴN SÀNG THÀNH TICKET

Điểm = Nhu cầu ×0,35 + Office thiếu ×0,30 + An toàn giấy phép/pháp lý ×0,20 + Rẻ ×0,15. **Điểm thành phần là đánh giá chủ quan**, nên chênh vài điểm không có ý nghĩa. Công thức có xu hướng ưu ái việc rẻ (như VN-6d).

| Hạng | Mã | Tính năng | App | Nhu cầu | Office thiếu | An toàn | Rẻ | **Điểm** | Công sức | Rào cản |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|---|---|
| 1 | **VN-4** | `DOCSO` / `BANGCHU` | Sheet | 95 | 95 | 100 | 75 | **93** | 5,5 ng | Chạm save pipeline: **chạy batch LAN trước khi gộp** |
| 2 | **VN-1** | Chuẩn NĐ 30/2020: 1 nút + 34 luật + 14 mẫu | Doc | 100 | 100 | 85 | 60 | **91** | 14,5 ng | Tra hiệu lực chính thức; đối chiếu Công báo; lấy sơ đồ trang 12 |
| 3 | **VN-5a** | Chuyển kiểu dấu thanh, tra cứu linh hoạt | Doc, Sheet, Slide | 75 | 100 | 100 | 75 | **88** | 3 ng | Tra cứu linh hoạt mặc định tắt |
| 4 | **VN-3** | Sắp xếp theo âm tiết, chế độ tên người | Sheet, Doc | 80 | 85 | 100 | 65 | **83** | 7,5 ng | Đối chiếu từ điển in; đo với locale `vi-VN` |
| 5 | **VN-5b** | AutoCorrect, kiểm tra lỗi gõ | Cả 3 | 85 | 90 | 90 | 50 | **82** | 3 ng | Danh sách tự biên; từ nhập nhằng chỉ gợi ý |
| 6 | **VN-6d** | `KHONGDAU()` | Sheet, Doc | 55 | 85 | 100 | 95 | **79** | 0,5 ng | — |
| 7 | **VN-6a** | Âm lịch | Sheet, Doc | 70 | 100 | 70 | 55 | **77** | 4 ng | Không copy `amlich.js`; xác thực với lịch in |
| 8 | **VN-6b** | Định dạng ngày VN | Doc, Sheet | 80 | 55 | 100 | 85 | **77** | 1 ng | Gộp với VN-1 |
| 9 | **VN-6c** | Định dạng số/tiền theo workbook | Sheet | 85 | 50 | 100 | 70 | **75** | 2 ng | Chạm định dạng file |
| 10 | **VN-6f** | Đếm âm tiết | Doc | 45 | 70 | 100 | 85 | **70** | 1 ng | — |
| 11 | **VN-2** | Chuyển bộ mã cũ | Cả 3 | 50 | 70 | 90 | 60 | **66** | 0,5 ng gate; 5–13 ng | **Đo LAN trước;** chưa có nguồn bảng mã có giấy phép rõ |
| 12 | **VN-6e** | Mẫu bảng lương/BHXH | Sheet | 70 | 40 | 60 | 70 | **59** | 2 ng | Không hard-code tỷ lệ |
| 13 | **VN-6g** | Mẫu thuế TNCN | Sheet | 65 | 35 | 25 | 70 | **49** | 2 ng | Ngày hiệu lực chưa kiểm; chủ dự án duyệt trước |
| 14 | **VN-6h** | Mẫu hoá đơn điện tử | — | 80 | 20 | 10 | 30 | **41** | — | **Khuyến nghị KHÔNG LÀM** dù có điểm: rủi ro pháp lý |

**Tổng công sức 6 hạng đầu ≈ 34 ngày-agent** (ước lượng, chưa kiểm chứng).

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

| # | Nội dung | Cách kiểm | Chặn ticket |
|---|---|---|---|
| 1 | Tình trạng chính thức và sửa đổi của NĐ 30/2020 đến 11/2026; đọc phần còn lại của NĐ 128/2025 | Người có tài khoản tra Thư viện Pháp luật/vbpl.vn, Công báo | VN-1 |
| 2 | Đối chiếu Phụ lục I với Công báo | Công báo số 283–284 | VN-1 |
| 3 | Toạ độ sơ đồ (trang 12, là hình) | Xem trang dưới dạng ảnh | VN-1 (một phần) |
| 4 | Tỷ lệ mã cũ trên 672 file LAN | Census chỉ đọc, số đếm | **VN-2 (gate)** |
| 5 | Nguồn bảng TCVN3/VNI có giấy phép rõ | Chủ dự án quyết định | VN-2 |
| 6 | Word với font `.VnTime`/`VNI-*` **thật**; chữ hoa `.Vn*H` | Thử với font có giấy phép dùng | VN-2 |
| 7 | Bản đóng gói mở file mã cũ khi thiếu font ra sao | Tệp mẫu tự tạo, CDP | VN-2 |
| 8 | Excel với locale `vi-VN`; thứ tự theo từ điển in | Đo lại; đối chiếu từ điển | VN-3 |
| 9 | Ticket CLDR 10867 / 10868 | Tra `unicode-org/cldr` | Không chặn |
| 10 | Có văn bản nào quy định vị trí dấu thanh không | vbpl.vn, Bộ GD&ĐT | Nội dung hướng dẫn VN-5a |
| 11 | Điểm/khoản về "số tiền bằng chữ" trong NĐ 123/2020 hợp nhất | Tra văn bản hợp nhất | Câu căn cứ VN-4 |
| 12 | Ngày hiệu lực biểu thuế TNCN 5 bậc | vbpl.vn, Công báo | VN-6g |
| 13 | Bản hợp nhất Luật SHTT mới hơn 67/VBHN-VPQH; Điều 4 Luật 64/2025 sau Luật 87/2025 | Trang Quốc hội, Công báo; luật sư | Ghi chú pháp lý VN-1 |
| 14 | Giấy phép của `amlich.js`, danh sách từ Hồ Ngọc Đức | Trang gốc. Khuyến nghị không dùng cả hai | Không chặn |
| 15 | Khảo sát đối thủ (WPS, add-in) cho VN-1, VN-2, VN-4 | Dùng thử | Câu truyền thông |

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

**Kiểm chứng bổ sung:**
- Luật SHTT, văn bản hợp nhất 67/VBHN-VPQH: https://luatvietnam.vn/so-huu-tri-tue/van-ban-hop-nhat-67-vbhn-vpqh-2026-luat-so-huu-tri-tue-431761-d5.html
- Giới thiệu Luật 131/2025/QH15 (Cục Bản quyền tác giả): https://cov.gov.vn/tin-tuc/gioi-thieu-luat-sua-doi-bo-sung-mot-so-dieu-cua-luat-so-huu-tri-tue-nam-2025-noi-dung-quyen-tac-gia-quyen-lien-quan-168841.html
- Luật 64/2025/QH15 Điều 4: https://hethongphapluat.com/luat-ban-hanh-van-ban-quy-pham-phap-luat-2025/dieu-4
- Sở Nội vụ Bắc Ninh, thông báo 6/2026: https://bacninh.gov.vn/documents/207614/124310906/tb_ket_luan_ubnd_thuan_thanh_2026__10062026172505_signed.pdf
- NĐ 128/2025/NĐ-CP: https://www.saovietlaw.com/nghi-dinh/nghi-dinh-128-2025-nd-cp-quy-dinh-ve-phan-quyen-phan-cap-trong-quan-ly-nha-nuoc-linh-vuc-noi-vu/
- MsoEncoding: https://learn.microsoft.com/en-us/office/vba/api/office.msoencoding
- Hướng dẫn xử lý lỗi font: https://topthuthuat.com/sua-loi-font-chu-trong-word/ · https://vnit.com.vn/bai-viet/loi-font-tieng-viet-trong-word-excel-cach-sua

**Bằng chứng trong repo (đường dẫn tuyệt đối):**
- `E:\VN OFice\core-master\core-master\include\rtl\textenc.h` (dòng 81, 236), `E:\VN OFice\core-master\core-master\sal\textenc\tcvteas1.tab` (dòng 193, 248) — bộ mã tiếng Việt của LibreOffice
- `E:\VN OFice\platform\text\dictionaries\LICENSES-vi.txt`, `E:\VN OFice\platform\text\vi-syllable.js` — từ điển CC0 và quy tắc ghép vần
- `E:\VN OFice\apps\writer\page-setup-dialog.js` dòng 10 — preset lề "Chuẩn NĐ 30/2020"
- `E:\VN OFice\adapters\libreoffice\writer\writer-adapter.js` dòng 250; `E:\VN OFice\adapters\libreoffice\common\ooxml_zip_patch.py` dòng 24639 — preset danh sách `nd30`
- `E:\VN OFice\apps\sheet\sheet-grid.js` dòng 17253–17254, `E:\VN OFice\apps\sheet\data-tools.js` dòng 204–205 — sắp xếp hiện tại
- `E:\VN OFice\apps\sheet\formula-engine.js` dòng 1172, 1190, 1249 — so sánh chuỗi với locale `undefined`
- `E:\VN OFice\docs\HANDOFF-VIETNAMESE-TYPING.md`, `E:\VN OFice\docs\AUDIT-DOCADMIN-FIX-1610.md`, `E:\VN OFice\scripts\audit-0610\doc_admin_30.mjs`
- `E:\VN OFice\platform\help\help-catalog.js`, `E:\VN OFice\platform\help\help-panel.js` — cơ chế Trợ giúp
