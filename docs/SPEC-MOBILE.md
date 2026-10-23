# Spec và tư vấn — 3T Office trên di động (iOS / Android)

Ngày: 03/10/2026 · Nhánh thăm dò: `platform/mobile` (nhánh con `mobile/<chủ-đề>`), chỉ bắt đầu sau khi macOS qua mốc M4 (xem `SPEC-MACOS-PORT.md`). Đọc trước: `SPEC-PLATFORMS-AND-BRANCHES.md`.

## 1. Kết luận ngắn (để quyết định)
- **Giao diện và logic nghiệp vụ dùng lại được nhiều** (vì là web). **Động cơ xử lý tài liệu hiện tại (LibreOffice + lớp vá OOXML bằng Python) KHÔNG chạy được trên iOS và rất khó trên Android.** Đây là điểm quyết định toàn bộ kế hoạch di động.
- Vì vậy di động **không phải "biên dịch lại bản desktop"**. Cần chọn một trong các phương án động cơ ở mục 4. Đề xuất: **giai đoạn 1 là "Đọc + sửa nhanh" dùng động cơ trên máy chủ có sự đồng ý của người dùng**, giai đoạn 2 mới làm ngoại tuyến hạn chế bằng bộ phân tích OOXML viết bằng JavaScript.
- Về bán hàng: **iOS và Google Play bắt buộc dùng thanh toán trong ứng dụng cho hàng hóa số** (trừ ngoại lệ hẹp); key vĩnh viễn mua trên web chỉ dùng trong ứng dụng iOS được khi ứng dụng **cũng** cho mua trong ứng dụng (quy tắc "đa nền tảng"). Máy chủ đã thiết kế để nhận cả hai nguồn (mục 6).

## 2. Cái gì dùng chung (và dùng được nguyên trạng)
| Thành phần | Mức dùng lại | Ghi chú |
|---|---|---|
| Giao diện web `apps/*` (ribbon, lưới Sheet, trình soạn Doc, canvas Slide) | **Cao về logic, thấp về bố cục** | Bố cục ribbon rộng cần bản **giao diện cảm ứng** (mục 3) |
| Công thức, định dạng số, chính tả tiếng Việt, tìm/thay thế, nhận diện kiểu, hoàn tác | **Cao** (JS thuần) | Cần kiểm hiệu năng trên điện thoại |
| Hệ lệnh (`command-bus`), i18n tiếng Việt, trợ giúp | **Cao** | Phím tắt không còn là đường chính |
| API máy chủ: bản quyền, cập nhật nội dung/danh mục, báo lỗi | **Cao** | `platform=ios/android` đã có |
| Cầu nối LibreOffice, lớp vá OOXML, mở/lưu DOCX/XLSX/PPTX | **Không** | Xem mục 4 |
| Vỏ Python (`main.py`, instance duy nhất, tiến trình, cập nhật áp dụng) | **Không** | Thay bằng vỏ gốc (Swift/Kotlin) hoặc Capacitor |
| Clipboard liên ứng dụng | Thấp | Clipboard di động hạn chế, đổi sang "chia sẻ" |
| Kiểm thử Node + CDP | Một phần | Android WebView hỗ trợ CDP (Chrome DevTools); iOS dùng Web Inspector — tự động hóa khó hơn |

## 3. Cái cần tinh chỉnh riêng cho cảm ứng và thiết bị nhỏ (liệt kê rõ)
1. **Bố cục**: ribbon → thanh công cụ ngữ cảnh + ngăn kéo; một ứng dụng một màn hình; chế độ dọc/ngang. Điểm chạm ≥ 44×44 pt.
2. **Nhập liệu**: bàn phím ảo che màn hình → cuộn theo con trỏ, thanh công thức/ô nhập nằm trên bàn phím; **bộ gõ tiếng Việt gốc của iOS/Android** (Telex/VNI) gửi sự kiện composition → cần kiểm lại logic gõ, hoàn tác theo từ.
3. **Chọn vùng/di chuyển**: không có chuột phải, di chuột, phím mũi tên: dùng chạm giữ (menu ngữ cảnh), tay cầm chọn, kéo hai ngón; thu phóng bằng chụm.
4. **Hiệu năng/bộ nhớ**: giới hạn RAM nhỏ, tab web bị hệ điều hành đóng khi nền → **lưu tự động liên tục**, tải bảng tính theo vùng (như mục "mở file lớn" của desktop), giới hạn kích thước tệp mở trực tiếp.
5. **Tệp**: không có hệ thống tệp mở; dùng bộ chọn tệp hệ thống, "Mở bằng/Chia sẻ", iCloud/Google Drive/SMB qua nhà cung cấp tệp hệ thống; mô hình **tài liệu trong hộp cát của ứng dụng** + xuất.
6. **Phông chữ**: bộ phông hệ thống khác; đóng gói Be Vietnam Pro, Carlito/Caladea; số đo bố cục có thể lệch bản desktop → chế độ xem "khớp bố cục" khác chế độ sửa.
7. **In/PDF**: dùng dịch vụ in của hệ điều hành; xuất PDF cần động cơ (mục 4).
8. **Cập nhật**: iOS/Android cập nhật qua cửa hàng; chỉ cập nhật **dữ liệu** (từ điển, mẫu) qua API.
9. **Quyền riêng tư**: nguyên tắc "không gửi nội dung tài liệu ra ngoài âm thầm" — mọi đường gửi tài liệu lên máy chủ phải có hộp thoại đồng ý rõ ràng, giải thích, có thể tắt.

## 4. Phương án động cơ tài liệu trên di động (cần chọn)
| Phương án | Mô tả | Độ trung thực định dạng | Ngoại tuyến | Chi phí/rủi ro |
|---|---|---|---|---|
| **A. Động cơ trên máy chủ (chuyển đổi bằng LibreOffice headless đã có)** | Ứng dụng gửi tệp (có đồng ý) lên máy chủ 3T, nhận về dữ liệu dạng ứng dụng đang dùng (FODS gọn/JSON), sửa trên máy, gửi lại để lưu ra DOCX/XLSX/PPTX | **Cao** (cùng động cơ + lớp vá như desktop) | **Không** | Thấp–vừa. Cần: hạ tầng xử lý, bảo mật, giới hạn kích thước, quyền riêng tư; tải máy chủ |
| **B. LibreOffice dịch sang WebAssembly chạy trong ứng dụng** | Động cơ chạy cục bộ trong WebView | Cao | Có | **Rất lớn** (gói hàng trăm MB, bộ nhớ lớn, hiệu năng, độ ổn định); chưa có sản phẩm mã mở sẵn dùng cho thương mại cỡ này |
| **C. Bộ đọc/ghi OOXML viết bằng JS/Kotlin/Swift** | Tự viết hoặc dùng thư viện giấy phép tự do cho XLSX/DOCX/PPTX cơ bản | Trung bình, **kém ở tài liệu phức tạp** (ảnh nổi, trường, bảng lồng, theo dõi thay đổi) | Có | Lớn. Phải tái tạo cả lớp vá "giữ định dạng" ~6.000 dòng Python |
| **D. Ứng dụng chỉ đọc/xem + sửa nhẹ trên bản sao đã được desktop chuẩn bị** | Desktop xuất "gói xem" gọn; di động chỉ xem và sửa văn bản/ô đơn giản; đồng bộ ngược qua tệp | Cao cho xem; thấp cho sửa | Có (xem) | Thấp, nhưng giá trị thương mại hạn chế |

**Tư vấn:**
1. **Giai đoạn 1 (≈2–3 tháng sau khi macOS ổn): Phương án A + giao diện cảm ứng**, ứng dụng *chạy được khi có mạng*, hỏi đồng ý trước mỗi lần gửi tài liệu, ghi rõ chính sách quyền riêng tư; ưu tiên **Android trước** (phát hành và kiểm thử dễ hơn, CDP có sẵn), iOS sau.
2. **Giai đoạn 2**: Phương án C *chỉ cho trường hợp thường gặp* (bảng tính dữ liệu thuần, văn bản đơn giản) để dùng ngoại tuyến; phần phức tạp rơi về A khi có mạng.
3. **Không nên** cam kết "giống hệt desktop ngoại tuyến" trên di động trong năm đầu (B chưa chín muồi).
4. Giữ **một nguồn dữ liệu tài liệu trung gian** (định dạng gọn mà máy chủ sinh ra và giao diện đọc) — chính là hợp đồng giữa động cơ và giao diện. Hiện tại là FODS/"compact payload"; ghi thành **đặc tả hợp đồng dữ liệu tài liệu** (`docs/SPEC-DOCUMENT-PAYLOAD.md`, sẽ viết khi bắt đầu mobile) để mỗi động cơ (LibreOffice desktop, máy chủ, JS) cùng sinh ra đúng định dạng đó.

## 5. Kiến trúc đề xuất (giai đoạn 1)
```
[Ứng dụng di động]  = vỏ gốc (Capacitor hoặc Kotlin/Swift) + WebView chứa giao diện web cảm ứng
       │  chỉ gọi API khi người dùng đồng ý
       ▼
[3T Cloud: API + hàng đợi chuyển đổi]  ← LibreOffice headless (đã có), lớp vá OOXML, giới hạn kích thước/thời gian/IP
       │  (không lưu tài liệu quá thời hạn; xóa sau xử lý; mã hóa trên đường truyền)
       ▼
[Kho bản quyền / cập nhật dữ liệu / báo lỗi] (đã có: platform=ios|android)
```
Capacitor (MIT) cho phép giữ cùng mã web; Android WebView = Chromium → gần như cùng hành vi với desktop; iOS WKWebView → hành vi soạn thảo `contenteditable` khác Chromium, cần **bộ kiểm riêng** (xem rủi ro bên dưới).

## 6. Bán hàng, bản quyền và cửa hàng (máy chủ đã sẵn)
- Máy chủ nhận **nhiều nguồn mua**: `licenses.source = web | apple_iap | google_play | admin` (xem SPEC-ADMIN-COMMERCE §2). Hóa đơn/biên lai từ cửa hàng được **xác minh phía máy chủ** (App Store Server API, Google Play Developer API) rồi cấp quyền; ứng dụng không tự tin tưởng biên lai cục bộ.
- Cấp quyền chéo nền tảng ("mua ở một nơi dùng mọi nơi"): chỉ khi **chính sách cửa hàng cho phép** — iOS yêu cầu cũng phải cho mua trong ứng dụng; Apple/Google lấy 15–30%. Cần Người phụ trách quyết **chiến lược giá** (cùng giá hay giá riêng mobile; gói cho mobile riêng).
- Cần tài khoản Apple Developer (99 USD/năm) và Google Play Console (25 USD một lần).
- Dùng thử, kích hoạt, thu hồi, gỡ máy: **dùng chung API `/license/*`** với `platform`; dấu vân tay thiết bị theo hệ (iOS `identifierForVendor`, Android `ANDROID_ID` băm).

## 7. Rủi ro và cách giảm
| Rủi ro | Giảm thiểu |
|---|---|
| Hành vi soạn thảo WebKit (iOS) khác Chromium | Bộ kiểm riêng trên iOS (Playwright WebKit + thiết bị thật); hạn chế giai đoạn 1 ở soạn thảo cơ bản |
| Bộ nhớ/tệp lớn | Giới hạn kích thước, nạp theo vùng, cảnh báo |
| Quyền riêng tư (gửi tài liệu lên máy chủ) | Đồng ý rõ ràng mỗi lần, chính sách, xóa sau xử lý, không ghi nội dung vào nhật ký; ngoại tuyến là chế độ ưu tiên ở giai đoạn 2 |
| Chi phí vận hành xử lý trên máy chủ | Giới hạn theo gói, hàng đợi, đo mức dùng; có thể đặt gói trả phí cho tính năng chuyển đổi |
| Quy tắc cửa hàng | Thiết kế mua trong ứng dụng từ đầu; tham vấn chính sách trước khi nộp |

## 8. Lộ trình gợi ý
| Giai đoạn | Nội dung | Điều kiện bắt đầu |
|---|---|---|
| **MB0** | Viết `SPEC-DOCUMENT-PAYLOAD.md`; tách giao diện thành "lõi giao diện" độc lập vỏ; thử Capacitor với trang web hiện có trên Android thật | macOS qua M4 |
| **MB1** | Giao diện cảm ứng cho Sheet (xem/sửa ô, nhập hàm, định dạng cơ bản) — giá trị cao nhất với người dùng văn phòng | MB0 |
| **MB2** | Doc (đọc, sửa văn bản, định dạng cơ bản), Slide (xem, sửa chữ) | MB1 |
| **MB3** | Dịch vụ chuyển đổi trên máy chủ + đồng ý quyền riêng tư; mua trong ứng dụng; phát hành Android (nội bộ → Play) | MB1 |
| **MB4** | iOS (bộ kiểm WebKit, App Store, IAP) | MB3 |
| **MB5** | Ngoại tuyến hạn chế bằng bộ đọc/ghi JS | MB3 |

## 9. Việc cần Người phụ trách quyết
1. Mục tiêu di động: **xem + sửa nhanh có mạng** (A) hay **sửa đầy đủ ngoại tuyến** (rất lớn, B/C)? Đề xuất A rồi C.
2. Chấp nhận quy trình gửi tài liệu lên máy chủ 3T khi người dùng đồng ý (phù hợp với nguyên tắc quyền riêng tư không?).
3. Chiến lược giá và mua trong ứng dụng; ai đứng tên tài khoản cửa hàng.
4. Ưu tiên Android hay iOS trước (đề xuất Android).
5. Ngân sách: máy thử, tài khoản cửa hàng, hạ tầng xử lý.

## 10. Cập nhật 23/10/2026 — động cơ ngoại tuyến iOS (phương án C)
Người phụ trách giao team mobile làm **thư viện OOXML ngoại tuyến đầy đủ bằng Swift** cho iOS/iPadOS (không LibreOffice/Python/máy chủ), thứ tự ZIP → XLSX → DOCX → PPTX, mỗi phần có fixture + test mở–sửa–lưu–đóng–mở lại và báo cáo PASS/FAIL trước khi tích hợp UI.
- Mã: `ports/ios/OOXMLKit/` (Swift Package, chỉ Foundation). Nguyên tắc: phần không sửa chép nguyên byte, phần sửa chỉnh trên DOM giữ phần tử lạ, kiểm tra hợp lệ trước khi ghi đè.
- Báo cáo: `docs/ios/BAO-CAO-OOXMLKIT-2310.md` (79/79 test PASS trên Linux; build trên Xcode/thiết bị: BLOCKED trong môi trường agent, cần team Mac/iOS chạy).
- Phương án A (máy chủ) vẫn có thể dùng làm đường dự phòng cho tài liệu phức tạp, nhưng không còn là điều kiện để sửa ngoại tuyến các trường hợp thường gặp.
