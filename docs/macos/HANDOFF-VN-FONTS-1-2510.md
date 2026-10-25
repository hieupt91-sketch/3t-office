# Agent Handoff
TASK: VN-FONTS-1 — Bộ phông thay thế tự dựng (VN Sans UI, VN Sans, VN Mono, VN Song) cho Segoe UI, Aptos, Consolas, SimSun/NSimSun
AGENT/ROLE: Claude / Platform (fonts) + macOS wiring — nhận lại từ agent trước bị dừng do giới hạn API
BRANCH: mac/vnfonts-cl-2510 (từ mac/candidate-cl-2510 382065e3; đã merge origin/vn-main, merge commit 95973eb3, không xung đột)
WORKTREE: /Volumes/Data/Worktrees/mac-vnfonts-cl-2510
OBJECTIVE: Người phụ trách quyết định không mua giấy phép phông; dựng phông thay thế riêng từ nguồn SIL OFL 1.1, đủ tiếng Việt, đóng gói kèm app, nối vào engine tài liệu (fontconfig MAC-9) và webview.
FINDINGS: Phần lớn việc dựng của agent trước đúng, dựng lại ra y hệt từng byte (`--check` → REPRODUCIBLE). Đã sửa: FONTLOG ghi sai số chữ thêm (98 → 96 chữ dựng sẵn + 3 dấu kết hợp); SOURCES.json ghi sai số glyph VN Song (8147 → đếm trên tệp đã ghi); thiếu dấu kết hợp cho văn bản dạng tách dấu (VN Sans thiếu U+031B, VN Song thiếu U+0302/0306/031B) → đã thêm; sửa `index.html` được chuyển sang `@import` trong `platform/theme/fonts/fonts.css` (cơ chế phông đóng gói đã có). Bộ đọc trang 1 (qlmanage) cho thấy dấu tiếng Việt đúng trên cả 4 phông.
IMPLEMENTATION SUMMARY: Script dựng tái lập được `scripts/fonts/build_vn_fonts.py` (công cụ dựng; fontTools 4.55.3 + skia-pathops chỉ trong venv tạm ở scratch). 7 tệp TTF + OFL.txt + FONTLOG.txt + SOURCES.json ở `platform/fonts/document/` (trung lập hệ điều hành; Windows đóng gói `platform/` nguyên thư mục nên dùng lại được). macOS: `platform/os_services/macos.py` thêm thư mục phông đóng gói vào `<dir>` của fonts.conf và đặt phông VN đứng đầu bảng thay thế, giữ phông dự phòng MAC-9 phía sau. Webview: `document-fonts.css` (tên VN + alias `local()` trước, phông VN sau). Trợ giúp tiếng Việt cập nhật.
FILES CHANGED: scripts/fonts/build_vn_fonts.py; platform/fonts/document/{VNSansUI-Regular,VNSansUI-Bold,VNSans-Regular,VNSans-Bold,VNMono-Regular,VNMono-Bold,VNSong-Regular}.ttf, OFL.txt, FONTLOG.txt, SOURCES.json, document-fonts.css; platform/theme/fonts/fonts.css (+1 dòng @import, +3 dòng chú thích); platform/os_services/macos.py; platform/help/entries-macos-fonts.js; tests/test_vn_document_fonts.py (mới); tests/macos/test_vn_fonts_wiring.py (mới); tests/macos/test_engine_fonts.py (cập nhật kỳ vọng theo thay đổi có chủ đích, xem dưới); docs/macos/PLAN-VN-FONTS-1-2510.md; docs/macos/HANDOFF-VN-FONTS-1-2510.md; docs/macos/evidence/vn-fonts-1/*.
COMMANDS RUN: build `--check` (venv tạm); build lại toàn bộ + so sánh; uharfbuzz (chỉ venv tạm) dựng hình NFC/NFD; make_font_corpus.py + measure_fonts.py trước (MAC-9, `git archive origin/vn-main`) / sau, qua heavy-lock; measure 11 mẫu thật; qlmanage trang 1; pytest; npm test; i18n_parity.
BUILD RESULT: Font build PASS, REPRODUCIBLE (byte-for-byte với fontTools 4.55.3 / skia-pathops 0.8.0.post2). Bundle Xcode: NOT RUN (không đổi mã Swift/đóng gói; payload Xcode liên kết cả repo nên `platform/fonts/document` có sẵn).
TEST RESULTS: npm test (PYTHON=venv-dev, VNOFFICE_SOFFICE_PATH=pilot) PASS 3827/3827, 0 FAIL. pytest tests/macos PASS 62/62 với VNOFFICE_SOFFICE_PATH (61 + 1 skipped nếu không có). pytest tests/test_vn_document_fonts.py PASS 12/12 (67 subtests). i18n parity VI=3206 EN=3206 missing=0.
KNOWN FAILURES: Không có. Kiểm tra trực quan alias phông trong webview đang chạy: NOT RUN (chỉ test tĩnh CSS). Số trang tham chiếu với phông gốc: NOT RUN theo quy tắc pháp lý (không dùng/đo phông độc quyền).
RISKS: Chiều cao dòng VN Mono/VN Song/VN Sans không có số đo công khai hợp pháp → số trang có thể lệch so với máy có phông gốc. Repo tăng ~3,6 MB tệp nhị phân (lịch sử nhánh ~7,1 MB vì VN Song/VN Sans được dựng lại một lần trong nhánh; không viết lại lịch sử). Alias CSS theo tên "Segoe UI"/"Consolas" cũng áp dụng cho các stack phông giao diện có tên đó (ví dụ `--vno-font-mono`) trên máy không có phông gốc: trên macOS sẽ hiện VN Sans UI/VN Mono thay vì phông dự phòng kế tiếp — chủ đích (đủ dấu, khớp bản in) nhưng là thay đổi hình ảnh nhỏ.
DEPENDENCIES/BLOCKERS: Lead/legal thêm mục THIRD-PARTY-NOTICES (văn bản đề xuất ở dưới — theo git log, tệp này do Lead Agent sửa qua phiếu legal nên agent không tự sửa). Windows owner: nối bảng thay thế tương tự trong `platform/os_services/windows.py` nếu muốn (phông + CSS đã trung lập).
CORE PATCH ID (if any): None.
NEXT ACTION: Review + merge vào mac candidate; Lead thêm THIRD-PARTY-NOTICES; quyết định các mục "Cần người phụ trách quyết định" bên dưới.

---

## 1. Nguồn, giấy phép, đánh giá kích thước từng phông

| Phông dựng | Thay cho | Nguồn (ghim) | Giấy phép / RFN | Kích thước (metric) | Độ phủ tiếng Việt | Dung lượng |
|---|---|---|---|---|---|---|
| VN Sans UI Regular/Bold | Segoe UI | Selawik 1.01 — `github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip`, sha256 `3f62c51e…d423`; LICENSE.txt @89362e84 sha256 `77b7c250…300c`. Dấu hỏi/móc lấy từ Open Sans 3.003 | OFL 1.1; RFN "Selawik" → đổi tên, bỏ câu thương hiệu Selawik khỏi tên phông, giữ thông báo bản quyền gốc trong OFL.txt | **Cùng kích thước theo công bố của Selawik** (phông mở do chính hãng công bố làm phông thay thế cùng kích thước): 305/305 ký tự gốc giữ nguyên advance, hhea/OS/2 giữ nguyên (test khóa bằng digest). Chữ tiếng Việt thêm = độ rộng chữ gốc (ơ/ư rộng thêm phần móc) → gần đúng. Selawik không có kerning | 0 thiếu (96 chữ dựng sẵn + U+0309/031B/0323 thêm mới) | 40 992 + 40 860 B |
| VN Sans Regular/Bold | Aptos, Aptos Display | Open Sans 3.003 — `google/fonts@8b0a1d0f…/ofl/opensans/OpenSans[wdth,wght].ttf`, sha256 `36643644…b878` | OFL 1.1; không RFN | **Không cùng kích thước** — không có nguồn số đo hợp pháp; chọn theo dáng chữ (không chân nhân văn) | 0 thiếu (thêm U+031B) | 115 240 + 115 224 B |
| VN Mono Regular/Bold | Consolas | Inconsolata 3.001 — `google/fonts@8b0a1d0f…/ofl/inconsolata/Inconsolata[wdth,wght].ttf`, sha256 `23ded25b…5fcb` | OFL 1.1; không RFN | **Cùng độ rộng ký tự**: mọi ký tự 1126/2048 em (số công bố công khai tại github.com/microsoft/cascadia-code/issues/41; lấy thể hiện `wdth=112.5` = 550/1000 do nhà thiết kế vẽ, không kéo giãn). Chiều cao dòng: không có số công khai → gần đúng | 0 thiếu | 88 476 + 88 936 B |
| VN Song Regular | SimSun, NSimSun | Noto Serif SC 2.003 — `google/fonts@8b0a1d0f…/ofl/notoserifsc/NotoSerifSC[wght].ttf`, sha256 `050080d9…66f9` | OFL 1.1; RFN "Source" → tên mới không chứa Source/Noto | **Theo quy tắc công khai DBCS**: chữ Hán/toàn khổ 1 em, Latin/tiếng Việt/số nửa khổ 0,5 em (test kiểm). Chiều cao dòng: số của nguồn (không có số công khai) → gần đúng. Chỉ một độ đậm (đậm do engine tự tạo) | 0 thiếu (thêm U+0302/0306/031B) | 3 289 996 B (GB2312 7445 chữ + Latin + tiếng Việt) |

Tổng phông thêm: **3 779 724 B (~3,6 MiB)**, dưới ngân sách 8 MB. Không mở/đọc/đo bất kỳ tệp phông Microsoft nào; tên họ phông không chứa Segoe/Aptos/Consolas/SimSun (test `NameTests`). Đầy đủ: `platform/fonts/document/SOURCES.json`, `FONTLOG.txt`, `OFL.txt`.

Dựng lại: `python3 -m venv <tmp>/venv && <tmp>/venv/bin/pip install fonttools==4.55.3 skia-pathops==0.8.0.post2 && <tmp>/venv/bin/python -I scripts/fonts/build_vn_fonts.py --cache-dir <tmp>/cache [--check]`.

## 2. Nối dây
- Engine (macOS): `MacDocumentFonts.sources()` thêm `platform/fonts/document` (đọc tại chỗ trong payload app) vào `<dir>`; bộ lọc `rejectfont` chỉ áp dụng `/System/Library/Fonts/*`. Bảng: Segoe UI → VN Sans UI; Aptos, Aptos Display → VN Sans; Consolas → VN Mono; SimSun, NSimSun → VN Song; phông MAC-9 (Helvetica Neue/Arial/Liberation Sans; Liberation Mono/Menlo; Heiti SC/Songti SC/STSong) giữ phía sau. Phông thật được cài vẫn thắng (alias `binding="same"`, tên gốc đứng đầu). Không có `if mac` trong `apps/**`; mã riêng macOS chỉ ở `platform/os_services/macos.py`.
- Webview: `platform/fonts/document/document-fonts.css`, nạp qua `@import` ở đầu `platform/theme/fonts/fonts.css` (tệp phông đóng gói đã được `index.html` nạp sẵn) → **không sửa `index.html`**. Mỗi alias `src: local(<phông thật>), url(<phông VN>)`; tệp chỉ tải khi có chữ dùng tới (VN Song 3,3 MB không tải nếu tài liệu không dùng SimSun).
- Windows: `scripts/build-pilot.ps1` copy nguyên `platform/` → phông + CSS có trong gói Windows; bảng engine Windows chưa nối (ngoài phạm vi, owner Windows).

## 3. Trước / sau (pilot soffice `macos-offline-pilot-theme-20261022-v4`, `writer_pdf_Export`, hồ sơ mới)
Bộ `tests/macos/fonts/make_font_corpus.py` (40 đoạn, A4, 11 pt). "Trước" = bảng MAC-9 (`git archive origin/vn-main`), "sau" = nhánh này. Dữ liệu: `docs/macos/evidence/vn-fonts-1/measurements.json`.

| Tệp | Trang trước | Phông PDF trước | Trang sau | Phông PDF sau |
|---|---:|---|---:|---|
| font-segoe-ui.docx | 3 | HelveticaNeue | 4 | VNSansUI-Regular |
| font-aptos.docx | 3 | HelveticaNeue | 4 | VNSans-Regular |
| font-consolas.docx | 4 | LiberationMono | 3 | VNMono-Regular |
| font-simsun.docx | 4 | STHeitiSC-Light | 5 | VNSong-Regular |
| font-nsimsun.docx | 4 | STHeitiSC-Light | 5 | VNSong-Regular |
| font-calibri / calibri-light / cambria / arial / times-new-roman / courier-new / lucida-sans | 4/4/3/3/3/4/3 | (không đổi) | 4/4/3/3/3/4/3 | (không đổi) |

- 11 mẫu thật `tests/fixtures/real-office-samples` (7 docx, 4 pptx): số trang 1,1,1,1,1,1,1 / 2,3,1,2 và phông (Times New Roman, Arial, OpenSymbol) **giống hệt MAC-9**.
- Không có số trang chuẩn với phông gốc (đo bằng phông độc quyền bị cấm), nên **không khẳng định** bên nào gần bản gốc hơn về số trang; điều chắc chắn: độ rộng chữ VN Sans UI = Selawik, VN Mono = 1126/2048 (dòng đầu trang 1 Consolas chứa 74 ký tự, khớp vùng chữ 451,3 pt / (11 pt × 1126/2048) = 74,6), VN Song theo quy tắc toàn/nửa khổ. Ngược lại MAC-9 dùng phông khác kích thước hẳn (Helvetica Neue, Liberation Mono 1229/2048, Heiti tỉ lệ).

## 4. Bằng chứng (`docs/macos/evidence/vn-fonts-1/`, tổng 1,8 MB)
- `page1-segoe-ui.png`, `page1-aptos.png`, `page1-consolas.png`, `page1-simsun.png`: trang 1 PDF sau (qlmanage). Đã xem: đủ dấu (ả ạ ằ ẩ ể ỗ ợ ừ ự đ Ủ), không có ô trống/phông dự phòng, dáng chữ phù hợp (không chân / đều nét / kiểu Tống).
- `glyphs-vn-sans-ui-and-vn-sans.png`, `glyphs-vn-mono-and-vn-song.png`: toàn bộ chữ tiếng Việt hoa/thường, dạng NFC và NFD, dựng hình bằng HarfBuzz.
- `measurements.json`: số trang + phông nhúng trước/sau.

## 5. Kiểm thử
- `tests/test_vn_document_fonts.py` (mới, trung lập): sha256/kích thước khớp SOURCES.json; nguồn OFL + URL https + sha256; OFL/FONTLOG có mặt; tổng < 8 MB; tên họ/kiểu/full/PostScript đúng và không chứa tên phông độc quyền/RFN/nhà cung cấp; 0 thiếu tiếng Việt (gồm 8 dấu kết hợp) cho cả 7 tệp; dấu kết hợp advance 0; VN Mono 1126/2048 mọi ký tự + isFixedPitch; VN Song 1000/500; VN Sans UI digest advance 305 ký tự Selawik + hhea; CSS: url tồn tại/không mạng, alias `local()` trước, `@import` đứng đầu fonts.css.
- `tests/macos/test_vn_fonts_wiring.py` (mới): fonts.conf có `<dir>` phông đóng gói, không bị `rejectfont`, VN đứng đầu alias + còn phông dự phòng, không gắn cờ metric_compatible.
- `tests/macos/test_engine_fonts.py`: hai kỳ vọng MAC-9 đổi theo thay đổi có chủ đích của phiếu (phần tử đầu Segoe UI/SimSun/NSimSun nay là VN; thư mục thêm phông đóng gói). Ý định cũ vẫn được giữ và mở rộng: phông MAC-9 vẫn phải có phía sau; ba thư mục hệ điều hành giữ nguyên và vẫn cấm `/Applications`, `.app/`, `Microsoft`.

## 6. THIRD-PARTY-NOTICES — văn bản đề xuất (Lead thêm; agent không tự sửa theo quy ước git log)
```
--------------------------------------------------------------------------------
13. Phông chữ thay thế VN Sans UI, VN Sans, VN Mono, VN Song (3T Office, VN-FONTS-1)
--------------------------------------------------------------------------------
Phông do 3T Office dựng lại (Modified Version theo SIL OFL 1.1), nằm ở platform/fonts/document/
(OFL.txt, FONTLOG.txt, SOURCES.json đi kèm).
- VN Sans UI: từ Selawik 1.01 — Copyright 2015, Microsoft Corporation (www.microsoft.com), with Reserved Font
  Name Selawik. Tên "Selawik" không được dùng cho phông dựng lại.
- VN Sans: từ Open Sans 3.003 — Copyright 2020 The Open Sans Project Authors (https://github.com/googlefonts/opensans)
- VN Mono: từ Inconsolata 3.001 — Copyright 2006 The Inconsolata Project Authors (https://github.com/cyrealtype/Inconsolata)
- VN Song: từ Noto Serif SC 2.003 — Copyright 2012 Google Inc.; (c) 2017-2024 Adobe (http://www.adobe.com/),
  with Reserved Font Name "Source". Tên "Source" không được dùng cho phông dựng lại.
Phần sửa đổi: Copyright 2026 3T Office contributors.
Giấy phép: SIL Open Font License, Version 1.1 (OFL-1.1)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is available with a FAQ at: https://openfontlicense.org
--------------------------------------------------------------------------------
```
và thêm vào mục 9: `phông VN Sans UI / VN Sans / VN Mono / VN Song 1.000 (OFL-1.1, mục 13)`.

## 7. Cần người phụ trách quyết định
1. **VN Sans (Aptos) không cùng kích thước** — chấp nhận dáng gần giống, hay muốn chọn phông OFL khác (cũng sẽ không cùng kích thước vì không có nguồn số đo hợp pháp)?
2. **Chiều cao dòng VN Song** (nguồn Noto: 1,437 em theo hhea) làm SimSun ra 5 trang thay vì 4 với Heiti SC. Không có số công khai cho SimSun; giữ số của nguồn hay đặt giá trị khác theo quyết định thiết kế (sẽ không phải số "cùng kích thước")?
3. **Alias CSS cho phông giao diện**: trên máy không có Segoe UI/Consolas, các vùng giao diện khai báo các tên này sẽ hiện VN Sans UI/VN Mono. Giữ (khớp bản in, đủ dấu) hay giới hạn alias chỉ cho vùng nội dung tài liệu (cần phiếu riêng cho từng app)?
4. **Windows**: có nối bảng thay thế tương tự cho engine Windows không (phiếu riêng, owner Windows)?
5. Lead thêm mục THIRD-PARTY-NOTICES ở mục 6.

## 8. Rollback
Revert các commit VN-FONTS-1 (bảng thay thế trở về MAC-9; xóa `platform/fonts/document/`; bỏ dòng `@import`); fonts.conf được sinh lại lúc mở app. Không đổi dữ liệu người dùng hay định dạng tệp.
