# PLAN-SHEET-P2 — Tăng tốc tính lại công thức khi sửa ô

## Objective
Giảm độ trễ sửa, xác nhận, undo/redo trong Sheet mà vẫn giữ nguyên kết quả từng công thức và hành vi lỗi. Mục tiêu theo FIX-P2: thao tác bắt đầu sửa ≤100 ms, Enter ≤300 ms, undo/redo cùng mức trên lan01, lan04, lan06, lan09, lan14, lan16 trong app desktop; sau đó chạy batch lan01,02,04,06,09,11,22,26.

## Current capability and evidence
- `apps/sheet/sheet-grid.js::_recalculateAllFormulas` hiện xóa cache rồi duyệt công thức trên mọi sheet. Đường cập nhật ô gọi hàm này.
- `FormulaEngine` đã có parser/tham chiếu ô, đọc giá trị qua `getCellValue`, và các hàm tra cứu/điều kiện VLOOKUP, HLOOKUP, MATCH, INDEX, COUNTIF, SUMIF. `_equals` có ép kiểu/chuẩn hóa mỗi lần so sánh.
- Profile nêu trong phiếu xác định `getCellValue`, `_equals`, `_executeFunction` chiếm phần lớn thời gian trên lan01; serialize FODS không phải nút thắt.
- Tái sử dụng FormulaEngine và SheetGrid hiện hữu. Không gọi LibreOffice từ UI, không sửa core.

## Files and modules in scope
- `apps/sheet/sheet-grid.js`: phát hiện ô thay đổi, quản lý cache dependency/dirty set, tính lại theo thứ tự phụ thuộc, fallback an toàn; nối luồng edit, undo/redo và các đường sửa dữ liệu đã có.
- `apps/sheet/formula-engine.js`: trích xuất tham chiếu tĩnh từ cú pháp engine; cache giá trị đã chuẩn hóa trong một lượt tính; chỉ mục lookup theo sheet/vùng/hướng/kiểu so khớp, với vô hiệu hóa khi dữ liệu vùng đổi; fallback quét tuần tự khi công thức/đối số không thuộc trường hợp an toàn.
- `tests/unit/formula-engine.test.js`, test SheetGrid hiện có hoặc test mới trong `tests/unit/`: kiểm tra dependency trực tiếp/gián tiếp/liên sheet/range, chu kỳ, công thức động/không phân tích được, undo/redo, cache/index invalidation, so sánh kiểu và truyền lỗi.
- `scripts/audit-0610/`: thêm hoặc điều chỉnh harness đối chiếu toàn bộ giá trị trên cùng workbook giữa full recalc và dependency recalc; giữ expected/fixtures nguyên trạng.
- `docs/HANDOFF-FIX-P2-CODEX.md`: handoff theo mẫu repo. Không đổi UI/hành vi người dùng cần thêm help/i18n; nếu phạm vi thực tế buộc đổi cách dùng, bổ sung hướng dẫn tiếng Việt và i18n trước hoàn tất.

## Dependency and algorithm order
1. Dựng đồ thị phụ thuộc từ formula refs/ranges và reverse edges; thay ô nguồn chỉ đánh dấu công thức downstream. Đánh giá theo thứ tự phụ thuộc. Với INDIRECT/OFFSET, chu kỳ, reference không phân tích được hoặc cập nhật cấu trúc sheet/range không thể chứng minh an toàn, dùng full recalc hiện có.
2. Bảo toàn đường full recalc làm fallback và oracle. Chỉ bật incremental cho các công thức có dependency tĩnh đã xác định; không để cache kết quả sống qua sửa ô nếu chưa vô hiệu hóa đúng.
3. Đo profile lại, sau đó thêm cache giá trị parse theo phiên/lượt tính và chỉ mục cho trường hợp lookup có ngữ nghĩa chính xác. Chỉ mục có khóa tách biệt kiểu số/text, quy tắc so khớp tương đương hiện tại và được bỏ/rebuild khi vùng liên quan đổi. Approximate/duplicate/error/wildcard/criteria edge cases phải giữ cùng kết quả; trường hợp chưa đảm bảo thì quét tuần tự.
4. Chạy đường mới và full-recalc oracle trên cùng nội dung 28 workbook, so từng kết quả công thức và tỷ lệ khớp cached value (không dưới 53.41%); không sửa test hoặc expected để đạt.
5. Đo desktop bằng app thật/CDP chuột và phím thật, không web/SendKeys/OS input. Giữ riêng `VNO_APP_ROOT=<worktree>` và `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fp2`; chỉ dừng PID do lượt này khởi chạy.

## Risks and containment
- Ref ranges, cross-sheet refs, dynamic refs, cycles, whole-row/column refs, array formulas, manual calculation, external links, volatile functions, and structural edits có thể làm dependency thiếu cạnh; fallback full recalc cho trường hợp chưa được bao phủ.
- Lookup indexing có thể làm đổi so khớp số/văn bản, wildcard, gần đúng, duplicate keys, blank/error handling; triển khai theo từng hàm/trường hợp đã chứng minh bằng oracle, các trường hợp còn lại dùng implementation hiện hữu.
- Cache parse có nguy cơ stale; giới hạn theo phiên tính và xóa/invalidate đồng bộ mọi thay đổi dữ liệu/format liên quan.
- Nếu fallback khiến dataset mục tiêu không đạt ngưỡng thời gian, profile thêm và thu hẹp đúng nút thắt; không hy sinh kết quả hay độ chính xác.

## Test and acceptance plan
- Theo quy tắc phiếu: `npm test`; `python -m unittest discover -s tests` (lỗi môi trường/chập chờn thì cô lập và chạy lại ba lần, báo đúng kết quả); quét encoding.
- Các test formula hiện có (`formula*`, `sheet-formula*`, S-series) và test mới phải PASS; kiểm chứng #REF!, #NAME?, #N/A truyền đúng.
- Differential oracle: mọi ô công thức trên 28 workbook giữ nguyên chính xác so với full recalc, cached-value hit ≥53.41%. Batch desktop XLSX lan01,02,04,06,09,11,22,26 với `VNO_AUDIT_MARK_DIRTY=1`.
- Desktop editing latency trên lan01,04,06,09,14,16: edit-start ≤100 ms, Enter ≤300 ms; lặp cho undo/redo. Ghi số đo thực tế và logs.
- Không tuyên bố PASS nếu chưa chạy lệnh/đo tương ứng.

## Rollback
Mỗi bước/nhóm có commit riêng ngay sau khi hoàn tất. Nếu differential mismatch hoặc hồi quy: tắt incremental/index/cache theo feature gate để quay về full recalc/lookup gốc; revert commit của nhóm lỗi, giữ test/harness chứng minh lỗi. Không reset/force-push hoặc xóa dữ liệu người dùng.
