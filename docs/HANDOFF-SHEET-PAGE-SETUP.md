# Handoff — VN Sheet Page Setup

## Kết quả

- Worktree: `E:\VNOffice-codex-sheet-pagesetup`; branch: `feature/sheet-page-setup-group`; không merge vào `main`.
- Tab **Bố trí trang** có nhóm **Thiết lập trang** gồm Lề trang, Hướng trang, Khổ giấy và Tiêu đề in.
- Dialog hỗ trợ preset lề Thường/Rộng/Hẹp, lề tùy chỉnh theo cm, Portrait/Landscape, A4/Letter/Legal và hàng/cột lặp lại. Có focus ban đầu theo command, focus trap/Escape từ dialog Sheet dùng chung, validation và thông báo lỗi.
- Model `pageSetupBySheet[sheetName]` độc lập từng sheet, tham gia reset/add/delete/snapshot/restore và undo/redo.
- Adapter ghi page setup thật vào FODS bằng `style:page-layout-properties`, `style:master-page` và table style riêng cho từng sheet. LibreOffice Calc headless dùng các style này khi xuất PDF.
- Adapter giữ metadata Page Setup khi round-trip FODS do VN Office tạo.

## Đo PDF thật bằng LibreOffice

Lệnh: `node tests/live/sheet-page-setup-real-pdf.mjs`

- PASS — A4 Portrait: **595.30 × 841.89 pt** (mục tiêu 595.28 × 841.89 pt).
- PASS — Legal Landscape: **1008.00 × 612.00 pt** (mục tiêu 1008 × 612 pt).
- PASS — custom margins top/bottom/left/right `2.1/2.2/2.3/2.4 cm` được LibreOffice giữ qua FODS → ODS → FODS (test quy đổi cả cm/mm/in, không so chuỗi đơn vị cứng).
- Dùng lại `tests/helpers/soffice-convert.mjs`; không viết lại launcher soffice.

## Kiểm thử

- PASS: `node tests/run-tests.js` — **822/822**, **56.12 giây** (<60 giây).
- PASS: `node tests/live/sheet-page-setup-real-pdf.mjs`.
- PASS: `node tests/live/sheet-page-setup.playwright.mjs` — Edge/Playwright thật trên Sheet canvas; click tab/nút, `selectOption` và `fill`, xác nhận model và cô lập sheet; không dùng SendKeys; không có `pageerror`.
- PASS: syntax check và `git diff --check`.

## Giới hạn / lưu ý review

- Print Titles đã có UI, validation và model riêng theo sheet, đồng thời được giữ trong FODS VN metadata. Chưa bọc row/column bằng cấu trúc native ODF `table-header-rows/table-header-columns`, nên chưa claim LibreOffice lặp tiêu đề thật khi in nhiều trang. Đây là hạng mục tùy chọn trong task.
- Khi nhập FODS do LibreOffice/ứng dụng khác tạo mà không có namespace metadata VN, Page Setup hiện fallback về mặc định; parser chưa suy ngược toàn bộ chuỗi table-style → master-page → page-layout.
- Không sửa LibreOffice Core, không thêm dependency, không đụng Writer/Slides và không merge `main`.

## Commit

- `2131f6d feat(sheet): add per-sheet page setup and FODS layout`
- `8504d1d test(sheet): verify page setup in browser and real PDF`
