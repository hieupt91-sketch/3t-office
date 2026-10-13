# Agent Handoff
TASK: Menu ngữ cảnh chuột phải cho đối tượng (ảnh, hộp văn bản) & Tab Trang tính trong Thiết lập trang (Sheet)
AGENT/ROLE: agy / Sheet UI & Integration
BRANCH: feat/sheet-object-menu-agy
WORKTREE: E:\VNOffice-agy-g5
OBJECTIVE:
(1) Menu chuột phải cho đối tượng trên trang tính: hình ảnh (`sheet.insert.image`), hộp văn bản (`sheet.insert.textbox`) gồm Cắt, Sao chép, Dán; Đưa lên trên (Lên trên cùng, Lên một lớp), Đưa xuống dưới (Xuống dưới cùng, Xuống một lớp); Xóa; và Định dạng đối tượng... Hỗ trợ mở menu bằng chuột phải và phím Menu / Shift+F10 khi đối tượng đang chọn.
(2) Hộp thoại Thiết lập trang (`showPageSetupDialog` trong `apps/sheet/sheet-grid.js`): bổ sung tab/nhóm Trang tính gồm in đường lưới, in tiêu đề hàng/cột, in ghi chú (không / cuối trang tính / như hiển thị), lỗi ô hiển thị (như hiển thị / <trống> / -- / #N/A), thứ tự trang (xuống rồi sang / sang rồi xuống); lưu vào `pageSetupBySheet` và bảo toàn qua `printOptions`.

FINDINGS:
- Đối tượng hình ảnh (`figure.vno-sheet-image`) và hộp văn bản (`div.vno-sheet-textbox`) được cấu hình `tabIndex = 0` và aria attributes để nhận tiêu điểm độc lập khi chọn.
- Menu ngữ cảnh đối tượng được xây dựng qua `_showObjectContextMenu` tận dụng hạ tầng `showContextMenu` của UI Kit, không tạo nút chết:
  * Cắt (Ctrl+X), Sao chép (Ctrl+C), Dán (Ctrl+V) lưu trữ vào `_objectClipboard` và hỗ trợ dán tại ô đang chọn hoặc dán lặp lại.
  * Đưa lên trên / Đưa xuống dưới hỗ trợ cả 2 mức: lên/xuống 1 lớp (`bringObjectForward` / `sendObjectBackward`) hoặc lên trên cùng / xuống dưới cùng (`bringObjectToFront` / `sendObjectToBack`). Thao tác thay đổi thứ tự lớp hỗ trợ hoàn tác/làm lại qua `collection-replace` history.
  * Xóa đối tượng (`deleteObject`, `deleteTextBox`, `deleteImage`) kích hoạt qua menu hoặc phím Delete / Backspace khi đối tượng đang chọn, hoàn tác đối xứng bằng Ctrl+Z.
  * Hộp thoại Định dạng đối tượng (`showFormatObjectDialog`) cung cấp các trường chỉnh sửa kích thước (cm với ảnh, px với textbox), vị trí ô neo, độ lệch và nội dung chữ của textbox.
- Hộp thoại Thiết lập trang (`showPageSetupDialog`):
  * Bổ sung nhóm "Trang tính" (`.vno-sheet-pagesetup-sheet-group`) với 5 điều khiển chuẩn: In đường lưới (checkbox), In tiêu đề hàng và cột (checkbox), In ghi chú (select: none, sheetEnd, asDisplayed), Lỗi ô hiển thị (select: displayed, blank, dash, na), và Thứ tự trang (select: downThenOver, overThenDown).
  * `DEFAULT_SHEET_PAGE_SETUP.printOptions` và `newSheetPageSetup()` cung cấp đầy đủ giá trị mặc định cho cả 5 trường.
  * `setPageSetup(sheetName, changes)` lưu trữ các trường tùy chọn in vào `pageSetupBySheet[sheetName].printOptions`.
  * `serializeToFods()` bảo toàn toàn bộ JSON `printOptions` qua thuộc tính mở rộng `vno:page-print-options` và xuất `grid`/`headers` sang token `style:print` chuẩn ODF.
  * Nhánh `parseFods()` khôi phục đầy đủ 5 trường khi tài liệu có thuộc tính `vno:page-print-options`, đồng thời giữ nguyên baseline fallback `{ gridlines: false, headings: false }` cho file ODF thuần để không làm biến động snapshot baseline của các bài kiểm thử độ khớp import. Không sửa đổi đường lưu XLSX zip sâu theo đúng chỉ đạo.

IMPLEMENTATION SUMMARY:
- `apps/sheet/sheet-grid.js`:
  * Mở rộng `DEFAULT_SHEET_PAGE_SETUP.printOptions` và `newSheetPageSetup` với đầy đủ 5 trường `{ gridlines: false, headings: false, comments: "none", cellErrors: "displayed", pageOrder: "downThenOver" }`.
  * Bổ sung các phương thức thao tác đối tượng: `_findObjectById`, `_resolveObjectTarget`, `deleteTextBox`, `deleteObject`, `cutObject`, `copyObject`, `pasteObject`, `_reorderObject`, `bringObjectToFront`, `bringObjectForward`, `sendObjectBackward`, `sendObjectToBack`, `showFormatObjectDialog`, `_showObjectContextMenu`.
  * Cập nhật `renderImages` và `renderTextBoxes`: gán `tabIndex = 0`, lắng nghe sự kiện `contextmenu`, `keydown` (ContextMenu, Shift+F10, Delete, Backspace, Ctrl+C, Ctrl+X), và `pointerdown` (chọn đối tượng và focus).
  * Cập nhật `showPageSetupDialog` và `setPageSetup`: bổ sung giao diện nhóm Trang tính và lưu trữ chính xác vào `pageSetupBySheet`.
  * Cập nhật `copySelection` và `pasteClipboard` để hỗ trợ clipboard đối tượng liền mạch khi nhấn Ctrl+C, Ctrl+X, Ctrl+V trên lưới.
- `apps/sheet/sheet.css`:
  * Bổ sung kiểu hiển thị viền chọn cho `.vno-sheet-textbox.is-selected` và hỗ trợ giao diện tối (dark mode).
- `adapters/libreoffice/sheet/sheet-adapter.js`:
  * Bảo toàn 5 thuộc tính `printOptions` trong `serializeToFods` qua `vno:page-print-options`.
- `platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`:
  * Bổ sung đầy đủ chuỗi bản địa hóa song ngữ cho menu ngữ cảnh đối tượng (`sheetContextMenu`) và nhóm Trang tính (`sheetDialogs`).
- `platform/help/entries-sheet.js`:
  * Cập nhật hướng dẫn sử dụng tiếng Việt thực tế trong ứng dụng cho các mục `sheet.contextMenu.rightClick`, `sheet.insert.image`, `sheet.insert.textbox`, và `sheet.page.setupRound2`. Tuyệt đối không chứa tên thương hiệu độc quyền (Word/Excel/PowerPoint).
- `tests/unit/sheet-object-menu.test.js`:
  * Bài kiểm thử đơn vị bao phủ toàn diện: `_findObjectById`, thứ tự lớp z-order, thao tác clipboard đối tượng, xóa đối tượng và hoàn tác, hiển thị menu ngữ cảnh, cập nhật `printOptions` trong `pageSetupBySheet`, và bảo toàn serialize FODS.
- `tests/live/cdp/actions.mjs`:
  * Bổ sung ánh xạ phím `F10` (keyCode: 121) và `ContextMenu` (keyCode: 93) trong `specialKeys` để hỗ trợ giả lập phím ngữ cảnh qua giao thức CDP.
- `tests/live/cdp/sheet-object-menu.desktop.mjs`:
  * Bài kiểm thử CDP Desktop chạy trực tiếp trên app Desktop qua WebView2, kiểm tra đầy đủ click chuột phải trên ảnh và textbox, phím tắt ContextMenu và Shift+F10 khi đối tượng đang chọn, các lệnh Cắt/Sao chép/Dán, Đưa lên trên/xuống dưới, Xóa đối tượng, hộp thoại Định dạng đối tượng và tab Trang tính trong Thiết lập trang.

FILES CHANGED:
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/sheet/sheet-payload-parser.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `platform/help/entries-sheet.js`
- `tests/run-tests.js`
- `tests/unit/sheet-object-menu.test.js` (tạo mới)
- `tests/live/cdp/actions.mjs`
- `tests/live/cdp/sheet-object-menu.desktop.mjs` (tạo mới)
- `docs/tickets-0710/HANDOFF-SHEET-OBJECT-MENU-AGY.md` (tạo mới)

COMMANDS RUN:
- `npm test`
- `node -e "import('./tests/unit/sheet-object-menu.test.js').then(m => m.runSheetObjectMenuTests()).then(console.log)"`
- `node -e "import('./tests/unit/help-shortcut-consistency.test.js').then(m => m.runHelpShortcutConsistencyTests()).then(console.log)"`
- `node -e "import('./tests/unit/real-office-import-fidelity.test.js').then(m => m.runRealOfficeImportFidelityTests()).then(console.log)"`
- `$env:VNO_CDP_LOCALAPPDATA = "E:\VNOffice-profiles\agy-g5"; $env:TEMP = "E:\VNOffice-profiles\agy-g5"; $env:TMP = "E:\VNOffice-profiles\agy-g5"; node --experimental-websocket tests/live/cdp/sheet-object-menu.desktop.mjs`

BUILD RESULT: NOT RUN (không yêu cầu build cho thay đổi tầng giao diện/JavaScript).

TEST RESULTS:
- PASS — `npm test`: 3182/3182 test đạt 100% xanh (bao gồm toàn bộ 255 suite kiểm thử và suite mới S-OBJ).
- PASS — CDP Desktop Test (`tests/live/cdp/sheet-object-menu.desktop.mjs`): 26/26 kiểm tra đạt 100% xanh.

KNOWN FAILURES: Không có.
RISKS: Không có.
DEPENDENCIES/BLOCKERS: Không có.
CORE PATCH ID (if any): None.
NEXT ACTION: Đánh giá mã nguồn trên nhánh `feat/sheet-object-menu-agy` và chuẩn bị tiến hành merge.
