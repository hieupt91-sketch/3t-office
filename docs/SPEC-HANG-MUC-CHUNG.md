# Spec triển khai — Hạng mục CHUNG của 3T Office (CH-1 → CH-9)

Ngày: 01/10/2026 · Người quyết định thứ tự: Người phụ trách dự án · Điều phối và nghiệm thu: Claude (chỉ giao việc + kiểm tra, không tự viết code).
Thứ tự ưu tiên: phần chung trước, rồi 3T Doc → 3T Sheet → 3T Slide. **Cập nhật 01/10 17:50:** KHÔNG chờ xong hết phần chung mới làm từng app — xem mục "Kế hoạch theo đợt" ở cuối tài liệu (Đợt A làm ngay, Đợt B chạy song song với việc từng app).

## 0. Quy tắc áp dụng cho mọi hạng mục

1. **Nằm ở Shared Platform** (`platform/**`, `adapters/libreoffice/common/**`, `main.py` phần dùng chung). Không copy cùng một logic vào `apps/writer`, `apps/sheet`, `apps/slides`.
2. **Mỗi agent làm trong worktree + nhánh riêng**; không sửa `E:\VN OFice` trực tiếp; không tự gộp vào `main`.
3. **Cấm nhập liệu cấp hệ điều hành** (SendKeys, SendInput, keybd_event, mouse_event, pyautogui, gõ vào Office đang hiện). Thử app desktop **chỉ qua WebView2 remote debugging + CDP**; Office chỉ qua COM ẩn.
4. **Nghiệm thu trên APP DESKTOP** (pywebview/WebView2), không chỉ trên trình duyệt.
5. **Cổng kiểm tra bắt buộc trước khi gộp**:
   - `node tests/run-tests.js` 0 FAIL (chỉ 3 bài soffice FODS→XLSX được phép lỗi khi máy tải nặng; phải chạy lại riêng và ghi rõ).
   - `python -m unittest discover -s tests` khi đụng Python.
   - Đụng mở/lưu Sheet: `scripts/layout-audit/_batch_audit.py` 26 file LAN — mọi file TONG 0 và lint sạch.
   - Đụng mở/lưu Doc: `scripts/layout-audit/_batch_writer.py` trên `file test/landocx` — số trang Word gốc = bản lưu.
6. **Hướng dẫn sử dụng tiếng Việt** trong `platform/help` cho mọi thay đổi người dùng nhìn thấy; dùng tên 3T Office / 3T Doc / 3T Sheet / 3T Slide.
7. Báo cáo trung thực PASS / FAIL / NOT RUN / BLOCKED kèm số đo.

---

## CH-1 · Tốc độ (ưu tiên số 1 — "nguyên tắc sống còn")

**Mục tiêu:** khởi động và mở tài liệu nhanh như Word/Excel/PowerPoint, LibreOffice, WPS.

**Hiện trạng đo (01/10, `docs/HANDOFF-OPEN-SPEED.md`):** cửa sổ 0,9 s · giao diện sẵn sàng 1,7 s · chuyển đổi qua LibreOffice **khi soffice nguội 13–23 s**, khi ấm 1–4 s · mở tài liệu thứ hai trong cùng tiến trình 0,24–0,35 s · lan14.xlsx tràn bộ nhớ WebView.

| Mã | Việc | Tiêu chí nghiệm thu (đo trên app desktop, máy hiện tại) |
|---|---|---|
| CH-1.1 | Khởi động lạnh: hiện tài liệu trống và gõ được trước; LibreOffice, kiểm tra cập nhật, báo lỗi, chỉ mục Trợ giúp, hộp thoại nặng chạy SAU khi hiện | Tài liệu trống gõ được **< 3 s** cho cả 3 app; bảng thời gian từng bước trong `docs/HANDOFF-COLD-START.md` |
| CH-1.2 | LibreOffice luôn ấm: khởi động UNO worker ngầm ngay khi app mở; mở file khi worker đang ấm lên thì dùng lại, không bật soffice thứ hai | Mở d03.docx / lan05.xlsx lần đầu sau khi bật app **≤ 5 s** (trước 16–26 s) |
| CH-1.3 | "3T Office Khởi động nhanh": giữ 1 soffice ấm từ lúc đăng nhập Windows; tắt sạch khi cập nhật/gỡ cài | **ĐÃ CHỐT (Người phụ trách 01/10):** BẬT mặc định nếu RAM nhàn rỗi đo được **< 150 MB**; máy có RAM ≤ 4 GB thì mặc định TẮT; người dùng tắt/bật được trong Tùy chọn và ở bộ cài (ô chọn). Mở file đầu tiên trong ngày ≤ 3 s |
| CH-1.4 | Mở xlsx không qua LibreOffice (payload đọc trực tiếp, cờ `SHEET_OPEN_PAYLOAD`) | 26/26 file LAN TONG 0 + lint sạch với cờ BẬT; lan14 mở không tràn bộ nhớ; rồi mới bật mặc định |
| CH-1.5 | Hiển thị trang: Doc hiện trang 1 ngay, dàn trang sau từng phần; Sheet cuộn ảo hàng/cột | d24 (16 trang), d01 (19 trang): trang 1 hiện < 1 s sau khi có nội dung; cuộn hết tài liệu không có tác vụ > 100 ms; lan11/lan09 cuộn nhanh không đơ |
| CH-1.6 | Bảng đo chuẩn so sánh | Bảng 9 loại tệp: 3T vs Word/Excel/LibreOffice/WPS, lạnh/ấm, cập nhật mỗi lần phát hành |

**Đang làm:** Codex `perf/open-speed-codex` (CH-1.4), `perf/render-and-warm-codex` (CH-1.2, 1.3, 1.5), `fix/file-basics-clean-start-codex` (CH-1.1).

---

## CH-2 · Cập nhật một chạm

**Mục tiêu:** người dùng không bao giờ cài lại; bản vá tự tải, bấm **Khởi động lại ngay** là xong.

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-2.1 | Thử luồng thật: máy cài 0.9.5 nhận 0.9.6 từ `\\192.168.1.252\company1\Software\VNOffice\updates` | Thông báo "Có bản cập nhật 3T Office 0.9.6" hiện ≤ 2 phút sau khi mở app; bấm nút → app tắt, áp bản vá, mở lại đúng tài liệu; phiên bản hiện 0.9.6 |
| CH-2.2 | Tài liệu chưa lưu khi cập nhật | Hỏi Lưu / Hủy; không mất dữ liệu; AutoRecover giữ bản khôi phục |
| CH-2.3 | Lỗi giữa chừng (mất mạng, file khóa, bản vá hỏng chữ ký) | Tự quay lại bản cũ, app vẫn mở được, có thông báo tiếng Việt dễ hiểu |
| CH-2.4 | Nhiều cửa sổ đang mở (một tiến trình) | Một lần bấm khởi động lại mở lại đủ các cửa sổ |
| CH-2.5 | Ghi chú phát hành tiếng Việt hiện trong app (Trợ giúp → Có gì mới) | Hiện đúng nội dung `notes-x.y.z.txt` |
| CH-2.6 | Chính sách bản quyền: gói vĩnh viễn nhận cập nhật 1 năm, gói thuê bao nhận liên tục | Thiết kế ghi trong spec riêng trước khi lên VPS (không làm ngay) |

---

## CH-3 · In và Xuất PDF

**Mục tiêu:** bản in và PDF giống Word/Excel/PowerPoint.

**Hiện trạng:** có Office → dựng PDF bằng Office, khớp tuyệt đối (lan05 14/14, lan11 306/965, lan28 2/36); không có Office → LibreOffice còn lệch (lan05 3 vs 14).

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-3.1 | Gộp nhánh G10 parity (đang kiểm 26 file) | 26 file TONG 0; hộp thoại có 3 lựa chọn như Excel (trang tính hiện hành / cả sổ / vùng chọn) |
| CH-3.2 | Xem trước = bản in | Số trang xem trước = số trang PDF cho Doc, Sheet, Slide (lan25: 6 vs 7 trước đây) |
| CH-3.3 | LibreOffice dự phòng sát Excel | Liệt kê từng nguyên nhân lệch (vùng in, co giãn, ngắt trang, hàng ẩn, khổ giấy); lan05/lan11/lan28 lệch ≤ 1 trang hoặc có giải thích bằng chứng vì sao không làm được |
| CH-3.4 | Doc không có Office | d01/d16/d20 số trang khớp Word ± 0 |
| CH-3.5 | Máy in thật | In ra máy in mặc định, chọn số bản, phạm vi trang, in hai mặt nếu máy hỗ trợ |

---

## CH-4 · Bàn phím và Clipboard

**Mục tiêu:** thao tác bàn phím và dán giống Office ở cả 3 app, từ một module chung.

**Đã xong (0.9.6):** Enter, Tab chèn tab, Ctrl+X/C/V qua sự kiện gốc + cầu clipboard Python, Sheet nhận phím ngay khi mở.

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-4.1 | Module chung `platform/clipboard`: đọc/ghi HTML + văn bản, chuyển đổi định dạng Word/Excel, dùng cho cả 3 app | Không còn mã dán riêng trong từng app ngoài phần áp vào mô hình |
| CH-4.2 | Dán từ Excel vào Sheet | Số là số, ngày, %, định dạng số, đậm/nghiêng, màu, nền, viền, ô gộp đúng |
| CH-4.3 | Dán từ Word vào Doc | Tiêu đề, danh sách, bảng, liên kết, cỡ chữ, màu giữ nguyên; bỏ mã rác mso- |
| CH-4.4 | Dán chéo app: bảng Sheet → Doc/Slide; đoạn Doc → Slide | Ra bảng/đoạn có định dạng |
| CH-4.5 | Dán đặc biệt (Ctrl+Alt+V) và dán chữ thuần (Ctrl+Shift+V) | Doc: Giữ định dạng nguồn / Chỉ giữ văn bản; Sheet: thêm Chỉ giá trị / Chỉ định dạng / Chuyển vị; mỗi lần dán = 1 bước Hoàn tác |
| CH-4.6 | Giữ bàn phím trong vùng soạn thảo (cơ chế chung) | Sau khi đóng mọi hộp thoại, sau lệnh ribbon, sau khi đổi cửa sổ: gõ ngay được, Enter không kích hoạt nút |
| CH-4.7 | Gõ tiếng Việt Unikey/EVKey (Telex, VNI) không nhảy con trỏ, không mất dấu, kể cả khi kiểm tra chính tả đang chạy | Kịch bản CDP mô phỏng chuỗi Unikey trên Doc, Sheet, Slide |

**Đang làm:** opencode `feat/clipboard-office-interop-agy` (CH-4.2, 4.3, 4.5).

---

## CH-5 · Mở / Lưu giống Office

**Mục tiêu:** mở hiển thị như Office; lưu xong mở lại bằng Office thấy đúng.

**Hiện trạng:** docx 23/24 đúng số trang sau lưu; xlsx 26/26 không lệch; pptx chưa đo; định dạng cũ .doc/.xls chiếm 41% tệp công ty nhưng ít được đo.

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-5.1 | Nguyên tắc "giữ nguyên phần không sửa" dùng chung cho docx/xlsx/pptx (phần OOXML gốc không bị viết lại nếu người dùng không sửa) | Mở → lưu không sửa: phần XML của mục không sửa giữ nguyên; có test cho cả 3 loại |
| CH-5.2 | Bộ đo pptx thật (lấy mẫu từ ổ LAN, không đưa ra ngoài, không commit) | Số trang chiếu, chữ, hình, ảnh, ghi chú, kích thước trang giống PowerPoint sau khi lưu |
| CH-5.3 | Định dạng cũ .doc / .xls / .ppt | Mở được, hiển thị đúng; Lưu thành định dạng mới không mất nội dung; đo trên mẫu LAN |
| CH-5.4 | Không ghi đè giá trị file gốc đã lưu sẵn (ví dụ #REF!, #NAME? trong xlsx) | Kiểm qua bộ 26 file |
| CH-5.5 | Thông báo lỗi khi mở tệp hỏng/khóa/mật khẩu | Tiếng Việt, rõ nguyên nhân, giữ tài liệu đang mở |
| **CH-5.6** | **Mất dữ liệu khi lưu docx (Người phụ trách duyệt 01/10, ưu tiên cao nhất trong CH-5):** đầu/chân trang trống khi mở bằng Word; mất theo dõi thay đổi; mất chú thích | Word mở bản lưu thấy đúng đầu/chân trang + trang đầu khác, `Revisions.Count` và `Comments.Count` đúng; tài liệu tạo bằng Word mở → lưu không mất gì |

---

## CH-6 · Bộ kiểm tra tự động chung

**Mục tiêu:** mọi agent và Claude kiểm cùng một cách, trên app desktop.

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-6.1 | `tests/live/cdp/`: thư viện CDP chung (khởi động app với cổng debug, gõ phím, chuột, kéo, đọc trạng thái, đóng app) | Thay thế các script rời `cdp_keys.mjs`, `cdp_formula.mjs`, `cdp_types.mjs`, `cdp_tab.mjs` |
| CH-6.2 | Bộ kịch bản hồi quy desktop cho Doc, Sheet, Slide | Chạy một lệnh, ra bảng PASS/FAIL; gồm Enter/Tab/Ctrl+X/V, nhập kiểu dữ liệu, nhập hàm, Mới/Mở/Lưu/In |
| CH-6.3 | Khung đo mở/lưu chung (gộp `_batch_audit.py`, `_batch_writer.py`, thêm pptx) | Một báo cáo chung 3 loại tệp; linter XLSX đã sửa báo giả |
| CH-6.4 | Khung so số trang in với Office cho 3 app | Dựa trên `_print_page_audit.py` |
| CH-6.5 | Kiểm tra cấm nhập liệu cấp hệ điều hành | Test quét mã nguồn/tests: không có SendKeys/SendInput/mouse_event/pyautogui |

---

## CH-7 · Công cụ soạn thảo dùng chung

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-7.1 | Tìm / Thay thế (Ctrl+F / Ctrl+H) chung một hộp thoại, tùy chọn khớp chữ hoa/cả từ | Hoạt động giống nhau ở 3 app |
| CH-7.2 | Kiểm tra chính tả tiếng Việt chung, chạy lúc rảnh, không bao giờ di chuyển con trỏ | Gạch đỏ + gợi ý ở Doc, Sheet, Slide |
| CH-7.3 | Chèn ảnh / hình / hộp văn bản / ký hiệu / liên kết chung | Cùng hộp thoại, cùng thao tác kéo/đổi cỡ |
| CH-7.4 | Phương trình (đang làm cho Doc) dùng lại cho Slide | Alt+= ở Slide; lưu OMML trong pptx |
| CH-7.5 | Biểu đồ: Sheet là gốc, Doc/Slide chèn biểu đồ dùng lại bộ vẽ | Lưu đúng biểu đồ thật trong docx/pptx |
| CH-7.6 | Chú thích (comment) chung | Thêm/trả lời/xóa; lưu đúng trong cả 3 định dạng |

---

## CH-8 · Giao diện và Trợ giúp thống nhất

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-8.1 | Ribbon, thanh trạng thái, thu phóng (thanh trượt + Ctrl+lăn), Tệp gần đây, Backstage giống nhau ở 3 app | Danh sách kiểm từng phần tử |
| CH-8.2 | Phím Alt hiện phím tắt ribbon (KeyTips) | Có ở cả 3 app |
| CH-8.3 | Trợ giúp F1 theo ngữ cảnh, "Có gì mới" theo bản vá | Mở đúng mục |
| CH-8.4 | 100% tiếng Việt, tên 3T, không dùng tên/biểu tượng Microsoft | Test quét chuỗi |
| CH-8.5 | Chế độ tối/sáng, cỡ chữ giao diện | Đồng nhất |

---

## CH-9 · Ổn định và báo lỗi

| Mã | Việc | Tiêu chí nghiệm thu |
|---|---|---|
| CH-9.1 | Báo lỗi gửi về VPS | **Đã mở khóa (01/10):** địa chỉ lấy từ 3T Cloud (`office.3tcomputer.com`, cấu hình được, xem `docs/SPEC-3T-CLOUD.md`); báo lỗi xin phép người dùng, không gửi nội dung tài liệu; làm sau khi 3T Cloud GĐ1 chạy |
| CH-9.2 | Tự lưu khôi phục cho cả 3 app | Tắt ngang app → mở lại có hộp thoại khôi phục |
| CH-9.3 | Một tiến trình nhiều cửa sổ, tự phục hồi khi tiến trình chính chết | Đã có (G11); thêm vào bộ CH-6 |
| CH-9.4 | Dọn tiến trình treo (soffice, Office ẩn do app mở) khi thoát | Không còn tiến trình mồ côi sau khi đóng app |
| CH-9.5 | Nhật ký hiệu năng nội bộ (không gửi đi) để chẩn đoán chậm | Bật bằng tùy chọn |

---

## Kế hoạch theo đợt (cập nhật 01/10/2026 17:50)

Quyết định của Người phụ trách: tập trung làm xong **việc ngắn trước (tối 01/10 và sáng 02/10)**; việc dài chạy **song song** với việc chi tiết từng app, không chờ nhau.

**Đợt A — làm ngay, mục tiêu xong tối nay / sáng mai (để có bản 0.9.7):**

| Mục | Việc còn lại | Người làm |
|---|---|---|
| CH-2 | Sửa launcher (chỉ `CREATE_NO_WINDOW`), nhật ký, mở lại, banner ≤ 2 phút; Claude thử bản cài thử 0.9.7 + bản vá 0.9.8; máy ≤ 0.9.6 cài Setup 0.9.7 một lần | Codex |
| CH-8 | Gỡ xung đột `platform/shell/app-shell.js` với nhánh khởi động nhanh; Claude thử F1/Ctrl+0 trên desktop rồi gộp (F1 đã thử đạt trên Doc, Sheet) | agy (gemini-3.8-flash) |
| CH-4.2/4.3 | Dán Excel/Word thật trên app desktop (opencode đã hỏng 3 lần) | Codex |
| CH-9.2/9.4/9.5 | Tự lưu khôi phục, dọn tiến trình mồ côi, nhật ký hiệu năng | Codex |
| CH-6 | Thư viện CDP chung, hồi quy desktop một lệnh, quét cấm nhập liệu HĐH | Codex |
| 3T Cloud GĐ1 | Dịch vụ cập nhật + `/health` trên 3tserver (đĩa HDD `/srv`) | Codex |
| Lối tắt | Doc / Sheet / Slide, xóa tên cũ khi nâng cấp | Codex |
| CH-7.1 | Tìm/Thay thế chung (opencode chết 504, chuyển cho agy) | agy |
| CH-1 (đo) | Đo lại tốc độ mở file, kiểm 26 file với cờ payload | Codex |

**Đợt B — việc dài, chạy song song khi bước vào từng app:**

| Mục | Ghi chú | Người làm |
|---|---|---|
| CH-1.2/1.3/1.5 | Mở file lần đầu còn 13–23 s; giữ MỘT luồng Codex đo và cải thiện liên tục (quy tắc sống còn) | Codex |
| CH-5 (gồm 5.6) | pptx, .doc/.xls cũ, mất dữ liệu docx (đầu/chân trang, theo dõi thay đổi, chú thích) | Codex |
| CH-7.2–7.6 | Chính tả, chèn, phương trình cho Slide, biểu đồ, chú thích | agy (opencode chỉ phụ trợ) |
| CH-4.1/4.4–4.7 | Gom module chung, dán chéo, Unikey/EVKey | agy + Codex |
| 3T Cloud GĐ2–GĐ4 | Khóa bản quyền, thư viện tải về, web | Codex |
| Từng app | Doc (12 mục CHƯA ĐẠT), Sheet (5 lỗi từ rà soát C3–C12), Slide (rà soát D1–D8) | **Codex** |

**Phân công agent:** Codex làm việc chi tiết và nặng (từng app, lưu/mở, server); agy (gemini-3.8-flash-high) làm phụ trợ chung; opencode chỉ làm việc phụ nhỏ, không đụng đường lưu/mở (đã làm hỏng lưu docx, hay chết 504). Claude chỉ giao việc và nghiệm thu; xung đột và test lỗi trả lại cho agent.

## Theo dõi tiến độ

| Hạng mục | Trạng thái 01/10 17:50 | Người làm |
|---|---|---|
| CH-1 Tốc độ | Khởi động nhanh (1.1) đã gộp: phím đầu 2,1–2,6 s; mở file lần đầu còn chậm; payload Sheet chờ kiểm 26 file | Codex |
| CH-2 Cập nhật | Nguyên nhân gốc đã xác minh; đang sửa + thử bản cài thử | Codex, Claude kiểm |
| CH-3 In/PDF | Đã xong và gộp (khớp Office ở các mẫu đã đo) | — |
| CH-4 Bàn phím & Clipboard | Phím xong; dán Excel/Word thật đang làm lại | Codex |
| CH-5 Mở/Lưu | docx/xlsx tốt; pptx, .doc/.xls, mất dữ liệu docx đang làm | Codex |
| CH-6 Bộ kiểm tra chung | Đang làm | Codex |
| CH-7 Công cụ soạn thảo | Tìm/Thay thế đang làm; phương trình Doc đã gộp | agy |
| CH-8 Giao diện & Trợ giúp | Xong nhánh, F1 đạt trên desktop; đang gỡ xung đột để gộp | agy |
| CH-9 Ổn định & báo lỗi | 9.2/9.4/9.5 đang làm; 9.1 chờ 3T Cloud GĐ1 | Codex |
| 3T Cloud | GĐ1 đang làm; tên miền `office.3tcomputer.com` đã chốt | Codex |
