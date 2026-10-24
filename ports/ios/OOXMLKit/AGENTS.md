# AGENTS.md — OOXMLKit (động cơ OOXML ngoại tuyến, Swift thuần)

> Đọc file này TRƯỚC khi sửa bất cứ thứ gì trong `ports/ios/OOXMLKit/`.
> Nó bổ sung (không thay thế) `AGENTS.md` gốc của repo. Khi mâu thuẫn: AGENTS.md gốc §2/§8/§11 thắng.

## 0. Một dòng tóm tắt
Thư viện Swift Package đọc/sửa/ghi **DOCX/XLSX/PPTX hoàn toàn ngoại tuyến** cho iOS/iPadOS (và chạy luôn trên macOS/Linux; hướng tới Windows/Android — xem `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md`). Không LibreOffice, không Python, không máy chủ, **không thư viện ngoài, kể cả zlib**.

## 1. Nhánh & tài liệu
- Nhánh phát triển: **`claude/ooxml-offline-ios-library-fqqyj0`** (kho `hieupt91-sketch/3t-office`). Làm tiếp trên nhánh này; đừng tạo nhánh mới trừ khi Người phụ trách bảo.
- Kế hoạch từng phase + đối chiếu: `docs/ios/KE-HOACH-OOXMLKIT-PHASES.md`
- Báo cáo PASS/FAIL (nguồn sự thật về trạng thái): `docs/ios/BAO-CAO-OOXMLKIT-2310.md`
- Quyết định thay LibreOffice (đang chờ duyệt): `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md`
- Hướng dẫn dùng API: `README.md` (cùng thư mục).

## 2. Dựng môi trường & chạy test (BẮT BUỘC chạy trước khi báo PASS — AGENTS.md gốc §8)
Cần **Swift 6.x**. Thư viện chỉ dùng `Foundation`, không UIKit/AppKit.

- **macOS:** Xcode 15+. `open Package.swift` → Product ▸ Test (scheme `OOXMLKit-Package`), hoặc `swift test`.
- **Linux (phiên cloud agent thường KHÔNG có sẵn Swift):** dùng container như CI —
  ```bash
  # cách CI làm (xem .github/workflows/ios-ooxmlkit.yml, job "linux"):
  # chạy trong image swift:6.0 rồi: cd ports/ios/OOXMLKit && swift test
  # hoặc cài toolchain thủ công:
  curl -sSL -o /tmp/swift.tgz https://download.swift.org/swift-6.0.3-release/ubuntu2404/swift-6.0.3-RELEASE/swift-6.0.3-RELEASE-ubuntu24.04.tar.gz
  mkdir -p /opt/swift && tar xzf /tmp/swift.tgz --strip-components=1 -C /opt/swift
  export PATH=/opt/swift/usr/bin:$PATH
  ```
- Lệnh chuẩn (từ thư mục này):
  ```bash
  swift test                                   # debug
  swift test -c release -Xswiftc -enable-testing   # release (nhanh hơn nhiều cho ZIP/Deflate)
  scripts/run-tests.sh                         # test + KIỂM CHÉO độc lập tệp kết quả
  scripts/fixtures/make_all.sh                 # tái tạo fixture tổng hợp (tất định)
  ```
- **Kiểm chéo độc lập** (`scripts/verify_artifacts.py`): cần `python3` + (tùy chọn) `openpyxl python-docx python-pptx` trong venv. Nó mở tệp OOXMLKit lưu ra bằng `zipfile`+zlib (kiểm CRC → chứng minh Deflate đúng chuẩn), `expat`, rồi 3 thư viện Office. Biến môi trường `OOXMLKIT_ARTIFACTS=<thư mục>` khiến test ghi tệp kết quả ra đó để kiểm chéo.

## 3. Quy ước BẮT BUỘC (vi phạm = hỏng dữ liệu người dùng)
1. **Giữ nguyên dữ liệu (lossless):** phần KHÔNG sửa phải được chép **nguyên byte nén** từ tệp gốc (đừng giải nén–nén lại). Phần CÓ sửa: chỉnh trên DOM, **giữ nguyên phần tử/thuộc tính lạ** (`extLst`, `mc:AlternateContent`, `x14ac:*`, `w14:*`…), thứ tự thuộc tính, tiền tố namespace gốc. Phần tử mới chèn **đúng thứ tự lược đồ** (dùng `insertChild(_:schemaOrder:)`).
2. **Không "tự sửa" lỗi có sẵn trong tệp nguồn.** Chỉ lỗi MỚI so với bản gốc mới tính là hỏng (xem `RoundTrip.verify` và `knownSourceIssues`).
3. **Lưu an toàn:** `save(to:)` ghi tệp tạm → mở lại kiểm `PackageValidator` → mới thay tệp đích (nguyên tử). Thất bại thì tệp gốc không được đụng tới.
4. **Mỗi tính năng mới PHẢI có:** fixture + test *mở–sửa–lưu–đóng–mở lại* (`RoundTrip.verify`, khai báo đúng những phần được phép đổi) + kiểm chéo bằng bộ đọc độc lập. Không có test = chưa xong.
5. **Ngoại tuyến tuyệt đối:** không gọi mạng/tiến trình ngoài; không thêm dependency; chỉ `import Foundation` + module nội bộ. `OfflineGuaranteeTests` sẽ chặn vi phạm — đừng vô hiệu hóa nó.

## 4. BẪY đã gặp (đừng lặp lại)
- **Tên kiểu XML:** dùng `XElement`/`XDocument`/`XNode`/`XAttribute` (tiền tố `X`, KHÔNG phải `XML…`). Foundation của **macOS có sẵn `XMLElement`/`XMLDocument`** (NSXML) → trùng tên làm build macOS/iOS gãy (Linux không lộ vì không có NSXML). Đã mất 1 lần CI vì lỗi này.
- **Vòng tham chiếu:** `Workbook`/`WordDocument`/`Presentation` giữ con (Worksheet/Story/Slide) bằng **cache yếu**; con giữ cha **mạnh**. Đừng đổi `Worksheet.workbook`/`Slide` thành `unowned` — từng gây crash.
- **Phần tử tách rời/sao chép mất namespace:** `XElement` nhớ `detachedScope` khi `removeFromParent()`/`deepCopy()`. Nếu tạo phần tử con mới rồi mới gắn vào cây, nó có thể lấy sai tiền tố → gắn vào cây TRƯỚC khi sửa, hoặc tin vào `detachedScope`. Lỗi này đã gặp 3 lần; có test hồi quy `testDetachedAndCopiedElementsKeepNamespaceContext`.
- **Tên mục ZIP phi-ASCII:** phải mã hóa phần trăm theo ECMA-376 phần 2 phụ lục A (`PartName.zipName`). Ghi UTF-8 thô làm python-docx không mở được.
- **CI che lỗi:** mọi bước grep/tail trong workflow phải chạy dưới `bash -eo pipefail` — nếu không, lỗi biên dịch bị `| tail` nuốt và CI báo xanh sai.

## 5. Bố cục module (phụ thuộc một chiều)
`OOXMLZip` (ZIP/Deflate/CRC) → `OOXMLPackage` (XML + OPC: PartName, Relationships, ContentTypes, PackageValidator) → `OOXMLSpreadsheet` / `OOXMLWord` / `OOXMLPresentation` → `OOXMLKit` (gom lại) → `OOXMLBridge` (cầu nối JSON cho WebView, Phase 7). Test dùng chung `OOXMLTestSupport` (`Fixtures`, `RoundTrip`). Fixture: `Tests/OOXMLTestSupport/Fixtures/` — `zip/ deflate/ xlsx/ docx/ pptx/` sinh bằng `scripts/fixtures/*.py`; `real/` chép từ `tests/fixtures/real-office-samples` (LibreOffice tạo). **KHÔNG commit tài liệu thật của người dùng** (`.gitignore` gốc đã chặn `/file test/`).

## 6. Trạng thái (cập nhật khi anh làm xong việc)
- Phase 1 ZIP, 1b XML+OPC, 2 XLSX, 3 DOCX, 4 PPTX, 5 (xóa/chèn/xóa sheet·hàng·cột, theo dõi thay đổi DOCX, thêm slide/thay ảnh PPTX): **✅ xong**, 111 test PASS (Linux debug+release, macOS, simulator iPhone/iPad).
- Phase 6a CI đa nền: ✅. 6b–6d (iPhone/iPad **thật**, mở bằng Microsoft Office thật, bộ tệp Office thật): ⛔ cần người có máy.
- Phase 7: 🟡 **lõi cầu nối `OOXMLBridge` + `OOXMLWebViewBridge` đã xong + test** (xem `docs/ios/SPEC-MOBILE-BRIDGE.md`); còn nhúng WebView/UI cảm ứng/document picker/**Hướng dẫn tiếng Việt** (§10) cần Xcode + thiết bị.
- Giới hạn còn lại (giữ nguyên khi lưu, chưa có API sửa): xem `README.md` mục "Chưa làm" — quan trọng: XLSX **không tính công thức**.

## 6b. Đang chờ Người phụ trách (treo lại, không chặn việc khác)
- Mở 2 tệp OOXMLKit lưu ra bằng **Microsoft Office thật** → xác nhận không có hộp thoại "repair" (mục NOT RUN cuối cùng của tệp Office thật).
- Gửi **file PowerPoint thật** (nội dung giả) để kiểm nốt PPTX.
- Cấp bộ tệp Office **nội dung giả** để commit làm fixture (hoặc dùng `scripts/sanitize_fixture.py` trên file thật rồi RÀ tay trước khi commit — tool từ chối ghi nếu còn nghi ngờ rò dữ liệu).
- Duyệt bắt đầu **Phase 7** theo `docs/ios/SPEC-MOBILE-BRIDGE.md` (thứ tự Sheet → Doc → Slide).

## 7. Dừng-và-hỏi (ngoài AGENTS.md gốc §11)
- **Không gỡ/đụng LibreOffice hay mã desktop** tới khi ADR được duyệt.
- Không đổi tên public API đang có test mà không cập nhật test.
- Kết thúc mỗi task bằng handoff trong `/09-templates/AGENT-HANDOFF.md` (§9) và cập nhật `docs/ios/BAO-CAO-OOXMLKIT-2310.md`.
