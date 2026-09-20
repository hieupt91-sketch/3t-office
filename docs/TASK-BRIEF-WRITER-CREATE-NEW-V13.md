# Brief V13 (opencode) — Kịch bản 3 bộ đo "tạo mới trong VN Writer → DOCX → Word 2016 đọc lại": bảng/ảnh/chú thích/mục lục/cột. CHỈ ĐO + LIỆT KÊ LỆCH

Kịch bản 1 (36/0) và 2 (39/0) đã sạch (`docs/HANDOFF-WRITER-CREATE-NEW-HARNESS.md`, `-V12.md`;
`scripts/layout-audit/_create_new_writer.py --scenario 2`, `_word_readback.ps1`). Kịch bản 3 phủ phần người dùng văn
phòng dùng khi soạn hợp đồng/báo cáo: bảng phức tạp, ảnh có bọc chữ, chú thích cuối trang, mục lục, cột báo, kiểu
heading, số trang "Trang X / Y", ảnh trong header.

Worktree `E:\VNOffice-opencode-writer-v13` (branch `tools/writer-create-new-v13`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.

## Kịch bản 3 (`SCENARIO3`, `--scenario 3`, `_new3.docx` + `.expected.json`, mở rộng `_word_readback.ps1`, KHÔNG đổi kiểm tra 1–2)

Dùng command bus / API adapter thật như kịch bản 1–2 (xem cách 2 kịch bản trước gọi lệnh); mục nào app không có lệnh →
ghi "không có lệnh" trong handoff và bỏ qua (không bịa).

| # | Người dùng tạo | Word đọc lại (COM) |
|---|---|---|
| 1 | Bảng 4×4: gộp ô ngang hàng 1 (A1:D1) VÀ gộp dọc cột A hàng 2–4; viền ngoài đôi, viền trong đơn; hàng 1 nền `#BDD7EE`, chữ đậm; căn giữa dọc | `Tables(1).Rows.Count/Columns.Count`, `Cell(1,1).Range.Text` gộp, `Borders(wdBorderTop).LineStyle` = double (7), `Borders(wdBorderHorizontal)` = single, `Cell(1,1).Shading.BackgroundPatternColor`, `Cell(2,1).VerticalAlignment` |
| 2 | Bề rộng cột 2 = 4cm, chiều cao hàng 3 = 1,2cm (exactly) | `Columns(2).Width` ≈ 113,4pt, `Rows(3).Height` ≈ 34pt, `HeightRule` |
| 3 | Ảnh inline 4×3cm rồi ảnh thứ hai bọc chữ vuông (square) căn phải | `InlineShapes.Count` = 1 (kích thước), `Shapes.Count` = 1, `Shapes(1).WrapFormat.Type` = wdWrapSquare (0), `.RelativeHorizontalPosition`/`Left` |
| 4 | Chú thích cuối trang (footnote) ở đoạn 2 | `Footnotes.Count` = 1, `Footnotes(1).Range.Text` |
| 5 | Heading 1 / Heading 2 qua ribbon (style), rồi Mục lục tự động ở đầu | `Paragraphs(n).Style` = "Heading 1"/"Heading 2"; `TablesOfContents.Count` = 1, `TablesOfContents(1).Range.Paragraphs.Count` ≥ 2 |
| 6 | Mục 2 chia 2 cột (columns) | `Sections(2).PageSetup.TextColumns.Count` = 2 |
| 7 | Footer "Trang X / Y" (PAGE + NUMPAGES) | `Footers(1).Range.Fields.Count` = 2, field codes chứa PAGE và NUMPAGES |
| 8 | Ảnh (logo) trong header, căn trái | `Headers(1).Range.InlineShapes.Count` = 1 |
| 9 | Đoạn có border dưới + nền xám (paragraph shading) | `Paragraphs(n).Borders(wdBorderBottom).LineStyle`, `.Shading.BackgroundPatternColor` |
| 10 | Chữ có màu nền (shading) khác highlight: `#FFE699` | `Range.Shading.BackgroundPatternColor` |
| 11 | Ngắt dòng mềm (Shift+Enter) trong 1 đoạn | `Paragraphs(n).Range.Text` chứa `\v` (chr 11), `ComputeStatistics(wdStatisticLines)` = 2 |
| 12 | Ký tự đặc biệt: `→`, `©`, `₫`, tab ở đầu dòng, khoảng trắng không ngắt | `Range.Text` khớp, NBSP (chr 160) còn |
| 13 | Danh sách bullet lồng 3 cấp với ký hiệu khác nhau (•, o, ▪) | `ListFormat.ListString` từng cấp, `ListLevelNumber` |
| 14 | Bookmark + tham chiếu chéo (nếu có lệnh) | `Bookmarks.Count`, `Fields` REF |
| 15 | Bảo vệ tài liệu chỉ đọc / mật khẩu mở (nếu có lệnh) | `ProtectionType`, mở với password |
| 16 | Thuộc tính tài liệu: tiêu đề, tác giả (File → Info nếu có) | `BuiltInDocumentProperties("Title"/"Author")` |

## Bước 2

Chạy → `CHECKS=N DIFFS=M` dán nguyên văn vào `docs/HANDOFF-WRITER-CREATE-NEW-V13.md`; mỗi lệch: expected / Word đọc /
tầng rơi (giải nén DOCX xem `document.xml`/`footnotes.xml`/`header1.xml`; HTML gửi LibreOffice qua
`app.adapter._contentForExport()`) → gom lớp cho agy sửa (W28a…). KHÔNG sửa code sản phẩm. Kịch bản 1–2 vẫn 36/0,
39/0. Không bịa số, không commit `file test`/`_new*.docx`, không tên tài liệu thật. Commit harness + handoff
(`git commit -F`, tiếng Việt không dấu).
