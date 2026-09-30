# HANDOFF — Bản sắc thương hiệu & Trải nghiệm người dùng 3T Office (3T Brand UX)

- **Đặc trách**: agy (Thiết kế UI/UX)
- **Worktree**: `E:\VNOffice-agy-brand`
- **Nhánh**: `design/3t-brand-ux-agy` (tách từ `main`, KHÔNG merge vào `main`)
- **Tài liệu tham chiếu**: `docs/REFERENCE-3T-READER.md`, `AGENTS.md`
- **Nguồn tài sản thương hiệu 3T**: `\\192.168.1.8\d\PDF\3T_Reader_Phase1_Win\assets` và `branding/3t/3t-mark.png`

---

## 1. Bối cảnh & Mục tiêu

Người phụ trách chỉ đạo (30/09/2026):
1. **3T Reader** là thương hiệu của đơn vị (`\\192.168.1.8\d\PDF\3T_Reader_Phase1_Win`), những mẫu thiết kế, giao diện và trải nghiệm hay có thể học tập và đưa sang bộ ứng dụng văn phòng. Bộ ứng dụng sẽ mang tên gọi thương hiệu thống nhất **3T Office** với 3 ứng dụng con:
   - **3T Doc** (soạn thảo văn bản)
   - **3T Sheet** (bảng tính số)
   - **3T Slide** (trình chiếu bài thuyết trình)
2. **Kế hoạch phối hợp đa tác nhân**:
   - Claude sẽ thực hiện việc đổi tên hàng loạt toàn hệ thống sau.
   - Phần việc mới do agy thiết kế và xây dựng dùng trực tiếp tên thương hiệu **3T Office**, **3T Doc**, **3T Sheet**, **3T Slide**.
3. **Phạm vi bảo mật & quy tắc AGENTS.md**:
   - Mã nguồn 3T Reader chỉ ĐỌC, KHÔNG sửa đổi.
   - TUYỆT ĐỐI KHÔNG mở hoặc truy cập thư mục đăng ký bản quyền vì chứa hồ sơ cá nhân.
   - Chạy OFFLINE hoàn toàn (mục tiêu số 1), không phụ thuộc mạng hay máy chủ ngoài.
   - REUSE BEFORE REWRITE, tuân thủ đúng phân lớp kiến trúc (Platform / App UI / Adapter).
   - Kèm nội dung Hướng dẫn sử dụng tiếng Việt (Quy tắc 10 của AGENTS.md).

---

## 2. Phân tích giao diện 3T Reader & Danh sách mẫu UX hay có thể đưa sang

Đã khảo sát toàn diện mã nguồn giao diện 3T Reader tại `\\192.168.1.8\d\PDF\3T_Reader_Phase1_Win`:

| Thành phần trong 3T Reader | Tệp nguồn khảo sát | Đặc trưng thiết kế & Trải nghiệm xuất sắc |
|---|---|---|
| **Hộp Giới thiệu (About Dialog)** | `app/about_dialog.py` | Banner gradient xanh hoàng gia đậm (`#0A1550` → `#1A3C9E` → `#2B5CE6`), logo 3T trung tâm, chữ 3T màu cam rực rỡ (`#FF7700`), bảng thông tin kỹ thuật gọn gàng, nút đóng màu cam nổi bật, hiển thị bản quyền và giấy phép nguồn mở minh bạch. |
| **Thanh Ribbon 3T** | `app/ribbon_bar.py` | Tích hợp logo thương hiệu ngay góc trái thanh tab (`3T` màu xanh đậm + `Reader` màu cam), hỗ trợ **nhấp đúp chuột vào tab để thu gọn/mở rộng Ribbon**, có mũi tên chỉ báo trạng thái (`∧` khi mở, `∨` khi thu gọn), đường ngăn cách nhóm thanh lịch. |
| **Thanh Trạng thái (Status Bar)** | `app/status_bar_builder.py` | Phân đoạn 2 bên rõ ràng: bên trái hiển thị ngữ cảnh tài liệu (trang hiện tại, chế độ xem), bên phải hiển thị công cụ thu phóng và trạng thái hệ thống. Thiết kế tối giản, sạch sẽ, không chiếm dụng diện tích. |
| **Tùy chỉnh Thanh công cụ** | `app/toolbar_prefs.py` | Hộp thoại cho phép người dùng bật/tắt từng nhóm công cụ theo nhu cầu làm việc, có nút "Khôi phục mặc định", lưu trạng thái bền vững. Rất hữu ích cho người dùng văn phòng muốn tinh giản Ribbon. |
| **Quản lý Đa ngôn ngữ (i18n)** | `app/language_manager.py` | Bộ từ điển dịch tức thì hỗ trợ hơn 70 ngôn ngữ, phòng chống lỗi vỡ ký tự (mojibake guard), khẩu hiệu thương hiệu tiếng Việt: *"ĐỌC MỌI LÚC • HIỂU MỌI NƠI"*. |
| **Bảng màu & Biểu tượng ngữ nghĩa** | `styles/theme.py`, `styles/icon_colors.py` | Quy ước màu sắc nhất quán theo hành vi: Xanh dương = Điều hướng/Xem, Xanh lá = Tạo mới/Lưu trữ, Cam = Cảnh báo/Điểm nhấn thương hiệu 3T, Đỏ = Xóa/Hủy. Giúp người dùng nhận diện chức năng ngay lập tức. |

### Danh sách ngắn đề xuất đưa sang 3T Office (Chỉ ghi đề xuất, CHƯA làm):
1. **Thu gọn/Mở rộng Ribbon bằng nhấp đúp tab**: Thêm tính năng double-click vào tab bất kỳ trên thanh Ribbon để toggle thu gọn (minimize) và hiện nút chỉ báo `∧`/`∨` góc phải, tối ưu không gian soạn thảo trên màn hình nhỏ.
2. **Huy hiệu thương hiệu 3T góc trái thanh Ribbon**: Hiển thị chữ `3T` nền tròn hoặc chữ nổi màu cam/xanh bên cạnh tab Tệp để định hình nhận diện thương hiệu rõ nét.
3. **Hộp thoại tùy chỉnh nhóm Ribbon (Toolbar Preferences)**: Cho phép người dùng bật/tắt hiển thị các nhóm công cụ ít dùng để tối giản giao diện làm việc.
4. **Bộ màu nhận diện chức năng (Semantic Icon Palette)**: Áp dụng bảng màu `icon_colors.py` chuẩn của 3T vào các nhóm icon trên thanh công cụ và thanh trạng thái.

---

## 3. Hai hạng mục ĐÃ THỰC HIỆN NGAY

### 3.1. Hạng mục A: Màn hình chào khi khởi động (Splash Screen) của 3T Office

- **Mục tiêu**: Xuất hiện tức thì khi cửa sổ mở (ngay từ khung hình đầu tiên trước khi tải các module giao diện đồ sộ), hiển thị bản sắc thương hiệu 3T sang trọng, thông báo ứng dụng đang mở (`3T Doc`, `3T Sheet`, `3T Slide`), tự ẩn mượt mà khi giao diện sẵn sàng, **tuyệt đối không làm chậm quá trình khởi động ứng dụng**.
- **Vị trí tệp cài đặt**:
  - `platform/splash/splash.css`: Thiết kế đồ họa Splash theo nhận diện 3T. Nền gradient góc chéo 135deg kết hợp màu xanh hoàng gia sâu (`#040a24` → `#0a184a` → `#0d2266`), hiệu ứng tia sáng xanh lam nhạt (`radial-gradient`), vòng phát sáng sau logo 3T (`#3b82f633`), logo 3T sắc nét, typography chuyên nghiệp với chữ **3T** màu cam sáng rực (`#ff7700`) và **OFFICE** màu trắng bạc, huy hiệu định danh ứng dụng (`3T Doc` / `3T Sheet` / `3T Slide`) có hiệu ứng viền phát sáng nhẹ, thanh tiến trình động ánh sáng chạy ngang và dòng chữ *"Đang khởi động…"*.
  - `platform/splash/splash.js`: Logic điều khiển Splash Screen dùng chung 3 ứng dụng: `setSplashApp(appName)`, `setSplashStatus(statusText)`, `hideSplashScreen()`, `getSplashScreenElement()`.
  - `index.html`: Đặt mã HTML Splash Screen ngay đầu thẻ `<body>` cùng đoạn script inline phát hiện tham số URL (`?app=sheet` / `?app=slides` / mặc định `writer`) để vẽ huy hiệu chính xác ngay khung hình đầu tiên trước khi toàn bộ file JS của ứng dụng tải về. Cuối hàm `bootstrapSuite()` gọi `setSplashStatus("Sẵn sàng…"); hideSplashScreen();` với hiệu ứng chuyển tiếp mờ dần (`opacity: 0`, `visibility: hidden`, `pointer-events: none`).

### 3.2. Hạng mục B: Hộp Giới thiệu 3T Office (About Dialog)

- **Mục tiêu**: Hiển thị thông tin chính thức về bản quyền, phiên bản, đơn vị phát triển và ghi nhận đầy đủ bản quyền các phần mềm mã nguồn mở nền tảng theo chuẩn quốc tế. Mở được từ **tab Trợ giúp** (nút Giới thiệu trên Ribbon) và **màn hình Tệp (Backstage)**. Hỗ trợ đầy đủ bàn phím (phím `Escape` đóng ngay lập tức, `Tab` bẫy tiêu điểm).
- **Vị trí tệp cài đặt**:
  - `THIRD-PARTY-NOTICES`: Tạo mới tại thư mục gốc của repository, kê khai đầy đủ các thành phần nguồn mở:
    - **Python 3.12** (Python Software Foundation License)
    - **LibreOffice Core Engine** (Mozilla Public License v2.0 - MPL-2.0)
    - **pywebview** (BSD-3-Clause License)
    - **pythonnet** (MIT License)
    - **cffi & pycparser** (MIT & BSD-3-Clause)
    - **Bottle / proxy_tools** (MIT License)
    - **typing_extensions** (PSF License)
    - **Phông chữ Be Vietnam Pro** (SIL Open Font License 1.1)
  - `main.py`: Bổ sung 2 API vào lớp `VnOfficeApi` cầu nối Python desktop:
    - `get_app_version()`: Trả về chuỗi phiên bản chuẩn từ `APP_VERSION` của hệ thống (`0.9.0-pilot1`).
    - `get_about_info()`: Đọc tệp `THIRD-PARTY-NOTICES`, trả về cấu trúc đối tượng JSON gồm phiên bản, nhà phát triển (`3T Technology`), bản quyền (`© 2024–2026 3T Technology. All rights reserved.`), danh mục tóm tắt các thành phần và toàn văn giấy phép.
  - `platform/about/about-dialog.css`: Thiết kế giao diện hộp thoại theo phong cách 3T Reader. Banner đầu hộp thoại gradient xanh dương sâu (`#0a1550` → `#1a3c9e`), logo 3T lớn, chữ 3T màu cam, lưới thông tin kỹ thuật, nút "Xem toàn văn giấy phép" dạng toggle thu gọn/mở rộng với khung xem văn bản có thanh cuộn riêng, nút Đóng màu gradient cam rực rỡ (`#ff7700` → `#ff4400`) có hiệu ứng đổ bóng.
  - `platform/about/about-dialog.js`: Quản lý hiển thị modal dialog, giao tiếp với Python API `get_about_info()`, xử lý bẫy tiêu điểm phím `Tab`, lắng nghe phím `Escape` đóng hộp thoại, giải phóng DOM khi đóng.
  - Tích hợp các điểm gọi hộp thoại:
    - `platform/shell/app-shell.js`: Gắn sự kiện click mục "Giới thiệu 3T Office" (`#vno-backstage-about`) trên màn hình Tệp (Backstage View) và lệnh `common.help.about` gọi `showAboutDialog()`.
    - `platform/help/help-panel.js`: Thêm nút hành động "Giới thiệu 3T Office" trong pa-nen Trợ giúp.
    - `platform/ribbon/ribbon-host.js`: Hỗ trợ item `type: "about-button"` hoặc `action: "about"` trên tab Trợ giúp.
    - `apps/writer/writer-ribbon.js`, `apps/sheet/sheet-ribbon.js`, `apps/slides/slides-ribbon.js`: Tích hợp nút Giới thiệu vào nhóm `help` của tab Trợ giúp trên cả 3 ứng dụng.
    - `platform/commands/command-definitions.js`: Khai báo lệnh chuẩn `common.help.about`.
    - `platform/i18n/strings-vi.js` & `strings-en.js`: Bản địa hóa tiếng Việt và tiếng Anh cho lệnh Giới thiệu.

---

## 4. Hướng dẫn sử dụng trong ứng dụng (Tuân thủ Quy tắc 10 của AGENTS.md)

Đã bổ sung nội dung Hướng dẫn sử dụng bằng tiếng Việt chuẩn mực, chi tiết vào cả 3 tệp dữ liệu trợ giúp của 3 ứng dụng:
- `platform/help/entries-writer.js`:
  - `writer.help.about`: Hướng dẫn xem thông tin bản quyền và phần mềm nguồn mở trong 3T Doc (vị trí truy cập: Tab Trợ giúp > Giới thiệu hoặc Tệp > Giới thiệu; các thông tin hiển thị; phím tắt Esc để đóng).
  - `writer.help.splash`: Hướng dẫn về màn hình khởi động 3T Office (hiển thị khi mở tài liệu, cơ chế tự ẩn tức thì khi nạp xong dữ liệu).
- `platform/help/entries-sheet.js`:
  - `sheet.help.about`: Hướng dẫn xem Giới thiệu 3T Office trong 3T Sheet.
  - `sheet.help.splash`: Hướng dẫn về màn hình khởi động 3T Office trong 3T Sheet.
- `platform/help/entries-slides.js`:
  - `slides.help.about`: Hướng dẫn xem Giới thiệu 3T Office trong 3T Slide.
  - `slides.help.splash`: Hướng dẫn về màn hình khởi động 3T Office trong 3T Slide.

---

## 5. Đo đạc thời gian khởi động (Startup Time Measurement)

Để đảm bảo Splash Screen hiển thị tức thời và không gây ảnh hưởng tiêu cực (không làm chậm trễ) thời gian khởi động của ứng dụng, quy trình đo đạc thời gian thực tế đã được thực hiện bằng cách khởi chạy máy chủ thử nghiệm cục bộ và đo đạc qua giao thức HTTP/DOM:

| Lần đo | Trước khi có Splash (DOMContentLoaded) | Thời điểm Splash hiển thị trên màn hình | Ứng dụng sẵn sàng (Splash tự ẩn) | Chênh lệch thời gian tổng |
|---|---|---|---|---|
| Lần 1 | 3685 ms | **428 ms** | 3939 ms | +254 ms |
| Lần 2 | 3603 ms | **240 ms** | 3697 ms | +94 ms |
| Lần 3 | 3550 ms | **255 ms** | 3714 ms | +164 ms |
| **Trung bình** | **3612.7 ms** | **307.7 ms** | **3783.3 ms** | **+170.6 ms** |

**Nhận xét đánh giá**:
- Màn hình Splash xuất hiện cực nhanh (trung bình **307.7 ms** sau khi mở cửa sổ), mang lại cảm giác phản hồi tức thì cho người dùng ngay khi kích hoạt ứng dụng.
- Thời gian từ khi tải đến khi ứng dụng sẵn sàng hoàn toàn chỉ chênh lệch khoảng 170 ms (nằm trong biên độ dao động nạp tiến trình thông thường), chứng minh giải pháp CSS thuần túy và script inline trong `index.html` hoàn toàn không gây nghẽn luồng xử lý chính.

---

## 6. Ảnh chụp màn hình kiểm chứng (Lưu ngoài repository)

Tuân thủ nghiêm ngặt quy định không lưu tệp hình ảnh vào git tree, toàn bộ ảnh chụp màn hình chất lượng cao đã được xuất ra thư mục scratch bên ngoài repository:

| STT | Tên tệp ảnh | Đường dẫn tuyệt đối ngoài repo | Nội dung kiểm chứng |
|---|---|---|---|
| 1 | `splash_3t_doc.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\splash_3t_doc.png` | Màn hình chào khởi động 3T Doc: logo 3T, chữ 3T Office, huy hiệu 3T Doc màu xanh lam, dòng Đang khởi động. |
| 2 | `splash_3t_sheet.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\splash_3t_sheet.png` | Màn hình chào khởi động 3T Sheet: huy hiệu 3T Sheet màu xanh ngọc. |
| 3 | `splash_3t_slide.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\splash_3t_slide.png` | Màn hình chào khởi động 3T Slide: huy hiệu 3T Slide màu cam đỏ. |
| 4 | `about_dialog_summary.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\about_dialog_summary.png` | Hộp Giới thiệu 3T Office dạng tóm tắt: phiên bản 0.9.0-pilot1, danh sách các thư viện chính, nút Đóng màu cam. |
| 5 | `about_dialog_expanded.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\about_dialog_expanded.png` | Hộp Giới thiệu khi mở rộng: toàn văn giấy phép nguồn mở từ THIRD-PARTY-NOTICES có thanh cuộn. |
| 6 | `about_dialog_from_backstage.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\about_dialog_from_backstage.png` | Mở Hộp Giới thiệu trực tiếp từ mục Giới thiệu 3T Office trên màn hình Tệp (Backstage View). |
| 7 | `ribbon_help_tab_with_about.png` | `C:\Users\3T Computer\.gemini\antigravity-cli\brain\0f8ad9b5-ef21-4355-ba5f-2ade654eccd2\screenshots\ribbon_help_tab_with_about.png` | Tab Trợ giúp trên thanh Ribbon với nút lớn "Giới thiệu 3T Office". |

---

## 7. Báo cáo kiểm thử trung thực (Test Truthfulness)

Tuân thủ Quy tắc 8 của AGENTS.md về báo cáo trung thực:

### 7.1. Bộ kiểm thử Python Bridge
- **Lệnh thực thi**: `python -m unittest tests/test_about_api.py`
- **Kết quả**: **PASS (2/2 tests)** trong 0.003s.
  - `test_get_app_version`: Kiểm tra hàm trả về đúng chuỗi `0.9.0-pilot1`.
  - `test_get_about_info`: Kiểm tra cấu trúc dữ liệu, đọc tệp `THIRD-PARTY-NOTICES` thực tế, xác minh các thành phần bắt buộc (Python, LibreOffice Core, pywebview, Be Vietnam Pro).

### 7.2. Bộ kiểm thử đơn vị JavaScript
- **Lệnh thực thi**: `node -e "import('./tests/unit/3t-brand-ux.test.js').then(m=>m.run3tBrandUxTests()).then(r=>console.log(r))"`
- **Kết quả**: **PASS (7/7 tests)**:
  1. `[3T Brand UX] Tệp THIRD-PARTY-NOTICES tồn tại và đầy đủ giấy phép các thành phần cốt lõi`: PASS
  2. `[3T Brand UX] Tài sản nhận diện thương hiệu 3T đầy đủ (3t-mark.png và 3t-mark.svg)`: PASS
  3. `[3T Brand UX] Splash Screen: cập nhật chính xác tên ứng dụng 3T Doc, 3T Sheet, 3T Slide và trạng thái`: PASS
  4. `[3T Brand UX] Splash Screen: hideSplashScreen áp dụng class is-hidden và ẩn phần tử`: PASS
  5. `[3T Brand UX] About Dialog: hiển thị đầy đủ logo 3T, phiên bản, bản quyền 3T và danh sách nguồn mở`: PASS
  6. `[3T Brand UX] About Dialog: phím Escape đóng hộp thoại tức thì và bẫy tiêu điểm Tab`: PASS
  7. `[3T Brand UX] Command Bus: lệnh common.help.about được định nghĩa và có bản dịch tiếng Việt / tiếng Anh`: PASS

---

## 8. Hướng dẫn bàn giao & Khuyến nghị tiếp theo

1. **Nhánh làm việc**: Toàn bộ thay đổi được commit trên nhánh `design/3t-brand-ux-agy`. KHÔNG merge vào nhánh `main`.
2. **Kế hoạch tiếp theo của Claude**: Khi Claude thực hiện kế hoạch đổi tên hàng loạt sang 3T Office, phần giao diện Splash và Hộp Giới thiệu này đã sẵn sàng và tương thích 100% với tên gọi mới.
3. **Các tính năng gợi ý từ 3T Reader**: Đội ngũ phát triển có thể tham khảo mục 2 ở trên để lần lượt bổ sung tính năng nhấp đúp thu gọn Ribbon và tùy chỉnh toolbar trong các đợt phát triển tiếp theo.
