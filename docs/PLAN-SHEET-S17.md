# PLAN — FIX-SHEET-S17

## Objective
Khắc phục ba mất mát khi lưu XLSX được ghi nhận ở FIX-S16: hộp văn bản của Sheet không thành drawing shape, chế độ tính toán thủ công không vào `xl/workbook.xml`, và trạng thái “Đã xử lý” của nhận xét không được bảo toàn. Giữ UI qua command/service hiện có và sửa tại adapter/postprocess XLSX; không sửa LibreOffice Core.

## Current capability
- `SheetGridController` đang giữ `textBoxesBySheet`, `calculationMode` (automatic/manual), và `commentsBySheet[...].resolved`.
- `SheetAdapter` xuất FODS từ mô hình; lưu XLSX desktop gọi `postprocess_sheet_xlsx()` trong `adapters/libreoffice/common/ooxml_zip_patch.py` qua `main.py`.
- Hộp văn bản hiện chỉ render trong UI, chưa thấy serializer xuất ra FODS/XLSX. Python postprocess đã là nơi tích hợp được dùng cho các sửa OOXML khác.
- Ghi chú hiện tại là legacy comments; mô hình Sheet chỉ có một nội dung comment theo ô, không có tác giả/replies/person/conversation ID cần cho threaded comments. Vì vậy sẽ giữ legacy comment và trạng thái resolve bằng metadata mở rộng riêng an toàn, có đọc/ghi round-trip nếu khả thi; tài liệu sẽ nói rõ Excel không hiển thị trạng thái resolve này. Không tạo threaded comments giả.
- Help Sheet đã có catalog trong `platform/help/entries-sheet.js`; ribbon có tab Trợ giúp và F1. Sẽ bổ sung hướng dẫn cụ thể cho các hành vi và giới hạn phù hợp.

## Files/modules
Dự kiến giới hạn thay đổi vào:
- `adapters/libreoffice/common/ooxml_zip_patch.py`: postprocess XLSX cho `calcPr`, DrawingML text box và metadata resolve tương thích.
- `adapters/libreoffice/sheet/sheet-adapter.js` và/hoặc `apps/sheet/sheet-grid.js`: đưa trạng thái cần thiết vào nguồn FODS chỉ khi postprocess không thể suy ra từ FODS hiện tại; duy trì round-trip model.
- `platform/help/entries-sheet.js`: hướng dẫn tiếng Việt theo ribbon/command thực tế và giới hạn legacy comment.
- `scripts/audit-0610/gen_sheet_button_matrix.py` cùng `docs/SHEET-BUTTON-MATRIX-1011.md`: cập nhật bằng generator sau kiểm chứng.
- Unit tests liên quan dưới `tests/` cho helper OOXML, giữ nguyên test/fixture hiện hữu; không sửa expected output chỉ để xanh.
- `docs/AGENT-HANDOFF-FIX-S17.md`: kết quả chuẩn theo cấu trúc handoff hiện hữu trong `docs/` (repo này không có `09-templates/AGENT-HANDOFF.md`).

Sẽ rà ownership trước khi sửa: adapter/postprocess thuộc `adapters/**`; help và grid thuộc Sheet/Platform theo file; nếu phát sinh xung đột ownership nghiêm trọng sẽ dừng tại đó.

## Dependency and approach
Không thêm dependency. Ưu tiên serialization chuẩn OOXML trong postprocess Python hiện có. Hộp văn bản cần package drawing relationship/content type và tọa độ/kích thước từ mô hình; xác định payload FODS chính xác trước khi chọn điểm nối. Chế độ tính toán chỉ patch `calcPr` khi nguồn thể hiện rõ automatic/manual, giữ nguyên các thuộc tính tính toán khác và file không bật tùy chọn. Với resolved comments, chỉ round-trip trạng thái mở rộng riêng; legacy comment vẫn được lưu như trước, không tuyên bố Excel COM nhận diện trạng thái resolve.

## Risks
- DrawingML có nhiều phần liên kết (worksheet drawing rel, drawing part, content type); thiếu/malformed relationship có thể làm Excel repair workbook. Dùng package-level tests và kiểm tra mở/đọc bằng Excel COM ReadOnly.
- Không được suy diễn mode calculation cho các XLSX không chọn tính năng; tránh đổi chính sách tái tính và cache công thức.
- Extension trạng thái resolve phải bỏ qua được bởi ứng dụng khác, không làm hỏng legacy notes; không làm mất trạng thái khi mở/sửa/lưu lại trong Sheet.
- Kích thước/vị trí hình cần chuyển đúng từ đơn vị UI sang EMU/anchor; kiểm tra round-trip trong app.

## Test plan
- Thêm/chạy unit tests tập trung cho `calcPr` automatic/manual và preservation attributes, text box package/anchor/text round-trip, resolve extension; bao gồm XLSX không có các tùy chọn để chứng minh không đổi.
- Chạy `npm test`, `python -m unittest discover -s tests`, UTF-8/BOM scan và `git diff --check` theo phiếu.
- Lưu ba XLSX độc lập qua desktop CDP với `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs17`, `VNO_AUDIT_MARK_DIRTY=1`, `VNO_APP_ROOT` trỏ worktree; thao tác chuột/phím CDP thật, không SendKeys/OS input. Excel COM chỉ mở ReadOnly, mỗi lần một file: kiểm tra Shapes.Count/Type/TextFrame2/text; `Application.Calculation=-4135` cho manual; kiểm tra legacy comment và extension resolve. Kiểm tra thêm lan01,02,04,06,09,11,22,26 dưới `VNO_AUDIT_MARK_DIRTY=1` và `VNO_APP_ROOT`.
- Chạy generator `scripts/audit-0610/gen_sheet_button_matrix.py` sau khi readback đã xác định status, rồi rà mã hóa.

## Rollback
Mỗi milestone được commit ngay. Khi nào một patch làm workbook invalid hoặc ảnh hưởng file không dùng tính năng, hoàn nguyên đúng commit/milestone đó; giữ lại test/tài liệu điều tra cần thiết. Không dùng destructive Git trên thay đổi không thuộc task.

## Milestones
1. Commit PLAN trước code.
2. Implement/test OOXML fixes và serialization/restore cần thiết; commit ngay sau từng bước hoàn chỉnh.
3. Hướng dẫn Sheet, ma trận được generate sau kiểm chứng, handoff S17; commit từng bước.
4. Chạy đầy đủ xác minh phiếu và báo cáo từng kết quả PASS/FAIL/NOT RUN/BLOCKED; hoàn tất sau handoff.