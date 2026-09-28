# TASK BRIEF — Sheet: tốc độ tính lại khi sửa ô trên bảng nhiều VLOOKUP (agy, CODE — đo trước, sửa sau)

Worktree: `E:\VNOffice-agy-vlookup-perf` (nhánh `perf/sheet-vlookup-recalc-agy`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước mọi lần chạy app/soffice.

## Vì sao
Quét 672 tài liệu thật trên LAN: VLOOKUP chiếm **91%** mọi công thức (302.904 lượt). `file test\lan\lan14.xlsx` (gitignored, KHÔNG commit) có 67.144 VLOOKUP / 68.125 công thức; lan06 963; lan28 142. `apps/sheet/sheet-grid.js` `_recalculateAllFormulas` tính lại MỌI công thức của MỌI sheet sau mỗi lần sửa ô (setCellValue, dán, autofill…), và `apps/sheet/formula-engine.js` VLOOKUP quét vùng tra cứu mỗi lần gọi → nghi O(số công thức × số dòng vùng).

(Lưu ý: tăng tốc MỞ tệp lớn là việc khác, đang chờ người phụ trách duyệt `docs/PLAN-SHEET-OPEN-PERF.md` — KHÔNG làm phần mở tệp ở đây.)

## Việc
1. **Đo trước, commit sớm** `docs/HANDOFF-SHEET-VLOOKUP-RECALC-FINDINGS.md`: trong app thật (hoặc harness Node dùng `SheetAdapter.parseFods` + grid/engine thật trên FODS của lan14/lan06/lan28 — lấy FODS bằng `python scripts\layout-audit\_time_sheet_open_stages.py <xlsx> <out.fods>`), đo thời gian 1 lần sửa ô (giá trị) + tính lại, và thời gian `recalculateAll`. Profile xem thời gian nằm ở đâu (tách chuỗi công thức, expandRange, quét VLOOKUP, ghi DOM…).
2. **Tối ưu có kiểm soát**, ví dụ: cache chỉ mục vùng tra cứu VLOOKUP (khóa = sheet + vùng + phiên bản dữ liệu, xóa cache khi ô trong vùng đổi), cache kết quả expandRange/parse công thức, chỉ ghi DOM cho ô đang hiển thị. Tính lại theo phụ thuộc (chỉ ô bị ảnh hưởng) là thay đổi lớn — chỉ làm nếu đo chứng minh cần và có test phụ thuộc đầy đủ; nếu không, ghi đề xuất vào handoff.
3. **Kết quả phải giống hệt từng ô:** trước khi sửa, lưu snapshot giá trị mọi ô công thức của lan14/lan06/lan28 sau `recalculateAll`; sau tối ưu so từng ô — lệch 0. Unit test cho VLOOKUP khớp chính xác/gần đúng (TRUE/FALSE, cột ngoài vùng, #N/A, số/chuỗi, chữ hoa/thường, vùng ở sheet khác) + test cache bị xóa đúng khi dữ liệu vùng đổi.
4. Chế độ Tính thủ công (Manual) phải giữ nguyên hành vi (không tự tính lại).

## Kiểm chứng
Số đo trước/sau (ít nhất 2 lượt mỗi phép đo). `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground (4 test soffice có thể FAIL do máy chậm khởi động soffice — ghi BLOCKED, KHÔNG sửa test/timeout). `python scripts\layout-audit\_batch_audit.py <worktree> lanNN.xlsx` cho 26 file (bỏ lan06, lan14) — TỔNG lệch 0 (chép `file test\lan` từ `E:\VN OFice` nếu thiếu; gitignored).

## Luật cứng
Không đụng Writer, `main.py`, `ooxml_zip_patch.py`, đường mở/lưu tệp. Không commit tài liệu thật/FODS sinh ra. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. KHÔNG tăng timeout test. Commit sau mỗi bước, tiền tố `perf(sheet): …`. Không merge vào `main`. Handoff `docs/HANDOFF-SHEET-VLOOKUP-RECALC.md` theo mẫu, PASS/FAIL/NOT RUN/BLOCKED trung thực.