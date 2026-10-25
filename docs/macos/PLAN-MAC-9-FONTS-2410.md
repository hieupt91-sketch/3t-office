# PLAN MAC-9 — Phông chữ có sẵn và phông thay thế trên macOS (số trang giống bản gốc)

Ngày: 24–25/10/2026 · Agent: Claude · Nhánh `mac/fonts-cl-2410` (từ `mac/fix1-cl-2410` 688200dd) · Worktree `/Volumes/Data/Worktrees/mac-fonts-cl-2410`

## 1. Mục tiêu
Tài liệu tạo bằng bộ văn phòng khác mở trong 3T trên macOS phải xuống dòng/ngắt trang như bản gốc khi xem trước khi in, in và xuất PDF: dùng phông thật khi máy có, phông cùng kích thước (metric-compatible) khi thiếu, phông gần giống nhất có đủ dấu tiếng Việt khi không có phông cùng kích thước.

## 2. Hiện trạng đã đo (trước khi sửa)
- LibreOffice của 3T luôn chạy `--headless`. Trên macOS chế độ này phân giải phông bằng fontconfig đóng gói trong LibreOffice (`Frameworks/libfontconfig.1.dylib`), **không có tệp cấu hình** (đường mặc định `/usr/local/etc/fonts` không tồn tại). Kết quả: LibreOffice **chỉ thấy phông tự mang** (`Resources/fonts/truetype`), không thấy Arial, Times New Roman, Lucida Grande, Helvetica Neue… của macOS, cũng không thấy phông người dùng cài bằng Font Book.
  - Bằng chứng (probe `soffice --convert-to pdf`, đọc `/BaseFont` trong PDF): tài liệu đặt Arial → `LiberationSans`; Helvetica Neue/Lucida Grande → `LinuxLibertineG` (phông có chân!). Đặt `SAL_FONTPATH_PRIVATE` không có tác dụng; đặt `FONTCONFIG_FILE` trỏ tới cấu hình có `<dir>` thư mục phông macOS → `ArialMT`, `HelveticaNeue`, `LucidaGrande`.
- Bảng thay thế sẵn có của LibreOffice (`VCL.xcu`, `fc_local.conf`) đã có Calibri→Carlito, Cambria→Caladea, Arial→Liberation Sans…; **thiếu** Segoe UI, Aptos, Calibri Light, Consolas; Lucida Sans/NSimSun/SimSun chỉ trỏ tới phông không có trên Mac → rơi về LinuxLibertineG.
- Phát hiện phụ: Caladea thiếu 46 ký tự tiếng Việt (ơ ư ả ạ ằ…); LibreOffice tự lấy glyph từ phông khác (LinuxLibertineG) nên vẫn đủ dấu (đã xem ảnh trang), không đổi số trang.
- Bộ Windows d01…d13 (`docs/AUDIT-DOC-CORPUS-REGRESS-0610.md`) nằm ở `E:\VN OFice\file test\landocx` trên máy Windows, **không có trên máy Mac này** → so sánh trực tiếp BLOCKED (xem handoff).

## 3. Thứ tự quyết định (AGENTS.md §3)
1. Tìm sẵn có trong LibreOffice: cơ chế fontconfig `<dir>` + `<alias binding="same"><accept>` — chính dạng LibreOffice dùng trong `fc_local.conf` cho Calibri→Carlito. **Dùng lại**, không vá Core.
2. Bảng thay thế người dùng (`registrymodifications.xcu` / `VCL.xcu` lớp user) đã cân nhắc và **loại**: ở chế độ headless macOS, bước khớp fontconfig chạy trước bảng VCL nên bảng VCL không thay được kết quả LinuxLibertineG; ngoài ra ghi vào hồ sơ LibreOffice làm vỡ hợp đồng "hồ sơ mới phải rỗng" của `tests/test_profile_seed.py`.
3. Không thêm phụ thuộc, không đóng gói tệp phông mới, không đọc phông trong gói ứng dụng khác.

## 4. Thiết kế (đúng ranh giới lớp)
| Lớp | Tệp | Nội dung |
|---|---|---|
| Hợp đồng nền tảng (dùng chung) | `platform/os_services/base.py` | `FontSubstitution`, `DocumentFontSources`, Protocol `DocumentFonts`; trường tùy chọn `OSServices.document_fonts` (không thêm vào `SERVICE_FIELDS`, Windows/Linux để `None` → không đổi gì) |
| Riêng macOS | `platform/os_services/macos.py` | `MacDocumentFonts`: thư mục `/System/Library/Fonts` (lọc), `/Library/Fonts`, `~/Library/Fonts`; bảng thay thế `MAC_FONT_SUBSTITUTIONS` |
| Adapter LibreOffice (dùng chung) | `adapters/libreoffice/common/engine_fonts.py` | Sinh `fonts.conf` (dir, cachedir, selectfont, alias), ghi nguyên tử, chỉ ghi khi đổi; trả biến môi trường `FONTCONFIG_FILE` |
| Host | `main.py` | `_configure_document_engine_fonts()` gọi một lần trong `main()`: ghi `<thư mục dữ liệu>/engine-fonts/fonts.conf`, `os.environ.setdefault("FONTCONFIG_FILE", …)` → mọi tiến trình soffice (CLI, in, UNO worker) kế thừa. Lỗi bất kỳ → giữ hành vi cũ |
| Trợ giúp | `platform/help/entries-macos-fonts.js` + `help-catalog.js` | Bài "Phông chữ thay thế trên macOS" |

Không có `if mac` trong `apps/**` hay `platform/*.js`.

### Lọc phông hệ thống (hiệu năng)
Đọc toàn bộ `/System/Library/Fonts` làm mỗi lần chuyển đổi chậm thêm ~0,7 s (0,71 s → 1,41 s, đo 4 lần/cấu hình, bộ nhớ đệm ấm). Chỉ nhận `Supplemental/` (Arial, Times New Roman, Courier New, Georgia, Tahoma, Verdana, Songti…) + 14 tệp cấp trên (Lucida Grande, Helvetica Neue, Helvetica, Times, Courier, Menlo, Geneva, Monaco, Avenir, Avenir Next, Optima, Palatino, STHeiti Light/Medium) → 0,71 s, bằng không cấu hình. Loại `Symbol.ttf` để giữ ánh xạ ký hiệu đầu dòng sang OpenSymbol như cũ. Lưu ý fontconfig áp `rejectfont` cho cả thư mục con nên phải nhận riêng thư mục `Supplemental`.

## 5. Rủi ro
- Thư mục `/Library/Fonts`, `~/Library/Fonts` rất nhiều phông → khởi động engine chậm hơn (lựa chọn của người dùng, giống mọi ứng dụng Mac).
- Phông "gần giống" (Segoe UI, Aptos, Consolas, SimSun…) không cùng kích thước → có thể lệch dòng/trang; chưa có chuẩn Windows để đo. Ghi rõ trong Trợ giúp và handoff.
- Lần chạy đầu fontconfig quét và tạo bộ đệm (~5 MB, +~1 s một lần).
- Thay đổi môi trường tiến trình chính: `FONTCONFIG_FILE` chỉ fontconfig đọc; Qt/WebKit trên macOS dùng CoreText nên giao diện không bị ảnh hưởng. Giá trị người dùng đặt sẵn được tôn trọng.

## 6. Kế hoạch kiểm thử
1. Đo trước/sau bằng `tests/macos/fonts/measure_fonts.py` (cùng cờ/bộ lọc PDF như `main._run_soffice_convert`) trên `tests/fixtures/real-office-samples/*.docx|*.pptx` + bộ stress 12 phông sinh bởi `tests/macos/fonts/make_font_corpus.py` (ngoài repo), qua `heavy-lock.sh`.
2. Unit test `tests/macos/test_engine_fonts.py` (sinh XML, ghi một lần/ghi lại khi đổi, lỗi I/O, bảng macOS, không trỏ gói ứng dụng khác, nối dây `main.py`).
3. `npm test` (PYTHON venv-dev, VNOFFICE_SOFFICE_PATH pilot) không thêm FAIL ngoài FODS snapshot đã biết; `pytest tests/macos` PASS.
4. Xem ảnh trang (render PDF) để xác nhận dấu tiếng Việt ở phông thay thế.

## 7. Rollback
Revert các commit MAC-9; hoặc tại máy người dùng đặt `VNO_OS_SERVICES_LEGACY=1` (tắt lớp os_services) hay xóa `~/Library/Application Support/VNOffice/engine-fonts/` (được tạo lại khi mở app). Không có dữ liệu người dùng nào bị đổi.
