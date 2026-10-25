# PLAN VN-FONTS-1 — Bộ phông thay thế tự dựng (VN Sans UI, VN Sans, VN Mono, VN Song)

Ngày: 25/10/2026 · Agent: Claude · Nhánh `mac/vnfonts-cl-2510` (từ `mac/candidate-cl-2510` 382065e3) · Worktree `/Volumes/Data/Worktrees/mac-vnfonts-cl-2510`

## 1. Mục tiêu
Người phụ trách quyết định **không mua giấy phép phông**; 3T tự dựng phông thay thế. Tài liệu đặt Segoe UI, Aptos, Consolas, SimSun/NSimSun phải xuống dòng/ngắt trang gần nhất có thể so với bộ văn phòng gốc, đủ dấu tiếng Việt, chỉ dùng phông được phép sửa và đóng gói (SIL OFL 1.1).

## 2. Hiện trạng (MAC-9)
- `platform/os_services/macos.py` có `MAC_FONT_SUBSTITUTIONS`; `adapters/libreoffice/common/engine_fonts.py` sinh `fonts.conf` (dir + alias) cho LibreOffice headless; `main.py` đặt `FONTCONFIG_FILE`.
- Segoe UI/Aptos → Helvetica Neue; Consolas → Liberation Mono; SimSun/NSimSun → Heiti SC: đều **không cùng kích thước**.
- Repo đã có cơ chế đóng gói phông OFL cho giao diện: `platform/theme/fonts/` (Be Vietnam Pro + OFL.txt + `fonts.css`, nạp từ `index.html`). Chưa có phông tài liệu đóng gói; chưa có cơ chế alias phông tài liệu cho webview.

## 3. Quy tắc pháp lý áp dụng
- Không mở/đọc/đo bất kỳ tệp phông Microsoft nào. Tên thương hiệu (Segoe, Aptos, Consolas, SimSun) chỉ là khóa trong bảng thay thế/CSS alias và trong tài liệu, không nằm trong tên phông dựng ra.
- Nguồn chỉ từ upstream chính thức, ghim URL + sha256; ghi giấy phép; RFN → đổi tên.
- Số đo mục tiêu chỉ từ: (a) phông mở được công bố là thay thế cùng kích thước (Selawik), (b) sự kiện công khai (độ rộng ô Consolas do chính nhà thiết kế Cascadia/Selawik công bố; CJK toàn khổ = 1 em, bán khổ = 0,5 em).

## 4. Nguồn và cách dựng từng phông
| Phông dựng | Thay cho | Nguồn (OFL 1.1) | RFN nguồn | Cách dựng | Kỳ vọng cùng kích thước |
|---|---|---|---|---|---|
| **VN Sans UI** Regular/Bold | Segoe UI | Microsoft Selawik 1.01 (GitHub release `microsoft/Selawik` 1.01, "open source replacement for Segoe UI") | "Selawik" → phải đổi tên | Giữ nguyên mọi glyph/advance/chiều cao dòng của Selawik; thêm 98 ký tự tiếng Việt thiếu bằng glyph ghép (composite) từ chữ gốc Selawik + dấu của Selawik theo anchor GPOS sẵn có; dấu hỏi (U+0309), móc (U+031B) lấy từ Open Sans cùng độ đậm, co theo x-height; dấu nặng (U+0323) dựng từ dấu chấm của Selawik | Có cho ký tự Selawik đã có (theo công bố của Selawik); ký tự tiếng Việt mới = độ rộng chữ gốc (ơ/ư cộng phần móc) → gần đúng |
| **VN Mono** Regular/Bold | Consolas | Inconsolata 3.001 (google/fonts, ghim commit) | không | Lấy thể hiện trục `wdth=112.5` (advance 550/1000 do chính nhà thiết kế vẽ, không kéo giãn), `wght` 400/700, đổi UPM sang 2048 → advance 1126 | Độ rộng ký tự: có (1126/2048 em, số do Aaron Bell — nhà thiết kế Cascadia/Selawik — công bố công khai tại github.com/microsoft/cascadia-code/issues/41); chiều cao dòng: không có số công khai → gần đúng |
| **VN Song** Regular | SimSun, NSimSun | Noto Serif SC 2.003 (google/fonts, ghim commit; Adobe/Google, OFL) | "Source" (Source Han) → tên mới không chứa "Source"/"Noto" | Thể hiện `wght=400`; tập con GB2312 (7445 ký tự) + Latin/Latin-1/Latin Extended + tiếng Việt + dấu câu CJK; mọi ký tự Hán/toàn khổ = 1 em; mọi ký tự Latin/tiếng Việt ép về bán khổ 0,5 em (co ngang nếu rộng hơn, căn giữa); thêm dấu kết hợp U+0300/0301/0303/0309/0323 tách từ glyph tiếng Việt dựng sẵn của chính phông | Độ rộng: theo quy tắc công khai toàn khổ/bán khổ → gần đúng cao; chiều cao dòng: không có số công khai → gần đúng. Phông gốc chỉ có một độ đậm (đậm do phần mềm tự tạo), nên chỉ dựng Regular |
| **VN Sans** Regular/Bold | Aptos, Aptos Display | Open Sans 3.003 (google/fonts, ghim commit) | không | Thể hiện `wght` 400/700, `wdth` 100; đổi tên | **Không** — không có nguồn số đo hợp pháp; chọn theo kiểu dáng (Open Sans cùng nhà thiết kế, chữ không chân nhân văn, đủ tiếng Việt) |

Không dựng nghiêng: Selawik, Inconsolata, Noto Serif SC không có bản nghiêng; LibreOffice tự nghiêng hóa (giữ nguyên độ rộng) — giống hành vi khi thiếu nghiêng.

## 5. Công cụ dựng
- `scripts/fonts/build_vn_fonts.py` (công cụ dựng, không phải runtime; `scripts/` là nơi công cụ chung theo quy ước repo — `branding/**` thuộc Design nên không đặt ở đó). Tải nguồn theo URL ghim + kiểm sha256, dựng bằng fontTools phiên bản ghim (`fonttools==4.55.3`) trong venv tạm, ghi `head.created/modified` cố định (SOURCE_DATE_EPOCH) để dựng lại ra đúng từng byte. `--check` dựng vào thư mục tạm và so sha256 với `SOURCES.json`.
- fontTools chỉ cài vào venv tạm trong scratch, không vào runtime app hay venv dev chung.

## 6. Đóng gói và nối dây
- Tệp phông: `platform/fonts/document/` (trung lập hệ điều hành; Windows dùng lại sau): `VNSansUI-Regular.ttf`, `VNSansUI-Bold.ttf`, `VNSans-Regular.ttf`, `VNSans-Bold.ttf`, `VNMono-Regular.ttf`, `VNMono-Bold.ttf`, `VNSong-Regular.ttf`, `OFL.txt`, `FONTLOG.txt`, `SOURCES.json`.
- Engine (macOS): `MacDocumentFonts.sources()` thêm thư mục phông đóng gói vào `<dir>` của `fonts.conf`; bảng thay thế: Segoe UI → VN Sans UI, Aptos/Aptos Display → VN Sans, Consolas → VN Mono, SimSun/NSimSun → VN Song, giữ các phông dự phòng MAC-9 phía sau. Mã riêng macOS chỉ trong `platform/os_services/macos.py`.
- Webview: thêm `platform/fonts/document/document-fonts.css` với `@font-face` cho tên VN và alias theo tên phông tài liệu (`src: local(<phông thật>), url(<phông VN>)` — máy có phông thật vẫn dùng phông thật), nạp bằng `@import` ở đầu `platform/theme/fonts/fonts.css` (cơ chế phông đóng gói sẵn có) nên **không sửa `index.html`**. Không thêm cơ chế mới trong `apps/**`.
- Trợ giúp: cập nhật bài "Phông chữ thay thế trên macOS".

## 7. Ngân sách dung lượng
Mục tiêu ≤ 8 MB tổng. Ước: VN Sans UI ~2×60 KB, VN Sans ~2×250 KB, VN Mono ~2×100 KB, VN Song ~4–5 MB (tập con GB2312). Nếu VN Song > 6 MB sẽ xem lại tập con.

## 8. Kiểm thử
1. Script độ phủ: chữ tiếng Việt dựng sẵn (U+1EA0–U+1EF9 + ăâêôơưđ hoa/thường + nguyên âm có dấu Latin-1 + ĩ/ũ) và dấu kết hợp U+0300/0301/0303/0309/0323 + U+0302/0306/031B (văn bản dạng tách dấu NFD) → 0 thiếu cho mọi tệp (bước dựng tự kiểm, test kiểm lại).
2. Unit test `tests/test_vn_document_fonts.py` (trung lập hệ điều hành, đọc TTF bằng bộ đọc sfnt nhỏ, không cần fontTools) + `tests/macos/test_vn_fonts_wiring.py`: độ phủ, tên họ phông (không chứa tên thương hiệu), advance VN Mono = 1126/2048 đều, VN Song toàn khổ 1 em/bán khổ 0,5 em, VN Sans UI giữ nguyên advance của Selawik (so sha256/advance ghi trong SOURCES.json — không cần tải nguồn trong test), nối dây bảng thay thế + thư mục trong `fonts.conf`, CSS alias, OFL/FONTLOG có mặt.
3. Đo trước/sau: dựng lại bộ stress MAC-9 (`make_font_corpus.py`), `measure_fonts.py` qua `heavy-lock.sh`, so số trang + tên phông nhúng trong PDF; render trang 1 (qlmanage) và tự xem dấu tiếng Việt; lưu vài PNG nhỏ vào `docs/macos/evidence/vn-fonts-1/`.
4. `pytest tests/macos`; `npm test` (PYTHON=venv-dev, VNOFFICE_SOFFICE_PATH=pilot) — kỳ vọng toàn bộ PASS (vn-main 3826/3826).

## 9. Rủi ro
- Chiều cao dòng VN Mono/VN Song/VN Sans không có chuẩn hợp pháp → số trang có thể lệch; ghi rõ trong Trợ giúp/handoff.
- Kerning: Selawik không có kerning (đã ghi trong README của Selawik) → giữ nguyên.
- Dung lượng repo tăng vài MB (tệp nhị phân).
- `@font-face` alias theo tên thương hiệu trong CSS: chỉ là khóa ánh xạ, phông thật trên máy được ưu tiên qua `local()`.

## 10. Rollback
Revert commit VN-FONTS-1: bảng thay thế trở lại MAC-9, thư mục `platform/fonts/document/` bị xóa; `fonts.conf` được sinh lại lúc mở app. Không đổi dữ liệu người dùng hay định dạng tệp.
