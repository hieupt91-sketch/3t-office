# Nhiệm vụ: Khung kết nối tài khoản Cloud (Google Drive + OneDrive) — OAuth PKCE, không cần backend

## Bối cảnh

Đã khảo sát: hiện KHÔNG có bất kỳ cơ chế đăng nhập tài khoản/cloud storage
nào trong toàn bộ repo. Người dùng (chủ dự án) muốn: (1) người dùng có thể
kết nối tài khoản Cloud của chính họ (Google Drive và/hoặc OneDrive) để lưu
trữ/đồng bộ, (2) miễn phí, dùng tài khoản cá nhân người dùng, KHÔNG cần VN
Office tự vận hành server lưu trữ riêng.

**Nguyên tắc kiến trúc bắt buộc**: dùng chuẩn **OAuth 2.0 với PKCE (Proof
Key for Code Exchange) + redirect qua loopback (`http://127.0.0.1:<port>`)**
— đây là chuẩn CHÍNH THỨC được khuyến nghị cho ứng dụng desktop/native
(RFC 8252), được cả Google và Microsoft hỗ trợ. Lý do bắt buộc dùng PKCE:
**không cần giữ "client secret"** ở đâu cả (không phía JS, không phía
Python) — loại bỏ hoàn toàn rủi ro lộ secret mà một OAuth flow kiểu cũ
(Authorization Code không có PKCE) sẽ gặp phải trong app desktop. Toàn bộ
luồng (redirect tới trang đăng nhập Google/Microsoft, đổi code lấy token)
đều có thể thực hiện an toàn bằng `fetch()` phía JS bình thường vì PKCE
không có secret để lộ.

## QUAN TRỌNG: người dùng CẦN tự đăng ký app OAuth (việc này KHÔNG làm được tự động)

Trước khi code này hoạt động thật với tài khoản thật, chủ dự án cần tự làm
(miễn phí, ~10-15 phút mỗi bên):
- **Google**: vào Google Cloud Console → tạo OAuth Client ID loại
  "Desktop app" → bật Google Drive API → lấy Client ID.
- **Microsoft**: vào Azure Portal → App registrations → New registration,
  loại "Public client/native", Redirect URI kiểu
  `http://localhost` (cho phép cổng bất kỳ) → lấy Application (client) ID.

**Task này KHÔNG cần chờ Client ID thật để code** — Client ID phải là
**giá trị cấu hình** (đọc từ 1 file config hoặc biến môi trường, có thể để
trống/placeholder rõ ràng lúc code), để chủ dự án tự điền vào sau. Code
phải tự kiểm tra và báo lỗi tiếng Việt rõ ràng nếu Client ID chưa được cấu
hình (không được crash mù mờ).

## Việc cần làm

### 1. Cơ chế loopback redirect dùng chung

- Viết 1 module dùng chung (JS, đặt trong `platform/cloud/` — tạo thư mục
  mới nếu chưa có, theo đúng convention `platform/ai/` đã có) để:
  1. Mở 1 cổng loopback tạm thời (`http://127.0.0.1:<port>`) CHỈ để nhận
     redirect callback OAuth — đây là cổng RIÊNG, KHÁC với cổng server
     tĩnh nội bộ (`_start_static_server()` trong `main.py`, phục vụ giao
     diện) — không được nhầm lẫn/tái sử dụng nhầm 2 mục đích khác nhau.
     Việc mở cổng tạm này thực hiện qua `main.py` (Python) — thêm 1 hàm
     mới tương tự `_start_static_server()` (tái dùng đúng pattern: thử
     cổng, dùng threading, tắt khi xong), phơi ra cho JS qua `js_api` của
     pywebview để JS gọi bắt đầu/kết thúc lắng nghe.
  2. Sinh `code_verifier`/`code_challenge` (PKCE) bằng Web Crypto API có
     sẵn trong trình duyệt (`crypto.subtle`), KHÔNG cần thư viện ngoài.
  3. Mở cửa sổ/tab trỏ tới URL đăng nhập của provider (Google hoặc
     Microsoft) kèm `redirect_uri=http://127.0.0.1:<port>/callback`.
  4. Khi provider redirect về, cổng loopback Python bắt được `code` qua
     query string, chuyển lại cho JS (qua cơ chế polling `js_api` hoặc
     tương tự — nghiên cứu cách `main.py` hiện expose dữ liệu về JS, tái
     dùng đúng pattern có sẵn, không phát minh cơ chế IPC mới).
  5. JS dùng `code` + `code_verifier` gọi `fetch()` thẳng tới token
     endpoint thật của provider (`https://oauth2.googleapis.com/token`
     hoặc `https://login.microsoftonline.com/common/oauth2/v2.0/token`)
     để đổi lấy access token + refresh token.
  6. Đóng cổng loopback ngay sau khi xong (không giữ mở lâu không cần
     thiết).

### 2. Lưu trữ token

- Access token + refresh token lưu ở đâu? **KHÔNG lưu plaintext localStorage
  như API key AI hiện tại** (đó là rủi ro đã biết, không nên lặp lại) —
  nghiên cứu xem pywebview/Windows có cơ chế lưu trữ có mã hoá nào khả dụng
  không (ví dụ Windows Credential Manager qua Python `keyring` — NHƯNG đây
  là dependency Python MỚI, thuộc diện phải DỪNG LẠI xin phép theo
  AGENTS.md §11 "thêm dependency lớn" nếu cần cài qua pip). Nếu không có
  cách nào không cần dependency mới, dùng localStorage NHƯNG ghi rõ trong
  handoff đây là hạn chế tạm thời, đề xuất phương án mã hoá sau.

### 3. UI kết nối

- Thêm mục "Kết nối Cloud" trong Backstage (`Alt+F`, khu vực đã có sẵn
  cho Tài khoản/Cài đặt nếu có, hoặc tạo mục mới phù hợp) — cho phép
  Kết nối/Ngắt kết nối riêng biệt Google Drive và OneDrive (đúng yêu cầu
  người dùng: mỗi loại tài khoản độc lập, không gộp chung).
- Sau khi kết nối: hiển thị rõ đã kết nối tài khoản nào (không cần hiện
  email thật nếu chưa gọi API lấy profile — tối thiểu hiện "Đã kết nối
  Google Drive" là đủ cho phạm vi task này).

### 4. Thao tác cơ bản (tối thiểu cho task này — KHÔNG làm full sync engine)

- "Lưu 1 bản lên Google Drive/OneDrive" (upload file hiện tại lên thư mục
  gốc hoặc thư mục do người dùng chọn qua Drive Picker/OneDrive File Picker
  nếu API hỗ trợ; nếu picker phức tạp, tối thiểu upload lên thư mục gốc
  "VN Office" tự tạo).
- "Mở file từ Google Drive/OneDrive" (liệt kê file gần đây hoặc cho chọn
  qua picker, tải về, mở như file thường qua luồng `open_document_dialog`
  hiện có).
- **KHÔNG làm đồng bộ 2 chiều tự động/liên tục** — đó là tính năng lớn
  hơn nhiều (Phase 5 theo roadmap, cần duyệt riêng về chi phí/hạ tầng),
  ngoài phạm vi task này. Chỉ làm "lưu lên" và "mở từ" theo yêu cầu thủ
  công của người dùng.

## Kiểm thử bắt buộc

- Vì KHÔNG có Client ID thật lúc code, không thể test round-trip OAuth
  thật với tài khoản thật — chấp nhận. Nhưng PHẢI:
  - Test được toàn bộ phần PKCE code_verifier/code_challenge generation
    (unit test, không cần mạng).
  - Test được cơ chế mở/đóng cổng loopback Python (giống cách đã test
    `_start_static_server()` — tự dò cổng, tự đóng, xử lý cổng bận).
  - Test được luồng xử lý lỗi khi Client ID chưa cấu hình (thông báo rõ
    ràng tiếng Việt, không crash).
- `node scripts/check-syntax.js`: 90/90 PASS.
- `python -m unittest discover`: không giảm so với hiện tại.
- Viết `docs/HANDOFF-CLOUD-OAUTH-SCAFFOLDING.md` — mô tả kiến trúc, và
  **hướng dẫn từng bước bằng tiếng Việt cho chủ dự án** để tự đăng ký
  Client ID Google + Microsoft (vì đây là việc CHỈ chủ dự án tự làm
  được).

## Ranh giới an toàn — ĐẶC BIỆT QUAN TRỌNG

- Đây là task đụng tới **security boundary** và **external dependency**
  theo đúng AGENTS.md §11 "Stop and ask". Nếu trong lúc làm phát hiện cần
  thêm dependency Python/Node MỚI ngoài phạm vi đã liệt kê ở trên, HOẶC
  phát hiện cách tiếp cận PKCE + loopback không khả thi vì lý do kỹ thuật
  cụ thể nào đó — **DỪNG LẠI, viết rõ vấn đề vào handoff, KHÔNG tự ý đổi
  hướng kiến trúc lớn mà chưa được duyệt.**
- KHÔNG lưu Client Secret ở bất kỳ đâu (đúng chuẩn PKCE là không cần).
- KHÔNG sửa `scripts/serve.js`.
- KHÔNG đụng tới `_start_static_server()` hiện có (cổng phục vụ giao
  diện) — cổng OAuth loopback phải là cơ chế RIÊNG, tách biệt hoàn toàn.
- KHÔNG đụng tới hệ thống AI/BYOK hiện có (task khác đang làm song song).
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
