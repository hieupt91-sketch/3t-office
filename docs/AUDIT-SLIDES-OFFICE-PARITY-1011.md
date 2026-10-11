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
| Font size tăng/giảm 5 lần | PASS; app HTML ghi 18 → 20 → 24 → 28 → 32 → 36 → 32 → 28 → 24 → 20 → 18 pt; PowerPoint COM đọc cuối 18 pt |
| B/I, căn giữa, chèn textbox/shape | PASS trên fixture audit; COM đọc Bold=-1, Alignment=2; app thêm textbox và shape, COM đọc tổng 6 shape trong profile dùng cho lần chạy này |
| Đọc thuộc tính shape | PASS về khả năng đọc: left/top 96.009 pt, width 150.009 pt, height 90 pt, rotation 0, fill RGB 16155195, line RGB 16777215, z-order 3. Đây là giá trị mặc định sau thao tác chèn; chưa phải so sánh mọi lệnh định dạng shape |
| Ghi chú diễn giả | PASS; sửa qua vùng Notes trong app, COM đọc `FIX-L4 speaker notes` |
| Chuyển tiếp | PASS; chọn `slide`, 800 ms trong app; COM đọc EntryEffect=3854 (`ppEffectPushRight`, theo [Microsoft PpEntryEffect](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.ppentryeffect)) và Duration=0.8 giây |
| Hiệu ứng vào | PASS một phần; app lưu `fadeIn`, 800 ms, delay 200 ms; PowerPoint COM đọc MainSequence có 2 effect trên shape đích, một effect thời lượng 0.8 giây. COM `AnimationSettings.EntryEffect` không phản ánh timeline này; loại hiệu ứng và trigger delay chưa được COM đối chiếu độc lập |
| Ẩn slide | PASS; bật ẩn qua lệnh app, COM đọc `Hidden=-1` |

## Ma trận FIX-L4 mở rộng

| Nhóm thao tác | Kết quả |
|---|---|
| Trang mới / nhân đôi / xóa | Nhân đôi một slide qua ribbon được ghi nhận PASS trong L2. Kịch bản L2 đầy đủ FAIL sau đó; trang mới và xóa chưa đo |
| Hình khối: nền, viền, vị trí, kích thước, xoay | Chèn shape và đọc thuộc tính COM đã chạy; các lệnh thay đổi thuộc tính chưa được đối chiếu độc lập |
| Thứ tự lớp / căn chỉnh | COM đọc z-order; app gọi lệnh căn chỉnh trên một shape. Chưa có phép đo so sánh nhiều shape |
| Nhóm / bỏ nhóm | L3: tạo nhóm lồng, bỏ nhóm cha, lưu và mở lại đều PASS. Kéo nhóm, đổi kích thước nhóm, xoay nhóm sau khi mở lại đều FAIL (giá trị không đổi) |
| Bảng / gộp ô | NOT RUN |
| Ghi chú | PASS cho sửa và lưu ghi chú diễn giả; COM đọc đúng `FIX-L4 speaker notes` |
| Chuyển tiếp (kiểu / thời lượng) | PASS cho `slide`/Push Right và 800 ms; COM đọc EntryEffect=3854, Duration=0.8 giây |
| Hiệu ứng vào | PASS một phần cho `fadeIn`/800 ms: COM MainSequence có 2 effect, gồm effect 0.8 giây trên shape đích. Loại preset và trigger delay 200 ms chưa được đối chiếu độc lập bằng COM |
| Ẩn slide | PASS; app bật ẩn, COM đọc `Hidden=-1` |
| Định dạng một phần văn bản / từng dòng | Chọn toàn textbox và đo font/Bold/căn giữa PASS; chọn một phần và nhiều dòng NOT RUN |
| Danh sách nhiều cấp | NOT RUN |
| Theme | L3 FAIL: chọn kỳ vọng `minimal-dark` nhưng model/PPTX trả `modern-blue`; mở lại vẫn `modern-blue` |

## Test

- `npm test`: **PASS — 3055/3055**.
- `python -m unittest discover`: **FAIL — exit 1, 0 test được phát hiện**.
- `make-template.ps1`: **PASS**.
- `app-ops.desktop.mjs` + `compare.ps1`: **PASS**; profile `E:\VNOffice-profiles\codex-rl4`, CDP riêng do harness cấp, `VNO_APP_ROOT=E:\VNOffice-codex-rl4`.
- `features-audit.desktop.mjs` + `compare.ps1 -AppFile features-result.pptx`: **PASS** cho ghi chú, ẩn slide và chuyển tiếp; animation chỉ PASS một phần như bảng trên. COM đọc shape count 4, Hidden=-1, transition 3854/0.8 s, notes đúng, animation MainSequence count 2 với effect 0.8 s.
- `font-roundtrip.desktop.mjs` + `compare-fonts.ps1`: **PASS**; sửa văn bản trong deck 17 slide, lưu qua app, tập font PowerPoint COM trước/sau giống nhau.
- `slides-fix-l2.desktop.mjs`: **FAIL**; lệnh chèn textbox/shape không đổi số shape trong nguồn test, sau đó chờ duplicate slide mới bị timeout. Phép duplicate đầu tiên được ghi nhận PASS.
- `slides-fix-l3.desktop.mjs`: **FAIL — 7/12**; 5 lệch gồm kéo/đổi kích thước/xoay nhóm và ghi/đọc theme như bảng trên.
- `claude-slides-roundtrip.desktop.mjs`: **FAIL**; dừng khi script tìm `<select>` trong dialog tổng quát, không tìm thấy. Không dùng kết quả này để kết luận parity chuyển tiếp.
- Lần tạo lại `make-template.ps1` trong phiên kiểm tra mở rộng **FAIL** do PowerPoint COM dispatch lúc khởi động báo không tìm thấy thuộc tính `Font.Name` / `Text`; lần audit dùng template đã tạo thành công trước đó trong profile chuyên biệt.

Không có hạng mục thiếu so với Office đã được xác minh đủ để đưa vào `RIBBON-BACKLOG.md`; các thao tác chưa chạy vẫn là NOT RUN, không xem là PASS.

## Giới hạn

FIX-L4 đã sửa và đo được hai lỗi font. Ma trận mở rộng chưa hoàn tất; các lệch L2/L3 và thao tác đang NOT RUN cần được xử lý trong lượt audit tiếp theo. Kết quả COM cho transition/notes/hidden đã được đo qua app. Animation chỉ xác nhận được timeline và duration; cần kiểm tra loại preset/delay trong PowerPoint UI hoặc một oracle COM phù hợp. Không kết luận VN Slides đạt parity tổng thể với PowerPoint.

Harness: `scripts/audit-0610/office_parallel/slides/`.
