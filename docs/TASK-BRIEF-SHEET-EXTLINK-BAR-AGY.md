# TASK BRIEF — Sheet: thanh cảnh báo "Liên kết ngoài" giống Excel (agy, UI + nối logic nhỏ)

Worktree: `E:\VNOffice-agy-extlink-bar` (nhánh `design/sheet-extlink-bar-agy`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` nếu mở app.

## Bối cảnh
Tệp Excel có công thức liên kết tới sổ làm việc khác (`=[B.xlsx]Sheet1!A1`) — 21/264 tệp thật trên LAN. Hiện `adapters/libreoffice/sheet/sheet-adapter.js` `loadFromFods` đếm `this.externalLinkCells` và chỉ báo trên thanh trạng thái (`this.shell?.setStatus`). Excel hiện một **thanh thông báo màu vàng** dưới ribbon: biểu tượng cảnh báo + "CẢNH BÁO BẢO MẬT Các cập nhật tự động của liên kết đã bị tắt" + nút "Bật nội dung". VN Office chạy offline, KHÔNG mở/cập nhật tệp khác, nên nút phải khác.

## Việc
1. Tạo thành phần thanh thông báo dùng chung trong `platform/ui-kit/` (một component, dùng được cho Writer/Sheet sau này — không copy riêng từng app): vị trí dưới ribbon, trên lưới/trang; nền vàng nhạt kiểu Office (đạt WCAG AA cả chế độ Sáng và Tối), biểu tượng thông tin, văn bản, nút hành động tuỳ chọn, nút đóng (×). `role="status"`/`aria-live="polite"`, phím Tab tới được nút, Esc đóng khi focus trong thanh.
2. Sheet: khi mở tệp có `externalLinkCells > 0` hiện thanh: "Tệp có N ô liên kết tới sổ làm việc khác. VN Office hiển thị giá trị lưu lần cuối và không tự cập nhật (ứng dụng chạy ngoại tuyến)." + nút "Tìm hiểu thêm" mở bài Help `sheet.formula.externalLinks` (đã có trong `platform/help/entries-sheet.js`) + nút đóng. Thanh tự ẩn khi mở tệp khác/tạo tệp mới.
3. Không đổi logic tính/lưu liên kết (đã có và đã kiểm chứng). Chỉ thêm UI + gọi component từ chỗ đang `setStatus`.
4. Tệp mẫu để thử: tự tạo bằng Excel COM (không SendKeys) hoặc dùng FODS viết tay như `tests/unit/sheet-external-links.test.js`. KHÔNG dùng tài liệu công ty.

## Kiểm chứng
`node tests/run-tests.js` foreground; viết `tests/live/sheet-extlink-bar.playwright.mjs` (mẫu: `tests/live/writer-design-tab.playwright.mjs`): thanh hiện khi có liên kết, không hiện khi không có, nút Tìm hiểu thêm mở đúng bài Help, × và Esc đóng, tương phản sáng/tối đạt AA, không tràn 1024px, 0 pageerror. Không commit ảnh png.

## Luật cứng
Không đụng Writer adapter, `ooxml_zip_patch.py`, `main.py`. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sau mỗi bước, tiền tố `design(ui): …`. Không merge vào `main`. Handoff `docs/HANDOFF-SHEET-EXTLINK-BAR-AGY.md`, PASS/FAIL/NOT RUN trung thực.