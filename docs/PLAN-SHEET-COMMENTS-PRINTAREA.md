# Plan — Sheet Comments, Print Area & Page Breaks

## Objective

Hoàn thiện hai hạng mục Sheet Tier 2: ghi chú ô và trạng thái vùng in/ngắt trang có UI thật, cô lập theo sheet và tham gia Deep Undo/Redo.

## Current capability / reuse

- Tái sử dụng `SheetGridController`, virtual row rendering, selection range và `_recordHistory`.
- Tái sử dụng Command Bus theo tuyến Ribbon → `SheetAdapter` → grid; command đã đăng ký chỉ dùng `bindHandler()` và mọi handler nhận options đều chuẩn hóa `options = options || {}`.
- Tái sử dụng dialog DOM của Sheet; không thêm dependency và không sửa LibreOffice Core.

## Files / modules

- `apps/sheet/sheet-grid.js`, `sheet.css`, `sheet-ribbon.js`: model, CRUD, visual, popup và ribbon.
- `adapters/libreoffice/sheet/sheet-adapter.js`: bind handler an toàn null.
- `platform/commands/command-definitions.js`, `platform/ui-kit/icons.js`, `adapters/libreoffice/common/command-dispatch-mapper.js`: command, SVG và UNO mapping.
- `tests/unit/sheet-comments-printarea.test.js`, `tests/run-tests.js`: behavioral suite 27.
- `docs/FEATURE-PARITY-ROADMAP.md`, `docs/HANDOFF-SHEET-COMMENTS-PRINTAREA.md`: trạng thái và giới hạn trung thực.

## Dependencies

Không có dependency ngoài. Không thay file format semantics: CSV tiếp tục chỉ chứa dữ liệu ô, không chứa comment/print metadata.

## Risks

- Virtual scrolling và chuyển sheet phải render lại marker/viền đúng.
- Snapshot xóa/undo sheet phải mang theo metadata mới.
- Viền vùng in/ngắt trang phải cùng tồn tại với selection và formatting ô.

## Test plan

- Behavioral DOM/state: thêm/sửa/xóa comment, marker/popup; set/clear print area; insert/remove break; isolation; undo/redo; command/ribbon/icon/mapping.
- Chạy `node tests/run-tests.js` và syntax suite.
- Serve root bằng `python -m http.server`, thao tác chuột/bàn phím thật trong trình duyệt và ghi giá trị DOM quan sát được.

## Rollback

Toàn bộ thay đổi nằm trong một commit feature độc lập; rollback bằng revert commit sau review, không cần migration.
