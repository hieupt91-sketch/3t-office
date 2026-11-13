# Kế hoạch kiểm thử trên máy thật — thứ Hai 16/11

Mục tiêu: có **số đo thật trên tệp thật, máy thật** cho các cải tiến tốc độ đã gộp (thay cho số đo Linux + tệp tổng hợp), và biết chỗ nào còn lag.

## Anh cần làm (≈ 5 phút)
1. Mở máy, mở ứng dụng Claude (desktop) và bật **Settings → Claude Code → Remote Control**, thêm thư mục kho `3t-office` (và thư mục tệp thử `file test\lan` nếu nằm ngoài kho) để phiên này xin dùng được.
2. Khi phiên hiện hộp xin kết nối thư mục máy, bấm cho phép.
3. Nếu muốn có đối chiếu Microsoft Excel thật (issue #11): cho phép Automation/COM khi hộp hỏi hiện lên. Không muốn thì bỏ qua, các mục 1–4 vẫn chạy.

## Em làm (theo thứ tự, dừng ngay nếu một bước hỏng và báo)
1. **Kiểm môi trường:** có `ooxml-engine(.exe)` build từ `vn-main` mới nhất không (nếu chưa: nhờ agent Windows build, hoặc em build nếu máy có Swift 6). Ghi phiên bản (commit) vào báo cáo.
2. **Đo mở → cuộn → sửa → lưu** trên toàn bộ tệp thật (36 tệp, gồm `lan01`, `lan06`):
   `python scripts/ooxml_perf_check.py --engine <đường dẫn engine> --repeats 3 --json out.json "<thư mục file test>"`
   Script chỉ đọc tệp nguồn (lưu ra thư mục tạm), in bảng: open / màn hình đầu / cuộn / lưu 1 ô / lưu ghi+xóa / RAM đỉnh / `path` (patch hay dom) và kiểm `zipfile.testzip()`.
3. **Đối chiếu với số cũ:** `docs/ooxml/BENCH-OLD-VS-NEW-24-10.md` (LibreOffice mở `lan01` 56 s, `lan06` 73 s; engine lưu 2,4–3,1 s, 730–930 MB). Ghi bảng trước/sau, nói rõ phần nào là đo thật hôm nay.
4. **Tìm lag còn lại:** tệp nào có `path = dom` (đường chậm) hoặc `lưu` > 1 s → ghi tên + nguyên nhân (công thức chia sẻ, mảng, vùng xóa > 5.000 hàng, thao tác cấu trúc), để ưu tiên sửa tiếp.
5. **Luồng ứng dụng thật (cần agent Windows nối xong `main.py`):** nếu cờ `VNO_OOXML_ENGINE_OPEN=1` đã có, mở `lan01` qua app và đo thời gian tới màn hình đầu bằng CDP. Chưa nối thì ghi NOT RUN.
6. **Excel thật (chỉ khi anh cho phép COM):** chạy bộ đối chiếu `TEXT`/hàm với Excel để thay thế cột "chưa kiểm với Excel" trong `scripts/formula-oracle`.

## Tiêu chí đạt (nói trước để không đổi giữa chừng)
- Mọi tệp: `testzip` = None, không `ok:false`.
- `lan01`/`lan06`: lưu 1 ô < 2 s và RAM < 400 MB (mục tiêu; nếu không đạt, báo số thật và nguyên nhân).
- Không tệp nào mở engine > 1 s (open + màn hình đầu).
Không đạt mục nào thì ghi FAIL kèm số, không đổi tiêu chí.

## Không làm trong buổi này
Không sửa tệp nguồn của anh; không gửi nội dung tệp ra ngoài; không đổi mặc định đường mở của ứng dụng (vẫn sau cờ).

<!-- thử cổng CI: PR chỉ đổi tài liệu, hai job nặng phải bị skipped -->
