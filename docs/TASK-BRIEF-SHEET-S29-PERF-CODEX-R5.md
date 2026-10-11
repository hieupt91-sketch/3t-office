# TASK BRIEF — Sheet S29 hiệu năng, vòng 5 (Codex): tối ưu "Build workbook model" (~35-49s trên lan14)

Worktree: `E:\VNOffice-codex-sheet-s29d` (nhánh `perf/sheet-s29-codex-r5`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge. **Đọc kỹ `docs/HANDOFF-SHEET-S29-PERF-ROUND4.md` trước khi bắt đầu** — vòng 4 đã đo chính xác bằng hook thật trong app và kết luận trung thực: hai chi phí lớn nhất của `parseFods` trên lan14 là **DOM parse** (trình duyệt, ~37-45s, khó can thiệp vì là code gốc của Chromium) và **"Build workbook model"** (~35-49s — code CỦA CHÚNG TA, đáng để tối ưu tiếp). Đừng thử lại việc đo DOM parse hay tin vào một lần đo duy nhất — vòng 4 đã chỉ rõ nhiễu đo (run-to-run variance) đủ lớn để làm sai lệch kết luận nếu chỉ đo 1 lần.

## Vị trí bắt đầu
`adapters/libreoffice/sheet/sheet-adapter.js`, `parseFods()` — đoạn `tables.forEach((table, tableIndex) => { ... })` (dòng ~4080 trở đi, sau `DOM parse`) là nơi "Build workbook model" diễn ra: với lan14 (33.641 hàng × tới ~48 cột = ~1,4 triệu ô), vòng lặp per-cell bên trong đây chạy hàng triệu lần. Đây LÀ code của mình, không phải trình duyệt — có khả năng tối ưu thật.

## Cách làm
1. **Đo nhiều lần trước khi kết luận bất cứ điều gì**: mở lan14 trong app thật (`VNO_PERF_DEBUG=1`) ÍT NHẤT 3 lần liên tiếp, ghi lại `parseFods:build workbook model` (hoặc tên hook tương đương vòng 4 đã thêm) mỗi lần — lấy khoảng giá trị, không phải một số duy nhất. Đây là baseline thật, không phải baseline suy luận từ vòng 4 (máy/tải hệ thống có thể khác).
2. Dùng `console.time`/`performance.now()` chia nhỏ tiếp bên trong vòng lặp per-cell (nếu vòng 4 chưa chia tới mức đó) để tìm chính xác việc gì tốn nhất: parse thuộc tính từng ô qua DOM API (`getAttribute`, `getElementsByTagNameNS`) lặp lại, tạo object mới cho mỗi ô, gọi hàm regex/parse lặp lại cho mỗi ô khi có thể tính một lần cho cả bảng, v.v.
3. Sửa CHỈ MỘT chỗ tại một thời điểm theo nguyên tắc: tính trước những gì không đổi theo từng ô (ngoài vòng lặp), tránh tạo object/array không cần thiết, dùng API DOM rẻ hơn nếu có (`childNodes`/`children` thay vì `querySelectorAll` lặp lại, `dataset` thay vì `getAttribute` nhiều lần cho cùng phần tử).
4. Đo lại (nhiều lần, như bước 1) sau MỖI thay đổi nhỏ — không gộp nhiều thay đổi rồi đo một lần (sẽ không biết thay đổi nào thật sự có tác dụng).

## Ràng buộc "không đổi kết quả" — quan trọng nhất
Làm đúng như vòng 4 đã làm tốt: so sánh `workbook` object đầu ra (deep serialization kể cả Map/Set) giữa code cũ và code mới trên các FODS mẫu đã có (`sample-sheet.fods`, `sample-sheet-validation.fods`, `sample-sheet-pivot.fods`, `sample-sheet-formulas.fods` — xem `tests/unit/real-office-import-fidelity.test.js` vòng 4 đã thêm, tái dùng khuôn mẫu đó). Bắt buộc bằng SHA-256 hoặc deep-equal, không suy đoán "chắc vẫn đúng".

## Công cụ
`$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước khi chạy app/soffice/python.
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground).
**Lưu ý**: agent khác (agy) đang chạy song song ở worktree khác — vài test soffice-dependent có thể flake ngẫu nhiên, chạy lại một lần trước khi kết luận hồi quy thật.

## Luật cứng
Không commit/copy tài liệu thật. Không chạy `_excel_open_test.ps1`/`_batch_audit.py`. Không đụng code Writer/UI ribbon (`apps/writer/*`, `platform/ribbon/*`, `platform/shell/*`, `platform/help/*`, `platform/commands/*`, `platform/i18n/*`, `platform/ui-kit/*`) — agent khác đang sửa UI cùng lúc. Không đổi kết quả các quy tắc S8–S32. Commit tiền tố `perf(sheet): S29e …` kèm số đo trước/sau (khoảng giá trị nhiều lần đo, không phải một số). Không rebase/force.

## Bàn giao
`docs/HANDOFF-SHEET-S29-PERF-ROUND5.md`: số đo nhiều lần trước/sau cho "Build workbook model" (và tổng `parseFods` nếu đổi), bằng chứng đầu ra không đổi, kết luận trung thực (nếu không có cải thiện đáng kể do nhiễu đo lớn hơn tác dụng của sửa đổi, NÓI RÕ như vòng 4 đã làm — đừng ép kết luận tích cực), việc còn lại.
