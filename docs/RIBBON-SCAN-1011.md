# Rà soát nút ribbon (11/10/2026)

Công cụ: `tests/live/cdp/claude-ribbon-scan.desktop.mjs <writer|sheet|slides>` — mở app desktop, bấm TỪNG nút trên mọi tab bằng chuột thật qua CDP (không dùng điều khiển hệ điều hành), ghi lại phản ứng (hộp thoại, menu, thông báo, thay đổi tài liệu/DOM). Nút nguy hiểm (in, thoát, cửa sổ mới, bản quyền, trợ lý AI, bắt đầu trình chiếu) chỉ ghi nhận, không bấm. Biến môi trường: `VNO_APP_ROOT`, `VNO_CDP_LOCALAPPDATA` (hồ sơ riêng), `OUT` (tệp JSON), `PROGRESS` (tùy chọn, nhật ký từng nút để biết nút nào làm treo).

Kết quả trên tài liệu trống (chỉ mức thô, "có phản ứng" chưa chứng minh "đúng chức năng"):

| App | Số nút | Hộp thoại | Menu/thông báo/tài liệu đổi | Chỉ đổi DOM nhẹ | Ô chọn/nhập | Bỏ qua (nguy hiểm) | Bị vô hiệu | **Không phản ứng** |
|---|---|---|---|---|---|---|---|---|
| Doc | 135 | 38 | 2 | 63 | 8 | 14 | 10 | **0** |
| Sheet | 138 | 47 | 0 | 79 | 4 | 8 | 0 | **0** |
| Slide | 88 | 21 | 16 | 35 | 3 | 9 | 4 | **0** |

- Không có nút "câm" hoàn toàn trên cả ba ứng dụng.
- Nút không có biểu tượng: chỉ là các ô chọn/nhập (Phông chữ, Cỡ chữ, Giãn dòng, Định dạng số, Tùy chọn tính toán) và vài ô chọn dạng chữ của Doc (Viền đoạn văn, Danh số dòng, Thụt đầu dòng, Khoảng trước/sau đoạn, Kiểu trích dẫn) — hợp lý, nhưng Doc có thể bổ sung biểu tượng cho đồng nhất.
- Giới hạn: Sheet và Slide vẽ trên canvas nên một số nút (căn lề, trộn ô, thập phân, chèn/xóa hàng...) chỉ cho thấy thay đổi DOM nhỏ; hành vi đúng của chúng đã được đối chiếu riêng với Excel/PowerPoint thật ở các phiếu FIX-S7..S10 và FIX-L4..L6.
- Nút bị vô hiệu trên tài liệu trống (Doc: Trộn thư, chấp nhận/từ chối thay đổi; Slide: bình luận) là đúng vì cần có dữ liệu/lựa chọn trước.