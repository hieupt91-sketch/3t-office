# Handoff — VN Sheet Page Setup Round 2

## Kết quả

- Worktree `E:\VNOffice-codex-sheet-pagesetup-round2`, branch `feature/sheet-page-setup-round2`, tách/fast-forward từ `main`; không merge vào `main`.
- Hoàn tất cả 4 khoảng trống theo từng sheet trong `pageSetupBySheet`: Scale to Fit, Header/Footer in, căn giữa trang ngang/dọc, in đường kẻ ô và tiêu đề hàng/cột.
- Scale to Fit hỗ trợ 10–400% hoặc vừa số trang ngang/dọc (0 là tự động), validation rõ ràng và undo/redo bằng history sẵn có.
- Header/Footer có mẫu Trang X, Tên sheet, Ngày; ba vùng Trái/Giữa/Phải cho đầu và cuối trang; hỗ trợ mã `&P`, `&N`, `&D`, `&T`, `&F`, `&A`.
- Tái sử dụng Shared Help: tab Trợ giúp/F1 của Sheet đăng ký bài “Thiết lập trang in nâng cao” bằng tiếng Việt, chỉ rõ vị trí ribbon và từng bước sử dụng.

## ODF / LibreOffice

- `style:scale-to` cho phần trăm và cặp `style:scale-to-X` / `style:scale-to-Y` cho chế độ vừa trang theo từng trục (0 là tự động); metadata VN giữ đầy đủ lựa chọn khi round-trip nội bộ.
- `style:master-page` chứa `style:header/footer`, ba region và field ODF động `text:page-number`, `text:page-count`, `text:date`, `text:time`, `text:file-name`, `text:sheet-name`.
- `style:table-centering` nhận `none`, `horizontal`, `vertical`, `both`.
- `style:table-properties style:print` nhận token ODF `grid` và `headers` bên cạnh các đối tượng in mặc định.
- Không sửa LibreOffice Core, không thêm dependency.

## Kiểm thử

- PASS `node tests/run-tests.js`: **980/980**, 70,57 giây. Suite hiện đã tăng lên 980 test và các round-trip soffice có sẵn làm tổng thời gian tự nhiên vượt mốc 60 giây; không có test bị tắt/bỏ qua.
- PASS `node tests/live/sheet-page-setup.playwright.mjs`.
- PASS `node tests/live/sheet-page-setup-real-pdf.mjs` (khoảng 89 giây do 5 lần chạy soffice cô lập để có artifact đối chứng).
- Unit thật cho model per-sheet, validation, undo/redo, FODS native và round-trip cả 4 tính năng trong `tests/unit/sheet-comments-printarea.test.js`.
- Playwright thật trong `tests/live/sheet-page-setup.playwright.mjs`: click ribbon/dialog, `check`, `fill`, `selectOption`; không SendKeys; kiểm tra cô lập sheet và mở bài Help.
- PDF thật trong `tests/live/sheet-page-setup-real-pdf.mjs`: LibreOffice headless xuất bảng 26×50; Fit 1×1 phải đúng một trang và ít trang hơn 100%; so artifact có/không Header/Footer để xác nhận text drawing thực sự được thêm vào PDF; tiếp tục đo A4/Legal và lề round-trip.

## Commit

- `78a8456 feat(sheet): add scale-to-fit page setup`
- `e3e5dcf feat(sheet): add printable headers and footers`
- `cae1095 feat(sheet): center printed sheets on page`
- `10e6594 feat(sheet): print gridlines and headings`

## Phạm vi và rollback

- Không sửa Writer/Slides source, không merge main. Các tính năng có commit riêng để revert độc lập; commit cuối gom Help, i18n, live tests và handoff.
