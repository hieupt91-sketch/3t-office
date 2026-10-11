# Đối chiếu VN Writer với Word thật — 11/10/2026

## Kế hoạch (FIX-T7)
- **Mục tiêu:** khớp lưu DOCX với Word COM cho các sai lệch đã tái hiện; lập và mở rộng ma trận đối chiếu theo nhóm trong ticket.
- **Năng lực hiện tại:** harness chạy CommandBus trên app desktop, lưu DOCX thật, rồi dùng Word COM đọc thuộc tính. Bộ đầu có 20 thao tác Trang đầu.
- **Files/modules:** hậu xử lý DOCX `ooxml_zip_patch.py`, unit test Writer, harness `scripts/audit-0610/word_parallel`, báo cáo và handoff. Không sửa LibreOffice Core, không thêm dependency.
- **Dependency:** LibreOffice chuyển DOCX; Word COM cục bộ làm oracle. App dùng `VNO_APP_ROOT=E:\VNOffice-codex-ft7`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft7`, CDP chọn cổng trống cho từng phiên.
- **Rủi ro:** HTML import của LibreOffice có thể chia run hoặc làm tròn số đo; sửa theo nội dung được đánh dấu và kiểm tra page count bộ DOCX hồi quy.
- **Kiểm thử:** unit, npm, unittest, audit COM, mở/lưu lại highlight Word, batch d01/d07/d13/d20/d24.
- **Rollback:** các thay đổi DOCX cô lập trong adapter; bỏ commit fix T7 nếu hồi quy tài liệu thất bại.

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
| Bảng: chèn, gộp/tách ô, căn ô, kích thước, tô nền, viền | Chưa chạy | Chưa chạy | NOT RUN |
| Bố cục trang: lề, hướng, khổ giấy | Chưa chạy | Chưa chạy | NOT RUN |
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

## Batch DOCX hồi quy

`batch_document_audit.py docx` trên d01, d07, d13, d20, d24: **5/5 PASS**, không lệch số trang sau edit/save. Chi tiết và thời gian đo trong `E:\VNOffice-profiles\codex-ft7\batch-audit\batch_document_audit_report.md`.
