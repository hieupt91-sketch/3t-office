# Đối chiếu VN Slides với PowerPoint — FIX-L4

Ngày chạy: 11/10/2026. Worktree: `E:\VNOffice-codex-rl4`; nhánh `audit/slides-office-parity-codex`.

## Kết quả đã đo

Hai lỗi của FIX-L4 đã được sửa riêng và commit riêng:

1. **Tên font FODP:** Slides lập bảng ánh xạ `style:font-face/@style:name` sang `svg:font-family` trước khi dựng rich text. Unit test xác nhận `Arial1 → Arial`, `Times New Roman1 → Times New Roman`, `Calibri1 → Calibri`, kể cả tên có khoảng trắng. Deck `BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx` được sửa văn bản và lưu lại qua app; PowerPoint COM đọc tập font của ký tự hiển thị trước/sau giống nhau: `Calibri`, `Calibri Light`. COM gán `Arial` cho một số dấu paragraph và dấu cách cuối đoạn trong bản đã lưu; comparator loại các ký tự phân cách không hiển thị này. Nguồn không có Arial1 nên unit test là bằng chứng trực tiếp cho alias Arial.
2. **Tăng/giảm cỡ chữ:** Lệnh dùng thang điểm PowerPoint 8…96 pt và quy đổi theo `ptPerPx`. Desktop app áp 18 → tăng → tăng → giảm; PowerPoint COM đọc cỡ cuối là **20 pt**. COM cũng đọc đúng font `Arial`, đậm `true`, căn giữa và văn bản đã sửa.

| Hạng mục | Kết quả thực đo |
|---|---|
| Tạo template PPTX bằng PowerPoint COM | PASS; PID riêng của phiên, file có 1 slide và 1 textbox |
| Font family sau sửa văn bản, lưu PPTX thật | PASS; PowerPoint đọc `Calibri`, `Calibri Light` giống nguồn |
| Font size 18 → 20 → 24 → 20 | PASS; app HTML lần lượt ghi 24 px, 26.67 px, 32 px, 26.67 px; PowerPoint COM đọc cuối 20 pt |
| B/I, căn giữa, chèn shape | PASS trên fixture audit; COM đọc Bold=-1, Alignment=2, tổng 3 shape |
| Đọc thuộc tính shape | PASS về khả năng đọc: left/top 96.009 pt, width 150.009 pt, height 90 pt, rotation 0, fill RGB 16155195, line RGB 16777215, z-order 3. Đây là giá trị mặc định sau thao tác chèn; chưa phải so sánh mọi lệnh định dạng shape |
| Ẩn slide / transition / notes | COM đọc trạng thái mặc định; chưa đo thao tác thay đổi qua app |

## Ma trận FIX-L4 mở rộng

| Nhóm thao tác | Kết quả |
|---|---|
| Trang mới / nhân đôi / xóa | Nhân đôi một slide qua ribbon được ghi nhận PASS trong L2. Kịch bản L2 đầy đủ FAIL sau đó; trang mới và xóa chưa đo |
| Hình khối: nền, viền, vị trí, kích thước, xoay | Chèn shape và đọc thuộc tính COM đã chạy; các lệnh thay đổi thuộc tính chưa được đối chiếu độc lập |
| Thứ tự lớp / căn chỉnh | COM đọc z-order; app gọi lệnh căn chỉnh trên một shape. Chưa có phép đo so sánh nhiều shape |
| Nhóm / bỏ nhóm | L3: tạo nhóm lồng, bỏ nhóm cha, lưu và mở lại đều PASS. Kéo nhóm, đổi kích thước nhóm, xoay nhóm sau khi mở lại đều FAIL (giá trị không đổi) |
| Bảng / gộp ô | NOT RUN |
| Ghi chú | COM đọc được placeholder ghi chú; sửa ghi chú qua app chưa đối chiếu |
| Chuyển tiếp (kiểu / thời lượng) | NOT RUN. Smoke roundtrip cũ dừng vì test tìm dialog tổng quát không có `<select>`; selector không khớp dialog UI hiện tại |
| Hiệu ứng vào | NOT RUN |
| Ẩn slide | COM đọc được trạng thái mặc định `Hidden=0`; thao tác bật/tắt chưa đo |
| Định dạng một phần văn bản / từng dòng | Chọn toàn textbox và đo font/Bold/căn giữa PASS; chọn một phần và nhiều dòng NOT RUN |
| Danh sách nhiều cấp | NOT RUN |
| Theme | L3 FAIL: chọn kỳ vọng `minimal-dark` nhưng model/PPTX trả `modern-blue`; mở lại vẫn `modern-blue` |

## Test

- `npm test`: **PASS — 3055/3055**.
- `python -m unittest discover`: **FAIL — exit 1, 0 test được phát hiện**.
- `make-template.ps1`: **PASS**.
- `app-ops.desktop.mjs` + `compare.ps1`: **PASS**; profile `E:\VNOffice-profiles\codex-rl4`, CDP riêng do harness cấp, `VNO_APP_ROOT=E:\VNOffice-codex-rl4`.
- `font-roundtrip.desktop.mjs` + `compare-fonts.ps1`: **PASS**; sửa văn bản trong deck 17 slide, lưu qua app, tập font PowerPoint COM trước/sau giống nhau.
- `slides-fix-l2.desktop.mjs`: **FAIL**; lệnh chèn textbox/shape không đổi số shape trong nguồn test, sau đó chờ duplicate slide mới bị timeout. Phép duplicate đầu tiên được ghi nhận PASS.
- `slides-fix-l3.desktop.mjs`: **FAIL — 7/12**; 5 lệch gồm kéo/đổi kích thước/xoay nhóm và ghi/đọc theme như bảng trên.
- `claude-slides-roundtrip.desktop.mjs`: **FAIL**; dừng khi script tìm `<select>` trong dialog tổng quát, không tìm thấy. Không dùng kết quả này để kết luận parity chuyển tiếp.

Không có hạng mục thiếu so với Office đã được xác minh đủ để đưa vào `RIBBON-BACKLOG.md`; các thao tác chưa chạy vẫn là NOT RUN, không xem là PASS.

## Giới hạn

FIX-L4 đã sửa và đo được hai lỗi font. Ma trận mở rộng chưa hoàn tất; các lệch L2/L3 và thao tác đang NOT RUN cần được xử lý trong lượt audit tiếp theo. Không kết luận VN Slides đạt parity tổng thể với PowerPoint.

Harness: `scripts/audit-0610/office_parallel/slides/`.
