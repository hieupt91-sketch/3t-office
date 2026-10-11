# Brief V11 — Bộ đo chiều "TẠO MỚI trong VN Writer → lưu DOCX → mở Word 2016" (opencode)

Mẫu đã có cho Sheet: `scripts/layout-audit/_create_new_sheet.py` (điều khiển app thật qua `window.__vnoAppInstance`,
lưu qua `common.file.save` với hộp thoại native bị thay) + `scripts/layout-audit/_excel_readback.ps1` (Excel COM đọc
lại và so với `<out>.expected.json`) → `CHECKS=40 DIFFS=0`. Làm y hệt cho Writer.

## Việc

1. `scripts/layout-audit/_create_new_writer.py <worktree> <out.docx>`: mở app Writer KHÔNG có file; qua
   `window.__vnoAppInstance` (xem `apps/writer/writer-app.js`, editor/command bus: `writer.*` trong
   `platform/commands/command-definitions.js`) dựng tài liệu có: tiêu đề 16 pt đậm căn giữa Times New Roman; đoạn
   thường 13 pt giãn dòng 1,5; đoạn nghiêng/gạch chân/màu đỏ; đoạn thụt lề đầu dòng 1,27 cm; danh sách gạch đầu dòng 3
   mục; danh sách số 3 mục; bảng 3×3 có viền và ô gộp; ảnh PNG nhỏ chèn inline; ngắt trang rồi một đoạn trang 2;
   header "VN Office" và footer số trang; lề trang 2/2/3/2 cm, khổ A4. Lưu `out.docx`, ghi `<out>.expected.json`.
2. `scripts/layout-audit/_word_readback.ps1 -File out.docx`: Word 2016 COM đọc lại từng mục: đoạn (Range.Text,
   Font.Name/Size/Bold/Italic/Underline/Color, ParagraphFormat.Alignment/LineSpacing/LineSpacingRule/
   FirstLineIndent/LeftIndent/SpaceAfter), danh sách (`Range.ListFormat.ListType`), bảng (Tables(1).Rows/Columns
   .Count, Cell(1,1).Range.Text, viền, MergeCells), ảnh (InlineShapes.Count), số trang (`_word_oracle3.ps1` — PDF),
   header/footer (Sections(1).Headers/Footers(1).Range.Text), PageSetup (TopMargin… PageWidth/Height). In từng lệch
   `key.prop: expected […] Word […]`, cuối cùng `CHECKS=n DIFFS=m`.
3. Chạy hai bước trên (Word COM + profile soffice Writer; chạy tuần tự), dán kết quả thật vào
   `docs/HANDOFF-WRITER-CREATE-NEW-HARNESS.md`: bảng CHECKS/DIFFS và từng lệch (đây là SỐ ĐO, chưa cần sửa app —
   KHÔNG sửa `adapters/`, `apps/`). Nếu một lệnh app không tồn tại, ghi rõ trong handoff thay vì bỏ qua.

## Nghiệm thu

- Hai script chạy lặp lại được từ dòng lệnh; `node scripts/check-syntax.js` PASS; không commit `file test`/docx sinh ra.
- Handoff có số thật (CHECKS ≥ 30). Commit `git commit -F` tiếng Việt không dấu.
