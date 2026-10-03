# AGENT HANDOFF — CH-1 Lazy Sheets, Pha 2 WIP

- **Task:** CH-1 Pha 2 — mở `lan14.xlsx` theo sheet.
- **Agent/role:** Codex / VN Sheet performance.
- **Branch:** `perf/ch1-lazy-sheets-codex`.
- **Worktree:** `E:\VNOffice-codex-lan14c`.
- **Objective:** mở và thao tác được dưới 60 giây, WebView2 peak dưới 1,5 GB, không treo quá 2 giây; lưu đủ và đúng 10 sheet.

## Trạng thái

- Đã merge `main` vào nhánh trước khi làm tiếp (nhánh từng sau 3 commit).
- Commit trước `a0e755df` đã có wire format: payload chỉ chứa sheet chọn và stub cho sheet hoãn.
- Lần này đã thêm API Python `get_sheet_open_payload(openId, sheetName)`, bridge JS, `ensureSheetLoaded()` có gộp request trùng và hợp nhất model của đúng một sheet.
- Tab chuột, bàn phím, double-click và context menu gọi `activateSheet()` để chờ nạp sheet trước khi chuyển; lỗi nạp không chuyển sang model rỗng.
- Session giữ thêm bản sao XLSX riêng tư cạnh FODS để nạp sheet không phụ thuộc tệp nguồn có còn nguyên trên đường dẫn hay không; cleanup xóa cả hai.
- Session không bị release sau open nếu workbook còn sheet hoãn.
- **Production vẫn chưa truyền `included_sheets`; hành vi thực tế vẫn là Pha 1.** Không bật cờ vì save-merge và consumer toàn workbook chưa hoàn tất.

## File thay đổi

- `main.py`
- `adapters/libreoffice/common/uno-bridge.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `apps/sheet/sheet-grid.js`
- `tests/test_sheet_open_payload.py`
- `tests/unit/sheet-open-payload.test.js`
- tài liệu handoff này

## Kiểm chứng thật

- `python -s -m unittest tests.test_sheet_open_payload`: **PASS 7/7**.
- runner hẹp `runSheetOpenPayloadTests`: **PASS 8/8**.
- `git diff --check`: **PASS**.
- `node tests/run-tests.js`: **NOT RUN** — WIP chưa qua safety gate, full gate chỉ chạy một lần cuối pha.
- Desktop regression 27 ca: **NOT RUN**.
- Audit legacy lan01–03: **NOT RUN**.
- Probe `lan14` 3 lần, lưu và first switch: **NOT RUN**.
- Mục tiêu dưới 60 giây và WebView2 dưới 1,5 GB: **FAIL theo số Pha 1 gần nhất (180,203 giây; 2,685 GB); Pha 2 chưa bật/chưa đo.**

## Việc bắt buộc tiếp theo

1. Save-merge phía Python: chỉ ghép các sheet đã sửa vào FODS/XLSX session; sheet chưa nạp giữ nguyên byte/semantics nguồn. Test hash/số ô từng sheet trước khi bật.
2. Nối safety cho công thức xuyên sheet, tìm/thay toàn workbook, Ctrl+End, thống kê, named range, conditional formatting và sheet ẩn. Không cho consumer tiếp tục trên stub rỗng.
3. Hoàn thiện vòng đời session khi đóng/thay tài liệu và gia hạn phù hợp; hiện TTL vẫn là 600 giây.
4. Chỉ sau khi các test an toàn xanh mới truyền `included_sheets={activeSheet}` cho file FODS trên 20 MiB.
5. Chạy đúng một full gate, audit legacy, rồi probe `lan14` 3 lần + save + first switch khi RAM trống trên 6 GB; điền số thật.

## Rủi ro / rollback

- API deferred hiện dựng payload bằng cách đọc lại toàn FODS, nên chưa tối ưu hotspot Python và chưa chứng minh chuyển sheet dưới 2 giây.
- Không có core patch, dependency hay thay build system.
- Rollback: không truyền `included_sheets`; đường Pha 1/FODS legacy giữ nguyên.
- Template `/09-templates/AGENT-HANDOFF.md` được AGENTS.md nhắc tới nhưng không tồn tại trong worktree; tài liệu này giữ cấu trúc handoff hiện hành của task.
