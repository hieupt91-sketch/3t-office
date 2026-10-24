# LIBRARY-CHANGELOG — thay đổi OOXMLKit (chỉ thêm cuối tệp)

- 2026-10-24 Windows: XLSX API P0/P1 (d1eaf5bd..7e69d196), sửa 13/15 lỗi rà soát (8645ae05), lệnh lưu delta xlsx.save/docx.save/pptx.save (W3c/W4a/W4b), ooxml-engine stdio. swift test 137/137 (Linux).
- 2026-10-24 Mac/iOS-coord: chạy khung parity G0 với **ooxml-engine THẬT** (Swift 6.0.3/Linux, build release) trên 28 mục corpus — round-trip lossless (lưu không sửa) **28/28**, Open→Edit→Save→Reopen **24/28** (DOCX 10/10, XLSX 9/9, PPTX 2/6). Sửa harness khớp expect_changed (so chuỗi chính xác cho `[Content_Types].xml` + thêm phần OPC khi tạo part mới). 4 phát hiện PPTX (setNotes cần notesMaster; validator chặn lưu do lỗi nguồn; setNotes không read-back) → REPORT-G0 + INBOX-WIN #4. Nhánh `claude/ooxml-g0-corpus-parity`.
