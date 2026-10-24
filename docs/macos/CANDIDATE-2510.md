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
