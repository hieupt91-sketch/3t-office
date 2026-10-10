# Agent Handoff

TASK: TICKET FIX-L3 — Slides: nhóm đối tượng, bút trình chiếu và Slide Master theme
AGENT/ROLE: Codex / Slides adapter + canvas
BRANCH: `fix/slides-group-pen-theme-l3-codex`
WORKTREE: `E:\VNOffice-codex-fl3`
OBJECTIVE: Giữ nhóm đối tượng (gồm nhóm lồng) qua PPTX save/open; Ctrl+P bật bút và Esc thoát công cụ mà giữ trình chiếu/nét mực; khôi phục đúng themeId của Slide Master.
FINDINGS: Adapter trước đây đã nhận `<draw:g>` nhưng làm phẳng nhóm; `groupId` của Canvas không được serialize. Ctrl+P/Ctrl+L/Ctrl+A bị listener bàn phím tổng quát cạnh tranh. LibreOffice bỏ metadata `vno:master-theme` khi xuất PPTX, nên themeId không có trong OOXML để đọc lại.
IMPLEMENTATION SUMMARY:
- Serialize nhóm thường thành `<draw:g>` để LibreOffice tạo `<p:grpSp>`; parser khôi phục nhóm cha/con và giữ SmartArt theo cơ chế nhận diện nền rỗng/connector hiện hữu.
- Ctrl+G tạo nhóm lồng, Ctrl+Shift+G bỏ nhóm cha; click chọn toàn nhóm. Tay nắm đổi kích thước và xoay cập nhật tất cả thành viên nhóm.
- Xử lý phím slideshow ở capture của `window`; Ctrl+P bật crosshair/bút, Ctrl+L laser, Ctrl+A mũi tên, Esc rời bút và giữ slideshow/nét.
- Lưu themeId bằng marker `VNOfficeTheme:<id>` trong tên `p:cSld`; JS và Python post-process/overlay khôi phục marker về `vno:master-theme`.
- Commits theo từng phần: `14c8101a`, `ef6df4c9`, `5da60069`, `bed7d6ec`, `ac39462a`.
FILES CHANGED:
- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/slides/pptx-master-logo.js`
- `adapters/libreoffice/slides/pptx-native-postprocess.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `apps/slides/slides-canvas.js`
- `tests/unit/slides-editing-group.test.js`
- `tests/unit/slides-save-fidelity.test.js`
- `tests/unit/slides-pen-laser.test.js`
- `tests/unit/slides-pptx-masterlogo-open-overlay.test.js`
- `tests/test_slides_pptx_master_theme.py`
- `tests/live/cdp/slides-fix-l3.desktop.mjs`
- `docs/tickets-0710/HANDOFF-FIX-L3.md`
COMMANDS RUN:
- `node --input-type=module -e ... runSlidesEditingGroupTests/runSlidesSaveFidelityTests/runSlidesPenLaserTests/runSlidesPptxMasterLogoOpenOverlayTests/runSlidesSmartartImportTests ...`
- `$env:VNO_CDP_LOCALAPPDATA='E:\VNOffice-profiles\codex-fl3'; $env:VNO_FIX_L3_SOURCE='E:\VN OFice\file test\lan\BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx'; node --experimental-websocket tests/live/cdp/slides-fix-l3.desktop.mjs`
- `npm test`
- `python -m unittest tests.test_slides_pptx_master_theme -v`
- `python -m unittest discover -s tests`
- `node --check tests/live/cdp/slides-fix-l3.desktop.mjs`
- `git diff --check`
BUILD RESULT: NOT RUN (ticket yêu cầu test unit/CDP/npm/Python, không yêu cầu build riêng).
TEST RESULTS:
- Unit mục tiêu: group 7/7 PASS; save fidelity 7/7 PASS; pen/laser 7/7 PASS; Slide Master JS 10/10 PASS; SmartArt import 6/6 PASS.
- CDP desktop: 13/13 PASS trên bản sao PPTX báo cáo kinh doanh 17 slide; CDP port riêng `54345`, profile `E:\VNOffice-profiles\codex-fl3`. Đã đo Ctrl+G/Ctrl+Shift+G, XML có 2 `<p:grpSp>`, mở lại đủ nhóm lồng và hình/text/ảnh, kéo/resize/xoay nhóm, theme `minimal-dark`, Ctrl+P/Ctrl+L/Ctrl+A/Esc. Bản gốc không bị ghi đè.
- `npm test`: 3040/3040 PASS.
- Python unittest: 814 tests, OK. Bộ test có `ResourceWarning` file handle chưa đóng nhưng không có test fail.
- `git diff --check`: PASS.
KNOWN FAILURES: Không.
RISKS: LibreOffice biểu diễn textbox trong FODP thành custom-shape hình chữ nhật khi đọc lại; nội dung text và cấu trúc nhóm được giữ. Theme ID dùng marker trong tên `p:cSld`, một trường tên chuẩn OOXML; ứng dụng khác có thể hiển thị chuỗi marker như tên master.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Review các commit trên; không push/merge theo phạm vi ticket.
