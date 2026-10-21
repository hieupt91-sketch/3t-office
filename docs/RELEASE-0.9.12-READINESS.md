# VN Office 0.9.12 — hồ sơ sẵn sàng phát hành (21/10/2026)

Trạng thái: **chưa phát hành, chờ chủ duyệt.** Tài liệu này tổng hợp những gì đã vào `main` kể từ `win-v0.9.10` (11/10/2026, 1.158 commit) và những gì phải làm/quyết định trước khi dựng bản.

## 1. Đã vào `main` (nhóm theo người dùng thấy)

**Lưu rồi mở lại đúng (cốt lõi)**
- Writer: mục lục (TOC) giữ trường cập nhật được khi lưu DOCX; theo dõi thay đổi/nhận xét không còn lẫn vào mục lục; đầu/chân trang và số trang đúng; hộp văn bản, ảnh chèn (giữa trang, đúng kích thước), cột; danh sách nhiều cấp, ngắt phần ngang.
- Slides: hình dựng sẵn có tên thật; ngăn chọn đổi tên/ẩn hình, lưu PPTX đúng; đường nối giữ kết nối; hai hoạt hình và hiệu ứng chuyển trang Đẩy/Quét/Chia/Che phủ lưu đúng; số slide/ngày/chân trang; phần (Section); tên bố cục tùy chỉnh.
- Sheet: sparkline đánh dấu cần lưu; biểu đồ kết hợp cột+đường giữ trục phụ, biểu đồ tròn giữ nhãn phần trăm; vị trí neo biểu đồ; công thức không còn bị nối tham chiếu trong chuỗi chữ; hàm ngoài Excel 2016 (XLOOKUP, IFS, UNIQUE, FILTER, SORT) ghi đúng tiền tố `_xlfn.` để Excel mở được (hiện `#NAME?`); lưu tệp rất lớn (lan14) có giới hạn giờ thay vì treo.
- Mã hóa mật khẩu tài liệu (Agile AES-256) ở Tệp > Thông tin.

**Tính năng/giao diện mới**
- Slides: Thu phóng, hộp thoại Kích thước trang, thêm hiệu ứng chuyển trang, in handout 3/6/9 slide mỗi trang và trang ghi chú, thông báo rõ khi dùng hiệu ứng Morph chưa hỗ trợ.
- Writer: chọn số hàng/cột khi chèn bảng, chèn mục lục tại con trỏ, hộp thoại In theo ngữ cảnh từng ứng dụng.
- Sheet: lọc PivotTable theo giá trị, sửa tiêu đề biểu đồ trong hộp thoại trục.
- Giao diện: ba đợt rà soát toàn bộ tab ribbon/hộp thoại/menu ở 1024×600 đến 1920×1080, sáng/tối. Đã sửa: nút In/Hủy luôn thấy, ngăn Trợ giúp một vùng cuộn, ribbon thu gọn ở cửa sổ nhỏ, hàng tiêu đề đóng băng giữ màu nền, mũi tên danh sách chỉ ở ô đang chọn, tương phản chế độ tối, nhãn Việt hóa.

**Hiệu năng (hồ sơ ấm, trong app đang chạy)**
- Xem trước in Writer (tài liệu phức tạp) 27 giây → 10–15 giây khi người dùng đã soạn một lúc.
- Mở tệp: bỏ khởi động worker không dùng (DOCX đường CLI, PPTX): khoảng −2,5 giây; chuẩn hóa HTML bảng theo lô (MYTIME.docx 24,8 → 18,3 giây); Sheet lớn: lan14 109 → ~77–91 giây, lan01 ~50 → ~48 giây, lan09 ~42 → ~34 giây. Đầu ra giống từng byte/DOM.

## 2. Việc bắt buộc trước khi phát hành
1. **Dựng bản thử và cài đặt thật** (`scripts/build-pilot.ps1`, `scripts/build-installer.ps1`). Đã thêm `cryptography` và `pypdf` vào danh sách gói; chỉ kiểm tra bằng Python tách biệt, **chưa dựng đủ bản**. Kiểm tra trên bản cài: mã hóa mật khẩu, in handout (cần `pypdf`), cập nhật.
2. Chạy bộ kiểm tra cuối: `npm test` (3791/3791), `i18n_parity` (VI=EN=3153), `verify_checklist_evidence` (0 dòng hạ), pytest đầy đủ, 27 tệp LAN (không gồm lan14) và bộ mở-sửa-lưu DOCX 8 tệp.
3. Cập nhật `APP_VERSION`, ghi chú phát hành và kênh cập nhật theo quy trình `docs/` (bản vá theo gói/khoá cập nhật, gói duy trì 1 năm cho giấy phép vĩnh viễn).
4. Đồng bộ nhánh macOS (`docs/THONG-TIN-TEAM-MAC-1910.md`): nhánh `vn-main` của kho `hieupt91-sketch/3t-office` là nguồn.

## 3. Quyết định đang chờ chủ
- **Số kiểu Việt ở Sheet:** nhập "1.250" cho ra 1,25 và "1.250,75" thành chữ. Chọn: theo vùng hệ điều hành (như Excel) hay quy ước Việt Nam.
- **Dấu đầu dòng mặc định** ở ô nội dung Slides (đổi cách lưu PPTX).
- **Cảnh báo hàm Excel 2016:** có hiện cảnh báo nhỏ khi nhập UNIQUE/FILTER/SORT/XLOOKUP/IFS hay không.
- **Mẫu báo cáo:** huy hiệu "Mẫu báo cáo" trên thẻ "Đề cương thuyết trình" đúng hay nhầm.
- **An ninh:** thu hồi token GitHub `ghp_36HK…` đã dán trong chat; xóa biến môi trường `GH_TOKEN` thừa; mời tài khoản GitHub của team Mac vào kho private.
- **Phát hành 0.9.12:** duyệt hay chưa.

## 4. Giới hạn đã biết (không chặn phát hành)
- Mở tệp lớn vẫn chậm hơn Office nhiều (chuyển đổi bằng LibreOffice là phần dài nhất): Sheet 40–50 giây cho lan01/lan09; PPTX 18 MB ~12 giây; MYTIME.docx ~18 giây.
- Slides: hiệu ứng Morph chưa hỗ trợ (đã có thông báo); in nhiều slide mỗi trang đã có nhưng chưa kiểm so với Office.
- Writer: lưu tài liệu mới qua hộp thoại hệ điều hành và xuất PDF qua hộp thoại chỉ kiểm được bằng API in, không qua giao diện thật.
- Excel COM đọc thuộc tính biểu đồ báo lỗi trong môi trường kiểm thử (đã xác nhận bằng XML); bộ kiểm tra PPTX hàng loạt thiếu hook `_batch_pptx.py`.
- Còn mục NOT RUN trong `docs/UI-SWEEP-*-21-10.md` (một số hộp thoại chèn trực tiếp của Slides, thao tác tệp hệ điều hành, thử nhập sai).
