# PR: Ứng viên macOS 2510 → vn-main

Nhánh nguồn: `mac/candidate2-cl-2510` (đỉnh mã: merge `27b4434c`, đã gồm vn-main `082221cb`). Đích: `vn-main`. 42 commit, 110 tệp (+8141/−111) so với vn-main; phần lớn ở `docs/macos`, `tests/macos`, `ports/macos`. Mọi nhánh gộp bằng `--no-ff`, không rebase/squash.

## Tóm tắt

Đưa VN Office (Doc/Sheet/Slide) chạy trên macOS ngang bản Windows: launcher Xcode, đăng ký kiểu tệp, backend dịch vụ hệ điều hành Darwin, phím tắt theo quy ước Office for Mac, thay thế phông macOS, công cụ đối chiếu Office for Mac, engine OOXML trên macOS và runtime Python có đủ `cryptography`/`pypdf`. Mã riêng hệ điều hành nằm ở `platform/os_services/` và `ports/macos/`; `apps/**` không có điều kiện `isMac` — Sheet/Doc gọi helper dùng chung trong `platform/commands/keymap-macos.js`.

## Phiếu đã gồm

| Phiếu | Nội dung | Commit |
|---|---|---|
| MAC-3 | Đăng ký `.xltx/.xlt` (UTI) cho Sheet, hợp nhất vào ba bundle Xcode | `37acbc53`, `ecf4ec90` |
| Xcode launchers | Launcher phát triển, build từ đường dẫn tương đối, staging payload cho Xcode Run | `7195235e`, `c5b07ee8`, `4a0ade12` |
| Bản nội bộ macOS | Gộp bản nội bộ, ribbon responsive + theme giao diện, audit menu ribbon lồng, CDP QtWebEngine | `a14630e0`, `57226af4`, `c1cbd4c2`, `46bb6280` |
| GATE-1 | Gộp vn-main `0c931aa2` + báo cáo cổng | `f0c7ccc2`, `aecf9ac5` |
| FIX-MAC-1 | labelKey nhóm Xem ▸ Giao diện; bind `common.view.toggleTheme`; 4 test Node gọi `PYTHON`/`python3`; backend OS-services Darwin; tiến trình zombie coi là đã thoát | `b0ef1bfc`, `33244307`, `ee36db03`, `4fa6db20`, `355941bd`, `5633b60b`, `688200dd` |
| MAC-9 | Phông macOS / thay thế phông | merge `f6318c39` |
| KEYS-1 (+ MAC-14) | Bảng phím Office-for-Mac 141 dòng, Control+nhấp = menu ngữ cảnh, F10 KeyTips, Cmd+? Trợ giúp, Option+kéo sao chép, Trợ giúp VI 7 bài | merge `98675b9a` (gồm `1f5f8271`, `8ee6865d`) |
| ORACLE-1 | Công cụ đối chiếu Office for Mac | merge `61710930` |
| ENGINE-MAC | ooxml-engine trên macOS + G0 parity | merge `16129ec6` |
| INTEGRATE-MAC-2510 | Ứng viên 1 + sửa số dòng bằng chứng checklist sau KEYS-1 | `a592bfed`, `382065e3` |
| MAC-12-RUNTIME | Runtime Python macOS gói `cryptography` + `pypdf` khóa hash | `6b9cface` |
| INTEGRATE-2 | Gộp vn-main `082221cb` (Q60/Q61/Q62) | merge `27b4434c` |

Xung đột ở INTEGRATE-2: `apps/sheet/sheet-grid.js` chỉ ở khối import (giữ cả `keymap-macos.js` của KEYS-1 và `focus-manager.js` của Q61; diff sau gộp so với vn-main đúng bằng diff KEYS-1); `docs/EXCEL2016-FEATURE-CHECKLIST.md` sinh lại bằng `scripts/audit-0610/gen_excel_checklist.py`; `09-templates/AGENT-HANDOFF.md` giữ cả hai phía. Chi tiết: `docs/macos/CANDIDATE-2510.md` mục 5.

## Cổng kiểm (trên `27b4434c`, macOS, venv-dev, LibreOffice pilot v4)

| Cổng | Kết quả |
|---|---|
| `npm test` | FAIL 3825/3826 — chỉ `Sheet: parseFods workbook snapshots` (D-1, có sẵn trên vn-main) |
| `node scripts/audit-0610/i18n_parity.mjs` | PASS VI=EN=3206, thiếu 0/0, lệch placeholder 0 |
| `verify_checklist_evidence.py --all --no-fix` | PASS Word 0 / Excel 0 / PowerPoint 0 dòng bị hạ |
| `pytest tests/macos` | PASS 58 passed, 17 subtests |
| `pytest tests` (đầy đủ) | FAIL 1197 passed / 8 failed / 18 skipped / 0 error — 8 FAIL là Windows-only/`powershell` + C-6, giống mốc |
| CDP `macos-shortcuts.desktop.mjs` (QtWebEngine thật) | PASS 14/14 |
| CDP `q61-sheet-dialog-focus` | PASS 6/6 Esc trả focus, 6/6 Tab trap |
| CDP `q61-dialog-validation` | PASS 120 khẳng định |
| CDP `q61-dialog-focus` | PASS 1/1 |
| CDP Q60 (`sheet-dark-contrast-q60`, `sheet-tab-overflow-q60`) | BLOCKED — thiếu tệp lan01/lan09 trên Mac |
| Xcode `VNOfficeLauncher` Debug (ứng viên 1, `ports/macos` không đổi từ đó) | PASS `** BUILD SUCCEEDED **`, universal, không ký |

## Lỗi đã biết

- npm `parseFods workbook snapshots` (D-1; nguyên nhân hash trên macOS đã ghi ở INBOX-WIN #10).
- pytest Windows-only: `test_desktop_launch` (no_port_available), 3× `test_ooxml_encryption_roundtrip`, 2× `test_os_services_p2`, `test_writer_create_new_readback` (cần powershell); `test_p1_pool_orphans` parent_alive (C-6, Integration).
- Q61 trên QtWebEngine: đổi cỡ cửa sổ 1024×600 qua CDP không có tác dụng → bố cục cửa sổ nhỏ chưa kiểm thật trên Mac.
- Checklist Excel dòng Goal Seek có trích dẫn cứng `sheet-grid.js:20373-20390` đã lệch từ vn-main (vẫn hợp lệ nhờ trích dẫn test).
- 104/141 dòng phím macOS ở trạng thái «chờ xác minh bằng Office for Mac» (Automation BLOCKED).
- ENGINE-MAC: rủi ro `setNotes` tạo 2 quan hệ notesSlide với PPTX do LibreOffice tạo (chuyển INBOX-WIN/Q62).
- Track Changes headless Chrome dao động (ứng viên 1: FAIL lượt 1, PASS lượt 2; lượt này PASS).

## Quyết định chờ người phụ trách

1. Quyền Automation (System Settings ▸ Privacy & Security ▸ Automation) cho Word/Excel/PowerPoint — mở khóa ORACLE-1, ENGINE-MAC `engine_office_check.sh`, KEYS-1 104 dòng, MAC-9 chọn phông.
2. Giấy phép phông (Segoe UI, Aptos, Calibri/Cambria, Consolas, SimSun…) — có mua/cấp phép để đóng gói không.
3. Nhúng (subset) phông hệ thống macOS vào PDF khi xuất/in.
4. Qt LGPL cho QtWebEngine (`PYWEBVIEW_GUI=qt`) trước khi phân phối.
5. Apple Developer ID, bundle ID, ký + notarize (hiện `CODE_SIGNING_ALLOWED=NO`, engine ký ad-hoc).
6. Chấp thuận thay đổi `platform/*` dùng chung đi kèm PR này, trong đó KEYS-1 bật F10 hiện KeyTips trên mọi nền tảng (kể cả Windows, giống Office Windows) và `isCopyDrag` của Doc trên Windows nhận thêm Meta.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
