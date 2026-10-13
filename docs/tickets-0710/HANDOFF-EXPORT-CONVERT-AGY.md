# Agent Handoff

TASK: Thêm mục XUẤT VÀ CHUYỂN ĐỔI FILE trong Backstage (menu Tệp) cho 3 ứng dụng Writer, Sheet, Slides
AGENT/ROLE: agy / Shared Platform & Export Feature Owner
BRANCH: feat/export-convert-agy
WORKTREE: E:\VNOffice-agy-export
OBJECTIVE: Thêm mục "Xuất và chuyển đổi" vào Backstage dùng chung tại Shared Platform (`platform/shell`, `platform/commands`, `platform/i18n`, `platform/help`) cho cả 3 ứng dụng VN Writer, VN Sheet, VN Slides, hỗ trợ xuất PDF và chuyển đổi sang các định dạng Office/tiêu chuẩn mở (Writer: DOCX, DOC, ODT, RTF, TXT; Sheet: XLSX, XLS, ODS, CSV; Slides: PPTX, PPT, ODP) với mô tả mức độ giữ định dạng khi mở bằng Office, cờ Tùy chọn Tương thích Office, banner kết quả hiển thị đường dẫn tệp và nút mở thư mục, xử lý lỗi rõ ràng, bàn phím điều hướng đầy đủ, i18n VI/EN và tài liệu Trợ giúp tiếng Việt cụ thể (không placeholder, không từ ngữ thương hiệu cấm).

FINDINGS:
- Tái sử dụng logic lưu hiện hữu: Không viết lại logic lưu tệp. Quy trình xuất và chuyển đổi tái sử dụng trực tiếp các phương thức `saveRealFile` và `exportRealPdf` của `globalUnoBridge` (`UnoBridge`), kết nối trực tiếp với backend Python Desktop qua `save_document_dialog` và `export_pdf_dialog` trong `main.py`.
- Về cờ Tùy chọn "Tương thích Office": Giao diện cung cấp checkbox `#vno-export-compat-checkbox` (mặc định bật) và truyền cờ `{ officeCompatibility }` xuống hàm điều phối `exportDocument`. Ở tầng backend Python hiện tại, việc ghi và chuyển đổi tệp dùng các bộ lọc tiêu chuẩn của LibreOffice/soffice mà chưa có tham số riêng biệt cho cờ này. UI không giả vờ backend đã xử lý sâu cờ này, cờ đã sẵn sàng cho các pha nâng cấp tiếp theo.
- Về nút "Mở thư mục chứa tệp": Sau khi xuất thành công, banner kết quả hiển thị đường dẫn tệp thật (`#vno-export-result-path`) kèm nút `#vno-export-open-folder-btn`. Hàm `AppShell.openContainingFolder(filePath)` đã được cài đặt sẵn sàng gọi `open_containing_folder` từ bridge nếu backend cung cấp; do backend Python hiện tại chưa có API native mở thư mục cho đường dẫn bất kỳ, UI hiển thị thông báo hộp thoại rõ ràng kèm đường dẫn đầy đủ để người dùng sao chép hoặc mở qua Trình quản lý tệp, hoàn toàn trung thực, không giả vờ thư mục đã được mở tự động.
- Tuân thủ quy tắc quét chuỗi hiển thị (`BANNED_DISPLAY_TEXT`): Toàn bộ nhãn UI, thông báo lỗi, văn bản i18n và bài viết Trợ giúp đều tuân thủ nghiêm ngặt quy định không dùng tên thương hiệu cấm, sử dụng các thuật ngữ "văn bản", "bảng tính", "bản trình chiếu", "Office", vượt qua 100% các bài kiểm tra scanner nguồn hiển thị.

IMPLEMENTATION SUMMARY:
- `platform/commands/command-definitions.js`: Khai báo lệnh `common.file.exportConvert` ("Xuất và chuyển đổi", category: "file", icon: "fileExport", shortcut: "Ctrl+E").
- `platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`: Thêm đầy đủ từ điển `backstage` (tiêu đề, mô tả, nhóm PDF, nhóm chuyển đổi, các nhãn định dạng và mô tả mức độ giữ định dạng cho cả 3 app, thông báo thành công, lỗi, mở thư mục) và định nghĩa command `common.file.exportConvert`.
- `platform/i18n/strings.vi.json`: Bổ sung key `exportConvert`.
- `platform/ribbon/keytips.js`: Gắn keytip `X` cho `#vno-backstage-nav-export` trong `BACKSTAGE_KEYTIP_MAP`.
- `platform/help/entries-retro-platform.js`: Bổ sung bài viết Trợ giúp tiếng Việt chi tiết `common.platform.exportConvertHelp` gồm 6 bước sử dụng cụ thể cho từng app, không dùng placeholder hay từ cấm.
- `platform/shell/shell.css`: Thiết kế hoàn chỉnh layout `.vno-export-panel`, `.vno-export-card`, `.vno-export-options-box`, `.vno-export-loading`, `.vno-export-success-banner` cho cả Light Mode và Dark Mode.
- `platform/shell/app-shell.js`:
  + Thêm nút điều hướng `#vno-backstage-nav-export` và khung hiển thị `#vno-backstage-export-view` vào Backstage modal markup.
  + Hỗ trợ điều hướng phím mũi tên và switch tab sang "export", quản lý vòng đời dọn dẹp `exportPanelCleanup` khi đóng hoặc chuyển tab.
  + Cài đặt phương thức `_renderBackstageExportPanel(container, closeModal)`: hiển thị danh sách format theo app (Sheet: XLSX, XLS, ODS, CSV; Writer: DOCX, DOC, ODT, RTF, TXT; Slides: PPTX, PPT, ODP) và nhóm PDF; hỗ trợ click / phím Enter / Space; hiển thị loading; hiển thị banner thành công kèm đường dẫn tệp và nút mở thư mục; hiển thị dialog lỗi tiếng Việt rõ ràng khi gặp sự cố.
  + Cài đặt phương thức `exportDocument(targetFormat, options)`: lấy dữ liệu soạn thảo từ adapter theo từng app và gọi `globalUnoBridge.exportRealPdf` hoặc `globalUnoBridge.saveRealFile`.
  + Cài đặt phương thức `openContainingFolder(filePath)`: gọi bridge hoặc fallback hiển thị đường dẫn.
  + Đăng ký handler cho lệnh `common.file.exportConvert` trong `_setupGlobalShortcuts()`.
- `tests/live/cdp/export-convert.desktop.mjs`: Bộ kiểm thử CDP trên app Desktop thật cho cả 3 ứng dụng Writer, Sheet, Slides với biến môi trường tách biệt (`E:\VNOffice-profiles\agy-export`).

FILES CHANGED:
- `platform/commands/command-definitions.js`
- `platform/help/entries-retro-platform.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `platform/i18n/strings.vi.json`
- `platform/ribbon/keytips.js`
- `platform/shell/app-shell.js`
- `platform/shell/shell.css`
- `tests/live/cdp/export-convert.desktop.mjs`
- `docs/tickets-0710/HANDOFF-EXPORT-CONVERT-AGY.md`

COMMANDS RUN:
- `npm test`: 3165/3165 PASS (100% xanh).
- `node --experimental-websocket tests/live/cdp/export-convert.desktop.mjs`: 21/21 PASS (100% xanh trên cả 3 ứng dụng desktop Writer, Sheet, Slides).
- Biến môi trường chạy test desktop: `$env:TEMP = "E:\VNOffice-profiles\agy-export\temp"`, `$env:VNO_CDP_LOCALAPPDATA = "E:\VNOffice-profiles\agy-export\localappdata"`.

BUILD RESULT: NOT RUN (không yêu cầu đóng gói nhị phân cho thay đổi tầng Shared Platform JavaScript).

TEST RESULTS:
- PASS — `npm test`: 3165/3165 PASS (0 FAIL).
- PASS — `tests/live/cdp/export-convert.desktop.mjs`: 21/21 PASS (0 FAIL) trên app desktop thật qua CDP (không dùng SendKeys, dọn dẹp tiến trình an toàn chỉ theo PID child process do session tạo).

KNOWN FAILURES: Không có.

RISKS: Không có. Toàn bộ logic lưu tệp nguyên bản được tái sử dụng, không can thiệp vào các đường lưu mặc định của ứng dụng.

DEPENDENCIES/BLOCKERS: Không có.

CORE PATCH ID (if any): None.

NEXT ACTION: Review và hợp nhất (merge) nhánh `feat/export-convert-agy` vào nhánh chính.
