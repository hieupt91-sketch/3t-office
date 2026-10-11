# Đối chiếu song song Writer với Word COM

## Cách chạy trên worktree riêng

Tạo một thư mục audit riêng (không dùng profile của phiên Writer khác), rồi đặt biến môi trường trước khi chạy:

```powershell
$env:VNO_APP_ROOT = 'E:\VNOffice-codex-ft7'
$env:VNO_CDP_LOCALAPPDATA = 'E:\VNOffice-profiles\codex-ft7'
$dir = $env:VNO_CDP_LOCALAPPDATA

.\scripts\audit-0610\word_parallel\make-template.ps1 -Dir $dir
node --experimental-websocket scripts/audit-0610/word_parallel/app-ops.desktop.mjs
.\scripts\audit-0610\word_parallel\word-compare.ps1 -Dir $dir
```

`app-ops.desktop.mjs` dùng cổng CDP trống được cấp riêng bởi `tests/live/cdp/session.mjs`; mọi lần mở app dùng `VNO_APP_ROOT` và `VNO_CDP_LOCALAPPDATA` trên. Có thể chọn phép thử bằng `$env:OPS='subscript,highlightYellow'`. Cùng biến `OPS` lọc các phép thử trong `word-compare.ps1`. Phép `default` lưu template không áp lệnh để đọc riêng SpaceAfter mặc định.

## Sheet / Excel COM chỉ đọc

Trong worktree audit Sheet, đặt `$env:VNO_APP_ROOT` đúng thư mục worktree và `$env:VNO_CDP_LOCALAPPDATA` đúng profile tách biệt. `app-ops-sheet.desktop.mjs` dùng workbook fixture `tests/live/cdp/test_sheet_home.xlsx`, lấy CDP port trống qua session launcher, lưu bản XLSX sau thao tác vào profile và không gọi Excel COM. Có thể lọc ca bằng `$env:OPS='standard'`.

```powershell
$env:VNO_APP_ROOT = 'E:\VNOffice-codex-fs7'
$env:VNO_CDP_LOCALAPPDATA = 'E:\VNOffice-profiles\codex-fs7'
$env:VNO_AUDIT_MARK_DIRTY = '1'
$env:OPS = 'standard'
node --experimental-websocket scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs
scripts\audit-0610\word_parallel\excel-read.ps1 -Files "$env:VNO_CDP_LOCALAPPDATA\app_standard.xlsx"
```

`excel-read.ps1` chỉ mở các workbook read-only và chỉ đọc thuộc tính qua Excel COM. Với fixture này, số tiền mẫu nằm ở C2. Dấu phân cách hàng nghìn dùng command id `sheet.format.standard` (nhãn “Phân cách hàng nghìn”, phím `Ctrl+Shift+1`); không có command `sheet.format.thousands`.

Word COM chạy ẩn với `DisplayAlerts=0`. Script chụp các PID WINWORD đang có trước khi tạo COM, nhận diện PID mới do phiên automation tạo, gọi `Quit()` rồi chỉ dọn theo PID mới đó. Không dừng tiến trình WINWORD cũ.

## Kết quả 11/10/2026 — FIX-T7

| Phép thử | Kết quả |
|---|---|
| 20 thao tác Trang đầu (đậm/nghiêng/gạch/chỉ số/cỡ-phông-màu/căn lề/danh sách/thụt lề/giãn dòng/khoảng cách/đổi hoa) | 20/20 KHỚP Word COM |
| Mặc định không thao tác (SpaceAfter từ `0.28cm`, `--vno-lh:1.08`) | KHỚP: app 8 pt / 160 twips, Word 8 pt |
| Mở DOCX có Highlight vàng do Word tạo rồi lưu lại trong app | KHỚP: `w:highlight w:val="yellow"` được giữ |
| Batch DOCX d01, d07, d13, d20, d24 | 5/5 PASS; số trang nguồn/lưu lần lượt 19/19, 23/23, 10/10, 3/3, 16/16; edit=PASS |

Báo cáo batch: `E:\VNOffice-profiles\codex-ft7\batch-audit\batch_document_audit_report.md`.

## Kết quả nhóm mở rộng

Các nhóm dưới đây đã được thêm vào ma trận `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`; chưa chạy thao tác song song trong lượt FIX-T7 và không được tính KHỚP:

- Bảng: chèn, gộp/tách, căn ô, kích thước, tô nền, viền.
- Bố cục trang: lề, hướng, khổ giấy, cột.
- Đầu/chân trang; ngắt trang/ngắt mục; mục lục.
- Chú thích trang/cuối; ghi chú; theo dõi thay đổi.
- Heading 1–3; thư viện kiểu; tìm/thay thế; ký hiệu; hộp văn bản.

Các script hiện tạo template ba đoạn, chạy một lệnh qua CommandBus, lưu DOCX và đọc các thuộc tính Range/ParagraphFormat/ListFormat bằng Word COM. Để thêm nhóm, khai báo cùng ca kiểm thử trong cả hai harness và chỉ đánh dấu KHỚP sau khi đọc lại DOCX bằng Word COM.

Đã chạy thêm Heading 1–3 riêng. App và Word ghi đúng cùng `w:pStyle` (`Heading1`/`2`/`3`), nhưng font, cỡ, màu và khoảng cách mặc định lệch; xem mục Heading trong `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`. Không đánh dấu nhóm này KHỚP. Đã xác minh riêng 1/2/3 cột bằng `PageSetup.TextColumns.Count`: 3/3 KHỚP; lề, hướng và khổ giấy vẫn chưa chạy.
