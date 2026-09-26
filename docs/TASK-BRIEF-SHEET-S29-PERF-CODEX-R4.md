# TASK BRIEF — Sheet S29 hiệu năng, vòng 4 (Codex): tối ưu `parseFods` JS (102,4 giây trên lan14)

Worktree: `E:\VNOffice-codex-sheet-s29c` (nhánh `perf/sheet-s29-codex-r4`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge. Đọc trước `docs/HANDOFF-SHEET-S29-PERF-ROUND3.md` (vòng 3, phát hiện quan trọng: nút nghẽn chính khi mở lan14 KHÔNG phải Python mà là `SheetAdapter.parseFods` phía JS: **102,4 giây đo bằng hook thật trong app**, tổng thời gian mở thực tế ≈ Python 115-138s + JS 102s ≈ 220-240s).

## Vị trí bắt đầu
`adapters/libreoffice/sheet/sheet-adapter.js`, hàm `parseFods(xmlText)` bắt đầu dòng 4039. lan14: 33.641 hàng, tới ~48 cột/hàng ở sheet lớn nhất, ~1,4 triệu ô. Vài điểm nghi ngờ đáng profile trước (đọc code thật trước khi tin, đừng giả định):
- Dòng ~4051: `tableXml.replace(/<table:table.../gi, all => { tableBlocks.push(all); return all; })` rồi dòng ~4052 `tableBlocks.reduce((text, block) => text.replace(block, ""), tableXml)` — nếu `tableXml` rất dài, `String.prototype.replace` với chuỗi con dài trong `reduce` có thể là O(n²) (mỗi `.replace()` quét lại toàn bộ chuỗi ngày càng ít đi nhưng block cũng dài).
- Dòng ~4060: `DOMParser().parseFromString(tableXml, "text/xml")` trên TOÀN BỘ FODS — bản thân DOMParser của trình duyệt thường nhanh (mili giây/MB), nếu đây thật sự là phần chậm thì có gì bất thường (kích thước FODS lan14 sau tối ưu là bao nhiêu MB? Đo lại bằng `console.time`/`performance.now()` áp sát TỪNG bước con bên trong `parseFods`, không chỉ đầu-cuối).
- Các hàm `_parseNumberStyles`, `_parseRotationStyles`, `_parseCellVisualStyles`, `_parseTextStyles`, `_parseRowColStyles` (dòng 4043-4047) và phần duyệt `tables.forEach` per-cell phía dưới — có hàm nào dùng regex toàn cục lặp lại trên `tableXml` đầy đủ cho MỖI ô/MỖI hàng không (cùng loại lỗi O(n²) đã sửa bên Python: quét lại từ đầu chuỗi cho mỗi phần tử).

## Cách làm
1. Thêm timer tạm quanh từng bước con trong `parseFods` (dùng `performance.now()`, có thể tận dụng cờ `window.__vnoPerfDebug` đã có từ vòng 2 — xem `report_perf_metric` trong `main.py`, mở rộng danh sách tên hợp lệ nếu cần thêm điểm đo mới, đừng bỏ cờ mặc định tắt).
2. Mở lan14 thật trong app (`python main.py`, `VNO_PERF_DEBUG=1`), đọc log console để biết bước con nào chiếm phần lớn trong 102,4 giây.
3. Sửa đúng bước đó theo nguyên tắc đã dùng bên Python: thay quét lại toàn chuỗi cho mỗi phần tử bằng một lượt duyệt tuyến tính (regex `matchAll`/chỉ mục một lần, hoặc parse DOM một lần rồi duyệt cây thay vì regex lặp lại trên chuỗi).
4. Đo lại: mục tiêu giảm đáng kể (không nhất thiết đạt 0, nhưng phải đo được số cụ thể trước/sau, không suy đoán).

## Ràng buộc "không đổi kết quả" — quan trọng nhất
`parseFods` dựng model dữ liệu Sheet dùng cho toàn bộ app — SAI Ở ĐÂY hỏng cả ứng dụng, không chỉ chậm. Bắt buộc:
- Chạy `node tests/run-tests.js` (1834/1834 hiện tại) sau MỖI thay đổi nhỏ, không chỉ ở cuối.
- Viết test đơn vị mới so sánh kết quả `parseFods` (cấu trúc `workbook` trả về) TRƯỚC và SAU trên ít nhất 2-3 file FODS mẫu có đủ tính năng (merge cell, named range, print area, conditional format, pivot nếu có) — so sánh bằng `JSON.stringify` hoặc deep-equal, không chỉ "trông giống".
- Mở lan05/lan11/lan12 (nhỏ) trong app thật sau khi sửa, xác nhận hiển thị đúng (không chỉ đo thời gian mà quên kiểm tra đúng).

## Công cụ
`$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước khi chạy app/soffice/python.
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground).
**Lưu ý**: agent khác có thể chạy soffice/Excel COM song song — vài test soffice-dependent có thể flake ngẫu nhiên, chạy lại một lần trước khi kết luận hồi quy thật.

## Luật cứng
Không commit/copy tài liệu thật. Không chạy `_excel_open_test.ps1`/`_batch_audit.py`. Không đụng code Writer/UI ribbon. Không đổi kết quả các quy tắc S8–S32 hay cấu trúc dữ liệu `workbook` mà UI phụ thuộc (chỉ tối ưu tốc độ, không đổi hành vi). Commit tiền tố `perf(sheet): S29d …`. Không rebase/force.

## Bàn giao
`docs/HANDOFF-SHEET-S29-PERF-ROUND4.md`: bảng thời gian từng bước con của `parseFods` trước/sau, bằng chứng kết quả parse không đổi (test so sánh), số đo lan14 tổng thể (Python + JS) trước/sau, việc còn lại.
