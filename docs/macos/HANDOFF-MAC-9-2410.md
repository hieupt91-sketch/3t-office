# HANDOFF MAC-9 — Phông chữ có sẵn và phông thay thế trên macOS

Kế hoạch: `docs/macos/PLAN-MAC-9-FONTS-2410.md`.

## Phát hiện chính
LibreOffice của 3T chạy `--headless`; trên macOS chế độ này dùng fontconfig đóng gói, không có tệp cấu hình → **chỉ thấy phông tự mang**. Trước MAC-9, mọi phông macOS (Arial, Times New Roman, Lucida Grande, Helvetica Neue…) và mọi phông người dùng cài bằng Font Book đều vô hình với phần xuất PDF/in; phông thiếu không có trong bảng thay thế rơi về LinuxLibertineG (có chân). MAC-9 tái sử dụng cơ chế fontconfig của chính LibreOffice (thư mục + alias như `fc_local.conf`), không vá Core, không thêm phụ thuộc, không đóng gói phông.

## Bảng trước/sau (pilot LibreOffice 26.8.0.3, `writer_pdf_Export` / `impress_pdf_Export`, hồ sơ mới)
Lệnh: `heavy-lock.sh claude-fonts -- venv-dev/bin/python tests/macos/fonts/measure_fonts.py --mode before|after …`. Bộ `font-*.docx` sinh bằng `tests/macos/fonts/make_font_corpus.py` (40 đoạn tiếng Việt + Latin, 11 pt, A4, một phông cho mọi khe chữ).

| Tệp | Trang trước | Phông trong PDF trước | Trang sau | Phông trong PDF sau |
|---|---:|---|---:|---|
| sample-writer-comments.docx | 1 | LiberationSerif(-Bold) | 1 | TimesNewRomanPS(-Bold)MT |
| sample-writer-footnotes.docx | 1 | LiberationSerif(-Bold) | 1 | TimesNewRomanPS(-Bold)MT |
| sample-writer-headerfooter.docx | 1 | LiberationSerif(-Bold) | 1 | TimesNewRomanPS(-Bold)MT |
| sample-writer-image.docx | 1 | LiberationSerif(-Bold) | 1 | TimesNewRomanPS(-Bold)MT |
| sample-writer-tables.docx | 1 | LiberationSerif(-Bold) | 1 | TimesNewRomanPS(-Bold)MT |
| sample-writer-trackchanges.docx | 1 | LiberationSerif(-Bold) | 1 | TimesNewRomanPS(-Bold)MT |
| sample-writer.docx | 1 | LiberationSerif(-Bold/-Italic), OpenSymbol | 1 | TimesNewRomanPS(-Bold/-Italic)MT, OpenSymbol |
| sample-slides-comments.pptx | 2 | LiberationSans | 2 | ArialMT |
| sample-slides-notes.pptx | 3 | LiberationSans | 3 | ArialMT |
| sample-slides-smartart.pptx | 1 | LiberationSans(-Bold) | 1 | Arial(-Bold)MT |
| sample-slides.pptx | 2 | LiberationSans | 2 | ArialMT |
| font-calibri.docx | 4 | Carlito | 4 | Carlito |
| font-cambria.docx | 3 | Caladea + LinuxLibertineG (glyph dấu) | 3 | Caladea + LinuxLibertineG (glyph dấu) |
| font-arial.docx | 3 | LiberationSans | 3 | ArialMT |
| font-times-new-roman.docx | 3 | LiberationSerif | 3 | TimesNewRomanPSMT |
| font-courier-new.docx | 4 | LiberationMono | 4 | CourierNewPSMT |
| font-segoe-ui.docx | 3 | LinuxLibertineG | 3 | HelveticaNeue |
| font-aptos.docx | 3 | LinuxLibertineG | 3 | HelveticaNeue |
| font-lucida-sans.docx | 3 | LinuxLibertineG | 3 | LucidaGrande |
| font-calibri-light.docx | 3 | LinuxLibertineG | 4 | Carlito |
| font-consolas.docx | 3 | LinuxLibertineG | 4 | LiberationMono |
| font-nsimsun.docx | 3 | LinuxLibertineG | 4 | STHeitiSC-Light |
| font-simsun.docx | 3 | LinuxLibertineG | 4 | STHeitiSC-Light |

- 11/11 mẫu thật (`tests/fixtures/real-office-samples`): số trang/slide **không đổi**; nay dùng phông thật của macOS (Times New Roman, Arial) thay cho bản Liberation cùng kích thước.
- Phông cùng kích thước (Calibri, Cambria, Arial, Times New Roman, Courier New): số trang không đổi.
- Bốn tệp đổi số trang (Calibri Light, Consolas, NSimSun, SimSun) đều là chỗ **trước đây dùng sai kiểu chữ** (LinuxLibertineG có chân cho phông không chân/đều nét/chữ Hán). Không có chuẩn Windows/Office cho bộ stress này nên **không khẳng định** bên nào đúng hơn về số trang; Calibri Light nay ra cùng số trang với Calibri (4). NSimSun/SimSun: đã thử Heiti SC 4 trang, Songti SC 5, Liberation Mono 4, không ánh xạ 3 → chọn Heiti SC (đủ dấu tiếng Việt, chiều cao dòng gần hơn Songti).
- Windows golden d01…d13 (`docs/AUDIT-DOC-CORPUS-REGRESS-0610.md`: d01 20, d02 11, d03 1, d04 5, d05 2, d06 3, d07 23, d08 1, d09 14, d10 1 (PDF), d11 5, d12 3, d13 10): **BLOCKED** — corpus chỉ có ở `E:\VN OFice\file test\landocx` trên máy Windows, không có trên máy Mac (đã tìm bằng `mdfind`/`find /Volumes/Data`).
- Dấu tiếng Việt: đã render trang 1 các PDF Cambria, Segoe UI (Helvetica Neue), Lucida Sans (Lucida Grande), NSimSun (Heiti SC) ở 216 dpi — đủ dấu, không ô vuông. Độ phủ 74 ký tự tiếng Việt kiểm bằng `QRawFont.supportsCharacter`: Carlito, Liberation *, Lucida Grande, Helvetica Neue, Arial, Heiti SC = 0 thiếu; Caladea thiếu 46 (LibreOffice tự lấy glyph từ phông khác); Songti SC thiếu 44; Menlo thiếu 23 (nên Consolas → Liberation Mono trước Menlo).
- Hiệu năng (4 lần/cấu hình, `sample-writer.docx`, hồ sơ ấm): không cấu hình 0,70–0,71 s; cấu hình MAC-9 0,71 s; nếu đọc cả `/System/Library/Fonts` không lọc: 1,40–1,44 s (lý do có bộ lọc).

## Bảng ánh xạ (macOS, chỉ dùng khi máy thiếu phông gốc; phông gốc cài vào sẽ tự được dùng)
| Phông tài liệu | Thay bằng (theo thứ tự) | Cùng kích thước | Nguồn phông thay |
|---|---|---|---|
| Calibri | Carlito | Có | đi kèm engine (OFL) |
| Cambria | Caladea | Có | đi kèm engine (OFL) |
| Arial | Liberation Sans | Có | engine (macOS đã có Arial thật) |
| Times New Roman | Liberation Serif | Có | engine (macOS đã có TNR thật) |
| Courier New | Liberation Mono | Có | engine (macOS đã có Courier New thật) |
| Calibri Light | Carlito | Không | engine |
| Segoe UI, Aptos, Aptos Display | Helvetica Neue → Arial → Liberation Sans | Không | macOS / engine |
| Lucida Sans, Lucida Sans Unicode | Lucida Grande | Không (cùng thiết kế) | macOS |
| Consolas | Liberation Mono → Menlo | Không | engine / macOS |
| NSimSun, SimSun | Heiti SC → Songti SC → STSong | Không | macOS |
| SimHei, Microsoft YaHei | Heiti SC | Không | macOS |

---

# Agent Handoff
TASK: MAC-9 — phông chữ có sẵn và phông thay thế trên macOS để số trang giống bản gốc
AGENT/ROLE: Claude / macOS port (fonts)
BRANCH: mac/fonts-cl-2410
WORKTREE: /Volumes/Data/Worktrees/mac-fonts-cl-2410
OBJECTIVE: Tài liệu tạo bằng bộ văn phòng khác phân trang trong 3T trên macOS giống bản gốc: dùng phông macOS/người dùng cài, thay phông thiếu bằng phông cùng kích thước hoặc gần nhất có đủ dấu tiếng Việt.
FINDINGS: LibreOffice headless trên macOS chỉ thấy phông tự mang (fontconfig đóng gói không có cấu hình) — không thấy Arial/Lucida Grande/Helvetica Neue lẫn phông cài bằng Font Book; phông thiếu không có trong bảng rơi về LinuxLibertineG (có chân). Caladea thiếu 46 ký tự tiếng Việt (engine tự mượn glyph, vẫn đủ dấu). Đọc cả /System/Library/Fonts làm mỗi lần chuyển đổi chậm +0,7 s; lọc còn Supplemental + 14 tệp thì không tốn thêm.
IMPLEMENTATION SUMMARY: Hợp đồng tùy chọn DocumentFonts trong os_services (Windows/Linux None, không đổi); macOS cung cấp thư mục phông hệ thống đã lọc + ~/Library/Fonts + /Library/Fonts và bảng thay thế; adapter engine_fonts.py sinh fonts.conf (dir/cachedir/selectfont/alias như fc_local.conf của engine), ghi nguyên tử, chỉ ghi khi đổi; main.py ghi một lần lúc khởi động và setdefault FONTCONFIG_FILE cho mọi tiến trình soffice. Không đóng gói phông, không đọc gói ứng dụng khác, không thêm phụ thuộc. Trợ giúp tiếng Việt "Phông chữ thay thế trên macOS" (cách cài phông bằng Sổ phông/Font Book).
FILES CHANGED: platform/os_services/base.py; platform/os_services/macos.py; adapters/libreoffice/common/engine_fonts.py (mới); main.py; platform/help/entries-macos-fonts.js (mới); platform/help/help-catalog.js; tests/macos/test_engine_fonts.py (mới); tests/macos/fonts/make_font_corpus.py (mới); tests/macos/fonts/measure_fonts.py (mới); docs/macos/PLAN-MAC-9-FONTS-2410.md; docs/macos/HANDOFF-MAC-9-2410.md.
COMMANDS RUN: measure_fonts.py --mode before/after (qua heavy-lock) trên 11 mẫu thật + 12 tệp stress; probe FONTCONFIG_FILE/SAL_FONTPATH_PRIVATE; đo thời gian 4–5 lần/cấu hình; so phương án NSimSun (Heiti/Songti/Liberation Mono/không ánh xạ); render PDF bằng QtPdf để xem dấu; `pytest tests/macos`; pytest các test os_services/profile_seed/desktop_launch/print_pipeline; `npm test` (PYTHON=venv-dev, VNOFFICE_SOFFICE_PATH=pilot) qua heavy-lock; git diff --check.
BUILD RESULT: NOT RUN — không đổi build/đóng gói (fonts.conf sinh lúc chạy).
TEST RESULTS: PASS pytest tests/macos 36/36 (17 subtests; test_engine_fonts 14/14). npm test 3799/3800 — 1 FAIL là FODS snapshot đã biết ("Sheet: parseFods workbook snapshots match pre-optimization results"). Số trang: 11/11 mẫu thật không đổi; 5/5 phông cùng kích thước không đổi.
KNOWN FAILURES: FODS snapshot (đã biết, ngoài phạm vi). Có sẵn từ trước, không do MAC-9 (FAIL cả khi stash thay đổi): tests/test_desktop_launch.py::test_main_returns_exit_code_when_no_port_available (patch ctypes.windll, chỉ Windows); tests/test_os_services_p2.py 2 FAIL (test_show_error_never_raises…, test_user_data_dir_equals_legacy…). Windows golden d01…d13 BLOCKED (corpus không có trên Mac). Chưa so với Word/PowerPoint for Mac (ORACLE còn BLOCKED).
RISKS: Phông "gần giống" (Segoe UI, Aptos, Calibri Light, Consolas, SimSun…) không cùng kích thước → có thể lệch dòng/trang; chưa có chuẩn để đo. Thư mục phông người dùng rất lớn làm engine khởi động chậm hơn. Lần chạy đầu fontconfig tạo bộ đệm ~5 MB (+~1 s một lần). Thay đổi chung: base.py (thêm trường tùy chọn, SERVICE_FIELDS giữ 10), main.py, help-catalog.js (nhánh keys-cl-2410 cũng sửa help-catalog.js → xung đột nhỏ khi gộp). Hiển thị trên màn hình (webview) không thuộc phạm vi — chỉ in/xem trước/PDF.
DEPENDENCIES/BLOCKERS: Corpus d01…d13 từ máy Windows để so số trang thật; ORACLE (Word/PowerPoint for Mac) để có chuẩn cho phông gần giống; Trợ giúp hiện chỉ có tiếng Việt vì catalog Trợ giúp chưa có lớp EN (không thêm khóa i18n chết).
CORE PATCH ID (if any): None.
NEXT ACTION: Review + gộp vào platform/macos; chép corpus d01…d13 sang Mac và chạy measure_fonts.py --mode after so với golden; khi ORACLE hết BLOCKED, đo bộ stress bằng Word for Mac để chọn lại phông cho Segoe UI/Aptos/Consolas/SimSun; quyết định của người phụ trách ở mục dưới.

## Quyết định cần người phụ trách
1. **Phông gần giống không có bản mở cùng kích thước** (Segoe UI, Aptos, Consolas, SimSun…): có muốn mua/cấp phép phông thật để đóng gói không? MAC-9 không đóng gói phông mới và không dùng phông trong gói ứng dụng khác (giấy phép chỉ cho ứng dụng đó).
2. **Phông macOS bị nhúng (subset) vào PDF xuất ra** — giống mọi ứng dụng Mac in/xuất PDF qua phông hệ thống; xác nhận chấp nhận được về giấy phép cho bản phát hành.
3. **Trợ giúp EN**: catalog Trợ giúp chỉ có tiếng Việt; nếu cần bản EN cho mọi bài, cần một phiếu nền tảng riêng thêm lớp dịch cho help-panel.
