# TASK BRIEF — Writer R25 (Grok): giả thuyết hẹp hơn cho d09 wrap (W56 chỉ nên bỏ qua đoạn có `w:numPr`)

Worktree: `E:\VNOffice-grok-writer-r25` (nhánh `fix/writer-r25-grok`, tách từ `main` @ 5cb4b49). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập bằng Word 2016 COM rồi merge. Chỉ ghi số đã đo thật.
**Đọc kỹ `docs/HANDOFF-WRITER-R24.md` trước khi bắt đầu** — R24 đã thử 4 giả thuyết và loại bỏ cả 4 vì mỗi cái đều làm tăng canvas hoặc `page` ở file khác. ĐỪNG thử lại nguyên xi 4 hướng đó — brief này đề xuất một giả thuyết HẸP HƠN, chưa được thử, dựa trực tiếp trên dữ liệu R24 đã đo.

## Giả thuyết cụ thể cần kiểm chứng
R24 thí nghiệm #3 ("Không áp advance GDI lên đoạn có margin-left / text-indent / `<li>`") sửa đúng 2 việc cùng lúc: bỏ advance cho d09 (đoạn có `numId 4 / ilvl 0`, bullet «-», `w:hanging`) VÀ d15 VÀ vô tình cũng bỏ advance cho d16 (3 đoạn TNR 13pt PHẲNG — không danh sách, không thụt lề — mà W56 đã sửa đúng ở R23). Kết quả: d09 tốt lên nhưng d16 hồi quy (wrap 0→3, page 0→3).

**Giả thuyết R25**: điều kiện loại trừ của R24 (`margin-left / text-indent`) quá RỘNG — nó bắt luôn d16 dù d16 không có `w:numPr`/danh sách. Điều kiện đúng có thể hẹp hơn: chỉ bỏ advance GDI cho đoạn có **`w:numPr`** (đoạn thuộc danh sách đánh số/bullet thật — numId + ilvl), giữ nguyên advance cho đoạn chỉ có `w:ind` (thụt lề) nhưng không phải danh sách. Kiểm tra bằng Word COM trên đúng 5 đoạn: d09 «Tháng 02/2022…» (numId 4), d09 «Hình thức offline…» (kiểm tra có `w:numPr` không — nếu KHÔNG có, giả thuyết này không áp dụng được cho đoạn đó, ghi nhận rõ), d15 (2 đoạn), d16 (3 đoạn TNR 13pt — xác nhận các đoạn này KHÔNG có `w:numPr`).

## Cách làm
1. Trước khi sửa code: dùng script kiểm tra XML (`python -c` hoặc scratch script) đọc trực tiếp `word/document.xml` của d09/d15/d16, xác nhận đoạn nào có `<w:numPr>` — đây là bước rẻ nhất để biết giả thuyết có khả thi trước khi đổi code.
2. Nếu xác nhận đúng (d09/d15 có numPr, d16 không), sửa điều kiện loại trừ trong `_applyGdiDeviceFontPixels`/`_applyCharacterScale` (W56, `adapters/libreoffice/writer/writer-adapter.js`) từ "có margin-left/text-indent" thành "có `data-vno-num-id` / thuộc `<li>` trong danh sách đánh số" (kiểm tra thuộc tính nào code hiện dùng để đánh dấu đoạn danh sách — xem W33 `_ooxmlListParagraphs`/`_applyOoxmlListBullets` để tái dùng đúng cờ đã có, không tự đặt cờ mới).
3. Nếu xác nhận SAI (numPr không phân biệt được d09 khỏi d16), dừng lại, ghi rõ vào handoff, đừng cố ép — giữ nguyên như R24 (không sửa còn hơn sửa sai).
4. Sau khi sửa: đo lại TOÀN BỘ 23 file, xác nhận không file nào tăng canvas so với ma trận `_writer_out_r23_final` (đính kèm trong repo, xem R23/R24 handoff).

## Công cụ (từ gốc worktree; `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước khi chạy app/soffice/python)
```
$out = "E:\VNOffice-opencode-lan-audit\_writer_out_r25_<tag>"; New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item "E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl" $out -Force
python scripts/layout-audit/_writer_layout_audit.py . "file test\landocx" $out
```
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground).
**Lưu ý**: các agent khác đang chạy soffice/Excel COM song song trong worktree khác có thể làm vài test soffice-dependent flake ngẫu nhiên (ví dụ "Sheet FODS save qua soffice") — nếu gặp fail lạ không liên quan thay đổi của mình, chạy lại `node tests/run-tests.js` một lần với `$env:LOCALAPPDATA` riêng (đã đặt ở trên) trước khi kết luận là hồi quy thật.

## Luật cứng
- **TUYỆT ĐỐI KHÔNG** làm tăng canvas ở bất kỳ file nào trong 22 file hiện đã khớp Word.
- Nếu giả thuyết không xác nhận được hoặc không sửa được an toàn, viết handoff nêu rõ lý do và KHÔNG ép merge một sửa đổi rủi ro — một handoff phủ định chính xác vẫn là kết quả có giá trị (như R24).
- Không commit/copy tài liệu thật; docs chỉ mã dNN. Không đổi định nghĩa lớp lỗi của bộ đo. Không đụng code Sheet.
- Không chạy `_excel_open_test.ps1`/`_batch_audit.py`. Commit `fix(writer): W57 …` (nếu có sửa) kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-R25.md`: kết quả kiểm tra `w:numPr` trên 5 đoạn, có sửa hay không và vì sao, bảng số trước/sau nếu có sửa (kèm ma trận 23 file đầy đủ), việc còn lại.
