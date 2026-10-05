# Báo cáo tổng quan dự án 3T Office — 06/10/2026

Phạm vi: bản 1.0 chạy trên Windows, bán cho doanh nghiệp. **Phần trăm là ước lượng của Claude** theo cách tính ở mục 3, không phải số do công cụ sinh ra. Mọi số đo đều lấy từ lần chạy trong ngày 05–06/10 trên nhánh `main`.

## 1. Bằng chứng kiểm tra hôm nay
| Hạng mục | Kết quả |
|---|---|
| Node (giao diện, adapter, trợ giúp) | 2775/2775 PASS |
| Python | 731/732 PASS; 1 lỗi là kiểm tra phương trình Writer đọc lại bằng Word thật, Word báo "đang bận" (môi trường) |
| Hồi quy desktop 3 app | 27 PASS, 0 FAIL, 6 N/A |
| Sheet: 28 file xlsx LAN mở, lưu, đối chiếu | 28/28 lưu được, thứ tự sheet khớp, 0 ô sai lệch, cấu trúc xlsx sạch. Đối chiếu bằng Excel thật: chưa chạy được (Excel báo "đang bận") |
| Sheet: kiểm tra lại qua CDP | 24 PASS, 2 FAIL, 12 BLOCKED. Lỗi thật `=$B$1+B1` → `#VALUE!` đã sửa và đẩy lên `main` |
| Slides: kiểm tra lại qua CDP | 23/23 PASS (nhiều bước gọi hàm trực tiếp, chưa phải chuột thật) |
| Writer: tạo tính năng bằng app rồi giải nén DOCX | 46 PASS, 4 FAIL (xem mục 4) |
| Tốc độ mở lan14 đầy đủ | ≈ 57 giây (từ 70); mục tiêu 35 giây chưa đạt |
| Phát hành | 0.9.9 vẫn treo theo lệnh chủ sở hữu |

## 2. Chi tiết từng phần
| Phần | Ước lượng | Đã có | Còn thiếu / rủi ro |
|---|---:|---|---|
| **VN Writer (Doc)** | 85% | 26/28 tính năng hạng 1–2 theo roadmap; header/footer, theo dõi thay đổi, ghi chú lưu đúng DOCX; định dạng ký tự đúng; hộp thoại Đoạn văn | Khả năng lỗi: căn đều và khoảng cách sau đoạn mặc định không được ghi vào DOCX. Chưa có cổng số trang Word vs bản lưu (Word COM bận). Chưa có macro, đồng soạn thảo |
| **VN Sheet** | 88% | 24/26 tính năng; 28 file LAN lệch 0 ô; công thức cơ bản đúng; xem nhanh mặc định bật cho xlsx lớn hơn 5 MiB; đã sửa lỗi tham chiếu tuyệt đối | 12 mục UI chưa kiểm được (chèn/xóa hàng cột, kéo điền, merge, sắp xếp, lọc, biểu đồ, hộp thoại mở/lưu/in). Nhập `₫250000` hiện thành chuỗi. File xls/doc cũ chỉ kiểm theo bộ 20 file |
| **VN Slides** | 78% | 16/17 tính năng; 23/23 mục cơ bản; lưu và mở lại pptx khớp | Chỉ có 5 file pptx mẫu nên độ phủ thấp; slide ưu tiên sau theo quyết định 19/9; chưa có đồng soạn thảo |
| **Nền tảng chung** (lệnh, ribbon, trợ giúp, i18n, in, clipboard) | 90% | Trợ giúp tiếng Việt có kiểm thử phủ; bộ in nhanh; clipboard liên ứng dụng | Một số chuỗi phụ còn cứng; Mac chưa kiểm |
| **Tốc độ mở file (spec perf)** | 85% | 10/11 phase xong hoặc đóng có bằng chứng; Doc nặng 173 → 23–27 s; xem trước in 3–5 lần nhanh hơn | Mục tiêu lan14 35 giây chưa đạt (57 giây) |
| **Phân phối** (bộ cài, cập nhật, khóa bản quyền phía máy khách, báo lỗi cục bộ) | 80% | Setup NSIS, cập nhật tự động có chữ ký, khóa kích hoạt offline, tự khôi phục, báo lỗi lưu cục bộ | Bộ cài chưa ký số; chưa cài đặt hàng loạt; chưa khóa tính năng |
| **Thương mại + G5 máy chủ** | 50% | `server/3t-api` và web: 43 test pytest, 500 test web, đã vá lỗi bảo mật | Chưa triển khai VPS; chờ quyết nhà cung cấp thanh toán, tài khoản nhận tiền, chính sách đơn miễn phí; G5 đang treo |
| **macOS** | 35% | Dịch vụ hệ điều hành có `portable.py`, nhánh `ps` cho tiến trình, mã máy qua `ioreg`, bảng đo phông | Chưa chạy trên máy mac thật; team Mac chưa merge `main` |
| **Mobile** | 5% | Chỉ có đặc tả `docs/SPEC-MOBILE.md` | Chưa có mã riêng |
| **Pháp lý và tuân thủ** | 40% | Xem mục 5 | EULA, chính sách bảo mật, SBOM, ký số, rà soát luật sư, dọn từ điển GPL |

## 3. Cách tính tổng
Trọng số cho bản bán Windows: Doc 22, Sheet 22, Slides 8, nền tảng chung 8, tốc độ 10, phân phối 10, thương mại + G5 10, pháp lý 10.
Tổng = 0,22·85 + 0,22·88 + 0,08·78 + 0,08·90 + 0,10·85 + 0,10·80 + 0,10·50 + 0,10·40 ≈ **77%**.
macOS và mobile nằm ngoài tổng này (lộ trình riêng). Nếu bỏ G5 và thương mại khỏi tính (đang treo), phần còn lại ≈ 84%.

## 4. Lỗi và rủi ro đang mở (theo mức độ)
1. **Có thể mất căn đều khi lưu DOCX** (Writer): đoạn căn đều lưu thành căn trái; cần Word chạy được để kiểm số trang trước khi sửa đường lưu.
2. **Khoảng cách sau đoạn mặc định không xuất ra DOCX.**
3. **Word/Excel COM trên máy kiểm thử báo "đang bận":** làm mất cổng đối chiếu bằng Office thật. Cần mở Office bằng tay một lần để xóa hộp thoại đầu tiên.
4. **Nhập tiền Việt có ký hiệu ₫** thành chuỗi chữ (cần quyết có coi là lỗi).
5. **12 mục UI Sheet** chưa kiểm được qua CDP vì cần thao tác chuột hoặc hộp thoại hệ điều hành.
6. **lan14 mở đầy đủ 57 giây**, mục tiêu 35 giây.
7. **Bản nháp phát hành 0.9.9 còn ghi xem nhanh "tắt mặc định"** trong khi thực tế đã bật; cần sửa trước khi phát hành.

## 5. Pháp lý: hiện trạng
**Đã ổn:** giấy phép các thành phần chính cho phép bán thương mại (LibreOffice MPL-2.0, Python PSF, pywebview BSD, pythonnet/bottle MIT, phông Be Vietnam Pro OFL, WebView2 miễn phí kèm app); không có tài liệu thật của công ty được git theo dõi (kiểm tra: 0 file); quy tắc không chép thương hiệu và tài sản Microsoft; từ điển chính tả tiếng Việt tự biên từ nguồn CC0; nguyên tắc không gửi nội dung tài liệu ra ngoài.

**Cần xử lý trước khi bán:**
| Việc | Loại | Ai làm | Ưu tiên |
|---|---|---|---|
| Bỏ từ điển và gói mở rộng LibreOffice không dùng (24 gói GPL, kể cả `dict-vi`, 24 gói LGPL; tổng khoảng 462 MB) | Kỹ thuật | Claude/Codex, cần chủ sở hữu duyệt vì chạm `build-pilot.ps1` | Cao |
| Bổ sung WebView2 và thư viện con của LibreOffice vào thông báo bên thứ ba; sinh SBOM | Kỹ thuật | Codex | Cao |
| Soạn EULA, chính sách bảo mật, điều khoản dùng thử | Văn bản | Claude soạn nháp, luật sư duyệt | Cao |
| Đối chiếu Nghị định 13/2023/NĐ-CP (mã máy, báo lỗi, email khách) | Pháp lý | Luật sư | Cao |
| Chứng thư ký số cho bộ cài | Mua | Chủ sở hữu | Cao |
| Rà nhãn hiệu "3T" và kiểu dáng giao diện; đăng ký nhãn hiệu | Pháp lý | Luật sư, Cục Sở hữu trí tuệ | Trung bình |
| Nhà cung cấp thanh toán, hóa đơn điện tử, thuế, hoàn tiền, chính sách đơn miễn phí | Quyết định + mua dịch vụ | Chủ sở hữu | Trung bình |
| Xác nhận nghĩa vụ MPL (dẫn nguồn LibreOffice đi kèm) | Văn bản | Luật sư/Claude | Trung bình |
| Cài đặt hàng loạt, kích hoạt offline cho doanh nghiệp, SLA hỗ trợ | Sản phẩm + hợp đồng | Chủ sở hữu | Khi có khách |

**Không cần mua** giấy phép cho LibreOffice, Python, WebView2, NSIS và các thư viện hiện dùng. **Không tự viết lại được:** engine LibreOffice, Chromium/WebView2, chứng thư ký số, nhãn hiệu đã đăng ký, cổng thanh toán. **Tự làm được:** khóa bản quyền (đã có), cập nhật, bộ cài, từ điển CC0, nháp văn bản pháp lý (cần luật sư duyệt), SBOM.

## 6. Việc tiếp theo đề xuất (không cần mua gì)
1. Mở Office bằng tay một lần để chạy lại cổng đối chiếu Word/Excel, rồi sửa hai lỗi lưu DOCX.
2. Dọn bộ cài LibreOffice, bổ sung thông báo, sinh SBOM (cần chủ sở hữu đồng ý động vào `build-pilot.ps1`).
3. Soạn nháp EULA, chính sách bảo mật.
4. Kiểm nốt 12 mục UI Sheet bằng đường DOM đã xác nhận.
5. Chờ chủ sở hữu quyết: phát hành 0.9.9, chính sách sau 30 ngày dùng thử, nhà cung cấp thanh toán, chính sách đơn miễn phí; G5 vẫn treo.
