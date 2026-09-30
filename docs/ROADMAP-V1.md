# VN Office 1.0 — mục tiêu hoàn thiện và tiêu chí nghiệm thu

Ngày lập: 30/09/2026 · Theo yêu cầu người phụ trách: chốt đích, giao việc theo gói, kiểm tra một lần theo tiêu chí cố định — không đo thử kéo dài.

## 1. Định nghĩa "hoàn thiện" cho bản 1.0
Nhân viên văn phòng dùng VN Writer và VN Sheet thay Word/Excel cho công việc hằng ngày, chạy offline, không mất dữ liệu.
VN Slides: chỉ cần mở/xem/sửa đơn giản/lưu được (ưu tiên sau, theo quyết định 19/9).

## 2. Hiện trạng (30/09)
| Mảng | Đã có | Còn thiếu |
|---|---|---|
| Cài đặt & cập nhật | Setup.exe (NSIS), cập nhật tự động có chữ ký qua share LAN, tự lưu/khôi phục, báo lỗi (lưu cục bộ) | Máy chủ nhận lỗi trên VPS |
| Mở/lưu đúng như Office | 24 docx + 20 doc: số trang Word = VN = bản lưu; 26 xlsx LAN: lệch 0 ô | Khung chữ/hình phức tạp, vài .doc/.xls cũ |
| Tốc độ | Word/Excel nhỏ 2–3 s; LibreOffice khởi tạo sẵn khi cài | Word nhiều khung chữ ~10 s; Excel vừa ~11 s; Excel rất lớn 2–3 phút |
| Soạn thảo cơ bản như Word/Excel | Nhiều lệnh đã có | Chưa kiểm hệ thống theo kịch bản Word/Excel (đang làm) |
| Giao diện lần đầu | Có Trợ giúp tiếng Việt | Hộp thoại che tài liệu, còn chữ tiếng Anh, chưa gọn |

## 3. Gói việc, người làm, tiêu chí XONG (chỉ kiểm các tiêu chí này)
| Gói | Người làm | Tiêu chí XONG |
|---|---|---|
| G1. Soạn thảo cơ bản Writer | Codex | 30 kịch bản văn bản hành chính (gõ, định dạng, danh sách, bảng, lề A4, số trang, tìm/thay, hoàn tác) cho kết quả giống Word; bản lưu Word mở không lỗi, cùng số trang |
| G2. Bảng tính cơ bản Sheet | Codex | 30 kịch bản (nhập số/ngày/tiền VND, 10 hàm phổ biến, kéo điền, chép/dán, chèn/xóa hàng cột, lọc/sắp xếp, định dạng số, cố định dòng) giống Excel; Excel mở bản lưu cùng giá trị |
| G3. Tốc độ — **nguyên tắc sống còn** (người phụ trách 30/9) | Codex | Mở file nhanh ngang Microsoft Office, LibreOffice và WPS: với cùng một tệp, thời gian VN Office từ lúc chọn tệp tới lúc thấy nội dung ≤ thời gian LibreOffice desktop và không quá 1,5 lần Word/Excel (đo Word/Excel/LibreOffice/WPS làm mốc trên bộ tệp cố định: d03, d12, d24, legacy .doc, lan05, lan11, lan14, legacy .xls). Excel rất lớn phải hiện vùng nhìn thấy trước (nạp dần phần còn lại). Không đổi kết quả mở |
| G4. Giao diện & lần đầu dùng | agy | 100% chữ giao diện tiếng Việt; hộp thoại đồng ý chỉ 1 lần, không che tài liệu; có trạng thái "Đang mở…"; 20 thao tác cơ bản dùng được bằng bàn phím như Office |
| G5. Máy chủ báo lỗi | Claude + người phụ trách | Có VPS/HTTPS; lỗi từ máy thử hiện trên trang quản trị ≤ 1 phút |
| G6. Phát hành | Claude | Mỗi gói xong → bản vá tự động 0.9.x qua share; Setup.exe cho máy mới |

## 4. Cách kiểm tra (một cổng chung, chạy 1 lần khi gói báo xong)
1. `node tests/run-tests.js` và `python -m unittest discover -s tests` đạt.
2. Bộ tệp cố định: 24 docx + 20 doc (số trang Word = VN = bản lưu), 26 xlsx LAN (lệch 0 ô), 20 xls.
3. Kịch bản của gói đó (bảng G1–G4) đạt.
4. Cài bản vá lên một máy thử bằng cập nhật tự động, mở 3 tệp thật.
Không đạt → trả lại đúng mục không đạt, không đo thêm ngoài phạm vi.

## 5. Mốc
- 0.9.3 (30/09): tăng tốc mở file + Setup.exe.
- 0.9.4 (~03/10): G4 giao diện lần đầu + phần G1/G2 xong trước.
- 0.9.5 (~07/10): G1, G2, G3 đạt; sửa lỗi từ nhân viên dùng thử.
- 1.0 RC (~10/10): mọi tiêu chí mục 3 đạt, 1 tuần dùng thử không có lỗi mất dữ liệu.
