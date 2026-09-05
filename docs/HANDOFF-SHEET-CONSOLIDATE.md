# Agent Handoff

TASK: VN Sheet Consolidate / Hợp nhất dữ liệu (`sheet.data.consolidate`)
AGENT/ROLE: Grok / Sheet implementation and verification
BRANCH: `feature/sheet-consolidate`
WORKTREE: `E:\VNOffice-grok-sheet-consolidate`
BASE: `main` @ `e40e84d` (Evaluate Formula merged, 1072/1072 PASS)
OBJECTIVE: Thêm hộp thoại Hợp nhất dữ liệu trên tab Dữ liệu — gộp nhiều vùng từ các trang tính khác nhau trong cùng workbook thành một bảng tổng hợp tại ô đang chọn, dùng SUM/AVERAGE/COUNT/MAX/MIN thật của FormulaEngine. Không merge vào main.

## FINDINGS (đọc trước khi thiết kế)

`FormulaEngine` đã có SUM / AVERAGE / COUNT / MAX / MIN trong `_executeFunction`, và đã hiểu tham chiếu trang tính qua `_parseReference` + `sheetResolver` (`Sheet1!A1`, `'Dự toán chi phí'!A1:B5`, 3D `Sheet1:Sheet3!A1`). `collectValues` gom ô/vùng có `!` qua `_referenceValues`.

`SheetGridController.sheetsData` là `Record<sheetName, Map<coord, cell>>`. `cellsData` là getter/setter của trang đang active. Engine được tạo với:

- `() => this.cellsData`
- `sheetName => this.sheetsData?.[sheetName] || null`
- `() => this.activeSheet`
- `() => this.sheets`

Không viết lại logic tính. Mỗi ô đích gọi `engine.evaluate("=SUM(Sheet1!A1,Sheet2!A1,...)")` (hoặc AVERAGE/COUNT/MAX/MIN). Undo dùng `batch-cells` trên stack hiện có (không phải view-only).

## Mức độ hỗ trợ nhãn (label) so với chỉ theo vị trí — RÕ RÀNG

| Excel 365 Consolidate | VN Sheet (phiên bản này) |
|---|---|
| Gộp theo vị trí, vùng cùng kích thước, nhiều sheet | **Có.** Trường hợp chính: SUM/AVERAGE/COUNT/MAX/MIN các vùng cùng số hàng/cột từ nhiều trang trong **cùng workbook** |
| Gộp theo nhãn hàng trên / cột trái, thứ tự và kích thước khác nhau | **Có, mức cơ bản-khá đủ.** Khớp nhãn không phân biệt hoa thường sau trim. Trục **đã tick** lấy hợp (union) nhãn theo thứ tự lần xuất hiện đầu. Trục **không tick** vẫn theo vị trí và **bắt buộc cùng số hàng hoặc số cột dữ liệu** |
| Gộp từ workbook khác (file khác) | **Không.** Chỉ workbook đang mở |
| Create links to source data (công thức liên kết) | **Không.** Ghi **giá trị tĩnh** vào ô đích (như Excel khi không tick Create links) |
| Nhãn trùng trong một vùng nguồn | Lần xuất hiện **sau ghi đè** lookup; thứ tự cột/hàng giữ lần đầu |
| Nhãn trống | Bỏ qua hàng/cột đó |
| Function list đầy đủ Excel (Product, StdDev, …) | Chỉ SUM, AVERAGE, COUNT, MAX, MIN — đúng phạm vi task |

Ví dụ nhãn (đã test): Sheet1 cột Q1/Q2, hàng Hà Nội/HCM; Sheet2 **đảo cột và đảo hàng** (Q2/Q1, HCM/Hà Nội). SUM Hà Nội×Q1 = 10+6 = 16, khớp engine.

Khi **không tick nhãn** mà vùng khác kích thước → lỗi rõ, không gộp sai.

## IMPLEMENTATION SUMMARY

- Module thuần `apps/sheet/consolidate.js`: parse `TênTrang!A1:B10`, gộp theo vị trí hoặc theo nhãn, ủy thác `FormulaEngine.evaluate`.
- Dialog `showConsolidateDialog()`: Hàm, Tham chiếu, Thêm / Xóa / Duyệt, danh sách, hai checkbox nhãn, Đồng ý. Duyệt thu nhỏ hộp để bấm chọn ô thật trên lưới (được đổi tab trang tính). Ô đích = trang + ô active lúc mở hộp.
- Ghi kết quả là giá trị, một bước Undo/Redo `batch-cells`.
- Ribbon tab Dữ liệu → nhóm Công cụ dữ liệu, cạnh Tách văn bản / Điền nhanh / Xóa trùng lặp.
- Help entry mới `sheet.data.consolidate` (tiếng Việt, khớp UI).

## FILES CHANGED

- `apps/sheet/consolidate.js` (mới)
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet-ribbon.js`
- `apps/sheet/sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (một dòng `.uno:DataConsolidate` — cần để command bus/UNO giống các lệnh Data khác; không sửa Writer/Slides)
- `platform/commands/command-definitions.js` (một lệnh `sheet.data.consolidate`)
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `platform/help/entries-sheet.js` (entry mới)
- `tests/unit/sheet-consolidate.test.js` (mới)
- `tests/live/sheet-consolidate.playwright.mjs` (mới)
- `tests/unit/sheet-help.test.js`
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-CONSOLIDATE.md`

Không đụng Writer/Slides source.

## COMMANDS RUN

- `node --check` các file JS mới/sửa
- `node tests/run-tests.js` — **1081/1081 PASS**, ~70.4s (< 90s)
- `node tests/live/sheet-consolidate.playwright.mjs` — **PASS** (Edge, không SendKeys): ribbon → dialog → Duyệt chọn A1:B2 trên «Dự toán chi phí» và «Kế hoạch Q3» → Thêm ×2 → Đồng ý → «Nhân sự» A1=11, B1=22, A2=7, B2=15 (tính tay 10+1, 20+2, 3+4, 7+8)

## TEST RESULTS

- PASS — full runner `1081/1081 PASS | 0 FAIL` (~70.37s)
- PASS — live Playwright Consolidate
- Unit: SUM 2 sheet khớp engine + tính tay; AVERAGE và MAX không chỉ SUM; COUNT 3 sheet + Undo xóa / Redo khôi phục khối đã chèn; nhãn đảo thứ tự; từ chối vùng khác kích thước khi gộp theo vị trí

## KNOWN FAILURES

None.

## RISKS / LIMITS

- Không gộp từ file workbook khác.
- Không tạo liên kết công thức về nguồn.
- Theo vị trí: bắt buộc cùng kích thước.
- Theo nhãn một trục: trục còn lại bắt buộc cùng số hàng/cột dữ liệu.
- COUNT/SUM ủy thác engine hiện có (ô trống `getCellValue` trả 0 — hành vi engine cũ, không đổi trong task này). Test dùng ô đã điền số.
- `.uno:DataConsolidate` là ánh xạ LibreOffice thật; UI là dialog VN, không phải dialog native Calc.

## DEPENDENCIES/BLOCKERS

None. Không thư viện trả phí.

## CORE PATCH ID

N/A — không sửa LibreOffice Core/upstream.

## NEXT ACTION

Review/cherry-pick các commit trên `feature/sheet-consolidate` từ worktree `E:\VNOffice-grok-sheet-consolidate`. **KHÔNG merge tự động vào main.**

Commits:

- `4c854d6` feat(sheet): add Consolidate dialog on Data tab to merge ranges across sheets
- `ff586ea` test(sheet): cover Consolidate SUM/AVERAGE/MAX, Undo/Redo, labels, and live UI
- (commit handoff này)
