# Ứng viên macOS 2510 (INTEGRATE-MAC-2510)

Nhánh `mac/candidate-cl-2510` · worktree `/Volumes/Data/Worktrees/mac-candidate-cl-2510` · ngày 25/10/2026.
Không push, không rebase/squash; mọi nhánh gộp bằng `git merge --no-ff`.

## 1. Nội dung đã gộp

Nền: `688200dd` = `mac/fix1-cl-2410` (mac/native-qa-2310 + vn-main `0c931aa2` + FIX-MAC-1).

| # | Nhánh (đỉnh) | Phiếu | Commit gộp | Xung đột | Cách xử lý |
|---|---|---|---|---|---|
| 1 | `origin/vn-main` (`83160242`) | docs sync + `docs/ooxml/ENGINE-PROTOCOL.md` | `d63d8dbe` | không | — |
| 2 | `mac/fonts-cl-2410` (`501f7835`) | MAC-9 phông macOS / thay thế phông | `f6318c39` | không | — |
| 3 | `mac/keys-cl-2410` (`2c04c8a3`) | KEYS-1 bảng phím Office-for-Mac, Control+nhấp, F10 KeyTips (kèm MAC-14 `8ee6865d`) | `98675b9a` | 2 tệp tài liệu/danh mục | hợp nhất cả hai phía (xem dưới) |
| 4 | `mac/oracle-cl-2410` (`4e4d7fec`) | ORACLE-1 công cụ đối chiếu Office for Mac | `61710930` | không | — |
| 5 | `mac/engine-cl-2410` (`f1e605fe`) | ENGINE-MAC ooxml-engine trên macOS + G0 parity | `16129ec6` | không | — |

Chi tiết xung đột ở bước 3 (không có xung đột mã):
- `platform/help/help-catalog.js`: giữ cả `MACOS_FONT_HELP_ENTRIES` (MAC-9) và `MACOS_SHORTCUT_HELP_ENTRIES` (KEYS-1) — cả import và phần trải mảng, theo thứ tự gộp (phông trước, phím sau), không trùng.
- `09-templates/AGENT-HANDOFF.md`: giữ cả mục MAC-3 (HEAD) và MAC-14 (keys), ngăn bằng `---` / `# Agent Handoff` theo quy ước tệp; mỗi mục xuất hiện đúng một lần.
- `platform/shell/app-shell.js` tự gộp sạch; đã kiểm tay: `_setupGlobalShortcuts()` vẫn có cả `installSecondaryClickNormalizer(window)` (KEYS-1) và `bindHandler("common.view.toggleTheme", …)` (FIX-MAC-1).
- Các tệp i18n và `entries-retro-platform.js` tự gộp sạch; i18n parity PASS (bên dưới).

Không nhánh nào bị `merge --abort`; không có mục BLOCKED do xung đột.

## 2. Bảng cổng kiểm (chạy trên `16129ec6`)

Môi trường: `PY=PYTHON=/Volumes/Data/Worktrees/_lead/venv-dev/bin/python`, `VNOFFICE_SOFFICE_PATH=/Volumes/Data/Projects/3t-office/build/macos-offline-pilot-theme-20261022-v4/LibreOffice.app/Contents/MacOS/soffice`, Node v26.11.1.

| Cổng | Lệnh | Kết quả | So với mốc |
|---|---|---|---|
| npm (lượt 1) | `npm test` | FAIL 3820/3822 (2 FAIL: parseFods snapshots; Browser Headless Track Changes) | FIX-MAC-1 3797/3798; tổng bài 3798 → 3822 (+24 từ các nhánh gộp, chủ yếu KEYS-1/MAC-14) |
| npm (lượt 2) | `npm test` | FAIL 3821/3822 (1 FAIL: parseFods snapshots = D-1 đã biết) | khớp kỳ vọng |
| KEYS-1/MAC-14 unit | (trong `npm test`) | PASS 18/18 | KEYS-1: 18/18 |
| 4 bài Python-qua-Node (FIX-MAC-1 B-2) | (trong `npm test`) | PASS (Lưu .xltx; Bóng chữ Slides; Hoạt ảnh Slides; sheet-import-audit) | khớp |
| i18n parity | `node scripts/audit-0610/i18n_parity.mjs` | PASS VI=3203 EN=3203, missing 0/0, placeholder mismatch 0, emptyOrIdentical 21 | khớp FIX-MAC-1 |
| Checklist evidence | `$PY scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` | FAIL — Word 0 hạ, **Excel 2 hạ**, PowerPoint 0 hạ (exit 0) | FIX-MAC-1 `688200dd`: 0/0/0 |
| pytest tests/macos | `$PY -m pytest tests/macos -q -p no:cacheprovider` | PASS 52 passed, 17 subtests | FIX-MAC-1 22 (+fonts, +oracle 16) |
| Oracle node tests | `node --test tests/macos/oracle/test_compare_functions.mjs` | PASS 7/7 | ORACLE-1 7/7 |
| pytest đầy đủ | `heavy-lock.sh claude-integrate -- $PY -m pytest tests -q -p no:cacheprovider --continue-on-collection-errors` | FAIL 1186 passed / 8 failed / 18 skipped / 1 error, 206 subtests (99 s) | FIX-MAC-1 1156/8/18/1 — cùng 8 FAIL + 1 error; +30 passed = bài mới tests/macos |
| CDP desktop | `env HOME=<tạm> VNO_PYTHON=$PY PYTHON=$PY PYWEBVIEW_GUI=qt VNOFFICE_SOFFICE_PATH=… heavy-lock.sh claude-integrate -- node tests/live/cdp/macos-shortcuts.desktop.mjs` | PASS 14/14 | KEYS-1 lượt 2: 14/14 |
| Xcode `-list` | `heavy-lock.sh … env DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ports/macos/VNOfficeLauncher.xcodeproj -list` | PASS — target/scheme `VNOfficeLauncher`, Debug/Release | — |
| Xcode build (lần 1) | `… xcodebuild -project … -scheme VNOfficeLauncher -destination 'generic/platform=macOS' -derivedDataPath <scratchpad>/dd-mac CODE_SIGNING_ALLOWED=NO build` | FAIL (65) — Swift biên dịch xong; pha `Stage Local Development Payload` (Debug) dừng vì worktree không có `ports/macos/build/macos-offline-pilot-arm64` | môi trường, không phải lỗi mã |
| Xcode build (lần 2) | như trên + `VNO_XCODE_PILOT_ROOT=/Volumes/Data/Projects/3t-office/build/macos-offline-pilot-theme-20261022-v4` | PASS `** BUILD SUCCEEDED **`, binary universal x86_64+arm64, 2 cảnh báo đã biết (headermap; AppIntents metadata) | — |

Sau build đã xóa `dd-mac` và `ports/macos/build/` (bị .gitignore, sinh ra trong phiên này). Không còn tiến trình `main.py` nào do phiên này khởi chạy.

## 3. Lỗi đã biết và phân loại

| Lỗi | Phân loại | Ghi chú |
|---|---|---|
| npm: `Sheet: parseFods workbook snapshots match pre-optimization results` | D-1, có sẵn trên vn-main | kỳ vọng |
| npm: `Browser Headless (Google Chrome): Track Changes gõ/xóa + Accept All/Reject All + export sạch` | dao động (flaky), không do gộp | FAIL lượt 1, PASS lượt 2 trên cùng commit; MAC-14 đã ghi nhận "Track Changes headless dao động" |
| Checklist: EXCEL dòng 231 (Dàn bài, V→A) và 344 (nhóm trang tính, V→N) | **có sẵn trên `mac/keys-cl-2410`, không phải artefact gộp** | KEYS-1 sửa `apps/sheet/sheet-grid.js` làm lệch số dòng bằng chứng `sheet-grid.js:20373`, `:20316`, `:5732` trong `docs/EXCEL2016-FEATURE-CHECKLIST.md`. Đã chạy cùng script trên bản archive: `688200dd` 0/0/0, `mac/fonts-cl-2410` 0/0/0, `mac/keys-cl-2410` 0/**2**/0. Không sửa trong phiếu này (chủ KEYS-1/Sheet cập nhật số dòng bằng chứng). |
| pytest: `test_desktop_launch::…no_port_available` | (a) Windows-only | như GATE-1/FIX-MAC-1 |
| pytest: 3× `test_ooxml_encryption_roundtrip` | (a) Windows-only | như trên |
| pytest: 2× `test_os_services_p2` (show_error, LOCALAPPDATA) | (a) Windows-only | như trên |
| pytest: `test_p1_pool_orphans::test_parent_alive_probe…` | C-6, giao Integration | như trên |
| pytest: `test_writer_create_new_readback::…word_com…` | (a) cần `powershell` | như trên |
| pytest: lỗi thu thập `tests/test_slides_handout_print.py` | (b) thiếu `pypdf` trong venv-dev | như trên |

Lỗi mới do gộp: **0**.

## 4. Quyết định cần người phụ trách

1. **Quyền Automation** (System Settings ▸ Privacy & Security ▸ Automation) cho terminal/agent → Microsoft Word/Excel/PowerPoint. Chặn: ORACLE-1 (Excel Mac 1.500 ca, Word 7 docx, PowerPoint 4 pptx — lỗi -1712), ENGINE-MAC (`engine_office_check.sh` 18 tệp), KEYS-1 (104/141 dòng phím "chờ xác minh bằng Office for Mac"), MAC-9 (chọn lại phông gần giống).
2. **Giấy phép phông**: Segoe UI, Aptos, Calibri/Cambria, Consolas, SimSun… không có bản mở cùng kích thước; có mua/cấp phép để đóng gói không (MAC-9 không đóng gói phông mới, không mượn phông trong gói Office).
3. **Nhúng phông vào PDF**: phông macOS hệ thống được nhúng (subset) khi xuất/in PDF — xác nhận chấp nhận được về giấy phép cho bản phát hành (MAC-9).
4. **Qt LGPL**: runtime CDP/desktop dùng `PYWEBVIEW_GUI=qt` (QtWebEngine). Cần duyệt nghĩa vụ LGPL (liên kết động, cung cấp nguồn/thay thế thư viện, ghi chú giấy phép) trước khi phân phối (M7-XCODE-PACKAGING).
5. **Ký/notarize**: launcher build ở đây `CODE_SIGNING_ALLOWED=NO`; binary engine ENGINE-MAC chỉ ký ad-hoc. Cần Apple Developer ID, bundle ID và notarization trước khi phát hành.

Ngoài ra (không chặn ứng viên): rủi ro dữ liệu ENGINE-MAC đề xuất #1/#2 (setNotes tạo 2 quan hệ notesSlide với PPTX do LibreOffice tạo) cần chuyển INBOX-WIN/Q62; Trợ giúp EN cho catalog (MAC-9).

## 5. Cập nhật lên vn-main 082221cb (INTEGRATE-2)

Nhánh `mac/candidate2-cl-2510` · worktree `/Volumes/Data/Worktrees/mac-candidate2-cl-2510` · nền `6b9cface` (= `mac/candidate-cl-2510` `382065e3` + MAC-12-RUNTIME). Gộp `git merge --no-ff origin/vn-main` (`082221cb`) → merge commit `27b4434c`. Không push, không rebase/reset.

vn-main mang vào (37 commit kể từ `83160242`): Q60 (mở XLSX lớn nhanh hơn, `8da98e55`), Q61 (focus/hiển thị hộp thoại Sheet, chữ ô đọc được ở theme tối, nhãn thẻ trang tính dài, xác thực số trực tiếp trong hộp thoại — `e83567ec`, gồm `2aab730c`, `a796bde4`, `62c7cc23`, `61024d4c`, `c9eddc0d`, `217cbb4d`, `77eb0fda`), Q62 OOXMLKit (`e97e8d51`), tài liệu đồng bộ `docs/sync/*`, `verify_checklist_evidence.py` hỗ trợ trích dẫn `{{L:tệp|chuỗi}}`, và checklist sinh lại `082221cb`.

### Xung đột và cách xử lý

| Tệp | Hunk | Cách xử lý |
|---|---|---|
| `apps/sheet/sheet-grid.js` | **1 hunk duy nhất**: khối import dòng 31–35 — HEAD thêm `import { isPrimaryModifier, isAdditiveSelect, isCopyDrag, isCopyDragKey, matchesShortcut } from "../../platform/commands/keymap-macos.js"` (KEYS-1 `1f5f8271`), vn-main thêm `import { getDialogKeyboardRibbonInvoker } from "../../platform/shell/focus-manager.js"` (Q61 `2aab730c`) | Giữ cả hai import (không mơ hồ: hai ký hiệu độc lập). Mọi hunk thân hàm còn lại git tự gộp (Q61 sửa hộp thoại Goal Seek/Chiều cao hàng/Định dạng có điều kiện/`_createSheetDialog` đóng-trả focus; KEYS-1 sửa nhánh phím Dán đặc biệt/Định dạng ô/Điền xuống/Điền phải, chọn thêm bằng Cmd+nhấp, Cmd+mũi tên, Option+kéo — không vùng nào chồng nhau). Kiểm chứng máy: `git diff origin/vn-main -- apps/sheet/sheet-grid.js` trùng từng dòng với diff KEYS-1 (`83160242..1f5f8271`, 50 dòng ±); `git diff 6b9cface -- apps/sheet/sheet-grid.js` trùng từng dòng với diff vn-main (`83160242..082221cb`). Không có `isMac`/`isDarwin` trong `apps/**`. `node --check` PASS. |
| `docs/EXCEL2016-FEATURE-CHECKLIST.md` | 2 hunk (dòng Dàn bài «Hiện/Ẩn chi tiết…», dòng «Chọn nhiều trang cùng lúc») — cả hai phía chỉ khác số dòng bằng chứng `sheet-grid.js` | Không gộp tay: lấy bản vn-main rồi chạy lại trình sinh `scripts/audit-0610/gen_excel_checklist.py` (trình sinh dùng trong `082221cb`; nó giải mỗi `{{L:tệp|chuỗi}}` thành `tệp:dòng` theo mã sau gộp). Kết quả: 4 số dòng đổi so với vn-main — `sheet-grid.js:15770→15774` (`async mergeCells(mode = "mergeCenter"…`), `:20381→20385` (`showOutlineLevels(rowLevel = null…`), `:20324→20328` (`this._outlineGroups().find(…)`), `:5740→5743` (mục menu «Chọn tất cả các trang tính»). Đã đọc từng dòng đích: đúng tính năng được trích. Không sửa tay số dòng nào. |
| `09-templates/AGENT-HANDOFF.md` | cuối tệp: HEAD có mục MAC-12-RUNTIME, vn-main có các mục Q59…Q61 | Giữ cả hai, MAC-12-RUNTIME trước, ngăn bằng `---`; mỗi mục xuất hiện đúng một lần. |

Tự gộp sạch: `main.py`, `platform/i18n/strings-{vi,en}.js`, `tests/run-tests.js`.

### Bảng cổng kiểm (chạy trên `27b4434c`)

Môi trường: `PYTHONDONTWRITEBYTECODE=1`, `PY=PYTHON=/Volumes/Data/Worktrees/_lead/venv-dev/bin/python`, `VNOFFICE_SOFFICE_PATH=…/macos-offline-pilot-theme-20261022-v4/LibreOffice.app/Contents/MacOS/soffice`.

| Cổng | Lệnh | Kết quả | So với mốc |
|---|---|---|---|
| npm | `npm test` | FAIL 3825/3826 — 1 FAIL duy nhất: `Sheet: parseFods workbook snapshots match pre-optimization results` (D-1 đã biết) | ứng viên 1: 3821/3822; +4 bài từ vn-main (numeric-dialog-validation, writer-floating-image-import…) |
| i18n parity | `node scripts/audit-0610/i18n_parity.mjs` | PASS VI=3206 EN=3206, missing 0/0, placeholder mismatch 0, emptyOrIdentical 21 | 3203 → 3206 (+3 chuỗi Q61) |
| Checklist evidence | `$PY scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` | PASS — Word 0, Excel 0, PowerPoint 0 dòng bị hạ (279/217/269 dòng) | 0/0/0 |
| pytest macOS | `$PY -m pytest tests/macos -q -p no:cacheprovider` | PASS 58 passed, 17 subtests | 52 + 6 bài MAC-12-RUNTIME |
| pytest đầy đủ | `heavy-lock.sh claude-int2 -- $PY -m pytest tests -q -p no:cacheprovider --continue-on-collection-errors` | FAIL 1197 passed / 8 failed / 18 skipped / **0 error**, 206 subtests (100 s) | mốc 1194/8/18/0 — cùng 8 FAIL Windows-only/C-6; +3 passed (`test_writer_section_headerfooter_postprocess.py` từ vn-main) |
| CDP phím macOS | `env HOME=<tạm> VNO_PYTHON=$PY PYTHON=$PY PYWEBVIEW_GUI=qt VNOFFICE_SOFFICE_PATH=… heavy-lock.sh claude-int2 -- node tests/live/cdp/macos-shortcuts.desktop.mjs` | PASS 14/14 | KEYS-1: 14/14 |
| CDP Q61 hộp thoại Sheet | như trên + `VNO_CDP_LOCALAPPDATA=<tạm>`, cwd = scratchpad (ảnh không ghi đè `docs/assets/q61-ui`) — `node tests/live/cdp/q61-sheet-dialog-focus.desktop.mjs` | PASS — 6/6 Esc trả focus về launcher, 6/6 Tab trap, Khổ giấy hiện đủ | Windows Q61: 6/6 + 6/6 |
| CDP Q61 xác thực số | `… node tests/live/cdp/q61-dialog-validation.desktop.mjs` | PASS 120 khẳng định giá trị sai/hợp lệ | Windows Q61: PASS |
| CDP Q61 focus Writer | `… node tests/live/cdp/q61-dialog-focus.desktop.mjs` | PASS (Thiết lập trang: Esc trả focus `writer.page.setupDialog`) | Windows Q61: 1/1 |
| CDP Q60 (`sheet-dark-contrast-q60`, `sheet-tab-overflow-q60`) | — | BLOCKED — cần tệp công ty `lan01.xlsx`/`lan09.xlsx` (đường dẫn `E:\…`), không có trên máy Mac | — |
| Xcode build | — | NOT RUN — phiếu này không đổi `ports/macos/**` so với ứng viên 1 (vn-main không chạm thư mục này) | ứng viên 1: BUILD SUCCEEDED |

Sau mỗi lượt CDP không còn tiến trình `main.py` nào; worktree sạch (`git status` rỗng).

### Lỗi đã biết / ghi chú mới

- Q61 trên QtWebEngine: `Browser.setWindowBounds` 1024×600 không đổi kích thước cửa sổ Qt (ảnh chụp vẫn 1920×942 điểm ảnh) → các kiểm tra «1024×600» của ba script Q61 thực chất chạy ở cỡ cửa sổ mặc định trên macOS; khẳng định focus/xác thực vẫn đúng nhưng phần bố cục cửa sổ nhỏ chưa được kiểm thật trên Mac. Cần chủ test macOS bổ sung cách đổi cỡ cửa sổ Qt (không phải lỗi gộp).
- Dòng checklist Excel «What-If: Goal Seek / Bảng dữ liệu» có trích dẫn cứng `apps/sheet/sheet-grid.js:20373-20390` (không dùng `{{L:}}`), đã lệch khỏi `showGoalSeekDialog()` (nay dòng 21280; trên vn-main 21276) ngay trên vn-main; script kiểm chứng vẫn chấp nhận nhờ trích dẫn test đi kèm. Không sửa ở đây (ngoài phạm vi; nên đổi sang `{{L:apps/sheet/sheet-grid.js|showGoalSeekDialog() {}}` trong trình sinh trên vn-main).
- `git diff --check` báo khoảng trắng cuối dòng trong `docs/AGENT-HANDOFF-Q62-CODEX.md` và `docs/sync/INBOX-MAC.md` — nội dung đến từ vn-main, giữ nguyên.

Lỗi mới do gộp: **0**.
