# ADR — OOXMLKit làm lõi tài liệu dùng chung, thay dần LibreOffice

Trạng thái: **ĐỀ XUẤT — chờ Người phụ trách duyệt** · Ngày: 23/10/2026 · Liên quan: AGENTS.md §3 (thứ tự quyết định), §6 (plan gate), §11 (stop-and-ask: bỏ dependency lớn, đổi document model)

## 1. Bối cảnh & mong muốn
Người phụ trách nêu định hướng: thay vì phụ thuộc **LibreOffice**, xây một **động cơ tài liệu riêng của 3T**, dùng chung cho iOS, iPadOS, Android, Windows, macOS — để tự chủ, nhẹ, đồng bộ hành vi trên mọi nền.
OOXMLKit (Swift thuần, chỉ Foundation) là ứng viên cho lõi đó. Đã chạy 103/103 test trên **Linux** (swift-corelibs-foundation) + macOS + simulator iPhone/iPad.

## 2. LibreOffice đang làm 5 việc — OOXMLKit mới thay được việc (1)
| Vai trò của LibreOffice trong VN Office hiện tại | OOXMLKit | Ghi chú |
|---|---|---|
| (1) **Đọc/ghi + giữ định dạng OOXML** (DOCX/XLSX/PPTX) | ✅ **Đã thay được, và tốt hơn** | LibreOffice phải vòng qua ODF rồi vá lại ~6.000 dòng Python; OOXMLKit **chép nguyên byte** phần không sửa — không mất mát, không qua định dạng trung gian |
| (2) **Tính công thức** (XLSX) | ⚠️ một phần | 3T **đã có** engine công thức JS `apps/sheet/formula-engine.js` (đối chiếu 28 workbook thật). Cần đấu nối, không phải viết lại từ đầu |
| (3) **Hiển thị/dàn trang** (ngắt dòng, font metrics, bố cục trang) | ❌ chưa | **Phần nặng nhất.** Nhưng UI hiện là web trong WebView — phần render đã do web UI đảm nhiệm một phần, không hoàn toàn là LibreOffice |
| (4) **Xuất PDF / in** | ❌ chưa | Phụ thuộc (3). Mobile: dùng dịch vụ in của iOS/Android. Desktop: cần giải pháp (in qua WebView → PDF, hoặc giữ LibreOffice chỉ cho bước này) |
| (5) **Định dạng cũ** DOC/XLS/PPT nhị phân, ODF, RTF | ❌ ngoài phạm vi | Có thể chấp nhận bỏ, hoặc giữ LibreOffice **chỉ để nhập** file cũ rồi lưu ra OOXML |

**Kết luận thẳng:** OOXMLKit thay được **lớp đọc/ghi file** của LibreOffice ngay, và thay tốt hơn. "Bỏ hẳn LibreOffice" còn phụ thuộc (3) render và (4) PDF — đây mới là khối lượng lớn, và là chỗ cần quyết định mức tham vọng.

## 3. Hai mức tham vọng (cần chọn)
- **Mức A — "giống hệt Office từng pixel"**: tự viết động cơ dàn trang trung thực tuyệt đối. **Rất lớn** (nhiều năm, cỡ viết lại một phần LibreOffice). Không khuyến nghị.
- **Mức B — "hiển thị bằng web UI là đủ, OOXMLKit lo file + JS lo công thức"**: render bằng HTML/CSS trong WebView (đã có sẵn hướng này), OOXMLKit làm I/O, engine JS tính công thức, PDF xuất qua WebView hoặc dịch vụ OS. **Khả thi, tiệm tiến.** Khuyến nghị.

## 4. Lộ trình đề xuất (Mức B) — thay theo lớp, không "thay một phát"
| Giai đoạn | Nội dung | Gỡ được gì khỏi LibreOffice |
|---|---|---|
| **G1 (đang làm)** | Mobile iOS/iPadOS vốn **không có** LibreOffice → OOXMLKit là engine chính. Chứng minh round-trip không mất dữ liệu. | — (nơi chứng minh) |
| **G2** | Android: build OOXMLKit bằng Swift Android SDK (hoặc cân nhắc cổng logic sang Kotlin dùng chung web UI). | — |
| **G3** | Desktop chạy **song song**: OOXMLKit làm I/O, **đối chiếu** kết quả với LibreOffice trên bộ 28 XLSX thật + bộ Word thật **đã có trong repo** (`tests/fixtures`, `file test/`). Dựng "parity gate": chỉ gỡ khi OOXMLKit đạt ngưỡng. | Lớp đọc/ghi file (vai trò 1) |
| **G4** | Đấu nối engine công thức JS cho giá trị đệm khi lưu. | Vai trò tính công thức (2) |
| **G5** | Giải quyết xuất PDF (WebView→PDF) + chốt cách xử lý file cũ (giữ LibreOffice chỉ cho nhập, hoặc bỏ). | Vai trò (4), (5) → **bỏ hẳn LibreOffice** |

Mỗi giai đoạn: có fixture + test mở–sửa–lưu–đóng–mở lại + báo cáo PASS/FAIL, như G1.

## 5. Vì sao hợp với kiến trúc hiện tại
- Đúng AGENTS.md "một monorepo, một lõi dùng chung"; OOXMLKit là lõi I/O chạy mọi nền.
- Không vi phạm "REUSE BEFORE REWRITE": với mobile, **không có gì để reuse** (LibreOffice không chạy iOS) nên viết mới là bắt buộc; với desktop, dùng **parity gate** để không bỏ LibreOffice trước khi chứng minh tương đương.
- Bằng chứng đa nền đã có: engine chạy trên Linux/swift-corelibs-foundation = nền Foundation của cả Windows và Android.

## 6. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Render trung thực (vai trò 3) bị đánh giá thấp | Chốt Mức B rõ ràng; không cam kết "từng pixel" |
| Xuất PDF desktop | Giữ LibreOffice tạm cho riêng PDF tới hết G5 |
| Swift trên Android còn mới | G2 có nhánh dự phòng: cổng logic sang Kotlin, dùng chung web UI |
| Thiếu tệp Office thật trong bộ test | Team Windows cung cấp bộ tệp không chứa dữ liệu cá nhân (đã nêu ở báo cáo) |

## 7. Quyết định cần từ Người phụ trách
1. Chọn **Mức A hay B** (khuyến nghị **B**).
2. OOXMLKit là **lõi dùng chung đa nền** hay chỉ **engine mobile**? (khuyến nghị: lõi dùng chung, nhưng **chưa** gỡ LibreOffice desktop tới khi qua parity gate G3).
3. Android: Swift-on-Android hay cổng Kotlin?
4. Cho phép dựng "parity gate" desktop (chạy song song OOXMLKit ↔ LibreOffice trên corpus thật) — đây là việc G3 an toàn, không gỡ gì.

Chưa có mã desktop/LibreOffice nào bị đụng tới. ADR này chỉ để quyết hướng.
