# Plan — Sheet Pivot Table & Lookup/Conditional Functions

OBJECTIVE: Thêm 8 hàm tra cứu/điều kiện tương thích hành vi Excel/Calc và Pivot Table tạo sheet kết quả thật, refresh được, có state theo sheet và undo/redo.

CURRENT CAPABILITY: Tái sử dụng `FormulaEngine`, selection range, multi-sheet `sheetsData`, `addSheet`/`deleteSheet`, snapshot/history, Sheet dialog, Ribbon và Command Bus. Không cần LibreOffice Core patch.

FILES/MODULES:
- `apps/sheet/formula-engine.js`: catalog và semantics hàm.
- `apps/sheet/pivot-table.js`: đọc vùng nguồn, validate cấu hình, aggregate và dựng bảng kết quả.
- `apps/sheet/sheet-grid.js`, `sheet-ribbon.js`, `sheet.css`: state/integration/dialog/refresh/history/UI.
- Adapter/command/icon: đăng ký command qua `bindHandler()`, định nghĩa ribbon và icon SVG thật.
- `tests/**`: suite công thức và Pivot behavioral; đăng ký runner 21/22.
- `docs/**`: roadmap và handoff.

DEPENDENCIES: JavaScript thuần; không thêm package, SDK, external AI hay thay build/file-format semantics.

RISKS: approximate lookup và wildcard criteria phải đúng semantics; refresh phải đọc đúng source sheet; snapshot tạo/xóa sheet phải mang theo pivot config; mọi mutation create/refresh/delete phải round-trip qua history.

TEST PLAN: Dữ liệu bảng mẫu với kết quả chính xác cho exact/approx/not-found, numeric comparison và wildcard; Pivot Sum/Count/multiple axes, isolation, source refresh, create/delete undo-redo, command/icon; chạy `node tests/run-tests.js` và syntax checks trong runner.

ROLLBACK: Revert commit tính năng duy nhất trên branch; không có migration hoặc Core patch.
