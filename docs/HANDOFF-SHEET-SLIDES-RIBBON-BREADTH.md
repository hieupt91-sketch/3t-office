# Handoff — Sheet + Slides Ribbon Breadth (04/09/2026)

TASK: Xây mới Theme Gallery và Slide Size cho VN Slides, Insert Pictures cho VN Sheet, gồm ribbon UI và logic thật.  
AGENT/ROLE: Codex — implementation + QA  
BRANCH: `feature/sheet-slides-ribbon-breadth`  
WORKTREE: `E:\VNOffice-codex-ribbon-breadth`  
OBJECTIVE: Mở rộng độ phủ ribbon theo vị trí Microsoft Office tương ứng, không tạo nút giả/chết, tái sử dụng Command Bus, adapter, controller và history stack hiện hữu.

FINDINGS:

- Tab Design của Slides trước thay đổi chỉ có nhóm Slide Master và 4 theme.
- Tab Insert của Sheet chưa có Illustrations/Pictures; chart overlay là pattern phù hợp để tái sử dụng.
- Canvas Slides dùng hệ tọa độ 960 × 540; shape và connector cần scale cả hai nhóm thuộc tính khi chuyển tỷ lệ.
- `docs/HANDOFF-SHEET-SLIDES-UI-AUDIT-ROUND2.md` không có tại HEAD của worktree nhưng có trong lịch sử Git; đã đọc trực tiếp từ commit chứa file trước khi code.

## Báo cáo capability

| STT | Command ID | App | Mô tả | Trạng thái thật | Cách xác minh |
|---:|---|---|---|---|---|
| 1 | `slides.design.themeGallery` | VN Slides | Nhóm Themes đầu tiên của tab Design; dialog lưới 6 theme song ngữ, preview riêng; click áp dụng ngay font/màu/nền/logo/footer toàn bài; rerender canvas, thumbnail, sorter; Undo/Redo. | Hoàn chỉnh trong document model phiên làm việc. Có hạn chế đã ghi rõ: metadata theme chưa round-trip qua FODP/PPTX/ODP, giống giới hạn Slide Master hiện hữu. | Unit trong `adapter-mapping.test.js`; live click Design → Themes → Cam Năng Động, kiểm tra DOM/model, Ctrl+Z/Ctrl+Y ở VI/EN. |
| 2 | `sheet.insert.image` | VN Sheet | Nhóm Illustrations trên tab Insert, trước Charts; file picker thật, FileReader Data URL, overlay neo tại ô chọn, nút xóa, cô lập theo sheet, Undo/Redo và snapshot add/delete sheet. | Hoàn chỉnh trong document model phiên làm việc. Có hạn chế đã ghi rõ: CSV/XLSX/ODS bridge hiện dùng CSV trung gian nên chưa round-trip ảnh; Data URL lớn làm tăng bộ nhớ. | `sheet-images.test.js`; live chọn C5 → Insert → Pictures → browser file chooser PNG thật → xóa → Ctrl+Z/Ctrl+Y ở VI/EN. |
| 3 | `slides.design.slideSize` | VN Slides | Nhóm Customize trên tab Design; chọn 16:9 (960×540) hoặc 4:3 (720×540), đổi canvas/thumbnail/sorter/slideshow; scale `x/y/w/h` và `x1/y1/x2/y2` của mọi shape/media/connector trên mọi slide; Undo/Redo. | Hoàn chỉnh trong document model phiên làm việc, đã test scale mọi slide. Có hạn chế đã ghi rõ: metadata page size chưa round-trip qua FODP/PPTX/ODP hiện hữu. | `slides-slide-size.test.js`; live chèn shape thật, chọn 4:3, đo canvas 720 px và geometry ×0,75, Ctrl+Z/Ctrl+Y ở VI/EN. |

IMPLEMENTATION SUMMARY:

- Bổ sung command definitions, UNO mappings, adapter dispatch, ribbon groups đúng app, icon SVG và i18n VI/EN.
- Theme Gallery dùng lại `SLIDE_MASTER_THEMES`/`applySlideMaster`; mở rộng từ 4 lên 6 theme.
- Sheet Pictures dùng collection `imagesBySheet`, overlay song song với `chartLayer`, và action `collection` của Sheet history.
- Slide Size dùng `slideSize` global của presentation và geometry snapshot đối xứng cho Undo/Redo.
- Không sửa LibreOffice Core, Writer, Command Bus, Shortcut Manager, build system hay security boundary; không thêm dependency.

FILES CHANGED: `apps/slides/slides-canvas.js`, `apps/slides/slides-ribbon.js`, `apps/slides/slides.css`, `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `adapters/libreoffice/slides/slides-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/command-dispatch-mapper.js`, `platform/commands/command-definitions.js`, `platform/ui-kit/icons.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `tests/run-tests.js`, `tests/unit/adapter-mapping.test.js`, `tests/unit/sheet-images.test.js`, `tests/unit/slides-slide-size.test.js`, `tests/live/sheet-slides-ribbon-breadth.playwright.mjs`, tài liệu này.  
COMMANDS RUN: `node --check ...`; `node tests/run-tests.js`; `python -m http.server 8765 --bind 127.0.0.1`; `node tests/live/sheet-slides-ribbon-breadth.playwright.mjs`; `git diff --check`.  
BUILD RESULT: Không có build step; syntax checks nằm trong master suite và PASS.  
TEST RESULTS: PASS — master suite `421/421` trong khoảng 11,3 giây; live Playwright PASS cho cả `vi-VN` và `en-US` qua HTTP, dùng click/file chooser/keydown thật.  
KNOWN FAILURES: Không có failure trong phạm vi runtime được yêu cầu. Các giới hạn round-trip được ghi rõ trong bảng.  
RISKS: Data URL ảnh lớn có thể làm phình bộ nhớ; history Slide Size giữ geometry snapshot tương ứng số shape.  
DEPENDENCIES/BLOCKERS: Không thêm dependency; live test dùng Edge hệ thống và `playwright-core` cài ngoài repo. Không blocker.  
CORE PATCH ID (if any): Không áp dụng.  
NEXT ACTION: Claude review ba commit feature và commit docs; không tự merge vào `main`.
