# Spec — Gửi/nhận tệp bằng mã (3T Transfer) cho mọi nền tảng

Ngày: 17/10/2026 · Yêu cầu của Người phụ trách: người dùng bấm **Gửi** → app sinh ra một **mã ngắn**; ở máy/app khác bấm **Nhận**, gõ mã là có tệp. Dùng chung cho Windows, macOS, iOS, iPadOS, Android, Linux, và cho cả Writer/Sheet/Slides (một chức năng ở Shared Platform, không nhân bản theo app).
Trạng thái: **ĐỀ XUẤT — chờ duyệt** (AGENTS.md §6/§11: security boundary, dịch vụ ngoài nhận dữ liệu tài liệu). Chưa có dòng code nào.

## 1. Trải nghiệm người dùng

**Gửi** (Tệp > Chia sẻ > Gửi bằng mã…, hoặc nút Gửi trên thanh công cụ nhanh):
1. Hộp thoại hỏi rõ: "Gửi bản tài liệu đang mở? Tệp sẽ được mã hóa trên máy bạn rồi chuyển qua máy chủ 3T trong 10 phút." (không âm thầm; có nút Hủy).
2. Hiện mã cỡ lớn dạng `7K4-9QX` (+ mã QR cho điện thoại), nút Sao chép, đếm ngược 10:00, trạng thái "Đang chờ người nhận…" → "Đã nhận" / "Hết hạn".

**Nhận** (Tệp > Nhận bằng mã…, màn hình chính, hoặc quét QR): gõ mã → thấy tên tệp, kích thước, người gửi (tên máy) → bấm Mở/Lưu. Mở tệp trực tiếp trong app tương ứng (docx→Writer, xlsx→Sheet, pptx→Slides).

Không cần tài khoản, không cần cài thêm, không cần cùng mạng.

## 2. Giao thức (mã hóa đầu-cuối, máy chủ không đọc được tệp)

Mượn mô hình đã được kiểm chứng của magic-wormhole / Croc: **mã ngắn chỉ để bắt tay, khóa mã hóa suy ra bằng PAKE**.

1. Người gửi: `POST /api/v1/transfer/open` → máy chủ cấp `slot` (số 4 chữ số) + `nonce`. Mã hiển thị = `slot` + 6 ký tự ngẫu nhiên (bảng chữ 32 ký tự, bỏ O/0/I/1) ≈ 30 bit bí mật.
2. Hai bên chạy **SPAKE2** (hoặc CPace) qua máy chủ làm bưu điện, dùng 6 ký tự bí mật làm mật khẩu → cùng khóa phiên. Kẻ đoán mã chỉ thử được **online**, máy chủ khóa slot sau **3 lần sai**.
3. Tệp mã hóa **XChaCha20-Poly1305 / AES-256-GCM** theo khối 1 MiB bằng khóa phiên; tải lên theo khối (tiếp tục được khi đứt mạng), người nhận tải về và giải mã trên máy.
4. Máy chủ chỉ giữ bản mã, **xóa ngay khi nhận xong hoặc sau 10 phút**, mỗi mã dùng **một lần**. Giới hạn 100 MB/tệp (cấu hình), giới hạn tần suất theo IP.
5. Không có mã/khóa nào ghi log. Tên tệp cũng nằm trong phần đã mã hóa.

Đường nhanh (tùy chọn giai đoạn 2): nếu hai máy cùng mạng LAN, phát hiện bằng mDNS và truyền thẳng, không qua máy chủ; vẫn dùng cùng mã + PAKE.

## 3. Kiến trúc dùng chung

| Lớp | Nội dung | Vị trí |
|---|---|---|
| Lõi giao thức | PAKE + mã hóa khối + client HTTP, thuần JS (WebCrypto / thư viện nhỏ, giấy phép MIT/BSD) chạy được trên desktop WebView và trình duyệt di động | `platform/transfer/` |
| Giao diện | Hộp thoại Gửi/Nhận dùng ui-kit chung, mở được từ cả 3 app | `platform/dialogs/` + lệnh `common.file.sendByCode` / `common.file.receiveByCode` |
| Cầu nối hệ điều hành | chọn/lưu tệp, mở đúng app, chia sẻ qua share-sheet | `platform/os_services/<nền-tảng>.py`, `ports/<nền-tảng>/` |
| Máy chủ | thêm nhóm `/api/v1/transfer/*` vào `3t-api` hiện có (SPEC-3T-CLOUD §3), lưu bản mã tạm trên đĩa, dọn bằng tác vụ định kỳ | máy chủ 3T |

Mobile (iOS/iPadOS/Android): cùng lõi JS trong WebView của vỏ native (xem SPEC-MOBILE); bổ sung quét QR và share-sheet gốc. macOS/Linux: dùng đúng bản desktop hiện tại.

## 4. Offline và riêng tư

- Tính năng này là **tùy chọn, cần mạng**; app vẫn chạy đầy đủ offline (AGENTS.md ưu tiên số 1). Không có mạng: nút hiện thông báo rõ ràng, gợi ý "Lưu tệp rồi chép bằng USB/LAN".
- Chỉ gửi khi người dùng chủ động bấm Gửi và xác nhận; không đồng bộ ngầm.
- Máy chủ không có khóa giải mã; bản mã tự xóa sau 10 phút.

## 5. Việc cần làm (sau khi duyệt)

| # | Việc | Chủ | Kiểm chứng |
|---|---|---|---|
| T1 | Chốt thư viện PAKE (SPAKE2/CPace) giấy phép MIT/BSD, kiểm tra không phụ thuộc trả phí | Platform | báo cáo giấy phép |
| T2 | API máy chủ `/transfer/*` + dọn dẹp + giới hạn tần suất | Server | test API, thử khóa sau 3 lần sai |
| T3 | `platform/transfer/` lõi + test vector đối chiếu (mã sai, hết hạn, đứt mạng giữa chừng, tệp 100 MB) | Platform | unit + E2E hai app desktop qua CDP |
| T4 | Hộp thoại Gửi/Nhận, QR, Hướng dẫn tiếng Việt, i18n VI/EN | Platform + 3 app | CDP, help coverage |
| T5 | Cổng Android/iOS/iPadOS (share-sheet, quét QR) | Mobile | thiết bị thật / giả lập, báo cáo đúng thực tế |
| T6 | Đường LAN trực tiếp (mDNS) | Platform | thử hai máy cùng mạng |

## 6. Cần Người phụ trách quyết định

1. Duyệt dùng máy chủ `office.3tcomputer.com` làm bưu điện chuyển bản mã (không đọc được nội dung).
2. Giới hạn kích thước tệp (đề xuất 100 MB) và thời hạn mã (đề xuất 10 phút).
3. Mã 6 ký tự + PAKE (đề xuất) hay mã dài hơn cho an toàn tối đa.
4. Có làm đường LAN trực tiếp ở giai đoạn 1 hay để giai đoạn 2.
