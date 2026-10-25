# Agent Handoff

TASK: M7 — Xcode development bundles macOS 0.9.11
AGENT/ROLE: Codex / macOS packaging
BRANCH: codex/macos-xcode-package-0911
WORKTREE: /Users/hieupc/.codex/worktrees/macos-xcode-package-0911/3t-office
OBJECTIVE: Dựng Xcode project và build pipeline ngoại tuyến cho ba vỏ Doc/Sheet/Slide development, không signing secret/notarization.
FINDINGS: Xcode 26.3 có sẵn tại `/Applications/Xcode.app`, trong khi global `xcode-select` trỏ CLT; build thành công khi chỉ set `DEVELOPER_DIR` cho process. Máy chưa có `pywebview` hay `PySide6`; quyết định Qt LGPL, Apple signing/notarization và runtime/LibreOffice distribution chưa được cung cấp.
IMPLEMENTATION SUMMARY: Thêm một AppKit/Swift launcher target dùng chung và build nó ba lần thành universal arm64+x86_64 `Doc.app`, `Sheet.app`, `Slide.app`. Mỗi bundle có bundle ID, `VNOfficeAppKind` và document extensions riêng; `LSHandlerRank=Alternate` nên không tự chiếm app mặc định. Launcher tìm Python runtime cạnh ba app và `~/Library/Application Support/VNOffice/current/app/main.py`, khởi chạy bằng `Process.executableURL` + arguments, không shell/mạng. Build script chuyển SVG branding hiện hành thành `.icns`, build với `CODE_SIGNING_ALLOWED=NO`, rồi validator kiểm bundle.
FILES CHANGED: `ports/macos/VNOfficeLauncher.xcodeproj/project.pbxproj`; `ports/macos/launcher/AppDelegate.swift`; ba `*-Info.plist`; `ports/macos/scripts/build-development.sh`; `generate-icns.sh`; `validate-development-bundles.py`; plan và handoff trong `docs/macos/`.
COMMANDS RUN: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer ports/macos/scripts/build-development.sh /tmp/vno-macos-development`; `plutil -lint` ba plist; validator Python; launcher command smoke cho ba app với đường dẫn Unicode/khoảng trắng; `file` + `lipo -archs`; `python3 -m py_compile`; `git diff --check`.
BUILD RESULT: PASS — ba lần `xcodebuild` Release `** BUILD SUCCEEDED **`; ba binary là universal `x86_64 arm64`; bundle không ký theo chủ đích development.
TEST RESULTS: PASS — validator xác minh đủ Doc/Sheet/Slide bundle, executable, icon, bundle ID, app kind, document types và không có `_CodeSignature`. PASS — launcher dry-run smoke in đúng `--app=writer|sheet|slides`, runtime, `current/app/main.py` và file Unicode/khoảng trắng. PASS — plist lint, py_compile, diff check.
KNOWN FAILURES: Không có failure trong build/validation đã chạy. Native editor launch NOT RUN/BLOCKED vì chưa có offline runtime chứa pywebview/PySide6/QtWebEngine và LibreOffice. Signing, notarization, Gatekeeper clean-machine test, DMG: NOT RUN/BLOCKED do chưa có Apple Developer identity/quyết định pháp lý.
RISKS: Artifact hiện tại chỉ là development shell; không phát hành cho người dùng. App nhận file thứ hai sau khi child editor đã launch hiện báo người dùng mở trong cửa sổ hiện tại; production cần nối single-instance event service. Bundle ID `vn.office.*` là development identity và cần owner chốt trước signing.
DEPENDENCIES/BLOCKERS: Cần người phụ trách duyệt Qt LGPL/engine Chromium, cung cấp runtime universal + LibreOffice, chốt bundle IDs và Apple Developer signing/notarization. Không có secret được dùng hay commit.
CORE PATCH ID (if any): None.
NEXT ACTION: Tạo task runtime distribution riêng sau khi duyệt Qt; đặt `Runtime/bin/python3` cạnh ba app, seed `Application Support/VNOffice/current`, chạy native editor/CDP, sau đó mới thêm signing/notarization/DMG và clean-machine gate.
