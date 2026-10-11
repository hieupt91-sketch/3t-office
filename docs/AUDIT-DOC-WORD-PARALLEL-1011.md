# Đối chiếu VN Writer với Word thật — 11/10/2026

## Kế hoạch (FIX-T7)
- **Mục tiêu:** khớp lưu DOCX với Word COM cho các sai lệch đã tái hiện; lập và mở rộng ma trận đối chiếu theo nhóm trong ticket.
- **Năng lực hiện tại:** harness chạy CommandBus trên app desktop, lưu DOCX thật, rồi dùng Word COM đọc thuộc tính. Bộ đầu có 20 thao tác Trang đầu.
- **Files/modules:** hậu xử lý DOCX `ooxml_zip_patch.py`, unit test Writer, harness `scripts/audit-0610/word_parallel`, báo cáo và handoff. Không sửa LibreOffice Core, không thêm dependency.
- **Dependency:** LibreOffice chuyển DOCX; Word COM cục bộ làm oracle. App dùng `VNO_APP_ROOT=E:\VNOffice-codex-ft7`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft7`, CDP chọn cổng trống cho từng phiên.
- **Rủi ro:** HTML import của LibreOffice có thể chia run hoặc làm tròn số đo; sửa theo nội dung được đánh dấu và kiểm tra page count bộ DOCX hồi quy.
- **Kiểm thử:** unit, npm, unittest, audit COM, mở/lưu lại highlight Word, batch d01/d07/d13/d20/d24.
- **Rollback:** các thay đổi DOCX cô lập trong adapter; bỏ commit fix T7 nếu hồi quy tài liệu thất bại.

## Kế hoạch đối chiếu mở rộng (FIX-T8)
- **Mục tiêu:** hoàn tất lần lượt bốn nhóm Bảng, Bố cục trang, Kiểu/Tham chiếu và Ghi chú/Rà soát/Tìm kiếm/Đối tượng theo Word COM làm chuẩn; chỉ kết luận KHỚP khi app và Word cùng thao tác trên DOCX thật rồi đọc lại thuộc tính trong Word.
- **Năng lực hiện tại:** app có các command Writer cho bảng, bố cục/section, style, TOC/footnote, comments/track changes, find/replace, symbol và textbox; harness hiện mới đối chiếu Trang đầu, Heading và số cột.
- **Files/modules:** harness trong `scripts/audit-0610/word_parallel/`, ma trận trong tài liệu này, help Writer hiện có và handoff theo mẫu. Chỉ sửa adapter/app khi đo được sai lệch tái hiện, trong đúng vùng Writer/adapter.
- **Dependency:** Word COM cục bộ làm oracle; app desktop khởi chạy qua `main.py`. Dùng `VNO_APP_ROOT=E:\VNOffice-codex-ft8`, profile riêng `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft8`, cổng CDP tự cấp bởi `tests/live/cdp/session.mjs`.
- **Rủi ro:** Word có thể chuẩn hóa XML/giá trị khi mở hoặc lưu; section, style theo theme và tracked changes có semantics phụ thuộc tài liệu. Không áp sửa toàn cục nếu chưa xác định quy tắc tương thích.
- **Kiểm thử:** từng nhóm chạy trên desktop và Word COM, đối chiếu thuộc tính; sau các thay đổi chạy `npm test`, Python unittest và batch DOCX d01/d07/d13/d20/d24; ghi đúng PASS/FAIL/NOT RUN/BLOCKED.
- **Rollback:** mỗi nhóm là commit riêng theo ticket; nếu nhóm gây hồi quy, revert riêng commit nhóm đó.

## Đối chiếu Trang đầu

| Phép thử | App | Word COM | Kết quả |
|---|---:|---:|---|
| Bold | PASS | PASS | KHỚP |
| Italic | PASS | PASS | KHỚP |
| Underline | PASS | PASS | KHỚP |
| Strike | PASS | PASS | KHỚP |
| Subscript | PASS | PASS | KHỚP |
| Superscript | PASS | PASS | KHỚP |
| Cỡ chữ 16 | PASS | PASS | KHỚP |
| Phông Arial | PASS | PASS | KHỚP |
| Màu chữ đỏ | PASS | PASS | KHỚP |
| Highlight vàng | PASS | PASS | KHỚP |
| Căn giữa | PASS | PASS | KHỚP |
| Căn phải | PASS | PASS | KHỚP |
| Căn đều | PASS | PASS | KHỚP |
| Bullet | PASS | PASS | KHỚP |
| Numbered | PASS | PASS | KHỚP |
| Tăng thụt lề | PASS | PASS | KHỚP |
| Giãn dòng 1.5 | PASS | PASS | KHỚP |
| SpaceBefore 12 pt | PASS | PASS | KHỚP |
| SpaceAfter 12 pt | PASS | PASS | KHỚP |
| Đổi hoa | PASS | PASS | KHỚP |
| Baseline SpaceAfter `0.28cm`, không lệnh định dạng | 8 pt / 160 twips | 8 pt | KHỚP |
| Word Highlight vàng → mở/lưu lại bằng app | `w:highlight yellow` còn nguyên | `HighlightColorIndex=7` nguồn | KHỚP |

Lượt so sánh COM cuối: **21/21 KHỚP**. Hai lượt chẩn đoán trước có các lệch thật: `ListType` 4 và indent 35.5 pt; `SpaceAfter` 7.9 pt. Sau sửa, cả ListType và LeftIndent 36 pt đã khớp trong Word COM.

## Đối chiếu nhóm mở rộng

| Nhóm | App | Word COM | Kết quả |
|---|---|---|---|
| Bảng: chèn bảng 3×4; thêm hàng dưới; thêm cột phải; xóa hàng | Đã chạy; số ô sau thao tác khớp | Đã chạy COM; số ô sau thao tác khớp | KHỚP |
| Bảng: gộp/tách ngang; Ctrl+Z sau tách | Đã chạy; số ô khớp, Ctrl+Z trả về trạng thái gộp | Đã chạy; số ô khớp, Undo trả về trạng thái gộp | KHỚP |
| Bảng: căn giữa dọc; lặp hàng tiêu đề | Đã chạy: `VerticalAlignment=1`, `HeadingFormat=-1` | Đã chạy: `VerticalAlignment=1`, `HeadingFormat=-1` | KHỚP |
| Bảng: xóa cột, gộp/tách dọc, căn ngang, nền, viền, AutoFit, chiều cao/rộng | Chưa chạy | Chưa chạy | NOT RUN |
| Bố cục trang: A4 ngang, lề 25/20 mm | CDP + DOCX đã lưu; Word COM đọc lại | Word COM tạo và đọc DOCX đối chứng | KHỚP; preset/Letter/A5 chưa chạy |
| Bố cục trang: 1/2/3 cột | Đã chạy | Đã chạy | 3/3 KHỚP |
| Đầu/chân trang | Chưa chạy | Chưa chạy | NOT RUN |
| Ngắt trang/ngắt mục | Chưa chạy | Chưa chạy | NOT RUN |
| Mục lục | Chưa chạy | Chưa chạy | NOT RUN |
| Chú thích trang/cuối | Chưa chạy | Chưa chạy | NOT RUN |
| Ghi chú | Chưa chạy | Chưa chạy | NOT RUN |
| Theo dõi thay đổi | Chưa chạy | Chưa chạy | NOT RUN |
| Heading 1–3 | Chưa chạy | Chưa chạy | NOT RUN |
| Thư viện kiểu | Chưa chạy | Chưa chạy | NOT RUN |
| Tìm/thay thế | Chưa chạy | Chưa chạy | NOT RUN |
| Ký hiệu | Chưa chạy | Chưa chạy | NOT RUN |
| Hộp văn bản | Chưa chạy | Chưa chạy | NOT RUN |

### FIX-T8 — kết quả lần chạy `codex-ft8`

- Bảng — đã bấm **Chèn > Bảng biểu**, **Bố cục Bảng > Chèn hàng phía dưới / Chèn cột bên phải / Xóa hàng / Gộp ô / Tách ô / Căn giữa dọc**, và **Thiết kế Bảng > Hàng tiêu đề** qua CDP mouse. COM áp thao tác tương đương lên template Word riêng rồi đọc DOCX.
- Kết quả Bảng: chèn 3×4 KHỚP; sau thêm hàng, thêm cột và xóa hàng, số ô từng hàng khớp; gộp ngang và tách ngang khớp số ô từng hàng; Ctrl+Z của app và Undo của Word sau tách đều trở lại trạng thái gộp; `VerticalAlignment=1` và `HeadingFormat=-1` khớp.
- Các phép thử Bảng chưa chạy: xóa cột, gộp/tách dọc, căn ngang, nền, viền, AutoFit, chiều cao hàng/rộng cột.
- Bộ cột 1/2/3 đã có kết quả 3/3 KHỚP ở phần trên. Các phép thử lề, hướng, khổ giấy, ngắt trang/mục, đầu/chân trang, trang đầu khác, số trang: **NOT RUN** trong lượt này.
- Các phép thử FIX-T8 còn lại thuộc Style/References và Comments/Track Changes/Find/Replace/Symbol/Shapes: **NOT RUN** trong lượt này. Kết quả Heading 1–3 trước đó vẫn là sai khác đã ghi, không được tính KHỚP.
- Batch DOCX hồi quy trên worktree/profile `codex-ft8`: **5/5 PASS**, edit PASS; trang nguồn/lưu d01 19/19, d07 23/23, d13 10/10, d20 3/3, d24 16/16. Báo cáo: `E:\VNOffice-profiles\codex-ft8\batch-audit\batch_document_audit_report.md`.
- Kiểm thử: `npm test` **3058/3058 PASS**. `python -m unittest discover -s tests` lần chạy đầu dùng nhầm LOCALAPPDATA mặc định và có 10 lỗi do xung đột profile LibreOffice với phiên worktree khác; chạy lại toàn bộ với `LOCALAPPDATA=E:\VNOffice-profiles\codex-ft8\python-localappdata`: **832 tests OK**. Hai lần unittest có `ResourceWarning` về pipe chưa đóng; không có test fail ở lần chạy dùng profile riêng.

### Heading 1–3 — 11/10/2026

Đã chạy riêng `OPS=heading1,heading2,heading3` trên app desktop và Word COM, sau đó đọc thuộc tính bằng Word COM. Cả ba DOCX đều có `w:pStyle` tương ứng `Heading1`, `Heading2`, `Heading3` ở cả app và Word. Tuy vậy các thuộc tính hiển thị sau khi mở bằng Word lệch:

| Kiểu | Thuộc tính lệch (app → Word) | Kết quả |
|---|---|---|
| Heading 1 | đậm `-1 → 0`; cỡ `12 → 16 pt`; phông `Times New Roman → Calibri Light`; trước `0 → 12 pt`; sau `8 → 0 pt`; màu khác | LECH |
| Heading 2 | đậm `-1 → 0`; cỡ `12 → 13 pt`; phông `Times New Roman → Calibri Light`; trước `0 → 2 pt`; sau `8 → 0 pt`; màu khác | LECH |
| Heading 3 | đậm `-1 → 0`; phông `Times New Roman → Calibri Light`; trước `0 → 2 pt`; sau `8 → 0 pt`; màu khác | LECH |

Chưa sửa các style mặc định: Word COM dùng theme/style của phiên bản Word cài trên máy, còn ép các thuộc tính trên vào mọi Heading trong hậu xử lý DOCX sẽ ghi đè theme và định dạng tài liệu hiện hữu. Đây là sai khác đã tái hiện, chưa phải KHỚP; cần quyết định quy tắc tương thích style/theme trước khi sửa.

### Bố cục trang: cột — 11/10/2026

Đã chạy riêng `OPS=columns1,columns2,columns3` trên app desktop và Word COM. Đọc `PageSetup.TextColumns.Count` từ DOCX đã lưu: 1 cột, 2 cột và 3 cột đều khớp. Lề, hướng giấy và khổ giấy chưa chạy.

### FIX-T8 tiếp tục — Thiết lập trang — 11/10/2026

Đã dùng chuột CDP mở **Bố cục > Thiết lập trang…**, dùng bàn phím chọn **Ngang**, nhập lề trên/dưới 25 mm và trái/phải 20 mm, rồi lưu DOCX. Word COM tạo DOCX riêng với A4 ngang và cùng lề; mở cả hai tệp bằng Word COM để đọc `PageSetup`. Kết quả: hướng `1/1`, khổ `841.9×595.3 / 842×595.3 pt`, lề trên `70.8/70.8 pt`, trái `56.7/56.7 pt`: **KHỚP** (sai số khổ giấy do làm tròn dưới 0.1 pt). Lần tạo Word ban đầu đặt kích thước portrait sau orientation nên bị Word chuẩn hóa về dọc; phép thử được sửa để chọn `PaperSize=A4` trước orientation và chạy lại thành công.

Trong app, mở **Bố cục > Thiết lập trang…**, chọn khổ/hướng, nhập bốn lề theo mm, chọn phạm vi áp dụng rồi nhấn **Áp dụng**. Trợ giúp tiếng Việt hiện có tại F1/Trợ giúp, chủ đề **Lề, hướng giấy và khổ giấy**; khóa giao diện đã có trong `platform/i18n/strings-vi.js` và `strings-en.js`.

Chưa chạy: preset Normal/Narrow/Moderate/Wide, Letter/A5, ngắt trang/ngắt mục, đầu/chân trang, trang đầu khác và định dạng số trang. Nhóm Bố cục trang vì vậy vẫn **CHƯA HOÀN TẤT**; cột 1/2/3 và phép thiết lập A4 ngang/lề ở trên là các phép con đã đối chiếu.

## Batch DOCX hồi quy

`batch_document_audit.py docx` trên d01, d07, d13, d20, d24: **5/5 PASS**, không lệch số trang sau edit/save. Chi tiết và thời gian đo trong `E:\VNOffice-profiles\codex-ft7\batch-audit\batch_document_audit_report.md`.
