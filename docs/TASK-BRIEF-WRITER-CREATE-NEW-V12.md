# Brief V12 (agy) — Mở rộng bộ đo "TẠO MỚI trong VN Writer → lưu DOCX → Word 2016 đọc lại", tìm lệch, sửa theo lớp

Đọc trước, đủ và kỹ: `AGENTS.md` (quy trình agent), `docs/QUY-UOC-DOI-CHIEU.md` (mục Writer W1–W21, đặc biệt **W20a–g**),
`docs/HANDOFF-WRITER-CREATE-NEW-HARNESS.md`, `docs/HANDOFF-WRITER-CREATE-NEW-DEFECTS-W20.md`,
`scripts/layout-audit/_create_new_writer.py`, `scripts/layout-audit/_word_readback.ps1`.

Main hiện `bafc328`: kịch bản 1 (heading, giãn dòng 1.5, thụt lề, bullet/numbered, bảng gộp ô + viền, ảnh, ngắt mục,
header/footer + số trang, lề trang) đã đạt **CHECKS=36 DIFFS=0**. Đây là chiều thương mại quan trọng nhất: người dùng
soạn trong VN Writer, gửi DOCX, đối tác mở bằng Word phải thấy **y hệt**. Kịch bản 1 mới phủ ~1/3 định dạng người dùng
thường dùng. Việc của bạn: **kịch bản 2** phủ phần còn lại, đo bằng Word 2016 COM thật, rồi sửa từng lớp lệch.

## Bước 1 — Kịch bản 2 (thêm vào `_create_new_writer.py` như `SCENARIO2`, chạy bằng tham số `--scenario 2`, ghi `_new2.docx` + `_new2.docx.expected.json`)

Dùng đúng command bus / API adapter như kịch bản 1 (không chèn HTML thô nếu app có lệnh tương ứng). Mỗi mục là một
kiểm tra đọc lại bằng Word COM (mở rộng `_word_readback.ps1`, mỗi mục ghi rõ thuộc tính Word đọc ở đâu):

| # | Định dạng người dùng tạo | Word đọc lại (thuộc tính COM) |
|---|---|---|
| 1 | Đoạn canh đều (justify), đoạn canh phải | `ParagraphFormat.Alignment` = 3 / 2 |
| 2 | Khoảng cách đoạn trước 6pt / sau 12pt | `SpaceBefore` = 6, `SpaceAfter` = 12 |
| 3 | Giãn dòng "Exactly 18pt" và "At least 20pt" (nếu app có; nếu chưa có lệnh → ghi rõ "không có lệnh", bỏ qua) | `LineSpacingRule` 4 / 3, `LineSpacing` 18 / 20 |
| 4 | Thụt lề trái 2cm + treo (hanging) 1cm | `LeftIndent` = 56.7pt, `FirstLineIndent` = −28.35pt |
| 5 | Chữ **đậm + nghiêng + gạch chân** trong cùng một run; chữ gạch ngang (strikethrough); chỉ số trên `x²`; chỉ số dưới `H₂O`; highlight vàng | `Font.Bold/Italic/Underline/StrikeThrough/Superscript/Subscript`, `Range.HighlightColorIndex` = 7 (wdYellow) |
| 6 | Font khác nhau trong 1 đoạn: Arial 11pt + Times New Roman 14pt + màu xanh `#0070C0` | `Font.Name`, `Font.Size`, `Font.Color` từng run |
| 7 | Liên kết `https://example.com` với chữ "Trang chủ" | `Hyperlinks.Count` = 1, `.Address`, `.TextToDisplay` |
| 8 | Danh sách đánh số **bắt đầu lại từ 1** sau một đoạn thường (2 danh sách số riêng) | `ListFormat.ListString` của mục đầu danh sách 2 = "1." |
| 9 | Danh sách 2 cấp (mục con thụt vào) | `ListFormat.ListLevelNumber` = 2 ở mục con |
| 10 | Bảng 3×3: ô nền xám `#D9D9D9`, chữ ô tiêu đề đậm căn giữa, bề rộng cột 1 = 3cm | `Cell.Shading.BackgroundPatternColor`, `Cell.Range.Font.Bold`, `Column(1).Width` (pt) |
| 11 | Trang ngang (landscape) cho mục 2 (nếu app có ngắt mục + Page Setup theo mục) | `Sections(2).PageSetup.Orientation` = 1 |
| 12 | Cỡ trang Letter, lề 2cm 4 phía (kịch bản 2 khác kịch bản 1: A4) | `PageSetup.PageWidth/PageHeight` ≈ 612/792pt, 4 lề = 56.7pt |
| 13 | Ngắt trang thường (Ctrl+Enter, không ngắt mục) | số trang tăng, đoạn sau ngắt ở trang 2 (`Range.Information(3)`) |
| 14 | Header khác nhau trang đầu (nếu app hỗ trợ "Different first page") — nếu không có lệnh, ghi rõ | `PageSetup.DifferentFirstPageHeaderFooter` |
| 15 | Ký tự đặc biệt/tiếng Việt có dấu tổ hợp: "Nguyễn Văn Ơn – ĐẠI HỌC" (NFC) | `Range.Text` khớp chuỗi NFC |
| 16 | Tab stop 5cm + đoạn dùng Tab | `TabStops(1).Position` = 141.7pt |

Ghi `expected.json` ngay khi tạo (giá trị người dùng đã chọn), **không** sửa expected cho khớp Word.

## Bước 2 — Đo, gom lớp

`python scripts/layout-audit/_create_new_writer.py . _new2.docx --scenario 2` rồi
`powershell -File scripts/layout-audit/_word_readback.ps1 -File _new2.docx` → `CHECKS=N DIFFS=M`. Dán **nguyên văn** kết
quả vào `docs/HANDOFF-WRITER-CREATE-NEW-V12.md`, mỗi lệch: expected / Word đọc / nguyên nhân đã xác định bằng cách
**giải nén DOCX xem `word/document.xml`** (thiếu `w:ind`? `w:spacing` sai đơn vị? `w:highlight` mất? …) và xem HTML gửi
LibreOffice (`_contentForExport`). Gom theo lớp (cùng nguyên nhân = 1 lớp).

## Bước 3 — Sửa từng lớp (tối đa số lớp bạn còn thời gian; commit riêng mỗi lớp)

Đúng tầng: thuộc tính LibreOffice HTML import làm rơi → hậu xử lý `postprocess_created_writer_docx`
(`adapters/libreoffice/common/ooxml_zip_patch.py`) **ưu tiên ghép theo THỨ TỰ đoạn** (đoạn thứ i trong HTML ↔ `<w:p>` thứ i,
đối chiếu text để kiểm tra) chứ không chỉ theo text — hai đoạn cùng chữ không được nhầm. Thuộc tính app chưa xuất ra
HTML → sửa `_contentForExport` (`adapters/libreoffice/writer/writer-adapter.js`). Mỗi lớp: 1 chỗ sửa + unit test
(`tests/unit/writer-*.test.js` hoặc `tests/test_writer_*.py`) + quy ước **W22a, W22b, …** vào `docs/QUY-UOC-DOI-CHIEU.md`
(mẫu như W20a–g). Đo lại sau mỗi lớp; DIFFS phải giảm, lớp khác không tăng.

## Ràng buộc

- **Không chạy app / Word COM khi đang có phiên đo khác**: trước mỗi lần chạy `_create_new_writer.py`, kiểm tra
  file `E:\VNOffice-opencode-lan-audit\_writer_out_main2\_writer_layout_matrix.md` đã tồn tại chưa; nếu chưa → phiên đo
  24 file đang chạy, chờ (`Start-Sleep 60` rồi kiểm tra lại) — đừng chạy chồng, kết quả sẽ giả.
- Kịch bản 1 phải vẫn `CHECKS=36 DIFFS=0` sau mọi sửa (chạy lại `_new.docx`).
- Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js` (main 1790/1790), `python -m unittest discover -s tests -p "test_writer*.py"` (58 OK).
- Không commit `file test`, không tên tài liệu thật, không bịa số (mọi số trong handoff phải là output thật đã chạy).
  Không đổi mặc định toàn cục, không đổi định nghĩa kiểm tra đã có trong `_word_readback.ps1` kịch bản 1.
- Commit tiếng Việt không dấu, `git commit -F <file>`. Kết thúc: commit `docs/HANDOFF-WRITER-CREATE-NEW-V12.md` với bảng
  CHECKS/DIFFS trước–sau và danh sách lớp còn lại.
