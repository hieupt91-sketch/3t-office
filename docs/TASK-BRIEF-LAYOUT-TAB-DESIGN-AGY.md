# TASK BRIEF — Rà soát thiết kế trực quan tab "Bố cục" (Writer) và "Trang" (Sheet) sau đợt sửa W52–W55 (agy)

Worktree: `E:\VNOffice-agy-layout-tab` (nhánh `design/writer-sheet-layout-tab-agy`, tách từ `main` @ 8ed4e29). Chỉ làm trong worktree này.
Đây là việc **UI/thiết kế/trực quan** — KHÔNG sửa logic đo lường/phân trang/công thức (phần đó Grok và Codex đang làm ở worktree khác cùng lúc). Claude sẽ kiểm chứng bằng ảnh chụp thật + đọc code trước khi merge.

## Bối cảnh
Mấy vòng gần đây (W52–W55, đã merge vào `main`) sửa cách VN Writer tính khổ giấy Letter (864px usable thay vì 862px), lề ô bảng, khoảng cách dòng cuối đoạn — đều là sửa **độ chính xác đo lường**, không phải UI. Nhóm ribbon liên quan (`Bố cục` trong Writer: Thiết lập trang, In ấn, Hình nền; `Trang`/tương đương trong Sheet) chưa được nhìn lại về mặt thiết kế từ lâu. Đây là lúc hợp lý để rà soát vì khổ giấy/lề vừa đổi số thật.

## Việc cần làm (theo đúng tinh thần rà soát đã có trong dự án — spacing, phân cấp thị giác, nhất quán icon/nhóm, không rối không thưa; xem checklist trong `docs/AGENTS.md` §2 và §10)

### 1. Screenshot thật + so sánh với Word/Excel 2016 thật
- Mở VN Writer (`python main.py`, hoặc cách khởi chạy hiện có trong `main.py`), vào tab **Bố cục**, chụp toàn bộ ribbon ở trạng thái bình thường VÀ khi mở dropdown Khổ giấy / hộp thoại Thiết lập trang.
- Mở VN Sheet, vào tab tương đương (Trang/Page Layout — kiểm tra tên tab thật trong `apps/sheet/sheet-ribbon.js`), chụp tương tự.
- So với ảnh Word 2016 / Excel 2016 thật cùng tab (nếu máy có Office 2016 — dùng script chụp COM sẵn có trong `scripts/layout-audit/` nếu phù hợp, hoặc ảnh tham khảo đã có trong `docs/screenshots/` nếu còn — **không tạo tài liệu Office giả**, chỉ chụp UI/ribbon, không phải nội dung tài liệu thật).
- Ghi nhận: vị trí nhóm lệnh có đúng như Office thật không (Thiết lập trang, In ấn, Hình nền đúng vị trí thật trong tab Page Layout của Word?); icon có nhất quán về phong cách/kích thước với các nhóm khác trong cùng tab không; khoảng cách/canh lề có đều không; nút nào bị "chết" (không có handler thật — grep `writer-ribbon.js`/`sheet-ribbon.js` xem có nút gắn handler rỗng/`TODO` không).

### 2. Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup ribbon, không đụng logic đo lường)
- File liên quan: `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`.
- Ưu tiên: hover/active state có mượt và trở lại đúng trạng thái nghỉ sau thao tác không (theo chuẩn đã có trong dự án — không để sót style hover/active/loading); một tính năng không hiển thị 2 lần dưới 2 dạng khác nhau trong cùng nhóm ribbon.
- Nếu hộp thoại "Thiết lập trang" (Page Setup dialog) có sẵn — kiểm tra bố cục hộp thoại đó nữa (căn lề, khoảng cách nhãn/input, nút OK/Cancel đúng vị trí chuẩn Windows/Office).

### 3. Kiểm tra nội dung Hướng dẫn sử dụng (Help) khớp UI thật
- `platform/help/entries-writer.js` (mục "Thiết lập trang" dòng ~597, "Xem trước khi in" dòng ~661) và mục tương ứng trong `platform/help/entries-sheet.js` — đọc và xác nhận mô tả bước sử dụng vẫn khớp đúng UI hiện tại (tên nút, vị trí tab/nhóm) sau các đợt sửa gần đây. Nếu có bổ sung/vẽ lại UI ở bước 2, cập nhật entry tương ứng luôn (tiếng Việt, cụ thể theo UI thật, không placeholder).

## Test / xác nhận trước khi bàn giao
- Chạy được app (`python main.py`), chụp ảnh trước và sau mỗi thay đổi CSS/markup để tự so sánh không vỡ layout ở màn hình rộng lẫn hẹp (thu nhỏ cửa sổ để kiểm tra không tràn/không vỡ ribbon).
- `node tests/run-tests.js` phải vẫn PASS toàn bộ (không được để một sửa CSS làm hỏng test hiện có).
- **Không chạy** `python -m unittest` theo dõi Excel/Word COM, không cần cho việc này.

## Luật cứng
- Không đụng bất kỳ logic đo lường/phân trang nào trong `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, hay `adapters/libreoffice/common/ooxml_zip_patch.py` — hai agent khác đang sửa logic đó cùng lúc trong worktree riêng, đụng vào sẽ xung đột khi merge.
- Không commit/copy tài liệu Office thật hay ảnh chụp nội dung tài liệu thật vào repo (`file test/` đã gitignore); ảnh chụp UI thuần (ribbon/hộp thoại rỗng, không dữ liệu người dùng thật) có thể lưu tạm trong worktree để tham khảo nhưng đừng commit ảnh lớn vào git — mô tả bằng chữ trong handoff là đủ, hoặc lưu ảnh ở thư mục scratch ngoài repo nếu cần giữ.
- Không đổi framework UI, không thêm dependency mới.
- Commit tiền tố `design(ui): …` mô tả rõ thay đổi. Không rebase/force.
- **Không chạy tác vụ ở nền rồi ngồi chờ** — mọi lệnh chạy ở foreground, đọc kết quả ngay rồi làm bước tiếp.

## Bàn giao
`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`: danh sách vấn đề tìm thấy (có/không sửa mỗi cái, vì sao), ảnh mô tả trước/sau (đường dẫn hoặc mô tả chi tiết), danh sách nút "chết" phát hiện được (nếu có, báo lại — không tự thêm handler logic mới, đó là việc của agent code), cập nhật Help nếu có, kết quả `node tests/run-tests.js`.
