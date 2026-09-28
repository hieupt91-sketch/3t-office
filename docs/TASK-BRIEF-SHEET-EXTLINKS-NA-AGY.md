# TASK BRIEF — Sheet: liên kết ngoài (external links) + hàm NA() (agy, CODE)

Worktree: `E:\VNOffice-agy-sheet-extlinks` (nhánh `fix/sheet-extlinks-na-agy`, tách từ `main`). Chỉ làm trong worktree này. Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước mọi lần chạy app/soffice.
Đây là việc CODE logic (không chỉ UI). Làm nhỏ, chắc, có test.

## Vì sao
Đo toàn bộ 264 file .xlsx thật trên ổ LAN của công ty (28/9): **21 file có liên kết sang workbook khác** (`xl/externalLinks/`), 1 file dùng `NA()` — hàm duy nhất trong 18 hàm người dùng thật dùng mà `apps/sheet/formula-engine.js` chưa hỗ trợ.

## Việc 1 — `NA()`
Thêm `NA()` vào `apps/sheet/formula-engine.js`: trả lỗi `#N/A` đúng kiểu lỗi mà engine đang dùng cho các lỗi khác (xem cách VLOOKUP trả `#N/A`), lan truyền qua phép tính như Excel, `IFERROR(NA(),x)` = x, `ISNA(NA())` = TRUE (nếu ISNA/IFNA đã có; nếu chưa có thì thêm cả `ISNA` và `IFNA`). Unit test cho từng trường hợp.

## Việc 2 — Liên kết ngoài (external links)
1. **Điều tra trước, commit sớm** `docs/HANDOFF-SHEET-EXTLINKS-FINDINGS.md`: tạo 1 file mẫu nhỏ TỰ TẠO (không dùng tài liệu công ty) gồm workbook A có công thức `=[B.xlsx]Sheet1!A1` và `=SUM('[B.xlsx]Sheet1'!A1:A3)` — tạo bằng Excel COM (read/write file mẫu tự tạo là được, KHÔNG dùng SendKeys) hoặc bằng XML tay. Mở A bằng VN Sheet và ghi lại: ô hiển thị gì (giá trị cache trong file? `#REF!`? công thức hỏng?), thanh công thức hiển thị gì, sửa một ô khác rồi lưu → mở bản lưu bằng Excel 2016 COM: công thức liên kết còn nguyên không, `xl/externalLinks/` còn không, giá trị cache còn không, Excel có báo lỗi/sửa chữa file không.
2. **Sửa theo hành vi Excel** (Excel khi file nguồn không mở: hiển thị giá trị cache, giữ nguyên công thức, hiện thanh cảnh báo "Liên kết tới nguồn bên ngoài"):
   - Hiển thị giá trị cache lưu trong file, KHÔNG hiện lỗi giả.
   - Thanh công thức hiển thị công thức liên kết dạng Excel (`=[B.xlsx]Sheet1!A1`), không phải dạng nội bộ LibreOffice.
   - Engine không tính lại ô liên kết ngoài (giữ cache) — không làm hỏng ô khác phụ thuộc nó.
   - Lưu giữ nguyên liên kết (công thức + `externalLinks` + cache) để Excel mở lại vẫn hoạt động.
   - Thanh thông báo tiếng Việt khi mở file có liên kết ngoài (không tự tải/tự mở file khác — app offline; chỉ thông báo và cho đóng thanh). Không gửi gì ra mạng.
   Tuân thủ layer boundary (AGENTS.md mục 4): UI không gọi LibreOffice trực tiếp; logic đọc/ghi file nằm ở adapter.
3. Help tiếng Việt: bài "Liên kết tới sổ làm việc khác" — giải thích giá trị hiển thị là giá trị lưu lần cuối, cách nhận biết ô liên kết.

## Kiểm chứng bắt buộc
- Unit test cho NA/ISNA/IFNA và cho parse/serialize công thức liên kết ngoài.
- File mẫu tự tạo: mở → sửa → lưu → Excel COM mở không lỗi, công thức liên kết + cache giữ nguyên. Ghi bảng trước/sau vào handoff.
- Không hồi quy: chạy `python scripts\layout-audit\_batch_audit.py <worktree>` trên 26 file `file test\lan\lan*.xlsx` (bỏ lan06, lan14) — phải TỔNG lệch 0 như `main` (chạy foreground, từng file; nếu worktree chưa có thư mục `file test\lan`, chép từ `E:\VN OFice\file test\lan` — thư mục này bị gitignore, KHÔNG commit).
- `node tests/run-tests.js` và `python -m unittest discover -s tests` foreground.

## Luật cứng
Không sửa hàm `save()`/`saveAs()` của `sheet-adapter.js` và `save_document_*` trong `main.py` (nhánh lưu tại chỗ `fix/save-in-place-agy` đang chờ merge).
Không đụng file agent khác đang sửa: `adapters/libreoffice/writer/**`, `adapters/libreoffice/common/ooxml_zip_patch.py` phần Writer, `apps/writer/**`. Không commit tài liệu thật, không commit file mẫu lớn (file mẫu tự tạo nhỏ < 50 KB được phép trong `tests/fixtures/`). KHÔNG chạy tác vụ ở nền rồi ngồi chờ — mọi lệnh foreground. Commit sau mỗi bước; tiền tố `fix(sheet): …` / `feat(sheet): …`. Không rebase/force, không merge vào `main`.

## Bàn giao
`docs/HANDOFF-SHEET-EXTLINKS-NA.md` theo mẫu `09-templates/AGENT-HANDOFF.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.
