# Agent Handoff — Writer Table Properties completion

TASK: BRIEF-CODEX-TABLES — hoàn thiện hộp thoại Thuộc tính bảng và xác minh các lệnh bảng trong Writer
AGENT/ROLE: Codex / Writer
BRANCH: feat/writer-tables2-codex
WORKTREE: E:\VNOffice-codex-tables
OBJECTIVE: Bổ sung các phần còn thiếu so với brief vào hộp thoại Thuộc tính bảng: đơn vị cm, tab Cột, căn dọc ô, lề theo bảng/ô, và ghi thuộc tính DOCX; xác minh tách bảng/hướng chữ/lưu mở.

FINDINGS: Nhánh ban đầu trùng HEAD với main và đã có implementation nền cho Tách bảng, Hướng chữ, Thuộc tính bảng. Hộp thoại cũ chỉ có ba tab, dùng pt, không có tab Cột/căn dọc/lề riêng ô. Độ rộng cột cần đồng bộ cả w:gridCol, w:tcW và w:tblW để Word không co giãn sai. Sau Undo, selection cũ có thể trỏ tới ô đã bị tháo khỏi DOM; adapter nay lọc ô theo bảng hiện tại và quay về ô đang hoạt động.

IMPLEMENTATION SUMMARY:
- Hộp thoại Thuộc tính bảng nay có bốn tab Bảng/Hàng/Cột/Ô. Thụt lề, độ rộng ưu tiên cm/%, chiều cao hàng, độ rộng cột, lề bốn cạnh hiển thị theo cm; căn dọc gồm Trên/Giữa/Dưới.
- Hỗ trợ áp dụng lề cho toàn bảng (`w:tblCellMar`) hoặc ô đang chọn (`w:tcMar`); căn dọc lưu `w:vAlign`; độ rộng cột lưu `w:gridCol`/`w:tcW`, bảng tự đồng bộ `w:tblW` khi không đặt độ rộng ưu tiên; chiều cao tối thiểu lưu `w:trHeight` với `hRule=atLeast`.
- Khi mở lại hộp thoại, đọc đơn vị CSS/giá trị lề hiện có từ bảng và ô. Bổ sung bản dịch VI/EN, cập nhật bài Help cụ thể và checklist Word.
- Bổ sung desktop CDP dùng click/keyboard, lưu DOCX qua luồng Python và Word COM ẩn; Word COM đọc `Tables.Count`, số hàng, Orientation, căn dọc, padding, indent và độ rộng cột. Kiểu/giá trị preferred width kiểm tra qua Word COM type cùng OOXML trong gói DOCX.

FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`; `adapters/libreoffice/writer/writer-adapter.js`; `apps/writer/writer-table-properties-dialog.js`; `platform/help/entries-writer.js`; `platform/i18n/strings-en.js`; `platform/i18n/strings-vi.js`; `tests/test_writer_table_edit_persistence.py`; `tests/unit/writer-tabs-tables-agy.test.js`; `tests/live/cdp/writer-table-properties.desktop.mjs`; `tests/live/cdp/writer-table-properties-word-readonly.ps1`; `docs/WORD2016-FEATURE-CHECKLIST.md`; handoff này.

COMMANDS RUN:
- `python -m pytest -q tests/test_writer_run_effects.py tests/test_writer_style_gallery_semantics.py tests/test_writer_table_edit_persistence.py`
- `node tests/run-tests.js`
- `node --experimental-websocket tests/live/cdp/writer-table-properties.desktop.mjs`
- `node scripts/audit-0610/i18n_parity.mjs`; `node scripts/help-coverage.mjs`
- `node --check` cho hai tệp JavaScript mới/sửa; `python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py`; `git diff --check`
- `node --experimental-websocket scripts/audit-0610/word_lan_edit_style_probe.mjs ... f0.docx f1.docx f3.docx f4.docx`; `powershell -NoProfile -File scripts/audit-0610/word_lan_style_compare.ps1 -Dir E:\VNOffice-profiles\codex-tables-lan-audit -Count 4`

BUILD RESULT: NOT RUN — không thay build/packaging.

TEST RESULTS: PASS — Python 60/60; Node suite 3692/3692; desktop CDP + Word COM 18/18; i18n VI/EN 2941/2941, missingVI=0/missingEN=0; Help coverage Writer 217/217, Sheet 211/211, Slides 154/154. Word COM: split tạo 2 bảng có 1/3 hàng; Ctrl+Z về 1 bảng; hướng chữ 90° Orientation=3; căn dọc giữa=1; lề trên/dưới=5.65pt, trái/phải=8.5pt; cột 2cm=56.7pt; hàng tối thiểu 0.8cm=22.7pt. Preferred width: Word COM xác nhận type percent/points; DOCX chứa 80%=`w:tblW 4000 pct`, 10cm=`w:tblW 5669 dxa`.

LAN REGRESSION: PASS — f0 49→49 đoạn/1→1 trang; f1 594→594/23→23; f3 65→64/3→3; f4 709→709/19→19. Đây là số đoạn/trang theo baseline brief. COM cũng báo styleDiff lần lượt 0, 1, 10, 8; các sai khác style không thuộc cổng đoạn/trang được giao.

KNOWN LIMITATIONS: Word COM `Table.PreferredWidth` trả sentinel 9999999 với các tệp kiểm tra này dù `PreferredWidthType` và `w:tblW` đúng; giá trị số được xác nhận trực tiếp trong OOXML DOCX. Không chạy build/đóng gói. Không sửa LibreOffice Core, không thêm dependency.

RISKS: Thay đổi OOXML tập trung vào bảng do UI đánh dấu chỉnh sửa; cơ chế restore thuộc tính bảng nguồn `_restore_writer_table_properties`/`_writer_parse_table_edits` giữ nguyên. Bốn tệp LAN vẫn giữ số đoạn/trang theo baseline sau dirty-save.

DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review commit trên branch feat/writer-tables2-codex; nếu cần xác nhận PreferredWidth dạng số qua COM, đối chiếu riêng API Word vì COM trả sentinel dù OOXML đúng.
