# Agent Handoff
TASK: MAC-3-2610 — Hộp thoại Mở / Lưu / Lưu thành native đúng chuẩn macOS cho Doc, Sheet, Slide (làm lại; lượt trước dừng trước khi sửa)
AGENT/ROLE: Claude (Opus 5.5) / macOS platform
BRANCH: mac/filedialog-cl-2610 (gốc origin/vn-main 4c7da4c8)
WORKTREE: /Volumes/Data/Worktrees/mac-filedialog-cl-2610
OBJECTIVE: Bộ lọc đúng định dạng từng ứng dụng, tên/thư mục mặc định, tự sửa phần mở rộng, không hỏi ghi đè hai lần, chọn nhiều tệp khi Mở, tên tệp tiếng Việt NFD→NFC nhất quán, Hủy không báo lỗi. Kế hoạch: docs/macos/PLAN-MAC-3-2610.md.

FINDINGS (số dòng theo main.py của 4c7da4c8):
- Backend thật trên Mac: bản đóng gói không đặt PYWEBVIEW_GUI ⇒ pywebview 6.2.1 chọn **Cocoa** (pyobjc có trong Runtime); CDP/test chạy **Qt**. Cả hai: hộp thoại **Lưu không nhận bộ lọc** (Cocoa `NSSavePanel` bỏ qua `file_types`, trả chuỗi; Qt `getSaveFileName` không truyền filter) và tự hỏi ghi đè. Chuỗi lọc phải khớp `^([\w ]+)\(…\)$` của pywebview (mô tả NFC, chỉ chữ/số/khoảng trắng).
- main.py:5590 — `save_filename` không có đuôi (dựa vào menu loại tệp của Windows tự thêm) ⇒ trên Mac gõ "Báo cáo" khi đang lưu .odt cho ra .docx (main.py:2595 thêm đuôi **mặc định của ứng dụng**, không phải định dạng đang chọn).
- main.py:2604 — đuôi lạ ("Báo cáo v1.2", ".abc") giữ nguyên tên nhưng ghi nội dung .docx/.xlsx; đuôi của ứng dụng khác (".xlsx" trong Doc) đi bộ lọc sai và lỗi.
- Sau khi app tự thêm đuôi, tên mới chưa từng được macOS hỏi ghi đè ⇒ có thể ghi đè im lặng (không có xác nhận nào trong main.py).
- main.py:5572 — tên mặc định "TaiLieu"/"BangTinh"/"BanTrinhChieu" khi không có tên; main.py:5592 — tài liệu mới không có thư mục mặc định (~/Documents).
- main.py:2525–2527 — bộ lọc Mở một mục gộp + "Tất cả tệp"; thiếu .dotx (Doc), .potx (Slide); không có "Tất cả tệp được hỗ trợ" đứng đầu; main.py:597 FILE_APP_KINDS (và main.py:79–81 bản sao cho chuyển tiếp sớm) không có .dotx/.potx.
- main.py:5013/5019 — Mở chỉ lấy tệp đầu, không cho chọn nhiều; kết quả kiểu Qt `("",)` lọt qua `if not result` rồi lấy `""` làm đường dẫn (test fail-trước đã ghi ra tệp `.xlsx` ở thư mục làm việc — dọn ngay).
- main.py:5019/5413/5448 — đường dẫn macOS dạng NFD đi thẳng lên UI; platform/recent/recent-manager.js:55 so khớp tuyệt đối ⇒ cùng tệp có thể thành hai mục Gần đây.
- Hủy (Cocoa `None`, Qt `None`) đã trả `cancelled` sạch ở cả 3 adapter — giữ nguyên, nay có test chốt.

IMPLEMENTATION SUMMARY:
- Mới `platform/os_services/file_dialogs.py` (không phụ thuộc HĐH): bảng loại tệp Mở/Lưu theo ứng dụng (nhãn tiếng Việt, "Tất cả tệp được hỗ trợ" đầu, "Tất cả tệp (*.*)" cuối), tên gợi ý ("Tài liệu 1"/"Bảng tính 1"/"Bản trình bày 1" thay tên ASCII cũ; đuôi không hỗ trợ như .xlt → định dạng mặc định), `resolve_saved_path` (giữ đuôi hợp lệ người dùng gõ; thiếu/lạ thì nối đuôi định dạng đang lưu), chuẩn hoá NFC an toàn (đường dẫn có sẵn chỉ đổi khi `os.path.samefile` đúng; tệp mới: tên luôn NFC, thư mục chỉ khi cùng thư mục), `FileDialogPolicy` (cờ khả năng).
- `platform/os_services/macos.py`: `mac_file_dialog_policy()` — không có menu loại tệp khi Lưu, hộp thoại tự hỏi ghi đè, Mở nhiều tệp, NFC, ~/Documents. `base.py`: trường tuỳ chọn `file_dialogs` (như `document_fonts`). Windows/Linux = None ⇒ main.py đi **đúng đường cũ** (có test chốt).
- `main.py`: `_file_dialog_policy()`, một điểm vào `_create_file_dialog()`, `_dialog_paths()`; Mở/Lưu/Lưu thành/tài liệu tham chiếu/nguồn trộn thư dùng chung. Mở nhiều tệp: tệp đầu ở cửa sổ hiện tại, tệp cùng ứng dụng còn lại qua `open_file_in_new_window` hiện có. Lưu: chỉ hỏi «Thay thế tệp đã có?» khi app vừa sửa tên **và** tên mới đã tồn tại. Mẫu .dotx/.potx: dựng .docx/.pptx rồi đổi content type (tổng quát hoá `_convert_xlsx_to_template` của MAC-3 thành `_convert_ooxml_to_template`; `_convert_xlsx_to_template` giữ làm lớp bọc). Biến **chỉ cho test** `VNO_CDP_FILE_DIALOG_STUB` (cần kèm `VNO_CDP_DEBUG_PORT`) trả lời hộp thoại từ hàng đợi JSON sau khi kiểm chuỗi lọc bằng `parse_file_type` của pywebview.
- `platform/recent/recent-manager.js`: `isSameRecentPath` so khớp theo NFC (đường dẫn lưu giữ nguyên; không có điều kiện HĐH).
- Trợ giúp tiếng Việt: `platform/help/entries-macos-files.js` («Mở, Lưu và Lưu thành tệp trên macOS», tab Tệp > Mở / Lưu), đăng ký trong `help-catalog.js`.
- `tests/test_g7_save_as_dialog.py`: hai lớp G7 (hợp đồng hộp thoại Windows: tên không đuôi, không thư mục) nay ghim `_file_dialog_policy → None` để chạy đúng đường Windows trên mọi máy; **không đổi khẳng định nào**. Hành vi macOS kiểm ở tests/macos.
- Không sửa: apps/**, adapters/** (Slides agent chạy song song), ports/macos, LibreOffice, in ấn.

FILES CHANGED: main.py; platform/os_services/{base.py,macos.py,file_dialogs.py (mới)}; platform/recent/recent-manager.js; platform/help/{entries-macos-files.js (mới),help-catalog.js}; tests/macos/test_file_dialogs_macos.py (mới); tests/unit/macos-file-dialogs.test.js (mới); tests/run-tests.js; tests/live/cdp/macos-file-dialogs.desktop.mjs (mới); tests/test_g7_save_as_dialog.py; docs/macos/PLAN-MAC-3-2610.md; docs/macos/HANDOFF-MAC-3-2610.md.

COMMITS: 7ab45020 docs(mac): kế hoạch MAC-3-2610; 3035d2e4 feat(mac): hộp thoại Mở/Lưu/Lưu thành native (MAC-3-2610); commit bàn giao này.

COMMANDS RUN (env: PYTHONDONTWRITEBYTECODE=1, PY=PYTHON=/Volumes/Data/Worktrees/_lead/venv-dev/bin/python, VNOFFICE_SOFFICE_PATH=pilot v4):
- `npm test` (baseline trước sửa và sau sửa); `node scripts/audit-0610/i18n_parity.mjs`; `$PY scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`.
- `$PY -m pytest tests/macos/test_file_dialogs_macos.py` trước khi sửa main.py (fail-trước) và sau; `$PY -m pytest tests/macos tests/test_g7_save_as_dialog.py tests/test_os_services_contract.py tests/test_single_instance*.py`.
- `heavy-lock.sh claude-fd -- $PY -m pytest tests -q -p no:cacheprovider --continue-on-collection-errors`.
- `heavy-lock.sh claude-fd -- node tests/live/cdp/macos-file-dialogs.desktop.mjs` (đường mới) và cùng lệnh với `VNO_OS_SERVICES_LEGACY=1` (đường cũ = hành vi trước sửa).
- `heavy-lock.sh claude-fd -- $PY <scratchpad>/template_roundtrip.py` — LibreOffice thật: mở sample-writer.docx / sample-slides.pptx → Lưu tại chỗ thành «Mẫu thử.dotx» / «Mẫu thử.potx» → kiểm content type → mở lại.
- `git diff --check`.

BUILD RESULT: NOT RUN — không đổi build system / bundle Xcode.

TEST RESULTS:
- Unit Python mới: fail-trước **35 failed / 17 passed** (main.py gốc bỏ qua policy: tên "TaiLieu", không đuôi, không ~/Documents, bộ lọc gộp, không chọn nhiều, NFD giữ nguyên, ghi `("",)` ra `.xlsx`…) → pass-sau **27 passed, 49 subtests passed, 0 skip** (2 bài NFD chạy thật trên APFS).
- Node mới (3 bài): fail-trước 3/3 FAIL (recent-manager/help-catalog bản gốc) → pass-sau 3/3.
- CDP (Qt, app thật): đường cũ `VNO_OS_SERVICES_LEGACY=1` **12/20 PASS (8 FAIL)** → đường mới **20/20 PASS** (chạy 2 lần, lần cuối trên commit 3035d2e4). Kiểm: tệp giao diện phục vụ từ worktree này (tắt cache CDP `Network.setCacheDisabled` + `Page.reload ignoreCache`, dấu mốc `isSameRecentPath` có trong tệp và module), Lưu thành mặc định «Tài liệu 1.docx» ở `<HOME>/Documents`, Hủy Lưu không lỗi/không đổi tiêu đề, gõ NFD «Báo cáo quý» → «Báo cáo quý.docx» trên đĩa (NFC) và tiêu đề NFC, Mở: «Tất cả tệp được hỗ trợ» đầu + allow_multiple, Hủy Mở không lỗi, mở lại bằng đường dẫn NFD → tiêu đề NFC, nội dung đọc lại đúng, Gần đây đúng 1 mục NFC.
- Mẫu với LibreOffice thật: .dotx và .potx lưu OK, content type template = True, mở lại OK.
- `npm test`: baseline **3852/3852** → sau **3857/3857 PASS, 0 FAIL**.
- i18n parity: VI=3208 EN=3208, missing **0/0**, placeholderMismatch 0.
- Checklist verifier: Word **0** / Excel **0** / PowerPoint **0** dòng bị hạ (không cần sinh lại).
- `pytest tests/macos`: **89 passed** (79 subtests). Nhóm chạm tới (macos + g7 + os_services_contract + single_instance): 119 passed.
- pytest đầy đủ qua khoá: **1249 passed, 25 skipped, 0 failed** (93,9 s).

KNOWN FAILURES: Không có ở các cổng trên. Hộp thoại native thật (Cocoa/Qt) **NOT RUN** tự động — theo yêu cầu không dùng System Events/phím hệ thống; xem bước kiểm tay bên dưới.

RISKS:
- Nhãn bộ lọc Python vẫn mô tả định dạng bằng tên định dạng (vd. «Tài liệu Word (*.docx)») như bảng Windows sẵn có; bài Trợ giúp đã bỏ tên sản phẩm (máy quét tên công khai). Nếu chủ thương hiệu muốn bỏ cả trong bộ lọc, đổi một chỗ ở `file_dialogs.py`.
- Chuẩn hoá NFC chỉ áp khi trỏ cùng tệp; ổ mạng/exFAT phân biệt NFC/NFD giữ nguyên đường dẫn gốc. Gần đây so khớp NFC trên mọi HĐH: trên Windows, hai tệp chỉ khác dạng Unicode của tên (rất hiếm) sẽ chung một mục.
- Mở mẫu .dotx/.potx đi đường nhập chung của LibreOffice (không qua lớp OOXML riêng của .docx/.pptx) ⇒ độ trung thực có thể thấp hơn .docx/.pptx; chưa kiểm bằng Word/PowerPoint thật.
- Bundle Xcode (ports/macos/launcher/*-Info.plist) **chưa** khai UTI .dotx/.potx ⇒ Finder chưa đề xuất Doc/Slide cho hai đuôi này (Mở trong app vẫn được). Việc của phiếu UTI riêng (ports/macos + tests/macos/test_sheet_file_types.py).
- Windows giữ nguyên bảng bộ lọc cũ (policy None); muốn Windows cũng có «Tất cả tệp được hỗ trợ» + .dotx/.potx thì cho Windows backend trả `FileDialogPolicy()` mặc định — quyết định của chủ Windows.

DEPENDENCIES/BLOCKERS: Không. Không thêm thư viện. Biến test-only `VNO_CDP_FILE_DIALOG_STUB` chỉ có hiệu lực khi có `VNO_CDP_DEBUG_PORT`.
CORE PATCH ID (if any): None.

UI REVIEW: Không đổi giao diện HTML; hộp thoại là của macOS. Thông báo mới (tiếng Việt): «Thay thế tệp đã có?» / «Tệp “…” đã có trong thư mục này. Thay thế sẽ ghi đè nội dung của tệp đó. Bạn có muốn thay thế không?» — chỉ hiện khi app vừa tự thêm đuôi và tên đó đã tồn tại.

## Bước kiểm tay cho người phụ trách (bản đóng gói thật, Cocoa — và nếu muốn, chạy nguồn với `PYWEBVIEW_GUI=qt`)

Chuẩn bị: trong Finder tạo thư mục `~/Desktop/KiemThu` và một tệp tên **Báo cáo quý.docx** (đặt tên trong Finder để macOS lưu dạng NFD; có thể nhân bản một .docx bất kỳ rồi đổi tên). Mở Doc.

1. **Bộ lọc Mở (Doc)**: Cmd+O. Kỳ vọng: nút loại tệp ở cuối hộp thoại đang chọn «Tất cả tệp được hỗ trợ (*.docx;*.doc;*.dotx;*.odt;*.rtf;*.txt;*.htm;*.html)»; mở menu thấy từng loại rồi «Tất cả tệp (*.*)» ở cuối; chọn «Tài liệu ODF (*.odt)» thì chỉ .odt sáng. Bấm **Hủy** → không có thông báo lỗi, tài liệu giữ nguyên. Lặp lại ở Sheet (có .xltx, .xlt, .csv, .tsv) và Slide (có .potx).
2. **Tên tiếng Việt**: Cmd+O, chọn `KiemThu/Báo cáo quý.docx` → thanh tiêu đề «Báo cáo quý.docx — Doc», dấu hiển thị liền (không tách dấu). Tab Tệp > Tệp gần đây: đúng **một** mục «Báo cáo quý.docx»; đóng cửa sổ, mở lại từ Gần đây → mở đúng tệp.
3. **Chọn nhiều tệp**: Cmd+O, giữ Cmd chọn 2–3 tệp .docx → tệp đầu mở ở cửa sổ hiện tại, mỗi tệp còn lại mở cửa sổ Doc riêng.
4. **Lưu tài liệu mới**: Cmd+N (tài liệu mới), gõ vài chữ, Cmd+S → hộp thoại đề xuất **«Tài liệu N.docx»** trong thư mục **Tài liệu (Documents)**. Sheet: «Bảng tính N.xlsx»; Slide: «Bản trình bày N.pptx».
5. **Tự thêm đuôi**: trong hộp thoại Lưu, xoá tên và gõ `Thử lưu` (không đuôi), chọn thư mục KiemThu, Lưu → Finder có **Thử lưu.docx**, tiêu đề «Thử lưu.docx — Doc». Lặp với `Bản v1.2` → **Bản v1.2.docx**.
6. **Đổi định dạng bằng đuôi**: tab Tệp > Lưu thành (Cmd+Shift+S) → hộp thoại mở tại KiemThu với tên hiện tại; gõ `Thử lưu.odt` → Finder có .odt, tiêu đề đổi sang .odt. Gõ `Thử.xlsx` trong Doc → tệp thành **Thử.xlsx.docx** (đuôi không thuộc Doc không đổi định dạng).
7. **Ghi đè — không hỏi hai lần**: Lưu thành, chọn đúng tệp có sẵn `Thử lưu.docx` → chỉ macOS hỏi «Thay thế» **một lần**; bấm Thay thế → lưu, không có hộp thoại thứ hai.
8. **Ghi đè sau khi app thêm đuôi**: Lưu thành, gõ `Thử lưu` (không đuôi, trong khi `Thử lưu.docx` đã có) → macOS không hỏi (tên gõ chưa tồn tại), app hỏi **«Thay thế tệp đã có?»** đúng một lần; chọn Không → tệp cũ giữ nguyên (xem ngày sửa trong Finder), không có thông báo lỗi.
9. **Hủy Lưu**: Cmd+Shift+S rồi Esc → không thông báo lỗi, tiêu đề không đổi.
10. **Mẫu**: Lưu thành, gõ `Mẫu.dotx` → mở lại bằng Cmd+O được; Cmd+S lưu lại vẫn là mẫu (Quick Look/Finder hiển thị loại «mẫu» nếu đã cài ứng dụng nhận .dotx). Slide: `Mẫu.potx` tương tự.
11. **Trợ giúp**: tab Trợ giúp (F1), gõ «lưu thành mac» hoặc «mac» → thấy bài «Mở, Lưu và Lưu thành tệp trên macOS».

NEXT ACTION: Review 2 commit mã + commit bàn giao; người phụ trách chạy 11 bước kiểm tay trên bản đóng gói (Cocoa). Phiếu tiếp theo đề xuất: khai UTI .dotx/.potx cho Doc.app/Slide.app; chủ Windows quyết định có bật bảng bộ lọc mới cho Windows không.
